import * as THREE from './vendor/three.module.js';
import {wallDistance,groundHeight} from './shared.js?v=39.0';
import {label} from './graphics.js?v=39.0';
// Bomb-site identity in the Valorant/CS manner: a sprayed floor letter, a dashed
// plant boundary and a wall sign facing the site. All flush, cosmetic, no collision.
function stencil(text,{size=1024,color='#b65a35',ring=false}={}){
 const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');
 if(ring){g.strokeStyle=color;g.lineWidth=size*.018;g.setLineDash?.([size*.06,size*.045]);g.beginPath();g.arc?.(size/2,size/2,size*.46,0,Math.PI*2);g.stroke();}
 else{g.fillStyle=color;g.font='900 '+Math.round(size*.78)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,size/2,size*.54);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
export function siteMarkings(root,sites){
 for(const s of sites){
  const y=groundHeight(s.x,s.z)+.012;
  for(const [map,size]of [[stencil(s.id),2.6],[stencil('',{ring:true,color:'#c9b08a'}),s.radius*2]]){
   const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,roughness:1,opacity:.82}));
   m.rotation.x=-Math.PI/2;m.position.set(s.x,y,s.z);m.receiveShadow=true;m.userData.keep=true;root.add(m);
  }
  // Sign on the nearest wall that faces the site, above head height.
  let best=null;for(let a=0;a<4;a++){const yaw=a*Math.PI/2,dir=[Math.sin(yaw),0,Math.cos(yaw)],d=wallDistance([s.x,2.9,s.z],dir,14);if(d<14&&d>1&&(!best||d<best.d))best={d,dir,yaw};}
  if(best){const p=[s.x+best.dir[0]*(best.d-.06),2.9,s.z+best.dir[2]*(best.d-.06)];const sign=label(root,s.id+'  /  '+s.name,p[0],p[1],p[2],4.6,.82,best.yaw+Math.PI,{background:'#2d3b3f',color:'#efe4cc',font:96});sign.userData.keep=true;}
 }
}
