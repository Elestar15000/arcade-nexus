/* ============================================================
   NEXUS ARCADE · games/cardgames/games-more.js
   Póker Texas Hold'em (baraja francesa) y Mentiroso (baraja
   española) sobre la mesa común de table.js: contra bots o
   online de 2 a 4 jugadores.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber } = Nexus.util;
    const K = Nexus.games.cardCore;
    const R = Nexus.games.cardRules;
    const { cardHtml, CardTableGame } = Nexus.games.cards;
    const act = (a) => `data-act='${esc(JSON.stringify(a))}'`;
    const iWon = (v) => !!v.over && v.over.winners.includes(v.me);
    const nm = (g, i) => esc((g.pub[i] || {}).name || `Jugador ${i + 1}`);

    // ── Póker ───────────────────────────────────────────────
    const PK = R.poker;
    const STREET = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' };
    /** Resumen de la calle en curso: «Ana sube a 60 · Bot iguala · Eva se retira». */
    const ACT = { fold: 'se retira', check: 'pasa', call: 'iguala', raise: 'sube a' };
    function streetLine(v, g) {
        const L = v.streetLog && v.streetLog.length ? v.streetLog : null;
        if (!L) return '';
        return `<div class="pk-line">${L.slice(-6).map(x => `<span><b>${nm(g, x.s)}</b> ${x.allin && x.t !== 'fold' && x.t !== 'check' ? 'all-in' : ACT[x.t]}${x.t === 'raise' ? ' ' + formatNumber(x.to) : ''}</span>`).join(' · ')}</div>`;
    }
    const poker = {
        id: 'poker', name: 'Póker', title: 'PÓKER', emoji: '♠️', accent: '#10b981', rules: PK,
        seats: { min: 2, max: 6, default: 6 }, teams: false,
        tagline: 'Texas Hold\'em sin límite: farolea, sube y llévate todas las fichas.',
        cpuText: 'De 2 a 6 jugadores con bots', seatsText: 'Mesa de 2 a 6 jugadores.',
        help: [
            '<b>Texas Hold\'em</b> con baraja francesa, de 2 a 6 jugadores. Todos empiezan con 1000 fichas; las ciegas (10/20) suben cada 6 manos (⚙️: torneo lento, cada 12, o ciegas fijas).',
            'Recibes <b>2 cartas</b> tuyas. En la mesa salen 3 (<b>flop</b>), luego 1 (<b>turn</b>) y 1 más (<b>river</b>). Tu jugada es la mejor de 5 entre tus 2 y las 5 de la mesa.',
            'En cada ronda puedes <b>pasar</b> (si nadie ha apostado), <b>igualar</b>, <b>subir</b> cualquier cantidad con la barra (como mínimo lo que subió el último) o ir <b>all-in</b>; o <b>retirarte</b>.',
            'En el <b>showdown</b> enseña primero el último que subió y luego en orden; quien no puede ganar a lo ya enseñado tira sus cartas sin mostrarlas (⚙️ «Tirar la mano perdedora»).',
            'Jugadas de menor a mayor: carta alta, pareja, doble pareja, trío, escalera, color, full, póker y escalera de color.',
            'Con all-in se forman <b>botes secundarios</b>: cada uno sólo puede ganar lo que ha podido cubrir. Los empates se reparten.',
            'Quien se queda sin fichas queda eliminado. Gana quien se lleva todas.'],
        center: (v, g) => {
            const slots = Array.from({ length: 5 }, (_, i) => v.board[i] ? cardHtml(v.board[i], { cls: 'pk-bc' + (g.ui.lastBoard && i >= g.ui.lastBoard ? ' deal' : '') }) : '<span class="pc empty pk-bc"></span>').join('');
            const sd = v.showdown;
            let res = '';
            if (sd && v.phase !== 'bet') {
                // Resultado compacto: las cartas enseñadas ya se ven en cada asiento
                res = sd.uncontested
                    ? `<div class="pk-result"><b>🏆 ${nm(g, sd.winners[0])}</b> se lleva ${formatNumber(sd.amounts[sd.winners[0]])}: los demás se retiran.</div>`
                    : `<div class="pk-result">${sd.pots.map((pt, k) => `<div>${sd.pots.length > 1 ? `<small>${k === 0 ? 'Bote principal' : 'Bote secundario'}</small> ` : ''}<b>🏆 ${pt.winners.map(i => nm(g, i)).join(' y ')}</b> gana${pt.winners.length > 1 ? 'n' : ''} ${formatNumber(pt.amount)} · ${esc(pt.name)}</div>`).join('')}
                        <ul>${sd.results.filter(r => !sd.winners.includes(r.seat)).map(r => `<li>${nm(g, r.seat)}: ${esc(r.name)}</li>`).join('')}</ul></div>`;
            }
            return `<div class="pk-center">
                <div class="pk-street">${esc(STREET[v.street] || '')} · Mano ${v.handNo} · ciegas ${v.sb}/${v.bb}</div>
                <div class="pk-board">${slots}</div>
                <div class="pk-pot"><span class="pk-chip" aria-hidden="true"></span> Bote <b>${formatNumber(v.pot)}</b></div>
                ${streetLine(v, g)}${res}</div>`;
        },
        handHtml: (v) => (v.hand.length ? v.hand.map(c => cardHtml(c, { cls: 'pk-hole' })).join('') + (v.myHand ? `<span class="pk-mine">${esc(v.myHand)}</span>` : '')
            : '<span class="cg-tip">Te has quedado sin fichas</span>'),
        onCard: () => null,
        extraButtons: (v) => (v.turn === v.me ? [
            // Apuesta libre: barra + campo numérico (± una ciega grande) entre el mínimo y el all-in
            v.raise ? `<span class="pk-raise" data-step="${v.bb}"><button type="button" class="btn btn-ghost btn-sm" data-pk="-">−</button>
                <input type="range" min="${v.raise.min}" max="${v.raise.max}" step="${v.raise.step}" value="${v.raise.min}" data-pk="range" aria-label="Cantidad de la subida">
                <input type="number" min="${v.raise.min}" max="${v.raise.max}" step="${v.raise.step}" value="${v.raise.min}" data-pk="num" aria-label="Subir a">
                <button type="button" class="btn btn-ghost btn-sm" data-pk="+">+</button>
                <button type="button" class="btn btn-primary btn-sm" data-pk="go" data-act='${esc(JSON.stringify({ type: 'raise', to: v.raise.min }))}'>⬆️ ${v.curBet ? 'Subir a' : 'Apostar'} <b>${v.raise.min}</b></button></span>` : '',
            `<span class="cg-tip">${v.toCall ? `Para seguir: <b>${v.toCall}</b>` : 'Nadie ha apostado'} · bote ${formatNumber(v.pot)}</span>`] : []),
        seatBadge: (v, i) => {
            const p = v.players[i];
            if (!p.active) return 'Eliminado';
            const tags = [];
            if (i === v.dealer) tags.push('<span class="pk-btn" title="Botón">D</span>');
            if (v.handNo && i === v.sbSeat && v.street === 'preflop') tags.push(`<span class="pk-tag" title="Ciega pequeña: ${v.sb}">Ciega peq.</span>`);
            if (v.handNo && i === v.bbSeat && v.street === 'preflop') tags.push(`<span class="pk-tag" title="Ciega grande: ${v.bb}">Ciega gr.</span>`);
            const st = p.folded ? ' · retirado' : p.allin ? ' · <b>all-in</b>' : '';
            const chip = p.bet ? ` <span class="pk-bet" title="Apuesta en esta calle"><i></i>${formatNumber(p.bet)}</span>` : '';
            const cards = p.cards && i !== v.me ? ` <span class="pk-show">${p.cards.map(c => cardHtml(c, { cls: 'xs' })).join('')}</span>` : '';
            const mucked = v.showdown && v.showdown.mucked && v.showdown.mucked.includes(i) ? ' · <i>tira sin enseñar</i>' : '';
            return `${tags.join('')}🪙 ${formatNumber(p.chips)}${st}${chip}${mucked}${cards}`;
        },
        scoreHtml: (v, g) => `<div class="cg-ch-scores">${v.players.map((p, i) => [p, i]).sort((a, b) => b[0].chips - a[0].chips).map(([p, i]) => `
            <div class="cg-ch-row ${i === v.me ? 'mine' : ''} ${p.active ? '' : 'out'}"><span>${Nexus.ui.avatar.html(g.pub[i].avatar)} ${nm(g, i)}</span><b>${formatNumber(p.chips)}</b>
            <span class="cg-bar"><i style="width:${Math.min(100, p.chips / (PK.START * v.n) * 100)}%"></i></span></div>`).join('')}</div>
            <small class="cg-note">Ciegas ${v.sb}/${v.bb} · ${v.fixedBlinds ? 'fijas' : `suben en ${v.nextLevelIn} mano${v.nextLevelIn === 1 ? '' : 's'}`}.</small>`,
        pill: (v) => `${formatNumber(v.players[v.me].chips)} 🪙`,
        sounds: (p, v, g) => {
            if (v.board.length > p.board.length) { g.ui.lastBoard = p.board.length; Nexus.audio.play('flip'); }
            else if (v.handNo !== p.handNo) g.ui.lastBoard = 0;
            if (v.showdown && !p.showdown) {
                const won = v.showdown.amounts[v.me] > 0;
                Nexus.audio.play(won ? 'orbCollect' : 'flip');
                if (v.showdown.uncontested) g.bubble(`${g.pub[v.showdown.winners[0]].name} se lleva el bote`, v.showdown.winners[0]);
            }
            const last = v.log[v.log.length - 1];
            if (last && last !== p.log[p.log.length - 1] && /sube|all-in/.test(last)) Nexus.audio.play('click');
        },
        result: (v) => {
            const place = v.over.ranking.indexOf(v.me) + 1, chips = v.over.chips[v.me];
            return { won: iWon(v), draw: false, score: chips + (v.n - place) * 500, extra: { place, chips },
                updateExtra: (x) => { x.handsWon = (x.handsWon || 0) + v.stats.handsWon; x.bluffs = (x.bluffs || 0) + v.stats.bluffWins; },
                stats: [{ label: 'Puesto', value: `${place}º de ${v.n}` }, { label: 'Fichas', value: formatNumber(chips) }, { label: 'Manos ganadas', value: v.stats.handsWon }, { label: 'Mayor bote', value: formatNumber(v.stats.biggestPot) }] };
        }
    };

    // ── Mentiroso ───────────────────────────────────────────
    const MT = R.mentiroso;
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const selOf = (v, g) => (g.ui.sel || []).filter(c => v.hand.includes(c));
    const mentiroso = {
        id: 'mentiroso', name: 'Mentiroso', title: 'MENTIROSO', emoji: '🤥', accent: '#8b5cf6', rules: MT,
        seats: { min: 2, max: 4, default: 4 }, teams: false,
        tagline: 'Echa cartas boca abajo, di lo que quieras… y pilla al que miente.',
        cpuText: 'De 2 a 4 jugadores con bots', seatsText: 'Mesa de 2 a 4 jugadores.',
        help: [
            'Baraja española de 40 cartas repartida entera (mano a mano, 12 cartas cada uno y el resto queda fuera: se juega mejor con 3 o 4). Si tienes las 4 de un número, se descartan solas.',
            'Quien abre la ronda pone de 1 a 4 cartas <b>boca abajo</b> y dice un número. Los demás, por turno, tienen que poner cartas diciendo <b>ese mismo número</b>… sea verdad o no.',
            'En tu turno, antes de jugar, puedes gritar <b>¡Mentiroso!</b>: se levantan las últimas cartas. Si alguna no era del número dicho, el mentiroso se lleva todo el montón; si eran verdad, te lo llevas tú.',
            'Empieza la ronda siguiente quien no se llevó el montón. También puedes <b>pasar</b>: si todos pasan, el montón se retira y abre quien jugó lo último.',
            'Gana el primero que se queda sin cartas… si nadie le pilla la última mentira.',
            'Tras cada jugada hay unos segundos en los que <b>cualquiera</b> puede gritar ¡Mentiroso! (gana quien pulsa primero), no sólo el siguiente.',
            'No se puede abrir con un número <b>muerto</b> (sus cuatro cartas ya están fuera). Tus cartas que dicen la verdad salen resaltadas.',
            'Variantes (⚙️ del anfitrión): <b>mismo número</b> toda la ronda, <b>mismo o siguiente</b>, o <b>ascendente</b> (cada jugada, el número siguiente).',
            'Toca las cartas para elegirlas y usa los botones para jugarlas, acusar o pasar.'],
        center: (v, g) => {
            const rv = v.reveal;
            const pile = v.pileCount ? `<div class="mt-pile" aria-label="${v.pileCount} cartas en el montón">${Array.from({ length: Math.min(v.pileCount, 12) }, (_, i) => `<span class="pc back" style="--i:${i}"><i></i></span>`).join('')}<b>${v.pileCount}</b></div>`
                : '<div class="mt-pile empty"><span class="pc empty"></span></div>';
            const claim = v.rank !== null && v.rank !== undefined
                ? `<div class="mt-claim">Se dicen <b>${esc(cap(MT.PLURAL[v.rank]))}</b></div>` : `<div class="mt-claim">${v.turn !== null && v.turn !== undefined ? `Abre ${v.turn === v.me ? '<b>tú</b>' : nm(g, v.turn)}` : ''}</div>`;
            const last = v.last && !rv ? `<div class="mt-last">${v.last.seat === v.me ? 'Has puesto' : nm(g, v.last.seat) + ' pone'} <b>${esc(MT.claimText(v.last.count, v.last.rank))}</b></div>` : '';
            const warn = v.pendingWin !== null && v.pendingWin !== undefined && !rv ? `<div class="mt-warn">⚠️ ¡${v.pendingWin === v.me ? 'Te has' : nm(g, v.pendingWin) + ' se ha'} quedado sin cartas!${v.pendingWin === v.me ? ' Si nadie te acusa, ganas.' : ' Si nadie le acusa, gana.'}</div>` : '';
            const reveal = rv ? `<div class="cg-summary mt-reveal ${rv.lie ? 'lie' : 'truth'}">
                <h4>${rv.lie ? '🤥 ¡MENTIRA!' : '😇 ¡Era verdad!'}</h4>
                <p>${nm(g, rv.caller)} acusa a ${nm(g, rv.seat)}, que decía ${esc(MT.claimText(rv.cards.length, rv.rank))}:</p>
                <div class="mt-cards">${rv.cards.map(c => cardHtml(c, { cls: 'sm ' + (K.rankOf(c) === rv.rank ? 'ok' : 'bad') })).join('')}</div>
                <p>${rv.taker === v.me ? '<b>Te llevas</b>' : `<b>${nm(g, rv.taker)}</b> se lleva`} ${rv.count} carta${rv.count === 1 ? '' : 's'}.${rv.dropped && rv.dropped.length ? ` Junta los cuatro ${rv.dropped.map(r => MT.PLURAL[r]).join(' y ')} y los descarta.` : ''}</p></div>` : '';
            const dead = v.dead.length ? `<div class="mt-dead">Muertos: ${v.dead.map(r => `<span>${esc(cap(MT.PLURAL[r]))}</span>`).join('')}</div>` : '';
            // Línea de jugadas de la ronda: «Pepa 1 · Paco 2 · Antonio 1»
            const line = v.plays && v.plays.length ? `<div class="mt-line">${v.plays.slice(-8).map(p => `<span><b>${nm(g, p.seat)}</b> ${p.count}</span>`).join(' · ')}</div>` : '';
            const win = v.window && !rv ? `<div class="mt-window">⏳ Se puede acusar…</div>` : '';
            return rv ? `<div class="mt-center">${reveal}</div>` : `<div class="mt-center">${claim}${pile}${line}${last}${warn}${win}${dead}</div>`;
        },
        handHtml: (v, g) => {
            const sel = selOf(v, g), my = v.turn === v.me;
            // Cartas que «dicen la verdad» para el número (o números) que se pueden decir ahora
            const truth = my && !v.mustOpen ? new Set(v.allowed && v.allowed.length ? v.allowed : [v.rank]) : null;
            const groups = [];
            for (const c of v.hand) { const r = K.rankOf(c); const last = groups[groups.length - 1]; if (last && last.r === r) last.cs.push(c); else groups.push({ r, cs: [c] }); }
            return groups.map(gr => `<span class="cg-meld mt-group">${gr.cs.map(c => cardHtml(c, { cls: (my ? 'playable' : '') + (sel.includes(c) ? ' sel' : '') + (truth && truth.has(K.rankOf(c)) ? ' truth' : '') })).join('')}</span>`).join('') || '<span class="cg-tip">Sin cartas</span>';
        },
        onCard: (v, card, g) => {
            if (v.turn !== v.me) { g.bubble('Espera tu turno'); return null; }
            const sel = selOf(v, g);
            if (sel.includes(card)) g.ui.sel = sel.filter(c => c !== card);
            else if (sel.length >= 4) { g.bubble('Como mucho 4 cartas'); return null; }
            else g.ui.sel = sel.concat([card]);
            Nexus.audio.play('click');
            g.render();
            return null;
        },
        extraButtons: (v, g) => {
            // Ventana de acusación: cualquiera (no sólo el siguiente) puede gritar
            if (v.turn !== v.me) return v.window && v.canCall ? [`<button class="btn btn-danger mt-call" type="button" ${act({ type: 'call' })}>🗣️ ¡Mentiroso!</button>`] : [];
            const sel = selOf(v, g), out = [];
            const lies = (r) => sel.some(c => K.rankOf(c) !== r);
            if (v.mustOpen) {
                out.push(`<span class="cg-tip">${sel.length ? `Pon ${sel.length} carta${sel.length === 1 ? '' : 's'} diciendo…` : 'Elige de 1 a 4 cartas y di un número'}</span>`);
                out.push(`<span class="mt-ranks">${K.RANKS.filter(r => !v.dead.includes(r)).map(r => `<button class="btn btn-sm ${sel.length ? 'btn-primary' : 'btn-ghost'}${sel.length && lies(r) ? ' mt-lie' : ''}" type="button" ${sel.length ? act({ type: 'play', cards: sel, rank: r }) : 'disabled'} title="${esc(cap(MT.PLURAL[r]))}${sel.length && lies(r) ? ' · vas a mentir' : ''}">${esc(cap(MT.PLURAL[r]))}</button>`).join('')}</span>`);
                return out;
            }
            if (v.canCall) out.push(`<button class="btn btn-danger mt-call" type="button" ${act({ type: 'call' })}>🗣️ ¡Mentiroso!</button>`);
            const ranks = v.allowed && v.allowed.length ? v.allowed : [v.rank];
            for (const r of ranks) out.push(`<button class="btn ${sel.length ? 'btn-primary' : 'btn-ghost'}${sel.length && lies(r) ? ' mt-lie' : ''}" type="button" ${sel.length ? act({ type: 'play', cards: sel, rank: r }) : 'disabled'}>🂠 Poner ${sel.length || ''} como ${esc(MT.PLURAL[r])}${sel.length && lies(r) ? ' <small>(vas a mentir)</small>' : ''}</button>`);
            if (v.canPass) out.push(`<button class="btn btn-ghost" type="button" ${act({ type: 'pass' })}>⏭️ Pasar</button>`);
            if (!sel.length) out.push('<span class="cg-tip">Toca cartas para elegirlas</span>');
            return out;
        },
        seatBadge: (v, i) => `${v.players[i].count} carta${v.players[i].count === 1 ? '' : 's'}${v.pendingWin === i ? ' · ¡sin cartas!' : ''}`,
        scoreHtml: (v, g) => `<div class="cg-ch-scores">${v.players.map((p, i) => [p, i]).sort((a, b) => a[0].count - b[0].count).map(([p, i]) => `
            <div class="cg-ch-row ${i === v.me ? 'mine' : ''}"><span>${Nexus.ui.avatar.html(g.pub[i].avatar)} ${nm(g, i)}</span><b>${p.count}</b>
            <span class="cg-bar"><i style="width:${Math.min(100, p.count / 40 * 100 * v.n / 2)}%"></i></span></div>`).join('')}</div>
            <small class="cg-note">Ronda ${v.round} · montón ${v.pileCount} · retiradas ${v.discarded}. Tus acusaciones: ${v.stats.goodCalls}/${v.stats.calls} acertadas.</small>`,
        pill: (v) => `${v.hand.length} cartas`,
        sounds: (p, v, g) => {
            if (v.reveal && !p.reveal) {
                Nexus.audio.play(v.reveal.lie ? 'achievement' : 'error');
                g.bubble(`${g.pub[v.reveal.caller].name}: ¡Mentiroso!`, v.reveal.caller);
            } else if (v.pileCount > p.pileCount) Nexus.audio.play('chessMove');
            if (v.turn !== p.turn || v.hand.length !== p.hand.length) g.ui.sel = selOf(v, g);
        },
        result: (v) => {
            const left = v.hand.length, place = v.over.ranking.indexOf(v.me) + 1;
            return { won: iWon(v), draw: false, score: (iWon(v) ? 600 : 0) + Math.max(0, 300 - left * 12) + v.stats.goodCalls * 40, extra: { place, left },
                updateExtra: (x) => { x.goodCalls = (x.goodCalls || 0) + v.stats.goodCalls; x.lies = (x.lies || 0) + v.stats.lies; },
                stats: [{ label: 'Puesto', value: `${place}º de ${v.n}` }, { label: 'Cartas en la mano', value: left }, { label: 'Mentiras pilladas', value: v.stats.goodCalls }, { label: 'Te pillaron', value: v.stats.caught }] };
        }
    };

    // ── Registro y logros ───────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c, g) => (c.event && c.event.game === g ? c.event : null);
    const onlineWins = (g) => (c) => ((c.stats(g).byMode || {}).online || {}).wins || 0;
    A.register([
        { id: 'pk_first', game: 'poker', name: 'Primera mesa', desc: 'Gana una partida de Póker.', icon: '♠️', rarity: 'common', test: (c) => { const e = ev(c, 'poker'); return !!e && e.won; } },
        { id: 'pk_full', game: 'poker', name: 'Mano de lujo', desc: 'Llega al showdown con un full o mejor.', icon: '🏠', rarity: 'rare', test: (c) => { const e = ev(c, 'poker'); return !!e && e.extra.bestCat >= 6; } },
        { id: 'pk_quads', game: 'poker', name: 'Cuatro iguales', desc: 'Enseña un póker o una escalera de color.', icon: '💎', rarity: 'epic', test: (c) => { const e = ev(c, 'poker'); return !!e && e.extra.bestCat >= 7; } },
        { id: 'pk_bluff', game: 'poker', name: 'Cara de póker', desc: 'Gana un bote de farol: todos se retiran y tú no tenías nada.', icon: '😐', rarity: 'rare', test: (c) => { const e = ev(c, 'poker'); return !!e && e.extra.bluffWins > 0; } },
        { id: 'pk_allin', game: 'poker', name: 'Todo o nada', desc: 'Gana un bote yendo all-in.', icon: '💥', rarity: 'common', test: (c) => { const e = ev(c, 'poker'); return !!e && e.extra.allinWins > 0; } },
        { id: 'pk_online', game: 'poker', name: 'Tahúr en la red', desc: 'Gana una partida de Póker online.', icon: '🌐', rarity: 'rare', test: (c) => { const e = ev(c, 'poker'); return !!e && e.won && e.extra.online; } },
        { id: 'pk_online10', game: 'poker', name: 'Leyenda del casino', desc: 'Gana 10 partidas de Póker online.', icon: '🥇', rarity: 'epic', ...A.counter(onlineWins('poker'), 10) },
        { id: 'mt_first', game: 'mentiroso', name: 'Sin cartas', desc: 'Gana una partida de Mentiroso.', icon: '🤥', rarity: 'common', test: (c) => { const e = ev(c, 'mentiroso'); return !!e && e.won; } },
        { id: 'mt_bluff', game: 'mentiroso', name: 'Farol final', desc: 'Gana con una última jugada que era mentira.', icon: '🎭', rarity: 'rare', test: (c) => { const e = ev(c, 'mentiroso'); return !!e && e.won && e.extra.bluffWin; } },
        { id: 'mt_catch', game: 'mentiroso', name: 'Detector de mentiras', desc: 'Pilla 25 mentiras en total.', icon: '🕵️', rarity: 'epic', ...A.counter((c) => c.stats('mentiroso').extra.goodCalls || 0, 25) },
        { id: 'mt_clean', game: 'mentiroso', name: 'Honrado', desc: 'Gana sin que te pillen ni una vez.', icon: '😇', rarity: 'rare', test: (c) => { const e = ev(c, 'mentiroso'); return !!e && e.won && e.extra.caught === 0; } },
        { id: 'mt_online', game: 'mentiroso', name: 'Mentiroso conectado', desc: 'Gana un Mentiroso online.', icon: '🌐', rarity: 'rare', test: (c) => { const e = ev(c, 'mentiroso'); return !!e && e.won && e.extra.online; } },
        { id: 'mt_online10', game: 'mentiroso', name: 'Pinocho', desc: 'Gana 10 Mentirosos online.', icon: '🥇', rarity: 'epic', ...A.counter(onlineWins('mentiroso'), 10) }
    ]);

    const META = {
        poker: { tagline: 'Contra la máquina · Online de 2 a 4', tags: ['Cartas', 'Multijugador'],
            description: 'Texas Hold\'em sin límite con baraja francesa: ciegas que suben, all-in con botes secundarios y bots que farolean. Gana quien se queda con todas las fichas.' },
        mentiroso: { tagline: 'Contra la máquina · Online de 2 a 4', tags: ['Cartas', 'Multijugador'],
            description: 'Echa cartas boca abajo diciendo un número, aunque no sea verdad, y grita «¡Mentiroso!» cuando no te lo creas. Gana el primero que se queda sin cartas.' }
    };
    for (const spec of [poker, mentiroso]) {
        Nexus.games.registry.register({
            id: spec.id, name: spec.name, emoji: spec.emoji, accent: spec.accent,
            tagline: META[spec.id].tagline, description: META[spec.id].description, tags: META[spec.id].tags,
            modes: [{ id: 'cpu', label: 'Contra la máquina' }, { id: 'online', label: 'Online' }],
            metrics: [{ id: 'wins', label: 'Victorias' }, { id: 'score', label: 'Puntuación' }],
            mount: (root) => new CardTableGame(root, spec)
        });
    }
})();
