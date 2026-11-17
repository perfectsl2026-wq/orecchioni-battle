// V35 operators, V37 third-party gear. Every player picks a kit (silhouette and gear), an
// accent colour and a few toggles; bots get varied kits. The body, its team tint and the
// rig never change. The gear is third-party (Sketchfab CC-BY models, credits in
// assets/CREDITS.md) and fitted around the skeleton's own anchors (head, chest, shoulders)
// in the rest pose; the team's cloth tags and accent trims stay procedural so friend or foe
// reads at a glance: the team tint owns the body, the accent only the trims.
// Materials are shared per team and accent (V34 batching) and per model, never per operator.
import {cleanTint} from './smoke-rules.js?v=42.0';
import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {PAINTS} from './weapon-finish.js?v=42.0';
import {gearDetail} from './operator-detail.js?v=42.0';
// V44 GIRO 1: eight operators. ASSALTO, SFONDAMENTO and (V44 op2) MASTINO keep the soldier's body with their own cut
// (operator-wear.js); the other five are whole bodies from CC BY 4.0 models (BODIES below, assets/CREDITS.md) drawn on the operator's own skeleton,
// at the same head height and with the same hit zones (combat-rules.js never reads the body). RICOGNIZIONE, TIRATORE,
// CORAZZA and BOREA went to archivio/v44-operatori/ (code and models); an old saved or received id becomes the nearest kit.
export const KITS=[
 {id:'assalto',name:'ASSALTO',tag:'LINEA',toggles:{visor:null,mask:null,pack:'Zaino d’assalto'},desc:'Entra per primo. Ardesia laccata con inserti senape: la guardia sul braccio che apre la porta, le ginocchiere, una fascia che scende dal fianco; maschera facciale sempre su. Il braccio destro resta libero per sparare.'},
 {id:'sfondamento',name:'SFONDAMENTO',tag:'PESANTE',toggles:{visor:null,mask:null,pack:'Zaino largo'},desc:'Il muro che avanza. Tela oliva e gomma nera, respiratore a doppio filtro, una grande piastra sul petto e un colletto alto che protegge la nuca. Si pianta e non arretra.'},
 {id:'mastino',name:'MASTINO',tag:'ASSALTO',toggles:{},desc:'Fanteria corazzata. Piastre in acciaio spazzolato con bande lime acido, due sfiati sulla schiena, casco chiuso. Sta largo, ben piantato.'},
 {id:'saetta',name:'SAETTA',tag:'RICOGNIZIONE',toggles:{},desc:'Corre davanti a tutti. Bianco laccato e giallo elettrico, casco aerodinamico con la pinna. Leggero e scattante anche da fermo.'},
 {id:'onice',name:'ONICE',tag:'PESANTE',toggles:{},desc:'Una tuta nera laccata con le nervature viola, spallacci angolari e il casco con il visore a fessura. Immobile, ti fissa.'},
 {id:'astore',name:'ASTORE',tag:'SUPPORTO',toggles:{},desc:'Pilota di soccorso. Tuta oro ambra, casco argento, zaino di soccorso con il verricello. Rilassato, il fucile basso.'},
 {id:'corvo',name:'CORVO',tag:'TIRATORE',toggles:{},desc:'Tiratore. Blu notte satinato e oro, mezza mantella a pieghe che si apre quando corre, visiera scura. Sempre di tre quarti.'},
 {id:'lince',name:'LINCE',tag:'INCURSORE',toggles:{},desc:'Incursore silenzioso. Tela verde bosco e rame, cappuccio scuro con due orecchie sul casco e la fessura per gli occhi. Basso, raccolto, pronto a scattare.'}
];
// The five whole bodies: file (phones load the copy under assets/mobile/), how much of the team dye the "_Team" parts take (mix,
// default 1). V44 op3: each one IS the soldier's body (the ASSALTO/SFONDAMENTO build, his skin weights): the operator's own model is
// baked onto his suit as colour, surface relief, glow and team mask (art/source/v44/agenti/build/bake.py) and only its helmet stays
// its own geometry, rigid on the head; so shoulders, chest, arms, hips, legs and feet are his, measured equal by tools/check_operators.mjs.
// detail (V44 op6b, SAETTA and LINCE): the team dye follows the texture's brightness more steeply (lum^.75 instead of its square
// root, same mean), so seams and stitching still read at game distance; 0 or absent: as before.
// gloves and boots: the soldier's own (fingers closed on the weapon), cut from his suit in the game (assets.js skinPart).
// V47 `shape`: each whole body has its own build inside the fairness band of tools/check_operators.mjs (within 12% of the soldier's
// everywhere; the hit zones are his and do not change): SAETTA lean, ONICE narrow-waisted, ASTORE heavy, CORVO broad over a slim
// waist, LINCE with strong thighs and thin calves.
export const BODIES={
 saetta:{file:'./assets/models/v44/saetta.wasm',shape:{limb:{Arm:.90,ForeArm:.96,UpLeg:.91,Leg:.90},torso:{Hips:[.93,.94],Spine:[.92,.93],Spine1:[.90,.92],Spine2:[.95,.94],Neck:[.97,.97]}},gloves:1,boots:1,detail:1,lum:{suit:[.328,.0084],helmet:[.323,.0166]}},
 onice:{file:'./assets/models/v44/onice.wasm',shape:{limb:{Arm:.95,ForeArm:1,UpLeg:.95,Leg:.95},torso:{Hips:[.95,.95],Spine:[.92,.95],Spine1:[.90,.94],Spine2:[1,.98],Neck:[1,1]}},gloves:1,boots:1,lum:{suit:[.0103,.005]}},
 astore:{file:'./assets/models/v44/astore.wasm',shape:{limb:{Arm:1.09,ForeArm:1.16,UpLeg:1.10,Leg:1.10},torso:{Hips:[1.10,1.08],Spine:[1.10,1.09],Spine1:[1.10,1.10],Spine2:[.99,1.10],Neck:[1,1.05]}},gloves:1,boots:1,lum:{suit:[.0256,.0123],helmet:[.0272,.0137]}},
 corvo:{file:'./assets/models/v44/corvo.wasm',shape:{limb:{Arm:1.08,ForeArm:1.10,UpLeg:1.02,Leg:1},torso:{Hips:[.97,1],Spine:[.96,1],Spine1:[.95,1],Spine2:[1,1.06],Neck:[1,1.03]}},gloves:1,boots:1,lum:{suit:[.0296,.0222],helmet:[.0262,.0252]}},
 lince:{file:'./assets/models/v44/lince.wasm',shape:{limb:{Arm:.93,ForeArm:1.02,UpLeg:1.07,Leg:.91},torso:{Hips:[.96,.96],Spine:[.92,.93],Spine1:[.90,.91],Spine2:[.97,.92],Neck:[.97,.95]}},gloves:1,boots:1,detail:1,lum:{suit:[.292,.0127],helmet:[.3185,.0737]}}
};
// V46g `lum`: median linear luminance of each body texture's painted (alpha) and bare texels, [painted, bare], for the suit and the
// helmet atlas (measured on the shipped maps): the prime shading divides by it, so every body sits at its palette's true value and
// only keeps a soft share of the texture's baked light (the swirls that read as smeared plastic before).
// Ids of operators that are no longer offered: an old saved choice or an old peer's choice is dressed as the nearest kit.
export const RETIRED_KITS={ricognizione:'saetta',tiratore:'corvo',corazza:'onice',borea:'assalto'};
export const DEFAULT_OPERATOR={kit:'assalto',accent:'graphite',visor:0,mask:0,pack:0,smoke:0,glow:1};
export const kitFor=id=>KITS.find(k=>k.id===id)||null;
// V46: each operator wears its own signature palette instead of the team tint (multiplayer, training and bots alike),
// and the team reads from small cues: a band on the left upper arm and the light
// strips in the team's signal colour (blue, or red for the Razziatori). main: the large plates or cloth; dark: the undersuit;
// accent: the third colour (helmet or limb zones). [roughness, metalness] per role: gloss, satin cloth, metal trims.
// helmet: which role the helmet takes; zones: bind-space boxes [y0,y1,|x|0,|x|1] (metres) where the main plates turn accent.
// V46 Stage 2: on for everyone (multiplayer, training, bots); ?oppal=0 shows the old team-tinted look for comparison only.
export const PALETTE_ON=(()=>{try{return !(typeof location!=='undefined'&&new URLSearchParams(location.search).get('oppal')==='0');}catch(e){return true;}})();
export const TEAM_SIGNAL={blue:'#2a8cff',orange:'#ff2e2a'};
// V46g PRIME: every operator's built-in finish (no switch). Thin light strips in the team's signal colour (they carry the team,
// like the helmets' own strips) and accent inlays in the operator's own colour, each a crisp line drawn in the soldier's bind
// space (A pose, metres, +y up, +z the front, +x the left hand), so a line follows the body as it bends and lands on every body
// alike: the whole bodies (assets.js paletteBody) and the wear kits (operator-wear.js) share this code. A motif is the iso-line
// of a plane, a ring round a limb or a stripe along one; it is anti-aliased by its own screen derivative, so it stays one clean
// line at any distance and fades to its coverage when it gets thinner than a pixel, never crawling. An inlay sits in a fine dark
// groove (a panel seam) and is lacquered smoother than the panel round it; a motif can carry both: a light core inside an inlay.
// Per kit (SIGNATURE[kit].prime) only weights and widths change: all uniforms, one program for every kit and team.
export const PRIME_MOTIFS=['leg','arm','cuff','calf','thigh','chevron','waist','spine','collar','shoulder','knee','flank'];
export const PRIME_GLSL=`uniform vec4 primeL[3];uniform vec4 primeI[3];uniform vec4 primeW;uniform vec3 primeLight;uniform vec3 primeInlay;uniform vec4 primeFx;uniform vec4 primeFy;uniform float primeT;uniform float primeAmp;
float primeHalo=0.;
float primeK(float d,float w){float aa=fwidth(d)*.75+1e-6;return 1.-smoothstep(w-aa,w+aa,abs(d));}
float primeIn(float y,float a,float b){return smoothstep(a-.012,a+.012,y)*(1.-smoothstep(b-.012,b+.012,y));}
vec2 primeRing(vec3 p,vec3 a,vec3 b,float t,float r){vec3 n=b-a;float L=length(n);n/=L;float s=dot(p-a,n);return vec2(s-t*L,1.-smoothstep(r,r+.02,length(p-a-n*s)));}
vec2 primeStripe(vec3 p,vec3 a,vec3 b,vec3 sd,float t0,float t1,float r){vec3 n=b-a;float L=length(n);n/=L;float s=dot(p-a,n),f=s/L;vec3 q=p-a-n*s,u=normalize(sd-n*dot(sd,n)),v=cross(n,u);
 return vec2(dot(q,v),smoothstep(.0,.025,dot(q,u))*smoothstep(t0-.02,t0+.02,f)*(1.-smoothstep(t1-.02,t1+.02,f))*(1.-smoothstep(r,r+.02,length(q))));}
vec3 primeAcc(vec3 o,vec2 m,float l,float i){if(l+i<=0.)return o;float wl=primeW.x,wi=primeW.y,k=m.y;if(primeFy.y>0.)primeHalo+=l*k*exp(-m.x*m.x/.00026);
 return o+vec3(l*primeK(m.x,wl),i*primeK(m.x,wi),i*(primeK(m.x,wi+primeW.z)-primeK(m.x,wi)))*k;}
// x: light, y: inlay, z: groove round the inlay.
vec3 primeLines(vec3 P){vec3 p=vec3(abs(P.x),P.y,P.z),o=vec3(0.);primeHalo=0.;
 const vec3 HIP=vec3(.084,.94,0.),KNEE=vec3(.134,.505,-.012),ANK=vec3(.175,.128,-.076),SHO=vec3(.184,1.472,-.057),ELB=vec3(.352,1.21,-.016),WRI=vec3(.46,1.055,.07);
 if(primeL[0].x+primeI[0].x>0.)o=primeAcc(o,primeStripe(p,HIP,ANK,vec3(1.,0.,0.),.04,.84,.15),primeL[0].x,primeI[0].x);
 if(primeL[0].y+primeI[0].y>0.)o=primeAcc(o,primeStripe(p,SHO,WRI,vec3(.62,1.,.1),.08,.93,.11),primeL[0].y,primeI[0].y);
 if(primeL[0].z+primeI[0].z>0.)o=primeAcc(o,primeRing(p,ELB,WRI,.7,.09),primeL[0].z,primeI[0].z);
 if(primeL[0].w+primeI[0].w>0.)o=primeAcc(o,primeRing(p,KNEE,ANK,.6,.13),primeL[0].w,primeI[0].w);
 if(primeL[1].x+primeI[1].x>0.)o=primeAcc(o,primeRing(p,HIP,KNEE,.56,.16),primeL[1].x,primeI[1].x);
 if(primeL[1].y+primeI[1].y>0.)o=primeAcc(o,vec2(p.y-1.205-.8*p.x,primeIn(p.y,1.16,1.43)*(1.-smoothstep(.13,.16,p.x))*smoothstep(.0,.05,p.z)),primeL[1].y,primeI[1].y);
 if(primeL[1].z+primeI[1].z>0.)o=primeAcc(o,vec2(p.y-1.005,1.-smoothstep(.23,.26,p.x)),primeL[1].z,primeI[1].z);
 if(primeL[1].w+primeI[1].w>0.)o=primeAcc(o,vec2(p.x,primeIn(p.y,1.04,1.44)*smoothstep(.0,.05,-p.z)),primeL[1].w,primeI[1].w);
 if(primeL[2].x+primeI[2].x>0.)o=primeAcc(o,vec2(p.y-1.462,1.-smoothstep(.14,.17,p.x)),primeL[2].x,primeI[2].x);
 if(primeL[2].y+primeI[2].y>0.)o=primeAcc(o,primeRing(p,SHO,ELB,.24,.11),primeL[2].y,primeI[2].y);
 if(primeL[2].z+primeI[2].z>0.)o=primeAcc(o,primeRing(p,KNEE,ANK,.08,.13),primeL[2].z,primeI[2].z);
 if(primeL[2].w+primeI[2].w>0.)o=primeAcc(o,vec2(p.x-.162,primeIn(p.y,1.03,1.38)*(1.-smoothstep(.07,.1,abs(p.z)))),primeL[2].w,primeI[2].w);
 // Check Fable: a team armband on both upper arms for every kit, in the team's light (friend or enemy at a glance).
 // V52: the band is a designed light bar: a solid core between two hairlines in a dark housing, crisp at any distance (it was a
 // soft smear that washed out on the light suits); its spill on the sleeve is the halo, only up close.
 // The bar widens as the body gets smaller on screen (never under two pixels, up to 7 cm), so it still carries the team far away.
 {vec2 m=primeRing(p,SHO,ELB,.42,.13);float d=abs(m.x),aa=fwidth(m.x)*.75+1e-6,w=clamp(length(fwidth(p))*1.1,.0072,.035),core=1.-smoothstep(w-aa,w+aa,d),hair=1.-smoothstep(.0016-aa,.0016+aa,abs(d-w-.0056));
  o.x=max(o.x,(core*.8+hair*.42)*m.y);o.z=max(o.z,(1.-smoothstep(w+.0113-aa,w+.0113+aa,d))*(1.-core)*m.y);float h=max(d-w,0.);primeHalo+=.3*m.y*exp(-h*h/.0003);}
 return clamp(o,0.,1.);}
// V52 form: occlusion where a body folds on itself, read in bind space (inner legs, armpits, under the arms, the neck), so the
// volumes separate instead of sitting in one flat light.
float primeAO(vec3 P){vec3 p=vec3(abs(P.x),P.y,P.z);float lx=mix(.175,.084,clamp((p.y-.128)/.812,0.,1.));
 float inner=smoothstep(-.012,.075,lx-p.x)*smoothstep(.2,.5,p.y)*(1.-smoothstep(.93,1.03,p.y));
 float pit=exp(-((p.x-.19)*(p.x-.19)+(p.y-1.37)*(p.y-1.37)*.6)/.0045);
 float neck=smoothstep(1.45,1.5,p.y)*(1.-smoothstep(1.55,1.6,p.y))*(1.-smoothstep(.07,.115,p.x));
 vec3 a=vec3(.184,1.472,-.057),n=normalize(vec3(.46,1.055,.07)-a),q=p-a;float s=dot(q,n);vec3 r=q-n*s;
 float under=smoothstep(.0,.05,-r.y)*smoothstep(.05,.12,s)*(1.-smoothstep(.4,.47,s))*(1.-smoothstep(.09,.13,length(r)));
 return 1.-clamp(.36*inner+.4*pit+.3*neck+.24*under,0.,.5);}
// V52 signature: the lights and inlays come alive, one idea per operator (SIGNATURE[kit].fx), all from one program. travel: packets
// of light run outward from the chest along the strips; breathe: a slow swell; flicker: heat; inlay: the inlays glow from inside;
// halo: the strips spill light on the panel round them; iri: an oil-slick sheen at grazing angles. near is the size of a pixel on
// the body: full when the operator fills the screen (pick screen, podium, an arm's length away), gone at fighting distance, where
// the strips are exactly what they were, so the effect never shows or hides anyone. Phones and reduced motion: off or still.
// The lights a body carries in its own emissive map (visor slits, helmet strips, suit strips) live too: the kit's rhythm on the suit,
// and on the head a highlight that sweeps along the visor light like a scan.
float primeLive(vec3 P){float a=primeAmp*(1.-smoothstep(.004,.014,length(fwidth(P))*.7));if(a<=0.)return 1.;float hd=step(1.52,P.y),r=length(vec3(P.x,P.y-1.3,P.z));
 float tr=pow(1.-fract(r*1.1-primeT*primeFx.y),7.),br=.5+.5*sin(primeT*primeFx.w*6.2832);br=br*br*(3.-2.*br);float sx=P.x-.085*sin(primeT*1.1),sc=exp(-sx*sx/.0005);
 return max(1.+a*(primeFx.x*(2.4*tr-.3)*(1.-hd)+primeFx.z*(.9*br-.45)+1.5*sc*hd),.25);}
vec3 primeGlow(vec3 P,vec3 V,float fres){
 float near=1.-smoothstep(.004,.014,length(fwidth(P))*.7),a=primeAmp*near,r=length(vec3(P.x,P.y-1.3,P.z));
 float tr=pow(1.-fract(r*1.1-primeT*primeFx.y),7.),br=.5+.5*sin(primeT*primeFx.w*6.2832);br=br*br*(3.-2.*br);
 float fl=sin(P.y*41.+primeT*5.3)*sin(P.x*33.-primeT*3.9)*.5+.5;
 float lm=max(1.+a*(primeFx.x*(2.4*tr-.3)+primeFx.z*(.9*br-.45)+primeFy.w*(fl-.5)*1.2),.25);
 float im=.05+a*primeFy.x*(.22+.5*br*primeFx.z+.9*tr*primeFx.x+.5*fl*primeFy.w);
 vec3 g=primeLight*(V.x*primeW.w+primeHalo*primeFy.y*a*.34)*lm+primeInlay*V.y*im;
 if(primeFy.z>0.){float iv=abs(fract(fres*.9+P.y*.7+primeT*.03)*2.-1.);vec3 ir=.5+.5*cos(6.2832*(.17+.3*iv)+vec3(0.,2.09,4.19));g+=ir*fres*primeFy.z*.2*(.3+.7*a);}
 return g;}
`;
// Check Fable: one form pass for every operator surface (bodies, suits, wear), run where the albedo is final. Near-black panels get a
// soft floor (graphite, hue kept) so they keep their shape in the light instead of reading as flat holes, and a sky fill (brighter
// on surfaces facing up, never zero) keeps a soldier with the sun behind him readable from the front.
export const OB_FORM=`{float obL=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,(diffuseColor.rgb+.004)/(obL+.004)*.05,1.-smoothstep(.0,.05,obL));
 float obUp=clamp(dot(normal,(viewMatrix*vec4(0.,1.,0.,0.)).xyz),-.5,1.),obF=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);
 // a faint sky sheen too (not tied to the albedo), so a black panel in shadow still shows its volume and its edge
 totalEmissiveRadiance+=diffuseColor.rgb*(.14+.18*obUp)+vec3(.55,.62,.75)*(.004*(.5+.5*obUp)+.016*obF);}
`;
// Uniforms of one kit's prime look: `on` 0 turns the lines off (a helmet sharing the program).
// V52: one clock for every operator's signature (seconds; still under prefers-reduced-motion) and one master level (0 on phones).
const primeStill=(()=>{try{return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches;}catch(e){return false;}})();
export const primeClock={get value(){return primeStill?1.7:(typeof performance!=='undefined'?performance.now()*.001:0)%1000;}},primeAmp={value:1};
export function setPrimeLite(on=true){primeAmp.value=on?0:1;}
export function primeUniforms(sig,team,on=1){const P=sig?.prime||{},F=sig?.fx||{},v=src=>[0,4,8].map(i=>new T.Vector4(...PRIME_MOTIFS.slice(i,i+4).map(k=>on?(src?.[k]||0):0)));
 return {primeFx:{value:new T.Vector4(F.travel?.[0]||0,F.travel?.[1]||0,F.breathe?.[0]||0,F.breathe?.[1]||0)},primeFy:{value:new T.Vector4(F.inlay||0,F.halo||0,F.iri||0,F.flicker||0)},primeT:primeClock,primeAmp,primeL:{value:v(P.light)},primeI:{value:v(P.inlay)},primeW:{value:new T.Vector4(P.wl??.0032,P.wi??.0085,P.wg??.0028,(P.glow??1.15)*1.3)},
  primeLight:{value:new T.Color(TEAM_SIGNAL[team==='blue'?'blue':'orange'])},primeInlay:{value:new T.Color(sig?.[P.inlayRole||'accent']||'#ffffff')}};}
