export const JUMP={impulse:5.9,gravity:17.4,bufferMs:120,coyoteMs:80};
export const LANDING={ms:220,slow:.24};
// Treads are authored as one-tick rises: the camera eases over them, the body and the shot origin never do.
export const STAIR={rate:18,reach:.24,rise:.06};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const STANCE={eye:1.55,drop:.48,speed:.34,down:.22,up:.18};
// A runner's upper body rides this much lower (full at 3 m/s): drawn by animateAgent, hit by hitZones.
export const RUN_SINK=.125;
export const eyeHeight=p=>STANCE.eye-STANCE.drop*clamp(p.duck||0,0,1)+(p.y||0);
export function stepStance(body,crouching,dt){
 const target=crouching?1:0,old=body.duck||0;
 body.duck=clamp(old+Math.sign(target-old)*Math.min(Math.abs(target-old),dt/(crouching?STANCE.down:STANCE.up)),0,1);
 return body.duck;
}
function touchDown(body,now){body.landingSpeed=Math.max(0,-(body.jumpV||0));body.jumpV=0;body.landedAt=now;body.landingUntil=now+LANDING.ms;}
export function stepJump(body,dt,now,requestUntil=-Infinity){
 const floor=body.groundY||0;body.y??=floor;body.jumpV??=0;if(body.y<floor)body.y=floor;
 const grounded=body.y<=floor+.0001;
 // move() may already have put a falling body on the floor: that is a landing too, also when a buffered press launches on this tick.
 if(grounded){if(body.jumpV<0)touchDown(body,now);body.groundedAt=now;}
 const launched=(grounded||body.jumpV<=0&&now-(body.groundedAt??-1e6)<=JUMP.coyoteMs)&&now<=requestUntil;
 if(launched){const fatigue=clamp(1-(now-(body.landedAt??-1e6))/420,0,1);body.jumpV=JUMP.impulse*(1-fatigue*.22);body.groundedAt=-1e6;}
 const wasAirborne=body.y>floor+.0001||body.jumpV>0;
 if(body.y>floor+.0001||body.jumpV>0){body.y=Math.max(floor,body.y+body.jumpV*dt-.5*JUMP.gravity*dt*dt);body.jumpV-=JUMP.gravity*dt;}
 if(body.y<=floor+.0001){if(wasAirborne)touchDown(body,now);body.jumpV=0;}
 return launched;
}
export class LocalPresentation{
 constructor(){this.previous=null;this.current=null;this.stair=0;this.stairV=0;}
 reset(p){this.previous={...p};this.current={...p};this.stair=this.stairV=0;}
 step(p,dt=1/60){if(!this.current||p.life!==this.current.life||Math.hypot(p.x-this.current.x,p.z-this.current.z)>3){this.reset(p);return;}
  const a=this.current,rise=(p.y||0)-(a.y||0);this.previous=a;this.current={...p};
  if(Math.abs(rise)>=STAIR.rise&&Math.abs(rise)<.45&&(a.y||0)-(a.groundY||0)<.002&&(p.y||0)-(p.groundY||0)<.002)this.stair=clamp(this.stair-rise,-STAIR.reach,STAIR.reach);
  this.stairV-=(STAIR.rate*STAIR.rate*this.stair+2*STAIR.rate*this.stairV)*dt;this.stair+=this.stairV*dt;this.current.stair=this.stair;
 }
 sample(alpha){if(!this.current)return null;alpha=clamp(alpha,0,1);const a=this.previous,b=this.current;return{x:a.x+(b.x-a.x)*alpha,z:a.z+(b.z-a.z)*alpha,y:(a.y||0)+((b.y||0)-(a.y||0))*alpha,groundY:(a.groundY||0)+((b.groundY||0)-(a.groundY||0))*alpha,duck:(a.duck||0)+((b.duck||0)-(a.duck||0))*alpha,stair:(a.stair||0)+((b.stair||0)-(a.stair||0))*alpha,life:b.life};}
}
export class WeaponSwitch{
 constructor(index=3){this.reset(index);}
 reset(index=3){this.current=this.target=index;this.amount=0;this.phase='ready';this.previous=index;this.lastWheel=-Infinity;}
 // `equip` is the weapon's whole draw (WEAPONS[i].equip, the host's equipUntil): .10 s down, the rest coming up, so the first shot is never refused.
 request(index,equip=.3){if(index===this.target)return false;this.draw=Math.max(.1,equip-.1);this.previous=this.target;this.target=index;if(index===this.current)this.phase='draw';else this.phase='holster';return true;}
 wheel(direction,now,count){if(now-this.lastWheel<85)return null;this.lastWheel=now;return(this.target+(direction>0?1:count-1))%count;}
 update(dt){let remaining=Math.min(.1,Math.max(0,dt));
  for(let n=0;n<3&&remaining>0;n++){
   if(this.phase==='holster'){const time=(1-this.amount)*.10,step=Math.min(time,remaining);this.amount=Math.min(1,this.amount+step/.10);remaining-=step;if(this.amount>=1-1e-8){this.amount=1;this.current=this.target;this.phase='draw';}else break;}
   else if(this.phase==='draw'){const d=this.draw||.2,time=this.amount*d,step=Math.min(time,remaining);this.amount=Math.max(0,this.amount-step/d);remaining-=step;if(this.amount<=1e-8){this.amount=0;this.phase='ready';}else break;}
   else break;
  }
  return {index:this.current,lower:this.amount*this.amount*(3-2*this.amount),ready:this.phase==='ready'};
 }
}

// Spread is an angular cone diameter. Project its radius into CSS pixels so
// the reticle remains consistent across viewport sizes, FOV and device DPR.
export function crosshairGap(spread,height,fov){
 return 3+clamp(Math.tan(Math.max(0,spread)*.5)*Math.max(1,height)/(2*Math.tan(clamp(fov,1,179)*Math.PI/360)),0,22);
}
