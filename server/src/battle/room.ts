// Sala de batalla (Colyseus). Liga: dos Domadores (o uno contra la IA si no hay rival a tiempo).
// Captura: un Domador contra un Primal salvaje (con IA). 20 ticks por segundo.

import { Room, type Client } from 'colyseus';
import { ARENA, ESPECIES, TICK_MS, type InicioBatalla, type Obstaculo } from '../../../shared/src';
import type { Domador } from '../db';
import { mods, recompensar } from '../progress';
import { domadores, store } from '../services';
import { IA } from './ai';
import { Batalla, crearUnidad, type Unidad } from './engine';

export interface Participante { id: number | null; nombre: string; trofeos: number; equipo: { uid: string; esp: string; nivel: number }[]; ia?: number }

export interface OpcionesBatalla {
  modo: 'liga' | 'captura';
  lados: [Participante, Participante];
  especieSalvaje?: string;
  costo?: number;
}

function obstaculos(): Obstaculo[] {
  const out: Obstaculo[] = [];
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    // simétricos respecto al centro, para que sea justo
    const x = ARENA.w * (0.32 + Math.random() * 0.14), y = ARENA.h * (0.15 + Math.random() * 0.7), r = 22 + Math.random() * 16;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 60)) continue;
    out.push({ x, y, r }, { x: ARENA.w - x, y: ARENA.h - y, r });
  }
  return out;
}

export class BatallaRoom extends Room {
  maxClients = 2;
  opts!: OpcionesBatalla;
  b!: Batalla;
  ias: IA[] = [];
  clientes = new Map<string, 0 | 1>();
  acks: [number, number] = [0, 0];
  private fin = false;
  private inicio = 0;
  private uids: [Set<string>, Set<string>] = [new Set(), new Set()];

  onCreate(opts: OpcionesBatalla) {
    this.opts = opts;
    this.setPrivate(true);
    const equipos = opts.lados.map((p, l) => p.equipo.map((e) => crearUnidad(e.esp, e.nivel, l === 0 ? this.modsDe(p) : this.modsDe(p)))) as [Unidad[], Unidad[]];
    this.b = new Batalla(equipos[0], equipos[1], this.modsDe(opts.lados[0]), this.modsDe(opts.lados[1]), obstaculos());
    opts.lados.forEach((p, l) => { if (p.ia !== undefined) this.ias.push(new IA(this.b, l as 0 | 1, p.ia)); });
    opts.lados.forEach((p, l) => { if (p.equipo[0]) this.uids[l].add(p.equipo[0].uid); });
    this.onMessage('in', (c, m) => {
      const l = this.clientes.get(c.sessionId);
      if (l === undefined || typeof m !== 'object') return;
      this.b.encolar(l, num(m.s), num(m.x), num(m.y), num(m.ax), num(m.ay));
      this.acks[l] = num(m.s);
    });
    this.onMessage('acc', (c, m) => {
      const l = this.clientes.get(c.sessionId);
      if (l === undefined || this.inicio > Date.now()) return;
      this.b.accion(l, Math.max(0, Math.min(5, Math.floor(num(m.i)))), num(m.x), num(m.y));
    });
    this.onMessage('cambio', (c, m) => {
      const l = this.clientes.get(c.sessionId);
      if (l === undefined) return;
      this.b.cambiar(l, Math.floor(num(m.slot)));
      const u = this.b.lados[l].unidades[this.b.lados[l].activo];
      const eq = this.opts.lados[l].equipo[this.b.lados[l].activo];
      if (u && eq) this.uids[l].add(eq.uid);
    });
    this.onMessage('rendirse', (c) => {
      const l = this.clientes.get(c.sessionId);
      if (l !== undefined && !this.b.terminado) this.b.terminado = { ganador: l === 0 ? 1 : 0, motivo: 'rendicion' };
    });
    this.setSimulationInterval(() => this.tick(), TICK_MS);
    // si nadie entra en 30 s, la sala se cierra
    this.clock.setTimeout(() => { if (!this.clientes.size) this.disconnect(); }, 30_000);
  }

