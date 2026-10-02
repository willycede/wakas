// Menús fuera de la batalla: Liga, equipo, capturas, Domador (medallas y habilidades) y ranking.

import {
  ELEMENTOS, ESPECIES, HABILIDADES_DOMADOR, INICIALES, LEGENDARIOS, LIGAS, MEDALLAS, MOVIMIENTOS, NUM_INICIALES, RAREZAS, TAM_EQUIPO, diaActual,
  legendarioDelDia, ligaDe, tipos, xpPrimal, type Especie, type Perfil, type Rareza, type Social,
} from '../../shared/src';
import { api, spriteUrl } from './api';
import { emblemaLiga, icono } from './iconos';
import { abrirFicha, editarAvatar, enlazarLegal } from './ficha';
import { avatarUrl, retrato } from './avatar';
import { textoMision, descEspecial, descEspecie, descHab, habDomador, medalla, nombreElemento, nombreEspecial, nombreHab, nombreLiga, nombreMov, nombreRareza, t, tError } from './i18n';

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

/** Etiquetas de los tipos de una especie (uno o dos). */
export function tiposTag(esp: string) {
  return tipos(esp).map(elTag).join('');
}

export function rarezaTag(esp: string) {
  const r = ESPECIES[esp].rareza;
  return `<span class="rar ${r}" style="--c:${RAREZAS[r].color}">${icono(r === 'legendario' ? 'corona' : 'gema')}${nombreRareza(r)}</span>`;
}

const horas = (ms: number) => { const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000); return `${h} h ${String(m).padStart(2, '0')} min`; };

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
const HAB_IC: Record<string, string> = { entrenador: 'crecer', negociante: 'moneda', vinculo: 'corazon', relevo: 'cambiar', instinto: 'mira', capturador: 'chakana' };

type Tab = 'equipo' | 'capturar' | 'batalla' | 'domador' | 'ranking';

export class Menu {
  perfil!: Perfil;
  tab: Tab = 'batalla';
  onBatalla: (roomId: string) => void = () => {};
  private buscando = false;
  private filtro: Rareza | 'todos' = 'todos';
  private reto: string | null = null; // código del reto amistoso que estamos esperando
  social: Social = { amigos: [], solicitudes: [], retos: [] };
  onTutorial: () => void = () => {};
  onHistoria: () => void = () => {};

  constructor() {
    document.querySelectorAll<HTMLButtonElement>('#tabs button').forEach((b) => (b.onclick = () => this.show(b.dataset.tab as Tab)));
  }

