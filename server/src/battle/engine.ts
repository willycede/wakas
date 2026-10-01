// Motor de batalla en tiempo real (autoritativo en el servidor).
// Dos lados, cada uno con hasta 6 Primales; cada lado controla a UNO a la vez en la arena
// y puede cambiarlo. Se mueve libremente, dispara su básico (combo), 4 movimientos y esquiva.
// Gana quien deja sin Primales al rival, o quien tenga más vida total al acabar el tiempo.

import {
  ARENA, DURACION_BATALLA, ESPECIES, ESPERA_CAMBIO, HABILIDADES, MOVIMIENTOS, RADIO_PRIMAL, TICK_MS,
  efectividad, moverEnArena, statsPrimal, velocidadMover, ST, type AvisoSnap, type Elemento, type Estado, type Fx, type Movimiento, type Obstaculo,
  type ProyectilSnap, type Snapshot, type UnidadSnap,
} from '../../../shared/src';

const TICK = TICK_MS / 1000;
const COMBO_VENTANA = 0.7;
const ESQUIVA_ENFRIA = 1.6;
const ESQUIVA_DIST = 110;

export interface Mods { vidaMult: number; enfriaMult: number; esperaCambio: number }

export interface Unidad {
  esp: string;
  nivel: number;
  hp: number;
  mhp: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  x: number;
  y: number;
  fa: number;
  cds: number[]; // [básico, m1..m4, esquiva] segundos restantes
  combo: number;
  comboHasta: number;
  escudo: number;
  escudoHasta: number;
  mejoraDanoHasta: number;
  mejoraVelHasta: number;
  quemaduraHasta: number;
  venenoHasta: number;
  paralisisHasta: number;
  lentoHasta: number;
  invulnHasta: number;
  accionHasta: number; // no puede hacer otra acción hasta entonces
  anim: string;
  animHasta: number;
  dash: { vx: number; vy: number; hasta: number; mov?: Movimiento; golpeados: Set<number> } | null;
  tickDot: number;
}

export interface Lado {
  unidades: Unidad[];
  activo: number;
  cambioListo: number; // tiempo en que puede volver a cambiar
  mods: Mods;
  entrada: { x: number; y: number; ax: number; ay: number } | null; // movimiento y apuntado actuales
  seq: number; // última entrada aplicada (se confirma al cliente)
  cola: { s: number; x: number; y: number; ax: number; ay: number }[];
}

interface Proyectil {
  id: number; lado: 0 | 1; x: number; y: number; vx: number; vy: number; restante: number; r: number;
  mov: Movimiento; poder: number; atraviesa: boolean; golpeados: Set<number>;
}

interface Aviso {
  id: number; lado: 0 | 1; forma: 'circulo' | 'linea'; x: number; y: number; r: number; ang?: number; largo?: number;
  hasta: number; dur: number; mov: Movimiento; poder: number;
}

export function crearUnidad(esp: string, nivel: number, mods: Mods): Unidad {
  const e = ESPECIES[esp];
  const s = statsPrimal(e, nivel);
  const mhp = Math.round(s.vida * mods.vidaMult);
  return {
    esp, nivel, hp: mhp, mhp, ataque: s.ataque, defensa: s.defensa, velocidad: s.velocidad, x: 0, y: 0, fa: 0,
    cds: [0, 0, 0, 0, 0, 0], combo: 0, comboHasta: 0, escudo: 0, escudoHasta: 0, mejoraDanoHasta: 0, mejoraVelHasta: 0,
    quemaduraHasta: 0, venenoHasta: 0, paralisisHasta: 0, lentoHasta: 0, invulnHasta: 0, accionHasta: 0,
    anim: 'idle', animHasta: 0, dash: null, tickDot: 0,
  };
}

export class Batalla {
  t = 0;
  lados: [Lado, Lado];
  proyectiles: Proyectil[] = [];
  avisos: Aviso[] = [];
  fx: Fx[] = [];
  terminado: { ganador: 0 | 1 | -1; motivo: string } | null = null;
  obstaculos: Obstaculo[];
  private seq = 1;

