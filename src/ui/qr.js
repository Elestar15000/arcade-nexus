/* ============================================================
   NEXUS ARCADE · ui/qr.js — Generador de códigos QR (sin
   dependencias) para vincular Google Authenticator.
   Modo byte, corrección de errores M, versiones 1–40, máscara
   elegida por penalización. Basado en el algoritmo del estándar
   ISO/IEC 18004 (como la implementación de referencia de Nayuki).
   Nexus.ui.qr.svg(texto, { size, dark, light }) → <svg>…</svg>
   ============================================================ */
(function () {
    'use strict';

    // [nivel][versión] — niveles en orden L, M, Q, H
    const ECC_PER_BLOCK = [
        [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
        [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]];
    const NUM_BLOCKS = [
        [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
        [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
        [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
        [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]];
    const FORMAT_BITS = [1, 0, 3, 2];          // L, M, Q, H
    const ECL = 1;                              // M

    const bit = (x, i) => ((x >>> i) & 1) !== 0;
    function rawModules(ver) {
        let r = (16 * ver + 128) * ver + 64;
        if (ver >= 2) { const na = Math.floor(ver / 7) + 2; r -= (25 * na - 10) * na - 55; if (ver >= 7) r -= 36; }
        return r;
    }
    const dataCodewords = (ver, ecl) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver];

    // Reed-Solomon sobre GF(2^8) con el polinomio 0x11D
    function gfMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; }
    function rsDivisor(deg) {
        const r = new Array(deg).fill(0); r[deg - 1] = 1;
        let root = 1;
        for (let i = 0; i < deg; i++) {
            for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
            root = gfMul(root, 2);
        }
        return r;
    }
    function rsRemainder(data, div) {
        const r = div.map(() => 0);
        for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); }
        return r;
    }

    function alignPositions(ver, size) {
        if (ver === 1) return [];
        const na = Math.floor(ver / 7) + 2;
        const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
        const out = [6];
        for (let pos = size - 7; out.length < na; pos -= step) out.splice(1, 0, pos);
        return out;
    }

    function encode(text, ecl = ECL) {
        const bytes = Array.from(new TextEncoder().encode(text));
        // Versión mínima que cabe
        let ver = 1;
        for (; ver <= 40; ver++) {
            const ccBits = ver <= 9 ? 8 : 16;
            if (4 + ccBits + bytes.length * 8 <= dataCodewords(ver, ecl) * 8) break;
        }
        if (ver > 40) throw new Error('Texto demasiado largo para un QR');
        // Bits de datos
        const bits = [];
        const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
        put(4, 4); put(bytes.length, ver <= 9 ? 8 : 16); bytes.forEach(b => put(b, 8));
        const cap = dataCodewords(ver, ecl) * 8;
        put(0, Math.min(4, cap - bits.length));
        put(0, (8 - bits.length % 8) % 8);
        for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
        const data = [];
        for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b); }
        // Bloques + corrección de errores, intercalados
        const nb = NUM_BLOCKS[ecl][ver], eccLen = ECC_PER_BLOCK[ecl][ver], raw = Math.floor(rawModules(ver) / 8);
        const nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(eccLen);
        const blocks = [];
        for (let i = 0, k = 0; i < nb; i++) {
            const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += dat.length;
            const ecc = rsRemainder(dat, div);
            if (i < nShort) dat.push(0);
            blocks.push(dat.concat(ecc));
        }
        const all = [];
        for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) all.push(b[i]); });

        // Matriz
        const size = ver * 4 + 17;
        const M = Array.from({ length: size }, () => new Array(size).fill(false));
        const F = Array.from({ length: size }, () => new Array(size).fill(false));
        const set = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
        for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
        const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, d !== 2 && d !== 4); } };
        finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
        const ap = alignPositions(ver, size), na = ap.length;
        for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
            if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
            for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
        const drawFormat = (mask) => {
            const d = (FORMAT_BITS[ecl] << 3) | mask;
            let rem = d; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            const b = ((d << 10) | rem) ^ 0x5412;
            for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
            set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
            for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
            for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
            for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
            set(8, size - 8, true);
        };
        drawFormat(0);
        if (ver >= 7) {
            let rem = ver; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
            const b = (ver << 12) | rem;
            for (let i = 0; i < 18; i++) { const a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bit(b, i)); set(c, a, bit(b, i)); }
        }
        // Datos en zigzag
        let i = 0;
        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) right = 5;
            for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
                const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
                if (!F[y][x] && i < all.length * 8) { M[y][x] = bit(all[i >>> 3], 7 - (i & 7)); i++; }
            }
        }
        const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
            (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
            (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
        const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && MASKS[m](x, y)) M[y][x] = !M[y][x]; };
        // Penalización (reglas de rachas, bloques 2×2 y equilibrio) para elegir máscara
        const penalty = () => {
            let p = 0, dark = 0;
            for (let y = 0; y < size; y++) {
                let run = 1, runC = 1;
                for (let x = 0; x < size; x++) {
                    if (M[y][x]) dark++;
                    if (x > 0) { if (M[y][x] === M[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
                    if (x > 0) { if (M[x][y] === M[x - 1][y]) { runC++; if (runC === 5) p += 3; else if (runC > 5) p++; } else runC = 1; }
                    if (x < size - 1 && y < size - 1) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
                }
            }
            const total = size * size, k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
            return p + Math.max(0, k) * 10;
        };
        let best = 0, bestP = Infinity;
        for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const pv = penalty(); if (pv < bestP) { bestP = pv; best = m; } applyMask(m); }
        applyMask(best); drawFormat(best);
        return { size, modules: M, version: ver, mask: best };
    }

    /** SVG con margen de 4 módulos (zona en blanco obligatoria). */
    function svg(text, o = {}) {
        const q = encode(text), border = 4, n = q.size + border * 2;
        let d = '';
        for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.modules[y][x]) d += `M${x + border},${y + border}h1v1h-1z`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${o.size || 220}" height="${o.size || 220}" shape-rendering="crispEdges" role="img" aria-label="${o.label || 'Código QR'}">
            <rect width="100%" height="100%" fill="${o.light || '#ffffff'}"/><path d="${d}" fill="${o.dark || '#000000'}"/></svg>`;
    }

    window.Nexus = window.Nexus || {}; Nexus.ui = Nexus.ui || {};
    Nexus.ui.qr = { encode, svg };
})();
