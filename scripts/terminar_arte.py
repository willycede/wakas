"""Termina el arte sin intervención: espera a que estén los 100 Primales, hace los stickers de
emotes con FLUX (Stable Horde), anima todo y recompila el cliente (el servidor sirve los archivos
nuevos sin reiniciarse).

Uso: python scripts/terminar_arte.py
"""
import json
import os
import subprocess
import sys
import time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CRI = os.path.join(ROOT, 'assets', 'criaturas')
EMO = os.path.join(ROOT, 'assets', 'emotes')
sys.path.insert(0, CRI)
import generar  # noqa: E402

EMOTES = {
    'risa': 'laughing out loud with eyes squeezed shut, huge open mouth and tears of joy',
    'pulgar': 'giving a big thumbs up with one paw and winking confidently',
    'enojo': 'furious with a red angry face, frowning eyebrows, clenched fists and steam puffs from its head',
    'llanto': 'crying loudly with big blue streams of tears pouring from its eyes',
    'sorpresa': 'shocked with jaw dropped, huge round eyes and both paws on its cheeks',
    'amor': 'in love with big red heart-shaped eyes and pink hearts floating around',
    'dormido': 'sleeping with closed eyes, a snot bubble and a little nightcap',
    'fiesta': 'celebrating with a party hat, raised paws, a party horn and colorful confetti',
}
PROMPT = ('pixel art sticker emote of a cute chubby round brown and white guinea pig mascot {expr}, chibi, big head, '
          'very expressive face, bold dark outline, flat colors, centered, plain white background, no text')


def faltan():
    db = json.load(open(os.path.join(CRI, 'criaturas.json'), encoding='utf-8'))
    return [k for k in db if not os.path.exists(os.path.join(CRI, 'sprites', k + '.png'))]


def main():
    while faltan():
        print('faltan', len(faltan()), flush=True)
        time.sleep(120)
    # stickers: mismo proceso que los Primales, pero en assets/emotes a 64 px
    generar.STYLE = '{desc}'
    generar.RAW = os.path.join(EMO, 'originales')
    generar.OUT = EMO
    generar.SIZES['emote'] = 64
    for i, (eid, expr) in enumerate(EMOTES.items()):
        for intento in range(4):
            try:
                generar.generate_horde(eid, PROMPT.format(expr=expr), 4200 + i)
                generar.process(eid, 'emote', voltear=False)
                break
            except Exception as e:
                print(eid, 'ERROR', e, flush=True)
                time.sleep(30)
    subprocess.run([sys.executable, os.path.join(CRI, 'animar.py')], cwd=CRI, check=False)
    subprocess.run('npm run build:client', cwd=ROOT, shell=True, check=False)
    print('LISTO', flush=True)


if __name__ == '__main__':
    main()
