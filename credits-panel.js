// CREDITI panel, loaded on first use with its text. Shows assets/CREDITS.md and THIRD-PARTY-NOTICES.txt
// through a small Markdown subset; everything lands in the page as text nodes, never as HTML.
const $=id=>document.getElementById(id);
const SOURCES={assets:'assets/CREDITS.md',notices:'THIRD-PARTY-NOTICES.txt'};
const INLINE=/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s)]*[^\s).,;:])/g;
function inline(node,text){let at=0;for(const m of text.matchAll(INLINE)){node.append(text.slice(at,m.index));at=m.index+m[0].length;const t=m[0];let el;
 if(t.startsWith('**')){el=document.createElement('b');el.textContent=t.slice(2,-2);}else if(t[0]==='*'){el=document.createElement('i');el.textContent=t.slice(1,-1);}else if(t[0]==='`'){el=document.createElement('code');el.textContent=t.slice(1,-1);}
 else{el=document.createElement('a');el.href=t;el.target='_blank';el.rel='noopener';el.textContent=t;}node.append(el);}
 node.append(text.slice(at));return node;}
export function renderMarkdown(text){const out=document.createDocumentFragment();let list=null;for(const raw of text.split('\n')){const line=raw.trim();if(!line){list=null;continue;}
 if(line.startsWith('- ')){if(!list)out.append(list=document.createElement('ul'));list.append(inline(document.createElement('li'),line.slice(2)));continue;}list=null;
 if(line.startsWith('# '))continue;out.append(line.startsWith('## ')?inline(document.createElement('h3'),line.slice(3)):inline(document.createElement('p'),line));}return out;}
export class CreditsPanel{
 constructor(onOpen,onClose){this.active=false;this.onOpen=onOpen;this.onClose=onClose;this.dialog=$('credits');this.body=$('credits-body');this.tabs={assets:$('credits-tab-assets'),notices:$('credits-tab-notices')};this.cache={};this.tab='assets';this.request=0;
  $('credits-close').onclick=()=>this.close();for(const [key,tab]of Object.entries(this.tabs))tab.onclick=()=>this.show(key);
  window.addEventListener('keydown',e=>{if(!this.active)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();return;}
   if(e.code==='ArrowLeft'||e.code==='ArrowRight'){if(document.activeElement===this.tabs.assets||document.activeElement===this.tabs.notices){e.preventDefault();const next=this.tab==='assets'?'notices':'assets';this.show(next);this.tabs[next].focus();}return;}
   if(e.code==='Tab'){const items=[...this.dialog.querySelectorAll('button,a[href],[tabindex="0"]')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}e.stopImmediatePropagation();},true);
 }
 async show(key){this.tab=key;const ticket=++this.request;for(const [k,t]of Object.entries(this.tabs))t.setAttribute('aria-selected',String(k===key));
  if(!this.cache[key]){this.message('Caricamento…');try{const r=await fetch(SOURCES[key]);if(!r.ok)throw new Error(r.status);this.cache[key]=await r.text();}catch{if(ticket===this.request)this.message('Testo non disponibile: controlla la connessione e riapri i crediti.');return;}}
  if(ticket!==this.request)return;if(key==='assets')this.body.replaceChildren(renderMarkdown(this.cache[key]));else{const pre=document.createElement('pre');pre.textContent=this.cache[key];this.body.replaceChildren(pre);}this.body.scrollTop=0;}
 message(text){const p=document.createElement('p');p.className='credits-status';p.textContent=text;this.body.replaceChildren(p);}
 open(opener){if(this.active)return;this.active=true;this.opener=opener;this.onOpen();this.dialog.hidden=false;this.show('assets');$('credits-close').focus();}
 close(){if(!this.active)return;this.active=false;this.request++;this.dialog.hidden=true;this.onClose();this.opener?.focus();}
}
