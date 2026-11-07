// V45 operator portraits for the round MVP card and the end-of-match podium: a small flat
// SVG bust per kit, cached per team, kit and accent. No WebGL, no extra render passes.
import {cleanOperator,kitFor} from './operator-kits.js?v=42.0';
const TEAM={blue:['#73bdde','#16303d'],orange:['#ff8a55','#3a2016']};
// Per kit: helmet shape, visor, crest, mask. Original silhouettes, drawn for 64×64.
const LOOKS={
 assalto:{helmet:'M18 30c0-10 6-17 14-17s14 7 14 17v3H18z',visor:'M21 27h22v5H21z',mask:0,crest:0},
 sfondamento:{helmet:'M15 31c0-11 7-18 17-18s17 7 17 18v3H15z',visor:'M22 28h20v3H22z',mask:1,crest:0},
 mastino:{helmet:'M17 34V24c0-7 7-12 15-12s15 5 15 12v10z',visor:'M23 27h18v2H23z',mask:0,crest:0},
 saetta:{helmet:'M19 31c0-11 6-18 15-18 8 0 12 6 12 15v4H19z',visor:'M22 25c6-1 15-1 23 2v5H22z',mask:0,crest:1},
 onice:{helmet:'M18 33V23c0-6 6-11 14-11s14 5 14 11v10z',visor:'M22 26h20v2.4H22z',mask:0,crest:0,glow:1},
 astore:{helmet:'M18 30c0-9 6-16 14-16s14 7 14 16v2H18z',visor:'M20 26h24v4H20z',mask:1,crest:0},
 corvo:{helmet:'M16 34c0-13 7-21 16-21s16 8 16 21l-5-2V27H21v5z',visor:'M23 27h18v4H23z',mask:0,crest:0},
 lince:{helmet:'M19 30c0-9 5-15 13-15s13 6 13 15v2H19z',visor:'M21 26l11 3 11-3v4H21z',mask:1,crest:1}
};
const cache=new Map();
// V45: a source of real renders (armory.portrait); the flat busts stay as the fallback.
let source=null;export const setPortraitSource=fn=>{source=fn;};
export function portraitSVG(team,operator){
 const o=cleanOperator(operator),key=team+':'+o.kit;
 if(source){const url=source(team==='orange'?'orange':'blue',o.kit);if(url)return '<img class="op-portrait shot" src="'+url+'" alt="'+(kitFor(o.kit)?.name||'OPERATORE')+'" width="64" height="64" decoding="async">';}
 if(cache.has(key))return cache.get(key);
 const [accent,shade]=TEAM[team]||TEAM.blue,l=LOOKS[o.kit]||LOOKS.assalto,id='pg'+cache.size;
 const svg='<svg class="op-portrait" viewBox="0 0 64 64" role="img" aria-label="'+(kitFor(o.kit)?.name||'OPERATORE')+'"><defs><radialGradient id="'+id+'" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="'+shade+'"/><stop offset="1" stop-color="#0a1116"/></radialGradient></defs>'
  +'<rect width="64" height="64" fill="url(#'+id+')"/>'
  +'<path d="M6 64c2-13 10-19 26-19s24 6 26 19z" fill="#1d262b"/><path d="M14 64c2-9 7-13 18-13s16 4 18 13z" fill="#2a353b"/><path d="M27 45h10v6H27z" fill="#161d21"/>'
  +'<path d="M8 60c3-6 8-9 14-10l2 4c-6 1-10 3-13 8z" fill="'+accent+'" opacity=".8"/>'
  +'<ellipse cx="32" cy="34" rx="10" ry="11" fill="#141b1f"/>'
  +'<path d="'+l.helmet+'" fill="#323d43"/><path d="'+l.helmet+'" fill="none" stroke="#5b686e" stroke-width=".8"/>'
  +'<path d="'+l.visor+'" fill="'+(l.glow?accent:'#0b1215')+'"'+(l.glow?' opacity=".9"':'')+'/>'
  +(l.glow?'':'<path d="'+l.visor+'" fill="none" stroke="'+accent+'" stroke-width=".7" opacity=".7"/>')
  +(l.mask?'<path d="M25 36h14l-2 7H27z" fill="#20292d"/><circle cx="27.5" cy="39" r="2" fill="#3a464c"/><circle cx="36.5" cy="39" r="2" fill="#3a464c"/>':'')
  +(l.crest?'<path d="M31 12h3l2 6h-6z" fill="'+accent+'"/>':'')
  +'</svg>';
 cache.set(key,svg);return svg;
}
