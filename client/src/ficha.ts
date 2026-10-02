// Ficha de un Primal: descripción, estadísticas, movimientos (y a qué nivel se aprenden),
// técnicas especiales, habilidad y línea evolutiva. Al capturar, además, un medidor de dificultad.

import {
  DESBLOQUEO, ELEMENTOS, ESPECIES, MOVIMIENTOS, RAREZAS, efectividad, especialesDe, statsPrimal, tipos,
  type Elemento, type Perfil,
} from '../../shared/src';
import { api, spriteUrl } from './api';
import { icono } from './iconos';
import { descEspecial, descEspecie, descHab, descMov, nombreElemento, nombreEspecial, nombreHab, nombreMov, t } from './i18n';
import { avatarUrl } from './avatar';
import { LEGAL, NUM_ENTRENADORES, type Avatar } from '../../shared/src';
import { idioma } from './i18n';
import { esc, rarezaTag, tiposTag, toast } from './menu';
import { tError } from './i18n';

const $ = (id: string) => document.getElementById(id)!;

/** Toda la línea evolutiva de una especie, en orden. */
export function lineaEvolutiva(esp: string): string[] {
  let raiz = esp;
  for (;;) {
    const padre = Object.values(ESPECIES).find((e) => e.evoluciona?.a === raiz);
    if (!padre) break;
    raiz = padre.id;
  }
  const out = [raiz];
  while (ESPECIES[out[out.length - 1]].evoluciona) out.push(ESPECIES[out[out.length - 1]].evoluciona!.a);
  return out;
}

/** Poder aproximado de un Primal a un nivel (para comparar equipos). */
function poder(esp: string, nivel: number) {
  const s = statsPrimal(ESPECIES[esp], nivel);
  return Math.sqrt((s.vida / 10) * s.ataque) * (1 + s.defensa / 220) * (1 + (s.velocidad - 180) / 900);
}

/** El mejor multiplicador de tipo que puede usar un Primal contra unos tipos. */
function mejorEf(atacante: string, contra: Elemento[]) {
  const els = new Set<Elemento>([...tipos(atacante), ...ESPECIES[atacante].movimientos.map((m) => MOVIMIENTOS[m].elemento)]);
  return Math.max(...[...els].map((e) => efectividad(e, contra)));
}

export type Dificultad = 'facil' | 'parejo' | 'dificil' | 'muy';
export function dificultad(p: Perfil, esp: string): { nivel: Dificultad; ratio: number; contras: Elemento[] } {
  const e = ESPECIES[esp];
  const nv = e.captura.nivelSalvaje + 2;
  const equipo = p.equipo.map((u) => p.primales.find((x) => x.uid === u)).filter(Boolean) as Perfil['primales'];
  const suyo = tipos(esp);
  let yo = 0;
  for (const x of equipo) yo += poder(x.esp, x.nivel) * mejorEf(x.esp, suyo) / mejorEf(esp, tipos(x.esp));
  // el salvaje pelea solo contra tus 3, pero es más listo cuanto más raro
  const el = poder(esp, nv) * (1 + RAREZAS[e.rareza].ia * 0.9) * 1.5;
  const ratio = yo / el;
  const nivel: Dificultad = ratio > 1.7 ? 'facil' : ratio > 1.2 ? 'parejo' : ratio > 0.85 ? 'dificil' : 'muy';
  const contras = (Object.keys(ELEMENTOS) as Elemento[]).filter((x) => efectividad(x, suyo) > 1);
  return { nivel, ratio, contras };
}

const COLOR_DIF: Record<Dificultad, string> = { facil: '#4ee08a', parejo: '#ffd23c', dificil: '#ff9a3c', muy: '#ff4f6a' };

export interface OpcionesFicha {
  perfil?: Perfil;
  uid?: string; // si es un Primal tuyo
  captura?: boolean; // muestra el medidor de dificultad y el botón de retar
  acciones?: { texto: string; clase?: string; fn: () => void }[];
}

