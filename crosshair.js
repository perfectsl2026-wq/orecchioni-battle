// Crosshair editor with sub-pixel settings. Purely visual: the spread itself is computed by
// combat rules and never changes here. Every size lands on whole device pixels, so a hairline
// stays one physical pixel on any display and the four arms stay mirror images of each other.
const KEY='ob-crosshair-v42',OLD_KEY='ob-crosshair-v30',MAX_STORED=2048,CODE_VERSION=1,MAX_CODE=64;
const HEX=/^#[0-9a-f]{6}$/,FLAGS=['dot','outline','tee','dynamic'],B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CROSSHAIR_COLORS=['#dcefdc','#5cff73','#3fe9ff','#ffe14a','#ff5ad8','#ff4d4d'];
// [min,max,step] in CSS pixels, or as a 0-1 fraction for the two opacities.
export const CROSSHAIR_LIMITS=Object.freeze({length:[0,20,.25],thickness:[.25,6,.25],gap:[-8,20,.25],dotSize:[.25,6,.25],outlineSize:[.25,3,.25],outlineOpacity:[.1,1,.05],opacity:[.1,1,.05]});
export const DEFAULT_CROSSHAIR=Object.freeze({color:'#dcefdc',length:3.5,thickness:.5,gap:2.5,dot:false,dotSize:1,outline:true,outlineSize:.5,outlineOpacity:.6,opacity:1,tee:false,dynamic:true});
const preset=(name,patch)=>Object.freeze({name,value:Object.freeze({...DEFAULT_CROSSHAIR,...patch})});
export const CROSSHAIR_PRESETS=Object.freeze([preset('Fine',{}),
 preset('Punto e filo',{color:'#7dffb0',length:3,thickness:.25,gap:3,dot:true,dotSize:.5,outline:false}),
 preset('Classico',{length:5,thickness:1,gap:3,outlineSize:1,outlineOpacity:.7}),
 preset('Compatto',{color:'#3fe9ff',length:2.5,thickness:.75,gap:1.5,dynamic:false}),
 preset('Solo punto',{color:'#ff5ad8',length:0,dot:true,dotSize:2,dynamic:false}),
 preset('Forma a T',{color:'#ffe14a',length:4,thickness:.75,gap:2,tee:true})]);

const inRange=(x,[min,max])=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const quantize=(x,[min,max,step])=>Math.max(min,Math.min(max,+(min+Math.round((x-min)/step)*step).toFixed(2)));
const validColor=x=>typeof x==='string'&&HEX.test(x.toLowerCase());
// Clamps live input to the limits and steps.
export function sanitizeCrosshair(v={}){
 const src=v&&typeof v==='object'&&!Array.isArray(v)?v:{},out={color:validColor(src.color)?src.color.toLowerCase():DEFAULT_CROSSHAIR.color};
 for(const [key,limit] of Object.entries(CROSSHAIR_LIMITS))out[key]=typeof src[key]==='number'&&Number.isFinite(src[key])?quantize(src[key],limit):DEFAULT_CROSSHAIR[key];
 for(const key of FLAGS)out[key]=typeof src[key]==='boolean'?src[key]:DEFAULT_CROSSHAIR[key];
 return out;
}
// Stored data is untrusted: a field out of range or of the wrong type is dropped, never clamped.
function storedFields(v){
 if(!v||typeof v!=='object'||Array.isArray(v))return null;
 const out={};if(validColor(v.color))out.color=v.color;
 for(const [key,limit] of Object.entries(CROSSHAIR_LIMITS))if(inRange(v[key],limit))out[key]=v[key];
 for(const key of FLAGS)if(typeof v[key]==='boolean')out[key]=v[key];
 return out;
}
// The V30 format: whole pixels, gap measured from a fixed 3 px ring, a black 1 px outline at 72%.
function fromV30(v){
 if(!v||typeof v!=='object'||Array.isArray(v))return null;
 const pick=(x,d,min,max)=>inRange(x,[min,max])?x:d,thickness=pick(v.thickness,1,1,4);
 return {color:validColor(v.color)?v.color:CROSSHAIR_COLORS[0],length:pick(v.length,4,1,12),thickness,gap:pick(v.gap,0,-2,10)+3,dot:v.dot===true,dotSize:thickness,outline:v.outline!==false,outlineSize:1,outlineOpacity:.7,opacity:1,tee:false,dynamic:v.dynamic!==false};
}
function readStored(key){try{const s=localStorage.getItem(key);return s&&s.length<=MAX_STORED?JSON.parse(s):null;}catch{return null;}}
function saveCrosshair(value){try{localStorage.setItem(KEY,JSON.stringify(value));return true;}catch{return false;}}
export function loadCrosshair(){
 const current=storedFields(readStored(KEY));if(current)return sanitizeCrosshair(current);
 const old=fromV30(readStored(OLD_KEY));if(!old)return sanitizeCrosshair();
 const value=sanitizeCrosshair(old);if(saveCrosshair(value))try{localStorage.removeItem(OLD_KEY);}catch{}
 return value;
}

