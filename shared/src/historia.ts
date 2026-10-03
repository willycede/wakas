// Modo Historia: El Camino del Campeón. 8 gimnasios por Ecuador (cada uno da su medalla) y, con las 8
// medallas, el Alto Mando: 4 Élite y la Campeona, que hay que vencer seguidos (si pierdes, vuelves a empezar).

import type { Elemento } from './data';
import type { Avatar } from './avatar';

export interface Lider {
  id: string;
  nombre: string;
  titulo: [string, string]; // [es, en]
  lugar: [string, string];
  elemento: Elemento;
  elemento2?: Elemento;
  equipo: { esp: string; nivel: number }[];
  ia: number; // qué tan bien pelea (0-1)
  medalla?: string; // solo los gimnasios
  premio: number; // monedas la primera vez
  frase: [string, string]; // antes de pelear
  derrota: [string, string]; // cuando lo vences
  trofeos: number; // decide el estadio y los obstáculos
  avatar?: Avatar; // entrenadores de ruta: un entrenador normal (los líderes tienen su propio dibujo)
}

/** Cómo se ve un rival del Modo Historia. */
export const avatarLider = (l: Lider): Avatar => l.avatar ?? { modelo: 0, lider: l.id };

export const GIMNASIOS: Lider[] = [
  { id: 'nina', nombre: 'Nina', titulo: ['Líder de Fuego', 'Fire Leader'], lugar: ['Baños de Agua Santa', 'Baños de Agua Santa'], elemento: 'fuego', medalla: 'brasa', premio: 150, ia: 0.3, trofeos: 0,
    equipo: [{ esp: 'iguanin', nivel: 6 }, { esp: 'llamin', nivel: 7 }, { esp: 'tunguri', nivel: 8 }],
    frase: ['El volcán Tungurahua nunca duerme, ¡y mis Primales tampoco! A ver si tu equipo aguanta el calor.', 'The Tungurahua volcano never sleeps, and neither do my Primals! Let’s see if your team can take the heat.'],
    derrota: ['¡Qué fuego tienes! Llévate la Medalla Brasa: tu camino recién empieza.', 'What a fire you have! Take the Ember Badge: your journey has just begun.'] },
  { id: 'yaku', nombre: 'Yaku', titulo: ['Líder de Agua', 'Water Leader'], lugar: ['Montañita', 'Montañita'], elemento: 'agua', medalla: 'oleaje', premio: 250, ia: 0.38, trofeos: 0,
    equipo: [{ esp: 'capibin', nivel: 9 }, { esp: 'piranin', nivel: 10 }, { esp: 'yakupi', nivel: 11 }],
    frase: ['Aquí las olas mandan. Si no sabes cuándo cambiar de Primal, te va a revolcar la marea.', 'Here the waves rule. If you don’t know when to switch Primals, the tide will wipe you out.'],
    derrota: ['Surfeaste mi oleaje como un profesional. La Medalla Oleaje es tuya.', 'You surfed my swell like a pro. The Surge Badge is yours.'] },
  { id: 'sacha', nombre: 'Sacha', titulo: ['Líder de Planta', 'Plant Leader'], lugar: ['Bosque nublado de Mindo', 'Mindo Cloud Forest'], elemento: 'planta', medalla: 'brote', premio: 350, ia: 0.45, trofeos: 400,
    equipo: [{ esp: 'dardin', nivel: 12 }, { esp: 'frailito', nivel: 13 }, { esp: 'cacaoso', nivel: 14 }],
    frase: ['En Mindo todo crece: las orquídeas, los colibríes… y la fuerza de mis Primales.', 'In Mindo everything grows: orchids, hummingbirds… and my Primals’ strength.'],
    derrota: ['Tu equipo floreció de verdad. Toma la Medalla Brote.', 'Your team truly blossomed. Take the Sprout Badge.'] },
  { id: 'illapa', nombre: 'Illapa', titulo: ['Líder Eléctrico', 'Electric Leader'], lugar: ['Guayaquil', 'Guayaquil'], elemento: 'electrico', medalla: 'voltio', premio: 450, ia: 0.52, trofeos: 400,
    equipo: [{ esp: 'aullin', nivel: 16 }, { esp: 'anguilampo', nivel: 16 }, { esp: 'aullatrueno', nivel: 18 }],
    frase: ['Illapa es el rayo de los Andes. Pestañeas y ya te electrocuté.', 'Illapa is the thunder of the Andes. Blink and you’re already shocked.'],
    derrota: ['¡Reflejos de relámpago! La Medalla Voltio te la ganaste.', 'Lightning reflexes! You earned the Volt Badge.'] },
  { id: 'rumi', nombre: 'Rumi', titulo: ['Líder de Roca', 'Rock Leader'], lugar: ['Ingapirca', 'Ingapirca'], elemento: 'roca', medalla: 'roca', premio: 550, ia: 0.58, trofeos: 1000,
    equipo: [{ esp: 'galapon', nivel: 20 }, { esp: 'taranton', nivel: 20 }, { esp: 'martillazo', nivel: 22 }],
    frase: ['Estas piedras llevan siglos en pie. Mis Primales son igual de duros de derribar.', 'These stones have stood for centuries. My Primals are just as hard to topple.'],
    derrota: ['Partiste la roca. Pocos lo logran: la Medalla Roca es tuya.', 'You cracked the rock. Few manage it: the Boulder Badge is yours.'] },
  { id: 'wayra', nombre: 'Wayra', titulo: ['Líder de Viento', 'Wind Leader'], lugar: ['Laguna del Quilotoa', 'Quilotoa Lagoon'], elemento: 'viento', medalla: 'vendaval', premio: 650, ia: 0.55, trofeos: 1000,
    equipo: [{ esp: 'patazul', nivel: 22 }, { esp: 'quindazo', nivel: 23 }, { esp: 'fragatormenta', nivel: 24 }],
    frase: ['Sobre el cráter del Quilotoa el viento no avisa. ¿Podrás seguirle el ritmo?', 'Above the Quilotoa crater the wind gives no warning. Can you keep up?'],
    derrota: ['Volaste más alto que mi vendaval. Toma la Medalla Vendaval.', 'You flew higher than my gale. Take the Gale Badge.'] },
  { id: 'tuta', nombre: 'Tuta', titulo: ['Líder de Sombra', 'Shadow Leader'], lugar: ['Cueva de los Tayos', 'Cave of the Tayos'], elemento: 'sombra', medalla: 'umbral', premio: 750, ia: 0.57, trofeos: 1800,
    equipo: [{ esp: 'taranton', nivel: 25 }, { esp: 'piranazo', nivel: 25 }, { esp: 'chusikar', nivel: 26 }],
    frase: ['En la oscuridad de los Tayos, solo los valientes encuentran la salida.', 'In the darkness of the Tayos, only the brave find the way out.'],
    derrota: ['Encontraste la luz en mi oscuridad. La Medalla Umbral es tuya.', 'You found light in my darkness. The Threshold Badge is yours.'] },
  { id: 'rasu', nombre: 'Rasu', titulo: ['Líder de Hielo', 'Ice Leader'], lugar: ['Volcán Chimborazo', 'Chimborazo Volcano'], elemento: 'hielo', medalla: 'nevado', premio: 900, ia: 0.86, trofeos: 1800,
    equipo: [{ esp: 'ukumarasu', nivel: 33 }, { esp: 'atukrasu', nivel: 34 }, { esp: 'cotopaxor', nivel: 35 }],
    frase: ['Estás en el punto más cercano al Sol. Aquí arriba, el hielo pone a prueba a los mejores.', 'You stand at the point closest to the Sun. Up here, the ice tests the very best.'],
    derrota: ['Ocho medallas… El Alto Mando te espera, Entrenador. Toma la Medalla Nevado.', 'Eight badges… The Elite Four awaits you, Trainer. Take the Summit Badge.'] },
];

