import * as T from './vendor/three.module.js';
import {mergeGeometries,mergeVertices} from './vendor/addons/utils/BufferGeometryUtils.js';
import {LOOKS,GLOWS,fxTime} from './weapon-fx.js?v=42.0';
// V42 b3b: the Officina kits are real accessories, built in code. TATTICO ('rail') is a machined weapon light (under the
// pistol's dust cover, at 11 o'clock on the mitra and the two rifles, ahead of the support hand's thumb so the player
// sees it), a folding bipod on the AVERLA CLASSICO and a turned pommel on the K-07; CAMPO ('field') is paracord: a
// cobra-weave sling stowed along the left side of the mitra and the rifles (their support hand holds the whole
// handguard, so nothing hangs under it), a lanyard with a charm on the pistol and the knife, an ammo cuff on the
// rifle's stock. The old receiver panels and the first forward grip are in archivio/v42-kits. Every accessory carries
// the class's light (its COLORE DELLA LUCE, both colours flowing like the weapon's lines), off with EFFETTO PRIME,
// dim and still on the world tier like the weapons. Keys stay 'service' / 'rail' / 'field', so saved loadouts keep working.
export const KITS={service:{label:'Di serie · pulito'},rail:{label:'Tattico · accessorio lavorato'},field:{label:'Campo · paracord'}};
const NAMES={0:['Tattico · torcia compatta','Campo · laccio con ciondolo'],1:['Tattico · torcia a ore 11','Campo · cinghia in paracord'],2:['Tattico · torcia a ore 11','Campo · cinghia in paracord'],3:['Tattico · torcia a ore 11','Campo · cinghia in paracord'],4:['Tattico · bipiede ripiegato','Campo · cartucciera sul calcio'],5:['Tattico · pomolo tornito','Campo · laccio con ciondolo']};
// Kits seen on the gun's left side (where the first person view looks), for the Officina's preview angle.
export const kitSide=(index,key)=>(key==='rail'&&[1,2,3].includes(index))||(key==='field'&&[1,2,3,4].includes(index));
export const kitLabel=(index,key)=>key==='service'?KITS.service.label:NAMES[index]?.[key==='rail'?0:1]||KITS[key]?.label||'';
// ---- shapes (metres; each accessory is scaled into its gun's units) ----------------------------------------------------
// D: detail of the set being built (1 first person and Officina, lower for the world tier: bots, other players, drops).
let D=1;const sg=n=>Math.max(5,Math.round(n*D));
function rrect(w,h,r,oy=0){const s=new T.Shape(),x=w/2,y=h/2,Y=v=>v+oy;r=Math.max(1e-5,Math.min(r,x*.98,y*.98));s.moveTo(-x+r,Y(-y));s.lineTo(x-r,Y(-y));s.quadraticCurveTo(x,Y(-y),x,Y(-y+r));s.lineTo(x,Y(y-r));s.quadraticCurveTo(x,Y(y),x-r,Y(y));s.lineTo(-x+r,Y(y));s.quadraticCurveTo(-x,Y(y),-x,Y(y-r));s.lineTo(-x,Y(-y+r));s.quadraticCurveTo(-x,Y(-y),-x+r,Y(-y));return s;}
// A block with rounded corners round z and a bevel on every edge, centred.
function block(w,h,d,r,b){b=Math.min(b,w*.3,h*.3,d*.3);const g=new T.ExtrudeGeometry(rrect(w-2*b,h-2*b,Math.max(0,r-b)),{depth:Math.max(1e-5,d-2*b),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:D<1?1:2,curveSegments:D<1?2:4});g.translate(0,0,-(d-2*b)/2);return g;}
// Turned part: [radius, height] from the back; `axis` 'z' runs it toward -z, '+z' toward +z, 'y' up.
function lathe(pts,seg=32,axis='z'){const g=new T.LatheGeometry(pts.map(([r,h])=>new T.Vector2(Math.max(r,0),h)),sg(seg));if(axis==='z')g.rotateX(-Math.PI/2);else if(axis==='+z')g.rotateX(Math.PI/2);return g;}
// Knurl or fins: radius alternating between r0 and r1 from h0 to h1.
const ridges=(r0,r1,h0,h1,n)=>Array.from({length:2*n+1},(_,k)=>[k%2?r1:r0,h0+(h1-h0)*k/(2*n)]);
const at=(g,x=0,y=0,z=0,rx=0,ry=0,rz=0,s=null)=>{if(s)g.scale(...s);if(rx)g.rotateX(rx);if(ry)g.rotateY(ry);if(rz)g.rotateZ(rz);g.translate(x,y,z);return g;};
const ring=(r,t,x,y,z,rx=0,ry=0,seg=40)=>at(new T.TorusGeometry(r,t,D<1?5:8,sg(seg)),x,y,z,rx,ry);
const uvScale=(g,sx,sy)=>{const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*sx,uv.getY(i)*sy);return g;};
class Path extends T.Curve{constructor(f){super();this.f=f;}getPoint(t,o=new T.Vector3()){return this.f(t,o);}}
// Paracord along a curve: the braid texture repeats every ~2.4 cord widths.
function cord(curve,r,segs,closed=false){const g=new T.TubeGeometry(curve,sg(segs),r,D<1?5:7,closed);return uvScale(g,curve.getLength()/(r*2.4*4),1);}
// A flat strap along a curve, w wide and h thick, its faces looking along `side` (rounded edges); uv.x runs `rep` times.
function ribbon(curve,w,h,segs,side,rep){segs=sg(segs);const n=D<1?8:12,sec=[];for(let k=0;k<n;k++){const a=k/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);sec.push([Math.sign(c)*Math.abs(c)**.3*w/2,Math.sign(s)*Math.abs(s)**.3*h/2]);}
 const pos=[],uv=[],idx=[],p=new T.Vector3(),t=new T.Vector3(),b=new T.Vector3(),wv=new T.Vector3();
 for(let i=0;i<=segs;i++){const u=i/segs;curve.getPointAt(u,p);curve.getTangentAt(u,t);b.copy(side).addScaledVector(t,-side.dot(t)).normalize();wv.crossVectors(t,b).normalize();
  for(let k=0;k<=n;k++){const [x,y]=sec[k%n];pos.push(p.x+wv.x*x+b.x*y,p.y+wv.y*x+b.y*y,p.z+wv.z*x+b.z*y);uv.push(u*rep,k/n*2);}}
 for(let i=0;i<segs;i++)for(let k=0;k<n;k++){const a=i*(n+1)+k,c=a+n+1;idx.push(a,a+1,c,c,a+1,c+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
// A tight helical wrap round a profile: rad(h) is the surface radius at height h along the axis.
function wrap(rad,h0,h1,r,axis='y'){const turns=Math.max(2,Math.round((h1-h0)/(r*2.15)));const c=new Path((t,o)=>{const a=t*turns*Math.PI*2,h=h0+(h1-h0)*t,R=rad(h)+r*.86;return axis==='y'?o.set(Math.cos(a)*R,h,Math.sin(a)*R):o.set(Math.cos(a)*R,Math.sin(a)*R,-h);});return cord(c,r,turns*26);}
// ---- accessories (parts by material role) -------------------------------------------------------------------------
// Compact weapon light: tail at the origin, head toward -z, a polished reflector round the LED; the clamp's bridge runs
// `gap` metres along +x to the gun (the FIT turns the whole light about z, so +x points at the handguard).
function rifleLight(P,L,gap){
 const tail=ridges(.0101,.0096,.0032,.0135,6),fins=ridges(.0146,.0139,L-.0205,L-.0085,3);
 P.housing.push(lathe([[0,0],[.0072,0],[.0088,.0007],[.0097,.0021],...tail,[.0102,.0148],[.0106,.0158],[.0106,L-.041],[.0111,L-.039],[.0139,L-.027],[.0146,L-.0235],...fins,[.0146,L-.0062],[.0141,L-.0038],[.0141,L-.0012],[.0134,L],[.0123,L],[.0123,L-.0024]],40));
 P.mirror.push(lathe([[.0123,L-.0024],[.0099,L-.0057],[.0069,L-.0087],[.0043,L-.0106],[.0043,L-.0112]],40));
 // clamp ring, bridge to the gun, clamp plate and two screws
 P.housing.push(lathe([[.0106,.022],[.0117,.0224],[.0120,.024],[.0120,.040],[.0117,.0416],[.0106,.042]],40));
 const bw=gap+.006;P.housing.push(at(block(bw,.0105,.017,.0022,.001),.012+bw/2-.003,0,-.032),at(block(.004,.019,.026,.0014,.001),.012+gap+.0005,0,-.032));
 for(const dz of [-.0275,-.0365])P.steel.push(at(new T.CylinderGeometry(.0019,.0019,.0016,6),.012+bw*.55-.003,.0058,dz),at(new T.CylinderGeometry(.001,.001,.0017,sg(10)),.012+bw*.55-.003,.006,dz));
 // pressure switch on the tail: a rubber cap
 P.rubber.push(at(new T.SphereGeometry(.0074,sg(20),sg(10),0,Math.PI*2,0,Math.PI/2),0,0,.0002,Math.PI/2,0,0,[1,.42,1]));
 // light: a domed LED in the reflector, the bezel ring and the band where the body meets the head
 P.glow.push(at(new T.CircleGeometry(.0043,sg(24)),0,0,-(L-.0111),0,Math.PI,0),at(new T.SphereGeometry(.0024,sg(16),sg(8),0,Math.PI*2,0,Math.PI/2),0,0,-(L-.0112),-Math.PI/2),ring(.0137,.0006,0,0,-(L-.0008)),lathe([[.01075,L-.0425],[.01075,L-.0405]],40));
}
// Compact pistol light hung under the dust cover: front face at the origin, body toward +z, top at y=0.
function pistolLight(P){
 const L=.064,cy=-.0125;
 P.housing.push(at(block(.027,.0245,L,.0075,.0019),0,cy,L/2),at(block(.017,.0055,.036,.0016,.0012),0,.0012,.03));
 // heat-sink fins on the head, paddle switches at the back
 for(let k=0;k<4;k++)P.housing.push(at(block(.029,.0215,.0016,.006,.0005),0,cy-.0005,.0055+k*.0034));
 for(const s of [-1,1])P.rubber.push(at(block(.0036,.011,.014,.0016,.0011),s*.0139,cy-.001,L-.006,0,s*.18,0));
 // bezel proud of the head, a polished reflector and the domed LED
 P.housing.push(lathe([[.0091,0],[.0103,0],[.0109,.0008],[.0109,.0074],[.0122,.0082]],36,'+z').translate(0,cy,-.0075));
 P.mirror.push(lathe([[.0030,.0058],[.0040,.0052],[.0066,.0030],[.0089,.0007],[.0091,0]],36,'+z').translate(0,cy,-.0075));
 P.glow.push(at(new T.CircleGeometry(.0031,sg(20)),0,cy,-.0018,0,Math.PI,0),at(new T.SphereGeometry(.0019,sg(14),sg(7),0,Math.PI*2,0,Math.PI/2),0,cy,-.0018,-Math.PI/2),ring(.0104,.0005,0,cy,-.0075),...[-1,1].map(s=>at(block(.0009,.0016,.034,.0004,.0003),s*.01355,cy+.0045,.036)));
}
// Two-point sling stowed along the gun's left side: `a` the front swivel (behind the support hand), `b` the rear one on
// the stock, both on the surface; a cobra-weave paracord strap sags `sag` below the line between them, with folded and
// stitched ends, a steel tri-glide and a thread of the class's light woven down its face. Metres, gun frame.
// V42 b8: the strap reads at a glance in first and third person: wider and thicker webbing in a lighter shade of its olive
// (the cord material, braid kept) bound by thin dark piping on both edges, against the black gun, on heavier steel swivels.
function sling(P,a,b,sag,bulge=.004){
 const side=new T.Vector3(-1,0,0),w=.03,h=.0072,ends=[];
 for(const q of [a,b]){const [x,y,z]=q;
  P.steel.push(at(new T.CylinderGeometry(.0042,.0047,.007,sg(16)),x-.0035,y,z,0,0,Math.PI/2),at(new T.CylinderGeometry(.0064,.0064,.0028,6),x-.0064,y,z,0,0,Math.PI/2),ring(.0098,.0022,x-.0082,y-.0088,z,0,Math.PI/2,28));
  P.glow.push(ring(.0054,.0007,x-.0079,y,z,0,Math.PI/2,24));ends.push(new T.Vector3(x-.0082,y-.0186,z));}
 const [A,B]=ends,pts=[];for(let k=0;k<=12;k++){const t=k/12,f=4*t*(1-t);pts.push(new T.Vector3().lerpVectors(A,B,t).add(new T.Vector3(-bulge*f,-sag*f,0)));}
 // the strap leaves each loop straight down a little before it falls into the curve
 const curve=new T.CatmullRomCurve3([A.clone().add(new T.Vector3(0,.004,0)),...pts.slice(1,-1),B.clone().add(new T.Vector3(0,.004,0))],false,'centripetal');const len=curve.getLength();
 P.cord.push(ribbon(curve,w,h,90,side,len/(w*1.15)));
 const p=new T.Vector3(),t=new T.Vector3(),bn=new T.Vector3(),wv=new T.Vector3(),frame=u=>{curve.getPointAt(u,p);curve.getTangentAt(u,t);bn.copy(side).addScaledVector(t,-side.dot(t)).normalize();wv.crossVectors(t,bn).normalize();};
 // folded ends: the strap doubles back over itself after the loop, held by two rows of stitching
 const layer=(u0,u1,off,k=24)=>{const pts=[];for(let i=0;i<=k;i++){frame(u0+(u1-u0)*i/k);pts.push(p.clone().addScaledVector(bn,off));}return new T.CatmullRomCurve3(pts);};
 for(const [u0,u1]of [[0,.15],[.85,1]]){const c=layer(u0,u1,h*.92);P.cord.push(ribbon(c,w*.98,h*.86,24,side,c.getLength()/(w*1.15)));
  for(const s of [-1,1]){const st=[];for(let i=0;i<=16;i++){frame(u0+(u1-u0)*(.12+.76*i/16));st.push(p.clone().addScaledVector(bn,h*1.36).addScaledVector(wv,s*w*.33));}P.rubber.push(ribbon(new T.CatmullRomCurve3(st),.0007,.0005,20,side,1));}}
 // dark binding along both edges of the strap, the whole length
 for(const s of [-1,1]){const e=[];for(let k=0;k<=36;k++){frame(k/36);e.push(p.clone().addScaledVector(wv,s*w*.5));}P.rubber.push(cord(new T.CatmullRomCurve3(e),h*.3,72));}
 {frame(.3);const s=rrect(w+.0072,.019,.0034);for(const dy of [-.0042,.0042])s.holes.push(rrect(w+.0018,.0042,.0011,dy));
  const g=new T.ExtrudeGeometry(s,{depth:.0022,bevelEnabled:true,bevelThickness:.0006,bevelSize:.0006,bevelSegments:D<1?1:2,curveSegments:D<1?2:5});g.translate(0,0,-.0011);P.housing.push(g.applyMatrix4(new T.Matrix4().makeBasis(wv,t,bn).setPosition(p.clone().addScaledVector(bn,h*.5+.0004))));}
 // the light thread on the strap's outer face
 const thread=[];for(let k=0;k<=40;k++){frame(.1+.8*k/40);thread.push(p.clone().addScaledVector(bn,h*.5+.0002));}
 P.glow.push(ribbon(new T.CatmullRomCurve3(thread),.0032,.001,80,side,3));
}
// Lanyard: a machined swivel at the origin, a doubled paracord loop through a cord lock and a hex charm with the light.
// `dir` is where the loop hangs (unit vector), `side` the axis the charm's faces look along.
function lanyard(P,len=.052){
 P.steel.push(ring(.0052,.0011,0,0,0,0,Math.PI/2,28),lathe([[0,-.0062],[.0018,-.0062],[.0021,-.0052],[.0021,-.0035],[.0012,-.003],[0,-.003]],16,'y'));
 for(const s of [-1,1]){const pts=[[0,-.0062,0],[s*.0021,-.017,.0012],[s*.0029,-.03,.0021],[s*.0018,-len+.008,.0012],[s*.0012,-len+.002,0]].map(p=>new T.Vector3(...p));P.cord.push(cord(new T.CatmullRomCurve3(pts),.00155,40));}
 P.steel.push(lathe([[0,-len-.006],[.0034,-len-.0058],[.0044,-len-.0042],[.0047,-len-.002],[.0047,-len+.002],[.0042,-len+.0038],[.0033,-len+.0052],[0,-len+.0054]],24,'y'));
 P.rubber.push(lathe([[.0049,-len-.0007],[.0049,-len+.0007]],24,'y'));
 P.cord.push(cord(new T.CatmullRomCurve3([[0,-len-.006,0],[.0008,-len-.011,.0006],[0,-len-.0155,0]].map(p=>new T.Vector3(...p))),.00155,14));
 P.steel.push(ring(.0024,.0007,0,-len-.0175,0,0,Math.PI/2,20));
 const hex=(r,depth,b,hole=0)=>{const s=new T.Shape();for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;k?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}s.closePath();if(hole){const h=new T.Path();for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;k?h.lineTo(Math.cos(a)*hole,Math.sin(a)*hole):h.moveTo(Math.cos(a)*hole,Math.sin(a)*hole);}h.closePath();s.holes.push(h);}const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2});g.translate(0,0,-depth/2);return g;};
 const cy=-len-.0285;P.housing.push(at(hex(.0094,.0024,.0009,0),0,cy,0,0,Math.PI/2,0));P.steel.push(at(hex(.0062,.0034,.0005,.0046),0,cy,0,0,Math.PI/2,0));P.glow.push(at(hex(.0045,.0036,.0003,.0036),0,cy,0,0,Math.PI/2,0),at(new T.CircleGeometry(.0016,6),-.00185,cy,0,0,-Math.PI/2,0),at(new T.CircleGeometry(.0016,6),.00185,cy,0,0,Math.PI/2,0));
 P.steel.push(at(new T.CylinderGeometry(.0013,.0013,.0018,12),0,cy+.0104,0));
}
// Folding bipod under the fore-end: mount at the origin, legs folded toward -z.
function bipod(P){
 P.housing.push(at(block(.023,.011,.036,.003,.0015),0,-.0055,-.004),at(block(.03,.012,.02,.004,.0016),0,-.0145,-.008));
 P.steel.push(at(new T.CylinderGeometry(.0026,.0026,.008,14),0,.001,-.004),at(new T.CylinderGeometry(.0042,.0042,.0028,6),0,-.0005,-.004));
 P.housing.push(at(new T.CylinderGeometry(.0072,.0072,.034,24),0,-.0185,-.018,0,0,Math.PI/2));
 P.glow.push(...[-1,1].map(s=>ring(.0058,.0006,s*.0172,-.0185,-.018,0,Math.PI/2,28)));
 P.steel.push(...[-1,1].map(s=>at(new T.CylinderGeometry(.0045,.0045,.0012,6),s*.0176,-.0185,-.018,0,0,Math.PI/2)));
 // the legs fold up toward the barrel, turning about the pivot
 const legs={housing:[],steel:[],rubber:[]};const H=P;P=legs;
 for(const s of [-1,1]){const x=s*.0106,y=-.0215;
  P.housing.push(at(block(.0085,.0125,.018,.003,.0014),x,y+.002,-.022));
  P.housing.push(at(new T.CylinderGeometry(.0043,.0043,.112,18),x,y,-.088,Math.PI/2));
  P.housing.push(lathe([[.0043,0],[.0054,.001],[.0054,.0035],...ridges(.0054,.0050,.0035,.012,5),[.0054,.0125],[.0043,.0135]],22).translate(x,y,-.138));
  P.steel.push(at(new T.CylinderGeometry(.0032,.0032,.05,16),x,y,-.168,Math.PI/2));
  P.rubber.push(lathe([[0,0],[.0040,.0008],[.0058,.006],[.0060,.011],[.0052,.0155],[.0030,.0182],[0,.0188]],20).translate(x,y,-.19));
  const sp=new Path((t,o)=>{const a=t*Math.PI*2*9;return o.set(x+Math.cos(a)*.0021,y+.0068+Math.sin(a)*.0021,-.03-t*.03);});P.steel.push(new T.TubeGeometry(sp,180,.00055,5,false));
 }
 for(const [role,list]of Object.entries(legs))for(const g of list)H[role].push(g.translate(0,.0185,.018).rotateX(.075).translate(0,-.0185,-.018));
}
// Ammo cuff on the stock's left side (the face at x=0, the pad toward -x): canvas pad with piping, five rounds in loops.
function ammoCuff(P){
 const W=.112,H=.05,D=.0075;P.cord.push(uvScale(at(block(W,H,D,.009,.0026),-D/2,0,0,0,Math.PI/2,0),90,90));
 const edge=rrect(W-.004,H-.004,.008).getPoints(14).slice(0,-1).map(p=>new T.Vector3(-D-.0002,p.y,p.x));P.rubber.push(cord(new T.CatmullRomCurve3(edge,true),.0011,160,true));
 for(let k=0;k<5;k++){const z=-.04+k*.02,x=-D-.0062;
  P.brass.push(lathe([[0,-.0255],[.0058,-.0255],[.0061,-.0245],[.0061,-.0222],[.0057,-.0218],[.0060,-.0212],[.0057,.0125],[.0036,.0175],[.0034,.0235]],24,'y').translate(x,0,z));
  P.copper.push(lathe([[.0032,.0235],[.0032,.028],[.0026,.034],[.0012,.0375],[0,.038]],20,'y').translate(x,0,z));
  P.cord.push(uvScale(lathe([[.0068,-.008],[.0072,-.0075],[.0072,.0075],[.0068,.008]],24,'y'),1,6).translate(x,0,z));
 }
 for(let k=0;k<4;k++)P.cord.push(uvScale(at(block(.0026,.016,.0074,.001,.0008),-D-.0066,0,-.03+k*.02),90,90));
 P.glow.push(at(block(.0012,.0016,W-.03,.0006,.0004),-D-.0003,H/2-.0052,0));
}
// Turned steel pommel with a glass-breaker tip, screwed on the handle's end cap: base at the origin, toward +z, elliptic
// like the handle.
function pommel(P){
 P.steel.push(lathe([[0,0],[.0128,0],[.0137,.0014],[.0137,.0046],[.0122,.0053],[.0122,.0079],[.0142,.0087],...ridges(.0146,.0139,.0096,.0166,4),[.0141,.018],[.0113,.0222],[.0069,.026],[.0037,.0283],[.0021,.0299],[0,.0303]],40,'+z').scale(1,.7,1));
 P.glow.push(lathe([[.01228,.0055],[.01228,.0077]],40,'+z').scale(1,.7,1));
}
// ---- per class: where each accessory sits (gun units) and the scale from metres -------------------------------------
// Rifle lights sit at 11 o'clock (turned 45° about z, the bridge toward the handguard), clear of the support hand at the
// hip and through the inspection (tools: hand vertices inside the kit's box, scratchpad b3bfix). Slings take their two
// swivel points in gun units, behind the firing hand's thumb. Unknown roots (tests) fall back to the TARLO's numbers.
const at11=[[Math.SQRT1_2,-Math.SQRT1_2,0],[Math.SQRT1_2,Math.SQRT1_2,0],[0,0,1]];
const slung=(u,a,b,sag,bulge)=>[P=>sling(P,a.map(v=>v/u),b.map(v=>v/u),sag/u,bulge/u),[0,0,0]];
const FIT={
 0:{u:2,swing:.62,rail:[pistolLight,[0,.0455,-.1965]],field:[P=>lanyard(P,.048),[0,-.1435,.178]]},
 1:{u:2,rail:[P=>rifleLight(P,.085,.0105),[-.075,.183,-.46],at11],field:slung(2,[-.052,.115,.20],[-.040,.035,.60],.1,.01)},
 2:{u:1.6,rail:[P=>rifleLight(P,.085,.0075),[-.048,.072,-.575],at11],field:slung(1.6,[-.023,-.04,-.015],[-.021,-.105,.215],.075,.008)},
 3:{u:2,rail:[P=>rifleLight(P,.085,.0105),[-.083,.172,-.36],at11],field:slung(2,[-.037,.088,.47],[-.037,.03,.765],.095,.008)},
 4:{u:2,rail:[bipod,[0,-.0355,-.44]],field:[ammoCuff,[-.0342,-.078,.81]]},
 // the knife's loop leaves the handle's end (+z) with the charm facing the blade's flats (y)
 5:{u:1,swing:.42,rail:[pommel,[0,0,.1075]],field:[P=>lanyard(P,.044),[0,0,.1085],[[0,1,0],[0,0,-1],[-1,0,0]]]}
};
// ---- materials --------------------------------------------------------------------------------------------------------
let braid=null;
// Paracord braid: two strand families crossing on the diagonal, a soft shade per strand and a dark groove between.
function braidMap(){if(braid!==null||typeof document==='undefined')return braid||null;const c=document.createElement('canvas');c.width=128;c.height=32;const x=c.getContext('2d'),img=x.createImageData(128,32);
 for(let j=0;j<32;j++)for(let i=0;i<128;i++){const u=i/32,v=j/32,a=(u+v*.5)%1,b=(u-v*.5+8)%1,s=(u*2+(v>.5?.5:0))%1<.5,f=s?a:b,shade=.58+.34*Math.sin(f*Math.PI),groove=Math.min(1,Math.abs(f-.5)*2)**6,n=.92+.08*Math.sin(i*1.7+j*2.3);const val=Math.round(255*Math.max(.12,shade*(1-groove*.75)*n));const k=(j*128+i)*4;img.data[k]=img.data[k+1]=img.data[k+2]=val;img.data[k+3]=255;}
 x.putImageData(img,0,0);braid=new T.CanvasTexture(c);braid.colorSpace=T.SRGBColorSpace;braid.wrapS=braid.wrapT=T.RepeatWrapping;braid.anisotropy=4;braid.name='kit-paracord';return braid;}
