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
  DIALOG: {
    rebecca:{intro:'I may have bought a little extra. Don’t judge my basket.', win:'You beat me with way less stash. Teach me your restraint, oh wise one.', lose:'Eee, I won?! That’s the yarn talking, I had SO much to work with. Go again?'},
    theo:{intro:'I already know which stall has the best value today.', win:'Huh. You out-valued me. I’m annoyed and a little impressed. Mostly annoyed.', lose:'Good game. I just bought smarter. It’s not personal, it’s arithmetic.'},
    derrick:{intro:'I make four before most folks make one.', win:'Now THAT was a finish. Clean, fast, smart. I’m stealing whatever you just did.', lose:'Output, my friend. That’s the whole secret. Come back, I’ll show you the rhythm.'},
    amara:{intro:'I was just gonna make stuff and see what happens.', win:'Okay, you actually pushed me. Respect. That basically never happens.', lose:'See? Didn’t even try that hard. That’s kind of my thing.'},
    neeha:{intro:'Color has no rules, child. Only conversations.', win:'You didn’t fight the colors, you let them lead. That is the whole art.', lose:'The colors simply listened to me today. Next time, perhaps, they’ll whisper to you.'},
    alex:{intro:'Color requirements? Never met ’em.', win:'Ohhh you broke the rules better than me. I’m equal parts proud and furious.', lose:'Rules are fake and I’m gonna prove it again. GG though, genuinely.'},
    ted:{intro:'I’ll spin what I need while you’re still picking through the bins.', win:'You found your rhythm faster than I found mine. That’s the trick.', lose:'Slow and steady, friend. Made every bit of that myself. Felt good.'},
    eliza:{intro:'I plan three turns ahead, and I don’t improvise.', win:'You disrupted my plan. I did not account for you. Recalculating. Rematch.', lose:'Executed exactly as planned. I do love when that happens.'},
    jo:{intro:'I make ’em two at a time, so my cat always gets one.', win:'You beat me AND the cat? That’s a big deal in this house. Well done, truly.', lose:'Double the output, double the fun! Here, the cat made you a mouse.'},
    noah:{intro:'Two items a craft, two pigs, one crate of yarn. Let’s go.', win:'You did more with less?? That’s basically witchcraft. The pigs respect you now.', lose:'MORE STUFF WINS, baby! The pigs are very proud. Run it back?'},
    irene:{intro:'I’ve been crafting since before you were a stitch.', win:'You beat an old woman at her own game. I’m so proud I could just pinch you.', lose:'Don’t feel bad, dear. Experience just has a way of winning. More tea?'},
    mauro:{intro:'Three moves, all of ’em count. I don’t waste motion.', win:'Tight game. You didn’t waste a move either. I see you. Good one.', lose:'Less is more, you know? Played the right notes, that’s all.'},
    hank:{intro:'So. You climbed the whole circle to reach my nook. Spin your own yarn yet, little stitch? I do. Every turn. Let’s see what you’ve got.', win:'…Well now. You out-crafted the Stitchmeister himself. The circle is yours. I’ll put the kettle on — you’ve earned a proper sit.', lose:'Ho ho — the gnome keeps his crown a while longer. Don’t fret, the yarn never runs out. Climb back up and try me again.'},
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
        '<div class="story-brand"><img class="story-logo" src="Other Images Textures Details/AR Logo Final Aug2019.png" alt="ArchRavels"><span class="story-edition">Digital Edition</span></div>' +
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

    // Session 36: DEV shortcut — jump straight to the Hank boss fight for testing.
    // Add ?boss to the URL (optionally ?boss=mauro to pick your crafter), or call
    // Story.testHank() from the console. Skips the whole climb.
    try {
      var m = /[?&#]boss(?:=([a-z]+))?/i.exec(location.href);
      if (m) {
        var who = m[1] && CARDS.characters[m[1]] ? m[1] : 'rebecca';
        setTimeout(function(){ Story.testHank(who); }, 350);
      }
    } catch(e){}
  },

  open: function(){ this.root.style.display='block'; document.body.classList.add('story-open'); window.scrollTo(0,0); },
  hide: function(){ this.root.style.display='none'; document.body.classList.remove('story-open'); },
  screen: function(html){ document.getElementById('story-screen').innerHTML = html; window.scrollTo(0,0); },

  /* ============================ entry ============================ */
  start: async function(){
    await this.ensureProfile();
    this.open();
    this.goTypes();
  },
  account: function(){ this.open(); this.goSignIn(); },   // sign-in from the landing/front door
  // Session 36: DEV — drop straight into the Hank boss face-off (skips the climb).
  // Usage: Story.testHank() or Story.testHank('mauro'), or the ?boss URL flag.
  testHank: function(crafterId){
    crafterId = (crafterId && CARDS.characters[crafterId] && crafterId!=='hank') ? crafterId : 'rebecca';
    this.picked = crafterId;
    this.ladder = this.LADDER_ORDER.filter(function(c){ return c!==crafterId; }).concat(['hank']);
    this.beaten = this.ladder.length - 1;   // currentOpp() → 'hank'
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
    this.sb.auth.onAuthStateChange(function(_e,s){
      var was=(Story.currentUser&&Story.currentUser.id)||null;
      Story.currentUser = s ? s.user : null;
      var now=(Story.currentUser&&Story.currentUser.id)||null;
      if(was!==now){ Story.profile=null; Story.loadProfile(); }   // identity changed → reload the right profile
      else Story.renderChip();
    });
    await this.loadProfile();
  },
  displayName: function(){ if(!this.currentUser) return 'Guest Crafter'; return (this.currentUser.user_metadata&&this.currentUser.user_metadata.name)||this.currentUser.email||'Crafter'; },
  renderChip: function(){
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
  backBar: function(onclick, label){ return '<div class="backbar"><button class="btn btn-ghost" onclick="'+onclick+'">'+(label||'← Back')+'</button></div>'; },

  goTypes: function(){
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
    this.screen('<div class="crumb">Story Mode · Step 1 of 2</div>'+
      '<p class="st-sub">Take on twelve rival crafters in a one-on-one ladder.<br>Win to advance, earn achievements, and bank points toward your lifetime score.</p>'+
      '<div class="sm-steps">'+
        '<span class="sm-step"><span class="sm-n">1</span>Pick a style</span><span class="sm-arrow">→</span>'+
        '<span class="sm-step"><span class="sm-n">2</span>Out-stitch the Ravelers</span><span class="sm-arrow">→</span>'+
        '<span class="sm-step"><span class="sm-n">3</span>Earn the Crafty Crown</span>'+
      '</div>'+
      '<p class="sm-note">'+(this.currentUser?'Your progress is saved to your account.':'Sign in to save your progress across devices.')+'</p>'+
      '<div class="sm-divider"></div>'+
      '<h2 class="sm-choose">Choose your playstyle</h2>'+
      '<p class="st-sub">Six crafter archetypes, each plays the bazaar differently. Pick the style that fits you.</p>'+
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
      return '<div class="char" style="--tc:'+m.color+'" onclick="Story.goLadder(\''+c+'\')">'+
        '<div class="port"><span class="cornerpill left">'+ch.name+'</span><img src="'+self.portrait(c)+'"></div>'+
        '<div class="info"><div class="ctype">'+m.name+'</div>'+
          (dlg.intro?'<div class="quote">“'+dlg.intro+'”</div>':'')+
          srBlock+
          '<div class="choose" style="margin-top:14px;text-align:center">Play as '+ch.name+'</div></div></div>';
    }).join('');
    this.screen('<div class="crumb">Story Mode · Step 2 of 2</div><h1 class="st-h1">'+m.name+'</h1>'+
      '<p class="st-sub">'+m.desc+'</p>'+
      '<p class="same-note">Same playstyle, different personality. Pick the one that feels like you.</p>'+
      '<div class="compare">'+cards+'</div>'+this.backBar('Story.goTypes()','← Back to playstyles'));
  },

  /* ---- ladder ---- */
  currentOpp: function(){ return this.ladder[Math.min(this.beaten, this.ladder.length-1)]; },
  isBoss: function(c){ return c==='hank'; },
  goLadder: async function(charId){
    await this.ensureProfile();   // make sure saved progress is loaded before resuming
    this.picked=charId;
    this.ladder = this.LADDER_ORDER.filter(function(c){ return c!==charId; }).concat(['hank']);
    this.beaten = this._storedBeaten(charId);   // resume where this crafter left off
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
    var isMobile = window.innerWidth <= 620, total=this.ladder.length, champ = this.beaten>=total;
    var nodes=[];
    for(var i=total-1;i>=0;i--){
      var c=this.ladder[i], isFocus=(i===this.beaten), done=(i<this.beaten);
      nodes.push('<div class="slot '+(isFocus?'is-focus':'')+'">'+(isFocus?this.oppCardHTML(c):this.miniHTML(c,done))+'</div>');
      if(isMobile && isFocus) nodes.push('<div class="slot you-slot">'+this.youNodeHTML()+'</div>');
    }
    if(isMobile && champ) nodes.push('<div class="slot you-slot">'+this.youNodeHTML()+'</div>');
    var track = nodes.map(function(n,idx){ return idx?'<div class="connector2"></div>'+n:n; }).join('');
    var progTxt = champ ? '🏆 Champion of the Craft Circle!' : (this.beaten+' of '+total+' beaten');
    this.screen('<div class="crumb">The Climb</div><h1 class="st-h1">Climb the Craft Circle</h1>'+
      '<p class="st-sub">Playing as '+this.char(this.picked).name+'. Beat all eleven rivals to claim the circle.</p>'+
      '<div class="progress">'+progTxt+'</div><div class="progbar"><div id="progFill" style="width:'+(this.beaten/total*100)+'%"></div></div>'+
      '<div class="ladder2"><div class="you-side"><div class="side-label">You</div><div id="youCard">'+this.youCardHTML()+'</div></div>'+
      '<div class="opp-side"><div class="side-label">The Climb ↑</div><div class="oppviewport"><div class="opptrack" id="opptrack">'+track+'</div></div></div></div>'+
      '<p class="demohint">Scroll the climb to scout the rivals ahead. Hit Challenge to play a real match.</p>'+
      this.backBar('Story.goTypes()','↺ Change crafter'));
    var self=this;
    requestAnimationFrame(function(){
      var vp=document.querySelector('.oppviewport'), trackEl=document.getElementById('opptrack');
      if(!vp||!trackEl) return;
      var focusEl=trackEl.querySelector('.is-focus');
      var focusCard=focusEl&&focusEl.querySelector('.pcard');
      if(focusCard) focusCard.classList.add('has-cta');
      var youEl=document.querySelector('#youCard .pcard');
      if(focusCard&&youEl){ focusCard.style.minHeight=''; youEl.style.minHeight='';
        if(window.innerWidth>620){ var h=Math.max(focusCard.offsetHeight, youEl.offsetHeight); focusCard.style.minHeight=h+'px'; youEl.style.minHeight=h+'px'; } }
      var target = isMobile ? (trackEl.querySelector('.you-slot')||focusEl) : (focusEl||trackEl.lastElementChild);
      if(target) vp.scrollTop = Math.max(0, target.offsetTop-(vp.clientHeight-target.offsetHeight-16));
    });
  },
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
  goPreMatch: function(){
    var c=this.currentOpp(), dlg=this.DIALOG[c]||{};
    this.screen('<div class="crumb">Match · Face-Off</div><h1 class="st-h1">Before the match</h1>'+
      '<div class="vs-stage"><div>'+this.fighterHTML(this.picked,'You')+'</div><div class="vs-badge">VS</div><div>'+this.fighterHTML(c,'Challenger')+'</div></div>'+
      '<div class="dialogbox">'+this.dialogHTML(c, dlg.intro||'Let’s craft.')+'</div>'+
      '<div class="match-actions"><button class="btn btn-gold" onclick="Story.beginMatch()">Begin Match</button>'+
      '<button class="btn btn-ghost" onclick="Story.renderLadder()">Back</button></div>');
  },
  beginMatch: function(){
    var oppId=this.currentOpp();
    this.matchStart=Date.now(); this.active=true; this.storyGame=true;   // mark this match as a Story match (for game-over routing)
    try{ if(window.Sound){ Sound.music.startTheme(oppId); Sound.play('game-start'); } }catch(e){}
    var youName=(this.currentUser&&this.currentUser.user_metadata&&this.currentUser.user_metadata.name)||'You';
    this.hide();
    // hide the landing/front door too — otherwise closing the story overlay reveals
    // the homepage sitting on top of the freshly-started match (looked like "kicked back home").
    var landing=document.getElementById('landingScreen'); if(landing) landing.style.display='none';
    // Session 40: reset per-match live-achievement tracking + wire detection hooks (once)
    this._liveToasted = {}; this._matchEarned = [];
    this._wireLiveAchievementHooks();
    Game.init({ players: [
      { characterId:this.picked, isAI:false, name:youName },
      { characterId:oppId,       isAI:true,  name:this.char(oppId).name }
    ], srEnabledIds: this.srEnabledIds() });   // Session 41: Story honors the SR Board loadout
    UI.renderAll();
    var tb=document.getElementById('takeoverBar'); if(tb) tb.style.display='none';
  },
  onMatchOver: function(){
    if(!this.active) return;
    this.active=false;
    var players=(Game.state&&Game.state.players)||[], you=null, opp=null;
    players.forEach(function(p){ if(p.isAI) opp=p; else you=p; });
    var ys = you ? (Game.calculateFinalScore(you).total||0) : 0;
    var os = opp ? (Game.calculateFinalScore(opp).total||0) : 0;
    var c = this.currentOpp();
    var stats = this.captureMatchStats(you, opp, ys, os);
    this.lastMatch = { you:ys, opp:os, win: ys>=os, timeMs: Date.now()-this.matchStart, earned:[], stats:stats };
    try{ if(window.Sound) Sound.play(this.lastMatch.win?'story-win':'story-lose'); }catch(e){}
    if(this.lastMatch.win) this.creditWin(c);   // bank score/achievements once; does NOT advance beaten
    this.open();
    this.showResult(this.lastMatch.win);
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
        : '<button class="btn btn-gold" onclick="Story.nextChallenger()">Next Challenger →</button>';
    } else {
      details = '<div class="result-card"><div class="rd-score" style="font-style:italic;color:var(--st-walnut-soft)">No shame in a dropped stitch. Pick your needles back up and try again.</div>'+
        '<div style="color:var(--st-walnut-soft);font-size:.85rem;margin-top:6px">Your score '+lm.you+' · '+this.char(c).name+' '+lm.opp+'</div></div>';
      actions = '<button class="btn btn-gold" onclick="Story.goPreMatch()">Rematch</button><button class="btn btn-ghost" onclick="Story.renderLadder()">Back to the climb</button>';
    }
    this.screen('<div class="crumb">Match · Result</div><div class="result-banner '+(win?'win':'loss')+'">'+banner+'</div>'+
      '<div class="dialogbox">'+this.dialogHTML(c, win?(dlg.win||'Well played.'):(dlg.lose||'Got you this time.'))+'</div>'+
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
      '<div class="ending-hero"><div class="crown">🏆</div><h1 class="st-h1">Champion of the Craft Circle!</h1>'+
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
  goStats: async function(){
    await this.ensureProfile();
    var p=this.profile||{}, crafters=p.crafters||{};
    var tiles=[
      {ico:'🏆',num:(p.lifetimeStoryScore||0),lbl:'Lifetime Story Score'},
      {ico:'⭐',num:((p.perGameHigh&&p.perGameHigh.score)||0),lbl:'Best Game'},
      {ico:'⏱',num:this.fmtTime(p.totalPlayTimeMs||0),lbl:'Total Time'},
      {ico:'🏅',num:(Object.keys(p.achievements||{}).length)+' / '+this.ACH.length,lbl:'Achievements'},
    ].map(function(t){ return '<div class="stat-tile"><div class="st-ico">'+t.ico+'</div><div class="st-num">'+t.num+'</div><div class="st-lbl">'+t.lbl+'</div></div>'; }).join('');
    var order=Object.keys(CARDS.characters).filter(function(c){ return c!=='hank'; }).sort(function(a,b){ return (crafters[b]?1:0)-(crafters[a]?1:0); });
    var board=order.map(function(c){
      var s=crafters[c], col=Story.color(c);
      var sub = s ? (s.furthest||'') : 'Not played yet';
      var score = s ? (s.best||0) : '—';
      var cta = !s ? 'Start climb →' : (/champion/i.test(s.furthest||'') ? 'Replay →' : 'Resume →');
      return '<div class="cb-card playable'+(s?'':' unplayed')+'" style="--tc:'+col+'" onclick="Story.goLadder(\''+c+'\')" title="Play '+Story.char(c).name+'’s Story Mode">'+
        '<img src="'+Story.portrait(c)+'"><div class="cb-meta"><b>'+Story.char(c).name+'</b><span>'+sub+'</span><span class="cb-cta">'+cta+'</span></div>'+
        '<div class="cb-score">'+score+'</div></div>';
    }).join('');
    this.screen('<div class="crumb">Story Mode · Stats</div>'+
      '<div class="stats-id"><div class="big-av">🧶</div><div class="who2"><div class="nm">'+this.displayName()+'</div>'+
        '<div class="sub2">'+(this.currentUser?'Synced to your account':'Sign in to save across devices')+'</div></div>'+
        (this.currentUser
          ? '<button class="btn btn-ghost stats-signout" onclick="Story.signOut()">Sign out</button>'
          : '<button class="btn btn-gold stats-signout" onclick="Story.goSignIn()">Sign in</button>')+
      '</div>'+
      '<div class="stat-tiles">'+tiles+'</div>'+
      '<div class="ach-cta-row"><button class="btn btn-ghost" onclick="Story.goAchievements()">🏅 View all achievements →</button><button class="btn btn-ghost" onclick="Story.goSRBoard()">🧶 Special Request Board →</button></div>'+
      '<div class="section-h">Your Crafters</div><div class="crafter-board">'+board+'</div>'+
      this.backBar('Story.goTypes()','← Back to start'));
  },
  fmtTime: function(ms){ var m=Math.round(ms/60000); if(m<60) return m+'m'; return Math.floor(m/60)+'h '+(m%60)+'m'; },

  /* ---- achievement board ---- */
  goAchievements: async function(){
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
