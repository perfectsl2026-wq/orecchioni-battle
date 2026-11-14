import {RANKED_SERVER} from './ranked-config.js?v=42.0';
// V50 CLASSIFICATA: talks to the ranked service. The profile is a random id and a secret kept on this
// device: no e-mail, no password, nothing personal leaves the page but the nickname.
const KEY='ob-ranked-v1',LOCAL=/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
// A page served from this computer may point at a trial service: ?ranked=http://127.0.0.1:8791
export function rankedAddress(base=RANKED_SERVER,place=globalThis.location){
 try{const asked=new URLSearchParams(place.search).get('ranked');if(['localhost','127.0.0.1'].includes(place.hostname)&&asked&&LOCAL.test(asked))base=asked;}catch{}
 return String(base||'').replace(/\/+$/,'');
}
export class RankedClient{
 constructor({base=rankedAddress(),storage,build='',request}={}){
  if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
  this.base=base;this.storage=storage;this.build=build;this.request=request||((...a)=>fetch(...a));this.profile=null;this.keys=null;
  try{const v=JSON.parse(storage?.getItem(KEY+':'+base)||'null');if(v&&/^[0-9a-f]{16}$/.test(v.id)&&/^[0-9a-f]{48}$/.test(v.secret))this.keys={id:v.id,secret:v.secret};}catch{}
 }
 get enabled(){return !!this.base;}
 get id(){return this.keys?.id||'';}
 async send(method,path,body,auth=true){
  const headers={};if(body)headers['content-type']='application/json';if(auth)headers.authorization='Bearer '+this.keys.id+'.'+this.keys.secret;
  let response;try{response=await this.request(this.base+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout?.(9000),cache:'no-store'});}catch{throw Object.assign(new Error('Servizio classificata non raggiungibile.'),{status:0});}
  let data=null;try{data=await response.json();}catch{}
  if(!response.ok)throw Object.assign(new Error(data?.error||'Servizio classificata non disponibile.'),{status:response.status});
  return data;
 }
 async register(name){const v=await this.send('POST','/v1/register',{name},false);this.keys={id:v.id,secret:v.secret};this.profile=v.profile;try{this.storage?.setItem(KEY+':'+this.base,JSON.stringify(this.keys));}catch{}return v.profile;}
 // Every call but the public ones: a profile is made on first use, and remade once if the service no longer knows it.
 async call(method,path,body,name){
  if(!this.enabled)throw Object.assign(new Error('La classificata non è ancora aperta.'),{status:-1});
  if(!this.keys)await this.register(name);
  try{return await this.send(method,path,body);}catch(e){if(e.status!==401)throw e;await this.register(name);return this.send(method,path,body);}
 }
 async me(name){const v=await this.call('GET','/v1/me',null,name);this.profile=v.profile;return v;}
 poll({name,touch}){return this.call('POST','/v1/queue',{name,touch:!!touch,build:this.build},name);}
 leave(){return this.keys?this.call('POST','/v1/leave',{}).catch(()=>null):Promise.resolve(null);}
 async report(body){const v=await this.call('POST','/v1/report',body);if(v.profile)this.profile=v.profile;return v;}
 async result(match){const v=await this.call('GET','/v1/match/'+match);if(v.profile)this.profile=v.profile;return v;}
 top(){return this.send('GET','/v1/top',null,false);}
}
