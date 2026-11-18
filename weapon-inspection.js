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
 rifle:{ms:4300,smooth:true,keys:[
  [0,     0,0,0,              0,0,0,          0,0,0,0],
  [.06,   .006,-.01,.004,     -.04,.06,-.06,  0,0,0,0],
  [.18,   .012,.018,-.13,     .09,-.78,.26,   1,1,0,0],
  [.31,   .006,.026,-.135,    .13,-.9,.44,    1,1,0,0],
  [.39,   -.035,.03,-.012,    .07,0,.1,       0,0,0,0],
  [.5,    -.018,.043,-.08,    .09,.86,-.14,   0,0,0,0],
  [.6,    -.026,.052,-.085,   .13,.95,-.3,    0,0,0,0],
  [.66,   -.03,.038,-.07,     .1,.55,-.18,    .7,0,0,0],
  [.70,   -.03,.036,-.06,     .1,.48,-.16,    1,0,0,0],
  [.74,   -.03,.032,-.06,     .08,.48,-.16,   1,0,1,0],
  [.82,   -.03,.036,-.06,     .11,.5,-.2,     1,0,1,0],
  [.855,  -.03,.046,-.06,     .18,.47,-.16,   1,0,0,0],
  [.92,   -.008,.01,-.004,    .03,.08,-.03,   .15,0,0,0],
  [1,     0,0,0,              0,0,0,          0,0,0,0]
 ]},
 // V52: rifles, SMG and pistol take the knife's and the AVERLA's Catmull-Rom tangents (`smooth`) and each shown flank is two
 // different keys, so the piece keeps turning in the light while it is shown instead of stopping dead twice.
 // Pistol: the support hand drops away, the wrist shows the left flank, then the right
 // flank in the middle of the view; then the magazine drops into the waiting palm, is
 // looked at and slapped home.
 pistol:{ms:3700,smooth:true,keys:[
  [0,     0,0,0,             0,0,0,           0,0,0,0],
  [.05,   0,-.006,.004,      -.05,-.02,.04,   .3,1,0,0],
  [.17,   -.028,.043,-.04,   .15,.66,-.08,    1,1,0,0],
  [.3,    -.037,.053,-.045,  .1,.84,-.26,     1,1,0,0],
  [.38,   -.06,.05,-.05,     .16,.2,.05,      1,1,0,0],
  [.47,   -.1,.05,-.035,     .15,-.5,.24,     1,1,0,0],
  [.58,   -.112,.056,-.035,  .11,-.66,.4,     1,1,0,0],
  [.66,   -.04,.05,-.05,     .1,.34,-.08,     1,0,0,0],
  [.72,   -.04,.052,-.052,   .05,.38,-.12,    1,0,1,0],
  [.8,    -.04,.052,-.052,   .06,.37,-.11,    1,0,1,0],
  [.83,   -.04,.062,-.05,    .14,.35,-.09,    1,0,0,0],
  [.91,   -.01,.016,-.02,    .03,.1,-.04,     .25,0,0,0],
  [1,     0,0,0,             0,0,0,           0,0,0,0]
 ]},
 // OB-510 AVERLA (V52): one continuous piece in 4.4 s instead of three held poses and a long still tail. A small dip the
 // other way first, then the left flank comes up broadside and keeps turning while it is shown (yaw .56 to .72, roll
 // -.1 to -.38: the light travels along the barrel and the scope), over the top with the muzzle up to the right side
 // (again turning through it), and back to the left, canted, held 3 cm higher and 2 cm further left than before so the
 // receiver sits in the middle of the view: the support hand drops the magazine into the palm, shows it and seats it
 // with a bump, draws the bolt by the left handle, lets go so the open chamber shows, drives it home and takes the
 // forward grip again. Catmull-Rom tangents (`smooth`): the wrist never stops dead in a pose. The light wave still
 // runs at 28 % (left flank) and 87 % (bolt going home).
 sniper:{ms:4400,smooth:true,keys:[
  [0,     0,0,0,              0,0,0,          0,0,0,0,0,0],
  [.05,   .004,-.01,.006,     -.04,-.05,.06,  0,0,0,0,0,0],
  [.17,   -.05,.07,-.045,     .12,.56,-.1,    0,0,0,0,0,0],
  [.28,   -.058,.08,-.052,    .17,.72,-.38,   0,0,0,0,0,0],
  [.37,   -.035,.085,-.03,    .21,.08,.1,     0,0,0,0,0,0],
  [.46,   -.02,.082,-.058,    .14,-.52,.3,    0,0,0,0,0,0],
  [.55,   -.016,.086,-.06,    .1,-.6,.46,     0,0,0,0,0,0],
  [.610,   -.070,.100,-.01,      .12,.52,-.3,    1,0,0,0,0,0],
  [.637,   -.070,.094,-.01,     .1,.52,-.3,     1,0,1,0,0,0],
  [.664,   -.070,.098,-.01,     .12,.53,-.31,   1,.25,1,0,1,0],
  [.705,  -.070,.100,-.01,      .13,.55,-.35,   1,.25,1,0,1,0],
  [.741,  -.070,.098,-.01,     .12,.53,-.31,   1,0,.45,0,1,0],
  [.764,    -.070,.110,-.01,      .17,.52,-.32,   1,0,0,0,0,0],
  [.791,   -.070,.100,-.01,      .12,.52,-.3,    1,0,0,0,0,1],
  [.818,   -.070,.098,-.004,    .1,.52,-.3,     1,0,0,1,0,1],
  [.850,  -.073,.106,-.012,   .17,.6,-.44,    1,.45,0,1,0,0],
  [.877,  -.070,.100,-.01,      .12,.53,-.31,   1,0,0,1,0,1],
  [.900,   -.068,.096,-.016,   .09,.5,-.27,    1,0,0,0,0,1],
  [.955,  -.03,.042,-.008,    .05,.2,-.11,    .45,0,0,0,0,0],
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
// V53: the same hold, less of it, for the other rifles and the SMG: in the left profile the stock of TARLO and ASSILLO ran
// off the right edge, and the new SCURE and CICALA (shorter at the muzzle) sat with empty picture to their left.
const leftProfile=(keys,dx,dy)=>keys.map(f=>{const m=f[0]>.36&&f[0]<.9?Math.min(1,(f[0]-.36)/.06,(.9-f[0])/.06):0;return [f[0],f[1]-dx*m,f[2]+dy*m,...f.slice(3)];});
CLASSES.ak={ms:4300,smooth:true,keys:leftProfile(CLASSES.rifle.keys,.045,.015)};
CLASSES.smg={ms:4000,smooth:true,keys:leftProfile(CLASSES.rifle.keys.map(f=>[f[0],f[1]*.85,f[2]*.9,f[3]*.85,f[4],f[5]*.92,f[6]*.92,...f.slice(7)]),.022,.014)};
CLASSES.rifle.keys=leftProfile(CLASSES.rifle.keys,.038,.012);
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
 // V53: every reload reads as three beats with weight in the piece, on the same foley marks. Magazine out: the hand
 // yanks it and the weapon is dragged down and comes back up. Magazine in: it comes down to meet the fresh one and is
 // bumped up as it seats, then settles. Action: the piece is pulled back with the handle and snaps forward as it goes
 // home, and comes to rest through a small overshoot. While the hand is away the weapon keeps turning toward the eye
 // (it used to hang still for a third of the reload). Catmull-Rom tangents (`smooth`), like the inspections.
 rifle:{smooth:true,keys:[
  [0,     0,0,0,                0,0,0,           0,0,0,0,0,0],
  [.05,   -.004,-.01,.006,      .01,.01,-.1,     .3,0,0,0,0,0],
  [.12,   -.021,.006,-.002,     .11,.065,-.57,   1,0,0,0,0,0],
  [.15,   -.02,.004,0,          .1,.06,-.56,     1,0,.25,0,0,0],
  [.19,   -.021,-.03,.006,      -.02,.04,-.44,   1,0,1,0,0,0],
  [.24,   -.02,.01,0,           .14,.07,-.6,     1,.35,1,0,1,0],
  [.31,   -.026,.016,-.006,     .16,.1,-.62,     1,1,1,0,1,0],
  [.40,   -.034,.034,-.012,     .22,.15,-.7,     1,1,1,0,1,0],
  [.48,   -.036,.04,-.014,      .24,.16,-.72,    1,.15,1,0,1,0],
  [.53,   -.035,.032,-.012,     .2,.16,-.7,      1,0,.45,0,1,0],
  [.58,   -.035,.062,-.016,     .32,.16,-.76,    1,0,0,0,0,0],
  [.62,   -.034,.03,-.01,       .18,.15,-.66,    1,0,0,0,0,0],
  [.66,   -.03,.03,-.008,       .16,.1,-.5,      1,0,0,0,0,.3],
  [.70,   -.024,.028,-.004,     .12,.04,-.3,     1,0,0,0,0,.8],
  [.76,   -.02,.026,.004,       .1,0,-.16,       1,0,0,0,0,1],
  [.81,   -.018,.012,.036,      .02,0,-.12,      1,0,0,1,0,1],
  [.845,  -.012,.022,-.016,     .2,0,-.1,        .9,0,0,0,0,.8],
  [.89,   -.006,.006,.004,      .02,.01,-.05,    .4,0,0,0,0,0],
  [.95,   -.001,-.004,0,        -.02,0,.02,      .05,0,0,0,0,0],
  [1,     0,0,0,                0,0,0,           0,0,0,0,0,0]
 ]},
 pistol:{smooth:true,keys:[
  [0,     0,0,0,                0,0,0,           0,0,0,0,0,0],
  [.06,   -.014,.036,-.008,     .1,.17,-.18,     .5,0,0,0,0,0],
  [.125,  -.03,.07,-.017,       .2,.3,-.33,      1,1,0,0,0,0],
  [.15,   -.03,.066,-.016,      .18,.3,-.33,     1,1,.2,0,0,0],
  [.18,   -.031,.04,-.01,       .04,.29,-.22,    1,1,1,0,0,0],
  [.23,   -.03,.074,-.016,      .22,.3,-.36,     1,1,1,0,0,0],
  [.30,   -.03,.076,-.016,      .22,.32,-.38,    1,1,1,0,1,0],
  [.40,   -.03,.086,-.016,      .26,.36,-.44,    1,1,1,0,1,0],
  [.47,   -.03,.086,-.016,      .25,.37,-.46,    1,.2,1,0,1,0],
  [.56,   -.03,.076,-.016,      .2,.36,-.44,     1,0,.5,0,1,0],
  [.62,   -.03,.104,-.02,       .38,.36,-.5,     1,0,0,0,0,0],
  [.66,   -.03,.07,-.015,       .16,.32,-.36,    1,0,0,0,0,0],
  [.72,   -.026,.066,-.012,     .16,.24,-.26,    .8,0,0,0,0,0],
  [.79,   -.018,.058,-.008,     .13,.15,-.17,    .45,0,0,0,0,0],
  [.84,   -.016,.054,.008,      .1,.14,-.16,     .4,0,0,1,0,0],
  [.875,  -.01,.05,-.018,       .24,.1,-.1,      .3,0,0,0,0,0],
  [.92,   -.003,.012,0,         .02,.03,-.03,    .1,0,0,0,0,0],
  [.96,   0,-.004,0,            -.02,0,.01,      0,0,0,0,0,0],
  [1,     0,0,0,                0,0,0,           0,0,0,0,0,0]
 ]},
 // V53: the same order, with weight: the rifle gives back as the bolt is drawn, is dragged down by the magazine, bumped
 // up as the fresh one seats and pushed forward by the bolt going home; it keeps turning a little while the hand is away.
 sniper:{work:'mag4',smooth:true,keys:[
  [0,0,0,0,0,0,0,0,0,0,0,0,0],
  [.05,-.004,.026,.004,.02,.05,-.08,.4,0,0,0,0,.6],
  [.10,-.02,.087,-.012,.11,.32,-.3,1,0,0,0,0,1],
  [.14,-.02,.08,.012,.04,.34,-.32,1,0,0,1,0,1],
  [.20,-.02,.088,-.008,.12,.34,-.33,1,0,0,1,0,.3],
  [.27,-.02,.082,-.01,.09,.31,-.35,1,0,0,1,0,0],
  [.36,-.02,.08,-.01,.08,.3,-.34,1,0,.3,1,0,0],
  [.40,-.021,.052,-.006,-.02,.28,-.27,1,0,1,1,1,0],
  [.46,-.021,.084,-.01,.11,.33,-.38,1,.6,1,1,1,0],
  [.50,-.022,.092,-.012,.13,.38,-.44,1,1,1,1,1,0],
  [.55,-.021,.086,-.01,.11,.35,-.4,1,.3,1,1,1,0],
  [.59,-.02,.074,-.01,.07,.31,-.34,1,0,.45,1,1,0],
  [.62,-.02,.108,-.014,.22,.3,-.4,1,0,0,1,0,0],
  [.66,-.02,.078,-.01,.08,.31,-.32,1,0,0,1,0,.3],
  [.74,-.02,.082,-.004,.1,.32,-.32,1,0,0,1,0,1],
  [.82,-.018,.076,-.026,.17,.3,-.3,1,0,0,0,0,1],
  [.87,-.012,.064,.004,.06,.2,-.2,.8,0,0,0,0,.5],
  [.94,-.003,.022,0,.02,.04,-.04,.2,0,0,0,0,0],
  [.975,0,-.004,0,-.012,0,.01,0,0,0,0,0,0],
  [1,0,0,0,0,0,0,0,0,0,0,0,0]
 ]}
};
// RONCOLA (V42 review): the same change, held higher and further out so the trigger hand stays in the
// picture; the rack keeps the left cant and the hand reaches over to the handle on the far side (turning
// the right side up put the whole forearm across the receiver).
RELOADS.ak={smooth:true,keys:RELOADS.rifle.keys.map(f=>{const m=f[0]>0&&f[0]<1?Math.min(1,f[0]/.12,(1-f[0])/.1):0;return [f[0],f[1]+.025*m,f[2]+.06*m,f[3]-.03*m,f[4],f[5]+.2*m,f[6]*(f[0]>.64?1.1:.85),...f.slice(7)];})};
// ASSILLO: the same change, then a slap on the forward cocking handle.
// V53: the slap knocks the piece down and forward (nose up), and it comes back through its rest.
RELOADS.smg={smooth:true,keys:RELOADS.rifle.keys.filter(f=>f[0]<.66).concat([
  [.72,   -.008,.014,-.008,   .06,.08,-.26,   1,0,0,0,0,.6],
  [.78,   -.006,.016,-.004,   .05,.06,-.2,    1,0,0,.6,0,1],
  [.82,   -.004,-.004,-.016,  .14,.05,-.16,   1,0,0,0,0,1],
  [.87,   -.002,.008,-.002,   .02,.03,-.08,   .35,0,0,0,0,.3],
  [.94,   0,-.002,0,          -.01,.01,.01,   0,0,0,0,0,0],
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
