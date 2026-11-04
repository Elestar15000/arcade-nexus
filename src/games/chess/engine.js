/* ============================================================
   NEXUS ARCADE · games/chess/engine.js
   Motor de ajedrez propio (sin dependencias):
     · Reglas completas: enroques, captura al paso, promoción,
       jaque, mate, ahogado, 50 jugadas, triple repetición y
       material insuficiente. FEN y notación algebraica (SAN) con
       letras en español (R, D, T, A, C).
     · IA: negamax alfa-beta con profundización iterativa,
       quiescencia, tabla de transposición, killers e historial,
       evaluación material + tablas de casillas (PST).
   ChessCore es una función AUTOCONTENIDA (no usa nada de fuera)
   para poder enviarla como texto a un Web Worker.
   ============================================================ */
(function () {
    'use strict';

    function ChessCore() {
        // Piezas: blancas 1..6, negras 9..14 (bit 8 = color). Tablero 0x88.
        const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, WHITE = 0, BLACK = 8;
        const VAL = [0, 100, 320, 330, 500, 900, 0];
        const N_DIR = [33, 31, 18, 14, -33, -31, -18, -14], B_DIR = [17, 15, -17, -15], R_DIR = [16, -16, 1, -1], K_DIR = [17, 15, -17, -15, 16, -16, 1, -1];
        const F_CAP = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8;
        const MATE = 30000;
        const sqName = (s) => 'abcdefgh'[s & 7] + ((s >> 4) + 1);
        const sqOf = (n) => (n.charCodeAt(0) - 97) + (Number(n[1]) - 1) * 16;
        const mv = (from, to, promo, flags) => from | (to << 7) | (promo << 14) | (flags << 17);
        const mFrom = (m) => m & 127, mTo = (m) => (m >> 7) & 127, mPromo = (m) => (m >> 14) & 7, mFlags = (m) => (m >> 17) & 15;

        // Zobrist determinista (igual en el hilo principal y en el worker)
        let seed = 0x9E3779B9;
        const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
        const Z1 = new Int32Array(16 * 128), Z2 = new Int32Array(16 * 128);
        for (let i = 0; i < Z1.length; i++) { Z1[i] = rnd(); Z2[i] = rnd(); }
        const ZC1 = new Int32Array(16), ZC2 = new Int32Array(16), ZE1 = new Int32Array(128), ZE2 = new Int32Array(128);
        for (let i = 0; i < 16; i++) { ZC1[i] = rnd(); ZC2[i] = rnd(); }
        for (let i = 0; i < 128; i++) { ZE1[i] = rnd(); ZE2[i] = rnd(); }
        const ZT1 = rnd(), ZT2 = rnd();

        // Derechos de enroque que se pierden al tocar cada casilla
        const CASTLE_MASK = new Uint8Array(128).fill(15);
        CASTLE_MASK[0] = 15 & ~2; CASTLE_MASK[4] = 15 & ~3; CASTLE_MASK[7] = 15 & ~1;
        CASTLE_MASK[112] = 15 & ~8; CASTLE_MASK[116] = 15 & ~12; CASTLE_MASK[119] = 15 & ~4;

        // Tablas de casillas (vista de las blancas, fila 8 arriba)
        const PST = {
            1: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
            2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
            3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
            4: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
            5: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
            6: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
            7: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
        };
        const pstIdx = (sq, white) => { const r = sq >> 4, f = sq & 7; return white ? (7 - r) * 8 + f : r * 8 + f; };

        class Position {
            constructor() {
                this.b = new Int8Array(128);
                this.turn = WHITE; this.castle = 0; this.ep = -1; this.half = 0; this.full = 1;
                this.kings = [4, 116];
                this.h1 = 0; this.h2 = 0;
                this.stack = [];          // deshacer
                this.hist = [];           // claves de posiciones anteriores (repeticiones)
            }

            key() { return (this.h1 >>> 0) * 2097152 + ((this.h2 >>> 0) & 0x1FFFFF); }

            rehash() {
                let a = 0, c = 0;
                for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = this.b[s]; if (p) { a ^= Z1[p * 128 + s]; c ^= Z2[p * 128 + s]; } }
                a ^= ZC1[this.castle]; c ^= ZC2[this.castle];
                if (this.ep >= 0) { a ^= ZE1[this.ep]; c ^= ZE2[this.ep]; }
                if (this.turn) { a ^= ZT1; c ^= ZT2; }
                this.h1 = a; this.h2 = c;
            }

            static fromFen(fen) {
                const pos = new Position();
                const [board, turn, castle, ep, half, full] = String(fen).trim().split(/\s+/);
                const rows = board.split('/');
                if (rows.length !== 8) throw new Error('FEN no válido');
                const map = { p: P, n: N, b: B, r: R, q: Q, k: K };
                rows.forEach((row, i) => {
                    let f = 0; const r = 7 - i;
                    for (const ch of row) {
                        if (/\d/.test(ch)) { f += Number(ch); continue; }
                        const t = map[ch.toLowerCase()]; if (!t) throw new Error('FEN no válido');
                        const p = t | (ch === ch.toLowerCase() ? BLACK : WHITE);
                        const s = r * 16 + f; pos.b[s] = p;
                        if (t === K) pos.kings[p & 8 ? 1 : 0] = s;
                        f++;
                    }
                });
                pos.turn = turn === 'b' ? BLACK : WHITE;
                pos.castle = (castle || '-').split('').reduce((m, ch) => m | ({ K: 1, Q: 2, k: 4, q: 8 }[ch] || 0), 0);
                pos.ep = ep && ep !== '-' ? sqOf(ep) : -1;
                pos.half = Number(half) || 0; pos.full = Number(full) || 1;
                pos.rehash();
                return pos;
            }

            fen() {
                const ch = ' PNBRQK  pnbrqk';
                let out = '';
                for (let r = 7; r >= 0; r--) {
                    let empty = 0;
                    for (let f = 0; f < 8; f++) {
                        const p = this.b[r * 16 + f];
                        if (!p) { empty++; continue; }
                        if (empty) { out += empty; empty = 0; }
                        out += ch[p];
                    }
                    if (empty) out += empty;
                    if (r) out += '/';
                }
                const c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
                return `${out} ${this.turn ? 'b' : 'w'} ${c || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
            }

            attacked(s, by) {
                const b = this.b;
                // peones
                if (by === WHITE) { if (!((s - 15) & 0x88) && b[s - 15] === P) return true; if (!((s - 17) & 0x88) && b[s - 17] === P) return true; }
                else { if (!((s + 15) & 0x88) && b[s + 15] === (P | BLACK)) return true; if (!((s + 17) & 0x88) && b[s + 17] === (P | BLACK)) return true; }
                for (const d of N_DIR) { const t = s + d; if (!(t & 0x88) && b[t] === (N | by)) return true; }
                for (const d of K_DIR) { const t = s + d; if (!(t & 0x88) && b[t] === (K | by)) return true; }
                for (const d of B_DIR) { let t = s + d; while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (B | by) || p === (Q | by)) return true; break; } t += d; } }
                for (const d of R_DIR) { let t = s + d; while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (R | by) || p === (Q | by)) return true; break; } t += d; } }
                return false;
            }

            inCheck(side = this.turn) { return this.attacked(this.kings[side ? 1 : 0], side ^ 8); }

            /** Movimientos pseudo-legales (capturesOnly para la quiescencia). */
            gen(capturesOnly) {
                const b = this.b, us = this.turn, them = us ^ 8, out = [];
                const fwd = us === WHITE ? 16 : -16, startR = us === WHITE ? 1 : 6, promoR = us === WHITE ? 7 : 0;
                for (let s = 0; s < 128; s++) {
                    if (s & 0x88) { s += 7; continue; }
                    const p = b[s];
                    if (!p || (p & 8) !== us) continue;
                    const t = p & 7;
                    if (t === P) {
                        const one = s + fwd;
                        if (!(one & 0x88) && !b[one]) {
                            if ((one >> 4) === promoR) { for (const pr of [Q, N, R, B]) out.push(mv(s, one, pr, 0)); }
                            else if (!capturesOnly) {
                                out.push(mv(s, one, 0, 0));
                                const two = one + fwd;
                                if ((s >> 4) === startR && !b[two]) out.push(mv(s, two, 0, F_DOUBLE));
                            }
                        }
                        for (const d of [fwd - 1, fwd + 1]) {
                            const c = s + d; if (c & 0x88) continue;
                            if (b[c] && (b[c] & 8) === them) {
                                if ((c >> 4) === promoR) { for (const pr of [Q, N, R, B]) out.push(mv(s, c, pr, F_CAP)); }
                                else out.push(mv(s, c, 0, F_CAP));
                            } else if (c === this.ep) out.push(mv(s, c, 0, F_CAP | F_EP));
                        }
                        continue;
                    }
                    const dirs = t === N ? N_DIR : t === B ? B_DIR : t === R ? R_DIR : K_DIR;
                    const slide = t === B || t === R || t === Q;
                    for (const d of dirs) {
                        let to = s + d;
                        while (!(to & 0x88)) {
                            const q = b[to];
                            if (q) { if ((q & 8) === them) out.push(mv(s, to, 0, F_CAP)); break; }
                            if (!capturesOnly) out.push(mv(s, to, 0, 0));
                            if (!slide) break;
                            to += d;
                        }
                    }
                    if (t === K && !capturesOnly) {
                        if (us === WHITE && s === 4) {
                            if ((this.castle & 1) && !b[5] && !b[6] && b[7] === R && !this.attacked(4, them) && !this.attacked(5, them) && !this.attacked(6, them)) out.push(mv(4, 6, 0, F_CASTLE));
                            if ((this.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === R && !this.attacked(4, them) && !this.attacked(3, them) && !this.attacked(2, them)) out.push(mv(4, 2, 0, F_CASTLE));
                        } else if (us === BLACK && s === 116) {
                            if ((this.castle & 4) && !b[117] && !b[118] && b[119] === (R | BLACK) && !this.attacked(116, them) && !this.attacked(117, them) && !this.attacked(118, them)) out.push(mv(116, 118, 0, F_CASTLE));
                            if ((this.castle & 8) && !b[115] && !b[114] && !b[113] && b[112] === (R | BLACK) && !this.attacked(116, them) && !this.attacked(115, them) && !this.attacked(114, them)) out.push(mv(116, 114, 0, F_CASTLE));
                        }
                    }
                }
                return out;
            }

            /** Hace un movimiento; devuelve false (y lo deshace) si deja al rey en jaque. */
            make(m) {
                const b = this.b, from = mFrom(m), to = mTo(m), fl = mFlags(m), pr = mPromo(m);
                const p = b[from], us = this.turn;
                let cap = b[to], capSq = to;
                if (fl & F_EP) { capSq = to + (us === WHITE ? -16 : 16); cap = b[capSq]; }
                this.stack.push({ m, cap, capSq, castle: this.castle, ep: this.ep, half: this.half, h1: this.h1, h2: this.h2 });
                this.hist.push(this.key());
                let h1 = this.h1, h2 = this.h2;
                const zx = (piece, s) => { h1 ^= Z1[piece * 128 + s]; h2 ^= Z2[piece * 128 + s]; };
                if (cap) { zx(cap, capSq); b[capSq] = 0; }
                zx(p, from); b[from] = 0;
                const placed = pr ? (pr | us) : p;
                b[to] = placed; zx(placed, to);
                if (fl & F_CASTLE) {
                    const [rf, rt] = to === 6 ? [7, 5] : to === 2 ? [0, 3] : to === 118 ? [119, 117] : [112, 115];
                    const rook = b[rf]; b[rf] = 0; b[rt] = rook; zx(rook, rf); zx(rook, rt);
                }
                if ((p & 7) === K) this.kings[us ? 1 : 0] = to;
                h1 ^= ZC1[this.castle]; h2 ^= ZC2[this.castle];
                this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
                h1 ^= ZC1[this.castle]; h2 ^= ZC2[this.castle];
                if (this.ep >= 0) { h1 ^= ZE1[this.ep]; h2 ^= ZE2[this.ep]; }
                this.ep = (fl & F_DOUBLE) ? (from + to) >> 1 : -1;
                if (this.ep >= 0) { h1 ^= ZE1[this.ep]; h2 ^= ZE2[this.ep]; }
                this.half = ((p & 7) === P || cap) ? 0 : this.half + 1;
                if (us === BLACK) this.full++;
                this.turn ^= 8; h1 ^= ZT1; h2 ^= ZT2;
                this.h1 = h1; this.h2 = h2;
                if (this.attacked(this.kings[us ? 1 : 0], this.turn)) { this.unmake(); return false; }
                return true;
            }

            unmake() {
                const u = this.stack.pop(); if (!u) return;
                this.hist.pop();
                const b = this.b, m = u.m, from = mFrom(m), to = mTo(m), fl = mFlags(m), pr = mPromo(m);
                this.turn ^= 8;
                const us = this.turn;
                const p = pr ? (P | us) : b[to];
                b[from] = p; b[to] = 0;
                if (u.cap) b[u.capSq] = u.cap;
                if (fl & F_CASTLE) {
                    const [rf, rt] = to === 6 ? [7, 5] : to === 2 ? [0, 3] : to === 118 ? [119, 117] : [112, 115];
                    b[rf] = b[rt]; b[rt] = 0;
                }
                if ((p & 7) === K) this.kings[us ? 1 : 0] = from;
                if (us === BLACK) this.full--;
                this.castle = u.castle; this.ep = u.ep; this.half = u.half; this.h1 = u.h1; this.h2 = u.h2;
            }

            legal() {
                const out = [];
                for (const m of this.gen(false)) if (this.make(m)) { this.unmake(); out.push(m); }
                return out;
            }

            repetitions() {
                const k = this.key(); let n = 0;
                for (let i = this.hist.length - 2, lim = Math.max(0, this.hist.length - this.half - 1); i >= lim; i -= 2) if (this.hist[i] === k) n++;
                return n;
            }

            insufficient() {
                const minors = [], others = [];
                for (let s = 0; s < 128; s++) {
                    if (s & 0x88) { s += 7; continue; }
                    const p = this.b[s]; if (!p) continue;
                    const t = p & 7; if (t === K) continue;
                    if (t === N || t === B) minors.push({ t, c: p & 8, sq: ((s >> 4) + (s & 7)) & 1 });
                    else others.push(p);
                }
                if (others.length) return false;
                if (minors.length <= 1) return true;
                if (minors.length === 2 && minors.every(x => x.t === B) && minors[0].c !== minors[1].c && minors[0].sq === minors[1].sq) return true;
                return false;
            }

            /** Estado de la partida: { over, result: '1-0'|'0-1'|'1/2-1/2', reason } */
            status() {
                const moves = this.legal();
                if (!moves.length) {
                    if (this.inCheck()) return { over: true, result: this.turn ? '1-0' : '0-1', reason: 'mate' };
                    return { over: true, result: '1/2-1/2', reason: 'stalemate' };
                }
                if (this.half >= 100) return { over: true, result: '1/2-1/2', reason: 'fifty' };
                if (this.repetitions() >= 2) return { over: true, result: '1/2-1/2', reason: 'repetition' };
                if (this.insufficient()) return { over: true, result: '1/2-1/2', reason: 'material' };
                return { over: false, moves };
            }

            uci(m) { return sqName(mFrom(m)) + sqName(mTo(m)) + (mPromo(m) ? ' pnbrqk'[mPromo(m)] : ''); }
            fromUci(u) {
                if (typeof u !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) return 0;
                return this.legal().find(m => this.uci(m) === u) || 0;
            }

            /** Notación algebraica con letras españolas (R, D, T, A, C). Llamar ANTES de hacer el movimiento. */
            san(m) {
                const from = mFrom(m), to = mTo(m), fl = mFlags(m), p = this.b[from], t = p & 7;
                const L = ' PCATDR';
                let s;
                if (fl & F_CASTLE) s = (to & 7) === 6 ? 'O-O' : 'O-O-O';
                else if (t === P) {
                    s = (fl & F_CAP ? sqName(from)[0] + 'x' : '') + sqName(to);
                    if (mPromo(m)) s += '=' + L[mPromo(m)];
                } else {
                    const others = this.legal().filter(o => o !== m && mTo(o) === to && (this.b[mFrom(o)] & 7) === t);
                    let dis = '';
                    if (others.length) {
                        const sameF = others.some(o => (mFrom(o) & 7) === (from & 7)), sameR = others.some(o => (mFrom(o) >> 4) === (from >> 4));
                        dis = !sameF ? sqName(from)[0] : !sameR ? sqName(from)[1] : sqName(from);
                    }
                    s = L[t] + dis + (fl & F_CAP ? 'x' : '') + sqName(to);
                }
                this.make(m);
                const st = this.legal().length;
                if (this.inCheck()) s += st ? '+' : '#';
                this.unmake();
                return s;
            }

            // ── Evaluación (desde el punto de vista del que mueve) ──
            evaluate() {
                const b = this.b;
                let score = 0, mat = 0, bishopsW = 0, bishopsB = 0;
                for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = b[s]; if (p && (p & 7) !== K && (p & 7) !== P) mat += VAL[p & 7]; }
                const endgame = mat <= 1700;
                for (let s = 0; s < 128; s++) {
                    if (s & 0x88) { s += 7; continue; }
                    const p = b[s]; if (!p) continue;
                    const t = p & 7, white = !(p & 8);
                    const tab = t === K && endgame ? PST[7] : PST[t];
                    const v = VAL[t] + tab[pstIdx(s, white)];
                    score += white ? v : -v;
                    if (t === B) { if (white) bishopsW++; else bishopsB++; }
                }
                if (bishopsW >= 2) score += 30;
                if (bishopsB >= 2) score -= 30;
                return this.turn === WHITE ? score : -score;
            }
        }

        // ── Búsqueda ────────────────────────────────────────
        function search(pos, opts) {
            opts = opts || {};
            const maxDepth = opts.depth || 4, timeMs = opts.time || 1000, noise = opts.noise || 0;
            const t0 = Date.now();
            const TT = new Map();
            const killers = [], history = new Int32Array(128 * 128);
            let nodes = 0, stop = false;

            const order = (moves, ttMove, ply) => {
                const k = killers[ply] || [];
                const sc = moves.map(m => {
                    if (m === ttMove) return 1e7;
                    const fl = mFlags(m);
                    if (fl & F_CAP) { const victim = pos.b[mTo(m)] & 7 || P; return 1e6 + VAL[victim] * 10 - VAL[pos.b[mFrom(m)] & 7] / 10; }
                    if (mPromo(m)) return 9e5 + VAL[mPromo(m)];
                    if (m === k[0]) return 8e5; if (m === k[1]) return 7e5;
                    return history[mFrom(m) * 128 + mTo(m)];
                });
                const idx = moves.map((_, i) => i).sort((a, b) => sc[b] - sc[a]);
                return idx.map(i => moves[i]);
            };

            const quiesce = (alpha, beta, ply) => {
                if ((++nodes & 2047) === 0 && Date.now() - t0 > timeMs) stop = true;
                if (stop) return 0;
                const standPat = pos.evaluate();
                if (standPat >= beta) return beta;
                if (standPat > alpha) alpha = standPat;
                if (ply > 40) return alpha;
                for (const m of order(pos.gen(true), 0, 63)) {
                    if (!pos.make(m)) continue;
                    const s = -quiesce(-beta, -alpha, ply + 1);
                    pos.unmake();
                    if (stop) return 0;
                    if (s >= beta) return beta;
                    if (s > alpha) alpha = s;
                }
                return alpha;
            };

            const negamax = (depth, alpha, beta, ply) => {
                if ((++nodes & 2047) === 0 && Date.now() - t0 > timeMs) stop = true;
                if (stop) return 0;
                if (ply > 0 && (pos.half >= 100 || pos.repetitions() >= 1)) return 0;
                if (ply > 60) return pos.evaluate();
                const check = pos.inCheck();
                if (check) depth++;
                if (depth <= 0) return quiesce(alpha, beta, ply);
                const key = pos.key(), tt = TT.get(key);
                if (tt && tt.d >= depth && ply > 0) {
                    if (tt.f === 0) return tt.s;
                    if (tt.f === 1 && tt.s >= beta) return tt.s;
                    if (tt.f === 2 && tt.s <= alpha) return tt.s;
                }
                const a0 = alpha;
                let best = -MATE * 2, bestM = 0, legal = 0;
                for (const m of order(pos.gen(false), tt ? tt.m : 0, ply)) {
                    if (!pos.make(m)) continue;
                    legal++;
                    const s = -negamax(depth - 1, -beta, -alpha, ply + 1);
                    pos.unmake();
                    if (stop) return 0;
                    if (s > best) { best = s; bestM = m; }
                    if (s > alpha) alpha = s;
                    if (alpha >= beta) {
                        if (!(mFlags(m) & F_CAP)) {
                            const k = killers[ply] || (killers[ply] = [0, 0]);
                            if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
                            history[mFrom(m) * 128 + mTo(m)] += depth * depth;
                        }
                        break;
                    }
                }
                if (!legal) return check ? -MATE + ply : 0;
                if (TT.size > 400000) TT.clear();
                TT.set(key, { d: depth, s: best, m: bestM, f: best <= a0 ? 2 : best >= beta ? 1 : 0 });
                return best;
            };

            const rootMoves = pos.legal();
            if (!rootMoves.length) return { move: null, score: 0, depth: 0 };
            if (rootMoves.length === 1) return { move: pos.uci(rootMoves[0]), score: 0, depth: 0, nodes: 0 };

            // Niveles con ruido: puntúa cada jugada a profundidad fija y suma un error aleatorio
            if (noise > 0) {
                let best = null, bestS = -Infinity;
                for (const m of rootMoves) {
                    pos.make(m);
                    const s = -negamax(maxDepth - 1, -MATE * 2, MATE * 2, 1) + (Math.random() * 2 - 1) * noise;
                    pos.unmake();
                    if (s > bestS) { bestS = s; best = m; }
                }
                return { move: pos.uci(best), score: Math.round(bestS), depth: maxDepth, nodes };
            }

            let bestMove = rootMoves[0], bestScore = 0, done = 0;
            for (let d = 1; d <= maxDepth; d++) {
                let alpha = -MATE * 2, iterBest = 0, iterScore = -MATE * 2;
                const ordered = [bestMove].concat(order(rootMoves.filter(m => m !== bestMove), 0, 0));
                for (const m of ordered) {
                    pos.make(m);
                    const s = -negamax(d - 1, -MATE * 2, -alpha, 1);
                    pos.unmake();
                    if (stop) break;
                    if (s > iterScore) { iterScore = s; iterBest = m; }
                    if (s > alpha) alpha = s;
                }
                if (stop && !iterBest) break;
                if (iterBest) { bestMove = iterBest; bestScore = iterScore; done = d; }
                if (stop || Math.abs(bestScore) > MATE - 100) break;
                if (Date.now() - t0 > timeMs * 0.55) break;     // otra iteración no cabría
            }
            return { move: pos.uci(bestMove), score: bestScore, depth: done, nodes };
        }

        const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        return {
            Position, search, START, P, N, B, R, Q, K, WHITE, BLACK, VAL,
            sqName, sqOf, mFrom, mTo, mPromo, mFlags, F_CAP, F_EP, F_CASTLE, F_DOUBLE, MATE,
            /** Posición tras aplicar una lista de jugadas UCI a un FEN. */
            replay(fen, ucis) {
                const pos = Position.fromFen(fen || START);
                for (const u of ucis || []) { const m = pos.fromUci(u); if (!m) throw new Error('Jugada ilegal: ' + u); pos.make(m); }
                return pos;
            }
        };
    }

    Nexus.games.ChessCore = ChessCore;
})();
