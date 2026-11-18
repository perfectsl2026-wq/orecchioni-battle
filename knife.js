import * as THREE from './vendor/three.module.js';
// Original 33 cm utility knife. Separate bevel faces catch real environment light.
export function createKnife(){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.rotation.x=-Math.PI/2;
 // Satin steel with restrained reflections: a mirror-bright blade took the sky's cyan and read as a flat paddle.
 // V42: dark obsidian steel, so the K-07's ice-blue facet light and gold guard read as one family with the OB-510 AVERLA.
 const steel=new THREE.MeshStandardMaterial({color:0x30383a,metalness:.82,roughness:.4,envMapIntensity:.5}),edge=new THREE.MeshStandardMaterial({color:0x6a7577,metalness:.86,roughness:.3,envMapIntensity:.7}),grip=new THREE.MeshStandardMaterial({color:0x273531,roughness:.88}),bolt=new THREE.MeshStandardMaterial({color:0x74817b,metalness:.8,roughness:.4});
 steel.name='k07-steel';edge.name='k07-edge';
 // With EFFETTO PRIME off the K-07 goes back to its light satin steel: [colour, metalness, roughness].
 steel.userData.classic=[0x5f6a68,.7,.46];edge.userData.classic=[0x8e9896,.75,.4];edge.userData.primeLook=[0x6a7577,.86,.3];grip.name='k07-grip';steel.userData.finishRole='body';grip.userData.finishRole='accent';edge.userData.finishProtected=bolt.userData.finishProtected=true;
 // V42: steel, edge and grip share one side-on projection of the knife (x across, y along) as UVs for its light mask
 // (weapon-fx.js); the blade's back face takes the right half, so its marks read the right way round.
 const lit=new Set([steel,edge,grip]),planar=(geo,x,y)=>{const p=geo.attributes.position,uv=new Float32Array(p.count*2),back=geo.userData.backFace||0;for(let i=0;i<p.count;i++){uv[i*2]=(p.getX(i)+x+.03)/.12+(i<back?.5:0);uv[i*2+1]=(p.getY(i)+y+.115)/.335;}geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));};
 const add=(geo,mat,x,y,z)=>{if([].concat(mat).some(m=>lit.has(m)))planar(geo,x,y);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.userData.ownedGeometry=true;body.add(m);return m;};
 // V47: a blade with a real shape (the diamond read as a flat paper kite): flat cheeks with a fuller milled into them,
 // a wide ground bevel to the cutting edge, a swedge running to the point and a thumb notch on the spine. x is across
 // (+x the cutting edge), y along the knife; `outline` is the sharpened contour at z 0, `flat` the cheek's border.
 const V=(x,y)=>new THREE.Vector2(x,y);
 const outline=[V(-.017,.027),V(-.017,.058),V(-.0145,.062),V(-.0145,.082),V(-.017,.086),V(-.017,.150),V(-.006,.186),V(.006,.219),V(.019,.168),V(.018,.060),V(.018,.027)];
 const flat=[V(-.014,.029),V(-.014,.057),V(-.0115,.061),V(-.0115,.083),V(-.014,.087),V(-.0135,.149),V(-.0035,.180),V(.004,.203),V(.0085,.166),V(.0075,.061),V(.0135,.029)];
 const fuller=[V(-.0075,.096),V(-.0025,.092),V(.0005,.150),V(-.0035,.162),V(-.0075,.150)];
 const T2=.0033,TF=.0012,cheeks=THREE.ShapeUtils.triangulateShape(flat,[fuller]),ring=[...flat,...fuller],floor=THREE.ShapeUtils.triangulateShape(fuller,[]),mid=V(-.0035,.128);
 const positions=[],groups=[],P=(p,z)=>new THREE.Vector3(p.x,p.y,z),n=new THREE.Vector3(),e1=new THREE.Vector3(),e2=new THREE.Vector3();
 for(const side of [-1,1]){
  const z=side*T2,zf=side*TF,up=new THREE.Vector3(0,0,side),buckets=[[],[]];
  const tri=(a,b,c,want,bucket)=>{n.crossVectors(e1.subVectors(b,a),e2.subVectors(c,a));const t=n.dot(want)<0?[a,c,b]:[a,b,c];for(const p of t)buckets[bucket].push(p.x,p.y,p.z);};
  for(const [a,b,c] of cheeks)tri(P(ring[a],z),P(ring[b],z),P(ring[c],z),up,0);
  for(const [a,b,c] of floor)tri(P(fuller[a],zf),P(fuller[b],zf),P(fuller[c],zf),up,0);
  for(let i=0;i<fuller.length;i++){const a=fuller[i],b=fuller[(i+1)%fuller.length],inward=new THREE.Vector3(mid.x-(a.x+b.x)/2,mid.y-(a.y+b.y)/2,0);tri(P(a,z),P(b,z),P(b,zf),inward,0);tri(P(a,z),P(b,zf),P(a,zf),inward,0);}
  for(let i=0;i<outline.length;i++){const k=(i+1)%outline.length;tri(P(flat[i],z),P(flat[k],z),P(outline[k],0),up,1);tri(P(flat[i],z),P(outline[k],0),P(outline[i],0),up,1);}
  for(const m of [0,1]){groups.push({start:positions.length/3,count:buckets[m].length/3,materialIndex:m});positions.push(...buckets[m]);}
  if(side<0)groups.backFace=positions.length/3;
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.userData.backFace=groups.backFace;for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);add(geometry,[steel,edge],0,0,0).name='K-07 blade';
 // Handle: one turned profile with a palm swell, a waist for the fingers and shallow grooves cut into it.
 const profile=[];for(let y=-.099;y<=.0171;y+=.0029){const t=(y+.099)/.116,groove=Math.abs(((y+.099)%.0145)-.00725)<.0016&&y>-.09&&y<.008?.0011:0;profile.push(V(.0128+.0019*Math.sin(t*Math.PI*2.1+.5)-.0006*t-groove,y));}
 const handle=add(new THREE.LatheGeometry([V(.0001,-.099),...profile,V(.0001,.0171)],14),grip,0,0,0);handle.scale.z=.67;
 // Guard: a flat bar with an upswept quillon on the edge side; pommel: a steel lanyard ring.
 const bar=new THREE.Shape([V(-.0225,.0165),V(.0235,.0165),V(.0292,.0305),V(.0252,.0318),V(.0205,.0255),V(-.0225,.0255)]),guard=new THREE.ExtrudeGeometry(bar,{depth:.017,bevelEnabled:false});guard.translate(0,0,-.0085);add(guard.toNonIndexed(),steel,0,0,0);
 add(new THREE.CylinderGeometry(.0105,.0125,.007,12),steel,0,-.1005,0).scale.z=.7;const loop=add(new THREE.TorusGeometry(.0068,.0027,6,14),steel,0,-.1052,0);loop.scale.z=.9;
 for(const y of [-.074,-.022]){const screw=add(new THREE.CylinderGeometry(.003,.003,.0205,6),bolt,0,y,0);screw.rotation.x=Math.PI/2;}
 root.name='K-07 / Utility Knife';root.userData={worldScale:1,trigger:new THREE.Vector3(),support:null,knife:true};return root;
}
// V53 strike: where the knife is, through the whole swing, in camera space (x right, y up, z toward the eye, metres;
// pitch, yaw, roll in radians, about the grip). `strike` runs 0 to 1 over the swing (0.30 s light, 0.42 s heavy);
// the hit itself is decided by the rules when the button is pressed, this is only what the hand shows.
// Light, a cut: the blade is cocked back to the right, comes across in one arc with the edge leading and the wrist
// turning it flat, carries on past the target (follow-through, down and left) and comes back underneath, not along the
// same line. Heavy, a thrust: drawn back to the hip and coiled, driven in point first, held in with a turn of the
// wrist, then pulled out. Keys on Catmull-Rom tangents, so the hand never stops dead between them.
const CUT=[
 [0,     0,0,0,             0,0,0],
 [.16,   .065,.035,.03,     .1,-.3,.45],
 [.33,   -.07,.005,-.12,    -.2,.25,-.6],
 [.46,   -.2,-.065,-.075,   -.35,.52,-1.02],
 [.60,   -.235,-.09,-.03,   -.3,.58,-1.1],
 [.80,   -.1,-.065,.012,    -.08,.2,-.4],
 [1,     0,0,0,             0,0,0]],
