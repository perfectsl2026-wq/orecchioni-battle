import * as THREE from './vendor/three.module.js';
import {box,mesh,bevel} from './graphics.js?v=39.0';

// Shared metric primitives (originally the Caldera kit; the retired V28 station
// builders are archived in archivio/v28-2). Blocks carry face-local wear UVs.
export function metricBlock(parent,mat,x,y,z,w,h,d,tile=2.2){
 const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,n=g.attributes.normal,wear=new Float32Array(uv.count*4);
 // wear = face-local metres (s,t) and face size (width,height): edge and base distance for layered materials.
 for(let i=0;i<uv.count;i++){const a=Math.abs(n.getX(i))>.5?d:w,b=Math.abs(n.getY(i))>.5?d:h;wear.set([uv.getX(i)*a,uv.getY(i)*b,a,b],i*4);uv.setXY(i,uv.getX(i)*a/tile,uv.getY(i)*b/tile);}
 g.setAttribute('wear',new THREE.BufferAttribute(wear,4));
 return mesh(g,mat,parent,x,y,z);
}
export function beam(parent,mat,a,b,width=.08,depth=width){
 const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),m=box(parent,mat,0,0,0,width,from.distanceTo(to),depth);
 m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());return m;
}
export function ring(parent,mat,x,y,z,radius,tube=.035,rotation=[Math.PI/2,0,0],arc=Math.PI*2){
 const m=mesh(new THREE.TorusGeometry(radius,tube,6,64,arc),mat,parent,x,y,z);m.rotation.set(...rotation);return m;
}
export function panel(parent,mat,x,y,z,w,h,d=.09){return bevel(parent,mat,x,y,z,w,h,d,.018);}
