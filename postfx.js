import * as THREE from './vendor/three.module.js';
// HDR world pipeline for the REALISTICA preset. The arena renders once into a
// multisampled half-float target; ambient obscurance, energy-conserving bloom
// and filmic grading resolve in screen space. The first-person rig is drawn
// afterwards by the caller, so obscurance never darkens hands or weapon.
const VERTEX='varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}';
const ACES=`vec3 RRTAndODTFit(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
vec3 acesFilmic(vec3 color,float exposure){
 const mat3 ACESInputMat=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));
 const mat3 ACESOutputMat=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));
 color*=exposure/.6;color=ACESInputMat*color;color=RRTAndODTFit(color);color=ACESOutputMat*color;return clamp(color,0.,1.);}
vec3 toSRGB(vec3 c){return mix(pow(c,vec3(.41666))*1.055-vec3(.055),c*12.92,vec3(lessThanEqual(c,vec3(.0031308))));}`;
// Screen-space obscurance from depth alone: normals are reconstructed from the
// flattest neighbour, samples follow a rotated golden-angle disc of fixed metric radius.
const AO_FRAGMENT=`varying vec2 vUv;uniform sampler2D tDepth;uniform mat4 uProjInv;uniform vec2 uTexel,uInvSize,uFade;uniform float uProjScale,uRadius,uIntensity,uBias;
vec3 viewPos(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=uProjInv*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
void main(){
 float d=texture2D(tDepth,vUv).x;if(d>=.99999){gl_FragColor=vec4(1.,1e4,0.,1.);return;}
 vec3 P=viewPos(vUv),r=viewPos(vUv+vec2(uTexel.x,0.)),l=viewPos(vUv-vec2(uTexel.x,0.)),u=viewPos(vUv+vec2(0.,uTexel.y)),b=viewPos(vUv-vec2(0.,uTexel.y));
 vec3 dx=abs(r.z-P.z)<abs(P.z-l.z)?r-P:P-l,dy=abs(u.z-P.z)<abs(P.z-b.z)?u-P:P-b,N=normalize(cross(dx,dy));
 float depth=-P.z,rad=min(uRadius*uProjScale/max(.1,depth),96.);
 if(rad<1.5){gl_FragColor=vec4(1.,depth,0.,1.);return;}
 float noise=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))),occ=0.;
 for(int i=0;i<14;i++){
  float fi=float(i)+noise,a=fi*2.39996323,t=(float(i)+.5)/14.;
  vec3 v=viewPos(vUv+vec2(cos(a),sin(a))*rad*sqrt(t)*uInvSize)-P;float vv=dot(v,v);
  occ+=max(0.,dot(v,N)*inversesqrt(vv+1e-4)-uBias)*clamp(1.-vv/(uRadius*uRadius),0.,1.);
 }
 float ao=clamp(1.-occ/14.*uIntensity*(1.-smoothstep(uFade.x,uFade.y,depth)),0.,1.);
 gl_FragColor=vec4(ao,depth,0.,1.);
}`;
const BLUR_FRAGMENT=`varying vec2 vUv;uniform sampler2D tAO;uniform vec2 uDir;
void main(){vec2 c=texture2D(tAO,vUv).rg;float z=c.y,sum=c.x,w=1.;
 for(int i=1;i<=4;i++)for(int s=-1;s<=1;s+=2){vec2 q=texture2D(tAO,vUv+uDir*float(i*s)).rg;float k=exp(-float(i*i)*.16)*max(0.,1.-abs(q.y-z)/(z*.05+.04));sum+=q.x*k;w+=k;}
 gl_FragColor=vec4(sum/w,z,0.,1.);}`;
