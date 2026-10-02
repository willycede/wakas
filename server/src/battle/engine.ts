// Motor de batalla en tiempo real (autoritativo en el servidor).
// Dos lados, cada uno con hasta 3 Primales; cada lado controla a UNO a la vez en la arena
// y puede cambiarlo. Se mueve libremente, dispara su básico (combo), 4 movimientos y esquiva.
// Gana quien deja sin Primales al rival, o quien tenga más vida total al acabar el tiempo.

import {
  ARENA, CARGA_MAX, DURACION_BATALLA, ESPECIALES, ESPECIALES_LEGENDARIOS, ESPECIES, ESPERA_CAMBIO, HABILIDADES, MOVIMIENTOS, RADIO_PRIMAL, TICK_MS,
  cargaMax, efectividad, especialesDe, movDesbloqueado, moverEnArena, statsPrimal, tipos, velocidadMover, ST, type AvisoSnap, type CampoSnap, type Estado, type Fx,
  type Habilidad, type Movimiento, type Obstaculo, type ProyectilSnap, type Snapshot, type UnidadSnap,
} from '../../../shared/src';

const habDe = (esp: string): Habilidad => HABILIDADES[ESPECIES[esp].habilidad] ?? { id: '', nombre: '', desc: '' };

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
  dash: { vx: number; vy: number; hasta: number; mov?: Movimiento; golpeados: Set<number>; poder?: number; alLlegar?: () => void } | null;
  enlaceHasta: number; // tras el tercer golpe básico: un movimiento hace +30%
  tickDot: number;
  tickRegen: number;
  vueloHasta: number; // en el aire (Vuelo del cóndor): no se mueve ni recibe golpes
}

export interface Lado {
  unidades: Unidad[];
  activo: number;
  cambioListo: number; // tiempo en que puede volver a cambiar
  mods: Mods;
  entrada: { x: number; y: number; ax: number; ay: number } | null; // movimiento y apuntado actuales
  seq: number; // última entrada aplicada (se confirma al cliente)
  cola: { s: number; x: number; y: number; ax: number; ay: number }[];
  carga: number; // barra de la técnica especial (100 por técnica; los legendarios guardan hasta 200)
  combo: number; // golpes seguidos acertados
  comboHasta: number;
}

interface Proyectil {
  id: number; lado: 0 | 1; x: number; y: number; vx: number; vy: number; restante: number; r: number;
  mov: Movimiento; poder: number; atraviesa: boolean; golpeados: Set<number>;
}

interface Campo {
  id: number; lado: 0 | 1; forma: 'circulo' | 'linea'; x: number; y: number; r: number; ang?: number; largo?: number;
  hasta: number; dur: number; mov: Movimiento | null; cada: number; prox: number; tiron: number; k: string;
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
    anim: 'idle', animHasta: 0, dash: null, tickDot: 0, tickRegen: 0, enlaceHasta: 0, vueloHasta: 0,
  };
}

export class Batalla {
  t = 0;
  lados: [Lado, Lado];
  proyectiles: Proyectil[] = [];
  avisos: Aviso[] = [];
  campos: Campo[] = [];
  fx: Fx[] = [];
  terminado: { ganador: 0 | 1 | -1; motivo: string } | null = null;
  obstaculos: Obstaculo[];
  private seq = 1;