  setPerfil(p: Perfil) {
    this.perfil = p;
    $('tb-name').textContent = p.nombre;
    $('tb-avatar').innerHTML = retrato(p.avatar);
    $('tb-avatar').onclick = () => this.personalizar();
    $('tb-lv').textContent = String(p.nivel);
    ($('tb-xp') as HTMLElement).style.width = p.xpSig ? `${(p.xp / p.xpSig) * 100}%` : '100%';
    $('tb-trophies').textContent = p.trofeos.toLocaleString();
    $('tb-coins').textContent = p.monedas.toLocaleString();
    // punto rojo en Batalla si hay una misión lista para cobrar
    document.querySelector('#tabs [data-tab=batalla]')!.classList.toggle('aviso', p.misiones.some((m) => m.progreso >= m.meta && !m.cobrada));
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
      <div class="rules">${icono('candado')} ${t('hud.capLevel', { n: l.nivelMax })}</div>
      ${this.motivacion()}
      <div class="amis">
        <div class="amis-head">${icono('huella')}<div><b>${t('amis.title')}</b><small>${t('amis.txt')}</small></div></div>
        ${this.reto ? `<div class="amis-codigo"><span>${t('amis.code')}</span><b>${this.reto}</b></div>
          <div class="amis-acciones"><a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t('amis.msg', { u: this.enlaceReto() }))}">${t('amis.share')}</a>
          <button class="btn ghost" id="amis-copiar">${t('amis.copy')}</button><button class="btn ghost" id="amis-cancelar">${t('battle.cancel')}</button></div>
          <small class="muted dots-anim">${t('amis.waiting')}</small>`
        : `<div class="amis-acciones"><button class="btn" id="amis-crear">${t('amis.create')}</button>
          <input id="amis-input" maxlength="5" placeholder="${t('amis.placeholder')}"><button class="btn" id="amis-unirse">${t('amis.join')}</button></div>`}
      </div>
    </div>`;
  }

  /** Bono diario, misiones de hoy y el camino a Campeón. */
  private motivacion() {
    const p = this.perfil;
    const finDia = (diaActual() + 1) * 86_400_000 - Date.now();
    const horas = `${Math.floor(finDia / 3_600_000)} h ${Math.floor((finDia % 3_600_000) / 60_000)} min`;
    const bono = p.bonoDiario ? `<div class="bono">${icono('moneda')}<div><b>${t('bono.title')}</b><small>${t('bono.txt')}</small></div><span>×2</span></div>` : '';
    const mis = p.misiones.map((m) => {
      const lista = m.progreso >= m.meta;
      return `<div class="mision ${m.cobrada ? 'hecha' : lista ? 'lista' : ''}">
        <div class="m-info"><b>${textoMision(m.id, m.meta)}</b>
          <div class="m-barra"><div style="width:${(m.progreso / m.meta) * 100}%"></div><span>${m.progreso}/${m.meta}</span></div></div>
        ${m.cobrada ? `<span class="m-ok">${icono('check')}${t('mis.done')}</span>` : `<button class="btn ${lista ? 'primary' : ''}" data-mision="${m.id}" ${lista ? '' : 'disabled'}>${icono('moneda')}${m.premio}</button>`}
      </div>`;
    }).join('');
    const ligaI = LIGAS.indexOf(ligaDe(p.mejorTrofeos));
    const legs = LEGENDARIOS.filter((x) => p.primales.some((y) => y.esp === x)).length;
    const total = Object.keys(ESPECIES).length;
    const medallas = MEDALLAS.filter((m) => p.nivel >= m.nivel).length;
    const meta = (ic: string, nombre: string, v: number, max: number) =>
      `<div class="meta-item">${icono(ic)}<div><small>${nombre}</small><b>${v}<span>/${max}</span></b><div class="m-barra"><div style="width:${(v / max) * 100}%"></div></div></div></div>`;
    return `${bono}
      <div class="caja"><div class="caja-head"><b>${t('mis.title')}</b><small>${t('mis.new', { t: horas })}</small></div>${mis}</div>
      <div class="caja camino">
        <div class="caja-head"><b>${t('camino.title')}</b><small>${t('camino.sub')}</small></div>
        <div class="escalera">${LIGAS.map((l, k) => `<div class="escalon ${k <= ligaI ? 'ok' : ''} ${k === ligaI ? 'aqui' : ''}" title="${nombreLiga(l.id)}">${emblemaLiga(l.color, k, 40)}</div>`).join('<i></i>')}</div>
        <div class="metas">${meta('chakana', t('camino.dex'), p.capturados.length, total)}${meta('corona', t('camino.leg'), legs, LEGENDARIOS.length)}${meta('medalla', t('camino.medals'), medallas, MEDALLAS.length)}</div>
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
      return `<div class="card ${enEquipo ? 'on' : ''} r-${e.rareza}" style="--c:${colorDe(x.esp)}" data-poner="${x.uid}" title="${esc(descEspecie(x.esp))}">
        ${enEquipo ? `<span class="tag">${t('team.inTeam')}</span>` : ''}
        <div class="top"><span class="tipos">${tiposTag(x.esp)}</span><span class="lv">${t('misc.level', { n: x.nivel })}</span></div>
        <div class="stage"><img class="sprite" src="${spriteUrl(x.esp)}" alt=""></div>
        <div class="name">${e.nombre}</div>${rarezaTag(x.esp)}
        <div class="lvbar"><div style="width:${(x.xp / xpPrimal(x.nivel)) * 100}%"></div></div>
        ${stats(e)}
        <div class="ability" title="${esc(descHab(e.habilidad))}">${icono('estrella')}${esc(nombreHab(e.habilidad))}</div>
        <div class="mv-chips">${e.movimientos.map(chipMov).join('')}</div>
        ${e.rareza === 'legendario' ? `<div class="evo-line leg">${icono('especial')} ${esc(nombreEspecial(x.esp, 0))} · ${esc(nombreEspecial(x.esp, 1))}</div>` : `<div class="evo-line">${evo}</div>`}
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
    const hoy = legendarioDelDia();
    const manana = legendarioDelDia(Date.now() + hoy.terminaEn + 1000);
    const costoDe = (e: Especie) => Math.round(e.captura.monedas * (1 - (p.habilidades.capturador ?? 0) * 0.08));
    const tarjeta = (e: Especie) => {
      const tengo = p.primales.some((x) => x.esp === e.id);
      const visto = p.capturados.includes(e.id);
      const costo = costoDe(e);
      const okNivel = p.nivel >= e.captura.nivel;
      const okMonedas = p.monedas >= costo;
      const conocido = visto || okNivel || tengo;
      const hoyNo = e.rareza === 'legendario' && e.id !== hoy.id;
      const puede = okNivel && okMonedas && !hoyNo;
      return `<div class="card ${conocido ? '' : 'locked'} r-${e.rareza}" style="--c:${conocido ? ELEMENTOS[e.elemento].color : '#555'}" ${conocido ? `data-ficha="${e.id}"` : ''}>
        ${tengo ? `<span class="tag owned">${t('capture.owned')}</span>` : ''}
        <div class="top">${conocido ? `<span class="tipos">${tiposTag(e.id)}</span>` : `<span class="el" style="--c:#777">${icono('candado')}${t('capture.locked')}</span>`}<span class="lv">${t('capture.wild', { n: e.captura.nivelSalvaje })}</span></div>
        <div class="stage"><img class="sprite" src="${spriteUrl(e.id)}" alt="" loading="lazy"></div>
        <div class="name">${conocido ? e.nombre : '???'}</div>${rarezaTag(e.id)}
        <div class="reqs">
          <span class="req ${okNivel ? 'ok' : 'no'}">${icono(okNivel ? 'check' : 'candado')}${t('capture.req', { n: e.captura.nivel })}</span>
          <span class="req ${okMonedas ? 'ok' : 'no'}">${icono('moneda')}${costo.toLocaleString()}</span>
        </div>
        <button class="btn ${puede ? 'primary' : ''}" data-capturar="${e.id}" ${puede ? '' : 'disabled'}>${hoyNo ? t('capture.legendLocked') : `${icono('espadas')}${t('capture.go')}`}</button>
      </div>`;
    };
    // el legendario del día va arriba, en grande
    const leg = ESPECIES[hoy.id];
    const costoLeg = costoDe(leg);
    const puedeLeg = p.nivel >= leg.captura.nivel && p.monedas >= costoLeg;
    const destacado = `<div class="leg-hoy" style="--c:${ELEMENTOS[leg.elemento].color}">
      <div class="leg-arte" data-ficha="${leg.id}"><img src="${spriteUrl(leg.id)}" alt=""></div>
      <div class="leg-info">
        <div class="leg-kicker">${icono('corona')}${t('capture.legendTitle')}</div>
        <h3>${leg.nombre}</h3>
        <div class="tipos">${tiposTag(leg.id)}</div>
        <p>${esc(descEspecie(leg.id))}</p>
        <div class="leg-sp">${[0, 1].map((k) => `<span title="${esc(descEspecial(leg.id, k))}">${icono('especial')}${esc(nombreEspecial(leg.id, k))}</span>`).join('')}</div>
        <div class="reqs">
          <span class="req ${p.nivel >= leg.captura.nivel ? 'ok' : 'no'}">${icono(p.nivel >= leg.captura.nivel ? 'check' : 'candado')}${t('capture.req', { n: leg.captura.nivel })}</span>
          <span class="req ${p.monedas >= costoLeg ? 'ok' : 'no'}">${icono('moneda')}${costoLeg.toLocaleString()}</span>
          <span class="req">${icono('reloj')}${t('capture.legendHint', { t: horas(hoy.terminaEn) })}</span>
        </div>
        <div class="leg-acciones"><button class="btn ${puedeLeg ? 'primary' : ''}" data-capturar="${leg.id}" ${puedeLeg ? '' : 'disabled'}>${icono('espadas')}${t('capture.go')}</button>
          <small class="muted">${t('capture.legendNext', { n: ESPECIES[manana.id].nombre })}</small></div>
      </div></div>`;
    const orden = (e: Especie) => RAREZAS[e.rareza].orden * 100 + e.captura.nivel;
    const lista = Object.values(ESPECIES).filter((e) => this.filtro === 'todos' || e.rareza === this.filtro).sort((a, b) => orden(a) - orden(b));
    const filtros = (['todos', 'comun', 'raro', 'epico', 'legendario'] as const).map((f) => {
      const n = f === 'todos' ? Object.keys(ESPECIES).length : Object.values(ESPECIES).filter((e) => e.rareza === f).length;
      return `<button class="chip ${this.filtro === f ? 'on' : ''}" data-filtro="${f}" style="${f !== 'todos' ? `--c:${RAREZAS[f].color}` : ''}">${f === 'todos' ? t('capture.all') : nombreRareza(f)} <b>${n}</b></button>`;
    }).join('');
    return `<div class="page">
      <div class="page-head"><h2>${t('capture.title')}</h2><span class="count">${p.capturados.length}/${Object.keys(ESPECIES).length}</span></div>
      <p class="muted">${t('capture.hint')}</p>
      ${destacado}
      <div class="chips">${filtros}</div>
      <div class="grid">${lista.map(tarjeta).join('')}</div></div>`;
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
      <div class="trainer-head"><button class="th-avatar" id="th-avatar" title="${t('av.edit')}"><img src="${avatarUrl(p.avatar)}" alt=""><span>${icono('mas')}</span></button>
        <div class="tb-level">${p.nivel}</div><div class="info"><b>${esc(p.nombre)}</b><br><small>${t('trainer.level', { n: p.nivel })} · ${p.xpSig ? `${p.xp} / ${p.xpSig} XP` : 'MAX'}</small>
        <div class="xpbar"><div style="width:${p.xpSig ? (p.xp / p.xpSig) * 100 : 100}%"></div></div></div></div>
      <div class="row-btns"><button class="btn ghost" id="btn-tuto">${icono('mira')}${t('tuto.again')}</button><button class="btn ghost" id="btn-historia">${icono('estrella')}${t('intro.again')}</button></div>
      <div class="legales"><a href="#" data-legal="terminos">${t('legal.terminos')}</a> · <a href="#" data-legal="privacidad">${t('legal.privacidad')}</a></div>
      <div class="section-title">${t('trainer.medals')} · ${MEDALLAS.filter((m) => p.nivel >= m.nivel).length}/${MEDALLAS.length}</div>
      <p class="muted" style="margin-top:-4px;font-size:13px">${t('trainer.medalsHint')}</p>
      <div class="medals">${medals}</div>
      <div class="section-title">${t('trainer.skills')} <span class="points ${pts ? '' : 'none'}">${pts > 1 ? t('trainer.points', { n: pts }) : pts === 1 ? t('trainer.points1') : t('trainer.points0')}</span></div>
      ${skills}</div>`;
  }

