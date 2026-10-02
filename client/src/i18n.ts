// Idiomas: español e inglés. El idioma se guarda en el navegador.

import { EN, ELEMENTOS, MISIONES, ESPECIALES, ESPECIALES_LEGENDARIOS, ESPECIES, HABILIDADES, HABILIDADES_DOMADOR, LIGAS, MEDALLAS, MOVIMIENTOS, RAREZAS, especialesDe, type Elemento, type Rareza } from '../../shared/src';

export type Idioma = 'es' | 'en';
const KEY = 'primal_idioma';

function inicial(): Idioma {
  try {
    const g = localStorage.getItem(KEY);
    if (g === 'es' || g === 'en') return g;
  } catch { /* sin almacenamiento */ }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export let idioma: Idioma = inicial();
const oyentes: (() => void)[] = [];
export function alCambiarIdioma(fn: () => void) { oyentes.push(fn); }
export function cambiarIdioma(i: Idioma) {
  idioma = i;
  try { localStorage.setItem(KEY, i); } catch { /* sin almacenamiento */ }
  document.documentElement.lang = i;
  aplicarHtml();
  oyentes.forEach((f) => f());
}

const T = {
  es: {
    'login.tagline': 'La liga mundial de Primales',
    'login.user': 'Nombre de Entrenador',
    'login.pass': 'Contraseña',
    'login.enter': 'Entrar',
    'login.create': 'Crear cuenta',
    'login.hint': 'Crea tu cuenta en segundos y entra a la liga.',
    'starter.title': 'Elige a tus 3 compañeros',
    'starter.sub': 'Empiezas con tres Primales comunes que evolucionan dos veces. A los demás tendrás que ganártelos en combate.',
    'starter.confirm': '¡Empezar la aventura!',
    'starter.pick': 'Elige {n} más',
    'starter.joined': '¡Tu equipo está listo!',
    'starter.chosen': 'Elegido',
    'tab.team': 'Equipo', 'tab.capture': 'Capturar', 'tab.battle': 'Batalla', 'tab.trainer': 'Entrenador', 'tab.ranking': 'Ranking',
    'battle.find': 'Batallar', 'battle.searching': 'Buscando rival', 'battle.cancel': 'Cancelar',
    'battle.next': '{n} trofeos para {l}', 'battle.top': 'Estás en la liga más alta',
    'battle.record': '{w} victorias · {l} derrotas · récord {r}',
    'battle.wins': 'Victorias', 'battle.losses': 'Derrotas', 'battle.best': 'Récord',
    'battle.rules': 'Victoria +30 · Derrota −18 · Solo las victorias dan experiencia',
    'battle.yourTeam': 'Tu equipo',
    'team.title': 'Tu equipo', 'team.hint': 'Llevas 3 Primales a cada batalla (solo un legendario). Toca uno de tu colección para añadirlo o ponerlo al frente; toca uno del equipo para retirarlo.',
    'team.collection': 'Colección', 'team.empty': 'Vacío', 'team.lead': 'Al frente', 'team.inTeam': 'En el equipo',
    'team.evolves': 'Evoluciona en nv. {l} → {n}', 'team.final': 'Forma final',
    'stat.hp': 'Vida', 'stat.atk': 'Ataque', 'stat.def': 'Defensa', 'stat.spd': 'Velocidad',
    'capture.title': 'Capturar', 'capture.hint': 'Paga la entrada y vence al Primal salvaje con tu equipo. Si ganas, se une a ti. Si pierdes, pierdes la entrada.',
    'capture.all': 'Todos', 'capture.legendTitle': 'Legendario del día', 'capture.legendHint': 'Solo se puede retar hoy. Cambia en {t}.',
    'capture.legendNext': 'Mañana aparece {n}', 'capture.legendLocked': 'Aparece otro día', 'capture.req': 'Entrenador nv. {n}', 'capture.wild': 'Salvaje nv. {n}', 'capture.go': 'Retar', 'capture.owned': 'Capturado', 'capture.locked': 'Bloqueado',
    'trainer.level': 'Entrenador · nivel {n}', 'trainer.medals': 'Medallas', 'trainer.medalsHint': 'Cada medalla da +3% de experiencia a tus Primales.',
    'trainer.skills': 'Habilidades de Entrenador', 'trainer.points': '{n} puntos disponibles', 'trainer.points1': '1 punto disponible', 'trainer.points0': 'Sin puntos: sube de nivel ganando batallas',
    'trainer.lv': 'Nv.', 'trainer.upgrade': 'Mejorar', 'trainer.max': 'Máx.',
    'ranking.title': 'Ranking mundial', 'ranking.you': 'Tú',
    'key.space': 'Espacio', 'hud.basic': 'Básico', 'hud.dodge': 'Esquivar', 'hud.special': 'Especial', 'hud.combo': 'COMBO', 'hud.link': '¡ENLACE! +30%',
    'hud.help': 'Mover: WASD o clic derecho · Atacar: Espacio o clic · Movimientos: 1-4 · Especial: R (y T) · Esquivar: Shift · Cambiar: Q/E o rueda · Emotes: C',
    'hud.emotes': 'Emotes', 'hud.mute': 'Silenciar al rival', 'hud.unmute': 'Ver emotes del rival', 'hud.muted': 'Rival silenciado',
    'fr.gg': 'GG', 'fr.bien': '¡Bien jugado!', 'fr.ups': '¡Ups!', 'fr.gracias': '¡Gracias!', 'fr.vamos': '¡Vamos!', 'fr.wow': '¡Wow!',
    'misc.legendary': 'Legendario', 'misc.arena': 'Estadio',
    'ficha.desc': 'Descripción', 'ficha.stats': 'Estadísticas', 'ficha.moves': 'Movimientos', 'ficha.evo': 'Línea evolutiva', 'ficha.noEvo': 'No evoluciona.',
    'ficha.ability': 'Habilidad', 'ficha.specials': 'Técnicas especiales', 'ficha.learnAt': 'Nv. {n}', 'ficha.learned': 'Aprendido', 'ficha.evoAt': 'nv. {n}',
    'ficha.add': 'Añadir al equipo', 'ficha.lead': 'Poner al frente', 'ficha.remove': 'Quitar del equipo', 'ficha.close': 'Cerrar', 'ficha.yours': 'Tuyo · nv. {n}',
    'dif.title': '¿Vale la pena retarlo?', 'dif.facil': 'Fácil', 'dif.parejo': 'Parejo', 'dif.dificil': 'Difícil', 'dif.muy': 'Muy difícil',
    'dif.facilTxt': 'Tu equipo es bastante más fuerte. ¡Adelante!', 'dif.parejoTxt': 'Será un combate igualado. Juega con cuidado.',
    'dif.dificilTxt': 'Te supera. Sube de nivel o lleva ventaja de tipo.', 'dif.muyTxt': 'Hoy perderías la entrada. Vuelve más fuerte.',
    'dif.counter': 'Le gana: {t}', 'dif.wild': 'Salvaje', 'dif.you': 'Tu equipo',
    'tuto.offer': '¿Aprendemos a jugar?', 'tuto.offerTxt': 'Un combate de práctica de 2 minutos contra un muñeco. Ganas 200 monedas al terminarlo.',
    'tuto.start': 'Empezar tutorial', 'tuto.skip': 'Saltar', 'tuto.step': 'Paso {n} de {t}', 'tuto.done': '¡Tutorial completado!', 'tuto.again': 'Repetir tutorial',
    'tuto.mover': 'Muévete con WASD o las flechas (en el móvil, con el joystick).',
    'tuto.golpear': 'Gira hacia el muñeco y golpéalo 3 veces con Espacio o clic. Tus ataques salen hacia donde mira tu Primal (la flecha).',
    'tuto.mov': 'Usa tu primer movimiento con la tecla 1. Los movimientos son más fuertes pero tienen recarga.',
    'tuto.esquivar': 'Esquiva con Shift: durante un instante nada te hace daño.',
    'tuto.especial': 'Golpear llena tu barra especial. ¡Ya está llena! Lánzala con R.',
    'tuto.cambiar': 'Cambia de Primal con Q / E o tocando su retrato abajo.',
    'tuto.final': '¡Ahora derrota al muñeco! Combina golpes (combo) y movimientos.',
    'amis.title': 'Reto amistoso', 'amis.txt': 'Juega contra un amigo. No se ganan ni pierden trofeos.', 'amis.create': 'Crear reto', 'amis.join': 'Unirme',
    'amis.code': 'Código', 'amis.share': 'Compartir por WhatsApp', 'amis.copy': 'Copiar enlace', 'amis.copied': 'Enlace copiado', 'amis.waiting': 'Esperando a tu amigo',
    'amis.msg': '¡Te reto en Primal Clash! Entra aquí: {u}', 'amis.placeholder': 'Código de 5 letras',
    'hud.locked': 'Se aprende en nv. {n}', 'hud.capLevel': 'En esta liga los Primales pelean como máximo a nivel {n}.', 'res.newMove': '¡{p} aprendió {m}!',
    'intro.go': '¡Empezar mi aventura!', 'intro.tap': 'Toca para continuar', 'intro.again': 'Ver la historia',
    'mis.title': 'Misiones de hoy', 'mis.claim': 'Cobrar', 'mis.done': 'Cobrada', 'mis.new': 'Nuevas misiones en {t}',
    'bono.title': 'Primera victoria del día', 'bono.txt': 'Tu próxima victoria de Liga da el DOBLE de monedas.', 'bono.got': '¡Primera victoria del día! +{n} monedas extra',
    'camino.title': 'Tu camino a Campeón', 'camino.sub': 'Sube de liga, completa tu Primaldex y gánate a los cinco legendarios.',
    'camino.dex': 'Primaldex', 'camino.leg': 'Legendarios', 'camino.medals': 'Medallas', 'camino.league': 'Liga',
    'evo.start': '¿Qué? ¡{n} está evolucionando!', 'evo.done': '¡{a} evolucionó a {b}!', 'evo.ability': 'Nueva habilidad', 'evo.move': 'Nuevo movimiento', 'evo.skip': 'Saltar',
    'misc.rotate': 'Gira tu teléfono para jugar en horizontal', 'misc.install': 'Instalar la app',
    'hud.go': '¡YA!', 'hud.superEff': '¡Muy eficaz!', 'hud.notEff': 'Poco eficaz', 'hud.dodged': '¡Esquivado!',
    'hud.goPrimal': '¡Adelante, {n}!', 'hud.fainted': '¡{n} se debilitó!', 'hud.ready': '¡Especial lista!',
    'st.quemadura': 'Quemado', 'st.paralisis': 'Paralizado', 'st.lento': 'Ralentizado', 'st.veneno': 'Envenenado',
    'res.win': 'Victoria', 'res.lose': 'Derrota', 'res.draw': 'Empate', 'res.caught': '¡Capturado!',
    'res.time': 'Se acabó el tiempo: gana quien conserva más vida.', 'res.left': 'Tu rival abandonó la batalla.', 'res.surrender': 'Un Entrenador se rindió.',
    'res.trainerXp': '+{n} exp. de Entrenador', 'res.levelUp': '¡Entrenador nivel {n}!', 'res.noXp': 'Las derrotas no dan experiencia. ¡A por la revancha!',
    'res.evolved': '¡Evolucionó a {n}!', 'res.joined': '{n} se unió a tu equipo', 'res.continue': 'Continuar', 'res.medal': '¡Nueva medalla: {n}!',
    'res.coins': 'monedas', 'res.trophies': 'trofeos',
    'misc.loading': 'Cargando…', 'misc.level': 'Nv. {n}', 'misc.vsAI': 'Rival de entrenamiento', 'misc.lang': 'English',
  },
  en: {
    'login.tagline': 'The worldwide Primal League',
    'login.user': 'Trainer name',
    'login.pass': 'Password',
    'login.enter': 'Log in',
    'login.create': 'Create account',
    'login.hint': 'Create your account in seconds and join the league.',
    'starter.title': 'Choose your 3 partners',
    'starter.sub': 'You start with three common Primals that evolve twice. Every other one you will have to earn in battle.',
    'starter.confirm': 'Start the adventure!',
    'starter.pick': 'Pick {n} more',
    'starter.joined': 'Your team is ready!',
    'starter.chosen': 'Chosen',
    'tab.team': 'Team', 'tab.capture': 'Capture', 'tab.battle': 'Battle', 'tab.trainer': 'Trainer', 'tab.ranking': 'Ranking',
    'battle.find': 'Battle', 'battle.searching': 'Finding a rival', 'battle.cancel': 'Cancel',
    'battle.next': '{n} trophies to {l}', 'battle.top': 'You are in the top league',
    'battle.record': '{w} wins · {l} losses · best {r}',
    'battle.wins': 'Wins', 'battle.losses': 'Losses', 'battle.best': 'Best',
    'battle.rules': 'Win +30 · Loss −18 · Only wins grant experience',
    'battle.yourTeam': 'Your team',
    'team.title': 'Your team', 'team.hint': 'You bring 3 Primals to each battle (only one legendary). Tap one in your collection to add it or move it to the front; tap a team member to remove it.',
    'team.collection': 'Collection', 'team.empty': 'Empty', 'team.lead': 'Leader', 'team.inTeam': 'In team',
    'team.evolves': 'Evolves at Lv. {l} → {n}', 'team.final': 'Final form',
    'stat.hp': 'HP', 'stat.atk': 'Attack', 'stat.def': 'Defense', 'stat.spd': 'Speed',
    'capture.title': 'Capture', 'capture.hint': 'Pay the entry fee and defeat the wild Primal with your team. Win and it joins you. Lose and the fee is gone.',
    'capture.all': 'All', 'capture.legendTitle': 'Legendary of the day', 'capture.legendHint': 'Only challengeable today. Changes in {t}.',
    'capture.legendNext': 'Tomorrow: {n}', 'capture.legendLocked': 'Appears another day', 'capture.req': 'Trainer Lv. {n}', 'capture.wild': 'Wild Lv. {n}', 'capture.go': 'Challenge', 'capture.owned': 'Caught', 'capture.locked': 'Locked',
    'trainer.level': 'Trainer · level {n}', 'trainer.medals': 'Badges', 'trainer.medalsHint': 'Each badge gives your Primals +3% experience.',
    'trainer.skills': 'Trainer skills', 'trainer.points': '{n} points available', 'trainer.points1': '1 point available', 'trainer.points0': 'No points left: level up by winning battles',
    'trainer.lv': 'Lv.', 'trainer.upgrade': 'Upgrade', 'trainer.max': 'Max',
    'ranking.title': 'World ranking', 'ranking.you': 'You',
    'key.space': 'Space', 'hud.basic': 'Basic', 'hud.dodge': 'Dodge', 'hud.special': 'Special', 'hud.combo': 'COMBO', 'hud.link': 'LINK! +30%',
    'hud.help': 'Move: WASD or right-click · Attack: Space or click · Moves: 1-4 · Special: R (and T) · Dodge: Shift · Swap: Q/E or wheel · Emotes: C',
    'hud.emotes': 'Emotes', 'hud.mute': 'Mute rival', 'hud.unmute': 'Show rival emotes', 'hud.muted': 'Rival muted',
    'fr.gg': 'GG', 'fr.bien': 'Well played!', 'fr.ups': 'Oops!', 'fr.gracias': 'Thanks!', 'fr.vamos': "Let's go!", 'fr.wow': 'Wow!',
    'misc.legendary': 'Legendary', 'misc.arena': 'Stadium',
    'ficha.desc': 'Description', 'ficha.stats': 'Stats', 'ficha.moves': 'Moves', 'ficha.evo': 'Evolution line', 'ficha.noEvo': 'Does not evolve.',
    'ficha.ability': 'Ability', 'ficha.specials': 'Specials', 'ficha.learnAt': 'Lv. {n}', 'ficha.learned': 'Learned', 'ficha.evoAt': 'Lv. {n}',
    'ficha.add': 'Add to team', 'ficha.lead': 'Make leader', 'ficha.remove': 'Remove from team', 'ficha.close': 'Close', 'ficha.yours': 'Yours · Lv. {n}',
    'dif.title': 'Is it worth challenging?', 'dif.facil': 'Easy', 'dif.parejo': 'Even', 'dif.dificil': 'Hard', 'dif.muy': 'Very hard',
    'dif.facilTxt': 'Your team is clearly stronger. Go for it!', 'dif.parejoTxt': 'It will be a close fight. Play carefully.',
    'dif.dificilTxt': 'It outclasses you. Level up or bring a type advantage.', 'dif.muyTxt': 'You would lose the fee today. Come back stronger.',
    'dif.counter': 'Weak to: {t}', 'dif.wild': 'Wild', 'dif.you': 'Your team',
    'tuto.offer': 'Shall we learn to play?', 'tuto.offerTxt': 'A 2-minute practice battle against a dummy. You get 200 coins for finishing it.',
    'tuto.start': 'Start tutorial', 'tuto.skip': 'Skip', 'tuto.step': 'Step {n} of {t}', 'tuto.done': 'Tutorial complete!', 'tuto.again': 'Replay tutorial',
    'tuto.mover': 'Move with WASD or the arrow keys (on mobile, with the joystick).',
    'tuto.golpear': 'Face the dummy and hit it 3 times with Space or click. Your attacks go where your Primal faces (the arrow).',
    'tuto.mov': 'Use your first move with key 1. Moves hit harder but have a cooldown.',
    'tuto.esquivar': 'Dodge with Shift: for an instant nothing can hurt you.',
    'tuto.especial': 'Hitting fills your special bar. It is full now! Unleash it with R.',
    'tuto.cambiar': 'Swap Primals with Q / E or by tapping their portrait.',
    'tuto.final': 'Now defeat the dummy! Chain hits (combo) and moves.',
    'amis.title': 'Friendly battle', 'amis.txt': 'Play against a friend. No trophies are won or lost.', 'amis.create': 'Create challenge', 'amis.join': 'Join',
    'amis.code': 'Code', 'amis.share': 'Share on WhatsApp', 'amis.copy': 'Copy link', 'amis.copied': 'Link copied', 'amis.waiting': 'Waiting for your friend',
    'amis.msg': 'I challenge you in Primal Clash! Join here: {u}', 'amis.placeholder': '5-letter code',
    'hud.locked': 'Learned at Lv. {n}', 'hud.capLevel': 'In this league Primals fight at level {n} at most.', 'res.newMove': '{p} learned {m}!',
    'intro.go': 'Start my adventure!', 'intro.tap': 'Tap to continue', 'intro.again': 'Watch the story',
    'mis.title': "Today's missions", 'mis.claim': 'Claim', 'mis.done': 'Claimed', 'mis.new': 'New missions in {t}',
    'bono.title': 'First win of the day', 'bono.txt': 'Your next League win pays DOUBLE coins.', 'bono.got': 'First win of the day! +{n} bonus coins',
    'camino.title': 'Your road to Champion', 'camino.sub': 'Climb the leagues, complete your Primaldex and earn the five legendaries.',
    'camino.dex': 'Primaldex', 'camino.leg': 'Legendaries', 'camino.medals': 'Badges', 'camino.league': 'League',
    'evo.start': 'What? {n} is evolving!', 'evo.done': '{a} evolved into {b}!', 'evo.ability': 'New ability', 'evo.move': 'New move', 'evo.skip': 'Skip',
    'misc.rotate': 'Rotate your phone to play in landscape', 'misc.install': 'Install the app',
    'hud.go': 'GO!', 'hud.superEff': 'Super effective!', 'hud.notEff': 'Not very effective', 'hud.dodged': 'Dodged!',
    'hud.goPrimal': 'Go, {n}!', 'hud.fainted': '{n} fainted!', 'hud.ready': 'Special ready!',
    'st.quemadura': 'Burned', 'st.paralisis': 'Paralyzed', 'st.lento': 'Slowed', 'st.veneno': 'Poisoned',
    'res.win': 'Victory', 'res.lose': 'Defeat', 'res.draw': 'Draw', 'res.caught': 'Caught!',
    'res.time': 'Time is up: the Trainer with more health left wins.', 'res.left': 'Your rival left the battle.', 'res.surrender': 'A Trainer surrendered.',
    'res.trainerXp': '+{n} Trainer XP', 'res.levelUp': 'Trainer level {n}!', 'res.noXp': 'Losses grant no experience. Go get your rematch!',
    'res.evolved': 'Evolved into {n}!', 'res.joined': '{n} joined your team', 'res.continue': 'Continue', 'res.medal': 'New badge: {n}!',
    'res.coins': 'coins', 'res.trophies': 'trophies',
    'misc.loading': 'Loading…', 'misc.level': 'Lv. {n}', 'misc.vsAI': 'Training rival', 'misc.lang': 'Español',
  },
};
export type Clave = keyof typeof T.es;

export function t(k: Clave, vars: Record<string, string | number> = {}): string {
  let s: string = T[idioma][k] ?? T.es[k] ?? k;
  for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, String(b));
  return s;
}

