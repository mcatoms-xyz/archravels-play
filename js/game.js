/**
 * ArchRavels — Game State & Logic
 * =========================================================
 * Manages all mutable game data and core mechanics.
 * This file is DOM-free — all rendering goes through Game.render.*
 * delegates, wired up by ui.js during init (Session 11 refactor).
 *
 * Sessions 3–5 scope:
 *   - Game setup (build deck, shuffle, deal Bazaar, deal Pattern Tiles)
 *   - Turn structure (choose action space → player actions → restock)
 *   - Shop action (multi-select cards, gain yarn, confirmation flow)
 *   - Craft action (spend yarn to match patterns, gain Item tokens)
 *   - Exchange action (swap N yarn for N yarn, house rule)
 *   - Bazaar restock (fill empty slots from deck)
 *   - Per-character action space limits
 *
 * Session 6 additions:
 *   - Special Requests: setup, reveal during restock, take, craft
 *   - Event cards: resolve during restock (5 event types, corrected rules)
 *   - Favorite Request tracking per character
 *   - Multiplayer foundation: state.players array, state.playerCount
 *   - Per-player flags: cantCraftNextTurn, freeCraftBonus (on player object)
 *   - Tangled Cat: active player CHOOSES a target player (auto in SP)
 *   - Friendly Clerk: each player picks 1 yarn color to gain
 *   - Donate: active player gives 1 yarn to another player (supply in SP)
 *   - Craft Circle: each player may immediately craft 1 item
 *
 * Session 7 additions:
 *   - Project Deck: 16 project cards, 3 face-up display
 *   - Finish a Project: Restock action — turn in required items, score points
 *   - Learn a Pattern: Restock action — flip tile to general side (free)
 *   - Frog It: Restock action — return crafted item, get yarn back
 *   - canAffordSpecialRequest: handles all colorRules (any/sameColor/different/give)
 *   - craft() now stores yarnSpent and patternLearned on each item (for Frog It)
 *   - takeSpecialRequest() preserves colorRule and yarnCount
 * =========================================================
 */

