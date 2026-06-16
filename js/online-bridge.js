/**
 * ArchRavels Online — Client Bridge
 * ====================================
 * Bridges between the existing UI layer (which calls Game.* methods
 * and reads Game.state) and the network layer (which sends actions
 * to the server and receives state updates).
 *
 * When online mode is active:
 *   - Game action methods are overridden to send to the server
 *   - Game.state is updated from server broadcasts
 *   - UI.renderAll() is triggered on each state update
 *   - The setup screen is skipped (lobby handles setup)
 *   - Pass-device interstitials are skipped (each player has their own screen)
 *
 * Load order: cards.js → game.js → ai.js → ui.js → network.js → online-bridge.js
 */

var OnlineBridge = {

    active: false,
    mySeatIndex: -1,
    roomCode: '',
    isHost: false,
    myName: '',
    players: [],     // Room player list from server

    /**
     * Initialize online mode. Called when index.html loads with ?online=true
     * and sessionStorage has the initial game state from the lobby.
     */
    init: function() {
        // Check if we should be in online mode
        var params = new URLSearchParams(window.location.search);
        if (!params.has('online')) return false;

        // Get stored state from lobby redirect
        var stored = sessionStorage.getItem('ar_online_state');
        if (!stored) {
            console.error('[OnlineBridge] No stored state from lobby');
            window.location.href = 'lobby.html';
            return false;
        }

        var data = JSON.parse(stored);
        this.mySeatIndex = data.mySeatIndex;
        this.roomCode = data.roomCode;
        this.isHost = data.isHost;
        this.myName = data.myName;
        this.players = data.players;
        this.active = true;

        console.log('[OnlineBridge] Initializing online mode. Seat:', this.mySeatIndex, 'Room:', this.roomCode);

        // Connect to server and mark as online
        Network.connect();
        Network.isOnline = true;
        Network.mySeatIndex = this.mySeatIndex;
        Network.roomCode = this.roomCode;
        Network.isHost = this.isHost;
        Network.myName = this.myName;

        // Wait for connection, then rejoin room
        var self = this;
        var checkInterval = setInterval(function() {
            if (Network.connected) {
                clearInterval(checkInterval);
                self._rejoinAndSync();
            }
        }, 100);

        // CRITICAL: Also rejoin on every reconnection (socket may drop and get new ID)
        Network.socket.on('connect', function() {
            console.log('[OnlineBridge] Socket reconnected — rejoining room...');
            self._rejoinAndSync();
        });

        // Wire up network callbacks
        Network.onGameState = function(gameState, activePlayerIndex, phase) {
            self._applyServerState(gameState);
        };

        Network.onGameOver = function(scores, gameState) {
            self._applyServerState(gameState);
            // Game over modal will show via the normal UI flow since phase = 'gameOver'
        };

        Network.onPlayerDisconnected = function(players) {
            self.players = players;
            console.log('[OnlineBridge] Player disconnected');
            // TODO: show disconnection indicator
        };

        // Apply initial state from lobby
        this._applyServerState(data.gameState);

        // Override Game methods for online play
        this._patchGameMethods();

        return true;
    },

    /**
     * Rejoin the room after page redirect.
     * The server tracks us by socket ID, so we need to re-establish our seat.
     */
    _rejoinAndSync: function() {
        var self = this;
        // Rejoin the room to re-establish our socket mapping
        Network.joinRoom(this.roomCode, this.myName, function(result) {
            if (result.error) {
                console.error('[OnlineBridge] Rejoin failed:', result.error);
                return;
            }

            if (result.reconnected) {
                console.log('[OnlineBridge] Reconnected to active game! Seat:', result.seatIndex);
                self.mySeatIndex = result.seatIndex;
                Network.mySeatIndex = result.seatIndex;

                // Apply the fresh game state from server
                if (result.gameState) {
                    self._applyServerState(result.gameState);
                }
            } else {
                console.log('[OnlineBridge] Joined room. Seat:', result.seatIndex);
                self.mySeatIndex = result.seatIndex;
                Network.mySeatIndex = result.seatIndex;
            }
        });
    },

    /**
     * Apply a server state snapshot to the local Game.state.
     * This overwrites the local state and triggers a UI re-render.
     */
    _applyServerState: function(serverState) {
        if (!serverState) return;

        var gs = Game.state;

        // Core state
        gs.bazaar = serverState.bazaar || gs.bazaar;
        gs.phase = serverState.phase || gs.phase;
        // Don't overwrite selectedSlots during playerActions — those are local UI state
        // Only sync from server on phase changes (restock, chooseSpace, etc.)
        if (gs.phase !== 'playerActions') {
            gs.selectedSlots = new Set(serverState.selectedSlots || []);
        }

        // Deck/discard (we only get counts from server to prevent cheating)
        if (serverState.deck) {
            // Maintain a dummy deck of the right length for UI deck counter
            while (gs.deck.length < serverState.deck.count) gs.deck.push({});
            while (gs.deck.length > serverState.deck.count) gs.deck.pop();
        }
        if (serverState.discard) {
            while (gs.discard.length < serverState.discard.count) gs.discard.push({});
            while (gs.discard.length > serverState.discard.count) gs.discard.pop();
        }

        // Turn info
        if (serverState.turn) {
            gs.turn = serverState.turn;
        }
        gs.shopLimit = serverState.shopLimit !== undefined ? serverState.shopLimit : gs.shopLimit;
        gs.craftLimit = serverState.craftLimit !== undefined ? serverState.craftLimit : gs.craftLimit;
        gs.hasExchange = serverState.hasExchange !== undefined ? serverState.hasExchange : gs.hasExchange;
        gs.characterId = serverState.characterId || gs.characterId;

        // Multiplayer
        gs.playerCount = serverState.playerCount || gs.playerCount;
        gs.activePlayerIndex = serverState.activePlayerIndex !== undefined ? serverState.activePlayerIndex : gs.activePlayerIndex;
        gs.finalRound = !!serverState.finalRound;

        // Players
        if (serverState.players) {
            gs.players = serverState.players;
            gs.player = gs.players[gs.activePlayerIndex];
        }

        // Special flags
        gs.pendingTake3Yarn = !!serverState.pendingTake3Yarn;
        gs.pendingTake5Any = !!serverState.pendingTake5Any;
        gs.craftAnyColors = !!serverState.craftAnyColors;
        gs.makeTwoItems = !!serverState.makeTwoItems;

        // History
        gs.turnHistory = serverState.turnHistory || gs.turnHistory;
        gs._currentTurnLog = serverState._currentTurnLog || gs._currentTurnLog;

        // Projects
        if (serverState.projectDeck) {
            while (gs.projectDeck.length < serverState.projectDeck.count) gs.projectDeck.push({});
            while (gs.projectDeck.length > serverState.projectDeck.count) gs.projectDeck.pop();
        }
        gs.projectDisplay = serverState.projectDisplay || gs.projectDisplay;

        // Trigger full re-render
        UI.renderAll();

        // Update turn indicator for online play
        this._updateTurnIndicator();
    },

    /**
     * Show whose turn it is and whether it's the local player's turn.
     */
    _updateTurnIndicator: function() {
        var gs = Game.state;
        var activePlayer = gs.players[gs.activePlayerIndex];
        if (!activePlayer) return;

        var isMyTurn = (gs.activePlayerIndex === this.mySeatIndex);
        var navPlayerName = document.getElementById('navPlayerName');
        var navPhase = document.getElementById('navPhase');

        if (navPlayerName) {
            if (isMyTurn) {
                navPlayerName.textContent = 'Your Turn';
                navPlayerName.style.color = '#4CAF50';
            } else if (activePlayer.isAI) {
                navPlayerName.textContent = activePlayer.name + ' (thinking...)';
                navPlayerName.style.color = '#FF9800';
            } else {
                navPlayerName.textContent = 'Waiting for ' + activePlayer.name + '...';
                navPlayerName.style.color = '#888';
            }
        }
    },

    /**
     * Override Game action methods to send actions to the server
     * instead of executing locally.
     */
    _patchGameMethods: function() {
        var self = this;

        // Store originals (in case we need to fall back)
        Game._original = {
            chooseActionSpace: Game.chooseActionSpace,
            applyShopChoices: Game.applyShopChoices,
            craft: Game.craft,
            exchange: Game.exchange,
            endPlayerActions: Game.endPlayerActions,
            takeSpecialRequest: Game.takeSpecialRequest,
            finishProject: Game.finishProject,
            learnPattern: Game.learnPattern,
            frogIt: Game.frogIt,
            applyTake3Yarn: Game.applyTake3Yarn,
            applyTake5Any: Game.applyTake5Any,
            endTurn: Game.endTurn,
            restockBazaar: Game.restockBazaar,
            toggleSlotSelection: Game.toggleSlotSelection,
        };

        // Override: undoSpaceChoice
        Game.undoSpaceChoice = function() {
            if (!self._isMyTurn()) return;
            Network.sendAction('undoSpaceChoice');
        };

        // Override: chooseActionSpace
        Game.chooseActionSpace = function(spaceIndex) {
            if (!self._isMyTurn()) return;
            Network.sendAction('chooseSpace', { spaceIndex: spaceIndex });
        };

        // Override: toggleSlotSelection (for shop multi-select)
        // Keep this PURELY LOCAL — slot selection is just UI state.
        // The actual shop is committed via applyShopChoices which sends slot indices.
        // Don't send to server (avoids state broadcast overwriting selections).
        Game.toggleSlotSelection = function(index) {
            if (Game.state.selectedSlots.has(index)) {
                Game.state.selectedSlots.delete(index);
            } else {
                Game.state.selectedSlots.add(index);
            }
            UI.renderBazaar();
        };

        // Override: applyShopChoices
        // Returns [] (empty changed-colors array) — server state broadcast will re-render everything
        Game.applyShopChoices = function(normalYarn, wildChoices, slotIndices) {
            if (!self._isMyTurn()) return [];
            Network.sendAction('applyShopChoices', {
                normalYarn: normalYarn,
                wildChoices: wildChoices,
                slotIndices: slotIndices,
            });
            return [];  // UI passes this to renderYarnBowl(changedColors) — needs to be an array
        };

        // Override: craft
        // Returns [] — UI passes return value to renderYarnBowl
        Game.craft = function(itemId, yarnToSpend) {
            if (!self._isMyTurn()) return [];
            Network.sendAction('craft', { itemId: itemId, yarnToSpend: yarnToSpend });
            return [];
        };

        // Override: exchange
        // Returns [] — UI passes return value to renderYarnBowl
        Game.exchange = function(give, receive) {
            if (!self._isMyTurn()) return [];
            Network.sendAction('exchange', { give: give, receive: receive });
            return [];
        };

        // Override: endPlayerActions
        Game.endPlayerActions = function() {
            if (!self._isMyTurn()) return;
            Network.sendAction('endPlayerActions');
        };

        // Override: takeSpecialRequest
        Game.takeSpecialRequest = function(card, playerIndex) {
            if (!self._isMyTurn()) return;
            Network.sendAction('takeSpecialRequest', {
                card: card,
                playerIndex: playerIndex,
            });
        };

        // Override: finishProject
        Game.finishProject = function(projectUid) {
            if (!self._isMyTurn()) return 0;
            Network.sendAction('finishProject', { projectUid: projectUid });
            return 0;  // UI expects points (number)
        };

        // Override: learnPattern
        Game.learnPattern = function(tileId) {
            if (!self._isMyTurn()) return true;
            Network.sendAction('learnPattern', { tileId: tileId });
            return true;
        };

        // Override: frogIt
        // Returns [] — UI passes return value to renderYarnBowl
        Game.frogIt = function(itemIndex, yarnToReceive) {
            if (!self._isMyTurn()) return [];
            Network.sendAction('frogIt', {
                itemIndex: itemIndex,
                yarnToReceive: yarnToReceive,
            });
            return [];
        };

        // Override: applyTake3Yarn
        // Returns [] — UI passes return value to renderYarnBowl
        Game.applyTake3Yarn = function(color) {
            if (!self._isMyTurn()) return [];
            Network.sendAction('applyTake3Yarn', { color: color });
            return [];
        };

        // Override: applyTake5Any
        // Returns [] — UI passes return value to renderYarnBowl
        Game.applyTake5Any = function(colors) {
            if (!self._isMyTurn()) return [];
            Network.sendAction('applyTake5Any', { colors: colors });
            return [];
        };

        // Override: restockBazaar — no longer called directly; UI.onRestock is overridden below
        Game.restockBazaar = function() {
            // In online mode, restocking is handled by the UI.onRestock override
            // which sends to server and processes the response asynchronously
            return [];
        };

        // Override: resolveRestockCard
        Game.resolveRestockCard = function(slotIndex, card) {
            Network.sendAction('resolveRestockCard', { slotIndex: slotIndex, card: card });
        };

        // Override: applyEventEffect — this is called LOCALLY by showEventModal to get
        // the event type info (needsInput, inputType). We DON'T send this to the server
        // because it's a read-only query. The original method just returns event info
        // based on card.effect — no state mutation. Keep original for local use.
        // (Game._original.applyEventEffect is stored but we don't override it)

        // Override: event resolution methods
        Game.applyTangledCat = function(playerIndex) {
            Network.sendAction('applyTangledCat', { playerIndex: playerIndex });
        };

        Game.applyYarnSale = function(colors) {
            Network.sendAction('applyYarnSale', { colors: colors });
            return [];  // UI passes to renderYarnBowl
        };

        Game.applyDonate = function(color, toPlayerIndex) {
            Network.sendAction('applyDonate', { color: color, toPlayerIndex: toPlayerIndex });
            return [];
        };

        Game.applyFriendlyClerk = function(playerIndex, color) {
            Network.sendAction('applyFriendlyClerk', { playerIndex: playerIndex, color: color });
            return [];
        };

        Game.craftCircleItem = function(itemId, srUid, yarnToSpend, playerIndex) {
            Network.sendAction('craftCircleItem', {
                itemId: itemId,
                srUid: srUid,
                yarnToSpend: yarnToSpend,
                playerIndex: playerIndex,
            });
            return [];
        };

        // Override: craftSpecialRequest
        Game.craftSpecialRequest = function(srUid, yarnToSpend) {
            if (!self._isMyTurn()) return [];
            Network.sendAction('craftSpecialRequest', { srUid: srUid, yarnToSpend: yarnToSpend });
            return [];
        };

        // Override: endTurn
        Game.endTurn = function() {
            if (!self._isMyTurn()) return;
            Network.sendAction('endTurn');
        };

        // Override: endFinalCraft
        Game.endFinalCraft = function() {
            Network.sendAction('endFinalCraft');
        };

        // Override: init — no-op in online mode (server initializes the game)
        Game.init = function() {
            console.log('[OnlineBridge] Game.init called in online mode — skipping (server handles init)');
        };

        // Override: showPassDevice — no-op in online mode
        Game.render.showPassDevice = function() {
            console.log('[OnlineBridge] Pass device skipped in online mode');
        };

        // ============================================
        // Override UI.onRestock for async server flow
        // ============================================
        // The local onRestock calls Game.restockBazaar() synchronously and processes
        // the returned revealed array. In online mode, we send restockBazaar to the
        // server, get back the revealed events/SRs in the response, and then process
        // them through the same _processRestockQueue flow.
        UI.onRestock = function() {
            if (Game.state.phase !== 'restock') return;
            UI._restockDone = true;

            Network.sendAction('restockBazaar', {}, function(result) {
                if (!result || result.error) {
                    console.error('[OnlineBridge] restockBazaar failed:', result ? result.error : 'no response');
                    return;
                }

                var revealed = result.revealed || [];

                if (revealed.length > 0) {
                    // Process events/SRs through the existing queue system
                    UI._processRestockQueue(revealed, 0, function() {
                        UI.renderBazaar();
                        UI.renderCraftGrid();
                        UI.renderSpecialRequests();
                        UI.renderFinishedObjects();
                        UI.renderProjectStrip();
                        UI.renderActionBar();
                    });
                } else {
                    // No events — just re-render
                    UI.renderBazaar();
                    UI.renderActionBar();
                }
            });
        };
    },

    /**
     * Check if it's the local player's turn.
     * Shows a gentle indicator if it's not.
     */
    _isMyTurn: function() {
        var isMyTurn = Game.state.activePlayerIndex === this.mySeatIndex;
        if (!isMyTurn) {
            console.log('[OnlineBridge] Not your turn — action blocked');
        }
        return isMyTurn;
    },

    /**
     * Get helper methods (for UI, getAvailableActions still works since
     * it reads from Game.state which we keep updated)
     */
};

/**
 * Auto-initialize on page load if ?online=true is present.
 * This runs after UI.init() has set up the DOM and render delegates.
 */
(function() {
    var originalUIInit = UI.init;
    UI.init = function() {
        // Call original UI.init first (sets up DOM, render delegates, shows setup screen)
        originalUIInit.call(UI);

        // Then check for online mode
        if (OnlineBridge.init()) {
            // We're in online mode — hide the setup screen, show the game
            var setupModal = document.getElementById('setupModal');
            if (setupModal) setupModal.style.display = 'none';

            // Update edition label
            var editionEl = document.getElementById('navEdition');
            if (editionEl) {
                editionEl.textContent = 'ONLINE · Room ' + OnlineBridge.roomCode;
            }

            console.log('[OnlineBridge] Online mode active. Room:', OnlineBridge.roomCode);
        }
    };
})();