export const ALTO_MANDO: Lider[] = [
  { id: 'amaru', nombre: 'Amaru', titulo: ['Élite del Alto Mando', 'Elite Four'], lugar: ['Mitad del Mundo', 'Middle of the World'], elemento: 'agua', elemento2: 'planta', premio: 1000, ia: 0.82, trofeos: 2800,
    equipo: [{ esp: 'amarusacha', nivel: 34 }, { esp: 'caimanegro', nivel: 34 }, { esp: 'yakuaron', nivel: 35 }],
    frase: ['Soy Amaru, la serpiente de los ríos. Nadie atraviesa el Alto Mando sin pasar por mis aguas.', 'I am Amaru, the serpent of the rivers. No one crosses the Elite Four without passing through my waters.'],
    derrota: ['Me venciste… pero los demás no serán tan amables.', 'You beat me… but the others won’t be so kind.'] },
  { id: 'supay', nombre: 'Supay', titulo: ['Élite del Alto Mando', 'Elite Four'], lugar: ['Mitad del Mundo', 'Middle of the World'], elemento: 'sombra', elemento2: 'fuego', premio: 1200, ia: 0.85, trofeos: 2800,
    equipo: [{ esp: 'quiloton', nivel: 35 }, { esp: 'tungurex', nivel: 36 }, { esp: 'chusikron', nivel: 36 }],
    frase: ['¡La diablada empieza! Baila al ritmo de mis llamas oscuras… si puedes.', 'The diablada begins! Dance to the rhythm of my dark flames… if you can.'],
    derrota: ['Bailaste mejor que yo. Sigue, si te atreves.', 'You danced better than me. Go on, if you dare.'] },
  { id: 'killa', nombre: 'Killa', titulo: ['Élite del Alto Mando', 'Elite Four'], lugar: ['Mitad del Mundo', 'Middle of the World'], elemento: 'luz', elemento2: 'hielo', premio: 1400, ia: 0.88, trofeos: 4000,
    equipo: [{ esp: 'ranacristal', nivel: 37 }, { esp: 'morfolux', nivel: 37 }, { esp: 'gallofierro', nivel: 38 }],
    frase: ['La Luna ilumina a quien lo merece. Muéstrame tu brillo.', 'The Moon shines on those who deserve it. Show me your glow.'],
    derrota: ['Tu brillo es real. Solo queda uno antes de la Campeona.', 'Your glow is real. Only one remains before the Champion.'] },
  { id: 'kuntur', nombre: 'Kuntur', titulo: ['Élite del Alto Mando', 'Elite Four'], lugar: ['Mitad del Mundo', 'Middle of the World'], elemento: 'viento', elemento2: 'roca', premio: 1600, ia: 0.9, trofeos: 4000,
    equipo: [{ esp: 'pumarumi', nivel: 38 }, { esp: 'galapagon', nivel: 38 }, { esp: 'quindestral', nivel: 39 }],
    frase: ['El cóndor ve todo desde lo alto. Ya vi cómo peleas… y sé cómo vencerte.', 'The condor sees everything from above. I’ve watched how you fight… and I know how to beat you.'],
    derrota: ['Volaste más alto que el cóndor. La Campeona te espera.', 'You flew higher than the condor. The Champion awaits.'] },
  { id: 'pacha', nombre: 'Pacha', titulo: ['Campeona de la Liga Primal', 'Primal League Champion'], lugar: ['Mitad del Mundo', 'Middle of the World'], elemento: 'luz', premio: 3000, ia: 0.95, trofeos: 5500,
    equipo: [{ esp: 'voltanguila', nivel: 40 }, { esp: 'cacaotor', nivel: 40 }, { esp: 'apukuntur', nivel: 40 }],
    frase: ['Llegaste hasta la Mitad del Mundo. Aquí se decide quién es el mejor Entrenador. ¡Con todo!', 'You made it to the Middle of the World. Here we decide who the best Trainer is. Give it everything!'],
    derrota: ['Increíble… Desde hoy eres el nuevo Campeón de la Liga Primal. ¡Tu nombre quedará en el Salón de la Fama!', 'Incredible… From today you are the new Primal League Champion. Your name will live in the Hall of Fame!'] },
];

