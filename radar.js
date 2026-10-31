// Tactical radar. The arena is painted once per map into an offscreen layer; each
// HUD tick only blits a player-centred, view-aligned window and draws the markers,
// instead of refilling every wall rectangle at 10 Hz.
const PX=6;
export class Radar{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.layer=null;this.key='';this.size=0;this.css=0;
  // Reading clientWidth every tick forced a layout; measure only when the window changes.
  addEventListener('resize',()=>{this.css=0;},{passive:true});}
 resize(){this.css||=this.canvas.clientWidth;const css=this.css||170,ratio=Math.min(2,window.devicePixelRatio||1),size=Math.round(css*ratio);if(size!==this.size){this.size=size;this.canvas.width=this.canvas.height=size;}}
 setMap(key,map,walls,bounds){
  if(this.key===key)return;this.key=key;this.bounds=bounds;this.span=key==='sahra'?26:key==='caldera'?19:16;
  const w=Math.ceil(bounds.x*2*PX),h=Math.ceil(bounds.z*2*PX),layer=document.createElement('canvas');layer.width=w;layer.height=h;const c=layer.getContext('2d');this.layer=layer;
  const X=x=>(x+bounds.x)*PX,Z=z=>(z+bounds.z)*PX;
  c.fillStyle='#3b5157';c.fillRect(0,0,w,h);
  // Sites first so walls sit on top of the tinted zone.
  for(const s of map.sites||[]){c.fillStyle='rgba(236,192,139,.2)';c.strokeStyle='rgba(236,192,139,.6)';c.lineWidth=2;c.beginPath();c.arc(X(s.x),Z(s.z),(s.radius||4)*PX*1.25,0,Math.PI*2);c.fill();c.stroke();}
  // CS-style reading: open ground is the light field, buildings are dark blocks
  // with a lit edge, waist-high cover is a mid tone you can see over.
  for(const v of walls){const height=v[4]-(v[6]||0),x=X(v[0]-v[2]/2),z=Z(v[1]-v[3]/2),ww=v[2]*PX,dd=v[3]*PX;
   if(height>=1.9){c.fillStyle='#132126';c.fillRect(x,z,ww,dd);c.strokeStyle='#8aa29f';c.lineWidth=1.5;c.strokeRect(x+.75,z+.75,ww-1.5,dd-1.5);}
   else{c.fillStyle='#283b40';c.fillRect(x,z,ww,dd);c.strokeStyle='#6d8582';c.lineWidth=1;c.strokeRect(x+.5,z+.5,ww-1,dd-1);}}
  this.sites=map.sites||[];
 }
 // self: {x,z,yaw}; marks: [{x,z,yaw,kind:'ally'|'enemy'|'dead',color}]; bomb: {x,z,planted}
 draw(self,marks,bomb){
  this.resize();const c=this.ctx,s=this.size,k=s/(this.span*2),b=this.bounds;if(!this.layer||!self)return;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,s,s);c.fillStyle='#0f1b20';c.fillRect(0,0,s,s);
  c.save();c.translate(s/2,s/2);c.rotate(self.yaw);c.scale(k/PX,k/PX);c.translate(-(self.x+b.x)*PX,-(self.z+b.z)*PX);
  c.imageSmoothingEnabled=true;c.drawImage(this.layer,0,0);c.restore();
  // World point to radar pixel, in the rotated frame.
  const cos=Math.cos(self.yaw),sin=Math.sin(self.yaw),at=(x,z)=>{const dx=(x-self.x)*k,dz=(z-self.z)*k;return [s/2+dx*cos-dz*sin,s/2+dx*sin+dz*cos];};
  const edge=s/2-7*(s/170),clampTo=([x,y])=>{const dx=x-s/2,dy=y-s/2,m=Math.max(Math.abs(dx),Math.abs(dy));return m>edge?[s/2+dx*edge/m,s/2+dy*edge/m,true]:[x,y,false];};
  const u=s/170;c.font='700 '+Math.round(13*u)+'px "Barlow Condensed",sans-serif';c.textAlign='center';c.textBaseline='middle';
  for(const site of this.sites){const [x,y]=clampTo(at(site.x,site.z));c.fillStyle='#0f1b20d0';c.beginPath();c.arc(x,y,8*u,0,Math.PI*2);c.fill();c.fillStyle='#ecc08b';c.fillText(site.id,x,y+.5*u);}
  if(bomb){const [x,y]=clampTo(at(bomb.x,bomb.z));c.fillStyle=bomb.planted?'#ff5a4e':'#ecc08b';c.fillRect(x-4*u,y-3*u,8*u,6*u);c.fillStyle='#0f1b20';c.fillRect(x-1*u,y-1*u,2*u,2*u);}
  for(const m of marks){const [x,y,out]=clampTo(at(m.x,m.z));c.fillStyle=m.color;
   if(m.kind==='dead'){c.strokeStyle=m.color;c.lineWidth=1.6*u;c.beginPath();c.moveTo(x-3*u,y-3*u);c.lineTo(x+3*u,y+3*u);c.moveTo(x+3*u,y-3*u);c.lineTo(x-3*u,y+3*u);c.stroke();continue;}
   if(m.kind==='enemy'){c.beginPath();c.moveTo(x,y-5*u);c.lineTo(x+5*u,y);c.lineTo(x,y+5*u);c.lineTo(x-5*u,y);c.closePath();c.fill();c.strokeStyle='#0f1b20';c.lineWidth=1.2*u;c.stroke();continue;}
   const a=m.yaw-self.yaw;c.beginPath();c.arc(x,y,(out?2.6:3.6)*u,0,Math.PI*2);c.fill();
   if(!out){c.strokeStyle=m.color;c.lineWidth=1.5*u;c.beginPath();c.moveTo(x,y);c.lineTo(x-Math.sin(a)*8*u,y-Math.cos(a)*8*u);c.stroke();}}
  // The local player is always centred and facing up, with a soft view cone.
  const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s*.42);g.addColorStop(0,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.beginPath();c.moveTo(s/2,s/2);c.arc(s/2,s/2,s*.42,-Math.PI/2-.62,-Math.PI/2+.62);c.closePath();c.fill();
  c.fillStyle='#ffffff';c.beginPath();c.moveTo(s/2,s/2-6*u);c.lineTo(s/2+4.6*u,s/2+4.6*u);c.lineTo(s/2,s/2+2.4*u);c.lineTo(s/2-4.6*u,s/2+4.6*u);c.closePath();c.fill();
 }
}
// Enemies in view of the local player or a living teammate: inside a 110° cone and
// with an unobstructed line from eye to chest. The radar shows only these.
export function spottedEnemies(self,players,wallDistance,smokeBlocks=()=>false){
 const spotted=new Set(),eyes=players.filter(v=>v.team===self.team&&v.hp>0&&!v.loading);
 for(const e of players){if(e.team===self.team||e.hp<=0||e.loading)continue;
  for(const v of eyes){const dx=e.x-v.x,dz=e.z-v.z,dy=(e.y||0)+1.2-((v.y||0)+1.6),d=Math.hypot(dx,dy,dz);if(d<.5||d>70)continue;
   const fx=-Math.sin(v.yaw),fz=-Math.cos(v.yaw);if((dx*fx+dz*fz)/Math.hypot(dx,dz)<Math.cos(.96))continue;
   const eye=[v.x,(v.y||0)+1.6,v.z];if(wallDistance(eye,[dx/d,dy/d,dz/d],d)>=d-.05&&!smokeBlocks(eye,[e.x,(e.y||0)+1.2,e.z])){spotted.add(e.id);break;}}}
 return spotted;
}
