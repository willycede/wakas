// Progreso de un Domador: perfil, recompensas, evolución, medallas, habilidades y capturas.

import {
  BONO_MEDALLA_XP, LEGAL_VERSION, avatarAleatorio, avatarValido, ESPECIES, ESPERA_CAMBIO, HABILIDADES_DOMADOR, INICIALES, MAX_LEGENDARIOS, NIVEL_MAX_DOMADOR, NIVEL_MAX_PRIMAL, NUM_INICIALES,
  BONO_PRIMERA_VICTORIA, MISIONES, RECOMPENSAS, TAM_EQUIPO, diaActual, esLegendario, misionesDelDia, legendarioDelDia, medallasDeHistoria, historiaVacia, liderPorId, ALTO_MANDO, GIMNASIOS, puntosHabilidad, xpDomador, xpPrimal, type FichaRival, type FinBatalla, type Perfil, type PrimalGuardado,
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
    tutorial: !!d.tutorial,
    avatar: avatarDe(d),
    legalOk: d.legal?.version === LEGAL_VERSION,
    misiones: misionesHoy(d).map((m) => {
      const def = MISIONES.find((x) => x.id === m.id)!;
      return { id: m.id, progreso: m.progreso, meta: def.meta, premio: def.premio, cobrada: m.cobrada };
    }),
    bonoDiario: d.ultimaVictoriaDia !== diaActual(),
    historia: d.historia ?? historiaVacia(),
  };
}

/** Misiones de hoy (si cambió el día, salen tres nuevas). */
export function misionesHoy(d: Domador) {
  const hoy = diaActual();
  if (d.misiones?.dia !== hoy) d.misiones = { dia: hoy, lista: misionesDelDia(hoy).map((m) => ({ id: m.id, progreso: 0, cobrada: false })) };
  return d.misiones.lista;
}

export function avanzarMision(d: Domador, id: string, n = 1) {
  const m = misionesHoy(d).find((x) => x.id === id);
  const def = MISIONES.find((x) => x.id === id);
  if (m && def && n > 0) m.progreso = Math.min(def.meta, m.progreso + n);
}

export function cobrarMision(d: Domador, id: string): string | null {
  const m = misionesHoy(d).find((x) => x.id === id);
  const def = MISIONES.find((x) => x.id === id);
  if (!m || !def) return 'Esa misión no es de hoy.';
  if (m.cobrada) return 'Ya cobraste esa misión.';
  if (m.progreso < def.meta) return 'Aún no completas esa misión.';
  m.cobrada = true;
  d.monedas += def.premio;
  return null;
}

export function mods(d: Domador): Mods {
  return {
    vidaMult: 1 + habilidad(d, 'vinculo'),
    enfriaMult: 1 - habilidad(d, 'instinto'),
    esperaCambio: Math.max(1, ESPERA_CAMBIO - habilidad(d, 'relevo')),
  };
}

/** Cuentas de versiones anteriores: quita Primales que ya no existen y ajusta el equipo a 3. */
export function migrar(d: Domador) {
  d.primales = d.primales.filter((p) => ESPECIES[p.esp]);
  d.capturados = d.capturados.filter((e) => ESPECIES[e]);
  d.equipo = d.equipo.filter((u) => d.primales.some((p) => p.uid === u));
  let leg = 0;
  d.equipo = d.equipo.filter((u) => !esLegendario(d.primales.find((p) => p.uid === u)!.esp) || ++leg <= MAX_LEGENDARIOS).slice(0, TAM_EQUIPO);
  if (!d.equipo.length && d.primales.length) d.equipo = d.primales.slice(0, TAM_EQUIPO).map((p) => p.uid);
}

