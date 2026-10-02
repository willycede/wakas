// Panel del dueño: cuántos juegan, cuánto juegan y si vuelven. Se actualiza solo cada 30 s.

const $ = (id: string) => document.getElementById(id)!;
const tip = $('tip');

interface Resumen {
  ahora: { enLinea: number; enBatalla: number; enCola: number };
  totales: { jugadores: number; conEquipo: number; horas: number; batallas: number; tutorial: number };
  hoy: { activos: number; nuevos: number; batallas: number; horas: number; pico: number; esperaMedia: number | null };
  dau: number; wau: number; mau: number;
  retencion: { d1: { base: number; vuelven: number; pct: number | null }; d7: { base: number; vuelven: number; pct: number | null } };
  serie: { dia: number; activos: number; nuevos: number; batallas: Record<string, number>; horas: number; vsIA: number; vsHumano: number }[];
  primales: { esp: string; nombre: string; n: number }[];
  iniciales: { esp: string; nombre: string; n: number }[];
  ligas: { id: string; nombre: string; jugadores: number }[];
  paises: { codigo: string; n: number }[];
  horas: number[]; // batallas por hora local del jugador, últimos 30 días
}

const nombresPais = (() => { try { return new Intl.DisplayNames(['es'], { type: 'region' }); } catch { return null; } })();
const bandera = (c: string) => (/^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map((l) => 0x1f1e6 + l.charCodeAt(0) - 65)) : '🌐');
const pais = (c: string) => (c === '??' ? 'Desconocido' : `${bandera(c)} ${nombresPais?.of(c) ?? c}`);
const hora = (h: number) => `${String(h).padStart(2, '0')}:00`;

const fecha = (dia: number) => new Date(dia * 86_400_000).toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const num = (n: number) => n.toLocaleString('es');
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function mostrarTip(ev: MouseEvent, html: string) {
  tip.innerHTML = html;
  tip.hidden = false;
  const x = Math.min(window.innerWidth - tip.offsetWidth - 10, ev.clientX + 14);
  tip.style.left = `${x}px`;
  tip.style.top = `${ev.clientY + 14}px`;
}
const ocultarTip = () => (tip.hidden = true);

/** Columnas (apiladas si hay varias series) con eje, cuadrícula y tooltip por columna. */
function columnas(series: { nombre: string; color: string; valores: number[] }[], dias: number[], unidad = '', etq: (d: number) => string = fecha): string {
  const W = 600, H = 200, mi = 34, ab = 22, ar = 8;
  const n = dias.length;
  const totales = dias.map((_, i) => series.reduce((s, x) => s + x.valores[i], 0));
  const max = Math.max(1, ...totales);
  const paso = niceStep(max);
  const tope = Math.ceil(max / paso) * paso;
  const y = (v: number) => H - ab - ((H - ab - ar) * v) / tope;
  const bw = (W - mi) / n;
  let svg = '';
  for (let v = 0; v <= tope; v += paso) svg += `<line class="grid" x1="${mi}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${mi - 6}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`;
  dias.forEach((d, i) => {
    let base = 0;
    const x = mi + i * bw + 1.5, w = Math.max(1, bw - 3);
    series.forEach((s, k) => {
      const v = s.valores[i];
      if (!v) return;
      const y0 = y(base), y1 = y(base + v);
      const arriba = series.slice(k + 1).every((t) => !t.valores[i]);
      // 2 px de separación entre segmentos; el de arriba con la punta redondeada
      const h = Math.max(1, y0 - y1 - (base ? 2 : 0));
      svg += arriba
        ? `<path d="M${x},${y0 - (base ? 2 : 0)} V${y1 + Math.min(4, h)} Q${x},${y1} ${x + Math.min(4, w / 2)},${y1} H${x + w - Math.min(4, w / 2)} Q${x + w},${y1} ${x + w},${y1 + Math.min(4, h)} V${y0 - (base ? 2 : 0)} Z" fill="${s.color}"/>`
        : `<rect x="${x}" y="${y1}" width="${w}" height="${h}" fill="${s.color}"/>`;
      base += v;
    });
    if (i % Math.ceil(n / 6) === 0 || i === n - 1) svg += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${etq(d)}</text>`;
    svg += `<rect class="hit" x="${mi + i * bw}" y="0" width="${bw}" height="${H - ab}" data-i="${i}"/>`;
  });
  const id = `c${Math.random().toString(36).slice(2)}`;
  setTimeout(() => {
    document.querySelectorAll<SVGRectElement>(`#${id} .hit`).forEach((r) => {
      const i = Number(r.dataset.i);
      r.onmousemove = (ev) => mostrarTip(ev, `<b>${etq(dias[i])}</b>${series.map((s) => `<div><i style="background:${s.color}"></i>${esc(s.nombre)}: ${num(s.valores[i])}${unidad}</div>`).join('')}${series.length > 1 ? `<div>Total: ${num(totales[i])}${unidad}</div>` : ''}`);
      r.onmouseleave = ocultarTip;
    });
  });
  return `<svg class="chart" id="${id}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${svg}</svg>`;
}

