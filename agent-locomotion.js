import {groundHeight} from './shared.js?v=38.2';
// Foot plants are stored in world metres. Stance never advances with the body.
const smooth=t=>t*t*(3-2*t);
export function footPlants(state,{x,z,y=0,groundY=0,yaw=0,speed=0,life=0,sole=.124},dt){
 const reset=!state.feet||state.life!==life||Math.hypot(x-state.x,z-state.z)>2;
 const dx=reset?0:x-state.x,dz=reset?0:z-state.z,distance=Math.hypot(dx,dz);
 if(reset){state.phase=0;state.life=life;state.feet=[null,null];state.direction={x:-Math.sin(yaw),z:-Math.cos(yaw)};}
 state.x=x;state.z=z;
 if(distance>.00001){state.direction.x=dx/distance;state.direction.z=dz/distance;}
 const stride=.28+Math.min(1,speed/4.3)*.12;
 state.phase+=distance/(4*stride);
 const direction=state.direction,c=Math.cos(yaw),s=Math.sin(yaw),moving=speed>.12&&distance>.00001,airborne=y-groundY>.065;
 const result=state.feet.map((f,n)=>{
  const phase=(state.phase+n*.5)%1,side=n===0?-.145:.145;
  const centre={x:x+c*side-s*.025,z:z-s*side-c*.025};
  if(!f){f=state.feet[n]={x:centre.x,z:centre.z,startX:centre.x,startZ:centre.z,swing:false};}
  let lift=0;
  if(airborne){f.x=centre.x;f.z=centre.z;f.swing=false;lift=.055;}
  else if(!moving){const blend=1-Math.exp(-10*dt);f.x+=(centre.x-f.x)*blend;f.z+=(centre.z-f.z)*blend;f.swing=false;}
  else if(phase>=.5){
   if(!f.swing){f.startX=f.x;f.startZ=f.z;f.swing=true;}
   const t=(phase-.5)*2,blend=smooth(t);
   f.x=f.startX+(centre.x+direction.x*stride-f.startX)*blend;
   f.z=f.startZ+(centre.z+direction.z*stride-f.startZ)*blend;
   lift=Math.sin(Math.PI*t)**2*(.065+Math.min(1,speed/4.3)*.05);
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
