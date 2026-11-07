import {WeaponInspection,useClassicSniperPoses} from './weapon-inspection.js?v=42.0';
import {SmokeThrow} from './utility-throw.js?v=42.0';
import {useLiteWorld} from './horizon.js?v=42.0';
import {objectiveEnabled,flashEnabled,updateObjective,throwFlash,updateFlashes,flashOpacity,botObjectiveOrder,botSmokeTarget,botHeTarget,onObjective,dropBomb,BOMB} from './objective-rules.js?v=42.0';
import {UtilityPresentation} from './utility-presentation.js?v=42.0';
import {applyMapTheme} from './visual-theme.js?v=42.0';
import {InputChannel,cleanInput,clearPulses as clearInputPulses,DriftCorrector,AmmoLedger,DRIFT,PULSES} from './network-input.js?v=42.0';
import {NETWORK_PROTOCOL,ROOM_PREFIX,FAST_LIMIT,NetworkSession,SnapshotMirror,sendPacket,sendFast,openFastChannel,watchConnection,startTicker,encodeFrame,decodeFrame,snapshotSignature,buildDelta,validSnapshot,snapshotForNetwork,snapshotIssue,validPeerId} from './network-session.js?v=42.0';
import {FrameMeter} from './frame-meter.js?v=42.0';
import {FramePacing} from './frame-pacing.js?v=42.0';
import {VARIANTS,variantFor,displayName,shortName,warmVariantMaterials,preloadBaseModels,preloadDesigns,prefetchDesign,useWorldLod,setModelWarm,canvasSource} from './weapon-variants.js?v=42.0';
import {weaponFor,gunOf,botLoadout,designName,designOf,semiOf} from './weapon-stats.js?v=42.0';
import {tickFx,pulseFx,fxTextures,inspectBeats,loadFxMasks,onFxMask} from './weapon-fx.js?v=42.0';
import {Career} from './profile.js?v=42.0';
import {applyFinish,cleanLoadout,cleanFinish,finishKey} from './weapon-finish.js?v=42.0';
import {swingKits} from './weapon-kits.js?v=42.0';
import {missingBots,replaceableBot,nextBotName} from './roster.js?v=42.0';
import {sizeRenderer,filterTextures} from './render-quality.js?v=42.0';
import {recordKill,KillLedger} from './kill-events.js?v=42.0';
import {JUMP,stepJump,stepStance,eyeHeight,LocalPresentation,WeaponSwitch,crosshairGap} from './player-feel.js?v=42.0';
import {viewMotion} from './view-motion.js?v=42.0';
import {PostFX,supportsPostFX} from './postfx.js?v=42.0';
import {realizeWorld,realizeEnvironment} from './realism.js?v=42.0';
import {AudioEngine} from './audio-engine.js?v=42.0';
import {ViewKick} from './view-kick.js?v=42.0';
import {footSurface} from './surfaces.js?v=42.0';
const frameMeter=new FrameMeter();let metricsAt=0;const firstPersonMotion={};let viewOffsets={};
// V33 frame pacing: the render scale settles where this device holds its display rate; the
// settled step is remembered so the next session starts there instead of stuttering down to it.
let pacingStart=0;try{pacingStart=Math.max(0,(Number(localStorage.getItem('ob-render-step-v42'))||0)-1);localStorage.removeItem('ob-render-step');}catch{}
const pacing=new FramePacing({start:pacingStart});
import * as THREE from './vendor/three.module.js';
import {createWorld,createWeapon,animateWeapon,createOperator,animateOperator} from './graphics.js?v=42.0';
import {Armory} from './armory.js?v=42.0';
import {preloadAssets,useMobileAssets,useTouchViewmodels,useClassicSniper,operatorGearParts,createDisplayWeapon,createArmedModel,createAgent,animateAgent,animateViewmodel,flashAgent,reactAgent,disposeAgent,prepareAgentEquipment,dressOperator,operatorDebug,loadArmour,armourWarmParts,onBodyReady} from './assets.js?v=42.0';
import {cleanOperator,botOperator} from './operator-kits.js?v=42.0';
import {WEAPONS,WALLS,SPAWNS,MAPS,ACTIVE_MAP,BOUNDS,configureMap,chooseTeam,blocked,move,wallDistance,groundHeight} from './shared.js?v=42.0';
import {botInput,resetBots,resetBot,hearBotShot,BOT_LEVELS} from './navigation.js?v=42.0';
import {CombatFX,createFlashLights,dressMuzzleFlash} from './combatfx.js?v=42.0';
import {BASE_FOV,scopeFov,mouseGain,ControlsPanel} from './controls.js?v=42.0';
import {presentAgent,presentLag} from './agent-motion.js?v=42.0';
import {mixShot} from './audio-mix.js?v=42.0';
import {SimulationClock} from './simulation-clock.js?v=42.0';
import {SnapshotBuffer} from './snapshots.js?v=42.0';
import {resetCombat,stepMovement,stepBotMovement,shotParameters,traceShot,applyHit,applyBlast,sprayOffset,CAMERA_RECOIL,recoilAt,recoilIndex,accuracyFor,traceMelee,equipWeapon,canAttack,mayAttack,nextReady,scopeSettle,SCOPE_LEAD_MS} from './combat-rules.js?v=42.0';
import {createMatch,updateMatch,canAct,canMove,resetForRematch,isRoundMode,mapAllowsMode,defaultMode,teamName,modeRules,matchRules,isRespawnMode,allowedWeapons,weaponAllowed} from './match-rules.js?v=42.0';
import {addKillFeed,weaponIcon,weaponName} from './kill-feed.js?v=42.0';
import {Radar,spottedEnemies} from './radar.js?v=42.0';
import {CrosshairEditor} from './crosshair.js?v=42.0';
import {ECONOMY,economyOn,ownsWeapon,canBuyNow,buyWindowOpen,buyWindowLeft,inBuyZone,buy as buyItem,sell as sellItem,applyCarry,give,armedFinish,pinArms,slotItem,corsaWeapon,corsaNeeded,corsaKill,CORSA_LADDER} from './economy.js?v=42.0';
import {throwUtility,updateFires,WEAPON_HE,WEAPON_FIRE} from './blast-rules.js?v=42.0';
import {dropWeapon,updatePickups,dropNear} from './pickups.js?v=42.0';
import {syncSmokes,throwSmoke,insideSmoke,smokeBlocks,SMOKE,SMOKE_TINTS,cleanTint} from './smoke-rules.js?v=42.0';
import {BuyMenu} from './buy-menu.js?v=42.0';
import {mountLoadout} from './loadout-panel.js?v=42.0';
import {SmokeFX,BlastFX,FireFX} from './smoke-fx.js?v=42.0';
import {recordPositions,rewoundPlayers,clearHistory,rewindMs,rewindFloor,VIEW_DELAY_MS} from './lag-compensation.js?v=42.0';
import {createSkylife} from './skylife.js?v=42.0';
import {streetClock} from './street-props.js?v=42.0';
import {buildProbe} from './surface-probe.js?v=42.0';
import {scoreboardHTML,rosterHTML} from './scoreboard.js?v=42.0';
import {DeathPresentation} from './death-presentation.js?v=42.0';
import {prefersTouch,requestMouseLock,TouchControls} from './touch-controls.js?v=42.0';
import {takeoverIssue,takeOver,releaseTakeover} from './takeover-rules.js?v=42.0';
const $=s=>document.getElementById(s),canvas=$('game'),career=new Career(),sfx=new AudioEngine(),qaMode=new URLSearchParams(location.search).get('qa')==='1';
const mobileDevice=prefersTouch({coarse:matchMedia('(pointer:coarse)').matches,anyCoarse:matchMedia('(any-pointer:coarse)').matches,maxTouchPoints:navigator.maxTouchPoints||0})||new URLSearchParams(location.search).get('touch')==='1';
document.documentElement.classList.toggle('touch-mode',mobileDevice);
$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=true;
if(mobileDevice)useMobileAssets(),useTouchViewmodels(),useWorldLod(),useLiteWorld();
// Every finished file moves the card, so a slow connection never looks stuck.
THREE.DefaultLoadingManager.onProgress=(url,done,total)=>{if($('loading').hidden)return;const bar=$('assetprogress');if(bar.hasAttribute('value'))bar.value=Math.max(bar.value,95*done/total);$('loading-message').textContent=$('loading-message').textContent.split(' · ')[0]+' · '+done+'/'+total+' file';};
status('Preparo armi e operatori…');
// V42: the OB-510 AVERLA's model and light mask load with the rigs, so every rig, drop and body is built with it.
const [assetFailures]=await Promise.all([preloadAssets((n,total)=>{status('Preparo armi e operatori · '+n+'/'+total);$('assetprogress').value=n/total*60}),preloadBaseModels(),loadFxMasks()]);

status('Preparazione architettura…');
// V44: the cargo pods and their wayfinding atlas were preloaded for every match, but no map places them any more
// (forge.js never calls placeArchitecture): the game no longer downloads them at all.
$('assetprogress').value=Math.max(75,$('assetprogress').value);
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})}catch(e){$('status').textContent='WebGL non disponibile: prova Chrome o Edge con accelerazione grafica.';$('loading-message').textContent='WebGL non disponibile. Prova un browser con accelerazione grafica.';throw e}
// Shader logs are read synchronously on each program's first draw; QA keeps them, play skips the stall.
renderer.debug.checkShaderErrors=qaMode;
// Phones stop at 2x: DPR 3 costs 2.25 times the pixels for a difference nobody sees at that distance.
const viewDpr=()=>mobileDevice?Math.min(devicePixelRatio,2):devicePixelRatio;
sizeRenderer(renderer,innerWidth,innerHeight,viewDpr(),pacing.scale);
pacing.onChange=p=>{sizeRenderer(renderer,innerWidth,innerHeight,viewDpr(),p.scale);try{localStorage.setItem('ob-render-step-v42',String(p.step));}catch{}if(qaMode)console.log('frame pacing',p.describe());};
// REALISTICA renders the arena through the HDR pipeline; NITIDA keeps direct rendering.
const postfx=supportsPostFX(renderer)?new PostFX(renderer):null,GRAPHICS=['realistic','sharp','flat'];
let graphicsMode=mobileDevice||!postfx?'flat':'realistic';try{const saved=localStorage.getItem('ob-graphics-v28');if(GRAPHICS.includes(saved)&&(saved!=='realistic'||postfx))graphicsMode=saved;}catch{}
if(postfx)postfx.enabled=graphicsMode==='realistic';
renderer.shadowMap.enabled=graphicsMode!=='flat';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
const scene=new THREE.Scene();
// The arena never moves after it is built: its matrices are composed once instead of every frame (about 700 objects on
// Sahra). The scenes themselves stay at the origin, so a frozen parent no longer forces every child to recompute either;
// anything that moves (players, effects, the death poses until they settle) keeps updating itself as before.
scene.matrixAutoUpdate=false;
function freezeArena(world,root){if(root.userData.frozen)return;root.userData.frozen=true;world.matrixAutoUpdate=false;world.updateMatrixWorld(true);root.traverse(o=>{if(o.isLight||o.isCamera||o.isPoints||o.isSprite||o.isSkinnedMesh||o.isBone||o.userData.dynamic)return;o.matrixAutoUpdate=false;});}
const camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.05,200),flashLights=createFlashLights(),viewKick=new ViewKick();
camera.rotation.order='YXZ';scene.add(camera);
let startupReady=false,offField=()=>false;
const mapScenes=new Map();let mapScene=null,mapRoot=null,lastGoodMap='sahra',mapLoadEpoch=0,mapChanged=()=>{};
// Direction toward the arena's sun: light shafts and smoke shading follow it.
const arenaSun=new THREE.Vector3(-.5,.7,-.5).normalize();let surfaceProbe=null,probeReady=null;
const mapSelect=$('mapselect');
// One draw of the whole arena with culling off while it loads, so the first match frame does not
// link programs or build shadow variants for meshes the lobby camera never saw (~115 ms on Sahra).
function warmArena(){const culled=[];mapScene.traverse(o=>{if(o.frustumCulled){o.frustumCulled=false;culled.push(o);}});try{renderer.autoClear=true;if(postfx?.enabled)postfx.render(scene,camera,0);else renderer.render(scene,camera);}finally{for(const o of culled)o.frustumCulled=true;}}
// Alpha-to-coverage writes its alpha to the canvas, which the page would show through. Postfx ends on an opaque pass.
function sealCanvasAlpha(){const color=renderer.state.buffers.color,gl=renderer.getContext();color.setMask(true);color.setClear(0,0,0,1);gl.colorMask(false,false,false,true);gl.clear(gl.COLOR_BUFFER_BIT);gl.colorMask(true,true,true,true);}
// Phones keep one arena: the others are rebuilt on return. A dispose only frees the GPU copy, so anything
// shared with the next arena is left alone and anything missed here would just upload again.
function releaseMap(key,next){const entry=mapScenes.get(key);if(!entry)return;const kept=new Set();
 const each=(root,fn)=>root.traverse(o=>{if(o.geometry)fn(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){fn(m);for(const t of Object.values(m))if(t?.isTexture)fn(t);}});
 each(next,x=>kept.add(x));const old=new Set();each(entry.scene,x=>{if(!kept.has(x))old.add(x);});for(const x of old)x.dispose();
 entry.scene.traverse(o=>{if(o.isInstancedMesh||o.isLight)o.dispose();});for(const t of [entry.scene.environment,entry.scene.background])if(t?.isTexture&&t!==next.environment&&t!==next.background)t.dispose();
 // Reflection captures are render targets: disposing their texture alone leaves the target allocated.
 entry.scene.userData.atmosphere?.environment.dispose();entry.root.userData.environment?.dispose();mapScenes.delete(key);}