// Entrenadores de ruta: dos en el camino hacia cada gimnasio (desde el segundo). Hay que vencerlos para
// poder retar al líder; son más fáciles que él y dan monedas y experiencia.
const ruta = (id: string, nombre: string, titulo: [string, string], lugar: [string, string], elemento: Elemento, avatar: Avatar, equipo: [string, number][], ia: number, premio: number, trofeos: number, frase: [string, string], derrota: [string, string]): Lider =>
  ({ id, nombre, titulo, lugar, elemento, avatar, equipo: equipo.map(([esp, nivel]) => ({ esp, nivel })), ia, premio, trofeos, frase, derrota });
export const RUTAS: Record<string, Lider[]> = {
  yaku: [
    ruta('rosa', 'Rosa', ['Vendedora de encebollado', 'Encebollado vendor'], ['Camino a Montañita', 'Road to Montañita'], 'electrico', { modelo: 5, arriba: 0, abajo: 9 }, [['chispez', 8], ['piquerito', 8]], 0.3, 80, 0,
      ['¡Encebollado calientito! Pero primero, ¡una batalla!', 'Hot encebollado! But first, a battle!'], ['Ganaste… ¡te invito un encebollado!', 'You won… the encebollado is on me!']),
    ruta('kevin', 'Kevin', ['Surfista', 'Surfer'], ['Camino a Montañita', 'Road to Montañita'], 'viento', { modelo: 6 }, [['quindito', 9], ['capibin', 9], ['pelusin', 10]], 0.34, 100, 0,
      ['¡Hoy hay olas buenas! Y yo, ganas de pelear.', 'Great waves today! And I’m in the mood for a fight.'], ['Me revolcaste, ñaño. ¡Suerte con Yaku!', 'You wiped me out, bro. Good luck with Yaku!']),
  ],
  sacha: [
    ruta('andres', 'Andrés', ['Observador de aves', 'Birdwatcher'], ['Camino a Mindo', 'Road to Mindo'], 'viento', { modelo: 7, arriba: 3 }, [['tucanin', 11], ['piranin', 11]], 0.38, 120, 400,
      ['¡Shhh! Vas a espantar a los colibríes… ¡Pelea en silencio!', 'Shhh! You’ll scare the hummingbirds… fight quietly!'], ['Vuelas más alto que mis tucanes.', 'You fly higher than my toucans.']),
    ruta('lucia', 'Lucía', ['Botánica', 'Botanist'], ['Camino a Mindo', 'Road to Mindo'], 'planta', { modelo: 3, arriba: 3, abajo: 1 }, [['frailito', 12], ['dardin', 12], ['aullin', 13]], 0.42, 140, 400,
      ['Estudio orquídeas… y Primales fuertes.', 'I study orchids… and strong Primals.'], ['Interesante. Anotaré esta derrota en mi cuaderno.', 'Interesting. I’ll write this loss in my notebook.']),
  ],
  illapa: [
    ruta('jacinto', 'Don Jacinto', ['Pescador', 'Fisherman'], ['Camino a Guayaquil', 'Road to Guayaquil'], 'agua', { modelo: 9, gorra: 10, arriba: 5 }, [['galapon', 15], ['pinzin', 15]], 0.45, 150, 400,
      ['Cuarenta años pescando en el Guayas. ¡No me vas a ganar tan fácil!', 'Forty years fishing the Guayas. You won’t beat me that easily!'], ['¡Qué pesca la tuya, mijo!', 'What a catch you are, kid!']),
    ruta('bryan', 'Bryan', ['Repartidor en moto', 'Delivery rider'], ['Camino a Guayaquil', 'Road to Guayaquil'], 'electrico', { modelo: 14, arriba: 0, gorra: 0 }, [['anguilampo', 16], ['harpin', 16], ['cuernin', 17]], 0.48, 170, 400,
      ['¡Pedido urgente! Te despacho en un minuto.', 'Rush order! I’ll deliver you a loss in a minute.'], ['Llegué tarde… y perdí. Mal día.', 'Late delivery… and a loss. Bad day.']),
  ],
  rumi: [
    ruta('mateo', 'Mateo', ['Ciclista', 'Cyclist'], ['Camino a Ingapirca', 'Road to Ingapirca'], 'fuego', { modelo: 0, gorra: 2, arriba: 2 }, [['llamaradon', 19], ['piranazo', 19]], 0.52, 190, 1000,
      ['Subí todo el Cajas en bici. ¡Tengo piernas para pelear!', 'I rode all of El Cajas. I’ve got legs to fight!'], ['Me quedé sin aire… bien jugado.', 'Out of breath… well played.']),
    ruta('daniela', 'Daniela', ['Arqueóloga', 'Archaeologist'], ['Camino a Ingapirca', 'Road to Ingapirca'], 'roca', { modelo: 2, arriba: 12, abajo: 12 }, [['pumita', 20], ['tapirin', 20], ['amaruto', 21]], 0.55, 210, 1000,
      ['Estas ruinas guardan secretos. Mis Primales también.', 'These ruins keep secrets. So do my Primals.'], ['Tu estilo merece estar en un museo.', 'Your style belongs in a museum.']),
  ],
  wayra: [
    ruta('sisa', 'Sisa', ['Pastora de llamas', 'Llama herder'], ['Camino al Quilotoa', 'Road to Quilotoa'], 'agua', { modelo: 4, arriba: 0 }, [['patazul', 23], ['dardosa', 23]], 0.57, 230, 1000,
      ['Mis llamas se cansaron, ¡pero mis Primales no!', 'My llamas got tired, but my Primals didn’t!'], ['Arre… me ganaste. Sigue el camino al cráter.', 'Well… you won. Keep going to the crater.']),
    ruta('ivan', 'Iván', ['Kayakista', 'Kayaker'], ['Camino al Quilotoa', 'Road to Quilotoa'], 'viento', { modelo: 10, arriba: 4 }, [['tucanazo', 24], ['aullatrueno', 24], ['vicunieve', 24]], 0.58, 250, 1000,
      ['Remé toda la laguna para esperarte.', 'I paddled the whole lagoon to wait for you.'], ['Me volteaste el kayak. ¡Wayra te espera!', 'You flipped my kayak. Wayra awaits!']),
  ],
  tuta: [
    ruta('camila', 'Camila', ['Espeleóloga', 'Cave explorer'], ['Camino a los Tayos', 'Road to the Tayos'], 'roca', { modelo: 8, gorra: 2, arriba: 1 }, [['taranton', 25], ['piranazo', 25]], 0.57, 270, 1800,
      ['Ahí abajo no se ve nada. ¿Tienes miedo a la oscuridad?', 'You can’t see a thing down there. Afraid of the dark?'], ['Tienes luz propia. Vas a necesitarla.', 'You shine on your own. You’ll need it.']),
    ruta('nantu', 'Nantu', ['Guía de la selva', 'Jungle guide'], ['Camino a los Tayos', 'Road to the Tayos'], 'sombra', { modelo: 10, arriba: 3, abajo: 12 }, [['chusikar', 25], ['caimanegro', 25], ['dardosa', 26]], 0.59, 290, 1800,
      ['La selva cuida a quien la respeta. Demuestra que la respetas.', 'The jungle protects those who respect it. Show me you do.'], ['Pasas. Que la selva te acompañe.', 'You may pass. May the jungle walk with you.']),
  ],
  rasu: [
    ruta('tomas', 'Tomás', ['Hielero', 'Ice harvester'], ['Camino al Chimborazo', 'Road to Chimborazo'], 'hielo', { modelo: 9, gorra: 11, arriba: 12 }, [['ukumari', 29], ['frailejon', 29]], 0.65, 320, 1800,
      ['Bajo hielo del nevado desde niño. Esto no es nada.', 'I’ve carried ice down the mountain since I was a boy. This is nothing.'], ['Tienes más fuerza que mi burrito.', 'You’re stronger than my donkey.']),
    ruta('valeria', 'Valeria', ['Andinista', 'Mountaineer'], ['Camino al Chimborazo', 'Road to Chimborazo'], 'hielo', { modelo: 11, gorra: 0, arriba: 0 }, [['galapingo', 31], ['vicunieve', 31], ['ranacristal', 32]], 0.7, 350, 1800,
      ['Seis mil metros de altura. Aquí arriba solo llegan los fuertes.', 'Six thousand meters high. Only the strong make it up here.'], ['Llegaste a la cumbre. Rasu te espera.', 'You reached the summit. Rasu awaits.']),
  ],
};

