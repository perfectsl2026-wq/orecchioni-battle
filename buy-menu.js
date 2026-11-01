// Buy menu in the Counter-Strike shape: five categories down the left, the items of
// the open category on the right, numbers on both. Opens with B inside the buy zone
// while the buy window is open; digits 1–5 pick a category, then 1–4 buy an item,
// 0 or Backspace go back, B or ESC close, INVIO marks you ready. Click works too.
// Items bought this round show VENDI: a click refunds them while the window is open.
// The menu only sends requests: the host validates every purchase and refund.
// V33: outside a buy window (deathmatch, free visit, closed window) B opens the same
// panel as ARSENALE: every weapon, grenade and gear with its numbers, nothing for
// sale; in modes where every weapon is issued, a click takes it in hand.
import {CATEGORIES,buyIssue,sellIssue,priceFor,canBuyNow,buyWindowLeft,sideOf,grenadeCount,ECONOMY,economyOn} from './economy.js?v=41.0';
import {weaponIcon} from './kill-feed.js?v=41.0';
import {WEAPONS} from './shared.js?v=41.0';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS={
 vest:'<svg viewBox="0 0 52 25" class="weapon-icon" aria-hidden="true"><path fill="currentColor" d="M18 2h5l3 3 3-3h5l6 5-3 6-3-1v11H18V12l-3 1-3-6z"/></svg>',
 helmet:'<svg viewBox="0 0 52 25" class="weapon-icon" aria-hidden="true"><path fill="currentColor" d="M14 17c0-8 5-14 12-14s12 6 12 14h3v3H11v-3zm6-2h12v-2H20z"/></svg>',
 kit:'<svg viewBox="0 0 52 25" class="weapon-icon" aria-hidden="true"><path fill="currentColor" d="M16 6h20v15H16zm8-3h4v3h-4zm-5 7h14v2H19zm0 4h9v2h-9zm14-1 4 1-1 4-4-1z"/></svg>',
 flash:'<svg viewBox="0 0 52 25" class="weapon-icon" aria-hidden="true"><path fill="currentColor" d="M22 6h8v3h2v13H20V9h2zm1-4h6v3h-6zm7 0 6-1v2l-6 1z"/></svg>',
 smoke:'<svg viewBox="0 0 52 25" class="weapon-icon" aria-hidden="true"><path fill="currentColor" d="M21 7h10v15H21zm1-5h8v4h-8zm9 1 5-1v2l-5 1zM23 11h6v2h-6z"/></svg>',
 he:'<svg viewBox="0 0 52 25" class="weapon-icon" aria-hidden="true"><path fill="currentColor" d="M26 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16m-3-3h6v3h-6zm7 0 5-1v2l-5 1zM22 10h8v2h-8zm0 3h8v2h-8z"/></svg>',
 fire:'<svg viewBox="0 0 52 25" class="weapon-icon" aria-hidden="true"><path fill="currentColor" d="M20 21c-4-3-5-8-2-12 0 3 2 4 3 4-1-4 1-8 5-10-1 4 1 6 3 7 1-2 1-4 0-6 4 3 6 8 4 12-1 3-4 5-7 5s-5-1-6 0z"/></svg>'
};
const REASONS={owned:'IN DOTAZIONE',full:'AL MASSIMO',slots:'4 GRANATE AL MASSIMO',money:'CREDITI INSUFFICIENTI',closed:'ACQUISTI CHIUSI',zone:'FUORI DALLA ZONA',side:'',dead:'—'};
// Numbers shown in the ARSENALE view, as the Officina shows them.
export const weaponFacts=index=>{const w=WEAPONS[index];return w.melee?'FENDENTE 35 · STOCCATA 65 · ALLE SPALLE 140':'DANNO '+w.damage+' · '+Math.round(60/w.rate)+' COLPI/MIN · '+w.mag+' COLPI · '+w.range+' M';};
const bars=index=>{const w=WEAPONS[index];if(w.melee)return '';const v=[['DANNO',w.damage/100],['CADENZA',(60/w.rate)/850],['CARICATORE',w.mag/30]];return '<span class="buy-bars">'+v.map(([k,x])=>'<i title="'+k+'" style="--v:'+Math.min(100,Math.round(x*100))+'%"></i>').join('')+'</span>';};
export class BuyMenu{
 constructor({onBuy,onSell,onReady,onOpen,onClose,stayOnExpiry=()=>false,canEquip=()=>false,onEquip=()=>{},heldWeapon=()=>-1,utilityOn=()=>true,nameOf=i=>WEAPONS[i].name}){
  this.el=document.getElementById('buymenu');this.active=false;this.view=false;this.category=2;Object.assign(this,{onBuy,onSell,onReady,onOpen,onClose,stayOnExpiry,canEquip,onEquip,heldWeapon,utilityOn,nameOf});
  const cats=document.getElementById('buycats');
  CATEGORIES.forEach((c,n)=>{const b=document.createElement('button');b.type='button';b.dataset.category=n;b.innerHTML='<kbd>'+(n+1)+'</kbd><b>'+esc(c.label)+'</b><small></small>';b.onclick=()=>this.show(n);cats.append(b);});
  this.grid=document.getElementById('buygrid');this.footerText=this.el.querySelector('footer>span').textContent;
  document.getElementById('buyready').onclick=()=>this.onReady();document.getElementById('buyclose').onclick=()=>this.close();document.getElementById('buyback').onclick=()=>this.show(-1);
  window.addEventListener('keydown',e=>{if(!this.active)return;
   if(/^Digit[1-9]$/.test(e.code)){e.preventDefault();e.stopImmediatePropagation();const n=Number(e.code.at(-1))-1;if(this.category<0){if(n<CATEGORIES.length)this.show(n);}else{const item=CATEGORIES[this.category].items[n];if(item)this.act(item);}return;}
   if(e.code==='Digit0'||e.code==='Backspace'){e.preventDefault();e.stopImmediatePropagation();this.show(-1);return;}
   if(e.code==='KeyB'||e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();return;}
   if(e.code==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(this.view)this.close();else this.onReady();}},true);
 }
 // Buy when the item can be bought; otherwise refund it if it was bought this round.
 // In the ARSENALE view a weapon that is issued in this mode is taken in hand instead.
 act(item){if(!this.state||!this.player)return;
  if(this.view){if(item.kind==='weapon'&&this.canEquip(item.weapon)){this.onEquip(item.weapon);this.close('equip');}return;}
  if(!buyIssue(this.state,this.player,item,this.now))this.onBuy(item.id);else if(!sellIssue(this.state,this.player,item,this.now))this.onSell(item.id);}
 show(n){this.gridSig=null;this.category=n;this.el.classList.toggle('in-category',n>=0);for(const b of document.getElementById('buycats').children)b.setAttribute('aria-current',String(Number(b.dataset.category)===n));this.render(this.state,this.player,this.now,this.teamName);}
 // V38.2: opening takes the live match, so the first render cannot judge the buy window on
 // what the previous opening left behind (an old round, a dead player) and close at once.
 setView(view,footer='1–5 CATEGORIA · 1–4 PRENDI IN MANO · 0 INDIETRO · B O ESC CHIUDE'){this.view=view;this.gridSig=null;this.el.classList.toggle('view',view);
  document.getElementById('buytitle').textContent=view?'ARSENALE':'ACQUISTI';document.getElementById('buyready').hidden=view;document.getElementById('buyteam').hidden=view;
  this.el.querySelector('footer>span').textContent=view?footer:this.footerText;}
 open(view=false,state=this.state,player=this.player,now=this.now,teamName=this.teamName){if(this.active)return;this.active=true;Object.assign(this,{state,player,now,teamName});this.setView(view);this.el.hidden=false;
  this.show(2);this.onOpen?.();}
 close(reason='user'){if(!this.active)return;this.active=false;this.el.hidden=true;this.el.classList.remove('view');this.onClose?.(reason);}
 toggle(view=false){if(this.active)this.close();else this.open(view);}
 render(state,p,now,teamName){
  if(!this.active||!p)return;this.state=state;this.player=p;this.now=now;this.teamName=teamName;
  if(this.view)return this.renderView(state,p);
  if(!canBuyNow(state,p,now)||p.hp<=0){if(!state.ended&&this.stayOnExpiry()){this.setView(true,'ACQUISTI CHIUSI · 1–4 PRENDI IN MANO · B O ESC TORNA IN CAMPO');this.show(this.category);}else this.close('timeout');return;}
  const side=sideOf(state,p);
  document.getElementById('buymoney').textContent=(p.money||0).toLocaleString('it-IT');
  document.getElementById('buytime').textContent=Math.max(0,Math.ceil(buyWindowLeft(state,now)/1000));
  document.getElementById('buyround').textContent='ROUND '+state.round+' · '+(side==='attack'?'ATTACCO':'DIFESA')+' · '+(state.phase==='freeze'?'FASE D’ACQUISTO':'ZONA D’ACQUISTO');
  for(const b of document.getElementById('buycats').children){const c=CATEGORIES[Number(b.dataset.category)];const owned=c.items.filter(i=>buyIssue(state,p,i,now)==='owned'||i.kind==='utility'&&p[i.field]>0).length;b.querySelector('small').textContent=c.id==='grenades'?grenadeCount(p)+' / '+ECONOMY.grenadeSlots:owned?'IN DOTAZIONE':'';}
  const cat=CATEGORIES[this.category<0?2:this.category];
  // V36: the grid is rebuilt only when an item's state changes. Rebuilding it on every HUD
  // tick replaced the buttons under the pointer, so a real click (press, then release on the
  // same element) often landed on a node that no longer existed and did nothing.
  const sig=this.category+'|'+cat.items.map(item=>{const issue=buyIssue(state,p,item,now);return item.id+':'+issue+':'+(!!issue&&!sellIssue(state,p,item,now))+':'+(item.kind==='utility'?(p[item.field]||0):0)+':'+priceFor(p,item)+':'+(p.spent?.[item.id]??'');}).join(',');
  if(this.gridSig!==sig){this.gridSig=sig;
  this.grid.replaceChildren(...cat.items.map((item,n)=>{const b=document.createElement('button');b.type='button';b.dataset.item=item.id;
   const issue=buyIssue(state,p,item,now),sellable=!!issue&&!sellIssue(state,p,item,now),name=item.kind==='weapon'?WEAPONS[item.weapon].name:item.label,sideNote=item.side?' · solo '+(item.side==='attack'?'attacco':'difesa'):'',detail=(item.kind==='weapon'?WEAPONS[item.weapon].label:item.detail)+sideNote;
   const count=item.kind==='utility'?(p[item.field]||0):0;
   b.className='buy-item '+item.kind+(issue==='owned'||issue==='full'?' owned':'')+(issue==='money'?' poor':'')+(issue==='side'?' side':'')+(sellable?' sellable':'');
   b.innerHTML='<kbd>'+(n+1)+'</kbd>'+(item.kind==='weapon'?weaponIcon(item.weapon):ICONS[item.id])+'<b>'+esc(name)+(count?' <i>×'+count+'</i>':'')+'</b><small>'+esc(detail)+'</small><span class="price">'+(item.issued?'—':priceFor(p,item).toLocaleString('it-IT'))+'</span><em class="why">'+(issue==='side'?'NON PER IL TUO LATO':sellable?'VENDI · +'+(p.spent?.[item.id]??item.price):REASONS[issue]||'')+'</em>';
   b.disabled=!!issue&&!sellable;b.onclick=()=>this.act(item);return b;}));}
  const mates=Object.values(state.players).filter(v=>v.team===p.team).sort((a,b)=>(b.money||0)-(a.money||0));
  document.getElementById('buyteam').innerHTML='<small>'+esc(teamName)+' · CREDITI DELLA SQUADRA</small>'+mates.map(v=>'<span class="'+(v.id===p.id?'me':'')+'">'+(Number.isInteger(v.primary)?weaponIcon(v.primary):'<i class="none"></i>')+'<b>'+esc(v.name)+'</b><em>'+(v.money||0).toLocaleString('it-IT')+'</em>'+(v.kit?'<u>KIT</u>':'')+'</span>').join('');
  document.getElementById('buyready').textContent=p.buyReady===state.round?'PRONTO ✓':'PRONTO ↗';
 }
 // ARSENALE: the same categories with facts instead of prices. Nothing is bought here.
 renderView(state,p){
  const economy=economyOn(state),held=this.heldWeapon(),utility=this.utilityOn(),mode=state.preview?'VISITA LIBERA':state.mode==='deathmatch'?'DEATHMATCH':state.mode==='corsa'?'CORSA ALLE ARMI':'COMPETITIVO';
  document.getElementById('buymoney').textContent=economy?(p.money||0).toLocaleString('it-IT'):'—';
  document.getElementById('buytime').textContent=economy?Math.max(0,Math.ceil(buyWindowLeft(state,this.now)/1000)):'—';
  document.getElementById('buyround').textContent=mode+' · '+(economy?'ACQUISTI CHIUSI · SOLO CONSULTAZIONE':'TUTTO IN DOTAZIONE · SCEGLI COSA IMBRACCIARE');
  for(const b of document.getElementById('buycats').children){const c=CATEGORIES[Number(b.dataset.category)];const have=c.items.filter(i=>i.kind==='weapon'?this.canEquip(i.weapon)||i.weapon===held:i.kind==='utility'?p[i.field]>0:i.id==='kit'?p.kit:(p.armor||0)>0).length;b.querySelector('small').textContent=c.id==='grenades'?(utility?grenadeCount(p)+' / '+ECONOMY.grenadeSlots:'NON SU QUESTA MAPPA'):have?(c.items.length>1&&have===c.items.length?'TUTTE IN DOTAZIONE':'IN DOTAZIONE'):'';}
  const cat=CATEGORIES[this.category<0?2:this.category];
  const sig='view|'+this.category+'|'+held+'|'+economy+'|'+cat.items.map(item=>item.id+':'+(item.kind==='weapon'?this.canEquip(item.weapon):item.kind==='utility'?(p[item.field]||0):item.id==='kit'?!!p.kit:(p.armor||0)+':'+!!p.helmet)).join(',');
  if(this.gridSig===sig)return;this.gridSig=sig;
  this.grid.replaceChildren(...cat.items.map((item,n)=>{const b=document.createElement('button');b.type='button';b.dataset.item=item.id;
   let status='',cls='',usable=false;
   if(item.kind==='weapon'){const inHand=item.weapon===held;usable=this.canEquip(item.weapon)&&!inHand;status=inHand?'IN MANO':usable?'PRENDI IN MANO':economy?(p.primary===item.weapon?'IN DOTAZIONE':'IN VENDITA NELLA FASE D’ACQUISTO'):'NON IN QUESTA MODALITÀ';cls=inHand?' owned':usable?'':' side';}
   else if(item.kind==='utility'){const have=p[item.field]||0;status=!utility?'NON SU QUESTA MAPPA':have?'×'+have+' IN TASCA':economy?'IN VENDITA NELLA FASE D’ACQUISTO':'NON IN DOTAZIONE';cls=have?' owned':' side';}
   else{const have=item.id==='kit'?!!p.kit:item.id==='helmet'?(p.armor||0)>0&&!!p.helmet:(p.armor||0)>0;status=have?'INDOSSATO':economy?'IN VENDITA NELLA FASE D’ACQUISTO':'NON IN QUESTA MODALITÀ';cls=have?' owned':' side';}
   const name=item.kind==='weapon'?this.nameOf(item.weapon):item.label,detail=item.kind==='weapon'?weaponFacts(item.weapon):item.detail+(item.side?' · solo '+(item.side==='attack'?'attacco':'difesa'):'');
   b.className='buy-item '+item.kind+cls;
   b.innerHTML='<kbd>'+(n+1)+'</kbd>'+(item.kind==='weapon'?weaponIcon(item.weapon):ICONS[item.id])+'<b>'+esc(name)+'</b><small>'+esc(detail)+'</small>'+(item.kind==='weapon'?bars(item.weapon):'<span class="price">'+(economy?priceFor(p,item).toLocaleString('it-IT'):'—')+'</span>')+'<em class="why">'+status+'</em>';
   b.disabled=!usable;b.onclick=()=>this.act(item);return b;}));
 }
}
