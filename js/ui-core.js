/* ui-core.js — UI module (split from the Session-40 LIVE monolith).
   ui-core.js declares `var UI`; the other ui-*.js files extend it via Object.assign. */
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
        Game.render.gnomeRule        = function() { UI.renderGnomeRule(); };

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
        this.renderGnomeRule();
        this._updateTakeoverButton();
    },

    /**
     * Session 42: Render the active Gnome Rule into the bottom-left board slot.
     * Shows during the Hank automa boss match whenever a Gnome Rule is active.
     */
    renderGnomeRule: function() {
        var slot = document.getElementById('gnomeRuleSlot');
        if (!slot) return;
        var rule = Game.state && Game.state.activeGnomeRule;
        if (rule && Game.state.hankAutoma) {
            var img = document.getElementById('gnomeRuleImg');
            if (img && img.src.indexOf(rule.img) === -1) { img.src = rule.img; img.alt = rule.name; }
            if (slot.style.display === 'none') {
                slot.style.display = '';
                // Re-trigger the pop animation on (re)appearance.
                slot.style.animation = 'none'; void slot.offsetWidth; slot.style.animation = '';
            }
        } else {
            slot.style.display = 'none';
        }
    },

    /**
     * Session 42: Modal showing the active Gnome Rule card + its rulebook reminder text.
     */
    showGnomeRuleModal: function() {
        var rule = Game.state && Game.state.activeGnomeRule;
        if (!rule) return;
        try { if (window.Sound) Sound.play('open-modal'); } catch(e) {}
        UI.showGameMoment({
            badge: 'Gnome Rule',
            badgeClass: 'moment-gnome',
            img: rule.img,
            title: rule.name,
            desc: '<div class="gnome-rule-desc">' + (rule.text || '') + '</div>' +
                  '<div class="gnome-rule-note">Ongoing — stays in effect until another Gnome Rule replaces it.</div>',
            noConfetti: true
        });
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

            // Type dropdown — available types depend on human/AI priority.
            // Session 43 (entitlement): on the free tier, HUMAN seats can't take a type
            // whose crafters are all locked (Maker/Expert). CPU seats roam free — the
            // opposition showing off locked crafters is part of the pitch.
            var gateFn = (!isAI && window.Story && Story.crafterLocked)
                ? function(cid){ return Story.crafterLocked(cid); } : function(){ return false; };
            var avail = availableTypesFor(p);
            html += '<select class="setup-type-select" id="setupType' + p + '" onchange="UI.onSetupTypeChange(' + p + ')">';
            avail.forEach(function(tp) {
                var typeLocked = allIds.filter(function(c){ return CARDS.characters[c].type === tp; }).every(gateFn);
                var selected = (tp === type) ? ' selected' : '';
                html += '<option value="' + tp + '"' + selected + (typeLocked ? ' disabled' : '') + '>' +
                        typeNames[tp] + (typeLocked ? ' — 🔒 Full Game' : '') + '</option>';
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
            // Session 43 (entitlement): locked crafters unpickable for human seats.
            var charDefault = currentChars[p] || self._aiRandomPicks[type];
            if (!charDefault || !CARDS.characters[charDefault] || CARDS.characters[charDefault].type !== type || gateFn(charDefault)) {
                var typeCandidates = allIds.filter(function(cid) {
                    return CARDS.characters[cid].type === type && !gateFn(cid);
                });
                if (!typeCandidates.length) typeCandidates = allIds.filter(function(cid) {
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
                var locked = gateFn(cid);
                var selected = (charDefault && cid === charDefault && !locked) ? ' selected' : '';
                html += '<option value="' + cid + '"' + selected + (locked ? ' disabled' : '') + '>' +
                        ch.name + ' — ' + ch.subtitle + (locked ? ' 🔒' : '') + '</option>';
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
                'Pass the device to ' + player.name + '. (Round ' + Game.currentRound() + ')';
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
            phaseText = 'Round ' + Game.currentRound() + ' — ' + phaseText;
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
                if (!dd.contains(e.target) && !(e.target.closest && e.target.closest('#navMenuBtn,#storyMenuBtn'))) {
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
    _roundTxt: function() { return document.body.classList.contains('cap-native') ? String(Game.currentRound()) : ('Round ' + Game.currentRound()); },

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
                '<span class="ab-phase-label">' + UI._roundTxt() + '</span>' +
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
                '</span>';
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
                '<span class="ab-phase-label">' + UI._roundTxt() + '</span>' +
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

    // Session 46: archetype ACTION MARKERS — the physical wooden markers, digital.
    // Dropped onto the chosen action space each turn (tabletop feel). Spec: changelog S45.
    _actionMarkers: {
        thriftyShopper:  'marker-thrifty.png',
        masterCrafter:   'marker-fiber.png',
        colorSpecialist: 'marker-color.png',
        yarnSpinner:     'marker-spin.png',
        maker:           'marker-maker.png',
        expert:          'marker-expert.png'
    },
    _amDroppedTurn: null,   // turn # whose marker drop already animated
    // Session 47b: marker size = fraction of the ACTION AREA (overlay) height —
    // NOT the button, whose height varies (Expert's 3-row layout shrank markers).
    _amSizeFactors: {
        thriftyShopper: .38, masterCrafter: .42, colorSpecialist: .39,
        yarnSpinner: .38, maker: .31, expert: .30
    },
    _amApplySize: function(img, type, overlay) {
        var f = this._amSizeFactors[type];
        var h = overlay && overlay.clientHeight;
        if (f && h > 40) { img.style.height = Math.round(h * f) + 'px'; }
    },
    _cm1Beat: false,        // coach-mark just dismissed → show the beat chip on next drop

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
            // Playtest 6/29: expose the active character's core (type accent)
            // color as --char-rgb so the pulse hints glow in that character's
            // color instead of a fixed hue.
            var _acc = this._typeAccentColors[character.type];
            if (_acc) {
                var _h = _acc.replace('#', '');
                document.documentElement.style.setProperty('--char-rgb',
                    parseInt(_h.substring(0, 2), 16) + ',' +
                    parseInt(_h.substring(2, 4), 16) + ',' +
                    parseInt(_h.substring(4, 6), 16));
            }
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
                    // Session 47: at turn start the marker rests on LAST turn's
                    // space (grayed) — the no-repeat rule made physical. First
                    // tap on a legal space hops it over.
                    if (space.index === Game.state.turn.previousSpace) {
                        var rmFile = character && self._actionMarkers[character.type];
                        if (rmFile && !(Game.state.player && (Game.state.player.isAI || Game.state.player.isHank))) {
                            var rm = document.createElement('img');
                            rm.src = 'story-assets/markers/' + rmFile;
                            rm.alt = ''; rm.draggable = false;
                            rm.className = 'am-marker am-' + character.type + ' am-rest';
                            self._amApplySize(rm, character.type, overlay);
                            btn.appendChild(rm);
                        }
                    }
                } else {
                    // Playtest 6/29: pulse available spaces so it's clear a
                    // selection is needed during the chooseSpace phase.
                    btn.classList.add('action-grid-pulse');
                    (function(idx) {
                        btn.addEventListener('click', function() { UI.onChooseSpace(idx); });
                    })(space.index);
                }
            } else {
                // Active display. Session 47: while the choice is still SOFT
                // (nothing confirmed this turn), other legal spaces stay live
                // as hop targets — the marker IS the change button.
                var roaming = Game.canRoamSpace && Game.canRoamSpace();
                btn.disabled = true;
                if (roaming && space.index !== currentSpace && space.available) {
                    btn.disabled = false;
                    btn.classList.add('action-grid-roam');
                    (function(idx) {
                        btn.addEventListener('click', function() { UI.onSwitchSpace(idx); });
                    })(space.index);
                }
                if (space.index === currentSpace) {
                    btn.classList.add('action-grid-selected');
                    // Session 46: drop the archetype's wooden action marker onto the chosen space
                    var mkFile = character && self._actionMarkers[character.type];
                    if (mkFile) {
                        var mk = document.createElement('img');
                        mk.src = 'story-assets/markers/' + mkFile;
                        mk.alt = ''; mk.draggable = false;
                        mk.className = 'am-marker am-' + character.type;
                        self._amApplySize(mk, character.type, overlay);
                        var tn = Game.state.turn.number;
                        if (self._amDroppedTurn !== tn) {
                            mk.classList.add('am-drop');
                            self._amDroppedTurn = tn;
                            if (self._cm1Beat) { self._cm1Beat = false; if (self._amBeatChip) self._amBeatChip(space.label); }
                        }
                        btn.appendChild(mk);
                    }
                } else {
                    btn.classList.add('action-grid-other');
                }
            }
            overlay.appendChild(btn);
        });

        // Session 46: first-game helpers — How-to-Play offer, then the action coach mark.
        if (mode === 'choose') {
            try {
                if (!localStorage.getItem('ar_htp_seen')) {
                    localStorage.setItem('ar_htp_seen', '1');
                    setTimeout(function(){ if (UI.showHowToPlay) UI.showHowToPlay(true); }, 400);
                } else if (!localStorage.getItem('ar_cm1_seen')) {
                    localStorage.setItem('ar_cm1_seen', '1');
                    setTimeout(function(){ if (UI.showCoachMark1) UI.showCoachMark1(); }, 300);
                }
            } catch (e) {}
        }
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

        var shopReq = Game.shopRequiredCount();
        if (actions.shopLimit > 0) {
            if (actions.canShop) {
                chipsHtml += '<span class="action-chip shop-chip">🛍️ Shop: ' +
                    selCount + '/' + (shopReq || actions.shopLimit) + '</span>';
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
        // Shopping is exact: "Take Yarn" only enables once the full required
        // number of cards is selected (core rule — can't take fewer).
        if (actions.canShop && shopReq > 0) {
            if (selCount === shopReq) {
                buttonsHtml += '<button class="btn btn-primary" onclick="UI.onTakeYarn()">Take Yarn</button>';
            } else {
                var moreNeeded = shopReq - selCount;
                buttonsHtml += '<button class="btn btn-primary" disabled ' +
                    'style="opacity:.5;cursor:not-allowed" ' +
                    'title="You must take all ' + shopReq + ' cards">Take ' + shopReq +
                    ' (pick ' + moreNeeded + ' more)</button>';
            }
        }
        if (actions.canExchange) {
            buttonsHtml += '<button class="btn btn-primary" onclick="UI.showExchangeModal()">Exchange Yarn</button>';
        }
        // Session 47: ↩ Change retired — while the choice is soft, the other
        // legal action spaces are live hop targets (the marker IS the change UI).
        buttonsHtml += '<button class="btn btn-cta" onclick="UI.onEndActions()">End Actions →</button>';

        bar.innerHTML =
            '<div class="ab-phase">' +
                '<span class="ab-phase-icon">⚡</span>' +
                '<span class="ab-phase-label">' + UI._roundTxt() + (document.body.classList.contains('cap-native') ? '' : ' — ' + spaceLabel) + '</span>' +
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

    /* ---- Pause ---- */
    _paused: false,
    _pauseStart: 0,
    pauseGame: function() {
        if (this._paused || !Game.state || !Game.state.gameStartTime) return;
        this._paused = true;
        this._pauseStart = Date.now();
        // Stop the clock while paused.
        if (Game.state._timerInterval) { clearInterval(Game.state._timerInterval); Game.state._timerInterval = null; }
        // Stop the background music while paused.
        try { if (window.Sound && Sound.music && Sound.music.pause) Sound.music.pause(); } catch (e) {}
        var ov = document.createElement('div');
        ov.id = 'pauseOverlay';
        ov.className = 'pause-overlay';
        ov.innerHTML = '<div class="pause-card">' +
            '<div class="pause-title">⏸ Paused</div>' +
            '<div class="pause-sub">The clock is stopped. Take your time.</div>' +
            '<button class="btn btn-cta pause-resume" onclick="UI.resumeGame()">Resume →</button>' +
        '</div>';
        document.body.appendChild(ov);
        requestAnimationFrame(function() { ov.classList.add('open'); });
    },
    resumeGame: function() {
        if (!this._paused) return;
        this._paused = false;
        var pausedMs = Date.now() - (this._pauseStart || Date.now());
        // Shift the timers forward so the paused time isn't counted against anyone.
        if (Game.state.gameStartTime) Game.state.gameStartTime += pausedMs;
        if (Game.state.turnStartTime) Game.state.turnStartTime += pausedMs;
        this._pauseStart = 0;
        // Restart the clock.
        if (!Game.state._timerInterval && Game.state.gameStartTime) {
            Game.state._timerInterval = setInterval(function() { try { Game.render.navTimer(); } catch (e) {} }, 1000);
        }
        // Resume the background music.
        try { if (window.Sound && Sound.music && Sound.music.resume) Sound.music.resume(); } catch (e) {}
        var ov = document.getElementById('pauseOverlay');
        if (ov) { ov.classList.remove('open'); setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 220); }
    },

    _renderRestockBar: function(bar) {
        var emptyCount = 6 - Game.bazaarCardCount();
        var deckLeft = Game.state.deck.length;
        // Cards available to restock = deck + discard (discard reshuffles into
        // the deck via Game.drawCard when the deck empties). SRs never enter
        // the discard, so they're already excluded.
        var cardsAvailable = deckLeft + Game.state.discard.length;

        // Status text in middle
        var statusText = this._restockDone
            ? (emptyCount === 0 ? 'Bazaar full' : 'Restocked')
            : emptyCount + ' empty · ' + deckLeft + ' in deck';

        // Middle content: status text + bonus action buttons (inline)
        var middleHtml = '<span class="ab-status-text">' + statusText + '</span>';

        // Bonus restock actions get their OWN row; status stays on the top line.
        // Finish Project = gold (btn-accent); Learn + Frog = green/white (btn-primary, like Take Yarn).
        var bonusHtml = '';
        if (this._restockDone) {
            var completable = Game.getCompletableProjects();
            var learnable   = Game.getLearnablePatterns();
            var frogable    = Game.getFrogItItems();

            if (completable.length > 0) {
                bonusHtml += '<button class="btn btn-accent" onclick="UI.showFinishProjectModal()">🏆 Finish Project (' + completable.length + ')</button>';
            }
            if (learnable.length > 0) {
                bonusHtml += '<button class="btn btn-primary" onclick="UI.showLearnPatternModal()">📖 Learn Pattern (' + learnable.length + ')</button>';
            }
            if (frogable.length > 0) {
                bonusHtml += '<button class="btn btn-primary" onclick="UI.showFrogItModal()">🐸 Frog It (' + frogable.length + ')</button>';
            }
        }

        // Main forward button (right side)
        var mainButtonHtml;
        if (this._restockDone) {
            mainButtonHtml =
                '<button class="btn btn-cta" onclick="UI.onEndRestockTurn()">End Turn →</button>';
        } else if (emptyCount === 0 || cardsAvailable === 0) {
            // Bazaar full → "Full Bazaar"; otherwise the only way here is zero
            // cards left anywhere (deck + discard both empty), a rare late-game
            // edge where empty slots simply can't be refilled.
            var noRestockLabel = (emptyCount === 0)
                ? 'Full Bazaar! Go to Restock Actions →'
                : 'No Cards Left — Restock Actions →';
            mainButtonHtml =
                '<button class="btn btn-cta" onclick="UI.onSkipRestock()">' + noRestockLabel + '</button>';
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
            (bonusHtml ? '<div class="ab-restock-actions">' + bonusHtml + '</div>' : '') +
            '<div class="ab-buttons">' + mainButtonHtml + '</div>';
    },


    /**
     * Session 8c / 17: Render the action bar for the gameOver phase.
     * Single row: trophy icon, summary text, score + play-again buttons.
     */
    _renderGameOverBar: function(bar) {
        var turnNum = Game.state.turn.number;
        var summaryText = 'Finished after ' + Game.currentRound() + ' rounds';

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
        var sr = document.getElementById('story-root'); if (sr) sr.style.display = 'none';
        document.body.classList.remove('story-open');
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
};

/* Long-press the player-board art → open that player's board drawer (the opponent panel
   we showcase the banner + key art in). Cancels on drag; ignores interactive overlays. */
(function () {
    var timer = null, sx = 0, sy = 0;
    function clear() { if (timer) { clearTimeout(timer); timer = null; } }
    document.addEventListener('pointerdown', function (e) {
        var onBoard = e.target.closest && e.target.closest('.player-board-image, .bowl-wood-bg, .player-board-wrapper');
        if (!onBoard) return;
        if (e.target.closest('.yarn-bowl-overlay, .craft-board-overlay, .fo-drawer, .fo-drawer-tab, button, a, [onclick], [class*="slot"]')) return;
        sx = e.clientX; sy = e.clientY;
        clear();
        timer = setTimeout(function () {
            timer = null;
            try {
                var idx = (Game.state && Game.state.players) ? Game.state.players.indexOf(Game.state.player) : -1;
                if (idx >= 0 && UI.showOpponentPanel) {
                    UI.showOpponentPanel(idx);
                    if (window.Sound) Sound.play('drawer-open');
                }
            } catch (err) {}
        }, 480);
    }, true);
    document.addEventListener('pointermove', function (e) {
        if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) clear();
    }, true);
    document.addEventListener('pointerup', clear, true);
    document.addEventListener('pointercancel', clear, true);
})();
