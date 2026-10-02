// Datos del juego: elementos, movimientos, habilidades, rarezas y técnicas especiales.
// Las especies están en especies.ts (se genera desde assets/criaturas/criaturas.json).
// Todo el balance vive aquí (el servidor y el cliente leen lo mismo).

import { ESPECIES } from './especies';

export { ESPECIES, INICIALES } from './especies';

export type Elemento = 'fuego' | 'agua' | 'planta' | 'electrico' | 'roca' | 'viento' | 'sombra' | 'hielo' | 'luz';

export const ELEMENTOS: Record<Elemento, { nombre: string; color: string }> = {
  fuego: { nombre: 'Fuego', color: '#ff7a3c' },
  agua: { nombre: 'Agua', color: '#3fa2ff' },
  planta: { nombre: 'Planta', color: '#5fd35f' },
  electrico: { nombre: 'Eléctrico', color: '#ffd23c' },
  roca: { nombre: 'Roca', color: '#c29a6b' },
  viento: { nombre: 'Viento', color: '#8ff0d2' },
  sombra: { nombre: 'Sombra', color: '#a36bff' },
  hielo: { nombre: 'Hielo', color: '#9fd8ff' },
  luz: { nombre: 'Luz', color: '#fff0a0' },
};

/** Ventajas: atacante -> defensores contra los que es fuerte / débil. */
const FUERTE: Record<Elemento, Elemento[]> = {
  fuego: ['planta', 'hielo'],
  agua: ['fuego', 'roca'],
  planta: ['agua', 'roca'],
  electrico: ['agua', 'viento'],
  roca: ['fuego', 'viento', 'hielo'],
  viento: ['planta'],
  sombra: ['viento', 'sombra'],
  hielo: ['planta', 'viento'],
  luz: ['sombra', 'hielo'],
};
const DEBIL: Record<Elemento, Elemento[]> = {
  fuego: ['agua', 'roca', 'fuego'],
  agua: ['planta', 'electrico'],
  planta: ['fuego', 'viento'],
  electrico: ['roca', 'planta'],
  roca: ['agua', 'planta'],
  viento: ['electrico', 'roca'],
  sombra: ['luz'],
  hielo: ['fuego', 'roca'],
  luz: ['fuego', 'luz'],
};

function ef1(ataque: Elemento, defensa: Elemento): number {
  if (FUERTE[ataque].includes(defensa)) return 1.5;
  if (DEBIL[ataque].includes(defensa)) return 0.67;
  return 1;
}

/** Multiplicador por elemento contra uno o dos tipos (se multiplican). */
export function efectividad(ataque: Elemento, defensa: Elemento | Elemento[]): number {
  const d = Array.isArray(defensa) ? defensa : [defensa];
  return Math.max(0.45, Math.min(2.25, d.reduce((m, x) => m * ef1(ataque, x), 1)));
}

/** Tipos de una especie (uno o dos). */
export function tipos(esp: string): Elemento[] {
  const e = ESPECIES[esp];
  return e.elemento2 ? [e.elemento, e.elemento2] : [e.elemento];
}

// ------------------------------------------------------------------ rarezas
export type Rareza = 'comun' | 'raro' | 'epico' | 'legendario';
export const RAREZAS: Record<Rareza, { nombre: string; color: string; orden: number; ia: number }> = {
  comun: { nombre: 'Común', color: '#b9c2d0', orden: 0, ia: 0.3 },
  raro: { nombre: 'Raro', color: '#4da8ff', orden: 1, ia: 0.5 },
  epico: { nombre: 'Épico', color: '#c06bff', orden: 2, ia: 0.72 },
  legendario: { nombre: 'Legendario', color: '#ffb020', orden: 3, ia: 0.95 },
};

// ------------------------------------------------------------------ movimientos
export type TipoMovimiento = 'proyectil' | 'rafaga' | 'embestida' | 'area' | 'zona' | 'rayo' | 'escudo' | 'curar' | 'mejora';
export type Estado = 'quemadura' | 'paralisis' | 'lento' | 'veneno';

