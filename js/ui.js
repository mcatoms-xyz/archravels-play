/**
 * ArchRavels — UI Rendering & Event Handling
 * =========================================================
 * All DOM manipulation lives here. Reads from Game.state
 * and updates the page. Event handlers call Game functions
 * then trigger re-renders.
 *
 * Session 5 additions:
 *   - Action space selector (chooseSpace phase)
 *   - Turn-aware action bar (playerActions phase)
 *   - Exchange modal (give/receive yarn)
 *   - Craft availability gating (respects action space limits)
 *
 * Session 6 additions:
 *   - Async restock queue (Events + SRs resolved sequentially)
 *   - Event modal (shows card image + effect, handles input if needed)
 *   - Yarn Sale modal (pick 3 colors from supply)
 *   - Donate modal (give back 2 yarn)
 *   - Special Request take modal (SR revealed during restock)
 *   - Special Requests panel (below craft strip)
 *   - SR crafting (all colorRules: specific/any/sameColor/different/give)
 *
 * Session 7 additions:
 *   - Project strip (3 face-up project cards)
 *   - Finish Project (Restock action): turn in items, score points
 *   - Learn a Pattern (Restock action): flip tile to general side
 *   - Frog It (Restock action): return crafted item, get yarn back
 *   - frogIt color picker (reuses craft color picker with context='frogIt')
 *   - SR display handles all colorRules (cost shown as label or dots)
 *
 * Naming convention:
 *   render*()  — updates a section of the DOM
 *   on*()      — event handler (user interaction)
 *   show*()    — shows a modal or overlay
 *   hide*()    — hides a modal or overlay
 * =========================================================
 */

