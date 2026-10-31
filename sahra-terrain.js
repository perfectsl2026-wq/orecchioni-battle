const clamp=t=>Math.max(0,Math.min(1,t));
// Authored stair runs. `low` is the floor height on the x0 / z0 side and `rise`
// the signed change to the far side; the first tread continues the near floor,
// so every riser faces +x / +z and is drawn by the tread before it.
export const SAHRA_STAIR_RUNS=[
 {id:'piazza',axis:'z',x0:-10,x1:12,z0:0,z1:4,low:.8,rise:-.8,count:4},
 {id:'loggia',axis:'z',x0:6,x1:12,z0:-26,z1:-22,low:1.6,rise:-.8,count:4},
 {id:'vicolo',axis:'z',x0:14,x1:20,z0:-24,z1:-20,low:1.6,rise:-.8,count:4},
 {id:'hammam',axis:'x',x0:-14,x1:-10,z0:-8,z1:0,low:0,rise:.8,count:4},
 {id:'terrazza',axis:'x',x0:-40,x1:-34,z0:-42,z1:-34,low:1.2,rise:-1.2,count:6}
];
export const sahraStairAt=(x,z)=>SAHRA_STAIR_RUNS.find(s=>x>=s.x0&&x<s.x1&&z>=s.z0&&z<s.z1);
const tread=(t,n)=>Math.min(n-1,Math.floor(clamp(t)*n))/n;
const inside=(x,z,x0,x1,z0,z1)=>x>=x0&&x<=x1&&z>=z0&&z<=z1;
// One shared height field drives paving, feet, ray cover and grenade bounces.
// Levels: lanes and T side 0 m, upper piazza and mid links 0.8 m, CT plateau and
// A site 1.6 m, B terrace 1.2 m. Ramps are linear, stairs are authored treads.
export function sahraGround(x,z){
 const run=sahraStairAt(x,z);
 if(run){const t=run.axis==='z'?(z-run.z0)/(run.z1-run.z0):(x-run.x0)/(run.x1-run.x0);return run.low+run.rise*tread(t,run.count);}
 // CT plateau, A site, the CT connector and the A-link landing.
 if(inside(x,z,-2,22,-52,-34)||inside(x,z,14,46,-44,-24)||inside(x,z,6,12,-36,-26))return 1.6;
 // A main ramp falls from the site to the fountain court.
 if(inside(x,z,28,40,-24,-12))return 1.6*clamp((-12-z)/12);
 // Upper piazza, loggia foot, A link and the passage between them.
 if(inside(x,z,-10,22,-24,0))return .8;
 // CT walk to B descends gently towards the kasbah.
 if(inside(x,z,-32,-2,-50,-41))return 1.6*clamp((x+24)/18);
 // Raised B terrace on the west edge of the site. Its open edges sit 1 cm inside
 // the parapets so the drawn ground never slopes out from under them; along the
 // stair it meets the first tread exactly.
 if(inside(x,z,-48,-40,-42.5,-34)||inside(x,z,-48,-40.01,-42.5,-32.01))return 1.2;
 return 0;
}
