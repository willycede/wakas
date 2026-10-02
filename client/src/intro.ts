// Historia de entrada (la primera vez): por qué jugar. Cuatro escenas cortas con texto que se
// escribe solo, Primales en escena y el tema épico de fondo. Se puede saltar.

import { ESPECIES, LEGENDARIOS, LIGAS } from '../../shared/src';
import { spriteUrl } from './api';
import { idioma, t } from './i18n';
import { emblemaLiga } from './iconos';
import { tocar } from './musica';

const $ = (id: string) => document.getElementById(id)!;

const ESCENAS = {
  es: [
    'Hace siglos, los Primales dormían bajo los volcanes, las selvas y los mares de Ecuador.',
    'Hoy han despertado. Y con ellos nació la Liga Primal: Entrenadores de todo el mundo compiten por demostrar quién es el mejor.',
    'Cinco legendarios vigilan desde lo más alto. Solo los Entrenadores más fuertes podrán enfrentarlos… y ganarse su respeto.',
    'Tu misión: forma el mejor equipo, sube desde la Liga Bronce hasta la Mitad del Mundo y conviértete en el Campeón de la Liga Primal.',
  ],
  en: [
    'Centuries ago, the Primals slept beneath the volcanoes, jungles and seas of Ecuador.',
    'Now they have awakened. And with them came the Primal League: Trainers from all over the world compete to prove who is the best.',
    'Five legendaries watch from the highest peaks. Only the strongest Trainers will be able to face them… and earn their respect.',
    'Your mission: build the best team, climb from the Bronze League to the Middle of the World and become the Primal League Champion.',
  ],
};

function arte(i: number) {
  const img = (id: string, cls = '') => `<img class="in-spr ${cls}" src="${spriteUrl(id)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'), { className: 'in-orbe' }))">`;
  if (i === 0) return `<div class="in-grupo dormidos">${['tungurex', 'yakuaron', 'galapagon', 'cacaotor'].map((x) => img(x)).join('')}</div>`;
  if (i === 1) return `<div class="in-grupo">${['tunguri', 'yakupi', 'quindito', 'chispez', 'chusik'].map((x, k) => img(x, `salta s${k}`)).join('')}</div>`;
  if (i === 2) return `<div class="in-grupo legendarios">${LEGENDARIOS.map((x) => `<div class="in-leg">${img(x, 'silueta')}<span>${ESPECIES[x].nombre}</span></div>`).join('')}</div>`;
  return `<div class="in-ligas">${LIGAS.map((l, k) => `<div class="in-liga" style="--k:${k}">${emblemaLiga(l.color, k, 64)}</div>`).join('')}</div>`;
}

/** Muestra la historia; se resuelve al terminar o al saltarla. */
export function mostrarIntro(): Promise<void> {
  return new Promise((fin) => {
    const el = $('intro');
    const textos = ESCENAS[idioma];
    let i = -1;
    let escribiendo: ReturnType<typeof setInterval> | null = null;
    tocar('legendario', 0);
    const cerrar = () => {
      if (escribiendo) clearInterval(escribiendo);
      el.classList.add('hidden');
      el.innerHTML = '';
      tocar('menu');
      fin();
    };
    const siguiente = () => {
      // si el texto aún se escribe, el toque lo completa
      const p = el.querySelector<HTMLElement>('.in-texto');
      if (escribiendo && p) { clearInterval(escribiendo); escribiendo = null; p.textContent = textos[i]; return; }
      i++;
      if (i >= textos.length) return cerrar();
      const ultima = i === textos.length - 1;
      el.innerHTML = `
        <div class="in-fondo f${i}"></div>
        <button class="in-saltar">${t('evo.skip')}</button>
        <div class="in-escena">${arte(i)}</div>
        <p class="in-texto"></p>
        <div class="in-pie">
          <div class="in-puntos">${textos.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'ok' : ''}"></i>`).join('')}</div>
          ${ultima ? `<button class="btn primary big in-ya">${t('intro.go')}</button>` : `<span class="in-toca">${t('intro.tap')}</span>`}
        </div>`;
      el.querySelector<HTMLElement>('.in-saltar')!.onclick = (ev) => { ev.stopPropagation(); cerrar(); };
      el.querySelector<HTMLElement>('.in-ya')?.addEventListener('click', (ev) => { ev.stopPropagation(); cerrar(); });
      // texto que se escribe letra a letra
      const pt = el.querySelector<HTMLElement>('.in-texto')!;
      let n = 0;
      escribiendo = setInterval(() => {
        n += 2;
        pt.textContent = textos[i].slice(0, n);
        if (n >= textos[i].length && escribiendo) { clearInterval(escribiendo); escribiendo = null; }
      }, 28);
    };
    el.classList.remove('hidden');
    el.onclick = siguiente;
    siguiente();
  });
}
