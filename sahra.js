import {sahraSiteDetails} from './sahra-sites.js?v=39.0';
import {desertFacade,desertCrate,desertTimber,desertColumn,desertCar,desertSkyline,desertDoors,desertArchTrim,desertVaultGeometry,desertAnnex,desertFeature} from './sahra-architecture.js?v=39.0';
import {sahraStairAt} from './sahra-terrain.js?v=39.0';
import * as T from './vendor/three.module.js';
import {WALLS,MAPS,groundHeight,wallDistance} from './shared.js?v=39.0';
import {box,cyl,label,mergeStatic,cable} from './graphics.js?v=39.0';
import {metricBlock as block} from './caldera-architecture.js?v=39.0';
import {createAtmosphere} from './atmosphere.js?v=39.0';
import {readableAlbedo,layeredWear,groundDrift,toneAlbedo} from './surface-detail.js?v=39.0';
import {decorateFacade,decalMaterial,driftField} from './decals.js?v=39.0';
import {trimMaterials} from './trim-kit.js?v=39.0';
import {materialLibrary,terrainMeshes,wallMeshes,portals,slabs} from './district-builder.js?v=39.0';
import {sahraSiteProps} from './site-props.js?v=39.0';
import {sahraInterior,sahraWalkable} from './sahra-layout.js?v=39.0';
import {StreetProps,roofClutter,facadeCondenser,facadeFixture,coverSkin} from './street-props.js?v=39.0';
export function createSahra(scene,renderer){
 const root=new T.Group();root.name='SAHRA / 13 desert district';scene.add(root);const {pending,texture,surface,layer}=materialLibrary();
 // V28.1 material library: tiling photographed CC0 bases plus a worn substrate layer (see QA-TEXTURE-V28-1.md).
 const substrate=layer('v28/rough_plasterbrick_05'),rust=layer('v28/rusty_metal_02');
 const stucco=color=>layeredWear(surface('v28/painted_plaster_wall',color,.84,.012,{amount:.13}),substrate,{edge:.38,base:.7,top:.22,scale:.85,tint:0xdccbb0});
 const p={plaster:stucco(0xf6dcb2),stone:surface('v5/sandstone_blocks_05',0xd9c3a0),floor:groundDrift(toneAlbedo(surface('v28/gravelly_sand',0xf6e2c0,.88,.01,{amount:.07,floor:true,normal:.3}),{saturation:.62,gain:1.48})),paving:groundDrift(toneAlbedo(surface('v13/stone_tiles_02',0xf8dcb2,.6,.05,{floor:true}),{saturation:.95,gain:1.5})),wood:surface('v13/weathered_planks',0xdfbd8e,.5)};
 const mat=(color,roughness=.86,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 Object.assign(p,{trim:mat(0xeee5d2),blue:mat(0x32626b),dark:mat(0x405458),metal:mat(0x34545a,.49,.45),copper:mat(0xad7955,.5,.48),siteIvory:mat(0xeee8da,.72),sitePaving:surface('v13/stone_tiles_02',0xe1dbce,.48,.07),road:groundDrift(surface('v28/asphalt_02',0xd8c9b2,.8,.02,{amount:.08,floor:true,normal:.3})),glass:mat(0x76999d,.34,.22),rust:mat(0x916f52),tire:mat(0x313a37),paper:mat(0xd7c29c)});
 Object.assign(p,{stuccoRose:stucco(0xf5d3b8),stuccoOchre:stucco(0xeac18a),stuccoWhite:stucco(0xf5e5c9),wornStone:surface('v5/sandstone_blocks_05',0xd5c8af),wornWood:mat(0x8a785e),shutterOlive:mat(0x426970),cargoBlue:layeredWear(surface('v28/corrugated_iron',0x7fa4ad,.85,.01,{amount:.1,normal:.4}),rust,{edge:.32,base:.5,top:.18,scale:.7,tint:0xd2b49a}),carPaints:[mat(0xc9bfa9,.66,.08),mat(0x48656b,.6,.14)],lamp:mat(0xe0d2a6)});
 Object.assign(p,{doorPaint:surface('v13/weathered_planks',0x8fc2c4,.82,.02,{amount:.08,normal:.45}),shutter:surface('v28/corrugated_iron',0x6f9aa1,.85,.01,{amount:.12,normal:.45}),shutterMarket:surface('v28/corrugated_iron',0x8aa088,.85,.01,{amount:.12,normal:.45}),annexConcrete:surface('v28/concrete_wall_008',0xf0e2cb,.86,.01,{amount:.1})});
 // Fresh-sawn lumber for the timber stacks: an even warm tone with only the grain relief, lighter than the weathered boards.
 p.lumber=new T.MeshStandardMaterial({color:0xab9069,normalMap:p.wood.normalMap,normalScale:new T.Vector2(.35,.35),roughness:.88});
 p.crate=readableAlbedo(new T.MeshStandardMaterial({color:0xe6bc86,map:p.wood.map,normalMap:p.wood.normalMap,normalScale:new T.Vector2(.25,.25),roughness:.92}),{contrast:.8,lift:.055});
 p.crateOlive=readableAlbedo(new T.MeshStandardMaterial({color:0x8e997e,map:p.wood.map,normalMap:p.wood.normalMap,normalScale:new T.Vector2(.3,.3),roughness:.9}),{contrast:.7,lift:.04});p.crateTan=readableAlbedo(new T.MeshStandardMaterial({color:0xc0ab83,map:p.wood.map,normalMap:p.wood.normalMap,normalScale:new T.Vector2(.3,.3),roughness:.94}),{contrast:.72,lift:.035});p.doorIron=mat(0x4e5850,.7,.25);
 p.vehicle={rack:true};p.tunnelFloor=groundDrift(surface('v28/cobblestone_floor_04',0xe8d6ba,.86,.01,{floor:true,normal:.4}));p.decal=decalMaterial();p.trimKit=trimMaterials(p.trim);p.stoneKit=trimMaterials(p.wornStone);
 const atmosphere=createAtmosphere(scene,renderer);scene.traverse(o=>{if(o.isHemisphereLight)o.intensity=1.35;});atmosphere.sun.color.set(0xfff1da);atmosphere.sun.intensity=2.65;atmosphere.sun.position.set(-50,91,-43);Object.assign(atmosphere.sun.shadow.camera,{left:-76,right:76,top:82,bottom:-82,far:210});atmosphere.sun.shadow.camera.updateProjectionMatrix();scene.fog=new T.Fog(0xd3ddd7,135,255);atmosphere.dome.scale.setScalar(1.8);
 // One metric height field: no overlapping flat floors or invisible stair walls.
 const sandAt=driftField(WALLS);
 // Surfaces follow the route graph: stone paving on sites, squares and the CT
 // plateau, cobbles under covered interiors, asphalt on the CT service road.
 const zone=(x,z)=>MAPS.sahra.walk.find(r=>x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3])?.[4],PAVED=new Set(['SITO A','SITO B','PIAZZA','FONTANA','RAMPA A','CT','CT A','LOGGIA','PASSAGGIO A']);
 const inTunnel=(x,z)=>!!sahraInterior(x,z),paved=(x,z)=>PAVED.has(zone(x,z)),road=(x,z)=>zone(x,z)==='VIA CT';
 terrainMeshes(root,WALLS,{stairAt:sahraStairAt,drift:sandAt,range:[-60,60,-66,66],surfaces:[[p.floor,(x,z)=>!sahraStairAt(x,z)&&!inTunnel(x,z)&&!paved(x,z)&&!road(x,z)],[p.tunnelFloor,inTunnel],[p.road,(x,z)=>!sahraStairAt(x,z)&&!inTunnel(x,z)&&road(x,z)],[p.paving,(x,z)=>!inTunnel(x,z)&&(sahraStairAt(x,z)||paved(x,z))]]});
 const sp=new StreetProps();
 wallMeshes(root,p,WALLS,{feature:(root,p,role,x,z,w,d,top,base)=>{if(role!=='trunk')return desertFeature(root,p,role,x,z,w,d,top,base);desertFeature(root,p,role,x,z,w,d,top,base,'bark');sp.add('palma',{x,y:base,z,yaw:x*2.3+z,scale:1.12+Math.abs(Math.sin(x+z))*.2,tag:'palm',fallback:()=>desertFeature(root,p,role,x,z,w,d,top,base,'crown')});},
  annex:desertAnnex,car:desertCar,crate:(root,p,x,z,w,d,top,base,metal)=>coverSkin(sp,metal?'pod':'crate',{x,z,w,d,top,base,fallback:()=>desertCrate(root,p,x,z,w,d,top,base,metal)}),
  column:desertColumn,
  lowWall:(root,p,x,z,w,d,h,base)=>{block(root,p.stone,x,(h+base-.12)/2,z,w,h-base-.12,d,1.5);box(root,p.trim,x,h-.06,z,w+.06,.12,d+.06);},
  pier:(root,p,x,z,w,d,h,base)=>{block(root,p.stone,x,(h-.26+base)/2,z,w,h-.26-base,d,1.4);box(root,p.trim,x,base+.15,z,w+.12,.3,d+.12);box(root,p.trim,x,h-.13,z,w+.16,.26,d+.16);},
  timber:(root,p,x,z,w,d,top,base)=>coverSkin(sp,'timber',{x,z,w,d,top,base,fallback:()=>desertTimber(root,p,x,z,w,d,top,base)}),
  building:(root,p,x,z,w,d,h,base)=>{const stone=x<-22&&z<-18;block(root,stone?p.stone:p.plaster,x,(h+base)/2,z,w,h-base,d,stone?1.9:2.8);},
  facade:(x,z,width,h,angle,serial)=>{const face=desertFacade(root,p,{x,z,width,height:h,angle,serial});if(face)decorateFacade(face,p.decal,{width,height:h,serial,ground:groundHeight,toWorld:u=>[x+Math.cos(angle)*u,z-Math.sin(angle)*u],posters:!sahraInterior(x,z)});if(!sahraInterior(x,z)){facadeCondenser(sp,{x,z,width,height:h,angle,serial,ground:groundHeight(x,z)});facadeFixture(sp,{x,z,width,height:h,angle,serial,ground:groundHeight(x,z)});}return face;},
  roofCap:(root,p,x,z,w,d,h)=>{if(!(w>5&&d>5))return;box(root,p.trim,x,h+.1,z,w+.08,.2,d+.08);for(const side of [-1,1])box(root,p.trim,x,h+.45,z+side*(d/2-.12),w,.7,.24);if(w>9&&d>7){cyl(root,p.blue,x+w*.1,h+.9,z,.9,1.2,'y',.9,20);box(root,p.dark,x-w*.2,h+.6,z+1,1.4,.9,.9);}}});
 portals(root,p,MAPS.sahra.arches,{material:p.stone,vault:desertVaultGeometry,trim:desertArchTrim});
 // V38 street dressing: roof clutter over the streets and wall condensers (cosmetic, instanced, loaded after the build).
 roofClutter(sp,MAPS.sahra,{walkable:(x,z)=>sahraWalkable(x,z)&&!sahraInterior(x,z),maxHeight:10,cap:w=>w[2]>5&&w[3]>5?.2:0});pending.push(sp.build(root));
 desertDoors(root,p,MAPS.sahra.movementBoxes);
 // Covered souk, hammam and loggia: slabs with skylight slots between them.
 slabs(root,p,MAPS.sahra.ballisticBoxes,{interiorAt:sahraInterior,beam:p.wornWood});
 // Painted wayfinding on real wall faces, readable from each decision point.
 for(const [text,origin,direction,w,h]of [['A →',[9,2.3,36],[0,0,-1],3,1.4],['← B',[-9,2.3,36],[0,0,-1],3,1.4],['A ↑',[26,2.2,-8],[0,0,-1],2.4,1.3],['A →',[13,3,-4],[0,0,-1],2.4,1.2],
  ['← B',[-6,2.9,-6],[0,0,-1],2.6,1.3],['B ↑',[-21,2.3,-4],[-1,0,0],2.4,1.3],['B ↑',[-37,2.2,-2],[-1,0,0],2.4,1.3],['A',[33,3.4,-34],[1,0,0],1.8,1.4],['B',[-32,2.1,-31],[1,0,0],1.8,1.4]])paintWall(root,text,origin,direction,w,h);
 sahraSiteDetails(root,p,MAPS.sahra.sites);
 sahraSiteProps(root,p);
 // Kasbah towers and mosque silhouette sit outside the playable boundary.
 for(const [x,z,h]of [[-52,-46,16],[-51,-20,13]]){cyl(root,p.stone,x,h/2,z,2.3,h,'y',2.7,20);cyl(root,p.trim,x,h+.15,z,2.8,.4,'y',2.8,20);}
 const dome=new T.Mesh(new T.SphereGeometry(4.8,28,16,0,Math.PI*2,0,Math.PI/2),p.blue);dome.position.set(-36,12,-55);root.add(dome);
 for(let i=0;i<24;i++){const side=i%2?1:-1,x=side*(65+(i%3)*5),z=-70+(i/2|0)*12,h=7+(i*7%8);block(root,i%3?p.plaster:p.stone,x,h/2,z,8,h,8,3);box(root,p.trim,x,h+.15,z,8.2,.3,8.2);}
 cyl(root,p.stone,-66,16,32,1.8,32,'y',2.2,20);cyl(root,p.trim,-66,32.4,32,2.5,.7,'y',2.5,20);cyl(root,p.blue,-66,34,32,1.5,2.6,'y',0,20);
 desertSkyline(root,p);
 const wire=new T.MeshStandardMaterial({color:0x4a524b,roughness:.9});wire.userData.nonBallistic=true;
 // Lamp cables strung between facades over the fountain court and the alleys.
 for(const line of [[[22,7.2,-6],[32,6.3,-6.4],[42,7.2,-6]],[[22,7.4,6],[32,6.6,6.3],[42,7.4,6]],[[-32,6.6,24],[-29,5.9,24.2],[-26,6.6,24]],[[-12,6.8,38],[0,6,38.5],[12,6.8,38]]])cable(root,line,wire,.018);
 mergeStatic(root);root.userData.materials=p;root.userData.ready=Promise.all(pending);return root;
}
function paintWall(root,text,origin,direction,w,h){
 const d=wallDistance(origin,direction,22);if(d<.2||d>=22)return;
 const m=paintMesh(text,w,h);m.position.set(...origin.map((v,i)=>v+direction[i]*(d-.045)));m.rotation.y=Math.atan2(-direction[0],-direction[2]);root.add(m);
}


function paintMesh(text,w,h){
 const c=document.createElement('canvas');c.width=1024;c.height=w/h<1.3?1024:512;const ctx=c.getContext('2d');ctx.fillStyle='#a45f3b';ctx.font='bold '+(c.height===1024?700:245)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,c.height/2,990);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:t,transparent:true,alphaTest:.03,depthWrite:false,roughness:1}));
}