const DOWN_FRAGMENT=`varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uTexel;uniform float uThreshold,uKnee;uniform bool uPrefilter;
vec3 s(float x,float y){return texture2D(tSrc,vUv+vec2(x,y)*uTexel).rgb;}
float karis(vec3 c){return 1./(1.+dot(c,vec3(.2126,.7152,.0722)));}
void main(){
 vec3 a=s(-2.,2.),b=s(0.,2.),c=s(2.,2.),d=s(-2.,0.),e=s(0.,0.),f=s(2.,0.),g=s(-2.,-2.),h=s(0.,-2.),i=s(2.,-2.),j=s(-1.,1.),k=s(1.,1.),l=s(-1.,-1.),m=s(1.,-1.),col;
 if(uPrefilter){
  vec3 g0=(a+b+d+e)*.25,g1=(b+c+e+f)*.25,g2=(d+e+g+h)*.25,g3=(e+f+h+i)*.25,g4=(j+k+l+m)*.25;
  float w0=karis(g0)*.125,w1=karis(g1)*.125,w2=karis(g2)*.125,w3=karis(g3)*.125,w4=karis(g4)*.5;
  col=(g0*w0+g1*w1+g2*w2+g3*w3+g4*w4)/(w0+w1+w2+w3+w4);
  float br=max(col.r,max(col.g,col.b)),soft=clamp(br-uThreshold+uKnee,0.,2.*uKnee);soft=soft*soft/(4.*uKnee+1e-4);
  col*=max(soft,br-uThreshold)/max(br,1e-4);
 }else col=e*.125+(a+c+g+i)*.03125+(b+d+f+h)*.0625+(j+k+l+m)*.125;
 gl_FragColor=vec4(min(col,vec3(64.)),1.);
}`;
const UP_FRAGMENT=`varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uTexel;uniform float uScatter;
void main(){vec2 d=uTexel;vec3 c=texture2D(tSrc,vUv+vec2(-d.x,d.y)).rgb+texture2D(tSrc,vUv+vec2(0.,d.y)).rgb*2.+texture2D(tSrc,vUv+vec2(d.x,d.y)).rgb
 +texture2D(tSrc,vUv+vec2(-d.x,0.)).rgb*2.+texture2D(tSrc,vUv).rgb*4.+texture2D(tSrc,vUv+vec2(d.x,0.)).rgb*2.
 +texture2D(tSrc,vUv+vec2(-d.x,-d.y)).rgb+texture2D(tSrc,vUv+vec2(0.,-d.y)).rgb*2.+texture2D(tSrc,vUv+vec2(d.x,-d.y)).rgb;
 gl_FragColor=vec4(c/16.*uScatter,1.);}`;
