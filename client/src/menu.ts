// Menús fuera de la batalla: Liga, equipo, capturas, Domador (medallas y habilidades) y ranking.

import {
  ELEMENTOS, ESPECIES, HABILIDADES_DOMADOR, INICIALES, LIGAS, MEDALLAS, MOVIMIENTOS, TAM_EQUIPO,
  ligaDe, xpPrimal, type Especie, type Perfil,
} from '../../shared/src';
import { api, spriteUrl } from './api';
import { emblemaLiga, icono } from './iconos';
import { descEspecie, descHab, habDomador, medalla, nombreElemento, nombreHab, nombreLiga, nombreMov, t, tError } from './i18n';

const $ = (id: string) => document.getElementById(id)!;
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const colorDe = (esp: string) => ELEMENTOS[ESPECIES[esp].elemento].color;

export function toast(text: string, error = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' err' : '');
  el.textContent = error ? tError(text) : text;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

export function elTag(elemento: string) {
  return `<span class="el" style="--c:${ELEMENTOS[elemento as keyof typeof ELEMENTOS].color}">${icono(elemento)}${nombreElemento(elemento)}</span>`;
}

export function chipMov(id: string) {
  const m = MOVIMIENTOS[id];
  return `<span class="mv-chip" style="--c:${ELEMENTOS[m.elemento].color}">${icono(m.tipo)}${esc(nombreMov(id))}</span>`;
}

function stats(e: Especie) {
  const fila = (k: 'stat.hp' | 'stat.atk' | 'stat.def' | 'stat.spd', v: number) =>
    `<div class="stat"><span>${t(k)}</span><div class="bar"><div style="width:${Math.min(100, (v / 110) * 100)}%"></div></div><b>${v}</b></div>`;
  return `<div class="stats">${fila('stat.hp', e.base.vida)}${fila('stat.atk', e.base.ataque)}${fila('stat.def', e.base.defensa)}${fila('stat.spd', e.base.velocidad)}</div>`;
}

const MEDALLA_EL: Record<string, string> = { brasa: 'fuego', oleaje: 'agua', brote: 'planta', voltio: 'electrico', roca: 'roca', vendaval: 'viento', umbral: 'sombra', primal: 'estrella' };
const HAB_IC: Record<string, string> = { entrenador: 'crecer', negociante: 'moneda', vinculo: 'corazon', relevo: 'cambiar', instinto: 'mira', capturador: 'red' };

type Tab = 'equipo' | 'capturar' | 'batalla' | 'domador' | 'ranking';

export class Menu {
  perfil!: Perfil;
  tab: Tab = 'batalla';
  onBatalla: (roomId: string) => void = () => {};
  private buscando = false;

  constructor() {
    document.querySelectorAll<HTMLButtonElement>('#tabs button').forEach((b) => (b.onclick = () => this.show(b.dataset.tab as Tab)));
  }

  setPerfil(p: Perfil) {
    this.perfil = p;
    $('tb-name').textContent = p.nombre;
    $('tb-lv').textContent = String(p.nivel);
    ($('tb-xp') as HTMLElement).style.width = p.xpSig ? `${(p.xp / p.xpSig) * 100}%` : '100%';
    $('tb-trophies').textContent = p.trofeos.toLocaleString();
    $('tb-coins').textContent = p.monedas.toLocaleString();
  }

  open() {
    $('menu').classList.remove('hidden');
    this.show(this.tab);
  }

  close() {
    $('menu').classList.add('hidden');
  }

  /** Vuelve a pintar la pestaña actual (por ejemplo, al cambiar de idioma). */
  refrescar() {
    if (this.perfil && !$('menu').classList.contains('hidden')) this.show(this.tab);
  }

