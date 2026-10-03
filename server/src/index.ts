// Servidor de Wakas Monster: cuentas, perfil, emparejamiento de la Liga, capturas y batallas.

import express from 'express';
import http from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ESPECIES, INICIALES, LIGAS, NUM_INICIALES, RAREZAS, TAM_EQUIPO, avatarAleatorio, avatarValido, diaActual, ligaDe, type Especie } from '../../shared/src';
import { BatallaRoom, type OpcionesBatalla, type Participante } from './battle/room';
import type { Domador } from './db';
import { avatarDe, cobrarMision, costoCaptura, elegirIniciales, fichaDe, perfil, ponerEquipo, puedeCapturar, subirHabilidad } from './progress';
import { domadores, salas, stats, store } from './services';
import { paisDe } from './pais';
import { LEGAL_VERSION, avatarLider, historiaVacia, liderPorId, puedeRetar } from '../../shared/src';

/** ¿Ya existe el dibujo de esta especie? (mientras se generan los últimos) */
const hayArte = (esp: string) => [resolve(process.cwd(), 'client/dist/criaturas/sprites', esp + '.png'), resolve(process.cwd(), 'assets/criaturas/sprites', esp + '.png')].some((p) => existsSync(p));

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
    ficha: fichaDe(d),
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
  const nombre = nombres[Math.floor(Math.random() * nombres.length)], trofeos = Math.max(0, d.trofeos + Math.floor(Math.random() * 80) - 40);
  const partidas = Math.floor(d.victorias + d.derrotas + 5 + Math.random() * 30);
  const victorias = Math.floor(partidas * (0.45 + Math.random() * 0.15));
  return { id: null, nombre, trofeos, equipo, ia: Math.min(0.95, 0.18 + d.trofeos / 6000 + Math.random() * 0.08),
    ficha: { avatar: avatarAleatorio(Math.floor(Math.random() * 1e6)), nombre, trofeos, nivel: Math.max(1, d.nivel + Math.floor(Math.random() * 3) - 1), victorias, derrotas: partidas - victorias, mejorTrofeos: trofeos + Math.floor(Math.random() * 60),
      favoritos: equipo.map((e) => ({ esp: e.esp, n: 3 + Math.floor(Math.random() * 30) })), ia: true } };
  void liga;
}

/** Nivel desde el que puede aparecer una especie (por su evolución o su rareza). */
function nivelMinimo(e: Especie) {
  const padre = Object.values(ESPECIES).find((x) => x.evoluciona?.a === e.id);
  if (padre) return padre.evoluciona!.nivel;
  if (e.etapa === 0) return e.rareza === 'epico' ? 18 : 10;
  return e.rareza === 'epico' ? 12 : e.rareza === 'raro' ? 5 : 1;
}

