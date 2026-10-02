// Primal Clash: flujo principal (entrar -> elegir inicial -> menú -> batallas).

import Phaser from 'phaser';
import { DESBLOQUEO, ESPECIES, xpPrimal, type FinBatalla, type InicioBatalla, type Perfil } from '../../shared/src';
import { dialogo } from './ficha';
import { mostrarEvoluciones } from './evolucion';
import { alternarMusica, fanfarria, musicaActiva, tocar } from './musica';
import { nombreMov } from './i18n';
import { api, getToken, setToken, spriteUrl } from './api';
import { BatallaScene } from './battle';
import { alCambiarIdioma, aplicarHtml, cambiarIdioma, idioma, medalla, t, tError } from './i18n';
import { icono } from './iconos';
import { Menu, esc, pantallaInicial, toast } from './menu';
import { Conexion } from './net';

const $ = (id: string) => document.getElementById(id)!;
const menu = new Menu();
let game: Phaser.Game | null = null;
let conexion: Conexion | null = null;
let repintarInicial: (() => void) | null = null;

// iconos fijos del HTML y botones de idioma
document.querySelectorAll<HTMLElement>('i[data-ic]').forEach((el) => (el.outerHTML = icono(el.dataset.ic!)));
function pintarIdioma() {
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => {
    b.innerHTML = `${icono('idioma')}${t('misc.lang')}`;
    b.onclick = () => cambiarIdioma(idioma === 'es' ? 'en' : 'es');
  });
}
alCambiarIdioma(() => {
  pintarIdioma();
  menu.refrescar();
  repintarInicial?.();
  (game?.scene.getScene('batalla') as BatallaScene | undefined)?.refrescarIdioma?.();
});
// botón de música (se recuerda en el navegador)
function pintarMusica() {
  const b = $('btn-musica');
  b.innerHTML = icono(musicaActiva() ? 'musica' : 'silencio');
  b.classList.toggle('apagado', !musicaActiva());
  b.onclick = () => { alternarMusica(); pintarMusica(); };
}
pintarMusica();
tocar('menu');
document.documentElement.lang = idioma;
aplicarHtml();
pintarIdioma();

function mostrarLogin() {
  $('login').classList.remove('hidden');
  const go = async (registro: boolean) => {
    const u = ($('login-user') as HTMLInputElement).value.trim();
    const c = ($('login-pass') as HTMLInputElement).value;
    $('login-error').textContent = '';
    try {
      const r = registro ? await api.registro(u, c) : await api.entrar(u, c);
      setToken(r.token);
      $('login').classList.add('hidden');
      await arrancar();
    } catch (e: any) {
      $('login-error').textContent = tError(e.message);
    }
  };
  $('btn-login').onclick = () => void go(false);
  $('btn-register').onclick = () => void go(true);
  ($('login-pass') as HTMLInputElement).onkeydown = (e) => { if (e.key === 'Enter') void go(false); };
}

/** Primera vez: ofrece el tutorial (se puede saltar y repetir desde la pestaña Entrenador). */
function ofrecerTutorial() {
  dialogo(t('tuto.offer'), t('tuto.offerTxt'), [
    { texto: t('tuto.start'), clase: 'primary big', fn: () => void empezarTutorial() },
    { texto: t('tuto.skip'), clase: 'ghost', fn: () => void api.saltarTutorial().then((p) => menu.setPerfil(p)) },
  ]);
}
async function empezarTutorial() {
  try { const r = await api.tutorial(); await menu.onBatalla(r.roomId); } catch (e: any) { toast(e.message, true); }
}
menu.onTutorial = () => void empezarTutorial();
(window as any).__evo = mostrarEvoluciones; // para depurar

/** Enlace de reto amistoso (?reto=CÓDIGO): entra directo a la batalla. */
function retoPendiente() {
  const c = new URLSearchParams(location.search).get('reto');
  if (!c) return false;
  history.replaceState(null, '', location.pathname);
  void menu.unirseReto(c);
  return true;
}

async function arrancar() {
  let p: Perfil;
  try {
    p = await api.perfil();
  } catch {
    setToken(null);
    return mostrarLogin();
  }
  menu.setPerfil(p);
  if (!p.primales.length) {
    repintarInicial = pantallaInicial((np) => {
      repintarInicial = null;
      menu.setPerfil(np);
      menu.open();
      toast(t('starter.joined'));
      if (!retoPendiente()) ofrecerTutorial();
    });
    return;
  }
  menu.open();
  if (!retoPendiente() && !p.tutorial) ofrecerTutorial();
}

menu.onBatalla = async (roomId) => {
  $('loading').classList.remove('hidden');
  try {
    conexion = new Conexion();
    await conexion.unirse(roomId, getToken()!);
    const init = await conexion.esperar<InicioBatalla>('inicio');
    menu.close();
    $('loading').classList.add('hidden');
    if (!game) {
      game = new Phaser.Game({
        type: Phaser.AUTO, parent: 'game', backgroundColor: '#0f0b1e', pixelArt: true,
        scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
        scene: [],
      });
      game.scene.add('batalla', BatallaScene, false);
      (window as any).__pc = game; // para depurar
      await new Promise((r) => game!.events.once('ready', r));
    }
    game.scene.start('batalla', { net: conexion, init });
    const sc = game.scene.getScene('batalla') as BatallaScene;
    sc.onFin = (r: FinBatalla) => void terminar(r);
  } catch (e: any) {
    $('loading').classList.add('hidden');
    toast(e.message ?? 'Error de conexión', true);
    menu.open();
  }
};

