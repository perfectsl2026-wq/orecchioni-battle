import * as T from './vendor/three.module.js';
import {WALLS} from './shared.js?v=38.1';
import {box,cyl,mesh,label,bevel} from './graphics.js?v=38.1';
function facade(root,x,z,angle){const f=new T.Group();f.position.set(x,0,z);f.rotation.y=angle;root.add(f);return f;}
function strut(root,material,a,b,width=.12){const start=new T.Vector3(...a),end=new T.Vector3(...b),m=box(root,material,0,0,0,width,start.distanceTo(end),width);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());return m;}
export function refineForge(root,p){
 let building=0;
 for(const [x,z,w,d,h]of WALLS.filter(w=>w[2]===6&&w[3]===9)){
  building++;
  for(const [fx,fz,angle,span]of [[x,z+d/2,0,w],[x,z-d/2,Math.PI,w],[x+w/2,z,Math.PI/2,d],[x-w/2,z,-Math.PI/2,d]]){
   const f=facade(root,fx,fz,angle);
   // Precast expansion joints, flush brass anchors and copper sill flashings.
   for(const yy of [.48,2.45])box(f,p.dark,0,yy,.03,span-.18,.012,.015);
   for(const side of [-1,1]){box(f,p.copper,side*(span/2-.24),1.5,.042,.055,2.65,.025);for(const yy of [.65,2.15])cyl(f,p.steel,side*(span/2-.24),yy,.06,.035,.012,'z',.035,8);}
   // Chamfered upper concrete galleries and their actual structural brackets.
   bevel(f,p.white,0,3.22,.38,span+.10,.22,.86,.045);
   for(const side of [-1,1])strut(f,p.steel,[side*(span/2-.4),2.85,.06],[side*(span/2-.4),3.16,.68],.08);
   for(let q=-span/2+.6;q<span/2-.2;q+=1.2){box(f,p.copper,q,6.72,.10,.07,.55,.16);box(f,p.white,q+.55,7.02,.08,1.1,.12,.15);}
  }
  // Independent upper intake pipes, joined to the turbine hall roof.
  for(const side of [-1,1]){
   cyl(root,p.copper,x+side*2.1,h+.82,z,.24,7.0,'z',.24,24);
   for(const zz of [-3,-1.5,0,1.5,3])cyl(root,p.steel,x+side*2.1,h+.82,z+zz,.29,.08,'z',.29,24);
   box(root,p.steel,x+side*2.1,h+.3,z,.18,.65,6.4);
  }
 }
 // A supported pressure main is the courtyard's industrial landmark. The
 // cylinder dimensions are also registered in the shared bullet collision map.
 cyl(root,p.copper,0,6.2,0,.82,14,'x',.82,64);
 for(const x of [-6,-3,0,3,6]){
  cyl(root,p.steel,x,6.2,0,1.02,.16,'x',1.02,64);
  for(let n=0;n<12;n++){const a=n*Math.PI/6;cyl(root,p.white,x+.095,6.2+Math.sin(a)*.92,Math.cos(a)*.92,.045,.055,'x',.045,8);}
 }
 for(const side of [-1,1]){
  box(root,p.white,side*7.15,4.72,0,1.1,.35,1.9);
  strut(root,p.steel,[side*7.7,4.4,-.55],[side*6.8,5.5,-.55],.18);
  strut(root,p.steel,[side*7.7,4.4,.55],[side*6.8,5.5,.55],.18);
 }
 const pressureLabel=label(root,'FORGE / PRESSURE MAIN 11',0,6.2,-.835,4.6,.31,Math.PI,{background:'#b68562',color:'#293f46',font:76});
 // A monumental dam beyond the sealed perimeter; it cannot obstruct play.
 for(let n=0;n<13;n++){
  const x=(n-6)*4.8,z=-35+Math.cos((n-6)*.10)*2.6,h=18+Math.cos((n-6)*.12)*4;
  const pier=bevel(root,p.concrete,x,h/2,z,4.7,h,3.2,.15);pier.rotation.y=(n-6)*.045;
  box(root,p.white,x,h+.15,z,4.9,.3,3.4);box(root,p.copper,x,h-2,z+1.66,.16,3.7,.08);
  if(n%2===0){box(root,p.dark,x,7.3,z+1.62,2.7,8,.035);for(let q=-3;q<=3;q++)box(root,p.steel,x+q*.34,7.3,z+1.65,.12,7.8,.04);}
 }
 // Southern intake crest is visible from the northern starting area.
 for(let n=-5;n<=5;n++){
  const x=n*4.5,h=18-Math.abs(n)*.6,z=29+Math.cos(n*.14)*2;
  const pier=bevel(root,p.concrete,x,h/2,z,4.4,h,2.8,.12);pier.rotation.y=-n*.05;
  box(root,p.white,x,h+.15,z,4.6,.3,3);
  box(root,p.dark,x,10,z-1.44,3.3,6,.035);
  for(const side of [-1,1])box(root,p.copper,x+side*1.3,10,z-1.48,.1,5.8,.04);
 }
 for(const [z,text]of [[-17,'01 / INTAKE'],[17,'02 / CONTROL']]){const l=label(root,text,0,.018,z,4.8,.63,0,{background:'#abb7b1',color:'#34545c',font:100});l.rotation.x=-Math.PI/2;}
 root.userData.artRevision='forge-20';
}
