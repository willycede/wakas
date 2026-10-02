// Estadios: uno por liga, inspirados en lugares de Ecuador. Se dibujan en código (pixel art
// sencillo): campo, pista, gradas con público animado, banderines, focos, obstáculos temáticos
// y un paisaje de fondo (volcán, selva, mar, cúpulas…).

import Phaser from 'phaser';
import { ARENA, type Obstaculo } from '../../shared/src';

type Obs = 'roca' | 'tronco' | 'lava' | 'fuente' | 'hielo' | 'pilar' | 'boya';
interface Tema {
  cesped: [number, number];
  linea: number;
  pista: number;
  muro: number;
  gradas: [number, number];
  publico: number[];
  fuera: number; // color del suelo fuera del estadio
  noche?: boolean;
  obs: Obs;
  fondo: (g: Phaser.GameObjects.Graphics, s: Phaser.Scene) => void;
}

const W = ARENA.w, H = ARENA.h;
const PISTA = 34; // franja alrededor del campo
const GRADA = 210; // fondo de las gradas
const FUERA = 1400; // hasta dónde se pinta el exterior

// ------------------------------------------------------------------ paisajes de fondo
function volcan(g: Phaser.GameObjects.Graphics, cx: number, base: number, ancho: number, alto: number, roca: number, nieve: number, humo = false) {
  g.fillStyle(roca).fillTriangle(cx - ancho, base, cx + ancho, base, cx, base - alto);
  g.fillStyle(Phaser.Display.Color.IntegerToColor(roca).darken(15).color).fillTriangle(cx, base - alto, cx + ancho, base, cx + ancho * 0.25, base);
  const k = 0.32;
  g.fillStyle(nieve).fillTriangle(cx - ancho * k, base - alto * (1 - k), cx + ancho * k, base - alto * (1 - k), cx, base - alto);
  for (let i = -3; i <= 3; i++) g.fillStyle(nieve).fillTriangle(cx + i * ancho * 0.09 - 14, base - alto * (1 - k), cx + i * ancho * 0.09 + 14, base - alto * (1 - k), cx + i * ancho * 0.09, base - alto * (1 - k) + 26 + (i % 2) * 18);
  if (humo) for (let i = 0; i < 6; i++) g.fillStyle(0xd8d0d0, 0.5 - i * 0.07).fillCircle(cx + i * 22, base - alto - 20 - i * 26, 26 + i * 8);
}
function palmera(g: Phaser.GameObjects.Graphics, x: number, y: number, k = 1) {
  g.fillStyle(0x7a5030).fillRect(x - 4 * k, y - 90 * k, 8 * k, 90 * k);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    g.fillStyle(i % 2 ? 0x2f8a3a : 0x3fa84a).fillTriangle(x, y - 90 * k, x + Math.cos(a) * 60 * k, y - 90 * k + Math.sin(a) * 30 * k + 30 * k, x + Math.cos(a) * 40 * k, y - 90 * k + Math.sin(a) * 20 * k + 34 * k);
  }
}
function arbol(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, c: number) {
  g.fillStyle(0x4a3020).fillRect(x - r * 0.15, y - r * 0.4, r * 0.3, r * 0.9);
  g.fillStyle(c).fillCircle(x, y - r, r);
  g.fillStyle(Phaser.Display.Color.IntegerToColor(c).brighten(15).color).fillCircle(x - r * 0.3, y - r * 1.25, r * 0.5);
}

