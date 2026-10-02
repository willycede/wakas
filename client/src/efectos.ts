// Efectos visuales de los ataques: texturas en pixel art generadas al inicio y un efecto
// propio para cada tipo de movimiento y elemento (disparos, rayos, zonas, áreas, golpes).

import Phaser from 'phaser';
import { ELEMENTOS, MOVIMIENTOS, type Elemento } from '../../shared/src';

const col = (hex: string) => parseInt(hex.slice(1), 16);
export const colorEl = (el: string) => col(ELEMENTOS[el as Elemento]?.color ?? '#ffffff');

/** Colores secundarios por elemento (núcleo claro y borde oscuro). */
const PALETA: Record<string, [number, number, number]> = {
  fuego: [0xfff2a0, 0xff8a2a, 0xc0301a],
  agua: [0xdff6ff, 0x4aa8ff, 0x1a4aa0],
  planta: [0xe0ffb0, 0x5fd35f, 0x1e6a2a],
  electrico: [0xffffff, 0xffe04a, 0xc08a10],
  roca: [0xe8d8b8, 0xb08a5a, 0x5a4030],
  viento: [0xffffff, 0xbfefff, 0x6ab0d0],
  sombra: [0xe0c0ff, 0x9a5aff, 0x30104a],
  hielo: [0xffffff, 0xa8e4ff, 0x3a7ac8],
  luz: [0xffffff, 0xfff0a0, 0xffa83a],
};
export const pal = (el: string) => PALETA[el] ?? [0xffffff, 0xdddddd, 0x888888];

/** Texturas pequeñas en pixel art (se crean una sola vez). */
export function crearTexturas(scene: Phaser.Scene) {
  const t = scene.textures;
  const hacer = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (t.exists(key)) return;
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  hacer('px', 4, 4, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 4, 4));
  hacer('chispa', 8, 8, (g) => { g.fillStyle(0xffffff).fillRect(3, 0, 2, 8).fillRect(0, 3, 8, 2); });
  hacer('bola', 16, 16, (g) => { g.fillStyle(0xffffff, 0.35).fillCircle(8, 8, 8); g.fillStyle(0xffffff, 0.7).fillCircle(8, 8, 5); g.fillStyle(0xffffff).fillCircle(8, 8, 3); });
  hacer('humo', 24, 24, (g) => { g.fillStyle(0xffffff, 0.25).fillCircle(12, 12, 12); g.fillStyle(0xffffff, 0.35).fillCircle(11, 11, 8); g.fillStyle(0xffffff, 0.5).fillCircle(10, 10, 4); });
  hacer('hoja', 12, 8, (g) => { g.fillStyle(0x2a7a2a).fillEllipse(6, 4, 12, 7); g.fillStyle(0x7ad85a).fillEllipse(6, 3, 9, 4); g.fillStyle(0xd0ff9a).fillRect(2, 3, 8, 1); });
  hacer('roca', 14, 12, (g) => {
    g.fillStyle(0x3a2a24).fillPoints([{ x: 2, y: 4 }, { x: 6, y: 0 }, { x: 12, y: 2 }, { x: 14, y: 8 }, { x: 9, y: 12 }, { x: 2, y: 10 }] as any, true);
    g.fillStyle(0x8a7a6a).fillPoints([{ x: 3, y: 4 }, { x: 6, y: 1 }, { x: 11, y: 3 }, { x: 12, y: 8 }, { x: 8, y: 11 }, { x: 3, y: 9 }] as any, true);
    g.fillStyle(0xc0b0a0).fillRect(5, 3, 4, 2);
  });
  hacer('burbuja', 20, 20, (g) => { g.fillStyle(0x4aa8ff, 0.45).fillCircle(10, 10, 9); g.lineStyle(2, 0xdff6ff, 1).strokeCircle(10, 10, 9); g.fillStyle(0xffffff).fillRect(5, 5, 3, 3); });
  hacer('media_luna', 40, 40, (g) => {
    // corte en arco (garra / cuchilla de viento), apunta a la derecha
    for (let i = 0; i < 3; i++) {
      g.lineStyle(5 - i * 1.5, 0xffffff, 1 - i * 0.25);
      g.beginPath();
      g.arc(10, 20, 18 - i * 3, -1.2, 1.2, false);
      g.strokePath();
    }
  });
  hacer('runa', 64, 64, (g) => {
    g.lineStyle(3, 0xffffff, 1).strokeCircle(32, 32, 28).strokeCircle(32, 32, 20);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillStyle(0xffffff).fillRect(32 + Math.cos(a) * 24 - 2, 32 + Math.sin(a) * 24 - 2, 4, 4);
    }
    g.lineStyle(2, 0xffffff, 1).strokeTriangle(32, 14, 48, 42, 16, 42);
  });
  hacer('cristal', 12, 20, (g) => {
    g.fillStyle(0x3a7ac8).fillPoints([{ x: 6, y: 0 }, { x: 12, y: 10 }, { x: 6, y: 20 }, { x: 0, y: 10 }] as any, true);
    g.fillStyle(0xa8e4ff).fillPoints([{ x: 6, y: 2 }, { x: 10, y: 10 }, { x: 6, y: 18 }, { x: 2, y: 10 }] as any, true);
    g.fillStyle(0xffffff).fillRect(5, 4, 2, 8);
  });
  hacer('destello', 24, 24, (g) => {
    g.fillStyle(0xffffff, 0.4).fillCircle(12, 12, 7);
    g.fillStyle(0xffffff).fillPoints([{ x: 12, y: 0 }, { x: 14, y: 10 }, { x: 24, y: 12 }, { x: 14, y: 14 }, { x: 12, y: 24 }, { x: 10, y: 14 }, { x: 0, y: 12 }, { x: 10, y: 10 }] as any, true);
  });
  hacer('gota', 4, 12, (g) => { g.fillStyle(0xffffff, 0.8).fillRect(1, 0, 2, 12); });
  hacer('anillo', 64, 64, (g) => { g.lineStyle(6, 0xffffff, 1).strokeCircle(32, 32, 28); });
  hacer('grieta', 64, 64, (g) => {
    g.lineStyle(3, 0xffffff, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      let x = 32, y = 32;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 1; k <= 3; k++) { x = 32 + Math.cos(a + (k % 2 ? 0.25 : -0.2)) * k * 9; y = 32 + Math.sin(a + (k % 2 ? 0.25 : -0.2)) * k * 9; g.lineTo(x, y); }
      g.strokePath();
    }
  });
}

