/* ============================================================
   NEXUS ARCADE · games/minesweeper/game.js
   Buscaminas Quantum: buscaminas con poderes, orbes y combos.
   Adaptado a Nexus Arcade: se monta en un contenedor, usa el
   audio/modal/progreso compartidos y registra sus logros.
   Correcciones respecto a la versión original:
     · el Escudo es pasivo (antes su botón no hacía nada útil),
     · una mina desactivada ya no cuenta como casilla segura,
     · no se pueden usar poderes antes de la primera casilla,
     · un "acorde" no sigue revelando tras explotar,
     · barajado Fisher-Yates y tablero que se ajusta a la pantalla,
     · pulsación larga / modo bandera para pantallas táctiles.
   ============================================================ */
(function () {
    'use strict';

    class MinesweeperGame {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.cleanups = [];
            this.buildTemplate();
            // ── Difficulty Configs ──
            this.difficulties = {
                easy:      { rows: 9,  cols: 9,  mines: 10,  cellSize: 42 },
                medium:    { rows: 16, cols: 16, mines: 40,  cellSize: 34 },
                hard:      { rows: 16, cols: 30, mines: 99,  cellSize: 28 },
                nightmare: { rows: 20, cols: 30, mines: 145, cellSize: 24 }
            };

            // ── Power Definitions ──
            this.powerDefs = {
                shield:  { icon: '🛡️', name: 'Escudo',        desc: 'Sobrevive a 1 mina',   maxCharges: 1 },
                scanner: { icon: '🔍', name: 'Scanner',       desc: 'Revela área 3×3',      maxCharges: 2 },
                xray:    { icon: '👁️', name: 'Rayos X',       desc: 'Ver minas 3s',         maxCharges: 1 },
                sniper:  { icon: '🎯', name: 'Francotirador', desc: 'Revela celda segura',   maxCharges: 3 },
                emp:     { icon: '⚡',  name: 'EMP',           desc: 'Auto-marca minas',      maxCharges: 1 }
            };

            // ── DOM References ──
            this.boardEl = this.byId('board');
            this.fxCanvas = this.byId('fx-canvas');
            this.fxCtx = this.fxCanvas ? this.fxCanvas.getContext('2d') : null;
            this.powersContainer = this.byId('powers-container');

            // ── State ──
            const def = Nexus.services.settings.get('minesweeper.defaultDifficulty');
            this.currentDifficulty = this.difficulties[def] ? def : 'easy';
            this.board = [];         // 2D: -1 = mine, 0-8 = number
            this.revealed = [];      // 2D: boolean
            this.flagged = [];       // 2D: boolean
            this.orbs = [];          // 2D: boolean (power orbs)
            this.rows = 0;
            this.cols = 0;
            this.mineCount = 0;
            this.cellSize = 36;

            this.gameOver = false;
            this.gameWon = false;
            this.gameStarted = false;
            this.firstClick = true;

            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.comboTimer = null;
            this.cellsRevealed = 0;
            this.totalSafeCells = 0;
            this.flagsPlaced = 0;
            this.powersUsed = 0;
            this.timer = 0;
            this.timerInterval = null;

            this.powers = {};
            this.activePower = null;

            // ── Callbacks (set by app.js) ──
            this.onGameEnd = null;
            this.onScoreUpdate = null;

            // ── Audio & Particles ──
            this.audioCtx = null;
            this.particles = [];
            this.animating = false;

            // ── Initialize ──
            this.bindEvents();
            this.newGame();
            this.updateRecords();
            this.unsubProgress = Nexus.bus.on('progress:update', () => this.updateRecords());
        }

        // ============================================
        // GAME LIFECYCLE
        // ============================================

        newGame(difficulty) {
            if (difficulty) this.currentDifficulty = difficulty;
            const cfg = this.difficulties[this.currentDifficulty];
            this.rows = cfg.rows;
            this.cols = cfg.cols;
            this.mineCount = cfg.mines;
            this.cellSize = cfg.cellSize;

            // Reset state
            this.board = [];
            this.revealed = [];
            this.flagged = [];
            this.orbs = [];
            this.gameOver = false;
            this.gameWon = false;
            this.gameStarted = true;
            this.firstClick = true;
            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.cellsRevealed = 0;
            this.totalSafeCells = this.rows * this.cols - this.mineCount;
            this.flagsPlaced = 0;
            this.powersUsed = 0;
            this.timer = 0;
            this.activePower = null;
            this.stopTimer();
            if (this.comboTimer) clearTimeout(this.comboTimer);

            // Initialize empty board
            for (let r = 0; r < this.rows; r++) {
                this.board[r] = new Array(this.cols).fill(0);
                this.revealed[r] = new Array(this.cols).fill(false);
                this.flagged[r] = new Array(this.cols).fill(false);
                this.orbs[r] = new Array(this.cols).fill(false);
            }

            // Reset powers
            this.powers = {};
            for (const [id, def] of Object.entries(this.powerDefs)) {
                this.powers[id] = { ...def, charges: def.maxCharges };
            }

            // Update difficulty buttons
            this.root.querySelectorAll('.diff-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.diff === this.currentDifficulty);
            });

            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.flagMode = false;
            const fm = this.byId('btn-flag-mode');
            if (fm) fm.classList.remove('active');

            // Render
            this.renderBoard();
            this.renderPowers();
            this.updateDisplays();
            this.updateComboDisplay();
            this.resizeFxCanvas();
            this.fitBoard();
        }

        generateBoard(safeRow, safeCol) {
            // Place mines (not near first click)
            const safeCells = new Set();
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = safeRow + dr, nc = safeCol + dc;
                    if (this.isValid(nr, nc)) safeCells.add(`${nr},${nc}`);
                }
            }

            let placed = 0;
            while (placed < this.mineCount) {
                const r = Math.floor(Math.random() * this.rows);
                const c = Math.floor(Math.random() * this.cols);
                if (this.board[r][c] !== -1 && !safeCells.has(`${r},${c}`)) {
                    this.board[r][c] = -1;
                    placed++;
                }
            }

            // Calculate numbers
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.board[r][c] === -1) continue;
                    let count = 0;
                    for (const [nr, nc] of this.getNeighbors(r, c)) {
                        if (this.board[nr][nc] === -1) count++;
                    }
                    this.board[r][c] = count;
                }
            }

            // Place power orbs (12% of safe cells)
            const safeCellList = [];
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.board[r][c] !== -1 && !(r === safeRow && c === safeCol)) {
                        safeCellList.push([r, c]);
                    }
                }
            }

            const orbCount = Math.floor(safeCellList.length * 0.12);
            const shuffled = Nexus.util.shuffle(safeCellList);
            for (let i = 0; i < orbCount && i < shuffled.length; i++) {
                const [r, c] = shuffled[i];
                this.orbs[r][c] = true;
            }
        }

        // ============================================
        // CELL INTERACTIONS
        // ============================================

        handleCellClick(row, col) {
            if (this.gameOver) return;
            if (this.flagged[row][col]) return;

            // Modo bandera (táctil): el toque coloca/quita bandera
            if (this.flagMode && !this.revealed[row][col]) {
                this.handleCellRightClick(row, col);
                return;
            }

            // Power interactions
            if (this.activePower) {
                this.usePower(this.activePower, row, col);
                return;
            }

            // Already revealed -> chord click
            if (this.revealed[row][col]) {
                this.chordClick(row, col);
                return;
            }

            // First click: generate board
            if (this.firstClick) {
                this.generateBoard(row, col);
                this.firstClick = false;
                this.startTimer();
            }

            this.revealCell(row, col);
        }

        handleCellRightClick(row, col) {
            if (this.gameOver) return;
            if (this.revealed[row][col]) return;
            if (this.firstClick) return; // Can't flag before first click

            this.flagCell(row, col);
        }

        revealCell(row, col) {
            if (!this.isValid(row, col)) return;
            if (this.gameOver) return; // p. ej. un "acorde" que sigue tras explotar
            if (this.revealed[row][col] || this.flagged[row][col]) return;

            const value = this.board[row][col];

            // Hit a mine
            if (value === -1) {
                // Check shield
                if (this.powers.shield.charges > 0) {
                    this.powers.shield.charges--;
                    this.powersUsed++;
                    // La mina desactivada se marca como revelada pero NO cuenta como casilla
                    // segura (antes inflaba el contador y permitía ganar una casilla antes).
                    this.revealed[row][col] = true;

                    const cellEl = this.getCellElement(row, col);
                    if (cellEl) {
                        cellEl.classList.add('revealed', 'defused');
                        cellEl.textContent = '💣';
                        cellEl.setAttribute('data-number', '');
                    }

                    this.playSound('powerUse');
                    this.spawnPowerUse(row, col, '#6c5ce7');
                    this.renderPowers();
                    this.addScore(10, true);
                    this.incrementCombo();
                    this.updateDisplays();

                    // Recalculate: this mine is now "revealed safely"
                    // Don't count it as a safe cell for win condition
                    return;
                }

                // Game over
                this.revealed[row][col] = true;
                const cellEl = this.getCellElement(row, col);
                if (cellEl) {
                    cellEl.classList.add('revealed', 'mine', 'mine-hit');
                    cellEl.textContent = '💣';
                }
                this.playSound('explosion');
                this.spawnExplosion(row, col);
                this.endGame(false);
                return;
            }

            // Safe cell
            this.revealed[row][col] = true;
            this.cellsRevealed++;

            const cellEl = this.getCellElement(row, col);
            if (cellEl) {
                cellEl.classList.add('revealed');
                if (value > 0) {
                    cellEl.textContent = value;
                    cellEl.setAttribute('data-number', value);
                } else {
                    cellEl.textContent = '';
                }
            }

            this.playSound('reveal');
            this.spawnReveal(row, col);

            // Check power orb
            if (this.orbs[row][col]) {
                this.collectOrb(row, col);
            }

            // Scoring & combo
            this.addScore(10, true);
            this.incrementCombo();

            // Flood fill for 0-cells
            if (value === 0) {
                this.floodFill(row, col);
            }

            this.updateDisplays();
            this.checkWin();
        }

        floodFill(startRow, startCol) {
            const queue = [[startRow, startCol]];

            while (queue.length > 0) {
                const [r, c] = queue.shift();

                for (const [nr, nc] of this.getNeighbors(r, c)) {
                    if (this.revealed[nr][nc] || this.flagged[nr][nc]) continue;
                    if (this.board[nr][nc] === -1) continue;

                    this.revealed[nr][nc] = true;
                    this.cellsRevealed++;

                    const cellEl = this.getCellElement(nr, nc);
                    if (cellEl) {
                        cellEl.classList.add('revealed');
                        const val = this.board[nr][nc];
                        if (val > 0) {
                            cellEl.textContent = val;
                            cellEl.setAttribute('data-number', val);
                        } else {
                            cellEl.textContent = '';
                        }
                    }

                    // Check power orb
                    if (this.orbs[nr][nc]) {
                        this.collectOrb(nr, nc);
                    }

                    this.addScore(10, false); // No combo for flood fill

                    if (this.board[nr][nc] === 0) {
                        queue.push([nr, nc]);
                    }
                }
            }
        }

        flagCell(row, col) {
            this.flagged[row][col] = !this.flagged[row][col];
            const cellEl = this.getCellElement(row, col);

            if (this.flagged[row][col]) {
                this.flagsPlaced++;
                if (cellEl) {
                    cellEl.classList.add('flagged');
                    cellEl.textContent = '🚩';
                }
            } else {
                this.flagsPlaced--;
                if (cellEl) {
                    cellEl.classList.remove('flagged');
                    cellEl.textContent = '';
                }
            }

            this.playSound('flag');
            this.updateDisplays();
        }

        chordClick(row, col) {
            if (!this.revealed[row][col]) return;
            const value = this.board[row][col];
            if (value <= 0) return;

            // Count flags around
            let flagCount = 0;
            const neighbors = this.getNeighbors(row, col);
            for (const [nr, nc] of neighbors) {
                if (this.flagged[nr][nc]) flagCount++;
            }

            if (flagCount !== value) return;

            // Reveal unflagged neighbors
            for (const [nr, nc] of neighbors) {
                if (!this.revealed[nr][nc] && !this.flagged[nr][nc]) {
                    this.revealCell(nr, nc);
                }
            }
        }

        checkWin() {
            if (this.cellsRevealed >= this.totalSafeCells) {
                this.endGame(true);
            }
        }

        endGame(won) {
            this.gameOver = true;
            this.gameWon = won;
            this.gameStarted = false;
            this.stopTimer();
            this.resetCombo();

            // Reveal all mines
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.board[r][c] === -1 && !this.revealed[r][c]) {
                        const cellEl = this.getCellElement(r, c);
                        if (cellEl) {
                            if (won) {
                                cellEl.classList.add('flagged');
                                cellEl.textContent = '🚩';
                            } else {
                                cellEl.classList.add('revealed', 'mine');
                                cellEl.textContent = '💣';
                            }
                        }
                    }
                    // Show wrongly flagged cells
                    if (this.flagged[r][c] && this.board[r][c] !== -1 && !won) {
                        const cellEl = this.getCellElement(r, c);
                        if (cellEl) {
                            cellEl.classList.add('revealed');
                            cellEl.textContent = '❌';
                            cellEl.style.color = 'var(--danger)';
                        }
                    }
                }
            }

            if (won) {
                // Win bonus
                const timeBonus = Math.max(0, 300 - this.timer) * 5;
                const winBonus = 500 + this.mineCount * 10 + timeBonus;
                this.score += winBonus;
                this.playSound('win');
                this.spawnWin();
            } else {
                Nexus.audio.play('lose');
            }

            // Guardar progreso (XP, estadísticas, logros) y mostrar resultado
            const mode = this.currentDifficulty;
            const result = Nexus.services.progress.recordGame({
                game: 'minesweeper', mode, won, score: this.score, time: this.timer,
                extra: {
                    maxCombo: this.maxCombo, powersUsed: this.powersUsed,
                    cellsRevealed: this.cellsRevealed, difficulty: mode
                }
            });
            this.showEndModal(won, result);
        }

        showEndModal(won, result) {
            const open = () => {
                if (this.destroyed) return;
                this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: won ? '🏆' : '💣', kind: won ? 'win' : 'lose',
                    title: won ? '¡VICTORIA!' : 'GAME OVER',
                    subtitle: won ? '¡Has despejado el campo cuántico!' : 'Una mina ha explotado...',
                    stats: [
                        { label: 'Puntuación', value: this.score.toLocaleString('es-ES') },
                        { label: 'Tiempo', value: this.formatTime(this.timer) },
                        { label: 'Celdas', value: `${this.cellsRevealed} / ${this.totalSafeCells}` },
                        { label: 'Combo Máx', value: `×${this.maxCombo}` }
                    ],
                    result,
                    actions: [
                        { label: '🔄 Reintentar', kind: 'primary', onClick: () => { this.later(() => this.newGame(), 50); } },
                        { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
                    ]
                });
            };
            this.later(open, won ? 700 : 600);
        }

        // ============================================
        // POWERS SYSTEM
        // ============================================

        renderPowers() {
            if (!this.powersContainer) return;
            this.powersContainer.innerHTML = '';

            for (const [id, power] of Object.entries(this.powers)) {
                const btn = document.createElement('button');
                btn.className = 'power-btn';
                if (power.charges <= 0) btn.classList.add('disabled');
                if (id === 'shield') btn.classList.add('passive');
                if (this.activePower === id) btn.classList.add('active');
                btn.dataset.power = id;

                btn.innerHTML = `
                    <span class="power-icon">${power.icon}</span>
                    <div class="power-info">
                        <span class="power-name">${power.name}</span>
                        <span class="power-charges">${id === 'shield' ? (power.charges > 0 ? 'Pasivo · activo' : 'Usado') : `${power.charges} / ${power.maxCharges}`}</span>
                    </div>
                `;

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.gameOver) return;
                    if (power.charges <= 0 && id !== 'shield') return;
                    this.togglePower(id);
                });

                this.powersContainer.appendChild(btn);
            }
        }

        togglePower(powerId) {
            if (powerId === 'shield') {
                Nexus.ui.toast('El Escudo es pasivo: te salva automáticamente de la primera mina.', { icon: '🛡️' });
                return;
            }
            if (this.firstClick) {
                Nexus.ui.toast('Revela primero una casilla para usar poderes.', { icon: '⚡' });
                return;
            }
            if (this.activePower === powerId) {
                this.deactivatePower();
                return;
            }

            this.deactivatePower();

            // Instant powers (no cell click needed)
            if (powerId === 'xray') {
                this.useXRay();
                return;
            }
            if (powerId === 'sniper') {
                this.useSniper();
                return;
            }

            // Targeted powers
            this.activePower = powerId;
            this.playSound('powerActivate');
            this.renderPowers();

        }

        deactivatePower() {
            this.activePower = null;
            this.renderPowers();
        }

        usePower(powerId, row, col) {
            switch (powerId) {
                case 'scanner':
                    this.useScanner(row, col);
                    break;
                case 'emp':
                    this.useEMP(row, col);
                    break;
            }
        }

        useScanner(row, col) {
            if (this.powers.scanner.charges <= 0) return;
            this.powers.scanner.charges--;
            this.powersUsed++;

            this.playSound('powerUse');

            // Reveal 3x3 area safely
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = row + dr, nc = col + dc;
                    if (!this.isValid(nr, nc)) continue;
                    if (this.revealed[nr][nc]) continue;

                    const cellEl = this.getCellElement(nr, nc);

                    if (this.board[nr][nc] === -1) {
                        // Auto-flag mines
                        if (!this.flagged[nr][nc]) {
                            this.flagged[nr][nc] = true;
                            this.flagsPlaced++;
                            if (cellEl) {
                                cellEl.classList.add('flagged');
                                cellEl.textContent = '🚩';
                            }
                        }
                    } else {
                        // Reveal safe cells
                        this.revealed[nr][nc] = true;
                        this.cellsRevealed++;
                        const val = this.board[nr][nc];
                        if (cellEl) {
                            cellEl.classList.add('revealed', 'scanner-highlight');
                            if (val > 0) {
                                cellEl.textContent = val;
                                cellEl.setAttribute('data-number', val);
                            } else {
                                cellEl.textContent = '';
                            }
                        }

                        if (this.orbs[nr][nc]) this.collectOrb(nr, nc);
                        this.addScore(10, false);

                        // Flood fill if 0
                        if (val === 0) this.floodFill(nr, nc);
                    }

                    if (cellEl) {
                        setTimeout(() => cellEl.classList.remove('scanner-highlight'), 1000);
                    }
                }
            }

            this.spawnPowerUse(row, col, '#00cec9');
            this.deactivatePower();
            this.updateDisplays();
            this.checkWin();
        }

        useXRay() {
            if (this.powers.xray.charges <= 0) return;
            this.powers.xray.charges--;
            this.powersUsed++;

            this.playSound('powerUse');

            // Show all mines for 3 seconds
            const mineCells = [];
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.board[r][c] === -1 && !this.revealed[r][c]) {
                        const cellEl = this.getCellElement(r, c);
                        if (cellEl) {
                            cellEl.classList.add('xray-mine');
                            cellEl.textContent = '💣';
                            mineCells.push(cellEl);
                        }
                    }
                }
            }

            // Hide after 3 seconds
            setTimeout(() => {
                for (const cellEl of mineCells) {
                    cellEl.classList.remove('xray-mine');
                    if (cellEl.classList.contains('flagged')) {
                        cellEl.textContent = '🚩';
                    } else if (!cellEl.classList.contains('revealed')) {
                        cellEl.textContent = '';
                    }
                }
            }, 3000);

            this.deactivatePower();
            this.renderPowers();
        }

        useSniper() {
            if (this.powers.sniper.charges <= 0) return;

            // Find unrevealed safe cells
            const safeCells = [];
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.board[r][c] !== -1 && !this.revealed[r][c] && !this.flagged[r][c]) {
                        safeCells.push([r, c]);
                    }
                }
            }

            if (safeCells.length === 0) return;

            this.powers.sniper.charges--;
            this.powersUsed++;
            this.playSound('powerUse');

            // Reveal a random safe cell
            const [r, c] = safeCells[Math.floor(Math.random() * safeCells.length)];
            this.spawnPowerUse(r, c, '#fd79a8');

            // Use revealCell for proper handling
            this.revealed[r][c] = true;
            this.cellsRevealed++;
            const cellEl = this.getCellElement(r, c);
            const val = this.board[r][c];
            if (cellEl) {
                cellEl.classList.add('revealed');
                if (val > 0) {
                    cellEl.textContent = val;
                    cellEl.setAttribute('data-number', val);
                } else {
                    cellEl.textContent = '';
                    // Flood fill if 0
                    this.floodFill(r, c);
                }
            }

            if (this.orbs[r][c]) this.collectOrb(r, c);
            this.addScore(10, true);

            this.deactivatePower();
            this.updateDisplays();
            this.checkWin();
        }

        useEMP(row, col) {
            if (this.powers.emp.charges <= 0) return;
            if (!this.revealed[row][col]) return;
            const value = this.board[row][col];
            if (value <= 0) return;

            // Find adjacent mines
            let minesFound = 0;
            for (const [nr, nc] of this.getNeighbors(row, col)) {
                if (this.board[nr][nc] === -1 && !this.flagged[nr][nc] && !this.revealed[nr][nc]) {
                    this.flagged[nr][nc] = true;
                    this.flagsPlaced++;
                    minesFound++;
                    const cellEl = this.getCellElement(nr, nc);
                    if (cellEl) {
                        cellEl.classList.add('flagged', 'scanner-highlight');
                        cellEl.textContent = '🚩';
                        setTimeout(() => cellEl.classList.remove('scanner-highlight'), 1000);
                    }
                }
            }

            if (minesFound > 0) {
                this.powers.emp.charges--;
                this.powersUsed++;
                this.playSound('powerUse');
                this.spawnPowerUse(row, col, '#fdcb6e');
            }

            this.deactivatePower();
            this.renderPowers();
            this.updateDisplays();
        }

        collectOrb(row, col) {
            this.orbs[row][col] = false;
            this.addScore(50, false);
            this.playSound('orbCollect');
            this.spawnOrb(row, col);

            const cellEl = this.getCellElement(row, col);
            if (cellEl) cellEl.classList.add('power-orb-found');

            // Recharge a random depleted power
            const depleted = Object.entries(this.powers).filter(
                ([, p]) => p.charges < p.maxCharges
            );
            if (depleted.length > 0) {
                const [id] = depleted[Math.floor(Math.random() * depleted.length)];
                this.powers[id].charges++;
                this.renderPowers();
            }
        }

        // ============================================
        // COMBO SYSTEM
        // ============================================

        incrementCombo() {
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            if (this.comboTimer) clearTimeout(this.comboTimer);
            this.comboTimer = setTimeout(() => this.resetCombo(), 1500);

            if (this.combo > 1) {
                this.playSound('combo');
            }

            this.updateComboDisplay();
        }

        resetCombo() {
            this.combo = 0;
            if (this.comboTimer) {
                clearTimeout(this.comboTimer);
                this.comboTimer = null;
            }
            this.updateComboDisplay();
        }

        updateComboDisplay() {
            const multiplierEl = this.byId('combo-multiplier');
            const barEl = this.byId('combo-bar');
            const labelEl = this.byId('combo-label');

            if (multiplierEl) {
                multiplierEl.textContent = `×${this.combo}`;
                multiplierEl.classList.toggle('active', this.combo > 0);
                multiplierEl.classList.toggle('mega', this.combo >= 10);
                if (this.combo > 1) {
                    multiplierEl.style.transform = 'scale(1.3)';
                    setTimeout(() => multiplierEl.style.transform = 'scale(1)', 200);
                }
            }

            if (barEl) {
                barEl.style.width = Math.min(100, (this.combo / 20) * 100) + '%';
            }

            if (labelEl) {
                if (this.combo === 0) labelEl.textContent = 'Sin combo';
                else if (this.combo < 5) labelEl.textContent = '¡Bueno!';
                else if (this.combo < 10) labelEl.textContent = '¡Genial!';
                else if (this.combo < 15) labelEl.textContent = '¡Increíble!';
                else if (this.combo < 20) labelEl.textContent = '¡LEGENDARIO!';
                else labelEl.textContent = '¡¡CUÁNTICO!!';
            }

            // Update info panel
            const maxComboEl = this.byId('info-max-combo');
            if (maxComboEl) maxComboEl.textContent = this.maxCombo;
        }

        // ============================================
        // SCORING & TIMER
        // ============================================

        addScore(base, withCombo) {
            const multiplier = withCombo ? (1 + this.combo * 0.5) : 1;
            const points = Math.round(base * multiplier);
            this.score += points;

            const scoreEl = this.byId('display-score');
            if (scoreEl) scoreEl.textContent = this.score.toLocaleString();

            if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        }

        startTimer() {
            this.stopTimer();
            this.timer = 0;
            this.timerInterval = setInterval(() => {
                this.timer++;
                const timerEl = this.byId('display-timer');
                if (timerEl) timerEl.textContent = this.formatTime(this.timer);
            }, 1000);
        }

        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        }

        formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        // ============================================
        // RENDERING
        // ============================================

        renderBoard() {
            if (!this.boardEl) return;
            this.boardEl.innerHTML = '';
            this.boardEl.style.setProperty('--cols', this.cols);
            this.boardEl.style.setProperty('--cell-size', this.cellSize + 'px');

            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = r;
                    cell.dataset.col = c;
                    this.boardEl.appendChild(cell);
                }
            }
        }

        updateDisplays() {
            const scoreEl = this.byId('display-score');
            const minesEl = this.byId('display-mines');
            const cellsEl = this.byId('info-cells');
            const powersEl = this.byId('info-powers-used');
            const flagsEl = this.byId('info-flags');

            if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
            if (minesEl) minesEl.textContent = this.mineCount - this.flagsPlaced;
            if (cellsEl) cellsEl.textContent = `${this.cellsRevealed} / ${this.totalSafeCells}`;
            if (powersEl) powersEl.textContent = this.powersUsed;
            if (flagsEl) flagsEl.textContent = this.flagsPlaced;
        }

        resizeFxCanvas() {
            if (!this.fxCanvas) return;
            const wrapper = this.fxCanvas.parentElement;
            if (wrapper) {
                this.fxCanvas.width = wrapper.offsetWidth;
                this.fxCanvas.height = wrapper.offsetHeight;
            }
        }

        // ============================================
        // EVENT BINDING
        // ============================================

        bindEvents() {
            // Board clicks (event delegation)
            if (this.boardEl) {
                this.boardEl.addEventListener('click', (e) => {
                    const cell = e.target.closest('.cell');
                    if (!cell) return;
                    const row = parseInt(cell.dataset.row);
                    const col = parseInt(cell.dataset.col);
                    this.handleCellClick(row, col);
                });

                this.boardEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const cell = e.target.closest('.cell');
                    if (!cell) return;
                    const row = parseInt(cell.dataset.row);
                    const col = parseInt(cell.dataset.col);
                    this.handleCellRightClick(row, col);
                });
            }

            // Difficulty buttons
            this.root.querySelectorAll('.diff-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const diff = btn.dataset.diff;
                    if (diff && this.difficulties[diff]) {
                        this.newGame(diff);
                    }
                });
            });

            // New game button
            const newGameBtn = this.byId('btn-new-game');
            if (newGameBtn) {
                newGameBtn.addEventListener('click', () => this.newGame());
            }

            // Keyboard
            this.onKeyDown = (e) => {
                if (e.key === 'Escape' && this.activePower) this.deactivatePower();
            };
            document.addEventListener('keydown', this.onKeyDown);

            // Reajuste al cambiar el tamaño de ventana o al plegar/desplegar la barra lateral
            this.onLayout = Nexus.util.debounce(() => this.fitBoard(), 60);
            window.addEventListener('resize', this.onLayout);
            this.unsubLayout = Nexus.bus.on('layout:change', this.onLayout);

            // Botón modo bandera (táctil)
            const fm = this.byId('btn-flag-mode');
            if (fm) fm.addEventListener('click', () => {
                this.flagMode = !this.flagMode;
                fm.classList.toggle('active', this.flagMode);
                fm.setAttribute('aria-pressed', String(this.flagMode));
            });

            // Pulsación larga = bandera (pantallas táctiles)
            if (this.boardEl) {
                let timer = null, fired = false;
                this.boardEl.addEventListener('touchstart', (e) => {
                    if (!Nexus.services.settings.get('minesweeper.longPressFlag')) return;
                    const cell = e.target.closest('.cell');
                    if (!cell) return;
                    fired = false;
                    timer = setTimeout(() => {
                        fired = true;
                        this.handleCellRightClick(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
                        if (navigator.vibrate) navigator.vibrate(30);
                    }, 450);
                }, { passive: true });
                ['touchend', 'touchmove', 'touchcancel'].forEach(t =>
                    this.boardEl.addEventListener(t, () => clearTimeout(timer), { passive: true }));
                this.boardEl.addEventListener('click', (e) => {
                    if (fired) { fired = false; e.stopImmediatePropagation(); }
                }, true);
            }
        }

        // ============================================
        // UTILITIES
        // ============================================

        isValid(row, col) {
            return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
        }

        getNeighbors(row, col) {
            const neighbors = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = row + dr, nc = col + dc;
                    if (this.isValid(nr, nc)) neighbors.push([nr, nc]);
                }
            }
            return neighbors;
        }

        getCellElement(row, col) {
            if (!this.boardEl) return null;
            return this.boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        }

        getCellPosition(row, col) {
            const cellEl = this.getCellElement(row, col);
            if (!cellEl || !this.fxCanvas) return { x: 0, y: 0 };
            const cellRect = cellEl.getBoundingClientRect();
            const canvasRect = this.fxCanvas.getBoundingClientRect();
            return {
                x: cellRect.left - canvasRect.left + cellRect.width / 2,
                y: cellRect.top - canvasRect.top + cellRect.height / 2
            };
        }

        // ============================================
        // AUDIO (servicio compartido)
        // ============================================

        playSound(name) {
            Nexus.audio.play(name, this.combo);
        }

        // ============================================
        // PARTICLE EFFECTS
        // ============================================

        startParticleLoop() {
            if (this.animating) return;
            this.animating = true;
            this._particleLoop();
        }

        _particleLoop() {
            if (!this.fxCtx || !this.fxCanvas) return;

            this.fxCtx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity || 0.1;
                p.life--;
                p.alpha = Math.max(0, p.life / p.maxLife);

                this.fxCtx.beginPath();
                this.fxCtx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
                this.fxCtx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba');
                this.fxCtx.fill();

                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }

            if (this.particles.length > 0) {
                requestAnimationFrame(() => this._particleLoop());
            } else {
                this.animating = false;
            }
        }

        spawnParticle(x, y, vx, vy, size, life, color, gravity) {
            this.particles.push({
                x, y, vx, vy, size,
                life, maxLife: life,
                color, alpha: 1,
                gravity: gravity || 0.1
            });
            this.startParticleLoop();
        }

        spawnExplosion(row, col) {
            const pos = this.getCellPosition(row, col);
            const colors = ['rgb(255, 107, 107)', 'rgb(255, 165, 0)', 'rgb(253, 203, 110)', 'rgb(255, 80, 80)'];
            for (let i = 0; i < 30; i++) {
                const angle = (Math.PI * 2 / 30) * i + Math.random() * 0.3;
                const speed = 2 + Math.random() * 4;
                this.spawnParticle(
                    pos.x, pos.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    2 + Math.random() * 3, 30 + Math.random() * 20,
                    colors[Math.floor(Math.random() * colors.length)],
                    0.12
                );
            }
        }

        spawnReveal(row, col) {
            const pos = this.getCellPosition(row, col);
            const colors = ['rgb(0, 206, 201)', 'rgb(79, 195, 247)', 'rgb(85, 239, 196)'];
            for (let i = 0; i < 4; i++) {
                this.spawnParticle(
                    pos.x + (Math.random() - 0.5) * 10,
                    pos.y,
                    (Math.random() - 0.5) * 1.5,
                    -(1 + Math.random() * 2),
                    1.5 + Math.random(),
                    20 + Math.random() * 10,
                    colors[Math.floor(Math.random() * colors.length)],
                    -0.02
                );
            }
        }

        spawnWin() {
            const w = this.fxCanvas ? this.fxCanvas.width : 400;
            const h = this.fxCanvas ? this.fxCanvas.height : 400;
            const colors = [
                'rgb(108, 92, 231)', 'rgb(0, 206, 201)', 'rgb(253, 121, 168)',
                'rgb(253, 203, 110)', 'rgb(0, 184, 148)', 'rgb(162, 155, 254)',
                'rgb(85, 239, 196)', 'rgb(255, 107, 107)'
            ];
            for (let i = 0; i < 120; i++) {
                this.spawnParticle(
                    Math.random() * w,
                    -10 - Math.random() * 50,
                    (Math.random() - 0.5) * 4,
                    2 + Math.random() * 3,
                    2 + Math.random() * 3,
                    60 + Math.random() * 40,
                    colors[Math.floor(Math.random() * colors.length)],
                    0.08
                );
            }
        }

        spawnPowerUse(row, col, color) {
            const pos = this.getCellPosition(row, col);
            for (let i = 0; i < 15; i++) {
                const angle = (Math.PI * 2 / 15) * i;
                this.spawnParticle(
                    pos.x, pos.y,
                    Math.cos(angle) * 3, Math.sin(angle) * 3,
                    2, 25,
                    color.startsWith('rgb') ? color : `rgb(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)})`,
                    0.05
                );
            }
        }

        spawnOrb(row, col) {
            const pos = this.getCellPosition(row, col);
            for (let i = 0; i < 10; i++) {
                this.spawnParticle(
                    pos.x + (Math.random() - 0.5) * 15,
                    pos.y + (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 3,
                    -(1 + Math.random() * 2),
                    1.5 + Math.random(),
                    25 + Math.random() * 15,
                    Math.random() > 0.5 ? 'rgb(253, 203, 110)' : 'rgb(255, 255, 255)',
                    -0.03
                );
            }
        }

        // ============================================
        // MONTAJE / CICLO DE VIDA (Nexus Arcade)
        // ============================================

        buildTemplate() {
            this.root.innerHTML = `
                <div class="game minesweeper">
                    <header class="game-header">
                        <a class="btn-back" href="#/library"><span class="back-arrow">←</span><span>Biblioteca</span></a>
                        <div class="game-title"><span>💣</span> Buscaminas Quantum</div>
                        <div class="game-header-stats">
                            <div class="pill stat-score"><span aria-hidden="true">💎</span><span class="pill-value" id="display-score">0</span></div>
                            <div class="pill stat-timer"><span aria-hidden="true">⏱️</span><span class="pill-value" id="display-timer">00:00</span></div>
                            <div class="pill stat-mines"><span aria-hidden="true">🚩</span><span class="pill-value" id="display-mines">0</span></div>
                        </div>
                    </header>

                    <div class="game-body">
                        <aside class="panel panel-left">
                            <div class="panel-section">
                                <h3 class="panel-heading">⚡ Poderes</h3>
                                <div id="powers-container"></div>
                            </div>
                            <div class="panel-section">
                                <h3 class="panel-heading">🔥 Combo</h3>
                                <div class="combo-display">
                                    <div class="combo-multiplier" id="combo-multiplier">×0</div>
                                    <div class="combo-bar-wrap"><div class="combo-bar" id="combo-bar"></div></div>
                                    <div class="combo-label" id="combo-label">Sin combo</div>
                                </div>
                            </div>
                        </aside>

                        <div class="board-area">
                            <div class="difficulty-selector" id="difficulty-selector">
                                <button class="diff-btn" data-diff="easy"><span class="diff-emoji">🌱</span><span class="diff-name">Recluta</span><span class="diff-detail">9×9 · 10💣</span></button>
                                <button class="diff-btn" data-diff="medium"><span class="diff-emoji">⚔️</span><span class="diff-name">Soldado</span><span class="diff-detail">16×16 · 40💣</span></button>
                                <button class="diff-btn" data-diff="hard"><span class="diff-emoji">🔥</span><span class="diff-name">Veterano</span><span class="diff-detail">16×30 · 99💣</span></button>
                                <button class="diff-btn" data-diff="nightmare"><span class="diff-emoji">💀</span><span class="diff-name">Pesadilla</span><span class="diff-detail">20×30 · 145💣</span></button>
                            </div>

                            <div class="board-wrapper">
                                <div class="board" id="board" role="grid" aria-label="Campo de minas"></div>
                                <canvas id="fx-canvas"></canvas>
                            </div>

                            <div class="board-actions">
                                <button class="btn btn-primary btn-glow" id="btn-new-game" type="button">🔄 Nueva Partida</button>
                                <button class="btn btn-ghost" id="btn-flag-mode" type="button" aria-pressed="false" title="Toca para colocar banderas (táctil)">🚩 Modo bandera</button>
                            </div>
                        </div>

                        <aside class="panel panel-right">
                            <div class="panel-section">
                                <h3 class="panel-heading">📊 Partida</h3>
                                <div class="stat-rows">
                                    <div class="stat-row"><span>Celdas</span><span id="info-cells">0 / 0</span></div>
                                    <div class="stat-row"><span>Combo Máx</span><span id="info-max-combo">0</span></div>
                                    <div class="stat-row"><span>Poderes</span><span id="info-powers-used">0</span></div>
                                    <div class="stat-row"><span>Banderas</span><span id="info-flags">0</span></div>
                                </div>
                            </div>
                            <div class="panel-section">
                                <h3 class="panel-heading">🏆 Récords</h3>
                                <div class="stat-rows">
                                    <div class="stat-row"><span>Mejor Punt.</span><span id="info-best-score">0</span></div>
                                    <div class="stat-row"><span>Mejor Tiempo</span><span id="info-best-time">--:--</span></div>
                                    <div class="stat-row"><span>Racha</span><span id="info-streak">0</span></div>
                                    <div class="stat-row"><span>Victorias</span><span id="info-wins">0</span></div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>`;
            this.timers = new Set();
        }

        byId(id) { return this.root.querySelector('#' + id); }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id);
            return id;
        }

        /** Ajusta el tamaño de celda al espacio disponible (ancho y alto). */
        fitBoard() {
            if (this.destroyed || !this.boardEl) return;
            const area = this.root.querySelector('.board-area');
            if (!area || !area.clientWidth) return;
            const cfg = this.difficulties[this.currentDifficulty];
            const availW = area.clientWidth - 24 - 32;
            const availH = window.innerHeight - 64 - 60 - 220;
            const byW = Math.floor((availW - (this.cols - 1) * 2) / this.cols);
            const byH = Math.floor((availH - (this.rows - 1) * 2) / this.rows);
            const size = Nexus.util.clamp(Math.min(byW, byH, cfg.cellSize), 18, cfg.cellSize);
            this.cellSize = size;
            this.boardEl.style.setProperty('--cell-size', size + 'px');
            this.resizeFxCanvas();
        }

        /** Récords del usuario en el panel derecho. */
        updateRecords() {
            const gs = Nexus.services.progress.stats('minesweeper');
            const set = (id, v) => { const el = this.byId(id); if (el) el.textContent = v; };
            set('info-best-score', gs.bestScore.toLocaleString('es-ES'));
            set('info-best-time', gs.bestTime !== null ? this.formatTime(gs.bestTime) : '--:--');
            set('info-streak', gs.bestStreak);
            set('info-wins', gs.wins);
        }

        destroy() {
            this.destroyed = true;
            this.stopTimer();
            if (this.comboTimer) clearTimeout(this.comboTimer);
            document.removeEventListener('keydown', this.onKeyDown);
            window.removeEventListener('resize', this.onLayout);
            if (this.unsubLayout) this.unsubLayout();
            if (this.unsubProgress) this.unsubProgress();
            this.timers.forEach(clearTimeout); this.timers.clear();
            if (this.resultModal) this.resultModal.close();
            this.particles = [];
        }
    }

    // ── Logros de Buscaminas ────────────────────────────────
    const A = Nexus.services.achievements;
    const ms = (c) => c.stats('minesweeper');
    const win = (c, fn) => !!c.event && c.event.game === 'minesweeper' && c.event.won && (!fn || fn(c.event));
    A.register([
        { id: 'ms_easy', game: 'minesweeper', name: 'Recluta graduado', desc: 'Gana en dificultad Recluta.', icon: '🌱', rarity: 'common',
            test: (c) => (ms(c).byMode.easy || {}).wins > 0 },
        { id: 'ms_medium', game: 'minesweeper', name: 'Soldado de élite', desc: 'Gana en dificultad Soldado.', icon: '⚔️', rarity: 'common',
            test: (c) => (ms(c).byMode.medium || {}).wins > 0 },
        { id: 'ms_hard', game: 'minesweeper', name: 'Veterano de guerra', desc: 'Gana en dificultad Veterano.', icon: '🔥', rarity: 'rare',
            test: (c) => (ms(c).byMode.hard || {}).wins > 0 },
        { id: 'ms_nightmare', game: 'minesweeper', name: 'Sobreviviente', desc: 'Gana en dificultad Pesadilla.', icon: '💀', rarity: 'legendary',
            test: (c) => (ms(c).byMode.nightmare || {}).wins > 0 },
        { id: 'ms_speed', game: 'minesweeper', name: 'Rayo', desc: 'Gana en Recluta en menos de 30 segundos.', icon: '⚡', rarity: 'rare',
            test: (c) => win(c, e => e.mode === 'easy' && e.time < 30) },
        { id: 'ms_combo10', game: 'minesweeper', name: 'Combo ×10', desc: 'Consigue un combo de 10.', icon: '🔥', rarity: 'common',
            test: (c) => !!c.event && c.event.game === 'minesweeper' && c.event.extra.maxCombo >= 10 },
        { id: 'ms_combo20', game: 'minesweeper', name: 'Cuántico', desc: 'Consigue un combo de 20.', icon: '🌌', rarity: 'epic',
            test: (c) => !!c.event && c.event.game === 'minesweeper' && c.event.extra.maxCombo >= 20 },
        { id: 'ms_pure', game: 'minesweeper', name: 'Purista', desc: 'Gana en Soldado o superior sin usar poderes.', icon: '🧘', rarity: 'epic',
            test: (c) => win(c, e => e.mode !== 'easy' && e.extra.powersUsed === 0) },
        { id: 'ms_score5k', game: 'minesweeper', name: 'Cazarrécords', desc: 'Gana una partida con 5.000 puntos o más.', icon: '💎', rarity: 'rare',
            test: (c) => win(c, e => e.score >= 5000) },
        { id: 'ms_wins10', game: 'minesweeper', name: 'Desactivador', desc: 'Gana 10 partidas de Buscaminas.', icon: '💣', rarity: 'rare',
            ...A.counter((c) => ms(c).wins, 10) },
        { id: 'ms_streak5', game: 'minesweeper', name: 'Sin fallos', desc: 'Encadena 5 victorias seguidas.', icon: '🎯', rarity: 'epic',
            ...A.counter((c) => ms(c).bestStreak, 5) }
    ]);

    // ── Registro ────────────────────────────────────────────
    Nexus.games.registry.register({
        id: 'minesweeper', name: 'Buscaminas Quantum', emoji: '💣', accent: '#6c5ce7',
        tagline: 'Poderes · Combos · Desafíos',
        description: 'El clásico buscaminas reinventado con poderes especiales, combos explosivos y mecánicas únicas. ¿Podrás dominar el campo cuántico?',
        tags: ['Puzzle', 'Estrategia'],
        modes: [
            { id: 'easy', label: 'Recluta' }, { id: 'medium', label: 'Soldado' },
            { id: 'hard', label: 'Veterano' }, { id: 'nightmare', label: 'Pesadilla' }],
        metrics: [{ id: 'score', label: 'Puntuación' }, { id: 'time', label: 'Tiempo' }, { id: 'wins', label: 'Victorias' }],
        mount: (root) => new MinesweeperGame(root)
    });
})();
