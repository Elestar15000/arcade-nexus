// ============================================================
// NEXUS ARCADE · tools/avatars/export.mjs
// Prepara los PNG de avatar a partir de los originales generados.
//
//   node tools/avatars/export.mjs           → exporta todos los originales que haya
//   node tools/avatars/export.mjs nx-nexo   → sólo esos ids
//   node tools/avatars/export.mjs --check   → informe: qué avatares tienen original y PNG
//   node tools/avatars/export.mjs --sync    → copia la lista de ids y equivalencias al Worker
//
// Originales: tools/avatars/masters/<id>.png (también .jpg, .jpeg o .webp), idealmente 1024×1024.
// Salida:     assets/avatars/<colección>/<id>-512.png y <id>-256.png (recorte cuadrado centrado).
// Usa `sharp` si está instalado (npm i -D sharp) y, si no, ImageMagick (`magick` o `convert`).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MASTERS = path.join(ROOT, 'tools/avatars/masters');
const OUT = path.join(ROOT, 'assets/avatars');
const WORKER = path.join(ROOT, 'backend/worker.js');
const SIZES = [512, 256];
const MAX_KB = { 512: 120, 256: 40 };

export function loadManifest() {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(OUT, 'manifest.js'), 'utf8'), ctx);
    return ctx.window.Nexus.data.avatars;
}

const M = loadManifest();
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const only = new Set(args.filter(a => !a.startsWith('--')));
const kb = (f) => Math.round(fs.statSync(f).size / 1024);
const outFile = (a, s) => path.join(OUT, a.collection, `${a.id}-${s}.png`);
const masterOf = (id) => ['.png', '.jpg', '.jpeg', '.webp'].map(e => path.join(MASTERS, id + e)).find(f => fs.existsSync(f)) || null;

// ── --sync: lista de ids del Worker ─────────────────────────
if (flags.has('--sync')) {
    const src = fs.readFileSync(WORKER, 'utf8');
    const legacy = Object.fromEntries(Object.entries(M.legacy).map(([k, v]) => [k.replace(/[️]/g, ''), v]));
    const block = `// @avatars-begin
const AVATAR_IDS = new Set([${M.avatars.map(a => `'${a.id}'`).join(', ')}]);
const AVATAR_DEFAULT = '${M.default}';
const AVATAR_LEGACY = ${JSON.stringify(legacy).replace(/,/g, ', ').replace(/":"/g, '": "')};
// @avatars-end`;
    const next = src.replace(/\/\/ @avatars-begin[\s\S]*?\/\/ @avatars-end/, block);
    if (next === src) console.log('Worker: la lista de avatares ya estaba al día.');
    else { fs.writeFileSync(WORKER, next); console.log(`Worker: ${M.avatars.length} avatares copiados a backend/worker.js.`); }
    process.exit(0);
}

// ── --check: informe ────────────────────────────────────────
if (flags.has('--check')) {
    let ready = 0;
    for (const a of M.avatars) {
        const have = SIZES.filter(s => fs.existsSync(outFile(a, s)));
        if (have.length === SIZES.length) ready++;
        const m = masterOf(a.id);
        console.log(`${have.length === SIZES.length ? '✔' : '·'} ${a.id.padEnd(14)} original: ${m ? 'sí' : 'no'}  png: ${have.map(s => `${s} (${kb(outFile(a, s))} KB)`).join(', ') || '—'}`);
    }
    console.log(`\n${ready}/${M.avatars.length} avatares listos.`);
    process.exit(0);
}

// ── Exportación ─────────────────────────────────────────────
let sharp = null;
try { sharp = (await import('sharp')).default; } catch (e) { /* se usará ImageMagick */ }
let magick = null;
if (!sharp) for (const bin of ['magick', 'convert']) {
    try { execFileSync(bin, ['-version'], { stdio: 'ignore' }); magick = bin; break; } catch (e) { /* no está */ }
}
if (!sharp && !magick) {
    console.error('Hace falta sharp (npm i -D sharp) o ImageMagick para redimensionar las imágenes.');
    process.exit(1);
}

async function resize(src, dst, size) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (sharp) {
        await sharp(src).resize(size, size, { fit: 'cover', position: 'centre' }).flatten({ background: '#141640' })
            .png({ compressionLevel: 9, palette: size <= 256, quality: 90 }).toFile(dst);
    } else {
        execFileSync(magick, [src, '-resize', `${size}x${size}^`, '-gravity', 'center', '-extent', `${size}x${size}`,
            '-background', '#141640', '-alpha', 'remove', '-strip', '-define', 'png:compression-level=9', dst]);
    }
}

let done = 0, missing = [];
for (const a of M.avatars) {
    if (only.size && !only.has(a.id)) continue;
    const src = masterOf(a.id);
    if (!src) { missing.push(a.id); continue; }
    for (const s of SIZES) {
        const dst = outFile(a, s);
        await resize(src, dst, s);
        const warn = kb(dst) > MAX_KB[s] ? `  ⚠ ${kb(dst)} KB (máx. ${MAX_KB[s]})` : '';
        console.log(`✔ ${path.relative(ROOT, dst)}${warn}`);
    }
    done++;
}
console.log(`\n${done} avatares exportados con ${sharp ? 'sharp' : magick}.`);
if (missing.length && !only.size) console.log(`Sin original (${missing.length}): ${missing.join(', ')}`);
for (const id of only) if (!M.avatars.some(a => a.id === id)) console.log(`✖ ${id} no está en el manifiesto`);
