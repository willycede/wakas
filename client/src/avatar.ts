// Avatar del Entrenador: un entrenador ilustrado en pixel art (assets/entrenadores/<n>.png).

import type { Avatar } from '../../shared/src';
import { V } from './api';

export const avatarUrl = (a: Avatar) => `entrenadores/${a.modelo}.png${V}`;

/** Retrato: la parte de arriba del entrenador, recortada en círculo con CSS. */
export function retrato(a: Avatar, cls = '') {
  return `<span class="retrato ${cls}"><img src="${avatarUrl(a)}" alt=""></span>`;
}
