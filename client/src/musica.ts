// Música chiptune original, sintetizada en el navegador (Web Audio): sin archivos que descargar.
// Cuatro canales como una consola clásica: melodía (cuadrada), arpegio (pulso fino), bajo
// (triangular) y batería (ruido). Cada pista se escribe en compases de 16 semicorcheas:
//   nota ("A4", "C#5"), "-" mantiene la nota anterior, "." silencio.
//   batería: k = bombo, s = caja, h = platillo, t = tom, "." silencio.

type Canal = 'lead' | 'arp' | 'bajo' | 'bat';
interface Pista { bpm: number; bucle: boolean; compases: Partial<Record<Canal, string[]>>; vol?: number }

const C = (s: string) => s.trim().split(/\s+/);
const rep = (s: string, n: number) => Array(n).fill(s);
/** Arpegio de 16 pasos con las notas dadas (sube y baja). */
const arp = (n: string) => { const x = n.split(' '); const seq = [...x, ...x.slice(1, -1).reverse()]; return Array.from({ length: 16 }, (_, i) => seq[i % seq.length]).join(' '); };
const bajo8 = (a: string, b: string) => `${a} . ${b} . ${a} . ${b} . ${a} . ${b} . ${a} . ${b} .`;

// ------------------------------------------------------------------ las pistas
const PISTAS: Record<string, Pista> = {
  // menú: tranquilo y alegre (Fa mayor)
  menu: {
    bpm: 104, bucle: true, vol: 0.7,
    compases: {
      lead: [
        'A4 - - - C5 - - - F5 - - - E5 - C5 -', 'D5 - - - - - - - C5 - A4 - - - - -',
        'Bb4 - - - D5 - - - F5 - - - G5 - F5 -', 'E5 - - - - - - - G5 - - - - - - -',
        'A5 - - - G5 - F5 - E5 - - - C5 - - -', 'D5 - - - E5 - F5 - - - - - D5 - - -',
        'Bb4 - - - C5 - D5 - F5 - - - E5 - D5 -', 'C5 - - - - - - - . . . . . . . .',
      ],
      arp: [arp('F4 A4 C5'), arp('A3 C4 E4'), arp('Bb3 D4 F4'), arp('C4 E4 G4'), arp('F4 A4 C5'), arp('D4 F4 A4'), arp('Bb3 D4 F4'), arp('C4 E4 G4')],
      bajo: ['F2 - - - . . F2 . C3 - - - . . C3 .', 'A2 - - - . . A2 . E3 - - - . . E3 .', 'Bb2 - - - . . Bb2 . F3 - - - . . F3 .', 'C3 - - - . . C3 . G2 - - - . . G2 .',
        'F2 - - - . . F2 . C3 - - - . . C3 .', 'D3 - - - . . D3 . A2 - - - . . A2 .', 'Bb2 - - - . . Bb2 . F3 - - - . . F3 .', 'C3 - - - . . C3 . C2 - - - . . . .'],
      bat: rep('k . . . h . . . s . . . h . . .', 8),
    },
  },
  // batalla: enérgica (Re menor)
  batalla: {
    bpm: 152, bucle: true,
    compases: {
      lead: [
        'D5 - - - F5 - A5 - - - G5 - F5 - E5 -', 'D5 - - - - - - - A4 - D5 - F5 - - -',
        'Bb4 - - - D5 - F5 - - - E5 - D5 - C5 -', 'C5 - - - E5 - - - A4 - - - - - - -',
        'D5 - F5 - A5 - D6 - - - C6 - A5 - - -', 'Bb5 - - - A5 - G5 - F5 - - - E5 - - -',
        'F5 - - - E5 - D5 - C5 - - - E5 - G5 -', 'A5 - - - - - - - C#5 - E5 - A5 - - -',
      ],
      arp: [arp('D4 F4 A4'), arp('D4 F4 A4'), arp('Bb3 D4 F4'), arp('C4 E4 G4'), arp('D4 F4 A4'), arp('G3 Bb3 D4'), arp('Bb3 D4 F4'), arp('A3 C#4 E4')],
      bajo: [bajo8('D2', 'D3'), bajo8('D2', 'D3'), bajo8('Bb1', 'Bb2'), bajo8('C2', 'C3'), bajo8('D2', 'D3'), bajo8('G1', 'G2'), bajo8('Bb1', 'Bb2'), bajo8('A1', 'A2')],
      bat: [...rep('k . h . s . h . k . k . s . h h', 7), 'k . s . s . t . t . t . s s s s'],
    },
  },
  // legendario: épico (La menor armónica), con introducción de tensión
  legendario: {
    bpm: 168, bucle: true, vol: 1,
    compases: {
      lead: [
        // introducción: el legendario se impone
        'A4 - - - - - - - - - - - - - - -', 'G#4 - - - - - - - B4 - - - E5 - - -',
        // tema
        'E5 - - - A5 - - - B5 - C6 - B5 - A5 -', 'E5 - - - - - - - - - - - . . . .',
        'F5 - - - A5 - C6 - D6 - - - C6 - A5 -', 'B5 - - - G5 - - - D6 - - - B5 - G5 -',
        'A5 - - - E6 - - - D6 - C6 - B5 - C6 -', 'A5 - - - - - - - E5 - A5 - C6 - E6 -',
        'F6 - - - E6 - D6 - C6 - - - A5 - C6 -', 'B5 - - - G#5 - - - E5 - G#5 - B5 - D6 -',
        // puente: más alto y más tenso
        'C6 - B5 - A5 - - - E6 - - - - - - -', 'D6 - C6 - B5 - - - F6 - - - E6 - - -',
        'C6 - - - B5 - - - A5 - - - G#5 - - -', 'A5 - - - B5 - - - C6 - D6 - E6 - - -',
      ],
      arp: [
        'A3 A4 A3 A4 A3 A4 A3 A4 A3 A4 A3 A4 A3 A4 A3 A4', 'G#3 G#4 G#3 G#4 G#3 G#4 G#3 G#4 B3 B4 B3 B4 E4 E5 E4 E5',
        arp('A4 C5 E5 A5'), arp('A4 C5 E5 A5'), arp('F4 A4 C5 F5'), arp('G4 B4 D5 G5'),
        arp('A4 C5 E5 A5'), arp('A4 C5 E5 A5'), arp('F4 A4 C5 F5'), arp('E4 G#4 B4 E5'),
        arp('A4 C5 E5 A5'), arp('D4 F4 A4 D5'), arp('F4 A4 C5 F5'), arp('E4 G#4 B4 E5'),
      ],
      bajo: [
        'A1 - - - A1 - - - A1 - - - A1 - - -', 'G#1 - - - G#1 - - - B1 - - - E2 - - -',
        bajo8('A1', 'A2'), bajo8('A1', 'A2'), bajo8('F1', 'F2'), bajo8('G1', 'G2'),
        bajo8('A1', 'A2'), bajo8('A1', 'A2'), bajo8('F1', 'F2'), bajo8('E1', 'E2'),
        bajo8('A1', 'A2'), bajo8('D2', 'D3'), bajo8('F1', 'F2'), bajo8('E1', 'E2'),
      ],
      bat: [
        't . . . t . . . t . . . t . t .', 't . t . t . t . s s s s s s s s',
        ...rep('k . h k s . h . k k h . s . h h', 7), 'k . s . s . t . t . t . s s s s',
        ...rep('k h s h k h s h k h s h k k s s', 3), 's s s s s s s s t t t t s s s s',
      ],
    },
  },
  // fanfarrias (una sola vez)
  victoria: {
    bpm: 150, bucle: false,
    compases: {
      lead: ['C5 . C5 . C5 . C5 - - - Ab4 - - - Bb4 -', 'C5 - - - Bb4 - C5 - - - - - - - - -', 'G5 - - - E5 - G5 - C6 - - - - - - -'],
      arp: [arp('C4 E4 G4'), arp('Ab3 C4 Eb4'), arp('C4 E4 G4')],
      bajo: ['C2 . C2 . C2 . C2 - - - Ab1 - - - Bb1 -', 'C2 - - - Bb1 - C2 - - - - - - - - -', 'G1 - - - E2 - G2 - C2 - - - - - - -'],
      bat: ['k . k . k . k . . . s . . . s .', 'k . . . s . k . . . . . . . . .', 'k . s . k . s . k . . . . . . .'],
    },
  },
  derrota: {
    bpm: 90, bucle: false, vol: 0.8,
    compases: { lead: ['E5 - - - D5 - - - C5 - - - B4 - - -', 'A4 - - - - - - - - - - - . . . .'], bajo: ['A2 - - - G2 - - - F2 - - - E2 - - -', 'A1 - - - - - - - - - - - . . . .'] },
  },
  evolucion: {
    bpm: 190, bucle: false,
    compases: {
      arp: [arp('C4 E4 G4 C5'), arp('D4 F#4 A4 D5'), arp('E4 G#4 B4 E5'), arp('F#4 A#4 C#5 F#5')],
      bajo: ['C2 - - - - - - - C3 - - - - - - -', 'D2 - - - - - - - D3 - - - - - - -', 'E2 - - - - - - - E3 - - - - - - -', 'F#2 - - - - - - - F#3 - - - - - - -'],
      bat: ['h . h . h . h . h . h . h . h .', 'h h h h h h h h h h h h h h h h', 's . s . s . s . s s s s s s s s', 's s s s s s s s t t t t s s s s'],
    },
  },
  evolucionado: {
    bpm: 140, bucle: false,
    compases: {
      lead: ['G5 . G5 . G5 . C6 - - - - - - - - -', 'B5 - A5 - G5 - C6 - - - - - - - - -'],
      arp: [arp('C5 E5 G5'), arp('C5 E5 G5')],
      bajo: ['C2 . C2 . C2 . C3 - - - - - - - - -', 'G2 - F2 - E2 - C2 - - - - - - - - -'],
      bat: ['k . k . k . s - - - - - - - - -', 'k . s . k . s . k . . . . . . .'],
    },
  },
};

