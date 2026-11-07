const limit=(v,n)=>Math.max(-n,Math.min(n,v));
const RUN=5;
export function viewMotion(state,{x,z,y=0,groundY=0,yaw=0,pitch=0,life=0,active=true,aim=false,landedAt=0,impact=0,vy=0,calm=false},dt){
 dt=Math.min(.05,Math.max(.001,dt));
 if(state.life!==life||state.x===undefined||Math.hypot(x-state.x,z-state.z)>2){Object.assign(state,{x,z,y,yaw,pitch,life,phase:0,weight:0,turn:0,tilt:0,landing:0,landingGoal:0,landedAt,rise:0,strafe:0,breath:0});}
 const distance=Math.hypot(x-state.x,z-state.z),speed=distance/dt,height=y-groundY,ground=height<.045;
 state.phase+=distance*Math.PI/1.45;
 state.weight+=((active&&ground?Math.min(1,speed/RUN):0)-state.weight)*(1-Math.exp(-14*dt));
 const yawDelta=Math.atan2(Math.sin(yaw-state.yaw),Math.cos(yaw-state.yaw));
 state.turn+=(limit(yawDelta/dt*.005,.018)-state.turn)*(1-Math.exp(-16*dt));
 state.tilt+=(limit((pitch-state.pitch)/dt*.004,.012)-state.tilt)*(1-Math.exp(-16*dt));
 // Lateral travel leans the weapon into the strafe; a slow breathing cycle keeps a settled rig alive.
 const lateral=active?((x-state.x)*Math.cos(yaw)-(z-state.z)*Math.sin(yaw))/dt/RUN:0;
 state.strafe+=(limit(lateral,1)-state.strafe)*(1-Math.exp(-8*dt));state.breath=(state.breath||0)+dt;
 // A landing is an event from stepJump, never read from height: a stair tread is not one. It sinks in about 40 ms and is back in about 140.
 if(landedAt!==state.landedAt){state.landedAt=landedAt;state.landingGoal=Math.max(state.landingGoal,Math.min(.045,.014+impact*.005)*1.45*(calm?.4:1));}
 state.landing+=(state.landingGoal-state.landing)*(1-Math.exp(-dt/.016));state.landingGoal*=Math.exp(-dt/.055);
 // The gun trails the body's vertical speed in the air and settles once it lands.
 state.rise=(state.rise||0)+((ground?0:limit(vy*.0025,.016))-(state.rise||0))*(1-Math.exp(-14*dt));
 const fade=aim?.13:1,w=state.weight,phase=state.phase,still=(1-w)*(active?1:0),b=state.breath;
 const idleX=Math.sin(b*.83)*.0008*still*fade*(1-Math.abs(state.turn)/.018),idleY=Math.sin(b*1.57)*.0011*still*fade*(1-Math.abs(state.tilt)/.012);
 const result={camera:Math.cos(phase*2)*.003*w-state.landing,weaponX:Math.sin(phase)*.004*w*fade-state.turn*fade+idleX,weaponY:Math.cos(phase*2)*.003*w*fade-state.tilt*fade-state.rise*fade-state.landing*.6*fade+idleY,roll:-state.turn*.22*fade-state.strafe*.035*fade};
 Object.assign(state,{x,z,y,height,yaw,pitch});return result;
}
