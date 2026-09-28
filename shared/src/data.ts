// Datos del juego: elementos, movimientos, habilidades y los 15 Primales.
// Todo el balance vive aquí (el servidor y el cliente leen lo mismo).

export type Elemento = 'fuego' | 'agua' | 'planta' | 'electrico' | 'roca' | 'viento' | 'sombra';

export const ELEMENTOS: Record<Elemento, { nombre: string; color: string; icono: string }> = {
  fuego: { nombre: 'Fuego', color: '#ff7a3c', icono: '🔥' },
  agua: { nombre: 'Agua', color: '#3fa2ff', icono: '💧' },
  planta: { nombre: 'Planta', color: '#5fd35f', icono: '🌿' },
  electrico: { nombre: 'Eléctrico', color: '#ffd23c', icono: '⚡' },
  roca: { nombre: 'Roca', color: '#c29a6b', icono: '🪨' },
  viento: { nombre: 'Viento', color: '#a8e6ff', icono: '🌪️' },
  sombra: { nombre: 'Sombra', color: '#a36bff', icono: '🌑' },
};

/** Ventajas: atacante -> defensores contra los que es fuerte / débil. */
const FUERTE: Record<Elemento, Elemento[]> = {
  fuego: ['planta', 'sombra'],
  agua: ['fuego', 'roca'],
  planta: ['agua', 'roca'],
  electrico: ['agua', 'viento'],
  roca: ['fuego', 'electrico', 'viento'],
  viento: ['planta'],
  sombra: ['viento', 'sombra'],
};
const DEBIL: Record<Elemento, Elemento[]> = {
  fuego: ['agua', 'roca'],
  agua: ['planta', 'electrico'],
  planta: ['fuego', 'viento'],
  electrico: ['roca', 'planta'],
  roca: ['agua', 'planta'],
  viento: ['electrico', 'roca'],
  sombra: ['fuego'],
};

export function efectividad(ataque: Elemento, defensa: Elemento): number {
  if (FUERTE[ataque].includes(defensa)) return 1.5;
  if (DEBIL[ataque].includes(defensa)) return 0.67;
  return 1;
}

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
}