  constructor(a: Unidad[], b: Unidad[], modsA: Mods, modsB: Mods, obstaculos: Obstaculo[]) {
    this.obstaculos = obstaculos;
    this.lados = [
      { unidades: a, activo: 0, cambioListo: 0, mods: modsA, entrada: null, seq: 0, cola: [] },
      { unidades: b, activo: 0, cambioListo: 0, mods: modsB, entrada: null, seq: 0, cola: [] },
    ];
    this.colocar(0);
    this.colocar(1);
  }

  get restante() {
    return Math.max(0, DURACION_BATALLA - this.t);
  }

  activa(l: 0 | 1): Unidad {
    const L = this.lados[l];
    return L.unidades[L.activo];
  }

  private colocar(l: 0 | 1) {
    const u = this.activa(l);
    u.x = l === 0 ? ARENA.w * 0.22 : ARENA.w * 0.78;
    u.y = ARENA.h / 2 + (Math.random() - 0.5) * 80;
    u.fa = l === 0 ? 0 : Math.PI;
    u.invulnHasta = this.t + 1.0;
    u.anim = 'cambio';
    u.animHasta = this.t + 0.5;
  }

  // ---------------------------------------------------------------- acciones de los jugadores
  /** Entrada inmediata (la IA). */
  entrada(l: 0 | 1, x: number, y: number, ax: number, ay: number) {
    const L = this.lados[l];
    const n = Math.hypot(x, y);
    L.entrada = { x: n > 1 ? x / n : x, y: n > 1 ? y / n : y, ax, ay };
  }

  /** Entrada de un jugador: se encola y se aplica una por tick (así el cliente puede predecir). */
  encolar(l: 0 | 1, s: number, x: number, y: number, ax: number, ay: number) {
    const L = this.lados[l];
    if (s <= L.seq || L.cola.some((c) => c.s === s)) return;
    const n = Math.hypot(x, y);
    L.cola.push({ s, x: n > 1 ? x / n : x, y: n > 1 ? y / n : y, ax, ay });
    if (L.cola.length > 8) L.cola.splice(0, L.cola.length - 8);
  }