export function abrirFicha(esp: string, o: OpcionesFicha = {}) {
  const e = ESPECIES[esp];
  const mio = o.uid && o.perfil ? o.perfil.primales.find((x) => x.uid === o.uid) : undefined;
  const nivel = mio?.nivel ?? (o.captura ? e.captura.nivelSalvaje : undefined);
  const s = statsPrimal(e, nivel ?? 20);
  const color = ELEMENTOS[e.elemento].color;
  const barra = (k: Parameters<typeof t>[0], v: number, max: number, num: number) =>
    `<div class="stat"><span>${t(k)}</span><div class="bar"><div style="width:${Math.min(100, (v / max) * 100)}%"></div></div><b>${num}</b></div>`;
  const movs = e.movimientos.map((id, i) => {
    const m = MOVIMIENTOS[id];
    const nv = e.rareza === 'legendario' ? 1 : DESBLOQUEO[i];
    const ok = nivel !== undefined && nivel >= nv;
    return `<div class="f-mov ${nivel !== undefined && !ok ? 'lock' : ''}" style="--c:${ELEMENTOS[m.elemento].color}">
      <span class="f-ic">${icono(m.tipo)}</span>
      <div><b>${esc(nombreMov(id))}</b> <span class="el mini" style="--c:${ELEMENTOS[m.elemento].color}">${icono(m.elemento)}${nombreElemento(m.elemento)}</span><small>${esc(descMov(id))}</small></div>
      <span class="f-nv">${ok ? `${icono('check')}` : `${nivel !== undefined ? icono('candado') : ''}${t('ficha.learnAt', { n: nv })}`}</span></div>`;
  }).join('');
  const sps = especialesDe(esp).map((sp, k) => `<div class="f-mov sp" style="--c:${ELEMENTOS[sp.elemento].color}"><span class="f-ic">${icono('especial')}</span>
      <div><b>${esc(nombreEspecial(esp, k))}</b> <span class="key-chip">${k ? 'T' : 'R'}</span><small>${esc(descEspecial(esp, k))}</small></div></div>`).join('');
  const linea = lineaEvolutiva(esp);
  const evo = linea.length > 1
    ? `<div class="f-evo">${linea.map((id, i) => `${i ? `<span class="f-flecha">${icono('crecer')}<small>${t('ficha.evoAt', { n: ESPECIES[linea[i - 1]].evoluciona!.nivel })}</small></span>` : ''}
        <button class="f-evo-item ${id === esp ? 'on' : ''}" data-ver="${id}"><img src="${spriteUrl(id)}" alt=""><span>${ESPECIES[id].nombre}</span></button>`).join('')}</div>`
    : `<p class="muted">${t('ficha.noEvo')}</p>`;
  let dif = '';
  if (o.captura && o.perfil) {
    const d = dificultad(o.perfil, esp);
    const pct = Math.max(6, Math.min(100, (d.ratio / 2.2) * 100));
    dif = `<div class="f-dif" style="--d:${COLOR_DIF[d.nivel]}">
      <div class="f-dif-top"><b>${t('dif.title')}</b><span class="f-dif-tag">${t(`dif.${d.nivel}` as Parameters<typeof t>[0])}</span></div>
      <div class="f-dif-bar"><div style="width:${pct}%"></div></div>
      <p>${t(`dif.${d.nivel}Txt` as Parameters<typeof t>[0])}</p>
      <div class="tipos">${d.contras.length ? `<small class="muted">${t('dif.counter', { t: '' })}</small>${d.contras.map((x) => `<span class="el" style="--c:${ELEMENTOS[x].color}">${icono(x)}${nombreElemento(x)}</span>`).join('')}` : ''}</div>
    </div>`;
  }
  $('ficha-body').innerHTML = `
    <button class="f-cerrar" aria-label="${t('ficha.close')}">✕</button>
    <div class="f-head" style="--c:${color}">
      <div class="f-arte ${e.rareza}"><img src="${spriteUrl(esp)}" alt=""></div>
      <div class="f-titulo">
        ${rarezaTag(esp)}
        <h2>${e.nombre}</h2>
        <div class="tipos">${tiposTag(esp)}</div>
        ${mio ? `<div class="f-tuyo">${t('ficha.yours', { n: mio.nivel })}</div>` : o.captura ? `<div class="f-tuyo">${t('capture.wild', { n: e.captura.nivelSalvaje })}</div>` : ''}
        <p>${esc(descEspecie(esp))}</p>
      </div>
    </div>
    ${dif}
    <div class="f-cols">
      <div>
        <div class="section-title">${t('ficha.stats')}${nivel !== undefined ? ` · ${t('misc.level', { n: nivel })}` : ''}</div>
        <div class="stats" style="--c:${color}">
          ${barra('stat.hp', e.base.vida, 120, s.vida)}${barra('stat.atk', e.base.ataque, 120, s.ataque)}${barra('stat.def', e.base.defensa, 120, s.defensa)}${barra('stat.spd', e.base.velocidad, 120, e.base.velocidad)}
        </div>
        <div class="section-title">${t('ficha.ability')}</div>
        <div class="f-hab"><b>${icono('estrella')}${esc(nombreHab(e.habilidad))}</b><small>${esc(descHab(e.habilidad))}</small></div>
        <div class="section-title">${t('ficha.evo')}</div>
        ${evo}
      </div>
      <div>
        <div class="section-title">${t('ficha.moves')}</div>
        ${movs}
        <div class="section-title">${t('ficha.specials')}</div>
        ${sps}
      </div>
    </div>
    ${o.acciones?.length ? `<div class="f-acciones">${o.acciones.map((a, i) => `<button class="btn ${a.clase ?? ''}" data-acc="${i}">${a.texto}</button>`).join('')}</div>` : ''}`;
  $('ficha').classList.remove('hidden');
  const cerrar = () => $('ficha').classList.add('hidden');
  $('ficha-body').querySelector<HTMLElement>('.f-cerrar')!.onclick = cerrar;
  $('ficha').onclick = (ev) => { if (ev.target === $('ficha')) cerrar(); };
  $('ficha-body').querySelectorAll<HTMLElement>('[data-acc]').forEach((b) => (b.onclick = () => { cerrar(); o.acciones![Number(b.dataset.acc)].fn(); }));
  // ver otra etapa de la línea (sin acciones, solo información)
  $('ficha-body').querySelectorAll<HTMLElement>('[data-ver]').forEach((b) => (b.onclick = () => { if (b.dataset.ver !== esp) abrirFicha(b.dataset.ver!, { perfil: o.perfil }); }));
}