export const MOVIMIENTOS: Record<string, Movimiento> = {
  // fuego
  ascuas: { id: 'ascuas', nombre: 'Ascuas', elemento: 'fuego', tipo: 'rafaga', desc: 'Tres brasas en abanico.', poder: 0.7, enfriamiento: 2.5, alcance: 260, radio: 9, velocidad: 380, cantidad: 3, apertura: 14, estado: 'quemadura', probEstado: 0.25 },
  llamarada: { id: 'llamarada', nombre: 'Llamarada', elemento: 'fuego', tipo: 'rayo', desc: 'Un chorro de fuego en línea recta.', poder: 1.6, enfriamiento: 6, alcance: 240, radio: 26, preparacion: 0.45, estado: 'quemadura', probEstado: 0.5 },
  embestida_ignea: { id: 'embestida_ignea', nombre: 'Embestida ígnea', elemento: 'fuego', tipo: 'embestida', desc: 'Se lanza envuelto en llamas.', poder: 1.3, enfriamiento: 5, alcance: 200, radio: 26, estado: 'quemadura', probEstado: 0.35, empuje: 60 },
  erupcion: { id: 'erupcion', nombre: 'Erupción', elemento: 'fuego', tipo: 'zona', desc: 'El suelo estalla donde apuntas.', poder: 2.2, enfriamiento: 9, alcance: 320, radio: 80, preparacion: 0.9, estado: 'quemadura', probEstado: 0.6 },
  // agua
  burbuja: { id: 'burbuja', nombre: 'Burbuja', elemento: 'agua', tipo: 'proyectil', desc: 'Una burbuja que ralentiza.', poder: 0.9, enfriamiento: 2.2, alcance: 280, radio: 13, velocidad: 300, estado: 'lento', probEstado: 0.5 },
  hidrochorro: { id: 'hidrochorro', nombre: 'Hidrochorro', elemento: 'agua', tipo: 'rayo', desc: 'Chorro a presión que empuja.', poder: 1.5, enfriamiento: 6, alcance: 300, radio: 22, preparacion: 0.4, empuje: 90 },
  ola: { id: 'ola', nombre: 'Ola', elemento: 'agua', tipo: 'area', desc: 'Una ola a tu alrededor que aparta a todos.', poder: 1.4, enfriamiento: 7, alcance: 120, empuje: 140 },
  marea_curativa: { id: 'marea_curativa', nombre: 'Marea curativa', elemento: 'agua', tipo: 'curar', desc: 'Recupera parte de la vida.', poder: 0.28, enfriamiento: 14, alcance: 0 },
  // planta
  hojas_navaja: { id: 'hojas_navaja', nombre: 'Hojas navaja', elemento: 'planta', tipo: 'rafaga', desc: 'Hojas afiladas en abanico.', poder: 0.75, enfriamiento: 2.6, alcance: 260, radio: 9, velocidad: 420, cantidad: 3, apertura: 12 },
  esporas: { id: 'esporas', nombre: 'Esporas', elemento: 'planta', tipo: 'zona', desc: 'Nube de esporas venenosas.', poder: 0.8, enfriamiento: 8, alcance: 280, radio: 90, preparacion: 0.6, estado: 'veneno', probEstado: 1 },
  latigo_cepa: { id: 'latigo_cepa', nombre: 'Látigo cepa', elemento: 'planta', tipo: 'rayo', desc: 'Un latigazo largo y rápido.', poder: 1.35, enfriamiento: 4.5, alcance: 200, radio: 20, preparacion: 0.25, empuje: 50 },
  raices: { id: 'raices', nombre: 'Raíces', elemento: 'planta', tipo: 'escudo', desc: 'Echa raíces: escudo resistente.', poder: 0.3, enfriamiento: 13, alcance: 0, duracion: 5 },
  // eléctrico
  chispazo: { id: 'chispazo', nombre: 'Chispazo', elemento: 'electrico', tipo: 'proyectil', desc: 'Rayo rápido que puede paralizar.', poder: 0.85, enfriamiento: 2, alcance: 320, radio: 10, velocidad: 560, estado: 'paralisis', probEstado: 0.25 },
  rayo_trueno: { id: 'rayo_trueno', nombre: 'Rayo trueno', elemento: 'electrico', tipo: 'zona', desc: 'Un relámpago cae del cielo.', poder: 2.0, enfriamiento: 8, alcance: 340, radio: 60, preparacion: 0.8, estado: 'paralisis', probEstado: 0.5 },
  carga_voltio: { id: 'carga_voltio', nombre: 'Carga voltio', elemento: 'electrico', tipo: 'embestida', desc: 'Una carga eléctrica veloz.', poder: 1.2, enfriamiento: 4.5, alcance: 240, radio: 24, estado: 'paralisis', probEstado: 0.3, empuje: 40 },
  aceleron: { id: 'aceleron', nombre: 'Acelerón', elemento: 'electrico', tipo: 'mejora', desc: '+40% de velocidad por un rato.', poder: 0.4, enfriamiento: 12, alcance: 0, duracion: 5 },
  // roca
  lanzarrocas: { id: 'lanzarrocas', nombre: 'Lanzarrocas', elemento: 'roca', tipo: 'proyectil', desc: 'Una roca pesada que aturde.', poder: 1.3, enfriamiento: 3, alcance: 260, radio: 16, velocidad: 280, empuje: 60 },
  terremoto: { id: 'terremoto', nombre: 'Terremoto', elemento: 'roca', tipo: 'area', desc: 'Sacude el suelo a tu alrededor.', poder: 1.8, enfriamiento: 8, alcance: 140, empuje: 60 },
  coraza: { id: 'coraza', nombre: 'Coraza', elemento: 'roca', tipo: 'escudo', desc: 'Un escudo de piedra enorme.', poder: 0.4, enfriamiento: 14, alcance: 0, duracion: 5 },
  avalancha: { id: 'avalancha', nombre: 'Avalancha', elemento: 'roca', tipo: 'zona', desc: 'Rocas caen sobre el objetivo.', poder: 2.1, enfriamiento: 9, alcance: 300, radio: 75, preparacion: 1.0 },
  // viento
  cuchilla_aire: { id: 'cuchilla_aire', nombre: 'Cuchilla de aire', elemento: 'viento', tipo: 'proyectil', desc: 'Corta y atraviesa enemigos.', poder: 0.95, enfriamiento: 2.2, alcance: 360, radio: 11, velocidad: 600 },
  tornado: { id: 'tornado', nombre: 'Tornado', elemento: 'viento', tipo: 'zona', desc: 'Un tornado que ralentiza.', poder: 1.5, enfriamiento: 7, alcance: 320, radio: 70, preparacion: 0.6, estado: 'lento', probEstado: 1 },
  vuelo_raudo: { id: 'vuelo_raudo', nombre: 'Vuelo raudo', elemento: 'viento', tipo: 'embestida', desc: 'Un vuelo rasante muy largo.', poder: 1.1, enfriamiento: 4, alcance: 300, radio: 22 },
  vendaval: { id: 'vendaval', nombre: 'Vendaval', elemento: 'viento', tipo: 'area', desc: 'Una ráfaga que lo aparta todo.', poder: 1.1, enfriamiento: 6, alcance: 130, empuje: 180 },
  // sombra
  bola_sombra: { id: 'bola_sombra', nombre: 'Bola sombra', elemento: 'sombra', tipo: 'proyectil', desc: 'Una esfera de oscuridad.', poder: 1.1, enfriamiento: 2.6, alcance: 300, radio: 13, velocidad: 380 },
  paso_sombrio: { id: 'paso_sombrio', nombre: 'Paso sombrío', elemento: 'sombra', tipo: 'embestida', desc: 'Atraviesa al rival siendo intocable.', poder: 1.2, enfriamiento: 5, alcance: 220, radio: 24 },
  maldicion: { id: 'maldicion', nombre: 'Maldición', elemento: 'sombra', tipo: 'zona', desc: 'Un círculo maldito que envenena.', poder: 1.3, enfriamiento: 8, alcance: 300, radio: 80, preparacion: 0.7, estado: 'veneno', probEstado: 1 },
  aullido: { id: 'aullido', nombre: 'Aullido', elemento: 'sombra', tipo: 'mejora', desc: '+35% de daño por un rato.', poder: 0.35, enfriamiento: 12, alcance: 0, duracion: 6 },
};

