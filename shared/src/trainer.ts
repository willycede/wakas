// Progreso del Domador: niveles, ligas por trofeos, medallas y habilidades de entrenador.

export const NIVEL_MAX_DOMADOR = 50;

export function xpDomador(n: number) {
  return 100 + 50 * n;
}

export interface Liga { id: string; nombre: string; trofeos: number; color: string; icono: string; arena: string; nivelMax: number }
export const LIGAS: Liga[] = [
  { id: 'bronce', nombre: 'Liga Bronce', trofeos: 0, color: '#c98a52', icono: '🥉', arena: 'Estadio Malecón', nivelMax: 12 },
  { id: 'plata', nombre: 'Liga Plata', trofeos: 400, color: '#c8d0dc', icono: '🥈', arena: 'Coliseo Amazónico', nivelMax: 16 },
  { id: 'oro', nombre: 'Liga Oro', trofeos: 1000, color: '#ffcf4a', icono: '🥇', arena: 'Arena Cotopaxi', nivelMax: 20 },
  { id: 'platino', nombre: 'Liga Platino', trofeos: 1800, color: '#7ff0e0', icono: '💠', arena: 'Estadio Galápagos', nivelMax: 25 },
  { id: 'diamante', nombre: 'Liga Diamante', trofeos: 2800, color: '#7ab8ff', icono: '💎', arena: 'Plaza Quito Colonial', nivelMax: 30 },
  { id: 'maestro', nombre: 'Liga Maestro', trofeos: 4000, color: '#c77dff', icono: '👑', arena: 'Glaciar Chimborazo', nivelMax: 35 },
  { id: 'campeon', nombre: 'Liga Campeón', trofeos: 5500, color: '#ff5a6a', icono: '🏆', arena: 'Mitad del Mundo', nivelMax: 40 },
];

/** En la Liga, los Primales pelean como mucho al nivel máximo de la liga: así un jugador nuevo no
 * se cruza con Primales de nivel 40 y los veteranos no pueden abusar en ligas bajas. */
export function nivelEnLiga(nivel: number, trofeos: number) {
  return Math.min(nivel, ligaDe(trofeos).nivelMax);
}

export function ligaDe(trofeos: number): Liga {
  let l = LIGAS[0];
  for (const x of LIGAS) if (trofeos >= x.trofeos) l = x;
  return l;
}

/** Medallas: se ganan venciendo a los líderes de gimnasio del Modo Historia (ver historia.ts). */
export interface Medalla { id: string; nombre: string; icono: string; desc: string }
export const MEDALLAS: Medalla[] = [
  { id: 'brasa', nombre: 'Medalla Brasa', icono: '🔥', desc: 'Venciste a Nina en Baños de Agua Santa.' },
  { id: 'oleaje', nombre: 'Medalla Oleaje', icono: '🌊', desc: 'Venciste a Yaku en Montañita.' },
  { id: 'brote', nombre: 'Medalla Brote', icono: '🌱', desc: 'Venciste a Sacha en Mindo.' },
  { id: 'voltio', nombre: 'Medalla Voltio', icono: '⚡', desc: 'Venciste a Illapa en Guayaquil.' },
  { id: 'roca', nombre: 'Medalla Roca', icono: '🪨', desc: 'Venciste a Rumi en Ingapirca.' },
  { id: 'vendaval', nombre: 'Medalla Vendaval', icono: '🌪️', desc: 'Venciste a Wayra en el Quilotoa.' },
  { id: 'umbral', nombre: 'Medalla Umbral', icono: '🌑', desc: 'Venciste a Tuta en la Cueva de los Tayos.' },
  { id: 'nevado', nombre: 'Medalla Nevado', icono: '❄️', desc: 'Venciste a Rasu en el Chimborazo.' },
];
/** Cada medalla da +3% de experiencia a tus Primales. */
export const BONO_MEDALLA_XP = 0.03;

