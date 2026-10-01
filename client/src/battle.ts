// Escena de batalla: arena vista desde arriba en diagonal, Primales en pixel art animado,
// predicción del movimiento propio (con reconciliación), interpolación del rival, avisos,
// proyectiles y efectos. Los ataques salen hacia donde mira el Primal (con ayuda de puntería si el
// rival está enfrente). Se juega con teclado, con ratón (clic derecho mover, clic izquierdo atacar)
// o con pantalla táctil.

import Phaser from 'phaser';
import {
  ARENA, CARGA_MAX, ELEMENTOS, EMOTES, ESPECIES, FRASES, MOVIMIENTOS, TICK_MS, especialesDe, moverEnArena, statsPrimal, tipos, velocidadMover,
  type Fx, type InicioBatalla, type Movimiento, type Snapshot, type UnidadSnap,
} from '../../shared/src';
import animMeta from '../../assets/criaturas/sprites/anim/animaciones.json';
import { spriteUrl, V } from './api';
import type { Conexion } from './net';
import * as FX from './efectos';
import { icono } from './iconos';
import { descEspecial, descMov, nombreArena, nombreElemento, nombreEspecial, nombreEspecialId, nombreMov, t } from './i18n';
import { dibujarEstadio, type Estadio } from './arenas';
import { esc } from './menu';

const INTERP = 100;
const TICK = TICK_MS / 1000;
const ASISTE_DIST = 460, ASISTE_ANG = 0.7; // igual que el servidor
const angDif = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const ST_COLOR: Record<string, string> = { quemadura: '#ff9a6a', paralisis: '#ffe066', lento: '#9cc8ff', veneno: '#d49cff' };
const col = (hex: string) => parseInt(hex.slice(1), 16);
const $ = (id: string) => document.getElementById(id)!;
type AnimMeta = { w: number; h: number; pies: number; anims: Record<string, { frames: number[]; fps: number; repeat: number }> };
const ANIM = animMeta as unknown as Record<string, AnimMeta>;

interface Vista {
  spr: Phaser.GameObjects.Sprite; sombra: Phaser.GameObjects.Ellipse; anillo: Phaser.GameObjects.Ellipse;
  esp: string; x: number; y: number; flip: number; inclina: number;
  anim: string; bloqueo: number; ultAn: string; estocada: number; estAng: number; golpe: number; polvo: number; mira: number; vuelo: number;
}

