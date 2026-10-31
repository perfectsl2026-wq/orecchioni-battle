import * as THREE from './vendor/three.module.js';
// Linear-light sky palettes. Horizon haze doubles as the arena's aerial fog colour.
export const SKIES={
 default:{zenith:[.10,.25,.52],horizon:[.62,.71,.78],ground:[.36,.35,.32],cover:.4},
 sahra:{zenith:[.17,.31,.52],horizon:[.79,.75,.67],ground:[.55,.47,.37],cover:.3},
 caldera:{zenith:[.095,.24,.52],horizon:[.63,.71,.78],ground:[.34,.37,.38],cover:.42},
 forge:{zenith:[.07,.2,.5],horizon:[.6,.69,.79],ground:[.33,.34,.33],cover:.38}
};
const FRAGMENT=`varying vec3 vSky;uniform vec3 sunDirection,zenithColor,horizonColor,groundColor;uniform float cloudCover,time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
void main(){
 vec3 d=normalize(vSky);float h=d.y,up=max(h,0.),mu=dot(d,normalize(sunDirection));
 // Rayleigh-like gradient with a bright, dusty horizon band.
 vec3 sky=mix(horizonColor,zenithColor,pow(up,.42));
 sky=mix(sky,horizonColor*1.06,exp(-up*10.)*.55);
 if(h<0.)sky=mix(horizonColor*.96,groundColor,smoothstep(0.,.22,-h));
 // Mie forward scattering: a broad warm aureole and a tighter halo around the sun.
 float s=max(mu,0.);sky+=vec3(1.,.84,.62)*(pow(s,10.)*.32+pow(s,90.)*.85)*(.55+.45*exp(-up*3.));
 if(h>0.){
  vec2 p=d.xz/(h+.12)*1.25+vec2(time*.006,time*.0022);float warp=fbm(p*.32);float c=fbm(p*.55+vec2(warp*1.5,warp*.6));
  float cov=smoothstep(1.-cloudCover-.1,1.-cloudCover+.2,c)*smoothstep(0.,.2,h);
  float shade=clamp(.7+.42*pow(s,3.)-.3*fbm(p*2.1+3.7),0.,1.15);
  vec3 cloud=mix(vec3(.56,.6,.66),vec3(1.,.96,.9),shade)*1.12;
  sky=mix(sky,cloud,cov*.82);
 }
 sky+=vec3(1.,.93,.82)*smoothstep(.99988,.999965,mu)*60.;
 gl_FragColor=vec4(sky,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function createAtmosphere(scene,renderer,palette=SKIES.default){
 const sunDirection=new THREE.Vector3(-18,25,9).normalize();
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{sunDirection:{value:sunDirection},zenithColor:{value:new THREE.Vector3(...palette.zenith)},horizonColor:{value:new THREE.Vector3(...palette.horizon)},groundColor:{value:new THREE.Vector3(...palette.ground)},cloudCover:{value:palette.cover},time:{value:0}},vertexShader:`varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:FRAGMENT});
 const geometry=new THREE.SphereGeometry(145,48,24),dome=new THREE.Mesh(geometry,material);dome.frustumCulled=false;dome.renderOrder=-100;scene.add(dome);
 const environmentScene=new THREE.Scene();environmentScene.add(new THREE.Mesh(geometry,material));
 let target={texture:null,dispose(){}};
 const capture=()=>{if(!renderer)return;const pm=new THREE.PMREMGenerator(renderer);const next=pm.fromScene(environmentScene,.025,.1,180);pm.dispose();if(scene.environment===target.texture)scene.environment=next.texture;target.dispose();target=next;atmosphere.environment=target;};
 scene.background=new THREE.Color(0xb6c9cd);scene.fog=new THREE.Fog(0xb6c9cd,65,155);scene.environmentIntensity=.62;
 const fill=new THREE.HemisphereLight(0xe0edf2,0xb3a38d,1.65);scene.add(fill);
 const sun=new THREE.DirectionalLight(0xffedda,2.95);sun.position.copy(sunDirection).multiplyScalar(32);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-25,right:25,top:27,bottom:-27,near:1,far:85});sun.shadow.normalBias=.024;sun.shadow.bias=-.00008;sun.shadow.radius=2.5;scene.add(sun);
 const atmosphere={sun,dome,environment:target,material,
  // Keep the painted sun, its aureole and the reflection capture aligned with the shadow-casting light.
  setPalette(next){material.uniforms.zenithColor.value.fromArray(next.zenith);material.uniforms.horizonColor.value.fromArray(next.horizon);material.uniforms.groundColor.value.fromArray(next.ground);material.uniforms.cloudCover.value=next.cover;},
  setSun(direction,{recapture=true}={}){sunDirection.copy(direction).normalize();if(recapture)capture();}};
 capture();scene.environment=target.texture;scene.userData.atmosphere=atmosphere;
 return atmosphere;
}
