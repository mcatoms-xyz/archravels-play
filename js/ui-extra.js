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
        titleEl.innerHTML = '';
        if (character.banner) {
            // Pre-rendered character ribbon (name + subtitle + badge baked in) as a full-bleed header.
            if (headerEl) headerEl.classList.add('has-banner');
            var bannerImg = document.createElement('img');
            bannerImg.className = 'opp-banner-img';
            bannerImg.src = character.banner;
            bannerImg.alt = p.name + (p.isAI ? ' (CPU)' : '');
            titleEl.appendChild(bannerImg);
        } else {
            if (headerEl) headerEl.classList.remove('has-banner');
            var typeIcon = this._typeIcons[p.characterType] || '';
            if (typeIcon) {
                var iconImg = document.createElement('img');
                iconImg.src = typeIcon;
                iconImg.alt = p.characterType;
                titleEl.appendChild(iconImg);
            }
            var nameSpan = document.createElement('span');
            nameSpan.textContent = p.name + (p.isAI ? ' (CPU)' : '');
            titleEl.appendChild(nameSpan);
        }

        // --- Body ---
        var body = document.getElementById('opponentPanelBody');
        body.innerHTML = '';

        // 0. Character key art (portrait) — showcase the character.
        if (p.characterId) {
            var portrait = document.createElement('img');
            portrait.className = 'opp-portrait';
            portrait.src = 'story-assets/portraits/' + p.characterId + '.jpg';
            portrait.alt = p.name + ' key art';
            portrait.onerror = function () { this.style.display = 'none'; };
            body.appendChild(portrait);
        }

        // 1. Character info — no label (the banner already names the character).
        var charSection = this._oppSection('');
        var charInfo = document.createElement('div');
        charInfo.className = 'opp-last-space';
        charInfo.innerHTML = '<strong>' + character.name + '</strong> · ' +
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
        var bowl = document.createElement('div');
        bowl.className = 'opp-yarn-bowl';
        var yarnGrid = document.createElement('div');
        yarnGrid.className = 'opp-yarn-grid opp-yarn-arc';
        var yarnTotal = 0;
        var yarnOrder = UI._yarnBowlOrder || CARDS.COLORS;   // ROYGBP → two rows of 3
        yarnOrder.forEach(function(color) {
            var count = (p.yarnBowl && p.yarnBowl[color]) || 0;
            yarnTotal += count;
            var cell = document.createElement('div');
            cell.className = 'opp-yarn-cell';
            cell.title = color.charAt(0).toUpperCase() + color.slice(1) + ': ' + count;
            cell.setAttribute('aria-label', color.charAt(0).toUpperCase() + color.slice(1) + ': ' + count + ' yarn');
            cell.innerHTML =
                '<img class="opp-yarn-img" src="Wood Yarn Tokens PNG/' + color + '.png" alt="' + color + ' yarn">' +
                '<span class="opp-yarn-num">' + count + '</span>';
            // Session 48AD (Adam): back to two rows of three, no dip —
            // the tall bowl art holds them
            yarnGrid.appendChild(cell);
        });
        bowl.appendChild(yarnGrid);
        yarnSection.content.appendChild(bowl);
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
                card.className = 'opp-item-card opp-proj';
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
        if (label) {
            var labelEl = document.createElement('div');
            labelEl.className = 'opp-section-label';
            labelEl.textContent = label;
            section.appendChild(labelEl);
        }
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

        // Left color block = the color of whoever last took an action.
        var blockEl = document.getElementById('feedColorBlock');
        if (blockEl) {
            var lastColor = '';
            for (var k = feed.length - 1; k >= 0; k--) {
                if (feed[k].characterType) { lastColor = UI._typeAccentColors[feed[k].characterType] || ''; break; }
            }
            blockEl.style.background = lastColor || 'rgba(255,255,255,0.25)';
        }

        // Auto-scroll to show newest (rightmost) entry
        entriesEl.scrollLeft = entriesEl.scrollWidth;
    },

    /* =========================================================
       SESSION 13: TAKE 5 ANY COLORS MODAL
       Expert unique: player picks 5 yarn colors (repeats OK).
       ========================================================= */

    /** Temporary state for the Take5 picker */
    _take5: {},

    _take5Total: function() { var t = 0, s = this._take5; UI.ROYGBP.forEach(function(c) { t += s[c] || 0; }); return t; },

    showTake5Modal: function() {
        this._take5 = {};
        var modal = document.getElementById('take5Modal');
        if (!modal) return;
        this._buildTake5();
        modal.style.display = 'flex';
    },

    _buildTake5: function() {
        var grid = document.getElementById('take5ColorGrid');
        if (grid) {
            grid.innerHTML = '<div class="xc-help">Tap a color to add &middot; <span class="xc-x-ico">×</span> to clear</div>' +
                UI._yarnChips({ sel: this._take5, rule: 'any', need: 5, addFn: 'UI.onTake5Pick', clearFn: 'UI.onTake5Clear', lockCatNap: true });
            // Session 50: supply tray with count badges + minus zones
            grid.classList.add('ar-supply-tray');
            grid.classList.add('cp-count');
            grid.setAttribute('data-minus-fn', 'onTake5Minus');
        }
        this._updateTake5Display();
    },

    onTake5Minus: function(color) {
        if (this._take5 && this._take5[color]) {
            this._take5[color]--;
            if (!this._take5[color]) delete this._take5[color];
        }
        this._buildTake5();
    },

    onTake5Pick: function(color) {
        if (this._take5Total() >= 5) return;
        this._take5[color] = (this._take5[color] || 0) + 1;
        this._buildTake5();
    },

    onTake5Clear: function(color) { this._take5[color] = 0; this._buildTake5(); },

    onTake5Reset: function() { this._take5 = {}; this._buildTake5(); },

    onTake5Confirm: function() {
        if (this._take5Total() !== 5) return;
        var modal = document.getElementById('take5Modal');
        if (modal) modal.style.display = 'none';
        var arr = []; UI.ROYGBP.forEach(function(c) { var n = UI._take5[c] || 0; for (var i = 0; i < n; i++) arr.push(c); });
        var changed = Game.applyTake5Any(arr);
        this._take5 = {};
        UI.renderYarnBowl(changed); UI.renderCraftGrid(); UI.renderSpecialRequests(); UI.renderActionBar();
    },

    _updateTake5Display: function() {
        var total = this._take5Total();
        var picksDiv = document.getElementById('take5Picks');
        var confirmBtn = document.getElementById('take5ConfirmBtn');
        if (picksDiv) {
            picksDiv.innerHTML = '<div class="xc-balance' + (total === 5 ? ' ok' : '') + '"><span class="xc-tot">' + total + '</span> / 5 yarn' +
                (total === 5 ? '<span class="xc-hint ok">Ready ✓</span>' : '<span class="xc-hint">Pick ' + (5 - total) + ' more</span>') + UI._selectedYarnChips(UI._take5) + '</div>';
        }
        if (confirmBtn) { confirmBtn.disabled = total < 5; confirmBtn.textContent = 'Take 5'; }
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
        { id: 'yarnSaleModal', close: function() { UI._yarnSale = {}; UI._buildYarnSaleBody(); } },
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


/* =========================================================================
   Session 46: How-to-Play overlay + first-game coach mark + beat chip.
   Adam-blessed designs (b46 mockup rounds 1-8 + marker review rounds 1-7).
   ========================================================================= */
Object.assign(UI, {

    showHowToPlay: function(firstGame) {
        var ov = document.getElementById('howToPlayModal');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'howToPlayModal';
            ov.className = 'htp46-back';
            ov.innerHTML =
              '<div class="htp46">' +
                '<button class="htp46-x" aria-label="Close">&times;</button>' +
                '<div class="htp46-head"><h3>🧶 How to Play</h3><div class="htp46-sub">Out-craft your rivals at the Yarn Bazaar!</div></div>' +
                '<div class="htp46-grid">' +
                  '<div class="htp46-card">' +
                    '<img class="htp46-ghost" src="Other Images Textures Details/Icons - Action/Shop2.png" alt="">' +
                    '<div class="htp46-h">Shop for Yarn</div>' +
                    '<div class="htp46-d">Pick an action space &amp; take yarn from the Bazaar</div>' +
                    '<div class="htp46-art">' +
                      '<span class="htp46-stack"><img class="htp46-cardimg" src="Square Cards PNG/AR_YarnEvents_Final_0014_Orange2.png" alt=""><img class="htp46-cardimg htp46-over" src="Square Cards PNG/AR_YarnEvents_Final_0025_RedOrgYel.png" alt=""></span>' +
                      '<img class="htp46-flip" src="Other Assets/flip-arrow.svg" alt="">' +
                      '<span class="htp46-tri"><span class="htp46-trow"><img src="Wood Yarn Tokens PNG/red.png" alt=""><img src="Wood Yarn Tokens PNG/orange.png" alt=""></span><span class="htp46-trow"><img src="Wood Yarn Tokens PNG/yellow.png" alt=""><img src="Wood Yarn Tokens PNG/orange.png" alt=""><img src="Wood Yarn Tokens PNG/orange.png" alt=""></span></span>' +
                    '</div>' +
                  '</div>' +
                  '<div class="htp46-card">' +
                    '<img class="htp46-ghost" src="Other Images Textures Details/Icons - Action/Craft1.png" alt="">' +
                    '<div class="htp46-h">Craft Cozy Items</div>' +
                    '<div class="htp46-d">Spend yarn on patterns to craft items</div>' +
                    '<div class="htp46-art">' +
                      '<span class="htp46-tri"><span class="htp46-trow"><img src="Wood Yarn Tokens PNG/yellow.png" alt=""></span><span class="htp46-trow"><img src="Wood Yarn Tokens PNG/orange.png" alt=""><img src="Wood Yarn Tokens PNG/orange.png" alt=""></span></span>' +
                      '<img class="htp46-flip" src="Other Assets/flip-arrow.svg" alt="">' +
                      '<img class="htp46-token" src="Item Token PNG/Item_Tokens_Final_0002_mittens.png" alt="">' +
                    '</div>' +
                  '</div>' +
                  '<div class="htp46-card">' +
                    '<div class="htp46-h">Race to Finish Projects</div>' +
                    '<div class="htp46-d">Trade items to finish Projects before your rivals</div>' +
                    '<div class="htp46-art">' +
                      '<span class="htp46-istack"><img class="htp46-token" src="Item Token PNG/Item_Tokens_Final_0001_bear.png" alt=""><img class="htp46-token htp46-under" src="Item Token PNG/Item_Tokens_Final_0004_blanket.png" alt=""></span>' +
                      '<img class="htp46-flip" src="Other Assets/flip-arrow.svg" alt="">' +
                      '<img class="htp46-cardimg htp46-tall" src="Project Cards PNG/AR_ProjectCards_Mask_0013_Naptime.png" alt="">' +
                    '</div>' +
                  '</div>' +
                  '<div class="htp46-card">' +
                    '<div class="htp46-h">Hone Your Skills for Points!</div>' +
                    '<div class="htp46-d">Learn Patterns &amp; finish Special Requests</div>' +
                    '<div class="htp46-art htp46-hone">' +
                      '<span class="htp46-vcol"><img class="htp46-tile" src="Pattern Tiles PNG/AR_Pattern_Tiles_000_scarf-back.png" alt=""><span class="htp46-fliptxt">⟳</span><img class="htp46-tile" src="Pattern Tiles PNG/AR_Pattern_Tiles_0003_scarf-rogb.png" alt=""></span>' +
                      '<img class="htp46-cardimg htp46-sr" src="Square Cards PNG/AR_Special_Requests_Octopus.png" alt="">' +
                    '</div>' +
                  '</div>' +
                '</div>' +
                '<div class="htp46-win"><div class="htp46-wintext">Raveler with the most points when<br>the Project List runs out <b>WINS!</b><div class="htp46-warn">\u2026but don\u2019t hoard! Leftover yarn counts against your score.</div></div><div class="htp46-tag"><img src="Other Images Textures Details/Details and Borders/PointTag-CMYK.png" alt=""><span>67</span></div></div>' +
                '<button class="htp46-cta">Let’s Get Crafty!</button>' +
                '<div class="htp46-foot"><img src="Other Images Textures Details/AR_cat_meeple_GRAY_3D.png" alt=""> Watch out for events and the pesky Tangled Cat…</div>' +
                '<div class="htp46-again">Find this any time in the ☰ menu</div>' +
              '</div>';
            document.body.appendChild(ov);
            var close = function(){
                ov.classList.remove('open');
                ov._first = false;
                // Session 47q: closing How-to ALWAYS flows into the action-space
                // coach when the player is at a choose-space moment (contextual:
                // "you just read the rules — here's your board"). Not gated on
                // the seen-flag; the flag only controls the AUTO-show.
                try {
                    localStorage.setItem('ar_tour_seen', '1');
                    var inChoose = window.Game && Game.state &&
                        Game.state.phase === 'chooseSpace' &&
                        Game.state.player && !Game.state.player.isAI && !Game.state.player.isHank;
                    if (inChoose) {
                        setTimeout(function(){ if (UI.showActionTour) UI.showActionTour(); }, 300);
                    } else {
                        // not the player's choose moment yet — hand off to the
                        // next choose-space render (Session 48M, single-fire)
                        UI._tourPending = true;
                    }
                } catch (e) {}
            };
            ov.querySelector('.htp46-x').addEventListener('click', close);
            ov.querySelector('.htp46-cta').addEventListener('click', close);
            ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
        }
        ov._first = !!firstGame;
        ov.classList.add('open');
    },

    /* Session 48i: How-to-Play auto-show rule (Adam):
       1) first-ever game on this device, ANY mode, and
       2) EVERY Quick Play game unless the player is signed in.
       (Signed-in players know the game; booth iPads stay in teaching mode.) */
    maybeShowFirstGameHelp: function() {
        try {
            var firstEver = !localStorage.getItem('ar_htp_seen');
            var isStory = !!(window.Story && Story.storyGame);
            var signedIn = !!(window.Story && Story.currentUser);
            if (firstEver || (!isStory && !signedIn)) {
                localStorage.setItem('ar_htp_seen', '1');
                UI.showHowToPlay(true);
            }
        } catch (e) {}
    },

    /* =====================================================================
       Session 48: ACTION TOUR (Adam's design, replaces the static coach mark).
       The marker ANIMATES from space to space; a persistent box explains each
       space as it lands. Dwells ~2.6s, loops. Touch/hover a space to jump the
       marker + explanation there. Tap outside the highlighted zone to close.
       ===================================================================== */
    _tourSpaceCopy: function(sp) {
        var acts = [], notes = [];
        if (sp.shop) acts.push('take ' + sp.shop + ' yarn card' + (sp.shop > 1 ? 's' : '') + ' from the Bazaar');
        if (sp.unique === 'take3Yarn') acts.push('gain 3 yarn of one color right away');
        if (sp.unique === 'take5AnyCraft1Any') acts.push('take 5 yarn of ANY colors');
        if (sp.unique === 'take3Any') acts.push('gain 3 yarn of any colors');
        if (sp.craft) acts.push('craft up to ' + sp.craft + ' item' + (sp.craft > 1 ? 's' : ''));
        if (sp.exchange) acts.push('swap yarn colors with the supply');
        if (sp.unique === 'makeTwoItems') notes.push('Your crafted item comes out as TWO copies!');
        if (sp.unique === 'craftAnyColors' || sp.unique === 'take5AnyCraft1Any') notes.push('Patterns accept any colors.');
        if (!acts.length && !notes.length) return '';
        var s = acts.join(' and ');
        if (s) {
            s = s.charAt(0).toUpperCase() + s.slice(1);
            if (acts.length > 1) s += ', in any order you like';
            s += '.';
        }
        if (notes.length) s = (s ? s + ' ' : '') + notes.join(' ');
        return s;
    },

    showActionTour: function() {
        var grid = document.getElementById('actionGridOverlay');
        if (!grid || !grid.children.length) return;
        var gr = grid.getBoundingClientRect();
        if (!gr.width) return;
        var ch = Game.getCharacter && Game.getCharacter();
        if (!ch || !ch.actionSpaces) return;
        var mkFile = UI._actionMarkers[ch.type];
        if (!mkFile) return;

        var btns = [].slice.call(grid.children);
        var rects = btns.map(function(b){ return b.getBoundingClientRect(); });

        var dim = document.createElement('div');
        dim.className = 'cm46-dim';
        var hole = document.createElement('div');
        hole.className = 'cm46-hole';
        hole.style.left = (gr.left - 8) + 'px';
        hole.style.top = (gr.top - 8) + 'px';
        hole.style.width = (gr.width + 16) + 'px';
        hole.style.height = (gr.height + 16) + 'px';
        dim.appendChild(hole);

        // persistent explainer box (left of the grid, or above on narrow)
        var box = document.createElement('div');
        box.className = 'tour48-box';
        var bw = Math.min(310, window.innerWidth - 24);
        var bx = gr.left - bw - 20;
        var sideFits = bx >= 10;
        if (!sideFits) { bx = Math.max(10, gr.left + gr.width / 2 - bw / 2); }
        box.style.left = bx + 'px';
        if (sideFits) {
            box.style.top = Math.max(12, gr.top + gr.height * 0.12) + 'px';
        } else {
            // Session 48AI (Adam): mobile — ABOVE the grid, never covering it.
            // Only drop below if there's no headroom.
            var above = gr.top - 226;
            if (above < 12) above = Math.min(gr.top + gr.height + 14, window.innerHeight - 226);
            box.style.top = Math.max(12, above) + 'px';
        }
        box.style.maxWidth = bw + 'px';
        dim.appendChild(box);

        // touring marker
        var mk = document.createElement('img');
        mk.className = 'tour48-marker';
        mk.src = 'story-assets/markers/' + mkFile;
        mk.style.height = Math.round(gr.height * (UI._amSizeFactors[ch.type] || .4)) + 'px';
        dim.appendChild(mk);

        var cur = -1;
        function place(i, instant) {
            cur = i;
            var r = rects[i];
            var mh = mk.offsetHeight || Math.round(gr.height * .4);
            var mw = mk.offsetWidth || mh;
            if (instant) mk.style.transition = 'none'; else mk.style.transition = 'left .3s cubic-bezier(.34,1.45,.64,1), top .3s cubic-bezier(.34,1.45,.64,1)';
            mk.style.left = Math.round(r.left + r.width / 2 - mw / 2) + 'px';
            mk.style.top = Math.round(r.top + r.height / 2 - mh / 2) + 'px';
            var sp = ch.actionSpaces[i] || {};
            box.innerHTML = '<div class="t48-h">Choose One Action Space</div>' +
                '<div class="t48-s">Each turn you\u2019ll move your Action Marker to a different space on your board.</div>' +
                '<div class="t48-space"><b>' + (sp.label || '') + '</b><br>' + UI._tourSpaceCopy(sp) + '</div>' +
                '<div class="t48-tap">tap a space to peek \u00b7 tap outside to play</div>';
        }
        // Session 48b (Adam): no auto-loop — the tour is interaction-driven.
        // Marker starts on the first space; tap/hover a space to move it.
        place(0, true);
        void mk.offsetWidth;   // lock initial position before enabling transitions

        function hitSpace(x, y) {
            for (var i = 0; i < rects.length; i++) {
                var r = rects[i];
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
            }
            return -1;
        }
        var dismiss = function(){
            if (dim.parentNode) dim.parentNode.removeChild(dim);
            window.removeEventListener('resize', dismiss);
            UI._cm1Beat = true;   // first real placement announces its space
        };
        dim.addEventListener('click', function(e){
            var i = hitSpace(e.clientX, e.clientY);
            if (i >= 0) { place(i); }
            else dismiss();
        });
        dim.addEventListener('mousemove', function(e){
            var i = hitSpace(e.clientX, e.clientY);
            if (i >= 0 && i !== cur) { place(i); }
        });
        window.addEventListener('resize', dismiss);
        document.body.appendChild(dim);
    },

    /* Back-compat alias (older hooks) */
    showCoachMark1: function() { UI.showActionTour(); },

    _amBeatChip: function(label) {
        var chip = document.createElement('div');
        chip.className = 'am46-chip';
        chip.textContent = label + ' this turn!';
        document.body.appendChild(chip);
        setTimeout(function(){ chip.classList.add('show'); }, 30);
        setTimeout(function(){
            chip.classList.remove('show');
            setTimeout(function(){ if (chip.parentNode) chip.parentNode.removeChild(chip); }, 400);
        }, 2600);
    }
});