export const LIDERES: Lider[] = [...GIMNASIOS, ...ALTO_MANDO, ...Object.values(RUTAS).flat()];
/** El camino completo en orden: gimnasio 1, ruta, gimnasio 2, ruta, … gimnasio 8. */
export const CAMINO: Lider[] = GIMNASIOS.flatMap((g) => [...(RUTAS[g.id] ?? []), g]);
export const esRuta = (id: string) => Object.values(RUTAS).some((r) => r.some((x) => x.id === id));
export const liderPorId = (id: string) => LIDERES.find((l) => l.id === id);

export interface ProgresoHistoria {
  gim: string[]; // gimnasios vencidos
  ruta?: string[]; // entrenadores de ruta vencidos
  elite: number; // cuántos del Alto Mando llevas seguidos en este intento (0-5)
  campeon: number; // veces que venciste a la Campeona
}
export const historiaVacia = (): ProgresoHistoria => ({ gim: [], ruta: [], elite: 0, campeon: 0 });
const vencido = (h: ProgresoHistoria, id: string) => h.gim.includes(id) || !!h.ruta?.includes(id);

/** Medallas ganadas (una por gimnasio vencido). */
export const medallasDeHistoria = (h: ProgresoHistoria | undefined) => GIMNASIOS.filter((g) => h?.gim.includes(g.id)).map((g) => g.medalla!);

