/**
 * ArchRavels Online — Client Network Layer
 * ==========================================
 * Manages the WebSocket connection to the game server.
 * Bridges between server events and the existing UI layer.
 *
 * In local mode (no server), the game runs exactly as before.
 * In online mode, this module:
 *   - Connects to the server via Socket.io
 *   - Manages lobby (create/join rooms, character select)
 *   - Sends player actions to the server instead of calling Game.* directly
 *   - Receives state updates and feeds them to UI.* render functions
 *
 * Usage:
 *   Network.connect()           → connect to server
 *   Network.createRoom(name)    → create a room, returns code
 *   Network.joinRoom(code,name) → join existing room
 *   Network.sendAction(name, data) → send a game action
 */

var Network = {

    socket: null,
    connected: false,
    roomCode: null,
    mySeatIndex: -1,
    myName: '',
    isOnline: false,  // true when playing online, false for local play
    isHost: false,

    // Callbacks for UI integration
    onLobbyUpdate: null,     // function(players)
    onGameStarted: null,     // function(gameState, players)
    onGameState: null,        // function(gameState)
    onGameOver: null,         // function(scores, gameState)
    onPlayerDisconnected: null, // function(players)
    onConnectionError: null,  // function(error)

    /**
     * Connect to the game server.
     * Uses the current page's origin by default (works for both dev and production).
     */
    // Visible debug log (writes to #debugLog if it exists on the page)
    _log: function(msg) {
        console.log('[Network] ' + msg);
        var el = document.getElementById('debugLog');
        if (el) el.textContent += msg + '\n';
    },

    connect: function(serverUrl) {
        if (this.socket) {
            this.socket.disconnect();
        }

        this._log('connect() called');

        // Check if Socket.io client is loaded
        if (typeof io === 'undefined') {
            this._log('ERROR: io is undefined! Socket.io client not loaded.');
            if (this.onConnectionError) this.onConnectionError('Socket.io library not loaded');
            return;
        }

        this._log('io() exists: ' + typeof io);

        var url = serverUrl || window.location.origin;
        this._log('Target: ' + url);

        try {
            this.socket = io(url, {
                transports: ['polling', 'websocket'],
                reconnectionAttempts: 5,
                timeout: 10000,
            });
            this._log('io() socket created OK');
        } catch(e) {
            this._log('ERROR creating socket: ' + e.message);
            return;
        }

        var self = this;

        this.socket.on('connect', function() {
            self._log('CONNECTED! id=' + self.socket.id);
            self.connected = true;
        });

        this.socket.on('disconnect', function(reason) {
            self._log('Disconnected: ' + reason);
            self.connected = false;
        });

        this.socket.on('connect_error', function(err) {
            self._log('Connect error: ' + err.message);
            if (self.onConnectionError) self.onConnectionError(err.message);
        });

        // --- Lobby events ---
        this.socket.on('lobby-update', function(data) {
            console.log('[Network] Lobby update:', data.players.length, 'players');
            if (self.onLobbyUpdate) self.onLobbyUpdate(data.players);
        });

        // --- Game events ---
        this.socket.on('game-started', function(data) {
            console.log('[Network] Game started!');
            self.isOnline = true;
            if (self.onGameStarted) self.onGameStarted(data.gameState, data.players);
        });

        this.socket.on('game-state', function(data) {
            if (self.onGameState) self.onGameState(data.gameState, data.activePlayerIndex, data.phase);
        });

        this.socket.on('game-over', function(data) {
            console.log('[Network] Game over!');
            if (self.onGameOver) self.onGameOver(data.scores, data.gameState);
        });

        this.socket.on('player-disconnected', function(data) {
            console.log('[Network] Player disconnected');
            if (self.onPlayerDisconnected) self.onPlayerDisconnected(data.players);
        });
    },

    /**
     * Create a new room. Returns room code via callback.
     */
    createRoom: function(playerName, callback) {
        if (!this.connected) {
            callback({ error: 'Not connected to server' });
            return;
        }
        var self = this;
        this.myName = playerName;
        this.socket.emit('create-room', { playerName: playerName }, function(result) {
            if (result.success) {
                self.roomCode = result.code;
                self.mySeatIndex = 0;
                self.isHost = true;
                console.log('[Network] Created room:', result.code);
            }
            callback(result);
        });
    },

    /**
     * Join an existing room.
     */
    joinRoom: function(code, playerName, callback) {
        if (!this.connected) {
            callback({ error: 'Not connected to server' });
            return;
        }
        var self = this;
        this.myName = playerName;
        this.socket.emit('join-room', { code: code, playerName: playerName }, function(result) {
            if (result.success) {
                self.roomCode = code.toUpperCase();
                self.mySeatIndex = result.seatIndex;
                self.isHost = false;
                console.log('[Network] Joined room:', code.toUpperCase(), 'as seat', result.seatIndex);
            }
            callback(result);
        });
    },

    /**
     * Add an AI player to the room (host only).
     */
    addAI: function(name, callback) {
        this.socket.emit('add-ai', { name: name }, callback || function() {});
    },

    /**
     * Remove a player/AI seat (host only).
     */
    removeSeat: function(seatIndex, callback) {
        this.socket.emit('remove-seat', { seatIndex: seatIndex }, callback || function() {});
    },

    /**
     * Set character for self.
     */
    setCharacter: function(characterId, characterType, callback) {
        this.socket.emit('set-character', {
            characterId: characterId,
            characterType: characterType,
        }, callback || function() {});
    },

    /**
     * Set character for an AI seat (host only).
     */
    setAICharacter: function(seatIndex, characterId, characterType, callback) {
        this.socket.emit('set-ai-character', {
            seatIndex: seatIndex,
            characterId: characterId,
            characterType: characterType,
        }, callback || function() {});
    },

    /**
     * Start the game (host only).
     */
    startGame: function(callback) {
        this.socket.emit('start-game', callback || function() {});
    },

    /**
     * Send a game action to the server.
     * action: string like 'chooseSpace', 'craft', 'exchange', etc.
     * data: object with action-specific parameters
     */
    sendAction: function(action, data, callback) {
        if (!this.isOnline) {
            console.warn('[Network] Not in online mode');
            return;
        }
        // Include room code and player name with every action for resilient routing
        var payload = data || {};
        payload._roomCode = this.roomCode;
        payload._playerName = this.myName;
        payload._seatIndex = this.mySeatIndex;

        this.socket.emit('action:' + action, payload, callback || function(result) {
            if (result && result.error) {
                console.error('[Network] Action error:', result.error);
            }
        });
    },

    /**
     * Check if it's our turn based on last received state.
     */
    isMyTurn: function(activePlayerIndex) {
        return activePlayerIndex === this.mySeatIndex;
    },

    /**
     * Disconnect from server.
     */
    disconnect: function() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.isOnline = false;
        this.roomCode = null;
        this.mySeatIndex = -1;
    },
};