// kind per role: 0 cloth (weave relief), 1 lacquer (smooth painted plate, stronger rim), 2 metal (brushed streaks). rim: silhouette light.
// Check Fable: CORVO's gold and LINCE's copper are satin metal now (mirror metal blotched with the sky on the shoulders).
export const SIGNATURE={
 assalto:{name:'Ardesia e senape',main:'#3e444c',dark:'#2a2e34',accent:'#b8860b',pbr:{main:[.42,.12],dark:[.88,0],accent:[.3,.05]},kind:{main:1,dark:0,accent:1},helmet:'main',wear:{H:'accent'},rim:.18,prime:{light:{cuff:.9},inlay:{leg:.85,collar:.7}},fx:{travel:[.55,.55],halo:.8,inlay:.5}},
 sfondamento:{name:'Oliva e nero',main:'#55602f',dark:'#1e2022',accent:'#4a4f54',pbr:{main:[.8,0],dark:[.42,.05],accent:[.32,.8]},kind:{main:0,dark:1,accent:2},helmet:'main',suit:{torso:'main',sleeve:'#3b4325',legs:'#343b22'},prime:{light:{collar:.9,cuff:.8},inlay:{thigh:.8,knee:.7}},fx:{breathe:[.9,.17],halo:.9,inlay:.3}},
 mastino:{name:'Acciaio brunito e lime acido',main:'#5b646e',dark:'#24272b',accent:'#9fd62a',pbr:{main:[.28,.86],dark:[.88,0],accent:[.32,.05]},kind:{main:2,dark:0,accent:1},helmet:'main',wear:{D:'accent',N:'accent'},rim:.2,prime:{light:{chevron:1,cuff:1,calf:1,spine:.9,collar:.9},inlay:{leg:1,shoulder:.9,knee:.9,waist:.8,flank:.85}},fx:{flicker:.9,breathe:[.3,.4],halo:1,inlay:.6}},
 saetta:{name:'Bianco e giallo elettrico',main:'#e4e6e3',dark:'#2c3036',accent:'#ffcf14',pbr:{main:[.3,0],dark:[.8,0],accent:[.3,0]},kind:{main:1,dark:0,accent:1},helmet:'main',zones:[[.08,.62,0,.3],[.88,1.22,.27,2]],plates:[[1.01,1.455,0,.166],[.63,.925,0,.3],[1.235,1.5,.196,.4]],prime:{light:{arm:1,leg:1,chevron:1,spine:.9},inlay:{cuff:1,calf:1,collar:.9,waist:.9}},fx:{travel:[1,1.35],halo:1.2,inlay:.35}},
 onice:{name:'Nero melanzana lucido e viola',main:'#231d30',dark:'#1d1b24',accent:'#8a4dff',pbr:{main:[.24,.3],dark:[.36,.12],accent:[.24,.15]},kind:{main:1,dark:1,accent:1},helmet:'dark',rim:.22,prime:{light:{leg:1,arm:1,chevron:1,spine:.9,collar:1},inlay:{shoulder:1,thigh:.85,cuff:.9,waist:.8,calf:.8}},fx:{breathe:[.9,.2],travel:[.2,.2],halo:.9,inlay:1.6}},
 astore:{name:'Oro ambra e argento',main:'#d98a1a',dark:'#2e3034',accent:'#cdd2d8',pbr:{main:[.55,0],dark:[.7,.05],accent:[.2,.95]},kind:{main:0,dark:0,accent:2},helmet:'accent',cut:.08,tone:.8,prime:{light:{cuff:1,calf:.85,chevron:.85},inlay:{leg:1,waist:1,collar:.9,knee:1}},fx:{breathe:[.8,.42],halo:1,inlay:.3}},
 corvo:{name:'Blu notte e oro',main:'#2a3654',dark:'#20252f',accent:'#d6a63a',pbr:{main:[.36,.2],dark:[.75,0],accent:[.38,.7]},kind:{main:1,dark:0,accent:2},helmet:'main',zones:[[1.28,1.48,.1,2]],rim:.26,prime:{light:{arm:.85,leg:.85},inlay:{cuff:1,calf:1,waist:1,chevron:1}},fx:{travel:[.3,.3],halo:.6,inlay:.4,iri:1}},
 lince:{name:'Verde bosco e rame',main:'#24472b',dark:'#262a2e',accent:'#c0703c',pbr:{main:[.86,0],dark:[.85,0],accent:[.4,.68]},kind:{main:0,dark:0,accent:2},helmet:'accent',zones:[[.88,1.22,.27,2]],prime:{light:{leg:.75,cuff:.85},inlay:{thigh:1,shoulder:1,knee:1,flank:.9}},fx:{travel:[.8,.2],halo:.6,inlay:.9}}
};
// V46f Officina tweaks: small curated changes that keep each operator's identity. Per kit: detail (the third colour), finish of the
// main colour (standard, matte, gloss) and, where the operator has a real visor, its tint. Never a pure team blue or red (checked by
// tools/check_operator_tweaks.mjs). A tweak travels as one short code `tw` (a<detail>f<finish>v<visor>, '' = the default look) in the
// operator object: an older client drops the unknown field and simply shows the default palette.
export const TWEAKS={
 assalto:{detail:['#b8860b','#cfd3d8','#c0703c','#e6e6e2'],visor:false},
 sfondamento:{detail:['#4a4f54','#c8a24a','#d9d3c4','#7d8c3a'],visor:false},
 mastino:{detail:['#9fd62a','#ff8a1c','#f2d21b','#d8dde2'],visor:true},
 saetta:{detail:['#ffcf14','#9fd62a','#ff7a1a','#1ec8a5'],visor:true},
 onice:{detail:['#8a4dff','#c8278a','#d6a63a','#cfd3d8'],visor:false},
 astore:{detail:['#cdd2d8','#3a3d42','#e9e4d8','#c0703c'],visor:true},
 corvo:{detail:['#d6a63a','#cfd3d8','#c0703c','#e9e4d8'],visor:true},
 lince:{detail:['#c0703c','#d6a63a','#9fd62a','#cfd3d8'],visor:false}
};
export const DETAIL_NAMES={'#b8860b':'Senape','#c8278a':'Magenta','#e0a21b':'Ambra','#19c2a8':'Acqua','#e6e6e2':'Bianco','#4a4f54':'Canna di fucile','#c8a24a':'Ottone','#d9d3c4':'Sabbia','#7d8c3a':'Oliva chiaro','#9fd62a':'Lime','#ff8a1c':'Arancio','#f2d21b':'Giallo','#d8dde2':'Acciaio','#ffcf14':'Giallo elettrico','#ff7a1a':'Arancio','#1ec8a5':'Acqua','#8a4dff':'Viola','#d6a63a':'Oro','#cfd3d8':'Argento','#cdd2d8':'Argento','#3a3d42':'Grafite','#e9e4d8':'Avorio','#c0703c':'Rame'};
export const FINISHES=[{label:'STANDARD'},{label:'OPACO',rough:.28,shade:.9},{label:'LUCIDO',gloss:.45,shade:1.07}];
export const VISORS=[null,{label:'Oro',hex:'#c9a13a'},{label:'Fumé',hex:'#26282c'},{label:'Smeraldo',hex:'#1f8f6a'}];
export function cleanTw(kit,code){const m=/^a([0-9])f([0-9])v([0-9])$/.exec(typeof code==='string'?code:''),T=TWEAKS[kit];if(!m||!T)return '';
 const a=Math.min(+m[1],T.detail.length-1),f=Math.min(+m[2],FINISHES.length-1),v=T.visor?Math.min(+m[3],VISORS.length-1):0;return a||f||v?'a'+a+'f'+f+'v'+v:'';}