// ------------------------------------------------------------------ resumen para el panel
async function resumenAdmin() {
  const hoy = diaActual();
  const todos = await store.todos();
  const dias = stats.ultimosDias(30);
  const unicos = (n: number) => new Set(dias.slice(-n).flatMap((d) => d.activos)).size;
  // retención: de los que se registraron un día, ¿cuántos volvieron 1 y 7 días después?
  const ret = (k: number) => {
    let base = 0, vuelven = 0;
    for (const d of todos) {
      if (!d.creado) continue;
      const dc = diaActual(d.creado);
      if (dc + k > hoy || dc < hoy - 45) continue;
      base++;
      if (d.dias?.includes(dc + k)) vuelven++;
    }
    return { base, vuelven, pct: base ? vuelven / base : null };
  };
  // Primales más usados (y su % de victorias) en la Liga
  const uso: Record<string, number> = {};
  for (const d of todos) for (const [e, n] of Object.entries(d.uso ?? {})) uso[e] = (uso[e] ?? 0) + n;
  const conPrimales = todos.filter((d) => d.primales.length);
  const iniciales: Record<string, number> = {};
  for (const d of conPrimales) for (const p of d.primales.slice(0, NUM_INICIALES)) if (INICIALES.includes(p.esp) || INICIALES.includes(p.esp)) iniciales[p.esp] = (iniciales[p.esp] ?? 0) + 1;
  const ligas = LIGAS.map((l, i) => ({ id: l.id, nombre: l.nombre, color: l.color,
    jugadores: conPrimales.filter((d) => d.trofeos >= l.trofeos && (i === LIGAS.length - 1 || d.trofeos < LIGAS[i + 1].trofeos)).length }));
  const h = dias[dias.length - 1];
  const totalBatallasHoy = Object.values(h.batallas).reduce((a, b) => a + b, 0);
  return {
    ahora: { enLinea: [...visto.values()].filter((t) => Date.now() - t < 60_000).length, enBatalla: salas.activas, enCola: cola.length },
    totales: {
      jugadores: todos.length, conEquipo: conPrimales.length, horas: Math.round(todos.reduce((s, d) => s + (d.segundosJugados ?? 0), 0) / 360) / 10,
      batallas: todos.reduce((s, d) => s + d.victorias + d.derrotas, 0), tutorial: conPrimales.filter((d) => d.tutorial).length,
    },
    hoy: { activos: h.activos.length, nuevos: h.nuevos, batallas: totalBatallasHoy, horas: Math.round(h.segundos / 360) / 10, pico: h.pico,
      esperaMedia: h.esperas ? Math.round(h.esperaMs / h.esperas / 100) / 10 : null },
    dau: h.activos.length, wau: unicos(7), mau: unicos(30),
    retencion: { d1: ret(1), d7: ret(7) },
    serie: dias.map((d) => ({ dia: d.dia, activos: d.activos.length, nuevos: d.nuevos, batallas: d.batallas, horas: Math.round(d.segundos / 360) / 10, vsIA: d.vsIA, vsHumano: d.vsHumano })),
    primales: Object.entries(uso).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([esp, n]) => ({ esp, nombre: ESPECIES[esp]?.nombre ?? esp, n })),
    iniciales: Object.entries(iniciales).sort((a, b) => b[1] - a[1]).map(([esp, n]) => ({ esp, nombre: ESPECIES[esp]?.nombre ?? esp, n })),
    ligas,
    paises: (() => {
      // jugadores distintos por país en los últimos 30 días
      const p: Record<string, number> = {};
      for (const d of todos) if (d.dias?.some((x) => x > hoy - 30)) p[d.pais ?? '??'] = (p[d.pais ?? '??'] ?? 0) + 1;
      return Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([codigo, n]) => ({ codigo, n }));
    })(),
    horas: dias.reduce((acc, d) => { (d.horas ?? []).forEach((v, i) => (acc[i] += v)); return acc; }, Array(24).fill(0) as number[]),
  };
}

// ------------------------------------------------------------------ retos entre amigos
const amistosas = new Map<string, { d: Domador; resolver: (r: { roomId: string } | { error: string }) => void; vence: number; para?: number }>();
/** Última vez que se vio a cada Entrenador (para saber quién está en línea). */
const visto = new Map<number, number>();
const enLinea = (id: number) => Date.now() - (visto.get(id) ?? 0) < 60_000;
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
      stats.espera(now - a.desde); stats.espera(now - b.desde);
      a.resolver({ roomId }); b.resolver({ roomId });
      return;
    }
    if (now - a.desde > ESPERA_IA) {
      cola.splice(i, 1);
      const roomId = await crearBatalla({ modo: 'liga', lados: [participante(a.d), rivalIA(a.d)] });
      stats.espera(now - a.desde);
      a.resolver({ roomId });
      return;
    }
  }
}, 1000).unref();

