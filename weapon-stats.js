// V42 b4a: designs that are weapons of their own. A class's Officina design normally only changes the look; the designs
// listed here also bring their own handling, read by the host's arbiter, the bots and every client's prediction through the
// shooter's finish (p.finishes[slot].model, already synced like any other design). A design that is not listed, or any
// unknown id, is the class itself, so every weapon that existed before keeps its numbers exactly. No three.js here: the
// rules run in Node tests too. Movement speed is the class's on purpose: the client predicts it before the host knows.
import {WEAPONS} from './shared.js?v=42.0';
// weapon: fields of WEAPONS overridden · rules: fields of GUN_RULES (combat-rules.js) · falloff: damage kept per 25.4 m ·
// recoil: the pattern's strength (RECOIL_STRENGTH) · pattern: authored control points (degrees, pitch then yaw) · view: the
// first-person kick's scale (view-kick.js, visual only) · role: the sentence the Officina opens its numbers with ·
// tone: the shot's playback [rate, gain] (audio-engine.js).
export const DESIGN_STATS={
 // Every design is a sidegrade of its class, never an upgrade (tools/check_weapon_variants.mjs holds the line): each wins
// one fight and loses another to the stock weapon at the same price.
 // Pistols. ZANZARA: a machine pistol, light rounds at a high cyclic rate from a long magazine: fast on bare bodies up
 // close, weak through armour (penetration .45) and at range, wider cone.
 zanzara:{tone:[1.14,.9],view:.62,role:'Pistola automatica',slot:0,name:'OB-120 ZANZARA',label:'PISTOLA AUTOMATICA',weapon:{mag:20,damage:18,rate:.085,reload:1.8,equip:.26,range:55,auto:true},rules:{accuracy:.0058,moving:.07,kick:.016,penetration:.45,wallbang:.22,bloom:.0055,cap:.03,recovery:110},falloff:.8,recoil:.85,
  pattern:[[0,0],[.7,0],[1.5,.25],[2.3,-.3],[3,.5],[3.5,-.55],[3.9,.75],[4.2,-.7],[4.4,.85],[4.5,-.8]]},
 // CINGHIALE: a heavy hand cannon, seven big rounds and a hard kick; a clean head shot drops a helmet inside ~24 m, but
 // bodies take three hits at 2.2 shots/s, the cone is wider than the SMERIGLIO's and it is poor on the move.
 cinghiale:{tone:[.8,1.18],view:1.55,role:'Pistola pesante',slot:0,name:'OB-130 CINGHIALE',label:'PISTOLA PESANTE',weapon:{mag:7,damage:50,rate:.45,reload:2.2,equip:.38,range:90,auto:false},rules:{accuracy:.0042,moving:.13,kick:.05,penetration:.62,wallbang:.45,bloom:.016,cap:.034,recovery:200},falloff:.8,recoil:1.2,
  pattern:[[0,0],[2.6,0],[3.8,-.35],[4.6,.4]]},
 // Submachine guns. CICALA: the fastest cyclic rate, a 40-round magazine, light damage that falls off early and bounces
 // off armour; a slower reload.
 cicala:{tone:[1.09,.92],view:.85,role:'Mitra rapido',slot:1,name:'OB-230 CICALA',label:'MITRA RAPIDO',weapon:{mag:40,damage:20,rate:.06,reload:2.3,equip:.32,range:50,auto:true},rules:{accuracy:.0085,moving:.065,kick:.009,penetration:.55,wallbang:.28,bloom:.0024,cap:.028,recovery:95},falloff:.78,recoil:.85},
 // V42 b4b. Assault rifles. SCURE (TARLO slot): a semi-automatic battle rifle, 20 heavy rounds; a clean head shot drops a
 // helmet at any range the TARLO fights at, but bodies need three hits at 375 shots/min, it is slower to reload and draw
 // and worse on the move.
 scure:{tone:[.86,1.1],view:1.25,role:'Fucile da battaglia semiautomatico',slot:3,name:'OB-330 SCURE',label:'FUCILE DA BATTAGLIA',weapon:{mag:20,damage:40,rate:.16,reload:2.35,equip:.46,range:140,auto:false},rules:{accuracy:.0019,moving:.17,kick:.02,penetration:.82,wallbang:.68,bloom:.0075,cap:.034,recovery:150},falloff:.985,recoil:1.15},
 // Sniper rifles. GHEPPIO (AVERLA slot): a semi-automatic marksman rifle, ten rounds and a shot every 0.4 s: one hit to the
 // head, never to the body (two hits, armour or not). It pays for that (V42 b4b review): a looser cone at the hip, on the
 // move and through the scope, a longer reload, and the optic settles again over 0.65 s after every shot (`shotSettle`,
 // scopeSettle in combat-rules.js), so a shot fired as soon as it cycles goes wide. `semi`: no bolt to work between shots.
 gheppio:{tone:[1.06,.9],view:.7,role:'Cecchino semiautomatico',slot:4,semi:true,name:'OB-520 GHEPPIO',label:'CECCHINO SEMIAUTOMATICO',weapon:{mag:10,damage:78,rate:.4,reload:3.1,equip:.55,range:180,auto:false},rules:{accuracy:.085,scoped:.0008,shotSettle:650,moving:.36,kick:.05,penetration:.85,wallbang:.75,bloom:.0012,cap:.004,recovery:260},falloff:.98,recoil:.4}
};
const idOf=finish=>typeof finish==='string'?finish:finish?.model;
// The design a finish names for this slot, when it is a weapon of its own.
export function designOf(index,finish){const id=idOf(finish),d=typeof id==='string'&&Object.hasOwn(DESIGN_STATS,id)?DESIGN_STATS[id]:null;return d&&d.slot===index?d:null;}
const weapons=new Map();
// The WEAPONS row a shooter's finish fires: the class's own row when the design brings no handling.
export function weaponFor(index,finish){const d=designOf(index,finish);if(!d)return WEAPONS[index];let w=weapons.get(d);if(!w){w=Object.freeze({...WEAPONS[index],...d.weapon,name:d.name,label:d.label||WEAPONS[index].label});weapons.set(d,w);}return w;}
export const gunOf=(p,index=p?.weapon)=>weaponFor(index,p?.finishes?.[index]);
// A design's name by slot and model id, for the feed and the menus (null: the class's own).
export const designName=(index,model)=>designOf(index,model)?.name||null;
// Bots carry the designs too, a fixed mix by bot number so every match shows each of them (V42 b4b: the TARLO and AVERLA
// slots as well, the SCURE on every other bot, the GHEPPIO on one bot in three).
// V43 b34: bots carry the Officina kits too (three in four the paracord: the rifles' worn sling and the lanyards; the rest the light), shown on the base models.
export function botLoadout(n){const a=['stock','zanzara','cinghiale'],b=['stock','cicala','tafano'],kit=n%4===3?'rail':'field';return [{model:a[n%3],kit},{model:b[Math.floor(n/3)%3],kit},{kit},{model:n%2?'scure':'stock',kit},{model:n%3===1?'gheppio':'stock',kit},{kit}];}
// A design that fires semi-automatically from a bolt-action class (the sniper slot): no bolt cycle between shots.
export const semiOf=(index,finish)=>!!designOf(index,finish)?.semi;
