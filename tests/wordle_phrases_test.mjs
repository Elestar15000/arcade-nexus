// Valida el banco de la «Frase del día» de Wordle: cada frase tiene como mucho 14 letras distintas y se puede
// descubrir entera con 4 palabras del diccionario (búsqueda voraz), así que 6 intentos siempre dejan margen.
// node tests/wordle_phrases_test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname;
const ctx = { window: {}, Nexus: { games: {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'assets/data/words-es.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(root + 'src/games/wordle/phrases.js', 'utf8'), ctx);
const norm = (w) => w.toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ');
const words = [...new Set(ctx.window.NexusWordData.VALID.split(' '))];
const list = ctx.Nexus.games.wordlePhrases;
const bad = [];
if (new Set(list.map(norm)).size !== list.length) bad.push('hay frases repetidas');
for (const p of list) {
    if (/[^a-záéíóúüñ ]/i.test(p)) bad.push(`${p}: caracteres no permitidos (sólo letras y espacios)`);
    const need = new Set([...norm(p)].filter(c => /[a-zñ]/.test(c)));
    if (need.size > 14) bad.push(`${p}: ${need.size} letras distintas (máx. 14)`);
    let left = new Set(need), k = 0;
    while (left.size && k < 9) {
        let best = null, bs = 0;
        for (const w of words) { const sc = new Set([...w].filter(c => left.has(c))).size; if (sc > bs) { bs = sc; best = w; } }
        if (!best) { k = 99; break; }
        for (const c of best) left.delete(c);
        k++;
    }
    if (k > 4) bad.push(`${p}: necesita ${k > 9 ? 'letras imposibles' : k + ' palabras'}`);
}
console.log(`${list.length} frases`);
if (bad.length) { console.log(bad.join('\n')); console.log('RESULT: FALLOS'); process.exit(1); }
console.log('RESULT: OK');