/** Textos fijos del HTML: elementos con data-t="clave". */
export function aplicarHtml() {
  document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t as Clave)));
  document.querySelectorAll<HTMLElement>('[data-tp]').forEach((el) => ((el as HTMLInputElement).placeholder = t(el.dataset.tp as Clave)));
}

// ------------------------------------------------------------------ datos del juego
export const nombreElemento = (e: string) => (idioma === 'en' ? EN.elementos[e] : ELEMENTOS[e as Elemento]?.nombre) ?? e;
export const nombreMov = (id: string) => (idioma === 'en' ? EN.movimientos[id]?.[0] : null) ?? MOVIMIENTOS[id]?.nombre ?? id;
export const descMov = (id: string) => (idioma === 'en' ? EN.movimientos[id]?.[1] : null) ?? MOVIMIENTOS[id]?.desc ?? '';
export const nombreHab = (id: string) => (idioma === 'en' ? EN.habilidades[id]?.[0] : null) ?? HABILIDADES[id]?.nombre ?? id;
export const descHab = (id: string) => (idioma === 'en' ? EN.habilidades[id]?.[1] : null) ?? HABILIDADES[id]?.desc ?? '';
export const descEspecie = (id: string) => (idioma === 'en' ? EN.especies[id] : null) ?? ESPECIES[id]?.desc ?? '';
const todasEspeciales = () => [...Object.values(ESPECIALES), ...Object.values(ESPECIALES_LEGENDARIOS).flat()];
export const nombreEspecialId = (id: string) => (idioma === 'en' ? EN.especiales[id]?.[0] : null) ?? todasEspeciales().find((e) => e.id === id)?.nombre ?? id;
export const descEspecialId = (id: string) => (idioma === 'en' ? EN.especiales[id]?.[1] : null) ?? todasEspeciales().find((e) => e.id === id)?.desc ?? '';
/** Técnica especial k (0 o 1) de una especie. */
export const nombreEspecial = (esp: string, k = 0) => nombreEspecialId(especialesDe(esp)[k]?.id ?? '');
export const descEspecial = (esp: string, k = 0) => descEspecialId(especialesDe(esp)[k]?.id ?? '');
export const textoMision = (id: string, meta: number) => ((idioma === 'en' ? EN.misiones[id] : null) ?? MISIONES.find((m) => m.id === id)?.texto ?? id).replace('{n}', String(meta));
export const nombreRareza = (r: string) => (idioma === 'en' ? EN.rarezas[r] : null) ?? RAREZAS[r as Rareza]?.nombre ?? r;
export const nombreArena = (liga: string) => (idioma === 'en' ? EN.arenas[liga] : null) ?? LIGAS.find((l) => l.id === liga)?.arena ?? liga;
export const nombreLiga = (id: string) => (idioma === 'en' ? EN.ligas[id] : null) ?? LIGAS.find((l) => l.id === id)?.nombre ?? id;
export const medalla = (id: string) => { const m = MEDALLAS.find((x) => x.id === id)!; return idioma === 'en' ? { nombre: EN.medallas[id][0], desc: EN.medallas[id][1] } : { nombre: m.nombre, desc: m.desc }; };
export const habDomador = (id: string) => { const h = HABILIDADES_DOMADOR.find((x) => x.id === id)!; return idioma === 'en' ? { nombre: EN.habDomador[id][0], desc: EN.habDomador[id][1] } : { nombre: h.nombre, desc: h.desc }; };

