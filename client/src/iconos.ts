// Iconos SVG propios (sin emojis): se pintan con currentColor, así toman el color del contexto.

const P: Record<string, string> = {
  // elementos
  fuego: '<path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.3-5 .2 1.8 1 3 2.2 3.4C11 8.5 11.2 5 12 2z"/>',
  agua: '<path d="M12 2.5S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5zm-2.8 12.2a1 1 0 0 1 1.1.9 2.6 2.6 0 0 0 2.2 2.2 1 1 0 1 1-.3 2 4.6 4.6 0 0 1-3.9-3.9 1 1 0 0 1 .9-1.2z"/>',
  planta: '<path d="M20 3C10 3 5 8 5 14c0 1.5.3 2.8.9 3.9L3.3 20.5l1.4 1.4 2.6-2.6c1.2.6 2.5.9 3.9.9C17 20.2 21 14 20 3zM8.6 16.8l-.4-.4C10 13 13 10 16 8.4 13.5 10.6 11 13.4 8.6 16.8z"/>',
  electrico: '<path d="M13.5 2 5 13.5h5.5L9.5 22 19 9.8h-5.6L13.5 2z"/>',
  roca: '<path d="M8 3h7l5 6-2 10-7 2-7-4L3 9l5-6zm1.2 2.3L5.6 9.5l.6 5.5 1.4.8L9 9.6l3-1.8 4.3 1.3-2.2-3.8H9.2z"/>',
  viento: '<path d="M3 8.5h11.5a2.5 2.5 0 1 0-2.4-3.1l-1.9-.5A4.5 4.5 0 1 1 14.5 10.5H3v-2zm0 4h15a3.5 3.5 0 1 1-3.4 4.3l1.9-.5A1.5 1.5 0 1 0 18 14.5H3v-2zm0 4h8v2H3v-2z"/>',
  sombra: '<path d="M14.5 2.5A9.5 9.5 0 1 0 21.5 15 7.5 7.5 0 0 1 14.5 2.5z"/>',
  hielo: '<path d="M11 1h2v4.2l2.4-1.4 1 1.7L13 7.6v3.3l2.9-1.7V5.4h2v2.6l2.3-1.3 1 1.7-2.3 1.3 2.2 1.3-1 1.7-3.3-1.9L14 12l2.9 1.7 3.3-1.9 1 1.7-2.2 1.3 2.3 1.3-1 1.7-2.3-1.3v2.6h-2v-3.8L13 13.1v3.3l3.4 2.1-1 1.7-2.4-1.4V23h-2v-4.2l-2.4 1.4-1-1.7 3.4-2.1v-3.3l-2.9 1.7v3.8H6v-2.6l-2.3 1.3-1-1.7 2.3-1.3-2.2-1.3 1-1.7 3.3 1.9L10 12l-2.9-1.7-3.3 1.9-1-1.7 2.2-1.3L2.7 8l1-1.7L6 7.6V5h2v3.8l2.9 1.7V7.6L7.6 5.5l1-1.7L11 5.2V1z"/>',
  luz: '<circle cx="12" cy="12" r="4.5"/><path d="M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4zM15.6 17l1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4L17 8.4z"/>',
  emote: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM7 14h10a5 5 0 0 1-10 0z"/>',
  corona: '<path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7zm2 13h14v2H5v-2z"/>',
  gema: '<path d="M7 3h10l5 6-10 13L2 9l5-6zm1.2 2L5.4 8.4h4L8.2 5zm7.6 0-1.2 3.4h4L15.8 5zM10.3 5l1.7 3.4L13.7 5h-3.4zM5 10.4l5.4 7.2-2-7.2H5zm5.5 0L12 16l1.5-5.6h-3zm5.1 0-2 7.2 5.4-7.2h-3.4z"/>',
  chakana: '<path d="M9 2h6v3h4v4h3v6h-3v4h-4v3H9v-3H5v-4H2V9h3V5h4V2zm3 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>',
  musica: '<path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h8V3H9z"/>',
  silencio: '<path d="M3 9h4l5-5v16l-5-5H3V9zm13.6.2 1.4-1.4 2.1 2.1 2.1-2.1 1.4 1.4-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1-2.1-2.1z"/>',
  // tipos de movimiento
  proyectil: '<path d="M4 20 15 9m0 0-1.5-4.5L19 3l2 2-1.5 5.5L15 9zM4 20l2.5-6M4 20l6-2.5"/><circle cx="17.5" cy="6.5" r="1.4"/>',
  rafaga: '<path d="M3 12h6M14 4l-4 8 4 8M17 7l-2.5 5 2.5 5M21 10v4"/>',
  embestida: '<path d="M3 7h7M2 12h9M3 17h7M13 5l8 7-8 7V5z"/>',
  area: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" fill="none" stroke-dasharray="3 2.5"/><circle cx="12" cy="12" r="10.3" fill="none"/>',
  zona: '<circle cx="12" cy="12" r="8.5" fill="none"/><circle cx="12" cy="12" r="4.5" fill="none"/><circle cx="12" cy="12" r="1.5"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  rayo: '<path d="M2 12h3M19 12h3"/><rect x="5" y="9" width="14" height="6" rx="3"/><path d="M8 12h8" stroke="#000" stroke-opacity=".35"/>',
  escudo: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/>',
  curar: '<path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.5 2.8C20.5 15.7 12 21 12 21zm-1-12v3H8v2h3v3h2v-3h3v-2h-3V9h-2z"/>',
  mejora: '<path d="m12 3 7 7h-4.5v4h-5v-4H5l7-7zm-2.5 13h5v2h-5v-2zm0 3h5v2h-5v-2z"/>',
  // acciones e interfaz
  golpe: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V10V5a1.5 1.5 0 0 1 3 0v5-3.5a1.5 1.5 0 0 1 3 0V11v-2a1.5 1.5 0 0 1 3 0v5.5a6.5 6.5 0 0 1-6.5 6.5h-.8a6.5 6.5 0 0 1-5.4-2.9L4.2 15a1.6 1.6 0 0 1 2.5-2l.3.4V11z"/>',
  orbe: '<circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" fill="none"/>',
  esquiva: '<path d="M13 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM9.5 8.5l4-1.5 3 3 3 .5-.4 2-3.6-.6-1.5-1.4-1.3 3.3 3.3 2.7V22h-2v-4.5l-3.3-2.4L9 20H6.8l3-8.2-1.6.7V15h-2v-4l3.3-2.5zM1 9h5v1.6H1zM2 13h3v1.6H2z"/>',
  especial: '<path d="m12 1.5 2.4 6.1 6.6.5-5 4.3 1.6 6.4L12 15.3l-5.6 3.5 1.6-6.4-5-4.3 6.6-.5L12 1.5z"/>',
  trofeo: '<path d="M7 3h10v2h3.5v2.5A4.5 4.5 0 0 1 16.6 12 5 5 0 0 1 13 14.8V17h3v2H8v-2h3v-2.2A5 5 0 0 1 7.4 12 4.5 4.5 0 0 1 3.5 7.5V5H7V3zM5.5 7v.5a2.5 2.5 0 0 0 1.6 2.3A7 7 0 0 1 7 8.5V7H5.5zM17 7v1.5c0 .5 0 .9-.1 1.3A2.5 2.5 0 0 0 18.5 7.5V7H17zM7 20h10v2H7z"/>',
  moneda: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.6"/><path d="M10.5 8.5h3v7h-3z" fill="#000" fill-opacity=".22"/>',
  estrella: '<path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8L12 2z"/>',
  espadas: '<path d="M3 3h4l9.5 9.5-1.4 1.4 1.6 1.6 1.4-1.4 2.1 2.1-1.4 1.4L21 20l-1 1-2.2-2.2-1.4 1.4-2.1-2.1 1.4-1.4-1.6-1.6-1.4 1.4L3 7V3zm18 0v4l-6.2 6.2-2.8-2.8L17 3h4zM5.2 15.8l2.1 2.1-1.4 1.4L4 21l-1-1 1.8-1.9 1.4-1.4z"/>',
  huella: '<ellipse cx="12" cy="16" rx="5" ry="4.2"/><ellipse cx="5.2" cy="10.5" rx="2" ry="2.6"/><ellipse cx="9.2" cy="6.5" rx="2" ry="2.7"/><ellipse cx="14.8" cy="6.5" rx="2" ry="2.7"/><ellipse cx="18.8" cy="10.5" rx="2" ry="2.6"/>',
  red: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 0 1 7.7 6h-5a3 3 0 0 0-5.4 0h-5A8 8 0 0 1 12 4zm0 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-7.7 3h5a3 3 0 0 0 5.4 0h5A8 8 0 0 1 4.3 14z"/>',
  medalla: '<path d="M6 2h4l2 4 2-4h4l-3.5 7A6.5 6.5 0 1 1 9.5 9L6 2zm6 9.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 1.5.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3L12 13z"/>',
  mundo: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-3a15 15 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4.1c.8 1.1 1.5 2.4 1.9 3.9h-3.8c.4-1.5 1.1-2.8 1.9-3.9zM4.3 14a8 8 0 0 1 0-4h3.4a16 16 0 0 0 0 4H4.3zm.8 2h3a15 15 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16zm3-8h-3a8 8 0 0 1 4.4-3.6A15 15 0 0 0 8.1 8zM12 19.9c-.8-1.1-1.5-2.4-1.9-3.9h3.8c-.4 1.5-1.1 2.8-1.9 3.9zM14.3 14H9.7a14 14 0 0 1 0-4h4.6a14 14 0 0 1 0 4zm.2 5.6c.6-1.1 1.1-2.3 1.4-3.6h3a8 8 0 0 1-4.4 3.6zm1.8-5.6a16 16 0 0 0 0-4h3.4a8 8 0 0 1 0 4h-3.4z"/>',
  candado: '<path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10H7zm2 0h6V7a3 3 0 0 0-6 0v3z"/>',
  check: '<path d="m9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6 11-11-1.4-1.4z"/>',
  mas: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>',
  bandera: '<path d="M5 2h2v20H5zM8 3h11l-2.5 4.5L19 12H8z"/>',
  idioma: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.2 1.4 2.1 3.4 2.4 6H9.6C9.9 7.4 10.8 5.4 12 4zm-7.8 6a8 8 0 0 1 5-5.5A13 13 0 0 0 7.6 10H4.2zm0 4h3.4a13 13 0 0 0 1.6 5.5 8 8 0 0 1-5-5.5zM12 20c-1.2-1.4-2.1-3.4-2.4-6h4.8c-.3 2.6-1.2 4.6-2.4 6zm2.8-.5a13 13 0 0 0 1.6-5.5h3.4a8 8 0 0 1-5 5.5zm1.6-9.5a13 13 0 0 0-1.6-5.5 8 8 0 0 1 5 5.5h-3.4z"/>',
  corazon: '<path d="M12 21s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12z"/>',
  reloj: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v4.6l3.5 2.1-1 1.7L11 12.7V7h2z"/>',
  crecer: '<path d="M3 17 9 11l4 4 6.5-6.5L17 6h6v6l-2.5-2.5L13 17l-4-4-4.6 4.6z"/>',
  cambiar: '<path d="M7 4 2 9l5 5v-3.5h8V7.5H7V4zm10 6v3.5H9v3h8V20l5-5-5-5z"/>',
  mira: '<circle cx="12" cy="12" r="7" fill="none"/><circle cx="12" cy="12" r="2"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',
  salir: '<path d="M10 3H4v18h6v-2H6V5h4V3zm5.5 4L14 8.5l2.5 2.5H9v2h7.5L14 15.5l1.5 1.5 5-5-5-5z"/>',
};

