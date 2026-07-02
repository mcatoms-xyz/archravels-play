/* =====================================================================
   story.js — ArchRavels Story Mode (Session 35)
   A full-screen overlay layer above the normal game. Owns: sign-in,
   archetype/character select, the climb ladder, pre/post-match dialog,
   ending, and stats. Launches REAL matches via Game.init and reads the
   result back through the Game.render.gameOver delegate.

   Globals used: CARDS, Game, UI, AI (vanilla, no modules — matches the
   project's architecture). Story data (type flavor, dialog, ladder order,
   achievements) lives here; character names/types/favorite SRs come from
   CARDS so they never drift from the game.
   ===================================================================== */
var Story = {

  /* ---------- Supabase auth + cloud save ---------- */
  SB_URL: 'https://ingppffghqsajdrgahcm.supabase.co',
  SB_KEY: 'sb_publishable__41r1k47DJnKmtbmVNqYKQ_yOL98eTd',
  sb: null,
  currentUser: null,

  /* ---------- story-only data ---------- */
  TYPE_META: {
    thriftyShopper: { name:'Thrifty Shopper', color:'#6E8B68', dark:'#3d5238', tag:'Stock up fast',          desc:'You get extra shopping actions, so you build a deep supply of yarn faster than anyone.' },
    masterCrafter:  { name:'Master Crafter',  color:'#3769BE', dark:'#1f3d70', tag:'Make the most',          desc:'You can craft up to four items in a single turn. No one produces more.' },
    colorSpecialist:{ name:'Color Specialist',color:'#C96B43', dark:'#7d3c22', tag:'Any color works',        desc:'You ignore color requirements. Any yarn color can complete any pattern.' },
    yarnSpinner:    { name:'Yarn Spinner',    color:'#C0504A', dark:'#732b27', tag:'Make your own yarn',     desc:'You spin your own yarn instead of shopping for it. Slower, but you never depend on the bazaar.' },
    maker:          { name:'The Maker',       color:'#D9A521', dark:'#7d5e10', tag:'Two items per craft',    desc:'Each craft action makes two items instead of one. Volume is your edge.' },
    expert:         { name:'The Expert',      color:'#7E5BC0', dark:'#46326f', tag:'Fewer, stronger moves',  desc:'You get fewer actions, but they hit harder: take five yarn of any color and craft ignoring color rules.' },
  },
  // intro = pre-match taunt; win = their line when YOU win; lose = their line when you lose
  /* Session 43 (Adam): win/lose line POOLS per character (3–5 each) so results stay
     fresh — `win` = the rival conceding when YOU win; `lose` = the rival's victory lap.
     The original lines live on as pool members; `intro` is unchanged (picker + face-off).
     Hank gets history-aware intro pools below (see hankIntroLine). */
  DIALOG: {
    rebecca:{intro:'I may have bought a little extra. Don’t judge my basket.',
      wins:['You beat me with way less stash. Teach me your restraint, oh wise one.',
            'I bought HALF the bazaar and still lost?! Okay. Okay. I have questions.',
            'Ugh, fine, you win. But have you SEEN my haul? I win at shopping.',
            'My basket was fuller. Your scorecard was fuller-er. Rude, honestly.'],
      losses:['Eee, I won?! That’s the yarn talking, I had SO much to work with. Go again?',
            'Turns out buying everything IS a strategy! Who knew! (Me. I knew.)',
            'Don’t be sad — here, I have extra yarn. I always have extra yarn.',
            'That felt like a shopping spree with a trophy at the end. Rematch?'] },
    theo:{intro:'I already know which stall has the best value today.',
      wins:['Huh. You out-valued me. I’m annoyed and a little impressed. Mostly annoyed.',
            'I ran the numbers twice. You still won. The numbers and I need a moment.',
            'Statistically, that shouldn’t have happened. Well played. Recalculating.',
            'You got more per stitch than me. That stings in a very specific way.'],
      losses:['Good game. I just bought smarter. It’s not personal, it’s arithmetic.',
            'Value per yarn: maximized. Feelings: irrelevant. Nice match though.',
            'I told you which stall was best. You didn’t listen. The math did.',
            'Cheapest win I ever bought. And I do mean cheapest — did you see those prices?'] },
    derrick:{intro:'I make four before most folks make one.',
      wins:['Now THAT was a finish. Clean, fast, smart. I’m stealing whatever you just did.',
            'You out-produced ME? Check the scoreboard again— no, that’s real. Respect.',
            'Fast hands. Faster brain. I like your workshop energy, friend.',
            'I blinked and you had a finished pile. That’s usually MY trick.'],
      losses:['Output, my friend. That’s the whole secret. Come back, I’ll show you the rhythm.',
            'Four to your one. Told you. The hands remember what the heart believes.',
            'Volume! VOLUME! Ha! Good game — now watch this stack of mittens.',
            'You crafted well. I just crafted MORE. There’s always more.'] },
    amara:{intro:'I was just gonna make stuff and see what happens.',
      wins:['Okay, you actually pushed me. Respect. That basically never happens.',
            'Huh. You won. Cool cool cool. I’m gonna go lie down about it.',
            'That was… effort? From me? Wild. You earned that one.',
            'Nice. I’d be mad if I believed in being mad about craft games.'],
      losses:['See? Didn’t even try that hard. That’s kind of my thing.',
            'Vibes-based crafting strikes again. Don’t overthink it, that’s my secret.',
            'I just made stuff and it… worked out? It usually does. GG.',
            'Winning’s more fun when you’re relaxed. You should try it sometime.'] },
    neeha:{intro:'Color has no rules, child. Only conversations.',
      wins:['You didn’t fight the colors, you let them lead. That is the whole art.',
            'Today the palette chose you. I bow to its judgment — and yours.',
            'Beautiful. Truly. Your work sang louder than mine, and I listened.',
            'A student surpasses the conversation. The colors are pleased.'],
      losses:['The colors simply listened to me today. Next time, perhaps, they’ll whisper to you.',
            'You forced the hues, child. They resist force. Sit with them a while.',
            'Orange forgives, but purple remembers. Study that, and return.',
            'The bazaar spoke, and I answered. Do not fret — it speaks to everyone eventually.'] },
    alex:{intro:'Color requirements? Never met ’em.',
      wins:['Ohhh you broke the rules better than me. I’m equal parts proud and furious.',
            'Wait, YOU’RE the chaos agent now? I feel weirdly proud. And dethroned.',
            'That was illegal in at least three craft circles and I LOVED it.',
            'Fine! You win! The system remains broken and I remain delighted.'],
      losses:['Rules are fake and I’m gonna prove it again. GG though, genuinely.',
            'See?! No color rules, no problem. Anarchy: 1, Everyone else: 0.',
            'I substituted every color and NOBODY stopped me. What a world.',
            'The requirements were more like… suggestions. Great game, sucker.'] },
    ted:{intro:'I’ll spin what I need while you’re still picking through the bins.',
      wins:['You found your rhythm faster than I found mine. That’s the trick.',
            'Well spun, friend. You made the quiet kind of win. Those are the best kind.',
            'I spun plenty. You just used yours better. Fair’s fair.',
            'That’s a homestead-quality victory right there. Tip of the hat.'],
      losses:['Slow and steady, friend. Made every bit of that myself. Felt good.',
            'Never bought a skein I didn’t need. Never will. Good match.',
            'The wheel turns, the yarn comes. Patience beats panic every time.',
            'You shop. I spin. Today, spinning won. Most days, honestly.'] },
    eliza:{intro:'I plan three turns ahead, and I don’t improvise.',
      wins:['You disrupted my plan. I did not account for you. Recalculating. Rematch.',
            'My projections had me winning by six. Reality disagreed. Noted for next time.',
            'Impressive. Unplanned, chaotic, effective. I hate it. Well done.',
            'You have introduced variance into my model. I will now study you.'],
      losses:['Executed exactly as planned. I do love when that happens.',
            'Turn nine, exactly as forecast. You were never behind — you were on schedule to lose.',
            'The plan accounted for your best move. You made it. Thank you for cooperating.',
            'Flawless execution. I permitted myself one (1) celebratory nod.'] },
    jo:{intro:'I make ’em two at a time, so my cat always gets one.',
      wins:['You beat me AND the cat? That’s a big deal in this house. Well done, truly.',
            'The cat is sulking. I’m sulking. We’ll get over it. Great game.',
            'Two at a time wasn’t enough today?! Extraordinary. The cat demands a rematch.',
            'You win! The cat still gets a mitten though. House rules.'],
      losses:['Double the output, double the fun! Here, the cat made you a mouse.',
            'Me and the cat make a good team. Mostly me. Don’t tell the cat.',
            'Pairs, friend! Everything in pairs! One to score, one to snuggle.',
            'The cat supervised this entire victory. All credit to management.'] },
    noah:{intro:'Two items a craft, two pigs, one crate of yarn. Let’s go.',
      wins:['You did more with less?? That’s basically witchcraft. The pigs respect you now.',
            'The pigs have discussed it and they’re switching to YOUR team. Traitors.',
            'BIG win! Huge! I love it! I mean I hate it! But I LOVE it!',
            'You out-stuffed the stuff-master. The barn will hear about this.'],
      losses:['MORE STUFF WINS, baby! The pigs are very proud. Run it back?',
            'Two at a time, every time! The pigs called it in the first round.',
            'Quantity has a quality all its own, friend! HA! More yarn!',
            'The crate is empty, the board is FULL, and the pigs are dancing.'] },
    irene:{intro:'I’ve been crafting since before you were a stitch.',
      wins:['You beat an old woman at her own game. I’m so proud I could just pinch you.',
            'Well! Sixty years of crafting and you still surprised me. Have a cookie.',
            'Oh, lovely work, dear. I let you win, of course. (I did not.)',
            'My my. The student out-stitched the century. Don’t let it go to your head.'],
      losses:['Don’t feel bad, dear. Experience just has a way of winning. More tea?',
            'That trick? Learned it in ’62. You’ll get there, sweetheart.',
            'Age and treachery, dear. Mostly treachery. Biscuit?',
            'I’ve dropped more stitches than you’ve knitted. That’s not an insult, it’s a résumé.'] },
    mauro:{intro:'Three moves, all of ’em count. I don’t waste motion.',
      wins:['Tight game. You didn’t waste a move either. I see you. Good one.',
            'Clean. Efficient. Nothing extra. You played MY game and won it. Respect.',
            'I counted your wasted moves. Zero. That’s the whole compliment.',
            'Somebody finally out-economized me. Noted, studied, respected.'],
      losses:['Less is more, you know? Played the right notes, that’s all.',
            'Three moves. All of them counted. That’s the tune.',
            'You did a lot. I did enough. Enough wins.',
            'Minimalism, friend: I didn’t beat you by much because I didn’t need to.'] },
    hank:{intro:'So. You climbed the whole circle to reach my nook. Spin your own yarn yet, little stitch? I do. Every turn. Let’s see what you’ve got.',
      // Session 43: history-aware intro pools — hankIntroLine() picks the pool from
      // your record (agg.hank) + the chosen red count. First meeting = the classic above.
      intros:{
        afterLosses:[
          'Back again, little stitch? Ho ho. The kettle hasn’t even cooled from last time.',
          'The circle whispers you’ve been practicing. The circle also whispers you keep losing. Gnomes hear everything.',
          'Persistence! I respect it. I’ll still bury you in yarn, but I respect it.',
          'You again! Wonderful. My leftover pile was getting lonely.'],
        rematch:[
          'Ah, the champion returns. Beat me once, did you? The yarn remembers. So do I.',
          'Back for more, crown-chaser? I’ve been spinning all week. Literally. It’s all I do.',
          'You’ve tangled with me before and lived to knit about it. Bold of you to return.',
          'The nook’s been quiet since you left. Come — let’s make it loud.'],
        deepReds:[
          'THIS many red cards? Ho HO. You’re either very brave or very tired of winning.',
          'The hard cards, then. No more gentle gnome. I hope your bowl is deep, little stitch.',
          'Red suits me, don’t you think? Matches my hat. And your impending scorecard.',
          'Few climbers ask for this. Fewer walk away with the win. Kettle’s on — for one of us.'],
        crown:[
          'Thirteen reds. THE WOOLEN CROWN. No one has taken it from me. Not once. Not ever. Show me the crafter who dares.',
          'So it comes to this — every hard card in the box, and you, and me. Win, and the crown is yours forever. Lose… and the circle will sing of how close you came.'],
      },
      wins:['…Well now. You out-crafted the Stitchmeister himself. The circle is yours. I’ll put the kettle on — you’ve earned a proper sit.',
            'Beaten! By needle and thread and sheer nerve. Take your bow, champion — the nook salutes you.',
            'Ho… ho. The gnome concedes. Your stitches were truer than mine today, and I don’t say that twice.',
            'The yarn chose you today, little stitch. No — not little. Not anymore.',
            'You’ve unraveled me fair and square. Sit, sit — victory tea is the sweetest brew.'],
      losses:['Ho ho — the gnome keeps his crown a while longer. Don’t fret, the yarn never runs out. Climb back up and try me again.',
            'A fine tangle you gave me! But the nook is mine, and the kettle whistles for one.',
            'Close! Closer than most. The crown wobbled — it did not fall.',
            'Every loss is a lesson in disguise, little stitch. This one wore a very good disguise.',
            'The Stitchmeister stands. Come back when your yarn is angrier.'],
      crownWin:[
        'THE CROWN… is yours. Thirteen reds, and you stitched through every one. I am not weeping — gnomes don’t weep. We fell. WE FELL, LITTLE STITCH. Wear it well, Champion of Champions.'],
    },
  },
  // Two waves through the types (easy->hard); each type's pair sits 6 apart so you
  // never face the same type back-to-back regardless of which crafter you pick.
  LADDER_ORDER: ['rebecca','ted','alex','jo','derrick','mauro','theo','eliza','neeha','noah','amara','irene'],

  /* ---------- runtime state ---------- */
  picked: null,
  beaten: 0,
  ladder: [],          // [oppId,... , 'hank']
  profile: null,       // loaded via SaveAPI
  active: false,       // true while a Story match is being played
  matchStart: 0,
  lastMatch: null,
  root: null,

  /* ============================ data helpers ============================ */
  char: function(id){ return CARDS.characters[id]; },
  typeOf: function(id){ return this.char(id).type; },
  meta: function(id){ return this.TYPE_META[this.typeOf(id)]; },
  color: function(id){ return this.meta(id).color; },
  faveSR: function(id){
    var list = CARDS.specialRequests || [];
    for (var i=0;i<list.length;i++){ if (list[i].favoriteOf===id) return list[i]; }
    return null;
  },
  portrait: function(id){ return 'story-assets/portraits/'+id+'.jpg'; },
  icon: function(id){ return 'story-assets/icons/'+this.typeOf(id)+'.png'; },

  /* ============================ init ============================ */
  init: function(){
    // overlay root
    this.root = document.createElement('div');
    this.root.id = 'story-root';
    this.root.style.display = 'none';
    this.root.innerHTML =
      '<div class="story-topbar">' +
        '<button class="story-menu" id="storyMenuBtn" onclick="UI.onNavMenuToggle()" aria-label="Menu">☰</button>' +
        '<button class="story-back" id="storyBackBtn" onclick="Story.navBack()" aria-label="Back">‹</button>' +
        '<div class="story-brand"><img class="story-logo" src="Other Images Textures Details/AR Logo Final Aug2019.png" alt="ArchRavels"></div>' +
        '<button class="player-chip" title="Account" onclick="Story.openIdentity()">' +
          '<div class="pc-avatar" id="pcAvatar">🧶</div>' +
          '<div class="pc-meta"><span class="pc-name" id="pcName">Sign In</span><span class="pc-note" id="pcNote" style="display:none"></span></div>' +
        '</button>' +
      '</div>' +
      '<div id="story-screen"></div>';
    document.body.appendChild(this.root);

    // supabase
    // Session 36: use the implicit OAuth flow (token returned in the URL hash) instead of
    // the default PKCE flow. PKCE stashes a code_verifier in localStorage and needs it back
    // after the Google round-trip — iOS Safari's storage partitioning/ITP often loses it
    // between redirect-out and redirect-back, which silently fails the exchange and leaves
    // the user stuck on a sign-in loop (Amy's report). Implicit flow needs no stored verifier.
    try {
      if (window.supabase) this.sb = window.supabase.createClient(this.SB_URL, this.SB_KEY, {
        auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      });
    } catch(e){ this.sb = null; }

    // hook match-over
    Game.render.gameOver = function(){ Story.onMatchOver(); };

    this.initAuth();
    this.initRouter();   // Session 43: URL routing for browsable Story destinations

    // Session 36: DEV shortcut — jump straight to the Hank boss fight for testing.
    // Add ?boss to the URL (optionally ?boss=mauro to pick your crafter), or call
    // Story.testHank() from the console. Skips the whole climb.
    try {
      // Session 43 DEV: ?gate forces the free tier on web; ?unlock grants entitlement.
      if (/[?&#]gate\b/i.test(location.href)) this._forceGate = true;
      if (/[?&#]unlock\b/i.test(location.href)) this._devUnlock = true;
      var m = /[?&#]boss(?:=([a-z]+))?/i.exec(location.href);
      if (m) {
        var who = m[1] && CARDS.characters[m[1]] ? m[1] : 'rebecca';
        // Session 43 DEV: ?boss&picker=N fakes an unlocked ceiling of N (in-memory
        // only, never saved) so the difficulty scale can be tested pre-first-win.
        var pm = /[?&#]picker(?:=(\d+))?/i.exec(location.href);
        if (pm) Story._pickerPreview = Math.max(1, Math.min(13, parseInt(pm[1] || '1', 10)));
        setTimeout(function(){ Story.testHank(who); }, 350);
      }
    } catch(e){}
  },

  open: function(){ this.root.style.display='block'; document.body.classList.add('story-open'); window.scrollTo(0,0); },
  hide: function(){ this.root.style.display='none'; document.body.classList.remove('story-open'); if(this._syncingRoute!==true) this._setHash(''); },

  /* ==================== Session 43: HASH ROUTER ====================
     Gives every browsable Story destination a real URL (#/story, #/profile, …) so
     it's linkable, refreshes in place, and the browser back button works. Deep/
     transient states (mid-climb, pre-match, in-match) are intentionally NOT routed —
     they depend on live game state. `_syncingRoute` guards against hash↔screen loops. */
  ROUTES: {
    'story':        function(){ Story.open(); Story.goTypes(); },
    'profile':      function(){ Story.open(); Story.goStats(); },
    'stats':        function(){ Story.open(); Story.goStats(); },
    'achievements': function(){ Story.open(); Story.goAchievements(); },
    'sr-board':     function(){ Story.open(); Story.goSRBoard(); },
    'account':      function(){ Story.open(); Story.goSignIn(); },
  },
  _setHash: function(route){
    var target = route ? ('#/'+route) : (location.pathname+location.search);
    var prev = this._syncingRoute; this._syncingRoute = true;
    try{ if(route){ if(location.hash!=='#/'+route) location.hash='/'+route; }
         else if(location.hash){ history.pushState('', document.title, target); } }
    catch(e){ location.hash = route ? ('/'+route) : ''; }
    this._syncingRoute = prev;   // restore (may be nested inside _applyRoute)
  },
  /** Navigate to a named route (updates the URL + renders). */
  go: function(route){ this._setHash(route); var fn=this.ROUTES[route]; if(fn) fn(); },
  /** Called on load + hashchange — render whatever the URL says. */
  _applyRoute: function(){
    var m = /^#\/([a-z-]+)/i.exec(location.hash||'');
    var route = m && this.ROUTES[m[1]] ? m[1] : null;
    this._syncingRoute = true;
    try{
      if(route){ this.ROUTES[route](); }
      else if(document.body.classList.contains('story-open')){ this.hide(); }
    } finally { this._syncingRoute = false; }
  },
  initRouter: function(){
    var self=this;
    window.addEventListener('hashchange', function(){ if(!self._syncingRoute) self._applyRoute(); });
    // Apply an initial deep-link (e.g. someone opens /#/profile directly), but never
    // fight the ?boss / ?picker dev flags which handle their own entry.
    if(location.hash && /^#\//.test(location.hash) && !/[?&#]boss/i.test(location.href)){
      setTimeout(function(){ self._applyRoute(); }, 380);
    }
  },
  screen: function(html){ var r=document.getElementById('story-root'); if(r) r.classList.remove('cc-mode'); document.getElementById('story-screen').innerHTML = html; window.scrollTo(0,0); },

  /* ============================ entry ============================ */
  start: async function(){
    await this.ensureProfile();
    this._setHash('story');
    this.open();
    this.goTypes();
  },
  account: function(){ this.open(); this.goSignIn(); },   // sign-in from the landing/front door
  // Session 36: DEV — drop straight into the Hank boss face-off (skips the climb).
  // Usage: Story.testHank() or Story.testHank('mauro'), or the ?boss URL flag.
  testHank: function(crafterId){
    crafterId = (crafterId && CARDS.characters[crafterId] && crafterId!=='hank') ? crafterId : 'rebecca';
    this.picked = crafterId;
    this.ladder = this.buildLadder(crafterId);
    this.beaten = this.ladder.length - 1;   // currentOpp() → final rung (hank, or the twin when gated)
    var landing=document.getElementById('landingScreen'); if(landing) landing.style.display='none';
    this.open();
    this.goPreMatch();
  },
  // Make sure the saved profile (cloud if signed in, else local) is loaded before
  // showing any profile-dependent screen (stats / ladder resume).
  ensureProfile: async function(){
    if(!this.profile) this.profile = await SaveAPISafe(this);
    var p=this.profile; this.srEnsure(p);
    var changed=this.srBackfill(p);                 // retro-unlock past Story wins (once)
    var np=this.srSyncPacks(p); if(np && np.length) changed=true;
    if(changed) this.save();
    return p;
  },
  // Force a fresh load (used on sign-in/out so we pull the right identity's data),
  // then refresh whatever profile-dependent screen is currently open.
  loadProfile: async function(){
    this.profile = await SaveAPISafe(this);
    this.renderChip();
    if(this.root && this.root.style.display!=='none'){
      var scr=document.getElementById('story-screen');
      if(scr && /Story Mode · Stats/.test(scr.innerHTML)) this.goStats();
      else if(document.getElementById('opptrack')) this.renderLadder();
    }
  },

  /* ============================ auth ============================ */
  initAuth: async function(){
    if (!this.sb){ await this.ensureProfile(); this.renderChip(); return; }
    try { var r = await this.sb.auth.getSession(); this.currentUser = r.data.session ? r.data.session.user : null; } catch(e){ this.currentUser=null; }
    // Session 43 (SIGNIN_PLAN): deep-link fallback listener — inert until the custom
    // URL scheme is registered in the iOS project; harmless everywhere else.
    try{
      var CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if(this.isNativeApp() && CapApp && CapApp.addListener){
        CapApp.addListener('appUrlOpen', function(ev){ Story._handleAuthDeepLink(ev && ev.url); });
      }
    }catch(e){}
    this.sb.auth.onAuthStateChange(function(_e,s){
      var was=(Story.currentUser&&Story.currentUser.id)||null;
      Story.currentUser = s ? s.user : null;
      var now=(Story.currentUser&&Story.currentUser.id)||null;
      if(was!==now){ Story.profile=null; Story.loadProfile(); }   // identity changed → reload the right profile
      else Story.renderChip();
    });
    await this.loadProfile();
  },
  // Session 43 (Adam's QoL pick): a chosen handle wins over everything — and it works
  // for GUESTS too (stored on the on-device profile; cloud-syncs once they sign in).
  displayName: function(){
    var p=this.profile;
    if(p && p.handle) return p.handle;
    if(!this.currentUser) return 'Guest Crafter';
    return (this.currentUser.user_metadata&&this.currentUser.user_metadata.name)||this.currentUser.email||'Crafter';
  },
  /** Sanitize + save a player handle (3–18 chars, letters/numbers/space/_/-/'). */
  setHandle: function(raw){
    var h=String(raw||'').replace(/[^\w \-'’]/g,'').replace(/\s+/g,' ').trim().slice(0,18);
    if(h.length<3) return null;
    var p=this.profile=this.profile||{};
    p.handle=h; this.save();
    return h;
  },
  goEditName: function(){
    var cur=(this.profile&&this.profile.handle)||'';
    this.screen('<div class="crumb">Account · Your Name</div><h1 class="st-h1">What shall the bazaar call you?</h1>'+
      '<p class="st-sub">Shown on your profile, match screens, and victories. Works as a guest, no account needed.</p>'+
      '<div class="signin-box">'+
        '<input type="text" id="handleInput" maxlength="18" placeholder="e.g. StitchSorceress" value="'+cur.replace(/"/g,'&quot;')+'" autocomplete="nickname">'+
        '<button class="btn btn-gold" onclick="Story.saveHandle()">Save name</button>'+
        '<div class="si-msg" id="handleMsg"></div>'+
      '</div>'+this.backBar('Story.goStats()','← Back to stats'));
    var inp=document.getElementById('handleInput'); if(inp) setTimeout(function(){ inp.focus(); },80);
  },
  saveHandle: function(){
    var inp=document.getElementById('handleInput'), msg=document.getElementById('handleMsg');
    var h=this.setHandle(inp?inp.value:'');
    if(!h){ if(msg) msg.textContent='Give it at least 3 letters (letters, numbers, spaces).'; return; }
    this.renderChip();
    this.goStats();
  },
  renderChip: function(){
    var av=document.getElementById('pcAvatar'); if(av) av.innerHTML=this.avatarInner();
    var nm=document.getElementById('pcName'), note=document.getElementById('pcNote');
    if(nm){
      if(this.currentUser){ nm.textContent=this.displayName(); if(note){ note.textContent='View stats'; note.style.display=''; } }
      else { nm.textContent='Sign In'; if(note){ note.textContent=''; note.style.display='none'; } }
    }
    this.renderLandingAuth();
  },
  // Reflect signed-in state on the landing front door (overlay closed).
  renderLandingAuth: function(){
    var el=document.getElementById('landingAuth');
    if(!el) return;
    if(this.currentUser){
      el.innerHTML =
        '<div class="landing-signedin"><span class="lsi-dot"></span>Signed in as <b>'+this.displayName()+'</b></div>'+
        '<div class="landing-auth-links">'+
          '<a class="landing-link" href="#" onclick="Story.account();return false;">View your stats →</a>'+
          '<a class="landing-link landing-signout" href="#" onclick="Story.signOut();return false;">Sign out</a>'+
        '</div>';
    } else {
      el.innerHTML = '<a class="landing-link" href="#" onclick="Story.account();return false;">Sign in / view your stats →</a>';
    }
  },
  openIdentity: function(){ if(this.currentUser) this.goStats(); else this.goSignIn(); },
  goSignIn: function(){
    var html;
    if(this.currentUser){
      html = '<div class="crumb">Account</div><h1 class="st-h1">Account</h1>'+
        '<div class="signin-box"><div class="si-user"><div class="em">Signed in as<br>'+this.displayName()+'</div>'+
        '<button class="btn btn-gold" onclick="Story.goStats()">View your stats</button>'+
        '<button class="btn btn-ghost" onclick="Story.signOut()">Sign out</button></div></div>'+
        this.backBar('Story.goTypes()');
    } else if(!this.sb){
      html = '<div class="crumb">Account</div><h1 class="st-h1">Sign in</h1>'+
        '<div class="signin-box"><p class="si-msg" style="color:var(--st-walnut)">Sign-in connects on the live site. For now, play as a guest.</p>'+
        '<button class="btn btn-gold" onclick="Story.goTypes()">Play as guest</button></div>'+this.backBar('Story.goTypes()');
    } else if(this.isNativeApp()){
      // Session 43 (SIGNIN_PLAN): native app sign-in — Apple first (required, guideline
      // 4.8), Google second, both via native sheets + signInWithIdToken (no browser
      // bounce). Email magic-link is web-only until the deep link lands (lower priority).
      html = '<div class="crumb">Account</div><h1 class="st-h1">Sign in</h1>'+
        '<p class="st-sub">Save your progress, scores, and achievements across devices.</p>'+
        '<div class="signin-box">'+
          '<button class="btn btn-apple" onclick="Story.signInApple()"> Sign in with Apple</button>'+
          '<button class="btn btn-gold" onclick="Story.signInGoogle()">Continue with Google</button>'+
          '<div class="si-msg" id="siMsg"></div>'+
          '<div class="si-or">or</div>'+
          '<button class="btn btn-ghost" onclick="Story.goTypes()">Play as guest</button>'+
        '</div>';
    } else {
      html = '<div class="crumb">Account</div><h1 class="st-h1">Sign in</h1>'+
        '<p class="st-sub">Save your progress, scores, and achievements across devices.</p>'+
        '<div class="signin-box">'+
          '<button class="btn btn-gold" onclick="Story.signInGoogle()">Continue with Google</button>'+
          '<div class="si-or">or</div>'+
          '<input type="email" id="siEmail" placeholder="you@example.com" autocomplete="email">'+
          '<button class="btn btn-gold" onclick="Story.sendMagicLink()">Email me a sign-in link</button>'+
          '<div class="si-msg" id="siMsg"></div>'+
          '<div class="si-or">or</div>'+
          '<button class="btn btn-ghost" onclick="Story.goTypes()">Play as guest</button>'+
        '</div>';
    }
    this.screen(html);
  },
  /* Session 43 (SIGNIN_PLAN scaffolding): native-app auth. All of this is a NO-OP
     until the Capacitor plugins + Supabase provider config land (Adam's day-of-
     approval checklist) — the buttons degrade to a friendly "not enabled yet". */
  isNativeApp: function(){
    try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
    catch(e){ return false; }
  },
  _genNonce: function(){
    var b = new Uint8Array(32);
    (window.crypto || window.msCrypto).getRandomValues(b);
    return Array.prototype.map.call(b, function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
  },
  _sha256Hex: async function(str){
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
  },
  signInApple: async function(){
    var msg = document.getElementById('siMsg');
    if(!this.sb){ if(msg) msg.textContent='Not connected yet.'; return; }
    try{
      var SIA = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SignInWithApple;
      if(!SIA){ if(msg) msg.textContent='Apple sign-in arrives with the next app update!'; return; }
      // Nonce: SHA-256 hash goes to Apple, the RAW nonce goes to Supabase.
      var raw = this._genNonce();
      var hashed = await this._sha256Hex(raw);
      var res = await SIA.authorize({
        clientId: 'com.xyzgamelabs.archravels',
        redirectURI: 'https://archravels.xyzgamelabs.com',
        scopes: 'email name', state: 'ar', nonce: hashed
      });
      var token = res && res.response && res.response.identityToken;
      if(!token){ if(msg) msg.textContent='Apple sign-in was cancelled.'; return; }
      var r = await this.sb.auth.signInWithIdToken({ provider:'apple', token: token, nonce: raw });
      if(r.error){ if(msg) msg.textContent='Error: '+r.error.message; }
      // success → onAuthStateChange picks up the session + reloads the profile
    }catch(e){ if(msg) msg.textContent='Apple sign-in unavailable ('+(e && e.message || e)+')'; }
  },
  /* Deep-link fallback (drafted, inert until the custom scheme is registered):
     if a web-OAuth redirect ever returns via com.xyzgamelabs.archravels://auth,
     catch it and hand the tokens to Supabase. */
  _handleAuthDeepLink: async function(url){
    try{
      if(!url || !this.sb) return;
      var hash = url.split('#')[1] || '';
      var p = {}; hash.split('&').forEach(function(kv){ var x=kv.split('='); if(x[0]) p[x[0]]=decodeURIComponent(x[1]||''); });
      if(p.access_token && p.refresh_token){
        await this.sb.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
      }
    }catch(e){}
  },
  sendMagicLink: async function(){
    var email=(document.getElementById('siEmail').value||'').trim(), msg=document.getElementById('siMsg');
    if(!email){ if(msg) msg.textContent='Enter your email first.'; return; }
    if(!this.sb){ if(msg) msg.textContent='Not connected yet.'; return; }
    if(msg) msg.textContent='Sending…';
    try{ var r=await this.sb.auth.signInWithOtp({email:email, options:{emailRedirectTo:window.location.href}});
      if(msg) msg.textContent=r.error?('Error: '+r.error.message):'Check your email for a sign-in link!';
    }catch(e){ if(msg) msg.textContent='Something went wrong.'; }
  },
  signInGoogle: async function(){
    if(!this.sb) return;
    var msg = document.getElementById('siMsg');
    // Session 43 (SIGNIN_PLAN): native app → native Google sheet + signInWithIdToken
    // (web OAuth can't redirect back into capacitor://localhost). Web keeps OAuth.
    if(this.isNativeApp()){
      try{
        var GA = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GoogleAuth) || window.GoogleAuth;
        if(!GA){ if(msg) msg.textContent='Google sign-in arrives with the next app update!'; return; }
        var u = await GA.signIn();
        var token = u && ((u.authentication && u.authentication.idToken) || u.idToken);
        if(!token){ if(msg) msg.textContent='Google sign-in was cancelled.'; return; }
        var r = await this.sb.auth.signInWithIdToken({ provider:'google', token: token });
        if(r.error && msg) msg.textContent='Error: '+r.error.message;
      }catch(e){ if(msg) msg.textContent='Google sign-in unavailable ('+(e && e.message || e)+')'; }
      return;
    }
    try{ await this.sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.href } }); }catch(e){}
  },
  signOut: async function(){
    if(this.sb){ try{ await this.sb.auth.signOut(); }catch(e){} }
    this.currentUser=null; this.profile=null; this.renderChip();
    // only swap the overlay screen if the overlay is actually open (e.g. signed out from stats);
    // signing out from the landing front door just updates the landing in place.
    if(this.root && this.root.style.display!=='none') this.goSignIn();
  },

  /* ============================ screens ============================ */
  backBar: function(onclick, label){ this._back = onclick; return '<div class="backbar"><button class="btn btn-ghost" onclick="'+onclick+'">'+(label||'← Back')+'</button></div>'; },
  navBack: function(){ if(this._back){ try{ (new Function(this._back))(); }catch(e){ this.hide(); } } else { this.hide(); } },
  avatarStyle: function(){ var av=(this.profile&&this.profile.avatar)||null; if(av&&av.t==='char') return {img:this.portrait(av.id)}; if(av&&av.t==='yarn') return {img:'story-assets/yarn/'+av.c+'.jpg', yarn:true}; return {emoji:'🧶'}; },
  avatarInner: function(){ var a=this.avatarStyle(); if(a.img) return '<img class="av-img" src="'+a.img+'" alt="">'; return a.emoji; },
  AV_YARNS: [['Red','red'],['Orange','orange'],['Yellow','yellow'],['Green','green'],['Blue','blue'],['Purple','purple']],
  openAvatarPicker: function(){
    var cur=(this.profile&&this.profile.avatar)||{};
    var yarns=this.AV_YARNS.map(function(y){ var sel=(cur.t==='yarn'&&cur.c===y[1])?' sel':''; return '<div class="av-yarn-opt'+sel+'" title="'+y[0]+'" onclick="Story.pickAvatar(\'yarn\',\''+y[1]+'\')"><img src="story-assets/yarn/'+y[1]+'.jpg" alt=""></div>'; }).join('');
    var chars=Object.keys(CARDS.characters).map(function(id){ var sel=(cur.t==='char'&&cur.id===id)?' sel':''; return '<div class="av-char-opt'+sel+'" title="'+Story.char(id).name+'" onclick="Story.pickAvatar(\'char\',\''+id+'\')"><img src="'+Story.portrait(id)+'" alt=""></div>'; }).join('');
    var html='<div class="av-sheet"><h3>Choose your avatar</h3><div class="av-ph">Pick a yarn color or a crafter — more coming later.</div>'+
      '<div class="av-grp">Yarn ball</div><div class="av-yarns">'+yarns+'</div>'+
      '<div class="av-grp">Crafter</div><div class="av-chars">'+chars+'</div>'+
      '<button class="av-done" onclick="Story.closeAvatarPicker()">Done</button></div>';
    var ov=document.getElementById('avatarPicker');
    if(!ov){ ov=document.createElement('div'); ov.id='avatarPicker'; ov.className='av-pick'; document.body.appendChild(ov); ov.addEventListener('click',function(e){ if(e.target===ov) Story.closeAvatarPicker(); }); }
    ov.innerHTML=html; ov.style.display='flex';
  },
  closeAvatarPicker: function(){ var ov=document.getElementById('avatarPicker'); if(ov) ov.style.display='none'; },
  pickAvatar: function(t,v){ this.profile=this.profile||{}; this.profile.avatar=(t==='yarn')?{t:'yarn',c:v}:{t:'char',id:v}; if(this.save) this.save(); this.renderChip(); var ba=document.querySelector('#story-root .big-av'); if(ba) ba.innerHTML=this.avatarInner()+'<span class="big-av-edit">✎</span>'; this.openAvatarPicker(); },

  goTypes: function(){ this._back='Story.hide()';
    var self=this;
    var cards = Object.keys(this.TYPE_META).map(function(tid){
      var m=self.TYPE_META[tid];
      var pair = Object.keys(CARDS.characters).filter(function(c){ return CARDS.characters[c].type===tid; });
      var a=pair[0], b=pair[1];
      return '<div class="type" style="--tc:'+m.color+';--tcDark:'+m.dark+'" onclick="Story.goChars(\''+tid+'\')">'+
        '<div class="art">'+
          '<span class="cornerpill left">'+CARDS.characters[a].name+'</span>'+
          '<span class="cornerpill right">'+CARDS.characters[b].name+'</span>'+
          '<img class="port" src="'+self.portrait(a)+'"><img class="port" src="'+self.portrait(b)+'">'+
        '</div>'+
        '<div class="body"><h3 class="atitle">'+m.name+'</h3><div class="tagline">'+m.tag+'</div>'+
          '<p>'+m.desc+'</p>'+
          '<div class="cardfoot"><span class="pick">Choose this style →</span>'+
          '<img class="marker" src="story-assets/icons/'+tid+'.png" alt=""></div></div></div>';
    }).join('');
    this.screen('<div class="crumb">Story Mode</div>'+
      '<h1 class="st-h1">Quest for Craft Circle Champion</h1>'+
      '<div class="sm-intro">'+
        '<p class="st-sub sm-copy">Welcome to ArchRavels! A strategy board game set in the colorful &amp; crafty world of fiber arts! Choose from a variety of fiber art crafting specialists, each with their own style. Out-craft 11 fellow Ravelers for your chance to challenge Hank the Stitchmeister for the craft circle crown.</p>'+
        '<div class="sm-steps">'+
          '<span class="sm-step"><span class="sm-n">1</span>Pick a Raveler</span><span class="sm-arrow">→</span>'+
          '<span class="sm-step"><span class="sm-n">2</span>Out-craft the Circle</span><span class="sm-arrow">→</span>'+
          '<span class="sm-step"><span class="sm-n">3</span>Become a Champion</span>'+
        '</div>'+
      '</div>'+
      (this.currentUser?'':'<p class="sm-note">Sign in to save your progress: <a href="#" onclick="Story.goSignIn();return false;">Sign in</a></p>')+
      '<div class="sm-divider"></div>'+
      '<h2 class="sm-choose">Choose Your Raveler!</h2>'+
      '<p class="st-sub">Six crafter archetypes, each with their own special crafting abilities. Pick the style that speaks to you.</p>'+
      '<div class="types">'+cards+'</div>');
  },

  goChars: function(tid){
    var self=this, m=this.TYPE_META[tid];
    var pair = Object.keys(CARDS.characters).filter(function(c){ return CARDS.characters[c].type===tid; });
    var cards = pair.map(function(c){
      var ch=CARDS.characters[c], sr=self.faveSR(c), dlg=self.DIALOG[c]||{};
      var srBlock = sr ? '<div class="favbox"><img class="srcard" src="'+sr.img+'" alt="'+sr.name+'" '+
          'onmouseenter="Story.hoverSR(\''+c+'\',event)" onmousemove="Story.moveHover(event)" onmouseleave="Story.unhoverSR()" onclick="event.stopPropagation();Story.openSR(\''+c+'\')">'+
          '<div class="favtext"><div class="favlabel">Favorite Special Request</div><div class="favname">'+sr.name+'</div><div class="favhint">Hover or tap to preview</div></div></div>' : '';
      // Session 43: entitlement gate — non-OG crafters lock on the free tier.
      var locked = self.crafterLocked(c);
      return '<div class="char'+(locked?' char-locked':'')+'" style="--tc:'+m.color+'" onclick="'+(locked?'Story.goUpgrade(\'crafter\')':'Story.goLadder(\''+c+'\')')+'">'+
        (locked?'<div class="char-lock">🔒 Full Game</div>':'')+
        '<div class="port"><span class="cornerpill left">'+ch.name+'</span><img src="'+self.portrait(c)+'"></div>'+
        '<div class="info"><div class="ctype">'+m.name+'</div>'+
          (dlg.intro?'<div class="quote">“'+dlg.intro+'”</div>':'')+
          srBlock+
          '<div class="choose" style="margin-top:14px;text-align:center">Play as '+ch.name+'</div></div></div>';
    }).join('');
    this.screen('<div class="crumb">Story Mode · Step 2 of 2</div><h1 class="st-h1">'+m.name+'</h1>'+
      '<p class="st-sub">'+m.desc+'</p>'+
      '<p class="same-note">Same playstyle, different personality. Pick the one that feels like you.</p>'+
      '<div class="compare">'+cards+'</div>'+this.backBar('Story.goTypes()','← Back to Ravelers'));
  },

  /* ---- ladder ---- */
  currentOpp: function(){ return this.ladder[Math.min(this.beaten, this.ladder.length-1)]; },
  isBoss: function(c){ return c==='hank'; },
  goLadder: async function(charId){
    await this.ensureProfile();   // make sure saved progress is loaded before resuming
    this.picked=charId;
    this.ladder = this.buildLadder(charId);      // Session 43: full climb, or the free 4-match arc
    this.beaten = Math.min(this._storedBeaten(charId), this.ladder.length);   // resume (clamped for the free arc)
    this._climbView = Math.min(this.beaten, this.ladder.length - 1);
    this.renderLadder();
  },
  // How many rivals this crafter has already beaten, from the saved profile.
  // Prefers the numeric cr.beaten; falls back to parsing the older cr.furthest string.
  _storedBeaten: function(charId){
    var cr=this.profile&&this.profile.crafters&&this.profile.crafters[charId];
    if(!cr) return 0;
    var n=0;
    if(typeof cr.beaten==='number') n=cr.beaten;
    else if(cr.furthest){ if(/champion/i.test(cr.furthest)) n=11; else { var m=cr.furthest.match(/(\d+)/); if(m) n=parseInt(m[1],10); } }
    return Math.max(0, Math.min(n, this.ladder.length));
  },
  miniHTML: function(c, done){
    if(this.isBoss(c)) return '<div class="mini boss oppnode '+(done?'done':'')+'"><img src="'+this.portrait('hank')+'"><div class="mtxt"><b>HANK</b><span>Final Boss</span></div>'+(done?'<span style="font-size:1.2rem">✓</span>':'')+'</div>';
    var ch=this.char(c);
    return '<div class="mini oppnode '+(done?'done':'')+'" style="--tc:'+this.color(c)+'"><img src="'+this.portrait(c)+'"><div class="mtxt"><b>'+ch.name+'</b><span>'+this.meta(c).name+'</span></div>'+(done?'<span style="font-size:1.2rem">✓</span>':'')+'</div>';
  },
  srMini: function(c){
    var sr=this.faveSR(c); if(!sr) return '';
    return '<div class="pc-srmini"><img class="srthumb" src="'+sr.img+'" alt="'+sr.name+'" onmouseenter="Story.hoverSR(\''+c+'\',event)" onmousemove="Story.moveHover(event)" onmouseleave="Story.unhoverSR()" onclick="event.stopPropagation();Story.openSR(\''+c+'\')">'+
      '<div><div class="l">Favorite Special Request</div><div class="n">'+sr.name+'</div></div></div>';
  },
  youCardHTML: function(){
    var c=this.picked, ch=this.char(c), total=this.ladder.length, list=this.ladder.slice(0,this.beaten);
    var avatars = list.length ? list.map(function(o){ return '<img src="'+Story.portrait(o)+'" alt="">'; }).join('') : '<span class="j-empty">No wins yet. Go climb!</span>';
    return '<div class="pcard" style="--tc:'+this.color(c)+'"><div class="pc-port"><img src="'+this.portrait(c)+'"><div class="pc-grad"></div><div class="pc-name">'+ch.name+'</div></div>'+
      '<div class="pc-body"><div class="pc-row"><span class="pc-role">'+this.meta(c).name+'</span><img class="pc-marker" src="'+this.icon(c)+'" alt=""></div>'+
      '<div class="pc-ability">'+this.meta(c).desc+'</div>'+this.srMini(c)+
      '<div class="journey"><div class="j-head">Your Climb</div><div class="j-stat"><b>'+this.beaten+'</b> of '+total+' rivals beaten</div><div class="j-avatars">'+avatars+'</div></div></div></div>';
  },
  oppCardHTML: function(c){
    if(this.isBoss(c)){
      var bdlg=this.DIALOG.hank||{};
      return '<div class="pcard boss has-cta" style="--tc:#7E5BC0"><div class="pc-port"><img src="'+this.portrait('hank')+'"><div class="pc-grad"></div><div class="pc-name">HANK</div></div>'+
        '<div class="pc-body"><div class="pc-row"><span class="pc-role" style="color:#7E5BC0">The Stitchmeister · Final Boss</span></div>'+
        '<div class="pc-ability">The legendary gnome at the summit of the craft circle. He spins his own yarn, hoards every scrap, and every Special Request is his favorite. Beat him to claim the circle.</div>'+
        (bdlg.intro?'<div class="pc-quote">“'+bdlg.intro+'”</div>':'')+
        '<button class="challenge overlay" onclick="Story.goPreMatch()">Face Hank</button></div></div>';
    }
    var ch=this.char(c), dlg=this.DIALOG[c]||{};
    return '<div class="pcard has-cta" style="--tc:'+this.color(c)+'"><div class="pc-port"><img src="'+this.portrait(c)+'"><div class="pc-grad"></div><div class="pc-name">'+ch.name+'</div></div>'+
      '<div class="pc-body"><div class="pc-row"><span class="pc-role">'+this.meta(c).name+'</span><img class="pc-marker" src="'+this.icon(c)+'" alt=""></div>'+
      '<div class="pc-ability">'+this.meta(c).desc+'</div>'+this.srMini(c)+
      (dlg.intro?'<div class="pc-quote">“'+dlg.intro+'”</div>':'')+
      '<button class="challenge overlay" onclick="Story.goPreMatch()">Challenge '+ch.name+'</button></div></div>';
  },
  renderLadder: function(){
    var total=this.ladder.length, champ=this.beaten>=total;
    var pickedName=this.char(this.picked).name, pct=Math.round(this.beaten/total*100);
    var top='<div class="cc-top"><div class="cc-you">'+this.avatarInner()+'</div>'+
      '<div class="cc-prog"><div class="cc-as">Playing as '+pickedName+'</div>'+
      '<div class="cc-sub">'+(champ?'You are the Champion!':(this.beaten+' of '+total+' Ravelers beaten'))+'</div>'+
      '<div class="cc-bar"><i style="width:'+pct+'%"></i></div></div></div>';
    var body;
    if(champ && !this.entitled()){
      // Session 43 (entitlement): free-arc complete — twin beaten. The climb pauses here.
      body='<div class="cc-champ"><div class="cc-crown">🧶</div>'+
        '<div class="cc-champ-t">You’ve mastered your corner of the bazaar!</div>'+
        '<div class="cc-champ-s">Your twin is beaten — but eleven Ravelers and the Stitchmeister himself await in the full Craft Circle.</div>'+
        '<button class="cc-go" onclick="Story.goUpgrade(\'twin\')">Unlock the Full Craft Circle →</button>'+
        '<button class="cc-go beat" onclick="Story.goStats()" style="margin-top:8px">View your stats →</button></div>';
    } else if(champ){
      body='<div class="cc-champ"><div class="cc-crown">🏆</div>'+
        '<div class="cc-champ-t">Champion of your Craft Circle!</div>'+
        '<div class="cc-champ-s">You out-crafted every Raveler and bested Hank the Stitchmeister.</div>'+
        '<button class="cc-go" onclick="Story.goStats()">View your stats →</button></div>';
    } else {
      var view=(typeof this._climbView==='number')?Math.max(0,Math.min(this._climbView,total-1)):this.beaten;
      var c=this.ladder[view], ch=this.char(c), boss=(c==='hank'), dlg=this.DIALOG[c]||{};
      var isNext=(view===this.beaten), isBeaten=(view<this.beaten);
      var role=boss?'Final Boss':this.meta(c).name;
      var taunt=dlg.intro?'<div class="cc-taunt">“'+dlg.intro+'”</div>':'';
      var fav=boss?'<div class="cc-fav cc-fav-boss"><div class="cc-fav-ic">👑</div><div><div class="ft">Every Special Request</div><div class="fn">is his favorite</div></div></div>':this.srMini(c);
      var btn;
      if(isNext) btn='<button class="cc-go" onclick="Story.goPreMatch()">'+(boss?'Face Hank →':'Challenge '+ch.name+' →')+'</button>';
      else if(isBeaten) btn='<button class="cc-go beat" disabled>✓ Already defeated</button>';
      else btn='<button class="cc-go lock" disabled>🔒 Beat '+this.char(this.currentOpp()).name+' first</button>';
      var label=isNext?'⚔ Next Challenger':(isBeaten?'✓ Already Defeated':'🔒 Locked — Preview');
      var hero='<div class="cc-herowrap" id="ccHero"><div class="cc-edge top2"></div><div class="cc-edge top"></div>'+
        '<div class="cc-hero'+(boss?' boss':'')+(isNext?'':' dim')+'"><div class="cc-art"><img src="'+this.portrait(c)+'" alt=""><span class="cc-pos">'+(view+1)+' / '+total+'</span><span class="cc-role">'+role+'</span><span class="cc-name">'+ch.name+'</span></div>'+
        '<div class="cc-info">'+fav+taunt+btn+'</div></div>'+
        '<div class="cc-edge bot"></div><div class="cc-edge bot2"></div></div>';
      var self=this;
      var minis=this.ladder.map(function(o,idx){ if(idx===view) return ''; var b=(o==='hank'); var st=(idx<self.beaten)?'beaten':(idx===self.beaten?'next':'locked'); var stLabel=(b?'Boss':(st==='beaten'?'✓ Beaten':(st==='next'?'Up next':'Locked'))); return '<div class="cc-mini '+st+(b?' boss':'')+'" onclick="Story.climbView('+idx+')"><div class="cc-ma"><img src="'+Story.portrait(o)+'" alt=""><span>'+Story.char(o).name+'</span></div><div class="cc-ml"><span class="cc-mn">'+Story.char(o).name+'</span><span class="cc-mst">'+stLabel+'</span></div></div>'; }).join('');
      // Session 43 (entitlement): on the free arc, Hank looms at the end of the rail —
      // visible, locked, magnificent. Tapping him opens the upgrade pitch.
      if(!this.entitled()){
        minis+='<div class="cc-mini boss hank-teaser" onclick="Story.goUpgrade(\'hank\')">'+
          '<div class="cc-ma"><img src="'+Story.portrait('hank')+'" alt=""><span>Hank</span></div>'+
          '<div class="cc-ml">🔒 Full Game</div></div>';
      }
      // Session 43 (desktop climb fix): on wide/mouse viewports the rail is a browsable
      // two-column list beside the hero, not a swipe carousel. Copy tweaks per mode.
      var wide=this._wideView();
      var scoutHint=wide?'Click any Raveler to preview':'Swipe or tap to browse';
      var scout='<div class="cc-scout"><div class="cc-scout-h"><span>The Craft Circle</span><span class="cc-togo">'+scoutHint+'</span></div><div class="cc-scout-row">'+minis+'</div></div>';
      body='<div class="cc-nextlabel">'+label+'</div>'+(wide?('<div class="cc-desk">'+hero+scout+'</div>'):(hero+scout));
    }
    this.screen('<div class="crumb">Your Craft Circle</div>'+top+body+
      this.backBar('Story.goTypes()','↺ Change Raveler'));
    // Fixed-height carousel lock is MOBILE-only; desktop scrolls the page naturally.
    var _sr=document.getElementById('story-root'); if(_sr) _sr.classList.toggle('cc-mode', !this._wideView());
    var hw=document.getElementById('ccHero');
    if(hw && !this._wideView()){ var sy=null;
      hw.addEventListener('touchstart',function(e){ sy=e.touches[0].clientY; },{passive:true});
      hw.addEventListener('touchend',function(e){ if(sy===null)return; var dy=e.changedTouches[0].clientY-sy; sy=null; if(dy<-35) Story.climbStep(1); else if(dy>35) Story.climbStep(-1); });
    }
  },
  /** Wide (desktop/mouse) vs. narrow (phone/touch) climb layout. */
  _wideView: function(){
    try{ return window.matchMedia('(min-width: 860px) and (pointer: fine)').matches; }catch(e){ return window.innerWidth>=860; }
  },
  climbStep: function(d){ var total=this.ladder.length; var v=(typeof this._climbView==='number')?this._climbView:this.beaten; this._climbView=Math.max(0,Math.min(v+d,total-1)); this.renderLadder(); },
  climbView: function(i){ this._climbView=i; this.renderLadder(); },
  youNodeHTML: function(){
    var c=this.picked, ch=this.char(c), total=this.ladder.length;
    return '<div class="pcard you-node" style="--tc:#d9a521"><div class="pc-port"><img src="'+this.portrait(c)+'"><div class="pc-grad"></div><div class="you-badge">YOU</div><div class="pc-name">'+ch.name+'</div></div>'+
      '<div class="pc-body"><div class="pc-row"><span class="pc-role">'+this.meta(c).name+'</span><img class="pc-marker" src="'+this.icon(c)+'" alt=""></div>'+
      '<div class="pc-ability" style="font-weight:bold;color:var(--st-gold-d)">'+this.beaten+' of '+total+' beaten</div></div></div>';
  },

  /* ---- pre / post match ---- */
  fighterHTML: function(c,label){
    if(this.isBoss(c)) return '<div class="fcard boss" style="--tc:#7E5BC0"><div class="fport"><img src="'+this.portrait('hank')+'"></div><div class="fbody"><div class="flabel">'+label+'</div><div class="fname">Hank</div><div class="frole">Final Boss</div></div></div>';
    var ch=this.char(c);
    return '<div class="fcard" style="--tc:'+this.color(c)+'"><div class="fport"><img src="'+this.portrait(c)+'"></div><div class="fbody"><div class="flabel">'+label+'</div><div class="fname">'+ch.name+'</div><div class="frole">'+this.meta(c).name+'</div></div></div>';
  },
  dialogHTML: function(c,line){
    var who = this.isBoss(c)?'Hank':this.char(c).name, col=this.isBoss(c)?'#7E5BC0':this.color(c);
    var port = '<img class="dlg-port'+(this.isBoss(c)?' boss':'')+'" src="'+this.portrait(c)+'">';
    return '<div class="dlg" style="--tc:'+col+'">'+port+'<div class="bubble"><b>'+who+'</b><p>“'+line+'”</p></div></div>';
  },
  /* ==================== Session 43: FREE/PAID ENTITLEMENT ====================
     The decided line (IOS_v1_FREE-PAID-SPLIT.md): the WEB BETA stays fully
     unlocked (it's the marketing surface); the gate is APP-only. Free app tier =
     Quick Play + the 4 OG crafters + a 4-match story arc per OG (3 fellow OGs,
     then your TYPE TWIN as the finale) → upgrade prompt. $4.99 unlocks the full
     Craft Circle. DEV hooks: `?gate` forces the gate on web (testing), `?unlock`
     grants entitlement in-memory. */
  OG_CRAFTERS: ['rebecca','derrick','neeha','ted'],
  _forceGate: false,   // ?gate — test the free tier on web
  _devUnlock: false,   // ?unlock — test entitlement without a purchase
  entitled: function(){
    if(this._devUnlock) return true;
    // A real unlock ALWAYS counts (even under the ?gate test flag — so the full
    // purchase→unlock flow is testable end-to-end).
    try{ if(localStorage.getItem('ar_full_unlock')==='1') return true; }catch(e){}
    if(this.profile && this.profile.fullUnlock) return true;   // cloud-synced (IAP sets both)
    if(this._forceGate) return false;                          // ?gate — simulate the free tier
    return !this.isNativeApp();                                // web beta = fully unlocked
  },
  /** Called by the (future) IAP success/restore handlers. */
  grantFullUnlock: function(){
    try{ localStorage.setItem('ar_full_unlock','1'); }catch(e){}
    var p=this.profile=this.profile||{};
    p.fullUnlock=true; this.save();
  },
  crafterLocked: function(cid){ return !this.entitled() && this.OG_CRAFTERS.indexOf(cid)===-1; },
  /** The other crafter of your playstyle — the free arc's final boss. */
  typeTwin: function(cid){
    var t=CARDS.characters[cid] && CARDS.characters[cid].type;
    var pair=Object.keys(CARDS.characters).filter(function(c){
      return c!==cid && c!=='hank' && CARDS.characters[c].type===t;
    });
    return pair[0]||null;
  },
  /** Free story ladder: the 3 fellow OGs, then your type twin. */
  _freeLadder: function(cid){
    var twin=this.typeTwin(cid);
    return this.OG_CRAFTERS.filter(function(c){ return c!==cid; }).concat(twin?[twin]:[]);
  },
  buildLadder: function(cid){
    return this.entitled()
      ? this.LADDER_ORDER.filter(function(c){ return c!==cid; }).concat(['hank'])
      : this._freeLadder(cid);
  },
  /** Twin face-off intro lines (free finale) — a personal-rivalry beat. */
  TWIN_INTROS: {
    theo:  'Two thrifty shoppers, one bazaar. The math only works if I win.',
    amara: 'Oh, we make the SAME stuff? Cute. Mine\'s better. Let\'s find out.',
    alex:  'Same palette, same tricks. Whoever breaks the rules better takes the circle.',
    eliza: 'I\'ve modeled your spinning rhythm exactly. It\'s mine, but slower.',
  },
  /** Is this opponent the final rung of the FREE arc (the type twin)? */
  _isFreeFinale: function(c){
    return !this.entitled() && !this.isBoss(c) &&
           this.ladder.length>0 && this.ladder[this.ladder.length-1]===c &&
           this.beaten>=this.ladder.length-1;
  },

  /* Session 43: the upgrade screen — celebration + what-you-get + (stubbed) purchase.
     Reached from: beating your twin (source='twin'), tapping a locked crafter
     ('crafter'), or the locked-Hank teaser on the free climb ('hank'). */
  goUpgrade: function(source){
    var head = source==='twin'
      ? '<div class="crumb">The Full Craft Circle</div><h1 class="st-h1">You’ve mastered your corner of the bazaar!</h1><p class="st-sub">Your twin is beaten. But eleven Ravelers are still out there… and above them all, in his nook at the summit, the gnome is waiting.</p>'
      : '<div class="crumb">The Full Craft Circle</div><h1 class="st-h1">Unlock the Full Craft Circle</h1><p class="st-sub">The whole bazaar, one small skein of coin.</p>';
    var perks = [
      ['🧗','The full Story Mode climb','Eleven rivals stand between you and the summit'],
      ['👑','Hank the Stitchmeister','The final boss — and the 13-red-card challenge ladder to the Woolen Crown'],
      ['🧶','All 12 crafters','Every playstyle, including the Makers and the Experts'],
      ['🏅','The full Achievement + Special Request Boards','Collect, curate, complete'],
      ['📦','All future content packs included','Magic Socks, Rivals!, Award Season'],
    ].map(function(p){ return '<div class="up-perk"><span class="up-ico">'+p[0]+'</span><div><b>'+p[1]+'</b><span>'+p[2]+'</span></div></div>'; }).join('');
    this.screen(head+
      '<div class="up-hank"><img src="'+this.portrait('hank')+'" alt="Hank"><div class="up-hank-lock">🔒</div></div>'+
      '<div class="up-perks">'+perks+'</div>'+
      '<div class="match-actions">'+
        '<button class="btn btn-gold" onclick="Story.buyFullGame()">Unlock the Full Game · $4.99</button>'+
        '<button class="btn btn-ghost" onclick="Story.restorePurchases()">Restore Purchase</button>'+
      '</div>'+
      '<div class="si-msg" id="upMsg"></div>'+
      this.backBar('Story.goTypes()','← Keep playing free'));
  },
  /* IAP stubs — real StoreKit plumbing lands with the Apple account (plugin +
     App Store Connect product). Same graceful pattern as the sign-in scaffolding. */
  buyFullGame: async function(){
    var msg=document.getElementById('upMsg');
    var IAP = window.Capacitor && window.Capacitor.Plugins && (window.Capacitor.Plugins.Purchases || window.Capacitor.Plugins.InAppPurchases);
    if(!IAP){ if(msg) msg.textContent='Purchases arrive with the App Store release — everything here is free for now!'; return; }
    // TODO (IAP plumbing): offerings → purchase → verify → this.grantFullUnlock()
    if(msg) msg.textContent='Purchase flow not configured yet.';
  },
  restorePurchases: async function(){
    var msg=document.getElementById('upMsg');
    var IAP = window.Capacitor && window.Capacitor.Plugins && (window.Capacitor.Plugins.Purchases || window.Capacitor.Plugins.InAppPurchases);
    if(!IAP){ if(msg) msg.textContent='Nothing to restore yet — purchases arrive with the App Store release!'; return; }
    // TODO (IAP plumbing): restore → verify → this.grantFullUnlock()
    if(msg) msg.textContent='Restore flow not configured yet.';
  },

  /* Session 43: random line pools. kind='win' (you won — rival concedes) or 'lose'.
     Falls back to the legacy single-string keys so nothing ever renders blank. */
  _pickLine: function(arr){ return arr[Math.floor(Math.random()*arr.length)]; },
  dlgLine: function(c, kind){
    var dlg=this.DIALOG[c]||{};
    // Hank crown win gets its once-in-a-lifetime line
    if(this.isBoss(c) && kind==='win' && this._lastBossReds===13 && dlg.crownWin) return this._pickLine(dlg.crownWin);
    var pool = kind==='win' ? dlg.wins : dlg.losses;
    if(pool && pool.length) return this._pickLine(pool);
    return kind==='win' ? (dlg.win||'Well played.') : (dlg.lose||'Got you this time.');
  },
  /* Session 43: Hank's intro reads your history (agg.hank) + the chosen red count. */
  hankIntroLine: function(){
    var dlg=this.DIALOG.hank, pools=dlg.intros||{};
    var h=this._hankAgg()||{faced:0,beaten:0,lost:0};
    var reds=this.bossRedsForMatch();
    if(reds===13 && pools.crown) return this._pickLine(pools.crown);
    if(!h.faced) return dlg.intro;                                    // first meeting — the classic
    if(h.beaten===0 && h.lost>0 && pools.afterLosses) return this._pickLine(pools.afterLosses);
    if(reds>=5 && pools.deepReds) return this._pickLine(pools.deepReds);
    if(pools.rematch) return this._pickLine(pools.rematch);
    return dlg.intro;
  },

  goPreMatch: function(){
    var c=this.currentOpp(), dlg=this.DIALOG[c]||{};
    // Session 43 (difficulty v2): the boss face-off carries the red-card scale once
    // you've beaten Hank anywhere. First-ever fight = all green, no picker.
    var scale = this.isBoss(c) ? this.hankScaleHTML() : '';
    var introLine = this.isBoss(c) ? this.hankIntroLine() : (dlg.intro||'Let’s craft.');
    // Session 43 (entitlement): the free arc's finale is your TYPE TWIN — special intro.
    if(this._isFreeFinale(c) && this.TWIN_INTROS[c]) introLine = this.TWIN_INTROS[c];
    this.screen('<div class="crumb">Match · Face-Off</div><h1 class="st-h1">Before the match</h1>'+
      '<div class="vs-stage"><div>'+this.fighterHTML(this.picked,'You')+'</div><div class="vs-badge">VS</div><div>'+this.fighterHTML(c,'Challenger')+'</div></div>'+
      '<div class="dialogbox">'+this.dialogHTML(c, introLine)+'</div>'+
      scale+
      '<div class="match-actions"><button class="btn btn-gold" onclick="Story.beginMatch()">Begin Match</button>'+
      '<button class="btn btn-ghost" onclick="Story.renderLadder()">Back</button></div>');
  },

  /* ---- Session 43: difficulty v2 (Hades-style opt-in escalation) ----
     Ceiling = highest red beaten + 1 (locked spec). Default = the ceiling (the nudge
     upward). Dial DOWN freely — down-wins don't raise the ceiling (recordMatch only
     raises highestRedBeaten on wins at a new high). First-ever fight: no picker. */
  _bossPick: null,        // this session's explicit pick (null → default = ceiling)
  _pickerPreview: null,   // dev hook (?picker=N) — fakes an unlocked ceiling, no profile writes
  _hankAgg: function(){ var a=this.profile&&this.profile.agg; return (a&&a.hank)||null; },
  hankCeiling: function(){
    if(this._pickerPreview!=null) return Math.min(13, this._pickerPreview);
    var h=this._hankAgg();
    if(!h || !h.beaten) return 0;   // never beaten Hank anywhere → first-fight rules
    var hi=(h.highestRedBeaten==null)?-1:h.highestRedBeaten;
    return Math.min(13, hi+1);
  },
  _hankBest: function(){
    if(this._pickerPreview!=null) return this._pickerPreview-1;
    var h=this._hankAgg();
    return (h && h.highestRedBeaten!=null) ? h.highestRedBeaten : -1;
  },
  bossRedsForMatch: function(){
    var ceil=this.hankCeiling();
    if(ceil<=0) return 0;
    var pick=(this._bossPick==null)?ceil:this._bossPick;
    return Math.max(0, Math.min(pick, ceil));
  },
  setBossPick: function(n){
    this._bossPick=Math.max(0, Math.min(n, this.hankCeiling()));
    this.goPreMatch();   // re-render the face-off with the new scale state
  },
  hankScaleHTML: function(){
    var ceil=this.hankCeiling();
    if(ceil<=0) return '';   // first fight — the system stays invisible until earned
    var hi=this._hankBest();
    var pick=this.bossRedsForMatch();
    var cards='';
    for(var i=1;i<=13;i++){
      var cls='hk-card'+(i<=pick?' red':'')+(i>ceil?' locked':'');
      // Tap card i → difficulty i; tap the topmost red again → step down to i-1.
      var attrs=(i<=ceil)?' onclick="Story.setBossPick('+((i===pick)?(i-1):i)+')" role="button" tabindex="0" aria-label="Set difficulty '+i+'"':'';
      cards+='<span class="'+cls+'"'+attrs+'></span>';
    }
    var label = pick===0
      ? 'All green — a friendly tangle'
      : pick+' red card'+(pick>1?'s':'')+(pick===13?' — the WOOLEN CROWN 👑':'');
    var best = hi>=0 ? '<span class="hk-best">🏆 Best: '+hi+' red'+(hi===1?'':'s')+'</span>' : '';
    return '<div class="hk-scale-wrap">'+
      '<div class="hk-scale-head"><b>Hank’s Challenge</b>'+best+'</div>'+
      '<div class="hk-scale">'+cards+'</div>'+
      '<div class="hk-scale-label">'+label+'</div>'+
      (ceil<13 ? '<div class="hk-scale-hint">Win at '+ceil+' red'+(ceil===1?'':'s')+' to unlock the next</div>'
               : '<div class="hk-scale-hint">The full gauntlet is open. Claim the crown.</div>')+
      '</div>';
  },
  beginMatch: function(){
    var oppId=this.currentOpp();
    this.matchStart=Date.now(); this.active=true; this.storyGame=true;   // mark this match as a Story match (for game-over routing)
    try{ if(window.Sound){ Sound.music.startTheme(oppId); Sound.play('game-start'); } }catch(e){}
    // Session 43: the chosen handle plays under your name in-match (guests included).
    var youName=(this.profile&&this.profile.handle)||(this.currentUser&&this.currentUser.user_metadata&&this.currentUser.user_metadata.name)||'You';
    this.hide();
    // hide the landing/front door too — otherwise closing the story overlay reveals
    // the homepage sitting on top of the freshly-started match (looked like "kicked back home").
    var landing=document.getElementById('landingScreen'); if(landing) landing.style.display='none';
    // Session 40: reset per-match live-achievement tracking + wire detection hooks (once)
    this._liveToasted = {}; this._matchEarned = [];
    this._wireLiveAchievementHooks();
    var isBossMatch = this.isBoss(oppId);
    var youP = { characterId:this.picked, isAI:false, name:youName };
    // Session 42 (P1 automa): the boss is a score-only automa, not an AI turn-taker.
    var oppP = { characterId:oppId, isAI:!isBossMatch, name:this.char(oppId).name };
    // Session 42: turn-order difficulty ramp — you go first on rungs 1–5 (welcoming);
    // the rival goes first from rung 6 on, which removes your ~+5–10pt first-move edge.
    // The boss automa never "goes first" (he takes no turns) → you always lead the solo fight.
    var rivalFirst = !isBossMatch && this.beaten >= 5;
    // Session 43 (difficulty v2): red count comes from the face-off picker — default
    // = highest-beaten+1 (the ceiling), adjustable down, first-ever fight forced R0.
    var hankReds = isBossMatch ? this.bossRedsForMatch() : 0;
    this._lastBossReds = isBossMatch ? hankReds : null;   // crown-win line check (dlgLine)
    Game.init({
        players: rivalFirst ? [oppP, youP] : [youP, oppP],
        srEnabledIds: this.srEnabledIds(),
        hankAutoma: isBossMatch,
        hankReds: hankReds,
    });
    UI.renderAll();
    var tb=document.getElementById('takeoverBar'); if(tb) tb.style.display='none';
    // beginMatch bypasses onSetupStart's "if player 0 is AI, kick off" logic — do it here
    // so a rival-first match actually starts.
    if (Game.state.player && Game.state.player.isAI) {
      setTimeout(function(){ try{ AI.takeTurn(function(){}); }catch(e){} }, 500);
    }
  },
  onMatchOver: function(){
    if(!this.active) return;
    this.active=false;
    var players=(Game.state&&Game.state.players)||[], you=null, opp=null;
    // Session 42 (P1 automa): the boss is identified by isHank/isAutoma (isAI is now false
    // for him). The opponent is anyone who isn't the human seat; the human is !isAI & !automa.
    players.forEach(function(p){ if(p.isHank||p.isAutoma||p.isAI){ opp=p; } else { you=p; } });
    var ys = you ? (Game.calculateFinalScore(you).total||0) : 0;
    var os = opp ? (Game.calculateFinalScore(opp).total||0) : 0;
    var c = this.currentOpp();
    var stats = this.captureMatchStats(you, opp, ys, os);
    this.lastMatch = { you:ys, opp:os, win: ys>=os, timeMs: Date.now()-this.matchStart, earned:[], stats:stats };
    // Session 43: record EVERY finished match (win AND loss) — history ring buffer +
    // running aggregates on the profile. Runs before creditWin so a win's save() also
    // persists the record; losses save explicitly below.
    this.recordMatch(c);
    try{ if(window.Sound) Sound.play(this.lastMatch.win?'story-win':'story-lose'); }catch(e){}
    if(this.lastMatch.win) this.creditWin(c);   // bank score/achievements once; does NOT advance beaten
    else this.save();                            // losses: persist the match record + playtime
    this.open();
    this.showResult(this.lastMatch.win);
  },

  /* ---- Session 43: per-match history + running aggregates ----
     Two tiers so the profile never balloons:
     (1) p.matches[]  — full per-match detail, RING BUFFER capped at MATCH_HISTORY_CAP
     (2) p.agg        — tiny incremental aggregates, kept forever (powers profile
         summaries, streaks, Hank record incl. highest red beaten, Hank flavor lines).
     Leaderboards (future) get their own server-side table — NOT this blob. */
  MATCH_HISTORY_CAP: 75,

  recordMatch: function(oppId){
    var p=this.profile=this.profile||{};
    var lm=this.lastMatch||{}; var st=lm.stats||{};
    var isBossMatch=!!(this.isBoss && this.isBoss(oppId));
    // Compact scorecards for both seats (game state is still at game-over here)
    var youBd=null, oppBd=null, you=null;
    try{
      (Game.state.players||[]).forEach(function(pl){
        var bd=Game.calculateFinalScore(pl);
        var compact={ items:bd.items, srs:bd.specialRequests, favBonus:bd.favoriteBonus,
                      projects:bd.projects, patterns:bd.learnedTiles,
                      srPenalty:bd.srPenalty, yarn:bd.yarnPenalty, total:bd.total };
        if(pl.isHank||pl.isAutoma||pl.isAI){ oppBd=compact; } else { youBd=compact; you=pl; }
      });
    }catch(e){}
    // What you actually made
    var made={items:{},srs:[],projects:[]};
    if(you){
      (you.items||[]).forEach(function(it){ made.items[it.id]=(made.items[it.id]||0)+1; });
      (you.craftedSpecialRequests||[]).forEach(function(sr){ made.srs.push(sr.name); });
      (you.projects||[]).forEach(function(pr){ made.projects.push(pr.name); });
    }
    var rec={
      when: new Date().toISOString(),
      durationSec: Math.round((lm.timeMs||0)/1000),
      mode: isBossMatch?'boss':'story',
      rung: this.beaten||0,
      characterId: this.picked,
      opponentId: oppId,
      result: lm.win?'win':'loss',
      yourScore: lm.you||0,
      theirScore: lm.opp||0,
      rounds: st.turns||0,
      scorecard: { you:youBd, opp:oppBd },
      made: made
    };
    if(isBossMatch) rec.hankReds=(Game.state && Game.state.hankReds)||0;
    p.matches=p.matches||[];
    p.matches.push(rec);
    if(p.matches.length>this.MATCH_HISTORY_CAP) p.matches=p.matches.slice(-this.MATCH_HISTORY_CAP);
    this._updateAggregates(p, rec);
    // Playtime: creditWin banks it for WINS only (pre-existing); count losses here
    // so total playtime reflects every finished match without double-counting.
    if(!lm.win) p.totalPlayTimeMs=(p.totalPlayTimeMs||0)+(lm.timeMs||0);
    return rec;
  },

  _updateAggregates: function(p, rec){
    var a=p.agg=p.agg||{ played:0, wins:0, losses:0, sumScore:0, byCrafter:{}, itemCounts:{},
                         streak:{cur:0,best:0}, fastestWinSec:null,
                         hank:{faced:0,beaten:0,lost:0,highestRedBeaten:null} };
    var win=rec.result==='win';
    a.played++; a.sumScore+=(rec.yourScore||0);
    if(win){
      a.wins++; a.streak.cur++;
      if(a.streak.cur>a.streak.best) a.streak.best=a.streak.cur;
      if(rec.durationSec && (a.fastestWinSec==null || rec.durationSec<a.fastestWinSec)) a.fastestWinSec=rec.durationSec;
    } else { a.losses++; a.streak.cur=0; }
    var bc=a.byCrafter[rec.characterId]=a.byCrafter[rec.characterId]||{played:0,wins:0};
    bc.played++; if(win) bc.wins++;
    var mi=(rec.made&&rec.made.items)||{};
    Object.keys(mi).forEach(function(id){ a.itemCounts[id]=(a.itemCounts[id]||0)+mi[id]; });
    if(rec.mode==='boss'){
      a.hank.faced++;
      if(win){
        a.hank.beaten++;
        var r=rec.hankReds||0;
        if(a.hank.highestRedBeaten==null || r>a.hank.highestRedBeaten) a.hank.highestRedBeaten=r;
      } else { a.hank.lost++; }
    }
    return a;
  },
  // Snapshot the per-match stats the achievement tests read. Pulled from the
  // game-over player state + calculateFinalScore breakdown (no new in-play hooks).
  captureMatchStats: function(you, opp, ys, os){
    var learned=0, projects=0, srsFulfilled=0, favoriteSR=false, endingYarn=0, turns=0, crafterType='';
    if(you){
      turns = you.turnCount||0;
      try{ endingYarn = Game.totalYarn(you); }catch(e){ endingYarn=0; }
      projects = (you.projects||[]).length;
      (you.patternTiles||[]).forEach(function(t){ if(t && t.learned) learned++; });
      var crafted = you.craftedSpecialRequests||[];
      srsFulfilled = crafted.length;
      favoriteSR = crafted.some(function(sr){ return sr && sr.isFavorite; });
      crafterType = you.characterType||'';
    }
    return {
      score: ys, oppScore: os, margin: ys-os,
      turns: turns, endingYarn: endingYarn, projects: projects,
      patternsLearned: learned, srsFulfilled: srsFulfilled, favoriteSR: favoriteSR,
      beatHank: !!(opp && opp.isHank), crafterType: crafterType
    };
  },
  showResult: function(win){
    var c=this.currentOpp(), dlg=this.DIALOG[c]||{}, lm=this.lastMatch||{you:0,opp:0,timeMs:0};
    var secs=Math.round((lm.timeMs||0)/1000), mt=Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');
    var banner = win ? 'Victory!' : 'Not this time';
    var details, actions;
    if(win){
      var earned = lm.earned||[];
      var ach = earned.length ? ('<div class="rd-head">Achievement'+(earned.length>1?'s':'')+' unlocked</div>'+earned.map(function(a){ return '<div class="ach-chip">🏅 '+a.name+' <span class="pts">+'+a.pts+'</span></div>'; }).join('')) : '<div class="rd-head">No new achievements this match</div>';
      details = '<div class="result-card"><div class="rd-score">Match score <b>'+lm.you+'</b> · they had '+lm.opp+'</div>'+
        '<div class="rd-total">+'+lm.you+' to your Story Mode score</div>'+
        '<div style="color:var(--st-walnut-soft);font-size:.85rem;margin-top:3px">⏱ Match time '+mt+'</div>'+ach+'</div>';
      actions = this.isBoss(c)
        ? '<button class="btn btn-gold" onclick="Story.goEnding()">See the ending →</button>'
        : (this._isFreeFinale(c)
          ? '<button class="btn btn-gold" onclick="Story.goUpgrade(\'twin\')">See what’s next →</button>'
          : '<button class="btn btn-gold" onclick="Story.nextChallenger()">Next Challenger →</button>');
    } else {
      details = '<div class="result-card"><div class="rd-score" style="font-style:italic;color:var(--st-walnut-soft)">No shame in a dropped stitch. Pick your needles back up and try again.</div>'+
        '<div style="color:var(--st-walnut-soft);font-size:.85rem;margin-top:6px">Your score '+lm.you+' · '+this.char(c).name+' '+lm.opp+'</div></div>';
      actions = '<button class="btn btn-gold" onclick="Story.goPreMatch()">Rematch</button><button class="btn btn-ghost" onclick="Story.renderLadder()">Back to the climb</button>';
    }
    this.screen('<div class="crumb">Match · Result</div><div class="result-banner '+(win?'win':'loss')+'">'+banner+'</div>'+
      '<div class="dialogbox">'+this.dialogHTML(c, this.dlgLine(c, win?'win':'lose'))+'</div>'+
      details+'<div class="match-actions">'+actions+'</div>');
  },
  nextChallenger: function(){
    if(this.beaten<this.ladder.length) this.beaten++;
    // Session 36: the boss is now playable — climbing to Hank routes into the boss face-off.
    if(this.isBoss(this.currentOpp())){ this.goPreMatch(); return; }
    this.renderLadder();
  },

  /* ---- ending ---- */
  goEnding: function(){
    var rivals=this.ladder.filter(function(c){ return c!=='hank'; });
    var avatars=rivals.map(function(c){ return '<img src="'+Story.portrait(c)+'" title="'+Story.char(c).name+'" alt="">'; }).join('')+'<img src="'+Story.portrait('hank')+'" title="Hank" alt="">';
    var p=this.profile||{};
    var html='<div class="crumb">Story Mode · Run Complete</div>'+
      '<div class="ending-hero"><div class="crown">🏆</div><h1 class="st-h1">Champion of your Craft Circle!</h1>'+
      '<div class="sub">'+this.char(this.picked).name+', the '+this.meta(this.picked).name+', bested all eleven rivals AND toppled Hank, the Stitchmeister, at the summit. The circle is yours.</div></div>'+
      '<div class="defeated-row">'+avatars+'</div>'+
      '<div class="recap">'+
        '<div class="recap-row"><span class="lbl">Rivals beaten</span><span class="val">'+rivals.length+' of '+rivals.length+'</span></div>'+
        '<div class="recap-row"><span class="lbl">Final boss</span><span class="val">Hank defeated 👑</span></div>'+
        '<div class="recap-row"><span class="lbl">Story Mode score</span><span class="val">'+(p.lifetimeStoryScore||0)+'</span></div>'+
        '<div class="recap-row"><span class="lbl">Achievement bank</span><span class="val">'+(p.bank||0)+' pts</span></div>'+
      '</div>'+
      '<div class="match-actions" style="margin-top:22px"><button class="btn btn-gold" onclick="Story.goTypes()">Play Again →</button>'+
      '<button class="btn btn-ghost" onclick="Story.goStats()">View Stats</button></div>';
    this.screen(html);
  },

  /* ---- stats ---- */
  // Session 43: the in-game Pts tag (real PointTag art, value counter-rotated level).
  ptagHTML: function(v, sm){ return '<span class="pf-ptag'+(sm?' sm':'')+'"><span class="pf-pv">'+v+'</span></span>'; },

  goStats: async function(){
    this._setHash('profile');
    await this.ensureProfile();
    var p=this.profile||{}, crafters=p.crafters||{}, a=p.agg||{}, self=this;
    var achCount=Object.keys(p.achievements||{}).length;
    var rec = a.played ? ((a.wins||0)+'–'+(a.losses||0)) : '—';

    // ---- hero header ----
    var hero='<div class="pf-hero">'+
      '<div class="pf-av" onclick="Story.openAvatarPicker()">'+this.avatarInner()+'<span class="pf-av-edit">✎</span></div>'+
      '<div class="pf-id"><div class="pf-name" onclick="Story.goEditName()" role="button" tabindex="0" title="Change your name">'+this.displayName()+' <span class="pf-pen">✎</span></div>'+
        '<div class="pf-sub">'+(this.currentUser?'Synced to your account':'Playing as a guest')+' · <span class="pf-editlink" onclick="Story.goEditName()">Change name</span></div></div>'+
      '<div class="pf-herocta">'+
        (this.currentUser
          ? '<button class="btn btn-ghost" onclick="Story.signOut()">Sign out</button>'
          : '<button class="btn btn-gold" onclick="Story.goSignIn()">Sign in</button>')+
      '</div></div>';

    // ---- headline stat band ----
    var band='<div class="pf-band">'+
      '<div class="pf-stat stitch"><div class="pf-tagwrap">'+this.ptagHTML(p.lifetimeStoryScore||0)+'</div><div class="pf-l">Story Score</div></div>'+
      '<div class="pf-stat stitch"><div class="pf-tagwrap">'+this.ptagHTML((p.perGameHigh&&p.perGameHigh.score)||0)+'</div><div class="pf-l">Best Game</div></div>'+
      '<div class="pf-stat stitch"><div class="pf-n">'+rec+'</div><div class="pf-l">'+(a.played?('Record · '+Math.round(100*(a.wins||0)/a.played)+'%'):'Record')+'</div></div>'+
      '<div class="pf-stat stitch"><div class="pf-n">'+achCount+'<span class="pf-of">/'+this.ACH.length+'</span></div><div class="pf-l">Achievements</div></div>'+
    '</div>';

    // ---- Hank record + Records grid (only once there's match history) ----
    var recBlock='';
    if(a.played){
      var winPct=Math.round(100*(a.wins||0)/a.played), avg=Math.round((a.sumScore||0)/a.played);
      var fw=a.fastestWinSec!=null ? (Math.floor(a.fastestWinSec/60)+':'+String(a.fastestWinSec%60).padStart(2,'0')) : '—';
      var topItem=null, topN=0, ic=a.itemCounts||{};
      Object.keys(ic).forEach(function(id){ if(ic[id]>topN){ topN=ic[id]; topItem=id; } });
      var topDef=topItem&&CARDS.getItem?CARDS.getItem(topItem):null;
      var recs='<div class="pf-recs">'+
        '<div class="pf-rec stitch"><span class="pf-ic">🔥</span><div><div class="pf-rn">'+(a.streak&&a.streak.cur||0)+' <small>best '+(a.streak&&a.streak.best||0)+'</small></div><div class="pf-rl">Win Streak</div></div></div>'+
        '<div class="pf-rec stitch"><span class="pf-ic">⚡</span><div><div class="pf-rn">'+fw+'</div><div class="pf-rl">Fastest Win</div></div></div>'+
        '<div class="pf-rec stitch"><span class="pf-ic">📈</span><div><div class="pf-rn">'+avg+'</div><div class="pf-rl">Avg Score</div></div></div>'+
        (topDef?('<div class="pf-rec stitch"><img class="pf-itk" src="'+topDef.img+'" alt=""><div><div class="pf-rn">×'+topN+'</div><div class="pf-rl">Most Crafted: '+topDef.name+'</div></div></div>'):
                ('<div class="pf-rec stitch"><span class="pf-ic">⏱</span><div><div class="pf-rn">'+this.fmtTime(p.totalPlayTimeMs||0)+'</div><div class="pf-rl">Total Time</div></div></div>'))+
      '</div>';
      var hankCard='';
      var h=a.hank;
      if(h && h.faced){
        var hi=(h.highestRedBeaten==null)?-1:h.highestRedBeaten, dots='';
        for(var i=1;i<=13;i++){ dots+='<span class="pf-hcard'+(i<=hi?' red':'')+'"></span>'; }
        hankCard='<div class="pf-hankcard stitch" style="--stc:rgba(126,91,192,.5)">'+
          '<div class="pf-hanktop"><img src="'+this.portrait('hank')+'" alt="Hank"><div><div class="pf-hankt">The Stitchmeister</div><div class="pf-hanks">Faced '+h.faced+' · Beaten '+h.beaten+' · Lost '+h.lost+'</div></div></div>'+
          '<div class="pf-hankscale">'+dots+'</div>'+
          '<div class="pf-hanknote">'+(hi>=0 ? (hi===13?'<b>👑 The Woolen Crown is yours</b>':'Best beaten: <b>'+hi+' red'+(hi===1?'':'s')+'</b> — '+(13-hi)+' to the crown'):'Beat him to begin the red-card climb')+'</div>'+
        '</div>';
      }
      recBlock = (hankCard
        ? '<div class="pf-two"><div><div class="pf-h">Hank the Stitchmeister</div>'+hankCard+'</div><div><div class="pf-h">Records</div>'+recs+'</div></div>'
        : '<div class="pf-h">Records</div>'+recs);
    }

    // ---- board shortcuts ----
    var links='<div class="pf-links">'+
      '<div class="pf-rec pf-link stitch" onclick="Story.goAchievements()"><span class="pf-ic">🏅</span><div><div class="pf-rn" style="font-size:1.05rem">Achievement Board</div><div class="pf-rl">'+achCount+' of '+this.ACH.length+' earned →</div></div></div>'+
      '<div class="pf-rec pf-link stitch" onclick="Story.goSRBoard()"><span class="pf-ic">🧶</span><div><div class="pf-rn" style="font-size:1.05rem">Special Request Board</div><div class="pf-rl">Collect &amp; curate cards →</div></div></div>'+
    '</div>';

    // ---- crafter roster ----
    var order=Object.keys(CARDS.characters).filter(function(c){ return c!=='hank'; }).sort(function(x,y){ return (crafters[y]?1:0)-(crafters[x]?1:0); });
    var roster=order.map(function(c){
      var s=crafters[c], locked=self.crafterLocked(c);
      var sub = locked ? self.meta(c).name : (s ? (s.furthest||'') : 'Not played yet');
      var score = s ? (s.best||0) : null;
      return '<div class="pf-craf stitch'+(locked?' locked':'')+'" onclick="'+(locked?'Story.goUpgrade(\'crafter\')':'Story.goLadder(\''+c+'\')')+'">'+
        '<div class="pf-cp"><img src="'+Story.portrait(c)+'" alt="">'+
          (locked?'<div class="pf-lockpill">🔒 Full Game</div>':(score!=null?self.ptagHTML(score,true):''))+'</div>'+
        '<div class="pf-cb"><div class="pf-cn">'+Story.char(c).name+'</div><div class="pf-cx">'+sub+'</div></div></div>';
    }).join('');

    this.screen('<div class="crumb">Your Profile</div>'+
      hero+band+recBlock+links+
      '<div class="pf-h">Your Crafters</div><div class="pf-roster">'+roster+'</div>'+
      this.backBar('Story.goTypes()','← Back to Story'));
  },
  fmtTime: function(ms){ var m=Math.round(ms/60000); if(m<60) return m+'m'; return Math.floor(m/60)+'h '+(m%60)+'m'; },

  /* Session 43: match-history records — surfaces profile.agg (streaks, W/L, fastest
     win, most-crafted, the Hank record + red-scale progress). Renders nothing until
     the first recorded match, so legacy profiles see no empty shell. */
  _recordsHTML: function(p){
    var a=p&&p.agg;
    if(!a || !a.played) return '';
    var winPct=Math.round(100*(a.wins||0)/a.played);
    var avg=Math.round((a.sumScore||0)/a.played);
    var fw=a.fastestWinSec!=null ? (Math.floor(a.fastestWinSec/60)+':'+String(a.fastestWinSec%60).padStart(2,'0')) : '—';
    // most-crafted item
    var topItem=null, topN=0, ic=a.itemCounts||{};
    Object.keys(ic).forEach(function(id){ if(ic[id]>topN){ topN=ic[id]; topItem=id; } });
    var topDef=topItem&&CARDS.getItem?CARDS.getItem(topItem):null;
    var tiles=[
      {ico:'⚔️', num:(a.wins||0)+'–'+(a.losses||0), lbl:'Record ('+winPct+'%)'},
      {ico:'🔥', num:(a.streak&&a.streak.cur||0)+' <span class="rec-sub">best '+(a.streak&&a.streak.best||0)+'</span>', lbl:'Win Streak'},
      {ico:'⚡', num:fw, lbl:'Fastest Win'},
      {ico:'📈', num:avg, lbl:'Avg Score'},
    ];
    if(topDef) tiles.push({ico:'<img class="rec-item-img" src="'+topDef.img+'" alt="">', num:'×'+topN, lbl:'Most Crafted: '+topDef.name});
    var tHtml=tiles.map(function(t){ return '<div class="stat-tile rec-tile"><div class="st-ico">'+t.ico+'</div><div class="st-num">'+t.num+'</div><div class="st-lbl">'+t.lbl+'</div></div>'; }).join('');
    // Hank record card + mini red scale
    var hk='';
    var h=a.hank;
    if(h && h.faced){
      var hi=(h.highestRedBeaten==null)?-1:h.highestRedBeaten;
      var dots='';
      for(var i=1;i<=13;i++){ dots+='<span class="hkm-dot'+(i<=hi?' red':'')+'"></span>'; }
      hk='<div class="hank-record" style="--tc:#7E5BC0">'+
        '<img class="hr-port" src="'+this.portrait('hank')+'" alt="Hank">'+
        '<div class="hr-body"><div class="hr-title">Hank the Stitchmeister</div>'+
        '<div class="hr-line">Faced <b>'+h.faced+'</b> · Beaten <b>'+h.beaten+'</b> · Lost <b>'+h.lost+'</b></div>'+
        '<div class="hr-scale">'+dots+'</div>'+
        '<div class="hr-sub">'+(hi>=0 ? (hi===13?'👑 THE WOOLEN CROWN IS YOURS':'Best: '+hi+' red'+(hi===1?'':'s')+' beaten — '+(13-hi)+' to the crown') : 'Beat him to start the red-card climb')+'</div>'+
        '</div></div>';
    }
    return '<div class="section-h">Records</div><div class="stat-tiles rec-tiles">'+tHtml+'</div>'+hk;
  },

  /* ---- achievement board ---- */
  goAchievements: async function(){
    this._setHash('achievements');
    await this.ensureProfile();
    var p=this.profile||{}, earnedMap=p.achievements||{}, ACH=this.ACH;
    var earnedCount=ACH.filter(function(a){ return earnedMap[a.id]; }).length;
    var totalPts=ACH.reduce(function(n,a){ return n+a.pts; },0);
    var bank=p.bank||0;
    var groups=['The Climb','Single Match','Crafty','Special Requests','Collection','Mastery','Capstone'];
    var sections=groups.map(function(g){
      var items=ACH.filter(function(a){ return a.group===g; });
      if(!items.length) return '';
      var cards=items.map(function(a){
        var on=!!earnedMap[a.id], t=a.tier||1;
        var starHTML='<span class="ach-stars t'+t+'">'+Array(t+1).join('★')+'</span>';
        return '<div class="ach-card'+(on?' earned':' locked')+'">'+
          '<div class="ach-ic">'+(on?'🏅':'🔒')+'</div>'+
          '<div class="ach-body"><div class="ach-name">'+a.name+'</div><div class="ach-desc">'+a.desc+'</div></div>'+
          '<div class="ach-side">'+starHTML+'<div class="ach-pts">'+a.pts+' pts</div></div>'+
        '</div>';
      }).join('');
      return '<div class="ach-section"><div class="section-h">'+g+'</div><div class="ach-grid">'+cards+'</div></div>';
    }).join('');
    this.screen('<div class="crumb">Story Mode · Achievements</div>'+
      '<div class="ach-hero"><div class="ach-hero-num">'+earnedCount+' <span>/ '+ACH.length+'</span></div>'+
      '<div class="ach-hero-lbl">earned · bank '+bank+' / '+totalPts+' pts</div></div>'+
      sections+
      this.backBar('Story.goStats()','← Back to stats'));
  },

  /* ---- achievements + persistence ---- */
  // Full catalog (27). Group A entries carry a `test` and are LIVE now (read from
  // the captureMatchStats snapshot + beaten count). Group B (needs in-play hooks)
  // and Group C (run-scoped) are listed for the board; their `test` lands in later
  // builds. tier: 1=★ 2=★★ 3=★★★ · group drives the board sections.
  ACH: [
    // ── The Climb (progression) ──
    {id:'firstStitch', name:'First Stitch',      desc:'Win your first match',                  pts:10, tier:1, group:'The Climb', test:function(p,s){ return (p._totalWins||0)>=1; }},
    {id:'hooked',      name:'Hooked',            desc:'Beat 3 rivals in a run',                pts:10, tier:1, group:'The Climb', test:function(p,s){ return s.beaten>=3; }},
    {id:'halfway',     name:'Halfway Skein',     desc:'Beat 6 rivals in a run',                pts:25, tier:2, group:'The Climb', test:function(p,s){ return s.beaten>=6; }},
    {id:'topCircle',   name:'Top of the Circle', desc:'Beat all 11 rivals in a run',           pts:25, tier:2, group:'The Climb', test:function(p,s){ return s.beaten>=11; }},
    {id:'bestOfNook',  name:'Best of the Nook',  desc:'Beat Hank, the Stitchmeister',          pts:50, tier:3, group:'The Climb', test:function(p,s){ return !!s.beatHank; }},
    {id:'champion',    name:'Circle Champion',   desc:'Complete a full run — all rivals + Hank',pts:50, tier:3, group:'The Climb', test:function(p,s){ return !!s.beatHank; }},
    // ── In a single match (skill) ──
    {id:'noFrogs',     name:'No Frogs Given',    desc:'Win a match without using Frog It',     pts:25, tier:2, group:'Single Match'},
    {id:'blazing',     name:'Blazing Needles',   desc:'Win a match in 8 turns or fewer',       pts:25, tier:2, group:'Single Match', test:function(p,s){ return s.turns>0 && s.turns<=8; }},
    {id:'showOff',     name:'Show Off',          desc:'Score 50+ in a match',                  pts:25, tier:2, group:'Single Match', live:true, test:function(p,s){ return s.score>=50; }},
    {id:'clutch',      name:'Clutch Cast',       desc:'Win after trailing into the final round',pts:50, tier:3, group:'Single Match'},
    {id:'runaway',     name:'Runaway Skein',     desc:'Win by 20+ points',                     pts:25, tier:2, group:'Single Match', test:function(p,s){ return s.margin>=20; }},
    // ── Crafty (mechanics + character flavor) ──
    {id:'assembly',    name:'Assembly Line',     desc:'Make four items in a single turn (Master Crafter)', pts:25, tier:2, group:'Crafty'},
    {id:'twoForOne',   name:'Two for One',       desc:'Craft two items in one action (Maker)', pts:10, tier:1, group:'Crafty'},
    {id:'colorOutside',name:'Color Outside the Lines', desc:'Finish a pattern with a color it didn’t ask for (Color Specialist)', pts:10, tier:1, group:'Crafty'},
    {id:'offGrid',     name:'Off the Grid',      desc:'Win as a Spinner without taking a Shop action', pts:50, tier:3, group:'Crafty'},
    {id:'yarnHoarder', name:'Yarn Hoarder',      desc:'Hold 30+ yarn at once',                 pts:10, tier:1, group:'Crafty', live:true, test:function(p,s){ return s.totalYarn>=30; }},
    {id:'wasteNot',    name:'Waste Not',         desc:'Win a match ending with 2 or fewer yarn',pts:25, tier:2, group:'Crafty', test:function(p,s){ return s.endingYarn<=2; }},
    {id:'patternBuff', name:'Pattern Buff',      desc:'Learn 3+ pattern tiles in one match',   pts:25, tier:2, group:'Crafty', live:true, test:function(p,s){ return s.patternsLearned>=3; }},
    {id:'projectRunway',name:'Project Runway',   desc:'Complete 4+ projects in one match',     pts:25, tier:2, group:'Crafty', live:true, test:function(p,s){ return s.projects>=4; }},
    // ── Special Requests ──
    {id:'teachersPet', name:'Teacher’s Pet',     desc:'Fulfill your crafter’s favorite Special Request', pts:10, tier:1, group:'Special Requests', live:true, test:function(p,s){ return !!s.favoriteSR; }},
    {id:'crowdPleaser',name:'Crowd Pleaser',     desc:'Fulfill 4+ Special Requests in one match', pts:25, tier:2, group:'Special Requests', live:true, test:function(p,s){ return s.srsFulfilled>=4; }},
    {id:'regifter',    name:'Re-gifter',         desc:'Hand a Special Request to an opponent', pts:10, tier:1, group:'Special Requests'},
    // ── Mastery (across runs) ──
    {id:'sixOfAKind',  name:'Six of a Kind',     desc:'Complete a run with one crafter of each type', pts:50, tier:3, group:'Mastery'},
    {id:'fullDozen',   name:'The Full Dozen',    desc:'Complete a run with all 12 crafters',   pts:50, tier:3, group:'Mastery'},
    {id:'matchingSet', name:'Matching Set',      desc:'Win a run with both crafters of a single type', pts:25, tier:2, group:'Mastery'},
    {id:'flawless',    name:'Flawless',          desc:'Complete a run without losing a match', pts:50, tier:3, group:'Mastery'},
    // ── Collection (unlock SR packs — low value, awarded when a pack unlocks) ──
    {id:'packFantasy',  name:'Once Upon a Skein', desc:'Unlock the Fantasy Pack',    pts:5, tier:1, group:'Collection', packUnlock:true},
    {id:'packSweater',  name:'Sweater Weather',   desc:'Unlock the Sweater Pack',    pts:5, tier:1, group:'Collection', packUnlock:true},
    {id:'packScifi',    name:'Out of This Whorl', desc:'Unlock the Sci-Fi Pack',     pts:5, tier:1, group:'Collection', packUnlock:true},
    {id:'packWizard',   name:'Wand & Wool',       desc:'Unlock the Wizard Pack',     pts:5, tier:1, group:'Collection', packUnlock:true},
    {id:'packDiceTower',name:'Natural 20',        desc:'Unlock the Dice Tower Pack', pts:5, tier:1, group:'Collection', packUnlock:true},
    // ── Capstone ──
    {id:'completionist',name:'Cozy Completionist',desc:'Earn every other achievement',         pts:50, tier:3, group:'Capstone'},
  ],

  /* ===== Session 41: Special Request Board (Story-only collection / loadout) =====
     Config for the SR Board. 42-card digital universe split into: 2 OG starters
     (unlocked from the start), 12 character favorites (unlock 1:1 by beating each
     crafter), 1 Hank reward, 5 achievement-milestone Packs (19 SRs), and 8 Magic
     Socks "coming soon" SRs (Quick Play only; locked placeholders on the board). */
  SR_BOARD: {
    starters:   ['buttonEye','friendship'],
    hankReward: 'everyonesWelcomeExp',
    comingSoon: ['turtle','platypus','koi','mallard','spider','skelly','ghost','bat'],
    packs: [
      {id:'fantasy',   name:'Fantasy Pack',    ach:'packFantasy',   milestone:3,  srs:['trogdor','dwarfsBeard','loot','shoulderMonster']},
      {id:'sweater',   name:'Sweater Pack',    ach:'packSweater',   milestone:6,  srs:['undone','spaceSuit','friendlyNeighbor','tatteredSweater']},
      {id:'scifi',     name:'Sci-Fi Pack',     ach:'packScifi',     milestone:10, srs:['laserSword','tomsScarf','trouble','cunningHat']},
      {id:'wizard',    name:'Wizard Pack',     ach:'packWizard',    milestone:14, srs:['houseScarfRY','houseScarfBO','houseScarfGY','houseScarfYP']},
      {id:'diceTower', name:'Dice Tower Pack', ach:'packDiceTower', milestone:20, srs:['diceTower','shinyMathRocks','tomsHat']},
    ],
  },

  // Ensure the profile has an srBoard, seeded with the 2 OG starters (migration-safe).
  srEnsure: function(p){
    p = p || this.profile; if(!p) return null;
    if(!p.srBoard || !p.srBoard.unlocked || !p.srBoard.enabled){
      p.srBoard = { unlocked: this.SR_BOARD.starters.slice(), enabled: this.SR_BOARD.starters.slice(), unlockedAt: {} };
    }
    var b=p.srBoard;
    if(!b.unlockedAt) b.unlockedAt={};
    this.SR_BOARD.starters.forEach(function(id){
      if(b.unlocked.indexOf(id)===-1) b.unlocked.push(id);
      if(b.enabled.indexOf(id)===-1)  b.enabled.push(id);
    });
    return b;
  },
  // Unlock an SR onto the board. Newly-unlocked SRs default to ON. Returns true if newly unlocked.
  srUnlock: function(p, id){
    if(!id) return false;
    var b=this.srEnsure(p); if(!b) return false;
    if(b.unlocked.indexOf(id)!==-1) return false;
    b.unlocked.push(id);
    if(b.enabled.indexOf(id)===-1) b.enabled.push(id);
    b.unlockedAt[id]=Date.now();
    return true;
  },
  // Achievements that count toward Pack milestones — excludes the pack-unlock awards
  // themselves so unlocking a pack can never cascade-trigger the next one.
  srMilestoneCount: function(p){
    var earned=(p&&p.achievements)||{};
    return this.ACH.filter(function(a){ return !a.packUnlock && earned[a.id]; }).length;
  },
  // Unlock any Packs whose milestone is met; award each pack's (low-value) achievement
  // once. Returns the array of newly-unlocked pack objects (for toasts).
  srSyncPacks: function(p){
    p=p||this.profile; if(!p) return [];
    this.srEnsure(p);
    p.achievements=p.achievements||{}; p.bank=p.bank||0; p.lifetimeStoryScore=p.lifetimeStoryScore||0;
    var n=this.srMilestoneCount(p), self=this, newPacks=[];
    this.SR_BOARD.packs.forEach(function(pk){
      if(n < pk.milestone) return;
      if(p.achievements[pk.ach]) return;          // pack already unlocked
      pk.srs.forEach(function(id){ self.srUnlock(p, id); });
      var a=self.ACH.find(function(x){ return x.id===pk.ach; });
      p.achievements[pk.ach]=Date.now();
      if(a){ p.bank+=a.pts; p.lifetimeStoryScore+=a.pts; }
      newPacks.push(pk);
    });
    return newPacks;
  },
  // One-time retroactive unlock for players who beat crafters BEFORE the SR Board
  // existed. The profile stores, per crafter you've played as, how many rivals you
  // beat (`crafters[id].beaten`); the ladder order is fixed, so "beat N rivals as X"
  // deterministically identifies which opponents → unlock their favorites. Hank's
  // reward comes from the beat-Hank achievement. Runs once (guarded by _backfilled).
  // Returns true if it changed anything (caller saves).
  srBackfill: function(p){
    p=p||this.profile; if(!p) return false;
    var b=this.srEnsure(p);
    if(b._backfilled) return false;
    var self=this, LADDER=this.LADDER_ORDER, crafters=p.crafters||{}, changed=false;
    Object.keys(crafters).forEach(function(pickedId){
      var n=(crafters[pickedId] && crafters[pickedId].beaten)||0;
      if(n<=0) return;
      var oppOrder=LADDER.filter(function(c){ return c!==pickedId; });  // rivals faced, in order
      for(var i=0;i<n && i<oppOrder.length;i++){
        var fav=self.faveSR(oppOrder[i]);
        if(fav && self.srUnlock(p, fav.id)) changed=true;
      }
    });
    if(p.achievements && (p.achievements.bestOfNook || p.achievements.champion)){
      if(self.srUnlock(p, self.SR_BOARD.hankReward)) changed=true;
    }
    b._backfilled=true;
    return changed;
  },
  // The enabled-SR id list to hand Game.init for a Story match (null = full pool).
  srEnabledIds: function(){
    var b=this.srEnsure(this.profile);
    return (b && b.enabled && b.enabled.length) ? b.enabled.slice() : null;
  },
  // Minimum SRs that must stay enabled (the default pool floor).
  SR_FLOOR: 2,
  // Fixed display order for the board: starters → 12 favorites (ladder order) →
  // 5 packs → Hank reward → coming soon. De-duped, only real cards.
  srBoardOrder: function(){
    var B=this.SR_BOARD, self=this, ids=B.starters.slice();
    this.LADDER_ORDER.forEach(function(cid){ var f=self.faveSR(cid); if(f) ids.push(f.id); });
    B.packs.forEach(function(pk){ ids=ids.concat(pk.srs); });
    ids.push(B.hankReward);
    // Session 41: the 8 Magic Socks "coming soon" SRs are OFF the board for now (still
    // playable in Quick Play); they'll be added back later. So comingSoon is NOT included.
    var seen={}, out=[];
    ids.forEach(function(id){ if(!seen[id] && CARDS.getSpecialRequest(id)){ seen[id]=1; out.push(id); } });
    return out;
  },
  // Classify an SR for the board: kind + a human hint on how it's unlocked.
  srSource: function(id){
    var B=this.SR_BOARD;
    if(B.starters.indexOf(id)!==-1) return {kind:'starter'};
    if(id===B.hankReward) return {kind:'hank', hint:'Beat Hank, the Stitchmeister'};
    if(B.comingSoon.indexOf(id)!==-1) return {kind:'comingSoon'};
    for(var i=0;i<B.packs.length;i++){ if(B.packs[i].srs.indexOf(id)!==-1) return {kind:'pack', hint:B.packs[i].name+' · '+B.packs[i].milestone+' achievements'}; }
    var sr=CARDS.getSpecialRequest(id);
    if(sr && sr.favoriteOf){ var ch=this.char(sr.favoriteOf); return {kind:'favorite', hint:'Beat '+(ch?ch.name:sr.favoriteOf)+' in Story'}; }
    return {kind:'other'};
  },
  // Toggle an unlocked SR on/off for Story games. Enforces the enabled floor.
  srToggle: function(id){
    var p=this.profile; if(!p) return; var b=this.srEnsure(p);
    if(b.unlocked.indexOf(id)===-1) return;     // can't toggle a locked SR
    var i=b.enabled.indexOf(id);
    if(i!==-1){
      if(b.enabled.length<=this.SR_FLOOR){ this.srFloorNudge(); return; }
      b.enabled.splice(i,1);
    } else {
      b.enabled.push(id);
    }
    this.save();
    // keep an open detail panel's switch in sync without a rebuild flash
    var sw=document.querySelector('#srDetail .srb-switch');
    if(sw){ var nowOn=b.enabled.indexOf(id)!==-1; sw.classList.toggle('on', nowOn); sw.setAttribute('aria-checked', nowOn?'true':'false'); }
    this.goSRBoard();
  },
  srFloorNudge: function(){
    var host=document.getElementById('achToastHost');
    if(!host){ host=document.createElement('div'); host.id='achToastHost'; document.body.appendChild(host); }
    var el=document.createElement('div'); el.className='ach-toast floor';
    el.innerHTML='<span class="ach-toast-badge">🧶</span><span class="ach-toast-body">'+
      '<span class="ach-toast-head">Keep at least '+this.SR_FLOOR+' enabled</span>'+
      '<span class="ach-toast-name">Your Story pool needs a minimum.</span></span>';
    host.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('show'); });
    setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },420); },2600);
  },
  // Human "how + when it was unlocked" line for the detail panel.
  srHowText: function(id, info, isUnlocked){
    if(!isUnlocked) return info.hint || 'Locked';
    var b=this.srEnsure(this.profile), ts=(b.unlockedAt&&b.unlockedAt[id])||0;
    var when = ts ? new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '';
    var how;
    switch(info.kind){
      case 'favorite': how=(info.hint||'').replace(/^Beat /,'Unlocked by beating '); break;
      case 'hank':     how='Unlocked by beating Hank'; break;
      case 'pack':     how='Unlocked via the '+((info.hint||'').split(' · ')[0]||'a Pack'); break;
      case 'starter':  how='A starter Special Request'; break;
      default:         how='Unlocked';
    }
    return when ? (how+' · '+when) : how;
  },
  // Detail panel: tap/click a card → big preview + name + how/when unlocked + on/off toggle.
  srDetail: function(id){
    var sr=CARDS.getSpecialRequest(id); if(!sr) return;
    var p=this.profile||{}, b=this.srEnsure(p), self=this;
    var isUnlocked=b.unlocked.indexOf(id)!==-1, info=this.srSource(id);
    var showArt = isUnlocked || info.kind==='comingSoon';
    var body;
    if(isUnlocked){
      var on=b.enabled.indexOf(id)!==-1;
      var reqText=(window.UI&&UI._describeSRYarn)?UI._describeSRYarn(sr):'';
      var reqDots=(window.UI&&UI._renderSRYarnDots)?UI._renderSRYarnDots(sr):'';
      body='<div class="srd-meta">'+this.srHowText(id,info,true)+'</div>'+
        '<div class="srd-req">'+(reqDots?'<div class="srd-req-dots">'+reqDots+'</div>':'')+
          '<div class="srd-req-text">'+reqText+'</div>'+
          '<div class="srd-pts">Worth '+sr.points+' pts</div></div>'+
        '<div class="srd-toggle-row"><span class="srd-toggle-lbl">Show in your Story games</span>'+
        '<button class="srb-switch'+(on?' on':'')+'" role="switch" aria-checked="'+(on?'true':'false')+'" aria-label="Toggle '+sr.name+'" onclick="Story.srToggle(\''+id+'\')"><span class="srb-knob"></span></button></div>';
    } else if(info.kind==='comingSoon'){
      body='<div class="srd-lockmsg">⏳ Coming soon — already playable in Quick Play; it joins the Story board in a later update.</div>';
    } else {
      body='<div class="srd-lockmsg">🔒 '+(info.hint||'Locked')+'</div>';
    }
    var old=document.getElementById('srDetail'); if(old) old.parentNode.removeChild(old);
    var ov=document.createElement('div'); ov.id='srDetail'; ov.className='srd-overlay';
    ov.onclick=function(e){ if(e.target===ov) self.srDetailClose(); };
    ov.innerHTML='<div class="srd-panel">'+
      '<button class="srd-x" onclick="Story.srDetailClose()" aria-label="Close">✕</button>'+
      (showArt ? '<img class="srd-img" src="'+sr.img+'" alt="'+sr.name+'">' : '<div class="srd-qbig">?</div>')+
      '<div class="srd-name">'+(showArt?sr.name:'Locked Special Request')+'</div>'+
      body+
    '</div>';
    (this.root||document.body).appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add('open'); });
  },
  srDetailClose: function(){ var o=document.getElementById('srDetail'); if(o){ o.classList.remove('open'); setTimeout(function(){ if(o.parentNode) o.parentNode.removeChild(o); },200); } },
  // Render one board cell (unlocked = art that opens the detail panel; locked = dotted "?").
  srCellHTML: function(id){
    var sr=CARDS.getSpecialRequest(id); if(!sr) return '';
    var b=this.srEnsure(this.profile), info=this.srSource(id), isUnlocked=b.unlocked.indexOf(id)!==-1;
    if(isUnlocked){
      var on=b.enabled.indexOf(id)!==-1;
      return '<div class="srb-cell unlocked'+(on?' on':' off')+'" onclick="Story.srDetail(\''+id+'\')" title="'+sr.name+'">'+
        '<img class="srb-art" src="'+sr.img+'" alt="'+sr.name+'"></div>';
    }
    return '<div class="srb-cell locked" onclick="Story.srDetail(\''+id+'\')" title="'+(info.hint||'Locked')+'">'+
      '<div class="srb-q">?</div><div class="srb-lockover">'+(info.hint||'Locked')+'</div></div>';
  },
  goSRBoard: async function(){
    this._setHash('sr-board');
    await this.ensureProfile();
    var p=this.profile||{}, b=this.srEnsure(p), self=this;
    this.srSyncPacks(p); this.save();   // make sure the board reflects current unlocks
    var B=this.SR_BOARD;
    // Build the grouped sections (8 MS coming-soon SRs intentionally excluded for now).
    var favIds=[]; this.LADDER_ORDER.forEach(function(cid){ var f=self.faveSR(cid); if(f) favIds.push(f.id); });
    var sections=[
      {title:'Starters',         sub:'Yours from the very start', ids:B.starters},
      {title:'Crafter Favorites',sub:'Beat a crafter in Story to earn theirs', ids:favIds}
    ];
    B.packs.forEach(function(pk){ sections.push({title:pk.name, sub:'Unlocks at '+pk.milestone+' achievements', ids:pk.srs, packAch:pk.ach}); });
    sections.push({title:'Boss Reward', sub:'Beat Hank, the Stitchmeister', ids:[B.hankReward]});

    var allIds=[], sectionsHTML='';
    sections.forEach(function(sec){
      var cells='', u=0;
      sec.ids.forEach(function(id){
        if(!CARDS.getSpecialRequest(id)) return;
        allIds.push(id);
        if(b.unlocked.indexOf(id)!==-1) u++;
        cells+=self.srCellHTML(id);
      });
      var done = (sec.packAch && p.achievements && p.achievements[sec.packAch]);
      sectionsHTML+='<div class="srb-section">'+
        '<div class="srb-sec-head">'+
          '<span class="srb-sec-title">'+sec.title+(done?' <span class="srb-sec-done">unlocked</span>':'')+'</span>'+
          '<span class="srb-sec-sub">'+sec.sub+'</span>'+
          '<span class="srb-sec-prog">'+u+'/'+sec.ids.length+'</span>'+
        '</div>'+
        '<div class="srb-grid">'+cells+'</div>'+
      '</div>';
    });
    var unlockedCount=allIds.filter(function(id){ return b.unlocked.indexOf(id)!==-1; }).length;
    var enabledCount=allIds.filter(function(id){ return b.enabled.indexOf(id)!==-1; }).length;
    this.screen('<div class="crumb">Story Mode · Special Request Board</div>'+
      '<div class="srb-hero"><div class="srb-hero-num">'+unlockedCount+' <span>/ '+allIds.length+'</span></div>'+
      '<div class="srb-hero-lbl">unlocked · '+enabledCount+' active in your Story games</div></div>'+
      '<div class="srb-disclaimer">📖 This board affects <b>Story Mode only</b>. Quick Play &amp; pass-and-play always draw from the full deck. Your chosen crafter always brings their own favorite, whatever you toggle.</div>'+
      sectionsHTML+
      this.backBar('Story.goStats()','← Back to stats'));
  },
  // ===== Session 40: live (mid-match) achievement detection + toast =====
  // Build a stats snapshot from the IN-PROGRESS match — only the fields that are
  // meaningful before the game ends. Win/score/margin/beaten stay end-of-match only.
  _liveStats: function(){
    var you=null, players=(Game.state&&Game.state.players)||[];
    players.forEach(function(p){ if(!p.isAI && !you) you=p; });
    if(!you) you=players[0]||null;
    var learned=0, projects=0, srsFulfilled=0, favoriteSR=false, totalYarn=0, score=0;
    if(you){
      (you.patternTiles||[]).forEach(function(t){ if(t && t.learned) learned++; });
      projects=(you.projects||[]).length;
      var crafted=you.craftedSpecialRequests||[];
      srsFulfilled=crafted.length;
      favoriteSR=crafted.some(function(sr){ return sr && sr.isFavorite; });
      try{ totalYarn=Game.totalYarn(you); }catch(e){ var b=you.yarnBowl||{}; (CARDS.COLORS||[]).forEach(function(c){ totalYarn+=(b[c]||0); }); }
      try{ score=(Game.calculateFinalScore(you).total)||0; }catch(e){ score=0; }
    }
    return { patternsLearned:learned, projects:projects, srsFulfilled:srsFulfilled, favoriteSR:favoriteSR, totalYarn:totalYarn, score:score };
  },

  // Re-check the `live` achievements during play. Any newly-earned one is banked,
  // remembered for the end recap, and announced with a toast. Idempotent + cheap,
  // so it's safe to call from render hooks. No-ops outside an active Story match.
  checkAchievementsLive: function(){
    if(!this.active || !this.profile) return;
    var p=this.profile; p.achievements=p.achievements||{}; p.bank=p.bank||0; p.lifetimeStoryScore=p.lifetimeStoryScore||0;
    this._liveToasted=this._liveToasted||{}; this._matchEarned=this._matchEarned||[];
    var s=this._liveStats(), self=this, newly=[];
    this.ACH.forEach(function(a){
      if(!a.live || !a.test) return;
      if(p.achievements[a.id] || self._liveToasted[a.id]) return;
      if(a.test(p, s)){
        self._liveToasted[a.id]=true;
        p.achievements[a.id]=Date.now();
        p.bank+=a.pts; p.lifetimeStoryScore+=a.pts;
        self._matchEarned.push(a);
        newly.push(a);
      }
    });
    if(newly.length){
      var packs=this.srSyncPacks(p);   // a mid-match achievement may cross a Pack milestone
      this.save();
      newly.forEach(function(a,i){ setTimeout(function(){ self.achievementToast(a); }, i*500); });
      packs.forEach(function(pk,i){ var pa=self.ACH.find(function(x){ return x.id===pk.ach; }); if(pa) setTimeout(function(){ self.achievementToast(pa); }, (newly.length+i)*500); });
    }
  },

  achievementToast: function(a){
    try{ if(window.Sound) Sound.play('achievement'); }catch(e){}
    var host=document.getElementById('achToastHost');
    if(!host){ host=document.createElement('div'); host.id='achToastHost'; document.body.appendChild(host); }
    var el=document.createElement('div'); el.className='ach-toast';
    el.innerHTML='<span class="ach-toast-badge">🏅</span>'+
      '<span class="ach-toast-body"><span class="ach-toast-head">Achievement unlocked</span>'+
      '<span class="ach-toast-name">'+a.name+' <span class="ach-toast-pts">+'+a.pts+'</span></span></span>';
    host.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('show'); });
    setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 420); }, 3300);
  },

  // Wrap a few render delegates so live checks run right after the actions that
  // can unlock something (craft, learn, finish project, SR). Wired once; the
  // checker self-guards, so it's a no-op outside Story matches.
  _wireLiveAchievementHooks: function(){
    if(this._liveHooksWired || !window.Game || !Game.render) return;
    this._liveHooksWired=true;
    ['all','finishedObjects','specialRequests','projectStrip','craftGrid','turnHistory','yarnBowl'].forEach(function(k){
      var orig=Game.render[k];
      Game.render[k]=function(){
        if(orig) try{ orig.apply(Game.render, arguments); }catch(e){}
        try{ Story.checkAchievementsLive(); }catch(e){}
      };
    });
  },

  // Bank the win once: score, per-game high, per-crafter, time, achievements.
  // Does NOT advance `beaten` (nextChallenger does that). Uses beaten+1 for tests
  // since this win means one more rival down.
  creditWin: function(c){
    var p=this.profile=this.profile||{};
    p.achievements=p.achievements||{}; p.crafters=p.crafters||{}; p.bank=p.bank||0;
    p.lifetimeStoryScore=p.lifetimeStoryScore||0; p.totalPlayTimeMs=p.totalPlayTimeMs||0;
    p._totalWins=(p._totalWins||0)+1;
    var lm=this.lastMatch||{you:0,timeMs:0};
    p.lifetimeStoryScore += lm.you;
    p.totalPlayTimeMs += (lm.timeMs||0);
    if(!p.perGameHigh || lm.you>p.perGameHigh.score) p.perGameHigh={score:lm.you, crafter:this.picked, opponent:c};
    var beatenAfter=this.beaten+1;
    var cr=p.crafters[this.picked]||{used:true,best:0,furthest:''};
    cr.used=true; if(lm.you>(cr.best||0)) cr.best=lm.you;
    cr.beaten=Math.max(cr.beaten||0, beatenAfter);   // resumable progress
    cr.furthest=(beatenAfter>=11)?'Champion 🏆':(beatenAfter+' rivals beaten');
    p.crafters[this.picked]=cr;
    // Start from anything already unlocked mid-match (those are banked + toasted live),
    // then add end-of-match-only achievements. Result is the full list for the recap.
    var earned = (this._matchEarned || []).slice();
    var sctx = Object.assign({beaten:beatenAfter}, (this.lastMatch&&this.lastMatch.stats)||{});
    this.ACH.forEach(function(a){ if(!p.achievements[a.id] && a.test && a.test(p,sctx)){ p.achievements[a.id]=Date.now(); p.bank+=a.pts; p.lifetimeStoryScore+=a.pts; earned.push(a); } });
    // Session 41: SR Board unlocks — beating a crafter unlocks THEIR favorite SR;
    // beating Hank unlocks Everyone's Welcome. Then sync achievement-milestone Packs
    // (counts the achievements just credited above; excludes pack-unlock awards).
    this.srEnsure(p);
    if(c==='hank' || (this.isBoss && this.isBoss(c))){ this.srUnlock(p, this.SR_BOARD.hankReward); }
    else { var favSR=this.faveSR(c); if(favSR) this.srUnlock(p, favSR.id); }
    this.srSyncPacks(p);
    lm.earned=earned;
    this.save();
  },
  save: async function(){
    if(!this.profile) return;
    try{ localStorage.setItem('ar_story_profile', JSON.stringify(this.profile)); }catch(e){}
    if(this.sb && this.currentUser){ try{ await this.sb.from('profiles').upsert({ id:this.currentUser.id, data:this.profile, updated_at:new Date().toISOString() }); }catch(e){} }
  },

  /* ---- SR preview ---- */
  openSR: function(c){ var sr=this.faveSR(c); if(!sr) return; var lb=document.getElementById('srlightbox'); if(!lb){ lb=document.createElement('div'); lb.id='srlightbox'; lb.onclick=function(){ lb.classList.remove('open'); }; lb.innerHTML='<div class="lb-inner"><img id="srlbImg"><div class="lb-name" id="srlbName"></div><div class="lb-close">Tap anywhere to close</div></div>'; document.body.appendChild(lb); } document.getElementById('srlbImg').src=sr.img; document.getElementById('srlbName').textContent=sr.name; lb.classList.add('open'); this.unhoverSR(); },
  hoverSR: function(c,e){ var sr=this.faveSR(c); if(!sr) return; var h=document.getElementById('srhover'); if(!h){ h=document.createElement('div'); h.id='srhover'; h.innerHTML='<img id="srhoverImg"><div class="nm" id="srhoverName"></div>'; document.body.appendChild(h); } document.getElementById('srhoverImg').src=sr.img; document.getElementById('srhoverName').textContent=sr.name; h.style.display='block'; this.moveHover(e); },
  moveHover: function(e){ var h=document.getElementById('srhover'); if(!h) return; var x=e.clientX+18,y=e.clientY-130; if(x+250>window.innerWidth) x=e.clientX-248; if(y<10) y=10; h.style.left=x+'px'; h.style.top=y+'px'; },
  unhoverSR: function(){ var h=document.getElementById('srhover'); if(h) h.style.display='none'; },
};

// Load saved profile (cloud if signed in, else local). Helper so start() reads fresh.
async function SaveAPISafe(S){
  if(S.sb && S.currentUser){
    try{ var r=await S.sb.from('profiles').select('data').eq('id',S.currentUser.id).maybeSingle(); if(r.data&&r.data.data) return r.data.data; }catch(e){}
  }
  try{ return JSON.parse(localStorage.getItem('ar_story_profile')||'{}'); }catch(e){ return {}; }
}

document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ var lb=document.getElementById('srlightbox'); if(lb) lb.classList.remove('open'); } });
window.addEventListener('resize', function(){ if(Story.root && Story.root.style.display!=='none' && Story.picked && document.getElementById('opptrack')) Story.renderLadder(); });
// Session 43: re-render the Craft Circle when crossing the desktop/mobile breakpoint
// so the layout (two-column list ↔ carousel) matches the current width.
(function(){ var t, was=null;
  window.addEventListener('resize', function(){
    if(!(Story.root && Story.root.style.display!=='none' && Story.picked && document.getElementById('ccHero'))) return;
    clearTimeout(t); t=setTimeout(function(){
      var now=Story._wideView(); if(now!==was){ was=now; Story.renderLadder(); }
    }, 160);
  });
})();
