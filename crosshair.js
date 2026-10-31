// Crosshair editor, as competitive players expect it: colour, arm length, thickness,
// centre gap, dot, outline and whether movement/spray opens the arms. Purely visual:
// the spread itself is computed by combat rules and never changes here.
const KEY='ob-crosshair-v30';
export const CROSSHAIR_COLORS=['#dcefdc','#5cff73','#3fe9ff','#ffe14a','#ff5ad8','#ff4d4d'];
export const DEFAULT_CROSSHAIR=Object.freeze({color:'#dcefdc',length:4,thickness:1,gap:0,dot:false,outline:true,dynamic:true});
export function sanitizeCrosshair(v={}){const n=(x,d,min,max)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Math.round(Number(x)))):d;
 return {color:CROSSHAIR_COLORS.includes(v?.color)?v.color:DEFAULT_CROSSHAIR.color,length:n(v?.length,4,1,12),thickness:n(v?.thickness,1,1,4),gap:n(v?.gap,0,-2,10),dot:v?.dot===true,outline:v?.outline!==false,dynamic:v?.dynamic!==false};}
export function applyCrosshair(el,c){
 for(const [k,v]of [['--ch-color',c.color],['--ch-len',c.length+'px'],['--ch-thick',c.thickness+'px'],['--ch-gap',c.gap+'px'],['--ch-dyn',c.dynamic?1:0]])el.style.setProperty(k,v);
 el.classList.toggle('ch-dot',c.dot);el.classList.toggle('ch-outline',c.outline);
}
export class CrosshairEditor{
 constructor(targets){
  this.targets=targets;let stored;try{stored=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}this.value=sanitizeCrosshair(stored);
  const swatches=document.getElementById('ch-colors');
  for(const color of CROSSHAIR_COLORS){const b=document.createElement('button');b.type='button';b.style.setProperty('--swatch',color);b.setAttribute('aria-label','Colore '+color);b.onclick=()=>this.set({color});swatches.append(b);}
  for(const key of ['length','thickness','gap']){const input=document.getElementById('ch-'+key);input.addEventListener('input',()=>this.set({[key]:Number(input.value)}));}
  for(const key of ['dot','outline','dynamic']){const input=document.getElementById('ch-'+key);input.addEventListener('change',()=>this.set({[key]:input.checked}));}
  document.getElementById('ch-reset').onclick=()=>this.set({...DEFAULT_CROSSHAIR});
  this.sync();
 }
 set(patch){this.value=sanitizeCrosshair({...this.value,...patch});try{localStorage.setItem(KEY,JSON.stringify(this.value));}catch{}this.sync();}
 sync(){const c=this.value;for(const el of this.targets())applyCrosshair(el,c);
  for(const key of ['length','thickness','gap']){document.getElementById('ch-'+key).value=c[key];document.getElementById('ch-'+key+'-value').textContent=c[key]+' px';}
  for(const key of ['dot','outline','dynamic'])document.getElementById('ch-'+key).checked=c[key];
  for(const b of document.getElementById('ch-colors').children)b.setAttribute('aria-pressed',String(b.style.getPropertyValue('--swatch')===c.color));}
}