type Escena = Phaser.Scene;

/** Lluvia de partículas de un color (estallido). */
export function estallido(s: Escena, x: number, y: number, el: string, n = 10, fuerza = 1, prof = 3000) {
  const [c0, c1, c2] = pal(el);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = (20 + Math.random() * 40) * fuerza;
    const p = s.add.image(x, y, Math.random() < 0.4 ? 'chispa' : 'px').setTint([c0, c1, c2][i % 3]).setDepth(prof).setScale(1 + Math.random());
    s.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 10 * fuerza, alpha: 0, angle: 180, duration: 300 + Math.random() * 250, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
  }
}

function anillo(s: Escena, x: number, y: number, r: number, color: number, dur = 300, grosor = 1) {
  const a = s.add.image(x, y, 'anillo').setTint(color).setDepth(1500).setScale(0.1, 0.05).setAlpha(0.9);
  s.tweens.add({ targets: a, scaleX: (r / 28) * grosor, scaleY: (r / 28) * 0.55 * grosor, alpha: 0, duration: dur, ease: 'Cubic.easeOut', onComplete: () => a.destroy() });
}

function humo(s: Escena, x: number, y: number, color: number, n = 6, r = 30, prof = 1400) {
  for (let i = 0; i < n; i++) {
    const p = s.add.image(x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r * 0.5, 'humo').setTint(color).setDepth(prof).setScale(0.8 + Math.random()).setAlpha(0.7);
    s.tweens.add({ targets: p, y: p.y - 20 - Math.random() * 20, scale: p.scale * 1.8, alpha: 0, duration: 500 + Math.random() * 400, onComplete: () => p.destroy() });
  }
}

// ------------------------------------------------------------------ proyectiles
export interface VistaProyectil { obj: Phaser.GameObjects.Image; estela: Phaser.GameObjects.Particles.ParticleEmitter | null; m: string; el: string }

