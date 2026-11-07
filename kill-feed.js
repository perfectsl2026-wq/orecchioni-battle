import {KILL_FEED_MS} from './kill-events.js?v=42.0';
import {WEAPONS} from './shared.js?v=42.0';
import {designName} from './weapon-stats.js?v=42.0';
import {emblemSVG} from './emblems.js?v=42.0';
const shapes=[
 'M4 8h30v5H23v5h-7v-5H4z M28 13h7v2h-7z',
 'M3 10h31V8h7v6H22v4h-6v-5H3z M7 10V7h2v3',
 'M2 10h12V7h9v3h24v3H27l-2 9-6-2 2-7h-8l-8 4H2z',
 'M2 9h12V7h16v3h16v3H28l-1 7h-6v-7h-8l-8 4H2z M28 7h8v2h-8z',
 'M2 12h12l3-4h13v3h19v2H28l-4 3-1 6h-4v-8h-6l-9 4H2z M20 5h15v3H20z M24 8v3h-2V8z',
 'M3 18l13-7 2 3L6 22z M14 9l5 9 3-2-5-9z M19 11L48 2 36 15 22 15z',
 'M26 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16m-3-3h6v3h-6zm7 0 5-1v2l-5 1zM22 10h8v2h-8zm0 3h8v2h-8z',
 'M20 21c-4-3-5-8-2-12 0 3 2 4 3 4-1-4 1-8 5-10-1 4 1 6 3 7 1-2 1-4 0-6 4 3 6 8 4 12-1 3-4 5-7 5s-5-1-6 0z',
 'M12 9h28v12H12z M16 5h4v4h-4z M24 5h4v4h-4z M32 5h4v4h-4z M36 3l6-2v2l-6 2z'
];
// V45 kill marks: original 20×20 line icons, one subtle accent each (style.css .km-*).
// Order is the reading order in the row. Old hosts never send the newer flags: they simply do not show.
const MARKS=[
 ['headshot','Colpo alla testa','<circle cx="9" cy="8" r="4.6"/><path d="M2.5 18.5c.8-3.6 3.2-5.4 6.5-5.4s5.7 1.8 6.5 5.4"/><path d="M15 2.5l2.5 2.5-2.5 2.5-2.5-2.5z" fill="currentColor" stroke="none"/>'],
 ['wall','Attraverso il muro','<path d="M3 4h7v4H3zM10 4h7v4h-7zM6.5 8h7v4h-7zM3 12h7v4H3zM10 12h7v4h-7z" opacity=".55"/><path d="M1 10h15.5M13.5 7l3 3-3 3"/>'],
 ['noscope','Senza ottica','<circle cx="10" cy="10" r="6.5"/><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3M4.5 15.5l11-11"/>'],
 ['smoke','Attraverso il fumo','<path d="M5.5 15.5a3.5 3.5 0 0 1 .3-7 4.6 4.6 0 0 1 8.7 1.4 2.9 2.9 0 0 1-.3 5.6z"/><path d="M2 18.5h16" opacity=".55"/>'],
 ['air','In volo','<path d="M5 10l5-5 5 5M10 5v8"/><path d="M3 17.5h14" stroke-dasharray="2 2"/>'],
 ['blind','Accecato','<path d="M1.8 10c2.2-3.6 5-5.4 8.2-5.4s6 1.8 8.2 5.4c-2.2 3.6-5 5.4-8.2 5.4S4 13.6 1.8 10z"/><circle cx="10" cy="10" r="2.2" fill="currentColor" stroke="none"/><path d="M3 17L17 3"/>'],
 ['collateral','Doppia con un colpo','<circle cx="6.5" cy="12" r="3"/><circle cx="14" cy="8" r="3"/><path d="M1 16.5L19 3.5"/>'],
 ['knife','Coltello','<path d="M2.5 17.5l3-3M5 15l9.5-9.5c1.4-1.4 3-2 4-2-.1 1-.6 2.6-2 4L7 17z"/>'],
 ['last','Ultimo avversario','<path d="M10 2.5l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5L2.8 7.7l5-.6z"/>']
];
export const markIcon=(key,path)=>'<svg viewBox="0 0 20 20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+path+'</g></svg>';
// The marks a kill earned, for the feed and the death card.
export function killMarks(e){return MARKS.filter(([key])=>key==='knife'?(e.knife===true||!!WEAPONS[e.weapon]?.melee):e[key]===true||(key==='headshot'&&!!e.headshot));}
export function marksHTML(e){return killMarks(e).map(([key,title,path])=>'<span class="kill-mark km-'+key+(key==='headshot'?' headshot':'')+'" title="'+title+'">'+markIcon(key,path)+'</span>').join('');}
export const UTILITY_NAMES={6:'Granata HE',7:'Incendiaria',8:'Bomba'};
// V42 b4a: a kill with a design that is a weapon of its own (weapon-stats.js) names the design.
export const weaponName=(index,model=null)=>designName(index,model)||WEAPONS[index]?.name||UTILITY_NAMES[index]||'Arma';
export function weaponIcon(index){return '<svg class="weapon-icon" viewBox="0 0 52 25" aria-hidden="true"><path fill="currentColor" d="'+(shapes[index]||shapes[3])+'"/></svg>';}
export function addKillFeed(container,e,localId,age=0){
 const row=document.createElement('div');row.className='kill-row'+(e.killerId===localId?' own-kill':'')+(e.victimId===localId?' own-death':'');
 const name=(value,team,emblem)=>{const span=document.createElement('span');span.className='kill-name '+team;span.textContent=value;if(emblem)span.insertAdjacentHTML('afterbegin',emblemSVG(emblem));return span;};
 row.append(name(e.killerName,e.killerTeam,e.killerEmblem));const weapon=document.createElement('span');weapon.className='kill-weapon';weapon.innerHTML=weaponIcon(e.weapon);weapon.title=weaponName(e.weapon,e.model);row.append(weapon);
 const how=killMarks(e);if(how.length){const holder=document.createElement('span');holder.className='kill-marks';holder.innerHTML=marksHTML(e);row.append(...holder.children);}if(how.some(([key])=>key==='knife'))row.classList.add('knife-kill');
 row.append(name(e.victimName,e.victimTeam,e.victimEmblem));row.setAttribute('role','listitem');row.setAttribute('aria-label',e.killerName+' elimina '+e.victimName+' con '+weaponName(e.weapon,e.model)+how.map(([,title])=>', '+title.toLowerCase()).join(''));
 container.prepend(row);while(container.children.length>5)container.lastElementChild.remove();setTimeout(()=>row.remove(),Math.max(0,KILL_FEED_MS-age));return row;
}
