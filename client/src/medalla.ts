// Ceremonia de la medalla (Modo Historia): pantalla completa con rayos de luz del elemento, la medalla
// que cae girando en 3D, un estallido al aterrizar, su nombre letra por letra y el estuche de medallas.

import { ELEMENTOS, GIMNASIOS, MEDALLAS, type Elemento } from '../../shared/src';
import { retrato } from './avatar';
import { bi, medalla, t } from './i18n';
import { icono } from './iconos';
import { esc } from './menu';
import { fanfarria } from './musica';

const EL: Record<string, Elemento> = { brasa: 'fuego', oleaje: 'agua', brote: 'planta', voltio: 'electrico', roca: 'roca', vendaval: 'viento', umbral: 'sombra', nevado: 'hielo' };

/** Muestra la ceremonia y se resuelve cuando el jugador toca para continuar. */
export function ceremoniaMedalla(id: string, tengo: string[]): Promise<void> {
  const el = EL[id] ?? 'luz';
  const c = ELEMENTOS[el].color;
  const g = GIMNASIOS.find((x) => x.medalla === id);
  const nombre = medalla(id).nombre;
  const letras = [...nombre.toUpperCase()].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  const chispas = Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2, d = 160 + Math.random() * 220;
    return `<i style="--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--d:${(Math.random() * 0.25).toFixed(2)}s;--s:${(0.6 + Math.random()).toFixed(2)}"></i>`;
  }).join('');
  const estuche = MEDALLAS.map((m, i) => {
    const nueva = m.id === id, ok = tengo.includes(m.id) || nueva;
    return `<div class="mc-slot ${ok ? 'ok' : ''} ${nueva ? 'nueva' : ''}" style="--c:${ELEMENTOS[EL[m.id]].color};--i:${i}">${ok ? icono(EL[m.id]) : ''}</div>`;
  }).join('');
  const capa = document.createElement('div');
  capa.className = 'med-cer';
  capa.style.setProperty('--c', c);
  capa.innerHTML = `
    <div class="mc-rayos"></div><div class="mc-flash"></div>
    <div class="mc-escena">
      <div class="mc-medalla"><div class="mc-cara">
        <div class="mc-aro"></div><div class="mc-centro">${icono(el)}</div><div class="mc-brillo"></div>
      </div><div class="mc-cara atras"></div></div>
      <div class="mc-chispas">${chispas}</div>
    </div>
    <div class="mc-texto">
      <small>${t('med.got')}</small>
      <h1>${letras}</h1>
      ${g ? `<p>${retrato({ modelo: 0, lider: g.id }, '')}<span>${esc(t('med.from', { n: g.nombre, l: bi(g.lugar) }))}</span></p>` : ''}
      <div class="mc-estuche">${estuche}</div>
      <em>${t('med.bonus', { n: tengo.length + 1 })}</em>
    </div>
    <div class="mc-toca">${t('intro.tap')}</div>`;
  document.body.appendChild(capa);
  fanfarria('victoria', 'menu');
  return new Promise((ok) => {
    let listo = false;
    setTimeout(() => { listo = true; capa.classList.add('listo'); }, 2600);
    capa.onclick = () => {
      if (!listo) return;
      capa.classList.add('fuera');
      setTimeout(() => { capa.remove(); ok(); }, 450);
    };
  });
}
