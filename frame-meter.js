// Bounded ring buffer. No per-frame sort, DOM query or allocation.
export class FrameMeter{
 constructor(size=240){this.samples=new Float32Array(size);this.at=0;this.count=0;}
 add(ms){if(!Number.isFinite(ms)||ms<=0||ms>1000)return;this.samples[this.at]=ms;this.at=(this.at+1)%this.samples.length;this.count=Math.min(this.samples.length,this.count+1);}
 read(){if(!this.count)return {fps:0,p95:0,slow:0};const values=Array.from(this.samples.subarray(0,this.count)).sort((a,b)=>a-b);return {fps:Math.round(1000/(values[Math.floor(values.length/2)]||1)),p95:values[Math.ceil(values.length*.95)-1],slow:values.filter(v=>v>33.34).length};}
 reset(){this.at=this.count=0;}
}
