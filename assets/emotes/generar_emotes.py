"""Emotes (stickers) que los jugadores se envían en batalla: Cuyi, un cuy (mascota de Primal
Clash), con ocho expresiones. Se generan en la tarjeta gráfica con el mismo modelo que los Primales.

Uso: python assets/emotes/generar_emotes.py [id ...]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'criaturas'))
import torch  # noqa: E402

import generar  # noqa: E402
import generar_local  # noqa: E402

EMOTES = {
    'risa': 'laughing out loud with eyes closed, mouth wide open and tears of joy',
    'pulgar': 'giving a big thumbs up with a confident wink and smile',
    'enojo': 'furious with a red angry face, clenched fists and steam puffs',
    'llanto': 'crying loudly with big streams of tears',
    'sorpresa': 'shocked with jaw dropped, huge round eyes and raised paws',
    'amor': 'in love with heart-shaped eyes and pink hearts floating around',
    'dormido': 'sleeping peacefully with closed eyes and a snot bubble',
    'fiesta': 'celebrating with a party hat, raised paws and colorful confetti',
}
PROMPT = ('pixel art, sticker emote of a cute chubby round brown and white guinea pig mascot {expr}, chibi, big head, '
          'expressive face, bold dark outline, flat colors, centered, plain white background')

if __name__ == '__main__':
    ids = sys.argv[1:] or list(EMOTES)
    generar.RAW = os.path.join(HERE, 'originales')
    generar.OUT = HERE
    generar.SIZES['emote'] = 64
    os.makedirs(generar.RAW, exist_ok=True)
    pipe = generar_local.cargar()
    for i, eid in enumerate(ids):
        g = torch.Generator('cpu').manual_seed(4200 + i)
        img = pipe(PROMPT.format(expr=EMOTES[eid]), num_inference_steps=4, guidance_scale=0, width=1024, height=1024, generator=g).images[0]
        img.save(os.path.join(generar.RAW, eid + '.webp'), lossless=True)
        generar.process(eid, 'emote', voltear=False)
