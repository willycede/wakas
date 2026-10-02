// Avatar del Entrenador: eliges uno de los entrenadores ilustrados (assets/entrenadores/<n>.png),
// al estilo de los sprites de entrenador de las consolas portátiles.

export interface Avatar {
  modelo: number;
}

export const NUM_ENTRENADORES = 16;
export const OPCIONES_AVATAR = { modelo: NUM_ENTRENADORES };

export function avatarValido(a: unknown): Avatar | null {
  if (!a || typeof a !== 'object') return null;
  const m = Math.floor(Number((a as Record<string, unknown>).modelo));
  return Number.isFinite(m) && m >= 0 && m < NUM_ENTRENADORES ? { modelo: m } : null;
}

/** Entrenador al azar pero estable para cada número (cuentas nuevas y rivales de la IA). */
export function avatarAleatorio(semilla: number): Avatar {
  const s = (Math.abs(Math.floor(semilla)) * 2654435761) % 4294967296;
  return { modelo: s % NUM_ENTRENADORES };
}
