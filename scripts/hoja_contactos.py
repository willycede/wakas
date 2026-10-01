"""Hoja de contactos: todos los sprites de Primales en una sola imagen (para revisar el arte).

Uso: python scripts/hoja_contactos.py [salida.png]
"""
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DB = json.load(open(os.path.join(ROOT, 'assets', 'criaturas', 'criaturas.json'), encoding='utf-8'))
SPR = os.path.join(ROOT, 'assets', 'criaturas', 'sprites')
COL, CELDA, K = 10, 120, 2

ids = [k for k in DB if os.path.exists(os.path.join(SPR, k + '.png'))]
filas = (len(ids) + COL - 1) // COL
hoja = Image.new('RGBA', (COL * CELDA, filas * CELDA), (40, 32, 64, 255))
d = ImageDraw.Draw(hoja)
for i, cid in enumerate(ids):
    im = Image.open(os.path.join(SPR, cid + '.png')).convert('RGBA')
    k = min(K, (CELDA - 22) / im.height, (CELDA - 6) / im.width)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.NEAREST)
    x, y = (i % COL) * CELDA, (i // COL) * CELDA
    hoja.paste(im, (x + (CELDA - im.width) // 2, y + CELDA - 16 - im.height), im)
    d.text((x + 4, y + CELDA - 14), cid, fill=(230, 220, 255, 255))
salida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'hoja.png')
hoja.save(salida)
print(salida, len(ids))
