// V32 equipment inspection (F). The right wrist turns the weapon about its own grip
// while the shoulders stay with the body; the left hand rides the fore-end and leaves
// it only to do something: thumb the magazine out and slap it home (rifles, SMG,
// pistol), lift and draw the bolt (sniper). The
// knife is cocked, shown flat on both sides and tossed end over end into the catch.
// Keys are interpolated with cubic Hermite curves (no stop at every key), with a
// little anticipation before each move and overshoot after it, and a faint breathing
// drift while a pose is held, so the piece has weight in the hand.
// Channels: x y z (m) · pitch yaw roll (rad, about the grip) · hand (left hand off the
// fore-end, 0–1) · target (0 = the part it works, 1 = lowered out of the way) · mag
// (magazine out, 0–1) · bolt (slide/bolt drawn, 0–1; knife: turns of the toss).
const KEYS=['x','y','z','pitch','yaw','roll','hand','target','mag','bolt','carry','alt'];
const CLASSES={
 // Rifles: port side first (muzzle swung right, receiver brought to the centre and canted
 // so the top shows), then over to the left profile, where the support hand thumbs the
 // magazine out, looks, and slaps it home before taking the fore-end again.
 rifle:{ms:4300,keys:[
  [0,0,0,0,0,0,0,0,0,0,0],
  [0.05,0.004,-0.008,0.006,-0.05,0.03,0.05,0,0,0,0],
  [0.17,-0.05,0.045,-0.13,0.16,-0.1,0.78,0,0,0,0],
  [0.3,-0.055,0.05,-0.133,0.14,-0.12,0.84,0,0,0,0],
  [0.38,-0.05,0.045,-0.1,0.14,-0.1,0.12,0,0,0,0],
  [0.48,-0.02,0.042,-0.13,0.1,0.408,-0.32,0,0,0,0],
  [0.56,-0.025,0.047,-0.135,0.08,0.435,-0.36,0,0,0,0],
  [0.62,-0.02,0.042,-0.129,0.04,0.394,-0.255,0.6,0,0,0],
  [0.665,-0.02,0.04,-0.128,0.02,0.381,-0.229,1,0,0,0],
  [0.71,-0.02,0.042,-0.128,-0.03,0.381,-0.269,1,0,1,0],
  [0.79,-0.02,0.042,-0.127,-0.02,0.374,-0.267,1,0,1,0],
  [0.825,-0.02,0.054,-0.126,0.06,0.36,-0.221,1,0,0,0],
  [0.85,-0.018,0.044,-0.121,0.01,0.34,-0.213,1,0,0,0],
  [0.92,-0.006,0.014,-0.042,0.02,0.14,-0.02,0.15,0,0,0],
  [1,0,0,0,0,0,0,0,0,0,0]
 ]},
 // Pistol: the support hand drops away, the wrist shows the left flank, then the right
 // flank in the middle of the view; then the magazine drops into the waiting palm, is
 // looked at and slapped home.
 pistol:{ms:3700,keys:[
  [0,     0,0,0,             0,0,0,           0,0,0,0],
  [.05,   0,-.006,.004,      -.05,-.02,.04,   .3,1,0,0],
  [.17,   -.03,.045,-.05,    .14,.72,-.14,    1,1,0,0],
  [.3,    -.035,.05,-.055,   .11,.8,-.2,      1,1,0,0],
  [.38,   -.06,.05,-.05,     .16,.2,.05,      1,1,0,0],
  [.47,   -.105,.05,-.045,   .14,-.55,.3,     1,1,0,0],
  [.58,   -.11,.052,-.045,   .12,-.6,.34,     1,1,0,0],
  [.66,   -.04,.05,-.05,     .1,.34,-.08,     1,0,0,0],
  [.72,   -.04,.052,-.052,   .05,.38,-.12,    1,0,1,0],
  [.8,    -.04,.052,-.052,   .06,.37,-.11,    1,0,1,0],
  [.83,   -.04,.062,-.05,    .14,.35,-.09,    1,0,0,0],
  [.91,   -.01,.016,-.02,    .03,.1,-.04,     .25,0,0,0],
  [1,     0,0,0,             0,0,0,           0,0,0,0]
 ]},
 // Sniper: left profile, then the bolt side, then the rifle is canted top-up and the
 // support hand runs forward along the fore-end and back (bolt channel = the slide).
 sniper:{ms:4500,keys:[
  [0,0,0,0,0,0,0,0,0,0,0],
  [0.05,0,-0.008,0.006,-0.04,-0.02,0.05,0.3,1,0,0],
  [0.19,-0.03,0.035,-0.04,0.12,0.42,-0.2,1,1,0,0],
  [0.32,-0.035,0.04,-0.045,0.1,0.47,-0.24,1,1,0,0],
  [0.42,-0.07,0.045,-0.03,0.14,-0.05,0.1,1,1,0,0],
  [0.52,-0.1,0.045,-0.02,0.12,-0.32,0.32,1,1,0,0],
  [0.6,-0.1,0.045,-0.02,0.1,-0.34,0.34,1,1,0,0],
  [0.67,-0.035,0.045,-0.035,0.06,0.34,-0.04,1,0,0,0],
  [0.74,-0.03,0.04,-0.04,0.02,0.3,-0.08,1,0,0,1],
  [0.8,-0.03,0.04,-0.04,0.02,0.3,-0.08,1,0,0,1],
  [0.86,-0.03,0.042,-0.035,0.05,0.3,-0.06,1,0,0,0.1],
  [0.94,0,0.008,-0.008,0.02,0.02,0.01,0.15,0,0,0],
  [1,0,0,0,0,0,0,0,0,0,0]
 ]},
 knife:{ms:3200,keys:[
  [0,     0,0,0,        0,0,0,          0,0,0,0],
  [.08,   .005,-.006,.004,-.08,-.04,.08, 0,0,0,0],
  [.2,    .0,.03,-.03,   .22,.4,-1.05,  0,0,0,0],
  [.32,   .0,.032,-.032, .2,.44,-1.12,  0,0,0,0],
  [.44,   .0,.035,-.03,  .26,.18,.85,   0,0,0,0],
  [.53,   .0,.02,-.02,   .12,.12,.6,    0,0,0,0],
  [.57,   .0,.006,-.008, -.1,.06,.2,    0,0,0,0],
  [.61,   .0,.045,-.02,  .22,.04,.08,   0,0,0,.12],
  [.77,   .0,.03,-.02,   .08,.02,.02,   0,0,0,.9],
  [.81,   .0,-.004,-.01, -.08,.0,-.05,  0,0,0,1],
  [.88,   .0,.008,-.008, .06,.06,-.28,  0,0,0,1],
  [1,     0,0,0,        0,0,0,          0,0,0,1]
 ]}
};
CLASSES.smg={ms:4000,keys:CLASSES.rifle.keys.map(f=>[f[0],f[1]*.85,f[2]*.9,f[3]*.85,f[4],f[5]*.92,f[6]*.92,...f.slice(7)])};
// Reloads (V32), timed to the foley already scheduled by the audio engine: rifles and
// SMG magazine out at 16 %, seated at 58 %, bolt at 82 %; pistol 18/62/86 %; M24 bolt
// 14 %, two rounds thumbed in at 40 and 62 %, bolt closed at 82 %. The support hand
// takes the magazine out, carries it down out of view (carry = the magazine travels
// in the palm), comes back with the fresh one, seats it with a bump and returns to the
// fore-end. Extra channels: carry (0–1) and alt (MP5: the forward cocking handle).
const RELOADS={
 rifle:{keys:[
  [0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0.07,-0.0235,0.0494,-0.008,0.12,0.22,-0.3125,0.65,0,0,0,0,0],
  [0.13,-0.03,0.061,-0.012,0.16,0.28,-0.44,1,0,0,0,0,0],
  [0.17,-0.032,0.057,-0.012,0.13,0.28,-0.46,1,0,0.35,0,0,0],
  [0.23,-0.032,0.059,-0.012,0.14,0.28,-0.46,1,0,1,0,0,0],
  [0.27,-0.032,0.06,-0.012,0.14,0.28,-0.46,1,0.12,1,0,1,0],
  [0.36,-0.028,0.065,-0.01,0.16,0.26,-0.42,1,1,1,0,1,0],
  [0.43,-0.028,0.067,-0.01,0.17,0.26,-0.42,1,1,1,0,1,0],
  [0.52,-0.032,0.065,-0.012,0.16,0.28,-0.46,1,0,1,0,1,0],
  [0.555,-0.032,0.063,-0.012,0.15,0.28,-0.46,1,0,0.75,0,0,0],
  [0.58,-0.032,0.071,-0.012,0.21,0.28,-0.48,1,0,0,0,0,0],
  [0.62,-0.032,0.061,-0.012,0.14,0.28,-0.44,1,0,0,0,0,0],
  [0.71,-0.027,0.057,-0.008,0.13,0.24,-0.34,0.3,0,0,0,0,0],
  [0.77,-0.023,0.054,-0.005,0.12,0.21,-0.24,0,0,0,0,0,0],
  [0.82,-0.012,0.034,-0.002,0.148,0.126,-0.136,0,0,0,0.35,0,0],
  [0.86,-0.004,0.012,0,0.036,0.052,-0.062,0,0,0,0,0,0],
  [1,0,0,0,0,0,0,0,0,0,0,0,0]
 ]},
 pistol:{keys:[
  [0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0.08,-0.028,0.063,-0.012,0.17,0.26,-0.26,0.7,0,0,0,0,0],
  [0.15,-0.03,0.071,-0.016,0.2,0.3,-0.32,1,0,0,0,0,0],
  [0.19,-0.03,0.067,-0.016,0.17,0.3,-0.33,1,0,0.4,0,0,0],
  [0.25,-0.03,0.069,-0.016,0.18,0.3,-0.33,1,0,1,0,0,0],
  [0.28,-0.03,0.07,-0.016,0.18,0.3,-0.33,1,0.12,1,0,1,0],
  [0.38,-0.028,0.075,-0.014,0.2,0.28,-0.3,1,1,1,0,1,0],
  [0.45,-0.028,0.075,-0.014,0.2,0.28,-0.3,1,1,1,0,1,0],
  [0.56,-0.03,0.071,-0.016,0.18,0.3,-0.33,1,0,1,0,1,0],
  [0.6,-0.03,0.069,-0.016,0.17,0.3,-0.33,1,0,0.75,0,0,0],
  [0.62,-0.03,0.077,-0.016,0.24,0.3,-0.34,1,0,0,0,0,0],
  [0.67,-0.03,0.069,-0.016,0.17,0.29,-0.31,1,0,0,0,0,0],
  [0.78,-0.024,0.057,-0.008,0.13,0.22,-0.18,0.25,0,0,0,0,0],
  [0.86,-0.004,0.017,-0.002,0.136,0.052,-0.052,0,0,0,0,0,0],
  [0.9,0,0.003,0,0.02,0.01,-0.02,0,0,0,0,0,0],
  [1,0,0,0,0,0,0,0,0,0,0,0,0]
 ]},
 // M24: port canted up, the thumb pushes two rounds in (mag channel = thumb press).
 sniper:{work:'port',keys:[
  [0,     0,0,0,              0,0,0,          0,0,0,0,0,0],
  [.1,    -.025,.02,-.01,     .06,-.14,.36,   .5,0,0,0,0,0],
  [.14,   -.025,.024,-.01,    .1,-.15,.38,    .7,0,0,0,0,0],
  [.22,   -.028,.022,-.012,   .07,-.16,.4,    1,0,0,0,0,0],
  [.36,   -.028,.022,-.012,   .07,-.16,.4,    1,0,0,0,0,0],
  [.4,    -.028,.018,-.012,   .09,-.16,.41,   1,0,1,0,0,0],
  [.46,   -.028,.022,-.012,   .07,-.16,.4,    1,0,0,0,0,0],
  [.58,   -.028,.022,-.012,   .07,-.16,.4,    1,0,0,0,0,0],
  [.62,   -.028,.018,-.012,   .09,-.16,.41,   1,0,1,0,0,0],
  [.68,   -.028,.022,-.012,   .07,-.16,.4,    1,0,0,0,0,0],
  [.77,   -.012,.012,-.006,   .05,-.08,.2,    0,0,0,0,0,0],
  [.82,   -.004,.008,-.002,   .1,-.04,.1,     0,0,0,0,0,0],
  [.87,   0,.003,0,           .02,-.01,.03,   0,0,0,0,0,0],
  [1,     0,0,0,              0,0,0,          0,0,0,0,0,0]
 ]}
};
// MP5: the same magazine change, then the HK slap on the forward cocking handle.
RELOADS.smg={keys:RELOADS.rifle.keys.filter(f=>f[0]<.7).concat([
  [.72,   -.008,.014,-.01,    .06,.08,-.26,   1,0,0,0,0,.6],
  [.78,   -.006,.014,-.01,    .06,.06,-.2,    1,0,0,.6,0,1],
  [.82,   -.004,.004,-.008,   .12,.05,-.16,   1,0,0,0,0,1],
  [.88,   -.002,.006,-.004,   .04,.03,-.08,   .35,0,0,0,0,.3],
  [.94,   0,.002,0,           .01,.01,-.02,   0,0,0,0,0,0],
  [1,     0,0,0,              0,0,0,          0,0,0,0,0,0]])};
