// Estadios de los gimnasios del Modo Historia: cada uno con el paisaje de su lugar, su terreno y
// partículas de ambiente (brasas, espuma, hojas, chispas, polvo, viento, sombras, nieve, oro).

import Phaser from 'phaser';
import { ARENA } from '../../shared/src';

const W = ARENA.w, H = ARENA.h;
const PISTA = 34, GRADA = 210, FUERA = 1400;
const TOP = -GRADA - PISTA; // borde de arriba de las gradas
type G = Phaser.GameObjects.Graphics;
type R = Phaser.Math.RandomDataGenerator;

export type Ambiente = 'brasas' | 'espuma' | 'hojas' | 'chispas' | 'polvo' | 'viento' | 'sombra' | 'nieve' | 'oro' | 'luna';
export type ObsGim = 'roca' | 'tronco' | 'lava' | 'fuente' | 'hielo' | 'pilar' | 'boya' | 'bobina' | 'cristal';

export interface TemaGim {
  linea: number; pista: number; muro: number; gradas: [number, number]; publico: number[]; fuera: number;
  noche?: boolean; oscuro?: number; // oscurecer la escena (0-1)
  obs: ObsGim; borde: [number, number]; suelo: number; color: number; // color del elemento (anillo central)
  amb: Ambiente[]; rayos?: boolean;
  fondo: (g: G) => void;
  terreno: (g: G, r: R) => void;
}

// ------------------------------------------------------------------ piezas de paisaje
function cielo(g: G, arriba: number, abajo: number, hasta = TOP - 40) {
  const pasos = 24;
  for (let i = 0; i < pasos; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.IntegerToColor(arriba), Phaser.Display.Color.IntegerToColor(abajo), pasos, i);
    const y0 = -FUERA + ((hasta + FUERA) * i) / pasos;
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillRect(-FUERA, y0, W + FUERA * 2, (hasta + FUERA) / pasos + 2);
  }
}
function monte(g: G, cx: number, base: number, ancho: number, alto: number, c: number, cima?: number) {
  g.fillStyle(c).fillTriangle(cx - ancho, base, cx + ancho, base, cx, base - alto);
  g.fillStyle(Phaser.Display.Color.IntegerToColor(c).darken(14).color).fillTriangle(cx, base - alto, cx + ancho, base, cx + ancho * 0.2, base);
  if (cima !== undefined) g.fillStyle(cima).fillTriangle(cx - ancho * 0.28, base - alto * 0.72, cx + ancho * 0.28, base - alto * 0.72, cx, base - alto);
}
function arbol(g: G, x: number, y: number, r: number, c: number) {
  g.fillStyle(0x3a2616).fillRect(x - r * 0.12, y - r * 0.5, r * 0.24, r);
  g.fillStyle(c).fillCircle(x, y - r, r);
  g.fillStyle(Phaser.Display.Color.IntegerToColor(c).brighten(12).color).fillCircle(x - r * 0.3, y - r * 1.25, r * 0.5);
}
function palmera(g: G, x: number, y: number, k = 1, c = 0x1a3a2a) {
  g.fillStyle(0x2a1a14).fillRect(x - 4 * k, y - 90 * k, 8 * k, 90 * k);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    g.fillStyle(c).fillTriangle(x, y - 90 * k, x + Math.cos(a) * 60 * k, y - 90 * k + Math.sin(a) * 30 * k + 30 * k, x + Math.cos(a) * 40 * k, y - 90 * k + Math.sin(a) * 20 * k + 34 * k);
  }
}
function manchas(g: G, r: R, colores: number[], n: number, rmin: number, rmax: number, alpha = 1) {
  for (let i = 0; i < n; i++) {
    const x = r.between(0, W), y = r.between(0, H), rr = r.between(rmin, rmax);
    g.fillStyle(r.pick(colores), alpha).fillEllipse(x, y, rr * 2, rr * 1.2);
    g.fillStyle(r.pick(colores), alpha).fillEllipse(W - x, H - y, rr * 2, rr * 1.2); // simétrico: justo para los dos
  }
}
function poza(g: G, x: number, y: number, w: number, h: number, borde: number, agua: number, brillo: number) {
  for (const [px, py] of [[x, y], [W - x, H - y]]) {
    g.fillStyle(borde).fillEllipse(px, py, w + 12, h + 10);
    g.fillStyle(agua).fillEllipse(px, py, w, h);
    g.fillStyle(brillo, 0.55).fillEllipse(px - w * 0.18, py - h * 0.15, w * 0.35, h * 0.2);
  }
}
function grietas(g: G, r: R, n: number, color: number, brillo: number, largo = 200) {
  for (let i = 0; i < n; i++) {
    const x = r.between(80, W / 2 - 60), y = r.between(60, H - 60), a = r.realInRange(0, 6.28);
    for (const [sx, sy, sa] of [[x, y, a], [W - x, H - y, a + Math.PI]]) {
      let ang = sa;
      const pts: [number, number][] = [[sx, sy]];
      for (let d = 30; d < largo; d += 30) { ang += r.realInRange(-0.6, 0.6); const [px, py] = pts[pts.length - 1]; pts.push([px + Math.cos(ang) * 30, py + Math.sin(ang) * 30]); }
      for (const [ancho, c, al] of [[10, color, 0.55], [4, brillo, 0.95]] as const) {
        g.lineStyle(ancho, c, al).beginPath();
        pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
        g.strokePath();
      }
    }
  }
}
function estrellas(g: G, n: number) {
  for (let i = 0; i < n; i++) g.fillStyle(0xffffff, 0.3 + (i % 5) / 8).fillRect(-FUERA + (i * 131) % (W + FUERA * 2), -FUERA + (i * 71) % (FUERA - GRADA), 3, 3);
}
function cristal(g: G, x: number, y: number, k: number, c: number, brillo: number) {
  g.fillStyle(c).fillTriangle(x - 10 * k, y, x + 10 * k, y, x, y - 46 * k);
  g.fillStyle(Phaser.Display.Color.IntegerToColor(c).darken(15).color).fillTriangle(x + 4 * k, y, x + 22 * k, y, x + 14 * k, y - 30 * k);
  g.fillStyle(brillo, 0.8).fillTriangle(x - 4 * k, y - 6 * k, x, y - 6 * k, x - 1 * k, y - 34 * k);
}