// The light: the class's two line colours (or the COLORE DELLA LUCE's) flowing round rings and down threads on the
// weapons' own clock; the world tier holds the first colour still. One program for every kit, tier and colour.
function glowMaterial(){const mat=new T.MeshStandardMaterial({color:0x101214,roughness:.5,metalness:.2,emissive:0xffffff});mat.name='kit-glow';
 const u={uKA:{value:new T.Color(1,.72,.34)},uKB:{value:new T.Color(1,.93,.78)},uKF:{value:1},uKT:fxTime};mat.userData.kitGlow=u;
 mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);sh.vertexShader='varying vec2 vKUv;\n'+sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvKUv=uv;');
  sh.fragmentShader='uniform vec3 uKA,uKB;uniform float uKF,uKT;varying vec2 vKUv;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float k=.5+.5*sin(vKUv.x*6.2832-uKT*2.6);totalEmissiveRadiance*=mix(uKA,uKB,k*uKF)*(1.0+uKF*.45*(k-.5));}');};
 mat.customProgramCacheKey=()=>'ob-kit-glow-1';return mat;}
function materials(index,kit){
 const m=(color,roughness,metalness,role,name)=>{const mat=new T.MeshStandardMaterial({color,roughness,metalness});mat.name=name;if(role)mat.userData.finishRole=role;return mat;};
 const cordColor=index===5?0x2f3a33:index===0?0x3a3f45:[1,2,3].includes(index)&&kit==='field'?0x8b9270:0x5f6650;
 const M={housing:m(0x1f2427,.46,.62,null,'kit-housing'),steel:m(0x9aa3a6,.3,.88,null,'kit-steel'),rubber:m(0x16191b,.82,.05,null,'kit-rubber'),cord:m(cordColor,.9,0,null,'kit-paracord'),
  mirror:m(0xdfe4e7,.1,1,null,'kit-reflector'),glow:glowMaterial(),brass:m(0xb98d4c,.32,.92,null,'kit-brass'),copper:m(0xb06c48,.34,.9,null,'kit-copper')};
 const map=braidMap();if(map){M.cord.map=map;}M.cord.userData.cordBase=cordColor;M.mirror.side=T.DoubleSide;M.mirror.envMapIntensity=1.6;
 // Every part keeps its own colours under a paint job (as a real accessory on a painted gun): the hardware stays
 // anodised black and machined steel, the paracord is dyed to the paint's main colour (tint below), so no paint program
 // ever links for a kit mid-match.
 for(const k of Object.keys(M))M[k].userData.finishProtected=true;return M;
}
// Geometry is built once per class, kit and tier and shared by every root (it never changes; only visibility does).
const shared=new Map();
function geometryFor(index,kit,world=false){
 const key=index+':'+kit+(world?':w':'');if(shared.has(key))return shared.get(key);const fit=FIT[index]||FIT[3],spec=fit[kit];if(!spec){shared.set(key,null);return null;}
 const P={housing:[],steel:[],rubber:[],cord:[],mirror:[],glow:[],brass:[],copper:[]};D=world?.45:1;try{spec[0](P);}finally{D=1;}
 const swing=kit==='field'&&fit.swing,q=spec[2]&&!swing?new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(...spec[2].map(v=>new T.Vector3(...v)))):new T.Quaternion(),M=new T.Matrix4().compose(swing?new T.Vector3():new T.Vector3(...spec[1]),q,new T.Vector3(fit.u,fit.u,fit.u));
 const out={};for(const [role,list]of Object.entries(P)){if(!list.length)continue;const geos=list.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();for(const k of Object.keys(n.attributes))if(!['position','normal','uv'].includes(k))n.deleteAttribute(k);n.clearGroups();return n;});
  // Welded back to an indexed mesh (hard edges keep their split normals): about a third of the memory.
  const raw=mergeGeometries(geos,false),merged=mergeVertices(raw,1e-6);raw.dispose();for(const g of geos)g.dispose();merged.applyMatrix4(M);merged.computeBoundingSphere();merged.computeBoundingBox();out[role]=merged;}
 shared.set(key,out);return out;
}
// Light colours of the root's class (or of the design it wears), the player's COLORE DELLA LUCE on top.
function glowColors(index,glow,u){const look=index===4?LOOKS.classico:LOOKS[index],c=GLOWS[glow]?.c,a=c?.[0]||look?.line||[1,.72,.34],b=c?.[1]||look?.lineHi||a;u.uKA.value.setRGB(a[0],a[1],a[2]);u.uKB.value.setRGB(b[0],b[1],b[2]);}
const dyeColor=new T.Color();
function tint(root,index,finish){const kits=root.userData.cosmeticKits;if(!kits)return;const on=finish?.prime!==false,world=!!root.userData.fxWorld;
 for(const [,group]of kits)group.traverse(o=>{const m=o.material;
  if(m?.userData.kitGlow){glowColors(index,finish?.glow,m.userData.kitGlow);m.userData.kitGlow.uKF.value=world?0:1;m.emissiveIntensity=on?(world?.16:.82):0;m.color.setHex(on?0x101214:0x23292c);}
  // a dyed cord keeps a little of its own colour so the braid still reads on a pale paint
  else if(m?.userData.cordBase!==undefined){m.color.setHex(m.userData.cordBase);if(finish?.dye){dyeColor.set(finish.dye);m.color.lerp(dyeColor,.78);}}});}