// ------------------------------------------------------------------ motor
const NOTAS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function freq(n: string, transp: number) {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = 12 * (Number(m[2]) + 1) + NOTAS[m[1]] + transp;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const KEY = 'primal_musica';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ruido: AudioBuffer | null = null;
let pulso: PeriodicWave | null = null;
let activa = (() => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } })();
let actual: { id: string; pista: Pista; paso: number; t: number; transp: number; fin?: () => void } | null = null;
let deseada: { id: string; transp: number } | null = null;
let reloj: ReturnType<typeof setInterval> | null = null;

function iniciarAudio() {
  if (ctx) return;
  const AC = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = activa ? 0.22 : 0;
  master.connect(comp);
  ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // onda de pulso al 25% (el sonido "fino" de las consolas clásicas)
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
  pulso = ctx.createPeriodicWave(re, im);
  reloj = setInterval(programar, 25);
  if (deseada) tocar(deseada.id, deseada.transp);
}

// el navegador solo deja sonar audio después de que el jugador toca algo
const desbloquear = () => { iniciarAudio(); void ctx?.resume(); };
window.addEventListener('pointerdown', desbloquear, { capture: true });
window.addEventListener('keydown', desbloquear, { capture: true });

function nota(canal: Canal, f: number, t: number, dur: number, vol: number) {
  if (!ctx || !master || !f) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  if (canal === 'lead') o.type = 'square';
  else if (canal === 'arp' && pulso) o.setPeriodicWave(pulso);
  else o.type = 'triangle';
  o.frequency.value = f;
  const v = vol * (canal === 'lead' ? 0.32 : canal === 'arp' ? 0.16 : 0.55);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.006);
  g.gain.setValueAtTime(v * 0.75, t + Math.min(dur * 0.6, 0.08));
  g.gain.linearRampToValueAtTime(0, t + dur);
  // vibrato en las notas largas de la melodía
  if (canal === 'lead' && dur > 0.35) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.5; lg.gain.value = f * 0.012;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t + 0.15); lfo.stop(t + dur);
  }
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function golpe(tipo: string, t: number, vol: number) {
  if (!ctx || !master || !ruido) return;
  if (tipo === 'k' || tipo === 't') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(tipo === 'k' ? 150 : 220, t);
    o.frequency.exponentialRampToValueAtTime(tipo === 'k' ? 40 : 90, t + 0.14);
    g.gain.setValueAtTime(vol * (tipo === 'k' ? 0.9 : 0.6), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.18);
    return;
  }
  const s = ctx.createBufferSource(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
  s.buffer = ruido;
  fl.type = tipo === 'h' ? 'highpass' : 'bandpass';
  fl.frequency.value = tipo === 'h' ? 7000 : 1800;
  const dur = tipo === 'h' ? 0.04 : 0.12;
  g.gain.setValueAtTime(vol * (tipo === 'h' ? 0.18 : 0.45), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl).connect(g).connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.01);
}