  private modsDe(p: Participante) {
    const d = p.id !== null ? domadores.cache.get(p.id) : undefined;
    return d ? mods(d) : { vidaMult: 1, enfriaMult: 1, esperaCambio: 3.5 };
  }

  async onAuth(_c: Client, o: any) {
    const id = await store.sesion(String(o?.token ?? ''));
    if (!id) throw new Error('Sesión no válida.');
    const lado = this.opts.lados.findIndex((p) => p.id === id);
    if (lado < 0) throw new Error('Esta batalla no es tuya.');
    return { id, lado };
  }

  onJoin(c: Client, _o: any, auth: { id: number; lado: 0 | 1 }) {
    this.clientes.set(c.sessionId, auth.lado);
    const o = this.opts;
    const init: InicioBatalla = {
      lado: auth.lado, modo: o.modo, rivalIA: o.lados[auth.lado === 0 ? 1 : 0].id === null,
      nombres: [o.lados[0].nombre, o.lados[1].nombre], trofeos: [o.lados[0].trofeos, o.lados[1].trofeos], obstaculos: this.b.obstaculos,
      movimientos: o.lados[auth.lado].equipo.map((e) => ESPECIES[e.esp].movimientos),
    };
    c.send('inicio', init);
    // la batalla empieza 3 s después de que estén todos
    const humanos = o.lados.filter((p) => p.id !== null).length;
    if (this.clientes.size >= humanos) {
      this.inicio = Date.now() + 3000;
      this.broadcast('cuenta', { ms: 3000 });
    }
  }

  onLeave(c: Client) {
    const l = this.clientes.get(c.sessionId);
    this.clientes.delete(c.sessionId);
    // abandonar = perder
    if (l !== undefined && !this.b.terminado && !this.fin) this.b.terminado = { ganador: l === 0 ? 1 : 0, motivo: 'abandono' };
  }

  private tick() {
    if (this.fin) return;
    if (!this.inicio || Date.now() < this.inicio) {
      for (const c of this.clients) {
        const l = this.clientes.get(c.sessionId)!;
        c.send('snap', this.b.snapshot(l, this.acks[l]));
      }
      return;
    }
    for (const ia of this.ias) ia.tick();
    this.b.tick();
    // registra quién ha peleado (para repartir experiencia)
    for (const l of [0, 1] as const) {
      const eq = this.opts.lados[l].equipo[this.b.lados[l].activo];
      if (eq) this.uids[l].add(eq.uid);
    }
    for (const c of this.clients) {
      const l = this.clientes.get(c.sessionId)!;
      c.send('snap', this.b.snapshot(l, this.acks[l]));
    }
    if (this.b.fx.length) {
      this.broadcast('fx', this.b.fx);
      this.b.fx = [];
    }
    if (this.b.terminado) void this.terminar();
  }

  private async terminar() {
    this.fin = true;
    const t = this.b.terminado!;
    for (const l of [0, 1] as const) {
      const p = this.opts.lados[l];
      if (p.id === null) continue;
      const d = await domadores.get(p.id);
      if (!d) continue;
      const gano = t.ganador === l;
      const empate = t.ganador === -1;
      let capturado: string | undefined;
      if (this.opts.modo === 'captura' && gano && this.opts.especieSalvaje) capturado = this.opts.especieSalvaje;
      const res = recompensar(d, gano, empate, this.opts.modo, [...this.uids[l]], capturado);
      res.motivo = t.motivo;
      await domadores.guardar(d);
      for (const c of this.clients) if (this.clientes.get(c.sessionId) === l) c.send('fin', res);
    }
    this.clock.setTimeout(() => this.disconnect(), 3000);
  }
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type { Domador };
