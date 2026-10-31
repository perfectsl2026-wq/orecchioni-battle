export const JUMP={impulse:5.8,gravity:22,bufferMs:100};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const STANCE={eye:1.55,drop:.48,speed:.34,down:.22,up:.18};
export const eyeHeight=p=>STANCE.eye-STANCE.drop*clamp(p.duck||0,0,1)+(p.y||0);
export function stepStance(body,crouching,dt){
 const target=crouching?1:0,old=body.duck||0;
 body.duck=clamp(old+Math.sign(target-old)*Math.min(Math.abs(target-old),dt/(crouching?STANCE.down:STANCE.up)),0,1);
 return body.duck;
}
export function stepJump(body,dt,now,requestUntil=-Infinity){
 const floor=body.groundY||0;body.y??=floor;body.jumpV??=0;if(body.y<floor)body.y=floor;
 const launched=body.y<=floor+.0001&&now<=requestUntil;
 if(launched){const fatigue=clamp(1-(now-(body.landedAt??-1e6))/420,0,1);body.jumpV=JUMP.impulse*(1-fatigue*.22);}
 const wasAirborne=body.y>floor+.0001||body.jumpV>0;
 if(body.y>floor+.0001||body.jumpV>0){body.y=Math.max(floor,body.y+body.jumpV*dt-.5*JUMP.gravity*dt*dt);body.jumpV-=JUMP.gravity*dt;}
 if(body.y<=floor+.0001){body.jumpV=0;if(wasAirborne){body.landedAt=now;body.landingUntil=now+220;}}
 return launched;
}
export class LocalPresentation{
 constructor(){this.previous=null;this.current=null;}
 reset(p){this.previous={...p};this.current={...p};}
 step(p){if(!this.current||p.life!==this.current.life||Math.hypot(p.x-this.current.x,p.z-this.current.z)>3)this.reset(p);else{this.previous=this.current;this.current={...p};}}
 sample(alpha){if(!this.current)return null;alpha=clamp(alpha,0,1);const a=this.previous,b=this.current;return{x:a.x+(b.x-a.x)*alpha,z:a.z+(b.z-a.z)*alpha,y:(a.y||0)+((b.y||0)-(a.y||0))*alpha,groundY:(a.groundY||0)+((b.groundY||0)-(a.groundY||0))*alpha,duck:(a.duck||0)+((b.duck||0)-(a.duck||0))*alpha,life:b.life};}
}
export class WeaponSwitch{
 constructor(index=3){this.reset(index);}
 reset(index=3){this.current=this.target=index;this.amount=0;this.phase='ready';this.previous=index;this.lastWheel=-Infinity;}
 request(index){if(index===this.target)return false;this.previous=this.target;this.target=index;if(index===this.current)this.phase='draw';else this.phase='holster';return true;}
 wheel(direction,now,count){if(now-this.lastWheel<85)return null;this.lastWheel=now;return(this.target+(direction>0?1:count-1))%count;}
 update(dt){let remaining=Math.min(.1,Math.max(0,dt));
  for(let n=0;n<3&&remaining>0;n++){
   if(this.phase==='holster'){const time=(1-this.amount)*.10,step=Math.min(time,remaining);this.amount=Math.min(1,this.amount+step/.10);remaining-=step;if(this.amount>=1-1e-8){this.amount=1;this.current=this.target;this.phase='draw';}else break;}
   else if(this.phase==='draw'){const time=this.amount*.20,step=Math.min(time,remaining);this.amount=Math.max(0,this.amount-step/.20);remaining-=step;if(this.amount<=1e-8){this.amount=0;this.phase='ready';}else break;}
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
