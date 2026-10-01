"""Arte de los Primales: se genera con IA (FLUX en Stable Horde, gratis) y se convierte en
pixel art de verdad (cuadrícula fija, paleta limitada, contorno oscuro).

Para agregar una criatura nueva:
  1. Añádela en assets/criaturas/criaturas.json (id + descripción visual en inglés).
  2. python assets/criaturas/generar.py <id>        (genera y procesa solo esa)
  3. Revisa assets/criaturas/sprites/<id>.png

Uso: python generar.py [id ...]      (sin argumentos: las que aún no tienen sprite)
     python generar.py --procesar <id> (solo reprocesa la imagen original ya descargada)
"""
import json
import os
import sys
import time
import urllib.request

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'originales')
OUT = os.path.join(HERE, 'sprites')
API = 'https://stablehorde.net/api/v2'
HEADERS = {'apikey': '0000000000', 'Content-Type': 'application/json', 'Client-Agent': 'primal-clash:0.1:anon'}
# Modelo de IA: FLUX es el mejor pero en el servicio gratuito tiene muy pocos servidores; los SDXL
# suelen estar libres. Se elige con la variable MODELO (por defecto el rápido).
MODELOS = {
    'flux': ('Flux.1-Schnell fp8 (Compact)', {'steps': 4, 'cfg_scale': 1, 'sampler_name': 'k_euler', 'width': 768, 'height': 768}),
    'aam': ('AAM XL', {'steps': 24, 'cfg_scale': 6, 'sampler_name': 'k_euler_a', 'width': 1024, 'height': 1024}),
    'dreamshaper': ('DreamShaper XL', {'steps': 8, 'cfg_scale': 2, 'sampler_name': 'k_dpmpp_sde', 'width': 1024, 'height': 1024}),
    'juggernaut': ('Juggernaut XL', {'steps': 28, 'cfg_scale': 6, 'sampler_name': 'k_dpmpp_2m', 'width': 1024, 'height': 1024}),
}
MODEL, MODEL_PARAMS = MODELOS.get(os.environ.get('MODELO', 'hf'), MODELOS['flux'])
# 'hf' (por defecto): el espacio público de FLUX.1-schnell en Hugging Face. Rápido (segundos) y
# de la mejor calidad, pero con cupo diario; si se agota, usa MODELO=flux (Stable Horde, lento).
HF = 'https://black-forest-labs-flux-1-schnell.hf.space'
USAR_HF = os.environ.get('MODELO', 'hf') == 'hf'
NEGATIVE = 'text, watermark, signature, multiple creatures, human, cropped, blurry, photo, realistic, 3d render, frame, border'

# Estilo común: todas las criaturas se piden igual para que el juego se vea coherente
STYLE = ('pixel art game sprite of one {desc}, original creature design for a monster battle game, '
         'in the style of 16-bit creature battle sprites, three-quarter view facing right, full body, '
         'flat shading with a limited palette, bold dark outline, centered, plain white background, no text')

# Tamaño final del sprite (alto en píxeles de arte) según la talla de la criatura
SIZES = {'pequeño': 48, 'mediano': 64, 'grande': 84, 'enorme': 100}


def load_db():
    return json.load(open(os.path.join(HERE, 'criaturas.json'), encoding='utf-8'))


def generate_hf(cid, desc, seed):
    body = json.dumps({'data': [STYLE.format(desc=desc), int(seed), False, 768, 768, 4]}).encode()
    req = urllib.request.Request(HF + '/gradio_api/call/infer', data=body, headers={'Content-Type': 'application/json'})
    ev = json.loads(urllib.request.urlopen(req, timeout=60).read())['event_id']
    with urllib.request.urlopen(HF + '/gradio_api/call/infer/' + ev, timeout=300) as r:
        txt = r.read().decode()
    data = None
    for line in txt.splitlines():
        if line.startswith('data:') and 'url' in line:
            data = json.loads(line[5:])
    if 'event: error' in txt or not data:
        raise RuntimeError('Hugging Face sin respuesta (¿cupo agotado?): ' + txt[-200:])
    os.makedirs(RAW, exist_ok=True)
    path = os.path.join(RAW, cid + '.webp')
    urllib.request.urlretrieve(data[0]['url'], path)
    print(cid, 'generado (hf)', flush=True)
    return path


