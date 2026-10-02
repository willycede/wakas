// Avatar del Entrenador: un entrenador ilustrado en pixel art (assets/entrenadores/<n>.png) al que se le
// cambian los colores por zonas (assets/entrenadores/zonas/<n>.png, generado por zonas.py).
// Las imágenes se pintan con los colores originales y, si el avatar tiene colores propios, se reemplazan
// en cuanto el lienzo recoloreado está listo (cualquier <img data-av> que aparezca en la página).

import { PALETAS, ZONAS_AVATAR, type Avatar, type ZonaAvatar } from '../../shared/src';
import { V } from './api';
import ZONAS from './zonas_entrenadores.json';

type Tipo = 'cuerpo' | 'retrato';

/** Zonas que se pueden recolorear en cada entrenador (no todos tienen gorra, por ejemplo). */
export const zonasDe = (modelo: number): ZonaAvatar[] => ((ZONAS as Record<string, string[]>)[modelo] ?? []) as ZonaAvatar[];
const tieneColores = (a: Avatar) => ZONAS_AVATAR.some((z) => a[z] !== undefined);
const clave = (a: Avatar) => [a.modelo, ...ZONAS_AVATAR.map((z) => a[z] ?? '')].join('.');
function desdeClave(k: string): Avatar {
  const p = k.split('.');
  const a: Avatar = { modelo: Number(p[0]) };
  ZONAS_AVATAR.forEach((z, i) => { if (p[i + 1] !== '' && p[i + 1] !== undefined) a[z] = Number(p[i + 1]); });
  return a;
}
const base = (m: number, tipo: Tipo) => (tipo === 'cuerpo' ? `entrenadores/${m}.png${V}` : `entrenadores/retratos/${m}.png${V}`);
const mapa = (m: number, tipo: Tipo) => (tipo === 'cuerpo' ? `entrenadores/zonas/${m}.png${V}` : `entrenadores/retratos/${m}_z.png${V}`);

export const avatarUrl = (a: Avatar) => base(a.modelo, 'cuerpo');

const imagenes = new Map<string, Promise<HTMLImageElement>>();
function cargar(url: string) {
  let p = imagenes.get(url);
  if (!p) {
    p = new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
    imagenes.set(url, p);
  }
  return p;
}

function aHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, max ? d / max : 0, max];
}
function aRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
const lim = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const lienzos = new Map<string, Promise<HTMLCanvasElement>>();
/** El entrenador con sus colores, en un lienzo del tamaño del sprite. */
export function lienzoAvatar(a: Avatar, tipo: Tipo = 'cuerpo'): Promise<HTMLCanvasElement> {
  const k = `${tipo}:${clave(a)}`;
  let p = lienzos.get(k);
  if (!p) {
    p = Promise.all([cargar(base(a.modelo, tipo)), cargar(mapa(a.modelo, tipo))]).then(([img, zon]) => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(zon, 0, 0);
      const z = ctx.getImageData(0, 0, c.width, c.height).data;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      // promedio de saturación y brillo de cada zona: el nuevo color conserva las luces y sombras
      const suma = Array.from({ length: 7 }, () => [0, 0, 0]);
      for (let i = 0; i < px.length; i += 4) {
        const zi = z[i + 3] > 0 ? z[i] : 0;
        if (!zi || px[i + 3] === 0) continue;
        const [, s, v] = aHsv(px[i], px[i + 1], px[i + 2]);
        suma[zi][0] += s; suma[zi][1] += v; suma[zi][2]++;
      }
      const destino = ZONAS_AVATAR.map((zn) => {
        const idx = a[zn];
        if (idx === undefined) return null;
        const hex = PALETAS[zn][idx];
        return aHsv(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
      });
      for (let i = 0; i < px.length; i += 4) {
        const zi = z[i + 3] > 0 ? z[i] : 0;
        const t = zi ? destino[zi - 1] : null;
        if (!t || px[i + 3] === 0) continue;
        const [, s, v] = aHsv(px[i], px[i + 1], px[i + 2]);
        const n = suma[zi][2], ms = suma[zi][0] / n, mv = suma[zi][1] / n;
        const [r, g, b] = aRgb(t[0], lim(t[1] + (s - ms) * 0.6), lim(t[2] + (v - mv) * 0.9, 0.05, 1));
        px[i] = r; px[i + 1] = g; px[i + 2] = b;
      }
      ctx.putImageData(d, 0, 0);
      return c;
    });
    lienzos.set(k, p);
  }
  return p;
}

const urls = new Map<string, Promise<string>>();
function urlColor(a: Avatar, tipo: Tipo) {
  const k = `${tipo}:${clave(a)}`;
  let p = urls.get(k);
  if (!p) { p = lienzoAvatar(a, tipo).then((c) => c.toDataURL()); urls.set(k, p); }
  return p;
}

/** <img> del entrenador de cuerpo entero (se recolorea solo). */
export function imgAvatar(a: Avatar, attrs = '') {
  return `<img src="${base(a.modelo, 'cuerpo')}" data-av="${clave(a)}" data-tipo="cuerpo" alt="" ${attrs}>`;
}

/** Retrato redondo: la cara del entrenador en pixel art. */
export function retrato(a: Avatar, cls = '') {
  return `<span class="retrato ${cls}"><img src="${base(a.modelo, 'retrato')}" data-av="${clave(a)}" data-tipo="retrato" alt=""></span>`;
}

// pone los colores a cada imagen de avatar que aparezca en la página
function rellenar() {
  document.querySelectorAll<HTMLImageElement>('img[data-av]:not([data-listo])').forEach((img) => {
    img.dataset.listo = '1';
    const k = img.dataset.av!;
    const a = desdeClave(k);
    if (!tieneColores(a)) return;
    void urlColor(a, img.dataset.tipo as Tipo).then((u) => { if (img.dataset.av === k) img.src = u; }).catch(() => {});
  });
}
let pendiente = false;
new MutationObserver(() => {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => { pendiente = false; rellenar(); });
}).observe(document.documentElement, { childList: true, subtree: true });
