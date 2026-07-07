/* ui-panels1.js — UI module (split from the Session-40 LIVE monolith).
   ui-core.js declares `var UI`; the other ui-*.js files extend it via Object.assign. */
Object.assign(UI, {
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
            slot.className = 'craft-slot sr-craft-slot ' + (canClick ? 'can-afford craft-slot-pulse' : 'cannot-afford');
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
            // Give N yarn to EACH other player → pick N × (players − 1) total, distributed
            // round-robin in Game.craftSpecialRequest. (Bugfix S40: was only collecting N,
            // so in a 4-player game it asked for 2 and only one opponent got yarn.)
            var otherCount = Math.max(0, (Game.state.players.length || 1) - 1);
            var givePer = sr.yarnCount || 0;
            var giveTotal = givePer * otherCount;
            this._pendingCraft = {
                type: 'sr', srUid: sr.uid,
                itemDef: Object.assign({}, baseItemDef, { colorRule: 'any', yarnCount: giveTotal }),
                yarnToSpend: null,
                context: 'srGive',
            };
            var giveTitle = 'Choose ' + giveTotal + ' Yarn to Give Away' +
                (otherCount > 1 ? ' (' + givePer + ' to each of ' + otherCount + ' players)' : '');
            this.showCraftColorPicker(this._pendingCraft.itemDef, giveTitle);

        } else if (rule === 'specificPlusAny' || rule === 'specificPlusSame' || rule === 'sameColorPlus') {
            // Session 36: compound expansion rules (Koi/Mallard/Dog Bandana/Skelly/Ghost).
            // These pair a FIXED required yarn with a FLEXIBLE pick. The old picker had no
            // target count for the first two → couldn't select anything. Fix: reserve the
            // fixed yarn, open the picker for ONLY the flexible portion (capped by bowl minus
            // the reserve), then merge both on confirm. craftSpecialRequest validates
            // affordability only, so this picker is the rule-enforcer.
            var reserved, flexRule, flexCount, exclude = null;
            if (rule === 'specificPlusAny') {            // e.g. Koi: 3 orange + 2 of any OTHER color
                reserved = Object.assign({}, sr.yarn || {});
                flexRule = 'any'; flexCount = sr.anyCount || 0;
                exclude = Object.keys(reserved);         // the "+N" must be colors NOT in the specific set
            } else if (rule === 'specificPlusSame') {    // e.g. Dog Bandana: 3 purple + 2 of one color (may overlap)
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

        // Session 43: Emergency! craft-order blocked this craft — explain, don't fail silently.
        if (!changed && Game.state._lastCraftBlock === 'emergency') {
            Game.state._lastCraftBlock = null;
            this._pendingCraft = null;
            UI._showEmergencyBlockWarning();
            return;
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
        this.els.craftColorTitle.textContent = overrideTitle || ('Choose Yarn: ' + (ruleLabel[rule] || needed + ' yarn'));
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

        // Show the SR / item being crafted so it's clear what you're making.
        var ccImgWrap = ccContent.querySelector('.craft-color-img-wrap');
        if (!ccImgWrap) {
            ccImgWrap = document.createElement('div');
            ccImgWrap.className = 'craft-color-img-wrap';
            ccContent.insertBefore(ccImgWrap, ccContent.firstChild);
        }
        ccImgWrap.innerHTML = itemDef.img ? '<img class="craft-color-img" src="' + itemDef.img + '" alt="' + (itemDef.name || '') + '">' : '';

        this.els.craftColorModal.style.display = 'flex';
    },

    _craftBowl: function() {
        var p = this._pendingCraft;
        if (p && p.context === 'craftCircle' && typeof p.craftCirclePlayerIndex === 'number') {
            return Game.state.players[p.craftCirclePlayerIndex].yarnBowl;
        }
        return Game.state.player.yarnBowl;
    },

    _buildCraftColorBody: function(itemDef) {
        var bowl = this._craftBowl();
        var alloc = this._craftColorAlloc;
        var needed = itemDef.yarnCount;
        var rule = itemDef.colorRule;
        var isReceive = !!(this._pendingCraft && this._pendingCraft.context === 'frogIt');
        var reserved = (this._pendingCraft && this._pendingCraft.reservedYarn) || {};
        var exclude  = (this._pendingCraft && this._pendingCraft.excludeColors) || [];
        var total = 0; CARDS.COLORS.forEach(function(c) { total += alloc[c] || 0; });

        // 'twoColors' has no chip-disable concept (validated at confirm) → render as 'any'.
        var chipRule = (rule === 'oneColor') ? 'oneColor' : (rule === 'different' ? 'different' : 'any');
        var html = '<div class="xc-help">Tap a color to add &middot; <span class="xc-x-ico">×</span> to clear</div>';
        html += UI._yarnChips({
            sel: alloc, rule: chipRule, need: needed,
            maxFor: function(color) {
                if (exclude.indexOf(color) !== -1) return 0;                 // not allowed
                if (isReceive) return Infinity;                              // frog-it: bound only by count
                var av = (bowl[color] || 0) - (reserved[color] || 0);
                if (av < 0) av = 0;
                if (rule === 'oneColor' && av < needed) return 0;            // need N of ONE color -> must have N
                return av;
            },
            sub: isReceive ? null : function(color) {
                var av = (bowl[color] || 0) - (reserved[color] || 0); return 'have ' + (av < 0 ? 0 : av);
            },
            // Session 50 (Adam): LIVE remaining count rendered ON the token
            // (bowl-tray CSS hides the words + shows this instead)
            tokNum: isReceive ? null : function(color) {
                var av = (bowl[color] || 0) - (reserved[color] || 0) - (alloc[color] || 0);
                return av < 0 ? 0 : av;
            },
            addFn: 'UI._craftChipAdd', clearFn: 'UI._craftChipClear'
        });

        var resTotal = 0; CARDS.COLORS.forEach(function(c) { resTotal += reserved[c] || 0; });
        var valid = this._craftSelValid(itemDef);
        html += '<div class="xc-balance' + (valid ? ' ok' : '') + '"><span class="xc-tot">' + total + '</span> / ' + needed +
                ' yarn to ' + (isReceive ? 'receive' : 'spend') +
                (resTotal > 0 ? ' <span class="xc-hint">(plus ' + this._fixedYarnLabel(reserved) + ' included)</span>' : '') +
                (valid ? '<span class="xc-hint ok">Ready ✓</span>' : (rule === 'twoColors' ? '<span class="xc-hint">use exactly 2 colors</span>' : '')) + UI._selectedYarnChips(alloc) + '</div>';

        this.els.craftColorBody.innerHTML = html;
        // Session 50 (Adam): bowl-SPEND picker skin - the peek bowl with +/- zones.
        // Adam 7/7: RECEIVE flows (Frog It) pull from the SUPPLY, not your bowl,
        // so they get the Bazaar supply-tray skin instead.
        this.els.craftColorBody.classList.remove('ar-bowl-tray', 'ar-supply-tray');
        this.els.craftColorBody.classList.add(isReceive ? 'ar-supply-tray' : 'ar-bowl-tray');
        this.els.craftColorBody.classList.add('cp-count');
        this.els.craftColorBody.setAttribute('data-minus-fn', '_craftChipMinus');
        this.els.craftColorConfirmBtn.disabled = !valid;
    },

    _craftSelValid: function(itemDef) {
        var alloc = this._craftColorAlloc, needed = itemDef.yarnCount;
        var total = 0, distinct = 0;
        CARDS.COLORS.forEach(function(c) { total += alloc[c] || 0; if (alloc[c] > 0) distinct++; });
        if (total !== needed) return false;
        if (itemDef.colorRule === 'twoColors') return distinct === 2;
        return true;
    },

    _craftChipAdd: function(color) {
        var pending = this._pendingCraft; if (!pending) return;
        var def = pending.itemDef, rule = def.colorRule, need = def.yarnCount;
        var alloc = this._craftColorAlloc;
        if ((pending.excludeColors || []).indexOf(color) !== -1) return;
        var isReceive = pending.context === 'frogIt';
        var reserved = pending.reservedYarn || {};
        var avail = isReceive ? Infinity : Math.max(0, (this._craftBowl()[color] || 0) - (reserved[color] || 0));
        if (rule === 'oneColor') {
            if (avail < need) return;                                  // must have the full amount of one color
            CARDS.COLORS.forEach(function(c) { alloc[c] = 0; });
            alloc[color] = need;                                       // auto-fill the whole amount
            this._buildCraftColorBody(def);
            return;
        }
        var total = 0; CARDS.COLORS.forEach(function(c) { total += alloc[c] || 0; });
        if (total >= need) return;
        if (rule === 'different' && (alloc[color] || 0) >= 1) return;
        if ((alloc[color] || 0) >= avail) return;
        alloc[color] = (alloc[color] || 0) + 1;
        this._buildCraftColorBody(def);
    },

    _craftChipMinus: function(color) {
        var pending = this._pendingCraft; if (!pending) return;
        var alloc = this._craftColorAlloc;
        if (!alloc || !alloc[color]) return;
        if (pending.itemDef && pending.itemDef.colorRule === 'oneColor') {
            // oneColor allocs auto-fill: minus clears the whole pick
            CARDS.COLORS.forEach(function(c) { alloc[c] = 0; });
        } else {
            alloc[color]--;
        }
        this._buildCraftColorBody(pending.itemDef);
    },

    _craftChipClear: function(color) {
        this._craftColorAlloc[color] = 0;
        if (this._pendingCraft) this._buildCraftColorBody(this._pendingCraft.itemDef);
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
        var give = this._exchangeGive, receive = this._exchangeReceive;
        var giveTotal = 0, receiveTotal = 0;
        CARDS.COLORS.forEach(function(c) { giveTotal += give[c] || 0; receiveTotal += receive[c] || 0; });

        function chip(side, color, count, sub, plusDisabled) {
            var hex = CARDS.COLOR_HEX[color];
            var cap = color.charAt(0).toUpperCase() + color.slice(1);
            var h = '<span class="xc-chip-wrap">';
            h += '<button class="xc-chip' + (count > 0 ? ' active' : '') + '" ' + (plusDisabled ? 'disabled' : '') +
                 ' onclick="UI._exchangeAdjust(\'' + side + '\',\'' + color + '\',1)" data-cb-color="' + color + '"' +
                 ' aria-label="' + cap + (side === 'give' ? ' to give' : ' to receive') + '">';
            h += '<span class="xc-dot" style="background:' + hex + '" data-cb-color="' + color + '"></span>';
            h += '<span class="xc-name">' + cap + '</span>';
            if (sub != null) h += '<span class="xc-sub">' + sub + '</span>';
            h += '</button>';
            if (count > 0) {
                h += '<span class="xc-badge">' + count + '</span>';
                h += '<button class="xc-remove" onclick="UI._exchangeClear(\'' + side + '\',\'' + color + '\')" aria-label="Clear ' + cap + '">×</button>';
            }
            h += '</span>';
            return h;
        }

        var html = '<div class="xc-help">Tap a color to add &middot; <span class="xc-x-ico">×</span> to clear</div>';

        // GIVE — all six colors (dim the ones you don't have)
        html += '<div class="xc-row"><span class="xc-row-label">Give away</span><div class="xc-chips">';
        UI.ROYGBP.forEach(function(color) {
            var have = bowl[color] || 0, cur = give[color] || 0;
            html += chip('give', color, cur, 'have ' + have, cur >= have);
        });
        html += '</div></div>';

        // RECEIVE — all six, total capped at what you give
        html += '<div class="xc-row"><span class="xc-row-label">Receive</span><div class="xc-chips">';
        UI.ROYGBP.forEach(function(color) {
            html += chip('receive', color, receive[color] || 0, null, receiveTotal >= giveTotal);
        });
        html += '</div></div>';

        var balanced = giveTotal > 0 && giveTotal === receiveTotal;
        html += '<div class="xc-balance' + (balanced ? ' ok' : '') + '">';
        html += '<span class="xc-tot">' + giveTotal + '</span> give <span class="xc-arrow">⇄</span> receive <span class="xc-tot">' + receiveTotal + '</span>';
        if (giveTotal === 0) html += '<span class="xc-hint">Tap yarn above to give</span>';
        else if (receiveTotal < giveTotal) html += '<span class="xc-hint">Pick ' + (giveTotal - receiveTotal) + ' more to receive</span>';
        else html += '<span class="xc-hint ok">Ready ✓</span>';
        html += '</div>';

        this.els.exchangeBody.innerHTML = html;
        this.els.exchangeConfirmBtn.disabled = !balanced;
    },

    _exchangeSum: function(o) { var t = 0; CARDS.COLORS.forEach(function(c) { t += o[c] || 0; }); return t; },

    _exchangeAdjust: function(side, color, delta) {
        var bowl = Game.state.player.yarnBowl;
        if (side === 'give') {
            var max = bowl[color] || 0;
            this._exchangeGive[color] = Math.max(0, Math.min(max, (this._exchangeGive[color] || 0) + delta));
            this._trimReceive();
        } else {
            var headroom = Math.max(0, this._exchangeSum(this._exchangeGive) - this._exchangeSum(this._exchangeReceive));
            this._exchangeReceive[color] = Math.max(0, Math.min((this._exchangeReceive[color] || 0) + headroom, (this._exchangeReceive[color] || 0) + delta));
        }
        this._buildExchangeBody();
    },

    // × clears that color entirely.
    _exchangeClear: function(side, color) {
        if (side === 'give') { this._exchangeGive[color] = 0; this._trimReceive(); }
        else { this._exchangeReceive[color] = 0; }
        this._buildExchangeBody();
    },

    // keep total received from exceeding total given
    _trimReceive: function() {
        var over = this._exchangeSum(this._exchangeReceive) - this._exchangeSum(this._exchangeGive);
        for (var i = CARDS.COLORS.length - 1; i >= 0 && over > 0; i--) {
            var c = CARDS.COLORS[i];
            while (over > 0 && this._exchangeReceive[c] > 0) { this._exchangeReceive[c]--; over--; }
        }
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

            // Mobile (cap-native): tapping the card goes STRAIGHT to the craft module
            // for this SR (the hover tooltip is hidden in the app via CSS). onSRCraftClick
            // self-guards on craft availability, so it's safe to wire unconditionally.
            (function(srData) {
                card.addEventListener('click', function() {
                    if (document.body.classList.contains('cap-native')) UI.showSRDetailModal(srData);
                });
            })(sr);

            el.appendChild(card);
        });
    },

    // Mobile: a clean detail/craft sheet for a Special Request — always shows the
    // image, points and yarn requirement; offers Craft when the craft action is live
    // and you can afford it, otherwise tells you what's needed.
    _srDetailSr: null,
    showSRDetailModal: function(sr) {
        this._srDetailSr = sr;
        var matchOpt = null;
        Game.getSRCraftOptions().forEach(function(o) { if (o.sr.uid === sr.uid) matchOpt = o; });
        var phase = Game.state.phase;
        var craftEnabled = (phase === 'playerActions' || phase === 'finalCraft') && Game.getAvailableActions().canCraft;
        var canCraft = !!(craftEnabled && matchOpt && matchOpt.canAfford);
        var dots = (UI._renderSRYarnDots ? UI._renderSRYarnDots(sr) : '');
        var reqText = (UI._describeSRYarn ? UI._describeSRYarn(sr) : '');
        var actionHtml = craftEnabled
            ? '<button class="btn btn-cta sr-detail-craft"' + (canCraft ? '' : ' disabled') + ' onclick="UI.closeSRDetailModal();UI.onSRCraftClick(UI._srDetailSr)">' + (canCraft ? 'Craft this' : 'Not enough yarn') + '</button>'
            : '<div class="sr-detail-note">Choose the <b>Craft</b> action first to make this.</div>';
        var old = document.getElementById('srDetailOverlay'); if (old) old.parentNode.removeChild(old);
        var ov = document.createElement('div');
        ov.className = 'modal-overlay'; ov.id = 'srDetailOverlay'; ov.style.display = 'flex';
        ov.onclick = function(e) { if (e.target === ov) UI.closeSRDetailModal(); };
        ov.innerHTML = '<div class="modal-content sr-detail-content">' +
            '<img class="sr-detail-img" src="' + sr.img + '" alt="' + sr.name + '">' +
            '<div class="sr-detail-name">' + sr.name + (sr.isFavorite ? ' <span style="color:#ff6b6b">♥</span>' : '') + '</div>' +
            '<div class="sr-detail-pts">' + sr.points + ' pts' + (sr.isFavorite ? ' · +5 bonus' : '') + '</div>' +
            '<div class="sr-detail-cost">' + (dots ? '<div class="sr-detail-dots">' + dots + '</div>' : '') + (reqText ? '<div class="sr-detail-req">' + reqText + '</div>' : '') + '</div>' +
            actionHtml +
            '<button class="btn btn-ghost sr-detail-close" onclick="UI.closeSRDetailModal()">Close</button>' +
        '</div>';
        document.body.appendChild(ov);
    },
    closeSRDetailModal: function() {
        var o = document.getElementById('srDetailOverlay');
        if (o) o.parentNode.removeChild(o);
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
        // Character ribbon banner as the drawer header (matches the opponent panel).
        var foCharDef = charId ? CARDS.getCharacter(charId) : null;
        // Fabric background matches the player's board color (per character type).
        var foDrawerEl = document.getElementById('foDrawer');
        if (foDrawerEl) {
            var fabType = (foCharDef && foCharDef.type) ? foCharDef.type : 'hank';
            foDrawerEl.style.setProperty('--fo-fabric', "url('Other Assets/fo/fabric-" + fabType + ".jpg')");
        }
        // Query the header directly (NOT titleEl.parentNode — the pill gets moved out below,
        // which would otherwise point this at the wrong element on re-render).
        var foHeaderEl = foDrawerEl ? foDrawerEl.querySelector('.fo-drawer-header') : null;
        if (foHeaderEl) {
            var foBanner = document.getElementById('foDrawerBanner');
            if (foCharDef && foCharDef.banner) {
                foHeaderEl.classList.add('has-banner');
                if (!foBanner) {
                    foBanner = document.createElement('img');
                    foBanner.id = 'foDrawerBanner';
                    foBanner.className = 'fo-banner-img';
                    foHeaderEl.insertBefore(foBanner, foHeaderEl.firstChild);
                }
                foBanner.src = foCharDef.banner;
                foBanner.alt = foCharDef.name;
                // App: move the "Finished Objects" tag onto the fabric (it's absolute-positioned
                // bottom-left over the wood). Idempotent — only move it once.
                if (document.body.classList.contains('cap-native') && titleEl && titleEl.parentNode !== foDrawerEl) {
                    foDrawerEl.appendChild(titleEl);
                    titleEl.classList.add('fo-title-onfabric');
                }
            } else {
                foHeaderEl.classList.remove('has-banner');
                if (foBanner && foBanner.parentNode) foBanner.parentNode.removeChild(foBanner);
                if (titleEl && titleEl.classList.contains('fo-title-onfabric')) {
                    titleEl.classList.remove('fo-title-onfabric');
                    foHeaderEl.insertBefore(titleEl, foHeaderEl.firstChild);
                }
            }
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
        // Tap-outside backdrop — guarantees a way to close the (full-screen on mobile) drawer.
        var bd = document.getElementById('foDrawerBackdrop');
        if (!bd) {
            bd = document.createElement('div');
            bd.id = 'foDrawerBackdrop';
            bd.className = 'fo-drawer-backdrop';
            bd.addEventListener('click', function() { UI.toggleFinishedDrawer(false); });
            document.body.appendChild(bd);
        }
        if (shouldOpen) {
            drawer.classList.add('open');
            bd.classList.add('open');
            document.body.classList.add('fo-drawer-active');
        } else {
            drawer.classList.remove('open');
            bd.classList.remove('open');
            document.body.classList.remove('fo-drawer-active');
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

});