// ------------------------------------------------------------------ los estadios
export const TEMAS_GIM: Record<string, TemaGim> = {
  // Baños: el Tungurahua en erupción al atardecer, campo de obsidiana y ríos de lava
  nina: {
    linea: 0xffb040, pista: 0x2a1a16, muro: 0x3a2420, gradas: [0x3a2420, 0x2a1a16], publico: [0xff6a20, 0xffb030, 0xe03020, 0xffffff], fuera: 0x1a0e0c, noche: true, oscuro: 0.15,
    obs: 'lava', borde: [0x1a100e, 0x3a2420], suelo: 0x2e2220, color: 0xff6a20, amb: ['brasas'],
    fondo: (g) => {
      cielo(g, 0x1a0608, 0xd8502a);
      monte(g, W / 2, TOP - 30, 820, 640, 0x2e1e1c);
      for (let i = 0; i < 5; i++) g.lineStyle(10 - i, 0xff6a10, 0.9).lineBetween(W / 2 + (i - 2) * 30, TOP - 640, W / 2 + (i - 2) * 140, TOP - 60);
      for (let i = 0; i < 8; i++) g.fillStyle(0x4a3434, 0.6 - i * 0.06).fillCircle(W / 2 + i * 34 - 40, TOP - 700 - i * 60, 50 + i * 16);
      g.fillStyle(0xffa040, 0.85).fillCircle(W / 2, TOP - 650, 46);
      monte(g, -500, TOP - 30, 420, 260, 0x24181a); monte(g, W + 500, TOP - 30, 460, 300, 0x24181a);
    },
    terreno: (g, r) => {
      manchas(g, r, [0x221816, 0x3a2a26, 0x2a201e], 28, 30, 90, 0.9);
      grietas(g, r, 6, 0xff3a00, 0xffc040, 230);
      poza(g, W * 0.3, H * 0.22, 130, 56, 0x1a100e, 0xff5a10, 0xffd060);
      for (let i = 0; i < 80; i++) g.fillStyle(r.pick([0x140c0a, 0x5a4440]), 0.9).fillCircle(r.between(0, W), r.between(0, H), r.between(2, 5));
    },
  },
  // Montañita: atardecer en la playa, olas y pozas de marea
  yaku: {
    linea: 0xffffff, pista: 0xe8d29a, muro: 0xf4e6c0, gradas: [0x2a8ac0, 0x1e74a8], publico: [0xffd040, 0x40c0e0, 0xffffff, 0xff7a40, 0xe04a8a], fuera: 0x2a8ac0,
    obs: 'boya', borde: [0xd8bc80, 0xf4e2b0], suelo: 0xe6cf98, color: 0x3aa8ff, amb: ['espuma'],
    fondo: (g) => {
      cielo(g, 0x3a4ab0, 0xffa060, TOP - 260);
      g.fillStyle(0xffe08a).fillCircle(W / 2, TOP - 270, 110);
      g.fillStyle(0x1e74b0).fillRect(-FUERA, TOP - 270, W + FUERA * 2, 240);
      for (let i = 0; i < 70; i++) g.fillStyle(0xbfe8ff, 0.7).fillRect(-FUERA + (i * 97) % (W + FUERA * 2), TOP - 250 + (i * 29) % 210, 50, 4);
      g.fillStyle(0xffd080, 0.6).fillRect(W / 2 - 80, TOP - 268, 160, 8).fillRect(W / 2 - 50, TOP - 240, 100, 6);
      for (let x = -700; x < W + 700; x += 170) { palmera(g, x, TOP - 10, 1.3); palmera(g, x + 70, H + GRADA + PISTA + 120, 1.1); }
    },
    terreno: (g, r) => {
      manchas(g, r, [0xd8bc80, 0xf0dcae, 0xc8a870], 24, 30, 90, 0.8);
      poza(g, W * 0.28, H * 0.25, 170, 70, 0xc8a870, 0x2a9ad0, 0xbff0ff);
      poza(g, W * 0.5, H * 0.5, 90, 40, 0xc8a870, 0x2a9ad0, 0xbff0ff);
      for (let y = 30; y < H; y += 70) g.lineStyle(3, 0xffffff, 0.35).beginPath().moveTo(0, y).lineTo(W * 0.15, y + 6).lineTo(W * 0.3, y).strokePath();
      for (let i = 0; i < 80; i++) g.fillStyle(r.pick([0xffffff, 0xf0a8a0, 0xc0a070]), 0.9).fillCircle(r.between(0, W), r.between(0, H), r.between(2, 4));
    },
  },
  // Mindo: bosque nublado, helechos, orquídeas y niebla
  sacha: {
    linea: 0xe8f0c8, pista: 0x4a3a22, muro: 0x5a4428, gradas: [0x2a5a2a, 0x1e4a22], publico: [0xf0a0c0, 0xffffff, 0xf0d040, 0x40c0a0, 0xe04040], fuera: 0x12381a, oscuro: 0.05,
    obs: 'tronco', borde: [0x2a4a22, 0x3a6a2a], suelo: 0x2f6a2c, color: 0x4ec05a, amb: ['hojas'],
    fondo: (g) => {
      cielo(g, 0x8ab0a0, 0xc8dcd0);
      for (let i = 0; i < 200; i++) {
        const x = -FUERA + ((i * 137) % (W + FUERA * 2)), arriba = i % 2 === 0;
        const y = arriba ? TOP - 10 - ((i * 71) % 420) : H + GRADA + PISTA + 60 + ((i * 53) % 300);
        arbol(g, x, y, 40 + (i % 6) * 12, [0x1e5a2a, 0x2a7a3a, 0x145020, 0x3a8a4a][i % 4]);
      }
      for (let i = 0; i < 6; i++) g.fillStyle(0xffffff, 0.12).fillRect(-FUERA, TOP - 420 + i * 60, W + FUERA * 2, 40);
    },
    terreno: (g, r) => {
      manchas(g, r, [0x2a5a28, 0x3a7a34, 0x22501f], 30, 30, 80, 0.9);
      for (let i = 0; i < 40; i++) {
        const x = r.between(10, W - 10), y = r.between(10, H - 10);
        for (let k = 0; k < 5; k++) g.fillStyle(0x4aa04a, 0.9).fillTriangle(x, y, x + Math.cos(k * 1.2 - 2.4) * 22, y + Math.sin(k * 1.2 - 2.4) * 22, x + Math.cos(k * 1.2 - 2.1) * 18, y + Math.sin(k * 1.2 - 2.1) * 18);
      }
      for (let i = 0; i < 50; i++) { const x = r.between(0, W), y = r.between(0, H); g.fillStyle(r.pick([0xf080c0, 0xffffff, 0xf0d040, 0xc060f0])).fillCircle(x, y, 4); g.fillStyle(0xfff0a0).fillCircle(x, y, 1.5); }
      poza(g, W * 0.22, H * 0.7, 120, 50, 0x3a5a2a, 0x3a8aa0, 0xd0f0ff);
    },
  },
  // Guayaquil de noche: rascacielos, el malecón iluminado y placas metálicas con circuitos
  illapa: {
    linea: 0x40e0ff, pista: 0x1a1e2a, muro: 0x2a3040, gradas: [0x22283a, 0x1a2030], publico: [0xffe040, 0x40e0ff, 0xffffff, 0xff60c0], fuera: 0x0c1020, noche: true, oscuro: 0.1,
    obs: 'bobina', borde: [0x2a3040, 0x4a5468], suelo: 0x262c3a, color: 0xffe040, amb: ['chispas'], rayos: true,
    fondo: (g) => {
      cielo(g, 0x060818, 0x2a2a5a);
      estrellas(g, 60);
      for (let x = -FUERA; x < W + FUERA; x += 90) {
        const h = 160 + ((x * 7919) % 360 + 360) % 360;
        g.fillStyle(0x161a2c).fillRect(x, TOP - 30 - h, 76, h);
        for (let wy = TOP - 20 - h; wy < TOP - 40; wy += 18) for (let wx = x + 8; wx < x + 70; wx += 16) if ((wx * 31 + wy * 17) % 5 < 3) g.fillStyle(0xffe08a, 0.85).fillRect(wx, wy, 8, 8);
      }
      g.lineStyle(4, 0xffe040, 0.9).lineBetween(-FUERA, TOP - 34, W + FUERA, TOP - 34);
    },
    terreno: (g, r) => {
      for (let y = 0; y < H; y += 48) for (let x = 0; x < W; x += 48) {
        g.fillStyle(((x + y) / 48) % 2 ? 0x2a3142 : 0x242a3a).fillRect(x + 1, y + 1, 46, 46);
        g.fillStyle(0x4a5468).fillCircle(x + 6, y + 6, 2).fillCircle(x + 42, y + 42, 2);
      }
      for (let i = 0; i < 10; i++) {
        const y = r.between(20, H - 20), x0 = r.between(0, W / 2), x1 = x0 + r.between(80, 220);
        for (const [a, b, c] of [[x0, x1, y], [W - x1, W - x0, H - y]]) { g.lineStyle(6, 0x40e0ff, 0.25).lineBetween(a, c, b, c); g.lineStyle(2, 0x9af4ff, 0.9).lineBetween(a, c, b, c); }
      }
      for (let k = 0; k < 2; k++) for (let x = 0; x < W; x += 24) g.fillStyle(x % 48 ? 0xffd020 : 0x1a1a1a).fillRect(x, k ? H - 10 : 0, 24, 10);
    },
  },
  // Ingapirca: terrazas andinas y el templo del sol de piedra
  rumi: {
    linea: 0xf0e8d0, pista: 0x8a7a60, muro: 0x9a8a6a, gradas: [0x8a7a5a, 0x7a6a4c], publico: [0xe03030, 0xf0c020, 0x2a6ae0, 0xffffff, 0x8a40c0], fuera: 0x6a8a3a,
    obs: 'roca', borde: [0x6a5e48, 0x8a7c62], suelo: 0x9a8a6a, color: 0xc8a060, amb: ['polvo'],
    fondo: (g) => {
      cielo(g, 0x4a90e0, 0xb8dcf8);
      monte(g, -300, TOP - 30, 700, 380, 0x5a7a3a); monte(g, W + 300, TOP - 30, 700, 420, 0x4e6e34); monte(g, W / 2, TOP - 30, 520, 300, 0x6a8a44);
      for (let i = 0; i < 6; i++) g.fillStyle(i % 2 ? 0x7a9a4a : 0x6a8a3a).fillRect(-FUERA, TOP - 40 - i * 24, W + FUERA * 2, 24);
      // el templo elíptico de Ingapirca
      const cx = W / 2, by = TOP - 50;
      for (let k = 0; k < 4; k++) g.fillStyle(k % 2 ? 0x8a7c62 : 0x9a8c70).fillEllipse(cx, by - k * 26, 520 - k * 70, 70);
      for (let i = 0; i < 9; i++) g.lineStyle(2, 0x5a5040, 0.6).lineBetween(cx - 240 + i * 60, by - 100, cx - 240 + i * 60, by + 20);
    },
    terreno: (g, r) => {
      for (let y = 0; y < H; y += 34) {
        let x = (y / 34) % 2 ? -20 : 0;
        while (x < W) {
          const w = r.between(40, 80);
          g.fillStyle(r.pick([0x8a7c62, 0x9a8a6e, 0x7e7058])).fillRoundedRect(x + 2, y + 2, w - 4, 30, 6);
          g.fillStyle(0xffffff, 0.07).fillRect(x + 6, y + 5, w - 16, 5);
          x += w;
        }
      }
      g.lineStyle(12, 0xc8a060, 0.35).strokeCircle(W / 2, H / 2, 120);
    },
  },
  // Quilotoa: el cráter con su laguna turquesa, páramo y viento
  wayra: {
    linea: 0xfffff0, pista: 0x8a7a50, muro: 0xa08a5a, gradas: [0x7a6a4a, 0x6a5a3c], publico: [0x2ad0c0, 0xffffff, 0xe03030, 0xf0c020], fuera: 0x8a9a5a,
    obs: 'roca', borde: [0x7a6a4a, 0x9a8a62], suelo: 0xa8a860, color: 0x6ad8e0, amb: ['viento'],
    fondo: (g) => {
      cielo(g, 0x6aa8e0, 0xdaf0ff);
      g.fillStyle(0x8a7450).fillEllipse(W / 2, TOP - 160, W + 1200, 360);
      g.fillStyle(0x28b8b0).fillEllipse(W / 2, TOP - 150, W + 900, 220);
      g.fillStyle(0x6ae0d8, 0.6).fillEllipse(W / 2 - 200, TOP - 170, 500, 40);
      for (let i = 0; i < 12; i++) g.fillStyle(0xffffff, 0.8).fillEllipse(-FUERA + i * 340, -FUERA + 260 + (i % 3) * 90, 220, 50);
    },
    terreno: (g, r) => {
      manchas(g, r, [0x9a9a54, 0xb4b06a, 0x8a8a4a], 30, 30, 90, 0.85);
      for (let i = 0; i < 240; i++) { const x = r.between(0, W), y = r.between(0, H); g.lineStyle(2, r.pick([0xd8d080, 0x7a8a3a]), 0.8).lineBetween(x, y, x + 12, y - 6); }
      for (let i = 0; i < 14; i++) { const y = r.between(10, H - 10), x = r.between(0, W - 160); g.lineStyle(2, 0xffffff, 0.25).lineBetween(x, y, x + 160, y); }
    },
  },
  // Cueva de los Tayos: oscuridad, estalactitas y cristales morados
  tuta: {
    linea: 0xb070ff, pista: 0x16101e, muro: 0x221a2c, gradas: [0x1e1626, 0x18121e], publico: [0x8a5ac0, 0x5a3a80, 0xc090ff], fuera: 0x0a060e, noche: true, oscuro: 0.32,
    obs: 'cristal', borde: [0x1a1220, 0x2e2238], suelo: 0x1e1826, color: 0x9a4aff, amb: ['sombra'],
    fondo: (g) => {
      g.fillStyle(0x08050c).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA * 2 + H);
      for (let x = -FUERA; x < W + FUERA; x += 70) { const h = 80 + ((x * 31) % 160 + 160) % 160; g.fillStyle(0x1a1222).fillTriangle(x, TOP - 520, x + 60, TOP - 520, x + 30, TOP - 520 + h); }
      g.fillStyle(0x1a1222).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA + TOP - 520);
      for (let i = 0; i < 26; i++) cristal(g, -FUERA + 200 + (i * 211) % (W + FUERA * 2 - 400), TOP - 40 - (i * 37) % 160, 1.2 + (i % 3) * 0.4, 0x7a3ad0, 0xe0c0ff);
    },
    terreno: (g, r) => {
      manchas(g, r, [0x1a1420, 0x2a2230, 0x14101a], 30, 30, 90, 0.95);
      for (let i = 0; i < 8; i++) {
        const x = r.between(40, W / 2 - 40), y = r.between(30, H - 30);
        for (const [px, py] of [[x, y], [W - x, H - y]]) { g.fillStyle(0x9a4aff, 0.18).fillCircle(px, py, 34); cristal(g, px - 8, py + 10, 0.6, 0x8a4ae0, 0xf0d8ff); cristal(g, px + 8, py + 12, 0.45, 0x6a2ac0, 0xe0c0ff); }
      }
    },
  },
  // Chimborazo: ventisca en la cumbre
  rasu: {
    linea: 0x2a5a8a, pista: 0xf4faff, muro: 0xd0e8f8, gradas: [0xc0dcf0, 0xa8c8e0], publico: [0x2a6ae0, 0xe03030, 0xffffff, 0x2a2a3a], fuera: 0xeaf6ff, oscuro: 0.06,
    obs: 'hielo', borde: [0xa8c4dc, 0xeaf6ff], suelo: 0xe2f0fa, color: 0x8ad8ff, amb: ['nieve'],
    fondo: (g) => {
      cielo(g, 0x4a7ab0, 0xc8e0f4);
      monte(g, W / 2 + 80, TOP - 30, 980, 700, 0x8a90a8, 0xffffff);
      monte(g, -380, TOP - 30, 420, 300, 0x9aa0b8, 0xffffff); monte(g, W + 420, TOP - 30, 460, 340, 0x9aa0b8, 0xffffff);
    },
    terreno: (g, r) => {
      manchas(g, r, [0xf4faff, 0xcfe4f4, 0xffffff], 28, 30, 90, 0.9);
      poza(g, W * 0.3, H * 0.3, 200, 84, 0xf4faff, 0x9fd0f0, 0xffffff);
      grietas(g, r, 4, 0x6aa0c8, 0xdff4ff, 170);
    },
  },
  // Alto Mando — Amaru: templo en la selva, cascada y canales de agua
  amaru: {
    linea: 0xd8f0e0, pista: 0x5a6a4a, muro: 0x6a7a58, gradas: [0x4a6a44, 0x3e5a3a], publico: [0x40c0a0, 0xf0d040, 0xffffff, 0x2a8ac0], fuera: 0x1a4a2a,
    obs: 'fuente', borde: [0x5a6a4a, 0x7a8a62], suelo: 0x6a7a5a, color: 0x2ad0a0, amb: ['hojas', 'espuma'],
    fondo: (g) => {
      cielo(g, 0x2a6a5a, 0x9ad0b8);
      for (let i = 0; i < 120; i++) arbol(g, -FUERA + ((i * 137) % (W + FUERA * 2)), TOP - 10 - ((i * 71) % 300), 50 + (i % 4) * 12, [0x1e5a2a, 0x2a7a3a, 0x145020][i % 3]);
      for (let k = 0; k < 6; k++) g.fillStyle(k % 2 ? 0x7a8a6a : 0x8a9a78).fillRect(W / 2 - 300 + k * 50, TOP - 60 - k * 50, 600 - k * 100, 50);
      g.fillStyle(0x8ad8ff, 0.85).fillRect(W / 2 - 30, TOP - 360, 60, 320);
      g.fillStyle(0xffffff, 0.6).fillRect(W / 2 - 12, TOP - 360, 10, 320);
    },
    terreno: (g, r) => {
      manchas(g, r, [0x6a7a5a, 0x5a6a4a, 0x7a8a68], 26, 30, 80, 0.9);
      for (const y of [H * 0.28, H * 0.72]) { g.fillStyle(0x4a5a3a).fillRect(0, y - 16, W, 32); g.fillStyle(0x3a9ac0).fillRect(0, y - 11, W, 22); g.fillStyle(0xd0f4ff, 0.6).fillRect(0, y - 6, W, 3); }
      g.lineStyle(14, 0x2ad0a0, 0.25).strokeCircle(W / 2, H / 2, 120);
      void r;
    },
  },
  // Alto Mando — Supay: diablada nocturna entre columnas de fuego
  supay: {
    linea: 0xff4a2a, pista: 0x2a0e0e, muro: 0x3a1414, gradas: [0x3a1414, 0x2a0e0e], publico: [0xe02020, 0xffb020, 0x1a1a1a, 0xffffff], fuera: 0x140606, noche: true, oscuro: 0.18,
    obs: 'lava', borde: [0x2a0e0e, 0x5a1a14], suelo: 0x3a1a1a, color: 0xff2a2a, amb: ['brasas'],
    fondo: (g) => {
      cielo(g, 0x0a0206, 0x6a0e0e);
      for (let x = -FUERA + 120; x < W + FUERA; x += 260) {
        g.fillStyle(0x2a0e0e).fillRect(x - 20, TOP - 280, 40, 260);
        for (let k = 0; k < 4; k++) g.fillStyle([0xff2a10, 0xff7a20, 0xffc040, 0xffffa0][k], 0.9).fillTriangle(x - 30 + k * 7, TOP - 280, x + 30 - k * 7, TOP - 280, x, TOP - 380 + k * 20);
      }
    },
    terreno: (g, r) => {
      manchas(g, r, [0x3a1414, 0x4a1a1a, 0x2a0e0e], 28, 30, 90, 0.9);
      grietas(g, r, 5, 0xc00a00, 0xff6a20, 200);
      g.lineStyle(14, 0xff2a2a, 0.3).strokeCircle(W / 2, H / 2, 120);
    },
  },
  // Alto Mando — Killa: noche de luna llena, piedra plateada
  killa: {
    linea: 0xe8f0ff, pista: 0x3a4058, muro: 0x4a5070, gradas: [0x3a4058, 0x30364c], publico: [0xe8f0ff, 0x8ab0ff, 0xc0a0ff, 0xffffff], fuera: 0x10142a, noche: true, oscuro: 0.12,
    obs: 'hielo', borde: [0x8a90b0, 0xc8d0e8], suelo: 0x9aa0bc, color: 0xe0e8ff, amb: ['luna'],
    fondo: (g) => {
      cielo(g, 0x060818, 0x2a3060);
      estrellas(g, 160);
      g.fillStyle(0xf4f4ff, 0.15).fillCircle(W / 2, TOP - 360, 260);
      g.fillStyle(0xf4f4ff).fillCircle(W / 2, TOP - 360, 190);
      g.fillStyle(0xd8dcf0).fillCircle(W / 2 - 60, TOP - 400, 34).fillCircle(W / 2 + 50, TOP - 320, 24).fillCircle(W / 2 + 20, TOP - 420, 16);
    },
    terreno: (g, r) => {
      manchas(g, r, [0x9aa0bc, 0xb0b6d0, 0x8a90ac], 28, 30, 90, 0.9);
      g.fillStyle(0xe0e8ff, 0.2).fillCircle(W / 2, H / 2, 130);
      g.fillStyle(0x9aa0bc).fillCircle(W / 2 + 40, H / 2 - 20, 110);
      g.lineStyle(6, 0xe0e8ff, 0.6).strokeCircle(W / 2, H / 2, 130);
    },
  },
  // Alto Mando — Kuntur: la cumbre sobre un mar de nubes
  kuntur: {
    linea: 0xffffff, pista: 0x6a6070, muro: 0x7a7080, gradas: [0x6a6070, 0x5a5262], publico: [0xffffff, 0x1a1a1a, 0xe03030, 0xf0c020], fuera: 0xdfeefc,
    obs: 'roca', borde: [0x5a5262, 0x7a7084], suelo: 0x7a7488, color: 0xbfe0ff, amb: ['viento'],
    fondo: (g) => {
      cielo(g, 0x2a6ad0, 0xa8d4ff);
      for (let i = 0; i < 40; i++) g.fillStyle(0xffffff, 0.9).fillEllipse(-FUERA + (i * 173) % (W + FUERA * 2), TOP - 80 - (i * 37) % 140, 260, 90);
      monte(g, -200, TOP - 140, 260, 300, 0x4a4458, 0xffffff); monte(g, W + 260, TOP - 140, 300, 360, 0x4a4458, 0xffffff);
    },
    terreno: (g, r) => {
      manchas(g, r, [0x7a7488, 0x6a6478, 0x8a8498], 28, 30, 90, 0.9);
      for (let i = 0; i < 20; i++) g.fillStyle(0xffffff, 0.15).fillEllipse(r.between(0, W), r.between(0, H), 120, 30);
    },
  },
  // La Campeona: Mitad del Mundo de noche, con lluvia de oro
  pacha: {
    linea: 0xffe08a, pista: 0x2a2440, muro: 0x3a3060, gradas: [0x2a2448, 0x221c3c], publico: [0xf0c020, 0x2a6ae0, 0xe03030, 0xffffff, 0xff60c0], fuera: 0x141030, noche: true,
    obs: 'pilar', borde: [0x8a6a38, 0xb89a5a], suelo: 0xb89a5a, color: 0xffd040, amb: ['oro'],
    fondo: (g) => {
      g.fillStyle(0x0c0a24).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA * 2 + H);
      estrellas(g, 160);
      const mx = W / 2, my = TOP - 20;
      g.fillStyle(0x8a7a60).fillPoints([{ x: mx - 90, y: my }, { x: mx + 90, y: my }, { x: mx + 60, y: my - 300 }, { x: mx - 60, y: my - 300 }] as any, true);
      g.fillStyle(0xd8a838).fillCircle(mx, my - 350, 52);
      g.lineStyle(4, 0x8a6418).strokeCircle(mx, my - 350, 52).lineBetween(mx - 52, my - 350, mx + 52, my - 350).strokeEllipse(mx, my - 350, 50, 104);
      for (let i = 0; i < 12; i++) g.lineStyle(6, 0xffe08a, 0.12).lineBetween(mx, my - 350, mx + Math.cos(i * 0.52) * 900, my - 350 + Math.sin(i * 0.52) * 900);
    },
    terreno: (g, r) => {
      manchas(g, r, [0xa88a4a, 0xc8aa6a, 0xb09050], 26, 30, 90, 0.85);
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; g.fillStyle(k % 2 ? 0x8a6a38 : 0x9a7a44).fillRoundedRect(W / 2 + Math.cos(a) * 150 - 14, H / 2 + Math.sin(a) * 150 - 10, 28, 20, 4); }
      g.fillStyle(0xd8a838, 0.95).fillRect(W / 2 - 7, -PISTA, 14, H + PISTA * 2);
      g.fillStyle(0xce1126, 0.9).fillRect(W / 2 - 2, -PISTA, 4, H + PISTA * 2);
    },
  },
};

