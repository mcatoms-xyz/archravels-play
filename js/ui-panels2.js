/* ui-panels2.js — UI module (split from the Session-40 LIVE monolith).
   ui-core.js declares `var UI`; the other ui-*.js files extend it via Object.assign. */
Object.assign(UI, {
    renderProjectStrip: function() {
        var overlay   = this.els.projectBoardOverlay;
        var deckBadge = this.els.projectDeckBadge;
        if (!overlay) return;

        var display = Game.state.projectDisplay || [];
        overlay.innerHTML = '';

        // Always render 3 slots; empty slots show as dashed placeholders
        for (var i = 0; i < 3; i++) {
            var project = display[i] || null;
            var slot    = document.createElement('div');

            if (!project) {
                slot.className = 'project-overlay-slot project-slot-empty';
                overlay.appendChild(slot);
                continue;
            }

            var canComplete = Game.canAffordProject(project);
            slot.className = 'project-overlay-slot' +
                             (canComplete ? ' project-completable' : '');
            // Session 40: during restock, clicking a completable project opens the
            // Finish-a-Project picker directly.
            if (Game.state.phase === 'restock' && UI._restockDone && canComplete) {
                slot.classList.add('project-restock-clickable');
                slot.addEventListener('click', function(){ UI.showFinishProjectModal(); });
                slot.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); UI.showFinishProjectModal(); } });
            }
            slot.setAttribute('tabindex', '0');
            slot.setAttribute('aria-label', project.name + ' — ' + project.points + ' points' +
                (canComplete ? ' (completable!)' : ''));

            // Card image fills the slot
            var img = document.createElement('img');
            img.src = project.img;
            img.alt = project.name + ' project card';
            slot.appendChild(img);

            // Small points badge — bottom-right corner
            var pts = document.createElement('div');
            pts.className = 'project-pts-overlay';
            pts.textContent = project.points + ' pts';
            slot.appendChild(pts);

            // Session 19: Hover preview — just the enlarged card image
            (function(proj, parentSlot) {
                var preview = document.createElement('div');
                preview.className = 'project-hover-preview';
                var prevImg = document.createElement('img');
                prevImg.src = proj.img;
                prevImg.alt = proj.name;
                preview.appendChild(prevImg);

                parentSlot.appendChild(preview);

                parentSlot.addEventListener('mouseenter', function() {
                    preview.classList.add('preview-visible');
                });
                parentSlot.addEventListener('mouseleave', function() {
                    preview.classList.remove('preview-visible');
                });
            })(project, slot);

            overlay.appendChild(slot);
        }

        // Session 15c: Single deck count — on the card back only (removed redundant deckBadge text)
        if (deckBadge) deckBadge.textContent = '';
        var projDeckCount = document.getElementById('projectDeckCount');
        if (projDeckCount) {
            var pDeckLeft = Game.state.projectDeck ? Game.state.projectDeck.length : 0;
            projDeckCount.textContent = pDeckLeft > 0 ? pDeckLeft + ' in deck' : 'empty';
        }
    },


    /* =========================================================
       SESSION 7: FINISH PROJECT MODAL
       Shows only completable projects. Player clicks one to finish.
       ========================================================= */

    showFinishProjectModal: function() {
        var completable = Game.getCompletableProjects();
        var body = this.els.finishProjectBody;
        if (!body) return;

        var html = '<div class="restock-modal-msg">Turn in items to complete a project and earn points.</div>';
        html += '<div class="finish-project-list">';

        completable.forEach(function(project) {
            var reqs = project.requirements;
            var reqParts = Object.keys(reqs).map(function(itemId) {
                var count = reqs[itemId];
                var def = CARDS.getItem(itemId);
                return (count > 1 ? count + '× ' : '') + (def ? def.name : itemId);
            });

            html += '<div class="finish-project-row" onclick="UI._onFinishProjectClick(\'' + project.uid + '\')">';
            html += '<img class="finish-project-img" src="' + project.img + '" alt="' + project.name + '">';
            html += '<div class="finish-project-info">';
            html += '<div class="finish-project-name">' + project.name + '</div>';
            html += '<div class="finish-project-req">Needs: ' + reqParts.join(', ') + '</div>';
            html += '<div class="finish-project-pts">' + project.points + ' pts</div>';
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
        body.innerHTML = html;
        this.els.finishProjectModal.style.display = 'flex';
    },

    _onFinishProjectClick: function(projectUid) {
        // Session 17: Capture project data before it's removed from display
        var project = Game.state.projectDisplay.find(function(p) { return p.uid === projectUid; });

        var pts = Game.finishProject(projectUid);
        if (pts === null) return;

        this.els.finishProjectModal.style.display = 'none';

        // Session 17: Show celebration game moment
        var projPlayer = Game.state.player;
        UI.showGameMoment({
            badge: 'Project Complete!',
            badgeClass: 'moment-project',
            img: project ? project.img : '',
            title: project ? project.name : 'Project',
            desc: UI._getProjectDesc(project, projPlayer.name, projPlayer.isAI),
            points: pts
        }, function() {
            // Session 10: Full re-render after finishing project
            UI.renderFinishedObjects();
            UI.renderProjectStrip();
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            UI.renderYarnBowl();
            UI.renderActionBar();
        });
    },

    onCancelFinishProject: function() {
        this.els.finishProjectModal.style.display = 'none';
    },


    /* =========================================================
       SESSION 7: LEARN PATTERN MODAL
       Shows all unlearned tiles. Player clicks one to flip it.
       ========================================================= */

    showLearnPatternModal: function() {
        var learnable = Game.getLearnablePatterns();
        var body = this.els.learnPatternBody;
        if (!body) return;

        var html = '<div class="restock-modal-msg">' +
            'Trade in a finished item to flip its pattern tile to the general side. ' +
            'After flipping, you can craft that item with any valid yarn colors.' +
            '</div>';
        html += '<div class="learn-pattern-list">';

        learnable.forEach(function(tile) {
            var itemDef = CARDS.getItem(tile.itemId);
            var itemName = itemDef ? itemDef.name : tile.itemId;

            // Show exact colors required (front side)
            var exactParts = Object.keys(tile.exact).map(function(color) {
                var count = tile.exact[color];
                return count + ' ' + color.charAt(0).toUpperCase() + color.slice(1);
            });

            html += '<div class="learn-tile-row" onclick="UI._onLearnPatternClick(\'' + tile.id + '\')">';
            html += '<div class="learn-tile-imgs">';
            html += '<img class="learn-tile-img" src="' + tile.img + '" alt="' + itemName + ' pattern (exact)">';
            html += '<span class="learn-tile-arrow">→</span>';
            html += '<img class="learn-tile-img" src="' + tile.backImg + '" alt="' + itemName + ' (general)">';
            html += '</div>';
            html += '<div class="learn-tile-info">';
            html += '<div class="learn-tile-name">' + itemName + '</div>';
            // Trade-in cost — the item consumed from Finished Objects
            html += '<div class="learn-tile-trade-in">🔄 Trade in: 1 finished ' + itemName + '</div>';
            html += '<div class="learn-tile-cost">Was: ' + exactParts.join(', ') + '</div>';
            if (itemDef) {
                html += '<div class="learn-tile-after">After: ' + Game.generalYarnNeeded(itemDef) + '</div>';
            }
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
        body.innerHTML = html;
        this.els.learnPatternModal.style.display = 'flex';
    },

    _onLearnPatternClick: function(tileId) {
        var success = Game.learnPattern(tileId);
        if (!success) return;

        this.els.learnPatternModal.style.display = 'none';
        // Consumed an item from Finished Objects — refresh all affected panels
        UI.renderFinishedObjects();
        UI.renderProjectStrip();   // completable status may have changed
        UI.renderCraftGrid();
        UI.renderActionBar();
    },

    onCancelLearnPattern: function() {
        this.els.learnPatternModal.style.display = 'none';
    },


    /* =========================================================
       SESSION 7: FROG IT MODAL
       Shows all crafted regular items. Player clicks one to frog.
       - Exact pattern: return stored yarnSpent, go to confirm.
       - General/learned pattern: open color picker for yarn choice.
       ========================================================= */

    showFrogItModal: function() {
        var frogable = Game.getFrogItItems();
        var body = this.els.frogItBody;
        if (!body) return;

        var html = '<div class="restock-modal-msg">Return a crafted item and get your yarn back.</div>';
        html += '<div class="frog-list">';

        frogable.forEach(function(entry) {
            var item = entry.item;
            var idx  = entry.index;

            // Build yarn info text
            var yarnInfo = '';
            if (!item.patternLearned && item.yarnSpent) {
                // Exact refund — show what yarn comes back
                var parts = Object.keys(item.yarnSpent).map(function(c) {
                    return item.yarnSpent[c] + ' ' + c.charAt(0).toUpperCase() + c.slice(1);
                });
                yarnInfo = 'Get back: ' + parts.join(', ');
            } else {
                // General refund — player chooses
                yarnInfo = 'Get back: ' + (item.yarnCount || '?') + ' yarn (you choose)';
            }

            html += '<div class="frog-row" onclick="UI._onFrogItemClick(' + idx + ')">';
            html += '<img class="frog-item-img" src="' + item.img + '" alt="' + item.name + '">';
            html += '<div class="frog-item-info">';
            html += '<div class="frog-item-name">' + item.name + ' (' + item.points + ' pts)</div>';
            html += '<div class="frog-item-yarn">' + yarnInfo + '</div>';
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
        body.innerHTML = html;
        this.els.frogItModal.style.display = 'flex';
    },

    _onFrogItemClick: function(itemIndex) {
        this.els.frogItModal.style.display = 'none';

        var items = Game.state.player.items;
        var item  = items[itemIndex];
        if (!item) return;

        if (!item.patternLearned && item.yarnSpent) {
            // Exact refund — go straight to confirm
            this._pendingCraft = {
                context:       'frogIt',
                frogItemIndex: itemIndex,
                itemDef:       { id: item.id, name: item.name, img: item.img, points: item.points },
                yarnToSpend:   Object.assign({}, item.yarnSpent),
            };
            this.showCraftConfirm();
        } else {
            // General/learned — player chooses yarn to get back.
            // Session 36 fix: a refund is "receive N yarn of ANY colors you choose" — it is
            // NOT bound by the item's craft color-rule (e.g. one-color), and must NOT be
            // capped by what's currently in the bowl. Using the item's rule + a spend-style
            // cap could leave the picker with no selectable colors (Done stuck greyed out).
            var pickerItemDef = {
                id: item.id, name: item.name, img: item.img, points: item.points,
                colorRule: 'any',
                yarnCount: item.yarnCount || 3,
            };
            this._pendingCraft = {
                context:       'frogIt',
                frogItemIndex: itemIndex,
                itemDef:       pickerItemDef,
                yarnToSpend:   null,
            };
            this.showCraftColorPicker(pickerItemDef, 'Choose Yarn to Receive Back');
        }
    },

    onCancelFrogIt: function() {
        this.els.frogItModal.style.display = 'none';
    },


    /* =========================================================
       SESSION 22: OFF-TURN PLAYER CONTEXT
       Builds contextual info panels shown inside modals when
       a player acts during another player's turn.
       Two modes:
         'color-pick' → yarn bowl + patterns + SRs + instruction text
         'craft-circle' → yarn bowl + project progress
       ========================================================= */

    /**
     * Build the off-turn context HTML for a specific player.
     * @param {Object} player — player object from Game.state.players[]
     * @param {string} mode — 'color-pick' or 'craft-circle'
     * @param {string} [instructionText] — e.g. "Choose 1 Yarn" (only for color-pick mode)
     * @param {boolean} [force] — if true, show context even for the active player
     * @returns {string} HTML string to inject into a modal, or '' if skipped
     */
    _buildOffTurnContext: function(player, mode, instructionText, force) {
        if (!player) return '';
        if (!force) {
            // Only show context when this player is NOT the active turn player
            var activeIdx = Game.state.activePlayerIndex;
            var playerIdx = Game.state.players.indexOf(player);
            if (playerIdx === activeIdx) return '';
            // Also skip in single-player games
            if (Game.state.playerCount <= 1) return '';
        }

        var bowl = player.yarnBowl;
        var html = '<div class="otc-wrap">';

        // Player name header
        html += '<div class="otc-player-name">' + player.name + '</div>';

        // Yarn bowl strip
        var total = 0;
        CARDS.COLORS.forEach(function(c) { total += (bowl[c] || 0); });
        html += '<div class="otc-bowl">';
        html += '<div class="otc-bowl-header">';
        html += '<div class="otc-bowl-label">Your Yarn Bowl</div>';
        html += '<div class="otc-bowl-total">' + total + ' total</div>';
        html += '</div>';
        html += '<div class="otc-bowl-chips">';
        CARDS.COLORS.forEach(function(color) {
            var count = bowl[color] || 0;
            html += '<span class="otc-chip' + (count === 0 ? ' zero' : '') + '">';
            html += '<img src="Wood Yarn Tokens PNG/' + color + '.png" alt="' + color + '">';
            html += '<span>' + count + '</span>';
            html += '</span>';
        });
        html += '</div></div>';

        if (mode === 'color-pick') {
            // Your Patterns — show unlearned pattern tiles with have/short dots
            var tiles = player.patternTiles || [];
            var unlearnedTiles = tiles.filter(function(t) { return !t.learned; });

            if (unlearnedTiles.length > 0) {
                html += '<div class="otc-section-label">Your Patterns</div>';
                html += '<div class="otc-pattern-grid">';
                unlearnedTiles.forEach(function(tile) {
                    var itemDef = CARDS.getItem(tile.itemId);
                    if (!itemDef) return;
                    var exact = tile.exact;
                    // Check if all colors are met
                    var allMet = true;
                    var dotHtml = '';
                    CARDS.COLORS.forEach(function(color) {
                        if (!exact[color]) return;
                        var needed = exact[color];
                        var have = bowl[color] || 0;
                        for (var i = 0; i < needed; i++) {
                            var isHave = i < have;
                            dotHtml += '<span class="otc-dot ' + (isHave ? 'have' : 'short') + '" style="background:' + CARDS.COLOR_HEX[color] + '"></span>';
                            if (!isHave) allMet = false;
                        }
                    });
                    html += '<div class="otc-need-card' + (allMet ? ' ready' : '') + '">';
                    html += '<img src="' + itemDef.img + '" alt="' + itemDef.name + '">';
                    html += '<div class="otc-need-card-info">';
                    html += '<span class="otc-need-card-name">' + itemDef.name + '</span>';
                    html += '<div class="otc-need-card-dots">' + dotHtml + '</div>';
                    html += '</div></div>';
                });
                html += '</div>';
            }

            // Special Requests — show held SRs with have/short dots
            var srs = player.specialRequests || [];
            if (srs.length > 0) {
                html += '<div class="otc-section-label">Special Requests</div>';
                html += '<div class="otc-sr-grid">';
                srs.forEach(function(sr) {
                    var yarn = sr.yarn || {};
                    var rule = sr.colorRule || 'specific';
                    var allMet = true;
                    var dotHtml = '';

                    // Build dots for specific yarn costs
                    CARDS.COLORS.forEach(function(color) {
                        if (!yarn[color]) return;
                        var needed = yarn[color];
                        var have = bowl[color] || 0;
                        for (var i = 0; i < needed; i++) {
                            var isHave = i < have;
                            dotHtml += '<span class="otc-dot ' + (isHave ? 'have' : 'short') + '" style="background:' + CARDS.COLOR_HEX[color] + '"></span>';
                            if (!isHave) allMet = false;
                        }
                    });

                    // For non-specific rules, add text for the flexible portion
                    var ruleLabels = {
                        any: sr.yarnCount + ' any',
                        sameColor: sr.yarnCount + ' same',
                        different: sr.yarnCount + ' diff',
                        give: sr.yarnCount + ' give',
                    };
                    if (ruleLabels[rule]) {
                        // Entirely non-specific — show label instead of dots
                        var totalYarn = 0;
                        CARDS.COLORS.forEach(function(c) { totalYarn += (bowl[c] || 0); });
                        allMet = totalYarn >= (sr.yarnCount || 0);
                        dotHtml = '<span style="font-size:10px;color:var(--text-muted)">' + ruleLabels[rule] + '</span>';
                    } else if (rule === 'sameColorPlus' && sr.plusYarn) {
                        // Has specific plusYarn + N same color
                        var sameCount = (sr.yarnCount || 0) - 1;
                        dotHtml += '<span style="font-size:10px;color:var(--text-muted)">+' + sameCount + ' same</span>';
                        allMet = false; // Can't easily check
                    } else if (rule === 'specificPlusAny' && sr.anyCount) {
                        dotHtml += '<span style="font-size:10px;color:var(--text-muted)">+' + sr.anyCount + ' any</span>';
                        allMet = false;
                    } else if (rule === 'specificPlusSame' && sr.sameCount) {
                        dotHtml += '<span style="font-size:10px;color:var(--text-muted)">+' + sr.sameCount + ' same</span>';
                        allMet = false;
                    }

                    html += '<div class="otc-need-card' + (allMet ? ' ready' : '') + '">';
                    html += '<img src="' + (sr.img || '') + '" alt="' + sr.name + '">';
                    html += '<div class="otc-need-card-info">';
                    html += '<span class="otc-need-card-name">' + sr.name + '</span>';
                    html += '<div class="otc-need-card-dots">' + dotHtml + '</div>';
                    html += '</div></div>';
                });
                html += '</div>';
            }

            // Instruction text divider
            if (instructionText) {
                html += '<div class="otc-pick-instruction">' + instructionText + '</div>';
            }

        } else if (mode === 'craft-circle') {
            // Available Projects — show face-up projects with item have/need states
            var projects = Game.state.projectDisplay || [];
            if (projects.length > 0) {
                html += '<div class="otc-section-label">Available Projects</div>';
                html += '<div class="otc-projects">';
                projects.forEach(function(proj) {
                    var reqs = proj.requirements || {};
                    var haveCount = 0;
                    var totalCount = 0;
                    var itemsHtml = '';
                    // Count player's items by type
                    var playerItems = {};
                    (player.items || []).forEach(function(item) {
                        var iid = typeof item === 'string' ? item : item.id;
                        playerItems[iid] = (playerItems[iid] || 0) + 1;
                    });
                    // Build item icons
                    var usedFromPlayer = {};
                    for (var itemId in reqs) {
                        if (!reqs.hasOwnProperty(itemId)) continue;
                        var needed = reqs[itemId];
                        totalCount += needed;
                        var available = playerItems[itemId] || 0;
                        var alreadyUsed = usedFromPlayer[itemId] || 0;
                        for (var i = 0; i < needed; i++) {
                            var itemDef = CARDS.getItem(itemId);
                            var hasIt = (alreadyUsed + i) < available;
                            if (hasIt) haveCount++;
                            itemsHtml += '<span class="otc-proj-item ' + (hasIt ? 'have' : 'need') + '">';
                            itemsHtml += '<img src="' + (itemDef ? itemDef.img : '') + '" alt="' + itemId + '">';
                            itemsHtml += '</span>';
                        }
                        usedFromPlayer[itemId] = alreadyUsed + needed;
                    }
                    html += '<div class="otc-project-row">';
                    html += '<span class="otc-project-name">' + proj.name + '</span>';
                    html += '<div class="otc-project-items">' + itemsHtml + '</div>';
                    html += '<span class="otc-project-count">' + haveCount + '/' + totalCount + '</span>';
                    html += '</div>';
                });
                html += '</div>';
            }
        }

        html += '</div>';
        return html;
    },


    /* =========================================================
       COLOR PICKER MODAL
       ========================================================= */

    _colorPickerCallback: null,

    buildColorPicker: function() {
        var grid = this.els.colorGrid;
        grid.innerHTML = '';

        CARDS.COLORS.forEach(function(color) {
            var btn = document.createElement('button');
            btn.className = 'color-pick-btn';
            btn.style.backgroundColor = CARDS.COLOR_HEX[color];
            btn.setAttribute('data-cb-color', color);
            btn.setAttribute('aria-label', 'Pick ' + color.charAt(0).toUpperCase() + color.slice(1) + ' yarn');
            btn.textContent = color.charAt(0).toUpperCase() + color.slice(1);
            btn.addEventListener('click', function() {
                UI.onColorPick(color);
            });
            grid.appendChild(btn);
        });
    },

    /**
     * @param {function} callback — called with the chosen color
     * @param {string} [title] — modal title text
     * @param {Object} [player] — if provided, context is injected
     * @param {boolean} [forceContext] — if true, show context even for active player
     */
    showColorPicker: function(callback, title, player, forceContext) {
        this._colorPickerCallback = callback;
        var titleEl = this.els.colorModal.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title || 'Choose a Yarn Color';
        }
        // Session 24: Use static otc-container from HTML (replaces dynamic creation)
        var contextContainer = document.getElementById('colorPickerContext');
        if (player && contextContainer) {
            var instructionText = title || 'Choose a Yarn Color';
            try {
                contextContainer.innerHTML = this._buildOffTurnContext(player, 'color-pick', instructionText, forceContext);
            } catch (e) {
                contextContainer.innerHTML = '';
            }
            // If context was rendered, hide the main title (player name is in context)
            if (contextContainer.innerHTML !== '') {
                if (titleEl) titleEl.style.display = 'none';
            } else {
                if (titleEl) titleEl.style.display = '';
            }
        } else {
            if (contextContainer) contextContainer.innerHTML = '';
            if (titleEl) titleEl.style.display = '';
        }
        // Session 35: reset multi-pick progress; _collectWildChoices repopulates it.
        var progReset = document.getElementById('colorPickerProgress');
        if (progReset) { progReset.innerHTML = ''; progReset.style.display = 'none'; }
        this.els.colorModal.style.display = 'flex';
    },

    onColorPick: function(color) {
        this.els.colorModal.style.display = 'none';
        if (this._colorPickerCallback) {
            var cb = this._colorPickerCallback;
            this._colorPickerCallback = null;
            cb(color);
        }
    },


    /* =========================================================
       SESSION 12: PLAYER AVATAR STRIP
       Horizontal strip of small player cards below the nav bar.
       Click a non-active player to open the opponent board viewer.
       ========================================================= */

    /**
     * Render the player avatar strip. Called from renderAll() and
     * renderPlayerIndicator() so it stays in sync with turn changes.
     */
    renderPlayerStrip: function() {
        var strip = document.getElementById('playerStrip');
        if (!strip) return;

        var players = Game.state.players;
        if (!players || players.length < 2) {
            strip.style.display = 'none';
            var gl0 = document.querySelector('.game-layout');
            if (gl0) gl0.classList.remove('has-strip');
            return;
        }

        strip.style.display = 'flex';
        var gl = document.querySelector('.game-layout');
        if (gl) gl.classList.add('has-strip');
        this.closePlayerMenu();
        strip.innerHTML = '';

        var activeIdx = Game.state.activePlayerIndex;

        // Session 40: collapse to "active card + menu" when there are more than two
        // players or the screen is narrow (mobile) — otherwise the fixed-width cards
        // crush the nav bar. 2 players on a wide screen keep both cards inline.
        var narrow = (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 760);
        var collapse = players.length > 2 || narrow;

        if (!collapse) {
            for (var i = 0; i < players.length; i++) {
                strip.appendChild(this._buildPlayerStripCard(i, i === activeIdx));
            }
            return;
        }

        // Active player's card stays visible.
        strip.appendChild(this._buildPlayerStripCard(activeIdx, true));

        // Everyone else folds into a dropdown.
        var others = [];
        for (var j = 0; j < players.length; j++) { if (j !== activeIdx) others.push(j); }

        var wrap = document.createElement('div');
        wrap.className = 'player-strip-more-wrap';

        var btn = document.createElement('button');
        btn.className = 'player-strip-more';
        btn.type = 'button';
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Show ' + others.length + ' other player' + (others.length > 1 ? 's' : ''));
        btn.innerHTML = '<span class="psm-count">+' + others.length + '</span><span class="psm-caret">▾</span>';
        btn.onclick = function(e) { e.stopPropagation(); UI.togglePlayerMenu(); };
        wrap.appendChild(btn);

        var menu = document.createElement('div');
        menu.className = 'player-strip-menu';
        menu.id = 'playerStripMenu';
        menu.style.display = 'none';
        var hdr = document.createElement('div');
        hdr.className = 'psm-head';
        hdr.textContent = 'Players — tap to view a board';
        menu.appendChild(hdr);
        others.forEach(function(idx) {
            var c = UI._buildPlayerStripCard(idx, false);
            c.classList.add('in-menu');
            c.addEventListener('click', function() { UI.closePlayerMenu(); });
            menu.appendChild(c);
        });
        wrap.appendChild(menu);
        strip.appendChild(wrap);
    },

    // Build one player card (used inline and inside the collapse menu). Clicking it
    // opens that player's board drawer (showOpponentPanel).
    _buildPlayerStripCard: function(idx, isActive) {
        var p = Game.state.players[idx];
        var typeIcon = UI._typeIcons[p.characterType] || '';

        var card = document.createElement('div');
        card.className = 'player-strip-card' + (isActive ? ' active' : '');

        var accentColor = UI._typeAccentColors[p.characterType] || 'rgba(255,255,255,0.2)';
        card.style.borderLeftColor = accentColor;
        if (!isActive) {
            card.style.background = 'rgba(' +
                parseInt(accentColor.slice(1,3),16) + ',' +
                parseInt(accentColor.slice(3,5),16) + ',' +
                parseInt(accentColor.slice(5,7),16) + ',0.12)';
        }

        if (typeIcon) {
            var iconImg = document.createElement('img');
            iconImg.className = 'player-strip-icon';
            iconImg.src = typeIcon;
            iconImg.alt = p.characterType;
            card.appendChild(iconImg);
        }

        var info = document.createElement('div');
        info.className = 'player-strip-info';

        var nameRow = document.createElement('div');
        nameRow.className = 'player-strip-name';
        nameRow.textContent = p.name;
        if (p.isAI) {
            var badge = document.createElement('span');
            badge.className = 'player-strip-ai-badge';
            badge.textContent = 'CPU';
            nameRow.appendChild(badge);
        }
        info.appendChild(nameRow);

        var detail = document.createElement('div');
        detail.className = 'player-strip-detail';
        var itemCount = (p.items ? p.items.length : 0) +
                        (p.craftedSpecialRequests ? p.craftedSpecialRequests.length : 0) +
                        (p.projects ? p.projects.length : 0);
        var yarnTotal = 0;
        if (p.yarnBowl) {
            CARDS.COLORS.forEach(function(c) { yarnTotal += (p.yarnBowl[c] || 0); });
        }
        var scoreData = Game.calculateFinalScore(p);
        var currentPts = scoreData ? scoreData.total : 0;
        detail.textContent = currentPts + ' pts · ' + itemCount + ' items · ' + yarnTotal + ' yarn';
        info.appendChild(detail);

        var dots = document.createElement('div');
        dots.className = 'player-strip-yarn-dots';
        CARDS.COLORS.forEach(function(color) {
            var count = (p.yarnBowl && p.yarnBowl[color]) || 0;
            if (count > 0) {
                var dot = document.createElement('div');
                dot.className = 'player-strip-yarn-dot player-strip-dot';
                dot.style.backgroundColor = CARDS.COLOR_HEX[color];
                dot.setAttribute('data-cb-color', color);
                dot.title = color + ': ' + count;
                dots.appendChild(dot);
            }
        });
        info.appendChild(dots);

        card.appendChild(info);

        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', p.name + (p.isAI ? ' (CPU)' : '') +
            ' — ' + currentPts + ' points, ' + itemCount + ' items, ' + yarnTotal + ' yarn' +
            (isActive ? ' (active player)' : ''));

        card.style.cursor = 'pointer';
        card.addEventListener('click', function() { UI.showOpponentPanel(idx); });
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); UI.showOpponentPanel(idx); }
        });

        return card;
    },

    togglePlayerMenu: function() {
        var menu = document.getElementById('playerStripMenu');
        if (!menu) return;
        if (menu.style.display !== 'none') { this.closePlayerMenu(); return; }
        menu.style.display = 'block';
        var btn = menu.parentNode && menu.parentNode.querySelector('.player-strip-more');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        UI._playerMenuOutside = function(e) {
            if (!menu.contains(e.target) && !(btn && btn.contains(e.target))) UI.closePlayerMenu();
        };
        UI._playerMenuEsc = function(e) { if (e.key === 'Escape') UI.closePlayerMenu(); };
        setTimeout(function() {
            document.addEventListener('click', UI._playerMenuOutside);
            document.addEventListener('keydown', UI._playerMenuEsc);
        }, 0);
    },

    closePlayerMenu: function() {
        var menu = document.getElementById('playerStripMenu');
        if (menu) {
            menu.style.display = 'none';
            var btn = menu.parentNode && menu.parentNode.querySelector('.player-strip-more');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        }
        if (UI._playerMenuOutside) { document.removeEventListener('click', UI._playerMenuOutside); UI._playerMenuOutside = null; }
        if (UI._playerMenuEsc) { document.removeEventListener('keydown', UI._playerMenuEsc); UI._playerMenuEsc = null; }
    },


    /* =========================================================
       SESSION 12: OPPONENT BOARD VIEWER — Slide-out Panel
       Read-only view of another player's full board state.
       ========================================================= */

    /** Currently open opponent panel player index (-1 = closed) */
});
