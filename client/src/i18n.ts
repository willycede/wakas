// Idiomas: español e inglés. El idioma se guarda en el navegador.

import { EN, ELEMENTOS, ESPECIALES, ESPECIALES_LEGENDARIOS, ESPECIES, HABILIDADES, HABILIDADES_DOMADOR, LIGAS, MEDALLAS, MOVIMIENTOS, RAREZAS, especialesDe, type Elemento, type Rareza } from '../../shared/src';

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
    'login.user': 'Nombre de Domador',
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
    'tab.team': 'Equipo', 'tab.capture': 'Capturar', 'tab.battle': 'Batalla', 'tab.trainer': 'Domador', 'tab.ranking': 'Ranking',
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
    'capture.legendNext': 'Mañana aparece {n}', 'capture.legendLocked': 'Aparece otro día', 'capture.req': 'Domador nv. {n}', 'capture.wild': 'Salvaje nv. {n}', 'capture.go': 'Retar', 'capture.owned': 'Capturado', 'capture.locked': 'Bloqueado',
    'trainer.level': 'Domador · nivel {n}', 'trainer.medals': 'Medallas', 'trainer.medalsHint': 'Cada medalla da +3% de experiencia a tus Primales.',
    'trainer.skills': 'Habilidades de Domador', 'trainer.points': '{n} puntos disponibles', 'trainer.points1': '1 punto disponible', 'trainer.points0': 'Sin puntos: sube de nivel ganando batallas',
    'trainer.lv': 'Nv.', 'trainer.upgrade': 'Mejorar', 'trainer.max': 'Máx.',
    'ranking.title': 'Ranking mundial', 'ranking.you': 'Tú',
    'key.space': 'Espacio', 'hud.basic': 'Básico', 'hud.dodge': 'Esquivar', 'hud.special': 'Especial', 'hud.combo': 'COMBO', 'hud.link': '¡ENLACE! +30%',
    'hud.help': 'Mover: WASD o clic derecho · Atacar: Espacio o clic · Movimientos: 1-4 · Especial: R (y T) · Esquivar: Shift · Cambiar: Q/E o rueda · Emotes: C',
    'hud.emotes': 'Emotes', 'hud.mute': 'Silenciar al rival', 'hud.unmute': 'Ver emotes del rival', 'hud.muted': 'Rival silenciado',
    'fr.gg': 'GG', 'fr.bien': '¡Bien jugado!', 'fr.ups': '¡Ups!', 'fr.gracias': '¡Gracias!', 'fr.vamos': '¡Vamos!', 'fr.wow': '¡Wow!',
    'misc.legendary': 'Legendario', 'misc.arena': 'Estadio',
    'hud.go': '¡YA!', 'hud.superEff': '¡Muy eficaz!', 'hud.notEff': 'Poco eficaz', 'hud.dodged': '¡Esquivado!',
    'hud.goPrimal': '¡Adelante, {n}!', 'hud.fainted': '¡{n} se debilitó!', 'hud.ready': '¡Especial lista!',
    'st.quemadura': 'Quemado', 'st.paralisis': 'Paralizado', 'st.lento': 'Ralentizado', 'st.veneno': 'Envenenado',
    'res.win': 'Victoria', 'res.lose': 'Derrota', 'res.draw': 'Empate', 'res.caught': '¡Capturado!',
    'res.time': 'Se acabó el tiempo: gana quien conserva más vida.', 'res.left': 'Tu rival abandonó la batalla.', 'res.surrender': 'Un Domador se rindió.',
    'res.trainerXp': '+{n} exp. de Domador', 'res.levelUp': '¡Domador nivel {n}!', 'res.noXp': 'Las derrotas no dan experiencia. ¡A por la revancha!',
    'res.evolved': '¡Evolucionó a {n}!', 'res.joined': '{n} se unió a tu equipo', 'res.continue': 'Continuar', 'res.medal': '¡Nueva medalla: {n}!',
    'res.coins': 'monedas', 'res.trophies': 'trofeos',
    'misc.loading': 'Cargando…', 'misc.level': 'Nv. {n}', 'misc.vsAI': 'Rival de entrenamiento', 'misc.lang': 'English',
  },
  en: {
    'login.tagline': 'The worldwide Primal League',
    'login.user': 'Tamer name',
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
    'tab.team': 'Team', 'tab.capture': 'Capture', 'tab.battle': 'Battle', 'tab.trainer': 'Tamer', 'tab.ranking': 'Ranking',
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
    'capture.legendNext': 'Tomorrow: {n}', 'capture.legendLocked': 'Appears another day', 'capture.req': 'Tamer Lv. {n}', 'capture.wild': 'Wild Lv. {n}', 'capture.go': 'Challenge', 'capture.owned': 'Caught', 'capture.locked': 'Locked',
    'trainer.level': 'Tamer · level {n}', 'trainer.medals': 'Badges', 'trainer.medalsHint': 'Each badge gives your Primals +3% experience.',
    'trainer.skills': 'Tamer skills', 'trainer.points': '{n} points available', 'trainer.points1': '1 point available', 'trainer.points0': 'No points left: level up by winning battles',
    'trainer.lv': 'Lv.', 'trainer.upgrade': 'Upgrade', 'trainer.max': 'Max',
    'ranking.title': 'World ranking', 'ranking.you': 'You',
    'key.space': 'Space', 'hud.basic': 'Basic', 'hud.dodge': 'Dodge', 'hud.special': 'Special', 'hud.combo': 'COMBO', 'hud.link': 'LINK! +30%',
    'hud.help': 'Move: WASD or right-click · Attack: Space or click · Moves: 1-4 · Special: R (and T) · Dodge: Shift · Swap: Q/E or wheel · Emotes: C',
    'hud.emotes': 'Emotes', 'hud.mute': 'Mute rival', 'hud.unmute': 'Show rival emotes', 'hud.muted': 'Rival muted',
    'fr.gg': 'GG', 'fr.bien': 'Well played!', 'fr.ups': 'Oops!', 'fr.gracias': 'Thanks!', 'fr.vamos': "Let's go!", 'fr.wow': 'Wow!',
    'misc.legendary': 'Legendary', 'misc.arena': 'Stadium',
    'hud.go': 'GO!', 'hud.superEff': 'Super effective!', 'hud.notEff': 'Not very effective', 'hud.dodged': 'Dodged!',
    'hud.goPrimal': 'Go, {n}!', 'hud.fainted': '{n} fainted!', 'hud.ready': 'Special ready!',
    'st.quemadura': 'Burned', 'st.paralisis': 'Paralyzed', 'st.lento': 'Slowed', 'st.veneno': 'Poisoned',
    'res.win': 'Victory', 'res.lose': 'Defeat', 'res.draw': 'Draw', 'res.caught': 'Caught!',
    'res.time': 'Time is up: the Tamer with more health left wins.', 'res.left': 'Your rival left the battle.', 'res.surrender': 'A Tamer surrendered.',
    'res.trainerXp': '+{n} Tamer XP', 'res.levelUp': 'Tamer level {n}!', 'res.noXp': 'Losses grant no experience. Go get your rematch!',
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
  [/^Necesitas ser Domador de nivel (\d+)/, 'You need to be a level $1 Tamer.'],
  [/^Necesitas (\d+) monedas/, 'You need $1 coins.'],
  [/^Error de conexión/, 'Connection error.'],
  [/^Tu equipo está lleno/, 'Your team is full (3). Remove one first.'],
  [/^Ya elegiste a tus Primales/, 'You already chose your starters.'],
  [/^Elige 3 Primales iniciales/, 'Choose 3 different starters.'],
  [/^Primero elige tus Primales iniciales/, 'Choose your starters first.'],
  [/^Solo puedes llevar un legendario/, 'You can only bring one legendary per battle.'],
  [/^Este legendario no aparece hoy/, 'This legendary does not appear today. Come back another day.'],
];
export function tError(msg: string) {
  if (idioma === 'es') return msg;
  for (const [re, out] of ERR) if (re.test(msg)) return msg.replace(re, out).replace(/\.\s*$/, '.');
  return msg;
}