  // ---------------------------------------------------------------- ranking
  /** Amigos, solicitudes y búsqueda por nombre. */
  private amigosHtml() {
    const s = this.social;
    const sol = s.solicitudes.map((x) => `<div class="amigo sol">${retrato(x.avatar, 'av')}
      <div class="am-info"><b>${esc(x.nombre)}</b><small>${icono('trofeo')}${x.trofeos}</small></div>
      <button class="btn primary sm" data-aceptar="${x.id}">${t('amigos.accept')}</button><button class="btn ghost sm" data-rechazar="${x.id}">${t('amigos.reject')}</button></div>`).join('');
    const lista = s.amigos.map((x) => `<div class="amigo">${retrato(x.avatar, `av ${x.enLinea ? 'on' : ''}`)}
      <div class="am-info"><b>${esc(x.nombre)}</b><small><i class="punto ${x.enLinea ? 'on' : ''}"></i>${x.enLinea ? t('amigos.online') : t('amigos.offline')} · ${icono('trofeo')}${x.trofeos} · ${t('misc.level', { n: x.nivel })}</small></div>
      <button class="btn ${x.enLinea ? 'primary' : ''} sm" data-retar="${x.id}">${icono('espadas')}${t('amigos.challenge')}</button>
      <button class="btn ghost sm am-quitar" data-quitar-amigo="${x.id}" title="${t('amigos.remove')}">✕</button></div>`).join('');
    return `<div class="page-head"><h2>${t('amigos.title')}</h2><span class="count">${s.amigos.length}</span></div>
      <div class="am-buscar"><input id="am-nombre" maxlength="16" placeholder="${t('amigos.placeholder')}"><button class="btn" id="am-agregar">${icono('mas')}${t('amigos.add')}</button></div>
      ${sol ? `<div class="section-title">${t('amigos.requests')}</div>${sol}` : ''}
      ${lista ? `<div class="am-lista">${lista}</div>` : `<p class="muted">${t('amigos.empty')}</p>`}`;
  }

