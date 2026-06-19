/**
 * ArchRavels — AI Decision Engine
 * =========================================================
 * Session 9b: Basic AI opponent with greedy "Normal" strategy.
 *
 * The AI uses the same Game.* API as the human player.
 * All decisions are made programmatically and animated
 * step-by-step so the human player can follow along.
 *
 * Entry point: AI.takeTurn(callback) — called from Game.endTurn()
 * when the next player has isAI === true.
 *
 * Architecture:
 *   takeTurn → chooseSpace → executeActions → handleRestockActions
 *            → handleRestock → endTurn → callback
 *
 * Decision logic (greedy Normal):
 *   - Choose the action space that maximizes shop+craft value
 *   - Shop: pick bazaar cards that provide the most needed yarn
 *   - Craft: prioritize favorite SR > high-point SR > project items > regular items
 *   - Exchange: only when yarn is very mismatched for goals
 *   - Restock: finish projects > learn patterns
 * =========================================================
 */

var AI = {

    /* ----- Configuration ----- */
    DELAY: 1200,      // ms between animated steps
    THINK_DELAY: 800, // ms for "thinking" pause

    /* ----- Character-Specific Strategy Profiles ----- */
    /**
     * Each profile adjusts the AI's weighting for different decisions.
     * Higher multipliers = AI values that activity more.
     *
     * shopWeight     — how much the AI values shopping (getting yarn cards)
     * craftWeight    — how much the AI values crafting (making items/SRs)
     * projectWeight  — how much the AI values working toward projects
     * srWeight       — how much the AI values Special Requests
     * exchangeWeight — how much the AI values using the Exchange action
     * uniqueWeight   — how much the AI values its unique ability space
     * preferCraftSpace — bias toward picking the high-craft space (0–3 index)
     * preferShopSpace  — bias toward picking the high-shop space (0–3 index)
     */
    PROFILES: {
        thriftyShopper: {
            // Session 16: RETUNED for post-Yarn 1 removal. With Yarn 1 cards gone and
            // more Yarn 2 cards, each shop gives ~2 yarn/card instead of ~1.4. Shop 4
            // now yields ~8 yarn per turn — accumulation is much faster.
            // Strategy shift: shop aggressively early, then pivot hard to crafting.
            // shopWeight 1.4→1.2 (less shopping emphasis since yield per card is higher),
            // craftWeight 1.15→1.35 (actively convert yarn to items),
            // projectWeight 1.3→1.4 (faster accumulation = faster project completion).
            shopWeight:     1.2,   // yield per card is higher now, don't need to shop as hard
            craftWeight:    1.35,  // actively craft — you're sitting on yarn, use it
            projectWeight:  1.4,   // fast accumulation feeds project strategy
            srWeight:       1.1,   // Session 16: slight boost to avoid SR penalties
            exchangeWeight: 0.7,
            uniqueWeight:   1.0,
            hoardYarn: true,       // shop even without immediate crafts, but caps at 8 yarn now
            alwaysMaxCards: true,  // always pick the maximum number of bazaar cards
        },
        masterCrafter: {
            // Craft 4 is their superpower — but only swing to it when loaded with yarn
            // Strategy: shop/accumulate until you can get max value from a Craft 4 turn
            // Session 10b: Light pass — raised shopWeight slightly so they don't starve for yarn
            // Session 16: Raised srWeight 1.0→1.15 to reduce SR penalties at end-game
            shopWeight:     1.2,
            craftWeight:    1.6,
            projectWeight:  1.5,   // projects are their path to victory
            srWeight:       1.15,  // Session 16: slight boost to prioritize SR completion
            exchangeWeight: 0.8,
            uniqueWeight:   1.0,
            waitForBigCraft: true, // prefer shopping until 3+ items are affordable
        },
        colorSpecialist: {
            // Craft Any Colors bypasses exact tile requirements — exploit it
            shopWeight:     1.0,
            craftWeight:    1.2,
            projectWeight:  1.1,
            srWeight:       1.3,   // SRs are easier with any-color craft
            exchangeWeight: 0.5,   // less need to exchange — can use any colors
            uniqueWeight:   1.8,   // strongly prefer the "Any Colors" craft space
            preferAnyColors: true, // always try to leverage the any-colors space
        },
        yarnSpinner: {
            // Take 3 Yarn gives free yarn — build stockpile, then craft big
            // Also leverages "take 3 + craft 1" as "take 3 + make a bear" when idle
            // Session 10b: Light pass — bump craftWeight from 1.1→1.2 so spinner
            // actually converts their yarn hoard into items mid-game
            // Session 16: Raised srWeight 1.1→1.2 to reduce SR penalties
            shopWeight:     0.8,
            craftWeight:    1.2,
            projectWeight:  1.2,
            srWeight:       1.2,   // Session 16: slight boost to prioritize SR completion
            exchangeWeight: 0.6,   // less need — already gets free yarn
            uniqueWeight:   1.6,   // strongly prefer Take 3 Yarn space
            yarnHoarder: true,     // prefers building yarn reserves before crafting
            take3MakeBear: true,   // when on Take3+Craft1, default to making a bear
        },

        // Session 13: Maker — "Make Two Items" is their superpower
        // Session 16: Retuned — was over-indexing on hats. Reduced raw craftWeight,
        // boosted projectWeight so the AI targets project-relevant items for doubling.
        maker: {
            shopWeight:     1.1,   // gentle shop emphasis — need yarn for crafting
            craftWeight:    1.3,   // still loves crafting, but more selective now
            projectWeight:  1.6,   // Session 16: raised — project-aware doubling is key strategy
            srWeight:       1.1,   // Session 16: slight boost to avoid SR penalties
            exchangeWeight: 0.8,
            uniqueWeight:   1.7,   // strongly prefer the make-two-items space
            makeTwoItems:   true,  // AI flag: knows about the double-craft ability
        },

        // Session 13: Expert — Take 5 Any + Craft 1 Any Colors, only 3 spaces
        // Session 16: Boosted srWeight 1.2→1.5 — Expert's craftAnyColors makes SRs
        // trivially affordable, so they should aggressively pursue SR completion.
        // Also boosted craftWeight to encourage using the unique space for SRs.
        expert: {
            shopWeight:     0.9,   // less reliant on shopping — take5 gives yarn
            craftWeight:    1.5,   // Session 16: raised to leverage craftAnyColors for SRs
            projectWeight:  1.3,   // flexible yarn helps projects
            srWeight:       1.5,   // Session 16: raised — craftAnyColors makes SRs easy
            exchangeWeight: 0.0,   // no exchange space at all
            uniqueWeight:   1.8,   // strongly prefer take5+craft1 space
            take5AnyCraft:  true,  // AI flag: handle the combined take5+craft1 ability
            preferAnyColors: true, // like colorSpecialist, leverages any-colors crafting
        },

        // Session 36: Hank, The Stitchmeister — Story Mode FINAL BOSS.
        // Relentless scoring machine: crafts every turn, chases every SR (all are his
        // favorite → +5 each), hoards yarn (leftovers score for him). He only has two
        // craft spaces, so he alternates between them. Tuned aggressive on purpose.
        hank: {
            shopWeight:     0.0,   // no shop space; never shops
            craftWeight:    1.8,   // craft relentlessly — converts his auto-yarn into items
            projectWeight:  1.5,   // build toward projects with the doubled crafts
            srWeight:       1.9,   // every SR is his favorite (+5 each) — chase them hard
            exchangeWeight: 0.0,   // no exchange space
            uniqueWeight:   1.8,   // both his spaces are unique craft actions
            makeTwoItems:   true,  // knows the make-two ability (Space 1)
            preferAnyColors: true, // crafts ignoring color-matching
        },
    },

    /**
     * Get the strategy profile for the current AI player.
     */
    _getProfile: function() {
        var player = Game.state.player;
        var charDef = CARDS.getCharacter(player.characterId);
        var type = charDef ? charDef.type : 'thriftyShopper';
        return this.PROFILES[type] || this.PROFILES.thriftyShopper;
    },


    /* =========================================================
       UI HELPERS — Animated Action Log
       ========================================================= */

    /**
     * Pause for DELAY ms, then call callback. AI action pacing.
     * Session 22: No longer logs to feed (game.js handles that via _logAction).
     * @param {string}   msg      — message text (ignored for logging)
     * @param {function} callback — called after delay
     * @param {string}   [cls]    — optional CSS class (ignored)
     */
    showAction: function(msg, callback, cls) {
        setTimeout(callback, this.DELAY);
    },


    /* =========================================================
       MAIN ENTRY POINT
       ========================================================= */

    /**
     * Run a complete AI turn for the current active player.
     * Assumes Game.state.player is the AI player and
     * Game.state.phase is 'chooseSpace'.
     * @param {function} callback — called when AI turn is fully complete
     */
    takeTurn: function(callback) {
        var player = Game.state.player;
        if (!player || !player.isAI) {
            console.error('AI.takeTurn: current player is not AI');
            if (callback) callback();
            return;
        }
        var self = this;

        setTimeout(function() {
            // Step 1: Choose action space
            self._stepChooseSpace(function() {
                // Step 2: Execute player actions (shop, craft, exchange)
                self._stepExecuteActions(function() {
                    // Step 3: End player actions → restock phase
                    Game.endPlayerActions();
                    UI.renderBazaar();
                    UI.renderActionBar();

                    // Step 4: Restock actions (projects, patterns) before restocking deck
                    self._stepRestockActions(function() {
                        // Step 5: Restock from deck (events/SRs)
                        self._stepRestock(function() {
                            // Done!
                            self.showAction('Turn complete.', function() {
                                Game.endTurn();
                            }, 'ai-msg-done');
                        });
                    });
                });
            });
        }, this.THINK_DELAY);
    },


    /**
     * Final Craft phase: AI gets 1 craft action with existing yarn.
     * @param {function} callback — called when final craft is complete
     */
    doFinalCraft: function(callback) {
        var self = this;
        var player = Game.state.player;
        if (!player || !player.isAI) {
            console.error('AI.doFinalCraft: current player is not AI');
            if (callback) callback();
            return;
        }

        setTimeout(function() {
            var craftChoice = self._pickBestCraft();

            if (!craftChoice) {
                self.showAction('Nothing affordable — skipping.', function() {
                    callback();
                }, 'ai-msg-done');
                return;
            }

            var changed, msg;
            var srData = null;
            if (craftChoice.type === 'sr') {
                srData = { name: craftChoice.sr.name, img: craftChoice.sr.img, points: craftChoice.sr.points, isFavorite: craftChoice.sr.isFavorite };
                changed = Game.craftSpecialRequest(craftChoice.sr.uid, craftChoice.yarnToSpend);
                msg = 'Crafted ' + craftChoice.sr.name + ' (' + craftChoice.sr.points + ' pts)';
                if (craftChoice.sr.isFavorite) msg += ' — Favorite!';
            } else {
                changed = Game.craft(craftChoice.itemId, craftChoice.yarnToSpend);
                msg = 'Crafted a ' + craftChoice.itemDef.name + ' (' + craftChoice.itemDef.points + ' pts)';
            }

            if (changed) {
                Game.state.turn.craftUsed++;
                self.showAction(msg, function() {
                    UI.renderYarnBowl();
                    UI.renderCraftGrid();
                    UI.renderSpecialRequests();
                    UI.renderFinishedObjects();
                    // Session 17: Show game moment for AI SR completion
                    if (srData) {
                        var aiSRPlayer = Game.state.player;
                        UI.showGameMoment({
                            badge: srData.isFavorite ? 'Favorite Completed!' : 'SR Completed!',
                            badgeClass: srData.isFavorite ? 'moment-favorite' : 'moment-sr',
                            img: srData.img,
                            title: srData.name,
                            desc: UI._getSRDesc('completed', srData, aiSRPlayer.name, true),
                            points: srData.points
                        }, function() {
                            callback();
                        });
                    } else {
                        callback();
                    }
                });
            } else {
                self.showAction('Craft failed — skipping.', function() {
                    callback();
                }, 'ai-msg-done');
            }
        }, self.THINK_DELAY);
    },

    /* =========================================================
       STEP 1: CHOOSE ACTION SPACE
       ========================================================= */

    /**
     * Step 1: Evaluate and choose the best action space for this turn.
     * @param {function} callback — called after space is chosen and UI updated
     */
    _stepChooseSpace: function(callback) {
        var spaces = Game.getActionSpaces();
        var bestIdx = this._pickBestSpace(spaces);
        var space = spaces[bestIdx];
        var self = this;

        // Handle take3Yarn unique ability
        if (space.unique === 'take3Yarn') {
            Game.chooseActionSpace(bestIdx);
            var color = this._pickMostNeededColor();
            Game.applyTake3Yarn(color);
            this.showAction('Chose ' + space.label + ', took 3 ' + this._cap(color) + ' yarn', function() {
                UI.renderYarnBowl();
                UI.renderCraftGrid();
                UI.renderSpecialRequests();
                UI.renderActionBar();
                callback();
            });

        // Session 36: Handle take3Any unique ability (Hank boss Space 2 — craft 2 + take 3 mixed yarn)
        } else if (space.unique === 'take3Any') {
            Game.chooseActionSpace(bestIdx);
            var c3 = self._pick3MostNeededColors();
            Game.applyTake3Any(c3);
            var c3Counts = {};
            c3.forEach(function(c) { c3Counts[c] = (c3Counts[c] || 0) + 1; });
            var c3desc = Object.keys(c3Counts).map(function(c) { return c3Counts[c] + ' ' + self._cap(c); }).join(', ');
            this.showAction('Chose ' + space.label + ' — took ' + c3desc, function() {
                UI.renderYarnBowl();
                UI.renderCraftGrid();
                UI.renderSpecialRequests();
                UI.renderActionBar();
                callback();
            });

        // Session 13: Handle take5AnyCraft1Any unique ability (Expert)
        } else if (space.unique === 'take5AnyCraft1Any') {
            Game.chooseActionSpace(bestIdx);
            // Pick 5 most-needed colors
            var colors = self._pick5MostNeededColors();
            Game.applyTake5Any(colors);
            // Summarize the colors taken
            var colorCounts = {};
            colors.forEach(function(c) { colorCounts[c] = (colorCounts[c] || 0) + 1; });
            var desc = Object.keys(colorCounts).map(function(c) {
                return colorCounts[c] + ' ' + self._cap(c);
            }).join(', ');
            this.showAction('Chose ' + space.label + ' — took ' + desc, function() {
                UI.renderYarnBowl();
                UI.renderCraftGrid();
                UI.renderSpecialRequests();
                UI.renderActionBar();
                callback();
            });

        } else {
            Game.chooseActionSpace(bestIdx);
            this.showAction('Chose ' + space.label, function() {
                UI.renderAll();
                callback();
            });
        }
    },

    /**
     * Pick the best action space based on greedy profile-weighted evaluation.
     * @param {Array} spaces — action spaces from Game.getActionSpaces()
     * @returns {number} index (0–3) of the chosen space
     */
    _pickBestSpace: function(spaces) {
        var bestScore = -999;
        var bestIdx = 0;
        var player = Game.state.player;
        var bowl = player.yarnBowl;
        var self = this;
        var profile = this._getProfile();

        // Count affordable crafts with current yarn
        var affordableCrafts = this._countAffordableCrafts(bowl);

        spaces.forEach(function(space, idx) {
            if (!space.available) return;

            var score = 0;

            // Shop value: more cards from bazaar = more yarn = good
            // But late game with lots of yarn, shopping is less valuable (penalty for leftovers)
            if (space.shop > 0) {
                var shopBase = space.shop * 3;
                // Bonus if bazaar has good cards for us
                var bazaarValue = self._evaluateBazaarValue(space.shop);
                var shopScore = (shopBase + bazaarValue) * profile.shopWeight;

                // Late-game dampening: reduce shop value if we already have lots of yarn
                var gameProgress = self._gameProgress();
                var totalYarn = self._totalYarnCount(player);
                if (gameProgress > 0.4 && totalYarn > 12) {
                    shopScore *= Math.max(0.3, 1 - (gameProgress * 0.5));
                }

                score += shopScore;

                // Thrifty Shopper: hoard yarn even without immediate crafts (but less so late game)
                // Session 16: Lowered cap from 10→8 (post-Yarn 1 removal: cards yield more yarn,
                // so the AI hits the cap faster and should pivot to crafting sooner)
                if (profile.hoardYarn && affordableCrafts === 0 && totalYarn < 8) {
                    score += space.shop * Math.max(0.3, 1.5 - gameProgress * 2);
                }
            }

            // Craft value: can we actually craft something?
            if (space.craft > 0) {
                if (profile.waitForBigCraft && space.craft >= 4) {
                    // Master Crafter: only pick Craft 4 when valuable items (3+ pts) are ready
                    var valuableCrafts = self._countValuableCrafts(bowl);
                    // BIG bonus: could crafting complete a project this turn?
                    var projectCompletionBonus = self._craftCouldCompleteProject(space.craft);
                    if (projectCompletionBonus > 0) {
                        score += space.craft * 8 * profile.craftWeight + projectCompletionBonus;
                    } else if (valuableCrafts >= 3) {
                        score += space.craft * 7 * profile.craftWeight;  // huge payoff turn
                    } else if (valuableCrafts >= 2) {
                        score += space.craft * 4 * profile.craftWeight;  // decent payoff
                    } else if (valuableCrafts >= 1) {
                        score += space.craft * 2 * profile.craftWeight;  // at least one good item
                    } else {
                        score += space.craft * 1;  // not worth it yet — keep shopping
                    }
                } else if (affordableCrafts > 0) {
                    // Check if crafting could complete a project for non-Master Crafter too
                    var projBonus = self._craftCouldCompleteProject(space.craft);
                    score += space.craft * 5 * profile.craftWeight + projBonus;
                } else {
                    score += space.craft * 1 * profile.craftWeight;
                }
            }

            // Combo spaces (shop + craft) get a synergy bonus
            if (space.shop > 0 && space.craft > 0) {
                score += 3;
            }

            // Exchange: only valuable if yarn is badly mismatched
            if (space.exchange) {
                var mismatch = self._yarnMismatchScore(bowl);
                var exchangeBase = mismatch > 4 ? 6 : mismatch > 2 ? 3 : 0;
                score += exchangeBase * profile.exchangeWeight;
            }

            // Unique abilities — scaled by profile uniqueWeight
            if (space.unique === 'take3Yarn') {
                score += 6 * profile.uniqueWeight;
                // Yarn Spinner: even more value if yarn reserves are low
                if (profile.yarnHoarder) {
                    var totalYarn = Game.totalYarn(player);
                    if (totalYarn < 5) score += 4;
                }
            }
            if (space.unique === 'craftAnyColors') {
                var totalYarnCS = Game.totalYarn(player);
                var anyBase = totalYarnCS >= 3 ? 7 : 2;
                score += anyBase * profile.uniqueWeight;
                // Color Specialist: big extra bias to use this space often
                if (profile.preferAnyColors && totalYarnCS >= 2) {
                    score += 5;
                }
            }
            if (space.unique === 'makeTwoItems') {
                // Maker: doubling a craft is extremely valuable when we can afford items
                if (affordableCrafts > 0) {
                    var makeTwoBase = 9;
                    // Session 13: Late-game awareness — if we only need 1 more item to
                    // complete a project, the extra copy is wasted. Prefer Shop+Craft instead.
                    var gameProgress = self._gameProgress();
                    if (gameProgress > 0.6) {
                        var onlyNeedOne = self._projectNeedsExactlyOne();
                        if (onlyNeedOne) {
                            makeTwoBase = 4;  // still OK but not as dominant
                        }
                    }
                    score += makeTwoBase * profile.uniqueWeight;
                } else {
                    score += 2 * profile.uniqueWeight;  // not useful without affordable crafts
                }
            }
            if (space.unique === 'take5AnyCraft1Any') {
                // Expert: take 5 any colors + craft 1 any colors — always decent, great with low yarn
                var totalYarnE = Game.totalYarn(player);
                var expertBase = totalYarnE < 5 ? 10 : totalYarnE < 10 ? 7 : 4;
                // Session 13: Late-game awareness — when yarn-rich, Craft 3 is often better
                // than Take5+Craft1 since you get 3 items vs 1
                var gameProgress2 = self._gameProgress();
                if (totalYarnE >= 12 && gameProgress2 > 0.5) {
                    expertBase = Math.max(2, expertBase - 3);  // dampen — Craft 3 likely better
                }
                score += expertBase * profile.uniqueWeight;
                // Expert profile: strong preference for this space
                if (profile.take5AnyCraft) {
                    score += 4;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestIdx = idx;
            }
        });

        return bestIdx;
    },


    /* =========================================================
       STEP 2: EXECUTE ACTIONS (SHOP, CRAFT, EXCHANGE)
       ========================================================= */

    /**
     * Step 2: Execute player actions — shop, then craft loop, then exchange.
     * @param {function} callback — called when all actions are complete
     */
    _stepExecuteActions: function(callback) {
        var self = this;
        var actions = Game.getAvailableActions();

        // Do shop first, then craft, then exchange
        if (actions.canShop && actions.shopLimit > 0) {
            self._doShop(function() {
                self._doCraftLoop(function() {
                    self._doExchange(callback);
                });
            });
        } else {
            self._doCraftLoop(function() {
                self._doExchange(callback);
            });
        }
    },

    /**
     * AI Shopping: select the best cards from the bazaar.
     */
    _doShop: function(callback) {
        var self = this;
        var shopLimit = Game.state.shopLimit;
        var bazaar = Game.state.bazaar;
        var player = Game.state.player;

        // Score each bazaar slot
        var slotScores = [];
        for (var i = 0; i < 6; i++) {
            var card = bazaar[i];
            if (card && card.type === 'yarn') {
                var score = self._scoreYarnCard(card, player);
                slotScores.push({ slot: i, card: card, score: score });
            } else if (card === null && Game.state.playerCount > 1) {
                // Empty slot in MP = 1 any-color yarn
                slotScores.push({ slot: i, card: null, score: 2 });
            }
        }

        // Sort by score descending, take top N
        slotScores.sort(function(a, b) { return b.score - a.score; });
        var picks = slotScores.slice(0, shopLimit);

        if (picks.length === 0) {
            callback();
            return;
        }

        // Select the slots
        var slotIndices = picks.map(function(p) { return p.slot; });

        // Build yarn totals for display
        var normalYarn = {};
        var wildCards = [];
        var normalCards = [];

        slotIndices.forEach(function(i) {
            var card = bazaar[i];
            Game.toggleSlotSelection(i);
            if (card === null) {
                wildCards.push({ card: { name: 'Empty Slot', yarn: { any: 1 }, type: 'empty' }, slot: i });
            } else if (card.yarn && card.yarn.any) {
                wildCards.push({ card: card, slot: i });
            } else if (card) {
                normalCards.push({ card: card, slot: i });
                Object.keys(card.yarn).forEach(function(color) {
                    normalYarn[color] = (normalYarn[color] || 0) + card.yarn[color];
                });
            }
        });

        // Choose colors for wild cards
        var wildChoices = [];
        wildCards.forEach(function(entry) {
            var count = (entry.card.yarn && entry.card.yarn.any) || 1;
            for (var w = 0; w < count; w++) {
                var needed = self._pickMostNeededColor();
                wildChoices.push(needed);
            }
        });

        // Build display message
        var yarnSummary = self._buildYarnSummary(normalYarn, wildChoices);
        var msg = 'Shopped ' + picks.length + ' card' + (picks.length > 1 ? 's' : '') +
            (yarnSummary ? ': ' + yarnSummary : '');

        // Apply the shop
        Game.applyShopChoices(normalYarn, wildChoices, slotIndices);

        self.showAction(msg, function() {
            UI.renderBazaar();
            UI.renderYarnBowl();
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            UI.renderActionBar();
            callback();
        });
    },

    /**
     * AI Craft loop: craft items while we have craft actions remaining.
     */
    _doCraftLoop: function(callback) {
        var self = this;
        var actions = Game.getAvailableActions();

        if (!actions.canCraft) {
            callback();
            return;
        }

        var craftChoice = self._pickBestCraft();

        // Yarn Spinner fallback: "take 3 + make a bear" when nothing better to do
        if (!craftChoice) {
            var profile = self._getProfile();
            if (profile.take3MakeBear && Game.state.pendingTake3Yarn === false) {
                // Check if we can afford a bear (3 of any one color)
                var bowl = Game.state.player.yarnBowl;
                var bearColor = null;
                CARDS.COLORS.forEach(function(c) {
                    if (!bearColor && (bowl[c] || 0) >= 3) bearColor = c;
                });
                if (bearColor) {
                    var yarnToSpend = {};
                    yarnToSpend[bearColor] = 3;
                    craftChoice = {
                        type: 'item',
                        sr: null,
                        itemDef: CARDS.getItem('bear'),
                        itemId: 'bear',
                        yarnToSpend: yarnToSpend,
                        score: 0,
                    };
                }
            }
        }

        if (!craftChoice) {
            callback();
            return;
        }

        // Execute the craft
        var changed;
        var msg;

        var srData2 = null;
        if (craftChoice.type === 'sr') {
            // Craft a Special Request
            srData2 = { name: craftChoice.sr.name, img: craftChoice.sr.img, points: craftChoice.sr.points, isFavorite: craftChoice.sr.isFavorite };
            changed = Game.craftSpecialRequest(craftChoice.sr.uid, craftChoice.yarnToSpend);
            msg = 'Crafted ' + craftChoice.sr.name + ' (' + craftChoice.sr.points + ' pts)';
            if (craftChoice.sr.isFavorite) msg += ' — Favorite!';
        } else {
            // Craft a regular item
            changed = Game.craft(craftChoice.itemId, craftChoice.yarnToSpend);
            msg = 'Crafted a ' + craftChoice.itemDef.name + ' (' + craftChoice.itemDef.points + ' pts)';
        }

        if (!changed) {
            // Craft failed for some reason — skip
            callback();
            return;
        }

        self.showAction(msg, function() {
            UI.renderYarnBowl(changed);
            UI.renderCraftGrid();
            UI.renderFinishedObjects();
            UI.renderSpecialRequests();
            UI.renderActionBar();
            // Session 17: Show game moment for AI SR completion in craft loop
            if (srData2) {
                var aiSRPlayer2 = Game.state.player;
                UI.showGameMoment({
                    badge: srData2.isFavorite ? 'Favorite Completed!' : 'SR Completed!',
                    badgeClass: srData2.isFavorite ? 'moment-favorite' : 'moment-sr',
                    img: srData2.img,
                    title: srData2.name,
                    desc: UI._getSRDesc('completed', srData2, aiSRPlayer2.name, true),
                    points: srData2.points
                }, function() {
                    self._doCraftLoop(callback);
                });
            } else {
                // Try to craft again if we have more actions
                self._doCraftLoop(callback);
            }
        });
    },

    /**
     * AI Exchange: only if beneficial.
     */
    _doExchange: function(callback) {
        var self = this;
        var actions = Game.getAvailableActions();

        if (!actions.canExchange) {
            callback();
            return;
        }

        var exchangePlan = self._planExchange();
        if (!exchangePlan) {
            callback();
            return;
        }

        var changed = Game.exchange(exchangePlan.give, exchangePlan.receive);
        if (!changed) {
            callback();
            return;
        }

        var giveStr = self._buildYarnObj(exchangePlan.give);
        var recvStr = self._buildYarnObj(exchangePlan.receive);
        var msg = 'Exchanged ' + giveStr + ' for ' + recvStr;

        self.showAction(msg, function() {
            UI.renderYarnBowl(changed);
            UI.renderCraftGrid();
            UI.renderSpecialRequests();
            UI.renderActionBar();
            callback();
        });
    },


    /* =========================================================
       STEP 3: RESTOCK ACTIONS (before drawing from deck)
       Finish Project, Learn Pattern (AI skips Frog It for now)
       ========================================================= */

    /**
     * Step 3: Post-action restock actions — finish projects, learn patterns.
     * @param {function} callback — called when restock actions are complete
     */
    _stepRestockActions: function(callback) {
        var self = this;

        // Try to finish projects first
        self._doFinishProjects(function() {
            // Then try to learn patterns
            self._doLearnPatterns(callback);
        });
    },

    _doFinishProjects: function(callback) {
        var self = this;
        var completable = Game.getCompletableProjects();

        if (completable.length === 0) {
            callback();
            return;
        }

        // Pick highest-point project
        completable.sort(function(a, b) { return b.points - a.points; });
        var project = completable[0];
        // Session 17: Capture project data before it's removed from display
        var projData = { name: project.name, img: project.img, points: project.points, requirements: project.requirements };
        var points = Game.finishProject(project.uid);

        if (points === null) {
            callback();
            return;
        }

        var msg = 'Completed ' + project.name + '! (+' + points + ' pts)';
        self.showAction(msg, function() {
            // Session 17: Show game moment for AI project completion
            UI.showGameMoment({
                badge: 'Project Complete!',
                badgeClass: 'moment-project',
                img: projData.img,
                title: projData.name,
                desc: UI._getProjectDesc(projData, Game.state.player.name, true),
                points: points
            }, function() {
                UI.renderFinishedObjects();
                UI.renderProjectStrip();
                UI.renderActionBar();
                // Try to finish more projects
                self._doFinishProjects(callback);
            });
        });
    },

    _doLearnPatterns: function(callback) {
        var self = this;
        var learnable = Game.getLearnablePatterns();

        if (learnable.length === 0) {
            callback();
            return;
        }

        // Learn the first available pattern
        var tile = learnable[0];
        var success = Game.learnPattern(tile.id);

        if (!success) {
            callback();
            return;
        }

        var itemDef = CARDS.getItem(tile.itemId);
        var msg = 'Learned the ' + itemDef.name + ' pattern';

        self.showAction(msg, function() {
            UI.renderCraftGrid();
            UI.renderFinishedObjects();
            // Try more
            self._doLearnPatterns(callback);
        });
    },


    /* =========================================================
       STEP 4: RESTOCK FROM DECK (Events & SRs)
       ========================================================= */

    /**
     * Step 4: Restock bazaar from deck, auto-resolve any Events/SRs drawn.
     * @param {function} callback — called when restock is complete
     */
    _stepRestock: function(callback) {
        var self = this;
        var emptyCount = 6 - Game.bazaarCardCount();
        var deckLeft = Game.state.deck.length;

        if (emptyCount === 0 || deckLeft === 0) {
            callback();
            return;
        }

        var revealed = Game.restockBazaar();

        if (revealed.length === 0) {
            self.showAction('Restocked bazaar', function() {
                UI.renderBazaar();
                callback();
            });
        } else {
            self.showAction('Restocked bazaar — resolving cards...', function() {
                self._processAIRestockQueue(revealed, 0, callback);
            });
        }
    },

    /**
     * Process revealed Events/SRs during restock — AI auto-resolves.
     */
    _processAIRestockQueue: function(queue, idx, done) {
        var self = this;
        if (idx >= queue.length) {
            done();
            return;
        }

        var item = queue[idx];
        var card = item.card;
        var slot = item.slot;

        if (card.type === 'event') {
            // Session 17: Show game moment for AI event reveal
            var player = Game.state.player;
            var eventFlavor = UI._getEventDesc(card.effect, player.name, player.isAI);
            UI.showGameMoment({
                badge: 'Event',
                badgeClass: 'moment-event',
                img: card.img,
                title: card.name,
                desc: eventFlavor
            }, function() {
                self._handleEvent(card, function() {
                    Game.resolveRestockCard(slot, card);
                    UI.renderBazaar();
                    self._processAIRestockQueue(queue, idx + 1, done);
                });
            });
        } else if (card.type === 'specialRequest') {
            // Session 21: Two-step SR flow (like Tangled Cat).
            // Step 1: Reveal — "[Player] found a Special Request"
            // Step 2: Award — "[SR Name] given to [Player]" with confetti
            var isFav = card.favoriteOf === Game.state.player.characterId;
            var aiSRRevealPlayer = Game.state.player;
            var dots = UI._renderSRYarnDots(card);
            UI.showGameMoment({
                badge: isFav ? 'Your Favorite!' : 'Special Request',
                badgeClass: isFav ? 'moment-favorite' : 'moment-sr',
                img: card.img,
                title: card.name,
                desc: '<span class="player-name">' + aiSRRevealPlayer.name + '</span> found a Special Request!<br>' + dots,
                points: card.points
            }, function() {
                self._handleSRTake(card, function() {
                    Game.resolveRestockCard(slot, card);
                    UI.renderBazaar();
                    UI.renderSpecialRequests();
                    self._processAIRestockQueue(queue, idx + 1, done);
                });
            });
        } else {
            self._processAIRestockQueue(queue, idx + 1, done);
        }
    },


    /* =========================================================
       EVENT HANDLING — AI auto-resolves all 5 types
       ========================================================= */

    _handleEvent: function(card, callback) {
        var self = this;
        var result = Game.applyEventEffect(card);

        switch (result.inputType) {

            case 'tangledCat': {
                // Target the player with the most items (strongest opponent)
                var activeIdx = Game.state.activePlayerIndex;
                var bestTarget = -1;
                var bestItems = -1;
                Game.state.players.forEach(function(p, idx) {
                    if (idx === activeIdx) return;
                    var strength = p.items.length + p.craftedSpecialRequests.length;
                    if (strength > bestItems) { bestItems = strength; bestTarget = idx; }
                });
                if (bestTarget === -1) bestTarget = (activeIdx + 1) % Game.state.playerCount;
                Game.applyTangledCat(bestTarget);
                var targetName = Game.state.players[bestTarget].name;
                var aiName = Game.state.player.name;
                // Result announcement via game moment
                UI.showGameMoment({
                    badge: 'Event',
                    badgeClass: 'moment-event',
                    img: 'Square Cards PNG/AR_YarnEvents_Final_0000_Tangled-Cat.png',
                    title: 'Tangled Cat',
                    desc: '<span class="player-name">' + aiName + '</span> tangled <span class="player-name">' + targetName + '</span>!<br><span class="player-name">' + targetName + '</span> can\'t Craft next turn.'
                }, callback);
                break;
            }

            case 'yarnSale': {
                // Pick 3 of the most needed color
                var colors = [];
                for (var i = 0; i < 3; i++) {
                    colors.push(self._pickMostNeededColor());
                }
                Game.applyYarnSale(colors);
                var summary = self._summarizeColors(colors);
                self.showAction('Yarn Sale! Took ' + summary, function() {
                    UI.renderYarnBowl();
                    callback();
                });
                break;
            }

            case 'donate': {
                // Give the least-needed color
                var bowl = Game.state.player.yarnBowl;
                var leastColor = self._pickLeastNeededColor(bowl);
                if (!leastColor) {
                    self.showAction('Donate — nothing to give', callback);
                    break;
                }
                // In MP, give to the player in last place (weakest)
                var toIdx = -1;
                if (Game.state.playerCount > 1) {
                    var activeI = Game.state.activePlayerIndex;
                    var worstScore = Infinity;
                    Game.state.players.forEach(function(p, idx) {
                        if (idx === activeI) return;
                        var s = p.items.length + p.craftedSpecialRequests.length;
                        if (s < worstScore) { worstScore = s; toIdx = idx; }
                    });
                }
                Game.applyDonate(leastColor, toIdx);
                UI.renderYarnBowl();
                var aiName = Game.state.player.name;
                var colorCap = self._cap(leastColor);
                var recipient = toIdx >= 0 ? Game.state.players[toIdx].name : 'the supply';
                // Result announcement via game moment
                UI.showGameMoment({
                    badge: 'Event',
                    badgeClass: 'moment-event',
                    img: 'Square Cards PNG/AR_YarnEvents_Final_0002_Donate.png',
                    title: 'Donate',
                    desc: '<span class="player-name">' + aiName + '</span> gave 1 ' + colorCap + ' yarn to <span class="player-name">' + recipient + '</span>.'
                }, callback);
                break;
            }

            case 'friendlyClerk': {
                // Each player picks 1 yarn — AI picks most needed for each
                self._handleFriendlyClerkAI(0, callback);
                break;
            }

            case 'craftCircle': {
                // Each player may craft 1 item — AI crafts if possible
                self._handleCraftCircleAI(0, callback);
                break;
            }

            default:
                self.showAction('Event resolved', callback);
                break;
        }
    },

    /**
     * Friendly Clerk: iterate through all players, AI picks for AI players,
     * human players get the modal.
     */
    _handleFriendlyClerkAI: function(playerIdx, callback) {
        var self = this;
        if (playerIdx >= Game.state.playerCount) {
            callback();
            return;
        }

        var player = Game.state.players[playerIdx];

        if (player.isAI) {
            // AI picks the most needed color for this player
            var color = self._pickMostNeededColorForPlayer(player);
            Game.applyFriendlyClerk(playerIdx, color);
            self.showAction(player.name + ' gained 1 ' + self._cap(color) + ' (Clerk)', function() {
                UI.renderYarnBowl();
                self._handleFriendlyClerkAI(playerIdx + 1, callback);
            });
        } else {
            // Human player — show the color picker modal
            UI.showColorPicker(function(color) {
                Game.applyFriendlyClerk(playerIdx, color);
                UI.renderYarnBowl();
                UI.renderCraftGrid();
                UI.renderSpecialRequests();
                self._handleFriendlyClerkAI(playerIdx + 1, callback);
            }, player.name + ': Choose 1 Yarn (Friendly Clerk)');
        }
    },

    /**
     * Craft Circle: iterate through all players, AI crafts if possible,
     * human players get the modal.
     */
    _handleCraftCircleAI: function(playerIdx, callback) {
        var self = this;
        if (playerIdx >= Game.state.playerCount) {
            callback();
            return;
        }

        var player = Game.state.players[playerIdx];

        if (player.isAI) {
            // Try to find a craftable item for this AI player
            var options = Game.getCraftCircleOptions(playerIdx);
            var affordable = options.filter(function(o) { return o.canAfford; });

            if (affordable.length === 0) {
                self.showAction(player.name + ' skipped Craft Circle', function() {
                    self._handleCraftCircleAI(playerIdx + 1, callback);
                });
                return;
            }

            // Pick the best craft (highest points)
            var best = self._pickBestCraftFromOptions(affordable, player);
            if (!best) {
                self.showAction(player.name + ' skipped Craft Circle', function() {
                    self._handleCraftCircleAI(playerIdx + 1, callback);
                });
                return;
            }

            var yarnToSpend = best.yarnToSpend;
            var changed;
            var name;

            if (best.type === 'sr') {
                changed = Game.craftCircleItem(null, best.sr.uid, yarnToSpend, playerIdx);
                name = best.sr.name;
            } else {
                changed = Game.craftCircleItem(best.itemDef.id, null, yarnToSpend, playerIdx);
                name = best.itemDef.name;
            }

            if (changed) {
                self.showAction(player.name + ' crafted ' + name + ' (Craft Circle)', function() {
                    UI.renderYarnBowl();
                    UI.renderCraftGrid();
                    UI.renderFinishedObjects();
                    self._handleCraftCircleAI(playerIdx + 1, callback);
                });
            } else {
                self._handleCraftCircleAI(playerIdx + 1, callback);
            }
        } else {
            // Human player — show the Craft Circle modal
            UI.showCraftCircleModal(playerIdx, function() {
                self._handleCraftCircleAI(playerIdx + 1, callback);
            });
        }
    },

    /**
     * AI takes a Special Request card (rules: someone must take it).
     * Session 16: Strong bias toward giving SRs to human players.
     * AI keeps only its own favorite and easily-affordable SRs.
     * Non-favorite, non-affordable SRs go to human players first.
     */
    _handleSRTake: function(card, callback) {
        var self = this;
        var player = Game.state.player;
        var isFav = card.favoriteOf === player.characterId;
        var canAfford = Game.canAffordSpecialRequest(card);
        var activeIdx = Game.state.activePlayerIndex;

        /**
         * Session 21: Show award game moment after SR assignment.
         * Two-step flow: reveal → decision → award announcement with confetti.
         * @param {string} recipientName — who ended up with the SR
         */
        function showAwardMoment(recipientName) {
            self.showAction(card.name + ' given to ' + recipientName, function() {
                UI.showGameMoment({
                    badge: 'Awarded',
                    badgeClass: 'moment-sr',
                    img: card.img,
                    title: card.name,
                    desc: '<span class="player-name">' + card.name + '</span> given to <span class="player-name">' + recipientName + '</span>',
                    points: card.points
                }, callback);
            });
        }

        // Solo play: always keep
        if (Game.state.playerCount <= 1) {
            Game.takeSpecialRequest(card);
            showAwardMoment(player.name);
            return;
        }

        // Session 16: Decision tree for keep vs. give
        // 1. Always keep favorites (too valuable to give away)
        // 2. If affordable AND no human players exist, keep it
        // 3. If a human player exists, strongly prefer giving to them
        //    (human players are the competition — burden them with SR penalties)
        // 4. Only keep affordable SRs if NO human players exist

        var humanPlayers = [];
        var aiPlayers = [];
        Game.state.players.forEach(function(p, i) {
            if (i === activeIdx) return;
            if (!p.isAI) {
                humanPlayers.push(i);
            } else {
                aiPlayers.push(i);
            }
        });

        // Always keep favorites
        if (isFav) {
            Game.takeSpecialRequest(card);
            showAwardMoment(player.name);
            return;
        }

        // If human players exist, strongly prefer giving to a human
        if (humanPlayers.length > 0) {
            // Pick the human with the highest score (burden the leader)
            var bestHuman = humanPlayers[0];
            var bestHumanScore = -Infinity;
            humanPlayers.forEach(function(idx) {
                var score = Game.calculateFinalScore(Game.state.players[idx]).total;
                if (score > bestHumanScore) {
                    bestHumanScore = score;
                    bestHuman = idx;
                }
            });
            // Only exception: keep it if it's very easily affordable (costs ≤ 3 yarn)
            // AND we're early in the game (won't hurt to hold it)
            var srCost = card.yarnCount || 0;
            if (!srCost && card.yarn) {
                CARDS.COLORS.forEach(function(c) { srCost += (card.yarn[c] || 0); });
            }
            srCost += (card.anyCount || 0) + (card.sameCount || 0);
            var gameProgress = self._gameProgress();
            if (canAfford && srCost <= 3 && gameProgress < 0.4) {
                // Cheap SR early in the game — keep it, we'll craft it easily
                Game.takeSpecialRequest(card);
                showAwardMoment(player.name);
            } else {
                // Give to human
                var target = Game.state.players[bestHuman];
                Game.takeSpecialRequest(card, bestHuman);
                showAwardMoment(target.name);
            }
            return;
        }

        // No human players (spectate mode) — use original logic
        if (canAfford) {
            Game.takeSpecialRequest(card);
            showAwardMoment(player.name);
        } else {
            // Give to the AI with the highest score
            var bestIdx = -1;
            var bestScore = -Infinity;
            Game.state.players.forEach(function(p, i) {
                if (i === activeIdx) return;
                var score = Game.calculateFinalScore(p).total;
                if (score > bestScore) {
                    bestScore = score;
                    bestIdx = i;
                }
            });
            if (bestIdx === -1) bestIdx = (activeIdx + 1) % Game.state.playerCount;
            var giveTarget = Game.state.players[bestIdx];
            Game.takeSpecialRequest(card, bestIdx);
            showAwardMoment(giveTarget.name);
        }
    },


    /* =========================================================
       DECISION HELPERS
       ========================================================= */

    /**
     * Pick the best craft action for the current AI player.
     * Priority: favorite SR > high-point SR > project items > regular items.
     * Returns { type, itemId?, itemDef?, sr?, yarnToSpend } or null.
     */
    _pickBestCraft: function() {
        var player = Game.state.player;
        var bowl = player.yarnBowl;
        var anyColors = Game.state.craftAnyColors;
        var candidates = [];
        var profile = this._getProfile();

        // --- Special Requests ---
        // Session 16: SR urgency — as game progresses, uncompleted SRs become increasingly
        // costly (each costs -points at end-game). Factor this penalty risk into scoring.
        var gameProgress = this._gameProgress();
        var heldSRCount = Game.state.player.specialRequests.length;
        // Urgency bonus: scales with game progress and number of held SRs
        // At 50% through game with 2 SRs held: urgency = 0.5 * 2 * 8 = 8 bonus per SR
        // At 80% through game with 2 SRs held: urgency = 0.8 * 2 * 8 = 12.8 bonus per SR
        var srUrgencyBonus = gameProgress * heldSRCount * 8;

        var srOptions = Game.getSRCraftOptions();
        srOptions.forEach(function(opt) {
            if (!opt.canAfford) return;
            var sr = opt.sr;
            var effectivePoints = sr.points + (sr.isFavorite ? 5 : 0);
            var yarnToSpend = AI._buildSRYarnToSpend(sr, bowl, anyColors);
            if (yarnToSpend) {
                // Session 16: Added srUrgencyBonus — avoiding SR penalties is critical
                // The penalty for NOT crafting this SR is -(sr.points), so the AI should
                // value completion as: actual points gained + penalty avoided.
                var penaltyAvoidance = sr.points * gameProgress;  // rising with game progress
                candidates.push({
                    type: 'sr',
                    sr: sr,
                    itemDef: null,
                    itemId: null,
                    yarnToSpend: yarnToSpend,
                    score: (effectivePoints * profile.srWeight) + (sr.isFavorite ? 100 : 0)
                           + srUrgencyBonus + penaltyAvoidance,
                });
            }
        });

        // --- Regular items ---
        var craftOptions = Game.getCraftOptions();
        var isMakingTwo = Game.state.makeTwoItems;
        craftOptions.forEach(function(opt) {
            if (!opt.canAfford) return;
            var yarnToSpend = AI._buildItemYarnToSpend(opt, bowl, anyColors);
            if (yarnToSpend) {
                // Bonus for items needed by visible projects — scaled by profile
                var projectBonus = AI._itemProjectBonus(opt.itemDef.id) * profile.projectWeight;

                // BIG bonus if crafting this item would complete a project
                var completionBonus = AI._wouldCompleteProject(opt.itemDef.id);

                var baseScore = (opt.itemDef.points * profile.craftWeight) + projectBonus + completionBonus;

                // Session 16: Maker makeTwoItems — project-aware targeting.
                // Strongly prefer items that appear 2+ times in visible projects,
                // penalize low-value items (hats) unless they help projects.
                if (isMakingTwo && profile.makeTwoItems) {
                    // If this item appears 2+ times in any project, HUGE bonus (the double is maximally efficient)
                    var doubleProjectBonus = AI._itemDoubleProjectBonus(opt.itemDef.id);
                    if (doubleProjectBonus > 0) {
                        // This is the ideal Make Two target — doubling fills 2 project slots at once
                        baseScore += opt.itemDef.points * profile.craftWeight * 2;
                        baseScore += doubleProjectBonus * 1.5;
                    } else if (projectBonus > 0) {
                        // Item helps a project (appears 1x) — still good but less ideal for doubling
                        baseScore += opt.itemDef.points * profile.craftWeight * 0.8;
                        baseScore += projectBonus * 0.3;
                    } else {
                        // Item doesn't help any project — halve the doubling bonus.
                        // This specifically penalizes "make 2 hats for no reason" behavior.
                        baseScore += opt.itemDef.points * profile.craftWeight * 0.3;
                    }
                }

                candidates.push({
                    type: 'item',
                    sr: null,
                    itemDef: opt.itemDef,
                    itemId: opt.itemDef.id,
                    yarnToSpend: yarnToSpend,
                    score: baseScore,
                });
            }
        });

        if (candidates.length === 0) return null;

        // Sort by score descending
        candidates.sort(function(a, b) { return b.score - a.score; });
        return candidates[0];
    },

    /**
     * Pick the best craft from Craft Circle options (for any player).
     */
    _pickBestCraftFromOptions: function(affordable, player) {
        var bowl = player.yarnBowl;
        var best = null;
        var bestScore = -1;

        affordable.forEach(function(opt) {
            var score = 0;
            var yarnToSpend = null;

            if (opt.type === 'sr' && opt.sr) {
                score = opt.sr.points + (opt.sr.isFavorite ? 5 : 0);
                yarnToSpend = AI._buildSRYarnToSpend(opt.sr, bowl, false);
            } else if (opt.itemDef) {
                score = opt.itemDef.points;
                yarnToSpend = AI._buildItemYarnToSpend(opt, bowl, false);
            }

            if (yarnToSpend && score > bestScore) {
                bestScore = score;
                best = {
                    type: opt.type,
                    sr: opt.sr || null,
                    itemDef: opt.itemDef || null,
                    yarnToSpend: yarnToSpend,
                };
            }
        });

        return best;
    },

    /**
     * Build the yarnToSpend object for a Special Request.
     * Handles all colorRules: specific, any, sameColor, different, give.
     */
    _buildSRYarnToSpend: function(sr, bowl, anyColors) {
        var rule = sr.colorRule || 'specific';

        if (anyColors) {
            // craftAnyColors: just pick any yarn we have
            var total = sr.yarnCount || 0;
            if (!total && sr.yarn) {
                CARDS.COLORS.forEach(function(c) { total += (sr.yarn[c] || 0); });
            }
            return this._pickAnyYarn(bowl, total);
        }

        if (rule === 'specific') {
            return sr.yarn ? Object.assign({}, sr.yarn) : null;
        }

        if (rule === 'any') {
            return this._pickAnyYarn(bowl, sr.yarnCount);
        }

        if (rule === 'give') {
            // Give rule: must spend yarnCount × number of other players
            var otherPlayers = Game.state.players.length - 1;
            var giveTotal = sr.yarnCount * Math.max(1, otherPlayers);
            return this._pickAnyYarn(bowl, giveTotal);
        }

        if (rule === 'sameColor') {
            // Find a color we have enough of
            for (var i = 0; i < CARDS.COLORS.length; i++) {
                var c = CARDS.COLORS[i];
                if ((bowl[c] || 0) >= sr.yarnCount) {
                    var spend = {};
                    spend[c] = sr.yarnCount;
                    return spend;
                }
            }
            return null;
        }

        if (rule === 'different') {
            // Pick one of each different color
            var spend = {};
            var picked = 0;
            // Sort colors by abundance (spend least-needed first)
            var sorted = CARDS.COLORS.slice().sort(function(a, b) {
                return (bowl[a] || 0) - (bowl[b] || 0);
            });
            for (var j = sorted.length - 1; j >= 0 && picked < sr.yarnCount; j--) {
                if ((bowl[sorted[j]] || 0) >= 1) {
                    spend[sorted[j]] = 1;
                    picked++;
                }
            }
            return picked >= sr.yarnCount ? spend : null;
        }

        if (rule === 'sameColorPlus') {
            // N of one color (not the plus color) + specific extras
            // e.g. Skelly: 5 same + 1 orange; Ghost: 5 same + 1 red
            var plusYarn = sr.plusYarn || {};
            var sameNeeded = sr.yarnCount || 5;
            var excludeColors = Object.keys(plusYarn);

            // Check we can afford the plus yarn first
            for (var pc = 0; pc < excludeColors.length; pc++) {
                if ((bowl[excludeColors[pc]] || 0) < plusYarn[excludeColors[pc]]) return null;
            }

            // Find a color (not in excludeColors) we have enough of
            for (var ci = 0; ci < CARDS.COLORS.length; ci++) {
                var color = CARDS.COLORS[ci];
                if (excludeColors.indexOf(color) !== -1) continue;
                if ((bowl[color] || 0) >= sameNeeded) {
                    var spend = {};
                    spend[color] = sameNeeded;
                    for (var pk in plusYarn) { spend[pk] = plusYarn[pk]; }
                    return spend;
                }
            }
            return null;
        }

        if (rule === 'specificPlusAny') {
            // Specific colors + N of any other color
            // e.g. Koi: 3 orange + 2 other; Mallard: 1 orange + 2 green + 3 other
            var specYarn = sr.yarn || {};
            var anyNeeded = sr.anyCount || 0;

            // Check we can afford the specific colors
            var spend = {};
            for (var sc in specYarn) {
                if ((bowl[sc] || 0) < specYarn[sc]) return null;
                spend[sc] = specYarn[sc];
            }

            // Pick 'any' from remaining yarn (prefer least-needed colors, excluding spec colors)
            var remaining = anyNeeded;
            var sortedC = CARDS.COLORS.slice().sort(function(a, b) {
                return (bowl[b] || 0) - (bowl[a] || 0);
            });
            for (var ai = 0; ai < sortedC.length && remaining > 0; ai++) {
                var ac = sortedC[ai];
                var available = (bowl[ac] || 0) - (spend[ac] || 0);
                if (available > 0) {
                    var take = Math.min(available, remaining);
                    spend[ac] = (spend[ac] || 0) + take;
                    remaining -= take;
                }
            }
            return remaining === 0 ? spend : null;
        }

        if (rule === 'specificPlusSame') {
            // Specific colors + N of one color (can overlap)
            // e.g. Dog Bandana: 3 purple + 2 of one color
            var specYarn2 = sr.yarn || {};
            var sameNeeded2 = sr.sameCount || 0;

            // Check we can afford the specific colors
            for (var sc2 in specYarn2) {
                if ((bowl[sc2] || 0) < specYarn2[sc2]) return null;
            }

            // Find best color for the "same" portion — can overlap with specific
            for (var si = 0; si < CARDS.COLORS.length; si++) {
                var sameColor = CARDS.COLORS[si];
                var specUsed = specYarn2[sameColor] || 0;
                var avail = (bowl[sameColor] || 0) - specUsed;
                if (avail >= sameNeeded2) {
                    var spend = {};
                    for (var sk in specYarn2) { spend[sk] = specYarn2[sk]; }
                    spend[sameColor] = (spend[sameColor] || 0) + sameNeeded2;
                    return spend;
                }
            }
            return null;
        }

        return null;
    },

    /**
     * Build the yarnToSpend object for a regular craft item.
     */
    _buildItemYarnToSpend: function(opt, bowl, anyColors) {
        if (anyColors) {
            return this._pickAnyYarn(bowl, opt.itemDef.yarnCount);
        }

        // Exact tile pattern (unlearned)
        if (opt.tile && !opt.learned) {
            return Object.assign({}, opt.tile.exact);
        }

        // General pattern — choose colors based on rule
        var itemDef = opt.itemDef;
        var rule = itemDef.colorRule;
        var count = itemDef.yarnCount;

        if (rule === 'oneColor') {
            // Find a color with enough yarn
            for (var i = 0; i < CARDS.COLORS.length; i++) {
                var c = CARDS.COLORS[i];
                if ((bowl[c] || 0) >= count) {
                    var spend = {};
                    spend[c] = count;
                    return spend;
                }
            }
            return null;
        }

        if (rule === 'twoColors') {
            // Pick two colors that sum to enough
            var colors = CARDS.COLORS.filter(function(c) { return (bowl[c] || 0) >= 1; });
            // Sort by abundance descending — spend what we have most of
            colors.sort(function(a, b) { return (bowl[b] || 0) - (bowl[a] || 0); });
            for (var a = 0; a < colors.length; a++) {
                for (var b = a + 1; b < colors.length; b++) {
                    if ((bowl[colors[a]] || 0) + (bowl[colors[b]] || 0) >= count) {
                        var spend = {};
                        var fromA = Math.min(bowl[colors[a]] || 0, count);
                        spend[colors[a]] = fromA;
                        var remaining = count - fromA;
                        if (remaining > 0) spend[colors[b]] = remaining;
                        return spend;
                    }
                }
            }
            return null;
        }

        if (rule === 'different') {
            // Pick one of each different color
            var spend = {};
            var picked = 0;
            // Sort by least needed (spend what matters least)
            var sorted = this._colorsByNeed(bowl);
            for (var k = 0; k < sorted.length && picked < count; k++) {
                if ((bowl[sorted[k]] || 0) >= 1) {
                    spend[sorted[k]] = 1;
                    picked++;
                }
            }
            return picked >= count ? spend : null;
        }

        return null;
    },

    /**
     * Pick N yarn from the bowl, choosing least-needed colors first.
     */
    _pickAnyYarn: function(bowl, count) {
        var spend = {};
        var remaining = count;
        // Sort colors by what we have most of (spend excess first)
        var sorted = CARDS.COLORS.slice().sort(function(a, b) {
            return (bowl[b] || 0) - (bowl[a] || 0);
        });
        for (var i = 0; i < sorted.length && remaining > 0; i++) {
            var available = bowl[sorted[i]] || 0;
            if (available > 0) {
                var take = Math.min(available, remaining);
                spend[sorted[i]] = take;
                remaining -= take;
            }
        }
        return remaining === 0 ? spend : null;
    },


    /* =========================================================
       SCORING / EVALUATION HELPERS
       ========================================================= */

    /**
     * Estimate how far along the game is (0 = start, 1 = near end).
     * Based on project deck depletion.
     */
    _gameProgress: function() {
        var totalProjects = Game.getTotalProjectCount(Game.state.playerCount);
        var deckLeft = Game.state.projectDeck.length;
        var displayLeft = Game.state.projectDisplay.length;
        var remaining = deckLeft + displayLeft;
        return Math.max(0, 1 - (remaining / totalProjects));
    },

    /**
     * Count total yarn in a player's bowl.
     */
    _totalYarnCount: function(player) {
        var total = 0;
        CARDS.COLORS.forEach(function(c) { total += (player.yarnBowl[c] || 0); });
        return total;
    },

    /**
     * Score a yarn card based on how useful its colors are.
     * Late-game penalty: unneeded yarn is worth less (or negative)
     * because leftover yarn costs -1 per at end of game.
     */
    _scoreYarnCard: function(card, player) {
        var needed = this._getNeededColors(player);
        var profile = this._getProfile();
        var score = 0;

        // Late-game penalty factor: as game progresses, unneeded yarn is a liability (-1 pt each)
        var progress = this._gameProgress();
        var yarnPenaltyWeight = progress * 1.5;  // 0 early, up to 1.5 late

        if (card.yarn.any) {
            // Wild card — always useful (goes toward needed colors)
            score = card.yarn.any * 3;
        } else {
            Object.keys(card.yarn).forEach(function(color) {
                var amount = card.yarn[color];
                if (needed[color] && needed[color] > 0) {
                    score += amount * 4;  // highly needed
                } else {
                    // Unneeded yarn: worth less as game progresses
                    score += amount * (1 - yarnPenaltyWeight);
                }
            });
        }

        // Thrifty Shopper: yarn quantity matters most — prefer 3-yarn cards over 2 over 1
        // But still temper it in the late game
        if (profile.alwaysMaxCards) {
            var totalOnCard = 0;
            if (card.yarn.any) {
                totalOnCard = card.yarn.any;
            } else {
                Object.keys(card.yarn).forEach(function(c) { totalOnCard += card.yarn[c]; });
            }
            // Bonus per yarn, but reduced in late game
            var yarnBonus = Math.max(1, 3 - yarnPenaltyWeight);
            score += totalOnCard * yarnBonus;
            score = Math.max(score, 1);
        }

        return score;
    },

    /**
     * Calculate which colors the AI player needs most.
     * Based on pattern tiles, held SRs, and visible projects.
     * Returns { color: need_score }
     */
    _getNeededColors: function(player) {
        var needs = {};
        CARDS.COLORS.forEach(function(c) { needs[c] = 0; });

        // Pattern tiles (unlearned = exact colors needed)
        player.patternTiles.forEach(function(tile) {
            if (!tile.learned && tile.exact) {
                Object.keys(tile.exact).forEach(function(c) {
                    var have = player.yarnBowl[c] || 0;
                    var need = tile.exact[c] - have;
                    if (need > 0) needs[c] += need * 2;
                });
            }
        });

        // Held Special Requests
        // Session 16: Enhanced SR color needs — factor in game progress so the AI
        // shops for SR-completing yarn more urgently as the game progresses.
        // Also handle more colorRules beyond just 'specific'.
        var srProgress = AI._gameProgress();
        var srUrgencyMult = 1 + srProgress * 2;  // 1.0 early → 3.0 late
        player.specialRequests.forEach(function(sr) {
            if (sr.colorRule === 'specific' && sr.yarn) {
                Object.keys(sr.yarn).forEach(function(c) {
                    var have = player.yarnBowl[c] || 0;
                    var need = sr.yarn[c] - have;
                    if (need > 0) needs[c] += need * 3 * srUrgencyMult;
                });
            } else if (sr.colorRule === 'sameColorPlus' && sr.plusYarn) {
                // Need the plus colors + enough of one non-plus color
                Object.keys(sr.plusYarn).forEach(function(c) {
                    var have = player.yarnBowl[c] || 0;
                    var need = sr.plusYarn[c] - have;
                    if (need > 0) needs[c] += need * 3 * srUrgencyMult;
                });
            } else if (sr.colorRule === 'specificPlusAny' && sr.yarn) {
                Object.keys(sr.yarn).forEach(function(c) {
                    var have = player.yarnBowl[c] || 0;
                    var need = sr.yarn[c] - have;
                    if (need > 0) needs[c] += need * 3 * srUrgencyMult;
                });
            } else if (sr.colorRule === 'specificPlusSame' && sr.yarn) {
                Object.keys(sr.yarn).forEach(function(c) {
                    var have = player.yarnBowl[c] || 0;
                    var need = sr.yarn[c] - have;
                    if (need > 0) needs[c] += need * 3 * srUrgencyMult;
                });
            } else if ((sr.colorRule === 'any' || sr.colorRule === 'sameColor') && sr.yarnCount) {
                // For "any" or "sameColor" rules, generally need more total yarn
                // Boost colors we already have the most of (for sameColor)
                var totalHave = 0;
                CARDS.COLORS.forEach(function(c) { totalHave += (player.yarnBowl[c] || 0); });
                if (totalHave < sr.yarnCount) {
                    // Need more yarn in general — spread need across colors
                    CARDS.COLORS.forEach(function(c) { needs[c] += 1 * srUrgencyMult; });
                }
            }
        });

        // Visible projects — figure out which items are needed and what colors those require
        // Weight by project progress: closer to completion = stronger need signal
        Game.state.projectDisplay.forEach(function(proj) {
            var totalReqs = 0;
            var totalHave = 0;
            Object.keys(proj.requirements).forEach(function(reqId) {
                var n = proj.requirements[reqId];
                var h = player.items.filter(function(it) { return it.id === reqId; }).length;
                totalReqs += n;
                totalHave += Math.min(h, n);
            });
            var progress = totalReqs > 0 ? totalHave / totalReqs : 0;
            var weight = 0.5 + progress * 1.5;  // 0.5 at 0% → 2.0 at 100%

            Object.keys(proj.requirements).forEach(function(itemId) {
                var needed = proj.requirements[itemId];
                var have = player.items.filter(function(it) { return it.id === itemId; }).length;
                if (have < needed) {
                    var itemDef = CARDS.getItem(itemId);
                    if (itemDef) {
                        // If the item has a specific tile pattern, prioritize those colors
                        var tile = player.patternTiles.find(function(t) { return t.itemId === itemId; });
                        if (tile && !tile.learned && tile.exact) {
                            Object.keys(tile.exact).forEach(function(c) {
                                needs[c] += tile.exact[c] * weight;
                            });
                        } else {
                            // General item — broad color need
                            CARDS.COLORS.forEach(function(c) { needs[c] += weight * 0.5; });
                        }
                    }
                }
            });
        });

        return needs;
    },

    /**
     * Pick the single most needed color for the current AI player.
     */
    _pickMostNeededColor: function() {
        return this._pickMostNeededColorForPlayer(Game.state.player);
    },

    /**
     * Session 13: Pick 5 most-needed colors for Expert's Take 5 Any ability.
     * Returns an array of 5 color strings (may contain duplicates).
     */
    /**
     * Session 36: Pick 3 (mixed) colors for Hank's take-3-any. He crafts ignoring
     * color-matching and leftover yarn scores for him, so he just snowballs his
     * three biggest holdings — distinct colors, genuinely mixed.
     * @returns {string[]} 3 color names
     */
    _pick3MostNeededColors: function() {
        var bowl = Game.state.player.yarnBowl;
        var sorted = CARDS.COLORS.slice().sort(function(a, b) {
            return (bowl[b] || 0) - (bowl[a] || 0);
        });
        return [sorted[0], sorted[1], sorted[2]];
    },

    _pick5MostNeededColors: function() {
        var player = Game.state.player;
        var bowl = player.yarnBowl;
        var profile = this._getProfile();

        // Session 13 improvement: plan the 5 colors around the best craft we could
        // make after getting them. Expert crafts with any colors on this space,
        // so simulate what the best item or SR to target would be.

        // 1. Score every craftable item/SR by what it'd be worth to craft
        var bestTarget = null;
        var bestTargetScore = -1;
        var bestTargetCost = 0;

        // Check regular items
        var craftOptions = Game.getCraftOptions();
        craftOptions.forEach(function(opt) {
            var cost = opt.itemDef.yarnCount || 0;
            if (!cost && opt.itemDef.yarn) {
                CARDS.COLORS.forEach(function(c) { cost += (opt.itemDef.yarn[c] || 0); });
            }
            // We'll have current bowl + 5 more yarn; craftAnyColors means any colors work
            var totalAfter = Game.totalYarn(player) + 5;
            if (totalAfter >= cost) {
                var projectBonus = AI._itemProjectBonus(opt.itemDef.id) * profile.projectWeight;
                var completionBonus = AI._wouldCompleteProject(opt.itemDef.id);
                var score = (opt.itemDef.points * profile.craftWeight) + projectBonus + completionBonus;
                if (score > bestTargetScore) {
                    bestTargetScore = score;
                    bestTargetCost = cost;
                    bestTarget = opt.itemDef;
                }
            }
        });

        // Check SRs too
        var srOptions = Game.getSRCraftOptions();
        srOptions.forEach(function(opt) {
            var sr = opt.sr;
            var cost = sr.yarnCount || 0;
            if (!cost && sr.yarn) {
                CARDS.COLORS.forEach(function(c) { cost += (sr.yarn[c] || 0); });
            }
            cost += (sr.anyCount || 0) + (sr.sameCount || 0);
            var totalAfter = Game.totalYarn(player) + 5;
            if (totalAfter >= cost) {
                var effectivePts = sr.points + (sr.isFavorite ? 5 : 0);
                var score = (effectivePts * profile.srWeight) + (sr.isFavorite ? 100 : 0);
                if (score > bestTargetScore) {
                    bestTargetScore = score;
                    bestTargetCost = cost;
                    bestTarget = sr;
                }
            }
        });

        // 2. If we have a target, pick colors that get us closest to affording it
        //    Since Expert crafts with any colors, we just need enough total yarn.
        //    Pick colors that also help our general needs (for future turns).
        var needs = this._getNeededColors(player);

        // Sort colors by need score descending
        var sorted = CARDS.COLORS.slice().sort(function(a, b) {
            return (needs[b] || 0) - (needs[a] || 0);
        });

        // If we have a target and need more yarn to afford it, bias toward filling that gap
        var totalYarn = Game.totalYarn(player);
        var yarnDeficit = bestTarget ? Math.max(0, bestTargetCost - totalYarn) : 0;

        var colors = [];
        if (yarnDeficit > 0 && yarnDeficit <= 5) {
            // We need exactly N more yarn to afford the target — pick those first as most-needed,
            // then fill remaining with general needs
            for (var d = 0; d < yarnDeficit && colors.length < 5; d++) {
                colors.push(sorted[d % sorted.length]);
            }
        }

        // Fill remaining picks from general needs
        for (var i = 0; colors.length < 5; i++) {
            var idx = Math.min(i, sorted.length - 1);
            // If top color needs 3+, double up early
            if (colors.length < 2 && needs[sorted[0]] > 2) {
                colors.push(sorted[0]);
            } else {
                colors.push(sorted[idx]);
            }
        }
        return colors;
    },

    /**
     * Pick the most needed color for a specific player.
     */
    _pickMostNeededColorForPlayer: function(player) {
        var needs = this._getNeededColors(player);
        var bestColor = CARDS.COLORS[0];
        var bestScore = -1;

        CARDS.COLORS.forEach(function(c) {
            if (needs[c] > bestScore) {
                bestScore = needs[c];
                bestColor = c;
            }
        });

        // If nothing is particularly needed, pick the color with the least yarn
        if (bestScore <= 0) {
            var minYarn = Infinity;
            CARDS.COLORS.forEach(function(c) {
                var have = player.yarnBowl[c] || 0;
                if (have < minYarn) { minYarn = have; bestColor = c; }
            });
        }

        return bestColor;
    },

    /**
     * Pick the least-needed color from the bowl (for donation/exchange).
     */
    _pickLeastNeededColor: function(bowl) {
        var needs = this._getNeededColors(Game.state.player);
        var bestColor = null;
        var bestScore = Infinity;

        CARDS.COLORS.forEach(function(c) {
            if ((bowl[c] || 0) <= 0) return;
            var needScore = needs[c] || 0;
            if (needScore < bestScore) {
                bestScore = needScore;
                bestColor = c;
            }
        });

        return bestColor;
    },

    /**
     * Sort colors by ascending need (least needed first).
     */
    _colorsByNeed: function(bowl) {
        var needs = this._getNeededColors(Game.state.player);
        return CARDS.COLORS.slice().sort(function(a, b) {
            return (needs[a] || 0) - (needs[b] || 0);
        });
    },

    /**
     * Count how many items the AI can currently afford to craft.
     */
    _countAffordableCrafts: function(bowl) {
        var count = 0;
        var options = Game.getCraftOptions();
        options.forEach(function(opt) { if (opt.canAfford) count++; });
        var srOptions = Game.getSRCraftOptions();
        srOptions.forEach(function(opt) { if (opt.canAfford) count++; });
        return count;
    },

    /**
     * Count affordable crafts that are worth 3+ points (non-hat items, SRs).
     * Used by Master Crafter to decide if Craft 4 is worth it.
     */
    _countValuableCrafts: function(bowl) {
        var count = 0;
        var options = Game.getCraftOptions();
        options.forEach(function(opt) {
            if (opt.canAfford && opt.itemDef.points >= 3) count++;
        });
        var srOptions = Game.getSRCraftOptions();
        srOptions.forEach(function(opt) { if (opt.canAfford) count++; });
        return count;
    },

    /**
     * Evaluate how good the bazaar is for shopping N cards.
     * Returns a bonus score.
     */
    _evaluateBazaarValue: function(shopLimit) {
        var bazaar = Game.state.bazaar;
        var player = Game.state.player;
        var score = 0;
        var yarnSlots = 0;

        for (var i = 0; i < 6; i++) {
            var card = bazaar[i];
            if (card && card.type === 'yarn') {
                score += this._scoreYarnCard(card, player);
                yarnSlots++;
            }
        }

        // Normalize: average value per slot * shopLimit
        return yarnSlots > 0 ? Math.round((score / yarnSlots) * Math.min(shopLimit, yarnSlots) * 0.3) : 0;
    },

    /**
     * Calculate how mismatched the AI's yarn is for its goals.
     * Higher = more mismatch = exchange more useful.
     */
    _yarnMismatchScore: function(bowl) {
        var needs = this._getNeededColors(Game.state.player);
        var mismatch = 0;

        CARDS.COLORS.forEach(function(c) {
            var have = bowl[c] || 0;
            var need = needs[c] || 0;
            if (need === 0 && have > 2) mismatch += have - 2;
            if (need > 0 && have === 0) mismatch += need;
        });

        return mismatch;
    },

    /**
     * Give a bonus score to items that help complete visible projects.
     * Session 16: Enhanced scaling — near-complete projects give much stronger signals,
     * especially when only 1-2 items away from completion.
     */
    _itemProjectBonus: function(itemId) {
        var player = Game.state.player;
        var bonus = 0;

        Game.state.projectDisplay.forEach(function(proj) {
            if (!proj.requirements[itemId]) return;
            var needed = proj.requirements[itemId];
            var have = player.items.filter(function(it) { return it.id === itemId; }).length;
            if (have < needed) {
                // Calculate how close we are to completing this project
                var totalReqs = 0;
                var totalHave = 0;
                Object.keys(proj.requirements).forEach(function(reqId) {
                    var n = proj.requirements[reqId];
                    var h = player.items.filter(function(it) { return it.id === reqId; }).length;
                    totalReqs += n;
                    totalHave += Math.min(h, n);
                });
                var progress = totalHave / totalReqs;  // 0 to 1
                var totalGap = totalReqs - totalHave;

                // Session 16: Much steeper scaling for near-complete projects.
                // 1 item away: bonus ≈ proj.points * 1.5 (was ~proj.points * 1.0)
                // 2 items away: bonus ≈ proj.points * 1.0
                // This ensures easy 1-item crafts to finish projects are strongly preferred.
                var progressMultiplier = 0.3 + 0.7 * progress;
                if (totalGap <= 1) {
                    progressMultiplier = 1.5;  // Almost there — huge urgency
                } else if (totalGap <= 2) {
                    progressMultiplier = 1.0;
                }
                bonus += Math.round(proj.points * progressMultiplier);
            }
        });

        return bonus;
    },

    /**
     * Check if crafting one more of itemId would complete any visible project.
     * Returns a massive bonus if so — this MUST dominate all other craft choices
     * including favorite SRs (which get +100). Session 16: raised from
     * (pts*3)+50 to (pts*3)+200 to guarantee project completion is top priority.
     */
    _wouldCompleteProject: function(itemId) {
        var player = Game.state.player;
        var items = player.items;
        var bestBonus = 0;

        Game.state.projectDisplay.forEach(function(proj) {
            if (!proj.requirements) return;
            // Check if this project needs this item type at all
            var needed = proj.requirements[itemId] || 0;
            if (needed === 0) return;

            // Count how many of each required item we already have
            var wouldComplete = true;
            Object.keys(proj.requirements).forEach(function(reqId) {
                var n = proj.requirements[reqId];
                var have = items.filter(function(it) { return it.id === reqId; }).length;
                // For the item we're about to craft, pretend we have +1
                if (reqId === itemId) have += 1;
                if (have < n) wouldComplete = false;
            });

            if (wouldComplete) {
                // Session 16: Raised bonus massively so project completion ALWAYS wins
                // over favorite SRs (+100) and everything else. A completed project is
                // worth far more than any single craft action.
                var bonus = (proj.points * 3) + 200;
                if (bonus > bestBonus) bestBonus = bonus;
            }
        });

        return bestBonus;
    },

    /**
     * Session 13: Maker bonus — check if an item appears 2+ times in any
     * visible project requirement. Getting 2 copies at once is a huge efficiency win.
     * Returns a bonus score if the double would significantly help a project.
     */
    /**
     * Session 13: Check if the best near-complete project only needs exactly 1
     * more item (of any type). Used by Maker to avoid wasting the double.
     * Returns true if a nearly-complete project has exactly 1 gap remaining.
     */
    _projectNeedsExactlyOne: function() {
        var player = Game.state.player;
        var found = false;

        Game.state.projectDisplay.forEach(function(proj) {
            if (!proj.requirements) return;
            var totalGap = 0;
            Object.keys(proj.requirements).forEach(function(reqId) {
                var needed = proj.requirements[reqId];
                var have = player.items.filter(function(it) { return it.id === reqId; }).length;
                totalGap += Math.max(0, needed - have);
            });
            if (totalGap === 1) found = true;
        });

        return found;
    },

    _itemDoubleProjectBonus: function(itemId) {
        var player = Game.state.player;
        var bestBonus = 0;

        Game.state.projectDisplay.forEach(function(proj) {
            if (!proj.requirements) return;
            var needed = proj.requirements[itemId] || 0;
            if (needed < 2) return; // no benefit from doubling if project needs <2

            var have = player.items.filter(function(it) { return it.id === itemId; }).length;
            var gap = needed - have;
            if (gap >= 2) {
                // Doubling fills 2 of the gap at once — big efficiency bonus
                bestBonus = Math.max(bestBonus, proj.points * 0.6);
            } else if (gap === 1) {
                // Only need 1 more, extra copy might help another project or is just free points
                bestBonus = Math.max(bestBonus, 3);
            }
        });

        return bestBonus;
    },

    /**
     * Check if using N craft actions could complete a visible project this turn.
     * Simulates: what affordable items could I craft, and would the resulting
     * inventory satisfy any project's requirements?
     * Returns the best project's point value if completable, otherwise 0.
     */
    _craftCouldCompleteProject: function(craftCount) {
        var player = Game.state.player;
        var bowl = player.yarnBowl;
        var anyColors = false; // conservative — don't assume craftAnyColors
        var bestProjectPts = 0;

        // Get all affordable items (simulate what we could craft)
        var craftOptions = Game.getCraftOptions();
        var affordable = [];
        craftOptions.forEach(function(opt) {
            if (opt.canAfford) {
                affordable.push(opt.itemDef.id);
            }
        });

        if (affordable.length === 0) return 0;

        // For each project, check: do we already have some items, and could
        // crafting up to `craftCount` affordable items fill the remaining gaps?
        Game.state.projectDisplay.forEach(function(proj) {
            if (!proj.requirements) return;
            var totalGap = 0;
            var gapFillable = true;

            Object.keys(proj.requirements).forEach(function(reqId) {
                var needed = proj.requirements[reqId];
                var have = player.items.filter(function(it) { return it.id === reqId; }).length;
                var gap = Math.max(0, needed - have);
                if (gap > 0) {
                    // Check if this item type is affordable
                    var canCraftThis = affordable.indexOf(reqId) !== -1;
                    if (!canCraftThis) {
                        gapFillable = false;
                    }
                    totalGap += gap;
                }
            });

            // Session 13: Maker makeTwoItems — each craft produces 2 items,
            // so effective output is craftCount * 2 (but only 1 type per craft action)
            var effectiveOutput = craftCount;
            if (Game.state.makeTwoItems) {
                // Each craft action fills 2 of the gap for that item type
                // Recalculate: each unique item type in the gap needs ceil(gap/2) craft actions
                var actionsNeeded = 0;
                var allFillable = true;
                Object.keys(proj.requirements).forEach(function(reqId) {
                    var n = proj.requirements[reqId];
                    var h = player.items.filter(function(it) { return it.id === reqId; }).length;
                    var g = Math.max(0, n - h);
                    if (g > 0) {
                        if (affordable.indexOf(reqId) === -1) allFillable = false;
                        actionsNeeded += Math.ceil(g / 2); // 2 items per craft
                    }
                });
                if (allFillable && actionsNeeded > 0 && actionsNeeded <= craftCount) {
                    if (proj.points > bestProjectPts) bestProjectPts = proj.points;
                }
            } else if (gapFillable && totalGap > 0 && totalGap <= craftCount) {
                if (proj.points > bestProjectPts) {
                    bestProjectPts = proj.points;
                }
            }
        });

        return bestProjectPts;
    },

    _planExchange: function() {
        var bowl = Game.state.player.yarnBowl;
        var needs = this._getNeededColors(Game.state.player);

        // Find colors with excess (have > 2, low need)
        var excess = [];
        var deficit = [];

        CARDS.COLORS.forEach(function(c) {
            var have = bowl[c] || 0;
            var need = needs[c] || 0;
            if (have > 2 && need <= 0) {
                excess.push({ color: c, amount: have - 1 }); // keep 1
            }
            if (need > 0 && have < need) {
                deficit.push({ color: c, amount: Math.min(need - have, 3) });
            }
        });

        if (excess.length === 0 || deficit.length === 0) return null;

        // Build give/receive — try to balance
        var give = {};
        var receive = {};
        var giveTotal = 0;
        var receiveTotal = 0;
        var maxExchange = 4; // don't exchange too much at once

        // Give excess
        excess.forEach(function(e) {
            if (giveTotal >= maxExchange) return;
            var amt = Math.min(e.amount, maxExchange - giveTotal);
            if (amt > 0) {
                give[e.color] = amt;
                giveTotal += amt;
            }
        });

        // Receive needed
        deficit.forEach(function(d) {
            if (receiveTotal >= giveTotal) return;
            var amt = Math.min(d.amount, giveTotal - receiveTotal);
            if (amt > 0) {
                receive[d.color] = amt;
                receiveTotal += amt;
            }
        });

        // Totals must match
        if (giveTotal === 0 || giveTotal !== receiveTotal) return null;

        // Don't exchange if give and receive overlap
        var overlap = Object.keys(give).some(function(c) { return receive[c]; });
        if (overlap) return null;

        return { give: give, receive: receive };
    },


    /* =========================================================
       STRING HELPERS
       ========================================================= */

    _cap: function(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    },

    _buildYarnSummary: function(normalYarn, wildChoices) {
        var parts = [];
        CARDS.COLORS.forEach(function(color) {
            var count = (normalYarn[color] || 0);
            if (count > 0) parts.push(count + ' ' + AI._cap(color));
        });
        wildChoices.forEach(function(color) {
            parts.push('1 ' + AI._cap(color) + ' (wild)');
        });
        return parts.join(', ');
    },

    _buildYarnObj: function(yarn) {
        var parts = [];
        CARDS.COLORS.forEach(function(c) {
            if (yarn[c]) parts.push(yarn[c] + ' ' + AI._cap(c));
        });
        return parts.join(', ');
    },

    _summarizeColors: function(colors) {
        var counts = {};
        colors.forEach(function(c) { counts[c] = (counts[c] || 0) + 1; });
        var parts = [];
        Object.keys(counts).forEach(function(c) {
            parts.push(counts[c] + ' ' + AI._cap(c));
        });
        return parts.join(', ');
    },
};