// Each root gets its two sets once; a set's meshes (shared geometry, the root's own materials, so a paint job stays on that
// root) are made the first time it is worn, so start-up builds nothing. After that only visibility and the light change.
// `finish` (optional) brings prime, glow and dye. The world tier draws a lighter set that casts no shadow (it is small
// at that range); in first person only the larger parts cast.
// A lanyard hangs from a pivot at its swivel (its place and turn from the FIT), so the first person view can swing it.
function build(root,index,name,group){group.userData.built=true;const world=!!root.userData.fxWorld,geo=geometryFor(index,name,world);if(!geo)return;const M=materials(index,name);
 const fit=FIT[index]||FIT[3],spec=fit[name];let holder=group;
 if(name==='field'&&fit.swing){const pivot=new T.Group();pivot.name='Kit field pivot';pivot.position.fromArray(spec[1]);if(spec[2])pivot.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(...spec[2].map(v=>new T.Vector3(...v))));group.add(pivot);holder=pivot;
  if(!world)group.userData.swing={pivot,rest:pivot.quaternion.clone(),len:(index===0?.0765:.0725)*fit.u,max:fit.swing,x:0,z:0,vx:0,vz:0,p:new T.Vector3(),v:new T.Vector3(),yaw:0,pitch:0,wy:0,wp:0,fresh:true,tick:-9};}
 for(const [role,geometry]of Object.entries(geo)){const mesh=new T.Mesh(geometry,M[role]);mesh.name='Kit '+name+' '+role;mesh.castShadow=!world&&['housing','cord','brass'].includes(role);mesh.receiveShadow=true;mesh.userData.ownedGeometry=false;mesh.userData.sharedModel=true;holder.add(mesh);}}
