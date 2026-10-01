// IA para Primales salvajes (capturas) y para rivales cuando no hay nadie en línea.
// Se mueve a su distancia ideal, rodea al rival, esquiva los avisos, usa sus movimientos
// cuando están listos y cambia de Primal si el suyo va perdiendo por elemento.

import { ARENA, CARGA_MAX, ESPECIES, MOVIMIENTOS, efectividad, especialesDe, tipos } from '../../../shared/src';
import type { Batalla } from './engine';

export class IA {
  private rodeo = Math.random() < 0.5 ? 1 : -1;
  private cambioRodeo = 0;
  private siguienteAccion = 0;

  constructor(private b: Batalla, private lado: 0 | 1, private nivel: number /* 0..1: dificultad */) {}

  tick() {
    const b = this.b;
    if (b.terminado) return;
    const yo = b.activa(this.lado);
    const rival = b.activa(this.lado === 0 ? 1 : 0);
    if (yo.hp <= 0) return;
    const esp = ESPECIES[yo.esp];
    const dx = rival.x - yo.x, dy = rival.y - yo.y;
    const d = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);
    // ¿hay un aviso del rival encima? huir
    let hx = 0, hy = 0;
    for (const a of b.avisos) {
      if (a.lado === this.lado) continue;
      const cx = a.forma === 'circulo' ? a.x : a.x + Math.cos(a.ang!) * a.largo! / 2;
      const cy = a.forma === 'circulo' ? a.y : a.y + Math.sin(a.ang!) * a.largo! / 2;
      const rr = a.forma === 'circulo' ? a.r + 30 : Math.max(a.r, a.largo! / 2) + 20;
      const dd = Math.hypot(yo.x - cx, yo.y - cy);
      if (dd < rr) { hx += (yo.x - cx) / (dd || 1); hy += (yo.y - cy) / (dd || 1); }
    }
    if ((hx || hy) && Math.random() < 0.25 * this.nivel && yo.cds[5] <= 0) b.accion(this.lado, 5, { x: yo.x + hx * 50, y: yo.y + hy * 50 });
    // distancia ideal según su golpe básico
    const ideal = esp.basico === 'cuerpo' ? 40 : 190;
    if (b.t > this.cambioRodeo) { this.cambioRodeo = b.t + 1.5 + Math.random() * 2; this.rodeo *= -1; }
    let mx = 0, my = 0;
    if (hx || hy) { mx = hx; my = hy; }
    else if (d > ideal + 25) { mx = dx / d; my = dy / d; }
    else if (d < ideal - 30) { mx = -dx / d; my = -dy / d; }
    else { mx = (-dy / d) * this.rodeo; my = (dx / d) * this.rodeo; }
    // no pegarse a los bordes
    if (yo.x < 60) mx += 0.6; if (yo.x > ARENA.w - 60) mx -= 0.6;
    if (yo.y < 60) my += 0.6; if (yo.y > ARENA.h - 60) my -= 0.6;
    b.entrada(this.lado, mx, my, rival.x, rival.y);
    // cambio de Primal si está en desventaja clara y tiene uno mejor
    const L = b.lados[this.lado];
    if (b.t > L.cambioListo && Math.random() < 0.02 * this.nivel) {
      const ef = efectividad(ESPECIES[rival.esp].elemento, tipos(yo.esp));
      if (ef > 1 || yo.hp < yo.mhp * 0.25) {
        const mejor = L.unidades.findIndex((u, i) => i !== L.activo && u.hp > u.mhp * 0.4 && efectividad(ESPECIES[rival.esp].elemento, tipos(u.esp)) <= 1);
        if (mejor >= 0) return b.cambiar(this.lado, mejor);
      }
    }
    // ataques
    if (b.t < this.siguienteAccion) return;
    this.siguienteAccion = b.t + 0.15 + (1 - this.nivel) * 0.75;
    const puntería = (1 - this.nivel) * 70;
    const tx = rival.x + (Math.random() - 0.5) * puntería, ty = rival.y + (Math.random() - 0.5) * puntería;
    const opciones: number[] = [];
    for (let i = 1; i <= 4; i++) {
      if (yo.cds[i] > 0) continue;
      const m = MOVIMIENTOS[esp.movimientos[i - 1]];
      if (m.tipo === 'curar' && yo.hp > yo.mhp * 0.55) continue;
      if ((m.tipo === 'escudo' || m.tipo === 'mejora') && d > 260) continue;
      if (['proyectil', 'rafaga', 'rayo', 'zona', 'embestida'].includes(m.tipo) && d > m.alcance + 30) continue;
      if (m.tipo === 'area' && d > m.alcance + 20) continue;
      opciones.push(i);
    }
    if (opciones.length && Math.random() < 0.2 + this.nivel * 0.4) return b.accion(this.lado, opciones[Math.floor(Math.random() * opciones.length)], { x: tx, y: ty });
    const alcanceBasico = esp.basico === 'cuerpo' ? 75 : 320;
    if (L.carga >= CARGA_MAX && d < 340 && Math.random() < 0.3 + this.nivel * 0.5) return b.accion(this.lado, especialesDe(yo.esp).length > 1 && Math.random() < 0.5 ? 7 : 6);
    if (d < alcanceBasico && yo.cds[0] <= 0) b.accion(this.lado, 0, { x: tx, y: ty });
    void ang;
  }
}