var UI = {

    /* ----- DOM element references (set in init) ----- */
    els: {},

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    init: function() {
        // Cache DOM references
        this.els = {
            bazaar:          document.getElementById('bazaar'),
            actionBar:       document.getElementById('actionBar'),
            /* actionStatusStrip removed in Session 17 single-row redesign */
            yarnBowl:        document.getElementById('yarnBowl'),
            deckCounter:     document.getElementById('deckCounter'),
            craftGrid:       document.getElementById('craftGrid'),
            actionGridOverlay: document.getElementById('actionGridOverlay'),
            finishedWrapper: document.getElementById('finishedObjectsWrapper'),
            finishedGrid:    document.getElementById('finishedObjects'),
            finishedTotal:   document.getElementById('finishedObjectsTotal'),
            // --- Session 15b: Finished Objects drawer ---
            foDrawer:        document.getElementById('foDrawer'),
            foDrawerTab:     document.getElementById('foDrawerTab'),
            foDrawerCount:   document.getElementById('foDrawerCount'),
            foDrawerClose:   document.getElementById('foDrawerClose'),
            // --- Session 6: Special Requests panel ---
            srStrip:         document.getElementById('srStrip'),
            srGrid:          document.getElementById('srGrid'),
            // --- Session 15b: SR board reminder overlay ---
            srBoardReminder: document.getElementById('srBoardReminder'),
            // --- Existing modals ---
            confirmModal:    document.getElementById('confirmTakeModal'),
            confirmBody:     document.getElementById('confirmTakeBody'),
            craftConfirmModal: document.getElementById('craftConfirmModal'),
            craftConfirmTitle: document.getElementById('craftConfirmTitle'),
            craftConfirmBody:  document.getElementById('craftConfirmBody'),
            craftColorModal: document.getElementById('craftColorModal'),
            craftColorTitle: document.getElementById('craftColorTitle'),
            craftColorBody:  document.getElementById('craftColorBody'),
            craftColorConfirmBtn: document.getElementById('craftColorConfirmBtn'),
            colorModal:      document.getElementById('colorPickerModal'),
            colorGrid:       document.getElementById('colorPickerGrid'),
            exchangeModal:   document.getElementById('exchangeModal'),
            exchangeBody:    document.getElementById('exchangeBody'),
            exchangeConfirmBtn: document.getElementById('exchangeConfirmBtn'),
            // --- Session 6 modals ---
            eventModal:      document.getElementById('eventModal'),
            eventCardImg:    document.getElementById('eventCardImg'),
            eventTitle:      document.getElementById('eventModalTitle'),
            eventMsg:        document.getElementById('eventModalMsg'),
            eventOkBtn:      document.getElementById('eventOkBtn'),
            eventExtraBody:  document.getElementById('eventExtraBody'),
            srTakeModal:     document.getElementById('srTakeModal'),
            srTakeCardImg:   document.getElementById('srTakeCardImg'),
            srTakeName:      document.getElementById('srTakeName'),
            srTakeYarn:      document.getElementById('srTakeYarn'),
            srTakePoints:    document.getElementById('srTakePoints'),
            srTakeFavorite:  document.getElementById('srTakeFavorite'),
            yarnSaleModal:   document.getElementById('yarnSaleModal'),
            yarnSaleContext: document.getElementById('yarnSaleContext'),
            yarnSaleBody:    document.getElementById('yarnSaleBody'),
            donateModal:     document.getElementById('donateModal'),
            donateContext:   document.getElementById('donateContext'),
            donateBody:      document.getElementById('donateBody'),
            // --- Session 6b: Craft Circle modal ---
            craftCircleModal: document.getElementById('craftCircleModal'),
            craftCircleGrid:  document.getElementById('craftCircleGrid'),
            // --- Session 8: Project board overlay (replaces Session 7 floating strip) ---
            projectBoardOverlay:  document.getElementById('projectBoardOverlay'),
            projectDeckBadge:     document.getElementById('projectDeckBadge'),
            // --- Session 7: Project modals (retained) ---
            finishProjectModal:   document.getElementById('finishProjectModal'),
            finishProjectBody:    document.getElementById('finishProjectBody'),
            learnPatternModal:    document.getElementById('learnPatternModal'),
            learnPatternBody:     document.getElementById('learnPatternBody'),
            frogItModal:          document.getElementById('frogItModal'),
            frogItBody:           document.getElementById('frogItBody'),
            // --- Session 9: Setup, pass-device, player indicator ---
            setupModal:           document.getElementById('setupModal'),
            setupPlayers:         document.getElementById('setupPlayers'),
            setupStartBtn:        document.getElementById('setupStartBtn'),
            passDeviceModal:      document.getElementById('passDeviceModal'),
            passDeviceTitle:      document.getElementById('passDeviceTitle'),
            passDeviceMsg:        document.getElementById('passDeviceMsg'),
            playerIndicator:      document.getElementById('playerIndicator'),
            playerIndicatorName:  document.getElementById('playerIndicatorName'),
            playerIndicatorTurn:  document.getElementById('playerIndicatorTurn'),
            playerBoardImage:     document.querySelector('.player-board-image'),
            // --- Session 12: Player strip & opponent panel ---
            playerStrip:          document.getElementById('playerStrip'),
            opponentPanel:        document.getElementById('opponentPanel'),
            opponentPanelBackdrop: document.getElementById('opponentPanelBackdrop'),
            opponentPanelBody:    document.getElementById('opponentPanelBody'),
            opponentPanelTitle:   document.getElementById('opponentPanelTitle'),
            // --- Session 9b: AI log overlay ---
            aiLogOverlay:         document.getElementById('aiLogOverlay'),
            aiLogTitle:           document.getElementById('aiLogTitle'),
            aiLogMessages:        document.getElementById('aiLogMessages'),
        };

        // Stamp the build info into the nav edition label
        // Build number is incremented each session: S1–S9b = builds 1–10
        var editionEl = document.getElementById('navEdition');
        if (editionEl) {
            editionEl.textContent = 'DIGITAL EDITION · BETA';
        }

        // Build the yarn bowl HTML (6 color slots)
        this.buildYarnBowl();

        // Build the color picker modal buttons
        this.buildColorPicker();

        // Session 34g: the pre-game landing screen is shown by default; the
        // player goes to setup by clicking "Play Solo" (UI.onLandingPlaySolo).
        // (Setup is no longer auto-opened on load.)

        // Session 11: Wire up Game.render delegates so game.js stays DOM-free
        Game.render.all              = function() { UI.renderAll(); };
        Game.render.bazaar           = function() { UI.renderBazaar(); };
        Game.render.actionBar        = function() { UI.renderActionBar(); };
        Game.render.craftGrid        = function() { UI.renderCraftGrid(); };
        Game.render.specialRequests  = function() { UI.renderSpecialRequests(); };
        Game.render.projectStrip     = function() { UI.renderProjectStrip(); };
        Game.render.deckCounter      = function() { UI.renderDeckCounter(); };
        Game.render.yarnBowl         = function(c) { UI.renderYarnBowl(c); };
        Game.render.finishedObjects  = function() { UI.renderFinishedObjects(); };
        Game.render.showPassDevice   = function() { UI.showPassDevice(); };
        Game.render.showFinalCraftPhase = function() { UI.showFinalCraftPhase(); };
        Game.render.playerStrip      = function() { UI.renderPlayerStrip(); };
        Game.render.turnHistory      = function() { UI.renderTurnHistory(); };
        Game.render.navTimer         = function() { UI.renderNavTimer(); };
        Game.render.actionFeed       = function() { UI.renderActionFeed(); };

        // Session 12: Close opponent panel when clicking backdrop
        var backdrop = document.getElementById('opponentPanelBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', function() { UI.hideOpponentPanel(); });
        }

        // Session 21: Restore colorblind mode preference
        this._restoreColorblindPref();

        // Session 21: Keyboard navigation
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keydown', this._handleModalFocusTrap);

        // Session 22: Action feed "History" button opens turn history panel
        var feedExpandBtn = document.getElementById('feedExpandBtn');
        if (feedExpandBtn) {
            feedExpandBtn.addEventListener('click', function() { UI.showTurnHistory(); });
        }

        // Session 15b: Finished Objects drawer toggle
        if (this.els.foDrawerTab) {
            this.els.foDrawerTab.addEventListener('click', function() {
                UI.toggleFinishedDrawer();
            });
        }
        if (this.els.foDrawerClose) {
            this.els.foDrawerClose.addEventListener('click', function() {
                UI.toggleFinishedDrawer(false);
            });
        }
    },

    /**
     * Session 9: Render all game sections (convenience helper).
     * Called after player switches in multiplayer.
     */
    renderAll: function() {
        this.updatePlayerBoard();
        this.renderPlayerIndicator();
        this.renderPlayerStrip();
        this.renderBazaar();
        this.renderYarnBowl();
        this.renderCraftGrid();
        this.renderFinishedObjects();
        this.renderSpecialRequests();
        this.renderProjectStrip();
        this.renderActionBar();
        this.renderDeckCounter();
        this.renderTurnHistory();
        this._updateTakeoverButton();
    },


    /* =========================================================
       SESSION 9 / 10b: GAME SETUP SCREEN
       ========================================================= */

    _setupPlayerCount: 2,

    /**
     * Per-seat Human/AI toggle.  Index 0–3.
     * Session 10b: Replaces the old _spectateMode boolean and the
     * hard-coded "p > 0 = AI" assumption.
     */
    _setupIsAI: [false, true, true, true, true, true],

    /**
     * Session 34g: leave the landing/front page and open Game Setup.
     */
    onLandingPlaySolo: function() {
        if (window.Story) Story.storyGame = false;   // this is a quick game, not a Story match
        var landing = document.getElementById('landingScreen');
        if (landing) landing.style.display = 'none';
        this.showSetupScreen();
    },

    showSetupScreen: function() {
        this._setupPlayerCount = 2;
        this._setupIsAI = [false, true, true, true, true, true];
        this._setupTypes = ['thriftyShopper', 'masterCrafter', 'colorSpecialist', 'yarnSpinner', 'maker', 'expert'];
        this._aiPicksInitialized = false;
        // Legacy spectate toggle — still in HTML, sync it
        var toggle = document.getElementById('setupSpectateToggle');
        if (toggle) toggle.checked = false;
        this.buildSetupPlayerSlots();
        this.els.setupModal.style.display = 'flex';
    },

    /**
     * Session 9b (updated 10b): Spectate mode toggle — sets ALL seats to AI.
     */
    onSpectateToggle: function() {
        var toggle = document.getElementById('setupSpectateToggle');
        var spectate = toggle && toggle.checked;
        for (var i = 0; i < 6; i++) {
            this._setupIsAI[i] = spectate ? true : (i > 0);
        }
        this.buildSetupPlayerSlots();
    },

    onSetupCountClick: function(count) {
        this._setupPlayerCount = count;
        // Update active button
        var btns = document.querySelectorAll('.setup-count-btn');
        btns.forEach(function(b) { b.classList.toggle('active', parseInt(b.getAttribute('data-count')) === count); });
        // Session 15b: Switch to 3-column grid for 5-6 players
        var setupContent = document.querySelector('.setup-content');
        if (setupContent) {
            setupContent.classList.toggle('setup-wide', count >= 5);
        }
        if (this.els.setupPlayers) {
            this.els.setupPlayers.classList.toggle('setup-3col', count >= 5);
        }
        this.buildSetupPlayerSlots();
    },

    _typeOrder: ['thriftyShopper', 'masterCrafter', 'colorSpecialist', 'yarnSpinner', 'maker', 'expert'],

    // Initial random picks per type for AI slots (randomized once per setup build)
    _aiRandomPicks: {},

    _typeNames: {
        thriftyShopper: 'Thrifty Shopper',
        masterCrafter:  'Master Crafter',
        colorSpecialist:'Color Specialist',
        yarnSpinner:    'Yarn Spinner',
        maker:          'Maker',
        expert:         'Expert',
    },

    /* Bright accent colors per character type — for dark-bg contexts (strip, panel header) */
    _typeAccentColors: {
        thriftyShopper:  '#7ab850',
        masterCrafter:   '#5ba0d0',
        colorSpecialist: '#e8a030',
        yarnSpinner:     '#b07050',
        maker:           '#c9a832',
        expert:          '#8868c0',
    },

    /* Type icons — paths relative to project root */
    _typeIcons: {
        thriftyShopper:  'Other Images Textures Details/Icons - Players/AR_Icon_Thrifty_sm.png',
        masterCrafter:   'Other Images Textures Details/Icons - Players/AR_Icon_Fiber_sm.png',
        colorSpecialist: 'Other Images Textures Details/Icons - Players/AR_Icon_Color_sm.png',
        yarnSpinner:     'Other Images Textures Details/Icons - Players/AR_Icon_Spin_sm.png',
        maker:           'Other Images Textures Details/Icons - Players/AR_Icon_Maker.png',
        expert:          'Other Images Textures Details/Icons - Players/AR.MS_Player_Icons_0005_expert.png',
    },

    /* Color accents per character type — drawn from the board ribbon colors */
    _typeColors: {
        thriftyShopper:  { bg: 'rgba(90, 122, 58, 0.18)',  border: 'rgba(90, 122, 58, 0.5)' },
        masterCrafter:   { bg: 'rgba(70, 130, 180, 0.18)', border: 'rgba(70, 130, 180, 0.5)' },
        colorSpecialist: { bg: 'rgba(210, 140, 50, 0.18)', border: 'rgba(210, 140, 50, 0.5)' },
        yarnSpinner:     { bg: 'rgba(140, 80, 55, 0.18)',  border: 'rgba(140, 80, 55, 0.5)' },
        maker:           { bg: 'rgba(201, 168, 50, 0.18)',  border: 'rgba(201, 168, 50, 0.5)' },
        expert:          { bg: 'rgba(136, 104, 192, 0.18)', border: 'rgba(136, 104, 192, 0.5)' },
    },

    /* Tracks the assigned type for each player slot (index 0–5).
       Initialized in showSetupScreen; rebuilt on count/type change. */
    _setupTypes: ['thriftyShopper', 'masterCrafter', 'colorSpecialist', 'yarnSpinner', 'maker', 'expert'],

    /**
     * Build player tiles in a 2-column grid.
     *
     * Session 10b rewrite: Full per-seat configurator.
     *  - Each seat has a Human/AI toggle button
     *  - Human seats: type dropdown shows types not taken by OTHER humans
     *  - AI seats: type dropdown shows types not taken by ANY human
     *  - All seats: character dropdown filtered to current type
     *  - AI types auto-reassign when a human claims their type
     */
    buildSetupPlayerSlots: function() {
        var container = this.els.setupPlayers;
        var count = this._setupPlayerCount;
        var allIds = Object.keys(CARDS.characters);
        var typeNames = this._typeNames;
        var typeOrder = this._typeOrder;
        var typeIcons = this._typeIcons;
        var setupTypes = this._setupTypes;
        var setupIsAI = this._setupIsAI;

        // Snapshot current character selections before rebuilding
        var currentChars = {};
        for (var i = 0; i < 4; i++) {
            var sel = document.getElementById('setupChar' + i);
            if (sel) currentChars[i] = sel.value;
        }

        // Randomize AI picks only on first build
        var self = this;
        if (!this._aiPicksInitialized) {
            typeOrder.forEach(function(type) {
                var candidates = allIds.filter(function(cid) {
                    return CARDS.characters[cid].type === type;
                });
                self._aiRandomPicks[type] = candidates[Math.floor(Math.random() * candidates.length)];
            });
            this._aiPicksInitialized = true;
        }

        // --- Collect human-claimed types (these have priority) ---
        var humanTypes = [];
        for (var h = 0; h < count; h++) {
            if (!setupIsAI[h]) {
                humanTypes.push(setupTypes[h]);
            }
        }

        // --- Auto-reassign AI seats that conflict with human picks ---
        var usedTypes = humanTypes.slice();  // start with human claims
        for (var a = 0; a < count; a++) {
            if (!setupIsAI[a]) continue;  // skip human seats
            // If this AI's type collides with a human pick (or another already-assigned type), reassign
            if (usedTypes.indexOf(setupTypes[a]) !== -1) {
                // Find a type not yet used
                var available = typeOrder.filter(function(t) { return usedTypes.indexOf(t) === -1; });
                if (available.length > 0) {
                    // Pick randomly from available
                    setupTypes[a] = available[Math.floor(Math.random() * available.length)];
                }
            }
            usedTypes.push(setupTypes[a]);
        }

        // --- Helper: types available for a given seat's dropdown ---
        function availableTypesFor(slotIdx) {
            var isAI = setupIsAI[slotIdx];
            var result = [];
            typeOrder.forEach(function(tp) {
                // A type is available if no OTHER seat of higher priority claims it.
                // Priority rule: humans > AI. Among same tier, first-come.
                var claimedByOther = false;
                for (var j = 0; j < count; j++) {
                    if (j === slotIdx) continue;
                    if (setupTypes[j] !== tp) continue;
                    // This type is taken by seat j. Is it a conflict?
                    if (!setupIsAI[j]) {
                        // seat j is human — always blocks
                        claimedByOther = true;
                    } else if (isAI) {
                        // Both AI — block if j comes before us
                        if (j < slotIdx) claimedByOther = true;
                    }
                    // If current seat is human, AI claims don't block us
                }
                if (!claimedByOther) result.push(tp);
            });
            return result;
        }

        var html = '';

        for (var p = 0; p < count; p++) {
            var type = setupTypes[p];
            var color = self._typeColors[type] || { bg: 'transparent', border: 'var(--panel-border)' };
            var icon = typeIcons[type] || '';
            var tName = typeNames[type] || type;
            var isAI = setupIsAI[p];

            // Player label with Human/AI toggle
            var pLabel = 'Player ' + (p + 1);

            html += '<div class="setup-tile" style="background:' + color.bg + ';border-color:' + color.border + '">';

            // Icon + type header
            html += '<div class="setup-tile-header">';
            html += '<img class="setup-tile-icon" src="' + icon + '" alt="' + tName + '">';
            html += '<div class="setup-tile-header-text">';

            // Type dropdown — available types depend on human/AI priority
            var avail = availableTypesFor(p);
            html += '<select class="setup-type-select" id="setupType' + p + '" onchange="UI.onSetupTypeChange(' + p + ')">';
            avail.forEach(function(tp) {
                var selected = (tp === type) ? ' selected' : '';
                html += '<option value="' + tp + '"' + selected + '>' + typeNames[tp] + '</option>';
            });
            html += '</select>';

            // Human/AI toggle + player label
            html += '<div class="setup-tile-player">';
            html += pLabel + ' ';
            if (isAI) {
                html += '<button class="setup-ai-toggle setup-ai-toggle-ai" onclick="UI.onToggleAI(' + p + ')" title="Click to switch to Human">';
                html += 'CPU</button>';
            } else {
                html += '<button class="setup-ai-toggle setup-ai-toggle-human" onclick="UI.onToggleAI(' + p + ')" title="Click to switch to Computer">';
                html += 'Human</button>';
            }
            html += '</div>';

            html += '</div></div>';

            // Character picker (filtered to this type)
            var charDefault = currentChars[p] || self._aiRandomPicks[type];
            if (!charDefault || !CARDS.characters[charDefault] || CARDS.characters[charDefault].type !== type) {
                var typeCandidates = allIds.filter(function(cid) {
                    return CARDS.characters[cid].type === type;
                });
                charDefault = typeCandidates.length > 0
                    ? typeCandidates[Math.floor(Math.random() * typeCandidates.length)]
                    : allIds[0];
            }

            html += '<select class="setup-character-select" id="setupChar' + p + '">';
            allIds.forEach(function(cid) {
                var ch = CARDS.characters[cid];
                if (ch.type !== type) return;
                var selected = (charDefault && cid === charDefault) ? ' selected' : '';
                html += '<option value="' + cid + '"' + selected + '>' + ch.name + ' — ' + ch.subtitle + '</option>';
            });
            html += '</select>';

            html += '</div>';
        }

        container.innerHTML = html;
    },

    /**
     * Toggle a seat between Human and AI.
     * Session 10b: Human seats have type priority over AI seats.
     */
    onToggleAI: function(playerIndex) {
        this._setupIsAI[playerIndex] = !this._setupIsAI[playerIndex];
        this.buildSetupPlayerSlots();
    },

    /**
     * When a player changes their type, update the stored type array.
     * Session 10b: For human players, this triggers AI auto-reassignment.
     */
    onSetupTypeChange: function(playerIndex) {
        var typeSel = document.getElementById('setupType' + playerIndex);
        if (!typeSel) return;
        this._setupTypes[playerIndex] = typeSel.value;
        this.buildSetupPlayerSlots();
    },

    /**
     * Character dropdown change — no-op, type enforcement is via type dropdown.
     */
    onSetupCharChange: function() {
    },

    onSetupStart: function() {
        var count = this._setupPlayerCount;
        var setupIsAI = this._setupIsAI;
        var playerConfigs = [];

        // Read all player selections from dropdowns/hidden inputs
        for (var p = 0; p < count; p++) {
            var sel = document.getElementById('setupChar' + p);
            if (!sel) break;
            var charId = sel.value;
            var ch = CARDS.getCharacter(charId);
            playerConfigs.push({
                characterId: charId,
                name: ch.name,
                isAI: setupIsAI[p],
            });
        }

        // Hide setup, init game, render
        this.els.setupModal.style.display = 'none';
        Game.init({ players: playerConfigs });
        try{ if(window.Sound){ Sound.music.start(); Sound.play('game-start'); } }catch(e){}
        this.renderAll();

        // Show takeover bar in multiplayer games
        var takeoverBar = document.getElementById('takeoverBar');
        var hasAI = setupIsAI.slice(0, count).some(function(ai) { return ai; });
        if (takeoverBar) {
            takeoverBar.style.display = (count > 1 || hasAI) ? 'flex' : 'none';
            this._updateTakeoverButton();
        }

        // If player 0 is AI, kick off AI turn
        if (Game.state.player.isAI) {
            setTimeout(function() {
                AI.takeTurn(function() { /* AI calls endTurn when done */ });
            }, 500);
        }
    },


    /* =========================================================
       SESSION 9: PASS DEVICE SCREEN
       Shown between turns in multiplayer to hide board state.
       ========================================================= */

    showPassDevice: function() {
        var player = Game.state.player;
        var turnNum = Game.state.turn.number;

        if (Game.state.phase === 'finalCraft') {
            this.els.passDeviceTitle.textContent = 'END GAME — ' + player.name;
            this.els.passDeviceMsg.textContent =
                'Pass to ' + player.name + ' for their final craft action.';
        } else {
            this.els.passDeviceTitle.textContent = player.name + '\'s Turn';
            this.els.passDeviceMsg.textContent =
                'Pass the device to ' + player.name + '. (Turn ' + turnNum + ')';
        }
        this.els.passDeviceModal.style.display = 'flex';
    },

    onPassDeviceContinue: function() {
        this.els.passDeviceModal.style.display = 'none';
        this.renderAll();
        if (Game.state.phase === 'finalCraft') {
            this.showFinalCraftPhase();
        }
    },


    /* =========================================================
       SESSION 9b: TAKEOVER / GIVE BACK
       Allows spectator to take control of a player (next turn)
       or hand control back to the AI.
       ========================================================= */

    /**
     * Toggle the current player between AI and human control.
     * Takes effect on the NEXT turn for that player.
     */
    onTakeoverToggle: function() {
        var player = Game.state.player;
        if (player.isAI) {
            // Mark this player to become human on their next turn
            player._pendingHuman = true;
            player._pendingAI = false;
        } else {
            // Mark this player to become AI on their next turn
            player._pendingAI = true;
            player._pendingHuman = false;
        }
        this._updateTakeoverButton();
    },

    /**
     * Update the takeover button text based on current player state.
     */
    _updateTakeoverButton: function() {
        var btn = document.getElementById('takeoverBtn');
        var bar = document.getElementById('takeoverBar');
        if (!btn || !bar) return;

        // Only show in multiplayer
        if (Game.state.playerCount <= 1) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = 'flex';

        var player = Game.state.player;
        if (player.isAI) {
            if (player._pendingHuman) {
                btn.textContent = 'Taking over ' + player.name + ' next turn...';
                btn.classList.add('active');
            } else {
                btn.textContent = 'Take Over ' + player.name;
                btn.classList.remove('active');
            }
        } else {
            if (player._pendingAI) {
                btn.textContent = 'Giving ' + player.name + ' to Computer next turn...';
                btn.classList.add('active');
            } else {
                btn.textContent = 'Give ' + player.name + ' to Computer';
                btn.classList.remove('active');
            }
        }
    },


    /* =========================================================
       SESSION 9: PLAYER INDICATOR BANNER
       Shows whose turn it is during multiplayer.
       ========================================================= */

    renderPlayerIndicator: function() {
        // --- Update sticky nav bar status ---
        var navName = document.getElementById('navPlayerName');
        var navPhase = document.getElementById('navPhase');
        var navScores = document.getElementById('navScoresBtn');

        if (!Game.state || !Game.state.player) {
            if (navName) navName.textContent = '';
            if (navPhase) navPhase.textContent = '';
            return;
        }

        var player = Game.state.player;
        var nameText = player.name;
        if (player.isAI) nameText += ' (CPU)';
        if (navName) navName.textContent = nameText;

        // Phase text
        var phaseMap = {
            chooseSpace: 'Choose Space',
            playerActions: 'Actions',
            restock: 'Restock',
            restockActions: 'Restock Actions',
            finalCraft: 'Final Craft',
            gameOver: 'Game Over',
        };
        var phaseText = phaseMap[Game.state.phase] || Game.state.phase || '';
        if (Game.state.phase !== 'gameOver') {
            phaseText = 'Turn ' + Game.state.turn.number + ' — ' + phaseText;
        }
        if (navPhase) navPhase.textContent = phaseText;

        // Show scores button when game is over
        if (navScores) {
            navScores.style.display = (Game.state.phase === 'gameOver') ? '' : 'none';
        }

        // Session 15: Show/hide the nav timer
        var navTimer = document.getElementById('navTimer');
        if (navTimer) {
            navTimer.style.display = (Game.state.gameStartTime && Game.state.phase !== 'gameOver') ? '' : 'none';
        }
    },

    /**
     * Session 15: Update the running game clock in the nav bar.
     * Called every 1s by Game's timer interval.
     */
    renderNavTimer: function() {
        var el = document.getElementById('navTimer');
        if (!el) return;
        if (!Game.state.gameStartTime) { el.style.display = 'none'; return; }
        el.textContent = Game.getGameTimeFormatted();
        el.style.display = '';
    },

    /**
     * Session 9b: Toggle the hamburger menu dropdown.
     */
    onNavMenuToggle: function() {
        var dd = document.getElementById('navMenuDropdown');
        if (!dd) return;
        var isOpen = dd.style.display !== 'none';
        dd.style.display = isOpen ? 'none' : '';

        // Close on outside click
        if (!isOpen) {
            var closeHandler = function(e) {
                if (!dd.contains(e.target) && e.target.id !== 'navMenuBtn') {
                    dd.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            // Delay so this click doesn't immediately close it
            setTimeout(function() {
                document.addEventListener('click', closeHandler);
            }, 10);
        }
    },

    /**
     * Session 9: Swap the player board image to match the active player's character.
     */
    updatePlayerBoard: function() {
        var img = this.els.playerBoardImage;
        if (!img) return;
        var src = Game.getPlayerBoardImage(Game.state.player.characterId);
        if (img.src !== src) img.src = src;
        img.alt = Game.state.player.name + '\'s Player Board';

        // Session 36: Hank's solo board is portrait, so at width:100% it towers over the
        // landscape player boards and breaks the side-by-side height match with the Yarn
        // Bazaar. Lock his board to the bazaar's rendered height (width auto, centered).
        var wrapper = img.closest('.player-board-wrapper');
        if (Game.state.player.isHank) {
            if (wrapper) wrapper.classList.add('hank-board');
            this._lockHankBoardHeight();
        } else {
            if (wrapper) wrapper.classList.remove('hank-board');
            img.style.height = ''; img.style.width = ''; img.style.margin = '';
        }

        // Session 15b: Update FO drawer tab colors on player switch
        this._updateDrawerCount();
    },

    /**
     * Session 36: Match Hank's portrait solo board to the Yarn Bazaar panel height
     * so the two side-by-side panels line up. Measures the live bazaar height.
     */
    _lockHankBoardHeight: function() {
        var img = this.els.playerBoardImage;
        if (!img || !(Game.state.player && Game.state.player.isHank)) return;
        var bz = document.querySelector('.board-section') || document.querySelector('.board-image');
        var h = bz ? Math.round(bz.getBoundingClientRect().height) : 0;
        if (h > 0) {
            img.style.height = h + 'px';
            img.style.width = 'auto';
            img.style.margin = '0 auto';
        }
    },


    /* =========================================================
       YARN BAZAAR RENDERING
       ========================================================= */

    /**
     * Render all 6 Bazaar slots based on Game.state.bazaar.
     */
    renderBazaar: function() {
        var container = this.els.bazaar;
        container.innerHTML = '';

        for (var i = 0; i < 6; i++) {
            var card = Game.state.bazaar[i];
            var slot = document.createElement('div');
            slot.className = 'bazaar-slot';
            slot.setAttribute('data-index', i);
            slot.setAttribute('tabindex', '0');

            if (card) {
                // Card present — show image
                var isSelected = Game.state.selectedSlots.has(i);
                if (isSelected) slot.classList.add('selected');

                // Session 6: Event and SR cards get special indicators
                if (card.type === 'event') {
                    slot.classList.add('bazaar-event');
                } else if (card.type === 'specialRequest') {
                    slot.classList.add('bazaar-sr');
                }

                var img = document.createElement('img');
                img.src = card.img;
                img.alt = card.name + (card.type === 'event' ? ' Event' : card.type === 'specialRequest' ? ' Special Request' : ' Yarn Card');
                slot.appendChild(img);

                // Session 21: Enhanced ARIA
                var slotLabel = 'Bazaar slot ' + (i + 1) + ': ' + card.name;
                if (isSelected) slotLabel += ' (selected)';
                if (card.type === 'yarn' && card.yarn) {
                    var yarnDesc = Object.keys(card.yarn).map(function(c) {
                        return card.yarn[c] + ' ' + c;
                    }).join(', ');
                    slotLabel += ' — gives ' + yarnDesc;
                }
                slot.setAttribute('aria-label', slotLabel);
                if (isSelected) slot.setAttribute('aria-selected', 'true');
                else slot.setAttribute('aria-selected', 'false');

                // Click handler — only for yarn cards during playerActions
                if (card.type === 'yarn') {
                    (function(index) {
                        slot.addEventListener('click', function() {
                            UI.onBazaarClick(index);
                        });
                    })(i);
                }

            } else {
                // Empty slot
                slot.classList.add('empty');

                // Session 9: Empty slots are clickable in MP (count as 1 any-color yarn)
                var emptyClickable = Game.state.playerCount > 1 &&
                    Game.state.phase === 'playerActions' &&
                    !Game.state.turn.shopDone &&
                    Game.state.shopLimit > 0;

                if (emptyClickable) {
                    var isEmptySel = Game.state.selectedSlots.has(i);
                    if (isEmptySel) slot.classList.add('selected');
                    slot.classList.add('empty-clickable');
                    (function(index) {
                        slot.addEventListener('click', function() {
                            UI.onBazaarClick(index);
                        });
                    })(i);
                }

                var label = document.createElement('span');
                label.className = 'empty-label';
                label.textContent = emptyClickable ? 'Any Color' : 'Empty';
                slot.appendChild(label);
            }

            container.appendChild(slot);
        }
    },

    /**
     * Handle click on a Bazaar card slot.
     */
    onBazaarClick: function(index) {
        // Guard: only allow clicks during playerActions (shopping)
        if (Game.state.phase !== 'playerActions') return;
        if (Game.state.player && Game.state.player.isAI) return;  // Ignore clicks during AI turn
        Game.toggleSlotSelection(index);
        this.renderBazaar();
        this.renderActionBar();
    },


    /* =========================================================
       ACTION BAR
       Session 5: 3-phase turn flow
         chooseSpace   → show action space selector buttons
         playerActions → show available actions & status chips
         restock       → show restock / end turn buttons
       ========================================================= */

    /**
     * Session 17 single-row redesign: renderActionBar manages a single element.
     * Layout: [ab-phase icon+label] [ab-divider] [ab-middle chips/status] [ab-buttons]
     */
    renderActionBar: function() {
        var bar = this.els.actionBar;
        var phase = Game.state.phase;

        // Session 34f: on a Computer (CPU) turn, show a passive status with NO
        // controls, so the human doesn't think they're supposed to act.
        var actor = Game.state.player;
        if (actor && actor.isAI &&
            (phase === 'chooseSpace' || phase === 'playerActions' ||
             phase === 'restock' || phase === 'finalCraft')) {
            this._renderComputerTurnBar(bar, actor);
            this._renderActionGridOverlay('active');
            this._renderTangledCatBanner();
            return;
        }

        if (phase === 'gameOver') {
            this._renderGameOverBar(bar);
            this._renderActionGridOverlay('active');
        } else if (phase === 'chooseSpace') {
            this._renderChooseSpaceBar(bar);
        } else if (phase === 'playerActions') {
            this._renderPlayerActionsBar(bar);
            this._renderActionGridOverlay('active');
        } else if (phase === 'restock') {
            this._renderRestockBar(bar);
            this._renderActionGridOverlay('active');
        } else if (phase === 'finalCraft') {
            this.showFinalCraftPhase();
            this._renderActionGridOverlay('active');
        } else {
            bar.innerHTML =
                '<div class="ab-phase">' +
                    '<span class="ab-phase-icon">🎲</span>' +
                    '<span class="ab-phase-label">Ready</span>' +
                '</div>' +
                '<div class="ab-divider"></div>' +
                '<div class="ab-middle">' +
                    '<span class="ab-status-text">Start a new game from the menu</span>' +
                '</div>';
            this._renderActionGridOverlay('active');
        }

        // Session 18: Persistent tangled cat banner — visible for the entire turn
        this._renderTangledCatBanner();
    },

    /**
     * Session 34f: passive action bar shown during a Computer (CPU) turn.
     * No buttons — just a clear status so the human knows it isn't their move.
     */
    _renderComputerTurnBar: function(bar, player) {
        var turnNum = (Game.state.turn && Game.state.turn.number) || '';
        bar.innerHTML =
            '<div class="ab-phase">' +
                '<span class="ab-phase-icon">🧶</span>' +
                '<span class="ab-phase-label">Turn ' + turnNum + '</span>' +
            '</div>' +
            '<div class="ab-divider"></div>' +
            '<div class="ab-middle">' +
                '<span class="ab-status-text ab-cpu-status">' +
                    '<span class="ab-cpu-dot"></span>' +
                    (player.name || 'Computer') + ' is playing…' +
                '</span>' +
            '</div>';
    },

    /**
     * Session 18: Render or hide the persistent tangled cat banner.
     * Shows above the action bar for the entire turn when the active player
     * has cantCraftNextTurn (Tangled Cat penalty).
     */
    _renderTangledCatBanner: function() {
        var banner = document.getElementById('tangledCatBanner');
        if (!banner) return;
        var player = Game.state.player;
        if (player && player.cantCraftNextTurn && Game.state.phase !== 'gameOver') {
            banner.innerHTML =
                '<img class="tangled-cat-banner-img" src="Other Images Textures Details/AR_cat_meeple_GRAY_3D.png" alt="Tangled Cat">' +
                '<span class="tangled-cat-banner-text">' +
                    '<strong>Tangled Cat!</strong> ' + (player.name || 'Player') + ' can\'t Craft this turn.' +
                '</span>' +
                '<img class="tangled-cat-banner-img" src="Other Images Textures Details/AR_cat_meeple_GRAY_3D.png" alt="">';
            banner.style.display = '';
        } else {
            banner.style.display = 'none';
        }
    },

    /**
     * Render the action bar for the chooseSpace phase.
     * Single row: turn number, instruction, optional warnings inline.
     */
    _renderChooseSpaceBar: function(bar) {
        var spaces = Game.getActionSpaces();
        var turnNum = Game.state.turn.number;

        // Middle content: status text + optional warnings
        var middleHtml = '<span class="ab-status-text">Choose an action space on the board</span>';

        // Session 18: Tangled Cat warning moved to persistent banner above action bar
        if (Game.state.player.freeCraftBonus) {
            middleHtml += '<span class="ab-warning ab-warning-bonus">🎉 +1 bonus Craft action</span>';
        }

        bar.innerHTML =
            '<div class="ab-phase">' +
                '<span class="ab-phase-icon">📍</span>' +
                '<span class="ab-phase-label">Turn ' + turnNum + '</span>' +
            '</div>' +
            '<div class="ab-divider"></div>' +
            '<div class="ab-middle">' + middleHtml + '</div>';

        // Render the 4 action buttons onto the board's printed 2×2 grid
        this._renderActionGridOverlay('choose', spaces);
    },

    /**
     * Session 20: Icon path base for action grid icons.
     */
    _actionIconBase: 'Other Images Textures Details/Icons - Action/',

    /**
     * Session 20: Map an action space definition to one or two icon filenames.
     * Returns an array of 1-2 icon filenames (for combo spaces, top icon first).
     * @param {Object} space — action space object from character definition
     * @returns {string[]} array of icon filenames
     */
    _getActionIcons: function(space) {
        var icons = [];

        // Unique abilities with dedicated icons
        if (space.unique === 'take3Yarn') {
            icons.push('Take3onecolor.png');
            if (space.craft) icons.push('Craft1.png');
            return icons;
        }
        if (space.unique === 'take5AnyCraft1Any') {
            icons.push('take5any.png');
            icons.push('Craft1Any.png');
            return icons;
        }
        if (space.unique === 'makeTwoItems') {
            icons.push('Craft1make2.png');
            return icons;
        }

        // Exchange
        if (space.exchange) {
            icons.push('Exchange.png');
            return icons;
        }

        // Shop-only or Shop+Craft combo
        if (space.shop) {
            icons.push('Shop' + space.shop + '.png');
        }
        if (space.craft) {
            if (space.unique === 'craftAnyColors') {
                icons.push('Craft1Any.png');
            } else {
                icons.push('Craft' + space.craft + '.png');
            }
        }

        return icons;
    },

    /**
     * Render the 2×2 action space grid overlay on the player board.
     *
     * Session 20: Redesigned with icon images + small text labels.
     * Combo spaces show icons stacked vertically.
     *
     * mode 'choose' — 4 clickable buttons (unavailable space greyed out)
     * mode 'active' — selected space shown in gold, others dimmed (read-only)
     *
     * @param {string} mode   'choose' | 'active'
     * @param {Array}  spaces Array from Game.getActionSpaces() (only needed for 'choose')
     */
    _renderActionGridOverlay: function(mode, spaces) {
        var overlay = this.els.actionGridOverlay;
        if (!overlay) return;
        overlay.innerHTML = '';

        // Session 36: Hank boss — his solo-board art already depicts his actions, and
        // the human never selects on it. Render his board clean, with NO icon overlay.
        if (Game.state.player && Game.state.player.isHank) {
            overlay.classList.remove('action-grid-3');
            return;
        }

        var allSpaces = spaces || Game.getActionSpaces();

        // Expert has 3 action spaces — switch to single-column layout
        overlay.classList.toggle('action-grid-3', allSpaces.length === 3);

        // Session 13: Apply character type color class to overlay
        var typeOrder = this._typeOrder;
        for (var t = 0; t < typeOrder.length; t++) {
            overlay.classList.remove('action-type-' + typeOrder[t]);
        }
        var character = Game.getCharacter();
        if (character && character.type) {
            overlay.classList.add('action-type-' + character.type);
        }

        var currentSpace = Game.state.turn.currentSpace;
        var iconBase = this._actionIconBase;
        var self = this;

        allSpaces.forEach(function(space) {
            var btn = document.createElement('button');
            btn.className = 'action-grid-btn';

            // Session 20: Build icon + label content
            var icons = self._getActionIcons(space);
            var isCombo = icons.length > 1;

            var iconsDiv = document.createElement('div');
            iconsDiv.className = 'action-grid-icons' + (isCombo ? ' action-grid-combo' : '');

            for (var i = 0; i < icons.length; i++) {
                var img = document.createElement('img');
                img.src = iconBase + icons[i];
                img.alt = space.label;
                img.className = 'action-grid-icon';
                img.draggable = false;
                if (isCombo) {
                    img.classList.add('action-grid-icon-sm');
                }
                iconsDiv.appendChild(img);
            }
            btn.appendChild(iconsDiv);

            // aria-label for accessibility (no visible text — icons are self-descriptive)
            btn.setAttribute('aria-label', space.label);

            if (mode === 'choose') {
                if (!space.available) {
                    btn.classList.add('action-grid-unavailable');
                    btn.disabled = true;
                } else {
                    (function(idx) {
                        btn.addEventListener('click', function() { UI.onChooseSpace(idx); });
                    })(space.index);
                }
            } else {
                // Active / read-only display
                btn.disabled = true;
                if (space.index === currentSpace) {
                    btn.classList.add('action-grid-selected');
                } else {
                    btn.classList.add('action-grid-other');
                }
            }
            overlay.appendChild(btn);
        });
    },

    /**
     * Render the action bar for the playerActions phase.
     * Single row: turn/space label, action chips inline, buttons right.
     */
    _renderPlayerActionsBar: function(bar) {
        var actions = Game.getAvailableActions();
        var selCount = Game.state.selectedSlots.size;
        var turnNum = Game.state.turn.number;
        var character = Game.getCharacter();
        var spaceIdx = Game.state.turn.currentSpace;
        var spaceLabel = character.actionSpaces[spaceIdx].label;

        // --- Build chips (inline in middle) ---
        var chipsHtml = '';

        if (actions.shopLimit > 0) {
            if (actions.canShop) {
                chipsHtml += '<span class="action-chip shop-chip">🛍️ Shop: ' +
                    selCount + '/' + actions.shopLimit + '</span>';
            } else {
                chipsHtml += '<span class="action-chip done-chip">🛍️ Shop ✓</span>';
            }
        }
        if (actions.craftLimit > 0) {
            if (actions.canCraft) {
                chipsHtml += '<span class="action-chip craft-chip">🧶 Craft: ' +
                    actions.craftUsed + '/' + actions.craftLimit + '</span>';
            } else {
                chipsHtml += '<span class="action-chip done-chip">🧶 Craft ✓</span>';
            }
        }
        if (Game.state.hasExchange) {
            if (actions.canExchange) {
                chipsHtml += '<span class="action-chip exchange-chip">🔄 Exchange</span>';
            } else {
                chipsHtml += '<span class="action-chip done-chip">🔄 Exchange ✓</span>';
            }
        }
        if (Game.state.craftAnyColors && actions.canCraft) {
            chipsHtml += '<span class="action-chip bonus-chip">🌈 Any Colors</span>';
        }
        if (Game.state.makeTwoItems && actions.canCraft) {
            chipsHtml += '<span class="action-chip bonus-chip">✨ Make Two</span>';
        }
        var srCount = Game.state.player.specialRequests.length;
        if (srCount > 0) {
            chipsHtml += '<span class="action-chip sr-chip">📋 ' + srCount + ' Request' + (srCount !== 1 ? 's' : '') + '</span>';
        }
        // Session 18: Tangled Cat warning moved to persistent banner above action bar

        // --- Build buttons (right side) ---
        var buttonsHtml = '';
        if (actions.canShop && selCount > 0) {
            buttonsHtml += '<button class="btn btn-primary" onclick="UI.onTakeYarn()">Take Yarn</button>';
        }
        if (actions.canExchange) {
            buttonsHtml += '<button class="btn btn-primary" onclick="UI.showExchangeModal()">Exchange Yarn</button>';
        }
        var noActionsTaken = !Game.state.turn.shopDone &&
            Game.state.turn.craftUsed === 0 &&
            !Game.state.turn.exchangeDone;
        if (noActionsTaken) {
            buttonsHtml += '<button class="btn btn-link" onclick="UI.onChangeSpace()" style="font-size:13px">↩ Change</button>';
        }
        buttonsHtml += '<button class="btn btn-cta" onclick="UI.onEndActions()">End Actions →</button>';

        bar.innerHTML =
            '<div class="ab-phase">' +
                '<span class="ab-phase-icon">⚡</span>' +
                '<span class="ab-phase-label">Turn ' + turnNum + ' — ' + spaceLabel + '</span>' +
            '</div>' +
            '<div class="ab-divider"></div>' +
            '<div class="ab-middle">' + chipsHtml + '</div>' +
            '<div class="ab-buttons">' + buttonsHtml + '</div>';
    },

    /**
     * Render the action bar for the restock phase.
     * Single row: phase label, status text, bonus action buttons inline, end button right.
     */
    _restockDone: false,

    _renderRestockBar: function(bar) {
        var emptyCount = 6 - Game.bazaarCardCount();
        var deckLeft = Game.state.deck.length;

        // Status text in middle
        var statusText = this._restockDone
            ? (emptyCount === 0 ? 'Bazaar full' : 'Restocked')
            : emptyCount + ' empty · ' + deckLeft + ' in deck';

        // Middle content: status text + bonus action buttons (inline)
        var middleHtml = '<span class="ab-status-text">' + statusText + '</span>';

        if (this._restockDone) {
            var completable = Game.getCompletableProjects();
            var learnable   = Game.getLearnablePatterns();
            var frogable    = Game.getFrogItItems();

            if (completable.length > 0) {
                middleHtml +=
                    '<button class="btn btn-accent" onclick="UI.showFinishProjectModal()" style="font-size:12px;padding:4px 10px">' +
                        '🏆 Finish Project (' + completable.length + ')' +
                    '</button>';
            }
            if (learnable.length > 0) {
                middleHtml +=
                    '<button class="btn btn-accent" onclick="UI.showLearnPatternModal()" style="font-size:12px;padding:4px 10px">' +
                        '📖 Learn Pattern (' + learnable.length + ')' +
                    '</button>';
            }
            if (frogable.length > 0) {
                middleHtml +=
                    '<button class="btn btn-warn" onclick="UI.showFrogItModal()" style="font-size:12px;padding:4px 10px">' +
                        '🐸 Frog It (' + frogable.length + ')' +
                    '</button>';
            }
        }

        // Main forward button (right side)
        var mainButtonHtml;
        if (this._restockDone) {
            mainButtonHtml =
                '<button class="btn btn-cta" onclick="UI.onEndRestockTurn()">End Turn →</button>';
        } else if (emptyCount === 0 || deckLeft === 0) {
            mainButtonHtml =
                '<button class="btn btn-cta" onclick="UI.onSkipRestock()">Skip Restock →</button>';
        } else {
            mainButtonHtml =
                '<button class="btn btn-cta" onclick="UI.onRestock()">Restock Bazaar</button>';
        }

        bar.innerHTML =
            '<div class="ab-phase">' +
                '<span class="ab-phase-icon">📦</span>' +
                '<span class="ab-phase-label">Restock</span>' +
            '</div>' +
            '<div class="ab-divider"></div>' +
            '<div class="ab-middle">' + middleHtml + '</div>' +
            '<div class="ab-buttons">' + mainButtonHtml + '</div>';
    },


    /**
     * Session 8c / 17: Render the action bar for the gameOver phase.
     * Single row: trophy icon, summary text, score + play-again buttons.
     */
    _renderGameOverBar: function(bar) {
        var turnNum = Game.state.turn.number;
        var summaryText = 'Finished after ' + turnNum + ' turns';

        if (Game.state.playerCount > 1) {
            var bestScore = -999;
            var winner = '';
            Game.state.players.forEach(function(p) {
                var s = Game.calculateFinalScore(p);
                if (s.total > bestScore) { bestScore = s.total; winner = p.name; }
            });
            summaryText = winner + ' wins with ' + bestScore + ' pts!';
        }

        bar.innerHTML =
            '<div class="ab-phase">' +
                '<span class="ab-phase-icon">🏆</span>' +
                '<span class="ab-phase-label">Game Over!</span>' +
            '</div>' +
            '<div class="ab-divider"></div>' +
            '<div class="ab-middle">' +
                '<span class="ab-status-text">' + summaryText + '</span>' +
            '</div>' +
            '<div class="ab-buttons">' +
                '<button class="btn btn-primary" onclick="UI.showGameOverModal()">View Final Scores</button>' +
                '<button class="btn btn-secondary" onclick="UI.onNewGame()">' +
                    ((window.Story && Story.storyGame) ? 'On to the climb →' : 'Play Again') +
                '</button>' +
            '</div>';
    },

    /**
     * Session 15: Enhanced end-game scorecard — port of approved mockup design.
     * Features: type-tinted columns, expandable detail rows (crafted items,
     * SR cards, projects, learned tiles), game stats bar, point tag assets,
     * dynamic modal width per player count, per-player avg turn time.
     */
    showGameOverModal: function() {
        var self = this;
        var html = '';

        // Helper: hex color → rgba at given alpha
        function hexToRgba(hex, alpha) {
            var r = parseInt(hex.slice(1,3), 16);
            var g = parseInt(hex.slice(3,5), 16);
            var b = parseInt(hex.slice(5,7), 16);
            return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        }

        var MEDALS = ['🥇','🥈','🥉','4th','5th','6th'];
        var typeNames = self._typeNames;
        var typeIcons = self._typeIcons;
        var typeAccents = self._typeAccentColors;

        // Item token images
        var ITEM_IMGS = {
            hat:     'Item Token PNG/Item_Tokens_Final_0000_hat.png',
            bear:    'Item Token PNG/Item_Tokens_Final_0001_bear.png',
            mittens: 'Item Token PNG/Item_Tokens_Final_0002_mittens.png',
            scarf:   'Item Token PNG/Item_Tokens_Final_0003_scarf.png',
            blanket: 'Item Token PNG/Item_Tokens_Final_0004_blanket.png',
        };

        // Calculate all player scores with detail data
        var allScores = [];
        Game.state.players.forEach(function(player) {
            var score = Game.calculateFinalScore(player);
            allScores.push({ player: player, score: score });
        });
        allScores.sort(function(a, b) { return b.score.total - a.score.total; });

        var winner = allScores[0];
        var playerCount = allScores.length;
        var winWho = winner.player.isAI ? 'CPU' : winner.player.name;

        // Winner banner
        html += '<div class="go-winner-banner">';
        html += '<div class="go-winner-medal">🥇</div>';
        html += '<div class="go-winner-name">' + winner.player.name + ' <span class="go-winner-who">(' + winWho + ')</span> Wins!</div>';
        html += '<div class="go-winner-score"><span class="pt-tag pt-lg pt-winner"><span class="pt-tag-value">' + winner.score.total + '</span></span> points</div>';
        html += '</div>';

        // Game stats bar
        var totalTurns = Game.state.turn.number;
        var rounds = Math.ceil(totalTurns / playerCount);
        var gameTime = Game.getGameTimeFormatted();
        html += '<div class="go-game-stats">';
        html += '<div class="go-stat"><div class="go-stat-value">' + rounds + '</div><div class="go-stat-label">Rounds</div></div>';
        html += '<div class="go-stat"><div class="go-stat-value">' + totalTurns + '</div><div class="go-stat-label">Turns</div></div>';
        html += '<div class="go-stat"><div class="go-stat-value">' + gameTime + '</div><div class="go-stat-label">Game Time</div></div>';
        html += '</div>';

        // Score table
        html += '<table class="go-score-table">';

        // Header row: blank + player columns
        html += '<thead><tr><th class="go-cat-header"></th>';
        allScores.forEach(function(entry, rank) {
            var p = entry.player;
            var typeId = p.characterType;
            var typeName = typeNames[typeId] || typeId;
            var typeIcon = typeIcons[typeId] || '';
            var typeColor = typeAccents[typeId] || '#555';
            var colBg = hexToRgba(typeColor, 0.10);
            html += '<th class="go-player-header" style="background:' + colBg + '">';
            html += '<span class="go-player-rank">' + MEDALS[rank] + '</span>';
            if (typeIcon) html += '<img class="go-player-type-icon" src="' + typeIcon + '" alt="' + typeName + '">';
            html += '<span class="go-player-charname">' + p.name + '</span>';
            html += '<span class="go-player-type" style="color:' + typeColor + '">' + typeName + '</span>';
            if (p.isAI) {
                html += '<span class="go-player-who go-who-ai">CPU</span>';
            } else {
                html += '<span class="go-player-who go-who-human">Human</span>';
            }
            html += '<span class="go-player-time">' + Game.getAvgTurnTimeFormatted(p) + ' avg</span>';
            html += '</th>';
        });
        html += '</tr></thead>';

        html += '<tbody>';

        // Row definitions — expandable rows first, then favorite/penalties
        var rows = [
            { img: 'Other Images Textures Details/Icons - Action/VectorIcons_trans-01.png', label: 'Crafted Items', key: 'items', expandable: true, detailType: 'crafted' },
            { icon: '📋', label: 'Special Requests', key: 'specialRequests', extra: 'srCount', expandable: true, detailType: 'cards' },
            { icon: '🏆', label: 'Projects', key: 'projects', expandable: true, detailType: 'projectCards' },
            { icon: '🔄', label: 'Learned Patterns', key: 'learnedTiles', expandable: true, detailType: 'tiles' },
            { img: 'Other Images Textures Details/Details and Borders/heart.png', label: 'Favorite Bonus', key: 'favoriteBonus', isFav: true },
            { icon: '⚠',  label: 'SR Penalty', key: 'srPenalty', isPenalty: true },
            { img: 'Other Images Textures Details/Icons - Action/VectorIcons_trans-02.png', label: 'Yarn Penalty', key: 'yarnPenalty', isPenalty: true },
        ];

        var SR_COMPACT_THRESHOLD = 3;

        rows.forEach(function(row, rIdx) {
            var detailId = 'go-detail-' + rIdx;
            var isExpandable = row.expandable;

            // Score row
            var trAttr = isExpandable ? ' class="go-cat-expandable" onclick="UI._toggleScoreDetail(\'' + detailId + '\', this)"' : '';
            html += '<tr' + trAttr + '>';

            // Category cell
            var iconHtml = row.img
                ? '<img class="go-cat-icon-img" src="' + row.img + '" alt="">'
                : '<span class="go-cat-icon">' + row.icon + '</span>';
            var arrowHtml = isExpandable ? '<span class="go-expand-arrow">&#9654;</span>' : '';
            html += '<td class="go-cat-cell"><div class="go-cat-inner"><span class="go-cat-icons">' + arrowHtml + iconHtml + '</span><span class="go-cat-label">' + row.label + '</span></div></td>';

            // Value cells for each player
            allScores.forEach(function(entry) {
                var s = entry.score;
                var p = entry.player;
                var typeColor = typeAccents[p.characterType] || '#555';
                var colBg = hexToRgba(typeColor, 0.10);
                var val = s[row.key];

                if (row.isFav) {
                    if (s.favoriteWon) {
                        html += '<td class="go-val-cell" style="background:' + colBg + '"><span class="go-fav-yes">' + val + ' ✓</span></td>';
                    } else {
                        html += '<td class="go-val-cell" style="background:' + colBg + '"><span style="color:var(--text-muted)">—</span></td>';
                    }
                } else if (row.isPenalty) {
                    if (val === 0) {
                        html += '<td class="go-val-cell" style="background:' + colBg + '">—</td>';
                    } else {
                        html += '<td class="go-val-cell go-penalty" style="background:' + colBg + '">−' + Math.abs(val) + '</td>';
                    }
                } else {
                    var suffix = row.extra ? ' <span class="go-fav-detail">(' + s[row.extra] + ')</span>' : '';
                    html += '<td class="go-val-cell" style="background:' + colBg + '">' + val + suffix + '</td>';
                }
            });
            html += '</tr>';

            // Detail row (hidden by default)
            if (isExpandable) {
                html += '<tr class="go-detail-row" id="' + detailId + '" style="display:none">';
                html += '<td class="go-detail-cat-cell"></td>';

                allScores.forEach(function(entry) {
                    var s = entry.score;
                    var p = entry.player;
                    var typeColor = typeAccents[p.characterType] || '#555';
                    var colBgDetail = hexToRgba(typeColor, 0.05);
                    html += '<td class="go-detail-td" style="background:' + colBgDetail + '">';

                    if (row.detailType === 'crafted') {
                        html += '<div class="go-detail-chips">';
                        if (s.craftedItemDetails.length === 0) {
                            html += '<span class="go-detail-chip" style="opacity:0.5">None</span>';
                        }
                        s.craftedItemDetails.forEach(function(item) {
                            var imgSrc = ITEM_IMGS[item.id] || item.img || '';
                            html += '<span class="go-crafted-item">';
                            if (imgSrc) html += '<img class="go-crafted-icon" src="' + imgSrc + '" alt="' + item.name + '">';
                            html += item.name;
                            if (item.count > 1) html += ' <span class="go-crafted-count">×' + item.count + '</span>';
                            html += '</span>';
                        });
                        html += '</div>';

                    } else if (row.detailType === 'cards') {
                        var cards = s.srCardDetails || [];
                        if (cards.length === 0) {
                            html += '<span class="go-detail-chip" style="opacity:0.5">None</span>';
                        } else if (cards.length > SR_COMPACT_THRESHOLD) {
                            // Compact lines mode
                            html += '<div class="go-sr-lines">';
                            cards.forEach(function(card) {
                                var cls = card.completed ? 'completed' : 'failed';
                                var badge = card.completed ? '✓' : '✗';
                                var ptsDisplay = card.points < 0 ? '−' + Math.abs(card.points) : '+' + card.points;
                                var ptsCls = card.points < 0 ? ' pt-penalty' : '';
                                html += '<div class="go-sr-line">';
                                html += '<span class="go-sr-line-status ' + cls + '">' + badge + '</span>';
                                if (card.isFavorite) html += '<span class="go-sr-line-fav">♥</span>';
                                html += '<span class="go-sr-line-name">' + card.name + '</span>';
                                html += '<span class="pt-tag pt-sm' + ptsCls + '"><span class="pt-tag-value">' + ptsDisplay + '</span></span>';
                                html += '</div>';
                            });
                            html += '</div>';
                        } else {
                            // Card view
                            html += '<div class="go-sr-cards">';
                            cards.forEach(function(card) {
                                var cls = card.completed ? 'completed' : 'failed';
                                var badge = card.completed ? '✓' : '✗';
                                var ptsCls = card.points < 0 ? ' pt-penalty' : '';
                                var ptsDisplay = card.points < 0 ? '−' + Math.abs(card.points) : card.points;
                                html += '<div class="go-sr-card ' + cls + '" onclick="event.stopPropagation(); UI._openSRZoom(this)">';
                                if (card.isFavorite) html += '<div class="go-sr-fav-badge">♥</div>';
                                html += '<div class="go-sr-badge">' + badge + '</div>';
                                html += '<img src="' + card.img + '" alt="' + card.name + '">';
                                html += '<div class="go-sr-card-label">' + card.name + ' <span class="pt-tag pt-sm' + ptsCls + '"><span class="pt-tag-value">' + ptsDisplay + '</span></span></div>';
                                html += '</div>';
                            });
                            html += '</div>';
                        }

                    } else if (row.detailType === 'projectCards') {
                        var projects = s.projectDetails || [];
                        if (projects.length === 0) {
                            html += '<span class="go-detail-chip" style="opacity:0.5">None</span>';
                        } else {
                            html += '<div class="go-sr-cards">';
                            projects.forEach(function(proj) {
                                html += '<div class="go-sr-card completed" onclick="event.stopPropagation(); UI._openSRZoom(this)">';
                                html += '<div class="go-sr-badge">✓</div>';
                                html += '<img src="' + proj.img + '" alt="' + proj.name + '">';
                                html += '<div class="go-sr-card-label">' + proj.name + ' <span class="pt-tag pt-sm"><span class="pt-tag-value">' + proj.points + '</span></span></div>';
                                html += '</div>';
                            });
                            html += '</div>';
                        }

                    } else if (row.detailType === 'tiles') {
                        var tiles = s.learnedTileDetails || [];
                        html += '<div class="go-learned-tiles">';
                        tiles.forEach(function(tile) {
                            var tileClass = tile.learned ? 'is-learned' : 'not-learned';
                            var tileImg = tile.learned ? (tile.backImg || tile.img) : tile.img;
                            var statusClass = tile.learned ? 'learned' : 'unlearned';
                            var statusText = tile.learned ? '✓ +' + tile.points + 'pts' : 'Not learned';
                            var itemName = tile.itemId.charAt(0).toUpperCase() + tile.itemId.slice(1);
                            html += '<div class="go-learned-tile ' + tileClass + '">';
                            if (tileImg) html += '<img class="go-tile-img" src="' + tileImg + '" alt="' + itemName + ' pattern">';
                            html += '<div class="go-tile-info">';
                            html += '<div class="go-tile-name">' + itemName + '</div>';
                            html += '<div class="go-tile-status ' + statusClass + '">' + statusText + '</div>';
                            html += '</div>';
                            html += '</div>';
                        });
                        html += '</div>';
                    }

                    html += '</td>';
                });

                html += '</tr>';
            }
        });

        // Total row
        html += '<tr class="go-total-row">';
        html += '<td class="go-cat-cell go-total-label">⭐ Total</td>';
        allScores.forEach(function(entry, rank) {
            var p = entry.player;
            var typeColor = typeAccents[p.characterType] || '#555';
            var colBg = hexToRgba(typeColor, 0.10);
            var winnerTag = (rank === 0) ? ' pt-winner' : '';
            html += '<td class="go-total-val" style="background:' + colBg + '"><span class="pt-tag pt-total' + winnerTag + '"><span class="pt-tag-value">' + entry.score.total + '</span></span></td>';
        });
        html += '</tr>';

        html += '</tbody></table>';

        // Reuse the event modal for this display
        var modalContent = this.els.eventModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('go-modal-wide');
            modalContent.classList.add('go-players-' + playerCount);
        }
        this.els.eventCardImg.style.display = 'none';
        this.els.eventTitle.textContent = '🏆 Game Over!';
        this.els.eventMsg.innerHTML = html;
        this.els.eventExtraBody.innerHTML = '';
        // Session 15c: Close + New Game buttons
        this.els.eventOkBtn.textContent = 'Close';
        this.els.eventOkBtn.onclick = function() {
            UI.els.eventModal.style.display = 'none';
            UI.els.eventCardImg.style.display = '';
            UI.els.eventOkBtn.textContent = 'Continue →';
            UI.els.eventOkBtn.onclick = null;
            if (modalContent) {
                modalContent.classList.remove('go-modal-wide');
                modalContent.classList.remove('go-players-' + playerCount);
            }
            var newGameBtn = document.getElementById('goNewGameBtn');
            if (newGameBtn) newGameBtn.remove();
            var zoom = document.getElementById('goSRZoomBackdrop');
            if (zoom) zoom.remove();
        };
        // Add New Game button next to Close
        var existingNewGame = document.getElementById('goNewGameBtn');
        if (existingNewGame) existingNewGame.remove();
        var newGameBtn = document.createElement('button');
        newGameBtn.id = 'goNewGameBtn';
        newGameBtn.className = 'btn btn-primary go-new-game-btn';
        newGameBtn.textContent = 'New Game';
        newGameBtn.onclick = function() {
            UI.els.eventModal.style.display = 'none';
            UI.els.eventCardImg.style.display = '';
            UI.els.eventOkBtn.textContent = 'Continue →';
            UI.els.eventOkBtn.onclick = null;
            if (modalContent) {
                modalContent.classList.remove('go-modal-wide');
                modalContent.classList.remove('go-players-' + playerCount);
            }
            newGameBtn.remove();
            var zoom = document.getElementById('goSRZoomBackdrop');
            if (zoom) zoom.remove();
            UI.onNewGame();
        };
        this.els.eventOkBtn.parentNode.insertBefore(newGameBtn, this.els.eventOkBtn);
        this.els.eventModal.style.display = 'flex';

        // Add zoom lightbox to body (for SR/project card zoom)
        if (!document.getElementById('goSRZoomBackdrop')) {
            var zoomHTML = '<div class="go-sr-zoom-backdrop" id="goSRZoomBackdrop" onclick="UI._closeSRZoom()">';
            zoomHTML += '<div class="go-sr-zoom-inner" onclick="event.stopPropagation()">';
            zoomHTML += '<img id="goSRZoomImg" src="" alt="">';
            zoomHTML += '<div class="go-sr-zoom-label" id="goSRZoomLabel"></div>';
            zoomHTML += '<div class="go-sr-zoom-hint">click anywhere to close</div>';
            zoomHTML += '</div></div>';
            document.body.insertAdjacentHTML('beforeend', zoomHTML);
        }
    },

    /**
     * Session 15: Toggle detail row visibility in the scorecard.
     */
    _toggleScoreDetail: function(detailId, rowEl) {
        var detailRow = document.getElementById(detailId);
        var arrow = rowEl.querySelector('.go-expand-arrow');
        if (!detailRow) return;
        if (detailRow.style.display === 'none') {
            detailRow.style.display = '';
            if (arrow) arrow.innerHTML = '&#9660;';
        } else {
            detailRow.style.display = 'none';
            if (arrow) arrow.innerHTML = '&#9654;';
        }
    },

    /**
     * Session 15: Open SR/project card zoom lightbox.
     */
    _openSRZoom: function(card) {
        var img = card.querySelector('img');
        var label = card.querySelector('.go-sr-card-label');
        var isFav = card.querySelector('.go-sr-fav-badge');
        var isCompleted = card.classList.contains('completed');
        document.getElementById('goSRZoomImg').src = img ? img.src : '';
        var name = img ? img.alt : '';
        var ptTag = label ? label.querySelector('.pt-tag') : null;
        var ptVal = ptTag ? ptTag.querySelector('.pt-tag-value') : null;
        var ptsText = ptVal ? ptVal.textContent : '';
        var ptsCls = ptTag && ptTag.classList.contains('pt-penalty') ? ' pt-penalty' : '';
        var h = '';
        if (isFav) h += '<span class="zoom-fav">♥</span>';
        h += name;
        if (ptsText) {
            h += ' <span class="pt-tag pt-md' + ptsCls + '" style="transform:rotate(6deg);vertical-align:middle"><span class="pt-tag-value">' + ptsText + '</span></span>';
        }
        var statusText = isCompleted ? '✓ Completed' : '✗ Not Completed';
        h += '<span class="zoom-status">' + statusText + '</span>';
        document.getElementById('goSRZoomLabel').innerHTML = h;
        document.getElementById('goSRZoomBackdrop').classList.add('active');
    },

    /**
     * Session 15: Close the SR/project card zoom lightbox.
     */
    _closeSRZoom: function() {
        var el = document.getElementById('goSRZoomBackdrop');
        if (el) el.classList.remove('active');
    },

    /**
     * Session 8c: Reset the game and start over.
     */
    onNewGame: function() {
        // "New Game" returns to the clean main screen (landing) — no game running underneath.
        this.returnToMainMenu();
    },

    returnToMainMenu: function() {
        // 1) Invalidate any in-flight game/AI turn so stray renders + SOUNDS stop firing
        Game._gen = (Game._gen || 0) + 1;
        if (Game.state && Game.state._timerInterval) { clearInterval(Game.state._timerInterval); Game.state._timerInterval = null; }
        // 2) Exit Story mode
        if (window.Story) { Story.storyGame = false; Story.active = false; }
        // 3) Close the nav menu + any open modals / dropdowns
        var dd = document.getElementById('navMenuDropdown'); if (dd) dd.style.display = 'none';
        ['setupModal','gameOverModal','eventModal','srModal','passDeviceModal'].forEach(function(k){
            var el = UI.els[k]; if (el) el.style.display = 'none';
        });
        // 4) Hide in-game nav bits (player cards)
        var ps = document.getElementById('playerStrip'); if (ps) ps.style.display = 'none';
        // 5) Show the landing (main) screen — full-screen overlay covers the board
        var landing = document.getElementById('landingScreen'); if (landing) landing.style.display = '';
    },


    /* =========================================================
       ACTION SPACE SELECTION
       ========================================================= */

    /**
     * Handle clicking an action space button.
     * Session 8c: intercepts unique abilities that need modal input
     * before normal playerActions begin.
     */
    /**
     * Session 9b: Go back to space selection (undo the current space choice).
     * Only allowed if no actions have been taken yet.
     */
    onChangeSpace: function() {
        Game.undoSpaceChoice();
    },

    onChooseSpace: function(spaceIndex) {
        // Guard: only allow during chooseSpace phase, and not during AI turn
        if (Game.state.phase !== 'chooseSpace') return;
        if (Game.state.player && Game.state.player.isAI) return;
        Game.chooseActionSpace(spaceIndex);
        // Game.chooseActionSpace already triggers UI re-renders

        // Session 8c: take3Yarn — show color picker to gain 3 yarn before actions
        if (Game.state.pendingTake3Yarn) {
            UI.showColorPicker(function(color) {
                var changed = Game.applyTake3Yarn(color);
                UI.renderYarnBowl(changed);
                UI.renderCraftGrid();
                UI.renderSpecialRequests();
                UI.renderActionBar();
            }, 'Take 3 Yarn — Choose a Color', Game.state.player, true);
        }

        // Session 13: take5AnyCraft1Any — show Take5 picker modal
        if (Game.state.pendingTake5Any) {
            UI.showTake5Modal();
        }
    },


    /* =========================================================
       END ACTIONS / END TURN
       ========================================================= */

    /**
     * "End Actions" button — finishes the player's actions and
     * moves to the restock phase.
     */
    onEndActions: function() {
        // Guard: only allow during playerActions phase
        if (Game.state.phase !== 'playerActions') return;
        if (Game.state.player && Game.state.player.isAI) return;
        Game.endPlayerActions();
        // Game.endPlayerActions already triggers UI re-renders
    },


    /* =========================================================
       TAKE YARN FLOW
       1. Player clicks "Take Yarn"
       2. If wild cards selected → color pickers open sequentially
       3. Full confirmation modal shows all yarn (including wild choices)
       4. Confirm → apply to bowl   |   Cancel → discard & go back
       ========================================================= */

    /** Pending take data, built during the flow */
    _pendingTake: null,

    /**
     * "Take Yarn" button handler — kicks off the take flow.
     */
    onTakeYarn: function() {
        // Guard: only allow during playerActions when shop is available
        if (Game.state.phase !== 'playerActions') return;
        if (Game.state.turn.shopDone) return;
        var sel = Array.from(Game.state.selectedSlots);
        if (sel.length === 0) return;

        // Separate normal and wild cards
        var normalCards = [];
        var wildCards = [];

        sel.forEach(function(i) {
            var card = Game.state.bazaar[i];
            if (card === null) {
                // Session 9: empty bazaar slot → treat as 1 any-color yarn (wild)
                wildCards.push({ card: { name: 'Empty Slot', img: '', yarn: { any: 1 }, type: 'empty' }, slot: i });
            } else if (card.yarn && card.yarn.any) {
                wildCards.push({ card: card, slot: i });
            } else if (card) {
                normalCards.push({ card: card, slot: i });
            }
        });

        // Calculate normal yarn totals
        var normalYarn = {};
        normalCards.forEach(function(entry) {
            Object.keys(entry.card.yarn).forEach(function(color) {
                normalYarn[color] = (normalYarn[color] || 0) + entry.card.yarn[color];
            });
        });

        // Build flat list of wild picks needed
        var wildPicksNeeded = 0;
        wildCards.forEach(function(entry) {
            wildPicksNeeded += (entry.card.yarn.any || 1);
        });

        // Store pending state
        this._pendingTake = {
            slots: sel,
            normalCards: normalCards,
            wildCards: wildCards,
            normalYarn: normalYarn,
            wildChoices: [],
            wildPicksTotal: wildPicksNeeded,
        };

        if (wildPicksNeeded > 0) {
            // Collect wild color choices first, then show confirmation
            this._collectWildChoices(0);
        } else {
            // No wilds — go straight to confirmation
            this.showConfirmTake();
        }
    },

    /**
     * Sequentially collect color choices for wild card picks.
     * Opens the color picker once per pick (a 2-any card = 2 picks).
     */
    _collectWildChoices: function(index) {
        var pending = this._pendingTake;
        if (!pending) return;

        if (index >= pending.wildPicksTotal) {
            // All choices made — show full confirmation
            this.showConfirmTake();
            return;
        }

        var pickNum = index + 1;
        var total = pending.wildPicksTotal;
        var title = 'Choose Yarn Color' + (total > 1 ? ' (' + pickNum + ' of ' + total + ')' : '');

        this.showColorPicker(function(color) {
            pending.wildChoices.push(color);
            UI._collectWildChoices(index + 1);
        }, title, Game.state.player, true);

        // Session 35: when more than one wild pick is needed, show a live
        // "your picks" row so the player sees colors already chosen this take.
        if (total > 1) {
            var progEl = document.getElementById('colorPickerProgress');
            if (progEl) {
                var chosen = pending.wildChoices;   // colors chosen so far (length === index)
                var ph = '<span class="cpp-label">Your picks:</span>';
                chosen.forEach(function(col) {
                    var hex = CARDS.COLOR_HEX[col] || '#888';
                    ph += '<span class="confirm-yarn-tag" style="background:' + hex + '">+1 ' +
                        col.charAt(0).toUpperCase() + col.slice(1) + '</span>';
                });
                for (var r = chosen.length; r < total; r++) {
                    ph += '<span class="cpp-empty">?</span>';
                }
                progEl.innerHTML = ph;
                progEl.style.display = 'flex';
            }
        }
    },

    /**
     * Build and show the Take Yarn confirmation modal.
     */
    showConfirmTake: function() {
        var pending = this._pendingTake;
        if (!pending) return;

        var body = this.els.confirmBody;
        var html = '';
        var totals = {};
        var wildChoiceIdx = 0;

        pending.normalCards.forEach(function(entry) {
            html += UI._buildConfirmCardRow(entry.card, null);
            Object.keys(entry.card.yarn).forEach(function(color) {
                totals[color] = (totals[color] || 0) + entry.card.yarn[color];
            });
        });

        pending.wildCards.forEach(function(entry) {
            var count = entry.card.yarn.any || 1;
            var choices = pending.wildChoices.slice(wildChoiceIdx, wildChoiceIdx + count);
            wildChoiceIdx += count;

            html += UI._buildConfirmCardRow(entry.card, choices);
            choices.forEach(function(color) {
                totals[color] = (totals[color] || 0) + 1;
            });
        });

        // Total summary bar
        html += '<div class="confirm-total-bar">';
        html += '<span class="confirm-total-label">Total:</span>';
        CARDS.COLORS.forEach(function(color) {
            if (totals[color]) {
                var hex = CARDS.COLOR_HEX[color];
                html += '<span class="confirm-yarn-tag" style="background:' + hex + '">+' + totals[color] + ' ' +
                    color.charAt(0).toUpperCase() + color.slice(1) + '</span>';
            }
        });
        html += '</div>';

        body.innerHTML = html;
        this.els.confirmModal.style.display = 'flex';
    },

    _buildConfirmCardRow: function(card, wildChoices) {
        var html = '<div class="confirm-card-row">';
        html += '<img class="confirm-card-thumb" src="' + card.img + '" alt="' + card.name + '">';
        html += '<div class="confirm-card-info">';
        html += '<div class="confirm-card-name">' + card.name + '</div>';
        html += '<div class="confirm-yarn-list">';

        if (wildChoices) {
            wildChoices.forEach(function(color) {
                var hex = CARDS.COLOR_HEX[color] || '#888';
                html += '<span class="confirm-yarn-tag" style="background:' + hex + '">+1 ' +
                    color.charAt(0).toUpperCase() + color.slice(1) + '</span>';
            });
        } else {
            Object.keys(card.yarn).forEach(function(color) {
                var amount = card.yarn[color];
                var hex = CARDS.COLOR_HEX[color] || '#888';
                html += '<span class="confirm-yarn-tag" style="background:' + hex + '">+' + amount + ' ' +
                    color.charAt(0).toUpperCase() + color.slice(1) + '</span>';
            });
        }

        html += '</div></div></div>';
        return html;
    },

    onConfirmTake: function() {
        this.els.confirmModal.style.display = 'none';
        var pending = this._pendingTake;
        if (!pending) return;

        var changed = Game.applyShopChoices(pending.normalYarn, pending.wildChoices, pending.slots);
        UI.renderYarnBowl(changed);
        UI.renderCraftGrid();
        UI.renderSpecialRequests();

        this._pendingTake = null;
    },

    onCancelTake: function() {
        this.els.confirmModal.style.display = 'none';
        this._pendingTake = null;
    },


    /* =========================================================
       RESTOCK FLOW — Session 6: Async Event/SR Resolution
       ========================================================= */

    /**
     * "Restock" button handler.
     * Fills slots then processes any Events/SRs sequentially before ending turn.
     */
    onRestock: function() {
        // Guard: only allow during restock phase
        if (Game.state.phase !== 'restock') return;
        this._restockDone = true;
        var revealed = Game.restockBazaar();

        if (revealed.length === 0) {
            // No events or SRs — re-render to show any new restock actions, then let player act
            UI.renderBazaar();
            UI.renderActionBar();
        } else {
            // Process the queue of revealed Events/SRs, then return to restock bar
            UI._processRestockQueue(revealed, 0, function() {
                // Re-render so player can finish projects / learn patterns before ending turn
                UI.renderBazaar();
                UI.renderCraftGrid();
                UI.renderSpecialRequests();
                UI.renderFinishedObjects();
                UI.renderProjectStrip();
                UI.renderActionBar();
            });
        }
    },

    /**
     * Session 9b: End the turn after restock phase actions are complete.
     */
    onEndRestockTurn: function() {
        // Guard: only allow during restock phase
        if (Game.state.phase !== 'restock') return;
        this._restockDone = false;
        Game.endTurn();
    },

    /**
     * Show the final craft phase UI: the player gets 1 craft action
     * (item or SR) with their existing yarn, then done.
     */
    showFinalCraftPhase: function() {
        var bar = this.els.actionBar;
        if (!bar) return;

        var player = Game.state.player;
        var name = player.name || player.characterId;
        var options = Game.getCraftOptions();
        var srOptions = Game.getSRCraftOptions();
        var hasAffordable = options.some(function(o) { return o.canAfford; }) ||
                            srOptions.some(function(o) { return o.canAfford; });

        // Middle: instruction text
        var statusText = hasAffordable
            ? name + ' may craft 1 item with existing yarn'
            : name + ' can\'t afford anything — skip';

        // Buttons
        var buttonsHtml = '';
        if (hasAffordable) {
            buttonsHtml += '<button class="btn btn-secondary" onclick="UI.focusCraftOptions()">View Craft Options</button>';
        }
        buttonsHtml += '<button class="btn btn-cta" onclick="UI.onEndFinalCraft()">Done →</button>';

        bar.innerHTML =
            '<div class="ab-phase">' +
                '<span class="ab-phase-icon">🏁</span>' +
                '<span class="ab-phase-label">Final Craft</span>' +
            '</div>' +
            '<div class="ab-divider"></div>' +
            '<div class="ab-middle">' +
                '<span class="ab-status-text">' + statusText + '</span>' +
            '</div>' +
            '<div class="ab-buttons">' + buttonsHtml + '</div>';
    },

    onFinalCraft: function(itemId, yarnToSpend) {
        // Guard: only during finalCraft phase
        if (Game.state.phase !== 'finalCraft') return;
        // Called after player crafts during final craft phase
        Game.state.turn.craftUsed++;
        this.renderFinishedObjects();
        this.renderYarnBowl();
        this.renderCraftGrid();
        this.renderSpecialRequests();
        this.renderActionBar();
        // After 1 craft, auto-end
        Game.endFinalCraft();
    },

    onEndFinalCraft: function() {
        // Guard: only during finalCraft phase
        if (Game.state.phase !== 'finalCraft') return;
        Game.endFinalCraft();
    },

    // "View Craft Options" — the craft strip is always on the player board during
    // finalCraft, so re-rendering did nothing visible. Instead, scroll it into
    // view and pulse it so the player can see where to tap.
    focusCraftOptions: function() {
        this.renderCraftGrid();
        this.renderSpecialRequests();
        var grid = (this.els && this.els.craftGrid) || document.getElementById('craftGrid');
        if (!grid) return;
        try { grid.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        catch (e) { grid.scrollIntoView(); }
        grid.classList.remove('craft-flash');
        void grid.offsetWidth;            // reflow so the animation can restart
        grid.classList.add('craft-flash');
        setTimeout(function () { grid.classList.remove('craft-flash'); }, 1500);
    },

    /**
     * Sequential processor for revealed Events and SRs during Restock.
     * Shows a modal for each, waits for player, then moves to next.
     * @param {Array}    queue — [{slot, card}] revealed events/SRs
     * @param {number}   idx   — current index into queue
     * @param {function} done  — called after last item resolved
     */
    _processRestockQueue: function(queue, idx, done) {
        if (idx >= queue.length) {
            done();
            return;
        }

        var item = queue[idx];
        var card = item.card;
        var slot = item.slot;

        if (card.type === 'event') {
            // Session 19: Go straight to Event Modal (cut redundant pre-announce Game Moment)
            UI.showEventModal(card, function() {
                Game.resolveRestockCard(slot, card);
                UI.renderBazaar();
                UI._processRestockQueue(queue, idx + 1, done);
            });
        } else if (card.type === 'specialRequest') {
            // Session 19: SR Take Modal is the one and only dialog for SR reveals.
            // No pre-announce, no post-decision celebration — the Take Modal does it all.
            UI.showSRTakeModal(card, function() {
                Game.resolveRestockCard(slot, card);
                UI.renderBazaar();
                UI.renderSpecialRequests();
                UI._processRestockQueue(queue, idx + 1, done);
            });
        } else {
            // Shouldn't happen, but skip
            UI._processRestockQueue(queue, idx + 1, done);
        }
    },

    /**
     * "Skip Restock" — bazaar is full or deck empty, no restock needed.
     * Sets _restockDone so bonus actions (Finish Project, Learn Pattern, Frog It) appear.
     */
    onSkipRestock: function() {
        if (Game.state.phase !== 'restock') return;
        this._restockDone = true;
        UI.renderBazaar();
        UI.renderActionBar();
    },


    /* =========================================================
       SESSION 17: GAME MOMENT MODAL
       Generic announcement overlay for key game moments.
       Shows card image, title, description. Human clicks to
       dismiss; AI auto-dismisses after a delay.
       Config: { badge, badgeClass, img, title, desc, points }
       ========================================================= */

    _gameMomentCallback: null,

    /**
     * Show a game moment announcement modal.
     * @param {Object}   config   — { badge, badgeClass, img, title, desc, points }
     * @param {function} callback — called after the moment is dismissed
     */
    showGameMoment: function(config, callback) {
        this._gameMomentCallback = callback || null;

        var modal    = document.getElementById('gameMomentModal');
        var playerEl = document.getElementById('gameMomentPlayer');
        var badge    = document.getElementById('gameMomentBadge');
        var cardImg  = document.getElementById('gameMomentCard');
        var title    = document.getElementById('gameMomentTitle');
        var desc     = document.getElementById('gameMomentDesc');
        var btn      = document.getElementById('gameMomentBtn');

        // Player name at top (just character name, no phase text)
        var player = Game.state.player;
        playerEl.textContent = player ? player.name : '';

        // Header row: title (left, SantElia bold) + badge pill (right)
        // Strip parenthetical text from card names (e.g., "Trogdor (Dagron)" → "Trogdor")
        var titleHtml = (config.title || '').replace(/\s*\([^)]*\)/g, '');
        if (config.points) {
            titleHtml += ' <span class="pt-tag pt-lg"><span class="pt-tag-value">' +
                config.points + '</span></span>';
        }
        title.innerHTML = titleHtml;

        badge.textContent = config.badge || '';
        badge.className = 'game-moment-badge' + (config.badgeClass ? ' ' + config.badgeClass : '');

        cardImg.src = config.img || '';
        cardImg.alt = config.title || '';

        desc.innerHTML = config.desc || '';

        // For AI players, auto-dismiss after a delay
        var isAI = Game.state.player && Game.state.player.isAI;
        btn.style.display = isAI ? 'none' : '';

        modal.style.display = 'flex';

        // Session 17: Spawn confetti particles behind the modal
        UI._spawnConfetti(modal);

        if (isAI) {
            // 4s so human spectators can read what happened
            setTimeout(function() {
                UI._dismissGameMoment();
            }, 4000);
        }
    },

    /**
     * Dismiss the game moment modal and fire the callback.
     */
    _dismissGameMoment: function() {
        var modal = document.getElementById('gameMomentModal');
        modal.style.display = 'none';
        // Clean up any remaining confetti
        var confettiLayer = modal.querySelector('.gm-confetti-layer');
        if (confettiLayer) confettiLayer.remove();

        var cb = this._gameMomentCallback;
        this._gameMomentCallback = null;
        if (cb) cb();
    },

    /**
     * Spawn confetti particles behind the game moment modal content.
     * Particles are CSS-only, positioned in a layer behind the modal card.
     * @param {HTMLElement} modal — the .game-moment-overlay element
     */
    _spawnConfetti: function(modal) {
        // Remove any old confetti layer
        var old = modal.querySelector('.gm-confetti-layer');
        if (old) old.remove();

        var layer = document.createElement('div');
        layer.className = 'gm-confetti-layer';

        var colors = ['#e74c3c','#f39c12','#2ecc71','#3498db','#9b59b6','#e67e22','#1abc9c','#c9a84c'];
        var shapes = ['circle', 'square', 'strip'];
        var count = 100;

        for (var i = 0; i < count; i++) {
            var p = document.createElement('div');
            p.className = 'gm-confetti-piece';
            var color = colors[Math.floor(Math.random() * colors.length)];
            var shape = shapes[Math.floor(Math.random() * shapes.length)];
            var left = Math.random() * 100;
            var delay = Math.random() * 1.5;
            var duration = 2.5 + Math.random() * 2;
            var size = 6 + Math.random() * 8;
            var drift = -40 + Math.random() * 80;

            p.style.left = left + '%';
            p.style.animationDelay = delay + 's';
            p.style.animationDuration = duration + 's';
            p.style.setProperty('--drift', drift + 'px');
            p.style.background = color;

            if (shape === 'circle') {
                p.style.width = size + 'px';
                p.style.height = size + 'px';
                p.style.borderRadius = '50%';
            } else if (shape === 'strip') {
                p.style.width = (size * 0.4) + 'px';
                p.style.height = (size * 1.5) + 'px';
                p.style.borderRadius = '2px';
            } else {
                p.style.width = size + 'px';
                p.style.height = size + 'px';
                p.style.borderRadius = '1px';
            }

            layer.appendChild(p);
        }

        // Insert confetti layer as first child so it's behind modal content
        modal.insertBefore(layer, modal.firstChild);
    },

    /**
     * Build a human-readable description of project requirements.
     * @param {Object} requirements — { itemId: count }
     * @returns {string}
     */
    _describeProjectReqs: function(requirements) {
        var parts = [];
        var order = ['hat', 'mittens', 'bear', 'scarf', 'blanket'];
        order.forEach(function(itemId) {
            var count = requirements[itemId];
            if (!count) return;
            var name = itemId.charAt(0).toUpperCase() + itemId.slice(1);
            parts.push(count + ' ' + name + (count > 1 ? 's' : ''));
        });
        return parts.join(', ');
    },

    /**
     * Build a human-readable description of SR yarn requirements.
     * @param {Object} sr — the SR card/object
     * @returns {string}
     */
    _describeSRYarn: function(sr) {
        if (sr.colorRule === 'specific' && sr.yarn) {
            var parts = [];
            Object.keys(sr.yarn).forEach(function(color) {
                parts.push(sr.yarn[color] + ' ' + color);
            });
            return parts.join(' + ') + ' yarn';
        }
        if (sr.colorRule === 'any') return sr.yarnCount + ' yarn of any colors';
        if (sr.colorRule === 'sameColor') return sr.yarnCount + ' yarn of one color';
        if (sr.colorRule === 'different') return sr.yarnCount + ' yarn, all different colors';
        if (sr.colorRule === 'give') return 'Give ' + sr.yarnCount + ' yarn to each other player';
        if (sr.colorRule === 'sameColorPlus' && sr.plusYarn) {
            var extras = [];
            Object.keys(sr.plusYarn).forEach(function(c) { extras.push(sr.plusYarn[c] + ' ' + c); });
            return sr.yarnCount + ' of one color + ' + extras.join(' + ');
        }
        if (sr.colorRule === 'specificPlusAny') {
            var specs = [];
            if (sr.yarn) Object.keys(sr.yarn).forEach(function(c) { specs.push(sr.yarn[c] + ' ' + c); });
            return specs.join(' + ') + ' + ' + sr.anyCount + ' any';
        }
        if (sr.colorRule === 'specificPlusSame') {
            var specs2 = [];
            if (sr.yarn) Object.keys(sr.yarn).forEach(function(c) { specs2.push(sr.yarn[c] + ' ' + c); });
            return specs2.join(' + ') + ' + ' + sr.sameCount + ' of one color';
        }
        return sr.yarnCount + ' yarn';
    },

    /**
     * Renders yarn cost as colored dot HTML for game moment modals.
     * Replaces text descriptions with visual dots matching yarn colors.
     * @param {Object} sr — the Special Request card object
     * @returns {string} HTML string with colored dot spans
     */
    _renderSRYarnDots: function(sr) {
        var hex = CARDS.COLOR_HEX;
        var gap = '<span class="gm-yarn-gap"></span>';
        var dot = function(color) {
            return '<span class="gm-yarn-dot" style="background:' + hex[color] + '" title="' + color + '" data-cb-color="' + color + '" aria-label="' + color + ' yarn"></span>';
        };
        // Session 18: "any color" dots use rainbow gradient; gray for "one color" / "different"
        var rainbowDot = '<span class="gm-yarn-dot gm-yarn-dot-rainbow" title="any color" aria-label="any color yarn"></span>';
        var neutralDot = '<span class="gm-yarn-dot gm-yarn-dot-neutral" title="one color" aria-label="one color yarn"></span>';

        // Session 18: Only chunk by 3 when total > 5; groups of 3-5 stay together
        var chunkedDots = function(count, dotFn) {
            var out = '';
            if (count <= 5) {
                // Small group: no chunking, keep together
                for (var i = 0; i < count; i++) out += dotFn(i);
            } else {
                // Large group: chunk by 3
                for (var j = 0; j < count; j++) {
                    if (j > 0 && j % 3 === 0) out += gap;
                    out += dotFn(j);
                }
            }
            return out;
        };

        // Helper: render sorted colored dots from a yarn object (most-needed color first).
        // Session 18: Only chunk by 3 when total > 5
        var sortedColorDots = function(yarn) {
            var colors = Object.keys(yarn).filter(function(c) { return yarn[c] > 0; });
            colors.sort(function(a, b) {
                if (yarn[b] !== yarn[a]) return yarn[b] - yarn[a];
                return CARDS.COLORS.indexOf(a) - CARDS.COLORS.indexOf(b);
            });
            var totalCount = 0;
            colors.forEach(function(c) { totalCount += yarn[c]; });
            var dotsHtml = '';
            var totalRendered = 0;
            colors.forEach(function(c) {
                for (var i = 0; i < yarn[c]; i++) {
                    if (totalCount > 5 && totalRendered > 0 && totalRendered % 3 === 0) dotsHtml += gap;
                    dotsHtml += dot(c);
                    totalRendered++;
                }
            });
            return dotsHtml;
        };

        var rule = sr.colorRule || 'specific';
        var html = '<span class="gm-yarn-dots">';
        var label = '';

        switch (rule) {
            case 'specific':
                if (sr.yarn) html += sortedColorDots(sr.yarn);
                break;
            case 'any':
                html += chunkedDots(sr.yarnCount, function() { return rainbowDot; });
                label = 'any colors';
                break;
            case 'sameColor':
                html += chunkedDots(sr.yarnCount, function() { return neutralDot; });
                label = 'one color';
                break;
            case 'different':
                var diffColors = CARDS.COLORS.slice(0, sr.yarnCount);
                html += chunkedDots(diffColors.length, function(i) { return dot(diffColors[i]); });
                label = 'all different';
                break;
            case 'give':
                html += chunkedDots(sr.yarnCount, function() { return rainbowDot; });
                label = 'to each player';
                break;
            case 'sameColorPlus':
                // Neutral dots (same color portion) first, then specific extras — all in one stream
                var samePlusTotal = [];
                for (var m = 0; m < sr.yarnCount; m++) samePlusTotal.push(null); // null = neutral
                if (sr.plusYarn) {
                    CARDS.COLORS.forEach(function(c) {
                        for (var n = 0; n < (sr.plusYarn[c] || 0); n++) samePlusTotal.push(c);
                    });
                }
                html += chunkedDots(samePlusTotal.length, function(i) {
                    return samePlusTotal[i] ? dot(samePlusTotal[i]) : neutralDot;
                });
                label = 'same color + specific';
                break;
            case 'specificPlusAny':
                // Specific colors first (sorted), then neutral dots — all in one stream
                var spaParts = [];
                if (sr.yarn) {
                    var spaColors = Object.keys(sr.yarn).filter(function(c) { return sr.yarn[c] > 0; });
                    spaColors.sort(function(a, b) {
                        if (sr.yarn[b] !== sr.yarn[a]) return sr.yarn[b] - sr.yarn[a];
                        return CARDS.COLORS.indexOf(a) - CARDS.COLORS.indexOf(b);
                    });
                    spaColors.forEach(function(c) {
                        for (var p = 0; p < sr.yarn[c]; p++) spaParts.push(c);
                    });
                }
                for (var q = 0; q < (sr.anyCount || 0); q++) spaParts.push(null);
                html += chunkedDots(spaParts.length, function(i) {
                    return spaParts[i] ? dot(spaParts[i]) : rainbowDot;
                });
                label = '+ any color';
                break;
            case 'specificPlusSame':
                // Specific colors first (sorted), then neutral dots — all in one stream
                var spsParts = [];
                if (sr.yarn) {
                    var spsColors = Object.keys(sr.yarn).filter(function(c) { return sr.yarn[c] > 0; });
                    spsColors.sort(function(a, b) {
                        if (sr.yarn[b] !== sr.yarn[a]) return sr.yarn[b] - sr.yarn[a];
                        return CARDS.COLORS.indexOf(a) - CARDS.COLORS.indexOf(b);
                    });
                    spsColors.forEach(function(c) {
                        for (var r = 0; r < sr.yarn[c]; r++) spsParts.push(c);
                    });
                }
                for (var s = 0; s < (sr.sameCount || 0); s++) spsParts.push(null);
                html += chunkedDots(spsParts.length, function(i) {
                    return spsParts[i] ? dot(spsParts[i]) : neutralDot;
                });
                label = '+ one color';
                break;
            default:
                html += chunkedDots(sr.yarnCount || 0, function() { return neutralDot; });
        }

        html += '</span>';
        // Label always on its own line below the dots
        if (label) {
            html += '<span class="gm-yarn-label">' + label + '</span>';
        }
        return html;
    },

    /**
     * Returns SR description HTML for game moment modals.
     * Active (human) player sees instructions; spectators see narration.
     * @param {string} moment — 'completed' (Session 21: 'awarded' removed — handled by two-step flow)
     * @param {Object} sr — the SR card object
     * @param {string} name — active player's name
     * @param {boolean} isAI — true if active player is AI
     * @returns {string} HTML string
     */
    _getSRDesc: function(moment, sr, name, isAI) {
        var dots = this._renderSRYarnDots(sr);
        switch (moment) {
            case 'completed':
                var isFav = sr.isFavorite || (sr.favoriteOf && sr.favoriteOf === (Game.state.player && Game.state.player.characterId));
                if (isAI) {
                    return '<span class="player-name">' + name + '</span> completed ' +
                        (isFav ? 'their favorite' : 'this') + ' Special Request!';
                }
                return 'You completed ' + (isFav ? 'your favorite' : 'this') + ' Special Request!';
            default:
                return dots;
        }
    },

    /**
     * Returns project completion description HTML for game moment modals.
     * @param {Object} project — the project card object
     * @param {string} name — player's name
     * @param {boolean} isAI — true if active player is AI
     * @returns {string} HTML string
     */
    _getProjectDesc: function(project, name, isAI) {
        var reqDesc = project ? UI._describeProjectReqs(project.requirements) : '';
        if (isAI) {
            return '<span class="player-name">' + name + '</span> turned in ' + reqDesc;
        }
        return 'You turned in ' + reqDesc;
    },

    /**
     * Returns event description text for game moments.
     * Active (human) player sees instructions; spectators see what the AI is doing.
     * @param {string} effect — the event effect id
     * @param {string} name — active player's name
     * @param {boolean} isAI — true if the active player is AI (human is spectating)
     * @returns {string}
     */
    _getEventDesc: function(effect, name, isAI) {
        switch (effect) {
            case 'tangledCat':
                return isAI
                    ? name + ' is choosing an opponent to skip their next Craft action.'
                    : 'Choose an opponent to skip their next Craft action.';
            case 'yarnSale':
                return isAI
                    ? name + ' takes 3 yarn of any color from the supply.'
                    : 'Take 3 yarn of any color from the supply.';
            case 'donate':
                return isAI
                    ? name + ' is giving 1 yarn from their bowl to another player.'
                    : 'Give 1 yarn from your bowl to another player.';
            case 'friendlyClerk':
                return 'Everyone picks 1 free yarn from the supply.';
            case 'craftCircle':
                return 'Everyone may craft 1 item for free.';
            default:
                return 'An event has occurred!';
        }
    },


    /* =========================================================
       SESSION 6b: EVENT MODAL
       Shows event card image + description, then dispatches to the
       correct sub-modal for each of the 5 event types.
       ========================================================= */

    _eventModalCallback: null,

    /**
     * Show the event modal for the given card, then hand off to the
     * correct sub-flow based on inputType.
     */
    showEventModal: function(card, callback) {
        this._eventModalCallback = callback;

        this.els.eventCardImg.src = card.img;
        this.els.eventCardImg.alt = card.name;
        this.els.eventTitle.textContent = card.name;
        this.els.eventExtraBody.innerHTML = '';
        this.els.eventOkBtn.style.display = 'none';

        var result = Game.applyEventEffect(card);
        this.els.eventMsg.textContent = result.msg;

        var inputType = result.inputType;
        try{ if(window.Sound){ var _em={tangledCat:'ev-tangled-cat',yarnSale:'ev-yarn-sale',donate:'ev-donate',friendlyClerk:'ev-friendly-clerk',craftCircle:'ev-craft-circle'}; Sound.play(_em[inputType]||'ev-generic'); } }catch(e){}
        var labels = {
            tangledCat:   'Choose Player →',
            yarnSale:     'Choose Yarn →',
            donate:       'Choose Yarn →',
            friendlyClerk:'Choose Yarn →',
            craftCircle:  'Craft Now →',
            generic:      'OK',
        };

        var continueBtn = document.createElement('button');
        continueBtn.className = 'btn btn-primary';
        continueBtn.textContent = labels[inputType] || 'Continue →';
        continueBtn.style.marginTop = '10px';
        continueBtn.onclick = function() {
            UI.els.eventModal.style.display = 'none';
            var cb = UI._eventModalCallback;
            UI._eventModalCallback = null;

            if (inputType === 'tangledCat') {
                UI.showTangledCatModal(cb);
            } else if (inputType === 'yarnSale') {
                UI.showYarnSaleModal(cb);
            } else if (inputType === 'donate') {
                UI.showDonateModal(cb);
            } else if (inputType === 'friendlyClerk') {
                UI.showFriendlyClerkModal(cb);
            } else if (inputType === 'craftCircle') {
                UI.showCraftCircleModal(0, cb);
            } else {
                if (cb) cb();
            }
        };
        this.els.eventExtraBody.appendChild(continueBtn);
        this.els.eventModal.style.display = 'flex';
    },


    /* =========================================================
       TANGLED CAT MODAL
       Active player chooses a player to lose crafting next turn.
       SP: auto-targets the only player (no selection shown).
       ========================================================= */

    showTangledCatModal: function(callback) {
        if (Game.state.playerCount === 1) {
            // Single player — apply immediately, no selector needed
            Game.applyTangledCat(0);
            UI.renderActionBar();
            if (callback) callback();
        } else {
            // Session 9: show player selector — pick another player to target
            var activeIdx = Game.state.activePlayerIndex;
            var html = '<div class="restock-modal-msg">Choose a player who can\'t Craft next turn:</div>';
            html += '<div class="player-selector-grid">';
            Game.state.players.forEach(function(p, idx) {
                if (idx === activeIdx) return; // can't target yourself
                html += '<button class="btn btn-primary player-select-btn" onclick="UI._onTangledCatTarget(' + idx + ')">' +
                    p.name + '</button>';
            });
            html += '</div>';

            UI._tangledCatCallback = callback;
            UI.els.eventExtraBody.innerHTML = '';
            UI.els.eventCardImg.style.display = 'none';
            UI.els.eventTitle.textContent = 'Tangled Cat — Choose Target';
            UI.els.eventMsg.innerHTML = html;
            UI.els.eventOkBtn.style.display = 'none';
            UI.els.eventModal.style.display = 'flex';
        }
    },

    _tangledCatCallback: null,

    _onTangledCatTarget: function(playerIdx) {
        UI.els.eventModal.style.display = 'none';
        UI.els.eventCardImg.style.display = '';
        UI.els.eventOkBtn.style.display = '';
        Game.applyTangledCat(playerIdx);
        UI.renderActionBar();
        var targetName = Game.state.players[playerIdx].name;
        var activeName = Game.state.player.name;
        var cb = UI._tangledCatCallback;
        UI._tangledCatCallback = null;
        // Result announcement
        UI.showGameMoment({
            badge: 'Event',
            badgeClass: 'moment-event',
            img: 'Square Cards PNG/AR_YarnEvents_Final_0000_Tangled-Cat.png',
            title: 'Tangled Cat',
            desc: '<span class="player-name">' + activeName + '</span> tangled <span class="player-name">' + targetName + '</span>!<br><span class="player-name">' + targetName + '</span> can\'t Craft next turn.'
        }, cb);
    },


    /* =========================================================
       FRIENDLY CLERK MODAL
       Each player picks 1 yarn color and gains 1 token.
       Iterates through all players in sequence.
       ========================================================= */

    _friendlyClerkPlayerIdx: 0,
    _friendlyClerkCallback: null,

    showFriendlyClerkModal: function(callback) {
        this._friendlyClerkPlayerIdx = 0;
        this._friendlyClerkCallback = callback;
        this._friendlyClerkNextPlayer();
    },

    _friendlyClerkNextPlayer: function() {
        var idx = UI._friendlyClerkPlayerIdx;
        if (idx >= Game.state.playerCount) {
            var cb = UI._friendlyClerkCallback;
            UI._friendlyClerkCallback = null;
            if (cb) cb();
            return;
        }

        var player = Game.state.players[idx];

        // Session 9b: AI players auto-resolve — pick most needed color
        if (player.isAI) {
            var color = AI._pickMostNeededColorForPlayer(player);
            Game.applyFriendlyClerk(idx, color);
            UI.renderYarnBowl();
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            UI._friendlyClerkPlayerIdx++;
            setTimeout(function() {
                UI._friendlyClerkNextPlayer();
            }, AI.DELAY);
            return;
        }

        var playerName = player.name;
        var totalPlayers = Game.state.playerCount;
        var title = totalPlayers > 1
            ? playerName + ': Choose 1 Yarn'
            : 'Choose 1 Yarn Color';

        UI.showColorPicker(function(color) {
            var changed = Game.applyFriendlyClerk(idx, color);
            UI.renderYarnBowl(changed);
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            UI._friendlyClerkPlayerIdx++;
            UI._friendlyClerkNextPlayer();
        }, title, player, true);
    },


    /* =========================================================
       SESSION 6b: YARN SALE MODAL
       Player picks 3 colors to gain from the supply.
       ========================================================= */

    _yarnSaleChoices: [],
    _yarnSaleCallback: null,

    showYarnSaleModal: function(callback) {
        this._yarnSaleChoices = [];
        this._yarnSaleCallback = callback;
        // Session 24: Inject off-turn context so player can see board state
        var player = Game.state.player;
        if (this.els.yarnSaleContext && player) {
            try {
                this.els.yarnSaleContext.innerHTML = this._buildOffTurnContext(player, 'color-pick', 'Choose 3 Yarn', true);
            } catch (e) {
                this.els.yarnSaleContext.innerHTML = '';
            }
        }
        this._buildYarnSaleBody();
        this.els.yarnSaleModal.style.display = 'flex';
    },

    _buildYarnSaleBody: function() {
        var choices = this._yarnSaleChoices;
        var needed = 3;
        var totalSoFar = choices.length;

        var html = '<div class="event-yarn-pick-summary">' +
            'Choose ' + needed + ' Yarn tokens from the supply. (' + totalSoFar + '/' + needed + ' chosen)' +
            '</div>';

        html += '<div class="event-yarn-pick-grid">';
        CARDS.COLORS.forEach(function(color) {
            var hex = CARDS.COLOR_HEX[color];
            var cap = color.charAt(0).toUpperCase() + color.slice(1);
            var disabled = totalSoFar >= needed;
            html += '<button class="color-pick-btn event-pick-btn" style="background:' + hex + '" ' +
                (disabled ? 'disabled' : '') + ' onclick="UI._yarnSalePick(\'' + color + '\')">' +
                cap + '</button>';
        });
        html += '</div>';

        if (choices.length > 0) {
            html += '<div class="event-chosen-bar">';
            choices.forEach(function(color) {
                var hex = CARDS.COLOR_HEX[color];
                html += '<span class="confirm-yarn-tag" style="background:' + hex + '">+1 ' +
                    color.charAt(0).toUpperCase() + color.slice(1) + '</span>';
            });
            html += '</div>';
        }

        html += '<div class="event-pick-controls">';
        if (choices.length > 0) {
            html += '<button class="btn btn-secondary" onclick="UI._yarnSaleUndo()">Undo</button>';
        }
        if (choices.length === needed) {
            html += '<button class="btn btn-primary" onclick="UI._yarnSaleConfirm()">Take Yarn</button>';
        }
        html += '</div>';

        this.els.yarnSaleBody.innerHTML = html;
    },

    _yarnSalePick: function(color) {
        if (this._yarnSaleChoices.length >= 3) return;
        this._yarnSaleChoices.push(color);
        this._buildYarnSaleBody();
    },

    _yarnSaleUndo: function() {
        this._yarnSaleChoices.pop();
        this._buildYarnSaleBody();
    },

    _yarnSaleConfirm: function() {
        this.els.yarnSaleModal.style.display = 'none';
        var changed = Game.applyYarnSale(this._yarnSaleChoices);
        UI.renderYarnBowl(changed);
        UI.renderCraftGrid();
        UI.renderSpecialRequests();
        var cb = this._yarnSaleCallback;
        this._yarnSaleCallback = null;
        if (cb) cb();
    },


    /* =========================================================
       DONATE MODAL
       Active player picks 1 yarn color from their stash to give.
       SP: yarn goes to the supply (no other player).
       MP (Session 9): will add player selector after color pick.
       ========================================================= */

    _donateCallback: null,

    showDonateModal: function(callback) {
        this._donateCallback = callback;
        // Session 24: Inject off-turn context so player can see board state
        var player = Game.state.player;
        if (this.els.donateContext && player) {
            try {
                this.els.donateContext.innerHTML = this._buildOffTurnContext(player, 'color-pick', 'Donate 1 Yarn', true);
            } catch (e) {
                this.els.donateContext.innerHTML = '';
            }
        }
        this._buildDonateBody();
        this.els.donateModal.style.display = 'flex';
    },

    _buildDonateBody: function() {
        var bowl = Game.state.player.yarnBowl;
        var hasSomething = CARDS.COLORS.some(function(c) { return bowl[c] > 0; });

        var destination = Game.state.playerCount > 1
            ? 'another player'
            : 'the supply';

        var html = '<div class="event-yarn-pick-summary">' +
            'Choose 1 Yarn token from your stash to give to ' + destination + '.' +
            '</div>';

        if (!hasSomething) {
            html += '<div class="event-yarn-pick-summary" style="color:var(--text-muted);font-style:italic">' +
                'Your stash is empty — nothing to donate!' +
                '</div>';
            html += '<div class="event-pick-controls">' +
                '<button class="btn btn-secondary" onclick="UI.onDonateCancel()">Skip</button>' +
                '</div>';
        } else {
            html += '<div class="event-yarn-pick-grid">';
            CARDS.COLORS.forEach(function(color) {
                var amount = bowl[color] || 0;
                var hex = CARDS.COLOR_HEX[color];
                var cap = color.charAt(0).toUpperCase() + color.slice(1);
                html += '<button class="color-pick-btn event-pick-btn" ' +
                    'style="background:' + hex + '; position:relative" ' +
                    (amount === 0 ? 'disabled' : '') +
                    ' onclick="UI._donatePickColor(\'' + color + '\')">' +
                    cap + '<br><span style="font-size:11px;opacity:0.85">(have ' + amount + ')</span>' +
                    '</button>';
            });
            html += '</div>';
            html += '<div class="event-pick-controls">' +
                '<button class="btn btn-secondary" onclick="UI.onDonateCancel()">Skip</button>' +
                '</div>';
        }

        this.els.donateBody.innerHTML = html;
    },

    _donatePickColor: function(color) {
        this.els.donateModal.style.display = 'none';

        if (Game.state.playerCount <= 1) {
            // SP: yarn goes to supply
            var changed = Game.applyDonate(color, -1);
            UI.renderYarnBowl(changed);
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            var cb = this._donateCallback;
            this._donateCallback = null;
            if (cb) cb();
        } else {
            // Session 9 MP: pick which player to give yarn to
            this._donateColor = color;
            var activeIdx = Game.state.activePlayerIndex;
            var html = '<div class="restock-modal-msg">Give 1 ' +
                color.charAt(0).toUpperCase() + color.slice(1) + ' Yarn to:</div>';
            html += '<div class="player-selector-grid">';
            Game.state.players.forEach(function(p, idx) {
                if (idx === activeIdx) return;
                html += '<button class="btn btn-primary player-select-btn" onclick="UI._onDonateTarget(' + idx + ')">' +
                    p.name + '</button>';
            });
            html += '</div>';

            UI.els.eventExtraBody.innerHTML = '';
            UI.els.eventCardImg.style.display = 'none';
            UI.els.eventTitle.textContent = 'Donate — Choose Recipient';
            UI.els.eventMsg.innerHTML = html;
            UI.els.eventOkBtn.style.display = 'none';
            UI.els.eventModal.style.display = 'flex';
        }
    },

    _donateColor: null,

    _onDonateTarget: function(playerIdx) {
        UI.els.eventModal.style.display = 'none';
        UI.els.eventCardImg.style.display = '';
        UI.els.eventOkBtn.style.display = '';
        var color = UI._donateColor;
        var changed = Game.applyDonate(color, playerIdx);
        UI.renderYarnBowl(changed);
        UI.renderCraftGrid();
        UI.renderSpecialRequests();
        var targetName = Game.state.players[playerIdx].name;
        var activeName = Game.state.player.name;
        var colorCap = color.charAt(0).toUpperCase() + color.slice(1);
        var cb = UI._donateCallback;
        UI._donateCallback = null;
        // Result announcement
        UI.showGameMoment({
            badge: 'Event',
            badgeClass: 'moment-event',
            img: 'Square Cards PNG/AR_YarnEvents_Final_0002_Donate.png',
            title: 'Donate',
            desc: '<span class="player-name">' + activeName + '</span> gave 1 ' + colorCap + ' yarn to <span class="player-name">' + targetName + '</span>.'
        }, cb);
    },

    onDonateCancel: function() {
        this.els.donateModal.style.display = 'none';
        var cb = this._donateCallback;
        this._donateCallback = null;
        if (cb) cb();
    },


    /* =========================================================
       CRAFT CIRCLE MODAL
       Each player may immediately craft 1 item using current yarn.
       Skippable. Iterates through all players in sequence.
       Does NOT consume a normal craft action.
       ========================================================= */

    _craftCircleCallback: null,

    /**
     * @param {number}   playerIndex — which player's turn in the queue
     * @param {function} callback    — called after all players have resolved
     */
    showCraftCircleModal: function(playerIndex, callback) {
        if (playerIndex >= Game.state.playerCount) {
            if (callback) callback();
            return;
        }

        var player = Game.state.players[playerIndex];

        // Session 9b: AI players auto-resolve — craft best affordable item or skip
        if (player.isAI) {
            var aiOptions = Game.getCraftCircleOptions(playerIndex);
            var aiAffordable = aiOptions.filter(function(o) { return o.canAfford; });
            var best = aiAffordable.length > 0
                ? AI._pickBestCraftFromOptions(aiAffordable, player)
                : null;

            var craftMsg;
            if (best) {
                var yarnToSpend = best.yarnToSpend;
                var craftName = best.type === 'sr' ? best.sr.name : best.itemDef.name;
                if (best.type === 'sr') {
                    Game.craftCircleItem(null, best.sr.uid, yarnToSpend, playerIndex);
                } else {
                    Game.craftCircleItem(best.itemDef.id, null, yarnToSpend, playerIndex);
                }
                UI.renderYarnBowl();
                UI.renderCraftGrid();
                UI.renderFinishedObjects();
                craftMsg = player.name + ' crafted ' + craftName;
            } else {
                craftMsg = player.name + ' skipped';
            }
            setTimeout(function() {
                UI.showCraftCircleModal(playerIndex + 1, callback);
            }, AI.DELAY);
            return;
        }

        this._craftCircleCallback = callback;
        this._craftCircleCurrentPlayer = playerIndex;  // Session 9b: track for Skip/Cancel
        var options = Game.getCraftCircleOptions(playerIndex);
        var affordable = options.filter(function(o) { return o.canAfford; });

        var grid = this.els.craftCircleGrid;
        grid.innerHTML = '';

        var header = Game.state.playerCount > 1
            ? player.name + ': Craft 1 item now, or skip.'
            : 'Craft 1 item now using your current yarn, or skip.';

        var headerEl = grid.previousElementSibling;
        if (headerEl && headerEl.classList.contains('craft-circle-msg')) {
            headerEl.textContent = header;
        }

        // Session 22/24: Inject off-turn context (yarn bowl + project intel)
        var contextContainer = document.getElementById('craftCircleContext');
        if (contextContainer) {
            try {
                contextContainer.innerHTML = this._buildOffTurnContext(player, 'craft-circle', null, true);
            } catch (e) {
                contextContainer.innerHTML = '';
            }
        }

        if (affordable.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'craft-circle-empty';
            empty.textContent = 'Nothing affordable to craft right now.';
            grid.appendChild(empty);
        } else {
            affordable.forEach(function(opt) {
                var slot = document.createElement('div');
                slot.className = 'craft-slot can-afford';

                var imgSrc = opt.type === 'sr' ? opt.sr.img
                    : (opt.tile && !opt.learned) ? opt.tile.img : opt.itemDef.img;
                var name = opt.type === 'sr' ? opt.sr.name : opt.itemDef.name;

                var img = document.createElement('img');
                img.className = 'craft-slot-img';
                img.src = imgSrc;
                img.alt = name;
                slot.appendChild(img);

                var nameEl = document.createElement('div');
                nameEl.className = 'craft-slot-name';
                nameEl.textContent = name;
                slot.appendChild(nameEl);

                var costEl = document.createElement('div');
                costEl.className = 'craft-slot-cost';
                var yarnMap = opt.type === 'sr' ? opt.sr.yarn
                    : (opt.tile && !opt.learned) ? opt.tile.exact : null;

                if (yarnMap) {
                    CARDS.COLORS.forEach(function(color) {
                        if (!yarnMap[color]) return;
                        for (var d = 0; d < yarnMap[color]; d++) {
                            var dot = document.createElement('span');
                            dot.className = 'craft-cost-dot';
                            dot.style.backgroundColor = CARDS.COLOR_HEX[color];
                            costEl.appendChild(dot);
                        }
                    });
                } else {
                    var lbl = document.createElement('span');
                    lbl.className = 'craft-cost-label';
                    lbl.textContent = opt.yarnNeeded;
                    costEl.appendChild(lbl);
                }
                slot.appendChild(costEl);

                (function(option, pIdx) {
                    slot.addEventListener('click', function() {
                        UI._craftCirclePickItem(option, pIdx);
                    });
                })(opt, playerIndex);

                grid.appendChild(slot);
            });
        }

        this.els.craftCircleModal.style.display = 'flex';
    },

    /**
     * Player clicked an item in the Craft Circle modal.
     * For items with exact cost: go straight to craft confirm.
     * For general-color items: open the craft color picker first.
     */
    _craftCirclePickItem: function(option, playerIndex) {
        this.els.craftCircleModal.style.display = 'none';

        if (option.type === 'sr') {
            this._pendingCraft = {
                type: 'sr',
                srUid: option.sr.uid,
                itemDef: { id: option.sr.id, name: option.sr.name, img: option.sr.img, points: option.sr.points },
                yarnToSpend: Object.assign({}, option.sr.yarn),
                context: 'craftCircle',
                craftCirclePlayerIndex: playerIndex,
            };
            this.showCraftConfirm();
        } else if (option.tile && !option.learned) {
            this._pendingCraft = {
                type: 'item',
                itemId: option.itemDef.id,
                itemDef: option.itemDef,
                yarnToSpend: Object.assign({}, option.tile.exact),
                context: 'craftCircle',
                craftCirclePlayerIndex: playerIndex,
            };
            this.showCraftConfirm();
        } else {
            // General pattern — need color picker
            this._pendingCraft = {
                type: 'item',
                itemId: option.itemDef.id,
                itemDef: option.itemDef,
                yarnToSpend: null,
                context: 'craftCircle',
                craftCirclePlayerIndex: playerIndex,
            };
            this.showCraftColorPicker(option.itemDef);
        }
    },

    onCraftCircleSkip: function() {
        this.els.craftCircleModal.style.display = 'none';
        var cb = this._craftCircleCallback;
        var currentIdx = this._craftCircleCurrentPlayer || 0;
        // Advance to next player in the Craft Circle queue
        var nextIdx = currentIdx + 1;
        this._craftCircleCallback = null;
        if (nextIdx < Game.state.playerCount) {
            UI.showCraftCircleModal(nextIdx, cb);
        } else {
            if (cb) cb();
        }
    },


    /* =========================================================
       SESSION 6: SPECIAL REQUEST TAKE MODAL
       Shown when an SR is revealed during Restock.
       In single-player, player always takes it.
       ========================================================= */

    _srTakeCallback: null,

    /**
     * Show the Special Request take modal.
     * @param {Object}   card     — SR card object
     * @param {function} callback — called after player takes the SR
     */
    showSRTakeModal: function(card, callback) {
        this._srTakeCallback = callback;
        this._srTakeCard = card;
        try{ if(window.Sound) Sound.play('sr-find'); }catch(e){}

        // Session 21: Title = SR name, subtitle = "[Player] found a Special Request"
        var titleEl = document.getElementById('srTakeTitle');
        if (titleEl) titleEl.textContent = card.name;

        this.els.srTakeCardImg.src = card.img;
        this.els.srTakeCardImg.alt = card.name;
        this.els.srTakeName.textContent = card.name;
        this.els.srTakePoints.textContent = card.points + ' pts';

        // Session 9: Show favorite badge — check against active player's character
        var isFav = card.favoriteOf
            ? card.favoriteOf === Game.state.player.characterId
            : card.isFavorite;
        if (isFav) {
            this.els.srTakeFavorite.textContent = '♥ ' + Game.state.player.name + '\'s Favorite!';
            this.els.srTakeFavorite.style.display = 'flex';
        } else {
            this.els.srTakeFavorite.style.display = 'none';
        }

        // Show yarn requirement — handle all colorRules
        var yarnHtml = '';
        var srRule = card.colorRule || 'specific';
        if (srRule === 'specific' && card.yarn) {
            CARDS.COLORS.forEach(function(color) {
                if (!card.yarn[color]) return;
                var amount = card.yarn[color];
                var hex = CARDS.COLOR_HEX[color];
                yarnHtml += '<span class="confirm-yarn-tag" style="background:' + hex + '">' +
                    amount + ' ' + color.charAt(0).toUpperCase() + color.slice(1) + '</span>';
            });
        } else if (card.yarnCount) {
            var ruleDesc = {
                any:       'Any ' + card.yarnCount + ' yarn',
                sameColor: card.yarnCount + ' of the same color',
                different: card.yarnCount + ' different colors',
                give:      'Give ' + card.yarnCount + ' yarn to each other player',
            };
            yarnHtml = '<span class="sr-cost-desc">' + (ruleDesc[srRule] || '') + '</span>';
        }
        this.els.srTakeYarn.innerHTML = yarnHtml || '<span style="opacity:0.7">No yarn required</span>';

        // Session 21: Subtitle shows who found it
        var giveBtn = document.getElementById('srGiveBtn');
        var subtitle = document.getElementById('srTakeSubtitle');
        var playerName = Game.state.player ? Game.state.player.name : 'You';
        if (Game.state.playerCount > 1) {
            giveBtn.style.display = '';
            if (subtitle) subtitle.textContent = playerName + ' found a Special Request!';
        } else {
            giveBtn.style.display = 'none';
            if (subtitle) subtitle.textContent = playerName + ' found a Special Request!';
        }
        // Reset give picker state
        document.getElementById('srGivePicker').style.display = 'none';
        document.getElementById('srTakeButtons').style.display = 'flex';
        this._srGiveTargetIndex = null;

        this.els.srTakeModal.style.display = 'flex';
    },

    onSRTakeConfirm: function() {
        // Session 21: Show confirmation "[SR Name] given to [Player Name]"
        var card = this._srTakeCard;
        var player = Game.state.player;
        this._showSRAssignConfirm(card ? card.name : 'Special Request', player ? player.name : 'You');
    },

    /**
     * Session 21: Brief confirmation overlay after SR assignment.
     * Shows "[SR Name] given to [Player Name]" then auto-closes.
     * @param {string} srName — name of the SR card
     * @param {string} playerName — name of the player receiving it
     */
    _showSRAssignConfirm: function(srName, playerName) {
        var titleEl = document.getElementById('srTakeTitle');
        if (titleEl) titleEl.textContent = srName + ' given to ' + playerName;

        // Hide the buttons/picker, keep the card visible
        document.getElementById('srTakeButtons').style.display = 'none';
        document.getElementById('srGivePicker').style.display = 'none';
        var subtitle = document.getElementById('srTakeSubtitle');
        if (subtitle) subtitle.style.display = 'none';

        var self = this;
        setTimeout(function() {
            self.els.srTakeModal.style.display = 'none';
            // Restore button/subtitle visibility for next use
            document.getElementById('srTakeButtons').style.display = 'flex';
            if (subtitle) subtitle.style.display = '';
            var cb = self._srTakeCallback;
            self._srTakeCallback = null;
            self._srTakeCard = null;
            if (cb) cb();
        }, 1800);
    },

    /**
     * Session 9b: Toggle the "Give to..." player picker in SR Take modal.
     */
    onSRGiveToggle: function() {
        var picker = document.getElementById('srGivePicker');
        var buttons = document.getElementById('srTakeButtons');
        var list = document.getElementById('srGivePlayerList');
        list.innerHTML = '';

        // Build a button for each OTHER player
        var activeIdx = Game.state.activePlayerIndex;
        Game.state.players.forEach(function(p, i) {
            if (i === activeIdx) return;
            var btn = document.createElement('button');
            btn.className = 'sr-give-player-btn';
            btn.textContent = p.name + (p.isAI ? ' (CPU)' : '');
            (function(idx) {
                btn.addEventListener('click', function() {
                    UI.onSRGiveTo(idx);
                });
            })(i);
            list.appendChild(btn);
        });

        buttons.style.display = 'none';
        picker.style.display = 'block';
    },

    /**
     * Session 9b: Cancel give — back to Keep/Give buttons.
     */
    onSRGiveCancel: function() {
        document.getElementById('srGivePicker').style.display = 'none';
        document.getElementById('srTakeButtons').style.display = 'flex';
    },

    /**
     * Session 9b: Give the pending SR card to another player.
     * @param {number} targetPlayerIndex — who receives the SR
     */
    onSRGiveTo: function(targetPlayerIndex) {
        this._srGiveTargetIndex = targetPlayerIndex;
        // Session 21: Show confirmation with target player's name
        var card = this._srTakeCard;
        var targetPlayer = Game.state.players[targetPlayerIndex];
        this._showSRAssignConfirm(
            card ? card.name : 'Special Request',
            targetPlayer ? targetPlayer.name : 'Player'
        );
    },


    /* =========================================================
       YARN BOWL
       ========================================================= */

    // ROYGBIV order for yarn bowl display
    _yarnBowlOrder: ['red', 'orange', 'yellow', 'green', 'blue', 'purple'],

    buildYarnBowl: function() {
        var grid = this.els.yarnBowl;
        grid.innerHTML = '';

        this._yarnBowlOrder.forEach(function(color) {
            var slot = document.createElement('div');
            slot.className = 'yarn-token-slot';
            slot.setAttribute('data-color', color);

            slot.innerHTML =
                '<div class="yarn-token-wrap">' +
                    '<img class="yarn-token-img" ' +
                        'src="Wood Yarn Tokens PNG/' + color + '.png" ' +
                        'alt="' + color.charAt(0).toUpperCase() + color.slice(1) + ' Yarn">' +
                    '<span class="yarn-count" id="yarnCount_' + color + '">0</span>' +
                '</div>';

            grid.appendChild(slot);
        });
    },

    renderYarnBowl: function(changedColors) {
        var bowl = Game.state.player.yarnBowl;

        CARDS.COLORS.forEach(function(color) {
            var el = document.getElementById('yarnCount_' + color);
            if (!el) return;

            var newCount = bowl[color] || 0;
            el.textContent = newCount;

            if (changedColors && changedColors.indexOf(color) !== -1) {
                el.classList.remove('pulse');
                void el.offsetWidth;
                el.classList.add('pulse');
            }
        });
    },


    /* =========================================================
       DECK COUNTER
       ========================================================= */

    renderDeckCounter: function() {
        var el = this.els.deckCounter;
        if (!el) return;
        var count = Game.state.deck.length;
        el.textContent = count + ' card' + (count !== 1 ? 's' : '') + ' left';

        // Session 15b: Update yarn deck card back count
        var deckCount = document.getElementById('yarnDeckCount');
        if (deckCount) deckCount.textContent = count + ' in deck';
    },


    /* =========================================================
       CRAFT GRID (regular items: hat, bear, mittens, scarf, blanket)
       ========================================================= */

    renderCraftGrid: function() {
        var grid = this.els.craftGrid;
        if (!grid) return;
        grid.innerHTML = '';

        // Session 36: Hank boss — no craft-row grid on his board. He's AI-only (no human
        // ever plays him, and that strip is a human control), and he crafts with no color
        // requirements anyway, so the pattern grid is meaningless on his solo board.
        if (Game.state.player && Game.state.player.isHank) return;

        var options = Game.getCraftOptions();
        var phase = Game.state.phase;
        var craftEnabled = (phase === 'playerActions' || phase === 'finalCraft') && Game.getAvailableActions().canCraft;

        options.forEach(function(opt) {

            var slot = document.createElement('div');
            var canClick = opt.canAfford && craftEnabled;
            // Session 22: Three states — clickable (can-afford + craft phase), affordable but wrong phase, unaffordable
            var slotClass = 'craft-slot';
            if (canClick) {
                slotClass += ' can-afford';
            } else if (!opt.canAfford) {
                slotClass += ' cannot-afford';
            }
            // When affordable but not in craft phase, no extra class — neutral appearance
            slot.className = slotClass;
            slot.setAttribute('tabindex', '0');
            slot.setAttribute('aria-label', opt.itemDef.name + (opt.learned ? ' (learned)' : '') +
                ' — ' + (opt.itemDef.yarnCount || 0) + ' yarn' +
                (canClick ? ', click to craft' : opt.canAfford ? '' : ', cannot afford'));

            var imgSrc;
            if (opt.tile && !opt.learned) {
                // Unlearned: show the exact (front) side of the pattern tile
                imgSrc = opt.tile.img;
            } else if (opt.tile && opt.learned && opt.tile.backImg) {
                // Session 10b: Learned pattern — show the BACK of the pattern tile
                // (general side), NOT the item art
                imgSrc = opt.tile.backImg;
            } else if (opt.itemDef.tileImg) {
                // Session 20: Hat/blanket have dedicated tile images for blank board overlay
                imgSrc = opt.itemDef.tileImg;
            } else {
                imgSrc = opt.itemDef.img;
            }

            var img = document.createElement('img');
            img.className = 'craft-slot-img';
            img.src = imgSrc;
            img.alt = opt.itemDef.name;
            slot.appendChild(img);

            var name = document.createElement('div');
            name.className = 'craft-slot-name';
            name.textContent = opt.itemDef.name;
            slot.appendChild(name);

            var costEl = document.createElement('div');
            costEl.className = 'craft-slot-cost';

            if (opt.tile && !opt.learned) {
                // Unlearned pattern: show exact color dots with have/short treatment
                var exact = opt.tile.exact;
                var bowl = Game.state.player ? Game.state.player.yarnBowl : {};
                CARDS.COLORS.forEach(function(color) {
                    if (!exact[color]) return;
                    var have = bowl[color] || 0;
                    for (var d = 0; d < exact[color]; d++) {
                        var dot = document.createElement('span');
                        var isHave = d < have;
                        dot.className = 'craft-cost-dot' + (isHave ? ' dot-have' : ' dot-short');
                        dot.style.backgroundColor = CARDS.COLOR_HEX[color];
                        dot.setAttribute('data-cb-color', color);
                        dot.setAttribute('aria-label', color + ' yarn' + (isHave ? ' (have)' : ' (need)'));
                        costEl.appendChild(dot);
                    }
                });
            } else {
                // Learned pattern or generic item: show neutral grey dots
                // Session 15b: dots instead of number label — use yarnCount (numeric)
                var dotCount = opt.itemDef.yarnCount || 0;
                for (var n = 0; n < dotCount; n++) {
                    var neutralDot = document.createElement('span');
                    neutralDot.className = 'craft-cost-dot craft-cost-dot-neutral';
                    costEl.appendChild(neutralDot);
                }
            }
            slot.appendChild(costEl);

            if (canClick) {
                (function(option) {
                    slot.addEventListener('click', function() {
                        UI.onCraftClick(option);
                    });
                })(opt);
            }

            grid.appendChild(slot);
        });
    },

    onCraftClick: function(option) {
        if (!option.canAfford) return;

        var actions = Game.getAvailableActions();
        if (!actions.canCraft) return;

        // Session 8c: craftAnyColors — always use 'any' color picker, ignore normal rules
        if (Game.state.craftAnyColors) {
            this._pendingCraft = {
                type: 'item',
                itemId: option.itemDef.id,
                itemDef: Object.assign({}, option.itemDef, { colorRule: 'any', yarnCount: option.itemDef.yarnCount }),
                yarnToSpend: null,
                option: option,
                context: 'craftAnyColors',
            };
            this.showCraftColorPicker(this._pendingCraft.itemDef, '🌈 Any Colors — Choose ' + option.itemDef.yarnCount + ' Yarn');
            return;
        }

        if (option.tile && !option.learned) {
            this._pendingCraft = {
                type: 'item',
                itemId: option.itemDef.id,
                itemDef: option.itemDef,
                yarnToSpend: Object.assign({}, option.tile.exact),
                option: option,
            };
            this.showCraftConfirm();
        } else {
            this._pendingCraft = {
                type: 'item',
                itemId: option.itemDef.id,
                itemDef: option.itemDef,
                yarnToSpend: null,
                option: option,
            };
            this.showCraftColorPicker(option.itemDef);
        }
    },

    _pendingCraft: null,


    /* =========================================================
       SESSION 6: SPECIAL REQUESTS PANEL
       Shows held SRs (not yet crafted) in a strip below the craft strip.
       ========================================================= */

    /**
     * Render the Special Requests panel.
     * Shows if player has held SRs; hidden when empty.
     */
    renderSpecialRequests: function() {
        var strip = this.els.srStrip;
        var grid = this.els.srGrid;
        if (!strip || !grid) return;

        var srOptions = Game.getSRCraftOptions();

        // Session 15b: Update the board overlay SR reminder
        this._renderSRBoardReminder();

        if (srOptions.length === 0) {
            strip.style.display = 'none';
            return;
        }

        strip.style.display = 'block';
        grid.innerHTML = '';

        var phase = Game.state.phase;
        var craftEnabled = (phase === 'playerActions' || phase === 'finalCraft') && Game.getAvailableActions().canCraft;

        srOptions.forEach(function(opt) {
            var sr = opt.sr;
            var canClick = opt.canAfford && craftEnabled;

            var slot = document.createElement('div');
            slot.className = 'craft-slot sr-craft-slot ' + (canClick ? 'can-afford' : 'cannot-afford');
            slot.setAttribute('tabindex', '0');
            slot.setAttribute('aria-label', sr.name + ' — ' + sr.points + ' points' +
                (sr.isFavorite ? ' (Favorite!)' : '') +
                (canClick ? ', click to craft' : opt.canAfford ? '' : ', cannot afford'));

            // Card image
            var img = document.createElement('img');
            img.className = 'craft-slot-img sr-img';
            img.src = sr.img;
            img.alt = sr.name + ' Special Request card';
            slot.appendChild(img);

            // Name + favorite indicator
            var nameWrap = document.createElement('div');
            nameWrap.className = 'craft-slot-name';
            nameWrap.textContent = sr.name;
            if (sr.isFavorite) {
                var heart = document.createElement('span');
                heart.className = 'sr-favorite-heart';
                heart.textContent = ' ♥';
                heart.title = 'Favorite Request! Worth +5 bonus points when crafted.';
                nameWrap.appendChild(heart);
            }
            slot.appendChild(nameWrap);

            // Points
            var pts = document.createElement('div');
            pts.className = 'sr-points-label';
            pts.textContent = sr.points + ' pts' + (sr.isFavorite ? ' +5★' : '');
            slot.appendChild(pts);

            // Yarn cost — render based on colorRule
            var costEl = document.createElement('div');
            costEl.className = 'craft-slot-cost';
            var srRule = sr.colorRule || 'specific';
            if (srRule === 'specific' && sr.yarn) {
                // Exact color dots
                CARDS.COLORS.forEach(function(color) {
                    if (!sr.yarn[color]) return;
                    for (var d = 0; d < sr.yarn[color]; d++) {
                        var dot = document.createElement('span');
                        dot.className = 'craft-cost-dot';
                        dot.style.backgroundColor = CARDS.COLOR_HEX[color];
                        dot.setAttribute('data-cb-color', color);
                        dot.setAttribute('aria-label', color + ' yarn');
                        costEl.appendChild(dot);
                    }
                });
            } else {
                // Descriptive label for non-specific rules
                var ruleLabels = {
                    any:       sr.yarnCount + ' any yarn',
                    sameColor: sr.yarnCount + ' same color',
                    different: sr.yarnCount + ' diff. colors',
                    give:      'Give ' + sr.yarnCount + ' each',
                };
                var lbl = document.createElement('span');
                lbl.className = 'craft-cost-label';
                lbl.textContent = ruleLabels[srRule] || '';
                costEl.appendChild(lbl);
            }
            slot.appendChild(costEl);

            // Click to craft
            if (canClick) {
                (function(srOption) {
                    slot.addEventListener('click', function() {
                        UI.onSRCraftClick(srOption.sr);
                    });
                })(opt);
            }

            grid.appendChild(slot);
        });
    },

    /**
     * Handle clicking an SR to craft it.
     * Routes to color picker for non-specific colorRules.
     */
    onSRCraftClick: function(sr) {
        var actions = Game.getAvailableActions();
        if (!actions.canCraft) return;

        var rule = sr.colorRule || 'specific';
        var baseItemDef = { id: sr.id, name: sr.name, img: sr.img, points: sr.points };

        // Session 8c: craftAnyColors — override to 'any' picker for SRs too
        if (Game.state.craftAnyColors) {
            var srYarnCount = sr.yarnCount || 0;
            if (!srYarnCount && sr.yarn) {
                CARDS.COLORS.forEach(function(c) { srYarnCount += (sr.yarn[c] || 0); });
            }
            this._pendingCraft = {
                type: 'sr', srUid: sr.uid,
                itemDef: Object.assign({}, baseItemDef, { colorRule: 'any', yarnCount: srYarnCount }),
                yarnToSpend: null,
                context: 'craftAnyColors',
            };
            this.showCraftColorPicker(this._pendingCraft.itemDef, '🌈 Any Colors — Choose ' + srYarnCount + ' Yarn');
            return;
        }

        if (!Game.canAffordSpecialRequest(sr)) return;

        if (rule === 'specific') {
            // Exact colors — go straight to confirm
            this._pendingCraft = {
                type: 'sr', srUid: sr.uid,
                itemDef: baseItemDef,
                yarnToSpend: Object.assign({}, sr.yarn),
            };
            this.showCraftConfirm();

        } else if (rule === 'give') {
            // Give N yarn to each other player — treat as 'any' pick (lose yarn, gain points)
            this._pendingCraft = {
                type: 'sr', srUid: sr.uid,
                itemDef: Object.assign({}, baseItemDef, { colorRule: 'any', yarnCount: sr.yarnCount }),
                yarnToSpend: null,
                context: 'srGive',
            };
            this.showCraftColorPicker(this._pendingCraft.itemDef, 'Choose ' + sr.yarnCount + ' Yarn to Give Away');

        } else if (rule === 'specificPlusAny' || rule === 'specificPlusSame' || rule === 'sameColorPlus') {
            // Session 36: compound expansion rules (Koi/Mallard/Dog Bandana/Skelly/Ghost).
            // These pair a FIXED required yarn with a FLEXIBLE pick. The old picker had no
            // target count for the first two → couldn't select anything. Fix: reserve the
            // fixed yarn, open the picker for ONLY the flexible portion (capped by bowl minus
            // the reserve), then merge both on confirm. craftSpecialRequest validates
            // affordability only, so this picker is the rule-enforcer.
            var reserved, flexRule, flexCount, exclude = null;
            if (rule === 'specificPlusAny') {            // e.g. Koi: 3 orange + 2 any
                reserved = Object.assign({}, sr.yarn || {});
                flexRule = 'any'; flexCount = sr.anyCount || 0;
            } else if (rule === 'specificPlusSame') {    // e.g. Dog Bandana: 3 purple + 2 of one color
                reserved = Object.assign({}, sr.yarn || {});
                flexRule = 'oneColor'; flexCount = sr.sameCount || 0;
            } else {                                     // sameColorPlus, e.g. Skelly: 5 of one color (not orange) + 1 orange
                reserved = Object.assign({}, sr.plusYarn || {});
                flexRule = 'oneColor'; flexCount = sr.yarnCount || 0;
                exclude = Object.keys(reserved);         // the "same" color cannot be a plus color
            }
            this._pendingCraft = {
                type: 'sr', srUid: sr.uid,
                itemDef: Object.assign({}, baseItemDef, { colorRule: flexRule, yarnCount: flexCount }),
                yarnToSpend: null, reservedYarn: reserved, excludeColors: exclude,
            };
            var fixedLabel = this._fixedYarnLabel(reserved);
            var verb = (flexRule === 'oneColor') ? (flexCount + ' of one color') : (flexCount + ' of any colors');
            var notLabel = exclude ? (' (not ' + exclude.join('/') + ')') : '';
            this.showCraftColorPicker(this._pendingCraft.itemDef, 'Plus ' + verb + notLabel + ' — also gives ' + fixedLabel);

        } else {
            // any / sameColor / different — open color picker
            var pickerRule = rule === 'sameColor' ? 'oneColor' : rule; // map sameColor → oneColor
            var pickerTitle = {
                any:      'Choose Any ' + sr.yarnCount + ' Yarn',
                sameColor:'Choose ' + sr.yarnCount + ' of One Color',
                different:'Choose ' + sr.yarnCount + ' Different Colors',
            };
            this._pendingCraft = {
                type: 'sr', srUid: sr.uid,
                itemDef: Object.assign({}, baseItemDef, { colorRule: pickerRule, yarnCount: sr.yarnCount }),
                yarnToSpend: null,
            };
            this.showCraftColorPicker(this._pendingCraft.itemDef, pickerTitle[rule] || ('Choose ' + sr.yarnCount + ' Yarn'));
        }
    },


    /* =========================================================
       CRAFT CONFIRMATION MODAL
       ========================================================= */

    showCraftConfirm: function() {
        var pending = this._pendingCraft;
        if (!pending) return;

        var body = this.els.craftConfirmBody;
        var html = '';
        var isFrog = pending.context === 'frogIt';

        html += '<img class="craft-confirm-item-img" src="' + pending.itemDef.img + '" alt="' + pending.itemDef.name + '">';
        html += '<div class="craft-confirm-item-name">' + pending.itemDef.name + '</div>';

        // SR: show points
        if (pending.type === 'sr') {
            var srInHand = this._findSRInHand(pending.srUid);
            html += '<div class="sr-points-confirm">' + pending.itemDef.points + ' pts' +
                (srInHand && srInHand.isFavorite ? ' +5★ Favorite!' : '') +
                '</div>';
        }

        // Frog It: show points lost
        if (isFrog) {
            html += '<div class="frog-confirm-note">🐸 Returning this item — get yarn back.</div>';
        }

        var costLabel = isFrog ? 'Yarn to receive:' : 'Yarn to spend:';
        var sign      = isFrog ? '+' : '-';

        html += '<div class="craft-confirm-cost">';
        html += '<span class="craft-confirm-cost-label">' + costLabel + '</span>';
        CARDS.COLORS.forEach(function(color) {
            if (!pending.yarnToSpend[color]) return;
            var amount = pending.yarnToSpend[color];
            var hex = CARDS.COLOR_HEX[color];
            html += '<span class="confirm-yarn-tag" style="background:' + hex + '">' + sign + amount + ' ' +
                color.charAt(0).toUpperCase() + color.slice(1) + '</span>';
        });
        html += '</div>';

        body.innerHTML = html;
        this.els.craftConfirmTitle.textContent = isFrog
            ? 'Frog ' + pending.itemDef.name + '?'
            : 'Craft ' + pending.itemDef.name + '?';
        this.els.craftConfirmModal.style.display = 'flex';
    },

    /** Helper to find an SR in the player's hand by uid */
    _findSRInHand: function(uid) {
        return Game.state.player.specialRequests.find(function(sr) { return sr.uid === uid; });
    },

    onConfirmCraft: function() {
        this.els.craftConfirmModal.style.display = 'none';
        var pending = this._pendingCraft;
        if (!pending) return;

        var changed;
        var isCraftCircle = pending.context === 'craftCircle';
        var isFrogIt      = pending.context === 'frogIt';
        var ccPlayerIdx   = pending.craftCirclePlayerIndex || 0;

        // Session 17: Capture SR data before crafting (for moment modal)
        var srData = null;
        if (pending.type === 'sr' && pending.srUid && !isFrogIt) {
            srData = UI._findSRInHand(pending.srUid);
        }

        if (isFrogIt) {
            // Frog It: return item, get yarn back
            changed = Game.frogIt(pending.frogItemIndex, pending.yarnToSpend);
            if (changed) {
                UI.renderYarnBowl(changed);
                UI.renderCraftGrid();
                UI.renderFinishedObjects();
                UI.renderProjectStrip();
                UI.renderActionBar();
            }
            this._pendingCraft = null;
            return;
        }

        if (isCraftCircle) {
            // Craft Circle: use the free-craft function (doesn't consume craftUsed)
            changed = Game.craftCircleItem(
                pending.type === 'item' ? pending.itemId : null,
                pending.type === 'sr'   ? pending.srUid  : null,
                pending.yarnToSpend,
                ccPlayerIdx
            );
        } else if (pending.type === 'sr') {
            changed = Game.craftSpecialRequest(pending.srUid, pending.yarnToSpend);
        } else {
            changed = Game.craft(pending.itemId, pending.yarnToSpend);
        }

        if (changed) {
            // Session 8c: clear craftAnyColors after using it
            if (pending.context === 'craftAnyColors') {
                Game.state.craftAnyColors = false;
            }
            UI.renderYarnBowl(changed);
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            UI.renderFinishedObjects();
            UI.renderProjectStrip();
            UI.renderActionBar();
        }

        // Session 17: Show SR completion moment (not for regular items or frog it)
        if (changed && srData && !isCraftCircle) {
            var isFav = srData.isFavorite;
            var savedPending = pending;
            this._pendingCraft = null;
            var srPlayer = Game.state.player;
            UI.showGameMoment({
                badge: isFav ? 'Favorite Completed!' : 'SR Completed!',
                badgeClass: isFav ? 'moment-favorite' : 'moment-sr',
                img: srData.img,
                title: srData.name,
                desc: UI._getSRDesc('completed', srData, srPlayer.name, srPlayer.isAI),
                points: srData.points
            }, function() {
                // Final craft phase: after 1 craft, auto-end
                if (Game.state.phase === 'finalCraft' && !isCraftCircle) {
                    Game.state.turn.craftUsed++;
                    setTimeout(function() { Game.endFinalCraft(); }, 600);
                }
            });
            return;
        }

        this._pendingCraft = null;

        // Final craft phase: after 1 craft, auto-end
        if (Game.state.phase === 'finalCraft' && changed && !isCraftCircle) {
            Game.state.turn.craftUsed++;
            setTimeout(function() { Game.endFinalCraft(); }, 600);
            return;
        }

        if (isCraftCircle) {
            // Advance to next player in the Craft Circle queue
            var nextIdx = ccPlayerIdx + 1;
            var cb = UI._craftCircleCallback;
            UI._craftCircleCallback = null;
            if (nextIdx < Game.state.playerCount) {
                UI.showCraftCircleModal(nextIdx, cb);
            } else {
                if (cb) cb();
            }
        }
    },

    onCancelCraft: function() {
        this.els.craftConfirmModal.style.display = 'none';
        var pending = this._pendingCraft;
        this._pendingCraft = null;

        // If cancelling during Craft Circle, show the grid again
        if (pending && pending.context === 'craftCircle') {
            UI.showCraftCircleModal(pending.craftCirclePlayerIndex || 0, UI._craftCircleCallback);
        }
        // If cancelling during Frog It, show the frog list again
        if (pending && pending.context === 'frogIt') {
            UI.showFrogItModal();
        }
    },


    /* =========================================================
       CRAFT COLOR PICKER MODAL
       ========================================================= */

    _craftColorAlloc: {},

    /**
     * @param {Object} itemDef — item (or SR pseudo-item) with colorRule and yarnCount
     * @param {string} [overrideTitle] — optional title to use instead of auto-generated one
     */
    // Session 36: pretty-print a fixed yarn map, e.g. {orange:3} → "3 Orange".
    _fixedYarnLabel: function(map) {
        return Object.keys(map || {}).map(function(c) {
            return map[c] + ' ' + c.charAt(0).toUpperCase() + c.slice(1);
        }).join(' + ');
    },

    showCraftColorPicker: function(itemDef, overrideTitle) {
        var bowl = Game.state.player.yarnBowl;
        var needed = itemDef.yarnCount;
        var rule = itemDef.colorRule;

        this._craftColorAlloc = {};
        CARDS.COLORS.forEach(function(c) { UI._craftColorAlloc[c] = 0; });

        this._buildCraftColorBody(itemDef, bowl);

        var ruleLabel = {
            oneColor: needed + ' of 1 color',
            twoColors: needed + ' across 2 colors',
            different: needed + ' different colors',
            any: 'any ' + needed + ' yarn',
        };
        this.els.craftColorTitle.textContent = overrideTitle || ('Choose Yarn — ' + (ruleLabel[rule] || needed + ' yarn'));
        this.els.craftColorConfirmBtn.disabled = true;

        // Session 22: Inject off-turn context if this is a craft-circle color pick
        var ccContent = this.els.craftColorModal.querySelector('.craft-color-content');
        var contextContainer = ccContent.querySelector('.otc-container');
        if (!contextContainer) {
            contextContainer = document.createElement('div');
            contextContainer.className = 'otc-container';
            ccContent.insertBefore(contextContainer, this.els.craftColorBody);
        }
        var pending = this._pendingCraft;
        if (pending && pending.context === 'craftCircle' && typeof pending.craftCirclePlayerIndex === 'number') {
            var ccPlayer = Game.state.players[pending.craftCirclePlayerIndex];
            contextContainer.innerHTML = this._buildOffTurnContext(ccPlayer, 'color-pick', overrideTitle || 'Choose Yarn');
            // Hide title if context was rendered
            if (contextContainer.innerHTML !== '') {
                this.els.craftColorTitle.style.display = 'none';
            } else {
                this.els.craftColorTitle.style.display = '';
            }
        } else {
            contextContainer.innerHTML = '';
            this.els.craftColorTitle.style.display = '';
        }

        this.els.craftColorModal.style.display = 'flex';
    },

    _buildCraftColorBody: function(itemDef) {
        var bowl = Game.state.player.yarnBowl;
        var alloc = this._craftColorAlloc;
        var needed = itemDef.yarnCount;
        var rule = itemDef.colorRule;
        // Session 36: Frog It is a RECEIVE flow — the player picks which yarn to get back,
        // so selection is bound only by the count needed, not by what's in the bowl.
        var isReceive = !!(this._pendingCraft && this._pendingCraft.context === 'frogIt');
        // Session 36: compound SR rules reserve a FIXED yarn portion (auto-included) and may
        // exclude colors from the flexible pick. Availability for the flexible part is the
        // bowl minus what's reserved for the fixed part, so we never double-spend.
        var reserved = (this._pendingCraft && this._pendingCraft.reservedYarn) || {};
        var exclude  = (this._pendingCraft && this._pendingCraft.excludeColors) || [];
        var totalAlloc = 0;
        CARDS.COLORS.forEach(function(c) { totalAlloc += alloc[c]; });

        var body = this.els.craftColorBody;
        var html = '';

        CARDS.COLORS.forEach(function(color) {
            if (exclude.indexOf(color) !== -1) return;   // not allowed for the flexible portion
            var available = (bowl[color] || 0) - (reserved[color] || 0);
            if (available < 0) available = 0;
            var current = alloc[color];
            var hex = CARDS.COLOR_HEX[color];
            var capName = color.charAt(0).toUpperCase() + color.slice(1);

            if (rule === 'oneColor' && !isReceive && available < needed && current === 0) return;

            var room = needed - totalAlloc + current;
            var maxForColor = isReceive ? room : Math.min(available, room);
            if (rule === 'different') maxForColor = Math.min(maxForColor, 1);
            if (rule === 'oneColor') {
                var otherUsed = false;
                CARDS.COLORS.forEach(function(c) { if (c !== color && alloc[c] > 0) otherUsed = true; });
                if (otherUsed) maxForColor = 0;
            }

            var canIncrement = current < maxForColor && totalAlloc < needed;
            var canDecrement = current > 0;

            html += '<div class="craft-color-row">';
            html += '<div class="craft-color-info">';
            html += '<span class="craft-color-dot" style="background:' + hex + '" data-cb-color="' + color + '" aria-label="' + capName + '"></span>';
            html += '<span class="craft-color-label">' + capName + '</span>';
            if (!isReceive) html += '<span class="craft-color-available">(have ' + available + ')</span>';
            html += '</div>';
            html += '<div class="craft-color-controls">';
            html += '<button aria-label="Use less ' + capName + '" onclick="UI._craftColorAdjust(\'' + color + '\', -1)" ' + (canDecrement ? '' : 'disabled') + '>-</button>';
            html += '<span class="craft-color-count">' + current + '</span>';
            html += '<button aria-label="Use more ' + capName + '" onclick="UI._craftColorAdjust(\'' + color + '\', 1)" ' + (canIncrement ? '' : 'disabled') + '>+</button>';
            html += '</div>';
            html += '</div>';
        });

        html += '<div class="craft-color-summary">' + totalAlloc + ' of ' + needed + ' yarn selected</div>';

        body.innerHTML = html;

        var valid = totalAlloc === needed;
        if (valid && rule === 'twoColors') {
            var usedColors = CARDS.COLORS.filter(function(c) { return alloc[c] > 0; }).length;
            valid = usedColors === 2;
        }
        this.els.craftColorConfirmBtn.disabled = !valid;
    },

    _craftColorAdjust: function(color, delta) {
        var pending = this._pendingCraft;
        if (!pending) return;

        var rule = pending.itemDef.colorRule;
        var needed = pending.itemDef.yarnCount;

        if (rule === 'oneColor') {
            if (delta > 0) {
                CARDS.COLORS.forEach(function(c) { UI._craftColorAlloc[c] = 0; });
                this._craftColorAlloc[color] = needed;
            } else {
                this._craftColorAlloc[color] = 0;
            }
        } else {
            this._craftColorAlloc[color] = Math.max(0, this._craftColorAlloc[color] + delta);
        }

        this._buildCraftColorBody(pending.itemDef);
    },

    onCraftColorConfirm: function() {
        this.els.craftColorModal.style.display = 'none';
        var pending = this._pendingCraft;
        if (!pending) return;

        var spend = {};
        CARDS.COLORS.forEach(function(c) {
            if (UI._craftColorAlloc[c] > 0) spend[c] = UI._craftColorAlloc[c];
        });
        // Session 36: fold in the reserved fixed yarn (compound SR rules) so the final
        // spend = fixed portion + the player's flexible pick.
        if (pending.reservedYarn) {
            Object.keys(pending.reservedYarn).forEach(function(c) {
                spend[c] = (spend[c] || 0) + pending.reservedYarn[c];
            });
        }
        pending.yarnToSpend = spend;

        // frogIt context: color picker chose "yarn to receive", go straight to frog confirm
        // (context is already set on _pendingCraft, showCraftConfirm handles display)
        this.showCraftConfirm();
    },

    onCraftColorCancel: function() {
        this.els.craftColorModal.style.display = 'none';
        var pending = this._pendingCraft;
        this._pendingCraft = null;
        // If cancelling color picker during Craft Circle, re-show the Craft Circle modal
        if (pending && pending.context === 'craftCircle') {
            UI.showCraftCircleModal(pending.craftCirclePlayerIndex || 0, UI._craftCircleCallback);
        }
        // If cancelling color picker during Frog It, re-show frog list
        if (pending && pending.context === 'frogIt') {
            UI.showFrogItModal();
        }
    },


    /* =========================================================
       EXCHANGE MODAL
       ========================================================= */

    _exchangeGive: {},
    _exchangeReceive: {},

    showExchangeModal: function() {
        this._exchangeGive = {};
        this._exchangeReceive = {};
        CARDS.COLORS.forEach(function(c) {
            UI._exchangeGive[c] = 0;
            UI._exchangeReceive[c] = 0;
        });

        this._buildExchangeBody();
        this.els.exchangeConfirmBtn.disabled = true;
        this.els.exchangeModal.style.display = 'flex';
    },

    _buildExchangeBody: function() {
        var bowl = Game.state.player.yarnBowl;
        var give = this._exchangeGive;
        var receive = this._exchangeReceive;

        var giveTotal = 0, receiveTotal = 0;
        CARDS.COLORS.forEach(function(c) {
            giveTotal += (give[c] || 0);
            receiveTotal += (receive[c] || 0);
        });

        var html = '';

        html += '<div class="exchange-section">';
        html += '<div class="exchange-section-label">Give Away</div>';
        CARDS.COLORS.forEach(function(color) {
            var available = bowl[color] || 0;
            var current = give[color] || 0;
            var hex = CARDS.COLOR_HEX[color];
            var capName = color.charAt(0).toUpperCase() + color.slice(1);

            if (available === 0 && current === 0) return;

            var canInc = current < available;
            var canDec = current > 0;

            html += '<div class="craft-color-row">';
            html += '<div class="craft-color-info">';
            html += '<span class="craft-color-dot" style="background:' + hex + '" data-cb-color="' + color + '" aria-label="' + capName + '"></span>';
            html += '<span class="craft-color-label">' + capName + '</span>';
            html += '<span class="craft-color-available">(have ' + available + ')</span>';
            html += '</div>';
            html += '<div class="craft-color-controls">';
            html += '<button aria-label="Give less ' + capName + '" onclick="UI._exchangeAdjust(\'give\',\'' + color + '\',-1)" ' + (canDec ? '' : 'disabled') + '>-</button>';
            html += '<span class="craft-color-count">' + current + '</span>';
            html += '<button aria-label="Give more ' + capName + '" onclick="UI._exchangeAdjust(\'give\',\'' + color + '\',1)" ' + (canInc ? '' : 'disabled') + '>+</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';

        html += '<div class="exchange-section">';
        html += '<div class="exchange-section-label">Receive</div>';
        CARDS.COLORS.forEach(function(color) {
            var current = receive[color] || 0;
            var hex = CARDS.COLOR_HEX[color];
            var capName = color.charAt(0).toUpperCase() + color.slice(1);

            var canInc = receiveTotal < giveTotal;
            var canDec = current > 0;

            html += '<div class="craft-color-row">';
            html += '<div class="craft-color-info">';
            html += '<span class="craft-color-dot" style="background:' + hex + '" data-cb-color="' + color + '" aria-label="' + capName + '"></span>';
            html += '<span class="craft-color-label">' + capName + '</span>';
            html += '</div>';
            html += '<div class="craft-color-controls">';
            html += '<button aria-label="Receive less ' + capName + '" onclick="UI._exchangeAdjust(\'receive\',\'' + color + '\',-1)" ' + (canDec ? '' : 'disabled') + '>-</button>';
            html += '<span class="craft-color-count">' + current + '</span>';
            html += '<button aria-label="Receive more ' + capName + '" onclick="UI._exchangeAdjust(\'receive\',\'' + color + '\',1)" ' + (canInc ? '' : 'disabled') + '>+</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';

        html += '<div class="craft-color-summary">';
        html += 'Give ' + giveTotal + ' → Receive ' + receiveTotal;
        if (giveTotal > 0 && receiveTotal < giveTotal) {
            html += '  <span style="opacity:0.6">(select ' + (giveTotal - receiveTotal) + ' more to receive)</span>';
        }
        html += '</div>';

        this.els.exchangeBody.innerHTML = html;
        this.els.exchangeConfirmBtn.disabled = !(giveTotal > 0 && giveTotal === receiveTotal);
    },

    _exchangeAdjust: function(side, color, delta) {
        if (side === 'give') {
            this._exchangeGive[color] = Math.max(0, (this._exchangeGive[color] || 0) + delta);
        } else {
            this._exchangeReceive[color] = Math.max(0, (this._exchangeReceive[color] || 0) + delta);
        }
        this._buildExchangeBody();
    },

    onExchangeConfirm: function() {
        // Guard: only allow during playerActions with exchange available
        if (Game.state.phase !== 'playerActions') return;
        this.els.exchangeModal.style.display = 'none';

        var give = {}, receive = {};
        CARDS.COLORS.forEach(function(c) {
            if (UI._exchangeGive[c] > 0) give[c] = UI._exchangeGive[c];
            if (UI._exchangeReceive[c] > 0) receive[c] = UI._exchangeReceive[c];
        });

        var changed = Game.exchange(give, receive);
        if (changed) {
            UI.renderYarnBowl(changed);
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            UI.renderActionBar();
        }
    },

    onExchangeCancel: function() {
        this.els.exchangeModal.style.display = 'none';
    },


    /* =========================================================
       Session 15b: SR BOARD REMINDER OVERLAY
       Mini thumbnails of held SRs overlaid on the player board
       so human players can't miss them (like physical game).
       ========================================================= */

    _renderSRBoardReminder: function() {
        var el = this.els.srBoardReminder;
        if (!el) return;

        var player = Game.state.player;
        if (!player || !player.specialRequests || player.specialRequests.length === 0) {
            el.style.display = 'none';
            return;
        }

        // Check craft state once for all SRs
        var phase = Game.state.phase;
        var craftEnabled = (phase === 'playerActions' || phase === 'finalCraft') && Game.getAvailableActions().canCraft;
        var srOptions = Game.getSRCraftOptions();

        el.style.display = 'flex';
        el.innerHTML = '';

        player.specialRequests.forEach(function(sr) {
            var card = document.createElement('div');
            card.className = 'sr-reminder-card' + (sr.isFavorite ? ' sr-reminder-fav' : '');

            // Thumbnail image
            var img = document.createElement('img');
            img.src = sr.img;
            img.alt = sr.name;
            card.appendChild(img);

            if (sr.isFavorite) {
                var heart = document.createElement('span');
                heart.className = 'sr-reminder-heart';
                heart.textContent = '♥';
                card.appendChild(heart);
            }

            // Session 15b: Hover preview tooltip — pops up above the thumbnail
            var tooltip = document.createElement('div');
            tooltip.className = 'sr-hover-preview';

            var previewImg = document.createElement('img');
            previewImg.className = 'sr-preview-img';
            previewImg.src = sr.img;
            previewImg.alt = sr.name;
            tooltip.appendChild(previewImg);

            var info = document.createElement('div');
            info.className = 'sr-preview-info';

            var nameEl = document.createElement('div');
            nameEl.className = 'sr-preview-name';
            nameEl.textContent = sr.name;
            if (sr.isFavorite) nameEl.innerHTML += ' <span style="color:#ff6b6b">♥</span>';
            info.appendChild(nameEl);

            var ptsEl = document.createElement('div');
            ptsEl.className = 'sr-preview-points';
            ptsEl.textContent = sr.points + ' pts' + (sr.isFavorite ? ' +5 bonus' : '');
            info.appendChild(ptsEl);

            // Cost dots
            var costEl = document.createElement('div');
            costEl.className = 'sr-preview-cost';
            var srRule = sr.colorRule || 'specific';
            if (srRule === 'specific' && sr.yarn) {
                CARDS.COLORS.forEach(function(color) {
                    if (!sr.yarn[color]) return;
                    for (var d = 0; d < sr.yarn[color]; d++) {
                        var dot = document.createElement('span');
                        dot.className = 'craft-cost-dot';
                        dot.style.backgroundColor = CARDS.COLOR_HEX[color];
                        costEl.appendChild(dot);
                    }
                });
            } else {
                var ruleLabels = {
                    any:       sr.yarnCount + ' any yarn',
                    sameColor: sr.yarnCount + ' same color',
                    different: sr.yarnCount + ' diff. colors',
                    give:      'Give ' + sr.yarnCount + ' each'
                };
                var lbl = document.createElement('span');
                lbl.className = 'sr-preview-cost-label';
                lbl.textContent = ruleLabels[srRule] || '';
                costEl.appendChild(lbl);
            }
            info.appendChild(costEl);

            // Craft button (only when craft phase is active)
            if (craftEnabled) {
                var matchOpt = null;
                srOptions.forEach(function(opt) {
                    if (opt.sr.uid === sr.uid) matchOpt = opt;
                });
                var canCraft = matchOpt ? matchOpt.canAfford : false;
                var btn = document.createElement('button');
                btn.className = 'sr-preview-craft-btn';
                btn.textContent = canCraft ? 'Craft' : 'Need yarn';
                if (!canCraft) btn.disabled = true;
                (function(srData) {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        UI.onSRCraftClick(srData);
                    });
                })(sr);
                info.appendChild(btn);
            }

            tooltip.appendChild(info);
            card.appendChild(tooltip);
            el.appendChild(card);
        });
    },


    /* =========================================================
       FINISHED OBJECTS
       ========================================================= */

    /**
     * Session 10b: Finished Objects — 3 distinct zones (Projects, Items, SRs)
     * with stacked duplicates and ×N count badges.
     */
    renderFinishedObjects: function() {
        var items = Game.state.player.items;
        var craftedSRs = Game.state.player.craftedSpecialRequests;
        var completedProjects = Game.state.player.projects || [];

        var grid = this.els.finishedGrid;
        var totalEl = this.els.finishedTotal;
        if (!grid) return;

        // Session 15c: Color-match pill and show character name
        var charType = Game.state.player ? Game.state.player.characterType : null;
        var charId = Game.state.player ? Game.state.player.characterId : null;
        var accent = charType ? (this._typeAccentColors[charType] || null) : null;
        var titleEl = document.getElementById('foDrawerTitle');
        var charNameEl = document.getElementById('foDrawerCharName');
        if (titleEl && accent) {
            titleEl.style.background = accent;
        }
        if (charNameEl && charId) {
            var charDef = CARDS.getCharacter(charId);
            charNameEl.textContent = charDef ? charDef.name : '';
        }

        grid.innerHTML = '';

        var totalPoints = 0;

        // Compute project points
        var projPoints = 0;
        completedProjects.forEach(function(p) { projPoints += p.points; });

        // If nothing at all, show empty message but still show 0 point tag
        if (items.length === 0 && craftedSRs.length === 0 && completedProjects.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'finished-empty';
            empty.textContent = 'Craft items to earn points';
            grid.appendChild(empty);
            if (totalEl) {
                totalEl.className = 'finished-objects-total has-points';
                totalEl.innerHTML = '';
                var zeroNum = document.createElement('span');
                zeroNum.className = 'fo-total-num';
                zeroNum.textContent = '0';
                totalEl.appendChild(zeroNum);
            }
            return;
        }

        // --- Helper: group an array by a key, preserving order of first appearance ---
        function groupBy(arr, keyFn) {
            var groups = {};
            var order = [];
            arr.forEach(function(item) {
                var key = keyFn(item);
                if (!groups[key]) {
                    groups[key] = [];
                    order.push(key);
                }
                groups[key].push(item);
            });
            return { groups: groups, order: order };
        }

        // --- Helper: render a zone section ---
        function renderZone(label, icon, zoneClass) {
            var zone = document.createElement('div');
            zone.className = 'fo-zone ' + (zoneClass || '');
            var header = document.createElement('div');
            header.className = 'fo-zone-header';
            header.innerHTML = icon + ' ' + label;
            zone.appendChild(header);
            var content = document.createElement('div');
            content.className = 'fo-zone-items';
            zone.appendChild(content);
            return { zone: zone, content: content };
        }

        // --- Helper: render a stacked item card ---
        // Session 15c: Items show as silhouettes with no point tag at rest.
        // Point tag appears on hover after zoom completes. Projects/SRs keep borders.
        function renderCard(item, count, tagClass, isItem) {
            var wrap = document.createElement('div');
            wrap.className = 'finished-item-wrap' + (count > 1 ? ' fo-stacked' : '') +
                (isItem ? ' fo-item-token' : '');

            // Stack visual: offset shadow cards behind
            if (count > 1) {
                var stackBg = document.createElement('div');
                stackBg.className = 'fo-stack-bg';
                wrap.appendChild(stackBg);
            }

            var img = document.createElement('img');
            img.className = 'finished-item';
            img.src = item.img;
            img.alt = item.name;
            var basePts = item.points;
            var totalPts = basePts * count;
            img.title = item.name + ' (' + basePts + ' pts' + (item.isFavorite ? ' +5 Favorite!' : '') + ')' +
                (count > 1 ? ' ×' + count + ' = ' + totalPts : '');
            wrap.appendChild(img);

            // Session 15c/17: Items get hover-only point tags via data-pts.
            // Projects/SRs: no point tag — values already printed on card art.
            if (isItem) {
                wrap.setAttribute('data-pts', totalPts);
            }

            // Count badge for duplicates
            if (count > 1) {
                var badge = document.createElement('div');
                badge.className = 'fo-count-badge';
                badge.textContent = '×' + count;
                wrap.appendChild(badge);
            }

            return { wrap: wrap, points: totalPts };
        }

        // Session 15c: Zone order is Items → SRs → Projects
        // Items are what you need to make projects, SRs are a point of pride,
        // projects are a nice reminder of what you accomplished.

        // ========== ZONE 1: ITEMS ==========
        // Canonical display order: hat, mittens, bear, scarf, blanket
        var ITEM_ORDER = ['hat', 'mittens', 'bear', 'scarf', 'blanket'];
        if (items.length > 0) {
            var itemZone = renderZone('Items', '🧶', 'fo-zone-itemzone');
            var itemGrouped = groupBy(items, function(i) { return i.id; });
            ITEM_ORDER.forEach(function(key) {
                if (!itemGrouped.groups[key]) return;
                var group = itemGrouped.groups[key];
                var card = renderCard(group[0], group.length, '', true);
                itemZone.content.appendChild(card.wrap);
                totalPoints += card.points;
            });
            grid.appendChild(itemZone.zone);
        }

        // ========== ZONE 2: SPECIAL REQUESTS ==========
        if (craftedSRs.length > 0) {
            var srZone = renderZone('Special Requests', '📋', 'fo-zone-srs');
            var srGrouped = groupBy(craftedSRs, function(s) { return s.id || s.name; });
            srGrouped.order.forEach(function(key) {
                var group = srGrouped.groups[key];
                var card = renderCard(group[0], group.length, '', false);
                srZone.content.appendChild(card.wrap);
                totalPoints += card.points;
            });
            grid.appendChild(srZone.zone);
        }

        // ========== ZONE 3: PROJECTS ==========
        if (completedProjects.length > 0) {
            var projZone = renderZone('Projects', '🏆', 'fo-zone-projects');
            var projGrouped = groupBy(completedProjects, function(p) { return p.id || p.name; });
            projGrouped.order.forEach(function(key) {
                var group = projGrouped.groups[key];
                var card = renderCard(group[0], group.length, 'point-tag-project', false);
                projZone.content.appendChild(card.wrap);
                totalPoints += card.points;
            });
            grid.appendChild(projZone.zone);
        }

        // If only projects exist and all items were turned in
        if (items.length === 0 && craftedSRs.length === 0 && completedProjects.length > 0) {
            var note = document.createElement('div');
            note.className = 'finished-empty';
            note.textContent = 'Items were turned in for projects';
            grid.appendChild(note);
        }

        // Session 15c: Update total with point tag badge
        if (totalEl) {
            totalEl.className = 'finished-objects-total has-points';
            totalEl.innerHTML = '';
            var totalNum = document.createElement('span');
            totalNum.className = 'fo-total-num';
            totalNum.textContent = totalPoints;
            totalEl.appendChild(totalNum);
        }

        // Session 15c: Attach hover point tags to item tokens
        grid.querySelectorAll('.fo-item-token[data-pts]').forEach(function(item) {
            var tag = document.createElement('div');
            tag.className = 'fo-hover-tag';
            var num = document.createElement('span');
            num.className = 'fo-hover-tag-num';
            num.textContent = item.getAttribute('data-pts');
            tag.appendChild(num);
            item.appendChild(tag);

            var showTimer;
            item.addEventListener('mouseenter', function() {
                showTimer = setTimeout(function() { tag.classList.add('visible'); }, 200);
            });
            item.addEventListener('mouseleave', function() {
                clearTimeout(showTimer);
                tag.classList.remove('visible');
            });
        });

        // Session 15b: Update drawer count badge
        this._updateDrawerCount();
    },

    /**
     * Session 15b: Toggle the Finished Objects drawer open/closed.
     * @param {boolean} [forceState] — true = open, false = close, undefined = toggle
     */
    toggleFinishedDrawer: function(forceState) {
        var drawer = this.els.foDrawer;
        if (!drawer) return;
        var isOpen = drawer.classList.contains('open');
        var shouldOpen = (forceState !== undefined) ? forceState : !isOpen;
        try{ if(window.Sound) Sound.play(shouldOpen?'drawer-open':'drawer-close'); }catch(e){}
        if (shouldOpen) {
            drawer.classList.add('open');
        } else {
            drawer.classList.remove('open');
        }
    },

    /**
     * Session 15b: Update the count badge on the drawer tab.
     * Also applies character-color styling to the badge and tab border.
     */
    _updateDrawerCount: function() {
        var badge = this.els.foDrawerCount;
        var tab = this.els.foDrawerTab;
        if (!badge) return;
        var items = Game.state.player ? Game.state.player.items : [];
        var srs = Game.state.player ? (Game.state.player.craftedSpecialRequests || []) : [];
        var projs = Game.state.player ? (Game.state.player.projects || []) : [];
        var count = items.length + srs.length + projs.length;
        badge.textContent = count;
        if (count === 0) {
            badge.classList.add('empty');
        } else {
            badge.classList.remove('empty');
        }

        // Apply character color to badge background and tab border
        var charType = Game.state.player ? Game.state.player.characterType : null;
        var accent = charType ? (this._typeAccentColors[charType] || null) : null;
        if (accent) {
            badge.style.background = accent;
            // Darken the accent for the tab border
            var r = parseInt(accent.slice(1,3), 16);
            var g = parseInt(accent.slice(3,5), 16);
            var b = parseInt(accent.slice(5,7), 16);
            var darkR = Math.round(r * 0.5);
            var darkG = Math.round(g * 0.5);
            var darkB = Math.round(b * 0.5);
            var darkColor = 'rgb(' + darkR + ',' + darkG + ',' + darkB + ')';
            if (tab) tab.style.borderLeftColor = darkColor;
        } else {
            badge.style.background = '';
            if (tab) tab.style.borderLeftColor = '';
        }
    },


    /* =========================================================
       SESSION 8: PROJECT BOARD OVERLAY
       Renders 3 face-up project cards as absolute overlays
       directly on the board image's bottom card zones — the
       same approach used for Bazaar cards. The old floating
       #projectStrip (Session 7) has been removed from the HTML.
       ========================================================= */

    renderProjectStrip: function() {
        var overlay   = this.els.projectBoardOverlay;
        var deckBadge = this.els.projectDeckBadge;
        if (!overlay) return;

        var display = Game.state.projectDisplay || [];
        overlay.innerHTML = '';

        // Always render 3 slots; empty slots show as dashed placeholders
        for (var i = 0; i < 3; i++) {
            var project = display[i] || null;
            var slot    = document.createElement('div');

            if (!project) {
                slot.className = 'project-overlay-slot project-slot-empty';
                overlay.appendChild(slot);
                continue;
            }

            var canComplete = Game.canAffordProject(project);
            slot.className = 'project-overlay-slot' +
                             (canComplete ? ' project-completable' : '');
            // Session 40: during restock, clicking a completable project opens the
            // Finish-a-Project picker directly.
            if (Game.state.phase === 'restock' && UI._restockDone && canComplete) {
                slot.classList.add('project-restock-clickable');
                slot.addEventListener('click', function(){ UI.showFinishProjectModal(); });
                slot.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); UI.showFinishProjectModal(); } });
            }
            slot.setAttribute('tabindex', '0');
            slot.setAttribute('aria-label', project.name + ' — ' + project.points + ' points' +
                (canComplete ? ' (completable!)' : ''));

            // Card image fills the slot
            var img = document.createElement('img');
            img.src = project.img;
            img.alt = project.name + ' project card';
            slot.appendChild(img);

            // Small points badge — bottom-right corner
            var pts = document.createElement('div');
            pts.className = 'project-pts-overlay';
            pts.textContent = project.points + ' pts';
            slot.appendChild(pts);

            // Session 19: Hover preview — just the enlarged card image
            (function(proj, parentSlot) {
                var preview = document.createElement('div');
                preview.className = 'project-hover-preview';
                var prevImg = document.createElement('img');
                prevImg.src = proj.img;
                prevImg.alt = proj.name;
                preview.appendChild(prevImg);

                parentSlot.appendChild(preview);

                parentSlot.addEventListener('mouseenter', function() {
                    preview.classList.add('preview-visible');
                });
                parentSlot.addEventListener('mouseleave', function() {
                    preview.classList.remove('preview-visible');
                });
            })(project, slot);

            overlay.appendChild(slot);
        }

        // Session 15c: Single deck count — on the card back only (removed redundant deckBadge text)
        if (deckBadge) deckBadge.textContent = '';
        var projDeckCount = document.getElementById('projectDeckCount');
        if (projDeckCount) {
            var pDeckLeft = Game.state.projectDeck ? Game.state.projectDeck.length : 0;
            projDeckCount.textContent = pDeckLeft > 0 ? pDeckLeft + ' in deck' : 'empty';
        }
    },


    /* =========================================================
       SESSION 7: FINISH PROJECT MODAL
       Shows only completable projects. Player clicks one to finish.
       ========================================================= */

    showFinishProjectModal: function() {
        var completable = Game.getCompletableProjects();
        var body = this.els.finishProjectBody;
        if (!body) return;

        var html = '<div class="restock-modal-msg">Turn in items to complete a project and earn points.</div>';
        html += '<div class="finish-project-list">';

        completable.forEach(function(project) {
            var reqs = project.requirements;
            var reqParts = Object.keys(reqs).map(function(itemId) {
                var count = reqs[itemId];
                var def = CARDS.getItem(itemId);
                return (count > 1 ? count + '× ' : '') + (def ? def.name : itemId);
            });

            html += '<div class="finish-project-row" onclick="UI._onFinishProjectClick(\'' + project.uid + '\')">';
            html += '<img class="finish-project-img" src="' + project.img + '" alt="' + project.name + '">';
            html += '<div class="finish-project-info">';
            html += '<div class="finish-project-name">' + project.name + '</div>';
            html += '<div class="finish-project-req">Needs: ' + reqParts.join(', ') + '</div>';
            html += '<div class="finish-project-pts">' + project.points + ' pts</div>';
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
        body.innerHTML = html;
        this.els.finishProjectModal.style.display = 'flex';
    },

    _onFinishProjectClick: function(projectUid) {
        // Session 17: Capture project data before it's removed from display
        var project = Game.state.projectDisplay.find(function(p) { return p.uid === projectUid; });

        var pts = Game.finishProject(projectUid);
        if (pts === null) return;

        this.els.finishProjectModal.style.display = 'none';

        // Session 17: Show celebration game moment
        var projPlayer = Game.state.player;
        UI.showGameMoment({
            badge: 'Project Complete!',
            badgeClass: 'moment-project',
            img: project ? project.img : '',
            title: project ? project.name : 'Project',
            desc: UI._getProjectDesc(project, projPlayer.name, projPlayer.isAI),
            points: pts
        }, function() {
            // Session 10: Full re-render after finishing project
            UI.renderFinishedObjects();
            UI.renderProjectStrip();
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            UI.renderYarnBowl();
            UI.renderActionBar();
        });
    },

    onCancelFinishProject: function() {
        this.els.finishProjectModal.style.display = 'none';
    },


    /* =========================================================
       SESSION 7: LEARN PATTERN MODAL
       Shows all unlearned tiles. Player clicks one to flip it.
       ========================================================= */

    showLearnPatternModal: function() {
        var learnable = Game.getLearnablePatterns();
        var body = this.els.learnPatternBody;
        if (!body) return;

        var html = '<div class="restock-modal-msg">' +
            'Trade in a finished item to flip its pattern tile to the general side. ' +
            'After flipping, you can craft that item with any valid yarn colors.' +
            '</div>';
        html += '<div class="learn-pattern-list">';

        learnable.forEach(function(tile) {
            var itemDef = CARDS.getItem(tile.itemId);
            var itemName = itemDef ? itemDef.name : tile.itemId;

            // Show exact colors required (front side)
            var exactParts = Object.keys(tile.exact).map(function(color) {
                var count = tile.exact[color];
                return count + ' ' + color.charAt(0).toUpperCase() + color.slice(1);
            });

            html += '<div class="learn-tile-row" onclick="UI._onLearnPatternClick(\'' + tile.id + '\')">';
            html += '<div class="learn-tile-imgs">';
            html += '<img class="learn-tile-img" src="' + tile.img + '" alt="' + itemName + ' pattern (exact)">';
            html += '<span class="learn-tile-arrow">→</span>';
            html += '<img class="learn-tile-img" src="' + tile.backImg + '" alt="' + itemName + ' (general)">';
            html += '</div>';
            html += '<div class="learn-tile-info">';
            html += '<div class="learn-tile-name">' + itemName + '</div>';
            // Trade-in cost — the item consumed from Finished Objects
            html += '<div class="learn-tile-trade-in">🔄 Trade in: 1 finished ' + itemName + '</div>';
            html += '<div class="learn-tile-cost">Was: ' + exactParts.join(', ') + '</div>';
            if (itemDef) {
                html += '<div class="learn-tile-after">After: ' + Game.generalYarnNeeded(itemDef) + '</div>';
            }
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
        body.innerHTML = html;
        this.els.learnPatternModal.style.display = 'flex';
    },

    _onLearnPatternClick: function(tileId) {
        var success = Game.learnPattern(tileId);
        if (!success) return;

        this.els.learnPatternModal.style.display = 'none';
        // Consumed an item from Finished Objects — refresh all affected panels
        UI.renderFinishedObjects();
        UI.renderProjectStrip();   // completable status may have changed
        UI.renderCraftGrid();
        UI.renderActionBar();
    },

    onCancelLearnPattern: function() {
        this.els.learnPatternModal.style.display = 'none';
    },


    /* =========================================================
       SESSION 7: FROG IT MODAL
       Shows all crafted regular items. Player clicks one to frog.
       - Exact pattern: return stored yarnSpent, go to confirm.
       - General/learned pattern: open color picker for yarn choice.
       ========================================================= */

    showFrogItModal: function() {
        var frogable = Game.getFrogItItems();
        var body = this.els.frogItBody;
        if (!body) return;

        var html = '<div class="restock-modal-msg">Return a crafted item and get your yarn back.</div>';
        html += '<div class="frog-list">';

        frogable.forEach(function(entry) {
            var item = entry.item;
            var idx  = entry.index;

            // Build yarn info text
            var yarnInfo = '';
            if (!item.patternLearned && item.yarnSpent) {
                // Exact refund — show what yarn comes back
                var parts = Object.keys(item.yarnSpent).map(function(c) {
                    return item.yarnSpent[c] + ' ' + c.charAt(0).toUpperCase() + c.slice(1);
                });
                yarnInfo = 'Get back: ' + parts.join(', ');
            } else {
                // General refund — player chooses
                yarnInfo = 'Get back: ' + (item.yarnCount || '?') + ' yarn (you choose)';
            }

            html += '<div class="frog-row" onclick="UI._onFrogItemClick(' + idx + ')">';
            html += '<img class="frog-item-img" src="' + item.img + '" alt="' + item.name + '">';
            html += '<div class="frog-item-info">';
            html += '<div class="frog-item-name">' + item.name + ' (' + item.points + ' pts)</div>';
            html += '<div class="frog-item-yarn">' + yarnInfo + '</div>';
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
        body.innerHTML = html;
        this.els.frogItModal.style.display = 'flex';
    },

    _onFrogItemClick: function(itemIndex) {
        this.els.frogItModal.style.display = 'none';

        var items = Game.state.player.items;
        var item  = items[itemIndex];
        if (!item) return;

        if (!item.patternLearned && item.yarnSpent) {
            // Exact refund — go straight to confirm
            this._pendingCraft = {
                context:       'frogIt',
                frogItemIndex: itemIndex,
                itemDef:       { id: item.id, name: item.name, img: item.img, points: item.points },
                yarnToSpend:   Object.assign({}, item.yarnSpent),
            };
            this.showCraftConfirm();
        } else {
            // General/learned — player chooses yarn to get back.
            // Session 36 fix: a refund is "receive N yarn of ANY colors you choose" — it is
            // NOT bound by the item's craft color-rule (e.g. one-color), and must NOT be
            // capped by what's currently in the bowl. Using the item's rule + a spend-style
            // cap could leave the picker with no selectable colors (Done stuck greyed out).
            var pickerItemDef = {
                id: item.id, name: item.name, img: item.img, points: item.points,
                colorRule: 'any',
                yarnCount: item.yarnCount || 3,
            };
            this._pendingCraft = {
                context:       'frogIt',
                frogItemIndex: itemIndex,
                itemDef:       pickerItemDef,
                yarnToSpend:   null,
            };
            this.showCraftColorPicker(pickerItemDef, 'Choose Yarn to Receive Back');
        }
    },

    onCancelFrogIt: function() {
        this.els.frogItModal.style.display = 'none';
    },


    /* =========================================================
       SESSION 22: OFF-TURN PLAYER CONTEXT
       Builds contextual info panels shown inside modals when
       a player acts during another player's turn.
       Two modes:
         'color-pick' → yarn bowl + patterns + SRs + instruction text
         'craft-circle' → yarn bowl + project progress
       ========================================================= */

    /**
     * Build the off-turn context HTML for a specific player.
     * @param {Object} player — player object from Game.state.players[]
     * @param {string} mode — 'color-pick' or 'craft-circle'
     * @param {string} [instructionText] — e.g. "Choose 1 Yarn" (only for color-pick mode)
     * @param {boolean} [force] — if true, show context even for the active player
     * @returns {string} HTML string to inject into a modal, or '' if skipped
     */
    _buildOffTurnContext: function(player, mode, instructionText, force) {
        if (!player) return '';
        if (!force) {
            // Only show context when this player is NOT the active turn player
            var activeIdx = Game.state.activePlayerIndex;
            var playerIdx = Game.state.players.indexOf(player);
            if (playerIdx === activeIdx) return '';
            // Also skip in single-player games
            if (Game.state.playerCount <= 1) return '';
        }

        var bowl = player.yarnBowl;
        var html = '<div class="otc-wrap">';

        // Player name header
        html += '<div class="otc-player-name">' + player.name + '</div>';

        // Yarn bowl strip
        var total = 0;
        CARDS.COLORS.forEach(function(c) { total += (bowl[c] || 0); });
        html += '<div class="otc-bowl">';
        html += '<div class="otc-bowl-header">';
        html += '<div class="otc-bowl-label">Your Yarn Bowl</div>';
        html += '<div class="otc-bowl-total">' + total + ' total</div>';
        html += '</div>';
        html += '<div class="otc-bowl-chips">';
        CARDS.COLORS.forEach(function(color) {
            var count = bowl[color] || 0;
            html += '<span class="otc-chip' + (count === 0 ? ' zero' : '') + '">';
            html += '<img src="Wood Yarn Tokens PNG/' + color + '.png" alt="' + color + '">';
            html += '<span>' + count + '</span>';
            html += '</span>';
        });
        html += '</div></div>';

        if (mode === 'color-pick') {
            // Your Patterns — show unlearned pattern tiles with have/short dots
            var tiles = player.patternTiles || [];
            var unlearnedTiles = tiles.filter(function(t) { return !t.learned; });

            if (unlearnedTiles.length > 0) {
                html += '<div class="otc-section-label">Your Patterns</div>';
                html += '<div class="otc-pattern-grid">';
                unlearnedTiles.forEach(function(tile) {
                    var itemDef = CARDS.getItem(tile.itemId);
                    if (!itemDef) return;
                    var exact = tile.exact;
                    // Check if all colors are met
                    var allMet = true;
                    var dotHtml = '';
                    CARDS.COLORS.forEach(function(color) {
                        if (!exact[color]) return;
                        var needed = exact[color];
                        var have = bowl[color] || 0;
                        for (var i = 0; i < needed; i++) {
                            var isHave = i < have;
                            dotHtml += '<span class="otc-dot ' + (isHave ? 'have' : 'short') + '" style="background:' + CARDS.COLOR_HEX[color] + '"></span>';
                            if (!isHave) allMet = false;
                        }
                    });
                    html += '<div class="otc-need-card' + (allMet ? ' ready' : '') + '">';
                    html += '<img src="' + itemDef.img + '" alt="' + itemDef.name + '">';
                    html += '<div class="otc-need-card-info">';
                    html += '<span class="otc-need-card-name">' + itemDef.name + '</span>';
                    html += '<div class="otc-need-card-dots">' + dotHtml + '</div>';
                    html += '</div></div>';
                });
                html += '</div>';
            }

            // Special Requests — show held SRs with have/short dots
            var srs = player.specialRequests || [];
            if (srs.length > 0) {
                html += '<div class="otc-section-label">Special Requests</div>';
                html += '<div class="otc-sr-grid">';
                srs.forEach(function(sr) {
                    var yarn = sr.yarn || {};
                    var rule = sr.colorRule || 'specific';
                    var allMet = true;
                    var dotHtml = '';

                    // Build dots for specific yarn costs
                    CARDS.COLORS.forEach(function(color) {
                        if (!yarn[color]) return;
                        var needed = yarn[color];
                        var have = bowl[color] || 0;
                        for (var i = 0; i < needed; i++) {
                            var isHave = i < have;
                            dotHtml += '<span class="otc-dot ' + (isHave ? 'have' : 'short') + '" style="background:' + CARDS.COLOR_HEX[color] + '"></span>';
                            if (!isHave) allMet = false;
                        }
                    });

                    // For non-specific rules, add text for the flexible portion
                    var ruleLabels = {
                        any: sr.yarnCount + ' any',
                        sameColor: sr.yarnCount + ' same',
                        different: sr.yarnCount + ' diff',
                        give: sr.yarnCount + ' give',
                    };
                    if (ruleLabels[rule]) {
                        // Entirely non-specific — show label instead of dots
                        var totalYarn = 0;
                        CARDS.COLORS.forEach(function(c) { totalYarn += (bowl[c] || 0); });
                        allMet = totalYarn >= (sr.yarnCount || 0);
                        dotHtml = '<span style="font-size:10px;color:var(--text-muted)">' + ruleLabels[rule] + '</span>';
                    } else if (rule === 'sameColorPlus' && sr.plusYarn) {
                        // Has specific plusYarn + N same color
                        var sameCount = (sr.yarnCount || 0) - 1;
                        dotHtml += '<span style="font-size:10px;color:var(--text-muted)">+' + sameCount + ' same</span>';
                        allMet = false; // Can't easily check
                    } else if (rule === 'specificPlusAny' && sr.anyCount) {
                        dotHtml += '<span style="font-size:10px;color:var(--text-muted)">+' + sr.anyCount + ' any</span>';
                        allMet = false;
                    } else if (rule === 'specificPlusSame' && sr.sameCount) {
                        dotHtml += '<span style="font-size:10px;color:var(--text-muted)">+' + sr.sameCount + ' same</span>';
                        allMet = false;
                    }

                    html += '<div class="otc-need-card' + (allMet ? ' ready' : '') + '">';
                    html += '<img src="' + (sr.img || '') + '" alt="' + sr.name + '">';
                    html += '<div class="otc-need-card-info">';
                    html += '<span class="otc-need-card-name">' + sr.name + '</span>';
                    html += '<div class="otc-need-card-dots">' + dotHtml + '</div>';
                    html += '</div></div>';
                });
                html += '</div>';
            }

            // Instruction text divider
            if (instructionText) {
                html += '<div class="otc-pick-instruction">' + instructionText + '</div>';
            }

        } else if (mode === 'craft-circle') {
            // Available Projects — show face-up projects with item have/need states
            var projects = Game.state.projectDisplay || [];
            if (projects.length > 0) {
                html += '<div class="otc-section-label">Available Projects</div>';
                html += '<div class="otc-projects">';
                projects.forEach(function(proj) {
                    var reqs = proj.requirements || {};
                    var haveCount = 0;
                    var totalCount = 0;
                    var itemsHtml = '';
                    // Count player's items by type
                    var playerItems = {};
                    (player.items || []).forEach(function(item) {
                        var iid = typeof item === 'string' ? item : item.id;
                        playerItems[iid] = (playerItems[iid] || 0) + 1;
                    });
                    // Build item icons
                    var usedFromPlayer = {};
                    for (var itemId in reqs) {
                        if (!reqs.hasOwnProperty(itemId)) continue;
                        var needed = reqs[itemId];
                        totalCount += needed;
                        var available = playerItems[itemId] || 0;
                        var alreadyUsed = usedFromPlayer[itemId] || 0;
                        for (var i = 0; i < needed; i++) {
                            var itemDef = CARDS.getItem(itemId);
                            var hasIt = (alreadyUsed + i) < available;
                            if (hasIt) haveCount++;
                            itemsHtml += '<span class="otc-proj-item ' + (hasIt ? 'have' : 'need') + '">';
                            itemsHtml += '<img src="' + (itemDef ? itemDef.img : '') + '" alt="' + itemId + '">';
                            itemsHtml += '</span>';
                        }
                        usedFromPlayer[itemId] = alreadyUsed + needed;
                    }
                    html += '<div class="otc-project-row">';
                    html += '<span class="otc-project-name">' + proj.name + '</span>';
                    html += '<div class="otc-project-items">' + itemsHtml + '</div>';
                    html += '<span class="otc-project-count">' + haveCount + '/' + totalCount + '</span>';
                    html += '</div>';
                });
                html += '</div>';
            }
        }

        html += '</div>';
        return html;
    },


    /* =========================================================
       COLOR PICKER MODAL
       ========================================================= */

    _colorPickerCallback: null,

    buildColorPicker: function() {
        var grid = this.els.colorGrid;
        grid.innerHTML = '';

        CARDS.COLORS.forEach(function(color) {
            var btn = document.createElement('button');
            btn.className = 'color-pick-btn';
            btn.style.backgroundColor = CARDS.COLOR_HEX[color];
            btn.setAttribute('data-cb-color', color);
            btn.setAttribute('aria-label', 'Pick ' + color.charAt(0).toUpperCase() + color.slice(1) + ' yarn');
            btn.textContent = color.charAt(0).toUpperCase() + color.slice(1);
            btn.addEventListener('click', function() {
                UI.onColorPick(color);
            });
            grid.appendChild(btn);
        });
    },

    /**
     * @param {function} callback — called with the chosen color
     * @param {string} [title] — modal title text
     * @param {Object} [player] — if provided, context is injected
     * @param {boolean} [forceContext] — if true, show context even for active player
     */
    showColorPicker: function(callback, title, player, forceContext) {
        this._colorPickerCallback = callback;
        var titleEl = this.els.colorModal.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title || 'Choose a Yarn Color';
        }
        // Session 24: Use static otc-container from HTML (replaces dynamic creation)
        var contextContainer = document.getElementById('colorPickerContext');
        if (player && contextContainer) {
            var instructionText = title || 'Choose a Yarn Color';
            try {
                contextContainer.innerHTML = this._buildOffTurnContext(player, 'color-pick', instructionText, forceContext);
            } catch (e) {
                contextContainer.innerHTML = '';
            }
            // If context was rendered, hide the main title (player name is in context)
            if (contextContainer.innerHTML !== '') {
                if (titleEl) titleEl.style.display = 'none';
            } else {
                if (titleEl) titleEl.style.display = '';
            }
        } else {
            if (contextContainer) contextContainer.innerHTML = '';
            if (titleEl) titleEl.style.display = '';
        }
        // Session 35: reset multi-pick progress; _collectWildChoices repopulates it.
        var progReset = document.getElementById('colorPickerProgress');
        if (progReset) { progReset.innerHTML = ''; progReset.style.display = 'none'; }
        this.els.colorModal.style.display = 'flex';
    },

    onColorPick: function(color) {
        this.els.colorModal.style.display = 'none';
        if (this._colorPickerCallback) {
            var cb = this._colorPickerCallback;
            this._colorPickerCallback = null;
            cb(color);
        }
    },


    /* =========================================================
       SESSION 12: PLAYER AVATAR STRIP
       Horizontal strip of small player cards below the nav bar.
       Click a non-active player to open the opponent board viewer.
       ========================================================= */

    /**
     * Render the player avatar strip. Called from renderAll() and
     * renderPlayerIndicator() so it stays in sync with turn changes.
     */
    renderPlayerStrip: function() {
        var strip = document.getElementById('playerStrip');
        if (!strip) return;

        var players = Game.state.players;
        if (!players || players.length < 2) {
            strip.style.display = 'none';
            document.querySelector('.game-layout').classList.remove('has-strip');
            return;
        }

        strip.style.display = 'flex';
        document.querySelector('.game-layout').classList.add('has-strip');
        strip.innerHTML = '';

        var activeIdx = Game.state.activePlayerIndex;

        for (var i = 0; i < players.length; i++) {
            (function(idx) {
                var p = players[idx];
                var character = CARDS.getCharacter(p.characterId);
                var typeIcon = UI._typeIcons[p.characterType] || '';
                var isActive = (idx === activeIdx);

                var card = document.createElement('div');
                card.className = 'player-strip-card' + (isActive ? ' active' : '');

                // Apply character type accent color
                var accentColor = UI._typeAccentColors[p.characterType] || 'rgba(255,255,255,0.2)';
                card.style.borderLeftColor = accentColor;
                if (!isActive) {
                    card.style.background = 'rgba(' +
                        parseInt(accentColor.slice(1,3),16) + ',' +
                        parseInt(accentColor.slice(3,5),16) + ',' +
                        parseInt(accentColor.slice(5,7),16) + ',0.12)';
                }

                // Type icon
                if (typeIcon) {
                    var iconImg = document.createElement('img');
                    iconImg.className = 'player-strip-icon';
                    iconImg.src = typeIcon;
                    iconImg.alt = p.characterType;
                    card.appendChild(iconImg);
                }

                // Info column
                var info = document.createElement('div');
                info.className = 'player-strip-info';

                // Name row
                var nameRow = document.createElement('div');
                nameRow.className = 'player-strip-name';
                nameRow.textContent = p.name;
                if (p.isAI) {
                    var badge = document.createElement('span');
                    badge.className = 'player-strip-ai-badge';
                    badge.textContent = 'CPU';
                    nameRow.appendChild(badge);
                }
                info.appendChild(nameRow);

                // Detail row: items count + yarn total
                var detail = document.createElement('div');
                detail.className = 'player-strip-detail';
                var itemCount = (p.items ? p.items.length : 0) +
                                (p.craftedSpecialRequests ? p.craftedSpecialRequests.length : 0) +
                                (p.projects ? p.projects.length : 0);
                var yarnTotal = 0;
                if (p.yarnBowl) {
                    CARDS.COLORS.forEach(function(c) { yarnTotal += (p.yarnBowl[c] || 0); });
                }
                // Session 15b: Add current score estimate
                var scoreData = Game.calculateFinalScore(p);
                var currentPts = scoreData ? scoreData.total : 0;
                detail.textContent = currentPts + ' pts · ' + itemCount + ' items · ' + yarnTotal + ' yarn';
                info.appendChild(detail);

                // Mini yarn dots
                var dots = document.createElement('div');
                dots.className = 'player-strip-yarn-dots';
                CARDS.COLORS.forEach(function(color) {
                    var count = (p.yarnBowl && p.yarnBowl[color]) || 0;
                    if (count > 0) {
                        var dot = document.createElement('div');
                        dot.className = 'player-strip-yarn-dot player-strip-dot';
                        dot.style.backgroundColor = CARDS.COLOR_HEX[color];
                        dot.setAttribute('data-cb-color', color);
                        dot.title = color + ': ' + count;
                        dots.appendChild(dot);
                    }
                });
                info.appendChild(dots);

                card.appendChild(info);

                // Session 21: ARIA & keyboard
                card.setAttribute('tabindex', '0');
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', p.name + (p.isAI ? ' (CPU)' : '') +
                    ' — ' + currentPts + ' points, ' + itemCount + ' items, ' + yarnTotal + ' yarn' +
                    (isActive ? ' (active player)' : ''));

                // Click handler — open peek panel for any player
                card.style.cursor = 'pointer';
                card.addEventListener('click', function() {
                    UI.showOpponentPanel(idx);
                });

                strip.appendChild(card);
            })(i);
        }
    },


    /* =========================================================
       SESSION 12: OPPONENT BOARD VIEWER — Slide-out Panel
       Read-only view of another player's full board state.
       ========================================================= */

    /** Currently open opponent panel player index (-1 = closed) */
    _opponentPanelIdx: -1,

    /**
     * Open the slide-out panel showing the specified player's board state.
     * @param {number} playerIdx — index into Game.state.players[]
     */
    showOpponentPanel: function(playerIdx) {
        var players = Game.state.players;
        if (!players || playerIdx < 0 || playerIdx >= players.length) return;

        this._opponentPanelIdx = playerIdx;
        var p = players[playerIdx];
        var character = CARDS.getCharacter(p.characterId);

        // --- Header (with character type accent color) ---
        var headerEl = document.querySelector('.opponent-panel-header');
        var accentColor = this._typeAccentColors[p.characterType] || 'rgba(255,255,255,0.2)';
        if (headerEl) {
            headerEl.style.borderTopColor = accentColor;
        }

        var titleEl = document.getElementById('opponentPanelTitle');
        var typeIcon = this._typeIcons[p.characterType] || '';
        titleEl.innerHTML = '';
        if (typeIcon) {
            var iconImg = document.createElement('img');
            iconImg.src = typeIcon;
            iconImg.alt = p.characterType;
            titleEl.appendChild(iconImg);
        }
        var nameSpan = document.createElement('span');
        nameSpan.textContent = p.name + (p.isAI ? ' (CPU)' : '');
        titleEl.appendChild(nameSpan);

        // --- Body ---
        var body = document.getElementById('opponentPanelBody');
        body.innerHTML = '';

        // 1. Character info
        var charSection = this._oppSection('Character');
        var charInfo = document.createElement('div');
        charInfo.className = 'opp-last-space';
        charInfo.innerHTML = '<strong>' + character.name + '</strong> — ' +
            (this._typeNames[p.characterType] || p.characterType);
        charSection.content.appendChild(charInfo);
        body.appendChild(charSection.section);

        // 2. Last action space used
        var spaceSection = this._oppSection('Last Action Space');
        var spaceDiv = document.createElement('div');
        spaceDiv.className = 'opp-last-space';
        if (p._previousSpace !== null && p._previousSpace !== undefined) {
            var spaces = character.actionSpaces;
            var spaceLabel = spaces[p._previousSpace] ? spaces[p._previousSpace].label : 'Space ' + (p._previousSpace + 1);
            spaceDiv.innerHTML = '<span class="label">Last used:</span> ' + spaceLabel;
        } else {
            spaceDiv.innerHTML = '<span class="label">No space used yet</span>';
        }
        spaceSection.content.appendChild(spaceDiv);
        body.appendChild(spaceSection.section);

        // 3. Yarn Bowl
        var yarnSection = this._oppSection('Yarn Bowl');
        var yarnGrid = document.createElement('div');
        yarnGrid.className = 'opp-yarn-grid';
        var yarnTotal = 0;
        CARDS.COLORS.forEach(function(color) {
            var count = (p.yarnBowl && p.yarnBowl[color]) || 0;
            yarnTotal += count;
            var chip = document.createElement('div');
            chip.className = 'opp-yarn-chip';
            chip.style.backgroundColor = CARDS.COLOR_HEX[color];
            chip.setAttribute('data-cb-color', color);
            chip.textContent = count;
            chip.title = color.charAt(0).toUpperCase() + color.slice(1) + ': ' + count;
            chip.setAttribute('aria-label', color.charAt(0).toUpperCase() + color.slice(1) + ': ' + count + ' yarn');
            yarnGrid.appendChild(chip);
        });
        yarnSection.content.appendChild(yarnGrid);
        var totalDiv = document.createElement('div');
        totalDiv.className = 'opp-yarn-total';
        totalDiv.textContent = 'Total: ' + yarnTotal + ' yarn';
        yarnSection.content.appendChild(totalDiv);
        body.appendChild(yarnSection.section);

        // 4. Crafted Items
        var itemSection = this._oppSection('Crafted Items');
        if (p.items && p.items.length > 0) {
            var itemRow = document.createElement('div');
            itemRow.className = 'opp-item-row';
            // Sort items by canonical order: hat, mittens, bear, scarf, blanket
            var OPP_ITEM_ORDER = { hat: 0, mittens: 1, bear: 2, scarf: 3, blanket: 4 };
            var sortedItems = p.items.slice().sort(function(a, b) {
                return (OPP_ITEM_ORDER[a.id] || 99) - (OPP_ITEM_ORDER[b.id] || 99);
            });
            sortedItems.forEach(function(item) {
                var card = document.createElement('div');
                card.className = 'opp-item-card';
                var img = document.createElement('img');
                img.src = item.img;
                img.alt = item.name;
                card.appendChild(img);
                var name = document.createElement('div');
                name.className = 'name';
                name.textContent = item.name;
                card.appendChild(name);
                var pts = document.createElement('div');
                pts.className = 'pts';
                pts.textContent = item.points + ' pts';
                card.appendChild(pts);
                itemRow.appendChild(card);
            });
            itemSection.content.appendChild(itemRow);
        } else {
            var empty = document.createElement('div');
            empty.className = 'opp-empty-msg';
            empty.textContent = 'No items crafted yet';
            itemSection.content.appendChild(empty);
        }
        body.appendChild(itemSection.section);

        // 5. Special Requests
        var srSection = this._oppSection('Special Requests');
        var allSRs = (p.specialRequests || []).concat(p.craftedSpecialRequests || []);
        if (allSRs.length > 0) {
            var srRow = document.createElement('div');
            srRow.className = 'opp-item-row';
            allSRs.forEach(function(sr) {
                var card = document.createElement('div');
                card.className = 'opp-item-card';
                var img = document.createElement('img');
                img.src = sr.img;
                img.alt = sr.name;
                card.appendChild(img);
                var name = document.createElement('div');
                name.className = 'name';
                name.textContent = sr.name;
                card.appendChild(name);
                var pts = document.createElement('div');
                pts.className = 'pts';
                var isCrafted = (p.craftedSpecialRequests || []).indexOf(sr) !== -1;
                pts.textContent = sr.points + ' pts' + (isCrafted ? ' ✓' : '');
                card.appendChild(pts);
                srRow.appendChild(card);
            });
            srSection.content.appendChild(srRow);
        } else {
            var empty2 = document.createElement('div');
            empty2.className = 'opp-empty-msg';
            empty2.textContent = 'No special requests';
            srSection.content.appendChild(empty2);
        }
        body.appendChild(srSection.section);

        // 6. Completed Projects
        var projSection = this._oppSection('Projects');
        if (p.projects && p.projects.length > 0) {
            var projRow = document.createElement('div');
            projRow.className = 'opp-item-row';
            p.projects.forEach(function(proj) {
                var card = document.createElement('div');
                card.className = 'opp-item-card';
                var img = document.createElement('img');
                img.src = proj.img;
                img.alt = proj.name;
                card.appendChild(img);
                var name = document.createElement('div');
                name.className = 'name';
                name.textContent = proj.name;
                card.appendChild(name);
                var pts = document.createElement('div');
                pts.className = 'pts';
                pts.textContent = proj.points + ' pts';
                card.appendChild(pts);
                projRow.appendChild(card);
            });
            projSection.content.appendChild(projRow);
        } else {
            var empty3 = document.createElement('div');
            empty3.className = 'opp-empty-msg';
            empty3.textContent = 'No projects completed';
            projSection.content.appendChild(empty3);
        }
        body.appendChild(projSection.section);

        // 7. Pattern Tiles
        var patSection = this._oppSection('Pattern Tiles');
        if (p.patternTiles && p.patternTiles.length > 0) {
            var patRow = document.createElement('div');
            patRow.className = 'opp-pattern-row';
            p.patternTiles.forEach(function(tile) {
                var tileDiv = document.createElement('div');
                tileDiv.className = 'opp-pattern-tile';
                var img = document.createElement('img');
                img.src = tile.learned ? tile.backImg : tile.img;
                img.alt = tile.name;
                tileDiv.appendChild(img);
                var status = document.createElement('div');
                status.className = 'status ' + (tile.learned ? 'learned' : 'unlearned');
                status.textContent = tile.learned ? 'Learned' : 'Not learned';
                tileDiv.appendChild(status);
                patRow.appendChild(tileDiv);
            });
            patSection.content.appendChild(patRow);
        } else {
            var empty4 = document.createElement('div');
            empty4.className = 'opp-empty-msg';
            empty4.textContent = 'No pattern tiles';
            patSection.content.appendChild(empty4);
        }
        body.appendChild(patSection.section);

        // 8. Score estimate
        var scoreSection = this._oppSection('Score Estimate');
        var score = Game.calculateFinalScore(p);
        var scoreSummary = document.createElement('div');
        scoreSummary.className = 'opp-score-summary';
        var scoreNum = document.createElement('div');
        scoreNum.className = 'opp-score-number';
        scoreNum.textContent = score.total;
        scoreSummary.appendChild(scoreNum);
        var scoreInfo = document.createElement('div');
        var scoreLabel = document.createElement('div');
        scoreLabel.className = 'opp-score-label';
        scoreLabel.textContent = 'Estimated Points';
        scoreInfo.appendChild(scoreLabel);
        var scoreBreak = document.createElement('div');
        scoreBreak.className = 'opp-score-breakdown';
        scoreBreak.textContent = 'Items: ' + score.items + ' · SRs: ' + score.specialRequests +
            ' · Projects: ' + score.projects + ' · Tiles: ' + score.learnedTiles;
        scoreInfo.appendChild(scoreBreak);
        scoreSummary.appendChild(scoreInfo);
        scoreSection.content.appendChild(scoreSummary);
        body.appendChild(scoreSection.section);

        // 9. Take Over / Give Back button
        var takeoverSection = document.createElement('div');
        takeoverSection.className = 'opp-takeover-section';
        var takeoverBtn = document.createElement('button');
        takeoverBtn.className = 'opp-takeover-btn';
        if (p.isAI) {
            if (p._pendingHuman) {
                takeoverBtn.textContent = 'Taking over next turn...';
                takeoverBtn.classList.add('active');
            } else {
                takeoverBtn.textContent = 'Take Over ' + p.name;
            }
        } else {
            if (p._pendingAI) {
                takeoverBtn.textContent = 'Giving to Computer next turn...';
                takeoverBtn.classList.add('active');
            } else {
                takeoverBtn.textContent = 'Give ' + p.name + ' to Computer';
            }
        }
        (function(pIdx, player) {
            takeoverBtn.addEventListener('click', function() {
                if (player.isAI) {
                    player._pendingHuman = !player._pendingHuman;
                    player._pendingAI = false;
                } else {
                    player._pendingAI = !player._pendingAI;
                    player._pendingHuman = false;
                }
                // Re-render this panel to update button state
                UI.showOpponentPanel(pIdx);
                // Update the old takeover bar too if viewing the active player
                if (pIdx === Game.state.activePlayerIndex) {
                    UI._updateTakeoverButton();
                }
            });
        })(playerIdx, p);
        takeoverSection.appendChild(takeoverBtn);
        body.appendChild(takeoverSection);

        // --- Show panel + backdrop ---
        var panel = document.getElementById('opponentPanel');
        var backdrop = document.getElementById('opponentPanelBackdrop');
        panel.style.display = 'block';
        backdrop.style.display = 'block';
        // Trigger transition on next frame
        requestAnimationFrame(function() {
            panel.classList.add('open');
            backdrop.classList.add('visible');
        });
    },

    /**
     * Close the opponent board viewer panel.
     */
    hideOpponentPanel: function() {
        this._opponentPanelIdx = -1;
        var panel = document.getElementById('opponentPanel');
        var backdrop = document.getElementById('opponentPanelBackdrop');
        panel.classList.remove('open');
        backdrop.classList.remove('visible');
        // Hide after transition completes
        setTimeout(function() {
            panel.style.display = 'none';
            backdrop.style.display = 'none';
        }, 300);
    },

    /**
     * Helper: create an opponent panel section with a label and content container.
     * @param {string} label — section header text
     * @returns {{ section: HTMLElement, content: HTMLElement }}
     */
    _oppSection: function(label) {
        var section = document.createElement('div');
        section.className = 'opp-section';
        var labelEl = document.createElement('div');
        labelEl.className = 'opp-section-label';
        labelEl.textContent = label;
        section.appendChild(labelEl);
        var content = document.createElement('div');
        section.appendChild(content);
        return { section: section, content: content };
    },


    /* =========================================================
       SESSION 13: TURN HISTORY PANEL
       Slide-out panel from right, accessible from nav menu.
       ========================================================= */

    /**
     * Show the turn history panel.
     */
    showTurnHistory: function() {
        var panel = document.getElementById('historyPanel');
        var backdrop = document.getElementById('historyPanelBackdrop');
        if (!panel) return;
        // Show the nav button once game has started
        this.renderTurnHistory();
        panel.style.display = 'flex';
        backdrop.style.display = 'block';
        backdrop.onclick = function() { UI.hideTurnHistory(); };
        // Close nav menu
        var dd = document.getElementById('navMenuDropdown');
        if (dd) dd.style.display = 'none';
    },

    /**
     * Hide the turn history panel.
     */
    hideTurnHistory: function() {
        var panel = document.getElementById('historyPanel');
        var backdrop = document.getElementById('historyPanelBackdrop');
        if (panel) panel.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
    },

    /**
     * Render turn history entries into the panel body, grouped by round.
     * A "round" = one complete pass around all players.
     * Called via Game.render.turnHistory delegate at end of each turn.
     */
    renderTurnHistory: function() {
        var body = document.getElementById('historyPanelBody');
        var emptyMsg = document.getElementById('historyEmpty');
        var btn = document.getElementById('navHistoryBtn');
        if (!body) return;

        var history = Game.state.turnHistory || [];

        // Show the nav menu button once a game is in progress
        if (btn) btn.style.display = (Game.state.phase && Game.state.phase !== 'setup') ? '' : 'none';

        if (history.length === 0) {
            if (emptyMsg) emptyMsg.style.display = '';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        // Group entries by round (most recent round first)
        var roundMap = {};  // round number → [entries in order]
        var roundOrder = [];
        for (var i = 0; i < history.length; i++) {
            var r = history[i].round || 1;
            if (!roundMap[r]) {
                roundMap[r] = [];
                roundOrder.push(r);
            }
            roundMap[r].push(history[i]);
        }

        // Build HTML — most recent round first, entries within round in order
        var html = '';
        for (var ri = roundOrder.length - 1; ri >= 0; ri--) {
            var roundNum = roundOrder[ri];
            var entries = roundMap[roundNum];

            html += '<div class="history-round-group">';
            html += '<div class="history-round-header">Round ' + roundNum + '</div>';

            for (var ei = 0; ei < entries.length; ei++) {
                var entry = entries[ei];
                var typeColors = this._typeAccentColors;
                var charDef = CARDS.characters[entry.characterId] || {};
                var typeName = this._typeNames[charDef.type] || charDef.type || '';
                var accentColor = typeColors[charDef.type] || '#999';

                html += '<div class="history-entry">';
                html += '<div class="history-entry-header" style="border-left:3px solid ' + accentColor + '">';
                html += '<span class="history-player-name">' + (entry.playerName || 'Unknown') + '</span>';
                html += '<span class="history-player-type">' + typeName + '</span>';
                if (entry.isAI) html += '<span class="history-ai-badge">CPU</span>';
                html += '</div>';

                html += '<div class="history-entry-space">' + (entry.spaceLabel || '') + '</div>';

                if (entry.actions && entry.actions.length > 0) {
                    html += '<ul class="history-action-list">';
                    for (var j = 0; j < entry.actions.length; j++) {
                        html += '<li>' + entry.actions[j] + '</li>';
                    }
                    html += '</ul>';
                }
                html += '</div>';
            }

            html += '</div>'; // close .history-round-group
        }

        body.innerHTML = html;
    },


    /* =========================================================
       SESSION 22: ACTION FEED TICKER
       Rolling horizontal strip of recent game actions for all players.
       Replaces the old AI overlay panel.
       ========================================================= */

    /**
     * Render the action feed ticker with the latest entries from Game.state.actionFeed.
     * Shows last ~8 entries as horizontal chips with player type colors.
     */
    renderActionFeed: function() {
        var feedEl = document.getElementById('actionFeed');
        var entriesEl = document.getElementById('feedEntries');
        if (!feedEl || !entriesEl) return;

        var feed = Game.state.actionFeed || [];
        if (feed.length === 0) {
            feedEl.style.display = 'none';
            return;
        }
        feedEl.style.display = '';

        // Show last 8 entries
        var visible = feed.slice(-8);
        var html = '';

        for (var i = 0; i < visible.length; i++) {
            var entry = visible[i];
            var isLatest = (i === visible.length - 1);

            // Build CSS classes
            var entryClass = 'feed-entry';
            if (isLatest) entryClass += ' feed-latest';

            // Type-specific styling
            if (entry.type === 'event') {
                entryClass += ' feed-event-type';
            } else if (entry.type === 'sr') {
                entryClass += ' feed-sr-type';
            } else if (entry.type === 'project') {
                entryClass += ' feed-project-type';
            } else if (entry.characterType) {
                entryClass += ' feed-type-' + entry.characterType;
            }

            // Player name (or Event/SR label for non-player entries)
            var playerLabel = entry.playerName || '';
            if (entry.type === 'event' && !entry.playerName) playerLabel = 'Event';
            if (entry.type === 'sr' && !entry.playerName) playerLabel = 'SR';

            // Build the chip
            if (i > 0) html += '<span class="feed-sep"></span>';
            html += '<div class="' + entryClass + '">';
            html += '<span class="feed-player">' + playerLabel + '</span>';
            html += '<span class="feed-action">' + entry.text + '</span>';
            html += '</div>';
        }

        entriesEl.innerHTML = html;

        // Auto-scroll to show newest (rightmost) entry
        entriesEl.scrollLeft = entriesEl.scrollWidth;
    },

    /* =========================================================
       SESSION 13: TAKE 5 ANY COLORS MODAL
       Expert unique: player picks 5 yarn colors (repeats OK).
       ========================================================= */

    /** Temporary state for the Take5 picker */
    _take5Picks: [],

    /**
     * Show the Take 5 color picker modal.
     */
    showTake5Modal: function() {
        this._take5Picks = [];
        var modal = document.getElementById('take5Modal');
        if (!modal) return;

        // Build color buttons
        var grid = document.getElementById('take5ColorGrid');
        grid.innerHTML = '';
        var colors = CARDS.COLORS;
        var hexMap = { red: '#d9534f', blue: '#5bc0de', green: '#5cb85c', yellow: '#f0ad4e', orange: '#e8833a', purple: '#9b59b6' };

        colors.forEach(function(c) {
            var btn = document.createElement('button');
            btn.className = 'take5-color-btn';
            btn.style.background = hexMap[c] || '#888';
            btn.textContent = c.charAt(0).toUpperCase() + c.slice(1);
            btn.addEventListener('click', function() { UI.onTake5Pick(c); });
            grid.appendChild(btn);
        });

        this._updateTake5Display();
        modal.style.display = 'flex';
    },

    /**
     * Handle a color pick in the Take5 modal.
     */
    onTake5Pick: function(color) {
        if (this._take5Picks.length >= 5) return;
        this._take5Picks.push(color);
        this._updateTake5Display();
    },

    /**
     * Reset Take5 picks.
     */
    onTake5Reset: function() {
        this._take5Picks = [];
        this._updateTake5Display();
    },

    /**
     * Confirm Take5 picks — apply to game state.
     */
    onTake5Confirm: function() {
        if (this._take5Picks.length !== 5) return;
        var modal = document.getElementById('take5Modal');
        if (modal) modal.style.display = 'none';

        var changed = Game.applyTake5Any(this._take5Picks);
        this._take5Picks = [];
        UI.renderYarnBowl(changed);
        UI.renderCraftGrid();
        UI.renderSpecialRequests();
        UI.renderActionBar();
    },

    /**
     * Update the Take5 modal display (picked tokens + confirm button state).
     */
    _updateTake5Display: function() {
        var picks = this._take5Picks;
        var picksDiv = document.getElementById('take5Picks');
        var confirmBtn = document.getElementById('take5ConfirmBtn');
        var hexMap = { red: '#d9534f', blue: '#5bc0de', green: '#5cb85c', yellow: '#f0ad4e', orange: '#e8833a', purple: '#9b59b6' };

        if (picksDiv) {
            var html = '';
            for (var i = 0; i < 5; i++) {
                if (picks[i]) {
                    html += '<span class="take5-token" style="background:' + (hexMap[picks[i]] || '#888') + '">' +
                        picks[i].charAt(0).toUpperCase() + '</span>';
                } else {
                    html += '<span class="take5-token take5-token-empty">?</span>';
                }
            }
            picksDiv.innerHTML = html;
        }

        if (confirmBtn) {
            confirmBtn.disabled = picks.length < 5;
            confirmBtn.textContent = 'Confirm (' + picks.length + '/5)';
        }
    },
};


/* =========================================================
   BOOT — Initialize game and UI when the page loads
   =========================================================
   The SR take flow needs a bridge: showSRTakeModal captures
   the card reference, and onSRTakeConfirm needs to call
   Game.takeSpecialRequest with it. We store the card on UI.
   ========================================================= */

/* =========================================================
   SESSION 21: ACCESSIBILITY — Colorblind Mode, Keyboard Nav,
   Focus Trapping, Screen Reader Helpers
   ========================================================= */

/**
 * Session 21: Colorblind mode symbols map.
 * Used by rendering functions to add data-cb-color attributes.
 */
UI._CB_SYMBOLS = {
    red: '●', blue: '■', green: '▲',
    yellow: '◆', orange: '★', purple: '✦'
};

/**
 * Session 21: Toggle colorblind mode on/off.
 * Adds .colorblind-mode class to <body> and re-renders all color indicators.
 */
UI.onToggleColorblind = function() {
    var active = document.body.classList.toggle('colorblind-mode');
    var btn = document.getElementById('navColorblindBtn');
    if (btn) btn.setAttribute('aria-pressed', active ? 'true' : 'false');

    // Persist preference
    try { localStorage.setItem('archravels-colorblind', active ? '1' : '0'); } catch(e) {}

    // Re-render all color indicators to add/refresh data attributes
    if (Game.state && Game.state.phase !== 'setup') {
        UI.renderAll();
    }

    // Close the nav menu dropdown
    var dd = document.getElementById('navMenuDropdown');
    if (dd) dd.style.display = 'none';
};

/**
 * Session 21: Restore colorblind mode preference from localStorage.
 */
UI._restoreColorblindPref = function() {
    try {
        if (localStorage.getItem('archravels-colorblind') === '1') {
            document.body.classList.add('colorblind-mode');
            var btn = document.getElementById('navColorblindBtn');
            if (btn) btn.setAttribute('aria-pressed', 'true');
        }
    } catch(e) {}
};

/**
 * Session 21: Add data-cb-color attribute to an element for colorblind CSS symbols.
 * @param {HTMLElement} el — the element to annotate
 * @param {string} color — yarn color name (red, blue, green, yellow, orange, purple)
 */
UI._setCBColor = function(el, color) {
    if (el && color && CARDS.COLOR_HEX[color]) {
        el.setAttribute('data-cb-color', color);
    }
};

/**
 * Session 21: Keyboard navigation handler.
 * Handles arrow keys, Enter/Space, Escape within the game.
 */
UI._handleKeyDown = function(e) {
    var key = e.key;
    var target = e.target;

    // Escape always closes the topmost open modal
    if (key === 'Escape') {
        var closed = UI._closeTopmostModal();
        if (closed) { e.preventDefault(); return; }
    }

    // Arrow keys for navigating within groups of focusable items
    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
        var group = target.closest('[role="group"], .bazaar-slot, .craft-slot, .project-overlay-slot, .action-grid-btn');
        if (group) {
            var parent = target.parentElement;
            // Get all focusable siblings
            var focusables = parent ? Array.from(parent.querySelectorAll('[tabindex="0"], button, a, [role="button"]')) : [];
            if (focusables.length > 1) {
                var idx = focusables.indexOf(target);
                if (idx !== -1) {
                    var next;
                    if (key === 'ArrowRight' || key === 'ArrowDown') {
                        next = focusables[(idx + 1) % focusables.length];
                    } else {
                        next = focusables[(idx - 1 + focusables.length) % focusables.length];
                    }
                    if (next) {
                        next.focus();
                        e.preventDefault();
                    }
                }
            }
        }
    }

    // Enter/Space on focusable non-button elements triggers click
    if ((key === 'Enter' || key === ' ') && target.matches('[tabindex="0"]') && !target.matches('button, a, input, select')) {
        target.click();
        e.preventDefault();
    }
};

/**
 * Session 21: Close the topmost (last opened) visible modal.
 * Returns true if a modal was closed, false if none were open.
 */
UI._closeTopmostModal = function() {
    // Check specific modals in priority order (game moment, then dialogs, then panels)
    var modals = [
        { id: 'gameMomentModal', close: function() { UI._dismissGameMoment(); } },
        { id: 'confirmTakeModal', close: function() { UI.onCancelTake(); } },
        { id: 'craftConfirmModal', close: function() { UI.onCancelCraft(); } },
        { id: 'craftColorModal', close: function() { UI.onCraftColorCancel(); } },
        { id: 'colorPickerModal', close: function() { document.getElementById('colorPickerModal').style.display = 'none'; } },
        { id: 'exchangeModal', close: function() { UI.onExchangeCancel(); } },
        { id: 'eventModal', close: function() { document.getElementById('eventOkBtn').click(); } },
        { id: 'srTakeModal', close: function() { UI.onSRTakeConfirm(); } },
        { id: 'yarnSaleModal', close: function() { UI._yarnSaleChoices = []; UI._buildYarnSaleBody(); } },
        { id: 'donateModal', close: function() { UI.onDonateCancel(); } },
        { id: 'craftCircleModal', close: function() { UI.onCraftCircleSkip(); } },
        { id: 'finishProjectModal', close: function() { UI.onCancelFinishProject(); } },
        { id: 'learnPatternModal', close: function() { UI.onCancelLearnPattern(); } },
        { id: 'frogItModal', close: function() { UI.onCancelFrogIt(); } },
        { id: 'take5Modal', close: function() { UI.onTake5Reset(); } },
    ];

    for (var i = 0; i < modals.length; i++) {
        var el = document.getElementById(modals[i].id);
        if (el && el.style.display !== 'none' && el.style.display !== '') {
            modals[i].close();
            return true;
        }
    }

    // Check slide-out panels
    var histPanel = document.getElementById('historyPanel');
    if (histPanel && histPanel.style.display !== 'none') {
        UI.hideTurnHistory();
        return true;
    }
    var oppPanel = document.getElementById('opponentPanel');
    if (oppPanel && oppPanel.style.display !== 'none') {
        UI.hideOpponentPanel();
        return true;
    }

    // Close nav menu dropdown if open
    var navDD = document.getElementById('navMenuDropdown');
    if (navDD && navDD.style.display !== 'none') {
        navDD.style.display = 'none';
        return true;
    }

    return false;
};

/**
 * Session 21: Focus trap inside open modals.
 * When Tab is pressed inside a modal, cycle focus among focusable elements within it.
 */
UI._handleModalFocusTrap = function(e) {
    if (e.key !== 'Tab') return;

    // Find the active modal overlay
    var overlays = document.querySelectorAll('.modal-overlay[role="dialog"]');
    var activeModal = null;
    for (var i = 0; i < overlays.length; i++) {
        if (overlays[i].style.display !== 'none' && overlays[i].style.display !== '') {
            activeModal = overlays[i];
            break;
        }
    }

    // Also check game moment modal
    var gmm = document.getElementById('gameMomentModal');
    if (gmm && gmm.style.display !== 'none' && gmm.style.display !== '') {
        activeModal = gmm;
    }

    if (!activeModal) return;

    // Get all focusable elements inside the modal
    var focusables = activeModal.querySelectorAll(
        'button:not([disabled]):not([style*="display:none"]):not([style*="display: none"]), ' +
        'a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
        '[tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (e.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
        }
    } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
        }
    }
};

