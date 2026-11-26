// Copia al Worker el catálogo de cosméticos (id → tipo y precio), los que se ganan sin comprarlos y los retirados.
// El Worker lo usa para controlar los Rombos y los cosméticos que guarda cada cuenta.
//   node tools/cosmetics/sync.mjs          → reescribe el bloque @cosmetics del Worker
//   node tools/cosmetics/sync.mjs --check  → sólo comprueba que está al día (sale con 1 si no)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

export function build() {
    const src = read('src/services/rewards.js');
    const Nexus = { util: { dayKey: () => '', daysBetween: () => 0 }, services: {}, bus: { on() {}, emit() {} } };
    vm.runInNewContext(src, { Nexus, console, setTimeout, Date, Math, JSON });
    const R = Nexus.services.rewards;
    const catalog = {};
    for (const c of R.CATALOG) catalog[c.id] = [c.kind, c.price || 0];
    // Se ganan sin pasar por la tienda: los gratis y los que aparecen como premio (pase, rangos, logros, rachas, eventos)
    const earn = new Set(R.CATALOG.filter((c) => !c.price).map((c) => c.id));
    const add = (v) => { if (typeof v === 'string' && catalog[v]) earn.add(v); else if (Array.isArray(v)) v.forEach(add); else if (v && typeof v === 'object') Object.values(v).forEach(add); };
    add(R.SEASON_REWARDS); add(R.RANK_REWARDS);
    const prizeText = [read('src/services/achievements.js'), read('src/services/pet.js'),
        src.split('\n').filter((l) => !/^\s*C\('|RETIRED|^\s*'(th|sk|pt|nx-base)-/.test(l)).join('\n')].join('\n');
    for (const id of Object.keys(catalog)) if (prizeText.includes(`'${id}'`)) earn.add(id);
    const retired = {};
    const m = src.match(/const RETIRED = (\{[\s\S]*?\});/);
    if (m) Object.assign(retired, vm.runInNewContext('(' + m[1] + ')'));
    return `// @cosmetics-begin
const COSMETICS = ${JSON.stringify(catalog)};
const EARNABLE = new Set(${JSON.stringify([...earn].sort())});
const RETIRED_COSMETICS = ${JSON.stringify(retired)};
const DAILY_ROMBOS = ${Number((src.match(/const DAILY_CAP = (\d+)/) || [])[1]) || 3000};
// @cosmetics-end`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const file = path.join(ROOT, 'backend/worker.js');
    const text = fs.readFileSync(file, 'utf8'), block = build();
    const cur = (text.match(/\/\/ @cosmetics-begin[\s\S]*?\/\/ @cosmetics-end/) || [''])[0];
    if (process.argv.includes('--check')) {
        if (cur !== block) { console.error('El catálogo del Worker no está al día: node tools/cosmetics/sync.mjs'); process.exit(1); }
        console.log('Catálogo del Worker al día'); process.exit(0);
    }
    if (!cur) { console.error('Falta el bloque // @cosmetics-begin … // @cosmetics-end en backend/worker.js'); process.exit(1); }
    fs.writeFileSync(file, text.replace(cur, block));
    console.log(`Worker actualizado: ${Object.keys(JSON.parse(block.match(/COSMETICS = (\{.*\});/)[1])).length} cosméticos`);
}
