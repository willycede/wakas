// Movimiento en la arena: lo usan el servidor y la predicción del cliente (deben coincidir).

import { ESPECIES, HABILIDADES } from './data';
import { ARENA, RADIO_PRIMAL, type Obstaculo } from './protocol';

export function moverEnArena(x: number, y: number, dx: number, dy: number, obs: Obstaculo[]): { x: number; y: number } {
  let nx = Math.max(RADIO_PRIMAL, Math.min(ARENA.w - RADIO_PRIMAL, x + dx));
  let ny = Math.max(RADIO_PRIMAL, Math.min(ARENA.h - RADIO_PRIMAL, y + dy));
  for (const o of obs) {
    const d = Math.hypot(nx - o.x, ny - o.y);
    const min = o.r + RADIO_PRIMAL;
    if (d < min && d > 0.01) {
      nx = o.x + ((nx - o.x) / d) * min;
      ny = o.y + ((ny - o.y) / d) * min;
    }
  }
  return { x: nx, y: ny };
}

/** Bits de estado de UnidadSnap.st que afectan a la velocidad. */
export const ST = { quemadura: 1, paralisis: 2, lento: 4, veneno: 8, invulnerable: 16, mejora: 32, rapido: 64, frenado: 128 };

/** Velocidad (px/s) de una especie según sus estados. */
export function velocidadMover(esp: string, base: number, st: number): number {
  if (st & ST.paralisis) return 0;
  let v = base;
  v *= HABILIDADES[ESPECIES[esp]?.habilidad]?.vel ?? 1;
  if (st & ST.rapido) v *= 1.4;
  if (st & ST.lento) v *= 0.6;
  if (st & ST.frenado) v *= 0.35; // al atacar se frena
  return v;
}