/* =========================================================================
   Session 48d: LIGHT HOMEPAGE (Adam). Heavy board art is deferred — the
   landing screen loads light; touching ANY landing button starts the real
   asset load (the setup screen is the natural loading window). Start Game
   gates briefly on a cozy loading beat only if assets aren't ready yet.
   ========================================================================= */
Object.assign(UI, {
    _arAssetsLoaded: false,
    _deferredAssetsGo: function() {
        if (this._arDeferStarted) return window._arAssetsReady;
        this._arDeferStarted = true;
        var imgs = [].slice.call(document.querySelectorAll('[data-defer-src]'));
        var waits = imgs.map(function(img){
            return new Promise(function(res){
                img.addEventListener('load', res, { once: true });
                img.addEventListener('error', res, { once: true });
                img.src = img.getAttribute('data-defer-src');
                img.removeAttribute('data-defer-src');
            });
        });
        window._arAssetsReady = Promise.all(waits).then(function(){ UI._arAssetsLoaded = true; });
        return window._arAssetsReady;
    }
});

/* =========================================================================
   Session 49.17 (Adam): STORY MODE OVERVIEW — same family as How-to-Play.
   Auto-shows on the first Story Mode tap; always available from the menu.
   ========================================================================= */
Object.assign(UI, {
    onLandingStory: function() {
        try {
            if (!localStorage.getItem('ar_sm_seen')) { UI.showStoryIntro(true); return; }
        } catch (e) {}
        Story.start();
    },

    showStoryIntro: function(firstTime) {
        var ov = document.getElementById('smiOverlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'smiOverlay';
            ov.className = 'htp46-back';
            ov.innerHTML =
              '<div class="htp46 smi49">' +
                '<button class="htp46-x" aria-label="Close">\u00d7</button>' +
                '<div class="smi49-head">' +
                  '<div class="smi49-kicker">Story Mode</div>' +
                  '<div class="smi49-title">Quest for Craft Circle Champion</div>' +
                '</div>' +
                '<div class="smi49-rows">' +
                  '<div class="smi49-row"><span class="smi49-ico">\ud83e\uddf6</span><div><b>Pick your Raveler.</b> Choose a crafting style and climb with any of the twelve crafters.</div></div>' +
                  '<div class="smi49-row"><span class="smi49-ico">\u2694\ufe0f</span><div><b>Out-craft the Circle.</b> Beat 11 fellow Ravelers one by one. Each win makes the next rival tougher.</div></div>' +
                  '<div class="smi49-row"><span class="smi49-ico">\ud83c\udfb4</span><div><b>Win their Favorites.</b> Every rival you beat unlocks their favorite Special Request for your collection.</div></div>' +
                  '<div class="smi49-row"><span class="smi49-ico">\ud83d\udc51</span><div><b>Face the Stitchmeister.</b> Clear the Circle and Hank himself awaits, with the crown on the line.</div></div>' +
                '</div>' +
                '<div class="smi49-save">\u2601\ufe0f Sign in and your climb, score, and achievements follow you to any device.</div>' +
                '<button class="htp46-cta smi49-cta">Start the Climb!</button>' +
                '<div class="htp46-again">Find this any time in the \u2630 menu</div>' +
              '</div>';
            document.body.appendChild(ov);
            var close = function(go) {
                ov.classList.remove('open');
                try { localStorage.setItem('ar_sm_seen', '1'); } catch (e) {}
                // 49.21: mid-game, the CTA respects the leave-game confirm
                if (go === true) UI.nmNav('Story Mode', function(){ Story.start(); });
            };
            ov.querySelector('.htp46-x').addEventListener('click', function(){ close(false); });
            ov.querySelector('.smi49-cta').addEventListener('click', function(){ close(true); });
            ov.addEventListener('click', function(e){ if (e.target === ov) close(false); });
        }
        ov.classList.add('open');
    }
});

