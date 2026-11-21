/* ============================================================
   NEXUS ARCADE · games/cardgames/games.js
   Brisca (1 contra 1), Guiñote (2 parejas, 4 jugadores) y
   Chinchón (2 a 4 jugadores) sobre la mesa común de table.js.
   ============================================================ */
(function () {
    'use strict';

    const { esc } = Nexus.util;
    const K = Nexus.games.cardCore;
    const R = Nexus.games.cardRules;
    const { cardHtml, suitSvg, CardTableGame } = Nexus.games.cards;
    const SUITW = K.SUIT_NAME;
    const act = (a) => `data-act='${esc(JSON.stringify(a))}'`;
    const iWon = (v) => !!v.over && v.over.winners.includes(v.me);

    // ── Común a los juegos de bazas ─────────────────────────
    function trickCenter(v, g) {
        const trick = v.trick.map(t => cardHtml(t.c, { cls: 'cg-tc at-' + g.posOf(t.s) + (v.trickWinner === t.s ? ' win' : ''), attrs: `data-trick-seat="${t.s}"` })).join('');
        const stock = (v.deck > 0)
            ? `<div class="cg-stock">${v.muestra ? cardHtml(v.muestra, { cls: 'cg-muestra' }) : ''}${v.deck > 1 ? `<span class="pc back cg-deck"><i></i><b>${v.deck - (v.muestra ? 1 : 0)}</b></span>` : ''}</div>`
            : `<div class="cg-stock empty"><span class="cg-trump-chip">${suitSvg(v.trump)} Triunfo: ${SUITW[v.trump]}</span></div>`;
        return `${stock}<div class="cg-trick">${trick}</div>${v.arrastre && v.game === 'guinote' ? '<span class="cg-flag">⚠️ Arrastre</span>' : ''}`;
    }
    const trickHelpCommon = [
        'Se juega con la baraja española de 40 cartas. La carta vuelta bajo el mazo (la <b>muestra</b>) marca el palo de <b>triunfo</b>.',
        'Gana la baza la carta más alta del palo de salida, salvo que alguien eche triunfo: entonces gana el triunfo más alto.',
        'Tras cada baza, quien la gana roba primero y sale en la siguiente.'
    ];

    // ── Brisca ──────────────────────────────────────────────
    const brisca = {
        id: 'brisca', name: 'Brisca', title: 'BRISCA', emoji: '🂡', accent: '#f59e0b', rules: R.brisca,
        seats: { min: 2, max: 4, default: 2 }, teams: false,
        tagline: 'El clásico de baraja española: mano a mano o por parejas, al mejor de 3.',
        cpuText: 'Mano a mano o 2 contra 2 con bots', seatsText: 'Mesa de 2 (mano a mano) o de 4 (por parejas: tu compañero enfrente).',
        help: [...trickHelpCommon,
            'Orden: As, Tres, Rey, Caballo, Sota, 7, 6, 5, 4, 2. Valen: As 11, Tres 10, Rey 4, Caballo 3, Sota 2 (120 en total).',
            'Aquí no hay obligación de asistir: puedes echar la carta que quieras.',
            'Si tienes el 7 de triunfo (o el 2 si la muestra es baja) puedes cambiarlo por la muestra cuando sales, hasta el último robo: mientras la muestra siga en la mesa, aunque ya no quede mazo encima.',
            'Gana la mano quien pase de 60 puntos (a 60 es empate y no cuenta). El partido es <b>al mejor de 3 manos</b>.',
            'Con 4 jugadores se juega <b>por parejas</b>: tu compañero se sienta enfrente y sumáis las bazas de los dos (sin obligación de asistir ni cantes).',
            'Como en la mesa, <b>los puntos no se ven</b> durante la mano: hay que contarlos. Con ⚙️ «Marcador visible» se muestran (para aprender).'],
        center: (v, g) => trickCenter(v, g) + briscaSummary(v, g),
        seatBadge: (v, i) => (v.teams ? `Pareja ${i % 2 === 0 ? 'A' : 'B'}${i !== v.me && i % 2 === v.me % 2 ? ' · compañero' : ''}` : `${v.tricks[v.players[i].side]} bazas`),
        scoreHtml: (v, g) => {
            const mine = v.players[v.me].side, sidesL = v.teams ? [mine, 1 - mine] : [v.me, 1 - v.me];
            const name = (sd) => (v.teams ? `Pareja ${sd === 0 ? 'A' : 'B'}${sd === mine ? ' (tú)' : ''}` : `${Nexus.ui.avatar.html(g.pub[sd].avatar)} ${esc(g.pub[sd].name)}`);
            return `<div class="cg-score2">${sidesL.map(sd => `
            <div class="cg-sc ${sd === mine ? 'mine' : ''}"><span>${name(sd)}</span><b>${v.pts ? v.pts[sd] : '¿?'}</b><small>${v.tricks[sd]} bazas · ${v.games[sd]} ${v.games[sd] === 1 ? 'mano' : 'manos'}</small></div>`).join('')}</div>
            <div class="cg-trump-line">${suitSvg(v.trump)} Triunfo: <b>${SUITW[v.trump]}</b> · mazo ${v.deck} · mano ${v.handNo} (al mejor de 3)</div>
            ${v.pts ? `<div class="cg-bar"><i style="width:${Math.min(100, v.pts[mine] / 1.2)}%"></i><em style="left:50%"></em></div>` : ''}
            <small class="cg-note">${v.hiddenScore ? 'Los puntos no se ven: cuenta tus bazas. Gana la mano quien pase de 60.' : 'Gana la mano quien pase de 60 de 120.'}</small>`;
        },
        pill: (v) => { const mine = v.players[v.me].side; return `🏆 ${v.games[mine]}–${v.games[1 - mine]}${v.pts ? ` · ${v.pts[mine]}–${v.pts[1 - mine]}` : ''}`; },
        result: (v) => { const mine = v.players[v.me].side; return ({ won: iWon(v), draw: v.over.draw, score: (v.pts ? v.pts[mine] : 0) * 10 + v.games[mine] * 300, extra: { pts: v.pts ? v.pts[mine] : 0, games: v.games[mine] },
            stats: [{ label: 'Manos', value: `${v.games[mine]} – ${v.games[1 - mine]}` }, { label: 'Última mano', value: v.pts ? `${v.pts[mine]} – ${v.pts[1 - mine]}` : '–' }, { label: 'Bazas', value: v.tricks[mine] }] }); }
    };

    function briscaSummary(v, g) {
        if (v.phase !== 'handEnd' || !v.lastHand) return '';
        const h = v.lastHand, mine = v.players[v.me].side;
        const name = (sd) => (v.teams ? `Pareja ${sd === 0 ? 'A' : 'B'}` : esc(g.pub[sd].name));
        return `<div class="cg-summary"><h4>Fin de la mano ${v.handNo}</h4>
            <p>${h.win < 0 ? 'Empate a 60: la mano no cuenta.' : `${name(h.win)} gana la mano con <b>${h.pts[h.win]}</b> puntos.`}</p>
            <p>Partido (al mejor de 3): <b>${h.games[mine]} – ${h.games[1 - mine]}</b></p></div>`;
    }

    // ── Guiñote ─────────────────────────────────────────────
    /** Malas y buenas: los 50 primeros puntos son malas; pasadas, se cuentan las buenas (gana quien pasa de 50 buenas). */
    const mb = (t, M = 50) => (t > M ? { k: 'buenas', n: t - M } : { k: 'malas', n: t });
    const mbText = (t) => { const x = mb(t); return `${x.n} ${x.k}`; };
    const mbBar = (t, M = 50) => `<span class="gu-bar" title="${esc(mbText(t))}">
        <i class="gu-m" style="width:${Math.min(t, M) / (2 * M) * 100}%"></i><i class="gu-b" style="width:${Math.max(0, Math.min(t - M, M)) / (2 * M) * 100}%"></i><em></em></span>`;
    function guinoteSummary(v) {
        if (v.phase === 'gameEnd' && v.lastGame) return `<div class="cg-summary"><h4>Fin de la partida ${v.gameNo}</h4><p>${esc(v.lastGame.text)}.</p>
            <p>Coto (a ${v.coto} partidas): <b>Pareja A ${v.games[0]} – ${v.games[1]} Pareja B</b></p></div>`;
        if (v.phase !== 'handEnd' || !v.lastHand) return '';
        const h = v.lastHand;
        return `<div class="cg-summary"><h4>Fin de la mano ${v.handNo}${v.handNo === 1 ? ' (idas)' : ''}</h4>
            <table><tr><th></th><th>Antes</th><th>Bazas</th><th>Cantes</th><th>Ahora</th></tr>
            ${[0, 1].map(i => `<tr class="${i === v.mySide ? 'mine' : ''}"><td>Pareja ${i === 0 ? 'A' : 'B'}${i === v.mySide ? ' (tú)' : ''}</td><td>${mbText(h.before[i])}</td><td>+${h.pts[i]}</td><td>+${h.cantes[i]}</td><td><b class="gu-${mb(v.score[i]).k}">${mbText(v.score[i])}</b></td></tr>`).join('')}
            </table><p>Cartas (hacen falta ${v.cardsMin} para salir): A ${h.cards[0]} · B ${h.cards[1]}</p>
            <p>Nadie sale: <b>¡de vueltas!</b> Tras ganar una baza, declara <b>«¡Fuera!»</b> si tu pareja pasa de 50 buenas con ${v.cardsMin} de cartas.</p></div>`;
    }
    const guinote = {
        id: 'guinote', name: 'Guiñote', title: 'GUIÑOTE', emoji: '🃏', accent: '#ef4444', rules: R.guinote,
        seats: { min: 4, max: 4, default: 4 }, teams: true,
        tagline: 'Dos parejas, cantes y arrastre. Pasa las 50 malas y gana la primera pareja que supere las 50 buenas.',
        cpuText: 'Tú y un bot compañero contra dos bots', seatsText: 'Mesa de 4 en dos parejas (2 contra 2).',
        help: [...trickHelpCommon,
            'Cuatro jugadores en dos parejas: tu compañero se sienta enfrente. Se reparten 6 cartas a cada uno.',
            'Orden: As, Tres, Rey, Sota, Caballo, 7, 6, 5, 4, 2. Valen: As 11, Tres 10, Rey 4, Sota 3, Caballo 2. Las últimas (la baza final) dan 10 más.',
            '<b>Cantes</b>: tras ganar una baza, si tienes Rey y Sota del mismo palo cantas 20 (o las 40 si son de triunfo). Uno por baza ganada; también en el arrastre.',
            'Quien gana una baza puede cambiar el 7 de triunfo por la muestra mientras quede mazo, si la muestra vale puntos (As, Tres o figura).',
            '<b>Arrastre</b>: acabado el mazo hay que asistir al palo y montar si se puede; si no tienes, fallar con un triunfo que gane. Si tu compañero va ganando, basta con asistir.',
            '<b>Malas y buenas</b>: se juega a 101. Los primeros 50 puntos son <b>malas</b>; al pasarlas empiezan a contar las <b>buenas</b>. Gana la pareja que pase de 50 buenas. El marcador se actualiza en cada baza y cada cante.',
            'Para salir hacen falta también <b>30 puntos de cartas</b> (sin contar cantes). Si al acabar las idas las dos parejas cumplen, gana la que hizo las últimas.',
            'La primera mano (idas) se juega entera. Si nadie sale, se juegan <b>vueltas</b>: tras ganar una baza hay que declarar <b>«¡Fuera!»</b> (botón). Si la cuenta está mal, perdéis la partida. Los bots declaran solos.',
            'Los cantes suman al momento (variante habitual en las partidas rápidas): en las vueltas un cante puede permitir salir.',
            'Se juega a <b>cotos</b>: la primera pareja que gana 3 partidas se lleva el coto. Con ⚙️ «Canta la pareja», también puede cantar el compañero de quien gana la baza.',
            'Puedes <b>ordenar tu mano</b> arrastrando las cartas o con los botones «Por palo» y «Por valor».'],
        center: (v, g) => trickCenter(v, g) + guinoteSummary(v),
        seatBadge: (v, i) => `Pareja ${i % 2 === 0 ? 'A' : 'B'}${i !== v.me && i % 2 === v.me % 2 ? ' · compañero' : ''}`,
        scoreHtml: (v, g) => `<div class="cg-score2">${[v.mySide, 1 - v.mySide].map(sd => { const x = mb(v.score[sd]); return `
            <div class="cg-sc ${sd === v.mySide ? 'mine' : ''}" data-side="${sd}"><span>Pareja ${sd === 0 ? 'A' : 'B'}${sd === v.mySide ? ' (tú)' : ''}</span>
            <b class="gu-${x.k}">${x.n}</b><em class="gu-tag gu-${x.k}">${x.k === 'malas' ? `malas / ${v.malas}` : `buenas / ${v.malas}`}</em>
            ${mbBar(v.score[sd], v.malas)}
            <small>${[0, 1, 2, 3].filter(i => i % 2 === sd).map(i => esc(g.pub[i].name)).join(' y ')}</small>
            <small>Esta mano: ${v.pts[sd]} + ${v.cantes[sd]} cantes · ${v.tricks[sd]} bazas</small></div>`; }).join('')}</div>
            <div class="cg-trump-line">${suitSvg(v.trump)} Triunfo: <b>${SUITW[v.trump]}</b> · mazo ${v.deck}</div>
            <div class="gu-phase ${v.vueltas ? 'vueltas' : ''}">${v.vueltas ? `🔁 <b>Vueltas</b> (mano ${v.handNo}): tras ganar una baza, «¡Fuera!» si pasáis de ${v.malas} buenas con ${v.cardsMin} de cartas.` : `▶️ <b>Idas</b>: se juega la mano entera; sale quien pase de ${v.malas} buenas con ${v.cardsMin} de cartas.`}</div>
            <div class="gu-coto">🏆 Coto (a ${v.coto}): <b>A ${v.games[0]} – ${v.games[1]} B</b> · partida ${v.gameNo} · cartas: A ${v.cards[0]} · B ${v.cards[1]}</div>`,
        pill: (v) => { const a = mb(v.score[v.mySide]), b = mb(v.score[1 - v.mySide]); return `${a.n} ${a.k} – ${b.n} ${b.k}`; },
        result: (v) => ({ won: iWon(v), draw: false, score: v.score[v.mySide] * 5, extra: { team: v.score[v.mySide] },
            updateExtra: (x) => { x.cantes = (x.cantes || 0) + (v.stats.cantes || 0); },
            html: `<p class="gu-final">${[v.mySide, 1 - v.mySide].map(sd => `${sd === v.mySide ? 'Tu pareja' : 'Rivales'}: <b>${mbText(v.score[sd])}</b>`).join(' · ')}</p>`,
            stats: [{ label: 'Tu pareja', value: mbText(v.score[v.mySide]) }, { label: 'Rivales', value: mbText(v.score[1 - v.mySide]) }, { label: 'Tus cantes', value: v.stats.cantes || 0 }] })
    };

    // ── Chinchón ────────────────────────────────────────────
    const CH = R.chinchon;
    function arrangeHand(v) {
        const used = new Set(); const groups = [];
        for (const m of v.melds) { const g = m.slice().sort((a, b) => K.RANKS.indexOf(K.rankOf(a)) - K.RANKS.indexOf(K.rankOf(b))); g.forEach(c => used.add(c)); groups.push(g); }
        const loose = K.sortHand(v.hand.filter(c => !used.has(c)));
        return { groups, loose };
    }
    const chinchon = {
        id: 'chinchon', name: 'Chinchón', title: 'CHINCHÓN', emoji: '🎴', accent: '#22c55e', rules: CH,
        seats: { min: 2, max: 4, default: 2 }, teams: false,
        tagline: 'Roba, combina y cierra antes que nadie. De 2 a 4 jugadores.',
        cpuText: 'De 2 a 4 jugadores con bots', seatsText: 'Mesa de 2 a 4 jugadores.',
        help: [
            'Baraja española de 40 cartas, sin comodines. Cada jugador recibe 7 cartas.',
            'En tu turno <b>robas</b> (del mazo o la carta de arriba del descarte) y <b>descartas</b> una. No puedes tirar la carta que acabas de coger del descarte.',
            'Combina grupos de 3 o 4 cartas del mismo número o escaleras de 3 o más del mismo palo (el 7 enlaza con la sota). La mesa te las ordena sola.',
            'Puedes <b>cerrar</b> al descartar si lo que te queda sin combinar suma 5 o menos. Si cierras con todo combinado te restas 10.',
            'Al cerrar, cada uno suma sus cartas sueltas (figuras 10, el resto lo que marcan). Quien pasa de 100 queda eliminado; gana el último que queda.',
            '¡<b>Chinchón</b>! Siete cartas seguidas del mismo palo: ganas la partida al momento.'],
        center: (v, g) => {
            const myTurn = v.turn === v.me && v.canDraw;
            const deck = `<button type="button" class="cg-pile ${myTurn ? 'can' : ''}" ${myTurn ? act({ type: 'draw', from: 'deck' }) : 'disabled'} aria-label="Robar del mazo">
                <span class="pc back"><i></i></span><small>Mazo · ${v.deck}</small></button>`;
            const disc = `<button type="button" class="cg-pile ${myTurn && v.discardTop ? 'can' : ''}" ${myTurn && v.discardTop ? act({ type: 'draw', from: 'discard' }) : 'disabled'} aria-label="Robar del descarte">
                ${v.discardTop ? cardHtml(v.discardTop) : '<span class="pc empty"></span>'}<small>Descarte</small></button>`;
            let res = '';
            const rr = v.roundResult;
            if (rr) {
                res = `<div class="cg-summary cg-round"><h4>${rr.nulled ? 'Ronda nula' : rr.chinchon ? `¡CHINCHÓN de ${esc(g.pub[rr.closer].name)}!` : `Cierra ${esc(g.pub[rr.closer].name)}`}</h4>
                    ${rr.results.map(r => {
                        const inM = new Set(r.melds.flat());
                        return `<div class="cg-rr ${r.seat === v.me ? 'mine' : ''}"><span class="cg-rr-name">${Nexus.ui.avatar.html(g.pub[r.seat].avatar)} ${esc(g.pub[r.seat].name)}</span>
                        <span class="cg-rr-cards">${r.melds.map(m => `<span class="cg-meld">${m.map(c => cardHtml(c, { cls: 'sm' })).join('')}</span>`).join('')}${r.hand.filter(c => !inM.has(c)).map(c => cardHtml(c, { cls: 'sm loose' })).join('')}</span>
                        <b class="cg-rr-pts">${r.pts > 0 ? '+' : ''}${r.pts}</b></div>`;
                    }).join('')}</div>`;
            }
            return rr ? res : `<div class="cg-piles">${deck}${disc}</div>`;
        },
        handHtml: (v, g) => {
            const { groups, loose } = arrangeHand(v);
            const closing = !!g.ui.close;
            const cls = (c) => {
                const k = [];
                if (c === v.took) k.push('took');
                if (closing) k.push(v.closeWith.includes(c) ? 'playable close' : 'dim');
                else if (v.legal.includes(c)) k.push('playable');
                return k.join(' ');
            };
            return groups.map(m => `<span class="cg-meld">${m.map(c => cardHtml(c, { cls: cls(c) })).join('')}</span>`).join('') +
                (loose.length ? `<span class="cg-loose">${loose.map(c => cardHtml(c, { cls: cls(c) })).join('')}</span>` : '');
        },
        onCard: (v, card, g) => {
            if (v.turn !== v.me) return null;
            if (v.phase === 'draw') { g.bubble('Primero roba del mazo o del descarte'); return null; }
            if (g.ui.close && v.closeWith.includes(card)) return { type: 'discard', card, close: true };
            if (v.legal.includes(card)) return { type: 'discard', card };
            if (card === v.took) g.bubble('No puedes tirar la carta que acabas de coger del descarte');
            return null;
        },
        extraButtons: (v, g) => {
            const out = [];
            if (v.turn === v.me && v.phase === 'discard') {
                if (v.closeWith.length) out.push(`<button class="btn ${g.ui.close ? 'btn-primary btn-glow' : 'btn-ghost'}" type="button" data-ui="close">${g.ui.close ? '🔒 Elige la carta con la que cierras' : '🔒 Cerrar'}</button>`);
                out.push(`<span class="cg-tip">Toca una carta para descartarla · sueltas: <b>${v.dead}</b></span>`);
            } else if (v.turn === v.me) out.push('<span class="cg-tip">Roba del mazo o del descarte</span>');
            return out;
        },
        seatBadge: (v, i) => (v.players[i].active ? `${v.players[i].score} puntos` : 'Eliminado'),
        scoreHtml: (v, g) => `<div class="cg-ch-scores">${v.players.map((p, i) => `
            <div class="cg-ch-row ${i === v.me ? 'mine' : ''} ${p.active ? '' : 'out'}"><span>${Nexus.ui.avatar.html(g.pub[i].avatar)} ${esc(g.pub[i].name)}</span><b>${p.score}</b>
            <span class="cg-bar"><i style="width:${Math.min(100, Math.max(0, p.score))}%"></i></span></div>`).join('')}</div>
            <small class="cg-note">Ronda ${v.round}. Quien pasa de ${v.limit} queda eliminado.</small>`,
        pill: (v) => `${v.scores[v.me]} / ${v.limit}`,
        result: (v) => {
            const s = v.stats;
            return { won: iWon(v), draw: false, score: (iWon(v) ? 500 : 0) + Math.max(0, v.limit - v.scores[v.me]) * 5 + (s.chinchon ? 1000 : 0),
                extra: { finalScore: v.scores[v.me] },
                updateExtra: (x) => { x.closes = (x.closes || 0) + s.closes; x.minus10 = (x.minus10 || 0) + s.minus10; },
                stats: [{ label: 'Tus puntos', value: v.scores[v.me] }, { label: 'Cierres', value: s.closes }, { label: 'Rondas', value: v.round }] };
        }
    };

    // ── Registro y logros ───────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c, g) => (c.event && c.event.game === g ? c.event : null);
    const onlineWins = (g) => (c) => ((c.stats(g).byMode || {}).online || {}).wins || 0;
    A.register([
        { id: 'br_first', game: 'brisca', name: 'Primera brisca', desc: 'Gana una partida de Brisca.', icon: '🂡', rarity: 'common', test: (c) => { const e = ev(c, 'brisca'); return !!e && e.won; } },
        { id: 'br_90', game: 'brisca', name: 'Paliza', desc: 'Gana una Brisca con 90 puntos o más.', icon: '💪', rarity: 'rare', test: (c) => { const e = ev(c, 'brisca'); return !!e && e.won && e.extra.pts >= 90; } },
        { id: 'br_swap', game: 'brisca', name: 'Cambiazo', desc: 'Cambia el siete por la muestra.', icon: '🔄', rarity: 'common', test: (c) => { const e = ev(c, 'brisca'); return !!e && e.extra.swaps > 0; } },
        { id: 'br_online', game: 'brisca', name: 'Brisca en la red', desc: 'Gana una Brisca online.', icon: '🌐', rarity: 'rare', test: (c) => { const e = ev(c, 'brisca'); return !!e && e.won && e.extra.online; } },
        { id: 'br_online10', game: 'brisca', name: 'Rey del casino', desc: 'Gana 10 Briscas online.', icon: '🥇', rarity: 'epic', ...A.counter(onlineWins('brisca'), 10) },
        { id: 'gu_first', game: 'guinote', name: 'Buena pareja', desc: 'Gana una partida de Guiñote.', icon: '🃏', rarity: 'common', test: (c) => { const e = ev(c, 'guinote'); return !!e && e.won; } },
        { id: 'gu_40', game: 'guinote', name: '¡Las cuarenta!', desc: 'Canta las 40 en el Guiñote.', icon: '🎵', rarity: 'rare', test: (c) => { const e = ev(c, 'guinote'); return !!e && e.extra.sang40; } },
        { id: 'gu_cantes', game: 'guinote', name: 'Tenor de casino', desc: 'Haz 15 cantes en total.', icon: '🎤', rarity: 'epic', ...A.counter((c) => c.stats('guinote').extra.cantes || 0, 15) },
        { id: 'gu_online', game: 'guinote', name: 'Mesa completa', desc: 'Gana un Guiñote online.', icon: '🌐', rarity: 'rare', test: (c) => { const e = ev(c, 'guinote'); return !!e && e.won && e.extra.online; } },
        { id: 'gu_online10', game: 'guinote', name: 'Pareja de oro', desc: 'Gana 10 Guiñotes online.', icon: '🥇', rarity: 'epic', ...A.counter(onlineWins('guinote'), 10) },
        { id: 'ch_first', game: 'chinchon', name: 'Último en pie', desc: 'Gana una partida de Chinchón.', icon: '🎴', rarity: 'common', test: (c) => { const e = ev(c, 'chinchon'); return !!e && e.won; } },
        { id: 'ch_4', game: 'chinchon', name: 'Mesa llena', desc: 'Gana un Chinchón de 4 jugadores.', icon: '👑', rarity: 'rare', test: (c) => { const e = ev(c, 'chinchon'); return !!e && e.won && e.extra.players === 4; } },
        { id: 'ch_minus10', game: 'chinchon', name: 'Menos diez', desc: 'Cierra con todas las cartas combinadas.', icon: '➖', rarity: 'rare', test: (c) => { const e = ev(c, 'chinchon'); return !!e && e.extra.minus10 > 0; } },
        { id: 'ch_chinchon', game: 'chinchon', name: '¡Chinchón!', desc: 'Consigue siete cartas seguidas del mismo palo.', icon: '🌈', rarity: 'legendary', test: (c) => { const e = ev(c, 'chinchon'); return !!e && e.extra.chinchon; } },
        { id: 'ch_online', game: 'chinchon', name: 'Chinchón conectado', desc: 'Gana un Chinchón online.', icon: '🌐', rarity: 'rare', test: (c) => { const e = ev(c, 'chinchon'); return !!e && e.won && e.extra.online; } },
        { id: 'ch_online10', game: 'chinchon', name: 'Leyenda del bar', desc: 'Gana 10 Chinchones online.', icon: '🥇', rarity: 'epic', ...A.counter(onlineWins('chinchon'), 10) }
    ]);

    const META = {
        brisca: { tagline: 'Contra la máquina · Online 1 contra 1', tags: ['Cartas', 'Multijugador'],
            description: 'La Brisca de toda la vida con baraja española: mano a mano, triunfo por la muestra y gana quien pase de 60. Contra un bot o contra otra persona online.' },
        guinote: { tagline: 'Contra la máquina · Online 2 contra 2', tags: ['Cartas', 'Multijugador'],
            description: 'El Guiñote aragonés en dos parejas: cantes de 20 y 40, cambio del siete, arrastre y vueltas hasta 101. Los asientos que falten los ocupan bots.' },
        chinchon: { tagline: 'Contra la máquina · Online de 2 a 4', tags: ['Cartas', 'Multijugador'],
            description: 'Roba, descarta y forma grupos y escaleras. Cierra con 5 o menos, réstate 10 con todo ligado y, si sumas más de 100, fuera. ¡Y si haces chinchón, ganas!' }
    };
    for (const spec of [brisca, guinote, chinchon]) {
        Nexus.games.registry.register({
            id: spec.id, name: spec.name, emoji: spec.emoji, accent: spec.accent,
            tagline: META[spec.id].tagline, description: META[spec.id].description, tags: META[spec.id].tags,
            modes: [{ id: 'cpu', label: 'Contra la máquina' }, { id: 'online', label: 'Online' }],
            metrics: [{ id: 'wins', label: 'Victorias' }, { id: 'score', label: 'Puntuación' }],
            mount: (root) => new CardTableGame(root, spec)
        });
    }
})();