THRUST=[
 [0,     0,0,0,             0,0,0],
 [.26,   -.012,-.045,.095,  .17,0,.2],
 [.34,   -.016,-.04,.09,    .15,.02,.16],
 [.47,   -.088,.048,-.235,  -.28,.14,-.34],
 [.60,   -.094,.044,-.245,  -.26,.15,-.62],
 [.80,   -.04,.004,-.06,    -.08,.05,-.2],
 [1,     0,0,0,             0,0,0]];
const STRIKE_KEYS=['x','y','z','pitch','yaw','roll'];
for(const k of [CUT,THRUST])k.slope=k.map((f,i)=>f.slice(1).map((v,c)=>i===0||i===k.length-1?0:(k[i+1][c+1]-k[i-1][c+1])/(k[i+1][0]-k[i-1][0])));
export function knifeStrike(strike,heavy,out={}){
 const k=heavy?THRUST:CUT,t=Math.max(0,Math.min(1,strike));let n=1;while(n<k.length-1&&k[n][0]<t)n++;
 const a=k[n-1],b=k[n],h=b[0]-a[0],u=(t-a[0])/h,u2=u*u,u3=u2*u,h00=2*u3-3*u2+1,h10=u3-2*u2+u,h01=-2*u3+3*u2,h11=u3-u2;
 for(let c=0;c<6;c++)out[STRIKE_KEYS[c]]=h00*a[c+1]+h10*h*k.slope[n-1][c]+h01*b[c+1]+h11*h*k.slope[n][c];
 return out;
}