/** Obstáculos propios de los gimnasios (los demás los dibuja arenas.ts). */
export function obstaculoGim(r: G, x: number, y: number, rad: number, tipo: ObsGim): boolean {
  if (tipo === 'bobina') {
    r.fillStyle(0x3a4054).fillEllipse(x, y, rad * 2, rad);
    r.fillStyle(0x6a7488).fillRect(x - rad * 0.3, y - rad * 2.2, rad * 0.6, rad * 2.2);
    for (let k = 0; k < 3; k++) r.fillStyle(0xc87a30).fillEllipse(x, y - rad * (0.7 + k * 0.5), rad * 1.1, rad * 0.35);
    r.fillStyle(0xd0d8e8).fillCircle(x, y - rad * 2.4, rad * 0.55);
    r.fillStyle(0x9af4ff, 0.35).fillCircle(x, y - rad * 2.4, rad * 1.1);
    return true;
  }
  if (tipo === 'cristal') {
    r.fillStyle(0x9a4aff, 0.2).fillCircle(x, y - rad * 0.5, rad * 1.5);
    cristal(r, x - rad * 0.3, y + rad * 0.4, rad / 18, 0x8a4ae0, 0xf0d8ff);
    cristal(r, x + rad * 0.4, y + rad * 0.5, rad / 26, 0x6a2ac0, 0xe0c0ff);
    return true;
  }
  return false;
}

