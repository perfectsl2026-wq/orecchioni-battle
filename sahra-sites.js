import * as T from './vendor/three.module.js';
import {groundHeight,MAPS} from './shared.js?v=40.0';
import {box,label} from './graphics.js?v=40.0';
import {cosmetic} from './trim-kit.js?v=40.0';
// Flush surface inlays: the same terrain continues below the plant area.
// No fake ledges, decorative hitboxes or luminous gameplay clutter.
export function sahraSiteDetails(root,p,sites){
 for(const s of sites){
  // Inlays are flush paint and stone: cosmetic for ballistics like decals.
  const y=groundHeight(s.x,s.z),accent=cosmetic(s.id==='A'?p.copper:p.blue),paving=cosmetic(p.sitePaving);
  const group=new T.Group();group.position.set(s.x,y+.012,s.z);root.add(group);
  const disc=new T.CircleGeometry(s.radius-.16,64),uv=disc.attributes.uv,pos=disc.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+s.x)/4,(pos.getY(i)+s.z)/4);
  const plate=new T.Mesh(disc,paving);plate.rotation.x=-Math.PI/2;group.add(plate);
  const ring=new T.Mesh(new T.RingGeometry(s.radius-.11,s.radius,96),accent);ring.rotation.x=-Math.PI/2;ring.position.y=.004;group.add(ring);
  // Four direction marks leave the centre visually quiet for the bomb.
  for(let n=0;n<4;n++){
   const a=n*Math.PI/2,c=Math.cos(a),v=Math.sin(a),r=s.radius-.5;
   const dash=box(group,accent,c*r,.006,v*r,.75,.008,.12);dash.rotation.y=-a;
  }
  const tile=label(group,s.id,-.65,.012,.2,1.7,1.7,0,{background:s.id==='A'?'#aa7351':'#386c73',color:'#f3ebda',font:170});tile.rotation.x=-Math.PI/2;tile.material.userData.nonBallistic=true;
  const text=label(group,s.id==='A'?'A / MINARET':'B / RIWAQ',1,.014,.1,1.15,.3,0,{background:'#d5cfbb',color:'#394f50',font:82});text.rotation.x=-Math.PI/2;text.material.userData.nonBallistic=true;
  // Discrete bronze corner inlays continue the contemporary courtyard language.
  for(const side of [-1,1])for(const z of [-5.3,5.3]){
   const x=s.x+side*5.3,worldZ=s.z+z;
   // Keep inlays on the actual level rather than floating over a ramp.
   if(Math.abs(groundHeight(x,worldZ)-y)>.02)continue;
   box(root,accent,x,y+.008,worldZ,.7,.008,.045);
  }
 }
 // Integrated underside lights and fascia remain within each physical slab.
 for(const r of MAPS.sahra.siteRoofs.filter(r=>r.h>.3))box(root,p.lamp,r.x,r.y-r.h/2-.012,r.z+(r.site==='A'?.6:0),r.site==='A'?r.w-1.6:.055,.025,r.site==='A'?.055:r.d-1.4);
 // Rear signs sit flush on the physical back walls of each court.
 label(root,'MINARET  /  COURT A',33,5.55,-41.94,9.6,.7,0,{background:'#285760',color:'#efe8d8',font:92});
 label(root,'RIWAQ  /  COURT B',-36,4.1,-41.94,8.4,.7,0,{background:'#d8c7a8',color:'#2b5b63',font:96});
 for(const c of MAPS.sahra.siteColumns.filter((c,n,list)=>list.findIndex(o=>o.site===c.site)===n))label(root,c.site==='A'?'01':'02',c.x,groundHeight(c.x,c.z)+2.9,c.z+c.d/2+.01,c.w,.55,0,{background:'#285760',color:'#eee1c5',font:110});
}
