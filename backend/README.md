# Backend de Nexus Arcade (Cloudflare Worker + repo privado de GitHub)

GitHub Pages sólo sirve ficheros estáticos, así que las cuentas y los rankings globales necesitan un
pequeño intermediario. Este Worker guarda todo en un **repo privado** de GitHub; el token de GitHub
vive únicamente como *secret* del Worker (nunca en el navegador).

## Activación automática con GitHub Actions (recomendada)

El repositorio incluye `.github/workflows/deploy.yml`: en cada `push` a `main` publica la web en GitHub Pages y despliega el Worker,
y escribe solo la URL del Worker en `config.js`. Configuración única:

1. **Repo de datos** privado y vacío (p. ej. `nexus-arcade-data`) con un primer commit en `main`.
2. **Token de GitHub** (fine-grained, sólo ese repo, *Contents: Read and write*).
3. **Cuenta gratuita de Cloudflare** → *API token* con la plantilla «Edit Cloudflare Workers» y tu *Account ID*.
4. En el repo de la web → *Settings → Secrets and variables → Actions*:
   - **Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATA_TOKEN` (el token del paso 2) y `SESSION_SECRET` (`openssl rand -hex 32`).
   - **Variable**: `DATA_REPO` = `tu-usuario/nexus-arcade-data`.
5. *Settings → Pages → Source*: **GitHub Actions**. Haz un push (o *Actions → Deploy → Run workflow*).

Si falta algún dato, la web se publica igualmente en modo local (sin ranking global) y el log lo avisa.

## Puesta en marcha manual

1. **Repo de datos**: crea un repositorio **privado** vacío (p. ej. `nexus-arcade-data`) con un primer commit en `main` (basta un README).
2. **Token**: GitHub → Settings → Developer settings → *Fine-grained tokens* → acceso **sólo a ese repo**, permiso *Contents: Read and write*.
3. **Despliegue** (con [Wrangler](https://developers.cloudflare.com/workers/wrangler/)):
   ```
   cd backend
   # edita wrangler.toml: GITHUB_REPO y ALLOWED_ORIGIN (https://<usuario>.github.io, sin barra final)
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler secret put SESSION_SECRET      # p. ej. openssl rand -hex 32
   npx wrangler deploy
   ```
4. **Sitio**: copia la URL que muestra `deploy` (`https://nexus-arcade-api.<cuenta>.workers.dev`) en `config.js` del sitio (`API_URL`) y publica en GitHub Pages.
5. Comprueba: `curl https://…workers.dev/api/health` → `{"ok":true}`.

## CORS
Sólo se aceptan peticiones de los orígenes de `ALLOWED_ORIGIN` (lista separada por comas; para probar en local añade `http://localhost:8000`). `*` sólo si lo pones explícitamente.

## Límites y avisos reales
- **Los rankings no son a prueba de trampas**: el cliente es de confianza (el navegador envía sus propios datos). El servidor sólo valida forma, tamaño y rangos.
- **Rate limit**: el Worker limita intentos de registro/login por IP en memoria (por instancia, mejorable). Añade una *Rate limiting rule* de Cloudflare sobre `/api/login` y `/api/register` para protegerte de verdad.
- **API de GitHub**: ~5.000 peticiones/hora por token y escrituras serializadas por repo; cada guardado hace 1–2 commits. El cliente debe agrupar guardados (p. ej. al terminar partida). Si hay escrituras simultáneas el Worker reintenta (hasta 5 veces); el ranking se corrige solo en el siguiente guardado.
- Las contraseñas se guardan con PBKDF2-SHA256 (100.000 iteraciones, sal aleatoria). No hay recuperación de contraseña.
- Cuenta máxima de datos: 256 KB por usuario. Coste: el plan gratuito de Workers (100.000 peticiones/día) sobra; GitHub gratis.
- El historial de commits del repo privado conserva versiones antiguas de los datos.

## API (JSON, prefijo `/api`)
`POST register` · `POST login` · `GET session` · `PUT data` · `PATCH profile` · `POST password` · `DELETE account` · `GET leaderboard` · `GET health`.
Autenticación: `Authorization: Bearer <token>` (30 días). Errores: `{ "error": "mensaje" }`.

## Pruebas
`node tests/worker_test.mjs` (Node 18+, usa un GitHub falso en memoria).
