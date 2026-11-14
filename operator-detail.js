// V47 surface detail of the operators' bodies: the "bought-in" quality (crisp, believable, hero-shooter clean) on every
// operator's whole body, without a texture set per body. Three ingredients, shared by every operator and team:
//  1. Micro surface: three tileable maps generated from original noise and drawn primitives (art/source/v47/detail/
//     make_detail.py), each RGBA = tangent normal xy, cavity or mask, roughness offset: ripstop cloth (tile 4.8 cm), brushed
//     and bead-blasted steel with scratches (12 cm), painted shell with a chip field (14 cm). 0.48 MB once (phone 0.12 MB),
//     mipmapped and anisotropic, so they are crisp at 1 m and melt into the material's own tone at 5 m, never noise.
//  2. Construction, computed per pixel from what each body already knows (no texture, so never blurred): on the wear kits'
//     panels the exact distance to each rim (wearRim, operator-wear.js) gives engraved border grooves, fasteners at the
//     corners and along long rims, burnished or chipped edges (paint off to bare steel); on the whole bodies the paint mask's
//     edge (its distance measured from the mask's own gradient) gives the seam groove, a stitch row on the cloth side and
//     chipped paint on hard parts.
//  3. Markings: a sheet of original marks (chevrons, caution, lift arrow, code bars, hazard frame, the OB monogram, an
//     alignment mark, grip dots, slot numbers 01-08) projected in the soldier's bind space (pose-proof), up to 8 per kit.
// Per kit only uniforms change (DETAIL below): one program per body type, as before. A kit absent from DETAIL is unchanged.
import * as T from './vendor/three.module.js';
import {SIGNATURE,TEAM_SIGNAL} from './operator-kits.js?v=42.0';
import {liteWorld} from './horizon.js?v=42.0';
const FILES={cloth:'./assets/textures/v47/op-cloth.webp',metal:'./assets/textures/v47/op-metal.webp',paint:'./assets/textures/v47/op-paint.webp',marks:'./assets/textures/v47/op-marks.webp'};
// Until the maps arrive every sampler holds a flat neutral texel (normal straight up, no cavity, no roughness change, no mark).
function flat(rgba){const t=new T.DataTexture(new Uint8Array(rgba),1,1);t.needsUpdate=true;return t;}
const TEX={cloth:{value:flat([128,128,255,128])},metal:{value:flat([128,128,0,128])},paint:{value:flat([128,128,255,128])},marks:{value:flat([0,0,0,255])}};
const READY={value:0};let loading=null;
export function loadDetail(){
 if(loading)return loading;if(typeof document==='undefined'||typeof document.createElementNS!=='function'){loading=Promise.resolve(false);return loading;}
 const L=new T.TextureLoader();
 loading=Promise.all(Object.entries(FILES).map(([k,f])=>L.loadAsync(f).then(t=>{t.wrapS=t.wrapT=k==='marks'?T.ClampToEdgeWrapping:T.RepeatWrapping;t.anisotropy=8;t.colorSpace=T.NoColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.needsUpdate=true;TEX[k].value=t;return true;})))
  .then(()=>{READY.value=1;return true;},()=>false);return loading;}