/** Programa los pasos que caen en los próximos 120 ms (así el ritmo no depende del juego). */
function programar() {
  if (!ctx || !actual) return;
  const a = actual;
  const paso = 60 / a.pista.bpm / 4;
  const total = Math.max(...Object.values(a.pista.compases).map((c) => c!.length)) * 16;
  while (a.t < ctx.currentTime + 0.12) {
    if (a.paso >= total) {
      if (!a.pista.bucle) { const f = a.fin; actual = null; f?.(); return; }
      // al repetir se salta la introducción del tema legendario
      a.paso = a.id === 'legendario' ? 32 : 0;
    }
    const vol = a.pista.vol ?? 0.85;
    for (const canal of Object.keys(a.pista.compases) as Canal[]) {
      const comp = a.pista.compases[canal]!;
      const barra = comp[Math.floor(a.paso / 16) % comp.length];
      const toks = C(barra);
      const k = a.paso % 16;
      const tok = toks[k];
      if (!tok || tok === '-' || tok === '.') continue;
      if (canal === 'bat') { golpe(tok, a.t, vol); continue; }
      // duración: hasta que deja de haber "-"
      let n = 1;
      while (k + n < 16 && toks[k + n] === '-') n++;
      nota(canal, freq(tok, a.transp), a.t, n * paso * 0.95, vol);
    }
    a.paso++;
    a.t += paso;
  }
}