export interface Movimiento {
  id: string;
  nombre: string;
  elemento: Elemento;
  tipo: TipoMovimiento;
  desc: string;
  poder: number; // multiplicador de daño (o % de curación/escudo)
  enfriamiento: number; // segundos
  alcance: number; // distancia (proyectil, rayo, embestida, zona) o radio (área)
  radio?: number; // radio del impacto (zona) o grosor (proyectil/rayo)
  velocidad?: number; // proyectiles
  cantidad?: number; // proyectiles por disparo
  apertura?: number; // grados entre proyectiles
  preparacion?: number; // segundos de aviso antes del golpe (zona, rayo)
  estado?: Estado;
  probEstado?: number;
  empuje?: number;
  duracion?: number; // escudo/mejora
  atraviesa?: boolean; // el proyectil no se detiene al golpear
  intangible?: boolean; // embestida invulnerable
  mejora?: 'vel' | 'dano';
  /** Zonas: 'pasos' = tres círculos que avanzan en línea recta delante del Primal. */
  patron?: 'pasos';
}

type M = Omit<Movimiento, 'id' | 'elemento'>;
const mov = (elemento: Elemento, lista: Record<string, M>) =>
  Object.fromEntries(Object.entries(lista).map(([id, m]) => [id, { id, elemento, ...m }])) as Record<string, Movimiento>;

