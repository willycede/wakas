// Menús fuera de la batalla: equipo, capturas, Liga, Domador (medallas y habilidades) y ranking.

import {
  ELEMENTOS, ESPECIES, HABILIDADES, HABILIDADES_DOMADOR, INICIALES, LIGAS, MEDALLAS, MOVIMIENTOS, TAM_EQUIPO,
  ligaDe, xpPrimal, type Especie, type Perfil,
} from '../../shared/src';
import { api, spriteUrl } from './api';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function toast(text: string) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

export function elTag(esp: Especie) {
  const e = ELEMENTOS[esp.elemento];
  return `<span class="el" style="background:${e.color}">${e.icono} ${e.nombre}</span>`;
}

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
    $('tb-trophies').textContent = String(p.trofeos);
    $('tb-coins').textContent = String(p.monedas);
    const l = ligaDe(p.trofeos);
    $('tb-league').innerHTML = `${l.icono} ${l.nombre}`;
    ($('tb-league') as HTMLElement).style.color = l.color;
  }

  open() {
    $('menu').classList.remove('hidden');
    this.show(this.tab);
  }

  close() {
    $('menu').classList.add('hidden');
  }

  show(tab: Tab) {
    this.tab = tab;
    document.querySelectorAll<HTMLButtonElement>('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const body = $('menu-body');
    if (tab === 'batalla') body.innerHTML = this.batalla();
    if (tab === 'equipo') body.innerHTML = this.equipo();
    if (tab === 'capturar') body.innerHTML = this.capturar();
    if (tab === 'domador') body.innerHTML = this.domador();
    if (tab === 'ranking') { body.innerHTML = '<p class="muted">Cargando…</p>'; void this.ranking(); }
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
      <div class="league-badge">${l.icono}</div>
      <div class="league-name" style="color:${l.color}">${l.nombre}</div>
      <div class="progress"><div style="width:${prog}%"></div></div>
      <small class="muted">${sig ? `${p.trofeos} / ${sig.trofeos} 🏆 para ${sig.nombre}` : '¡Estás en la liga más alta!'}</small>
      <div class="lead-team">${equipo.map((x) => `<img src="${spriteUrl(x!.esp)}" title="${ESPECIES[x!.esp].nombre} nv. ${x!.nivel}">`).join('')}</div>
      <button class="primary battle-btn" id="btn-buscar">${this.buscando ? 'Buscando…' : '¡BATALLA!'}</button>
      ${this.buscando ? '<button id="btn-cancelar">Cancelar</button>' : ''}
      <small class="muted">Victorias ${p.victorias} · Derrotas ${p.derrotas} · Récord ${p.mejorTrofeos} 🏆</small>
      <small class="muted">Ganar: +30 🏆 · Perder: −18 🏆. Tus Primales ganan experiencia en cada combate.</small>
    </div>`;
  }

  // ---------------------------------------------------------------- equipo
  private equipo() {
    const p = this.perfil;
    const slots = Array.from({ length: TAM_EQUIPO }, (_, i) => {
      const x = p.primales.find((y) => y.uid === p.equipo[i]);
      return x
        ? `<div class="slot full" data-quitar="${x.uid}"><img src="${spriteUrl(x.esp)}"><b>${ESPECIES[x.esp].nombre}</b>nv. ${x.nivel}</div>`
        : `<div class="slot">vacío</div>`;
    }).join('');
    const cards = p.primales.map((x) => {
      const e = ESPECIES[x.esp];
      const enEquipo = p.equipo.includes(x.uid);
      const evo = e.evoluciona ? `Evoluciona a ${ESPECIES[e.evoluciona.a].nombre} en nv. ${e.evoluciona.nivel}` : 'Forma final';
      return `<div class="card ${enEquipo ? 'on' : ''}" data-poner="${x.uid}">
        ${enEquipo ? '<span class="badge">EQUIPO</span>' : ''}
        <img class="sprite" src="${spriteUrl(x.esp)}"><b>${e.nombre} · nv. ${x.nivel}</b>${elTag(e)}
        <div class="lvbar"><div style="width:${(x.xp / xpPrimal(x.nivel)) * 100}%"></div></div>
        <small>${evo}</small>
        <small>${e.movimientos.map((m) => MOVIMIENTOS[m].nombre).join(' · ')}</small>
        <small>✦ ${HABILIDADES[e.habilidad].nombre}</small>
      </div>`;
    }).join('');
    return `<h3>Tu equipo (${p.equipo.length}/${TAM_EQUIPO})</h3>
      <p class="muted">Toca un Primal de abajo para ponerlo en el equipo; toca uno del equipo para quitarlo. El primero entra a la arena.</p>
      <div class="team-row">${slots}</div>
      <h3>Tus Primales (${p.primales.length})</h3><div class="grid">${cards}</div>`;
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
      return `<div class="card ${visto ? '' : 'locked'}">
        ${tengo ? '<span class="badge">✓</span>' : ''}
        <img class="sprite" src="${spriteUrl(e.id)}"><b>${visto || okNivel ? e.nombre : '???'}</b>${elTag(e)}
        <small style="color:${okNivel ? 'var(--good)' : 'var(--danger)'}">Domador nv. ${e.captura.nivel}</small>
        <small style="color:${okMonedas ? 'var(--good)' : 'var(--danger)'}">🪙 ${costo}</small>
        <small>Salvaje nv. ${e.captura.nivelSalvaje}</small>
        <button class="${okNivel && okMonedas ? 'primary' : ''}" data-capturar="${e.id}" ${okNivel && okMonedas ? '' : 'disabled'}>Retar</button>
      </div>`;
    }).join('');
    return `<h3>Capturar Primales</h3>
      <p class="muted">Paga la entrada y enfréntate al Primal salvaje con tu equipo. Si lo vences, se une a ti. Si pierdes, pierdes la entrada.</p>
      <div class="grid">${cards}</div>`;
  }

  // ---------------------------------------------------------------- Domador
  private domador() {
    const p = this.perfil;
    const medals = MEDALLAS.map((m) => `<div class="medal ${p.nivel >= m.nivel ? 'got' : ''}" title="${esc(m.desc)}"><i>${m.icono}</i>${m.nombre}<br>nv. ${m.nivel}</div>`).join('');
    const skills = HABILIDADES_DOMADOR.map((h) => {
      const n = p.habilidades[h.id] ?? 0;
      return `<div class="skill"><span class="ic">${h.icono}</span><div class="info"><b>${h.nombre}</b> <span class="dots">${'●'.repeat(n)}${'○'.repeat(h.max - n)}</span><br><small class="muted">${h.desc}</small></div>
        <button data-hab="${h.id}" ${p.puntosLibres > 0 && n < h.max ? 'class="primary"' : 'disabled'}>+</button></div>`;
    }).join('');
    return `<h3>Domador ${esc(p.nombre)} · nivel ${p.nivel}</h3>
      <p class="muted">Sube de nivel ganando batallas. Cada nivel te da un punto de habilidad; ciertos niveles te dan medallas (+3% de experiencia para tus Primales cada una).</p>
      <h3>Medallas</h3><div class="medals">${medals}</div>
      <h3>Habilidades de Domador · puntos libres: ${p.puntosLibres}</h3>${skills}`;
  }

  // ---------------------------------------------------------------- ranking
  private async ranking() {
    try {
      const r = await api.ranking();
      if (this.tab !== 'ranking') return;
      $('menu-body').innerHTML = `<h3>🌍 Ranking mundial</h3>` + r.map((x, i) => {
        const l = ligaDe(x.trofeos);
        return `<div class="rank-row ${x.nombre === this.perfil.nombre ? 'me' : ''}"><span class="pos">#${i + 1}</span><span class="nm">${esc(x.nombre)} <small class="muted">nv. ${x.nivel}</small></span><span style="color:${l.color}">${l.icono}</span><b>${x.trofeos} 🏆</b></div>`;
      }).join('');
    } catch (e: any) {
      $('menu-body').innerHTML = `<p class="error">${esc(e.message)}</p>`;
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
      try { this.setPerfil(await api.habilidad(b.dataset.hab!)); this.show('domador'); } catch (e: any) { toast(e.message); }
    }));
  }

  private async cambiarEquipo(uid: string, poner: boolean) {
    let eq = [...this.perfil.equipo];
    if (poner) {
      if (eq.includes(uid)) eq = [uid, ...eq.filter((u) => u !== uid)]; // lo pone primero
      else if (eq.length >= TAM_EQUIPO) return toast('Tu equipo está lleno (6). Quita uno primero.');
      else eq.push(uid);
    } else {
      if (eq.length <= 1) return toast('Tu equipo necesita al menos un Primal.');
      eq = eq.filter((u) => u !== uid);
    }
    try { this.setPerfil(await api.equipo(eq)); this.show('equipo'); } catch (e: any) { toast(e.message); }
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
      if (!/cancelada|reemplazada/.test(e.message)) toast(e.message);
      if (this.tab === 'batalla') this.show('batalla');
    }
  }

  private async retar(esp: string) {
    try {
      const r = await api.capturar(esp);
      this.setPerfil(r.perfil);
      this.onBatalla(r.roomId);
    } catch (e: any) { toast(e.message); }
  }
}

