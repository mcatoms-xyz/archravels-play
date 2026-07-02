/**
 * ArchRavels — Card Catalog
 * =========================================================
 * All card definitions for the game.
 *
 * Card types in the Yarn Deck:
 *   - Yarn cards (80 total) — give yarn tokens when taken via Shop
 *     Session 13: Updated per Magic Socks expansion deck edit.
 *     Removed all single-color Yarn 1 cards (gave 1 yarn).
 *     Breakdown: 36 single-color-2 + 12 existing dual + 18 new dual + 8 triple + 6 wild = 80
 *   - Event cards (12 total) — resolve immediately during Restock
 *   - Special Requests (26 base + 3 promos + 13 expansion = 42 total; S41 removed the duplicate promo "Everyone's Welcome") — shuffled into top half of deck during setup
 *
 * Card types in the Project Deck (separate):
 *   - Project cards (16 total) — completed by turning in Item tokens
 *
 * Image paths are relative to index.html (root of the game folder).
 * =========================================================
 */

const CARDS = {

    /* ----- Image paths ----- */
    CARD_BACK: 'Square Cards PNG/AR_YarnEvents_Final_0028_Square_CardBack.png',
    PROJECT_BACK: 'Project Cards PNG/AR_ProjectCards_Back.png',

    /* ----- 6 yarn colors in the game ----- */
    COLORS: ['red', 'blue', 'green', 'yellow', 'orange', 'purple'],

    /* ----- Color hex values for UI rendering ----- */
    COLOR_HEX: {
        red:    '#c0392b',
        blue:   '#2874a6',
        green:  '#1e8449',
        yellow: '#d4ac0d',
        orange: '#d35400',
        purple: '#7d3c98',
    },

    /* =========================================================
       YARN CARDS — 80 total (Session 13: updated per Magic Socks expansion deck edit)
       All single-color Yarn 1 cards removed.
       Copy counts corrected to match production spreadsheet.
       9 new dual-color combos added from expansion.

       Breakdown: 36 single-2 + 12 existing dual + 18 new dual + 8 triple + 6 wild = 80

       Each definition has:
         id      — unique identifier for this art variant
         name    — display name
         img     — image filename (inside "Square Cards PNG/")
         yarn    — object mapping color → count gained
         copies  — how many of this card go into the deck
       ========================================================= */
    yarn: [
        /* --- Single color Yarn 2 (6 variants × 6 copies = 36) --- */
        { id: 'blue2',    name: 'Blue',    img: 'AR_YarnEvents_Final_0006_Blue2.png',    yarn: { blue: 2 },    copies: 6 },
        { id: 'yellow2',  name: 'Yellow',  img: 'AR_YarnEvents_Final_0008_Yellow2.png',  yarn: { yellow: 2 },  copies: 6 },
        { id: 'red2',     name: 'Red',     img: 'AR_YarnEvents_Final_0010_Red2.png',     yarn: { red: 2 },     copies: 6 },
        { id: 'purple2',  name: 'Purple',  img: 'AR_YarnEvents_Final_0012_Purple2.png',  yarn: { purple: 2 },  copies: 6 },
        { id: 'orange2',  name: 'Orange',  img: 'AR_YarnEvents_Final_0014_Orange2.png',  yarn: { orange: 2 },  copies: 6 },
        { id: 'green2',   name: 'Green',   img: 'AR_YarnEvents_Final_0016_Green2.png',   yarn: { green: 2 },   copies: 6 },

        /* --- Existing dual color (6 variants × 2 copies = 12) --- */
        { id: 'greenBlue',     name: 'Green & Blue',     img: 'AR_YarnEvents_Final_0017_GreenBlue.png',     yarn: { green: 1, blue: 1 },     copies: 2 },
        { id: 'purpleGreen',   name: 'Purple & Green',   img: 'AR_YarnEvents_Final_0018_PurpleGreen.png',   yarn: { purple: 1, green: 1 },   copies: 2 },
        { id: 'orangeYellow',  name: 'Orange & Yellow',  img: 'AR_YarnEvents_Final_0019_OrangeYellow.png',  yarn: { orange: 1, yellow: 1 },  copies: 2 },
        { id: 'bluePurple',    name: 'Blue & Purple',    img: 'AR_YarnEvents_Final_0020_BluePurple.png',    yarn: { blue: 1, purple: 1 },    copies: 2 },
        { id: 'yellowRed',     name: 'Yellow & Red',     img: 'AR_YarnEvents_Final_0021_YellowRed.png',     yarn: { yellow: 1, red: 1 },     copies: 2 },
        { id: 'redOrange',     name: 'Red & Orange',     img: 'AR_YarnEvents_Final_0022_RedOrange.png',     yarn: { red: 1, orange: 1 },     copies: 2 },

        /* --- New dual color — Magic Socks expansion (9 variants × 2 copies = 18) --- */
        { id: 'redBlue',       name: 'Red & Blue',       img: 'XYZ_ARMS_YarnCombos_0029_RedBlue.png',       yarn: { red: 1, blue: 1 },       copies: 2 },
        { id: 'redGreen',      name: 'Red & Green',      img: 'XYZ_ARMS_YarnCombos_0030_RedGreen.png',      yarn: { red: 1, green: 1 },      copies: 2 },
        { id: 'redPurple',     name: 'Red & Purple',     img: 'XYZ_ARMS_YarnCombos_0031_RedPurple.png',     yarn: { red: 1, purple: 1 },     copies: 2 },
        { id: 'blueOrange',    name: 'Blue & Orange',    img: 'XYZ_ARMS_YarnCombos_0032_BlueOrange.png',    yarn: { blue: 1, orange: 1 },    copies: 2 },
        { id: 'blueYellow',    name: 'Blue & Yellow',    img: 'XYZ_ARMS_YarnCombos_0033_BlueYellow.png',    yarn: { blue: 1, yellow: 1 },    copies: 2 },
        { id: 'greenOrange',   name: 'Green & Orange',   img: 'XYZ_ARMS_YarnCombos_0034_GreenOrange.png',   yarn: { green: 1, orange: 1 },   copies: 2 },
        { id: 'greenYellow',   name: 'Green & Yellow',   img: 'XYZ_ARMS_YarnCombos_0035_GreenYellow.png',   yarn: { green: 1, yellow: 1 },   copies: 2 },
        { id: 'purpleYellow',  name: 'Purple & Yellow',  img: 'XYZ_ARMS_YarnCombos_0036_PurpleYellow.png',  yarn: { purple: 1, yellow: 1 },  copies: 2 },
        { id: 'purpleOrange',  name: 'Purple & Orange',  img: 'XYZ_ARMS_YarnCombos_0037_PurpleOrange.png',  yarn: { purple: 1, orange: 1 },  copies: 2 },

        /* --- Triple color (4 variants × 2 copies = 8) --- */
        { id: 'purGreBlu',          name: 'Purple, Green & Blue',     img: 'AR_YarnEvents_Final_0023_PurGreBlu.png',          yarn: { purple: 1, green: 1, blue: 1 },     copies: 2 },
        { id: 'blueYellowRed',      name: 'Blue, Yellow & Red',       img: 'AR_YarnEvents_Final_0024_BlueYellowRed.png',      yarn: { blue: 1, yellow: 1, red: 1 },       copies: 2 },
        { id: 'redOrgYel',          name: 'Red, Orange & Yellow',     img: 'AR_YarnEvents_Final_0025_RedOrgYel.png',          yarn: { red: 1, orange: 1, yellow: 1 },     copies: 2 },
        { id: 'orangePurpleGreen',  name: 'Orange, Purple & Green',   img: 'AR_YarnEvents_Final_0026_OrangePurpleGreen.png',  yarn: { orange: 1, purple: 1, green: 1 },   copies: 2 },

        /* --- Wild / Rainbow (6 copies) --- */
        { id: 'anyColor', name: 'Any Color', img: 'AR_YarnEvents_Final_0027_AnyColor.png', yarn: { any: 2 }, copies: 6 },
    ],

    /* =========================================================
       EVENT CARDS — 12 total
       Events are shuffled into the Yarn Deck. When revealed
       during Restock, they're resolved immediately and discarded.
       Effect handling will be implemented in Session 6.
       ========================================================= */
    events: [
        { id: 'tangledCat',   name: 'Tangled Cat',    img: 'AR_YarnEvents_Final_0000_Tangled-Cat.png',    effect: 'tangledCat',   copies: 3 },
        { id: 'yarnSale',     name: 'Yarn Sale',      img: 'AR_YarnEvents_Final_0001_Yarn-Sale.png',      effect: 'yarnSale',     copies: 3 },
        { id: 'donate',       name: 'Donate',         img: 'AR_YarnEvents_Final_0002_Donate.png',         effect: 'donate',       copies: 2 },
        { id: 'friendlyClerk', name: 'Friendly Clerk', img: 'AR_YarnEvents_Final_0003_Friendly-Clerk.png', effect: 'friendlyClerk', copies: 2 },
        { id: 'craftCircle',  name: 'Craft Circle',   img: 'AR_YarnEvents_Final_0004_Craft-Circle.png',   effect: 'craftCircle',  copies: 2 },
    ],


    /* =========================================================
       ITEMS — 5 craftable item types
       Each item has a general color rule that defines the pattern.
       Hat and Blanket are always general (no tile needed).
       Bear, Mittens, Scarf start exact (tile front) and can be
       learned to become general (tile back) in Session 7.
       ========================================================= */
    items: [
        { id: 'hat',      name: 'Hat',      yarnCount: 2, points: 2, colorRule: 'different', img: 'Item Token PNG/Item_Tokens_Final_0000_hat.png',      backImg: 'Item Token PNG/Item_Tokens_Final_0005_hat-back.png',      hasTile: false, tileImg: 'Pattern Tiles PNG/hat_tile.png' },
        { id: 'bear',     name: 'Bear',     yarnCount: 3, points: 3, colorRule: 'oneColor',  img: 'Item Token PNG/Item_Tokens_Final_0001_bear.png',     backImg: 'Item Token PNG/Item_Tokens_Final_0006_bear-back.png',     hasTile: true },
        { id: 'mittens',  name: 'Mittens',  yarnCount: 3, points: 3, colorRule: 'twoColors', img: 'Item Token PNG/Item_Tokens_Final_0002_mittens.png',  backImg: 'Item Token PNG/Item_Tokens_Final_0007_mittens-back.png',  hasTile: true },
        { id: 'scarf',    name: 'Scarf',    yarnCount: 4, points: 4, colorRule: 'different', img: 'Item Token PNG/Item_Tokens_Final_0003_scarf.png',    backImg: 'Item Token PNG/Item_Tokens_Final_0008_scarf-back.png',    hasTile: true },
        { id: 'blanket',  name: 'Blanket',  yarnCount: 5, points: 5, colorRule: 'oneColor',  img: 'Item Token PNG/Item_Tokens_Final_0004_blanket.png',  backImg: 'Item Token PNG/Item_Tokens_Final_0009_blanket-back.png',  hasTile: false, tileImg: 'Pattern Tiles PNG/blanket_tile.png' },
    ],

    /**
     * Get an item definition by id.
     */
    getItem: function(id) {
        return this.items.find(function(it) { return it.id === id; });
    },


    /* =========================================================
       PATTERN TILES — 18 total (6 per type: bear, mittens, scarf)
       Each tile has:
         id        — unique identifier
         itemId    — which item this pattern creates
         exact     — object mapping color → count (exact requirement)
         img       — front image (specific colors shown)
         backImg   — back image (generic pattern shown)
       ========================================================= */
    patternTiles: {
        bear: [
            { id: 'bear-ppp', itemId: 'bear', exact: { purple: 3 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0014_bear-ppp.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_bear-back.png' },
            { id: 'bear-yyy', itemId: 'bear', exact: { yellow: 3 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0016_bear-yyy.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_bear-back.png' },
            { id: 'bear-rrr', itemId: 'bear', exact: { red: 3 },    img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0017_bear-rrr.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_bear-back.png' },
            { id: 'bear-bbb', itemId: 'bear', exact: { blue: 3 },   img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0018_bear-bbb.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_bear-back.png' },
            { id: 'bear-ggg', itemId: 'bear', exact: { green: 3 },  img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0019_bear-ggg.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_bear-back.png' },
            { id: 'bear-ooo', itemId: 'bear', exact: { orange: 3 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0020_bear-ooo.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_bear-back.png' },
        ],
        mittens: [
            { id: 'mittens-yyr', itemId: 'mittens', exact: { yellow: 2, red: 1 },    img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0008_mittens-yyr.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_mittens-back.png' },
            { id: 'mittens-ggb', itemId: 'mittens', exact: { green: 2, blue: 1 },    img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0009_mittens-ggb.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_mittens-back.png' },
            { id: 'mittens-rro', itemId: 'mittens', exact: { red: 2, orange: 1 },    img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0010_mittens-rro.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_mittens-back.png' },
            { id: 'mittens-oop', itemId: 'mittens', exact: { orange: 2, purple: 1 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0011_mittens-oop.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_mittens-back.png' },
            { id: 'mittens-bby', itemId: 'mittens', exact: { blue: 2, yellow: 1 },   img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0012_mittens-bby.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_mittens-back.png' },
            { id: 'mittens-ppg', itemId: 'mittens', exact: { purple: 2, green: 1 },  img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0013_mittens-ppg.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_mittens-back.png' },
        ],
        scarf: [
            { id: 'scarf-gryo', itemId: 'scarf', exact: { green: 1, red: 1, yellow: 1, orange: 1 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0000_Scarf-gryo.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_scarf-back.png' },
            { id: 'scarf-porg', itemId: 'scarf', exact: { purple: 1, orange: 1, red: 1, green: 1 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0001_scarf-porg.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_scarf-back.png' },
            { id: 'scarf-gybp', itemId: 'scarf', exact: { green: 1, yellow: 1, blue: 1, purple: 1 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0002_scarf-gybp.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_scarf-back.png' },
            { id: 'scarf-rogb', itemId: 'scarf', exact: { red: 1, orange: 1, green: 1, blue: 1 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0003_scarf-rogb.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_scarf-back.png' },
            { id: 'scarf-ypbr', itemId: 'scarf', exact: { yellow: 1, purple: 1, blue: 1, red: 1 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0004_scarf-ypbr.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_scarf-back.png' },
            { id: 'scarf-pboy', itemId: 'scarf', exact: { purple: 1, blue: 1, orange: 1, yellow: 1 }, img: 'Pattern Tiles PNG/AR_Pattern_Tiles_0005_scarf-pboy.png', backImg: 'Pattern Tiles PNG/AR_Pattern_Tiles_000_scarf-back.png' },
        ],
    },

    /**
     * Deal one random tile from each type for a player's starting set.
     * Returns an array of 3 tile objects with a `learned` flag added.
     */
    dealPatternTiles: function() {
        var tiles = [];
        ['mittens', 'bear', 'scarf'].forEach(function(type) {
            var pool = CARDS.patternTiles[type];
            var pick = pool[Math.floor(Math.random() * pool.length)];
            tiles.push(Object.assign({}, pick, { learned: false }));
        });
        return tiles;
    },


    /* =========================================================
       CHARACTERS — 8 characters across 4 types
       Each character has 4 action spaces. Action spaces define
       which actions (and how many) are available that turn.

       Action types per space:
         shop: N      — take N cards from Bazaar
         craft: N     — craft up to N items
         exchange: true — swap yarn (costs the whole turn)
         unique: id   — character-specific action (future)

       Action space values verified against player board artwork
       and confirmed by the designer (Session 11).
       Session 13: Added Maker (Jo/Noah) and Expert (Irene/Mauro) types.
       Expert is unique — only 3 action spaces (no Exchange).
       ========================================================= */
    characters: {
        rebecca: {
            id: 'rebecca', banner: 'Other Assets/Character Banners/banner-rebecca.png', name: 'Rebecca', type: 'thriftyShopper',
            subtitle: 'Snugglesaurus',
            boardImg: 'Player Boards PNG/AR_PlayerBoards_Final.2.13__0000_t1-rebecca.png',
            actionSpaces: [
                { label: 'Shop 4',               shop: 4 },
                { label: 'Craft 2',               craft: 2 },
                { label: 'Shop 2 + Craft 1',      shop: 2, craft: 1 },
                { label: 'Exchange',              exchange: true },
            ],
        },
        theo: {
            id: 'theo', banner: 'Other Assets/Character Banners/banner-theo.png', name: 'Theo', type: 'thriftyShopper',
            subtitle: 'Wrist Warmers',
            boardImg: 'Player Boards PNG/AR_PlayerBoards_Final.2.13__0001_t2-theo.png',
            actionSpaces: [
                { label: 'Shop 4',               shop: 4 },
                { label: 'Craft 2',               craft: 2 },
                { label: 'Shop 2 + Craft 1',      shop: 2, craft: 1 },
                { label: 'Exchange',              exchange: true },
            ],
        },
        derrick: {
            id: 'derrick', banner: 'Other Assets/Character Banners/banner-derrick.png', name: 'Derrick', type: 'masterCrafter',
            subtitle: 'Prodigy Cowl',
            boardImg: 'Player Boards PNG/AR_PlayerBoards_Final.2.13__0002_fa1-derrick.png',
            actionSpaces: [
                { label: 'Shop 3',               shop: 3 },
                { label: 'Craft 4',               craft: 4 },
                { label: 'Shop 2 + Craft 1',      shop: 2, craft: 1 },
                { label: 'Exchange',              exchange: true },
            ],
        },
        amara: {
            id: 'amara', banner: 'Other Assets/Character Banners/banner-amara.png', name: 'Amara', type: 'masterCrafter',
            subtitle: 'Hacky Sack',
            boardImg: 'Player Boards PNG/AR_PlayerBoards_Final.2.13__0003_fa2-amara.png',
            actionSpaces: [
                { label: 'Shop 3',               shop: 3 },
                { label: 'Craft 4',               craft: 4 },
                { label: 'Shop 2 + Craft 1',      shop: 2, craft: 1 },
                { label: 'Exchange',              exchange: true },
            ],
        },
        neeha: {
            id: 'neeha', banner: 'Other Assets/Character Banners/banner-neeha.png', name: 'Neeha', type: 'colorSpecialist',
            subtitle: 'Unicorn',
            boardImg: 'Player Boards PNG/AR_PlayerBoards_Final.2.13__0004_c1-neeha.png',
            actionSpaces: [
                { label: 'Shop 3',                         shop: 3 },
                { label: 'Craft 2',                         craft: 2 },
                { label: 'Shop 2 + Craft 1 Any Colors',     shop: 2, craft: 1, unique: 'craftAnyColors' },
                { label: 'Exchange',                        exchange: true },
            ],
        },
        alex: {
            id: 'alex', banner: 'Other Assets/Character Banners/banner-alex.png', name: 'Alex', type: 'colorSpecialist',
            subtitle: 'Infinity Scarf',
            boardImg: 'Player Boards PNG/AR_PlayerBoards_Final.2.13__0005_c2-alex.png',
            actionSpaces: [
                { label: 'Shop 3',                         shop: 3 },
                { label: 'Craft 2',                         craft: 2 },
                { label: 'Shop 2 + Craft 1 Any Colors',     shop: 2, craft: 1, unique: 'craftAnyColors' },
                { label: 'Exchange',                        exchange: true },
            ],
        },
        ted: {
            id: 'ted', banner: 'Other Assets/Character Banners/banner-ted.png', name: 'Ted', type: 'yarnSpinner',
            subtitle: 'Octopus',
            boardImg: 'Player Boards PNG/AR_PlayerBoards_Final.2.13__0006_s1-ted.png',
            actionSpaces: [
                { label: 'Shop 3',                         shop: 3 },
                { label: 'Craft 2',                         craft: 2 },
                { label: 'Take 3 Yarn + Craft 1',           craft: 1, unique: 'take3Yarn' },
                { label: 'Exchange',                        exchange: true },
            ],
        },
        eliza: {
            id: 'eliza', banner: 'Other Assets/Character Banners/banner-eliza.png', name: 'Eliza', type: 'yarnSpinner',
            subtitle: 'Robot',
            boardImg: 'Player Boards PNG/AR_PlayerBoards_Final.2.13__0007_s2-eliza.png',
            actionSpaces: [
                { label: 'Shop 3',                         shop: 3 },
                { label: 'Craft 2',                         craft: 2 },
                { label: 'Take 3 Yarn + Craft 1',           craft: 1, unique: 'take3Yarn' },
                { label: 'Exchange',                        exchange: true },
            ],
        },

        /* --- Session 13: Maker type (Magic Socks expansion characters) --- */
        jo: {
            id: 'jo', banner: 'Other Assets/Character Banners/banner-jo.png', name: 'Jo', type: 'maker',
            subtitle: 'Catnip Mouse',
            boardImg: 'Player Boards PNG/ARMS_PlayerBoards_0040_Maker-Board-1.png',
            actionSpaces: [
                { label: 'Shop 2',                         shop: 2 },
                { label: 'Craft 1 (Make Two)',              craft: 1, unique: 'makeTwoItems' },
                { label: 'Shop 2 + Craft 2',               shop: 2, craft: 2 },
                { label: 'Exchange',                        exchange: true },
            ],
        },
        noah: {
            id: 'noah', banner: 'Other Assets/Character Banners/banner-noah.png', name: 'Noah', type: 'maker',
            subtitle: 'Pigs in a Blanket',
            boardImg: 'Player Boards PNG/ARMS_PlayerBoards_0042_Maker-Board-2.png',
            actionSpaces: [
                { label: 'Shop 2',                         shop: 2 },
                { label: 'Craft 1 (Make Two)',              craft: 1, unique: 'makeTwoItems' },
                { label: 'Shop 2 + Craft 2',               shop: 2, craft: 2 },
                { label: 'Exchange',                        exchange: true },
            ],
        },

        /* --- Session 13: Expert type (Magic Socks expansion characters) --- */
        /* Expert is unique: only 3 action spaces, no Exchange */
        irene: {
            id: 'irene', banner: 'Other Assets/Character Banners/banner-irene.png', name: 'Irene', type: 'expert',
            subtitle: 'Duck Socks',
            boardImg: 'Player Boards PNG/ARMS_PlayerBoards_0041_Expert-Board-1.png',
            actionSpaces: [
                { label: 'Shop 2',                                   shop: 2 },
                { label: 'Take 5 Any + Craft 1 Any Colors',          craft: 1, unique: 'take5AnyCraft1Any' },
                { label: 'Craft 3',                                   craft: 3 },
            ],
        },
        mauro: {
            id: 'mauro', banner: 'Other Assets/Character Banners/banner-mauro.png', name: 'Mauro', type: 'expert',
            subtitle: 'Dog Bandana',
            boardImg: 'Player Boards PNG/ARMS_PlayerBoards_0043_Expert-Board-2.png',
            actionSpaces: [
                { label: 'Shop 2',                                   shop: 2 },
                { label: 'Take 5 Any + Craft 1 Any Colors',          craft: 1, unique: 'take5AnyCraft1Any' },
                { label: 'Craft 3',                                   craft: 3 },
            ],
        },

        /* --- Session 36: Hank, The Stitchmeister — Story Mode FINAL BOSS ---
           AI automa only (the human never selects on his board). Two craft-only
           action spaces; he bounces between them every turn. His special boss
           rules live in game.js, keyed on the isHank flag:
             1. Auto +3 yarn of one color at the start of every turn.
             2. +5 on EVERY Special Request he completes (every SR is his favorite).
             3. Leftover yarn SCORES +1 per 2 instead of the normal -1 penalty.
             + starts with +3 yarn, and crafts ignoring color-matching (craftAnyColors). */
        hank: {
            id: 'hank', name: 'Hank', type: 'hank', isHank: true,
            subtitle: 'The Stitchmeister',
            boardImg: 'Player Boards PNG/AR_Hank_SoloBoard.png',
            actionSpaces: [
                { label: 'Craft 1 (Make Two)',              craft: 1, unique: 'makeTwoItems' },
                { label: 'Craft 2 + Take 3 Any',           craft: 2, unique: 'take3Any' },
            ],
        },
    },

    /**
     * Get a character definition by id.
     */
    getCharacter: function(id) {
        return this.characters[id] || null;
    },


    /* =========================================================
       SPECIAL REQUEST CARDS — 26 base + 4 promos + 13 expansion = 43 total
       Shuffled into the top half of the Yarn Deck during setup.
       Each character has a Favorite Request (matching their subtitle).
       When revealed during Restock, active player keeps it or gives
       it to another player — it's always taken by someone.
       Crafting earns points; leaving unfinished loses points.

       Each SR has a colorRule that governs how the yarn cost works:
         'specific'        — exact colors; use the yarn:{} object
         'any'             — any color combo; yarnCount = total needed
         'sameColor'       — all yarn must be the same color; yarnCount = total
         'different'       — each yarn must be a different color; yarnCount = total
         'give'            — give yarnCount yarn from stash to each other player
                             (SP: yarn goes to supply instead)
         'sameColorPlus'   — Session 13: N same color + specific extras;
                             yarnCount = same portion, plusYarn:{} = extras.
                             Same color CANNOT be any of the plusYarn colors.
         'specificPlusAny'  — Session 13: specific colors + N of any other color;
                             yarn:{} = specific, anyCount = other portion.
                             "Other" = any color NOT in the yarn:{} object.
         'specificPlusSame' — Session 13: specific colors + N of one color;
                             yarn:{} = specific, sameCount = same portion.
                             Same color CAN be one of the specific colors or different.

       All rules verified against physical card art.
       ========================================================= */
    specialRequests: [

        /* --- Character Favorites (match character subtitles exactly) --- */
        { id: 'snugglesaurus',  name: 'Snugglesaurus',        favoriteOf: 'rebecca', colorRule: 'any',      yarnCount: 9,                                                          points: 13,   img: 'Square Cards PNG/AR_Special_Requests_Snugglesaurus.png' },
        { id: 'wristWarmers',   name: 'Wrist Warmers',        favoriteOf: 'theo',    colorRule: 'specific', yarn: { green: 2, orange: 2 },                                         points: 8,    img: 'Square Cards PNG/AR_Special_Requests_WristWarmers.png' },
        { id: 'prodCowl',       name: 'Prodigy Cowl',         favoriteOf: 'derrick', colorRule: 'specific', yarn: { blue: 4 },                                                     points: 8,    img: 'Square Cards PNG/AR_Special_Requests_ProdCowl.png' },
        { id: 'infinityScarf',  name: 'Infinity Scarf',       favoriteOf: 'alex',    colorRule: 'specific', yarn: { yellow: 2, red: 1, blue: 1, green: 1, orange: 1, purple: 1 }, points: 10,   img: 'Square Cards PNG/AR_Special_Requests_InfinityScarf.png' },
        { id: 'unicorn',        name: 'Unicorn',              favoriteOf: 'neeha',   colorRule: 'specific', yarn: { red: 1, blue: 1, green: 1, yellow: 1, orange: 1, purple: 1 }, points: 10,   img: 'Square Cards PNG/AR_Special_Requests_Unicorn.png' },
        { id: 'hackySack',      name: 'Hacky Sack',           favoriteOf: 'amara',   colorRule: 'different', yarnCount: 3,                                                         points: 6,    img: 'Square Cards PNG/AR_Special_Requests_Hacky-Sack.png' },
        { id: 'octopus',        name: 'Octopus',              favoriteOf: 'ted',     colorRule: 'specific', yarn: { purple: 4 },                                                   points: 8,    img: 'Square Cards PNG/AR_Special_Requests_Octopus.png' },
        { id: 'robot',          name: 'Robot',                favoriteOf: 'eliza',   colorRule: 'sameColor', yarnCount: 5,                                                         points: 9,    img: 'Square Cards PNG/AR_Special_Requests_Robot.png' },

        /* --- Other Special Requests (base game) --- */
        { id: 'buttonEye',       name: 'Button Eye Sweater',  favoriteOf: null, colorRule: 'specific',  yarn: { blue: 5, yellow: 1 },                                              points: 9,    img: 'Square Cards PNG/AR_Special_Requests_ButtonEye.png' },
        { id: 'friendship',      name: 'Friendship Bracelets',favoriteOf: null, colorRule: 'give',      yarnCount: 2,                                                              points: 7,    img: 'Square Cards PNG/AR_Special_Requests_Friendship.png' },
        { id: 'trogdor',         name: 'Trogdor (Dagron)',    favoriteOf: null, colorRule: 'specific',  yarn: { green: 3, red: 1, orange: 1, yellow: 1 },                          points: 9,    img: 'Square Cards PNG/AR_SpecialReq_Final_Dragon.png' },
        { id: 'dwarfsBeard',     name: "Dwarf's Beard",       favoriteOf: null, colorRule: 'specific',  yarn: { red: 3, orange: 3 },                                               points: 9,    img: "Square Cards PNG/AR_SpecialReq_Final_Dwarf's-Beard.png" },
        { id: 'tatteredSweater', name: 'Tattered Sweater',    favoriteOf: null, colorRule: 'specific',  yarn: { red: 3, green: 3 },                                                points: 9,    img: "Square Cards PNG/AR_SpecialReq_Final_Freddy's-Sweater.png" },
        { id: 'houseScarfRY',    name: 'House Scarf (R&Y)',   favoriteOf: null, colorRule: 'specific',  yarn: { red: 3, yellow: 3 },                                               points: 9.75, img: 'Square Cards PNG/AR_SpecialReq_Final_House-Scarf-RY.png' },
        { id: 'houseScarfBO',    name: 'House Scarf (B&O)',   favoriteOf: null, colorRule: 'specific',  yarn: { blue: 3, orange: 3 },                                              points: 9.75, img: 'Square Cards PNG/AR_SpecialReq_Final_House-Scarf-BO.png' },
        { id: 'houseScarfGY',    name: 'House Scarf (G&Y)',   favoriteOf: null, colorRule: 'specific',  yarn: { green: 3, yellow: 3 },                                             points: 9.75, img: 'Square Cards PNG/AR_SpecialReq_Final_House-Scarf-GY.png' },
        { id: 'houseScarfYP',    name: 'House Scarf (Y&P)',   favoriteOf: null, colorRule: 'specific',  yarn: { yellow: 3, purple: 3 },                                            points: 9.75, img: 'Square Cards PNG/AR_SpecialReq_Final_House-Scarf-YP.png' },
        { id: 'cunningHat',      name: 'Cunning Hat',         favoriteOf: null, colorRule: 'specific',  yarn: { red: 1, orange: 1, yellow: 1 },                                    points: 7,    img: "Square Cards PNG/AR_SpecialReq_Final_Jaynes-Hat.png" },
        { id: 'loot',            name: 'Loot',                favoriteOf: null, colorRule: 'specific',  yarn: { yellow: 3 },                                                       points: 7,    img: 'Square Cards PNG/AR_SpecialReq_Final_Loot.png' },
        { id: 'laserSword',      name: 'Laser Sword',         favoriteOf: null, colorRule: 'specific',  yarn: { purple: 4 },                                                       points: 8,    img: 'Square Cards PNG/AR_SpecialReq_Final_Purple-Laser-Sword.png' },
        { id: 'friendlyNeighbor',name: 'Friendly Neighbor',   favoriteOf: null, colorRule: 'specific',  yarn: { red: 3 },                                                          points: 8,    img: "Square Cards PNG/AR_SpecialReq_Final_Roger's-Cardigan.png" },
        { id: 'shoulderMonster', name: 'Shoulder Monster',    favoriteOf: null, colorRule: 'specific',  yarn: { red: 1, purple: 3 },                                               points: 8,    img: 'Square Cards PNG/AR_SpecialReq_Final_Shoulder-Beholder.png' },
        { id: 'tomsScarf',       name: "Tom's Scarf",         favoriteOf: null, colorRule: 'different', yarnCount: 5,                                                              points: 9,    img: "Square Cards PNG/AR_SpecialReq_Final_The-Doctors-Scarf.png" },
        { id: 'trouble',         name: 'Trouble',             favoriteOf: null, colorRule: 'specific',  yarn: { orange: 5 },                                                       points: 10,   img: 'Square Cards PNG/AR_SpecialReq_Final_Tribble.png' },
        { id: 'undone',          name: 'Undone',              favoriteOf: null, colorRule: 'specific',  yarn: { blue: 5 },                                                         points: 10,   img: 'Square Cards PNG/AR_SpecialReq_Final_Undone.png' },
        { id: 'spaceSuit',       name: 'Space Suit',          favoriteOf: null, colorRule: 'specific',  yarn: { red: 2, green: 2, blue: 2 },                                       points: 9,    img: "Square Cards PNG/AR_SpecialReq_Final_Ziggy's-Suit.png" },

        /* --- Promo Special Requests (Dice Tower Kickstarter) --- */
        { id: 'diceTower',       name: 'The Dice Tower',      favoriteOf: null, colorRule: 'specific',  yarn: { blue: 5, red: 1 },                                                 points: 10,   img: 'Square Cards PNG/XYZ_AR_SR_DTPROMO_The-Dice-Tower.png' },
        { id: 'shinyMathRocks',  name: 'Shiny Math Rocks',    favoriteOf: null, colorRule: 'sameColor', yarnCount: 6,                                                              points: 13,   img: 'Square Cards PNG/XYZ_AR_SR_DTPROMO_Math-Rocks.png' },
        { id: 'tomsHat',         name: "Tom's Hat",           favoriteOf: null, colorRule: 'specific',  yarn: { red: 4, orange: 1 },                                               points: 9,    img: "Square Cards PNG/XYZ_AR_SR_DTPROMO_Tom's-Hat.png" },
        /* Session 41: the promo "Everyone's Welcome" (DTPROMO) was a DUPLICATE of the
           product version (everyonesWelcomeExp, in the Magic Socks block below). Removed
           from the digital game per Adam — we keep the real product version, which is the
           Story Mode reward for beating Hank. */

        /* --- Session 13: Magic Socks expansion — New character favorites --- */
        { id: 'catnipMouse',      name: 'Catnip Mouse',       favoriteOf: 'jo',     colorRule: 'specific',         yarn: { blue: 3, yellow: 1 },                                   points: 7,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0009_Catnip-Mouse.png' },
        { id: 'pigsInABlanket',   name: 'Pigs in a Blanket',  favoriteOf: 'noah',   colorRule: 'specific',         yarn: { red: 2, orange: 2, yellow: 2 },                         points: 9,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0012_Pigs-in-a-Blanket.png' },
        { id: 'duckSocks',        name: 'Duck Socks',         favoriteOf: 'irene',  colorRule: 'sameColor',        yarnCount: 4,                                                    points: 7,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0011_Duck-Socks.png' },
        { id: 'dogBandana',       name: 'Dog Bandana',        favoriteOf: 'mauro',  colorRule: 'specificPlusSame', yarn: { purple: 3 }, sameCount: 2,                               points: 8,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0010_Dog-Bandana.png' },

        /* --- Session 13: Magic Socks expansion — Non-favorite SRs --- */
        { id: 'turtle',           name: 'Turtle',             favoriteOf: null, colorRule: 'specific',         yarn: { green: 3, red: 3 },                                          points: 9,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0001_Turtle.png' },
        { id: 'platypus',         name: 'Platypus',           favoriteOf: null, colorRule: 'specific',         yarn: { blue: 3, yellow: 2 },                                        points: 8,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0002_Platypus.png' },
        { id: 'koi',              name: 'Koi',                favoriteOf: null, colorRule: 'specificPlusAny',  yarn: { orange: 3 }, anyCount: 2,                                    points: 8,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0003_Koi.png' },
        { id: 'mallard',          name: 'Mallard',            favoriteOf: null, colorRule: 'specificPlusAny',  yarn: { orange: 1, green: 2 }, anyCount: 3,                          points: 9,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0004_Mallard.png' },
        { id: 'spider',           name: 'Spider',             favoriteOf: null, colorRule: 'specific',         yarn: { yellow: 1, green: 1, purple: 1, blue: 1 },                   points: 8,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0005_Spider.png' },
        { id: 'skelly',           name: 'Skelly',             favoriteOf: null, colorRule: 'sameColorPlus',    yarnCount: 5, plusYarn: { orange: 1 },                                points: 9,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0006_Skelly.png' },
        { id: 'ghost',            name: 'Ghost',              favoriteOf: null, colorRule: 'sameColorPlus',    yarnCount: 5, plusYarn: { red: 1 },                                   points: 9,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0007_Ghost.png' },
        { id: 'bat',              name: 'Bat',                favoriteOf: null, colorRule: 'specific',         yarn: { purple: 3, red: 1 },                                         points: 9,    img: 'Square Cards PNG/XYZ_ARMS_SpReq__0008_Bat.png' },
        { id: 'everyonesWelcomeExp', name: "Everyone's Welcome", favoriteOf: null, colorRule: 'specific',     yarn: { red: 2, blue: 2, green: 2, yellow: 2, orange: 2, purple: 2 }, points: 15,   img: "Square Cards PNG/XYZ_ARMS_SpReq__0013_Everyone's-Welcome.png" },
    ],

    /**
     * Get a special request definition by id.
     */
    getSpecialRequest: function(id) {
        return this.specialRequests.find(function(sr) { return sr.id === id; });
    },

    /**
     * Build the Special Request pool for a single character at setup.
     * Rules (p.5): Take the character's Favorite Request + 1 additional per player.
     * For single-player: 1 favorite + 1 random = 2 total.
     * Returns an array of SR card objects ready to shuffle into the deck.
     */
    buildSpecialRequestsForSetup: function(characterId, numPlayers, enabledIds) {
        numPlayers = numPlayers || 1;
        var allSRs = this.specialRequests;

        // Separate this character's favorite
        var favorite = allSRs.find(function(sr) { return sr.favoriteOf === characterId; });
        var others = allSRs.filter(function(sr) { return sr.favoriteOf !== characterId; });

        // Session 41 (Story SR Board): if an enabled-set is supplied, the non-favorite
        // pool is limited to the player's enabled SRs. The character's favorite is always
        // guaranteed regardless. Quick Play passes nothing → full pool (unchanged).
        // Safety: if filtering leaves nothing, fall back to the full pool so a game is
        // never starved of SRs.
        if (enabledIds && enabledIds.length) {
            var filtered = others.filter(function(sr) { return enabledIds.indexOf(sr.id) !== -1; });
            if (filtered.length) others = filtered;
        }

        // Shuffle the remaining pool
        var pool = others.slice();
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }

        // Take 1 additional per player from the shuffled pool
        var selected = pool.slice(0, numPlayers);

        // Combine: favorite + selected randoms
        var result = [];
        if (favorite) result.push(favorite);
        result = result.concat(selected);

        // Return as card objects
        return result.map(function(def) {
            var card = {
                uid:        'sr_' + def.id,
                type:       'specialRequest',
                id:         def.id,
                name:       def.name,
                img:        def.img,
                points:     def.points,
                colorRule:  def.colorRule || 'specific',
                isFavorite: def.favoriteOf === characterId,
                favoriteOf: def.favoriteOf || null,
            };
            // Pass through whichever cost field this SR uses
            if (def.yarn)      card.yarn      = Object.assign({}, def.yarn);
            if (def.yarnCount) card.yarnCount = def.yarnCount;
            // Session 13: Pass through new colorRule fields
            if (def.anyCount)  card.anyCount  = def.anyCount;
            if (def.plusYarn)   card.plusYarn   = Object.assign({}, def.plusYarn);
            if (def.sameCount) card.sameCount = def.sameCount;
            return card;
        });
    },

    /**
     * Session 9: Build the Special Request pool for multiplayer.
     * Rules: Each character's Favorite goes in + 1 additional SR per player.
     * @param {string[]} characterIds — array of character IDs in play
     * @returns {Array} SR card objects ready to shuffle into the deck
     */
    buildSpecialRequestsForMultiplayer: function(characterIds, enabledIds) {
        var allSRs = this.specialRequests;
        var numPlayers = characterIds.length;

        // Collect favorites for all characters in play
        var favorites = [];
        var nonFavorites = [];
        allSRs.forEach(function(sr) {
            if (characterIds.indexOf(sr.favoriteOf) !== -1) {
                favorites.push(sr);
            } else {
                nonFavorites.push(sr);
            }
        });

        // Session 41 (Story SR Board): limit the non-favorite pool to the player's
        // enabled SRs when supplied (Story Mode). Every participating character's
        // favorite is still guaranteed. Quick Play passes nothing → full pool.
        // Safety fallback to the full pool if the filter empties it.
        if (enabledIds && enabledIds.length) {
            var filtered = nonFavorites.filter(function(sr) { return enabledIds.indexOf(sr.id) !== -1; });
            if (filtered.length) nonFavorites = filtered;
        }

        // Shuffle non-favorites
        var pool = nonFavorites.slice();
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }

        // Take numPlayers additional randoms
        var selected = pool.slice(0, numPlayers);
        var result = favorites.concat(selected);

        // Return as card objects — isFavorite is checked at take-time, not here
        return result.map(function(def) {
            var card = {
                uid:        'sr_' + def.id,
                type:       'specialRequest',
                id:         def.id,
                name:       def.name,
                img:        def.img,
                points:     def.points,
                colorRule:  def.colorRule || 'specific',
                isFavorite: false,  // resolved when a player takes the SR
                favoriteOf: def.favoriteOf || null,
            };
            if (def.yarn)      card.yarn      = Object.assign({}, def.yarn);
            if (def.yarnCount) card.yarnCount = def.yarnCount;
            // Session 13: Pass through new colorRule fields
            if (def.anyCount)  card.anyCount  = def.anyCount;
            if (def.plusYarn)   card.plusYarn   = Object.assign({}, def.plusYarn);
            if (def.sameCount) card.sameCount = def.sameCount;
            return card;
        });
    },


    /* =========================================================
       PROJECT CARDS — 16 total
       Separate deck displayed 3 face-up beside the board.
       Completed during Restock by turning in the exact item tokens.
       Requirements list item types and how many of each are needed.

       All data verified against physical spreadsheet (Session 7).
       ========================================================= */
    projects: [
        { id: 'lumberjack',    name: 'Lumberjack',       requirements: { hat:1, scarf:1 },                       points: 13, img: 'Project Cards PNG/AR_ProjectCards_Mask_0000_Lumberjack.png' },
        { id: 'snowDay',       name: 'Snow Day',          requirements: { hat:1, mittens:1, scarf:1 },            points: 20, img: 'Project Cards PNG/AR_ProjectCards_Mask_0001_Snow-Day.png' },
        { id: 'triplets',      name: 'Triplets!',         requirements: { bear:3 },                               points: 20, img: 'Project Cards PNG/AR_ProjectCards_Mask_0002_Triplets.png' },
        { id: 'babyShower',    name: 'Baby Shower',       requirements: { hat:1, bear:1, blanket:1 },             points: 20, img: 'Project Cards PNG/AR_ProjectCards_Mask_0003_BabyShower.png' },
        { id: 'oktoberfest',   name: 'Oktoberfest',       requirements: { mittens:2, scarf:2 },                   points: 25, img: 'Project Cards PNG/AR_ProjectCards_Mask_0004_Oktoberfest.png' },
        { id: 'bffs',          name: 'BFFs',              requirements: { hat:2, mittens:2, scarf:2 },            points: 37, img: 'Project Cards PNG/AR_ProjectCards_Mask_0005_BFFs.png' },
        { id: 'recess',        name: 'Recess',            requirements: { hat:1, mittens:1 },                     points: 13, img: 'Project Cards PNG/AR_ProjectCards_Mask_0006_Recess.png' },
        { id: 'stargazers',    name: 'Stargazers',        requirements: { hat:2, blanket:1 },                     points: 20, img: 'Project Cards PNG/AR_ProjectCards_Mask_0007_Stargazers.png' },
        { id: 'winterComing',  name: 'Winter is Coming',  requirements: { blanket:2 },                            points: 20, img: 'Project Cards PNG/AR_ProjectCards_Mask_0008_Winter-is-Coming.png' },
        { id: 'peasPod',       name: 'Peas in a Pod',     requirements: { bear:2, blanket:1 },                    points: 25, img: 'Project Cards PNG/AR_ProjectCards_Mask_0009_Peas-in-a-Pod.png' },
        { id: 'bleacherBum',   name: 'Bleacher Bum',      requirements: { hat:1, mittens:1, scarf:1, blanket:1 }, points: 30, img: 'Project Cards PNG/AR_ProjectCards_Mask_0010_BleacherBum.png' },
        { id: 'wholeNineYards',name: 'Whole Nine Yards',  requirements: { hat:1, bear:1, mittens:1, scarf:1, blanket:1 }, points: 35, img: 'Project Cards PNG/AR_ProjectCards_Mask_0011_Whole-Nine-Yards.png' },
        { id: 'fallEssentials',name: 'Fall Essentials',   requirements: { mittens:1, scarf:1 },                   points: 15, img: 'Project Cards PNG/AR_ProjectCards_Mask_0012_Fall-Essentials.png' },
        { id: 'naptime',       name: 'Naptime',           requirements: { bear:1, blanket:1 },                    points: 15, img: 'Project Cards PNG/AR_ProjectCards_Mask_0013_Naptime.png' },
        { id: 'debonbear',     name: 'Debonbear',         requirements: { bear:1, mittens:1, scarf:1 },           points: 20, img: 'Project Cards PNG/AR_ProjectCards_Mask_0014_Debonbear.png' },
        { id: 'pondHockey',    name: 'Pond Hockey',       requirements: { hat:4 },                                points: 20, img: 'Project Cards PNG/AR_ProjectCards_Mask_0015_Pond-Hockey.png' },
    ],

    /**
     * Build a shuffled copy of the project deck.
     * Returns 16 project card objects with a uid added.
     */
    buildProjectDeck: function() {
        var deck = this.projects.map(function(def) {
            return {
                uid:          'proj_' + def.id,
                type:         'project',
                id:           def.id,
                name:         def.name,
                requirements: Object.assign({}, def.requirements),
                points:       def.points,
                img:          def.img,
            };
        });
        // Shuffle
        for (var i = deck.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
        }
        return deck;
    },


    /* =========================================================
       HELPER: Build a shuffled deck from card definitions
       Expands each definition's `copies` into individual
       card instances, each with a unique `uid`.
       Returns the Yarn + Event deck only.
       Special Requests are handled separately (buildSpecialRequestsForSetup).
       ========================================================= */
    buildDeck: function() {
        var deck = [];
        var uid = 0;

        // Add Yarn cards
        this.yarn.forEach(function(def) {
            for (var i = 0; i < def.copies; i++) {
                deck.push({
                    uid:  'yarn_' + (uid++),
                    type: 'yarn',
                    id:   def.id,
                    name: def.name,
                    img:  'Square Cards PNG/' + def.img,
                    yarn: Object.assign({}, def.yarn),  // clone
                });
            }
        });

        // Add Event cards
        this.events.forEach(function(def) {
            for (var i = 0; i < def.copies; i++) {
                deck.push({
                    uid:    'event_' + (uid++),
                    type:   'event',
                    id:     def.id,
                    name:   def.name,
                    img:    'Square Cards PNG/' + def.img,
                    effect: def.effect,
                });
            }
        });

        return deck;
    },

    /* =========================================================
       AWARDS SEASON SOLO AUTOMA — Tangled Yarn + Snagged Projects
       Session 42 (P2). Spec: zAR Digital Test/HANK_AUTOMA_SPEC.md,
       source: ARME Awards Season SOLO Rulebook v7.
       These drive the Hank final-boss automa. Each card carries a
       machine-readable `fx` (effect id) + `arg` the game.js resolver
       reads, plus human `text`. Themed tangles + snagged projects are
       double-sided: Light(green)/Hard(red) tangles, Easy(green)/Hard(red)
       snagged — the side chosen at seed time sets the difficulty.
       ========================================================= */
    TANGLED_ART: 'Other Assets/ARME/Awards Season/Tangled Yarn (Square Cards)/',
    SNAGGED_ART: 'Other Assets/ARME/Awards Season/Snagged Projects/',

    // kind: 'instant' (resolve + discard) | 'gnome' (ongoing rule, one active) | 'reminder' (persistent snag)
    tangledYarn: [
        /* ----- Basic (yellow, single-sided) — always the same ----- */
        { id:'remodeling', code:'B4', name:'Remodeling', tier:'basic', kind:'instant',
          file:'AR_ME_AwSea_TangledYarn_B4---Remodeling---Basic.png',
          fx:'remodeling',
          text:'Discard all yarn cards from the bazaar at end of this Restock Phase. Don’t refill until next Restock Phase.' },
        { id:'highDemand', code:'B1', name:'High Demand', tier:'basic', kind:'gnome',
          file:'AR_ME_AwSea_TangledYarn_B1---High-Demand---Basic.png',
          fx:'highDemand',
          text:'You must keep all Special Requests revealed during Restock.' },
        { id:'emergency', code:'B2', name:'Emergency!', tier:'basic', kind:'gnome',
          file:'AR_ME_AwSea_TangledYarn_B2---Emergency---Basic.png',
          fx:'emergency',
          text:'You must take the next Special Request revealed, and craft it before crafting anything else.' },
        { id:'grumpyShopper', code:'B3', name:'Grumpy Shopper', tier:'basic', kind:'gnome',
          file:'AR_ME_AwSea_TangledYarn_B3---Grumpy-Shopper---Basic.png',
          fx:'grumpyShopper',
          text:'Discard the events Friendly Clerk, Yarn Sale, Craft Circle as soon as revealed, without resolving.' },

        /* ----- Themed (double-sided Light green / Hard red) ----- */
        { id:'blazingNeedles', code:'T1', name:'Blazing Needles', tier:'themed', kind:'instant',
          fileLight:'AR_ME_AwSea_TangledYarn_T1---Blazing-Needles---Light.png',
          fileHard: 'AR_ME_AwSea_TangledYarn_T1---Blazing-Needles---Heavy.png',
          light:{ fx:'hankFinishProject', arg:{ which:'lowest' },  text:'Hank Finishes the lowest-value Project in the market.' },
          hard: { fx:'hankFinishProject', arg:{ which:'highest' }, text:'Hank Finishes the highest-value Project in the market.' } },
        { id:'whereItGo', code:'T2', name:'Where’d it go?', tier:'themed', kind:'instant',
          fileLight:'AR_ME_AwSea_TangledYarn_T2---WhereItGo---Light.png',
          fileHard: 'AR_ME_AwSea_TangledYarn_T2---WhereItGo---Heavy.png',
          light:{ fx:'hankFinishProject', arg:{ which:'lowest',  thenMarket:'shuffleBack' }, text:'Hank Finishes the lowest Project; shuffle the rest back into the deck.' },
          hard: { fx:'hankFinishProject', arg:{ which:'highest', thenMarket:'shuffleBack' }, text:'Hank Finishes the highest Project; shuffle the rest back into the deck.' } },
        { id:'itsGone', code:'T3', name:'It’s Gone!?', tier:'themed', kind:'instant',
          fileLight:'AR_ME_AwSea_TangledYarn_T3---Its-Gone---Light.png',
          fileHard: 'AR_ME_AwSea_TangledYarn_T3---Its-Gone---Heavy.png',
          light:{ fx:'hankFinishProject', arg:{ which:'lowest',  thenMarket:'discard' }, text:'Hank Finishes the lowest Project; discard the others (may end the game).' },
          hard: { fx:'hankFinishProject', arg:{ which:'highest', thenMarket:'discard' }, text:'Hank Finishes the highest Project; discard the others (may end the game).' } },
        { id:'lessonsLearned', code:'T4', name:'Lessons Learned', tier:'themed', kind:'instant',
          fileLight:'AR_ME_AwSea_TangledYarn_T4---Lessons-Learned---Light.png',
          fileHard: 'AR_ME_AwSea_TangledYarn_T4---Lessons-Learned---Heavy.png',
          light:{ fx:'flipPatterns', arg:{ count:'one' }, text:'Flip one Pattern you’ve learned back to its original side.' },
          hard: { fx:'flipPatterns', arg:{ count:'all' }, text:'Flip all learned Patterns back to their original side.' } },
        { id:'archRivals', code:'T6', name:'ArchRivals', tier:'themed', kind:'gnome',
          fileLight:'AR_ME_AwSea_TangledYarn_T6---ArchRivals---Light.png',
          fileHard: 'AR_ME_AwSea_TangledYarn_T6---ArchRivals---Heavy.png',
          light:{ fx:'archRivals', arg:{ mode:'discardSR' }, text:'Discard each Special Request drawn during Restock.' },
          hard: { fx:'archRivals', arg:{ mode:'hankTakesSR' }, text:'Hank takes each Special Request drawn during Restock.' } },
        { id:'yarnRation', code:'T7', name:'Yarn Ration', tier:'themed', kind:'gnome',
          fileLight:'AR_ME_AwSea_TangledYarn_T7---Yarn-Ration---Light.png',
          fileHard: 'AR_ME_AwSea_TangledYarn_T7---Yarn-Ration---Heavy.png',
          light:{ fx:'yarnRation', arg:{ deny:3 }, text:'Discard each “3-yarn” card drawn in Restock; leave that bazaar slot empty.' },
          hard: { fx:'yarnRation', arg:{ deny:2 }, text:'Discard each “2-yarn” card drawn in Restock; leave that bazaar slot empty.' } },
        { id:'catNap', code:'T5', name:'Cat Nap', tier:'themed', kind:'gnome',
          fileLight:'AR_ME_AwSea_TangledYarn_T5---Cat-Nap---Light.png',
          fileHard: 'AR_ME_AwSea_TangledYarn_T5---Cat-Nap---Heavy.png',
          light:{ fx:'catNap', arg:{ colors:1 }, text:'Place the cat on 1 color — you can’t shop/collect it while there.' },
          hard: { fx:'catNap', arg:{ colors:2 }, text:'Place the cat across 2 adjacent colors — you can’t shop/collect them.' } },
    ],

    snaggedProjects: [
        { id:'urgentRequest', name:'Urgent Request', kind:'reminder',
          fileEasy:'AR_ME_AwSea_SnagProj_Urgent-Request---Easy.png',
          fileHard:'AR_ME_AwSea_SnagProj_Urgent-Request---Hard.png',
          easy:{ fx:'urgentRequest', arg:{ mode:'oneEachItem' }, text:'Before Finishing another Project, you must hold 1 of each Item-token type.' },
          hard:{ fx:'urgentRequest', arg:{ mode:'completeSR' },  text:'Before Finishing any other Project, you must Complete a Special Request.' } },
        { id:'shenaniGnomes', name:'Shenani-gnomes', kind:'instant',
          fileEasy:'AR_ME_AwSea_SnagProj_Shenani-gnomes---Easy.png',
          fileHard:'AR_ME_AwSea_SnagProj_Shenani-gnomes---Hard.png',
          easy:{ fx:'shenaniGnomes', arg:{ ratio:1 }, text:'Give Hank 1 yarn per 1 yarn in your stash.' },
          hard:{ fx:'shenaniGnomes', arg:{ ratio:2 }, text:'Give Hank 2 yarn per 1 yarn in your stash.' } },
        { id:'yarnballWizard', name:'Yarnball Wizard', kind:'instant',
          fileEasy:'AR_ME_AwSea_SnagProj_Yarnball-Wizard---Easy.png',
          fileHard:'AR_ME_AwSea_SnagProj_Yarnball-Wizard---Hard.png',
          easy:{ fx:'yarnballWizard', arg:{ mode:'mostValuable' }, text:'Hank crafts the most valuable Item possible with his current yarn.' },
          hard:{ fx:'yarnballWizard', arg:{ mode:'asMany' },       text:'Hank crafts as many Items as possible with his current yarn (any colors).' } },
        { id:'yarnEnvy', name:'Yarn Envy', kind:'instant',
          fileEasy:'AR_ME_AwSea_SnagProj_Yarn-Envy---Easy.png',
          fileHard:'AR_ME_AwSea_SnagProj_Yarn-Envy---Hard.png',
          easy:{ fx:'yarnEnvy', arg:{ mode:'shopAll' },              text:'Hank Shops all cards in the bazaar.' },
          hard:{ fx:'yarnEnvy', arg:{ mode:'discardAndGiveStash' }, text:'Discard all bazaar cards, then give all your stash yarn to Hank (don’t refill until next restock).' } },
    ],

    /**
     * Instantiate one Tangled Yarn card on a given side.
     * @param {object} def  — an entry from CARDS.tangledYarn
     * @param {string} side — 'light' | 'hard' (ignored for basic/single-sided)
     */
    makeTangledCard: function(def, side) {
        var basic = (def.tier === 'basic');
        var s = basic ? null : (side === 'hard' ? 'hard' : 'light');
        var eff = basic ? { fx:def.fx, arg:def.arg || {}, text:def.text } : def[s];
        var file = basic ? def.file : (s === 'hard' ? def.fileHard : def.fileLight);
        return {
            uid:  'tangle_' + def.id + '_' + (s || 'basic'),
            type: 'tangledYarn',
            id:   def.id,
            code: def.code,
            name: def.name,
            tier: def.tier,
            kind: def.kind,          // instant | gnome
            side: s || 'basic',      // basic | light | hard
            hard: (s === 'hard'),
            fx:   eff.fx,
            arg:  Object.assign({}, eff.arg || {}),
            text: eff.text,
            img:  this.TANGLED_ART + file,
        };
    },

    /**
     * Instantiate one Snagged Project on a given side.
     * @param {string} side — 'easy' | 'hard'
     */
    makeSnaggedCard: function(def, side) {
        var s = (side === 'hard') ? 'hard' : 'easy';
        var eff = def[s];
        return {
            uid:  'snag_' + def.id + '_' + s,
            type: 'snaggedProject',
            id:   def.id,
            name: def.name,
            kind: def.kind,          // instant | reminder
            side: s,                 // easy | hard
            hard: (s === 'hard'),
            fx:   eff.fx,
            arg:  Object.assign({}, eff.arg || {}),
            text: eff.text,
            img:  this.SNAGGED_ART + (s === 'hard' ? def.fileHard : def.fileEasy),
        };
    },

    // Which themed tangles seed at the base game (4 of 7). A balanced default mix: 2 that
    // score Hank (finish-project instants) + 2 that pressure the player (Gnome Rules).
    // Cat Nap, Lessons Learned are defined + ready; which 4 seed is a P5 tuning knob
    // (the difficulty ladder will rotate/expand the set).
    // Session 43 (Adam's playtest call): It's Gone!? is OUT of the base mix — its
    // row-wipe "came outta nowhere and just ended the game" at R0. Where'd It Go?
    // replaces it: same Hank-snipes-a-project beat, but the rest of the row shuffles
    // BACK into the deck (no wipe, no surprise game-end). It's Gone!? becomes a
    // deep-ladder card — rotates in at high reds only (opt-in pain, difficulty v2).
    HANK_BASE_THEMED: ['blazingNeedles', 'whereItGo', 'archRivals', 'yarnRation'],
    // Greenest-first flip order: as red-count R climbs, these flip to Hard in order.
    // itsGone parked at the END — it only matters once card rotation seeds it (deep reds).
    HANK_FLIP_ORDER:  ['blazingNeedles', 'whereItGo', 'archRivals', 'yarnRation',
                       'urgentRequest', 'yarnballWizard', 'shenaniGnomes', 'yarnEnvy',
                       'itsGone'],

    /**
     * Assemble the Hank automa card set for a match.
     * @param {number} redCount — number of Hard(red) cards in play (0 = first fight, all green).
     * @returns {{ tangles: object[], snagged: object[] }}
     *   tangles: 4 basic + 4 themed (8 total). snagged: 4.
     * Difficulty selection is intentionally simple for P2; the full ladder is P5.
     */
    buildHankAutomaCards: function(redCount) {
        var self = this;
        redCount = Math.max(0, redCount || 0);
        var byId = {};
        this.tangledYarn.forEach(function(d){ byId[d.id] = d; });
        this.snaggedProjects.forEach(function(d){ byId[d.id] = d; });

        // Cards eligible to be flipped Hard, greenest-first.
        var hardSet = {};
        this.HANK_FLIP_ORDER.slice(0, redCount).forEach(function(id){ hardSet[id] = true; });

        var tangles = [];
        // 4 basics (always yellow / single-sided)
        this.tangledYarn.filter(function(d){ return d.tier === 'basic'; })
            .forEach(function(d){ tangles.push(self.makeTangledCard(d)); });
        // 4 base themed
        this.HANK_BASE_THEMED.forEach(function(id){
            tangles.push(self.makeTangledCard(byId[id], hardSet[id] ? 'hard' : 'light'));
        });

        var snagged = this.snaggedProjects.map(function(d){
            return self.makeSnaggedCard(d, hardSet[d.id] ? 'hard' : 'easy');
        });

        return { tangles: tangles, snagged: snagged };
    },
};