export const MOVIMIENTOS: Record<string, Movimiento> = {
  ...mov('fuego', {
    ascuas: { nombre: 'Ascuas', tipo: 'rafaga', desc: 'Tres brasas en abanico.', poder: 0.7, enfriamiento: 2.5, alcance: 260, radio: 9, velocidad: 380, cantidad: 3, apertura: 14, estado: 'quemadura', probEstado: 0.25 },
    bola_fuego: { nombre: 'Bola de fuego', tipo: 'proyectil', desc: 'Una bola ardiente que quema.', poder: 1.0, enfriamiento: 2.4, alcance: 300, radio: 14, velocidad: 400, estado: 'quemadura', probEstado: 0.3 },
    llamarada: { nombre: 'Llamarada', tipo: 'rayo', desc: 'Un chorro de fuego en línea recta.', poder: 1.6, enfriamiento: 6, alcance: 240, radio: 26, preparacion: 0.45, estado: 'quemadura', probEstado: 0.5 },
    erupcion: { nombre: 'Erupción', tipo: 'zona', desc: 'El suelo estalla en tres pasos frente a ti.', poder: 1.0, enfriamiento: 9, alcance: 300, radio: 62, preparacion: 0.6, estado: 'quemadura', probEstado: 0.5, patron: 'pasos' },
    embestida_ignea: { nombre: 'Embestida ígnea', tipo: 'embestida', desc: 'Se lanza envuelto en llamas.', poder: 1.3, enfriamiento: 5, alcance: 200, radio: 26, estado: 'quemadura', probEstado: 0.35, empuje: 60 },
    ardor: { nombre: 'Ardor', tipo: 'mejora', desc: '+30% de daño por un rato.', poder: 0.3, enfriamiento: 12, alcance: 0, duracion: 6, mejora: 'dano' },
  }),
  ...mov('agua', {
    burbuja: { nombre: 'Burbuja', tipo: 'proyectil', desc: 'Una burbuja que ralentiza.', poder: 0.9, enfriamiento: 2.2, alcance: 280, radio: 13, velocidad: 300, estado: 'lento', probEstado: 0.5 },
    lanza_agua: { nombre: 'Lanza de agua', tipo: 'proyectil', desc: 'Un chorro veloz que atraviesa.', poder: 0.9, enfriamiento: 2.2, alcance: 340, radio: 10, velocidad: 620, atraviesa: true },
    hidrochorro: { nombre: 'Hidrochorro', tipo: 'rayo', desc: 'Chorro a presión que empuja.', poder: 1.5, enfriamiento: 6, alcance: 300, radio: 22, preparacion: 0.4, empuje: 90 },
    torbellino: { nombre: 'Torbellino', tipo: 'zona', desc: 'Un remolino que atrapa y frena.', poder: 1.6, enfriamiento: 7.5, alcance: 300, radio: 80, preparacion: 0.7, estado: 'lento', probEstado: 1 },
    ola: { nombre: 'Ola', tipo: 'area', desc: 'Una ola a tu alrededor que aparta a todos.', poder: 1.4, enfriamiento: 7, alcance: 120, empuje: 140 },
    marea_curativa: { nombre: 'Marea curativa', tipo: 'curar', desc: 'Recupera parte de la vida.', poder: 0.28, enfriamiento: 14, alcance: 0 },
  }),
  ...mov('planta', {
    hojas_navaja: { nombre: 'Hojas navaja', tipo: 'rafaga', desc: 'Hojas afiladas en abanico.', poder: 0.75, enfriamiento: 2.6, alcance: 260, radio: 9, velocidad: 420, cantidad: 3, apertura: 12 },
    semillas: { nombre: 'Lluvia de semillas', tipo: 'rafaga', desc: 'Cinco semillas duras en abanico.', poder: 0.45, enfriamiento: 2.6, alcance: 240, radio: 7, velocidad: 440, cantidad: 5, apertura: 9 },
    latigo_cepa: { nombre: 'Látigo cepa', tipo: 'rayo', desc: 'Un latigazo largo y rápido.', poder: 1.35, enfriamiento: 4.5, alcance: 200, radio: 20, preparacion: 0.25, empuje: 50 },
    esporas: { nombre: 'Esporas', tipo: 'zona', desc: 'Nube de esporas venenosas.', poder: 0.8, enfriamiento: 8, alcance: 280, radio: 90, preparacion: 0.6, estado: 'veneno', probEstado: 1 },
    rodillo_espinas: { nombre: 'Rodillo de espinas', tipo: 'embestida', desc: 'Rueda cubierto de espinas venenosas.', poder: 1.25, enfriamiento: 5, alcance: 210, radio: 26, estado: 'veneno', probEstado: 0.4 },
    raices: { nombre: 'Raíces', tipo: 'escudo', desc: 'Echa raíces: escudo resistente.', poder: 0.3, enfriamiento: 13, alcance: 0, duracion: 5 },
  }),
  ...mov('electrico', {
    chispazo: { nombre: 'Chispazo', tipo: 'proyectil', desc: 'Rayo rápido que puede paralizar.', poder: 0.85, enfriamiento: 2, alcance: 320, radio: 10, velocidad: 560, estado: 'paralisis', probEstado: 0.25 },
    bola_voltio: { nombre: 'Bola voltio', tipo: 'proyectil', desc: 'Esfera eléctrica lenta y poderosa.', poder: 1.2, enfriamiento: 3.2, alcance: 300, radio: 16, velocidad: 300, estado: 'paralisis', probEstado: 0.35 },
    descarga: { nombre: 'Descarga', tipo: 'rayo', desc: 'Una descarga en línea recta.', poder: 1.6, enfriamiento: 6, alcance: 280, radio: 20, preparacion: 0.35, estado: 'paralisis', probEstado: 0.4 },
    rayo_trueno: { nombre: 'Rayo trueno', tipo: 'zona', desc: 'Tres relámpagos caen avanzando frente a ti.', poder: 0.95, enfriamiento: 8, alcance: 320, radio: 55, preparacion: 0.55, estado: 'paralisis', probEstado: 0.35, patron: 'pasos' },
    carga_voltio: { nombre: 'Carga voltio', tipo: 'embestida', desc: 'Una carga eléctrica veloz.', poder: 1.2, enfriamiento: 4.5, alcance: 240, radio: 24, estado: 'paralisis', probEstado: 0.3, empuje: 40 },
    aceleron: { nombre: 'Acelerón', tipo: 'mejora', desc: '+40% de velocidad por un rato.', poder: 0.4, enfriamiento: 12, alcance: 0, duracion: 5, mejora: 'vel' },
  }),
  ...mov('roca', {
    lanzarrocas: { nombre: 'Lanzarrocas', tipo: 'proyectil', desc: 'Una roca pesada que empuja.', poder: 1.3, enfriamiento: 3, alcance: 260, radio: 16, velocidad: 280, empuje: 60 },
    pedrada: { nombre: 'Pedrada', tipo: 'rafaga', desc: 'Tres piedras en abanico.', poder: 0.7, enfriamiento: 2.8, alcance: 250, radio: 11, velocidad: 360, cantidad: 3, apertura: 15 },
    grieta: { nombre: 'Grieta', tipo: 'rayo', desc: 'El suelo se parte en línea y salen picos.', poder: 1.8, enfriamiento: 7, alcance: 300, radio: 26, preparacion: 0.55, empuje: 70 },
    avalancha: { nombre: 'Avalancha', tipo: 'zona', desc: 'Rocas caen sobre el objetivo.', poder: 2.1, enfriamiento: 9, alcance: 300, radio: 75, preparacion: 1.0 },
    terremoto: { nombre: 'Terremoto', tipo: 'area', desc: 'Sacude el suelo a tu alrededor.', poder: 1.8, enfriamiento: 8, alcance: 140, empuje: 60 },
    coraza: { nombre: 'Coraza', tipo: 'escudo', desc: 'Un escudo de piedra enorme.', poder: 0.4, enfriamiento: 14, alcance: 0, duracion: 5 },
  }),
  ...mov('viento', {
    cuchilla_aire: { nombre: 'Cuchilla de aire', tipo: 'proyectil', desc: 'Corta y atraviesa enemigos.', poder: 0.95, enfriamiento: 2.2, alcance: 360, radio: 11, velocidad: 600, atraviesa: true },
    pluma_filo: { nombre: 'Pluma filo', tipo: 'rafaga', desc: 'Tres plumas afiladas.', poder: 0.7, enfriamiento: 2.3, alcance: 300, radio: 8, velocidad: 560, cantidad: 3, apertura: 10 },
    corriente: { nombre: 'Corriente', tipo: 'rayo', desc: 'Un ventarrón en línea que arrastra.', poder: 1.3, enfriamiento: 5.5, alcance: 320, radio: 30, preparacion: 0.3, empuje: 200, estado: 'lento', probEstado: 0.5 },
    tornado: { nombre: 'Tornado', tipo: 'zona', desc: 'Un tornado que ralentiza.', poder: 1.5, enfriamiento: 7, alcance: 320, radio: 70, preparacion: 0.6, estado: 'lento', probEstado: 1 },
    vuelo_raudo: { nombre: 'Vuelo raudo', tipo: 'embestida', desc: 'Un vuelo rasante muy largo.', poder: 1.1, enfriamiento: 4, alcance: 300, radio: 22 },
    vendaval: { nombre: 'Vendaval', tipo: 'area', desc: 'Una ráfaga que lo aparta todo.', poder: 1.1, enfriamiento: 6, alcance: 130, empuje: 180 },
  }),
  ...mov('sombra', {
    bola_sombra: { nombre: 'Bola sombra', tipo: 'proyectil', desc: 'Una esfera de oscuridad.', poder: 1.1, enfriamiento: 2.6, alcance: 300, radio: 13, velocidad: 380 },
    colmillo_sombra: { nombre: 'Colmillo sombra', tipo: 'rafaga', desc: 'Dos colmillos oscuros que envenenan.', poder: 0.8, enfriamiento: 2.4, alcance: 220, radio: 11, velocidad: 460, cantidad: 2, apertura: 18, estado: 'veneno', probEstado: 0.2 },
    garra_eclipse: { nombre: 'Garra eclipse', tipo: 'rayo', desc: 'Un zarpazo de sombra muy largo.', poder: 1.7, enfriamiento: 6.5, alcance: 230, radio: 28, preparacion: 0.4 },
    maldicion: { nombre: 'Maldición', tipo: 'zona', desc: 'Un círculo maldito que envenena.', poder: 1.3, enfriamiento: 8, alcance: 300, radio: 80, preparacion: 0.7, estado: 'veneno', probEstado: 1 },
    paso_sombrio: { nombre: 'Paso sombrío', tipo: 'embestida', desc: 'Atraviesa al rival siendo intocable.', poder: 1.2, enfriamiento: 5, alcance: 220, radio: 24, intangible: true },
    aullido: { nombre: 'Aullido', tipo: 'mejora', desc: '+35% de daño por un rato.', poder: 0.35, enfriamiento: 12, alcance: 0, duracion: 6, mejora: 'dano' },
  }),
  ...mov('hielo', {
    granizo: { nombre: 'Granizo', tipo: 'rafaga', desc: 'Tres granizos que pueden frenar.', poder: 0.7, enfriamiento: 2.5, alcance: 270, radio: 10, velocidad: 400, cantidad: 3, apertura: 13, estado: 'lento', probEstado: 0.3 },
    carambano: { nombre: 'Carámbano', tipo: 'proyectil', desc: 'Una punta de hielo que atraviesa.', poder: 0.95, enfriamiento: 2.3, alcance: 330, radio: 10, velocidad: 600, atraviesa: true, estado: 'lento', probEstado: 0.2 },
    aliento_helado: { nombre: 'Aliento helado', tipo: 'rayo', desc: 'Un soplo congelante en línea.', poder: 1.5, enfriamiento: 6, alcance: 260, radio: 26, preparacion: 0.45, estado: 'lento', probEstado: 0.8 },
    pico_glaciar: { nombre: 'Pico glaciar', tipo: 'zona', desc: 'Picos de hielo brotan en tres pasos frente a ti.', poder: 1.0, enfriamiento: 9, alcance: 300, radio: 60, preparacion: 0.6, estado: 'paralisis', probEstado: 0.35, patron: 'pasos' },
    patinazo: { nombre: 'Patinazo', tipo: 'embestida', desc: 'Se desliza sobre hielo y embiste.', poder: 1.15, enfriamiento: 4.5, alcance: 260, radio: 24, estado: 'lento', probEstado: 0.4 },
    muro_hielo: { nombre: 'Muro de hielo', tipo: 'escudo', desc: 'Una coraza de hielo.', poder: 0.35, enfriamiento: 13, alcance: 0, duracion: 5 },
  }),
  ...mov('luz', {
    destello: { nombre: 'Destello', tipo: 'proyectil', desc: 'Un haz de luz veloz.', poder: 0.9, enfriamiento: 2.1, alcance: 340, radio: 10, velocidad: 650 },
    prisma: { nombre: 'Prisma', tipo: 'rafaga', desc: 'Cinco rayos de colores en abanico.', poder: 0.45, enfriamiento: 2.8, alcance: 280, radio: 8, velocidad: 520, cantidad: 5, apertura: 8 },
    rayo_solar: { nombre: 'Rayo solar', tipo: 'rayo', desc: 'Concentra la luz del sol en un rayo largo.', poder: 2.0, enfriamiento: 8, alcance: 380, radio: 24, preparacion: 0.7 },
    juicio: { nombre: 'Juicio', tipo: 'zona', desc: 'Una columna de luz cae del cielo.', poder: 2.0, enfriamiento: 9, alcance: 320, radio: 70, preparacion: 0.85, estado: 'paralisis', probEstado: 0.3 },
    saeta_luz: { nombre: 'Saeta de luz', tipo: 'embestida', desc: 'Se vuelve luz y atraviesa al rival.', poder: 1.1, enfriamiento: 4.5, alcance: 260, radio: 24, intangible: true },
    bendicion: { nombre: 'Bendición', tipo: 'curar', desc: 'Una luz cálida que cura.', poder: 0.24, enfriamiento: 14, alcance: 0 },
  }),
};

