const limit=(v,n)=>Math.max(-n,Math.min(n,v));
export function viewMotion(state,{x,z,y=0,groundY=0,yaw=0,pitch=0,life=0,active=true,aim=false},dt){
 dt=Math.min(.05,Math.max(.001,dt));
 if(state.life!==life||state.x===undefined||Math.hypot(x-state.x,z-state.z)>2){Object.assign(state,{x,z,y,yaw,pitch,life,phase:0,weight:0,turn:0,tilt:0,landing:0,strafe:0,breath:0});}
 const distance=Math.hypot(x-state.x,z-state.z),speed=distance/dt,height=y-groundY,ground=height<.045;
 state.phase+=distance*Math.PI/.8;
 state.weight+=((active&&ground?Math.min(1,speed/4.3):0)-state.weight)*(1-Math.exp(-14*dt));
 const yawDelta=Math.atan2(Math.sin(yaw-state.yaw),Math.cos(yaw-state.yaw));
 state.turn+=(limit(yawDelta/dt*.005,.018)-state.turn)*(1-Math.exp(-16*dt));
 state.tilt+=(limit((pitch-state.pitch)/dt*.004,.012)-state.tilt)*(1-Math.exp(-16*dt));
 // Lateral travel leans the weapon into the strafe; a slow breathing cycle keeps a settled rig alive.
 const lateral=active?((x-state.x)*Math.cos(yaw)-(z-state.z)*Math.sin(yaw))/dt/4.3:0;
 state.strafe+=(limit(lateral,1)-state.strafe)*(1-Math.exp(-8*dt));state.breath=(state.breath||0)+dt;
 if(ground&&state.height>.045)state.landing=Math.min(.022,.012+state.height*.12);
 state.landing*=Math.exp(-20*dt);
 const fade=aim?.13:1,w=state.weight,phase=state.phase,still=(1-w)*(active?1:0),b=state.breath;
 const idleX=Math.sin(b*.83)*.0008*still*fade*(1-Math.abs(state.turn)/.018),idleY=Math.sin(b*1.57)*.0011*still*fade*(1-Math.abs(state.tilt)/.012);
 const result={camera:Math.cos(phase*2)*.003*w-state.landing,weaponX:Math.sin(phase)*.004*w*fade-state.turn*fade+idleX,weaponY:Math.cos(phase*2)*.003*w*fade-state.tilt*fade-state.landing*.6+idleY,roll:-state.turn*.22*fade-state.strafe*.035*fade};
 Object.assign(state,{x,z,y,height,yaw,pitch});return result;
}