async function main() {
  await store.init();
  await stats.init();
  // pico de jugadores en línea (cada minuto)
  setInterval(() => stats.enLinea([...visto.values()].filter((t) => Date.now() - t < 60_000).length), 60_000).unref();
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '10kb' }));

  const auth = async (req: express.Request) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const id = token ? await store.sesion(token) : null;
    if (id) visto.set(id, Date.now());
    const d = id ? await domadores.get(id) : null;
    if (d) {
      const zona = String(req.headers['x-zona'] ?? ''), min = Number(req.headers['x-zona-min']);
      if (zona) d.pais = paisDe(zona, String(req.headers['x-idioma'] ?? ''));
      if (Number.isFinite(min) && Math.abs(min) <= 840) d.zonaMin = min;
    }
    if (d && stats.activo(d)) await domadores.guardar(d); // primera vez hoy: se guarda el día
    return d;
  };

  app.post('/api/registro', async (req, res) => {
    if (limitado(req.ip ?? '')) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
    const usuario = String(req.body?.usuario ?? '').trim();
    const clave = String(req.body?.clave ?? '');
    if (!/^[A-Za-z0-9_]{3,16}$/.test(usuario)) return res.status(400).json({ error: 'El nombre debe tener de 3 a 16 letras o números.' });
    if (clave.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    if (req.body?.acepto !== LEGAL_VERSION) return res.status(400).json({ error: 'Debes aceptar los Términos y la Política de Privacidad.' });
    const id = await store.crearCuenta(usuario, await hash(clave));
    if (!id) return res.status(409).json({ error: 'Ese nombre ya está en uso.' });
    stats.nuevo();
    const nd = await domadores.get(id);
    if (nd) { nd.creado = Date.now(); nd.legal = { version: LEGAL_VERSION, fecha: Date.now() }; stats.activo(nd); await domadores.guardar(nd); }
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
  app.post('/api/legal/aceptar', accion((d, b) => { if (b.version !== LEGAL_VERSION) return 'Versión no válida.'; d.legal = { version: LEGAL_VERSION, fecha: Date.now() }; return null; }));
  app.post('/api/avatar', accion((d, b) => { const a = avatarValido(b.avatar); if (!a) return 'Avatar no válido.'; d.avatar = a; return null; }));

  app.get('/api/ranking', async (_req, res) => res.json(await store.ranking(50)));

  // Buzón de sugerencias: hasta 5 mensajes por jugador al día
  app.post('/api/buzon', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    const tipo = String(req.body?.tipo ?? '');
    const texto = String(req.body?.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 1000);
    if (!['idea', 'primal', 'error', 'otro'].includes(tipo)) return res.status(400).json({ error: 'Elige un tipo de mensaje.' });
    if (texto.length < 5) return res.status(400).json({ error: 'Escribe un poco más (mínimo 5 letras).' });
    const hoy = diaActual();
    if (d.buzon?.dia !== hoy) d.buzon = { dia: hoy, n: 0 };
    if (d.buzon.n >= 5) return res.status(429).json({ error: 'Ya enviaste 5 mensajes hoy. ¡Gracias! Vuelve mañana.' });
    d.buzon.n++;
    await store.crearMensaje({ fecha: Date.now(), autor: d.id, nombre: d.nombre, tipo, texto, estado: 'nuevo', nivel: d.nivel, trofeos: d.trofeos });
    await domadores.guardar(d);
    res.json({ ok: true });
  });

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

  // ------------------------------------------------------------------ amigos
  app.get('/api/social', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    const amigos = [];
    for (const id of d.amigos ?? []) { const a = await domadores.get(id); if (a) amigos.push({ id, nombre: a.nombre, trofeos: a.trofeos, nivel: a.nivel, enLinea: enLinea(id), avatar: avatarDe(a) }); }
    amigos.sort((a, b) => Number(b.enLinea) - Number(a.enLinea) || b.trofeos - a.trofeos);
    const solicitudes = [];
    for (const id of d.solicitudes ?? []) { const a = await domadores.get(id); if (a) solicitudes.push({ id, nombre: a.nombre, trofeos: a.trofeos, avatar: avatarDe(a) }); }
    const retos = [...amistosas.entries()].filter(([, a]) => a.para === d.id && a.vence > Date.now()).map(([codigo, a]) => ({ codigo, de: a.d.nombre }));
    res.json({ amigos, solicitudes, retos });
  });
  app.post('/api/amigos/solicitar', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    let otro = req.body?.id ? await domadores.get(Number(req.body.id)) : null;
    if (!otro && req.body?.nombre) { const c = await store.cuenta(String(req.body.nombre).trim()); otro = c ? await domadores.get(c.id) : null; }
    if (!otro) return res.status(404).json({ error: 'No existe ningún Entrenador con ese nombre.' });
    if (otro.id === d.id) return res.status(400).json({ error: 'No puedes agregarte a ti mismo.' });
    if (d.amigos?.includes(otro.id)) return res.status(400).json({ error: 'Ya es tu amigo.' });
    // si el otro ya te lo había pedido, quedan como amigos directamente
    if (d.solicitudes?.includes(otro.id)) {
      d.solicitudes = d.solicitudes.filter((x) => x !== otro!.id);
      d.amigos = [...(d.amigos ?? []), otro.id];
      otro.amigos = [...new Set([...(otro.amigos ?? []), d.id])];
    } else if (!otro.solicitudes?.includes(d.id)) otro.solicitudes = [...(otro.solicitudes ?? []), d.id].slice(-50);
    await domadores.guardar(otro);
    await domadores.guardar(d);
    res.json({ ok: true, amigos: d.amigos?.includes(otro.id) ?? false });
  });
  app.post('/api/amigos/responder', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    const id = Number(req.body?.id);
    if (!d.solicitudes?.includes(id)) return res.status(404).json({ error: 'Esa solicitud ya no existe.' });
    d.solicitudes = d.solicitudes.filter((x) => x !== id);
    const otro = await domadores.get(id);
    if (req.body?.aceptar && otro) {
      d.amigos = [...new Set([...(d.amigos ?? []), id])];
      otro.amigos = [...new Set([...(otro.amigos ?? []), d.id])];
      await domadores.guardar(otro);
    }
    await domadores.guardar(d);
    res.json({ ok: true });
  });
  app.post('/api/amigos/quitar', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    const id = Number(req.body?.id);
    d.amigos = (d.amigos ?? []).filter((x) => x !== id);
    const otro = await domadores.get(id);
    if (otro) { otro.amigos = (otro.amigos ?? []).filter((x) => x !== d.id); await domadores.guardar(otro); }
    await domadores.guardar(d);
    res.json({ ok: true });
  });

  // Batallas amistosas: uno crea un código, el otro lo usa (por ejemplo, desde un enlace de WhatsApp)
  app.post('/api/amistosa/crear', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    if (!d.equipo.length) return res.status(400).json({ error: 'Primero elige tus Primales iniciales.' });
    for (const [c, a] of amistosas) if (a.d.id === d.id || a.vence < Date.now()) { a.resolver({ error: 'Reto cancelado.' }); amistosas.delete(c); }
    let codigo = '';
    do codigo = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); while (amistosas.has(codigo));
    // reto directo a un amigo: le aparece en el juego
    const para = req.body?.para && d.amigos?.includes(Number(req.body.para)) ? Number(req.body.para) : undefined;
    const espera = new Promise<{ roomId: string } | { error: string }>((resolver) => amistosas.set(codigo, { d, resolver, vence: Date.now() + 10 * 60_000, para }));
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

  // Modo Historia: retar a un líder de gimnasio, al Alto Mando o a la Campeona
  app.post('/api/historia/retar', async (req, res) => {
    const d = await auth(req);
    if (!d) return res.status(401).json({ error: 'Sesión no válida.' });
    if (!d.equipo.length) return res.status(400).json({ error: 'Primero elige tus Primales iniciales.' });
    const lider = liderPorId(String(req.body?.id ?? ''));
    if (!lider) return res.status(400).json({ error: 'Ese rival no existe.' });
    const err = puedeRetar(d.historia ?? historiaVacia(), lider.id);
    if (err) return res.status(400).json({ error: err });
    // si aún no está el dibujo de algún Primal, pelea con otro de su mismo estilo
    const equipo = lider.equipo.map((e, i) => ({ uid: 'lider' + i, esp: hayArte(e.esp) ? e.esp : 'hercularmor', nivel: e.nivel }));
    const rival: Participante = { id: null, nombre: lider.nombre, trofeos: lider.trofeos, equipo, ia: lider.ia,
      ficha: { avatar: avatarLider(lider), nombre: lider.nombre, trofeos: lider.trofeos, nivel: Math.max(...lider.equipo.map((e) => e.nivel)), victorias: 0, derrotas: 0, mejorTrofeos: lider.trofeos,
        favoritos: equipo.map((e) => ({ esp: e.esp, n: 0 })), ia: true, lider: lider.id } };
    res.json({ roomId: await crearBatalla({ modo: 'historia', lados: [participante(d), rival], lider: lider.id }) });
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
    const nv = e.captura.nivelSalvaje + 2;
    const salvaje: Participante = { id: null, nombre: e.nombre, trofeos: d.trofeos, equipo: [{ uid: 'salvaje', esp, nivel: nv }], ia: RAREZAS[e.rareza].ia,
      ficha: { nombre: e.nombre, trofeos: 0, nivel: nv, victorias: 0, derrotas: 0, mejorTrofeos: 0, favoritos: [{ esp, n: 0 }], ia: true, salvaje: esp } };
    const roomId = await crearBatalla({ modo: 'captura', lados: [participante(d), salvaje], especieSalvaje: esp, costo });
    res.json({ roomId, perfil: perfil(d) });
  });

  // ------------------------------------------------------------------ panel del dueño (con inicio de sesión)
  // La clave es la variable ADMIN_KEY (en Railway). En local, si no está puesta, la clave es "local".
  const enLocal = !process.env.DATABASE_URL && !process.env.RAILWAY_ENVIRONMENT;
  const claveAdmin = () => process.env.ADMIN_KEY || (enLocal ? 'local' : '');
  const sesionesAdmin = new Map<string, number>(); // token -> vence
  const tokenAdmin = (req: express.Request) => /(?:^|;\s*)pc_admin=([a-f0-9]{64})/.exec(String(req.headers.cookie ?? ''))?.[1];
  const esAdmin = (req: express.Request) => { const t = tokenAdmin(req); return !!t && (sesionesAdmin.get(t) ?? 0) > Date.now(); };
  app.post('/api/admin/entrar', async (req, res) => {
    if (limitado('admin:' + (req.ip ?? ''))) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
    const k = claveAdmin();
    if (!k) return res.status(503).json({ error: 'Falta configurar ADMIN_KEY en Railway.' });
    const dada = Buffer.from(String(req.body?.clave ?? '')), buena = Buffer.from(k);
    if (dada.length !== buena.length || !timingSafeEqual(dada, buena)) return res.status(401).json({ error: 'Clave incorrecta.' });
    const t = randomBytes(32).toString('hex');
    sesionesAdmin.set(t, Date.now() + 12 * 3_600_000);
    res.setHeader('Set-Cookie', `pc_admin=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${req.secure ? '; Secure' : ''}`);
    res.json({ ok: true });
  });
  app.post('/api/admin/salir', (req, res) => {
    const t = tokenAdmin(req);
    if (t) sesionesAdmin.delete(t);
    res.setHeader('Set-Cookie', 'pc_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    res.json({ ok: true });
  });
  app.get('/api/admin/buzon', async (req, res) => {
    if (!esAdmin(req)) return res.status(401).json({ error: 'Inicia sesión.' });
    res.json(await store.mensajes(500));
  });
  app.post('/api/admin/buzon/:id', async (req, res) => {
    if (!esAdmin(req)) return res.status(401).json({ error: 'Inicia sesión.' });
    const estado = String(req.body?.estado ?? '');
    if (!['nuevo', 'leido', 'hecho', 'archivado'].includes(estado)) return res.status(400).json({ error: 'Estado no válido.' });
    await store.estadoMensaje(Number(req.params.id), estado);
    res.json({ ok: true });
  });
  app.get('/api/admin/estadisticas', async (req, res) => {
    if (!esAdmin(req)) return res.status(401).json({ error: 'Inicia sesión.' });
    await stats.guardar();
    res.json(await resumenAdmin());
  });
  app.get('/admin', (_req, res) => {
    const f = resolve(process.cwd(), 'client/dist/admin.html');
    if (existsSync(f)) res.sendFile(f); else res.send('Falta compilar el cliente: npm run build');
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
      if (b.historia) d.historia = b.historia;
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
  console.log(`[wakas] Servidor listo en http://localhost:${PORT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
