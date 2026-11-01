import {MAP_THEMES} from './visual-theme.js?v=40.0';
import {KITS} from './weapon-kits.js?v=40.0';
import {GUN_RULES} from './combat-rules.js?v=40.0';
import {applyFinish,cleanFinish,PAINTS,TRIMS,PATTERNS} from './weapon-finish.js?v=40.0';
import {VARIANTS,variantFor,cleanBuild} from './weapon-variants.js?v=40.0';
import * as THREE from './vendor/three.module.js';
import {createDisplayWeapon,disposeAgent,createAgent,animateAgent,dressOperator} from './assets.js?v=40.0';
import {KITS as OPERATOR_KITS,kitFor,cleanOperator} from './operator-kits.js?v=40.0';
import {WEAPONS,groundHeight} from './shared.js?v=40.0';
const $=id=>document.getElementById(id);
export const studioScale=(radius,width,height,fov=34)=>Math.min(1,width/Math.max(1,height))*Math.tan(fov*Math.PI/360)*2.65*.86/Math.max(.01,radius);
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
  for(const kit of OPERATOR_KITS){const b=document.createElement('button');b.type='button';b.dataset.kit=kit.id;b.innerHTML='<span>'+kit.name+'</span><small>'+kit.tag+'</small>';b.onclick=()=>{this.opDraft.kit=kit.id;this.previewOperator();$('operatorstatus').textContent='Kit '+kit.name+' in anteprima. Applica per salvarlo.';};$('operatorkits').append(b);}
  for(const [key,choice]of Object.entries(PAINTS)){const b=document.createElement('button');b.type='button';b.style.setProperty('--swatch',choice.hex);b.title=choice.label;b.setAttribute('aria-label',choice.label);b.dataset.key=key;b.onclick=()=>{this.opDraft.accent=key;this.previewOperator();};$('operatoraccents').append(b);}
  $('operatortoggles').addEventListener('change',e=>{const el=e.target.closest('[data-toggle]');if(!el)return;this.opDraft[el.dataset.toggle]=el.checked?1:0;this.previewOperator();});
  $('applyoperator').onclick=()=>{this.career?.setOperator(this.opDraft);this.onOperator();$('operatorstatus').textContent=this.career?.persisted?'Operatore applicato. Gli altri giocatori lo vedono.':'Operatore attivo in questa sessione. Il browser non consente il salvataggio.';};
  document.getElementById('team')?.addEventListener('change',()=>{if(this.active&&this.index===6)this.select(6);});
  $('closearmory').onclick=()=>this.close();
  window.addEventListener('pointerdown',e=>{if(!this.active||e.target.closest('button,input,select,label,.finish-editor,.armoryinfo'))return;this.drag=true;this.idleSince=performance.now();this.idleBase=null;this.lastX=e.clientX;this.lastY=e.clientY;});window.addEventListener('pointerup',()=>this.drag=false);window.addEventListener('pointercancel',()=>this.drag=false);window.addEventListener('blur',()=>this.drag=false);window.addEventListener('wheel',e=>{if(!this.active||e.target.closest('.finish-editor'))return;e.preventDefault();this.camera.position.z=THREE.MathUtils.clamp(this.camera.position.z+e.deltaY*.002,1.2,4.2)},{passive:false});
  window.addEventListener('pointermove',e=>{if(!this.active||!this.drag)return;this.idleSince=performance.now();this.rotationTarget.y+=(e.clientX-this.lastX)*.009;this.rotationTarget.x=THREE.MathUtils.clamp(this.rotationTarget.x+(e.clientY-this.lastY)*.007,-1,1);this.lastX=e.clientX;this.lastY=e.clientY;});
  window.addEventListener('keydown',e=>{if(!this.active)return;if(e.code==='Tab'){const fields=[...$('armory').querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')].filter(x=>x.getClientRects().length);const at=fields.indexOf(document.activeElement),next=(at+(e.shiftKey?fields.length-1:1))%fields.length;e.preventDefault();fields[next]?.focus();return;}if(e.code==='Escape'){e.preventDefault();this.close()}else if(!e.target.closest('input,select')&&/^Digit[1-7]$/.test(e.code))this.select(Number(e.code.at(-1))-1)});
  for(const [id,choices,field]of [['primarypaints',PAINTS,'primary'],['trimpaints',TRIMS,'accent']])for(const [key,choice]of Object.entries(choices)){
   const b=document.createElement('button');b.type='button';b.style.setProperty('--swatch',choice.hex);b.title=choice.label;b.setAttribute('aria-label',choice.label);b.dataset.key=key;b.onclick=()=>{this.draft.style='paint';this.draft[field]=key;this.draft[field==='primary'?'customPrimary':'customAccent']=null;this.previewFinish();};$(id).append(b);
  }
  for(const [key,kit]of Object.entries(KITS)){const o=document.createElement('option');o.value=key;o.textContent=kit.label;$('weaponkit').append(o);}
  for(const [key,label,config]of [['recon','RECON',{primary:'olive',accent:'carbon',kit:'field',surface:'matte'}],['desert','DESERT',{primary:'sand',accent:'carbon',kit:'rail',surface:'matte'}],['urban','URBAN',{primary:'graphite',accent:'titanium',kit:'service',surface:'satin'}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{this.draft=cleanFinish({...config,model:this.draft.model,build:this.draft.build,style:'paint',pattern:this.draft.pattern},this.index);this.previewFinish();$('finishstatus').textContent='Assetto '+label+' in anteprima. Applica per salvarlo.';};$('tacticalpresets').append(b);}
  $('weaponkit').onchange=()=>{this.draft.kit=$('weaponkit').value;this.previewFinish();};
  // V33: the class's base model and its original OB designs; each design exposes its tuning.
  $('weaponmodels').addEventListener('click',e=>{const b=e.target.closest('button[data-model]');if(!b)return;this.draft.model=b.dataset.model;this.draft.build=cleanBuild(this.index,this.draft.model,this.draft.build);this.previewFinish();$('finishstatus').textContent=b.dataset.model==='stock'?'Modello di serie in anteprima. Applica per salvarlo.':'Disegno originale in anteprima. Regola i dettagli, poi Applica.';});
  $('modelparams').addEventListener('input',e=>{const el=e.target.closest('[data-param]');if(!el)return;this.draft.build={...(this.draft.build||{}),[el.dataset.param]:Number(el.value)};this.draft.build=cleanBuild(this.index,this.draft.model,this.draft.build);this.previewFinish();});
  $('finishsurface').onchange=()=>{this.draft.surface=$('finishsurface').value;this.draft.style='paint';this.previewFinish();};
  for(const [id,field]of [['customprimary','customPrimary'],['customaccent','customAccent']])$(id).oninput=()=>{this.draft[field]=$(id).value;this.draft.style='paint';this.previewFinish();};
  for(const [id,field]of [['customprimaryhex','customPrimary'],['customaccenthex','customAccent']])$(id).oninput=()=>{if(/^#[0-9a-f]{6}$/i.test($(id).value)){this.draft[field]=$(id).value.toLowerCase();this.draft.style='paint';this.previewFinish();}else $('finishstatus').textContent='Colore esadecimale: # seguito da 6 cifre (0–9, A–F).';};
  $('finishstyle').onchange=()=>{this.draft.style=$('finishstyle').value;this.previewFinish();};
  $('finishpattern').onchange=()=>{this.draft.pattern=$('finishpattern').value;this.draft.style='paint';this.previewFinish();};
  $('applyfinish').onclick=()=>{if(!this.career?.setFinish(this.index,this.draft)){$('finishstatus').textContent='Completa la maestria richiesta per questo disegno.';return;}this.onFinish();$('finishstatus').textContent=this.career.persisted?'Finitura applicata. Visibile anche agli altri giocatori.':'Finitura attiva in questa sessione. Il browser non consente il salvataggio.';};
  $('resetfinish').onclick=()=>{this.draft=cleanFinish(null,this.index);this.career?.setFinish(this.index,this.draft);this.onFinish();this.previewFinish();$('finishstatus').textContent='Finitura originale ripristinata.';};

 }
 // Display models are built once and kept: rebuilding on every selection cloned the rig
 // and compiled its studio shaders mid-frame (100–240 ms per weapon, 488 ms for the M24).
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
  const kit=kitFor(o.kit);$('armory-title').textContent=kit.name;$('armory-description').textContent=kit.desc;$('operatornote').textContent=kit.desc;
  for(const b of $('operatorkits').children)b.setAttribute('aria-pressed',String(b.dataset.kit===o.kit));for(const b of $('operatoraccents').children)b.setAttribute('aria-pressed',String(b.dataset.key===o.accent));
  const host=$('operatortoggles');host.replaceChildren();for(const [key,label]of Object.entries(kit.toggles))if(label){const l=document.createElement('label');l.innerHTML='<input type="checkbox" data-toggle="'+key+'"'+(o[key]?' checked':'')+'> '+label;host.append(l);}
 }
 select(index){if(index===6){this.selectOperator();return;}document.getElementById('armory').classList.remove('operator-mode');document.querySelector('.finish-editor').classList.remove('operator-mode');for(const [,m]of this.operators||[])m.visible=false;
  this.camera.position.z=2.65;this.idleSince=performance.now();this.idleBase=null;this.index=index;this.onSelect(index);for(const [i,m]of this.models||[])m.visible=i===index;this.model=this.display(index);if(this.model)this.model.visible=true;const yaw=index===5?.45:-1.12;this.rotationTarget.set(.05,yaw);this.pivot.rotation.set(.05,yaw,.06);this.pivot.position.set(0,0,0);this.pivot.scale.setScalar(1);this.pivot.updateMatrixWorld(true);const previewBounds=new THREE.Box3().setFromObject(this.pivot);this.previewSize=previewBounds.getSize(new THREE.Vector3());this.previewCenter=previewBounds.getCenter(new THREE.Vector3());
 this.boundsDirty=this.layoutDirty=true;this.draft=cleanFinish(this.career?.data.finishes[index],index);this.renderModels();this.previewFinish();$('finishstatus').textContent='';
 const w=WEAPONS[index],variant=variantFor(index,this.draft.model);$('armory-title').textContent=variant?variant.name:w.name;$('armory-description').textContent=variant?variant.desc:this.descriptions[index];$('ballistic-info').textContent=w.melee?'Fendente 35 · stoccata 65 · stoccata alle spalle 140':('Testa ×4 · torace/braccia ×1 · addome ×1,25 · gambe ×0,75. Armatura: '+Math.round(GUN_RULES[index].penetration*100)+'% del danno nelle zone protette.');$('statdamage').textContent=w.damage;$('statrate').textContent=Math.round(60/w.rate);$('statmag').textContent=w.melee?'—':w.mag;for(const[id,v]of [['bardamage',w.damage/100],['barrate',(60/w.rate)/850],['barmag',w.mag/30]])$(id).style.width=Math.min(100,v*100)+'%';Array.from($('armorychoices').children).forEach((b,i)=>b.classList.toggle('active',i===index));
 }
 renderModels(){
  const list=VARIANTS[this.index]||[],host=$('weaponmodels');host.replaceChildren();
  const button=(id,name,tag)=>{const b=document.createElement('button');b.type='button';b.dataset.model=id;b.innerHTML='<span>'+name+'</span><small>'+tag+'</small>';host.append(b);};
  button('stock',WEAPONS[this.index].name,'MODELLO DI SERIE');for(const v of list)button(v.id,v.name,v.tag);
  host.closest('.finish-editor').classList.toggle('single-model',!list.length);
 }
 renderParams(){
  const v=variantFor(this.index,this.draft.model),host=$('modelparams');host.replaceChildren();$('modelnote').textContent=v?v.desc:'';
  if(!v)return;const build=cleanBuild(this.index,v.id,this.draft.build);
  for(const p of v.params){const label=document.createElement('label');
   if(p.type==='range'){label.innerHTML='<span>'+p.label+'</span><output>'+Math.round(build[p.key]*100)+'%</output><span><input type="range" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+build[p.key]+'" data-param="'+p.key+'" aria-label="'+p.label+'"></span>';}
   else{label.innerHTML='<span>'+p.label+'</span><select data-param="'+p.key+'" aria-label="'+p.label+'">'+p.options.map((o,n)=>'<option value="'+n+'"'+(n===build[p.key]?' selected':'')+'>'+o+'</option>').join('')+'</select>';}
   host.append(label);}
 }
 previewFinish(){
  applyFinish(this.model,this.index,this.draft);this.boundsDirty=true;
  for(const b of $('weaponmodels').children)b.setAttribute('aria-pressed',String(b.dataset.model===(this.draft.model||'stock')));
  if($('modelparams').dataset.for!==this.index+':'+this.draft.model){$('modelparams').dataset.for=this.index+':'+this.draft.model;this.renderParams();}else for(const out of $('modelparams').querySelectorAll('output')){const input=out.parentElement.querySelector('input')||out.nextElementSibling?.querySelector('input');if(input)out.textContent=Math.round(Number(input.value)*100)+'%';}
  {const v=variantFor(this.index,this.draft.model);$('armory-title').textContent=v?v.name:WEAPONS[this.index].name;$('armory-description').textContent=v?v.desc:this.descriptions[this.index];}$('finishstyle').value=this.draft.style;$('finishpattern').value=this.draft.pattern;$('weaponkit').value=this.draft.kit;$('finishsurface').value=this.draft.surface;$('customprimary').value=this.draft.customPrimary||PAINTS[this.draft.primary].hex;$('customaccent').value=this.draft.customAccent||TRIMS[this.draft.accent].hex;$('customprimaryhex').value=$('customprimary').value;$('customaccenthex').value=$('customaccent').value;
  for(const [id,field]of [['primarypaints','primary'],['trimpaints','accent']])for(const b of $(id).children)b.setAttribute('aria-pressed',String(!this.draft[field==='primary'?'customPrimary':'customAccent']&&b.dataset.key===this.draft[field]));
  const kills=this.career?.data.kills[this.index]||0;$('masteryvalue').textContent=kills+' KILL';$('masterybar').style.width=Math.min(100,kills/15*100)+'%';
  const next=kills<5?5:kills<15?15:null;$('masterynext').textContent=next?(next-kills)+' eliminazioni per '+(next===5?'Bicolore':'Topografia'):'Tutti i disegni di questa arma sono disponibili.';
  for(const option of $('finishpattern').options){option.disabled=!this.career?.canUse(this.index,option.value);option.textContent=PATTERNS[option.value].label+(option.disabled?' · '+PATTERNS[option.value].kills+' kill richieste':'');}
 }
 open(index){this.layoutDirty=this.boundsDirty=true;this.returnFocus=document.activeElement;this.active=true;$('armory').hidden=false;this.select(index);$('closearmory').focus()}
 close(){if(!this.active)return;this.active=false;this.drag=false;$('armory').hidden=true;this.onClose();this.returnFocus?.focus?.()}
 setTheme(key){if(key===this.themeKey)return;this.themeKey=key;const colors=(MAP_THEMES[key]||MAP_THEMES.caldera).studio,g=this.studioCanvas.getContext('2d'),gradient=g.createLinearGradient(0,0,0,256);for(let n=0;n<3;n++)gradient.addColorStop(n===1?.65:n/2,colors[n]);g.fillStyle=gradient;g.fillRect(0,0,2,256);this.scene.background.needsUpdate=true;}
 render(width,height,dt=1/60){
  // Left alone, the piece turns slowly a little each way, like a showroom turntable.
  const now=performance.now();if(!this.drag&&now-this.idleSince>2600&&!matchMedia('(prefers-reduced-motion:reduce)').matches){if(this.idleBase===null){this.idleBase=this.rotationTarget.y;this.idleStart=now;}const u=(now-this.idleStart)/1000,ease=Math.min(1,u/1.5);this.rotationTarget.y=this.idleBase+ease*.42*Math.sin(u*.45);}
  const follow=1-Math.exp(-20*Math.min(.05,Math.max(0,dt)));this.pivot.rotation.x+=(this.rotationTarget.x-this.pivot.rotation.x)*follow;this.pivot.rotation.y+=Math.atan2(Math.sin(this.rotationTarget.y-this.pivot.rotation.y),Math.cos(this.rotationTarget.y-this.pivot.rotation.y))*follow;
  if(this.layoutDirty||width!==this.lastWidth||height!==this.lastHeight){
   const editor=document.querySelector('.finish-editor').getBoundingClientRect(),info=document.querySelector('.armoryinfo').getBoundingClientRect(),landscape=height<600&&width<1000;
   // Phone landscape: the stage sits between the title column and the editor, above the picker.
   const picker=document.getElementById('armorychoices').getBoundingClientRect();
   const left=width<700?14:landscape?info.right+10:info.right+18,right=width<700?width-14:editor.left-18;
   const top=width<700?Math.max(118,info.bottom+10):landscape?62:80,bottom=width<700?editor.top-16:landscape?picker.top-16:height-125;
   this.viewport={left,bottom,w:Math.max(100,right-left),h:Math.max(80,bottom-top)};this.lastWidth=width;this.lastHeight=height;this.layoutDirty=false;
   const hint=document.querySelector('.rotatehint');hint.style.left=(left+this.viewport.w/2)+'px';hint.style.top=(bottom-14)+'px';hint.style.bottom='auto';hint.textContent=document.documentElement.classList.contains('touch-mode')?'TRASCINA PER RUOTARE':'↔  TRASCINA PER RUOTARE · ROTELLA ZOOM';
   this.camera.aspect=this.viewport.w/this.viewport.h;this.camera.updateProjectionMatrix();
  }
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
  const {left,bottom,w,h}=this.viewport,halfH=Math.tan(this.camera.fov*Math.PI/360)*this.camera.position.z,halfW=halfH*w/Math.max(1,h),fill=width<700?.7:.8,scale=this.previewExtent?Math.min(halfW*fill/this.previewExtent.x,halfH*(this.index===6?.92:.72)/this.previewExtent.y):studioScale(this.previewRadius,w,h,this.camera.fov);this.pivot.scale.setScalar(scale);this.pivot.position.copy(this.fitCenter.copy(this.previewCenter).applyQuaternion(this.pivot.quaternion)).multiplyScalar(-scale);
  if(this.previewExtent){const ext=this.previewExtent;this.floorShadow.position.set(0,-ext.y*scale-.035,0);this.floorShadow.scale.set(ext.x*scale*2.3,ext.x*scale*.55,1);}
  // Reserve the real model viewport between the HTML panels. Background and
  // weapon render separately, so even narrow layouts never cover the muzzle.
  this.renderer.setViewport(0,0,width,height);this.renderer.setScissorTest(false);this.renderer.autoClear=true;this.pivot.visible=this.floorShadow.visible=false;this.renderer.render(this.scene,this.camera);this.pivot.visible=this.floorShadow.visible=true;
  const background=this.scene.background;this.scene.background=null;this.renderer.autoClear=false;this.renderer.clearDepth();this.renderer.setViewport(left,height-bottom,w,h);this.renderer.setScissor(left,height-bottom,w,h);this.renderer.setScissorTest(true);this.renderer.render(this.scene,this.camera);
  this.scene.background=background;this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,width,height);
 }

}