/** Ventana simple con título, texto y botones (tutorial, avisos). */
export function dialogo(titulo: string, texto: string, botones: { texto: string; clase?: string; fn: () => void }[]) {
  $('ficha-body').innerHTML = `<div class="dlg"><h2 class="display">${titulo}</h2><p class="muted">${texto}</p>
    <div class="f-acciones">${botones.map((b, i) => `<button class="btn ${b.clase ?? ''}" data-b="${i}">${b.texto}</button>`).join('')}</div></div>`;
  $('ficha').classList.remove('hidden');
  $('ficha').onclick = null;
  $('ficha-body').querySelectorAll<HTMLElement>('[data-b]').forEach((el) => (el.onclick = () => { $('ficha').classList.add('hidden'); botones[Number(el.dataset.b)].fn(); }));
}

/** Editor del avatar: eliges tu entrenador entre los ilustrados. */
export function editarAvatar(actual: Avatar, onGuardar: (a: Avatar) => void) {
  let a = { ...actual };
  const pintar = () => {
    $('ficha-body').innerHTML = `<button class="f-cerrar">✕</button>
      <div class="av-editor">
        <div class="av-vista"><div class="av-foco"></div><img src="${avatarUrl(a)}" alt=""></div>
        <div class="av-opciones"><h2 class="display">${t('av.title')}</h2>
          <div class="av-grid">${Array.from({ length: NUM_ENTRENADORES }, (_, i) => `<button class="av-op ${i === a.modelo ? 'on' : ''}" data-m="${i}"><img src="${avatarUrl({ modelo: i })}" alt=""></button>`).join('')}</div>
          <div class="f-acciones"><button class="btn primary big" id="av-guardar">${t('av.save')}</button></div>
        </div>
      </div>`;
    $('ficha-body').querySelector<HTMLElement>('.f-cerrar')!.onclick = () => $('ficha').classList.add('hidden');
    $('ficha-body').querySelectorAll<HTMLElement>('.av-op').forEach((b) => (b.onclick = () => { a = { modelo: Number(b.dataset.m) }; pintar(); }));
    $('av-guardar').onclick = () => { $('ficha').classList.add('hidden'); onGuardar(a); };
  };
  $('ficha').classList.remove('hidden');
  $('ficha').onclick = (ev) => { if (ev.target === $('ficha')) $('ficha').classList.add('hidden'); };
  pintar();
}