const TEXTURAS: Record<Ambiente, (g: G) => void> = {
  brasas: (g) => g.fillStyle(0xffffff).fillRect(0, 0, 4, 4),
  espuma: (g) => g.fillStyle(0xffffff).fillCircle(4, 4, 4),
  hojas: (g) => g.fillStyle(0xffffff).fillEllipse(5, 3, 10, 5),
  chispas: (g) => g.fillStyle(0xffffff).fillRect(0, 0, 3, 3),
  polvo: (g) => g.fillStyle(0xffffff).fillCircle(3, 3, 3),
  viento: (g) => g.fillStyle(0xffffff).fillRect(0, 0, 40, 2),
  sombra: (g) => g.fillStyle(0xffffff).fillCircle(6, 6, 6),
  nieve: (g) => g.fillStyle(0xffffff).fillCircle(3, 3, 3),
  oro: (g) => g.fillStyle(0xffffff).fillRect(0, 0, 3, 3),
  luna: (g) => g.fillStyle(0xffffff).fillCircle(2, 2, 2),
};
const TAM: Record<Ambiente, [number, number]> = { brasas: [4, 4], espuma: [8, 8], hojas: [10, 6], chispas: [3, 3], polvo: [6, 6], viento: [40, 2], sombra: [12, 12], nieve: [6, 6], oro: [3, 3], luna: [4, 4] };

