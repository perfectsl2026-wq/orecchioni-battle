import * as THREE from './vendor/three.module.js';
// V31 bullet holes and burn marks. Every mark is a colour map plus a normal map
// built from one procedural height field, so a hole has a real rim and a real
// cavity that catch the sun and the muzzle flash instead of a flat dark dot.
// Generated from typed arrays (no canvas, no image files) so Node checks run.
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
// While the marks are painted, noise corners (whole numbers shared by neighbouring pixels) are computed once: same values.
let lattice=null;const LAT=384,LAT0=160;
function corner(x,y){if(!lattice)return hash(x,y);const i=x+LAT0,j=y+LAT0;if(i<0||j<0||i>=LAT||j>=LAT)return hash(x,y);const k=j*LAT+i,c=lattice[k];return c===c?c:lattice[k]=hash(x,y);}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const a=corner(ix,iy),b=corner(ix+1,iy),c=corner(ix,iy+1),d=corner(ix+1,iy+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const fbm=(x,y)=>noise(x,y)*.5+noise(x*2.1,y*2.1)*.27+noise(x*4.3,y*4.3)*.15+noise(x*8.7,y*8.7)*.08;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const clamp01=v=>Math.max(0,Math.min(1,v));
// Each painter returns [r,g,b,alpha,height] for coordinates in -1..1. Height is
// negative inside a cavity and positive on a raised rim (metres are notional).
const PAINTERS={
 // Plaster and stone: a crushed cavity exposing the darker substrate, a chipped
 // lip, radial cracks and a dust halo that fades out.
 stone:(x,y)=>{const r=Math.hypot(x,y),a=Math.atan2(y,x),n=noise(x*9,y*9),m=fbm(x*4+3,y*4);
  const core=1-smooth(.10,.16,r+(n-.5)*.05),cavity=(1-smooth(.16,.36,r+(n-.5)*.14))*(1-core),lip=(1-smooth(.34,.46,r+(n-.5)*.1))*(1-cavity-core),halo=(1-smooth(.4,.98,r+(m-.5)*.25))*(1-lip-cavity-core);
  const crack=Math.pow(Math.abs(Math.sin(a*3.3+n*2.4)),70)*(1-smooth(.25,.8,r))+Math.pow(Math.abs(Math.sin(a*5.1+m*3)),90)*(1-smooth(.3,.65,r));
  const shade=core*.045+cavity*(.2+.1*m)+lip*.66+halo*(.58+.08*m);
  const alpha=Math.min(1,core+cavity*.95+lip*.8+halo*.32+crack*.55);
  const h=-core*.9-cavity*(.55+.2*n)+lip*(.32+.2*n)-crack*.35;
  return [shade+crack*.04,shade*.95,shade*.86,alpha,h];},
 // Sand: a soft crater, darker where the top crust is broken, a raised ring of
 // thrown grains and no cracks.
 sand:(x,y)=>{const r=Math.hypot(x,y),n=fbm(x*6,y*6),m=noise(x*14,y*14);
  const cavity=1-smooth(.12,.34,r+(n-.5)*.16),ring=(1-smooth(.3,.52,r+(n-.5)*.14))*(1-cavity),spray=(1-smooth(.45,.98,r+(n-.5)*.4))*(1-ring)*(1-cavity)*(.5+.5*m);
  const shade=cavity*(.36+.08*m)+ring*(.68+.1*m)+spray*.62;
  return [shade*1.02,shade*.9,shade*.74,Math.min(1,cavity*.92+ring*.7+spray*.28),-cavity*.7+ring*.3+spray*.08];},
 // Metal: a small punched hole with bright torn petals bent outward and a
 // scorched ring of burnt paint.
 metal:(x,y)=>{const r=Math.hypot(x,y),a=Math.atan2(y,x),n=noise(x*11,y*11);
  const core=1-smooth(.09,.12,r),petal=Math.pow(Math.abs(Math.cos(a*2.5+n*1.2)),3),rim=(1-smooth(.12,.22+petal*.08,r+(n-.5)*.03))*(1-core),bright=rim*(.55+.45*petal),scorch=(1-smooth(.16,.62,r+(n-.5)*.15))*(1-rim)*(1-core);
  const shade=core*.03+bright*.82+rim*(1-petal)*.3+scorch*.1;
  return [shade,shade*.98,shade*.95,Math.min(1,core+rim*.95+scorch*.5),-core+rim*(.45+.4*petal)-scorch*.05];},
 // Wood: an oval hole along the grain, torn fibres lifted on the exit side.
 wood:(x,y)=>{const r=Math.hypot(x,y),n=noise(x*4,y*22),g=noise(x*2+5,y*30);
  const core=1-smooth(.08,.13,r),fiber=(1-smooth(.1,.72,Math.hypot(x*2.4,y*.55)+(n-.5)*.3))*(1-core),splinter=(1-smooth(.1,.5,Math.hypot(x*1.1,y*.18)+(g-.5)*.25))*(1-core)*(1-fiber);
  const shade=core*.05+fiber*(.26+.1*g)+splinter*.4;
  return [shade*1.05,shade*.75,shade*.48,Math.min(1,core+fiber*.75+splinter*.6),-core*.8-fiber*.3+splinter*.25*(g-.3)];},
 // Blood: a splatter with satellite drops, matte and nearly flat.
 blood:(x,y)=>{let v=1-smooth(.18,.42,Math.hypot(x*1.1,y)+(noise(x*5,y*5)-.5)*.35);for(let i=0;i<9;i++){const cx=(hash(i,3)-.5)*1.4,cy=(hash(i,7)-.5)*1.4,rr=.03+hash(i,11)*.09;v=Math.max(v,1-smooth(rr*.6,rr,Math.hypot(x-cx,y-cy)));}const n=noise(x*14,y*14);return [.29+n*.06,.015,.02,v*.92,-v*.04];},
 // HE scorch: a black centre, a sooty ring and radial streaks of thrown debris.
 scorch:(x,y)=>{const r=Math.hypot(x,y),a=Math.atan2(y,x),n=fbm(x*5,y*5),streak=Math.pow(Math.abs(Math.sin(a*9+n*4)),14)*(1-smooth(.35,1,r))*smooth(.2,.45,r);
  const core=1-smooth(.1,.42,r+(n-.5)*.3),ring=(1-smooth(.4,.95,r+(n-.5)*.35))*(1-core);
  const shade=core*.04+ring*(.1+.12*n)+streak*.06;
  return [shade*1.1,shade,shade*.9,Math.min(1,core*.8+ring*.42+streak*.45),-core*.25-ring*.06];},
 // Blade: a long shallow score, bright where the edge bit, with a thin dark lip on each side.
 slash:(x,y)=>{const u=x*.96+y*.28,v=(y*.96-x*.28)+Math.sin(u*2.6)*.03,n=noise(u*18,v*40),m=noise(u*5+2,v*5);
  const ends=smooth(.92,.55,Math.abs(u)+(m-.5)*.3),width=.035+.03*(1-Math.abs(u))+(n-.5)*.018,groove=(1-smooth(width*.45,width,Math.abs(v)))*ends,lip=(1-smooth(width,width*2.1,Math.abs(v)))*(1-groove)*ends,second=(1-smooth(.008,.02,Math.abs(v-.075-u*.05)))*smooth(.62,.2,Math.abs(u-.12))*.7;
  const shade=groove*(.78+.2*n)+lip*.16+second*.62;
  return [shade,shade*.97,shade*.92,Math.min(1,groove*.95+lip*.55+second*.7),-groove*.5+lip*.18-second*.2];},
 // Fire residue: an uneven black patch with grey ash and an orange-brown edge.
 burn:(x,y)=>{const r=Math.hypot(x,y),n=fbm(x*4+9,y*4),m=noise(x*16,y*16);
  const patch=1-smooth(.3,1,r+(n-.5)*.6),ash=patch*smooth(.55,.75,m)*.5,edge=(1-smooth(.55,1,r+(n-.5)*.6))*(1-patch);
  const shade=patch*(.05+.03*m)+ash*.45+edge*.18;
  return [shade*1.15+edge*.12,shade*.98+edge*.06,shade*.86,Math.min(1,patch*.92+edge*.45),-patch*.04];}
};
const SIZE=192;
function paint(kind){
 const p=PAINTERS[kind],color=new Uint8Array(SIZE*SIZE*4),height=new Float32Array(SIZE*SIZE);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const c=p((x+.5)/SIZE*2-1,(y+.5)/SIZE*2-1),i=y*SIZE+x;for(let k=0;k<4;k++)color[i*4+k]=Math.max(0,Math.min(255,Math.round(clamp01(c[k])*255)));height[i]=c[4]||0;}
 // Normal map from the height field: central differences, scaled so a hole rim reads at arm's length.
 const normal=new Uint8Array(SIZE*SIZE*4),at=(x,y)=>height[Math.max(0,Math.min(SIZE-1,y))*SIZE+Math.max(0,Math.min(SIZE-1,x))];
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const dx=(at(x+1,y)-at(x-1,y))*9,dy=(at(x,y+1)-at(x,y-1))*9,len=Math.hypot(dx,dy,1),i=(y*SIZE+x)*4;normal[i]=Math.round((-dx/len*.5+.5)*255);normal[i+1]=Math.round((-dy/len*.5+.5)*255);normal[i+2]=Math.round((1/len*.5+.5)*255);normal[i+3]=255;}
 const map=new THREE.DataTexture(color,SIZE,SIZE);map.colorSpace=THREE.SRGBColorSpace;const normalMap=new THREE.DataTexture(normal,SIZE,SIZE);
 for(const t of [map,normalMap]){t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=8;t.needsUpdate=true;}
 return {map,normalMap};
}
let cache=null;
export function impactTextures(){if(cache)return cache;cache={};lattice=new Float64Array(LAT*LAT).fill(NaN);for(const kind of Object.keys(PAINTERS))cache[kind]=paint(kind);lattice=null;return cache;}
// Roughness/metalness per mark so a torn steel rim glints and plaster stays chalky.
const LOOK={stone:{roughness:.92,metalness:0,normal:1.1},sand:{roughness:.98,metalness:0,normal:.8},metal:{roughness:.4,metalness:.65,normal:1.3},wood:{roughness:.86,metalness:0,normal:1},blood:{roughness:.3,metalness:0,normal:.4},scorch:{roughness:.97,metalness:0,normal:.5},burn:{roughness:.98,metalness:0,normal:.4},slash:{roughness:.42,metalness:.55,normal:1.2}};
export function markMaterial(kind){
 const t=impactTextures()[kind]||impactTextures().stone,look=LOOK[kind]||LOOK.stone;
 const m=new THREE.MeshStandardMaterial({map:t.map,normalMap:t.normalMap,normalScale:new THREE.Vector2(look.normal,look.normal),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,roughness:look.roughness,metalness:look.metalness});
 m.userData.mark=kind;return m;
}
// Mark footprint per material (metres): metal holes are small and sharp, sand craters wide.
export function markSize(kind,random=Math.random){
 return kind==='slash'?.24+random()*.06:kind==='metal'?.05+random()*.015:kind==='wood'?.07+random()*.02:kind==='sand'?.13+random()*.05:kind==='scorch'?2.2+random()*.6:kind==='burn'?5.6+random()*.8:.085+random()*.03;
}