/** Movimientos de cada elemento por papel: r = rápido, f = fuerte, m = movilidad/área, a = apoyo. */
export const POOL: Record<Elemento, { r: string[]; f: string[]; m: string; a: string }> = {
  fuego: { r: ['ascuas', 'bola_fuego'], f: ['llamarada', 'erupcion'], m: 'embestida_ignea', a: 'ardor' },
  agua: { r: ['burbuja', 'lanza_agua'], f: ['hidrochorro', 'torbellino'], m: 'ola', a: 'marea_curativa' },
  planta: { r: ['hojas_navaja', 'semillas'], f: ['latigo_cepa', 'esporas'], m: 'rodillo_espinas', a: 'raices' },
  electrico: { r: ['chispazo', 'bola_voltio'], f: ['descarga', 'rayo_trueno'], m: 'carga_voltio', a: 'aceleron' },
  roca: { r: ['lanzarrocas', 'pedrada'], f: ['grieta', 'avalancha'], m: 'terremoto', a: 'coraza' },
  viento: { r: ['cuchilla_aire', 'pluma_filo'], f: ['corriente', 'tornado'], m: 'vuelo_raudo', a: 'vendaval' },
  sombra: { r: ['bola_sombra', 'colmillo_sombra'], f: ['garra_eclipse', 'maldicion'], m: 'paso_sombrio', a: 'aullido' },
  hielo: { r: ['granizo', 'carambano'], f: ['aliento_helado', 'pico_glaciar'], m: 'patinazo', a: 'muro_hielo' },
  luz: { r: ['destello', 'prisma'], f: ['rayo_solar', 'juicio'], m: 'saeta_luz', a: 'bendicion' },
};

