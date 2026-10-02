// Sala de batalla (Colyseus). Liga: dos Domadores (o uno contra la IA si no hay rival a tiempo).
// Captura: un Domador contra un Primal salvaje (con IA). 20 ticks por segundo.

import { Room, type Client } from 'colyseus';
import { ARENA, EMOTES, ESPECIES, FRASES, SEGUNDOS_PREPARACION, TICK_MS, ligaDe, type FichaRival, type FinBatalla, type InicioBatalla, type Obstaculo, type Preparacion } from '../../../shared/src';
import type { Domador } from '../db';
import { avanzarMision, equipoValido, mods, recompensar } from '../progress';
import { domadores, store } from '../services';
import { IA } from './ai';
import { Batalla, crearUnidad, type Unidad } from './engine';

export interface Participante { id: number | null; nombre: string; trofeos: number; equipo: { uid: string; esp: string; nivel: number }[]; ia?: number; pasivo?: boolean; ficha?: FichaRival }

export interface OpcionesBatalla {
  modo: 'liga' | 'captura' | 'tutorial' | 'amistosa';
  lados: [Participante, Participante];
  especieSalvaje?: string;
  costo?: number;
}

/** Obstáculos simétricos (para que sea justo). En las ligas de piedra se levantan murallas:
 * una fila de bloques que corta el paso y obliga a rodear. */