export function crearProyectil(s: Escena, x: number, y: number, el: string, m: string, r: number): VistaProyectil {
  const [c0, c1, c2] = pal(el);
  let tex = 'bola';
  if (el === 'planta') tex = 'hoja';
  if (el === 'roca') tex = 'roca';
  if (el === 'agua') tex = 'burbuja';
  if (el === 'viento') tex = 'media_luna';
  if (el === 'hielo') tex = 'cristal';
  if (el === 'luz') tex = 'destello';
  if (m === 'avalancha_andina') tex = 'roca';
  if (m === 'alas_de_tormenta') tex = 'media_luna';
  const obj = s.add.image(x, y, tex).setDepth(2000);
  const base = m === 'basico' ? 0.75 : 1;
  if (tex === 'bola') obj.setTint(c1).setScale((r / 7) * base);
  else obj.setScale((r / 8) * base);
  if (tex === 'media_luna') obj.setTint(el === 'sombra' ? c1 : c0).setScale((r / 12) * base);
  if (tex === 'destello') obj.setBlendMode('ADD').setTint(c1).setScale((r / 9) * base);
  if (m === 'avalancha_andina') obj.setTint(0xeef6ff).setScale(r / 6);
  if (el === 'sombra') obj.setTint(c2);
  // estela de partículas según el elemento
  const conf: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
    lifespan: 260, speed: { min: 5, max: 30 }, scale: { start: 1.6, end: 0 }, alpha: { start: 0.9, end: 0 },
    frequency: 25, tint: [c0, c1, c2], blendMode: el === 'sombra' ? 'NORMAL' : 'ADD',
  };
  if (el === 'fuego') Object.assign(conf, { lifespan: 320, speedY: { min: -40, max: -10 }, frequency: 18 });
  if (el === 'electrico') Object.assign(conf, { lifespan: 120, speed: { min: 40, max: 90 }, frequency: 20 });
  if (el === 'sombra') Object.assign(conf, { lifespan: 380, scale: { start: 2, end: 0.2 } });
  const estela = s.add.particles(0, 0, el === 'sombra' || el === 'fuego' ? 'humo' : 'px', el === 'sombra' || el === 'fuego' ? { ...conf, scale: { start: 0.5, end: 0 } } : conf);
  estela.setDepth(1999);
  estela.startFollow(obj);
  return { obj, estela, m, el };
}

export function moverProyectil(v: VistaProyectil, x: number, y: number, vx: number, vy: number, t: number) {
  v.obj.setPosition(x, y);
  const ang = Math.atan2(vy, vx);
  if (v.el === 'planta' || v.el === 'roca') v.obj.setRotation(t / 60);
  else if (v.el === 'viento' || v.m === 'alas_de_tormenta') v.obj.setRotation(ang);
  else if (v.el === 'hielo') v.obj.setRotation(ang + Math.PI / 2);
  else if (v.el === 'luz') v.obj.setRotation(t / 90).setAlpha(0.8 + Math.sin(t / 30) * 0.2);
  else if (v.el === 'agua') v.obj.setScale(v.obj.scaleX, v.obj.scaleX * (1 + Math.sin(t / 60) * 0.12));
  else if (v.el === 'electrico') v.obj.setAlpha(0.7 + Math.random() * 0.3).setRotation(Math.random() * 6);
}

export function borrarProyectil(s: Escena, v: VistaProyectil) {
  v.estela?.stopFollow();
  v.estela?.stop();
  s.time.delayedCall(400, () => v.estela?.destroy());
  v.obj.destroy();
}

// ------------------------------------------------------------------ golpe básico
export function basico(s: Escena, x: number, y: number, ang: number, paso: number, el: string, cuerpo: boolean) {
  const [c0, c1] = pal(el);
  if (cuerpo) {
    // zarpazo en arco delante del Primal; el tercero es un corte doble más grande
    const d = 44;
    const cortes = paso === 3 ? 2 : 1;
    for (let k = 0; k < cortes; k++) {
      s.time.delayedCall(k * 70, () => {
        const m = s.add.image(x + Math.cos(ang) * d, y - 14 + Math.sin(ang) * d * 0.7, 'media_luna').setDepth(y + 40)
          .setRotation(ang + (paso === 2 ? Math.PI : 0) * 0 + (k ? 0.5 : -0.2)).setTint(k ? c1 : c0).setBlendMode('ADD');
        const sc = paso === 3 ? 2.1 : 1.6;
        m.setScale(sc * 0.6, sc * (paso === 2 ? -1 : 1));
        s.tweens.add({ targets: m, scaleX: sc * 1.15, alpha: 0, x: m.x + Math.cos(ang) * 10, duration: 200, ease: 'Cubic.easeOut', onComplete: () => m.destroy() });
      });
    }
  } else {
    // destello en la boca del disparo
    const fx = s.add.image(x + Math.cos(ang) * 22, y - 14 + Math.sin(ang) * 22, 'bola').setTint(c0).setDepth(y + 40).setBlendMode('ADD').setScale(paso === 3 ? 2.2 : 1.5);
    s.tweens.add({ targets: fx, scale: 0.2, alpha: 0, duration: 140, onComplete: () => fx.destroy() });
  }
}

