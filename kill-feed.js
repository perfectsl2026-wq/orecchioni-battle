import {KILL_FEED_MS} from './kill-events.js?v=42.0';
import {WEAPONS} from './shared.js?v=42.0';
import {designName} from './weapon-stats.js?v=42.0';
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
// V42 kill marks: through a wall, without the optic, through smoke, from the air.
const FEED_MARKS=[['wall','Attraverso il muro','M2 2h6v6H2zm8 0h6v6h-6zM2 10h6v6H2zm8 0h6v6h-6z M1 8.2h16v1.6H1z'],['noscope','Senza ottica','M9 1a8 8 0 1 0 0 16A8 8 0 0 0 9 1m0 2a6 6 0 0 1 4.7 9.7L5.3 4.3A6 6 0 0 1 9 3M4.3 5.3l8.4 8.4A6 6 0 0 1 4.3 5.3'],['smoke','Attraverso il fumo','M5 13a4 4 0 0 1 .4-8 5 5 0 0 1 9 2.2A3 3 0 0 1 14 13z'],['air','In volo','M9 2l5 6h-3v4H7V8H4zM4 14h10v2H4z']];
export const UTILITY_NAMES={6:'Granata HE',7:'Incendiaria',8:'Bomba'};
// V42 b4a: a kill with a design that is a weapon of its own (weapon-stats.js) names the design.
export const weaponName=(index,model=null)=>designName(index,model)||WEAPONS[index]?.name||UTILITY_NAMES[index]||'Arma';
export function weaponIcon(index){return '<svg class="weapon-icon" viewBox="0 0 52 25" aria-hidden="true"><path fill="currentColor" d="'+(shapes[index]||shapes[3])+'"/></svg>';}
export function addKillFeed(container,e,localId,age=0){
 const row=document.createElement('div');row.className='kill-row'+(e.killerId===localId?' own-kill':'')+(e.victimId===localId?' own-death':'');
 const name=(value,team)=>{const span=document.createElement('span');span.className='kill-name '+team;span.textContent=value;return span;};
 row.append(name(e.killerName,e.killerTeam));const weapon=document.createElement('span');weapon.className='kill-weapon';weapon.innerHTML=weaponIcon(e.weapon);weapon.title=weaponName(e.weapon,e.model);row.append(weapon);
 if(e.headshot){const h=document.createElement('span');h.className='headshot';h.title='Colpo alla testa';h.innerHTML='<svg viewBox="0 0 18 20" aria-hidden="true"><path fill="currentColor" d="M9 1a7 7 0 0 0-7 7v3l3 2v4h8v-4l3-2V8a7 7 0 0 0-7-7M5 7h3v3H5zm5 0h3v3h-3zM7 14h1v3H7zm3 0h1v3h-1z"/></svg>';row.append(h);}
 const how=FEED_MARKS.filter(([key])=>e[key]===true);for(const [,title,path] of how){const m=document.createElement('span');m.className='kill-mark';m.title=title;m.innerHTML='<svg viewBox="0 0 18 18" aria-hidden="true"><path fill="currentColor" d="'+path+'"/></svg>';row.append(m);}
 row.append(name(e.victimName,e.victimTeam));row.setAttribute('role','listitem');row.setAttribute('aria-label',e.killerName+' elimina '+e.victimName+' con '+weaponName(e.weapon,e.model)+(e.headshot?', colpo alla testa':'')+how.map(([,title])=>', '+title.toLowerCase()).join(''));
 container.prepend(row);while(container.children.length>5)container.lastElementChild.remove();setTimeout(()=>row.remove(),Math.max(0,KILL_FEED_MS-age));return row;
}