/** Iconos de trazo (no relleno). */
const TRAZO = new Set(['proyectil', 'rafaga', 'embestida', 'zona', 'rayo', 'area', 'orbe', 'mira']);

export function icono(id: string, cls = ''): string {
  const d = P[id] ?? P.estrella;
  const trazo = TRAZO.has(id);
  const attr = trazo
    ? 'fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="currentColor" stroke="currentColor" stroke-width="0"';
  // en los de trazo, los <path> abiertos no deben rellenarse
  const cuerpo = trazo ? d.replace(/<path /g, '<path fill="none" ') : d;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" ${attr} aria-hidden="true">${cuerpo}</svg>`;
}

/** Emblema de liga: escudo con el color de la liga y su rango en estrellas. */
export function emblemaLiga(color: string, rango: number, tam = 96): string {
  const n = Math.min(rango + 1, 7);
  const estrellas = Array.from({ length: n }, (_, i) => {
    const x = 48 + (i - (n - 1) / 2) * 11;
    return `<path transform="translate(${x - 5} 76) scale(.42)" d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8z" fill="#fff6d8"/>`;
  }).join('');
  return `<svg class="emblema" width="${tam}" height="${tam}" viewBox="0 0 96 96" aria-hidden="true">
    <defs>
      <linearGradient id="eg${rango}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity=".55"/></linearGradient>
      <linearGradient id="eb${rango}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="${color}"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
    </defs>
    <path d="M48 5 84 17v28c0 22-15.5 38.5-36 46C27.5 83.5 12 67 12 45V17L48 5z" fill="#130d24" stroke="url(#eb${rango})" stroke-width="4"/>
    <path d="M48 13 77 22.5V45c0 17.5-12 31-29 37.5C31 76 19 62.5 19 45V22.5L48 13z" fill="url(#eg${rango})" opacity=".9"/>
    <path d="M48 13 77 22.5V45c0 3-.4 6-1.1 8.8C66 40 52 33 19 34V22.5L48 13z" fill="#fff" opacity=".14"/>
    <path transform="translate(30 26) scale(1.5)" d="M7 3h10v2h3.5v2.5A4.5 4.5 0 0 1 16.6 12 5 5 0 0 1 13 14.8V17h3v2H8v-2h3v-2.2A5 5 0 0 1 7.4 12 4.5 4.5 0 0 1 3.5 7.5V5H7V3z" fill="#1a1030" opacity=".55"/>
    ${estrellas}
  </svg>`;
}