  private async ranking() {
    try {
      const [r, soc] = await Promise.all([api.ranking(), api.social().catch(() => this.social)]);
      this.social = soc;
      if (this.tab !== 'ranking') return;
      $('menu-body').innerHTML = `<div class="page">${this.amigosHtml()}<div class="page-head" style="margin-top:22px"><h2>${t('ranking.title')}</h2></div><div class="rank">` + r.map((x, i) => {
        const l = ligaDe(x.trofeos);
        const yo = x.nombre === this.perfil.nombre;
        return `<div class="rank-row ${yo ? 'me' : ''}"><span class="pos">${i + 1}</span><span class="nm">${esc(x.nombre)}${yo ? ` · ${t('ranking.you')}` : ''}<small>${t('misc.level', { n: x.nivel })}</small></span>
          <span class="lg" style="color:${l.color}">${nombreLiga(l.id)}</span><span class="tr">${icono('trofeo')}${x.trofeos.toLocaleString()}</span></div>`;
      }).join('') + '</div></div>';
      this.bindAmigos();
    } catch (e: any) {
      $('menu-body').innerHTML = `<p class="error">${esc(tError(e.message))}</p>`;
    }
  }

  // ---------------------------------------------------------------- acciones
  private bind() {
    const body = $('menu-body');
    body.querySelector<HTMLButtonElement>('#btn-buscar')?.addEventListener('click', () => void this.buscar());
    body.querySelector<HTMLButtonElement>('#btn-cancelar')?.addEventListener('click', () => { void api.cancelar(); this.buscando = false; this.show('batalla'); });
    body.querySelectorAll<HTMLElement>('[data-poner], [data-quitar]').forEach((el) => (el.onclick = () => this.fichaPropia(el.dataset.poner ?? el.dataset.quitar!)));
    body.querySelectorAll<HTMLElement>('[data-ficha]').forEach((el) => (el.onclick = (ev) => {
      if ((ev.target as HTMLElement).closest('button')) return;
      const esp = el.dataset.ficha!;
      abrirFicha(esp, { perfil: this.perfil, captura: true, acciones: [{ texto: `${icono('espadas')}${t('capture.go')}`, clase: 'primary', fn: () => void this.retar(esp) }] });
    }));
    body.querySelector<HTMLButtonElement>('#amis-crear')?.addEventListener('click', () => void this.crearReto());
    body.querySelector<HTMLButtonElement>('#amis-unirse')?.addEventListener('click', () => void this.unirseReto(body.querySelector<HTMLInputElement>('#amis-input')!.value));
    body.querySelector<HTMLButtonElement>('#amis-copiar')?.addEventListener('click', () => { void navigator.clipboard?.writeText(this.enlaceReto()); toast(t('amis.copied')); });
    body.querySelector<HTMLButtonElement>('#amis-cancelar')?.addEventListener('click', () => { if (this.reto) void api.amistosaCancelar(this.reto); this.reto = null; this.show('batalla'); });
    body.querySelector<HTMLButtonElement>('#btn-tuto')?.addEventListener('click', () => this.onTutorial());
    body.querySelector<HTMLButtonElement>('#btn-historia')?.addEventListener('click', () => this.onHistoria());
    body.querySelector<HTMLButtonElement>('#th-avatar')?.addEventListener('click', () => this.personalizar());
    enlazarLegal(body);
    body.querySelectorAll<HTMLButtonElement>('[data-mision]').forEach((b) => (b.onclick = async () => {
      try { const p = await api.mision(b.dataset.mision!); toast(`+${this.perfil.misiones.find((m) => m.id === b.dataset.mision)?.premio ?? ''} ${t('res.coins')}`); this.setPerfil(p); this.show('batalla'); } catch (e: any) { toast(e.message, true); }
    }));
    body.querySelectorAll<HTMLButtonElement>('[data-capturar]').forEach((b) => (b.onclick = () => void this.retar(b.dataset.capturar!)));
    body.querySelectorAll<HTMLButtonElement>('[data-filtro]').forEach((b) => (b.onclick = () => { this.filtro = b.dataset.filtro as Rareza | 'todos'; this.show('capturar'); }));
    body.querySelectorAll<HTMLButtonElement>('[data-hab]').forEach((b) => (b.onclick = async () => {
      try { this.setPerfil(await api.habilidad(b.dataset.hab!)); this.show('domador'); } catch (e: any) { toast(e.message, true); }
    }));
  }