// ------------------------------------------------------------------ habilidades (pasivas)
export interface Habilidad {
  id: string;
  nombre: string;
  desc: string;
  pinch?: Elemento; // con menos del 35% de vida, ese elemento pega +30%
  dano?: number; // multiplicador de daño causado
  defensa?: number; // multiplicador de daño recibido
  vel?: number; // multiplicador de velocidad
  esquiva?: number; // probabilidad de esquivar
  critico?: number; // probabilidad de crítico (normal: 8%)
  basico?: { estado: Estado; prob: number }; // efecto de los golpes básicos
  regen?: number; // fracción de vida recuperada cada 2 s
  robo?: number; // fracción del daño causado que se cura
  carga?: number; // multiplicador de carga de la técnica especial
}
const hab = (lista: Record<string, Omit<Habilidad, 'id'>>) =>
  Object.fromEntries(Object.entries(lista).map(([id, h]) => [id, { id, ...h }])) as Record<string, Habilidad>;

export const HABILIDADES: Record<string, Habilidad> = hab({
  brasa_interior: { nombre: 'Brasa interior', desc: 'Con menos del 35% de vida, sus ataques de fuego hacen +30% de daño.', pinch: 'fuego' },
  marea: { nombre: 'Marea', desc: 'Con menos del 35% de vida, sus ataques de agua hacen +30% de daño.', pinch: 'agua' },
  espesura: { nombre: 'Espesura', desc: 'Con menos del 35% de vida, sus ataques de planta hacen +30% de daño.', pinch: 'planta' },
  corazon_glaciar: { nombre: 'Corazón glaciar', desc: 'Con menos del 35% de vida, sus ataques de hielo hacen +30% de daño.', pinch: 'hielo' },
  aurora: { nombre: 'Aurora', desc: 'Con menos del 35% de vida, sus ataques de luz hacen +30% de daño.', pinch: 'luz' },
  estatica: { nombre: 'Estática', desc: 'Sus golpes básicos pueden paralizar (15%).', basico: { estado: 'paralisis', prob: 0.15 } },
  escarcha: { nombre: 'Escarcha', desc: 'Sus golpes básicos pueden ralentizar (25%).', basico: { estado: 'lento', prob: 0.25 } },
  toxico: { nombre: 'Piel tóxica', desc: 'Sus golpes básicos pueden envenenar (20%).', basico: { estado: 'veneno', prob: 0.2 } },
  furia_tormenta: { nombre: 'Furia de tormenta', desc: '+12% de daño y +10% de velocidad.', dano: 1.12, vel: 1.1 },
  roca_solida: { nombre: 'Roca sólida', desc: 'Recibe un 15% menos de daño.', defensa: 0.85 },
  viento_cola: { nombre: 'Viento de cola', desc: 'Se mueve un 20% más rápido.', vel: 1.2 },
  sombra_esquiva: { nombre: 'Sombra esquiva', desc: '15% de probabilidad de esquivar un ataque.', esquiva: 0.15 },
  fotosintesis: { nombre: 'Fotosíntesis', desc: 'Recupera un 1,5% de vida cada 2 segundos.', regen: 0.015 },
  vampiro: { nombre: 'Vampiro', desc: 'Se cura un 12% del daño que causa.', robo: 0.12 },
  concentracion: { nombre: 'Concentración', desc: 'Carga su técnica especial un 35% más rápido.', carga: 1.35 },
  instinto_cazador: { nombre: 'Instinto cazador', desc: 'Doble probabilidad de golpe crítico.', critico: 0.16 },
  // legendarias
  taita: { nombre: 'Padre de las montañas', desc: 'Recibe un 25% menos de daño.', defensa: 0.75 },
  mama_volcan: { nombre: 'Madre volcana', desc: 'Sus golpes básicos queman (25%) y con poca vida su fuego pega +30%.', basico: { estado: 'quemadura', prob: 0.25 }, pinch: 'fuego' },
  sol_eterno: { nombre: 'Sol eterno', desc: '+10% de daño y recupera un 1% de vida cada 2 segundos.', dano: 1.1, regen: 0.01 },
  rey_andes: { nombre: 'Rey de los Andes', desc: '+15% de velocidad y 18% de golpe crítico.', vel: 1.15, critico: 0.18 },
  arcoiris: { nombre: 'Espíritu del arcoíris', desc: 'Carga su técnica un 40% más rápido y esquiva el 10% de los ataques.', carga: 1.4, esquiva: 0.1 },
});

