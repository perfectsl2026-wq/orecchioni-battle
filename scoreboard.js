// Scoreboard and top-bar roster. Both read the synced match state only, so host and
// guests draw the same numbers.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TEAMS={blue:'SCOLTA',orange:'RAZZIATORI'};
const ROUND_ICONS={
 kill:'<path d="M8 1.5a5.5 5.5 0 0 0-5.5 5.5v2.2L5 11v3h6v-3l2.5-1.8V7A5.5 5.5 0 0 0 8 1.5M5.2 6h2v2h-2zm3.6 0h2v2h-2z"/>',
 bomb:'<path d="M3 5h10v8H3zM5 3h6v2H5zm1 4v4h1V7zm3 0v4h1V7z"/>',
 defuse:'<path d="M10.5 1.5 9 3l1 1-6.5 6.5-1 3 3-1L12 6l1 1 1.5-1.5zM4 11l1 1"/>',
 time:'<path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2m.8 2.5v3.2l2.4 1.4-.7 1.2-3.1-1.8V4.5z"/>'
};
function roundStrip(state,self){
 const history=state.history||[],target=state.rules?.target||7,max=Math.max(target*2-1,history.length);let html='';
 for(let i=0;i<max;i++){const r=history[i];html+=r?'<i class="round '+(r.w||'draw')+(r.w&&r.w===self.team?' ours':'')+'" title="Round '+(i+1)+'"><svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor">'+(ROUND_ICONS[r.r]||ROUND_ICONS.kill)+'</g></svg></i>':'<i class="round empty"></i>';if(i===target-2)html+='<b class="half" aria-hidden="true"></b>';}
 return '<div class="sb-rounds" aria-label="Storico dei round">'+html+'</div>';
}
export function scoreboardHTML(state,self,{tactical,economy=false}){
 const players=Object.values(state.players),rounds=Math.max(1,(state.history||[]).length||state.round||1);
 const team=key=>{
  const list=players.filter(p=>p.team===key).sort((a,b)=>b.kills-a.kills||(b.dealt||0)-(a.dealt||0));
  const rows=list.map(p=>{const hs=p.kills?Math.round((p.hs||0)/p.kills*100):0,adr=Math.round((p.dealt||0)/rounds);
   return '<tr class="'+(p.id===self.id?'me ':'')+(p.hp<=0&&tactical?'out':'')+'"><td class="who"><i class="dot"></i><span class="nm" title="'+esc(p.name)+'">'+esc(p.name)+'</span>'+(p.bot?'<small>'+(p.heldBy?'GUIDATO':'BOT')+'</small>':'')+(p.id===self.id?'<small class="you">TU</small>':'')+'</td><td>'+p.kills+'</td><td>'+(p.assists||0)+'</td><td>'+p.deaths+'</td><td>'+(tactical?adr:(p.dealt||0))+'</td><td>'+hs+'%</td>'+(economy?'<td class="cash">'+(p.team===self.team&&!p.heldBy?((p.hp<=0&&Number.isFinite(p.purse)?p.purse:p.money)||0).toLocaleString("it-IT"):'—')+'</td>':'')+'</tr>';}).join('');
  return '<section class="sb-team '+key+(key===self.team?' ours':'')+'"><header><b>'+TEAMS[key]+'</b><span>'+(key===self.team?'LA TUA SQUADRA':'AVVERSARI')+'</span><strong>'+state.score[key]+'</strong></header><table><thead><tr><th>OPERATORE</th><th title="Uccisioni">K</th><th title="Assist">A</th><th title="Morti">M</th><th title="'+(tactical?'Danni medi per round':'Danni inflitti')+'">'+(tactical?'DANNI/R':'DANNI')+'</th><th title="Uccisioni alla testa">TESTA</th>'+(economy?'<th>CREDITI</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table></section>';
 };
 const order=self.team==='orange'?['orange','blue']:['blue','orange'];
 return (tactical?roundStrip(state,self):'')+team(order[0])+team(order[1]);
}
const initials=name=>{const n=String(name).trim(),digits=n.match(/\d+/);return (digits?n[0]+digits[0]:n.slice(0,2)).toUpperCase().slice(0,3);};
// Top bar: one tile per operator, alive or out, with a thin health line.
export function rosterHTML(players,key,selfId,tactical){
 return players.filter(p=>p.team===key).sort((a,b)=>(a.id===selfId?-1:0)-(b.id===selfId?-1:0)||String(a.id).localeCompare(String(b.id))).map(p=>{const out=tactical&&p.hp<=0;
  return '<i class="pip'+(out?' out':'')+(p.id===selfId?' me':'')+'" title="'+esc(p.name)+'"><b>'+esc(initials(p.name))+'</b><u style="width:'+(out?0:Math.max(0,Math.min(100,p.hp)))+'%"></u></i>';}).join('');
}