def generate(cid, desc, seed):
    if USAR_HF:
        return generate_hf(cid, desc, seed)
    return generate_horde(cid, desc, seed)


def generate_horde(cid, desc, seed):
    model, params = MODELOS['flux']
    prompt = STYLE.format(desc=desc)
    body = {'prompt': prompt,
            'params': {**params, 'seed': str(seed), 'n': 1},
            'models': [model], 'nsfw': False, 'censor_nsfw': True, 'r2': True}
    req = urllib.request.Request(API + '/generate/async', data=json.dumps(body).encode(), headers=HEADERS)
    jid = json.loads(urllib.request.urlopen(req, timeout=60).read())['id']
    print(cid, 'en cola', jid, flush=True)
    t0 = time.time()
    while True:
        time.sleep(8)
        try:
            st = json.loads(urllib.request.urlopen(urllib.request.Request(API + '/generate/check/' + jid, headers=HEADERS), timeout=60).read())
        except Exception as e:  # la red a veces se corta: se reintenta
            print(cid, 'reintento', e, flush=True)
            continue
        if st.get('done') or st.get('faulted') or time.time() - t0 > 1800:
            break
    res = json.loads(urllib.request.urlopen(urllib.request.Request(API + '/generate/status/' + jid, headers=HEADERS), timeout=60).read())
    os.makedirs(RAW, exist_ok=True)
    path = os.path.join(RAW, cid + '.webp')
    urllib.request.urlretrieve(res['generations'][0]['img'], path)
    return path


def detect_block(rgb):
    """Tamaño aproximado del 'píxel' del arte (la IA dibuja bloques de varios píxeles)."""
    g = rgb.mean(-1)
    dx = np.abs(np.diff(g, axis=1)) > 18
    runs = []
    for row in dx[::7]:
        idx = np.nonzero(row)[0]
        if len(idx) > 3:
            d = np.diff(idx)
            runs += list(d[(d >= 3) & (d <= 20)])
    if not runs:
        return 8
    vals, counts = np.unique(runs, return_counts=True)
    return int(vals[counts.argmax()])


def mira_izquierda(alpha):
    """La cabeza suele ser la parte alta y delantera: si la masa de arriba está a la izquierda del
    centro, la criatura mira a la izquierda."""
    ys, xs = np.nonzero(alpha)
    y0, y1 = ys.min(), ys.max()
    alto = ys <= y0 + (y1 - y0) * 0.45
    return xs[alto].mean() < xs.mean() - (xs.max() - xs.min()) * 0.03