function obstaculos(liga: string): Obstaculo[] {
  const out: Obstaculo[] = [];
  if (liga === 'diamante' || liga === 'campeon' || liga === 'oro') {
    const vertical = Math.random() < 0.5;
    const cx = ARENA.w * (0.36 + Math.random() * 0.06), cy = ARENA.h * (0.28 + Math.random() * 0.12);
    for (let k = 0; k < 4; k++) {
      const x = vertical ? cx : cx + (k - 1.5) * 34, y = vertical ? cy + (k - 1.5) * 34 : cy;
      out.push({ x, y, r: 18, k: 'muro' }, { x: ARENA.w - x, y: ARENA.h - y, r: 18, k: 'muro' });
    }
  }
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
  private nivelMax = 99;
  private inicio = 0;
  private uids: [Set<string>, Set<string>] = [new Set(), new Set()];
  private preparando = false;
  private listos = new Set<number>();

  onCreate(opts: OpcionesBatalla) {
    this.opts = opts;
    this.setPrivate(true);
    // en la Liga y en las amistosas los Primales pelean como mucho al nivel máximo de la liga
    this.nivelMax = opts.modo === 'liga' || opts.modo === 'amistosa' ? ligaDe(Math.max(opts.lados[0].trofeos, opts.lados[1].trofeos)).nivelMax : 99;
    this.registrarMensajes();
    // tutorial: sin preparación
    if (opts.modo === 'tutorial') this.armar();
    // si nadie entra en 30 s, la sala se cierra
    this.clock.setTimeout(() => { if (!this.clientes.size) this.disconnect(); }, 30_000);
  }

  /** Arma la batalla con los equipos elegidos. */
  private armar() {
    if (this.b) return;
    const opts = this.opts;
    const equipos = opts.lados.map((p) => p.equipo.map((e) => crearUnidad(e.esp, Math.min(e.nivel, this.nivelMax), this.modsDe(p)))) as [Unidad[], Unidad[]];
    this.b = new Batalla(equipos[0], equipos[1], this.modsDe(opts.lados[0]), this.modsDe(opts.lados[1]), opts.modo === 'tutorial' ? [] : obstaculos(ligaDe(Math.max(opts.lados[0].trofeos, opts.lados[1].trofeos)).id));
    opts.lados.forEach((p, l) => { if (p.ia !== undefined && !p.pasivo) this.ias.push(new IA(this.b, l as 0 | 1, p.ia)); });
    if (opts.modo === 'tutorial') {
      // el muñeco de práctica aguanta hasta el último paso del tutorial
      const m = this.b.lados[1].unidades[0];
      m.mhp *= 8; m.hp = m.mhp;
    }
    opts.lados.forEach((p, l) => { if (p.equipo[0]) this.uids[l].add(p.equipo[0].uid); });
    this.setSimulationInterval(() => this.tick(), TICK_MS);
  }

  private registrarMensajes() {
    // preparación: cambiar el equipo elegido y avisar que estás listo
    this.onMessage('prep_equipo', async (c, m) => {
      const l = this.clientes.get(c.sessionId);
      const p = l !== undefined ? this.opts.lados[l] : null;
      if (!this.preparando || !p || p.id === null) return;
      const d = await domadores.get(p.id);
      const u = d ? equipoValido(d, m?.uids) : null;
      if (!d || !u) return;
      p.equipo = u.map((x) => d.primales.find((y) => y.uid === x)!).map((y) => ({ uid: y.uid, esp: y.esp, nivel: y.nivel }));
      d.equipo = u; // se recuerda para la próxima
      await domadores.guardar(d);
    });
    this.onMessage('prep_listo', (c) => {
      const l = this.clientes.get(c.sessionId);
      if (!this.preparando || l === undefined) return;
      this.listos.add(l);
      this.broadcast('prep_listo', { lado: l });
      const humanos = this.opts.lados.filter((p) => p.id !== null).length;
      if (this.listos.size >= humanos) this.comenzar();
    });
    this.onMessage('in', (c, m) => {
      const l = this.clientes.get(c.sessionId);
      if (l === undefined || typeof m !== 'object' || !this.b) return;
      this.b.encolar(l, num(m.s), num(m.x), num(m.y), num(m.ax), num(m.ay));
      this.acks[l] = num(m.s);
    });
    this.onMessage('acc', (c, m) => {
      const l = this.clientes.get(c.sessionId);
      if (l === undefined || !this.b || this.inicio > Date.now()) return;
      this.b.accion(l, Math.max(0, Math.min(7, Math.floor(num(m.i)))));
    });
    // emotes al rival (como mucho uno cada 1,5 s)
    const ultEmote = new Map<string, number>();
    this.onMessage('emote', (c, m) => {
      const l = this.clientes.get(c.sessionId);
      const id = String(m?.id ?? '');
      if (l === undefined || ![...EMOTES, ...FRASES].includes(id as never)) return;
      if (Date.now() - (ultEmote.get(c.sessionId) ?? 0) < 1500) return;
      ultEmote.set(c.sessionId, Date.now());
      this.broadcast('emote', { lado: l, id });
    });
    this.onMessage('cambio', (c, m) => {
      const l = this.clientes.get(c.sessionId);
      if (l === undefined || !this.b) return;
      this.b.cambiar(l, Math.floor(num(m.slot)));
      const u = this.b.lados[l].unidades[this.b.lados[l].activo];
      const eq = this.opts.lados[l].equipo[this.b.lados[l].activo];
      if (u && eq) this.uids[l].add(eq.uid);
    });
    // tutorial: llenar la barra para practicar la técnica especial y debilitar al muñeco al final
    this.onMessage('tutorial', (c, m) => {
      const l = this.clientes.get(c.sessionId);
      if (l === undefined || this.opts.modo !== 'tutorial' || !this.b) return;
      if (m?.paso === 'carga') this.b.lados[l].carga = 100;
      if (m?.paso === 'final') { const u = this.b.lados[1].unidades[0]; u.mhp = Math.round(u.mhp / 8); u.hp = Math.min(u.hp, Math.round(u.mhp * 0.6)); }
    });
    // truco de prueba (solo en local): llena la barra de técnicas especiales
    if (!process.env.DATABASE_URL && !process.env.RAILWAY_ENVIRONMENT) {
      this.onMessage('truco_carga', (c) => {
        const l = this.clientes.get(c.sessionId);
        if (l !== undefined && this.b) this.b.lados[l].carga = 200;
      });
    }
    this.onMessage('rendirse', (c) => {
      const l = this.clientes.get(c.sessionId);
      if (l !== undefined && this.b && !this.b.terminado) this.b.terminado = { ganador: l === 0 ? 1 : 0, motivo: 'rendicion' };
    });
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
    const humanos = this.opts.lados.filter((p) => p.id !== null).length;
    if (this.b) return this.enviarInicio(c, auth.lado);
    if (this.clientes.size >= humanos) this.preparar();
  }

  /** 20 segundos para elegir equipo viendo la ficha del rival. */
  private preparar() {
    this.preparando = true;
    const ms = SEGUNDOS_PREPARACION * 1000;
    for (const c of this.clients) {
      const l = this.clientes.get(c.sessionId)!;
      const r = this.opts.lados[l === 0 ? 1 : 0];
      const prep: Preparacion = {
        ms, modo: this.opts.modo, equipo: this.opts.lados[l].equipo.map((e) => e.uid), nivelMax: this.nivelMax < 99 ? this.nivelMax : undefined,
        rival: r.ficha ?? { nombre: r.nombre, trofeos: r.trofeos, nivel: 1, victorias: 0, derrotas: 0, mejorTrofeos: r.trofeos, favoritos: r.equipo.map((e) => ({ esp: e.esp, n: 0 })), ia: r.id === null },
      };
      c.send('preparar', prep);
    }
    this.clock.setTimeout(() => this.comenzar(), ms + 300);
  }

  private comenzar() {
    if (this.b) return;
    this.preparando = false;
    this.armar();
    for (const c of this.clients) this.enviarInicio(c, this.clientes.get(c.sessionId)!);
    this.inicio = Date.now() + 3000;
    this.broadcast('cuenta', { ms: 3000 });
  }

  private enviarInicio(c: Client, lado: 0 | 1) {
    const o = this.opts;
    const auth = { lado };
    const init: InicioBatalla = {
      lado: auth.lado, modo: o.modo, rivalIA: o.lados[auth.lado === 0 ? 1 : 0].id === null,
      nombres: [o.lados[0].nombre, o.lados[1].nombre], trofeos: [o.lados[0].trofeos, o.lados[1].trofeos], obstaculos: this.b.obstaculos,
      movimientos: o.lados[auth.lado].equipo.map((e) => ESPECIES[e.esp].movimientos),
      liga: ligaDe(Math.max(o.lados[0].trofeos, o.lados[1].trofeos)).id,
      nivelMax: this.nivelMax < 99 ? this.nivelMax : undefined,
      // el salvaje no tiene Entrenador
      avatares: o.lados.map((p) => (p.ficha?.salvaje ? null : p.ficha?.avatar ?? null)) as InicioBatalla['avatares'],
    };
    c.send('inicio', init);
    // tutorial: empieza en cuanto entra
    if (o.modo === 'tutorial' && !this.inicio) { this.inicio = Date.now() + 3000; this.broadcast('cuenta', { ms: 3000 }); }
  }

  onLeave(c: Client) {
    const l = this.clientes.get(c.sessionId);
    this.clientes.delete(c.sessionId);
    // abandonar = perder (también durante la preparación)
    if (l !== undefined && !this.b) this.comenzar();
    if (l !== undefined && !this.b.terminado && !this.fin) this.b.terminado = { ganador: l === 0 ? 1 : 0, motivo: 'abandono' };
  }

  private tick() {
    if (this.fin || !this.b) return;
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
      this.emotesIA();
      this.broadcast('fx', this.b.fx);
      this.b.fx = [];
    }
    if (this.b.terminado) void this.terminar();
  }

  /** La IA también reacciona con emotes (de vez en cuando, para que se sienta viva). */
  private ultEmoteIA = 0;
  private emotesIA() {
    const ia = this.opts.lados.findIndex((p) => p.ia !== undefined && p.id === null);
    if (ia < 0 || this.opts.modo === 'captura' || Date.now() - this.ultEmoteIA < 6000) return;
    for (const f of this.b.fx) {
      let id: string | null = null;
      if (f.k === 'caido') id = f.lado === ia ? (Math.random() < 0.4 ? 'llanto' : null) : (Math.random() < 0.5 ? 'risa' : null);
      else if (f.k === 'especial' && f.lado === ia && Math.random() < 0.3) id = 'fiesta';
      else if (f.k === 'esquiva' && f.lado === ia && Math.random() < 0.3) id = 'wow';
      if (id) { this.ultEmoteIA = Date.now(); this.broadcast('emote', { lado: ia, id }); return; }
    }
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
      if (this.opts.modo === 'amistosa' || this.opts.modo === 'tutorial') {
        // sin trofeos ni experiencia; el tutorial regala 200 monedas la primera vez
        let monedas = 0;
        if (this.opts.modo === 'tutorial' && gano && !d.tutorial) { monedas = 200; d.monedas += monedas; d.tutorial = true; }
        if (this.opts.modo === 'amistosa') avanzarMision(d, 'amistosa');
        await domadores.guardar(d);
        const res: FinBatalla = { gano, empate, motivo: t.motivo, trofeos: 0, monedas, xpDomador: 0, xpPrimales: [], medallasNuevas: [], nivelDomador: d.nivel, subioDomador: 0 };
        for (const c of this.clients) if (this.clientes.get(c.sessionId) === l) c.send('fin', res);
        continue;
      }
      let capturado: string | undefined;
      if (this.opts.modo === 'captura' && gano && this.opts.especieSalvaje) capturado = this.opts.especieSalvaje;
      const res = recompensar(d, gano, empate, this.opts.modo, [...this.uids[l]], capturado, this.b.lados[l].stats);
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
