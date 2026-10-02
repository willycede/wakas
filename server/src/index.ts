// Servidor de Primal Clash: cuentas, perfil, emparejamiento de la Liga, capturas y batallas.

import express from 'express';
import http from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ESPECIES, RAREZAS, TAM_EQUIPO, ligaDe, type Especie } from '../../shared/src';
import { BatallaRoom, type OpcionesBatalla, type Participante } from './battle/room';
import type { Domador } from './db';
import { cobrarMision, costoCaptura, elegirIniciales, perfil, ponerEquipo, puedeCapturar, subirHabilidad } from './progress';
import { domadores, store } from './services';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const PORT = Number(process.env.PORT ?? 2600);

async function hash(pw: string) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${(await scrypt(pw, salt, 32)).toString('hex')}`;
}
async function check(pw: string, stored: string) {
  const [s, h] = stored.split(':');
  const got = await scrypt(pw, Buffer.from(s, 'hex'), 32);
  const want = Buffer.from(h, 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}

const intentos = new Map<string, { n: number; reset: number }>();
function limitado(ip: string) {
  const now = Date.now();
  const a = intentos.get(ip);
  if (!a || a.reset < now) { intentos.set(ip, { n: 1, reset: now + 60_000 }); return false; }
  return ++a.n > 20;
}

function participante(d: Domador): Participante {
  return {
    id: d.id, nombre: d.nombre, trofeos: d.trofeos,
    equipo: d.equipo.map((u) => d.primales.find((p) => p.uid === u)!).filter(Boolean).map((p) => ({ uid: p.uid, esp: p.esp, nivel: p.nivel })),
  };
}

/** Rival de la IA con fuerza parecida a la del jugador (cuando no hay nadie en línea). */
function rivalIA(d: Domador): Participante {
  const yo = participante(d);
  const nivelMedio = Math.round(yo.equipo.reduce((s, e) => s + e.nivel, 0) / Math.max(1, yo.equipo.length));
  // especies que "existen" a ese nivel, con rareza más alta cuantos más trofeos
  const pEpico = Math.min(0.2, 0.02 + d.trofeos / 20000), pRaro = Math.min(0.4, 0.15 + d.trofeos / 10000);
  const pool = Object.values(ESPECIES).filter((e) => e.rareza !== 'legendario' && nivelMinimo(e) <= nivelMedio + 2);
  const sortear = () => {
    const x = Math.random();
    const r = x < pEpico ? 'epico' : x < pEpico + pRaro ? 'raro' : 'comun';
    const de = pool.filter((e) => e.rareza === r);
    const lista = de.length ? de : pool;
    return lista[Math.floor(Math.random() * lista.length)];
  };
  const n = Math.min(TAM_EQUIPO, Math.max(1, yo.equipo.length));
  const usados = new Set<string>();
  const equipo = Array.from({ length: n }, (_, i) => {
    let e = sortear();
    for (let k = 0; k < 5 && usados.has(e.id); k++) e = sortear();
    usados.add(e.id);
    return { uid: 'ia' + i, esp: e.id, nivel: Math.max(1, nivelMedio + Math.floor(Math.random() * 3) - 1) };
  });
  const nombres = ['Rival Kai', 'Entrenadora Ren', 'Rival Iker', 'Entrenadora Luma', 'Rival Taro', 'Entrenadora Nia'];
  const liga = ligaDe(d.trofeos);
  return { id: null, nombre: nombres[Math.floor(Math.random() * nombres.length)], trofeos: Math.max(0, d.trofeos + Math.floor(Math.random() * 80) - 40), equipo,
    ia: Math.min(0.95, 0.18 + d.trofeos / 6000 + Math.random() * 0.08) };
  void liga;
}

/** Nivel desde el que puede aparecer una especie (por su evolución o su rareza). */
function nivelMinimo(e: Especie) {
  const padre = Object.values(ESPECIES).find((x) => x.evoluciona?.a === e.id);
  if (padre) return padre.evoluciona!.nivel;
  if (e.etapa === 0) return e.rareza === 'epico' ? 18 : 10;
  return e.rareza === 'epico' ? 12 : e.rareza === 'raro' ? 5 : 1;
}

// ------------------------------------------------------------------ retos entre amigos
const amistosas = new Map<string, { d: Domador; resolver: (r: { roomId: string } | { error: string }) => void; vence: number }>();
const esperas = new Map<string, Promise<{ roomId: string } | { error: string }>>();

// ------------------------------------------------------------------ cola de la Liga
interface EnCola { d: Domador; desde: number; resolver: (r: { roomId: string } | { error: string }) => void }
const cola: EnCola[] = [];
const ESPERA_IA = 12_000; // si nadie aparece en 12 s, pelea contra la IA

async function crearBatalla(opts: OpcionesBatalla) {
  const room = await matchMaker.createRoom('batalla', opts);
  return room.roomId;
}

setInterval(async () => {
  // empareja por trofeos (el rango de búsqueda se abre con el tiempo)
  const now = Date.now();
  for (let i = 0; i < cola.length; i++) {
    const a = cola[i];
    const rango = 100 + (now - a.desde) / 50;
    const j = cola.findIndex((b, k) => k !== i && Math.abs(b.d.trofeos - a.d.trofeos) <= rango);
    if (j >= 0) {
      const b = cola[j];
      cola.splice(Math.max(i, j), 1);
      cola.splice(Math.min(i, j), 1);
      const roomId = await crearBatalla({ modo: 'liga', lados: [participante(a.d), participante(b.d)] });
      a.resolver({ roomId }); b.resolver({ roomId });
      return;
    }
    if (now - a.desde > ESPERA_IA) {
      cola.splice(i, 1);
      const roomId = await crearBatalla({ modo: 'liga', lados: [participante(a.d), rivalIA(a.d)] });
      a.resolver({ roomId });
      return;
    }
  }
}, 1000).unref();

async function main() {
  await store.init();
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '10kb' }));

  const auth = async (req: express.Request) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const id = token ? await store.sesion(token) : null;
    return id ? domadores.get(id) : null;
  };

  app.post('/api/registro', async (req, res) => {
    if (limitado(req.ip ?? '')) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
    const usuario = String(req.body?.usuario ?? '').trim();
    const clave = String(req.body?.clave ?? '');
    if (!/^[A-Za-z0-9_]{3,16}$/.test(usuario)) return res.status(400).json({ error: 'El nombre debe tener de 3 a 16 letras o números.' });
    if (clave.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    const id = await store.crearCuenta(usuario, await hash(clave));
    if (!id) return res.status(409).json({ error: 'Ese nombre ya está en uso.' });
    const token = randomBytes(32).toString('hex');
    await store.crearSesion(token, id);
    res.json({ token });
  });

  app.post('/api/entrar', async (req, res) => {
    if (limitado(req.ip ?? '')) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
    const c = await store.cuenta(String(req.body?.usuario ?? '').trim());
    if (!c || !(await check(String(req.body?.clave ?? ''), c.hash))) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    const token = randomBytes(32).toString('hex');
    await store.crearSesion(token, c.id);
    res.json({ token });
  });

  app.get('/api/perfil', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    res.json(perfil(d));
  });

  const accion = (fn: (d: Domador, body: any) => string | null) => async (req: express.Request, res: express.Response) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    const err = fn(d, req.body ?? {});
    if (err) return res.status(400).json({ error: err });
    await domadores.guardar(d);
    res.json(perfil(d));
  };
  app.post('/api/inicial', accion((d, b) => elegirIniciales(d, Array.isArray(b.especies) ? b.especies.map(String) : [])));
  app.post('/api/equipo', accion((d, b) => ponerEquipo(d, Array.isArray(b.equipo) ? b.equipo.map(String) : [])));
  app.post('/api/habilidad', accion((d, b) => subirHabilidad(d, String(b.id))));
  app.post('/api/mision', accion((d, b) => cobrarMision(d, String(b.id))));

  app.get('/api/ranking', async (_req, res) => res.json(await store.ranking(50)));

  // Liga: entra a la cola y espera rival (o IA)
  app.post('/api/buscar', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    if (!d.equipo.length) return res.status(400).json({ error: 'Primero elige tus Primales iniciales.' });
    const prev = cola.findIndex((x) => x.d.id === d.id);
    if (prev >= 0) cola.splice(prev, 1)[0].resolver({ error: 'Búsqueda reemplazada.' });
    const r = await new Promise<{ roomId: string } | { error: string }>((resolver) => cola.push({ d, desde: Date.now(), resolver }));
    if ('error' in r) return res.status(409).json(r);
    res.json(r);
  });
  app.post('/api/cancelar', async (req, res) => {
    const d = await auth(req);
    const i = d ? cola.findIndex((x) => x.d.id === d.id) : -1;
    if (i >= 0) cola.splice(i, 1)[0].resolver({ error: 'Búsqueda cancelada.' });
    res.json({ ok: true });
  });

  // Tutorial: combate guiado contra un muñeco de práctica
  app.post('/api/tutorial', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    if (!d.equipo.length) return res.status(400).json({ error: 'Primero elige tus Primales iniciales.' });
    const muneco: Participante = { id: null, nombre: 'Muñeco de práctica', trofeos: 0, equipo: [{ uid: 'muneco', esp: 'capibaron', nivel: 5 }], ia: 0, pasivo: true };
    res.json({ roomId: await crearBatalla({ modo: 'tutorial', lados: [participante(d), muneco] }) });
  });
  app.post('/api/tutorial/saltar', accion((d) => { d.tutorial = true; return null; }));

  // Batallas amistosas: uno crea un código, el otro lo usa (por ejemplo, desde un enlace de WhatsApp)
  app.post('/api/amistosa/crear', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    if (!d.equipo.length) return res.status(400).json({ error: 'Primero elige tus Primales iniciales.' });
    for (const [c, a] of amistosas) if (a.d.id === d.id || a.vence < Date.now()) { a.resolver({ error: 'Reto cancelado.' }); amistosas.delete(c); }
    let codigo = '';
    do codigo = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); while (amistosas.has(codigo));
    const espera = new Promise<{ roomId: string } | { error: string }>((resolver) => amistosas.set(codigo, { d, resolver, vence: Date.now() + 10 * 60_000 }));
    esperas.set(codigo, espera);
    res.json({ codigo });
  });
  app.post('/api/amistosa/esperar', async (req, res) => {
    const codigo = String(req.body?.codigo ?? '').toUpperCase();
    const e = esperas.get(codigo);
    if (!e) return res.status(404).json({ error: 'Ese código no existe o ya caducó.' });
    const r = await e;
    esperas.delete(codigo);
    if ('error' in r) return res.status(409).json(r);
    res.json(r);
  });
  app.post('/api/amistosa/unirse', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    if (!d.equipo.length) return res.status(400).json({ error: 'Primero elige tus Primales iniciales.' });
    const codigo = String(req.body?.codigo ?? '').toUpperCase();
    const a = amistosas.get(codigo);
    if (!a || a.vence < Date.now()) return res.status(404).json({ error: 'Ese código no existe o ya caducó.' });
    if (a.d.id === d.id) return res.status(400).json({ error: 'No puedes retarte a ti mismo.' });
    amistosas.delete(codigo);
    const roomId = await crearBatalla({ modo: 'amistosa', lados: [participante(a.d), participante(d)] });
    a.resolver({ roomId });
    res.json({ roomId });
  });
  app.post('/api/amistosa/cancelar', async (req, res) => {
    const codigo = String(req.body?.codigo ?? '').toUpperCase();
    const a = amistosas.get(codigo);
    if (a) { a.resolver({ error: 'Reto cancelado.' }); amistosas.delete(codigo); }
    res.json({ ok: true });
  });

  // Captura: pelea contra un Primal salvaje
  app.post('/api/capturar', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    const esp = String(req.body?.especie ?? '');
    const err = puedeCapturar(d, esp);
    if (err) return res.status(400).json({ error: err });
    const costo = costoCaptura(d, esp);
    d.monedas -= costo;
    await domadores.guardar(d);
    const e = ESPECIES[esp];
    // el salvaje es más listo cuanto más raro (los legendarios pelean con todo)
    const salvaje: Participante = { id: null, nombre: e.nombre, trofeos: d.trofeos, equipo: [{ uid: 'salvaje', esp, nivel: e.captura.nivelSalvaje + 2 }], ia: RAREZAS[e.rareza].ia };
    const roomId = await crearBatalla({ modo: 'captura', lados: [participante(d), salvaje], especieSalvaje: esp, costo });
    res.json({ roomId, perfil: perfil(d) });
  });

  // Trucos de prueba (solo en local)
  const trucos = !process.env.DATABASE_URL && !process.env.RAILWAY_ENVIRONMENT;
  if (trucos) {
    app.post('/api/truco', async (req, res) => {
      const d = await auth(req);
      if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
      const b = req.body ?? {};
      if (b.monedas) d.monedas += Number(b.monedas);
      if (b.nivel) d.nivel = Math.max(1, Math.min(50, Number(b.nivel)));
      if (b.trofeos !== undefined) d.trofeos = Number(b.trofeos);
      if (b.primal) {
        const esp = String(b.primal);
        if (ESPECIES[esp]) {
          const p = { uid: Math.random().toString(36).slice(2), esp, nivel: Number(b.nivelPrimal) || 10, xp: 0 };
          d.primales.push(p);
          if (d.equipo.length < TAM_EQUIPO) d.equipo.push(p.uid);
        }
      }
      await domadores.guardar(d);
      res.json(perfil(d));
    });
  }

  const dist = resolve(process.cwd(), 'client/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist, {
      index: false,
      setHeaders: (res, path) => res.setHeader('Cache-Control', /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache'),
    }));
    app.get('/', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  } else {
    app.get('/', (_req, res) => res.send('Falta compilar el cliente: npm run build'));
  }

  const server = http.createServer(app);
  const gameServer = new Server({ transport: new WebSocketTransport({ server }), greet: false });
  gameServer.define('batalla', BatallaRoom);
  await gameServer.listen(PORT);
  console.log(`[primal-clash] Servidor listo en http://localhost:${PORT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
