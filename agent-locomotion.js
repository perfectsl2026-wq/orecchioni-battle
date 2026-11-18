import {groundHeight} from './shared.js?v=42.0';
// Foot plants are stored in world metres. Stance never advances with the body.
const smooth=t=>t*t*(3-2*t);
export function footPlants(state,{x,z,y=0,groundY=0,yaw=0,speed=0,life=0,sole=.124,width=.145,stagger=0},dt){
 const reset=!state.feet||state.life!==life||Math.hypot(x-state.x,z-state.z)>2;
 const dx=reset?0:x-state.x,dz=reset?0:z-state.z,distance=Math.hypot(dx,dz);
 if(reset){state.phase=0;state.life=life;state.feet=[null,null];state.direction={x:-Math.sin(yaw),z:-Math.cos(yaw)};}
 state.x=x;state.z=z;
 if(distance>.00001){state.direction.x=dx/distance;state.direction.z=dz/distance;}
 const stride=.28+Math.min(1,speed/5)*.12;
 state.phase+=distance/(4*stride);
 // V52: a body that has stopped is standing at once. The drawn position eases onto its stop for about 0.4 s, a few
 // millimetres a frame, and that used to count as moving: the feet stayed frozen a stride apart all that time before the
 // settling step. Now the body is moving only above 0.3 m/s of real travel, so the trailing foot steps in as it halts.
 const direction=state.direction,c=Math.cos(yaw),s=Math.sin(yaw),moving=speed>.12&&distance>.00001&&(!(dt>1e-4)||distance>.3*dt),airborne=y-groundY>.065;
 const result=state.feet.map((f,n)=>{
  const phase=(state.phase+n*.5)%1,side=n===0?-width:width;
  // V48: an armed stance leads with the support side (left foot ahead, right foot behind).
  const ahead=.025+(n===0?stagger:-stagger*.8),centre={x:x+c*side-s*ahead,z:z-s*side-c*ahead};
  if(!f){f=state.feet[n]={x:centre.x,z:centre.z,startX:centre.x,startZ:centre.z,swing:false};}
  let lift=0;
  // V52: in the air the legs are no longer a matched pair snapped under the body. The feet ease there from where the
  // step left them (no pop at take-off) and split along the travel: the left leads and tucks higher, the right trails.
  if(airborne){const k=Math.min(1,speed/4),up=Math.min(1,(y-groundY)/.22),reach=(n===0?.05+.13*k:-.04-.11*k)*up,ease=dt>1e-4?1-Math.exp(-16*dt):1;
   const rx=f.x-(centre.x-dx),rz=f.z-(centre.z-dz);f.x=centre.x+rx+(direction.x*reach-rx)*ease;f.z=centre.z+rz+(direction.z*reach-rz)*ease;f.swing=false;f.step=false;
   lift=.055+Math.min(.13,(y-groundY)*.45)+(n===0?.05*k*up:0);}
  else if(!moving){
   // V48: a standing body steps into place, one foot at a time (it used to slide both feet under itself): a foot more than
   // 10 cm from where it belongs is lifted and set down there in a fifth of a second; small corrections ease in on the ground.
   const e=Math.hypot(centre.x-f.x,centre.z-f.z);
   if(f.step){f.stepT+=dt/.2;const t=Math.min(1,f.stepT),b=smooth(t);f.x=f.startX+(centre.x-f.startX)*b;f.z=f.startZ+(centre.z-f.startZ)*b;lift=Math.sin(Math.PI*t)*.045;if(t>=1)f.step=false;}
   else if(e>.1&&!state.feet[1-n]?.step){f.step=true;f.stepT=0;f.startX=f.x;f.startZ=f.z;}
   else if(e<=.1){const blend=1-Math.exp(-3*dt);f.x+=(centre.x-f.x)*blend;f.z+=(centre.z-f.z)*blend;}
   f.swing=false;}
  else if(phase>=.5){
   if(!f.swing){f.startX=f.x;f.startZ=f.z;f.swing=true;f.step=false;}
   const t=(phase-.5)*2,blend=smooth(t);
   f.x=f.startX+(centre.x+direction.x*stride-f.startX)*blend;
   f.z=f.startZ+(centre.z+direction.z*stride-f.startZ)*blend;
   lift=Math.sin(Math.PI*t)**2*(.065+Math.min(1,speed/5)*.05);
  }else {
   if(f.swing||!state.wasMoving){f.x=centre.x+direction.x*stride*(1-4*phase);f.z=centre.z+direction.z*stride*(1-4*phase);}
   f.swing=false;
  }
  // Recover from sharp direction changes without stretching the skeleton.
  const rx=f.x-centre.x,rz=f.z-centre.z,r=Math.hypot(rx,rz);
  if(r>.49){f.x=centre.x+rx*.49/r;f.z=centre.z+rz*.49/r;}
  return {x:f.x,y:(airborne?y:groundHeight(f.x,f.z))+sole+lift,z:f.z,planted:!airborne&&moving&&phase<.5};
 });
 state.wasMoving=moving;return result;
}
// V53 run posture: what the trunk, the shoulders and the weapon do on top of the step, so a runner is not a rigid bust
// carried by its legs. Bones only (assets.js animateAgent adds these to its own frames): aim, shots, hit zones, eye
// height and speed never read it. Angles in radians, lengths in metres, all eased so nothing starts or stops dead.
//  twist    the shoulders counter the hips on every stride (the side of the swinging leg goes back)
//  roll     the shoulder over the planted foot dips; `bank` (part of roll) leans the body into a curve
//  pitch    forward lean: more at a run, a surge forward as it starts, thrown back as it brakes, a nod on each footfall
//  hipYaw/hipRoll   more pelvis at a run
//  gun*     the weapon rides the stride at a run: it swings a little with the shoulders, cants, and is carried a few
//           degrees low; `busy` (firing, reloading, throwing: 0-1) takes all of that out, so a shooter's weapon stays on aim
//  handX/handY      the grip follows it (carried a little lower, bobbing at twice the step)
// `stepS` is the sine of the stride (positive while the left foot is planted), `stepB` its 0-1 bounce at twice the pace.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function runPosture(state,{yaw=0,vx=0,vz=0,speed=0,stepS=0,stepB=0,weapon=3,busy=0,duck=0,life=0},dt=0){
 const out=state.out??={twist:0,roll:0,bank:0,pitch:0,hipYaw:0,hipRoll:0,gunYaw:0,gunRoll:0,gunPitch:0,handX:0,handY:0};
 const forward=-(vx*Math.sin(yaw)+vz*Math.cos(yaw));
 if(state.life!==life||state.yaw===undefined||!(dt>1e-4)){Object.assign(state,{life,yaw,forward,run:0,turn:0,surge:0,free:1});if(!(dt>1e-4))return out;}
 // How much of a run this is (a walk and a crouch keep the compact posture), how free the weapon is to ride it.
 state.run+=(clamp((speed-1.7)/2.5,0,1)*(1-.65*clamp(duck,0,1))-state.run)*(1-Math.exp(-7*dt));
 {const goal=1-clamp(busy,0,1);state.free+=(goal-state.free)*(1-Math.exp(-(goal<state.free?24:4)*dt));}
 // Turn rate (rad/s) and forward acceleration (m/s2), low-passed: the lean builds over about a fifth of a second.
 const turned=Math.atan2(Math.sin(yaw-state.yaw),Math.cos(yaw-state.yaw));state.yaw=yaw;
 state.turn+=(clamp(turned/dt,-5,5)-state.turn)*(1-Math.exp(-6*dt));
 state.surge+=(clamp((forward-state.forward)/dt,-22,22)-state.surge)*(1-Math.exp(-7*dt));state.forward=forward;
 // A weapon standing still shows the true aim at once: its share follows the speed itself, not the eased run weight.
 const r=state.run,long=weapon===5?.35:weapon===0?.6:1,free=state.free*long*clamp(speed/2.2,0,1),bank=clamp(-state.turn*Math.min(speed,5.5)*.0105,-.14,.14);
 out.bank=bank;out.twist=-stepS*.2*r;out.roll=stepS*.055*r+bank;
 out.pitch=.07*r+clamp(state.surge*.0075,-.11,.1)+(stepB-.5)*.05*r;
 out.hipYaw=stepS*.07*r;out.hipRoll=stepS*.025*r;
 out.gunYaw=stepS*.09*r*free;out.gunRoll=stepS*.09*r*free-bank*.6;out.gunPitch=(.12+(stepB-.5)*.06)*r*free;
 out.handX=stepS*.022*r*free;out.handY=(-.04+(stepB-.5)*.03)*r*free;
 return out;
}