// ------------------------------------------------------------------ estallidos (zonas, rayos, áreas)
export function estalla(s: Escena, f: { id: string; forma: 'circulo' | 'linea'; x: number; y: number; r: number; ang?: number; largo?: number; el: string }) {
  const [c0, c1, c2] = pal(f.el);
  const cam = s.cameras.main;
  if (f.forma === 'linea') return rayo(s, f.x, f.y, f.ang ?? 0, f.largo ?? 200, f.r, f.el, f.id);
  const m = MOVIMIENTOS[f.id];
  const esArea = m?.tipo === 'area';
  switch (f.el) {
    case 'fuego': {
      // columna de fuego: llamas que suben, suelo quemado y onda
      anillo(s, f.x, f.y, f.r, c1, 360, 1.1);
      const quemado = s.add.ellipse(f.x, f.y, f.r * 1.8, f.r * 0.8, 0x2a1008, 0.5).setDepth(2);
      s.tweens.add({ targets: quemado, alpha: 0, delay: 600, duration: 900, onComplete: () => quemado.destroy() });
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * f.r * 0.8;
        const p = s.add.image(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.5, 'humo').setTint([c0, c1, c2][i % 3]).setDepth(f.y + 50).setBlendMode('ADD').setScale(0.6 + Math.random());
        s.tweens.add({ targets: p, y: p.y - 50 - Math.random() * 70, scale: 0.1, alpha: 0, duration: 420 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
      }
      humo(s, f.x, f.y - 10, 0x3a3030, 6, f.r);
      cam.shake(220, 0.007);
      break;
    }
    case 'electrico': {
      // un relámpago cae del cielo
      const g = s.add.graphics().setDepth(f.y + 60).setBlendMode('ADD');
      const dibujar = () => {
        g.clear();
        let x = f.x + (Math.random() - 0.5) * 30, y = f.y - 420;
        const pts: [number, number][] = [[x, y]];
        while (y < f.y) { y += 30 + Math.random() * 25; x += (Math.random() - 0.5) * 40; pts.push([x, Math.min(y, f.y)]); }
        pts[pts.length - 1] = [f.x, f.y];
        g.lineStyle(10, c1, 0.5);
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.forEach(([a, b]) => g.lineTo(a, b)); g.strokePath();
        g.lineStyle(3, 0xffffff, 1);
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.forEach(([a, b]) => g.lineTo(a, b)); g.strokePath();
      };
      dibujar();
      s.time.delayedCall(60, dibujar);
      s.time.delayedCall(120, dibujar);
      s.tweens.add({ targets: g, alpha: 0, delay: 140, duration: 180, onComplete: () => g.destroy() });
      anillo(s, f.x, f.y, f.r, c1, 300, 1.2);
      estallido(s, f.x, f.y, f.el, 18, 1.4);
      cam.flash(90, 255, 250, 200);
      cam.shake(180, 0.006);
      break;
    }
    case 'roca': {
      if (esArea) {
        // terremoto: grietas, polvo y temblor fuerte
        const gr = s.add.image(f.x, f.y, 'grieta').setTint(0x3a2a20).setDepth(3).setScale(f.r / 30, f.r / 55);
        s.tweens.add({ targets: gr, alpha: 0, delay: 500, duration: 700, onComplete: () => gr.destroy() });
        humo(s, f.x, f.y, 0xc8b090, 12, f.r * 1.4);
        anillo(s, f.x, f.y, f.r, c1, 420, 1);
        cam.shake(380, 0.012);
      } else {
        // avalancha: rocas que caen del cielo
        for (let i = 0; i < 7; i++) {
          const a = Math.random() * Math.PI * 2, d = Math.random() * f.r * 0.7;
          const tx = f.x + Math.cos(a) * d, ty = f.y + Math.sin(a) * d * 0.5;
          const r = s.add.image(tx, ty - 260 - i * 30, 'roca').setDepth(ty + 50).setScale(2 + Math.random() * 1.5);
          s.tweens.add({
            targets: r, y: ty, angle: 360, duration: 220 + i * 25, ease: 'Quad.easeIn',
            onComplete: () => { humo(s, tx, ty, 0xc8b090, 2, 20); s.tweens.add({ targets: r, alpha: 0, delay: 300, duration: 300, onComplete: () => r.destroy() }); },
          });
        }
        s.time.delayedCall(260, () => cam.shake(260, 0.01));
      }
      break;
    }
    case 'agua': {
      // ola expansiva con gotas
      anillo(s, f.x, f.y, f.r, c1, 420, 1);
      anillo(s, f.x, f.y, f.r * 0.7, c0, 360, 1);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const p = s.add.image(f.x + Math.cos(a) * 10, f.y + Math.sin(a) * 5, 'burbuja').setDepth(f.y + 40).setScale(0.5 + Math.random() * 0.5);
        s.tweens.add({ targets: p, x: f.x + Math.cos(a) * f.r, y: f.y + Math.sin(a) * f.r * 0.55 - 10, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
      }
      cam.shake(150, 0.004);
      break;
    }
    case 'planta': {
      // nube de esporas (y hojas)
      humo(s, f.x, f.y - 8, 0xa8e070, 14, f.r * 1.3, f.y + 30);
      for (let i = 0; i < 12; i++) {
        const p = s.add.image(f.x + (Math.random() - 0.5) * f.r * 1.5, f.y + (Math.random() - 0.5) * f.r * 0.7, 'hoja').setDepth(f.y + 40).setScale(1.5);
        s.tweens.add({ targets: p, y: p.y - 40, angle: 360 * (Math.random() < 0.5 ? 1 : -1), alpha: 0, duration: 700 + Math.random() * 300, onComplete: () => p.destroy() });
      }
      break;
    }
    case 'viento': {
      // tornado: partículas girando en espiral hacia arriba (o ráfaga si es de área)
      const n = 26;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 4;
        const p = s.add.image(f.x, f.y, 'px').setTint(i % 2 ? c0 : c1).setDepth(f.y + 50).setScale(2);
        const o = { t: 0 };
        s.tweens.add({
          targets: o, t: 1, duration: 600, delay: i * 12,
          onUpdate: () => {
            const a = a0 + o.t * 9;
            const rr = esArea ? f.r * o.t : f.r * (0.9 - o.t * 0.5);
            p.setPosition(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr * 0.4 - (esArea ? 0 : o.t * 90));
            p.setAlpha(1 - o.t);
          },
          onComplete: () => p.destroy(),
        });
      }
      anillo(s, f.x, f.y, f.r, c1, 380, 1);
      break;
    }
    case 'hielo': {
      // picos de hielo que brotan del suelo, escarcha y destellos fríos
      const n = Math.max(5, Math.round(f.r / 9));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * f.r * 0.75;
        const px = f.x + Math.cos(a) * d, py = f.y + Math.sin(a) * d * 0.5;
        const c = s.add.image(px, py, 'cristal').setOrigin(0.5, 1).setDepth(py + 30).setScale(1.5 + Math.random(), 0.1).setAngle((Math.random() - 0.5) * 30);
        s.tweens.add({ targets: c, scaleY: 2.4 + Math.random() * 1.5, duration: 110, delay: i * 12, ease: 'Back.easeOut',
          onComplete: () => s.tweens.add({ targets: c, alpha: 0, delay: 380, duration: 300, onComplete: () => c.destroy() }) });
      }
      const esc = s.add.ellipse(f.x, f.y, f.r * 1.9, f.r * 0.9, 0xd8f4ff, 0.45).setDepth(2);
      s.tweens.add({ targets: esc, alpha: 0, delay: 700, duration: 800, onComplete: () => esc.destroy() });
      anillo(s, f.x, f.y, f.r, c1, 320, 1);
      estallido(s, f.x, f.y - 10, f.el, 12, 1.2);
      cam.shake(160, 0.005);
      break;
    }
    case 'luz': {
      // columna de luz que cae del cielo, anillo dorado y destellos
      const ancho = Math.min(f.r, 90);
      const col = s.add.rectangle(f.x, f.y - 300, ancho * 1.2, 600, c1, 0.4).setOrigin(0.5, 0.5).setDepth(f.y + 55).setBlendMode('ADD');
      const nucleo = s.add.rectangle(f.x, f.y - 300, ancho * 0.35, 600, 0xffffff, 0.7).setDepth(f.y + 56).setBlendMode('ADD');
      s.tweens.add({ targets: [col, nucleo], scaleX: 0, alpha: 0, duration: 420, ease: 'Cubic.easeIn', onComplete: () => { col.destroy(); nucleo.destroy(); } });
      anillo(s, f.x, f.y, f.r, c2, 380, 1.1);
      anillo(s, f.x, f.y, f.r * 0.6, c0, 300, 1);
      for (let i = 0; i < 12; i++) {
        const p = s.add.image(f.x + (Math.random() - 0.5) * f.r * 1.4, f.y + (Math.random() - 0.5) * f.r * 0.6, 'destello').setTint(i % 2 ? c1 : 0xffffff).setDepth(f.y + 57).setBlendMode('ADD').setScale(0.4 + Math.random() * 0.5);
        s.tweens.add({ targets: p, y: p.y - 40 - Math.random() * 40, angle: 90, alpha: 0, duration: 600 + Math.random() * 300, onComplete: () => p.destroy() });
      }
      if (f.r < 120) cam.flash(60, 120, 110, 80);
      cam.shake(150, 0.005);
      break;
    }
    case 'sombra': {
      // círculo de runas malditas y espíritus que suben
      const r = s.add.image(f.x, f.y, 'runa').setTint(c1).setDepth(3).setScale(f.r / 30, f.r / 55).setAlpha(0.9).setBlendMode('ADD');
      s.tweens.add({ targets: r, angle: 90, alpha: 0, duration: 900, onComplete: () => r.destroy() });
      for (let i = 0; i < 10; i++) {
        const p = s.add.image(f.x + (Math.random() - 0.5) * f.r * 1.4, f.y + (Math.random() - 0.5) * f.r * 0.6, 'humo').setTint(c2).setDepth(f.y + 40).setScale(0.8);
        s.tweens.add({ targets: p, y: p.y - 60, alpha: 0, scaleX: 0.3, duration: 700 + Math.random() * 300, onComplete: () => p.destroy() });
      }
      break;
    }
  }
}

