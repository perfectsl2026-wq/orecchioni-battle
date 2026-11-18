import {MAP_THEMES} from './visual-theme.js?v=42.0';
import {KITS,kitLabel,kitSide} from './weapon-kits.js?v=42.0';
import {rulesFor} from './combat-rules.js?v=42.0';
import {weaponFor,designOf} from './weapon-stats.js?v=42.0';
import {applyFinish,cleanFinish,PAINTS,TRIMS,PATTERNS} from './weapon-finish.js?v=42.0';
import {VARIANTS,variantFor,variantKey,cleanBuild} from './weapon-variants.js?v=42.0';
import * as THREE from './vendor/three.module.js';
import {createDisplayWeapon,disposeAgent,createAgent,animateAgent,dressOperator,bodyReady,loadBody} from './assets.js?v=42.0';
import {BODIES,signatureOf,styleOf,TWEAKS,FINISHES,VISORS,DETAIL_NAMES,cleanTw,twParts} from './operator-kits.js?v=42.0';
import {KITS as OPERATOR_KITS,kitFor,cleanOperator} from './operator-kits.js?v=42.0';
import {SMOKE_TINTS} from './smoke-rules.js?v=42.0';
import {WEAPONS,groundHeight} from './shared.js?v=42.0';
const $=id=>document.getElementById(id);
export const studioScale=(radius,width,height,fov=34)=>Math.min(1,width/Math.max(1,height))*Math.tan(fov*Math.PI/360)*2.65*.86/Math.max(.01,radius);
// The model number stays on one line: the title column is narrow and a hyphen is a break point.
// V44: the eyebrow repeats the label of the tab on show, word for word as its picker button reads (01 / PISTOLA ... 07 / FIGURA).
function armoryTitle(name,index){const eyebrow=document.querySelector('.armoryinfo>.eyebrow');if(eyebrow&&index>=0)eyebrow.textContent=String(index+1).padStart(2,'0')+' / '+(index===6?'FIGURA':WEAPONS[index].label);const [code,...rest]=name.split(' '),head=document.createElement('span');head.style.whiteSpace='nowrap';head.textContent=code;$('armory-title').replaceChildren(head,rest.length?' '+rest.join(' '):'');}
export class Armory{
 constructor(renderer,environment,onSelect,onClose,{career,onFinish=()=>{},onOperator=()=>{}}={}){
  this.career=career;this.onFinish=onFinish;this.onOperator=onOperator;this.model=null;this.layoutDirty=true;this.boundsDirty=true;this.previewBox=new THREE.Box3();this.previewSize=new THREE.Vector3();this.previewCenter=new THREE.Vector3();
  const resize=()=>this.layoutDirty=true;window.addEventListener('resize',resize);if(globalThis.ResizeObserver){this.resizeObserver=new ResizeObserver(resize);for(const el of [document.querySelector('.finish-editor'),document.querySelector('.armoryinfo')])this.resizeObserver.observe(el);}
  this.fitCenter=new THREE.Vector3();this.rotationTarget=new THREE.Vector2(.05,-1.12);this.renderer=renderer;this.active=false;this.onSelect=onSelect;this.onClose=onClose;this.index=3;this.drag=false;
  this.scene=new THREE.Scene();const c=document.createElement('canvas');c.width=2;c.height=256;const g=c.getContext('2d'),gradient=g.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#152a34');gradient.addColorStop(.65,'#29444a');gradient.addColorStop(1,'#12252d');g.fillStyle=gradient;g.fillRect(0,0,2,256);this.studioCanvas=c;this.scene.background=new THREE.CanvasTexture(c);this.scene.background.colorSpace=THREE.SRGBColorSpace;this.scene.environment=environment;
  this.camera=new THREE.PerspectiveCamera(34,1,.01,20);this.camera.position.set(0,.06,2.65);this.camera.lookAt(0,0,0);
  this.scene.add(new THREE.HemisphereLight(0xe3f1fa,0x64776b,2));for(const[color,intensity,pos]of [[0xffeddb,4,[-3,5,4]],[0xb0d9ef,2,[3,2,-2]],[0xe9f2dc,1,[0,-2,1]]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...pos);this.scene.add(l)}
  this.pivot=new THREE.Group();this.scene.add(this.pivot);
  // Showroom floor: a soft contact shadow under the piece, drawn only in the weapon pass.
  const sc=document.createElement('canvas');sc.width=sc.height=128;const sg=sc.getContext('2d'),rg=sg.createRadialGradient(64,64,4,64,64,64);rg.addColorStop(0,'rgba(0,0,0,.55)');rg.addColorStop(.55,'rgba(0,0,0,.22)');rg.addColorStop(1,'rgba(0,0,0,0)');sg.fillStyle=rg;sg.fillRect(0,0,128,128);
  const shadowMap=new THREE.CanvasTexture(sc);this.floorShadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,opacity:.75}));this.floorShadow.rotation.x=-Math.PI/2;this.floorShadow.renderOrder=-1;this.scene.add(this.floorShadow);
  this.idleSince=performance.now();this.idleBase=null;
  const descriptions=['Pistola compatta. Precisa e rapida da ricaricare.','Mitra automatico. Cadenza elevata per le distanze ravvicinate.','Fucile d’assalto. Danno elevato, controllo del rinculo essenziale.','Carabina automatica. Equilibrio tra precisione e cadenza.','Fucile di precisione. Un colpo, una decisione.','Coltello K-07. Movimento rapido, fendente e stoccata; attacco pesante alle spalle.'];this.descriptions=descriptions;
  WEAPONS.forEach((w,i)=>{const b=document.createElement('button');b.innerHTML='<span>0'+(i+1)+' / '+w.label+'</span>'+w.name;b.onclick=()=>this.select(i);$('armorychoices').append(b)});
  // V35: the seventh slot is the operator: kit, accent and toggles, previewed on the player's team.
  {const b=document.createElement('button');b.innerHTML='<span>07 / FIGURA</span>OPERATORE';b.onclick=()=>this.select(6);$('armorychoices').append(b);}
  for(const kit of OPERATOR_KITS){const b=document.createElement('button');b.type='button';b.dataset.kit=kit.id;b.innerHTML='<span>'+kit.name+'</span><small>'+kit.tag+'</small>';b.onclick=()=>{this.opDraft.kit=kit.id;this.opDraft.tw=this.career?.data.tweaks?.[kit.id]||'';this.previewOperator();$('operatorstatus').textContent='Kit '+kit.name+' in anteprima. Applica per salvarlo.';};$('operatorkits').append(b);}
  for(const [key,choice]of Object.entries(PAINTS)){const b=document.createElement('button');b.type='button';b.style.setProperty('--swatch',choice.hex);b.title=choice.label;b.setAttribute('aria-label',choice.label);b.dataset.key=key;b.onclick=()=>{this.opDraft.accent=key;this.previewOperator();};$('operatoraccents').append(b);}
  {const label=document.createElement('div'),host=document.createElement('div');label.className='field-label';label.id='fl-smoke';label.textContent='COLORE DEL FUMOGENO';host.id='operatorsmoke';host.className='paint-swatches';host.setAttribute('role','group');host.setAttribute('aria-labelledby','fl-smoke');
   // V42: the canister's tint. Same opacity, size and duration for every colour: only the hue changes.
   SMOKE_TINTS.forEach((t,n)=>{const b=document.createElement('button');b.type='button';b.style.setProperty('--swatch',t.hex);b.title=t.label+' · stessa copertura per tutti';b.setAttribute('aria-label','Fumogeno '+t.label);b.dataset.smoke=n;b.onclick=()=>{this.opDraft.smoke=n;this.previewOperator();$('operatorstatus').textContent='Fumogeno '+t.label.toLowerCase()+' in anteprima. Applica per salvarlo.';};host.append(b);});
   $('operatoraccents').after(label,host);}
  // V46f: the operator's own tweaks (detail colour, finish, visor tint), rebuilt for each kit in previewOperator.
  {const h=document.createElement('div');h.id='operatortweaks';h.className='operator-tweaks';$('operatortoggles').after(h);}
  // The old accent row tints almost nothing under the signature palettes and offers team-like hues: hidden while they are on.
  if(signatureOf('assalto')){const r=$('operatoraccents');r.hidden=true;if(r.previousElementSibling?.classList.contains('field-label'))r.previousElementSibling.hidden=true;}
  $('operatortoggles').addEventListener('change',e=>{const el=e.target.closest('[data-toggle]');if(!el)return;this.opDraft[el.dataset.toggle]=el.checked?1:0;this.previewOperator();});
  $('applyoperator').onclick=()=>{this.career?.setTweak?.(this.opDraft.kit,this.opDraft.tw);this.career?.setOperator(this.opDraft);this.onOperator();$('operatorstatus').textContent=this.career?.persisted?'Operatore applicato. Gli altri giocatori lo vedono.':'Operatore attivo in questa sessione. Il browser non consente il salvataggio.';};
  document.getElementById('team')?.addEventListener('change',()=>{if(this.active&&this.index===6)this.select(6);});
  $('closearmory').onclick=()=>this.close();
  window.addEventListener('pointerdown',e=>{if(!this.active||e.target.closest('button,input,select,label,.finish-editor,.armoryinfo'))return;this.drag=true;this.idleSince=performance.now();this.idleBase=null;this.lastX=e.clientX;this.lastY=e.clientY;});window.addEventListener('pointerup',()=>this.drag=false);window.addEventListener('pointercancel',()=>this.drag=false);window.addEventListener('blur',()=>this.drag=false);window.addEventListener('wheel',e=>{if(!this.active||e.target.closest('.finish-editor'))return;e.preventDefault();this.camera.position.z=THREE.MathUtils.clamp(this.camera.position.z+e.deltaY*.002,1.2,4.2)},{passive:false});
  window.addEventListener('pointermove',e=>{if(!this.active||!this.drag)return;this.idleSince=performance.now();this.rotationTarget.y+=(e.clientX-this.lastX)*.009;this.rotationTarget.x=THREE.MathUtils.clamp(this.rotationTarget.x+(e.clientY-this.lastY)*.007,-1,1);this.lastX=e.clientX;this.lastY=e.clientY;});
  window.addEventListener('keydown',e=>{if(!this.active)return;if(e.code==='Tab'){const fields=[...$('armory').querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')].filter(x=>x.getClientRects().length);const at=fields.indexOf(document.activeElement),next=(at+(e.shiftKey?fields.length-1:1))%fields.length;e.preventDefault();fields[next]?.focus();return;}if(e.code==='Escape'){e.preventDefault();this.close()}else if(!e.target.closest('input,select')&&/^Digit[1-7]$/.test(e.code))this.select(Number(e.code.at(-1))-1)});
  for(const [id,choices,field]of [['primarypaints',PAINTS,'primary'],['trimpaints',TRIMS,'accent']])for(const [key,choice]of Object.entries(choices)){
   const b=document.createElement('button');b.type='button';b.style.setProperty('--swatch',choice.hex);b.title=choice.label;b.setAttribute('aria-label',choice.label);b.dataset.key=key;b.onclick=()=>{this.draft.style='paint';this.draft[field]=key;this.draft[field==='primary'?'customPrimary':'customAccent']=null;this.previewFinish();};$(id).append(b);
  }
  for(const [key,kit]of Object.entries(KITS)){const o=document.createElement('option');o.value=key;o.textContent=kit.label;$('weaponkit').append(o);}
  for(const [key,label,config]of [['recon','RECON',{primary:'olive',accent:'carbon',kit:'field',surface:'matte'}],['desert','DESERT',{primary:'sand',accent:'carbon',kit:'rail',surface:'matte'}],['urban','URBAN',{primary:'graphite',accent:'titanium',kit:'service',surface:'satin'}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{this.draft=cleanFinish({...config,model:this.draft.model,build:this.draft.build,style:'paint',pattern:this.draft.pattern},this.index);this.previewFinish();this.faceKit();$('finishstatus').textContent='Assetto '+label+' in anteprima. Applica per salvarlo.';};$('tacticalpresets').append(b);}
  $('weaponkit').onchange=()=>{this.draft.kit=$('weaponkit').value;this.previewFinish();this.faceKit();};
  // V33: the class's base model and its OB variants; each design exposes its tuning.
  $('weaponmodels').addEventListener('click',e=>{const b=e.target.closest('button[data-model]');if(!b)return;this.draft.model=b.dataset.model;this.draft.build=cleanBuild(this.index,this.draft.model,this.draft.build);this.previewFinish();this.faceKit();$('finishstatus').textContent=b.dataset.model==='stock'?'Modello di serie in anteprima. Applica per salvarlo.':'Variante in anteprima. Regola i dettagli, poi Applica.';});
  $('modelparams').addEventListener('input',e=>{const el=e.target.closest('[data-param]');if(!el)return;this.draft.build={...(this.draft.build||{}),[el.dataset.param]:Number(el.value)};this.draft.build=cleanBuild(this.index,this.draft.model,this.draft.build);this.previewFinish();});
  $('finishsurface').onchange=()=>{this.draft.surface=$('finishsurface').value;this.draft.style='paint';this.previewFinish();};
  for(const [id,field]of [['customprimary','customPrimary'],['customaccent','customAccent']])$(id).oninput=()=>{this.draft[field]=$(id).value;this.draft.style='paint';this.previewFinish();};
  for(const [id,field]of [['customprimaryhex','customPrimary'],['customaccenthex','customAccent']])$(id).oninput=()=>{if(/^#[0-9a-f]{6}$/i.test($(id).value)){this.draft[field]=$(id).value.toLowerCase();this.draft.style='paint';this.previewFinish();}else $('finishstatus').textContent='Colore esadecimale: # seguito da 6 cifre (0–9, A–F).';};
  $('finishstyle').onchange=()=>{this.draft.style=$('finishstyle').value;this.previewFinish();};
  $('finishpattern').onchange=()=>{this.draft.pattern=$('finishpattern').value;this.draft.style='paint';this.previewFinish();};
  $('finishglow').onchange=()=>{this.draft.glow=$('finishglow').value;this.previewFinish();};
   $('finishprime').onchange=()=>{this.draft.prime=$('finishprime').checked;this.previewFinish();};
   $('applyfinish').onclick=()=>{if(!this.career?.setFinish(this.index,this.draft)){$('finishstatus').textContent='Completa la maestria richiesta per questo disegno.';return;}this.onFinish();$('finishstatus').textContent=this.career.persisted?'Finitura applicata. Visibile anche agli altri giocatori.':'Finitura attiva in questa sessione. Il browser non consente il salvataggio.';};
  $('resetfinish').onclick=()=>{this.draft=cleanFinish(null,this.index);this.career?.setFinish(this.index,this.draft);this.onFinish();this.previewFinish();$('finishstatus').textContent='Finitura di serie ripristinata.';};

 }
 // Display models are built once and kept: rebuilding on every selection cloned the rig
 // and compiled its studio shaders mid-frame (100–240 ms per weapon, 488 ms for the precision rifle).
 display(index){
  if(!this.models)this.models=new Map();let model=this.models.get(index);
  if(!model){model=createDisplayWeapon(index);if(!model)return null;if(index===5){model.rotation.x=Math.PI/2;model.scale.multiplyScalar(2.25);}model.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());model.position.sub(center);model.visible=false;this.pivot.add(model);this.models.set(index,model);}
  return model;
 }
 // Called once at startup: every weapon's studio program is compiled before the first open.
 async warm(){for(let i=0;i<WEAPONS.length;i++){const m=this.display(i);if(m){applyFinish(m,i,cleanFinish(this.career?.data.finishes[i]));m.visible=true;}}
  this.camera.aspect=16/9;this.camera.updateProjectionMatrix();if(this.renderer.compileAsync)await this.renderer.compileAsync(this.scene,this.camera);else this.renderer.compile(this.scene,this.camera);
  for(const m of this.models.values())m.visible=false;}
 previewTeam(){return document.getElementById('team')?.value==='orange'?'orange':'blue';}
 // The operator stands in the studio with the player's own rifle, idle, facing the camera.
 displayOperator(team){
  this.operators??=new Map();let model=this.operators.get(team);
  // The foot solve plants on the active map's ground: the figure is posed standing on it, then centred.
  if(!model){const agent=createAgent(team,3);if(!agent)return null;const ground=groundHeight(0,0);agent.position.y=ground;animateAgent(agent,1/60,false,3,0,{life:1,time:0,pitch:0,vx:0,vz:0,groundY:ground});agent.updateMatrixWorld(true);
   model=new THREE.Group();model.add(agent);agent.userData.shadow.visible=false;const center=new THREE.Box3().setFromObject(agent).getCenter(new THREE.Vector3());agent.position.sub(center);model.visible=false;this.pivot.add(model);this.operators.set(team,model);}
  if(this.career)applyFinish(model.children[0].userData.gun,3,this.career.data.finishes[3]);return model;
 }
 selectOperator(){
  this.camera.position.z=2.65;this.idleSince=performance.now();this.idleBase=null;this.index=6;for(const [,m]of this.models||[])m.visible=false;for(const [,m]of this.operators||[])m.visible=false;
  const team=this.previewTeam();this.model=this.displayOperator(team);if(this.model)this.model.visible=true;this.rotationTarget.set(.02,Math.PI+.28);this.pivot.rotation.set(.02,Math.PI+.28,0);this.pivot.position.set(0,0,0);this.pivot.scale.setScalar(1);this.pivot.updateMatrixWorld(true);
  const previewBounds=new THREE.Box3().setFromObject(this.pivot);this.previewSize=previewBounds.getSize(new THREE.Vector3());this.previewCenter=previewBounds.getCenter(new THREE.Vector3());this.boundsDirty=this.layoutDirty=true;
  this.opDraft=cleanOperator(this.career?.data.operator);document.getElementById('armory').classList.add('operator-mode');document.querySelector('.finish-editor').classList.add('operator-mode');$('finishstatus').textContent='';$('operatorstatus').textContent='';
  this.previewOperator();Array.from($('armorychoices').children).forEach((b,i)=>b.classList.toggle('active',i===6));
 }
 previewOperator(){
  if(!this.model||this.index!==6)return;const team=this.previewTeam(),o=this.opDraft=cleanOperator(this.opDraft);dressOperator(this.model.children[0],team,o);this.boundsDirty=true;
  const kit=kitFor(o.kit);armoryTitle(kit.name,6);$('armory-description').textContent=kit.desc;$('operatornote').textContent=kit.desc;
  for(const b of $('operatorkits').children)b.setAttribute('aria-pressed',String(b.dataset.kit===o.kit));for(const b of $('operatoraccents').children)b.setAttribute('aria-pressed',String(b.dataset.key===o.accent));for(const b of $('operatorsmoke')?.children||[])b.setAttribute('aria-pressed',String(Number(b.dataset.smoke)===o.smoke));
  const host=$('operatortoggles');host.replaceChildren();for(const [key,label]of Object.entries(kit.toggles))if(label){const l=document.createElement('label');l.innerHTML='<input type="checkbox" data-toggle="'+key+'"'+(o[key]?' checked':'')+'> '+label;host.append(l);}
  const tw=$('operatortweaks'),T=TWEAKS[o.kit];if(tw&&T){tw.replaceChildren();const p=twParts(o.tw),set=(a,f,v)=>{this.opDraft.tw=cleanTw(o.kit,'a'+a+'f'+f+'v'+v);this.previewOperator();$('operatorstatus').textContent='Ritocco in anteprima. Applica per salvarlo: lo vedono anche gli altri giocatori.';};
   const row=(label,cls,items)=>{const l=document.createElement('div'),h=document.createElement('div');l.className='field-label';l.textContent=label;h.className=cls;h.setAttribute('role','group');h.setAttribute('aria-label',label);h.append(...items);tw.append(l,h);};
   const sw=(hex,title,on,fn)=>{const b=document.createElement('button');b.type='button';b.style.setProperty('--swatch',hex);b.title=title;b.setAttribute('aria-label',title);b.setAttribute('aria-pressed',String(on));b.onclick=fn;return b;};
   row('DETTAGLIO','paint-swatches',T.detail.map((hex,i)=>sw(hex,(DETAIL_NAMES[hex]||hex)+(i?'':' · originale'),p.a===i,()=>set(i,p.f,p.v))));
   row('FINITURA','model-choices tweak-finish',FINISHES.map((F,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML='<span>'+F.label+'</span>';b.setAttribute('aria-pressed',String(p.f===i));b.onclick=()=>set(p.a,i,p.v);return b;}));
   if(T.visor)row('VISIERA','paint-swatches',VISORS.map((V,i)=>sw(V?V.hex:'#55626b',V?V.label:'Originale',p.v===i,()=>set(p.a,p.f,i))));}
 }
 select(index){if(index===6){this.selectOperator();return;}document.getElementById('armory').classList.remove('operator-mode');document.querySelector('.finish-editor').classList.remove('operator-mode');for(const [,m]of this.operators||[])m.visible=false;
  this.camera.position.z=2.65;this.idleSince=performance.now();this.idleBase=null;this.index=index;this.onSelect(index);for(const [i,m]of this.models||[])m.visible=i===index;this.model=this.display(index);if(this.model)this.model.visible=true;const yaw=index===5?.45:-1.12;this.rotationTarget.set(.05,yaw);this.pivot.rotation.set(.05,yaw,.06);this.pivot.position.set(0,0,0);this.pivot.scale.setScalar(1);this.pivot.updateMatrixWorld(true);const previewBounds=new THREE.Box3().setFromObject(this.pivot);this.previewSize=previewBounds.getSize(new THREE.Vector3());this.previewCenter=previewBounds.getCenter(new THREE.Vector3());
 this.boundsDirty=this.layoutDirty=true;this.draft=cleanFinish(this.career?.data.finishes[index],index);this.renderModels();this.faceKit(true);this.previewFinish();$('finishstatus').textContent='';
 const w=WEAPONS[index],variant=variantFor(index,this.draft.model);armoryTitle(variant?variant.name:w.name,index);$('armory-description').textContent=variant?.desc||this.descriptions[index];this.showStats();Array.from($('armorychoices').children).forEach((b,i)=>b.classList.toggle('active',i===index));
 }
 // V42 b4a: the numbers of the design on show (a design may be a weapon of its own, weapon-stats.js).
 showStats(){const index=this.index;if(index===6)return;const w=weaponFor(index,this.draft),r=rulesFor(index,this.draft);$('ballistic-info').textContent=w.melee?'Fendente 35 · stoccata 65 · stoccata alle spalle 140':((designOf(index,this.draft)?designOf(index,this.draft).role+'. ':'')+'Testa ×4 · torace/braccia ×1 · addome ×1,25 · gambe ×0,75. Armatura: '+Math.round(r.penetration*100)+'% del danno nelle zone protette.');$('statdamage').textContent=w.damage;$('statrate').textContent=Math.round(60/w.rate);$('statmag').textContent=w.melee?'—':w.mag;for(const[id,v]of [['bardamage',w.damage/100],['barrate',(60/w.rate)/850],['barmag',w.mag/30]])$(id).style.width=Math.min(100,v*100)+'%';}
 // V42 b3b: an accessory on the gun's left side (side light, ammo cuff) turns the preview to that side.
 faceKit(now=false){if(this.index===6)return;const worn=variantKey(this.index,this.draft)==='stock'&&!variantFor(this.index,this.draft?.model)?.base;const y=(this.index===5?.45:-1.12)+(worn&&kitSide(this.index,this.draft?.kit)?Math.PI:0);if(Math.abs(Math.atan2(Math.sin(y-this.rotationTarget.y),Math.cos(y-this.rotationTarget.y)))<.01)return;this.rotationTarget.y=y;this.idleSince=performance.now();this.idleBase=null;if(now){this.pivot.rotation.y=y;this.boundsDirty=true;}}
 renderModels(){
  // A class's base design is its stock model (V42 AVERLA): it is the MODELLO DI SERIE button, not a second choice.
  const list=(VARIANTS[this.index]||[]).filter(v=>!v.base),host=$('weaponmodels');host.replaceChildren();
  const button=(id,name,tag)=>{const b=document.createElement('button');b.type='button';b.dataset.model=id;b.innerHTML='<span>'+name+'</span><small>'+tag+'</small>';host.append(b);};
  button('stock',WEAPONS[this.index].name,'MODELLO DI SERIE');for(const v of list)button(v.id,v.name,v.tag);
  host.closest('.finish-editor').classList.toggle('single-model',!list.length);
 }
 renderParams(){
  const v=variantFor(this.index,this.draft.model),host=$('modelparams');host.replaceChildren();$('modelnote').textContent=v?.desc||v?.note||'';
  if(!v)return;const build=cleanBuild(this.index,v.id,this.draft.build);
  for(const p of v.params){const label=document.createElement('label');
   if(p.type==='range'){label.innerHTML='<span>'+p.label+'</span><output>'+Math.round(build[p.key]*100)+'%</output><span><input type="range" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+build[p.key]+'" data-param="'+p.key+'" aria-label="'+p.label+'"></span>';}
   else{label.innerHTML='<span>'+p.label+'</span><select data-param="'+p.key+'" aria-label="'+p.label+'">'+p.options.map((o,n)=>'<option value="'+n+'"'+(n===build[p.key]?' selected':'')+'>'+o+'</option>').join('')+'</select>';}
   host.append(label);}
 }
 previewFinish(){
  // V46g: the weapon finish never touches the operator slot. Before, its controls stayed live under the operator editor and a
  // change ran applyFinish on the operator itself: the gear hidden by the kit came back and every operator material took the
  // weapon's paint program (one shared cache key: the gloves, band and body of every kit compiled as one).
  if(!(this.index>=0&&this.index<WEAPONS.length)||!this.model||!this.draft)return;
  applyFinish(this.model,this.index,this.draft);this.boundsDirty=true;this.showStats();
  for(const b of $('weaponmodels').children)b.setAttribute('aria-pressed',String(b.dataset.model===(this.draft.model||'stock')));
  if($('modelparams').dataset.for!==this.index+':'+this.draft.model){$('modelparams').dataset.for=this.index+':'+this.draft.model;this.renderParams();}else for(const out of $('modelparams').querySelectorAll('output')){const input=out.parentElement.querySelector('input')||out.nextElementSibling?.querySelector('input');if(input)out.textContent=Math.round(Number(input.value)*100)+'%';}
  {const v=variantFor(this.index,this.draft.model);armoryTitle(v?v.name:WEAPONS[this.index].name,this.index);$('armory-description').textContent=v?.desc||this.descriptions[this.index];}$('finishstyle').value=this.draft.style;$('finishpattern').value=this.draft.pattern;$('finishprime').checked=this.draft.prime!==false;$('finishglow').value=this.draft.glow||'oro';$('weaponkit').value=this.draft.kit;$('finishsurface').value=this.draft.surface;$('customprimary').value=this.draft.customPrimary||PAINTS[this.draft.primary].hex;$('customaccent').value=this.draft.customAccent||TRIMS[this.draft.accent].hex;$('customprimaryhex').value=$('customprimary').value;$('customaccenthex').value=$('customaccent').value;
  for(const [id,field]of [['primarypaints','primary'],['trimpaints','accent']])for(const b of $(id).children)b.setAttribute('aria-pressed',String(!this.draft[field==='primary'?'customPrimary':'customAccent']&&b.dataset.key===this.draft[field]));
  // A base design with a factory finish (V42 OB-510 AVERLA): kit, assets, coating and colours do not apply to it, so they
  // are shown locked, under the note that says why, instead of answering clicks with no change.
  {const fixed=!!variantFor(this.index,this.draft.model)?.base,ed=$('weaponmodels').closest('.finish-editor');ed?.classList.toggle('fixed-finish',fixed);
   for(const id of ['weaponkit','finishstyle','finishsurface','finishpattern','customprimary','customprimaryhex','customaccent','customaccenthex'])$(id).disabled=fixed;
   for(const b of document.querySelectorAll('#primarypaints button,#trimpaints button,#tacticalpresets button'))b.disabled=fixed;}
  // V42 b3b: a design that brings its own furniture (TAFANO, MAGLIO, the alternative knives, the AVERLA) wears no kit: the menu shows
  // that, locked, and keeps the saved choice for the base model.
  {const bare=!!variantFor(this.index,this.draft.model)?.base||variantKey(this.index,this.draft)!=='stock',sel=$('weaponkit');if(bare)sel.disabled=true;for(const o of sel.options)o.textContent=bare?'Non su questo modello':kitLabel(this.index,o.value);sel.title=bare?'Questo modello ha i suoi accessori: il kit vale per il modello di serie.':'';}
  const kills=this.career?.data.kills[this.index]||0;$('masteryvalue').textContent=kills+' KILL';$('masterybar').style.width=Math.min(100,kills/15*100)+'%';
  const next=kills<5?5:kills<15?15:null;$('masterynext').textContent=next?(next-kills)+' eliminazioni per '+(next===5?'Bicolore':'Topografia'):'Tutti i disegni di questa arma sono disponibili.';
  for(const option of $('finishpattern').options){option.disabled=!this.career?.canUse(this.index,option.value);option.textContent=PATTERNS[option.value].label+(option.disabled?' · '+PATTERNS[option.value].kills+' kill richieste':'');}
 }
 open(index){this.layoutDirty=this.boundsDirty=true;this.returnFocus=document.activeElement;this.active=true;$('armory').hidden=false;this.select(index);$('closearmory').focus()}
 close(){if(!this.active)return;
  // A finish or operator left unapplied: warn once, a second CHIUDI discards it.
  const unsaved=this.index<6?this.draft&&JSON.stringify(cleanFinish(this.draft,this.index))!==JSON.stringify(cleanFinish(this.career?.data.finishes[this.index],this.index)):this.opDraft&&JSON.stringify(cleanOperator(this.opDraft))!==JSON.stringify(cleanOperator(this.career?.data.operator));
  if(unsaved&&!this.warnedClose){this.warnedClose=true;const status=$(this.index<6?'finishstatus':'operatorstatus');if(status)status.textContent='Modifiche non applicate: premi '+(this.index<6?'APPLICA FINITURA':'APPLICA OPERATORE')+', oppure CHIUDI di nuovo per scartarle.';return;}
  this.warnedClose=false;this.active=false;this.drag=false;$('armory').hidden=true;this.onClose();this.returnFocus?.focus?.()}
 setTheme(key){if(key===this.themeKey)return;this.themeKey=key;const colors=(MAP_THEMES[key]||MAP_THEMES.caldera).studio,g=this.studioCanvas.getContext('2d'),gradient=g.createLinearGradient(0,0,0,256);for(let n=0;n<3;n++)gradient.addColorStop(n===1?.65:n/2,colors[n]);g.fillStyle=gradient;g.fillRect(0,0,2,256);this.scene.background.needsUpdate=true;}
 // V45 operator line-up: every kit standing in the studio, the chosen one steps forward and turns to you.
 // Same renderer and studio scene as the Officina: no second WebGL context.
 lineupAgent(team,kit){this.lineupBodies??=new Map();const key=team+':'+kit;let g=this.lineupBodies.get(key);
  if(!g){const agent=createAgent(team,3);if(!agent)return null;const ground=groundHeight(0,0);agent.position.y=ground;animateAgent(agent,1/60,false,3,0,{life:1,time:0,pitch:0,vx:0,vz:0,groundY:ground});
   dressOperator(agent,team,{...cleanOperator(this.career?.data.operator),kit,tw:this.career?.data.tweaks?.[kit]||''});agent.updateMatrixWorld(true);agent.userData.shadow&&(agent.userData.shadow.visible=false);
   const box=new THREE.Box3().setFromObject(agent),c=box.getCenter(new THREE.Vector3());agent.position.x-=c.x;agent.position.z-=c.z;agent.position.y-=box.min.y;g=new THREE.Group();g.add(agent);g.userData.kit=kit;g.userData.ground=ground;g.userData.lift=agent.position.y;g.userData.team=team;g.visible=false;this.scene.add(g);this.lineupBodies.set(key,g);}
  // A whole-body kit arrives a moment later: dress again (a no-op once the key matches).
  dressOperator(g.children[0],team,{...cleanOperator(this.career?.data.operator),kit,tw:this.career?.data.tweaks?.[kit]||''});
  return g;}
 // Check Fable: a stage for the line-up (it stood in an empty gradient): a dark lacquered floor that fades into the backdrop, one low
 // plinth per operator with a rim in the team's colour, a soft light wall behind the row and a key light that follows the pick.
 lineupStage(team){if(!this.lineupStageGroup){const G=new THREE.Group(),tex=(stops,w=4,h=256,radial=false)=>{const c=document.createElement('canvas');c.width=radial?256:w;c.height=h;const g=c.getContext('2d'),gr=radial?g.createRadialGradient(128,128,0,128,128,128):g.createLinearGradient(0,0,0,h);stops.forEach(([o,col])=>gr.addColorStop(o,col));g.fillStyle=gr;g.fillRect(0,0,c.width,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;};
   const floor=new THREE.Mesh(new THREE.CircleGeometry(9,64),new THREE.MeshStandardMaterial({color:0x1a2127,roughness:.32,metalness:.25,alphaMap:tex([[0,'#fff'],[.55,'#fff'],[1,'#000']],256,256,true),transparent:true,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-.061,.4);floor.renderOrder=-1;G.add(floor);
   const wall=new THREE.Mesh(new THREE.CylinderGeometry(9,9,7,64,1,true,-Math.PI*.42,Math.PI*.84),new THREE.MeshBasicMaterial({map:tex([[0,'#0b1116'],[.38,'#24323a'],[.62,'#3a4a50'],[.8,'#1a252b'],[1,'#0e151a']]),side:THREE.BackSide,depthWrite:false,fog:false}));wall.position.set(0,3.2,1.5);wall.rotation.y=Math.PI;G.add(wall);
   const band=new THREE.Mesh(new THREE.CylinderGeometry(8.9,8.9,.035,64,1,true,-Math.PI*.42,Math.PI*.84),new THREE.MeshBasicMaterial({color:0xffd27a,side:THREE.BackSide,transparent:true,opacity:.34,depthWrite:false,fog:false}));band.position.set(0,4.55,1.5);band.rotation.y=Math.PI;G.add(band);
   // V53 showcase: the gold line ran behind the operators' chests; it is a cornice above their heads now. Behind the picked operator
   // the wall carries a soft halo, a stage beam falls on it from above and it stands on a two-step dais with a gold lip; the rest of
   // the row steps back and apart, so the pick reads as the piece in the shop window.
   const add=THREE.AdditiveBlending,halo=new THREE.Mesh(new THREE.PlaneGeometry(5.2,6.4),new THREE.MeshBasicMaterial({map:tex([[0,'rgba(255,236,200,.5)'],[.35,'rgba(150,170,190,.2)'],[1,'rgba(0,0,0,0)']],256,256,true),transparent:true,blending:add,depthWrite:false,fog:false,toneMapped:false}));halo.position.set(0,1.7,-3.2);halo.renderOrder=-2;G.add(halo);G.userData.halo=halo;
   const beam=new THREE.Mesh(new THREE.CylinderGeometry(.16,.86,5.4,40,1,true),new THREE.MeshBasicMaterial({map:tex([[0,'rgba(255,240,214,.13)'],[.55,'rgba(255,240,214,.05)'],[1,'rgba(255,240,214,0)']]),transparent:true,blending:add,depthWrite:false,side:THREE.DoubleSide,fog:false,toneMapped:false}));beam.position.y=2.7;beam.renderOrder=3;G.add(beam);G.userData.beam=beam;
   const pool=new THREE.Mesh(new THREE.CircleGeometry(1.25,48),new THREE.MeshBasicMaterial({map:tex([[0,'rgba(255,232,190,.3)'],[.5,'rgba(255,232,190,.1)'],[1,'rgba(0,0,0,0)']],256,256,true),transparent:true,blending:add,depthWrite:false,fog:false,toneMapped:false}));pool.rotation.x=-Math.PI/2;pool.position.y=-.058;G.add(pool);G.userData.pool=pool;
   const dais=new THREE.Group(),daisMat=new THREE.MeshStandardMaterial({color:0x1d2429,roughness:.3,metalness:.7}),gold=new THREE.MeshStandardMaterial({color:0xd9a441,roughness:.28,metalness:.9,emissive:0x5a3c0c,emissiveIntensity:.6});
   const s1=new THREE.Mesh(new THREE.CylinderGeometry(.62,.68,.04,56),daisMat),s2=new THREE.Mesh(new THREE.CylinderGeometry(.5,.53,.035,56),daisMat),lip=new THREE.Mesh(new THREE.TorusGeometry(.625,.007,8,72),gold),lip2=new THREE.Mesh(new THREE.TorusGeometry(.505,.005,8,72),gold);
   s1.position.y=-.088;s2.position.y=-.052;lip.rotation.x=lip2.rotation.x=Math.PI/2;lip.position.y=-.068;lip2.position.y=-.0345;dais.add(s1,s2,lip,lip2);G.add(dais);G.userData.dais=dais;
   const plinthGeo=new THREE.CylinderGeometry(.36,.4,.06,40),rimGeo=new THREE.TorusGeometry(.385,.008,6,48),plinthMat=new THREE.MeshStandardMaterial({color:0x252d33,roughness:.45,metalness:.5});
   G.userData.rims=[];G.userData.plinths=OPERATOR_KITS.map(()=>{const p=new THREE.Group(),b=new THREE.Mesh(plinthGeo,plinthMat),r=new THREE.Mesh(rimGeo,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));b.position.y=-.03;r.rotation.x=Math.PI/2;r.position.y=-.002;p.add(b,r);G.userData.rims.push(r);G.add(p);return p;});
   const key=new THREE.SpotLight(0xfff1dc,34,14,.26,.7,1.6);key.position.set(0,5.4,5.2);G.add(key,key.target);G.userData.key=key;
   const kick=new THREE.SpotLight(0xffffff,16,9,.42,.8,1.4);kick.position.set(0,3.4,-2.6);G.add(kick,kick.target);G.userData.kick=kick;
   const back=new THREE.DirectionalLight(0x9fc4ff,1.1);back.position.set(-2,3,-4);G.add(back);
   this.scene.add(G);this.lineupStageGroup=G;}
  const G=this.lineupStageGroup,col=new THREE.Color(team==='blue'?0x2a8cff:0xff2e2a);G.visible=true;G.userData.rims.forEach(r=>r.material.color.copy(col));G.userData.kick.color.copy(col).lerp(new THREE.Color(0xffffff),.45);return G;}
 showLineup(team,kit){this.lineupTeam=team;this.lineupPick=kit;this.lineupCam??=new THREE.PerspectiveCamera(30,16/9,.1,60);
  this.lineupStage(team);
  OPERATOR_KITS.forEach((k,i)=>{const g=this.lineupAgent(team,k.id);if(!g)return;g.visible=true;g.userData.slot=i;g.position.set((i-(OPERATOR_KITS.length-1)/2)*.95,0,0);g.rotation.y=Math.PI;});
  for(const [key,g]of this.lineupBodies||[])if(!key.startsWith(team+':'))g.visible=false;}
 // Check Fable: which operator of the line-up is under a screen point (its standing box projected through the line-up camera), or null.
 lineupHit(px,py,width,height){if(!this.lineupTeam||!this.lineupCam)return null;const cam=this.lineupCam,v=this.lineupHitV??=new THREE.Vector3();let best=null,bd=1e9;
  for(const k of OPERATOR_KITS){const g=this.lineupBodies?.get(this.lineupTeam+':'+k.id);if(!g?.visible)continue;v.set(g.position.x,0,g.position.z).project(cam);const fx=(v.x+1)/2*width,fy=(1-v.y)/2*height;
   v.set(g.position.x,1.95*g.scale.x,g.position.z).project(cam);const hy=(1-v.y)/2*height,half=(fy-hy)*.27,d=Math.abs(px-fx);if(py>hy-12&&py<fy+16&&d<half&&d<bd){bd=d;best=k.id;}}
  return best;}
 hideLineup(){for(const [,g]of this.lineupBodies||[])g.visible=false;if(this.lineupStageGroup)this.lineupStageGroup.visible=false;this.lineupTeam=null;}
 renderLineup(width,height,dt=1/60){if(!this.lineupTeam)return;const cam=this.lineupCam,f=1-Math.exp(-9*Math.min(.05,dt));cam.aspect=width/Math.max(1,height);cam.fov=cam.aspect<1.5?40:31;cam.updateProjectionMatrix();// V46f: the camera eases a little toward the picked operator (a fifth of its offset), so a picked end of the row is never cut.
  const pickIndex=OPERATOR_KITS.findIndex(k=>k.id===this.lineupPick),pickX=pickIndex<0?0:(pickIndex-(OPERATOR_KITS.length-1)/2)*.95*.15;this.lineupCamX=(this.lineupCamX??pickX)+(pickX-(this.lineupCamX??pickX))*f;
  // V53: the camera stands as near as the row allows: the whole line-up stays in frame at any window shape.
  const camZ=Math.min(16,Math.max(cam.aspect<1.5?10.5:8.4,((OPERATOR_KITS.length-1)/2*.95+.25+Math.abs(this.lineupCamX)+.42)/(Math.tan(cam.fov*Math.PI/360)*cam.aspect)));this.lineupCamZ=camZ;
  cam.position.set(this.lineupCamX,1.2,camZ);cam.lookAt(this.lineupCamX,.74,0);
  // V55: on short landscape phones game.js hands over the free band between the title and the name buttons (fractions of the
  // height): the camera backs off until the picked operator (nearest, tallest) and its plinth fit it, then the frame slides into it.
  const band=this.lineupBand;if(band&&band.bottom-band.top>.2){const p=this.lineupBandP??=new THREE.Vector3(),px=pickIndex<0?0:this.lineupCamX+((pickIndex-(OPERATOR_KITS.length-1)/2)*.95-this.lineupCamX)*.8;cam.clearViewOffset();
   let z=camZ,top=0,bot=0;for(let i=0;i<8;i++){cam.position.set(this.lineupCamX,1.2,z);cam.lookAt(this.lineupCamX,.74,0);cam.updateMatrixWorld();
    top=(1-p.set(px,2.3,1.6).project(cam).y)/2;bot=(1-p.set(px,0,2.15).project(cam).y)/2;const need=(bot-top)/(band.bottom-band.top);if(need<=1.01)break;z=Math.min(30,z*need*1.03);}
   this.lineupCamZ=z;const dy=((top+bot)/2-(band.top+band.bottom)/2)*height;cam.setViewOffset(width,height,0,dy,width,height);}
  else if(cam.view)cam.clearViewOffset();
  // V46e: every operator breathes in its own idle (operator-kits.js STYLE); the one just picked plays its 1.5 s pose-in. Posed
  // with its stand reset (the foot plants are in world metres), then put back. Pick screen only, never on phones' match path.
  const now=performance.now(),tmpP=this.lineupTmpP??=new THREE.Vector3(),tmpE=this.lineupTmpE??=new THREE.Euler(),tmpS=this.lineupTmpS??=new THREE.Vector3();
  for(const k of OPERATOR_KITS){const g=this.lineupAgent(this.lineupTeam,k.id);if(!g)continue;const on=k.id===this.lineupPick,slot=g.userData.slot??0,away=pickIndex<0||on?0:Math.sign(slot-pickIndex)*(.2+.05/Math.max(1,Math.abs(slot-pickIndex))),hx=on?this.lineupCamX+((slot-(OPERATOR_KITS.length-1)/2)*.95-this.lineupCamX)*(1-1.6/(this.lineupCamZ||8.4)):(slot-(OPERATOR_KITS.length-1)/2)*.95+away;g.position.x+=(hx-g.position.x)*f;g.position.z+=((on?1.6:-.25)-g.position.z)*f;g.rotation.y+=(Math.PI-g.rotation.y)*f;const sc=on?1.2:.93;g.scale.setScalar(g.scale.x+(sc-g.scale.x)*f);
   {const st=this.lineupStageGroup,p=st?.userData.plinths[g.userData.slot];if(p){p.position.set(g.position.x,0,g.position.z);p.scale.setScalar(g.scale.x);}if(on&&st){const u=st.userData;u.key.target.position.set(g.position.x,1.0,g.position.z);u.key.position.x=g.position.x;u.kick.position.x=g.position.x-.6;u.kick.target.position.set(g.position.x,1.2,g.position.z);u.dais.position.set(g.position.x,0,g.position.z);u.dais.scale.setScalar(g.scale.x);u.beam.position.set(g.position.x,2.7,g.position.z);u.pool.position.set(g.position.x,-.058,g.position.z+.1);u.halo.position.x=g.position.x*1.5;}}
   const agent=g.children[0];if(!agent)continue;if(on&&g.userData.introFor!==this.lineupPick+':'+this.lineupTeam){g.userData.introFor=this.lineupPick+':'+this.lineupTeam;g.userData.introAt=now;}if(!on)g.userData.introFor=null;
   const t=on?(now-(g.userData.introAt||0))/1500:1;tmpP.copy(g.position);tmpE.copy(g.rotation);tmpS.copy(g.scale);g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.setScalar(1);g.updateMatrixWorld(true);
   const gy=g.userData.ground??0;agent.position.y=gy;animateAgent(agent,Math.min(.05,dt),false,3,0,{life:1,time:now,pitch:0,vx:0,vz:0,groundY:gy,front:true,intro:t<1?{t}:null});agent.position.y=g.userData.lift??agent.position.y;g.position.copy(tmpP);g.rotation.copy(tmpE);g.scale.copy(tmpS);}
  const pv=this.pivot.visible,fs=this.floorShadow.visible;this.pivot.visible=this.floorShadow.visible=false;this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,width,height);this.renderer.autoClear=true;this.renderer.render(this.scene,cam);this.pivot.visible=pv;this.floorShadow.visible=fs;}
 // V45 portraits: one head-and-shoulders render per team and kit into a small target, read back once
 // and kept as an image URL (operator-portrait.js). Never called on phones.
 portrait(team,kit){this.portraits??=new Map();const key=team+':'+kit;if(this.portraits.has(key))return this.portraits.get(key);if(BODIES[kit]&&!bodyReady(kit)){loadBody(kit);return null;}let url=null;
  try{const g=this.lineupAgent(team,kit);if(!g)return null;const size=192,rt=this.portraitTarget??=new THREE.WebGLRenderTarget(size,size,{samples:4});rt.texture.colorSpace=THREE.SRGBColorSpace;
   const cam=this.portraitCam??=new THREE.PerspectiveCamera(24,1,.05,20),hidden=[];for(const o of this.scene.children)if(o!==g&&o.visible&&!o.isLight){hidden.push(o);o.visible=false;}
   const was={v:g.visible,p:g.position.clone(),r:g.rotation.y,s:g.scale.x},bg=this.scene.background;g.visible=true;g.position.set(0,0,0);g.rotation.y=Math.PI+.22;g.scale.setScalar(1);g.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(g),top=box.max.y;cam.position.set(.18,top-.28,1.55);cam.lookAt(0,top-.36,0);
   // V46d: a key light from the front left and a rim from behind in the operator's third colour, only for the portrait.
   const sig=signatureOf(kit),key=this.portraitKey??=new THREE.DirectionalLight(0xfff4e8,1.6),rim=this.portraitRim??=new THREE.DirectionalLight(0xffffff,2.4);
   key.position.set(-1.2,top+.6,2);key.target.position.set(0,top-.36,0);rim.position.set(.9,top+.4,-1.6);rim.target.position.set(0,top-.36,0);rim.color.set(sig?.accent||'#9fb4c8').lerp(new THREE.Color(1,1,1),.35);
   this.scene.add(key,key.target,rim,rim.target);
   this.scene.background=null;const r=this.renderer,prevTarget=r.getRenderTarget(),clear=r.getClearAlpha();r.setRenderTarget(rt);r.setClearAlpha(0);r.clear();r.render(this.scene,cam);this.scene.remove(key,key.target,rim,rim.target);
   const px=new Uint8Array(size*size*4);r.readRenderTargetPixels(rt,0,0,size,size,px);r.setRenderTarget(prevTarget);r.setClearAlpha(clear);this.scene.background=bg;for(const o of hidden)o.visible=true;
   g.visible=was.v;g.position.copy(was.p);g.rotation.y=was.r;g.scale.setScalar(was.s);
   const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),img=ctx.createImageData(size,size);for(let y=0;y<size;y++)img.data.set(px.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);ctx.putImageData(img,0,0);
   // V46d: behind the bust a soft radial gradient in the operator's own main colour (lifted, then into near black), the team in a faint lower glow.
   if(sig){const m0=new THREE.Color(sig.main),L=m0.r*.2126+m0.g*.7152+m0.b*.0722,m=m0.multiplyScalar(Math.min(1,.3/Math.max(L,.01))),hi=m.clone().lerp(new THREE.Color(1,1,1),.12).multiplyScalar(.85),lo=m.clone().multiplyScalar(.22),css=c=>'#'+c.getHexString(),b=document.createElement('canvas');b.width=b.height=size;const bx=b.getContext('2d'),grad=bx.createRadialGradient(size*.5,size*.34,size*.05,size*.5,size*.5,size*.78);
    grad.addColorStop(0,css(hi));grad.addColorStop(.55,css(m.clone().multiplyScalar(.5)));grad.addColorStop(1,css(lo));bx.fillStyle=grad;bx.fillRect(0,0,size,size);
    const tg=bx.createLinearGradient(0,size*.7,0,size);tg.addColorStop(0,'rgba(0,0,0,0)');tg.addColorStop(1,team==='orange'?'rgba(255,46,42,.22)':'rgba(42,140,255,.22)');bx.fillStyle=tg;bx.fillRect(0,0,size,size);
    ctx.globalCompositeOperation='destination-over';ctx.drawImage(b,0,0);ctx.globalCompositeOperation='source-over';}
   url=c.toDataURL('image/png');}catch(e){url=null;}
  this.portraits.set(key,url);return url;}
 render(width,height,dt=1/60){
  // Left alone, the piece turns slowly a little each way, like a showroom turntable.
  const now=performance.now();if(!this.drag&&now-this.idleSince>2600&&!matchMedia('(prefers-reduced-motion:reduce)').matches){if(this.idleBase===null){this.idleBase=this.rotationTarget.y;this.idleStart=now;}const u=(now-this.idleStart)/1000,ease=Math.min(1,u/1.5);this.rotationTarget.y=this.idleBase+ease*.42*Math.sin(u*.45);}
  const follow=1-Math.exp(-20*Math.min(.05,Math.max(0,dt)));this.pivot.rotation.x+=(this.rotationTarget.x-this.pivot.rotation.x)*follow;this.pivot.rotation.y+=Math.atan2(Math.sin(this.rotationTarget.y-this.pivot.rotation.y),Math.cos(this.rotationTarget.y-this.pivot.rotation.y))*follow;
  if(this.layoutDirty||width!==this.lastWidth||height!==this.lastHeight){
   const editor=document.querySelector('.finish-editor').getBoundingClientRect(),info=document.querySelector('.armoryinfo').getBoundingClientRect(),landscape=height<600&&width<1000&&width>height;
   // Phone landscape: the stage sits between the title column and the editor, above the picker. V43 b56: a phone held
   // sideways narrower than 700 px (iPhone SE, 667) took the portrait branch and drew the weapon above the header.
   // (b56 rev) Up to 760 px wide the name sits on one line above the stage (style.css), so the stage spans the free width.
   const picker=document.getElementById('armorychoices').getBoundingClientRect(),narrow=width<700&&!landscape,tight=landscape&&width<=760;
   const left=narrow||tight?14:landscape?info.right+10:info.right+18,right=narrow?width-14:editor.left-18;
   const top=narrow?Math.max(118,info.bottom+10):tight?info.bottom+4:landscape?62:80,bottom=narrow?editor.top-16:tight?picker.top-8:landscape?picker.top-16:height-125;
   this.viewport={left,bottom,w:Math.max(100,right-left),h:Math.max(80,bottom-top)};this.lastWidth=width;this.lastHeight=height;this.layoutDirty=false;
   const hint=document.querySelector('.rotatehint');hint.style.left=(left+this.viewport.w/2)+'px';hint.style.top=(bottom-14)+'px';hint.style.bottom='auto';hint.textContent=document.documentElement.classList.contains('touch-mode')?'TRASCINA PER RUOTARE':'↔  TRASCINA PER RUOTARE · ROTELLA ZOOM';
   this.camera.aspect=this.viewport.w/this.viewport.h;this.camera.updateProjectionMatrix();
  }
  {const stamp=this.model?.userData?.variantStamp;if(stamp!==this.variantStamp){this.variantStamp=stamp;this.boundsDirty=true;}}
  if(this.boundsDirty){
   this.pivot.scale.setScalar(1);this.pivot.position.set(0,0,0);this.pivot.rotation.set(0,0,0);this.pivot.updateMatrixWorld(true);this.previewBox.makeEmpty();
   // Skinned bodies keep their authored, bind-space geometry: the operator is measured as a fixed figure instead.
   this.pivot.traverseVisible(o=>{if(o.isMesh&&!o.isSkinnedMesh){o.geometry.computeBoundingBox();this.previewBox.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
   if(this.index===6&&this.model){const agent=this.model.children[0];this.previewBox.union(new THREE.Box3(new THREE.Vector3(-.42,0,-.42),new THREE.Vector3(.42,1.92,.42)).applyMatrix4(agent.matrixWorld));}
   this.previewBox.getSize(this.previewSize);this.previewBox.getCenter(this.previewCenter);this.previewRadius=this.previewSize.length()/2;this.pivot.rotation.set(this.rotationTarget.x,this.rotationTarget.y,.06);this.boundsDirty=false;
   // Fit the model's projected extent at its presentation angle, not its bounding sphere:
   // a long rifle seen from the side filled a third of the stage, a pistol most of it.
   const q=this.pivot.quaternion,c=new THREE.Vector3();let ex=0,ey=0;for(let k=0;k<8;k++){c.set(k&1?this.previewBox.max.x:this.previewBox.min.x,k&2?this.previewBox.max.y:this.previewBox.min.y,k&4?this.previewBox.max.z:this.previewBox.min.z).sub(this.previewCenter).applyQuaternion(q);ex=Math.max(ex,Math.abs(c.x));ey=Math.max(ey,Math.abs(c.y));}
   this.previewExtent={x:Math.max(.01,ex),y:Math.max(.01,ey)};
  }
  const {left,bottom,w,h}=this.viewport,halfH=Math.tan(this.camera.fov*Math.PI/360)*this.camera.position.z,halfW=halfH*w/Math.max(1,h),fill=width<700?.7:.8,scale=this.previewExtent?Math.min(halfW*fill/this.previewExtent.x,halfH*(this.index===6?.92:this.index===0?.6:.72)/this.previewExtent.y):studioScale(this.previewRadius,w,h,this.camera.fov);this.pivot.scale.setScalar(scale);this.pivot.position.copy(this.fitCenter.copy(this.previewCenter).applyQuaternion(this.pivot.quaternion)).multiplyScalar(-scale);
  if(this.previewExtent){const ext=this.previewExtent;this.floorShadow.position.set(0,-ext.y*scale-.035,0);this.floorShadow.scale.set(ext.x*scale*2.3,ext.x*scale*.55,1);}
  // Reserve the real model viewport between the HTML panels. Background and
  // weapon render separately, so even narrow layouts never cover the muzzle.
  this.renderer.setViewport(0,0,width,height);this.renderer.setScissorTest(false);this.renderer.autoClear=true;this.pivot.visible=this.floorShadow.visible=false;this.renderer.render(this.scene,this.camera);this.pivot.visible=this.floorShadow.visible=true;
  const background=this.scene.background;this.scene.background=null;this.renderer.autoClear=false;this.renderer.clearDepth();this.renderer.setViewport(left,height-bottom,w,h);this.renderer.setScissor(left,height-bottom,w,h);this.renderer.setScissorTest(true);this.renderer.render(this.scene,this.camera);
  this.scene.background=background;this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,width,height);
 }

}