/* =========================================================================
   Session 48S: YARN BOWL DRAWER (Adam's design, mockup-blessed values).
   Tap the token arc -> the wooden bowl slides in from the left, INSIDE the
   board (own clip layer; wrapper keeps overflow visible for cost dots).
   Wedge wheel = live counts. Tangled = refuse + annoyed cat, no other sound.
   ========================================================================= */
/* Session 48W: entry-gain cancel handlers RESTORED (Session 47 originals were
   lost in the deploy-path incident — the buttons survived, the functions
   didn't). Cancel = soft revert, marker roams again. */
Object.assign(UI, {
    _addEntryGainCancel: function(modalId) {
        var modal = document.getElementById(modalId);
        if (!modal) return;
        var content = modal.querySelector('.modal-content') || modal;
        if (content.querySelector('.cp-cancel-row')) return;
        var row = document.createElement('div');
        row.className = 'cp-cancel-row';
        var b = document.createElement('button');
        b.className = 'btn btn-link';
        b.style.fontSize = '13px';
        b.textContent = '\u21a9 Pick a different space';
        b.addEventListener('click', function(){ UI._cancelEntryGain(modalId); });
        row.appendChild(b);
        content.appendChild(row);
    },

    _cancelEntryGain: function(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            var row = modal.querySelector('.cp-cancel-row');
            if (row) row.remove();
        }
        Game.state.pendingTake3Yarn = false;
        Game.state.pendingTake5Any = false;
        if (Game.undoSpaceChoice) Game.undoSpaceChoice();
    },

    onTake5Cancel: function() {
        var modal = document.getElementById('take5Modal');
        if (modal) modal.style.display = 'none';
        this._take5 = {};
        Game.state.pendingTake3Yarn = false;
        Game.state.pendingTake5Any = false;
        if (Game.undoSpaceChoice) Game.undoSpaceChoice();
    }
});

