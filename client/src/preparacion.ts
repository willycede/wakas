// Preparación antes de la batalla: 20 s para ver la ficha del rival (sus Primales favoritos) y
// elegir tus 3 Primales. Cada Primal de tu colección muestra si tiene ventaja contra los del rival.

import { ELEMENTOS, ESPECIES, LIGAS, MAX_LEGENDARIOS, MOVIMIENTOS, TAM_EQUIPO, efectividad, esLegendario, ligaDe, tipos, type Elemento, type Perfil, type Preparacion } from '../../shared/src';
import { spriteUrl } from './api';
import { abrirFicha } from './ficha';
import { nombreLiga, t } from './i18n';
import { emblemaLiga, icono } from './iconos';
import { retrato } from './avatar';
import { esc, rarezaTag, tiposTag } from './menu';
import type { Conexion } from './net';

const $ = (id: string) => document.getElementById(id)!;

/** Ventaja de un Primal contra un grupo de especies: >0 buena, <0 mala. */
function ventaja(esp: string, rivales: string[]) {
  if (!rivales.length) return 0;
  const mis = new Set<Elemento>([...tipos(esp), ...ESPECIES[esp].movimientos.map((m) => MOVIMIENTOS[m].elemento)]);
  let total = 0;
  for (const r of rivales) {
    const ataco = Math.max(...[...mis].map((e) => efectividad(e, tipos(r))));
    const recibo = Math.max(...tipos(r).map((e) => efectividad(e, tipos(esp))));
    total += Math.log(ataco) - Math.log(recibo);
  }
  return total / rivales.length;
}

