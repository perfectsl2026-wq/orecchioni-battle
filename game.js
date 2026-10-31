import {WeaponInspection} from './weapon-inspection.js?v=38.1';
import {objectiveEnabled,flashEnabled,updateObjective,throwFlash,updateFlashes,flashOpacity,botObjectiveOrder,botSmokeTarget,botHeTarget,BOMB} from './objective-rules.js?v=38.1';
import {UtilityPresentation} from './utility-presentation.js?v=38.1';
import {applyMapTheme} from './visual-theme.js?v=38.1';
import {InputChannel,cleanInput} from './network-input.js?v=38.1';
import {NETWORK_PROTOCOL,ROOM_PREFIX,NetworkSession,sendPacket,validSnapshot,snapshotForNetwork,snapshotIssue,validPeerId} from './network-session.js?v=38.1';
import {FrameMeter} from './frame-meter.js?v=38.1';
import {FramePacing} from './frame-pacing.js?v=38.1';
import {displayName,warmVariantMaterials} from './weapon-variants.js?v=38.1';
import {Career} from './profile.js?v=38.1';
import {applyFinish,cleanLoadout} from './weapon-finish.js?v=38.1';
import {missingBots,replaceableBot,nextBotName} from './roster.js?v=38.1';
import {sizeRenderer,filterTextures} from './render-quality.js?v=38.1';
import {recordKill,KillLedger} from './kill-events.js?v=38.1';
import {JUMP,stepJump,stepStance,eyeHeight,LocalPresentation,WeaponSwitch,crosshairGap} from './player-feel.js?v=38.1';
import {viewMotion} from './view-motion.js?v=38.1';
import {PostFX,supportsPostFX} from './postfx.js?v=38.1';
import {realizeWorld,realizeEnvironment} from './realism.js?v=38.1';
import {AudioEngine} from './audio-engine.js?v=38.1';
import {ViewKick} from './view-kick.js?v=38.1';
import {footSurface} from './surfaces.js?v=38.1';
const frameMeter=new FrameMeter();let metricsAt=0;const firstPersonMotion={};let viewOffsets={};
// V33 frame pacing: the render scale settles where this device holds its display rate; the
// settled step is remembered so the next session starts there instead of stuttering down to it.
let pacingStart=0;try{pacingStart=Math.max(0,(Number(localStorage.getItem('ob-render-step'))||0)-1);}catch{}
const pacing=new FramePacing({start:pacingStart});
import * as THREE from './vendor/three.module.js';
import {createWorld,createWeapon,animateWeapon,createOperator,animateOperator} from './graphics.js?v=38.1';
import {Armory} from './armory.js?v=38.1';
import {preloadArchitecture} from './architecture-assets.js?v=38.1';
import {preloadAssets,createArmedModel,createAgent,animateAgent,animateViewmodel,flashAgent,reactAgent,disposeAgent,prepareAgentEquipment,dressOperator,operatorDebug} from './assets.js?v=38.1';
import {cleanOperator,botOperator} from './operator-kits.js?v=38.1';
import {WEAPONS,WALLS,SPAWNS,MAPS,ACTIVE_MAP,BOUNDS,configureMap,chooseTeam,blocked,move,wallDistance,groundHeight} from './shared.js?v=38.1';
import {botInput,resetBots,resetBot,hearBotShot,BOT_LEVELS} from './navigation.js?v=38.1';
import {CombatFX,createFlashLights,dressMuzzleFlash} from './combatfx.js?v=38.1';
import {BASE_FOV,scopeFov,mouseGain,ControlsPanel} from './controls.js?v=38.1';
import {presentAgent} from './agent-motion.js?v=38.1';
import {mixShot} from './audio-mix.js?v=38.1';
import {SimulationClock} from './simulation-clock.js?v=38.1';
import {SnapshotBuffer} from './snapshots.js?v=38.1';
import {resetCombat,stepMovement,stepBotMovement,shotParameters,traceShot,applyHit,applyBlast,sprayOffset,CAMERA_RECOIL,recoilAt,accuracyFor,traceMelee,equipWeapon,canAttack} from './combat-rules.js?v=38.1';
import {createMatch,updateMatch,canAct,isRoundMode,mapAllowsMode,defaultMode,teamName,modeRules,matchRules,isRespawnMode,allowedWeapons,weaponAllowed} from './match-rules.js?v=38.1';
import {addKillFeed,weaponIcon,weaponName} from './kill-feed.js?v=38.1';
import {Radar,spottedEnemies} from './radar.js?v=38.1';
import {CrosshairEditor} from './crosshair.js?v=38.1';
import {ECONOMY,economyOn,ownsWeapon,canBuyNow,buyWindowOpen,buyWindowLeft,inBuyZone,buy as buyItem,sell as sellItem,applyCarry,give} from './economy.js?v=38.1';
import {throwUtility,updateFires,WEAPON_HE,WEAPON_FIRE} from './blast-rules.js?v=38.1';
import {dropWeapon,updatePickups,dropNear} from './pickups.js?v=38.1';
import {syncSmokes,throwSmoke,insideSmoke,smokeBlocks} from './smoke-rules.js?v=38.1';
import {BuyMenu} from './buy-menu.js?v=38.1';
import {SmokeFX,BlastFX,FireFX} from './smoke-fx.js?v=38.1';
import {recordPositions,rewoundPlayers,clearHistory} from './lag-compensation.js?v=38.1';
import {createSkylife} from './skylife.js?v=38.1';
import {buildProbe} from './surface-probe.js?v=38.1';
import {scoreboardHTML,rosterHTML} from './scoreboard.js?v=38.1';
import {DeathPresentation} from './death-presentation.js?v=38.1';
import {prefersTouch,requestMouseLock,TouchControls} from './touch-controls.js?v=38.1';
const $=s=>document.getElementById(s),canvas=$('game'),career=new Career(),sfx=new AudioEngine(),qaMode=new URLSearchParams(location.search).get('qa')==='1';
const mobileDevice=prefersTouch({coarse:matchMedia('(pointer:coarse)').matches,anyCoarse:matchMedia('(any-pointer:coarse)').matches,maxTouchPoints:navigator.maxTouchPoints||0})||new URLSearchParams(location.search).get('touch')==='1';
document.documentElement.classList.toggle('touch-mode',mobileDevice);
$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=true;
status('Caricamento modelli 3D…');
const assetFailures=await preloadAssets((n,total)=>{status('Caricamento modelli 3D · '+n+'/'+total);$('assetprogress').value=n/total*60});