const TEMAS: Record<string, Tema> = {
  // Guayaquil: malecón, mar y palmeras
  bronce: {
    cesped: [0x4c9a4c, 0x55a655], linea: 0xf4f0e0, pista: 0xe2cc92, muro: 0xf0e6c8, gradas: [0x2a5aa0, 0x1e4a88], publico: [0xf0c020, 0x2a6ae0, 0xffffff, 0xe04040, 0xffa030],
    fuera: 0x2a7ac0, obs: 'boya',
    fondo: (g) => {
      g.fillStyle(0x3a8ad0).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA - GRADA - PISTA);
      for (let i = 0; i < 40; i++) g.fillStyle(0xbfe4ff, 0.6).fillRect(-FUERA + i * 97 % (W + FUERA * 2), -GRADA - PISTA - 60 - (i * 53) % 400, 30, 3);
      for (let x = -600; x < W + 600; x += 150) { palmera(g, x, -GRADA - PISTA - 4, 1.2); palmera(g, x + 60, H + GRADA + PISTA + 110, 1); }
      // faro del cerro Santa Ana
      g.fillStyle(0xffffff).fillRect(W / 2 - 14, -GRADA - PISTA - 190, 28, 180);
      g.fillStyle(0x2a5aa0).fillRect(W / 2 - 14, -GRADA - PISTA - 150, 28, 22).fillRect(W / 2 - 14, -GRADA - PISTA - 90, 28, 22);
      g.fillStyle(0xffe070).fillRect(W / 2 - 18, -GRADA - PISTA - 214, 36, 24);
    },
  },
  // Amazonía: madera, selva y río
  plata: {
    cesped: [0x2f7a3a, 0x37863f], linea: 0xe8f0c8, pista: 0x6a4a2a, muro: 0x8a5a30, gradas: [0x7a5030, 0x5a3a20], publico: [0xe04040, 0x40c0a0, 0xf0d040, 0xffffff, 0x8a40e0],
    fuera: 0x1a4a22, obs: 'tronco',
    fondo: (g) => {
      for (let i = 0; i < 160; i++) {
        const x = -FUERA + ((i * 137) % (W + FUERA * 2)), arriba = i % 2 === 0;
        const y = arriba ? -GRADA - PISTA - 10 - ((i * 71) % 300) : H + GRADA + PISTA + 60 + ((i * 53) % 300);
        arbol(g, x, y, 40 + (i % 5) * 10, [0x1e6a2a, 0x2a8a3a, 0x145a20][i % 3]);
      }
      // río serpenteante
      g.fillStyle(0x6a8a50).fillRect(-FUERA, -GRADA - PISTA - 420, W + FUERA * 2, 60);
    },
  },
  // Cotopaxi: páramo y el volcán nevado
  oro: {
    cesped: [0x8aa04a, 0x96ac54], linea: 0xfff8e0, pista: 0x4a4040, muro: 0x8a8090, gradas: [0x6a6070, 0x55505e], publico: [0xf0c020, 0x2a6ae0, 0xe03030, 0xffffff, 0xf08040],
    fuera: 0x7a8a4a, obs: 'lava',
    fondo: (g) => {
      g.fillStyle(0x9ad0f0).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA - GRADA - PISTA - 120);
      volcan(g, W / 2, -GRADA - PISTA - 40, 720, 560, 0x5a5268, 0xffffff, true);
      volcan(g, -380, -GRADA - PISTA - 40, 420, 300, 0x6a6278, 0xf0f4ff);
      volcan(g, W + 420, -GRADA - PISTA - 40, 460, 340, 0x6a6278, 0xf0f4ff);
      g.fillStyle(0x7a8a4a).fillRect(-FUERA, -GRADA - PISTA - 60, W + FUERA * 2, 40);
    },
  },
  // Galápagos: roca volcánica negra y mar turquesa
  platino: {
    cesped: [0x5aa86a, 0x64b474], linea: 0xf4f0e0, pista: 0x2a2626, muro: 0x3a3434, gradas: [0x2e2a2a, 0x252121], publico: [0x3ad0c0, 0xffffff, 0xf0c020, 0x40a0ff, 0xff8040],
    fuera: 0x1fb0b0, obs: 'lava',
    fondo: (g) => {
      g.fillStyle(0x30c8c0).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA * 2 + H);
      for (let i = 0; i < 50; i++) g.fillStyle(0xbffff8, 0.6).fillRect(-FUERA + (i * 211) % (W + FUERA * 2), -GRADA - PISTA - 40 - (i * 37) % 600, 40, 4);
      for (let i = -1; i < 3; i++) volcan(g, W / 2 + i * 520 - 260, -GRADA - PISTA - 20, 260, 180 + (i % 2) * 60, 0x2a2626, 0x3a3434);
      // cactus de las islas
      for (let x = -500; x < W + 500; x += 210) {
        g.fillStyle(0x3a8a4a).fillRect(x, H + GRADA + PISTA + 30, 14, 70).fillRect(x - 16, H + GRADA + PISTA + 50, 10, 30).fillRect(x + 20, H + GRADA + PISTA + 40, 10, 34);
      }
    },
  },
  // Quito colonial: arcos blancos, tejados y cúpulas
  diamante: {
    cesped: [0x4f9a5a, 0x58a663], linea: 0xfffaf0, pista: 0x8a8070, muro: 0xf0ece0, gradas: [0xf0ece0, 0xd8d0c0], publico: [0xf0c020, 0x2a6ae0, 0xe03030, 0x3a3a50, 0xffffff],
    fuera: 0x8a8070, obs: 'fuente',
    fondo: (g) => {
      g.fillStyle(0x8ac0f0).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA - GRADA - PISTA - 40);
      for (let x = -700; x < W + 700; x += 260) {
        const y = -GRADA - PISTA - 10;
        g.fillStyle(0xf4f0e6).fillRect(x, y - 160, 180, 160);
        g.fillStyle(0xb04a30).fillTriangle(x - 10, y - 160, x + 190, y - 160, x + 90, y - 210);
        for (let k = 0; k < 3; k++) g.fillStyle(0x6a5a50).fillRect(x + 20 + k * 55, y - 120, 30, 46);
      }
      // la Basílica: dos torres y una cúpula
      const bx = W / 2;
      g.fillStyle(0x9a948a).fillRect(bx - 160, -GRADA - PISTA - 420, 60, 400).fillRect(bx + 100, -GRADA - PISTA - 420, 60, 400);
      g.fillStyle(0x7a746a).fillTriangle(bx - 170, -GRADA - PISTA - 420, bx - 90, -GRADA - PISTA - 420, bx - 130, -GRADA - PISTA - 500)
        .fillTriangle(bx + 90, -GRADA - PISTA - 420, bx + 170, -GRADA - PISTA - 420, bx + 130, -GRADA - PISTA - 500);
      g.fillStyle(0xa8a298).fillRect(bx - 100, -GRADA - PISTA - 300, 200, 280);
      g.fillStyle(0x3a8a8a).fillCircle(bx, -GRADA - PISTA - 300, 70);
    },
  },
  // Chimborazo: glaciar y la montaña más cercana al sol
  maestro: {
    cesped: [0xa8d0e8, 0xb4dcf0], linea: 0x2a5a8a, pista: 0xf4faff, muro: 0xd0e8f8, gradas: [0xc0dcf0, 0xa8c8e0], publico: [0xe03030, 0x2a6ae0, 0xf0c020, 0x2a2a3a, 0xff8040],
    fuera: 0xeaf6ff, obs: 'hielo',
    fondo: (g) => {
      g.fillStyle(0x6ab0e8).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA - GRADA - PISTA - 60);
      volcan(g, W / 2 + 80, -GRADA - PISTA - 30, 900, 640, 0x8a90a8, 0xffffff);
      volcan(g, -300, -GRADA - PISTA - 30, 380, 280, 0x9aa0b8, 0xffffff);
      for (let i = 0; i < 60; i++) g.fillStyle(0xffffff, 0.8).fillCircle(-FUERA + (i * 173) % (W + FUERA * 2), -FUERA + (i * 97) % FUERA, 3);
    },
  },
  // Mitad del Mundo: noche, el monumento y la línea ecuatorial
  campeon: {
    cesped: [0x2e6a3e, 0x347446], linea: 0xf4f0e0, pista: 0x2a2440, muro: 0x3a3060, gradas: [0x2a2448, 0x221c3c], publico: [0xf0c020, 0x2a6ae0, 0xe03030, 0xffffff, 0xff60c0],
    fuera: 0x141030, noche: true, obs: 'pilar',
    fondo: (g) => {
      g.fillStyle(0x0c0a24).fillRect(-FUERA, -FUERA, W + FUERA * 2, FUERA * 2 + H);
      for (let i = 0; i < 140; i++) g.fillStyle(0xffffff, 0.3 + (i % 5) / 8).fillRect(-FUERA + (i * 131) % (W + FUERA * 2), -FUERA + (i * 71) % (FUERA - GRADA), 3, 3);
      // el monumento: torre trapezoidal con el globo terráqueo encima
      const mx = W / 2, my = -GRADA - PISTA - 20;
      g.fillStyle(0x8a7a60).fillPoints([{ x: mx - 90, y: my }, { x: mx + 90, y: my }, { x: mx + 60, y: my - 300 }, { x: mx - 60, y: my - 300 }] as any, true);
      g.fillStyle(0xa8987a).fillPoints([{ x: mx - 90, y: my }, { x: mx - 20, y: my }, { x: mx - 14, y: my - 300 }, { x: mx - 60, y: my - 300 }] as any, true);
      g.fillStyle(0xd8a838).fillCircle(mx, my - 350, 52);
      g.lineStyle(4, 0x8a6418).strokeCircle(mx, my - 350, 52).lineBetween(mx - 52, my - 350, mx + 52, my - 350).strokeEllipse(mx, my - 350, 50, 104);
    },
  },
};

