// Panel del dueño: cuántos juegan, cuánto juegan y si vuelven. Se actualiza solo cada 30 s.

const $ = (id: string) => document.getElementById(id)!;
const KEY = 'primal_admin_clave';
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
}

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
function columnas(series: { nombre: string; color: string; valores: number[] }[], dias: number[], unidad = ''): string {
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
    if (i % Math.ceil(n / 6) === 0 || i === n - 1) svg += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${fecha(d)}</text>`;
    svg += `<rect class="hit" x="${mi + i * bw}" y="0" width="${bw}" height="${H - ab}" data-i="${i}"/>`;
  });
  const id = `c${Math.random().toString(36).slice(2)}`;
  setTimeout(() => {
    document.querySelectorAll<SVGRectElement>(`#${id} .hit`).forEach((r) => {
      const i = Number(r.dataset.i);
      r.onmousemove = (ev) => mostrarTip(ev, `<b>${fecha(dias[i])}</b>${series.map((s) => `<div><i style="background:${s.color}"></i>${esc(s.nombre)}: ${num(s.valores[i])}${unidad}</div>`).join('')}${series.length > 1 ? `<div>Total: ${num(totales[i])}${unidad}</div>` : ''}`);
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
    </section>`;
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
    ligas: [['Liga Bronce', 420], ['Liga Plata', 230], ['Liga Oro', 120], ['Liga Platino', 55], ['Liga Diamante', 25], ['Liga Maestro', 8], ['Liga Campeón', 2]].map(([nombre, n]) => ({ id: String(nombre), nombre: String(nombre), jugadores: Number(n) })),
  };
}

async function cargar() {
  if (new URLSearchParams(location.search).has('demo')) { pintar(demo()); $('actualizado').textContent = 'DATOS DE EJEMPLO (inventados) · así se verá con jugadores'; return; }
  const clave = (() => { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } })();
  try {
    const res = await fetch(`/api/admin/estadisticas?clave=${encodeURIComponent(clave)}`);
    const data = await res.json();
    if (res.status === 403) return pedirClave(data.error);
    pintar(data as Resumen);
  } catch {
    $('actualizado').textContent = 'No se pudo conectar con el servidor.';
  }
}

function pedirClave(msg: string) {
  $('panel').innerHTML = `<div class="clave"><h2>Panel protegido</h2><p>${esc(msg)}</p>
    <input id="clave" type="password" placeholder="Clave del panel (ADMIN_KEY)"><button id="entrar">Entrar</button></div>`;
  $('entrar').onclick = () => { try { localStorage.setItem(KEY, ($('clave') as HTMLInputElement).value); } catch { /* sin almacenamiento */ } void cargar(); };
}

$('refrescar').onclick = () => void cargar();
void cargar();
setInterval(() => void cargar(), 30_000);
