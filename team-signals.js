// V45 team signals: pings (a point or an enemy) and quick phrases, team only.
// Network: the guest sends {type:'mark'}, the host checks, rate-limits and relays it to that team.
// No effect on the arbiter, damage or hits.
export const PHRASES=['Vado A','Vado B','Serve aiuto','Ben fatto','Aspettate','Nemico qui'];
export const MARK_MS=4500,MARK_GAP_MS=600;
const finite=a=>Array.isArray(a)&&a.length===3&&a.every(v=>Number.isFinite(v)&&Math.abs(v)<2000);
export function cleanMark(m){
 if(!m||typeof m!=='object')return null;
 const point=finite(m.point)?m.point.map(v=>Math.round(v*100)/100):null,phrase=Number.isInteger(m.phrase)&&m.phrase>=0&&m.phrase<PHRASES.length?m.phrase:-1;
 if(!point&&phrase<0)return null;
 return {point,enemy:!!point&&m.enemy===true,phrase};
}
export class MarkGate{
 constructor(gap=MARK_GAP_MS){this.gap=gap;this.last=new Map();}
 allow(id,now){const t=this.last.get(id);if(Number.isFinite(t)&&now-t<this.gap)return false;this.last.set(id,now);if(this.last.size>32)this.last.delete(this.last.keys().next().value);return true;}
}