/** Rayos en línea: llamarada, hidrochorro, látigo cepa. */
function rayo(s: Escena, x: number, y: number, ang: number, largo: number, r: number, el: string, id: string) {
  const [c0, c1, c2] = pal(el);
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const g = s.add.graphics().setDepth(y + 60);
  const o = { t: 0 };
  const curva = el === 'planta';
  s.tweens.add({
    targets: o, t: 1, duration: 320,
    onUpdate: () => {
      g.clear();
      const ext = Math.min(1, o.t * 3); // se extiende rápido y luego se desvanece
      const fade = o.t < 0.4 ? 1 : 1 - (o.t - 0.4) / 0.6;
      const L = largo * ext;
      const w = r * (curva ? 0.5 : 1) * (0.6 + 0.4 * fade);
      const pts = (k: number) => {
        const out: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= 12; i++) {
          const d = (L * i) / 12;
          const off = curva ? Math.sin(i / 2 + o.t * 20) * 8 * (i / 12) : 0;
          out.push(new Phaser.Math.Vector2(x + ux * d - uy * off, y - 14 + uy * d + ux * off));
        }
        void k;
        return out;
      };
      const line = pts(0);
      g.lineStyle(w * 2.2, c2, 0.5 * fade).strokePoints(line);
      g.lineStyle(w * 1.4, c1, 0.85 * fade).strokePoints(line);
      g.lineStyle(w * 0.5, c0, fade).strokePoints(line);
    },
    onComplete: () => g.destroy(),
  });
  // partículas a lo largo del rayo
  for (let i = 0; i < 16; i++) {
    const d = Math.random() * largo;
    const p = s.add.image(x + ux * d, y - 14 + uy * d, el === 'fuego' ? 'humo' : el === 'agua' ? 'burbuja' : el === 'planta' ? 'hoja' : el === 'hielo' ? 'cristal' : el === 'luz' ? 'destello' : 'px').setDepth(y + 61)
      .setTint(el === 'planta' ? 0xffffff : [c0, c1][i % 2]).setScale(el === 'fuego' ? 0.6 : 1.2).setBlendMode(el === 'fuego' ? 'ADD' : 'NORMAL');
    s.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 30 - uy * 10, y: p.y - 20 - Math.random() * 20, alpha: 0, duration: 400 + Math.random() * 200, delay: (d / largo) * 80, onComplete: () => p.destroy() });
  }
  s.cameras.main.shake(140, 0.005);
  void id;
}