export const twParts=tw=>{const m=/^a(\d)f(\d)v(\d)$/.exec(tw||'');return m?{a:+m[1],f:+m[2],v:+m[3]}:{a:0,f:0,v:0};};
const tweaked=new Map();
export function signatureOf(kit,tw=''){if(!PALETTE_ON)return null;const base=SIGNATURE[kit];if(!base)return null;tw=cleanTw(kit,tw);if(!tw)return base;const key=kit+':'+tw;if(tweaked.has(key))return tweaked.get(key);
 const {a,f,v}=twParts(tw),F=FINISHES[f],sig={...base,accent:TWEAKS[kit].detail[a]||base.accent,pbr:{...base.pbr}};
 if(F.shade){const c=new T.Color(base.main).multiplyScalar(F.shade);sig.main='#'+c.getHexString();}
 if(F.rough)sig.pbr.main=[Math.min(1,base.pbr.main[0]+F.rough),base.pbr.main[1]*.7];if(F.gloss)sig.pbr.main=[Math.max(.06,base.pbr.main[0]*F.gloss),base.pbr.main[1]];
 if(v&&VISORS[v])sig.visor=VISORS[v].hex;tweaked.set(key,sig);return sig;}
// V46e posture: each operator's idle, layered on the shared procedural idle (assets.js animateAgent) and faded out while it
// reloads, throws or fires. Radians and metres: lean (torso forward), roll (shoulder tilt), hip (hip tilt), twist (upper body
// turn, lead shoulder forward), head [yaw, roll, pitch], carry (rifle muzzle down), stance (extra half-width of the feet), sink
// (knees bent), bounce [height, rate], breath (scale of the breathing). in: the pick-screen pose-in, about 1.5 s: twist, dip,
// V46f: a short weapon-handling move facing the camera: the rifle dips toward the hands (low), lifts to a brief present (gun), a
// small dip of the knees and a glance (head), then the operator settles in its idle. Twist, spin and hop are gone. Purely visual: aim, shots, hit zones, eye height and speed come from the rules.
export const STYLE={
 assalto:{lean:.06,roll:.03,hip:.03,twist:.1,head:[-.08,0,0],carry:.06,stance:.03,sink:.012,in:{low:1,gun:.22,dip:.03,head:-.12}},
 sfondamento:{lean:-.03,roll:0,hip:0,twist:0,head:[0,0,.04],carry:.03,stance:.06,sink:.01,breath:.7,in:{low:.8,gun:.26,dip:.05,head:.06}},
 mastino:{lean:.04,roll:0,hip:0,twist:.04,head:[0,0,.06],carry:.13,stance:.09,sink:.03,breath:.6,in:{low:.9,gun:.3,dip:.06,head:.08}},
 saetta:{lean:.04,roll:-.04,hip:.05,twist:-.05,head:[.06,.08,0],carry:.15,stance:-.01,sink:0,bounce:[.007,.0062],in:{low:1.1,gun:.24,dip:.02,head:.14}},
 onice:{lean:.08,roll:0,hip:0,twist:.02,head:[0,0,.08],carry:-.03,stance:.04,sink:.015,breath:.3,in:{low:.6,gun:.18,dip:.02,head:.2}},
 astore:{lean:-.02,roll:.04,hip:.06,twist:.06,head:[.05,-.06,0],carry:.15,stance:.01,sink:0,in:{low:.5,gun:.15,dip:.03,head:.12}},
 corvo:{lean:.03,roll:.02,hip:.02,twist:.13,head:[.1,0,.02],carry:.08,stance:.02,sink:.01,breath:.8,in:{low:.8,gun:.26,dip:.03,head:-.16}},
 lince:{lean:.14,roll:0,hip:.02,twist:.05,head:[0,0,-.06],carry:.02,stance:.05,sink:.07,in:{low:1,gun:.2,dip:.07,head:.1}}
};
export const styleOf=kit=>PALETTE_ON?STYLE[kit]||null:null;
// Masks and hoods were modelled on a smaller head: the base head shrinks under them, so nothing
// pokes through; gear parented to the head bone is compensated in dressOperator.
export function headScale(operator){const o=cleanOperator(operator);return o.kit==='sfondamento'?.86:o.kit==='mastino'?.93:1;}
const FIXED_GEAR={assalto:{visor:0,mask:1},sfondamento:{visor:0,mask:1}};
export function cleanOperator(v){
 const id=RETIRED_KITS[v?.kit]||v?.kit,kit=kitFor(id)?id:'assalto';
 // V46f: ASSALTO always wears its face mask and SFONDAMENTO its double-filter respirator; neither wears the night-vision set any more
 // (old saves, bots and older peers fall back to this look).
 const fixed=FIXED_GEAR[kit];
 return {kit,accent:Object.hasOwn(PAINTS,v?.accent)?v.accent:'graphite',visor:fixed?fixed.visor:v?.visor?1:0,mask:fixed?fixed.mask:v?.mask?1:0,pack:v?.pack?1:0,smoke:cleanTint(v?.smoke),glow:v?.glow===0||v?.glow===false?0:1,tw:cleanTw(kit,v?.tw)};
}
// Templates are keyed by the gear generation too: once the third-party models arrive, every
// dressed operator is rebuilt on its next dressOperator call.
let gearGeneration=0;
export const operatorKey=(team,v)=>{const o=cleanOperator(v);return team+':'+o.kit+':'+o.accent+':'+o.visor+o.mask+o.pack+':g'+gearGeneration+(o.tw?':'+o.tw:'');};
export const operatorName=v=>kitFor(cleanOperator(v).kit).name;
// Bots wear every kit in turn, with the team's own accent, so a squad reads as a squad: eight bots in a row show all eight.
export function botOperator(serial,team){const n=Math.abs(serial|0);return {kit:KITS[n%KITS.length].id,accent:team==='blue'?'naval':'sand',visor:serial%3===0?1:0,mask:serial%2===1?1:0,pack:serial%4===2?1:0};}
// ---- materials, shared per team and accent -------------------------------------------
const looks=new Map();
export function operatorLook(team,accent){
 const key=team+':'+accent;if(looks.has(key))return looks.get(key);
 const mat=(name,color,roughness,metalness,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness,metalness,...extra});m.name='op-'+name;m.userData.teamLook=true;return m;};
 const blue=team==='blue';
 const look={
  base:mat('base',blue?0x4a5a62:0x6e6248,.9,0),            // gear shell: slate for Scolta, khaki for Razziatori
  cloth:mat('cloth',blue?0x6f9ba9:0xb6855f,1,0),            // team cloth (tags, shemagh, hood)
  rubber:mat('rubber',0x252e2b,.84,0),
  lens:mat('lens',0x263b3c,.3,.15,{envMapIntensity:.5}),
  metal:mat('metal',0x6a7375,.45,.7),
  accent:mat('accent',PAINTS[accent]?.hex||'#45535d',.72,.08)
 };look.team=team;
 looks.set(key,look);return look;
}
const bandLooks=new Map();
function bandLook(team){let m=bandLooks.get(team);if(m)return m;const c=new T.Color(TEAM_SIGNAL[team==='blue'?'blue':'orange']);
 m=new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.85,roughness:.45,metalness:0,side:T.DoubleSide});m.name='op-band';m.userData.teamLook=true;bandLooks.set(team,m);return m;}
