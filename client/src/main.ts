// Primal Clash: flujo principal (entrar -> elegir inicial -> menú -> batallas).

import Phaser from 'phaser';
import { ESPECIES, MEDALLAS, type FinBatalla, type InicioBatalla, type Perfil } from '../../shared/src';
import { api, getToken, setToken, spriteUrl } from './api';
import { BatallaScene } from './battle';
import { Menu, pantallaInicial, toast } from './menu';
import { Conexion } from './net';

const $ = (id: string) => document.getElementById(id)!;
const menu = new Menu();
let game: Phaser.Game | null = null;
let conexion: Conexion | null = null;

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
      $('login-error').textContent = e.message;
    }
  };
  $('btn-login').onclick = () => void go(false);
  $('btn-register').onclick = () => void go(true);
  ($('login-pass') as HTMLInputElement).onkeydown = (e) => { if (e.key === 'Enter') void go(false); };
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
  if (!p.primales.length) return pantallaInicial((np) => { menu.setPerfil(np); menu.open(); toast(`¡${ESPECIES[np.primales[0].esp].nombre} se une a ti!`); });
  menu.open();
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
        type: Phaser.AUTO, parent: 'game', backgroundColor: '#161029', pixelArt: true,
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
    toast(e.message ?? 'No se pudo entrar a la batalla.');
    menu.open();
  }
};

async function terminar(r: FinBatalla) {
  const sc = game?.scene.getScene('batalla') as BatallaScene | undefined;
  sc?.cerrar();
  game?.scene.stop('batalla');
  await conexion?.salir();
  const titulo = r.empate ? '¡EMPATE!' : r.gano ? (r.capturado ? '¡CAPTURADO!' : '¡VICTORIA!') : 'DERROTA';
  const motivos: Record<string, string> = { tiempo: 'Se acabó el tiempo: gana quien tenga más vida.', abandono: 'Un Domador abandonó la batalla.', rendicion: 'Un Domador se rindió.', ko: '' };
  const xp = r.xpPrimales.map((x) => `<div><img src="${spriteUrl(x.evoluciono ?? x.esp)}"><span><b>${ESPECIES[x.esp].nombre}</b> +${x.xp} exp · nv. ${x.nivel}${x.subio ? ` <b class="evo">(+${x.subio})</b>` : ''}
    ${x.evoluciono ? `<br><span class="evo">✨ ¡Evolucionó a ${ESPECIES[x.evoluciono].nombre}!</span>` : ''}</span></div>`).join('');
  const med = r.medallasNuevas.map((id) => MEDALLAS.find((m) => m.id === id)!).map((m) => `<div class="pill gold">${m.icono} ¡${m.nombre}!</div>`).join('');
  $('result-body').innerHTML = `
    <div class="result-title ${r.gano ? 'win' : 'lose'}">${titulo}</div>
    ${motivos[r.motivo] ? `<p class="muted">${motivos[r.motivo]}</p>` : ''}
    ${r.capturado ? `<img src="${spriteUrl(r.capturado)}" style="height:120px;image-rendering:pixelated"><p>¡${ESPECIES[r.capturado].nombre} se unió a tu equipo!</p>` : ''}
    <div class="rewards">
      ${r.trofeos ? `<div class="pill">🏆 ${r.trofeos > 0 ? '+' : ''}${r.trofeos}</div>` : ''}
      ${r.monedas ? `<div class="pill gold">🪙 +${r.monedas}</div>` : ''}
      <div class="pill">⭐ +${r.xpDomador} exp de Domador</div>
      ${r.subioDomador ? `<div class="pill gold">🎉 ¡Domador nivel ${r.nivelDomador}!</div>` : ''}
    </div>
    ${med ? `<div class="rewards">${med}</div>` : ''}
    <div class="xp-list">${xp}</div>
    <button class="primary big" id="btn-continuar">Continuar</button>`;
  $('result').classList.remove('hidden');
  $('btn-continuar').onclick = async () => {
    $('result').classList.add('hidden');
    menu.setPerfil(await api.perfil());
    menu.open();
  };
}

if (getToken()) void arrancar();
else mostrarLogin();
