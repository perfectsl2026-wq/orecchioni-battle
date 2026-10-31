// Frame pacing: keeps the cadence even instead of letting the GPU hover around the
// display budget, which shows as micro-stutter. Only the interval between frames is
// used: it is what the player sees, while GPU timers overlap work on Apple GPUs and
// overstate the cost. Two levers, in order: the render scale (a multiplier on the
// native pixel ratio, in steps) and, on fast displays that cannot be held even at
// the smallest scale, a half-rate cadence (every second vsync, so a steady 60 on 120).
const RATES=[60,75,90,120,144,165,240];
export class FramePacing{
 constructor({steps=[1,.9,.8,.7,.6],settleMs=700,windowMs=500,upAfterMs=5000,missRatio=1.6,start=0}={}){
  this.steps=steps;this.settleMs=settleMs;this.windowMs=windowMs;this.upAfterMs=this.baseUpAfterMs=upAfterMs;this.missRatio=missRatio;this.fast=0;this.lastDown=-Infinity;this.failedRaises=0;this.ceiling=0;this.cleanStreak=0;this.badWindows=0;this.unlockMs=60000;this.locks=0;
  this.step=Math.max(0,Math.min(steps.length-1,start|0));this.half=false;this.refresh=0;this.budget=1000/60;
  this.onChange=null;this.enabled=true;this.samples=[];this.lastAccepted=-1;this.lastChange=-Infinity;this.lastUp=-Infinity;this.windowStart=-1;this.frames=0;this.misses=0;this.cleanMs=0;this.tick=0;this.changes=0;
 }
 get scale(){return this.steps[this.step];}
 // The display rate is learnt from the shortest common interval of the first frames;
 // later, intervals clearly shorter than the budget reveal a faster display.
 learn(elapsed){
  if(elapsed<=0||elapsed>60)return;
  if(this.refresh){if(elapsed<this.budget*.7){if(++this.fast>=3)this.setRate(1000/elapsed);}else this.fast=0;return;}
  this.samples.push(elapsed);if(this.samples.length<90)return;
  const sorted=[...this.samples].sort((a,b)=>a-b);this.setRate(1000/sorted[Math.floor(sorted.length*.1)]);this.samples.length=0;
 }
 setRate(rate){this.refresh=RATES.reduce((best,r)=>Math.abs(r-rate)<Math.abs(best-rate)?r:best,60);this.budget=1000/this.refresh;this.fast=0;}
 // Called on every animation frame. Returns false when this vsync is skipped (half rate).
 frame(t,adapt=true){
  this.tick++;if(this.half&&this.tick%2)return false;
  const previous=this.lastAccepted;this.lastAccepted=t;if(previous<0)return true;
  const elapsed=t-previous;if(elapsed>250){this.windowStart=t;this.frames=this.misses=0;return true;}
  this.learn(this.half?elapsed/2:elapsed);
  if(!adapt||!this.enabled){this.windowStart=t;this.frames=this.misses=0;this.cleanMs=0;return true;}
  const budget=this.budget*(this.half?2:1);this.frames++;if(elapsed>budget*this.missRatio)this.misses++;
  if(this.windowStart<0)this.windowStart=t;if(t-this.windowStart<this.windowMs)return true;
  const missRate=this.misses/Math.max(1,this.frames);this.windowStart=t;this.frames=this.misses=0;
  if(t-this.lastChange<this.settleMs)return true;
  // A level is dropped only on sustained misses (two windows above 15 %): a lone hitch from a
  // kill feed, a garbage collection or a screenshot must not cost resolution.
  if(missRate>.15){this.cleanMs=this.cleanStreak=0;if(++this.badWindows>=2){this.badWindows=0;this.down(t);}return true;}
  this.badWindows=0;
  this.cleanMs+=this.windowMs;this.cleanStreak+=this.windowMs;
  // A clean stretch lifts the lock: the heavy zone is behind us.
  if(this.cleanStreak>=this.unlockMs&&this.ceiling){this.ceiling=0;this.failedRaises=0;this.upAfterMs=this.baseUpAfterMs;}
  if(this.cleanMs>=this.upAfterMs){this.cleanMs=0;this.up(t);}
  return true;
 }
 down(t){
  // A drop right after a raise means that level is not sustainable: wait longer next time,
  // and after two failed raises stop trying that level for a while (a minute, then longer each time).
  if(t-this.lastUp<6000){this.upAfterMs=Math.min(30000,this.upAfterMs*2);if(++this.failedRaises>=2&&!this.ceiling){this.ceiling=this.half?this.steps.length:this.step+1;if(this.locks++)this.unlockMs=Math.min(600000,this.unlockMs*2);}}
  if(this.step<this.steps.length-1)this.step++;else if(!this.half&&this.refresh>=100)this.half=true;else return;
  this.lastChange=this.lastDown=t;this.changes++;this.onChange?.(this);
 }
 up(t){
  // A long clean stretch earns back the base raise delay.
  if(t-(this.lastDown??-Infinity)>20000){this.upAfterMs=this.baseUpAfterMs;this.failedRaises=0;}
  if(this.half&&this.ceiling<=this.steps.length-1)this.half=false;else if(!this.half&&this.step>this.ceiling)this.step--;else return;
  this.lastChange=this.lastUp=t;this.changes++;this.onChange?.(this);
 }
 describe(){return Math.round(this.scale*100)+'%'+(this.half?' · '+(this.refresh/2)+' Hz':this.refresh?' · '+this.refresh+' Hz':'');}
}
