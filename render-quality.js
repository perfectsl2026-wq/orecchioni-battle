import * as THREE from './vendor/three.module.js';
// Preserve native screen detail in every preset. Only GPU dimension limits may
// constrain the drawing buffer; shadow quality is independent of resolution.
export function renderScale(width,height,dpr=1,maxDimension=16384){
 const native=Number.isFinite(dpr)?Math.max(1,dpr):1;
 return Math.min(Math.max(1.25,native),maxDimension/Math.max(1,width,height));
}
// `scale` is the frame pacer's multiplier on the native ratio (1 = native detail).
export function sizeRenderer(renderer,width,height,dpr,scale=1){
 const gl=renderer.getContext(),limit=Math.min(renderer.capabilities.maxTextureSize,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
 renderer.setPixelRatio(renderScale(width,height,dpr,limit)*Math.max(.5,Math.min(1,scale)));renderer.setSize(width,height);
}
export function filterTextures(root,anisotropy){
 const seen=new Set();root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m)continue;
 // Cut-out leaves and plywood: alpha decides MSAA coverage, so their edges resolve like geometry.
 if(m.alphaTest>0&&!m.transparent&&!m.alphaToCoverage){m.alphaToCoverage=true;m.needsUpdate=true;}
 for(const value of Object.values(m)){if(!value?.isTexture||seen.has(value)||value.isRenderTargetTexture)continue;seen.add(value);
 const min=value.generateMipmaps&&!value.isCompressedTexture?THREE.LinearMipmapLinearFilter:value.minFilter;
 if(value.anisotropy!==anisotropy||value.magFilter!==THREE.LinearFilter||value.minFilter!==min){value.anisotropy=anisotropy;value.magFilter=THREE.LinearFilter;value.minFilter=min;value.needsUpdate=true;}
 }}});
}