// V31 light shafts: from every pixel, march toward the sun's screen position and
// count how much open sky lies on the way; dust in the air turns that into visible
// rays and a sun halo. Half resolution, 32 dithered taps, no extra scene pass.
const RAYS_FRAGMENT=`varying vec2 vUv;uniform sampler2D tDepth;uniform vec2 uSun;uniform float uStrength;
void main(){
 if(uStrength<=0.){gl_FragColor=vec4(0.,0.,0.,1.);return;}
 float noise=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
 vec2 delta=(uSun-vUv)/32.;vec2 uv=vUv+delta*noise;float illum=0.,decay=1.;
 for(int i=0;i<32;i++){uv+=delta;vec2 c=clamp(uv,0.,1.);float sky=step(.99999,texture2D(tDepth,c).x)*step(length(uv-c),.0001);illum+=sky*decay;decay*=.955;}
 gl_FragColor=vec4(vec3(illum/32.*uStrength),1.);
}`;
const COMPOSITE_FRAGMENT=`varying vec2 vUv;uniform sampler2D tColor,tDepth,tAO,tBloom,tRays;uniform vec2 uAOSize,uSun;uniform bool uUseAO;
uniform float uNear,uFar,uExposure,uBloom,uAO,uSaturation,uContrast,uVignette,uGrain,uTime,uAOColor,uRays,uAspect;uniform vec3 uShadowTint,uHighTint,uSunColor;
${ACES}
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float aoAt(vec2 uv,float z){
 vec2 p=uv*uAOSize-.5,f=fract(p),t=1./uAOSize,base=(floor(p)+.5)*t;
 vec2 q0=texture2D(tAO,base).rg,q1=texture2D(tAO,base+vec2(t.x,0.)).rg,q2=texture2D(tAO,base+vec2(0.,t.y)).rg,q3=texture2D(tAO,base+t).rg;
 vec4 w=vec4((1.-f.x)*(1.-f.y),f.x*(1.-f.y),(1.-f.x)*f.y,f.x*f.y)*exp(-abs(vec4(q0.y,q1.y,q2.y,q3.y)-z)/(z*.025+.03))+1e-5;
 return dot(vec4(q0.x,q1.x,q2.x,q3.x),w)/dot(w,vec4(1.));
}
void main(){
 vec3 c=texture2D(tColor,vUv).rgb;
 float d=texture2D(tDepth,vUv).x;
 if(uUseAO&&d<.99999){
  float z=(uNear*uFar)/(uFar-(uFar-uNear)*d),ao=mix(1.,aoAt(vUv,z),uAO);
  // Multi-bounce approximation: bright surfaces lose less energy in creases.
  float albedo=clamp(dot(c,vec3(.3333))*uAOColor,0.,.9);vec3 A=vec3(2.0404*albedo-.3324),B=vec3(-4.7951*albedo+.6417),C=vec3(2.7552*albedo+.6903);
  c*=max(vec3(ao),((ao*A+B)*ao+C)*ao);
 }
 c+=texture2D(tBloom,vUv).rgb*uBloom;
 if(uRays>0.){
  float rays=texture2D(tRays,vUv).r;vec2 sd=(vUv-uSun)*vec2(uAspect,1.);float dist=dot(sd,sd);
  // Shafts over the whole frame, a soft aureole and a tight disc glow where the sun is unobstructed.
  float atSun=texture2D(tRays,uSun).r;
  c+=uSunColor*(rays*uRays*1.6+atSun*uRays*(exp(-dist*14.)*.9+exp(-dist*160.)*2.2));
 }
 c=acesFilmic(c,uExposure);
 float l=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(l),c,uSaturation)*mix(uShadowTint,uHighTint,smoothstep(.04,.62,l));
 vec3 s=toSRGB(max(c,vec3(0.)));
 s=mix(s,s*s*(3.-2.*s),uContrast);
 vec2 q=vUv-.5;s*=1.-uVignette*smoothstep(.12,.62,dot(q,q)*2.);
 s+=(hash(gl_FragCoord.xy+fract(uTime*7.31)*vec2(97.,131.))-.5)*uGrain*(1.-s*.55);
 s+=(hash(gl_FragCoord.yx*1.37+19.)-.5)/255.;
 gl_FragColor=vec4(clamp(s,0.,1.),1.);
}`;
// Map grading keeps team colours readable: restrained saturation and split toning only.
export const GRADES={
 caldera:{exposure:1.0,saturation:1.09,contrast:.22,shadow:[.95,.985,1.045],high:[1.05,1.005,.94],vignette:.17,bloom:.055,ao:.92,rays:.3,sun:[1,.93,.8]},
 forge:{exposure:1.0,saturation:1.06,contrast:.2,shadow:[.95,.985,1.05],high:[1.04,1.0,.96],vignette:.17,bloom:.05,ao:.92,rays:.26,sun:[1,.95,.85]},
 sahra:{exposure:.97,saturation:1.08,contrast:.25,shadow:[.97,.98,1.03],high:[1.055,1.0,.93],vignette:.16,bloom:.06,ao:.94,rays:.5,sun:[1,.86,.62]}
};
export function supportsPostFX(renderer){return renderer.capabilities.isWebGL2&&(renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float'));}
export class PostFX{
 constructor(renderer,{levels=5}={}){
  this.renderer=renderer;this.enabled=false;this.width=0;this.height=0;this.time=0;this.grade=GRADES.caldera;
  const hdr={type:THREE.HalfFloatType,format:THREE.RGBAFormat,depthBuffer:false,generateMipmaps:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
  this.depth=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  this.world=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,samples:Math.min(4,renderer.capabilities.maxSamples||4),depthBuffer:true,stencilBuffer:false,depthTexture:this.depth,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});
  this.aoA=new THREE.WebGLRenderTarget(1,1,hdr);this.aoB=new THREE.WebGLRenderTarget(1,1,hdr);this.rays=new THREE.WebGLRenderTarget(1,1,hdr);
  this.sunDirection=new THREE.Vector3(-.5,.7,-.5).normalize();this.sunView=new THREE.Vector4();this.raysStrength=0;
  this.levels=Array.from({length:levels},()=>new THREE.WebGLRenderTarget(1,1,hdr));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  this.quad=new THREE.Mesh(geometry);this.quad.frustumCulled=false;this.quadScene=new THREE.Scene();this.quadScene.add(this.quad);this.quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const material=(fragmentShader,uniforms,extra={})=>new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader,uniforms,depthTest:false,depthWrite:false,toneMapped:false,...extra});
  this.aoMaterial=material(AO_FRAGMENT,{tDepth:{value:this.depth},uProjInv:{value:new THREE.Matrix4()},uTexel:{value:new THREE.Vector2()},uInvSize:{value:new THREE.Vector2()},uFade:{value:new THREE.Vector2(38,70)},uProjScale:{value:1},uRadius:{value:.7},uIntensity:{value:1.35},uBias:{value:.06}});
  this.blurMaterial=material(BLUR_FRAGMENT,{tAO:{value:null},uDir:{value:new THREE.Vector2()}});
  this.raysMaterial=material(RAYS_FRAGMENT,{tDepth:{value:this.depth},uSun:{value:new THREE.Vector2(.5,.5)},uStrength:{value:0}});
  this.downMaterial=material(DOWN_FRAGMENT,{tSrc:{value:null},uTexel:{value:new THREE.Vector2()},uThreshold:{value:1.35},uKnee:{value:.55},uPrefilter:{value:false}});
  this.upMaterial=material(UP_FRAGMENT,{tSrc:{value:null},uTexel:{value:new THREE.Vector2()},uScatter:{value:.72}},{blending:THREE.AdditiveBlending,transparent:true});
  this.compositeMaterial=material(COMPOSITE_FRAGMENT,{tColor:{value:this.world.texture},tDepth:{value:this.depth},tAO:{value:this.aoA.texture},tBloom:{value:this.levels[0].texture},uAOSize:{value:new THREE.Vector2()},uUseAO:{value:true},uNear:{value:.05},uFar:{value:200},uExposure:{value:1},uBloom:{value:.06},uAO:{value:.9},uAOColor:{value:1.15},uSaturation:{value:1},uContrast:{value:.15},uVignette:{value:.15},uGrain:{value:.018},uTime:{value:0},uShadowTint:{value:new THREE.Vector3(1,1,1)},uHighTint:{value:new THREE.Vector3(1,1,1)},tRays:{value:this.rays.texture},uRays:{value:0},uSun:{value:new THREE.Vector2(.5,.5)},uSunColor:{value:new THREE.Vector3(1,.9,.7)},uAspect:{value:1}});
 }
 setGrade(key){this.grade=GRADES[key]||GRADES.caldera;const g=this.grade,u=this.compositeMaterial.uniforms;u.uSaturation.value=g.saturation;u.uContrast.value=g.contrast;u.uVignette.value=g.vignette;u.uBloom.value=g.bloom;u.uAO.value=g.ao;u.uShadowTint.value.fromArray(g.shadow);u.uHighTint.value.fromArray(g.high);u.uSunColor.value.fromArray(g.sun||[1,.9,.7]);this.raysStrength=g.rays||0;}
 // World direction toward the sun (the shadow-casting light's position).
 setSun(direction){this.sunDirection.copy(direction).normalize();}
 // Screen position of the sun for this frame; rays fade as the sun leaves the view.
 placeSun(camera){
  const v=this.sunView.set(this.sunDirection.x,this.sunDirection.y,this.sunDirection.z,0).applyMatrix4(camera.matrixWorldInverse);
  if(v.z>=-.02){this.raysMaterial.uniforms.uStrength.value=0;this.compositeMaterial.uniforms.uRays.value=0;return;}
  v.set(v.x*1000,v.y*1000,v.z*1000,1).applyMatrix4(camera.projectionMatrix);const x=v.x/v.w,y=v.y/v.w,off=Math.max(0,Math.max(Math.abs(x),Math.abs(y))-1),fade=Math.max(0,1-off/1.6);
  this.raysMaterial.uniforms.uSun.value.set(x*.5+.5,y*.5+.5);this.raysMaterial.uniforms.uStrength.value=fade*this.raysStrength;
  const c=this.compositeMaterial.uniforms;c.uSun.value.copy(this.raysMaterial.uniforms.uSun.value);c.uRays.value=fade*this.raysStrength>0?1:0;c.uAspect.value=this.width/Math.max(1,this.height);
 }
 setSize(width,height){
  width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));if(width===this.width&&height===this.height)return;this.width=width;this.height=height;
  this.world.setSize(width,height);const hw=Math.max(1,Math.ceil(width/2)),hh=Math.max(1,Math.ceil(height/2));this.aoA.setSize(hw,hh);this.aoB.setSize(hw,hh);this.rays.setSize(hw,hh);
  this.levels.forEach((t,i)=>t.setSize(Math.max(1,width>>(i+1)),Math.max(1,height>>(i+1))));
  this.aoMaterial.uniforms.uTexel.value.set(1/width,1/height);this.aoMaterial.uniforms.uInvSize.value.set(1/hw,1/hh);this.compositeMaterial.uniforms.uAOSize.value.set(hw,hh);
 }
 // Precompile the arena's render-target shader variants while a loading state is visible.
 async compile(scene,camera,target=null){const r=this.renderer,previous=r.getRenderTarget();r.setRenderTarget(this.world);try{if(r.compileAsync)await r.compileAsync(scene,camera,target);else r.compile(scene,camera,target);}finally{r.setRenderTarget(previous);}}
 pass(material,target,clear=true){const r=this.renderer;this.quad.material=material;r.setRenderTarget(target);r.autoClear=clear;r.render(this.quadScene,this.quadCamera);}
 render(scene,camera,dt=0){
  const r=this.renderer,size=r.getDrawingBufferSize(this.size??=new THREE.Vector2());this.setSize(size.x,size.y);this.time+=dt;
  r.setRenderTarget(this.world);r.autoClear=true;r.render(scene,camera);
  const ao=this.aoMaterial.uniforms,hw=this.aoA.width,hh=this.aoA.height;
  ao.uProjInv.value.copy(camera.projectionMatrixInverse);ao.uProjScale.value=camera.projectionMatrix.elements[5]*.5*hh;
  this.pass(this.aoMaterial,this.aoA);
  this.blurMaterial.uniforms.tAO.value=this.aoA.texture;this.blurMaterial.uniforms.uDir.value.set(1/hw,0);this.pass(this.blurMaterial,this.aoB);
  this.blurMaterial.uniforms.tAO.value=this.aoB.texture;this.blurMaterial.uniforms.uDir.value.set(0,1/hh);this.pass(this.blurMaterial,this.aoA);
  this.placeSun(camera);if(this.raysMaterial.uniforms.uStrength.value>0)this.pass(this.raysMaterial,this.rays);
  const down=this.downMaterial.uniforms;let source=this.world.texture,sw=this.width,sh=this.height;
  for(let i=0;i<this.levels.length;i++){down.tSrc.value=source;down.uTexel.value.set(1/sw,1/sh);down.uPrefilter.value=i===0;this.pass(this.downMaterial,this.levels[i]);source=this.levels[i].texture;sw=this.levels[i].width;sh=this.levels[i].height;}
  const up=this.upMaterial.uniforms;
  for(let i=this.levels.length-1;i>0;i--){const src=this.levels[i];up.tSrc.value=src.texture;up.uTexel.value.set(1/src.width,1/src.height);this.pass(this.upMaterial,this.levels[i-1],false);}
  const c=this.compositeMaterial.uniforms;c.uNear.value=camera.near;c.uFar.value=camera.far;c.uExposure.value=r.toneMappingExposure*this.grade.exposure;c.uTime.value=this.time;
  this.pass(this.compositeMaterial,null);r.autoClear=true;
 }
 dispose(){for(const t of [this.world,this.aoA,this.aoB,this.rays,...this.levels])t.dispose();this.depth.dispose();for(const m of [this.aoMaterial,this.blurMaterial,this.raysMaterial,this.downMaterial,this.upMaterial,this.compositeMaterial])m.dispose();this.quad.geometry.dispose();}
}