export class BatallaScene extends Phaser.Scene {
  net!: Conexion;
  init0!: InicioBatalla;
  snaps: Snapshot[] = [];
  offset: number | null = null;
  vistas: [Vista | null, Vista | null] = [null, null];
  gAvisos!: Phaser.GameObjects.Graphics;
  gApunte!: Phaser.GameObjects.Graphics;
  proys = new Map<number, FX.VistaProyectil>();
  campos = new Map<number, FX.VistaCampo>();
  estadio: Estadio | null = null;
  silenciado = false;
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
  vistaPrevia: number | null = null; // movimiento bajo el cursor (en los botones)
  faLocal = 0; // hacia dónde mira el Primal propio (predicho)
  ultMovio = 0;
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
    this.campos.clear();
    this.fin = false;
    this.ultimo = null;
    this.pend = [];
    this.err = { x: 0, y: 0 };
    this.destino = null;
    this.atacando = false;
    this.vistaPrevia = null;
    this.faLocal = data.init.lado === 0 ? 0 : Math.PI;
    this.hudEsp = '';
    this.comboN = 0;
    this.cargaPrev = 0;
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
    FX.crearTexturas(this);
    this.estadio = dibujarEstadio(this, this.init0.liga, this.init0.obstaculos);
    this.gAvisos = this.add.graphics().setDepth(1);
    this.gApunte = this.add.graphics().setDepth(4000);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ONE,TWO,THREE,FOUR,Q,E,F,R,T,C') as any;
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
        this.moviendoRaton = true;
        this.destino = { ...this.apunta };
        this.marcaDestino(this.apunta.x, this.apunta.y);
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
    this.keys.R.on('down', () => this.accion(6));
    this.keys.T.on('down', () => this.accion(7));
    this.keys.C.on('down', () => this.panelEmotes());
    this.keys.Q.on('down', () => this.cambiarRel(-1));
    this.keys.E.on('down', () => this.cambiarRel(1));
    this.scale.on('resize', this.ajustar, this);
    this.ajustar();
    this.net.on('snap', (s: Snapshot) => this.onSnap(s));
    this.net.on('fx', (list: Fx[]) => list.forEach((f) => this.onFx(f)));
    this.net.on('cuenta', (m: { ms: number }) => this.cuenta(m.ms));
    this.net.on('fin', (r) => { this.fin = true; this.time.delayedCall(900, () => this.onFin(r)); });
    this.net.on('emote', (m: { lado: 0 | 1; id: string }) => this.mostrarEmote(m.lado, m.id));
    this.armarHud();
    this.intro();
  }

  private esTactil() {
    return matchMedia('(pointer: coarse)').matches;
  }

  private zoomJuego() {
    const w = this.scale.width, h = this.scale.height;
    return Math.min(w / (ARENA.w + 80), h / (ARENA.h + 240));
  }

  private ajustar() {
    this.cameras.main.setZoom(this.zoomJuego());
    this.cameras.main.centerOn(ARENA.w / 2, ARENA.h / 2 - 15);
  }

  /** Entrada: la cámara empieza lejos mostrando el estadio entero y baja hasta el campo. */
  private intro() {
    const cam = this.cameras.main;
    const z = this.zoomJuego();
    cam.setZoom(z * 0.42);
    cam.centerOn(ARENA.w / 2, ARENA.h / 2 - 260);
    cam.zoomTo(z, 2300, 'Sine.easeInOut');
    cam.pan(ARENA.w / 2, ARENA.h / 2 - 15, 2300, 'Sine.easeInOut');
    $('bh-banner').innerHTML = `<div class="banner arena"><small>${t('misc.arena')}</small>${nombreArena(this.init0.liga)}</div>`;
  }

  private escala(_esp: string) {
    return 1.3; // el tamaño ya viene en el sprite (pequeño, mediano, grande, enorme)
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
    const nv: Vista = { spr, sombra, anillo, esp, x: 0, y: 0, flip: l === 0 ? 1 : -1, inclina: 0, anim: '', bloqueo: 0, ultAn: '', estocada: 0, estAng: 0, golpe: 0, polvo: 0, mira: l === 0 ? 1 : -1, vuelo: 0 };
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
    const me = s.u[this.init0.lado];
    if (Date.now() - this.ultMovio > 160 || me.an === 'basico' || me.an === 'mov' || me.an === 'dash') this.faLocal = me.fa;
    this.actualizarHud(s);
  }

  /** Reconciliación: posición del servidor + entradas aún no confirmadas. Lo que no cuadre se suaviza. */
  private reconciliar(s: Snapshot, antes: Snapshot | null) {
    const me = s.u[this.init0.lado];
    this.pend = this.pend.filter((p) => p.s > s.ack);
    const cambio = !antes || antes.u[this.init0.lado].esp !== me.esp;
    // embestidas, esquivas y entradas a la arena: manda el servidor
    if (cambio || me.an === 'dash' || me.an === 'caido' || me.an === 'vuelo') {
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
    const me = this.ultimo?.u[this.init0.lado];
    if ((d.x || d.y) && me && me.an !== 'basico' && me.an !== 'mov') { this.faLocal = Math.atan2(d.y, d.x); this.ultMovio = Date.now(); }
    const inp = { s: ++this.seq, x: Math.round(d.x * 100) / 100, y: Math.round(d.y * 100) / 100 };
    this.net.send('in', { ...inp, ax: 0, ay: 0 });
    this.pend.push(inp);
    if (this.pend.length > 40) this.pend.shift();
    this.prevPred = { ...this.pred };
    if (me && (d.x || d.y) && me.an !== 'caido' && me.an !== 'dash' && me.an !== 'vuelo') {
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
    this.net.send('acc', { i });
    const b = document.querySelector<HTMLElement>(`#bh-moves .ab[data-i="${i}"]`);
    if (b) { b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 110); }
  }

  /** Hacia dónde saldría un ataque ahora: donde mira, o al rival si está enfrente y cerca. */
  private apuntado(): { ang: number; asiste: boolean; rx: number; ry: number } {
    const s = this.ultimo!;
    const fa = this.faLocal;
    const r = s.u[1 - this.init0.lado];
    const x = this.pred.x, y = this.pred.y;
    const angR = Math.atan2(r.y - y, r.x - x);
    const asiste = r.hp > 0 && Math.hypot(r.x - x, r.y - y) < ASISTE_DIST && angDif(angR, fa) < ASISTE_ANG;
    return { ang: asiste ? angR : fa, asiste, rx: r.x, ry: r.y };
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
        if (s.an === 'vuelo') v.vuelo = now;
        if (v.ultAn === 'vuelo') { this.cameras.main.shake(260, 0.012); this.estadio?.vitorear(); }
        v.ultAn = s.an;
      }
      if (s.an === 'caido') this.reproducir(v, 'faint');
      else if (now > v.bloqueo) this.reproducir(v, rapidez > 25 ? 'walk' : 'idle');
      // giro suave (el sprite mira a la derecha): se aplasta al darse la vuelta
      // hacia dónde mira: al atacar, hacia el objetivo; al correr, hacia donde va (con margen para no titubear)
      const fa = l === this.init0.lado ? this.faLocal : s.fa;
      if (s.an === 'basico' || s.an === 'mov' || now < v.bloqueo) v.mira = Math.cos(s.fa) < 0 ? -1 : 1;
      else if (Math.abs(vx) > 45) v.mira = Math.sign(vx);
      else if (rapidez < 25 && Math.abs(Math.cos(fa)) > 0.25) v.mira = Math.cos(fa) < 0 ? -1 : 1;
      v.flip += (v.mira - v.flip) * Math.min(1, delta / 50);
      v.inclina += (Phaser.Math.Clamp(vx / 2400, -0.13, 0.13) - v.inclina) * Math.min(1, delta / 90);
      // estocada hacia el objetivo al atacar y retroceso al recibir golpe
      v.estocada = Math.max(0, v.estocada - delta / 220);
      v.golpe = Math.max(0, v.golpe - delta / 180);
      const lunge = Math.sin(v.estocada * Math.PI) * 9;
      const ox = Math.cos(v.estAng) * lunge - Math.cos(s.fa) * v.golpe * 5;
      const oy = Math.sin(v.estAng) * lunge * 0.6 - Math.sin(s.fa) * v.golpe * 3;
      const sc = this.escala(s.esp);
      // en el aire: sube fuera de la pantalla y la sombra se encoge
      const alto = s.an === 'vuelo' ? Math.min(1, (now - v.vuelo) / 320) * 300 : 0;
      const salto = (s.an === 'dash' ? -6 : 0) - alto;
      const cur = Math.abs(v.spr.scaleY) / sc;
      const crece = cur < 0.99 ? Math.min(1, cur + delta / 220) : 1; // aparece al entrar a la arena
      v.spr.setPosition(x + ox, y + oy + salto).setDepth(y + 10);
      v.spr.setScale(sc * crece * (Math.abs(v.flip) < 0.15 ? 0.15 * Math.sign(v.flip || 1) : v.flip), sc * crece);
      v.spr.setRotation(v.inclina);
      v.spr.setAlpha(s.st & 16 ? 0.6 + Math.sin(now / 40) * 0.25 : s.an === 'caido' ? 0.55 : 1);
      if (v.golpe > 0.6) v.spr.setTintFill(0xffffff);
      else if (this.cargando(l)) v.spr.setTint(Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(FX.colorEl(ESPECIES[s.esp].elemento)), 100, 50 + Math.sin(now / 50) * 50).color);
      else if (s.st & 1) v.spr.setTint(0xffb090); else if (s.st & 8) v.spr.setTint(0xd8a0ff); else if (s.st & 2) v.spr.setTint(0xfff08a); else if (s.st & 4) v.spr.setTint(0xa0c8ff); else v.spr.clearTint();
      const somb = alto ? Math.max(0.25, 1 - alto / 300) : 1 - (salto ? 0.25 : 0);
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
    this.dibujarCampos();
    this.dibujarApunte();
    this.estadio?.animar(now);
  }

  private dibujarCampos() {
    const s = this.ultimo;
    if (!s) return;
    const dt = (Date.now() + (this.offset ?? 0) - s.t) / 1000;
    const vivos = new Set<number>();
    for (const c of s.cp ?? []) {
      vivos.add(c.id);
      let v = this.campos.get(c.id);
      if (!v) { v = FX.crearCampo(this, c); this.campos.set(c.id, v); }
      FX.dibujarCampo(v, { ...c, t: c.t - dt }, this.time.now);
    }
    for (const [id, v] of this.campos) if (!vivos.has(id)) { FX.borrarCampo(this, v); this.campos.delete(id); }
  }

  /** Flecha de dirección bajo el Primal propio y vista previa del movimiento bajo el cursor. */
  private dibujarApunte() {
    const g = this.gApunte.clear();
    if (!this.ultimo || this.fin) return;
    const me = this.ultimo.u[this.init0.lado];
    if (me.hp <= 0) return;
    const x = this.pred.x + this.err.x, y = this.pred.y + this.err.y;
    if (this.destino && !this.esTactil()) g.lineStyle(2, 0x7ad8ff, 0.5).strokeEllipse(this.destino.x, this.destino.y, 22, 9);
    const { ang, asiste, rx, ry } = this.apuntado();
    const ux = Math.cos(ang), uy = Math.sin(ang);
    // flecha en el suelo: azul = hacia donde mira; dorada = fijada en el rival
    const c = asiste ? 0xffc940 : 0x7ab8ff;
    // el tamaño crece con el Primal para que la flecha asome por delante de su cuerpo
    const tam = ESPECIES[me.esp].etapa === 3 ? 1.35 : ESPECIES[me.esp].etapa === 2 ? 1.15 : 1;
    const r0 = 34 * tam, r1 = 70 * tam, gy = y + 2, k = 0.7;
    const px = -uy, py = ux;
    const pulso = 1 + Math.sin(this.time.now / 160) * 0.06;
    g.lineStyle(5, c, 0.45).lineBetween(x + ux * r0, gy + uy * r0 * k, x + ux * r1, gy + uy * r1 * k);
    g.fillStyle(0x0c0818, 0.5).fillTriangle(
      x + ux * (r1 + 20) * pulso, gy + uy * (r1 + 20) * pulso * k + 2,
      x + ux * r1 + px * 14, gy + (uy * r1 + py * 14) * k + 2,
      x + ux * r1 - px * 14, gy + (uy * r1 - py * 14) * k + 2);
    g.fillStyle(c, 0.95).fillTriangle(
      x + ux * (r1 + 20) * pulso, gy + uy * (r1 + 20) * pulso * k,
      x + ux * r1 + px * 13, gy + (uy * r1 + py * 13) * k,
      x + ux * r1 - px * 13, gy + (uy * r1 - py * 13) * k);
    if (asiste) {
      const k = 1 + Math.sin(this.time.now / 120) * 0.08;
      g.lineStyle(2, 0xffc940, 0.75).strokeEllipse(rx, ry + 3, 64 * k, 24 * k);
    }
    const i = this.vistaPrevia;
    if (i === null || i < 1 || i > 4) return;
    const m: Movimiento = MOVIMIENTOS[ESPECIES[me.esp].movimientos[i - 1]];
    const cm = col(ELEMENTOS[m.elemento].color);
    const f = 0.7;
    if (m.tipo === 'zona') {
      const d = asiste ? Math.min(m.alcance, Math.hypot(rx - x, ry - y)) : Math.min(m.alcance, 200);
      g.lineStyle(2, 0xffffff, 0.2).strokeCircle(x, y, m.alcance);
      g.fillStyle(cm, 0.22).fillCircle(x + ux * d, y + uy * d, m.radio ?? 60);
      g.lineStyle(3, cm, f).strokeCircle(x + ux * d, y + uy * d, m.radio ?? 60);
    } else if (m.tipo === 'area') {
      g.fillStyle(cm, 0.18).fillCircle(x, y, m.alcance);
      g.lineStyle(3, cm, f).strokeCircle(x, y, m.alcance);
    } else if (m.tipo === 'rayo' || m.tipo === 'embestida') {
      const w = (m.radio ?? 22) * (m.tipo === 'rayo' ? 1 : 0.8);
      const qx = -uy * w, qy = ux * w, L = m.alcance;
      const pts = [new Phaser.Math.Vector2(x + qx, y + qy), new Phaser.Math.Vector2(x + ux * L + qx, y + uy * L + qy), new Phaser.Math.Vector2(x + ux * L - qx, y + uy * L - qy), new Phaser.Math.Vector2(x - qx, y - qy)];
      g.fillStyle(cm, 0.2).fillPoints(pts, true);
      g.lineStyle(3, cm, f).strokePoints(pts, true);
    } else if (m.tipo === 'proyectil' || m.tipo === 'rafaga') {
      const n = m.tipo === 'rafaga' ? m.cantidad ?? 3 : 1;
      for (let k = 0; k < n; k++) {
        const a = ang + (k - (n - 1) / 2) * ((m.apertura ?? 12) * Math.PI / 180);
        const ex = x + Math.cos(a) * m.alcance, ey = y + Math.sin(a) * m.alcance;
        g.lineStyle((m.radio ?? 10) * 1.4, cm, 0.2).lineBetween(x, y, ex, ey);
        g.lineStyle(2, cm, f).lineBetween(x, y, ex, ey);
      }
    } else {
      g.lineStyle(3, cm, f).strokeCircle(x, y - 20, 34);
    }
  }

  /** ¿Este lado está preparando un ataque con aviso (zona o rayo)? */
  private cargando(l: 0 | 1) {
    return !!this.ultimo?.av.some((a) => a.lado === l && a.forma === 'linea');
  }

  /** Pausa de impacto: todo se congela un instante en los golpes fuertes. */
  private pausaImpacto(ms: number) {
    for (const v of this.vistas) v?.spr.anims.pause();
    this.tweens.timeScale = 0.15;
    this.time.delayedCall(ms, () => {
      for (const v of this.vistas) v?.spr.anims.resume();
      this.tweens.timeScale = 1;
    });
  }

  private dibujarAvisos() {
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
      let v = this.proys.get(p.id);
      if (!v) {
        v = FX.crearProyectil(this, p.x, p.y - 14, p.el, p.m, p.r);
        this.proys.set(p.id, v);
      }
      FX.moverProyectil(v, p.x + p.vx * dt, p.y - 14 + p.vy * dt, p.vx, p.vy, this.time.now);
    }
    for (const [id, v] of this.proys) if (!vivos.has(id)) { FX.borrarProyectil(this, v); this.proys.delete(id); }
  }

  // ---------------------------------------------------------------- efectos
  private onFx(f: Fx) {
    switch (f.k) {
      case 'dano': {
        const color = f.ef > 1 ? '#ffcf4a' : f.ef < 1 ? '#b0b0c8' : '#ffffff';
        const num = this.add.text(f.x + (Math.random() - 0.5) * 20, f.y - 50, `${f.n}${f.crit ? '!' : ''}`, { fontFamily: 'Lilita One', fontSize: f.crit || f.ef > 1 ? '30px' : '22px', color, stroke: '#1a1030', strokeThickness: 6 }).setOrigin(0.5).setDepth(5000).setScale(1.5);
        this.tweens.add({ targets: num, scale: 1, duration: 160, ease: 'Back.easeOut' });
        this.tweens.add({ targets: num, y: num.y - 40, alpha: 0, delay: 200, duration: 700, ease: 'Cubic.easeOut', onComplete: () => num.destroy() });
        if (f.ef > 1) this.etiqueta(f.x, f.y - 80, t('hud.superEff'), '#ffcf4a');
        if (f.ef < 1) this.etiqueta(f.x, f.y - 80, t('hud.notEff'), '#b0b0c8');
        // chispas, pausa de impacto y temblor según la fuerza del golpe
        const v = this.vistas[f.lado];
        const fuerte = !!f.crit || f.ef > 1 || (v ? f.n > 0.12 * (this.ultimo?.u[f.lado].mhp ?? 999) : false);
        const atac = this.ultimo?.u[1 - f.lado];
        FX.impacto(this, f.x, f.y, atac ? ESPECIES[atac.esp].elemento : 'roca', fuerte);
        if (fuerte) this.pausaImpacto(70);
        this.cameras.main.shake(fuerte ? 140 : 70, fuerte ? 0.007 : f.lado === this.init0.lado ? 0.004 : 0.002);
        break;
      }
      case 'cura': {
        const num = this.add.text(f.x, f.y - 50, `+${f.n}`, { fontFamily: 'Lilita One', fontSize: '22px', color: '#5fe07a', stroke: '#1a1030', strokeThickness: 6 }).setOrigin(0.5).setDepth(5000);
        this.tweens.add({ targets: num, y: num.y - 30, alpha: 0, duration: 900, onComplete: () => num.destroy() });
        break;
      }
      case 'impacto':
        FX.estallido(this, f.x, f.y - 14, f.el, f.m === 'basico' ? 5 : 9, f.m === 'basico' ? 0.6 : 1);
        break;
      case 'basico': {
        FX.basico(this, f.x, f.y, f.ang, f.paso, f.el, f.cuerpo);
        break;
      }
      case 'estalla':
        FX.estalla(this, f);
        break;
      case 'mov': {
        const m = MOVIMIENTOS[f.id];
        if (!m) break;
        this.etiqueta(f.x, f.y - 90, nombreMov(f.id), ELEMENTOS[m.elemento].color);
        if (f.enlace) { this.etiqueta(f.x, f.y - 116, t('hud.link'), '#ffd257', 20); this.cameras.main.flash(90, 255, 220, 120); }
        if (m.tipo === 'escudo' || m.tipo === 'curar' || m.tipo === 'mejora') FX.apoyo(this, f.x, f.y, m.tipo, m.elemento);
        break;
      }
      case 'especial':
        this.especial(f);
        break;
      case 'combo':
        if (f.lado === this.init0.lado) this.mostrarCombo(f.n);
        break;
      case 'cambio': {
        if (f.silencioso) break;
        const r = this.add.circle(f.x, f.y - 20, 50, 0xffffff, 0.6).setDepth(3000);
        this.tweens.add({ targets: r, scale: 1.8, alpha: 0, duration: 400, onComplete: () => r.destroy() });
        this.etiqueta(f.x, f.y - 100, t('hud.goPrimal', { n: ESPECIES[f.esp].nombre }), f.lado === this.init0.lado ? '#7ab8ff' : '#ff8a9a');
        break;
      }
      case 'caido':
        this.estadio?.vitorear();
        this.etiqueta(f.x, f.y - 100, t('hud.fainted', { n: ESPECIES[f.esp].nombre }), '#ff8a9a');
        this.cameras.main.shake(250, 0.008);
        break;
      case 'estado': {
        const k = `st.${f.estado}` as Parameters<typeof t>[0];
        this.etiqueta(f.x, f.y - 70, t(k), ST_COLOR[f.estado] ?? '#ffffff');
        break;
      }
      case 'esquiva':
        this.etiqueta(f.x, f.y - 70, t('hud.dodged'), '#c0a0ff');
        break;
      case 'dash': {
        // estela: copias del Primal que se desvanecen (y partículas del elemento en las embestidas)
        const v = this.vistas[f.lado];
        if (!v) break;
        if (f.el) {
          const [c0, c1] = FX.pal(f.el);
          const em = this.add.particles(0, 0, f.el === 'fuego' || f.el === 'sombra' ? 'humo' : 'px', {
            lifespan: 300, speed: { min: 10, max: 40 }, scale: { start: f.el === 'fuego' || f.el === 'sombra' ? 0.7 : 2, end: 0 }, alpha: { start: 0.9, end: 0 },
            frequency: 12, tint: [c0, c1], blendMode: f.el === 'sombra' ? 'NORMAL' : 'ADD',
          }).setDepth(v.spr.depth - 1);
          em.startFollow(v.spr, 0, -14);
          this.time.delayedCall(260, () => { em.stop(); this.time.delayedCall(350, () => em.destroy()); });
        }
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

  private etiqueta(x: number, y: number, txt: string, color: string, tam = 16) {
    const e = this.add.text(x, y, txt, { fontFamily: 'Nunito', fontStyle: '900', fontSize: `${tam}px`, color, stroke: '#1a1030', strokeThickness: 5 }).setOrigin(0.5).setDepth(5001).setScale(0.6);
    this.tweens.add({ targets: e, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: e, y: y - 24, alpha: 0, delay: 600, duration: 600, onComplete: () => e.destroy() });
  }

  // ---------------------------------------------------------------- técnicas especiales y combos
  private especial(f: Extract<Fx, { k: 'especial' }>) {
    const mio = f.lado === this.init0.lado;
    // cartel: nombre de la técnica cruzando la pantalla
    const cont = $('bh-banner');
    cont.innerHTML = `<div class="banner ${mio ? '' : 'foe'}" style="--c:${ELEMENTOS[f.el as keyof typeof ELEMENTOS].color}"><small>${esc(this.init0.nombres[f.lado])}</small>${esc(nombreEspecialId(f.id))}</div>`;
    // pantalla: destello del color del elemento, zoom breve y temblor
    const c = FX.colorEl(f.el);
    const cam = this.cameras.main;
    const k = f.el === 'luz' || f.el === 'electrico' ? 0.45 : 0.8; // los colores claros deslumbran: menos destello
    cam.flash(200, ((c >> 16) & 255) * k, ((c >> 8) & 255) * k, (c & 255) * k);
    const z = cam.zoom;
    this.tweens.add({ targets: cam, zoom: z * 1.06, duration: 160, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => cam.setZoom(z) });
    cam.shake(260, 0.006);
    // aura alrededor del Primal: anillos que se expanden y columna de luz
    for (let k = 0; k < 3; k++) {
      const r = this.add.ellipse(f.x, f.y, 40, 16).setStrokeStyle(4, c, 1).setDepth(f.y - 1);
      this.tweens.add({ targets: r, scaleX: 5 + k, scaleY: 5 + k, alpha: 0, delay: k * 90, duration: 520, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
    }
    const luz = this.add.rectangle(f.x, f.y - 120, 46, 260, c, 0.35).setDepth(f.y + 20).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: luz, scaleX: 0, alpha: 0, duration: 450, ease: 'Cubic.easeIn', onComplete: () => luz.destroy() });
    FX.estallido(this, f.x, f.y - 20, f.el, 16, 1.4);
    this.estadio?.vitorear();
    const tonos: Record<string, [number, number, number]> = {
      eclipse: [0x05020f, 0.6, 2200], tormenta: [0x0a0c20, 0.5, 2400], diluvio: [0x0a1a30, 0.4, 4000], alas_de_tormenta: [0x0a0618, 0.45, 2000],
      sol_naciente: [0xffb040, 0.12, 1200], rayo_de_inti: [0xff9a30, 0.14, 1400], supernova: [0xff6020, 0.12, 1100], corona_nevada: [0x6ab0e0, 0.14, 1600],
      ventisca_glacial: [0x6ab0e0, 0.12, 1600], furia_volcanica: [0x3a0a00, 0.35, 2200], rio_de_lava: [0x3a0a00, 0.3, 2000],
    };
    const tn = tonos[f.id];
    if (tn) this.velo(tn[0], tn[1], tn[2]);
    if (f.id === 'arcoiris') this.arcoiris(f.x, f.y);
  }

  /** Velo de color sobre toda la pantalla (oscurece para tormentas y eclipses, ilumina para el sol). */
  private velo(color: number, alpha: number, ms: number) {
    const cam = this.cameras.main;
    const r = this.add.rectangle(0, 0, cam.width * 4, cam.height * 4, color, 0).setScrollFactor(0).setDepth(4500).setOrigin(0.25);
    this.tweens.add({ targets: r, fillAlpha: alpha, duration: 250, yoyo: true, hold: ms - 500, onComplete: () => r.destroy() });
  }

  private arcoiris(x: number, y: number) {
    const colores = [0xff4040, 0xff9a30, 0xffe040, 0x50e060, 0x40a0ff, 0x6a50ff, 0xc060ff];
    colores.forEach((c, i) => {
      const a = this.add.ellipse(x, y - 30, 120 + i * 30, 70 + i * 18).setStrokeStyle(6, c, 0.85).setDepth(4400).setBlendMode('ADD').setScale(0.2);
      this.tweens.add({ targets: a, scale: 2.4, alpha: 0, delay: i * 70, duration: 900, ease: 'Cubic.easeOut', onComplete: () => a.destroy() });
    });
  }

  // ---------------------------------------------------------------- emotes
  private panelEmotes(abrir?: boolean) {
    const p = $('bh-emotes');
    const vis = abrir ?? p.classList.contains('hidden');
    p.classList.toggle('hidden', !vis);
    if (!vis) return;
    p.innerHTML = `<div class="em-grid">${EMOTES.map((id) => `<button class="em" data-em="${id}"><img src="emotes/${id}.png" alt="" onerror="this.replaceWith(document.createTextNode('${id}'))"></button>`).join('')}</div>
      <div class="em-frases">${FRASES.map((id) => `<button class="fr" data-em="${id}">${t(`fr.${id}` as Parameters<typeof t>[0])}</button>`).join('')}</div>
      <button class="em-mute ${this.silenciado ? 'on' : ''}">${icono('silencio')}${this.silenciado ? t('hud.unmute') : t('hud.mute')}</button>`;
    p.querySelectorAll<HTMLElement>('[data-em]').forEach((b) => (b.onpointerdown = (ev) => {
      ev.stopPropagation();
      this.net.send('emote', { id: b.dataset.em });
      this.panelEmotes(false);
    }));
    p.querySelector<HTMLElement>('.em-mute')!.onpointerdown = (ev) => { ev.stopPropagation(); this.silenciado = !this.silenciado; this.panelEmotes(true); };
  }

  private mostrarEmote(lado: 0 | 1, id: string) {
    const mio = lado === this.init0.lado;
    if (!mio && this.silenciado) return;
    const esFrase = (FRASES as readonly string[]).includes(id);
    const el = document.createElement('div');
    el.className = `emote-burbuja ${mio ? 'me' : 'foe'} ${esFrase ? 'frase' : ''}`;
    el.innerHTML = esFrase ? t(`fr.${id}` as Parameters<typeof t>[0]) : `<img src="emotes/${id}.png" alt="">`;
    const cont = $(mio ? 'bh-me' : 'bh-foe');
    cont.parentElement!.querySelectorAll(`.emote-burbuja.${mio ? 'me' : 'foe'}`).forEach((x) => x.remove());
    cont.parentElement!.appendChild(el);
    setTimeout(() => el.classList.add('fuera'), 2200);
    setTimeout(() => el.remove(), 2600);
  }

  private comboN = 0;
  private comboT: ReturnType<typeof setTimeout> | null = null;
  private mostrarCombo(n: number) {
    const el = $('bh-combo');
    const bono = Math.min(30, Math.floor(n / 5) * 10);
    el.innerHTML = `<span class="n">${n}</span><span class="lb">${t('hud.combo')}</span>${bono ? `<span class="bonus">+${bono}%</span>` : ''}`;
    el.classList.add('on');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    this.comboN = n;
    if (this.comboT) clearTimeout(this.comboT);
    this.comboT = setTimeout(() => el.classList.remove('on'), 1600);
  }

  private cuenta(ms: number) {
    const c = $('bh-center');
    const pasos = Math.round(ms / 1000);
    for (let i = 0; i <= pasos; i++) {
      this.time.delayedCall(i * 1000, () => {
        c.textContent = i < pasos ? String(pasos - i) : t('hud.go');
        c.classList.toggle('go', i === pasos);
        c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick');
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
    $('bh-banner').innerHTML = '';
    $('bh-emote-btn').innerHTML = icono('emote');
    $('bh-emote-btn').onpointerdown = (ev) => { ev.stopPropagation(); this.panelEmotes(); };
    $('bh-emotes').classList.add('hidden');
    $('bh-combo').classList.remove('on');
  }

  /** Cambio de idioma en plena batalla: rehace los botones. */
  refrescarIdioma() {
    this.hudEsp = '';
    if (this.ultimo) this.actualizarHud(this.ultimo);
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
  private cargaPrev = 0;
  private cdsPrev: number[] = [];
  private actualizarHud(s: Snapshot) {
    const me = this.init0.lado, foe = (1 - me) as 0 | 1;
    const tarjeta = (l: 0 | 1) => {
      const u = s.u[l];
      const e = ESPECIES[u.esp];
      const pct = (u.hp / u.mhp) * 100;
      const cls = pct < 25 ? 'low' : pct < 55 ? 'mid' : '';
      const eq = s.eq[l];
      const dots = eq.hp.map((h) => `<i class="${h > 0 ? '' : 'ko'}"></i>`).join('');
      const est = (['quemadura', 'paralisis', 'lento', 'veneno'] as const).filter((_k, b) => u.st & (1 << b))
        .map((k) => `<span class="st-chip" style="background:${ST_COLOR[k]}">${t(`st.${k}` as Parameters<typeof t>[0])}</span>`).join('');
      const nombre = this.init0.rivalIA && l === foe && this.init0.modo === 'captura' ? t('misc.vsAI') : this.init0.nombres[l];
      return `<div class="bh-row"><span class="bh-name">${esc(nombre)}</span><span class="bh-tro">${icono('trofeo')}${this.init0.trofeos[l]}</span></div>
        <div class="bh-mon">${tipos(u.esp).map((x) => `<span class="el" style="--c:${ELEMENTOS[x].color}">${icono(x)}</span>`).join('')}<b>${e.nombre}</b><span class="lv">${t('misc.level', { n: u.nv })}</span>${est}<span class="hpn">${u.hp}/${u.mhp}</span></div>
        <div class="hpbar"><div class="lag" style="width:${pct}%"></div><div class="fill ${cls}" style="width:${pct}%"></div>${u.sh ? `<span class="shield" style="width:${Math.min(100, (u.sh / u.mhp) * 100)}%"></span>` : ''}</div>
        <div class="team-dots">${dots}</div>`;
    };
    this.pintarTarjeta($('bh-me'), tarjeta(me));
    this.pintarTarjeta($('bh-foe'), tarjeta(foe));
    const tm = $('bh-timer');
    tm.lastElementChild!.textContent = `${Math.floor(s.tiempo / 60)}:${String(s.tiempo % 60).padStart(2, '0')}`;
    tm.classList.toggle('urgent', s.tiempo <= 20);
    // equipo propio
    const eq = s.eq[me];
    const htmlEq = eq.esp.map((esp, i) => {
      const pct = (eq.hp[i] / eq.mhp[i]) * 100;
      const cd = i !== eq.activo && eq.hp[i] > 0 && eq.cambioListo > 0 ? `<span class="cd">${Math.ceil(eq.cambioListo)}</span>` : '';
      return `<div class="tm ${i === eq.activo ? 'on' : ''} ${eq.hp[i] <= 0 ? 'ko' : ''}" style="--c:${ELEMENTOS[ESPECIES[esp].elemento].color}" data-slot="${i}" title="${ESPECIES[esp].nombre}"><span class="k">${i + 1}</span><img src="${spriteUrl(esp)}" alt=""><div class="mini"><div style="width:${pct}%"></div></div>${cd}</div>`;
    }).join('');
    if ($('bh-team').dataset.h !== htmlEq) {
      $('bh-team').dataset.h = htmlEq;
      $('bh-team').innerHTML = htmlEq;
      $('bh-team').querySelectorAll<HTMLElement>('.tm').forEach((el) => (el.onclick = () => this.cambiar(Number(el.dataset.slot))));
    }
    // botones de acción (se rehacen al cambiar de Primal o de idioma)
    const u = s.u[me];
    const e = ESPECIES[u.esp];
    if (this.hudEsp !== u.esp) {
      this.hudEsp = u.esp;
      const btn = (i: number, cls: string, ico: string, lbl: string, key: string, color: string, extra = '') =>
        `<div class="ab ${cls}" data-i="${i}" style="--c:${color}">${extra}<span class="ico">${ico}</span><span class="lbl">${esc(lbl)}</span><span class="key">${key}</span><span class="cdo"></span></div>`;
      const sps = especialesDe(u.esp);
      $('bh-moves').innerHTML =
        btn(0, 'basic', icono(e.basico === 'cuerpo' ? 'golpe' : 'orbe'), t('hud.basic'), t('key.space'), '#b4a8e8') +
        e.movimientos.map((id, k) => { const m = MOVIMIENTOS[id]; return btn(k + 1, 'm', icono(m.tipo), nombreMov(id), String(k + 1), ELEMENTOS[m.elemento].color); }).join('') +
        btn(5, 'dodge', icono('esquiva'), t('hud.dodge'), 'Shift', '#5a8ae0') +
        sps.map((sp, k) => btn(6 + k, 'sp', icono(sp.elemento), nombreEspecial(u.esp, k), k ? 'T' : 'R', ELEMENTOS[sp.elemento].color, '<span class="ring"></span>')).join('');
      $('bh-moves').querySelectorAll<HTMLElement>('.ab').forEach((el) => {
        const i = Number(el.dataset.i);
        el.onpointerdown = (ev) => { ev.preventDefault(); ev.stopPropagation(); this.accion(i); };
        el.onpointerenter = (ev) => {
          if (ev.pointerType !== 'mouse') return;
          if (i >= 1 && i <= 4) this.vistaPrevia = i;
          this.mostrarTip(el, i, e.movimientos[i - 1], u.esp);
        };
        el.onpointerleave = () => { if (this.vistaPrevia === i) this.vistaPrevia = null; el.querySelector('.tip')?.remove(); };
      });
      this.cdsPrev = [];
    }
    $('bh-moves').querySelectorAll<HTMLElement>('.ab').forEach((el) => {
      const i = Number(el.dataset.i);
      const o = el.querySelector<HTMLElement>('.cdo')!;
      if (i === 6 || i === 7) {
        const p = Math.min(100, (eq.carga / CARGA_MAX) * 100);
        el.classList.toggle('doble', eq.carga >= CARGA_MAX * 2);
        el.style.setProperty('--p', `${p}%`);
        const lleno = p >= 100;
        if (lleno && this.cargaPrev < CARGA_MAX) this.destello(el);
        el.classList.toggle('full', lleno);
        o.textContent = lleno ? '' : `${Math.floor(p)}%`;
        o.style.fontSize = '13px';
        return;
      }
      const cd = s.cds[i] ?? 0;
      const total = i === 0 ? 0.55 : i === 5 ? 1.6 : (MOVIMIENTOS[e.movimientos[i - 1]]?.enfriamiento ?? 1);
      o.style.setProperty('--p', `${Math.min(100, (cd / total) * 100)}%`);
      o.textContent = cd > 0.3 && i !== 0 ? String(Math.ceil(cd)) : '';
      el.classList.toggle('cool', cd > 0.05 && i !== 0);
      if (i !== 0 && (this.cdsPrev[i] ?? 0) > 0.05 && cd <= 0.05) this.destello(el);
    });
    this.cdsPrev = [...s.cds];
    this.cargaPrev = eq.carga;
    if (!eq.combo && this.comboN) { this.comboN = 0; $('bh-combo').classList.remove('on'); }
  }

  /** Solo reescribe la tarjeta si cambió (así las barras animan suave). */
  private pintarTarjeta(el: HTMLElement, html: string) {
    if (el.dataset.h === html) return;
    const nueva = document.createElement('div');
    nueva.innerHTML = html;
    const vieja = el.querySelector('.hpbar');
    if (vieja && el.dataset.esp === html.slice(0, 200)) {
      // misma estructura: solo actualiza anchos para que las transiciones funcionen
      const nb = nueva.querySelector('.hpbar')!;
      vieja.querySelector<HTMLElement>('.fill')!.className = nb.querySelector<HTMLElement>('.fill')!.className;
      vieja.querySelector<HTMLElement>('.fill')!.style.width = nb.querySelector<HTMLElement>('.fill')!.style.width;
      vieja.querySelector<HTMLElement>('.lag')!.style.width = nb.querySelector<HTMLElement>('.lag')!.style.width;
      vieja.querySelector('.shield')?.remove();
      const sh = nb.querySelector('.shield');
      if (sh) vieja.appendChild(sh);
      el.querySelector('.bh-mon')!.replaceWith(nueva.querySelector('.bh-mon')!);
      el.querySelector('.team-dots')!.replaceWith(nueva.querySelector('.team-dots')!);
    } else {
      el.innerHTML = html;
    }
    el.dataset.h = html;
    el.dataset.esp = html.slice(0, 200);
  }

  private destello(el: HTMLElement) {
    el.classList.remove('ready-flash'); void el.offsetWidth; el.classList.add('ready-flash');
  }

  /** Ficha del botón bajo el ratón: nombre, descripción y datos. */
  private mostrarTip(el: HTMLElement, i: number, movId: string | undefined, esp: string) {
    el.querySelector('.tip')?.remove();
    let html = '';
    if (i >= 1 && i <= 4 && movId) {
      const m = MOVIMIENTOS[movId];
      html = `<b>${esc(nombreMov(movId))}</b>${esc(descMov(movId))}<div class="meta"><span class="el" style="--c:${ELEMENTOS[m.elemento].color}">${icono(m.elemento)}${nombreElemento(m.elemento)}</span><span class="el" style="--c:#8a7cff">${icono('reloj')}${m.enfriamiento}s</span></div>`;
    } else if (i === 6 || i === 7) {
      html = `<b>${esc(nombreEspecial(esp, i - 6))}</b>${esc(descEspecial(esp, i - 6))}<div class="meta"><span class="el" style="--c:#ffc940">${icono('especial')}${t('hud.special')}</span></div>`;
    } else return;
    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.innerHTML = html;
    el.appendChild(tip);
  }

  cerrar() {
    $('bh-emotes').classList.add('hidden');
    document.querySelectorAll('.emote-burbuja').forEach((x) => x.remove());
    $('battle-hud').classList.add('hidden');
    this.hudEsp = '';
  }
}
