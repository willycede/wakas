"""Animaciones en pixel art para cada Primal, generadas a partir de su sprite.

Se deforma el dibujo fila por fila con desplazamientos enteros (así sigue siendo pixel art nítido):
  - idle (4):    respiración: el cuerpo se estira y encoge apoyado en los pies.
  - walk (6):    las patas (franja baja) se balancean adelante/atrás, el cuerpo sube y baja,
                 la cabeza va un poco por delante.
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

ANIMS = [('idle', 4, 6, -1), ('walk', 6, 12, -1), ('attack', 5, 16, 0), ('hurt', 2, 12, 0), ('faint', 4, 8, 0)]


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


def frames_for(img):
    a = img[..., 3] > 0
    top, bot = bbox_rows(a)
    hgt = bot - top
    amp = max(1, round(hgt * 0.06))  # amplitud en píxeles según el tamaño
    out = {}
    # reposo: respiración
    out['idle'] = [warp(img, lambda r: 0, scale_y=1 + 0.035 * s, scale_x=1 - 0.02 * s) for s in (0, 0.5, 1, 0.5)]
    # caminar: patas (rel < 0.3) se balancean; el cuerpo se adelanta un poco; bote
    walk = []
    for i in range(6):
        ph = i / 6 * math.tau
        s = math.sin(ph)
        bob = -abs(math.cos(ph)) * max(1, amp * 0.6)

        def dx(r, s=s):
            if r < 0.3:
                k = (0.3 - r) / 0.3  # más movimiento cuanto más abajo
                return round(s * amp * 1.4 * k)
            return round(s * amp * 0.25 * r)  # el cuerpo se balancea poco
        walk.append(warp(img, dx, dy=round(bob), rot=0.04 if s > 0 else 0.02))
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
    main(sys.argv[1:] or list(db))
