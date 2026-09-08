const H = RentHelper;
const $ = id => document.getElementById(id);
let data = {};
function message(text, error=false) { $('message').textContent=text; $('message').className=error?'error':''; }
async function write(action) {
  try { await action(); return true; } catch { message('儲存失敗，請重新開啟擴充功能後再試。',true); return false; }
}
for(const [v,l] of Object.entries(H.filters)) $('page-filter').add(new Option(l,v));
function render() {
  const all=H.entries(data).sort((a,b)=>b.updatedAt-a.updatedAt);
  $('count').textContent=all.length;
  $('page-filter').value=Object.hasOwn(H.filters,data.filter)?data.filter:'all';
  const q=$('search').value.trim().toLowerCase();
  const rows=all.filter(r=>H.matches(r.status,$('record-filter').value) && (r.id+' '+r.note).toLowerCase().includes(q));
  $('records').replaceChildren();
  if(!rows.length) {
    const p=document.createElement('p');p.className='empty';
    p.textContent=all.length?'沒有符合條件的紀錄。':'還沒有紀錄。輸入物件 ID 或網址開始吧。';
    $('records').append(p);
  }
  for(const r of rows) {
    const row=document.createElement('article');row.className='record';
    const a=document.createElement('a');a.textContent=r.note||'物件 #'+r.id;a.href=H.parseURL(r.url).url;a.target='_blank';a.rel='noopener noreferrer';
    const meta=document.createElement('small');meta.textContent='#'+r.id+' · '+new Date(r.updatedAt).toLocaleDateString('zh-TW');
    const actions=document.createElement('div');actions.className='record-actions';
    const s=document.createElement('select');s.setAttribute('aria-label','物件 '+r.id+' 的狀態');
    for(const [v,l] of Object.entries(H.statuses)) s.add(new Option(l,v));s.value=r.status;
    s.onchange=async()=>{s.disabled=true;const ok=await write(()=>chrome.storage.local.set({[H.key(r.id)]:{...r,status:s.value,updatedAt:Date.now()}}));if(!ok)s.value=r.status;s.disabled=false;};
    const edit=document.createElement('button');edit.textContent='編輯';edit.onclick=()=>{$('url').value=r.url;$('note').value=r.note;$('status').value=r.status;$('note').focus();message('修改後按「加入紀錄」即可更新。');};
    const remove=document.createElement('button');remove.textContent='移除';remove.setAttribute('aria-label','移除物件 '+r.id);
    remove.onclick=async()=>{if(await write(()=>chrome.storage.local.remove(H.key(r.id)))){message('已移除紀錄。');const undo=document.createElement('button');undo.textContent='復原';undo.onclick=async()=>{if(await write(()=>chrome.storage.local.set({[H.key(r.id)]:r})))message('已復原紀錄。');};$('message').append(' ',undo);}};
    actions.append(s,edit,remove);row.append(a,meta,actions);$('records').append(row);
  }
}
$('add-form').onsubmit=async e=>{
  e.preventDefault();const listing=H.parseInput($('url').value);
  if(!listing)return message('請輸入正整數物件 ID 或有效的 591 租屋物件網址，不能是搜尋列表。',true);
  $('save').disabled=true;const existed=!!data[H.key(listing.id)];
  if(await write(()=>chrome.storage.local.set({[H.key(listing.id)]:{...listing,status:$('status').value,note:$('note').value.trim(),updatedAt:Date.now()}}))){
    $('url').value='';$('note').value='';message(existed?'已更新物件，591 列表會同步套用。':'已加入紀錄，591 列表會同步套用。');
  }
  $('save').disabled=false;
};
$('page-filter').onchange=async()=>{if(!await write(()=>chrome.storage.local.set({filter:$('page-filter').value})))render();};
$('search').oninput=render;$('record-filter').onchange=render;
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;for(const [k,v] of Object.entries(changes)){if(v.newValue===undefined)delete data[k];else data[k]=v.newValue;}render();});
(async()=>{try{data=await chrome.storage.local.get(null);render();}catch{message('無法讀取紀錄，請重新開啟擴充功能。',true);}})();