// Share code: OB plus 16 base-32 symbols, 70 bits of settings and a 10 bit check.
const CODE_FIELDS=Object.entries(CROSSHAIR_LIMITS).map(([key,[min,max,step]])=>{const top=Math.round((max-min)/step);return {key,min,step,top,bits:Math.ceil(Math.log2(top+1))};});
// CRC-10 over 5 bit symbols: any single wrong symbol is always caught.
const checksum=symbols=>{let c=0;for(const s of symbols)for(let bit=4;bit>=0;bit--){const top=(c>>9&1)^(s>>bit&1);c=(c<<1)&1023;if(top)c^=0x233;}return c;};
export function encodeCrosshair(value){
 const c=sanitizeCrosshair(value);let bits=CODE_VERSION.toString(2).padStart(4,'0');
 for(const f of CODE_FIELDS)bits+=Math.round((c[f.key]-f.min)/f.step).toString(2).padStart(f.bits,'0');
 bits+=parseInt(c.color.slice(1),16).toString(2).padStart(24,'0');
 for(const key of FLAGS)bits+=c[key]?'1':'0';
 const symbols=[];for(let i=0;i<70;i+=5)symbols.push(parseInt(bits.slice(i,i+5),2));
 const sum=checksum(symbols);symbols.push(sum>>5,sum&31);
 const text=symbols.map(s=>B32[s]).join('');return 'OB-'+text.match(/.{4}/g).join('-');
}
export function decodeCrosshair(code){
 if(typeof code!=='string'||code.length>MAX_CODE)return null;
 const text=code.toUpperCase().replace(/[\s-]/g,'');if(!/^OB[0-9A-HJKMNP-TV-Z]{16}$/.test(text))return null;
 const symbols=[...text.slice(2)].map(ch=>B32.indexOf(ch));
 if(checksum(symbols.slice(0,14))!==(symbols[14]<<5|symbols[15]))return null;
 const bits=symbols.slice(0,14).map(s=>s.toString(2).padStart(5,'0')).join('');let at=0;const take=n=>{const v=parseInt(bits.slice(at,at+n),2);at+=n;return v;};
 if(take(4)!==CODE_VERSION)return null;
 const out={};for(const f of CODE_FIELDS){const n=take(f.bits);if(n>f.top)return null;out[f.key]=+(f.min+n*f.step).toFixed(2);}
 out.color='#'+take(24).toString(16).padStart(6,'0');for(const key of FLAGS)out[key]=take(1)===1;
 return sanitizeCrosshair(out);
}