// Per kit: tile sizes are shared; `edge` how far (m) paint wears off a rim, `bolts` fasteners on hard plates, `groove` engraved
// borders, `seam` the paint-edge seam and stitching of the whole bodies, `chip` paint wear on the whole bodies' hard parts.
// thigh: two-tone panels on the front of the thighs (whole bodies); flat: how much of the texture's baked shading to drop (ONICE);
// gear: per role, a two-tone field on a flat face [centre, normal, right, half width, half height, tone] and marks, in the piece's space.
// garment: 8 weights of the tailored seams and pieces of the whole bodies (odSeams), zip: the front zip.
// Check Fable: the shoulder numbers are 28 % smaller (they stretched round the arm).
// decals: [slot, colour, centre xyz (bind metres), right xyz, normal xyz, half width, half height]; colour 0 off-white, 1 dark,
// 2 the kit's accent, 3 the team's signal. Slots: 0 chevron, 1 caution, 2 arrow, 3 code bars, 4 hazard, 5 OB, 6 alignment,
// 7 grip dots, 8..15 numbers 01..08.
export const DETAIL={
 assalto:{edge:.006,bolts:1,groove:1,tone:{role:'self',mul:.68,k:.85,inset:.016},decals:[
  [8,0,[-.3455,1.356,-.02],[0,0,1],[-.84,.54,0],.029,.029],[8,0,[-.025,1.354,-.241],[-1,0,0],[0,0,-1],.05,.05],[3,0,[-.06,1.315,.199],[1,0,-.25],[-.25,0,1],.022,.022],[1,0,[.064,1.315,.196],[1,0,.25],[.25,0,1],.018,.018],[4,0,[-.015,1.246,-.204],[-1,0,0],[0,0,-1],.05,.05],[8,0,[.124,.75,.108],[1,0,-.3],[.3,0,1],.035,.035],[0,2,[-.112,.735,.105],[1,0,.3],[-.3,0,1],.03,.03],[3,0,[-.078,1.02,.153],[1,0,.25],[-.25,0,1],.025,.025]]},
 sfondamento:{edge:.006,bolts:1,groove:1,tone:{role:'self',mul:.7,k:.8,inset:.016},decals:[
  [9,0,[-.3455,1.356,-.02],[0,0,1],[-.84,.54,0],.029,.029],[9,0,[0,1.397,-.242],[-1,0,0],[0,0,-1],.05,.05],[1,0,[-.0675,1.31,.213],[1,0,-.25],[-.25,0,1],.02,.02],[3,0,[.067,1.31,.211],[1,0,.25],[.25,0,1],.022,.022],[9,0,[.124,.75,.108],[1,0,-.3],[.3,0,1],.035,.035],[0,2,[-.112,.735,.105],[1,0,.3],[-.3,0,1],.03,.03],[3,0,[-.078,1.02,.178],[1,0,.25],[-.25,0,1],.025,.025]]},
 mastino:{edge:.0045,bolts:1,groove:1,hard:['D'],tone:{role:'main',mul:.74,k:.9,inset:.016},decals:[
  [10,0,[-.3455,1.356,-.02],[0,0,1],[-.84,.54,0],.029,.029],[10,1,[0,1.305,-.285],[-1,0,0],[0,-.36,-.93],.042,.042],[4,1,[0,1.215,-.25],[-1,0,0],[0,-.36,-.93],.035,.035],
  [5,1,[.136,1.705,-.002],[0,0,-1],[1,0,0],.02,.02],[5,1,[-.137,1.702,-.001],[0,0,1],[-1,0,0],.02,.02],
  [0,2,[-.125,.8,.133],[1,0,.3],[-.3,0,1],.028,.028],[10,0,[.124,.8,.133],[1,0,-.3],[.3,0,1],.026,.026]]},
 saetta:{edge:.005,seam:1,chip:1,thigh:1,garment:[1,1,1,1,1,0,0,0],tone:{role:'dark',mul:1,k:.9,sides:1,pads:1},decals:[
  [11,1,[-.3455,1.356,-.02],[0,0,1],[-.84,.54,0],.029,.029],[11,1,[0,1.354,-.1665],[-1,0,0],[0,0,-1],.05,.05],[3,1,[-.058,1.3,.159],[1,0,.15],[-.15,0,1],.022,.022],[0,2,[.125,.793,.121],[1,0,-.3],[.3,0,1],.022,.022],[5,1,[.0255,1.212,-.1498],[-1,0,0],[0,0,-1],.024,.024],[11,1,[.124,.75,.108],[1,0,-.3],[.3,0,1],.035,.035],[0,2,[-.112,.735,.105],[1,0,.3],[-.3,0,1],.03,.03],[3,1,[-.078,1.02,.128],[1,0,.25],[-.25,0,1],.025,.025]]},
 onice:{edge:.004,gloss:1,flat:.85,thigh:1,garment:[1,1,1,1,1,0,0,0],tone:{role:'accent',mul:.32,k:.8,yoke:1,sides:1,pads:1},decals:[
  [12,0,[-.3455,1.356,-.02],[0,0,1],[-.84,.54,0],.029,.029],[12,0,[0,1.354,-.1665],[-1,0,0],[0,0,-1],.05,.05],[6,2,[-.058,1.3,.159],[1,0,.15],[-.15,0,1],.02,.02],[12,0,[.124,.75,.108],[1,0,-.3],[.3,0,1],.035,.035],[0,2,[-.112,.735,.105],[1,0,.3],[-.3,0,1],.03,.03],[3,0,[-.078,1.02,.128],[1,0,.25],[-.25,0,1],.025,.025]]},
 astore:{edge:.004,zip:1,thigh:1,garment:[1,1,1,1,1,1,1,1],tone:{role:'dark',mul:1.3,k:.85,yoke:1,pads:1},
  gear:{main:{panel:[[0,-.03,.244],[0,0,1],[1,0,0],.092,.125,.72],decals:[[13,1,[0,.04,.246],[1,0,0],[0,0,1],.04,.04],[4,1,[0,-.12,.246],[1,0,0],[0,0,1],.05,.05]]}},decals:[
  [13,1,[-.3455,1.356,-.02],[0,0,1],[-.84,.54,0],.029,.029],[13,1,[0,1.354,-.1665],[-1,0,0],[0,0,-1],.05,.05],
  [5,1,[.085,1.293,.15],[1,0,-.15],[.15,0,1],.022,.022],[3,1,[-.085,1.293,.148],[1,0,.15],[-.15,0,1],.022,.022],[1,1,[-.235,.69,0],[0,0,1],[-1,0,0],.018,.018],[13,1,[.124,.75,.108],[1,0,-.3],[.3,0,1],.035,.035],[0,2,[-.112,.735,.105],[1,0,.3],[-.3,0,1],.03,.03]]},
 corvo:{edge:.004,thigh:1,garment:[1,1,1,1,1,0,0,0],tone:{role:'main',mul:2.3,k:.85,yoke:1,sides:1,pads:1},
  gear:{main:{panel:[[0,-.13,.25],[0,0,1],[1,0,0],.1,.11,1.6],decals:[[14,2,[0,-.08,.25],[1,0,0],[0,0,1],.045,.045],[0,2,[0,-.2,.26],[1,0,0],[0,0,1],.03,.03]]}},decals:[
  [14,2,[-.3455,1.356,-.02],[0,0,1],[-.84,.54,0],.029,.029],[14,2,[-.058,1.3,.159],[1,0,.15],[-.15,0,1],.03,.03],[0,2,[.125,.793,.121],[1,0,-.3],[.3,0,1],.022,.022],[14,2,[.124,.75,.108],[1,0,-.3],[.3,0,1],.035,.035],[0,2,[-.112,.735,.105],[1,0,.3],[-.3,0,1],.03,.03],[3,2,[-.078,1.02,.128],[1,0,.25],[-.25,0,1],.025,.025]]},
 lince:{edge:.004,seam:1,chip:1,thigh:1,garment:[0,1,1,1,1,0,0,0],tone:{role:'dark',mul:1,k:.8,yoke:1,sides:1,pads:1},decals:[
  [15,0,[-.3455,1.356,-.02],[0,0,1],[-.84,.54,0],.029,.029],[15,0,[0,1.354,-.1665],[-1,0,0],[0,0,-1],.05,.05],[7,0,[-.058,1.3,.159],[1,0,.15],[-.15,0,1],.02,.02],[15,0,[.124,.75,.108],[1,0,-.3],[.3,0,1],.035,.035],[0,2,[-.112,.735,.105],[1,0,.3],[-.3,0,1],.03,.03],[3,0,[-.078,1.02,.128],[1,0,.25],[-.25,0,1],.025,.025]]}
};
export const detailOn=kit=>!!DETAIL[kit];
const SIZES=new T.Vector3(.048,.12,.14);
// The second tone of a two-tone scheme: a role of the kit's palette, lightened or darkened (mul), or a hex colour; 'self' keeps
// each plate's own colour and only darkens or lightens it (so a mustard pad stays mustard), passed as (-1, mul, 0).
function toneColour(D,sig){const t=D?.tone;if(!t)return new T.Color(0x808080);if(t.role==='self')return new T.Color(-1,t.mul??.7,0);const c=new T.Color(sig[t.role]||t.role||'#808080');return c.multiplyScalar(t.mul??1);}const kitU=new Map();
// Up to 10 marks as 3 vec4 each: (centre, half width), (right, half height), (normal, slot + 16 * colour); -1 marks an empty one.
function decalVecs(list){const dec=[];for(let i=0;i<10;i++){const d=list?.[i];if(!d){dec.push(new T.Vector4(0,-9,0,0),new T.Vector4(1,0,0,0),new T.Vector4(0,0,1,-1));continue;}
  const [slot,col,c,r,n,hw0,hh0]=d,hw=hw0*1.25,hh=hh0*1.25,R=new T.Vector3(...r).normalize(),N=new T.Vector3(...n).normalize();R.addScaledVector(N,-R.dot(N)).normalize();
  dec.push(new T.Vector4(...c,hw),new T.Vector4(R.x,R.y,R.z,hh),new T.Vector4(N.x,N.y,N.z,slot+16*col));}return dec;}
