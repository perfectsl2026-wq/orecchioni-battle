// V42 b5: ARMI in Impostazioni, the loadout of the genre: for each class, which design goes into the match. It is the
// same choice as the Officina's model (career finishes[slot].model): saved in the browser with the rest of the profile and
// sent to the host like any loadout. In a round with economy the buy menu offers this design first, at the price shown
// here; a design already paid for stays in hand until it is sold or lost (economy.js).
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountLoadout(root,{rows,get,set}){
 if(!root)return null;
 root.innerHTML=rows.map(r=>'<div class="lo-row" role="radiogroup" aria-label="'+esc(r.label)+'"><div class="lo-label">'+esc(r.label)+'</div><div class="lo-options">'+r.options.map(o=>'<button type="button" role="radio" data-slot="'+r.slot+'" data-model="'+esc(o.id)+'" aria-checked="false"><b>'+esc(o.name.replace(/^OB-\d+ /,''))+'</b><small>'+esc(o.tag)+'</small>'+(o.price===null?'':'<i>'+(o.price?o.price.toLocaleString('it-IT'):'GRATIS')+'</i>')+'</button>').join('')+'</div></div>').join('');
 const sync=()=>{for(const b of root.querySelectorAll('[data-model]'))b.setAttribute('aria-checked',String(get(Number(b.dataset.slot))===b.dataset.model));};
 root.addEventListener('click',e=>{const b=e.target.closest('[data-model]');if(!b)return;set(Number(b.dataset.slot),b.dataset.model);sync();});
 sync();return {sync};
}