// ------------------------------------------------------------------ especies (tipo)
export interface Especie {
  id: string;
  nombre: string;
  elemento: Elemento;
  elemento2?: Elemento;
  rareza: Rareza;
  /** 0 = no evoluciona; 1, 2, 3 = etapa en su línea evolutiva. */
  etapa: 0 | 1 | 2 | 3;
  evoluciona?: { a: string; nivel: number };
  base: { vida: number; ataque: number; defensa: number; velocidad: number };
  basico: 'cuerpo' | 'distancia'; // golpe básico: combo cuerpo a cuerpo o disparos
  movimientos: [string, string, string, string];
  habilidad: string;
  desc: string;
  /** Requisitos para poder retarla y capturarla. */
  captura: { nivel: number; monedas: number; nivelSalvaje: number };
  inicial?: boolean;
}

export const NIVEL_MAX_PRIMAL = 40;

/** Movimientos que se desbloquean al subir de nivel (huecos 1-4). Los legendarios los traen todos. */
export const DESBLOQUEO = [1, 4, 9, 15];
export function movDesbloqueado(esp: string, slot: number, nivel: number) {
  return ESPECIES[esp]?.rareza === 'legendario' || nivel >= DESBLOQUEO[slot - 1];
}

/** Estadísticas de un Primal en un nivel. El nivel ayuda, pero no decide solo: la evolución y la
 * habilidad del jugador pesan más (del nivel 5 al 40 las estadísticas crecen un 48%). */