export interface Estadio { animar: (t: number) => void; vitorear: () => void }

/** Dibuja el estadio de una liga y devuelve controles para animar al público. */
export function dibujarEstadio(s: Phaser.Scene, liga: string, obstaculos: Obstaculo[]): Estadio {
  const tema = TEMAS[liga] ?? TEMAS.bronce;
  const rnd = new Phaser.Math.RandomDataGenerator(['estadio-' + liga]);
  // exterior y paisaje
  const ext = s.add.graphics().setDepth(-30);
  ext.fillStyle(tema.fuera).fillRect(-FUERA, -FUERA, W + FUERA * 2, H + FUERA * 2);
  tema.fondo(ext, s);
  // gradas: cuatro lados escalonados
  const gr = s.add.graphics().setDepth(-20);
  const bloque = (x: number, y: number, w: number, h: number, vertical: boolean) => {
    const filas = 7;
    for (let i = 0; i < filas; i++) {
      const c = i % 2 ? tema.gradas[0] : tema.gradas[1];
      if (vertical) gr.fillStyle(c).fillRect(x + (w / filas) * i, y, w / filas + 1, h);
      else gr.fillStyle(c).fillRect(x, y + (h / filas) * i, w, h / filas + 1);
    }
  };
  bloque(-GRADA - PISTA, -GRADA - PISTA, W + (GRADA + PISTA) * 2, GRADA, false); // arriba
  bloque(-GRADA - PISTA, H + PISTA, W + (GRADA + PISTA) * 2, GRADA, false); // abajo
  bloque(-GRADA - PISTA, -PISTA, GRADA, H + PISTA * 2, true); // izquierda
  bloque(W + PISTA, -PISTA, GRADA, H + PISTA * 2, true); // derecha
  // público en dos capas que se alternan (así salta)
  const capas = [s.add.graphics().setDepth(-19), s.add.graphics().setDepth(-19)];
  const persona = (x: number, y: number) => {
    const c = rnd.pick(tema.publico);
    const capa = capas[rnd.between(0, 1)];
    capa.fillStyle(0x000000, 0.25).fillRect(x, y + 6, 6, 3);
    capa.fillStyle(c).fillRect(x, y + 2, 6, 6); // camiseta
    capa.fillStyle(rnd.pick([0xf0c8a0, 0xc89060, 0x8a5a3a, 0x5a3a2a])).fillRect(x + 1, y - 2, 4, 4); // cabeza
  };
  for (let y = -GRADA - PISTA + 10; y < -PISTA - 14; y += 15) for (let x = -GRADA - PISTA + 6; x < W + GRADA + PISTA - 6; x += 9) if (rnd.frac() < 0.82) persona(x + rnd.between(-1, 1), y);
  for (let y = H + PISTA + 14; y < H + PISTA + GRADA - 10; y += 15) for (let x = -GRADA - PISTA + 6; x < W + GRADA + PISTA - 6; x += 9) if (rnd.frac() < 0.82) persona(x + rnd.between(-1, 1), y);
  for (let x = -GRADA - PISTA + 8; x < -PISTA - 12; x += 13) for (let y = -PISTA + 10; y < H + PISTA - 8; y += 11) if (rnd.frac() < 0.75) persona(x, y);
  for (let x = W + PISTA + 12; x < W + PISTA + GRADA - 8; x += 13) for (let y = -PISTA + 10; y < H + PISTA - 8; y += 11) if (rnd.frac() < 0.75) persona(x, y);
  // pista, muro y campo
  const g = s.add.graphics().setDepth(0);
  g.fillStyle(tema.muro).fillRect(-PISTA - 8, -PISTA - 8, W + PISTA * 2 + 16, H + PISTA * 2 + 16);
  g.fillStyle(tema.pista).fillRect(-PISTA, -PISTA, W + PISTA * 2, H + PISTA * 2);
  // banderines con los colores de Ecuador a lo largo del muro
  const ban = [0xffd100, 0x0034a0, 0xce1126];
  for (let x = -PISTA; x < W + PISTA; x += 22) {
    const c = ban[Math.floor((x + PISTA) / 22) % 3];
    g.fillStyle(c).fillTriangle(x, -PISTA - 8, x + 18, -PISTA - 8, x + 9, -PISTA + 6);
    g.fillStyle(c).fillTriangle(x, H + PISTA + 8, x + 18, H + PISTA + 8, x + 9, H + PISTA - 6);
  }
  // terreno natural (nada de líneas de fútbol): cada liga, un paisaje de Ecuador
  pintarTerreno(s, g, liga, rnd);
  // borde de rocas alrededor del campo
  const borde = s.add.graphics().setDepth(1);
  const piedras = TERRENO_BORDE[liga] ?? [0x6a6070, 0x8a8090];
  for (let k = 0; k < 2; k++) {
    const lados: [number, number, number, number][] = [[0, 0, W, 0], [0, H, W, H], [0, 0, 0, H], [W, 0, W, H]];
    for (const [x0, y0, x1, y1] of lados) {
      const L = Math.hypot(x1 - x0, y1 - y0);
      for (let d = 0; d < L; d += 16) {
        const x = x0 + ((x1 - x0) * d) / L + rnd.between(-5, 5), y = y0 + ((y1 - y0) * d) / L + rnd.between(-5, 5);
        const r = rnd.between(8, 14) - k * 4;
        borde.fillStyle(0x000000, 0.25).fillCircle(x + 2, y + 3, r);
        borde.fillStyle(piedras[k]).fillCircle(x, y, r);
      }
    }
  }
  if (liga === 'campeon') {
    // la línea ecuatorial cruza el campo: 0° 0' 0''
    g.fillStyle(0xd8a838, 0.95).fillRect(W / 2 - 7, -PISTA, 14, H + PISTA * 2);
    g.fillStyle(0xce1126, 0.9).fillRect(W / 2 - 2, -PISTA, 4, H + PISTA * 2);
    s.add.text(W / 2 + 14, H - 30, "LATITUD 0° 0' 0''", { fontFamily: 'Lilita One', fontSize: '18px', color: '#ffe8a0' }).setDepth(1).setAlpha(0.8);
  }
  // obstáculos temáticos
  for (const o of obstaculos) obstaculo(s, o, tema.obs);
  // focos en las esquinas
  const luces: Phaser.GameObjects.Image[] = [];
  if (!s.textures.exists('cono_luz')) {
    const c = s.make.graphics({}, false);
    for (let i = 10; i > 0; i--) c.fillStyle(0xffffff, 0.03).fillTriangle(64 - i * 6, 256, 64 + i * 6, 256, 64, 0);
    c.generateTexture('cono_luz', 128, 256);
    c.destroy();
  }
  const esquinas: [number, number, number][] = [[-PISTA - 60, -PISTA - 60, 2.4], [W + PISTA + 60, -PISTA - 60, -2.4], [-PISTA - 60, H + PISTA + 60, 0.75], [W + PISTA + 60, H + PISTA + 60, -0.75]];
  for (const [x, y, rot] of esquinas) {
    const tg = s.add.graphics().setDepth(-18);
    tg.fillStyle(0x4a4a5a).fillRect(x - 5, y - 70, 10, 70);
    tg.fillStyle(0x2a2a36).fillRect(x - 22, y - 92, 44, 26);
    for (let k = 0; k < 4; k++) tg.fillStyle(0xfff8d0).fillRect(x - 19 + k * 10, y - 89, 8, 8);
    const cono = s.add.image(x, y - 80, 'cono_luz').setOrigin(0.5, 0).setRotation(rot + Math.PI).setBlendMode('ADD').setDepth(1).setScale(2.2, 3.4).setAlpha(tema.noche ? 0.85 : 0.35);
    luces.push(cono);
  }
  if (tema.noche) {
    // oscurece un poco la escena: la luz cae sobre el campo
    s.add.rectangle(W / 2, H / 2, W + FUERA * 2, H + FUERA * 2, 0x0a0820, 0.25).setDepth(-17);
  }
  let vitoreo = 0;
  return {
    animar: (t) => {
      const rapido = t < vitoreo;
      const paso = Math.floor(t / (rapido ? 110 : 420)) % 2;
      capas[0].y = paso ? -2 : 0;
      capas[1].y = paso ? 0 : -2;
      if (rapido) for (const l of luces) l.setAlpha((tema.noche ? 0.85 : 0.35) + Math.sin(t / 60) * 0.12);
      if (tema.noche && Math.random() < 0.06) flash(s);
    },
    vitorear: () => { vitoreo = s.time.now + 1600; },
  };
}

