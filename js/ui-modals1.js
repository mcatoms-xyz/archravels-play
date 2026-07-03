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
        UI._afterSpaceEntered();
    },

    /* Session 47: hop the marker to another legal space while the choice is soft. */
    onSwitchSpace: function(spaceIndex) {
        if (Game.state.phase !== 'playerActions') return;
        if (Game.state.player && Game.state.player.isAI) return;
        UI._amDroppedTurn = null;               // replay the drop animation on the hop
        if (!Game.switchActionSpace(spaceIndex)) return;
        UI._afterSpaceEntered();
    },

    /* Shared post-entry hook: entry-gain uniques pop their pickers. */
    _afterSpaceEntered: function() {
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

        // Playtest 6/29: end-turn guardrail. If the player still has a DOABLE
        // shop or craft action, warn before leaving the actions phase. Only
        // counts actions that are actually possible right now (cards in the
        // bazaar to shop / at least one affordable craft) so we never nag when
        // there's genuinely nothing left to do.
        // Mandatory shop (hard block): shopping is required and exact, so you
        // can't end your turn with an unfinished shop when cards are available.
        if (Game.state.shopLimit > 0 && !Game.state.turn.shopDone && Game.shopRequiredCount() > 0) {
            this._showMustShopWarning(Game.shopRequiredCount());
            return;
        }
        if (!this._endActionsConfirmed) {
            var pending = this._pendingEndActions();
            if (pending.length > 0) {
                this._showEndActionsWarning(pending);
                return;
            }
        }
        this._endActionsConfirmed = false;
        Game.endPlayerActions();
        // Game.endPlayerActions already triggers UI re-renders
    },

    /** Returns a list of still-doable actions (for the end-turn warning).
     * Each item carries a count string mirroring the action bar's chips
     * (Shop: selected/limit, Craft: used/limit). */
    _pendingEndActions: function() {
        var actions = Game.getAvailableActions();
        var pending = [];
        // Shop is NOT listed here — it's mandatory and handled by a hard block
        // in onEndActions. This soft warning only covers optional craft actions.
        if (actions.canCraft) {
            var opts = Game.getCraftOptions() || [];
            var canMakeSomething = opts.some(function(o) { return o.canAfford; });
            if (canMakeSomething) {
                pending.push({ icon: '🧶', label: 'Craft', count: actions.craftUsed + '/' + actions.craftLimit });
            }
        }
        return pending;
    },

    _showEndActionsWarning: function(pending) {
        this._dismissEndActionsWarning();
        var chips = pending.map(function(p) {
            return '<span class="end-warn-chip">' + p.icon + ' ' + p.label + ': ' + p.count + '</span>';
        }).join('');

        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'endActionsWarnModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.display = 'flex';
        overlay.innerHTML =
            '<div class="modal-content" style="max-width:400px;text-align:center">' +
                '<div class="modal-title">Forget Something?</div>' +
                '<div class="end-warn-body">' +
                    'You still have a craft action available:' +
                    '<div class="end-warn-chips">' + chips + '</div>' +
                    'End your turn anyway?' +
                '</div>' +
                '<div class="modal-actions end-warn-actions">' +
                    '<button class="btn btn-secondary" onclick="UI._confirmEndActions()">End Turn →</button>' +
                    '<button class="btn btn-cta" onclick="UI._dismissEndActionsWarning()">Keep Playing!</button>' +
                '</div>' +
            '</div>';
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) UI._dismissEndActionsWarning();
        });
        document.body.appendChild(overlay);
    },

    _dismissEndActionsWarning: function() {
        var m = document.getElementById('endActionsWarnModal');
        if (m) m.parentNode.removeChild(m);
    },

    _confirmEndActions: function() {
        this._dismissEndActionsWarning();
        this._endActionsConfirmed = true;
        this.onEndActions();
    },

    /** Hard block: shopping is mandatory + exact, so you can't end the turn
     * with an unfinished shop. No "end anyway" — just send them back. */
    _showMustShopWarning: function(n) {
        this._dismissEndActionsWarning();
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'endActionsWarnModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.display = 'flex';
        overlay.innerHTML =
            '<div class="modal-content" style="max-width:400px;text-align:center">' +
                '<div class="modal-title">Forget Something?</div>' +
                '<div class="end-warn-body">' +
                    'You must take ' + '<span class="end-warn-chip">🛍️ ' + n + ' card' + (n !== 1 ? 's' : '') + '</span>' +
                    ' from the bazaar this turn before you can end it.' +
                '</div>' +
                '<div class="modal-actions end-warn-actions">' +
                    '<button class="btn btn-cta" onclick="UI._dismissEndActionsWarning()">Back to the Bazaar!</button>' +
                '</div>' +
            '</div>';
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) UI._dismissEndActionsWarning();
        });
        document.body.appendChild(overlay);
    },

    /**
     * Session 43: Urgent Request (Snagged Project) blocked a project finish —
     * explain the constraint + current progress. Same dynamic pattern as the
     * must-shop warning.
     */
    _showSnagBlockWarning: function() {
        var rem = Game.state.activeSnagReminder;
        if (!rem) return;
        this._dismissSnagBlockWarning();
        var detail = '';
        if (rem.arg && rem.arg.mode === 'oneEachItem') {
            var types = ['hat', 'bear', 'mittens', 'scarf', 'blanket'];
            var you = Game._humanPlayer();
            var missing = types.filter(function(t) {
                return !you.items.some(function(it) { return it.id === t; });
            }).map(function(t) { var d = CARDS.getItem(t); return d ? d.name : t; });
            detail = missing.length
                ? '<div class="end-warn-body" style="margin-top:6px">Still needed: <b>' + missing.join(', ') + '</b></div>'
                : '';
        } else if (rem.arg && rem.arg.mode === 'completeSR') {
            detail = '<div class="end-warn-body" style="margin-top:6px">Complete <b>any Special Request</b> to clear it.</div>';
        }
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'snagWarnModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.display = 'flex';
        overlay.innerHTML =
            '<div class="modal-content" style="max-width:420px;text-align:center">' +
                '<div class="modal-title">Snagged! 🧶</div>' +
                '<div class="end-warn-body">' +
                    '<b>' + rem.name + (rem.hard ? ' (Hard)' : '') + '</b> is in effect:<br>' + rem.text +
                '</div>' + detail +
                '<div class="modal-actions end-warn-actions">' +
                    '<button class="btn btn-cta" onclick="UI._dismissSnagBlockWarning()">Got It</button>' +
                '</div>' +
            '</div>';
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) UI._dismissSnagBlockWarning();
        });
        document.body.appendChild(overlay);
    },

    _dismissSnagBlockWarning: function() {
        var m = document.getElementById('snagWarnModal');
        if (m) m.remove();
    },

    /**
     * Session 43: Emergency! Gnome Rule blocked a craft — the tagged SR must be
     * crafted before anything else.
     */
    _showEmergencyBlockWarning: function() {
        var sr = Game.emergencyBlocks();
        if (!sr) return;
        this._dismissEmergencyBlockWarning();
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'emergencyWarnModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.display = 'flex';
        overlay.innerHTML =
            '<div class="modal-content" style="max-width:420px;text-align:center">' +
                '<div class="modal-title">Emergency! 🚨</div>' +
                '<div class="end-warn-body">' +
                    'The gnomes demand it: you must craft ' +
                    '<b>' + sr.name + '</b> before crafting anything else.' +
                '</div>' +
                (sr.img ? '<img src="' + sr.img + '" alt="' + sr.name + '" style="width:110px;border-radius:8px;margin:10px auto 0;display:block;box-shadow:0 4px 12px rgba(0,0,0,.3)">' : '') +
                '<div class="modal-actions end-warn-actions">' +
                    '<button class="btn btn-cta" onclick="UI._dismissEmergencyBlockWarning()">Got It</button>' +
                '</div>' +
            '</div>';
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) UI._dismissEmergencyBlockWarning();
        });
        document.body.appendChild(overlay);
    },

    _dismissEmergencyBlockWarning: function() {
        var m = document.getElementById('emergencyWarnModal');
        if (m) m.remove();
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
        // Core rule: shopping is exact — must take the full required number.
        var shopReq = Game.shopRequiredCount();
        if (shopReq === 0 || sel.length !== shopReq) return;

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

        // Session 42: Tangled Yarn cards that surfaced during restock queue up as reveals.
        // Play them (cat meow + yarn confetti), update the Gnome Rule slot, THEN the events/SRs.
        UI.renderGnomeRule();
        UI.playHankReveals(function() {
            if (revealed.length === 0) {
                // No events or SRs — re-render to show any new restock actions, then let player act
                UI.renderBazaar();
                UI.renderProjectStrip();   // S40 fix #19: re-render so the click-to-finish handler attaches now that _restockDone is true
                UI.renderActionBar();
            } else {
                // Process the queue of revealed Events/SRs, then return to restock bar
                UI._processRestockQueue(revealed, 0, function() {
                    // Re-render so player can finish projects / learn patterns before ending turn.
                    try {
                        UI.renderBazaar();
                        UI.renderCraftGrid();
                        UI.renderSpecialRequests();
                        UI.renderFinishedObjects();
                        UI.renderProjectStrip();
                    } catch (e) {}
                    // Always advance the action bar to "End Turn", even if a render above hiccups.
                    UI.renderActionBar();
                });
            }
        });
    },

    /**
     * Session 9b: End the turn after restock phase actions are complete.
     */
    onEndRestockTurn: function() {
        // Guard: only allow during restock phase
        if (Game.state.phase !== 'restock') return;
        this._restockDone = false;
        Game.endTurn();
        // Session 43: after a Hank match turn, dramatize his response (the "Hank Goes
        // Shopping" beat) before the player takes over.
        if (Game.state.hankAutoma && Game.state._hankBeat) UI.showHankTurnBeat();
    },

    /**
     * Session 43: "Hank's Turn" modal — a 6s beat after you end your turn so the boss
     * feels ALIVE (his +3 was invisible before). Shows his shopping haul, running score,
     * a dramatic turn counter, an auto-countdown ring, and a "Your Turn →" button.
     */
    _hankBeatTimer: null,
    showHankTurnBeat: function() {
        var beat = Game.state._hankBeat; Game.state._hankBeat = null;
        if (!beat) return;
        this._dismissHankTurnBeat();
        try { if (window.Sound) Sound.play('restock'); } catch(e) {}
        var SECS = 6;
        var YARN3 = { orange:'0000', blue:'0001', green:'0002', purple:'0003', red:'0004', yellow:'0005' };
        var c = (beat.colors && beat.colors[0]) || beat.color || 'blue';
        // Session 43 (Adam): ONE Yarn3 "3-count" token — he grabbed 3 of a single color.
        // (If a future ramp makes the amount ≠ 3, fall back to N single tokens.)
        var tokens;
        if (beat.amount === 3) {
            tokens = '<img class="hb-tok hb-tok-big" style="animation-delay:.15s" '+
              'src="Yarn 3 Tokens PNG/AR_Yarn3_Tokens_'+(YARN3[c]||'0001')+'_'+c+'.png" alt="'+c+' yarn">';
        } else {
            tokens = '';
            for (var k=0;k<beat.amount;k++) tokens += '<img class="hb-tok" style="animation-delay:'+(0.15+k*0.4)+'s" src="Wood Yarn Tokens PNG/'+c+'.png" alt="'+c+' yarn">';
        }
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay hank-beat-overlay';
        overlay.id = 'hankBeatModal';
        overlay.style.display = 'flex';
        overlay.innerHTML =
          '<div class="hank-beat">'+
            '<div class="hb-turn">Hank’s Turn <b>#'+beat.turn+'</b></div>'+
            '<div class="hb-portrait"><img src="story-assets/portraits/hank.jpg" alt="Hank">'+
              '<svg class="hb-ring" viewBox="0 0 100 100"><circle class="hb-ring-bg" cx="50" cy="50" r="46"/>'+
              '<circle class="hb-ring-fg" cx="50" cy="50" r="46"/></svg></div>'+
            '<div class="hb-title">Hank Goes Shopping</div>'+
            '<div class="hb-toks">'+tokens+'</div>'+
            '<div class="hb-haul">Banked <b>+'+beat.amount+'</b> yarn for his stash</div>'+
            '<div class="hb-score">His score so far: <b>'+beat.score+'</b></div>'+
            '<button class="btn btn-gold hb-go" onclick="UI._dismissHankTurnBeat(true)">Your Turn →</button>'+
          '</div>';
        document.body.appendChild(overlay);
        try { if (window.Sound) Sound.play('draw-card'); } catch(e) {}
        // Kick the countdown ring (CSS transition over SECS)
        var fg = overlay.querySelector('.hb-ring-fg');
        if (fg) { fg.style.transition = 'stroke-dashoffset '+SECS+'s linear'; requestAnimationFrame(function(){ fg.style.strokeDashoffset = '289'; }); }
        this._hankBeatTimer = setTimeout(function(){ UI._dismissHankTurnBeat(true); }, SECS*1000);
    },
    _dismissHankTurnBeat: function(){
        if (this._hankBeatTimer) { clearTimeout(this._hankBeatTimer); this._hankBeatTimer = null; }
        var m = document.getElementById('hankBeatModal'); if (m) m.remove();
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
            buttonsHtml += '<button class="btn btn-secondary" onclick="UI.showCraftOptionsModal()">View Craft Options</button>';
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
        UI.renderProjectStrip();   // S40 fix #19: attach the click-to-finish handler
        UI.renderActionBar();
    },


    /* =========================================================
       SESSION 17: GAME MOMENT MODAL
       Generic announcement overlay for key game moments.
       Shows card image, title, description. Human clicks to
       dismiss; AI auto-dismisses after a delay.
       Config: { badge, badgeClass, img, title, desc, points }
       ========================================================= */

    /**
     * Session 42: Play the queued Hank automa reveals (Tangled Yarn instants + Snagged
     * Projects) as game-moment modals — a cat meow + yarn-strand confetti per card. Chains
     * through the whole queue, then fires callback. (Gnome Rules don't queue here — they
     * slide into the board slot instead.)
     */
    playHankReveals: function(callback) {
        var q = (Game.state && Game.state.hankReveals) || [];
        if (!q.length) { if (callback) callback(); return; }
        var item = q.shift();
        var card = item.card || {};

        // Session 43: Cat Nap placement — the human chooses where the cat sleeps.
        // (AI/sim seats never place; enforcement is human-only anyway.)
        if (item.kind === 'catNapPick') {
            var nColors = (card.arg && card.arg.colors) || 1;   // built card: flat arg, boolean hard
            try { if (window.Sound) Sound.play('tangle-reveal'); } catch(e) {}
            UI.showGameMoment({
                badge: 'Tangled Yarn',
                badgeClass: 'moment-tangle',
                img: card.img,
                title: card.name + (card.hard ? ' (Hard)' : ''),
                desc: '<div class="gnome-rule-desc">' + (card.text || '') + '</div>'
            }, function() {
                if (nColors >= 2) {
                    UI._showCatNapPairPicker(function() { UI.playHankReveals(callback); });
                } else {
                    UI.showColorPicker(function(color) {
                        Game.placeCatNap([color]);
                        UI.renderYarnBowl();
                        UI.playHankReveals(callback);
                    }, 'Cat Nap — where does the cat sleep? 🐱');
                }
            });
            return;
        }

        // Session 43 (playtest fix): gnome-rule installs announce themselves too.
        var isGnome  = item.kind === 'gnomeRule';
        var isTangle = item.kind === 'tangledYarn' || isGnome;
        try { if (window.Sound) Sound.play('tangle-reveal'); } catch(e) {}
        UI.showGameMoment({
            badge: isGnome ? 'New Gnome Rule!' : (isTangle ? 'Tangled Yarn' : 'Snagged Project'),
            badgeClass: isTangle ? 'moment-tangle' : 'moment-snag',
            img: card.img,
            title: card.name + (card.hard ? ' (Hard)' : ''),
            desc: '<div class="gnome-rule-desc">' + (card.text || '') +
                  (isGnome ? '<br><i>Ongoing — sits by the bazaar until a new Gnome Rule replaces it.</i>' : '') + '</div>'
        }, function() {
            UI.playHankReveals(callback);   // next reveal in the queue
        });
    },

    /**
     * Session 43: Cat Nap (Hard) — pick 2 ADJACENT colors (bowl order R·O·Y·G·B·P).
     */
    _showCatNapPairPicker: function(done) {
        var order = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'catNapPairModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.display = 'flex';
        var btns = '';
        for (var i = 0; i < order.length - 1; i++) {
            var a = order[i], b = order[i + 1];
            btns += '<button class="btn btn-secondary catnap-pair-btn" data-pair="' + a + ',' + b + '">' +
                '<img src="Wood Yarn Tokens PNG/' + a + '.png" alt="' + a + '">' +
                '<img src="Wood Yarn Tokens PNG/' + b + '.png" alt="' + b + '">' +
                '<span>' + a.charAt(0).toUpperCase() + a.slice(1) + ' + ' + b.charAt(0).toUpperCase() + b.slice(1) + '</span>' +
                '</button>';
        }
        overlay.innerHTML =
            '<div class="modal-content" style="max-width:440px;text-align:center">' +
                '<div class="modal-title">Cat Nap (Hard) — where does the cat sprawl? 🐱</div>' +
                '<div class="end-warn-body">Pick 2 adjacent colors. You can\'t shop or collect them while the cat\'s there.</div>' +
                '<div class="catnap-pair-grid">' + btns + '</div>' +
            '</div>';
        overlay.addEventListener('click', function(e) {
            var btn = e.target.closest('.catnap-pair-btn');
            if (!btn) return;
            var pair = btn.getAttribute('data-pair').split(',');
            Game.placeCatNap(pair);
            UI.renderYarnBowl();
            overlay.remove();
            if (done) done();
        });
        document.body.appendChild(overlay);
    },

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

        // Session 17: Spawn confetti particles behind the modal (Session 42: yarn strands).
        // Reference modals (e.g. the Gnome Rule card) pass noConfetti — no celebration.
        if (!config.noConfetti) UI._spawnConfetti(modal);

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

        // Session 42: yarn-strand confetti — little tumbling snippets of yarn in the game's
        // six yarn-token colors. Some are straight strands, some curl like a loose loop.
        var colors = ['#d24b4b','#3b7dd8','#4fae5a','#e8c33f','#e2853a','#8b5cc0'];
        var count = 90;

        for (var i = 0; i < count; i++) {
            var p = document.createElement('div');
            p.className = 'gm-confetti-piece gm-yarn';
            var color = colors[Math.floor(Math.random() * colors.length)];
            var left = Math.random() * 100;
            var delay = Math.random() * 1.5;
            var duration = 2.5 + Math.random() * 2;
            var thickness = 3 + Math.random() * 2;         // strand thickness
            var length = 12 + Math.random() * 16;          // strand length
            var drift = -50 + Math.random() * 100;
            var curl = Math.random() < 0.45;               // ~half curl into a loop

            p.style.left = left + '%';
            p.style.animationDelay = delay + 's';
            p.style.animationDuration = duration + 's';
            p.style.setProperty('--drift', drift + 'px');

            if (curl) {
                // A hollow loop of yarn: colored ring, transparent center.
                var d = length * 0.9;
                p.style.width = d + 'px';
                p.style.height = d + 'px';
                p.style.borderRadius = '50%';
                p.style.border = thickness + 'px solid ' + color;
                p.style.borderRightColor = 'transparent';   // open the loop so it reads as a strand
                p.style.background = 'transparent';
            } else {
                p.style.width = thickness + 'px';
                p.style.height = length + 'px';
                p.style.borderRadius = '999px';              // rounded yarn ends
                p.style.background = color;
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
                return 'Everyone may craft 1 item.';
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
        // Session 43 Hank automa: solo rule — Tangled Cat ALWAYS affects you.
        // (Hank takes no turns, so tangling him would be meaningless anyway.)
        if (Game.state.hankAutoma) {
            var humanIdx = Game.state.activePlayerIndex;
            Game.applyTangledCat(humanIdx);
            UI.renderActionBar();
            UI.showGameMoment({
                badge: 'Event',
                badgeClass: 'moment-event',
                img: 'Square Cards PNG/AR_YarnEvents_Final_0000_Tangled-Cat.png',
                title: 'Tangled Cat',
                desc: 'The cat\'s got <span class="player-name">your</span> yarn!<br>You can\'t Craft on your next turn.'
            }, callback);
            return;
        }
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
                    UI._playerAvatar(p) + '<span>' + p.name + '</span></button>';
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

        // Session 43 Hank automa: solo rule — Hank gets his +1 too, piled onto his
        // most-stocked color (color is cosmetic for him: he crafts any-color and
        // leftover yarn scores 2:1).
        if (player.isAutoma) {
            Game.hankEventYarn(1, 'Friendly Clerk');
            UI._friendlyClerkPlayerIdx++;
            setTimeout(function() {
                UI._friendlyClerkNextPlayer();
            }, AI.DELAY);
            return;
        }

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