def process(cid, size_name, voltear=None):
    import cv2
    src = Image.open(os.path.join(RAW, cid + '.webp')).convert('RGB')
    rgb = np.array(src)
    h, w = rgb.shape[:2]
    # fondo blanco conectado a los bordes -> transparente
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flood = rgb.copy()
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        cv2.floodFill(flood, mask, seed, (255, 0, 255), (28, 28, 28), (28, 28, 28), flags=4 | cv2.FLOODFILL_FIXED_RANGE)
    alpha = np.where(mask[1:-1, 1:-1] > 0, 0, 255).astype(np.uint8)
    # quita motas sueltas: se queda con la figura más grande
    n, lab, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)
    if n > 1:
        keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        big = stats[1:, cv2.CC_STAT_AREA] > stats[keep, cv2.CC_STAT_AREA] * 0.08
        ok = np.isin(lab, [i + 1 for i in np.nonzero(big)[0]])
        alpha = np.where(ok, alpha, 0)
    # sombra del suelo y huecos blancos entre las patas: zonas claras y grises (sin color)
    # que llegan a la parte baja de la figura
    ys, xs = np.nonzero(alpha)
    fy0, fy1 = ys.min(), ys.max()
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    neutral = ((hsv[..., 1] < 40) & (hsv[..., 2] > 150) & (alpha > 0)).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(neutral, 8)
    for i in range(1, n):
        top = stats[i, cv2.CC_STAT_TOP]
        bottom = top + stats[i, cv2.CC_STAT_HEIGHT]
        if bottom >= fy1 - (fy1 - fy0) * 0.04 and top >= fy0 + (fy1 - fy0) * 0.55:
            alpha[lab == i] = 0
    # lo gris oscuro de la sombra pegada al suelo (franja baja y ancha, poco saturada)
    band = np.zeros_like(alpha, bool)
    band[int(fy1 - (fy1 - fy0) * 0.06):fy1 + 1] = True
    alpha[band & (hsv[..., 1] < 50) & (hsv[..., 2] > 90)] = 0
    ys, xs = np.nonzero(alpha)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    crop = np.dstack([rgb, alpha])[y0:y1, x0:x1]
    # todas las criaturas deben mirar a la derecha (el juego las gira al moverse)
    if voltear if voltear is not None else mira_izquierda(crop[..., 3] > 0):
        crop = crop[:, ::-1].copy()
        print(cid, 'volteado para mirar a la derecha', flush=True)
    # a la cuadrícula de pixel art: alto final según la talla, cada bloque = el color más común
    target_h = SIZES.get(size_name, 64)
    ch, cw = crop.shape[:2]
    scale = target_h / ch
    tw = max(1, round(cw * scale))
    out = np.zeros((target_h, tw, 4), np.uint8)
    for j in range(target_h):
        for i in range(tw):
            a0, a1 = int(j / scale), max(int(j / scale) + 1, int((j + 1) / scale))
            b0, b1 = int(i / scale), max(int(i / scale) + 1, int((i + 1) / scale))
            blk = crop[a0:a1, b0:b1].reshape(-1, 4)
            opaque = blk[blk[:, 3] > 0]
            if len(opaque) < len(blk) * 0.45:
                continue
            # color mediano del bloque (evita bordes mezclados)
            out[j, i, :3] = np.median(opaque[:, :3], axis=0)
            out[j, i, 3] = 255
    img = Image.fromarray(out, 'RGBA')
    # paleta limitada (coherencia con el resto)
    rgbq = img.convert('RGB').quantize(colors=20, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    q = np.array(rgbq)
    arr = np.dstack([q, out[..., 3]])
    # contorno oscuro de 1 píxel alrededor de la figura
    a = arr[..., 3] > 0
    grown = cv2.dilate(a.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    ring = grown & ~a
    pad = np.zeros((arr.shape[0] + 2, arr.shape[1] + 2, 4), np.uint8)
    pad[1:-1, 1:-1] = arr
    a2 = pad[..., 3] > 0
    ring2 = (cv2.dilate(a2.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & ~a2
    pad[ring2] = (24, 18, 30, 255)
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(pad, 'RGBA').save(os.path.join(OUT, cid + '.png'))
    print(cid, 'listo', pad.shape[1], 'x', pad.shape[0], flush=True)


if __name__ == '__main__':
    db = load_db()
    args = sys.argv[1:]
    if args[:1] == ['--procesar']:
        for cid in args[1:]:
            process(cid, db[cid]['talla'], db[cid].get('voltear'))
        sys.exit()
    todo = args or [k for k in db if not os.path.exists(os.path.join(OUT, k + '.png'))]
    # Cola compartida: un trabajador usa Hugging Face (rápido, espera cuando se agota el cupo) y
    # dos usan Stable Horde (lento pero constante). Mismo modelo FLUX, mismo estilo.
    import threading
    cola = list(todo)
    lock = threading.Lock()
    hechos = []

    def siguiente():
        with lock:
            return cola.pop(0) if cola else None

    def devolver(cid):
        with lock:
            cola.insert(0, cid)

    def trabajador(usar_hf):
        global USAR_HF
        while True:
            cid = siguiente()
            if cid is None:
                return
            c = db[cid]
            try:
                if usar_hf:
                    generate_hf(cid, c['visual'], c.get('semilla', 7))
                else:
                    generate_horde(cid, c['visual'], c.get('semilla', 7))
                process(cid, c['talla'], c.get('voltear'))
                hechos.append(cid)
                print(f'[{len(hechos)}/{len(todo)}]', flush=True)
            except Exception as e:
                print(cid, 'ERROR', 'hf' if usar_hf else 'horde', str(e)[:120], flush=True)
                devolver(cid)
                time.sleep(75 if usar_hf else 20)

    modos = [True, False, False] if os.environ.get('MODELO', 'hf') == 'hf' else [False, False]
    hilos = [threading.Thread(target=trabajador, args=(m,)) for m in modos]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()