/** Línea con área suave (una serie) y cruz con tooltip. */
function linea(valores: number[], dias: number[], color: string, nombre: string): string {
  const W = 600, H = 200, mi = 34, ab = 22, ar = 8;
  const max = Math.max(1, ...valores), paso = niceStep(max), tope = Math.ceil(max / paso) * paso;
  const x = (i: number) => mi + ((W - mi) * i) / Math.max(1, valores.length - 1);
  const y = (v: number) => H - ab - ((H - ab - ar) * v) / tope;
  let svg = '';
  for (let v = 0; v <= tope; v += paso) svg += `<line class="grid" x1="${mi}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${mi - 6}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`;
  const pts = valores.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  svg += `<polygon points="${x(0)},${y(0)} ${pts} ${x(valores.length - 1)},${y(0)}" fill="${color}" opacity=".16"/>`;
  svg += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  dias.forEach((d, i) => { if (i % Math.ceil(dias.length / 6) === 0 || i === dias.length - 1) svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${fecha(d)}</text>`; });
  svg += `<line class="cruz" x1="0" x2="0" y1="${ar}" y2="${H - ab}" visibility="hidden"/><circle class="punto" r="4" fill="${color}" stroke="#17122b" stroke-width="2" visibility="hidden"/>`;
  svg += `<rect class="hit" x="${mi}" y="0" width="${W - mi}" height="${H - ab}"/>`;
  const id = `l${Math.random().toString(36).slice(2)}`;
  setTimeout(() => {
    const el = document.getElementById(id) as unknown as SVGSVGElement;
    const cruz = el.querySelector<SVGLineElement>('.cruz')!, punto = el.querySelector<SVGCircleElement>('.punto')!;
    const hit = el.querySelector<SVGRectElement>('.hit')!;
    hit.onmousemove = (ev) => {
      const r = el.getBoundingClientRect();
      const fx = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(valores.length - 1, Math.round(((fx - mi) / (W - mi)) * (valores.length - 1))));
      cruz.setAttribute('x1', String(x(i))); cruz.setAttribute('x2', String(x(i))); cruz.setAttribute('visibility', 'visible');
      punto.setAttribute('cx', String(x(i))); punto.setAttribute('cy', String(y(valores[i]))); punto.setAttribute('visibility', 'visible');
      mostrarTip(ev, `<b>${fecha(dias[i])}</b><div><i style="background:${color}"></i>${esc(nombre)}: ${num(valores[i])}</div>`);
    };
    hit.onmouseleave = () => { cruz.setAttribute('visibility', 'hidden'); punto.setAttribute('visibility', 'hidden'); ocultarTip(); };
  });
  return `<svg class="chart" id="${id}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${svg}</svg>`;
}

function niceStep(max: number) {
  const bruto = max / 4, p = Math.pow(10, Math.floor(Math.log10(bruto)));
  return [1, 2, 5, 10].map((k) => k * p).find((s) => s >= bruto) ?? p * 10;
}

function barras(items: { nombre: string; n: number }[], unidad = '') {
  if (!items.length) return '<div class="vacio">Todavía no hay datos.</div>';
  const max = Math.max(...items.map((x) => x.n), 1);
  return `<div class="barras">${items.map((x) => `<div class="barra"><span title="${esc(x.nombre)}">${esc(x.nombre)}</span><div class="p" style="width:${(x.n / max) * 100}%"></div><b>${num(x.n)}${unidad}</b></div>`).join('')}</div>`;
}

function medidor(titulo: string, valor: number | null, detalle: string, ayuda = '') {
  return `<div class="medidor"><div class="fila"><span>${titulo}</span><b>${pct(valor)}</b></div>
    <div class="pista"><div style="width:${Math.round((valor ?? 0) * 100)}%"></div></div><small>${detalle}${ayuda ? ` · ${ayuda}` : ''}</small></div>`;
}

function tabla(cab: string[], filas: (string | number)[][]) {
  return `<details><summary>Ver como tabla</summary><table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${typeof c === 'number' ? num(c) : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
}

function pintar(r: Resumen) {
  const dias = r.serie.map((s) => s.dia);
  const modos = [
    { id: 'liga', nombre: 'Liga', color: 'var(--series-1)' }, { id: 'captura', nombre: 'Captura', color: 'var(--series-2)' },
    { id: 'amistosa', nombre: 'Amistosa', color: 'var(--series-3)' }, { id: 'tutorial', nombre: 'Tutorial', color: 'var(--series-4)' },
  ];
  const vsIA = r.serie.reduce((s, x) => s + x.vsIA, 0), vsH = r.serie.reduce((s, x) => s + x.vsHumano, 0);
  $('panel').innerHTML = `
    <section class="kpis">
      <div class="kpi"><small><span class="vivo"></span>En línea ahora</small><b>${num(r.ahora.enLinea)}</b><span>${num(r.ahora.enBatalla)} en batalla · ${num(r.ahora.enCola)} buscando rival</span></div>
      <div class="kpi"><small>Jugadores registrados</small><b>${num(r.totales.jugadores)}</b><span>+${num(r.hoy.nuevos)} hoy</span></div>
      <div class="kpi"><small>Activos hoy</small><b>${num(r.dau)}</b><span>${num(r.wau)} esta semana · ${num(r.mau)} este mes</span></div>
      <div class="kpi"><small>Horas jugadas</small><b>${num(r.totales.horas)}</b><span>${num(r.hoy.horas)} h hoy · ${r.totales.conEquipo ? num(Math.round((r.totales.horas / r.totales.conEquipo) * 60)) : 0} min por jugador</span></div>
      <div class="kpi"><small>Batallas</small><b>${num(r.serie.reduce((s, x) => s + Object.values(x.batallas).reduce((a, b) => a + b, 0), 0))}</b><span>${num(r.hoy.batallas)} hoy · últimos 30 días</span></div>
      <div class="kpi"><small>Pico de hoy</small><b>${num(r.hoy.pico)}</b><span>jugadores a la vez${r.hoy.esperaMedia !== null ? ` · espera media ${r.hoy.esperaMedia} s` : ''}</span></div>
    </section>
    <section class="grid2">
      <div class="card"><h2>Jugadores activos por día</h2><p class="sub">Entrenadores distintos que entraron cada día · últimos 30 días</p>
        ${linea(r.serie.map((s) => s.activos), dias, 'var(--series-1)', 'Activos')}
        ${tabla(['Día', 'Activos', 'Nuevos'], r.serie.map((s) => [fecha(s.dia), s.activos, s.nuevos]))}</div>
      <div class="card"><h2>Jugadores nuevos por día</h2><p class="sub">Cuentas creadas cada día</p>
        ${columnas([{ nombre: 'Nuevos', color: 'var(--series-1)', valores: r.serie.map((s) => s.nuevos) }], dias)}</div>
    </section>
    <section class="grid2">
      <div class="card"><h2>Batallas por día</h2><p class="sub">Por tipo de batalla</p>
        <div class="leyenda">${modos.map((m) => `<span><i style="background:${m.color}"></i>${m.nombre}</span>`).join('')}</div>
        ${columnas(modos.map((m) => ({ nombre: m.nombre, color: m.color, valores: r.serie.map((s) => s.batallas[m.id] ?? 0) })), dias)}
        ${tabla(['Día', ...modos.map((m) => m.nombre)], r.serie.map((s) => [fecha(s.dia), ...modos.map((m) => s.batallas[m.id] ?? 0)]))}</div>
      <div class="card"><h2>Horas jugadas por día</h2><p class="sub">Tiempo total en batalla de todos los jugadores</p>
        ${columnas([{ nombre: 'Horas', color: 'var(--series-1)', valores: r.serie.map((s) => s.horas) }], dias, ' h')}</div>
    </section>
    <section class="grid2">
      <div class="card"><h2>¿Vuelven a jugar?</h2><p class="sub">La señal más importante de que el juego engancha</p>
        <div class="medidores">
          ${medidor('Vuelven al día siguiente', r.retencion.d1.pct, `${num(r.retencion.d1.vuelven)} de ${num(r.retencion.d1.base)} jugadores nuevos`, 'bueno: más de 35%')}
          ${medidor('Vuelven a la semana', r.retencion.d7.pct, `${num(r.retencion.d7.vuelven)} de ${num(r.retencion.d7.base)} jugadores nuevos`, 'bueno: más de 15%')}
          ${medidor('Terminan el tutorial', r.totales.conEquipo ? r.totales.tutorial / r.totales.conEquipo : null, `${num(r.totales.tutorial)} de ${num(r.totales.conEquipo)} jugadores`)}
          ${medidor('Batallas de Liga contra personas', vsIA + vsH ? vsH / (vsIA + vsH) : null, `${num(vsH)} contra personas · ${num(vsIA)} contra la IA`, 'sube cuando hay más gente en línea')}
        </div></div>
      <div class="card"><h2>Jugadores por liga</h2><p class="sub">Dónde están los jugadores según sus trofeos</p>
        ${barras(r.ligas.map((l) => ({ nombre: l.nombre, n: l.jugadores })))}</div>
    </section>
    <section class="grid2">
      <div class="card"><h2>Primales más usados en la Liga</h2><p class="sub">Batallas en las que pelearon · top 10</p>${barras(r.primales)}
        <p class="ayuda">Si uno aparece muy por encima del resto, puede estar demasiado fuerte.</p></div>
      <div class="card"><h2>Iniciales favoritos</h2><p class="sub">Cuántos jugadores eligieron cada inicial</p>${barras(r.iniciales)}</div>
    </section>
    <section class="card buzon" id="buzon"></section>
    <section class="grid2">
      <div class="card"><h2>¿De dónde juegan?</h2><p class="sub">Jugadores activos en los últimos 30 días por país (aproximado, según la zona horaria)</p>
        ${barras(r.paises.map((x) => ({ nombre: pais(x.codigo), n: x.n })))}</div>
      <div class="card"><h2>¿A qué hora juegan?</h2><p class="sub">Batallas por hora del día (hora local de cada jugador) · últimos 30 días</p>
        ${columnas([{ nombre: 'Batallas', color: 'var(--series-1)', valores: r.horas }], r.horas.map((_, h) => h), '', hora)}
        <p class="ayuda">Útil para elegir a qué hora hacer eventos o mantenimiento.</p>
        ${tabla(['Hora', 'Batallas'], r.horas.map((v, h) => [hora(h), v]))}</div>
    </section>`;
  pintarBuzon();
  $('actualizado').textContent = `Actualizado a las ${new Date().toLocaleTimeString('es')} · se actualiza solo cada 30 s`;
}

/** /admin?demo muestra datos inventados, para ver cómo se verá el panel con jugadores. */
function demo(): Resumen {
  const hoy = Math.floor(Date.now() / 86_400_000);
  const serie = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29, act = Math.round(20 + 180 * t * t + Math.random() * 15);
    return { dia: hoy - 29 + i, activos: act, nuevos: Math.round(5 + 30 * t + Math.random() * 6), horas: Math.round(act * 0.6 * 10) / 10,
      batallas: { liga: Math.round(act * 2.2), captura: Math.round(act * 0.5), amistosa: Math.round(act * 0.3 * t), tutorial: Math.round(5 + 30 * t) }, vsIA: Math.round(act * 1.2 * (1 - t * 0.6)), vsHumano: Math.round(act * t) };
  });
  return {
    ahora: { enLinea: 37, enBatalla: 12, enCola: 3 }, totales: { jugadores: 912, conEquipo: 860, horas: 1630.5, batallas: 14230, tutorial: 702 },
    hoy: { activos: 206, nuevos: 34, batallas: 590, horas: 121.4, pico: 58, esperaMedia: 6.2 }, dau: 206, wau: 540, mau: 870,
    retencion: { d1: { base: 610, vuelven: 262, pct: 0.43 }, d7: { base: 420, vuelven: 88, pct: 0.21 } }, serie,
    primales: [['Tungurak', 410], ['Yakulobo', 365], ['Quindazo', 330], ['Chusikar', 290], ['Galapón', 251], ['Anguilampo', 230], ['Cacaoso', 199], ['Ukumari', 180], ['Crisalux', 150], ['Otorongo', 98]].map(([nombre, n]) => ({ esp: String(nombre), nombre: String(nombre), n: Number(n) })),
    iniciales: [['Tunguri', 310], ['Quindito', 280], ['Yakupi', 250], ['Chusik', 190], ['Chispez', 170], ['Galapito', 150], ['Cacaíto', 140], ['Ukumarito', 120], ['Morfito', 110]].map(([nombre, n]) => ({ esp: String(nombre), nombre: String(nombre), n: Number(n) })),
    paises: [['EC', 410], ['CO', 160], ['PE', 120], ['MX', 80], ['ES', 45], ['AR', 30], ['CL', 18], ['US', 7]].map(([codigo, n]) => ({ codigo: String(codigo), n: Number(n) })),
    horas: Array.from({ length: 24 }, (_, h) => Math.round(40 + 500 * Math.exp(-((h - 20) ** 2) / 8) + 220 * Math.exp(-((h - 13) ** 2) / 4) + (h < 7 ? -30 : 0) + Math.random() * 20)).map((v) => Math.max(0, v)),
    ligas: [['Liga Bronce', 420], ['Liga Plata', 230], ['Liga Oro', 120], ['Liga Platino', 55], ['Liga Diamante', 25], ['Liga Maestro', 8], ['Liga Campeón', 2]].map(([nombre, n]) => ({ id: String(nombre), nombre: String(nombre), jugadores: Number(n) })),
  };
}

// ------------------------------------------------------------------ buzón de sugerencias
interface Mensaje { id: number; fecha: number; nombre: string; tipo: string; texto: string; estado: string; nivel?: number; trofeos?: number }
const TIPOS: Record<string, string> = { idea: '💡 Idea', primal: '🙏 Pedido', error: '🐞 Error', otro: '💬 Otro' };
const FILTROS: [string, string][] = [['pendientes', 'Por revisar'], ['hecho', 'Hechos'], ['archivado', 'Archivados'], ['todos', 'Todos']];
let mensajes: Mensaje[] = [];
let filtro = 'pendientes';
const demoMode = new URLSearchParams(location.search).has('demo');

function pintarBuzon() {
  const el = document.getElementById('buzon');
  if (!el) return;
  const nuevos = mensajes.filter((m) => m.estado === 'nuevo').length;
  const lista = mensajes.filter((m) => (filtro === 'todos' ? true : filtro === 'pendientes' ? m.estado === 'nuevo' || m.estado === 'leido' : m.estado === filtro));
  el.innerHTML = `<div class="bz-cab"><div><h2>Buzón de sugerencias ${nuevos ? `<span class="bz-nuevos">${nuevos} nuevo${nuevos > 1 ? 's' : ''}</span>` : ''}</h2>
      <p class="sub">Ideas, pedidos y errores que mandan los jugadores desde la pestaña Entrenador</p></div>
      <div class="bz-filtros">${FILTROS.map(([id, n]) => `<button data-f="${id}" class="${id === filtro ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    ${lista.length ? `<div class="bz-lista">${lista.map((m) => `<article class="bz-msg ${m.estado}">
        <div class="bz-meta"><span class="bz-tipo">${TIPOS[m.tipo] ?? esc(m.tipo)}</span><b>${esc(m.nombre)}</b>
          <span>nivel ${m.nivel ?? '?'} · ${num(m.trofeos ?? 0)} trofeos · ${new Date(m.fecha).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          ${m.estado === 'nuevo' ? '<span class="bz-punto">nuevo</span>' : ''}</div>
        <p>${esc(m.texto)}</p>
        <div class="bz-acc">${m.estado !== 'hecho' ? `<button data-id="${m.id}" data-e="hecho">✓ Hecho</button>` : ''}${m.estado === 'nuevo' ? `<button data-id="${m.id}" data-e="leido">Marcar leído</button>` : ''}${m.estado !== 'archivado' ? `<button data-id="${m.id}" data-e="archivado">Archivar</button>` : `<button data-id="${m.id}" data-e="leido">Recuperar</button>`}</div>
      </article>`).join('')}</div>` : '<div class="vacio">No hay mensajes aquí.</div>'}`;
  el.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => (b.onclick = () => { filtro = b.dataset.f!; pintarBuzon(); }));
  el.querySelectorAll<HTMLButtonElement>('[data-e]').forEach((b) => (b.onclick = async () => {
    const id = Number(b.dataset.id), estado = b.dataset.e!;
    const m = mensajes.find((x) => x.id === id);
    if (m) m.estado = estado;
    pintarBuzon();
    if (!demoMode) await fetch(`/api/admin/buzon/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ estado }), credentials: 'same-origin' }).catch(() => {});
  }));
}

function demoBuzon(): Mensaje[] {
  const ahora = Date.now();
  return [
    ['idea', 'Tunguri99', 'Que se puedan hacer torneos entre amigos con premio de monedas', 'nuevo'],
    ['primal', 'LaYaku', 'Por favor agreguen un Primal tipo cóndor legendario, sería épico', 'nuevo'],
    ['error', 'Quindi_EC', 'A veces en el celular el joystick se queda pegado después de usar el especial', 'leido'],
    ['idea', 'ChusikMaster', 'Un modo 2 contra 2 con un amigo', 'hecho'],
    ['otro', 'Galapagos7', 'Me encanta la música de los legendarios!!', 'archivado'],
  ].map(([tipo, nombre, texto, estado], i) => ({ id: 5 - i, fecha: ahora - i * 5_400_000, nombre, tipo, texto, estado, nivel: 4 + i * 3, trofeos: 120 + i * 210 }));
}

async function cargar() {
  if (demoMode) mensajes = demoBuzon();
  if (new URLSearchParams(location.search).has('demo')) { pintar(demo()); $('actualizado').textContent = 'DATOS DE EJEMPLO (inventados) · así se verá con jugadores'; return; }
  if (!sesion && document.getElementById('clave')) return; // en la pantalla de entrada no se recarga sola
  try {
    const res = await fetch('/api/admin/estadisticas', { credentials: 'same-origin' });
    const data = await res.json();
    if (res.status === 401) return pedirClave('');
    sesion = true;
    $('salir').hidden = false;
    mensajes = await fetch('/api/admin/buzon', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : mensajes)).catch(() => mensajes);
    pintar(data as Resumen);
  } catch {
    $('actualizado').textContent = 'No se pudo conectar con el servidor.';
  }
}

let sesion = false;
/** Pantalla de entrada: la clave se manda una vez y el servidor da una sesión de 12 horas (cookie). */
function pedirClave(msg: string) {
  sesion = false;
  $('salir').hidden = true;
  $('actualizado').textContent = 'Necesitas iniciar sesión';
  $('panel').innerHTML = `<form class="clave" id="form-clave"><h2>Panel protegido</h2><p>Escribe la clave del panel (la variable ADMIN_KEY de Railway).</p>
    <input id="clave" type="password" autocomplete="current-password" placeholder="Clave del panel" autofocus>
    <button id="entrar" type="submit">Entrar</button><p class="error" id="clave-error">${esc(msg)}</p></form>`;
  ($('form-clave') as HTMLFormElement).onsubmit = async (ev) => {
    ev.preventDefault();
    const clave = ($('clave') as HTMLInputElement).value;
    try {
      const res = await fetch('/api/admin/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave }), credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) { $('clave-error').textContent = data.error ?? 'No se pudo entrar.'; return; }
      sesion = true;
      void cargar();
    } catch { $('clave-error').textContent = 'No se pudo conectar con el servidor.'; }
  };
}

$('salir').onclick = async () => {
  try { await fetch('/api/admin/salir', { method: 'POST', credentials: 'same-origin' }); } catch { /* da igual */ }
  pedirClave('Sesión cerrada.');
};

$('refrescar').onclick = () => void cargar();
void cargar();
setInterval(() => void cargar(), 30_000);
