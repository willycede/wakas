// Mide la dificultad del Modo Historia: un bot con un equipo típico (los iniciales evolucionados) al
// nivel que tendría un jugador normal en ese punto pelea contra varios líderes, N veces cada uno.
// Uso: npx tsx scripts/bot_dificultad.mjs [veces] [líderes…]
import { Bot, call } from './bot.mjs';
import { ESPECIES, efectividad } from '../shared/src/index.ts';

// como una persona: si el Primal rival tiene ventaja sobre el tuyo, cambia al que mejor le pegue
const tipos = (e) => [ESPECIES[e].elemento, ESPECIES[e].elemento2].filter(Boolean);
const valor = (mio, rival) => Math.max(...tipos(mio).map((t) => efectividad(t, tipos(rival)))) / Math.max(...tipos(rival).map((t) => efectividad(t, tipos(mio))));
function elegir(snap, lado) {
  const eq = snap.eq[lado], foe = snap.u[1 - lado].esp;
  if (eq.cambioListo > 0) return null;
  const actual = valor(eq.esp[eq.activo], foe);
  let mejor = null, mv = actual * 1.2;
  eq.esp.forEach((e, i) => { if (i !== eq.activo && eq.hp[i] > 0 && valor(e, foe) > mv) { mejor = i; mv = valor(e, foe); } });
  return mejor;
}

const N = Number(process.argv[2] ?? 3);
const RUTA = ['rosa', 'kevin', 'andres', 'lucia', 'jacinto', 'bryan', 'mateo', 'daniela', 'sisa', 'ivan', 'camila', 'nantu', 'tomas', 'valeria'];
const TODOS = ['nina', 'yaku', 'sacha', 'illapa', 'rumi', 'wayra', 'tuta', 'rasu'];
// líder, equipo del jugador (especie y nivel), progreso necesario para poder retarlo
const SOLO = process.argv.slice(3);
const PRUEBAS0 = [
  { lider: 'nina', equipo: [['tunguri', 6], ['yakupi', 6], ['cacaito', 6]], gim: [] },
  { lider: 'illapa', equipo: [['tungurak', 16], ['yakulobo', 16], ['cacaoso', 16]], gim: TODOS.slice(0, 3) },
  { lider: 'wayra', equipo: [['tungurak', 25], ['yakulobo', 25], ['cacaoso', 25]], gim: TODOS.slice(0, 5) },
  { lider: 'rumi', equipo: [['tungurak', 22], ['yakulobo', 22], ['cacaoso', 22]], gim: TODOS.slice(0, 4) },
  { lider: 'tuta', equipo: [['tungurak', 27], ['yakulobo', 27], ['cacaoso', 27]], gim: TODOS.slice(0, 6) },
  { lider: 'rasu', equipo: [['tungurex', 31], ['yakuaron', 31], ['cacaotor', 31]], gim: TODOS.slice(0, 7) },
  { lider: 'amaru', equipo: [['tungurex', 35], ['yakuaron', 35], ['cacaotor', 35]], gim: TODOS, elite: 0 },
  { lider: 'pacha', equipo: [['tungurex', 39], ['yakuaron', 39], ['cacaotor', 39]], gim: TODOS, elite: 4 },
];

async function prueba(p) {
  const res = [];
  for (let i = 0; i < N; i++) {
    const b = new Bot('Dif');
    await b.setup(['tunguri', 'yakupi', 'cacaito']);
    for (const [esp, nv] of p.equipo) await call('POST', '/api/truco', { primal: esp, nivelPrimal: nv }, b.token);
    await call('POST', '/api/truco', { historia: { gim: p.gim, ruta: RUTA, elite: p.elite ?? 0, campeon: 0 } }, b.token);
    const perfil = await call('GET', '/api/perfil', null, b.token);
    const uids = p.equipo.map(([esp, nv]) => perfil.primales.find((x) => x.esp === esp && x.nivel === nv).uid);
    await call('POST', '/api/equipo', { equipo: uids }, b.token);
    const t0 = Date.now();
    const r = await b.pelear((await call('POST', '/api/historia/retar', { id: p.lider }, b.token)).roomId, false, elegir);
    res.push({ gano: r.fin?.gano, motivo: r.fin?.motivo, seg: Math.round((Date.now() - t0) / 1000) });
  }
  const g = res.filter((x) => x.gano).length;
  console.log(`${p.lider.padEnd(7)} equipo nv ${p.equipo[0][1]}: ganó ${g}/${N} · ${res.map((x) => `${x.gano ? 'G' : 'P'}(${x.motivo},${x.seg}s)`).join(' ')}`);
}

const PRUEBAS = SOLO.length ? PRUEBAS0.filter((p) => SOLO.includes(p.lider)) : PRUEBAS0;
await Promise.all(PRUEBAS.map(prueba));
process.exit(0);
