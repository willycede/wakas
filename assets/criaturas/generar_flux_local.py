"""Arte de los Primales con FLUX.1-schnell en la tarjeta gráfica del PC: el mismo modelo, estilo, tamaño y
semilla que el servicio en línea (generar.py), así que la calidad es la misma, pero sin colas ni cupos.
Con 6 GB de VRAM el modelo se va pasando por partes desde la RAM (hace falta ~32 GB de RAM).
La primera vez descarga FLUX.1-schnell desde Hugging Face (~23 GB, queda en la caché).

Uso: python generar_flux_local.py [id ...]   (sin argumentos: las que aún no tienen sprite, legendarias primero)
"""
import os
import sys
import time

import torch
from diffusers import FluxPipeline

import generar


def main(ids):
    db = generar.load_db()
    todo = ids or [k for k in db if not os.path.exists(os.path.join(generar.OUT, k + '.png'))]
    todo.sort(key=lambda k: db[k].get('talla') != 'legendario')
    print('pendientes', len(todo), todo, flush=True)
    pipe = FluxPipeline.from_pretrained('black-forest-labs/FLUX.1-schnell', torch_dtype=torch.bfloat16)
    pipe.enable_sequential_cpu_offload()
    pipe.vae.enable_tiling()
    os.makedirs(generar.RAW, exist_ok=True)
    for n, cid in enumerate(todo, 1):
        if not ids and os.path.exists(os.path.join(generar.OUT, cid + '.png')):
            continue  # otro generador ya la hizo
        c = db[cid]
        t0 = time.time()
        img = pipe(generar.STYLE.format(desc=c['visual']), num_inference_steps=4, guidance_scale=0.0, width=768, height=768,
                   max_sequence_length=256, generator=torch.Generator('cpu').manual_seed(int(c.get('semilla', 7)))).images[0]
        img.save(os.path.join(generar.RAW, cid + '.webp'), lossless=True)
        try:
            generar.process(cid, c['talla'], c.get('voltear'))
        except Exception as e:  # una imagen rara no detiene al resto
            print(cid, 'ERROR al procesar', e, flush=True)
        print(f'[{n}/{len(todo)}] {cid} {time.time() - t0:.0f}s', flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
