// V42 site layer: loading, lobby, invite, settings and pause helpers that sit beside game.js.
// It only reads and writes interface elements; match state stays with game.js.
const $=id=>document.getElementById(id),root=document.documentElement,params=new URLSearchParams(location.search);
const MAPS={sahra:'SAHRA',caldera:'CALDERA',forge:'FORGE'},mapKey=MAPS[params.get('map')]?params.get('map'):'sahra';
const watch=(el,fn,opts={attributes:true,attributeFilter:['hidden']})=>{if(el)new MutationObserver(fn).observe(el,opts);};
const isTouch=()=>root.classList.contains('touch-mode');

// Loading: the map being prepared and one short tip every few seconds, stopped as soon as the lobby shows.
const TIPS=['Frena prima di sparare: da fermo il primo colpo va dove miri.','Raffiche brevi: il rinculo si ricompone in un attimo.','Con le cuffie senti da dove arrivano passi e ricariche.','Il fumogeno blocca la vista anche ai bot: usalo per attraversare.','Accovacciato o camminando con SHIFT i tuoi passi non si sentono.','Nella fase d’acquisto premi B: armi, giubbotto e granate.','In Officina scegli finiture e operatore: non cambiano danni né rinculo.','Due uccisioni nella Corsa alle armi e passi all’arma successiva.'];
{const map=$('loadingmap'),tip=$('loadingtip'),loading=$('loading');if(map)map.textContent='PREPARAZIONE '+MAPS[mapKey];
 let n=Math.floor(Math.random()*TIPS.length),timer=0;const show=()=>{if(!tip)return;tip.classList.remove('in');void tip.offsetWidth;tip.textContent=TIPS[n++%TIPS.length];tip.classList.add('in');};
 const sync=()=>{clearInterval(timer);timer=0;if(!loading.hidden){show();timer=setInterval(show,4200);}};sync();watch(loading,sync);}

// Invite links: a friend lands on a join card instead of the full lobby; a failed join restores everything.
const invited=(params.get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
if(invited){root.classList.add('invited');$('invitecard').hidden=false;$('invitecode').textContent=invited;$('invitemap').textContent=MAPS[mapKey]?'mappa '+MAPS[mapKey]:'mappa scelta dall’host';
 $('invitemore').onclick=()=>{root.classList.remove('invited');$('invitecard').hidden=true;};}
const FRIENDLY=[[/non trovata|not.?found|unavailable-id|peer-unavailable/i,'Questa stanza non esiste più. Chiedi al tuo amico un nuovo link.'],[/piena|full/i,'La stanza è piena. Chiedi all’host di liberare un posto.'],[/versione/i,'Tu e l’host usate versioni diverse: ricaricate entrambi la pagina.'],[/codice/i,'Scrivi il codice della stanza, sei lettere o numeri.'],[/rete|network|signal|collegamento|connessione|server/i,'Connessione non riuscita. Controlla la rete e riprova.']];
{let joining=false;const err=$('joinerror'),join=$('join'),status=$('status');
 const say=t=>{err.textContent=t;err.hidden=!t;if(t)requestAnimationFrame(()=>err.scrollIntoView({block:'nearest',behavior:'smooth'}));};
 const report=()=>{if($('menu').hidden)return;const raw=status.textContent;say((FRIENDLY.find(([r])=>r.test(raw))||[0,raw||'Ingresso non riuscito. Riprova tra poco.'])[1]);if(root.classList.contains('invited')){root.classList.remove('invited');$('invitecard').hidden=true;}};
 join.addEventListener('click',()=>{joining=true;say('');setTimeout(()=>{if(joining&&!join.disabled){joining=false;report();}},60);},true);
 $('room').addEventListener('input',()=>say(''));
 watch(join,()=>{if(!joining||join.disabled)return;joining=false;report();},{attributes:true,attributeFilter:['disabled']});
 watch($('menu'),()=>{if($('menu').hidden){joining=false;say('');}});}

// One default name per browser, so two friends are not both "Operatore".
{const name=$('name'),stored=()=>{try{return localStorage.getItem('ob-name');}catch{return 'x';}};
 const fix=()=>{if(name.value==='Operatore'&&!stored()){name.value='Operatore-'+String(Math.floor(100+Math.random()*900));try{localStorage.setItem('ob-name',name.value);}catch{}}};
 const loading=$('loading');if(loading.hidden)fix();else watch(loading,()=>{if(loading.hidden){fix();if(invited&&matchMedia('(hover:hover) and (pointer:fine)').matches)name.focus({preventScroll:true});}});}

// In a live match (HUD up, no overlay): portrait gate on phones, screen kept awake, live board toggle.
let wake=null;
const syncMatch=()=>{const board=$('board'),live=!$('hud').hidden&&$('menu').hidden&&$('pause').hidden&&(board.hidden||board.classList.contains('live'));const gate=$('rotategate');if(gate.hasAttribute('data-live')!==live)gate.toggleAttribute('data-live',live);
 if(live&&isTouch()&&!wake&&navigator.wakeLock)navigator.wakeLock.request('screen').then(w=>{wake=w;w.addEventListener('release',()=>{wake=null;});}).catch(()=>{});
 if(!live&&$('hud').hidden&&wake){wake.release().catch(()=>{});wake=null;}};
for(const id of ['hud','menu','pause','board'])watch($(id),syncMatch,{attributes:true,attributeFilter:['hidden','class']});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncMatch();});
{const board=$('board'),open=()=>{board.classList.add('manual');board.hidden=false;$('boardx').focus({preventScroll:true});},close=()=>{const manual=board.classList.contains('manual');board.classList.remove('manual');if(manual||board.classList.contains('live'))board.hidden=true;if(manual&&!$('pause').hidden)$('pausescore').focus({preventScroll:true});};
  $('boardx').onclick=close;watch(board,()=>{if(board.hidden)board.classList.remove('manual');});
  // Esc on a board opened from pause goes back to pause instead of resuming the match.
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!board.hidden&&board.classList.contains('manual')){e.preventDefault();e.stopImmediatePropagation();close();}},true);
 $('touchscore').onclick=()=>board.hidden?open():close();$('pausescore').onclick=open;$('boardclose').onclick=close;
 board.addEventListener('click',e=>{if(isTouch()&&!e.target.closest('button,a'))close();});}