/** Flashes de cámaras del público (estadios de noche). */
function flash(s: Phaser.Scene) {
  const lado = Math.random() < 0.5;
  const x = lado ? Phaser.Math.Between(-GRADA, W + GRADA) : Math.random() < 0.5 ? Phaser.Math.Between(-GRADA - PISTA, -PISTA) : Phaser.Math.Between(W + PISTA, W + PISTA + GRADA);
  const y = lado ? (Math.random() < 0.5 ? Phaser.Math.Between(-GRADA - PISTA, -PISTA - 10) : Phaser.Math.Between(H + PISTA + 10, H + PISTA + GRADA)) : Phaser.Math.Between(0, H);
  const f = s.add.image(x, y, 'bola').setDepth(-15).setBlendMode('ADD').setScale(1.2);
  s.tweens.add({ targets: f, alpha: 0, scale: 0.2, duration: 160, onComplete: () => f.destroy() });
}

function obstaculo(s: Phaser.Scene, o: Obstaculo, tipo: Obs) {
  const r = s.add.graphics().setDepth(o.y);
  if (o.k === 'muro') {
    // bloque de muralla (piedra tallada, como los muros incas)
    const w = o.r * 2 + 4, h = o.r * 1.5;
    r.fillStyle(0x000000, 0.3).fillRect(o.x - w / 2 + 3, o.y - 2, w, h * 0.7);
    r.fillStyle(0x6a6458).fillRect(o.x - w / 2, o.y - h, w, h + 6);
    r.fillStyle(0x8a8474).fillRect(o.x - w / 2, o.y - h - 10, w, h);
    r.fillStyle(0xa8a290).fillRect(o.x - w / 2 + 3, o.y - h - 8, w - 6, 4);
    r.lineStyle(2, 0x4a4438).strokeRect(o.x - w / 2, o.y - h - 10, w, h + 16).lineBetween(o.x - w / 2, o.y - h * 0.4, o.x + w / 2, o.y - h * 0.4);
    return;
  }
  r.fillStyle(0x000000, 0.25).fillEllipse(o.x + 4, o.y + o.r * 0.6, o.r * 2.2, o.r * 0.9);
  const piedra = (c0: number, c1: number, c2: number, borde: number) => {
    r.fillStyle(c0).fillCircle(o.x, o.y, o.r);
    r.fillStyle(c1).fillCircle(o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.65);
    r.fillStyle(c2).fillCircle(o.x - o.r * 0.4, o.y - o.r * 0.4, o.r * 0.25);
    r.lineStyle(3, borde).strokeCircle(o.x, o.y, o.r);
  };
  switch (tipo) {
    case 'tronco':
      r.fillStyle(0x5a3a20).fillCircle(o.x, o.y, o.r);
      r.fillStyle(0xb88a5a).fillCircle(o.x, o.y - 3, o.r * 0.8);
      r.lineStyle(2, 0x7a5030).strokeCircle(o.x, o.y - 3, o.r * 0.55).strokeCircle(o.x, o.y - 3, o.r * 0.3);
      r.fillStyle(0x3a8a3a).fillCircle(o.x + o.r * 0.6, o.y + o.r * 0.5, o.r * 0.3);
      r.lineStyle(3, 0x2a1a10).strokeCircle(o.x, o.y, o.r);
      break;
    case 'lava':
      piedra(0x2a2626, 0x3a3434, 0x4a4444, 0x120e0e);
      r.lineStyle(2, 0xff7a2a, 0.9).lineBetween(o.x - o.r * 0.5, o.y, o.x, o.y + o.r * 0.3).lineBetween(o.x, o.y + o.r * 0.3, o.x + o.r * 0.4, o.y - o.r * 0.1);
      break;
    case 'fuente':
      r.fillStyle(0xb8b0a0).fillCircle(o.x, o.y, o.r);
      r.fillStyle(0x4aa8ff).fillCircle(o.x, o.y, o.r * 0.75);
      r.fillStyle(0xdff6ff).fillCircle(o.x - o.r * 0.2, o.y - o.r * 0.2, o.r * 0.25);
      r.fillStyle(0x9a9284).fillRect(o.x - 4, o.y - o.r * 0.9, 8, o.r * 0.9);
      r.lineStyle(3, 0x6a6458).strokeCircle(o.x, o.y, o.r);
      break;
    case 'hielo':
      r.fillStyle(0x7ab8e8).fillPoints([{ x: o.x - o.r, y: o.y }, { x: o.x - o.r * 0.4, y: o.y - o.r * 1.4 }, { x: o.x + o.r * 0.2, y: o.y - o.r * 0.6 }, { x: o.x + o.r * 0.6, y: o.y - o.r * 1.6 }, { x: o.x + o.r, y: o.y }, { x: o.x, y: o.y + o.r * 0.5 }] as any, true);
      r.fillStyle(0xdff6ff).fillPoints([{ x: o.x - o.r * 0.6, y: o.y - o.r * 0.1 }, { x: o.x - o.r * 0.35, y: o.y - o.r * 1.1 }, { x: o.x - o.r * 0.1, y: o.y - o.r * 0.3 }] as any, true);
      r.lineStyle(2, 0x2a5a8a).strokePoints([{ x: o.x - o.r, y: o.y }, { x: o.x - o.r * 0.4, y: o.y - o.r * 1.4 }, { x: o.x + o.r * 0.2, y: o.y - o.r * 0.6 }, { x: o.x + o.r * 0.6, y: o.y - o.r * 1.6 }, { x: o.x + o.r, y: o.y }, { x: o.x, y: o.y + o.r * 0.5 }] as any, true);
      break;
    case 'pilar':
      r.fillStyle(0x8a6418).fillEllipse(o.x, o.y, o.r * 2, o.r);
      r.fillStyle(0xd8a838).fillRect(o.x - o.r * 0.6, o.y - o.r * 2, o.r * 1.2, o.r * 2);
      r.fillStyle(0xffe08a).fillRect(o.x - o.r * 0.6, o.y - o.r * 2, o.r * 0.35, o.r * 2);
      r.fillStyle(0xf0c860).fillEllipse(o.x, o.y - o.r * 2, o.r * 1.2, o.r * 0.6);
      break;
    case 'boya':
      r.fillStyle(0xe04040).fillCircle(o.x, o.y, o.r);
      r.fillStyle(0xffffff).fillRect(o.x - o.r, o.y - o.r * 0.2, o.r * 2, o.r * 0.4);
      r.fillStyle(0xff8a8a).fillCircle(o.x - o.r * 0.35, o.y - o.r * 0.4, o.r * 0.3);
      r.lineStyle(3, 0x6a1a1a).strokeCircle(o.x, o.y, o.r);
      break;
    default:
      piedra(0x6e6a7a, 0x908ca0, 0xb8b4c4, 0x2a2436);
  }
}

