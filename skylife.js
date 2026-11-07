import * as THREE from './vendor/three.module.js';
// V31 sky life: a flock circling high over the district, drawn as one geometry whose
// vertex shader moves and flaps every bird. Silhouettes only (unlit, fogged), so they
// read as distant life against the sky and never as targets. Sahra gets desert
// kites in a slow thermal, Caldera gulls working the sea wind, Forge choughs over the crags.
const FLOCKS={
 sahra:{count:16,center:[4,38,-6],radius:[14,30],speed:[.08,.14],span:1.5,color:0x2a2420,wing:[1.4,2.2]},
 forge:{count:9,center:[0,42,-20],radius:[18,34],speed:[.1,.16],span:1.2,color:0x2b2f33,wing:[1.6,2.4]},
 caldera:{count:11,center:[-6,24,22],radius:[10,22],speed:[.14,.22],span:1.1,color:0xe8e4da,wing:[2.6,3.6]}
};
const VERTEX=`attribute vec4 bird;attribute vec2 wing;uniform float time;uniform vec3 center;
#include <fog_pars_vertex>
void main(){
 float phase=bird.x,radius=bird.y,speed=bird.z,lift=bird.w;
 float a=phase+time*speed;
 // Thermal circle with a slow climb and sink; the bank follows the turn.
 vec3 c=center+vec3(cos(a)*radius,sin(a*.37+phase)*2.6+lift,sin(a)*radius*.82);
 vec3 fwd=normalize(vec3(-sin(a),0.,cos(a)*.82)),up=vec3(0.,1.,0.),side=normalize(cross(up,fwd));
 float flap=sin(time*wing.y+phase*7.)*.7;
 // wing.x: -1 left tip, 0 body, 1 right tip; the tips rise and fall, the body stays.
 float tip=abs(wing.x);vec3 p=c+side*(wing.x*position.x)+fwd*position.z+up*(flap*tip*position.x*.55);
 vec4 mvPosition=viewMatrix*vec4(p,1.);
 gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
}`;
const FRAGMENT=`uniform vec3 color;
#include <fog_pars_fragment>
void main(){gl_FragColor=vec4(color,1.);
#include <fog_fragment>
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function createSkylife(scene,mapId){
 const f=FLOCKS[mapId];if(!f)return null;
 let seed=mapId.length*977+13;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
 const positions=[],birds=[],wings=[];
 for(let n=0;n<f.count;n++){
  const phase=rand()*Math.PI*2,radius=f.radius[0]+rand()*(f.radius[1]-f.radius[0]),speed=f.speed[0]+rand()*(f.speed[1]-f.speed[0]),lift=(rand()-.5)*6,rate=f.wing[0]+rand()*(f.wing[1]-f.wing[0]),span=f.span*(.8+rand()*.4);
  // Two wing quads: body root to each tip, swept back a little.
  for(const side of [-1,1]){
   const tri=[[0,0,span*.22],[0,0,-span*.18],[span,0,-span*.05]];
   for(const [x,y,z]of tri){positions.push(x,y,z);birds.push(phase,radius,speed,lift);wings.push(side*(x>0?1:0),rate);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('bird',new THREE.Float32BufferAttribute(birds,4));g.setAttribute('wing',new THREE.Float32BufferAttribute(wings,2));
 const material=new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{time:{value:0},center:{value:new THREE.Vector3(...f.center)},color:{value:new THREE.Color(f.color)}}]),side:THREE.DoubleSide,fog:true});
 const mesh=new THREE.Mesh(g,material);mesh.frustumCulled=false;mesh.name='skylife';mesh.castShadow=false;mesh.receiveShadow=false;scene.add(mesh);
 const skylife={mesh,update(t){material.uniforms.time.value=t;},dispose(){mesh.removeFromParent();g.dispose();material.dispose();}};
 scene.userData.skylife=skylife;return skylife;
}
