import * as T from './vendor/three.module.js';
// Modelled trim kit: extruded mouldings from a small set of
// profiles, reused across every facade. Coordinates are facade-local: x along the
// wall, y up, z out of the authoritative wall face. Ornament above 2.6 m may project
// like real stonework and is cosmetic for ballistics (as wires and palms already are);
// below that, trim stays within 11 cm of the shared solid so it never reads as cover.
export const ORNAMENT_HEIGHT=2.6;
const PROFILES={
 // Classical cornice: fillet, cove, ovolo and a crowning fascia; 0.17 m projection.
 cornice:[[0,0],[.025,0],[.025,.025],[.045,.035],[.06,.06],[.085,.1],[.115,.125],[.14,.14],[.17,.17],[.17,.225],[.155,.235],[.155,.265],[.175,.275],[.175,.3],[0,.3]],
 // Modern coping for contemporary blocks: crisp drip edge, 0.09 m projection.
 coping:[[0,0],[.075,0],[.075,.012],[.09,.012],[.09,.13],[0,.13]],
 // Window sill with a drip groove under the nose.
 sill:[[0,0],[.1,0],[.1,.012],[.115,.012],[.13,.02],[.135,.055],[.12,.07],[0,.075]],
 // Low string course, kept inside the ballistic envelope.
 course:[[0,0],[.04,0],[.05,.014],[.05,.05],[.04,.064],[0,.07]],
 // Console bracket profile under a cornice.
 corbel:[[0,0],[.03,0],[.05,.04],[.09,.1],[.13,.14],[.15,.2],[0,.2]]
};
const geometryCache=new Map();
function profileGeometry(name,length){
 const key=name+':'+length.toFixed(3);if(geometryCache.has(key))return geometryCache.get(key);
 const shape=new T.Shape(PROFILES[name].map(([z,y])=>new T.Vector2(z,y)));
 const g=new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,steps:1,curveSegments:1});
 g.rotateY(-Math.PI/2);g.translate(length/2,0,0);g.computeVertexNormals();geometryCache.set(key,g);return g;
}
function place(parent,material,geometry,x,y,z){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function moulding(parent,material,name,x,y,z,length){return place(parent,material,profileGeometry(name,Math.max(.05,length)),x,y,z);}
// Material.clone() drops onBeforeCompile, so a plain clone would lose the weathering
// and albedo passes of its base. Copy the shader chain, then flag it cosmetic.
export function cosmetic(base){const m=base.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;m.userData={...base.userData,nonBallistic:true};return m;}
// One material per kit role; ornament clones are flagged cosmetic for ballistics.
export function trimMaterials(base){return {base,ornament:cosmetic(base)};}
export function cornice(face,kit,width,top,{modern=false,brackets=true,spacing=1.6,face:offset=.0375}={}){
 const name=modern?'coping':'cornice',h=modern?.13:.3,mat=top-h>ORNAMENT_HEIGHT?kit.ornament:kit.base;
 moulding(face,mat,name,0,top-h,offset,width+.02);
 if(!modern&&brackets&&top-h-.2>ORNAMENT_HEIGHT)for(let u=-width/2+spacing/2;u<width/2-spacing/4;u+=spacing)moulding(face,kit.ornament,'corbel',u,top-h-.2,offset,.12);
}
export function sill(face,kit,x,y,w,offset=.045){moulding(face,y>ORNAMENT_HEIGHT?kit.ornament:kit.base,'sill',x,y-.075,offset,w);}
export function course(face,kit,width,y,offset=.0375){moulding(face,kit.base,'course',0,y,offset,width);}
// Keystone: a tapered block that breaks the arch head, proud of the surround.
const keyCache=new Map();
export function keystone(face,material,x,y,{width=.2,height=.3,depth=.09,offset=.045}={}){
 const key=[width,height,depth].join();let g=keyCache.get(key);
 if(!g){const s=new T.Shape([new T.Vector2(-width*.38,0),new T.Vector2(width*.38,0),new T.Vector2(width/2,height),new T.Vector2(-width/2,height)]);g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1});g.computeVertexNormals();keyCache.set(key,g);}
 return place(face,material,g,x,y-height*.55,offset);
}
// Flat-roof scupper (canale): a projecting spout that throws roof water clear of the wall.
export function scupper(face,material,x,y,{length=.42}={}){
 const g=new T.Group();g.position.set(x,y,0);face.add(g);
 place(g,material,new T.BoxGeometry(.16,.035,length),0,0,length/2);
 for(const side of [-1,1])place(g,material,new T.BoxGeometry(.025,.09,length),side*.0675,.045,length/2);
 return g;
}
// Downspout kept mid-wall (no corner pipes, for clean peeks).
export function downspout(face,material,x,bottom,top){
 const r=.034,z=.075,len=Math.max(.2,top-bottom),pipe=place(face,material,new T.CylinderGeometry(r,r,len,8,1,true),x,(top+bottom)/2,z);pipe.userData.pipe=true;
 for(let y=bottom+.6;y<top-.2;y+=1.6)place(face,material,new T.BoxGeometry(.11,.03,.05),x,y,.04);
 place(face,material,new T.CylinderGeometry(r*1.5,r,.12,8,1,true),x,top-.06,z);
}