// ---- third-party gear ---------------------------------------------------------------
// Each file is loaded once; its meshes are shared by every operator wearing the piece
// (geometry and materials are never disposed with a body). Fits are in metres relative to
// the anchor point, in the rest pose with the operator facing -z, +x the right hand.
// `own` pieces are centred on their own bounds (packs of several objects); the others on
// the whole model's bounds, so pieces of one model keep their authored alignment.
export const GEAR_FILES={
 casco_a:'./assets/models/v37/casco_a.glb',casco_b:'./assets/models/v37/casco_b.glb',
 pacco_teste:'./assets/models/v37/pacco_teste.glb',nvg:'./assets/models/v37/nvg.glb',zaino_a:'./assets/models/v37/zaino_a.glb'
 // V44: the balaclava, headset, goggles and binoculars left with RICOGNIZIONE, TIRATORE and BOREA: no longer downloaded.
};
export const PIECES={
 casco_a:{model:'casco_a',only:/Helmet_Base|Glasses/,fit:{scale:.0062,rotation:[0,Math.PI,0],position:[0,.01,-.01]}},
 maschera_a:{model:'casco_a',only:/Mask/,fit:{scale:.0062,rotation:[0,Math.PI,0],position:[0,.01,-.01]}},
 casco_b:{model:'casco_b',fit:{scale:.3,rotation:[0,Math.PI/2,0],position:[0,.02,-.01]}},
 nvg:{model:'nvg',fit:{scale:.75,rotation:[0,Math.PI,0],position:[0,.035,-.175]}},
 zaino_a:{model:'zaino_a',fit:{scale:.55,rotation:[0,0,0],position:[0,.02,.27]}},
 zaino_b:{model:'zaino_a',fit:{scale:.5,rotation:[0,0,0],position:[0,.01,.25]}},
 zaino_c:{model:'zaino_a',fit:{scale:.45,rotation:[0,0,0],position:[0,.03,.235]}},
 antigas:{model:'pacco_teste',only:/GasMask/,own:true,fit:{scale:1.1,rotation:[0,Math.PI,0],position:[0,.0,-.045]}},
 mezza_maschera:{model:'pacco_teste',only:/Mask_ballistic/,own:true,fit:{scale:.94,rotation:[0,Math.PI,0],position:[0,-.012,-.035]}}
};
const gearScenes=new Map(),gearBounds=new Map();
export const gearReady=()=>gearScenes.size===Object.keys(GEAR_FILES).length;
export function gearScene(id){return gearScenes.get(id)||null;}
// Skinned pieces (the gas mask ships rigged) are baked to plain meshes in their bind pose.
function bakeSkins(scene){
 scene.updateMatrixWorld(true);const skinned=[];scene.traverse(o=>{if(o.isSkinnedMesh)skinned.push(o);});
 for(const s of skinned){s.skeleton.update();const src=s.geometry,geo=src.clone(),pos=geo.attributes.position,v=new T.Vector3();
  for(let i=0;i<pos.count;i++){s.applyBoneTransform(i,v.fromBufferAttribute(pos,i));pos.setXYZ(i,v.x,v.y,v.z);}
  for(const k of ['skinIndex','skinWeight'])geo.deleteAttribute(k);geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
  const mesh=new T.Mesh(geo,s.material);mesh.name=s.name;mesh.matrix.copy(s.matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);s.parent.add(mesh);s.removeFromParent();}
 scene.updateMatrixWorld(true);
}
// Models used whole are merged to one mesh per material at load: a quad night-vision set is one draw, not four.
function mergeByMaterial(scene){
 scene.updateMatrixWorld(true);const byMat=new Map();scene.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){if(!byMat.has(o.material))byMat.set(o.material,[]);byMat.get(o.material).push(o);}});
 for(const [mat,list] of byMat){if(list.length<2)continue;const geos=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);return g;});
  const merged=mergeGeometries(geos,false);for(const g of geos)g.dispose();if(!merged)continue;merged.computeBoundingBox();merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,mat);mesh.name=list[0].name;scene.add(mesh);for(const o of list)o.removeFromParent();}
 scene.updateMatrixWorld(true);
}
// Colour corrections of the bought-in textures: a charcoal knit instead of pure black, a field-drab pack instead of white, dark lenses instead of purple.
const LOOK_FIX={
 passamontagna(m){m.map=null;m.color.set(0x34393a);m.roughness=1;m.metalness=0;m.side=T.DoubleSide;},
 zaino_a(m){m.color.set(0x8a8468);},
 occhiali(m){if(m.name==='Default'){m.color.set(0x3c423c);m.roughness=.7;}else{m.color.set(0x1a2226);m.opacity=.82;m.roughness=.12;m.metalness=.5;}},
 // V43 oR rev: the face wrap and the shooter's hood keep their shapes, not their printed patterns (a checked keffiyeh, a skull).
 pacco_teste(m){if(/EquipAtlas|HoodMaskMain/.test(m.name))m.side=T.DoubleSide;if(m.name==='EquipAtlas'){m.map=null;m.color.set(0x5c5d4a);m.roughness=1;m.metalness=0;}if(m.name==='HoodMaskMain'){m.map=null;m.color.set(0x24282b);m.roughness=.95;m.metalness=0;}if(m.name==='Glass'){m.color.set(0x11161a);m.roughness=.18;m.metalness=.4;}if(m.name==='GasMaskWindow'){m.color.set(0x3d5358);m.roughness=.1;m.metalness=.75;m.envMapIntensity=1.6;}}
};
// V46 proposal (?oppal=1): the bought-in helmets of ASSALTO and SFONDAMENTO take their operator's main colour over their own shading.
const PALETTE_FIX={
 casco_a(m,o){if(/Helmet_Base/.test(o.name+'|'+(o.parent?.name||''))){m.map=null;m.color.set(SIGNATURE.assalto.main);m.roughness=SIGNATURE.assalto.pbr.main[0];m.metalness=SIGNATURE.assalto.pbr.main[1];}},
 casco_b(m){m.color.set(SIGNATURE.sfondamento.main).multiplyScalar(1.7);m.roughness=SIGNATURE.sfondamento.pbr.main[0];}
};
export async function preloadOperatorGear(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 await Promise.all(Object.entries(GEAR_FILES).map(async([id,file])=>{
  if(gearScenes.has(id))return;
  try{const g=await loader.loadAsync(file);const scene=g.scene;bakeSkins(scene);if(!Object.values(PIECES).some(p=>p.model===id&&p.only))mergeByMaterial(scene);
   scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.userData.teamLook=true;m.userData.operatorGear=true;m.side=T.FrontSide;LOOK_FIX[id]?.(m,o);if(PALETTE_ON)PALETTE_FIX[id]?.(m,o);}o.geometry.computeBoundingBox();});
   gearScenes.set(id,scene);gearBounds.set(id,new T.Box3().setFromObject(scene));gearGeneration++;}
  catch(e){console.error('Equipaggiamento non caricato',file,e);}
 }));
 return gearScenes.size;
}
// ---- parts ---------------------------------------------------------------------------
// Anchors are world positions in the rest pose with the operator facing -z: `head` is the
// head bone + 10.5 cm (eye level), `chest` the Spine2 bone, `hips` the Hips bone,
// `shoulderL`/`shoulderR` the arm roots; `side` is +1 when the right hand lies at +x.
class Parts{
 constructor(){this.groups=new Map();this.pieces=new Map();}
 add(anchor,geo,mat,x,y,z,rot=null,scale=null){let g=this.groups.get(anchor);if(!g){g=[];this.groups.set(anchor,g);}const m=new T.Matrix4().compose(new T.Vector3(x,y,z),rot?new T.Quaternion().setFromEuler(new T.Euler(...rot)):new T.Quaternion(),scale?new T.Vector3(...scale):new T.Vector3(1,1,1));g.push({geo,mat,m});}
 box(anchor,mat,x,y,z,w,h,d,rot,scale){this.add(anchor,new T.BoxGeometry(w,h,d),mat,x,y,z,rot,scale);}
 sphere(anchor,mat,x,y,z,r,scale,rot,phiStart=0,phiLength=Math.PI*2,thetaStart=0,thetaLength=Math.PI){this.add(anchor,new T.SphereGeometry(r,20,12,phiStart,phiLength,thetaStart,thetaLength),mat,x,y,z,rot,scale);}
 torus(anchor,mat,x,y,z,r,t,rot,scale){this.add(anchor,new T.TorusGeometry(r,t,6,28),mat,x,y,z,rot,scale);}
 cyl(anchor,mat,x,y,z,r,len,rot,scale){this.add(anchor,new T.CylinderGeometry(r,r,len,14),mat,x,y,z,rot,scale);}
 // A third-party piece: shared meshes of a loaded model placed by its fit.
 model(anchor,id){let g=this.pieces.get(anchor);if(!g){g=[];this.pieces.set(anchor,g);}g.push(id);}
 // One merged mesh per material per anchor for the procedural trims; third-party pieces keep
 // their own shared geometry and materials (one draw per material each).
 build(){
  const out=new Map(),anchors=new Set([...this.groups.keys(),...this.pieces.keys()]);
  for(const anchor of anchors){
   const group=new T.Group();group.name='Gear / '+anchor;group.userData.operatorGear=true;
   const list=this.groups.get(anchor)||[];
   for(const mat of new Set(list.map(p=>p.mat))){
    const geos=list.filter(p=>p.mat===mat).map(p=>{const g=p.geo.index?p.geo.toNonIndexed():p.geo;if(g!==p.geo)p.geo.dispose();g.applyMatrix4(p.m);return g;});
    // V46g: the procedural materials carry no texture, so a uv set is dropped when not every piece has one (they merge as one draw).
    if(geos.some(g=>!g.attributes.uv))for(const g of geos)g.deleteAttribute('uv');
    const merged=mergeGeometries(geos,false);for(const g of geos)g.dispose();if(!merged)continue;merged.computeBoundingSphere();
    const mesh=new T.Mesh(merged,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ownedGeometry=true;mesh.name='Gear '+anchor+' '+mat.name;group.add(mesh);
   }
   for(const id of this.pieces.get(anchor)||[])placePiece(group,anchor,id);
   out.set(anchor,group);
  }
  return out;
 }
}
const pieceCentres=new Map();
function placePiece(group,anchor,id){
 const piece=PIECES[id],scene=piece&&gearScenes.get(piece.model);if(!scene)return;
 const match=o=>o.isMesh&&(!piece.only||piece.only.test(o.name+'|'+(o.parent?.name||'')));
 let centre=pieceCentres.get(id);
 if(!centre){const b=piece.own?new T.Box3():gearBounds.get(piece.model).clone();if(piece.own)scene.traverse(o=>{if(match(o))b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});centre=b.getCenter(new T.Vector3());pieceCentres.set(id,centre);}
 const f=piece.fit,fit=new T.Matrix4().compose(new T.Vector3(...(f.position||[0,0,0])),new T.Quaternion().setFromEuler(new T.Euler(...(f.rotation||[0,0,0]))),new T.Vector3().setScalar(f.scale||1)).multiply(new T.Matrix4().makeTranslation(-centre.x,-centre.y,-centre.z));
 scene.traverse(o=>{
  if(!match(o))return;
  const mesh=new T.Mesh(o.geometry,o.material);mesh.matrix.copy(fit).multiply(o.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
  mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ownedGeometry=false;mesh.userData.sharedModel=true;mesh.userData.piece=id;mesh.name='Gear '+anchor+' '+id;group.add(mesh);
 });
}
// ---- V46d silhouettes: one compact rigid piece per operator, in its own palette ------------------------------------------
// Each read is a single original motif kept inside the body's own outline (no wider shoulders or taller head than a helmet):
// SAETTA a swept fin, ONICE angular pauldrons, ASTORE a rescue pack with a winch drum, SFONDAMENTO a stand-up collar, ASSALTO a
// sash from the lead hip, MASTINO twin back vents, CORVO a short half-cape, LINCE two ear tufts. Hit zones never read gear.
const sigMats=new Map();
function sigMat(id,role,side=T.FrontSide){const key=id+':'+role+':'+side;let m=sigMats.get(key);if(m)return m;const [kit,tw]=id.split('|'),sig=signatureOf(kit,tw)||SIGNATURE[kit],[r,mt]=sig.pbr[role];
 m=new T.MeshStandardMaterial({color:sig[role],roughness:r,metalness:mt,envMapIntensity:.85,side});m.name='op-sil-'+id+'-'+role;m.userData.teamLook=true;gearDetail(m,kit,role);sigMats.set(key,m);return m;}
// A bevelled extrusion of a 2D profile (points in the y-z plane, metres), `thick` across x, centred on x.
function blade(points,thick,bevel=.003){const sh=new T.Shape();points.forEach(([z,y],i)=>i?sh.lineTo(z,y):sh.moveTo(z,y));sh.closePath();
 const g=new T.ExtrudeGeometry(sh,{depth:thick,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:6});g.translate(0,0,-thick/2);g.rotateY(-Math.PI/2);g.deleteAttribute('uv');g.computeVertexNormals();return g;}
// A plate: a bevelled extrusion of a profile in the x-y plane, `deep` along z.
function plate(points,deep,bevel=.004){const sh=new T.Shape();points.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();
 const g=new T.ExtrudeGeometry(sh,{depth:deep,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:6});g.translate(0,0,-deep/2);g.deleteAttribute('uv');g.computeVertexNormals();return g;}
// V51: an arc is a curved band with a real thickness (a lathe of a closed, rounded profile, 6 mm or less for thin rims), not a
// paper-thin open cylinder: up close its edges read as a rolled lip instead of a razor line (collars, bracers, lames, cape).
const arc=(rt,rb,h,start,len,seg=20)=>{const t=Math.min(.006,h*.45,Math.min(rt,rb)*.2),c=Math.min(t*.5,h*.25),y=h/2,pts=[];
 const corner=(cx,cy,a0)=>{for(let i=0;i<=2;i++){const a=a0+i*Math.PI/4;pts.push(new T.Vector2(cx+c*Math.cos(a),cy+c*Math.sin(a)));}};
 corner(rb-c,-y+c,-Math.PI/2);corner(rt-c,y-c,0);corner(rt-t+c,y-c,Math.PI/2);corner(rb-t+c,-y+c,Math.PI);pts.push(pts[0].clone());
 const g=new T.LatheGeometry(pts,seg,start,len);g.deleteAttribute('uv');return g;};
// V46g: a shell cap over a shoulder (a slice of an ellipsoid, no uv so it merges with the plates), its pole tilted up and out from
// the upper arm; `th`: [start, length] of the slice from the pole (radians), `k`: the ellipsoid's [across, along the pole, front-back].
function cap(r,th,k,seg=24){const g=new T.SphereGeometry(r,seg,10,0,Math.PI*2,th[0],th[1]);g.deleteAttribute('uv');g.scale(...k);return g;}
// A pair of shoulder caps on the upper-arm anchors: top shell, a rim just under its edge, an optional light band across it.
function pauldrons(P,an,side,top,rim,light,o={}){for(const a of ['shoulderL','shoulderR']){const at=an?.[a];if(!at)continue;const sx=Math.sign(at.x)||(a==='shoulderL'?-side:side);
  const pole=new T.Vector3(sx*(o.out??.62),1,o.back??.06).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),pole),e=new T.Euler().setFromQuaternion(q),r=[e.x,e.y,e.z];
  const c=pole.clone().multiplyScalar(o.lift??.004).add(new T.Vector3(sx*(o.dx??.012),0,o.dz??0)),R=o.r??.086,K=o.k??[1,.78,1.12],T0=o.th??1.02;
  P.add(a,cap(R,[0,T0],K),top,c.x,c.y,c.z,r);P.add(a,cap(R*1.035,[T0-.13,.19],K),rim,c.x,c.y,c.z,r);
  if(light)P.add(a,cap(R*1.012,[T0-.27,.04],K),light,c.x,c.y,c.z,r);}}