/** Pantalla de elegir el Primal inicial. */
export function pantallaInicial(onElegido: (p: Perfil) => void) {
  let sel = '';
  $('starter').classList.remove('hidden');
  $('starter-list').innerHTML = INICIALES.map((id) => {
    const e = ESPECIES[id];
    return `<div class="starter" data-id="${id}"><img class="sprite" src="${spriteUrl(id)}"><h3>${e.nombre}</h3>${elTag(e)}<p>${esc(e.desc)}</p>
      <p><b>${MOVIMIENTOS[e.movimientos[0]].nombre}</b> · ${MOVIMIENTOS[e.movimientos[1]].nombre} · ${MOVIMIENTOS[e.movimientos[2]].nombre} · ${MOVIMIENTOS[e.movimientos[3]].nombre}</p></div>`;
  }).join('');
  document.querySelectorAll<HTMLElement>('.starter').forEach((el) => (el.onclick = () => {
    sel = el.dataset.id!;
    document.querySelectorAll('.starter').forEach((x) => x.classList.toggle('sel', x === el));
    ($('btn-starter') as HTMLButtonElement).disabled = false;
  }));
  $('btn-starter').onclick = async () => {
    try {
      const p = await api.inicial(sel);
      $('starter').classList.add('hidden');
      onElegido(p);
    } catch (e: any) { toast(e.message); }
  };
}
