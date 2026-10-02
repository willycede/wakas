// Pantalla de evolución: el Primal brilla, parpadea entre su silueta vieja y la nueva cada vez más
// rápido, estalla en luz y aparece su nueva forma con la mejora de estadísticas y lo que gana.

import { DESBLOQUEO, ELEMENTOS, ESPECIES, MOVIMIENTOS, statsPrimal, tipos } from '../../shared/src';
import { spriteUrl } from './api';
import { icono } from './iconos';
import { descHab, nombreElemento, nombreHab, nombreMov, t } from './i18n';
import { esc, rarezaTag } from './menu';

const $ = (id: string) => document.getElementById(id)!;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Evolucion { de: string; a: string; nivel: number }

/** Muestra las evoluciones una tras otra; se resuelve cuando el jugador termina de verlas. */
export async function mostrarEvoluciones(lista: Evolucion[]) {
  for (const e of lista) await una(e);
}

function una({ de, a, nivel }: Evolucion): Promise<void> {
  return new Promise((fin) => {
    const el = $('evolucion');
    const viejo = ESPECIES[de], nuevo = ESPECIES[a];
    const c = ELEMENTOS[nuevo.elemento].color;
    const s0 = statsPrimal(viejo, nivel), s1 = statsPrimal(nuevo, nivel);
    const fila = (k: Parameters<typeof t>[0], v0: number, v1: number, max: number) => `
      <div class="ev-stat"><span>${t(k)}</span>
        <div class="bar"><div class="b0" style="width:${Math.min(100, (v0 / max) * 100)}%"></div><div class="b1" style="--w:${Math.min(100, (v1 / max) * 100)}%"></div></div>
        <b>${v1}</b><em>+${v1 - v0}</em></div>`;
    const movsNuevos = nuevo.movimientos.filter((m, i) => !viejo.movimientos.includes(m) && (nuevo.rareza === 'legendario' || nivel >= DESBLOQUEO[i]));
    const tiposNuevos = tipos(a).filter((x) => !tipos(de).includes(x));
    el.style.setProperty('--c', c);
    el.innerHTML = `
      <div class="ev-rayos"></div>
      <div class="ev-texto" id="ev-texto">${t('evo.start', { n: viejo.nombre })}</div>
      <div class="ev-escena">
        <div class="ev-halo"></div>
        <img class="ev-spr ev-viejo" src="${spriteUrl(de)}" alt="">
        <img class="ev-spr ev-nuevo" src="${spriteUrl(a)}" alt="">
        <div class="ev-flash"></div>
        <div class="ev-chispas">${Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg;--d:${120 + (i % 3) * 40}px"></i>`).join('')}</div>
      </div>
      <div class="ev-info">
        <div class="ev-nombre">${rarezaTag(a)}<h2>${nuevo.nombre}</h2>
          <div class="tipos">${tipos(a).map((x) => `<span class="el ${tiposNuevos.includes(x) ? 'nuevo' : ''}" style="--c:${ELEMENTOS[x].color}">${icono(x)}${nombreElemento(x)}</span>`).join('')}</div></div>
        <div class="ev-stats">
          ${fila('stat.hp', s0.vida, s1.vida, Math.max(s1.vida, 1) * 1.15)}${fila('stat.atk', s0.ataque, s1.ataque, s1.ataque * 1.15)}
          ${fila('stat.def', s0.defensa, s1.defensa, s1.defensa * 1.15)}${fila('stat.spd', viejo.base.velocidad, nuevo.base.velocidad, Math.max(nuevo.base.velocidad, viejo.base.velocidad) * 1.15)}
        </div>
        <div class="ev-extras">
          ${nuevo.habilidad !== viejo.habilidad ? `<div class="ev-extra">${icono('estrella')}<div><small>${t('evo.ability')}</small><b>${esc(nombreHab(nuevo.habilidad))}</b><span>${esc(descHab(nuevo.habilidad))}</span></div></div>` : ''}
          ${movsNuevos.map((m) => `<div class="ev-extra" style="--m:${ELEMENTOS[MOVIMIENTOS[m].elemento].color}">${icono(MOVIMIENTOS[m].tipo)}<div><small>${t('evo.move')}</small><b>${esc(nombreMov(m))}</b></div></div>`).join('')}
        </div>
        <button class="btn primary big" id="ev-ok">${t('res.continue')}</button>
      </div>
      <button class="ev-saltar" id="ev-saltar">${t('evo.skip')}</button>`;
    el.className = 'ev';
    el.classList.remove('hidden');
    let saltado = false;
    const revelar = () => {
      if (el.classList.contains('revelado')) return;
      el.classList.remove('cambiando');
      el.classList.add('revelado');
      $('ev-texto').innerHTML = t('evo.done', { a: viejo.nombre, b: `<b>${nuevo.nombre}</b>` });
    };
    $('ev-saltar').onclick = () => { saltado = true; revelar(); };
    $('ev-ok').onclick = () => { el.classList.add('hidden'); el.innerHTML = ''; fin(); };
    void (async () => {
      await espera(1300);
      if (saltado) return;
      el.classList.add('brilla');
      await espera(700);
      // parpadeo entre las dos siluetas, cada vez más rápido
      el.classList.add('cambiando');
      let ms = 420;
      let nuevaVisible = false;
      while (ms > 45 && !saltado) {
        nuevaVisible = !nuevaVisible;
        el.classList.toggle('ver-nuevo', nuevaVisible);
        await espera(ms);
        ms *= 0.8;
      }
      if (saltado) return;
      el.classList.add('ver-nuevo', 'estalla');
      await espera(450);
      revelar();
    })();
  });
}
