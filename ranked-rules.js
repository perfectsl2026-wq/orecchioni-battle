// V50 CLASSIFICATA. Pure rules shared by the game and the ranked server: server/ranked-rules.js is a
// byte-for-byte copy of this file (tools/check_ranked.mjs fails when the two differ).
// Division names are stones of the dry south, like the bot callsigns: original, not another game's ladder.
export const RANKED={start:1000,k:32,kPlacement:48,placement:5,minGain:4,leave:16,revision:1};
export const DIVISIONS=[
 {id:'argilla',name:'ARGILLA',from:0,color:'#b98562'},
 {id:'tufo',name:'TUFO',from:900,color:'#cdb98a'},
 {id:'arenaria',name:'ARENARIA',from:1050,color:'#e0a257'},
 {id:'porfido',name:'PORFIDO',from:1200,color:'#c2584c'},
 {id:'basalto',name:'BASALTO',from:1350,color:'#7c93a8'},
 {id:'granito',name:'GRANITO',from:1500,color:'#d6d2cb'},
 {id:'ossidiana',name:'OSSIDIANA',from:1700,color:'#8f7be6'},
 {id:'adamante',name:'ADAMANTE',from:1900,color:'#7fe3e6'}];
const STEPS=['I','II','III'];
// Where a rating sits: division, step inside it (three per division, none at the top) and progress to the next step.
export function division(rating){
 const r=Number.isFinite(rating)?Math.max(0,Math.round(rating)):RANKED.start;let index=0;for(let n=0;n<DIVISIONS.length;n++)if(r>=DIVISIONS[n].from)index=n;
 const d=DIVISIONS[index],top=index===DIVISIONS.length-1;if(top)return {index,step:0,code:index*3,id:d.id,name:d.name,label:d.name,color:d.color,from:d.from,next:null,progress:1,top:true};
 const span=(DIVISIONS[index+1].from-d.from)/3,step=Math.min(2,Math.floor((r-d.from)/span)),from=Math.round(d.from+step*span),next=Math.round(d.from+(step+1)*span);
 return {index,step,code:index*3+step,id:d.id,name:d.name,label:d.name+' '+STEPS[step],color:d.color,from,next,progress:Math.max(0,Math.min(1,(r-from)/(next-from))),top:false};
}
// The badge a player wears in a match travels as one small number: -1 while the placement matches are not done.
export const rankCode=(rating,matches)=>matches<RANKED.placement?-1:division(rating).code;
export function rankFromCode(code){
 if(!Number.isInteger(code)||code<0)return {placed:false,label:'IN VALUTAZIONE',name:'IN VALUTAZIONE',color:'#9aa3ad',index:-1,step:0};
 const index=Math.min(DIVISIONS.length-1,Math.floor(code/3)),top=index===DIVISIONS.length-1,step=top?0:code%3,d=DIVISIONS[index];
 return {placed:true,label:top?d.name:d.name+' '+STEPS[step],name:d.name,color:d.color,index,step};
}
export const expected=(own,other)=>1/(1+10**((other-own)/400));
// One player's change after a match, from the two team averages. A win always pays, a loss always costs.
export function ratingChange(matches,ownAverage,otherAverage,won){
 const k=matches<RANKED.placement?RANKED.kPlacement:RANKED.k,raw=Math.round(k*((won?1:0)-expected(ownAverage,otherAverage)));
 return won?Math.max(RANKED.minGain,raw):Math.min(-RANKED.minGain,raw);
}
// Ranked format by team size: the map each size is played on and its fixed rules. Nothing here is a player's choice.
export const rankedMap=size=>size>=4?'sahra':'caldera';
export const rankedOptions=size=>({teamSize:size,fillBots:false,economy:true});
export const cleanName=v=>String(v??'').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,16)||'Operatore';
