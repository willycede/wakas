"""Animaciones en pixel art para cada Primal, generadas a partir de su sprite.

Se deforma el dibujo fila por fila con desplazamientos enteros (así sigue siendo pixel art nítido):
  - idle (4):    respiración: el cuerpo se estira y encoge apoyado en los pies.
  - walk (6):    se detectan las patas y cada una gira desde la cadera alternándose (una avanza
                 levantando el pie mientras la otra empuja), el cuerpo bota y la cabeza se retrasa.
  - attack (5):  anticipación (se encoge hacia atrás), golpe (se estira hacia delante),
                 pausa, recuperación.
  - hurt (2):    sacudida hacia atrás.
  - faint (4):   se inclina y se aplasta contra el suelo.
Salida: sprites/anim/<id>.png (tira horizontal) y anim/animaciones.json (tamaño y cuadros).
Uso: python animar.py [id ...]
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'sprites')
OUT = os.path.join(HERE, 'sprites', 'anim')
PAD = 8  # margen alrededor del sprite para estirarlo sin cortarlo

ANIMS = [('idle', 4, 6, -1), ('walk', 6, 11, -1), ('attack', 5, 16, 0), ('hurt', 2, 12, 0), ('faint', 4, 8, 0)]


def bbox_rows(a):
    ys = np.nonzero(a.any(1))[0]
    return ys.min(), ys.max()


def warp(img, row_dx, scale_y=1.0, scale_x=1.0, dy=0, rot=0.0):
    """img: RGBA (h, w). row_dx(y_rel 0..1 desde los pies) -> desplazamiento en x.
    scale_y/scale_x: estiramiento anclado en los pies (centro abajo). rot: inclinación (cizalla)."""
    h, w = img.shape[:2]
    H, W = h + 2 * PAD, w + 2 * PAD
    out = np.zeros((H, W, 4), np.uint8)
    a = img[..., 3] > 0
    top, bot = bbox_rows(a)
    feet = PAD + bot
    cx = PAD + w / 2
    hgt = max(1, bot - top)
    for Y in range(H):
        # fila de origen (escala vertical anclada en los pies)
        sy = (Y - feet - dy) / scale_y + bot
        yi = int(round(sy))
        if yi < 0 or yi >= h:
            continue
        rel = (bot - yi) / hgt  # 0 en los pies, 1 en la cabeza
        shift = row_dx(rel) + rot * rel * hgt
        for X in range(W):
            sx = (X - cx - shift) / scale_x + w / 2
            xi = int(math.floor(sx))
            if 0 <= xi < w and img[yi, xi, 3] > 0:
                out[Y, X] = img[yi, xi]
    return out


def patas(img):
    """Separa las patas: componentes de la franja baja de la figura (o mitades si es una sola pieza).
    Devuelve (fila de la cadera, lista de máscaras booleanas de cada pata)."""
    import cv2
    a = img[..., 3] > 0
    top, bot = bbox_rows(a)
    hgt = bot - top
    cadera = int(bot - hgt * 0.3)
    banda = np.zeros_like(a)
    banda[cadera:bot + 1] = a[cadera:bot + 1]
    # las patas se separan mejor un poco más abajo de la cadera
    corte = int(bot - hgt * 0.16)
    n, lab = cv2.connectedComponents(banda[corte:].astype(np.uint8), 8)
    comps = []
    for i in range(1, n):
        m = lab == i
        if m.sum() >= max(3, hgt * 0.15):
            comps.append(m)
    mascaras = []
    if len(comps) >= 2:
        # cada pata incluye su parte alta (desde la cadera) por columnas
        for m in comps:
            cols = np.nonzero(m.any(0))[0]
            mk = np.zeros_like(a)
            mk[cadera:bot + 1, cols.min():cols.max() + 1] = banda[cadera:bot + 1, cols.min():cols.max() + 1]
            mascaras.append(mk)
    else:
        # una sola pieza: delante y detrás
        ys, xs = np.nonzero(banda)
        if len(xs):
            mid = int(np.median(xs))
            m1 = banda.copy(); m1[:, mid:] = False
            m2 = banda.copy(); m2[:, :mid] = False
            mascaras = [m1, m2]
    # ordena de izquierda a derecha y evita solapes
    mascaras.sort(key=lambda m: np.nonzero(m.any(0))[0].mean())
    usado = np.zeros_like(a)
    limpias = []
    for m in mascaras:
        m = m & ~usado
        usado |= m
        limpias.append(m)
    return cadera, bot, limpias


def paso(img, s, bob, amp, lift, cadera, bot, mascaras, lean):
    """Un cuadro de caminata: las patas giran desde la cadera alternándose y el cuerpo bota."""
    h, w = img.shape[:2]
    H, W = h + 2 * PAD, w + 2 * PAD
    out = np.zeros((H, W, 4), np.uint8)
    a = img[..., 3] > 0
    piernas = np.zeros_like(a)
    for m in mascaras:
        piernas |= m
    alto = max(1, bot - cadera)
    top, _ = bbox_rows(a)
    cuerpo_h = max(1, cadera - top)

    def pinta(mask, dxf, dyf):
        ys, xs = np.nonzero(mask)
        for y, x in zip(ys, xs):
            # el desplazamiento se redondea por fila (si no, quedan huecos en las filas a medio píxel)
            X = x + PAD + int(math.floor(dxf(y) + 0.5))
            Y = y + PAD + int(math.floor(dyf(y) + 0.5))
            if 0 <= X < W and 0 <= Y < H:
                out[Y, X] = img[y, x]
    # patas de atrás primero (las de fase negativa), luego cuerpo, luego las de delante
    orden = sorted(range(len(mascaras)), key=lambda i: (s if i % 2 == 0 else -s))
    fases = {i: (s if i % 2 == 0 else -s) for i in range(len(mascaras))}
    def pata(i):
        f = fases[i]
        k = lambda y: max(0.0, min(1.0, (y - cadera) / alto))
        pinta(mascaras[i], lambda y: f * amp * k(y), lambda y: bob - max(0.0, f) * lift * k(y))
    # debajo de todo, las patas en reposo un poco más oscuras: tapan huecos al separarlas
    ys, xs = np.nonzero(piernas)
    for y, x in zip(ys, xs):
        Y = y + PAD + bob
        if 0 <= Y < H:
            out[Y, x + PAD] = (img[y, x, :3] * 0.7).astype(np.uint8).tolist() + [255]
    for i in orden[: len(orden) // 2]:
        pata(i)
    # cuerpo: bote + leve balanceo; la cabeza va un poco retrasada (movimiento secundario)
    pinta(a & ~piernas, lambda y: lean * max(0.0, (cadera - y) / cuerpo_h) - s * 0.6 * max(0.0, (cadera - y) / cuerpo_h - 0.6) * 2,
          lambda y: bob)
    for i in orden[len(orden) // 2:]:
        pata(i)
    return out


def frames_for(img):
    a = img[..., 3] > 0
    top, bot = bbox_rows(a)
    hgt = bot - top
    amp = max(1, round(hgt * 0.06))  # amplitud en píxeles según el tamaño
    out = {}
    # reposo: respiración
    out['idle'] = [warp(img, lambda r: 0, scale_y=1 + 0.035 * s, scale_x=1 - 0.02 * s) for s in (0, 0.5, 1, 0.5)]
    # caminar: cada pata gira desde la cadera (una adelante y otra atrás), el pie se levanta al
    # avanzar, el cuerpo bota en cada apoyo y la cabeza se retrasa un poco
    cadera, pie, mascaras = patas(img)
    walk = []
    for i in range(6):
        ph = i / 6 * math.tau
        s_ = math.sin(ph)
        bob = -round(abs(math.cos(ph)) * max(1, amp * 0.5))
        walk.append(paso(img, s_, bob, amp * 1.7, max(1, amp * 1.1), cadera, pie, mascaras, lean=round(amp * 0.25)))
    out['walk'] = walk
    # ataque: anticipación (atrás, encogido), golpe (adelante, estirado), pausa, recuperación
    out['attack'] = [
        warp(img, lambda r: 0, scale_y=0.94, scale_x=1.04, rot=-0.10),
        warp(img, lambda r: 0, scale_y=0.9, scale_x=1.08, rot=-0.16),
        warp(img, lambda r: round(amp * 1.5 * r), scale_y=1.06, scale_x=1.12, rot=0.14),
        warp(img, lambda r: round(amp * 1.2 * r), scale_y=1.03, scale_x=1.08, rot=0.10),
        warp(img, lambda r: 0, scale_y=1.0, scale_x=1.0, rot=0.03),
    ]
    out['hurt'] = [warp(img, lambda r: -round(amp * r), scale_y=0.95, scale_x=1.05, rot=-0.12), warp(img, lambda r: -round(amp * 0.5 * r), rot=-0.05)]
    out['faint'] = [warp(img, lambda r: 0, scale_y=s1, scale_x=s2, rot=rt) for s1, s2, rt in ((0.95, 1.05, -0.08), (0.8, 1.15, -0.2), (0.6, 1.25, -0.3), (0.45, 1.3, -0.35))]
    return out


def main(ids):
    os.makedirs(OUT, exist_ok=True)
    meta_path = os.path.join(OUT, 'animaciones.json')
    meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
    for cid in ids:
        img = np.array(Image.open(os.path.join(SRC, cid + '.png')).convert('RGBA'))
        fr = frames_for(img)
        fh, fw = img.shape[0] + 2 * PAD, img.shape[1] + 2 * PAD
        seq = []
        anims = {}
        for name, n, fps, rep in ANIMS:
            anims[name] = {'frames': list(range(len(seq), len(seq) + n)), 'fps': fps, 'repeat': rep}
            seq += fr[name][:n]
        sheet = Image.new('RGBA', (fw * len(seq), fh), (0, 0, 0, 0))
        for k, f in enumerate(seq):
            sheet.paste(Image.fromarray(f, 'RGBA'), (k * fw, 0))
        sheet.save(os.path.join(OUT, cid + '.png'))
        a = img[..., 3] > 0
        _, bot = bbox_rows(a)
        meta[cid] = {'w': fw, 'h': fh, 'pies': PAD + int(bot) + 1, 'anims': anims}
        print(cid, fw, 'x', fh, flush=True)
    json.dump(meta, open(meta_path, 'w', encoding='utf-8'), indent=1)


if __name__ == '__main__':
    db = json.load(open(os.path.join(HERE, 'criaturas.json'), encoding='utf-8'))
    main(sys.argv[1:] or [k for k in db if os.path.exists(os.path.join(SRC, k + '.png'))])
