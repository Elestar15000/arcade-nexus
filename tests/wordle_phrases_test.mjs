// Valida el banco de la «Frase del día» de Wordle: cada hueco [palabra] tiene 5 letras y está en el diccionario.
// node tests/wordle_phrases_test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname;
const ctx = { window: {}, Nexus: { games: {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'assets/data/words-es.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(root + 'src/games/wordle/phrases.js', 'utf8'), ctx);
const norm = (w) => w.toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ');
const data = ctx.window.NexusWordData;
const valid = new Set(data.VALID.split(' ').concat(data.ANSWERS.split(' ').map(norm)));
const bad = [];
const list = ctx.Nexus.games.wordlePhrases;
for (const p of list) {
    const holes = [...p.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
    if (!holes.length || holes.length > 3) bad.push(`${p}: ${holes.length} huecos`);
    for (const h of holes) {
        const w = norm(h);
        if (w.length !== 5) bad.push(`${p}: «${h}» no tiene 5 letras`);
        else if (!valid.has(w)) bad.push(`${p}: «${h}» no está en el diccionario`);
    }
}
console.log(`${list.length} frases, ${list.reduce((s, p) => s + (p.match(/\[/g) || []).length, 0)} huecos`);
if (bad.length) { console.log(bad.join('\n')); console.log('RESULT: FALLOS'); process.exit(1); }
console.log('RESULT: OK');