export interface HabilidadDomador { id: string; nombre: string; icono: string; max: number; porNivel: number; desc: string }
export const HABILIDADES_DOMADOR: HabilidadDomador[] = [
  { id: 'entrenador', nombre: 'Entrenador nato', icono: '📈', max: 5, porNivel: 0.06, desc: '+6% de experiencia para tus Primales por nivel.' },
  { id: 'negociante', nombre: 'Negociante', icono: '🪙', max: 5, porNivel: 0.08, desc: '+8% de monedas por batalla por nivel.' },
  { id: 'vinculo', nombre: 'Vínculo', icono: '❤️', max: 5, porNivel: 0.03, desc: '+3% de vida para todo tu equipo por nivel.' },
  { id: 'relevo', nombre: 'Relevo veloz', icono: '🔁', max: 5, porNivel: 0.4, desc: '-0,4 s de espera para cambiar de Primal por nivel.' },
  { id: 'instinto', nombre: 'Instinto', icono: '🎯', max: 5, porNivel: 0.04, desc: '-4% de recarga de movimientos por nivel.' },
  { id: 'capturador', nombre: 'Capturador', icono: '🕸️', max: 5, porNivel: 0.08, desc: '-8% del costo de las capturas por nivel.' },
];

/** Puntos de habilidad: uno por cada nivel después del primero. */
export function puntosHabilidad(nivel: number) {
  return nivel - 1;
}

// Recompensas de batalla
export const RECOMPENSAS = {
  victoria: { trofeos: 30, xpDomador: 60, monedas: 75, xpPrimal: 120 },
  derrota: { trofeos: -18, xpDomador: 18, monedas: 20, xpPrimal: 36 }, // perder da un 30% de la experiencia
  captura: { xpDomador: 40, xpPrimal: 80 },
};
export const TAM_EQUIPO = 3; // Primales por batalla
export const MAX_LEGENDARIOS = 1; // solo un legendario por equipo
export const NUM_INICIALES = 3; // al empezar eliges 3 comunes
export const DURACION_BATALLA = 180; // segundos
export const ESPERA_CAMBIO = 3.5; // segundos entre cambios de Primal

/** Legendario que se puede retar hoy (rota cada día, igual para todo el mundo). */
export const LEGENDARIOS = ['taitachimbo', 'mamatungura', 'inti', 'apukuntur', 'cuichi'];
export function legendarioDelDia(ahora = Date.now()) {
  const dia = Math.floor(ahora / 86_400_000);
  return { id: LEGENDARIOS[dia % LEGENDARIOS.length], terminaEn: (dia + 1) * 86_400_000 - ahora };
}

// ------------------------------------------------------------------ misiones diarias
/** Tres misiones al día (iguales para todo el mundo) que dan monedas: un motivo para volver cada día. */
export interface MisionDef { id: string; texto: string; meta: number; premio: number }
export const MISIONES: MisionDef[] = [
  { id: 'ganar', texto: 'Gana {n} batallas de Liga', meta: 2, premio: 60 },
  { id: 'jugar', texto: 'Juega {n} batallas de Liga', meta: 3, premio: 40 },
  { id: 'especial', texto: 'Lanza {n} técnicas especiales', meta: 3, premio: 50 },
  { id: 'ko', texto: 'Derrota a {n} Primales rivales', meta: 5, premio: 50 },
  { id: 'combo', texto: 'Haz un combo de 15 golpes', meta: 1, premio: 50 },
  { id: 'captura', texto: 'Captura un Primal', meta: 1, premio: 80 },
  { id: 'amistosa', texto: 'Juega un reto amistoso', meta: 1, premio: 40 },
];
export const diaActual = (t = Date.now()) => Math.floor(t / 86_400_000);
export function misionesDelDia(dia = diaActual()): MisionDef[] {
  // siempre una de Liga y dos más que rotan
  const resto = MISIONES.filter((m) => m.id !== 'ganar' && m.id !== 'jugar');
  const a = resto[dia % resto.length], b = resto[(dia * 3 + 2) % resto.length];
  return [MISIONES[dia % 2 ? 0 : 1], a, b === a ? resto[(dia + 1) % resto.length] : b];
}
/** La primera victoria de Liga de cada día da el doble de monedas. */
export const BONO_PRIMERA_VICTORIA = 2;
