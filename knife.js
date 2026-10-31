import * as THREE from './vendor/three.module.js';
// Original 31 cm utility knife. Separate bevel faces catch real environment light.
export function createKnife(){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.rotation.x=-Math.PI/2;
 // Satin steel with restrained reflections: a mirror-bright blade took the sky's cyan and read as a flat paddle.
 const steel=new THREE.MeshStandardMaterial({color:0x5f6a68,metalness:.7,roughness:.46,envMapIntensity:.45}),edge=new THREE.MeshStandardMaterial({color:0x8e9896,metalness:.75,roughness:.4,envMapIntensity:.5}),grip=new THREE.MeshStandardMaterial({color:0x273531,roughness:.88}),black=new THREE.MeshStandardMaterial({color:0x101d20,roughness:.75}),bolt=new THREE.MeshStandardMaterial({color:0x74817b,metalness:.8,roughness:.4});
 steel.userData.finishRole='body';grip.userData.finishRole='accent';edge.userData.finishProtected=black.userData.finishProtected=bolt.userData.finishProtected=true;
 const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.userData.ownedGeometry=true;body.add(m);return m;};
 // Diamond cross section: a central spine and four ground cutting bevels.
 const outline=[[-.018,.025],[.018,.025],[.017,.15],[.0,.213],[-.019,.147]],positions=[],groups=[];
 for(const side of [-1,1]){const start=positions.length/3;for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],v=[[0,.102,side*.0033],[...a,0],[...b,0]];if(side<0)v.reverse();for(const p of v)positions.push(...p);}groups.push({start,count:15,materialIndex:side>0?0:1});}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);add(geometry,[steel,edge],0,0,0);
 const handle=add(new THREE.CylinderGeometry(.013,.015,.116,12),grip,0,-.041,0);handle.scale.z=.67;
 for(let y=-.086;y<.012;y+=.013){const m=add(new THREE.TorusGeometry(.0138,.0016,4,12),black,0,y,0);m.rotation.x=Math.PI/2;m.scale.y=.67;}
 add(new THREE.BoxGeometry(.057,.008,.018),steel,0,.021,0);add(new THREE.BoxGeometry(.027,.010,.017),steel,0,-.103,0);
 for(const y of [-.074,-.022]){const screw=add(new THREE.CylinderGeometry(.003,.003,.019,6),bolt,0,y,0);screw.rotation.x=Math.PI/2;}
 root.name='K-07 / Utility Knife';root.userData={worldScale:1,trigger:new THREE.Vector3(),support:null,knife:true};return root;
}