// ------------------------------------------------------------------ apoyo (escudo, curación, mejora)
export function apoyo(s: Escena, x: number, y: number, tipo: string, el: string) {
  const [c0, c1] = pal(el);
  if (tipo === 'escudo') {
    const b = s.add.ellipse(x, y - 22, 70, 76, c1, 0.25).setStrokeStyle(3, c0, 0.9).setDepth(y + 45);
    b.setScale(0.2);
    s.tweens.add({ targets: b, scale: 1, duration: 200, ease: 'Back.easeOut', onComplete: () => s.tweens.add({ targets: b, alpha: 0, delay: 500, duration: 400, onComplete: () => b.destroy() }) });
    estallido(s, x, y - 22, el, 8, 0.8);
  } else if (tipo === 'curar') {
    for (let i = 0; i < 14; i++) {
      const p = s.add.image(x + (Math.random() - 0.5) * 50, y - Math.random() * 20, 'chispa').setTint(i % 2 ? 0x7af08a : 0xdfffd0).setDepth(y + 45).setScale(1.5);
      s.tweens.add({ targets: p, y: p.y - 50 - Math.random() * 30, alpha: 0, duration: 700 + Math.random() * 300, onComplete: () => p.destroy() });
    }
    anillo(s, x, y, 40, 0x7af08a, 500, 1);
  } else {
    // mejora: aura y flechas que suben
    anillo(s, x, y, 46, c1, 450, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = s.add.image(x + Math.cos(a) * 26, y + Math.sin(a) * 12, 'chispa').setTint(c0).setDepth(y + 45).setScale(2).setBlendMode('ADD');
      s.tweens.add({ targets: p, y: p.y - 60, alpha: 0, duration: 600, delay: i * 30, onComplete: () => p.destroy() });
    }
  }
}