  /** i: 0 = básico, 1..4 = movimientos, 5 = esquiva. (tx, ty): hacia dónde apunta (posición en la arena). */
  accion(l: 0 | 1, i: number, tx: number, ty: number) {
    if (this.terminado) return;
    const u = this.activa(l);
    if (u.hp <= 0 || this.t < u.accionHasta || this.t < u.paralisisHasta) return;
    if (u.cds[i] > 0) return;
    const ang = Math.atan2(ty - u.y, tx - u.x);
    u.fa = ang;
    const e = ESPECIES[u.esp];
    const enfria = this.lados[l].mods.enfriaMult;
    if (i === 5) {
      // esquiva: impulso rápido e invulnerable un instante
      const mv = this.lados[l].entrada;
      const a = mv && (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : ang;
      u.dash = { vx: Math.cos(a) * ESQUIVA_DIST / 0.18, vy: Math.sin(a) * ESQUIVA_DIST / 0.18, hasta: this.t + 0.18, golpeados: new Set() };
      this.fx.push({ k: 'dash', lado: l, x: r1(u.x), y: r1(u.y), ang: r2(a) });
      u.invulnHasta = this.t + 0.28;
      u.cds[5] = ESQUIVA_ENFRIA;
      u.anim = 'dash'; u.animHasta = this.t + 0.2;
      return;
    }
    if (i === 0) return this.basico(l, u, ang, e.basico);
    const mov = MOVIMIENTOS[e.movimientos[i - 1]];
    u.cds[i] = mov.enfriamiento * enfria;
    u.accionHasta = this.t + 0.25;
    u.anim = 'mov'; u.animHasta = this.t + 0.35;
    this.fx.push({ k: 'mov', lado: l, id: mov.id, x: r1(u.x), y: r1(u.y), ang: r2(ang) });
    this.usar(l, u, mov, ang, tx, ty, 1);
  }

  /** Golpe básico: combo de 3. Cuerpo a cuerpo (zarpazos) o a distancia (disparos). */
  private basico(l: 0 | 1, u: Unidad, ang: number, tipo: 'cuerpo' | 'distancia') {
    const paso = this.t < u.comboHasta ? (u.combo % 3) + 1 : 1;
    u.combo = paso;
    u.comboHasta = this.t + COMBO_VENTANA;
    const esp = ESPECIES[u.esp];
    const el = esp.elemento;
    const fin = paso === 3;
    u.cds[0] = fin ? 0.7 : 0.42;
    u.accionHasta = this.t + (fin ? 0.3 : 0.18);
    u.anim = 'basico'; u.animHasta = this.t + 0.22;
    const falso: Movimiento = { id: 'basico', nombre: 'Básico', elemento: el, tipo: 'proyectil', desc: '', poder: fin ? 0.55 : 0.3, enfriamiento: 0, alcance: 0,
      estado: esp.habilidad === 'estatica' ? 'paralisis' : undefined, probEstado: esp.habilidad === 'estatica' ? 0.15 : 0, empuje: fin ? 50 : 10 };
    if (tipo === 'cuerpo') {
      // zarpazo en arco delante del Primal; el tercero avanza y empuja
      if (fin) u.dash = { vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, hasta: this.t + 0.12, golpeados: new Set() };
      const cx = u.x + Math.cos(ang) * 30, cy = u.y + Math.sin(ang) * 30;
      this.golpearArea(l, cx, cy, fin ? 46 : 38, falso, 1, u);
      this.fx.push({ k: 'impacto', x: r1(cx), y: r1(cy), r: fin ? 46 : 36, el });
    } else {
      const n = fin ? 3 : 1;
      for (let k = 0; k < n; k++) {
        const a = ang + (k - (n - 1) / 2) * 0.16;
        this.disparar(l, u, falso, a, 320, fin ? 10 : 8, 480, 1);
      }
    }
  }

  private usar(l: 0 | 1, u: Unidad, mov: Movimiento, ang: number, tx: number, ty: number, mult: number) {
    switch (mov.tipo) {
      case 'proyectil':
        this.disparar(l, u, mov, ang, mov.alcance, mov.radio ?? 10, mov.velocidad ?? 400, mult, mov.id === 'cuchilla_aire');
        break;
      case 'rafaga': {
        const n = mov.cantidad ?? 3;
        for (let k = 0; k < n; k++) this.disparar(l, u, mov, ang + (k - (n - 1) / 2) * ((mov.apertura ?? 12) * Math.PI / 180), mov.alcance, mov.radio ?? 9, mov.velocidad ?? 400, mult);
        break;
      }
      case 'embestida': {
        const dur = 0.22;
        u.dash = { vx: Math.cos(ang) * mov.alcance / dur, vy: Math.sin(ang) * mov.alcance / dur, hasta: this.t + dur, mov, golpeados: new Set() };
        if (mov.id === 'paso_sombrio') u.invulnHasta = this.t + dur + 0.05;
        u.anim = 'dash'; u.animHasta = this.t + dur;
        u.accionHasta = this.t + dur;
        break;
      }
      case 'area':
        this.golpearArea(l, u.x, u.y, mov.alcance, mov, mult, u);
        this.fx.push({ k: 'impacto', x: r1(u.x), y: r1(u.y), r: mov.alcance, el: mov.elemento });
        break;
      case 'zona': {
        const d = Math.min(mov.alcance, Math.hypot(tx - u.x, ty - u.y));
        const zx = clamp(u.x + Math.cos(ang) * d, 0, ARENA.w), zy = clamp(u.y + Math.sin(ang) * d, 0, ARENA.h);
        const dur = mov.preparacion ?? 0.8;
        this.avisos.push({ id: this.seq++, lado: l, forma: 'circulo', x: zx, y: zy, r: mov.radio ?? 70, hasta: this.t + dur, dur, mov, poder: mult });
        break;
      }
      case 'rayo': {
        const dur = mov.preparacion ?? 0.4;
        this.avisos.push({ id: this.seq++, lado: l, forma: 'linea', x: u.x, y: u.y, r: mov.radio ?? 22, ang, largo: mov.alcance, hasta: this.t + dur, dur, mov, poder: mult });
        u.accionHasta = this.t + dur;
        break;
      }
      case 'escudo':
        u.escudo = Math.round(u.mhp * mov.poder);
        u.escudoHasta = this.t + (mov.duracion ?? 5);
        break;
      case 'curar': {
        const n = Math.min(u.mhp - u.hp, Math.round(u.mhp * mov.poder));
        u.hp += n;
        this.fx.push({ k: 'cura', lado: l, x: r1(u.x), y: r1(u.y), n });
        break;
      }
      case 'mejora':
        if (mov.id === 'aceleron') u.mejoraVelHasta = this.t + (mov.duracion ?? 5);
        else u.mejoraDanoHasta = this.t + (mov.duracion ?? 6);
        break;
    }
  }

  private disparar(l: 0 | 1, u: Unidad, mov: Movimiento, ang: number, alcance: number, r: number, vel: number, mult: number, atraviesa = false) {
    this.proyectiles.push({
      id: this.seq++, lado: l, x: u.x + Math.cos(ang) * 20, y: u.y + Math.sin(ang) * 20, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel,
      restante: alcance, r, mov, poder: mult, atraviesa, golpeados: new Set(),
    });
  }

  cambiar(l: 0 | 1, slot: number) {
    if (this.terminado) return;
    const L = this.lados[l];
    if (slot === L.activo || !L.unidades[slot] || L.unidades[slot].hp <= 0) return;
    if (this.t < L.cambioListo && this.activa(l).hp > 0) return;
    const viejo = this.activa(l);
    const nuevo = L.unidades[slot];
    nuevo.x = viejo.x; nuevo.y = viejo.y; nuevo.fa = viejo.fa;
    viejo.dash = null;
    L.activo = slot;
    L.cambioListo = this.t + L.mods.esperaCambio;
    nuevo.invulnHasta = this.t + 0.6;
    nuevo.anim = 'cambio'; nuevo.animHasta = this.t + 0.4;
    nuevo.accionHasta = this.t + 0.3;
    this.fx.push({ k: 'cambio', lado: l, esp: nuevo.esp, x: r1(nuevo.x), y: r1(nuevo.y) });
  }

  // ---------------------------------------------------------------- daño
  private danar(l: 0 | 1, atacante: Unidad, mov: Movimiento, mult: number) {
    const def = this.activa(l === 0 ? 1 : 0);
    const dl = l === 0 ? 1 : 0;
    if (def.hp <= 0 || this.t < def.invulnHasta) return;
    const espDef = ESPECIES[def.esp];
    if (espDef.habilidad === 'sombra_esquiva' && Math.random() < 0.15) {
      this.fx.push({ k: 'esquiva', lado: dl, x: r1(def.x), y: r1(def.y) });
      return;
    }
    const espAt = ESPECIES[atacante.esp];
    const ef = efectividad(mov.elemento, espDef.elemento);
    const stab = mov.elemento === espAt.elemento ? 1.2 : 1;
    let dano = (atacante.ataque * mov.poder * 0.6 * (100 / (100 + def.defensa * 1.6))) * ef * stab * mult;
    // habilidades
    const bajo = atacante.hp < atacante.mhp * 0.35;
    const potenciado: Record<string, Elemento> = { brasa_interior: 'fuego', marea: 'agua', espesura: 'planta' };
    if (bajo && potenciado[espAt.habilidad] === mov.elemento) dano *= 1.3;
    if (espAt.habilidad === 'furia_tormenta') dano *= 1.12;
    if (this.t < atacante.mejoraDanoHasta) dano *= 1.35;
    if (espDef.habilidad === 'roca_solida') dano *= 0.85;
    const crit = Math.random() < 0.08;
    if (crit) dano *= 1.5;
    dano = Math.max(1, Math.round(dano * (0.92 + Math.random() * 0.16)));
    if (def.escudo > 0 && this.t < def.escudoHasta) {
      const a = Math.min(def.escudo, dano);
      def.escudo -= a;
      dano -= a;
    }
    def.hp = Math.max(0, def.hp - dano);
    def.anim = 'golpe'; def.animHasta = this.t + 0.18;
    this.fx.push({ k: 'dano', lado: dl, x: r1(def.x), y: r1(def.y), n: dano, ef, crit: crit || undefined });
    // estados
    if (mov.estado && Math.random() < (mov.probEstado ?? 0)) this.aplicarEstado(dl, def, mov.estado);
    // empuje
    if (mov.empuje) {
      const a = Math.atan2(def.y - atacante.y, def.x - atacante.x);
      this.moverUnidad(def, Math.cos(a) * mov.empuje * 0.5, Math.sin(a) * mov.empuje * 0.5);
    }
    if (def.hp <= 0) this.caer(dl as 0 | 1);
  }

  private aplicarEstado(l: 0 | 1, u: Unidad, e: Estado) {
    if (e === 'quemadura') u.quemaduraHasta = this.t + 3;
    if (e === 'veneno') u.venenoHasta = this.t + 4;
    if (e === 'paralisis') u.paralisisHasta = this.t + 0.9;
    if (e === 'lento') u.lentoHasta = this.t + 2.5;
    this.fx.push({ k: 'estado', lado: l, x: r1(u.x), y: r1(u.y), estado: e });
  }

  private caer(l: 0 | 1) {
    const L = this.lados[l];
    const u = this.activa(l);
    u.anim = 'caido';
    this.fx.push({ k: 'caido', lado: l, esp: u.esp, x: r1(u.x), y: r1(u.y) });
    const siguiente = L.unidades.findIndex((x) => x.hp > 0);
    if (siguiente < 0) {
      this.terminado = { ganador: l === 0 ? 1 : 0, motivo: 'ko' };
      return;
    }
    // entra automáticamente el siguiente Primal en pie
    const pos = { x: u.x, y: u.y };
    L.activo = siguiente;
    const n = L.unidades[siguiente];
    n.x = pos.x; n.y = pos.y;
    n.invulnHasta = this.t + 1.2;
    n.anim = 'cambio'; n.animHasta = this.t + 0.4;
    L.cambioListo = this.t + 1.0;
    this.fx.push({ k: 'cambio', lado: l, esp: n.esp, x: r1(n.x), y: r1(n.y) });
  }

  private golpearArea(l: 0 | 1, x: number, y: number, r: number, mov: Movimiento, mult: number, at: Unidad) {
    const def = this.activa(l === 0 ? 1 : 0);
    if (Math.hypot(def.x - x, def.y - y) <= r + RADIO_PRIMAL) this.danar(l, at, mov, mult);
  }

  // ---------------------------------------------------------------- movimiento y colisión
  private moverUnidad(u: Unidad, dx: number, dy: number) {
    const r = moverEnArena(u.x, u.y, dx, dy, this.obstaculos);
    u.x = r.x; u.y = r.y;
  }

  /** Bits de estado de una unidad (los mismos que ve el cliente). */
  estado(x: Unidad): number {
    const t = this.t;
    return (t < x.quemaduraHasta ? ST.quemadura : 0) | (t < x.paralisisHasta ? ST.paralisis : 0) | (t < x.lentoHasta ? ST.lento : 0) |
      (t < x.venenoHasta ? ST.veneno : 0) | (t < x.invulnHasta ? ST.invulnerable : 0) | (t < Math.max(x.mejoraDanoHasta, x.mejoraVelHasta) ? ST.mejora : 0) |
      (t < x.mejoraVelHasta ? ST.rapido : 0) | (t < x.accionHasta ? ST.frenado : 0);
  }

  // ---------------------------------------------------------------- simulación
  tick() {
    if (this.terminado) return;
    this.t += TICK;
    for (const l of [0, 1] as const) this.tickLado(l);
    this.tickProyectiles();
    this.tickAvisos();
    // separa a los dos Primales activos si se solapan
    const a = this.activa(0), b = this.activa(1);
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < RADIO_PRIMAL * 2 && d > 0.01) {
      const push = (RADIO_PRIMAL * 2 - d) / 2;
      this.moverUnidad(a, ((a.x - b.x) / d) * push, ((a.y - b.y) / d) * push);
      this.moverUnidad(b, ((b.x - a.x) / d) * push, ((b.y - a.y) / d) * push);
    }
    if (this.restante <= 0 && !this.terminado) {
      const vida = (l: 0 | 1) => this.lados[l].unidades.reduce((s, u) => s + u.hp / u.mhp, 0);
      const v0 = vida(0), v1 = vida(1);
      this.terminado = { ganador: Math.abs(v0 - v1) < 0.01 ? -1 : v0 > v1 ? 0 : 1, motivo: 'tiempo' };
    }
  }

