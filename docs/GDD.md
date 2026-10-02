# WAKAS: MONSTER — Documento de diseño (v0.3)

## 1. Visión
Batallas de criaturas **en tiempo real** para navegador (PC y móvil) contra gente de todo el mundo.
Llevas un equipo de **3 Primales** a cada batalla, uno a la vez en la arena: lo mueves, atacas, haces combos, esquivas y cambias de Primal en el momento justo.
Ganas trofeos y subes de **liga** (como Clash Royale). Sin historia por ahora **[decisión del dueño]**. Las 100 criaturas están **inspiradas en Ecuador** **[decisión del dueño]**: volcanes, Galápagos, Amazonía, páramo, leyendas y cultura andina.

## 2. Batalla **[decisión del dueño: tiempo real, no por turnos]**
- Estadios con terreno natural (no canchas) **[decisión del dueño]**: playa con charcas (Bronce), selva con río (Plata), volcán con grietas de lava y murallas (Oro), roca negra de Galápagos (Platino), plaza colonial de piedra con murallas (Diamante), nieve y lagos helados (Maestro) y tierra sagrada con anillo inca y la línea ecuatorial (Campeón). Obstáculos simétricos; las murallas cortan el paso. 3 minutos.
- Cada Entrenador tiene un Primal en la arena; los otros dos esperan en el banco.
- **Controles:** mover (WASD / joystick), **básico** (clic / Espacio) con combo de 3 golpes, **4 movimientos** (1-4) con recarga, **esquivar** (Shift), **técnica especial** (R; los legendarios también T), **cambiar** (Q/E o tocando su retrato), **emotes** (C).
- Si un Primal cae, entra el siguiente. Gana quien deja al rival sin Primales; si se acaba el tiempo, quien tenga más vida total.
- **Puntería [decisión del dueño, actualizada]:** todos los ataques (básico, movimientos y técnicas) apuntan **siempre al rival**; quieto, tu Primal lo mira. Antes: no se apunta. Los ataques salen **hacia donde mira el Primal**; si el rival está enfrente (±40°, a menos de 460 px), el ataque lo busca. Flecha azul = hacia dónde mira; dorada = fijada en el rival.
- **Formas de ataque [decisión del dueño]:** nada cae en sitios al azar. Todo sale en formas fijas delante del Primal: línea recta (rayos), abanico (ráfagas), círculo a tu alrededor (áreas), círculo delante (zonas, sobre el rival si lo tienes enfrente) o **tres pasos en línea** (Erupción, Rayo trueno, Pico glaciar). Las técnicas especiales también: filas, abanicos y zigzag hacia delante.
- **Combos:** cada 5 golpes seguidos +10 % de daño (máx. +30 %). **Enlace:** un movimiento justo después del tercer golpe básico pega +30 %.
- **Técnicas especiales [decisión del dueño]:** una por elemento, con varias fases (Supernova atrae, explota, lanza un anillo de fuego y deja lava). Se cargan golpeando y recibiendo golpes. Los **legendarios tienen dos** (R y T) y pueden guardar dos cargas.
- **Campos en el suelo:** lava, remolinos que atraen, hielo, espinas, lluvia: dañan o frenan mientras duran.
- **Emotes [decisión del dueño]:** 8 stickers de Cuyi (el cuy mascota) y 6 frases rápidas; se puede silenciar al rival.

## 3. Elementos
Fuego, Agua, Planta, Eléctrico, Roca, Viento, Sombra, **Hielo** y **Luz**. Un Primal puede tener **dos tipos**: la efectividad se multiplica (de ×0,45 a ×2,25). Mismo tipo que el Primal = ×1,2.