/** Partículas de ambiente sobre todo el estadio. */
export function ambiente(s: Phaser.Scene, tipo: Ambiente) {
  const key = 'amb_' + tipo;
  if (!s.textures.exists(key)) {
    const g = s.make.graphics({}, false);
    TEXTURAS[tipo](g);
    g.generateTexture(key, ...TAM[tipo]);
    g.destroy();
  }
  const zona = new Phaser.Geom.Rectangle(-300, -300, W + 600, H + 600);
  const base = { emitZone: { type: 'random' as const, source: zona as any }, blendMode: 'ADD' };
  const cfg: Record<Ambiente, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig> = {
    brasas: { ...base, tint: [0xff5a10, 0xffa030, 0xffe060], speedY: { min: -70, max: -25 }, speedX: { min: -15, max: 15 }, lifespan: 3200, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 35 },
    espuma: { ...base, blendMode: 'NORMAL', tint: [0xffffff, 0xbfe8ff], speedX: { min: -20, max: 20 }, speedY: { min: -12, max: 4 }, lifespan: 2600, scale: { start: 0.9, end: 0.2 }, alpha: { start: 0.6, end: 0 }, frequency: 70 },
    hojas: { ...base, blendMode: 'NORMAL', tint: [0x3a9a3a, 0x6ac05a, 0x9ad04a, 0xf080c0], speedY: { min: 25, max: 60 }, speedX: { min: -30, max: 30 }, rotate: { min: 0, max: 360 }, lifespan: 6000, scale: 1, alpha: { start: 0.95, end: 0.2 }, frequency: 120 },
    chispas: { ...base, tint: [0x9af4ff, 0xffe040, 0xffffff], speed: { min: 40, max: 140 }, lifespan: 500, scale: { start: 1.6, end: 0 }, frequency: 25 },
    polvo: { ...base, blendMode: 'NORMAL', tint: [0xd8c8a0, 0xb8a880], speedX: { min: 10, max: 40 }, speedY: { min: -8, max: 8 }, lifespan: 5000, scale: { start: 0.8, end: 0.3 }, alpha: { start: 0.45, end: 0 }, frequency: 90 },
    viento: { ...base, blendMode: 'NORMAL', tint: 0xffffff, speedX: { min: 380, max: 620 }, lifespan: 1400, scaleX: { min: 0.6, max: 1.6 }, alpha: { start: 0.35, end: 0 }, frequency: 45 },
    sombra: { ...base, tint: [0x9a4aff, 0x5a2ab0, 0xd0a0ff], speedY: { min: -30, max: -8 }, speedX: { min: -10, max: 10 }, lifespan: 4000, scale: { start: 0.2, end: 1.4 }, alpha: { start: 0.5, end: 0 }, frequency: 80 },
    nieve: { ...base, blendMode: 'NORMAL', tint: 0xffffff, speedY: { min: 70, max: 140 }, speedX: { min: 60, max: 160 }, lifespan: 5000, scale: { min: 0.5, max: 1.3 }, alpha: { start: 0.95, end: 0.3 }, frequency: 15 },
    oro: { ...base, tint: [0xffe080, 0xffc040, 0xffffff], speedY: { min: 10, max: 40 }, speedX: { min: -10, max: 10 }, lifespan: 3500, scale: { start: 1.6, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 40 },
    luna: { ...base, tint: [0xe0e8ff, 0xffffff, 0xc0a0ff], speedY: { min: -10, max: 10 }, speedX: { min: -10, max: 10 }, lifespan: 3000, scale: { start: 1.5, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: 50 },
  };
  return s.add.particles(0, 0, key, cfg[tipo]).setDepth(4200);
}

/** Rayo que cae del cielo en el estadio eléctrico. */
export function rayo(s: Phaser.Scene) {
  const x = Phaser.Math.Between(-200, W + 200);
  const g = s.add.graphics().setDepth(-16).setBlendMode('ADD');
  let px = x, py = TOP - 700;
  g.lineStyle(6, 0x9af4ff, 0.9).beginPath().moveTo(px, py);
  while (py < TOP - 40) { px += Phaser.Math.Between(-40, 40); py += Phaser.Math.Between(40, 90); g.lineTo(px, py); }
  g.strokePath();
  s.cameras.main.flash(80, 120, 200, 255);
  s.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
}
