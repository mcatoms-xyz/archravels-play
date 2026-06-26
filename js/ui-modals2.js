/* ui-modals2.js — UI module (split from the Session-40 LIVE monolith).
   ui-core.js declares `var UI`; the other ui-*.js files extend it via Object.assign. */
Object.assign(UI, {
    _yarnSale: {},
    _yarnSaleCallback: null,

    showYarnSaleModal: function(callback) {
        this._yarnSale = {};
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
        var sel = this._yarnSale, need = 3;
        var total = 0; UI.ROYGBP.forEach(function(c) { total += sel[c] || 0; });
        var html = '<div class="xc-help">Tap a color to add &middot; <span class="xc-x-ico">×</span> to clear</div>';
        html += UI._yarnChips({ sel: sel, rule: 'any', need: need, addFn: 'UI._yarnSaleAdd', clearFn: 'UI._yarnSaleClear' });
        html += '<div class="xc-balance' + (total === need ? ' ok' : '') + '"><span class="xc-tot">' + total + '</span> / ' + need + ' yarn' +
                (total === need ? '<span class="xc-hint ok">Ready ✓</span>' : '<span class="xc-hint">Pick ' + (need - total) + ' more</span>') + '</div>';
        html += '<div class="event-pick-controls"><button class="btn btn-primary" onclick="UI._yarnSaleConfirm()" ' + (total === need ? '' : 'disabled') + '>Take Yarn</button></div>';
        this.els.yarnSaleBody.innerHTML = html;
    },

    _yarnSaleAdd: function(color) {
        var sel = this._yarnSale, total = 0; UI.ROYGBP.forEach(function(c) { total += sel[c] || 0; });
        if (total >= 3) return;
        sel[color] = (sel[color] || 0) + 1;
        this._buildYarnSaleBody();
    },

    _yarnSaleClear: function(color) {
        this._yarnSale[color] = 0;
        this._buildYarnSaleBody();
    },

    _yarnSaleConfirm: function() {
        this.els.yarnSaleModal.style.display = 'none';
        var arr = [];
        UI.ROYGBP.forEach(function(c) { var n = UI._yarnSale[c] || 0; for (var i = 0; i < n; i++) arr.push(c); });
        var changed = Game.applyYarnSale(arr);
        UI.renderYarnBowl(changed); UI.renderCraftGrid(); UI.renderSpecialRequests();
        var cb = this._yarnSaleCallback; this._yarnSaleCallback = null;
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
        // You can only SKIP a donate if you have nothing to give.
        var hasYarn = CARDS.COLORS.some(function(c) { return (Game.state.player.yarnBowl[c] || 0) > 0; });
        var skipBtn = this.els.donateModal.querySelector('.confirm-take-buttons button');
        if (skipBtn) skipBtn.style.display = hasYarn ? 'none' : '';
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
        } else {
            // Standard yarn-chip grid, single-pick: tap a color you have → gives it.
            html += UI._yarnChips({
                single: true, rule: 'any',
                maxFor: function(c) { return bowl[c] || 0; },
                sub: function(c) { return 'have ' + (bowl[c] || 0); },
                addFn: 'UI._donatePickColor'
            });
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
                    UI._playerAvatar(p) + '<span>' + p.name + '</span></button>';
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

                var name = opt.type === 'sr' ? opt.sr.name : opt.itemDef.name;

                var img = document.createElement('img');
                img.className = 'craft-slot-img';
                img.src = opt.type === 'sr' ? opt.sr.img : opt.itemDef.img;   // item/SR art, NOT the pattern tile
                img.alt = name;
                slot.appendChild(img);

                var nameEl = document.createElement('div');
                nameEl.className = 'craft-slot-name';
                nameEl.textContent = name;
                slot.appendChild(nameEl);

                var costEl = document.createElement('div');
                costEl.className = 'craft-slot-cost';
                costEl.innerHTML = UI._costDotsHTML(opt);
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
            btn.innerHTML = UI._playerAvatar(p) + '<span>' + p.name + (p.isAI ? ' (CPU)' : '') + '</span>';
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

    // "What you can make" — a modal listing every item + SR the player can
    // currently afford. Tapping one runs the SAME craft path as the on-board
    // strip (onCraftClick / onSRCraftClick). Opened from "View Craft Options".
    // Cost dots for an item/SR option (with data-cb-color so the color letters show).
    // SR: exact dots or a rule label. Item unlearned: exact dots. Item learned: neutral dots x yarnCount.
    _costDotsHTML: function(opt) {
        var dot = function(c) { return '<span class="craft-cost-dot" data-cb-color="' + c + '" style="background:' + CARDS.COLOR_HEX[c] + '"></span>'; };
        var h = '';
        if (opt.sr) {
            var sr = opt.sr, rule = sr.colorRule || 'specific';
            if (rule === 'specific' && sr.yarn) {
                CARDS.COLORS.forEach(function(c) { for (var d = 0; d < (sr.yarn[c] || 0); d++) h += dot(c); });
            } else {
                var lbl = { any: sr.yarnCount + ' any', sameColor: sr.yarnCount + ' same', different: sr.yarnCount + ' diff.', give: 'Give ' + sr.yarnCount }[rule] || '';
                h += '<span class="craft-cost-label">' + lbl + '</span>';
            }
        } else if (opt.tile && !opt.learned) {
            CARDS.COLORS.forEach(function(c) { for (var d = 0; d < (opt.tile.exact[c] || 0); d++) h += dot(c); });
        } else {
            var n = (opt.itemDef && opt.itemDef.yarnCount) || 0;
            for (var k = 0; k < n; k++) h += '<span class="craft-cost-dot craft-cost-dot-neutral"></span>';
        }
        return h;
    },

    showCraftOptionsModal: function() {
        var items = Game.getCraftOptions().filter(function(o) { return o.canAfford; });
        var srs = Game.getSRCraftOptions().filter(function(o) { return o.canAfford; });
        UI._craftOptItems = items; UI._craftOptSRs = srs;
        var ov = document.getElementById('craftOptionsModal');
        if (!ov) { ov = document.createElement('div'); ov.id = 'craftOptionsModal'; ov.className = 'modal-overlay'; document.body.appendChild(ov); }
        var html = '<div class="modal-content"><div class="modal-title">What you can make</div>';
        if (!items.length && !srs.length) {
            html += '<div class="restock-modal-msg" style="font-style:italic;color:var(--text-muted)">Nothing you can afford right now.</div>';
        } else {
            html += '<div class="craft-options-grid">';
            items.forEach(function(o, i) {
                html += '<button class="craft-option-card" onclick="UI._craftOptionPick(\'item\',' + i + ')">' +
                    '<img src="' + o.itemDef.img + '" alt=""><span class="co-name">' + o.itemDef.name + '</span>' +
                    (o.itemDef.points ? '<span class="co-pts">' + o.itemDef.points + ' pts</span>' : '') +
                    '<div class="craft-slot-cost co-cost">' + UI._costDotsHTML(o) + '</div></button>';
            });
            srs.forEach(function(o, i) {
                var sr = o.sr;
                html += '<button class="craft-option-card" onclick="UI._craftOptionPick(\'sr\',' + i + ')">' +
                    '<img src="' + sr.img + '" alt=""><span class="co-name">' + sr.name + (sr.isFavorite ? ' ♥' : '') + '</span>' +
                    '<span class="co-pts">' + sr.points + ' pts</span>' +
                    '<div class="craft-slot-cost co-cost">' + UI._costDotsHTML(o) + '</div></button>';
            });
            html += '</div>';
        }
        html += '<div class="confirm-take-buttons"><button class="btn btn-secondary" onclick="UI._closeCraftOptions()">Close</button></div></div>';
        ov.innerHTML = html;
        ov.style.display = 'flex';
    },

    _craftOptionPick: function(type, idx) {
        this._closeCraftOptions();
        if (type === 'item') { var o = UI._craftOptItems[idx]; if (o) UI.onCraftClick(o); }
        else { var s = UI._craftOptSRs[idx]; if (s) UI.onSRCraftClick(s.sr); }
    },

    _closeCraftOptions: function() {
        var ov = document.getElementById('craftOptionsModal');
        if (ov) ov.style.display = 'none';
    },

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

});