/** Siguiente rival disponible, o null si ya está todo hecho en este intento. */
export function siguienteRival(h: ProgresoHistoria): Lider | null {
  const g = CAMINO.find((x) => !vencido(h, x.id));
  if (g) return g;
  return ALTO_MANDO[h.elite] ?? null;
}

/** ¿Se puede retar a este líder ahora? (null = sí; si no, el motivo) */
export function puedeRetar(h: ProgresoHistoria, id: string): string | null {
  const ci = CAMINO.findIndex((x) => x.id === id);
  if (ci >= 0) {
    if (vencido(h, id)) return null; // revancha
    const antes = CAMINO.slice(0, ci);
    const gAnt = [...antes].reverse().find((x) => GIMNASIOS.includes(x));
    if (gAnt && !h.gim.includes(gAnt.id)) return 'Primero vence al gimnasio anterior.';
    return antes.every((x) => vencido(h, x.id)) ? null : 'Primero vence a los entrenadores del camino.';
  }
  const ei = ALTO_MANDO.findIndex((x) => x.id === id);
  if (ei < 0) return 'Ese rival no existe.';
  if (h.gim.length < GIMNASIOS.length) return 'Necesitas las 8 medallas para retar al Alto Mando.';
  return ei === h.elite ? null : 'En el Alto Mando hay que vencerlos en orden y seguidos.';
}

