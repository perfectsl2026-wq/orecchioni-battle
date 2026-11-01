import {KILL_FEED_MS} from './kill-events.js?v=39.0';
import {WEAPONS} from './shared.js?v=39.0';
const shapes=[
 'M4 8h30v5H23v5h-7v-5H4z M28 13h7v2h-7z',
 'M3 10h31V8h7v6H22v4h-6v-5H3z M7 10V7h2v3',
 'M2 10h12V7h9v3h24v3H27l-2 9-6-2 2-7h-8l-8 4H2z',
 'M2 9h12V7h16v3h16v3H28l-1 7h-6v-7h-8l-8 4H2z M28 7h8v2h-8z',
 'M2 12h12l3-4h13v3h19v2H28l-4 3-1 6h-4v-8h-6l-9 4H2z M20 5h15v3H20z M24 8v3h-2V8z',
 'M3 18l13-7 2 3L6 22z M14 9l5 9 3-2-5-9z M19 11L48 2 36 15 22 15z',
 'M26 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16m-3-3h6v3h-6zm7 0 5-1v2l-5 1zM22 10h8v2h-8zm0 3h8v2h-8z',
 'M20 21c-4-3-5-8-2-12 0 3 2 4 3 4-1-4 1-8 5-10-1 4 1 6 3 7 1-2 1-4 0-6 4 3 6 8 4 12-1 3-4 5-7 5s-5-1-6 0z'
];
export const UTILITY_NAMES={6:'Granata HE',7:'Incendiaria'};
export const weaponName=index=>WEAPONS[index]?.name||UTILITY_NAMES[index]||'Arma';
export function weaponIcon(index){return '<svg class="weapon-icon" viewBox="0 0 52 25" aria-hidden="true"><path fill="currentColor" d="'+(shapes[index]||shapes[3])+'"/></svg>';}
export function addKillFeed(container,e,localId,age=0){
 const row=document.createElement('div');row.className='kill-row'+(e.killerId===localId?' own-kill':'')+(e.victimId===localId?' own-death':'');
 const name=(value,team)=>{const span=document.createElement('span');span.className='kill-name '+team;span.textContent=value;return span;};
 row.append(name(e.killerName,e.killerTeam));const weapon=document.createElement('span');weapon.className='kill-weapon';weapon.innerHTML=weaponIcon(e.weapon);weapon.title=weaponName(e.weapon);row.append(weapon);
 if(e.headshot){const h=document.createElement('span');h.className='headshot';h.title='Colpo alla testa';h.innerHTML='<svg viewBox="0 0 18 20" aria-hidden="true"><path fill="currentColor" d="M9 1a7 7 0 0 0-7 7v3l3 2v4h8v-4l3-2V8a7 7 0 0 0-7-7M5 7h3v3H5zm5 0h3v3h-3zM7 14h1v3H7zm3 0h1v3h-1z"/></svg>';row.append(h);}
 row.append(name(e.victimName,e.victimTeam));row.setAttribute('role','listitem');row.setAttribute('aria-label',e.killerName+' elimina '+e.victimName+' con '+weaponName(e.weapon)+(e.headshot?', colpo alla testa':''));
 container.prepend(row);while(container.children.length>5)container.lastElementChild.remove();setTimeout(()=>row.remove(),Math.max(0,KILL_FEED_MS-age));return row;
}