  /** Ficha de un Primal tuyo con acciones de equipo. */
  private fichaPropia(uid: string) {
    const x = this.perfil.primales.find((p) => p.uid === uid);
    if (!x) return;
    const enEquipo = this.perfil.equipo.includes(uid);
    const acciones = enEquipo
      ? [...(this.perfil.equipo[0] !== uid ? [{ texto: t('ficha.lead'), clase: 'primary', fn: () => void this.cambiarEquipo(uid, true) }] : []),
        { texto: t('ficha.remove'), clase: 'ghost', fn: () => void this.cambiarEquipo(uid, false) }]
      : [{ texto: t('ficha.add'), clase: 'primary', fn: () => void this.cambiarEquipo(uid, true) }];
    abrirFicha(x.esp, { perfil: this.perfil, uid, acciones });
  }

  private enlaceReto() {
    return `${location.origin}/?reto=${this.reto}`;
  }

  private async crearReto() {
    try {
      const { codigo } = await api.amistosaCrear();
      this.reto = codigo;
      this.show('batalla');
      const r = await api.amistosaEsperar(codigo);
      this.reto = null;
      this.onBatalla(r.roomId);
    } catch (e: any) {
      this.reto = null;
      if (!/cancelado/.test(e.message)) toast(e.message, true);
      if (this.tab === 'batalla') this.show('batalla');
    }
  }