  constructor(a: Unidad[], b: Unidad[], modsA: Mods, modsB: Mods, obstaculos: Obstaculo[]) {
    this.obstaculos = obstaculos;
    this.lados = [
      { unidades: a, activo: 0, cambioListo: 0, mods: modsA, entrada: null, seq: 0, cola: [], carga: 0, combo: 0, comboHasta: 0 },
      { unidades: b, activo: 0, cambioListo: 0, mods: modsB, entrada: null, seq: 0, cola: [], carga: 0, combo: 0, comboHasta: 0 },
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

  /**
   * i: 0 = básico, 1..4 = movimientos, 5 = esquiva, 6 = técnica especial.
   * Los ataques salen hacia donde mira el Primal. Si el rival está más o menos enfrente (±40°),
   * la puntería lo busca. La IA puede pasar un punto exacto (objetivo).
   */
  accion(l: 0 | 1, i: number, objetivo?: { x: number; y: number }) {
    if (this.terminado) return;
    const u = this.activa(l);
    if (u.hp <= 0 || this.t < u.accionHasta || this.t < u.paralisisHasta) return;
    if (i === 6 || i === 7) return this.especial(l, u, i - 6);
    if (u.cds[i] > 0) return;
    if (i >= 1 && i <= 4 && !movDesbloqueado(u.esp, i, u.nivel)) return; // aún no lo ha aprendido
    const rival = this.activa(l === 0 ? 1 : 0);
    let ang = u.fa;
    let tx: number, ty: number;
    const dr = Math.hypot(rival.x - u.x, rival.y - u.y);
    const angR = Math.atan2(rival.y - u.y, rival.x - u.x);
    if (objetivo) { ang = Math.atan2(objetivo.y - u.y, objetivo.x - u.x); tx = objetivo.x; ty = objetivo.y; }
    else if (rival.hp > 0 && dr < 460 && angDif(angR, u.fa) < 0.7) { ang = angR; tx = rival.x; ty = rival.y; }
    else { tx = u.x + Math.cos(ang) * 200; ty = u.y + Math.sin(ang) * 200; }
    const apuntado = !!objetivo || (tx === rival.x && ty === rival.y);
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
    // Enlace: un movimiento justo después del tercer golpe básico pega +30%
    const enlace = this.t < u.enlaceHasta;
    u.enlaceHasta = 0;
    this.fx.push({ k: 'mov', lado: l, id: mov.id, x: r1(u.x), y: r1(u.y), ang: r2(ang), enlace: enlace || undefined });
    this.usar(l, u, mov, ang, tx, ty, enlace ? 1.3 : 1, apuntado);
  }

  // ---------------------------------------------------------------- técnicas especiales
  /** k = 0: primera técnica (R); k = 1: segunda (T, solo legendarios). Cada una cuesta una barra. */
  private especial(l: 0 | 1, u: Unidad, k: number) {
    const L = this.lados[l];
    const sp = especialesDe(u.esp)[k];
    if (!sp || L.carga < CARGA_MAX) return;
    L.carga -= CARGA_MAX;
    const esp = ESPECIES[u.esp];
    const etapa = esp.rareza === 'legendario' ? 3 : esp.etapa || 2;
    const poder = sp.poder * (0.85 + 0.12 * etapa);
    const rl = (l === 0 ? 1 : 0) as 0 | 1;
    const rival = () => this.activa(rl);
    const r0 = rival();
    const angR = Math.atan2(r0.y - u.y, r0.x - u.x);
    const dr = Math.hypot(r0.x - u.x, r0.y - u.y);
    const ang = angDif(angR, u.fa) < 1.2 && dr < 560 ? angR : u.fa;
    u.fa = ang;
    const mov = (f: number, extra: Partial<Movimiento> = {}): Movimiento =>
      ({ id: sp.id, nombre: sp.nombre, elemento: sp.elemento, tipo: 'zona', desc: '', poder: poder * f, enfriamiento: 0, alcance: 0, ...extra });
    const aviso = (forma: 'circulo' | 'linea', x: number, y: number, r: number, dur: number, m: Movimiento, extra: { ang?: number; largo?: number } = {}) =>
      this.avisos.push({ id: this.seq++, lado: l, forma, x: clamp(x, 0, ARENA.w), y: clamp(y, 0, ARENA.h), r, hasta: this.t + dur, dur, mov: m, poder: 1, ...extra });
    const campo = (forma: 'circulo' | 'linea', x: number, y: number, r: number, dur: number, m: Movimiento | null, o: { ang?: number; largo?: number; tiron?: number; k: string; cada?: number }) =>
      this.campos.push({ id: this.seq++, lado: l, forma, x: clamp(x, 0, ARENA.w), y: clamp(y, 0, ARENA.h), r, ang: o.ang, largo: o.largo, hasta: this.t + dur, dur,
        mov: m, cada: o.cada ?? 0.5, prox: this.t + (o.cada ?? 0.5), tiron: o.tiron ?? 0, k: o.k });
    const curar = (f: number) => {
      const n = Math.min(Math.round(u.mhp * f), u.mhp - u.hp);
      u.hp += n;
      if (n > 0) this.fx.push({ k: 'cura', lado: l, x: r1(u.x), y: r1(u.y), n });
    };
    const vivo = () => !this.terminado && u.hp > 0 && this.activa(l) === u;
    /** Punto a d píxeles delante (y lat a un lado) desde donde se lanzó. */
    const delante = (d: number, lat = 0) => ({ x: ox + dx * d - dy * lat, y: oy + dy * d + dx * lat });
    // pose de lanzamiento: invulnerable durante la preparación
    u.invulnHasta = this.t + 0.6;
    u.accionHasta = this.t + 0.55;
    u.anim = 'mov'; u.animHasta = this.t + 0.6;
    const ox = u.x, oy = u.y;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    this.fx.push({ k: 'especial', lado: l, id: sp.id, el: sp.elemento, x: r1(u.x), y: r1(u.y), ang: r2(ang) });
    switch (sp.id) {
      // ------------------------------------------------ una por elemento
      case 'supernova':
        campo('circulo', ox, oy, 280, 0.75, null, { tiron: 170, k: 'atraer' });
        aviso('circulo', ox, oy, 180, 0.75, mov(1, { estado: 'quemadura', probEstado: 1, empuje: 120 }));
        this.programar(0.75, () => {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            aviso('circulo', ox + Math.cos(a) * 240, oy + Math.sin(a) * 240, 58, 0.35, mov(0.55, { estado: 'quemadura', probEstado: 0.5 }));
          }
        });
        this.programar(1.1, () => campo('circulo', ox, oy, 150, 3, mov(0.12, { estado: 'quemadura', probEstado: 0.3 }), { k: 'lava' }));
        break;
      case 'maremoto':
        [-0.42, 0, 0.42].forEach((d, i) => this.programar(i * 0.22, () =>
          aviso('linea', ox, oy, 60, 0.5, mov(0.8, { tipo: 'rayo', empuje: 220 }), { ang: ang + d, largo: 440 })));
        this.programar(0.95, () => { const p = delante(330); campo('circulo', p.x, p.y, 115, 3, mov(0.1, { estado: 'lento', probEstado: 1 }), { tiron: 150, k: 'remolino' }); });
        break;
      case 'jardin_espinoso': {
        for (let i = 1; i <= 6; i++) { const p = delante(72 * i); aviso('circulo', p.x, p.y, 50, 0.3 + i * 0.12, mov(0.45, { estado: 'veneno', probEstado: 0.5, empuje: 30 })); }
        this.programar(1.1, () => { const p = delante(300); campo('circulo', p.x, p.y, 135, 3.5, mov(0.1, { estado: 'veneno', probEstado: 0.4 }), { k: 'espinas' }); });
        curar(0.2);
        break;
      }
      case 'tormenta':
        // seis relámpagos avanzando en zigzag frente al Primal; el último, el más grande
        for (let i = 0; i < 6; i++) {
          const p = delante(70 + i * 62, i === 5 ? 0 : (i % 2 ? 38 : -38));
          aviso('circulo', p.x, p.y, i === 5 ? 90 : 58, 0.45 + i * 0.22, mov(i === 5 ? 2.2 : 1, { estado: 'paralisis', probEstado: i === 5 ? 1 : 0.25 }));
        }
        break;
      case 'meteoro': {
        // tres meteoros en fila y uno gigante al final de la línea
        for (let i = 0; i < 3; i++) { const p = delante(110 + i * 85); aviso('circulo', p.x, p.y, 55, 0.6 + i * 0.15, mov(0.7)); }
        const p = delante(340);
        aviso('circulo', p.x, p.y, 115, 1.4, mov(2.4, { estado: 'paralisis', probEstado: 1, empuje: 100 }));
        break;
      }
      case 'huracan': {
        const dur = 0.3, largo = 320;
        u.dash = { vx: dx * largo / dur, vy: dy * largo / dur, hasta: this.t + dur, mov: mov(0.6, { tipo: 'embestida', radio: 34 }), golpeados: new Set(),
          alLlegar: () => {
            aviso('circulo', u.x, u.y, 140, 0.35, mov(0.8));
            campo('circulo', u.x, u.y, 140, 3, mov(0.12, { estado: 'lento', probEstado: 1 }), { tiron: 190, k: 'huracan' });
          } };
        u.invulnHasta = this.t + dur + 0.2;
        u.anim = 'dash'; u.animHasta = this.t + dur;
        this.fx.push({ k: 'dash', lado: l, x: r1(u.x), y: r1(u.y), ang: r2(ang), id: sp.id, el: sp.elemento });
        break;
      }
      case 'eclipse': {
        u.invulnHasta = this.t + 1.2;
        // si el rival está enfrente y cerca, aparece a su espalda; si no, avanza 240 px en línea recta
        const enfrente = dr < 340 && angDif(angR, ang) < 0.8;
        this.programar(0.35, () => {
          if (!vivo()) return;
          const r = enfrente ? rival() : delante(240);
          const a = enfrente ? Math.atan2(r.y - u.y, r.x - u.x) : ang;
          const p = moverEnArena(r.x, r.y, Math.cos(a) * 48, Math.sin(a) * 48, this.obstaculos);
          u.x = p.x; u.y = p.y; u.fa = a + Math.PI;
          this.fx.push({ k: 'cambio', lado: l, esp: u.esp, x: r1(u.x), y: r1(u.y), silencioso: true });
          for (let j = 0; j < 3; j++) {
            this.programar(0.05 + j * 0.2, () => {
              if (!vivo()) return;
              const r2_ = enfrente ? rival() : delante(240);
              u.anim = 'basico'; u.animHasta = this.t + 0.15;
              aviso('circulo', r2_.x, r2_.y, 75, 0.1, mov(j === 2 ? 1.5 : 0.8, j === 2 ? { estado: 'veneno', probEstado: 1, empuje: 90 } : {}));
            });
          }
        });
        break;
      }
      case 'ventisca_glacial':
        for (let w = 0; w < 3; w++) {
          this.programar(w * 0.3, () => {
            for (let i = 1; i <= 5; i++) {
              const lat = (i % 2 ? 1 : -1) * (w % 2 ? -36 : 36);
              aviso('circulo', ox + dx * 75 * i - dy * lat, oy + dy * 75 * i + dx * lat, 46, 0.45, mov(0.45, { estado: 'lento', probEstado: 0.6 }));
            }
          });
        }
        this.programar(1.2, () => campo('linea', ox, oy, 60, 3, mov(0.06, { estado: 'lento', probEstado: 1 }), { ang, largo: 400, k: 'hielo' }));
        break;
      case 'prisma_solar':
        for (let i = 0; i < 7; i++) aviso('linea', ox, oy, 24, 0.5, mov(0.7), { ang: ang + (i / 7) * Math.PI * 2, largo: 320 });
        this.programar(0.65, () => {
          if (!vivo()) return;
          const r = rival();
          aviso('linea', u.x, u.y, 46, 0.55, mov(2.2, { estado: 'paralisis', probEstado: 0.5 }), { ang: Math.atan2(r.y - u.y, r.x - u.x), largo: 540 });
        });
        break;
      // ------------------------------------------------ legendarios
      case 'avalancha_andina': {
        const roca = mov(0.75, { tipo: 'proyectil', empuje: 80, estado: 'lento', probEstado: 0.3, atraviesa: true });
        for (let i = 0; i < 7; i++) this.programar(i * 0.12, () => { if (vivo()) this.disparar(l, u, roca, ang + (Math.random() - 0.5) * 0.6, 520, 24, 380, 1, true); });
        break;
      }
      case 'corona_nevada':
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          aviso('circulo', ox + Math.cos(a) * 150, oy + Math.sin(a) * 150, 55, 0.45, mov(0.6, { estado: 'paralisis', probEstado: 0.6 }));
        }
        aviso('circulo', ox, oy, 120, 0.45, mov(0.8, { estado: 'lento', probEstado: 1 }));
        campo('circulo', ox, oy, 190, 3, mov(0.05, { estado: 'lento', probEstado: 1 }), { k: 'hielo' });
        u.escudo = Math.round(u.mhp * 0.35);
        u.escudoHasta = this.t + 6;
        break;
      case 'furia_volcanica':
        // siete bombas en abanico delante: cerca, lejos, cerca…
        for (let i = 0; i < 7; i++) {
          const a = ang + (i - 3) * 0.22, d = i % 2 ? 300 : 190;
          const p = { x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d };
          const dur = 0.7 + i * 0.12;
          aviso('circulo', p.x, p.y, 70, dur, mov(0.75, { estado: 'quemadura', probEstado: 0.6 }));
          this.programar(dur, () => campo('circulo', p.x, p.y, 60, 3, mov(0.08, { estado: 'quemadura', probEstado: 0.3 }), { k: 'lava' }));
        }
        break;
      case 'rio_de_lava':
        aviso('linea', ox, oy, 45, 0.4, mov(1, { tipo: 'rayo', estado: 'quemadura', probEstado: 1 }), { ang, largo: 540 });
        this.programar(0.4, () => campo('linea', ox, oy, 45, 4, mov(0.18, { estado: 'quemadura', probEstado: 0.5 }), { ang, largo: 540, k: 'lava', cada: 0.4 }));
        break;
      case 'sol_naciente':
        aviso('circulo', ox, oy, 170, 0.6, mov(1, { estado: 'quemadura', probEstado: 0.5, empuje: 100 }));
        this.programar(0.7, () => aviso('circulo', ox, oy, 290, 0.45, mov(0.9, { empuje: 60 })));
        curar(0.25);
        break;
      case 'rayo_de_inti':
        u.accionHasta = this.t + 0.9;
        aviso('linea', ox, oy, 62, 0.9, mov(1, { tipo: 'rayo', estado: 'quemadura', probEstado: 1, empuje: 160 }), { ang, largo: 950 });
        break;
      case 'vuelo_del_condor': {
        u.invulnHasta = this.t + 1.45;
        u.accionHasta = this.t + 1.4;
        u.vueloHasta = this.t + 1.3;
        u.anim = 'vuelo'; u.animHasta = this.t + 1.3;
        // cae a 260 px delante (si el rival está enfrente y a tiro, justo sobre él)
        const caida = dr < 380 && angDif(angR, ang) < 0.7 ? { x: r0.x, y: r0.y } : delante(260);
        this.programar(0.8, () => {
          if (!vivo()) return;
          const p = caida;
          aviso('circulo', p.x, p.y, 110, 0.5, mov(1, { empuje: 160 }));
          this.programar(0.48, () => { if (vivo()) { const q = moverEnArena(p.x, p.y, 0, 0, this.obstaculos); u.x = q.x; u.y = q.y; } });
        });
        break;
      }
      case 'alas_de_tormenta': {
        const pluma = mov(1, { tipo: 'proyectil', estado: 'veneno', probEstado: 0.3 });
        for (let i = 0; i < 12; i++) this.disparar(l, u, pluma, ang + (i / 12) * Math.PI * 2, 380, 12, 520, 1);
        this.programar(0.3, () => { const p = delante(240); campo('circulo', p.x, p.y, 150, 2.5, mov(0.13, { estado: 'lento', probEstado: 1 }), { tiron: 210, k: 'torbellino' }); });
        break;
      }
      case 'arcoiris':
        for (let i = 0; i < 7; i++) this.programar(i * 0.15, () => {
          if (vivo()) aviso('linea', u.x, u.y, 30, 0.4, mov(0.8), { ang: ang - 0.6 + i * 0.2, largo: 440 });
        });
        break;
      case 'diluvio': {
        const p = delante(230);
        campo('circulo', p.x, p.y, 190, 4, mov(0.12, { estado: 'lento', probEstado: 1 }), { k: 'lluvia' });
        curar(0.2);
        break;
      }
    }
  }

