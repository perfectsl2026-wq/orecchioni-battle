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
