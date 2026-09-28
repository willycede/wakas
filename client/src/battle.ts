// Escena de batalla: arena vista desde arriba en diagonal, Primales en pixel art,
// predicción del movimiento propio, interpolación del rival, avisos, proyectiles y efectos.

import Phaser from 'phaser';
import {
  ARENA, ELEMENTOS, ESPECIES, MOVIMIENTOS, RADIO_PRIMAL, TICK_MS, statsPrimal,
  type Fx, type InicioBatalla, type Snapshot, type UnidadSnap,
} from '../../shared/src';
import { spriteUrl } from './api';
import type { Conexion } from './net';

const INTERP = 100;
const ICONOS: Record<string, string> = { proyectil: '✴️', rafaga: '💥', embestida: '💨', area: '🌀', zona: '🎯', rayo: '⚡', escudo: '🛡️', curar: '💚', mejora: '⬆️' };
const col = (hex: string) => parseInt(hex.slice(1), 16);
const $ = (id: string) => document.getElementById(id)!;

interface Vista { spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse; anillo: Phaser.GameObjects.Ellipse; esp: string; x: number; y: number; fa: number }

export class BatallaScene extends Phaser.Scene {
  net!: Conexion;
  init0!: InicioBatalla;
  snaps: Snapshot[] = [];
  offset: number | null = null;
  vistas: [Vista | null, Vista | null] = [null, null];
  gAvisos!: Phaser.GameObjects.Graphics;
  proys = new Map<number, Phaser.GameObjects.Arc>();
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  joy = { x: 0, y: 0, activo: false };
  seq = 0;
  pred = { x: 0, y: 0 };
  ultimo: Snapshot | null = null;
  fin = false;
  apunta = { x: 0, y: 0 };
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
  }

  preload() {
    for (const id of Object.keys(ESPECIES)) if (!this.textures.exists('p_' + id)) this.load.image('p_' + id, spriteUrl(id));
  }

  create() {
    this.cameras.main.setBackgroundColor('#1b3a2a');
    this.dibujarArena();
    this.gAvisos = this.add.graphics().setDepth(1);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ONE,TWO,THREE,FOUR,Q,E') as any;
    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.apuntar(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.esTactil()) return;
      this.apuntar(p);
      this.accion(0);
    });
    this.keys.SPACE.on('down', () => this.accion(0));
    this.keys.ONE.on('down', () => this.accion(1));
    this.keys.TWO.on('down', () => this.accion(2));
    this.keys.THREE.on('down', () => this.accion(3));
    this.keys.FOUR.on('down', () => this.accion(4));
    this.keys.SHIFT.on('down', () => this.accion(5));
    this.keys.Q.on('down', () => this.cambiarRel(-1));
    this.keys.E.on('down', () => this.cambiarRel(1));
    this.scale.on('resize', this.ajustar, this);
    this.ajustar();
    this.net.on('snap', (s: Snapshot) => this.onSnap(s));
    this.net.on('fx', (list: Fx[]) => list.forEach((f) => this.onFx(f)));
    this.net.on('cuenta', (m: { ms: number }) => this.cuenta(m.ms));
    this.net.on('fin', (r) => { this.fin = true; this.time.delayedCall(900, () => this.onFin(r)); });
    this.armarHud();
    this.time.addEvent({ delay: TICK_MS, loop: true, callback: () => this.enviarEntrada() });
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

  private vista(l: 0 | 1, esp: string): Vista {
    const v = this.vistas[l];
    if (v && v.esp === esp) return v;
    v?.spr.destroy(); v?.sombra.destroy(); v?.anillo.destroy();
    const soy = l === this.init0.lado;
    const sombra = this.add.ellipse(0, 0, 44, 16, 0x000000, 0.3);
    const anillo = this.add.ellipse(0, 0, 50, 20).setStrokeStyle(3, soy ? 0x4aa8ff : 0xff5a6a, 0.9);
    const spr = this.add.image(0, 0, 'p_' + esp).setOrigin(0.5, 0.92);
    const base = ESPECIES[esp].etapa === 3 ? 1.6 : ESPECIES[esp].etapa === 2 ? 1.4 : 1.3;
    spr.setScale(base);
    const nv: Vista = { spr, sombra, anillo, esp, x: 0, y: 0, fa: 0 };
    this.vistas[l] = nv;
    return nv;
  }

  // ---------------------------------------------------------------- red
  private onSnap(s: Snapshot) {
    const sample = s.t - Date.now();
    if (this.offset === null || sample > this.offset + 200) this.offset = sample;
    else this.offset += (sample - this.offset) * 0.05;
    this.snaps.push(s);
    if (this.snaps.length > 20) this.snaps.shift();
    this.ultimo = s;
    const me = s.u[this.init0.lado];
    if (Math.hypot(me.x - this.pred.x, me.y - this.pred.y) > 40 || !this.vistas[this.init0.lado]) this.pred = { x: me.x, y: me.y };
    this.actualizarHud(s);
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
    if (this.joy.activo) { x = this.joy.x; y = this.joy.y; }
    const n = Math.hypot(x, y);
    return n > 1 ? { x: x / n, y: y / n } : { x, y };
  }

  private enviarEntrada() {
    if (this.fin) return;
    const d = this.dir();
    // en táctil apunta automáticamente al rival
    if (this.esTactil() && this.ultimo) {
      const r = this.ultimo.u[1 - this.init0.lado];
      this.apunta = { x: r.x, y: r.y };
    }
    this.net.send('in', { s: ++this.seq, x: Math.round(d.x * 100) / 100, y: Math.round(d.y * 100) / 100, ax: Math.round(this.apunta.x), ay: Math.round(this.apunta.y) });
    // predicción simple del propio movimiento
    const me = this.ultimo?.u[this.init0.lado];
    if (me && (d.x || d.y) && me.an !== 'caido') {
      const v = statsPrimal(ESPECIES[me.esp], me.nv).velocidad * (me.st & 4 ? 0.6 : 1) * (me.st & 2 ? 0 : 1);
      this.pred.x = Phaser.Math.Clamp(this.pred.x + d.x * v * TICK_MS / 1000, RADIO_PRIMAL, ARENA.w - RADIO_PRIMAL);
      this.pred.y = Phaser.Math.Clamp(this.pred.y + d.y * v * TICK_MS / 1000, RADIO_PRIMAL, ARENA.h - RADIO_PRIMAL);
    }
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

  // ---------------------------------------------------------------- dibujo por cuadro
  update() {
    for (const l of [0, 1] as const) {
      const s = l === this.init0.lado ? this.ultimo?.u[l] ?? null : this.interp(l);
      if (!s) continue;
      const v = this.vista(l, s.esp);
      let x = s.x, y = s.y;
      if (l === this.init0.lado) {
        this.pred.x += (s.x - this.pred.x) * 0.2;
        this.pred.y += (s.y - this.pred.y) * 0.2;
        x = this.pred.x; y = this.pred.y;
      }
      const mov = Math.hypot(x - v.x, y - v.y);
      v.x = x; v.y = y;
      const t = this.time.now;
      // animación: rebote al caminar, respiración en reposo, estirón al atacar
      let sx = 1, sy = 1, dy = 0;
      if (s.an === 'mover' || mov > 0.5) { dy = -Math.abs(Math.sin(t / 70)) * 5; sy = 1 + Math.sin(t / 70) * 0.04; }
      else { sy = 1 + Math.sin(t / 300) * 0.025; sx = 1 - Math.sin(t / 300) * 0.015; }
      if (s.an === 'basico' || s.an === 'mov') { sx = 1.12; sy = 0.92; }
      if (s.an === 'dash') { sx = 1.2; sy = 0.85; }
      if (s.an === 'golpe') { sx = 0.9; sy = 1.08; }
      const base = ESPECIES[s.esp].etapa === 3 ? 1.6 : ESPECIES[s.esp].etapa === 2 ? 1.4 : 1.3;
      const mira = Math.cos(s.fa) < 0 ? -1 : 1; // los sprites miran a la derecha
      v.spr.setPosition(x, y + dy).setScale(base * sx * mira, base * sy).setDepth(y + 10);
      v.spr.setAlpha(s.st & 16 ? 0.55 + Math.sin(t / 40) * 0.2 : s.an === 'caido' ? 0.3 : 1);
      if (s.an === 'golpe') v.spr.setTintFill(0xffffff); else if (s.st & 1) v.spr.setTint(0xffa080); else if (s.st & 8) v.spr.setTint(0xd090ff); else if (s.st & 2) v.spr.setTint(0xfff080); else v.spr.clearTint();
      v.sombra.setPosition(x, y + 2).setDepth(y - 1);
      v.anillo.setPosition(x, y + 2).setDepth(y - 1);
      if (s.sh > 0) v.anillo.setStrokeStyle(4, 0xa0dcff, 1); else v.anillo.setStrokeStyle(3, l === this.init0.lado ? 0x4aa8ff : 0xff5a6a, 0.9);
    }
    this.dibujarAvisos();
    this.dibujarProyectiles();
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
      $('bh-moves').querySelectorAll<HTMLElement>('.mv').forEach((el) => (el.onpointerdown = (ev) => { ev.preventDefault(); this.accion(Number(el.dataset.i)); }));
    }
    const e = ESPECIES[u.esp];
    $('bh-moves').querySelectorAll<HTMLElement>('.mv').forEach((el) => {
      const i = Number(el.dataset.i);
      const cd = s.cds[i] ?? 0;
      const total = i === 0 ? 0.55 : i === 5 ? 1.6 : MOVIMIENTOS[e.movimientos[i - 1]]?.enfriamiento ?? 1;
      const o = el.querySelector<HTMLElement>('.cdo')!;
      o.style.setProperty('--p', `${Math.min(100, (cd / total) * 100)}%`);
      o.textContent = cd > 0.3 && i !== 0 ? String(Math.ceil(cd)) : '';
    });
  }

  cerrar() {
    $('battle-hud').classList.add('hidden');
    this.hudEsp = '';
  }
}
