import * as THREE from './vendor/three.module.js';
// Procedural decal atlas (4×4 cells of 256 px) generated from typed arrays: no image
// files and no canvas, so map builds also run in Node checks. Storytelling detail in
// the Riot sense: stains, cracks and torn posters, kept low-contrast in the
// 1.0–2.0 m head band so silhouettes and peeks stay clean.
const CELL=256,GRID=4,SIZE=CELL*GRID;
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const fbm=(x,y)=>noise(x,y)*.5+noise(x*2.1,y*2.1)*.27+noise(x*4.3,y*4.3)*.15+noise(x*8.7,y*8.7)*.08;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Each painter returns linear-ish [r,g,b,a] for cell-local coordinates u,v in 0..1 (v up).
const PAINTERS=[
 // 0–2: water and rust streaks running down from a ledge.
 ...[[.2,.17,.13],[.34,.2,.11],[.16,.15,.14]].map((tone,k)=>(u,v,r)=>{const lanes=Math.abs(Math.sin((u*(5+k*2)+fbm(u*3,k)*1.6)*Math.PI));const fall=smooth(.0,.9,v)*(1-smooth(.92,1,v));const streak=Math.pow(lanes,6)*fall*(.55+.45*fbm(u*9,v*2+k));const edge=smooth(0,.12,u)*smooth(1,.88,u);return [...tone,Math.min(1,streak*1.25*edge)*.8];}),
 // 3: soot and grime gathered at a wall base.
 (u,v)=>{const n=fbm(u*4,v*3+7);return [.15,.13,.1,Math.max(0,(1-v*1.15)*(n*1.25-.2))*smooth(0,.15,u)*smooth(1,.85,u)*.75];},
 // 4–5: blotchy damp patches.
 ...[0,1].map(k=>(u,v)=>{const d=Math.hypot(u-.5,v-.5)*2,n=fbm(u*5+k*3,v*5);return [.2,.18,.14,Math.max(0,1-d+(n-.5)*.9)*.45*(.6+.4*n)];}),
 // 6–8: cracks: branching dark fissures with a slightly lighter broken lip.
 ...[11,23,37].map(seed=>{const r=rng(seed),lines=[];for(let b=0;b<4;b++){let x=.5+(r()-.5)*.2,y=b?lines[(r()*lines.length)|0]?.y??.5:.95,a=-Math.PI/2+(r()-.5)*.9;const pts=[];for(let i=0;i<60;i++){pts.push([x,y]);a+=(r()-.5)*.55;x+=Math.cos(a)*.012;y+=Math.sin(a)*.012;if(x<.05||x>.95||y<.05||y>.95)break;}lines.push({pts,y,w:b?.006:.009});}
  return (u,v)=>{let d=1;for(const l of lines)for(let i=0;i<l.pts.length;i+=2){const p=l.pts[i];d=Math.min(d,Math.hypot(u-p[0],v-p[1])/l.w);}const core=1-smooth(.5,1.1,d),lip=(1-smooth(1,2.6,d))*(1-core);return [.09+lip*.25,.08+lip*.23,.07+lip*.2,Math.min(1,core*.9+lip*.25)];};}),
 // 9–10: chipped paint spots exposing darker render.
 ...[5,9].map(seed=>(u,v)=>{const n=fbm(u*6+seed,v*6),d=Math.hypot(u-.5,v-.5)*2;const m=smooth(.48,.56,n+(.35-d*.45));return [.34,.29,.23,m*(1-smooth(.85,1,d))*.85];}),
 // 11–13: weathered paper posters with torn edges and faded print blocks.
 ...[[.58,.2,.14],[.16,.34,.42],[.62,.5,.24]].map((ink,k)=>(u,v)=>{const torn=fbm(u*13+k,v*13);const inside=u>.16+torn*.05&&u<.84-torn*.05&&v>.08+torn*.06&&v<.92-torn*.04;if(!inside)return [0,0,0,0];const band=(v>.62&&v<.8)||(v>.3&&v<.36&&u<.7)||(v>.22&&v<.26&&u<.55);const fade=.55+.45*fbm(u*3+k,v*3);const paper=[.78,.73,.62],c=band?ink:paper;return [c[0]*fade+.08,c[1]*fade+.07,c[2]*fade+.05,.92*smooth(0,.25,fbm(u*20,v*20)+.2)];}),
 // 14: stencilled, sun-faded direction chevrons.
 (u,v)=>{const x=u-.5,y=v-.5,chev=Math.abs(Math.abs(x)*1.2+y*.9-.05)<.06&&Math.abs(x)<.32&&Math.abs(y)<.28;return [.42,.2,.13,chev?(.45+.35*fbm(u*12,v*12)):0];},
 // 15: sand dust film settled on a ledge base.
 (u,v)=>{const n=fbm(u*7,v*2);return [.62,.53,.4,Math.max(0,(1-v*1.6)*(n*1.4-.25))*.7];}
];
let atlas=null;
function decalAtlas(){
 if(atlas)return atlas;const data=new Uint8Array(SIZE*SIZE*4);
 PAINTERS.forEach((paint,cell)=>{const cx=(cell%GRID)*CELL,cy=Math.floor(cell/GRID)*CELL;for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++){const c=paint((x+.5)/CELL,(y+.5)/CELL),i=((cy+y)*SIZE+cx+x)*4;for(let k=0;k<4;k++)data[i+k]=Math.max(0,Math.min(255,Math.round(Math.max(0,c[k])*255)));}});
 atlas=new THREE.DataTexture(data,SIZE,SIZE);atlas.colorSpace=THREE.SRGBColorSpace;atlas.generateMipmaps=true;atlas.minFilter=THREE.LinearMipmapLinearFilter;atlas.magFilter=THREE.LinearFilter;atlas.anisotropy=8;atlas.needsUpdate=true;return atlas;
}
export function decalMaterial(){const m=new THREE.MeshStandardMaterial({map:decalAtlas(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4,roughness:.96,metalness:0});m.userData.decal=true;return m;}
function place(parent,material,cell,x,y,z,w,h,bounds=null){
 // Never let a decal overhang the facade it belongs to: a floating quad would be visible cover.
 if(bounds){w=Math.min(w,2*Math.min(x-bounds.left,bounds.right-x));const bottom=Math.max(y-h/2,bounds.bottom),top=Math.min(y+h/2,bounds.top);h=top-bottom;y=(top+bottom)/2;if(w<.2||h<.2)return null;}
 const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv,cx=(cell%GRID)/GRID,cy=Math.floor(cell/GRID)/GRID;
 for(let i=0;i<uv.count;i++)uv.setXY(i,cx+(uv.getX(i)*(CELL-4)+2)/SIZE,cy+(uv.getY(i)*(CELL-4)+2)/SIZE);
 const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;
}
// Seeded decoration of one facade slab: drips under the cornice, grime and sand at
// the base, cracks and chips around openings, an occasional poster above head height.
export function decorateFacade(face,material,{width,height,serial=0,ground=()=>0,toWorld=u=>[u,0],depth=.041,posters=true}){
 const r=rng(9173+serial*131),count=Math.max(1,Math.round(width/2.6));
 for(let n=0;n<count;n++){
  const u=-width/2+.6+r()*(width-1.2);if(width<1.4)break;const g=ground(...toWorld(u)),pick=r(),bounds={left:-width/2+.05,right:width/2-.05,bottom:Math.max(.02,g+.02),top:height-.05};
  const quad=(...args)=>place(...args,bounds);
  if(pick<.3){const w=.8+r()*1.4,h=1.2+r()*1.8;quad(face,material,(r()*3)|0,u,Math.min(height-.25,g+height*.82)-h/2+.15,depth,w,h);}
  else if(pick<.5){const w=1.4+r()*2.2;quad(face,material,r()<.6?3:15,u,g+.42,depth,w,.85);}
  else if(pick<.68){const s=.7+r()*1.1;quad(face,material,6+((r()*3)|0),u,g+(r()<.5?.25+s/2:2.3+r()*(height-3.2)),depth,s,s);}
  else if(pick<.82){const s=.45+r()*.7;quad(face,material,9+((r()*2)|0),u,g+2.2+r()*Math.max(.2,height-3),depth,s,s*.8);}
  else if(pick<.92){const s=1+r()*1.5;quad(face,material,4+((r()*2)|0),u,g+1+r()*Math.max(.3,height-2),depth,s,s*.8);}
  else if(posters&&height>3.8){quad(face,material,11+((r()*3)|0),u,g+2.95+r()*.35,depth,.85,1.15);}
 }
}
// Sand gathers in wind shadows against walls and in corners. Bucketed AABB distance
// keeps the per-vertex query cheap on the half-metre terrain mesh.
export function driftField(walls,kinds=[0,1,4,5,6,8]){
 const cell=4,buckets=new Map(),key=(i,j)=>i+','+j;
 for(const w of walls){if(!kinds.includes(w[5]))continue;const r=2.6;for(let i=Math.floor((w[0]-w[2]/2-r)/cell);i<=Math.floor((w[0]+w[2]/2+r)/cell);i++)for(let j=Math.floor((w[1]-w[3]/2-r)/cell);j<=Math.floor((w[1]+w[3]/2+r)/cell);j++){const k=key(i,j);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(w);}}
 return (x,z)=>{const list=buckets.get(key(Math.floor(x/cell),Math.floor(z/cell)));if(!list)return 0;let near=9,second=9;for(const w of list){const d=Math.hypot(Math.max(0,Math.abs(x-w[0])-w[2]/2),Math.max(0,Math.abs(z-w[1])-w[3]/2));if(d<near){second=near;near=d;}else if(d<second)second=d;}
  const n=fbm(x*.35,z*.35),reach=.7+n*1.5,corner=1-smooth(.4,2.4,second);return Math.max(0,Math.min(1,(1-smooth(0,reach,near))*(.45+.55*fbm(x*1.3+5,z*1.3))+corner*.35*(1-smooth(0,reach*1.4,near))));};
}
