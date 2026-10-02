// Estadísticas para el panel del dueño: actividad diaria, batallas, tiempo jugado y retención.
// Se acumulan en memoria y se guardan cada 30 s (una fila por día en la base de datos).

import { diaActual } from '../../shared/src';
import type { Domador, Store } from './db';

export interface DiaStats {
  activos: number[]; // ids de los Entrenadores que jugaron ese día
  nuevos: number;
  batallas: Record<string, number>; // liga, captura, amistosa, tutorial
  vsIA: number; // batallas de Liga contra la IA
  vsHumano: number;
  segundos: number; // tiempo total en batalla
  esperaMs: number; // espera total en la cola de la Liga
  esperas: number;
  pico: number; // máximo de Entrenadores en línea a la vez
}

const vacio = (): DiaStats => ({ activos: [], nuevos: 0, batallas: {}, vsIA: 0, vsHumano: 0, segundos: 0, esperaMs: 0, esperas: 0, pico: 0 });

export class Estadisticas {
  private dias = new Map<number, DiaStats>();
  private sucio = new Set<number>();
  constructor(private store: Store) {
    setInterval(() => void this.guardar(), 30_000).unref();
  }

  async init() {
    const hoy = diaActual();
    const guardados = await this.store.leerDias(hoy - 60);
    for (const [d, s] of Object.entries(guardados)) this.dias.set(Number(d), { ...vacio(), ...s });
  }

  private hoy() {
    const d = diaActual();
    if (!this.dias.has(d)) this.dias.set(d, vacio());
    this.sucio.add(d);
    return this.dias.get(d)!;
  }

  /** Un Entrenador hizo algo hoy (entró, jugó...). Devuelve true si es su primera vez hoy. */
  activo(d: Domador) {
    const h = this.hoy();
    if (!h.activos.includes(d.id)) h.activos.push(d.id);
    const dia = diaActual();
    d.creado ??= Date.now();
    d.dias ??= [];
    if (d.dias[d.dias.length - 1] !== dia) { d.dias.push(dia); d.dias = d.dias.slice(-90); return true; }
    return false;
  }
  nuevo() { this.hoy().nuevos++; }
  batalla(modo: string, segundos: number, humanos: number, contraIA: boolean) {
    const h = this.hoy();
    h.batallas[modo] = (h.batallas[modo] ?? 0) + 1;
    h.segundos += segundos * humanos;
    if (modo === 'liga') contraIA ? h.vsIA++ : h.vsHumano++;
  }
  espera(ms: number) { const h = this.hoy(); h.esperaMs += ms; h.esperas++; }
  enLinea(n: number) { const h = this.hoy(); if (n > h.pico) h.pico = n; }

  ultimosDias(n: number) {
    const hoy = diaActual();
    return Array.from({ length: n }, (_, i) => { const d = hoy - n + 1 + i; return { dia: d, ...(this.dias.get(d) ?? vacio()) }; });
  }

  async guardar() {
    for (const d of [...this.sucio]) {
      this.sucio.delete(d);
      const s = this.dias.get(d);
      if (s) await this.store.guardarDia(d, s).catch(() => this.sucio.add(d));
    }
  }
}