## 4. Los 100 Primales **[decisión del dueño: 100, inspirados en Ecuador, tipos combinados]**
- **Rarezas [decisión del dueño]:** Común (49), Raro (28), Épico (18), Legendario (5). Cuanto más raros, más caros de retar, más nivel de Entrenador piden y más lista es la IA al defenderse.
- **Iniciales [decisión del dueño]:** al empezar eliges **3** entre 9 comunes que **evolucionan dos veces** (Tunguri, Yakupi, Cacaíto, Chispez, Quindito, Galapito, Chusik, Ukumarito, Morfito).
- **Legendarios [decisión del dueño]:** Taitachimbo (Chimborazo), Mamatungura (Tungurahua), Inti (el Sol), Apukuntur (el cóndor) y Cuichi (el arcoíris). Más fuertes, no invencibles; **solo uno por equipo**; dos técnicas especiales; aura dorada y entrada épica. Solo se puede retar al **Legendario del día** (rota cada día).
- La ficha de cada uno está en `assets/criaturas/criaturas.json`; `scripts/construir_especies.py` calcula estadísticas, movimientos y capturas.

## 5. Progreso **[decisión del dueño]**
- **Capturas:** pagas la entrada y vences al Primal salvaje. Antes ves su **ficha** con estadísticas y un medidor **"¿Vale la pena retarlo?"** (Fácil / Parejo / Difícil / Muy difícil) que compara tu equipo con el salvaje y dice qué tipos le ganan.
- **Ficha de cada Primal:** descripción, estadísticas, habilidad, movimientos, técnicas especiales y **línea evolutiva** con los niveles.
- **Movimientos por nivel [decisión del dueño]:** el 1.º se tiene desde el nivel 1, el 2.º en el 4, el 3.º en el 9 y el 4.º en el 15. Al aprenderlo sale un aviso al final del combate.
- **Experiencia:** solo al ganar. Los Primales que pelearon reciben toda la experiencia; el resto, la mitad.
- **Entrenador:** nivel máx. 50; cada nivel da 1 punto de habilidad; medallas en los niveles 3, 6, 10, 14, 18, 23, 28 y 35.

## 6. Liga y justicia **[propuesta de Claude, pendiente de que el dueño la pruebe]**
- Ganar: +30 trofeos, 25 monedas. Perder: −18 trofeos, 6 monedas.
- Ligas y estadios: Bronce (Estadio Malecón), Plata (Coliseo Amazónico), Oro (Arena Cotopaxi), Platino (Estadio Galápagos), Diamante (Plaza Quito Colonial), Maestro (Glaciar Chimborazo), Campeón (Mitad del Mundo).
- **Para que sea justo:**
  1. El emparejamiento es por trofeos.
  2. **Tope de nivel por liga:** en la Liga tus Primales pelean como mucho a nivel 12 (Bronce), 16, 20, 25, 30, 35 o 40 (Campeón). Un veterano no aplasta a un novato y subir de liga se nota.
  3. El nivel pesa menos que antes: del nivel 5 al 40 las estadísticas crecen un 48 % (antes casi ×3). Lo que más cuenta es evolucionar, la ventaja de tipo y la habilidad del jugador.
  4. Solo un legendario por equipo.
- **Cuando no hay nadie en línea:** si en 12 s no aparece un rival humano, juegas contra la IA, con un equipo y una dificultad acordes a tu liga. Así nadie se queda esperando.
- **Retos amistosos:** creas un código de 5 letras y lo compartes por WhatsApp; tu amigo entra con el enlace. No se ganan ni pierden trofeos.

## 6b. Antes de cada batalla y amigos **[decisión del dueño]**
- **Preparación de 20 s** (Liga, amistosas y capturas): ficha del rival (liga, trofeos, nivel, % de victorias, sus 3 Primales más usados) y eliges tus 3 Primales; cada uno marca Ventaja/Desventaja contra los favoritos del rival. Si los dos pulsan Listo, empieza antes.
- **Amigos:** agregar rivales al terminar la batalla o en la preparación, o buscar por nombre; solicitudes, quién está en línea y retos directos (al amigo le aparece la invitación).
- **Victoria y derrota animadas:** sello de K.O./TIEMPO, confeti y rayos al ganar, lluvia y botón Revancha al perder.

