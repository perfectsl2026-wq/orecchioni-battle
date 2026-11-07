import * as THREE from './vendor/three.module.js';
// V31 surface probe. Collision solids are plain boxes, but the rendered skin of a
// facade stands up to ten centimetres in front of them (plaster panels, base courses,
// cornices), so a mark placed on the collision plane was hidden inside the wall.
// At map load every opaque triangle is hashed into one-metre cells in world space;
// a mark then asks for the first rendered surface along its normal and sits on it.
const CELL=1;
const key=(x,y,z)=>((x+512)*1024+(y+512))*1024+(z+512);
export function buildProbe(root){
 const tris=[],cells=new Map(),v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];let count=0;
 root.updateMatrixWorld(true);
 root.traverse(o=>{
  if(!o.isMesh||o.isSkinnedMesh||o.isSprite||!o.visible)return;const materials=Array.isArray(o.material)?o.material:[o.material];
  if(materials.some(m=>!m||m.transparent||m.userData?.decal||m.userData?.mark))return;
  const g=o.geometry,pos=g.attributes.position;if(!pos)return;const index=g.index,n=index?index.count:pos.count;
  // Each vertex is moved to world space once, not once per triangle that shares it (same numbers, a third of the work).
  const world=new Float64Array(pos.count*3);for(let i=0;i<pos.count;i++){v[0].fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);world[i*3]=v[0].x;world[i*3+1]=v[0].y;world[i*3+2]=v[0].z;}
  for(let i=0;i<n;i+=3){
   for(let k=0;k<3;k++){const vi=(index?index.getX(i+k):i+k)*3;v[k].set(world[vi],world[vi+1],world[vi+2]);}
   const t=tris.length;tris.push(v[0].x,v[0].y,v[0].z,v[1].x,v[1].y,v[1].z,v[2].x,v[2].y,v[2].z);count++;
   const x0=Math.floor(Math.min(v[0].x,v[1].x,v[2].x)/CELL),x1=Math.floor(Math.max(v[0].x,v[1].x,v[2].x)/CELL),y0=Math.floor(Math.min(v[0].y,v[1].y,v[2].y)/CELL),y1=Math.floor(Math.max(v[0].y,v[1].y,v[2].y)/CELL),z0=Math.floor(Math.min(v[0].z,v[1].z,v[2].z)/CELL),z1=Math.floor(Math.max(v[0].z,v[1].z,v[2].z)/CELL);
   // A facade face spans 20 × 8 m (160 cells); only sheets far larger than that are left out.
   if((x1-x0+1)*(y1-y0+1)*(z1-z0+1)>2500)continue;
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){const k=key(x,y,z);let list=cells.get(k);if(!list)cells.set(k,list=[]);list.push(t);}
  }
 });
 const T=new Float32Array(tris),seen=new Set();
 // Möller–Trumbore against the triangles of the cells the short probe segment crosses.
 function hit(ox,oy,oz,dx,dy,dz,max){
  let best=max;seen.clear();const steps=Math.ceil(max/CELL)+1;
  for(let s=0;s<=steps;s++){const d=Math.min(max,s*CELL);const list=cells.get(key(Math.floor((ox+dx*d)/CELL),Math.floor((oy+dy*d)/CELL),Math.floor((oz+dz*d)/CELL)));if(!list)continue;
   for(const t of list){if(seen.has(t))continue;seen.add(t);
    const ax=T[t],ay=T[t+1],az=T[t+2],e1x=T[t+3]-ax,e1y=T[t+4]-ay,e1z=T[t+5]-az,e2x=T[t+6]-ax,e2y=T[t+7]-ay,e2z=T[t+8]-az;
    const px=dy*e2z-dz*e2y,py=dz*e2x-dx*e2z,pz=dx*e2y-dy*e2x,det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<1e-9)continue;const inv=1/det;
    const tx=ox-ax,ty=oy-ay,tz=oz-az,u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)continue;
    const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,w=(dx*qx+dy*qy+dz*qz)*inv;if(w<0||u+w>1)continue;
    const dist=(e2x*qx+e2y*qy+e2z*qz)*inv;if(dist>0&&dist<best)best=dist;}}
  return best;
 }
 // Where a mark at `point` with outward `normal` should sit: on the first rendered
 // surface found from 35 cm outside back toward the solid, else on the collision plane.
 const probe=(point,normal,reach=.35)=>{
  const ox=point.x+normal.x*reach,oy=point.y+normal.y*reach,oz=point.z+normal.z*reach,d=hit(ox,oy,oz,-normal.x,-normal.y,-normal.z,reach+.12);
  const back=d>=reach+.12?reach:d;return point.clone().addScaledVector(normal,reach-back+.004);
 };
 probe.count=count;probe.cells=cells.size;return probe;
}