// Hermite tangents: the mean of neighbouring slopes, zero where the curve turns,
// so a held pose never overshoots past the keys it sits between.
const tangents=k=>k.map((f,i)=>f.slice(1).map((v,ch)=>{
 if(i===0||i===k.length-1)return 0;const a=(v-k[i-1][ch+1])/(f[0]-k[i-1][0]),b=(k[i+1][ch+1]-v)/(k[i+1][0]-f[0]);return a*b<=0?0:(a+b)/2;}));
for(const c of [...Object.values(CLASSES),...Object.values(RELOADS)]){for(const f of c.keys)while(f.length<KEYS.length+1)f.push(0);c.tangents=tangents(c.keys);}
export const INSPECTION_MS=CLASSES.rifle.ms;
export const classOf=weapon=>weapon===0?'pistol':weapon===1?'smg':weapon===4?'sniper':weapon===5?'knife':'rifle';
export const inspectionMs=weapon=>CLASSES[classOf(weapon)].ms;
const REST=Object.freeze(Object.fromEntries(KEYS.map(k=>[k,0])));
function sample(c,t){
 const k=c.keys;let n=1;while(n<k.length-1&&k[n][0]<t)n++;
 const a=k[n-1],b=k[n],h=b[0]-a[0],u=(t-a[0])/h,u2=u*u,u3=u2*u;
 const h00=2*u3-3*u2+1,h10=u3-2*u2+u,h01=-2*u3+3*u2,h11=u3-u2,ta=c.tangents[n-1],tb=c.tangents[n];
 const pose={};KEYS.forEach((key,i)=>{pose[key]=h00*a[i+1]+h10*h*ta[i]+h01*b[i+1]+h11*h*tb[i];});
 for(const key of ['hand','target','mag','bolt','carry','alt'])pose[key]=Math.max(0,Math.min(1,pose[key]));
 return pose;
}
export function inspectionPose(progress,weapon=3){
 const t=Math.max(0,Math.min(1,progress)),c=CLASSES[classOf(weapon)];
 if(t===0||t===1)return {...REST,bolt:t===1&&weapon===5?1:0};
 const pose=sample(c,t);
 // Breathing drift while the piece is held up to the light (zero at both ends).
 const life=Math.sin(Math.PI*t)**2,s=t*c.ms/1000;
 pose.pitch+=life*.006*Math.sin(s*2.1);pose.yaw+=life*.008*Math.sin(s*1.37+1);pose.roll+=life*.01*Math.sin(s*1.71+2);
 return pose;
}
// Reload pose at progress 0–1 (null for the knife); drop is the magazine travel in metres.
export function reloadPose(progress,weapon=3){
 const cls=classOf(weapon);if(cls==='knife')return null;const c=RELOADS[cls];const t=Math.max(0,Math.min(1,progress));
 const pose=t===0||t===1?{...REST}:sample(c,t);pose.reload=true;pose.drop=.2;if(c.work)pose.work=c.work;return pose;
}
export class WeaponInspection{
 constructor(){this.duration=INSPECTION_MS;this.cancel();}
 cancel(){this.started=-Infinity;}
 request(now,allowed=true,weapon=3){if(!allowed||this.active(now))return false;this.started=now;this.duration=inspectionMs(weapon);this.weapon=weapon;return true;}
 active(now){return now>=this.started&&now-this.started<this.duration;}
 progress(now){return this.active(now)?(now-this.started)/this.duration:0;}
 sample(now,weapon){return this.active(now)?inspectionPose(this.progress(now),weapon):null;}
}