  private tickLado(l: 0 | 1) {
    const L = this.lados[l];
    for (const u of L.unidades) for (let k = 0; k < u.cds.length; k++) u.cds[k] = Math.max(0, u.cds[k] - TICK);
    // una entrada del jugador por tick (si no llegó ninguna, se mantiene la última)
    const sig = L.cola.shift();
    if (sig) { L.entrada = { x: sig.x, y: sig.y, ax: sig.ax, ay: sig.ay }; L.seq = sig.s; }
    const u = this.activa(l);
    if (u.hp <= 0) return;
    if (u.animHasta && this.t > u.animHasta) { u.anim = 'idle'; u.animHasta = 0; }
    // daño por estados, cada medio segundo
    u.tickDot += TICK;
    if (u.tickDot >= 0.5) {
      u.tickDot = 0;
      const dot = (this.t < u.quemaduraHasta ? 0.012 : 0) + (this.t < u.venenoHasta ? 0.015 : 0);
      if (dot > 0) {
        const n = Math.max(1, Math.round(u.mhp * dot));
        u.hp = Math.max(0, u.hp - n);
        this.fx.push({ k: 'dano', lado: l, x: r1(u.x), y: r1(u.y), n, ef: 1 });
        if (u.hp <= 0) return this.caer(l);
      }
    }
    if (u.escudo > 0 && this.t > u.escudoHasta) u.escudo = 0;
    // embestidas y esquivas
    if (u.dash) {
      if (this.t >= u.dash.hasta) u.dash = null;
      else {
        this.moverUnidad(u, u.dash.vx * TICK, u.dash.vy * TICK);
        const mov = u.dash.mov;
        const def = this.activa(l === 0 ? 1 : 0);
        if (mov && !u.dash.golpeados.has(1) && Math.hypot(def.x - u.x, def.y - u.y) <= (mov.radio ?? 24) + RADIO_PRIMAL) {
          u.dash.golpeados.add(1);
          this.danar(l, u, mov, 1);
        }
        return;
      }
    }
    // movimiento con la entrada del jugador
    const e = L.entrada;
    if (e && (e.x || e.y) && this.t >= u.paralisisHasta) {
      const v = velocidadMover(u.esp, u.velocidad, this.estado(u));
      this.moverUnidad(u, e.x * v * TICK, e.y * v * TICK);
      if (u.anim === 'idle' || u.anim === 'mover') u.anim = 'mover';
      if (this.t >= u.accionHasta) u.fa = Math.atan2(e.y, e.x);
    } else if (u.anim === 'mover') u.anim = 'idle';
  }

