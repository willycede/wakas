# PRIMAL CLASH — Documento de diseño (v0.1)

## 1. Visión
Batallas de criaturas **en tiempo real** para navegador (PC y móvil) contra gente de todo el mundo.
Controlas a tu equipo de hasta 6 **Primales**, uno a la vez en la arena: lo mueves, disparas, haces combos, esquivas y cambias de Primal en el momento justo.
Ganas trofeos y subes de **liga** (como Clash Royale). Sin historia por ahora **[decisión del dueño]**.

## 2. Batalla **[decisión del dueño: tiempo real, no por turnos]**
- Arena de césped con rocas (obstáculos simétricos). 3 minutos.
- Cada Domador tiene un Primal en la arena; los demás esperan en el banco.
- **Controles:** mover (WASD / joystick), **básico** (clic / espacio) con combo de 3 golpes (el tercero es más fuerte), **4 movimientos** (1-4) con recarga, **esquivar** (Shift, invulnerable un instante) y **cambiar** de Primal (Q/E o tocando su retrato; espera de 3,5 s).
- Si un Primal cae, entra el siguiente automáticamente. Gana quien deja al rival sin Primales; si se acaba el tiempo, gana quien tenga más vida total.
- En móvil se apunta automáticamente al rival.
- Movimientos: proyectil, ráfaga, embestida, área, zona (aviso en el suelo), rayo (aviso en línea), escudo, curación y mejora.
- Estados: quemadura, veneno (daño con el tiempo), parálisis (no se mueve un instante), lentitud.
- Cada especie tiene una **habilidad** pasiva (p. ej. Roca sólida: −15 % de daño recibido).

## 3. Elementos
Fuego, Agua, Planta, Eléctrico, Roca, Viento, Sombra. Ataque fuerte = ×1,5; débil = ×0,67; mismo elemento que el Primal = ×1,2.

## 4. Los 15 Primales (v0.1) **[decisión del dueño: empezar con 15]**
| Primal | Elemento | Etapa | Evoluciona | Captura (Domador nv. / monedas) |
|---|---|---|---|---|
| Chispi → Llamarak → Infernox | Fuego | 1-2-3 | nv. 12 / nv. 28 | inicial · 22/3000 · 38/12000 |
| Gotín → Marejón → Abisaurio | Agua | 1-2-3 | nv. 12 / nv. 28 | inicial · 22/3000 · 38/12000 |
| Brotín → Espinardo → Selvagor | Planta | 1-2-3 | nv. 12 / nv. 28 | inicial · 22/3000 · 38/12000 |
| Voltirón → Tormentauro | Eléctrico | 1-2 | nv. 20 | 3/250 · 30/8000 |
| Pedrusco → Golemón | Roca | 1-2 | nv. 20 | 2/150 · 30/8000 |
| Céfiro | Viento | — | — | 12/1400 |
| Umbraz | Sombra | — | — | 16/2200 |

## 5. Progreso **[decisión del dueño]**
- **Inicio:** eliges 1 de 3 iniciales (Chispi, Gotín o Brotín).
- **Capturas:** para retar a un Primal salvaje necesitas un **nivel de Domador** y pagar **monedas**. Si lo vences con tu equipo, se une a ti; si pierdes, pierdes la entrada.
- **Experiencia de batalla:** los Primales que pelearon reciben toda la experiencia; el resto del equipo, la mitad. Suben de nivel y **evolucionan** solos al llegar al nivel indicado.
- **Domador:** gana experiencia en cada batalla (nivel máx. 50). Cada nivel da **1 punto de habilidad**.
- **Habilidades de Domador:** Entrenador nato (+exp), Negociante (+monedas), Vínculo (+vida del equipo), Relevo veloz (cambios más rápidos), Instinto (−recarga), Capturador (capturas más baratas). 5 niveles cada una.
- **Medallas** al llegar a ciertos niveles de Domador (3, 6, 10, 14, 18, 23, 28, 35); cada una da +3 % de experiencia a tus Primales.

## 6. Liga
- Ganar: +30 trofeos, 25 monedas. Perder: −18 trofeos, 6 monedas.
- Ligas: Bronce (0), Plata (400), Oro (1000), Platino (1800), Diamante (2800), Maestro (4000), Campeón (5500).
- Emparejamiento por trofeos; si no hay rival humano en 12 s, pelea contra la IA (dificultad según la liga).
- Ranking mundial (top 50).

## 7. Arte **[decisión del dueño: pixel art animado, estilo tipo Pokémon Reloaded]**
- Primales en pixel art (48–86 px de alto), vista 3/4 mirando a la derecha, contorno oscuro y paleta limitada.
- Generados con IA y convertidos a pixel art real por `assets/criaturas/generar.py` (ver CLAUDE.md para agregar más).
- Animación en el juego: rebote al caminar, respiración, estirón al atacar, destello al recibir golpe.

## 8. Pendiente / siguientes pasos
- Animaciones por cuadros para cada Primal (caminar, atacar).
- Más Primales y arenas por liga.
- Temporadas de liga con recompensas, cofres, amigos y batallas amistosas.
- Balance tras jugar.
