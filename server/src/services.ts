// Servicios compartidos: almacenamiento y caché de Domadores.

import { crearStore, type Domador } from './db';
import { migrar } from './progress';
import { Estadisticas } from './estadisticas';

export const store = crearStore();
export const stats = new Estadisticas(store);
/** Salas de batalla abiertas ahora mismo. */
export const salas = { activas: 0 };

class Domadores {
  cache = new Map<number, Domador>();
  async get(id: number) {
    let d = this.cache.get(id);
    if (!d) {
      d = (await store.domador(id)) ?? undefined;
      if (d) { migrar(d); this.cache.set(id, d); }
    }
    return d ?? null;
  }
  async guardar(d: Domador) {
    this.cache.set(d.id, d);
    await store.guardar(d);
  }
}
export const domadores = new Domadores();
