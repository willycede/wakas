// Progreso de un Domador: perfil, recompensas, evolución, medallas, habilidades y capturas.

import {
  BONO_MEDALLA_XP, ESPECIES, ESPERA_CAMBIO, HABILIDADES_DOMADOR, INICIALES, NIVEL_MAX_DOMADOR, NIVEL_MAX_PRIMAL,
  RECOMPENSAS, TAM_EQUIPO, medallasDe, puntosHabilidad, xpDomador, xpPrimal, type FinBatalla, type Perfil, type PrimalGuardado,
} from '../../shared/src';
import type { Domador } from './db';
import type { Mods } from './battle/engine';

let uidSeq = Date.now();
export const nuevoUid = () => (uidSeq++).toString(36);

export function habilidad(d: Domador, id: string) {
  const h = HABILIDADES_DOMADOR.find((x) => x.id === id)!;
  return (d.habilidades[id] ?? 0) * h.porNivel;
}

export function perfil(d: Domador): Perfil {
  const usados = Object.values(d.habilidades).reduce((a, b) => a + b, 0);
  return {
    id: d.id, nombre: d.nombre, nivel: d.nivel, xp: d.xp, xpSig: d.nivel >= NIVEL_MAX_DOMADOR ? 0 : xpDomador(d.nivel),
    monedas: d.monedas, trofeos: d.trofeos, mejorTrofeos: d.mejorTrofeos, victorias: d.victorias, derrotas: d.derrotas,
    primales: d.primales, equipo: d.equipo, habilidades: d.habilidades, puntosLibres: puntosHabilidad(d.nivel) - usados, capturados: d.capturados,
  };
}

export function mods(d: Domador): Mods {
  return {
    vidaMult: 1 + habilidad(d, 'vinculo'),
    enfriaMult: 1 - habilidad(d, 'instinto'),
    esperaCambio: Math.max(1, ESPERA_CAMBIO - habilidad(d, 'relevo')),
  };
}

export function elegirInicial(d: Domador, esp: string): string | null {
  if (d.primales.length) return 'Ya elegiste a tu Primal inicial.';
  if (!INICIALES.includes(esp)) return 'Ese Primal no es inicial.';
  const p: PrimalGuardado = { uid: nuevoUid(), esp, nivel: 5, xp: 0 };
  d.primales.push(p);
  d.equipo = [p.uid];
  d.capturados = [esp];
  return null;
}

export function ponerEquipo(d: Domador, uids: string[]): string | null {
  const unicos = [...new Set(uids)].filter((u) => d.primales.some((p) => p.uid === u));
  if (!unicos.length) return 'Tu equipo necesita al menos un Primal.';
  d.equipo = unicos.slice(0, TAM_EQUIPO);
  return null;
}

export function subirHabilidad(d: Domador, id: string): string | null {
  const h = HABILIDADES_DOMADOR.find((x) => x.id === id);
  if (!h) return 'Habilidad desconocida.';
  if ((d.habilidades[id] ?? 0) >= h.max) return 'Esa habilidad ya está al máximo.';
  if (perfil(d).puntosLibres <= 0) return 'No tienes puntos de habilidad. Sube de nivel ganando batallas.';
  d.habilidades[id] = (d.habilidades[id] ?? 0) + 1;
  return null;
}

/** Suma experiencia de Domador; devuelve niveles subidos. */
function darXpDomador(d: Domador, xp: number) {
  let ups = 0;
  d.xp += xp;
  while (d.nivel < NIVEL_MAX_DOMADOR && d.xp >= xpDomador(d.nivel)) {
    d.xp -= xpDomador(d.nivel);
    d.nivel++;
    ups++;
  }
  return ups;
}

