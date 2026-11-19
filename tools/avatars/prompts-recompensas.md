# Prompts · Colección «Recompensas» (`assets/avatars/recompensas/`)

Nueve avatares exclusivos que no se eligen libremente: se ganan con la temporada, los rangos, la tienda o los eventos
(`unlock: { reward: 'av:<id>' }` en `manifest.js`). Siguen el estilo del resto del catálogo, con un acabado **dorado
premium** que los distingue a primera vista en el selector.

Genera cada uno a 1024×1024, guárdalo como `tools/avatars/masters/<id>.png` y ejecuta `node tools/avatars/export.mjs <id>`.

## Bloque de estilo (pégalo al final de cada prompt)

> Square 1:1 avatar icon, 1024×1024, single centered character or emblem filling ~70 % of the frame, bold friendly
> 3D-vector style with soft studio lighting, smooth glossy materials and a subtle rim light. Opaque background: deep
> indigo-navy radial gradient (#2A2F9A center → #141640 edges) with a faint diagonal light streak. Brand palette:
> Nexus yellow #FFD43B and warm gold #F2A900 as the main accent, white highlights, small touches of cyan #3DE0F5.
> Premium "reward" finish: polished gold trims, tiny sparkles, a soft golden glow behind the subject. Clean
> silhouette that still reads at 64 px. No text, no letters, no numbers, no logos other than the described emblem,
> no watermark, no frame or border, no transparent background.

## Prompts

| id | Nombre | Cómo se gana | Prompt (+ bloque de estilo) |
|---|---|---|---|
| `rw-nexo-gold` | Nexo dorado | Temporada · nivel 30 | A solid gold version of the Nexus rhombus mascot: a rounded diamond shape with a square hole in its center, made of polished 24k gold with beveled edges, floating and slightly tilted, two small gold sparkles orbiting it. |
| `rw-pad-gold` | Pad dorado | Temporada · nivel 10, o tienda (800 Rombos) | A retro game controller made of polished gold with a cross d-pad and round buttons inlaid in glossy yellow enamel, short coiled gold cable curling behind it, viewed from a three-quarter angle. |
| `rw-detective-gold` | Detective de oro | Tienda (800 Rombos) | A friendly cartoon detective seen from the chest up, wearing a golden deerstalker hat and a navy coat with gold buttons, holding a gold magnifying glass in front of one eye that magnifies it playfully. |
| `rw-crown-neon` | Reina neón | Rango · nivel 20 | A floating royal crown made of glowing cyan and magenta neon tubes on a gold base, five points each tipped with a small yellow diamond gem, faint neon reflections below it. |
| `rw-phoenix-gold` | Fénix dorado | Temporada · nivel 15 | A stylized phoenix rising with wings spread wide, feathers made of molten gold flowing into orange flame tips, a small yellow rhombus gem on its chest, ember particles around it. |
| `rw-legend` | Leyenda | Rango · nivel 30 | A heroic laurel wreath in polished gold surrounding a glowing Nexus rhombus emblem, iridescent rainbow sheen on the laurel leaves, a starburst of golden light rays behind it. |
| `rw-ghost` | Fantasma | Evento de Halloween | A cute round cartoon ghost with big friendly eyes and a tiny smile, softly glowing white body with a golden halo-like glow, wearing a small orange pumpkin-shaped bow tie, little bats in silhouette behind it. |
| `rw-xmas` | Duende navideño | Evento de Navidad | A cheerful cartoon Christmas elf seen from the chest up, pointy ears, green hat with a gold bell on the tip, red and gold striped scarf, holding a small wrapped present tied with a yellow ribbon, snowflakes around. |
| `rw-nexito` | Nexito Leyenda | Racha de Nexito · 365 días | The Nexus mascot «Nexito»: a rounded yellow rhombus-shaped body with a dark indigo diamond-shaped visor as its face, two big glowing white eyes and a happy smile, small round arms and feet, golden metallic finish, a thin rainbow aura ring behind it and a tiny gold laurel at its feet. |

Comprueba después con `node tools/avatars/export.mjs --check` y `node tests/avatars_test.mjs --strict`.