// ---- Check Fable: armour with its own shape per operator ----------------------------------------------------------------------
// A breastplate on the chest anchor (front is -z) and a bracer on the outer side of each forearm, a few centimetres proud of the
// body and inside its outline; each kit has its own profile (ARMOUR below). Cosmetic like every gear piece: hit zones never read it.
const FRONT=-.128,ARMOUR_ON=(()=>{try{return !(typeof location!=='undefined'&&new URLSearchParams(location.search).get('corazze')==='0');}catch(e){return true;}})();
function breast(P,pts,mat,y=0,z=FRONT,deep=.03,bevel=.006,rot=null){P.add('chest',plate(pts,deep,bevel),mat,0,y,z,rot);}
function bracers(P,an,top,rim,o={}){for(const [fa,h] of [['forearmL',an?.handL],['forearmR',an?.handR]]){const e=an?.[fa];if(!e||!h)continue;const dir=h.clone().sub(e),len=dir.length();dir.normalize();
  const out=new T.Vector3(Math.sign(e.x)||1,.35,-.35);out.addScaledVector(dir,-out.dot(dir)).normalize();const x=new T.Vector3().crossVectors(dir,out).normalize(),eu=new T.Euler().setFromQuaternion(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,dir,out))),r=[eu.x,eu.y,eu.z];
  const L=len*(o.len??.62),at=dir.clone().multiplyScalar(len*(o.at??.5)),R=o.r??.052,span=o.span??1.9;
  P.add(fa,arc(R*.92,R*(o.flare??1.08),L,-span/2,span,12),top,at.x,at.y,at.z,r);
  if(rim)for(const t of [-.5,.5]){const c=dir.clone().multiplyScalar(len*(o.at??.5)+t*L);P.add(fa,arc(R*(t<0?1.1:.95),R*(t<0?1.1:.95),.012,-span/2,span,12),rim,c.x,c.y,c.z,r);}
  if(o.fin){const c=dir.clone().multiplyScalar(len*(o.at??.5)).addScaledVector(out,R);P.add(fa,blade(o.fin,.008,.002),rim||top,c.x,c.y,c.z,r);}}}
