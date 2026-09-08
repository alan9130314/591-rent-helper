// Development fixture only; never included by the extension manifest.
const listeners=[];
let state=JSON.parse(localStorage.getItem('rh591-test')||'{}');
function publish(next) {
 const changes={};
 for(const k of new Set([...Object.keys(state),...Object.keys(next)]))if(JSON.stringify(state[k])!==JSON.stringify(next[k]))changes[k]={oldValue:state[k],newValue:next[k]};
 state=next;for(const listener of listeners)listener(changes,'local');
}
window.addEventListener('storage',e=>{if(e.key==='rh591-test')publish(JSON.parse(e.newValue||'{}'));});
window.chrome={storage:{local:{
 async get(){return structuredClone(state);},
 async set(values){const next={...state,...values};localStorage.setItem('rh591-test',JSON.stringify(next));publish(next);},
 async remove(key){const next={...state};delete next[key];localStorage.setItem('rh591-test',JSON.stringify(next));publish(next);}
},onChanged:{addListener(fn){listeners.push(fn);}}}};

// Simulate activeTab without inspecting any real browser tabs.
chrome.tabs={async query(){
 const url=new URLSearchParams(location.search).get('current') || '';
 return [{url,title:new URLSearchParams(location.search).get('title') || ''}];
}};
