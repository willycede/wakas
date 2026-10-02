"""Entrenadores para el avatar (estilo sprites de entrenador de Nintendo DS), con estilos de todo el mundo.
Se generan en la tarjeta gráfica (mismo modelo que generar_local.py) y se convierten a pixel art.

Uso: python assets/entrenadores/generar_entrenadores.py [n ...]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'criaturas'))
import torch  # noqa: E402

import generar  # noqa: E402
import generar_local  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402


def limpiar_fondo(path):
    """Pasa a blanco el color de fondo (también los huecos cerrados, como entre las piernas)."""
    import cv2
    im = np.array(Image.open(path).convert('RGB')).astype(int)
    fondo = np.median(np.concatenate([im[:8, :8].reshape(-1, 3), im[:8, -8:].reshape(-1, 3), im[-8:, :8].reshape(-1, 3), im[-8:, -8:].reshape(-1, 3)]), axis=0)
    parecido = (np.abs(im - fondo).sum(-1) < 40).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(parecido, 4)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 150:
            im[lab == i] = 255
    Image.fromarray(im.astype(np.uint8)).save(path, lossless=True)

# (descripción, semilla)
ENTRENADORES = [
    ('a young boy pokemon trainer with a red baseball cap, blue jacket, black jeans and a yellow backpack', 11),
    ('a young girl pokemon trainer with a white beanie, long dark hair, pink scarf, black dress and pink boots', 12),
    ('a young man wearing a white toquilla straw panama hat, white shirt, brown vest and jeans, from Ecuador', 13),
    ('a young japanese schoolgirl trainer in a sailor uniform with a red ribbon and short black hair', 14),
    ('a young boy wearing an andean chullo wool hat with earflaps and a colorful red striped poncho', 15),
    ('a sporty young woman with a ponytail wearing a yellow football jersey, blue shorts and sneakers', 16),
    ('a tanned young surfer man with sunglasses, tank top, board shorts and sandals, beach style', 117),
    ('a young female amazon jungle explorer with a safari hat, khaki vest, cargo shorts and binoculars', 118),
    ('a young ninja style trainer in a dark blue outfit with a red scarf and headband', 119),
    ('a young cowboy trainer with a brown cowboy hat, leather vest, bandana and boots, standing alone', 220),
    ('a young african boy trainer with a colorful kente pattern shirt, backwards cap and white sneakers', 21),
    ('a young girl with big curly hair, purple hoodie, headphones around her neck and jeans', 22),
    ('a mysterious young trainer in a long dark hooded cloak with glowing purple trim', 23),
    ('a punk rock girl trainer with a pink mohawk, studded leather jacket and ripped jeans', 24),
    ('a cool young skater boy with a grey beanie, oversized orange t-shirt and baggy pants', 125),
    ('a confident young champion trainer woman with a long white coat, black gloves and short silver hair', 26),
]
PROMPT = ('pixel art, one single character only, full body sprite of {desc}, pokemon trainer character, front view, standing confidently, '
          'nintendo DS pokemon platinum style trainer sprite, detailed clean pixel art, plain flat white background, no other characters, no sprite sheet')

if __name__ == '__main__':
    if sys.argv[1:2] == ['--procesar']:
        generar.RAW = os.path.join(HERE, 'originales'); generar.OUT = HERE; generar.SIZES['entrenador'] = 96
        for i in sys.argv[2:]:
            limpiar_fondo(os.path.join(generar.RAW, f'{i}.webp'))
            generar.process(i, 'entrenador', voltear=False)
        sys.exit()
    ids = [int(x) for x in sys.argv[1:]] or list(range(len(ENTRENADORES)))
    generar.RAW = os.path.join(HERE, 'originales')
    generar.OUT = HERE
    generar.SIZES['entrenador'] = 96
    os.makedirs(generar.RAW, exist_ok=True)
    pipe = generar_local.cargar()
    for i in ids:
        desc, semilla = ENTRENADORES[i]
        img = pipe(PROMPT.format(desc=desc), num_inference_steps=4, guidance_scale=0, width=832, height=1216, generator=torch.Generator('cpu').manual_seed(semilla)).images[0]
        img.save(os.path.join(generar.RAW, f'{i}.webp'), lossless=True)
        limpiar_fondo(os.path.join(generar.RAW, f'{i}.webp'))
        generar.process(str(i), 'entrenador', voltear=False)