/** Cambia de pista (si ya suena esa, no hace nada). transp: semitonos (cada legendario su tono). */
export function tocar(id: string, transp = 0, fin?: () => void) {
  deseada = PISTAS[id].bucle ? { id, transp } : deseada;
  if (!ctx) return;
  if (actual?.id === id && actual.transp === transp && PISTAS[id].bucle) return;
  actual = { id, pista: PISTAS[id], paso: 0, t: ctx.currentTime + 0.06, transp, fin };
}

/** Toca una fanfarria y luego vuelve a la pista de fondo indicada. */
export function fanfarria(id: string, luego?: string) {
  if (luego) deseada = { id: luego, transp: 0 };
  tocar(id, 0, () => { if (luego) tocar(luego); });
}

export function parar() {
  actual = null;
}

export const musicaActiva = () => activa;
export function alternarMusica() {
  activa = !activa;
  try { localStorage.setItem(KEY, activa ? '1' : '0'); } catch { /* sin almacenamiento */ }
  if (master && ctx) master.gain.setTargetAtTime(activa ? 0.22 : 0, ctx.currentTime, 0.05);
  return activa;
}

/** Tono del tema legendario según el legendario (todos épicos, cada uno con su color). */
export const TONO_LEGENDARIO: Record<string, number> = { taitachimbo: -2, mamatungura: 0, inti: 3, apukuntur: -3, cuichi: 2 };
void reloj;