// On the phone path (liteWorld: phones and ?lite=1) the fasteners, tailoring, mask-edge seams and zip are off; tiles, two-tone
// and the marks (the kit numbers that carry the read at range) stay. Measured with ?lite=1 and the phone assets.
export function detailUniforms(kit,team){
 const key=kit+':'+team;if(kitU.has(key))return kitU.get(key);const D=DETAIL[kit],sig=SIGNATURE[kit]||{};
 const lite=liteWorld(),dec=decalVecs(D?.decals);
 const u={odCloth:TEX.cloth,odMetal:TEX.metal,odPaint:TEX.paint,odMarks:TEX.marks,odReady:READY,odSize:{value:SIZES},
  odK:{value:new T.Vector4(D?1:0,D?(D.edge??.005):0,D&&!lite?(D.bolts??0):0,D?(D.groove??0):0)},odB:{value:new T.Vector4(D&&!lite?(D.seam??0):0,D?(D.chip??0):0,D&&!lite?(D.zip??0):0,D?.tone?.k??0)},odDec:{value:dec},odG:{value:[new T.Vector4(...(!lite&&D?.garment||[0,0,0,0,0,0,0,0]).slice(0,4)),new T.Vector4(...(!lite&&D?.garment||[0,0,0,0,0,0,0,0]).slice(4,8))]},
  odTone:{value:toneColour(D,sig)},odT:{value:new T.Vector4(D?.tone?.inset??.016,D?.tone?.yoke??0,D?.tone?.sides??0,D?.tone?.pads??0)},odX:{value:new T.Vector4(D?.gloss??0,lite?0:D?.thigh??0,D?.flat??0,0)},
  odCol:{value:[new T.Color(0xd9d5ca),new T.Color(0x16181b),new T.Color(sig.accent||'#cccccc'),new T.Color(TEAM_SIGNAL[team==='blue'?'blue':'orange'])]}};
 kitU.set(key,u);return u;}