async function terminar(r: FinBatalla) {
  const sc = game?.scene.getScene('batalla') as BatallaScene | undefined;
  sc?.cerrar();
  game?.scene.stop('batalla');
  await conexion?.salir();
  // primero, la pantalla de evolución de cada Primal que evolucionó
  const evos = r.xpPrimales.filter((x) => x.evoluciono).map((x) => ({ de: x.esp, a: x.evoluciono!, nivel: x.nivel }));
  if (evos.length) await mostrarEvoluciones(evos);
  fanfarria(r.gano ? 'victoria' : 'derrota', 'menu');
  const clase = r.empate ? 'draw' : r.gano ? 'win' : 'lose';
  const titulo = r.empate ? t('res.draw') : r.gano ? (r.capturado ? t('res.caught') : t('res.win')) : t('res.lose');
  const motivo = r.motivo === 'tiempo' ? t('res.time') : r.motivo === 'abandono' ? (r.gano ? t('res.left') : '') : r.motivo === 'rendicion' ? t('res.surrender') : '';
  const recompensa = (cls: string, ic: string, valor: string, etiqueta: string) =>
    `<div class="reward ${cls}">${icono(ic)}<b>${valor}</b><small>${etiqueta}</small></div>`;
  const xp = r.xpPrimales.map((x) => {
    const espFinal = x.evoluciono ?? x.esp;
    return `<div class="xp-row"><img src="${spriteUrl(espFinal)}" alt="">
      <div><b>${ESPECIES[espFinal].nombre}</b> <span class="muted">${t('misc.level', { n: x.nivel })}</span>
        ${x.subio ? `<span class="up">${x.evoluciono ? t('res.evolved', { n: ESPECIES[x.evoluciono].nombre }) : `▲ +${x.subio} ${t('misc.level', { n: '' }).trim()}`}</span>` : ''}
        <div class="lvbar"><div style="width:0%" data-w="${Math.min(100, (x.xp / Math.max(1, xpPrimal(x.nivel))) * 100)}"></div></div></div>
      <span class="gain">+${x.xp} XP</span></div>`;
  }).join('');
  // movimientos nuevos aprendidos al subir de nivel
  const aprendidos = r.xpPrimales.flatMap((x) => {
    const esp = x.evoluciono ?? x.esp, antes = x.nivel - x.subio;
    return DESBLOQUEO.map((nv, i) => (antes < nv && x.nivel >= nv && i > 0 ? `<div class="banner-line">${icono('estrella')}${esc(t('res.newMove', { p: ESPECIES[esp].nombre, m: nombreMov(ESPECIES[esp].movimientos[i]) }))}</div>` : '')).filter(Boolean);
  }).join('');
  const medallas = r.medallasNuevas.map((id) => `<div class="banner-line">${icono('medalla')}${esc(t('res.medal', { n: medalla(id).nombre }))}</div>`).join('');
  const panel = $('result-body');
  panel.style.setProperty('--glow', r.gano ? 'rgba(255,201,64,.35)' : r.empate ? 'rgba(120,180,255,.3)' : 'rgba(150,120,220,.22)');
  panel.innerHTML = `
    <div class="result-title ${clase}">${titulo}</div>
    ${motivo ? `<p class="result-reason">${motivo}</p>` : ''}
    ${r.capturado ? `<div class="caught"><img src="${spriteUrl(r.capturado)}" alt=""><p><b>${t('res.joined', { n: ESPECIES[r.capturado].nombre })}</b></p></div>` : ''}
    <div class="rewards">
      ${r.trofeos ? recompensa(`trophy ${r.trofeos < 0 ? 'neg' : ''}`, 'trofeo', `${r.trofeos > 0 ? '+' : ''}${r.trofeos}`, t('res.trophies')) : ''}
      ${r.monedas ? recompensa('coin', 'moneda', `+${r.monedas}`, t('res.coins')) : ''}
      ${r.xpDomador ? recompensa('xp', 'estrella', `+${r.xpDomador}`, 'XP') : ''}
    </div>
    ${r.subioDomador ? `<div class="banner-line">${icono('crecer')}${t('res.levelUp', { n: r.nivelDomador })}</div>` : ''}
    ${medallas}${aprendidos}
    ${!r.gano && !r.empate ? `<div class="banner-line info">${t('res.noXp')}</div>` : ''}
    ${xp ? `<div class="xp-list">${xp}</div>` : ''}
    <button class="btn primary big" id="btn-continuar">${t('res.continue')}</button>`;
  $('result').classList.remove('hidden');
  // las barras de experiencia se llenan con animación
  requestAnimationFrame(() => requestAnimationFrame(() => panel.querySelectorAll<HTMLElement>('[data-w]').forEach((el) => {
    el.style.transition = 'width .9s cubic-bezier(.2,.8,.2,1)';
    el.style.width = `${el.dataset.w}%`;
  })));
  $('btn-continuar').onclick = async () => {
    $('result').classList.add('hidden');
    menu.setPerfil(await api.perfil());
    menu.open();
  };
}

// se puede instalar como app (Android: "Añadir a pantalla de inicio")
if ('serviceWorker' in navigator) window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));

if (getToken()) void arrancar();
else mostrarLogin();
