// Llamadas al servidor (cuentas, perfil, Liga, capturas).

import type { Perfil, Social } from '../../shared/src';

const KEY = 'primal_token';
export function getToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  // zona horaria e idioma del navegador: solo para saber el país aproximado (no se usa la IP)
  const headers: Record<string, string> = {
    'content-type': 'application/json', 'x-zona': Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    'x-zona-min': String(-new Date().getTimezoneOffset()), 'x-idioma': navigator.language ?? '',
  };
  const t = getToken();
  if (t) headers.authorization = `Bearer ${t}`;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Error de conexión'), { status: res.status });
  return data as T;
}

export const api = {
  registro: (usuario: string, clave: string, acepto: string) => call<{ token: string }>('POST', '/api/registro', { usuario, clave, acepto }),
  historia: (id: string) => call<{ roomId: string }>('POST', '/api/historia/retar', { id }),
  buzon: (tipo: string, texto: string) => call<{ ok: boolean }>('POST', '/api/buzon', { tipo, texto }),
  aceptarLegal: (version: string) => call<Perfil>('POST', '/api/legal/aceptar', { version }),
  entrar: (usuario: string, clave: string) => call<{ token: string }>('POST', '/api/entrar', { usuario, clave }),
  perfil: () => call<Perfil>('GET', '/api/perfil'),
  inicial: (especies: string[]) => call<Perfil>('POST', '/api/inicial', { especies }),
  equipo: (equipo: string[]) => call<Perfil>('POST', '/api/equipo', { equipo }),
  habilidad: (id: string) => call<Perfil>('POST', '/api/habilidad', { id }),
  ranking: () => call<{ nombre: string; trofeos: number; nivel: number }[]>('GET', '/api/ranking'),
  buscar: () => call<{ roomId: string }>('POST', '/api/buscar'),
  cancelar: () => call<{ ok: boolean }>('POST', '/api/cancelar'),
  capturar: (especie: string) => call<{ roomId: string; perfil: Perfil }>('POST', '/api/capturar', { especie }),
  social: () => call<Social>('GET', '/api/social'),
  amigoSolicitar: (q: { id?: number; nombre?: string }) => call<{ ok: boolean; amigos: boolean }>('POST', '/api/amigos/solicitar', q),
  amigoResponder: (id: number, aceptar: boolean) => call<{ ok: boolean }>('POST', '/api/amigos/responder', { id, aceptar }),
  amigoQuitar: (id: number) => call<{ ok: boolean }>('POST', '/api/amigos/quitar', { id }),
  amistosaRetar: (para: number) => call<{ codigo: string }>('POST', '/api/amistosa/crear', { para }),
  avatar: (avatar: unknown) => call<Perfil>('POST', '/api/avatar', { avatar }),
  mision: (id: string) => call<Perfil>('POST', '/api/mision', { id }),
  tutorial: () => call<{ roomId: string }>('POST', '/api/tutorial'),
  saltarTutorial: () => call<Perfil>('POST', '/api/tutorial/saltar'),
  amistosaCrear: () => call<{ codigo: string }>('POST', '/api/amistosa/crear'),
  amistosaEsperar: (codigo: string) => call<{ roomId: string }>('POST', '/api/amistosa/esperar', { codigo }),
  amistosaUnirse: (codigo: string) => call<{ roomId: string }>('POST', '/api/amistosa/unirse', { codigo }),
  amistosaCancelar: (codigo: string) => call<{ ok: boolean }>('POST', '/api/amistosa/cancelar', { codigo }),
};

export const V = `?v=${__BUILD_ID__}`;
export const spriteUrl = (esp: string) => `criaturas/sprites/${esp}.png${V}`;
