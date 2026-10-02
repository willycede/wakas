# Wakas: Monster — instrucciones del proyecto

## Contexto del dueño
- **El dueño no programa.** Claude construye todo: código, arte, balance, base de datos y despliegue.
- Acciones del dueño (crear cuentas, hacer clic en Railway): pasos simples y cortos, en español.
- Pedir feedback de juego ("¿se siente lento?", "¿Chispi es muy fuerte?"), no decisiones técnicas.
- Comunicación siempre en español.

## Qué es
Juego competitivo de criaturas ("Primales") en tiempo real con ligas mundiales por trofeos (como Clash Royale).
Sin historia por ahora. Ver `docs/GDD.md` (fuente de verdad del diseño).

## Stack (igual que Tessera)
- TypeScript. `client/` (Phaser + Vite), `server/` (Colyseus + Express), `shared/` (datos y tipos).
- PostgreSQL en Railway (`DATABASE_URL`); sin ella, archivo `data/dev-db.json` (solo local).
- Servidor autoritativo a 20 ticks/s. Un servicio Node en Railway sirve cliente y servidor.

## Arte de los Primales
- Pixel art generado con IA y procesado a pixel art real: `assets/criaturas/generar.py`.
- Para agregar un Primal: añadirlo en `assets/criaturas/criaturas.json` (descripción visual en inglés),
  ejecutar `python assets/criaturas/generar.py <id>`, y definir sus datos en `shared/src/data.ts` (ESPECIES).
- Usa FLUX en Stable Horde (gratis, sin cuenta; máximo 2 pedidos a la vez).

## Pruebas
- `npm run build` y luego `node server/dist/index.js` (puerto 2600).
- `node scripts/bot.mjs`: dos Domadores se emparejan, pelean en la Liga, uno captura un Primal y sube una habilidad.
- Trucos solo en local: `POST /api/truco` { nivel, monedas, trofeos, primal, nivelPrimal }.
