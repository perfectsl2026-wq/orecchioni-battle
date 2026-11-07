import './legacy-storage.js?v=42.0';
export const BASE_FOV=78;
export const DEFAULT_CONTROLS=Object.freeze({sensitivity:1,ads:.85,toggleAim:false,hitmarker:true});
export function sanitizeControls(value={}){const safe=(v,d,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;return {sensitivity:safe(value?.sensitivity??1,1,.25,2.5),ads:safe(value?.ads??.85,.85,.25,1.5),toggleAim:value?.toggleAim===true,hitmarker:value?.hitmarker!==false};}
export function scopeFov(zoom=4){return 2*Math.atan(Math.tan(BASE_FOV*Math.PI/360)/(zoom===8?8:4))*180/Math.PI;}
// Constant screen-distance response as the camera zooms; no frame-rate dependent mouse smoothing.
export function mouseGain(settings,fov=BASE_FOV,aiming=false){const s=sanitizeControls(settings),projection=Math.tan(Math.max(5,Math.min(BASE_FOV,fov))*Math.PI/360)/Math.tan(BASE_FOV*Math.PI/360);return .0016*s.sensitivity*projection*(aiming?s.ads:1);}
export class ControlsPanel{
 constructor(onOpen,onClose){this.active=false;this.onOpen=onOpen;this.onClose=onClose;this.dialog=document.getElementById('controls');let stored;try{stored=JSON.parse(localStorage.getItem('ob-controls-v1')||'{}')}catch{}this.value=sanitizeControls(stored);
  for(const field of ['sensitivity','ads']){const input=document.getElementById(field);input.value=this.value[field];input.addEventListener('input',()=>{this.value=sanitizeControls({...this.value,[field]:Number(input.value)});this.update();try{localStorage.setItem('ob-controls-v1',JSON.stringify(this.value))}catch{}})}
  const toggle=document.getElementById('toggle-aim');toggle.checked=this.value.toggleAim;toggle.onchange=()=>{this.value={...this.value,toggleAim:toggle.checked};try{localStorage.setItem('ob-controls-v1',JSON.stringify(this.value))}catch{}};
  // V42: on by default. Settings saved before V42 stored the old default (off) without anyone choosing it, so they start on once.
  try{if(!localStorage.getItem('ob-controls-v42')){if(stored&&typeof stored==='object')stored.hitmarker=true;localStorage.setItem('ob-controls-v42','1');}}catch{}this.value=sanitizeControls(stored);
  const marker=document.getElementById('toggle-hitmarker'),showMarker=()=>document.documentElement.classList.toggle('show-hitmarker',this.value.hitmarker);marker.checked=this.value.hitmarker;showMarker();marker.onchange=()=>{this.value={...this.value,hitmarker:marker.checked};showMarker();try{localStorage.setItem('ob-controls-v1',JSON.stringify(this.value))}catch{}};
  document.getElementById('controls-reset').onclick=()=>{this.value={...DEFAULT_CONTROLS};for(const key of ['sensitivity','ads'])document.getElementById(key).value=this.value[key];toggle.checked=false;marker.checked=this.value.hitmarker;showMarker();this.update();try{localStorage.removeItem('ob-controls-v1')}catch{}};
  document.querySelectorAll('[data-controls]').forEach(b=>b.onclick=()=>this.open(b));document.getElementById('controls-close').onclick=()=>this.close();
  window.addEventListener('keydown',e=>{if(!this.active)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();return}if(e.code==='Tab'){const items=[...this.dialog.querySelectorAll('button,input')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}},true);this.update();
 }
 update(){for(const key of ['sensitivity','ads'])document.getElementById(key+'-value').textContent=this.value[key].toFixed(2)+'×';}
 open(opener){if(this.active)return;this.active=true;this.opener=opener;this.onOpen();this.dialog.hidden=false;document.getElementById('sensitivity').focus();}
 close(){if(!this.active)return;this.active=false;this.dialog.hidden=true;this.onClose();this.opener?.focus();}
}
