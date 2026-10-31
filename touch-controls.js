export function prefersTouch({coarse=false,anyCoarse=false,maxTouchPoints=0}={}){return coarse||(maxTouchPoints>0&&anyCoarse);}
export function stickAxes(dx,dy,radius=52){
 const distance=Math.hypot(dx,dy),length=Math.min(1,distance/radius),strength=Math.max(0,(length-.12)/.88);
 return {side:distance&&strength?dx/distance*strength:0,forward:distance&&strength?-dy/distance*strength:0,x:distance?dx/distance*Math.min(distance,radius):0,y:distance?dy/distance*Math.min(distance,radius):0};
}
export function requestMouseLock(element,onUnavailable){
 if(typeof element.requestPointerLock!=='function'){onUnavailable();return false;}
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
 constructor({canvas,enabled,onLook,onFire,onReload,onAim,onJump,onWeapon,onZoom,onPause,onMode,onInspect=()=>{},onFlash=()=>{},onSmoke=()=>{},onHe=()=>{},onIncendiary=()=>{},onBuy=()=>{},onInteract=()=>{}}){
  this.onInteract=onInteract;this.crouching=false;this.state=new TouchState();this.root=document.getElementById('touchcontrols');this.stick=document.getElementById('touchstick');this.knob=document.getElementById('touchknob');this.fire=document.getElementById('touchfire');this.active=false;this.enabled=false;this.onFire=onFire;this.onMode=onMode;
  const capture=(element,e)=>{e.preventDefault();e.stopPropagation();try{element.setPointerCapture(e.pointerId);}catch{}};
  this.stick.addEventListener('pointerdown',e=>{if(!this.active)return;const r=this.stick.getBoundingClientRect();if(!this.state.begin('move',e.pointerId,r.left+r.width/2,r.top+r.height/2))return;capture(this.stick,e);this.moveStick(e);});
  this.stick.addEventListener('pointermove',e=>{if(this.active){e.preventDefault();this.moveStick(e);}});
  const end=e=>{e.preventDefault();this.state.end(e.pointerId);this.paint();onFire(this.state.firing.size>0,false);};
  for(const type of ['pointerup','pointercancel','lostpointercapture']){this.stick.addEventListener(type,end);this.fire.addEventListener(type,end);canvas.addEventListener(type,e=>{if(this.enabled)end(e);});}
  canvas.addEventListener('pointerdown',e=>{if(!this.enabled||!this.active||e.clientX<innerWidth*.3)return;if(this.state.begin('look',e.pointerId,e.clientX,e.clientY))capture(canvas,e);});
  canvas.addEventListener('pointermove',e=>{if(!this.enabled||!this.active)return;const delta=this.state.update('look',e.pointerId,e.clientX,e.clientY);if(delta){e.preventDefault();onLook(delta.x,delta.y);}});
  this.fire.addEventListener('pointerdown',e=>{if(!this.active)return;const was=this.state.firing.size>0;capture(this.fire,e);this.state.begin('fire',e.pointerId);this.paint();onFire(true,!was);});
  for(const [name,callback]of [['touchreload',onReload],['touchaim',onAim],['touchjump',onJump],['touchweapon',onWeapon],['touchzoom',onZoom],['touchpause',onPause],['touchinspect',onInspect],['touchflash',onFlash],['touchsmoke',onSmoke],['touchhe',onHe],['touchincendiary',onIncendiary],['touchbuy',onBuy]])document.getElementById(name).addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(this.active)callback();});
  const interact=document.getElementById('touchinteract');interact.addEventListener('pointerdown',e=>{if(this.active){capture(interact,e);onInteract(true);}});for(const type of ['pointerup','pointercancel','lostpointercapture'])interact.addEventListener(type,e=>{e.preventDefault();onInteract(false);});
  document.getElementById('touchcrouch').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(this.active){this.crouching=!this.crouching;document.getElementById('touchcrouch').setAttribute('aria-pressed',String(this.crouching));}});
  window.addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  this.setEnabled(enabled);
 }
 moveStick(e){const a=this.state.update('move',e.pointerId,e.clientX,e.clientY,this.stick.clientWidth*.34);if(a)this.paint();}
 paint(){const a=this.state.axes;this.knob.style.transform=`translate(${a.x}px,${a.y}px)`;this.fire.classList.toggle('pressed',this.state.firing.size>0);}
 reset(){this.onInteract(false);this.crouching=false;document.getElementById('touchcrouch').setAttribute('aria-pressed','false');this.state.clear();this.paint();this.onFire(false,false);}
 setEnabled(value){this.enabled=!!value;document.documentElement.classList.toggle('touch-mode',this.enabled);this.reset();this.setActive(false);this.onMode?.(this.enabled);}
 setActive(value){const active=!!value&&this.enabled;if(active!==this.active){this.active=active;if(!active)this.reset();}this.root.hidden=!active;}
}