// ------------------------------------------------------------------ terrenos
const TERRENO_BORDE: Record<string, [number, number]> = {
  bronce: [0xb8a070, 0xd8c090], plata: [0x4a3a2a, 0x2a5a2a], oro: [0x3a3232, 0x5a5050], platino: [0x1a1616, 0x3a3434],
  diamante: [0x7a7464, 0x9a9484], maestro: [0xa8c4dc, 0xeaf6ff], campeon: [0x8a6a38, 0xb89a5a],
};

/** Manchas irregulares del suelo. */
function manchas(g: Phaser.GameObjects.Graphics, rnd: Phaser.Math.RandomDataGenerator, colores: number[], n: number, rmin: number, rmax: number, alpha = 1) {
  for (let i = 0; i < n; i++) {
    const x = rnd.between(0, W), y = rnd.between(0, H), r = rnd.between(rmin, rmax);
    g.fillStyle(rnd.pick(colores), alpha).fillEllipse(x, y, r * 2, r * 1.2);
    // simétrico: el campo es justo para los dos lados
    g.fillStyle(rnd.pick(colores), alpha).fillEllipse(W - x, H - y, r * 2, r * 1.2);
  }
}
/** Charco o laguna con borde. */
function charco(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, borde: number, agua: number, brillo: number) {
  g.fillStyle(borde).fillEllipse(x, y, w + 10, h + 8);
  g.fillStyle(agua).fillEllipse(x, y, w, h);
  g.fillStyle(brillo, 0.6).fillEllipse(x - w * 0.18, y - h * 0.15, w * 0.35, h * 0.2);
}
/** Grieta que zigzaguea (con brillo de lava o de hielo). */
function grieta(g: Phaser.GameObjects.Graphics, rnd: Phaser.Math.RandomDataGenerator, x: number, y: number, ang: number, largo: number, color: number, brillo: number) {
  const pts: [number, number][] = [[x, y]];
  for (let d = 30; d < largo; d += 30) { ang += rnd.realInRange(-0.6, 0.6); const [px, py] = pts[pts.length - 1]; pts.push([px + Math.cos(ang) * 30, py + Math.sin(ang) * 30]); }
  for (const [ancho, c, a] of [[9, color, 0.5], [4, brillo, 0.95]] as const) {
    g.lineStyle(ancho, c, a).beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.strokePath();
  }
}