  async unirseReto(codigo: string) {
    try {
      const r = await api.amistosaUnirse(codigo.trim().toUpperCase());
      this.onBatalla(r.roomId);
    } catch (e: any) { toast(e.message, true); }
  }

  private bindAmigos() {
    const body = $('menu-body');
    const recargar = () => void this.ranking();
    body.querySelector<HTMLButtonElement>('#am-agregar')?.addEventListener('click', async () => {
      const nombre = body.querySelector<HTMLInputElement>('#am-nombre')!.value.trim();
      if (!nombre) return;
      try { const r = await api.amigoSolicitar({ nombre }); toast(r.amigos ? t('amigos.now') : t('amigos.sent')); recargar(); } catch (e: any) { toast(e.message, true); }
    });
    body.querySelectorAll<HTMLElement>('[data-aceptar], [data-rechazar]').forEach((b) => (b.onclick = async () => {
      try { await api.amigoResponder(Number(b.dataset.aceptar ?? b.dataset.rechazar), !!b.dataset.aceptar); recargar(); } catch (e: any) { toast(e.message, true); }
    }));
    body.querySelectorAll<HTMLElement>('[data-quitar-amigo]').forEach((b) => (b.onclick = async () => { await api.amigoQuitar(Number(b.dataset.quitarAmigo)); recargar(); }));
    body.querySelectorAll<HTMLElement>('[data-retar]').forEach((b) => (b.onclick = () => void this.retarAmigo(Number(b.dataset.retar))));
  }