var Game = {

    /* ----- Render delegate ----- */
    /* UI layer wires these up during init.
       game.js calls Game.render.*() instead of UI.*() directly,
       keeping the logic layer DOM-free for future Unity port. */
    render: {
        all:              function() {},
        bazaar:           function() {},
        actionBar:        function() {},
        craftGrid:        function() {},
        specialRequests:  function() {},
        projectStrip:     function() {},
        deckCounter:      function() {},
        yarnBowl:         function() {},
        finishedObjects:  function() {},
        showPassDevice:   function() {},
        showFinalCraftPhase: function() {},
        playerStrip:      function() {},
        turnHistory:      function() {},   // Session 13: turn history panel update
        navTimer:         function() {},   // Session 15: nav bar game clock update
        actionFeed:       function() {},   // Session 22: action feed ticker update
        gameOver:         function() {},   // Session 35: fired once when a match ends (Story Mode hook)
    },

    /* ----- Game state ----- */
    state: {
        /* Yarn Bazaar: 6 face-up slots (null = empty) */
        bazaar: [null, null, null, null, null, null],

        /* Draw deck (shuffled array of card objects) */
        deck: [],

        /* Discard pile */
        discard: [],

        /* Current game phase:
             chooseSpace   — player picks an action space on their board
             playerActions — player performs Shop / Craft / Exchange
             restock       — fill empty Bazaar slots from deck
        */
        phase: 'chooseSpace',

        /* Currently selected Bazaar slot indices */
        selectedSlots: new Set(),

        /* --- Turn tracking --- */
        turn: {
            number: 1,
            currentSpace: null,   // index (0-3) of chosen action space this turn
            previousSpace: null,  // last turn's space index (can't repeat)
            shopDone: false,      // whether Shop has been used this turn
            craftUsed: 0,         // items crafted this turn
            exchangeDone: false,  // whether Exchange was used this turn
        },

        /* Active action space limits (set when space is chosen) */
        shopLimit: 0,
        craftLimit: 0,
        hasExchange: false,

        /* Session 8c: Unique ability flags (set per-turn when space is chosen) */
        pendingTake3Yarn: false,   // Ted/Eliza Space 3: gain 3 yarn of one color before actions
        pendingTake3Any: false,    // Session 36: Hank boss Space 2: gain 3 yarn of ANY (mixed) colors
        craftAnyColors: false,     // Neeha/Alex Space 3: next craft ignores color matching

        /* Character id for looking up action spaces */
        characterId: 'rebecca',

        /* Session 7: Project Deck — separate from Yarn Deck */
        projectDeck:    [],  // remaining project cards (face-down)
        projectDisplay: [],  // 3 face-up project cards (may be fewer at end of deck)

        /* Session 9: Multiplayer infrastructure */
        playerCount: 1,
        activePlayerIndex: 0,   // index into players[] for whose turn it is
        players: [],            // populated in init(); state.player === players[activePlayerIndex]
        finalRound: false,      // true once end-game trigger fires
        endGameTriggerPlayer: -1, // which player triggered end-game
        finalCraftQueue: null,    // array of player indices for final craft phase
        finalCraftIndex: 0,       // current position in finalCraftQueue

        /* Active player reference — always points to players[activePlayerIndex].
           All existing code reads state.player; this alias keeps changes minimal. */
        player: null,

        /* Session 15: Game timer */
        gameStartTime: null,         // Date.now() when game starts
        turnStartTime: null,         // Date.now() when current turn begins
        _timerInterval: null,        // setInterval id for nav clock
    },


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    /**
     * Set up a new game: build deck, shuffle, deal Bazaar, create players.
     * Session 9: accepts optional config for multiplayer.
     * @param {Object} [config] — { players: [{characterId, name}] }
     *   If omitted, defaults to single-player Rebecca.
     */
    init: function(config) {
        this._gen = (this._gen || 0) + 1;
        config = config || { players: [{ characterId: 'rebecca', name: 'Rebecca' }] };
        var playerConfigs = config.players;
        var numPlayers = playerConfigs.length;
        // Session 41 (Story SR Board): optional enabled-SR filter. Story Mode passes the
        // player's enabled set; Quick Play / pass-and-play leave it null (full SR pool).
        var srEnabledIds = config.srEnabledIds || null;

        // --- Build player objects ---
        var players = [];
        var characterIds = [];
        playerConfigs.forEach(function(pc) {
            var character = CARDS.getCharacter(pc.characterId);
            characterIds.push(pc.characterId);
            // Session 36: Hank boss head start — +3 extra yarn (one color) on top of the standard 1-of-each.
            var startBowl = { red: 1, blue: 1, green: 1, yellow: 1, orange: 1, purple: 1 };
            if (character && character.isHank) { startBowl.red += 3; }
            players.push({
                name:                  pc.name || character.name,
                characterId:           pc.characterId,
                characterType:         character.type,
                isAI:                  !!pc.isAI,  // Session 9b: AI opponent flag
                isHank:                !!(character && character.isHank),  // Session 36: boss rule-hook flag
                yarnBowl:              startBowl,
                patternTiles:          CARDS.dealPatternTiles(),
                items:                 [],
                specialRequests:       [],
                craftedSpecialRequests:[],
                projects:              [],
                cantCraftNextTurn:     false,
                freeCraftBonus:        false,
                _previousSpace:        null,  // per-player: their last action space
                // Session 15: Per-player timer tracking
                totalTurnTime:         0,     // cumulative ms spent on turns
                turnCount:             0,     // number of completed turns
            });
        });

        this.state.players = players;
        this.state.playerCount = numPlayers;
        this.state.activePlayerIndex = 0;
        this.state.player = players[0];
        this.state.characterId = playerConfigs[0].characterId;
        this.state.finalRound = false;
        this.state.endGameTriggerPlayer = -1;
        this.state.finalCraftQueue = null;
        this.state.finalCraftIndex = 0;

        // --- Build Yarn Deck (Yarn + Events) ---
        var deck = CARDS.buildDeck();
        this.shuffle(deck);

        // --- Special Requests setup ---
        var srCards;
        if (numPlayers === 1) {
            srCards = CARDS.buildSpecialRequestsForSetup(characterIds[0], 1, srEnabledIds);
        } else {
            srCards = CARDS.buildSpecialRequestsForMultiplayer(characterIds, srEnabledIds);
        }

        // Session 40: Seed Special Requests toward the FRONT of the deck so they
        // actually come up in a match. Non-favorites go into the front third;
        // each player's own favorite goes into the front quarter (earlier) so
        // players reliably encounter their favorite SR.
        var favSRs   = srCards.filter(function(c){ return c.isFavorite; });
        var otherSRs = srCards.filter(function(c){ return !c.isFavorite; });
        // 1) Non-favorite SRs into the front third
        var thirdCut = Math.max(otherSRs.length, Math.floor(deck.length / 3));
        var front = deck.slice(0, thirdCut).concat(otherSRs);
        this.shuffle(front);
        deck = front.concat(deck.slice(thirdCut));
        // 2) Favorites into the front quarter (earlier than the rest)
        var quarterCut = Math.max(favSRs.length, Math.floor(deck.length / 4));
        var head = deck.slice(0, quarterCut).concat(favSRs);
        this.shuffle(head);
        deck = head.concat(deck.slice(quarterCut));

        this.state.deck = deck;
        this.state.discard = [];
        this.state.bazaar = [null, null, null, null, null, null];
        this.state.selectedSlots = new Set();
        this.state.phase = 'chooseSpace';

        // Reset turn tracking
        this.state.turn = {
            number: 1,
            currentSpace: null,
            previousSpace: null,  // loaded from active player's _previousSpace each turn
            shopDone: false,
            craftUsed: 0,
            exchangeDone: false,
        };

        this.state.shopLimit = 0;
        this.state.craftLimit = 0;
        this.state.hasExchange = false;
        this.state.pendingTake3Yarn = false;
        this.state.pendingTake3Any = false;
        this.state.craftAnyColors = false;

        // Session 13: Maker & Expert unique ability flags
        this.state.makeTwoItems = false;
        this.state.pendingTake5Any = false;

        // Session 13: Turn history log
        this.state.turnHistory = [];
        this.state._currentTurnLog = [];

        // Session 22: Action feed — rolling list of recent game actions for all players
        this.state.actionFeed = [];

        // Session 7: Initialize the project deck (3 face-up, rest face-down)
        this.initProjects();

        // Deal initial Bazaar: 6 Yarn cards (skip Events AND SRs during setup, per rules p.5)
        this.dealInitialBazaar();

        // Session 15: Start game timer
        this.state.gameStartTime = Date.now();
        this.state.turnStartTime = Date.now();
        // Clear any previous timer interval
        if (this.state._timerInterval) clearInterval(this.state._timerInterval);
        var self = this;
        this.state._timerInterval = setInterval(function() {
            self.render.navTimer();
        }, 1000);
    },

    /**
     * Fisher-Yates shuffle (in-place).
     */
    shuffle: function(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    },

    /**
     * Deal the initial 6 Bazaar cards.
     * Per the rules (p.5): skip Events AND Special Requests during initial deal.
     */
    dealInitialBazaar: function() {
        var setAside = [];

        for (var slot = 0; slot < 6; slot++) {
            var card = this.drawYarnCard(setAside);
            this.state.bazaar[slot] = card;
        }

        // Shuffle set-aside Events/SRs back into the deck
        if (setAside.length > 0) {
            this.state.deck = this.state.deck.concat(setAside);
            this.shuffle(this.state.deck);
        }
    },

    /**
     * Draw a card from the deck that is a Yarn card only.
     * Events and SRs are set aside into the provided array.
     * Used for initial Bazaar deal (setup) only.
     */
    drawYarnCard: function(setAsideArr) {
        while (this.state.deck.length > 0) {
            var card = this.state.deck.shift();
            if (card.type === 'yarn') {
                return card;
            } else {
                setAsideArr.push(card);
            }
        }
        return null;
    },

    /**
     * Draw any card from the top of the deck (yarn, event, or SR).
     * Used during Restock (Session 6+).
     */
    drawCard: function() {
        // If deck is empty, shuffle discard pile back in
        if (this.state.deck.length === 0 && this.state.discard.length > 0) {
            this.state.deck = this.state.discard.splice(0);
            this.shuffle(this.state.deck);
        }
        if (this.state.deck.length === 0) return null;
        return this.state.deck.shift();
    },


    /* =========================================================
       TURN STRUCTURE
       ========================================================= */

    /**
     * Get the character definition for the current player.
     */
    getCharacter: function() {
        return CARDS.getCharacter(this.state.characterId);
    },

    /**
     * Get the 4 action spaces for the current character,
     * each annotated with whether it's available this turn.
     */
    getActionSpaces: function() {
        var character = this.getCharacter();
        if (!character) return [];

        var prevSpace = this.state.turn.previousSpace;
        var isFirstTurn = prevSpace === null;  // Session 9: works per-player (null = first turn for this player)

        return character.actionSpaces.map(function(space, idx) {
            return {
                index: idx,
                label: space.label,
                shop: space.shop || 0,
                craft: space.craft || 0,
                exchange: !!space.exchange,
                unique: space.unique || null,
                available: isFirstTurn || idx !== prevSpace,
            };
        });
    },

    /**
     * Choose an action space for this turn.
     * Sets up the limits and transitions to playerActions phase.
     * @param {number} spaceIndex — 0-3 index of the action space to choose
     * @returns {boolean} true if space was successfully chosen, false if rejected
     */
    chooseActionSpace: function(spaceIndex) {
        // Guard: must be in chooseSpace phase
        if (this.state.phase !== 'chooseSpace') {
            console.error('chooseActionSpace: wrong phase "' + this.state.phase + '", expected "chooseSpace"');
            return false;
        }

        var character = this.getCharacter();
        if (!character) {
            console.error('chooseActionSpace: no character found for id "' + this.state.characterId + '"');
            return false;
        }

        // Guard: valid space index
        if (typeof spaceIndex !== 'number' || spaceIndex < 0 || spaceIndex >= character.actionSpaces.length) {
            console.error('chooseActionSpace: invalid spaceIndex ' + spaceIndex);
            return false;
        }

        var space = character.actionSpaces[spaceIndex];
        if (!space) return false;

        // Can't pick the same space as last turn (unless it's this player's first turn)
        if (this.state.turn.previousSpace !== null && spaceIndex === this.state.turn.previousSpace) {
            console.error('chooseActionSpace: cannot repeat previous space ' + spaceIndex);
            return false;
        }

        // Set current space
        this.state.turn.currentSpace = spaceIndex;
        this.state.turn.shopDone = false;
        this.state.turn.craftUsed = 0;
        this.state.turn.exchangeDone = false;

        // Set limits from space
        this.state.shopLimit = space.shop || 0;
        this.state.craftLimit = space.craft || 0;
        this.state.hasExchange = !!space.exchange;

        // Session 6: Apply Tangled Cat penalty (can't craft this turn)
        // Session 21: Flag stays true for the entire turn so the UI banner
        // persists. It is cleared in endTurn() after the restock phase.
        if (this.state.player.cantCraftNextTurn) {
            this.state.craftLimit = 0;
        }

        // Session 6: Apply Craft Circle bonus (extra craft this turn)
        if (this.state.player.freeCraftBonus) {
            this.state.craftLimit += 1;
            this.state.player.freeCraftBonus = false;
        }

        // Session 8c: Unique ability flags
        this.state.pendingTake3Yarn = !!(space.unique === 'take3Yarn');
        this.state.craftAnyColors   = !!(space.unique === 'craftAnyColors');

        // Session 13: Maker unique — craft 1 item but receive 2 copies
        this.state.makeTwoItems = !!(space.unique === 'makeTwoItems');

        // Session 13: Expert unique — take 5 yarn of any colors + craft 1 with any colors
        if (space.unique === 'take5AnyCraft1Any') {
            this.state.pendingTake5Any = true;
            this.state.craftAnyColors = true;
        } else {
            this.state.pendingTake5Any = false;
        }

        // Session 36: Hank boss Space 2 — gain 3 yarn of ANY (mixed) colors
        this.state.pendingTake3Any = !!(space.unique === 'take3Any');

        // Session 36: Hank crafts ignoring color-matching on EVERY craft action
        // (the master "tops the crafting circle" — any yarn feeds any pattern).
        if (this.state.player.isHank) {
            this.state.craftAnyColors = true;
        }

        // Transition to player actions
        this.state.phase = 'playerActions';
        this.state.selectedSlots = new Set();

        // Session 22: Log space choice to action feed
        this._logAction('Chose ' + space.label);

        // Update UI via render delegate
        this.render.bazaar();
        this.render.actionBar();
        this.render.craftGrid();
        this.render.specialRequests();
        this.render.projectStrip();
        return true;
    },

    /**
     * Session 9b: Undo the action space choice and return to chooseSpace phase.
     * Only valid if no actions have been taken yet.
     */
    undoSpaceChoice: function() {
        if (this.state.phase !== 'playerActions') return;
        if (this.state.turn.shopDone || this.state.turn.craftUsed > 0 || this.state.turn.exchangeDone) return;

        this.state.phase = 'chooseSpace';
        this.state.turn.currentSpace = null;
        this.state.selectedSlots = new Set();

        this.render.bazaar();
        this.render.actionBar();
        this.render.craftGrid();
        this.render.specialRequests();
    },

    /**
     * Check what actions are still available this turn.
     */
    getAvailableActions: function() {
        return {
            canShop: this.state.shopLimit > 0 && !this.state.turn.shopDone,
            canCraft: this.state.craftLimit > 0 && this.state.turn.craftUsed < this.state.craftLimit,
            canExchange: this.state.hasExchange && !this.state.turn.exchangeDone,
            shopLimit: this.state.shopLimit,
            craftLimit: this.state.craftLimit,
            craftUsed: this.state.turn.craftUsed,
        };
    },

    /**
     * The current ROUND number. A round = one turn per player, so this also
     * equals how many turns the current player has taken. Display-facing:
     * internal turn.number still counts every individual player turn (used by
     * history, stats, achievements). Solo play: round === turn number.
     */
    currentRound: function() {
        var pc = this.state.playerCount || 1;
        return Math.ceil((this.state.turn.number || 1) / pc);
    },

    /**
     * How many bazaar cards the player MUST take to complete a Shop action.
     * Core rule: shopping is exact — you take the full number listed on the
     * space (unlike crafting, which is "up to"). If fewer slots are selectable
     * than the listed number, you take as many as are available.
     *   - Solo: only face-up cards are selectable → min(shopLimit, cards in bazaar)
     *   - Multiplayer: empty slots are selectable too (count as wild) → all 6 slots
     * Returns 0 when there's no shop on this space or nothing to take.
     */
    shopRequiredCount: function() {
        if (!this.state.shopLimit || this.state.shopLimit <= 0) return 0;
        var selectable = (this.state.playerCount <= 1)
            ? this.bazaarCardCount()
            : this.state.bazaar.length;
        return Math.min(this.state.shopLimit, selectable);
    },

    /**
     * End the player actions phase and move to restock.
     */
    endPlayerActions: function() {
        this.state.phase = 'restock';

        // Update UI via render delegate
        this.render.bazaar();
        this.render.actionBar();
    },

    /**
     * End a player's final craft action and advance to the next player
     * in the final craft queue, or to game over if all done.
     */
    endFinalCraft: function() {
        this.state.finalCraftIndex++;
        // Re-enter endTurn to process next in queue (or trigger game over)
        this.endTurn();
    },

    /**
     * End the current turn: restock done, advance to next player/turn.
     * Session 9: handles multiplayer turn cycling and end-game trigger.
     */
    endTurn: function() {
        // Session 15: Accumulate turn time for the finishing player
        if (this.state.turnStartTime && this.state.player) {
            var turnElapsed = Date.now() - this.state.turnStartTime;
            this.state.player.totalTurnTime += turnElapsed;
            this.state.player.turnCount += 1;
        }

        // Session 13: Build turn history summary before resetting state
        var character = CARDS.getCharacter(this.state.player.characterId);
        var spaceLabel = '';
        if (character && this.state.turn.currentSpace !== null) {
            var sp = character.actionSpaces[this.state.turn.currentSpace];
            if (sp) spaceLabel = sp.label;
        }
        if (this.state._currentTurnLog && this.state.phase !== 'finalCraft') {
            var round = Math.ceil(this.state.turn.number / this.state.playerCount);
            this.state.turnHistory.push({
                turn:          this.state.turn.number,
                round:         round,
                playerName:    this.state.player.name,
                characterType: this.state.player.characterType,
                characterId:   this.state.player.characterId,
                isAI:          this.state.player.isAI,
                spaceLabel:    spaceLabel,
                actions:       this.state._currentTurnLog.slice(),
            });
            this.state._currentTurnLog = [];
            this.render.turnHistory();
        }

        // Save current space as this player's previous space
        this.state.player._previousSpace = this.state.turn.currentSpace;
        this.state.turn.currentSpace = null;
        this.state.turn.shopDone = false;
        this.state.turn.craftUsed = 0;
        this.state.turn.exchangeDone = false;

        // Reset limits
        this.state.shopLimit = 0;
        this.state.craftLimit = 0;
        this.state.hasExchange = false;
        this.state.pendingTake3Yarn = false;
        this.state.pendingTake3Any = false;    // Session 36
        this.state.craftAnyColors = false;
        this.state.makeTwoItems = false;      // Session 13
        this.state.pendingTake5Any = false;    // Session 13

        // Session 21: Clear Tangled Cat flag after restock (was applied in startTurn,
        // kept alive so the banner persists for the whole turn)
        if (this.state.player.cantCraftNextTurn) {
            this.state.player.cantCraftNextTurn = false;
        }

        // Check end-game trigger (also checked in finishProject)
        if (!this.state.finalRound && this.isGameOver()) {
            this.state.finalRound = true;
            this.state.endGameTriggerPlayer = this.state.activePlayerIndex;
        }

        // If final round was triggered, enter the "final craft" phase.
        // Current player's turn is done. Each OTHER player gets 1 craft action.
        if (this.state.finalRound) {
            // Build list of other players who haven't had their final craft yet
            if (!this.state.finalCraftQueue) {
                this.state.finalCraftQueue = [];
                for (var p = 0; p < this.state.playerCount; p++) {
                    if (p !== this.state.endGameTriggerPlayer) {
                        this.state.finalCraftQueue.push(p);
                    }
                }
                this.state.finalCraftIndex = 0;
            }

            // Advance through final craft queue
            if (this.state.finalCraftIndex < this.state.finalCraftQueue.length) {
                var fcIdx = this.state.finalCraftQueue[this.state.finalCraftIndex];
                this.state.activePlayerIndex = fcIdx;
                this.state.player = this.state.players[fcIdx];
                this.state.characterId = this.state.player.characterId;
                this.state.phase = 'finalCraft';
                this.state.craftLimit = 1;
                this.state.turn.craftUsed = 0;
                this.state.selectedSlots = new Set();

                // Apply pending takeover flags
                if (this.state.player._pendingHuman) {
                    this.state.player.isAI = false;
                    this.state.player._pendingHuman = false;
                }
                if (this.state.player._pendingAI) {
                    this.state.player.isAI = true;
                    this.state.player._pendingAI = false;
                }

                if (this.state.player.isAI) {
                    this.render.all();
                    this.render.showFinalCraftPhase();
                    AI.doFinalCraft(function() {
                        Game.endFinalCraft();
                    });
                } else if (this.state.playerCount > 1) {
                    // Session 10: Skip pass-device when only 1 human among AI players
                    var humanCount = this.state.players.filter(function(p) { return !p.isAI; }).length;
                    if (humanCount > 1) {
                        this.render.showPassDevice();
                    } else {
                        this.render.all();
                        this.render.showFinalCraftPhase();
                    }
                } else {
                    this.render.all();
                    this.render.showFinalCraftPhase();
                }
                return;
            }

            // All final crafts done → game over
            this.state.phase = 'gameOver';
            this.state.selectedSlots = new Set();
            this.stopTimer();  // Session 15: stop the game clock
            this.state.finalCraftQueue = null;
            this.state.finalCraftIndex = 0;
            this.render.bazaar();
            this.render.actionBar();
            this.render.craftGrid();
            this.render.specialRequests();
            this.render.projectStrip();
            try{ if(window.Sound){ var _ps=this.state.players,_top=_ps[0],_i; for(_i=1;_i<_ps.length;_i++){ if(Game.calculateFinalScore(_ps[_i])>Game.calculateFinalScore(_top)) _top=_ps[_i]; } if(!(window.Story&&Story.storyGame)) Sound.play(_top && !_top.isAI ? 'game-win' : 'game-lose'); } }catch(e){}
            this.render.gameOver();   // Session 35: notify Story Mode the match ended
            return;
        }

        // Advance to next player
        var nextIdx = (this.state.activePlayerIndex + 1) % this.state.playerCount;

        // --- Switch active player ---
        this.state.activePlayerIndex = nextIdx;
        this.state.player = this.state.players[nextIdx];
        this.state.characterId = this.state.player.characterId;

        // Session 9b: Apply pending takeover/give-back flags
        if (this.state.player._pendingHuman) {
            this.state.player.isAI = false;
            this.state.player._pendingHuman = false;
        }
        if (this.state.player._pendingAI) {
            this.state.player.isAI = true;
            this.state.player._pendingAI = false;
        }

        // Load this player's previous space for the "can't repeat" rule
        this.state.turn.previousSpace = this.state.player._previousSpace;
        this.state.turn.number++;

        // Session 36: Hank boss — auto-gain +3 yarn of one color at the start of every turn,
        // before he evaluates his action (so the new yarn informs his craft choice).
        if (this.state.player.isHank) {
            this.applyHankAutoYarn(this.state.player);
        }

        // Back to choosing a space
        this.state.phase = 'chooseSpace';
        this.state.selectedSlots = new Set();

        // Session 15: Record turn start time for the new player
        this.state.turnStartTime = Date.now();
        try{ if(window.Sound && this.state.player && !this.state.player.isAI) Sound.play('turn-start'); }catch(e){}
        try{ if(window.Sound && this.state.player && this.state.player.cantCraftNextTurn) Sound.play('ev-tangled-cat'); }catch(e){}

        // Session 9b: If next player is AI, run AI turn automatically
        if (this.state.player.isAI) {
            this.render.all();
            AI.takeTurn(function() {
                // AI turn complete — endTurn will be called by AI when done
            });
        } else if (this.state.playerCount > 1) {
            // Session 10: Skip pass-device when only 1 human among AI players.
            // Pass-device is only needed in hot-seat with multiple humans.
            var humanCount2 = this.state.players.filter(function(p) { return !p.isAI; }).length;
            if (humanCount2 > 1) {
                this.render.showPassDevice();
            } else {
                // Only 1 human — no need to hide the board
                this.render.all();
            }
        } else {
            // Single player — render immediately
            this.render.all();
        }
    },


    /* =========================================================
       BAZAAR SELECTION
       ========================================================= */

    /**
     * Toggle selection of a Bazaar slot.
     * Enforces the shop limit (max cards selectable).
     * Session 9: Empty slots ARE selectable in multiplayer (count as 1 any-color yarn).
     */
    toggleSlotSelection: function(index) {
        if (this.state.phase !== 'playerActions') return;
        if (this.state.turn.shopDone) return;
        if (this.state.shopLimit === 0) return;

        // Session 9: Empty slots are selectable only in multiplayer (empty bazaar rule)
        if (this.state.bazaar[index] === null && this.state.playerCount <= 1) return;

        var sel = this.state.selectedSlots;

        if (sel.has(index)) {
            sel.delete(index);
        } else {
            if (sel.size < this.state.shopLimit) {
                sel.add(index);
            }
        }
    },

    /**
     * Clear all Bazaar selections.
     */
    clearSelection: function() {
        this.state.selectedSlots = new Set();
    },


    /* =========================================================
       SHOP ACTION
       ========================================================= */

    /**
     * Finalize the Shop: discard taken cards, clear selection.
     * After shopping, player returns to playerActions (may still craft).
     */
    finalizeShop: function(slotIndices) {
        // Move cards to discard, empty the slots.
        // Session 9: skip null slots (empty bazaar rule — already null).
        slotIndices.forEach(function(i) {
            if (Game.state.bazaar[i] !== null) {
                Game.state.discard.push(Game.state.bazaar[i]);
                Game.state.bazaar[i] = null;
            }
        });

        // Clear selection
        this.clearSelection();

        // Mark shop as done for this turn
        this.state.turn.shopDone = true;

        // Session 18: Detailed shop log moved to applyShopChoices

        // Stay in playerActions phase (player may still craft/exchange)
        // Update UI via render delegate
        this.render.bazaar();
        this.render.actionBar();
        this.render.deckCounter();
    },


    /* =========================================================
       RESTOCK BAZAAR — Session 6 update
       Now draws ALL card types (Yarn + Events + Special Requests).
       Returns an array of {slot, card} for Events/SRs that appeared
       in the Bazaar, which the UI resolves sequentially before
       calling endTurn().
       ========================================================= */

    /**
     * Fill empty Bazaar slots from the deck, drawing any card type.
     * After filling, Events and SRs must be resolved by the UI.
     * Returns an array of { slot, card } for each Event/SR drawn.
     * Does NOT call endTurn() — the UI calls it after resolution.
     */
    restockBazaar: function() {
        var revealed = [];

        for (var i = 0; i < 6; i++) {
            if (this.state.bazaar[i] === null && this.state.deck.length > 0) {
                var card = this.drawCard();
                this.state.bazaar[i] = card;

                if (card && (card.type === 'event' || card.type === 'specialRequest')) {
                    revealed.push({ slot: i, card: card });
                }
            }
        }

        try{ if(window.Sound && revealed && revealed.length) Sound.play('restock'); }catch(e){}
        // Render the updated bazaar (may show Event/SR cards briefly)
        this.render.bazaar();
        this.render.deckCounter();

        return revealed;
    },

    /**
     * Remove a resolved Event or SR from the Bazaar slot.
     * Events go to discard. SRs go to the player's hand (see takeSpecialRequest).
     * The slot stays EMPTY (not refilled) per rules p.9.
     */
    resolveRestockCard: function(slotIndex, card) {
        if (card.type === 'event') {
            this.state.discard.push(card);
        }
        // SRs are handled by takeSpecialRequest() before calling this
        this.state.bazaar[slotIndex] = null;
    },


    /* =========================================================
       EVENT EFFECTS — Session 6 (corrected rules + MP foundation)
       All 5 events return needsInput so the UI always drives
       resolution. The UI handles SP auto-selection where needed.
       ========================================================= */

    /**
     * Dispatch an event effect — always returns needsInput so the UI
     * can sequence properly even for auto-apply events (SP shortcut).
     */
    applyEventEffect: function(card) {
        switch (card.effect) {

            case 'tangledCat':
                // Active player CHOOSES another player who can't craft next turn.
                // SP: auto-targets the only player.
                return {
                    status: 'needsInput',
                    inputType: 'tangledCat',
                    msg: "Tangled Cat! Choose a player — that player can't Craft on their next turn.",
                };

            case 'yarnSale':
                // Each player gains 3 yarn tokens of any colors they choose.
                return {
                    status: 'needsInput',
                    inputType: 'yarnSale',
                    msg: 'Yarn Sale! Take 3 Yarn tokens of any color(s) from the supply.',
                };

            case 'donate':
                // Active player gives 1 yarn from their stash to another player.
                // SP: yarn goes back to the supply (no valid recipient).
                return {
                    status: 'needsInput',
                    inputType: 'donate',
                    msg: 'Donation Drive! Give 1 Yarn token from your stash to another player.',
                };

            case 'friendlyClerk':
                // Each player chooses 1 yarn color and gains 1 token of that color.
                return {
                    status: 'needsInput',
                    inputType: 'friendlyClerk',
                    msg: 'Friendly Clerk! Each player chooses 1 Yarn color and gains 1 token.',
                };

            case 'craftCircle':
                // Each player may immediately craft 1 item using yarn they already have.
                return {
                    status: 'needsInput',
                    inputType: 'craftCircle',
                    msg: 'Craft Circle! Each player may immediately craft 1 item using their current yarn.',
                };

            default:
                return { status: 'needsInput', inputType: 'generic', msg: 'Event resolved.' };
        }
    },

    /* --- Individual event apply functions --- */

    /**
     * Tangled Cat: set cantCraftNextTurn on the target player.
     * @param {number} playerIndex — index into state.players
     */
    applyTangledCat: function(playerIndex) {
        var target = this.state.players[playerIndex];
        if (target) {
            target.cantCraftNextTurn = true;
            try{ if(window.Sound) Sound.play('ev-tangled-cat'); }catch(e){}
            // Session 18: Log event for turn history
            this._logAction('Event: Tangled Cat → ' + target.name + ' can\'t craft next turn', 'event');
        }
    },

    /**
     * Friendly Clerk: give 1 yarn token of the chosen color to a player.
     * @param {number} playerIndex — index into state.players
     * @param {string} color       — yarn color chosen
     * @returns {string[]} changed colors for animation
     */
    applyFriendlyClerk: function(playerIndex, color) {
        var target = this.state.players[playerIndex];
        if (!target || target.yarnBowl[color] === undefined) return [];
        target.yarnBowl[color] += 1;
        // Session 18: Log event for turn history
        this._logAction('Event: Friendly Clerk → ' + target.name + ' gained 1 ' + color + ' yarn', 'event');
        return [color];
    },

    /**
     * Yarn Sale: the active player gains 3 yarn tokens.
     * @param {string[]} colors — array of 3 chosen color strings
     * @returns {string[]} changed colors for animation
     */
    applyYarnSale: function(colors) {
        var bowl = this.state.player.yarnBowl;
        var changed = [];
        colors.forEach(function(color) {
            if (bowl[color] !== undefined) {
                bowl[color] += 1;
                if (changed.indexOf(color) === -1) changed.push(color);
            }
        });
        // Session 18: Log event for turn history
        var saleParts = {};
        colors.forEach(function(c) { saleParts[c] = (saleParts[c] || 0) + 1; });
        var saleSummary = [];
        CARDS.COLORS.forEach(function(c) { if (saleParts[c]) saleSummary.push(saleParts[c] + ' ' + c); });
        this._logAction('Event: Yarn Sale → gained ' + saleSummary.join(', '), 'event');
        return changed;
    },

    /**
     * Donate: active player gives 1 yarn to a target player.
     * If toPlayerIndex is -1 (SP / no valid target), yarn returns to supply.
     * @param {string} color         — yarn color to give
     * @param {number} toPlayerIndex — recipient index, or -1 for supply
     * @returns {string[]} changed colors for animation
     */
    applyDonate: function(color, toPlayerIndex) {
        var from = this.state.player;
        var changed = [];
        if (!from || from.yarnBowl[color] === undefined || from.yarnBowl[color] < 1) return [];

        from.yarnBowl[color] -= 1;
        changed.push(color);

        if (toPlayerIndex >= 0) {
            var to = this.state.players[toPlayerIndex];
            if (to) {
                to.yarnBowl[color] += 1;
                // Session 18: Log event for turn history
                this._logAction('Event: Donate → gave 1 ' + color + ' yarn to ' + to.name, 'event');
            }
        } else {
            // If toPlayerIndex === -1, yarn goes to supply (just removed from bowl)
            this._logAction('Event: Donate → returned 1 ' + color + ' yarn to supply', 'event');
        }

        return changed;
    },

    /**
     * Craft Circle: craft an item immediately without consuming a turn craft action.
     * Works for both regular items (itemId) and Special Requests (srUid).
     * @param {string} itemId      — item id (or null if crafting an SR)
     * @param {string} srUid       — SR uid (or null if crafting a regular item)
     * @param {Object} yarnToSpend — { color: count }
     * @param {number} playerIndex — index into state.players
     * @returns {string[]|null} changed colors, or null if invalid
     */
    craftCircleItem: function(itemId, srUid, yarnToSpend, playerIndex) {
        var player = this.state.players[playerIndex];
        if (!player) return null;

        var bowl = player.yarnBowl;

        // Validate affordability
        var valid = Object.keys(yarnToSpend).every(function(color) {
            return (bowl[color] || 0) >= yarnToSpend[color];
        });
        if (!valid) return null;

        // Spend yarn
        var changed = [];
        Object.keys(yarnToSpend).forEach(function(color) {
            bowl[color] -= yarnToSpend[color];
            if (changed.indexOf(color) === -1) changed.push(color);
        });

        if (srUid) {
            // Craft a Special Request
            var srList = player.specialRequests;
            var srIdx = srList.findIndex(function(sr) { return sr.uid === srUid; });
            if (srIdx !== -1) {
                var sr = srList.splice(srIdx, 1)[0];
                player.craftedSpecialRequests.push(sr);
            }
        } else {
            // Craft a regular item — also track yarnSpent for Frog It
            var itemDef = CARDS.getItem(itemId);
            var tileCc = player.patternTiles.find(function(t) { return t.itemId === itemId; });
            var patternLearnedCc = !tileCc || tileCc.learned;
            player.items.push({
                id:             itemDef.id,
                name:           itemDef.name,
                img:            itemDef.img,
                points:         itemDef.points,
                yarnSpent:      Object.assign({}, yarnToSpend),
                patternLearned: patternLearnedCc,
                colorRule:      patternLearnedCc ? itemDef.colorRule : 'exact',
                yarnCount:      itemDef.yarnCount,
            });
        }
        // NOTE: does NOT increment craftUsed — this is a free event craft

        // Session 18: Log craft circle for turn history
        var ccName = srUid ? 'an SR' : (CARDS.getItem(itemId) ? CARDS.getItem(itemId).name : itemId);
        this._logAction('Event: Craft Circle → ' + player.name + ' crafted ' + ccName, 'event');

        return changed;
    },

    /**
     * Get all craft options (regular + SR) for a given player during Craft Circle.
     * @param {number} playerIndex
     * @returns {Array} options matching getCraftOptions() shape + SR options
     */
    getCraftCircleOptions: function(playerIndex) {
        var player = this.state.players[playerIndex];
        if (!player) return [];

        var bowl = player.yarnBowl;
        var options = [];

        // Regular items — same logic as getCraftOptions()
        var hatDef = CARDS.getItem('hat');
        options.push({
            type: 'general', tile: null, sr: null, itemDef: hatDef, learned: true,
            yarnNeeded: Game.generalYarnNeeded(hatDef),
            canAfford: Game._canAffordGeneral(hatDef, bowl),
        });

        player.patternTiles.forEach(function(tile) {
            var itemDef = CARDS.getItem(tile.itemId);
            options.push({
                type: 'tile', tile: tile, sr: null, itemDef: itemDef,
                learned: tile.learned,
                yarnNeeded: tile.learned ? Game.generalYarnNeeded(itemDef) : tile.exact,
                canAfford: tile.learned
                    ? Game._canAffordGeneral(itemDef, bowl)
                    : Game._canAffordExact(tile.exact, bowl),
            });
        });

        var blanketDef = CARDS.getItem('blanket');
        options.push({
            type: 'general', tile: null, sr: null, itemDef: blanketDef, learned: true,
            yarnNeeded: Game.generalYarnNeeded(blanketDef),
            canAfford: Game._canAffordGeneral(blanketDef, bowl),
        });

        // Session 15b: SRs are NOT craftable during Craft Circle events
        // (Designer rule: Craft Circle only allows regular items, not SRs)

        return options;
    },


    /* =========================================================
       SESSION 8c: UNIQUE ABILITIES
       ========================================================= */

    /**
     * Take 3 Yarn (Ted/Eliza Space 3):
     * Gain 3 yarn tokens of a single chosen color from supply.
     * Called after the color picker modal resolves.
     * @param {string} color — the chosen yarn color
     * @returns {string[]} changed colors for animation
     */
    applyTake3Yarn: function(color) {
        var bowl = this.state.player.yarnBowl;
        if (bowl[color] === undefined) return [];
        bowl[color] += 3;
        this.state.pendingTake3Yarn = false;
        // Session 13: Log for turn history
        this._logAction('Took 3 ' + color + ' yarn');
        return [color];
    },

    /**
     * Session 36: Take 3 Any (Hank boss Space 2):
     * Gain 3 yarn tokens of any chosen colors from supply (mixed; can repeat).
     * Mirrors applyTake5Any. AI-only path (the human never plays Hank).
     * @param {string[]} colors — array of exactly 3 color names
     * @returns {string[]} changed colors for animation, or empty if invalid
     */
    applyTake3Any: function(colors) {
        if (!Array.isArray(colors) || colors.length !== 3) {
            console.error('applyTake3Any: expected exactly 3 colors, got ' + (colors ? colors.length : 'null'));
            return [];
        }
        var bowl = this.state.player.yarnBowl;
        var changed = [];
        for (var i = 0; i < colors.length; i++) {
            var c = colors[i];
            if (bowl[c] === undefined) {
                console.error('applyTake3Any: invalid color "' + c + '"');
                return [];
            }
            bowl[c] += 1;
            if (changed.indexOf(c) === -1) changed.push(c);
        }
        this.state.pendingTake3Any = false;
        this._logAction('Took 3 yarn: ' + changed.join(', '));
        return changed;
    },

    /**
     * Session 36: Hank boss auto-yarn — at the start of every Hank turn he
     * gains +3 yarn of a SINGLE color of his choosing. Snowballs the color he
     * already holds the most of (he hoards; leftovers score for him). Automatic,
     * in ADDITION to his action that turn.
     * @param {Object} player — the Hank player object
     * @returns {string} the color chosen
     */
    applyHankAutoYarn: function(player) {
        var bowl = player.yarnBowl;
        var best = CARDS.COLORS[0], bestN = -1;
        CARDS.COLORS.forEach(function(c) {
            var n = bowl[c] || 0;
            if (n > bestN) { bestN = n; best = c; }
        });
        bowl[best] += 3;
        this._logAction(player.name + ' auto-spun +3 ' + best + ' yarn');
        return best;
    },

    /**
     * Session 13: Take 5 Any (Expert unique — Irene/Mauro Space 2):
     * Gain 5 yarn tokens of any chosen colors from supply.
     * Colors can repeat (e.g., [blue, blue, blue, red, red]).
     * @param {string[]} colors — array of exactly 5 color names
     * @returns {string[]} changed colors for animation, or empty if invalid
     */
    applyTake5Any: function(colors) {
        if (!Array.isArray(colors) || colors.length !== 5) {
            console.error('applyTake5Any: expected exactly 5 colors, got ' + (colors ? colors.length : 'null'));
            return [];
        }
        var bowl = this.state.player.yarnBowl;
        var changed = [];
        for (var i = 0; i < colors.length; i++) {
            var c = colors[i];
            if (bowl[c] === undefined) {
                console.error('applyTake5Any: invalid color "' + c + '"');
                return [];
            }
            bowl[c] += 1;
            if (changed.indexOf(c) === -1) changed.push(c);
        }
        this.state.pendingTake5Any = false;
        // Session 13: Log for turn history
        this._logAction('Took 5 yarn: ' + changed.join(', '));
        return changed;
    },


    /* =========================================================
       SPECIAL REQUESTS — Session 6
       ========================================================= */

    /**
     * Take a Special Request: move from Bazaar to a player's SR hand.
     * Session 9: isFavorite is resolved at take-time based on the taking player's character.
     * @param {Object} card — the SR card object
     * @param {number} [playerIndex] — index into state.players (defaults to active player)
     */
    takeSpecialRequest: function(card, playerIndex) {
        var pIdx = (playerIndex !== undefined) ? playerIndex : this.state.activePlayerIndex;
        var player = this.state.players[pIdx];

        var sr = {
            uid:        card.uid,
            id:         card.id,
            name:       card.name,
            img:        card.img,
            points:     card.points,
            isFavorite: card.favoriteOf === player.characterId,
            favoriteOf: card.favoriteOf || null,
            colorRule:  card.colorRule || 'specific',
        };
        if (card.yarn)      sr.yarn      = Object.assign({}, card.yarn);
        if (card.yarnCount) sr.yarnCount = card.yarnCount;
        // Session 13: Pass through new colorRule fields
        if (card.anyCount)  sr.anyCount  = card.anyCount;
        if (card.plusYarn)   sr.plusYarn   = Object.assign({}, card.plusYarn);
        if (card.sameCount) sr.sameCount = card.sameCount;
        player.specialRequests.push(sr);

        // Session 18: Detailed SR taken log for turn history
        var srTakeLog = 'Took SR: ' + card.name + ' (' + card.points + ' pts)';
        if (sr.isFavorite) srTakeLog += ' ★ Favorite!';
        if (pIdx !== this.state.activePlayerIndex) {
            srTakeLog += ' → given to ' + player.name;
        }
        this._logAction(srTakeLog, 'sr');
    },

    /**
     * Craft a Special Request: spend yarn, gain crafted SR.
     * @param {string} srUid — unique id of the SR to craft
     * @param {Object} yarnToSpend — { color: count } yarn to spend from bowl
     * @returns {string[]|null} changed color names, or null if invalid
     */
    craftSpecialRequest: function(srUid, yarnToSpend) {
        // Guard: must be in a phase that allows crafting
        if (this.state.phase !== 'playerActions' && this.state.phase !== 'finalCraft') {
            console.error('craftSpecialRequest: wrong phase "' + this.state.phase + '"');
            return null;
        }

        var srList = this.state.player.specialRequests;
        var srIdx = srList.findIndex(function(sr) { return sr.uid === srUid; });
        if (srIdx === -1) {
            console.error('craftSpecialRequest: SR not found (uid: ' + srUid + ')');
            return null;
        }

        var sr = srList[srIdx];
        var bowl = this.state.player.yarnBowl;

        // Validate we can afford it
        var valid = Object.keys(yarnToSpend).every(function(color) {
            return bowl[color] >= yarnToSpend[color];
        });
        if (!valid) return null;

        // Spend yarn
        var changedColors = [];
        Object.keys(yarnToSpend).forEach(function(color) {
            bowl[color] -= yarnToSpend[color];
            if (changedColors.indexOf(color) === -1) changedColors.push(color);
        });

        // Give rule: distribute spent yarn to other players' bowls
        // Each other player receives yarnCount yarn (distributed from what was spent).
        if ((sr.colorRule || 'specific') === 'give') {
            var currentIdx = this.state.activePlayerIndex;
            var yarnPerPlayer = sr.yarnCount || 0;
            var allPlayers = this.state.players;
            // Build a flat list of colors to distribute
            var yarnPool = [];
            Object.keys(yarnToSpend).forEach(function(color) {
                for (var i = 0; i < yarnToSpend[color]; i++) {
                    yarnPool.push(color);
                }
            });
            // Distribute round-robin: yarnPerPlayer to each other player
            var poolIdx = 0;
            for (var p = 0; p < allPlayers.length; p++) {
                if (p === currentIdx) continue;
                for (var y = 0; y < yarnPerPlayer && poolIdx < yarnPool.length; y++) {
                    var giveColor = yarnPool[poolIdx++];
                    allPlayers[p].yarnBowl[giveColor] = (allPlayers[p].yarnBowl[giveColor] || 0) + 1;
                }
            }
        }

        // Move from specialRequests to craftedSpecialRequests
        srList.splice(srIdx, 1);
        this.state.player.craftedSpecialRequests.push(sr);

        // Session 18: Log SR craft for turn history
        var srLogMsg = 'Completed SR: ' + sr.name + ' (' + sr.points + ' pts)';
        if (sr.isFavorite) srLogMsg += ' ★ Favorite';
        this._logAction(srLogMsg, 'sr');

        // Count as a craft action
        this.state.turn.craftUsed++;

        return changedColors;
    },

    /**
     * Check if a Special Request can be afforded.
     * Handles all colorRule variants: specific / any / sameColor / different / give.
     */
    canAffordSpecialRequest: function(sr) {
        var bowl = this.state.player.yarnBowl;
        var rule = sr.colorRule || 'specific';
        var count = sr.yarnCount || 0;

        switch (rule) {
            case 'specific':
                if (!sr.yarn) return false;
                return Object.keys(sr.yarn).every(function(color) {
                    return (bowl[color] || 0) >= sr.yarn[color];
                });

            case 'any': {
                var total = 0;
                CARDS.COLORS.forEach(function(c) { total += (bowl[c] || 0); });
                return total >= count;
            }

            case 'sameColor':
                return CARDS.COLORS.some(function(c) { return (bowl[c] || 0) >= count; });

            case 'different': {
                var colorsWithYarn = CARDS.COLORS.filter(function(c) { return (bowl[c] || 0) >= 1; }).length;
                return colorsWithYarn >= count;
            }

            case 'give': {
                // Give yarnCount yarn to EACH other player.
                // Total needed = yarnCount × number of other players.
                var otherPlayerCount = this.state.players.length - 1;
                // Solo: the yarn still leaves your stash (goes to supply), so it costs `count`.
                var giveNeeded = count * Math.max(1, otherPlayerCount);
                var giveTotal = 0;
                CARDS.COLORS.forEach(function(c) { giveTotal += (bowl[c] || 0); });
                return giveTotal >= giveNeeded;
            }

            // Session 13: New colorRules for Magic Socks expansion SRs

            case 'sameColorPlus': {
                // N of same color + specific extras. Same color CANNOT be a plusYarn color.
                // E.g., Skelly: 5 of one color (not orange) + 1 orange
                var plusYarn = sr.plusYarn || {};
                // Check plus requirements first
                var plusOK = Object.keys(plusYarn).every(function(pc) {
                    return (bowl[pc] || 0) >= plusYarn[pc];
                });
                if (!plusOK) return false;
                // Check if any non-plus color has enough for the "same" portion
                return CARDS.COLORS.some(function(c) {
                    if (c in plusYarn) return false;  // same color can't be a plus color
                    return (bowl[c] || 0) >= count;
                });
            }

            case 'specificPlusAny': {
                // Specific colors + N of any OTHER color (not in the specific set).
                // E.g., Koi: 3 orange + 2 of any non-orange
                var specYarn = sr.yarn || {};
                var anyNeeded = sr.anyCount || 0;
                // Check specific requirements
                var specOK = Object.keys(specYarn).every(function(sc) {
                    return (bowl[sc] || 0) >= specYarn[sc];
                });
                if (!specOK) return false;
                // "Other" = colors NOT in the specific set. Surplus of a specific color does
                // NOT count (Koi = 3 orange + 2 of any color OTHER than orange).
                var otherAvail = 0;
                CARDS.COLORS.forEach(function(c) {
                    if (specYarn[c]) return;          // specific colors are not "other"
                    otherAvail += (bowl[c] || 0);
                });
                return otherAvail >= anyNeeded;
            }

            case 'specificPlusSame': {
                // Specific colors + N of one color (can be same as specific or different).
                // E.g., Dog Bandana: 3 purple + 2 of one color
                var specYarn2 = sr.yarn || {};
                var sameNeeded = sr.sameCount || 0;
                // Check specific requirements first
                var spec2OK = Object.keys(specYarn2).every(function(sc) {
                    return (bowl[sc] || 0) >= specYarn2[sc];
                });
                if (!spec2OK) return false;
                // Check if any color has enough left over for the "same" portion
                return CARDS.COLORS.some(function(c) {
                    var avail = bowl[c] || 0;
                    var alreadyUsed = specYarn2[c] || 0;
                    return (avail - alreadyUsed) >= sameNeeded;
                });
            }

            default:
                return false;
        }
    },


    /* =========================================================
       CRAFT ACTION
       Player spends yarn to match a pattern → gains an Item token.
       Session 6: also handles Special Request crafting.
       ========================================================= */

    /**
     * Get all craftable options for the current player.
     * Includes: hat, bear/mittens/scarf tiles, blanket, and held SRs.
     */
    getCraftOptions: function() {
        var bowl = this.state.player.yarnBowl;
        var options = [];
        var anyColors = this.state.craftAnyColors;

        // Session 8c: total yarn in bowl (for craftAnyColors affordability override)
        var totalYarnInBowl = 0;
        if (anyColors) {
            CARDS.COLORS.forEach(function(c) { totalYarnInBowl += (bowl[c] || 0); });
        }

        // Hat (always general: 2 different colors)
        var hatDef = CARDS.getItem('hat');
        options.push({
            type: 'general',
            tile: null,
            sr: null,
            itemDef: hatDef,
            yarnNeeded: anyColors ? 'any ' + hatDef.yarnCount + ' yarn' : Game.generalYarnNeeded(hatDef),
            canAfford: anyColors ? totalYarnInBowl >= hatDef.yarnCount : Game._canAffordGeneral(hatDef, bowl),
            learned: true,
        });

        // Tile-based items (bear, mittens, scarf)
        this.state.player.patternTiles.forEach(function(tile) {
            var itemDef = CARDS.getItem(tile.itemId);
            var canAfford;
            var yarnNeeded;

            if (anyColors) {
                // craftAnyColors: treat ALL items as "any N yarn"
                yarnNeeded = 'any ' + itemDef.yarnCount + ' yarn';
                canAfford = totalYarnInBowl >= itemDef.yarnCount;
            } else if (tile.learned) {
                yarnNeeded = Game.generalYarnNeeded(itemDef);
                canAfford = Game._canAffordGeneral(itemDef, bowl);
            } else {
                yarnNeeded = tile.exact;
                canAfford = Game._canAffordExact(tile.exact, bowl);
            }

            options.push({
                type: 'tile',
                tile: tile,
                sr: null,
                itemDef: itemDef,
                yarnNeeded: yarnNeeded,
                canAfford: canAfford,
                learned: tile.learned,
            });
        });

        // Blanket (always general: 5 of one color)
        var blanketDef = CARDS.getItem('blanket');
        options.push({
            type: 'general',
            tile: null,
            sr: null,
            itemDef: blanketDef,
            yarnNeeded: anyColors ? 'any ' + blanketDef.yarnCount + ' yarn' : Game.generalYarnNeeded(blanketDef),
            canAfford: anyColors ? totalYarnInBowl >= blanketDef.yarnCount : Game._canAffordGeneral(blanketDef, bowl),
            learned: true,
        });

        return options;
    },

    /**
     * Get Special Request craft options (held SRs the player can craft).
     */
    getSRCraftOptions: function() {
        var bowl = this.state.player.yarnBowl;
        var anyColors = this.state.craftAnyColors;
        // Session 8c: total yarn for craftAnyColors affordability override
        var totalYarn = 0;
        if (anyColors) {
            CARDS.COLORS.forEach(function(c) { totalYarn += (bowl[c] || 0); });
        }
        return this.state.player.specialRequests.map(function(sr) {
            var srYarnNeeded = sr.yarnCount || 0;
            if (!srYarnNeeded && sr.yarn) {
                CARDS.COLORS.forEach(function(c) { srYarnNeeded += (sr.yarn[c] || 0); });
            }
            return {
                sr: sr,
                canAfford: anyColors ? totalYarn >= srYarnNeeded : Game.canAffordSpecialRequest(sr),
            };
        });
    },

    _canAffordExact: function(exact, bowl) {
        return Object.keys(exact).every(function(color) {
            return bowl[color] >= exact[color];
        });
    },

    _canAffordGeneral: function(itemDef, bowl) {
        var count = itemDef.yarnCount;
        var rule = itemDef.colorRule;
        var amounts = CARDS.COLORS.map(function(c) { return bowl[c]; });

        if (rule === 'oneColor') {
            return amounts.some(function(a) { return a >= count; });
        } else if (rule === 'twoColors') {
            for (var i = 0; i < amounts.length; i++) {
                if (amounts[i] < 1) continue;
                for (var j = i + 1; j < amounts.length; j++) {
                    if (amounts[j] < 1) continue;
                    if (amounts[i] + amounts[j] >= count) return true;
                }
            }
            return false;
        } else if (rule === 'different') {
            var colorsWithYarn = amounts.filter(function(a) { return a >= 1; }).length;
            return colorsWithYarn >= count;
        }
        return false;
    },

    /**
     * Get a human-readable description of yarn needed for a general (learned) pattern.
     * @param {Object} itemDef — item definition from CARDS.getItem()
     * @returns {string} e.g. "2 of one color", "3 different colors"
     */
    generalYarnNeeded: function(itemDef) {
        var labels = {
            oneColor: itemDef.yarnCount + ' of one color',
            twoColors: itemDef.yarnCount + ' of two colors',
            different: itemDef.yarnCount + ' different colors',
        };
        return labels[itemDef.colorRule] || '';
    },

    /**
     * Execute a craft action: spend yarn, gain item.
     * @param {string} itemId — item id to craft (e.g. 'hat', 'bear', 'mittens', 'scarf', 'blanket')
     * @param {Object} yarnToSpend — { color: count } yarn to spend from bowl
     * @returns {string[]|null} changed color names, or null if invalid
     */
    craft: function(itemId, yarnToSpend) {
        // Guard: must be in a phase that allows crafting
        if (this.state.phase !== 'playerActions' && this.state.phase !== 'finalCraft') {
            console.error('craft: wrong phase "' + this.state.phase + '"');
            return null;
        }

        // Guard: check craft limit
        if (this.state.phase === 'playerActions' && this.state.turn.craftUsed >= this.state.craftLimit) {
            console.error('craft: craft limit reached (' + this.state.turn.craftUsed + '/' + this.state.craftLimit + ')');
            return null;
        }

        // Guard: valid item
        var itemDef = CARDS.getItem(itemId);
        if (!itemDef) {
            console.error('craft: unknown itemId "' + itemId + '"');
            return null;
        }

        // Guard: valid yarnToSpend object
        if (!yarnToSpend || typeof yarnToSpend !== 'object') {
            console.error('craft: invalid yarnToSpend');
            return null;
        }

        var bowl = this.state.player.yarnBowl;

        // Validate affordability
        var valid = Object.keys(yarnToSpend).every(function(color) {
            return (bowl[color] || 0) >= yarnToSpend[color];
        });
        if (!valid) return null;

        // Spend the yarn
        var changedColors = [];
        Object.keys(yarnToSpend).forEach(function(color) {
            bowl[color] -= yarnToSpend[color];
            if (changedColors.indexOf(color) === -1) changedColors.push(color);
        });

        // Gain the item — store yarnSpent and patternLearned for Frog It
        // Determine if this item was crafted from a learned pattern (or is always general)
        var tile = this.state.player.patternTiles.find(function(t) { return t.itemId === itemId; });
        var patternLearned = !tile || tile.learned;  // hat/blanket have no tile → always general
        var craftedItem = {
            id:             itemDef.id,
            name:           itemDef.name,
            img:            itemDef.img,
            points:         itemDef.points,
            yarnSpent:      Object.assign({}, yarnToSpend),   // for Frog It (exact refund)
            patternLearned: patternLearned,                    // for Frog It (choose refund)
            colorRule:      patternLearned ? itemDef.colorRule : 'exact',
            yarnCount:      itemDef.yarnCount,
        };
        this.state.player.items.push(craftedItem);

        // Session 13: Maker unique — craft 1, receive 2 copies
        if (this.state.makeTwoItems) {
            this.state.player.items.push({
                id:             craftedItem.id,
                name:           craftedItem.name,
                img:            craftedItem.img,
                points:         craftedItem.points,
                yarnSpent:      Object.assign({}, yarnToSpend),
                patternLearned: craftedItem.patternLearned,
                colorRule:      craftedItem.colorRule,
                yarnCount:      craftedItem.yarnCount,
                _makeTwoCopy:   true,  // flag indicating this is the bonus copy
            });
        }

        // Session 18: Detailed craft log for turn history
        var logMsg = 'Crafted ' + itemDef.name + ' (' + itemDef.points + ' pts)';
        if (this.state.makeTwoItems) logMsg += ' ×2 (Make Two)';
        var spentParts = [];
        CARDS.COLORS.forEach(function(c) {
            if (yarnToSpend[c]) spentParts.push(yarnToSpend[c] + ' ' + c);
        });
        if (spentParts.length > 0) logMsg += ' — spent ' + spentParts.join(', ');
        this._logAction(logMsg);

        // Increment craft used count
        this.state.turn.craftUsed++;

        try{ if(window.Sound) Sound.play('craft'); }catch(e){}
        return changedColors;
    },


    /* =========================================================
       EXCHANGE ACTION
       House rule: swap any number of yarn tokens for the same
       number of different-colored yarn tokens. Any colors in,
       any colors out. Costs the entire turn (exchange-only space).
       ========================================================= */

    /**
     * Execute an exchange: give yarn, receive yarn.
     * @param {Object} give    — { color: count, ... } yarn to return to supply
     * @param {Object} receive — { color: count, ... } yarn to take from supply
     * @returns {string[]|null} changed color names, or null if invalid
     */
    exchange: function(give, receive) {
        // Guard: must be in playerActions phase
        if (this.state.phase !== 'playerActions') {
            console.error('exchange: wrong phase "' + this.state.phase + '"');
            return null;
        }

        // Guard: exchange must be available and not already used
        if (!this.state.hasExchange) {
            console.error('exchange: no exchange available on this action space');
            return null;
        }
        if (this.state.turn.exchangeDone) {
            console.error('exchange: already used this turn');
            return null;
        }

        // Guard: valid inputs
        if (!give || typeof give !== 'object' || !receive || typeof receive !== 'object') {
            console.error('exchange: invalid give/receive objects');
            return null;
        }

        var bowl = this.state.player.yarnBowl;

        // Validate totals match
        var giveTotal = 0;
        var receiveTotal = 0;
        Object.keys(give).forEach(function(c) { giveTotal += give[c]; });
        Object.keys(receive).forEach(function(c) { receiveTotal += receive[c]; });
        if (giveTotal === 0 || giveTotal !== receiveTotal) return null;

        // Validate player has enough to give
        var canGive = Object.keys(give).every(function(c) {
            return bowl[c] >= give[c];
        });
        if (!canGive) return null;

        // Apply the exchange
        var changedColors = [];
        Object.keys(give).forEach(function(c) {
            bowl[c] -= give[c];
            if (changedColors.indexOf(c) === -1) changedColors.push(c);
        });
        Object.keys(receive).forEach(function(c) {
            bowl[c] += receive[c];
            if (changedColors.indexOf(c) === -1) changedColors.push(c);
        });

        // Mark exchange as done
        this.state.turn.exchangeDone = true;

        // Session 18: Detailed exchange log for turn history
        var giveParts = [];
        CARDS.COLORS.forEach(function(c) { if (give[c]) giveParts.push(give[c] + ' ' + c); });
        var recvParts = [];
        CARDS.COLORS.forEach(function(c) { if (receive[c]) recvParts.push(receive[c] + ' ' + c); });
        this._logAction('Exchanged ' + giveParts.join(', ') + ' → ' + recvParts.join(', '));

        return changedColors;
    },


    /* =========================================================
       APPLY CONFIRMED SHOP CHOICES
       Called after the player has selected colors for wilds
       and confirmed the full take.
       ========================================================= */

    /**
     * Apply confirmed shop choices: add yarn to bowl, finalize shop.
     * @param {Object} normalYarn — { color: count } yarn from normal cards
     * @param {string[]} wildChoices — chosen colors for wild/empty slots
     * @param {number[]} slotIndices — bazaar slot indices that were selected
     * @returns {string[]} changed color names
     */
    applyShopChoices: function(normalYarn, wildChoices, slotIndices) {
        // Guard: must be in playerActions phase with shop available
        if (this.state.phase !== 'playerActions') {
            console.error('applyShopChoices: wrong phase "' + this.state.phase + '"');
            return [];
        }
        if (this.state.turn.shopDone) {
            console.error('applyShopChoices: shop already done this turn');
            return [];
        }

        var changedColors = [];

        var bowl = this.state.player.yarnBowl;
        Object.keys(normalYarn).forEach(function(color) {
            bowl[color] += normalYarn[color];
            if (changedColors.indexOf(color) === -1) changedColors.push(color);
        });

        wildChoices.forEach(function(color) {
            bowl[color] += 1;
            if (changedColors.indexOf(color) === -1) changedColors.push(color);
        });

        // Session 18: Log detailed shop action for turn history
        var yarnSummary = {};
        Object.keys(normalYarn).forEach(function(c) {
            if (normalYarn[c] > 0) yarnSummary[c] = (yarnSummary[c] || 0) + normalYarn[c];
        });
        wildChoices.forEach(function(c) {
            yarnSummary[c] = (yarnSummary[c] || 0) + 1;
        });
        var yarnParts = [];
        CARDS.COLORS.forEach(function(c) {
            if (yarnSummary[c]) yarnParts.push(yarnSummary[c] + ' ' + c);
        });
        var shopMsg = 'Shopped ' + this.state.shopLimit + ' cards';
        if (yarnParts.length > 0) shopMsg += ' → gained ' + yarnParts.join(', ');
        this._logAction(shopMsg);

        // Finalize shop (discard cards, mark shop done)
        this.finalizeShop(slotIndices);

        return changedColors;
    },


    /* =========================================================
       UTILITY
       ========================================================= */

    /**
     * Session 22: Internal helper — logs to both _currentTurnLog and the action feed.
     * @param {string} text — action description
     * @param {string} [type] — feed type: 'action', 'event', 'sr', 'project'
     */
    _logAction: function(text, type) {
        if (this.state._currentTurnLog) {
            this.state._currentTurnLog.push(text);
        }
        this.logFeedAction(this.state.activePlayerIndex, text, type || 'action');
        try{ if(window.Sound) Sound.fromLog(text, type); }catch(e){}
    },

    /**
     * Session 22: Log an action to the rolling action feed.
     * @param {number|null} playerIndex — index into players[], or null for system events
     * @param {string} text — action description
     * @param {string} [type] — 'action' (default), 'event', 'sr', 'project', 'system'
     */
    logFeedAction: function(playerIndex, text, type) {
        var entry = {
            playerIndex: playerIndex,
            playerName: null,
            characterType: null,
            text: text,
            type: type || 'action',
            turn: this.state.turn ? this.state.turn.number : 0,
        };
        if (playerIndex !== null && this.state.players && this.state.players[playerIndex]) {
            var p = this.state.players[playerIndex];
            entry.playerName = p.name;
            entry.characterType = p.characterType;
        }
        this.state.actionFeed.push(entry);
        // Keep last 50 entries to prevent unbounded growth
        if (this.state.actionFeed.length > 50) {
            this.state.actionFeed = this.state.actionFeed.slice(-50);
        }
        this.render.actionFeed();
    },

    /**
     * Session 15: Get formatted elapsed game time as "M:SS" or "H:MM:SS".
     * @returns {string}
     */
    getGameTimeFormatted: function() {
        if (!this.state.gameStartTime) return '0:00';
        var elapsed = Math.floor((Date.now() - this.state.gameStartTime) / 1000);
        var hours = Math.floor(elapsed / 3600);
        var mins  = Math.floor((elapsed % 3600) / 60);
        var secs  = elapsed % 60;
        if (hours > 0) {
            return hours + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        }
        return mins + ':' + String(secs).padStart(2, '0');
    },

    /**
     * Session 15: Get formatted per-player average turn time as "M:SS".
     * @param {Object} player
     * @returns {string}
     */
    getAvgTurnTimeFormatted: function(player) {
        if (!player.turnCount || player.turnCount === 0) return '0:00';
        var avgMs = player.totalTurnTime / player.turnCount;
        var avgSec = Math.round(avgMs / 1000);
        var mins = Math.floor(avgSec / 60);
        var secs = avgSec % 60;
        return mins + ':' + String(secs).padStart(2, '0');
    },

    /**
     * Session 15: Stop the game timer (called at game over).
     */
    stopTimer: function() {
        if (this.state._timerInterval) {
            clearInterval(this.state._timerInterval);
            this.state._timerInterval = null;
        }
    },

    bazaarCardCount: function() {
        return this.state.bazaar.filter(function(c) { return c !== null; }).length;
    },

    totalYarn: function(player) {
        var total = 0;
        var bowl = (player || this.state.player).yarnBowl;
        CARDS.COLORS.forEach(function(c) { total += bowl[c]; });
        return total;
    },

    /**
     * Session 9: Get the file path for a player's board image.
     * @param {string} characterId
     * @returns {string} image path
     */
    getPlayerBoardImage: function(characterId) {
        // Session 20: Use blank boards — action icons are now overlaid by UI
        var map = {
            rebecca: 'rebecca_blank.png',
            theo:    'theo_blank.png',
            derrick: 'derrick_blank.png',
            amara:   'amara_blank.png',
            neeha:   'neeha_blank.png',
            alex:    'alex_blank.png',
            ted:     'ted_blank.png',
            eliza:   'eliza_blank.png',
            // Session 13: Magic Socks expansion characters
            jo:      'jo_blank.png',
            noah:    'noah_blank.png',
            irene:   'irene_blank.png',
            mauro:   'mauro_blank.png',
            // Session 36: Hank boss uses his full solo-board art (not a blank board —
            // the human never selects on it, so no action-icon overlay is drawn).
            hank:    'AR_Hank_SoloBoard.png',
        };
        return 'Player Boards PNG/' + (map[characterId] || map.rebecca);
    },


    /* =========================================================
       SESSION 8c: END-GAME TRIGGER & SCORING
       Game ends when Project Deck is empty AND fewer than 3
       projects remain in the display.
       ========================================================= */

    /**
     * Check if the end-game condition is met.
     * @returns {boolean} true if game should end after the current turn
     */
    isGameOver: function() {
        return this.state.projectDeck.length === 0 &&
               this.state.projectDisplay.length < 3;
    },

    /**
     * Check if end-game should trigger and set state accordingly.
     * Called after completing a project (the only way display shrinks).
     * Sets finalRound flag and records which player triggered it.
     */
    checkEndGameTrigger: function() {
        if (!this.state.finalRound && this.isGameOver()) {
            this.state.finalRound = true;
            this.state.endGameTriggerPlayer = this.state.activePlayerIndex;
        }
    },

    /**
     * Calculate the final score for a player.
     * Scoring categories:
     *   + Crafted items (regular finished objects) — each item's points
     *   + Crafted Special Requests — each SR's points
     *   + Favorite SR bonus — +5 if any crafted SR is the character's favorite
     *   + Completed Projects — each project's points
     *   + Learned pattern tiles — +5 each
     *   - Unfinished SRs (held but not crafted) — -5 each
     *   - Leftover yarn — -1 per yarn in bowl
     * @param {Object} [player] — player object (defaults to state.player)
     * @returns {Object} { items, specialRequests, favoriteBonus, projects,
     *                     learnedTiles, srPenalty, yarnPenalty, total, breakdown }
     */
    calculateFinalScore: function(player) {
        player = player || this.state.player;

        // Session 15: Build crafted items detail — group by id with counts
        var itemsPoints = 0;
        var itemCounts = {};  // { id: { id, name, img, points, count } }
        player.items.forEach(function(item) {
            itemsPoints += item.points;
            if (!itemCounts[item.id]) {
                itemCounts[item.id] = { id: item.id, name: item.name, img: item.img, points: item.points, count: 0 };
            }
            itemCounts[item.id].count++;
        });
        var craftedItemDetails = [];
        // Canonical display order: hat, mittens, bear, scarf, blanket
        ['hat', 'mittens', 'bear', 'scarf', 'blanket'].forEach(function(id) {
            if (itemCounts[id]) craftedItemDetails.push(itemCounts[id]);
        });

        // Session 15: Build SR detail — both crafted and uncrafted
        var srPoints = 0;
        var favoriteBonus = 0;
        var srCardDetails = [];
        var srCraftedCount = 0;
        var srTotalCount = player.craftedSpecialRequests.length + player.specialRequests.length;
        player.craftedSpecialRequests.forEach(function(sr) {
            srPoints += sr.points;
            // Session 36: Hank boss — EVERY SR is his favorite → +5 for each one he completes.
            // Normal players get the +5 once if their single favorite SR is among the crafted.
            if (player.isHank) favoriteBonus += 5;
            else if (sr.isFavorite) favoriteBonus = 5;
            srCraftedCount++;
            srCardDetails.push({
                name: sr.name, img: sr.img, points: sr.points,
                completed: true, isFavorite: player.isHank ? true : sr.isFavorite,
            });
        });
        player.specialRequests.forEach(function(sr) {
            srCardDetails.push({
                name: sr.name, img: sr.img, points: -(sr.points || 0),
                completed: false, isFavorite: sr.isFavorite,
            });
        });

        // Session 15: Build project detail
        var projectPoints = 0;
        var projectDetails = [];
        player.projects.forEach(function(proj) {
            projectPoints += proj.points;
            projectDetails.push({ name: proj.name, img: proj.img, points: proj.points });
        });

        // Learned pattern tiles — per-item crafting cost (Bear=3, Mittens=3, Scarf=4)
        // Session 15: Fixed from flat +5 to per-item values using item's yarnCount
        var learnedPoints = 0;
        var learnedTileDetails = [];
        player.patternTiles.forEach(function(tile) {
            var itemDef = CARDS.getItem(tile.itemId);
            var tilePts = (tile.learned && itemDef) ? itemDef.yarnCount : 0;
            if (tile.learned) learnedPoints += tilePts;
            learnedTileDetails.push({
                itemId:  tile.itemId,
                tileId:  tile.id,
                learned: tile.learned,
                points:  tilePts,
                img:     tile.img,
                backImg: tile.backImg,
            });
        });

        // Unfinished SR penalty (lose the SR's own point value for each uncrafted)
        var srPenalty = 0;
        player.specialRequests.forEach(function(sr) {
            srPenalty -= (sr.points || 0);
        });

        // Leftover yarn penalty (-1 per yarn).
        // Session 36: Hank boss inverts this — leftover yarn SCORES +1 per 2 (odd one rounds
        // down), so hoarding helps him. "yarnPenalty" then holds a positive bonus for Hank.
        var yarnPenalty = 0;
        if (player.isHank) {
            var leftover = 0;
            CARDS.COLORS.forEach(function(c) { leftover += (player.yarnBowl[c] || 0); });
            yarnPenalty = Math.floor(leftover / 2);
        } else {
            CARDS.COLORS.forEach(function(c) {
                yarnPenalty -= (player.yarnBowl[c] || 0);
            });
        }

        var total = itemsPoints + srPoints + favoriteBonus + projectPoints +
                    learnedPoints + srPenalty + yarnPenalty;

        return {
            items: itemsPoints,
            specialRequests: srPoints,
            favoriteBonus: favoriteBonus,
            favoriteWon: favoriteBonus > 0,
            projects: projectPoints,
            learnedTiles: learnedPoints,
            srPenalty: srPenalty,
            yarnPenalty: yarnPenalty,
            total: total,
            // Session 15: Detail data for enhanced scorecard
            srCount: srCraftedCount + '/' + srTotalCount,
            craftedItemDetails: craftedItemDetails,
            srCardDetails: srCardDetails,
            projectDetails: projectDetails,
            learnedTileDetails: learnedTileDetails,
        };
    },


    /* =========================================================
       SESSION 7: PROJECT DECK
       ========================================================= */

    /**
     * Get total project count based on player count.
     * @param {number} playerCount — 2–6
     * @returns {number} Total projects in deck (8, 9, or 10)
     */
    getTotalProjectCount: function(playerCount) {
        return playerCount <= 2 ? 8 : playerCount === 3 ? 9 : 10;
    },

    /**
     * Build and shuffle the project deck, then deal 3 face-up.
     * Called from init().
     */
    initProjects: function() {
        var deck = CARDS.buildProjectDeck();

        // Project count scales with player count
        var totalProjects = this.getTotalProjectCount(this.state.playerCount);
        // Trim deck to target count (already shuffled by buildProjectDeck)
        deck = deck.slice(0, totalProjects);

        // Deal up to 3 face-up
        this.state.projectDisplay = deck.splice(0, 3);
        this.state.projectDeck    = deck;
    },

    /**
     * Check if the player can afford to complete a given project.
     * Requirements specify itemId → count needed.
     * @param {Object} project — project card object
     * @returns {boolean}
     */
    canAffordProject: function(project) {
        var items = this.state.player.items;
        var reqs = project.requirements;

        return Object.keys(reqs).every(function(itemId) {
            var needed = reqs[itemId];
            var have = items.filter(function(it) { return it.id === itemId; }).length;
            return have >= needed;
        });
    },

    /**
     * Complete a project: remove required items from Finished Objects,
     * score points, remove project from display, draw new one from deck.
     * @param {string} projectUid — uid of the project to complete
     * @returns {number|null} points earned, or null if invalid
     */
    finishProject: function(projectUid) {
        // Guard: must be in restock phase (projects can't be finished during finalCraft)
        if (this.state.phase !== 'restock') {
            console.error('finishProject: wrong phase "' + this.state.phase + '", expected "restock"');
            return null;
        }

        var display = this.state.projectDisplay;
        var projIdx = display.findIndex(function(p) { return p.uid === projectUid; });
        if (projIdx === -1) {
            console.error('finishProject: project not found in display (uid: ' + projectUid + ')');
            return null;
        }

        var project = display[projIdx];
        if (!this.canAffordProject(project)) return null;

        var items = this.state.player.items;
        var reqs = project.requirements;

        // Remove required items from Finished Objects (one pass per type)
        Object.keys(reqs).forEach(function(itemId) {
            var needed = reqs[itemId];
            var removed = 0;
            for (var i = items.length - 1; i >= 0 && removed < needed; i--) {
                if (items[i].id === itemId) {
                    items.splice(i, 1);
                    removed++;
                }
            }
        });

        // Score points on the project (stored on player.projects for end-game tally)
        this.state.player.projects.push({
            uid:    project.uid,
            id:     project.id,
            name:   project.name,
            img:    project.img,
            points: project.points,
        });

        // Remove project from display, draw replacement if available
        display.splice(projIdx, 1);
        if (this.state.projectDeck.length > 0) {
            display.splice(projIdx, 0, this.state.projectDeck.shift());
        }

        // Session 18: Log project completion for turn history
        var reqParts = [];
        Object.keys(reqs).forEach(function(itemId) {
            var def = CARDS.getItem(itemId);
            var itemName = def ? def.name : itemId;
            reqParts.push(reqs[itemId] + ' ' + itemName);
        });
        this._logAction('Finished Project: ' + project.name + ' (' + project.points + ' pts) — turned in ' + reqParts.join(', '), 'project');

        // Check if this triggers end-game (unfillable project slot)
        this.checkEndGameTrigger();

        return project.points;
    },

    /**
     * Get all projects in the display that the player can currently complete.
     * @returns {Array} subset of state.projectDisplay
     */
    getCompletableProjects: function() {
        return this.state.projectDisplay.filter(function(p) {
            return Game.canAffordProject(p);
        });
    },


    /* =========================================================
       SESSION 7: LEARN A PATTERN
       Free Restock action — flip a tile to its general (learned) side.
       Requires at least one unlearned tile.
       ========================================================= */

    /**
     * Get all tiles that can still be learned (not yet flipped).
     * Rule (corrected Session 8): the player must also have the corresponding
     * finished object in player.items — that item is consumed when learning.
     * @returns {Array} tile objects with learned === false AND matching item held
     */
    getLearnablePatterns: function() {
        var items = this.state.player.items;
        return this.state.player.patternTiles.filter(function(t) {
            if (t.learned) return false;
            // Must hold a matching crafted item to trade in
            return items.some(function(item) { return item.id === t.itemId; });
        });
    },

    /**
     * Learn a pattern tile: flip it to the general side.
     * Consumes the first matching item from player.items (the trade-in cost).
     * @param {string} tileId — id of the tile to learn
     * @returns {boolean} true if successful
     */
    learnPattern: function(tileId) {
        // Guard: must be in restock phase
        if (this.state.phase !== 'restock') {
            console.error('learnPattern: wrong phase "' + this.state.phase + '"');
            return false;
        }

        var tile = this.state.player.patternTiles.find(function(t) { return t.id === tileId; });
        if (!tile || tile.learned) return false;

        // Find and remove the matching item from Finished Objects
        var items = this.state.player.items;
        var itemIdx = -1;
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === tile.itemId) { itemIdx = i; break; }
        }
        if (itemIdx === -1) return false;  // no item to trade in — shouldn't happen

        items.splice(itemIdx, 1);
        tile.learned = true;

        // Session 18: Log pattern learning for turn history
        var itemDef = CARDS.getItem(tile.itemId);
        var tileName = itemDef ? itemDef.name : tile.itemId;
        this._logAction('Learned Pattern: ' + tileName + ' (traded in 1 ' + tileName + ')');

        return true;
    },


    /* =========================================================
       SESSION 7: FROG IT
       Free Restock action — return a crafted item and get yarn back.
       Unlearned exact pattern: get back exact yarn spent.
       Learned/general pattern: player chooses equivalent yarn.
       ========================================================= */

    /**
     * Get all regular crafted items that can be frogged.
     * (Only regular items — not Special Requests, not Project items.)
     * @returns {Array} items array with index
     */
    getFrogItItems: function() {
        return this.state.player.items.map(function(item, idx) {
            return { item: item, index: idx };
        });
    },

    /**
     * Execute Frog It: remove item at index, return yarn to bowl.
     * For exact (unlearned) items: yarnToReceive is the stored yarnSpent.
     * For general (learned) items: yarnToReceive is player's chosen equivalent.
     * @param {number} itemIndex    — index into player.items
     * @param {Object} yarnToReceive — { color: count } to add back to bowl
     * @returns {string[]|null} changed color names, or null if invalid
     */
    frogIt: function(itemIndex, yarnToReceive) {
        // Guard: must be in restock phase
        if (this.state.phase !== 'restock') {
            console.error('frogIt: wrong phase "' + this.state.phase + '"');
            return null;
        }

        var items = this.state.player.items;
        if (itemIndex < 0 || itemIndex >= items.length) return null;

        var item = items[itemIndex];
        var bowl = this.state.player.yarnBowl;

        // Validate the yarn counts match item's yarnCount
        var totalReceive = 0;
        Object.keys(yarnToReceive).forEach(function(c) { totalReceive += yarnToReceive[c]; });
        if (totalReceive !== item.yarnCount) return null;

        // Remove the item
        items.splice(itemIndex, 1);

        // Add yarn back to bowl
        var changed = [];
        Object.keys(yarnToReceive).forEach(function(c) {
            bowl[c] = (bowl[c] || 0) + yarnToReceive[c];
            if (changed.indexOf(c) === -1) changed.push(c);
        });

        // Session 18: Log frog it for turn history
        var frogParts = [];
        CARDS.COLORS.forEach(function(c) {
            if (yarnToReceive[c]) frogParts.push(yarnToReceive[c] + ' ' + c);
        });
        this._logAction('Frogged ' + item.name + ' → got back ' + frogParts.join(', '));

        return changed;
    },
};
