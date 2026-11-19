# Avatares

Los avatares de usuario son PNG en una carpeta por colección. El catálogo (ids, nombres, colecciones, colores y
equivalencias con los antiguos emojis) está en [`manifest.js`](manifest.js).

```
assets/avatars/
  manifest.js
  nexus/  arcade/  cartas/  mentes/  estrategia/  misterio/  fauna/  recompensas/
    <id>-512.png    selector, perfil, menú de la cuenta (y pantallas retina)
    <id>-256.png    barra lateral, rankings, mesas online, historial
```

Mientras falte la imagen de un avatar, la web muestra en su lugar el rombo de Nexus sobre el color de su colección,
así que se puede publicar con las carpetas vacías o a medio llenar.

## Añadir o regenerar las imágenes

1. Genera el original a 1024×1024 con el prompt de su id (documento «Arcade Nexus · Sistema de avatares PNG») y
   guárdalo como `tools/avatars/masters/<id>.png` (también vale `.jpg` o `.webp`). Esa carpeta no se publica.
2. `node tools/avatars/export.mjs` crea los dos tamaños en la carpeta de su colección (recorte cuadrado centrado,
   fondo opaco). Necesita `sharp` (`npm i -D sharp`) o ImageMagick. Con un id (`… export.mjs nx-nexo`) sólo ese.
3. `node tools/avatars/export.mjs --check` dice qué falta y avisa si algún PNG pasa de 120 KB (512) o 40 KB (256).
4. `node tests/avatars_test.mjs` comprueba el catálogo; con `--strict` exige además las 102 imágenes.

## Añadir un avatar nuevo

1. Añade su entrada en `avatars` de `manifest.js`: `id` con el prefijo de su colección (`es-rook`), `collection`,
   `name` y, si quieres, `tags`, `accent` propio o `unlock` (`{ level: 10 }`, `{ achievement: '<id de logro>' }` o
   `{ reward: 'av:<id>' }`) para que sea un avatar de recompensa. Los `reward` se entregan desde `src/services/rewards.js`
   (pase de temporada, rangos, tienda o eventos); sus prompts están en `tools/avatars/prompts-recompensas.md`.
2. `node tools/avatars/export.mjs --sync` copia la lista de ids al Worker (`backend/worker.js`), que rechaza
   cualquier avatar que no esté en ella. Vuelve a desplegar el Worker.
3. Genera y exporta su imagen como arriba.

Reglas: un id nunca se renombra ni se borra (las cuentas lo guardan); el avatar por defecto es `nx-nexo`; las
cuentas antiguas con emoji se traducen solas con la tabla `legacy`.
