import * as T from './vendor/three.module.js';
import {WALLS,MAPS,groundHeight} from './shared.js?v=38.1';
import {box,cyl,label,mergeStatic,cable} from './graphics.js?v=38.1';
import {metricBlock as block,beam,ring,panel} from './caldera-architecture.js?v=38.1';
import {createAtmosphere} from './atmosphere.js?v=38.1';
import {layeredWear,toneAlbedo} from './surface-detail.js?v=38.1';
import {decorateFacade,decalMaterial} from './decals.js?v=38.1';
import {trimMaterials,cornice,course,downspout,cosmetic} from './trim-kit.js?v=38.1';
import {materialLibrary,terrainMeshes,wallMeshes,portals,slabs} from './district-builder.js?v=38.1';
import {desertCrate,desertTimber,desertCar,desertDoors,desertFeature} from './sahra-architecture.js?v=38.1';
import {siteMarkings} from './site-markings.js?v=38.1';
import {calderaSiteProps} from './site-props.js?v=38.1';
import {calderaInterior,calderaStairAt,calderaWalkable} from './caldera-layout.js?v=38.1';
import {StreetProps,roofClutter,facadeCondenser,reskin,calderaBoats} from './street-props.js?v=38.1';
// CALDERA / 07: a coastal research station on a volcanic headland. Cast concrete and
// white render over a basalt plinth, teal metal fascias, ribbon glazing above head
// height, a timber jetty, a sea wall with open water beyond, and a heliostat over A.
export function createCaldera(scene,renderer){
 const root=new T.Group();root.name='CALDERA / 07 coastal station';scene.add(root);const {pending,surface,layer}=materialLibrary();
 const mat=(color,roughness=.86,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const substrate=layer('v28/rough_plasterbrick_05');
 const render=color=>layeredWear(surface('v28/painted_plaster_wall',color,.84,.012,{amount:.1}),substrate,{edge:.3,base:.5,top:.16,scale:.8,tint:0xd8cfbf,strength:.85});
 const p={crateStamp:'CALDERA 07',concrete:surface('v28/concrete_wall_008',0xece6d8,.8,.02,{amount:.1}),chalk:render(0xf2eee4),chalkWarm:render(0xeee2cf),
  basalt:surface('v14/rock_face_03',0x8e8f88,.72,.02,{amount:.06,normal:.55}),stone:surface('v5/sandstone_blocks_05',0xd9d0bd,.78,.025,{amount:.08}),
  paving:toneAlbedo(surface('v13/stone_tiles_02',0xf0eadc,.58,.06,{floor:true}),{saturation:.72,gain:1.5}),quay:surface('v28/concrete_floor_worn_001',0xdcd7ca,.8,.02,{floor:true,amount:.08}),
  deck:surface('v13/weathered_planks',0xcaa883,.62,.02,{floor:true,normal:.35}),teal:surface('v14/blue_metal_plate',0xaad5c8,.85,.02,{amount:.06,normal:.17}),
  corrugated:surface('v28/corrugated_iron',0xa3b5ae,.85,.01,{amount:.1,normal:.4}),wood:surface('v13/weathered_planks',0xd6b48a,.5)};
 Object.assign(p,{trim:mat(0xe9e5da),dark:mat(0x42585b,.94),black:mat(0x283f45,.9),steel:mat(0x617578,.58,.48),creamMetal:mat(0xc9caba,.48,.48),copper:mat(0x98734e,.43,.72),
  rust:mat(0xa85b3e,.72,.16),glass:mat(0x6f969a,.14,.75),glassLight:mat(0x829e9d,.2,.6),bolt:mat(0x87928c,.42,.75),lamp:mat(0xe1d5b0),tire:mat(0x2f3836),
  water:new T.MeshStandardMaterial({color:0x2d5a61,roughness:.16,metalness:.28}),rock:surface('v14/rock_face_03',0x7c7d77,.7,.02,{amount:.04,normal:.8})});
 p.teal.metalness=.24;p.rock.side=T.DoubleSide;
 // Shared district builders read these names: crates, pods, vehicle, steel doors, basins.
 Object.assign(p,{metal:p.steel,blue:p.teal,wornStone:p.concrete,wornWood:p.steel,doorPaint:p.teal,doorIron:p.steel,carPaint:mat(0xdfe1da,.62,.1),
  cargoBlue:layeredWear(surface('v28/corrugated_iron',0x7fa9a6,.85,.01,{amount:.1,normal:.4}),layer('v28/rusty_metal_02'),{edge:.3,base:.45,top:.16,scale:.7,tint:0xd2b49a})});
 p.crate=new T.MeshStandardMaterial({color:0xd8c3a0,map:p.wood.map,normalMap:p.wood.normalMap,normalScale:new T.Vector2(.25,.25),roughness:.9});p.crateOlive=p.crate;p.crateTan=p.crate;
 p.vehicle={stripe:true,lightbar:true,logo:'CALDERA · 07'};p.decal=decalMaterial();p.trimKit=trimMaterials(p.trim);p.stoneKit=trimMaterials(p.concrete);
 const atmosphere=createAtmosphere(scene,renderer);scene.traverse(o=>{if(o.isHemisphereLight)o.intensity=1.3;});
 atmosphere.sun.color.set(0xfff0dc);atmosphere.sun.intensity=2.8;atmosphere.sun.position.set(-72,64,34);Object.assign(atmosphere.sun.shadow.camera,{left:-44,right:44,top:46,bottom:-46,far:190});atmosphere.sun.shadow.camera.updateProjectionMatrix();scene.fog=new T.Fog(0xcfdde2,95,280);atmosphere.dome.scale.setScalar(1.6);
 const map=MAPS.caldera,zone=(x,z)=>map.walk.find(r=>x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3])?.[4];
 // Surfaces: timber jetty, worn concrete on the quay and in the halls, stone paving
 // in the court, the belvedere and the site. Nothing is drawn over the open water.
 const DECK=new Set(['MOLO']),QUAY=new Set(['BANCHINA','PORTONE','USCITA OVEST','USCITA EST','BASE CT','ACCESSO CT']);
 const walk=(x,z)=>calderaWalkable(x,z),indoor=(x,z)=>walk(x,z)&&!!calderaInterior(x,z);
 terrainMeshes(root,WALLS,{stairAt:calderaStairAt,range:[-36,36,-40,40],surfaces:[
  [p.deck,(x,z)=>walk(x,z)&&DECK.has(zone(x,z))],[p.quay,(x,z)=>walk(x,z)&&(indoor(x,z)||QUAY.has(zone(x,z)))&&!calderaStairAt(x,z)],
  [p.paving,(x,z)=>walk(x,z)&&!indoor(x,z)&&!DECK.has(zone(x,z))&&(!QUAY.has(zone(x,z))||!!calderaStairAt(x,z))]]});
 // Facade relief: pilasters, deep sills and window heads, door canopies, formwork joints
 // and roof plant. All of it is proud of the solid wall, so it is cosmetic for shots,
 // and everything deeper than 4 cm stays above head height or within a body radius.
 const relief={concrete:cosmetic(p.concrete),chalk:cosmetic(p.chalk),warm:cosmetic(p.chalkWarm),trim:cosmetic(p.trim),steel:cosmetic(p.steel),dark:cosmetic(p.dark),teal:cosmetic(p.teal)};
 const stationFacade=(x,z,width,h,angle,serial)=>{
  const face=new T.Group();face.position.set(x,0,z);face.rotation.y=angle;root.add(face);
  const at=u=>groundHeight(x+Math.cos(angle)*u+Math.sin(angle)*.1,z-Math.sin(angle)*u+Math.cos(angle)*.1),interior=!!calderaInterior(x,z),kit=p.trimKit;
  block(face,interior?p.corrugated:serial%3===0?p.concrete:serial%3===1?p.chalk:p.chalkWarm,0,h/2,.02,width,h,.035,2.8);
  // Basalt plinth on the actual floor datum, in two-metre runs.
  for(let off=-width/2;off<width/2-.01;off+=2){const w=Math.min(2,width/2-off),u=off+w/2;block(face,p.basalt,u,at(u)+.34,.046,w,.68,.04,1.2);}
  if(interior){
   // Warehouse: steel portal ribs and a crane-rail datum, no street windows.
   for(let u=-width/2+.6;u<width/2;u+=3)box(face,p.steel,u,h/2,.06,.12,h,.05);
   box(face,p.teal,0,3.6,.055,width,.22,.045);box(face,p.dark,0,4.9,.06,width,.12,.06);return face;
  }
  // First-floor datum: teal fascia with a copper reglet; ribbon glazing above head height.
  box(face,p.teal,0,3.3,.05,width-.1,.42,.04);box(face,p.copper,0,3.06,.07,width-.1,.04,.02);
  const skin=serial%3===0?relief.concrete:serial%3===1?relief.chalk:relief.warm,door=width>=5&&serial%2===0;
  // Ground-floor pilasters every ~3.6 m, 16 cm proud, stopping under the fascia.
  const bays=Math.max(1,Math.round(width/3.6));for(let n=0;n<=bays;n++){const u=-width/2+.3+(width-.6)*n/bays;if(door&&Math.abs(u)<1.25)continue;const y0=at(u);box(face,skin,u,(y0+3.08)/2,.115,.34,3.08-y0,.16);box(face,relief.trim,u,3.0,.15,.44,.08,.22);}
  // Formwork joints on cast concrete, the light horizontal lines of real panels.
  if(serial%3===0)for(let y=1.55;y<h-1;y+=1.5)if(Math.abs(y-3.3)>.4)box(face,relief.dark,0,y,.041,width-.2,.018,.008);
  if(h>6.5){const bottom=4.15,top=Math.min(h-1.15,6.1),mid=(top+bottom)/2;box(face,p.dark,0,mid,.05,width-1.1,top-bottom,.03);box(face,p.glass,0,mid,.068,width-1.3,top-bottom-.16,.02);for(let u=-width/2+.95;u<width/2-.6;u+=1.6)box(face,p.steel,u,mid,.082,.06,top-bottom,.03);
   // Deep precast sill and a shading head over the ribbon, with side reveals.
   box(face,relief.trim,0,bottom-.07,.15,width-.9,.12,.24);box(face,relief.concrete,0,top+.1,.23,width-.8,.2,.4);box(face,relief.dark,0,top-.02,.4,width-.85,.04,.06);
   for(const side of [-1,1])box(face,skin,side*(width/2-.5),mid,.13,.16,top-bottom+.2,.2);
   // Roof plant on every third tall block: a condenser with its fan grille.
   // A wall-hung condenser between two pilasters, just under the fascia (above head height).
   if(serial%3===2&&bays>=2){const u=-width/2+.3+(width-.6)*1.5/bays,y=2.76;box(face,relief.steel,u,y,.28,.9,.6,.46);box(face,relief.dark,u,y,.515,.7,.44,.02);for(let k=-2;k<=2;k++)box(face,relief.steel,u+k*.13,y,.53,.02,.42,.02);}}
  // Flush steel service doors and louvres at street level.
  if(door){const y=at(0);box(face,p.dark,0,y+1.15,.05,1.6,2.3,.025);block(face,p.teal,0,y+1.15,.07,1.44,2.2,.03,1.2);box(face,p.trim,0,y+2.38,.075,1.9,.14,.07);
   // Cantilevered canopy over the service door, above head height, on two steel brackets.
   box(face,relief.concrete,0,y+2.62,.42,2.3,.1,.8);box(face,relief.trim,0,y+2.56,.81,2.3,.06,.04);for(const side of [-1,1])beam(face,relief.steel,[side*1,y+2.1,.06],[side*1,y+2.57,.7],.05,.05);}
  else if(width>=4){const y=at(0);box(face,p.steel,0,y+1.9,.05,1.2,.7,.03);for(let k=0;k<5;k++)box(face,p.dark,0,y+1.66+k*.12,.068,1.1,.03,.02);}
  if(serial%4===1&&width>=4)label(face,'SETTORE  0'+(1+serial%7),0,2.72,.08,1.9,.26,0,{background:'#d6cdb9',color:'#273b3e',font:70});
  course(face,kit,width-.04,2.62);cornice(face,kit,width,h-.02,{modern:true});
  if(width>=6.5){const u=-width/2+1.4;downspout(face,p.steel,u,at(u)+.05,h-.4);}
  return face;
 };
 const sp=new StreetProps();
 wallMeshes(root,p,WALLS,{
  feature:(root,p,role,x,z,w,d,h,base)=>{
   if(role!=='parapet')return desertFeature(root,p,role,x,z,w,d,h,base);
   // Sea wall: cast concrete on a basalt face down to the water, with a light rail.
   block(root,p.concrete,x,(h+base)/2,z,w,h-base,d,2.2);box(root,p.trim,x,h-.05,z,w+.04,.1,d+.04);
   const rail=cosmetic(p.steel),alongX=w>=d,len=alongX?w:d;
   for(let u=-len/2+.4;u<len/2;u+=1.6)cyl(root,rail,x+(alongX?u:0),h+.48,z+(alongX?0:u),.025,.86,'y',.025,6);
   box(root,rail,x,h+.92,z,alongX?w:.05,.05,alongX?.05:d);box(root,rail,x,h+.5,z,alongX?w:.03,.03,alongX?.03:d);
  },
  annex:(root,p,x,z,w,d,h,base)=>block(root,p.concrete,x,(h+base)/2,z,w,h-base,d,2.8),
  car:desertCar,crate:(root,p,x,z,w,d,top,base,metal)=>{if(reskin(sp,'caldera',x,z,w,d,top,base))return;desertCrate(root,p,x,z,w,d,top,base,metal);},
  column:(root,p,x,z,w,d,h,base)=>{box(root,p.steel,x,(h+base)/2,z,w,h-base,d);box(root,p.creamMetal,x,base+.12,z,w+.1,.24,d+.1);},
  lowWall:(root,p,x,z,w,d,h,base)=>{if(reskin(sp,'caldera',x,z,w,d,h,base))return;block(root,p.concrete,x,(h+base-.1)/2,z,w,h-base-.1,d,1.5);box(root,p.creamMetal,x,h-.05,z,w+.04,.1,d+.04);},
  pier:(root,p,x,z,w,d,h,base)=>{if(h-base>2.5){block(root,p.concrete,x,(h+base)/2,z,w,h-base,d,1.4);box(root,p.steel,x,h-.1,z,w+.06,.2,d+.06);return;}
   // Cast-iron bollard or telescope pedestal inside its shot box.
   cyl(root,p.black,x,(h+base)/2,z,Math.min(w,d)*.42,h-base,'y',Math.min(w,d)*.5,10);cyl(root,p.steel,x,h-.04,z,Math.min(w,d)*.5,.08,'y',Math.min(w,d)*.5,10);},
  timber:desertTimber,
  building:(root,p,x,z,w,d,h,base)=>block(root,p.concrete,x,(h+base)/2,z,w,h-base,d,2.8),
  facade:(x,z,width,h,angle,serial)=>{const face=stationFacade(x,z,width,h,angle,serial);decorateFacade(face,p.decal,{width,height:h,serial,ground:groundHeight,toWorld:u=>[x+Math.cos(angle)*u,z-Math.sin(angle)*u],posters:false});if(!calderaInterior(x,z))facadeCondenser(sp,{x,z,width,height:h,angle,serial,ground:groundHeight(x,z)});return face;},
  roofCap:(root,p,x,z,w,d,h)=>{if(w<5||d<5)return;box(root,p.trim,x,h+.08,z,w+.06,.16,d+.06);if(w>7&&d>5){box(root,p.steel,x+w*.2,h+.55,z,1.6,.9,1.1);for(let a=-.6;a<.7;a+=.2)box(root,p.dark,x+w*.2+a,h+.58,z+.56,.05,.6,.03);cyl(root,p.creamMetal,x-w*.22,h+.7,z,.35,1.2,'y',.35,14);}}
 });
 portals(root,p,map.arches,{material:p.concrete,trim:(root,p,a)=>{const g=new T.Group();g.position.set(a.x,0,a.z);if(a.axis==='x')g.rotation.y=Math.PI/2;root.add(g);const band=cosmetic(p.steel);for(const side of [-1,1])box(g,band,0,a.spring+a.rise+.25,side*(a.depth/2+.03),a.width+.2,.18,.05);}});
 desertDoors(root,p,map.movementBoxes);
 slabs(root,p,map.ballisticBoxes,{interiorAt:calderaInterior,beam:p.steel,slab:'concrete',light:{color:0xe8f0ee,emissive:0xd9ece8,intensity:.6}});
 // Open water around the headland: one plane below the quay; buildings hide it elsewhere.
 const sea=new T.Mesh(new T.PlaneGeometry(900,900,1,1),p.water);sea.rotation.x=-Math.PI/2;sea.position.y=-1.25;sea.receiveShadow=true;root.add(sea);
 siteMarkings(root,map.sites);heliostat(root,p,map);calderaSiteProps(root,map.sites[0]);
 // V38 street dressing: roof clutter, wall condensers, boats on the water; cover re-skins are drawn by the hooks above.
 roofClutter(sp,MAPS.caldera,{walkable:(x,z)=>calderaWalkable(x,z)&&!calderaInterior(x,z),maxHeight:10,cap:w=>w[2]>=5&&w[3]>=5?.16:0,seed:5});calderaBoats(sp);pending.push(sp.build(root));
 // Station identity on the CT block facing the site, and lane wayfinding.
 label(root,'CALDERA  /  STATION 07',0,6.62,-19.94,7.2,.66,0,{background:'#b9b49e',color:'#34494b',font:90});
 for(const [text,x,y,z,yaw]of [['A  ↑',-17,2.6,-11.94,0],['A  ↑',12.06,3.6,-.5,Math.PI/2],['A  ↑',-12.06,2.5,14,-Math.PI/2],['←  A',16,2.5,-17.94,0]])label(root,text,x,y,z,1.8,.62,yaw,{background:'#345f61',color:'#e7dfcd',font:120});
 backdrop(root,p);
 const wire=cosmetic(p.dark);cable(root,[[-22,6.6,2],[-17,5.8,2.2],[-12,6.6,2]],wire,.02);cable(root,[[12,7,10],[17,6.2,10.3],[22,6.9,10]],wire,.02);
 mergeStatic(root);root.userData.materials=p;root.userData.ready=Promise.all(pending);return root;
}
// Heliostat over A: four steel columns (shared solids) carry two truss arches and a
// segmented collector ring. Everything above the columns is cosmetic for shots.
function heliostat(root,p,map){
 const cols=map.siteColumns,[minX,maxX]=[Math.min(...cols.map(c=>c.x)),Math.max(...cols.map(c=>c.x))],[minZ,maxZ]=[Math.min(...cols.map(c=>c.z)),Math.max(...cols.map(c=>c.z))];
 const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,top=cols[0].top,steel=cosmetic(p.steel),cream=cosmetic(p.creamMetal),copper=cosmetic(p.copper),glass=cosmetic(p.glassLight);
 for(const z of [minZ,maxZ]){const points=[];for(let i=0;i<=24;i++){const t=i/24,x=minX+(maxX-minX)*t;points.push([x,top+Math.sin(t*Math.PI)*2.6,z]);}
  for(let i=1;i<points.length;i++)beam(root,cream,points[i-1],points[i],.18,.22);
  for(let i=2;i<points.length-1;i+=2)beam(root,steel,points[i],[points[i][0],top+.1,z],.05);}
 const y=top+2.3;ring(root,steel,cx,y,cz,4.1,.1);ring(root,copper,cx,y+.02,cz,3.3,.05);
 for(let n=0;n<24;n++){const a=n*Math.PI*2/24,g=new T.Group();g.position.set(cx+Math.cos(a)*3.7,y,cz+Math.sin(a)*3.7);g.rotation.y=-a;root.add(g);const tile=panel(g,n%6===0?copper:glass,0,0,0,.72,.04,.6);tile.rotation.z=-.18;}
 // Struts heavy enough to read as carrying the ring: at .04 m it seemed to float.
 for(const c of cols){const end=[cx+(c.x-cx)*.55,y,cz+(c.z-cz)*.55];beam(root,steel,[c.x,top,c.z],end,.13,.13);beam(root,steel,[c.x,top,c.z],[cx+(c.x-cx)*.88,y,cz+(c.z-cz)*.88],.07,.07);}
}
function backdrop(root,p){
 const rock=cosmetic(p.rock),white=cosmetic(p.chalk),rust=cosmetic(p.rust),lens=cosmetic(p.glassLight),cream=cosmetic(p.creamMetal),concrete=cosmetic(p.concrete);
 // The caldera rim: one continuous ridge around the bay, open to the sea on the
 // west and south, softened by fog. Sea stacks stand off the quay. All cosmetic.
 const pos=[],uv=[],index=[],segments=160;
 const ridge=a=>{const n=Math.sin(a*3.1)*.5+Math.sin(a*7.3+1.2)*.3+Math.sin(a*13.7+.4)*.2;return {r:190+n*24,h:18+n*9+Math.max(0,Math.cos(a-.3))*12};};
 for(let i=0;i<=segments;i++){const a=-Math.PI*.94+i/segments*Math.PI*1.28,{r,h}=ridge(a),c=Math.cos(a),sn=Math.sin(a);
  for(const [k,rr,yy]of [[0,r-60,-3],[1,r-14,h*.55],[2,r,h],[3,r+30,h*.7]]){pos.push(c*rr,yy,sn*rr);uv.push(i*.22,k*1.4);}
  if(i<segments)for(let k=0;k<3;k++){const n=i*4+k;index.push(n,n+4,n+1,n+1,n+4,n+5);}}
 const rim=new T.BufferGeometry();rim.setAttribute('position',new T.Float32BufferAttribute(pos,3));rim.setAttribute('uv',new T.Float32BufferAttribute(uv,2));rim.setIndex(index);rim.computeVertexNormals();
 // The rim takes its own aerial perspective (a hazy tint) instead of scene fog, so the
 // ridge keeps its texture and silhouette at 150 m.
 const haze=rock.clone();haze.fog=false;haze.color.set(0xbcc7ca);haze.userData.nonBallistic=true;
 const rimMesh=new T.Mesh(rim,haze);rimMesh.castShadow=false;rimMesh.receiveShadow=false;root.add(rimMesh);
 // Sea stacks: jagged basalt columns standing in the water off the quay and the jetty.
 for(const [x,z,r,h,seed]of [[-96,-18,7,18,1],[-118,26,10,24,2],[-84,46,5,10,3],[-40,92,8,14,4],[-70,70,4,8,5]]){
  const g=new T.CylinderGeometry(r*.55,r,h,11,7),v=g.attributes.position;
  for(let i=0;i<v.count;i++){const px=v.getX(i),py=v.getY(i),pz=v.getZ(i),a=Math.atan2(pz,px),k=1+Math.sin(a*5+seed+py*.4)*.16+Math.sin(a*11-seed*2+py*.9)*.08;v.setXYZ(i,px*k,py+(py>h/2-.01?Math.sin(a*3+seed)*1.6:0),pz*k);}
  g.computeVertexNormals();const m=new T.Mesh(g,rock);m.position.set(x,h/2-2,z);m.castShadow=false;root.add(m);
 }
 // A distant lighthouse on the western stack, and the station's radar dome to the north.
 cyl(root,white,-86,16,22,1.1,20,'y',1.5,16);cyl(root,rust,-86,26.6,22,1.2,1.2,'y',1.2,16);cyl(root,lens,-86,27.8,22,.9,1.2,'y',.9,16);
 const dome=new T.Mesh(new T.SphereGeometry(5.2,28,14,0,Math.PI*2,0,Math.PI/2),cream);dome.position.set(14,10.4,-52);root.add(dome);block(root,concrete,14,5.2,-52,11,10.4,11,3);
}
