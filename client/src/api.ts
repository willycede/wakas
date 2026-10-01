// Llamadas al servidor (cuentas, perfil, Liga, capturas).

import type { Perfil } from '../../shared/src';

const KEY = 'primal_token';
export function getToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const t = getToken();
  if (t) headers.authorization = `Bearer ${t}`;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Error de conexión'), { status: res.status });
  return data as T;
}

export const api = {
  registro: (usuario: string, clave: string) => call<{ token: string }>('POST', '/api/registro', { usuario, clave }),
  entrar: (usuario: string, clave: string) => call<{ token: string }>('POST', '/api/entrar', { usuario, clave }),
  perfil: () => call<Perfil>('GET', '/api/perfil'),
  inicial: (especies: string[]) => call<Perfil>('POST', '/api/inicial', { especies }),
  equipo: (equipo: string[]) => call<Perfil>('POST', '/api/equipo', { equipo }),
  habilidad: (id: string) => call<Perfil>('POST', '/api/habilidad', { id }),
  ranking: () => call<{ nombre: string; trofeos: number; nivel: number }[]>('GET', '/api/ranking'),
  buscar: () => call<{ roomId: string }>('POST', '/api/buscar'),
  cancelar: () => call<{ ok: boolean }>('POST', '/api/cancelar'),
  capturar: (especie: string) => call<{ roomId: string; perfil: Perfil }>('POST', '/api/capturar', { especie }),
};

export const V = `?v=${__BUILD_ID__}`;
export const spriteUrl = (esp: string) => `criaturas/sprites/${esp}.png${V}`;