/** Errores del servidor (llegan en español): se traducen al inglés cuando hace falta. */
const ERR: [RegExp, string][] = [
  [/^Demasiados intentos/, 'Too many attempts. Wait a minute.'],
  [/^El nombre debe tener/, 'Your name must be 3 to 16 letters or numbers.'],
  [/^La contraseña debe/, 'Your password must be at least 6 characters.'],
  [/^Ese nombre ya está en uso/, 'That name is already taken.'],
  [/^Usuario o contraseña incorrectos/, 'Wrong name or password.'],
  [/^Sesión no válida/, 'Your session expired. Log in again.'],
  [/^Primero elige tu Primal inicial/, 'Choose your starter Primal first.'],
  [/^Ya elegiste/, 'You already chose your starter.'],
  [/^Tu equipo necesita al menos un Primal/, 'Your team needs at least one Primal.'],
  [/^Esa habilidad ya está al máximo/, 'That skill is already maxed out.'],
  [/^No tienes puntos de habilidad/, 'No skill points left. Level up by winning battles.'],
  [/^Necesitas ser Entrenador de nivel (\d+)/, 'You need to be a level $1 Trainer.'],
  [/^Necesitas (\d+) monedas/, 'You need $1 coins.'],
  [/^Error de conexión/, 'Connection error.'],
  [/^Tu equipo está lleno/, 'Your team is full (3). Remove one first.'],
  [/^Ya elegiste a tus Primales/, 'You already chose your starters.'],
  [/^Elige 3 Primales iniciales/, 'Choose 3 different starters.'],
  [/^Primero elige tus Primales iniciales/, 'Choose your starters first.'],
  [/^Solo puedes llevar un legendario/, 'You can only bring one legendary per battle.'],
  [/^Este legendario no aparece hoy/, 'This legendary does not appear today. Come back another day.'],
  [/^Ese código no existe/, 'That code does not exist or has expired.'],
  [/^No puedes retarte a ti mismo/, 'You cannot challenge yourself.'],
  [/^Reto cancelado/, 'Challenge cancelled.'],
];
export function tError(msg: string) {
  if (idioma === 'es') return msg;
  for (const [re, out] of ERR) if (re.test(msg)) return msg.replace(re, out).replace(/\.\s*$/, '.');
  return msg;
}