// Metres of surface per unit of a geometry's uv (median over its triangles), so a tile keeps its physical size on any body.
const uvm=new WeakMap();
export function uvMetres(g,unit=1.1e6){
 if(!g?.attributes?.uv)return 1;if(uvm.has(g))return uvm.get(g);const P=g.attributes.position,UV=g.attributes.uv,I=g.index?.array,n=I?I.length:P.count,r=[];
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let t=0;t+2<n;t+=3*Math.max(1,Math.floor(n/3/1500))){const i0=I?I[t]:t,i1=I?I[t+1]:t+1,i2=I?I[t+2]:t+2;a.fromBufferAttribute(P,i0);b.fromBufferAttribute(P,i1).sub(a);c.fromBufferAttribute(P,i2).sub(a);
  const A3=b.cross(c).length()/2,A2=Math.abs((UV.getX(i1)-UV.getX(i0))*(UV.getY(i2)-UV.getY(i0))-(UV.getX(i2)-UV.getX(i0))*(UV.getY(i1)-UV.getY(i0)))/2;if(A2>1e-12&&A3>0)r.push(Math.sqrt(A3/A2)/unit);}
 r.sort((x,y)=>x-y);const v=r.length?r[r.length>>1]:1;uvm.set(g,v);return v;}
// odFrame: tangent frame from screen derivatives (no tangent attribute needed); odGrad: a scalar's gradient along the uv axes.
// odDecal: the marks over a bind-space point (x coverage, y colour index). odBolt: a fastener head at offset d (metres) from its
// centre: x coverage, y ring shadow, zw the dome's slope in the d axes. The marks are sampled with explicit gradients (taken
// before the loop): an implicit level inside a branch would pick a random mip.
export const DETAIL_GLSL=`uniform sampler2D odCloth;uniform sampler2D odMetal;uniform sampler2D odPaint;uniform sampler2D odMarks;uniform float odReady;uniform vec3 odSize;uniform vec4 odK;uniform vec4 odB;uniform vec4 odDec[30];uniform vec3 odCol[4];uniform vec4 odG[2];uniform vec3 odTone;uniform vec4 odT;uniform vec4 odX;
mat3 odFrame(vec3 N,vec3 p,vec2 uv){vec3 q1=dFdx(p),q2=dFdy(p);vec2 s1=dFdx(uv),s2=dFdy(uv);vec3 q2p=cross(q2,N),q1p=cross(N,q1);vec3 t=q2p*s1.x+q1p*s2.x,b=q2p*s1.y+q1p*s2.y;float d=max(dot(t,t),dot(b,b));return d<1e-30?mat3(0.):mat3(t*inversesqrt(d),b*inversesqrt(d),N);}
vec3 odPerturb(vec3 N,vec3 p,vec2 uv,vec2 nxy){if(dot(nxy,nxy)<1e-8)return N;mat3 m=odFrame(N,p,uv);if(m[0]==vec3(0.))return N;return normalize(m*vec3(nxy,1.));}
vec2 odGrad(float f,vec2 uv){vec2 s1=dFdx(uv),s2=dFdy(uv);float a=dFdx(f),b=dFdy(f),det=s1.x*s2.y-s1.y*s2.x;if(abs(det)<1e-20)return vec2(0.);return vec2(a*s2.y-b*s1.y,b*s1.x-a*s2.x)/det;}
float odLine(float d,float w){float aa=fwidth(d)*.8+1e-7;return 1.-smoothstep(w-aa,w+aa,abs(d));}
vec4 odBolt(vec2 d,float r){float l=length(d),aa=length(fwidth(d))*.8+1e-7,cov=1.-smoothstep(r-aa,r+aa,l),ring=(1.-smoothstep(r,r+.0009+aa,l))-cov;vec2 sl=d/r*.9*cov;return vec4(cov,ring,sl);}
// Garment construction of the whole bodies (they all share the soldier's bind space): the nearest seam to P (signed distance in
// metres, a coordinate along it for the stitch dashes, 1 for the front zip) and the quilting inside a pad. odG weights pick
// the pieces per kit: x waist, y yoke, z sleeve rings (shoulder and cuff), w trouser cuffs; then x outer leg seam, y knee pads,
// z thigh pockets, w chest pockets; odB.z the front zip.
float odRR(vec2 q,vec2 b,float r){vec2 d=abs(q)-b+r;return length(max(d,0.))+min(max(d.x,d.y),0.)-r;}
vec3 odRing(vec3 p,vec3 a,vec3 b,float t,float r){vec3 n=normalize(b-a);float s=dot(p-a,n);vec3 q=p-a-n*s,u=normalize(cross(n,vec3(0.,0.,1.))),v=cross(n,u);
 return vec3(s-t*length(b-a),atan(dot(q,u),dot(q,v))*.06,1.-smoothstep(r,r+.03,length(q)));}
vec4 odSeams(vec3 P,out float quilt){vec3 p=vec3(abs(P.x),P.y,P.z);quilt=0.;float best=1.,al=0.,zip=0.,inside=0.;
 const vec3 HIP=vec3(.084,.94,0.),KNEE=vec3(.134,.505,-.012),ANK=vec3(.175,.128,-.076),SHO=vec3(.184,1.472,-.057),ELB=vec3(.352,1.21,-.016),WRI=vec3(.46,1.055,.07);
 vec3 r;float d;
 if(odG[0].x>0.&&p.x<.23){d=p.y-1.;if(abs(d)<abs(best)){best=d;al=atan(P.x,P.z)*.16;}}
 if(odG[0].y>0.&&p.x<.15){d=p.y-1.385;if(abs(d)<abs(best)){best=d;al=atan(P.x,P.z)*.16;}}
 if(odG[0].z>0.){r=odRing(p,SHO,ELB,.16,.12);if(r.z>.5&&abs(r.x)<abs(best)){best=r.x;al=r.y;}r=odRing(p,ELB,WRI,.86,.1);if(r.z>.5&&abs(r.x)<abs(best)){best=r.x;al=r.y;}}
 if(odG[0].w>0.){r=odRing(p,KNEE,ANK,.84,.14);if(r.z>.5&&abs(r.x)<abs(best)){best=r.x;al=r.y;}}
 vec3 ax=normalize(KNEE-HIP);
 if(odG[1].x>0.&&p.y<.93&&p.y>.15){vec3 c=HIP+ax*dot(p-HIP,ax);if(p.x>c.x){d=p.z-c.z;if(abs(d)<abs(best)){best=d;al=p.y;}}}
 if(odG[1].y>0.){vec3 a2=normalize(ANK-KNEE),k=KNEE+vec3(0.,.02,0.);vec2 q=vec2(p.x-k.x,dot(p-k,normalize(a2-ax))*0.+p.y-k.y);if(p.z>k.z+.03){float sd=odRR(q,vec2(.058,.075),.022);
   if(abs(sd)<abs(best)){best=sd;al=abs(q.x)/.058>abs(q.y)/.075?q.y:q.x;}if(sd<0.){quilt=max(quilt,1.-smoothstep(-.004,0.,sd));inside=max(inside,1.-smoothstep(-.0015,0.,sd));}}}
 if(odG[1].z>0.){vec3 c=mix(HIP,KNEE,.5);if(p.x>c.x+.04){vec2 q=vec2(p.z-c.z-.01,p.y-c.y);float sd=odRR(q,vec2(.06,.075),.012),fl=q.y-.04;
   if(abs(sd)<abs(best)){best=sd;al=abs(q.x)/.06>abs(q.y)/.075?q.y:q.x;}if(sd<0.){inside=max(inside,1.-smoothstep(-.0015,0.,sd));if(abs(fl)<abs(best)){best=fl;al=q.x;}}}}
 if(odG[1].w>0.&&P.z>.05){vec2 q=vec2(p.x-.085,p.y-1.31);float sd=odRR(q,vec2(.045,.05),.008),fl=q.y-.028;
   if(abs(sd)<abs(best)){best=sd;al=abs(q.x)/.045>abs(q.y)/.05?q.y:q.x;}if(sd<0.){inside=max(inside,1.-smoothstep(-.0015,0.,sd));if(abs(fl)<abs(best)){best=fl;al=q.x;}}}
 if(odX.y>0.&&P.z>0.){vec2 q=vec2(p.x-.112,p.y-.735);float sd=odRR(q,vec2(.05,.105),.02);if(abs(sd)<abs(best)){best=sd;al=abs(q.x)/.05>abs(q.y)/.105?q.y:q.x;}if(sd<0.)inside=max(inside,1.-smoothstep(-.0015,0.,sd));}
 if(odT.z>0.&&p.y>1.&&p.y<1.385&&p.x<.2){d=p.x-.118;if(abs(d)<abs(best)){best=d;al=p.y;}}
 if(odT.y>0.&&p.x>.13&&p.x<.17&&p.y>1.385&&p.y<1.52){d=p.x-.15;if(abs(d)<abs(best)){best=d;al=p.y;}}
 if(odB.z>0.&&P.z>.05&&P.y>.98&&P.y<1.47){d=P.x;if(abs(d)<abs(best)+.004){best=d;al=P.y;zip=1.;}}
 return vec4(best,al,zip,inside);}
vec2 odDecal(vec3 P){float m=0.,ci=0.;vec3 px=dFdx(P),py=dFdy(P);
 for(int i=0;i<10;i++){vec4 a=odDec[i*3],b=odDec[i*3+1],c=odDec[i*3+2];if(c.w<0.)continue;vec3 q=P-a.xyz;if(abs(dot(q,c.xyz))>.055)continue;
  vec3 up=cross(c.xyz,b.xyz);vec2 st=vec2(dot(q,b.xyz)/a.w,dot(q,up)/b.w);if(abs(st.x)>1.||abs(st.y)>1.)continue;
  float slot=mod(c.w,16.),col=floor(c.w/16.),row=floor(slot/8.);vec2 uv=vec2((mod(slot,8.)+st.x*.5+.5)/8.,(1.-row+st.y*.5+.5)*.5);
  vec2 sc=vec2(.0625/a.w,.25/b.w);float k=textureGrad(odMarks,uv,vec2(dot(px,b.xyz),dot(px,up))*sc,vec2(dot(py,b.xyz),dot(py,up))*sc).r;if(k>m){m=k;ci=col;}}
 return vec2(m,ci);}
`;
// Gear pieces (operator-kits.js SILHOUETTES: pauldrons, packs, vents, capes, ears, claws): rigid meshes without uv. The tiles are
// projected along the piece's own axes (triplanar, metres), and the bevels found from the screen-space bend of the normal get
// the same treatment as the plates' rims: a bright bevel on metal, chipped paint to steel on lacquer, a darker seam on cloth.
const gearDone=new WeakSet();
export function gearDetail(m,kit,role,team){
 const D=DETAIL[kit];if(!D||gearDone.has(m))return m;gearDone.add(m);const sig=SIGNATURE[kit]||{},kind=sig.kind?.[role]??1;
 const G=D.gear?.[role],P=G?.panel,V=(v,w)=>new T.Vector4(...v,w);
 const u={...detailUniforms(kit,team||'blue'),odKind:{value:kind},odDec:{value:decalVecs(G?.decals)},
  odGP0:{value:P?V(P[0],P[3]):new T.Vector4()},odGP1:{value:P?V(P[1],P[4]):new T.Vector4()},odGR:{value:P?V(P[2],P[5]):new T.Vector4(1,0,0,1)}};const prev=m.onBeforeCompile;
 m.onBeforeCompile=(s,r)=>{prev?.call(m,s,r);Object.assign(s.uniforms,u);
  s.vertexShader='varying vec3 vGP;varying vec3 vGN;varying vec3 vGX;varying vec3 vGY;varying vec3 vGZ;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGP=position;vGN=normal;vGX=normalize(normalMatrix*vec3(1.,0.,0.));vGY=normalize(normalMatrix*vec3(0.,1.,0.));vGZ=normalize(normalMatrix*vec3(0.,0.,1.));');
  s.fragmentShader='uniform float odKind;uniform vec4 odGP0;uniform vec4 odGP1;uniform vec4 odGR;varying vec3 vGP;varying vec3 vGN;varying vec3 vGX;varying vec3 vGY;varying vec3 vGZ;\n'+DETAIL_GLSL+`vec4 odTri(sampler2D t,float sz,vec3 w){return texture2D(t,vGP.zy/sz)*w.x+texture2D(t,vGP.xz/sz)*w.y+texture2D(t,vGP.xy/sz)*w.z;}
`+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec3 gW=pow(abs(normalize(vGN)),vec3(4.));gW/=gW.x+gW.y+gW.z+1e-5;float gC=odKind<.5?1.:0.,gM=odKind>1.5?1.:0.,gL=1.-gC-gM;
  vec4 gT=gC>.5?odTri(odCloth,odSize.x,gW):gM>.5?odTri(odMetal,odSize.y,gW):odTri(odPaint,odSize.z,gW),gS=odTri(odMetal,odSize.y,gW);
  float gEdge=0.,gThin=0.;{vec3 vn=normalize(vNormal);float cv=length(fwidth(vn))/max(length(fwidth(vViewPosition)),1e-5);gEdge=smoothstep(45.,100.,cv)*odReady;gThin=smoothstep(200.,330.,cv);}
  diffuseColor.rgb*=mix(1.,.84+.32*gT.b,gC*odReady)*(1.+.3*gT.b*gM*odReady);
  diffuseColor.rgb*=1.+gEdge*(.55*gM+.35*gL)-.35*gEdge*gC;
  float gCh=gL*gEdge*(1.-gThin)*(1.-smoothstep(.44,.52,gT.b))*odK.y/max(odK.y,1e-4);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.73,.75)*(.85+.3*gS.r),gCh);
  vec2 gN=(gT.rg*2.-1.)*(gC+gM*.8+gL*.45*(1.-odX.x*.7))*odReady;
  // a two-tone field on a flat face (a rounded rectangle in the piece's own space, a darker break round it) and the piece's marks
  if(odGP0.w>0.){vec3 q=vGP-odGP0.xyz;if(abs(dot(q,odGP1.xyz))<.03){vec3 up=cross(odGP1.xyz,odGR.xyz);float sd=odRR(vec2(dot(q,odGR.xyz),dot(q,up)),vec2(odGP0.w,odGP1.w),.014),aa=fwidth(sd)+1e-5;
   float pf=(1.-smoothstep(-aa,aa,sd))*odReady,br=(1.-smoothstep(.0014-aa,.0014+aa,abs(sd)))*odReady;diffuseColor.rgb*=mix(1.,odGR.w,pf)*(1.-.65*br)*(1.-.25*exp(-abs(sd)/.003)*odReady);}}
  {vec2 dc=odDecal(vGP);dc.x*=odReady;if(dc.x>.01)diffuseColor.rgb=mix(diffuseColor.rgb,odCol[int(dc.y+.5)],dc.x*.92);}`)
  .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n  roughnessFactor=clamp(roughnessFactor+(gT.a-.5)*(gC*.5+gM*.6+gL*.3*(1.-odX.x*.7))*odReady-gEdge*.15*gM-.2*gCh,.05,1.);')
  .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n  metalnessFactor=mix(metalnessFactor,1.,gCh);')
  .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n  {vec3 gO=(vGX*(gW.y*gN.x+gW.z*gN.x)+vGY*(gW.x*gN.y+gW.z*gN.y)+vGZ*(gW.x*gN.x+gW.y*gN.y));normal=normalize(normal+gO*.6);}');};
 const key=m.customProgramCacheKey?.bind(m);m.customProgramCacheKey=()=>'op-gear-v47-detail';m.needsUpdate=true;return m;}
