import * as T from './vendor/three.module.js';
import {blocked,groundHeight} from './shared.js?v=42.0';
import {box} from './graphics.js?v=42.0';
import {metricBlock as block} from './caldera-architecture.js?v=42.0';
import {cosmetic} from './trim-kit.js?v=42.0';
import {readableAlbedo,weatherMaterial,antiTile} from './surface-detail.js?v=42.0';
// Shared builder for route-graph districts (Sahra, Caldera). A map supplies its
// walkable rectangles, height field and solids; a style supplies materials and the
// architecture for each solid kind. Everything drawn here follows the shared solids.

// Tiling photographed CC0 sets (see QA-TEXTURE-V28-1.md) behind one loader, with a
// promise per texture so a map is shown only once its surfaces are resident.
const textureCache=new Map();
export function materialLibrary(){
 const pending=[],loader=new T.TextureLoader();
 // One cache across maps and rebuilds: a failed download leaves the cache, so a
 // retry fetches only what failed and reuses every texture that already arrived.
 function texture(path,color=false){
  let entry=textureCache.get(path);
  if(!entry){let yes,no;const promise=new Promise((a,b)=>{yes=a;no=b;});const t=loader.load('./assets/textures/'+path,()=>yes(t),undefined,e=>{textureCache.delete(path);no(e);});t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=16;if(color)t.colorSpace=T.SRGBColorSpace;entry={texture:t,promise};textureCache.set(path,entry);}
  pending.push(entry.promise);return entry.texture;
 }
 const surface=(family,color,contrast=.78,lift=.025,{amount=.15,floor=false,normal=.25}={})=>antiTile(readableAlbedo(weatherMaterial(new T.MeshStandardMaterial({color,map:texture(family+'_diff.webp',true),normalMap:texture(family+'_nor_gl.webp'),roughnessMap:texture(family+'_rough.webp'),normalScale:new T.Vector2(normal,normal),roughness:.94}),{amount,floor}),{contrast,lift}));
 const layer=family=>({map:texture(family+'_diff.webp',true),normalMap:texture(family+'_nor_gl.webp'),roughnessMap:texture(family+'_rough.webp')});
 return {pending,texture,surface,layer};
}
// Adaptive terrain: 1 m quads where the surface is planar and the drift field is
// smooth, 0.5 m cells at stairs, slopes, wall edges and drift gradients. Planarity
// is checked on every shared edge midpoint, so T-junctions cannot open cracks.
export function terrainMeshes(root,walls,{surfaces,stairAt,drift=()=>0,range}){
 const [x0,x1,z0,z1]=range;
 const solidOver=(x,z,s)=>walls.some(w=>(w[5]===0||w[5]===8)&&x>=w[0]-w[2]/2&&x+s<=w[0]+w[2]/2&&z>=w[1]-w[3]/2&&z+s<=w[1]+w[3]/2);
 for(const [material,select]of surfaces){
  const pos=[],uv=[],indices=[],sand=[];
  const cell=(x,z)=>{if(!select(x+.25,z+.25)||solidOver(x,z,.5))return;const n=pos.length/3,stair=stairAt(x+.25,z+.25),y=groundHeight(x+.25,z+.25)-.003;for(const [dx,dz]of [[0,0],[0,.5],[.5,0],[.5,.5]]){pos.push(x+dx,stair?y:groundHeight(x+dx,z+dz)-.003,z+dz);uv.push((x+dx)/4,(z+dz)/4);sand.push(stair?0:drift(x+dx,z+dz));}indices.push(n,n+1,n+2,n+2,n+1,n+3);
   if(stair){const along=stair.axis==='x',next=groundHeight(x+(along?.51:.25),z+(along?.25:.51))-.003;if(Math.abs(next-y)>.04){const i=pos.length/3;if(along){pos.push(x+.5,y,z,x+.5,next,z,x+.5,y,z+.5,x+.5,next,z+.5);uv.push(z/4,y/4,z/4,next/4,(z+.5)/4,y/4,(z+.5)/4,next/4);}else{pos.push(x,y,z+.5,x+.5,y,z+.5,x,next,z+.5,x+.5,next,z+.5);uv.push(x/4,y/4,(x+.5)/4,y/4,x/4,next/4,(x+.5)/4,next/4);}sand.push(0,0,0,0);indices.push(i,i+2,i+1,i+2,i+3,i+1);}}};
  const solidFree=(x,z)=>!walls.some(w=>(w[5]===0||w[5]===8)&&x+1>w[0]-w[2]/2&&x<w[0]+w[2]/2&&z+1>w[1]-w[3]/2&&z<w[1]+w[3]/2);
  for(let x=x0;x<x1;x+=1)for(let z=z0;z<z1;z+=1){
   const subs=[[0,0],[.5,0],[0,.5],[.5,.5]],coarse=subs.every(([a,b])=>select(x+a+.25,z+b+.25)&&!stairAt(x+a+.25,z+b+.25))&&solidFree(x,z);
   let ok=coarse;const h=(a,b)=>groundHeight(x+a,z+b),samples=[];
   if(ok){const c=[h(0,0),h(1,0),h(0,1),h(1,1)];ok=Math.abs(h(.5,0)-(c[0]+c[1])/2)<.002&&Math.abs(h(.5,1)-(c[2]+c[3])/2)<.002&&Math.abs(h(0,.5)-(c[0]+c[2])/2)<.002&&Math.abs(h(1,.5)-(c[1]+c[3])/2)<.002&&Math.abs(h(.5,.5)-(c[0]+c[1]+c[2]+c[3])/4)<.002;}
   if(ok){for(const a of [0,.5,1])for(const b of [0,.5,1])samples.push(drift(x+a,z+b));ok=Math.max(...samples)-Math.min(...samples)<.32;}
   if(!ok){for(const [a,b]of subs)cell(x+a,z+b);continue;}
   const n=pos.length/3;for(const [dx,dz]of [[0,0],[0,1],[1,0],[1,1]]){pos.push(x+dx,h(dx,dz)-.003,z+dz);uv.push((x+dx)/4,(z+dz)/4);sand.push(drift(x+dx,z+dz));}indices.push(n,n+1,n+2,n+2,n+1,n+3);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('drift',new T.Float32BufferAttribute(sand,1));g.setIndex(indices);g.computeVertexNormals();const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;mesh.userData.keep=true;root.add(mesh);
 }
}
// Every solid drawn by kind (or by an authored role); building blocks get facades
// only on the faces exposed to a playable route, never on a grid of hidden walls.
// Style hooks: feature, annex, car, crate, column, lowWall, pier, timber, building,
// facade (returns the face group, or null), roofCap.
export function wallMeshes(root,p,walls,style){
 let serial=0;
 for(const [x,z,w,d,h,kind,base=0,role]of walls){
  if(role){style.feature(root,p,role,x,z,w,d,h,base);continue;}
  if(kind===8){style.annex(root,p,x,z,w,d,h,base);continue;}
  if(kind===2){style.car(root,p,x,groundHeight(x,z),z,w,d);continue;}
  if(kind===1||kind===6){style.crate(root,p,x,z,w,d,h,base,kind===6);continue;}
  if(kind===7){style.column(root,p,x,z,w,d,h,base);continue;}
  if(kind===5){style.lowWall(root,p,x,z,w,d,h,base);continue;}
  if(kind===4){style.pier(root,p,x,z,w,d,h,base);continue;}
  if(kind===3){style.timber(root,p,x,z,w,d,h,base);continue;}
  style.building(root,p,x,z,w,d,h,base);
  for(const [horizontal,side,extent]of [[true,-1,w],[true,1,w],[false,-1,d],[false,1,d]]){
   const a=horizontal?x-w/2:z-d/2;let start=null;
   for(let i=0;i<=Math.round(extent/2);i++){
    const end=i===Math.round(extent/2),along=a+i*2+1,fx=horizontal?along:x+side*(w/2+.18),fz=horizontal?z+side*(d/2+.18):along,open=!end&&!blocked(fx,fz,.04);
    if(open&&start===null)start=a+i*2;
    if(!open&&start!==null){const length=a+i*2-start,mid=start+length/2;style.facade(horizontal?mid:x+side*w/2,horizontal?z+side*d/2:mid,length,h,horizontal?(side===1?0:Math.PI):(side===1?Math.PI/2:-Math.PI/2),serial++);start=null;}
   }
  }
  style.roofCap?.(root,p,x,z,w,d,h);
 }
}
// Elliptical arch panel: one contour, so nothing is left on the floor under the opening.
export function arched(width,spring,rise,height,depth){const s=new T.Shape();s.moveTo(-width/2,spring);s.absellipse(0,spring,width/2,rise,Math.PI,0,true);s.lineTo(width/2,height);s.lineTo(-width/2,height);s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:24});g.translate(0,0,-depth/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.2,uv.getY(i)/2.2);return g;}
// Arches carry absolute springing heights; vaults use their own closed geometry.
export function portals(root,p,arches,{material,vault,trim}){
 for(const a of arches){const geometry=a.vault?vault(a):arched(a.width,a.spring-(a.base||0),a.rise,a.height-(a.base||0),a.depth),portal=new T.Mesh(geometry,material);portal.position.set(a.x,a.vault?0:a.base||0,a.z);if(a.axis==='x')portal.rotation.y=Math.PI/2;portal.castShadow=portal.receiveShadow=true;root.add(portal);trim?.(root,p,a);}
}
// Rendered ballistic slabs (roofs, canopies). Under covered interiors: cosmetic
// beams across each slab and one warm practical under its centre.
export function slabs(root,p,boxes,{interiorAt,beam,light,slab='stone',hang=null}){
 const lightMat=new T.MeshStandardMaterial({color:light?.color??0xffe7b3,emissive:light?.emissive??0xffdf9a,emissiveIntensity:light?.intensity??.55,roughness:.75}),beamMat=cosmetic(beam);lightMat.userData.nonBallistic=true;
 for(const b of boxes.filter(b=>b.render!==false))block(root,p[b.material]||p[slab],b.x,b.y,b.z,b.w,b.h,b.d,2.2);
 for(const b of boxes.filter(b=>b.material===slab&&interiorAt(b.x,b.z))){
  const under=b.y-b.h/2,alongX=b.w>=b.d;
  for(let u=-(alongX?b.w:b.d)/2+1.2;u<(alongX?b.w:b.d)/2-.6;u+=2.4)box(root,beamMat,b.x+(alongX?u:0),under-.09,b.z+(alongX?0:u),alongX?.2:b.w,.18,alongX?b.d:.2);
  if(hang)hang(b.x,under-.18,b.z);else box(root,lightMat,b.x,under-.24,b.z,.6,.11,.24);
 }
}
