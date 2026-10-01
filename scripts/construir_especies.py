"""Convierte assets/criaturas/criaturas.json en shared/src/especies.ts (datos de juego) y
shared/src/especies_en.ts (descripciones en inglés).

Calcula a partir de la ficha: estadísticas (según rareza, etapa y perfil), movimientos (según sus
tipos), niveles de evolución y requisitos de captura. Para ajustar a mano un Primal, pon en su ficha
"movimientos": [...] o "base": {...} y se respetan.

Uso: python scripts/construir_especies.py
"""
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DB = json.load(open(os.path.join(ROOT, 'assets', 'criaturas', 'criaturas.json'), encoding='utf-8'))

# igual que POOL en shared/src/data.ts
POOL = {
    'fuego': (['ascuas', 'bola_fuego'], ['llamarada', 'erupcion'], 'embestida_ignea', 'ardor'),
    'agua': (['burbuja', 'lanza_agua'], ['hidrochorro', 'torbellino'], 'ola', 'marea_curativa'),
    'planta': (['hojas_navaja', 'semillas'], ['latigo_cepa', 'esporas'], 'rodillo_espinas', 'raices'),
    'electrico': (['chispazo', 'bola_voltio'], ['descarga', 'rayo_trueno'], 'carga_voltio', 'aceleron'),
    'roca': (['lanzarrocas', 'pedrada'], ['grieta', 'avalancha'], 'terremoto', 'coraza'),
    'viento': (['cuchilla_aire', 'pluma_filo'], ['corriente', 'tornado'], 'vuelo_raudo', 'vendaval'),
    'sombra': (['bola_sombra', 'colmillo_sombra'], ['garra_eclipse', 'maldicion'], 'paso_sombrio', 'aullido'),
    'hielo': (['granizo', 'carambano'], ['aliento_helado', 'pico_glaciar'], 'patinazo', 'muro_hielo'),
    'luz': (['destello', 'prisma'], ['rayo_solar', 'juicio'], 'saeta_luz', 'bendicion'),
}
LEGEND_MOVES = {
    'taitachimbo': ['avalancha', 'aliento_helado', 'terremoto', 'muro_hielo'],
    'mamatungura': ['erupcion', 'bola_fuego', 'grieta', 'embestida_ignea'],
    'inti': ['rayo_solar', 'llamarada', 'prisma', 'bendicion'],
    'apukuntur': ['cuchilla_aire', 'garra_eclipse', 'vuelo_raudo', 'tornado'],
    'cuichi': ['torbellino', 'prisma', 'lanza_agua', 'bendicion'],
}
PERFILES = {  # vida, ataque, defensa, velocidad
    'equilibrado': (1, 1, 1, 1), 'rapido': (0.9, 1.0, 0.8, 1.3), 'tanque': (1.3, 0.85, 1.3, 0.55),
    'fuerte': (1.0, 1.3, 0.9, 0.8), 'asesino': (0.85, 1.25, 0.75, 1.15), 'robusto': (1.2, 1.1, 1.05, 0.65),
}


def linea(cid):
    """Longitud de la línea evolutiva a la que pertenece y la etapa de esta especie."""
    padres = {v['evoluciona']: k for k, v in DB.items() if v.get('evoluciona')}
    raiz = cid
    while raiz in padres:
        raiz = padres[raiz]
    n, x = 1, raiz
    while DB[x].get('evoluciona'):
        x = DB[x]['evoluciona']
        n += 1
    return n


def total_stats(c, n_linea):
    r, e = c['rareza'], c['etapa']
    if r == 'legendario':
        return 460
    if r == 'comun':
        return {3: {1: 220, 2: 290, 3: 370}, 2: {1: 230, 2: 330}, 1: {0: 300}}[n_linea][e]
    if r == 'raro':
        return {1: 260, 2: 360, 0: 340}[e]
    return {1: 300, 2: 400, 0: 395}[e]


def nivel_evo(c, n_linea):
    if c['rareza'] == 'comun':
        return (14 if c['etapa'] == 1 else 30) if n_linea == 3 else 18
    return 22 if c['rareza'] == 'raro' else 28