Object.assign(UI, {
    YB_ARC: { left: 0.5, top: 26.5, w: 10, h: 45, tok: 5.3, font: 2.75,
              depth: 4.8, peak: 0.5, dOpenX: -7, dY: 48, dSz: 45 },
    _ybCounts: null,

    buildYarnDrawer: function() {
        var wrap = document.querySelector('.player-board-wrapper');
        if (!wrap || document.getElementById('ybClip')) return;
        var clip = document.createElement('div');
        clip.id = 'ybClip'; clip.className = 'yb-clip';
        clip.innerHTML =
            '<div class="yb-scrim" id="ybScrim"></div>' +
            '<div class="yb-drawer" id="ybDrawer" role="dialog" aria-label="Yarn Bowl: your yarn counts" title="Tap to close">' +
                '<div class="yb-wheel" id="ybWheel"></div>' +
                '<img class="yb-rim" src="Other Images Textures Details/yarn-bowl-wood.webp" alt="" draggable="false">' +
            '</div>';
        wrap.appendChild(clip);
        var hz = document.createElement('div');
        hz.id = 'ybHotzone'; hz.className = 'yb-hotzone';
        hz.setAttribute('role', 'button'); hz.setAttribute('tabindex', '0');
        hz.setAttribute('aria-label', 'Open your Yarn Bowl');
        wrap.appendChild(hz);
        var toast = document.createElement('div');
        toast.id = 'ybToast'; toast.className = 'yb-toast';
        toast.textContent = '\ud83d\ude3e The Tangled Cat has your bowl!';
        wrap.appendChild(toast);
        hz.addEventListener('click', function(){ UI.toggleYarnDrawer(); });
        hz.addEventListener('keydown', function(e){
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); UI.toggleYarnDrawer(); }
        });
        document.getElementById('ybScrim').addEventListener('click', function(){ UI.closeYarnDrawer(); });
        document.getElementById('ybDrawer').addEventListener('click', function(){ UI.closeYarnDrawer(); });
        this._ybBuildWheel();
    },

    /* Session 50: compact static bowl-wheel SVG for modal contexts (tablet).
       Same wedge geometry as the drawer wheel; no interactivity. */
    _miniBowlSVG: function(bowl) {
        bowl = bowl || {};
        var order = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
        function pt(aDeg, r){ var a = aDeg * Math.PI / 180; return [100 + r * Math.sin(a), 100 - r * Math.cos(a)]; }
        var s = '<svg viewBox="0 0 200 200" aria-hidden="true"><defs>';
        order.forEach(function(c){
            s += '<pattern id="mbfab-' + c + '" patternUnits="userSpaceOnUse" width="200" height="200">' +
                 '<image href="Other Images Textures Details/Textures/FabricPlain0015_ar_' + c + '.png" width="200" height="200" preserveAspectRatio="xMidYMid slice"/></pattern>';
        });
        s += '<radialGradient id="mbshadeg"><stop offset="16%" stop-color="#000" stop-opacity="0.34"/><stop offset="48%" stop-color="#000" stop-opacity="0.14"/><stop offset="78%" stop-color="#000" stop-opacity="0"/></radialGradient>';
        s += '<radialGradient id="mbfadeg"><stop offset="78%" stop-color="#fff" stop-opacity="1"/><stop offset="96%" stop-color="#fff" stop-opacity="0.72"/><stop offset="100%" stop-color="#fff" stop-opacity="0.45"/></radialGradient>';
        s += '<mask id="mbfade"><circle cx="100" cy="100" r="102" fill="url(#mbfadeg)"/></mask>';
        s += '</defs><g mask="url(#mbfade)">';
        order.forEach(function(c, k){
            var a0 = k * 60, a1 = (k + 1) * 60, R = 102;
            var p1 = pt(a0, R), p2 = pt(a1, R);
            var mid = pt(a0 + 30, 62), TW = 34;
            var n = bowl[c] || 0;
            s += '<g' + (n === 0 ? ' opacity="0.45"' : '') + '>';
            s += '<path d="M100,100 L' + p1[0] + ',' + p1[1] + ' A' + R + ',' + R + ' 0 0 1 ' + p2[0] + ',' + p2[1] + ' Z" fill="url(#mbfab-' + c + ')" stroke="rgba(60,38,18,.55)" stroke-width="1.2"/>';
            s += '<image href="Wood Yarn Tokens PNG/' + c + '.png" x="' + (mid[0] - TW/2) + '" y="' + (mid[1] - TW/2) + '" width="' + TW + '" height="' + TW + '"/>';
            s += '<text x="' + mid[0] + '" y="' + mid[1] + '" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="800" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">' + n + '</text>';
            s += '</g>';
        });
        s += '</g>';
        var _total = 0;
        order.forEach(function(c){ _total += (bowl[c] || 0); });
        s += '<circle cx="100" cy="100" r="102" fill="url(#mbshadeg)" pointer-events="none"/>';
        s += '<circle cx="100" cy="100" r="24" fill="#5a3c20" stroke="#3f2a15" stroke-width="3"/>';
        s += '<text x="100" y="100" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="800" fill="#ffe9c9">' + _total + '</text></svg>';
        return s;
    },

    _ybBuildWheel: function() {
        var host = document.getElementById('ybWheel');
        if (!host) return;
        host.innerHTML = '';
        var NS = 'http://www.w3.org/2000/svg';
        var order = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        var defs = document.createElementNS(NS, 'defs');
        order.forEach(function(c){
            var p = document.createElementNS(NS, 'pattern');
            p.setAttribute('id', 'ybfab-' + c);
            p.setAttribute('patternUnits', 'userSpaceOnUse');
            p.setAttribute('width', '200'); p.setAttribute('height', '200');
            var im = document.createElementNS(NS, 'image');
            im.setAttribute('href', 'Other Images Textures Details/Textures/FabricPlain0015_ar_' + c + '.png');
            im.setAttribute('width', '200'); im.setAttribute('height', '200');
            im.setAttribute('preserveAspectRatio', 'xMidYMid slice');
            p.appendChild(im); defs.appendChild(p);
        });
        // Session 50 (Adam): rim fade + center-depth shade + hub total.
        function addStops(gradEl, stops) {
            stops.forEach(function(sd){
                var st = document.createElementNS(NS, 'stop');
                st.setAttribute('offset', sd[0]); st.setAttribute('stop-color', sd[1]); st.setAttribute('stop-opacity', sd[2]);
                gradEl.appendChild(st);
            });
        }
        var fadeG = document.createElementNS(NS, 'radialGradient');
        fadeG.setAttribute('id', 'ybfadeg');
        addStops(fadeG, [['78%','#ffffff','1'],['96%','#ffffff','0.72'],['100%','#ffffff','0.45']]);
        defs.appendChild(fadeG);
        var shadeG = document.createElementNS(NS, 'radialGradient');
        shadeG.setAttribute('id', 'ybshadeg');
        addStops(shadeG, [['16%','#000000','0.34'],['48%','#000000','0.14'],['78%','#000000','0']]);
        defs.appendChild(shadeG);
        var mask = document.createElementNS(NS, 'mask');
        mask.setAttribute('id', 'ybfade');
        var mc = document.createElementNS(NS, 'circle');
        mc.setAttribute('cx','100'); mc.setAttribute('cy','100'); mc.setAttribute('r','102');
        mc.setAttribute('fill','url(#ybfadeg)');
        mask.appendChild(mc); defs.appendChild(mask);
        svg.appendChild(defs);
        function pt(aDeg, r){ var a = aDeg * Math.PI / 180; return [100 + r * Math.sin(a), 100 - r * Math.cos(a)]; }
        this._ybCounts = {};
        var self = this;
        var pathsLayer = document.createElementNS(NS, 'g');
        pathsLayer.setAttribute('mask', 'url(#ybfade)');
        svg.appendChild(pathsLayer);
        var labelsLayer = document.createElementNS(NS, 'g');
        order.forEach(function(c, k){
            var a0 = k * 60, a1 = (k + 1) * 60, R = 102;
            var p1 = pt(a0, R), p2 = pt(a1, R);
            var g = document.createElementNS(NS, 'g');
            g.setAttribute('class', 'yb-wedge');
            g.setAttribute('role', 'img'); g.setAttribute('tabindex', '0');
            var ttl = document.createElementNS(NS, 'title'); g.appendChild(ttl);
            var path = document.createElementNS(NS, 'path');
            path.setAttribute('d', 'M100,100 L' + p1[0] + ',' + p1[1] + ' A' + R + ',' + R + ' 0 0 1 ' + p2[0] + ',' + p2[1] + ' Z');
            path.setAttribute('fill', 'url(#ybfab-' + c + ')');
            path.setAttribute('stroke', 'rgba(60,38,18,.55)'); path.setAttribute('stroke-width', '1.2');
            g.appendChild(path);
            pathsLayer.appendChild(g);
            var mid = pt(a0 + 30, 62), TW = 34;
            var lg = document.createElementNS(NS, 'g');
            lg.setAttribute('pointer-events', 'none');
            var tok = document.createElementNS(NS, 'image');
            tok.setAttribute('href', 'Wood Yarn Tokens PNG/' + c + '.png');
            tok.setAttribute('x', mid[0] - TW/2); tok.setAttribute('y', mid[1] - TW/2);
            tok.setAttribute('width', TW); tok.setAttribute('height', TW);
            lg.appendChild(tok);
            var txt = document.createElementNS(NS, 'text');
            txt.setAttribute('x', mid[0]); txt.setAttribute('y', mid[1]);
            txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('dominant-baseline', 'central');
            txt.setAttribute('font-size', '15'); txt.setAttribute('font-weight', '800');
            txt.setAttribute('fill', '#fff'); txt.setAttribute('stroke', '#000'); txt.setAttribute('stroke-width', '3');
            txt.setAttribute('paint-order', 'stroke');
            lg.appendChild(txt);
            var cbm = pt(a0 + 30, 86);
            var cbg = document.createElementNS(NS, 'g');
            cbg.setAttribute('class', 'yb-cb');
            var cbc = document.createElementNS(NS, 'circle');
            cbc.setAttribute('cx', cbm[0]); cbc.setAttribute('cy', cbm[1]); cbc.setAttribute('r', '9');
            cbc.setAttribute('fill', 'rgba(255,255,255,.92)');
            cbc.setAttribute('stroke', 'rgba(0,0,0,.55)'); cbc.setAttribute('stroke-width', '1.5');
            var cbt = document.createElementNS(NS, 'text');
            cbt.setAttribute('x', cbm[0]); cbt.setAttribute('y', cbm[1]);
            cbt.setAttribute('text-anchor', 'middle'); cbt.setAttribute('dominant-baseline', 'central');
            cbt.setAttribute('font-size', '11'); cbt.setAttribute('font-weight', '800');
            cbt.setAttribute('fill', '#241708');
            cbt.textContent = c.charAt(0).toUpperCase();
            cbg.appendChild(cbc); cbg.appendChild(cbt);
            lg.appendChild(cbg);
            labelsLayer.appendChild(lg);
            self._ybCounts[c] = { text: txt, title: ttl, g: g };
        });
        var shade = document.createElementNS(NS, 'circle');
        shade.setAttribute('cx','100'); shade.setAttribute('cy','100'); shade.setAttribute('r','102');
        shade.setAttribute('fill','url(#ybshadeg)'); shade.setAttribute('pointer-events','none');
        svg.appendChild(shade);
        svg.appendChild(labelsLayer);
        var dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', '100'); dot.setAttribute('cy', '100'); dot.setAttribute('r', '24');
        dot.setAttribute('fill', '#5a3c20'); dot.setAttribute('stroke', '#3f2a15'); dot.setAttribute('stroke-width', '3');
        svg.appendChild(dot);
        var tot = document.createElementNS(NS, 'text');
        tot.setAttribute('x','100'); tot.setAttribute('y','100');
        tot.setAttribute('text-anchor','middle'); tot.setAttribute('dominant-baseline','central');
        tot.setAttribute('font-size','17'); tot.setAttribute('font-weight','800');
        tot.setAttribute('fill','#ffe9c9');
        svg.appendChild(tot);
        this._ybTotal = tot;
        host.appendChild(svg);
        this._ybSync();
    },

    _ybSync: function() {
        if (!this._ybCounts || !window.Game || !Game.state || !Game.state.player) return;
        var bowl = Game.state.player.yarnBowl || {};
        var self = this;
        Object.keys(this._ybCounts).forEach(function(c){
            var n = bowl[c] || 0;
            var label = c.charAt(0).toUpperCase() + c.slice(1) + ' yarn: ' + n;
            self._ybCounts[c].text.textContent = n;
            self._ybCounts[c].title.textContent = label;
            self._ybCounts[c].g.setAttribute('aria-label', label);
        });
        if (this._ybTotal) {
            var _tt = 0;
            Object.keys(this._ybCounts).forEach(function(c){ _tt += (bowl[c] || 0); });
            this._ybTotal.textContent = _tt;
        }
    },

    openYarnDrawer: function() {
        var drawer = document.getElementById('ybDrawer');
        var scrim = document.getElementById('ybScrim');
        if (!drawer) return;
        var p = window.Game && Game.state && Game.state.player;
        if (p && p.cantCraftNextTurn && !p.isAI && !p.isHank) {
            // Tangled: the cat has your bowl. Bump + toast + annoyed cat ONLY.
            drawer.classList.remove('yb-refuse'); void drawer.offsetWidth;
            drawer.classList.add('yb-refuse');
            try { if (window.Sound) Sound.play('ev-tangled-cat'); } catch (e) {}
            var toast = document.getElementById('ybToast');
            if (toast) { toast.classList.add('show'); setTimeout(function(){ toast.classList.remove('show'); }, 1700); }
            return;
        }
        this._ybSync();
        drawer.classList.add('open');
        if (scrim) scrim.classList.add('on');
        try { if (window.Sound) Sound.play('drawer-open'); } catch (e) {}
    },

    closeYarnDrawer: function() {
        var drawer = document.getElementById('ybDrawer');
        var scrim = document.getElementById('ybScrim');
        if (!drawer || !drawer.classList.contains('open')) return;
        drawer.classList.remove('open');
        if (scrim) scrim.classList.remove('on');
        try { if (window.Sound) Sound.play('drawer-close'); } catch (e) {}
    },

    toggleYarnDrawer: function() {
        var drawer = document.getElementById('ybDrawer');
        if (drawer && drawer.classList.contains('open')) this.closeYarnDrawer();
        else this.openYarnDrawer();
    }
});