status('Preparazione architettura…');
const architectureFailures=await preloadArchitecture();$('assetprogress').value=75;
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})}catch(e){$('status').textContent='WebGL non disponibile: prova Chrome o Edge con accelerazione grafica.';$('loading-message').textContent='WebGL non disponibile. Prova un browser con accelerazione grafica.';throw e}
// Shader logs are read synchronously on each program's first draw; QA keeps them, play skips the stall.
renderer.debug.checkShaderErrors=qaMode;
sizeRenderer(renderer,innerWidth,innerHeight,devicePixelRatio,pacing.scale);
pacing.onChange=p=>{sizeRenderer(renderer,innerWidth,innerHeight,devicePixelRatio,p.scale);try{localStorage.setItem('ob-render-step',String(p.step));}catch{}if(qaMode)console.log('frame pacing',p.describe());};
// REALISTICA renders the arena through the HDR pipeline; NITIDA keeps direct rendering.
const postfx=supportsPostFX(renderer)?new PostFX(renderer):null,GRAPHICS=['realistic','sharp','flat'];
let graphicsMode=mobileDevice||!postfx?'flat':'realistic';try{const saved=localStorage.getItem('ob-graphics-v28');if(GRAPHICS.includes(saved)&&(saved!=='realistic'||postfx))graphicsMode=saved;}catch{}
if(postfx)postfx.enabled=graphicsMode==='realistic';
renderer.shadowMap.enabled=graphicsMode!=='flat';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.05,200),flashLights=createFlashLights(),viewKick=new ViewKick();
camera.rotation.order='YXZ';scene.add(camera);
let startupReady=false;
const mapScenes=new Map();let mapScene=null,mapRoot=null,lastGoodMap='sahra',mapLoadEpoch=0,mapChanged=()=>{};
// Direction toward the arena's sun: light shafts and smoke shading follow it.
const arenaSun=new THREE.Vector3(-.5,.7,-.5).normalize();let surfaceProbe=null,probeReady=null;
const mapSelect=$('mapselect');
// One draw of the whole arena with culling off while it loads, so the first match frame does not
// link programs or build shadow variants for meshes the lobby camera never saw (~115 ms on Sahra).
function warmArena(){const culled=[];mapScene.traverse(o=>{if(o.frustumCulled){o.frustumCulled=false;culled.push(o);}});try{renderer.autoClear=true;if(postfx?.enabled)postfx.render(scene,camera,0);else renderer.render(scene,camera);}finally{for(const o of culled)o.frustumCulled=true;}}
async function loadMap(mapId){
 const key=Object.hasOwn(MAPS,mapId)?mapId:'sahra',run=++mapLoadEpoch;mapSelect.disabled=true;
 try{
 $('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=true;status('Caricamento '+MAPS[key].title+'…');configureMap(key);camera.far=key==='sahra'?450:200;camera.updateProjectionMatrix();resetBots();
 const fresh=!mapScenes.has(key)&&startupReady;
 // A first visit builds the whole district synchronously (up to ~3.5 s): say so on the
 // loading card instead of freezing the lobby on its last frame.
 if(fresh){$('loading').classList.remove('leaving');$('loading').hidden=false;$('loading-message').textContent='Costruzione di '+MAPS[key].title+'…';$('assetprogress').removeAttribute('value');$('retryload').hidden=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(run!==mapLoadEpoch)return false;}
 if(!mapScenes.has(key)){
  const world=new THREE.Scene();const build=key==='forge'?(await import('./forge.js?v=38.1')).createForge:key==='caldera'?(await import('./caldera.js?v=38.1')).createCaldera:(await import('./sahra.js?v=38.1')).createSahra;
  if(run!==mapLoadEpoch)return false;configureMap(key);const root=build(world,renderer);realizeWorld(world,key,{lamps:!mobileDevice});createSkylife(world,key);if(mobileDevice)world.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.mapSize.set(1024,1024);});
  mapScenes.set(key,{scene:world,root,ready:Promise.resolve(root.userData.ready).then(()=>{const t0=performance.now();mapScenes.get(key).probe=buildProbe(root);if(qaMode)console.log('surface probe',key,Math.round(performance.now()-t0)+' ms');})});
 }
 const loaded=mapScenes.get(key);await loaded.ready;realizeEnvironment(loaded.scene,key);loaded.scene.add(flashLights.local,flashLights.remote);if(run!==mapLoadEpoch)return false;
 // Compile and upload the new arena while its loading state is visible.
 filterTextures(loaded.scene,renderer.capabilities.getMaxAnisotropy());const uploaded=new Set();loaded.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)for(const t of Object.values(m))if(t?.isTexture&&!t.isRenderTargetTexture&&!uploaded.has(t)){uploaded.add(t);renderer.initTexture(t);}});if(postfx?.enabled)await postfx.compile(loaded.scene,camera);else if(renderer.compileAsync)await renderer.compileAsync(loaded.scene,camera);if(run!==mapLoadEpoch)return false;
 configureMap(key);sfx.setMap(key);if(mapScene)scene.remove(mapScene);mapScene=loaded.scene;{let sun=null;mapScene.traverse(o=>{if(!sun&&o.isDirectionalLight&&o.castShadow)sun=o;});if(sun){arenaSun.copy(sun.position).normalize();postfx?.setSun(arenaSun);}}mapScene.add(flashLights.local,flashLights.remote);mapRoot=loaded.root;lastGoodMap=key;scene.add(mapScene);surfaceProbe=loaded.probe||null;probeReady?.();filterTextures(mapScene,renderer.capabilities.getMaxAnisotropy());
 scene.environment=mapScene.environment;scene.environmentIntensity=mapScene.environmentIntensity;scene.background=mapScene.background;scene.fog=mapScene.fog;warmArena();mapSelect.value=key;
 $('mapdescription').textContent=MAPS[key].description;$('mapoverview').hidden=key!=='sahra';document.title='ORECCHIONI BATTLE — '+MAPS[key].title;
 document.querySelector('.pausebox>.eyebrow').textContent=MAPS[key].title;document.documentElement.dataset.map=key;renderer.toneMappingExposure=applyMapTheme(document.documentElement,key).exposure;postfx?.setGrade(key);
 for(const b of document.querySelectorAll('.map-cards button[data-map]'))b.setAttribute('aria-pressed',String(b.dataset.map===key));
 const lobby=MAPS[key].lobby;$('maptitle').innerHTML=lobby.name+' <i>'+lobby.code+'</i>';$('maptagline').textContent=lobby.tagline;
 document.querySelector('footer>span:first-child').innerHTML='<b>'+MAPS[key].title+'</b> &nbsp; / &nbsp; '+lobby.subtitle;
 $('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=!startupReady;mapSelect.disabled=!startupReady;mapChanged();syncMapModes();
 status(assetFailures||architectureFailures?'Alcuni modelli non sono disponibili. Ricarica per riprovare.':mobileDevice?'Comandi touch · consigliato telefono in orizzontale':'PC e mouse · rotella cambia arma · Q ultima arma');
 if(fresh){$('assetprogress').value=100;revealGame();}
 try{localStorage.setItem('orecchioni-map',key);}catch{}const pageURL=new URL(location.href);pageURL.searchParams.set('map',key);history.replaceState(null,'',pageURL.pathname+pageURL.search);return true;
 }catch(e){if(startupReady){$('assetprogress').value=100;$('loading').hidden=true;}if(run!==mapLoadEpoch)return false;configureMap(lastGoodMap);mapSelect.value=lastGoodMap;mapScenes.delete(key);mapSelect.disabled=false;$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=!mapRoot;throw e;}
}
// Playlists first, as in competitive clients: each one picks the mode and its map pool.
const PLAYLISTS={competitive:{mode:'demolition',maps:['sahra']},wingman:{mode:'demolition',maps:['caldera']},deathmatch:{mode:'deathmatch',maps:['sahra','caldera','forge']}};
let playlist='competitive';
const playlistFor=(map,mode)=>mode==='deathmatch'?'deathmatch':MAPS[map].pool==='wingman'?'wingman':'competitive';
function syncPlaylist(){playlist=playlistFor(ACTIVE_MAP,$('mode').value);{const box=$('economy');box.disabled=playlist!=='wingman';if(playlist==='competitive')box.checked=true;box.closest('label').hidden=playlist==='deathmatch';}for(const b of document.querySelectorAll('.playlists [data-playlist]'))b.setAttribute('aria-checked',String(b.dataset.playlist===playlist));for(const b of document.querySelectorAll('.map-cards button[data-map]'))b.classList.toggle('outside',!PLAYLISTS[playlist].maps.includes(b.dataset.map));}
// Each map card shows the real walkable plan of its map, drawn from the shared data.
function planSVG(map){const b=map.bounds;let body='';
 if(map.walk)for(const [x0,x1,z0,z1]of map.walk)body+=`<rect x="${x0}" y="${z0}" width="${x1-x0}" height="${z1-z0}"/>`;
 else{body=`<rect x="${-b.x}" y="${-b.z}" width="${b.x*2}" height="${b.z*2}"/>`;for(const w of map.walls)body+=`<rect class="solid" x="${w[0]-w[2]/2}" y="${w[1]-w[3]/2}" width="${w[2]}" height="${w[3]}"/>`;}
 for(const s of map.sites||[])body+=`<circle class="site" cx="${s.x}" cy="${s.z}" r="${s.radius}"/>`;
 return `<svg viewBox="${-b.x} ${-b.z} ${b.x*2} ${b.z*2}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;}
for(const el of document.querySelectorAll('.plan[data-plan]'))el.innerHTML=planSVG(MAPS[el.dataset.plan]);
let chosenMap=new URLSearchParams(location.search).get('map');try{chosenMap??=localStorage.getItem('orecchioni-map');}catch{}
// The competitive map is the first impression.
await loadMap(chosenMap||'sahra');
for(const b of document.querySelectorAll('.playlists [data-playlist]'))b.onclick=async()=>{if(playing||mapSelect.disabled)return;const next=PLAYLISTS[b.dataset.playlist];playlist=b.dataset.playlist;try{if(!next.maps.includes(ACTIVE_MAP))await loadMap(next.maps[0]);}catch(e){error('Mappa non disponibile: '+e.message);return;}$('mode').value=next.mode;describeMode();$('mode').dispatchEvent(new Event('change'));};
// Lobby views: GIOCA (online rooms) and ALLENAMENTO (local match against bots).
// The training card drives the same selects and buttons the online panel uses.
function showLobbyView(view){
 const panel=document.querySelector('#menu .panel');panel.dataset.view=view;$('trainingcard').hidden=view!=='training';
 $('navplay').setAttribute('aria-current',view==='play'?'page':'false');$('navtraining').setAttribute('aria-current',view==='training'?'page':'false');
 document.querySelector('.paneltop>span').textContent=view==='training'?'ALLENAMENTO CON BOT':'ENTRA IN AZIONE';
 if(view==='training'){syncTrainingCard();(matchMedia('(max-width:700px)').matches?$('trainingcard'):panel).scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}
}
function syncTrainingCard(){
 $('alliesout').value=$('alliesout').textContent=$('alliedbots').value;$('enemiesout').value=$('enemiesout').textContent=$('enemybots').value;
 for(const b of document.querySelectorAll('.stepper button')){const select=$(b.dataset.step),open=[...select.options].filter(o=>!o.disabled).map(o=>o.value),at=open.indexOf(select.value);b.disabled=at+Number(b.dataset.dir)<0||at+Number(b.dataset.dir)>=open.length;}
 for(const b of document.querySelectorAll('.levels [data-level]'))b.setAttribute('aria-checked',String(b.dataset.level===botDifficulty));
 const weapon=$('trainweapon');if(!weapon.options.length)weapon.append(...[...$('botequipment').options].map(o=>new Option(o.textContent,o.value)));weapon.value=$('botequipment').value;
}
$('navplay').onclick=()=>showLobbyView('play');
$('navtraining').onclick=()=>showLobbyView('training');
for(const b of document.querySelectorAll('.stepper button'))b.onclick=()=>{const select=$(b.dataset.step),open=[...select.options].filter(o=>!o.disabled).map(o=>o.value),next=open[open.indexOf(select.value)+Number(b.dataset.dir)];if(next===undefined)return;select.value=next;select.dispatchEvent(new Event('change'));syncTrainingCard();};
for(const b of document.querySelectorAll('.levels [data-level]'))b.onclick=()=>{$('botlevel').value=b.dataset.level;$('botlevel').dispatchEvent(new Event('change'));syncTrainingCard();};
$('trainweapon').onchange=()=>{$('botequipment').value=$('trainweapon').value;$('botequipment').dispatchEvent(new Event('change'));};
$('starttraining').onclick=()=>$('practice').click();$('trainingexplore').onclick=()=>$('explore').click();
// Start and visit buttons follow the availability of the panel's own buttons.
for(const [source,target]of [['practice','starttraining'],['explore','trainingexplore']]){const copy=()=>{$(target).disabled=$(source).disabled;};copy();new MutationObserver(copy).observe($(source),{attributes:true,attributeFilter:['disabled']});}
for(const b of document.querySelectorAll('.map-cards button[data-map]'))b.onclick=()=>{if(!playing&&!mapSelect.disabled)loadMap(b.dataset.map).catch(e=>error('Mappa non disponibile: '+e.message));};
mapSelect.onchange=()=>loadMap(mapSelect.value).catch(e=>{console.error(e);status('Mappa non disponibile. Riprova la selezione.');});
const effects=new CombatFX(scene),deaths=new DeathPresentation(scene),utilities=new UtilityPresentation(scene);effects.lights=flashLights;probeReady=()=>effects.setProbe(surfaceProbe);probeReady();
const handsScene=new THREE.Scene();
// A compact equipment reflection rig keeps machined surfaces readable in both
// daylight and the dark orbital terminal; direct light still follows the arena.
const equipmentSky=new THREE.Scene();equipmentSky.background=new THREE.Color(0x82949d);
const addEquipmentPanel=(color,x,y,z,w,h,d)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));m.position.set(x,y,z);equipmentSky.add(m);};
addEquipmentPanel(0xe8e7d8,-3,6,2,7,1,9);addEquipmentPanel(0xb4d1df,5,2,-3,1,6,7);addEquipmentPanel(0x263d48,-5,2,-2,1,6,8);
const equipmentPMREM=new THREE.PMREMGenerator(renderer),equipmentEnvironment=equipmentPMREM.fromScene(equipmentSky,.025);equipmentPMREM.dispose();equipmentSky.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});handsScene.environment=equipmentEnvironment.texture;
// Wider viewmodel framing leaves the centre and corner exits unobstructed.
// This camera affects equipment presentation only, not world FOV or hitscan.
const handsCamera=new THREE.PerspectiveCamera(mobileDevice?72:68,innerWidth/innerHeight,.01,10);
handsCamera.position.set(0,.045,.04);
handsScene.add(new THREE.HemisphereLight(0xe6f0ff,0x6e7264,1.3));
const keyLight=new THREE.DirectionalLight(0xffefdb,2.1);keyLight.position.set(-3,5,1);handsScene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0xbbd7ef,1.0);fillLight.position.set(4,1,-2);handsScene.add(fillLight);const FILL_REST=fillLight.position.clone();
// The muzzle also lights the weapon and gloves for the frame of the shot.
const handsFlash=new THREE.PointLight(0xffc48a,0,2.2,2);handsFlash.position.set(.2,-.08,-.9);handsScene.add(handsFlash);const FLASH_SCALE=[.9,1,1.3,1.2,1.5,1];
const inspection=new WeaponInspection();
const weaponSwitch=new WeaponSwitch(3),localView=new LocalPresentation();let selected=3,displayed=3,gun,muzzle;const weaponCache=new Map();
function buildGun(index=selected,lower=0){displayed=index;if(gun)handsScene.remove(gun);if(!weaponCache.has(index))weaponCache.set(index,createArmedModel(index)||createWeapon(index));gun=weaponCache.get(index);gun.position.copy(gun.userData.hip||new THREE.Vector3(.24,-.205,-.38));gun.position.y-=lower*.30;gun.position.z+=lower*.09;gun.rotation.set(lower*.45,0,-lower*.15);applyFinish(gun.userData.knife||gun.userData.gun||gun,index,career.data.finishes[index]);filterTextures(gun,renderer.capabilities.getMaxAnisotropy());handsScene.add(gun);muzzle=gun.userData.flash;}
buildGun();
// Build the six inventory rigs and compile their shared shader variants before
// entering a match, so a first weapon change does not clone a rig mid-frame.
$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=true;mapSelect.disabled=true;status('Preparazione equipaggiamento…');
for(let index=0;index<WEAPONS.length;index++){if(!weaponCache.has(index))weaponCache.set(index,createArmedModel(index)||createWeapon(index));const rig=weaponCache.get(index);if(index!==5)dressMuzzleFlash(rig.userData.flash,FLASH_SCALE[index]);applyFinish(rig.userData.knife||rig.userData.gun||rig,index,career.data.finishes[index]);handsScene.add(rig);}
if(renderer.compileAsync)await renderer.compileAsync(handsScene,handsCamera);
// Upload every rig's textures now: with the economy a round opens on the pistol, and its
// atlas uploading on the first match frame cost ~90 ms.
{const uploaded=new Set();handsScene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)for(const t of Object.values(m))if(t?.isTexture&&!uploaded.has(t)){uploaded.add(t);renderer.initTexture(t);}});}
for(const model of weaponCache.values())if(model!==gun)handsScene.remove(model);
$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=!startupReady;mapSelect.disabled=!startupReady;
status(mobileDevice?'Comandi touch · consigliato telefono in orizzontale':'PC e mouse · rotella cambia arma · Q ultima arma');
const kills=new KillLedger();
const avatars=new Map(),clock=new SimulationClock(),snapshots=new SnapshotBuffer(100);
let lastSnapshotAt=performance.now(),localLife=0,botSerial=0,matchStartXP=career.data.xp,resultHandled=null;
function matchNow(){return host?clock.time:(state.now??state.started)+Math.max(0,performance.now()-lastSnapshotAt);}
// Ten prebuilt operators cover a full 5v5 room. Equipment swaps reuse their rigs.
const operatorPool={blue:[],orange:[]};
for(const team of ['blue','orange'])for(let n=0;n<5;n++){
 status('Preparazione operatori…'+' '+(n+1+(team==='orange'?5:0))+'/10');
 const g=createAgent(team,3)||createOperator(team);g.userData.poolTeam=team;prepareAgentEquipment(g);filterTextures(g,renderer.capabilities.getMaxAnisotropy());scene.add(g);
 // Compile only the new operator, using the arena's lights; recompiling the whole map ten times cost ~1 s each.
 // Operators of one team share programs: the first compile covers the other four.
 if(n===0){if(postfx?.enabled)await postfx.compile(g,camera,scene);else if(renderer.compileAsync)await renderer.compileAsync(g,camera,scene);}scene.remove(g);operatorPool[team].push(g);await new Promise(resolve=>setTimeout(resolve,0));
}
// V33: death bodies and dropped weapons are built now and compiled under the arena lights, so the first kill links nothing.
// V34: plus one operator holding the P226, whose merged frame and slide buffers (see
// agentWeapon in assets.js) nothing else here draws; pooled operators hold theirs offstage.
status('Preparazione scena…');{const pistol=createAgent('blue',0),made=[...deaths.warm(),effects.warm(),...(pistol?[pistol]:[])],culled=[],seen=new Set();for(const o of made){scene.add(o);o.traverse(m=>{if(m.isMesh&&m.frustumCulled){m.frustumCulled=false;culled.push(m);}for(const mat of Array.isArray(m.material)?m.material:[m.material])if(mat)for(const t of Object.values(mat))if(t?.isTexture&&!seen.has(t)){seen.add(t);renderer.initTexture(t);}});if(postfx?.enabled)await postfx.compile(o,camera,scene);else if(renderer.compileAsync)await renderer.compileAsync(o,camera,scene);}
 // Compiling links programs but uploads no geometry: one tiny offscreen draw pushes the buffers too.
 const tiny=new THREE.WebGLRenderTarget(4,4);renderer.setRenderTarget(tiny);renderer.render(scene,camera);renderer.setRenderTarget(null);tiny.dispose();
 for(const m of culled)m.frustumCulled=true;for(const o of made)scene.remove(o);if(pistol)disposeAgent(pistol);}
function avatar(p){const g=operatorPool[p.team].pop()||createAgent(p.team,p.weapon)||createOperator(p.team);g.visible=true;g.userData.poolTeam=p.team;g.userData.presentation=null;g.userData.life=undefined;g.userData.finishKey=null;g.userData.appliedFinish=null;g.userData.appliedWeapon=-1;scene.add(g);return g;}
function releaseAvatar(g){g.removeFromParent();g.visible=false;g.userData.presentation=null;for(const [index,weapon]of g.userData.weaponModels||[])applyFinish(weapon,index,null);const team=g.userData.poolTeam;if(team&&operatorPool[team].length<5)operatorPool[team].push(g);else disposeAgent(g);}

let state={players:{},score:{blue:0,orange:0},started:0,ended:false},id='',peer=null,host=false,training=false,connections=new Map(),upstream=null,room='',playing=false,ready=false,keys={},yaw=0,pitch=0,jump=0,jumpV=0,mouseDown=false,aim=false,shotPulse=false,last=performance.now(),lastSend=0,lastHUD=0,shotFlash=0,recoil=0,ping=0,networkSession=null,networkSeq=0,jumpPulse=false,contextLost=false;
const remoteInputs=new WeakMap();let lastRewind=0;
const local={x:-28,z:-24,vx:0,vz:0};let smokePulse=false,hePulse=false,firePulse=false,dropPulse=false,shownPrimary=null,lastMoney=null,presentationRound=0,lastDeath=null,viewedId='',lastDamageHP=100,roundKills=0;let audio;const shotBuffers=[];let fallbackMouse=false,awaitingPointerLock=false;let utilityPulse=false,interacting=false,reloadRequested=false,scopeZoom=4,scopeAmount=0,sniperCycleUntil=0,jumpRequestUntil=-Infinity,secondaryPulse=false,knifeStrikeAt=-Infinity,knifeHeavy=false;
$('showperformance').onchange=()=>{$('performancestats').hidden=!$('showperformance').checked;frameMeter.reset();};
const controls=new ControlsPanel(()=>{clearActions();ready=false;awaitingPointerLock=false;touch.reset();document.exitPointerLock?.();},()=>{if(playing){$('pause').hidden=false;$('pausetitle').textContent='IN PAUSA';$('resume').textContent='TORNA IN CAMPO ↗';}});
const touch=new TouchControls({canvas,enabled:mobileDevice,
 onLook:(dx,dy)=>{if(!ready)return;const gain=mouseGain(controls.value,camera.fov,aim)*2.6*600/Math.max(360,Math.min(innerWidth,innerHeight));yaw-=dx*gain;pitch=Math.max(-1.45,Math.min(1.45,pitch-dy*gain));},
 onFire:(held,pulse)=>{mouseDown=held;if(pulse&&ready){shotPulse=true;inspection.cancel();}},
 onReload:()=>{if(selected!==5)reloadRequested=true;},onAim:()=>{if(selected===4)aim=!aim;else if(selected===5)secondaryPulse=true;},
 onJump:()=>{if(ready&&canAct(state)&&state.players[id]?.hp>0)jumpRequestUntil=matchNow()+JUMP.bufferMs;},
 onInspect:()=>requestInspection(),onFlash:()=>{if(ready)utilityPulse=true;},onSmoke:()=>{if(ready)smokePulse=true;},onHe:()=>{if(ready)hePulse=true;},onIncendiary:()=>{if(ready)firePulse=true;},onBuy:()=>openBuy(),onInteract:held=>{interacting=held;},onWeapon:()=>cycleWeapon(1),onZoom:()=>{scopeZoom=scopeZoom===4?8:4;},onPause:()=>pauseGame(),
 onMode:enabled=>{$('touch-mode').textContent=enabled?'USA MOUSE E TASTIERA':'ATTIVA COMANDI TOUCH';$('touch-mode').setAttribute('aria-pressed',String(enabled));}
});
$('touch-mode').onclick=()=>{awaitingPointerLock=false;ready=false;touch.setEnabled(!touch.enabled);document.exitPointerLock?.();};
function clearActions(){inspection.cancel();utilityPulse=smokePulse=hePulse=firePulse=dropPulse=false;interacting=false;jumpPulse=false;keys={};mouseDown=shotPulse=secondaryPulse=aim=false;reloadRequested=false;jumpRequestUntil=-Infinity;touch.reset();}
function pauseGame(){awaitingPointerLock=false;ready=false;clearActions();sfx.setAmbience(.45);touch.setActive(false);document.exitPointerLock?.();if(playing){$('pause').hidden=false;$('pausetitle').textContent=state.ended?'PARTITA CONCLUSA':'IN PAUSA';$('resume').textContent=state.ended&&host?'NUOVA PARTITA ↗':'TORNA IN CAMPO ↗';}}
function enterWithoutLock(){if(!playing||controls.active||armory.active)return;ready=true;$('pause').hidden=true;touch.setActive(true);document.querySelector('.hint').textContent=touch.enabled?'SINISTRA MUOVI · TRASCINA A DESTRA PER MIRARE':'Mouse alternativo: tieni DESTRO per ruotare · SINISTRO spara · WASD muovi · ESC pausa';}
function mouseFallback(){if(!awaitingPointerLock)return;awaitingPointerLock=false;fallbackMouse=true;enterWithoutLock();}
function enterField(){
 sfx.unlock();sfx.setAmbience(.9);
 if(touch.enabled||fallbackMouse){enterWithoutLock();return;}
 awaitingPointerLock=true;
 requestMouseLock(canvas,mouseFallback);
 setTimeout(()=>{if(awaitingPointerLock&&playing&&!ready)mouseFallback();},1000);
}

// Field audio lives in audio-engine.js; these helpers translate game state into sound sources.
const surfaceAt=footSurface;
// Occlusion 0–1 between a sound and the listener (V31): a thin door or crate lets
// most of the sound through, a metre of building muffles it almost completely.
function occluded(point){const c=camera.position,dx=point[0]-c.x,dy=point[1]-c.y,dz=point[2]-c.z,d=Math.hypot(dx,dy,dz);if(d<=1)return 0;const dir=[dx/d,dy/d,dz/d],a=wallDistance(c.toArray(),dir,d);if(a>=d-.5)return 0;const b=wallDistance(point,[-dir[0],-dir[1],-dir[2]],d),thickness=Math.max(.25,d-a-b);return Math.min(1,.4+thickness/1.8);}
// A supersonic round passing close to the listener's head cracks and whizzes.
// The arc points toward the shooter: the attacker sits opposite the incoming ray.
function showHurtDirection(direction){if(!Array.isArray(direction))return;const ax=-direction[0],az=-direction[2],fwd=ax*-Math.sin(yaw)+az*-Math.cos(yaw),side=ax*Math.cos(yaw)+az*-Math.sin(yaw),el=$('hurtdir');el.style.transform='rotate('+Math.atan2(side,fwd)+'rad)';el.classList.add('show');void el.offsetWidth;requestAnimationFrame(()=>el.classList.remove('show'));}
function nearMiss(e){const p=state.players[id];if(!p||p.hp<=0)return;const a=e.from,b=e.to,c=camera.position,ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],len2=ab[0]**2+ab[1]**2+ab[2]**2;if(len2<1)return;const t=((c.x-a[0])*ab[0]+(c.y-a[1])*ab[1]+(c.z-a[2])*ab[2])/len2;if(t<=.03||t>=.992)return;const q=[a[0]+ab[0]*t,a[1]+ab[1]*t,a[2]+ab[2]*t];if(Math.hypot(q[0]-c.x,q[1]-c.y,q[2]-c.z)<2.3)sfx.whiz(q);}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// The loading card fades into the lobby instead of cutting to it.
function revealGame(){const l=$('loading');if(l.hidden)return;l.classList.add('leaving');setTimeout(()=>{l.hidden=true;l.classList.remove('leaving');},420);}
function notice(t){$('notice').textContent=t}function status(t){$('status').textContent=t;$('loading-message').textContent=t;}function error(t){status(t);$('create').disabled=$('join').disabled=false;mapSelect.disabled=false;}
function spawn(p){const now=clock.time;p.life=(p.life||0)+1;p.input={};p.jumpRequestUntil=-Infinity;remoteInputs.set(p,new InputChannel(p.life));if(p.bot)resetBot(p);const spawnTeam=objectiveEnabled(state)&&state.attackTeam?(p.team===state.attackTeam?'orange':'blue'):p.team;const spots=SPAWNS[spawnTeam].slice(0,state.teamSize||2);const others=Object.values(state.players).filter(v=>v.id!==p.id&&v.hp>0),rank=s=>Math.min(50,...others.filter(v=>v.team!==p.team).map(v=>Math.hypot(v.x-s[0],v.z-s[1])))-(others.some(v=>v.team===p.team&&Math.hypot(v.x-s[0],v.z-s[1])<2)?100:0);let s=spots[Math.floor(Math.random()*spots.length)];for(const candidate of spots)if(rank(candidate)>rank(s))s=candidate;p.x=s[0];p.z=s[1];p.hp=100;p.dead=0;p.pitch=0;p.groundY=groundHeight(p.x,p.z);p.y=p.groundY;p.invulnerable=now+2200;if(!weaponAllowed(state.mode,p.weapon))p.weapon=allowedWeapons(state.mode)[0];p.ammo=WEAPONS.map(w=>w.mag);p.reload=0;p.reloadStart=0;resetCombat(p);if(economyOn(state))applyCarry(state,p);else{p.flashes=MAPS[ACTIVE_MAP].utility?2:0;p.smokes=MAPS[ACTIVE_MAP].utility?1:0;}p.flashReady=p.blindAt=p.blindUntil=p.blindStrength=0;p.yaw=MAPS[ACTIVE_MAP].spawnYaw?.[spawnTeam]??(p.team==='blue'?Math.PI:0);if(p.id===id){syncWeapon(p);local.x=p.x;local.z=p.z;yaw=p.yaw;pitch=0;jump=local.y=p.y||0;local.groundY=p.groundY||0;jumpV=local.jumpV=local.duck=0;local.landingUntil=0;jumpRequestUntil=-Infinity;local.vx=local.vz=0;lastDeath=null;localLife=p.life;localView.reset({x:local.x,z:local.z,y:p.y||0,groundY:p.groundY||0,life:p.life});viewKick.reset();}}
function addPlayer(pid,name,team,bot=false,finishes=null,initialWeapon=pid===id?selected:3,operator=null){team=chooseTeam(Object.values(state.players),team,state.teamSize||2);if(!team)return null;const p={id:pid,name:String(name||'Operatore').slice(0,16),team,kills:0,deaths:0,weapon:weaponAllowed(state.mode,initialWeapon)?initialWeapon:allowedWeapons(state.mode)[0],finishes:cleanLoadout(finishes),operator:bot?botOperator(Number(String(pid).replace(/\D/g,''))||0,team):cleanOperator(operator||(pid===id?career.data.operator:null)),pitch:0,y:0,bot,input:{},seen:Date.now(),seq:0};spawn(p);if(isRoundMode(state.mode)&&state.phase==='live'){p.hp=0;p.dead=0;p.invulnerable=0;}state.players[pid]=p;return p}
function feed(text){const d=document.createElement('div');d.textContent=text;$('messages').prepend(d);while($('messages').children.length>2)$('messages').lastElementChild.remove();setTimeout(()=>d.remove(),4500)}
function broadcast(data){for(const c of connections.values())sendPacket(c,data,{volatile:data.type==='state'||data.type==='event'&&data.event.kind!=='kill'&&data.event.kind!=='round'});}
// V28.2 hit and kill feedback (style.css): a hitmarker on every hit dealt, one diamond
// per kill this round (this life in deathmatch) and a chime that rises with each kill.
const calmMotion=matchMedia('(prefers-reduced-motion:reduce)');
function showHitMarker(kind=''){const m=$('hit');m.className=kind;for(const a of m.getAnimations?.()||[])a.cancel();m.animate?.(calmMotion.matches?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'translate(-50%,-50%) scale(1.2)'},{opacity:0,transform:'translate(-50%,-50%) scale(1)'}],{duration:kind==='kill'?360:170,easing:'cubic-bezier(.2,.7,.3,1)'});}
function showKillConfirm(headshot){const k=$('killconfirm'),pip=document.createElement('i');if(headshot)pip.className='head';k.append(pip);while(k.children.length>5)k.firstElementChild.remove();for(const a of k.getAnimations?.()||[])a.cancel();k.animate?.([{opacity:1},{opacity:1,offset:.78},{opacity:0}],{duration:2300,easing:'ease-out'});}
function clearKillConfirm(){roundKills=0;$('killconfirm').replaceChildren();}
function presentKill(e,age=0){
 const victim=state.players[e.victimId];
 if(!host&&victim?.life===e.victim.life){victim.hp=0;victim.dead=e.time+3000;victim.death=e;victim.deaths=Math.max(victim.deaths||0,e.victimDeaths||0);}
 const killer=state.players[e.killerId];if(!host&&killer)killer.kills=Math.max(killer.kills||0,e.killerKills||0);
 if(!host&&e.score)for(const team of ['blue','orange'])state.score[team]=Math.max(state.score[team],e.score[team]||0);
 if(career.kill(e,id))showCareer();
 addKillFeed($('feed'),e,id,age);deaths.add(e.victim,e,avatars.get(e.victimId));
 if(e.killerId===id&&e.victimId!==id&&age<1500){roundKills++;showHitMarker('kill');showKillConfirm(!!e.headshot);sfx.kill({streak:roundKills,headshot:!!e.headshot});}
 if(e.victimId===id&&state.mode==='deathmatch')clearKillConfirm();
 if(e.victimId===id&&victim?.life===e.victim.life){lastDeath=e;clearActions();scopeAmount=0;}
}
function event(e){
 if(e.kind==='kill'){if(host&&!recordKill(state,e))return;kills.receive(e,state,matchNow(),presentKill);}
 if(host)broadcast({type:'event',event:e});
 if(e.kind==='info')feed(e.text);
 if(e.kind==='smoke'&&Array.isArray(e.point))sfx.smoke(e.point);
 if(e.kind==='he'&&Array.isArray(e.point)){sfx.he(e.point);blastFX.burst(e.point,matchNow());effects.flashBurst?.(e.point);effects.scorch(e.point);smokeFX.blast(e.point,matchNow());}
 if(e.kind==='fire'&&Array.isArray(e.point))sfx.ignite(e.point);
 if(e.kind==='douse'&&Array.isArray(e.point))sfx.smoke(e.point);
 if(e.kind==='flash'&&Array.isArray(e.point)){sfx.flashBang(e.point);effects.flashBurst?.(e.point);}
 if(e.kind==='round'){
  if(e.phase==='freeze'){deaths.clear();lastDeath=null;clearActions();clearKillConfirm();local.vx=local.vz=0;effects.clearMarks();}
  if(e.phase==='live')sfx.radio();
  if(e.phase==='result')sfx.radio(e.winner===state.players[id]?.team);
 }
 if(e.kind==='melee'){
  const operator=avatars.get(e.id);if(operator)flashAgent(operator);
  if(e.id===id){knifeStrikeAt=performance.now();knifeHeavy=!!e.heavy;sfx.knife({heavy:!!e.heavy,hit:!!e.hit});}
 }
 if(e.kind==='shot'){
  if(!host&&e.id===id){const p=state.players[id];if(p){p.shots=e.shots;p.lastShot=e.time;p.recoilWeapon=e.weapon;}}
  effects.shot(e,{local:e.id===id,camera,muzzle});smokeFX.carve(e.from,e.to,matchNow());
  if(e.impact&&Array.isArray(e.to)&&Array.isArray(e.from)){const material=effects.impact(e.to,e.to.map((v,i)=>v-e.from[i]));sfx.impact({position:e.to,material,ricochet:true});}
  // A penetrated surface shows the entry hole and the exit hole on the far face.
  if(Array.isArray(e.through)&&Array.isArray(e.from)){const dir=e.to.map((v,i)=>v-e.from[i]);for(const point of e.through)if(Array.isArray(point)&&point.every(Number.isFinite)){const material=effects.impact(point,dir);if(point===e.through[0])sfx.impact({position:point,material,ricochet:false});}}
  if(e.id!==id){if(Array.isArray(e.from)){sfx.shot({weapon:e.weapon??3,position:e.from,muffled:occluded(e.from)});effects.remoteMuzzle?.(e.from,e.to);if(Array.isArray(e.to))nearMiss(e);sfx.casing(e.from);}const operator=avatars.get(e.id);if(operator)flashAgent(operator);}
  else{if(e.weapon===4){sniperCycleUntil=matchNow()+1000;setTimeout(()=>{if(playing)sfx.cycle();},330);}effects.casing(camera);effects.localMuzzle?.(camera,muzzle,e.weapon);shotFlash=.045;recoil=e.weapon===4?.08:e.weapon===0?.045:.028;viewKick.fire(e.weapon??selected);sfx.shot({weapon:e.weapon,local:true});sfx.casing(null,true);}
 }
 if(e.kind==='damage'){
  const operator=avatars.get(e.id);if(operator)reactAgent(operator);
  if(Array.isArray(e.point)){effects.blood?.(e.point,e.direction,e.zone==='head');if(e.by===id){sfx.hitConfirm({headshot:e.zone==='head',helmet:e.helmet});if(e.id!==id)showHitMarker(e.zone==='head'?'head':'');}else if(e.id!==id)sfx.impact({position:e.point,material:'flesh'});}
  if(e.id===id){sfx.hurt(!!e.heavy);viewKick.hurt(e.direction,yaw,!!e.heavy);showHurtDirection(e.direction);}
 }
}
function shoot(p,now,heavy=false){
 const wi=p.weapon,w=WEAPONS[wi];if(!canAct(state)||!canAttack(p,now,heavy))return;
 const rate=w.melee&&heavy?.8:w.rate;
 const angles=w.melee?null:shotParameters(p,now);p.lastShot=now;p.weaponReady??=WEAPONS.map(()=>0);p.weaponReady[wi]=now+rate*1000;
 if(!w.melee){p.ammo[wi]--;hearBotShot(p,Object.values(state.players),now);}
 // Lag compensation: a remote player's shot is traced against the bodies as they
 // stood when that player clicked (their input's host-time estimate), never more than
 // 250 ms back. Bots and the host trace the live state.
 const everyone=Object.values(state.players),shotAt=p.bot||p.id===id?now:(Number.isFinite(p.input?.at)?p.input.at:now),targets=w.melee?everyone:rewoundPlayers(everyone,p,shotAt,now);if(!p.bot&&p.id!==id)lastRewind=Math.max(0,Math.min(250,now-shotAt));
 const hit=w.melee?traceMelee(p,everyone,heavy):traceShot(p,targets,angles),victim=hit.victim?state.players[hit.victim.id]:null;
 event(w.melee?{kind:'melee',id:p.id,weapon:wi,heavy,hit:!!victim}:{kind:'shot',id:p.id,weapon:wi,shots:p.shots,time:now,impact:!victim&&hit.distance<w.range,from:hit.from,to:hit.to,...(hit.through?{through:hit.through}:{})});
 if(!victim||victim.hp<=0||victim.team===p.team||now<victim.invulnerable)return;
 const result=applyHit(victim,p,hit.zone,now,w.melee?hit:null,hit.distance,hit.scale??1);p.dealt=(p.dealt||0)+result.damage;event({kind:'damage',id:victim.id,point:hit.to,by:p.id,zone:hit.zone,helmet:victim.helmet!==false,heavy:result.damage>=40,direction:hit.direction});
 if(result.lethal)lethal(victim,p,result,wi,hit.to,hit.direction,now);
}
// One death path for bullets, blades, HE and fire: score, credits, assists, the
// dropped primary and the kill event everyone presents.
function lethal(victim,p,result,wi,point,direction,now){
 const self=p.id===victim.id;
 victim.deaths++;victim.dead=now+3000;if(!self){p.kills++;const reward=economyOn(state)?ECONOMY.kill[wi]??300:0;if(reward)give(p,reward);if(result.headshot)p.hs=(p.hs||0)+1;if(isRespawnMode(state.mode))state.score[p.team]++;}
 // CS rule of thumb: 40+ damage on the victim from someone else earns the assist.
 for(const [sid,record]of Object.entries(victim.received||{})){const helper=state.players[sid];if(sid!==p.id&&sid!==victim.id&&helper&&helper.team!==victim.team&&record.damage>=40)helper.assists=(helper.assists||0)+1;}
 if(economyOn(state)&&Number.isInteger(victim.primary))dropWeapon(state,victim,now,{weapon:victim.primary});
 const kill={kind:'kill',killerId:p.id,killerName:p.name,killerTeam:p.team,victimId:victim.id,victimName:victim.name,victimTeam:victim.team,weapon:wi,weaponDropped:victim.weapon,headshot:result.headshot,damage:result.total,hits:result.hits,dealt:p.received?.[victim.id]?.damage||0,dealtHits:p.received?.[victim.id]?.hits||0,killerHp:p.hp,reward:self?0:economyOn(state)?ECONOMY.kill[wi]??300:0,direction,time:now,killerKills:p.kills,victimDeaths:victim.deaths,score:{...state.score},victim:{id:victim.id,life:victim.life,team:victim.team,weapon:victim.weapon,duck:victim.duck||0,x:victim.x,y:victim.y||0,z:victim.z,yaw:victim.yaw,pitch:victim.pitch,finish:victim.finishes?.[victim.weapon]}};
 victim.death=kill;event(kill);
}
// Blast and fire damage from the rules modules land here (host only).
function hurt(victim,ownerId,amount,wi,point){
 const now=clock.time,attacker=state.players[ownerId]||victim;if(!victim||victim.hp<=0||victim.loading||now<(victim.invulnerable||0)||!canAct(state))return;
 const result=applyBlast(victim,ownerId,amount,now);if(attacker.id!==victim.id)attacker.dealt=(attacker.dealt||0)+result.damage;
 const dx=victim.x-point[0],dz=victim.z-point[2],len=Math.hypot(dx,dz)||1,direction=[dx/len,0,dz/len];
 event({kind:'damage',id:victim.id,point:[victim.x,(victim.y||0)+1.1,victim.z],by:ownerId,zone:wi===WEAPON_FIRE?'legs':'chest',helmet:true,heavy:result.damage>=40,direction,burn:wi===WEAPON_FIRE});
 if(result.lethal)lethal(victim,attacker,result,wi,point,direction,now);
}
function simulate(dt,now){
 state.now=now;
 // Everyone human marked ready (or dead): the buy phase ends early.
 if(canBuyNow(state)){const humans=Object.values(state.players).filter(v=>!v.bot&&!v.loading);if(humans.length&&humans.every(v=>v.buyReady===state.round||v.hp<=0))state.phaseUntil=Math.min(state.phaseUntil,now+600);}
 if(!state.preview)updateMatch(state,now,spawn,event);
 for(const p of Object.values(state.players)){
  if(p.loading)continue;if(p.hp<=0){if(isRespawnMode(state.mode)&&now>p.dead&&!state.ended)spawn(p);continue;}
  if(!canAct(state)){p.vx=p.vz=p.speed=0;continue;}
  if(p.bot)p.input=botInput(p,Object.values(state.players),now,dt,{difficulty:state.difficulty,weapon:economyOn(state)?p.primary??0:state.botWeapon??undefined,objective:botObjectiveOrder(state,p),fires:state.fires,he:known=>botHeTarget(state,p,now,known),utility:flashEnabled(state),grenades:state.grenades});
  const i=p.bot||p.id===id?p.input||{}:remoteInputs.get(p)?.read(performance.now())||{};p.input=i;
  if(p.reload&&now>=p.reload){p.ammo[p.weapon]=WEAPONS[p.weapon].mag;p.reload=0;}
  if(!WEAPONS[p.weapon].melee&&i.reload&&now>=(p.equipUntil||0)&&!p.reload&&p.ammo[p.weapon]<WEAPONS[p.weapon].mag){p.reloadStart=now;p.reload=now+WEAPONS[p.weapon].reload*1000;}
  if(p.id!==id){
   if(p.bot){stepStance(p,!!i.crouch,dt);stepBotMovement(p,i,dt,now);}
   else {stepStance(p,!!i.crouch,dt);stepMovement(p,i,dt,now);if(i.jump)p.jumpRequestUntil=now+JUMP.bufferMs;i.jump=false;if(stepJump(p,dt,now,p.jumpRequestUntil))p.jumpRequestUntil=-Infinity;}
  }else{p.x=local.x;p.z=local.z;p.y=jump;p.groundY=local.groundY||0;p.speed=local.speed||0;p.vx=local.vx;p.vz=local.vz;p.duck=local.duck||0;p.jumpV=local.jumpV||0;p.landingUntil=local.landingUntil||0;}
  if(p.bot&&!i.fire&&!i.flash&&now>=(p.flashReady||0)){const target=botSmokeTarget(state,p,now);if(target){i.smoke=true;i.smokeTarget=target;}// One grenade per throw cooldown: a target computed while the arm is busy would be lost.
   if(!target&&now>=(p.flashReady||0)){const burn=botSmokeTarget(state,p,now,'fire');if(burn){i.incendiary=true;i.fireTarget=burn;}}}
  if(i.flash){throwFlash(state,p,now);i.flash=false;}
  if(i.smoke){throwSmoke(state,p,now,{eye:eyeHeight(p),target:p.bot?i.smokeTarget:null,enabled:flashEnabled(state)});i.smoke=false;}
  if(i.he){throwUtility(state,p,now,'he',{eye:eyeHeight(p),target:p.bot?i.heTarget:null,enabled:flashEnabled(state)});i.he=false;}
  if(i.incendiary){throwUtility(state,p,now,'fire',{eye:eyeHeight(p),target:p.bot?i.fireTarget:null,enabled:flashEnabled(state)});i.incendiary=false;}
  if(i.drop){if(economyOn(state)&&!p.bot)dropWeapon(state,p,now);i.drop=false;}
  if(i.fire||i.secondary)shoot(p,now,!!i.secondary);i.secondary=false;i.reload=false;if(!WEAPONS[p.weapon].auto)i.fire=false;
 }
 recordPositions(state,now);
 updateFlashes(state,dt,now,event,hurt);updateFires(state,now,hurt,event);updatePickups(state,now,{economy:economyOn(state)});updateObjective(state,now);
 // Resolve a team wipe in the same simulation tick as the last elimination.
 if(!state.preview)updateMatch(state,now,spawn,event);
}
function input(){return{flash:ready&&utilityPulse,smoke:ready&&smokePulse,he:ready&&hePulse,incendiary:ready&&firePulse,drop:ready&&dropPulse,interact:ready&&(!!keys.KeyE||interacting),jump:ready&&jumpPulse,crouch:ready&&!!(keys.ControlLeft||keys.ControlRight||touch.crouching),forward:ready?Math.max(-1,Math.min(1,(keys.KeyW?1:0)-(keys.KeyS?1:0)+touch.state.axes.forward)):0,side:ready?Math.max(-1,Math.min(1,(keys.KeyD?1:0)-(keys.KeyA?1:0)+touch.state.axes.side)):0,slow:ready&&!!(keys.ShiftLeft||keys.ShiftRight),fire:ready&&weaponSwitch.phase==='ready'&&(shotPulse||(WEAPONS[selected].auto&&mouseDown)),secondary:ready&&weaponSwitch.phase==='ready'&&selected===5&&secondaryPulse,reload:ready&&weaponSwitch.phase==='ready'&&reloadRequested,aim:ready&&aim,yaw,pitch,weapon:selected}}
function acceptInput(p,packet,remote=false){
 const i=remote?remoteInputs.get(p)?.accept(packet,state.mode,p.weapon,performance.now()):cleanInput(packet,state.mode,p.weapon);if(!i)return;
 if(i.yaw!==null)p.yaw=i.yaw;if(i.pitch!==null)p.pitch=i.pitch;
 if(p.hp>0&&ownsWeapon(state,p,i.weapon))equipWeapon(p,i.weapon,clock.time);p.input=i;p.seen=Date.now();
}
function start(){const visits=MAPS[ACTIVE_MAP].visits;$('visitnav').hidden=!(state.preview&&visits);if(visits)$('visitpoint').replaceChildren(...Object.entries(visits).map(([key,v])=>Object.assign(document.createElement('option'),{value:key,textContent:v[3]})));$('visitpoint').value='spawn';$('resume').hidden=false;clock.reset(state.now??state.started??Date.now());state.now=clock.time;snapshots.clear();lastSnapshotAt=performance.now();if(!host)snapshots.push(state,lastSnapshotAt);playing=true;ready=false;resultHandled=null;matchStartXP=career.data.xp;mapSelect.disabled=true;networkSeq=0;clearActions();local.vx=local.vz=0;camera.fov=BASE_FOV;camera.updateProjectionMatrix();$('menu').hidden=true;$('hud').hidden=false;frameMeter.reset();$('pause').hidden=false;$('pausetitle').textContent='PRONTO A ENTRARE?';$('pausetext').textContent=state.preview?'Visita libera senza bot e senza limite di tempo. H nasconde l’HUD, ESC torna al menu pausa.':(training?'Allenamento con '+Object.values(state.players).filter(p=>p.bot).length+' bot. ':'Stanza '+room+'. ')+(isRoundMode(state.mode)?'Una vita per round · prima squadra a '+matchRules(state).target+'.':matchRules(state).label+' · rientro continuo · primi a '+matchRules(state).target+' eliminazioni.');$('roomtag').textContent=MAPS[ACTIVE_MAP].short+' / '+(state.preview?'VISITA':training?'TRAINING':room);$('copy').hidden=training;const p=state.players[id];$('feed').replaceChildren();kills.clear();kills.reconcile(state,matchNow(),presentKill);if(p){syncWeapon(p);local.x=p.x;local.z=p.z;yaw=p.yaw;localLife=p.life;pitch=0;jump=local.y=p.y||0;local.groundY=p.groundY||0;jumpV=local.jumpV=local.duck=0;local.landingUntil=0;localView.reset({...local,life:p.life});jumpRequestUntil=-Infinity}lastDamageHP=100;lastDeath=null;$('deathcard').hidden=true;document.querySelector('.pausebox>small').textContent=touch.enabled?'Joystick a sinistra · trascina a destra per mirare · pulsante SPARA':'Click sinistro spara · Destro ottica M24 · 1–6 equipaggiamento · Q ultima arma · V coltello';$('resume').textContent='ENTRA IN CAMPO ↗'}
function disconnectNetwork(){networkSession?.close();networkSession=null;peer=null;upstream=null;connections.clear();}
function cleanup(){
 kills.clear();clearHistory();viewKick.reset();sfx.cancelReload('local');sfx.setAmbience(.5);document.documentElement.classList.remove('clean-view');awaitingPointerLock=false;touch.setActive(false);resetBots();snapshots.clear();clock.pause();playing=false;ready=false;clearActions();document.exitPointerLock?.();disconnectNetwork();
 state={players:{},score:{blue:0,orange:0},started:0,ended:false};for(const g of avatars.values())releaseAvatar(g);avatars.clear();mapSelect.disabled=false;
 $('hud').hidden=$('pause').hidden=$('board').hidden=true;$('menu').hidden=false;for(const key of ['create','join','practice','explore'])$(key).disabled=false;
 effects.clear();deaths.clear();utilities.clear();smokeFX.clear();blastFX.clear();fireFX.clear();$('flash').style.opacity=0;lastDeath=null;scopeAmount=shotFlash=recoil=0;sniperCycleUntil=0;inspection.cancel();$('scope').style.display='none';$('damage').style.opacity=0;$('hit').style.opacity=0;clearKillConfirm();$('hurtdir').classList.remove('show');$('hurtdir').style.opacity='';
 $('feed').replaceChildren();$('messages').replaceChildren();$('deathcard').hidden=true;$('roundbanner').hidden=true;history.replaceState(null,'',location.pathname+'?map='+ACTIVE_MAP);status(mobileDevice?'Comandi touch · consigliato telefono in orizzontale':'PC e mouse · nessuna installazione');
}
function fillRoomBots(){if(!host||training||!state.fillBots)return;for(const team of missingBots(Object.values(state.players),state.teamSize))addPlayer('bot'+(++botSerial),nextBotName(Object.values(state.players),botSerial),team,true);}
function joinConnection(c,session){
 if(!validPeerId(c.peer)){c.close();return;}
 let joined=false,rejected=false,readyTimer;const active=()=>session.active&&networkSession===session;
 const reject=message=>{rejected=true;sendPacket(c,{type:'error',message});session.after(300,()=>c.close());};
 const handshake=session.after(12000,()=>{if(!joined)c.close();});
 const leave=()=>{session.cancel(handshake);session.cancel(readyTimer);if(!active()||!joined||connections.get(c.peer)!==c)return;joined=false;connections.delete(c.peer);delete state.players[c.peer];fillRoomBots();};
 c.on('data',m=>{
  if(!active()||rejected||!m||typeof m!=='object')return;
  if(m.type==='hello'&&!joined){
   if(m.protocol!==NETWORK_PROTOCOL){reject('Versione diversa: entrambi i giocatori devono ricaricare il gioco.');return;}
   if(connections.has(c.peer)){reject('Operatore già collegato.');return;}
   const players=Object.values(state.players),capacity=(state.teamSize||2)*2;
   if(players.filter(p=>!p.bot).length>=capacity){reject('La stanza è piena ('+capacity+' giocatori).');return;}
   if(players.length>=capacity){const bot=replaceableBot(players,m.team,state.teamSize||2);if(bot)delete state.players[bot.id];}
   const p=addPlayer(c.peer,m.name,m.team,false,m.finishes,m.weapon,m.operator);if(!p){reject('Nessun posto disponibile.');return;}
   p.loading=true;p.hp=0;p.invulnerable=0;readyTimer=session.after(45000,()=>{if(p.loading)c.close();});joined=true;session.cancel(handshake);connections.set(c.peer,c);fillRoomBots();sendPacket(c,{type:'welcome',protocol:NETWORK_PROTOCOL,id:c.peer,state:snapshotForNetwork(state),room});event({kind:'info',text:p.name+' è entrato nella stanza'});
  }else if(m.type==='ready'&&joined){const p=state.players[c.peer];if(p?.loading){session.cancel(readyTimer);p.loading=false;spawn(p);if(isRoundMode(state.mode)&&state.phase==='live'){p.hp=0;p.dead=0;p.invulnerable=0;}sendPacket(c,{type:'state',state:snapshotForNetwork(state)});}}
  else if(m.type==='input'&&joined){const p=state.players[c.peer];if(!p||p.loading)return;acceptInput(p,m.input,true);if(Number.isFinite(m.stamp))sendPacket(c,{type:'pong',stamp:m.stamp});}
  else if(m.type==='buy'&&joined){const p=state.players[c.peer];if(p&&!p.loading)buyItem(state,p,String(m.item||''),clock.time);}
  else if(m.type==='sell'&&joined){const p=state.players[c.peer];if(p&&!p.loading)sellItem(state,p,String(m.item||''),clock.time);}
  else if(m.type==='buyready'&&joined){const p=state.players[c.peer];if(p)p.buyReady=state.round;}
  else if(m.type==='loadout'&&joined){const p=state.players[c.peer];if(p){p.finishes=cleanLoadout(m.finishes);if(m.operator)p.operator=cleanOperator(m.operator);}}
 });c.on('close',leave);c.on('error',leave);
}
function receiveState(next){
 if(!validSnapshot(next,id)||next.started===state.started&&next.now<state.now)return;
 const wasEnded=state.ended;state=next;lastSnapshotAt=performance.now();snapshots.push(state,lastSnapshotAt);
 if(wasEnded&&!state.ended){resultHandled=null;matchStartXP=career.data.xp;kills.clear();$('feed').replaceChildren();deaths.clear();ready=false;clearActions();touch.setActive(false);document.exitPointerLock?.();$('board').hidden=true;$('pause').hidden=false;$('pausetitle').textContent='NUOVA PARTITA';$('resume').textContent='ENTRA IN CAMPO ↗';}
 kills.reconcile(state,matchNow(),presentKill);const p=state.players[id];
 if(p&&p.life!==localLife){syncWeapon(p);clearActions();localLife=p.life;local.x=p.x;local.z=p.z;yaw=p.yaw;pitch=0;jump=local.y=p.y||0;local.groundY=p.groundY||0;jumpV=local.jumpV=local.duck=0;local.landingUntil=0;jumpRequestUntil=-Infinity;local.vx=local.vz=0;lastDeath=null;localView.reset({...local,life:p.life});clock.reset(state.now);}
 if(p&&(p.hp<=0||Math.hypot(p.x-local.x,p.z-local.z)>4)){local.x=p.x;local.z=p.z;local.vx=local.vz=0;localView.reset({...local,life:p.life});}
}
async function online(create){
 if(!window.Peer){error('Modulo multiplayer non disponibile. Ricarica la pagina.');return;}
 const code=create?Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join(''):$('room').value.trim().toUpperCase();
 if(!/^[A-Z2-9]{6}$/.test(code)){error('Inserisci un codice stanza di 6 caratteri.');return;}
 disconnectNetwork();host=create;training=false;room=code;mapSelect.disabled=true;for(const key of ['create','join','practice','explore'])$(key).disabled=true;status('Connessione al servizio multiplayer…');
 let session;
 const active=()=>session?.active&&networkSession===session;
 const fail=message=>{if(!active())return;disconnectNetwork();if(!playing){mapLoadEpoch++;configureMap(lastGoodMap);mapSelect.value=lastGoodMap;error(message);$('practice').disabled=$('explore').disabled=false;}else{pauseGame();$('pausetitle').textContent='CONNESSIONE PERSA';$('pausetext').textContent=message;$('resume').hidden=true;}};
 try{
  const candidate=new Peer(create?ROOM_PREFIX+code:undefined,{debug:0});peer=candidate;session=new NetworkSession(candidate);networkSession=session;
  const timeout=session.after(16000,()=>fail('Connessione scaduta. Riprova o usa Allenamento.'));
  candidate.on('error',e=>{if(!active())return;if(playing&&host){$('network').textContent='SIGNALING OFFLINE · PARTITA ATTIVA';return;}fail(e.type==='peer-unavailable'?'Stanza non trovata: controlla codice e host. Entrambi devono usare la versione aggiornata.':'Rete multiplayer non disponibile ('+e.type+'). Esci e riprova.');});
  candidate.on('open',pid=>{
   if(!active())return;session.cancel(timeout);id=pid;
   if(create){clock.reset(Date.now());state=createMatch($('mode').value,clock.time,botDifficulty,ACTIVE_MAP,matchOptions());addPlayer(id,$('name').value,$('team').value,false,career.data.finishes);fillRoomBots();candidate.on('connection',c=>{if(active())joinConnection(c,session);else c.close();});history.replaceState(null,'',location.pathname+'?room='+room+'&map='+ACTIVE_MAP+(touch.enabled?'&touch=1':''));start();return;}
   status('Collegamento diretto all’host…');const connection=candidate.connect(ROOM_PREFIX+code,{reliable:true});upstream=connection;
   const pending=session.after(30000,()=>fail('Impossibile completare l’ingresso. L’host deve restare aperto; alcune reti richiedono un relay TURN, non incluso in questa versione.'));
   let welcoming=false,latest=null;
   connection.on('open',()=>{if(active()){status('Verifica della stanza…');sendPacket(connection,{type:'hello',protocol:NETWORK_PROTOCOL,name:$('name').value,team:$('team').value,finishes:career.data.finishes,operator:career.data.operator,weapon:selected});}});
   connection.on('data',async m=>{
    if(!active()||!m||typeof m!=='object')return;
    if(m.type==='welcome'){
     if(welcoming||playing)return;
     if(m.protocol!==NETWORK_PROTOCOL||m.id!==pid||!validSnapshot(m.state,pid)){console.warn('Verifica stanza:',m.protocol===NETWORK_PROTOCOL,m.id===pid,snapshotIssue(m.state,pid));fail('Dati stanza non compatibili. Ricaricate entrambi il gioco.');return;}
     welcoming=true;latest=m.state;
     try{const loaded=await loadMap(m.state.map||'sahra');if(!active()||!loaded)return;session.cancel(pending);state=latest;id=pid;history.replaceState(null,'',location.pathname+'?room='+room+'&map='+ACTIVE_MAP+(touch.enabled?'&touch=1':''));start();sendPacket(connection,{type:'ready'});}
     catch{fail('Impossibile caricare la mappa della stanza. Riprova.');}
    }else if(m.type==='state'&&validSnapshot(m.state,pid)){if(!playing){if(welcoming)latest=m.state;}else receiveState(m.state);}
    else if(m.type==='event'&&playing&&m.event&&typeof m.event==='object')event(m.event);
    else if(m.type==='pong'&&Number.isFinite(m.stamp))ping=Math.max(0,Math.min(9999,Date.now()-m.stamp));
    else if(m.type==='error')fail(typeof m.message==='string'?m.message.slice(0,240):'Impossibile entrare nella stanza.');
   });
   connection.on('close',()=>fail('L’host ha chiuso la stanza. Esci e crea una nuova partita per continuare.'));
   connection.on('error',()=>fail('Il collegamento con l’host è stato interrotto. Esci e riprova.'));
  });
 }catch(e){if(session)fail('Impossibile avviare il multiplayer: '+e.message);else{error('Modulo multiplayer non disponibile. Ricarica.');$('practice').disabled=$('explore').disabled=false;}}
}
const difficultyKeys=Object.keys(BOT_LEVELS);let botDifficulty='tactical';try{const saved=localStorage.getItem('breach-bot-level');if(Object.hasOwn(BOT_LEVELS,saved))botDifficulty=saved;}catch{}
function showDifficulty(){$('botlevel').value=botDifficulty;$('difficulty').innerHTML='<small>BOT</small>'+BOT_LEVELS[botDifficulty].label+' ↻';$('difficulty').setAttribute('aria-label','Difficoltà bot: '+BOT_LEVELS[botDifficulty].label+'. Clicca per cambiare.');}
$('difficulty').onclick=()=>{botDifficulty=difficultyKeys[(difficultyKeys.indexOf(botDifficulty)+1)%difficultyKeys.length];showDifficulty();try{localStorage.setItem('breach-bot-level',botDifficulty)}catch{}status('Allenamento: bot '+BOT_LEVELS[botDifficulty].label.toLowerCase()+'.');};showDifficulty();
$('explore').onclick=()=>{disconnectNetwork();host=true;training=true;resetBots();id='local';room='';clock.reset(Date.now());state=createMatch('deathmatch',clock.time,undefined,ACTIVE_MAP);state.preview=true;addPlayer(id,$('name').value,$('team').value,false,career.data.finishes);start();};
$('create').onclick=()=>online(true);$('join').onclick=()=>online(false);
$('practice').onclick=()=>{disconnectNetwork();host=true;training=true;resetBots();id='local';room='';clock.reset(Date.now());const allies=Number($('alliedbots').value),enemies=Number($('enemybots').value);state=createMatch($('mode').value,clock.time,botDifficulty,ACTIVE_MAP,{...matchOptions(),teamSize:Math.max(allies+1,enemies)});const player=addPlayer(id,$('name').value,$('team').value,false,career.data.finishes),opponent=player.team==='blue'?'orange':'blue';for(const [count,team]of [[allies,player.team],[enemies,opponent]])for(let n=0;n<count;n++)addPlayer('bot'+(++botSerial),nextBotName(Object.values(state.players),botSerial),team,true);start();};
try{$('name').value=localStorage.getItem('breach-name')||'Operatore';}catch{$('name').value='Operatore';}$('name').oninput=()=>{try{localStorage.setItem('breach-name',$('name').value);}catch{}};const invited=new URLSearchParams(location.search).get('room');if(invited){$('room').value=invited;status('Sei stato invitato nella stanza '+invited+'. Inserisci il nome e premi →.')}
$('resume').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!touch.enabled)touch.setEnabled(true);});
$('resume').onclick=()=>{if(state.ended&&host){$('board').hidden=true;notice('');lastDamageHP=100;scopeAmount=0;aim=false;mouseDown=false;resetBots();state.score={blue:0,orange:0};state.killEvents=[];kills.clear();clock.reset(Date.now());state.started=clock.time;state.now=clock.time;snapshots.clear();state.ended=false;resultHandled=null;matchStartXP=career.data.xp;state.phase='waiting';state.round=0;deaths.clear();lastDeath=null;$('feed').replaceChildren();$('pausetitle').textContent='IN PAUSA';$('resume').textContent='TORNA IN CAMPO ↗';state.history=[];for(const p of Object.values(state.players)){p.kills=p.deaths=p.assists=p.dealt=p.hs=0;if(!p.loading)spawn(p)}}enterField()};$('leave').onclick=cleanup;
$('copy').onclick=async()=>{const url=location.origin+location.pathname+'?room='+room+'&map='+ACTIVE_MAP+(touch.enabled?'&touch=1':'');try{await navigator.clipboard.writeText(url);$('copy').textContent='LINK COPIATO ✓';setTimeout(()=>$('copy').textContent='COPIA INVITO ↗',2200)}catch{prompt('Copia questo invito:',url)}};
document.addEventListener('pointerlockchange',()=>{if(armory.active||controls.active||buyMenu.active){ready=false;clearActions();if(armory.active||buyMenu.active)$('pause').hidden=true;return;}if(touch.enabled)return;ready=document.pointerLockElement===canvas;if(ready)awaitingPointerLock=false;if(playing){if(state.ended){$('pause').hidden=true;$('board').hidden=false;return;}$('pause').hidden=ready;if(!ready){awaitingPointerLock=false;clearActions();if(!state.ended){$('pausetitle').textContent='IN PAUSA';$('pausetext').textContent=state.preview?'Visita libera in pausa. H nasconde l’HUD durante la visita.':training?'Allenamento in pausa.':'La partita online continua mentre sei in pausa.';$('resume').textContent='TORNA IN CAMPO ↗';}}}});document.addEventListener('pointerlockerror',()=>{if(!armory.active)mouseFallback();});
window.addEventListener('mousemove',e=>{if(touch.enabled||!ready||controls.active||(fallbackMouse&&!aim))return;const gain=mouseGain(controls.value,camera.fov,aim);yaw-=e.movementX*gain;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*gain));});window.addEventListener('keydown',e=>{if(!playing||controls.active||armory.active)return;if(state.preview&&ready&&e.code==='KeyH'&&!e.repeat){document.documentElement.classList.toggle('clean-view');return;}if(['Tab','Space','ArrowUp','ArrowDown','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyB'){if(!e.repeat)openBuy();return}if(e.code==='Escape'&&(fallbackMouse||touch.enabled)){if(!state.ended){$('pausetitle').textContent='IN PAUSA';$('resume').textContent='TORNA IN CAMPO ↗';}ready=false;$('pause').hidden=false;clearActions();}if(e.code==='Tab')$('board').hidden=false;if(ready&&e.code==='KeyR')reloadRequested=true;if(ready&&e.code==='KeyC'&&!e.repeat&&selected===4){scopeZoom=scopeZoom===4?8:4;}if(ready&&e.code==='KeyQ'&&!e.repeat)selectWeapon(weaponSwitch.previous);if(ready&&e.code==='KeyV'&&!e.repeat)selectWeapon(selected===5?weaponSwitch.previous:5);if(ready&&e.code==='KeyG'&&selected===5&&!e.repeat)secondaryPulse=true;if(ready&&e.code==='KeyF'&&!e.repeat)requestInspection();if(ready&&e.code==='KeyX'&&!e.repeat)utilityPulse=true;if(ready&&e.code==='KeyZ'&&!e.repeat)smokePulse=true;if(ready&&e.code==='KeyG'&&selected!==5&&!e.repeat)hePulse=true;if(ready&&e.code==='KeyH'&&!state.preview&&!e.repeat)firePulse=true;if(ready&&e.code==='KeyT'&&!e.repeat)dropPulse=true;if(ready&&/^Digit[1-6]$/.test(e.code))selectWeapon(Number(e.code.at(-1))-1);if(ready&&canAct(state)&&state.players[id]?.hp>0&&e.code==='Space'&&!e.repeat)jumpRequestUntil=matchNow()+JUMP.bufferMs});window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Tab'&&!state.ended)$('board').hidden=true});window.addEventListener('blur',()=>{if(qaMode)return;if(playing&&ready)pauseGame();else clearActions();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!qaMode)pauseGame();});window.addEventListener('mousedown',e=>{if(touch.enabled||!ready||e.target!==canvas)return;if(e.button===0){mouseDown=true;shotPulse=true;inspection.cancel();const me=state.players[id];if(me&&me.hp>0&&selected!==5&&!me.reload&&me.ammo?.[selected]===0&&canAct(state))sfx.dry();}if(e.button===2){if(selected===5&&!fallbackMouse)secondaryPulse=true;else aim=controls.value.toggleAim?!aim:true;}});window.addEventListener('mouseup',e=>{if(touch.enabled)return;if(e.button===0)mouseDown=false;if(e.button===2&&!controls.value.toggleAim)aim=false});window.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('wheel',e=>{if(ready&&!e.ctrlKey&&Math.abs(e.deltaY)>.01){const list=allowedWeapons(state.mode),next=weaponSwitch.wheel(e.deltaY,performance.now(),list.length);if(next!==null)cycleWeapon(e.deltaY);}},{passive:true});
function requestInspection(){const p=state.players[id],now=matchNow();inspection.request(performance.now(),ready&&p?.hp>0&&!aim&&!p.reload&&!mouseDown&&weaponSwitch.phase==='ready'&&now>=(p.equipUntil||0)&&canAct(state),selected);}
function syncWeapon(p){if(selected!==p.weapon){selected=p.weapon;weaponSwitch.reset(selected);scopeAmount=0;aim=false;}}
function cycleWeapon(direction){const list=allowedWeapons(state.mode).filter(i=>ownsWeapon(state,state.players[id],i)),at=list.indexOf(selected);selectWeapon(list[(at+(direction>0?1:list.length-1))%list.length]);}
function selectWeapon(i){if(playing&&(!weaponAllowed(state.mode,i)||!ownsWeapon(state,state.players[id],i)))return;if(!Number.isInteger(i)||i<0||i>=WEAPONS.length||!weaponSwitch.request(i))return;scopeAmount=0;sniperCycleUntil=0;aim=false;mouseDown=shotPulse=secondaryPulse=false;reloadRequested=false;inspection.cancel();selected=i;sfx.cancelReload('local');if(playing)sfx.equip(i===5);const p=state.players[id];if(p&&host)equipWeapon(p,i,clock.time);}
for(const[w,i]of WEAPONS.map((w,i)=>[w,i])){const b=document.createElement('button');b.innerHTML='<small>'+(i+1)+'</small>'+weaponIcon(i)+'<span>'+w.name+'</span>';b.title=w.name+' · '+w.label;b.onclick=()=>selectWeapon(i);$('slots').append(b)}
$('openarmory').disabled=false;
const armory=new Armory(renderer,equipmentEnvironment.texture,selectWeapon,()=>{$('menu').hidden=playing;$('hud').hidden=!playing;$('pause').hidden=!playing;},{career,onFinish:()=>{for(const [i,rig]of weaponCache)applyFinish(rig.userData.knife||rig.userData.gun||rig,i,career.data.finishes[i]);const p=state.players[id];if(p)p.finishes=cleanLoadout(career.data.finishes);if(playing&&!host&&upstream?.open)sendPacket(upstream,{type:'loadout',finishes:career.data.finishes,operator:career.data.operator});showCareer();},onOperator:()=>{const p=state.players[id];if(p)p.operator=cleanOperator(career.data.operator);if(playing&&!host&&upstream?.open)sendPacket(upstream,{type:'loadout',finishes:career.data.finishes,operator:career.data.operator});}});
await armory.warm();
// V33: the OB designs use their own plain materials; link their programs now, in both the hands pass and the arena.
{const warm=warmVariantMaterials();handsScene.add(warm);if(renderer.compileAsync)await renderer.compileAsync(handsScene,handsCamera);handsScene.remove(warm);scene.add(warm);if(postfx?.enabled)await postfx.compile(warm,camera,scene);else if(renderer.compileAsync)await renderer.compileAsync(warm,camera,scene);scene.remove(warm);}
let worldSun=null,sunLit=1,sunCheckAt=0;const drawSize=new THREE.Vector2();const sunDirection=new THREE.Vector3(),cameraInverse=new THREE.Quaternion();
mapChanged=()=>{keyLight.color.set(0xffefdf);armory.setTheme(ACTIVE_MAP);worldSun=null;mapScene?.traverse(o=>{if(o.isDirectionalLight&&o.castShadow)worldSun=o;});};mapChanged();
// First-person key light follows the arena sun in camera space and dims in real shade.
function lightViewmodel(t,dt){
 if(!worldSun)return;sunDirection.copy(worldSun.position).sub(worldSun.target.position).normalize();
 if(t-sunCheckAt>90){sunCheckAt=t;sunLit=wallDistance(camera.position.toArray(),sunDirection.toArray(),80)<80?0:1;}
 keyLight.intensity=THREE.MathUtils.damp(keyLight.intensity,sunLit?2.3:.55,6,dt);fillLight.intensity=THREE.MathUtils.damp(fillLight.intensity,sunLit?1:.75,6,dt);
 keyLight.position.copy(sunDirection).applyQuaternion(cameraInverse.copy(camera.quaternion).invert()).multiplyScalar(5);
 // Inspection: the piece is turned into the light, so it keeps the lighting it has in the hands.
 const turn=gun?.userData.inspectQ;fillLight.position.copy(FILL_REST);if(turn){keyLight.position.applyQuaternion(turn);fillLight.position.applyQuaternion(turn);}
}
$('prematchcustom').disabled=false;$('prematchcustom').onclick=()=>{$('openarmory').click();};
$('openarmory').onclick=()=>{awaitingPointerLock=false;ready=false;clearActions();touch.setActive(false);document.exitPointerLock?.();$('menu').hidden=$('hud').hidden=$('pause').hidden=true;armory.open(selected);};
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
// Buy phase: the host applies purchases for itself directly; guests send requests it validates.
const buyMenu=new BuyMenu({onBuy:requestBuy,onSell:requestSell,onReady:requestReady,canEquip:i=>playing&&weaponAllowed(state.mode,i)&&ownsWeapon(state,state.players[id],i)&&state.players[id]?.hp>0,onEquip:i=>selectWeapon(i),heldWeapon:()=>selected,utilityOn:()=>!!MAPS[state.map]?.utility,nameOf:i=>displayName(i,career.data.finishes[i]),onOpen:()=>{ready=false;clearActions();document.exitPointerLock?.();},
 onClose:reason=>{if(!playing||state.ended||controls.active||armory.active)return;if(reason==='timeout'&&!touch.enabled&&!fallbackMouse){$('pausetitle').textContent='ROUND INIZIATO';$('pausetext').textContent='Il tempo per gli acquisti è finito. Torna in campo.';$('resume').textContent='TORNA IN CAMPO ↗';$('pause').hidden=false;return;}enterField();}});
// B: the shop while the window is open and you are alive; otherwise the ARSENALE view (finishes stay in the lobby's Officina).
function openBuy(){if(!playing||buyMenu.active||armory.active)return;const me=state.players[id];if(!me)return;buyMenu.open(!(canBuyNow(state,me,matchNow())&&me.hp>0));}
function requestBuy(item){if(host){const p=state.players[id];if(p&&buyItem(state,p,item,clock.time))sfx.buy?.();}else if(upstream?.open)sendPacket(upstream,{type:'buy',item});}
function requestSell(item){if(host){const p=state.players[id];if(p&&sellItem(state,p,item,clock.time))sfx.buy?.();}else if(upstream?.open)sendPacket(upstream,{type:'sell',item});}
function requestReady(){if(host){const p=state.players[id];if(p)p.buyReady=state.round;}else if(upstream?.open)sendPacket(upstream,{type:'buyready'});buyMenu.close();}
const pipsShown={blue:'',orange:''};
const smokeFX=new SmokeFX(scene),blastFX=new BlastFX(scene),fireFX=new FireFX(scene);smokeFX.sun=arenaSun;new CrosshairEditor(()=>[$('crosshair'),$('chpreview')]);const radar=new Radar($('radar'));let spotted=new Set(),spottedAt=0,slotsShownAt=0,shownWeapon=-1;
function hud(){
 const p=state.players[id];if(!p)return;const now=matchNow(),drawing=weaponSwitch.phase!=='ready'||now<(p.equipUntil||0),tactical=isRoundMode(state.mode),players=Object.values(state.players);
 $('hp').textContent=p.hp;$('armor').textContent=Math.ceil(p.armor||0);$('healthbar').style.width=p.hp+'%';$('armorbar').style.width=Math.max(0,Math.min(100,p.armor||0))+'%';$('vitals').classList.toggle('low',p.hp>0&&p.hp<=30);$('vitals').classList.toggle('noarmor',!(p.armor>0));
 {const w=WEAPONS[selected],mag=selected===5?0:p.ammo[selected],reloading=selected!==5&&p.reload;if(shownWeapon!==selected){shownWeapon=selected;slotsShownAt=performance.now();$('ammoicon').innerHTML=weaponIcon(selected);}
  $('magbar').style.width=(selected===5?0:reloading?Math.max(0,Math.min(100,(now-(p.reloadStart||now))/Math.max(1,p.reload-(p.reloadStart||0))*100)):mag/w.mag*100)+'%';$('ammopanel').classList.toggle('reloading',!!reloading);$('ammopanel').classList.toggle('low',selected!==5&&!reloading&&mag<=Math.ceil(w.mag*.25));
  $('slots').classList.toggle('idle',performance.now()-slotsShownAt>2600&&ready);}
$('ammo').textContent=selected===5?'—':p.ammo[selected];$('reserveammo').textContent=selected===5?'':'/ ∞';$('weaponname').textContent=displayName(selected,career.data.finishes[selected])+' / '+WEAPONS[selected].label;$('reloadtext').textContent=selected===5?(drawing?'ESTRAZIONE…':now<(p.weaponReady?.[5]||0)?'RECUPERO':'G  STOCCATA'):p.reload?'RICARICA…':drawing?'ESTRAZIONE…':'R  RICARICA';$('blue').textContent=state.score.blue;$('orange').textContent=state.score.orange;
 $('matchlabel').textContent=state.preview?'VISITA MAPPA':tactical?'ROUND '+Math.max(1,state.round)+' · PRIMI A '+matchRules(state).target:matchRules(state).label+' · '+matchRules(state).target+' KILLS';
 const remaining=objectiveEnabled(state)&&state.objective?.status==='planted'?state.objective.explodeAt-now:tactical?(state.phase==='freeze'||state.phase==='result'?state.phaseUntil-now:state.roundEnds-now):matchRules(state).durationMs-(now-state.started),sec=Math.max(0,Math.ceil((remaining||0)/1000));
 $('timer').textContent=state.ended?'FINE':state.preview||state.phase==='waiting'&&tactical?'—':Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
 // The pips are rebuilt only when their markup changes: ten DOM rebuilds a second cost a style pass each.
 for(const [key,el] of [['blue','bluepips'],['orange','orangepips']]){const html=rosterHTML(players,key,id,tactical);if(pipsShown[key]!==html){pipsShown[key]=html;$(el).innerHTML=html;}}
 $('network').textContent=state.preview?'VISITA LIBERA · H NASCONDE HUD':training?players.filter(p=>p.bot).length+' BOT · '+(BOT_LEVELS[state.difficulty]?.label||'REGOLARE'):(host?'HOST · ':ping+' MS · ')+players.length+'/'+((state.teamSize||2)*2);
 if(p.hp<lastDamageHP){$('damage').style.opacity=.18;setTimeout(()=>$('damage').style.opacity=0,180);}lastDamageHP=p.hp;
 Array.from($('slots').children).forEach((b,i)=>{b.classList.toggle('active',selected===i);b.hidden=!weaponAllowed(state.mode,i)||!ownsWeapon(state,p,i);});
 // Economy: credits, reward pop, buy prompt and the bought primary in hand.
 const economy=economyOn(state),windowOpen=buyWindowOpen(state,now)&&p.hp>0,buyable=windowOpen&&canBuyNow(state,p,now);$('money').hidden=!economy;
 if(economy){$('moneyvalue').textContent=(p.money||0).toLocaleString('it-IT');if(lastMoney!==null&&p.money>lastMoney){const d=$('moneydelta');d.textContent='+'+(p.money-lastMoney).toLocaleString('it-IT');d.classList.remove('pop');void d.offsetWidth;d.classList.add('pop');}lastMoney=p.money??null;
  if(p.primary!==shownPrimary){if(Number.isInteger(p.primary)&&p.hp>0)selectWeapon(p.primary);shownPrimary=p.primary;}if(p.hp>0&&!ownsWeapon(state,p,selected))selectWeapon(Number.isInteger(p.primary)?p.primary:0);}
 const near=economy&&p.hp>0&&Number.isInteger(p.primary)?dropNear(state,p):null,seconds=Math.max(0,Math.ceil(buyWindowLeft(state,now)/1000));
 $('buyhint').hidden=buyMenu.active||!(windowOpen||near);
 if(near)$('buyhint').textContent='E  ·  RACCOGLI '+weaponName(near.weapon);
 else if(windowOpen)$('buyhint').textContent=buyable?(touch.enabled?'ACQUISTI':'B')+'  ·  '+(state.phase==='freeze'?'FASE D’ACQUISTO':'ZONA D’ACQUISTO')+'  ·  '+seconds+' s':'FUORI DALLA ZONA D’ACQUISTO  ·  '+seconds+' s';
 buyMenu.render(state,p,now,teamName(p.team));$('touchbuy').hidden=false;$('touchbuy').textContent=buyable?'ACQUISTI':'ARMI';$('touchbuy').setAttribute('aria-label',buyable?'Apri gli acquisti':'Apri l’arsenale');if(near&&!windowOpen)$('buyhint').hidden=buyMenu.active;
 const banner=$('roundbanner');banner.hidden=!tactical||state.phase==='live'||state.ended;
 updateObjectiveHUD(p,now);
 if(!banner.hidden){
  // Freeze time briefs the side and the sites; round one also names the map, and
  // the first round after half time announces the side swap.
  const half=Math.max(1,matchRules(state).target-1),swap=state.round>1&&(state.round-1)%half===0,sites=(MAPS[state.map]?.sites||[]).map(s=>s.id).join(' o '),attacking=objectiveEnabled(state)&&p.team===state.attackTeam;
  $('roundtitle').textContent=state.phase==='waiting'?'IN ATTESA DEGLI AVVERSARI':state.phase==='freeze'?(state.round===1?MAPS[state.map].lobby.name+' · ':swap?'CAMBIO LATO · ':'')+'ROUND '+state.round:state.roundWinner?(state.roundWinner===p.team?'ROUND VINTO':'ROUND PERSO'):'ROUND PAREGGIATO';banner.dataset.outcome=state.phase==='result'?(state.roundWinner?state.roundWinner===p.team?'win':'loss':'draw'):'';
  $('rounddetail').textContent=state.phase==='waiting'?'Serve almeno un operatore per squadra.':state.phase==='freeze'?(objectiveEnabled(state)?(attacking?'ATTACCO · porta la bomba su '+sites:'DIFESA · proteggi '+(sites.length>1?'i siti ':'il sito ')+sites.replace(' o ',' e ')):'Una vita a testa')+' · partenza tra '+sec+' s':(state.roundWinner?teamName(state.roundWinner)+' · ':'')+state.roundReason+' · prossimo round tra '+sec+' s';
 }
 if(state.ended){showResult();notice('');$('board').hidden=false;$('pausetitle').textContent='PARTITA CONCLUSA';$('resume').textContent=host?'NUOVA PARTITA ↗':'TORNA ALLA STANZA ↗';}
 else if(p.hp<=0)notice(tactical?(viewedId&&viewedId!==id?'OSSERVI '+(state.players[viewedId]?.name||'IL COMPAGNO'):'ELIMINATO · ATTENDI IL PROSSIMO ROUND'):'RIENTRO TRA '+Math.max(1,Math.ceil((p.dead-now)/1000))+' s');
 else if(!tactical&&now<p.invulnerable)notice('PROTEZIONE INIZIALE');else notice('');
 $('deathcard').hidden=p.hp>0||!lastDeath||state.ended;
 if(!$('deathcard').hidden){$('killer').textContent=lastDeath.killerName;$('deathweapon').innerHTML=weaponIcon(lastDeath.weapon);$('deathweaponname').textContent=weaponName(lastDeath.weapon)+(lastDeath.headshot?' · COLPO ALLA TESTA':'');$('deathstats').textContent='';const hits=n=>n+' '+(n===1?'colpo':'colpi');$('deathrecap').innerHTML='<div><small>SUBITI</small><b>'+lastDeath.damage+'</b><span>'+hits(lastDeath.hits)+'</span></div><div><small>INFLITTI</small><b>'+(lastDeath.dealt||0)+'</b><span>'+hits(lastDeath.dealtHits||0)+'</span></div><div><small>VITA AVVERSARIO</small><b>'+(lastDeath.killerHp??'—')+'</b><span>rimasta</span></div>';}
 $('board').classList.toggle('live',!state.ended);if(!state.ended){$('resultactions').hidden=true;$('resultsummary').hidden=true;$('resulttitle').textContent='IL CAMPO PARLA.';}
 if(!$('board').hidden)$('rows').innerHTML=scoreboardHTML(state,p,{tactical,economy:economyOn(state)});
 radar.setMap(ACTIVE_MAP,MAPS[ACTIVE_MAP],WALLS,BOUNDS);if(now-spottedAt>200||now<spottedAt){spottedAt=now;spotted=spottedEnemies(p,players,wallDistance,smokeBlocks);}
 const o=objectiveEnabled(state)?state.objective:null,bomb=o&&(o.status==='dropped'||o.status==='planted'||o.carrierId&&state.players[o.carrierId]?.team===p.team)?{x:o.x,z:o.z,planted:o.status==='planted'}:null;
 const marks=players.filter(v=>v.id!==id&&!v.loading&&(v.team===p.team||spotted.has(v.id)&&v.hp>0)).map(v=>({x:v.x,z:v.z,yaw:v.yaw||0,kind:v.team!==p.team?'enemy':v.hp>0?'ally':'dead',color:v.team==='blue'?'#7ec8ea':'#ff945d'}));
 radar.draw({x:p.x,z:p.z,yaw:p.hp>0?yaw:p.yaw||yaw},marks,bomb);
}
function advanceLocal(p,i,dt,now){
 if(!p||p.hp<=0||!canAct(state)){local.vx=local.vz=local.speed=0;return;}
 stepStance(local,ready&&i.crouch,dt);local.weapon=selected;local.yaw=yaw;local.y=jump;local.taggedUntil=p.taggedUntil;stepMovement(local,ready?i:{forward:0,side:0},dt,now);
 if(stepJump(local,dt,now,ready?jumpRequestUntil:-Infinity)){jumpRequestUntil=-Infinity;jumpPulse=true;}jump=local.y;jumpV=local.jumpV;
}
function deathView(p,now,dt){
 const death=p.death||lastDeath;if(death&&!lastDeath)lastDeath=death;
 const age=death?now-death.time:2000,ally=Object.values(state.players).find(v=>v.id!==id&&v.team===p.team&&v.hp>0);
 viewedId=age>1300&&ally?ally.id:id;
 if(viewedId!==id){
  const v=avatars.get(ally.id)?.userData.presentation||ally,origin=[v.x,eyeHeight(v),v.z],back=[Math.sin(v.yaw),.12,Math.cos(v.yaw)],len=Math.hypot(...back),dir=back.map(x=>x/len),dist=Math.max(.1,wallDistance(origin,dir,2.3)-.25);
  camera.position.set(origin[0]+dir[0]*dist,origin[1]+dir[1]*dist,origin[2]+dir[2]*dist);camera.rotation.set(v.pitch||0,v.yaw,0);
 }else{
  const u=Math.min(1,Math.max(0,age/850)),origin=[p.x,1.25+(p.y||0),p.z],back=[Math.sin(p.yaw),0,Math.cos(p.yaw)],dist=Math.max(.05,wallDistance(origin,back,1.8)-.2);
  camera.position.set(p.x+back[0]*dist*(.4+.6*u),1.55-u*.65,p.z+back[2]*dist*(.4+.6*u));camera.rotation.set(p.pitch||0,p.yaw,u*.12);
 }
}

// V34 posing cadence. An operator whose body or shadow can be in view is posed every
// frame, exactly as before. One whose body and shadow are both outside the view, where
// nothing of its pose can show, is posed every third frame, staggered so the work
// spreads over frames, and the next pose gets all the elapsed time. It is posed at
// once when it comes into view, gets a new life or switches weapon; muzzle flashes
// still switch on time.
const poseView=new THREE.Frustum(),poseMatrix=new THREE.Matrix4(),poseBody=new THREE.Sphere(new THREE.Vector3(),1.4),poseShadow=new THREE.Sphere(),poseSun=new THREE.Vector3();let poseFrame=0,poseSlots=0;
function poseVisible(pose,shadows){
 poseBody.center.set(pose.x,(pose.y||0)+.9,pose.z);if(poseView.intersectsSphere(poseBody))return true;if(!shadows)return false;
 // The shadow lies along the light, from the body down to the lowest floor it can reach.
 if(poseSun.y<.08)return true;const reach=(poseBody.center.y+1.4-Math.min(pose.groundY||0,0)+2.5)/poseSun.y;
 poseShadow.center.copy(poseBody.center).addScaledVector(poseSun,-reach/2);poseShadow.radius=reach/2+1.4;return poseView.intersectsSphere(poseShadow);
}
const stepTrack={x:0,z:0,dist:0,air:false,peak:0,life:-1};let localReloadKey=0,lastBlindUntil=0,enclosure=0,enclosureAt=0;
function localAudio(p,t,now){
 if(!p||p.hp<=0){stepTrack.life=-1;if(localReloadKey){localReloadKey=0;sfx.cancelReload('local');}return;}
 if(p.reload&&p.reloadStart!==localReloadKey){localReloadKey=p.reloadStart;sfx.reload('local',selected,WEAPONS[selected].reload);}else if(!p.reload&&localReloadKey){localReloadKey=0;sfx.cancelReload('local');}
 if((p.blindUntil||0)>lastBlindUntil+50){lastBlindUntil=p.blindUntil;sfx.deafen(Math.min(1,p.blindStrength||1),Math.max(1,(p.blindUntil-now)/1000));}
 sfx.tick(t,{hp:p.hp,alive:ready&&!state.preview});
 if(stepTrack.life!==p.life){Object.assign(stepTrack,{x:local.x,z:local.z,dist:0,air:false,peak:0,life:p.life});return;}
 const moved=Math.hypot(local.x-stepTrack.x,local.z-stepTrack.z),height=jump-(local.groundY||0),airborne=height>.06;stepTrack.x=local.x;stepTrack.z=local.z;
 if(airborne)stepTrack.peak=Math.max(stepTrack.peak,height);
 if(stepTrack.air&&!airborne){if(stepTrack.peak>.25)sfx.footstep({local:true,heavy:true,surface:surfaceAt(local.x,local.z,jump)});stepTrack.dist=.5;stepTrack.peak=0;}
 stepTrack.air=airborne;if(airborne||moved>2)return;
 // Running is audible; walking (SHIFT) and crouching are silent, as in tactical shooters.
 if((local.speed||0)>2.8&&(local.duck||0)<.5){stepTrack.dist+=moved;if(stepTrack.dist>=1.45){stepTrack.dist-=1.45;sfx.footstep({local:true,surface:surfaceAt(local.x,local.z,jump),volume:Math.min(1,(local.speed||0)/4.6)});}}
 else stepTrack.dist=Math.min(stepTrack.dist,1.1);
}
function remoteAudio(g,v,pose){
 const st=g.userData.steps??={dist:0,x:pose.x,z:pose.z,air:false,peak:0,life:v.life};
 if(st.life!==v.life)Object.assign(st,{dist:0,x:pose.x,z:pose.z,air:false,peak:0,life:v.life});
 if(v.reload&&v.reloadStart&&g.userData.reloadKey!==v.reloadStart){g.userData.reloadKey=v.reloadStart;sfx.reload(v.id,v.weapon,WEAPONS[v.weapon].reload,[pose.x,(pose.y||0)+1.15,pose.z]);}else if(!v.reload&&g.userData.reloadKey){g.userData.reloadKey=0;sfx.cancelReload(v.id);}
 const moved=Math.hypot(pose.x-st.x,pose.z-st.z),ground=groundHeight(pose.x,pose.z),height=(pose.y||0)-ground,airborne=height>.12;st.x=pose.x;st.z=pose.z;
 if(airborne)st.peak=Math.max(st.peak,height);
 const near=Math.hypot(pose.x-camera.position.x,pose.z-camera.position.z)<34,foot=[pose.x,ground+.05,pose.z];
 if(st.air&&!airborne){if(near&&st.peak>.25)sfx.footstep({position:foot,heavy:true,surface:surfaceAt(pose.x,pose.z,pose.y),muffled:occluded([pose.x,ground+.4,pose.z])});st.dist=.5;st.peak=0;}
 st.air=airborne;if(airborne||moved>2)return;
 if(pose.speed>2.8&&(v.duck||0)<.5){st.dist+=moved;if(st.dist>=1.45){st.dist-=1.45;if(near)sfx.footstep({position:foot,surface:surfaceAt(pose.x,pose.z,pose.y),muffled:occluded([pose.x,ground+.4,pose.z]),volume:Math.min(1,pose.speed/4.6)});}}
 else st.dist=Math.min(st.dist,1.1);
}
// Listener follows the rendered camera; a roof overhead switches to the enclosed reverb.
function listenerAudio(t){
 if(t-enclosureAt>150){enclosureAt=t;enclosure=wallDistance(camera.position.toArray(),[0,1,0],12)<12?1:0;}
 camera.updateMatrixWorld();sfx.listen(camera,enclosure);
}
for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{const fresh=!sfx.unlocked;sfx.unlock();if(fresh&&!playing)sfx.setAmbience(.5);},{passive:true});
$('volume').value=sfx.volume;$('volume-value').textContent=Math.round(sfx.volume*100)+'%';$('volume').oninput=()=>{sfx.setVolume(Number($('volume').value));$('volume-value').textContent=Math.round(sfx.volume*100)+'%';};

function frame(t){
 requestAnimationFrame(frame);if(contextLost)return;
 // The pacer adapts only during play; a skipped vsync (half rate) leaves `last` alone so the next step covers it.
 const inPlay=playing&&ready&&document.visibilityState==='visible';if(!pacing.frame(t,inPlay&&!armory.active))return;
 const elapsed=Math.max(0,(t-last)/1000),dt=Math.min(elapsed,.05);last=t;
 if(inPlay)frameMeter.add(elapsed*1000);
 if($('showperformance').checked&&t-metricsAt>500){metricsAt=t;const f=frameMeter.read();$('performancestats').textContent=f.fps+' FPS · p95 '+f.p95.toFixed(1)+' ms · '+f.slow+' frame >33 ms · risoluzione '+pacing.describe();}
 touch.setActive(playing&&ready&&!controls.active&&!armory.active&&!buyMenu.active);
 if(playing){
  syncSmokes(state,matchNow());
  if(state.round!==presentationRound){presentationRound=state.round;deaths.clear();}let p=state.players[id];const i=input();viewKick.update(dt);
  if(!training||ready){
   let first=true;
   const steps=clock.advance(elapsed,(step,now)=>{
    p=state.players[id];advanceLocal(p,i,step,now);
    if(host&&p){acceptInput(p,{...i,x:local.x,z:local.z,y:jump,fire:i.fire&&(first||WEAPONS[selected].auto),reload:i.reload&&first});simulate(step,now);}
    const current=state.players[id];if(current)localView.step({x:local.x,z:local.z,y:jump,duck:local.duck,life:current.life});
    first=false;
   });
   if(host&&steps){utilityPulse=smokePulse=hePulse=firePulse=dropPulse=false;shotPulse=secondaryPulse=jumpPulse=false;reloadRequested=false;}
  }else clock.pause();
  if(t-lastSend>50){
   lastSend=t;if(host&&!training)broadcast({type:'state',state:snapshotForNetwork(state)});
   if(!host&&upstream?.open){if(sendPacket(upstream,{type:'input',input:{...i,jump:jumpPulse,life:p?.life,seq:networkSeq++,at:matchNow()},stamp:Date.now()},{volatile:true})){utilityPulse=smokePulse=hePulse=firePulse=dropPulse=false;shotPulse=secondaryPulse=jumpPulse=false;reloadRequested=false;}}
  }
  p=state.players[id];const animationNow=matchNow(),switchPose=weaponSwitch.update(dt);if(switchPose.index!==displayed)buildGun(switchPose.index,switchPose.lower);
  if(p){
   if(p.hp<=0){clearActions();scopeAmount=0;inspection.cancel();if(touch.state.move||touch.state.firing.size)touch.reset();}
   viewedId=id;if(aim||p.reload||!ready||weaponSwitch.phase!=='ready'||!canAct(state)||animationNow<(p.equipUntil||0)||p.blindUntil>animationNow)inspection.cancel();
   $('flash').style.opacity=ready?flashOpacity(p,animationNow):0;
   if(p.hp>0){const kick=recoilAt({...p,weapon:selected},animationNow);if(!ready)localView.reset({x:local.x,z:local.z,y:jump,duck:local.duck,life:p.life});const visual=localView.sample(clock.accumulator*60)||{x:local.x,z:local.z,y:jump};viewOffsets=viewMotion(firstPersonMotion,{x:visual.x,z:visual.z,y:visual.y,groundY:local.groundY||0,yaw,pitch,life:p.life,active:ready,aim},dt);camera.position.set(visual.x,eyeHeight(visual)+viewOffsets.camera,visual.z);camera.rotation.set(Math.min(1.5,pitch+kick.pitch*CAMERA_RECOIL+viewKick.camera.pitch),yaw+kick.yaw*CAMERA_RECOIL+viewKick.camera.yaw,viewKick.camera.roll);}else deathView(p,animationNow,dt);
   const cycling=selected===4?Math.max(0,Math.min(1,1-(sniperCycleUntil-animationNow)/1000)):0,scoped=aim&&selected===4&&weaponSwitch.phase==='ready'&&animationNow>=(p.equipUntil||0)&&!p.reload&&animationNow>=sniperCycleUntil&&p.hp>0&&ready;
   scopeAmount=THREE.MathUtils.damp(scopeAmount,scoped?1:0,scoped?18:25,dt);
   const targetFov=scoped?scopeFov(scopeZoom):BASE_FOV,nextFov=THREE.MathUtils.damp(camera.fov,targetFov,18,dt);
   if(Math.abs(camera.fov-nextFov)>.001){camera.fov=nextFov;camera.updateProjectionMatrix();}
   $('scope').style.display=scopeAmount>.015?'block':'none';$('scope').style.opacity=scopeAmount;$('scopezoom').textContent=scopeZoom+'×';$('scopehint').hidden=!(selected===4&&p.hp>0);$('touchaim').textContent=selected===5?'STOCCATA':aim?'ESCI OTTICA':'OTTICA';$('touchaim').setAttribute('aria-label',selected===5?'Attacco pesante':'Attiva o disattiva ottica');$('touchaim').disabled=selected!==4&&selected!==5;$('touchaim').hidden=selected!==4&&selected!==5;$('touchreload').hidden=selected===5;$('touchfire').textContent=selected===5?'FENDENTE':'SPARA';$('touchfire').setAttribute('aria-label',selected===5?'Attacco leggero':'Spara');$('touchweapon').textContent=displayName(selected,career.data.finishes[selected])+' ↻';$('touchzoom').hidden=selected!==4;$('touchzoom').textContent=scopeZoom+'×';
   $('scopehint').textContent=p.reload?'RICARICA M24':animationNow<sniperCycleUntil?'RIARMO OTTURATORE':scopeZoom+(touch.enabled?'× · USA I PULSANTI OTTICA E ZOOM':'× · C CAMBIA ZOOM · DESTRO MIRA');$('crosshair').style.display=scopeAmount>.6||p.hp<=0||selected===4?'none':'block';$('crosshair').style.setProperty('--gap',crosshairGap(accuracyFor({...p,duck:local.duck,speed:local.speed,y:jump,jumpV},animationNow),innerHeight,camera.fov)+'px');gun.visible=p.hp>0&&scopeAmount<.88;
   lightViewmodel(t,dt);viewOffsets.kick=viewKick.gun;(gun.userData.model?animateViewmodel:animateWeapon)(gun,{time:t,reloadTime:matchNow(),moving:ready?Math.min(1,(local.speed||0)/4.4):0,aim:aim&&selected===4,recoil,reloading:!!p.reload,reloadDuration:WEAPONS[selected].reload,inspectPose:inspection.sample(t,selected),cycling:cycling>0&&cycling<1?cycling:0,dt,motion:viewOffsets,switchLower:switchPose.lower,strike:Math.max(0,Math.min(1,(t-knifeStrikeAt)/(knifeHeavy?420:300))),heavy:knifeHeavy,empty:selected!==5&&(p.ammo?.[selected]||0)===0});
   muzzle.visible=selected!==5&&shotFlash>0;handsFlash.intensity=muzzle.visible?1.3*Math.min(1,shotFlash/.03):0;if(muzzle.visible&&shotFlash>.04){muzzle.updateWorldMatrix(true,false);muzzle.getWorldPosition(handsFlash.position);}shotFlash-=dt;recoil=Math.max(0,recoil-dt*.55);
   localAudio(p,t,animationNow);
  }
  smokeFX.update(state,animationNow,camera);blastFX.update(animationNow);fireFX.update(state,animationNow);for(const f of fireFX.expired.splice(0))if(!isRoundMode(state.mode)||state.phase==='live')effects.burn([f.x,f.y,f.z]);const utilitySounds=utilities.update(state,animationNow,dt),bomb=state.objective,bombAt=bomb?[bomb.x,groundHeight(bomb.x,bomb.z)+.2,bomb.z]:null;if(utilitySounds.beep&&bombAt)sfx.beep(bombAt);if(utilitySounds.exploded&&bombAt){sfx.explosion(bombAt);effects.explosion?.(bombAt);const d=camera.position.distanceTo(new THREE.Vector3(...bombAt));if(d<30){sfx.deafen(1-d/30,2.6);viewKick.shake(1-d/30);}}
  const renderedPlayers=host?state.players:(snapshots.sample(t)||state.players),now=matchNow();
  camera.updateMatrixWorld();poseView.setFromProjectionMatrix(poseMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));poseFrame++;const poseShadows=renderer.shadowMap.enabled&&!!worldSun;if(worldSun)poseSun.copy(worldSun.position).sub(worldSun.target.position).normalize();
  for(const current of Object.values(state.players)){
   if(current.hp<=0&&current.death)deaths.add(current.death.victim,current.death,avatars.get(current.id));if(current.id===id)continue;if(current.hp<=0){const dead=avatars.get(current.id);if(dead)dead.visible=false;continue;}const v=renderedPlayers[current.id]||current;
   let g=avatars.get(v.id);if(!g){g=avatar(v);avatars.set(v.id,g);}
   g.visible=current.hp>0&&v.hp>0;const pose=presentAgent(g.userData.presentation,v,dt);g.userData.presentation=pose;g.position.set(pose.x,pose.y,pose.z);g.rotation.set(0,pose.yaw,0);remoteAudio(g,v,pose);
   const u=g.userData;u.poseDt=(u.poseDt||0)+dt;u.poseSlot??=poseSlots++;
   if(u.life!==v.life||u.weapon!==v.weapon||poseVisible(pose,poseShadows)||(poseFrame+u.poseSlot)%3===0){const poseDt=Math.min(u.poseDt,.15);u.poseDt=0;
    if(!animateAgent(g,poseDt,pose.speed>.2,v.weapon,pose.speed,{...pose,life:v.life,time:now,reloading:!!v.reload,reloadDuration:WEAPONS[v.weapon].reload,reloadProgress:v.reload?(now-(v.reloadStart||now))/ (WEAPONS[v.weapon].reload*1000):0}))animateOperator(g,poseDt,pose.speed>.2);
   }else if(u.gun?.userData.flash)u.gun.userData.flash.visible=performance.now()<(u.flashUntil||0);const finish=v.finishes?.[v.weapon];if(g.userData.appliedFinish!==finish||g.userData.appliedWeapon!==v.weapon){applyFinish(g.userData.gun,v.weapon,finish);g.userData.appliedFinish=finish;g.userData.appliedWeapon=v.weapon;}dressOperator(g,v.team,v.operator);
  }
  for(const[k,g]of avatars)if(!state.players[k]){releaseAvatar(g);avatars.delete(k);}
  if(t-lastHUD>100){lastHUD=t;hud();}
 }else{
  camera.fov=68;camera.updateProjectionMatrix();const a=reducedMotion.matches?0:t*.000013,shot=MAPS[ACTIVE_MAP].menuCamera;if(shot){
   // Street-level hero shot with a slow sideways dolly; the look point stays fixed so the landmark holds frame.
   const [px,py,pz]=shot.position,[lx,ly,lz]=shot.look,dx=lx-px,dz=lz-pz,len=Math.hypot(dx,dz)||1,sway=Math.sin(a*8)*.7;camera.position.set(px-dz/len*sway,py+Math.sin(a*5)*.08,pz+dx/len*sway);camera.lookAt(lx,ly,lz);}else{camera.position.set(6.4+Math.sin(a)*.35,3.1,16.9);camera.lookAt(-5,4,-5);}
 }
 effects.update(dt);deaths.update(playing?matchNow():0);listenerAudio(t);const sky=mapScene?.userData.atmosphere?.material.uniforms.time;if(sky)sky.value=t/1000;mapScene?.userData.skylife?.update(t/1000);mapScene?.userData.motes?.update(camera,t/1000,renderer.getDrawingBufferSize(drawSize).y);
 if(armory.active){armory.render(innerWidth,innerHeight,dt);return;}
 renderer.autoClear=true;if(postfx?.enabled)postfx.render(scene,camera,dt);else renderer.render(scene,camera);
 if(playing&&gun.visible){renderer.autoClear=false;renderer.clearDepth();renderer.render(handsScene,handsCamera);}
}
requestAnimationFrame(frame);
// Local QA hook (only with ?qa=1): inspect state and aim the camera without pointer lock.
if(qaMode)window.__ob={maps:MAPS,armory,deaths,assets:{createAgent,animateAgent,dressOperator,operatorDebug},get state(){return state;},get scene(){return scene;},handsCamera,get mapScene(){return mapScene;},wallDistance,effects,sfx,viewKick,postfx,renderer,camera,flashLights,smokeFX,inspection,THREE,get rewind(){return lastRewind;},get ping(){return ping;},aim(y,p=0){yaw=y;pitch=p;},holdFlash(seconds=1){shotFlash=seconds;},inspect(){inspection.request(performance.now(),true,selected);},get local(){return local;},get gun(){return gun;},emit:e=>event(e)};
window.addEventListener('resize',()=>{sizeRenderer(renderer,innerWidth,innerHeight,devicePixelRatio,pacing.scale);camera.aspect=handsCamera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();handsCamera.updateProjectionMatrix()});
$('quality').disabled=false;document.querySelectorAll('[data-controls]').forEach(b=>b.disabled=false);
const graphicsLabels={realistic:'GRAFICA: REALISTICA',sharp:'GRAFICA: NITIDA',flat:'GRAFICA: NITIDA · NO OMBRE'};
function applyGraphics(){
 if(postfx)postfx.enabled=graphicsMode==='realistic';const shadows=graphicsMode!=='flat';
 if(renderer.shadowMap.enabled!==shadows){renderer.shadowMap.enabled=shadows;for(const root of [scene,...[...mapScenes.values()].map(v=>v.scene)])root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)m.needsUpdate=true;});}
 $('quality').textContent=graphicsLabels[graphicsMode];try{localStorage.setItem('ob-graphics-v28',graphicsMode);}catch{}
}
$('quality').title='Realistica: occlusione ambientale, bloom fisico e color grading HDR. Nitida: rendering diretto. Risoluzione nativa e antialiasing sempre attivi.';
$('quality').onclick=()=>{const list=GRAPHICS.filter(m=>m!=='realistic'||postfx);graphicsMode=list[(list.indexOf(graphicsMode)+1)%list.length];applyGraphics();};applyGraphics();
function matchOptions(){return {teamSize:Number($('teamsize').value),fillBots:$('fillbots').checked,economy:playlist==='competitive'||$('mode').value==='demolition'&&$('economy').checked,botWeapon:$('botequipment').value,target:Number($('matchtarget').value),...(isRoundMode($('mode').value)?{roundMs:Number($('matchduration').value)}:{durationMs:Number($('matchduration').value)})};}
function showCareer(){$('careerbrief').textContent='LIVELLO '+String(career.level).padStart(2,'0')+' / '+career.data.xp.toLocaleString('it-IT')+' XP · '+career.totalKills+' ELIMINAZIONI';}
function showResult(){
 if(resultHandled!==state.started){resultHandled=state.started;career.complete(state,id);ready=false;clearActions();aim=false;document.exitPointerLock?.();showCareer();}
 const p=state.players[id],other=p.team==='blue'?'orange':'blue',draw=state.score.blue===state.score.orange,won=state.score[p.team]>state.score[other];$('resulttitle').textContent=draw?'PAREGGIO.':won?'VITTORIA.':'SCONFITTA.';
 $('resultsummary').hidden=false;$('resultsummary').textContent=p.kills+' eliminazioni / '+p.deaths+' morti · +'+Math.max(0,career.data.xp-matchStartXP)+' XP · LIVELLO '+career.level;
 $('resultactions').hidden=false;$('rematch').disabled=!host;$('rematch').textContent=host?'RIVINCITA ↗':'IN ATTESA DELL’HOST';$('pause').hidden=true;
}
$('rematch').onclick=()=>{$('board').hidden=true;$('resume').click();};$('exitresults').onclick=cleanup;
function describeMode(){const mode=$('mode').value,rules=modeRules(mode,ACTIVE_MAP),target=$('matchtarget'),duration=$('matchduration');
 target.replaceChildren();for(const v of isRoundMode(mode)?[5,7,9]:[10,20,30,50]){const o=document.createElement('option');o.value=v;o.textContent=v+(isRoundMode(mode)?' round':' eliminazioni');target.append(o);}target.value=rules.target;
 duration.replaceChildren();for(const v of isRoundMode(mode)?[60000,90000,120000]:[300000,480000,600000]){const o=document.createElement('option');o.value=v;o.textContent=isRoundMode(mode)?v/1000+' s / round':v/60000+' minuti';duration.append(o);}duration.value=isRoundMode(mode)?rules.roundMs:rules.durationMs;
 updateModeDescription();
}
function updateModeDescription(){const mode=$('mode').value,target=$('matchtarget').value,seconds=Number($('matchduration').value)/1000,map=MAPS[ACTIVE_MAP],lobby=map.lobby,sites=map.sites?.length||0,time=v=>Math.floor(v/60)+':'+String(v%60).padStart(2,'0');
 $('modedescription').textContent=mode==='demolition'?(map.pool==='wingman'?'Un sito bomba, round rapidi · E tenuto piazza o disinnesca · X flashbang · cambio lato a metà.':'Attacco e difesa su due siti · E tenuto piazza o disinnesca · X flashbang · cambio lato a metà.'):'Tutte le armi · rientro dopo 3 s · vince la squadra che arriva prima a '+target+' eliminazioni.';
 document.querySelector('.paneltop>small').textContent=map.short+' / '+modeLabel(ACTIVE_MAP,mode);
 const facts=mode==='demolition'?['Bomba · '+(sites>1?sites+' siti':'1 sito'),lobby.lanes,'Round '+time(seconds),'Primi a '+target]:['Deathmatch a squadre',lobby.lanes,seconds/60+' minuti','Primi a '+target];
 $('mapfacts').replaceChildren(...facts.map(t=>Object.assign(document.createElement('li'),{textContent:t})));
 document.querySelector('.intro>.eyebrow').textContent=mode==='demolition'?lobby.kicker:'DEATHMATCH · '+lobby.subtitle;syncPlaylist();}
$('mode').onchange=describeMode;for(const key of ['matchtarget','matchduration'])$(key).onchange=updateModeDescription;
function showBotOptions(){if(typeof syncTrainingCard==='function'&&!$('trainingcard').hidden)syncTrainingCard();$('practice').textContent='ALLENATI · '+$('alliedbots').value+($('alliedbots').value==='1'?' ALLEATO + ':' ALLEATI + ')+$('enemybots').value+($('enemybots').value==='1'?' AVVERSARIO':' AVVERSARI');}
for(const key of ['alliedbots','enemybots'])$(key).onchange=showBotOptions;
$('botlevel').value=botDifficulty;$('botlevel').onchange=()=>{botDifficulty=$('botlevel').value;showDifficulty();try{localStorage.setItem('breach-bot-level',botDifficulty);}catch{}};
status(mobileDevice?'Comandi touch · telefono in orizzontale consigliato':'PC e mouse · CTRL accovacciati · SHIFT cammina');showCareer();syncMapModes();describeMode();showBotOptions();startupReady=true;$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=false;mapSelect.disabled=false;$('assetprogress').value=100;sfx.open();$('loading').hidden=true;(window.requestIdleCallback||setTimeout)(()=>sfx.prepare(),{timeout:600});

const preferenceFields=['mode','teamsize','alliedbots','enemybots','botequipment','matchtarget','matchduration'];
// Saved match options belong to the map they were chosen on (Wingman and
// Competitivo have different round lengths and targets).
try{const v=JSON.parse(localStorage.getItem('ob-match-options-v1')||'null');if(v&&v.map===ACTIVE_MAP){if([...$('mode').options].some(o=>o.value===v.mode&&!o.disabled))$('mode').value=v.mode;describeMode();for(const key of preferenceFields)if([...$(key).options].some(o=>o.value===v[key]))$(key).value=v[key];$('fillbots').checked=v.fillbots===true;$('economy').checked=v.economy!==false;updateModeDescription();showBotOptions();}}catch{}
function saveMatchPreferences(){try{if(ACTIVE_MAP==='sahra')localStorage.setItem('ob-sahra-v24','1');const v={map:ACTIVE_MAP,fillbots:$('fillbots').checked,economy:$('economy').checked};for(const key of preferenceFields)v[key]=$(key).value;localStorage.setItem('ob-match-options-v1',JSON.stringify(v));}catch{}}
syncMapModes(false);
for(const key of [...preferenceFields,'fillbots','economy'])$(key).addEventListener('change',saveMatchPreferences);

canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;pauseGame();$('loading').hidden=false;$('loading-message').textContent='La connessione con la GPU è stata interrotta. Ricarica il gioco per ripristinare la grafica.';$('retryload').hidden=false;});
canvas.addEventListener('webglcontextrestored',()=>{$('loading-message').textContent='La GPU è nuovamente disponibile. Ricarica per ripristinare tutte le risorse.';});

// Each map exposes only its curated formats; the first is its showcase mode.
function modeLabel(map,mode){return mode==='demolition'?(MAPS[map].pool==='wingman'?'WINGMAN':'COMPETITIVO'):modeRules(mode).label;}
function syncMapModes(selectDefault=true){
 const map=MAPS[ACTIVE_MAP],big=map.pool==='competitive';
 for(const o of $('mode').options)o.hidden=o.disabled=!mapAllowsMode(ACTIVE_MAP,o.value);
 $('mode').querySelector('[value="demolition"]').textContent=map.pool==='wingman'?'Wingman · bomba, un sito':'Competitivo · bomba, due siti';
 for(const o of $('teamsize').options)if(Number(o.value)>3)o.hidden=o.disabled=!big;
 for(const [key,max]of [['alliedbots',2],['enemybots',3]])for(const o of $(key).options)if(Number(o.value)>max)o.hidden=o.disabled=!big;
 if(!big){if(Number($('teamsize').value)>3)$('teamsize').value='2';if(Number($('alliedbots').value)>2)$('alliedbots').value='1';if(Number($('enemybots').value)>3)$('enemybots').value='2';}
 if(selectDefault){if(big){$('teamsize').value='5';$('alliedbots').value='4';$('enemybots').value='5';}else{$('teamsize').value='2';$('alliedbots').value='1';$('enemybots').value='2';}}
 else if(big&&!localStorage.getItem('ob-sahra-v24')){$('teamsize').value='5';$('alliedbots').value='4';$('enemybots').value='5';}
 showBotOptions();
 if(selectDefault||!mapAllowsMode(ACTIVE_MAP,$('mode').value)){$('mode').value=playlist==='deathmatch'&&mapAllowsMode(ACTIVE_MAP,'deathmatch')?'deathmatch':defaultMode(ACTIVE_MAP);describeMode();}
}
function updateObjectiveHUD(p,now){
 const enabled=objectiveEnabled(state),o=state.objective;$('objectivepanel').hidden=!enabled||!o;$('utilityreadout').hidden=!flashEnabled(state);
 $('utilityreadout').textContent=(touch.enabled?'FLASH × ':'X  FLASH × ')+(p.flashes||0)+(touch.enabled?'  ·  FUMO × ':'  ·  Z  FUMO × ')+(p.smokes||0)+(p.hes?(touch.enabled?'  ·  HE × ':'  ·  G  HE × ')+p.hes:'')+(p.fires?(touch.enabled?'  ·  FUOCO × ':'  ·  H  FUOCO × ')+p.fires:'')+(p.kit?'  ·  KIT':'')+(touch.enabled?'  ·  ISPEZIONE':'  ·  F  ISPEZIONA');
 $('touchhe').hidden=!(p.hes>0);$('touchhe').disabled=now<(p.flashReady||0);$('touchincendiary').hidden=!(p.fires>0);$('touchincendiary').disabled=now<(p.flashReady||0);
 $('touchsmoke').hidden=!flashEnabled(state);$('touchsmoke').disabled=!p.smokes||now<(p.flashReady||0);$('touchsmoke').textContent='FUMO '+(p.smokes||0);
 $('touchflash').hidden=!flashEnabled(state);$('touchflash').disabled=!p.flashes||now<(p.flashReady||0);$('touchflash').textContent='FLASH '+(p.flashes||0);$('touchinteract').hidden=!enabled;$('touchinteract').disabled=state.phase!=='live'||p.hp<=0;
 if(!enabled||!o)return;const attack=p.team===state.attackTeam,carrier=state.players[o.carrierId];
 const single=(MAPS[ACTIVE_MAP].sites||[]).length===1;$('objective-role').textContent=(attack?'ATTACCO':'DIFESA')+' / '+MAPS[ACTIVE_MAP].short;
 let title=attack?(single?'CONQUISTA IL SITO A':'CONQUISTA UN SITO A/B'):(single?'DIFENDI IL SITO A':'DIFENDI I SITI A/B'),detail=attack?(o.carrierId===p.id?(single?'Hai la bomba · raggiungi A e tieni E.':'Hai la bomba · raggiungi A o B e tieni E.'):'Bomba: '+(carrier?.name||'a terra')+' · scorta il portatore.'):'Impedisci il piazzamento. Dopo il piazzamento tieni E vicino alla bomba.';
 if(o.status==='dropped'){title='BOMBA A TERRA';detail=attack?'Raccoglila avvicinandoti.':'Sorveglia la bomba.';}
 if(o.status==='planted'){title='BOMBA PIAZZATA / '+o.site;detail=attack?'Proteggi il sito fino alla detonazione.':'Avvicinati e tieni E per 5 secondi.';}
 if(o.status==='defused'||o.status==='exploded'){title=o.status==='defused'?'BOMBA DISINNESCATA':'BOMBA ESPLOSA';detail='Round concluso';}
 if(o.actorId===id){title=o.status==='planted'?'DISINNESCO IN CORSO':'PIAZZAMENTO IN CORSO';detail='Tieni E · muoverti o rilasciare interrompe l’azione.';}
 $('objective-title').textContent=title;$('objective-detail').textContent=detail;const progress=$('objective-progress');progress.parentElement.hidden=o.actorId!==id;progress.style.width=(o.progress||0)*100+'%';
 $('touchinteract').textContent=o.status==='planted'?'DISINNESCA':'PIANTA';
}

$('visitpoint').onchange=()=>{
 if(!state.preview)return;
 const q=MAPS[ACTIVE_MAP].visits?.[$('visitpoint').value];if(!q||blocked(q[0],q[1]))return;
 const p=state.players[id];if(!p)return;clearActions();p.x=local.x=q[0];p.z=local.z=q[1];p.groundY=local.groundY=groundHeight(p.x,p.z);p.y=jump=local.y=p.groundY;p.yaw=yaw=q[2];p.pitch=pitch=0;jumpV=local.jumpV=local.vx=local.vz=0;localView.reset({...local,life:p.life});
};