// ------------------------------------------------------------------ habilidades (pasivas)
export interface Habilidad { id: string; nombre: string; desc: string }
export const HABILIDADES: Record<string, Habilidad> = {
  brasa_interior: { id: 'brasa_interior', nombre: 'Brasa interior', desc: 'Con menos del 35% de vida, sus ataques de fuego hacen +30% de daño.' },
  marea: { id: 'marea', nombre: 'Marea', desc: 'Con menos del 35% de vida, sus ataques de agua hacen +30% de daño.' },
  espesura: { id: 'espesura', nombre: 'Espesura', desc: 'Con menos del 35% de vida, sus ataques de planta hacen +30% de daño.' },
  estatica: { id: 'estatica', nombre: 'Estática', desc: 'Sus golpes básicos pueden paralizar (15%).' },
  furia_tormenta: { id: 'furia_tormenta', nombre: 'Furia de tormenta', desc: '+12% de daño y +10% de velocidad.' },
  roca_solida: { id: 'roca_solida', nombre: 'Roca sólida', desc: 'Recibe un 15% menos de daño.' },
  viento_cola: { id: 'viento_cola', nombre: 'Viento de cola', desc: 'Se mueve un 20% más rápido.' },
  sombra_esquiva: { id: 'sombra_esquiva', nombre: 'Sombra esquiva', desc: '15% de probabilidad de esquivar un ataque.' },
};