// Device-pixel layout of one crosshair around the point (cx,cy) in CSS pixels. Everything is an
// integer count of device pixels. An odd line width has a middle pixel, so its centre is the
// middle of that pixel and the hole around it must have odd width too; p carries that parity.
// With no arms the dot always shows, here and not in the saved value, so nothing is lost by
// passing through length 0. The stem of a T stops at the bar, so a negative gap never crosses it.
export function crosshairGeometry(c,dpr=1,cx=0,cy=0){
 const px=v=>Math.max(1,Math.round(v*dpr)),length=c.length>0?px(c.length):0,thickness=px(c.thickness);
 let dot=c.dot||!length?px(c.dotSize):0;if(dot&&length&&(dot^thickness)&1)dot++;
 const p=(length?thickness:dot)&1,gap=Math.max(Math.round(c.gap*dpr-p/2),-length),snap=v=>Math.floor(v*dpr-p/2+.5),near=gap+p,stem=c.tee?Math.max(near,-(thickness>>1)):near;
 return {length,thickness,dot,outline:c.outline?px(c.outlineSize):0,gap,p,stem,stemLength:near+length-stem,x:snap(cx),y:snap(cy),dpr};
}
export function applyCrosshair(el,c,dpr=1,cx=0,cy=0){
 const g=crosshairGeometry(c,dpr,cx,cy),css=n=>+(n/dpr).toFixed(6)+'px';
 for(const [k,v] of [['--ch-color',c.color],['--ch-op',c.opacity],['--ch-oa',c.outlineOpacity],['--ch-dyn',c.dynamic?1:0],['--ch-dp',css(1)],
  ['--ch-len',css(g.length)],['--ch-t',css(g.thickness)],['--ch-o',css(g.outline)],['--ch-dot',css(g.dot)],['--ch-a',css(-(g.thickness>>1))],['--ch-da',css(-(g.dot>>1))],
  ['--ch-far',css(-(g.gap+g.length))],['--ch-near',css(g.gap+g.p)],['--ch-stem',css(g.stem)],['--ch-sl',css(g.stemLength)],['--ch-ox',+(g.x/dpr-cx).toFixed(6)+'px'],['--ch-oy',+(g.y/dpr-cy).toFixed(6)+'px']])el.style.setProperty(k,v);
 el.classList.toggle('ch-dot',g.dot>0);el.classList.toggle('ch-outline',c.outline);el.classList.toggle('ch-tee',c.tee);el.classList.toggle('ch-noarms',!g.length);
 return g;
}
function buildLayers(el){
 const layer=name=>{const s=document.createElement('span');s.className=name;for(const part of ['ta','ba','la','ra','da']){const b=document.createElement('b');b.className=part;s.append(b);}return s;};
 el.replaceChildren(layer('ch-under'),layer('ch-fill'));
}

