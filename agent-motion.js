const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const BOT_ACCELERATION=11, BOT_BRAKING=17, BOT_RUN_SPEED=4.3;

// Work in metres/second so steering behaves the same at 30, 60 and 144 Hz.
export function accelerate(velocity,desired,dt){
 const dx=desired.x-velocity.x,dz=desired.z-velocity.z,d=Math.hypot(dx,dz);
 const braking=desired.x*velocity.x+desired.z*velocity.z<0||Math.hypot(desired.x,desired.z)<Math.hypot(velocity.x,velocity.z);
 const step=Math.min(1,(braking?BOT_BRAKING:BOT_ACCELERATION)*dt/Math.max(d,1e-8));
 velocity.x+=dx*step;velocity.z+=dz*step;return velocity;
}

// Continuous aim, including across +/- PI. No instantaneous facing changes.
export function turnToward(p,m,target,maxSpeed,dt){
 const error=Math.atan2(Math.sin(target-p.yaw),Math.cos(target-p.yaw));
 const desired=clamp(error*9,-maxSpeed,maxSpeed),alpha=1-Math.exp(-14*dt);
 m.turnRate+=(desired-m.turnRate)*alpha;
 const step=m.turnRate*dt;
 if(Math.abs(step)>Math.abs(error)&&step*error>0){p.yaw+=error;m.turnRate=0;}else p.yaw+=step;
 p.yaw=Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw));
}

// Presentation is separate from authoritative collision/shooting positions.
// A new life snaps to its spawn; ordinary movement/aim is interpolated.
export function presentAgent(view,actor,dt){
 if(!view||view.life!==actor.life||Math.hypot(view.x-actor.x,view.z-actor.z)>6){
  return {x:actor.x,y:actor.y||0,groundY:actor.groundY||0,z:actor.z,yaw:actor.yaw,pitch:actor.pitch||0,vx:0,vz:0,speed:0,duck:actor.duck||0,life:actor.life};
 }
 const alpha=1-Math.exp(-20*dt),oldX=view.x,oldZ=view.z;
 view.x+=(actor.x-view.x)*alpha;view.y+=((actor.y||0)-view.y)*alpha;view.groundY=(view.groundY||0)+((actor.groundY||0)-(view.groundY||0))*alpha;view.z+=(actor.z-view.z)*alpha;
 view.yaw+=Math.atan2(Math.sin(actor.yaw-view.yaw),Math.cos(actor.yaw-view.yaw))*alpha;
 view.duck=((view.duck||0)+((actor.duck||0)-(view.duck||0))*alpha);
 view.pitch+=((actor.pitch||0)-view.pitch)*(1-Math.exp(-16*dt));
 const blend=1-Math.exp(-10*dt),vx=(view.x-oldX)/Math.max(dt,.001),vz=(view.z-oldZ)/Math.max(dt,.001);
 view.vx+=(vx-view.vx)*blend;view.vz+=(vz-view.vz)*blend;
 const speed=actor.hp<=0?0:Math.hypot(vx,vz);
 view.speed+=(speed-view.speed)*(1-Math.exp(-10*dt));
 return view;
}

export function gaitDirection(yaw,vx,vz){
 if(Math.hypot(vx,vz)<.15)return {offset:0,reverse:false};
 const angle=Math.atan2(-vx,-vz)-yaw,relative=Math.atan2(Math.sin(angle),Math.cos(angle));
 const reverse=Math.cos(relative)<-.25;
 const offset=reverse?Math.atan2(Math.sin(relative+Math.PI),Math.cos(relative+Math.PI)):relative;
 return {offset:clamp(offset,-1.2,1.2),reverse};
}

export function locomotionWeights(speed){
 const moving=clamp(speed/.9,0,1),running=clamp((speed-2.2)/1.8,0,1);
 return {idle:1-moving,walk:moving*(1-running),run:moving*running};
}