  private tickProyectiles() {
    const vivos: Proyectil[] = [];
    for (const p of this.proyectiles) {
      p.x += p.vx * TICK;
      p.y += p.vy * TICK;
      p.restante -= Math.hypot(p.vx, p.vy) * TICK;
      let fuera = p.restante <= 0 || p.x < 0 || p.y < 0 || p.x > ARENA.w || p.y > ARENA.h;
      for (const o of this.obstaculos) if (Math.hypot(p.x - o.x, p.y - o.y) < o.r) fuera = true;
      const def = this.activa(p.lado === 0 ? 1 : 0);
      if (!fuera && def.hp > 0 && !p.golpeados.has(1) && Math.hypot(def.x - p.x, def.y - p.y) <= p.r + RADIO_PRIMAL) {
        p.golpeados.add(1);
        const at = this.activa(p.lado);
        this.danar(p.lado, at, p.mov, p.poder);
        this.fx.push({ k: 'impacto', x: r1(p.x), y: r1(p.y), r: p.r * 2, el: p.mov.elemento });
        if (!p.atraviesa) fuera = true;
      }
      if (!fuera) vivos.push(p);
    }
    this.proyectiles = vivos;
  }

  private tickAvisos() {
    const vivos: Aviso[] = [];
    for (const a of this.avisos) {
      if (this.t < a.hasta) { vivos.push(a); continue; }
      const at = this.activa(a.lado);
      const def = this.activa(a.lado === 0 ? 1 : 0);
      let dentro = false;
      if (a.forma === 'circulo') dentro = Math.hypot(def.x - a.x, def.y - a.y) <= a.r + RADIO_PRIMAL;
      else {
        const ux = Math.cos(a.ang!), uy = Math.sin(a.ang!);
        const dx = def.x - a.x, dy = def.y - a.y;
        const along = dx * ux + dy * uy, across = Math.abs(-dx * uy + dy * ux);
        dentro = along >= -RADIO_PRIMAL && along <= a.largo! + RADIO_PRIMAL && across <= a.r + RADIO_PRIMAL;
      }
      if (dentro) this.danar(a.lado, at, a.mov, a.poder);
      const cx = a.forma === 'circulo' ? a.x : a.x + Math.cos(a.ang!) * a.largo! / 2;
      const cy = a.forma === 'circulo' ? a.y : a.y + Math.sin(a.ang!) * a.largo! / 2;
      this.fx.push({ k: 'impacto', x: r1(cx), y: r1(cy), r: a.forma === 'circulo' ? a.r : a.r * 2, el: a.mov.elemento });
    }
    this.avisos = vivos;
  }

