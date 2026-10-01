// Prueba automática: dos Domadores se registran, eligen inicial, pelean en la Liga (entre ellos)
// y luego uno captura a un Primal salvaje. Uso: con el servidor en localhost:2600 -> node scripts/bot.mjs
import { Client } from 'colyseus.js';

const BASE = process.env.BASE ?? 'http://localhost:2600';
const WS = BASE.replace(/^http/, 'ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function call(method, path, body, token) {
  const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(path + ': ' + j.error);
  return j;
}

class Bot {
  constructor(name) { this.name = name + Math.random().toString(36).slice(2, 6); }
  async setup(inicial) {
    this.token = (await call('POST', '/api/registro', { usuario: this.name, clave: 'botbot' })).token;
    this.perfil = await call('POST', '/api/inicial', { especie: inicial }, this.token);
  }
  async pelear(roomId) {
    const c = new Client(WS);
    const room = await c.joinById(roomId, { token: this.token });
    let init, snap, fin;
    room.onMessage('inicio', (m) => (init = m));
    room.onMessage('snap', (m) => (snap = m));
    room.onMessage('fin', (m) => (fin = m));
    room.onMessage('cuenta', () => {});
    let seq = 0, especiales = 0, comboMax = 0;
    room.onMessage('fx', (l) => { for (const f of l) if (f.k === 'combo' && f.lado === init?.lado) comboMax = Math.max(comboMax, f.n); });
    const t0 = Date.now();
    while (!fin && Date.now() - t0 < 240_000) {
      if (snap && init) {
        const me = snap.u[init.lado], foe = snap.u[1 - init.lado];
        const dx = foe.x - me.x, dy = foe.y - me.y, d = Math.hypot(dx, dy) || 1;
        const ideal = 120;
        // los ataques salen hacia donde mira: el bot se gira hacia el rival antes de atacar
        const encara = d > ideal || Math.random() < 0.6;
        const mx = encara ? dx / d : -dy / d, my = encara ? dy / d : dx / d;
        room.send('in', { s: ++seq, x: mx, y: my, ax: 0, ay: 0 });
        const i = [1, 2, 3, 4].find((k) => snap.cds[k] <= 0) ?? 0;
        if (snap.eq[init.lado].carga >= 100) { room.send('acc', { i: 6 }); especiales++; }
        else if (encara) room.send('acc', { i: Math.random() < 0.5 ? 0 : i });
        // cambia de Primal de vez en cuando
        if (Math.random() < 0.01) room.send('cambio', { slot: Math.floor(Math.random() * snap.eq[init.lado].esp.length) });
      }
      await sleep(100);
    }
    log('especiales usadas:', especiales, '· combo máximo:', comboMax);
    await room.leave().catch(() => {});
    return { init, fin };
  }
}

async function main() {
  const A = new Bot('Ana'), B = new Bot('Beto');
  await A.setup('chispi');
  await B.setup('brotin');
  log('iniciales elegidos:', A.perfil.primales[0].esp, B.perfil.primales[0].esp);
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
  // captura: con trucos, sube a A y le da monedas; reta a Pedrusco
  await call('POST', '/api/truco', { nivel: 5, monedas: 1000, primal: 'infernox', nivelPrimal: 30 }, A.token);
  const cap = await call('POST', '/api/capturar', { especie: 'pedrusco' }, A.token);
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
main().catch((e) => { console.error('FALLO:', e); process.exit(1); });
