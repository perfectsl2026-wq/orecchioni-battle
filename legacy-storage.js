// Settings saved under the keys of older builds move to the current ones on first load. The old keys are matched by
// hash so a retired name stays out of the shipped files.
const idHash=s=>[...s].reduce((h,c)=>(h*33+c.charCodeAt(0))>>>0,5381),MOVED={459475807:'ob-controls-v1',3209981697:'ob-bot-level',4201665944:'ob-name'};
export function migrateStorage(storage){try{for(const key of Array.from({length:storage.length},(_,i)=>storage.key(i))){const to=MOVED[idHash(key)];if(!to)continue;const value=storage.getItem(key);if(storage.getItem(to)===null)storage.setItem(to,value);storage.removeItem(key);}}catch{}}
try{migrateStorage(globalThis.localStorage);}catch{}