export function statsPrimal(esp: Especie, nivel: number) {
  const f = 0.85 + 0.0125 * nivel;
  return {
    vida: Math.round(esp.base.vida * 10 * f),
    ataque: Math.round(esp.base.ataque * f),
    defensa: Math.round(esp.base.defensa * f),
    velocidad: Math.round(120 + esp.base.velocidad * 1.2), // píxeles por segundo en la arena
  };
}

/** Experiencia para pasar del nivel n al n+1 (Primales). */
export function xpPrimal(n: number) {
  return 40 + 20 * n;
}

export const esLegendario = (esp: string) => ESPECIES[esp]?.rareza === 'legendario';

// ------------------------------------------------------------------ técnicas especiales
/** Se cargan peleando (golpear y recibir golpes llena la barra) y se lanzan con R (y T los legendarios). */
export interface Especial { id: string; nombre: string; elemento: Elemento; desc: string; poder: number }
export const ESPECIALES: Record<Elemento, Especial> = {
  fuego: { id: 'supernova', nombre: 'Supernova', elemento: 'fuego', poder: 2.4, desc: 'Atrae al rival, estalla como un sol y lanza un anillo de columnas de fuego que dejan el suelo ardiendo.' },
  agua: { id: 'maremoto', nombre: 'Maremoto', elemento: 'agua', poder: 2.2, desc: 'Tres olas colosales arrasan en abanico y dejan un remolino que atrapa al rival.' },
  planta: { id: 'jardin_espinoso', nombre: 'Jardín espinoso', elemento: 'planta', poder: 1.7, desc: 'Brotan espinas en línea hacia el rival, florece un campo venenoso y recupera vida.' },
  electrico: { id: 'tormenta', nombre: 'Tormenta', elemento: 'electrico', poder: 0.85, desc: 'El cielo se oscurece: seis relámpagos persiguen al rival y el último paraliza.' },
  roca: { id: 'meteoro', nombre: 'Lluvia de meteoros', elemento: 'roca', poder: 1.1, desc: 'Caen meteoros alrededor del rival y al final uno gigante que lo aturde.' },
  viento: { id: 'huracan', nombre: 'Huracán', elemento: 'viento', poder: 1.9, desc: 'Cruza la arena como un rayo y deja un huracán que absorbe al rival.' },
  sombra: { id: 'eclipse', nombre: 'Eclipse', elemento: 'sombra', poder: 1.2, desc: 'La arena se oscurece, reaparece detrás del rival y lo golpea tres veces.' },
  hielo: { id: 'ventisca_glacial', nombre: 'Ventisca glacial', elemento: 'hielo', poder: 1.3, desc: 'Tres oleadas de picos de hielo avanzan en zigzag y dejan el suelo congelado.' },
  luz: { id: 'prisma_solar', nombre: 'Prisma solar', elemento: 'luz', poder: 1.4, desc: 'Dispara siete rayos de luz en estrella y luego uno enorme hacia el rival.' },
};