  /** Acciones diferidas dentro de la simulación (en tiempo de batalla). */
  private pendientes: { t: number; fn: () => void }[] = [];
  private programar(seg: number, fn: () => void) {
    this.pendientes.push({ t: this.t + seg, fn });
  }

  /** Campos en el suelo: dañan cada cierto tiempo y algunos atraen al rival hacia su centro. */
  private tickCampos() {
    this.campos = this.campos.filter((c) => this.t < c.hasta);
    for (const c of this.campos) {
      const rl = (c.lado === 0 ? 1 : 0) as 0 | 1;
      const def = this.activa(rl);
      if (def.hp <= 0) continue;
      let dentro: boolean, cx = c.x, cy = c.y;
      if (c.forma === 'circulo') dentro = Math.hypot(def.x - c.x, def.y - c.y) <= c.r + RADIO_PRIMAL;
      else {
        const ux = Math.cos(c.ang!), uy = Math.sin(c.ang!);
        const along = (def.x - c.x) * ux + (def.y - c.y) * uy, across = Math.abs(-(def.x - c.x) * uy + (def.y - c.y) * ux);
        dentro = along >= 0 && along <= c.largo! && across <= c.r + RADIO_PRIMAL;
        cx = c.x + ux * along; cy = c.y + uy * along;
      }
      if (c.tiron && this.t >= def.invulnHasta) {
        const d = Math.hypot(cx - def.x, cy - def.y);
        if (d < c.r * 1.5 && d > 8) this.moverUnidad(def, ((cx - def.x) / d) * c.tiron * TICK, ((cy - def.y) / d) * c.tiron * TICK);
      }
      if (c.mov && dentro && this.t >= c.prox) {
        c.prox = this.t + c.cada;
        this.danar(c.lado, this.activa(c.lado), c.mov, 1, true);
      }
    }
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
    if (fin) u.enlaceHasta = this.t + 0.9;
    u.accionHasta = this.t + (fin ? 0.3 : 0.18);
    u.anim = 'basico'; u.animHasta = this.t + 0.22;
    const hb = habDe(u.esp).basico;
    const falso: Movimiento = { id: 'basico', nombre: 'Básico', elemento: el, tipo: 'proyectil', desc: '', poder: fin ? 0.55 : 0.3, enfriamiento: 0, alcance: 0,
      estado: hb?.estado, probEstado: hb?.prob ?? 0, empuje: fin ? 50 : 10 };
    if (tipo === 'cuerpo') {
      // zarpazo en arco delante del Primal; el tercero avanza y empuja
      if (fin) u.dash = { vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, hasta: this.t + 0.12, golpeados: new Set() };
      const cx = u.x + Math.cos(ang) * 30, cy = u.y + Math.sin(ang) * 30;
      this.golpearArea(l, cx, cy, fin ? 46 : 38, falso, 1, u);
      this.fx.push({ k: 'basico', lado: l, x: r1(u.x), y: r1(u.y), ang: r2(ang), paso, el, cuerpo: true });
    } else {
      const n = fin ? 3 : 1;
      this.fx.push({ k: 'basico', lado: l, x: r1(u.x), y: r1(u.y), ang: r2(ang), paso, el, cuerpo: false });
      for (let k = 0; k < n; k++) {
        const a = ang + (k - (n - 1) / 2) * 0.16;
        this.disparar(l, u, falso, a, 320, fin ? 10 : 8, 480, 1);
      }
    }
  }

