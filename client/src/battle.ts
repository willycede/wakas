// Escena de batalla: arena vista desde arriba en diagonal, Primales en pixel art animado,
// predicción del movimiento propio (con reconciliación), interpolación del rival, avisos,
// proyectiles y efectos. Se juega con teclado, con ratón (clic derecho mover, clic izquierdo
// atacar, apuntar movimientos) o con pantalla táctil.

import Phaser from 'phaser';
import {
  ARENA, ELEMENTOS, ESPECIES, MOVIMIENTOS, TICK_MS, moverEnArena, statsPrimal, velocidadMover,
  type Fx, type InicioBatalla, type Movimiento, type Snapshot, type UnidadSnap,
} from '../../shared/src';
import animMeta from '../../assets/criaturas/sprites/anim/animaciones.json';
import { spriteUrl, V } from './api';
import type { Conexion } from './net';

const INTERP = 100;
const TICK = TICK_MS / 1000;
const ICONOS: Record<string, string> = { proyectil: '✴️', rafaga: '💥', embestida: '💨', area: '🌀', zona: '🎯', rayo: '⚡', escudo: '🛡️', curar: '💚', mejora: '⬆️' };
const col = (hex: string) => parseInt(hex.slice(1), 16);
const $ = (id: string) => document.getElementById(id)!;
type AnimMeta = { w: number; h: number; pies: number; anims: Record<string, { frames: number[]; fps: number; repeat: number }> };
const ANIM = animMeta as unknown as Record<string, AnimMeta>;

interface Vista {
  spr: Phaser.GameObjects.Sprite; sombra: Phaser.GameObjects.Ellipse; anillo: Phaser.GameObjects.Ellipse;
  esp: string; x: number; y: number; flip: number; inclina: number;
  anim: string; bloqueo: number; ultAn: string; estocada: number; estAng: number; golpe: number; polvo: number;
}

export class BatallaScene extends Phaser.Scene {
  net!: Conexion;
  init0!: InicioBatalla;
  snaps: Snapshot[] = [];
  offset: number | null = null;
  vistas: [Vista | null, Vista | null] = [null, null];
  gAvisos!: Phaser.GameObjects.Graphics;
  gApunte!: Phaser.GameObjects.Graphics;
  proys = new Map<number, Phaser.GameObjects.Arc>();
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  joy = { x: 0, y: 0, activo: false };
  seq = 0;
  // predicción del Primal propio
  pend: { s: number; x: number; y: number }[] = [];
  pred = { x: 0, y: 0 };
  prevPred = { x: 0, y: 0 };
  err = { x: 0, y: 0 };
  acc = 0;
  ultimo: Snapshot | null = null;
  fin = false;
  apunta = { x: 0, y: 0 };
  // ratón
  destino: { x: number; y: number } | null = null;
  moviendoRaton = false;
  atacando = false;
  apuntando: number | null = null; // movimiento esperando el clic de destino
  vistaPrevia: number | null = null; // movimiento bajo el cursor (en los botones)
  ultRueda = 0;
  onFin: (r: any) => void = () => {};

  constructor() {
    super('batalla');
  }

  init(data: { net: Conexion; init: InicioBatalla }) {
    this.net = data.net;
    this.init0 = data.init;
    this.snaps = [];
    this.offset = null;
    this.vistas = [null, null];
    this.proys.clear();
    this.fin = false;
    this.ultimo = null;
    this.pend = [];
    this.err = { x: 0, y: 0 };
    this.destino = null;
    this.apuntando = null;
    this.atacando = false;
  }

