"""Zonas de cada entrenador para poder cambiarle los colores en el juego, y su retrato.

Un modelo de reconocimiento de ropa (segformer_b2_clothes, en la tarjeta gráfica) marca en la imagen original
qué es gorra, pelo, piel, ropa de arriba, de abajo y zapatos. Luego se pasa a pixel art igual que generar.py.

Genera, para cada entrenador n:
  entrenadores/<n>.png            sprite de cuerpo entero (96 px de alto + contorno)
  entrenadores/zonas/<n>.png      mismo tamaño; canal rojo = zona (ver ZONAS)
  entrenadores/retratos/<n>.png   cara en pixel art (40×40) para el círculo del perfil
  entrenadores/retratos/<n>_z.png sus zonas
  client/src/zonas_entrenadores.json  qué zonas tiene cada entrenador

Uso: python zonas.py [--ver]   (--ver guarda una lámina de control en zonas/_control.png)
"""
import json
import os
import sys

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import AutoModelForSemanticSegmentation

HERE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(HERE, '..', '..'))
N = 16
ALTO = 96
RETRATO = 40
# zonas del juego: 1 piel, 2 pelo, 3 gorra, 4 arriba, 5 abajo, 6 zapatos
ZONAS = ['', 'piel', 'pelo', 'gorra', 'arriba', 'abajo', 'zapatos']
# etiquetas del modelo -> zona (0 = se deja igual)
MAPA = {1: 3, 2: 2, 4: 4, 7: 4, 5: 5, 6: 5, 9: 6, 10: 6, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1}
FONDO = 0


def segmentar(model, im):
    a = np.asarray(im.resize((512, 512), Image.BILINEAR)).astype(np.float32) / 255
    a = (a - np.array([0.485, 0.456, 0.406])) / np.array([0.229, 0.224, 0.225])
    with torch.no_grad():
        out = model(pixel_values=torch.tensor(a.transpose(2, 0, 1)[None], dtype=torch.float32).cuda()).logits
    return torch.nn.functional.interpolate(out, size=im.size[::-1], mode='bilinear').argmax(1)[0].cpu().numpy()


def alfa(rgb):
    """Igual que generar.process: fondo blanco conectado a los bordes -> transparente, figura más grande."""
    h, w = rgb.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flood = rgb.copy()
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        cv2.floodFill(flood, mask, seed, (255, 0, 255), (28, 28, 28), (28, 28, 28), flags=4 | cv2.FLOODFILL_FIXED_RANGE)
    a = np.where(mask[1:-1, 1:-1] > 0, 0, 255).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 0).astype(np.uint8), 8)
    if n > 1:
        keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        a = np.where(lab == keep, a, 0)
    # sombra del suelo: zonas claras o grises (sin color) que llegan a la parte baja de la figura
    ys, xs = np.nonzero(a)
    fy0, fy1 = ys.min(), ys.max()
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    neutral = ((hsv[..., 1] < 40) & (hsv[..., 2] > 150) & (a > 0)).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(neutral, 8)
    for i in range(1, n):
        top = stats[i, cv2.CC_STAT_TOP]
        if top + stats[i, cv2.CC_STAT_HEIGHT] >= fy1 - (fy1 - fy0) * 0.04 and top >= fy0 + (fy1 - fy0) * 0.55:
            a[lab == i] = 0
    band = np.zeros_like(a, bool)
    band[int(fy1 - (fy1 - fy0) * 0.06):fy1 + 1] = True
    a[band & (hsv[..., 1] < 50) & (hsv[..., 2] > 90)] = 0
    return a


