import * as THREE from './vendor/three.module.js';
// Wind-borne motes drawn entirely on the GPU: positions wrap around the camera,
// so the field never needs CPU updates, allocation or culling bookkeeping.
const VERTEX=`attribute float seed;uniform float uTime,uRadius,uHeight,uSize,uScale;uniform vec3 uCenter,uWind;varying float vAlpha;
void main(){
 vec3 p=position*vec3(2.*uRadius,uHeight,2.*uRadius)+uWind*uTime;
 p+=vec3(sin(uTime*.31+seed*6.28),sin(uTime*.47+seed*11.)*.4,cos(uTime*.27+seed*9.))*.35;
 p.xz=mod(p.xz-uCenter.xz+uRadius,2.*uRadius)-uRadius+uCenter.xz;p.y=mod(p.y-(uCenter.y-1.6),uHeight)+uCenter.y-1.6;
 vec4 mv=modelViewMatrix*vec4(p,1.);float d=-mv.z;
 vAlpha=smoothstep(.6,2.2,d)*(1.-smoothstep(uRadius*.55,uRadius,d))*(.55+.45*fract(seed*7.13));
 gl_PointSize=uSize*uScale/max(d,.1);gl_Position=projectionMatrix*mv;
}`;
const FRAGMENT=`uniform vec3 uColor;uniform float uOpacity;varying float vAlpha;void main(){vec2 c=gl_PointCoord-.5;float a=smoothstep(.5,.1,length(c))*vAlpha*uOpacity;if(a<.004)discard;gl_FragColor=vec4(uColor,a);}`;
export function createMotes(scene,{count=900,color=0xd8c4a0,size=.045,radius=18,height=7,wind=[.55,.02,.18],opacity=.32}={}){
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(count*3),seeds=new Float32Array(count);let s=1234;const r=()=>{s=(s*16807)%2147483647;return s/2147483647;};
 for(let i=0;i<count;i++){positions[i*3]=r();positions[i*3+1]=r();positions[i*3+2]=r();seeds[i]=r();}
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 const material=new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uRadius:{value:radius},uHeight:{value:height},uSize:{value:size},uScale:{value:900},uCenter:{value:new THREE.Vector3()},uWind:{value:new THREE.Vector3(...wind)},uColor:{value:new THREE.Color(color)},uOpacity:{value:opacity}}});
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=5;scene.add(points);
 const motes={points,update(camera,time,height){material.uniforms.uTime.value=time;material.uniforms.uCenter.value.copy(camera.position);material.uniforms.uScale.value=height*.5/Math.tan(camera.fov*Math.PI/360);}};
 scene.userData.motes=motes;return motes;
}