const LABELS={length:'LUNGHEZZA',thickness:'SPESSORE',gap:'DISTANZA DAL CENTRO',dotSize:'DIMENSIONE PUNTO',outlineSize:'SPESSORE CONTORNO',outlineOpacity:'OPACITÀ CONTORNO',opacity:'OPACITÀ MIRINO'};
const isFraction=key=>key==='opacity'||key==='outlineOpacity';
const readable=(key,v)=>isFraction(key)?Math.round(v*100)+'%':v.toFixed(2).replace('.',',')+' px';
const parseHex=s=>{const t=String(s).trim().replace(/^#/,'').toLowerCase();if(/^[0-9a-f]{6}$/.test(t))return '#'+t;return /^[0-9a-f]{3}$/.test(t)?'#'+[...t].map(ch=>ch+ch).join(''):null;};
const same=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);
const pixels=n=>n===1?'1 pixel reale':n+' px reali';
const flag=(el,bad)=>bad?el.setAttribute('aria-invalid','true'):el.removeAttribute('aria-invalid');

export class CrosshairEditor{
 constructor(targets){
  this.value=loadCrosshair();this.ac=new AbortController();this.frame=0;this.demoFrame=0;this.dpr=0;this.sliders={};
  const $=id=>document.getElementById(id),on=(el,type,fn,opts={})=>el.addEventListener(type,fn,{...opts,signal:this.ac.signal});this.$=$;
  const live=targets().filter(Boolean),crosshair=live.find(el=>el.id==='crosshair');
  for(const p of CROSSHAIR_PRESETS){
   const b=document.createElement('button'),thumb=document.createElement('span'),mark=document.createElement('span'),name=document.createElement('span');
   b.type='button';b.className='ch-preset';b.dataset.preset=p.name;thumb.className='ch-thumb';thumb.setAttribute('aria-hidden','true');mark.className='crosshair-preview';name.textContent=p.name;
   thumb.append(mark);b.append(thumb,name);on(b,'click',()=>{this.set({...p.value});this.say('Mirino “'+p.name+'” applicato.');});$('ch-presets').append(b);
  }
  // The live crosshair sits in the HUD, which may be hidden now, so it is centred on a probe of
  // the same box: the observer also reports the moment the HUD appears.
  const probe=this.probe=document.createElement('div');probe.className='ch-probe';probe.setAttribute('aria-hidden','true');(crosshair?.parentElement||document.body).append(probe);
  const previews=[...document.querySelectorAll('.crosshair-preview')];
  this.nodes=[...(crosshair?[{el:crosshair,host:probe}]:[]),...previews.map(el=>({el,host:el.parentElement,fixed:CROSSHAIR_PRESETS.find(p=>p.name===el.closest('[data-preset]')?.dataset.preset)?.value}))];
  for(const n of this.nodes)buildLayers(n.el);
  this.panes=previews.filter(el=>!el.closest('[data-preset]'));

  for(const box of document.querySelectorAll('.ch-rows'))for(const key of box.dataset.keys.split(' '))box.append(this.slider(key,on));
  for(const color of CROSSHAIR_COLORS){const b=document.createElement('button');b.type='button';b.style.setProperty('--swatch',color);b.dataset.color=color;b.setAttribute('aria-label','Colore '+color);on(b,'click',()=>this.set({color}));$('ch-colors').append(b);}
  for(const key of FLAGS){const input=$('ch-'+key);on(input,'change',()=>{this.set({[key]:input.checked});if(key==='dynamic'&&input.checked)this.demo();});}
  on($('ch-color'),'input',()=>this.set({color:$('ch-color').value}));
  on($('ch-hex'),'input',()=>{const color=parseHex($('ch-hex').value);flag($('ch-hex'),!color);if(color)this.set({color});});
  on($('ch-hex'),'blur',()=>{flag($('ch-hex'),false);this.sync();});
  on($('ch-reset'),'click',()=>{this.set({...DEFAULT_CROSSHAIR});this.say('Mirino predefinito ripristinato.');});
  on($('ch-copy'),'click',()=>this.copy());
  on($('ch-apply'),'click',()=>this.paste());
  on($('ch-paste'),'keydown',e=>{if(e.key==='Enter'){e.preventDefault();this.paste();}});
  on($('ch-paste'),'input',()=>{flag($('ch-paste'),false);if(this.$('ch-message').classList.contains('bad'))this.say('');});

  const later=()=>{if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.layout();});};
  on(window,'resize',later,{passive:true});if(window.visualViewport)on(window.visualViewport,'resize',later,{passive:true});
  // Layout right here, not a frame later: the observer runs before paint, so a panel or the HUD
  // never shows a frame of unset values when it appears.
  this.rearm=()=>{this.dpr=0;this.layout();};this.observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>this.layout()):null;
  if(this.observer)for(const n of this.nodes)this.observer.observe(n.host);
  // Without CSS round() the arms would snap one by one and split ties unevenly, so on those
  // browsers alone the spread is snapped once here whenever the game writes it.
  if(crosshair&&!window.CSS?.supports?.('width','round(nearest,1px,1px)')){this.live=crosshair;crosshair.classList.add('ch-snap');this.spreadWatch=new MutationObserver(()=>this.snapSpread());this.spreadWatch.observe(crosshair,{attributes:true,attributeFilter:['style']});}
  this.sync();this.layout();
 }
 slider(key,on){
  const [min,max,step]=CROSSHAIR_LIMITS[key],row=document.createElement('div'),label=document.createElement('label'),output=document.createElement('output'),line=document.createElement('div'),input=document.createElement('input'),id='ch-'+key;
  row.className='ch-row';label.htmlFor=id;label.textContent=LABELS[key]+' ';output.id=id+'-value';output.htmlFor=id;label.append(output);line.className='ch-line';
  Object.assign(input,{type:'range',id,min,max,step});
  const nudge=(sign,text)=>{const b=document.createElement('button');b.type='button';b.className='ch-step';b.textContent=sign<0?'−':'+';b.setAttribute('aria-label',text+' '+LABELS[key].toLowerCase());on(b,'click',()=>this.set({[key]:this.value[key]+sign*step}));return b;};
  on(input,'input',()=>this.set({[key]:Number(input.value)}));
  // A touch on the thumb that turns into a scroll is cancelled by the browser: undo its small jump.
  let held=null;on(input,'pointerdown',e=>{held=e.pointerType==='touch'?this.value[key]:null;},{passive:true});on(input,'pointercancel',()=>{if(held!==null)this.set({[key]:held});held=null;},{passive:true});
  line.append(nudge(-1,'Diminuisci'),input,nudge(1,'Aumenta'));row.append(label,line);this.sliders[key]={row,input,output,min,max};return row;
 }
 set(patch){this.value=sanitizeCrosshair({...this.value,...patch});saveCrosshair(this.value);this.sync();this.clearNotice();}
 // Any change makes the last message out of date, and drops a code already refused.
 clearNotice(){const field=this.$('ch-paste');if(this.$('ch-message').textContent)this.say('');if(field.hasAttribute('aria-invalid')){field.value='';flag(field,false);}}
 say(text,bad=false){const m=this.$('ch-message');m.textContent=text;m.classList.toggle('bad',bad);}
 async copy(){const code=this.$('ch-code').value;
  try{await navigator.clipboard.writeText(code);this.say('Codice copiato: invialo a chi vuoi.');}
  catch{this.$('ch-code').focus();this.$('ch-code').select();this.say('Copia non disponibile qui: il codice è selezionato, copialo a mano.',true);}}
 paste(){const field=this.$('ch-paste'),text=field.value.trim();
  if(!text){this.say('Incolla prima un codice che inizia con OB.',true);field.focus();return;}
  const value=decodeCrosshair(text);flag(field,!value);
  if(!value){this.say('Codice non valido: controlla di averlo copiato per intero. Il mirino non è cambiato.',true);return;}
  this.set(value);field.value='';this.say('Mirino applicato dal codice.');}
 // Plays the movement opening once on the sample backgrounds, so the toggle shows what it does.
 demo(){
  if(this.demoFrame||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const start=performance.now(),step=now=>{const k=(now-start)/700;
   if(k>=1||this.ac.signal.aborted){this.demoFrame=0;for(const el of this.panes)el.style.removeProperty('--gap');return;}
   const gap=3+9*Math.sin(Math.PI*k)+'px';for(const el of this.panes)el.style.setProperty('--gap',gap);this.demoFrame=requestAnimationFrame(step);};
  this.demoFrame=requestAnimationFrame(step);
 }
 // Runs on setting changes and on display changes only, never per frame.
 layout(all=true){
  const dpr=window.devicePixelRatio||1;if(dpr!==this.dpr){this.dpr=dpr;this.watch();}
  for(const n of this.nodes){if(n.fixed&&!all)continue;const r=n.host.getBoundingClientRect(),shown=r.width&&r.height;
   applyCrosshair(n.el,n.fixed||this.value,dpr,shown?r.left+r.width/2:0,shown?r.top+r.height/2:0);}
  if(this.live)this.snapSpread();
  const g=crosshairGeometry(this.value,dpr),real=this.$('ch-real');if(real)real.textContent=`Schermo ${+dpr.toFixed(2)}×: linee ${pixels(g.thickness)}${g.outline?', contorno '+pixels(g.outline):''}.`;
 }
 snapSpread(){const el=this.live,d=Math.round(((parseFloat(el.style.getPropertyValue('--gap'))||3)-3)*(this.value.dynamic?1:0)*this.dpr)/this.dpr;if(d!==this.spread){this.spread=d;el.style.setProperty('--ch-d',d+'px');}}
 // Browser zoom and moving to another display change the ratio; this query fires exactly once for it.
 watch(){this.query?.removeEventListener('change',this.rearm);if(typeof matchMedia!=='function')return;this.query=matchMedia(`(resolution:${this.dpr}dppx)`);this.query.addEventListener?.('change',this.rearm,{once:true});}
 sync(){
  const c=this.value,$=this.$,shown={dot:c.dot||c.length===0,outline:c.outline};
  for(const [key,s] of Object.entries(this.sliders)){s.input.value=c[key];s.output.textContent=readable(key,c[key]);s.input.setAttribute('aria-valuetext',readable(key,c[key]).replace(' px',' pixel'));s.input.style.setProperty('--f',(c[key]-s.min)/(s.max-s.min));}
  for(const key of FLAGS)$('ch-'+key).checked=c[key];
  for(const [key,flag] of [['dotSize','dot'],['outlineSize','outline'],['outlineOpacity','outline']]){const s=this.sliders[key];s.row.classList.toggle('off',!shown[flag]);s.input.disabled=!shown[flag];for(const b of s.row.querySelectorAll('button'))b.disabled=!shown[flag];}
  $('ch-dot').checked=shown.dot;$('ch-dot').disabled=c.length===0;
  for(const b of $('ch-colors').children)b.setAttribute('aria-pressed',String(b.dataset.color===c.color));
  $('ch-color').value=c.color;if(document.activeElement!==$('ch-hex'))$('ch-hex').value=c.color;$('ch-code').value=encodeCrosshair(c);
  for(const b of $('ch-presets').children)b.setAttribute('aria-pressed',String(same(c,CROSSHAIR_PRESETS.find(p=>p.name===b.dataset.preset).value)));
  this.layout(false);
 }
 dispose(){this.ac.abort();cancelAnimationFrame(this.frame);cancelAnimationFrame(this.demoFrame);this.frame=this.demoFrame=0;this.query?.removeEventListener('change',this.rearm);this.observer?.disconnect();this.spreadWatch?.disconnect();this.live?.classList.remove('ch-snap');this.probe.remove();}
}