// ------------------------------------------------------------------ terreno de cada gimnasio
// El lugar potencia o debilita a los Primales de ciertos elementos: a los del líder… y a los tuyos.
export type StatTerreno = 'ataque' | 'defensa' | 'velocidad' | 'vida';
export interface EfectoTerreno { el: Elemento[]; stat: StatTerreno; mult: number }
export interface Terreno { nombre: [string, string]; efectos: EfectoTerreno[] }

export const TERRENOS: Record<string, Terreno> = {
  nina: { nombre: ['Calor volcánico', 'Volcanic heat'], efectos: [{ el: ['fuego'], stat: 'ataque', mult: 1.2 }, { el: ['planta', 'hielo'], stat: 'defensa', mult: 0.85 }] },
  yaku: { nombre: ['Marea alta', 'High tide'], efectos: [{ el: ['agua'], stat: 'velocidad', mult: 1.2 }, { el: ['agua'], stat: 'ataque', mult: 1.1 }, { el: ['fuego'], stat: 'ataque', mult: 0.85 }] },
  sacha: { nombre: ['Bosque nublado', 'Cloud forest'], efectos: [{ el: ['planta'], stat: 'defensa', mult: 1.2 }, { el: ['planta'], stat: 'vida', mult: 1.1 }, { el: ['fuego'], stat: 'ataque', mult: 0.9 }] },
  illapa: { nombre: ['Red eléctrica', 'Power grid'], efectos: [{ el: ['electrico'], stat: 'velocidad', mult: 1.25 }, { el: ['agua'], stat: 'defensa', mult: 0.85 }] },
  rumi: { nombre: ['Muros de Ingapirca', 'Walls of Ingapirca'], efectos: [{ el: ['roca'], stat: 'defensa', mult: 1.25 }, { el: ['viento'], stat: 'ataque', mult: 0.9 }] },
  wayra: { nombre: ['Vendaval del cráter', 'Crater gale'], efectos: [{ el: ['viento'], stat: 'velocidad', mult: 1.2 }, { el: ['viento'], stat: 'ataque', mult: 1.1 }, { el: ['roca'], stat: 'velocidad', mult: 0.88 }] },
  tuta: { nombre: ['Oscuridad total', 'Total darkness'], efectos: [{ el: ['sombra'], stat: 'ataque', mult: 1.1 }, { el: ['luz'], stat: 'ataque', mult: 0.85 }] },
  rasu: { nombre: ['Ventisca', 'Blizzard'], efectos: [{ el: ['hielo'], stat: 'defensa', mult: 1.2 }, { el: ['hielo'], stat: 'ataque', mult: 1.1 }, { el: ['fuego'], stat: 'vida', mult: 0.88 }] },
  amaru: { nombre: ['Templo del río', 'River temple'], efectos: [{ el: ['agua', 'planta'], stat: 'vida', mult: 1.12 }] },
  supay: { nombre: ['Diablada en llamas', 'Blazing diablada'], efectos: [{ el: ['sombra', 'fuego'], stat: 'ataque', mult: 1.12 }] },
  killa: { nombre: ['Luna llena', 'Full moon'], efectos: [{ el: ['luz', 'hielo'], stat: 'defensa', mult: 1.12 }] },
  kuntur: { nombre: ['Cumbre del cóndor', 'Condor’s peak'], efectos: [{ el: ['viento', 'roca'], stat: 'velocidad', mult: 1.12 }] },
  pacha: { nombre: ['Línea del Ecuador', 'The Equator line'], efectos: [{ el: ['fuego', 'agua', 'planta', 'electrico', 'roca', 'viento', 'sombra', 'hielo', 'luz'], stat: 'vida', mult: 1.1 }] },
};

