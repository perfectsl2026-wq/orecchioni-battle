import * as T from './vendor/three.module.js';
import {WALLS,MAPS,groundHeight} from './shared.js?v=42.0';
import {box,cyl,label,mergeStatic,cable} from './graphics.js?v=42.0';
import {metricBlock as block,beam,ring,panel} from './caldera-architecture.js?v=42.0';
import {createAtmosphere} from './atmosphere.js?v=42.0';
import {layeredWear,toneAlbedo} from './surface-detail.js?v=42.0';
import {decorateFacade,decalMaterial} from './decals.js?v=42.0';
import {trimMaterials,cornice,course,downspout,cosmetic} from './trim-kit.js?v=42.0';
import {materialLibrary,terrainMeshes,wallMeshes,portals,slabs} from './district-builder.js?v=42.0';
import {desertCrate,desertTimber,desertCar,carsReady,desertDoors,desertFeature} from './sahra-architecture.js?v=42.0';
import {siteMarkings} from './site-markings.js?v=42.0';
import {calderaSiteProps,calderaPier} from './site-props.js?v=42.0';
import {calderaInterior,calderaStairAt,calderaWalkable} from './caldera-layout.js?v=42.0';
import {StreetProps,roofClutter,facadeCondenser,facadeFixture,coverSkin,reskin,calderaBoats} from './street-props.js?v=42.0';
import {stationFixtures,calderaDress,manholes} from './detail-dress.js?v=42.0';
import {addHorizon,seaSurface,liteWorld,calderaRimMaterial} from './horizon.js?v=42.0';
// CALDERA / 07: a coastal research station on a volcanic headland. Cast concrete and
// white render over a basalt plinth, teal metal fascias, ribbon glazing above head
// height, a timber jetty, a sea wall with open water beyond, and a heliostat over A.
export function createCaldera(scene,renderer){
 const root=new T.Group();root.name='CALDERA / 07 coastal station';scene.add(root);const {pending,surface,layer}=materialLibrary();
 const mat=(color,roughness=.86,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const substrate=layer('v28/rough_plasterbrick_05');
 const render=color=>layeredWear(surface('v28/painted_plaster_wall',color,.84,.012,{amount:.1}),substrate,{edge:.3,base:.5,top:.16,scale:.8,tint:0xd8cfbf,strength:.85});
 // Check Fable: the worn-concrete scan is a dark albedo (about 7% linear), so the quay and the halls read near black even in sun; lift it to a light worn concrete.
 const p={crateStamp:'CALDERA 07',concrete:surface(liteWorld()?'v28/concrete_wall_008':'v44/caldera_concrete',0xece6d8,.8,.02,{amount:.1}),chalk:render(0xf2eee4),chalkWarm:render(0xeee2cf),
  basalt:surface('v14/rock_face_03',0x8e8f88,.72,.02,{amount:.06,normal:.55}),stone:surface('v5/sandstone_blocks_05',0xd9d0bd,.78,.025,{amount:.08}),
  paving:toneAlbedo(surface('v13/stone_tiles_02',0xf0eadc,.58,.06,{floor:true}),{saturation:.72,gain:1.75}),quay:toneAlbedo(surface('v28/concrete_floor_worn_001',0xdcd7ca,.8,.02,{floor:true,amount:.08}),{saturation:.85,gain:2.8}),
  deck:toneAlbedo(surface('v13/weathered_planks',0xcaa883,.62,.02,{floor:true,normal:.35}),{gain:1.7}),teal:surface('v14/blue_metal_plate',0xaad5c8,.85,.02,{amount:.06,normal:.17}),
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
 const DECK=new Set(['MOLO']),QUAY=new Set(['BANCHINA','PORTONE','USCITA OVEST','USCITA EST','BASE DIFESA','ACCESSO DIFESA']);
 const walk=(x,z)=>calderaWalkable(x,z),indoor=(x,z)=>walk(x,z)&&!!calderaInterior(x,z);
 terrainMeshes(root,WALLS,{stairAt:calderaStairAt,range:[-36,36,-40,40],surfaces:[
  [p.deck,(x,z)=>walk(x,z)&&DECK.has(zone(x,z))],[p.quay,(x,z)=>walk(x,z)&&(indoor(x,z)||QUAY.has(zone(x,z)))&&!calderaStairAt(x,z)],
  [p.paving,(x,z)=>walk(x,z)&&!indoor(x,z)&&!DECK.has(zone(x,z))&&(!QUAY.has(zone(x,z))||!!calderaStairAt(x,z))]]});
 // Facade relief: pilasters, deep sills and window heads, door canopies, formwork joints
 // and roof plant. All of it is proud of the solid wall, so it is cosmetic for shots,
 // and everything deeper than 4 cm stays above head height or within a body radius.
 // V44b: wall edges from metricBlock's face metres (no seams at texture repeats).
 Object.assign(p.concrete.userData,{faceWear:true,layered:true});
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
   block(root,p.concrete,x,(h+base)/2,z,w,h-base,d,2.2);box(root,p.deck||p.concrete,x,h-.045,z,w+.04,.1,d+.04);
   // V42: the rail stands on the land-side edge, where the wall actually stops you, not mid-deck (it read as an invisible wall).
   const rail=cosmetic(p.steel),alongX=w>=d,len=alongX?w:d,rx=alongX?x:x-Math.sign(x)*(w/2-.06),rz=alongX?z-Math.sign(z)*(d/2-.06):z;
   for(let u=-len/2+.4;u<len/2;u+=1.6)cyl(root,rail,rx+(alongX?u:0),h+.48,rz+(alongX?0:u),.025,.86,'y',.025,6);
   box(root,rail,rx,h+.92,rz,alongX?w:.05,.05,alongX?.05:d);box(root,rail,rx,h+.5,rz,alongX?w:.03,.03,alongX?.03:d);
  },
  annex:(root,p,x,z,w,d,h,base)=>block(root,p.concrete,x,(h+base)/2,z,w,h-base,d,2.8),
  car:desertCar,crate:(root,p,x,z,w,d,top,base,metal)=>{if(reskin(sp,'caldera',x,z,w,d,top,base))return;coverSkin(sp,metal?'pod':'crate',{x,z,w,d,top,base,fallback:()=>desertCrate(root,p,x,z,w,d,top,base,metal)});},
  column:(root,p,x,z,w,d,h,base)=>{box(root,p.steel,x,(h+base)/2,z,w,h-base,d);box(root,p.creamMetal,x,base+.12,z,w+.1,.24,d+.1);},
  lowWall:(root,p,x,z,w,d,h,base)=>{if(reskin(sp,'caldera',x,z,w,d,h,base))return;block(root,p.concrete,x,(h+base-.1)/2,z,w,h-base-.1,d,1.5);box(root,p.creamMetal,x,h-.05,z,w+.04,.1,d+.04);},
  pier:(root,p,x,z,w,d,h,base)=>{if(h-base>2.5){block(root,p.concrete,x,(h+base)/2,z,w,h-base,d,1.4);box(root,p.steel,x,h-.1,z,w+.06,.2,d+.06);return;}
   // Cast-iron bollard or telescope pedestal inside its shot box.
   cyl(root,p.black,x,(h+base)/2,z,Math.min(w,d)*.42,h-base,'y',Math.min(w,d)*.5,10);cyl(root,p.steel,x,h-.04,z,Math.min(w,d)*.5,.08,'y',Math.min(w,d)*.5,10);},
  timber:desertTimber,
  building:(root,p,x,z,w,d,h,base)=>block(root,p.concrete,x,(h+base)/2,z,w,h-base,d,2.8),
  facade:(x,z,width,h,angle,serial)=>{const face=stationFacade(x,z,width,h,angle,serial);decorateFacade(face,p.decal,{width,height:h,serial,ground:groundHeight,toWorld:u=>[x+Math.cos(angle)*u,z-Math.sin(angle)*u],posters:false});if(!calderaInterior(x,z)){const spot={x,z,width,height:h,angle,serial,ground:groundHeight(x,z)};facadeCondenser(sp,spot);facadeFixture(sp,spot);stationFixtures(sp,spot);}return face;},
  // Check Fable: a weathered concrete roof (it was a flat white slab from every high view) with a low parapet round it.
  roofCap:(root,p,x,z,w,d,h)=>{if(w<5||d<5)return;block(root,p.roofSlab||=toneAlbedo(surface('v28/concrete_wall_008',0xe6e1d6,.86,.02,{amount:.1,floor:true}),{saturation:.6,gain:1.6}),x,h+.08,z,w+.06,.16,d+.06,3);for(const side of [-1,1]){box(root,p.trim,x,h+.3,z+side*(d/2-.08),w+.06,.36,.16);box(root,p.trim,x+side*(w/2-.08),h+.3,z,.16,.36,d-.26);}if(w>7&&d>5){box(root,p.steel,x+w*.2,h+.55,z,1.6,.9,1.1);for(let a=-.6;a<.7;a+=.2)box(root,p.dark,x+w*.2+a,h+.58,z+.56,.05,.6,.03);cyl(root,p.creamMetal,x-w*.22,h+.7,z,.35,1.2,'y',.35,14);}}
 });
 portals(root,p,map.arches,{material:p.concrete,trim:(root,p,a)=>{const g=new T.Group();g.position.set(a.x,0,a.z);if(a.axis==='x')g.rotation.y=Math.PI/2;root.add(g);const band=cosmetic(p.steel);for(const side of [-1,1])box(g,band,0,a.spring+a.rise+.25,side*(a.depth/2+.03),a.width+.2,.18,.05);}});
 desertDoors(root,p,map.movementBoxes);
 slabs(root,p,map.ballisticBoxes,{interiorAt:calderaInterior,beam:p.steel,slab:'concrete',light:{color:0xe8f0ee,emissive:0xd9ece8,intensity:.6}});
 // Open water around the headland: one plane below the quay; buildings hide it elsewhere.
 seaSurface(p.water);addHorizon(scene,'caldera');const sea=new T.Mesh(new T.PlaneGeometry(900,900,1,1),p.water);sea.rotation.x=-Math.PI/2;sea.position.y=-1.25;sea.receiveShadow=true;root.add(sea);
 siteMarkings(root,map.sites);heliostat(root,p,map);calderaSiteProps(root,map.sites[0]);calderaPier(root,{y:groundHeight(0,26)});
 // V38 street dressing: roof clutter, wall condensers, boats on the water; cover re-skins are drawn by the hooks above.
 roofClutter(sp,MAPS.caldera,{walkable:(x,z)=>calderaWalkable(x,z)&&!calderaInterior(x,z),maxHeight:10,chance:.85,recipes:['solari','parabole','impianto','solari','generatore','cisterne','barili','parabole'],cap:w=>w[2]>=5&&w[3]>=5?.16:0,seed:5});calderaBoats(sp);backdrop(root,p,sp);manholes(sp,MAPS.caldera.walk,3,{limit:7,skip:(x,z)=>!!calderaInterior(x,z)});pending.push(sp.build(root));
 // Station identity on the defenders' block facing the site, and lane wayfinding.
 label(root,'CALDERA  /  STAZIONE 07',0,6.62,-19.94,7.2,.66,0,{background:'#b9b49e',color:'#34494b',font:90});
 for(const [text,x,y,z,yaw]of [['A  ↑',-17,2.6,-11.94,0],['A  ↑',12.06,3.6,-.5,Math.PI/2],['A  ↑',-12.06,2.5,14,-Math.PI/2],['←  A',16,2.5,-17.94,0]])label(root,text,x,y,z,1.8,.62,yaw,{background:'#345f61',color:'#e7dfcd',font:120});
 const wire=cosmetic(p.dark);cable(root,[[-22,6.6,2],[-17,5.8,2.2],[-12,6.6,2]],wire,.02);cable(root,[[12,7,10],[17,6.2,10.3],[22,6.9,10]],wire,.02);
 calderaHalls(root,p);
 mergeStatic(root);root.userData.materials=p;root.userData.ready=Promise.all([...pending,carsReady()]);return root;
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
function backdrop(root,p,sp){
 const rock=cosmetic(p.rock),cream=cosmetic(p.creamMetal),concrete=cosmetic(p.concrete);
 // The caldera rim: one continuous ridge around the bay, open to the sea on the
 // west and south, softened by fog. Sea stacks stand off the quay. All cosmetic.
 // Check Fable: twice the segments, a jagged crest of peaks and saddles and a wider profile (it read as one even band of rock).
 const pos=[],dat=[],index=[],segments=320;
 const ridge=a=>{const n=Math.sin(a*3.1)*.5+Math.sin(a*7.3+1.2)*.3+Math.sin(a*13.7+.4)*.2,jag=(1-Math.abs(Math.sin(a*8.3+.7)))**2*11*(.45+.55*Math.sin(a*2.3+.4)**2)+(1-Math.abs(Math.sin(a*17.9+2.1)))**3*6*(.3+.7*Math.sin(a*3.7+1)**2)+Math.sin(a*41+Math.sin(a*5))*1.4;return {r:190+n*24,h:16+n*9+Math.max(0,Math.cos(a-.3))*12+jag};};
 for(let i=0;i<=segments;i++){const a=-Math.PI*.94+i/segments*Math.PI*1.28,{r,h}=ridge(a),c=Math.cos(a),sn=Math.sin(a);
  // The two ends taper into the sea as headlands, and the outer row reaches the water.
  const t=Math.min(1,Math.min(i,segments-i)/6),lift=v=>-3+(v+3)*t;
  // V52: eleven rows across the ridge, cut by gullies that run down both faces; the crest keeps its height (the turbines stand on it).
  const ROWS=[[-60,0],[-48,.08],[-36,.2],[-27,.36],[-19,.52],[-12,.68],[-6,.86],[0,1],[12,.84],[34,.55],[70,0]],gully=(1-Math.abs(Math.sin(a*47+Math.sin(a*9)*2.4)))**2*.55+(1-Math.abs(Math.sin(a*113+1.7)))**2*.25;
  ROWS.forEach(([dr,f],k)=>{const cut=1-gully*.42*Math.sin(Math.PI*f),bulge=Math.sin(a*23+k*.7)*2.2*Math.sin(Math.PI*f);pos.push(c*(r+dr+bulge),f?lift(h*f*cut):-3,sn*(r+dr+bulge));dat.push(1,.62+.38*cut,0);});
  if(i<segments)for(let k=0;k<10;k++){const n=i*11+k;index.push(n,n+11,n+1,n+1,n+11,n+12);}}
 const rim=new T.BufferGeometry();rim.setAttribute('position',new T.Float32BufferAttribute(pos,3));rim.setAttribute('data',new T.Float32BufferAttribute(dat,3));rim.setIndex(index);rim.computeVertexNormals();
 // The rim is drawn like the Forge massif: bedded volcanic rock, dry grass and scrub thinning toward the crest, its own sea haze.
 const rimMesh=new T.Mesh(rim,calderaRimMaterial());rimMesh.castShadow=false;rimMesh.receiveShadow=false;rimMesh.userData.cosmetic=true;root.add(rimMesh);
 // Sea stacks: jagged basalt columns standing in the water off the quay and the jetty.
 for(const [x,z,r,h,seed]of [[-96,-18,7,18,1],[-118,26,10,24,2],[-84,46,5,10,3],[-40,92,8,14,4],[-70,70,4,8,5]]){
  sp.add('scoglio',{x,y:-3,z,yaw:seed*1.3,fit:{w:r*2.3,d:r*2,h:h+2},tag:'far',fallback:()=>{const g=new T.CylinderGeometry(r*.55,r,h,11,7),v=g.attributes.position;
  for(let i=0;i<v.count;i++){const px=v.getX(i),py=v.getY(i),pz=v.getZ(i),a=Math.atan2(pz,px),k=1+Math.sin(a*5+seed+py*.4)*.16+Math.sin(a*11-seed*2+py*.9)*.08;v.setXYZ(i,px*k,py+(py>h/2-.01?Math.sin(a*3+seed)*1.6:0),pz*k);}
  g.computeVertexNormals();const m=new T.Mesh(g,rock);m.position.set(x,h/2-2,z);m.castShadow=false;root.add(m);}});
 }
 // A distant lighthouse on the western stack, and the station's radar dome to the north.
 // The lighthouse, ship, pier and wind farm.
 // V53 lifebuoys: one smooth ring in red and white quarters, drawn once and instanced along the sea rail.
 const rings=[];calderaDress(sp,MAPS.caldera,{rimAt:a=>{const {r,h}=ridge(a);return {x:Math.cos(a)*r,z:Math.sin(a)*r,y:h};},buoy:(x,y,z,yaw)=>rings.push([x,y,z,yaw])});
 if(rings.length){const g=new T.TorusGeometry(.27,.07,10,24),v=g.attributes.position,col=new Float32Array(v.count*3);for(let i=0;i<v.count;i++){const q=Math.floor((Math.atan2(v.getY(i),v.getX(i))+Math.PI)/(Math.PI/4)+.5)%2,c=q?[.82,.8,.76]:[.78,.1,.06];col.set(c,i*3);}g.setAttribute('color',new T.BufferAttribute(col,3));
  const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.62});m.userData.nonBallistic=true;const mesh=new T.InstancedMesh(g,m,rings.length),o=new T.Object3D();rings.forEach(([x,y,z,yaw],i)=>{o.position.set(x,y+.34,z);o.rotation.set(0,yaw,0);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.userData.keep=true;mesh.name='Salvagenti';root.add(mesh);}
 const dome=new T.Mesh(new T.SphereGeometry(5.2,40,12,0,Math.PI*2,0,Math.PI/2),cream);dome.position.set(14,10.4,-52);root.add(dome);block(root,concrete,14,5.2,-52,11,10.4,11,3);
}

