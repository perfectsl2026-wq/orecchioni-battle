// Buy menu: five categories, numbers on both categories and items. B opens it inside the buy zone while the buy window
// is open; 0 or Backspace go back to the categories, then 1–5 pick one, 1–4 buy an item, B or ESC close, INVIO marks
// you ready. Click and touch work too. Items bought this round show VENDI: a click refunds them while the window is open.
// The menu only sends requests: the host validates every purchase and refund.
// V33: outside a buy window (deathmatch, free visit, closed window) B opens the same
// panel as ARSENALE: every weapon, grenade and gear with its numbers, nothing for
// sale; in modes where every weapon is issued, a click takes it in hand.
// V42 b5: one panel in the manner of the genre. On a wide screen every category is on view at once in three columns
// (pistols and SMGs, rifles, gear and grenades); on a phone, a tablet or a small laptop the categories stay down the left
// and one opens at a time. Each weapon card shows a design of its class (the one held, else the loadout's from
// Impostazioni › ARMI) with price, numbers and owned or in-hand state; every design of the class is listed under it with
// its price and numbers, and one click or tap on it buys it (or sells it back), as in the genre. ← → change the design
// the card's digit buys; nothing here changes the saved loadout. Every purchase is a request the host checks (economy.js).
// V42 b5 review: the keyboard path of the genre (B, category, item) is an option (Impostazioni › ARMI › TASTO B,
// `startCategory`): B opens on the categories, a digit opens one, the next buys, and the menu goes back to the categories.
// The other choice opens on the rifles as before (B 2 buys the second rifle).
import {CATEGORIES,buyIssue,sellIssue,priceFor,canBuyNow,buyWindowLeft,sideOf,grenadeCount,ECONOMY,economyOn,slotItems,slotItem,pistolOf} from './economy.js?v=42.0';
import {weaponIcon} from './kill-feed.js?v=42.0';
import {WEAPONS} from './shared.js?v=42.0';
import {weaponFor} from './weapon-stats.js?v=42.0';
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
// The three columns of the wide layout, by category index.
const COLUMNS=[[0,1],[2],[3,4]];
const FOOTER={cs:'B · 1–5 CATEGORIA · 1–4 COMPRA O VENDI · ← → MODELLO · 0 CATEGORIE · INVIO PRONTO',rifles:'B APRE SUI FUCILI · 1–3 COMPRA O VENDI · 0 POI 1–5 CATEGORIA · ← → MODELLO · INVIO PRONTO'};
const money=v=>Number(v||0).toLocaleString('it-IT');
// Numbers shown in the ARSENALE view, as the Officina shows them.
export const weaponFacts=(index,w=WEAPONS[index])=>{return w.melee?'FENDENTE 35 · STOCCATA 65 · ALLE SPALLE 140':'DANNO '+w.damage+' · '+Math.round(60/w.rate)+' COLPI/MIN · '+w.mag+' COLPI · '+w.range+' M';};
// Key numbers as three bars with their values: damage, rate of fire, magazine.
const stats=w=>w.melee?'':'<span class="bm-stats">'+[['DANNO',w.damage,w.damage/100],['/MIN',Math.round(60/w.rate),(60/w.rate)/1000],['COLPI',w.mag,w.mag/40]].map(([k,v,x])=>'<i style="--v:'+Math.min(100,Math.round(x*100))+'%"><b>'+v+'</b>'+(k[0]==='/'?'':' ')+k+'</i>').join('')+'</span>';
// A design's three numbers on one line, in the order of the bars (damage, rounds a minute, magazine).
const brief=w=>w.melee?'':'<small class="bm-nums"><b>'+w.damage+'</b> · <b>'+Math.round(60/w.rate)+'</b> · <b>'+w.mag+'</b></small>';
// A design's name in its button: no OB- code, and no class name in front (AVERLA CLASSICO is CLASSICO beside the AVERLA).
const altName=(name,base)=>{const n=name.replace(/^OB-\d+ /,'');return n!==base&&n.startsWith(base+' ')?n.slice(base.length+1):n;};
const LEGEND='<p class="bm-legend">MODELLI · DANNO · COLPI/MIN · CARICATORE</p>';
export class BuyMenu{
 constructor({onBuy,onSell,onReady,onOpen,onClose,stayOnExpiry=()=>false,canEquip=()=>false,onEquip=()=>{},heldWeapon=()=>-1,utilityOn=()=>true,nameOf=i=>WEAPONS[i].name,rowOf=i=>WEAPONS[i],modelOf=()=>'stock',onModel=()=>{},tagOf=(i,m)=>weaponFor(i,m).label,startCategory=()=>2,onIntent=()=>{}}){
  this.el=document.getElementById('buymenu');this.active=false;this.view=false;this.category=2;this.focus=null;this.pick={};this.quick=false;Object.assign(this,{onBuy,onSell,onReady,onOpen,onClose,stayOnExpiry,canEquip,onEquip,heldWeapon,utilityOn,nameOf,rowOf,modelOf,onModel,tagOf,startCategory,onIntent});
  const cats=document.getElementById('buycats');
  CATEGORIES.forEach((c,n)=>{const b=document.createElement('button');b.type='button';b.dataset.category=n;b.innerHTML='<kbd>'+(n+1)+'</kbd><b>'+esc(c.label)+'</b><small></small>';b.onclick=()=>this.show(n);cats.append(b);});
  this.grid=document.getElementById('buygrid');this.footerText=FOOTER.cs;
  // One listener for the whole board: cards are rebuilt when their state changes, the handler stays.
  this.grid.addEventListener('click',e=>{const t=e.target.closest?.('button');if(!t||t.disabled||!this.grid.contains(t))return;
   if(t.dataset.item){const item=this.items.get(t.dataset.item);if(!item)return;if(t.dataset.alt)this.alt(item);else this.act(item);}
   else if(t.dataset.model)this.choose(Number(t.dataset.slot),t.dataset.model);
   else if(t.dataset.category)this.show(Number(t.dataset.category));});
  this.grid.addEventListener('pointerover',e=>{const c=e.target.closest?.('.bm-card');if(c)this.focus={category:Number(c.dataset.category),row:Number(c.dataset.row)};
   // V43 b56: a design pointed at starts loading, so the click that buys it finds it ready (no stall in the frame of the purchase).
   const d=e.target.closest?.('button[data-item]'),it=d&&this.items.get(d.dataset.item);if(it?.kind==='weapon'&&!this.view)this.onIntent(it.weapon,it.model||'stock');},{passive:true});
  this.items=new Map();
  document.getElementById('buyready').onclick=()=>this.onReady();document.getElementById('buyclose').onclick=()=>this.close();document.getElementById('buyback').onclick=()=>this.show(-1);
  window.addEventListener('keydown',e=>{if(!this.active)return;
   if(/^Digit[1-9]$/.test(e.code)){e.preventDefault();e.stopImmediatePropagation();const n=Number(e.code.at(-1))-1;if(this.category<0){if(n<CATEGORIES.length)this.show(n);}else{const item=this.rowItem(this.category,n);if(item){this.focus={category:this.category,row:n};this.act(item);if(this.quick&&!this.view&&this.active)this.show(-1);}}return;}
   if(e.code==='Digit0'||e.code==='Backspace'){e.preventDefault();e.stopImmediatePropagation();this.show(-1);return;}
   if(e.code==='KeyB'||e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();return;}
   if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();const f=this.focus||{category:this.category<0?2:this.category,row:0},item=CATEGORIES[f.category]?.items[f.row];if(item?.kind==='weapon')this.cycle(item.weapon,e.code==='ArrowRight'?1:-1);return;}
   if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();e.stopImmediatePropagation();const f=this.focus||{category:this.category<0?2:this.category,row:-1},rows=CATEGORIES[f.category].items.length;this.focus={category:f.category,row:(f.row+(e.code==='ArrowDown'?1:-1)+rows)%rows};this.markFocus();return;}
   if(e.code==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(this.view)this.close();else this.onReady();}},true);
 }
 // The design a weapon card stands for: one picked here, else the one held (economy), else the loadout's.
 shown(slot){if(this.pick[slot])return this.pick[slot];const p=this.player;if(p&&economyOn(this.state)){if(slot===0)return pistolOf(p);if(p.primary===slot)return p.arms?.[slot]||'stock';}return this.modelOf(slot);}
 // The item a card stands for: a weapon card is the design shown for its slot.
 rowItem(category,n){const item=CATEGORIES[category]?.items[n];return item?.kind==='weapon'?slotItem(item.weapon,this.shown(item.weapon))||item:item;}
 // Buy when the item can be bought; otherwise refund it if it was bought this round.
 // In the ARSENALE view a weapon that is issued in this mode is taken in hand instead.
 act(item){if(!this.state||!this.player)return;
  if(this.view){if(item.kind==='weapon'&&this.canEquip(item.weapon)){this.onEquip(item.weapon);this.close('equip');}return;}
  if(!buyIssue(this.state,this.player,item,this.now))this.onBuy(item.id);else if(!sellIssue(this.state,this.player,item,this.now))this.onSell(item.id);}
 // A design in a card's list: it becomes the one the card shows and, in the shop, one click buys it (or sells it back).
 alt(item){const m=item.model||'stock';if(this.pick[item.weapon]!==m){this.pick[item.weapon]=m;this.gridSig=null;}if(!this.view)this.act(item);this.render(this.state,this.player,this.now,this.teamName);}
 // ARSENALE with every weapon issued: the design in hand is the loadout's, so a design picked here becomes the loadout's.
 choose(slot,model){if(!Number.isInteger(slot))return;this.pick[slot]=model;if(model!==this.modelOf(slot))this.onModel(slot,model);this.gridSig=null;this.render(this.state,this.player,this.now,this.teamName);}
 cycle(slot,step){const list=slotItems(slot);if(list.length<2)return;const at=Math.max(0,list.findIndex(i=>(i.model||'stock')===this.shown(slot)));this.pick[slot]=list[(at+step+list.length)%list.length].model||'stock';if(!this.view)this.onIntent(slot,this.pick[slot]);this.gridSig=null;this.render(this.state,this.player,this.now,this.teamName);}
 markFocus(){const f=this.focus;for(const c of this.grid.querySelectorAll?.('.bm-card')||[])c.classList.toggle('focus',!!f&&Number(c.dataset.category)===f.category&&Number(c.dataset.row)===f.row);}
 show(n){this.gridSig=null;this.category=n;if(n>=0)this.focus={category:n,row:0};this.el.classList.toggle('in-category',n>=0);this.el.classList.toggle('pick-category',n<0&&!this.view);for(const b of document.getElementById('buycats').children)b.setAttribute('aria-current',String(Number(b.dataset.category)===n));this.render(this.state,this.player,this.now,this.teamName);}
 // V38.2: opening takes the live match, so the first render cannot judge the buy window on
 // what the previous opening left behind (an old round, a dead player) and close at once.
 setView(view,footer='1–4 PRENDI IN MANO · ← → MODELLO · 0 POI 1–5 CATEGORIA · B O ESC CHIUDE'){this.view=view;this.gridSig=null;this.el.classList.toggle('view',view);
  document.getElementById('buytitle').textContent=view?'ARSENALE':'ACQUISTI';document.getElementById('buyready').hidden=view;document.getElementById('buyteam').hidden=view;
  this.el.querySelector('footer>span').textContent=view?footer:this.footerText;}
 open(view=false,state=this.state,player=this.player,now=this.now,teamName=this.teamName){if(this.active)return;this.active=true;this.pick={};const start=view?2:this.startCategory();this.quick=start<0;this.footerText=this.quick?FOOTER.cs:FOOTER.rifles;Object.assign(this,{state,player,now,teamName});this.setView(view);this.el.hidden=false;
  this.show(start);this.onOpen?.();}
 close(reason='user'){if(!this.active)return;this.active=false;this.el.hidden=true;this.el.classList.remove('view');this.onClose?.(reason);}
 toggle(view=false){if(this.active)this.close();else this.open(view);}
 // The board: every category as a group of cards, in columns. The narrow layout shows the open category only.
 board(card,sig){
  // V36: the grid is rebuilt only when an item's state changes. Rebuilding it on every HUD
  // tick replaced the buttons under the pointer, so a real click (press, then release on the
  // same element) often landed on a node that no longer existed and did nothing.
  const shown=this.category<0?2:this.category;this.grid.dataset.show=shown;
  if(this.gridSig===sig)return;this.gridSig=sig;this.items.clear();
  const group=n=>{const c=CATEGORIES[n];return '<section class="bm-group" data-category="'+n+'"><button type="button" class="bm-head" data-category="'+n+'"><kbd>'+(n+1)+'</kbd><b>'+esc(c.label)+'</b><small>'+esc(this.catNote(n))+'</small></button><div class="bm-items'+(c.items[0].kind==='weapon'?' guns':'')+'">'+c.items.map((item,row)=>card(this.rowItem(n,row),n,row)).join('')+'</div></section>';};
  this.grid.innerHTML=LEGEND+COLUMNS.map(col=>'<div class="bm-col">'+col.map(group).join('')+'</div>').join('');
  this.markFocus();
 }
 // The state of every design on sale, for the signature that decides a rebuild.
 altSig(){const p=this.player,s=this.state;let out='';for(let slot=0;slot<5;slot++){out+='|'+this.shown(slot)+':'+this.modelOf(slot);if(!this.view)for(const i of slotItems(slot)){const issue=buyIssue(s,p,i,this.now);out+=','+issue+(!!issue&&!sellIssue(s,p,i,this.now))+priceFor(p,i);}}return out;}
 // A weapon card's designs: one button each with name, price and numbers. In the shop a click buys (or sells back);
 // in the ARSENALE it shows the design, and with every weapon issued it takes it as the loadout's.
 alts(item,priced){const slot=item.weapon,list=slotItems(slot);if(list.length<2)return '';const cur=item.model||'stock',base=this.nameOf(slot,'stock').replace(/^OB-\d+ /,''),p=this.player,s=this.state,shop=!this.view,loadout=this.view&&!economyOn(s);
  return '<div class="bm-alts" role="group" aria-label="Modelli">'+list.map(i=>{const m=i.model||'stock',w=weaponFor(slot,m);let cls='bm-alt',tail='';
   if(shop){const issue=buyIssue(s,p,i,this.now),sellable=!!issue&&!sellIssue(s,p,i,this.now),price=priceFor(p,i);cls+=(issue==='owned'?' owned':'')+(sellable?' sellable':'')+(issue==='money'?' poor':'')+(issue==='side'?' side':'');tail=sellable?'VENDI':issue==='owned'?'✓':price?money(price):'GRATIS';}
   else if(priced){const price=priceFor(p,i);tail=price?money(price):'GRATIS';}
   if(m===cur)cls+=' shown';
   const attrs=loadout?' data-slot="'+slot+'" data-model="'+m+'"':(this.items.set(i.id,i),' data-item="'+i.id+'" data-alt="1"');
   return '<button type="button" class="'+cls+'"'+attrs+' aria-pressed="'+(m===cur)+'"><span class="bm-alt-top"><b>'+esc(altName(this.nameOf(slot,m),base))+'</b>'+(tail?'<i>'+tail+'</i>':'')+'</span>'+brief(w)+'</button>';}).join('')+'</div>';}
 catNote(n){const c=CATEGORIES[n],p=this.player,state=this.state;if(!p)return '';
  if(this.view){const utility=this.utilityOn(),held=this.heldWeapon();const have=c.items.filter(i=>i.kind==='weapon'?this.canEquip(i.weapon)||i.weapon===held:i.kind==='utility'?p[i.field]>0:i.id==='kit'?p.kit:(p.armor||0)>0).length;return c.id==='grenades'?(utility?grenadeCount(p)+' / '+ECONOMY.grenadeSlots:'NON SU QUESTA MAPPA'):have?(c.items.length>1&&have===c.items.length?'TUTTE IN DOTAZIONE':'IN DOTAZIONE'):'';}
  const owned=c.items.filter(i=>buyIssue(state,p,i,this.now)==='owned'||i.kind==='utility'&&p[i.field]>0||i.kind==='weapon'&&(i.weapon===0||p.primary===i.weapon)).length;return c.id==='grenades'?grenadeCount(p)+' / '+ECONOMY.grenadeSlots:owned?'IN DOTAZIONE':'';}
 render(state,p,now,teamName){
  if(!this.active||!p)return;this.state=state;this.player=p;this.now=now;this.teamName=teamName;
  if(this.view)return this.renderView(state,p);
  if(!canBuyNow(state,p,now)||p.hp<=0){if(!state.ended&&this.stayOnExpiry()){this.setView(true,'ACQUISTI CHIUSI · 1–4 PRENDI IN MANO · B O ESC TORNA IN CAMPO');this.show(this.category<0?2:this.category);}else this.close('timeout');return;}
  const side=sideOf(state,p);
  document.getElementById('buymoney').textContent=money(p.money);
  document.getElementById('buytime').textContent=Math.max(0,Math.ceil(buyWindowLeft(state,now)/1000));
  document.getElementById('buyround').textContent='ROUND '+state.round+' · '+(side==='attack'?'ATTACCO':'DIFESA')+' · '+(state.phase==='freeze'?'FASE D’ACQUISTO':'ZONA D’ACQUISTO');
  for(const b of document.getElementById('buycats').children)b.querySelector('small').textContent=this.catNote(Number(b.dataset.category));
  const all=CATEGORIES.flatMap((c,n)=>c.items.map((_,row)=>this.rowItem(n,row)));
  const sig='buy|'+all.map(item=>{const issue=buyIssue(state,p,item,now);return item.id+':'+issue+':'+(!!issue&&!sellIssue(state,p,item,now))+':'+(item.kind==='utility'?(p[item.field]||0):0)+':'+priceFor(p,item)+':'+(p.spent?.[item.id]??'')+':'+(item.kind==='weapon'&&p.weapon===item.weapon);}).join(',')+'|'+(p.money||0)+this.altSig();
  this.board((item,n,row)=>{this.items.set(item.id,item);
   const issue=buyIssue(state,p,item,now),sellable=!!issue&&!sellIssue(state,p,item,now),weapon=item.kind==='weapon',model=item.model||'stock',w=weapon?weaponFor(item.weapon,model):null;
   const name=weapon?this.nameOf(item.weapon,model):item.label,sideNote=item.side?' · solo '+(item.side==='attack'?'attacco':'difesa'):'',detail=(weapon?this.tagOf(item.weapon,model):item.detail)+sideNote;
   const count=item.kind==='utility'?(p[item.field]||0):0,inHand=weapon&&issue==='owned'&&p.weapon===item.weapon,price=priceFor(p,item);
   const cls='bm-card '+item.kind+(issue==='owned'||issue==='full'?' owned':'')+(inHand?' inhand':'')+(issue==='money'?' poor':'')+(issue==='side'?' side':'')+(sellable?' sellable':'');
   const why=issue==='side'?'NON PER IL TUO LATO':sellable?'VENDI · +'+money(p.spent?.[item.id]??item.price):inHand?'IN MANO':REASONS[issue]||'';
   return '<div class="'+cls+'" data-category="'+n+'" data-row="'+row+'"><button type="button" class="bm-main" data-item="'+item.id+'"'+(issue&&!sellable?' disabled':'')+'><kbd>'+(row+1)+'</kbd>'+(weapon?weaponIcon(item.weapon):ICONS[item.id])+
    '<span class="bm-name"><b>'+esc(name)+(count?' <i>×'+count+'</i>':'')+'</b><small>'+esc(detail)+'</small></span><span class="bm-price'+(price?'':' free')+'">'+(price?money(price):'GRATIS')+'</span>'+(w?stats(w):'')+'<em class="bm-why">'+why+'</em></button>'+(weapon?this.alts(item,true):'')+'</div>';},sig);
  const mates=Object.values(state.players).filter(v=>v.team===p.team).sort((a,b)=>(b.money||0)-(a.money||0));
  document.getElementById('buyteam').innerHTML='<small>'+esc(teamName)+' · CREDITI DELLA SQUADRA</small>'+mates.map(v=>'<span class="'+(v.id===p.id?'me':'')+'">'+(Number.isInteger(v.primary)?weaponIcon(v.primary):'<i class="none"></i>')+'<b>'+esc(v.name)+'</b><em>'+money(v.money)+'</em>'+(v.kit?'<u>KIT</u>':'')+'</span>').join('');
  document.getElementById('buyready').textContent=p.buyReady===state.round?'PRONTO ✓':'PRONTO ↗';
 }
 // ARSENALE: the same categories with facts instead of prices. Nothing is bought here.
 renderView(state,p){
  const economy=economyOn(state),held=this.heldWeapon(),utility=this.utilityOn(),mode=state.preview?'VISITA LIBERA':state.mode==='deathmatch'?'DEATHMATCH':state.mode==='corsa'?'CORSA ALLE ARMI':'SQUADRA';
  document.getElementById('buymoney').textContent=economy?money(p.money):'—';
  document.getElementById('buytime').textContent=economy?Math.max(0,Math.ceil(buyWindowLeft(state,this.now)/1000)):'—';
  document.getElementById('buyround').textContent=mode+' · '+(economy?'ACQUISTI CHIUSI · SOLO CONSULTAZIONE':'TUTTO IN DOTAZIONE · SCEGLI COSA IMBRACCIARE');
  for(const b of document.getElementById('buycats').children)b.querySelector('small').textContent=this.catNote(Number(b.dataset.category));
  const all=CATEGORIES.flatMap((c,n)=>c.items.map((_,row)=>this.rowItem(n,row)));
  const sig='view|'+held+'|'+economy+'|'+utility+'|'+all.map(item=>item.id+':'+(item.kind==='weapon'?this.canEquip(item.weapon)+':'+p.primary:item.kind==='utility'?(p[item.field]||0):item.id==='kit'?!!p.kit:(p.armor||0)+':'+!!p.helmet)).join(',')+this.altSig();
  this.board((item,n,row)=>{this.items.set(item.id,item);
   let status='',cls='',usable=false;const weapon=item.kind==='weapon',model=item.model||'stock';
   if(weapon){const inHand=item.weapon===held;usable=this.canEquip(item.weapon)&&!inHand;status=inHand?'IN MANO':usable?'PRENDI IN MANO':economy?(p.primary===item.weapon?'IN DOTAZIONE':'IN VENDITA NELLA FASE D’ACQUISTO'):'NON IN QUESTA MODALITÀ';cls=inHand?' owned inhand':usable?'':' side';}
   else if(item.kind==='utility'){const have=p[item.field]||0;status=!utility?'NON SU QUESTA MAPPA':have?'×'+have+' IN TASCA':economy?'IN VENDITA NELLA FASE D’ACQUISTO':'NON IN DOTAZIONE';cls=have?' owned':' side';}
   else{const have=item.id==='kit'?!!p.kit:item.id==='helmet'?(p.armor||0)>0&&!!p.helmet:(p.armor||0)>0;status=have?'INDOSSATO':economy?'IN VENDITA NELLA FASE D’ACQUISTO':'NON IN QUESTA MODALITÀ';cls=have?' owned':' side';}
   // Outside an economy round the loadout's design is the one in hand: its own numbers (rowOf), as the Officina shows them.
   const w=weapon?(economy?weaponFor(item.weapon,model):this.rowOf(item.weapon)):null,name=weapon?this.nameOf(item.weapon,model):item.label,detail=weapon?this.tagOf(item.weapon,model):item.detail+(item.side?' · solo '+(item.side==='attack'?'attacco':'difesa'):'');
   return '<div class="bm-card '+item.kind+cls+'" data-category="'+n+'" data-row="'+row+'"><button type="button" class="bm-main" data-item="'+item.id+'"'+(usable?'':' disabled')+'><kbd>'+(row+1)+'</kbd>'+(weapon?weaponIcon(item.weapon):ICONS[item.id])+
    '<span class="bm-name"><b>'+esc(name)+'</b><small>'+esc(detail)+'</small></span>'+(weapon||!economy?'':'<span class="bm-price">'+money(priceFor(p,item))+'</span>')+(w?stats(w):'')+'<em class="bm-why">'+status+'</em></button>'+(weapon?this.alts(item,economy):'')+'</div>';},sig);
 }
}