// Buy hint on phones: the buy-window countdown moves into the ACQUISTI button; pickups and Corsa keep the hint.
{const hint=$('buyhint'),buy=$('touchbuy');let last='';
 watch(hint,()=>{if(!isTouch())return;const t=hint.textContent;if(t===last)return;last=t;const window=/ACQUISTO/.test(t),sec=window&&t.match(/(\d+)\s*s\s*$/);hint.dataset.kind=window?'buy':/RACCOGLI/.test(t)?'pickup':'info';if(sec)buy.dataset.left=sec[1];else delete buy.dataset.left;},{childList:true,characterData:true,subtree:true});}

// Pause: invite block for online rooms, with the system share sheet on phones and the clipboard on computers.
{const pause=$('pause'),box=$('pauseinvite'),btn=$('pi-share');let url='';
 const sync=()=>{if(pause.hidden)return;const tag=$('roomtag').textContent.split('/').pop().trim(),code=/^[A-Z0-9]{4,8}$/.test(tag)&&new URLSearchParams(location.search).get('room')===tag?tag:'';box.hidden=!code||$('copy').hidden;if(box.hidden)return;
  const map=new URLSearchParams(location.search).get('map')||mapKey;url=location.origin+location.pathname+'?room='+code+'&map='+encodeURIComponent(map);$('pi-code').textContent=code;};
 watch(pause,sync);
 btn.onclick=async()=>{const label=btn.innerHTML,done=t=>{btn.textContent=t;setTimeout(()=>{btn.innerHTML=label;},2200);};
  if(isTouch()&&navigator.share){try{await navigator.share({title:'ORECCHIONI BATTLE',text:'Entra nella mia stanza',url});return;}catch(e){if(e?.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(url);done('LINK COPIATO ✓');}catch{prompt('Copia questo invito:',url);}};}

// Graphics: three named levels instead of a cycling label. The header button stays the single source of truth.
{const q=$('quality'),LEVELS=[['realistic','ALTA','Ombre ed effetti completi'],['sharp','MEDIA','Ombre, senza effetti'],['flat','VELOCE','Massima fluidità']],LABEL={realistic:'REALISTICA',sharp:'NITIDA',flat:'NO OMBRE'};
 const current=()=>{const t=q.textContent;return t.includes(LABEL.flat)?'flat':t.includes(LABEL.realistic)?'realistic':t.includes(LABEL.sharp)?'sharp':'';};
 const rows=[...document.querySelectorAll('[data-quality-row]')];
 for(const row of rows){row.setAttribute('aria-label','Qualità grafica');if(!row.previousElementSibling?.classList.contains('qlabel'))row.insertAdjacentHTML('beforebegin','<div class="qlabel">QUALITÀ GRAFICA <span>cambia solo l\u2019aspetto, non il gioco</span></div>');}
 for(const row of rows)row.innerHTML=LEVELS.map(([k,t,d])=>'<button type="button" role="radio" aria-checked="false" data-q="'+k+'"><b>'+t+'</b><small>'+d+'</small></button>').join('');
 const sync=()=>{const c=current();for(const b of document.querySelectorAll('[data-q]')){b.setAttribute('aria-checked',String(b.dataset.q===c));b.disabled=q.disabled;}};
 for(const b of document.querySelectorAll('[data-q]'))b.onclick=()=>{for(let i=0;i<3&&current()!==b.dataset.q&&!q.disabled;i++)q.click();sync();};
 watch(q,sync,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['disabled']});sync();}

// Settings: section tabs scroll the card and follow the reading position.
{const card=document.querySelector('#controls .controls-card'),tabs=[...document.querySelectorAll('.ctabs [data-go]')];
 const mark=id=>{for(const t of tabs)t.setAttribute('aria-current',String(t.dataset.go===id));};
 const headOver=s=>{const h=card.querySelector('.controls-top');return h.getBoundingClientRect().right<=s.getBoundingClientRect().left+1?0:h.offsetHeight;};// a phone held sideways keeps the tabs in a side column, not above the sections
 for(const t of tabs)t.onclick=()=>{const s=$(t.dataset.go);card.scrollTo({top:s.offsetTop-headOver(s)-8,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});mark(t.dataset.go);};
 let raf=0;card.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const top=card.scrollTop+headOver($(tabs[0].dataset.go))+40;let id=tabs[0].dataset.go;for(const t of tabs)if($(t.dataset.go).offsetTop<=top)id=t.dataset.go;if(card.scrollTop+card.clientHeight>=card.scrollHeight-2)id=tabs.at(-1).dataset.go;mark(id);});},{passive:true});}

