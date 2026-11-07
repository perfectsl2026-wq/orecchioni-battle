import {refineForge} from './arena-refinement.js?v=42.0';
import {forgeDetailMaterials,generatorFaces,pillarDress,steam,forgeFloor,forgeWallRelief,hallWindow,serviceBridge,plantCover} from './forge-detail.js?v=42.0';
import * as T from './vendor/three.module.js';
import {WALLS,ARCHES} from './shared.js?v=42.0';
import {box,cyl,mesh,label,mergeStatic,bevel} from './graphics.js?v=42.0';
import {metricBlock as block} from './caldera-architecture.js?v=42.0';
import {arched} from './district-builder.js?v=42.0';
import {createAtmosphere} from './atmosphere.js?v=42.0';
import {readableAlbedo,antiTile} from './surface-detail.js?v=42.0';
import {placeArchitecture} from './architecture-assets.js?v=42.0';
import {StreetProps,roofClutter,forgeWallDress} from './street-props.js?v=42.0';
import {forgeDress,manholes,FORGE_PYLONS} from './detail-dress.js?v=42.0';
import {MAPS} from './shared.js?v=42.0';
import {addHorizon,liteWorld} from './horizon.js?v=42.0';
const loader=new T.TextureLoader();
// Painted steel wainscot in bays, with a flashing on top and a dark kick plate: the walls read at human scale.
function forgeCladding(root,p){
 for(const side of [-1,1]){
  for(let u=-15;u<=15;u+=6){block(root,p.cladding,u,1.2,side*(19.5-.025),5.9,2.4,.05,3);box(root,p.steel,u,2.43,side*(19.5-.03),5.9,.06,.06);box(root,p.dark,u,.09,side*(19.5-.03),5.9,.18,.06);}
  for(let u=-14.5;u<=14.5;u+=5.8){block(root,p.cladding,side*(17.5-.025),1.2,u,.05,2.4,5.7,3);box(root,p.steel,side*(17.5-.03),2.43,u,.06,.06,5.7);box(root,p.dark,side*(17.5-.03),.09,u,.06,.18,5.7);}
 }
}
// One terrain formula for the slopes, the pylons and the larches: the ramp out of the courtyard
// keeps its height (the dams stand on it), ridged octaves raise real peaks beyond it.
const ridged=(x,z)=>{let s=0,a=1,f=.021;for(let i=0;i<4;i++){const n=Math.sin(x*f+z*f*.63+i*1.7)+Math.sin(x*f*.57-z*f*1.31+i*2.9)*.7;s+=a*(1-Math.min(1,Math.abs(n)/1.25));a*=.52;f*=2.03;}return s;};
// V44b (desktop): a valley opens due north, outside the courtyard, so the arch dam reads from play height.
const valley=(x,z,r)=>{if(liteWorld())return 0;const a=Math.atan2(z,x)+Math.PI/2;return Math.exp(-((a/.3)**2))*Math.min(1,Math.max(0,(r-34)/22));};
const terrainAt=(x,z)=>{const r=Math.hypot(x,z);if(r<29)return -.35;const ridge=Math.abs(Math.sin(x*.063+z*.041)+Math.sin(x*.027-z*.085)*.65),t=Math.min(1,Math.max(0,(r-54)/58)),peak=ridged(x,z);return (Math.min(1,(r-29)/22)*(8+ridge*13)+t*t*(3-2*t)*peak*peak*22)*(1-.84*valley(x,z,r))-.35;};
// Conductors between the pylons, sagging; thin lines are enough at 80 m.
function powerLine(root){
 const m=new T.LineBasicMaterial({color:0x2c3336});m.userData.nonBallistic=true;const pts=[];
 for(let i=0;i<FORGE_PYLONS.length-1;i++){const [ax,az]=FORGE_PYLONS[i],[bx,bz]=FORGE_PYLONS[i+1],len=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/len,nz=(bx-ax)/len;
  for(const [off,lift] of [[-6.6,37],[6.6,37],[-5,31],[5,31],[-6.6,25],[6.6,25]])for(let k=0;k<16;k++){for(const t of [k/16,(k+1)/16]){const ya=terrainAt(ax,az)+lift,yb=terrainAt(bx,bz)+lift;pts.push(ax+(bx-ax)*t+nx*off,ya+(yb-ya)*t-4*4*t*(1-t)*1.1,az+(bz-az)*t+nz*off);}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));const lines=new T.LineSegments(g,m);lines.frustumCulled=false;root.add(lines);
}
export function createForge(scene,renderer,{capture=true}={}){
 const root=new T.Group();root.name='FORGE / Alpine Hydroelectric Station';scene.add(root);const pending=[];
 function texture(path,color=false){let yes,no;pending.push(new Promise((a,b)=>{yes=a;no=b}));const t=loader.load(path,yes,undefined,no);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=16;if(color)t.colorSpace=T.SRGBColorSpace;return t;}
 // V28.1: board-formed concrete walls and a worn poured floor replace the flat plaster scan.
 const wall=liteWorld()?'v28/concrete_wall_008':'v44/forge_concrete',plaster=texture('./assets/textures/'+wall+'_diff.webp',true),normal=texture('./assets/textures/'+wall+'_nor_gl.webp');
 const floorMap=texture('./assets/textures/v28/concrete_floor_worn_001_diff.webp',true),floorNormal=texture('./assets/textures/v28/concrete_floor_worn_001_nor_gl.webp');
 const concreteRough=texture('./assets/textures/'+wall+'_rough.webp'),floorRough=texture('./assets/textures/v28/concrete_floor_worn_001_rough.webp'),rock=texture('./assets/textures/v14/rock_face_03_diff.webp',true),rockNormal=texture('./assets/textures/v14/rock_face_03_nor_gl.webp');
 const mat=(color,r=.8,m=0)=>new T.MeshStandardMaterial({color,roughness:r,metalness:m});
 const plateMap=texture('./assets/textures/v14/blue_metal_plate_diff.webp',true),plateNormal=texture('./assets/textures/v14/blue_metal_plate_nor_gl.webp'),plateRough=texture('./assets/textures/v14/blue_metal_plate_rough.webp');
 const claddingMap=texture('./assets/textures/v28/corrugated_iron_diff.webp',true),claddingNormal=texture('./assets/textures/v28/corrugated_iron_nor_gl.webp'),claddingRough=texture('./assets/textures/v28/corrugated_iron_rough.webp');
 const p={cladding:new T.MeshStandardMaterial({color:new T.Color(.44,.62,.66),map:claddingMap,normalMap:claddingNormal,roughnessMap:claddingRough,normalScale:new T.Vector2(.42,.42),roughness:1,metalness:.1}),plate:new T.MeshStandardMaterial({color:0x9ea7a3,map:plateMap,normalMap:plateNormal,roughnessMap:plateRough,normalScale:new T.Vector2(.5,.5),roughness:1,metalness:.35}),boltHead:Object.assign(new T.MeshStandardMaterial({color:0x6d7a7d,metalness:.75,roughness:.45}),{userData:{nonBallistic:true}}),concrete:readableAlbedo(new T.MeshStandardMaterial({color:new T.Color(1.16,1.24,1.62),map:plaster,roughnessMap:concreteRough,normalMap:normal,normalScale:new T.Vector2(.55,.55),roughness:.94}),{contrast:.9,lift:.05}),floor:readableAlbedo(new T.MeshStandardMaterial({color:new T.Color(2.15,2.1,2),map:floorMap,roughnessMap:floorRough,normalMap:floorNormal,normalScale:new T.Vector2(.14,.14),roughness:.93}),{contrast:.6,lift:.055}),white:mat(0xd0d5cc),steel:mat(0x71858a,.5,.35),copper:mat(0xa67d5b,.53,.48),dark:mat(0x273e46,.9),black:mat(0x192a30,.75),stripe:mat(0xc29a56),glass:mat(0x597b85,.22,.35)};
 forgeDetailMaterials(p);antiTile(p.concrete);Object.assign(p.concrete.userData,{faceWear:true,layered:true});antiTile(p.floor,{scale:.53});
 const atmosphere=createAtmosphere(scene,renderer);atmosphere.sun.color.set(0xfff0df);atmosphere.sun.intensity=2.75;scene.add(new T.HemisphereLight(0xd6e8ee,0xc1b39b,.35));
 block(root,p.floor,0,-.15,0,37,.3,41,3.2);
 // The playable solids exactly match collision and hitscan; all fittings below
 // head height sit within 6 cm of their parent surface.
 const sp=new StreetProps();
 let building=0;
 for(const w of [...WALLS,...(MAPS.forge.decks||[])]){const[x,z,width,depth,h,kind]=w;
  if(width>20||depth>20){block(root,p.concrete,x,h/2,z,width,h,depth,3.4);box(root,p.copper,x,h+.08,z,width,.16,depth);continue;}
  if(width===6&&depth===9){
   block(root,p.concrete,x,h/2,z,width,h,depth,2.8);box(root,p.dark,x,.34,z,width+.035,.68,depth+.035);
   const accent=z<0?p.accentN:p.accentS;
   for(const side of [-1,1]){
    const face=new T.Group();face.position.set(x,0,z+side*depth/2);face.rotation.y=side>0?0:Math.PI;root.add(face);
    box(face,p.dark,0,1.4,.018,1.65,2.8,.035);box(face,p.steel,0,1.38,.04,1.53,2.7,.032);box(face,p.copper,0,1.39,.061,.035,2.68,.012);
    for(const sy of [.2,.31,.42])box(face,p.black,0,sy,.062,.85,.035,.012);
    for(const sx of [-2.65,2.65]){box(face,p.copper,sx,h/2,.028,.11,h,.05);for(const sy of [1.2,3.2,5.2])box(face,p.dark,sx,sy,.055,.16,.07,.014);}
    label(face,'TURBINE / '+String(++building).padStart(2,'0'),0,3.03,.043,2.7,.25,0,{background:'#d0d5ce',color:'#33474c',font:75});
    const ring=new T.Mesh(new T.TorusGeometry(1.35,.06,8,72),p.copper);ring.position.set(0,5.28,.028);face.add(ring);
    const disk=cyl(face,accent,0,5.28,.021,1.29,.035,'z',1.29,64);disk.castShadow=false;box(face,p.reliefSteel,0,2.83,.05,2,.1,.1);box(face,p.reliefDark,0,.012,.03,1.9,.02,.06);
    for(let i=0;i<16;i++){const angle=i*Math.PI/8;const slat=box(face,p.steel,Math.sin(angle)*.73,5.28+Math.cos(angle)*.73,.047,.11,1.13,.025);slat.rotation.z=-angle-.26;}
    cyl(face,p.copper,0,5.28,.065,.22,.035,'z',.22,24);
   }
   for(const side of [-1,1])for(const zz of [-2.85,0,2.85]){box(root,p.dark,x+side*(width/2+.012),4.5,z+zz,.025,1.8,1.8);box(root,p.glass,x+side*(width/2+.028),4.5,z+zz,.028,1.66,1.65);box(root,p.steel,x+side*(width/2+.045),4.5,z+zz,.015,.045,1.68);hallWindow(root,p,x+side*width/2,4.5,z+zz,side);}
   box(root,p.steel,x,h+.09,z,width+.18,.18,depth+.18);box(root,p.white,x,h+.30,z,width+.3,.12,depth+.3);
   for(const zz of [-2.8,2.8]){cyl(root,p.steel,x,h+.85,z+zz,1.45,1.15,'y',1.45,48);cyl(root,p.dark,x,h+1.44,z+zz,1.32,.03,'y',1.32,48);for(let n=-5;n<=5;n++)box(root,p.copper,x+n*.22,h+1.47,z+zz,.075,.055,Math.sqrt(Math.max(0,1.6-n*n*.048))*2);}
  }else if(kind===1||kind===2){plantCover(root,p,x,z,width,depth,h,z<0?p.accentN:p.accentS);}
  else if(kind===3){bevel(root,p.white,x,h/2,z,width,h,depth,.045);
   // Lid: a chequered steel plate with corner bolts and two lifting lugs (all cosmetic for shots).
   block(root,p.plate,x,h+.014,z,width-.18,.028,depth-.18,.9);for(const sx of [-1,1])for(const sz of [-1,1])cyl(root,p.boltHead,x+sx*(width/2-.22),h+.035,z+sz*(depth/2-.22),.03,.02,'y',.03,8);
   for(const sx of [-1,1]){box(root,p.boltHead,x+sx*(width*.28),h+.06,z,.14,.07,.04);box(root,p.boltHead,x+sx*(width*.28),h+.11,z,.04,.1,.04);}generatorFaces(root,p,x,z,width,depth,h,label,true);
   // Steps at both ends, the same rise as the deck's ground rule: chequered treads on painted risers.
   for(const side of [-1,1])for(let n=1;n<4;n++){const top=h*(4-n)/4,cx=x+side*(width/2+.15+(n-1)*.3);block(root,p.white,cx,top/2,z,.3,top,depth,.9);block(root,p.plate,cx,top+.012,z,.28,.024,depth-.12,.9);box(root,p.heat,cx+side*.151,top-.03,z,.006,.03,depth-.3);}}
  else if(kind===4){box(root,p.steel,x,h/2,z,width,h,depth);pillarDress(root,p,x,z,h);}
  else{block(root,p.concrete,x,h/2,z,width,h,depth,2.5);box(root,p.copper,x,h+.08,z,width+.05,.16,depth+.05);}
 }
 for(const a of ARCHES){const portal=mesh(arched(a.width,a.spring,a.rise,a.height,a.depth),p.concrete,root,a.x,0,a.z);portal.rotation.y=Math.PI/2;for(const sign of [-1,1])label(root,a.x<0?'INTAKE / A':'CONTROL / B',a.x+sign*(a.depth/2+.035),3.8,a.z,3.6,.32,sign>0?Math.PI/2:-Math.PI/2,{background:a.x<0?'#2f6a6e':'#7a5f2c',color:'#eef0e4',font:72});}
 // Copper service bridges sit overhead, leaving the full combat lanes clear.
 for(const z of [-7,7])serviceBridge(root,p,z,7.4);
 for(const side of [-1,1]){label(root,'FORGE / IDRO ALPINA 11',0,4.5,side*19.48,8.8,.8,side>0?Math.PI:0,{background:'#cbd1cb',color:'#354c52',font:88});for(const x of [-5.8,5.8])box(root,side<0?p.accentN:p.accentS,x,.008,side*15.5,.11,.012,5.8);box(root,side<0?p.accentN:p.accentS,0,.008,side*12.6+side*-.1,11.7,.012,.11);}
 // Deterministic alpine terrain outside the sealed playable courtyard.
 const terrain=new T.PlaneGeometry(240,240,112,112);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position;
 for(let i=0;i<pos.count;i++)pos.setY(i,terrainAt(pos.getX(i),pos.getZ(i)));terrain.computeVertexNormals();
 rock.repeat.set(15,15);rockNormal.repeat.set(15,15);const mountain=readableAlbedo(new T.MeshStandardMaterial({color:0x8d9d9c,map:rock,normalMap:rockNormal,normalScale:new T.Vector2(.3,.3),roughness:.98}),{contrast:.6,lift:.05});const previousMountain=mountain.onBeforeCompile;mountain.onBeforeCompile=shader=>{previousMountain.call(mountain,shader);shader.vertexShader='varying vec3 mountainPoint;varying float mountainUp;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmountainPoint=position;mountainUp=normal.y;');shader.fragmentShader='varying vec3 mountainPoint;varying float mountainUp;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat meadow=smoothstep(.74,.9,mountainUp)*(1.-smoothstep(16.0,34.0,mountainPoint.y))*(.55+.45*sin(mountainPoint.x*.31+sin(mountainPoint.z*.23)*2.0));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.075,.1,.065),clamp(meadow,0.0,1.0)*.7);float snowLine=smoothstep(33.0,46.0,mountainPoint.y+sin(mountainPoint.x*.25)*2.0+sin(mountainPoint.z*.61+mountainPoint.x*.17)*1.4),snowSlope=smoothstep(.52,.8,mountainUp+sin(mountainPoint.x*1.3+mountainPoint.z*.9)*.05);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.84,.85),snowLine*snowSlope);');};mountain.customProgramCacheKey=()=>'forge-alpine-v44';const landscape=new T.Mesh(terrain,mountain);if(addHorizon(scene,'forge'))atmosphere.dome.scale.setScalar(2.1);landscape.receiveShadow=true;scene.add(landscape);
 refineForge(root,p);root.userData.materials=p;root.userData.portalCount=ARCHES.length;
 // Corrugated service cladding along the perimeter, flush within 5 cm of the wall; merged with the rest.
 forgeCladding(root,p);forgeWallRelief(root,p);forgeFloor(root,p,ARCHES);mergeStatic(root);steam(root,[[-4.5,7.1,0],[4.5,7.1,0]]);
 // V38 street dressing on the turbine-hall roofs; the service trailers are drawn by the vehicle re-skin above.
 forgeWallDress(sp);forgeDress(sp,{terrainAt});manholes(sp,[[-6,6,-16,-9],[-6,6,9,16],[-15,-10,-4,4],[10,15,-4,4],[-16.6,-15,-16,-8],[15,16.6,8,16],[-16.6,-15,8,16],[15,16.6,-16,-8]],11,{limit:6});powerLine(root);roofClutter(sp,MAPS.forge,{walkable:(x,z)=>Math.abs(x)<17&&Math.abs(z)<19,maxHeight:8,minArea:30,seed:11,recipes:['impianto','generatore','barili','parabole','impianto','cisterne']});pending.push(sp.build(root));
 root.userData.ready=Promise.all(pending).then(()=>{if(!capture||!renderer)return;const cube=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType}),cam=new T.CubeCamera(.1,160,cube);cam.position.set(0,3.4,0);scene.add(cam);cam.update(renderer,scene);scene.remove(cam);const pm=new T.PMREMGenerator(renderer),env=pm.fromCubemap(cube.texture);scene.environment=env.texture;scene.environmentIntensity=.7;cube.dispose();pm.dispose();atmosphere.environment.dispose();root.userData.environment=env;});return root;
}
