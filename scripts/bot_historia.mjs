// Prueba del Modo Historia: vence a Nina, comprueba el orden de los gimnasios y el Alto Mando
// (avanzar, saltarse a uno, perder y volver a empezar). Uso: node scripts/bot_historia.mjs
import { Bot, call } from './bot.mjs';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } log('ok:', m); };

const A = new Bot('Hist');
await A.setup(['tunguri', 'yakupi', 'cacaito']);
// equipo fuerte para ganar seguro
for (const esp of ['yakuaron', 'voltanguila', 'cacaotor']) await call('POST', '/api/truco', { primal: esp, nivelPrimal: 40 }, A.token);
let p = await call('GET', '/api/perfil', null, A.token);
p = await call('POST', '/api/equipo', { equipo: p.primales.filter((x) => x.nivel === 40).map((x) => x.uid) }, A.token);

// no se puede saltar al segundo gimnasio
let err = await call('POST', '/api/historia/retar', { id: 'yaku' }, A.token).catch((e) => e.message);
ok(/anterior/.test(err), 'Yaku bloqueado sin vencer a Nina');

// vencer a Nina
let r = await A.pelear((await call('POST', '/api/historia/retar', { id: 'nina' }, A.token)).roomId);
log('Nina:', JSON.stringify({ gano: r.fin.gano, monedas: r.fin.monedas, medallas: r.fin.medallasNuevas, historia: r.fin.historia }));
ok(r.fin.gano && r.fin.medallasNuevas[0] === 'brasa' && r.fin.historia.primeraVez, 'medalla Brasa al vencer a Nina');
p = await call('GET', '/api/perfil', null, A.token);
ok(p.historia.gim.includes('nina'), 'progreso guardado');
err = await call('POST', '/api/historia/retar', { id: 'amaru' }, A.token).catch((e) => e.message);
ok(/8 medallas/.test(err), 'Alto Mando bloqueado sin 8 medallas');

// entrenadores de ruta: Yaku pide vencer antes a Rosa y a Kevin, en orden
err = await call('POST', '/api/historia/retar', { id: 'yaku' }, A.token).catch((e) => e.message);
ok(/camino/.test(err), 'Yaku bloqueado sin los entrenadores del camino');
err = await call('POST', '/api/historia/retar', { id: 'kevin' }, A.token).catch((e) => e.message);
ok(/camino/.test(err), 'Kevin bloqueado sin vencer antes a Rosa');
for (const id of ['rosa', 'kevin']) {
  r = await A.pelear((await call('POST', '/api/historia/retar', { id }, A.token)).roomId);
  log(id + ':', JSON.stringify(r.fin.historia), 'monedas', r.fin.monedas);
  ok(r.fin.gano && r.fin.historia.primeraVez, 'vencido ' + id);
}
const yaku = await call('POST', '/api/historia/retar', { id: 'yaku' }, A.token);
ok(!!yaku.roomId, 'Yaku disponible tras el camino');
await A.pelear(yaku.roomId);

// Alto Mando: con las 8 medallas, vencer a Amaru, no poder saltar, perder con Supay y volver a empezar
await call('POST', '/api/truco', { historia: { gim: ['nina', 'yaku', 'sacha', 'illapa', 'rumi', 'wayra', 'tuta', 'rasu'], elite: 0, campeon: 0 } }, A.token);
r = await A.pelear((await call('POST', '/api/historia/retar', { id: 'amaru' }, A.token)).roomId);
log('Amaru:', JSON.stringify(r.fin.historia), 'gano', r.fin.gano);
ok(r.fin.gano && r.fin.historia.elite === 1, 'Élite 1/5 tras vencer a Amaru');
err = await call('POST', '/api/historia/retar', { id: 'killa' }, A.token).catch((e) => e.message);
ok(/orden/.test(err), 'no se puede saltar a Killa');
r = await A.pelear((await call('POST', '/api/historia/retar', { id: 'supay' }, A.token)).roomId, true);
log('Supay (sin pelear):', JSON.stringify(r.fin.historia), 'gano', r.fin.gano);
ok(!r.fin.gano && r.fin.historia.reinicio && r.fin.historia.elite === 0, 'al perder en el Alto Mando se vuelve a empezar');
log('TODO OK');
process.exit(0);