def zonas_de(seg, rgb, a):
    """Zona por píxel. La piel solo donde el color se parece a la piel de la cara (no ojos, boca ni guantes)."""
    z = np.zeros(seg.shape, np.uint8)
    for k, v in MAPA.items():
        z[seg == k] = v
    cara = rgb[(seg == 11) & (a > 0)]
    if len(cara):
        hsv = cv2.cvtColor(cara.reshape(-1, 1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3)
        piel = cara[(hsv[:, 2] > 90) & (hsv[:, 1] > 25)]
        ref = np.median(piel if len(piel) > 50 else cara, axis=0)
        lejos = np.abs(rgb.astype(int) - ref).sum(-1) > 150
        z[(z == 1) & lejos] = 0
    # huecos de fondo dentro de la figura (entre las piernas): fuera
    claro = (rgb.min(-1) > 225)
    a[(seg == FONDO) & claro] = 0
    z[a == 0] = 0
    return z, a


def pixelar(rgba, z, alto, contorno=True):
    ch, cw = rgba.shape[:2]
    scale = alto / ch
    tw = max(1, round(cw * scale))
    out = np.zeros((alto, tw, 4), np.uint8)
    zo = np.zeros((alto, tw), np.uint8)
    for j in range(alto):
        for i in range(tw):
            a0, a1 = int(j / scale), max(int(j / scale) + 1, int((j + 1) / scale))
            b0, b1 = int(i / scale), max(int(i / scale) + 1, int((i + 1) / scale))
            blk = rgba[a0:a1, b0:b1].reshape(-1, 4)
            zb = z[a0:a1, b0:b1].reshape(-1)
            op = blk[:, 3] > 0
            if op.sum() < len(blk) * 0.45:
                continue
            out[j, i, :3] = np.median(blk[op][:, :3], axis=0)
            out[j, i, 3] = 255
            zo[j, i] = np.bincount(zb[op], minlength=7).argmax()
    rgbq = Image.fromarray(out[..., :3]).quantize(colors=24, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    arr = np.dstack([np.array(rgbq), out[..., 3]])
    if not contorno:
        return arr, zo
    pad = np.zeros((arr.shape[0] + 2, arr.shape[1] + 2, 4), np.uint8)
    pad[1:-1, 1:-1] = arr
    zp = np.zeros(pad.shape[:2], np.uint8)
    zp[1:-1, 1:-1] = zo
    a2 = pad[..., 3] > 0
    ring = (cv2.dilate(a2.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & ~a2
    pad[ring] = (24, 18, 30, 255)
    return pad, zp


def guardar_z(zo, path):
    img = np.zeros(zo.shape + (4,), np.uint8)
    img[..., 0] = zo
    img[..., 3] = np.where(zo > 0, 255, 0)
    Image.fromarray(img, 'RGBA').save(path)


def main(ver):
    model = AutoModelForSemanticSegmentation.from_pretrained('mattmdjaga/segformer_b2_clothes').cuda().eval()
    for d in ('zonas', 'retratos'):
        os.makedirs(os.path.join(HERE, d), exist_ok=True)
    info, control = {}, []
    for n in range(N):
        im = Image.open(os.path.join(HERE, 'originales', f'{n}.webp')).convert('RGB')
        rgb = np.array(im)
        seg = segmentar(model, im)
        a = alfa(rgb)
        z, a = zonas_de(seg, rgb, a)
        ys, xs = np.nonzero(a)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rgba = np.dstack([rgb, a])
        spr, zs = pixelar(rgba[y0:y1, x0:x1], z[y0:y1, x0:x1], ALTO)
        Image.fromarray(spr, 'RGBA').save(os.path.join(HERE, f'{n}.png'))
        guardar_z(zs, os.path.join(HERE, 'zonas', f'{n}.png'))
        # retrato: cuadrado alrededor de la cabeza (gorra + pelo + cara)
        cab = np.isin(seg, [1, 2, 11]) & (a > 0)
        cy, cx = np.nonzero(cab)
        hx0, hx1, hy0, hy1 = cx.min(), cx.max(), cy.min(), cy.max()
        lado = int(max(hx1 - hx0, hy1 - hy0) * 1.18)
        mx, my = (hx0 + hx1) // 2, (hy0 + hy1) // 2 + int(lado * 0.06)
        sx0, sy0 = mx - lado // 2, my - lado // 2
        caja = np.zeros((lado, lado, 4), np.uint8)
        zc = np.zeros((lado, lado), np.uint8)
        ox0, oy0 = max(0, sx0), max(0, sy0)
        ox1, oy1 = min(rgb.shape[1], sx0 + lado), min(rgb.shape[0], sy0 + lado)
        caja[oy0 - sy0:oy1 - sy0, ox0 - sx0:ox1 - sx0] = rgba[oy0:oy1, ox0:ox1]
        zc[oy0 - sy0:oy1 - sy0, ox0 - sx0:ox1 - sx0] = z[oy0:oy1, ox0:ox1]
        ret, zr = pixelar(caja, zc, RETRATO, contorno=False)
        Image.fromarray(ret, 'RGBA').save(os.path.join(HERE, 'retratos', f'{n}.png'))
        guardar_z(zr, os.path.join(HERE, 'retratos', f'{n}_z.png'))
        presentes = [ZONAS[k] for k in range(1, 7) if (zs == k).sum() >= 6]
        info[n] = presentes
        print(n, spr.shape[1], 'x', spr.shape[0], presentes, flush=True)
        if ver:
            control.append((spr, zs, ret))
    with open(os.path.join(RAIZ, 'client', 'src', 'zonas_entrenadores.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f)
    if ver:
        PAL = np.array([[0, 0, 0, 0], [255, 200, 150, 255], [230, 60, 200, 255], [255, 40, 40, 255], [60, 160, 255, 255], [90, 220, 90, 255], [150, 90, 30, 255]], np.uint8)
        S = 3
        lam = Image.new('RGBA', (N * 60 * S, 100 * S * 2 + 50 * S), (40, 30, 70, 255))
        for k, (spr, zs, ret) in enumerate(control):
            lam.alpha_composite(Image.fromarray(spr).resize((spr.shape[1] * S, spr.shape[0] * S), Image.NEAREST), (k * 60 * S, 0))
            zi = Image.fromarray(PAL[zs])
            lam.alpha_composite(zi.resize((zi.width * S, zi.height * S), Image.NEAREST), (k * 60 * S, 100 * S))
            lam.alpha_composite(Image.fromarray(ret).resize((RETRATO * S, RETRATO * S), Image.NEAREST), (k * 60 * S, 200 * S + 10))
        lam.save(os.path.join(HERE, 'zonas', '_control.png'))


if __name__ == '__main__':
    main('--ver' in sys.argv)
