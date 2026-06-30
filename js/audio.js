/* ArchRavels Digital — audio engine (Session: sound pass).
   Map = Adam's sound-map.json (byEvent). Files live in /audio. Music sits under SFX.
   Device volume controls absolute loudness; we only balance the mix + offer mute. */
(function(){
  var BASE='audio/';
  var SFX_VOL=0.85, MUSIC_VOL=0.15;
  var muted=false;
  try{ var _sv=JSON.parse(localStorage.getItem('ar-audio-vol')||'{}'); if(typeof _sv.sfx==='number')SFX_VOL=_sv.sfx; if(typeof _sv.music==='number')MUSIC_VOL=_sv.music; if(_sv.muted)muted=true; }catch(e){}
  function _saveVol(){ try{ localStorage.setItem('ar-audio-vol',JSON.stringify({sfx:SFX_VOL,music:MUSIC_VOL,muted:muted})); }catch(e){} }
  var MAP={"game-start": ["chrysalyn-cheerful-traditional-harp-positive-ui-alert-540977.mp3"], "turn-start": ["miraclei-11l-ui_confirm_ping_sof-1750675151145-364178.mp3"], "select-shop": ["daviddumaisaudio-store-entrance-bell-188054.mp3"], "select-craft": ["freesound_community-clothes-drop-2-40202.mp3"], "select-special": ["humordome-magic-button-click-453255.mp3"], "shop": ["koiroylers-vintage-cash-register-351712.mp3"], "restock": ["freesound_community-riffle-shuffle-46706.mp3"], "draw-card": ["freesound_community-flipcard-91468.mp3"], "craft": ["humordome-magic-button-click-453258.mp3"], "exchange": ["u_3bsnvt0dsu-spin-fail-295088.mp3"], "learn-pattern": ["freesound_community-pencil_check_mark_1-88805.mp3"], "frog-it": ["freesound_community-frog-croak-80816.mp3"], "finish-project": ["freesound_gamestudio-level-complete-394515.mp3"], "ab-take-yarn": ["freesound_community-clothes-drop-2-40202.mp3"], "ab-exchange": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Shop.mp3"], "ab-end-actions": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Confirm.mp3"], "ab-end-turn": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Confirm.mp3"], "ab-skip-restock": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Confirm.mp3"], "ab-restock": ["homemade_sfx-equip-sound-272428.mp3"], "ab-done": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Confirm.mp3"], "ab-finish": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Equip.mp3"], "ab-learn": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Equip.mp3"], "ab-frog": ["candidates/ui__jdsherbert__JDSherbert - Ultimate UI SFX Pack - Select - 2.wav"], "drawer-open": ["candidates/transition__shapeforms__WHOOSH_AIRY_FLUTTER_01.wav"], "drawer-close": ["candidates/transition__shapeforms__WHOOSH_ARM_SWING_01_WIDE.wav"], "sr-find": ["chrysalyn-cheerful-traditional-harp-positive-ui-alert-540977.mp3"], "sr-reveal": ["dragon-studio-flipping-book-page-499646.mp3"], "take-sr": ["freesound_community-pencil_check_mark_2-105940.mp3"], "sr-craft": ["dragon-studio-wow-423653.mp3"], "sr-award": ["universfield-game-level-complete-143022.mp3"], "ev-reveal": ["chrysalyn-cheerful-traditional-harp-positive-ui-alert-540977.mp3"], "ev-tangled-cat": ["alex_jauk-annoyed-cat-meows-angrily-438006.mp3"], "ev-yarn-sale": ["daviddumaisaudio-store-entrance-bell-188054 copy.mp3"], "ev-donate": ["creatorshome-select-001-337218.mp3"], "ev-friendly-clerk": ["latent-rick-retro-cash-register-ka-ching-with-coin-drawer-1-546555.mp3"], "ev-craft-circle": ["freesound_community-success-fanfare-trumpets-6185.mp3"], "ev-generic": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Shop.mp3"], "game-win": ["peekaboolabcreative-11l-victory_sound_with_t-1749487402950-357606.mp3"], "game-lose": ["freesound_community-wah-wah-sad-trombone-6347.mp3"], "achievement": ["freesound_gamestudio-level-complete-394515.mp3"], "milestone": ["koiroylers-awesome-level-up-351714.mp3"], "story-win": ["freesound_community-success-fanfare-trumpets-6185.mp3"], "story-lose": ["freesound_community-wah-wah-sad-trombone-6347.mp3"], "theme-rebecca": ["Lo-Fi Soundtrack Pack/Chill.mp3"], "theme-theo": ["Lo-Fi Soundtrack Pack/Coffee.mp3"], "theme-derrick": ["Lo-Fi Soundtrack Pack/Cabin.mp3"], "theme-amara": ["Lo-Fi Soundtrack Pack/Ambience.mp3"], "theme-neeha": ["Lo-Fi Soundtrack Pack/Garden.mp3"], "theme-alex": ["Lo-Fi Soundtrack Pack/Drive.mp3"], "theme-ted": ["Lo-Fi Soundtrack Pack/Chiptune.mp3"], "theme-eliza": ["Lo-Fi Soundtrack Pack/Vibe.mp3"], "theme-jo": ["Lo-Fi Soundtrack Pack/Night.mp3"], "theme-noah": ["Lo-Fi Soundtrack Pack/Midnight.mp3"], "theme-irene": ["Lo-Fi Soundtrack Pack/Sunset.mp3"], "theme-mauro": ["Lo-Fi Soundtrack Pack/Underwater.mp3"], "transition-moment": ["latent-rick-achievement-badge-pop-sound-2-547865.mp3"], "transition": ["alexzavesa-swoosh-5-463611.mp3"], "fl-cat": ["alex_jauk-annoyed-cat-meows-angrily-438006.mp3", "dragon-studio-cute-cat-meow-472372.mp3"], "fl-dog": ["dragon-studio-dog-bark-382732.mp3", "dragon-studio-old-dog-howling-390287.mp3"], "fl-duck": ["freesound_community-075176_duck-quack-40345.mp3", "freesound_community-duck-quacking-37392.mp3"], "fl-pig": ["freesound_community-pig-sound-43195.mp3", "freesound_community-pig-sound-47168.mp3"], "btn": ["freesound_community-button-pressed-38129.mp3"], "confirm": ["freesound_community-ui_correct_button2-103167.mp3"], "cancel": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Exit.mp3"], "open-modal": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_OpenMenu.mp3"], "close-modal": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_CloseMenu.mp3"], "select": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_MenuSelections.mp3"], "toggle": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Equip.mp3"], "save": ["SoupTonic UI1 SFX Pack 1 - mp3/SFX_UI_Saved.mp3"], "error": ["soundreality-notification-error-427345.mp3"], "music-game": ["Lo-Fi Soundtrack Pack/Cozy.mp3", "Lo-Fi Soundtrack Pack/Coffee.mp3", "Lo-Fi Soundtrack Pack/Serenity.mp3", "Lo-Fi Soundtrack Pack/Cabin.mp3", "Lo-Fi Soundtrack Pack/Chill.mp3", "Lo-Fi Soundtrack Pack/Garden.mp3", "Lo-Fi Soundtrack Pack/Ambience.mp3", "Lo-Fi Soundtrack Pack/Chiptune.mp3", "Lo-Fi Soundtrack Pack/Drive.mp3", "Lo-Fi Soundtrack Pack/Midnight.mp3", "Lo-Fi Soundtrack Pack/Night.mp3", "Lo-Fi Soundtrack Pack/Pixel.mp3", "Lo-Fi Soundtrack Pack/Rainy.mp3", "Lo-Fi Soundtrack Pack/Stroll.mp3", "Lo-Fi Soundtrack Pack/Sunset.mp3", "Lo-Fi Soundtrack Pack/Underwater.mp3", "Lo-Fi Soundtrack Pack/Vibe.mp3", "Lo-Fi Soundtrack Pack/Zen.mp3"], "music-menu": ["Lo-Fi Soundtrack Pack/Coffee.mp3"], "music-story": ["Lo-Fi Soundtrack Pack/Serenity.mp3"], "music-win": ["yo-tu-stars-and-rainbows-looping-tune-234068.mp3"], "amb-bazaar": ["freesound_community-happy-crowd-at-interval-23485.mp3"], "amb-craft": ["freesound_community-crochet-needles-hooks-and-fabric-54399.mp3"]};
  var CHAR_THEME={"rebecca": "Lo-Fi Soundtrack Pack/Chill.mp3", "theo": "Lo-Fi Soundtrack Pack/Coffee.mp3", "derrick": "Lo-Fi Soundtrack Pack/Cabin.mp3", "amara": "Lo-Fi Soundtrack Pack/Ambience.mp3", "neeha": "Lo-Fi Soundtrack Pack/Garden.mp3", "alex": "Lo-Fi Soundtrack Pack/Drive.mp3", "ted": "Lo-Fi Soundtrack Pack/Chiptune.mp3", "eliza": "Lo-Fi Soundtrack Pack/Vibe.mp3", "jo": "Lo-Fi Soundtrack Pack/Night.mp3", "noah": "Lo-Fi Soundtrack Pack/Midnight.mp3", "irene": "Lo-Fi Soundtrack Pack/Sunset.mp3", "mauro": "Lo-Fi Soundtrack Pack/Underwater.mp3"};
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function url(f){ return BASE+encodeURI(f); }
  /* Shared AudioContext for BOTH music and SFX. iOS WKWebView ignores HTMLMediaElement
     .volume, so SFX go through a GainNode too — played as decoded AudioBuffers so the
     master SFX gain actually attenuates on-device (and overlapping plays just work). */
  var _ctx=null, _ctxTried=false;
  function getCtx(){
    if(_ctx||_ctxTried) return _ctx;
    _ctxTried=true;
    try{ var AC=window.AudioContext||window.webkitAudioContext; if(AC) _ctx=new AC(); }catch(e){ _ctx=null; }
    return _ctx;
  }
  function resumeCtxGlobal(){ try{ if(_ctx&&_ctx.state==='suspended') _ctx.resume(); }catch(e){} }
  var sfxGain=null, buffers={};
  function getSfxGain(){ var c=getCtx(); if(!c) return null; if(!sfxGain){ sfxGain=c.createGain(); sfxGain.gain.value=SFX_VOL; sfxGain.connect(c.destination); } return sfxGain; }
  function setSfxGain(){ if(sfxGain){ try{ sfxGain.gain.value=SFX_VOL; }catch(e){} } }
  function loadBuffer(file, cb){
    if(buffers[file]){ cb(buffers[file]); return; }
    var c=getCtx(); if(!c){ cb(null); return; }
    fetch(url(file)).then(function(r){ return r.arrayBuffer(); }).then(function(ab){
      c.decodeAudioData(ab, function(buf){ buffers[file]=buf; cb(buf); }, function(){ cb(null); });
    }).catch(function(){ cb(null); });
  }
  var cache={};   /* legacy <audio> cache for the no-Web-Audio fallback */
  function sfx(file,vol){
    if(muted||!file) return;
    var c=getCtx(), g=getSfxGain();
    if(c && g){
      resumeCtxGlobal();
      loadBuffer(file, function(buf){
        if(!buf || muted) return;
        try{
          var src=c.createBufferSource(); src.buffer=buf;
          if(vol!=null && vol!==1){ var vg=c.createGain(); vg.gain.value=vol; src.connect(vg); vg.connect(g); }
          else { src.connect(g); }
          src.start(0);
        }catch(e){}
      });
      return;
    }
    /* Fallback (no Web Audio): old clone-and-play path. */
    try{
      var base=cache[file]; if(!base){ base=new Audio(url(file)); base.preload='auto'; cache[file]=base; }
      var a=base.cloneNode(); a.volume=Math.min(1, SFX_VOL*(vol==null?1:vol)); a.play().catch(function(){});
    }catch(e){}
  }
  var music=(function(){
    /* iOS WKWebView IGNORES HTMLMediaElement.volume (it always reports/uses 1), so the
       slider + mute did nothing there. Route music through a Web Audio GainNode — gain
       DOES attenuate on iOS — and additionally pause() the element on mute / game-pause. */
    var el=null, idx=-1, started=false, pausedByGame=false;
    var ctx=null, gain=null, srcNode=null, graphTried=false;
    function buildGraph(){
      if(graphTried) return; graphTried=true;
      try{
        var c=getCtx();
        if(!c||!el) return;
        ctx=c;
        srcNode=ctx.createMediaElementSource(el);
        gain=ctx.createGain();
        gain.gain.value=muted?0:MUSIC_VOL;
        srcNode.connect(gain); gain.connect(ctx.destination);
      }catch(e){ ctx=null; gain=null; }
    }
    function ensureEl(){ if(!el){ el=new Audio(); el.loop=true; } buildGraph(); }
    function applyVol(){
      var target=muted?0:MUSIC_VOL;
      if(gain){ try{ gain.gain.value=target; }catch(e){} }
      try{ if(el) el.volume=target; }catch(e){}   /* desktop fallback; ignored on iOS */
    }
    function resumeCtx(){ try{ if(ctx&&ctx.state==='suspended') ctx.resume(); }catch(e){} }
    function loadRandom(){ var n; do{ n=Math.floor(Math.random()*MAP['music-game'].length); }while(MAP['music-game'].length>1&&n===idx); idx=n; el.src=url(MAP['music-game'][idx]); el.loop=true; resumeCtx(); el.play().catch(function(){}); }
    return {
      start:function(){ if(started)return; started=true; ensureEl(); applyVol(); loadRandom(); },
      next:function(){ if(started){ ensureEl(); loadRandom(); } },
      startTheme:function(id){ var t=(typeof CHAR_THEME!=="undefined")&&CHAR_THEME[id]; if(!t){ this.start(); return; } started=true; ensureEl(); applyVol(); el.src=url(t); el.loop=true; resumeCtx(); el.play().catch(function(){}); },
      setVol:function(){ applyVol(); },
      setMuted:function(m){ muted=m; applyVol(); if(el){ if(m){ try{ el.pause(); }catch(e){} } else if(started && !pausedByGame){ resumeCtx(); el.play().catch(function(){}); } } },
      pause:function(){ pausedByGame=true; if(el){ try{ el.pause(); }catch(e){} } },
      resume:function(){ pausedByGame=false; if(el && started && !muted){ resumeCtx(); el.play().catch(function(){}); } },
      resumeCtx:resumeCtx
    };
  })();
  var Sound={
    play:function(ev,vol){ var a=MAP[ev]; if(a&&a.length) sfx(pick(a),vol); },
    space:function(p){
      var seq=[]; if(p.shop) seq.push('select-shop'); if(p.craft) seq.push('select-craft');
      var i=0; (function n(){ if(i<seq.length){ Sound.play(seq[i++]); setTimeout(n,220); } })();
      if(p.special) setTimeout(function(){ Sound.play('select-special'); },140);
    },
    fromLog:function(text,type){
      if(muted||!text) return;
      /* event sounds now play on REVEAL (UI.showEventModal), not on resolve */
      if(type==='sr'){ if(/crafted|completed|finished/i.test(text)) return Sound.play('sr-craft'); return Sound.play('take-sr'); }
      if(type==='project') return Sound.play('finish-project');
      if(/^Chose /i.test(text)){ var l=text.toLowerCase(); return Sound.space({shop:/shop/.test(l),craft:/craft/.test(l),special:/any color|take 3|take 5|make two|make 2|exchange/.test(l)}); }
      if(/^Shopped/i.test(text)) return Sound.play('shop');
      if(/^Exchanged/i.test(text)) return Sound.play('exchange');
      if(/Learned Pattern/i.test(text)) return Sound.play('learn-pattern');
      if(/^Frogged/i.test(text)) return Sound.play('frog-it');
    },
    music:music,
    setMusicVol:function(v){ MUSIC_VOL=v; music.setVol(); _saveVol(); },
    setSfxVol:function(v){ SFX_VOL=v; setSfxGain(); _saveVol(); },
    getMusicVol:function(){ return MUSIC_VOL; },
    getSfxVol:function(){ return SFX_VOL; },
    toggleMute:function(){ muted=!muted; music.setMuted(muted); _saveVol(); updateMuteUI(); return muted; },
    isMuted:function(){ return muted; }
  };
  function updateMuteUI(){ var b=document.getElementById('navMuteBtn'); if(!b)return; b.classList.toggle('nm-muted',muted); var l=b.querySelector('.nm-mute-label'); if(l){ l.textContent=(muted?'Sound Off':'Sound On'); } else { b.innerHTML=(muted?'🔇 Sound: Off':'🔊 Sound: On'); } }
  // Session 38b: BROAD UI press-feedback — a subtle tick on every interactive element.
  var INTERACTIVE='button,a,input,select,label,[onclick],[role="button"],.btn,.bazaar-slot,.nav-menu-item,.nav-menu-btn,.player-strip-card,[class*="slot"],[class*="token"],[class*="card"],[class*="tile"],[class*="space"],[class*="chip"],[class*="btn"]';
  var _lastTick=0;
  var AB_MAP=[['onTakeYarn','ab-take-yarn'],['showExchangeModal','ab-exchange'],['showLearnPatternModal','ab-learn'],['showFrogItModal','ab-frog'],['showFinishProjectModal','ab-finish'],['onEndActions','ab-end-actions'],['onEndRestockTurn','ab-end-turn'],['onSkipRestock','ab-skip-restock'],['onRestock','ab-restock'],['onEndFinalCraft','ab-done']];
  document.addEventListener('pointerdown',function(e){
    try{ if(music&&music.resumeCtx) music.resumeCtx(); }catch(_e){}
    if(muted) return;
    var t=e.target.closest && e.target.closest(INTERACTIVE);
    if(!t) return;
    var now=Date.now(); if(now-_lastTick<55) return; _lastTick=now;
    var cls=((t.className&&t.className.toString)?t.className.toString():'')+' '+((t.getAttribute&&t.getAttribute('onclick'))||'');
    for(var _ai=0;_ai<AB_MAP.length;_ai++){ if(cls.indexOf(AB_MAP[_ai][0])>=0){ Sound.play(AB_MAP[_ai][1]); return; } }
    var txt=(t.textContent||'').trim().slice(0,24).toLowerCase();
    var ev='select';
    if(/cb-toggle|aria-pressed|equip|unequip|toggle/i.test(cls)) ev='toggle';
    else if(/close|cancel|back|exit|skip|\u2715|\u00d7/i.test(cls+' '+txt)) ev='cancel';
    else if(/btn-primary|btn-cta|primary/i.test(cls)) ev='confirm';
    else if(/(^| )btn( |$)|nav-menu/i.test(cls) || t.tagName==='BUTTON') ev='btn';
    Sound.play(ev, 0.5);
  }, true);
  function watchModals(){
    var nodes; try{ nodes=document.querySelectorAll('[id$="Modal"],[class*="-modal"],[class*="modal-"],.opponent-panel,.history-panel,.event-modal,.modal'); }catch(e){ return; }
    nodes.forEach(function(el){
      if(el.__sndObs) return; el.__sndObs=true;
      var was=getComputedStyle(el).display!=='none';
      new MutationObserver(function(){
        if(muted) return;
        var now=getComputedStyle(el).display!=='none';
        if(now&&!was) Sound.play('open-modal',0.5);
        else if(!now&&was) Sound.play('close-modal',0.5);
        was=now;
      }).observe(el,{attributes:true,attributeFilter:['style','class']});
    });
  }
  document.addEventListener('DOMContentLoaded',function(){
    var m=document.getElementById('navMuteBtn'); if(m) m.onclick=function(){ Sound.toggleMute(); };
    var nx=document.getElementById('navNextTrack'); if(nx) nx.onclick=function(){ Sound.music.next(); };
    var vm=document.getElementById('volMusic'); if(vm){ vm.value=Math.round(MUSIC_VOL*100); vm.oninput=function(){ Sound.setMusicVol(this.value/100); }; }
    var vs=document.getElementById('volSfx'); if(vs){ vs.value=Math.round(SFX_VOL*100); vs.oninput=function(){ Sound.setSfxVol(this.value/100); Sound.play('select',1); }; }
    updateMuteUI();
    watchModals(); setInterval(watchModals, 2500);
  });
  window.Sound=Sound;
})();