// ------------------------------------------------------------------ especies
export interface Especie {
  id: string;
  nombre: string;
  elemento: Elemento;
  etapa: 1 | 2 | 3;
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

export const ESPECIES: Record<string, Especie> = {
  chispi: { id: 'chispi', nombre: 'Chispi', elemento: 'fuego', etapa: 1, evoluciona: { a: 'llamarak', nivel: 12 }, inicial: true,
    base: { vida: 44, ataque: 55, defensa: 40, velocidad: 72 }, basico: 'cuerpo', movimientos: ['ascuas', 'embestida_ignea', 'llamarada', 'erupcion'],
    habilidad: 'brasa_interior', desc: 'Salamandra inquieta. Su cresta arde más cuando está contenta.', captura: { nivel: 8, monedas: 600, nivelSalvaje: 8 } },
  llamarak: { id: 'llamarak', nombre: 'Llamarak', elemento: 'fuego', etapa: 2, evoluciona: { a: 'infernox', nivel: 28 },
    base: { vida: 60, ataque: 70, defensa: 52, velocidad: 76 }, basico: 'cuerpo', movimientos: ['ascuas', 'embestida_ignea', 'llamarada', 'erupcion'],
    habilidad: 'brasa_interior', desc: 'Guerrero de melena ardiente. Nunca retrocede.', captura: { nivel: 22, monedas: 3000, nivelSalvaje: 18 } },
  infernox: { id: 'infernox', nombre: 'Infernox', elemento: 'fuego', etapa: 3,
    base: { vida: 80, ataque: 90, defensa: 68, velocidad: 70 }, basico: 'cuerpo', movimientos: ['ascuas', 'embestida_ignea', 'llamarada', 'erupcion'],
    habilidad: 'brasa_interior', desc: 'Bestia volcánica. Por sus grietas corre magma.', captura: { nivel: 38, monedas: 12000, nivelSalvaje: 32 } },
  gotin: { id: 'gotin', nombre: 'Gotín', elemento: 'agua', etapa: 1, evoluciona: { a: 'marejon', nivel: 12 }, inicial: true,
    base: { vida: 50, ataque: 48, defensa: 48, velocidad: 64 }, basico: 'distancia', movimientos: ['burbuja', 'hidrochorro', 'ola', 'marea_curativa'],
    habilidad: 'marea', desc: 'Ajolote curioso. La burbuja de su cola nunca revienta.', captura: { nivel: 8, monedas: 600, nivelSalvaje: 8 } },
  marejon: { id: 'marejon', nombre: 'Marejón', elemento: 'agua', etapa: 2, evoluciona: { a: 'abisaurio', nivel: 28 },
    base: { vida: 66, ataque: 62, defensa: 60, velocidad: 70 }, basico: 'distancia', movimientos: ['burbuja', 'hidrochorro', 'ola', 'marea_curativa'],
    habilidad: 'marea', desc: 'Nutria guerrera. Mueve el agua con las patas.', captura: { nivel: 22, monedas: 3000, nivelSalvaje: 18 } },
  abisaurio: { id: 'abisaurio', nombre: 'Abisaurio', elemento: 'agua', etapa: 3,
    base: { vida: 90, ataque: 78, defensa: 80, velocidad: 60 }, basico: 'distancia', movimientos: ['burbuja', 'hidrochorro', 'ola', 'marea_curativa'],
    habilidad: 'marea', desc: 'Serpiente acorazada de los abismos.', captura: { nivel: 38, monedas: 12000, nivelSalvaje: 32 } },
  brotin: { id: 'brotin', nombre: 'Brotín', elemento: 'planta', etapa: 1, evoluciona: { a: 'espinardo', nivel: 12 }, inicial: true,
    base: { vida: 52, ataque: 46, defensa: 54, velocidad: 60 }, basico: 'cuerpo', movimientos: ['hojas_navaja', 'latigo_cepa', 'esporas', 'raices'],
    habilidad: 'espesura', desc: 'Erizo de hojas. Si se asusta, florece.', captura: { nivel: 8, monedas: 600, nivelSalvaje: 8 } },
  espinardo: { id: 'espinardo', nombre: 'Espinardo', elemento: 'planta', etapa: 2, evoluciona: { a: 'selvagor', nivel: 28 },
    base: { vida: 70, ataque: 60, defensa: 68, velocidad: 62 }, basico: 'cuerpo', movimientos: ['hojas_navaja', 'latigo_cepa', 'esporas', 'raices'],
    habilidad: 'espesura', desc: 'Jabalí de espinas. Sus colmillos son de madera dura.', captura: { nivel: 22, monedas: 3000, nivelSalvaje: 18 } },
  selvagor: { id: 'selvagor', nombre: 'Selvagor', elemento: 'planta', etapa: 3,
    base: { vida: 96, ataque: 76, defensa: 88, velocidad: 54 }, basico: 'cuerpo', movimientos: ['hojas_navaja', 'latigo_cepa', 'esporas', 'raices'],
    habilidad: 'espesura', desc: 'Bestia ancestral. Sobre su lomo crece un árbol.', captura: { nivel: 38, monedas: 12000, nivelSalvaje: 32 } },
  voltiron: { id: 'voltiron', nombre: 'Voltirón', elemento: 'electrico', etapa: 1, evoluciona: { a: 'tormentauro', nivel: 20 },
    base: { vida: 42, ataque: 56, defensa: 38, velocidad: 88 }, basico: 'distancia', movimientos: ['chispazo', 'carga_voltio', 'rayo_trueno', 'aceleron'],
    habilidad: 'estatica', desc: 'Hurón chispeante. Nunca se queda quieto.', captura: { nivel: 3, monedas: 250, nivelSalvaje: 4 } },
  tormentauro: { id: 'tormentauro', nombre: 'Tormentauro', elemento: 'electrico', etapa: 2,
    base: { vida: 82, ataque: 84, defensa: 62, velocidad: 78 }, basico: 'cuerpo', movimientos: ['chispazo', 'carga_voltio', 'rayo_trueno', 'aceleron'],
    habilidad: 'furia_tormenta', desc: 'Toro de tormenta. Donde embiste, cae un rayo.', captura: { nivel: 30, monedas: 8000, nivelSalvaje: 26 } },
  pedrusco: { id: 'pedrusco', nombre: 'Pedrusco', elemento: 'roca', etapa: 1, evoluciona: { a: 'golemon', nivel: 20 },
    base: { vida: 58, ataque: 50, defensa: 70, velocidad: 46 }, basico: 'cuerpo', movimientos: ['lanzarrocas', 'coraza', 'terremoto', 'avalancha'],
    habilidad: 'roca_solida', desc: 'Cangrejo de piedra. Colecciona cristales.', captura: { nivel: 2, monedas: 150, nivelSalvaje: 3 } },
  golemon: { id: 'golemon', nombre: 'Golemón', elemento: 'roca', etapa: 2,
    base: { vida: 98, ataque: 80, defensa: 96, velocidad: 44 }, basico: 'cuerpo', movimientos: ['lanzarrocas', 'coraza', 'terremoto', 'avalancha'],
    habilidad: 'roca_solida', desc: 'Gorila de roca. Sus puños de cristal parten montañas.', captura: { nivel: 30, monedas: 8000, nivelSalvaje: 26 } },
  cefiro: { id: 'cefiro', nombre: 'Céfiro', elemento: 'viento', etapa: 2,
    base: { vida: 56, ataque: 64, defensa: 48, velocidad: 96 }, basico: 'distancia', movimientos: ['cuchilla_aire', 'vuelo_raudo', 'tornado', 'vendaval'],
    habilidad: 'viento_cola', desc: 'Halcón del viento. Vuela más rápido que su sombra.', captura: { nivel: 12, monedas: 1400, nivelSalvaje: 12 } },
  umbraz: { id: 'umbraz', nombre: 'Umbraz', elemento: 'sombra', etapa: 2,
    base: { vida: 60, ataque: 72, defensa: 50, velocidad: 84 }, basico: 'cuerpo', movimientos: ['bola_sombra', 'paso_sombrio', 'maldicion', 'aullido'],
    habilidad: 'sombra_esquiva', desc: 'Zorro de sombras con colas de fuego fantasma.', captura: { nivel: 16, monedas: 2200, nivelSalvaje: 15 } },
};

export const INICIALES = ['chispi', 'gotin', 'brotin'];
export const NIVEL_MAX_PRIMAL = 40;

/** Estadísticas de un Primal en un nivel. */
export function statsPrimal(esp: Especie, nivel: number) {
  const f = 0.6 + 0.04 * nivel;
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