async function loadMap(mapId){
 const key=Object.hasOwn(MAPS,mapId)?mapId:'sahra',run=++mapLoadEpoch;mapSelect.disabled=true;
 try{
 $('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=true;status('Caricamento '+(MAPS[key].short||MAPS[key].title.split(' /')[0])+'…');configureMap(key);camera.far=key==='sahra'?450:key==='caldera'?340:mobileDevice?200:330;camera.updateProjectionMatrix();resetBots();
 const fresh=!mapScenes.has(key)&&startupReady;
 // A first visit builds the whole district synchronously (up to ~3.5 s): say so on the
 // loading card instead of freezing the lobby on its last frame.
 if(fresh){$('loading').classList.remove('leaving');$('loading').hidden=false;$('loading-message').textContent='Costruzione di '+MAPS[key].title+'…';$('assetprogress').removeAttribute('value');$('retryload').hidden=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(run!==mapLoadEpoch)return false;}
 if(!mapScenes.has(key)){
  const world=new THREE.Scene();const build=key==='forge'?(await import('./forge.js?v=42.0')).createForge:key==='caldera'?(await import('./caldera.js?v=42.0')).createCaldera:(await import('./sahra.js?v=42.0')).createSahra;
  if(run!==mapLoadEpoch)return false;configureMap(key);const root=build(world,renderer);realizeWorld(world,key,{lamps:!mobileDevice});createSkylife(world,key);if(mobileDevice)world.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.mapSize.set(1024,1024);});
  mapScenes.set(key,{scene:world,root,ready:Promise.resolve(root.userData.ready).then(()=>{const t0=performance.now();mapScenes.get(key).probe=buildProbe(root);if(qaMode)console.log('surface probe',key,Math.round(performance.now()-t0)+' ms');})});
 }
 const loaded=mapScenes.get(key);await loaded.ready;freezeArena(loaded.scene,loaded.root);realizeEnvironment(loaded.scene,key);loaded.scene.add(flashLights.local,flashLights.remote);if(run!==mapLoadEpoch)return false;
 // Compile and upload the new arena while its loading state is visible.
 filterTextures(loaded.scene,renderer.capabilities.getMaxAnisotropy());const uploaded=new Set();loaded.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)for(const t of Object.values(m))if(t?.isTexture&&!t.isRenderTargetTexture&&!uploaded.has(t)){uploaded.add(t);renderer.initTexture(t);}});if(postfx?.enabled)await postfx.compile(loaded.scene,camera);else if(renderer.compileAsync)await renderer.compileAsync(loaded.scene,camera);if(run!==mapLoadEpoch)return false;
 configureMap(key);sfx.setMap(key);if(mapScene)scene.remove(mapScene);const leaving=mobileDevice&&mapScene&&mapScene!==loaded.scene?lastGoodMap:null;mapScene=loaded.scene;{let sun=null;mapScene.traverse(o=>{if(!sun&&o.isDirectionalLight&&o.castShadow)sun=o;});if(sun){arenaSun.copy(sun.position).normalize();postfx?.setSun(arenaSun);}}mapScene.add(flashLights.local,flashLights.remote);mapRoot=loaded.root;lastGoodMap=key;scene.add(mapScene);surfaceProbe=loaded.probe||null;probeReady?.();filterTextures(mapScene,renderer.capabilities.getMaxAnisotropy());
 scene.environment=mapScene.environment;scene.environmentIntensity=mapScene.environmentIntensity;scene.background=mapScene.background;scene.fog=mapScene.fog;if(leaving)releaseMap(leaving,mapScene);warmArena();if(startupReady){await warmCombatants();if(run!==mapLoadEpoch)return false;}mapSelect.value=key;
 $('mapdescription').textContent=MAPS[key].description;$('mapoverview').hidden=key!=='sahra';document.title='ORECCHIONI BATTLE — '+MAPS[key].title;
 document.querySelector('.pausebox>.eyebrow').textContent=MAPS[key].title;document.documentElement.dataset.map=key;renderer.toneMappingExposure=applyMapTheme(document.documentElement,key).exposure;postfx?.setGrade(key);
 for(const b of document.querySelectorAll('.map-cards button[data-map]'))b.setAttribute('aria-pressed',String(b.dataset.map===key));
 const lobby=MAPS[key].lobby;$('maptitle').innerHTML=lobby.name+' <i>'+lobby.code+'</i>';$('maptagline').textContent=lobby.tagline;
 document.querySelector('footer>span:first-child').innerHTML='<b>'+MAPS[key].title+'</b> &nbsp; / &nbsp; '+lobby.subtitle;
 $('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=!startupReady;mapSelect.disabled=!startupReady;mapChanged();syncMapModes();
 status(assetFailures?'Alcuni modelli non sono disponibili. Ricarica per riprovare.':mobileDevice?'Comandi touch · consigliato telefono in orizzontale':'PC e mouse · rotella cambia arma · Q ultima arma');
 if(fresh){$('assetprogress').value=100;revealGame();}
 try{localStorage.setItem('orecchioni-map',key);}catch{}const pageURL=new URL(location.href);pageURL.searchParams.set('map',key);history.replaceState(null,'',pageURL.pathname+pageURL.search);return true;
 }catch(e){if(startupReady){$('assetprogress').value=100;$('loading').hidden=true;}if(run!==mapLoadEpoch)return false;configureMap(lastGoodMap);mapSelect.value=lastGoodMap;mapScenes.delete(key);mapSelect.disabled=false;$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=!mapRoot;throw e;}
}
// Playlists first: each one picks the mode and its map pool.
const PLAYLISTS={squadra:{mode:'demolition',maps:['sahra']},binomio:{mode:'demolition',maps:['caldera']},deathmatch:{mode:'deathmatch',maps:['sahra','caldera','forge']},corsa:{mode:'corsa',maps:['sahra','caldera','forge']}};
let playlist='squadra';
const playlistFor=(map,mode)=>mode==='deathmatch'||mode==='corsa'?mode:MAPS[map].pool==='binomio'?'binomio':'squadra';
function syncPlaylist(){playlist=playlistFor(ACTIVE_MAP,$('mode').value);{const box=$('economy');box.disabled=playlist!=='binomio';if(playlist==='squadra')box.checked=true;box.closest('label').hidden=playlist==='deathmatch'||playlist==='corsa';}for(const b of document.querySelectorAll('.playlists [data-playlist]'))b.setAttribute('aria-checked',String(b.dataset.playlist===playlist));for(const b of document.querySelectorAll('.map-cards button[data-map]'))b.classList.toggle('outside',!PLAYLISTS[playlist].maps.includes(b.dataset.map));}
// Each map card shows the real walkable plan of its map, drawn from the shared data.
function planSVG(map){const b=map.bounds;let body='';
 if(map.walk)for(const [x0,x1,z0,z1]of map.walk)body+=`<rect x="${x0}" y="${z0}" width="${x1-x0}" height="${z1-z0}"/>`;
 else{body=`<rect x="${-b.x}" y="${-b.z}" width="${b.x*2}" height="${b.z*2}"/>`;for(const w of map.walls)body+=`<rect class="solid" x="${w[0]-w[2]/2}" y="${w[1]-w[3]/2}" width="${w[2]}" height="${w[3]}"/>`;}
 for(const s of map.sites||[])body+=`<circle class="site" cx="${s.x}" cy="${s.z}" r="${s.radius}"/>`;
 return `<svg viewBox="${-b.x} ${-b.z} ${b.x*2} ${b.z*2}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;}
for(const el of document.querySelectorAll('.plan[data-plan]'))el.innerHTML=planSVG(MAPS[el.dataset.plan]);
let chosenMap=new URLSearchParams(location.search).get('map');try{chosenMap??=localStorage.getItem('orecchioni-map');}catch{}
// The squadra map is the first impression.
await loadMap(chosenMap||'sahra');
for(const b of document.querySelectorAll('.playlists [data-playlist]'))b.onclick=async()=>{if(playing||mapSelect.disabled)return;const next=PLAYLISTS[b.dataset.playlist];playlist=b.dataset.playlist;try{if(!next.maps.includes(ACTIVE_MAP))await loadMap(next.maps[0]);}catch(e){error('Mappa non disponibile: '+e.message);return;}$('mode').value=next.mode;describeMode();$('mode').dispatchEvent(new Event('change'));};
// Lobby views: GIOCA (online rooms) and ALLENAMENTO (local match against bots).
// The training card drives the same selects and buttons the online panel uses.
function showLobbyView(view){
 const panel=document.querySelector('#menu .panel');panel.dataset.view=view;$('trainingcard').hidden=view!=='training';
 $('navplay').setAttribute('aria-current',view==='play'?'page':'false');$('navtraining').setAttribute('aria-current',view==='training'?'page':'false');
 document.querySelector('.paneltop>span').textContent=view==='training'?'ALLENAMENTO CON BOT':'GIOCA CON GLI AMICI';
 if(view==='training'){syncTrainingCard();(matchMedia('(max-width:700px)').matches?$('trainingcard'):panel).scrollIntoView({block:matchMedia('(max-width:700px)').matches?'start':'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}
}
function syncTrainingCard(){
 $('alliesout').value=$('alliesout').textContent=$('alliedbots').value;$('enemiesout').value=$('enemiesout').textContent=$('enemybots').value;
 for(const b of document.querySelectorAll('.stepper button')){const select=$(b.dataset.step),open=[...select.options].filter(o=>!o.disabled).map(o=>o.value),at=open.indexOf(select.value);b.disabled=at+Number(b.dataset.dir)<0||at+Number(b.dataset.dir)>=open.length;}
 for(const b of document.querySelectorAll('.levels [data-level]'))b.setAttribute('aria-checked',String(b.dataset.level===botDifficulty));
 const weapon=$('trainweapon');if(!weapon.options.length)weapon.append(...[...$('botequipment').options].map(o=>new Option(o.textContent,o.value)));weapon.value=$('botequipment').value;
}
$('navplay').onclick=()=>showLobbyView('play');
$('navtraining').onclick=()=>showLobbyView('training');$('gotraining').onclick=()=>showLobbyView('training');
for(const b of document.querySelectorAll('.stepper button'))b.onclick=()=>{const select=$(b.dataset.step),open=[...select.options].filter(o=>!o.disabled).map(o=>o.value),next=open[open.indexOf(select.value)+Number(b.dataset.dir)];if(next===undefined)return;select.value=next;select.dispatchEvent(new Event('change'));syncTrainingCard();};
for(const b of document.querySelectorAll('.levels [data-level]'))b.onclick=()=>{$('botlevel').value=b.dataset.level;$('botlevel').dispatchEvent(new Event('change'));syncTrainingCard();};
$('trainweapon').onchange=()=>{$('botequipment').value=$('trainweapon').value;$('botequipment').dispatchEvent(new Event('change'));};
$('starttraining').onclick=()=>$('practice').click();$('trainingexplore').onclick=()=>$('explore').click();
// Start and visit buttons follow the availability of the panel's own buttons.
for(const [source,target]of [['practice','starttraining'],['explore','trainingexplore']]){const copy=()=>{$(target).disabled=$(source).disabled;};copy();new MutationObserver(copy).observe($(source),{attributes:true,attributeFilter:['disabled']});}
for(const b of document.querySelectorAll('.map-cards button[data-map]'))b.onclick=()=>{if(!playing&&!mapSelect.disabled)loadMap(b.dataset.map).catch(e=>error('Mappa non disponibile: '+e.message));};
mapSelect.onchange=()=>loadMap(mapSelect.value).catch(e=>{console.error(e);status('Mappa non disponibile. Riprova la selezione.');});
// V42 review: a dropped weapon wears its owner's paint. Guests only hear of the finish a player holds, so the last one
// seen per player and weapon is kept; null is the factory finish (the shared factory drop).
const seenFinishes=new Map(),factoryKeys=new Map();
// V42 b5: a drop wears its owner's finish on the design it was paid as (d.model, economy.js).
// A drop with no owner left, or whose owner's paint is not known, still wears its design. Memoised per drop, so the
// drop's look key stays the same object frame after frame.
const dropFinishes=new WeakMap();
function dropFinish(d){const f=d.by===id?career.data.finishes?.[d.weapon]:state.players[d.by]?.finishes?.[d.weapon]??seenFinishes.get(d.by)?.[d.weapon];if(!d.model||(f?.model||'stock')===d.model)return f;const c=dropFinishes.get(d);if(c&&c.from===f)return c.look;const look={...(f||{}),model:d.model,build:null};dropFinishes.set(d,{from:f,look});return look;}
function dropLook(w,f){if(!f||!(w>=1&&w<=4))return null;const finish=cleanFinish(f,w),key=finishKey(finish);if(!factoryKeys.has(w))factoryKeys.set(w,finishKey(cleanFinish(null,w)));return key===factoryKeys.get(w)?null:{finish,key};}
const effects=new CombatFX(scene),deaths=new DeathPresentation(scene),utilities=new UtilityPresentation(scene,{dropSource:(w,f)=>{const g=createDisplayWeapon(w,true);if(g&&f)applyFinish(g,w,f);return g;},dropLook:d=>dropLook(d.weapon,dropFinish(d)),handOf:owner=>{const g=avatars.get(owner);if(!g?.visible)return null;const h=g.userData.throwHand;return h&&Number.isFinite(h.x)?h:true;}});effects.lights=flashLights;utilities.viewer=camera;{const at=new THREE.Vector3();deaths.onImpact=item=>{const c=item.contact.position;for(const [f,size,o]of [[.35,.5,.3],[1,.75,.22]]){at.set(item.body.position.x+(c.x-item.body.position.x)*f,c.y+.08,item.body.position.z+(c.z-item.body.position.z)*f);effects.puff(at,{size,grow:.9,life:.85,opacity:o,rise:.12,drag:3});}};}probeReady=()=>effects.setProbe(surfaceProbe);probeReady();
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
const handsFlash=new THREE.PointLight(0xffc48a,0,2.2,2);handsFlash.position.set(.2,-.08,-.9);handsScene.add(handsFlash);const FLASH_SCALE=[1,1.1,1.55,1.3,1.9,1];
const inspection=new WeaponInspection(),smokeThrow=new SmokeThrow(),throwPose={pin:1,throw:0,lob:false,cook:0};let smokePower=1,throwJump=false,throwRig=false;
// V42 b3: a design's model (and its light mask) arriving after start-up is prepared before any root wears it: its
// textures go to the GPU, its view tier links under the hands lights and its world tier under the arena's. The world
// copies stay in `designProxies`, which every combat warm (a new map, a graphics change) links again.
const designProxies=new THREE.Group();designProxies.name='Design proxies';
// (b56 rev) A mask arriving in play goes up in bands of 256 rows, one a frame: its whole bitmap in one call (2048², RGBA)
// waited 90-100 ms for a busy GPU queue to drain. Storage is allocated first (no pixels), then filled band by band
// with raw calls (copyTextureToTexture reads the unpack state back with getParameter: a 80-90 ms sync on a busy GPU).
const MASK_ROWS=64;onFxMask(async t=>{const img=t.image,max=Math.max(img?.width||0,img?.height||0);
 if(!startupReady||!renderer.capabilities.isWebGL2||typeof ImageBitmap==='undefined'||!(img instanceof ImageBitmap)||img.height<=MASK_ROWS||max>renderer.capabilities.maxTextureSize){renderer.initTexture(t);return;}
 t.source.dataReady=false;try{renderer.initTexture(t);}finally{t.source.dataReady=true;}
 for(let y=0;y<img.height;y+=MASK_ROWS){await new Promise(r=>{requestAnimationFrame(r);setTimeout(r,100);});const gl=renderer.getContext(),tex=renderer.properties.get(t).__webglTexture;if(!tex)return;renderer.state.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,y);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,y,img.width,Math.min(MASK_ROWS,img.height-y),gl.RGBA,gl.UNSIGNED_BYTE,img);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);if(y+MASK_ROWS>=img.height)gl.generateMipmap(gl.TEXTURE_2D);}});
setModelWarm(async(model,worldOf)=>{const view=new THREE.Group(),world=new THREE.Group(),seen=new Set();
 model.traverse(o=>{if(!o.isMesh)return;const mats=[].concat(o.material);view.add(new THREE.Mesh(o.geometry,o.material));const w=new THREE.Mesh(o.geometry,Array.isArray(o.material)?mats.map(m=>worldOf.get(m)||m):worldOf.get(o.material)||o.material);w.castShadow=w.receiveShadow=true;world.add(w);
  for(const m of mats)for(const t of Object.values(m))if(t?.isTexture)seen.add(t);});
 // V43 b56: the filtering the rig applies when shown (buildGun) is set before the upload: a later change of anisotropy
 // re-uploaded every texture into a second GPU copy in the frame of the purchase (4 × 2048², 30-40 ms each). After the
 // start-up each texture goes up in a frame of its own, so a design loading in play costs one upload a frame, not all.
 filterTextures(model,renderer.capabilities.getMaxAnisotropy());
 for(const t of seen){canvasSource(t);renderer.initTexture(t);if(startupReady)await new Promise(r=>{requestAnimationFrame(r);setTimeout(r,100);});}
 for(const g of [view,world])g.traverse(o=>{o.frustumCulled=false;});
 // The hands pass draws to the screen: link under no render target even when an arena warm (postfx) holds one meanwhile
 // (its colour space and tone mapping are part of the program; a pending postfx compile left the bowie's linked wrong).
 if(renderer.compileAsync){const held=renderer.getRenderTarget();renderer.setRenderTarget(null);const job=renderer.compileAsync(view,handsCamera,handsScene);renderer.setRenderTarget(held);await job;}
 if(postfx?.enabled)await postfx.compile(world,camera,scene);else if(renderer.compileAsync)await renderer.compileAsync(world,camera,scene);
 // V42 b5 review: one offscreen draw of each tier as well. A program is only finished on its first use (three.js checks it
 // then, and that check waited 45 ms for the driver), so the first frame showing a design bought mid-round must not be it.
 // The arena draw is a whole scene: only off the field, where the designs on sale load (preloadDesigns(offField), at the end
 // of the start-up): in the lobby, once it has been open 4 s, so a quick start is not slowed. Each file costs a long frame
 // or two, so none starts in a match (the buy menu included: 3-4 of them there showed as 76 ms frames). A design bought
 // before its turn loads then, as any design did before.
 // V43 b56: with one texture a frame a file no longer costs a long frame, so the lobby wait is 1.5 s and a match lends its
 // dead moments too (round result, waiting to respawn, buy menu closed); the buy menu loads a design pointed at.
 {const held=renderer.getRenderTarget(),clear=renderer.autoClear;renderer.autoClear=false;
  try{handsScene.add(view);renderer.setRenderTarget(null);renderer.setScissorTest(true);renderer.setScissor(0,0,1,1);renderer.render(handsScene,handsCamera);handsScene.remove(view);
   if(offField()){scene.add(world);if(postfx?.enabled){renderer.setScissorTest(false);const tiny=new THREE.WebGLRenderTarget(4,4);renderer.setRenderTarget(tiny);renderer.render(scene,camera);renderer.setRenderTarget(null);tiny.dispose();}else renderer.render(scene,camera);}}
  finally{handsScene.remove(view);scene.remove(world);renderer.setScissorTest(false);renderer.autoClear=clear;renderer.setRenderTarget(held);}}
 for(const o of [...world.children])designProxies.add(o);});
const weaponSwitch=new WeaponSwitch(3),localView=new LocalPresentation();let selected=3,displayed=3,gun,muzzle;const weaponCache=new Map();
function buildGun(index=selected,lower=0){displayed=index;if(gun)handsScene.remove(gun);const classic=index===4&&myFinish(4)?.model==='classico',slot=classic?'4c':index;if(index===4)useClassicSniperPoses(classic);if(!weaponCache.has(slot)){useClassicSniper(classic);weaponCache.set(slot,createArmedModel(index)||createWeapon(index));useClassicSniper(false);}gun=weaponCache.get(slot);gun.position.copy(gun.userData.hip||new THREE.Vector3(.24,-.205,-.38));gun.position.y-=lower*.30;gun.position.z+=lower*.09;gun.rotation.set(lower*.45,0,-lower*.15);applyFinish(gun.userData.knife||gun.userData.gun||gun,index,myFinish(index));filterTextures(gun,renderer.capabilities.getMaxAnisotropy());handsScene.add(gun);muzzle=gun.userData.flash;}
buildGun();
// Build the six inventory rigs and compile their shared shader variants before
// entering a match, so a first weapon change does not clone a rig mid-frame.
$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=true;mapSelect.disabled=true;status('Preparazione equipaggiamento…');
for(let index=0;index<WEAPONS.length;index++){if(!weaponCache.has(index))weaponCache.set(index,createArmedModel(index)||createWeapon(index));const rig=weaponCache.get(index);if(index!==5)dressMuzzleFlash(rig.userData.flash,FLASH_SCALE[index]);applyFinish(rig.userData.knife||rig.userData.gun||rig,index,myFinish(index));utilities.prepareDrop(index,dropLook(index,career.data.finishes[index]));filterTextures(rig,renderer.capabilities.getMaxAnisotropy());handsScene.add(rig);}
if(renderer.compileAsync)await renderer.compileAsync(handsScene,handsCamera);
// Upload every rig's textures now: with the economy a round opens on the pistol, and its
// atlas uploading on the first match frame cost ~90 ms.
{const uploaded=new Set(fxTextures());for(const t of uploaded)renderer.initTexture(t);handsScene.traverse(o=>{if(o.userData.variantHidden)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)for(const t of Object.values(m))if(t?.isTexture&&!uploaded.has(t)){uploaded.add(t);renderer.initTexture(t);}});}
// V42 b5 review: and draw them all once, one pixel: three.js finishes a program on its first use, and a rig first shown
// mid-round (the SMG bought in the buy phase) waited 45 ms on that check.
{const clear=renderer.autoClear;renderer.autoClear=false;renderer.setScissorTest(true);renderer.setScissor(0,0,1,1);try{renderer.render(handsScene,handsCamera);}finally{renderer.setScissorTest(false);renderer.autoClear=clear;}}
for(const model of weaponCache.values())if(model!==gun)handsScene.remove(model);
// V43 b56: the AVERLA CLASSICO rig ('4c') was built and linked in the frame of its purchase (a 75-95 ms wait on the program
// check). The lobby's first idle moment builds it as buildGun would, compiles it under the hands lights and draws it once.
async function warmClassicRig(){if(weaponCache.has('4c'))return;
useClassicSniper(true);let rig;try{rig=createArmedModel(4)||createWeapon(4);}finally{useClassicSniper(false);}if(!rig)return;weaponCache.set('4c',rig);
 applyFinish(rig.userData.knife||rig.userData.gun||rig,4,{...career.data.finishes[4],model:'classico'});filterTextures(rig,renderer.capabilities.getMaxAnisotropy());
 rig.traverse(o=>{if(o.userData.variantHidden)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)for(const t of Object.values(m))if(t?.isTexture){canvasSource(t);renderer.initTexture(t);}});
 if(renderer.compileAsync){const held=renderer.getRenderTarget();renderer.setRenderTarget(null);const job=renderer.compileAsync(rig,handsCamera,handsScene);renderer.setRenderTarget(held);await job;}
 if(rig===gun)return;const held=renderer.getRenderTarget(),clear=renderer.autoClear;handsScene.add(rig);renderer.autoClear=false;renderer.setRenderTarget(null);renderer.setScissorTest(true);renderer.setScissor(0,0,1,1);
 try{renderer.render(handsScene,handsCamera);}finally{renderer.setScissorTest(false);renderer.autoClear=clear;renderer.setRenderTarget(held);if(rig!==gun)handsScene.remove(rig);}}
$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=!startupReady;mapSelect.disabled=!startupReady;
status(mobileDevice?'Comandi touch · consigliato telefono in orizzontale':'PC e mouse · rotella cambia arma · Q ultima arma');
const kills=new KillLedger();
const avatars=new Map(),throwsBy=new Map(),clock=new SimulationClock(),snapshots=new SnapshotBuffer(100);
let lastSnapshotAt=performance.now(),localLife=0,botSerial=0,matchStartXP=career.data.xp,resultHandled=null;
// A guest extrapolates a tick or two, never further: a silent host stops the timer instead of running it away.
function matchNow(){return host?clock.time:(state.now??state.started)+Math.min(250,Math.max(0,performance.now()-lastSnapshotAt));}
// The host time of the bodies on screen in the last frame drawn: what a click is aimed at, so what lag compensation rewinds to.
function viewClock(){return performance.now()-seenWall<250?seenAt:matchNow()-(host?0:VIEW_DELAY_MS);}
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
// V34: plus one operator holding the service pistol, whose merged frame and slide buffers (see
// agentWeapon in assets.js) nothing else here draws; pooled operators hold theirs offstage.
status('Preparazione scena…');deaths.warm();
// V42: every combatant program, under the lights of the arena on stage: all pooled rigs, every kit piece, bodies,
// drops and effects. Gear never compiled before, and a new arena's light count changes every variant. One offscreen
// draw also builds the shadow-depth variants, bone textures and buffers. Nothing here may link in play.
const warmSet={};
// One warm at a time: a Graphics click during a map load must not steal the pool from the running one.
let warmQueue=Promise.resolve();
function warmCombatants(extra=[]){const run=()=>warmOnce(extra);return warmQueue=warmQueue.then(run,run);}
async function warmOnce(extra){
 warmSet.gear??=operatorGearParts();warmSet.fx??=effects.warm();warmSet.variants??=warmVariantMaterials();warmSet.props??=utilities.warmModels();
 const holder=new THREE.Group(),culled=[],hidden=[],seen=new Set();
 for(const o of [...operatorPool.blue,...operatorPool.orange,...deaths.pool.blue,...deaths.pool.orange,...[...deaths.weaponPool.values()].flat(),warmSet.gear,warmSet.fx,warmSet.variants,warmSet.props,...(warmSet.armour?[warmSet.armour]:[]),designProxies,...extra]){if(!o.visible){o.visible=true;hidden.push(o);}holder.add(o);}
 filterTextures(holder,renderer.capabilities.getMaxAnisotropy());
 holder.traverse(m=>{if(m.isMesh&&m.frustumCulled){m.frustumCulled=false;culled.push(m);}if(m.userData.variantHidden)return;for(const mat of Array.isArray(m.material)?m.material:[m.material])if(mat)for(const t of Object.values(mat))if(t?.isTexture&&!seen.has(t)){seen.add(t);renderer.initTexture(t);}});
 try{if(postfx?.enabled)await postfx.compile(holder,camera,scene);else if(renderer.compileAsync)await renderer.compileAsync(holder,camera,scene);
  scene.add(holder);
  if(postfx?.enabled){postfx.warmPasses();const tiny=new THREE.WebGLRenderTarget(4,4);renderer.setRenderTarget(tiny);renderer.render(scene,camera);renderer.setRenderTarget(null);tiny.dispose();}
  else{renderer.setScissorTest(true);renderer.setScissor(0,0,1,1);renderer.render(scene,camera);renderer.setScissorTest(false);}
 }finally{for(const m of culled)m.frustumCulled=true;for(const o of hidden)if(o.parent===holder)o.visible=false;holder.clear();scene.remove(holder);}
}
// V34: one operator holding the service pistol, whose merged frame and slide buffers (see agentWeapon in assets.js)
// nothing else draws; pooled operators hold theirs offstage.
{const pistol=createAgent('blue',0);await warmCombatants(pistol?[pistol]:[]);if(pistol)disposeAgent(pistol);}
function avatar(p){const g=operatorPool[p.team].pop()||createAgent(p.team,p.weapon)||createOperator(p.team);g.visible=true;g.userData.poolTeam=p.team;g.userData.presentation=null;g.userData.life=undefined;g.userData.finishKey=null;g.userData.appliedFinish=null;g.userData.appliedWeapon=-1;scene.add(g);return g;}
function releaseAvatar(g){g.removeFromParent();g.visible=false;g.userData.presentation=null;for(const [index,weapon]of g.userData.weaponModels||[])applyFinish(weapon,index,null);const team=g.userData.poolTeam;if(team&&operatorPool[team].length<5)operatorPool[team].push(g);else disposeAgent(g);}

let state={players:{},score:{blue:0,orange:0},started:0,ended:false},id='',peer=null,host=false,training=false,connections=new Map(),upstream=null,room='',playing=false,ready=false,keys={},yaw=0,pitch=0,jump=0,jumpV=0,mouseDown=false,aim=false,shotPulse=false,last=performance.now(),lastSend=0,lastHUD=0,shotFlash=0,recoil=0,ping=0,networkSession=null,networkSeq=0,jumpPulse=false,contextLost=false;
gearOn=true;
const remoteInputs=new WeakMap(),clickLog=[];let lastRewind=0,rewindClamped=0,clockFloor=0,clockTop=0,seenAt=0,seenWall=-Infinity;
// Network timing. SEAT_HOLD_MS keeps a dropped guest's body, score and money for a rejoin.
const NO_PATH_MS=12000,GUEST_SILENCE_MS=25000,SEAT_HOLD_MS=60000,HOST_LOST_MS=30000,INPUT_RATE_LIMIT=120;
const mirror=new SnapshotMirror(),drift=new DriftCorrector(),ammoLedger=new AmmoLedger(),pulseCounts=PULSES.map(()=>0),pendingShots=[];
let stopTicker=null,lastFrameAt=0,nextSend=0,lastPacketAt=0,lastStateAt=0,watchAt=0,netStalled=false,signalingDown=false,shotAim=null,bombPulse=false,guestFast=null,netSerial=0,shownBanner='',predictedReady=0,predictedShots=0,predictedLast=-1e6,bufferedClick=-Infinity,lastDry=-Infinity,lockLostAt=-Infinity,lockRetry=0,wakeLock=null,hintText=null,rejoinToken=null;
const local={x:-28,z:-24,vx:0,vz:0};let smokePulse=false,hePulse=false,firePulse=false,dropPulse=false,shownPrimary=null,lastMoney=null,moneyPurse='',presentationRound=0,lastDeath=null,viewedId='',lastDamageHP=100,roundKills=0;let audio;const shotBuffers=[];let fallbackMouse=false,awaitingPointerLock=false;let grenadePick=null,lastGrenade='flash',utilityPulse=false,interacting=false,reloadRequested=false,scopeZoom=4,scopeAmount=0,sniperCycleUntil=0,jumpRequestUntil=-Infinity,secondaryPulse=false,knifeStrikeAt=-Infinity,knifeHeavy=false;
$('showperformance').onchange=()=>{$('performancestats').hidden=!$('showperformance').checked;frameMeter.reset();};
const panelOpened=()=>{clearActions();ready=false;awaitingPointerLock=false;touch.reset();document.exitPointerLock?.();},panelClosed=()=>{if(playing){$('pause').hidden=false;if(!training&&!networkSession)return;$('pausetitle').textContent='IN PAUSA';$('resume').textContent='TORNA IN CAMPO ↗';}};
const controls=new ControlsPanel(panelOpened,panelClosed);
// The credits panel and its text load on first use.
let credits=null,creditsLoad=null,kickTarget=null,shownWeaponName='';const overlayOpen=()=>controls.active||!!credits?.active||kickTarget!==null;
for(const button of document.querySelectorAll('[data-credits]'))button.onclick=async()=>{try{creditsLoad??=import('./credits-panel.js?v=42.0').then(m=>credits=new m.CreditsPanel(panelOpened,()=>{if(!kickTarget)panelClosed();}));(await creditsLoad).open(button);}catch{creditsLoad=null;status('Crediti non disponibili: ricarica la pagina.');}};
const touch=new TouchControls({canvas,enabled:mobileDevice,
 onLook:(dx,dy)=>{if(!ready)return;const gain=mouseGain(controls.value,camera.fov,aim&&selected===4)*2.6*600/Math.max(360,Math.min(innerWidth,innerHeight));yaw-=dx*gain;pitch=Math.max(-1.45,Math.min(1.45,pitch-dy*gain));},
 onFire:(held,pulse)=>{if(pulse&&spectateStep(1))return;mouseDown=held;if(pulse&&ready)pressTrigger();},onTap:()=>{spectateStep(1);},
 onReload:()=>{if(selected!==5)reloadRequested=true;},onAim:()=>{if(selected===4)aim=!aim;else if(selected===5)secondaryPulse=true;},
 onJump:()=>{if(ready&&canAct(state)&&state.players[id]?.hp>0)jumpRequestUntil=clock.time+JUMP.bufferMs;},
 onInspect:()=>requestInspection(),onFlash:()=>{if(ready)throwTouchGrenade();},onSmoke:()=>{if(ready)cycleTouchGrenade();},onHe:()=>{if(ready)hePulse=true;},onIncendiary:()=>{if(ready)firePulse=true;},onBuy:()=>openBuy(),onInteract:held=>{interacting=held;},onBomb:()=>{if(ready)bombPulse=true;},onTake:()=>{if(ready)requestTakeover();},onWeapon:()=>cycleWeapon(1),onZoom:()=>{scopeZoom=scopeZoom===4?8:4;},onPause:()=>pauseGame(),
 onMode:enabled=>{$('touch-mode').textContent=enabled?'USA MOUSE E TASTIERA':'ATTIVA COMANDI TOUCH';$('touch-mode').setAttribute('aria-pressed',String(enabled));}
});
$('touch-mode').onclick=()=>{awaitingPointerLock=false;ready=false;touch.setEnabled(!touch.enabled);document.exitPointerLock?.();};
// Death and a new round end what was in progress; held keys and the stick finger stay, so walking carries over.
function clearPulses(){inspection.cancel();smokeThrow.reset();if(grenadePick){grenadePick=null;showGrenadePick();}utilityPulse=smokePulse=hePulse=firePulse=dropPulse=bombPulse=false;interacting=false;jumpPulse=false;mouseDown=shotPulse=secondaryPulse=aim=false;reloadRequested=false;jumpRequestUntil=-Infinity;if(touch.state.firing.size)touch.releaseFire();}
function clearActions(){clearPulses();keys={};touch.reset();}
// A new press of the trigger: the aim of this very moment goes with the shot, and an empty gun clicks and reloads.
// A guest's snapshots run behind the host: a press before the round opens or the reload ends, by the guest's best
// estimate of host time, never leaves, or it would land just after that moment and fire a shot nothing showed at the click.
function pressTrigger(){inspection.cancel();const me=state.players[id],hostNow=matchNow()+ping/2;if(!host&&(!canAct(state)&&hostNow<(state.phaseUntil||0)||me?.reload>hostNow))return;const wall=performance.now(),spaced=!shotAim||wall-shotAim.t>=mine(selected).rate*1000-clickBuffer(selected);shotPulse=true;shotAim={yaw,pitch,at:viewClock(),t:wall,serve:spaced};if(me&&me.hp>0&&selected!==5&&!me.reload&&me.ammo?.[selected]===0&&canAct(state)){sfx.dry();lastDry=wall;reloadRequested=true;}}
// How early a semi-automatic click may come and still be served when the cycle ends: the sniper's optic is back this long before its bolt closes.
// V42 b4a: the local player's own row for a slot (a design may bring its own handling, weapon-stats.js).
function mine(i){return weaponFor(i,myFinish(i));}
// V42 b5: the design a slot of the local player fires now: the loadout's, except in an economy round, where it is the one
// paid for (economy.js armedFinish, over the synced p.arms), as the host has it. myFinishes() is one reused array.
// The rigs are built before the match state exists (`gearOn`, a hoisted var, says when it does).
var gearOn;function myFinish(i){return gearOn?armedFinish(state,state.players[id],i,career.data.finishes[i]):career.data.finishes[i];}
const gearList=[];function myFinishes(){for(let i=0;i<6;i++)gearList[i]=myFinish(i);return gearList;}
// A design changed mid-match (Officina, a guest's loadout): no magazine holds more than its new size.
// A new design in the hand is a new weapon: a reload under way stops and the weapon is drawn again, so a swap never
// finishes a short reload into a larger magazine or skips a draw.
function fitAmmo(p,before=null){if(Array.isArray(p.ammo))for(let i=0;i<p.ammo.length;i++)p.ammo[i]=Math.min(p.ammo[i],gunOf(p,i).mag);if(before&&p.hp>0&&weaponFor(p.weapon,before[p.weapon])!==gunOf(p)){p.reload=0;p.reloadStart=0;p.shots=0;p.equipUntil=Math.max(p.equipUntil||0,(state.now||clock.time)+(gunOf(p).equip??.3)*1000);}}
function clickBuffer(weapon){const w=mine(weapon);return w.auto?0:weapon===4?SCOPE_LEAD_MS:Math.min(SCOPE_LEAD_MS,w.rate*500);}
function pauseGame(){refreshRoomList();awaitingPointerLock=false;ready=false;clearActions();sfx.setAmbience(.45);touch.setActive(false);document.exitPointerLock?.();if(playing){$('pause').hidden=false;$('pausetitle').textContent=state.ended?'PARTITA CONCLUSA':'IN PAUSA';$('resume').textContent=state.ended&&host?'NUOVA PARTITA ↗':'TORNA IN CAMPO ↗';}}
function enterWithoutLock(){if(!playing||overlayOpen()||armory.active)return;ready=true;$('pause').hidden=true;touch.setActive(true);hintText??=document.querySelector('.hint').textContent;document.querySelector('.hint').textContent=touch.enabled?'SINISTRA MUOVI · TRASCINA A DESTRA PER MIRARE':'Mouse alternativo: tieni DESTRO per ruotare · SINISTRO spara · WASD muovi · ESC pausa';}
// Right after Esc the browser refuses a new lock for a moment: that is a pause, not a broken mouse.
// Keep the panel, ask for a click and try once by itself. The fallback never outlives this attempt.
function mouseFallback(){
 if(!awaitingPointerLock)return;awaitingPointerLock=false;
 if(performance.now()-lockLostAt<1500){$('pause').hidden=false;$('pausetitle').textContent='IN PAUSA';$('pausetext').textContent='Il browser chiede un altro click per riprendere il mouse.';$('resume').textContent='TORNA IN CAMPO ↗';clearTimeout(lockRetry);lockRetry=setTimeout(()=>{if(playing&&!ready&&!$('pause').hidden&&!touch.enabled)requestMouseLock(canvas,()=>{});},1300);return;}
 fallbackMouse=true;enterWithoutLock();
}
function enterField(){
 sfx.unlock();sfx.setAmbience(.9);clearTimeout(lockRetry);
 if(touch.enabled){enterWithoutLock();return;}
 fallbackMouse=false;awaitingPointerLock=true;
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
function notice(t){const n=$('notice');if(n.textContent!==t)n.textContent=t;}function status(t){$('status').textContent=t;$('loading-message').textContent=t;}function error(t){status(t);$('create').disabled=$('join').disabled=false;mapSelect.disabled=false;}
function spawn(p){const now=clock.time;p.life=(p.life||0)+1;p.input={};p.jumpRequestUntil=-Infinity;remoteInputs.set(p,new InputChannel(p.life));if(p.bot)resetBot(p);const spawnTeam=objectiveEnabled(state)&&state.attackTeam?(p.team===state.attackTeam?'orange':'blue'):p.team;const spots=SPAWNS[spawnTeam].slice(0,Math.max(state.teamSize||2,3));const others=Object.values(state.players).filter(v=>v.id!==p.id&&v.hp>0),rank=s=>Math.min(50,...others.filter(v=>v.team!==p.team).map(v=>Math.hypot(v.x-s[0],v.z-s[1])))-(others.some(v=>v.team===p.team&&Math.hypot(v.x-s[0],v.z-s[1])<2)?100:0)-(others.some(v=>v.team!==p.team&&(()=>{const dx=v.x-s[0],dz=v.z-s[1],d=Math.hypot(dx,dz);return d>.5&&wallDistance([s[0],groundHeight(s[0],s[1])+1.55,s[1]],[dx/d,0,dz/d],d)>=d-.05;})())?40:0);let s=spots[Math.floor(Math.random()*spots.length)],best=rank(s);for(const candidate of spots){if(candidate===s)continue;const r=rank(candidate);if(r>best){best=r;s=candidate;}}p.x=s[0];p.z=s[1];p.hp=100;p.dead=0;p.pitch=0;p.groundY=groundHeight(p.x,p.z);p.y=p.groundY;p.invulnerable=now+2200;if(!weaponAllowed(state.mode,p.weapon))p.weapon=allowedWeapons(state.mode)[0];if(state.mode==='corsa')p.weapon=corsaWeapon(p);p.ammo=WEAPONS.map((w,i)=>gunOf(p,i).mag);p.reload=0;p.reloadStart=0;resetCombat(p);if(economyOn(state))applyCarry(state,p);else{p.flashes=MAPS[ACTIVE_MAP].utility?2:0;p.smokes=MAPS[ACTIVE_MAP].utility?SMOKE.perRound:0;}p.flashReady=p.blindAt=p.blindUntil=p.blindStrength=0;p.yaw=MAPS[ACTIVE_MAP].spawnYaw?.[spawnTeam]??(p.team==='blue'?Math.PI:0);if(p.id===id){syncWeapon(p);local.x=p.x;local.z=p.z;yaw=p.yaw;pitch=0;jump=local.y=p.y||0;local.groundY=p.groundY||0;jumpV=local.jumpV=local.duck=0;local.landingUntil=0;jumpRequestUntil=-Infinity;local.vx=local.vz=0;lastDeath=null;localLife=p.life;localView.reset({x:local.x,z:local.z,y:p.y||0,groundY:p.groundY||0,life:p.life});viewKick.reset();}}
function addPlayer(pid,name,team,bot=false,finishes=null,initialWeapon=pid===id?selected:3,operator=null){team=chooseTeam(Object.values(state.players),team,state.teamSize||2);if(!team)return null;const p={id:pid,name:String(name||'Operatore').slice(0,16),team,kills:0,deaths:0,weapon:weaponAllowed(state.mode,initialWeapon)?initialWeapon:allowedWeapons(state.mode)[0],finishes:cleanLoadout(bot?botLoadout(Number(String(pid).replace(/\D/g,''))||0):finishes),operator:bot?botOperator(Number(String(pid).replace(/\D/g,''))||0,team):cleanOperator(operator||(pid===id?career.data.operator:null)),pitch:0,y:0,bot,input:{},seen:Date.now(),seq:0,net:netSerial=netSerial%65535+1};spawn(p);if(isRoundMode(state.mode)&&state.phase==='live'){p.hp=0;p.dead=0;p.invulnerable=0;}state.players[pid]=p;return p}
function feed(text){const d=document.createElement('div');d.textContent=text;$('messages').prepend(d);while($('messages').children.length>2)$('messages').lastElementChild.remove();setTimeout(()=>d.remove(),4500)}
function broadcast(data){const lasting=data.type==='event'&&(data.event.kind==='kill'||data.event.kind==='round'||data.event.kind==='takeover');if(lasting)pushDeltas();for(const c of connections.values())sendPacket(c,data,{volatile:data.type==='event'&&!lasting});}
// Position frames go out every tick over the fast channel, the same bytes for everyone.
function pushFrame(t){const frame=encodeFrame(state,{hidden:document.hidden||contextLost,ack:p=>{const c=!p.bot&&p.id!==id?remoteInputs.get(p):null;return c&&c.seq>=0?{seq:c.seq,age:t-c.received}:null;}});for(const c of connections.values())if(!sendFast(c.fast,frame))sendPacket(c,{type:'frame',data:frame},{volatile:true,limit:FAST_LIMIT});}
// All the rest is sent as what changed since each guest's last delta. A guest that cannot take
// one right now loses nothing: the next delta simply covers both. Reliable, so it stays in order.
function pushDeltas(){if(!connections.size)return;const view=snapshotForNetwork(state),sign=snapshotSignature(view);for(const c of connections.values()){if(!c.sentState){c.sentState=sign;continue;}const delta=buildDelta(view,sign,c.sentState);if(delta&&sendPacket(c,{type:'delta',delta},{volatile:true}))c.sentState=sign;}}
// V28.2 hit and kill feedback (style.css): a hitmarker on every hit dealt, one diamond
// per kill this round (this life in deathmatch) and a chime that rises with each kill.
const calmMotion=matchMedia('(prefers-reduced-motion:reduce)');
function showHitMarker(kind=''){const m=$('hit');m.className=kind;for(const a of m.getAnimations?.()||[])a.cancel();m.animate?.(calmMotion.matches?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'translate(-50%,-50%) scale(1.2)'},{opacity:0,transform:'translate(-50%,-50%) scale(1)'}],{duration:kind==='kill'?360:170,easing:'cubic-bezier(.2,.7,.3,1)'});}
function showKillConfirm(headshot){const k=$('killconfirm'),pip=document.createElement('i');if(headshot)pip.className='head';k.append(pip);while(k.children.length>5)k.firstElementChild.remove();for(const a of k.getAnimations?.()||[])a.cancel();k.animate?.([{opacity:1},{opacity:1,offset:.78},{opacity:0}],{duration:2300,easing:'ease-out'});}
// V42: a short warm pulse at the screen's edges for each of your kills, and from the second kill of the round a 2K-5K tag under the crosshair.
const pulseEl=Object.assign(document.createElement('div'),{id:'killpulse'}),streakEl=Object.assign(document.createElement('div'),{id:'streaktag'});pulseEl.setAttribute('aria-hidden','true');streakEl.setAttribute('aria-hidden','true');$('hud').append(pulseEl,streakEl);
function killPulse(streak){for(const a of pulseEl.getAnimations?.()||[])a.cancel();pulseEl.animate?.([{opacity:calmMotion.matches?.35:.75},{opacity:0}],{duration:calmMotion.matches?260:420,easing:'ease-out'});if(streak<2)return;streakEl.textContent=Math.min(5,streak)+'K';for(const a of streakEl.getAnimations?.()||[])a.cancel();streakEl.animate?.(calmMotion.matches?[{opacity:1},{opacity:1,offset:.8},{opacity:0}]:[{opacity:0,transform:'translate(-50%,0) scale(1.35)'},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.18},{opacity:1,offset:.8},{opacity:0}],{duration:900,easing:'ease-out'});}
function clearKillConfirm(){roundKills=0;$('killconfirm').replaceChildren();}
function presentKill(e,age=0){
 const victim=state.players[e.victimId];
 if(!host&&victim?.life===e.victim.life){victim.hp=0;victim.dead=e.time+3000;victim.death=e;victim.deaths=Math.max(victim.deaths||0,e.victimDeaths||0);}
 const killer=state.players[e.killerId];if(!host&&killer)killer.kills=Math.max(killer.kills||0,e.killerKills||0);
 if(!host&&e.score)for(const team of ['blue','orange'])state.score[team]=Math.max(state.score[team],e.score[team]||0);
 if(career.kill(e,id))showCareer();
 addKillFeed($('feed'),e,id,age);deaths.add(e.victim,e,avatars.get(e.victimId));
 if(e.killerId===id&&e.victimId!==id&&age<1500){roundKills++;showHitMarker('kill');showKillConfirm(!!e.headshot);sfx.kill({streak:roundKills,headshot:!!e.headshot});killPulse(roundKills);}
 if(e.victimId===id&&isRespawnMode(state.mode))clearKillConfirm();
 if(e.victimId===id&&victim?.life===e.victim.life){lastDeath=e;clearPulses();scopeAmount=0;}
}
function event(e){
 if(e.kind==='kill'){if(host&&!recordKill(state,e))return;kills.receive(e,state,matchNow(),presentKill);}
 if(host)broadcast({type:'event',event:e});
 if(e.kind==='info')feed(e.text);
 if(e.kind==='takeover'&&typeof e.name==='string'&&typeof e.bot==='string'){feed(e.name+' prende il controllo di '+e.bot);if(e.id===id&&!host)takeoverFade();}
 if(e.kind==='smoke'&&Array.isArray(e.point))sfx.smoke(e.point);
 if(e.kind==='he'&&Array.isArray(e.point)){sfx.he(e.point);blastFX.burst(e.point,matchNow());effects.flashBurst?.(e.point);effects.scorch(e.point);smokeFX.blast(e.point,matchNow());}
 if(e.kind==='fire'&&Array.isArray(e.point))sfx.ignite(e.point);
 if(e.kind==='douse'&&Array.isArray(e.point))sfx.smoke(e.point);
 if(e.kind==='flash'&&Array.isArray(e.point)){sfx.flashBang(e.point);effects.flashBurst?.(e.point);}
 if(e.kind==='round'){
  if(e.phase==='freeze'){deaths.clear();lastDeath=null;clearPulses();clearKillConfirm();local.vx=local.vz=0;effects.clearMarks();}
  if(e.phase==='live')sfx.radio();
  if(e.phase==='result')sfx.radio(e.winner===state.players[id]?.team);
 }
 if(e.kind==='melee'){
  const operator=avatars.get(e.id);if(operator)flashAgent(operator);
  if(e.id===id){if(host||performance.now()-knifeStrikeAt>600){knifeStrikeAt=performance.now();pulseFx(5);knifeHeavy=!!e.heavy;}sfx.knife({heavy:!!e.heavy,hit:!!e.hit});}
  if(Array.isArray(e.wall)&&Array.isArray(e.from)&&e.wall.every(Number.isFinite)){const material=effects.slash(e.wall,e.wall.map((v,i)=>v-e.from[i]));sfx.scrape({position:e.wall,material});}
 }
 if(e.kind==='shot'){
  if(!host&&e.id===id){const p=state.players[id];if(p){p.shots=e.shots;p.lastShot=e.time;p.recoilWeapon=e.weapon;}}
  effects.shot(e,{local:e.id===id,camera,muzzle});smokeFX.carve(e.from,e.to,matchNow());
  if(e.impact&&Array.isArray(e.to)&&Array.isArray(e.from)){const material=effects.impact(e.to,e.to.map((v,i)=>v-e.from[i]));sfx.impact({position:e.to,material,ricochet:true});}
  // A penetrated surface shows the entry hole and the exit hole on the far face.
  if(Array.isArray(e.through)&&Array.isArray(e.from)){const dir=e.to.map((v,i)=>v-e.from[i]);for(const point of e.through)if(Array.isArray(point)&&point.every(Number.isFinite)){const material=effects.impact(point,dir);if(point===e.through[0])sfx.impact({position:point,material,ricochet:false});}}
  if(e.id!==id){if(Array.isArray(e.from)){sfx.shot({weapon:e.weapon??3,position:e.from,muffled:occluded(e.from),tone:designOf(e.weapon,state.players[e.id]?.finishes?.[e.weapon])?.tone});effects.remoteMuzzle?.(e.from,e.to);if(Array.isArray(e.to))nearMiss(e);sfx.casing(e.from);}const operator=avatars.get(e.id);if(operator)flashAgent(operator);}
  else if(!host&&pendingShots.length)pendingShots.shift();else localShotFX(e.weapon);
 }
 if(e.kind==='damage'){
  const operator=avatars.get(e.id);if(operator)reactAgent(operator);
  if(Array.isArray(e.point)){effects.blood?.(e.point,e.direction,e.zone==='head');if(!e.burn)effects.hitFlash?.(e.point,e.direction,e.zone==='head'&&e.helmet);if(e.by===id){sfx.hitConfirm({headshot:e.zone==='head',helmet:e.helmet});if(e.id!==id)showHitMarker(e.zone==='head'?'head':'');}else if(e.id!==id)sfx.impact({position:e.point,material:'flesh'});}
  if(e.id===id){sfx.hurt(!!e.heavy);viewKick.hurt(e.direction,yaw,!!e.heavy);showHurtDirection(e.direction);}
 }
}
// Muzzle, recoil and sound of the local weapon: at the click on a guest, at the shot on the host.
// The sniper's whole cycle is one number, its rate: the bolt opens at 27%, the case leaves at 36%, the optic is back SCOPE_LEAD_MS before it can fire.
const FLASH_LIFE=[.04,.035,.05,.045,.07];let flashFresh=false;
// V42 b4b: the cycle of the sniper the player holds (a semi-automatic design has no bolt to work: no cycle at all).
function sniperCycle(){return mine(4).rate*1000-SCOPE_LEAD_MS;}
const sniperSemi=()=>semiOf(4,myFinish(4));
// V42 b4b review: the label inside the lens stays short (it shares the bottom of the lens with the zoom on a phone) and is
// rebuilt only when the sniper design changes, not every scoped frame.
let scopeLabelKey=null,scopeLabelText='AVERLA / PRECISIONE',scopeReloadText='RICARICA AVERLA';
function scopeLabel(){const f=myFinish(4),k=f?.model||'stock';if(k!==scopeLabelKey){scopeLabelKey=k;const name=shortName(4,f).split(' ')[0];scopeLabelText=name+' / '+(semiOf(4,f)?'SEMIAUTO':k==='classico'?'CLASSICO':'PRECISIONE');scopeReloadText='RICARICA '+name;}return scopeLabelText;}
let inspectWave=0;
// The rifle's ejection port in the main camera's space: the hands camera sits a little off the eye and is narrower.
const portAt=new THREE.Vector3();function portInView(){const port=gun?.userData.port;if(!port||displayed!==4)return null;port.getWorldPosition(portAt).sub(handsCamera.position);const k=Math.tan(camera.fov*Math.PI/360)/Math.tan(handsCamera.fov*Math.PI/360);portAt.x*=k;portAt.y*=k;return portAt;}
function localShotFX(weapon){pulseFx(weapon);if(weapon===4&&sniperSemi()){const life=localLife;setTimeout(()=>{if(playing&&selected===4&&localLife===life)effects.casing(camera,portInView());},40);}else if(weapon===4){const cycle=WEAPONS[4].rate*1000,life=localLife;sniperCycleUntil=matchNow()+sniperCycle();setTimeout(()=>{if(playing)sfx.cycle();},cycle*.27);setTimeout(()=>{if(playing&&selected===4&&localLife===life)effects.casing(camera,portInView());},cycle*.36);}else effects.casing(camera);effects.localMuzzle?.(camera,muzzle,weapon);shotFlash=FLASH_LIFE[weapon]??.045;flashFresh=true;{const view=designOf(weapon??selected,myFinish(weapon??selected))?.view??1;recoil=(weapon===4?.08:weapon===0?.045:.028)*view;viewKick.fire(weapon??selected,view);}sfx.shot({weapon,local:true,tone:designOf(weapon,myFinish(weapon))?.tone});sfx.casing(null,true,weapon===4?(sniperSemi()?.05:WEAPONS[4].rate*.38):null);}
// Guest: the shot is felt at the click, under the same gates the host applies. The host still
// decides everything; its echo finds this prediction and repeats nothing, and a shot it refused
// expires here, which gives the round back. Blood, hit markers and damage stay host-confirmed.
function predictShot(i,t){
 const refused=Math.max(700,ping*2+300);while(pendingShots.length&&t-pendingShots[0]>refused)pendingShots.shift();ammoLedger.expire(t,refused);
 const w=mine(selected);if(i.fire&&!w.auto&&!w.melee)bufferedClick=t;
 // A semi-automatic click a little before the cycle ends is felt when the host will serve it, not dropped.
 const fire=i.fire||!w.auto&&!w.melee&&t-bufferedClick<=clickBuffer(selected);
 if(!fire&&!i.secondary)return;const p=state.players[id],now=matchNow();
 if(!p||p.hp<=0||p.weapon!==selected||!canAct(state)||netStalled||p.reload||now<(p.equipUntil||0)||now<predictedReady||now+ping+20<(p.weaponReady?.[selected]||0))return;
 if(shotAim&&(w.melee||fire&&p.ammo?.[selected]>0))shotAim.serve=true;
 if(w.melee){predictedReady=now+(i.secondary?800:w.rate*1000);knifeStrikeAt=performance.now();pulseFx(5);knifeHeavy=!!i.secondary;return;}
 if(!fire||!(p.ammo?.[selected]>0))return;
 bufferedClick=-Infinity;predictedReady=nextReady({weaponReady:{[selected]:predictedReady}},selected,now,w.rate);predictedShots=recoilIndex({weapon:selected,shots:predictedShots,lastShot:predictedLast,finishes:myFinishes()},now)+1;predictedLast=now;pendingShots.push(t);ammoLedger.fired(selected,t);p.ammo[selected]--;p.shots=predictedShots;p.lastShot=now;p.recoilWeapon=selected;localShotFX(selected);
}
// Snapshots lag the prediction by a round trip: shots still on their way count against them.
function applyPrediction(p){if(Array.isArray(p.ammo))ammoLedger.apply(p.ammo);if(predictedLast>(p.lastShot??-1e6)){p.lastShot=predictedLast;p.shots=Math.max(p.shots||0,predictedShots);p.recoilWeapon=selected;}}
function shoot(p,now,heavy=false){
 const wi=p.weapon,w=gunOf(p,wi);if(!canAct(state)||!canAttack(p,now,heavy))return;
 const rate=w.melee&&heavy?.8:w.rate;
 const angles=w.melee?null:shotParameters(p,now);p.lastShot=now;p.weaponReady??=WEAPONS.map(()=>0);p.weaponReady[wi]=nextReady(p,wi,now,rate);
 if(!w.melee){p.ammo[wi]--;hearBotShot(p,Object.values(state.players),now);}
 // Lag compensation: a person's bullet or blade is traced against the bodies as that person saw
 // them on screen when they clicked, the host's own included, since it draws them a little behind
 // too. Never more than REWIND_MAX_MS back. Bots trace the live state.
 const everyone=Object.values(state.players),shotAt=p.bot?now:(Number.isFinite(p.input?.at)?p.input.at:now),targets=rewoundPlayers(everyone,p,shotAt,now);if(!p.bot)lastRewind=rewindMs(shotAt,now);
 const hit=w.melee?traceMelee(p,targets,heavy):traceShot(p,targets,angles),victim=hit.victim?state.players[hit.victim.id]:null;
 event(w.melee?{kind:'melee',id:p.id,weapon:wi,heavy,hit:!!victim,...(hit.wall?{wall:hit.to,from:hit.from}:{})}:{kind:'shot',id:p.id,weapon:wi,shots:p.shots,time:now,impact:!victim&&hit.distance<w.range,from:hit.from,to:hit.to,...(hit.through?{through:hit.through}:{})});
 if(!victim||victim.hp<=0||victim.team===p.team||now<victim.invulnerable)return;
 const result=applyHit(victim,p,hit.zone,now,w.melee?hit:null,hit.distance,hit.scale??1);p.dealt=(p.dealt||0)+result.damage;event({kind:'damage',id:victim.id,point:hit.to,by:p.id,zone:hit.zone,helmet:victim.helmet!==false,heavy:result.damage>=40,direction:hit.direction});
 // How the kill was made, for the feed: through a wall, without the optic, through smoke, from the air.
 if(result.lethal)lethal(victim,p,result,wi,hit.to,hit.direction,now,w.melee?null:{wall:!!hit.through,noscope:wi===4&&scopeSettle(p,now)<.5,smoke:smokeBlocks(hit.from,hit.to),air:(p.y||0)-(p.groundY||0)>.05});
}
// One death path for bullets, blades, HE and fire: score, credits, assists, the
// dropped primary and the kill event everyone presents.
function lethal(victim,p,result,wi,point,direction,now,how=null){
 const self=p.id===victim.id;
 // V42 b2: a taken-over body that falls is the bot's death, as in the genre; its kills stay the player's.
 (victim.takeover&&state.players[victim.takeover.bot]||victim).deaths++;victim.dead=now+3000;if(!self){p.kills++;const reward=economyOn(state)?ECONOMY.kill[wi]??300:0;if(reward)give(p,reward);if(result.headshot)p.hs=(p.hs||0)+1;if(isRespawnMode(state.mode))state.score[p.team]++;if(state.mode==='corsa')corsaKill(state,p,victim,wi);}
 // Rule of thumb: 40+ damage on the victim from someone else earns the assist.
 for(const [sid,record]of Object.entries(victim.received||{})){const helper=state.players[sid];if(sid!==p.id&&sid!==victim.id&&helper&&helper.team!==victim.team&&record.damage>=40)helper.assists=(helper.assists||0)+1;}
 if(economyOn(state)&&Number.isInteger(victim.primary))dropWeapon(state,victim,now,{weapon:victim.primary});
 const design=wi<5?p.finishes?.[wi]?.model:null,kill={kind:'kill',killerId:p.id,killerName:p.name,killerTeam:p.team,victimId:victim.id,victimName:victim.name,victimTeam:victim.team,weapon:wi,...(designName(wi,design)?{model:design}:{}),weaponDropped:victim.weapon,headshot:result.headshot,damage:result.total,hits:result.hits,dealt:p.received?.[victim.id]?.damage||0,dealtHits:p.received?.[victim.id]?.hits||0,killerHp:p.hp,reward:self?0:economyOn(state)?ECONOMY.kill[wi]??300:0,direction,time:now,killerKills:p.kills,victimDeaths:victim.deaths,score:{...state.score},victim:{id:victim.id,life:victim.life,team:victim.team,weapon:victim.weapon,duck:victim.duck||0,x:victim.x,y:victim.y||0,z:victim.z,yaw:victim.yaw,pitch:victim.pitch,finish:victim.finishes?.[victim.weapon],operator:victim.operator}};
 if(how&&!self)for(const key of ['wall','noscope','smoke','air'])if(how[key])kill[key]=true;
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
const pickupBusy=p=>onObjective(state,p);
const sahraSeen=()=>{try{return !!localStorage.getItem('ob-sahra-v24');}catch{return false;}};
function syncLocalBody(p){p.x=local.x;p.z=local.z;p.y=jump;p.groundY=local.groundY||0;p.speed=local.speed||0;p.vx=local.vx;p.vz=local.vz;p.duck=local.duck||0;p.jumpV=local.jumpV||0;p.landingUntil=local.landingUntil||0;}
// Outside live play nobody acts: queued pulses and clicks die here, so a click during the result cannot fire
// when the round opens and a held E cannot swap. Bodies still land, and in the result humans may walk.
function settleBody(p,i,dt,now){
 clearInputPulses(i);p.input=i;const queued=remoteInputs.get(p)?.clicks;if(queued)queued.length=0;
 if(p.id===id){syncLocalBody(p);return;}
 if(!p.bot&&canMove(state)){stepStance(p,!!i.crouch,dt);stepMovement(p,i,dt,now);}else p.vx=p.vz=p.speed=0;
 stepJump(p,dt,now);
}
function simulate(dt,now){
 state.now=now;
 // V42 b5: a slot fires the design paid for, whatever a loadout packet or a takeover left in p.finishes (economy.js).
 if(economyOn(state))for(const p of Object.values(state.players))pinArms(state,p);
 // Everyone human marked ready (or dead): the buy phase ends early.
 if(canBuyNow(state)){const humans=Object.values(state.players).filter(v=>!v.bot&&!v.loading);if(humans.length&&humans.every(v=>v.buyReady===state.round||v.hp<=0||v.away))state.phaseUntil=Math.min(state.phaseUntil,now+600);}
 if(!state.preview)updateMatch(state,now,spawn,event);
 for(const p of Object.values(state.players)){
  if(p.loading)continue;if(p.hp<=0){if(isRespawnMode(state.mode)&&now>p.dead&&!state.ended)spawn(p);continue;}
  if(!canAct(state)){settleBody(p,p.bot||p.id===id?p.input||{}:remoteInputs.get(p)?.read(performance.now())||{},dt,now);continue;}
  if(state.mode==='corsa'&&p.weapon!==corsaWeapon(p)&&p.weapon!==5){equipWeapon(p,corsaWeapon(p),now);p.ammo[p.weapon]=gunOf(p).mag;}
  if(p.bot)p.input=botInput(p,Object.values(state.players),now,dt,{difficulty:state.difficulty,weapon:state.mode==='corsa'?corsaWeapon(p):economyOn(state)?p.primary??0:state.botWeapon??undefined,objective:botObjectiveOrder(state,p),fires:state.fires,he:known=>botHeTarget(state,p,now,known),utility:flashEnabled(state),grenades:state.grenades});
  const i=p.bot||p.id===id?p.input||{}:remoteInputs.get(p)?.read(performance.now())||{};p.input=i;
  if(p.reload&&now>=p.reload){p.ammo[p.weapon]=gunOf(p).mag;p.reload=0;p.reloadDone=now;}
  // The optic settles from the right press (scopeSettle in combat-rules.js); bots go through here too.
  if(i.aim&&!p.aimHeld)p.aimSince=now;p.aimHeld=!!i.aim;
  {const w=gunOf(p);if(!w.melee&&i.reload&&now>=(p.equipUntil||0)&&!p.reload&&p.ammo[p.weapon]<w.mag){p.reloadStart=now;p.reload=now+w.reload*1000;}}
  if(p.id!==id){
   if(p.bot){stepStance(p,!!i.crouch,dt);stepBotMovement(p,i,dt,now);}
   else {if(i.crouch)heldStance.delete(p.id);stepStance(p,!!i.crouch||heldStance.get(p.id)===p.life,dt);stepMovement(p,i,dt,now);if(i.jump)p.jumpRequestUntil=now+JUMP.bufferMs;i.jump=false;if(stepJump(p,dt,now,p.jumpRequestUntil))p.jumpRequestUntil=-Infinity;}
  }else syncLocalBody(p);
  if(p.bot&&!i.fire&&!i.flash&&now>=(p.flashReady||0)){const target=botSmokeTarget(state,p,now);if(target){i.smoke=true;i.smokeTarget=target;}// One grenade per throw cooldown: a target computed while the arm is busy would be lost.
   if(!target&&now>=(p.flashReady||0)){const burn=botSmokeTarget(state,p,now,'fire');if(burn){i.incendiary=true;i.fireTarget=burn;}}}
  if(i.flash){throwFlash(state,p,now);i.flash=false;}
  if(i.smoke){throwSmoke(state,p,now,{eye:eyeHeight(p),target:p.bot?i.smokeTarget:null,enabled:flashEnabled(state),power:i.smokePower,carry:p.bot?null:[p.vx||0,p.jumpV||0,p.vz||0],tint:p.operator?.smoke});i.smoke=false;}
  if(i.he){throwUtility(state,p,now,'he',{eye:eyeHeight(p),target:p.bot?i.heTarget:null,enabled:flashEnabled(state)});i.he=false;}
  if(i.incendiary){throwUtility(state,p,now,'fire',{eye:eyeHeight(p),target:p.bot?i.fireTarget:null,enabled:flashEnabled(state)});i.incendiary=false;}
  if(i.drop){if(economyOn(state)&&!p.bot)dropWeapon(state,p,now,{toss:true});i.drop=false;}
  if(i.bomb){dropBomb(state,p);i.bomb=false;}
  // A click carries its own aim and moment; held automatic fire uses the current one.
  const clicks=p.bot?null:remoteInputs.get(p),shot=clicks?.clicks.length?clicks.nextClick(performance.now(),canAttack(p,now),p.weapon,mayAttack(p,now)):null;
  if(i.fire||i.tap||i.secondary||shot){const heldYaw=p.yaw,heldPitch=p.pitch,heldAt=i.at;if(shot){p.yaw=shot.yaw;p.pitch=shot.pitch;i.at=shot.at;}shoot(p,now,!!i.secondary);if(shot){p.yaw=heldYaw;p.pitch=heldPitch;i.at=heldAt;}}i.secondary=false;i.reload=false;i.tap=false;if(!gunOf(p).auto)i.fire=false;
 }
 recordPositions(state,now);
 updateFlashes(state,dt,now,event,hurt);updateFires(state,now,hurt,event);updateObjective(state,now,hurt);if(canAct(state))updatePickups(state,now,{economy:economyOn(state),busy:pickupBusy});
 // Resolve a team wipe in the same simulation tick as the last elimination.
 if(!state.preview)updateMatch(state,now,spawn,event);
}
function input(){if(crouchHold>=0&&(keys.KeyC||keys.ControlLeft||keys.ControlRight))crouchHold=-1;if(touchHold>=0&&!touch.crouching)touchHold=-1;return{flash:ready&&utilityPulse,smoke:ready&&smokePulse,smokePower,he:ready&&hePulse,incendiary:ready&&firePulse,drop:ready&&dropPulse,bomb:ready&&bombPulse,interact:ready&&(!!keys.KeyE||interacting),jump:ready&&jumpPulse,crouch:ready&&!!(keys.KeyC||keys.ControlLeft||keys.ControlRight||touch.crouching||crouchHold===localLife),forward:ready?Math.max(-1,Math.min(1,(keys.KeyW?1:0)-(keys.KeyS?1:0)+touch.state.axes.forward)):0,side:ready?Math.max(-1,Math.min(1,(keys.KeyD?1:0)-(keys.KeyA?1:0)+touch.state.axes.side)):0,slow:ready&&!!(keys.ShiftLeft||keys.ShiftRight),fire:ready&&weaponSwitch.phase==='ready'&&(shotPulse||(mine(selected).auto&&mouseDown)),secondary:ready&&weaponSwitch.phase==='ready'&&selected===5&&secondaryPulse,reload:ready&&weaponSwitch.phase==='ready'&&reloadRequested,aim:ready&&aim,yaw,pitch,weapon:selected}}
// The count is a QA figure for shots only: a stalled guest's idle packets are clamped too, and rewind nothing.
function boundClock(v,shot=true){if(shot&&v<clockFloor)rewindClamped++;return Math.max(clockFloor,Math.min(clockTop,v));}
function acceptInput(p,packet,remote=false){
 // A client cannot ask for more rewind than its measured round trip and its view delay explain.
 if(remote){clockTop=clock.time;clockFloor=rewindFloor(clockTop,p.rttPeak);}
 const i=remote?remoteInputs.get(p)?.accept(packet,state.mode,p.weapon,performance.now(),boundClock):cleanInput(packet,state.mode,p.weapon);if(!i)return;
 if(remote&&i.at!==null)i.at=boundClock(i.at,i.fire);
 if(i.yaw!==null)p.yaw=i.yaw;if(i.pitch!==null)p.pitch=i.pitch;
 if(p.hp>0&&ownsWeapon(state,p,i.weapon))equipWeapon(p,i.weapon,clock.time);p.input=i;p.seen=Date.now();
}
function start(){const visits=MAPS[ACTIVE_MAP].visits;$('visitnav').hidden=!(state.preview&&visits);if(visits)$('visitpoint').replaceChildren(...Object.entries(visits).map(([key,v])=>Object.assign(document.createElement('option'),{value:key,textContent:v[3]})));$('visitpoint').value='spawn';$('resume').hidden=false;$('reconnect').hidden=true;resetGuestNet();if(!training)holdScreen();clock.reset(state.now??state.started??Date.now());state.now=clock.time;snapshots.clear();lastSnapshotAt=performance.now();if(!host)snapshots.push(state,lastSnapshotAt);playing=true;ready=false;resultHandled=null;matchStartXP=career.data.xp;mapSelect.disabled=true;networkSeq=0;clearActions();local.vx=local.vz=0;camera.fov=BASE_FOV;camera.updateProjectionMatrix();$('menu').hidden=true;$('hud').hidden=false;void $('hud').offsetHeight;/* lay the HUD out now, in the click, not in the first frame of the match */frameMeter.reset();$('pause').hidden=false;$('pausetitle').textContent='PRONTO A ENTRARE?';$('pausetext').textContent=state.preview?'Visita libera senza bot e senza limite di tempo. H nasconde l’HUD, ESC torna al menu pausa.':(training?'Allenamento con '+Object.values(state.players).filter(p=>p.bot).length+' bot. ':'Stanza '+room+'. ')+(isRoundMode(state.mode)?'Una vita per round · prima squadra a '+matchRules(state).target+'.':state.mode==='corsa'?'CORSA ALLE ARMI · rientro continuo · sei armi, due uccisioni a gradino · finisci col coltello.':matchRules(state).label+' · rientro continuo · primi a '+matchRules(state).target+' eliminazioni.');$('roomtag').textContent=MAPS[ACTIVE_MAP].short+' / '+(state.preview?'VISITA':training?'TRAINING':room);$('copy').hidden=training;const p=state.players[id];$('feed').replaceChildren();kills.clear();kills.reconcile(state,matchNow(),presentKill);if(p){syncWeapon(p);local.x=p.x;local.z=p.z;yaw=p.yaw;localLife=p.life;pitch=0;jump=local.y=p.y||0;local.groundY=p.groundY||0;jumpV=local.jumpV=local.duck=0;local.landingUntil=0;localView.reset({...local,life:p.life});jumpRequestUntil=-Infinity}lastDamageHP=100;lastDeath=null;$('deathcard').hidden=true;document.querySelector('.pausebox>small').textContent=touch.enabled?'Joystick a sinistra · trascina a destra per mirare · pulsante SPARA':'Clic sinistro spara · Destro ottica AVERLA · 1–6 equipaggiamento · Q ultima arma · V coltello · G granate (rotella o G sceglie, clic lancia) · Z fumogeno: rilascia sinistro lungo, destro corto, entrambi medio';$('resume').textContent='ENTRA IN CAMPO ↗'}
// `linger` leaves the channels open a moment so a last goodbye can leave the machine.
function disconnectNetwork(linger=0){stopTicker?.();stopTicker=null;const session=networkSession;networkSession=null;if(session){if(linger)setTimeout(()=>session.close(),linger);else session.close();}peer=null;upstream=null;guestFast=null;connections.clear();signalingDown=false;setBanner('');wakeLock?.release?.().catch?.(()=>{});wakeLock=null;}
function resetGuestNet(){const t=performance.now();resetPrediction();nextSend=0;lastPacketAt=lastStateAt=watchAt=t;netStalled=false;setBanner('');}
function resetPrediction(){drift.reset();ammoLedger.reset();pulseCounts.fill(0);pendingShots.length=0;predictedReady=0;bufferedClick=-Infinity;predictedShots=0;predictedLast=-1e6;shotAim=null;clickLog.length=0;}
function setBanner(text){if(shownBanner===text)return;shownBanner=text;const b=$('netbanner');b.textContent=text;b.hidden=!text;}
async function holdScreen(){if(wakeLock||!navigator.wakeLock)return;try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener?.('release',()=>{wakeLock=null;});if(!networkSession){wakeLock.release();wakeLock=null;}}catch{}}
function saveSeat(code,token){rejoinToken={room:code,token};try{sessionStorage.setItem('ob-seat',JSON.stringify(rejoinToken));}catch{}}
function seatFor(code){let seat=rejoinToken;try{seat??=JSON.parse(sessionStorage.getItem('ob-seat')||'null');}catch{}return seat?.room===code&&typeof seat.token==='string'?seat.token:null;}
function forgetSeat(){rejoinToken=null;try{sessionStorage.removeItem('ob-seat');}catch{}}
function cleanup(rejoining=false){
 const stay=rejoining===true;if(networkSession&&!training&&!stay){if(host)broadcast({type:'bye'});else if(upstream?.open)sendPacket(upstream,{type:'bye'});}if(!stay)forgetSeat();
 kills.clear();clearHistory();viewKick.reset();sfx.cancelReload('local');sfx.setAmbience(.5);document.documentElement.classList.remove('clean-view');awaitingPointerLock=false;touch.setActive(false);resetBots();snapshots.clear();clock.pause();playing=false;ready=false;clearActions();document.exitPointerLock?.();disconnectNetwork(150);
 state={players:{},score:{blue:0,orange:0},started:0,ended:false};for(const g of avatars.values())releaseAvatar(g);avatars.clear();mapSelect.disabled=false;
 $('hud').hidden=$('pause').hidden=$('board').hidden=true;$('menu').hidden=false;for(const key of ['create','join','practice','explore'])$(key).disabled=false;
 effects.clear();deaths.clear();utilities.clear();smokeFX.clear();blastFX.clear();fireFX.clear();$('flash').style.opacity=0;lastDeath=null;scopeAmount=shotFlash=recoil=0;sniperCycleUntil=0;inspection.cancel();$('scope').style.display='none';$('damage').style.opacity=0;$('hit').style.opacity=0;clearKillConfirm();$('hurtdir').classList.remove('show');$('hurtdir').style.opacity='';
 $('feed').replaceChildren();$('messages').replaceChildren();$('deathcard').hidden=true;$('roundbanner').hidden=true;history.replaceState(null,'',location.pathname+'?map='+ACTIVE_MAP);status(mobileDevice?'Comandi touch · consigliato telefono in orizzontale':'PC e mouse · nessuna installazione');
}
function fillRoomBots(){if(!host||training||!state.fillBots)return;for(const team of missingBots(Object.values(state.players),state.teamSize))addPlayer('bot'+(++botSerial),nextBotName(Object.values(state.players),botSerial),team,true);}
// A guest who vanished without a goodbye keeps the seat for a minute: the body stands idle, can be
// shot, and hands over the bomb. Coming back with the room's token puts them back in it.
function holdSeat(p,session){freeBody(p);p.away=true;p.input={};event({kind:'info',text:p.name+' ha perso la connessione'});p.seatTimer=session.after(SEAT_HOLD_MS,()=>{if(state.players[p.id]===p&&p.away){delete state.players[p.id];event({kind:'info',text:p.name+' ha lasciato la stanza'});fillRoomBots();}});}
function takeSeat(p,c,session){
 const old=p.id,previous=connections.get(old);session.cancel(p.seatTimer);connections.delete(old);previous?.close();delete state.players[old];p.id=c.peer;state.players[c.peer]=p;p.away=true;p.seen=Date.now();
 const o=state.objective;if(o?.carrierId===old)o.carrierId=c.peer;if(o?.droppedBy===old)o.droppedBy=c.peer;if(o?.actorId===old){o.actorId=null;o.actionStarted=0;o.progress=0;}
 for(const d of state.drops||[])if(d.by===old)d.by=c.peer;for(const g of [...state.grenades||[],...state.fires||[]])if(g.owner===old)g.owner=c.peer;
}
// Host kick. The peer id, the seat token and a random per-browser id all stay refused until the host closes the room.
const KICKED_TEXT='L’host ti ha rimosso da questa partita. Non puoi rientrare finché la stanza resta aperta.',kicked={peers:new Set(),tokens:new Set(),devices:new Set()};
let shownRoom='';
// getRandomValues also exists outside a secure context, as when a phone joins a dev server over plain HTTP on the LAN.
const randomDevice=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
function deviceId(){let v='';try{v=localStorage.getItem('ob-device')||'';if(!v){v=randomDevice();localStorage.setItem('ob-device',v);}}catch{v||=randomDevice();}return v;}
function refreshRoomList(){
 const guests=host&&!training&&networkSession?Object.values(state.players).filter(p=>!p.bot&&p.id!==id):[],seen=guests.map(p=>p.id+':'+p.name+':'+!!p.away).join('|');if(seen===shownRoom)return;shownRoom=seen;
 $('roomplayers').hidden=!guests.length;$('roomlist').replaceChildren(...guests.map(p=>{const row=document.createElement('li'),name=document.createElement('span'),button=document.createElement('button');name.textContent=p.name;if(p.away){const away=document.createElement('small');away.textContent='assente';name.append(away);}button.textContent='RIMUOVI';button.setAttribute('aria-label','Rimuovi '+p.name+' dalla stanza');button.onclick=()=>askKick(p.id);row.append(name,button);return row;}));
}
function askKick(pid){const p=state.players[pid];if(!p)return;kickTarget=pid;$('kick-text').textContent=p.name+' esce subito dalla stanza e non potrà rientrare in questa partita.';$('kickconfirm').hidden=false;$('kick-cancel').focus();}
const focusRoom=()=>($('roomlist').querySelector('button')||$('resume')).focus();
function closeKick(){kickTarget=null;$('kickconfirm').hidden=true;focusRoom();}
function kickPlayer(pid){
 const p=state.players[pid];if(!host||training||!networkSession||!p||p.bot||pid===id)return;
 kicked.peers.add(pid);if(p.token)kicked.tokens.add(p.token);if(p.device)kicked.devices.add(p.device);
 const c=connections.get(pid);connections.delete(pid);c?.eject();networkSession.cancel(p.seatTimer);freeBody(p);delete state.players[pid];event({kind:'info',text:p.name+' è stato rimosso dall’host'});fillRoomBots();refreshRoomList();
}
$('kick-cancel').onclick=closeKick;$('kick-yes').onclick=()=>{const pid=kickTarget;closeKick();kickPlayer(pid);focusRoom();};
window.addEventListener('keydown',e=>{if(kickTarget===null)return;if(e.code==='Escape'){e.preventDefault();closeKick();}else if(e.code==='Tab'){e.preventDefault();(document.activeElement===$('kick-yes')?$('kick-cancel'):$('kick-yes')).focus();}else if(e.code!=='Enter'&&e.code!=='Space')return;e.stopImmediatePropagation();},true);
setInterval(()=>{if(playing&&!$('pause').hidden)refreshRoomList();},1000);
function joinConnection(c,session){
 if(!validPeerId(c.peer)){c.close();return;}
 let joined=false,rejected=false,farewell=false,readyTimer,inputWindow=0,inputCount=0,lastPong=0;const active=()=>session.active&&networkSession===session;
 const reject=message=>{rejected=true;sendPacket(c,{type:'error',message});session.after(300,()=>c.close());};
 const handshake=session.after(12000,()=>{if(!joined)c.close();});
 c.eject=()=>{rejected=true;joined=false;session.cancel(handshake);session.cancel(readyTimer);sendPacket(c,{type:'kicked'});session.after(300,()=>c.close());};
 const leave=()=>{session.cancel(handshake);session.cancel(readyTimer);if(!active()||!joined||connections.get(c.peer)!==c)return;joined=false;connections.delete(c.peer);const p=state.players[c.peer];if(p&&!p.loading&&!farewell){holdSeat(p,session);return;}if(p)freeBody(p);delete state.players[c.peer];fillRoomBots();};
 const onInput=m=>{
  const p=state.players[c.peer];if(!p||p.loading)return;p.seen=Date.now();const t=performance.now();if(t-inputWindow>1000){inputWindow=t;inputCount=0;}if(++inputCount>INPUT_RATE_LIMIT)return;
  acceptInput(p,m.input,true);if(Number.isFinite(m.stamp)&&t-lastPong>=250){lastPong=t;if(!sendFast(c.fast,JSON.stringify({pong:m.stamp})))sendPacket(c,{type:'pong',stamp:m.stamp},{volatile:true});}
 };
 c.on('open',()=>{if(!active())return;c.fast=openFastChannel(c,data=>{if(!active()||!joined||rejected||typeof data!=='string'||data.length>1024)return;let m;try{m=JSON.parse(data);}catch{return;}if(m&&typeof m==='object')onInput(m);});watchConnection(c,()=>{if(active())c.close();});});
 c.on('data',m=>{
  if(!active()||rejected||!m||typeof m!=='object')return;
  if(joined&&state.players[c.peer])state.players[c.peer].seen=Date.now();
  if(m.type==='hello'&&!joined){
   if(m.protocol!==NETWORK_PROTOCOL){reject('Versione diversa: entrambi i giocatori devono ricaricare il gioco.');return;}
   if(kicked.peers.has(c.peer)||typeof m.token==='string'&&kicked.tokens.has(m.token)||typeof m.device==='string'&&kicked.devices.has(m.device)){reject(KICKED_TEXT);return;}
   if(connections.has(c.peer)){reject('Operatore già collegato.');return;}
   const players=Object.values(state.players),capacity=(state.teamSize||2)*2,seat=typeof m.token==='string'&&m.token?players.find(p=>p.token===m.token):null;
   if(seat){takeSeat(seat,c,session);joined=true;session.cancel(handshake);connections.set(c.peer,c);c.sentState=null;sendPacket(c,{type:'welcome',protocol:NETWORK_PROTOCOL,id:c.peer,state:snapshotForNetwork(state),room,token:seat.token});pushDeltas();return;}
   // A seat held for someone who may come back gives way to someone who is here.
   if(players.filter(p=>!p.bot).length>=capacity){const held=players.find(p=>p.away&&!connections.has(p.id));if(!held){reject('La stanza è piena ('+capacity+' giocatori).');return;}session.cancel(held.seatTimer);delete state.players[held.id];}
   if(players.length>=capacity){const bot=replaceableBot(players.filter(q=>!q.heldBy),m.team,state.teamSize||2);if(bot)delete state.players[bot.id];}
   const p=addPlayer(c.peer,m.name,m.team,false,m.finishes,m.weapon,m.operator);if(!p){reject('Nessun posto disponibile.');return;}
   p.device=typeof m.device==='string'?m.device.slice(0,40):'';p.loading=true;p.hp=0;p.invulnerable=0;p.token=Array.from(crypto.getRandomValues(new Uint8Array(12)),v=>v.toString(16).padStart(2,'0')).join('');readyTimer=session.after(45000,()=>{if(p.loading){farewell=true;c.close();}});joined=true;session.cancel(handshake);connections.set(c.peer,c);fillRoomBots();c.sentState=null;sendPacket(c,{type:'welcome',protocol:NETWORK_PROTOCOL,id:c.peer,state:snapshotForNetwork(state),room,token:p.token});pushDeltas();event({kind:'info',text:p.name+' è entrato nella stanza'});
  }else if(m.type==='ready'&&joined){const p=state.players[c.peer];if(p?.loading){session.cancel(readyTimer);p.loading=false;spawn(p);if(isRoundMode(state.mode)&&state.phase==='live'){p.hp=0;p.dead=0;p.invulnerable=0;}sendPacket(c,{type:'state',state:snapshotForNetwork(state)});}else if(p?.away){p.away=false;remoteInputs.set(p,new InputChannel(p.life));sendPacket(c,{type:'state',state:snapshotForNetwork(state)});event({kind:'info',text:p.name+' è rientrato'});}}
  else if(m.type==='input'&&joined)onInput(m);
  else if(m.type==='beat'&&joined){const p=state.players[c.peer];if(p&&Number.isFinite(m.stamp)){p.rtt=Math.max(0,performance.now()-m.stamp);p.rttPeak=Math.max(p.rtt,(p.rttPeak??p.rtt)*.85+p.rtt*.15);}}
  else if(m.type==='bye'&&joined){farewell=true;c.close();}
  else if(m.type==='gone'&&joined)c.close();
  else if(m.type==='buy'&&joined){const p=state.players[c.peer];if(p&&!p.loading)buyItem(state,p,String(m.item||''),clock.time);}
  else if(m.type==='sell'&&joined){const p=state.players[c.peer];if(p&&!p.loading)sellItem(state,p,String(m.item||''),clock.time);}
  else if(m.type==='buyready'&&joined){const p=state.players[c.peer];if(p)p.buyReady=state.round;}
  else if(m.type==='takeover'&&joined){const p=state.players[c.peer];if(p&&validPeerId(m.target))applyTakeover(p,m.target);}
  else if(m.type==='loadout'&&joined){const p=state.players[c.peer];if(p){const before=p.finishes;p.finishes=cleanLoadout(m.finishes);pinArms(state,p);fitAmmo(p,before);if(m.operator)p.operator=cleanOperator(m.operator);}}
 });c.on('close',leave);c.on('error',leave);
}
function receiveState(next,own=null){
 if(!validSnapshot(next,id)){console.warn('Stato della stanza scartato:',snapshotIssue(next,id));return;}
 if(next.started===state.started&&next.now<state.now)return;
 // Only state that moves time forward counts: the watchdog must see a host that sends but says nothing.
 const wasEnded=state.ended,restarted=next.started!==state.started,fresh=restarted||next.now>state.now;state=next;if(restarted)snapshots.clear();
 if(fresh){lastSnapshotAt=lastStateAt=performance.now();snapshots.push(state,lastSnapshotAt);clock.slew(state.now);}
 if(wasEnded&&!state.ended){resultHandled=null;matchStartXP=career.data.xp;kills.clear();$('feed').replaceChildren();deaths.clear();ready=false;clearActions();touch.setActive(false);document.exitPointerLock?.();$('board').hidden=true;$('pause').hidden=false;$('pausetitle').textContent='NUOVA PARTITA';$('resume').textContent='ENTRA IN CAMPO ↗';}
 kills.reconcile(state,matchNow(),presentKill);const p=state.players[id];
 if(p&&p.life!==localLife){releaseTouchHold();syncWeapon(p);clearPulses();resetPrediction();localLife=p.life;const body=p.hp>0&&p.drove===state.round;local.x=p.x;local.z=p.z;yaw=p.yaw;pitch=body?p.pitch||0:0;jump=local.y=p.y||0;local.groundY=p.groundY||0;jumpV=local.jumpV=0;local.duck=body?p.duck||0:0;if(body)holdStance(p);local.landingUntil=0;jumpRequestUntil=-Infinity;local.vx=local.vz=0;lastDeath=null;localView.reset({...local,life:p.life});clock.reset(state.now);}
 if(!p)return;applyPrediction(p);
 // The host position is compared with where this guest stood at the same point of its own input
 // timeline, so plain latency reads as no error at all. Small errors are worked off in advanceLocal.
 const gap=Math.hypot(p.x-local.x,p.z-local.z),error=own&&own.ack!==0xffff&&own.ackAge<255?drift.measure(own.ack,own.ackAge,p.x,p.z,(p.y||0)-(p.groundY||0)):null;
 if(p.hp<=0||(error??gap*.5)>DRIFT.snap){local.x=p.x;local.z=p.z;local.vx=local.vz=0;drift.reset();localView.reset({...local,life:p.life});}
 else if(error===null&&own&&Math.hypot(local.vx,local.vz)<.1&&(p.speed||0)<.1)drift.setError(p.x-local.x,p.z-local.z);
}
let lostHost=null;
async function online(create){
 if(!window.Peer){error('Modulo multiplayer non disponibile. Ricarica la pagina.');return;}
 const code=create?Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join(''):$('room').value.trim().toUpperCase();
 if(!/^[A-Z2-9]{6}$/.test(code)){error('Inserisci un codice stanza di 6 caratteri.');return;}
 disconnectNetwork();if(create)for(const list of Object.values(kicked))list.clear();host=create;training=false;room=code;mapSelect.disabled=true;for(const key of ['create','join','practice','explore'])$(key).disabled=true;status('Connessione al servizio multiplayer…');
 let session;
 const active=()=>session?.active&&networkSession===session;
 const fail=(message,seat=true)=>{if(!active())return;disconnectNetwork();if(!playing){mapLoadEpoch++;configureMap(lastGoodMap);mapSelect.value=lastGoodMap;error(message);$('practice').disabled=$('explore').disabled=false;}else{pauseGame();$('pausetitle').textContent='CONNESSIONE PERSA';$('pausetext').textContent=message;$('resume').hidden=true;$('reconnect').hidden=!seat||host;}};
 lostHost=fail;
 try{
  const candidate=new Peer(create?ROOM_PREFIX+code:undefined,{debug:0});peer=candidate;session=new NetworkSession(candidate);networkSession=session;stopTicker=startTicker(netTick);
  const timeout=session.after(16000,()=>fail('Connessione scaduta. Riprova o usa Allenamento.'));
  // Once in a match the signaling server is only needed to let new guests in: losing it hurts
  // nobody who is already connected. The host keeps trying, so invites come back by themselves.
  let opened=false,reviving=false,backoff=2000;
  const revive=()=>{if(!active())return;if(candidate.open&&!candidate.disconnected){reviving=false;signalingDown=false;return;}try{candidate.reconnect();}catch{}backoff=Math.min(30000,backoff*2);session.after(backoff,revive);};
  candidate.on('disconnected',()=>{if(!active()||!playing||!host)return;signalingDown=true;if(!reviving){reviving=true;backoff=2000;session.after(backoff,revive);}});
  candidate.on('error',e=>{if(!active()||playing||upstream?.open&&e.type!=='peer-unavailable')return;fail(e.type==='peer-unavailable'?'Stanza non trovata: controlla codice e host. Entrambi devono usare la versione aggiornata.':'Rete multiplayer non disponibile ('+e.type+'). Esci e riprova.');});
  candidate.on('open',pid=>{
   if(!active())return;if(opened){signalingDown=false;return;}opened=true;session.cancel(timeout);id=pid;
   if(create){clock.reset(Date.now());state=createMatch($('mode').value,clock.time,botDifficulty,ACTIVE_MAP,matchOptions());addPlayer(id,$('name').value,$('team').value,false,career.data.finishes);fillRoomBots();candidate.on('connection',c=>{if(active())joinConnection(c,session);else c.close();});history.replaceState(null,'',location.pathname+'?room='+room+'&map='+ACTIVE_MAP);start();return;}
   status('Collegamento diretto all’host…');const connection=candidate.connect(ROOM_PREFIX+code,{reliable:true});upstream=connection;
   let pending=session.after(NO_PATH_MS,()=>fail('Collegamento diretto non riuscito: la tua rete e quella dell’host non riescono a parlarsi. Capita su alcune reti mobili e aziendali: prova un’altra rete, per esempio il Wi-Fi, oppure chiedi a un altro di creare la stanza.'));
   let welcoming=false,latest=null;
   const take=(view,own=null)=>{if(!view)return;if(playing)receiveState(view,own);else if(welcoming)latest=view;};
   const onFrame=data=>{const frame=decodeFrame(data);if(!frame)return;const view=mirror.frame(frame);if(view){const net=view.players[pid]?.net;take(view,net?frame.players.find(e=>e.net===net):null);}};
   connection.on('open',()=>{if(!active())return;session.cancel(pending);pending=session.after(30000,()=>fail('Impossibile completare l’ingresso. L’host deve restare aperto: riprova tra poco.'));status('Verifica della stanza…');
    guestFast=openFastChannel(connection,data=>{if(!active())return;lastPacketAt=performance.now();if(typeof data!=='string'){onFrame(data);return;}try{const m=JSON.parse(data);if(Number.isFinite(m?.pong))ping=Math.max(0,Math.min(9999,Date.now()-m.pong));}catch{}});
    watchConnection(connection,()=>fail('La rete si è interrotta. Puoi rientrare nella stanza: il tuo posto resta libero per un minuto.'));
    sendPacket(connection,{type:'hello',protocol:NETWORK_PROTOCOL,name:$('name').value,team:$('team').value,finishes:career.data.finishes,operator:career.data.operator,weapon:selected,token:seatFor(code),device:deviceId()});});
   connection.on('data',async m=>{
    if(!active()||!m||typeof m!=='object')return;lastPacketAt=performance.now();
    if(m.type==='welcome'){
     if(welcoming||playing)return;
     if(m.protocol!==NETWORK_PROTOCOL||m.id!==pid||!validSnapshot(m.state,pid)){console.warn('Verifica stanza:',m.protocol===NETWORK_PROTOCOL,m.id===pid,snapshotIssue(m.state,pid));fail('Dati stanza non compatibili. Ricaricate entrambi il gioco.');return;}
     welcoming=true;latest=mirror.full(m.state);if(typeof m.token==='string')saveSeat(code,m.token);
     try{const loaded=await loadMap(m.state.map||'sahra');if(!active()||!loaded)return;session.cancel(pending);state=latest;id=pid;history.replaceState(null,'',location.pathname+'?room='+room+'&map='+ACTIVE_MAP);start();sendPacket(connection,{type:'ready'});}
     catch{fail('Impossibile caricare la mappa della stanza. Riprova.');}
    }else if(m.type==='state'&&validSnapshot(m.state,pid))take(mirror.full(m.state));
    else if(m.type==='delta')take(mirror.delta(m.delta));
    else if(m.type==='frame')onFrame(m.data);
    else if(m.type==='ping'){sendPacket(connection,{type:'beat',stamp:m.stamp},{volatile:true});}
    else if(m.type==='kicked'){forgetSeat();fail(KICKED_TEXT,false);if(playing)$('pausetitle').textContent='RIMOSSO DALLA PARTITA';}
    else if(m.type==='bye')fail('L’host ha chiuso la stanza. Esci e crea una nuova partita per continuare.',false);
    else if(m.type==='event'&&playing&&m.event&&typeof m.event==='object')event(m.event);
    else if(m.type==='pong'&&Number.isFinite(m.stamp))ping=Math.max(0,Math.min(9999,Date.now()-m.stamp));
    else if(m.type==='error')fail(typeof m.message==='string'?m.message.slice(0,240):'Impossibile entrare nella stanza.');
   });
   connection.on('close',()=>fail('Il collegamento con l’host si è chiuso: la stanza non c’è più o la rete si è interrotta.'));
   connection.on('error',()=>fail('Il collegamento con l’host è stato interrotto.'));
  });
 }catch(e){if(session)fail('Impossibile avviare il multiplayer: '+e.message);else{error('Modulo multiplayer non disponibile. Ricarica.');$('practice').disabled=$('explore').disabled=false;}}
}
// Runs on a worker timer, so a hidden tab keeps it. rAF stopping is what matters, not visibility:
// the host simulation carries on from here, and rAF simply takes over again when it returns.
function netTick(){
 if(!playing||!networkSession)return;const t=performance.now();
 if(host){if(t-lastFrameAt>120)backgroundStep(t);hostWatch(t);}else guestWatch(t);
}
function backgroundStep(t){
 const i=input();let left=Math.min(1.5,Math.max(0,(t-last)/1000));last=t;syncSmokes(state,clock.time);
 while(left>0){const slice=Math.min(left,.1);runSteps(slice,i);left-=slice;}pumpNetwork(t,i);
}
function hostWatch(t){
 if(t-watchAt<1000)return;const asleep=t-watchAt>3000,wall=Date.now();watchAt=t;
 for(const [pid,c]of connections){const p=state.players[pid];if(!p||p.loading)continue;if(asleep)p.seen=wall;else if(wall-p.seen>GUEST_SILENCE_MS){c.close();continue;}sendPacket(c,{type:'ping',stamp:t},{volatile:true});}
}
// The guest judges the link from any packet and the match from state that advances, so a host
// that is alive but stopped reads as a pause, not as a lost connection.
function guestWatch(t){
 if(t-watchAt<250)return;const asleep=t-watchAt>3000;watchAt=t;if(asleep)lastPacketAt=lastStateAt=t;
 const silent=t-lastPacketAt,stale=t-lastStateAt;netStalled=stale>750;
 if(silent>=HOST_LOST_MS){lostHost?.('L’host non risponde più: ha chiuso la pagina o il suo telefono è in blocco.');return;}
 setBanner(silent>=8000?'L’HOST NON RISPONDE · PARTITA FERMA · ATTENDI O ESCI':silent>=2000?'RICONNESSIONE…':stale>=2000?'HOST IN PAUSA · PARTITA FERMA':mirror.hostHidden?'HOST FUORI SCHERMO · LA STANZA PUÒ FERMARSI':'');
}
window.addEventListener('pagehide',e=>{if(e.persisted||!playing||!networkSession||training)return;if(host)broadcast({type:'bye'});else if(upstream?.open)sendPacket(upstream,{type:'gone'});});
const difficultyKeys=Object.keys(BOT_LEVELS);let botDifficulty='tactical';try{const saved=localStorage.getItem('ob-bot-level');if(Object.hasOwn(BOT_LEVELS,saved))botDifficulty=saved;}catch{}
function showDifficulty(){$('botlevel').value=botDifficulty;$('difficulty').innerHTML='<small>BOT</small>'+BOT_LEVELS[botDifficulty].label+' ↻';$('difficulty').setAttribute('aria-label','Difficoltà bot: '+BOT_LEVELS[botDifficulty].label+'. Clicca per cambiare.');}
$('difficulty').onclick=()=>{botDifficulty=difficultyKeys[(difficultyKeys.indexOf(botDifficulty)+1)%difficultyKeys.length];showDifficulty();try{localStorage.setItem('ob-bot-level',botDifficulty)}catch{}status('Allenamento: bot '+BOT_LEVELS[botDifficulty].label.toLowerCase()+'.');};showDifficulty();
$('explore').onclick=()=>{disconnectNetwork();host=true;training=true;resetBots();id='local';room='';clock.reset(Date.now());state=createMatch('deathmatch',clock.time,undefined,ACTIVE_MAP);state.preview=true;addPlayer(id,$('name').value,$('team').value,false,career.data.finishes);start();};
$('create').onclick=()=>online(true);$('join').onclick=()=>online(false);
$('practice').onclick=()=>{disconnectNetwork();host=true;training=true;resetBots();id='local';room='';clock.reset(Date.now());const allies=Number($('alliedbots').value),enemies=Number($('enemybots').value);state=createMatch($('mode').value,clock.time,botDifficulty,ACTIVE_MAP,{...matchOptions(),teamSize:Math.max(allies+1,enemies)});const player=addPlayer(id,$('name').value,$('team').value,false,career.data.finishes),opponent=player.team==='blue'?'orange':'blue';for(const [count,team]of [[allies,player.team],[enemies,opponent]])for(let n=0;n<count;n++)addPlayer('bot'+(++botSerial),nextBotName(Object.values(state.players),botSerial),team,true);start();};
try{$('name').value=localStorage.getItem('ob-name')||'Operatore';}catch{$('name').value='Operatore';}$('name').oninput=()=>{try{localStorage.setItem('ob-name',$('name').value);}catch{}};const invited=new URLSearchParams(location.search).get('room');if(invited){$('room').value=invited;status('Sei stato invitato nella stanza '+invited+'. Inserisci il nome e premi →.')}
$('resume').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!touch.enabled)touch.setEnabled(true);});
$('resume').onclick=()=>{if(state.ended&&host){$('board').hidden=true;notice('');lastDamageHP=100;scopeAmount=0;aim=false;mouseDown=false;resetBots();state.score={blue:0,orange:0};delete state.corsaWinner;for(const q of Object.values(state.players)){q.tier=0;q.tierKills=0;}state.killEvents=[];kills.clear();clock.reset(Date.now());state.started=clock.time;state.now=clock.time;snapshots.clear();state.ended=false;resultHandled=null;matchStartXP=career.data.xp;state.phase='waiting';state.round=0;deaths.clear();lastDeath=null;$('feed').replaceChildren();$('pausetitle').textContent='IN PAUSA';$('resume').textContent='TORNA IN CAMPO ↗';state.history=[];resetForRematch(state);for(const p of Object.values(state.players)){p.kills=p.deaths=p.assists=p.dealt=p.hs=0;if(!p.loading)spawn(p)}}enterField()};$('leave').onclick=()=>cleanup();$('reconnect').onclick=()=>{const code=room;cleanup(true);$('room').value=code;online(false);};
$('copy').onclick=async()=>{const url=location.origin+location.pathname+'?room='+room+'&map='+ACTIVE_MAP;try{await navigator.clipboard.writeText(url);$('copy').textContent='LINK COPIATO ✓';setTimeout(()=>$('copy').textContent='COPIA INVITO ↗',2200)}catch{prompt('Copia questo invito:',url)}};
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)lockLostAt=performance.now();if(armory.active||overlayOpen()||buyMenu.active){ready=false;awaitingPointerLock=false;clearActions();if(armory.active||buyMenu.active)$('pause').hidden=true;if(document.pointerLockElement)document.exitPointerLock();return;}if(touch.enabled)return;ready=document.pointerLockElement===canvas;if(ready){awaitingPointerLock=false;fallbackMouse=false;clearTimeout(lockRetry);if(hintText!==null)document.querySelector('.hint').textContent=hintText;}if(playing){if(state.ended){$('pause').hidden=true;$('board').hidden=false;return;}$('pause').hidden=ready;if(!ready){awaitingPointerLock=false;clearActions();if(!state.ended){$('pausetitle').textContent='IN PAUSA';$('pausetext').textContent=state.preview?'Visita libera in pausa. H nasconde l’HUD durante la visita.':training?'Allenamento in pausa.':'La partita online continua mentre sei in pausa.';$('resume').textContent='TORNA IN CAMPO ↗';}}}});document.addEventListener('pointerlockerror',()=>{if(!armory.active)mouseFallback();});
window.addEventListener('mousemove',e=>{if(touch.enabled||!ready||overlayOpen()||(fallbackMouse&&!aim))return;const gain=mouseGain(controls.value,camera.fov,aim&&selected===4);yaw-=e.movementX*gain;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*gain));});window.addEventListener('keydown',e=>{if(!playing||overlayOpen()||armory.active)return;if(state.preview&&ready&&e.code==='KeyH'&&!e.repeat){document.documentElement.classList.toggle('clean-view');return;}if(['Tab','Space','ArrowUp','ArrowDown','ControlLeft','ControlRight'].includes(e.code)||e.ctrlKey&&CTRL_GAME_KEYS.test(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyB'){if(!e.repeat)openBuy();return}if(e.code==='KeyE'&&!e.repeat&&ready&&requestTakeover()){keys.KeyE=false;return;}if(e.code==='Escape'&&(fallbackMouse||touch.enabled)){if(!state.ended){$('pausetitle').textContent='IN PAUSA';$('resume').textContent='TORNA IN CAMPO ↗';}ready=false;$('pause').hidden=false;clearActions();}if(e.code==='Tab')$('board').hidden=false;if(ready&&e.code==='KeyR')reloadRequested=true;if(ready&&e.code==='KeyQ'&&!e.repeat)selectWeapon(backWeapon());if(ready&&e.code==='KeyV'&&!e.repeat)selectWeapon(selected===5?backWeapon():5);if(ready&&e.code==='KeyF'&&!e.repeat)requestInspection();if(ready&&e.code==='KeyX'&&!e.repeat)utilityPulse=true;if(ready&&e.code==='KeyZ'&&!e.repeat)armSmoke();if(ready&&e.code==='KeyG'&&!e.repeat)pickGrenade(1);if(ready&&e.code==='KeyH'&&!state.preview&&!e.repeat)firePulse=true;if(ready&&e.code==='KeyT'&&!e.repeat)dropPulse=true;if(ready&&e.code==='KeyY'&&!e.repeat)bombPulse=true;if(ready&&/^Digit[1-6]$/.test(e.code))selectWeapon(Number(e.code.at(-1))-1);if(ready&&canAct(state)&&state.players[id]?.hp>0&&e.code==='Space'&&!e.repeat)jumpRequestUntil=clock.time+JUMP.bufferMs});window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Tab'&&!state.ended)$('board').hidden=true});window.addEventListener('blur',()=>{if(qaMode)return;if(playing&&ready)pauseGame();else clearActions();});document.addEventListener('visibilitychange',()=>{sfx.silence(document.hidden);if(document.hidden&&playing&&!qaMode)pauseGame();if(!document.hidden&&playing&&networkSession)holdScreen();});window.addEventListener('mousedown',e=>{if(touch.enabled||!ready||e.target!==canvas)return;if((e.button===0||e.button===2)&&spectateStep(e.button===2?-1:1))return;if(grenadePick&&grenadePick!=='smoke'&&(e.button===0||e.button===2)&&throwPicked())return;if(smokeThrow.press(e.button))return;if(e.button===0){mouseDown=true;pressTrigger();}if(e.button===2){if(selected===5&&!fallbackMouse)secondaryPulse=true;else aim=controls.value.toggleAim?!aim:true;}});window.addEventListener('mouseup',e=>{if(touch.enabled)return;{const power=smokeThrow.release(e.button,performance.now());if(power)launchSmoke(power);}if(e.button===0)mouseDown=false;if(e.button===2&&!controls.value.toggleAim)aim=false});window.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('wheel',e=>{if(ready&&!e.ctrlKey&&Math.abs(e.deltaY)>.01){if(grenadePick){pickGrenade(e.deltaY>0?1:-1);return;}if(selected===4&&aim){scopeZoom=e.deltaY<0?8:4;return;}const list=allowedWeapons(state.mode),next=weaponSwitch.wheel(e.deltaY,performance.now(),list.length);if(next!==null)cycleWeapon(e.deltaY);}},{passive:true});
function requestInspection(){const p=state.players[id],now=matchNow();inspection.request(performance.now(),ready&&p?.hp>0&&!aim&&!p.reload&&!mouseDown&&weaponSwitch.phase==='ready'&&now>=(p.equipUntil||0)&&(canAct(state)||state.phase==='freeze'),selected);}
// V42 smoke: Z takes the canister out (or puts it away); mouse release throws (utility-throw.js).
function armSmoke(){const p=state.players[id];if(!p||p.hp<=0||!(p.smokes>0)||!flashEnabled(state)||p.reload||matchNow()<(p.flashReady||0)||!(canAct(state)||state.phase==='freeze')){if(smokeThrow.active())smokeThrow.reset();return;}
 if(smokeThrow.arm(performance.now())){inspection.cancel();aim=false;mouseDown=false;sfx.equip(true);}}
// V42: one key for every grenade (G), as in classic tacticals. G takes one out, G again or the wheel picks the
// next one owned, a click throws it. The smoke keeps its own windup and long/short throws; X, Z, H stay as shortcuts.
// While a flash, HE or incendiary is chosen with G the hand shows the canister, its cap in the grenade's colour.
const GRENADE_CAPS={flash:'#d9dee0',he:'#5d6b3c',fire:'#b4442c'};
const GRENADES=[['flash','FLASH','flashes'],['smoke','FUMO','smokes'],['he','HE','hes'],['fire','FUOCO','fires']];
function ownedGrenades(){const p=state.players[id];return p&&p.hp>0&&flashEnabled(state)?GRENADES.filter(g=>(p[g[2]]||0)>0&&!(g[0]==='fire'&&state.preview)):[];}
function showGrenadePick(){let el=$('grenadepick');if(!el){if(!grenadePick)return;el=document.createElement('div');el.id='grenadepick';el.setAttribute('role','status');$('hud').append(el);}el.hidden=!grenadePick;if(!grenadePick)return;const p=state.players[id];
 el.replaceChildren(...ownedGrenades().map(g=>Object.assign(document.createElement('span'),{textContent:g[1]+' ×'+(p[g[2]]||0),className:g[0]===grenadePick?'on':''})),Object.assign(document.createElement('small'),{textContent:grenadePick==='smoke'?'rotella o G cambia · rilascia sinistro lungo, destro corto':'rotella o G cambia · clic per lanciare'}));}
function pickGrenade(step){const me=state.players[id];
 // Map visit is a practice room: the grenades are always there to try lineups (not the incendiary, which visits leave out).
 if(state.preview&&me&&flashEnabled(state)){me.flashes=Math.max(2,me.flashes||0);me.smokes=Math.max(1,me.smokes||0);me.hes=Math.max(1,me.hes||0);}
 const list=ownedGrenades();if(!list.length){cancelGrenadePick();noGrenade();return;}let at=list.findIndex(g=>g[0]===(grenadePick||lastGrenade));if(at<0)at=0;else if(grenadePick)at=(at+step+list.length)%list.length;const next=list[at][0];
 if(grenadePick==='smoke'&&next!=='smoke'&&smokeThrow.active())smokeThrow.reset();grenadePick=next;if(next==='smoke'&&!smokeThrow.active())armSmoke();else if(next!=='smoke'){inspection.cancel();aim=false;mouseDown=false;sfx.equip(true);}showGrenadePick();}
function noGrenade(){let el=$('grenadepick');if(!el){el=document.createElement('div');el.id='grenadepick';el.setAttribute('role','status');$('hud').append(el);}el.hidden=false;el.replaceChildren(Object.assign(document.createElement('small'),{textContent:flashEnabled(state)?'Nessuna granata: comprale con B nella fase d’acquisto.':'Su questa mappa non si usano granate.'}));clearTimeout(noGrenade.t);noGrenade.t=setTimeout(()=>{if(!grenadePick)el.hidden=true;},1600);}
// Touch: one GRANATA button throws the chosen grenade, the small button next to it picks the next one owned.
let touchPick='flash';
function touchGrenades(){const list=ownedGrenades();if(list.length&&!list.some(g=>g[0]===touchPick))touchPick=list[0][0];return list;}
function cycleTouchGrenade(){const list=touchGrenades();if(list.length<2)return;const at=list.findIndex(g=>g[0]===touchPick);touchPick=list[(at+1)%list.length][0];sfx.equip(true);}
function throwTouchGrenade(){if(!touchGrenades().length)return;lastGrenade=touchPick;if(touchPick==='flash')utilityPulse=true;else if(touchPick==='smoke'){smokePower=1;smokePulse=true;}else if(touchPick==='he')hePulse=true;else firePulse=true;}
function throwPicked(){const g=grenadePick;if(!g||g==='smoke')return false;lastGrenade=g;if(g==='flash')utilityPulse=true;else if(g==='he')hePulse=true;else firePulse=true;grenadePick=null;showGrenadePick();return true;}
function cancelGrenadePick(){if(!grenadePick)return;if(grenadePick==='smoke'&&smokeThrow.active()&&smokeThrow.phase!=='throw')smokeThrow.reset();grenadePick=null;showGrenadePick();}
function launchSmoke(power){if(grenadePick==='smoke'){lastGrenade='smoke';grenadePick=null;showGrenadePick();}smokePower=power;smokePulse=true;sfx.equip(true);}
function syncWeapon(p){if(selected!==p.weapon){selected=p.weapon;weaponSwitch.reset(selected);scopeAmount=0;aim=false;}}
// In Corsa the way back from the knife is the ladder weapon, whatever was held before the last step.
function backWeapon(){return state.mode==='corsa'&&selected===5?corsaWeapon(state.players[id]):weaponSwitch.previous;}
function cycleWeapon(direction){const list=allowedWeapons(state.mode).filter(i=>ownsWeapon(state,state.players[id],i)),at=list.indexOf(selected);selectWeapon(list[(at+(direction>0?1:list.length-1))%list.length]);}
function selectWeapon(i){if(grenadePick&&grenadePick!=='smoke')cancelGrenadePick();if(playing&&(!weaponAllowed(state.mode,i)||!ownsWeapon(state,state.players[id],i)))return;
 // The slot of the gun already held puts an armed canister away (it is not a switch, so nothing else would).
 if(i===selected&&smokeThrow.active()&&smokeThrow.phase!=='throw'){smokeThrow.reset();if(playing)sfx.equip(false);return;}if(!Number.isInteger(i)||i<0||i>=WEAPONS.length||!weaponSwitch.request(i,mine(i).equip))return;scopeAmount=0;sniperCycleUntil=0;aim=false;mouseDown=shotPulse=secondaryPulse=false;reloadRequested=false;inspection.cancel();selected=i;sfx.cancelReload('local');if(playing)sfx.equip(i===5);const p=state.players[id];if(p&&host)equipWeapon(p,i,clock.time);}
for(const[w,i]of WEAPONS.map((w,i)=>[w,i])){const b=document.createElement('button');b.innerHTML='<small>'+(i+1)+'</small>'+weaponIcon(i)+'<span>'+w.name+'</span>';b.title=w.name+' · '+w.label;b.onclick=()=>selectWeapon(i);$('slots').append(b)}
// V42 b3 review: the slot bar names the design each slot wears (OB-315 MAGLIO, ARTIGLIO), like the ammo panel; a long
// name drops its OB- code so the bar keeps its width.
function slotNames(){Array.from($('slots').children).forEach((b,i)=>{const f=myFinish(i),full=displayName(i,f),name=full.length>14?shortName(i,f):full,span=b.querySelector('span');if(span&&span.textContent!==name)span.textContent=name;b.title=full+' · '+mine(i).label;});}slotNames();
$('openarmory').disabled=false;
let loadoutPanel=null;
// A loadout saved (Officina, Impostazioni › ARMI, a design picked in the buy menu): rigs, names, the host's copy, the guests' packet.
// (b56 rev) The CLASSICO rig is cached under '4c': it takes the slot's finish only while CLASSICO is the slot's model
// (buildGun dresses it again when shown); its key is not a weapon index, so it was repainted factory on every save.
function dressCached(i,rig){if(i==='4c'){if(myFinish(4)?.model==='classico')applyFinish(rig.userData.knife||rig.userData.gun||rig,4,myFinish(4));return;}applyFinish(rig.userData.knife||rig.userData.gun||rig,i,myFinish(i));}
function loadoutSaved(){for(const [i,rig]of weaponCache){dressCached(i,rig);if(i!=='4c')utilities.prepareDrop(i,dropLook(i,career.data.finishes[i]));}refreshGear(true);slotNames();const p=state.players[id];if(p){const before=p.finishes;p.finishes=cleanLoadout(career.data.finishes);if(host){pinArms(state,p);fitAmmo(p,before);}}if(playing&&!host&&upstream?.open)sendPacket(upstream,{type:'loadout',finishes:career.data.finishes,operator:career.data.operator});showCareer();loadoutPanel?.sync();}
// V42 b5: a purchase (or a round) changed the design a slot fires: the hands follow (the classic sniper is a rig of its own).
const shownGear=[];function refreshGear(quiet=false){let changed=false;for(let i=0;i<5;i++){const m=myFinish(i)?.model||'stock';if(shownGear[i]!==m){shownGear[i]=m;changed=true;}}if(!changed||quiet)return;
 for(const [i,rig]of weaponCache)dressCached(i,rig);slotNames();if(displayed===4&&!!gun?.userData&&weaponCache.get(myFinish(4)?.model==='classico'?'4c':4)!==gun)buildGun(4);}
function setLoadoutModel(slot,model){const f=career.data.finishes[slot];if(!f||(f.model||'stock')===model||!(model==='stock'||variantFor(slot,model)))return;if(career.setFinish(slot,{...f,model,build:null}))loadoutSaved();}
const armory=new Armory(renderer,equipmentEnvironment.texture,selectWeapon,()=>{$('menu').hidden=playing;$('hud').hidden=!playing;$('pause').hidden=!playing;},{career,onFinish:loadoutSaved,onOperator:()=>{const p=state.players[id];if(p)p.operator=cleanOperator(career.data.operator);if(playing&&!host&&upstream?.open)sendPacket(upstream,{type:'loadout',finishes:career.data.finishes,operator:career.data.operator});}});
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
let buyKeys='cs';try{if(localStorage.getItem('ob-buykeys-v42')==='rifles')buyKeys='rifles';}catch{}
const buyMenu=new BuyMenu({onBuy:requestBuy,onSell:requestSell,onReady:requestReady,canEquip:i=>playing&&weaponAllowed(state.mode,i)&&ownsWeapon(state,state.players[id],i)&&state.players[id]?.hp>0,onEquip:i=>selectWeapon(i),heldWeapon:()=>selected,utilityOn:()=>!!MAPS[state.map]?.utility,nameOf:(i,m)=>m===undefined?displayName(i,myFinish(i)):displayName(i,{model:m}),rowOf:i=>mine(i),modelOf:i=>career.data.finishes[i]?.model||'stock',onModel:setLoadoutModel,tagOf:(i,m)=>m&&m!=='stock'?variantFor(i,m)?.tag||mine(i).label:WEAPONS[i].label,startCategory:()=>!touch.enabled&&buyKeys==='cs'?-1:2,onIntent:prefetchDesign,onOpen:()=>{ready=false;clearActions();$('pause').hidden=true;document.exitPointerLock?.();},
 // With a locked mouse the way back needs a key press: when the window ends the menu stays open as ARSENALE, and B or Esc returns to the field.
 stayOnExpiry:()=>!touch.enabled&&!fallbackMouse,
 onClose:()=>{if(!playing||state.ended||overlayOpen()||armory.active)return;enterField();}});
// B: the shop while the window is open and you are alive; otherwise the ARSENALE view (finishes stay in the lobby's Officina).
function openBuy(){if(!playing||state.ended||buyMenu.active||armory.active)return;const me=state.players[id];if(!me)return;const now=matchNow();buyMenu.open(!(canBuyNow(state,me,now)&&me.hp>0),state,me,now,teamName(me.team));}
function requestBuy(item){if(host){const p=state.players[id];if(p&&buyItem(state,p,item,clock.time))sfx.buy?.();}else if(upstream?.open)sendPacket(upstream,{type:'buy',item});}
function requestSell(item){if(host){const p=state.players[id];if(p&&sellItem(state,p,item,clock.time))sfx.buy?.();}else if(upstream?.open)sendPacket(upstream,{type:'sell',item});}
function requestReady(){if(host){const p=state.players[id];if(p)p.buyReady=state.round;}else if(upstream?.open)sendPacket(upstream,{type:'buyready'});buyMenu.close();}
// V42 b5: Impostazioni › ARMI: which design of each class is in the loadout, with its price in a round with economy.
// V42 b5 review: TASTO B (Impostazioni › ARMI): 'cs' opens on the categories (B, category, item), 'rifles' on the rifles as before.
{const row=$('buykeys'),mark=()=>{for(const b of row?.querySelectorAll('[data-keys]')||[])b.setAttribute('aria-checked',String(b.dataset.keys===buyKeys));};mark();row?.addEventListener('click',e=>{const b=e.target.closest('[data-keys]');if(!b)return;buyKeys=b.dataset.keys;try{localStorage.setItem('ob-buykeys-v42',buyKeys);}catch{}mark();});}
loadoutPanel=mountLoadout($('loadoutpanel'),{rows:['PISTOLA','MITRA','FUCILE · ATTACCO','FUCILE · DIFESA','CECCHINO','COLTELLO'].map((label,i)=>({slot:i,label,options:['stock',...(VARIANTS[i]||[]).filter(v=>!v.base).map(v=>v.id)].map(m=>{const item=i<5?slotItem(i,m):null;return {id:m,name:displayName(i,{model:m}),tag:m==='stock'?WEAPONS[i].label:variantFor(i,m)?.tag||'',price:item?(i===0?0:item.price):null};})})),get:i=>career.data.finishes[i]?.model||'stock',set:setLoadoutModel});
const pipsShown={blue:'',orange:''};
const smokeFX=new SmokeFX(scene),blastFX=new BlastFX(scene),fireFX=new FireFX(scene);smokeFX.sun=arenaSun;new CrosshairEditor(()=>[$('crosshair'),$('chpreview')]);const radar=new Radar($('radar'));let spotted=new Set(),spottedAt=0,slotsShownAt=0,shownWeapon=-1;
function hud(){
 const p=state.players[id];if(!p)return;refreshGear();const now=matchNow(),drawing=weaponSwitch.phase!=='ready'||now<(p.equipUntil||0),tactical=isRoundMode(state.mode),players=Object.values(state.players);
 putText($('hp'),String(p.hp));putText($('armor'),String(Math.ceil(p.armor||0)));putStyle($('healthbar'),'width',p.hp+'%');putStyle($('armorbar'),'width',Math.max(0,Math.min(100,p.armor||0))+'%');$('vitals').classList.toggle('low',p.hp>0&&p.hp<=30);$('vitals').classList.toggle('noarmor',!(p.armor>0));
 {const w=mine(selected),mag=selected===5?0:p.ammo[selected],reloading=selected!==5&&p.reload;if(shownWeapon!==selected){shownWeapon=selected;slotsShownAt=performance.now();$('ammoicon').innerHTML=weaponIcon(selected);$('slots').classList.toggle('long-gun',selected===4);}
  putStyle($('magbar'),'width',(selected===5?0:reloading?Math.max(0,Math.min(100,(now-(p.reloadStart||now))/Math.max(1,p.reload-(p.reloadStart||0))*100)):mag/w.mag*100)+'%');$('ammopanel').classList.toggle('reloading',!!reloading);$('ammopanel').classList.toggle('low',selected!==5&&!reloading&&mag<=Math.ceil(w.mag*.25));
  $('slots').classList.toggle('idle',performance.now()-slotsShownAt>2600&&ready);}
putText($('ammo'),selected===5?'—':String(p.ammo[selected]));putText($('reserveammo'),selected===5?'':'/ ∞');{const name=displayName(selected,myFinish(selected)),role=' / '+mine(selected).label;if(shownWeaponName!==name+role){shownWeaponName=name+role;const tail=document.createElement('span');tail.className='weapon-role';tail.textContent=role;$('weaponname').replaceChildren(name,tail);}}putText($('reloadtext'),selected===5?(drawing?'ESTRAZIONE…':now<(p.weaponReady?.[5]||0)?'RECUPERO':'G  STOCCATA'):p.reload?'RICARICA…':drawing?'ESTRAZIONE…':'R  RICARICA');putText($('blue'),String(state.score.blue));putText($('orange'),String(state.score.orange));
 putText($('matchlabel'),state.preview?'VISITA MAPPA':tactical?'ROUND '+Math.max(1,state.round)+' · PRIMI A '+matchRules(state).target:matchRules(state).label+(state.mode==='corsa'?' · PRIMO AL COLTELLO':' · '+matchRules(state).target+' KILLS'));
 const remaining=objectiveEnabled(state)&&state.objective?.status==='planted'?state.objective.explodeAt-now:tactical?(state.phase==='freeze'||state.phase==='result'?state.phaseUntil-now:state.roundEnds-now):matchRules(state).durationMs-(now-state.started),sec=Math.max(0,Math.ceil((remaining||0)/1000));
 putText($('timer'),state.ended?'FINE':state.preview||state.phase==='waiting'&&tactical?'—':Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'));
 // The pips are rebuilt only when their markup changes: ten DOM rebuilds a second cost a style pass each.
 for(const [key,el] of [['blue','bluepips'],['orange','orangepips']]){const html=rosterHTML(players,key,id,tactical);if(pipsShown[key]!==html){pipsShown[key]=html;$(el).innerHTML=html;}}
putText($('network'),state.preview?'VISITA LIBERA · H NASCONDE HUD':training?players.filter(p=>p.bot).length+' BOT · '+(BOT_LEVELS[state.difficulty]?.label||'REGOLARE'):(host?'HOST · ':ping+' MS · ')+players.length+'/'+((state.teamSize||2)*2)+(signalingDown?' · INVITI NON DISPONIBILI':''));
 if(p.hp<lastDamageHP){$('damage').style.opacity=.18;setTimeout(()=>$('damage').style.opacity=0,180);}lastDamageHP=p.hp;
 Array.from($('slots').children).forEach((b,i)=>{b.classList.toggle('active',selected===i);b.hidden=!weaponAllowed(state.mode,i)||!ownsWeapon(state,p,i);});
 // Economy: credits, reward pop, buy prompt and the bought primary in hand.
 if(state.mode==='corsa'&&p.hp>0&&selected!==5&&selected!==corsaWeapon(p))selectWeapon(corsaWeapon(p));
 const economy=economyOn(state),windowOpen=buyWindowOpen(state,now)&&p.hp>0,buyable=windowOpen&&canBuyNow(state,p,now);$('money').hidden=!economy;
 if(economy){const wallet=walletOf(p),purse=(p.drove===state.round)+'/'+(p.hp>0);putText($('moneyvalue'),(wallet||0).toLocaleString('it-IT'));if(lastMoney!==null&&purse===moneyPurse&&wallet>lastMoney){const d=$('moneydelta');d.textContent='+'+(wallet-lastMoney).toLocaleString('it-IT');d.classList.remove('pop');void d.offsetWidth;d.classList.add('pop');}lastMoney=wallet??null;moneyPurse=purse;
  if(p.primary!==shownPrimary){if(Number.isInteger(p.primary)&&p.hp>0)selectWeapon(p.primary);shownPrimary=p.primary;}if(p.hp>0&&!ownsWeapon(state,p,selected))selectWeapon(Number.isInteger(p.primary)?p.primary:0);}
 const near=economy&&p.hp>0&&Number.isInteger(p.primary)&&!onObjective(state,p)?dropNear(state,p):null,seconds=Math.max(0,Math.ceil(buyWindowLeft(state,now)/1000));
 putFlag($('buyhint'),'hidden',buyMenu.active||!(windowOpen||near||state.mode==='corsa'));
 if(state.mode==='corsa'){const step=(p.tier||0)+1,left=corsaNeeded(p)-(p.tierKills||0),next=CORSA_LADDER[(p.tier||0)+1];putText($('buyhint'),'ARMA '+step+' / '+CORSA_LADDER.length+'  ·  '+(next===undefined?'UN’ULTIMA UCCISIONE PER VINCERE':left+(left>1?' UCCISIONI':' UCCISIONE')+' PER '+WEAPONS[next].name));}
 if(near)putText($('buyhint'),'E  ·  RACCOGLI '+displayName(near.weapon,{model:near.model||'stock'}));
 else if(windowOpen)putText($('buyhint'),buyable?(touch.enabled?'ACQUISTI':'B')+'  ·  '+(state.phase==='freeze'?'FASE D’ACQUISTO':'ZONA D’ACQUISTO')+'  ·  '+seconds+' s':'FUORI DALLA ZONA D’ACQUISTO  ·  '+seconds+' s');
 buyMenu.render(state,p,now,teamName(p.team));putFlag($('touchbuy'),'hidden',false);putText($('touchbuy'),buyable?'ACQUISTI':'ARMI');putAria($('touchbuy'),buyable?'Apri gli acquisti':'Apri l’arsenale');if(near&&!windowOpen)putFlag($('buyhint'),'hidden',buyMenu.active);
 const banner=$('roundbanner');putFlag(banner,'hidden',!tactical||state.phase==='live'||state.ended||(aim&&selected===4));
 updateObjectiveHUD(p,now);
 if(!banner.hidden){
  // Freeze time briefs the side and the sites; round one also names the map, and
  // the first round after half time announces the side swap.
  const half=Math.max(1,matchRules(state).target-1),swap=state.round>1&&(state.round-1)%half===0,sites=(MAPS[state.map]?.sites||[]).map(s=>s.id).join(' o '),attacking=objectiveEnabled(state)&&p.team===state.attackTeam;
  putText($('roundtitle'),state.phase==='waiting'?'IN ATTESA DEGLI AVVERSARI':state.phase==='freeze'?(state.round===1?MAPS[state.map].lobby.name+' · ':swap?'CAMBIO LATO · ':'')+'ROUND '+state.round:state.roundWinner?(state.roundWinner===p.team?'ROUND VINTO':'ROUND PERSO'):'ROUND PAREGGIATO');banner.dataset.outcome=state.phase==='result'?(state.roundWinner?state.roundWinner===p.team?'win':'loss':'draw'):'';
  putText($('rounddetail'),state.phase==='waiting'?'Serve almeno un operatore per squadra · '+Object.values(state.players).filter(q=>!q.bot).length+'/'+(state.teamSize||2)*2+' in stanza · invita un amico dalla pausa'+(touch.enabled?'.':' (ESC).'):state.phase==='freeze'?(objectiveEnabled(state)?(attacking?'ATTACCO · porta la bomba su '+sites:'DIFESA · proteggi '+(sites.length>1?'i siti ':'il sito ')+sites.replace(' o ',' e ')):'Una vita a testa')+' · partenza tra '+sec+' s':(state.roundWinner?teamName(state.roundWinner)+' · ':'')+state.roundReason+' · prossimo round tra '+sec+' s');
 }
 if(state.ended){showResult();notice('');$('board').hidden=false;$('pausetitle').textContent='PARTITA CONCLUSA';$('resume').textContent=host?'NUOVA PARTITA ↗':'TORNA ALLA STANZA ↗';}
 else if(p.hp<=0)notice(tactical?(viewedId&&viewedId!==id?'':'ELIMINATO · ATTENDI IL PROSSIMO ROUND'):'RIENTRO TRA '+Math.max(1,Math.ceil((p.dead-now)/1000))+' s');
 else if(!tactical&&now<p.invulnerable)notice('PROTEZIONE INIZIALE');else notice('');
 $('deathcard').hidden=p.hp>0||!lastDeath||state.ended;
 if(!$('deathcard').hidden){$('killer').textContent=lastDeath.killerName;$('deathweapon').innerHTML=weaponIcon(lastDeath.weapon);$('deathweaponname').textContent=weaponName(lastDeath.weapon,lastDeath.model)+(lastDeath.headshot?' · COLPO ALLA TESTA':'');$('deathstats').textContent='';const hits=n=>n+' '+(n===1?'colpo':'colpi');$('deathrecap').innerHTML='<div><small>SUBITI</small><b>'+lastDeath.damage+'</b><span>'+hits(lastDeath.hits)+'</span></div><div><small>INFLITTI</small><b>'+(lastDeath.dealt||0)+'</b><span>'+hits(lastDeath.dealtHits||0)+'</span></div><div><small>VITA AVVERSARIO</small><b>'+(lastDeath.killerHp??'—')+'</b><span>rimasta</span></div>';}
 $('board').classList.toggle('live',!state.ended);if(!state.ended){$('resultactions').hidden=true;$('resultsummary').hidden=true;$('resulttitle').textContent='IL CAMPO PARLA.';}
 if(!$('board').hidden)$('rows').innerHTML=scoreboardHTML(state,p,{tactical,economy:economyOn(state)});
 radar.setMap(ACTIVE_MAP,MAPS[ACTIVE_MAP],WALLS,BOUNDS);if(now-spottedAt>200||now<spottedAt){spottedAt=now;spotted=spottedEnemies(p,players,wallDistance,smokeBlocks);}
 const o=objectiveEnabled(state)?state.objective:null,bomb=o&&(o.status==='dropped'||o.status==='planted'||o.carrierId&&state.players[o.carrierId]?.team===p.team)?{x:o.x,z:o.z,planted:o.status==='planted'}:null;
 const marks=players.filter(v=>v.id!==id&&!v.loading&&!v.heldBy&&(v.team===p.team||spotted.has(v.id)&&v.hp>0)).map(v=>({x:v.x,z:v.z,yaw:v.yaw||0,kind:v.team!==p.team?'enemy':v.hp>0?'ally':'dead',color:v.team==='blue'?'#7ec8ea':'#ff945d'}));
 radar.draw({x:p.x,z:p.z,yaw:p.hp>0?yaw:p.yaw||yaw},marks,bomb);
}
function advanceLocal(p,i,dt,now){if(touchHold>=0&&(!p||p.hp<=0||p.life!==touchHold))releaseTouchHold();
 if(!p||p.hp<=0){local.vx=local.vz=local.speed=0;return;}
 if(!canMove(state)){local.vx=local.vz=local.speed=0;local.y=jump;stepJump(local,dt,now);jump=local.y;jumpV=local.jumpV;return;}
 // With no word from the host for a moment the guest stops, instead of walking off and being pulled back.
 const driven=ready&&!netStalled;
 stepStance(local,driven&&i.crouch,dt);local.weapon=selected;local.yaw=yaw;local.y=jump;local.taggedUntil=p.taggedUntil;stepMovement(local,driven?i:{forward:0,side:0},dt,now);
 if(stepJump(local,dt,now,driven&&canAct(state)?jumpRequestUntil:-Infinity)){jumpRequestUntil=-Infinity;jumpPulse=true;throwJump=true;sfx.footstep({local:true,surface:surfaceAt(local.x,local.z,jump),volume:.7});}jump=local.y;jumpV=local.jumpV;
 if(!host){const fix=drift.step(dt);if(fix){const x=local.x,z=local.z;move(local,fix.x,fix.z);jump=local.y;drift.applied(local.x-x,local.z-z);}
  if(drift.refusals>1&&jumpV>0)jumpV=local.jumpV=0;const lift=drift.stepHeight(dt,jump-(local.groundY||0));if(lift)jump=local.y=Math.max(local.groundY||0,jump+lift);
  drift.noteStep(performance.now(),local.x,local.z,jump-(local.groundY||0));}
}
// Ctrl is a crouch key too. On Windows and Linux these would otherwise reach the browser; Ctrl+W, Ctrl+T and Ctrl+Tab cannot be cancelled, hence C.
const CTRL_GAME_KEYS=/^(Key[ASDRFGHQEZXVBY]|Digit[1-6]|Space)$/;
canvas.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault();},{passive:false});
// The one guard left against Ctrl+W in a live match.
window.addEventListener('beforeunload',e=>{if(playing&&!state.preview&&!state.ended)e.preventDefault();});
let spectateIndex=0,spectateShown='';
let spectateMany=false;
function showSpectating(v,count,take=false){spectateMany=!!v&&count>1;const key=v?v.id+'/'+count+'/'+take+'/'+touch.enabled:'';if(key===spectateShown)return;spectateShown=key;$('hud').classList.toggle('spectating',!!v);let el=$('spectating');if(!el){el=document.createElement('div');el.id='spectating';el.setAttribute('role','status');$('hud').append(el);}el.hidden=!v;if(v){if(touch.enabled){el.textContent='STAI GUARDANDO '+v.name.toUpperCase();if(count>1||take){const s=document.createElement('small');s.textContent=take?'PRENDI per giocare tu'+(count>1?' · PROSSIMO per cambiare':''):'tocca PROSSIMO o lo schermo per cambiare';el.append(s);}}else{el.textContent='STAI GUARDANDO '+v.name.toUpperCase()+(count>1?' · clic sinistro o destro per cambiare':'');if(take){const b=document.createElement('b');b.className='take';b.textContent='E  ·  PRENDI IL CONTROLLO';el.append(b);}}}}
// V42 b2: dead in a round, E (on touch PRENDI) takes over the bot of your team you are watching, for the rest of the
// round (takeover-rules.js). The host decides; a guest asks it. The view cuts into the body behind a short dark fade.
// V42 b8: a body taken over crouched stays crouched until its new driver presses crouch (and stands on the release), on the
// driver's screen (crouchHold, the life it holds for) and on the host for a guest (heldStance), so neither pops up on entry.
let takeShown=false,crouchHold=-1,touchHold=-1;const heldStance=new Map();
function holdStance(p){releaseTouchHold();crouchHold=(p.duck||0)>.5?p.life:-1;if(crouchHold<0||!touch.enabled)return;crouchHold=-1;if(!touch.crouching){touch.crouching=true;touchHold=p.life;$('touchcrouch')?.setAttribute('aria-pressed','true');}}
// The phone crouch toggle lit by a takeover belongs to that body only: its life ending (death, next round) turns it off again.
function releaseTouchHold(){if(touchHold<0)return;touchHold=-1;if(touch.crouching){touch.crouching=false;$('touchcrouch')?.setAttribute('aria-pressed','false');}}
const fadeEl=Object.assign(document.createElement('div'),{id:'takeoverfade'});fadeEl.setAttribute('aria-hidden','true');fadeEl.style.cssText='position:fixed;inset:0;background:#05080a;opacity:0;pointer-events:none;z-index:5';document.body.append(fadeEl);
function takeoverFade(){for(const a of fadeEl.getAnimations?.()||[])a.cancel();fadeEl.animate?.([{opacity:calmMotion.matches?.45:.85},{opacity:0}],{duration:calmMotion.matches?180:340,easing:'ease-out'});}
function takeoverTarget(){const p=state.players[id],v=viewedId&&viewedId!==id?state.players[viewedId]:null;return v&&!takeoverIssue(state,p,v,isRoundMode(state.mode))?v:null;}
function requestTakeover(){const v=takeoverTarget();if(!v)return false;keys.KeyE=false;interacting=false;if(host)return applyTakeover(state.players[id],v.id);if(upstream?.open)sendPacket(upstream,{type:'takeover',target:v.id});return true;}
function applyTakeover(p,target){const bot=state.players[target];if(!host||takeoverIssue(state,p,bot,isRoundMode(state.mode)))return false;takeOver(state,p,bot);remoteInputs.set(p,new InputChannel(p.life));resetBot(bot);if(p.id===id)adoptBody(p);else if((p.duck||0)>.5)heldStance.set(p.id,p.life);event({kind:'takeover',id:p.id,name:p.name,bot:bot.name,botId:bot.id});return true;}
// The host's own player steps into the body (a guest does the same in receiveState, when the new life arrives).
function adoptBody(p){clearPulses();syncWeapon(p);local.x=p.x;local.z=p.z;yaw=p.yaw;pitch=p.pitch||0;jump=local.y=p.y||0;local.groundY=p.groundY||0;jumpV=local.jumpV=0;local.duck=p.duck||0;local.landingUntil=0;local.vx=local.vz=0;jumpRequestUntil=-Infinity;lastDeath=null;localLife=p.life;scopeAmount=0;holdStance(p);localView.reset({x:local.x,z:local.z,y:jump,groundY:local.groundY,duck:local.duck,life:p.life});viewKick.reset();takeoverFade();}
// The credits a player sees: in a body, the bot's wallet he buys with; once the body has fallen, his own (purse). The wallet
// changing hands (taking over, the body falling, the hand-back) is never shown as a gain.
const walletOf=p=>p.hp<=0&&Number.isFinite(p.purse)?p.purse:p.money;
// A player who leaves in the middle of a takeover hands the body back to the bot at once.
function freeBody(p){const bot=releaseTakeover(state,p);if(bot)resetBot(bot);}
function spectateStep(step){const p=state.players[id];if(!p||p.hp>0||!isRoundMode(state.mode)||viewedId===id)return false;spectateIndex+=step;return true;}
function deathView(p,now,dt){
 const death=p.death||lastDeath;if(death&&!lastDeath)lastDeath=death;
 // V42: while dead, left and right click (on touch, SPARA) move through the living teammates.
 const age=death?now-death.time:2000,allies=Object.values(state.players).filter(v=>v.id!==id&&v.team===p.team&&v.hp>0).sort((a,b)=>a.id<b.id?-1:1),ally=allies.length?allies[((spectateIndex%allies.length)+allies.length)%allies.length]:null;
 viewedId=age>1300&&ally&&isRoundMode(state.mode)?ally.id:id;takeShown=viewedId!==id&&!takeoverIssue(state,p,ally,true);showSpectating(viewedId!==id?ally:null,allies.length,takeShown);
 if(viewedId!==id){
  const v=avatars.get(ally.id)?.userData.presentation||ally,origin=[v.x,eyeHeight(v),v.z],back=[Math.sin(v.yaw),.12,Math.cos(v.yaw)],len=Math.hypot(...back),dir=back.map(x=>x/len),dist=Math.max(.1,wallDistance(origin,dir,2.3)-.25);
  camera.position.set(origin[0]+dir[0]*dist,origin[1]+dir[1]*dist,origin[2]+dir[2]*dist);camera.rotation.set(v.pitch||0,v.yaw,0);
 }else{
  const u=Math.min(1,Math.max(0,age/850)),origin=[p.x,1.25+(p.y||0),p.z],back=[Math.sin(p.yaw),0,Math.cos(p.yaw)],dist=Math.max(.05,wallDistance(origin,back,1.8)-.2);
  camera.position.set(p.x+back[0]*dist*(.4+.6*u),(p.y||0)+1.55-u*.65,p.z+back[2]*dist*(.4+.6*u));camera.rotation.set(p.pitch||0,p.yaw,u*.12);
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
 if(p.reload&&p.reloadStart!==localReloadKey){localReloadKey=p.reloadStart;sfx.reload('local',selected,mine(selected).reload);}else if(!p.reload&&localReloadKey){localReloadKey=0;sfx.cancelReload('local');}
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
 if(v.reload&&v.reloadStart&&g.userData.reloadKey!==v.reloadStart){g.userData.reloadKey=v.reloadStart;sfx.reload(v.id,v.weapon,gunOf(v).reload,[pose.x,(pose.y||0)+1.15,pose.z]);}else if(!v.reload&&g.userData.reloadKey){g.userData.reloadKey=0;sfx.cancelReload(v.id);}
 const moved=Math.hypot(pose.x-st.x,pose.z-st.z),ground=groundHeight(pose.x,pose.z),height=(pose.y||0)-ground,airborne=height>.12;st.x=pose.x;st.z=pose.z;
 if(airborne)st.peak=Math.max(st.peak,height);
 const near=Math.hypot(pose.x-camera.position.x,pose.z-camera.position.z)<34,foot=[pose.x,ground+.05,pose.z];
 if(st.air&&!airborne){if(near&&st.peak>.25)sfx.footstep({position:foot,heavy:true,surface:surfaceAt(pose.x,pose.z,pose.y),muffled:occluded([pose.x,ground+.4,pose.z])});st.dist=.5;st.peak=0;}
 else if(!st.air&&airborne&&near)sfx.footstep({position:foot,surface:surfaceAt(pose.x,pose.z,pose.y),muffled:occluded([pose.x,ground+.4,pose.z]),volume:.6});
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

function runSteps(elapsed,i){
 let first=true,p=state.players[id];
 const steps=clock.advance(elapsed,(step,now)=>{
  p=state.players[id];advanceLocal(p,i,step,now);
  if(host&&p){acceptInput(p,{...i,x:local.x,z:local.z,y:jump,fire:i.fire&&(first||mine(selected).auto),reload:i.reload&&first,at:viewClock()});if(first&&i.fire&&shotPulse&&shotAim)remoteInputs.get(p)?.clicks.push({yaw:shotAim.yaw,pitch:shotAim.pitch,at:shotAim.at,wait:!!shotAim.serve,weapon:p.weapon,seen:performance.now()});simulate(step,now);}
  const current=state.players[id];if(current)localView.step({x:local.x,z:local.z,y:jump,groundY:local.groundY||0,duck:local.duck,life:current.life},step);
  first=false;
 });
 if(host&&steps){utilityPulse=smokePulse=hePulse=firePulse=dropPulse=bombPulse=false;shotPulse=secondaryPulse=jumpPulse=false;reloadRequested=false;}
}
// A true 20 Hz, whatever the display rate; a guest's click leaves at once instead of waiting its turn.
function pumpNetwork(t,i){
 const burst=!host&&(shotPulse&&i.fire||jumpPulse);if(t<nextSend-1.5&&!burst)return;if(t>=nextSend-1.5)nextSend=Math.max(nextSend+50,t+25);
 if(host){if(!training&&connections.size){pushFrame(t);pushDeltas();}return;}
 if(!upstream?.open)return;const wall=performance.now(),p=state.players[id];
 [i.fire&&shotPulse,i.reload,i.secondary,jumpPulse,i.flash,i.smoke,i.he,i.incendiary,i.drop,i.bomb].forEach((on,n)=>{if(on)pulseCounts[n]++;});
 if(i.fire&&shotPulse&&shotAim)clickLog.push({t:shotAim.t,s:[pulseCounts[0],+shotAim.yaw.toFixed(5),+shotAim.pitch.toFixed(5),Math.round(shotAim.at),shotAim.serve?1:0]});while(clickLog.length&&(wall-clickLog[0].t>400||clickLog.length>3))clickLog.shift();
 const packet={forward:i.forward,side:i.side,slow:i.slow,crouch:i.crouch,interact:i.interact,fire:i.fire&&mine(selected).auto,aim:i.aim,yaw:+yaw.toFixed(5),pitch:+pitch.toFixed(5),weapon:selected,life:p?.life,seq:networkSeq++,at:Math.round(viewClock()),n:pulseCounts,smokePower};
 if(clickLog.length)packet.s=clickLog.flatMap(c=>c.s);
 drift.noteSend(packet.seq,wall);const stamp=Date.now();if(!sendFast(guestFast,JSON.stringify({input:packet,stamp})))sendPacket(upstream,{type:'input',input:packet,stamp},{volatile:true});
 utilityPulse=smokePulse=hePulse=firePulse=dropPulse=bombPulse=false;shotPulse=secondaryPulse=jumpPulse=false;reloadRequested=false;
}
// Per-frame HUD writes compare with the DOM first, so an unchanged value costs no style pass and no value goes stale.
const putText=(el,v)=>{if(el.textContent!==v)el.textContent=v;},putStyle=(el,k,v)=>{v=String(v);if(el.style[k]!==v)el.style[k]=v;},putFlag=(el,k,v)=>{if(el[k]!==v)el[k]=v;},putAria=(el,v)=>{if(el.getAttribute('aria-label')!==v)el.setAttribute('aria-label',v);};
function frame(t){
 // A lost GPU context stops the drawing, not the match: left unstamped, the worker tick takes the room over.
 requestAnimationFrame(frame);if(contextLost)return;lastFrameAt=performance.now();
 // The pacer adapts only during play; a skipped vsync (half rate) leaves `last` alone so the next step covers it.
 const inPlay=playing&&ready&&document.visibilityState==='visible';if(!pacing.frame(t,inPlay&&!armory.active))return;
 const elapsed=Math.max(0,(t-last)/1000),dt=Math.min(elapsed,.05);last=t;tickFx(t/1000,dt);
 if(inPlay)frameMeter.add(elapsed*1000);
 if($('showperformance').checked&&t-metricsAt>500){metricsAt=t;const f=frameMeter.read();$('performancestats').textContent=f.fps+' FPS · p95 '+f.p95.toFixed(1)+' ms · '+f.slow+' frame >33 ms · risoluzione '+pacing.describe();}
 touch.setActive(playing&&ready&&!overlayOpen()&&!armory.active&&!buyMenu.active);
 if(playing){
  syncSmokes(state,matchNow());
  if(state.round!==presentationRound){presentationRound=state.round;deaths.clear();}let p=state.players[id];const i=input();viewKick.update(dt);
  if(ready&&mouseDown&&mine(selected).auto&&!mine(selected).melee&&p?.hp>0&&!p.reload&&p.ammo?.[selected]===0&&canAct(state)&&weaponSwitch.phase==='ready'&&t-lastDry>250){lastDry=t;sfx.dry();reloadRequested=true;}
  if(!host)predictShot(i,performance.now());
  if(!training||ready)runSteps(elapsed,i);else clock.pause();
  pumpNetwork(t,i);
  p=state.players[id];const animationNow=matchNow(),switchPose=weaponSwitch.update(dt);{const power=smokeThrow.update(t,throwJump);throwJump=false;if(power)launchSmoke(power);if(smokeThrow.active()&&(!p||p.hp<=0||p.reload||weaponSwitch.phase!=='ready'))smokeThrow.reset();}const holding=!!grenadePick&&grenadePick!=='smoke'&&!smokeThrow.active(),throwing=smokeThrow.active()||holding;if(throwing&&throwRig!==(holding?grenadePick:'smoke')){throwRig=holding?grenadePick:'smoke';buildGun(5,1);gun.userData.canister?.userData.cap.color.set(holding?GRENADE_CAPS[grenadePick]:SMOKE_TINTS[cleanTint(career.data.operator?.smoke)].hex);}else if(!throwing&&throwRig){throwRig=false;buildGun(switchPose.index,1);}else if(!throwing&&switchPose.index!==displayed)buildGun(switchPose.index,switchPose.lower);
  if(p){
   if(p.hp<=0){clearPulses();scopeAmount=0;}else if(spectateShown)showSpectating(null,0);
   viewedId=id;if(aim||p.reload||!ready||weaponSwitch.phase!=='ready'||!(canAct(state)||state.phase==='freeze')||animationNow<(p.equipUntil||0)||p.blindUntil>animationNow)inspection.cancel();
   putStyle($('flash'),'opacity',ready?flashOpacity(p,animationNow):0);
   if(p.hp>0){const kick=recoilAt({...p,weapon:selected,finishes:myFinishes()},animationNow);if(!ready)localView.reset({x:local.x,z:local.z,y:jump,duck:local.duck,life:p.life});const visual=localView.sample(clock.accumulator*60)||{x:local.x,z:local.z,y:jump};viewOffsets=viewMotion(firstPersonMotion,{x:visual.x,z:visual.z,y:visual.y,groundY:visual.groundY??local.groundY??0,yaw,pitch,life:p.life,active:ready,aim:aim&&selected===4,landedAt:local.landedAt||0,impact:local.landingSpeed||0,vy:jumpV,calm:reducedMotion.matches},dt);camera.position.set(visual.x,eyeHeight(visual)+(visual.stair||0)+viewOffsets.camera,visual.z);camera.rotation.set(Math.min(1.5,pitch+kick.pitch*CAMERA_RECOIL+viewKick.camera.pitch),yaw+kick.yaw*CAMERA_RECOIL+viewKick.camera.yaw,viewKick.camera.roll);}else deathView(p,animationNow,dt);
   const cycling=selected===4?Math.max(0,Math.min(1,1-(sniperCycleUntil-animationNow)/sniperCycle())):0,scoped=aim&&selected===4&&weaponSwitch.phase==='ready'&&animationNow>=(p.equipUntil||0)&&!p.reload&&animationNow>=sniperCycleUntil&&p.hp>0&&ready;
   scopeAmount=THREE.MathUtils.damp(scopeAmount,scoped?1:0,scoped?18:25,dt);
   const targetFov=scoped?scopeFov(scopeZoom):BASE_FOV,nextFov=THREE.MathUtils.damp(camera.fov,targetFov,18,dt);
   if(Math.abs(camera.fov-nextFov)>.001){camera.fov=nextFov;camera.updateProjectionMatrix();}
   putStyle($('scope'),'display',scopeAmount>.015?'block':'none');{const lit=selected===4&&shotFlash>0&&scopeAmount>.5?(Math.min(1,shotFlash/FLASH_LIFE[4])*(calmMotion.matches?.45:.9)).toFixed(2):'0',sc=$('scope');if(sc.style.getPropertyValue('--muzzle')!==lit)sc.style.setProperty('--muzzle',lit);}putStyle($('scope'),'opacity',scopeAmount);putText($('scopezoom'),scopeZoom+'×');putFlag($('scopehint'),'hidden',!(selected===4&&p.hp>0&&(!touch.enabled||scopeAmount>.5||p.reload||animationNow<sniperCycleUntil)));if(touch.enabled){{const tc=$('touchcontrols'),hd=$('hud'),d=p.hp>0?'':spectateMany?'2':'1',sc=scopeAmount>.6?'1':'';if((tc.dataset.dead||'')!==d){if(d)tc.dataset.dead=hd.dataset.dead=d;else{delete tc.dataset.dead;delete hd.dataset.dead;}}if((hd.dataset.scoped||'')!==sc){if(sc)hd.dataset.scoped=sc;else delete hd.dataset.scoped;}}putText($('touchaim'),selected===5?'STOCCATA':aim?'ESCI OTTICA':'OTTICA');putAria($('touchaim'),selected===5?'Attacco pesante':'Attiva o disattiva ottica');putFlag($('touchaim'),'disabled',selected!==4&&selected!==5);putFlag($('touchaim'),'hidden',selected!==4&&selected!==5);putFlag($('touchreload'),'hidden',selected===5);putFlag($('touchtake'),'hidden',!(p.hp<=0&&takeShown));putText($('touchfire'),p.hp<=0?'PROSSIMO':selected===5?'FENDENTE':'SPARA');putAria($('touchfire'),p.hp<=0?'Guarda il prossimo compagno':selected===5?'Attacco leggero':'Spara');putText($('touchweapon'),shortName(selected,myFinish(selected))+' ↻');putFlag($('touchzoom'),'hidden',selected!==4);putText($('touchzoom'),scopeZoom+'×');}
   {const label=scopeLabel();if(scopeAmount>.015)putText($('scopemark'),label);}putText($('scopehint'),p.reload?scopeReloadText:animationNow<sniperCycleUntil?'RIARMO OTTURATORE':scopeZoom+(touch.enabled?'× · USA I PULSANTI OTTICA E ZOOM':'× · ROTELLA CAMBIA ZOOM · DESTRO MIRA'));putStyle($('crosshair'),'display',scopeAmount>.6||p.hp<=0||selected===4?'none':'block');{const gap=crosshairGap(accuracyFor({...p,duck:local.duck,speed:local.speed,y:jump,jumpV,finishes:myFinishes()},animationNow),innerHeight,camera.fov)+'px',cross=$('crosshair');if(cross.style.getPropertyValue('--gap')!==gap)cross.style.setProperty('--gap',gap);}gun.visible=p.hp>0&&scopeAmount<.88;
   // The OB-510 AVERLA's light runs the length of the piece as the left flank is held up and as the bolt opens.
   {const pr=inspection.progress(t),beats=inspectBeats(selected);if(pr>0)for(let k=0;k<beats.length;k++)if(inspectWave<beats[k]&&pr>=beats[k])pulseFx(selected);inspectWave=pr;}
   lightViewmodel(t,dt);viewOffsets.kick=viewKick.gun;(gun.userData.model?animateViewmodel:animateWeapon)(gun,{time:t,reloadTime:matchNow(),moving:ready?Math.min(1,(local.speed||0)/4.4):0,aim:aim&&selected===4,recoil,reloading:!!p.reload,reloadDuration:mine(selected).reload,inspectPose:inspection.sample(t,selected),cycling:cycling>0&&cycling<1?cycling:0,semi:selected===4&&sniperSemi(),dt,motion:viewOffsets,switchLower:switchPose.lower,strike:Math.max(0,Math.min(1,(t-knifeStrikeAt)/(knifeHeavy?420:300))),heavy:knifeHeavy,empty:selected!==5&&(p.ammo?.[selected]||0)===0,utility:throwing?(holding?Object.assign(throwPose,{pin:1,throw:0,lob:false,cook:0}):smokeThrow.pose(t,throwPose)):null});swingKits(gun,dt,yaw,pitch,reducedMotion.matches);
   muzzle.visible=selected!==5&&shotFlash>0;if(muzzle.visible&&muzzle.userData.glow)muzzle.userData.glow.material.opacity=.55*Math.min(1,shotFlash/(FLASH_LIFE[selected]??.045));handsFlash.intensity=muzzle.visible?1.3*Math.min(1,shotFlash/.03):0;if(muzzle.visible&&flashFresh){flashFresh=false;muzzle.updateWorldMatrix(true,false);muzzle.getWorldPosition(handsFlash.position);}shotFlash-=dt;recoil=Math.max(0,recoil-dt*.55);
   localAudio(p,t,animationNow);
  }
  smokeFX.update(state,animationNow,camera);blastFX.update(animationNow);fireFX.update(state,animationNow);for(const f of fireFX.expired.splice(0))if(!isRoundMode(state.mode)||state.phase==='live')effects.burn([f.x,f.y,f.z]);const utilitySounds=utilities.update(state,animationNow,dt),bomb=state.objective,bombAt=bomb?[bomb.x,groundHeight(bomb.x,bomb.z)+.2,bomb.z]:null;if(utilitySounds.beep&&bombAt)sfx.beep(bombAt);if(utilitySounds.exploded&&bombAt){sfx.explosion(bombAt);effects.explosion?.(bombAt);const d=camera.position.distanceTo(new THREE.Vector3(...bombAt));if(d<30){sfx.deafen(1-d/30,2.6);viewKick.shake(1-d/30);}}
  const renderedPlayers=host?state.players:(snapshots.sample(t)||state.players),now=matchNow();seenAt=(host?clock.time:snapshots.time??now)-presentLag(dt);seenWall=performance.now();
  camera.updateMatrixWorld();poseView.setFromProjectionMatrix(poseMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));poseFrame++;const poseShadows=renderer.shadowMap.enabled&&!!worldSun;if(worldSun)poseSun.copy(worldSun.position).sub(worldSun.target.position).normalize();
  // New bodies join at most two a frame: a full room entering at once used to build all ten in one ~60 ms frame.
  // V43 b34: the newest grenade each player has in the air drives his third-person throw (agent-gear.js), for bots, other players and a taken-over body alike.
  throwsBy.clear();for(const g of state.grenades||[]){const o=throwsBy.get(g.owner);if(!o||g.born>o.born)throwsBy.set(g.owner,g);}
  let joined=0;for(const current of Object.values(state.players)){
   if(current.hp<=0&&current.death)deaths.add(current.death.victim,current.death,avatars.get(current.id));if(current.id===id)continue;if(current.hp<=0){const dead=avatars.get(current.id);if(dead)dead.visible=false;continue;}const v=renderedPlayers[current.id]||current;
   let g=avatars.get(v.id);if(!g){if(joined>=2)continue;joined++;g=avatar(v);avatars.set(v.id,g);}
   g.visible=current.hp>0&&v.hp>0;const pose=presentAgent(g.userData.presentation,v,dt);g.userData.presentation=pose;g.position.set(pose.x,pose.y,pose.z);g.rotation.set(0,pose.yaw,0);remoteAudio(g,v,pose);
   const u=g.userData;u.poseDt=(u.poseDt||0)+dt;u.poseSlot??=poseSlots++;
   if(u.life!==v.life||u.weapon!==v.weapon||poseVisible(pose,poseShadows)||(poseFrame+u.poseSlot)%3===0){const poseDt=Math.min(u.poseDt,.15);u.poseDt=0;
    if(!animateAgent(g,poseDt,pose.speed>.2,v.weapon,pose.speed,{...pose,life:v.life,time:now,reloading:!!v.reload,reloadDuration:gunOf(v).reload,reloadProgress:v.reload?(now-(v.reloadStart||now))/ (gunOf(v).reload*1000):0,throwAge:throwsBy.has(v.id)?now-throwsBy.get(v.id).born:undefined,throwKind:throwsBy.get(v.id)?.kind||'flash'}))animateOperator(g,poseDt,pose.speed>.2);
   }else if(u.gun?.userData.flash)u.gun.userData.flash.visible=performance.now()<(u.flashUntil||0);const finish=v.finishes?.[v.weapon];if(g.userData.appliedFinish!==finish||g.userData.appliedWeapon!==v.weapon){applyFinish(g.userData.gun,v.weapon,finish);g.userData.appliedFinish=finish;g.userData.appliedWeapon=v.weapon;if(!seenFinishes.has(v.id))seenFinishes.set(v.id,[]);seenFinishes.get(v.id)[v.weapon]=finish;utilities.prepareDrop(v.weapon,dropLook(v.weapon,finish));}dressOperator(g,v.team,v.operator);
  }
  for(const[k,g]of avatars)if(!state.players[k]){releaseAvatar(g);avatars.delete(k);}
  if(t-lastHUD>100){lastHUD=t;hud();}
 }else{
  camera.fov=68;camera.updateProjectionMatrix();const a=reducedMotion.matches?0:t*.000013,shot=MAPS[ACTIVE_MAP].menuCamera;if(shot){
   // Street-level hero shot with a slow sideways dolly; the look point stays fixed so the landmark holds frame.
   const [px,py,pz]=shot.position,[lx,ly,lz]=shot.look,dx=lx-px,dz=lz-pz,len=Math.hypot(dx,dz)||1,sway=Math.sin(a*8)*.7;camera.position.set(px-dz/len*sway,py+Math.sin(a*5)*.08,pz+dx/len*sway);camera.lookAt(lx,ly,lz);}else{camera.position.set(6.4+Math.sin(a)*.35,3.1,16.9);camera.lookAt(-5,4,-5);}
 }
 effects.update(dt);deaths.update(playing?matchNow():0);listenerAudio(t);const sky=mapScene?.userData.atmosphere?.material.uniforms.time;if(sky)sky.value=t/1000;streetClock.value=t/1000;mapScene?.userData.skylife?.update(t/1000);mapScene?.userData.motes?.update(camera,t/1000,renderer.getDrawingBufferSize(drawSize).y);
 if(armory.active){armory.render(innerWidth,innerHeight,dt);return;}
 renderer.autoClear=true;if(postfx?.enabled)postfx.render(scene,camera,dt);else renderer.render(scene,camera);
 if(playing&&gun.visible){renderer.autoClear=false;renderer.clearDepth();renderer.render(handsScene,handsCamera);}
 if(!postfx?.enabled)sealCanvasAlpha();
}
requestAnimationFrame(frame);
// Local QA hook (only with ?qa=1): inspect state and aim the camera without pointer lock.
if(qaMode)window.__ob={maps:MAPS,armory,deaths,utilities,assets:{createAgent,animateAgent,dressOperator,operatorDebug},get state(){return state;},get scene(){return scene;},handsCamera,get mapScene(){return mapScene;},wallDistance,effects,sfx,viewKick,postfx,renderer,camera,flashLights,smokeFX,inspection,THREE,get rewind(){return lastRewind;},get rewindClamped(){return rewindClamped;},get viewed(){return viewedId;},get ping(){return ping;},aim(y,p=0){yaw=y;pitch=p;},holdFlash(seconds=1){shotFlash=seconds;},inspect(){inspection.request(performance.now(),true,selected);},get local(){return local;},get gun(){return gun;},emit:e=>event(e),send:m=>!host&&upstream?.open&&sendPacket(upstream,m),get net(){return {drift,mirror,pendingShots,netStalled,banner:shownBanner,fast:guestFast?.readyState,signalingDown,connections,host};}};
window.addEventListener('resize',()=>{sizeRenderer(renderer,innerWidth,innerHeight,viewDpr(),pacing.scale);camera.aspect=handsCamera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();handsCamera.updateProjectionMatrix()});
$('quality').disabled=false;document.querySelectorAll('[data-controls]').forEach(b=>b.disabled=false);
const graphicsLabels={realistic:'GRAFICA: REALISTICA',sharp:'GRAFICA: NITIDA',flat:'GRAFICA: NITIDA · NO OMBRE'};
function applyGraphics(){
 if(postfx)postfx.enabled=graphicsMode==='realistic';const shadows=graphicsMode!=='flat';
 if(renderer.shadowMap.enabled!==shadows){renderer.shadowMap.enabled=shadows;for(const root of [scene,...[...mapScenes.values()].map(v=>v.scene)])root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)m.needsUpdate=true;});}
 $('quality').textContent=graphicsLabels[graphicsMode];try{localStorage.setItem('ob-graphics-v28',graphicsMode);}catch{}
}
$('quality').title='Realistica: occlusione ambientale, bloom fisico e color grading HDR. Nitida: rendering diretto. Risoluzione nativa e antialiasing sempre attivi.';
$('quality').onclick=()=>{const list=GRAPHICS.filter(m=>m!=='realistic'||postfx);graphicsMode=list[(list.indexOf(graphicsMode)+1)%list.length];applyGraphics();warmArena();warmCombatants();};applyGraphics();
function matchOptions(){return {teamSize:Number($('teamsize').value),fillBots:$('fillbots').checked,economy:playlist==='squadra'||$('mode').value==='demolition'&&$('economy').checked,botWeapon:$('botequipment').value,target:Number($('matchtarget').value),...(isRoundMode($('mode').value)?{roundMs:Number($('matchduration').value)}:{durationMs:Number($('matchduration').value)})};}
function showCareer(){$('careerbrief').textContent='LIVELLO '+String(career.level).padStart(2,'0')+' / '+career.data.xp.toLocaleString('it-IT')+' XP · '+(1000-career.data.xp%1000).toLocaleString('it-IT')+' AL PROSSIMO · '+career.totalKills+' ELIMINAZIONI';}
function showResult(){
 if(resultHandled!==state.started){resultHandled=state.started;career.complete(state,id);ready=false;clearActions();aim=false;document.exitPointerLock?.();showCareer();}
 const p=state.players[id],other=p.team==='blue'?'orange':'blue',draw=state.score.blue===state.score.orange,won=state.score[p.team]>state.score[other];$('resulttitle').textContent=state.corsaWinner?(state.corsaWinner.id===id?'PRIMO AL TRAGUARDO.':state.corsaWinner.name.toUpperCase()+' VINCE.'):draw?'PAREGGIO.':won?'VITTORIA.':'SCONFITTA.';
 $('resultsummary').hidden=false;const mvp=Object.values(state.players).filter(q=>!q.spectator).sort((a,b)=>(b.kills||0)-(a.kills||0)||(b.dealt||0)-(a.dealt||0)||(a.deaths||0)-(b.deaths||0))[0];
  $('resultsummary').textContent=(mvp&&(mvp.kills||0)>0?'MVP '+(mvp.id===id?'TU':mvp.name.toUpperCase())+' · ':'')+p.kills+' eliminazioni / '+p.deaths+' morti · +'+Math.max(0,career.data.xp-matchStartXP)+' XP · LIVELLO '+String(career.level).padStart(2,'0')+' · '+(1000-career.data.xp%1000).toLocaleString('it-IT')+' XP al prossimo';
 $('resultactions').hidden=false;$('rematch').disabled=!host;$('rematch').textContent=host?'RIVINCITA ↗':'IN ATTESA DELL’HOST';$('pause').hidden=true;
}
$('rematch').onclick=()=>{$('board').hidden=true;$('resume').click();};$('exitresults').onclick=cleanup;
function describeMode(){const mode=$('mode').value,rules=modeRules(mode,ACTIVE_MAP),target=$('matchtarget'),duration=$('matchduration');
 target.replaceChildren();for(const v of isRoundMode(mode)?[5,7,9]:[10,20,30,50]){const o=document.createElement('option');o.value=v;o.textContent=v+(isRoundMode(mode)?' round':' eliminazioni');target.append(o);}target.value=rules.target;
 duration.replaceChildren();for(const v of isRoundMode(mode)?[60000,90000,120000]:[300000,480000,600000]){const o=document.createElement('option');o.value=v;o.textContent=isRoundMode(mode)?v/1000+' s / round':v/60000+' minuti';duration.append(o);}duration.value=isRoundMode(mode)?rules.roundMs:rules.durationMs;
 updateModeDescription();
}
function updateModeDescription(){const mode=$('mode').value,target=$('matchtarget').value,seconds=Number($('matchduration').value)/1000,map=MAPS[ACTIVE_MAP],lobby=map.lobby,sites=map.sites?.length||0,time=v=>Math.floor(v/60)+':'+String(v%60).padStart(2,'0');
 $('modedescription').textContent=mode==='corsa'?'Sei armi · due uccisioni a gradino · finisci col coltello · una coltellata ti fa scendere.':mode==='demolition'?(map.pool==='binomio'?'Un sito bomba, round rapidi · E tenuto piazza o disinnesca · X flashbang · cambio lato a metà.':'Attacco e difesa su due siti · E tenuto piazza o disinnesca · X flashbang · cambio lato a metà.'):'Tutte le armi · rientro dopo 3 s · vince la squadra che arriva prima a '+target+' eliminazioni.';
 document.querySelector('.paneltop>small').textContent=map.short+' / '+modeLabel(ACTIVE_MAP,mode);
 const facts=mode==='demolition'?['Bomba · '+(sites>1?sites+' siti':'1 sito'),lobby.lanes,'Round '+time(seconds),'Primi a '+target]:mode==='corsa'?['Corsa alle armi',lobby.lanes,modeRules(mode,ACTIVE_MAP).durationMs/60000+' minuti','Sei armi · coltello finale']:['Deathmatch a squadre',lobby.lanes,seconds/60+' minuti','Primi a '+target];
 $('mapfacts').replaceChildren(...facts.map(t=>Object.assign(document.createElement('li'),{textContent:t})));
 document.querySelector('.intro>.eyebrow').textContent=mode==='demolition'?lobby.kicker:(mode==='corsa'?'CORSA ALLE ARMI · ':'DEATHMATCH · ')+lobby.subtitle;$('matchtarget').parentElement.hidden=$('matchduration').parentElement.hidden=mode==='corsa';syncPlaylist();}
$('mode').onchange=describeMode;for(const key of ['matchtarget','matchduration'])$(key).onchange=updateModeDescription;
function showBotOptions(){if(typeof syncTrainingCard==='function'&&!$('trainingcard').hidden)syncTrainingCard();$('practice').textContent=$('alliedbots').value+($('alliedbots').value==='1'?' ALLEATO + ':' ALLEATI + ')+$('enemybots').value+($('enemybots').value==='1'?' AVVERSARIO':' AVVERSARI');}
for(const key of ['alliedbots','enemybots'])$(key).onchange=showBotOptions;
$('botlevel').value=botDifficulty;$('botlevel').onchange=()=>{botDifficulty=$('botlevel').value;showDifficulty();try{localStorage.setItem('ob-bot-level',botDifficulty);}catch{}};
status(mobileDevice?'Comandi touch · telefono in orizzontale consigliato':'PC e mouse · C o CTRL accovacciati · SHIFT cammina');showCareer();syncMapModes();describeMode();showBotOptions();startupReady=true;{const since=performance.now();offField=()=>playing?!buyMenu.active&&(state.phase==='result'||!(state.players[id]?.hp>0)):performance.now()-since>1500;}preloadDesigns(offField);$('create').disabled=$('join').disabled=$('practice').disabled=$('explore').disabled=false;mapSelect.disabled=false;$('assetprogress').value=100;sfx.open();$('loading').hidden=true;(window.requestIdleCallback||setTimeout)(()=>{sfx.prepare();warmClassicRig().catch(e=>console.warn('CLASSICO',e?.message||e));},{timeout:600});
// V44: the six whole-body operators (V42 bA: once the CORAZZA body) load after the start-up, one after the other (no one waits
// for them on the loading screen; a bot or a player wearing one asks for its own first), their programs are compiled
// under the arena's lights like every combatant's, and an open Officina preview is dressed again once it is there.
// Only its own programs and textures, compiled in parallel: a whole warm-up here showed as 60-80 ms frames on a phone that was already in a match.
loadArmour().then(async ok=>{if(!ok)return;const g=warmSet.armour??=armourWarmParts();const culled=[];g.traverse(m=>{if(m.isMesh){m.frustumCulled=false;culled.push(m);for(const t of Object.values(m.material))if(t?.isTexture)renderer.initTexture(t);}});
 const run=async()=>{scene.add(g);try{if(postfx?.enabled)await postfx.compile(g,camera,scene);else if(renderer.compileAsync)await renderer.compileAsync(g,camera,scene);}finally{scene.remove(g);}};await (warmQueue=warmQueue.then(run,run));armory.previewOperator();}).catch(e=>console.warn('Operatori',e?.message||e));
// An open Officina preview shows a whole-body operator as soon as its own body is there, not when all six are.
onBodyReady(()=>armory.previewOperator());

const preferenceFields=['mode','teamsize','alliedbots','enemybots','botequipment','matchtarget','matchduration'];
// Saved match options belong to the map they were chosen on (Binomio and
// Squadra have different round lengths and targets).
try{const v=JSON.parse(localStorage.getItem('ob-match-options-v1')||'null');if(v&&v.map===ACTIVE_MAP){if([...$('mode').options].some(o=>o.value===v.mode&&!o.disabled))$('mode').value=v.mode;describeMode();for(const key of preferenceFields)if([...$(key).options].some(o=>o.value===v[key]))$(key).value=v[key];$('fillbots').checked=v.fillbots===true;$('economy').checked=v.economy!==false;updateModeDescription();showBotOptions();}}catch{}
function saveMatchPreferences(){try{if(ACTIVE_MAP==='sahra')localStorage.setItem('ob-sahra-v24','1');const v={map:ACTIVE_MAP,fillbots:$('fillbots').checked,economy:$('economy').checked};for(const key of preferenceFields)v[key]=$(key).value;localStorage.setItem('ob-match-options-v1',JSON.stringify(v));}catch{}}
syncMapModes(false);
for(const key of [...preferenceFields,'fillbots','economy'])$(key).addEventListener('change',saveMatchPreferences);

// The reflections live only on the lost GPU, so drawing comes back with a reload; the match does not need it.
const reloadAdvice=()=>networkSession&&host?'La stanza continua per gli altri: ricaricando la chiudi per tutti.':networkSession?'Ricarica per tornare in campo: il tuo posto resta libero per un minuto.':'Ricarica il gioco per ripristinare la grafica.';
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;pauseGame();$('loading').hidden=false;$('loading-message').textContent='La connessione con la GPU è stata interrotta. '+reloadAdvice();$('retryload').hidden=false;});
canvas.addEventListener('webglcontextrestored',()=>{$('loading-message').textContent='La GPU è nuovamente disponibile. '+reloadAdvice();});

// Each map exposes only its curated formats; the first is its showcase mode.
function modeLabel(map,mode){return mode==='demolition'?(MAPS[map].pool==='binomio'?'BINOMIO':'SQUADRA'):modeRules(mode).label;}
function syncMapModes(selectDefault=true){
 const map=MAPS[ACTIVE_MAP],big=map.pool==='squadra';
 for(const o of $('mode').options)o.hidden=o.disabled=!mapAllowsMode(ACTIVE_MAP,o.value);
 $('mode').querySelector('[value="demolition"]').textContent=map.pool==='binomio'?'Binomio · bomba, un sito':'Squadra · bomba, due siti';
 for(const o of $('teamsize').options)if(Number(o.value)>3)o.hidden=o.disabled=!big;
 for(const [key,max]of [['alliedbots',2],['enemybots',3]])for(const o of $(key).options)if(Number(o.value)>max)o.hidden=o.disabled=!big;
 if(!big){if(Number($('teamsize').value)>3)$('teamsize').value='2';if(Number($('alliedbots').value)>2)$('alliedbots').value='1';if(Number($('enemybots').value)>3)$('enemybots').value='2';}
 if(selectDefault){if(big){$('teamsize').value='5';$('alliedbots').value='4';$('enemybots').value='5';}else{$('teamsize').value='2';$('alliedbots').value='1';$('enemybots').value='2';}}
 else if(big&&!sahraSeen()){$('teamsize').value='5';$('alliedbots').value='4';$('enemybots').value='5';}
 showBotOptions();
 if(selectDefault||!mapAllowsMode(ACTIVE_MAP,$('mode').value)){$('mode').value=(playlist==='deathmatch'||playlist==='corsa')&&mapAllowsMode(ACTIVE_MAP,playlist)?playlist:defaultMode(ACTIVE_MAP);describeMode();}
}
// V44: on a phone the objective card stays through the buy time, speaks for 6 s once the round goes live and again when
// its title, the round or the bomb carrier changes, and stays while you plant or defuse; then it steps aside (style.css fades .stepaside in touch mode) so the field of view stays clear.
let objectiveKey='',objectiveShown=0;
function updateObjectiveHUD(p,now){
 // Ten times a second: every write below only touches the DOM when the value changed (a phone pays a style pass per write).
 const enabled=objectiveEnabled(state),o=state.objective;putFlag($('objectivepanel'),'hidden',!enabled||!o);putFlag($('utilityreadout'),'hidden',!flashEnabled(state));
 putText($('utilityreadout'),(touch.enabled?'FLASH × ':'G  GRANATE  ·  X  FLASH × ')+(p.flashes||0)+(touch.enabled?'  ·  FUMO × ':'  ·  Z  FUMO × ')+(p.smokes||0)+(p.hes?'  ·  HE × '+p.hes:'')+(p.fires?(touch.enabled?'  ·  FUOCO × ':'  ·  H  FUOCO × ')+p.fires:'')+(p.kit?'  ·  KIT':'')+(touch.enabled?'  ·  ISPEZIONE':'  ·  F  ISPEZIONA'));
 // Touch: one grenade button (the chosen one and its count) and ⇄ to change it; the HE and fire shortcuts stay hidden.
 {const list=touchGrenades(),g=list.find(x=>x[0]===touchPick);putFlag($('touchflash'),'hidden',!flashEnabled(state)||!list.length);putFlag($('touchflash'),'disabled',!g||now<(p.flashReady||0));putText($('touchflash'),g?g[1]+' '+(p[g[2]]||0):'GRANATA');putAria($('touchflash'),'Lancia '+(g?g[1].toLowerCase():'granata'));putFlag($('touchsmoke'),'hidden',list.length<2);putFlag($('touchsmoke'),'disabled',false);putText($('touchsmoke'),'⇄');putAria($('touchsmoke'),'Cambia granata');putFlag($('touchhe'),'hidden',true);putFlag($('touchincendiary'),'hidden',true);}const objectiveAction=enabled&&onObjective(state,p)&&!['defused','exploded'].includes(state.objective?.status),swap=!objectiveAction&&state.phase==='live'&&p.hp>0&&Number.isInteger(p.primary)&&!!dropNear(state,p);putFlag($('touchinteract'),'hidden',!objectiveAction&&!swap);if(swap)putText($('touchinteract'),'RACCOGLI');putFlag($('touchinteract'),'disabled',state.phase!=='live'||p.hp<=0);putFlag($('touchbomb'),'hidden',!enabled||o?.status!=='carried'||o.carrierId!==id||state.phase!=='live');
 if(!enabled||!o)return;const attack=p.team===state.attackTeam,carrier=state.players[o.carrierId];
 const single=(MAPS[ACTIVE_MAP].sites||[]).length===1;putText($('objective-role'),(attack?'ATTACCO':'DIFESA')+' / '+MAPS[ACTIVE_MAP].short);
 let title=attack?(single?'CONQUISTA IL SITO A':'CONQUISTA UN SITO A/B'):(single?'DIFENDI IL SITO A':'DIFENDI I SITI A/B'),detail=attack?(o.carrierId===p.id?(single?'Hai la bomba · raggiungi A e tieni '+(touch.enabled?'PIANTA':'E'):'Hai la bomba · raggiungi A o B e tieni '+(touch.enabled?'PIANTA':'E'))+(touch.enabled?'.':' · Y la lascia.'):'Bomba: '+(carrier?.name||'a terra')+' · scorta il portatore.'):touch.enabled?'Ferma il piazzamento, poi tieni DISINNESCA vicino alla bomba.':'Impedisci il piazzamento. Dopo il piazzamento tieni E vicino alla bomba.';
 if(o.status==='dropped'){title='BOMBA A TERRA';detail=attack?'Raccoglila avvicinandoti.':'Sorveglia la bomba.';}
 if(o.status==='planted'){title='BOMBA PIAZZATA / '+o.site;detail=attack?'Proteggi il sito fino alla detonazione.':'Avvicinati e tieni '+(touch.enabled?'DISINNESCA':'E')+' per '+(p.kit?'2,5':'5')+' secondi.';}
 if(o.status==='defused'||o.status==='exploded'){title=o.status==='defused'?'BOMBA DISINNESCATA':'BOMBA ESPLOSA';detail='Round concluso';}
 if(o.actorId===id){title=o.status==='planted'?'DISINNESCO IN CORSO':'PIAZZAMENTO IN CORSO';detail=touch.enabled?'Tieni premuto · muoverti o rilasciare interrompe.':'Tieni E · muoverti o rilasciare interrompe l’azione.';}
 {const key=title+'|'+state.round+'|'+(state.phase==='live')+'|'+(o.carrierId||''),panel=$('objectivepanel'),t=performance.now();if(key!==objectiveKey){objectiveKey=key;objectiveShown=t;}const quiet=o.actorId!==id&&state.phase!=='freeze'&&t-objectiveShown>6000;if(panel.classList.contains('stepaside')!==quiet)panel.classList.toggle('stepaside',quiet);}
 putText($('objective-title'),title);putText($('objective-detail'),detail);const progress=$('objective-progress');putFlag(progress.parentElement,'hidden',o.actorId!==id);putStyle(progress,'width',(o.progress||0)*100+'%');
 if(objectiveAction)putText($('touchinteract'),o.status==='planted'?'DISINNESCA':'PIANTA');
}

$('visitpoint').onchange=()=>{
 if(!state.preview)return;
 const q=MAPS[ACTIVE_MAP].visits?.[$('visitpoint').value];if(!q||blocked(q[0],q[1]))return;
 const p=state.players[id];if(!p)return;clearActions();p.x=local.x=q[0];p.z=local.z=q[1];p.groundY=local.groundY=groundHeight(p.x,p.z);p.y=jump=local.y=p.groundY;p.yaw=yaw=q[2];p.pitch=pitch=0;jumpV=local.jumpV=local.vx=local.vz=0;localView.reset({...local,life:p.life});
};
