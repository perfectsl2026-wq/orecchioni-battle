// V43 oR: the classic kits' own clothing. ASSALTO, SFONDAMENTO, TIRATORE and RICOGNIZIONE no longer share the bought-in
// vest, pouches and pads of the soldier: each wears its own cut, built here once per kit from the body itself. Every panel
// follows the suit's surface (a radial map of the suit around the torso, a limb or the head) and every vertex takes the skin
// weights of the suit under it, so the wear bends with the operator as the suit does. One operator's wear is one skinned
// mesh, one draw: a palette index per vertex picks colour, roughness, metalness and weave, and the palette is shared per team
// and accent (one program for every kit). The suit under it keeps its folds and takes the kit's own colour blocking.
// V43 oR rev: the suit is tucked in under the wear (a per-kit weight pushes it 16 mm in along its normal), so its folds never
// poke through a panel or fray a rim; the maps are smoothed as an envelope (never more than 14 mm under the suit), so plates
// are smooth shells, not lumps; cloth takes a woven relief, a mottle, darker seams and top stitching, hard shells worn edges.
// Positions are authored in metres in the soldier's bind space (A pose, +y up, +z the front, +x the left hand).
import * as T from './vendor/three.module.js';
import {mergeGeometries,mergeVertices} from './vendor/addons/utils/BufferGeometryUtils.js';
import {PAINTS} from './weapon-finish.js?v=42.0';
import {signatureOf,TEAM_SIGNAL,PRIME_GLSL,primeUniforms,OB_FORM} from './operator-kits.js?v=42.0';
import {DETAIL,DETAIL_GLSL,detailUniforms} from './operator-detail.js?v=42.0';
export const WEAR_KITS=new Set(['assalto','sfondamento','tiratore','ricognizione','mastino']);
const U=1.1e6,R=Math.PI/180,TUCK=.016,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const boneName=n=>n.replace(/^mixamorig[:_]?/,'').replace(/_\d+$/,'');
// ---- palette: one slot per kind of surface --------------------------------------------------
// M team cloth, D team dark cloth, W charcoal webbing, H hard shell in the team tone, A accent, I team identity (vivid: the
// colour a player reads at range), X metal, B rubber, N neutral field drab, L off-white (stitching, small marks), G lens,
// K night cloth (near black, a hint of the team).
export const PAL={M:0,D:1,W:2,H:3,A:4,I:5,X:6,B:7,N:8,L:9,G:10,K:11};
const TEAM={blue:{M:0x46677f,D:0x2a3b4a,H:0x3b5670,I:0x3f9ad8,K:0x1d2227,N:0x585d4e},orange:{M:0x9c7148,D:0x5a3f2a,H:0x80583a,I:0xe86f22,K:0x29221d,N:0x655f4c}};
// [roughness, metalness, weave]: weave > .3 is cloth (relief, seams, stitching), under it a hard surface (worn edges).
const PBR=[[.93,0,1],[.93,0,1],[.86,0,.8],[.46,.06,.06],[.6,.08,.15],[.9,0,.9],[.36,.82,0],[.8,0,.12],[.95,0,1],[.7,0,.25],[.15,.45,0],[.95,0,1]];
let weave=null;
export function weaveTexture(){if(weave)return weave;const n=64,data=new Uint8Array(n*n*4),g=new Float32Array(8*8),h=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
 for(let i=0;i<64;i++)g[i]=h(i%8,i>>3);const noise=(x,y)=>{const fx=x/8,fy=y/8,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),G=(a,b)=>g[((b&7)<<3)|(a&7)];return (G(ix,iy)*(1-sx)+G(ix+1,iy)*sx)*(1-sy)+(G(ix,iy+1)*(1-sx)+G(ix+1,iy+1)*sx)*sy;};
 // R: ripstop, a fine twill with a heavier thread every 16 texels both ways. G: a soft tileable mottle (wear and fading).
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const tw=((x+y)>>1&1)?.86:1,rip=(x%16===0||y%16===0)?.74:1,k=(y*n+x)*4;data[k]=Math.round(255*tw*rip*(.92+.08*Math.sin(x*.9)*Math.sin(y*1.3)));data[k+1]=Math.round(255*(.62*noise(x,y)+.38*noise(x*2+17,y*2+5)));data[k+2]=0;data[k+3]=255;}
 weave=new T.DataTexture(data,n,n);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.magFilter=T.LinearFilter;weave.minFilter=T.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.anisotropy=8;weave.needsUpdate=true;return weave;}
const looks=new Map();
// V46 proposal (?oppal=1): the kit's signature palette (operator-kits.js SIGNATURE) fills the cloth, shell, dark and accent slots, the
// team identity slot I keeps the team's signal colour and glows faintly: the team's band and marks.
function paletteSlots(sig,team,kit){const c=v=>new T.Color(v),role={main:c(sig.main),dark:c(sig.dark),accent:c(sig.accent)},w={M:'main',D:'dark',H:'main',A:'accent',K:'dark',...sig.wear},rc=k=>role[k]||c(k),rp=k=>sig.pbr[k]||sig.pbr.main;
 const cols=[rc(w.M),rc(w.D),c(0x2a2d2e),rc(w.H),rc(w.A),c(TEAM_SIGNAL[team==='blue'?'blue':'orange']),c(0x6c7578),c(0x1b1f21),w.N?rc(w.N):role.main.clone().lerp(role.dark,.5),c(0xcfc8b6),c(sig.visor||0x0f1418),rc(w.K).clone().multiplyScalar(.6)];
 const pbr=PBR.map(p=>[...p]);for(const [k,i] of Object.entries({M:0,D:1,H:3,A:4,K:11,N:8}))if(w[k]){pbr[i][0]=rp(w[k])[0];pbr[i][1]=rp(w[k])[1];}
 // V47: slots a kit wears as painted hard shells instead of cloth (MASTINO's lime bands: lacquer that chips to steel).
 for(const k of DETAIL[kit]?.hard||[])pbr[PAL[k]][2]=.06;return {cols,pbr};}
export function wearLook(team,accent,kit,tw=''){
 const sig=signatureOf(kit,tw),key=team+':'+accent+(sig?':'+kit+':'+tw:'');if(looks.has(key))return looks.get(key);const t=TEAM[team==='blue'?'blue':'orange'],c=v=>new T.Color(v);
 const P=sig?paletteSlots(sig,team,kit):null,cols=P?P.cols:[c(t.M),c(t.D),c(0x2a2d2e),c(t.H),c(PAINTS[accent]?.hex||'#45535d'),c(t.I),c(0x6c7578),c(0x1b1f21),c(t.N),c(0xcfc8b6),c(0x0f1418),c(t.K)];
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:0,envMapIntensity:.45});m.name='op-wear';m.userData.teamLook=true;m.userData.wear=true;
 const uniforms={wearCol:{value:cols},wearPbr:{value:(P?P.pbr:PBR).map(p=>new T.Vector3(...p))},wearWeave:{value:weaveTexture()},...primeUniforms(sig,team,sig?1:0),...detailUniforms(sig?kit:'',team)};
 if(sig)m.defines={WEAR_GLOW:''};
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);
  s.vertexShader='attribute float wearPal;attribute vec2 wearUv;attribute float wearEdge;attribute vec4 wearRim;varying float vWearPal;varying vec2 vWearUv;varying float vWearEdge;varying float vWearY;varying vec3 vPrimeP;varying vec4 vWearRim;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWearPal=wearPal;vWearUv=wearUv;vWearEdge=wearEdge;vWearY=position.y/1.1e6;vPrimeP=position/1.1e6;vWearRim=wearRim;');
  s.fragmentShader=`uniform vec3 wearCol[12];uniform vec3 wearPbr[12];uniform sampler2D wearWeave;varying float vWearY;varying float vWearPal;varying vec2 vWearUv;varying float vWearEdge;varying vec3 vPrimeP;varying vec4 vWearRim;
`+PRIME_GLSL+DETAIL_GLSL+`vec3 wearBump(vec3 p,vec3 n,vec2 dH,float fd){vec3 sx=normalize(dFdx(p)),sy=normalize(dFdy(p)),r1=cross(sy,n),r2=cross(n,sx);float det=dot(sx,r1)*fd;return normalize(abs(det)*n-sign(det)*(dH.x*r1+dH.y*r2));}
`+s.fragmentShader
   .replace('#include <color_fragment>',`#include <color_fragment>
int wearI=int(vWearPal+.5);vec3 wearP=wearPbr[wearI];vec4 wearS=texture2D(wearWeave,vWearUv);float wearT=wearS.r,wearM=texture2D(wearWeave,vWearUv*.047+.31).g,wearCloth=step(.3,wearP.z),wearE=clamp(vWearEdge/.016,0.,1.);
vec3 wearC=wearCol[wearI]*mix(1.,.6+.46*wearT,wearP.z)*(.9+.2*wearM);
wearC*=mix(1.,.66+.34*smoothstep(0.,1.,wearE),wearCloth);
wearC=mix(wearC,min(wearC*1.5+.035,vec3(1.)),(1.-wearCloth)*(1.-smoothstep(0.,.4,wearE))*.55);
float wearSt=wearCloth*(1.-smoothstep(.0005,.0011,abs(vWearEdge-.0058)))*step(.42,fract((vWearUv.x+vWearUv.y)*1.15));
diffuseColor.rgb=mix(wearC,wearC*1.38+.03,wearSt*.85);
#ifdef WEAR_GLOW
diffuseColor.rgb*=mix(.76,1.1,smoothstep(.1,1.75,vWearY));diffuseColor.rgb+=(1.-wearCloth)*(1.-smoothstep(0.,.25,wearE))*.06;
#endif
vec2 odN=vec2(0.);float odRo=0.,odMe=-1.,odRf=-1.;
#ifdef WEAR_GLOW
// V47 detail (operator-detail.js): micro surface from the shared tiles, then the panel's construction from its exact rims.
if(odK.x>.5&&wearI!=5&&wearI!=10){vec2 odU=vWearUv/55.;
 if(wearCloth>.5){vec4 c=texture2D(odCloth,odU/odSize.x);odN=(c.rg*2.-1.)*odReady;odRo=(c.a-.5)*.5*odReady;diffuseColor.rgb*=mix(1.,.84+.32*c.b,odReady);
  if(wearI==2){float rb=sin(odU.y/.0024*6.2832)*(1.-smoothstep(.0008,.0024,fwidth(odU.y)));odN.y+=.45*rb;diffuseColor.rgb*=1.+.07*rb;}}
 else{bool odMt=wearP.y>.5;vec4 mt=texture2D(odMetal,odU/odSize.y),pt=texture2D(odPaint,odU/odSize.z);vec4 R=vWearRim;float e=min(R.x,R.y),big=step(.06,min(R.z,R.w));
  vec2 gx=odGrad(R.x,odU),gy=odGrad(R.y,odU),ge=odGrad(e,odU);gx/=max(length(gx),1e-6);gy/=max(length(gy),1e-6);ge/=max(length(ge),1e-6);
  // chips only on a panel's face near its rims (a wall or a thin strip is all rim: it gets a plain worn sheen instead)
  float wall=step(R.z+R.w,.0001)*step(.5,R.y),face=step(.03,min(R.z,R.w)),cut=mix(.56,0.,smoothstep(0.,odK.y,e))*face,ch=cut>0.?(1.-smoothstep(cut-.02,cut+.02,pt.b))*odReady:0.,lip=cut>0.?(smoothstep(cut-.06,cut-.02,pt.b)-smoothstep(cut,cut+.04,pt.b))*odReady:0.;
  diffuseColor.rgb*=1.+.18*wall*odReady;
  if(odMt){odN=(mt.rg*2.-1.)*.8*odReady;float tone=texture2D(odPaint,odU/.45).b;diffuseColor.rgb*=mix(1.,(.88+.24*tone)*(.9+.2*mt.a)*(1.+.3*mt.b),odReady);odRf=clamp(wearP.x+(mt.a-.5)*.6*odReady-.15*mt.b,.1,1.);
   diffuseColor.rgb*=1.-.45*max(lip,0.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.79,.8)*(.85+.3*mt.r),ch);if(ch>.5){odMe=1.;odRf=.18;}}
  else{odN=(pt.rg*2.-1.)*.55*odReady;odRo=(pt.a-.5)*.35*odReady;
   diffuseColor.rgb*=1.-.55*max(lip,0.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.67,.69)*(.8+.35*mt.r),ch);odN=mix(odN,(mt.rg*2.-1.)*.8,ch);if(ch>.5){odMe=1.;odRf=.26+(mt.a-.5)*.3;}}
  // V47c two-tone plates: a frame in the plate's own colour round a field in the kit's second tone, split by a wide break.
  float tz=odB.w>0.&&(wearI==3||(R.y>.99&&R.z>0.))?1.:0.,ins=tz>.5?odT.x:.008,tk=tz*step(.07,min(R.z,R.w))*smoothstep(ins-.0005,ins+.0005,e)*odReady;
  {float bl=max(dot(wearCol[wearI],vec3(.2126,.7152,.0722)),.002);diffuseColor.rgb=mix(diffuseColor.rgb,odTone.x<0.?diffuseColor.rgb*odTone.y:odTone*dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))/bl,tk*odB.w);}
  float gd=e-ins,gr=odK.w*big*odLine(gd,tz>.5?.0016:.0011)*odReady,hl=odK.w*big*odLine(gd-.0018,.0005)*odReady,gao=odK.w*big*odReady*exp(-abs(gd)/.003);diffuseColor.rgb*=(1.-.8*gr)*(1.-.32*gao)*(1.+.8*hl);odN+=-sign(gd)*ge*(gr*1.2+gao*.25);
  {float bev=(1.-smoothstep(.0,.003,e))*(1.-wall)*odReady;diffuseColor.rgb*=1.+.55*bev;odN+=-ge*bev*.6;}
  if(odK.z>.5&&big>.5){float ri=.012,rr=.0046,sp=.07;vec4 b1=odBolt(vec2(R.x-ri,R.y-ri),rr);vec2 n1=b1.z*gx+b1.w*gy;
   vec4 b2=R.w>.14&&R.y>ri+.02?odBolt(vec2(R.x-ri,(fract(odU.y/sp)-.5)*sp),rr):vec4(0.);vec4 b3=R.z>.14&&R.z<.9&&R.x>ri+.02?odBolt(vec2((fract(odU.x/sp)-.5)*sp,R.y-ri),rr):vec4(0.);
   if(b2.x+b2.y>b1.x+b1.y){b1=b2;n1=b2.z*gx+vec2(0.,b2.w);}if(b3.x+b3.y>b1.x+b1.y){b1=b3;n1=vec2(b3.z,0.)+b3.w*gy;}
   b1*=odReady;float hx=max(abs(b1.z)*.866+abs(b1.w)*.5,abs(b1.w));float sock=(1.-smoothstep(.36,.42,hx))*b1.x;
   diffuseColor.rgb=mix(diffuseColor.rgb*(1.-.55*b1.y),vec3(.3,.31,.33)*(1.-.75*sock),b1.x);odN=mix(odN,n1*(1.-sock),b1.x);if(b1.x>.5){odMe=1.;odRf=.36;}}}
 vec2 dc=odDecal(vPrimeP);dc.x*=odReady*(1.-.6*smoothstep(.55,.85,texture2D(odPaint,vWearUv/55./odSize.z*1.7).b));if(dc.x>.01){diffuseColor.rgb=mix(diffuseColor.rgb,odCol[int(dc.y+.5)],dc.x*.92);if(dc.x>.5){odMe=odMe>0.?odMe:0.;odRf=.42;}}}
#endif
vec3 primeV=vec3(0.);
#ifdef WEAR_GLOW
if(primeW.w>0.&&wearI!=5)primeV=primeLines(vPrimeP);diffuseColor.rgb*=(1.-.55*primeV.z)*(1.-.95*min(1.,primeV.x*1.6));diffuseColor.rgb=mix(diffuseColor.rgb,primeInlay,primeV.y);
#endif`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(wearP.x+(.5-wearT)*.12*wearP.z+(wearM-.5)*.1,0.,1.);\n#ifdef WEAR_GLOW\nroughnessFactor=mix(max(roughnessFactor*.65,.2),roughnessFactor,wearCloth);roughnessFactor=mix(roughnessFactor,.2,primeV.y);if(wearP.y>.5)roughnessFactor=clamp(roughnessFactor+(texture2D(wearWeave,vWearUv*vec2(.15,4.)).r-.5)*.3,.05,1.);\nif(odRf>=0.)roughnessFactor=mix(odRf,.2,primeV.y);roughnessFactor=clamp(roughnessFactor+odRo,.05,1.);\n#endif')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(odMe>=0.?odMe:wearP.y,.3,primeV.y);')
   .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n{vec2 wearDH=vec2(dFdx(wearT),dFdy(wearT))*wearP.z*1.2*(1.-smoothstep(2.5,8.,length(vViewPosition)));normal=wearBump(-vViewPosition,normal,wearDH,faceDirection);}\nnormal=odPerturb(normal,-vViewPosition,vWearUv/55.,odN);')
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef WEAR_GLOW\ndiffuseColor.rgb*=primeAO(vPrimeP);\n#endif\n'+OB_FORM+'#ifdef WEAR_GLOW\nif(wearI==5)totalEmissiveRadiance+=wearCol[5]*.6;totalEmissiveRadiance+=primeGlow(vPrimeP,primeV,pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.));\n{float wF=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);totalEmissiveRadiance+=wF*.1*mix(vec3(.8,.86,1.),diffuseColor.rgb*2.+.05,.5)*(1.3-.7*wearCloth);}\n#endif');};
 m.customProgramCacheKey=()=>sig?'operator-wear-v52-prime':'operator-wear-v43r';looks.set(key,m);return m;}
