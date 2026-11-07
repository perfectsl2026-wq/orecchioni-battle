// Procedural field audio. Every sound is synthesised at load in OfflineAudioContexts
// (no external recordings), then played through HRTF panning, air absorption,
// occlusion filtering, speed-of-sound delay and per-arena convolution reverb.
const SR=48000,SPEED_OF_SOUND=343;
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function noiseData(length,color,rand){
 const d=new Float32Array(length);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,last=0;
 for(let i=0;i<length;i++){const w=rand()*2-1;
  if(color==='pink'){b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;}
  else if(color==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.5;}else d[i]=w;}
 return d;
}
class Voice{
 constructor(oc,rand){this.oc=oc;this.rand=rand;}
 noise(color='white',dur=.3,start=0){const n=Math.max(1,Math.ceil(dur*this.oc.sampleRate)),b=this.oc.createBuffer(1,n,this.oc.sampleRate);b.copyToChannel(noiseData(n,color,this.rand),0);const s=this.oc.createBufferSource();s.buffer=b;s.start(start);return s;}
 tone(freq,{type='sine',start=0,dur=.2,end=null,vibrato=0,rate=0}={}){const o=this.oc.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,start);if(end)o.frequency.exponentialRampToValueAtTime(end,start+dur);if(vibrato){const l=this.oc.createOscillator(),g=this.oc.createGain();l.frequency.value=rate;g.gain.value=vibrato;l.connect(g).connect(o.frequency);l.start(start);l.stop(start+dur+.05);}o.start(start);o.stop(start+dur+.05);return o;}
 filter(type,frequency,Q=.7,{end=null,start=0,dur=0}={}){const f=this.oc.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(frequency,start);f.Q.value=Q;if(end)f.frequency.exponentialRampToValueAtTime(end,start+dur);return f;}
 env(peak,{start=0,attack=.001,hold=0,decay=.05}={}){const g=this.oc.createGain();g.gain.setValueAtTime(0,0);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(peak,start+attack);if(hold)g.gain.setValueAtTime(peak,start+attack+hold);g.gain.setTargetAtTime(0,start+attack+hold,decay);return g;}
 shape(drive=2){const s=this.oc.createWaveShaper(),c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;c[i]=Math.tanh(x*drive)/Math.tanh(drive);}s.curve=c;s.oversample='2x';return s;}
 layer(...nodes){for(let i=0;i<nodes.length-1;i++)nodes[i].connect(nodes[i+1]);nodes.at(-1).connect(this.oc.destination);}
}
async function bake(seconds,seed,build,peak=.95){
 const oc=new OfflineAudioContext(1,Math.ceil(seconds*SR),SR);build(new Voice(oc,rng(seed)));const b=await oc.startRendering(),d=b.getChannelData(0);
 let m=0;for(let i=0;i<d.length;i++)m=Math.max(m,Math.abs(d[i]));if(m>0&&peak){const k=peak/m;for(let i=0;i<d.length;i++)d[i]*=k;}
 // Short fade-out removes any click from truncated decays.
 const fade=Math.min(d.length,480);for(let i=0;i<fade;i++)d[d.length-1-i]*=i/fade;return b;
}
// Weapon reports: supersonic crack, band-limited blast, low pressure boom and chest thump.
const GUNS=[
 {crack:.75,body:1500,bq:.9,bd:.03,boom:.5,bt:.05,thump:[150,55],td:.05,tg:.55,drive:2.2,tail:.16,len:.6},
 {crack:.6,body:1750,bq:.9,bd:.024,boom:.42,bt:.04,thump:[135,52],td:.045,tg:.45,drive:2,tail:.13,len:.5},
 {crack:.95,body:920,bq:.75,bd:.05,boom:.95,bt:.075,thump:[112,40],td:.085,tg:1,drive:3,tail:.26,len:.8},
 {crack:1,body:1250,bq:.8,bd:.04,boom:.75,bt:.06,thump:[125,44],td:.07,tg:.82,drive:2.6,tail:.22,len:.75},
 {crack:1,body:760,bq:.7,bd:.085,boom:1,bt:.13,thump:[95,32],td:.13,tg:1,drive:3.2,tail:.4,len:1.4}
];
function gun(v,g,j){
 v.layer(v.noise('white',.03),v.filter('highpass',2600),v.env(g.crack,{attack:.0002,decay:.0035}));
 v.layer(v.noise('white',.45),v.filter('bandpass',g.body*j,g.bq),v.shape(g.drive),v.filter('lowpass',7200),v.env(.9,{attack:.0008,decay:g.bd*j}));
 v.layer(v.noise('brown',.9),v.filter('lowpass',700),v.env(g.boom,{attack:.002,decay:g.bt*j}));
 v.layer(v.tone(g.thump[0]*j,{end:g.thump[1],dur:g.td*3}),v.env(g.tg,{attack:.001,decay:g.td}));
 v.layer(v.noise('pink',g.len),v.filter('lowpass',2300),v.filter('highpass',170),v.env(g.tail*.35,{start:.012,attack:.01,decay:g.tail}));
}
function mechanism(v,index){
 const clicks=index===4?[[.0,2600,.5]]:index===0?[[.006,3600,.6],[.03,2400,.35]]:[[.008,3400,.5],[.038,2600,.35]];
 for(const [t,f,g]of clicks){v.layer(v.noise('white',.02,t),v.filter('bandpass',f,4),v.env(g,{start:t,attack:.0003,decay:.0022}));v.layer(v.tone(f*.86,{start:t,dur:.08}),v.env(g*.25,{start:t,decay:.012}));}
}
function step(v,surface,heavy){
 const k=heavy?1.7:1;
 if(surface==='metal'){
  v.layer(v.noise('white',.2),v.filter('lowpass',900),v.env(.8*k,{attack:.002,decay:.018*k}));
  for(const f of [430,1150,2260,3400])v.layer(v.tone(f*(.95+v.rand()*.1),{dur:.45}),v.env(.07+v.rand()*.05,{attack:.001,decay:.06+v.rand()*.08}));
  v.layer(v.noise('white',.1,.012),v.filter('bandpass',2400,1.5),v.env(.25,{start:.012,decay:.02}));
 }else if(surface==='wood'){
  v.layer(v.noise('white',.2),v.filter('lowpass',550),v.env(.9*k,{attack:.002,decay:.022*k}));
  v.layer(v.noise('white',.2),v.filter('bandpass',210+v.rand()*60,4),v.env(.9,{attack:.002,decay:.045}));
  v.layer(v.noise('white',.12,.01),v.filter('bandpass',2600,1.2),v.env(.18,{start:.01,decay:.03}));
 }else if(surface==='sand'){
  v.layer(v.noise('brown',.2),v.filter('lowpass',420),v.env(.8*k,{attack:.004,decay:.03*k}));
  for(let n=0;n<7;n++){const t=.004+v.rand()*.075;v.layer(v.noise('white',.03,t),v.filter('bandpass',2400+v.rand()*2800,1.4),v.env(.1+v.rand()*.16,{start:t,attack:.001,decay:.006+v.rand()*.01}));}
 }else{
  const tile=surface==='tile';
  v.layer(v.noise('white',.2),v.filter('lowpass',tile?950:650),v.env(.85*k,{attack:.0015,decay:.016*k}));
  v.layer(v.noise('white',.15,.008),v.filter('bandpass',tile?3600:2400,1.1),v.env(.28,{start:.008,attack:.004,decay:.03}));
  for(let n=0;n<3;n++){const t=.02+v.rand()*.05;v.layer(v.noise('white',.02,t),v.filter('highpass',4000),v.env(.06,{start:t,decay:.004}));}
 }
 if(heavy)v.layer(v.noise('white',.25,.012),v.filter('bandpass',3800,1),v.env(.2,{start:.012,attack:.01,decay:.05}));
}
// A blade dragged over something hard: a bright noise band sliding down with a thin ring under it.
function scrape(v){
 v.layer(v.noise('white',.07),v.filter('highpass',3200),v.env(.75,{attack:.0004,decay:.012}));
 for(let n=0;n<7;n++){const t=.012+n*.019+v.rand()*.008;v.layer(v.noise('white',.03,t),v.filter('bandpass',5400-n*420,6),v.env(.34-n*.03,{start:t,attack:.002,decay:.016}));}
 const base=2300+v.rand()*500;for(const r of [1,1.53,2.37])v.layer(v.tone(base*r,{dur:.3}),v.env(.1/r,{attack:.002,decay:.09}));
}
function impact(v,material){
 if(material==='metal'){
  v.layer(v.noise('white',.03),v.filter('highpass',3000),v.env(.7,{attack:.0002,decay:.003}));
  const base=1600+v.rand()*1800;for(const r of [1,1.47,2.09,2.76])v.layer(v.tone(base*r,{dur:.7}),v.env(.22/r,{attack:.0005,decay:.05+v.rand()*.12}));
 }else if(material==='wood'){
  v.layer(v.noise('white',.2),v.filter('bandpass',520+v.rand()*200,2),v.env(.9,{attack:.0008,decay:.025}));
  v.layer(v.noise('white',.2,.004),v.filter('highpass',2500),v.env(.35,{start:.004,decay:.03}));
 }else if(material==='flesh'){
  v.layer(v.noise('brown',.2),v.filter('lowpass',320),v.env(1,{attack:.001,decay:.035}));
  v.layer(v.noise('white',.1),v.filter('bandpass',1100,1.4),v.env(.4,{attack:.001,decay:.012}));
 }else if(material==='sand'){
  v.layer(v.noise('brown',.2),v.filter('lowpass',380),v.env(.8,{attack:.001,decay:.03}));
  v.layer(v.noise('white',.3,.003),v.filter('bandpass',3200,.8),v.env(.3,{start:.003,attack:.004,decay:.06}));
 }else{
  v.layer(v.noise('white',.05),v.filter('highpass',1800),v.env(.9,{attack:.0002,decay:.006}));
  v.layer(v.noise('brown',.2),v.filter('lowpass',420),v.env(.6,{attack:.001,decay:.02}));
  for(let n=0;n<5;n++){const t=.015+v.rand()*.12;v.layer(v.noise('white',.02,t),v.filter('bandpass',3000+v.rand()*3000,2),v.env(.04+v.rand()*.1,{start:t,decay:.004}));}
 }
}
function ricochet(v){const f=2400+v.rand()*1600;v.layer(v.noise('white',.03),v.filter('highpass',2500),v.env(.6,{attack:.0002,decay:.003}));v.layer(v.tone(f,{end:f*.4,dur:.45,vibrato:f*.035,rate:38+v.rand()*20}),v.filter('bandpass',f*.7,1),v.env(.45,{start:.004,attack:.006,decay:.12}));}
function whiz(v){v.layer(v.noise('white',.02),v.filter('highpass',2600),v.env(1,{attack:.0001,decay:.0016}));v.layer(v.noise('pink',.35,.004),v.filter('bandpass',3400,2.2,{end:800,start:.004,dur:.16}),v.env(.55,{start:.004,attack:.012,decay:.045}));}
function casing(v){
 for(const [t,g]of [[0,1],[.085+v.rand()*.03,.5],[.16+v.rand()*.05,.25]]){const base=3300+v.rand()*800;
  for(const r of [1,1.52,2.18])v.layer(v.tone(base*r,{start:t,dur:.25}),v.env(g*.25/r,{start:t,attack:.0004,decay:.025+v.rand()*.025}));
  v.layer(v.noise('white',.01,t),v.filter('highpass',5000),v.env(g*.3,{start:t,decay:.002}));}
}
function helmet(v){v.layer(v.noise('white',.02),v.filter('highpass',2500),v.env(.8,{attack:.0002,decay:.003}));for(const [f,g,d]of [[1880,.5,.09],[3760,.3,.06],[5420,.18,.04],[1240,.22,.05]])v.layer(v.tone(f,{dur:.6}),v.env(g,{attack:.0005,decay:d}));}
// V42 hit confirmation, heard over a gunshot even on phone speakers: a short band of bright noise and a
// clean tone in the 2-3 kHz range the report leaves free, a lower thud under the body hit, a ring on the head.
function hitTick(v,head){
 v.layer(v.noise('white',.02),v.filter('bandpass',head?3300:2800,2.2),v.env(1,{attack:.0002,decay:.0028}));
 v.layer(v.tone(head?2350:1900,{dur:.06}),v.env(head?.5:.42,{attack:.0004,decay:.012}));
 v.layer(v.noise('brown',.12),v.filter('lowpass',360),v.env(head?.35:.6,{attack:.001,decay:.024}));
 if(head)for(const [f,g,d]of [[4700,.16,.05],[6900,.08,.03]])v.layer(v.tone(f,{start:.003,dur:.2}),v.env(g,{start:.003,attack:.0005,decay:d}));
}
// The bolt rifle's own weight: a falling sub drop and a longer outdoor roll under the shared report.
function sniperLayer(v){
 v.layer(v.tone(70,{end:30,dur:.32}),v.env(1,{attack:.002,decay:.12}));
 v.layer(v.noise('brown',1.6),v.filter('lowpass',260),v.env(.5,{start:.02,attack:.03,decay:.42}));
 v.layer(v.noise('pink',1.4),v.filter('bandpass',900,.6),v.env(.12,{start:.09,attack:.06,decay:.38}));
}
function dryFire(v){v.layer(v.noise('white',.02),v.filter('bandpass',2800,5),v.env(.8,{attack:.0002,decay:.003}));v.layer(v.tone(1900,{dur:.08}),v.env(.15,{decay:.01}));v.layer(v.noise('white',.03,.012),v.filter('bandpass',4200,3),v.env(.25,{start:.012,decay:.003}));}
function foley(v,kind){
 if(kind==='magout'){v.layer(v.noise('white',.02),v.filter('bandpass',2300,4),v.env(.7,{attack:.0003,decay:.003}));v.layer(v.noise('white',.2,.01),v.filter('bandpass',1400,1),v.env(.4,{start:.01,attack:.012,decay:.04}));}
 else if(kind==='magin'){v.layer(v.noise('white',.05),v.filter('lowpass',1200),v.env(.9,{attack:.0005,decay:.01}));v.layer(v.noise('white',.02,.008),v.filter('bandpass',3000,4),v.env(.6,{start:.008,attack:.0003,decay:.003}));v.layer(v.tone(900,{dur:.08}),v.env(.25,{decay:.02}));}
 else if(kind==='bolt'){v.layer(v.noise('white',.05),v.filter('bandpass',2600,2),v.env(.6,{attack:.0005,decay:.012}));v.layer(v.noise('white',.12,.01),v.filter('bandpass',1800,1),v.env(.3,{start:.01,attack:.01,decay:.03}));v.layer(v.noise('white',.05,.1),v.filter('bandpass',1500,2),v.env(1,{start:.1,attack:.0004,decay:.015}));v.layer(v.tone(1300,{start:.1,dur:.12}),v.env(.25,{start:.1,decay:.03}));v.layer(v.tone(2700,{start:.1,dur:.1}),v.env(.15,{start:.1,decay:.02}));}
 else if(kind==='slide'){v.layer(v.noise('white',.03),v.filter('bandpass',3200,3),v.env(.9,{attack:.0002,decay:.006}));v.layer(v.tone(2100,{dur:.1}),v.env(.25,{decay:.02}));}
 else if(kind==='cloth'){v.layer(v.noise('pink',.35),v.filter('bandpass',1300,.6),v.env(.6,{attack:.05,decay:.07}));v.layer(v.noise('white',.3,.04),v.filter('highpass',3500),v.env(.15,{start:.04,attack:.04,decay:.05}));}
 else if(kind==='draw'){v.layer(v.noise('pink',.25),v.filter('bandpass',1500,.7),v.env(.4,{attack:.03,decay:.05}));v.layer(v.noise('white',.03,.12),v.filter('bandpass',3000,4),v.env(.7,{start:.12,attack:.0003,decay:.004}));v.layer(v.tone(2400,{start:.12,dur:.08}),v.env(.15,{start:.12,decay:.015}));}
 else if(kind==='swish'){v.layer(v.noise('pink',.35),v.filter('bandpass',700,1.5,{end:2900,dur:.16}),v.env(.8,{attack:.03,decay:.05}));}
}
function bang(v,big){
 v.layer(v.noise('white',big?1:.6),v.filter('lowpass',big?2200:3600),v.shape(3),v.env(1,{attack:.0005,decay:big?.12:.06}));
 v.layer(v.noise('brown',big?3:1.2),v.filter('lowpass',big?380:520),v.env(.95,{attack:.003,decay:big?.65:.25}));
 v.layer(v.tone(big?60:72,{end:big?24:30,dur:big?1.4:.45}),v.env(.9,{decay:big?.35:.12}));
 if(big)for(let n=0;n<26;n++){const t=.05+v.rand()*1.6;v.layer(v.noise('white',.04,t),v.filter('bandpass',1200+v.rand()*3200,1.5),v.env(.05+v.rand()*.18*(1-t/1.8),{start:t,decay:.008+v.rand()*.02}));}
}
function beep(v){v.layer(v.tone(1720,{type:'square',dur:.12}),v.filter('lowpass',4200),v.env(.7,{attack:.001,hold:.045,decay:.012}));v.layer(v.tone(3440,{dur:.1}),v.env(.12,{attack:.001,hold:.04,decay:.01}));}
function heartbeat(v){for(const [t,g]of [[0,1],[.2,.65]])v.layer(v.tone(62,{end:38,start:t,dur:.14}),v.env(g,{start:t,attack:.004,decay:.035}));}
function radio(v,tone){v.layer(v.noise('white',.18),v.filter('bandpass',1900,1.2),v.env(.35,{attack:.003,hold:.05,decay:.02}));v.layer(v.tone(tone,{start:.07,dur:.1}),v.filter('bandpass',tone,2),v.env(.5,{start:.07,attack:.002,hold:.05,decay:.015}));}
// Kill confirmation: a dry click and a rising two-note chime, pitched per kill in the round.
function killTone(v){v.layer(v.noise('white',.004),v.filter('highpass',3200),v.env(.5,{attack:.0002,decay:.0015}));for(const [f,t,g]of [[1046.5,0,.55],[1568,.05,.42]]){v.layer(v.tone(f,{start:t,dur:.22}),v.env(g,{start:t,attack:.002,hold:.02,decay:.06}));v.layer(v.tone(f*2.01,{type:'triangle',start:t,dur:.12}),v.env(g*.18,{start:t,attack:.001,decay:.025}));}}
function chord(v,notes){notes.forEach((f,i)=>{v.layer(v.tone(f,{start:i*.09,dur:1.2}),v.env(.4,{start:i*.09,attack:.01,decay:.32}));v.layer(v.tone(f*2,{start:i*.09,dur:.8}),v.env(.09,{start:i*.09,attack:.01,decay:.18}));});}
// Synthetic, decorrelated stereo responses with early reflections and air damping.
function impulse(ctx,{seconds,decay,early=[],damping=5200,predelay=.006,echoes=[]},seed=91){
 const sr=ctx.sampleRate,len=Math.ceil(seconds*sr),buffer=ctx.createBuffer(2,len,sr);
 for(let ch=0;ch<2;ch++){const d=buffer.getChannelData(ch),rand=rng(seed+ch*17);let lp=0;
  for(let i=Math.floor(predelay*sr);i<len;i++){const t=i/sr,cut=damping*Math.exp(-t*1.4)+350,a=1-Math.exp(-2*Math.PI*cut/sr);lp+=a*((rand()*2-1)-lp);d[i]=lp*Math.exp(-(t-predelay)*6.91/decay);}
  for(const [time,gain]of [...early,...echoes]){const at=Math.floor(time*(1+(ch?.035:-.035))*sr),spread=time>.25?900:90;let s=0;for(let k=0;k<spread&&at+k<len;k++){s+=.25*((rand()*2-1)-s);d[at+k]+=gain*s*Math.exp(-k/(spread*.35))*3;}}
 }
 return buffer;
}
const SPACES={
 sahra:{outdoor:{seconds:2.2,decay:1.15,early:[[.028,.35],[.061,.25],[.094,.18],[.142,.12]],damping:4800},indoor:{seconds:2.4,decay:1.7,early:[[.007,.5],[.013,.4],[.021,.35],[.034,.25]],damping:3600}},
 caldera:{outdoor:{seconds:2.4,decay:1.35,early:[[.022,.32],[.05,.26],[.083,.2],[.12,.14]],damping:5200},indoor:{seconds:2.2,decay:1.5,early:[[.008,.45],[.017,.35],[.029,.25]],damping:4000}},
 forge:{outdoor:{seconds:3.2,decay:1.4,early:[[.025,.3],[.058,.24],[.1,.16]],echoes:[[.38,.14],[.63,.08]],damping:4600},indoor:{seconds:2.4,decay:1.8,early:[[.009,.45],[.02,.35],[.032,.25]],damping:3600}},
};
const AMBIENCE={sahra:'desert',caldera:'coast',forge:'alpine'};
const MATERIAL_GAIN={metal:.55,wood:.6,flesh:.75,sand:.45,stone:.5};
export class AudioEngine{
 constructor(){
  this.ctx=null;this.banks=null;this.voices=0;this.map='caldera';this.enclosure=0;this.ambient=[];this.heartAt=0;this.reloads=new Map();this.rand=rng(Date.now()&0xffff);
  let stored=.8;try{const v=Number(localStorage.getItem('ob-volume-v28'));if(Number.isFinite(v)&&localStorage.getItem('ob-volume-v28')!==null)stored=Math.max(0,Math.min(1,v));}catch{}this.volume=stored;
  this.ready=null;this.unlocked=false;this.gains={body:.5,head:.55,sniper:.75};
 }
 // Baking runs once the lobby is interactive, so it never competes with arena loading.
 // The context and its reverbs are built here too, suspended: creating them inside the
 // first click cost ~100 ms on that click. The gesture then only has to resume it.
 prepare(){this.open();return this.ready??=this.bake().catch(e=>{console.warn('Audio procedurale non disponibile',e);this.banks=null;});}
 open(){
  if(typeof window==='undefined')return;
  try{if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C({latencyHint:'interactive'});this.build();}}catch(e){console.warn(e);}
 }
 async bake(){
  if(typeof OfflineAudioContext==='undefined')return;const started=performance.now();
  const many=(n,seconds,seed,build,peak)=>Promise.all(Array.from({length:n},(_,i)=>bake(seconds,seed+i*101,v=>build(v,i),peak)));
  const surfaces=['stone','sand','metal','wood','tile'],materials=['stone','metal','wood','sand','flesh'];
  const [guns,mechs,steps,lands,impacts,rest]=await Promise.all([
   Promise.all(GUNS.map((g,i)=>many(3,g.len+.25,1000+i*37,(v,n)=>gun(v,g,.96+n*.035)))),
   Promise.all(GUNS.map((g,i)=>bake(.14,3000+i,v=>mechanism(v,i),.8))),
   Promise.all(surfaces.map((s,i)=>many(4,.24,5000+i*31,v=>step(v,s,false),.8))),
   Promise.all(surfaces.map((s,i)=>many(2,.32,6000+i*31,v=>step(v,s,true),.9))),
   Promise.all(materials.map((m,i)=>many(3,.5,7000+i*31,v=>impact(v,m),.85))),
   Promise.all([many(3,.6,8100,ricochet,.7),many(3,.3,8200,whiz,.9),many(3,.35,8300,casing,.6),bake(.8,8400,helmet,.85),bake(.15,8500,dryFire,.7),
    ...['magout','magin','bolt','slide','cloth','draw','swish'].map((k,i)=>bake(.4,8600+i,v=>foley(v,k),.8)),
    bake(1.4,8800,v=>bang(v,false),.95),bake(3.4,8900,v=>bang(v,true),.95),bake(.2,9000,beep,.6),bake(.5,9100,heartbeat,.9),bake(.32,9200,v=>radio(v,1250),.6),bake(1.6,9300,v=>chord(v,[523.3,659.3,784]),.5),bake(1.6,9400,v=>chord(v,[392,311.1,261.6]),.5),bake(.36,9500,killTone,.6),bake(.3,9600,scrape,.75),bake(.16,9700,v=>hitTick(v,false),.9),bake(.26,9710,v=>hitTick(v,true),.9),bake(1.7,9720,sniperLayer,.9)])
  ]);
  const [ric,whz,cas,hel,dry,magout,magin,bolt,slide,cloth,draw,swish,flash,explosion,bombBeep,heart,radioClick,win,lose,killChime,bladeScrape,tickBody,tickHead,sniperBoom]=rest;
  this.banks={guns,mechs,steps:Object.fromEntries(surfaces.map((s,i)=>[s,steps[i]])),lands:Object.fromEntries(surfaces.map((s,i)=>[s,lands[i]])),impacts:Object.fromEntries(materials.map((m,i)=>[m,impacts[i]])),
   ricochet:ric,whiz:whz,casing:cas,helmet:hel,dry,foley:{magout,magin,bolt,slide,cloth,draw,swish},flash,explosion,beep:bombBeep,heart,radio:radioClick,win,lose,kill:killChime,scrape:bladeScrape,hit:{body:tickBody,head:tickHead},sniper:sniperBoom};
  this.bakeMs=Math.round(performance.now()-started);
 }
 // Called from a user gesture; browsers keep audio suspended until then.
 unlock(){
  this.prepare();this.unlocked=true;
  try{if(this.ctx?.state==='suspended')this.ctx.resume()?.catch?.(()=>{});}catch(e){console.warn(e);}
 }
 build(){
  const c=this.ctx;
  this.master=c.createGain();this.master.gain.value=this.volume;
  this.hearing=c.createBiquadFilter();this.hearing.type='lowpass';this.hearing.frequency.value=20000;this.hearing.Q.value=.4;
  this.compressor=c.createDynamicsCompressor();Object.assign(this.compressor,{});this.compressor.threshold.value=-12;this.compressor.knee.value=10;this.compressor.ratio.value=4.5;this.compressor.attack.value=.003;this.compressor.release.value=.22;
  this.dryBus=c.createGain();this.ambienceBus=c.createGain();this.ambienceBus.gain.value=.0;
  this.send=c.createGain();this.outdoorSend=c.createGain();this.indoorSend=c.createGain();this.outdoor=c.createConvolver();this.indoor=c.createConvolver();this.returnGain=c.createGain();this.returnGain.gain.value=.9;
  this.send.connect(this.outdoorSend).connect(this.outdoor).connect(this.returnGain);this.send.connect(this.indoorSend).connect(this.indoor).connect(this.returnGain);
  for(const n of [this.dryBus,this.returnGain,this.ambienceBus])n.connect(this.hearing);
  this.hearing.connect(this.master).connect(this.compressor).connect(c.destination);
  this.setMap(this.map,true);
 }
 // A hidden page keeps playing the online match: nothing of it should be heard from a background tab,
 // neither new sounds nor the ambience loops, which fade out and come back at the level the game last set.
 silence(on){this.silent=!!on;this.fadeAmbience();}
 setVolume(v){this.volume=Math.max(0,Math.min(1,v));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.05);try{localStorage.setItem('ob-volume-v28',String(this.volume));}catch{}}
 setMap(map,force=false){
  if(!force&&map===this.map&&this.outdoor?.buffer)return;this.map=SPACES[map]?map:'caldera';if(!this.ctx)return;
  const space=SPACES[this.map];this.outdoor.buffer=impulse(this.ctx,space.outdoor,91);this.indoor.buffer=impulse(this.ctx,space.indoor,191);
  this.startAmbience(AMBIENCE[this.map]);
 }
 // Looping beds: modulated noise, never a repeating sample loop.
 startAmbience(kind){
  const c=this.ctx;for(const n of this.ambient)try{n.stop?.(c.currentTime+1.5);}catch{}this.ambient=[];
  const bus=c.createGain();bus.gain.setValueAtTime(0,c.currentTime);bus.gain.linearRampToValueAtTime(1,c.currentTime+3);bus.connect(this.ambienceBus);
  const buffer=(color,seconds,seed)=>{const n=Math.ceil(seconds*c.sampleRate),b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=noiseData(n,color,rng(seed+ch));const x=Math.min(4000,n>>2);for(let i=0;i<x;i++){const a=i/x;d[i]=d[i]*a+d[n-x+i]*(1-a);}b.copyToChannel(d,ch);}return b;};
  const loop=(b,gain,filters,lfo=null)=>{const s=c.createBufferSource();s.buffer=b;s.loop=true;let node=s;for(const [type,f,q]of filters){const flt=c.createBiquadFilter();flt.type=type;flt.frequency.value=f;flt.Q.value=q;node.connect(flt);node=flt;if(lfo&&type==='bandpass'){const o=c.createOscillator(),g=c.createGain();o.frequency.value=lfo.rate;g.gain.value=lfo.depth;o.connect(g).connect(flt.frequency);o.start();this.ambient.push(o);}}const g=c.createGain();g.gain.value=gain;if(lfo?.gain){const o=c.createOscillator(),d=c.createGain();o.frequency.value=lfo.gainRate;d.gain.value=gain*lfo.gain;o.connect(d).connect(g.gain);o.start();this.ambient.push(o);}node.connect(g).connect(bus);s.start();this.ambient.push(s);};
  const pink=buffer('pink',9,401),brown=buffer('brown',11,501);
  if(kind==='desert'){loop(pink,.07,[['bandpass',520,.55],['lowpass',2400,.5]],{rate:.06,depth:260,gainRate:.083,gain:.55});loop(pink,.012,[['bandpass',2300,7]],{rate:.11,depth:500,gainRate:.05,gain:.9});loop(brown,.05,[['lowpass',140,.5]]);}
  else if(kind==='coast'){loop(brown,.09,[['lowpass',650,.5]],{gainRate:.13,gain:.7});loop(pink,.03,[['bandpass',3200,.5]],{rate:.13,depth:900,gainRate:.13,gain:.8});loop(pink,.03,[['bandpass',600,.6]],{rate:.05,depth:200,gainRate:.07,gain:.5});}
  else if(kind==='alpine'){loop(pink,.035,[['bandpass',1800,.5]]);loop(brown,.08,[['lowpass',110,.6]],{gainRate:.2,gain:.15});loop(pink,.04,[['bandpass',480,.6]],{rate:.05,depth:180,gainRate:.06,gain:.6});}
  else{loop(brown,.06,[['lowpass',220,.5]]);loop(pink,.018,[['bandpass',900,.8]],{rate:.04,depth:120});for(const [f,g]of [[55,.012],[110,.008],[165,.004]]){const o=c.createOscillator();o.frequency.value=f;const gg=c.createGain();gg.gain.value=g;o.connect(gg).connect(bus);o.start();this.ambient.push(o);}}
 }
 setAmbience(level){this.ambienceLevel=level;this.fadeAmbience();}
 fadeAmbience(){if(this.ambienceBus)this.ambienceBus.gain.setTargetAtTime(this.silent?0:this.ambienceLevel||0,this.ctx.currentTime,this.silent?.05:.8);}
 listen(camera,enclosure=0){
  if(!this.ctx)return;const l=this.ctx.listener,p=camera.position,t=this.ctx.currentTime,f=this.forward??={x:0,y:0,z:-1};
  const e=camera.matrixWorld.elements;f.x=-e[8];f.y=-e[9];f.z=-e[10];
  this.enclosure+=(enclosure-this.enclosure)*.08;
  if(l.positionX){l.positionX.setValueAtTime(p.x,t);l.positionY.setValueAtTime(p.y,t);l.positionZ.setValueAtTime(p.z,t);l.forwardX.setValueAtTime(f.x,t);l.forwardY.setValueAtTime(f.y,t);l.forwardZ.setValueAtTime(f.z,t);l.upX.setValueAtTime(e[4],t);l.upY.setValueAtTime(e[5],t);l.upZ.setValueAtTime(e[6],t);}
  else{l.setPosition(p.x,p.y,p.z);l.setOrientation(f.x,f.y,f.z,e[4],e[5],e[6]);}
  this.outdoorSend.gain.setTargetAtTime(1-this.enclosure*.75,t,.1);this.indoorSend.gain.setTargetAtTime(.25+this.enclosure*.9,t,.1);
  this.listener=p;
 }
 pick(list){return Array.isArray(list)?list[Math.floor(this.rand()*list.length)]:list;}
 play(buffer,{position=null,gain=1,rate=1,delay=0,lowpass=20000,reverb=.15,model='HRTF',ref=2,rolloff=1,priority=1,at=null}={}){
  const c=this.ctx;if(!c||this.silent||c.state!=='running'||!buffer||(this.voices>=56&&priority<2)||this.voices>=72)return null;
  const src=c.createBufferSource();src.buffer=buffer;src.playbackRate.value=rate;let node=src;const nodes=[src];
  if(lowpass<19000){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=Math.max(120,lowpass);f.Q.value=.5;node.connect(f);node=f;nodes.push(f);}
  const g=c.createGain();g.gain.value=gain;node.connect(g);nodes.push(g);let out=g;
  if(position){const p=c.createPanner();p.panningModel=model;p.distanceModel='inverse';p.refDistance=ref;p.rolloffFactor=rolloff;p.maxDistance=10000;if(p.positionX){p.positionX.value=position[0];p.positionY.value=position[1];p.positionZ.value=position[2];}else p.setPosition(...position);g.connect(p);out=p;nodes.push(p);}
  out.connect(this.dryBus);if(reverb>0){const s=c.createGain();s.gain.value=reverb;out.connect(s).connect(this.send);nodes.push(s);}
  this.voices++;src.onended=()=>{this.voices--;for(const n of nodes)n.disconnect();};src.start(at??c.currentTime+Math.max(0,delay));return src;
 }
 distance(position){const l=this.listener;return l?Math.hypot(position[0]-l.x,position[1]-l.y,position[2]-l.z):0;}
 // Air absorption: high frequencies decay with range; occlusion lowpasses through cover.
 // Air absorption: high frequencies decay with range; occlusion (0–1, V31: by the
 // thickness of cover between source and listener) lowpasses and quietens through walls.
 air(distance,muffled){const m=Math.min(1,Math.max(0,Number(muffled)||0));return Math.min(19500,Math.max(1300,19000*Math.exp(-distance/48)))*(1-.84*m);}
 // `tone` [rate, gain]: a design that is a weapon of its own (weapon-stats.js) sounds higher and snappier or deeper.
 shot({weapon=3,position=null,local=false,muffled=false,tone=null}){
  const b=this.banks;if(!b||!b.guns[weapon])return;const tr=tone?.[0]||1,tg=tone?.[1]||1;
  if(local){this.play(this.pick(b.guns[weapon]),{gain:.82*tg,rate:(.98+this.rand()*.04)*tr,reverb:.34,priority:3});this.play(b.mechs[weapon],{gain:.32,rate:(.97+this.rand()*.06)*tr,reverb:0,priority:2});if(weapon===4&&b.sniper)this.play(b.sniper,{gain:this.gains.sniper,rate:.97+this.rand()*.05,reverb:.4,priority:3});return;}
  const d=this.distance(position),m=Math.min(1,Math.max(0,Number(muffled)||0));
  this.play(this.pick(b.guns[weapon]),{position,gain:(1-.45*m)*tg,rate:(.96+this.rand()*.07)*tr,delay:d/SPEED_OF_SOUND,lowpass:this.air(d,m),reverb:.22+Math.min(.6,d/65)-.15*m,ref:5,rolloff:.8,priority:2});
  if(weapon===4&&b.sniper)this.play(b.sniper,{position,gain:(1-.45*m)*this.gains.sniper,delay:d/SPEED_OF_SOUND,lowpass:Math.min(2400,this.air(d,m)),reverb:.3+Math.min(.5,d/65),ref:8,rolloff:.6,priority:2});
 }
 footstep({position=null,surface='stone',local=false,heavy=false,muffled=false,volume=1}){
  const b=this.banks;if(!b)return;const list=(heavy?b.lands:b.steps)[surface]||b.steps.stone;
  if(local){this.play(this.pick(list),{gain:(heavy?.36:.2)*volume,rate:.94+this.rand()*.12,reverb:.08,priority:1});return;}
  const d=this.distance(position),m=Math.min(1,Math.max(0,Number(muffled)||0));if(d>34)return;
  this.play(this.pick(list),{position,gain:(heavy?1.1:.9)*volume*(1-.5*m),rate:.94+this.rand()*.12,lowpass:Math.min(this.air(d,0),19000-17600*m),reverb:.1+Math.min(.3,d/60),ref:1.3,rolloff:1.25,priority:1});
 }
 impact({position,material='stone',ricochet=false}){
  const b=this.banks;if(!b)return;const d=this.distance(position);if(d>60)return;
  this.play(this.pick(b.impacts[material]||b.impacts.stone),{position,gain:MATERIAL_GAIN[material]??.5,rate:.9+this.rand()*.2,delay:d/SPEED_OF_SOUND,lowpass:this.air(d,false),reverb:.12+Math.min(.3,d/80),ref:1.6,rolloff:1.15,priority:0,model:d<12?'HRTF':'equalpower'});
  if(ricochet&&(material==='metal'||material==='stone')&&this.rand()<.18)this.play(this.pick(b.ricochet),{position,gain:.45,rate:.85+this.rand()*.3,delay:d/SPEED_OF_SOUND,reverb:.25,ref:3,rolloff:1,priority:0});
 }
 whiz(position){const b=this.banks;if(!b)return;this.play(this.pick(b.whiz),{position,gain:.75,rate:.9+this.rand()*.25,reverb:.05,ref:1,rolloff:1.4,priority:2});}
 casing(position,local=false,delay=null){const b=this.banks;if(!b)return;if(local)this.play(this.pick(b.casing),{gain:.08,rate:.92+this.rand()*.16,reverb:.05,delay:delay??.32+this.rand()*.18,priority:0});else{if(this.distance(position)>8)return;this.play(this.pick(b.casing),{position,gain:.35,rate:.9+this.rand()*.2,delay:.32+this.rand()*.18,ref:.8,rolloff:1.5,model:'equalpower',priority:0});}}
 // One confirmation per 60 ms: a spray that connects ticks, it does not buzz.
 hitConfirm({headshot=false,helmet=false}={}){const b=this.banks;if(!b||!this.ctx)return;const t=this.ctx.currentTime;if(t-(this.hitAt||-1)<.06&&!headshot)return;this.hitAt=t;const G=this.gains;
  this.play(headshot?b.hit.head:b.hit.body,{gain:headshot?G.head:G.body,rate:.98+this.rand()*.04,reverb:.03,priority:3});if(headshot&&helmet)this.play(b.helmet,{gain:.3,rate:.97+this.rand()*.05,reverb:.06,delay:.004,priority:3});}
 // Whole-tone steps per kill in the round, capped at the fifth.
 kill({streak=1,headshot=false}={}){const b=this.banks;if(!b)return;this.play(b.kill,{gain:headshot?.3:.24,rate:Math.pow(2,Math.min(4,Math.max(0,streak-1))/6),reverb:.04,delay:.03,priority:3});}
 hurt(heavy=false){const b=this.banks;if(!b)return;this.play(this.pick(b.impacts.flesh),{gain:heavy?.75:.55,rate:.75+this.rand()*.1,lowpass:2200,reverb:.02,priority:3});}
 dry(){if(this.banks)this.play(this.banks.dry,{gain:.35,reverb:.05,priority:2});}
 equip(melee=false){const b=this.banks;if(!b)return;this.play(b.foley.draw,{gain:melee?.25:.3,rate:melee?1.25:.95+this.rand()*.1,reverb:.06,priority:1});}
 knife({heavy=false,hit=false}={}){const b=this.banks;if(!b)return;this.play(b.foley.swish,{gain:heavy?.45:.35,rate:heavy?.8:1.05+this.rand()*.1,reverb:.05,priority:2});if(hit)this.play(this.pick(b.impacts.flesh),{gain:.55,rate:.85,reverb:.04,delay:.06,priority:2});}
 scrape({position,material='stone'}={}){const b=this.banks;if(!b)return;const hard=material==='metal'||material==='stone',d=this.distance(position);this.play(hard?b.scrape:this.pick(b.impacts[material]||b.impacts.stone),{position,gain:hard?(material==='metal'?.6:.42):.4,rate:(hard?.94:1.15)+this.rand()*.12,delay:d/SPEED_OF_SOUND,reverb:.1,ref:1.6,rolloff:1.2,priority:2});}
 // Magazine weapons: release, magazine out, magazine seated, bolt release. Remote reloads are positional.
 reload(owner,weapon,duration,position=null){
  const b=this.banks;if(!b||!this.ctx)return;this.cancelReload(owner);const t0=this.ctx.currentTime,f=b.foley,list=weapon===0?[[.05,f.cloth,.3],[.18,f.magout,.7],[.62,f.magin,.85],[.86,f.slide,.8]]:weapon===4?[[.05,f.cloth,.3],[.14,f.bolt,.6],[.4,f.magout,.7],[.62,f.magin,.75],[.82,f.bolt,.8]]:[[.04,f.cloth,.3],[.16,f.magout,.75],[.58,f.magin,.9],[.82,f.bolt,.85]];
  const d=position?this.distance(position):0;if(position&&d>22)return;
  const sources=list.map(([at,buffer,gain])=>this.play(buffer,{position,gain:gain*(position?.8:.42),at:t0+at*duration+(position?d/SPEED_OF_SOUND:0),reverb:.06,ref:1.2,rolloff:1.3,model:'equalpower',priority:1})).filter(Boolean);this.reloads.set(owner,sources);
 }
 cancelReload(owner){for(const s of this.reloads.get(owner)||[])try{s.stop();}catch{}this.reloads.delete(owner);}
 cycle(){const b=this.banks;if(b)this.play(b.foley.bolt,{gain:.4,reverb:.06,priority:2});}
 // Smoke canister: a dull pop and a two-second hiss of pink noise, made once on first use.
 smoke(position){const b=this.banks;if(!b||!this.ctx)return;const c=this.ctx,d=this.distance(position);
  if(!this.hiss){const n=Math.ceil(2.8*c.sampleRate),buffer=c.createBuffer(1,n,c.sampleRate),data=noiseData(n,'pink',rng(9601));for(let i=0;i<n;i++){const t=i/c.sampleRate;data[i]*=Math.min(1,t/.05)*Math.exp(-t*1.05)*1.6;}buffer.copyToChannel(data,0);this.hiss=buffer;}
  this.play(b.foley.bolt,{position,gain:.5,rate:.55,delay:d/SPEED_OF_SOUND,lowpass:this.air(d,false),reverb:.3,ref:3,priority:2});
  this.play(this.hiss,{position,gain:.6,delay:d/SPEED_OF_SOUND+.03,lowpass:Math.min(5200,this.air(d,false)),reverb:.35,ref:4,rolloff:.9,priority:2});}
 buy(){const b=this.banks;if(b)this.play(b.foley.magin,{gain:.22,reverb:0,priority:1});}
 // HE: the bomb's blast sample, shorter and smaller. Fire: a muffled whump and the smoke hiss as crackle.
 he(position){const b=this.banks;if(!b)return;const d=this.distance(position);this.play(b.explosion,{position,gain:.62,rate:1.35,delay:d/SPEED_OF_SOUND,lowpass:this.air(d*.7,false),reverb:.6,ref:8,rolloff:.85,priority:3});}
 ignite(position){const b=this.banks;if(!b)return;const d=this.distance(position);this.play(b.explosion,{position,gain:.3,rate:.7,delay:d/SPEED_OF_SOUND,lowpass:Math.min(1800,this.air(d,false)),reverb:.4,ref:6,priority:2});this.smoke(position);}
 flashBang(position){const b=this.banks;if(!b)return;const d=this.distance(position);this.play(b.flash,{position,gain:1,delay:d/SPEED_OF_SOUND,lowpass:this.air(d,false),reverb:.5,ref:6,rolloff:.8,priority:3});}
 explosion(position){const b=this.banks;if(!b)return;const d=this.distance(position);this.play(b.explosion,{position,gain:1,delay:d/SPEED_OF_SOUND,lowpass:this.air(d*.6,false),reverb:.7,ref:10,rolloff:.6,priority:3});}
 beep(position){if(this.banks)this.play(this.banks.beep,{position,gain:.5,reverb:.12,ref:2.5,rolloff:1,model:'equalpower',priority:2});}
 radio(win=null){const b=this.banks;if(!b)return;if(win===null)this.play(b.radio,{gain:.16,reverb:0,priority:2});else this.play(win?b.win:b.lose,{gain:.12,reverb:.15,priority:2});}
 // Temporary threshold shift: muffled hearing and a fading tinnitus tone after a flash or blast.
 deafen(strength=1,seconds=3){
  const c=this.ctx;if(!c||strength<=.05)return;const t=c.currentTime;
  this.hearing.frequency.cancelScheduledValues(t);this.hearing.frequency.setValueAtTime(Math.max(350,2400*(1-strength)+350),t);this.hearing.frequency.exponentialRampToValueAtTime(20000,t+seconds);
  for(const f of [3600,3611]){const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035*strength,t+.05);g.gain.exponentialRampToValueAtTime(.0001,t+seconds*1.1);o.connect(g).connect(this.master);o.start(t);o.stop(t+seconds*1.15);o.onended=()=>{o.disconnect();g.disconnect();};}
 }
 tick(now,{hp=100,alive=false}={}){if(!this.banks||!this.ctx||!alive||hp>30)return;const period=.52+hp/30*.35;if(now-this.heartAt>=period*1000){this.heartAt=now;this.play(this.banks.heart,{gain:.18*(1.2-hp/30),reverb:0,lowpass:600,priority:1});}}
}