/** Suma experiencia a un Primal y lo evoluciona si llega al nivel. */
function darXpPrimal(d: Domador, p: PrimalGuardado, xp: number) {
  let subio = 0;
  let evoluciono: string | undefined;
  p.xp += Math.round(xp);
  while (p.nivel < NIVEL_MAX_PRIMAL && p.xp >= xpPrimal(p.nivel)) {
    p.xp -= xpPrimal(p.nivel);
    p.nivel++;
    subio++;
    const evo = ESPECIES[p.esp].evoluciona;
    if (evo && p.nivel >= evo.nivel) {
      p.esp = evo.a;
      evoluciono = evo.a;
      if (!d.capturados.includes(evo.a)) d.capturados.push(evo.a);
    }
  }
  return { subio, evoluciono };
}

export function recompensar(d: Domador, gano: boolean, empate: boolean, modo: 'liga' | 'captura', participaron: string[], capturado?: string): FinBatalla {
  const base = gano ? RECOMPENSAS.victoria : RECOMPENSAS.derrota;
  const antes = medallasDe(d.nivel).map((m) => m.id);
  let trofeos = 0;
  if (modo === 'liga') {
    trofeos = empate ? 0 : base.trofeos;
    d.trofeos = Math.max(0, d.trofeos + trofeos);
    d.mejorTrofeos = Math.max(d.mejorTrofeos, d.trofeos);
    if (!empate) gano ? d.victorias++ : d.derrotas++;
  }
  const monedas = modo === 'liga' ? Math.round(base.monedas * (1 + habilidad(d, 'negociante'))) : 0;
  d.monedas += monedas;
  const xpD = !gano ? 0 : modo === 'liga' ? base.xpDomador : RECOMPENSAS.captura.xpDomador;
  const ups = darXpDomador(d, xpD);
  const bonoXp = 1 + habilidad(d, 'entrenador') + medallasDe(d.nivel).length * BONO_MEDALLA_XP;
  const xpP = (!gano ? 0 : modo === 'liga' ? base.xpPrimal : RECOMPENSAS.captura.xpPrimal) * bonoXp;
  const xpPrimales: FinBatalla['xpPrimales'] = [];
  for (const uid of d.equipo) {
    const p = d.primales.find((x) => x.uid === uid);
    if (!p || xpP <= 0) continue;
    // quien peleó recibe toda la experiencia; el resto del equipo, la mitad
    const xp = participaron.includes(uid) ? xpP : xpP * 0.5;
    const antesEsp = p.esp;
    const r = darXpPrimal(d, p, xp);
    xpPrimales.push({ esp: antesEsp, xp: Math.round(xp), nivel: p.nivel, subio: r.subio, evoluciono: r.evoluciono });
  }
  if (capturado) {
    const p: PrimalGuardado = { uid: nuevoUid(), esp: capturado, nivel: ESPECIES[capturado].captura.nivelSalvaje, xp: 0 };
    d.primales.push(p);
    if (d.equipo.length < TAM_EQUIPO) d.equipo.push(p.uid);
    if (!d.capturados.includes(capturado)) d.capturados.push(capturado);
  }
  const nuevas = medallasDe(d.nivel).map((m) => m.id).filter((m) => !antes.includes(m));
  d.medallas = medallasDe(d.nivel).map((m) => m.id);
  return {
    gano, empate, motivo: '', trofeos, monedas, xpDomador: xpD, xpPrimales, capturado, medallasNuevas: nuevas, nivelDomador: d.nivel, subioDomador: ups,
  };
}

/** ¿Puede retar a un Primal salvaje? Devuelve el motivo si no. */
export function puedeCapturar(d: Domador, esp: string): string | null {
  const e = ESPECIES[esp];
  if (!e) return 'Primal desconocido.';
  if (e.inicial && d.primales.length === 0) return 'Primero elige tu Primal inicial.';
  if (d.nivel < e.captura.nivel) return `Necesitas ser Domador de nivel ${e.captura.nivel}.`;
  if (d.monedas < costoCaptura(d, esp)) return `Necesitas ${costoCaptura(d, esp)} monedas.`;
  if (!d.equipo.length) return 'Necesitas un equipo.';
  return null;
}

export function costoCaptura(d: Domador, esp: string) {
  return Math.round(ESPECIES[esp].captura.monedas * (1 - habilidad(d, 'capturador')));
}
