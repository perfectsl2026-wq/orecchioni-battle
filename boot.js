// Make a failed initial download recoverable instead of leaving an inert lobby.
// V38.3: a module or stylesheet that fails to download fires its error on the element, without
// bubbling, so it is caught in the capture phase. The page reloads by itself up to three times.
const RETRIES='ob-load-retries',RETRY_DELAYS=[1000,2500,5000];
const loading=document.getElementById('loading'),retry=document.getElementById('retryload');
const retries=()=>{try{return Number(sessionStorage.getItem(RETRIES))||0;}catch{return RETRY_DELAYS.length;}};
const setRetries=n=>{try{if(n)sessionStorage.setItem(RETRIES,n);else sessionStorage.removeItem(RETRIES);}catch{}};
retry.onclick=()=>{setRetries(0);location.reload();};
let failed=false;
const fail=e=>{if(loading.hidden||failed)return;if(e.type==='error'&&e.target!==window&&!e.target.matches?.('script,link[rel=stylesheet]'))return;failed=true;
 const n=retries(),message=document.getElementById('loading-message');
 if(n<RETRY_DELAYS.length){message.textContent='Connessione lenta, nuovo tentativo…';setRetries(n+1);setTimeout(()=>location.reload(),RETRY_DELAYS[n]);return;}
 message.textContent='Preparazione non riuscita. Controlla la connessione e riprova.';retry.hidden=false;};
window.addEventListener('error',fail,true);window.addEventListener('unhandledrejection',fail);
new MutationObserver(()=>{if(loading.hidden)setRetries(0);}).observe(loading,{attributes:true,attributeFilter:['hidden']});
