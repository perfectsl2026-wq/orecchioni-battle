import {refineForge} from './arena-refinement.js?v=39.0';
import * as T from './vendor/three.module.js';
import {WALLS,ARCHES} from './shared.js?v=39.0';
import {box,cyl,mesh,label,mergeStatic,bevel} from './graphics.js?v=39.0';
import {metricBlock as block} from './caldera-architecture.js?v=39.0';
import {arched} from './district-builder.js?v=39.0';
import {createAtmosphere} from './atmosphere.js?v=39.0';
import {readableAlbedo} from './surface-detail.js?v=39.0';
import {placeArchitecture} from './architecture-assets.js?v=39.0';
import {StreetProps,roofClutter,reskin,coverSkin,forgeWallDress} from './street-props.js?v=39.0';
import {MAPS} from './shared.js?v=39.0';
const loader=new T.TextureLoader();
// Painted steel wainscot in bays, with a flashing on top and a dark kick plate: the walls read at human scale.
function forgeCladding(root,p){
 for(const side of [-1,1]){
  for(let u=-15;u<=15;u+=6){block(root,p.cladding,u,1.2,side*(19.5-.025),5.9,2.4,.05,3);box(root,p.steel,u,2.43,side*(19.5-.03),5.9,.06,.06);box(root,p.dark,u,.09,side*(19.5-.03),5.9,.18,.06);}
  for(let u=-14.5;u<=14.5;u+=5.8){block(root,p.cladding,side*(17.5-.025),1.2,u,.05,2.4,5.7,3);box(root,p.steel,side*(17.5-.03),2.43,u,.06,.06,5.7);box(root,p.dark,side*(17.5-.03),.09,u,.06,.18,5.7);}
 }
}
export function createForge(scene,renderer,{capture=true}={}){
 const root=new T.Group();root.name='FORGE / Alpine Hydroelectric Station';scene.add(root);const pending=[];
 function texture(path,color=false){let yes,no;pending.push(new Promise((a,b)=>{yes=a;no=b}));const t=loader.load(path,yes,undefined,no);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=16;if(color)t.colorSpace=T.SRGBColorSpace;return t;}
 // V28.1: board-formed concrete walls and a worn poured floor replace the flat plaster scan.
 const plaster=texture('./assets/textures/v28/concrete_wall_008_diff.webp',true),normal=texture('./assets/textures/v28/concrete_wall_008_nor_gl.webp');
 const floorMap=texture('./assets/textures/v28/concrete_floor_worn_001_diff.webp',true),floorNormal=texture('./assets/textures/v28/concrete_floor_worn_001_nor_gl.webp');
 const concreteRough=texture('./assets/textures/v28/concrete_wall_008_rough.webp'),floorRough=texture('./assets/textures/v28/concrete_floor_worn_001_rough.webp'),rock=texture('./assets/textures/v14/rock_face_03_diff.webp',true),rockNormal=texture('./assets/textures/v14/rock_face_03_nor_gl.webp');
 const mat=(color,r=.8,m=0)=>new T.MeshStandardMaterial({color,roughness:r,metalness:m});
 const plateMap=texture('./assets/textures/v14/blue_metal_plate_diff.webp',true),plateNormal=texture('./assets/textures/v14/blue_metal_plate_nor_gl.webp'),plateRough=texture('./assets/textures/v14/blue_metal_plate_rough.webp');
 const claddingMap=texture('./assets/textures/v28/corrugated_iron_diff.webp',true),claddingNormal=texture('./assets/textures/v28/corrugated_iron_nor_gl.webp'),claddingRough=texture('./assets/textures/v28/corrugated_iron_rough.webp');
 const p={cladding:new T.MeshStandardMaterial({color:0x7f9ea3,map:claddingMap,normalMap:claddingNormal,roughnessMap:claddingRough,normalScale:new T.Vector2(.9,.9),roughness:1,metalness:.3}),plate:new T.MeshStandardMaterial({color:0x9ea7a3,map:plateMap,normalMap:plateNormal,roughnessMap:plateRough,normalScale:new T.Vector2(.5,.5),roughness:1,metalness:.35}),boltHead:Object.assign(new T.MeshStandardMaterial({color:0x6d7a7d,metalness:.75,roughness:.45}),{userData:{nonBallistic:true}}),concrete:readableAlbedo(new T.MeshStandardMaterial({color:0xe4e2d8,map:plaster,roughnessMap:concreteRough,normalMap:normal,normalScale:new T.Vector2(.55,.55),roughness:.94}),{contrast:.9,lift:.05}),floor:readableAlbedo(new T.MeshStandardMaterial({color:0xd6d8d0,map:floorMap,roughnessMap:floorRough,normalMap:floorNormal,normalScale:new T.Vector2(.14,.14),roughness:.93}),{contrast:.6,lift:.055}),white:mat(0xd0d5cc),steel:mat(0x71858a,.5,.35),copper:mat(0xa67d5b,.53,.48),dark:mat(0x273e46,.9),black:mat(0x192a30,.75),stripe:mat(0xc29a56),glass:mat(0x597b85,.22,.35)};
 const atmosphere=createAtmosphere(scene,renderer);atmosphere.sun.color.set(0xfff0df);atmosphere.sun.intensity=2.75;scene.add(new T.HemisphereLight(0xd6e8ee,0xc1b39b,.35));
 block(root,p.floor,0,-.15,0,37,.3,41,3.2);
 // The playable solids exactly match collision and hitscan; all fittings below
 // head height sit within 6 cm of their parent surface.
 const sp=new StreetProps();
 let building=0;
 for(const w of WALLS){const[x,z,width,depth,h,kind]=w;
  if(width>20||depth>20){block(root,p.concrete,x,h/2,z,width,h,depth,3.4);box(root,p.copper,x,h+.08,z,width,.16,depth);continue;}
  if(width===6&&depth===9){
   block(root,p.concrete,x,h/2,z,width,h,depth,2.8);box(root,p.dark,x,.34,z,width+.035,.68,depth+.035);
   for(const side of [-1,1]){
    const face=new T.Group();face.position.set(x,0,z+side*depth/2);face.rotation.y=side>0?0:Math.PI;root.add(face);
    box(face,p.dark,0,1.4,.018,1.65,2.8,.035);box(face,p.steel,0,1.38,.04,1.53,2.7,.032);box(face,p.copper,0,1.39,.061,.035,2.68,.012);
    for(const sy of [.2,.31,.42])box(face,p.black,0,sy,.062,.85,.035,.012);
    for(const sx of [-2.65,2.65]){box(face,p.copper,sx,h/2,.028,.11,h,.05);for(const sy of [1.2,3.2,5.2])box(face,p.dark,sx,sy,.055,.16,.07,.014);}
    label(face,'TURBINE / '+String(++building).padStart(2,'0'),0,3.03,.043,2.7,.25,0,{background:'#d0d5ce',color:'#33474c',font:75});
    const ring=new T.Mesh(new T.TorusGeometry(1.35,.06,8,72),p.copper);ring.position.set(0,5.28,.028);face.add(ring);
    const disk=cyl(face,p.dark,0,5.28,.021,1.29,.035,'z',1.29,64);disk.castShadow=false;
    for(let i=0;i<16;i++){const angle=i*Math.PI/8;const slat=box(face,p.steel,Math.sin(angle)*.73,5.28+Math.cos(angle)*.73,.047,.11,1.13,.025);slat.rotation.z=-angle-.26;}
    cyl(face,p.copper,0,5.28,.065,.22,.035,'z',.22,24);
   }
   for(const side of [-1,1])for(const zz of [-2.85,0,2.85]){box(root,p.dark,x+side*(width/2+.012),4.5,z+zz,.025,1.8,1.8);box(root,p.glass,x+side*(width/2+.028),4.5,z+zz,.028,1.66,1.65);box(root,p.steel,x+side*(width/2+.045),4.5,z+zz,.015,.045,1.68);}
   box(root,p.steel,x,h+.09,z,width+.18,.18,depth+.18);box(root,p.white,x,h+.30,z,width+.3,.12,depth+.3);
   for(const zz of [-2.8,2.8]){cyl(root,p.steel,x,h+.85,z+zz,1.45,1.15,'y',1.45,48);cyl(root,p.dark,x,h+1.44,z+zz,1.32,.03,'y',1.32,48);for(let n=-5;n<=5;n++)box(root,p.copper,x+n*.22,h+1.47,z+zz,.075,.055,Math.sqrt(Math.max(0,1.6-n*n*.048))*2);}
  }else if(kind===1){coverSkin(sp,'pod',{x,z,w:width,d:depth,top:h,base:0,fallback:()=>{if(!placeArchitecture(root,'caldera-cargo',x,z,width,depth,h,{signage:false}))bevel(root,p.steel,x,h/2,z,width,h,depth,.035);}});}
  else if(kind===3){bevel(root,p.white,x,h/2,z,width,h,depth,.045);
   // Lid: a chequered steel plate with corner bolts and two lifting lugs (all cosmetic for shots).
   block(root,p.plate,x,h+.014,z,width-.18,.028,depth-.18,.9);for(const sx of [-1,1])for(const sz of [-1,1])cyl(root,p.boltHead,x+sx*(width/2-.22),h+.035,z+sz*(depth/2-.22),.03,.02,'y',.03,8);
   for(const sx of [-1,1]){box(root,p.boltHead,x+sx*(width*.28),h+.06,z,.14,.07,.04);box(root,p.boltHead,x+sx*(width*.28),h+.11,z,.04,.1,.04);}for(const side of [-1,1]){box(root,p.dark,x,h*.54,z+side*(depth/2+.012),width-.22,h-.20,.025);for(let i=-3;i<=3;i++)box(root,p.steel,x+i*.67,h*.54,z+side*(depth/2+.03),.42,h-.30,.02);label(root,'FORGE / FLOW CONTROL',x,h*.54,z+side*(depth/2+.045),2.9,.25,side>0?0:Math.PI,{background:'#344950',color:'#dfe3d4',font:68});}}
  else if(kind===4){box(root,p.steel,x,h/2,z,width,h,depth);cyl(root,p.copper,x,h+.07,z,.58,.14,'y',.58,32);}
  else if(kind===2){if(reskin(sp,'forge',x,z,width,depth,h,0))continue;coverSkin(sp,'pod',{x,z,w:width,d:depth,top:h,base:0,fallback:()=>{bevel(root,p.steel,x,h/2,z,width,h,depth,.035);for(const side of [-1,1]){box(root,p.dark,x,h*.52,z+side*(depth/2+.025),width-.12,h-.15,.04);for(let n=-5;n<=5;n++)box(root,p.copper,x+n*.26,h*.52,z+side*(depth/2+.05),.1,h-.25,.015);}}});}
  else{block(root,p.concrete,x,h/2,z,width,h,depth,2.5);box(root,p.copper,x,h+.08,z,width+.05,.16,depth+.05);}
 }
 for(const a of ARCHES){const portal=mesh(arched(a.width,a.spring,a.rise,a.height,a.depth),p.concrete,root,a.x,0,a.z);portal.rotation.y=Math.PI/2;for(const sign of [-1,1])label(root,a.x<0?'INTAKE / A':'CONTROL / B',a.x+sign*(a.depth/2+.035),3.8,a.z,3.6,.32,sign>0?Math.PI/2:-Math.PI/2,{background:'#31464d',color:'#e1dfcf',font:72});}
 // Copper service bridges sit overhead, leaving the full combat lanes clear.
 for(const z of [-7,7]){
  box(root,p.steel,0,8.5,z,23,.20,1.45);for(const side of [-1,1]){box(root,p.copper,0,9.3,z+side*.73,23,.065,.065);for(let x=-11;x<=11;x+=1.38)box(root,p.copper,x,8.9,z+side*.73,.05,.8,.05);}
  for(const x of [-10,10]){const strut=box(root,p.steel,x,7.6,z,.10,2.2,.1);strut.rotation.z=x<0?-.38:.38;}
 }
 for(const side of [-1,1]){label(root,'FORGE / ALPINE HYDRO 11',0,4.5,side*19.48,8.8,.8,side>0?Math.PI:0,{background:'#cbd1cb',color:'#354c52',font:88});for(const x of [-5.8,5.8])box(root,p.stripe,x,.008,side*15.5,.11,.012,5.8);const marking=label(root,side<0?'NORTH / INTAKE':'SOUTH / CONTROL',0,.012,side*16.8,4.0,.35,0,{background:'#a4b0aa',color:'#405252',font:65});marking.rotation.x=-Math.PI/2;}
 // Original deterministic alpine terrain outside the sealed playable courtyard.
 const terrain=new T.PlaneGeometry(240,240,112,112);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),r=Math.hypot(x,z),ridge=Math.abs(Math.sin(x*.063+z*.041)+Math.sin(x*.027-z*.085)*.65);pos.setY(i,r<29?-.35:(Math.min(1,(r-29)/22)*(8+ridge*13)-.35));}terrain.computeVertexNormals();
 rock.repeat.set(15,15);rockNormal.repeat.set(15,15);const mountain=readableAlbedo(new T.MeshStandardMaterial({color:0x8d9d9c,map:rock,normalMap:rockNormal,normalScale:new T.Vector2(.3,.3),roughness:.98}),{contrast:.6,lift:.05});const previousMountain=mountain.onBeforeCompile;mountain.onBeforeCompile=shader=>{previousMountain.call(mountain,shader);shader.vertexShader='varying vec3 mountainPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmountainPoint=position;');shader.fragmentShader='varying vec3 mountainPoint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.79,.79),smoothstep(18.0,27.0,mountainPoint.y+sin(mountainPoint.x*.25)*2.0));');};mountain.customProgramCacheKey=()=>'forge-alpine-v19';const landscape=new T.Mesh(terrain,mountain);landscape.receiveShadow=true;scene.add(landscape);
 refineForge(root,p);root.userData.materials=p;root.userData.portalCount=ARCHES.length;mergeStatic(root);
 // V38 street dressing on the turbine-hall roofs; the service trailers are drawn by the vehicle re-skin above.
 // Corrugated service cladding along the perimeter, flush within 5 cm of the wall.
 forgeCladding(root,p);forgeWallDress(sp);roofClutter(sp,MAPS.forge,{walkable:(x,z)=>Math.abs(x)<17&&Math.abs(z)<19,maxHeight:8,minArea:30,seed:11});pending.push(sp.build(root));
 root.userData.ready=Promise.all(pending).then(()=>{if(!capture||!renderer)return;const cube=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType}),cam=new T.CubeCamera(.1,160,cube);cam.position.set(0,3.4,0);scene.add(cam);cam.update(renderer,scene);scene.remove(cam);const pm=new T.PMREMGenerator(renderer),env=pm.fromCubemap(cube.texture);scene.environment=env.texture;scene.environmentIntensity=.7;cube.dispose();pm.dispose();atmosphere.environment.dispose();root.userData.environment=env;});return root;
}
