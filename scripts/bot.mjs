// Prueba automática: dos Domadores se registran, eligen inicial, pelean en la Liga (entre ellos)
// y luego uno captura a un Primal salvaje. Uso: con el servidor en localhost:2600 -> node scripts/bot.mjs
import { Client } from 'colyseus.js';

const BASE = process.env.BASE ?? 'http://localhost:2600';
const WS = BASE.replace(/^http/, 'ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

export async function call(method, path, body, token) {
  const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(path + ': ' + j.error);
  return j;
}

export class Bot {
  constructor(name) { this.name = name + Math.random().toString(36).slice(2, 6); }
  async setup(inicial) {
    this.token = (await call('POST', '/api/registro', { usuario: this.name, clave: 'botbot', acepto: '2026-10-02' })).token;
    this.perfil = await call('POST', '/api/inicial', { especies: inicial }, this.token);
  }
  async pelear(roomId, quieto = false) {
    const c = new Client(WS);
    const room = await c.joinById(roomId, { token: this.token });
    let init, snap, fin;
    room.onMessage('inicio', (m) => (init = m));
    room.onMessage('snap', (m) => (snap = m));
    room.onMessage('fin', (m) => (fin = m));
    room.onMessage('cuenta', () => {});
    room.onMessage('emote', () => {});
    let prep = null;
    room.onMessage('preparar', (m) => { prep = m; setTimeout(() => room.send('prep_listo'), 300 + Math.random() * 500); });
    room.onMessage('prep_listo', () => {});
    let seq = 0, especiales = 0, comboMax = 0;
    room.onMessage('fx', (l) => { for (const f of l) if (f.k === 'combo' && f.lado === init?.lado) comboMax = Math.max(comboMax, f.n); });
    const t0 = Date.now();
    while (!fin && Date.now() - t0 < 240_000) {
      if (snap && init && !quieto) {
        const me = snap.u[init.lado], foe = snap.u[1 - init.lado];
        const dx = foe.x - me.x, dy = foe.y - me.y, d = Math.hypot(dx, dy) || 1;
        const ideal = 120;
        // los ataques salen hacia donde mira: el bot se gira hacia el rival antes de atacar
        const encara = d > ideal || Math.random() < 0.6;
        const mx = encara ? dx / d : -dy / d, my = encara ? dy / d : dx / d;
        room.send('in', { s: ++seq, x: mx, y: my, ax: 0, ay: 0 });
        const i = [1, 2, 3, 4].find((k) => snap.cds[k] <= 0) ?? 0;
        if (snap.eq[init.lado].carga >= 100) { room.send('acc', { i: Math.random() < 0.5 ? 6 : 7 }); especiales++; }
        if (Math.random() < 0.004) room.send('emote', { id: 'gg' });
        else if (encara) room.send('acc', { i: Math.random() < 0.5 ? 0 : i });
        // cambia de Primal de vez en cuando
        if (Math.random() < 0.01) room.send('cambio', { slot: Math.floor(Math.random() * snap.eq[init.lado].esp.length) });
      }
      await sleep(100);
    }
    log('preparación:', prep ? `rival ${prep.rival.nombre} (favoritos: ${prep.rival.favoritos.map((f) => f.esp).join(', ')})` : 'no hubo');
    log('especiales usadas:', especiales, '· combo máximo:', comboMax);
    await room.leave().catch(() => {});
    return { init, fin };
  }
}

async function main() {
  const A = new Bot('Ana'), B = new Bot('Beto');
  await A.setup(['tunguri', 'yakupi', 'cacaito']);
  await B.setup(['chispez', 'quindito', 'ukumarito']);
  log('iniciales elegidos:', A.perfil.primales.map((p) => p.esp).join(','), '|', B.perfil.primales.map((p) => p.esp).join(','));
  if (A.perfil.equipo.length !== 3) throw new Error('El equipo inicial debe tener 3');
  // no se pueden elegir iniciales que no son comunes de 3 etapas
  const malo = await fetch(BASE + '/api/inicial', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + A.token }, body: JSON.stringify({ especies: ['inti', 'yakupi', 'cacaito'] }) });
  log('elegir de nuevo (debe fallar):', malo.status);
  // los dos buscan al mismo tiempo -> deben emparejarse entre ellos
  const [ra, rb] = await Promise.all([call('POST', '/api/buscar', null, A.token), call('POST', '/api/buscar', null, B.token)]);
  log('emparejados en la misma sala:', ra.roomId === rb.roomId);
  if (ra.roomId !== rb.roomId) throw new Error('No se emparejaron');
  const [fa, fb] = await Promise.all([A.pelear(ra.roomId), B.pelear(rb.roomId)]);
  log('rival de A es IA:', fa.init.rivalIA);
  log('fin A:', JSON.stringify(fa.fin).slice(0, 260));
  log('fin B:', JSON.stringify(fb.fin).slice(0, 260));
  if (!fa.fin || !fb.fin) throw new Error('La batalla no terminó');
  if (fa.fin.gano === fb.fin.gano && !fa.fin.empate) throw new Error('Los dos ganaron o perdieron');
  const pa = await call('GET', '/api/perfil', null, A.token);
  log('perfil A:', 'nivel', pa.nivel, 'trofeos', pa.trofeos, 'monedas', pa.monedas, 'primal nv', pa.primales[0].nivel);
  // legendarios: solo uno por equipo
  const conLeg = await call('POST', '/api/truco', { nivel: 30, monedas: 30000, primal: 'inti', nivelPrimal: 40 }, A.token);
  await call('POST', '/api/truco', { primal: 'cuichi', nivelPrimal: 40 }, A.token);
  const pl = await call('GET', '/api/perfil', null, A.token);
  const legs = pl.primales.filter((p) => p.esp === 'inti' || p.esp === 'cuichi').map((p) => p.uid);
  const dos = await fetch(BASE + '/api/equipo', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + A.token }, body: JSON.stringify({ equipo: [...legs, pl.equipo[0]] }) });
  log('equipo con 2 legendarios (debe fallar):', dos.status, (await dos.json()).error);
  void conLeg;
  await call('POST', '/api/equipo', { equipo: [legs[0], pl.equipo[0], pl.equipo[1]] }, A.token);
  // captura: reta a un común (Llamín)
  const cap = await call('POST', '/api/capturar', { especie: 'llamin' }, A.token);
  log('captura: sala', cap.roomId, 'monedas tras pagar', cap.perfil.monedas);
  const fc = await A.pelear(cap.roomId);
  log('fin captura:', JSON.stringify(fc.fin).slice(0, 200));
  const pa2 = await call('GET', '/api/perfil', null, A.token);
  log('primales de A:', pa2.primales.map((p) => p.esp + ' nv' + p.nivel).join(', '));
  // habilidad de Domador
  const ph = await call('POST', '/api/habilidad', { id: 'entrenador' }, A.token);
  log('habilidad entrenador:', ph.habilidades.entrenador, 'puntos libres', ph.puntosLibres);
  const rk = await call('GET', '/api/ranking');
  log('ranking top 3:', JSON.stringify(rk.slice(0, 3)));
  log('OK');
  process.exit(0);
}
if (process.argv[1].endsWith('bot.mjs')) main().catch((e) => { console.error('FALLO:', e); process.exit(1); });