/** Los legendarios tienen dos técnicas propias (R y T). */
export const ESPECIALES_LEGENDARIOS: Record<string, [Especial, Especial]> = {
  taitachimbo: [
    { id: 'avalancha_andina', nombre: 'Avalancha andina', elemento: 'roca', poder: 1.2, desc: 'Siete rocas nevadas ruedan montaña abajo hacia el rival.' },
    { id: 'corona_nevada', nombre: 'Corona nevada', elemento: 'hielo', poder: 1.6, desc: 'Un anillo de picos de hielo lo rodea, congela y le da un escudo enorme.' },
  ],
  mamatungura: [
    { id: 'furia_volcanica', nombre: 'Furia volcánica', elemento: 'fuego', poder: 1.3, desc: 'Lanza siete bombas de lava que dejan charcos ardientes.' },
    { id: 'rio_de_lava', nombre: 'Río de lava', elemento: 'fuego', poder: 1.8, desc: 'Abre un río de lava en línea recta que quema a quien lo cruza.' },
  ],
  inti: [
    { id: 'sol_naciente', nombre: 'Sol naciente', elemento: 'luz', poder: 1.8, desc: 'Dos anillos de sol estallan a su alrededor y recupera un 25% de vida.' },
    { id: 'rayo_de_inti', nombre: 'Rayo de Inti', elemento: 'fuego', poder: 3.4, desc: 'El sol entero en un rayo gigante que cruza la arena.' },
  ],
  apukuntur: [
    { id: 'vuelo_del_condor', nombre: 'Vuelo del cóndor', elemento: 'viento', poder: 3.0, desc: 'Se eleva fuera de alcance y cae en picada sobre el rival.' },
    { id: 'alas_de_tormenta', nombre: 'Alas de tormenta', elemento: 'sombra', poder: 0.6, desc: 'Doce plumas oscuras en todas direcciones y un torbellino que atrae al rival.' },
  ],
  cuichi: [
    { id: 'arcoiris', nombre: 'Arcoíris', elemento: 'luz', poder: 0.9, desc: 'Siete rayos de colores barren la arena uno tras otro.' },
    { id: 'diluvio', nombre: 'Diluvio', elemento: 'agua', poder: 0.5, desc: 'Una lluvia torrencial cae sobre el rival, lo frena y daña poco a poco, y cura a Cuichi.' },
  ],
};

/** Técnicas especiales de una especie: una por su elemento o dos si es legendaria. */
export function especialesDe(esp: string): Especial[] {
  return ESPECIALES_LEGENDARIOS[esp] ?? [ESPECIALES[ESPECIES[esp].elemento]];
}
export const CARGA_MAX = 100; // cada técnica cuesta una barra completa
/** Barras de carga que puede acumular el Primal activo (los legendarios, dos). */
export const cargaMax = (esp: string) => CARGA_MAX * especialesDe(esp).length;