// ---- the suit under the wear: each kit's colour blocking ----------------------------------------
// Zones in bind space: sleeves (out of the torso's width), legs (below the crotch), torso; the boots stay dark leather.
// `pat`: 0 plain, 1 fine vertical rib (night cloth), 2 quilted bands (heavy undersuit), 3 ripstop squares (light field cloth).
// The suit is pushed in under the wear by its `suitTuck` weight (wearSuitGeometry).
const SUIT={
 assalto:{torso:'M',sleeve:'M',legs:'D',pat:0},
 sfondamento:{torso:'D',sleeve:'D',legs:'D',pat:2},
 tiratore:{torso:'D',sleeve:'K',legs:'K',pat:1},
 ricognizione:{torso:'M',sleeve:'M',legs:'N',pat:3},
 mastino:{torso:'K',sleeve:'K',legs:'K',pat:2}
};
const suitLooks=new Map();
export function wearSuitLook(base,team,kit,tw=''){
 const key=base.uuid+':'+team+':'+kit+(tw?':'+tw:'');if(suitLooks.has(key))return suitLooks.get(key);const S=SUIT[kit];if(!S){suitLooks.set(key,base);return base;}
 const t=TEAM[team==='blue'?'blue':'orange'],sig=signatureOf(kit,tw),col=k=>sig?new T.Color(k==='M'?sig.main:sig.dark).multiplyScalar(k==='K'?(DETAIL[kit]?1.9:.6):1):new T.Color(t[k]);
 // V46d: a kit can name the suit's role per zone (sig.suit): SFONDAMENTO's torso takes the vest's olive, so a fold that shows between panels does not read as a black blotch.
 const zone=z=>sig?.suit?.[z]?new T.Color(sig.suit[z][0]==='#'?sig.suit[z]:sig[sig.suit[z]]):col(S[z]);
 const m=base.clone();m.name=base.name+' '+kit;m.userData.teamLook=true;m.color.set(0xffffff);m.onBeforeCompile=null;
 const uniforms={suitTorso:{value:zone('torso')},suitSleeve:{value:zone('sleeve')},suitLegs:{value:zone('legs')},suitGlove:{value:sig?new T.Color(sig.glove||sig.dark).multiplyScalar(sig.glove?1:.85):new T.Color(0x24262a)},suitPat:{value:S.pat},...primeUniforms(sig,team,sig?1:0),...detailUniforms(sig?kit:'',team),odUvm:{value:2.1}};
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);
  s.vertexShader='attribute float suitTuck;varying vec3 vSuitP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSuitP=position;transformed-=normalize(objectNormal)*suitTuck*SUIT_TUCK;');
  s.fragmentShader='uniform vec3 suitTorso;uniform vec3 suitSleeve;uniform vec3 suitLegs;uniform vec3 suitGlove;uniform float suitPat;uniform float odUvm;varying vec3 vSuitP;\n'+PRIME_GLSL+DETAIL_GLSL+s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {float v=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),0.,1.),ax=abs(vSuitP.x),y=vSuitP.y;
  float sl=mix(smoothstep(290000.,320000.,ax),smoothstep(163000.,186000.,ax),smoothstep(1330000.,1390000.,y));
  float lg=(1.-smoothstep(985000.,1030000.,y))*(1.-smoothstep(330000.,360000.,ax));
  vec3 c=mix(mix(suitTorso,suitSleeve,sl),suitLegs,lg);
  // V53: the hands are gloves of their own leather (they took the sleeve's colour and read as bare mitts).
  c=mix(c,suitGlove,smoothstep(-12000.,5000.,dot(vec3(ax,y,vSuitP.z)-vec3(506000.,1160500.,77000.),vec3(.52,-.746,.414))));
  #ifdef USE_MAP
  if(suitPat>.5&&suitPat<1.5)c*=.9+.1*step(.5,fract(vMapUv.x*260.));
  else if(suitPat>1.5&&suitPat<2.5)c*=.88+.12*smoothstep(.0,.25,abs(fract(y/42000.)-.5));
  else if(suitPat>2.5){vec2 g=fract(vMapUv*140.);c*=.93+.07*step(.08,min(g.x,g.y));}
  #endif
  vec3 dyed=c*(.5+.85*sqrt(v));diffuseColor.rgb=mix(vec3(.07,.066,.06)*(.6+1.1*v),dyed,smoothstep(BOOT_TOP-BOOT_FADE,BOOT_TOP+BOOT_FADE,y));}
  // V46g PRIME: the kit's light strips and inlays run on across the suit where the wear leaves it bare (arms, legs).
  vec3 primeV=vec3(0.);if(primeW.w>0.)primeV=primeLines(vSuitP/1.1e6)*smoothstep(BOOT_TOP,BOOT_TOP+3.*BOOT_FADE,vSuitP.y);
  diffuseColor.rgb*=(1.-.55*primeV.z)*(1.-.95*min(1.,primeV.x*1.6));diffuseColor.rgb=mix(diffuseColor.rgb,primeInlay,primeV.y);
  // V47 detail: the shared ripstop at its physical size (the soldier's uv is ~2.1 m a unit) over the suit's own folds.
  vec2 odN=vec2(0.);float odRo=0.;
  #ifdef USE_MAP
  if(odK.x>.5){vec4 oc=texture2D(odCloth,vMapUv*odUvm/odSize.x);odN=(oc.rg*2.-1.)*odReady;odRo=(oc.a-.5)*.5*odReady;diffuseColor.rgb*=mix(1.,.84+.32*oc.b,odReady);
   vec2 dc=odDecal(vSuitP/1.1e6);dc.x*=odReady;if(dc.x>.01)diffuseColor.rgb=mix(diffuseColor.rgb,odCol[int(dc.y+.5)],dc.x*.9);}
  #endif`)
  .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n  roughnessFactor=clamp(mix(roughnessFactor,.22,primeV.y)+odRo,.05,1.);')
  .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n  #ifdef USE_MAP\n  normal=odPerturb(normal,-vViewPosition,vMapUv*odUvm,odN);\n  #endif')
  .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n  if(primeW.w>0.)diffuseColor.rgb*=primeAO(vSuitP/1.1e6);\n'+OB_FORM+'  totalEmissiveRadiance+=primeGlow(vSuitP/1.1e6,primeV,pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.));\n  if(odK.x>.5){float sF=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);totalEmissiveRadiance+=sF*.14*(diffuseColor.rgb*2.2+.025);}');};
 m.defines={...base.defines,BOOT_TOP:'250000.0',BOOT_FADE:'15000.0',SUIT_TUCK:(TUCK*U).toFixed(1)};m.customProgramCacheKey=()=>'operator-wearsuit-v53';m.needsUpdate=true;
 // V49: the suit's own hands take the finger tones too (attribute from ensureFingerTone).
 {const inner=m.onBeforeCompile;m.onBeforeCompile=(s,r)=>{inner(s,r);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float partTone;varying float vPartTone;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPartTone=partTone;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vPartTone;').replace('#include <roughnessmap_fragment>','{float ft=vPartTone-1.;diffuseColor.rgb=max(vec3(0.),diffuseColor.rgb*(1.+ft*2.2)+vec3(.05,.052,.058)*ft*3.5);}\n#include <roughnessmap_fragment>');};}
 suitLooks.set(key,m);return m;}
export function ensureFingerTone(skin,g){if(!g||g.attributes.partTone)return;g.setAttribute('partTone',fingerTone(skin.skeleton.bones.map(b=>boneName(b.name)),g.attributes.skinIndex,g.attributes.skinWeight,g.attributes.position.count));}
// RICOGNIZIONE: the soldier head mesh is its olive neck gaiter, worn up to the nose on every kit (the eyes are another mesh);
// here it takes the scarf's team colour, its folds kept, so it reads as the scarf pulled up over the face.
const headLooks=new Map();
export function wearHeadLook(base,team,kit){
 if(kit!=='ricognizione')return base;const key=base.uuid+':'+team;if(headLooks.has(key))return headLooks.get(key);const t=TEAM[team==='blue'?'blue':'orange'];
 const m=base.clone();m.name=base.name+' scarf';m.userData.teamLook=true;const uniforms={headScarf:{value:new T.Color(t.I).lerp(new T.Color(t.D),.62)}};
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.fragmentShader='uniform vec3 headScarf;\n'+s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {float l=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=headScarf*(.35+1.5*l);}`);};
 m.customProgramCacheKey=()=>'operator-wearhead-v43r';m.needsUpdate=true;headLooks.set(key,m);return m;}
// The suit's geometry for one wear: the suit's own attributes (shared, not copied) and the wear's tuck weights.
const tucked=new WeakMap();
export function wearSuitGeometry(wear,suitGeo){
 if(!wear?.userData.tuck)return suitGeo;let g=tucked.get(wear);if(g)return g;g=new T.BufferGeometry();for(const [n,a] of Object.entries(suitGeo.attributes))g.setAttribute(n,a);g.setIndex(suitGeo.index);for(const gr of suitGeo.groups)g.addGroup(gr.start,gr.count,gr.materialIndex);
 g.setAttribute('suitTuck',new T.BufferAttribute(wear.userData.tuck,1));g.boundingBox=suitGeo.boundingBox;g.boundingSphere=suitGeo.boundingSphere;g.name=(suitGeo.name||'suit')+' tucked';tucked.set(wear,g);return g;}
const FINGER={Thumb:1.06,Index:1.14,Middle:.9,Ring:1.12,Pinky:.9},SEG=[1,.9,1.2];
function fingerTone(names,I,W,count){const tone=new Float32Array(count),tones=names.map(n=>{const f=/Hand(Thumb|Index|Middle|Ring|Pinky)(\d)/.exec(n||'');return f?FINGER[f[1]]*SEG[Math.min(3,+f[2])-1]:1;});
 for(let i=0;i<count;i++){if(i>=W.count){tone[i]=1;continue;}let t=0,sw=0;for(let c=0;c<4;c++){const w=W.getComponent(i,c);t+=w*tones[I.getComponent(i,c)];sw+=w;}tone[i]=sw>0?t/sw:1;}return new T.BufferAttribute(tone,1);}
// The glove look's finger tones on any material (the soldier's own gloves keep theirs): a clone that reads `partTone`.
const toneLooks=new WeakMap();
export function fingerToneLook(base){let m=toneLooks.get(base);if(m)return m;m=base.clone();m.name=(base.name||'gloves')+' toned';const prior=base.onBeforeCompile;
 m.onBeforeCompile=(s,r)=>{prior?.call(m,s,r);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float partTone;varying float vPartTone;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPartTone=partTone;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vPartTone;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb*=1.+(vPartTone-1.)*2.2;');};
 m.customProgramCacheKey=()=>(base.customProgramCacheKey?.()||'')+'finger-tone-v49';toneLooks.set(base,m);return m;}
// The soldier's pads skin keeps only its gloves under the new wear (its knee and elbow pads belong to the old kit).
const gloveGeos=new WeakMap();
export function glovesOnly(skin){
 const g=skin.userData.baseGeometry||skin.geometry;if(gloveGeos.has(g))return gloveGeos.get(g);const names=skin.skeleton.bones.map(b=>boneName(b.name)),I=g.attributes.skinIndex,W=g.attributes.skinWeight,dom=i=>{let b=0,bw=-1;for(let c=0;c<4;c++){const w=W.getComponent(i,c);if(w>bw){bw=w;b=I.getComponent(i,c);}}return names[b];};
 const hand=new Uint8Array(g.attributes.position.count);for(let i=0;i<hand.length;i++)hand[i]=/Hand/.test(dom(i))?1:0;
 const src=g.index.array,keep=[];for(let k=0;k<src.length;k+=3)if(hand[src[k]]&&hand[src[k+1]]&&hand[src[k+2]])keep.push(src[k],src[k+1],src[k+2]);
 const out=new T.BufferGeometry();for(const [n,a] of Object.entries(g.attributes))out.setAttribute(n,a);out.setIndex(keep);out.boundingBox=g.boundingBox;out.boundingSphere=g.boundingSphere;out.setAttribute('partTone',fingerTone(names,I,W,g.attributes.position.count));
 gloveGeos.set(g,out);return out;}
// V44 op2: a part of a skin's geometry (its attributes shared): the triangles whose three vertices pass test(dominant bone, y).
// The whole bodies built without real hands or with heeled feet wear the soldier's own gloves and boots cut out of his suit.
const partGeos=new WeakMap();
export function skinPart(skin,g,key,test){let m=partGeos.get(g);if(!m)partGeos.set(g,m=new Map());if(m.has(key))return m.get(key);
 const names=skin.skeleton.bones.map(b=>boneName(b.name)),I=g.attributes.skinIndex,W=g.attributes.skinWeight,P=g.attributes.position,ok=new Uint8Array(P.count);
 for(let i=0;i<ok.length;i++){let b=0,bw=-1;for(let c=0;c<4;c++){const w=W.getComponent(i,c);if(w>bw){bw=w;b=I.getComponent(i,c);}}ok[i]=test(names[b],P.getY(i)/U)?1:0;}
 const src=g.index.array,keep=[];for(let k=0;k<src.length;k+=3)if(ok[src[k]]&&ok[src[k+1]]&&ok[src[k+2]])keep.push(src[k],src[k+1],src[k+2]);
 // V53: the whole bodies' gloves are worked too: the same plate, knuckle bar, cuff and trim as the wear kits (gauntlets below), added
 // to the cut as its own vertices in four leather tones (the glove look is one charcoal dye: lighter plate, darker bar and cuff, a pale trim).
 let extra=null;if(key.includes('g'))try{extra=gloveExtra(skin,g);}catch(e){console.error('Guanti non rifiniti',e);}
 if(extra){const out=new T.BufferGeometry(),n0=P.count,n1=extra.attributes.position.count,EP=extra.attributes.position,EN=extra.attributes.normal,EI=extra.attributes.skinIndex,EW=extra.attributes.skinWeight,pal=extra.attributes.wearPal,TONE=[1.3,.78,.86,1.62];
  // one leather texel for every added vertex: the suit's own hand vertex nearest the middle of the left hand's back
  let ref=0,best=1e9;for(let i=0;i<n0;i++){if(names[I.getComponent(i,0)]!=='LeftHand')continue;const d=Math.hypot(P.getX(i)/U-.49,P.getY(i)/U-1.02,P.getZ(i)/U-.09);if(d<best){best=d;ref=i;}}
  for(const [n,a] of Object.entries(g.attributes)){if(n==='partTone')continue;const size=a.itemSize,arr=new a.array.constructor((n0+n1)*size);for(let i=0;i<n0*size;i++)arr[i]=a.array[i];
   for(let i=0;i<n1;i++){const o=(n0+i)*size;
    if(n==='position'){arr[o]=EP.getX(i);arr[o+1]=EP.getY(i);arr[o+2]=EP.getZ(i);}else if(n==='normal'){arr[o]=EN.getX(i);arr[o+1]=EN.getY(i);arr[o+2]=EN.getZ(i);}
    else if(n==='skinIndex')for(let c=0;c<4;c++)arr[o+c]=EI.getComponent(i,c);else if(n==='skinWeight')for(let c=0;c<4;c++)arr[o+c]=EW.getComponent(i,c);
    else if(n==='tangent'){const nx=EN.getX(i),nz=EN.getZ(i);let tx=-nz,tz=nx;const l=Math.hypot(tx,tz);if(l<1e-4){tx=1;tz=0;}else{tx/=l;tz/=l;}arr[o]=tx;arr[o+1]=0;arr[o+2]=tz;arr[o+3]=1;}
    else for(let c=0;c<size;c++)arr[o+c]=a.array[ref*size+c];}
   out.setAttribute(n,new T.BufferAttribute(arr,size,a.normalized));}
  const idx=keep.slice(),EX=extra.index.array;for(let i=0;i<EX.length;i++)idx.push(EX[i]+n0);out.setIndex(idx);out.boundingBox=g.boundingBox;out.boundingSphere=g.boundingSphere;
  const tone=fingerTone(names,I,W,n0+n1).array;for(let i=0;i<n1;i++)tone[n0+i]=TONE[Math.round(pal.getX(i))]??1;out.setAttribute('partTone',new T.BufferAttribute(tone,1));extra.dispose();m.set(key,out);return out;}
 const out=new T.BufferGeometry();for(const [n,a] of Object.entries(g.attributes))out.setAttribute(n,a);out.setIndex(keep);out.boundingBox=g.boundingBox;out.boundingSphere=g.boundingSphere;
 // V49: a tone per vertex for the glove look, so the fingers read apart at a distance: neighbouring fingers a shade
 // lighter and darker, the middle joint darker (the crease), the fingertip lighter. Blended by skin weight; 1 elsewhere.
 out.setAttribute('partTone',fingerTone(names,I,W,P.count));m.set(key,out);return out;}
// ---- the body: suit and head vertices, their weights, radial maps ----------------------------------
class Body{
 constructor(suit,suitGeo,head){
  this.names=suit.skeleton.bones.map(b=>boneName(b.name));this.at={};const bindInv=suit.bindMatrix.clone().invert();
  suit.skeleton.boneInverses.forEach((m,i)=>{this.at[this.names[i]]=new T.Vector3().setFromMatrixPosition(m.clone().invert()).applyMatrix4(bindInv).divideScalar(U);});
  const pos=[],si=[],sw=[],dom=[];this.suitCount=suitGeo.attributes.position.count;
  for(const g of [suitGeo,...(Array.isArray(head)?head:[head?.geometry])]){if(!g)continue;const P=g.attributes.position,I=g.attributes.skinIndex,W=g.attributes.skinWeight;
   for(let i=0;i<P.count;i++){pos.push(P.getX(i)/U,P.getY(i)/U,P.getZ(i)/U);let b=0,bw=-1;for(let c=0;c<4;c++){const w=W.getComponent(i,c),k=I.getComponent(i,c);si.push(k);sw.push(w);if(w>bw){bw=w;b=k;}}dom.push(this.names[b]);}}
  this.pos=pos;this.si=si;this.sw=sw;this.dom=dom;this.grid=new Map();
  for(let i=0;i<dom.length;i++){const k=this.cell(pos[i*3],pos[i*3+1],pos[i*3+2]);let l=this.grid.get(k);if(!l)this.grid.set(k,l=[]);l.push(i);}
 }
 cell(x,y,z){return ((Math.floor(x/.04)+500)*1000+(Math.floor(y/.04)+500))*1000+Math.floor(z/.04)+500;}
 // Skin weights at a point: the nearest suit vertices of the allowed bones, blended by distance (four strongest bones kept).
 weights(x,y,z,allow,outI,outW){
  const cx=Math.floor(x/.04),cy=Math.floor(y/.04),cz=Math.floor(z/.04),found=[];
  for(let r=0;r<12&&(found.length<4||r<2);r++)for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)for(let k=-r;k<=r;k++){if(Math.max(Math.abs(i),Math.abs(j),Math.abs(k))!==r)continue;
   const l=this.grid.get(((cx+i+500)*1000+(cy+j+500))*1000+cz+k+500);if(!l)continue;for(const v of l){if(!allow.test(this.dom[v]))continue;const d=Math.hypot(this.pos[v*3]-x,this.pos[v*3+1]-y,this.pos[v*3+2]-z);found.push([d,v]);}}
  found.sort((a,b)=>a[0]-b[0]);const acc=new Map();for(const [d,v] of found.slice(0,4)){const f=1/(d+.004);for(let c=0;c<4;c++){const w=this.sw[v*4+c];if(w>0)acc.set(this.si[v*4+c],(acc.get(this.si[v*4+c])||0)+w*f);}}
  const top=[...acc].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,e)=>s+e[1],0)||1;for(let c=0;c<4;c++){outI[c]=top[c]?.[0]??0;outW[c]=top[c]?top[c][1]/sum:0;}
 }
 // A radial map of the suit around the segment a→b: the outermost suit radius per angle (0: the front, +90°: towards +x)
 // and per position s (0 at a, 1 at b), filled and smoothed. point(ang,s,off) lies `off` metres out of the suit.
 cyl(a,b,allow,{na=64,ns=40,s0=-.1,s1=1.1,passes=10,tol=.013,front=null}={}){
  const u=b.clone().sub(a),L=u.length();u.normalize();const f0=front||new T.Vector3(0,0,1),f=f0.clone().addScaledVector(u,-f0.dot(u)).normalize(),sd=new T.Vector3(1,0,0).addScaledVector(u,-u.x).addScaledVector(f,-f.x).normalize();
  const bins=new Float32Array(na*ns).fill(-1),d=new T.Vector3();
  for(let i=0;i<this.dom.length;i++){if(!allow.test(this.dom[i]))continue;d.set(this.pos[i*3]-a.x,this.pos[i*3+1]-a.y,this.pos[i*3+2]-a.z);const t=d.dot(u)/L;if(t<s0||t>s1)continue;d.addScaledVector(u,-t*L);
   const r=d.length(),ang=Math.atan2(d.dot(sd),d.dot(f)),ka=((Math.floor((ang+Math.PI)/(2*Math.PI)*na)%na)+na)%na,ks=Math.min(ns-1,Math.floor((t-s0)/(s1-s0)*ns));bins[ks*na+ka]=Math.max(bins[ks*na+ka],r);}
  fill(bins,na,ns,passes,tol);const map={a,u,L,f,sd,na,ns,s0,s1,bins,body:this};map.r=(ang,s)=>{const fa=((ang+Math.PI)/(2*Math.PI)*na-.5+na*4)%na,fs=clamp((s-s0)/(s1-s0)*ns-.5,0,ns-1),ia=Math.floor(fa),is=Math.min(ns-2,Math.floor(fs)),ta=fa-ia,ts=fs-is,B=(j,k)=>bins[j*na+(k%na)];
   return (B(is,ia)*(1-ta)+B(is,ia+1)*ta)*(1-ts)+(B(is+1,ia)*(1-ta)+B(is+1,ia+1)*ta)*ts;};
  map.dir=(ang,out=new T.Vector3())=>out.copy(f).multiplyScalar(Math.cos(ang)).addScaledVector(sd,Math.sin(ang));
  map.point=(ang,s,off=0,out=new T.Vector3())=>{const r=map.r(ang,s)+off;return map.dir(ang,out).multiplyScalar(r).add(a).addScaledVector(u,s*L);};
  return map;}
 // A radial map around a centre, by azimuth (0: the front, +90°: +x) and elevation (-90°..90°): heads and hoods.
 sphere(c,allow,{na=64,ne=40}={}){
  const bins=new Float32Array(na*ne).fill(-1),d=new T.Vector3();
  for(let i=0;i<this.dom.length;i++){if(!allow.test(this.dom[i]))continue;d.set(this.pos[i*3]-c.x,this.pos[i*3+1]-c.y,this.pos[i*3+2]-c.z);const r=d.length(),az=Math.atan2(d.x,d.z),el=Math.asin(clamp(d.y/r,-1,1)),ka=((Math.floor((az+Math.PI)/(2*Math.PI)*na)%na)+na)%na,ke=Math.min(ne-1,Math.floor((el+Math.PI/2)/Math.PI*ne));bins[ke*na+ka]=Math.max(bins[ke*na+ka],r);}
  fill(bins,na,ne,4,.002);const map={c,bins,na,ne,body:this,sphere:true};
  map.r=(az,el)=>{const fa=((az+Math.PI)/(2*Math.PI)*na-.5+na*4)%na,fe=clamp((el+Math.PI/2)/Math.PI*ne-.5,0,ne-1),ia=Math.floor(fa),ie=Math.min(ne-2,Math.floor(fe)),ta=fa-ia,te=fe-ie,B=(j,k)=>bins[j*na+(k%na)];return (B(ie,ia)*(1-ta)+B(ie,ia+1)*ta)*(1-te)+(B(ie+1,ia)*(1-ta)+B(ie+1,ia+1)*ta)*te;};
  map.dir=(az,el,out=new T.Vector3())=>out.set(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
  map.point=(az,el,off=0,out=new T.Vector3())=>map.dir(az,el,out).multiplyScalar(map.r(az,el)+off).add(c);
  return map;}
 // Tuck weights of the suit's vertices: 1 under a wear piece of the vertex's own bones, easing to 0 past its rim (by the
 // piece's `reach`: 45 mm, a collar 80 mm so the jacket's own collar folds in under it).
 tuck(pieces){
  const C=.04,cell=(x,y,z)=>((Math.floor(x/C)+800)*1600+(Math.floor(y/C)+800))*1600+Math.floor(z/C)+800,grid=new Map();
  pieces.forEach(({g},pi)=>{const P=g.attributes.position;for(let i=0;i<P.count;i+=2){const k=cell(P.getX(i),P.getY(i),P.getZ(i));let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(pi,P.getX(i),P.getY(i),P.getZ(i));}});
  const ok=pieces.map(()=>new Map()),out=new Float32Array(this.suitCount);
  for(let v=0;v<this.suitCount;v++){const x=this.pos[v*3],y=this.pos[v*3+1],z=this.pos[v*3+2],cx=Math.floor(x/C),cy=Math.floor(y/C),cz=Math.floor(z/C),bone=this.dom[v];let w=0;
   for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)for(let k=-2;k<=2;k++){const l=grid.get(((cx+i+800)*1600+(cy+j+800))*1600+cz+k+800);if(!l)continue;
    for(let q=0;q<l.length;q+=4){const pc=pieces[l[q]],reach=pc.reach||.045,d=Math.hypot(l[q+1]-x,l[q+2]-y,l[q+3]-z);if(d>=reach)continue;const f=1-sstep(reach*.5,reach,d);if(f<=w)continue;const m=ok[l[q]];let a=m.get(bone);if(a===undefined)m.set(bone,a=pc.allow.test(bone));if(a)w=f;}}
   out[v]=w;}
  return out;}
}
// Empty bins take their row's neighbours (round the angle), empty rows the nearest filled row; then an envelope smoothing:
// each pass blurs, and no bin sinks more than `tol` under the suit it maps (the tuck hides that much).
function fill(b,na,ns,passes=3,tol=.004){
 for(let j=0;j<ns;j++){const row=j*na,has=[];for(let k=0;k<na;k++)if(b[row+k]>=0)has.push(k);if(!has.length)continue;
  for(let k=0;k<na;k++){if(b[row+k]>=0)continue;let lo=null,hi=null;for(let s=1;s<na;s++){if(lo===null&&b[row+(k-s+na)%na]>=0)lo=s;if(hi===null&&b[row+(k+s)%na]>=0)hi=s;if(lo!==null&&hi!==null)break;}b[row+k]=(b[row+(k-lo+na)%na]*hi+b[row+(k+hi)%na]*lo)/(lo+hi);}}
 for(let j=0;j<ns;j++){if(b[j*na]>=0)continue;let n=null;for(let s=1;s<ns&&n===null;s++){if(j-s>=0&&b[(j-s)*na]>=0)n=j-s;else if(j+s<ns&&b[(j+s)*na]>=0)n=j+s;}if(n!==null)for(let k=0;k<na;k++)b[j*na+k]=b[n*na+k];}
 const raw=b.slice(),t=new Float32Array(b.length);for(let p=0;p<passes;p++){for(let j=0;j<ns;j++)for(let k=0;k<na;k++){const at=(jj,kk)=>b[clamp(jj,0,ns-1)*na+((kk+na)%na)];t[j*na+k]=Math.max(raw[j*na+k]-tol,(at(j,k)*4+at(j,k-1)+at(j,k+1)+at(j-1,k)+at(j+1,k))/8);}b.set(t);}
}
// ---- pieces ------------------------------------------------------------------------------------
// A piece is a geometry in metres (position, normal, wearUv, wearEdge: metres to its nearest rim), one palette slot and the
// bones whose suit it takes weights from.
class Wear{
 constructor(body,q=1){this.body=body;this.pieces=[];this.q=q;}
 push(g,pal,allow,reach){if(!g.index)g.setIndex([...Array(g.attributes.position.count).keys()]);if(!g.attributes.normal)g.computeVertexNormals();const P=g.attributes.position;if(!g.attributes.wearUv){const uv=new Float32Array(P.count*2);for(let i=0;i<P.count;i++){uv[i*2]=(P.getX(i)+P.getZ(i))*55;uv[i*2+1]=P.getY(i)*55;}g.setAttribute('wearUv',new T.BufferAttribute(uv,2));}
  if(!g.attributes.wearEdge)g.setAttribute('wearEdge',new T.BufferAttribute(new Float32Array(P.count).fill(.03),1));
  // V47: wearRim (distance to the nearest u rim, to the nearest v rim, panel width, length; metres): a panel's exact rims for the
  // detail layer (operator-detail.js); any other piece knows only its edge distance and no size.
  if(!g.attributes.wearRim){const E=g.attributes.wearEdge,r=new Float32Array(P.count*4);for(let i=0;i<P.count;i++){r[i*4]=E.getX(i);r[i*4+1]=1;}g.setAttribute('wearRim',new T.BufferAttribute(r,4));}
  for(const k of Object.keys(g.attributes))if(!['position','normal','wearUv','wearEdge','wearRim'].includes(k))g.deleteAttribute(k);this.pieces.push({g,pal,allow,reach});return g;}
 // A padded panel on a map: rows from s0 to s1, each spanning the angles aL(s)..aR(s) (degrees, or functions of s), `th`
 // thick with its edges eased down to `edge` over `bevel` metres; `bulge` pillows the middle; closed: a ring with no ends.
 panel(map,o,pal,allow){
  const {s0,s1,off=.004,th=.012,bevel=.01,bulge=0,closed=false}=o,ns=Math.max((o.ns??10)>1?2:1,Math.round((o.ns??10)*1.15*this.q)),na=Math.max(2,Math.round((o.na??16)*1.15*this.q)),   // (a lighter mesh keeps a row inside a panel: its rim distance, hence its wear, needs one)
 edge=o.edge??th*.4,aL=typeof o.aL==='function'?o.aL:()=>o.aL,aR=typeof o.aR==='function'?o.aR:()=>o.aR,sag=o.sag||(()=>0);
  const pos=[],uv=[],ed=[],rim=[],idx=[],out=new T.Vector3(),inn=new T.Vector3(),SR=s=>map.sphere?s*R:s,len=map.sphere?Math.abs(s1-s0)*R*.1:Math.abs(s1-s0)*map.L;
  const at=(j,k,top)=>{const v=j/ns,u=k/na,s=s0+(s1-s0)*v,a0=aL(s)*R,a1=aR(s)*R,ang=a0+(a1-a0)*u,r=map.r(ang,SR(s)),w=Math.abs(a1-a0)*r,e=Math.min(closed?1e9:Math.min(u,1-u)*w,Math.min(v,1-v)*len),h=edge+(th-edge)*Math.sqrt(sstep(0,bevel,e))+bulge*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),dz=sag(u,v);
   map.point(ang,SR(s),off+dz+(top?h:0),top?out:inn);return [top?out:inn,ang*r,map.sphere?SR(s)*.1:s*map.L,top?e:0,top?[closed?1:Math.min(u,1-u)*w,Math.min(v,1-v)*len,closed?1:w,len]:[0,1,0,0]];};
  const add=(p,a,b,e,q)=>{pos.push(p.x,p.y,p.z);uv.push(a*55,b*55);ed.push(e);rim.push(...q);return pos.length/3-1;};
  const grid=top=>{const ids=[];for(let j=0;j<=ns;j++)for(let k=0;k<=na;k++){const [p,a,b,e,q]=at(j,k,top);ids.push(add(p,a,b,e,q));}return ids;};
  const O=grid(true),I=grid(false),W=na+1,radial=new T.Vector3(),mid=(j,k,ids)=>new T.Vector3(pos[ids[j*W+k]*3],pos[ids[j*W+k]*3+1],pos[ids[j*W+k]*3+2]);
  const centre=new T.Vector3();for(const i of O)centre.add(new T.Vector3(pos[i*3],pos[i*3+1],pos[i*3+2]));centre.divideScalar(O.length);
  const tri=(a,b,c,want)=>{const A=new T.Vector3(pos[a*3],pos[a*3+1],pos[a*3+2]),B=new T.Vector3(pos[b*3],pos[b*3+1],pos[b*3+2]),C=new T.Vector3(pos[c*3],pos[c*3+1],pos[c*3+2]),n=B.clone().sub(A).cross(C.clone().sub(A));if(n.dot(want)<0)idx.push(a,c,b);else idx.push(a,b,c);};
  for(let j=0;j<ns;j++)for(let k=0;k<na;k++){const v=(j+.5)/ns,u=(k+.5)/na,s=s0+(s1-s0)*v,ang=(aL(s)+(aR(s)-aL(s))*u)*R;
   if(map.sphere)map.dir(ang,SR(s),radial);else map.dir(ang,radial);
   const q=[j*W+k,j*W+k+1,(j+1)*W+k,(j+1)*W+k+1];tri(O[q[0]],O[q[1]],O[q[2]],radial);tri(O[q[1]],O[q[3]],O[q[2]],radial);const neg=radial.clone().negate();tri(I[q[0]],I[q[1]],I[q[2]],neg);tri(I[q[1]],I[q[3]],I[q[2]],neg);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('wearUv',new T.Float32BufferAttribute(uv,2));g.setAttribute('wearEdge',new T.Float32BufferAttribute(ed,1));g.setAttribute('wearRim',new T.Float32BufferAttribute(rim,4));g.setIndex(idx);g.computeVertexNormals();
  // Walls on their own vertices, so the rims stay crisp.
  const loops=[];for(let k=0;k<=na;k++)loops.push([0,k]);const bottom=loops.splice(0),top=[];for(let k=0;k<=na;k++)top.push([ns,k]);const left=[],right=[];for(let j=0;j<=ns;j++){left.push([j,0]);right.push([j,na]);}
  const walls=[bottom,top,...(closed?[]:[left,right])],wp=[],wu=[],wi=[];
  for(const loop of walls){for(let i=0;i<loop.length-1;i++){const [j0,k0]=loop[i],[j1,k1]=loop[i+1],o0=mid(j0,k0,O),o1=mid(j1,k1,O),i0=mid(j0,k0,I),i1=mid(j1,k1,I),c=o0.clone().add(o1).add(i0).add(i1).multiplyScalar(.25),want=c.clone().sub(centre);
    const n=wp.length/3;for(const p of [o0,o1,i0,i1]){wp.push(p.x,p.y,p.z);}wu.push(0,0,1,0,0,.4,1,.4);const A=o0,B=o1,C=i0,nn=B.clone().sub(A).cross(C.clone().sub(A));if(nn.dot(want)<0)wi.push(n,n+2,n+1,n+1,n+2,n+3);else wi.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const w=new T.BufferGeometry();w.setAttribute('position',new T.Float32BufferAttribute(wp,3));w.setAttribute('wearUv',new T.Float32BufferAttribute(wu,2));w.setAttribute('wearEdge',new T.BufferAttribute(new Float32Array(wp.length/3),1));w.setIndex(wi);w.computeVertexNormals();
  this.push(g,pal,allow,o.reach);if(wi.length)this.push(w,pal,allow,o.reach);return g;}
 // A geometry (centred, its back at z=-depth/2) placed on a map at (ang,s): +z along the surface normal, +y up the body.
 place(g,map,ang,s,off,pal,allow,{depth=0,rot=0,lean=0,yaw=0,flip=false}={}){
  const p=map.sphere?map.point(ang*R,s*R,off):map.point(ang*R,s,off),e=.002,dA=map.sphere?map.point(ang*R+e,s*R,off):map.point(ang*R+e,s,off),dS=map.sphere?map.point(ang*R,s*R+e,off):map.point(ang*R,s+e*.2,off);
  const n=dA.clone().sub(p).cross(dS.clone().sub(p)).normalize(),radial=map.sphere?map.dir(ang*R,s*R):map.dir(ang*R);if(n.dot(radial)<0)n.negate();
  const up=new T.Vector3(0,1,0).addScaledVector(n,-n.y);if(up.lengthSq()<1e-6)up.set(0,0,-1);up.normalize();const right=up.clone().cross(n);
  const m=new T.Matrix4().makeBasis(right,up,n).multiply(new T.Matrix4().makeRotationZ(rot*R)).multiply(new T.Matrix4().makeRotationX(lean*R)).multiply(new T.Matrix4().makeRotationY(yaw*R));if(flip)m.multiply(new T.Matrix4().makeScale(-1,1,1));
  m.setPosition(p.addScaledVector(n,depth/2));g.applyMatrix4(m);if(flip){const I=g.index.array;for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t;}g.computeVertexNormals();}return this.push(g,pal,allow);}
 // A patch: a thin backing in `back` with the game's mark raised on it in `pal`, lying flush on the map.
 patch(map,ang,s,off,shape,size,pal,back,allow,rot=0){this.place(emblem(SHAPES.tile(),size*1.32,.003),map,ang,s,off,back,allow,{depth:.0046,rot});this.place(emblem(SHAPES[shape](),size),map,ang,s,off+.0042,pal,allow,{depth:.0041,rot});}
 // A flat strap laid along a path of (degrees, s[, off]) points on a map, `w` wide and `th` thick.
 strap(map,pts,w,th,off,pal,allow,steps=24,reach){
  const curve=new T.CatmullRomCurve3(pts.map(([a,s,o])=>new T.Vector3(a,s,o??off)),false,'centripetal'),P=[],N=[],pos=[],idx=[],uv=[];
  for(let i=0;i<=steps;i++){const q=curve.getPoint(i/steps),p=map.sphere?map.point(q.x*R,q.y*R,q.z):map.point(q.x*R,q.y,q.z),rad=map.sphere?map.dir(q.x*R,q.y*R):map.dir(q.x*R);P.push(p);N.push(rad);}
  for(let i=0;i<=steps;i++){const t=P[Math.min(steps,i+1)].clone().sub(P[Math.max(0,i-1)]).normalize(),n=N[i].clone().addScaledVector(t,-N[i].dot(t)).normalize(),b=n.clone().cross(t).multiplyScalar(w/2),p=P[i];
   for(const v of [p.clone().add(b),p.clone().sub(b),p.clone().add(b).addScaledVector(n,th),p.clone().sub(b).addScaledVector(n,th)])pos.push(v.x,v.y,v.z);const l=i/steps*3;uv.push(0,l*20,w*55,l*20,0,l*20,w*55,l*20);}
  for(let i=0;i<steps;i++){const a=i*4,b=a+4;idx.push(a+2,b+2,a+3,a+3,b+2,b+3, a,b,a+2,a+2,b,b+2, a+1,a+3,b+1,b+1,a+3,b+3);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('wearUv',new T.Float32BufferAttribute(uv,2));g.setAttribute('wearEdge',new T.BufferAttribute(new Float32Array(pos.length/3).fill(.012),1));g.setIndex(idx);g.computeVertexNormals();
  // Orient the top towards the outside of the map.
  const n0=new T.Vector3(pos[6]-pos[0],pos[7]-pos[1],pos[8]-pos[2]);const A=new T.Vector3(pos[6],pos[7],pos[8]),B=new T.Vector3(pos[18],pos[19],pos[20]),C=new T.Vector3(pos[9],pos[10],pos[11]);if(B.sub(A).cross(C.sub(A)).dot(n0)<0){const I=g.index.array;for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t;}g.computeVertexNormals();}
  return this.push(g,pal,allow,reach);}
 build(){
  const out=[];const I=[0,0,0,0],Wt=[0,0,0,0];const tuck=this.body.tuck(this.pieces);
  for(const {g,pal,allow} of this.pieces){const P=g.attributes.position,n=P.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4),pa=new Float32Array(n).fill(pal);
   for(let i=0;i<n;i++){this.body.weights(P.getX(i),P.getY(i),P.getZ(i),allow,I,Wt);si.set(I,i*4);sw.set(Wt,i*4);}
   g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setAttribute('wearPal',new T.Float32BufferAttribute(pa,1));out.push(g);}
  const merged=mergeGeometries(out,false);for(const g of out)g.dispose();merged.scale(U,U,U);merged.computeBoundingBox();merged.computeBoundingSphere();merged.userData.tuck=tuck;return merged;}
}
// Rounded box (w,h,d metres, corner radius r); its rim distance runs across the face (w,h).
function rbox(w,h,d,r=.006,seg=3){let g=new T.BoxGeometry(w,h,d,seg,seg,seg);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);const P=g.attributes.position,hx=w/2-r,hy=h/2-r,hz=d/2-r,v=new T.Vector3(),c=new T.Vector3(),e=new Float32Array(P.count);
 for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i);c.set(clamp(v.x,-hx,hx),clamp(v.y,-hy,hy),clamp(v.z,-hz,hz));const q=v.clone().sub(c);if(q.lengthSq()>1e-12)v.copy(c).addScaledVector(q.normalize(),r);P.setXYZ(i,v.x,v.y,v.z);e[i]=v.z>hz*.5?Math.min(w/2-Math.abs(v.x),h/2-Math.abs(v.y)):0;}g.setAttribute('wearEdge',new T.BufferAttribute(e,1));
 // V47c: the front face knows its size, so a big box (a back pack) takes the two-tone field and the break like a plate.
 {const r=new Float32Array(P.count*4);for(let i=0;i<P.count;i++){r[i*4]=e[i];r[i*4+1]=1;if(P.getZ(i)>hz*.5){r[i*4+2]=w;r[i*4+3]=h;}}g.setAttribute('wearRim',new T.BufferAttribute(r,4));}g.computeVertexNormals();return g;}
function cylinder(r,h,seg=12,r2=r){const g=new T.CylinderGeometry(r2,r,h,seg,1);g.deleteAttribute('uv');return g;}
function emblem(shapes,size,depth=.0025){const g=new T.ExtrudeGeometry(shapes,{depth,bevelEnabled:true,bevelThickness:.0008,bevelSize:.0006,bevelSegments:1,curveSegments:8});g.deleteAttribute('uv');g.scale(size,size,1);g.computeBoundingBox();const c=g.boundingBox.getCenter(new T.Vector3());g.translate(-c.x,-c.y,-c.z);g.computeVertexNormals();return g;}
// A thin slab over a (u,v) patch: p(u,v) its top surface, `th` thick downward along `down`; rim distance from u, v ends.
function slab(p,nu,nv,th,down,lenU,lenV){const pos=[],ed=[],idx=[],q=new T.Vector3();
 for(const s of [0,1])for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){p(i/nu,j/nv,q);if(s)q.addScaledVector(down,th);pos.push(q.x,q.y,q.z);ed.push(s?0:Math.min(Math.min(i/nu,1-i/nu)*lenU,(1-j/nv)*lenV));}
 const W=nu+1,H=(nv+1)*W,f=(a,b,c,flip)=>flip?idx.push(a,c,b):idx.push(a,b,c);
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;f(a,b,c,0);f(b,d,c,0);f(a+H,b+H,c+H,1);f(b+H,d+H,c+H,1);}
 for(let i=0;i<nu;i++){const a=nv*W+i,b=a+1;f(a,b,a+H,1);f(b,b+H,a+H,1);}for(let j=0;j<nv;j++)for(const i of [0,nu]){const a=j*W+i,c=a+W;f(a,c,a+H,i?1:0);f(c,c+H,a+H,i?1:0);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('wearEdge',new T.Float32BufferAttribute(ed,1));g.setIndex(idx);g.computeVertexNormals();
 // Face the top up (the slab's own winding is decided by its parametrisation).
 const A=new T.Vector3().fromArray(pos,0),B=new T.Vector3().fromArray(pos,3),C=new T.Vector3().fromArray(pos,W*3);if(B.sub(A).cross(C.sub(A)).dot(down)>0){const I=g.index.array;for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t;}g.computeVertexNormals();}return g;}
// The game's own marks (unit size, drawn in a 1×1 box), worn as small patches in the team's colour: abstract shapes of the
// game's world, no real unit, army, rank, flag, brand or another game's sign.
const SHAPES={
 // The patch every mark is worn on: a rounded square.
 tile(){const p=new T.Shape(),h=.5,r=.16;p.moveTo(-h+r,-h);p.lineTo(h-r,-h);p.quadraticCurveTo(h,-h,h,-h+r);p.lineTo(h,h-r);p.quadraticCurveTo(h,h,h-r,h);p.lineTo(-h+r,h);p.quadraticCurveTo(-h,h,-h,h-r);p.lineTo(-h,-h+r);p.quadraticCurveTo(-h,-h,-h+r,-h);return [p];},
 // ASSALTO, "Varco" (the way in): a block split on the diagonal, its upper half pushed through ahead of the lower.
 varco(){const a=new T.Shape(),b=new T.Shape(),g=.07;a.moveTo(-.46,-.46);a.lineTo(.46-g,-.46);a.lineTo(-.46,.46-g);a.closePath();b.moveTo(.46+.1,-.46+g+.1);b.lineTo(.46+.1,.46+.1);b.lineTo(-.46+g+.1,.46+.1);b.closePath();return [a,b];},
 // SFONDAMENTO, "Muro": three stones laid in a bond, two below and one across their joint.
 muro(){const s=[],st=(x,y,w,h)=>{const p=new T.Shape(),r=.05;p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);s.push(p);};st(-.5,-.42,.47,.36);st(.03,-.42,.47,.36);st(-.24,.04,.48,.36);return s;},
 // TIRATORE, "Ago" (the needle): a long thin spindle with an eye at one end, lying on the diagonal.
 ago(){const p=new T.Shape();p.moveTo(-.5,0);p.quadraticCurveTo(0,.075,.5,0);p.quadraticCurveTo(0,-.075,-.5,0);const h=new T.Path();h.absellipse(.3,0,.09,.026,0,Math.PI*2,true);p.holes.push(h);const m=new T.Matrix3().makeRotation(Math.PI/4),tr=v=>v.applyMatrix3(m);const q=new T.Shape(p.getPoints(24).map(tr));q.holes.push(new T.Path(h.getPoints(16).map(tr)));return [q];},
 // RICOGNIZIONE, "Orecchio" (the listening ear, the game's own name): a spiral band winding one and a quarter turns in.
 orecchio(){const o=[],i=[],N=40;for(let k=0;k<=N;k++){const t=k/N,a=Math.PI*.5+t*Math.PI*2.4,r=.5-.3*t;o.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*r));i.push(new T.Vector2(Math.cos(a)*(r-.13+.05*t),Math.sin(a)*(r-.13+.05*t)));}return [new T.Shape([...o,...i.reverse()])];}
};
// ---- the kits ------------------------------------------------------------------------------
const TORSO=/^(Hips|Spine|Spine1|Spine2|Neck|LeftShoulder|RightShoulder)$/,CHEST=/^(Spine1|Spine2|LeftShoulder|RightShoulder|Neck)$/,WAIST=/^(Hips|Spine)$/,HEAD=/^(Head|Neck)$/,COLLAR=/^(Spine2|Neck|LeftShoulder|RightShoulder)$/;
const side=n=>({Left:1,Right:-1})[n];
function maps(b){const a=b.at,m={};
 m.torso=b.cyl(new T.Vector3(0,.84,-.012),new T.Vector3(0,1.64,-.012),TORSO,{na:72,ns:48,s0:0,s1:1});m.y=y=>(y-.84)/.8;
 const L={passes:3,tol:.006};for(const S of ['Left','Right']){m[S+'arm']=b.cyl(a[S+'Arm'],a[S+'ForeArm'],new RegExp('^'+S+'Arm$'),L);m[S+'fore']=b.cyl(a[S+'ForeArm'],a[S+'Hand'],new RegExp('^'+S+'ForeArm$'),{...L,s0:-.05,s1:1.02});
  m[S+'thigh']=b.cyl(a[S+'UpLeg'],a[S+'Leg'],new RegExp('^'+S+'UpLeg$'),L);m[S+'shin']=b.cyl(a[S+'Leg'],a[S+'Foot'],new RegExp('^'+S+'(Leg|Foot)$'),{...L,s0:-.15,s1:1.05});}
 // V44 op4: shell maps, smoothed as a hard envelope (the trousers' folds no longer ripple a greave or a thigh plate).
 const SM={passes:22,tol:.016};for(const S of ['Left','Right']){m[S+'armS']=b.cyl(a[S+'Arm'],a[S+'ForeArm'],new RegExp('^'+S+'Arm$'),SM);m[S+'foreS']=b.cyl(a[S+'ForeArm'],a[S+'Hand'],new RegExp('^'+S+'ForeArm$'),{...SM,s0:-.05,s1:1.02});
  m[S+'thighS']=b.cyl(a[S+'UpLeg'],a[S+'Leg'],new RegExp('^'+S+'UpLeg$'),SM);
  // V53: the hand from the wrist to the knuckles (gloves).
  if(a[S+'HandMiddle1'])m[S+'hand']=b.cyl(a[S+'Hand'],a[S+'HandMiddle1'],new RegExp('^'+S+'Hand$'),{na:40,ns:14,s0:-.1,s1:1.15,passes:6,tol:.0015});m[S+'finger']=b.cyl(a[S+'HandMiddle1'],a[S+'HandMiddle2'],new RegExp('^'+S+'Hand(Index|Middle|Ring|Pinky)1$'),{na:40,ns:10,s0:-.2,s1:1.2,passes:6,tol:.0015});m[S+'shinS']=b.cyl(a[S+'Leg'],a[S+'Foot'],new RegExp('^'+S+'(Leg|Foot)$'),{...SM,s0:-.15,s1:1.05});}
 // V54: the foot from heel (s 0) to toe tip (s 1), angle 0 the top of the foot, 180 the sole: sabatons, toe caps, spurs.
 for(const S of ['Left','Right'])m[S+'foot']=footMap(b,S);
 m.neck=b.cyl(new T.Vector3(0,1.5,-.03),new T.Vector3(0,1.6,-.025),/^(Neck|Head)$/,{s0:0,s1:1,na:48,ns:12,passes:6,tol:.006});m.ny=y=>(y-1.5)/.1;
 m.head=b.sphere(new T.Vector3(0,a.Head.y+.085,a.Head.z+.0),HEAD);return m;}
function footMap(b,S){const a=b.at,t=a[S+'ToeBase'],e=a[S+'Toe_End']||t;if(!t||!a[S+'Foot'])return null;const y=t.y+.012,dx=(e.x-t.x)/Math.max(.01,e.z-t.z);
 return b.cyl(new T.Vector3(t.x-dx*(t.z+.15),y,-.15),new T.Vector3(e.x+dx*.012,y,e.z+.012),new RegExp('^'+S+'(Foot|ToeBase|Toe_End)$'),{na:40,ns:18,s0:-.02,s1:1.02,passes:5,tol:.003,front:new T.Vector3(0,1,0)});}
// V54: the nose of a toe cap: the upper part of an ellipsoid over the boot's tip (its underside stays open, above the sole),
// `k` its [width, height, length] in metres, `dz` how far it sits back from the tip.
const toeNose=(w,ft,pal,allow,k=[.07,.05,.05],dz=.03,lift=0)=>{const g=new T.SphereGeometry(1,14,7,0,Math.PI*2,0,Math.PI*.6);g.deleteAttribute('uv');g.scale(...k);const p=ft.a.clone().addScaledVector(ft.u,ft.L-dz);g.translate(p.x,p.y-.004+lift,p.z);return w.push(g,pal,allow);};
// V44 op2: webbing rows (MOLLE-like loops, generic) laid across a plate: `rows` thin straps from y0 up, 25 mm apart.
const webbing=(w,t,y,y0,rows,aL,aR,off,allow,pal=PAL.W)=>{for(let i=0;i<rows;i++)w.panel(t,{s0:y(y0+i*.025),s1:y(y0+i*.025+.011),aL,aR,off,th:.0035,edge:.001,ns:1,na:Math.max(6,Math.round(Math.abs(aR-aL)/5)),bevel:.0015},pal,allow);};
// Two shoulder straps of a carrier, front plate top to back plate top over each shoulder.
const shoulderStraps=(w,t,y,top,off,allow)=>{for(const s of [1,-1])w.strap(t,[[s*28,y(top),off],[s*36,y(top+.07),off*.7],[s*44,y(top+.13),.01],[s*90,y(top+.17),.008],[s*136,y(top+.13),.01],[s*146,y(top+.07),off*.7],[s*152,y(top),off]],.05,.006,off,PAL.W,allow,28);};
const ring=(w,map,s0,s1,off,th,pal,allow,o={})=>w.panel(map,{s0,s1,aL:-180,aR:180,closed:true,off,th,ns:o.ns??2,na:o.na??24,bevel:o.bevel??th*.5,bulge:o.bulge??0,sag:o.sag,reach:o.reach},pal,allow);
// V53 gloves: every wear kit's hands are worked gloves, not bare mitts: a moulded plate on the back of the hand, a padded knuckle
// bar, a cuff that closes the sleeve at the wrist with its pull tab and a fine trim line, in the kit's own slots. The maps follow the
// hand from the wrist to the knuckles; the pieces take the hand's own weights, so they ride the grip.
const gauntlets=(w,m,p)=>{for(const S of ['Left','Right']){const s=side(S),c=s*90,hd=m[S+'hand'],fo=m[S+'fore'],hand=new RegExp('^'+S+'Hand$'),wrist=new RegExp('^'+S+'(ForeArm|Hand)$');if(!hd)continue;
  w.panel(hd,{s0:.08,s1:.72,aL:q=>c-56+12*sstep(.4,.72,q),aR:q=>c+56-12*sstep(.4,.72,q),off:.004,th:.007,edge:.002,ns:4,na:6,bevel:.007,bulge:.002},p.plate,hand);
  w.panel(hd,{s0:.76,s1:1.02,aL:c-66,aR:c+66,off:.004,th:.009,edge:.002,ns:2,na:7,bevel:.006,bulge:.002},p.bar,hand);
  w.panel(hd,{s0:.3,s1:.35,aL:c-42,aR:c+42,off:.0115,th:.002,edge:.0008,ns:1,na:5,bevel:.001},p.trim,hand);
  if(m[S+'finger'])w.panel(m[S+'finger'],{s0:.04,s1:.72,aL:c-52,aR:c+52,off:.002,th:.0045,edge:.0015,ns:2,na:7,bevel:.005,bulge:.001},p.plate,new RegExp('^'+S+'Hand(Index|Middle|Ring|Pinky)1$'));
  ring(w,fo,.86,1.0,.003,.007,p.cuff,wrist,{ns:2,na:14,bevel:.005,bulge:.0015});
  w.panel(fo,{s0:.9,s1:.96,aL:c-22,aR:c+22,off:.0105,th:.004,edge:.001,ns:1,na:4,bevel:.002},p.plate,wrist);}};
// The whole bodies' glove pieces, built once per suit geometry: slots 0 plate, 1 knuckle bar, 2 cuff, 3 trim (tones in skinPart).
function gloveExtra(skin,g){const b=new Body(skin,g,null),a=b.at,m={};
 for(const S of ['Left','Right']){if(!a[S+'HandMiddle1'])return null;m[S+'hand']=b.cyl(a[S+'Hand'],a[S+'HandMiddle1'],new RegExp('^'+S+'Hand$'),{na:40,ns:14,s0:-.1,s1:1.15,passes:6,tol:.0015});m[S+'finger']=b.cyl(a[S+'HandMiddle1'],a[S+'HandMiddle2'],new RegExp('^'+S+'Hand(Index|Middle|Ring|Pinky)1$'),{na:40,ns:10,s0:-.2,s1:1.2,passes:6,tol:.0015});m[S+'fore']=b.cyl(a[S+'ForeArm'],a[S+'Hand'],new RegExp('^'+S+'ForeArm$'),{passes:3,tol:.006,s0:-.05,s1:1.02});}
 const w=new Wear(b);gauntlets(w,m,{plate:0,bar:1,cuff:2,trim:3});
 // V53: and the legs get real joints: a domed knee cop with its upper lame and a gaiter that closes the trouser on the boot, in the
 // same leather tones (outside the mid-limb bands the build check measures: the limbs keep the soldier's girth).
 for(const S of ['Left','Right']){const sh=b.cyl(a[S+'Leg'],a[S+'Foot'],new RegExp('^'+S+'(Leg|Foot)$'),{passes:22,tol:.016,s0:-.15,s1:1.05}),knee=new RegExp('^'+S+'(UpLeg|Leg)$'),boot=new RegExp('^'+S+'(Leg|Foot)$');
  w.panel(sh,{s0:-.1,s1:.15,aL:q=>-54+12*sstep(.04,.15,q),aR:q=>54-12*sstep(.04,.15,q),off:.006,th:.013,edge:.003,ns:6,na:10,bevel:.018,bulge:.004},1,knee);
  w.panel(sh,{s0:-.17,s1:-.075,aL:-44,aR:44,off:.005,th:.008,edge:.002,ns:2,na:6,bevel:.01},2,knee);
  w.panel(sh,{s0:-.015,s1:.005,aL:-38,aR:38,off:.0225,th:.0025,edge:.001,ns:1,na:6,bevel:.0012},0,knee);
  for(const q of [-.06,.09])w.panel(sh,{s0:q,s1:q+.035,aL:54,aR:306,off:.003,th:.0035,edge:.001,ns:1,na:11,bevel:.0015},2,knee);
  ring(w,sh,.74,.9,.003,.007,2,boot,{ns:2,na:17,bevel:.005,bulge:.002});}
 return w.build();}
const KIT_WEAR={
 // ASSALTO, first in. The silhouette is a wedge leaning into the doorway: everything hard sits on the lead (left) side. A
 // plate carrier cut on the diagonal (high over the left lung, low on the right), a bandolier of magazines running from the
 // right hip over the left shoulder, a curved guard on the lead shoulder and forearm, the right arm free and light with the
 // team's band. Belt with a sidearm platform on the right thigh, angular knee shells.
 assalto(w,m,o){const {M,D,W,H,A,I,X,B,L}=PAL,y=m.y,t=m.torso;
  w.panel(t,{s0:y(1.13),s1:y(1.5),aL:s=>-50+66*sstep(y(1.3),y(1.5),s),aR:s=>50-14*sstep(y(1.44),y(1.5),s),off:.012,th:.017,ns:14,na:18,bevel:.012},W,TORSO);
  w.panel(t,{s0:y(1.13),s1:y(1.44),aL:136,aR:224,off:.012,th:.016,ns:10,na:14,bevel:.012},W,TORSO);
  for(const s of [1,-1])w.panel(t,{s0:y(1.13),s1:y(1.26),aL:s>0?44:-136,aR:s>0?136:-44,off:.009,th:.009,ns:5,na:12,bevel:.006},W,TORSO);
  // The bandolier: right hip, across the plate, over the left shoulder, down the back to the right hip.
  w.strap(t,[[-62,y(1.03),.014],[-34,y(1.14),.034],[-6,y(1.26),.034],[22,y(1.39),.034],[44,y(1.52),.018],[78,y(1.62),.012],[130,y(1.58),.012],[168,y(1.42),.034],[204,y(1.22),.03],[236,y(1.05),.012]],.046,.006,.03,W,TORSO,40);
  [[-34,1.13],[-14,1.215],[6,1.3],[26,1.385]].forEach(([a,yy],i)=>{const r=18;w.place(rbox(.05,.072,.032,.008),t,a,y(yy),.04,D,TORSO,{depth:.032,rot:r});w.place(rbox(.054,.022,.036,.006).translate(0,.032,.002),t,a,y(yy),.04,i===3?A:W,TORSO,{depth:.032,rot:r});});
  // A close mock-neck of the undersuit, the jacket's collar folded in under it.
  w.panel(m.neck,{s0:m.ny(1.5),s1:m.ny(1.565),aL:-180,aR:180,closed:true,off:.008,th:.009,edge:.004,ns:3,na:30,bevel:.008,reach:.08},D,COLLAR);
  // Back: a slim hydration panel and a drag handle; belt with its buckle and the accent keeper.
  w.place(rbox(.16,.18,.026,.012),t,180,y(1.27),.028,M,TORSO,{depth:.026});w.place(rbox(.09,.016,.02,.006),t,180,y(1.41),.03,W,TORSO,{depth:.02});
  w.panel(t,{s0:y(1.0),s1:y(1.045),aL:-180,aR:180,closed:true,off:.006,th:.01,ns:3,na:64,bevel:.004},W,WAIST);w.place(rbox(.05,.034,.012,.004),t,0,y(1.022),.014,X,WAIST,{depth:.012});w.place(rbox(.014,.04,.008,.002),t,-28,y(1.022),.016,A,WAIST,{depth:.008});
  // V53: the hard parts are one family of slate shells that follow the limbs (the mustard guard on one forearm and the mustard knee
  // boxes read as loose hoops). Both shoulders carry two overlapping lames (the lead one larger, with the mark), both forearms a
  // vambrace with an elbow cop and a spine, the mustard only as a fine inlay on the rims.
  for(const S of ['Left','Right']){const s=side(S),c=s*90,lead=s>0,ar=m[S+'armS'],fo=m[S+'foreS'],arm=new RegExp('^'+S+'Arm$'),fore=new RegExp('^'+S+'ForeArm$'),wa=lead?104:84,e1=lead?.37:.33;
   w.panel(ar,{s0:.13,s1:e1,aL:q=>c-wa+16*sstep(e1-.12,e1,q),aR:q=>c+wa-16*sstep(e1-.12,e1,q),off:.004,th:.011,edge:.002,ns:6,na:12,bevel:.016},H,arm);
   w.panel(ar,{s0:-.07,s1:.19,aL:q=>c-wa-6+12*sstep(.08,.19,q),aR:q=>c+wa+6-12*sstep(.08,.19,q),off:.012,th:.014,edge:.003,ns:6,na:13,bevel:.018,bulge:.004},H,arm);
   w.panel(ar,{s0:.168,s1:.186,aL:c-wa+10,aR:c+wa-10,off:.0262,th:.0025,edge:.001,ns:1,na:12,bevel:.0012},A,arm);
   w.panel(ar,{s0:e1-.03,s1:e1-.012,aL:c-wa+22,aR:c+wa-22,off:.0152,th:.0025,edge:.001,ns:1,na:10,bevel:.0012},W,arm);
   w.panel(fo,{s0:.13,s1:.8,aL:q=>c-124+26*sstep(.5,.8,q),aR:q=>c+124-26*sstep(.5,.8,q),off:.002,th:.008,edge:.002,ns:9,na:13,bevel:.012},H,fore);
   w.panel(fo,{s0:.2,s1:.72,aL:c-8,aR:c+8,off:.0095,th:.004,edge:.001,ns:6,na:2,bevel:.003},H,fore);
   w.panel(fo,{s0:.735,s1:.755,aL:c-88,aR:c+88,off:.0102,th:.0025,edge:.001,ns:1,na:10,bevel:.0012},A,fore);
   for(const q of [.24,.6])w.panel(fo,{s0:q,s1:q+.045,aL:c+124,aR:c+236,off:.002,th:.003,edge:.001,ns:1,na:7,bevel:.0015},W,fore);
   w.panel(fo,{s0:-.06,s1:.1,aL:s*168-46,aR:s*168+46,off:.004,th:.01,edge:.002,ns:4,na:7,bevel:.014,bulge:.002},H,new RegExp('^'+S+'(Arm|ForeArm)$'));}
  w.patch(m.LeftarmS,78,.06,.028,'varco',.04,L,W,/^LeftArm$/);
  gauntlets(w,m,{plate:H,bar:W,cuff:W,trim:A});
  webbing(w,t,y,1.16,4,-44,40,.031,TORSO);webbing(w,t,y,1.16,6,140,220,.03,TORSO);shoulderStraps(w,t,y,1.44,.03,TORSO);

  // Sidearm platform on the right thigh, two straps round it; a slate cuisse on the lead thigh; knee cop, shin plate and gaiter as one piece.
  const rt=m.Rightthigh;w.panel(rt,{s0:.3,s1:.62,aL:-150,aR:-50,off:.01,th:.012,ns:8,na:10,bevel:.01},D,/^RightUpLeg$/);w.place(rbox(.06,.09,.03,.008),rt,-100,.46,.024,W,/^RightUpLeg$/,{depth:.03});
  for(const s of [.36,.56])ring(w,rt,s,s+.05,.004,.005,W,/^RightUpLeg$/,{ns:1});
  // V44 op4: the carrier's bound edges, a radio pouch and a utility pouch on the cummerbund, an admin flap low on the lead side.
  w.panel(t,{s0:y(1.13),s1:y(1.142),aL:-50,aR:50,off:.027,th:.003,ns:1,na:18,bevel:.0015},D,TORSO);w.panel(t,{s0:y(1.13),s1:y(1.142),aL:136,aR:224,off:.026,th:.003,ns:1,na:14,bevel:.0015},D,TORSO);
  w.place(rbox(.056,.11,.036,.01),t,92,y(1.21),.016,D,TORSO,{depth:.036});w.place(rbox(.06,.026,.04,.006).translate(0,.05,.002),t,92,y(1.21),.016,W,TORSO,{depth:.036});w.place(cylinder(.0035,.07,8).translate(.018,.085,0),t,92,y(1.21),.016,B,TORSO,{depth:.008});
  w.place(rbox(.07,.075,.034,.01),t,-92,y(1.19),.016,D,TORSO,{depth:.034});w.place(rbox(.074,.022,.038,.006).translate(0,.034,.002),t,-92,y(1.19),.016,W,TORSO,{depth:.034});
  w.place(rbox(.09,.05,.014,.006),t,30,y(1.185),.03,D,TORSO,{depth:.014});w.place(rbox(.016,.03,.004,.002),t,30,y(1.185),.045,A,TORSO,{depth:.004});
  {const lt=m.LeftthighS,up=/^LeftUpLeg$/;w.panel(lt,{s0:.16,s1:.6,aL:q=>18+10*sstep(.44,.6,q),aR:q=>132-10*sstep(.44,.6,q),off:.005,th:.011,edge:.002,ns:6,na:9,bevel:.016},H,up);w.panel(lt,{s0:.55,s1:.57,aL:34,aR:118,off:.0162,th:.0025,edge:.001,ns:1,na:7,bevel:.0012},A,up);for(const q of [.24,.46])w.panel(lt,{s0:q,s1:q+.04,aL:132,aR:378,off:.003,th:.0035,edge:.001,ns:1,na:14,bevel:.0015},W,up);}
  for(const S of ['Left','Right']){const sh=m[S+'shinS'],th=m[S+'thighS'],leg=new RegExp('^'+S+'Leg$'),knee=new RegExp('^'+S+'(UpLeg|Leg)$'),boot=new RegExp('^'+S+'(Leg|Foot)$');
   w.panel(sh,{s0:.1,s1:.74,aL:q=>-50+16*sstep(.3,.74,q),aR:q=>50-16*sstep(.3,.74,q),off:.005,th:.012,edge:.002,ns:9,na:9,bevel:.016},H,leg);
   w.panel(sh,{s0:.16,s1:.7,aL:-6,aR:6,off:.0165,th:.0045,edge:.001,ns:6,na:2,bevel:.003},H,leg);
   w.panel(sh,{s0:.205,s1:.225,aL:-36,aR:36,off:.017,th:.0025,edge:.001,ns:1,na:7,bevel:.0012},A,leg);
   for(const q of [.3,.6])w.panel(sh,{s0:q,s1:q+.04,aL:50-q*18,aR:310+q*18,off:.003,th:.0035,edge:.001,ns:1,na:13,bevel:.0015},W,leg);
   w.panel(th,{s0:.86,s1:1.0,aL:-44,aR:44,off:.006,th:.01,edge:.002,ns:3,na:7,bevel:.012},H,knee);
   w.panel(sh,{s0:-.1,s1:.15,aL:q=>-56+10*sstep(.05,.15,q),aR:q=>56-10*sstep(.05,.15,q),off:.011,th:.017,edge:.003,ns:6,na:10,bevel:.016,bulge:.006},H,knee);
   w.panel(sh,{s0:-.02,s1:.0,aL:-40,aR:40,off:.0345,th:.0025,edge:.001,ns:1,na:7,bevel:.0012},A,knee);
   ring(w,sh,.76,.97,.003,.007,B,boot,{ns:3,na:20,bevel:.005,bulge:.002});w.panel(sh,{s0:.8,s1:.84,aL:-180,aR:180,closed:true,off:.0105,th:.003,ns:1,na:20,bevel:.0015},W,boot);}
  // V54: his own boots: a slate toe cap and heel counter with a mustard welt, over the leather.
  for(const S of ['Left','Right']){const ft=m[S+'foot'],foot=new RegExp('^'+S+'(Foot|ToeBase|Toe_End)$');if(!ft)continue;
   w.panel(ft,{s0:.64,s1:.99,aL:-108,aR:108,off:.004,th:.009,edge:.003,ns:4,na:9,bevel:.012,bulge:.003},H,foot);toeNose(w,ft,H,foot,[.07,.053,.05],.032);
   w.panel(ft,{s0:.01,s1:.19,aL:-116,aR:116,off:.004,th:.009,edge:.003,ns:2,na:10,bevel:.008},H,foot);
   for(const a of [1,-1])w.panel(ft,{s0:.02,s1:.99,aL:a>0?102:-112,aR:a>0?112:-102,off:.008,th:.004,edge:.002,ns:7,na:1,bevel:.002},A,foot);
   w.panel(ft,{s0:.4,s1:.47,aL:-100,aR:100,off:.006,th:.005,edge:.002,ns:1,na:9,bevel:.003},W,foot);}
 },
 // SFONDAMENTO, the wall: the mass sits in front, not out to the sides. A deep shell over chest and belly, a raised collar,
 // three belly lames, the team's band across the chest, the "Muro" on a patch at its centre; shoulder caps moulded close to
 // the arm (inside the body's outline), full greaves with knee cops, thigh tassets, a wide belt with two flat
 // pouches.
 sfondamento(w,m,o){const {M,D,W,H,A,I,X,B,L}=PAL,y=m.y,t=m.torso;
  w.panel(t,{s0:y(1.15),s1:y(1.49),aL:s=>-58+12*sstep(y(1.43),y(1.49),s),aR:s=>58-12*sstep(y(1.43),y(1.49),s),off:.014,th:.026,ns:14,na:18,bevel:.02},H,TORSO);
  w.panel(t,{s0:y(1.14),s1:y(1.5),aL:124,aR:236,off:.014,th:.024,ns:12,na:16,bevel:.02},H,TORSO);
  for(const s of [1,-1])w.panel(t,{s0:y(1.12),s1:y(1.33),aL:s>0?52:-128,aR:s>0?128:-52,off:.011,th:.016,ns:8,na:12,bevel:.012},D,TORSO);
  w.panel(t,{s0:y(1.29),s1:y(1.33),aL:-50,aR:50,off:.04,th:.005,ns:2,na:18,bevel:.0025},I,TORSO);
  [[1.085,.03],[1.035,.036],[.985,.042]].forEach(([yy,off],i)=>w.panel(t,{s0:y(yy),s1:y(yy+.072),aL:-46+i*5,aR:46-i*5,off:off-.016,th:.016,ns:4,na:14,bevel:.01},i===1?D:H,WAIST));
  w.patch(t,0,y(1.395),.04,'muro',.056,I,W,CHEST);
  w.panel(m.neck,{s0:m.ny(1.5),s1:m.ny(1.6),aL:-150,aR:150,off:.022,th:.016,edge:.004,ns:5,na:30,bevel:.012,reach:.08},H,COLLAR);
  w.place(rbox(.19,.22,.04,.014),t,180,y(1.3),.038,D,TORSO,{depth:.04});webbing(w,t,y,1.22,5,160,200,.08,TORSO);shoulderStraps(w,t,y,1.46,.042,TORSO);
  for(const [a,yy] of [[-44,1.2],[44,1.2],[-40,1.42],[40,1.42]])w.place(rbox(.014,.014,.008,.004),t,a,y(yy),.04,X,TORSO,{depth:.008});w.place(rbox(.14,.028,.044,.008),t,180,y(1.19),.038,W,TORSO,{depth:.044});
  for(const S of ['Left','Right']){const s=side(S),ar=m[S+'armS'],fo=m[S+'foreS'];
    // V53: the mass is his own body now, not caps laid over it: three stacked shoulder lames, an armoured vambrace with its elbow
    // cop, a cuisse on each thigh and a domed knee cop, all one olive shell family with gunmetal rims and black joints.
    {const c=s*90,arm=new RegExp('^'+S+'Arm$'),fore=new RegExp('^'+S+'ForeArm$'),up=new RegExp('^'+S+'UpLeg$');
     w.panel(ar,{s0:.3,s1:.47,aL:q=>c-92+14*sstep(.37,.47,q),aR:q=>c+92-14*sstep(.37,.47,q),off:.003,th:.01,edge:.003,ns:4,na:12,bevel:.016},H,arm);
     w.panel(ar,{s0:.13,s1:.34,aL:c-106,aR:c+106,off:.006,th:.012,edge:.003,ns:5,na:13,bevel:.018},H,arm);
     w.panel(ar,{s0:-.1,s1:.18,aL:c-118,aR:c+118,off:.01,th:.014,edge:.004,ns:6,na:14,bevel:.02,bulge:.003},H,arm);
     for(const [q,o] of [[.165,.0245],[.325,.0185],[.455,.0135]])w.panel(ar,{s0:q-.022,s1:q,aL:c-96,aR:c+96,off:o,th:.003,edge:.001,ns:1,na:12,bevel:.0015},A,arm);
     w.panel(fo,{s0:.1,s1:.84,aL:q=>c-136+20*sstep(.6,.84,q),aR:q=>c+136-20*sstep(.6,.84,q),off:.002,th:.011,edge:.003,ns:9,na:14,bevel:.016},H,fore);
     w.panel(fo,{s0:.16,s1:.78,aL:c-10,aR:c+10,off:.0135,th:.005,edge:.001,ns:6,na:2,bevel:.004},D,fore);
     for(const q of [.2,.74])w.panel(fo,{s0:q,s1:q+.035,aL:c-116,aR:c+116,off:.0135,th:.003,edge:.001,ns:1,na:12,bevel:.0015},A,fore);
     w.panel(fo,{s0:-.08,s1:.11,aL:s*168-54,aR:s*168+54,off:.005,th:.012,edge:.003,ns:4,na:9,bevel:.016,bulge:.003},D,new RegExp('^'+S+'(Arm|ForeArm)$'));
     const tg=m[S+'thighS'];w.panel(tg,{s0:.42,s1:.8,aL:q=>-74+16*sstep(.64,.8,q),aR:q=>74-16*sstep(.64,.8,q),off:.006,th:.017,edge:.003,ns:6,na:10,bevel:.018},H,up);
     w.panel(tg,{s0:.44,s1:.78,aL:-7,aR:7,off:.0235,th:.006,edge:.001,ns:4,na:2,bevel:.004},D,up);w.panel(tg,{s0:.755,s1:.785,aL:-56,aR:56,off:.0235,th:.003,edge:.001,ns:1,na:9,bevel:.0015},A,up);}
   const sh=m[S+'shinS'],leg=new RegExp('^'+S+'Leg$');w.panel(sh,{s0:-.12,s1:.86,aL:s=>-62+14*sstep(.7,.86,s),aR:s=>62-14*sstep(.7,.86,s),off:.008,th:.015,edge:.003,ns:12,na:12,bevel:.016},H,leg);
    w.panel(sh,{s0:-.16,s1:.17,aL:q=>-64+12*sstep(.06,.17,q),aR:q=>64-12*sstep(.06,.17,q),off:.022,th:.022,edge:.004,ns:8,na:14,bevel:.02,bulge:.008},H,new RegExp('^'+S+'(UpLeg|Leg)$'));w.panel(sh,{s0:-.2,s1:-.1,aL:-52,aR:52,off:.016,th:.012,edge:.003,ns:3,na:12,bevel:.012},D,new RegExp('^'+S+'(UpLeg|Leg)$'));w.panel(sh,{s0:.125,s1:.15,aL:-50,aR:50,off:.0445,th:.003,edge:.001,ns:1,na:12,bevel:.0015},A,leg);w.panel(sh,{s0:.16,s1:.8,aL:-6,aR:6,off:.026,th:.005,ns:10,na:2,bevel:.002},B,leg);
    ring(w,sh,.8,.98,.004,.012,B,new RegExp('^'+S+'(Leg|Foot)$'),{ns:4,na:28,bevel:.008,bulge:.003});
   w.panel(m[S+'thighS'],{s0:.06,s1:.4,aL:s>0?36:-136,aR:s>0?136:-36,off:.006,th:.013,edge:.003,ns:6,na:10,bevel:.016},H,new RegExp('^'+S+'UpLeg$'));
    for(const a of [-44,44])for(const q of [.24,.7])w.place(cylinder(.006,.004,10).rotateX(Math.PI/2),sh,a,q,.023,X,leg,{depth:.004});
   w.panel(m[S+'thighS'],{s0:.36,s1:.4,aL:s>0?40:-132,aR:s>0?132:-40,off:.019,th:.003,ns:1,na:10,bevel:.0015},D,new RegExp('^'+S+'UpLeg$'));}
  w.panel(t,{s0:y(.98),s1:y(1.06),aL:-180,aR:180,closed:true,off:.008,th:.016,ns:4,na:64,bevel:.006},W,WAIST);
  for(const s of [1,-1]){w.place(rbox(.08,.068,.03,.008),t,s*96,y(1.0),.022,D,WAIST,{depth:.03});w.place(rbox(.084,.022,.034,.006),t,s*96,y(1.03),.022,W,WAIST,{depth:.034});}
  gauntlets(w,m,{plate:H,bar:D,cuff:D,trim:A});
  // V54: breacher's boots: a thick rubber bumper round the toe under a steel cap plate, a rubber heel, two straps over the instep.
  for(const S of ['Left','Right']){const ft=m[S+'foot'],foot=new RegExp('^'+S+'(Foot|ToeBase|Toe_End)$');if(!ft)continue;
   w.panel(ft,{s0:.6,s1:.99,aL:-112,aR:112,off:.005,th:.013,edge:.004,ns:4,na:9,bevel:.014,bulge:.004},B,foot);toeNose(w,ft,B,foot,[.078,.058,.056],.034);
   w.panel(ft,{s0:.7,s1:.93,aL:-52,aR:52,off:.019,th:.005,edge:.002,ns:3,na:6,bevel:.006,bulge:.002},X,foot);
   w.panel(ft,{s0:.01,s1:.2,aL:-118,aR:118,off:.005,th:.012,edge:.003,ns:2,na:10,bevel:.01},B,foot);
   for(const q of [.34,.47])w.panel(ft,{s0:q,s1:q+.075,aL:-102,aR:102,off:.006,th:.006,edge:.002,ns:1,na:9,bevel:.003},W,foot);
   w.place(rbox(.026,.02,.008,.003),ft,(S==='Left'?1:-1)*70,.3775,.013,X,foot,{depth:.008});}
 },
 // TIRATORE, the shadow: no plate, dark close cloth. A real hood worn down: its rolled opening sits behind the neck and its
 // bag falls to a point between the shoulder blades, both in the team's colour so the shadow still reads as a team; a slim
 // stitched chest bib with four rounds, crossed straps behind, team bands high on both arms, the thigh's flat map pocket,
 // shins wrapped from ankle to knee, soft knee pads, the "Ago" on the right arm.
 tiratore(w,m,o){const {M,D,W,H,A,I,X,B,L,K,N}=PAL,y=m.y,t=m.torso,UP=/^(Spine1|Spine2|Neck|LeftShoulder|RightShoulder)$/;
  w.panel(m.neck,{s0:m.ny(1.505),s1:m.ny(1.59),aL:64,aR:296,off:.014,th:.03,edge:.008,ns:6,na:34,bevel:.03,bulge:.008,reach:.08,sag:(u,v)=>.005*Math.sin(u*Math.PI*6)*v},I,COLLAR);
  w.panel(t,{s0:y(1.27),s1:y(1.54),aL:s=>180-34*sstep(y(1.27),y(1.5),s),aR:s=>180+34*sstep(y(1.27),y(1.5),s),off:.022,th:.016,ns:14,na:16,bevel:.012,bulge:.01,sag:(u,v)=>.008*Math.sin(u*Math.PI)*(1-v)},I,UP);
  w.strap(t,[[180,y(1.29),.04],[180,y(1.37),.046],[180,y(1.48),.048]],.006,.003,.046,K,UP,10);
  // Chest bib, stitched in channels, with four rounds and a small tool pocket.
  w.panel(t,{s0:y(1.19),s1:y(1.38),aL:s=>-32+8*sstep(y(1.33),y(1.38),s),aR:s=>32-8*sstep(y(1.33),y(1.38),s),off:.01,th:.012,ns:10,na:14,bevel:.008},K,TORSO);
  for(const yy of [1.24,1.285,1.33])w.panel(t,{s0:y(yy),s1:y(yy+.004),aL:-29,aR:29,off:.022,th:.001,ns:1,na:12,bevel:.001},W,TORSO);
  for(let i=0;i<4;i++){const a=-6+i*7.5;w.place(cylinder(.0055,.05,10),t,a,y(1.345),.026,X,CHEST,{depth:.011});w.place(rbox(.016,.03,.016,.004),t,a,y(1.315),.022,W,CHEST,{depth:.016});}
  w.place(rbox(.07,.06,.026,.008),t,-20,y(1.225),.024,W,TORSO,{depth:.026});
  for(const s of [1,-1])w.strap(t,[[s*26,y(1.36)],[s*34,y(1.46)],[s*62,y(1.585)],[s*118,y(1.585)],[s*150,y(1.48),.016],[s*175,y(1.36),.016],[s*205,y(1.18)]],.032,.005,.018,W,TORSO,30);
  w.panel(t,{s0:y(1.005),s1:y(1.035),aL:-180,aR:180,closed:true,off:.005,th:.006,ns:2,na:64,bevel:.003},W,WAIST);w.place(rbox(.12,.08,.04,.012),t,180,y(1.03),.02,K,WAIST,{depth:.04});
  for(const S of ['Left','Right'])ring(w,m[S+'arm'],.34,.5,.003,.006,I,new RegExp('^'+S+'Arm$'),{na:28});
  w.patch(m.Rightarm,-88,.48,.004,'ago',.044,I,K,/^RightArm$/);
  w.panel(m.Leftthigh,{s0:.3,s1:.66,aL:40,aR:130,off:.008,th:.01,ns:8,na:8,bevel:.008},K,/^LeftUpLeg$/);w.panel(m.Leftthigh,{s0:.3,s1:.38,aL:40,aR:130,off:.016,th:.006,ns:2,na:8,bevel:.003},W,/^LeftUpLeg$/);
  for(const S of ['Left','Right']){const sh=m[S+'shin'],leg=new RegExp('^'+S+'(Leg|Foot)$');
   for(let i=0;i<7;i++){const s=.86-i*.095,k=i%2?1:-1;ring(w,sh,s-.06,s+.03,.004+i*.0004,.007,i%2?I:D,leg,{na:24,bevel:.004,sag:u=>.004*Math.sin(u*Math.PI*2)*k});}
   w.panel(sh,{s0:-.06,s1:.12,aL:-46,aR:46,off:.008,th:.012,ns:6,na:10,bevel:.012,bulge:.003},K,new RegExp('^'+S+'Leg$'));
   ring(w,m[S+'fore'],.74,.86,.004,.006,K,new RegExp('^'+S+'(ForeArm|Hand)$'));}
 },
 // RICOGNIZIONE, the light scout: an open field vest in two halves with stacked cargo pockets and a map pocket on the back, a
 // chunky scarf in the team's colour, a satchel on the right hip on its own strap, cargo pockets on the thighs, rolled cuffs,
 // ankle gaiters, the "Orecchio" on the left arm; on the head a soft field cap with a fitted brim and a neck flap.
 // V44 op2 MASTINO, armoured infantry, rebuilt on the soldier's own body (the bought-in figure was a painted, posed nude: no
 // armour of its own, a face under its visor, a skinny build). Segmented plates over the whole body in the team's tone on a
 // near-black quilted undersuit: a deep chest and back shell joined by side straps, three belly lames, a gorget, two-lame
 // pauldrons, vambraces with elbow cops, thigh plates, knee cops and full greaves, hip tassets; a closed helmet with a narrow
 // dark visor and a jaw guard (no face shows). Thin off-white seam bands on the shells' lower rims, the team's vivid band
 // across the chest and round the pauldrons: friend or foe at a glance.
 mastino(w,m,o){const {M,D,W,H,A,I,X,B,L,K,G}=PAL,y=m.y,t=m.torso,h=m.head;
  w.panel(t,{s0:y(1.15),s1:y(1.49),aL:s=>-64+16*sstep(y(1.4),y(1.49),s),aR:s=>64-16*sstep(y(1.4),y(1.49),s),off:.016,th:.026,ns:16,na:20,bevel:.022,bulge:.004},H,TORSO);
  w.panel(t,{s0:y(1.14),s1:y(1.5),aL:116,aR:244,off:.016,th:.024,ns:14,na:18,bevel:.02,bulge:.003},H,TORSO);
  w.panel(t,{s0:y(1.15),s1:y(1.17),aL:-60,aR:60,off:.04,th:.003,ns:1,na:20,bevel:.0015},L,TORSO);w.panel(t,{s0:y(1.14),s1:y(1.16),aL:120,aR:240,off:.038,th:.003,ns:1,na:18,bevel:.0015},L,TORSO);
  w.panel(t,{s0:y(1.38),s1:y(1.415),aL:-46,aR:46,off:.04,th:.004,ns:2,na:18,bevel:.002},I,CHEST);for(const yy of [1.25,1.31])w.panel(t,{s0:y(yy),s1:y(yy+.008),aL:-58,aR:58,off:.04,th:.003,ns:1,na:18,bevel:.0015},D,TORSO);
  for(const [a,yy] of [[-52,1.19],[52,1.19],[-48,1.44],[48,1.44],[150,1.2],[210,1.2]])w.place(rbox(.016,.016,.008,.004),t,a,y(yy),.04,X,TORSO,{depth:.008});
  for(const s of [1,-1])for(const yy of [1.2,1.32])w.panel(t,{s0:y(yy),s1:y(yy+.035),aL:s>0?62:-118,aR:s>0?118:-62,off:.012,th:.008,ns:2,na:10,bevel:.004},W,TORSO);
  [[1.075,.032],[1.02,.038],[.965,.044]].forEach(([yy,off],i)=>w.panel(t,{s0:y(yy),s1:y(yy+.068),aL:-50+i*4,aR:50-i*4,off:off-.018,th:.016,ns:4,na:16,bevel:.01},i===1?D:H,WAIST));
  w.panel(m.neck,{s0:m.ny(1.49),s1:m.ny(1.6),aL:-180,aR:180,closed:true,off:.02,th:.016,edge:.004,ns:5,na:32,bevel:.012,reach:.08},H,COLLAR);
  w.panel(t,{s0:y(.985),s1:y(1.045),aL:-180,aR:180,closed:true,off:.008,th:.016,ns:4,na:64,bevel:.006},W,WAIST);
  for(const s of [1,-1]){w.panel(t,{s0:y(.9),s1:y(1.0),aL:s>0?72:-132,aR:s>0?132:-72,off:.022,th:.014,ns:5,na:10,bevel:.01},H,WAIST);w.place(rbox(.07,.06,.03,.008),t,s*150,y(1.02),.024,D,WAIST,{depth:.03});}
  w.place(rbox(.2,.24,.05,.016),t,180,y(1.3),.044,D,TORSO,{depth:.05});w.place(rbox(.12,.03,.054,.008),t,180,y(1.42),.044,X,TORSO,{depth:.054});
  w.panel(t,{s0:y(1.19),s1:y(1.46),aL:-2.5,aR:2.5,off:.042,th:.004,ns:8,na:2,bevel:.002},H,TORSO);
  for(const S of ['Left','Right']){const s=side(S),ar=m[S+'armS'],fo=m[S+'foreS'],arm=new RegExp('^'+S+'Arm$'),fore=new RegExp('^'+S+'ForeArm$');
   w.panel(ar,{s0:.0,s1:.24,aL:s>0?-10:-190,aR:s>0?190:10,off:.006,th:.018,edge:.003,ns:9,na:16,bevel:.022,bulge:.004},H,arm);
   w.panel(ar,{s0:.2,s1:.36,aL:s>0?0:-180,aR:s>0?180:0,off:.012,th:.012,edge:.003,ns:6,na:14,bevel:.014},D,arm);
   w.panel(ar,{s0:.215,s1:.24,aL:s>0?10:-170,aR:s>0?170:-10,off:.03,th:.003,edge:.001,ns:1,na:14,bevel:.0015},I,arm);
   w.panel(fo,{s0:.16,s1:.78,aL:s>0?-60:-120,aR:s>0?240:300,off:.012,th:.016,edge:.003,ns:10,na:18,bevel:.016},H,fore);
   w.panel(fo,{s0:-.06,s1:.12,aL:s>0?60:-150,aR:s>0?150:-60,off:.012,th:.014,ns:4,na:8,bevel:.01},D,new RegExp('^'+S+'(Arm|ForeArm)$'));
   w.panel(m[S+'thighS'],{s0:.08,s1:.62,aL:s>0?-40:-140,aR:s>0?140:40,off:.015,th:.02,edge:.003,ns:9,na:14,bevel:.016},H,new RegExp('^'+S+'UpLeg$'));
   // V44 op4: a ridge down the greave and the vambrace, the thigh plate split in lames, rivets at the corners.
   {const th=m[S+'thighS'],up=new RegExp('^'+S+'UpLeg$');for(const q of [.26,.44])w.panel(th,{s0:q,s1:q+.012,aL:s>0?-36:-136,aR:s>0?136:36,off:.035,th:.002,ns:1,na:14,bevel:.001},D,up);
    for(const a of (s>0?[-30,126]:[-126,30]))for(const q of [.14,.56])w.place(cylinder(.0065,.004,10).rotateX(Math.PI/2),th,a,q,.035,X,up,{depth:.004});}
   w.panel(fo,{s0:.22,s1:.74,aL:s>0?86:-94,aR:s>0?94:-86,off:.028,th:.004,ns:8,na:2,bevel:.002},H,fore);
   const sh=m[S+'shinS'],leg=new RegExp('^'+S+'Leg$');w.panel(sh,{s0:.16,s1:.78,aL:-3,aR:3,off:.027,th:.005,ns:10,na:2,bevel:.002},H,leg);for(const q of [.38,.6])w.panel(sh,{s0:q,s1:q+.01,aL:-46,aR:46,off:.027,th:.0018,ns:1,na:12,bevel:.001},D,leg);
   for(const a of [-40,40])w.place(cylinder(.006,.004,10).rotateX(Math.PI/2),sh,a,.22,.027,X,leg,{depth:.004});
   w.panel(sh,{s0:.08,s1:.82,aL:s=>-56+8*sstep(.68,.82,s),aR:s=>56-8*sstep(.68,.82,s),off:.011,th:.016,edge:.003,ns:12,na:12,bevel:.012},H,leg);
   // V54: the knee is a squared steel block with a lime face let into it and a steel boss, a lame above it; the back of the leg is
   // plated too (calf and hamstring), the boot wears a sabaton: toe cap, two instep lames, a heel counter, a lime welt.
   {const kn=new RegExp('^'+S+'(UpLeg|Leg)$'),bt=new RegExp('^'+S+'(Leg|Foot)$');
    w.panel(sh,{s0:-.17,s1:.15,aL:q=>-62+10*sstep(.05,.15,q),aR:q=>62-10*sstep(.05,.15,q),off:.018,th:.02,edge:.004,ns:5,na:8,bevel:.012,bulge:.003},H,kn);
    w.panel(sh,{s0:-.115,s1:.095,aL:-38,aR:38,off:.04,th:.007,edge:.002,ns:3,na:5,bevel:.008,bulge:.003},D,kn);
    w.place(cylinder(.013,.008,8).rotateX(Math.PI/2),sh,0,-.01,.05,X,kn,{depth:.008});
    w.panel(sh,{s0:-.24,s1:-.13,aL:-50,aR:50,off:.013,th:.012,edge:.003,ns:2,na:7,bevel:.01},H,kn);
    w.panel(sh,{s0:.12,s1:.7,aL:q=>122+12*sstep(.45,.7,q),aR:q=>238-12*sstep(.45,.7,q),off:.008,th:.014,edge:.003,ns:5,na:7,bevel:.014,bulge:.003},H,leg);
    w.panel(sh,{s0:.2,s1:.62,aL:177,aR:183,off:.023,th:.004,ns:6,na:2,bevel:.002},D,leg);
    w.panel(m[S+'thighS'],{s0:.2,s1:.74,aL:s>0?150:-230,aR:s>0?230:-150,off:.006,th:.013,edge:.003,ns:4,na:6,bevel:.014},H,new RegExp('^'+S+'UpLeg$'));
    ring(w,sh,.8,.97,.006,.014,H,bt,{ns:3,na:16,bevel:.008,bulge:.003});w.panel(sh,{s0:.845,s1:.865,aL:-180,aR:180,closed:true,off:.0215,th:.003,ns:1,na:16,bevel:.0015},D,bt);
    const ft=m[S+'foot'],foot=new RegExp('^'+S+'(Foot|ToeBase|Toe_End)$');if(ft){
     w.panel(ft,{s0:.66,s1:1.0,aL:-112,aR:112,off:.004,th:.013,edge:.004,ns:4,na:9,bevel:.014,bulge:.004},H,foot);
     toeNose(w,ft,H,foot,[.076,.058,.056],.034);
     w.panel(ft,{s0:.5,s1:.7,aL:-104,aR:104,off:.008,th:.011,edge:.003,ns:2,na:9,bevel:.01},H,foot);
     w.panel(ft,{s0:.36,s1:.54,aL:-98,aR:98,off:.012,th:.01,edge:.003,ns:2,na:9,bevel:.01},H,foot);
     w.panel(ft,{s0:.01,s1:.2,aL:-118,aR:118,off:.005,th:.012,edge:.003,ns:2,na:10,bevel:.01},H,foot);
     w.panel(ft,{s0:.02,s1:.99,aL:104,aR:114,off:.011,th:.004,edge:.002,ns:7,na:1,bevel:.002},D,foot);w.panel(ft,{s0:.02,s1:.99,aL:-114,aR:-104,off:.011,th:.004,edge:.002,ns:7,na:1,bevel:.002},D,foot);
     for(const a of [-70,70])w.place(cylinder(.006,.004,8).rotateX(Math.PI/2),ft,a,.6,.021,X,foot,{depth:.004});}}}
  // V54: steel gauntlets with a lime knuckle bar and a flared, studded cuff.
  gauntlets(w,m,{plate:H,bar:D,cuff:K,trim:X});
  for(const S of ['Left','Right']){const s=side(S),fo=m[S+'foreS'],wr=new RegExp('^'+S+'ForeArm$');ring(w,fo,.8,.93,.012,.012,H,wr,{ns:3,na:16,bevel:.007,bulge:.003});
   for(let i=0;i<6;i++)w.place(facet(.0075,.012,4).rotateX(Math.PI/2),fo,s*90+(i-2.5)*36,.865,.026,X,wr,{depth:.012});}
  // The closed helmet: a shell over the whole head, the narrow visor band, a jaw guard and two ear housings.
  w.panel(h,{s0:-42,s1:88,aL:-180,aR:180,closed:true,off:.012,th:.01,edge:.004,ns:14,na:40,bevel:.01},H,HEAD);
  w.panel(h,{s0:-4,s1:13,aL:-62,aR:62,off:.024,th:.006,edge:.002,ns:3,na:20,bevel:.004},G,HEAD);
  // V54: the jaw is steel with a lime muzzle plate let into its front and three breathing slots cut in it.
  w.panel(h,{s0:-46,s1:-7,aL:-74,aR:74,off:.021,th:.013,edge:.003,ns:5,na:18,bevel:.01},H,HEAD);
  w.panel(h,{s0:-41,s1:-13,aL:q=>-34+8*sstep(-26,-41,q),aR:q=>34-8*sstep(-26,-41,q),off:.0345,th:.006,edge:.002,ns:4,na:10,bevel:.006,bulge:.002},D,HEAD);
  for(const a of [-13,0,13])w.panel(h,{s0:-35,s1:-19,aL:a-3,aR:a+3,off:.0405,th:.0025,edge:.001,ns:2,na:1,bevel:.001},K,HEAD);
  w.panel(h,{s0:14,s1:30,aL:-55,aR:55,off:.022,th:.008,edge:.002,ns:3,na:16,bevel:.006},H,HEAD);
  for(const s of [1,-1])w.place(rbox(.05,.06,.022,.012),h,s*92,0,.018,D,HEAD,{depth:.022});
 },
 ricognizione(w,m,o){const {M,D,W,H,A,I,X,B,L,N}=PAL,y=m.y,t=m.torso;
  for(const s of [1,-1]){w.panel(t,{s0:y(1.1),s1:y(1.46),aL:s>0?12:-66,aR:s>0?66:-12,off:.008,th:.008,ns:12,na:12,bevel:.006},N,TORSO);
   for(const [a,yy] of [[s*37,1.17],[s*37,1.27]]){w.place(rbox(.074,.068,.024,.008,2),t,a,y(yy),.016,N,TORSO,{depth:.024});w.place(rbox(.078,.024,.028,.006),t,a,y(yy+.034),.016,D,TORSO,{depth:.028});}
   w.place(rbox(.04,.012,.006,.002),t,s*15,y(1.4),.018,A,CHEST,{depth:.006});}
  w.panel(t,{s0:y(1.1),s1:y(1.46),aL:110,aR:250,off:.008,th:.008,ns:12,na:16,bevel:.006},N,TORSO);w.place(rbox(.2,.16,.016,.01),t,180,y(1.28),.016,D,TORSO,{depth:.016});
  // The scarf: a soft thick roll round the neck with a loose end over the left chest.
  w.panel(m.neck,{s0:m.ny(1.5),s1:m.ny(1.585),aL:-180,aR:180,closed:true,off:.012,th:.026,edge:.008,ns:6,na:40,bevel:.03,bulge:.007,reach:.08,sag:(u,v)=>.004*Math.sin(u*Math.PI*10+v*2)},I,COLLAR);
  w.panel(t,{s0:y(1.36),s1:y(1.53),aL:s=>16+3*Math.sin(s*50),aR:s=>32+3*Math.sin(s*50),off:.022,th:.012,ns:6,na:4,bevel:.006,bulge:.003},I,CHEST);
  // Satchel on the right hip, strap over the left shoulder.
  w.place(rbox(.17,.15,.06,.016),t,-102,y(.99),.02,M,WAIST,{depth:.06,rot:4});w.place(rbox(.175,.06,.064,.012),t,-102,y(1.04),.02,D,WAIST,{depth:.064,rot:4});w.place(rbox(.03,.03,.008,.003),t,-102,y(1.03),.088,X,WAIST,{depth:.008,rot:4});
  w.strap(t,[[-100,y(1.07)],[-140,y(1.16)],[-180,y(1.27)],[-210,y(1.4)],[-250,y(1.52)],[-280,y(1.58)],[-320,y(1.5)],[-360,y(1.36)],[-400,y(1.2)],[-435,y(1.07)]],.03,.004,.024,W,TORSO,48);
  w.panel(t,{s0:y(1.0),s1:y(1.03),aL:-180,aR:180,closed:true,off:.005,th:.006,ns:2,na:64,bevel:.003},W,WAIST);
  w.patch(m.Leftarm,86,.34,.004,'orecchio',.042,I,D,/^LeftArm$/);
  for(const S of ['Left','Right']){const s=side(S),th=m[S+'thigh'],leg=new RegExp('^'+S+'UpLeg$');w.place(rbox(.1,.13,.036,.012),th,s*92,.5,.008,M,leg,{depth:.036});w.place(rbox(.104,.04,.04,.008),th,s*92,.37,.008,D,leg,{depth:.04});
   ring(w,m[S+'arm'],.86,.98,.004,.014,I,new RegExp('^'+S+'(Arm|ForeArm)$'),{ns:3,na:28,bevel:.006,bulge:.003});
   ring(w,m[S+'shin'],.74,.92,.006,.01,N,new RegExp('^'+S+'(Leg|Foot)$'),{ns:4,na:28,bevel:.006,bulge:.002});
   w.panel(m[S+'shin'],{s0:-.07,s1:.1,aL:-40,aR:40,off:.006,th:.008,ns:5,na:8,bevel:.008,bulge:.002},D,new RegExp('^'+S+'Leg$'));}
  if(!o.mask){const h=m.head;// the cap: crown, band, neck flap and a brim fitted to the band's curve
   w.panel(h,{s0:7,s1:86,aL:-180,aR:180,closed:true,off:.003,th:.006,ns:8,na:30,bevel:.004},N,HEAD);
   w.panel(h,{s0:5,s1:12,aL:-180,aR:180,closed:true,off:.008,th:.005,ns:2,na:32,bevel:.003},D,HEAD);
   w.panel(h,{s0:-44,s1:6,aL:118,aR:242,off:.007,th:.004,ns:6,na:12,bevel:.004,sag:(u,v)=>.012*(1-v)},N,HEAD);
   const up=new T.Vector3(0,1,0),down=up.clone().negate();
   w.push(slab((u,v,out)=>{const az=(-64+128*u)*R,len=.012+.046*Math.pow(Math.cos(az*1.2),.8),base=h.point(az,6*R,.009,out),dir=new T.Vector3(Math.sin(az),0,Math.cos(az));return out.copy(base).addScaledVector(dir,len*v).addScaledVector(up,-.012*v*v+.002*v);},24,4,.005,down,.12,.05),D,HEAD);}
 }
};
// The wear of one kit and toggles, built once per body (every operator shares the soldier's bind pose).
// V54: phones build every wear at 62% of its mesh density (setWearLite, called with the phone assets).
let wearQ=1;export function setWearLite(on=true){wearQ=on?.62:1;}
const built=new Map();let body=null,bodyKey=null,mapsOf=null;
export function wearGeometry(kit,o,suit,head){
 if(!WEAR_KITS.has(kit)||!suit)return null;const sg=suit.userData.baseSuitGeometry||suit.geometry,key=kit+':'+(kit==='ricognizione'?(o.mask?1:0):0)+':'+sg.uuid+':'+wearQ;if(built.has(key))return built.get(key);
 if(bodyKey!==sg.uuid){body=new Body(suit,sg,head);mapsOf=maps(body);bodyKey=sg.uuid;}
 const w=new Wear(body,wearQ);KIT_WEAR[kit](w,mapsOf,o);const g=w.build();g.userData.tris=g.index.count/3;built.set(key,g);return g;}

// ---- V54: the whole bodies' own kit --------------------------------------------------------------------------------------
// The five whole bodies shared one mannequin: the soldier's suit with each operator painted on it, the same charcoal gloves and
// the same combat boots. Now each wears pieces of its own, built like the classic kits' wear: panels that follow the body's
// surface and take its skin weights (they bend with it in every pose), and small rigid shapes (fins, studs, claws) bound to
// one bone. They are merged with the gloves and boots cut from the soldier's suit into ONE skinned mesh (one draw): the wear's
// palette look, where the glove and boot leather keeps its photographed texture dyed in the operator's own colour (marked by a
// negative wearEdge; wearRim.x carries the finger tone). Mid-limb the shells are thin (tools/check_operators.mjs holds every
// build within 12% of the soldier's): the mass goes to knees, ankles, elbows, wrists, feet and hands.
const LIMB=(S,k)=>new RegExp('^'+S+k+'$');
// A keel: a roof-shaped sag for a panel (a ridge down its middle, `k` metres high).
const keel=k=>(u,v)=>k*(1-Math.abs(2*u-1));
// A rigid blade (profile in the plane along the limb and out of it: [along, out] metres) standing on a map at (ang, s).
function fin(w,map,ang,s,off,pts,thick,pal,allow,o={}){const sh=new T.Shape();pts.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();
 const g=new T.ExtrudeGeometry(sh,{depth:thick,bevelEnabled:true,bevelThickness:thick*.3,bevelSize:thick*.3,bevelSegments:1,curveSegments:4});g.deleteAttribute('uv');g.translate(0,0,-thick/2);
 // shape x → the body's up (+y of place), shape y → the surface normal (+z of place)
 g.applyMatrix4(new T.Matrix4().makeBasis(new T.Vector3(0,1,0),new T.Vector3(0,0,1),new T.Vector3(1,0,0)));g.computeVertexNormals();return w.place(g,map,ang,s,off,pal,allow,{depth:0,...o});}
// A faceted spike (crystal, stud, claw): flat faces, its base on the map and its tip along the surface normal (lean tilts it).
const facet=(r,h,seg)=>{const g=new T.ConeGeometry(r,h,seg,1).toNonIndexed();g.deleteAttribute('uv');g.deleteAttribute('normal');g.computeVertexNormals();return g;};
const spike=(w,map,ang,s,off,r,h,seg,pal,allow,o={})=>w.place(facet(r,h,seg).rotateX(Math.PI/2),map,ang,s,off,pal,allow,{depth:h,...o});
const BODY_WEAR={
 // SAETTA, the runner: nothing heavy. White lacquer shin shells with a yellow keel and a swept spur behind each calf, pointed knee
 // cops, a yellow racing panel down the outer thigh, slim vambraces with an elbow point, light shoes with a yellow welt and a small
 // winglet at each ankle.
 saetta(w,m,hw,hm){const {M:H,A,K,X,D,I}=PAL;   // M is a lacquered shell here (operator-detail.js DETAIL.saetta.hard)
  for(const S of ['Left','Right']){const s=side(S),c=s*90,sh=m[S+'shinS'],th=m[S+'thighS'],fo=m[S+'foreS'],leg=LIMB(S,'Leg'),kn=LIMB(S,'(UpLeg|Leg)'),up=LIMB(S,'UpLeg'),fore=LIMB(S,'ForeArm'),bt=LIMB(S,'(Leg|Foot)');
   // shin shell: a long teardrop, widest under the knee, its keel in yellow
   w.panel(sh,{s0:.1,s1:.8,aL:q=>-58+26*sstep(.3,.8,q),aR:q=>58-26*sstep(.3,.8,q),off:-.007,th:.008,edge:.002,ns:10,na:10,bevel:.012,sag:keel(.006)},H,leg);
   w.panel(sh,{s0:.13,s1:.77,aL:-2.4,aR:2.4,off:.0065,th:.003,edge:.001,ns:8,na:1,bevel:.0015},A,leg);
   // knee cop: a pointed shield, its tip up the thigh
   w.panel(sh,{s0:-.2,s1:.12,aL:q=>-50*sstep(-.2,-.02,q)+8*sstep(.02,.12,q),aR:q=>50*sstep(-.2,-.02,q)-8*sstep(.02,.12,q),off:.008,th:.012,edge:.003,ns:7,na:8,bevel:.012,bulge:.004,sag:keel(.005)},H,kn);
   w.panel(sh,{s0:.085,s1:.105,aL:-44,aR:44,off:.021,th:.0025,edge:.001,ns:1,na:8,bevel:.0012},A,kn);
   // the spur: a swept fin behind the calf
   // (it stands on the top of the calf, clear of the mid-shin band whose girth tools/check_operators.mjs holds to the soldier's)
   fin(w,sh,180,.05,.004,[[.03,0],[-.07,0],[-.098,.014],[-.108,.07],[-.05,.034],[.0,.022]],.007,A,leg);
   // outer thigh: a racing panel that tapers to the knee
   w.panel(th,{s0:.1,s1:.86,aL:q=>c-26+12*sstep(.3,.86,q),aR:q=>c+26-12*sstep(.3,.86,q),off:.003,th:.005,edge:.0015,ns:9,na:5,bevel:.006},A,up);
   w.panel(th,{s0:.14,s1:.8,aL:q=>c-5+2*sstep(.3,.8,q),aR:q=>c+5-2*sstep(.3,.8,q),off:.0085,th:.0025,edge:.001,ns:7,na:1,bevel:.0012},K,up);
   // vambrace and elbow point
   w.panel(fo,{s0:.2,s1:.8,aL:q=>c-70+20*sstep(.4,.8,q),aR:q=>c+70-20*sstep(.4,.8,q),off:.003,th:.006,edge:.002,ns:8,na:9,bevel:.008,sag:keel(.004)},H,fore);
   w.panel(fo,{s0:.24,s1:.76,aL:c-3,aR:c+3,off:.0135,th:.0025,edge:.001,ns:6,na:1,bevel:.0012},A,fore);
   fin(w,fo,180,.06,.004,[[.05,0],[-.06,0],[-.095,.03],[-.03,.016]],.006,A,LIMB(S,'(Arm|ForeArm)'));
   // ankle: a clean cuff where the suit meets the shoe, a winglet on its outer side
   const an=hm[S+'ankle'];ring(hw,an,.76,.9,.004,.007,H,bt,{ns:2,na:16,bevel:.005,bulge:.0015});hw.panel(an,{s0:.815,s1:.835,aL:-180,aR:180,closed:true,off:.0115,th:.0025,ns:1,na:16,bevel:.0012},A,bt);
   fin(hw,an,c*1.15,.8,.009,[[.03,0],[-.035,0],[-.085,.03],[-.11,.07],[-.055,.045],[-.02,.03]],.005,A,bt);
   const ft=hm[S+'foot'],foot=LIMB(S,'(Foot|ToeBase|Toe_End)');if(ft){
    hw.panel(ft,{s0:.6,s1:.985,aL:-104,aR:104,off:.003,th:.007,edge:.002,ns:5,na:10,bevel:.01,bulge:.002},H,foot);toeNose(hw,ft,H,foot,[.066,.05,.046],.03);
    for(const a of [1,-1])hw.panel(ft,{s0:.03,s1:.99,aL:a>0?100:-112,aR:a>0?112:-100,off:.006,th:.005,edge:.002,ns:12,na:1,bevel:.002},A,foot);
    hw.panel(ft,{s0:.01,s1:.16,aL:-116,aR:116,off:.004,th:.008,edge:.002,ns:2,na:12,bevel:.006},A,foot);}}
  gauntlets(hw,hm,{plate:H,bar:A,cuff:K,trim:A});
 },
 // ONICE, the gem: everything is cut in facets. Black lacquer greaves and vambraces with a sharp ridge and a violet edge, a violet
 // lozenge on each thigh and on the sternum, crystals standing on the knees and the elbows, a faceted toe.
 onice(w,m,hw,hm){const {H,A,K,X}=PAL,t=m.torso,y=m.y;
  const loz=(map,c,q0,q1,half,off,th,pal,allow,k=.008)=>w.panel(map,{s0:q0,s1:q1,aL:q=>c-half*(1-Math.abs(2*(q-q0)/(q1-q0)-1))-1.5,aR:q=>c+half*(1-Math.abs(2*(q-q0)/(q1-q0)-1))+1.5,off,th,edge:.002,ns:10,na:6,bevel:.006,sag:keel(k)},pal,allow);
  loz(t,0,y(1.2),y(1.42),30,.01,.007,A,CHEST,.012);
  for(const S of ['Left','Right']){const s=side(S),c=s*90,sh=m[S+'shinS'],th=m[S+'thighS'],fo=m[S+'foreS'],leg=LIMB(S,'Leg'),kn=LIMB(S,'(UpLeg|Leg)'),up=LIMB(S,'UpLeg'),fore=LIMB(S,'ForeArm'),bt=LIMB(S,'(Leg|Foot)');
   w.panel(sh,{s0:.12,s1:.8,aL:q=>-64+18*sstep(.45,.8,q),aR:q=>64-18*sstep(.45,.8,q),off:.003,th:.006,edge:.002,ns:9,na:8,bevel:.008,sag:keel(.013)},H,leg);
   w.panel(sh,{s0:.14,s1:.78,aL:-2,aR:2,off:.0225,th:.0025,edge:.001,ns:8,na:1,bevel:.0012},A,leg);
   w.panel(sh,{s0:-.14,s1:.13,aL:q=>-52+10*sstep(.0,.13,q),aR:q=>52-10*sstep(.0,.13,q),off:.008,th:.01,edge:.003,ns:5,na:6,bevel:.01,sag:keel(.012)},H,kn);
   spike(w,sh,0,-.03,.024,.028,.085,4,A,kn,{lean:-62,rot:45});
   loz(th,s*38,.16,.74,34,.003,.006,A,up);
   w.panel(th,{s0:.78,s1:.8,aL:s>0?-60:-140,aR:s>0?140:60,off:.004,th:.004,edge:.001,ns:1,na:10,bevel:.002},A,up);
   w.panel(fo,{s0:.18,s1:.8,aL:q=>c-74+22*sstep(.4,.8,q),aR:q=>c+74-22*sstep(.4,.8,q),off:.003,th:.005,edge:.002,ns:8,na:8,bevel:.007,sag:keel(.011)},H,fore);
   w.panel(fo,{s0:.2,s1:.78,aL:c-2.5,aR:c+2.5,off:.0195,th:.0025,edge:.001,ns:6,na:1,bevel:.0012},A,fore);
   spike(w,fo,180,.03,.004,.022,.085,4,A,LIMB(S,'(Arm|ForeArm)'),{lean:-52,rot:45});
   {const an=hm[S+'ankle'];ring(hw,an,.76,.9,.004,.008,H,bt,{ns:2,na:12,bevel:.005});hw.panel(an,{s0:.82,s1:.838,aL:-180,aR:180,closed:true,off:.0125,th:.0025,ns:1,na:12,bevel:.0012},A,bt);}
   const ft=hm[S+'foot'],foot=LIMB(S,'(Foot|ToeBase|Toe_End)');if(ft){
    hw.panel(ft,{s0:.5,s1:.99,aL:-106,aR:106,off:.003,th:.007,edge:.002,ns:6,na:6,bevel:.01,sag:keel(.012)},H,foot);toeNose(hw,ft,H,foot,[.064,.05,.05],.03);
    hw.panel(ft,{s0:.52,s1:.99,aL:-3,aR:3,off:.0225,th:.0025,edge:.001,ns:5,na:1,bevel:.0012},A,foot);
    hw.panel(ft,{s0:.01,s1:.18,aL:-116,aR:116,off:.004,th:.008,edge:.002,ns:2,na:8,bevel:.006},H,foot);
    for(const a of [1,-1])hw.panel(ft,{s0:.03,s1:.99,aL:a>0?101:-111,aR:a>0?111:-101,off:.006,th:.004,edge:.002,ns:12,na:1,bevel:.002},A,foot);}
   // violet crystals on the knuckles
   const hd=hm[S+'hand'];if(hd)for(const a of [-36,-12,12,36])spike(hw,hd,c+a,.93,.008,.0075,.024,4,A,LIMB(S,'Hand'),{lean:-35});}
  gauntlets(hw,hm,{plate:H,bar:H,cuff:H,trim:A});
 },
 // ASTORE, the rescue pilot: a working flight suit. A climbing harness (leg loops, chest straps on a steel ring), cargo pockets on
 // the thighs, rubber knee pads with a steel cap, steel suit rings at wrists and ankles, an instrument on the left forearm, rescue
 // boots with a rubber bumper.
 astore(w,m,hw,hm){const {M,A,K,X,B,W,L,G,I}=PAL,t=m.torso,y=m.y;
  for(const a of [-34,34,146,214])w.panel(t,{s0:y(1.03),s1:y(1.43),aL:a-5,aR:a+5,off:-.004,th:.005,edge:.002,ns:8,na:2,bevel:.003},W,TORSO);
  w.panel(t,{s0:y(1.285),s1:y(1.32),aL:-52,aR:52,off:-.002,th:.005,edge:.002,ns:2,na:12,bevel:.003},W,TORSO);
  w.place(new T.TorusGeometry(.024,.0055,6,18),t,0,y(1.3025),.004,A,TORSO,{depth:.011});
  for(const S of ['Left','Right']){const s=side(S),c=s*90,sh=m[S+'shinS'],th=m[S+'thigh'],fo=m[S+'fore'],leg=LIMB(S,'Leg'),kn=LIMB(S,'(UpLeg|Leg)'),up=LIMB(S,'UpLeg'),fore=LIMB(S,'ForeArm'),bt=LIMB(S,'(Leg|Foot)'),wr=LIMB(S,'(ForeArm|Hand)');
   // harness: a leg loop high on the thigh, a riser to the belt, a steel buckle
   ring(w,th,.1,.165,-.004,.006,W,up,{ns:2,na:18,bevel:.003});w.panel(th,{s0:-.1,s1:.12,aL:s*26-7,aR:s*26+7,off:-.002,th:.006,edge:.002,ns:4,na:2,bevel:.003},W,LIMB(S,'UpLeg'));
   w.place(rbox(.03,.03,.01,.003),th,s*26,.132,.003,A,up,{depth:.01});
   // cargo pocket: a bellows pocket, its flap and a steel snap
   w.place(rbox(.105,.13,.02,.008),th,c,.5,-.008,M,up,{depth:.02});w.place(rbox(.112,.045,.007,.003),th,c,.39,.012,M,up,{depth:.007});w.place(cylinder(.0075,.005,10).rotateX(Math.PI/2),th,c,.42,.019,A,up,{depth:.005});
   // knee pad: rubber, a steel cap
   w.panel(sh,{s0:-.15,s1:.14,aL:q=>-58+12*sstep(.04,.14,q),aR:q=>58-12*sstep(.04,.14,q),off:.008,th:.014,edge:.004,ns:6,na:9,bevel:.016,bulge:.005},B,kn);
   w.panel(sh,{s0:-.09,s1:.07,aL:-30,aR:30,off:.0255,th:.005,edge:.002,ns:4,na:6,bevel:.006,bulge:.003},A,kn);
   for(const q of [-.12,.105])w.panel(sh,{s0:q,s1:q+.03,aL:58,aR:302,off:.004,th:.004,edge:.001,ns:1,na:12,bevel:.0015},W,kn);
   // suit rings
   ring(hw,hm[S+'ankle'],.72,.8,.003,.011,A,bt,{ns:3,na:18,bevel:.006,bulge:.003});ring(w,fo,.82,.9,-.006,.012,A,wr,{ns:3,na:16,bevel:.006,bulge:.003});
   if(s>0){w.place(rbox(.06,.075,.016,.005),fo,c,.5,-.006,K,fore,{depth:.016});w.place(rbox(.044,.04,.004,.002),fo,c,.47,.01,G,fore,{depth:.004});w.place(rbox(.044,.008,.004,.002),fo,c,.6,.01,I,fore,{depth:.004});ring(w,fo,.44,.56,-.008,.004,W,fore,{ns:1,na:14,bevel:.002});}
   const ft=hm[S+'foot'],foot=LIMB(S,'(Foot|ToeBase|Toe_End)');if(ft){
    hw.panel(ft,{s0:.68,s1:.99,aL:-108,aR:108,off:.004,th:.01,edge:.003,ns:4,na:10,bevel:.012,bulge:.003},B,foot);toeNose(hw,ft,B,foot,[.07,.054,.05],.03);
    hw.panel(ft,{s0:.01,s1:.2,aL:-116,aR:116,off:.004,th:.008,edge:.002,ns:2,na:10,bevel:.006},A,foot);
    hw.panel(ft,{s0:.4,s1:.47,aL:-100,aR:100,off:.006,th:.005,edge:.002,ns:1,na:10,bevel:.003},W,foot);hw.place(rbox(.024,.02,.008,.003),ft,c*.78,.435,.012,A,foot,{depth:.008});}}
  gauntlets(hw,hm,{plate:K,bar:B,cuff:K,trim:L});
 },
 // CORVO, the raven: feathers. Three overlapping feather plates down the outer thigh and one long greave feather, each with a gold
 // quill; a gold beak on the knee; a feather vambrace; gold talons on the boots and the knuckles.
 corvo(w,m,hw,hm){const {H,A,K,X}=PAL;
  const feather=(map,c,q0,q1,half,off,th,pal,allow,k=.005,W=w)=>{const hw2=q=>half*(.55+.45*sstep(q0,q0+(q1-q0)*.3,q))*(1-.92*sstep(q0+(q1-q0)*.5,q1,q));W.panel(map,{s0:q0,s1:q1,aL:q=>c-hw2(q)-1.2,aR:q=>c+hw2(q)+1.2,off,th,edge:.0015,ns:8,na:6,bevel:.006,sag:keel(k)},pal,allow);
   W.panel(map,{s0:q0+(q1-q0)*.06,s1:q1-(q1-q0)*.1,aL:c-1.6,aR:c+1.6,off:off+th+k-.0005,th:.002,edge:.001,ns:6,na:1,bevel:.001},A,allow);};
  for(const S of ['Left','Right']){const s=side(S),c=s*90,sh=m[S+'shinS'],th=m[S+'thighS'],fo=m[S+'foreS'],leg=LIMB(S,'Leg'),kn=LIMB(S,'(UpLeg|Leg)'),up=LIMB(S,'UpLeg'),fore=LIMB(S,'ForeArm'),bt=LIMB(S,'(Leg|Foot)');
   [[.08,.44,.0095],[.3,.66,.0065],[.52,.88,.0035]].forEach(([a,b,off],i)=>feather(th,c*.72,a,b,46-i*5,off,.005,H,up));
   feather(sh,0,.1,.84,56,.003,.006,H,leg,.008);
   for(const a of [150,210])feather(sh,a,.14,.6,22,.003,.005,H,leg,.004);
   // the beak: a gold cop that comes to a point over the shin
   w.panel(sh,{s0:-.14,s1:.2,aL:q=>-50*(1-.95*sstep(.02,.2,q)),aR:q=>50*(1-.95*sstep(.02,.2,q)),off:.012,th:.01,edge:.002,ns:7,na:7,bevel:.01,sag:keel(.012)},A,kn);
   feather(fo,c,.2,.82,60,-.007,.005,H,fore,.006);
   {const an=hm[S+'ankle'];ring(hw,an,.76,.9,.004,.008,H,bt,{ns:2,na:14,bevel:.005});hw.panel(an,{s0:.82,s1:.838,aL:-180,aR:180,closed:true,off:.0125,th:.0025,ns:1,na:14,bevel:.0012},A,bt);}
   const ft=hm[S+'foot'],foot=LIMB(S,'(Foot|ToeBase|Toe_End)');if(ft){
    hw.panel(ft,{s0:.6,s1:.99,aL:-106,aR:106,off:.003,th:.008,edge:.002,ns:4,na:8,bevel:.01,sag:keel(.006)},A,foot);toeNose(hw,ft,A,foot,[.064,.05,.05],.03);
    for(const a of [-52,0,52])spike(hw,ft,a,.99,.0,.013,.05,4,A,foot,{lean:a?62:74,yaw:a*.4});
    fin(hw,ft,0,.03,.0,[[.03,0],[-.03,0],[-.06,.012],[-.085,.05],[-.035,.03]],.008,A,foot,{lean:-70});
    hw.panel(ft,{s0:.3,s1:.56,aL:q=>-78*(1-.9*sstep(.3,.56,q)),aR:q=>78*(1-.9*sstep(.3,.56,q)),off:.004,th:.005,edge:.0015,ns:4,na:6,bevel:.005,sag:keel(.004)},H,foot);}
   const hd=hm[S+'hand'];if(hd)for(const a of [-36,-12,12,36])spike(hw,hd,c+a,.95,.008,.007,.03,4,A,LIMB(S,'Hand'),{lean:-50});}
  gauntlets(hw,hm,{plate:H,bar:H,cuff:H,trim:A});
 },
 // LINCE, the stalker: soft and bound. Cloth wraps wound round the shins and the forearms, a quilted knee pad with a copper fang, a
 // blade sheathed on the left thigh and a pouch on the right, a rolled cowl round the neck, soft boots with three copper claws.
 lince(w,m,hw,hm){const {M,D,A,K,W,N,X}=PAL;
  ring(w,m.neck,m.ny(1.455),m.ny(1.56),.014,.014,D,COLLAR,{ns:4,na:22,bevel:.014,bulge:.007});
  for(const S of ['Left','Right']){const s=side(S),c=s*90,sh=m[S+'shinS'],th=m[S+'thigh'],fo=m[S+'foreS'],leg=LIMB(S,'Leg'),kn=LIMB(S,'(UpLeg|Leg)'),up=LIMB(S,'UpLeg'),fore=LIMB(S,'ForeArm'),bt=LIMB(S,'(Leg|Foot)');
   // a soft gaiter bound by three bands: it sits inside the trouser's envelope (the suit is tucked under it), so the shin reads bound and lean
   ring(w,sh,.22,.82,-.004,.006,D,leg,{ns:9,na:16,bevel:.006,sag:(u,v)=>.013*(1-sstep(0,.2,v))});for(const q of [.34,.52,.7])ring(w,sh,q,q+.016,.0015,.0035,A,leg,{ns:1,na:16,bevel:.0015});
   w.place(rbox(.022,.03,.008,.003),sh,c,.5225,.001,A,leg,{depth:.008});
   w.panel(sh,{s0:-.14,s1:.15,aL:q=>-56+12*sstep(.04,.15,q),aR:q=>56-12*sstep(.04,.15,q),off:.007,th:.012,edge:.004,ns:6,na:8,bevel:.016,bulge:.005},D,kn);
   // a claw mark: three copper slashes let into the pad
   [[-17,-.07,.05],[0,-.1,.08],[17,-.07,.05]].forEach(([a,q0,q1])=>w.panel(sh,{s0:q0,s1:q1,aL:a-4.5,aR:a+4.5,off:.0195,th:.004,edge:.001,ns:4,na:1,bevel:.003},A,kn));
   for(const q of [-.1,.1])w.panel(sh,{s0:q,s1:q+.03,aL:56,aR:304,off:.004,th:.004,edge:.001,ns:1,na:12,bevel:.0015},W,kn);
   ring(w,fo,.56,.86,.0,.005,D,fore,{ns:4,na:14,bevel:.005});for(const q of [.6,.76])ring(w,fo,q,q+.05,.004,.004,W,fore,{ns:1,na:14,bevel:.002});
   if(s>0){w.place(rbox(.04,.19,.02,.006),th,c,.47,.006,K,up,{depth:.02});w.place(rbox(.026,.075,.02,.008),th,c,.2,.008,W,up,{depth:.02});w.place(rbox(.034,.014,.026,.004),th,c,.29,.006,A,up,{depth:.026});w.place(cylinder(.011,.02,8).rotateX(Math.PI/2),th,c,.115,.008,A,up,{depth:.02});
    for(const q of [.34,.62])ring(w,th,q,q+.045,.004,.004,W,up,{ns:1,na:18,bevel:.002});}
   else{w.place(rbox(.085,.1,.034,.012),th,c,.34,.006,D,up,{depth:.034});w.place(rbox(.09,.04,.008,.003),th,c,.27,.04,N,up,{depth:.008});w.place(cylinder(.007,.005,8).rotateX(Math.PI/2),th,c,.3,.048,A,up,{depth:.005});ring(w,th,.3,.345,.004,.004,W,up,{ns:1,na:18,bevel:.002});}
   ring(hw,hm[S+'ankle'],.74,.9,.003,.007,D,bt,{ns:2,na:14,bevel:.005,bulge:.002});
   const ft=hm[S+'foot'],foot=LIMB(S,'(Foot|ToeBase|Toe_End)');if(ft){
    hw.panel(ft,{s0:.62,s1:.99,aL:-104,aR:104,off:.003,th:.006,edge:.002,ns:4,na:9,bevel:.01,bulge:.002},D,foot);toeNose(hw,ft,D,foot,[.064,.048,.046],.03);
    for(const a of [-44,0,44])spike(hw,ft,a,.985,.002,.011,.042,5,A,foot,{lean:a?66:78,yaw:a*.35});
    for(const q of [.3,.44])hw.panel(ft,{s0:q,s1:q+.07,aL:-102,aR:102,off:.005,th:.004,edge:.0015,ns:1,na:10,bevel:.002},q>.35?W:D,foot);}
   const hd=hm[S+'hand'];if(hd)for(const a of [-36,-12,12,36])spike(hw,hd,c+a,.97,.006,.006,.034,5,A,LIMB(S,'Hand'),{lean:-62});}
  gauntlets(hw,hm,{plate:D,bar:K,cuff:W,trim:A});
 }
};
// V55: the upper body of the five whole bodies. Each has its own chest, collar, back and upper-arm pieces (same technique as the
// V54 kit: panels that follow the skeleton and rigid pieces on a bone, in the same mesh). tools/check_operators.mjs measures the
// trunk on three rings (hips, waist, chest: BANDS, metres) and the upper arm at its middle, by percentiles of the vertices there:
// a torso panel that crosses a ring is cut at the ring's edges and bridges it with one span (tpanel), so it adds no vertex inside;
// rigid pieces stay clear of the rings; the mass goes to the collar, the shoulder blades, the belly and the ends of the upper arm.
const BANDS=[[.972,1.0225],[1.2375,1.2865],[1.3315,1.3805]];
function tpanel(w,m,ya,yb,o,pal,allow=TORSO){const cuts=[ya,yb];for(const b of BANDS)for(const v of b)if(v>ya+.004&&v<yb-.004)cuts.push(v);cuts.sort((a,b)=>a-b);
 const f=v=>typeof v==='function'?q=>v(.84+.8*q):v;
 for(let i=0;i<cuts.length-1;i++){const a=cuts[i],b=cuts[i+1],mid=(a+b)/2,bridge=BANDS.some(([b0,b1])=>mid>b0&&mid<b1),th=o.th??.012;
  const g=w.panel(m.torso,{...o,s0:m.y(a),s1:m.y(b),aL:f(o.aL),aR:f(o.aR),ns:bridge?1:Math.max(2,Math.round((o.ns??8)*(b-a)/(yb-ya))),...(bridge?{edge:th}:{})},pal,allow);
  // a bridge has no inner row: give its top the rim distance of a panel's inside, or the whole span reads as a worn edge
  if(bridge){const E=g.attributes.wearEdge,Rm=g.attributes.wearRim,n=E.count/2;for(let i=0;i<n;i++){const u=Rm.getX(i);E.setX(i,Math.min(u,.012));Rm.setY(i,.012);}}}}
// The highest point of the body near (x,z), under the helmet: where a piece stands on the shoulders.
const crest=(w,x,z,r=.022)=>{const p=w.body.pos;let y=-9;for(let i=0;i<p.length;i+=3)if(Math.abs(p[i]-x)<r&&Math.abs(p[i+2]-z)<r&&p[i+1]<1.58)y=Math.max(y,p[i+1]);return y>0?y:1.5;};
// A rigid piece at a place of the body (metres: +x the left, +y up, +z the front), tilted about x then z.
const put=(w,g,x,y,z,pal,allow,rx=0,rz=0)=>w.push(g.rotateX(rx).rotateZ(rz).translate(x,y,z),pal,allow);
// A flat leaf standing up (feather, blade): `len` long and `wid` wide, its root at the origin, facing the front.
const leaf=(len,wid,th=.006)=>{const sh=new T.Shape();sh.moveTo(0,0);sh.quadraticCurveTo(wid*.9,len*.3,wid*.28,len*.82);sh.lineTo(0,len);sh.lineTo(-wid*.28,len*.82);sh.quadraticCurveTo(-wid*.9,len*.3,0,0);
 const g=new T.ExtrudeGeometry(sh,{depth:th,bevelEnabled:true,bevelThickness:th*.3,bevelSize:th*.3,bevelSegments:1,curveSegments:5});g.deleteAttribute('uv');g.translate(0,0,-th/2);return g;};
const plumeW=(q0,q1,half)=>q=>half*(.55+.45*sstep(q0,q0+(q1-q0)*.3,q))*(1-.92*sstep(q0+(q1-q0)*.5,q1,q));
const plume=(w,map,c,q0,q1,half,off,th,pal,allow,k=.005,quill=PAL.A)=>{const hw=plumeW(q0,q1,half);
 w.panel(map,{s0:q0,s1:q1,aL:q=>c-hw(q)-1.2,aR:q=>c+hw(q)+1.2,off,th,edge:.0015,ns:8,na:6,bevel:.006,sag:keel(k)},pal,allow);
 w.panel(map,{s0:q0+(q1-q0)*.06,s1:q1-(q1-q0)*.1,aL:c-1.6,aR:c+1.6,off:off+th+k-.0005,th:.002,edge:.001,ns:6,na:1,bevel:.001},quill,allow);};
// A feather on the trunk, its root at `top` and its tip at `bot` (metres).
const tplume=(w,m,c,top,bot,half,off,th,pal,allow=TORSO,k=.005,quill=PAL.A)=>{const hw=plumeW(top,bot,half);
 tpanel(w,m,bot,top,{aL:v=>c-hw(v)-1.2,aR:v=>c+hw(v)+1.2,off,th,edge:.0015,ns:8,na:6,bevel:.006,sag:keel(k)},pal,allow);
 tpanel(w,m,bot+(top-bot)*.1,top-(top-bot)*.06,{aL:c-1.6,aR:c+1.6,off:off+th+k-.0005,th:.002,edge:.001,ns:6,na:1,bevel:.001},quill,allow);};
const ARM=S=>new RegExp('^'+S+'(Shoulder|Arm)$');
const UPPER_WEAR={
 // SAETTA: a dart. A white breastplate in lames that comes to a point over the belly, yellow along its edges and its keel; a raised
 // aero collar behind the neck with a swept winglet each side; fairings on the shoulder blades over three yellow gills; a spine pod;
 // slim white rerebraces with a racing stripe.
 saetta(w,m){const {M:H,A,K}=PAL,t=m.torso,y=m.y,n=m.neck,ny=m.ny,y0=1.06,y1=1.236,hw=v=>3+38*Math.pow(clamp((v-y0)/(y1-y0),0,1),1.2);
  w.panel(t,{s0:y(y0),s1:y(y1),aL:q=>-hw(.84+.8*q),aR:q=>hw(.84+.8*q),off:.002,th:.008,edge:.002,ns:8,na:8,bevel:.012,sag:keel(.007)},H,TORSO);
  w.panel(t,{s0:y(1.075),s1:y(1.225),aL:-2,aR:2,off:.0165,th:.0025,edge:.001,ns:6,na:1,bevel:.0012},A,TORSO);
  for(const s of [1,-1]){w.panel(t,{s0:y(y0),s1:y(y1),aL:q=>s>0?hw(.84+.8*q)+.5:-hw(.84+.8*q)-4.5,aR:q=>s>0?hw(.84+.8*q)+4.5:-hw(.84+.8*q)-.5,off:.004,th:.004,edge:.001,ns:8,na:1,bevel:.0015},A,TORSO);
   for(let i=0;i<3;i++)w.panel(t,{s0:y(1.085+i*.036),s1:y(1.103+i*.036),aL:s*(56+i*5)-12,aR:s*(56+i*5)+12,off:.003,th:.005,edge:.001,ns:1,na:5,bevel:.002},i===1?A:H,TORSO);
   // shoulder-blade fairing and its gills
   w.panel(t,{s0:y(1.39),s1:y(1.478),aL:q=>180+s*32-22*(1-.7*sstep(y(1.42),y(1.478),q)),aR:q=>180+s*32+22*(1-.7*sstep(y(1.42),y(1.478),q)),off:.002,th:.008,edge:.002,ns:5,na:6,bevel:.01,sag:keel(.006)},H,CHEST);
   for(let i=0;i<3;i++)w.panel(t,{s0:y(1.289+i*.015),s1:y(1.298+i*.015),aL:180+s*32-16+i*3,aR:180+s*32+16-i*3,off:-.001,th:.004,edge:.001,ns:1,na:4,bevel:.0015},A,TORSO);
   fin(w,n,s*98,ny(1.5),.03,[[-.05,0],[.036,0],[.086,.03],[.112,.074],[.056,.038],[.0,.022]],.008,A,COLLAR);}
  // spine pod
  w.panel(t,{s0:y(1.06),s1:y(1.235),aL:172,aR:188,off:-.003,th:.008,edge:.002,ns:6,na:3,bevel:.008,sag:keel(.006)},H,TORSO);
  for(const a of [170.5,189.5])w.panel(t,{s0:y(1.07),s1:y(1.225),aL:a-1.2,aR:a+1.2,off:-.001,th:.004,edge:.001,ns:5,na:1,bevel:.0015},A,TORSO);
  // collar: low in front, raised behind the neck
  w.panel(n,{s0:ny(1.47),s1:ny(1.575),aL:108,aR:252,off:.016,th:.01,edge:.003,ns:5,na:10,bevel:.012,sag:(u,v)=>.022*v*v},H,COLLAR);
  w.panel(n,{s0:ny(1.563),s1:ny(1.577),aL:110,aR:250,off:.0485,th:.003,edge:.001,ns:1,na:10,bevel:.0015},A,COLLAR);
  for(const S of ['Left','Right']){const c=side(S)*90,ar=m[S+'armS'];
   w.panel(ar,{s0:.3,s1:.74,aL:q=>c-60+16*sstep(.45,.74,q),aR:q=>c+60-16*sstep(.45,.74,q),off:-.002,th:.007,edge:.002,ns:7,na:8,bevel:.01,sag:keel(.004)},H,ARM(S));
   w.panel(ar,{s0:.33,s1:.71,aL:c-3,aR:c+3,off:.0085,th:.0025,edge:.001,ns:5,na:1,bevel:.0012},A,ARM(S));}
 },
 // ONICE: cut stone. Two keeled black pectoral facets either side of the violet sternum lozenge, a column of violet gems down the
 // belly, flank facets, two crystals rising either side of the neck, facets on the
 // shoulder blades, a keeled rerebrace with a violet ridge.
 onice(w,m){const {H,A}=PAL,t=m.torso,y=m.y,n=m.neck,ny=m.ny;
  const loz=(map,c,q0,q1,half,off,th,pal,allow,k=.008)=>w.panel(map,{s0:q0,s1:q1,aL:q=>c-half*(1-Math.abs(2*(q-q0)/(q1-q0)-1))-1.5,aR:q=>c+half*(1-Math.abs(2*(q-q0)/(q1-q0)-1))+1.5,off,th,edge:.002,ns:8,na:5,bevel:.006,sag:keel(k)},pal,allow);
  loz(t,0,y(1.112),y(1.19),17,.002,.006,A,TORSO,.009);loz(t,0,y(1.055),y(1.105),11,.002,.005,A,TORSO,.007);
  for(const s of [1,-1]){
   w.panel(t,{s0:y(1.385),s1:y(1.47),aL:s>0?9:-60,aR:s>0?60:-9,off:.001,th:.007,edge:.002,ns:4,na:7,bevel:.008,sag:keel(.011)},H,CHEST);
   w.panel(t,{s0:y(1.379),s1:y(1.388),aL:s>0?9:-60,aR:s>0?60:-9,off:.002,th:.004,edge:.001,ns:1,na:7,bevel:.0015},A,CHEST);
   loz(t,s*50,y(1.065),y(1.235),15,.001,.006,H,TORSO,.009);w.panel(t,{s0:y(1.085),s1:y(1.215),aL:s*50-1.6,aR:s*50+1.6,off:.0155,th:.0025,edge:.001,ns:5,na:1,bevel:.0012},A,TORSO);
   w.panel(t,{s0:y(1.385),s1:y(1.478),aL:180+s*36-22,aR:180+s*36+22,off:.002,th:.007,edge:.002,ns:4,na:6,bevel:.008,sag:keel(.011)},H,CHEST);
   w.panel(t,{s0:y(1.379),s1:y(1.388),aL:180+s*36-22,aR:180+s*36+22,off:.003,th:.004,edge:.001,ns:1,na:6,bevel:.0015},A,CHEST);
   put(w,facet(.02,.105,5).translate(0,.0525,0),s*.082,crest(w,s*.082,-.04)-.014,-.04,A,COLLAR,-.12,-s*.3);put(w,facet(.015,.07,5).translate(0,.035,0),s*.112,crest(w,s*.112,-.058)-.012,-.058,A,COLLAR,-.3,-s*.62);}
  loz(t,180,y(1.07),y(1.225),20,.002,.006,A,TORSO,.009);
  for(const S of ['Left','Right']){const c=side(S)*90,ar=m[S+'armS'];
   w.panel(ar,{s0:.3,s1:.74,aL:q=>c-62+18*sstep(.45,.74,q),aR:q=>c+62-18*sstep(.45,.74,q),off:-.006,th:.006,edge:.002,ns:7,na:6,bevel:.008,sag:keel(.009)},H,ARM(S));
   w.panel(ar,{s0:.33,s1:.71,aL:c-2.5,aR:c+2.5,off:.0085,th:.0025,edge:.001,ns:5,na:1,bevel:.0012},A,ARM(S));}
 },
 // ASTORE: rescue gear. An inflatable collar on the shoulders,
 // a rescue pouch on the belly, a beacon standing on the left shoulder, a pen pocket on the left
 // arm, reflective bands and rubber elbow pads.
 astore(w,m){const {M,A,K,B,W,I}=PAL,t=m.torso,y=m.y,n=m.neck,ny=m.ny;
  // the inflatable collar: a fat ring on the shoulders, under the helmet's steel ring, with two dark seams
  {const cy=crest(w,0,-.11,.03)-.018;put(w,new T.TorusGeometry(.112,.034,8,20).rotateX(Math.PI/2).scale(1,.8,1.05),0,cy,-.03,M,COLLAR);
   for(const a of [.5,-.5])put(w,new T.TorusGeometry(.036,.004,4,12).rotateY(Math.PI/2).scale(1,.8,1),0,0,0,K,COLLAR,0,0).applyMatrix4(new T.Matrix4().makeRotationY(a).setPosition(Math.sin(a)*.112,cy,-.03+Math.cos(a)*.118));}
  // belly pouch, its flap and two steel buckles
  w.place(rbox(.17,.085,.036,.012),t,0,y(1.162),-.008,M,TORSO,{depth:.036});w.place(rbox(.176,.034,.008,.003),t,0,y(1.19),.03,K,TORSO,{depth:.008});
  for(const x of [-.045,.045])w.place(rbox(.018,.024,.008,.003).translate(x,0,0),t,0,y(1.178),.038,A,TORSO,{depth:.008});
  // beacon on the left shoulder
  {const by=crest(w,.15,-.05)+.02;put(w,cylinder(.014,.06,10),.15,by,-.05,K,COLLAR);put(w,cylinder(.012,.016,10),.15,by+.038,-.05,I,COLLAR);}
  for(const S of ['Left','Right']){const s=side(S),c=s*90,ar=m[S+'armS'],arm=ARM(S);
   ring(w,ar,.6,.66,-.0045,.004,W,arm,{ns:1,na:14,bevel:.002});
   w.panel(ar,{s0:.8,s1:1.1,aL:180-52,aR:180+52,off:.004,th:.01,edge:.003,ns:4,na:6,bevel:.012,bulge:.003},B,new RegExp('^'+S+'(Arm|ForeArm)$'));
   if(s>0){w.place(rbox(.058,.08,.012,.004),ar,c,.44,-.013,M,arm,{depth:.012});w.place(rbox(.062,.026,.005,.002),ar,c,.36,.0,K,arm,{depth:.005});
    for(const x of [-.012,.008])w.place(cylinder(.0045,.05,6).translate(x,0,0),ar,c,.4,.002,A,arm,{depth:.009});}}
 },
 // CORVO: plumage. A gorget of five short feathers over the upper chest, two more on the belly beside a gold talon, a standing collar
 // open at the throat that flares behind the head, three hackle feathers fanned either side of the neck, two overlapping feathers down each upper arm.
 corvo(w,m){const {H,A}=PAL,t=m.torso,y=m.y,n=m.neck,ny=m.ny;
  for(const [a,top,half,off] of [[-56,1.462,13,.001],[56,1.462,13,.001],[-29,1.468,14,.003],[29,1.468,14,.003],[0,1.474,15,.005]])plume(w,t,a,y(top),y(1.384),half,off,.005,H,CHEST,.005);
  for(const s of [1,-1])tplume(w,m,s*24,1.228,1.06,15,-.004,.005,H);
  spike(w,t,0,y(1.19),.002,.015,.06,4,A,TORSO,{lean:80,rot:45});
  w.panel(n,{s0:ny(1.47),s1:ny(1.575),aL:48,aR:312,off:.014,th:.008,edge:.002,ns:5,na:14,bevel:.008,sag:(u,v)=>.03*v*v},H,COLLAR);
  w.panel(n,{s0:ny(1.563),s1:ny(1.577),aL:50,aR:310,off:.0525,th:.003,edge:.001,ns:1,na:14,bevel:.0015},A,COLLAR);
  // hackles: three feathers fanned on each side of the neck
  for(const s of [1,-1])[[.066,.115,.22],[.092,.1,.52],[.118,.085,.84]].forEach(([x,len,tilt],i)=>{const by=crest(w,s*x,-.05)-.014;put(w,leaf(len,.034),s*x,by,-.05-i*.006,H,COLLAR,-.16,-s*tilt);put(w,leaf(len*.5,.008,.003),s*x,by,-.05-i*.006+.005,A,COLLAR,-.16,-s*tilt).translate(0,0,0);});
  for(const S of ['Left','Right']){const c=side(S)*90,ar=m[S+'armS'];
   plume(w,ar,c,.26,.82,56,-.011,.005,H,ARM(S),.005);plume(w,ar,c,-.04,.42,60,-.002,.005,H,ARM(S),.005);}
 },
 // LINCE: a hunter's kit. A bandolier from the left shoulder to the right hip with three copper cartridges and a pouch, the hood's
 // tail down the back edged in copper, a blade on the back with its grip over the right shoulder, a bedroll strapped behind the belt, bound
 // upper arms with a copper armlet and its fang.
 lince(w,m){const {D,A,K,W,N}=PAL,t=m.torso,y=m.y;
  w.strap(t,[[60,y(1.46)],[32,y(1.39)],[0,y(1.3)],[-36,y(1.205)],[-78,y(1.13)],[-125,y(1.155)],[-178,y(1.27)],[-222,y(1.395)],[-262,y(1.46)]].map(p=>[...p,.001]),.045,.004,.001,W,TORSO,44);
  w.place(rbox(.044,.052,.02,.006),t,-42,y(1.193),.006,D,TORSO,{depth:.02,rot:-40});w.place(cylinder(.006,.005,8).rotateX(Math.PI/2),t,-42,y(1.193),.026,A,TORSO,{depth:.005});
  [[9,1.32],[-2,1.302]].forEach(([a,h])=>w.place(cylinder(.0075,.024,8),t,a,y(h),.005,A,TORSO,{depth:.015,rot:-40}));
  tpanel(w,m,1.3,1.5,{aL:v=>180-(4+30*sstep(1.3,1.5,v)),aR:v=>180+(4+30*sstep(1.3,1.5,v)),off:.003,th:.01,edge:.003,ns:8,na:6,bevel:.014,sag:keel(.006)},D,CHEST);
  for(const s of [1,-1])tpanel(w,m,1.3,1.5,{aL:v=>180+s*(4+30*sstep(1.3,1.5,v))-1.3,aR:v=>180+s*(4+30*sstep(1.3,1.5,v))+1.3,off:.011,th:.003,edge:.001,ns:8,na:1,bevel:.0012},A,CHEST);
  w.place(cylinder(.0085,.02,8),t,180,y(1.31),.012,A,TORSO,{depth:.017});
  // a blade carried on the back, its grip over the right shoulder
  {const by=crest(w,-.095,-.09),p=w.body.pos;let bz=0;for(let i=0;i<p.length;i+=3)if(Math.abs(p[i]+.07)<.03&&Math.abs(p[i+1]-by+.08)<.03)bz=Math.min(bz,p[i+2]);bz-=.01;
   put(w,rbox(.03,.3,.014,.004),-.079,by-.07,bz,K,CHEST,0,.3);put(w,rbox(.024,.095,.022,.006),-.129,by+.097,bz,D,COLLAR,0,.3);put(w,rbox(.054,.013,.026,.004),-.114,by+.05,bz,A,COLLAR,0,.3);put(w,facet(.015,.028,5).translate(0,.014,0),-.143,by+.143,bz,A,COLLAR,0,.3);}
  w.place(cylinder(.038,.33,12).rotateZ(Math.PI/2),t,180,y(1.125),-.006,N,WAIST,{depth:.076});
  for(const x of [-.09,.09])w.place(new T.TorusGeometry(.0395,.0055,6,14).rotateY(Math.PI/2).translate(x,0,0),t,180,y(1.125),-.006,W,WAIST,{depth:.076});
  for(const S of ['Left','Right']){const c=side(S)*90,ar=m[S+'armS'],arm=ARM(S);
   for(const q of [.38,.5,.62])ring(w,ar,q,q+.05,.0,.004,W,arm,{ns:1,na:12,bevel:.002});
   ring(w,ar,.2,.255,.001,.005,A,arm,{ns:1,na:12,bevel:.002});spike(w,ar,c,.225,.006,.009,.042,5,A,arm,{lean:72});}
 }
};
// The maps the hands and feet need, read on the soldier's own suit (the bodies carry his gloves and boots).
function handFeetMaps(b){const a=b.at,m={};for(const S of ['Left','Right']){if(a[S+'HandMiddle1']){m[S+'hand']=b.cyl(a[S+'Hand'],a[S+'HandMiddle1'],new RegExp('^'+S+'Hand$'),{na:40,ns:14,s0:-.1,s1:1.15,passes:6,tol:.0015});m[S+'finger']=b.cyl(a[S+'HandMiddle1'],a[S+'HandMiddle2'],new RegExp('^'+S+'Hand(Index|Middle|Ring|Pinky)1$'),{na:40,ns:10,s0:-.2,s1:1.2,passes:6,tol:.0015});}
  m[S+'fore']=b.cyl(a[S+'ForeArm'],a[S+'Hand'],new RegExp('^'+S+'ForeArm$'),{passes:3,tol:.006,s0:-.05,s1:1.02});m[S+'foot']=footMap(b,S);
  // the boot's shaft (the bodies' own lower leg is hidden inside the soldier's boot there): ankle cuffs, rings, winglets
  m[S+'ankle']=b.cyl(a[S+'Leg'],a[S+'Foot'],new RegExp('^'+S+'Leg$'),{passes:8,tol:.004,s0:.55,s1:1.0,ns:18});}return m;}
export const BODY_KITS=new Set(Object.keys(BODY_WEAR));
const bodyKits=new Map();
// One whole body's kit: its wear on the body's own suit (bodyGeo, shaped per operator), its hand and foot pieces and the gloves
// and boots cut from the soldier's suit (suitGeo): `part(dominant bone, y)` picks their triangles. lite: phones (60% of the mesh density).
// userData.tuck: the body suit's tuck weights (it sinks 16 mm under every panel).
export function bodyKitGeometry(kit,skin,suitGeo,bodyGeo,part,lite=false,others=[]){
 if(!BODY_WEAR[kit]||!bodyGeo)return null;const key=kit+':'+suitGeo.uuid+':'+bodyGeo.uuid+(lite?':l':'');if(bodyKits.has(key))return bodyKits.get(key);
 let out=null;
 try{const bb=new Body(skin,bodyGeo,null),hb=new Body(skin,suitGeo,null),q=lite?.62:1,w=new Wear(bb,q),hw=new Wear(hb,q);BODY_WEAR[kit](w,maps(bb),hw,handFeetMaps(hb));
  // V55: the upper body's own pieces, laid on the suit and the body's other shells together (`others`: the helmet's yoke and collar
  // cover the suit's upper chest); if they fail to build, the kit stays as it was.
  let gu=null;try{if(UPPER_WEAR[kit]){const ub=new Body(skin,bodyGeo,others),uw=new Wear(ub,q),mu=maps(ub);
    mu.neck=ub.cyl(new T.Vector3(0,1.46,-.03),new T.Vector3(0,1.6,-.026),/^Neck$/,{s0:0,s1:1,na:48,ns:14,passes:6,tol:.006});mu.ny=y=>(y-1.46)/.14;
    UPPER_WEAR[kit](uw,mu);gu=uw.build();}}catch(e){console.error('Busto non costruito',kit,e);gu=null;}
  const gw=w.build(),gh=hw.pieces.length?hw.build():null;
  // gloves and boots: the suit's own vertices that the cut keeps, in the wear's layout
  const names=hb.names,I=suitGeo.attributes.skinIndex,W=suitGeo.attributes.skinWeight,P=suitGeo.attributes.position,N=suitGeo.attributes.normal,UV=suitGeo.attributes.uv,ok=new Uint8Array(P.count);
  for(let i=0;i<ok.length;i++){let b=0,bw=-1;for(let c=0;c<4;c++){const x=W.getComponent(i,c);if(x>bw){bw=x;b=I.getComponent(i,c);}}ok[i]=part(names[b],P.getY(i)/U)?1:0;}
  const src=suitGeo.index.array,remap=new Int32Array(P.count).fill(-1),idx=[];let n=0;for(let k=0;k<src.length;k+=3){if(!(ok[src[k]]&&ok[src[k+1]]&&ok[src[k+2]]))continue;for(let j=0;j<3;j++){const v=src[k+j];if(remap[v]<0)remap[v]=n++;idx.push(remap[v]);}}
  const tone=fingerTone(names,I,W,P.count).array,pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2),ed=new Float32Array(n).fill(-1),rim=new Float32Array(n*4),si=new Uint16Array(n*4),sw=new Float32Array(n*4),pa=new Float32Array(n).fill(PAL.B);
  for(let v=0;v<P.count;v++){const o=remap[v];if(o<0)continue;pos.set([P.getX(v),P.getY(v),P.getZ(v)],o*3);nor.set([N.getX(v),N.getY(v),N.getZ(v)],o*3);uv.set([UV.getX(v),UV.getY(v)],o*2);rim[o*4]=tone[v];rim[o*4+1]=1;for(let c=0;c<4;c++){si[o*4+c]=I.getComponent(v,c);sw[o*4+c]=W.getComponent(v,c);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('wearUv',new T.BufferAttribute(uv,2));g.setAttribute('wearEdge',new T.BufferAttribute(ed,1));g.setAttribute('wearRim',new T.BufferAttribute(rim,4));
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.BufferAttribute(sw,4));g.setAttribute('wearPal',new T.BufferAttribute(pa,1));g.setIndex(idx);
  if(gu){const a=gw.userData.tuck,b=gu.userData.tuck;for(let i=0;i<a.length;i++)a[i]=Math.max(a[i],b[i]);}
  out=mergeGeometries([gw,...(gu?[gu]:[]),...(gh?[gh]:[]),g],false);if(out){out.boundingBox=suitGeo.boundingBox;out.boundingSphere=suitGeo.boundingSphere;out.userData.tuck=gw.userData.tuck;out.userData.tris=out.index.count/3;}
  gw.dispose();gu?.dispose();gh?.dispose();g.dispose();
 }catch(e){console.error('Corredo non costruito',kit,e);out=null;}
 bodyKits.set(key,out);return out;}
// Its look: the wear's palette (wearLook) and, on the glove and boot leather, the suit's photographed texture dyed in the kit's
// own glove and boot colours (SIGNATURE[kit].glove, .boot), each finger a shade apart.
const bodyKitLooks=new Map();
export function bodyKitLook(suitMat,team,accent,kit,tw=''){const key=suitMat.uuid+':'+team+':'+accent+':'+kit+':'+tw;if(bodyKitLooks.has(key))return bodyKitLooks.get(key);
 const base=wearLook(team,accent,kit,tw),sig=signatureOf(kit,tw)||{},m=base.clone();m.name='op-kit';m.userData.teamLook=true;m.userData.wear=true;m.defines={...base.defines};
 const u={kitMap:{value:suitMat.map},kitGlove:{value:new T.Color(sig.glove||'#7c7b7a')},kitBoot:{value:new T.Color(sig.boot||'#4a4947')}};
 m.onBeforeCompile=s=>{base.onBeforeCompile(s);Object.assign(s.uniforms,u);
  s.fragmentShader='uniform sampler2D kitMap;uniform vec3 kitGlove;uniform vec3 kitBoot;\n'+s.fragmentShader.replace('#include <roughnessmap_fragment>',`if(vWearEdge<-.5){vec3 kt=texture2D(kitMap,vWearUv).rgb;float kv=clamp(dot(kt,vec3(.2126,.7152,.0722)),0.,1.),kh=smoothstep(.3,.34,vPrimeP.y);
 diffuseColor.rgb=mix(kitBoot*(.6+1.1*kv),kitGlove*(.35+2.1*kv)*(1.+(vWearRim.x-1.)*2.2),kh);odRf=mix(.5,.6,kh);odRo=0.;odMe=0.;odN=vec2(0.);primeV=vec3(0.);}
#include <roughnessmap_fragment>`);};
 m.customProgramCacheKey=()=>'operator-kit-v54';bodyKitLooks.set(key,m);return m;}