// Hip pieces hang from the belt on the hips anchor (front is -z): a pointed plate facing `ry` (0 front, PI back, ±PI/2 the sides).
function tasset(P,mat,x,z,w,h,ry=0,y=-.05,lean=0){P.add('hips',plate([[-w,0],[w,0],[w*.82,-h],[0,-h*1.14],[-w*.82,-h]],.014,.004),mat,x,y,z,[lean,ry,0]);}
// A thin blade on a shoulder anchor, its profile in the plane running back (+z) and up (+y), `out` metres off the joint.
function wing(P,an,mat,pts,thick,o={}){for(const a of ['shoulderL','shoulderR']){const at=an?.[a];if(!at)continue;const sx=Math.sign(at.x)||(a==='shoulderL'?-1:1);
  P.add(a,blade(pts,thick,.002),mat,sx*(o.out??.03),o.y??.03,o.z??0,[o.rx??0,sx*(o.ry??0),sx*(o.rz??0)]);}}
// V48 silhouettes (Check Fable 2): each operator reads by its own outline at range, not only by colour. Shoulders, back, hips and
// head carry the shape; every piece is cosmetic (hit zones never read gear) and stays within a few centimetres of the body.
const ARMOUR={
 // ASSALTO, the line soldier: stacked angular shoulder plates, a neck guard, a tasset and a holster on the hip without the sash.
 assalto(P,k,team,an){const side=an?.side||1,M=sigMat(k,'main',T.DoubleSide),A=sigMat(k,'accent',T.DoubleSide);
  pauldrons(P,an,side,M,A,null,{r:.082,k:[1.05,.46,1.3],out:.6,th:1.05});pauldrons(P,an,side,M,A,null,{r:.062,k:[1,.5,1.2],out:.6,th:.95,lift:.026,dx:.02});
  tasset(P,sigMat(k,'accent',T.DoubleSide),side*.168,.005,.05,.19,side*Math.PI/2);tasset(P,sigMat(k,'accent',T.DoubleSide),side*.09,-.118,.04,.13,0);
  P.box('hips',sigMat(k,'accent'),side*.185,-.2,.02,.03,.13,.07);},
 // SFONDAMENTO, the breacher: the widest shoulders of the roster, an armoured skirt of three lames, a charge tube across the back.
 sfondamento(P,k,team,an){const side=an?.side||1,M=sigMat(k,'main',T.DoubleSide),D=sigMat(k,'dark',T.DoubleSide);
  pauldrons(P,an,side,M,D,bandLook(team),{r:.102,k:[1.05,.74,1.32],out:.6,th:1.12});
  for(const [st,len] of [[1.2,.85],[Math.PI*2-2.05,.85],[-.55,1.1]]){P.add('hips',arc(.19,.232,.15,st,len,10),M,0,-.1,0);P.add('hips',arc(.234,.238,.02,st,len,10),D,0,-.17,0);}
  P.cyl('chest',sigMat(k,'accent'),0,.02,.185,.045,.34,[0,0,Math.PI/2-.35]);for(const t of [-.15,.15])P.cyl('chest',sigMat(k,'dark'),t*Math.cos(.35),.02+t*Math.sin(.35),.185,.049,.03,[0,0,Math.PI/2-.35]);},
 // MASTINO, the brute: studs along the shoulder caps, a heavy belt ring and two blunt side plates.
 mastino(P,k,team,an){const M=sigMat(k,'main',T.DoubleSide),A=sigMat(k,'accent',T.DoubleSide);
  wing(P,an,A,[[-.03,0],[-.015,.035],[0,0],[.02,.04],[.04,0],[.058,.03],[.075,0]],.02,{out:.035,y:.05});
  P.torus('hips',M,0,-.03,0,.2,.022,[Math.PI/2,0,0],[1,.82,1]);for(const sx of [-1,1]){tasset(P,M,sx*.2,.0,.065,.15,sx*Math.PI/2);tasset(P,A,sx*.207,.0,.03,.1,sx*Math.PI/2,-.07);}},
 // SAETTA, the runner: swept shoulder blades like winglets, thigh fins and twin back fins.
 saetta(P,k,team,an){const M=sigMat(k,'main',T.DoubleSide),A=sigMat(k,'accent',T.DoubleSide);
  pauldrons(P,an,1,M,A,bandLook(team),{r:.07,k:[.8,.5,1.5],out:.45,th:1.0,back:.25});
  // V52: the shoulder winglets and the hanging hip blades are gone (loose shards); the runner is the helmet fin, the back fins, the bracers.
  for(const sx of [-1,1])P.add('chest',blade([[0,-.12],[.05,-.1],[.14,.1],[.1,.12],[.03,.06]],.014,.003),M,sx*.06,.02,.125,[0,0,sx*-.12]);
  bracers(P,an,M,A,{span:2.5,r:.058,len:.7,fin:[[-.07,0],[.06,0],[.085,.035],[.03,.022],[-.05,.012]]});},
 // ONICE, the gem: three crystal shards rising from each shoulder, faceted hip plates, a ridge of plates down the spine.
 onice(P,k,team,an){const D=sigMat(k,'dark',T.DoubleSide),A=sigMat(k,'accent',T.DoubleSide);
  for(const [z,h,rz] of [[-.04,.085,.5],[.005,.125,.3],[.05,.095,.45]])wing(P,an,A,[[-.018,0],[.018,0],[.006,h],[-.004,h*.8]],.014,{out:.05,y:.03,z,rz:-rz});
  for(const sx of [-1,1]){P.add('hips',plate([[0,0],[.05,-.07],[0,-.2],[-.05,-.07]],.016,.006),A,sx*.1,-.04,-.125);P.add('hips',plate([[0,0],[.045,-.06],[0,-.17],[-.045,-.06]],.016,.006),D,sx*.178,-.04,.0,[0,sx*Math.PI/2,0]);}
  for(let i=0;i<5;i++)P.add('chest',blade([[0,-.028],[.03,-.02],[.05,.02],[.02,.03],[0,.024]],.03-i*.003,.004),A,0,.13-i*.062,.123);},
 // ASTORE, the rescuer: round caps, canisters and carabiner rings on the belt, a lamp either side of the helmet.
 astore(P,k,team,an){const A=sigMat(k,'accent',T.DoubleSide),D=sigMat(k,'dark',T.DoubleSide);
  pauldrons(P,an,1,A,D,bandLook(team),{r:.08,k:[1,.66,1.08],out:.5,th:.95});
  for(const x of [-.08,0,.08])P.cyl('hips',sigMat(k,'accent'),x,-.07,.15,.026,.11);for(const sx of [-1,1]){P.torus('hips',sigMat(k,'accent'),sx*.185,-.09,.0,.034,.008,[0,Math.PI/2,0]);P.box('hips',sigMat(k,'dark'),sx*.17,-.1,-.08,.05,.09,.045);}
  for(const sx of [-1,1])P.cyl('head',sigMat(k,'accent'),sx*.088,.0,-.03,.018,.05,[Math.PI/2,0,0]);
  // a neck ring where the helmet meets the suit (the body's own seam there is ragged)
  P.torus('chest',sigMat(k,'accent'),0,.215,-.005,.1,.02,[Math.PI/2,0,0],[1,1.12,1]);
  bracers(P,an,A,D,{len:.42,r:.043,span:1.5,flare:1.0});},
 // CORVO, the raven: layered feather pauldrons, a gold gorget, a fan of tail feathers behind the belt and a brow like a beak.
 corvo(P,k,team,an){const M=sigMat(k,'main',T.DoubleSide),A=sigMat(k,'accent',T.DoubleSide);
  pauldrons(P,an,1,A,M,null,{r:.084,k:[.95,.6,1.34],out:.5,th:1.0,back:.18});pauldrons(P,an,1,M,A,null,{r:.068,k:[.9,.6,1.2],th:.9,back:.18,lift:.024,dx:.028});
  wing(P,an,A,[[.0,0],[.06,-.01],[.15,-.05],[.13,-.02],[.05,.03]],.01,{out:.05,y:.0,rz:-.2});
  P.add('chest',arc(.118,.15,.07,Math.PI-.95,1.9,16),A,0,.135,-.01);
  for(let i=-2;i<=2;i++)P.add('hips',plate([[-.022,0],[.022,0],[.028,-.2-.03*(2-Math.abs(i))],[0,-.26-.03*(2-Math.abs(i))],[-.028,-.2-.03*(2-Math.abs(i))]],.008,.002),i%2?A:M,i*.052,-.05,.125+.012*(2-Math.abs(i)),[.14,i*-.12,i*.07]);
  P.add('head',plate([[-.055,0],[.055,0],[0,-.085]],.014,.004),A,0,.075,-.118,[-.45,0,0]);
  bracers(P,an,M,A,{span:1.7,fin:[[-.065,0],[.05,0],[.075,.028],[.02,.016],[-.02,.03],[-.05,.012]]});},
 // LINCE, the hunter: short bracers under the claws, two fang plates at the hips.
 lince(P,k,team,an){const A=sigMat(k,'accent',T.DoubleSide),M=sigMat(k,'main',T.DoubleSide);
  for(const sx of [-1,1])P.add('hips',plate([[.0,0],[.05,0],[.012,-.17]].map(([x,y])=>[x*sx,y]),.014,.004),A,sx*.07,-.05,-.125);
  for(const sx of [-1,1])tasset(P,M,sx*.172,.0,.045,.15,sx*Math.PI/2);
  bracers(P,an,sigMat(k,'dark',T.DoubleSide),A,{len:.42,at:.38});}
};
const SILHOUETTES={
 // The fin follows the helmet's crown (an ellipse over the eye line: 10 cm up, 14 cm front to back), sunk 1 cm into it.
 saetta(P,k,team,side){const crown=z=>.1*Math.sqrt(Math.max(0,1-((z-.005)/.15)**2)),lo=[],hi=[];for(let i=0;i<=8;i++){const z=-.03+i*.02;lo.push([z,crown(z)-.012]);hi.push([z,crown(z)+.004+.075*Math.pow(Math.sin(Math.PI*Math.min(1,(z+.03)/.17)),.8)*(1-.35*i/8)]);}
  P.add('head',blade([...lo,...hi.reverse()],.012),sigMat(k,'accent'),0,0,0);
  const edge=[];for(let i=2;i<=6;i++){const z=-.03+i*.02;edge.push([z,crown(z)+.075*Math.pow(Math.sin(Math.PI*Math.min(1,(z+.03)/.17)),.8)*(1-.35*i/8)-.004]);}P.add('head',blade([...edge,...edge.slice().reverse().map(([z,y])=>[z,y+.008])],.015,.001),bandLook(team),0,0,0);},
 // V46g: ONICE's pauldrons are violet lacquer shells over the shoulders, a black-aubergine rim under their edge and a thin team
 // light across them, the head's own look carried down to the arms.
 onice(P,k,team,side,an){pauldrons(P,an,side,sigMat(k,'accent',T.DoubleSide),sigMat(k,'main',T.DoubleSide),bandLook(team),{r:.088,k:[1,.6,1.34],out:.4,th:1.08});},
 astore(P,k,team,side){P.add('chest',plate([[-.11,-.15],[.11,-.15],[.12,.11],[.08,.15],[-.08,.15],[-.12,.11]],.085,.012),sigMat(k,'main'),0,-.03,.19);
  P.cyl('chest',sigMat(k,'accent'),0,.13,.2,.042,.2,[0,0,Math.PI/2]);for(const x of [-.105,.105])P.cyl('chest',sigMat(k,'dark'),x,.13,.2,.047,.018,[0,0,Math.PI/2]);
  P.box('chest',bandLook(team),0,-.04,.237,.012,.16,.006);P.box('chest',sigMat(k,'accent'),0,-.03,.24,.17,.02,.012);},
 sfondamento(P,k,team,side){P.add('chest',arc(.15,.17,.1,-Math.PI*.72,Math.PI*1.44),sigMat(k,'main',T.DoubleSide),0,.2,.0);
  P.add('chest',arc(.153,.153,.012,-Math.PI*.72,Math.PI*1.44),sigMat(k,'dark',T.DoubleSide),0,.25,.0);P.box('chest',bandLook(team),0,.21,.168,.05,.012,.006);},
 assalto(P,k,team,side){const x=-side*.175;P.box('hips',sigMat(k,'accent'),x,-.02,.03,.05,.04,.05);
  P.add('hips',plate([[-.022,0],[.022,0],[.03,-.3],[0,-.34],[-.03,-.3]],.008,.002),sigMat(k,'accent',T.DoubleSide),x-side*.012,-.03,.045,[.12,0,side*.1]);
  P.add('hips',plate([[-.018,0],[.018,0],[.024,-.22],[0,-.25],[-.024,-.22]],.008,.002),sigMat(k,'dark',T.DoubleSide),x+side*.012,-.035,.05,[.16,0,side*-.06]);},
 // V46h: MASTINO's own shoulder caps, burnished steel with a lime rim and a thin team light, kept inside the outline it already had.
 mastino(P,k,team,side,an){pauldrons(P,an,side,sigMat(k,'main',T.DoubleSide),sigMat(k,'accent',T.DoubleSide),bandLook(team),{r:.074,k:[.86,.6,1.2],out:.3,dx:-.004,lift:.012,th:1.0});
  for(const x of [-.075,.075]){P.cyl('chest',sigMat(k,'main'),x,.07,.32,.032,.16,[-.32,0,0]);P.torus('chest',sigMat(k,'accent'),x,.146,.347,.033,.006,[Math.PI/2-.32,0,0]);
   P.cyl('chest',bandLook(team),x,.152,.349,.02,.006,[-.32,0,0]);}},
 // CORVO's half-cape: six pleated panels (alternately in and out), hem and collar line in gold, on its own anchor so it can flare.
 corvo(P,k,team,side){const n=6,a0=-Math.PI*.32,len=Math.PI*.64,step=len/n;for(let i=0;i<n;i++){const o=i%2?.012:0,t0=a0+i*step-.01;
   P.add('cape',arc(.205+o,.262+o*1.6,.4,t0,step+.02,5),sigMat(k,'main',T.DoubleSide),0,-.1,-.005);P.add('cape',arc(.264+o*1.6,.268+o*1.6,.02,t0,step+.02,5),sigMat(k,'accent',T.DoubleSide),0,-.3,-.005);}
  P.add('chest',arc(.21,.212,.016,a0,len,24),sigMat(k,'accent',T.DoubleSide),0,.1,-.005);},
 // V46g LINCE, more feline and still compact: swept ear blades sunk into the helmet (copper shell, a dark inner ear, a thin team light
 // along the rear edge), sleek shoulder scales swept back, three small hooked claws on the outer forearms and a short tapered
 // tail sash from the back of the belt, copper at the tip. Nothing reaches past the body's own outline more than a few cm.
 lince(P,k,team,side,an){for(const sx of [-1,1]){const r=[.32,0,-sx*.3];
   P.add('head',plate([[-.036,0],[.034,0],[.012+sx*0,.074],[.004,.078]].map(([x,y])=>[x*sx,y]),.014,.004),sigMat(k,'accent'),sx*.056,.036,.004,r);
   P.add('head',plate([[-.02,.008],[.018,.008],[.007,.054]].map(([x,y])=>[x*sx,y]),.006,.0015),sigMat(k,'dark'),sx*.056,.036,-.006,r);
   P.add('head',plate([[.031,.004],[.036,.004],[.008,.078],[.004,.076]].map(([x,y])=>[x*sx,y]),.0155,.0008),bandLook(team),sx*.056,.036,.004,r);}
  // Shoulder scales: two overlapping sleek shells per shoulder, green with a copper rim, swept back.
  pauldrons(P,an,side,sigMat(k,'main',T.DoubleSide),sigMat(k,'accent',T.DoubleSide),null,{r:.078,k:[.92,.62,1.22],th:.95,back:.22});
  pauldrons(P,an,side,sigMat(k,'main',T.DoubleSide),sigMat(k,'accent',T.DoubleSide),null,{r:.064,k:[.9,.6,1.15],th:.9,back:.22,lift:.022,dx:.03});
  // Claws: on the outer side of each forearm, three hooked blades in a fan round the arm, pointing toward the hand.
  for(const [fa,h] of [['forearmL',an?.handL],['forearmR',an?.handR]]){const e=an?.[fa];if(!e||!h)continue;const dir=h.clone().sub(e),len=dir.length();dir.normalize();
   const out=new T.Vector3(Math.sign(e.x)||1,.55,0);out.addScaledVector(dir,-out.dot(dir)).normalize();
   for(let i=-1;i<=1;i++){const o=out.clone().applyAxisAngle(dir,i*.42*(Math.sign(e.x)||1)),x=new T.Vector3().crossVectors(dir,o).normalize(),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,dir,o)),at=e.clone().addScaledVector(dir,len*(.5+.06*i)).addScaledVector(o,.04).sub(e),eu=new T.Euler().setFromQuaternion(q);
    P.add(fa,blade([[0,-.028],[.006,-.028],[.02,.012],[.024,.03],[.012,.018],[0,-.004]],.006,.0015),sigMat(k,'accent'),at.x,at.y,at.z,[eu.x,eu.y,eu.z]);}}
  // Tail sash: tapered and bent a little away from the legs, on its own 'tail' anchor (pivot at the back of the belt) so the body can
  // swing it clear of the thighs (assets.js animateAgent); the clasp stays on the belt.
  {const n=8,L=.32,zc=y=>.05*(y*y)/(L*L)+.025*Math.max(0,-y-.18),pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push([.028*(1-t*.6),-t*L]);}const prof=[...pts,...pts.slice().reverse().map(([x,y])=>[-x,y])];
   const g=plate(prof,.011,.003),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+zc(p.getY(i)));p.needsUpdate=true;g.computeVertexNormals();
   P.add('tail',g,sigMat(k,'main',T.DoubleSide),0,0,0);
   for(const y of [-.15,-.22]){const r=.028*(1+.6*y/L)+.003;P.add('tail',arc(r,r,.011,0,Math.PI*2,14),sigMat(k,'accent',T.DoubleSide),0,y,zc(y),null,[1,1,.36]);}
   P.add('tail',plate([[.011,0],[-.011,0],[-.01,-.055],[0,-.07],[.01,-.055]],.014,.003),sigMat(k,'accent'),0,-L+.005,zc(-L+.005)+.003,[.25,0,0]);
   P.add('hips',plate([[-.035,-.011],[.035,-.011],[.035,.011],[-.035,.011]],.022,.003),sigMat(k,'accent'),0,-.025,.15);}}
};
// V44: BOREA's hood, snow mask and collar and the cloth tags went with their kits (archivio/v44-operatori/codice/operator-kits.v43.js).
const KIT_PARTS={
 assalto(P,L,o,side){
  P.model('head','casco_a');if(o.mask)P.model('head','maschera_a');if(o.visor)P.model('head','nvg');
  P.torus('head',L.accent,0,.045,0,.138,.005,[Math.PI/2,0,0],[1,1.12,1]);
  // V43 oR: the body's wear (vest, pouches, pads, marks) is the kit's own cut in operator-wear.js; here only head and pack.
  if(o.pack)P.model('chest','zaino_b');
 },
 sfondamento(P,L,o,side){
  P.model('head','casco_b');P.model('head',o.mask?'antigas':'mezza_maschera');
  if(o.pack)P.model('chest','zaino_a');
 },
 // V44: the whole bodies carry their own armour and helmet; CORVO wears a light pack so it does not read as ASTORE's twin.
 mastino(){},saetta(){},onice(){},astore(){},lince(){},
 corvo(P){if(!PALETTE_ON)P.model('chest','zaino_c');}
};
// Builds the gear groups of one operator configuration: a Map anchor → Group, in world
// coordinates of the rest pose. The caller attaches each to its bone.
export function buildGear(team,operator,anchors){
 const o=cleanOperator(operator),L=operatorLook(team,o.accent),P=new Parts();
 KIT_PARTS[o.kit](P,L,o,anchors.side||1);
 if(PALETTE_ON)SILHOUETTES[o.kit]?.(P,o.kit+'|'+o.tw,team,anchors.side||1,anchors);
 // The armour adds no material to an anchor that already has pieces and one to a new anchor (each material per anchor is a draw;
 // an operator stays within 12): its pieces take the anchor's first material unless theirs is already there.
 if(PALETTE_ON&&ARMOUR_ON&&ARMOUR[o.kit]){const A=Object.create(P);A.add=(anchor,geo,mat,...r)=>{const g=P.groups.get(anchor);P.add(anchor,geo,g?.length&&!g.some(e=>e.mat===mat)?g[0].mat:mat,...r);};ARMOUR[o.kit](A,o.kit+'|'+o.tw,team,anchors);}
 // V46: the team band round the left upper arm, in the team's signal colour (V46f: 8.5 cm wide and brighter, it carries the team).
 // V52: retired. A rigid sleeve round a bending arm cut through the suit in ragged patches; the band is now drawn on the suit itself,
 // on both arms (PRIME_GLSL above), and widens with distance.
 if(false&&PALETTE_ON&&anchors.shoulderL&&anchors.elbowL){const dir=anchors.elbowL.clone().sub(anchors.shoulderL),len=dir.length();dir.normalize();
  const at=dir.clone().multiplyScalar(len*(SIGNATURE[o.kit]?.bandAt??.48)),r=SIGNATURE[o.kit]?.band??.08,e=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir));
  P.add('shoulderL',new T.CylinderGeometry(r,r*.94,.085,24,1,true),bandLook(team),at.x,at.y,at.z,[e.x,e.y,e.z]);}
 const groups=P.build();
 for(const [anchor,group] of groups){const at=anchors[anchor];if(at)group.position.copy(at);}
 return groups;
}
