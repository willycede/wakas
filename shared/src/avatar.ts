// Avatar del Entrenador: eliges uno de los entrenadores ilustrados (assets/entrenadores/<n>.png)
// y le cambias los colores de piel, pelo, gorra, ropa de arriba, de abajo y zapatos.

export interface Avatar {
  modelo: number;
  // índice en la paleta de cada zona; sin valor = colores originales del entrenador
  piel?: number;
  pelo?: number;
  gorra?: number;
  arriba?: number;
  abajo?: number;
  zapatos?: number;
  lider?: string; // solo los líderes del Modo Historia: su propio dibujo (assets/lideres/<id>.png)
}

export const NUM_ENTRENADORES = 16;
export type ZonaAvatar = 'piel' | 'pelo' | 'gorra' | 'arriba' | 'abajo' | 'zapatos';
export const ZONAS_AVATAR: ZonaAvatar[] = ['piel', 'pelo', 'gorra', 'arriba', 'abajo', 'zapatos'];

const ROPA = ['#d8323c', '#f07a22', '#f2c230', '#3aa846', '#1fb3a6', '#3a9ee8', '#2f55c8', '#8a4ad8', '#ec5fa6', '#eeeeee', '#7d7d86', '#2a2a30', '#8a5530'];
export const PALETAS: Record<ZonaAvatar, string[]> = {
  piel: ['#f6d7c3', '#eebd98', '#d69a6c', '#b87a4e', '#8a5534', '#5e3822'],
  pelo: ['#1e1a1e', '#5a3420', '#9a6236', '#e8c25a', '#c8501e', '#dcdce6', '#f07ab8', '#3c78e0', '#3cb46e', '#9050d8'],
  gorra: ROPA,
  arriba: ROPA,
  abajo: ROPA,
  zapatos: ROPA,
};

export function avatarValido(a: unknown): Avatar | null {
  if (!a || typeof a !== 'object') return null;
  const o = a as Record<string, unknown>;
  const m = Math.floor(Number(o.modelo));
  if (!Number.isFinite(m) || m < 0 || m >= NUM_ENTRENADORES) return null;
  const r: Avatar = { modelo: m };
  for (const z of ZONAS_AVATAR) {
    if (o[z] === undefined || o[z] === null) continue;
    const v = Math.floor(Number(o[z]));
    if (!Number.isFinite(v) || v < 0 || v >= PALETAS[z].length) return null;
    r[z] = v;
  }
  return r;
}

/** Entrenador al azar pero estable para cada número (cuentas nuevas y rivales de la IA). */
export function avatarAleatorio(semilla: number): Avatar {
  const s = (Math.abs(Math.floor(semilla)) * 2654435761) % 4294967296;
  return { modelo: s % NUM_ENTRENADORES };
}
