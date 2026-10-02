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
  tuta: { nombre: ['Oscuridad total', 'Total darkness'], efectos: [{ el: ['sombra'], stat: 'ataque', mult: 1.2 }, { el: ['luz'], stat: 'ataque', mult: 0.85 }] },
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
    ultimo: ['Ayahuma… muéstrales el miedo.', 'Ayahuma… show them fear.'], especial: ['¡Que se apaguen las luces!', 'Lights out!'] },
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