/**
 * Session 21: Focus the first focusable element inside a newly opened modal.
 * @param {string} modalId — the id of the modal overlay element
 */
UI._focusModal = function(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return;
    // Short delay to allow display change to take effect
    setTimeout(function() {
        var focusable = modal.querySelector(
            'button:not([disabled]):not([style*="display:none"]), a[href], input, select, [tabindex="0"]'
        );
        if (focusable) focusable.focus();
    }, 50);
};


// Patch showSRTakeModal to remember the card for onSRTakeConfirm
var _origShowSRTakeModal = UI.showSRTakeModal.bind(UI);
UI._pendingSRCard = null;
UI.showSRTakeModal = function(card, callback) {
    UI._pendingSRCard = card;
    _origShowSRTakeModal(card, callback);
};

var _origOnSRTakeConfirm = UI.onSRTakeConfirm.bind(UI);
UI.onSRTakeConfirm = function() {
    // Apply the take to game state before the callback clears
    if (UI._pendingSRCard) {
        Game.takeSpecialRequest(UI._pendingSRCard);
        UI._pendingSRCard = null;
    }
    _origOnSRTakeConfirm();
};

// Patch onSRGiveTo to apply the give to a specific player
var _origOnSRGiveTo = UI.onSRGiveTo.bind(UI);
UI.onSRGiveTo = function(targetPlayerIndex) {
    if (UI._pendingSRCard) {
        Game.takeSpecialRequest(UI._pendingSRCard, targetPlayerIndex);
        UI._pendingSRCard = null;
    }
    _origOnSRGiveTo(targetPlayerIndex);
};

window.addEventListener('DOMContentLoaded', function() {
    // Session 9: Game.init() is now called from UI.onSetupStart()
    // after the player picks characters on the setup screen.
    UI.init();
});