/** Términos o Política de Privacidad en una ventana. */
export function mostrarLegal(tipo: 'terminos' | 'privacidad', alCerrar?: () => void) {
  const doc = LEGAL[idioma][tipo];
  $('ficha-body').innerHTML = `<button class="f-cerrar">✕</button><div class="legal"><h2 class="display">${doc.titulo}</h2>
    ${doc.secciones.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join('')}</div>`;
  $('ficha').classList.remove('hidden');
  const cerrar = () => { $('ficha').classList.add('hidden'); alCerrar?.(); };
  $('ficha-body').querySelector<HTMLElement>('.f-cerrar')!.onclick = cerrar;
  $('ficha').onclick = (ev) => { if (ev.target === $('ficha')) cerrar(); };
  $('ficha-body').scrollTop = 0;
}

/** Texto de "acepto" con enlaces a los dos documentos. */
export function textoAcepto() {
  const L = LEGAL[idioma];
  return esc(L.acepto).replace('{t}', `<a href="#" data-legal="terminos">${L.terminos.titulo}</a>`).replace('{p}', `<a href="#" data-legal="privacidad">${L.privacidad.titulo}</a>`);
}
export function enlazarLegal(raiz: HTMLElement, alCerrar?: () => void) {
  raiz.querySelectorAll<HTMLElement>('[data-legal]').forEach((a) => (a.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); mostrarLegal(a.dataset.legal as 'terminos' | 'privacidad', alCerrar); }));
}

/** Buzón de sugerencias: ideas, pedidos de Primales o funciones, errores. */
export function abrirBuzon() {
  const tipos = ['idea', 'primal', 'error', 'otro'];
  let tipo = 'idea';
  $('ficha-body').innerHTML = `<button class="f-cerrar">✕</button><div class="buzon">
    <h2 class="display">${icono('carta')}${t('buzon.title')}</h2><p class="muted">${t('buzon.sub')}</p>
    <div class="bz-tipos">${tipos.map((x) => `<button class="chip${x === tipo ? ' on' : ''}" data-tipo="${x}">${t(('buzon.' + x) as 'buzon.idea')}</button>`).join('')}</div>
    <textarea id="bz-texto" maxlength="1000" rows="5" placeholder="${esc(t('buzon.ph'))}"></textarea>
    <div class="bz-pie"><small id="bz-cuenta">0 / 1000</small><button class="btn primary" id="bz-enviar">${t('buzon.send')}</button></div></div>`;
  $('ficha').classList.remove('hidden');
  const cerrar = () => $('ficha').classList.add('hidden');
  $('ficha-body').querySelector<HTMLElement>('.f-cerrar')!.onclick = cerrar;
  $('ficha').onclick = (ev) => { if (ev.target === $('ficha')) cerrar(); };
  const area = $('bz-texto') as HTMLTextAreaElement;
  area.oninput = () => ($('bz-cuenta').textContent = `${area.value.length} / 1000`);
  $('ficha-body').querySelectorAll<HTMLElement>('[data-tipo]').forEach((b) => (b.onclick = () => {
    tipo = b.dataset.tipo!;
    $('ficha-body').querySelectorAll('[data-tipo]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  const enviar = $('bz-enviar') as HTMLButtonElement;
  enviar.onclick = async () => {
    if (area.value.trim().length < 5) { toast(t('buzon.corto'), true); return; }
    enviar.disabled = true;
    try {
      await api.buzon(tipo, area.value);
      cerrar();
      toast(t('buzon.thanks'));
    } catch (e: any) { toast(tError(e.message), true); enviar.disabled = false; }
  };
  setTimeout(() => area.focus(), 50);
}
