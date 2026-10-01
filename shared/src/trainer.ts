// Progreso del Domador: niveles, ligas por trofeos, medallas y habilidades de entrenador.

export const NIVEL_MAX_DOMADOR = 50;

export function xpDomador(n: number) {
  return 100 + 50 * n;
}

export interface Liga { id: string; nombre: string; trofeos: number; color: string; icono: string; arena: string }
export const LIGAS: Liga[] = [
  { id: 'bronce', nombre: 'Liga Bronce', trofeos: 0, color: '#c98a52', icono: '🥉', arena: 'Estadio Malecón' },
  { id: 'plata', nombre: 'Liga Plata', trofeos: 400, color: '#c8d0dc', icono: '🥈', arena: 'Coliseo Amazónico' },
  { id: 'oro', nombre: 'Liga Oro', trofeos: 1000, color: '#ffcf4a', icono: '🥇', arena: 'Arena Cotopaxi' },
  { id: 'platino', nombre: 'Liga Platino', trofeos: 1800, color: '#7ff0e0', icono: '💠', arena: 'Estadio Galápagos' },
  { id: 'diamante', nombre: 'Liga Diamante', trofeos: 2800, color: '#7ab8ff', icono: '💎', arena: 'Plaza Quito Colonial' },
  { id: 'maestro', nombre: 'Liga Maestro', trofeos: 4000, color: '#c77dff', icono: '👑', arena: 'Glaciar Chimborazo' },
  { id: 'campeon', nombre: 'Liga Campeón', trofeos: 5500, color: '#ff5a6a', icono: '🏆', arena: 'Mitad del Mundo' },
];

export function ligaDe(trofeos: number): Liga {
  let l = LIGAS[0];
  for (const x of LIGAS) if (trofeos >= x.trofeos) l = x;
  return l;
}

export interface Medalla { id: string; nombre: string; nivel: number; icono: string; desc: string }
export const MEDALLAS: Medalla[] = [
  { id: 'brasa', nombre: 'Medalla Brasa', nivel: 3, icono: '🔥', desc: 'Tu primer paso como Domador.' },
  { id: 'oleaje', nombre: 'Medalla Oleaje', nivel: 6, icono: '🌊', desc: 'Ya sabes cambiar de Primal en el momento justo.' },
  { id: 'brote', nombre: 'Medalla Brote', nivel: 10, icono: '🌱', desc: 'Tu equipo empieza a crecer.' },
  { id: 'voltio', nombre: 'Medalla Voltio', nivel: 14, icono: '⚡', desc: 'Reflejos de relámpago.' },
  { id: 'roca', nombre: 'Medalla Roca', nivel: 18, icono: '🪨', desc: 'Firme como una montaña.' },
  { id: 'vendaval', nombre: 'Medalla Vendaval', nivel: 23, icono: '🌪️', desc: 'Nadie te sigue el ritmo.' },
  { id: 'umbral', nombre: 'Medalla Umbral', nivel: 28, icono: '🌑', desc: 'Dominas hasta la oscuridad.' },
  { id: 'primal', nombre: 'Medalla Primal', nivel: 35, icono: '👑', desc: 'Leyenda de la Liga Primal.' },
];
/** Cada medalla da +3% de experiencia a tus Primales. */
export const BONO_MEDALLA_XP = 0.03;

export function medallasDe(nivel: number): Medalla[] {
  return MEDALLAS.filter((m) => nivel >= m.nivel);
}

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
  victoria: { trofeos: 30, xpDomador: 60, monedas: 25, xpPrimal: 120 },
  derrota: { trofeos: -18, xpDomador: 0, monedas: 6, xpPrimal: 0 }, // perder no da experiencia
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