// V53 covered halls. The warehouse, the gallery and the tunnel were bare corrugated boxes under floating slabs; now the
// warehouse is a working shed: a travelling crane on its rails, framed roof lanterns in the two open strips, high-bay
// lamps with their pools of light, cable trays and conduit, bay signs and painted lanes. Everything is cosmetic for
// shots and sits above 2.6 m, flat on the floor, or within 11 cm of a wall: cover, sightlines and movement are untouched.
function calderaHalls(root,p){
 const flag=m=>{m.userData.nonBallistic=true;return m;},paint=(color,roughness=.62,metalness=.15)=>flag(new T.MeshStandardMaterial({color,roughness,metalness}));
 // One vertex-coloured paint material carries every painted part (yellow crane, black trim, floor lines, cables, galvanised trays): one draw, not eight.
 const steel=cosmetic(p.steel),dark=cosmetic(p.dark),cream=cosmetic(p.creamMetal),kit=flag(new T.MeshStandardMaterial({vertexColors:true,roughness:.66,metalness:.18}));
 const tone=hex=>{const m=new T.MeshStandardMaterial({color:hex});m.userData.hallTint=new T.Color(hex);return m;};
 const galv=tone(0xaab4b3),yellow=tone(0xd9a21c),black=tone(0x1d2426),line=tone(0xd6b23a),white=tone(0xe6e4da),cableA=tone(0x23292a),cableB=tone(0xc8621f),cableC=tone(0x8f9896);
 const glow=flag(new T.MeshStandardMaterial({color:0xfff6e2,emissive:0xffe9c2,emissiveIntensity:1.6,roughness:.6}));
 // Soft pool of light under each lamp: one small radial texture, additive, drawn flat on the floor.
 const N=48,data=new Uint8Array(N*N*4);for(let y=0;y<N;y++)for(let x=0;x<N;x++){const d=Math.hypot(x-N/2+.5,y-N/2+.5)/(N/2),v=Math.max(0,1-d);const a=v*v*(3-2*v);data.set([255*a,236*a,200*a,255],(y*N+x)*4);}
 const poolMap=new T.DataTexture(data,N,N);poolMap.colorSpace=T.SRGBColorSpace;poolMap.magFilter=poolMap.minFilter=T.LinearFilter;poolMap.needsUpdate=true;
 const pool=flag(new T.MeshBasicMaterial({map:poolMap,transparent:true,opacity:.2,blending:T.AdditiveBlending,depthWrite:false,fog:false}));
 const lightPool=(x,y,z,r)=>{const m=new T.Mesh(new T.PlaneGeometry(r*2,r*2),pool);m.rotation.x=-Math.PI/2;m.position.set(x,y+.02,z);m.renderOrder=2;m.userData.keep=true;m.userData.cosmetic=true;root.add(m);};
 const highBay=(x,under,z,floor)=>{cyl(root,dark,x,under-.1,z,.025,.2,'y',.025,5);cyl(root,black,x,under-.3,z,.11,.22,'y',.3,14);cyl(root,glow,x,under-.415,z,.27,.012,'y',.27,14);cyl(root,cream,x,under-.19,z,.13,.04,'y',.13,8);lightPool(x,floor,z,3.1);};
 const bulkhead=(x,y,z,nx,nz)=>{const g=new T.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(nx,nz);root.add(g);box(g,black,0,0,.03,.3,.18,.06);box(g,glow,0,0,.075,.24,.12,.05);for(const u of [-.08,0,.08])box(g,black,u,0,.105,.012,.14,.012);box(g,black,0,0,.105,.26,.012,.012);cyl(g,steel,0,.36,.03,.014,.56,'y',.014,6);};
 // ---- Magazzino: x -22..-12, z 4..26, slab underside 6.19 ----
 const W=-22,E=-12,Z0=4,Z1=26,under=6.19,floor=groundHeight(-17,15);
 // Crane rails on corbels along both long walls; the east one bridges the two openings on its own posts.
 for(const [x,side] of [[W+.2,1],[E-.2,-1]]){box(root,steel,x,5.02,(Z0+Z1)/2,.14,.2,Z1-Z0-.3);box(root,black,x,5.14,(Z0+Z1)/2,.05,.05,Z1-Z0-.3);
  for(let z=Z0+1.2;z<Z1;z+=3){const solid=side>0||(z>8.2&&z<19.8);if(solid){box(root,steel,x-side*.07,4.84,z,.3,.16,.26);beam(root,steel,[x+side*.08,4.78,z],[x-side*.18,4.42,z],.05,.2);}}}
 // The bridge: twin box girders, end trucks with wheels, a trolley, hoist ropes and a hook block held well above head height.
 const bz=13.6,cx=(W+E)/2,span=E-W-.24;
 for(const dz of [-.3,.3]){box(root,yellow,cx,5.44,bz+dz,span,.5,.2);box(root,black,cx,5.7,bz+dz,span,.03,.24);box(root,black,cx,5.18,bz+dz,span,.03,.24);for(let u=-span/2+.6;u<span/2;u+=1.2)box(root,black,cx+u,5.44,bz+dz+Math.sign(dz)*.103,.02,.44,.006);}
 for(const x of [W+.2,E-.2]){box(root,yellow,x,5.32,bz,.3,.3,1.5);for(const dz of [-.55,.55])cyl(root,black,x,5.2,bz+dz,.1,.12,'x',.1,10);for(const dz of [-.76,.76])box(root,black,x,5.32,bz+dz,.32,.2,.03);}
 for(const [text,dz,yaw] of [['PORTATA  5 t',-.405,Math.PI],['PORTATA  5 t',.405,0]])label(root,text,cx+2.2,5.44,bz+dz,1.5,.26,yaw,{background:'#d9a21c',color:'#1d2426',font:120}).material.userData.nonBallistic=true;
 const tx=cx-1.6;box(root,cream,tx,5.78,bz,.9,.16,.86);box(root,steel,tx,5.94,bz,.6,.2,.5);cyl(root,black,tx,5.6,bz,.14,.5,'x',.14,10);cyl(root,steel,tx+.36,5.9,bz,.09,.3,'z',.09,10);
 for(const dx of [-.07,.07])cyl(root,cableA,tx+dx,4.62,bz,.008,1.72,'y',.008,5);
 box(root,yellow,tx,3.72,bz,.3,.26,.12);box(root,black,tx,3.72,bz+.062,.3,.05,.006);box(root,black,tx,3.72,bz-.062,.3,.05,.006);cyl(root,steel,tx,3.86,bz,.07,.13,'z',.07,12);
 const hook=new T.Mesh(new T.TorusGeometry(.085,.022,6,14,Math.PI*1.45),steel);hook.position.set(tx,3.44,bz);hook.rotation.z=Math.PI*.95;hook.castShadow=true;root.add(hook);cyl(root,steel,tx,3.56,bz,.022,.12,'y',.022,6);
 // Festoon cable feeding the trolley, looped under a wire along the north girder.
 for(let k=0;k<7;k++){const x0=tx+.5+k*.62;beam(root,cableA,[x0,5.88,bz+.44],[x0+.31,5.58,bz+.44],.022,.022);beam(root,cableA,[x0+.31,5.58,bz+.44],[x0+.62,5.88,bz+.44],.022,.022);}box(root,steel,cx+1.2,5.9,bz+.44,span-3.4,.015,.015);
 // Roof lanterns: the two open strips between the slabs become framed skylights (open frames: nothing new stops a shot).
 for(const z of [11.5,19.5]){for(const dz of [-1,1])box(root,steel,cx,6.72,z+dz,E-W,.22,.1);box(root,steel,cx,6.86,z,E-W,.05,.05);for(let x=W+.62;x<E;x+=1.25)box(root,steel,x,6.84,z,.045,.05,2);for(const x of [W+.03,E-.03])box(root,steel,x,6.72,z,.06,.22,2);}
 // High-bay lamps under the slabs, between the crane and the roof.
 for(const z of [7.25,15.8,23.25])for(const x of [-19.6,-14.4])highBay(x,under,z,floor);
 // Cable trays on brackets, three cables each, with conduit drops to isolators above the head band.
 for(const [x,side,a,b] of [[W+.17,1,Z0+.3,Z1-.3],[E-.17,-1,8.3,19.7]]){const len=b-a,mid=(a+b)/2;box(root,galv,x,4.3,mid,.26,.02,len);for(const u of [-.13,.13])box(root,galv,x+u,4.34,mid,.015,.07,len);
  box(root,cableA,x-.06,4.335,mid,.045,.04,len-.1);box(root,cableB,x+.01,4.33,mid,.03,.03,len-.1);box(root,cableC,x+.07,4.33,mid,.03,.03,len-.1);
  for(let z=a+.6;z<b;z+=2.4){box(root,galv,x-side*.02,4.27,z,.3,.03,.04);beam(root,galv,[x-side*.15,4.02,z],[x+side*.1,4.27,z],.025,.03);}
  for(const z of [a+len*.3,a+len*.72]){const wx=x-side*.12;cyl(root,galv,wx,3.6,z,.016,1.4,'y',.016,6);box(root,galv,wx,2.82,z,.26,.34,.08).rotation.y=Math.PI/2;box(root,black,wx+side*.045,2.84,z,.012,.1,.06);box(root,yellow,wx+side*.045,2.72,z,.012,.05,.12);}}
 // Bay signs above the head band and painted lanes on the floor.
 const sign=(text,x,y,z,yaw,w=1.5)=>{label(root,text,x,y,z,w,.42,yaw,{background:'#345f61',color:'#e7dfcd',font:110}).material.userData.nonBallistic=true;};
 [['BAIA 01',7.2],['BAIA 02',15.5],['BAIA 03',23.2]].forEach(([t,z])=>sign(t,W+.062,3.05,z,Math.PI/2));sign('MAGAZZINO 07',cx,3.05,Z1-.062,Math.PI,2.3);
 for(const x of [W+1.25,E-1.25])box(root,line,x,floor+.007,(Z0+Z1)/2,.1,.01,Z1-Z0-1.2);
 for(const z of [Z0+.6,Z1-.6])box(root,line,cx,floor+.007,z,E-W-2.5,.01,.1);
 for(let x=-19.4;x<-14.5;x+=.7)box(root,line,x,floor+.007,Z0+1.55,.34,.01,1.3);
 for(const [z,n] of [[7.2,1],[15.5,2],[23.2,3]]){for(const dz of [-2,2])box(root,white,W+.68,floor+.007,z+dz,1.1,.01,.07);box(root,white,W+1.18,floor+.0075,z,.07,.01,4);}
 // ---- Galleria: x -6..-2, z 12..18, underside 4.39 ---- service pipes and a tray under the slab, caged lamps on the walls.
 {const u=4.39,a=12.15,b=17.85,len=b-a,mid=(a+b)/2;
  for(const [x,r,m] of [[-5.5,.07,galv],[-5.3,.05,cosmetic(p.copper)],[-5.12,.05,cream]]){cyl(root,m,x,u-.22,mid,r,len,'z',r,10);for(let z=a+.7;z<b;z+=1.9)cyl(root,black,x,u-.22,z,r+.012,.06,'z',r+.012,10);}
  for(let z=a+.5;z<b;z+=1.5){box(root,galv,-5.3,u-.33,z,.6,.03,.04);for(const x of [-5.58,-5.02])cyl(root,galv,x,u-.16,z,.008,.33,'y',.008,5);}
  box(root,galv,-2.5,u-.26,mid,.3,.02,len);for(const d of [-.15,.15])box(root,galv,-2.5+d,u-.225,mid,.015,.07,len);box(root,cableA,-2.56,u-.23,mid,.05,.04,len);box(root,cableB,-2.47,u-.235,mid,.03,.03,len);
  for(let z=a+.5;z<b;z+=1.5)for(const d of [-.15,.15])cyl(root,galv,-2.5+d,u-.13,z,.008,.26,'y',.008,5);
  bulkhead(-5.94,2.85,15,1,0);bulkhead(-2.06,2.85,15,-1,0);lightPool(-4,groundHeight(-4,15),15,2.4);}
 // ---- Cunicolo: x -12..-8, z 4..8, underside 3.69 ---- two pipes along the tunnel and a lamp on each wall.
 {const u=3.69,a=-11.9,b=-8.1,len=b-a,mid=(a+b)/2;
  for(const [z,r,m] of [[4.3,.06,galv],[4.48,.045,cosmetic(p.copper)]]){cyl(root,m,mid,u-.2,z,r,len,'x',r,10);for(let x=a+.6;x<b;x+=1.6)cyl(root,black,x,u-.2,z,r+.012,.06,'x',r+.012,10);}
  for(let x=a+.4;x<b;x+=1.6){box(root,galv,x,u-.3,4.39,.04,.03,.4);for(const z of [4.22,4.56])cyl(root,galv,x,u-.15,z,.008,.3,'y',.008,5);}
  bulkhead(-10,2.8,4.06,0,1);bulkhead(-10,2.8,7.94,0,-1);lightPool(-10,groundHeight(-10,6),6,2);}
 // Fold the toned parts into the single paint material: colour moves to the vertices.
 root.traverse(m=>{const c=m.isMesh&&m.material.userData.hallTint;if(!c)return;const g=m.geometry.clone(),col=new Float32Array(g.attributes.position.count*3);for(let i=0;i<col.length;i+=3)col.set([c.r,c.g,c.b],i);g.setAttribute('color',new T.BufferAttribute(col,3));m.geometry=g;m.material=kit;});
}
