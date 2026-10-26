/* ============================================================
   NEXUS ARCADE · core/audio.js
   Efectos de sonido sintetizados con Web Audio (sin archivos).
   Respeta los ajustes del usuario (sonido on/off y volumen).
   ============================================================ */
(function () {
    'use strict';

    let ctx = null;

    function getCtx() {
        if (ctx) return ctx;
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { ctx = null; }
        return ctx;
    }

    function enabled() {
        const s = Nexus.services.settings;
        return !s || s.get('sound');
    }
    function master() {
        const s = Nexus.services.settings;
        return s ? s.get('volume') : 0.6;
    }

    function tone(freq, duration, type = 'sine', volume = 0.08, delay = 0) {
        if (!enabled()) return;
        const c = getCtx();
        if (!c) return;
        try {
            if (c.state === 'suspended') c.resume();
            const t0 = c.currentTime + delay;
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            const v = Math.max(0.0002, volume * master() * 1.6);
            gain.gain.setValueAtTime(v, t0);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
            osc.connect(gain); gain.connect(c.destination);
            osc.start(t0); osc.stop(t0 + duration);
        } catch (e) { /* el sonido nunca debe romper el juego */ }
    }

    function noise(volume, duration) {
        if (!enabled()) return;
        const c = getCtx();
        if (!c) return;
        try {
            if (c.state === 'suspended') c.resume();
            const size = Math.floor(c.sampleRate * duration);
            const buffer = c.createBuffer(1, size, c.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
            const src = c.createBufferSource();
            src.buffer = buffer;
            const gain = c.createGain();
            const v = Math.max(0.0002, volume * master() * 1.6);
            gain.gain.setValueAtTime(v, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
            src.connect(gain); gain.connect(c.destination);
            src.start();
        } catch (e) { /* idem */ }
    }

    const SOUNDS = {
        click:          () => tone(520, 0.05, 'triangle', 0.05),
        key:            () => tone(420, 0.04, 'triangle', 0.05),
        reveal:         () => tone(500, 0.08, 'sine', 0.06),
        flag:           () => tone(600, 0.1, 'triangle', 0.08),
        combo:          (n = 2) => tone(400 + Math.min(n, 20) * 50, 0.12, 'sine', 0.07),
        explosion:      () => noise(0.15, 0.3),
        win:            () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.1, i * 0.12)),
        lose:           () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, i * 0.16)),
        powerActivate:  () => { tone(400, 0.15, 'sine', 0.06); tone(700, 0.15, 'sine', 0.06, 0.08); },
        powerUse:       () => tone(900, 0.15, 'square', 0.05),
        orbCollect:     () => { tone(1200, 0.08, 'sine', 0.06); tone(1600, 0.08, 'sine', 0.06, 0.07); },
        flip:           () => tone(330, 0.07, 'triangle', 0.06),
        correct:        () => tone(660, 0.1, 'sine', 0.07),
        error:          () => { tone(180, 0.12, 'sawtooth', 0.05); tone(150, 0.15, 'sawtooth', 0.05, 0.1); },
        achievement:    () => [659, 880, 1175].forEach((f, i) => tone(f, 0.18, 'sine', 0.09, i * 0.1)),
        tdPop:          () => tone(760 + Math.random() * 240, 0.04, 'sine', 0.035),
        tdBoom:         () => noise(0.1, 0.14),
        tdSniper:       () => tone(240, 0.09, 'square', 0.04),
        tdPlace:        () => { tone(330, 0.07, 'triangle', 0.07); tone(500, 0.09, 'triangle', 0.07, 0.06); },
        tdUpgrade:      () => { tone(520, 0.08, 'sine', 0.07); tone(780, 0.12, 'sine', 0.07, 0.07); },
        tdSell:         () => tone(300, 0.12, 'triangle', 0.06),
        tdLeak:         () => tone(150, 0.2, 'sawtooth', 0.06),
        tdRound:        () => { tone(440, 0.08, 'triangle', 0.06); tone(660, 0.1, 'triangle', 0.06, 0.07); },
        tdRoundEnd:     () => tone(880, 0.12, 'sine', 0.05),
        levelup:        () => [523, 659, 784, 988, 1175].forEach((f, i) => tone(f, 0.16, 'triangle', 0.09, i * 0.09))
    };

    Nexus.audio = {
        play(name, arg) {
            const fn = SOUNDS[name];
            if (fn) fn(arg);
        }
    };

    // Los navegadores exigen un gesto del usuario antes de arrancar el audio
    document.addEventListener('pointerdown', () => { getCtx(); }, { once: true, passive: true });
})();