/* Session 49.2: lightweight play analytics — fire-and-forget event pings to
   Supabase (ar_events table, anon-insert-only RLS). Never blocks gameplay. */
Object.assign(UI, {
    logEvent: function(ev, meta) {
        try {
            var sb = window.Story && Story.sb;
            if (!sb) return;
            sb.from('ar_events').insert({
                ev: ev,
                mode: (window.Story && Story.storyGame) ? 'story' : 'quick',
                build: (window.AR_VERSION ? AR_VERSION.build + '.' + (AR_VERSION.rev || 0) : ''),
                meta: meta || {}
            }).then(function(){}, function(){});
        } catch (e) {}
    }
});

// live count sync whenever the bowl re-renders; count font sized in px from
// the real board width (2.75% of board, Adam's recipe) — no container units
(function(){
    var _szRetry;
    function sizeCounts() {
        try {
            var wrap = document.querySelector('.player-board-wrapper');
            if (!wrap) return;
            var w = wrap.getBoundingClientRect().width;
            if (!w) {
                // board still hidden (pre-game) — retry until it has real width
                clearTimeout(_szRetry); _szRetry = setTimeout(sizeCounts, 400);
                return;
            }
            var px = Math.max(10, w * 0.030);   // 48W: split the difference
            document.querySelectorAll('.yarn-bowl-overlay .yarn-count').forEach(function(el){
                el.style.fontSize = px + 'px';
            });
        } catch (e) {}
    }
    setTimeout(sizeCounts, 300);   // first-load pass (retries till visible)
    UI._ybSizeCounts = sizeCounts;
    var _rYB = UI.renderYarnBowl;
    if (_rYB) UI.renderYarnBowl = function(ch){ _rYB.call(UI, ch); try { UI._ybSync(); sizeCounts(); } catch (e) {} };
    var _t;
    window.addEventListener('resize', function(){ clearTimeout(_t); _t = setTimeout(sizeCounts, 150); });
})();

