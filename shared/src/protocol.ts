// Mensajes entre cliente y servidor.

export const TICK_MS = 50; // 20 ticks por segundo
export const ARENA = { w: 1100, h: 700 };
export const RADIO_PRIMAL = 18;

export interface Obstaculo { x: number; y: number; r: number }

/** Un Primal de un Domador (guardado). */
export interface PrimalGuardado { uid: string; esp: string; nivel: number; xp: number }

export interface Perfil {
  id: number;
  nombre: string;
  nivel: number;
  xp: number;
  xpSig: number;
  monedas: number;
  trofeos: number;
  mejorTrofeos: number;
  victorias: number;
  derrotas: number;
  primales: PrimalGuardado[];
  equipo: string[]; // uids, en orden
  habilidades: Record<string, number>;
  puntosLibres: number;
  capturados: string[]; // especies vistas/capturadas alguna vez
}

export interface UnidadSnap {
  lado: 0 | 1;
  slot: number;
  esp: string;
  nv: number;
  x: number;
  y: number;
  hp: number;
  mhp: number;
  sh: number; // escudo
  fa: number; // hacia dónde mira (radianes)
  an: string; // animación: idle, mover, basico, mov, dash, golpe, cambio, caido
  st: number; // estados (bits): 1 quemadura, 2 paralisis, 4 lento, 8 veneno, 16 invulnerable, 32 mejora
}

export interface ProyectilSnap { id: number; x: number; y: number; vx: number; vy: number; el: string; r: number }
export interface AvisoSnap { id: number; forma: 'circulo' | 'linea'; x: number; y: number; r: number; ang?: number; largo?: number; t: number; dur: number; el: string; lado: 0 | 1 }

export interface EquipoSnap { hp: number[]; mhp: number[]; esp: string[]; activo: number; cambioListo: number }

export interface Snapshot {
  t: number;
  ack: number;
  tiempo: number; // segundos restantes
  u: UnidadSnap[];
  pj: ProyectilSnap[];
  av: AvisoSnap[];
  eq: [EquipoSnap, EquipoSnap];
  cds: number[]; // recargas del propio Primal activo (segundos restantes) [básico, m1..m4, esquiva]
}

export type Fx =
  | { k: 'dano'; lado: 0 | 1; x: number; y: number; n: number; ef: number; crit?: boolean }
  | { k: 'cura'; lado: 0 | 1; x: number; y: number; n: number }
  | { k: 'mov'; lado: 0 | 1; id: string; x: number; y: number; ang: number }
  | { k: 'impacto'; x: number; y: number; r: number; el: string }
  | { k: 'cambio'; lado: 0 | 1; esp: string; x: number; y: number }
  | { k: 'caido'; lado: 0 | 1; esp: string; x: number; y: number }
  | { k: 'estado'; lado: 0 | 1; x: number; y: number; estado: string }
  | { k: 'esquiva'; lado: 0 | 1; x: number; y: number }
  | { k: 'dash'; lado: 0 | 1; x: number; y: number; ang: number };

export interface InicioBatalla {
  lado: 0 | 1;
  modo: 'liga' | 'captura';
  rivalIA: boolean;
  nombres: [string, string];
  trofeos: [number, number];
  obstaculos: Obstaculo[];
  movimientos: string[][]; // por slot de tu equipo: ids de movimientos
}

export interface FinBatalla {
  gano: boolean;
  empate?: boolean;
  motivo: string;
  trofeos: number;
  monedas: number;
  xpDomador: number;
  xpPrimales: { esp: string; xp: number; nivel: number; subio: number; evoluciono?: string }[];
  capturado?: string;
  medallasNuevas: string[];
  nivelDomador: number;
  subioDomador: number;
}