export function mostrarPreparacion(net: Conexion, prep: Preparacion, perfil: Perfil, onAmigo?: (id: number) => void): () => void {
  const el = $('preparacion');
  let sel = prep.equipo.filter((u) => perfil.primales.some((p) => p.uid === u)).slice(0, TAM_EQUIPO);
  let listo = false;
  const fin = Date.now() + prep.ms;
  const r = prep.rival;
  const favs = r.favoritos.map((f) => f.esp);
  const total = r.victorias + r.derrotas;
  const liga = ligaDe(r.trofeos);

  const pintar = () => {
    const orden = [...perfil.primales].sort((a, b) => ventaja(b.esp, favs) - ventaja(a.esp, favs) || b.nivel - a.nivel);
    el.innerHTML = `
      <div class="prep-top">
        <div class="prep-titulo"><b>${t('prep.title')}</b><small>${t('prep.sub')}</small></div>
        <div class="prep-reloj" id="prep-reloj"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle class="arco" cx="20" cy="20" r="17"/></svg><span></span></div>
      </div>
      <div class="prep-cuerpo">
        <div class="prep-rival">
          <div class="pr-head">${r.salvaje ? '' : r.avatar ? retrato(r.avatar, 'grande') : emblemaLiga(liga.color, LIGAS.indexOf(liga), 54)}
            <div><small>${r.salvaje ? t('dif.wild') : t('prep.rival')}</small><b>${esc(r.nombre)}</b>
              ${r.salvaje ? rarezaTag(r.salvaje) : `<span class="pr-liga" style="color:${liga.color}">${nombreLiga(liga.id)} · ${icono('trofeo')}${r.trofeos}</span>`}</div></div>
          ${r.salvaje ? '' : `<div class="pr-stats">
            <div><b>${r.nivel}</b><small>${t('prep.level')}</small></div>
            <div><b>${total ? Math.round((r.victorias / total) * 100) : 0}%</b><small>${t('prep.winrate')}</small></div>
            <div><b>${r.victorias}</b><small>${t('battle.wins')}</small></div>
            <div><b>${r.mejorTrofeos}</b><small>${t('battle.best')}</small></div></div>`}
          <div class="section-title">${r.salvaje ? t('prep.wildMon') : t('prep.favs')}</div>
          <div class="pr-favs">${r.favoritos.map((f) => `<button class="pr-fav" data-ver="${f.esp}" style="--c:${ELEMENTOS[ESPECIES[f.esp].elemento].color}">
              <img src="${spriteUrl(f.esp)}" alt=""><b>${ESPECIES[f.esp].nombre}</b><div class="tipos">${tiposTag(f.esp)}</div>${f.n ? `<small>${t('prep.uses', { n: f.n })}</small>` : ''}</button>`).join('')}</div>
          ${r.id && !r.ia && onAmigo ? `<button class="btn ghost pr-amigo" id="prep-amigo">${icono('mas')}${t('amigos.add')}</button>` : ''}
        </div>
        <div class="prep-mio">
          <div class="pm-equipo">${Array.from({ length: TAM_EQUIPO }, (_, i) => {
            const p = perfil.primales.find((x) => x.uid === sel[i]);
            return p ? `<button class="pm-slot full" data-quitar="${p.uid}" style="--c:${ELEMENTOS[ESPECIES[p.esp].elemento].color}"><span>${i + 1}</span><img src="${spriteUrl(p.esp)}" alt=""><b>${ESPECIES[p.esp].nombre}</b></button>`
              : `<div class="pm-slot"><span>${i + 1}</span></div>`;
          }).join('')}</div>
          <div class="pm-lista">${orden.map((p) => {
            const v = ventaja(p.esp, favs);
            const cls = v > 0.15 ? 'buena' : v < -0.15 ? 'mala' : '';
            return `<button class="pm-item ${sel.includes(p.uid) ? 'on' : ''} ${cls}" data-poner="${p.uid}" style="--c:${ELEMENTOS[ESPECIES[p.esp].elemento].color}">
              <img src="${spriteUrl(p.esp)}" alt=""><div><b>${ESPECIES[p.esp].nombre}</b><small>${t('misc.level', { n: p.nivel })}${esLegendario(p.esp) ? ` · ${icono('corona')}` : ''}</small>
              <div class="tipos">${tiposTag(p.esp)}</div></div>
              ${cls ? `<span class="pm-ventaja">${t(cls === 'buena' ? 'prep.good' : 'prep.bad')}</span>` : ''}</button>`;
          }).join('')}</div>
          <button class="btn primary big" id="prep-listo" ${listo || !sel.length ? 'disabled' : ''}>${listo ? t('prep.waiting') : t('prep.ready')}</button>
        </div>
      </div>`;
    el.querySelectorAll<HTMLElement>('[data-poner]').forEach((b) => (b.onclick = () => {
      if (listo) return;
      const u = b.dataset.poner!;
      if (sel.includes(u)) sel = sel.filter((x) => x !== u);
      else {
        const esp = perfil.primales.find((x) => x.uid === u)!.esp;
        // solo un legendario: el nuevo reemplaza al que había
        if (esLegendario(esp)) sel = sel.filter((x) => !esLegendario(perfil.primales.find((y) => y.uid === x)!.esp) || MAX_LEGENDARIOS > 1);
        if (sel.length >= TAM_EQUIPO) sel = sel.slice(0, TAM_EQUIPO - 1);
        sel.push(u);
      }
      net.send('prep_equipo', { uids: sel });
      pintar();
    }));
    el.querySelectorAll<HTMLElement>('[data-quitar]').forEach((b) => (b.onclick = () => {
      if (listo || sel.length <= 1) return;
      sel = sel.filter((x) => x !== b.dataset.quitar);
      net.send('prep_equipo', { uids: sel });
      pintar();
    }));
    el.querySelectorAll<HTMLElement>('[data-ver]').forEach((b) => (b.onclick = () => abrirFicha(b.dataset.ver!)));
    el.querySelector<HTMLElement>('#prep-listo')!.onclick = () => { listo = true; net.send('prep_listo'); pintar(); };
    el.querySelector<HTMLElement>('#prep-amigo')?.addEventListener('click', (ev) => { onAmigo!(r.id!); (ev.currentTarget as HTMLButtonElement).disabled = true; });
    reloj();
  };
  const reloj = () => {
    const k = Math.max(0, (fin - Date.now()) / prep.ms);
    const rel = el.querySelector<HTMLElement>('#prep-reloj');
    if (!rel) return;
    rel.querySelector('span')!.textContent = String(Math.ceil((fin - Date.now()) / 1000));
    rel.querySelector<SVGCircleElement>('.arco')!.style.strokeDashoffset = String(106.8 * (1 - k));
    rel.classList.toggle('urgente', k < 0.25);
  };
  el.classList.remove('hidden');
  pintar();
  const timer = setInterval(reloj, 200);
  return () => { clearInterval(timer); el.classList.add('hidden'); el.innerHTML = ''; };
}
