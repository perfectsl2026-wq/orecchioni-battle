import {PHRASES} from './team-signals.js?v=42.0';
export function prefersTouch({coarse=false,anyCoarse=false,maxTouchPoints=0}={}){return coarse||(maxTouchPoints>0&&anyCoarse);}
export function stickAxes(dx,dy,radius=52){
 const distance=Math.hypot(dx,dy),length=Math.min(1,distance/radius),strength=Math.max(0,(length-.12)/.88);
 return {side:distance&&strength?dx/distance*strength:0,forward:distance&&strength?-dy/distance*strength:0,x:distance?dx/distance*Math.min(distance,radius):0,y:distance?dy/distance*Math.min(distance,radius):0};
}
export function requestMouseLock(element,onUnavailable,raw=true){
 if(typeof element.requestPointerLock!=='function'){onUnavailable();return false;}
 // Raw mouse movement where the platform has it; without it the plain lock is retried before giving up on locking.
 const plain=()=>{try{element.requestPointerLock()?.catch?.(onUnavailable);}catch{onUnavailable();}};
 if(raw){try{const result=element.requestPointerLock({unadjustedMovement:true});if(result?.catch)result.catch(plain);return true;}catch{}}
 try{const result=element.requestPointerLock();result?.catch?.(onUnavailable);return true;}catch{onUnavailable();return false;}
}
// Each finger owns one action; releasing a look finger never releases fire or movement.
export class TouchState{
 constructor(){this.clear();}
 clear(){this.move=null;this.look=null;this.firing=new Set();this.axes=stickAxes(0,0);}
 begin(kind,id,x,y){
  if(kind==='fire'){this.firing.add(id);return true;}
  if(this[kind]!==null)return false;this[kind]={id,x,y};return true;
 }
 update(kind,id,x,y,radius){const p=this[kind];if(!p||p.id!==id)return null;
  if(kind==='move')return this.axes=stickAxes(x-p.x,y-p.y,radius);
  const delta={x:x-p.x,y:y-p.y};p.x=x;p.y=y;return delta;
 }
 end(id){if(this.move?.id===id){this.move=null;this.axes=stickAxes(0,0);}if(this.look?.id===id)this.look=null;this.firing.delete(id);}
}
export class TouchControls{
 constructor({canvas,enabled,onLook,onFire,onReload,onAim,onJump,onWeapon,onZoom,onPause,onMode,onInspect=()=>{},onFlash=()=>{},onSmoke=()=>{},onHe=()=>{},onIncendiary=()=>{},onBuy=()=>{},onInteract=()=>{},onBomb=()=>{},onTap=()=>{},onTake=()=>{},onPing=()=>{},onPhrase=()=>{}}){
  this.onInteract=onInteract;this.crouching=false;this.state=new TouchState();this.root=document.getElementById('touchcontrols');this.stick=document.getElementById('touchstick');this.knob=document.getElementById('touchknob');this.fire=document.getElementById('touchfire');this.active=false;this.enabled=false;this.onFire=onFire;this.onMode=onMode;
  const capture=(element,e)=>{e.preventDefault();e.stopPropagation();try{element.setPointerCapture(e.pointerId);}catch{}};
  this.stick.addEventListener('pointerdown',e=>{if(!this.active)return;const r=this.stick.getBoundingClientRect();if(!this.state.begin('move',e.pointerId,r.left+r.width/2,r.top+r.height/2))return;capture(this.stick,e);this.moveStick(e);});
  this.stick.addEventListener('pointermove',e=>{if(this.active){e.preventDefault();this.moveStick(e);}});
  const end=e=>{e.preventDefault();this.state.end(e.pointerId);this.paint();onFire(this.state.firing.size>0,false);};
  for(const type of ['pointerup','pointercancel','lostpointercapture']){this.stick.addEventListener(type,end);this.fire.addEventListener(type,end);canvas.addEventListener(type,e=>{if(this.enabled)end(e);});}
  // A short tap on the look area that barely moves is a tap (the spectator uses it to change teammate); a drag never is.
  this.tap=null;
  canvas.addEventListener('pointerdown',e=>{if(!this.enabled||!this.active||e.clientX<innerWidth*.3)return;if(this.state.begin('look',e.pointerId,e.clientX,e.clientY)){capture(canvas,e);this.tap={id:e.pointerId,x:e.clientX,y:e.clientY,t:e.timeStamp};}});
  canvas.addEventListener('pointermove',e=>{if(!this.enabled||!this.active)return;const delta=this.state.update('look',e.pointerId,e.clientX,e.clientY);if(delta){e.preventDefault();onLook(delta.x,delta.y);}if(this.tap?.id===e.pointerId&&Math.hypot(e.clientX-this.tap.x,e.clientY-this.tap.y)>12)this.tap=null;});
  canvas.addEventListener('pointerup',e=>{const t=this.tap;this.tap=null;if(this.enabled&&this.active&&t?.id===e.pointerId&&e.timeStamp-t.t<320)onTap();});
  this.fire.addEventListener('pointerdown',e=>{if(!this.active)return;const was=this.state.firing.size>0;capture(this.fire,e);this.state.begin('fire',e.pointerId);this.paint();onFire(true,!was);});
  // A second finger on the stick or the look area cancels the browser's click, and in play there nearly always is one:
  // game actions fire on press. Pause and buy open a screen, so they keep the forgiving click.
  for(const [name,callback]of [['touchreload',onReload],['touchaim',onAim],['touchjump',onJump],['touchweapon',onWeapon],['touchzoom',onZoom],['touchinspect',onInspect],['touchflash',onFlash],['touchsmoke',onSmoke],['touchhe',onHe],['touchincendiary',onIncendiary],['touchbomb',onBomb],['touchtake',onTake]]){const button=document.getElementById(name);if(!button)continue;button.addEventListener('pointerdown',e=>{if(!this.active)return;capture(button,e);callback();});button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});}
  for(const [name,callback]of [['touchpause',onPause],['touchbuy',onBuy]])document.getElementById(name).addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(this.active)callback();});
  const interact=document.getElementById('touchinteract');interact.addEventListener('pointerdown',e=>{if(this.active){capture(interact,e);onInteract(true);}});for(const type of ['pointerup','pointercancel','lostpointercapture'])interact.addEventListener(type,e=>{e.preventDefault();onInteract(false);});
  const crouch=document.getElementById('touchcrouch');crouch.addEventListener('pointerdown',e=>{if(!this.active)return;capture(crouch,e);this.crouching=!this.crouching;crouch.setAttribute('aria-pressed',String(this.crouching));});crouch.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  this.signals(canvas,onPing,onPhrase);
  window.addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  this.setEnabled(enabled);
 }
 // V53 team signals for the thumb: PING marks what the crosshair points at (an enemy when one is under it), the bubble opens
 // the six quick phrases beside it, one tap sends one. Built here so the page markup stays as it is; no per-frame work.
 signals(canvas,onPing,onPhrase){
  const make=(id,label,svg)=>{const b=Object.assign(document.createElement('button'),{id,type:'button',innerHTML:svg});b.setAttribute('aria-label',label);b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});this.root.insertBefore(b,document.getElementById('rotatehint'));return b;};
  const ping=make('touchping','Segnala ai compagni il punto che guardi','<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M12 3.2 20.8 12 12 20.8 3.2 12z"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>');
  const talk=make('touchtalk','Frasi rapide alla squadra','<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M 4 5h16v11H10l-4.5 3.8V16H4z"/><g fill="currentColor"><circle cx="8.5" cy="10.5" r="1.3"/><circle cx="12" cy="10.5" r="1.3"/><circle cx="15.5" cy="10.5" r="1.3"/></g></svg>');
  talk.setAttribute('aria-expanded','false');talk.setAttribute('aria-controls','touchphrases');
  const list=Object.assign(document.createElement('div'),{id:'touchphrases',hidden:true});list.setAttribute('role','menu');list.setAttribute('aria-label','Frasi rapide');
  list.innerHTML=PHRASES.map((t,i)=>'<button type="button" role="menuitem" data-phrase="'+i+'" style="--i:'+i+'"><kbd>'+(i+1)+'</kbd>'+t+'</button>').join('');
  this.root.insertBefore(list,document.getElementById('rotatehint'));this.talk=talk;this.phraseList=list;this.phraseTimer=0;
  // The ring plays once per press (restarted by re-adding the class); it ends on its own, nothing is polled.
  const flash=b=>{b.classList.remove('sent');void b.offsetWidth;b.classList.add('sent');};
  ping.addEventListener('animationend',()=>ping.classList.remove('sent'));
  ping.addEventListener('pointerdown',e=>{if(!this.active)return;e.preventDefault();e.stopPropagation();this.closePhrases();flash(ping);onPing();});
  talk.addEventListener('pointerdown',e=>{if(!this.active)return;e.preventDefault();e.stopPropagation();if(list.hidden)this.openPhrases();else this.closePhrases();});
  list.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-phrase]');e.preventDefault();e.stopPropagation();if(!b||!this.active)return;b.classList.add('picked');onPhrase(Number(b.dataset.phrase));setTimeout(()=>this.closePhrases(),140);});
  list.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  // Looking around (a finger on the view) closes the list: it never holds the screen in a fight.
  canvas.addEventListener('pointerdown',()=>{if(!list.hidden)this.closePhrases();});
 }
 openPhrases(){const list=this.phraseList;if(!list)return;for(const b of list.children)b.classList.remove('picked');list.hidden=false;this.talk.setAttribute('aria-expanded','true');this.talk.classList.add('open');clearTimeout(this.phraseTimer);this.phraseTimer=setTimeout(()=>this.closePhrases(),5000);}
 closePhrases(){const list=this.phraseList;if(!list||list.hidden)return;list.hidden=true;this.talk.setAttribute('aria-expanded','false');this.talk.classList.remove('open');clearTimeout(this.phraseTimer);}
 moveStick(e){const a=this.state.update('move',e.pointerId,e.clientX,e.clientY,this.stick.clientWidth*.34);if(a)this.paint();}
 paint(){const a=this.state.axes;this.knob.style.transform=`translate(${a.x}px,${a.y}px)`;this.fire.classList.toggle('pressed',this.state.firing.size>0);}
 reset(){this.closePhrases?.();this.onInteract(false);this.crouching=false;document.getElementById('touchcrouch').setAttribute('aria-pressed','false');this.state.clear();this.paint();this.onFire(false,false);}
 // Death and round changes stop the trigger but leave the stick finger where it is.
 releaseFire(){this.state.firing.clear();this.paint();this.onFire(false,false);}
 setEnabled(value){this.enabled=!!value;document.documentElement.classList.toggle('touch-mode',this.enabled);this.reset();this.setActive(false);this.onMode?.(this.enabled);}
 setActive(value){const active=!!value&&this.enabled;if(active!==this.active){this.active=active;if(!active)this.reset();}this.root.hidden=!active;}
}
