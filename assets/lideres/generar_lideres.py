"""Líderes de gimnasio, Alto Mando (Élite 4) y Campeona del Modo Historia.
Se generan en la tarjeta gráfica (mismo modelo y estilo que los entrenadores) y se pasan a pixel art:
  lideres/<id>.png           cuerpo entero (96 px de alto + contorno), para la arena
  lideres/retratos/<id>.png  cara (40×40), para los círculos y la ficha

Uso: python assets/lideres/generar_lideres.py [id ...]          (genera y procesa)
     python assets/lideres/generar_lideres.py --procesar [id ...] (solo vuelve a procesar)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'criaturas'))
sys.path.insert(0, os.path.join(HERE, '..', 'entrenadores'))

LIDERES = {
    'nina': ('a young woman fire gym leader with flaming red hair, red and orange andean poncho, holding a flaming staff', 301),
    'yaku': ('a tanned young man water gym leader in a blue and white surfer outfit, long dark hair, barefoot, holding a surfboard at his side', 402),
    'sacha': ('a cheerful girl plant gym leader with a leaf crown, green botanist outfit, flowers in her hair, holding a watering can', 303),
    'illapa': ('a cool young man electric gym leader with spiky yellow hair, black jacket with lightning bolts and futuristic goggles', 304),
    'rumi': ('a strong bearded man rock gym leader with a miner helmet, brown work clothes and a pickaxe', 305),
    'wayra': ('a young woman wind gym leader with a long flowing white scarf, teal andean clothes and a feathered cape', 306),
    'tuta': ('a mysterious pale young man shadow gym leader in a black hooded cloak with purple trim, holding a lantern', 307),
    'rasu': ('an old wise mountain guide ice gym leader with a white beard, thick blue mountaineering coat, wool hat and an ice axe', 308),
    'amaru': ('a tall elegant woman in an emerald green dress with golden serpent jewelry, elite four member', 309),
    'supay': ('a menacing man in a red and black ecuadorian diablada devil mask costume with horns, elite four member', 310),
    'killa': ('a serene woman with long silver hair and a crescent moon crown, white and silver robes, elite four member', 311),
    'kuntur': ('a proud man with a black and white condor feather cape and andean warrior armor, elite four member', 312),
    'pacha': ('a confident champion woman with golden armor, a flowing red cape, a golden sun emblem and short black hair, final boss', 313),
}
PROMPT = ('pixel art, one single character only, full body sprite of {desc}, pokemon gym leader character, front view, standing confidently, '
          'nintendo DS pokemon platinum style trainer sprite, detailed clean pixel art, plain flat white background, no other characters, no sprite sheet')


def procesar(model, lid):
    import numpy as np
    from PIL import Image
    import zonas
    im = Image.open(os.path.join(HERE, 'originales', f'{lid}.webp')).convert('RGB')
    rgb = np.array(im)
    seg = zonas.segmentar(model, im)
    import cv2
    # la figura: lo que el modelo reconoce como persona (quita paredes y paisajes del fondo), la parte más grande
    persona = ((seg != 0) & (zonas.alfa(rgb) > 0)).astype(np.uint8)
    persona = cv2.morphologyEx(persona, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(persona, 8)
    a = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    z, a = zonas.zonas_de(seg, rgb, a)
    ys, xs = np.nonzero(a)
    rgba = np.dstack([rgb, a])
    spr, _ = zonas.pixelar(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], z[ys.min():ys.max() + 1, xs.min():xs.max() + 1], zonas.ALTO)
    Image.fromarray(spr, 'RGBA').save(os.path.join(HERE, f'{lid}.png'))
    ret, _ = zonas.retrato_de(seg, rgba, z)
    Image.fromarray(ret, 'RGBA').save(os.path.join(HERE, 'retratos', f'{lid}.png'))
    print(lid, 'listo', spr.shape[1], 'x', spr.shape[0], flush=True)


if __name__ == '__main__':
    import torch
    from transformers import AutoModelForSemanticSegmentation
    args = sys.argv[1:]
    solo = args[:1] == ['--procesar']
    ids = [x for x in args if not x.startswith('--')] or list(LIDERES)
    os.makedirs(os.path.join(HERE, 'originales'), exist_ok=True)
    os.makedirs(os.path.join(HERE, 'retratos'), exist_ok=True)
    if not solo:
        import generar_local
        from generar_entrenadores import limpiar_fondo
        pipe = generar_local.cargar()
        for lid in ids:
            desc, semilla = LIDERES[lid]
            img = pipe(PROMPT.format(desc=desc), num_inference_steps=4, guidance_scale=0, width=832, height=1216, generator=torch.Generator('cpu').manual_seed(semilla)).images[0]
            path = os.path.join(HERE, 'originales', f'{lid}.webp')
            img.save(path, lossless=True)
            limpiar_fondo(path)
            print(lid, 'generado', flush=True)
        del pipe
        torch.cuda.empty_cache()
    model = AutoModelForSemanticSegmentation.from_pretrained('mattmdjaga/segformer_b2_clothes').cuda().eval()
    for lid in ids:
        procesar(model, lid)