## 7. Motivación para jugar **[decisión del dueño]**
- **Historia de entrada** (la primera vez, se puede saltar y volver a ver desde la pestaña Entrenador): los Primales despertaron en Ecuador, la Liga Primal busca al mejor Entrenador del mundo, cinco legendarios vigilan desde lo alto y tu misión es llegar a la Mitad del Mundo y ser Campeón.
- **Tu camino a Campeón:** escalera de ligas, Primaldex (x/100), legendarios (x/5) y medallas (x/8).
- **Misiones diarias:** tres al día (una de Liga y dos que rotan), dan monedas; punto rojo cuando hay algo por cobrar.
- **Primera victoria del día:** el doble de monedas.

## 7b. Cómo atraer jugadores (propuesta)
- Lanzarlo primero en un círculo pequeño (amigos, grupos de WhatsApp, comunidades gamer de Ecuador). Los retos amistosos por enlace hacen que cada jugador invite a otros.
- Contenido local que dé orgullo y conversación: Primales de Ecuador, estadios reconocibles.
- Siguientes ideas: misiones diarias, temporadas de un mes con recompensas, torneos de fin de semana con premio, y un modo espectador o clips para compartir en TikTok.

## 8. Móvil y Android
- Ya se juega desde el navegador del móvil (Chrome): joystick y botones táctiles, y pide girar el teléfono a horizontal.
- Es una **app web instalable**: en Android, Chrome ofrece "Añadir a pantalla de inicio" y se abre a pantalla completa como una app.
- Más adelante, para Google Play: empaquetarla como TWA (la misma web dentro de una app) sin rehacer nada.

## 9. Tutorial **[decisión del dueño]**
- Al empezar se ofrece un combate guiado de 7 pasos contra un muñeco: moverse, golpear (los ataques salen hacia donde miras), usar un movimiento, esquivar, técnica especial, cambiar de Primal y ganar. Da 200 monedas la primera vez. Se puede saltar y repetir desde la pestaña Entrenador.

## 10. Interfaz e idiomas **[decisión del dueño]**
- Español e inglés; iconos propios, emblema por liga, botones de batalla en arco con recarga circular.

## 11. Arte **[decisión del dueño: pixel art animado, estilo tipo Pokémon Reloaded]**
- Primales en pixel art (48–120 px de alto), mirando a la derecha, contorno oscuro y paleta limitada. Generados con FLUX y convertidos a pixel art real (`assets/criaturas/generar.py`).
- Caminar: cada pata gira desde la cadera, alternándose, con bote del cuerpo.
- Estadios dibujados en código (`client/src/arenas.ts`) con público animado, banderines tricolor, focos y un paisaje de fondo.

## 11b. Panel del dueño y aspectos legales **[decisión del dueño]**
- Panel `/admin` privado con clave (ADMIN_KEY) y sesión de 12 h: jugadores en línea, activos, nuevos, batallas, horas, retención, ligas, Primales, **países** (por zona horaria, sin IP) y **horas de juego** (hora local).
- Buzón de sugerencias (pestaña Entrenador): idea, pedido (Primal o función), error u otro; máximo 5 mensajes por jugador al día. El dueño los lee en `/admin` y los marca como leídos, hechos o archivados.
- Registro con aceptación de Términos y Política de Privacidad (13+; menores necesitan permiso para comprar). Borradores en `shared/src/legal.ts`, a revisar por un abogado antes de vender.
- Compras con tarjeta (futuro): solo mediante un procesador de pagos (Stripe, PayPhone, Kushki…); el juego nunca guarda datos de tarjetas. Facturación SRI y política de reembolsos antes de cobrar.

## 12. Pendiente
- Música: tema de menú, batalla (estilo combates clásicos, metales y bajo galopante), tema legendario épico (un tono por legendario), fanfarrias. Original, sintetizada en el navegador.
- Terminar de generar el arte de las 100 criaturas y rehacer los stickers de emotes.
- Misiones diarias y temporadas.
- Balance tras jugar.
