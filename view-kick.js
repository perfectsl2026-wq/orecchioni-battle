// Visual-only springs for the first-person rig and camera. Authoritative yaw,
// pitch and hitscan never read these offsets, so feel cannot desynchronise aim.
const IMPULSES=[
 {back:.5,rise:1.5,yaw:.45,roll:.9,cam:.05,camRoll:.1},
 {back:.24,rise:.55,yaw:.3,roll:.45,cam:.025,camRoll:.06},
 {back:.5,rise:1.05,yaw:.5,roll:.8,cam:.045,camRoll:.1},
 {back:.4,rise:.8,yaw:.35,roll:.6,cam:.035,camRoll:.08},
 {back:1.05,rise:2.3,yaw:.4,roll:1.1,cam:.12,camRoll:.16},
 {back:0,rise:0,yaw:0,roll:0,cam:0,camRoll:0}
];
class Spring{
 constructor(stiffness,damping){this.k=stiffness;this.c=damping;this.x=0;this.v=0;}
 step(dt){this.v+=(-this.k*this.x-this.c*this.v)*dt;this.x+=this.v*dt;}
 reset(){this.x=this.v=0;}
}
export class ViewKick{
 constructor(){
  this.gunZ=new Spring(260,24);this.gunY=new Spring(240,22);this.gunPitch=new Spring(210,19);this.gunYaw=new Spring(190,18);this.gunRoll=new Spring(170,15);
  this.camPitch=new Spring(220,22);this.camYaw=new Spring(200,22);this.camRoll=new Spring(160,14);
  this.shakeAmount=0;this.shakeTime=0;this.gun={x:0,y:0,z:0,pitch:0,yaw:0,roll:0};this.camera={pitch:0,yaw:0,roll:0};
 }
 // `scale`: a design that is a weapon of its own kicks lighter or harder than its class (weapon-stats.js `view`).
 fire(weapon,scale=1){const k=IMPULSES[weapon]||IMPULSES[3],r=()=>Math.random()*scale-.5*scale;
  this.gunZ.v+=k.back*scale;this.gunY.v+=k.back*.18*scale;this.gunPitch.v+=k.rise*scale*(.85+Math.random()*.3);this.gunYaw.v+=r()*k.yaw;this.gunRoll.v+=r()*k.roll;
  this.camPitch.v+=k.cam*scale*(.8+Math.random()*.4);this.camYaw.v+=r()*k.cam*.6;this.camRoll.v+=r()*k.camRoll;}
 // Direction is the shot ray; the view snaps away from the side that was hit.
 hurt(direction,yaw=0,heavy=false){const s=heavy?1.5:1;let side=0;if(Array.isArray(direction)){const rx=Math.cos(yaw),rz=-Math.sin(yaw);side=-(direction[0]*rx+direction[2]*rz);}
  this.camPitch.v+=.35*s;this.camYaw.v+=side*.2*s;this.camRoll.v+=side*.35*s+(Math.random()-.5)*.1;this.gunY.v-=.25*s;this.gunRoll.v+=side*.6*s;}
 shake(amount){this.shakeAmount=Math.max(this.shakeAmount,Math.min(1,amount));this.shakeTime=0;}
 reset(){for(const s of [this.gunZ,this.gunY,this.gunPitch,this.gunYaw,this.gunRoll,this.camPitch,this.camYaw,this.camRoll])s.reset();this.shakeAmount=0;for(const o of [this.gun,this.camera])for(const k in o)o[k]=0;}
 update(dt){
  let remaining=Math.min(.1,Math.max(0,dt));while(remaining>1e-5){const h=Math.min(remaining,1/240);for(const s of [this.gunZ,this.gunY,this.gunPitch,this.gunYaw,this.gunRoll,this.camPitch,this.camYaw,this.camRoll])s.step(h);remaining-=h;}
  this.shakeTime+=dt;this.shakeAmount*=Math.exp(-2.2*dt);const a=this.shakeAmount*.022,t=this.shakeTime;
  // Spring state is in normalised units; these gains give ~2.5 cm of rifle kick-back and ~3.5° of muzzle rise.
  Object.assign(this.gun,{x:-this.gunYaw.x*.04,y:this.gunY.x*2,z:this.gunZ.x*1.7,pitch:this.gunPitch.x*1.8,yaw:this.gunYaw.x*2,roll:this.gunRoll.x*2});
  Object.assign(this.camera,{pitch:this.camPitch.x*3+a*Math.sin(t*41)*Math.sin(t*7.3),yaw:this.camYaw.x*3+a*Math.sin(t*37+1.3)*.8,roll:this.camRoll.x*2+a*Math.sin(t*29+2.1)*.6});
  return this;
 }
}