/** Chispas de impacto en el Primal golpeado. */
export function impacto(s: Escena, x: number, y: number, el: string, fuerte: boolean) {
  const [c0, c1] = pal(el);
  const fl = s.add.image(x, y - 20, 'bola').setTint(0xffffff).setDepth(5000).setBlendMode('ADD').setScale(fuerte ? 3 : 2);
  s.tweens.add({ targets: fl, scale: 0.3, alpha: 0, duration: 140, onComplete: () => fl.destroy() });
  for (let i = 0; i < (fuerte ? 10 : 6); i++) {
    const a = Math.random() * Math.PI * 2;
    const p = s.add.image(x, y - 20, 'chispa').setTint(i % 2 ? c0 : c1).setDepth(5000).setScale(fuerte ? 1.8 : 1.3).setRotation(a);
    const d = (fuerte ? 40 : 26) + Math.random() * 14;
    s.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y - 20 + Math.sin(a) * d, alpha: 0, duration: 220, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
  }
}

// ------------------------------------------------------------------ campos en el suelo (técnicas especiales)
export interface VistaCampo { g: Phaser.GameObjects.Graphics; em: Phaser.GameObjects.Particles.ParticleEmitter | null; k: string; el: string; semilla: number }
type CampoDatos = { k: string; forma: 'circulo' | 'linea'; x: number; y: number; r: number; ang?: number; largo?: number; t: number; dur: number; el: string };

/** Zona de emisión del campo (círculo achatado o franja en línea). */
function zonaCampo(c: CampoDatos): Phaser.Types.GameObjects.Particles.EmitZoneData {
  if (c.forma === 'circulo') return { type: 'random', source: new Phaser.Geom.Ellipse(c.x, c.y, c.r * 2, c.r), quantity: 1 } as any;
  const ux = Math.cos(c.ang ?? 0), uy = Math.sin(c.ang ?? 0);
  return { type: 'random', source: new Phaser.Geom.Line(c.x, c.y, c.x + ux * (c.largo ?? 200), c.y + uy * (c.largo ?? 200)), quantity: 1 } as any;
}

export function crearCampo(s: Escena, c: CampoDatos): VistaCampo {
  const g = s.add.graphics().setDepth(2);
  const [c0, c1, c2] = pal(c.el);
  let em: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  const base = { emitZone: zonaCampo(c), blendMode: 'ADD' as const };
  const conf: Record<string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig> = {
    lava: { ...base, lifespan: 700, speedY: { min: -60, max: -20 }, speedX: { min: -8, max: 8 }, scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xfff2a0, 0xff8a2a, 0xc0301a], frequency: 40 },
    atraer: { ...base, lifespan: 500, speed: { min: 20, max: 60 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [c0, c1], frequency: 20 },
    remolino: { ...base, lifespan: 600, speed: { min: 10, max: 30 }, scale: { start: 0.6, end: 0.1 }, alpha: { start: 0.7, end: 0 }, tint: [0xdff6ff, 0x4aa8ff], frequency: 45, blendMode: 'NORMAL' },
    espinas: { ...base, lifespan: 900, speedY: { min: -30, max: -10 }, scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.7, end: 0 }, tint: [0xd8a0ff, 0x7ad85a], frequency: 60, blendMode: 'NORMAL' },
    huracan: { ...base, lifespan: 500, speed: { min: 30, max: 80 }, scale: { start: 1.6, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffffff, c1], frequency: 15 },
    torbellino: { ...base, lifespan: 500, speed: { min: 30, max: 80 }, scale: { start: 1.6, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xe0c0ff, 0x9a5aff], frequency: 15, blendMode: 'NORMAL' },
    hielo: { ...base, lifespan: 800, speedY: { min: -20, max: -5 }, scale: { start: 0.4, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xa8e4ff], frequency: 50 },
    lluvia: { ...base, lifespan: 350, speedY: { min: 380, max: 460 }, scale: 1.2, alpha: { start: 0.8, end: 0.2 }, tint: [0xdff6ff, 0x8fd0ff], frequency: 8, blendMode: 'NORMAL' },
  };
  const tex: Record<string, string> = { lava: 'humo', atraer: 'chispa', remolino: 'burbuja', espinas: 'humo', huracan: 'px', torbellino: 'px', hielo: 'destello', lluvia: 'gota' };
  if (conf[c.k]) {
    const cf = { ...conf[c.k] };
    if (c.k === 'lluvia' && c.forma === 'circulo') cf.emitZone = { type: 'random', source: new Phaser.Geom.Rectangle(c.x - c.r, c.y - c.r * 0.5 - 120, c.r * 2, c.r), quantity: 1 } as any;
    em = s.add.particles(0, 0, tex[c.k] ?? 'px', cf).setDepth(c.y + 30);
  }
  void c2;
  return { g, em, k: c.k, el: c.el, semilla: Math.random() * 100 };
}