  show(tab: Tab) {
    this.tab = tab;
    document.querySelectorAll<HTMLButtonElement>('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const body = $('menu-body');
    if (tab === 'batalla') body.innerHTML = this.batalla();
    if (tab === 'equipo') body.innerHTML = this.equipo();
    if (tab === 'capturar') body.innerHTML = this.capturar();
    if (tab === 'domador') body.innerHTML = this.domador();
    if (tab === 'ranking') { body.innerHTML = `<div class="page"><div class="page-head"><h2>${t('ranking.title')}</h2></div><p class="muted">${t('misc.loading')}</p></div>`; void this.ranking(); }
    this.bind();
  }

  // ---------------------------------------------------------------- Liga
  private batalla() {
    const p = this.perfil;
    const l = ligaDe(p.trofeos);
    const i = LIGAS.indexOf(l);
    const sig = LIGAS[i + 1];
    const prog = sig ? ((p.trofeos - l.trofeos) / (sig.trofeos - l.trofeos)) * 100 : 100;
    const equipo = p.equipo.map((u) => p.primales.find((x) => x.uid === u)).filter(Boolean);
    return `<div class="battle-home">
      ${emblemaLiga(l.color, i, 128)}
      <div class="league-name" style="color:${l.color}">${nombreLiga(l.id)}</div>
      <div class="trophy-big">${icono('trofeo')}${p.trofeos.toLocaleString()}</div>
      <div class="progress"><div style="width:${prog}%"></div></div>
      <div class="progress-label">${sig ? t('battle.next', { n: sig.trofeos - p.trofeos, l: nombreLiga(sig.id) }) : t('battle.top')}</div>
      <div class="lead-team">${equipo.map((x) => `<img src="${spriteUrl(x!.esp)}" alt="${ESPECIES[x!.esp].nombre}" title="${ESPECIES[x!.esp].nombre} · ${t('misc.level', { n: x!.nivel })}">`).join('')}</div>
      <button class="btn primary battle-btn ${this.buscando ? 'busy' : ''}" id="btn-buscar">${this.buscando ? `<span class="dots-anim">${t('battle.searching')}</span>` : `${icono('espadas')}${t('battle.find')}`}</button>
      ${this.buscando ? `<button class="btn ghost" id="btn-cancelar">${t('battle.cancel')}</button>` : ''}
      <div class="record">
        <div><b>${p.victorias}</b>${t('battle.wins')}</div><div><b>${p.derrotas}</b>${t('battle.losses')}</div><div><b>${p.mejorTrofeos}</b>${t('battle.best')}</div>
      </div>
      <div class="rules">${t('battle.rules')}</div>
    </div>`;
  }

  // ---------------------------------------------------------------- equipo
  private equipo() {
    const p = this.perfil;
    const slots = Array.from({ length: TAM_EQUIPO }, (_, i) => {
      const x = p.primales.find((y) => y.uid === p.equipo[i]);
      return x
        ? `<div class="slot full ${i === 0 ? 'lead' : ''}" style="--c:${colorDe(x.esp)}" data-quitar="${x.uid}">${i === 0 ? `<span class="lead-tag">${t('team.lead')}</span>` : `<span class="n">${i + 1}</span>`}
            <img src="${spriteUrl(x.esp)}" alt=""><span class="nm">${ESPECIES[x.esp].nombre}</span><span class="sl">${t('misc.level', { n: x.nivel })}</span></div>`
        : `<div class="slot"><span class="n">${i + 1}</span>${t('team.empty')}</div>`;
    }).join('');
    const orden = [...p.primales].sort((a, b) => Number(p.equipo.includes(b.uid)) - Number(p.equipo.includes(a.uid)) || b.nivel - a.nivel);
    const cards = orden.map((x) => {
      const e = ESPECIES[x.esp];
      const enEquipo = p.equipo.includes(x.uid);
      const evo = e.evoluciona ? t('team.evolves', { l: e.evoluciona.nivel, n: ESPECIES[e.evoluciona.a].nombre }) : t('team.final');
      return `<div class="card ${enEquipo ? 'on' : ''}" style="--c:${colorDe(x.esp)}" data-poner="${x.uid}" title="${esc(descEspecie(x.esp))}">
        ${enEquipo ? `<span class="tag">${t('team.inTeam')}</span>` : ''}
        <div class="top">${elTag(e.elemento)}<span class="lv">${t('misc.level', { n: x.nivel })}</span></div>
        <div class="stage"><img class="sprite" src="${spriteUrl(x.esp)}" alt=""></div>
        <div class="name">${e.nombre}</div>
        <div class="lvbar"><div style="width:${(x.xp / xpPrimal(x.nivel)) * 100}%"></div></div>
        ${stats(e)}
        <div class="ability" title="${esc(descHab(e.habilidad))}">${icono('estrella')}${esc(nombreHab(e.habilidad))}</div>
        <div class="mv-chips">${e.movimientos.map(chipMov).join('')}</div>
        <div class="evo-line">${evo}</div>
      </div>`;
    }).join('');
    return `<div class="page">
      <div class="page-head"><h2>${t('team.title')}</h2><span class="count">${p.equipo.length}/${TAM_EQUIPO}</span></div>
      <p class="muted">${t('team.hint')}</p>
      <div class="team-row">${slots}</div>
      <div class="section-title">${t('team.collection')} · ${p.primales.length}</div>
      <div class="grid">${cards}</div></div>`;
  }

  // ---------------------------------------------------------------- capturar
  private capturar() {
    const p = this.perfil;
    const lista = Object.values(ESPECIES).sort((a, b) => a.captura.nivel - b.captura.nivel);
    const cards = lista.map((e) => {
      const tengo = p.primales.some((x) => x.esp === e.id);
      const visto = p.capturados.includes(e.id);
      const costo = Math.round(e.captura.monedas * (1 - (p.habilidades.capturador ?? 0) * 0.08));
      const okNivel = p.nivel >= e.captura.nivel;
      const okMonedas = p.monedas >= costo;
      const conocido = visto || okNivel || tengo;
      return `<div class="card ${conocido ? '' : 'locked'}" style="--c:${conocido ? ELEMENTOS[e.elemento].color : '#555'}" title="${conocido ? esc(descEspecie(e.id)) : ''}">
        ${tengo ? `<span class="tag owned">${t('capture.owned')}</span>` : ''}
        <div class="top">${conocido ? elTag(e.elemento) : `<span class="el" style="--c:#777">${icono('candado')}${t('capture.locked')}</span>`}<span class="lv">${t('capture.wild', { n: e.captura.nivelSalvaje })}</span></div>
        <div class="stage"><img class="sprite" src="${spriteUrl(e.id)}" alt=""></div>
        <div class="name">${conocido ? e.nombre : '???'}</div>
        <div class="reqs">
          <span class="req ${okNivel ? 'ok' : 'no'}">${icono(okNivel ? 'check' : 'candado')}${t('capture.req', { n: e.captura.nivel })}</span>
          <span class="req ${okMonedas ? 'ok' : 'no'}">${icono('moneda')}${costo.toLocaleString()}</span>
        </div>
        <button class="btn ${okNivel && okMonedas ? 'primary' : ''}" data-capturar="${e.id}" ${okNivel && okMonedas ? '' : 'disabled'}>${icono('espadas')}${t('capture.go')}</button>
      </div>`;
    }).join('');
    return `<div class="page">
      <div class="page-head"><h2>${t('capture.title')}</h2></div>
      <p class="muted">${t('capture.hint')}</p>
      <div class="grid">${cards}</div></div>`;
  }

  // ---------------------------------------------------------------- Domador
  private domador() {
    const p = this.perfil;
    const medals = MEDALLAS.map((m) => {
      const tr = medalla(m.id);
      const el = MEDALLA_EL[m.id];
      const c = el === 'estrella' ? '#ffc940' : ELEMENTOS[el as keyof typeof ELEMENTOS].color;
      const got = p.nivel >= m.nivel;
      return `<div class="medal ${got ? 'got' : ''}" style="--c:${c}" title="${esc(tr.desc)}"><div class="disc">${icono(got ? el : 'candado')}</div>${esc(tr.nombre)}<small>${t('misc.level', { n: m.nivel })}</small></div>`;
    }).join('');
    const skills = HABILIDADES_DOMADOR.map((h) => {
      const n = p.habilidades[h.id] ?? 0;
      const tr = habDomador(h.id);
      const puede = p.puntosLibres > 0 && n < h.max;
      return `<div class="skill"><div class="sk-ic">${icono(HAB_IC[h.id] ?? 'estrella')}</div>
        <div class="info"><b>${esc(tr.nombre)}</b><span class="pips">${Array.from({ length: h.max }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</span><small>${esc(tr.desc)}</small></div>
        <button class="btn ${puede ? 'primary' : ''}" data-hab="${h.id}" ${puede ? '' : 'disabled'} aria-label="${t('trainer.upgrade')}">${n >= h.max ? t('trainer.max') : icono('mas')}</button></div>`;
    }).join('');
    const pts = p.puntosLibres;
    return `<div class="page">
      <div class="trainer-head"><div class="tb-level">${p.nivel}</div><div class="info"><b>${esc(p.nombre)}</b><br><small>${t('trainer.level', { n: p.nivel })} · ${p.xpSig ? `${p.xp} / ${p.xpSig} XP` : 'MAX'}</small>
        <div class="xpbar"><div style="width:${p.xpSig ? (p.xp / p.xpSig) * 100 : 100}%"></div></div></div></div>
      <div class="section-title">${t('trainer.medals')} · ${MEDALLAS.filter((m) => p.nivel >= m.nivel).length}/${MEDALLAS.length}</div>
      <p class="muted" style="margin-top:-4px;font-size:13px">${t('trainer.medalsHint')}</p>
      <div class="medals">${medals}</div>
      <div class="section-title">${t('trainer.skills')} <span class="points ${pts ? '' : 'none'}">${pts > 1 ? t('trainer.points', { n: pts }) : pts === 1 ? t('trainer.points1') : t('trainer.points0')}</span></div>
      ${skills}</div>`;
  }

  // ---------------------------------------------------------------- ranking
  private async ranking() {
    try {
      const r = await api.ranking();
      if (this.tab !== 'ranking') return;
      $('menu-body').innerHTML = `<div class="page"><div class="page-head"><h2>${t('ranking.title')}</h2></div><div class="rank">` + r.map((x, i) => {
        const l = ligaDe(x.trofeos);
        const yo = x.nombre === this.perfil.nombre;
        return `<div class="rank-row ${yo ? 'me' : ''}"><span class="pos">${i + 1}</span><span class="nm">${esc(x.nombre)}${yo ? ` · ${t('ranking.you')}` : ''}<small>${t('misc.level', { n: x.nivel })}</small></span>
          <span class="lg" style="color:${l.color}">${nombreLiga(l.id)}</span><span class="tr">${icono('trofeo')}${x.trofeos.toLocaleString()}</span></div>`;
      }).join('') + '</div></div>';
    } catch (e: any) {
      $('menu-body').innerHTML = `<p class="error">${esc(tError(e.message))}</p>`;
    }
  }

  // ---------------------------------------------------------------- acciones
  private bind() {
    const body = $('menu-body');
    body.querySelector<HTMLButtonElement>('#btn-buscar')?.addEventListener('click', () => void this.buscar());
    body.querySelector<HTMLButtonElement>('#btn-cancelar')?.addEventListener('click', () => { void api.cancelar(); this.buscando = false; this.show('batalla'); });
    body.querySelectorAll<HTMLElement>('[data-poner]').forEach((el) => (el.onclick = () => this.cambiarEquipo(el.dataset.poner!, true)));
    body.querySelectorAll<HTMLElement>('[data-quitar]').forEach((el) => (el.onclick = () => this.cambiarEquipo(el.dataset.quitar!, false)));
    body.querySelectorAll<HTMLButtonElement>('[data-capturar]').forEach((b) => (b.onclick = () => void this.retar(b.dataset.capturar!)));
    body.querySelectorAll<HTMLButtonElement>('[data-hab]').forEach((b) => (b.onclick = async () => {
      try { this.setPerfil(await api.habilidad(b.dataset.hab!)); this.show('domador'); } catch (e: any) { toast(e.message, true); }
    }));
  }

  private async cambiarEquipo(uid: string, poner: boolean) {
    let eq = [...this.perfil.equipo];
    if (poner) {
      if (eq.includes(uid)) eq = [uid, ...eq.filter((u) => u !== uid)]; // lo pone al frente
      else if (eq.length >= TAM_EQUIPO) return toast('Tu equipo está lleno (6). Quita uno primero.', true);
      else eq.push(uid);
    } else {
      if (eq.length <= 1) return toast('Tu equipo necesita al menos un Primal.', true);
      eq = eq.filter((u) => u !== uid);
    }
    try { this.setPerfil(await api.equipo(eq)); this.show('equipo'); } catch (e: any) { toast(e.message, true); }
  }

  private async buscar() {
    if (this.buscando) return;
    this.buscando = true;
    this.show('batalla');
    try {
      const r = await api.buscar();
      this.buscando = false;
      this.onBatalla(r.roomId);
    } catch (e: any) {
      this.buscando = false;
      if (!/cancelada|reemplazada/.test(e.message)) toast(e.message, true);
      if (this.tab === 'batalla') this.show('batalla');
    }
  }

  private async retar(esp: string) {
    try {
      const r = await api.capturar(esp);
      this.setPerfil(r.perfil);
      this.onBatalla(r.roomId);
    } catch (e: any) { toast(e.message, true); }
  }
}

/** Pantalla de elegir el Primal inicial. Devuelve una función para repintarla (cambio de idioma). */
export function pantallaInicial(onElegido: (p: Perfil) => void): () => void {
  let sel = '';
  $('starter').classList.remove('hidden');
  const pintar = () => {
    $('starter-list').innerHTML = INICIALES.map((id) => {
      const e = ESPECIES[id];
      return `<div class="starter ${sel === id ? 'sel' : ''}" style="--c:${ELEMENTOS[e.elemento].color}" data-id="${id}">
        <div class="stage"><img class="sprite" src="${spriteUrl(id)}" alt=""></div>
        <h3>${e.nombre}</h3>${elTag(e.elemento)}<p>${esc(descEspecie(id))}</p>
        <div class="mv-chips">${e.movimientos.map(chipMov).join('')}</div></div>`;
    }).join('');
    const b = $('btn-starter') as HTMLButtonElement;
    b.disabled = !sel;
    b.textContent = sel ? t('starter.confirm', { n: ESPECIES[sel].nombre }) : t('starter.pick');
    document.querySelectorAll<HTMLElement>('.starter').forEach((el) => (el.onclick = () => { sel = el.dataset.id!; pintar(); }));
  };
  pintar();
  $('btn-starter').onclick = async () => {
    try {
      const p = await api.inicial(sel);
      $('starter').classList.add('hidden');
      onElegido(p);
    } catch (e: any) { toast(e.message, true); }
  };
  return pintar;
}
