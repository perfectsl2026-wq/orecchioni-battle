// Make a failed initial download recoverable instead of leaving an inert lobby.
const retry=document.getElementById('retryload');retry.onclick=()=>location.reload();
const fail=()=>{if(document.getElementById('loading').hidden)return;document.getElementById('loading-message').textContent='Preparazione non riuscita. Controlla la connessione e riprova.';retry.hidden=false;};
window.addEventListener('error',fail);window.addEventListener('unhandledrejection',fail);
