// Modo Historia: El Camino del Campeón. 8 gimnasios por Ecuador (cada uno da su medalla) y, con las 8
// medallas, el Alto Mando: 4 Élite y la Campeona, que hay que vencer seguidos (si pierdes, vuelves a empezar).

import type { Elemento } from './data';

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
}

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
  { id: 'wayra', nombre: 'Wayra', titulo: ['Líder de Viento', 'Wind Leader'], lugar: ['Laguna del Quilotoa', 'Quilotoa Lagoon'], elemento: 'viento', medalla: 'vendaval', premio: 650, ia: 0.64, trofeos: 1000,
    equipo: [{ esp: 'quindazo', nivel: 23 }, { esp: 'harpiandina', nivel: 24 }, { esp: 'fragatormenta', nivel: 25 }],
    frase: ['Sobre el cráter del Quilotoa el viento no avisa. ¿Podrás seguirle el ritmo?', 'Above the Quilotoa crater the wind gives no warning. Can you keep up?'],
    derrota: ['Volaste más alto que mi vendaval. Toma la Medalla Vendaval.', 'You flew higher than my gale. Take the Gale Badge.'] },
  { id: 'tuta', nombre: 'Tuta', titulo: ['Líder de Sombra', 'Shadow Leader'], lugar: ['Cueva de los Tayos', 'Cave of the Tayos'], elemento: 'sombra', medalla: 'umbral', premio: 750, ia: 0.7, trofeos: 1800,
    equipo: [{ esp: 'chusikar', nivel: 27 }, { esp: 'otorongo', nivel: 28 }, { esp: 'ayahuma', nivel: 29 }],
    frase: ['En la oscuridad de los Tayos, solo los valientes encuentran la salida.', 'In the darkness of the Tayos, only the brave find the way out.'],
    derrota: ['Encontraste la luz en mi oscuridad. La Medalla Umbral es tuya.', 'You found light in my darkness. The Threshold Badge is yours.'] },
  { id: 'rasu', nombre: 'Rasu', titulo: ['Líder de Hielo', 'Ice Leader'], lugar: ['Volcán Chimborazo', 'Chimborazo Volcano'], elemento: 'hielo', medalla: 'nevado', premio: 900, ia: 0.76, trofeos: 1800,
    equipo: [{ esp: 'ukumarasu', nivel: 31 }, { esp: 'atukrasu', nivel: 32 }, { esp: 'cotopaxor', nivel: 33 }],
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

export const LIDERES: Lider[] = [...GIMNASIOS, ...ALTO_MANDO];
export const liderPorId = (id: string) => LIDERES.find((l) => l.id === id);

export interface ProgresoHistoria {
  gim: string[]; // gimnasios vencidos
  elite: number; // cuántos del Alto Mando llevas seguidos en este intento (0-5)
  campeon: number; // veces que venciste a la Campeona
}
export const historiaVacia = (): ProgresoHistoria => ({ gim: [], elite: 0, campeon: 0 });

/** Medallas ganadas (una por gimnasio vencido). */
export const medallasDeHistoria = (h: ProgresoHistoria | undefined) => GIMNASIOS.filter((g) => h?.gim.includes(g.id)).map((g) => g.medalla!);

/** Siguiente rival disponible, o null si ya está todo hecho en este intento. */
export function siguienteRival(h: ProgresoHistoria): Lider | null {
  const g = GIMNASIOS.find((x) => !h.gim.includes(x.id));
  if (g) return g;
  return ALTO_MANDO[h.elite] ?? null;
}

/** ¿Se puede retar a este líder ahora? (null = sí; si no, el motivo) */
export function puedeRetar(h: ProgresoHistoria, id: string): string | null {
  const gi = GIMNASIOS.findIndex((x) => x.id === id);
  if (gi >= 0) return gi === 0 || h.gim.includes(GIMNASIOS[gi - 1].id) ? null : 'Primero vence al gimnasio anterior.';
  const ei = ALTO_MANDO.findIndex((x) => x.id === id);
  if (ei < 0) return 'Ese rival no existe.';
  if (h.gim.length < GIMNASIOS.length) return 'Necesitas las 8 medallas para retar al Alto Mando.';
  return ei === h.elite ? null : 'En el Alto Mando hay que vencerlos en orden y seguidos.';
}
