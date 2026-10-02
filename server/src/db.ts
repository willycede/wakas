// Almacenamiento: PostgreSQL en Railway (DATABASE_URL) o un archivo JSON en desarrollo local.

import pg from 'pg';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PrimalGuardado } from '../../shared/src';

/** Todo lo que se guarda de un Domador. */
export interface Domador {
  id: number;
  usuario: string;
  nombre: string;
  nivel: number;
  xp: number;
  monedas: number;
  trofeos: number;
  mejorTrofeos: number;
  victorias: number;
  derrotas: number;
  primales: PrimalGuardado[];
  equipo: string[];
  habilidades: Record<string, number>;
  capturados: string[];
  medallas: string[];
  tutorial?: boolean;
  misiones?: { dia: number; lista: { id: string; progreso: number; cobrada: boolean }[] };
  ultimaVictoriaDia?: number;
  uso?: Record<string, number>; // veces que usó cada especie en la Liga
  avatar?: import('../../shared/src').Avatar;
  amigos?: number[];
  solicitudes?: number[]; // ids que te pidieron amistad
}

export interface Store {
  init(): Promise<void>;
  crearCuenta(usuario: string, hash: string): Promise<number | null>;
  cuenta(usuario: string): Promise<{ id: number; hash: string } | null>;
  crearSesion(token: string, id: number): Promise<void>;
  sesion(token: string): Promise<number | null>;
  domador(id: number): Promise<Domador | null>;
  guardar(d: Domador): Promise<void>;
  ranking(n: number): Promise<{ nombre: string; trofeos: number; nivel: number }[]>;
}

export function nuevoDomador(id: number, usuario: string): Domador {
  return { id, usuario, nombre: usuario, nivel: 1, xp: 0, monedas: 100, trofeos: 0, mejorTrofeos: 0, victorias: 0, derrotas: 0,
    primales: [], equipo: [], habilidades: {}, capturados: [], medallas: [] };
}

class PgStore implements Store {
  private pool: pg.Pool;
  constructor(url: string) {
    const local = /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
    this.pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 8 });
  }
  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cuentas (
        id SERIAL PRIMARY KEY,
        usuario TEXT NOT NULL,
        hash TEXT NOT NULL,
        datos JSONB NOT NULL DEFAULT '{}',
        trofeos INTEGER NOT NULL DEFAULT 0,
        creado TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS cuentas_usuario ON cuentas (lower(usuario));
      CREATE INDEX IF NOT EXISTS cuentas_trofeos ON cuentas (trofeos DESC);
      CREATE TABLE IF NOT EXISTS sesiones (
        token TEXT PRIMARY KEY,
        cuenta INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
        creado TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }
  async crearCuenta(usuario: string, hash: string) {
    try {
      const r = await this.pool.query('INSERT INTO cuentas (usuario, hash) VALUES ($1, $2) RETURNING id', [usuario, hash]);
      const id = r.rows[0].id as number;
      await this.guardar(nuevoDomador(id, usuario));
      return id;
    } catch (e: any) {
      if (e.code === '23505') return null;
      throw e;
    }
  }
  async cuenta(usuario: string) {
    const r = await this.pool.query('SELECT id, hash FROM cuentas WHERE lower(usuario) = lower($1)', [usuario]);
    return r.rows[0] ? { id: r.rows[0].id, hash: r.rows[0].hash } : null;
  }
  async crearSesion(token: string, id: number) {
    await this.pool.query('INSERT INTO sesiones (token, cuenta) VALUES ($1, $2)', [token, id]);
  }
  async sesion(token: string) {
    const r = await this.pool.query("SELECT cuenta FROM sesiones WHERE token = $1 AND creado > now() - interval '60 days'", [token]);
    return r.rows[0]?.cuenta ?? null;
  }
  async domador(id: number) {
    const r = await this.pool.query('SELECT id, usuario, datos FROM cuentas WHERE id = $1', [id]);
    if (!r.rows[0]) return null;
    return { ...nuevoDomador(r.rows[0].id, r.rows[0].usuario), ...r.rows[0].datos, id: r.rows[0].id, usuario: r.rows[0].usuario } as Domador;
  }
  async guardar(d: Domador) {
    await this.pool.query('UPDATE cuentas SET datos = $2, trofeos = $3 WHERE id = $1', [d.id, JSON.stringify(d), d.trofeos]);
  }
  async ranking(n: number) {
    const r = await this.pool.query("SELECT datos->>'nombre' AS nombre, trofeos, (datos->>'nivel')::int AS nivel FROM cuentas ORDER BY trofeos DESC LIMIT $1", [n]);
    return r.rows.map((x) => ({ nombre: x.nombre, trofeos: x.trofeos, nivel: x.nivel ?? 1 }));
  }
}

interface FileData { seq: number; cuentas: { id: number; usuario: string; hash: string }[]; sesiones: Record<string, number>; domadores: Domador[] }

class FileStore implements Store {
  private d: FileData = { seq: 0, cuentas: [], sesiones: {}, domadores: [] };
  private timer: NodeJS.Timeout | null = null;
  constructor(private path: string) {}
  async init() {
    if (existsSync(this.path)) this.d = JSON.parse(readFileSync(this.path, 'utf8'));
  }
  private persist() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      mkdirSync(dirname(this.path), { recursive: true });
      writeFileSync(this.path + '.tmp', JSON.stringify(this.d));
      renameSync(this.path + '.tmp', this.path);
    }, 300);
  }
  async crearCuenta(usuario: string, hash: string) {
    if (this.d.cuentas.some((c) => c.usuario.toLowerCase() === usuario.toLowerCase())) return null;
    const id = ++this.d.seq;
    this.d.cuentas.push({ id, usuario, hash });
    this.d.domadores.push(nuevoDomador(id, usuario));
    this.persist();
    return id;
  }
  async cuenta(usuario: string) {
    const c = this.d.cuentas.find((c) => c.usuario.toLowerCase() === usuario.toLowerCase());
    return c ? { id: c.id, hash: c.hash } : null;
  }
  async crearSesion(token: string, id: number) {
    this.d.sesiones[token] = id;
    this.persist();
  }
  async sesion(token: string) {
    return this.d.sesiones[token] ?? null;
  }
  async domador(id: number) {
    const x = this.d.domadores.find((d) => d.id === id);
    return x ? structuredClone(x) : null;
  }
  async guardar(d: Domador) {
    const i = this.d.domadores.findIndex((x) => x.id === d.id);
    if (i >= 0) this.d.domadores[i] = structuredClone(d);
    this.persist();
  }
  async ranking(n: number) {
    return [...this.d.domadores].sort((a, b) => b.trofeos - a.trofeos).slice(0, n).map((d) => ({ nombre: d.nombre, trofeos: d.trofeos, nivel: d.nivel }));
  }
}

export function crearStore(): Store {
  const url = process.env.DATABASE_URL;
  if (url) {
    console.log('[db] Usando PostgreSQL');
    return new PgStore(url);
  }
  if (process.env.RAILWAY_ENVIRONMENT) console.warn('[db] ¡ATENCIÓN! Falta DATABASE_URL en Railway: los datos se perderán en cada despliegue.');
  console.log('[db] Sin DATABASE_URL: usando data/dev-db.json (solo pruebas locales)');
  return new FileStore('data/dev-db.json');
}