  preload() {
    for (const id of Object.keys(ESPECIES)) {
      if (!this.textures.exists('p_' + id)) this.load.image('p_' + id, spriteUrl(id));
      const m = ANIM[id];
      if (m && !this.textures.exists('pa_' + id)) this.load.spritesheet('pa_' + id, `criaturas/sprites/anim/${id}.png${V}`, { frameWidth: m.w, frameHeight: m.h });
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#1b3a2a');
    for (const [id, m] of Object.entries(ANIM)) {
      for (const [nombre, a] of Object.entries(m.anims)) {
        const key = `${id}-${nombre}`;
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers('pa_' + id, { frames: a.frames }), frameRate: a.fps, repeat: a.repeat });
      }
    }
    if (!this.textures.exists('polvo')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
      g.generateTexture('polvo', 4, 4);
      g.destroy();
    }
    this.dibujarArena();
    this.gAvisos = this.add.graphics().setDepth(1);
    this.gApunte = this.add.graphics().setDepth(4000);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ONE,TWO,THREE,FOUR,Q,E,ESC,F') as any;
    this.input.mouse?.disableContextMenu();
    this.game.canvas.style.cursor = 'crosshair';
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.apuntar(p);
      if (this.moviendoRaton) this.destino = { ...this.apunta };
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.esTactil()) return;
      this.apuntar(p);
      if (p.rightButtonDown()) {
        if (this.apuntando !== null) { this.apuntando = null; return; }
        this.moviendoRaton = true;
        this.destino = { ...this.apunta };
        this.marcaDestino(this.apunta.x, this.apunta.y);
        return;
      }
      if (this.apuntando !== null) {
        const i = this.apuntando;
        this.apuntando = null;
        this.accion(i);
        return;
      }
      this.atacando = true;
      this.accion(0);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!p.rightButtonDown()) this.moviendoRaton = false;
      if (!p.leftButtonDown()) this.atacando = false;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (Date.now() - this.ultRueda < 250) return;
      this.ultRueda = Date.now();
      this.cambiarRel(dy > 0 ? 1 : -1);
    });
    this.keys.SPACE.on('down', () => this.accion(0));
    this.keys.ONE.on('down', () => this.accion(1));
    this.keys.TWO.on('down', () => this.accion(2));
    this.keys.THREE.on('down', () => this.accion(3));
    this.keys.FOUR.on('down', () => this.accion(4));
    this.keys.SHIFT.on('down', () => this.accion(5));
    this.keys.F.on('down', () => this.accion(5));
    this.keys.Q.on('down', () => this.cambiarRel(-1));
    this.keys.E.on('down', () => this.cambiarRel(1));
    this.keys.ESC.on('down', () => (this.apuntando = null));
    this.scale.on('resize', this.ajustar, this);
    this.ajustar();
    this.net.on('snap', (s: Snapshot) => this.onSnap(s));
    this.net.on('fx', (list: Fx[]) => list.forEach((f) => this.onFx(f)));
    this.net.on('cuenta', (m: { ms: number }) => this.cuenta(m.ms));
    this.net.on('fin', (r) => { this.fin = true; this.time.delayedCall(900, () => this.onFin(r)); });
    this.armarHud();
  }

  private esTactil() {
    return matchMedia('(pointer: coarse)').matches;
  }

  private ajustar() {
    const w = this.scale.width, h = this.scale.height;
    const z = Math.min(w / (ARENA.w + 40), h / (ARENA.h + 170));
    this.cameras.main.setZoom(z);
    this.cameras.main.centerOn(ARENA.w / 2, ARENA.h / 2 + 10);
  }

  // ---------------------------------------------------------------- arena
  private dibujarArena() {
    const g = this.add.graphics().setDepth(0);
    // césped en franjas y bordes de piedra
    const W = ARENA.w, H = ARENA.h;
    g.fillStyle(0x2a5a3a).fillRoundedRect(-30, -30, W + 60, H + 60, 30);
    for (let i = 0; i < 12; i++) g.fillStyle(i % 2 ? 0x4c9a4c : 0x55a655).fillRect((W / 12) * i, 0, W / 12 + 1, H);
    // pixeles de hierba
    const rnd = new Phaser.Math.RandomDataGenerator(['arena']);
    for (let i = 0; i < 500; i++) g.fillStyle(rnd.pick([0x6cc26a, 0x3f8a45, 0x7ad478]), 0.8).fillRect(rnd.between(0, W), rnd.between(0, H), 4, 4);
    g.lineStyle(6, 0xf4f0e0, 0.9).strokeRect(0, 0, W, H);
    g.lineStyle(4, 0xf4f0e0, 0.7).lineBetween(W / 2, 0, W / 2, H).strokeCircle(W / 2, H / 2, 90);
    g.fillStyle(0xf4f0e0, 0.9).fillCircle(W / 2, H / 2, 8);
    g.lineStyle(4, 0x4aa8ff, 0.5).strokeRect(20, H / 2 - 120, 120, 240);
    g.lineStyle(4, 0xff6a6a, 0.5).strokeRect(W - 140, H / 2 - 120, 120, 240);
    g.lineStyle(14, 0x8a7a6a, 1).strokeRoundedRect(-20, -20, W + 40, H + 40, 22);
    // obstáculos: rocas en pixel art simple
    for (const o of this.init0.obstaculos) {
      const r = this.add.graphics().setDepth(o.y);
      r.fillStyle(0x000000, 0.25).fillEllipse(o.x + 4, o.y + o.r * 0.6, o.r * 2.2, o.r * 0.9);
      r.fillStyle(0x6e6a7a).fillCircle(o.x, o.y, o.r);
      r.fillStyle(0x908ca0).fillCircle(o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.65);
      r.fillStyle(0xb8b4c4).fillCircle(o.x - o.r * 0.4, o.y - o.r * 0.4, o.r * 0.25);
      r.lineStyle(3, 0x2a2436).strokeCircle(o.x, o.y, o.r);
    }
  }

  private escala(esp: string) {
    return ESPECIES[esp].etapa === 3 ? 1.6 : ESPECIES[esp].etapa === 2 ? 1.45 : 1.35;
  }

  private vista(l: 0 | 1, esp: string): Vista {
    const v = this.vistas[l];
    if (v && v.esp === esp) return v;
    v?.spr.destroy(); v?.sombra.destroy(); v?.anillo.destroy();
    const soy = l === this.init0.lado;
    const m = ANIM[esp];
    const sc = this.escala(esp);
    const ancho = (m ? m.w - 16 : 48) * sc * 0.7;
    const sombra = this.add.ellipse(0, 0, ancho, ancho * 0.32, 0x000000, 0.28);
    const anillo = this.add.ellipse(0, 0, ancho + 8, (ancho + 8) * 0.36).setStrokeStyle(3, soy ? 0x4aa8ff : 0xff5a6a, 0.9);
    const spr = m ? this.add.sprite(0, 0, 'pa_' + esp, 0).setOrigin(0.5, m.pies / m.h) : this.add.sprite(0, 0, 'p_' + esp).setOrigin(0.5, 0.92);
    spr.setScale(sc);
    const nv: Vista = { spr, sombra, anillo, esp, x: 0, y: 0, flip: l === 0 ? 1 : -1, inclina: 0, anim: '', bloqueo: 0, ultAn: '', estocada: 0, estAng: 0, golpe: 0, polvo: 0 };
    this.vistas[l] = nv;
    this.reproducir(nv, 'idle');
    return nv;
  }

  private reproducir(v: Vista, nombre: string, forzar = false) {
    if (!ANIM[v.esp]) return;
    if (v.anim === nombre && !forzar) return;
    v.anim = nombre;
    v.spr.play(`${v.esp}-${nombre}`, true);
  }

  // ---------------------------------------------------------------- red
  private onSnap(s: Snapshot) {
    const sample = s.t - Date.now();
    if (this.offset === null || sample > this.offset + 200) this.offset = sample;
    else this.offset += (sample - this.offset) * 0.05;
    this.snaps.push(s);
    if (this.snaps.length > 20) this.snaps.shift();
    const antes = this.ultimo;
    this.ultimo = s;
    this.reconciliar(s, antes);
    this.actualizarHud(s);
  }

  /** Reconciliación: posición del servidor + entradas aún no confirmadas. Lo que no cuadre se suaviza. */
  private reconciliar(s: Snapshot, antes: Snapshot | null) {
    const me = s.u[this.init0.lado];
    this.pend = this.pend.filter((p) => p.s > s.ack);
    const cambio = !antes || antes.u[this.init0.lado].esp !== me.esp;
    // embestidas, esquivas y entradas a la arena: manda el servidor
    if (cambio || me.an === 'dash' || me.an === 'caido') {
      this.pred = { x: me.x, y: me.y };
      this.prevPred = { ...this.pred };
      this.err = { x: 0, y: 0 };
      return;
    }
    const v = velocidadMover(me.esp, statsPrimal(ESPECIES[me.esp], me.nv).velocidad, me.st);
    let x = me.x, y = me.y;
    for (const p of this.pend) {
      const r = moverEnArena(x, y, p.x * v * TICK, p.y * v * TICK, this.init0.obstaculos);
      x = r.x; y = r.y;
    }
    const dx = this.pred.x - x, dy = this.pred.y - y;
    if (Math.hypot(dx, dy) > 70) { this.err = { x: 0, y: 0 }; this.prevPred = { x, y }; }
    else { this.err.x += dx; this.err.y += dy; this.prevPred.x -= dx; this.prevPred.y -= dy; }
    this.pred = { x, y };
  }

  private interp(l: 0 | 1): UnidadSnap | null {
    const rt = Date.now() + (this.offset ?? 0) - INTERP;
    const s = this.snaps;
    if (!s.length) return null;
    for (let i = s.length - 1; i > 0; i--) {
      if (s[i - 1].t <= rt) {
        const a = s[i - 1].u[l], b = s[i].u[l];
        if (a.esp !== b.esp) return b;
        const t = Math.min(1, (rt - s[i - 1].t) / Math.max(1, s[i].t - s[i - 1].t));
        return { ...b, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }
    return s[s.length - 1].u[l];
  }

  private dir() {
    const k = this.keys;
    let x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (x || y) this.destino = null; // el teclado manda
    if (this.joy.activo) { x = this.joy.x; y = this.joy.y; }
    if (!x && !y && this.destino) {
      const dx = this.destino.x - this.pred.x, dy = this.destino.y - this.pred.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) { if (!this.moviendoRaton) this.destino = null; }
      else { x = dx / d; y = dy / d; if (d < 24) { x *= d / 24; y *= d / 24; } }
    }
    const n = Math.hypot(x, y);
    return n > 1 ? { x: x / n, y: y / n } : { x, y };
  }

  /** Un tick de entrada: se envía al servidor y se aplica ya en la predicción. */
  private pasoEntrada() {
    if (this.fin) return;
    const d = this.dir();
    if (this.esTactil() && this.ultimo) {
      const r = this.ultimo.u[1 - this.init0.lado];
      this.apunta = { x: r.x, y: r.y };
    }
    const inp = { s: ++this.seq, x: Math.round(d.x * 100) / 100, y: Math.round(d.y * 100) / 100 };
    this.net.send('in', { ...inp, ax: Math.round(this.apunta.x), ay: Math.round(this.apunta.y) });
    this.pend.push(inp);
    if (this.pend.length > 40) this.pend.shift();
    this.prevPred = { ...this.pred };
    const me = this.ultimo?.u[this.init0.lado];
    if (me && (d.x || d.y) && me.an !== 'caido' && me.an !== 'dash') {
      const v = velocidadMover(me.esp, statsPrimal(ESPECIES[me.esp], me.nv).velocidad, me.st);
      this.pred = moverEnArena(this.pred.x, this.pred.y, d.x * v * TICK, d.y * v * TICK, this.init0.obstaculos);
    }
    if (this.atacando) this.accion(0);
  }

  private apuntar(p: Phaser.Input.Pointer) {
    const w = p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    this.apunta = { x: w.x, y: w.y };
  }

  accion(i: number) {
    if (this.fin || !this.ultimo) return;
    if (this.esTactil()) {
      const r = this.ultimo.u[1 - this.init0.lado];
      this.apunta = { x: r.x, y: r.y };
    }
    this.net.send('acc', { i, x: Math.round(this.apunta.x), y: Math.round(this.apunta.y) });
  }

  cambiar(slot: number) {
    this.net.send('cambio', { slot });
  }

  private cambiarRel(d: number) {
    const eq = this.ultimo?.eq[this.init0.lado];
    if (!eq) return;
    for (let k = 1; k <= eq.esp.length; k++) {
      const s = (eq.activo + d * k + eq.esp.length * 2) % eq.esp.length;
      if (eq.hp[s] > 0) return this.cambiar(s);
    }
  }

  private marcaDestino(x: number, y: number) {
    const m = this.add.ellipse(x, y, 30, 12).setStrokeStyle(3, 0x7ad8ff, 1).setDepth(2);
    this.tweens.add({ targets: m, scale: 0.3, alpha: 0, duration: 380, onComplete: () => m.destroy() });
  }

  // ---------------------------------------------------------------- dibujo por cuadro
  update(_t: number, delta: number) {
    // ticks de entrada a ritmo fijo; la posición propia se interpola entre ticks
    this.acc += delta;
    let n = 0;
    while (this.acc >= TICK_MS && n < 4) { this.acc -= TICK_MS; n++; this.pasoEntrada(); }
    if (n === 4) this.acc = 0;
    const k = Math.pow(0.0005, delta / 1000);
    this.err.x *= k; this.err.y *= k;
    const now = this.time.now;
    for (const l of [0, 1] as const) {
      const s = l === this.init0.lado ? this.ultimo?.u[l] ?? null : this.interp(l);
      if (!s) continue;
      const v = this.vista(l, s.esp);
      let x = s.x, y = s.y;
      if (l === this.init0.lado && s.an !== 'dash') {
        const a = Math.min(1, this.acc / TICK_MS);
        x = this.prevPred.x + (this.pred.x - this.prevPred.x) * a + this.err.x;
        y = this.prevPred.y + (this.pred.y - this.prevPred.y) * a + this.err.y;
      }
      const vx = (x - v.x) / Math.max(1, delta) * 1000, vy = (y - v.y) / Math.max(1, delta) * 1000;
      const rapidez = Math.hypot(vx, vy);
      v.x = x; v.y = y;
      // estado de animación
      if (s.an !== v.ultAn) {
        if (s.an === 'basico' || s.an === 'mov') { this.reproducir(v, 'attack', true); v.bloqueo = now + 300; v.estocada = 1; v.estAng = s.fa; }
        if (s.an === 'golpe') { this.reproducir(v, 'hurt', true); v.bloqueo = now + 170; v.golpe = 1; }
        if (s.an === 'cambio') { v.spr.setScale(0.1); }
        v.ultAn = s.an;
      }
      if (s.an === 'caido') this.reproducir(v, 'faint');
      else if (now > v.bloqueo) this.reproducir(v, rapidez > 25 ? 'walk' : 'idle');
      // giro suave (el sprite mira a la derecha): se aplasta al darse la vuelta
      const quiere = Math.abs(vx) > 20 && s.an !== 'basico' && s.an !== 'mov' ? Math.sign(vx) : Math.cos(s.fa) < 0 ? -1 : 1;
      v.flip += (quiere - v.flip) * Math.min(1, delta / 60);
      v.inclina += (Phaser.Math.Clamp(vx / 2400, -0.13, 0.13) - v.inclina) * Math.min(1, delta / 90);
      // estocada hacia el objetivo al atacar y retroceso al recibir golpe
      v.estocada = Math.max(0, v.estocada - delta / 220);
      v.golpe = Math.max(0, v.golpe - delta / 180);
      const lunge = Math.sin(v.estocada * Math.PI) * 9;
      const ox = Math.cos(v.estAng) * lunge - Math.cos(s.fa) * v.golpe * 5;
      const oy = Math.sin(v.estAng) * lunge * 0.6 - Math.sin(s.fa) * v.golpe * 3;
      const sc = this.escala(s.esp);
      const salto = s.an === 'dash' ? -6 : 0;
      const cur = Math.abs(v.spr.scaleY) / sc;
      const crece = cur < 0.99 ? Math.min(1, cur + delta / 220) : 1; // aparece al entrar a la arena
      v.spr.setPosition(x + ox, y + oy + salto).setDepth(y + 10);
      v.spr.setScale(sc * crece * (Math.abs(v.flip) < 0.15 ? 0.15 * Math.sign(v.flip || 1) : v.flip), sc * crece);
      v.spr.setRotation(v.inclina);
      v.spr.setAlpha(s.st & 16 ? 0.6 + Math.sin(now / 40) * 0.25 : s.an === 'caido' ? 0.55 : 1);
      if (v.golpe > 0.6) v.spr.setTintFill(0xffffff);
      else if (s.st & 1) v.spr.setTint(0xffb090); else if (s.st & 8) v.spr.setTint(0xd8a0ff); else if (s.st & 2) v.spr.setTint(0xfff08a); else if (s.st & 4) v.spr.setTint(0xa0c8ff); else v.spr.clearTint();
      const somb = 1 - (salto ? 0.25 : 0);
      v.sombra.setPosition(x + ox, y + 3).setDepth(y - 1).setScale(somb);
      v.anillo.setPosition(x + ox, y + 3).setDepth(y - 1);
      if (s.sh > 0) v.anillo.setStrokeStyle(4, 0xa0dcff, 1); else v.anillo.setStrokeStyle(3, l === this.init0.lado ? 0x4aa8ff : 0xff5a6a, 0.9);
      // polvo al correr
      if (rapidez > 60 && now > v.polvo && s.an !== 'caido') {
        v.polvo = now + 110;
        const p = this.add.image(x - Math.sign(vx || 1) * 10, y + 2, 'polvo').setDepth(y - 2).setTint(0xd8e8c0).setAlpha(0.8).setScale(2 + Math.random());
        this.tweens.add({ targets: p, y: p.y - 8, alpha: 0, scale: 0.5, duration: 380, onComplete: () => p.destroy() });
      }
    }
    this.dibujarAvisos();
    this.dibujarProyectiles();
    this.dibujarApunte();
  }

  /** Indicador de alcance del movimiento que se va a lanzar (o del que está bajo el cursor). */
  private dibujarApunte() {
    const g = this.gApunte.clear();
    if (this.esTactil() || !this.ultimo) return;
    const me = this.ultimo.u[this.init0.lado];
    const x = this.pred.x + this.err.x, y = this.pred.y + this.err.y;
    // retícula en el cursor
    const ax = this.apunta.x, ay = this.apunta.y;
    g.lineStyle(2, 0xffffff, 0.6).strokeCircle(ax, ay, 9).lineBetween(ax - 14, ay, ax - 5, ay).lineBetween(ax + 5, ay, ax + 14, ay).lineBetween(ax, ay - 14, ax, ay - 5).lineBetween(ax, ay + 5, ax, ay + 14);
    if (this.destino) g.lineStyle(2, 0x7ad8ff, 0.5).strokeEllipse(this.destino.x, this.destino.y, 22, 9);
    const i = this.apuntando ?? this.vistaPrevia;
    if (i === null || i < 1 || i > 4) return;
    const m: Movimiento = MOVIMIENTOS[ESPECIES[me.esp].movimientos[i - 1]];
    const c = col(ELEMENTOS[m.elemento].color);
    const fuerte = this.apuntando !== null ? 0.9 : 0.5;
    const ang = Math.atan2(ay - y, ax - x);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    if (m.tipo === 'zona') {
      const d = Math.min(m.alcance, Math.hypot(ax - x, ay - y));
      g.lineStyle(2, 0xffffff, 0.25 * fuerte).strokeCircle(x, y, m.alcance);
      g.fillStyle(c, 0.25 * fuerte).fillCircle(x + ux * d, y + uy * d, m.radio ?? 60);
      g.lineStyle(3, c, fuerte).strokeCircle(x + ux * d, y + uy * d, m.radio ?? 60);
    } else if (m.tipo === 'area') {
      g.fillStyle(c, 0.2 * fuerte).fillCircle(x, y, m.alcance);
      g.lineStyle(3, c, fuerte).strokeCircle(x, y, m.alcance);
    } else if (m.tipo === 'rayo' || m.tipo === 'embestida') {
      const w = (m.radio ?? 22) * (m.tipo === 'rayo' ? 1 : 0.8);
      const px = -uy * w, py = ux * w, L = m.alcance;
      const pts = [new Phaser.Math.Vector2(x + px, y + py), new Phaser.Math.Vector2(x + ux * L + px, y + uy * L + py), new Phaser.Math.Vector2(x + ux * L - px, y + uy * L - py), new Phaser.Math.Vector2(x - px, y - py)];
      g.fillStyle(c, 0.22 * fuerte).fillPoints(pts, true);
      g.lineStyle(3, c, fuerte).strokePoints(pts, true);
    } else if (m.tipo === 'proyectil' || m.tipo === 'rafaga') {
      const n = m.tipo === 'rafaga' ? m.cantidad ?? 3 : 1;
      for (let k = 0; k < n; k++) {
        const a = ang + (k - (n - 1) / 2) * ((m.apertura ?? 12) * Math.PI / 180);
        const ex = x + Math.cos(a) * m.alcance, ey = y + Math.sin(a) * m.alcance;
        g.lineStyle((m.radio ?? 10) * 1.4, c, 0.25 * fuerte).lineBetween(x, y, ex, ey);
        g.lineStyle(2, c, fuerte).lineBetween(x, y, ex, ey);
        g.fillStyle(c, fuerte).fillTriangle(ex + Math.cos(a) * 12, ey + Math.sin(a) * 12, ex + Math.cos(a + 2.4) * 10, ey + Math.sin(a + 2.4) * 10, ex + Math.cos(a - 2.4) * 10, ey + Math.sin(a - 2.4) * 10);
      }
    } else {
      g.lineStyle(3, c, fuerte).strokeCircle(x, y - 20, 34);
    }
    if (this.apuntando !== null) {
      const t = `${m.nombre} · clic para lanzar · clic derecho cancela`;
      g.fillStyle(0x0c0818, 0.75).fillRoundedRect(x - 130, y - 118, 260, 22, 8);
      if (!this.txtApunte) this.txtApunte = this.add.text(0, 0, '', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5).setDepth(4001);
      this.txtApunte.setText(t).setPosition(x, y - 107).setVisible(true);
    }
  }
  private txtApunte: Phaser.GameObjects.Text | null = null;

  private dibujarAvisos() {
    if (this.apuntando === null) this.txtApunte?.setVisible(false);
    const g = this.gAvisos.clear();
    const s = this.ultimo;
    if (!s) return;
    const dt = (Date.now() + (this.offset ?? 0) - s.t) / 1000;
    for (const a of s.av) {
      const c = col(ELEMENTOS[a.el as keyof typeof ELEMENTOS].color);
      const mio = a.lado === this.init0.lado;
      const prog = Phaser.Math.Clamp(1 - (a.t - dt) / a.dur, 0, 1);
      const borde = mio ? 0x4aa8ff : 0xff3b4f;
      if (a.forma === 'circulo') {
        g.fillStyle(borde, 0.15).fillCircle(a.x, a.y, a.r);
        g.fillStyle(c, 0.35).fillCircle(a.x, a.y, a.r * prog);
        g.lineStyle(3, borde, 0.8).strokeCircle(a.x, a.y, a.r);
      } else {
        const ux = Math.cos(a.ang!), uy = Math.sin(a.ang!), px = -uy * a.r, py = ux * a.r;
        const L = a.largo!;
        const pts = [new Phaser.Math.Vector2(a.x + px, a.y + py), new Phaser.Math.Vector2(a.x + ux * L + px, a.y + uy * L + py),
          new Phaser.Math.Vector2(a.x + ux * L - px, a.y + uy * L - py), new Phaser.Math.Vector2(a.x - px, a.y - py)];
        g.fillStyle(borde, 0.15).fillPoints(pts, true);
        const Lp = L * prog;
        g.fillStyle(c, 0.4).fillPoints([pts[0], new Phaser.Math.Vector2(a.x + ux * Lp + px, a.y + uy * Lp + py), new Phaser.Math.Vector2(a.x + ux * Lp - px, a.y + uy * Lp - py), pts[3]], true);
        g.lineStyle(3, borde, 0.8).strokePoints(pts, true);
      }
    }
  }

  private dibujarProyectiles() {
    const s = this.ultimo;
    if (!s) return;
    const dt = (Date.now() + (this.offset ?? 0) - s.t) / 1000;
    const vivos = new Set<number>();
    for (const p of s.pj) {
      vivos.add(p.id);
      let c = this.proys.get(p.id);
      const colr = col(ELEMENTOS[p.el as keyof typeof ELEMENTOS].color);
      if (!c) {
        c = this.add.circle(p.x, p.y, p.r + 2, colr).setStrokeStyle(2, 0xffffff, 0.9).setDepth(2000);
        this.proys.set(p.id, c);
      }
      c.setPosition(p.x + p.vx * dt, p.y + p.vy * dt);
      if (Math.random() < 0.5) {
        const tr = this.add.circle(c.x, c.y, p.r * 0.7, colr, 0.6).setDepth(1999);
        this.tweens.add({ targets: tr, alpha: 0, scale: 0.3, duration: 220, onComplete: () => tr.destroy() });
      }
    }
    for (const [id, c] of this.proys) if (!vivos.has(id)) { c.destroy(); this.proys.delete(id); }
  }

  // ---------------------------------------------------------------- efectos
  private onFx(f: Fx) {
    switch (f.k) {
      case 'dano': {
        const color = f.ef > 1 ? '#ffcf4a' : f.ef < 1 ? '#b0b0c8' : '#ffffff';
        const t = this.add.text(f.x + (Math.random() - 0.5) * 20, f.y - 50, `${f.n}${f.crit ? '!' : ''}`, { fontFamily: 'Press Start 2P', fontSize: f.crit || f.ef > 1 ? '20px' : '14px', color, stroke: '#1a1030', strokeThickness: 5 }).setOrigin(0.5).setDepth(5000);
        this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
        if (f.ef > 1) this.etiqueta(f.x, f.y - 80, '¡Muy eficaz!', '#ffcf4a');
        if (f.ef < 1) this.etiqueta(f.x, f.y - 80, 'Poco eficaz', '#b0b0c8');
        if (f.lado === this.init0.lado) this.cameras.main.shake(90, 0.004);
        break;
      }
      case 'cura': {
        const t = this.add.text(f.x, f.y - 50, `+${f.n}`, { fontFamily: 'Press Start 2P', fontSize: '14px', color: '#5fe07a', stroke: '#1a1030', strokeThickness: 5 }).setOrigin(0.5).setDepth(5000);
        this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
        break;
      }
      case 'impacto': {
        const c = col(ELEMENTOS[f.el as keyof typeof ELEMENTOS].color);
        const ring = this.add.circle(f.x, f.y, Math.max(10, f.r), c, 0.35).setStrokeStyle(3, 0xffffff, 0.8).setDepth(1500);
        ring.setScale(0.3);
        this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const px = this.add.rectangle(f.x, f.y, 6, 6, c).setDepth(1600);
          this.tweens.add({ targets: px, x: f.x + Math.cos(a) * f.r * 0.8, y: f.y + Math.sin(a) * f.r * 0.8, alpha: 0, duration: 350, onComplete: () => px.destroy() });
        }
        break;
      }
      case 'mov': {
        const m = MOVIMIENTOS[f.id];
        if (m) this.etiqueta(f.x, f.y - 90, m.nombre, ELEMENTOS[m.elemento].color);
        break;
      }
      case 'cambio': {
        const r = this.add.circle(f.x, f.y - 20, 50, 0xffffff, 0.6).setDepth(3000);
        this.tweens.add({ targets: r, scale: 1.8, alpha: 0, duration: 400, onComplete: () => r.destroy() });
        this.etiqueta(f.x, f.y - 100, `¡Adelante, ${ESPECIES[f.esp].nombre}!`, f.lado === this.init0.lado ? '#7ab8ff' : '#ff8a9a');
        break;
      }
      case 'caido':
        this.etiqueta(f.x, f.y - 100, `¡${ESPECIES[f.esp].nombre} cayó!`, '#ff8a9a');
        this.cameras.main.shake(250, 0.008);
        break;
      case 'estado': {
        const n: Record<string, string> = { quemadura: '🔥 Quemado', paralisis: '⚡ Paralizado', lento: '🐌 Lento', veneno: '☠️ Envenenado' };
        this.etiqueta(f.x, f.y - 70, n[f.estado] ?? f.estado, '#ffffff');
        break;
      }
      case 'esquiva':
        this.etiqueta(f.x, f.y - 70, '¡Esquivó!', '#c0a0ff');
        break;
      case 'dash': {
        // estela: copias del Primal que se desvanecen
        const v = this.vistas[f.lado];
        if (!v) break;
        for (let k = 0; k < 4; k++) {
          this.time.delayedCall(k * 40, () => {
            if (!v.spr.active) return;
            const c = this.add.sprite(v.spr.x, v.spr.y, v.spr.texture.key, v.spr.frame.name).setOrigin(v.spr.originX, v.spr.originY)
              .setScale(v.spr.scaleX, v.spr.scaleY).setDepth(v.spr.depth - 1).setTintFill(f.lado === this.init0.lado ? 0x7ab8ff : 0xff8a9a).setAlpha(0.5);
            this.tweens.add({ targets: c, alpha: 0, duration: 260, onComplete: () => c.destroy() });
          });
        }
        break;
      }
    }
  }

  private etiqueta(x: number, y: number, txt: string, color: string) {
    const t = this.add.text(x, y, txt, { fontFamily: 'Nunito', fontStyle: '900', fontSize: '16px', color, stroke: '#1a1030', strokeThickness: 5 }).setOrigin(0.5).setDepth(5001);
    this.tweens.add({ targets: t, y: y - 24, alpha: 0, delay: 500, duration: 600, onComplete: () => t.destroy() });
  }

  private cuenta(ms: number) {
    const c = $('bh-center');
    const pasos = Math.round(ms / 1000);
    for (let i = 0; i <= pasos; i++) {
      this.time.delayedCall(i * 1000, () => {
        c.textContent = i < pasos ? String(pasos - i) : '¡YA!';
        if (i === pasos) this.time.delayedCall(700, () => (c.textContent = ''));
      });
    }
  }

  // ---------------------------------------------------------------- interfaz de batalla (HTML)
  private armarHud() {
    $('battle-hud').classList.remove('hidden');
    const tactil = this.esTactil();
    $('joystick').classList.toggle('hidden', !tactil);
    if (tactil) this.armarJoystick();
    $('bh-center').textContent = '';
  }

  private armarJoystick() {
    const base = $('joystick'), knob = $('joystick-knob');
    let id: number | null = null;
    const mover = (e: PointerEvent) => {
      const r = base.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy), max = r.width / 2;
      if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy = { x: dx / max, y: dy / max, activo: true };
    };
    base.onpointerdown = (e) => { id = e.pointerId; base.setPointerCapture(e.pointerId); mover(e); };
    base.onpointermove = (e) => { if (e.pointerId === id) mover(e); };
    base.onpointerup = base.onpointercancel = () => { id = null; knob.style.transform = ''; this.joy = { x: 0, y: 0, activo: false }; };
  }

  private hudEsp = '';
  private actualizarHud(s: Snapshot) {
    const me = this.init0.lado, foe = (1 - me) as 0 | 1;
    const lado = (l: 0 | 1) => {
      const u = s.u[l];
      const e = ESPECIES[u.esp];
      const pct = (u.hp / u.mhp) * 100;
      const cls = pct < 25 ? 'low' : pct < 55 ? 'mid' : '';
      const eq = s.eq[l];
      const dots = eq.hp.map((h) => `<i class="${h > 0 ? '' : 'ko'}"></i>`).join('');
      return `<div class="nm">${this.init0.nombres[l]} <span class="sub">🏆 ${this.init0.trofeos[l]}</span></div>
        <div class="sub">${ELEMENTOS[e.elemento].icono} ${e.nombre} nv. ${u.nv} · ${u.hp}/${u.mhp}</div>
        <div class="hpbar"><div class="${cls}" style="width:${pct}%"></div>${u.sh ? `<span class="shield" style="left:0;width:${Math.min(100, (u.sh / u.mhp) * 100)}%"></span>` : ''}</div>
        <div class="dots">${dots}</div>`;
    };
    $('bh-me').innerHTML = lado(me);
    $('bh-foe').innerHTML = lado(foe);
    const tm = $('bh-timer');
    tm.textContent = `${Math.floor(s.tiempo / 60)}:${String(s.tiempo % 60).padStart(2, '0')}`;
    tm.classList.toggle('urgent', s.tiempo <= 20);
    // equipo propio
    const eq = s.eq[me];
    $('bh-team').innerHTML = eq.esp.map((esp, i) => {
      const pct = (eq.hp[i] / eq.mhp[i]) * 100;
      const cd = i !== eq.activo && eq.hp[i] > 0 && eq.cambioListo > 0 ? `<span class="cd">${Math.ceil(eq.cambioListo)}</span>` : '';
      return `<div class="tm ${i === eq.activo ? 'on' : ''} ${eq.hp[i] <= 0 ? 'ko' : ''}" data-slot="${i}"><span class="k">${i + 1}</span><img src="${spriteUrl(esp)}"><div class="mini"><div style="width:${pct}%"></div></div>${cd}</div>`;
    }).join('');
    $('bh-team').querySelectorAll<HTMLElement>('.tm').forEach((el) => (el.onclick = () => this.cambiar(Number(el.dataset.slot))));
    // botones de movimientos (se rehacen al cambiar de Primal)
    const u = s.u[me];
    if (this.hudEsp !== u.esp) {
      this.hudEsp = u.esp;
      const e = ESPECIES[u.esp];
      const btn = (i: number, cls: string, ico: string, txt: string, key: string, color = '') =>
        `<div class="mv ${cls}" data-i="${i}" style="${color ? `border-color:${color}` : ''}"><span class="key">${key}</span><span class="ico">${ico}</span>${txt}<span class="cdo"></span></div>`;
      $('bh-moves').innerHTML =
        e.movimientos.slice(0, 2).map((id, k) => { const m = MOVIMIENTOS[id]; return btn(k + 1, '', ICONOS[m.tipo], m.nombre, String(k + 1), ELEMENTOS[m.elemento].color); }).join('') +
        btn(0, 'main', e.basico === 'cuerpo' ? '👊' : '🔹', 'Básico', 'Clic') +
        e.movimientos.slice(2, 4).map((id, k) => { const m = MOVIMIENTOS[id]; return btn(k + 3, '', ICONOS[m.tipo], m.nombre, String(k + 3), ELEMENTOS[m.elemento].color); }).join('') +
        btn(5, 'dodge', '💨', 'Esquivar', 'Shift');
      $('bh-moves').querySelectorAll<HTMLElement>('.mv').forEach((el) => {
        const i = Number(el.dataset.i);
        el.onpointerdown = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          // con ratón: los movimientos 1-4 se apuntan primero (clic en la arena para lanzarlos)
          if (ev.pointerType === 'mouse' && i >= 1 && i <= 4) this.apuntando = this.apuntando === i ? null : i;
          else this.accion(i);
        };
        el.onpointerenter = () => { if (i >= 1 && i <= 4) this.vistaPrevia = i; };
        el.onpointerleave = () => { if (this.vistaPrevia === i) this.vistaPrevia = null; };
      });
    }
    const e = ESPECIES[u.esp];
    $('bh-moves').querySelectorAll<HTMLElement>('.mv').forEach((el) => {
      const i = Number(el.dataset.i);
      const cd = s.cds[i] ?? 0;
      const total = i === 0 ? 0.55 : i === 5 ? 1.6 : MOVIMIENTOS[e.movimientos[i - 1]]?.enfriamiento ?? 1;
      const o = el.querySelector<HTMLElement>('.cdo')!;
      o.style.setProperty('--p', `${Math.min(100, (cd / total) * 100)}%`);
      o.textContent = cd > 0.3 && i !== 0 ? String(Math.ceil(cd)) : '';
      el.classList.toggle('apuntando', this.apuntando === i);
    });
  }

  cerrar() {
    $('battle-hud').classList.add('hidden');
    this.hudEsp = '';
  }
}