  // ---------------------------------------------------------------- instantánea
  snapshot(paraLado: 0 | 1, ack: number): Snapshot {
    const u: UnidadSnap[] = ([0, 1] as const).map((l) => {
      const x = this.activa(l);
      return {
        lado: l, slot: this.lados[l].activo, esp: x.esp, nv: x.nivel, x: r1(x.x), y: r1(x.y), hp: x.hp, mhp: x.mhp, sh: x.escudo,
        fa: r2(x.fa), an: x.anim,
        st: this.estado(x),
      };
    });
    const pj: ProyectilSnap[] = this.proyectiles.map((p) => ({ id: p.id, x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), el: p.mov.elemento, r: p.r }));
    const av: AvisoSnap[] = this.avisos.map((a) => ({
      id: a.id, forma: a.forma, x: r1(a.x), y: r1(a.y), r: a.r, ang: a.ang !== undefined ? r2(a.ang) : undefined, largo: a.largo,
      t: r2(a.hasta - this.t), dur: a.dur, el: a.mov.elemento, lado: a.lado,
    }));
    const eq = ([0, 1] as const).map((l) => {
      const L = this.lados[l];
      return { hp: L.unidades.map((x) => x.hp), mhp: L.unidades.map((x) => x.mhp), esp: L.unidades.map((x) => x.esp), activo: L.activo, cambioListo: r2(Math.max(0, L.cambioListo - this.t)) };
    }) as Snapshot['eq'];
    return { t: Date.now(), ack: this.lados[paraLado].seq || ack, tiempo: Math.ceil(this.restante), u, pj, av, eq, cds: this.activa(paraLado).cds.map(r2) };
  }
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function r1(v: number) {
  return Math.round(v * 10) / 10;
}
function r2(v: number) {
  return Math.round(v * 100) / 100;
}