  /** Reta a un amigo: le aparece la invitación en el juego. */
  private async retarAmigo(id: number) {
    try {
      const { codigo } = await api.amistosaRetar(id);
      this.reto = codigo;
      this.show('batalla');
      const r = await api.amistosaEsperar(codigo);
      this.reto = null;
      this.onBatalla(r.roomId);
    } catch (e: any) {
      this.reto = null;
      if (!/cancelado/.test(e.message)) toast(e.message, true);
      if (this.tab === 'batalla') this.show('batalla');
    }
  }

  /** Revisa solicitudes y retos de amigos (cada pocos segundos mientras estás en el menú). */
  async revisarSocial(onReto: (codigo: string, de: string) => void) {
    try {
      const s = await api.social();
      const nuevos = s.retos.filter((r) => !this.social.retos.some((x) => x.codigo === r.codigo));
      this.social = s;
      document.querySelector('#tabs [data-tab=ranking]')!.classList.toggle('aviso', s.solicitudes.length > 0);
      for (const r of nuevos) onReto(r.codigo, r.de);
    } catch { /* sin conexión: se intenta luego */ }
  }

  private async cambiarEquipo(uid: string, poner: boolean) {
    let eq = [...this.perfil.equipo];
    if (poner) {
      if (eq.includes(uid)) eq = [uid, ...eq.filter((u) => u !== uid)]; // lo pone al frente
      else if (eq.length >= TAM_EQUIPO) return toast(`Tu equipo está lleno (${TAM_EQUIPO}). Quita uno primero.`, true);
      else eq.push(uid);
    } else {
      if (eq.length <= 1) return toast('Tu equipo necesita al menos un Primal.', true);
      eq = eq.filter((u) => u !== uid);
    }
    try { this.setPerfil(await api.equipo(eq)); this.show('equipo'); } catch (e: any) { toast(e.message, true); }
  }

  /** Editor del avatar. */
  personalizar() {
    editarAvatar(this.perfil.avatar, async (a) => {
      try { this.setPerfil(await api.avatar(a)); toast(t('av.saved')); if (this.tab === 'domador') this.show('domador'); } catch (e: any) { toast(e.message, true); }
    });
  }

  /** Buscar otra batalla de inmediato (botón Revancha). */
  revancha() {
    this.show('batalla');
    void this.buscar();
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

/** Pantalla de elegir los 3 Primales iniciales. Devuelve una función para repintarla (cambio de idioma). */
export function pantallaInicial(onElegido: (p: Perfil) => void): () => void {
  const sel: string[] = [];
  $('starter').classList.remove('hidden');
  const pintar = () => {
    $('starter-list').innerHTML = INICIALES.map((id) => {
      const e = ESPECIES[id];
      const k = sel.indexOf(id);
      const final = ESPECIES[ESPECIES[e.evoluciona!.a].evoluciona?.a ?? e.evoluciona!.a];
      return `<div class="starter ${k >= 0 ? 'sel' : ''}" style="--c:${ELEMENTOS[e.elemento].color}" data-id="${id}">
        ${k >= 0 ? `<span class="pick-n">${k + 1}</span>` : ''}<button class="info-btn" data-info="${id}" aria-label="Info">i</button>
        <div class="stage"><img class="sprite" src="${spriteUrl(id)}" alt=""></div>
        <h3>${e.nombre}</h3>${elTag(e.elemento)}<p>${esc(descEspecie(id))}</p>
        <div class="evo-chain"><img src="${spriteUrl(e.evoluciona!.a)}" alt="" title="${ESPECIES[e.evoluciona!.a].nombre}"><img src="${spriteUrl(final.id)}" alt="" title="${final.nombre}"></div></div>`;
    }).join('');
    const b = $('btn-starter') as HTMLButtonElement;
    const faltan = NUM_INICIALES - sel.length;
    b.disabled = faltan > 0;
    b.textContent = faltan > 0 ? t('starter.pick', { n: faltan }) : t('starter.confirm');
    document.querySelectorAll<HTMLElement>('.info-btn').forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); abrirFicha(b.dataset.info!); }));
    document.querySelectorAll<HTMLElement>('.starter').forEach((el) => (el.onclick = () => {
      const id = el.dataset.id!;
      const k = sel.indexOf(id);
      if (k >= 0) sel.splice(k, 1);
      else if (sel.length < NUM_INICIALES) sel.push(id);
      pintar();
    }));
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