/** Al empezar se eligen 3 Primales comunes distintos de la lista de iniciales. */
export function elegirIniciales(d: Domador, esps: string[]): string | null {
  if (d.primales.length) return 'Ya elegiste a tus Primales iniciales.';
  const unicos = [...new Set(esps)];
  if (unicos.length !== NUM_INICIALES || unicos.some((e) => !INICIALES.includes(e))) return `Elige ${NUM_INICIALES} Primales iniciales distintos.`;
  for (const esp of unicos) d.primales.push({ uid: nuevoUid(), esp, nivel: 5, xp: 0 });
  d.equipo = d.primales.map((p) => p.uid);
  d.capturados = [...unicos];
  return null;
}

export function ponerEquipo(d: Domador, uids: string[]): string | null {
  const unicos = [...new Set(uids)].filter((u) => d.primales.some((p) => p.uid === u));
  if (!unicos.length) return 'Tu equipo necesita al menos un Primal.';
  if (unicos.length > TAM_EQUIPO) return `Tu equipo está lleno (${TAM_EQUIPO}). Quita uno primero.`;
  const leg = unicos.filter((u) => esLegendario(d.primales.find((p) => p.uid === u)!.esp)).length;
  if (leg > MAX_LEGENDARIOS) return 'Solo puedes llevar un legendario por batalla.';
  d.equipo = unicos;
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

export interface StatsBatalla { especiales: number; ko: number; comboMax: number }

export function recompensar(d: Domador, gano: boolean, empate: boolean, modo: 'liga' | 'captura' | 'historia', participaron: string[], capturado?: string, st?: StatsBatalla): FinBatalla {
  const base = gano ? RECOMPENSAS.victoria : RECOMPENSAS.derrota;
  let trofeos = 0;
  if (modo === 'liga') {
    trofeos = empate ? 0 : base.trofeos;
    d.trofeos = Math.max(0, d.trofeos + trofeos);
    d.mejorTrofeos = Math.max(d.mejorTrofeos, d.trofeos);
    if (!empate) gano ? d.victorias++ : d.derrotas++;
  }
  let monedas = modo === 'liga' ? Math.round(base.monedas * (1 + habilidad(d, 'negociante'))) : 0;
  // primera victoria del día: el doble de monedas
  let bonoDiario = 0;
  if (modo === 'liga' && gano && d.ultimaVictoriaDia !== diaActual()) {
    bonoDiario = monedas * (BONO_PRIMERA_VICTORIA - 1);
    monedas += bonoDiario;
    d.ultimaVictoriaDia = diaActual();
  }
  d.monedas += monedas;
  // misiones diarias
  if (modo === 'liga') { avanzarMision(d, 'jugar'); if (gano) avanzarMision(d, 'ganar'); }
  if (st) { avanzarMision(d, 'especial', st.especiales); avanzarMision(d, 'ko', st.ko); if (st.comboMax >= 15) avanzarMision(d, 'combo'); }
  if (capturado) avanzarMision(d, 'captura');
  // Primales que más usa (se muestran a sus rivales)
  if (modo === 'liga') {
    d.uso ??= {};
    for (const uid of participaron) { const p = d.primales.find((x) => x.uid === uid); if (p) d.uso[p.esp] = (d.uso[p.esp] ?? 0) + 1; }
  }
  const xpD = !gano ? 0 : modo === 'captura' ? RECOMPENSAS.captura.xpDomador : base.xpDomador;
  const ups = darXpDomador(d, xpD);
  const bonoXp = 1 + habilidad(d, 'entrenador') + medallasDeHistoria(d.historia).length * BONO_MEDALLA_XP;
  const xpP = (!gano ? 0 : modo === 'captura' ? RECOMPENSAS.captura.xpPrimal : base.xpPrimal) * bonoXp;
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
    const hayLeg = d.equipo.some((u) => esLegendario(d.primales.find((x) => x.uid === u)?.esp ?? ''));
    if (d.equipo.length < TAM_EQUIPO && !(esLegendario(capturado) && hayLeg)) d.equipo.push(p.uid);
    if (!d.capturados.includes(capturado)) d.capturados.push(capturado);
  }
  return {
    gano, empate, motivo: '', trofeos, monedas, bonoDiario: bonoDiario || undefined, xpDomador: xpD, xpPrimales, capturado, medallasNuevas: [], nivelDomador: d.nivel, subioDomador: ups,
  };
}