(function(){
    function boot() {
        try { UI.buildYarnDrawer(); } catch (e) {}
        // Session 50: GLOBAL supply-tray zone listener (capture) - bottom of a
        // well = minus (per-tray handler via data-minus-fn); review-locked
        // trays (cp-full) swallow plus taps.
        document.addEventListener('click', function(e){
            try {
                if (!document.body.classList.contains('cap-native')) return;
                if (!(window.matchMedia && window.matchMedia('(min-width: 600px)').matches)) return;
                var tray = e.target && e.target.closest ? e.target.closest('[data-minus-fn]') : null;
                if (!tray) return;
                var btn = e.target.closest('.xc-chip');
                if (!btn || btn.disabled) return;
                var rect = btn.getBoundingClientRect();
                var minus = (e.clientY - rect.top) / rect.height > 0.74;
                if (minus) {
                    e.stopPropagation(); e.preventDefault();
                    var fn = tray.getAttribute('data-minus-fn');
                    var col = btn.getAttribute('data-cb-color');
                    if (fn && col && typeof UI[fn] === 'function') UI[fn](col);
                } else if (tray.classList.contains('cp-full')) {
                    e.stopPropagation(); e.preventDefault();
                }
            } catch (err) {}
        }, true);
        // Session 50: tablet portrait - move the FO drawer up to <body> so it can
        // be a fixed full-height side sheet (the board wrapper's zoom transform
        // would otherwise trap/scale it). IDs + class toggles keep working.
        try {
            if (document.body.classList.contains('cap-native') &&
                window.matchMedia('(orientation: portrait) and (min-width: 600px)').matches) {
                var fod = document.getElementById('foDrawer');
                if (fod && fod.parentNode !== document.body) document.body.appendChild(fod);
            }
        } catch (e) {}
        // any touch of the landing starts the real load
        var landing = document.getElementById('landingScreen');
        if (landing) {
            landing.addEventListener('click', function(){ UI._deferredAssetsGo(); }, { capture: true, once: true });
        }
        /* Session 48k (Adam): loading screen moved UP-FRONT. Quick Play shows a
           cozy loading beat that waits for the real assets (min 0.9s so it does
           not flash, hard cap 5s) BEFORE the setup screen appears. By Start Game
           everything is loaded, so no mid-layout reflow jank. If assets are
           already loaded (second game etc.) it goes straight through. */
        /* Session 48L (Adam): ONE loading moment, at Start Game. Quick Play just
           kicks off the background asset download and goes straight to setup
           (the player browses crafters while art downloads). */
        if (UI.onLandingPlaySolo && !UI._playGateWrapped) {
            UI._playGateWrapped = true;
            var origPlay = UI.onLandingPlaySolo;
            UI.onLandingPlaySolo = function() {
                try { UI._deferredAssetsGo(); } catch (e) {}
                return origPlay.apply(UI, arguments);
            };
        }
        // gate Start Game on readiness (max 6s, cozy loading beat)
        if (UI.onSetupStart && !UI._setupGateWrapped) {
            UI._setupGateWrapped = true;
            var orig = UI.onSetupStart;
            UI.onSetupStart = function() {
                var args = arguments;
                try {
                    UI._deferredAssetsGo();
                    /* Session 48L: THE loading screen. Shows on every game start;
                       behind it we (a) wait for assets (cap 5s), (b) run Game.init
                       so the board + action marker assemble FULLY hidden (fixes the
                       double marker: init used to run pre-asset-load, render a tiny
                       marker, then re-render a correct one), then (c) lift the
                       screen straight onto How-to-Play (which fires at init). */
                    var ov = document.createElement('div');
                    ov.className = 'ld48';
                    ov.innerHTML = '<div class="ld48-in"><img src="Other Images Textures Details/AR_cat_meeple_GRAY_3D.png" alt=""><div>Setting up the Yarn Bazaar…</div></div>';
                    document.body.appendChild(ov);
                    var minBeat = new Promise(function(res){ setTimeout(res, 1100); });
                    var ready = window._arAssetsReady || Promise.resolve();
                    var capped = Promise.race([ready, new Promise(function(res){ setTimeout(res, 5000); })]);
                    var started = false;
                    var startGame = function(){
                        if (started) return; started = true;
                        try { orig.apply(UI, args); } catch (e) {}
                        // Session 48T (Adam): the veil does NOT auto-lift. Once
                        // the board is assembled (HTP open behind it, or 2s cap)
                        // the loading line becomes a Get Crafty! button and the
                        // PLAYER lifts the veil.
                        Promise.all([minBeat]).then(function(){
                            var t0 = Date.now();
                            (function ready(){
                                if (document.querySelector('.htp46-back.open') || Date.now() - t0 > 2000) {
                                    var inBox = ov.querySelector('.ld48-in');
                                    if (inBox && !ov.querySelector('.ld48-go')) {
                                        var line = inBox.querySelector('div');
                                        if (line) line.remove();
                                        var go = document.createElement('button');
                                        go.className = 'btn btn-cta ld48-go';
                                        go.textContent = 'Get Crafty!';
                                        go.addEventListener('click', function(){
                                            if (ov.parentNode) ov.parentNode.removeChild(ov);
                                        });
                                        inBox.appendChild(go);
                                        try { go.focus(); } catch (e) {}
                                    }
                                } else { setTimeout(ready, 90); }
                            })();
                        });
                    };
                    capped.then(startGame);
                    setTimeout(startGame, 5200);   // absolute failsafe
                    return;
                } catch (e) {}
                return orig.apply(UI, args);
            };
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