function makeSets(root){if(root.userData.cosmeticKits)return;const sets=new Map();for(const name of ['rail','field']){const group=new T.Group();group.name='Cosmetic / '+name;group.visible=false;root.add(group);sets.set(name,group);}root.userData.cosmeticKits=sets;}
export function applyKit(root,index,key='service',finish=null){
 if(!root||!Object.hasOwn(KITS,key))return;
 if(key==='service'&&!root.userData.cosmeticKits)return;
 makeSets(root);
 let fresh=false;for(const [name,group]of root.userData.cosmeticKits){group.visible=name===key&&!group.userData.kitHidden;if(name===key&&!group.userData.built){build(root,index,name,group);fresh=true;}}
 if(finish)root.userData.kitFinish=finish;if(finish||fresh)tint(root,index,root.userData.kitFinish);
}
export function prepareKits(root){if(root)makeSets(root);}
// One mesh per kit program, for the start-up compile (the paracord's textured program, the light's own and the
// two-sided reflector would otherwise link on first use).
export function warmKitMaterials(){const g=new T.Group(),box=new T.BoxGeometry(.01,.01,.01);for(const [k,mat]of Object.entries(materials(1,'field')))if(k==='cord'||k==='glow'||k==='mirror'){const mesh=new T.Mesh(box,mat);mesh.frustumCulled=false;g.add(mesh);}return g;}
// V42 b8: the lanyard swings in first person. A damped pendulum about its authored rest (no physics library, nothing
// allocated per frame), driven by what the hanging charm feels: the view model's own motion (walk, fire, reload, inspect,
// measured on the charm's rest point in the hands scene) and the look (the turn of the view, as the charm would lag a turning
// body). It hangs toward the ground (the real down, seen from the pitched eye), so a gun rolled in the inspection lets the
// charm fall, within the swing cone. Reduced motion: no drive and critical damping, it only eases to where it hangs. `rig` is the first person rig root (the kit sits on its gun or knife).
const SW={a:new T.Vector3(),v:new T.Vector3(),c:new T.Vector3(),q:new T.Quaternion(),t:new T.Quaternion(),d:new T.Vector3(),g:new T.Vector3(),down:new T.Vector3(0,-1,0),tick:0},SW_W=9.5,SW_Z=.16,SW_GAIN=12,SW_LOOK=.3,SW_ACC=70;
export function swingKits(rig,dt,yaw=0,pitch=0,calm=false){
 const d=rig?.userData,host=d?(d.index===5?d.knife:d.gun)||rig:null,group=host?.userData.cosmeticKits?.get('field'),s=group?.visible?group.userData.swing:null;SW.tick++;if(!s)return;if(s.tick!==SW.tick-1)s.fresh=true;s.tick=SW.tick;
 const pv=s.pivot,c=SW.c.set(0,-s.len,0).applyQuaternion(s.rest).add(pv.position).applyMatrix4(group.matrixWorld);
 // A hitch, a first frame or a weapon just drawn (not swung last frame) only re-reads where things are: no kick from the jump.
 if(s.fresh||!(dt>0)||dt>.1){s.p.copy(c);s.v.set(0,0,0);s.yaw=yaw;s.pitch=pitch;s.wy=s.wp=0;s.fresh=false;}
 const inv=1/Math.max(dt,1e-3),vel=SW.v.copy(c).sub(s.p).multiplyScalar(inv),a=SW.a.copy(vel).sub(s.v).multiplyScalar(inv);s.p.copy(c);s.v.copy(vel);
 // the turn of the view: the charm sits ahead of the eye, so a change of turn rate pushes it sideways (alpha x r)
 const wy=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw))*inv,wp=(pitch-s.pitch)*inv,ay=(wy-s.wy)*inv,ap=(wp-s.wp)*inv;s.yaw=yaw;s.pitch=pitch;s.wy=wy;s.wp=wp;
 a.x+=ay*c.z*SW_LOOK;a.y-=ap*c.z*SW_LOOK;a.z+=(ap*c.y-ay*c.x)*SW_LOOK;
 const n=a.length();if(n>SW_ACC)a.multiplyScalar(SW_ACC/n);if(calm)a.set(0,0,0);
 // into the pivot's frame at rest: x and z swing the charm, y only pulls along the cord; the ground's down sets where it settles
 SW.q.copy(group.getWorldQuaternion(SW.t)).multiply(s.rest).invert();a.applyQuaternion(SW.q);
 const g=SW.g.set(0,-Math.cos(pitch),Math.sin(pitch)).applyQuaternion(SW.q);let gx=Math.atan2(g.x,-g.y),gz=Math.atan2(g.z,-g.y);const gr=Math.hypot(gx,gz),gm=s.max*.85;if(gr>gm){gx*=gm/gr;gz*=gm/gr;}
 const steps=Math.min(4,Math.ceil(dt*120)),h=Math.min(dt,.1)/steps,k2=SW_W*SW_W,k1=2*(calm?1:SW_Z)*SW_W;
 for(let k=0;k<steps;k++){s.vx+=(-k2*(s.x-gx)-k1*s.vx-a.x*SW_GAIN)*h;s.vz+=(-k2*(s.z-gz)-k1*s.vz-a.z*SW_GAIN)*h;s.x+=s.vx*h;s.z+=s.vz*h;
  const r=Math.hypot(s.x,s.z);if(r>s.max){s.x*=s.max/r;s.z*=s.max/r;const out=(s.vx*s.x+s.vz*s.z)/(s.max*s.max);if(out>0){s.vx-=out*s.x;s.vz-=out*s.z;}}}
 SW.d.set(Math.tan(s.x),-1,Math.tan(s.z)).normalize();pv.quaternion.copy(s.rest).multiply(SW.t.setFromUnitVectors(SW.down,SW.d));
}
