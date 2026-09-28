// Servicios compartidos: almacenamiento y caché de Domadores.

import { crearStore, type Domador } from './db';

export const store = crearStore();

class Domadores {
  cache = new Map<number, Domador>();
  async get(id: number) {
    let d = this.cache.get(id);
    if (!d) {
      d = (await store.domador(id)) ?? undefined;
      if (d) this.cache.set(id, d);
    }
    return d ?? null;
  }
  async guardar(d: Domador) {
    this.cache.set(d.id, d);
    await store.guardar(d);
  }
}
export const domadores = new Domadores();
