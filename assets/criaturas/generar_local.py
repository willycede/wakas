"""Genera el arte de los Primales en la tarjeta gráfica del PC (sin depender de servicios en línea).

Modelo: SDXL + SDXL-Lightning (4 pasos, rápido) + LoRA pixel-art-xl. Funciona con 6 GB de VRAM.
La primera vez descarga los modelos desde Hugging Face (~8 GB, quedan en la caché).
Después cada imagen pasa por el mismo proceso de generar.py (pixel art real, paleta, contorno).

Uso: python generar_local.py [id ...]     (sin argumentos: las que aún no tienen sprite)
"""
import json
import os
import sys
import time

import torch
from diffusers import EulerDiscreteScheduler, StableDiffusionXLPipeline
from huggingface_hub import hf_hub_download

import generar

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPT = ('pixel art, game sprite of one {desc}, cute original creature for a monster battle game, '
          'full body, side view facing right, standing, 16-bit, flat colors, dark outline, centered, plain white background')


def cargar():
    pipe = StableDiffusionXLPipeline.from_pretrained('stabilityai/stable-diffusion-xl-base-1.0', torch_dtype=torch.float16, variant='fp16', use_safetensors=True)
    pipe.load_lora_weights(hf_hub_download('ByteDance/SDXL-Lightning', 'sdxl_lightning_4step_lora.safetensors'), adapter_name='rapido')
    pipe.load_lora_weights('nerijs/pixel-art-xl', weight_name='pixel-art-xl.safetensors', adapter_name='pixel')
    pipe.set_adapters(['rapido', 'pixel'], adapter_weights=[1.0, 1.2])
    pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing='trailing')
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()
    return pipe


def main(ids):
    db = generar.load_db()
    todo = ids or [k for k in db if not os.path.exists(os.path.join(generar.OUT, k + '.png'))]
    print('pendientes', len(todo), flush=True)
    pipe = cargar()
    os.makedirs(generar.RAW, exist_ok=True)
    for n, cid in enumerate(todo, 1):
        c = db[cid]
        t0 = time.time()
        g = torch.Generator('cpu').manual_seed(int(c.get('semilla', 7)))
        img = pipe(PROMPT.format(desc=c['visual']), num_inference_steps=4, guidance_scale=0, width=1024, height=1024, generator=g).images[0]
        img.save(os.path.join(generar.RAW, cid + '.webp'), lossless=True)
        try:
            generar.process(cid, c['talla'], c.get('voltear'))
        except Exception as e:  # una imagen rara no detiene al resto
            print(cid, 'ERROR al procesar', e, flush=True)
        print(f'[{n}/{len(todo)}] {cid} {time.time() - t0:.1f}s', flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
