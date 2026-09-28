// Conexión a una sala de batalla. Guarda los mensajes que llegan antes de que la escena se suscriba.

import { Client, type Room } from 'colyseus.js';

type Handler = (m: any) => void;

export class Conexion {
  client = new Client(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  room: Room | null = null;
  private handlers = new Map<string, Handler>();
  private buffer: [string, any][] = [];

  async unirse(roomId: string, token: string) {
    this.room = await this.client.joinById(roomId, { token });
    this.room.onMessage('*', (type, m) => {
      const h = this.handlers.get(String(type));
      if (h) h(m);
      else this.buffer.push([String(type), m]);
    });
  }

  on(type: string, h: Handler) {
    this.handlers.set(type, h);
    const p = this.buffer.filter(([t]) => t === type);
    this.buffer = this.buffer.filter(([t]) => t !== type);
    for (const [, m] of p) h(m);
  }

  esperar<T>(type: string): Promise<T> {
    return new Promise((res) => this.on(type, res));
  }

  send(type: string, m?: any) {
    this.room?.send(type, m);
  }

  async salir() {
    try { await this.room?.leave(true); } catch { /* ya cerrada */ }
    this.room = null;
    this.handlers.clear();
    this.buffer = [];
  }
}
