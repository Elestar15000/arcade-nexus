/* ============================================================
   NEXUS ARCADE · core/hash.js
   SHA-256 en JavaScript puro + derivación de clave con sal.
   Se usa JS puro (y no crypto.subtle) para que funcione igual
   abriendo el proyecto desde file:// o desde un servidor.

   NOTA: la contraseña de un perfil local es una comodidad
   (evitar que otra persona use tu perfil por descuido), no
   una medida de seguridad real: los datos viven en el
   navegador y quien tenga acceso al equipo puede leerlos.
   ============================================================ */
(function () {
    'use strict';

    const K = new Uint32Array(64);
    const H0 = new Uint32Array(8);

    // Constantes: parte fraccionaria de raíces cuadradas/cúbicas de los primeros primos
    (function init() {
        const frac = (v) => Math.floor((v - Math.floor(v)) * 4294967296);
        let n = 2, count = 0;
        while (count < 64) {
            let prime = true;
            for (let i = 2; i * i <= n; i++) if (n % i === 0) { prime = false; break; }
            if (prime) {
                if (count < 8) H0[count] = frac(Math.sqrt(n));
                K[count] = frac(Math.cbrt(n));
                count++;
            }
            n++;
        }
    })();

    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    function sha256(bytes) {
        const len = bytes.length;
        const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
        padded.set(bytes);
        padded[len] = 0x80;
        const dv = new DataView(padded.buffer);
        const bits = len * 8;
        dv.setUint32(padded.length - 8, Math.floor(bits / 4294967296));
        dv.setUint32(padded.length - 4, bits >>> 0);

        const h = Uint32Array.from(H0);
        const w = new Uint32Array(64);

        for (let off = 0; off < padded.length; off += 64) {
            for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
            for (let i = 16; i < 64; i++) {
                const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
            }
            let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
            for (let i = 0; i < 64; i++) {
                const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
                const ch = (e & f) ^ (~e & g);
                const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
                const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
                const maj = (a & b) ^ (a & c) ^ (b & c);
                const t2 = (S0 + maj) >>> 0;
                hh = g; g = f; f = e; e = (d + t1) >>> 0;
                d = c; c = b; b = a; a = (t1 + t2) >>> 0;
            }
            h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0;
            h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
            h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
            h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
        }

        const out = new Uint8Array(32);
        const odv = new DataView(out.buffer);
        for (let i = 0; i < 8; i++) odv.setUint32(i * 4, h[i]);
        return out;
    }

    const utf8 = (s) => new TextEncoder().encode(s);
    const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    Nexus.core.hash = {
        sha256Hex: (text) => toHex(sha256(utf8(text))),

        randomSalt() {
            const arr = new Uint8Array(16);
            if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
            else for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
            return toHex(arr);
        },

        /** Derivación con sal y 3000 iteraciones (estiramiento sencillo). */
        hashPassword(password, salt) {
            const saltBytes = utf8(salt);
            let digest = sha256(utf8(salt + ':' + password));
            for (let i = 0; i < 3000; i++) {
                const joined = new Uint8Array(digest.length + saltBytes.length);
                joined.set(digest); joined.set(saltBytes, digest.length);
                digest = sha256(joined);
            }
            return toHex(digest);
        }
    };
})();