  private usar(l: 0 | 1, u: Unidad, mov: Movimiento, ang: number, tx: number, ty: number, mult: number, apuntado = false) {
    switch (mov.tipo) {
      case 'proyectil':
        this.disparar(l, u, mov, ang, mov.alcance, mov.radio ?? 10, mov.velocidad ?? 400, mult, !!mov.atraviesa);
        break;
      case 'rafaga': {
        const n = mov.cantidad ?? 3;
        for (let k = 0; k < n; k++) this.disparar(l, u, mov, ang + (k - (n - 1) / 2) * ((mov.apertura ?? 12) * Math.PI / 180), mov.alcance, mov.radio ?? 9, mov.velocidad ?? 400, mult);
        break;
      }
      case 'embestida': {
        const dur = 0.22;
        u.dash = { vx: Math.cos(ang) * mov.alcance / dur, vy: Math.sin(ang) * mov.alcance / dur, hasta: this.t + dur, mov, golpeados: new Set() };
        if (mov.intangible) u.invulnHasta = this.t + dur + 0.05;
        u.anim = 'dash'; u.animHasta = this.t + dur;
        this.fx.push({ k: 'dash', lado: l, x: r1(u.x), y: r1(u.y), ang: r2(ang), id: mov.id, el: mov.elemento });
        u.accionHasta = this.t + dur;
        break;
      }
      case 'area':
        this.golpearArea(l, u.x, u.y, mov.alcance, mov, mult, u);
        this.fx.push({ k: 'estalla', id: mov.id, forma: 'circulo', x: r1(u.x), y: r1(u.y), r: mov.alcance, el: mov.elemento });
        break;
      case 'zona': {
        // siempre en línea recta delante del Primal: sobre el rival si lo tiene enfrente y a tiro,
        // si no, a una distancia fija. Con patrón 'pasos': tres círculos que avanzan.
        const dur = mov.preparacion ?? 0.8;
        const pon = (d: number, extra: number) => this.avisos.push({ id: this.seq++, lado: l, forma: 'circulo', x: clamp(u.x + Math.cos(ang) * d, 0, ARENA.w), y: clamp(u.y + Math.sin(ang) * d, 0, ARENA.h),
          r: mov.radio ?? 70, hasta: this.t + dur + extra, dur: dur + extra, mov, poder: mult });
        if (mov.patron === 'pasos') [0.35, 0.65, 0.95].forEach((k, j) => pon(mov.alcance * k, j * 0.15));
        else pon(Math.min(mov.alcance, apuntado ? Math.hypot(tx - u.x, ty - u.y) : mov.alcance * 0.65), 0);
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
        if (mov.mejora === 'vel') u.mejoraVelHasta = this.t + (mov.duracion ?? 5);
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
    L.carga = Math.min(L.carga, cargaMax(nuevo.esp));
    L.cambioListo = this.t + L.mods.esperaCambio;
    nuevo.invulnHasta = this.t + 0.6;
    nuevo.anim = 'cambio'; nuevo.animHasta = this.t + 0.4;
    nuevo.accionHasta = this.t + 0.3;
    this.fx.push({ k: 'cambio', lado: l, esp: nuevo.esp, x: r1(nuevo.x), y: r1(nuevo.y) });
  }

  // ---------------------------------------------------------------- daño
  /** campo = daño de un campo en el suelo (no cuenta para el combo ni carga la barra). */
  private danar(l: 0 | 1, atacante: Unidad, mov: Movimiento, mult: number, campo = false) {
    const def = this.activa(l === 0 ? 1 : 0);
    const dl = (l === 0 ? 1 : 0) as 0 | 1;
    if (def.hp <= 0 || this.t < def.invulnHasta) return;
    const hDef = habDe(def.esp), hAt = habDe(atacante.esp);
    if (!campo && hDef.esquiva && Math.random() < hDef.esquiva) {
      this.fx.push({ k: 'esquiva', lado: dl, x: r1(def.x), y: r1(def.y) });
      return;
    }
    const ef = efectividad(mov.elemento, tipos(def.esp));
    const stab = tipos(atacante.esp).includes(mov.elemento) ? 1.2 : 1;
    let dano = (atacante.ataque * mov.poder * 0.6 * (100 / (100 + def.defensa * 1.6))) * ef * stab * mult;
    // habilidades
    if (hAt.pinch === mov.elemento && atacante.hp < atacante.mhp * 0.35) dano *= 1.3;
    dano *= hAt.dano ?? 1;
    if (this.t < atacante.mejoraDanoHasta) dano *= 1.35;
    const La = this.lados[l];
    if (!campo) {
      // combo del atacante: +10% cada 5 golpes seguidos (máx. +30%)
      La.combo = this.t < La.comboHasta ? La.combo + 1 : 1;
      La.comboHasta = this.t + 1.8;
      dano *= 1 + Math.min(0.3, Math.floor(La.combo / 5) * 0.1);
      if (La.combo >= 2) this.fx.push({ k: 'combo', lado: l, n: La.combo });
    }
    dano *= hDef.defensa ?? 1;
    const crit = !campo && Math.random() < (hAt.critico ?? 0.08);
    if (crit) dano *= 1.5;
    dano = Math.max(1, Math.round(dano * (0.92 + Math.random() * 0.16)));
    if (def.escudo > 0 && this.t < def.escudoHasta) {
      const a = Math.min(def.escudo, dano);
      def.escudo -= a;
      dano -= a;
    }
    def.hp = Math.max(0, def.hp - dano);
    if (!campo) { def.anim = 'golpe'; def.animHasta = this.t + 0.18; }
    // robo de vida
    if (hAt.robo && dano > 0 && atacante.hp > 0) {
      const c = Math.min(atacante.mhp - atacante.hp, Math.round(dano * hAt.robo));
      if (c > 0) { atacante.hp += c; this.fx.push({ k: 'cura', lado: l, x: r1(atacante.x), y: r1(atacante.y), n: c }); }
    }
    // la barra especial se llena golpeando (más) y recibiendo golpes (menos)
    if (!campo && !ESPECIALES_IDS.has(mov.id)) {
      const gana = ((mov.id === 'basico' ? 3.5 : 7) + (crit ? 3 : 0)) * (hAt.carga ?? 1);
      La.carga = Math.min(cargaMax(atacante.esp), La.carga + gana);
    }
    if (!campo) this.lados[dl].carga = Math.min(cargaMax(def.esp), this.lados[dl].carga + 4 * (hDef.carga ?? 1));
    this.fx.push({ k: 'dano', lado: dl, x: r1(def.x), y: r1(def.y), n: dano, ef, crit: crit || undefined });
    // estados
    if (mov.estado && Math.random() < (mov.probEstado ?? 0)) this.aplicarEstado(dl, def, mov.estado);
    // empuje
    if (mov.empuje) {
      const a = Math.atan2(def.y - atacante.y, def.x - atacante.x);
      this.moverUnidad(def, Math.cos(a) * mov.empuje * 0.5, Math.sin(a) * mov.empuje * 0.5);
    }
    if (def.hp <= 0) this.caer(dl);
  }

  private aplicarEstado(l: 0 | 1, u: Unidad, e: Estado) {
    if (e === 'quemadura') u.quemaduraHasta = this.t + 3;
    if (e === 'veneno') u.venenoHasta = this.t + 4;
    if (e === 'paralisis') { if (this.t < u.paralisisHasta + 1.2) return; u.paralisisHasta = this.t + 0.9; } // no se encadena
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
    L.carga = Math.min(L.carga, cargaMax(n.esp));
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
    const listos = this.pendientes.filter((p) => p.t <= this.t);
    this.pendientes = this.pendientes.filter((p) => p.t > this.t);
    for (const p of listos) p.fn();
    this.tickProyectiles();
    this.tickAvisos();
    this.tickCampos();
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
    const regen = habDe(u.esp).regen;
    if (regen) {
      u.tickRegen += TICK;
      if (u.tickRegen >= 2) {
        u.tickRegen = 0;
        const n = Math.min(u.mhp - u.hp, Math.max(1, Math.round(u.mhp * regen)));
        if (n > 0) { u.hp += n; this.fx.push({ k: 'cura', lado: l, x: r1(u.x), y: r1(u.y), n }); }
      }
    }
    if (u.escudo > 0 && this.t > u.escudoHasta) u.escudo = 0;
    if (this.t < u.vueloHasta) return; // en el aire
    // embestidas y esquivas
    if (u.dash) {
      if (this.t >= u.dash.hasta) { const f = u.dash.alLlegar; u.dash = null; f?.(); }
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
        this.fx.push({ k: 'impacto', x: r1(p.x), y: r1(p.y), r: p.r * 2, el: p.mov.elemento, m: p.mov.id });
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
      this.fx.push({ k: 'estalla', id: a.mov.id, forma: a.forma, x: r1(a.x), y: r1(a.y), r: a.r, ang: a.ang !== undefined ? r2(a.ang) : undefined, largo: a.largo, el: a.mov.elemento });
      void cx; void cy;
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
    const pj: ProyectilSnap[] = this.proyectiles.map((p) => ({ id: p.id, x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), el: p.mov.elemento, r: p.r, m: p.mov.id }));
    const av: AvisoSnap[] = this.avisos.map((a) => ({
      id: a.id, forma: a.forma, x: r1(a.x), y: r1(a.y), r: a.r, ang: a.ang !== undefined ? r2(a.ang) : undefined, largo: a.largo,
      t: r2(a.hasta - this.t), dur: a.dur, el: a.mov.elemento, lado: a.lado,
    }));
    const cp: CampoSnap[] = this.campos.map((c) => ({
      id: c.id, k: c.k, forma: c.forma, x: r1(c.x), y: r1(c.y), r: c.r, ang: c.ang !== undefined ? r2(c.ang) : undefined, largo: c.largo,
      t: r2(c.hasta - this.t), dur: c.dur, el: c.mov?.elemento ?? 'fuego', lado: c.lado, tiron: c.tiron > 0 || undefined,
    }));
    const eq = ([0, 1] as const).map((l) => {
      const L = this.lados[l];
      return { hp: L.unidades.map((x) => x.hp), mhp: L.unidades.map((x) => x.mhp), esp: L.unidades.map((x) => x.esp), activo: L.activo, cambioListo: r2(Math.max(0, L.cambioListo - this.t)),
        carga: Math.floor(L.carga), combo: this.t < L.comboHasta ? L.combo : 0 };
    }) as Snapshot['eq'];
    return { t: Date.now(), ack: this.lados[paraLado].seq || ack, tiempo: Math.ceil(this.restante), u, pj, av, cp, eq, cds: this.activa(paraLado).cds.map(r2) };
  }
}

const ESPECIALES_IDS = new Set([...Object.values(ESPECIALES), ...Object.values(ESPECIALES_LEGENDARIOS).flat()].map((e) => e.id));

function angDif(a: number, b: number) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
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