/** Modo Historia: medalla y premio del gimnasio, o avance en el Alto Mando (si pierdes ahí, vuelves a empezar). */
export function resultadoHistoria(d: Domador, liderId: string, gano: boolean, res: FinBatalla) {
  const h = (d.historia ??= historiaVacia());
  const lider = liderPorId(liderId)!;
  const esGim = GIMNASIOS.includes(lider);
  let primeraVez = false, campeon = false, reinicio = false, monedas = 0;
  if (gano) {
    if (esGim) {
      primeraVez = !h.gim.includes(lider.id);
      if (primeraVez) { h.gim.push(lider.id); res.medallasNuevas = [lider.medalla!]; }
      monedas = primeraVez ? lider.premio : 30;
    } else {
      primeraVez = h.campeon === 0;
      monedas = primeraVez ? lider.premio : Math.round(lider.premio / 4);
      h.elite++;
      if (h.elite >= ALTO_MANDO.length) { h.campeon++; h.elite = 0; campeon = true; }
    }
  } else if (!esGim && h.elite > 0) {
    h.elite = 0;
    reinicio = true;
  }
  d.medallas = medallasDeHistoria(h);
  d.monedas += monedas;
  res.monedas += monedas;
  res.historia = { lider: lider.id, primeraVez, elite: h.elite, campeon, reinicio };
}

export const avatarDe = (d: Domador) => avatarValido(d.avatar) ?? avatarAleatorio(d.id);

/** Ficha pública de un Entrenador (la ve su rival antes de pelear). */
export function fichaDe(d: Domador): FichaRival {
  const uso = Object.entries(d.uso ?? {}).filter(([e]) => ESPECIES[e]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([esp, n]) => ({ esp, n }));
  const favoritos = uso.length ? uso : d.equipo.map((u) => d.primales.find((p) => p.uid === u)).filter(Boolean).map((p) => ({ esp: p!.esp, n: 0 }));
  return { id: d.id, avatar: avatarDe(d), nombre: d.nombre, trofeos: d.trofeos, nivel: d.nivel, victorias: d.victorias, derrotas: d.derrotas, mejorTrofeos: d.mejorTrofeos, favoritos, ia: false };
}

/** Equipo elegido en la preparación: Primales tuyos, de 1 a 3 y como mucho un legendario. */
export function equipoValido(d: Domador, uids: unknown): string[] | null {
  if (!Array.isArray(uids)) return null;
  const u = [...new Set(uids.map(String))].filter((x) => d.primales.some((p) => p.uid === x));
  if (!u.length || u.length > TAM_EQUIPO) return null;
  if (u.filter((x) => esLegendario(d.primales.find((p) => p.uid === x)!.esp)).length > MAX_LEGENDARIOS) return null;
  return u;
}

/** ¿Puede retar a un Primal salvaje? Devuelve el motivo si no. */
export function puedeCapturar(d: Domador, esp: string): string | null {
  const e = ESPECIES[esp];
  if (!e) return 'Primal desconocido.';
  if (d.primales.length === 0) return 'Primero elige tus Primales iniciales.';
  if (e.rareza === 'legendario' && legendarioDelDia().id !== esp) return 'Este legendario no aparece hoy. Vuelve otro día.';
  if (d.nivel < e.captura.nivel) return `Necesitas ser Entrenador de nivel ${e.captura.nivel}.`;
  if (d.monedas < costoCaptura(d, esp)) return `Necesitas ${costoCaptura(d, esp)} monedas.`;
  if (!d.equipo.length) return 'Necesitas un equipo.';
  return null;
}

export function costoCaptura(d: Domador, esp: string) {
  return Math.round(ESPECIES[esp].captura.monedas * (1 - habilidad(d, 'capturador')));
}