def captura(c, i, n_linea):
    r, e = c['rareza'], c['etapa']
    var = (i * 7) % 3
    if r == 'legendario':
        return 25, 20000, 40
    if r == 'comun':
        if e == 1:
            return 1 + i % 4, 150 + 50 * (i % 4), 4 + i % 4
        if e == 2:
            return 9 + var, 1400 + 100 * var, 15 + var
        return 20 + var, 5000 + 400 * var, 30 + var
    if r == 'raro':
        return (6 + var, 900 + 100 * var, 10 + var) if e == 1 else (16 + var, 4000 + 300 * var, 24 + var)
    if e == 1:
        return 14 + var, 3500 + 250 * var, 18 + var
    if e == 2:
        return 24 + var, 9000 + 500 * var, 32 + var
    return 20 + var, 7000 + 500 * var, 28 + var


def movimientos(cid, c, i):
    if 'movimientos' in c:
        return c['movimientos']
    if cid in LEGEND_MOVES:
        return LEGEND_MOVES[cid]
    t = c['tipos']
    r1, f1, m1, a1 = POOL[t[0]]
    if len(t) == 1:
        out = [r1[i % 2], f1[i % 2], m1, a1 if i % 2 == 0 else f1[(i + 1) % 2]]
    else:
        r2, f2, m2, a2 = POOL[t[1]]
        out = [r1[i % 2], f1[i % 2], m2 if i % 2 else f2[i % 2], a2 if i % 3 == 0 else r2[(i + 1) % 2]]
    assert len(set(out)) == 4, (cid, out)
    return out


def main():
    ids = list(DB)
    esp, en = [], {}
    for i, cid in enumerate(ids):
        c = DB[cid]
        n = linea(cid)
        tot = total_stats(c, n)
        w = PERFILES[c['perfil']]
        k = tot / sum(w)
        base = c.get('base') or dict(zip(('vida', 'ataque', 'defensa', 'velocidad'), (round(k * x) for x in w)))
        niv, mon, salv = captura(c, i, n)
        d = {
            'id': cid, 'nombre': c['nombre'], 'elemento': c['tipos'][0], 'rareza': c['rareza'], 'etapa': c['etapa'],
            'base': base, 'basico': c['basico'], 'movimientos': movimientos(cid, c, i), 'habilidad': c['habilidad'],
            'desc': c['desc'], 'captura': {'nivel': niv, 'monedas': mon, 'nivelSalvaje': salv},
        }
        if len(c['tipos']) > 1:
            d['elemento2'] = c['tipos'][1]
        if c.get('evoluciona'):
            d['evoluciona'] = {'a': c['evoluciona'], 'nivel': nivel_evo(c, n)}
        if c['rareza'] == 'comun' and c['etapa'] == 1 and n == 3:
            d['inicial'] = True
        esp.append(d)
        en[cid] = c['desc_en']
    iniciales = [d['id'] for d in esp if d.get('inicial')]
    cuerpo = ',\n'.join(f"  {d['id']}: {json.dumps(d, ensure_ascii=False)}" for d in esp)
    ts = ('// GENERADO por scripts/construir_especies.py desde assets/criaturas/criaturas.json. No editar a mano.\n'
          "import type { Especie } from './data';\n\n"
          f'export const ESPECIES: Record<string, Especie> = {{\n{cuerpo},\n}} as Record<string, Especie>;\n\n'
          '/** Primales que se pueden elegir al empezar (comunes con tres etapas). */\n'
          f'export const INICIALES = {json.dumps(iniciales)};\n')
    open(os.path.join(ROOT, 'shared', 'src', 'especies.ts'), 'w', encoding='utf-8', newline='\n').write(ts)
    ts_en = ('// GENERADO por scripts/construir_especies.py. Descripciones en inglés de cada Primal.\n'
             f'export const ESPECIES_EN: Record<string, string> = {json.dumps(en, ensure_ascii=False, indent=1)};\n')
    open(os.path.join(ROOT, 'shared', 'src', 'especies_en.ts'), 'w', encoding='utf-8', newline='\n').write(ts_en)
    from collections import Counter
    print('especies', len(esp), 'iniciales', len(iniciales), Counter(d['rareza'] for d in esp))


if __name__ == '__main__':
    main()