// Result screen: colour the headline by outcome.
{const title=$('resulttitle');watch(title,()=>{const t=title.textContent;$('board').dataset.outcome=/VITTORIA|PRIMO AL TRAGUARDO/i.test(t)?'win':/SCONFITTA|VINCE\./i.test(t)?'loss':/PAREGGIO/i.test(t)?'draw':'';},{childList:true,characterData:true,subtree:true});}
// Keyboard: when the pause or ready card opens, its main button takes focus, so Enter goes back in.
{const pause=$('pause');watch(pause,()=>{if(pause.hidden||isTouch())return;const a=document.activeElement;if(a&&a!==document.body&&pause.contains(a))return;const b=[$('resume'),$('reconnect')].find(e=>e&&!e.hidden);b?.focus({preventScroll:true});});}

// Tactical map: opens in a dialog over the lobby instead of a new page.
{const link=$('mapoverview'),dialog=$('mapdialog');
  if(link&&dialog?.showModal){const img=dialog.querySelector('img'),warm=()=>{img.loading='eager';};link.addEventListener('pointerenter',warm,{once:true,passive:true});link.addEventListener('focus',warm,{once:true});
    link.addEventListener('click',e=>{e.preventDefault();warm();dialog.showModal();});
    dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-close]'))dialog.close();});
    dialog.addEventListener('close',()=>link.focus({preventScroll:true}));}}

// Credits live as a small link inside Impostazioni: close the settings card first so the credits panel shows on top.
document.addEventListener('click',e=>{if(e.target.closest?.('.creditslink')&&!$('controls').hidden)$('controls-close').click();},true);
