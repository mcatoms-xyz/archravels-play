/* ui-extra.js — UI module (split from the Session-40 LIVE monolith).
   ui-core.js declares `var UI`; the other ui-*.js files extend it via Object.assign. */
Object.assign(UI, {
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
});



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


// Session 40: re-render the player strip on resize/orientation change so the
// "active card + menu" collapse toggles live when crossing the mobile breakpoint.
(function () {
    var t;
    function onResize() {
        clearTimeout(t);
        t = setTimeout(function () {
            if (window.Game && Game.state && Game.state.players && Game.state.players.length >= 2 &&
                typeof UI !== 'undefined' && UI.renderPlayerStrip) {
                UI.renderPlayerStrip();
            }
        }, 180);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
})();