/** Multiplicadores del terreno para un Primal con esos elementos. */
export function multTerreno(liderId: string | undefined, elementos: Elemento[]): Record<StatTerreno, number> {
  const r = { ataque: 1, defensa: 1, velocidad: 1, vida: 1 };
  for (const e of (liderId && TERRENOS[liderId]?.efectos) || []) if (e.el.some((x) => elementos.includes(x))) r[e.stat] *= e.mult;
  return r;
}

// ------------------------------------------------------------------ lo que dicen durante la batalla
export interface Dialogos { koSuyo: [string, string]; koTuyo: [string, string]; ultimo: [string, string]; especial: [string, string] }
export const DIALOGOS: Record<string, Dialogos> = {
  nina: { koSuyo: ['¡Uf! Esa me quemó a mí…', 'Ouch! That one burned me…'], koTuyo: ['¡Directo a la lava!', 'Straight into the lava!'],
    ultimo: ['¡Tunguri, el volcán cuenta contigo!', 'Tunguri, the volcano is counting on you!'], especial: ['¡Que erupcione el Tungurahua!', 'Let the Tungurahua erupt!'] },
  yaku: { koSuyo: ['Esa ola me revolcó…', 'That wave wiped me out…'], koTuyo: ['¡Te llevó la corriente!', 'The current took you!'],
    ultimo: ['Última ola, ¡a todo o nada!', 'Last wave, all or nothing!'], especial: ['¡Marejada!', 'Swell incoming!'] },
  sacha: { koSuyo: ['Mis flores… ¡pero volverán a crecer!', 'My flowers… but they’ll grow back!'], koTuyo: ['¡El bosque siempre gana!', 'The forest always wins!'],
    ultimo: ['Cacaoso, ¡enraízate y no te muevas!', 'Cacaoso, take root and hold on!'], especial: ['¡Que florezca Mindo!', 'Let Mindo bloom!'] },
  illapa: { koSuyo: ['¡Cortocircuito! No lo vi venir.', 'Short circuit! Didn’t see that coming.'], koTuyo: ['¡Desconectado!', 'Disconnected!'],
    ultimo: ['Voltaje al máximo, ¡Aullatrueno!', 'Max voltage, Aullatrueno!'], especial: ['¡Rayo de Illapa!', 'Illapa’s thunderbolt!'] },
  rumi: { koSuyo: ['Una piedra cayó… quedan muchas.', 'One stone fell… many remain.'], koTuyo: ['¡Aplastado como adobe!', 'Crushed like adobe!'],
    ultimo: ['Martillazo, eres el último muro.', 'Martillazo, you are the last wall.'], especial: ['¡Que tiemble Ingapirca!', 'Let Ingapirca shake!'] },
  wayra: { koSuyo: ['El viento cambió de dirección…', 'The wind changed direction…'], koTuyo: ['¡Volando al cráter!', 'Flying into the crater!'],
    ultimo: ['Fragatormenta, ¡llévate todo!', 'Fragatormenta, sweep it all away!'], especial: ['¡Vendaval del Quilotoa!', 'Quilotoa gale!'] },
  tuta: { koSuyo: ['La sombra se desvanece… por ahora.', 'The shadow fades… for now.'], koTuyo: ['La oscuridad te tragó.', 'The darkness swallowed you.'],
    ultimo: ['Chusikar… muéstrales el miedo.', 'Chusikar… show them fear.'], especial: ['¡Que se apaguen las luces!', 'Lights out!'] },
  rasu: { koSuyo: ['Ja, ja… tienes sangre caliente.', 'Ha ha… you’ve got warm blood.'], koTuyo: ['¡Congelado en la cumbre!', 'Frozen at the summit!'],
    ultimo: ['Cotopaxor, defiende la montaña.', 'Cotopaxor, defend the mountain.'], especial: ['¡Ventisca del Chimborazo!', 'Chimborazo blizzard!'] },
  amaru: { koSuyo: ['El río se desvía… no se detiene.', 'The river turns… it never stops.'], koTuyo: ['¡Atrapado por la serpiente!', 'Caught by the serpent!'],
    ultimo: ['Yakuarón, que crezca la creciente.', 'Yakuarón, let the flood rise.'], especial: ['¡Abrazo de Amaru!', 'Amaru’s embrace!'] },
  supay: { koSuyo: ['¡Ja! Eso apenas me hizo cosquillas… creo.', 'Ha! That barely tickled… I think.'], koTuyo: ['¡Al infierno de la diablada!', 'Into the diablada’s inferno!'],
    ultimo: ['¡Último baile, Chusikrón!', 'Last dance, Chusikrón!'], especial: ['¡Que arda la máscara!', 'Let the mask burn!'] },
  killa: { koSuyo: ['Un eclipse pasajero.', 'A passing eclipse.'], koTuyo: ['La Luna no perdona.', 'The Moon does not forgive.'],
    ultimo: ['Gallofierro, brilla por los dos.', 'Gallofierro, shine for both of us.'], especial: ['¡Luz de luna llena!', 'Full moonlight!'] },
  kuntur: { koSuyo: ['Una pluma menos… el cóndor sigue volando.', 'One feather less… the condor still flies.'], koTuyo: ['¡Desde lo alto todo se ve pequeño!', 'From up here everything looks small!'],
    ultimo: ['Quindestral, ¡el cielo es nuestro!', 'Quindestral, the sky is ours!'], especial: ['¡Picada del cóndor!', 'Condor dive!'] },
  pacha: { koSuyo: ['Bien… ahora sí me estás asustando.', 'Good… now you are actually scaring me.'], koTuyo: ['Así se pelea en la Mitad del Mundo.', 'That is how we fight at the Middle of the World.'],
    ultimo: ['Mi último Primal… ¡demos un final de leyenda!', 'My last Primal… let us make it legendary!'], especial: ['¡Por el Sol y la Tierra!', 'For the Sun and the Earth!'] },
};