function pintarTerreno(s: Phaser.Scene, g: Phaser.GameObjects.Graphics, liga: string, rnd: Phaser.Math.RandomDataGenerator) {
  const fondo: Record<string, number> = { bronce: 0xe6cf98, plata: 0x3f7a3a, oro: 0x5c524a, platino: 0x302b2b, diamante: 0x948c7c, maestro: 0xe2f0fa, campeon: 0xb89a5a };
  g.fillStyle(fondo[liga] ?? 0x4c9a4c).fillRect(0, 0, W, H);
  switch (liga) {
    case 'bronce': // playa: arena, charcas de marea y conchas
      manchas(g, rnd, [0xd8bc80, 0xf0dcae, 0xdcc48c], 22, 30, 90, 0.8);
      charco(g, W * 0.3, H * 0.2, 150, 60, 0xc8a870, 0x3aa8d0, 0xbff0ff);
      charco(g, W * 0.7, H * 0.8, 150, 60, 0xc8a870, 0x3aa8d0, 0xbff0ff);
      for (let i = 0; i < 70; i++) g.fillStyle(rnd.pick([0xffffff, 0xf0a8a0, 0xc0a070]), 0.9).fillCircle(rnd.between(0, W), rnd.between(0, H), rnd.between(2, 4));
      break;
    case 'plata': { // selva: barro, hierba alta y un río que cruza por el centro
      manchas(g, rnd, [0x356a32, 0x4c8a44, 0x2f6030], 26, 30, 80, 0.9);
      manchas(g, rnd, [0x6a4a2a, 0x5a3e24], 6, 30, 60, 0.7);
      const rio = (off: number, c: number, ancho: number) => {
        g.fillStyle(c);
        for (let y = -10; y < H + 10; y += 6) { const x = W / 2 + Math.sin(y / 70) * 50 + off; g.fillRect(x - ancho / 2, y, ancho, 7); }
      };
      rio(0, 0x5a4a2a, 92); rio(0, 0x2a7aa8, 76); rio(-10, 0x4aa0c8, 30);
      for (let i = 0; i < 10; i++) { const y = rnd.between(20, H - 20), x = W / 2 + Math.sin(y / 70) * 50 + rnd.between(-25, 25); g.fillStyle(0x3a9a3a).fillCircle(x, y, 7); g.fillStyle(0xf0a0c0).fillCircle(x + 2, y - 2, 2); }
      for (let i = 0; i < 160; i++) { const x = rnd.between(0, W), y = rnd.between(0, H); g.fillStyle(0x6ac05a, 0.8).fillTriangle(x, y, x + 3, y - 9, x + 6, y); }
      break;
    }
    case 'oro': // volcán: ceniza, rocas sueltas y grietas de lava
      manchas(g, rnd, [0x4a4038, 0x6a6058, 0x544a42], 26, 30, 90, 0.85);
      for (let i = 0; i < 4; i++) { const x = rnd.between(80, W / 2 - 60), y = rnd.between(60, H - 60), a = rnd.realInRange(0, 6.28); grieta(g, rnd, x, y, a, 200, 0xff4a10, 0xffc040); grieta(g, rnd, W - x, H - y, a + Math.PI, 200, 0xff4a10, 0xffc040); }
      for (let i = 0; i < 90; i++) g.fillStyle(rnd.pick([0x2a2422, 0x8a8078]), 0.9).fillCircle(rnd.between(0, W), rnd.between(0, H), rnd.between(2, 5));
      break;
    case 'platino': // Galápagos: roca volcánica negra, pozas turquesa y musgo
      manchas(g, rnd, [0x3a3434, 0x262222, 0x443c3c], 30, 25, 80, 0.9);
      charco(g, W * 0.25, H * 0.75, 120, 54, 0x1a1616, 0x2ac8c0, 0xbffff8);
      charco(g, W * 0.75, H * 0.25, 120, 54, 0x1a1616, 0x2ac8c0, 0xbffff8);
      charco(g, W * 0.5, H * 0.5, 80, 36, 0x1a1616, 0x2ac8c0, 0xbffff8);
      for (let i = 0; i < 60; i++) g.fillStyle(rnd.pick([0x4a8a3a, 0x6aa84a]), 0.8).fillCircle(rnd.between(0, W), rnd.between(0, H), rnd.between(3, 7));
      break;
    case 'diamante': { // Quito colonial: plaza de piedra con baldosas
      for (let y = 0; y < H; y += 40) for (let x = 0; x < W; x += 40) {
        g.fillStyle(((x + y) / 40) % 2 ? 0x9a9284 : 0x8a8274).fillRect(x + 1, y + 1, 38, 38);
        g.fillStyle(0xffffff, 0.06).fillRect(x + 3, y + 3, 16, 6);
      }
      g.lineStyle(10, 0xa8a090, 0.8).strokeCircle(W / 2, H / 2, 110);
      g.lineStyle(4, 0x7a7262, 0.9).strokeCircle(W / 2, H / 2, 110);
      break;
    }
    case 'maestro': // Chimborazo: nieve, lagos helados y grietas de hielo
      manchas(g, rnd, [0xf4faff, 0xcfe4f4, 0xffffff], 26, 30, 90, 0.9);
      charco(g, W * 0.32, H * 0.3, 190, 80, 0xf4faff, 0x9fd0f0, 0xffffff);
      charco(g, W * 0.68, H * 0.7, 190, 80, 0xf4faff, 0x9fd0f0, 0xffffff);
      for (let i = 0; i < 3; i++) { const x = rnd.between(80, W / 2 - 60), y = rnd.between(60, H - 60), a = rnd.realInRange(0, 6.28); grieta(g, rnd, x, y, a, 160, 0x6aa0c8, 0xdff4ff); grieta(g, rnd, W - x, H - y, a + Math.PI, 160, 0x6aa0c8, 0xdff4ff); }
      break;
    case 'campeon': { // tierra sagrada: piedra dorada con un anillo de piedra inca
      manchas(g, rnd, [0xa88a4a, 0xc8aa6a, 0xb09050], 26, 30, 90, 0.85);
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        g.fillStyle(k % 2 ? 0x8a6a38 : 0x9a7a44).fillRoundedRect(W / 2 + Math.cos(a) * 150 - 14, H / 2 + Math.sin(a) * 150 - 10, 28, 20, 4);
      }
      g.fillStyle(0xd8a838, 0.25).fillCircle(W / 2, H / 2, 120);
      break;
    }
    default:
      manchas(g, rnd, [0x55a655, 0x4c9a4c], 30, 30, 80, 0.8);
  }
  void s;
}
