# Primal Clash

Batallas de criaturas en tiempo real con ligas mundiales. Se juega en el navegador (PC y celular).

## Subirlo a Railway (paso a paso)

1. **Sube el proyecto a GitHub** (una sola vez): crea un repositorio nuevo llamado `primal-clash` y sube esta carpeta (o pídeselo a Claude).
2. Entra a **railway.app** e inicia sesión con tu cuenta de GitHub.
3. Toca **New Project → Deploy from GitHub repo** y elige `primal-clash`.
4. En ese mismo proyecto toca **New → Database → PostgreSQL**. Así se guardan las cuentas y los trofeos.
5. Abre el servicio del juego → pestaña **Variables** → **New Variable → Add Reference** → elige `DATABASE_URL` de la base de datos.
6. Pestaña **Settings** del servicio:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
7. Pestaña **Settings → Networking → Generate Domain**. Ese es el enlace del juego: ¡compártelo!

Cada vez que haya cambios en GitHub, Railway lo vuelve a subir solo.

## Para probar en tu computadora
```
npm install
npm run build
npm start
```
Luego abre http://localhost:2600