/** Se redibuja cada cuadro: base del campo, borde animado y espiral si atrae. */
export function dibujarCampo(v: VistaCampo, c: CampoDatos, t: number) {
  const g = v.g.clear();
  const [c0, c1, c2] = pal(c.el);
  const vida = Math.max(0, Math.min(1, c.t / Math.min(0.5, c.dur))); // se desvanece al final
  const pulso = 0.85 + Math.sin(t / 180 + v.semilla) * 0.15;
  const colores: Record<string, [number, number, number]> = {
    lava: [0x3a0a04, 0xff5a1a, 0xffc040], remolino: [0x0a2a5a, 0x3a8aff, 0xdff6ff], espinas: [0x1a3a10, 0x7a3aaa, 0x9ad85a],
    huracan: [0x2a4a50, c1, 0xffffff], torbellino: [0x1a0a2a, 0x7a4aff, 0xe0c0ff], hielo: [0x9fd8ff, 0xd8f4ff, 0xffffff],
    lluvia: [0x10304a, 0x4aa8ff, 0xdff6ff], atraer: [0x3a0a04, c1, c0],
  };
  const [fondo, borde, brillo] = colores[v.k] ?? [c2, c1, c0];
  if (c.forma === 'circulo') {
    g.fillStyle(fondo, 0.35 * vida).fillEllipse(c.x, c.y, c.r * 2, c.r);
    g.fillStyle(borde, 0.22 * vida * pulso).fillEllipse(c.x, c.y, c.r * 1.6, c.r * 0.8);
    g.lineStyle(3, brillo, 0.7 * vida).strokeEllipse(c.x, c.y, c.r * 2, c.r);
    if (v.k === 'remolino' || v.k === 'huracan' || v.k === 'torbellino' || v.k === 'atraer') {
      // brazos en espiral girando hacia dentro
      for (let b = 0; b < 3; b++) {
        g.lineStyle(3, brillo, 0.55 * vida);
        g.beginPath();
        for (let i = 0; i <= 24; i++) {
          const k = i / 24;
          const a = b * (Math.PI * 2 / 3) + k * 4 - t / 220;
          const rr = c.r * (1 - k) * 0.95;
          const px = c.x + Math.cos(a) * rr, py = c.y + Math.sin(a) * rr * 0.5;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
    }
    if (v.k === 'espinas') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + v.semilla, d = c.r * (0.3 + ((i * 37) % 10) / 15);
        const px = c.x + Math.cos(a) * d, py = c.y + Math.sin(a) * d * 0.5;
        g.fillStyle(0x2a5a1a, vida).fillTriangle(px - 5, py, px + 5, py, px, py - 16 * pulso);
        g.fillStyle(0x9ad85a, vida).fillTriangle(px - 2, py, px + 2, py, px, py - 13 * pulso);
      }
    }
  } else {
    const ux = Math.cos(c.ang ?? 0), uy = Math.sin(c.ang ?? 0), px = -uy * c.r, py = ux * c.r, L = c.largo ?? 200;
    const pts = [new Phaser.Math.Vector2(c.x + px, c.y + py), new Phaser.Math.Vector2(c.x + ux * L + px, c.y + uy * L + py),
      new Phaser.Math.Vector2(c.x + ux * L - px, c.y + uy * L - py), new Phaser.Math.Vector2(c.x - px, c.y - py)];
    g.fillStyle(fondo, 0.4 * vida).fillPoints(pts, true);
    // vetas que corren a lo largo del río
    for (let i = 0; i < 5; i++) {
      const off = ((t / 6 + i * 70 + v.semilla * 10) % L);
      const w = (i % 2 ? 0.4 : -0.3) * c.r;
      g.lineStyle(4, i % 2 ? borde : brillo, 0.6 * vida * pulso);
      g.lineBetween(c.x + ux * off - uy * w, c.y + uy * off + ux * w, c.x + ux * Math.min(L, off + 50) - uy * w, c.y + uy * Math.min(L, off + 50) + ux * w);
    }
    g.lineStyle(2, brillo, 0.6 * vida).strokePoints(pts, true);
  }
  if (v.em) v.em.setAlpha(vida);
}

export function borrarCampo(s: Escena, v: VistaCampo) {
  v.g.destroy();
  if (v.em) { v.em.stop(); s.time.delayedCall(900, () => v.em?.destroy()); }
}
