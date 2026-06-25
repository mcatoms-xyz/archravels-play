/* ui-modals1.js — UI module (split from the Session-40 LIVE monolith).
   ui-core.js declares `var UI`; the other ui-*.js files extend it via Object.assign. */
Object.assign(UI, {
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

});
