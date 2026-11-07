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
 // Rifles (V42): the ejection side first, canted top-up, then a swing through to the left
 // profile held up broadside in the middle of the view, where the support hand thumbs the
 // magazine out, looks at it and slaps it home. Yaw does the showing; roll only cants. V42 review: both
 // profiles are held 4-13 cm further out (as far as the trigger arm reaches), so the rifle stays in the frame.
 rifle:{ms:4300,keys:[
  [0,     0,0,0,              0,0,0,          0,0,0,0],
  [.06,   .006,-.01,.004,     -.04,.06,-.06,  0,0,0,0],
  [.18,   .01,.02,-.13,       .1,-.86,.34,    1,1,0,0],
  [.31,   .008,.022,-.135,    .11,-.84,.38,   1,1,0,0],
  [.39,   -.035,.03,-.012,    .07,0,.1,       0,0,0,0],
  [.5,    -.02,.045,-.08,     .1,.97,-.2,     0,0,0,0],
  [.6,    -.024,.05,-.085,    .12,.97,-.25,   0,0,0,0],
  [.66,   -.03,.038,-.07,     .1,.55,-.18,    .7,0,0,0],
  [.70,   -.03,.036,-.06,     .1,.48,-.16,    1,0,0,0],
  [.74,   -.03,.032,-.06,     .08,.48,-.16,   1,0,1,0],
  [.82,   -.03,.036,-.06,     .11,.5,-.2,     1,0,1,0],
  [.855,  -.03,.046,-.06,     .18,.47,-.16,   1,0,0,0],
  [.92,   -.008,.01,-.004,    .03,.08,-.03,   .15,0,0,0],
  [1,     0,0,0,              0,0,0,          0,0,0,0]
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
 // OB-510 AVERLA (V42): the left flank held up broadside, the swing through to the ejection side, then back to the
 // left, canted: the support hand drops the detachable magazine into the palm, looks at it and seats it with a bump,
 // draws the straight-pull bolt fully back by the left handle, lets go so the open chamber and its round show, then
 // drives it home and takes the forward grip again. The light wave runs at 28 % and 87 % (game.js).
 sniper:{ms:5200,keys:[
  [0,     0,0,0,              0,0,0,          0,0,0,0,0,0],
  [.05,   0,-.006,.004,       -.03,.03,.04,   0,0,0,0,0,0],
  [.17,   -.05,.06,-.04,      .14,.6,-.2,     0,0,0,0,0,0],
  [.29,   -.055,.064,-.045,   .12,.64,-.24,   0,0,0,0,0,0],
  [.38,   -.03,.06,-.03,      .1,.05,.1,      0,0,0,0,0,0],
  [.47,   -.01,.06,-.05,      .12,-.5,.32,    0,0,0,0,0,0],
  [.55,   -.01,.062,-.05,     .1,-.52,.34,    0,0,0,0,0,0],
  [.62,   -.05,.06,-.03,      .12,.38,-.3,    1,0,0,0,0,0],
  [.65,   -.05,.058,-.03,     .11,.38,-.3,    1,0,1,0,0,0],
  [.675,  -.05,.06,-.03,      .12,.38,-.3,    1,0,1,0,1,0],
  [.73,   -.05,.062,-.03,     .13,.4,-.32,    1,.22,1,0,1,0],
  [.775,  -.05,.06,-.03,      .12,.38,-.3,    1,0,.45,0,1,0],
  [.8,    -.05,.07,-.03,      .16,.38,-.32,   1,0,0,0,0,0],
  [.83,   -.05,.062,-.03,     .12,.38,-.3,    1,0,0,0,0,1],
  [.855,  -.05,.06,-.03,      .11,.38,-.3,    1,0,0,1,0,1],
  [.885,  -.052,.066,-.034,   .16,.44,-.4,    1,.5,0,1,0,0],
  [.905,  -.052,.067,-.034,   .17,.45,-.41,   1,.5,0,1,0,0],
  [.93,   -.05,.06,-.03,      .12,.39,-.31,   1,0,0,1,0,1],
  [.95,   -.048,.058,-.026,   .1,.37,-.28,    1,0,0,0,0,1],
  [.978,  -.012,.012,-.006,   .03,.08,-.06,   .25,0,0,0,0,0],
  [1,     0,0,0,              0,0,0,          0,0,0,0,0,0]
 ]},
 // Knife (V44): both flats shown broadside, the spine rolled up to the light, then cocked down and tossed end over end
 // into the catch. V44 review: the old keys held each pose with zeroed tangents (five dead stops in 3.2 s), snapped from
 // the spine to the cock in 130 ms (7.9 rad/s, 187 rad/s2) and caught the toss dead. One key per pose now, on
 // non-zeroed Catmull-Rom tangents (`smooth`: the wrist keeps travelling through a pose instead of stopping in it), the
 // cock stretched over about 300 ms with an overshoot down before the flick, and the catch eased: the spin slows into
 // the palm (monotone tangent on the turn channel) while the wrist gives a little down and comes back up.
 knife:{ms:3200,smooth:true,keys:[
  [0,     0,0,0,              0,0,0,          0,0,0,0],
  [.08,   .004,-.008,.004,    -.07,.06,.07,   0,0,0,0],
  [.27,   -.01,.03,-.03,      .23,-.86,.07,   0,0,0,0],
  [.48,   -.008,.034,-.028,   .2,-.2,.94,     0,0,0,0],
  [.575,  -.002,.014,-.014,   .02,-.02,.42,   0,0,0,0],
  [.635,  0,.002,-.006,       -.13,.05,.12,   0,0,0,0],
  [.67,   0,.03,-.016,        .14,.04,.05,    0,0,0,.05],
  [.745,  0,.036,-.019,       .11,.03,.03,    0,0,0,.5],
  [.81,   0,.026,-.018,       .06,.02,0,      0,0,0,.95],
  [.84,   0,-.004,-.01,       -.04,0,-.06,    0,0,0,1],
  [.885,  0,.006,-.008,       .05,.05,-.22,   0,0,0,1],
  [1,     0,0,0,              0,0,0,          0,0,0,1]
 ]}
};
// RONCOLA: its long fixed stock ran past the right edge in the left profile, so the whole profile is held further left and a little higher.
CLASSES.ak={ms:4300,keys:CLASSES.rifle.keys.map(f=>{const m=f[0]>.36&&f[0]<.9?Math.min(1,(f[0]-.36)/.06,(.9-f[0])/.06):0;return [f[0],f[1]-.045*m,f[2]+.015*m,...f.slice(3)];})};
CLASSES.smg={ms:4000,keys:CLASSES.rifle.keys.map(f=>[f[0],f[1]*.85,f[2]*.9,f[3]*.85,f[4],f[5]*.92,f[6]*.92,...f.slice(7)])};
// Reloads (V32), timed to the foley already scheduled by the audio engine: rifles and
// SMG magazine out at 16 %, seated at 58 %, bolt at 82 %; pistol 18/62/86 %; precision rifle bolt
// back 14 %, magazine out 40 %, seated 62 %, bolt home 82 %. The support hand
// takes the magazine out, carries it down out of view (carry = the magazine travels
// in the palm), comes back with the fresh one, seats it with a bump and returns to the
// fore-end. Extra channels: carry (0–1) and alt (submachine gun: the forward cocking handle; OB-510 AVERLA: the left bolt handle).
// V42 reloads, one per weapon, timed to the foley (audio-engine reload lists). The rifle is canted
// so the magazine well faces the support hand and stays low on the right: the old pose lifted
// the stock tube across the picture. Order: thumb the release, yank the magazine (a dip), carry it
// down out of view, come back with the fresh one, seat it with an upward bump, then work the
// action with the hand: TARLO pulls the rear charging handle, RONCOLA turns its right side up and
// racks the handle there, ASSILLO slaps the forward cocking handle, SMERIGLIO's thumb drops the slide
// (an over-the-top rack swept the whole forearm across the picture). Channels after the six pose ones: hand target mag bolt carry alt.
const RELOADS={
 rifle:{keys:[
  [0,     0,0,0,                0,0,0,           0,0,0,0,0,0],
  [.06,   -.006,-.012,.006,     .02,.02,-.14,    .35,0,0,0,0,0],
  [.12,   -.02,.004,0,          .1,.06,-.52,     1,0,0,0,0,0],
  [.15,   -.02,.002,0,          .1,.06,-.56,     1,0,.25,0,0,0],
  [.19,   -.021,-.008,0,        .06,.06,-.58,    1,0,1,0,0,0],
  [.24,   -.02,0,0,             .09,.06,-.56,    1,.35,1,0,1,0],
  [.31,   -.02,0,0,             .1,.06,-.56,     1,1,1,0,1,0],
  [.40,   -.02,.002,0,          .11,.07,-.57,    1,1,1,0,1,0],
  [.48,   -.02,.004,0,          .12,.07,-.58,    1,.15,1,0,1,0],
  [.53,   -.02,.004,0,          .12,.07,-.58,    1,0,.45,0,1,0],
  [.58,   -.02,.014,0,          .18,.07,-.6,     1,0,0,0,0,0],
  [.62,   -.02,.002,0,          .1,.07,-.56,     1,0,0,0,0,0],
  [.70,   -.016,.004,0,         .08,.02,-.4,     1,0,0,0,0,.8],
  [.76,   -.014,.004,0,         .08,0,-.36,      1,0,0,0,0,1],
  [.81,   -.012,-.004,.01,      .05,0,-.34,      1,0,0,1,0,1],
  [.84,   -.01,.008,0,          .12,0,-.3,       .9,0,0,0,0,.8],
  [.92,   -.004,.002,0,         .03,.01,-.1,     .2,0,0,0,0,0],
  [1,     0,0,0,                0,0,0,           0,0,0,0,0,0]
 ]},
 pistol:{keys:[
  [0,     0,0,0,                0,0,0,           0,0,0,0,0,0],
  [.07,   -.02,.05,-.01,        .14,.22,-.24,    .6,0,0,0,0,0],
  [.13,   -.03,.07,-.016,       .2,.3,-.32,      1,1,0,0,0,0],
  [.18,   -.03,.064,-.016,      .15,.3,-.34,     1,1,1,0,0,0],
  [.26,   -.03,.068,-.016,      .17,.3,-.33,     1,1,1,0,0,0],
  [.30,   -.03,.07,-.016,       .18,.3,-.33,     1,1,1,0,1,0],
  [.40,   -.028,.075,-.014,     .2,.28,-.3,      1,1,1,0,1,0],
  [.47,   -.028,.075,-.014,     .2,.28,-.3,      1,.2,1,0,1,0],
  [.56,   -.03,.071,-.016,      .18,.3,-.33,     1,0,.5,0,1,0],
  [.62,   -.03,.08,-.016,       .26,.3,-.34,     1,0,0,0,0,0],
  [.67,   -.03,.069,-.016,      .17,.28,-.3,     1,0,0,0,0,0],
  [.76,   -.02,.06,-.01,        .14,.18,-.2,     .6,0,0,0,0,0],
  [.84,   -.016,.056,-.008,     .12,.14,-.16,    .4,0,0,1,0,0],
  [.87,   -.01,.04,-.004,       .2,.1,-.1,       .3,0,0,0,0,0],
  [.93,   0,.006,0,             .04,.02,-.03,    .1,0,0,0,0,0],
  [1,     0,0,0,                0,0,0,           0,0,0,0,0,0]
 ]},
 // OB-510 AVERLA (V42): straight pull and detachable magazine, timed to the foley (bolt back 14 %, magazine out 40 %,
 // seated 62 %, bolt home 82 %). The rifle comes up a little and cants its left flank toward the hand; the support
 // hand draws the left bolt handle, thumbs the magazine out into the palm and carries it down out of view, brings the
 // fresh one up and seats it with a bump, then drives the bolt home and takes the forward grip again.
 sniper:{work:'mag4',keys:[
  [0,0,0,0,0,0,0,0,0,0,0,0,0],
  [.05,-.004,.026,.004,.02,.05,-.08,.4,0,0,0,0,.6],
  [.10,-.02,.085,-.01,.1,.32,-.3,1,0,0,0,0,1],
  [.14,-.02,.085,-.01,.1,.34,-.32,1,0,0,1,0,1],
  [.20,-.02,.085,-.01,.1,.34,-.32,1,0,0,1,0,.3],
  [.27,-.02,.08,-.01,.08,.3,-.34,1,0,0,1,0,0],
  [.36,-.02,.08,-.01,.08,.3,-.34,1,0,.3,1,0,0],
  [.40,-.02,.072,-.01,.06,.3,-.35,1,0,1,1,1,0],
  [.46,-.02,.076,-.01,.08,.3,-.34,1,.6,1,1,1,0],
  [.50,-.02,.076,-.01,.08,.3,-.34,1,1,1,1,1,0],
  [.55,-.02,.078,-.01,.09,.3,-.34,1,.3,1,1,1,0],
  [.59,-.02,.078,-.01,.09,.3,-.34,1,0,.45,1,1,0],
  [.62,-.02,.09,-.01,.14,.3,-.36,1,0,0,1,0,0],
  [.66,-.02,.08,-.01,.1,.31,-.33,1,0,0,1,0,.3],
  [.74,-.02,.082,-.01,.1,.32,-.32,1,0,0,1,0,1],
  [.82,-.018,.072,.006,.07,.3,-.3,1,0,0,0,0,1],
  [.87,-.012,.07,0,.1,.2,-.2,.8,0,0,0,0,.5],
  [.94,-.004,.028,0,.03,.05,-.05,.2,0,0,0,0,0],
  [1,0,0,0,0,0,0,0,0,0,0,0,0]
 ]}
};
// RONCOLA (V42 review): the same change, held higher and further out so the trigger hand stays in the
// picture; the rack keeps the left cant and the hand reaches over to the handle on the far side (turning
// the right side up put the whole forearm across the receiver).
RELOADS.ak={keys:RELOADS.rifle.keys.map(f=>{const m=f[0]>0&&f[0]<1?Math.min(1,f[0]/.12,(1-f[0])/.1):0;return [f[0],f[1]+.025*m,f[2]+.06*m,f[3]-.03*m,f[4],f[5]+.2*m,f[6]*(f[0]>.64?1.1:.85),...f.slice(7)];})};
// ASSILLO: the same change, then a slap on the forward cocking handle.
RELOADS.smg={keys:RELOADS.rifle.keys.filter(f=>f[0]<.66).concat([
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
// V42: the classic AVERLA design (the rig's own rifle) keeps the inspection and reload it had before the new model.
// V44 review: through both profiles the support hand stays on the fore-end (it was lowered out of the picture and hung
// open off the rifle); it leaves only to check the chamber at the open port.
CLASSES.sniperClassic={ms:4500,keys:[
  [0,0,0,0,0,0,0,0,0,0,0],
  [0.05,0,-0.008,0.006,-0.04,-0.02,0.05,0,0,0,0],
  [0.19,-0.03,0.035,-0.04,0.12,0.42,-0.2,0,0,0,0],
  [0.32,-0.035,0.04,-0.045,0.1,0.47,-0.24,0,0,0,0],
  [0.42,-0.07,0.045,-0.03,0.14,-0.05,0.1,0,0,0,0],
  [0.52,-0.1,0.045,-0.02,0.12,-0.32,0.32,0,0,0,0],
  [0.6,-0.1,0.045,-0.02,0.1,-0.34,0.34,0,0,0,0],
  [0.67,-0.035,0.045,-0.035,0.06,0.34,-0.04,1,0,0,0],
  [0.74,-0.03,0.04,-0.04,0.02,0.3,-0.08,1,0,0,1],
  [0.8,-0.03,0.04,-0.04,0.02,0.3,-0.08,1,0,0,1],
  [0.86,-0.03,0.042,-0.035,0.05,0.3,-0.06,1,0,0,0.1],
  [0.94,0,0.008,-0.008,0.02,0.02,0.01,0.15,0,0,0],
  [1,0,0,0,0,0,0,0,0,0,0]
 ]};
RELOADS.sniperClassic={work:'port',keys:[
  [0,0.000,0.000,0.000,0.000,0.000,0.000,0,0,0,0,0,0],
  [0.06,0.003,-0.010,0.004,0.020,-0.012,0.036,0.3,0,0,0,0,0],
  [0.12,0.027,-0.054,-0.010,0.135,-0.092,0.166,1,0,0,0,0,0.8],
  [0.15,0.028,-0.048,-0.006,0.120,-0.096,0.180,1,0,0,1,0,1],
  [0.22,0.030,-0.060,-0.010,0.150,-0.100,0.180,1,0,0,1,0,0],
  [0.36,0.030,-0.060,-0.010,0.150,-0.100,0.180,1,0,0,1,0,0],
  [0.4,0.030,-0.066,-0.010,0.170,-0.100,0.190,1,0,1,1,0,0],
  [0.46,0.030,-0.060,-0.010,0.150,-0.100,0.180,1,0,0,1,0,0],
  [0.58,0.030,-0.060,-0.010,0.150,-0.100,0.180,1,0,0,1,0,0],
  [0.62,0.030,-0.066,-0.010,0.170,-0.100,0.190,1,0,1,1,0,0],
  [0.68,0.030,-0.060,-0.010,0.150,-0.100,0.180,1,0,0,1,0,0],
  [0.76,0.027,-0.060,-0.010,0.150,-0.092,0.169,1,0,0,1,0,1],
  [0.82,0.024,-0.056,-0.008,0.210,-0.084,0.155,1,0,0,0,0,1],
  [0.88,0.008,-0.018,-0.004,0.060,-0.024,0.050,0.3,0,0,0,0,0],
  [1,0.000,0.000,0.000,0.000,0.000,0.000,0,0,0,0,0,0]
 ]};
// V44 `smooth` classes: Catmull-Rom tangents on non-uniform key times (the slope across both neighbours, never zeroed),
// so a pose is passed through with the wrist still moving; the 0-1 channels (hand ... alt) keep the clamped tangent so a
// part never overshoots past its end stop (the knife's turn slows into the catch instead of running past it).
const catmull=k=>k.map((f,i)=>f.slice(1).map((v,ch)=>{if(i===0||i===k.length-1)return 0;const slope=(k[i+1][ch+1]-k[i-1][ch+1])/(k[i+1][0]-k[i-1][0]);return ch>=6?tangents(k)[i][ch]:slope;}));
for(const c of [...Object.values(CLASSES),...Object.values(RELOADS)]){for(const f of c.keys)while(f.length<KEYS.length+1)f.push(0);c.tangents=(c.smooth?catmull:tangents)(c.keys);}
// V44 review 2: the knife leaves the hand and lands back in it (inspection progress).
export const TOSS=[.645,.81];
export const INSPECTION_MS=CLASSES.rifle.ms;
export const classOf=weapon=>weapon===0?'pistol':weapon===1?'smg':weapon===4?'sniper':weapon===5?'knife':'rifle';
let classicSniper=false;export function useClassicSniperPoses(on){classicSniper=!!on;}
const inspectionClass=weapon=>weapon===2?'ak':weapon===4&&classicSniper?'sniperClassic':classOf(weapon);
export const inspectionMs=weapon=>CLASSES[inspectionClass(weapon)].ms;
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
 const t=Math.max(0,Math.min(1,progress)),c=CLASSES[inspectionClass(weapon)];
 if(t===0||t===1)return {...REST,bolt:t===1&&weapon===5?1:0};
 const pose=sample(c,t);
 // V44 review 2: the knife's toss is timed here, not on the clamped turn channel, which slowed the spin from 15 to 0 rad/s
 // while the blade was still in the air (a magnetic stop) and ran it unevenly (13.3, 12.9, 15.4 rad/s). The flick
 // spins it up over the first 15 % of the flight, it turns at one speed until the palm (TOSS[1]), and the catch
 // takes the last of the turn with a small overshoot that settles in 0.15 s (turns past the catch, damped).
 if(weapon===5){const [t0,t1]=TOSS,u=(t-t0)/(t1-t0),a=.15;pose.bolt=u<=0?0:u<1?(u<a?u*u/(2*a):u-a/2)/(1-a/2):1+.022*Math.exp(-(t-t1)*c.ms/60)*Math.sin((t-t1)*c.ms/1000*2*Math.PI/.14);}
 // Breathing drift while the piece is held up to the light (zero at both ends).
 const life=Math.sin(Math.PI*t)**2,s=t*c.ms/1000;
 pose.pitch+=life*.006*Math.sin(s*2.1);pose.yaw+=life*.008*Math.sin(s*1.37+1);pose.roll+=life*.01*Math.sin(s*1.71+2);
 return pose;
}
// Reload pose at progress 0–1 (null for the knife); drop is the magazine travel in metres.
export function reloadPose(progress,weapon=3){
 const cls=classOf(weapon);if(cls==='knife')return null;const c=RELOADS[weapon===2?'ak':weapon===4&&classicSniper?'sniperClassic':cls];const t=Math.max(0,Math.min(1,progress));
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
