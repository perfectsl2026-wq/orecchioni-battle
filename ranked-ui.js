import {RANKED,division,rankFromCode} from './ranked-rules.js?v=42.0';
// V50 CLASSIFICATA: the ranked card in the lobby, the badge and the verdict shown after a match.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const points=n=>Number(n).toLocaleString('it-IT'),clock=ms=>{const s=Math.max(0,Math.round(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
// A cut stone: one facet shape for every division, its colour and one notch per step.
export function rankBadge(code,size=44){
 const r=rankFromCode(code),c=r.color,pips=r.placed&&r.index<7?Array.from({length:r.step+1},(_,n)=>'<rect x="'+(24-(r.step+1)*3.5+n*7+1)+'" y="38.5" width="5" height="2.4" fill="'+c+'"/>').join(''):'';
 return '<svg class="rk-badge" width="'+size+'" height="'+size+'" viewBox="0 0 48 48" aria-hidden="true"><path d="M 24 3 41 14v17L24 45 7 31V14z" fill="'+c+'" fill-opacity=".16" stroke="'+c+'" stroke-width="2" stroke-linejoin="round"/>'+
  (r.placed?'<path d="M 24 3v42M7 14l17 9 17-9M7 31l17-8 17 8" fill="none" stroke="'+c+'" stroke-opacity=".55" stroke-width="1.2"/><path d="M 24 12 33 18v9l-9 7-9-7v-9z" fill="'+c+'" fill-opacity="'+(.3+r.index*.09).toFixed(2)+'"/>':'<path d="M19.5 19a4.6 4.6 0 1 1 6.6 4.1c-1.3.7-2.1 1.5-2.1 3.2M 24 30.6v.4" fill="none" stroke="'+c+'" stroke-width="2.4" stroke-linecap="round"/>')+pips+'</svg>';
}
export const rankChip=code=>{const r=rankFromCode(code);return '<i class="rk-chip" style="--rk:'+r.color+'" title="'+esc(r.label)+'">'+(r.placed?esc(r.name.slice(0,3))+(r.index<7?' '+['I','II','III'][r.step]:''):'—')+'</i>';};
function profileHTML(p){
 if(!p)return '<div class="rk-head">'+rankBadge(-1,56)+'<div><small>IL TUO GRADO</small><b>IN VALUTAZIONE</b><span>Cinque partite per ricevere il primo grado.</span></div></div>';
 const placed=p.placement<=0,d=division(p.rating);
 return '<div class="rk-head">'+rankBadge(p.rank,56)+'<div><small>IL TUO GRADO</small><b style="color:'+(placed?d.color:'inherit')+'">'+(placed?d.label:'IN VALUTAZIONE')+'</b><span>'+(placed?points(p.rating)+' punti · ':'')+p.wins+' vinte / '+p.losses+' perse</span></div></div>'+
  (placed?'<div class="rk-bar"><i style="width:'+Math.round(d.progress*100)+'%;background:'+d.color+'"></i></div><small class="rk-next">'+(d.top?'Grado massimo':points(d.next-p.rating)+' punti al prossimo gradino')+'</small>':'<div class="rk-bar steps">'+Array.from({length:RANKED.placement},(_,n)=>'<i class="'+(n<p.matches?'done':'')+'"></i>').join('')+'</div><small class="rk-next">Partite di valutazione: '+Math.min(p.matches,RANKED.placement)+' di '+RANKED.placement+'</small>');
}
const FORMAT=size=>size+' CONTRO '+size;
// The card owns the search: it polls while searching, hands the ticket over and never starts a match itself.
export function createRankedCard({root,client,name,touch,ticker,onTicket,onNotice=()=>{}}){
 root.innerHTML='<div class="rk-profile"></div><p class="rk-rules">Bomba con acquisti e crediti. Squadre, mappa e formato li sceglie il servizio: <b>5 contro 5 su Sahra</b> con dieci giocatori in attesa, formati più piccoli su Caldera se l’attesa si allunga. Chi abbandona perde punti e resta fermo qualche minuto.</p><button id="rankedsearch" class="primary" type="button">CERCA PARTITA <span aria-hidden="true">↗</span></button><p id="rankedstatus" class="rk-status" role="status"></p><div class="rk-resume" hidden><button id="rankedresume" class="primary" type="button">RIENTRA IN PARTITA <span aria-hidden="true">↗</span></button><button id="rankedquit" class="quiet" type="button">ABBANDONA · PERDI PUNTI</button></div><div class="rk-top" hidden><h3>I PRIMI DELLA STAGIONE</h3><ol></ol></div>';
 const el=s=>root.querySelector(s),button=el('#rankedsearch'),status=el('#rankedstatus'),resume=el('.rk-resume');
 let mode='idle',stop=null,busy=false,lastPoll=0,since=0,pending=null,shown=false,title='';
 const say=t=>{status.textContent=t;};
 const paint=()=>{el('.rk-profile').innerHTML=profileHTML(client.profile);button.hidden=mode==='resume';resume.hidden=mode!=='resume';button.disabled=!client.enabled||mode==='starting';button.firstChild.textContent=mode==='searching'?'ANNULLA RICERCA ':'CERCA PARTITA ';button.classList.toggle('searching',mode==='searching');root.dataset.mode=mode;};
 const halt=()=>{stop?.();stop=null;if(title){document.title=title;title='';}};
 const fail=e=>{halt();mode='idle';paint();say(e?.status===0?'Servizio classificata non raggiungibile. Controlla la connessione e riprova.':e?.message||'Ricerca interrotta. Riprova.');};
 async function refresh(){
  if(!client.enabled){paint();say('La classificata apre insieme al servizio di gioco: su questa versione non è ancora attiva. Stanze con gli amici e allenamento funzionano come sempre.');return;}
  paint();
  try{
   const me=await client.me(name());paint();
   // A match left open by a reload or a crash: offer the seat before anything else.
   if(me.active&&mode==='idle'){const r=await client.poll({name:name(),touch:touch()});if(r.state==='match'&&mode==='idle'){mode='resume';pending=r.ticket;paint();say('Hai una partita classificata ancora aperta ('+FORMAT(r.ticket.size)+').');}else if(r.state==='waiting')client.leave();}
   else if(me.profile.bannedUntil&&mode==='idle')say('Hai lasciato una partita: potrai cercare di nuovo tra '+clock(me.profile.bannedUntil-Date.now())+'.');
  }catch(e){if(mode==='idle')say(e.status===0?'Servizio classificata non raggiungibile in questo momento.':e.message);}
  try{const top=(await client.top()).players;el('.rk-top').hidden=!top.length;el('.rk-top ol').innerHTML=top.slice(0,8).map(p=>'<li>'+rankChip(p.rank)+'<span>'+esc(p.name)+'</span><b>'+points(p.rating)+'</b></li>').join('');}catch{}
 }
 async function poll(){
  if(busy||mode!=='searching')return;const t=performance.now();if(t-lastPoll<2000)return;lastPoll=t;busy=true;
  try{
   const r=await client.poll({name:name(),touch:touch()});if(mode!=='searching')return;
   if(r.state==='waiting'){since||=Date.now()-(r.now-r.since);say('RICERCA IN CORSO · '+clock(Date.now()-since)+' · '+r.waiting+(r.waiting===1?' giocatore in attesa':' giocatori in attesa'));}
   else if(r.state==='banned'){halt();mode='idle';paint();say('Hai lasciato una partita: potrai cercare di nuovo tra '+clock(r.until-Date.now())+'.');}
   else if(r.state==='match'){
    halt();
    if(r.resume){mode='resume';pending=r.ticket;paint();say('Hai una partita classificata ancora aperta ('+FORMAT(r.ticket.size)+').');}
    else{mode='starting';paint();say('PARTITA TROVATA · '+FORMAT(r.ticket.size)+' · '+r.ticket.map.toUpperCase());onNotice('found');onTicket(r.ticket);}
   }
  }catch(e){fail(e);}finally{busy=false;}
 }
 function search(){if(mode==='searching'){halt();mode='idle';since=0;paint();say('Ricerca annullata.');client.leave();return;}
  mode='searching';since=0;lastPoll=0;title=document.title;document.title='● Ricerca partita · '+title;paint();say('RICERCA IN CORSO…');stop=ticker(poll,500);poll();}
 button.onclick=search;
 el('#rankedresume').onclick=()=>{if(!pending)return;mode='starting';paint();say('Rientro in partita…');onTicket(pending,true);};
 el('#rankedquit').onclick=async()=>{const t=pending;pending=null;mode='idle';paint();say('Partita abbandonata.');try{if(t)await client.report({match:t.id,quit:true});}catch{}refresh();};
 return {
  show(){shown=true;refresh();},
  hide(){shown=false;if(mode==='searching'){halt();mode='idle';since=0;client.leave();paint();say('');}},
  // Back from a match, or a start that did not go through.
  reset(message=''){halt();mode='idle';since=0;pending=null;paint();say(message);if(shown)refresh();},
  get searching(){return mode==='searching';},get mode(){return mode;},refresh
 };
}
// Verdict under the podium. `v` is the service's view of the match, or null while it is still being decided.
export function verdictHTML(v,before){
 if(!v||v.state==='open')return '<div class="rk-verdict wait"><small>CLASSIFICATA</small><b>VERDETTO IN ARRIVO…</b><span>Il risultato vale quando lo confermano i giocatori della partita.</span></div>';
 if(v.state==='offline')return '<div class="rk-verdict wait"><small>CLASSIFICATA</small><b>RISULTATO NON INVIATO</b><span>Servizio non raggiungibile: il verdetto comparirà nella scheda CLASSIFICATA.</span></div>';
 const p=v.profile,r=v.result||{delta:0},placed=p&&p.placement<=0,d=division(p?.rating??RANKED.start),was=before&&before.placement<=0?division(before.rating):null;
 const moved=placed&&was&&was.code!==d.code?(d.code>was.code?'PROMOSSO A ':'RETROCESSO A ')+d.label:placed&&!was?'PRIMO GRADO: '+d.label:'';
 const head=v.state==='void'?(r.leaver?'PARTITA ANNULLATA · ABBANDONO':'PARTITA ANNULLATA'):r.leaver?'ABBANDONO':r.delta>0?'VITTORIA CLASSIFICATA':'SCONFITTA CLASSIFICATA';
 return '<div class="rk-verdict '+(r.delta>0?'up':r.delta<0?'down':'flat')+'">'+rankBadge(p?p.rank:-1,52)+'<div><small>'+head+'</small><b>'+(r.delta>0?'+':'')+r.delta+' <em>punti</em></b><span>'+(moved||(placed?d.label+' · '+points(p.rating)+' punti':'Valutazione: '+Math.min(p?.matches??0,RANKED.placement)+' di '+RANKED.placement+' partite'))+(v.state==='void'&&!r.leaver?' · nessuno perde punti':'')+'</span></div></div>';
}
