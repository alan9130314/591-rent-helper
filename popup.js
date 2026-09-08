const H = RentHelper;
const $ = id => document.getElementById(id);
let data = {};
function message(text, error=false) { $('message').textContent=text; $('message').className=error?'error':''; }
async function write(action) {
  try { await action(); return true; } catch { message('儲存失敗，請重新開啟擴充功能後再試。',true); return false; }
}
for(const [v,l] of Object.entries(H.filters)) $('page-filter').add(new Option(l,v));
function render() {
  renderCurrent();
  const all=H.entries(data).sort((a,b)=>b.updatedAt-a.updatedAt);
  $('count').textContent=all.length;
  $('page-filter').value=Object.hasOwn(H.filters,data.filter)?data.filter:'all';
  const q=$('search').value.trim().toLowerCase();
  const rows=all.filter(r=>H.matches(r.status,$('record-filter').value) && (r.id+' '+(r.title||'')+' '+r.note).toLowerCase().includes(q));
  $('records').replaceChildren();
  if(!rows.length) {
    const p=document.createElement('p');p.className='empty';
    p.textContent=all.length?'沒有符合條件的紀錄。':'還沒有紀錄。輸入物件 ID 或網址開始吧。';
    $('records').append(p);
  }
  for(const r of rows) {
    const row=document.createElement('article');row.className='record';
    const a=document.createElement('a');a.textContent=r.title||'物件 #'+r.id;a.href=H.parseURL(r.url).url;a.target='_blank';a.rel='noopener noreferrer';
    const meta=document.createElement('small');meta.textContent='#'+r.id+' · '+new Date(r.updatedAt).toLocaleDateString('zh-TW');
    const actions=document.createElement('div');actions.className='record-actions';
    const s=document.createElement('select');s.setAttribute('aria-label','物件 '+r.id+' 的狀態');
    for(const [v,l] of Object.entries(H.statuses)) s.add(new Option(l,v));s.value=r.status;
    s.onchange=async()=>{s.disabled=true;const ok=await write(()=>chrome.storage.local.set({[H.key(r.id)]:{...r,status:s.value,updatedAt:Date.now()}}));if(!ok)s.value=r.status;s.disabled=false;};
    const edit=document.createElement('button');edit.textContent='編輯';edit.onclick=()=>{$('url').value=r.url;$('note').value=r.note;$('status').value=r.status;$('note').focus();message('修改後按「加入紀錄」即可更新。');};
    const remove=document.createElement('button');remove.textContent='移除';remove.setAttribute('aria-label','移除物件 '+r.id);
    remove.onclick=async()=>{if(await write(()=>chrome.storage.local.remove(H.key(r.id)))){message('已移除紀錄。');const undo=document.createElement('button');undo.textContent='復原';undo.onclick=async()=>{if(await write(()=>chrome.storage.local.set({[H.key(r.id)]:r})))message('已復原紀錄。');};$('message').append(' ',undo);}};
    actions.append(s,edit,remove);row.append(a);if(r.note){const note=document.createElement('p');note.className='record-note';note.textContent=r.note;row.append(note);}row.append(meta,actions);$('records').append(row);
  }
}
let currentListing=null;
let saving=false;
function renderCurrent() {
  $('add-current').hidden=!currentListing;
  if(currentListing) $('add-current').textContent=(data[H.key(currentListing.id)]?'更新目前物件 #':'加入目前物件 #')+currentListing.id;
}
async function saveListing(listing, preserveNote=false) {
  if(saving)return;
  saving=true;$('save').disabled=true;$('add-current').disabled=true;
  const previous=data[H.key(listing.id)];
  const status=$('status').value;
  const note=$('note').value.trim() || (preserveNote ? previous?.note || '' : '');
  const title=listing.title || (currentListing?.id===listing.id ? currentListing.title : '') || previous?.title || await fetchTitle(listing.url);
  const ok=await write(()=>chrome.storage.local.set({[H.key(listing.id)]:{...listing,title,status,note,updatedAt:Date.now()}}));
  if(ok){
    $('url').value='';$('note').value='';message(previous?'已更新物件，591 列表會同步套用。':'已加入紀錄，591 列表會同步套用。');
  }
  saving=false;$('save').disabled=false;$('add-current').disabled=false;
}
$('add-form').onsubmit=async e=>{
  e.preventDefault();const listing=H.parseInput($('url').value);
  if(!listing)return message('請輸入正整數物件 ID 或有效的 591 租屋物件網址，不能是搜尋列表。',true);
  await saveListing(listing);
};
$('add-current').onclick=async()=>{
  if(currentListing)await saveListing(currentListing,true);
};
async function detectCurrentListing() {
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    currentListing=H.parseURL(tab?.url || '');
    if(currentListing)currentListing.title=H.cleanTitle(tab.title);
    renderCurrent();
  }catch{currentListing=null;renderCurrent();}
}
$('page-filter').onchange=async()=>{if(!await write(()=>chrome.storage.local.set({filter:$('page-filter').value})))render();};
$('search').oninput=render;$('record-filter').onchange=render;
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;for(const [k,v] of Object.entries(changes)){if(v.newValue===undefined)delete data[k];else data[k]=v.newValue;}render();});
(async()=>{try{data=await chrome.storage.local.get(null);render();await detectCurrentListing();backfillTitles();}catch{message('無法讀取紀錄，請重新開啟擴充功能。',true);}})();

// Parse inert HTML only: no remote scripts or images are loaded.
async function fetchTitle(url) {
  try {
    const response=await fetch(url,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000)});
    if(!response.ok)return '';
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    const title=doc.querySelector('h1')?.textContent || doc.querySelector('meta[property="og:title"]')?.content || doc.title;
    // Generic challenge/error pages must not become listing titles.
    if(!/591租屋網/.test(doc.title))return '';
    return H.cleanTitle(title);
  }catch{return '';}
}
async function backfillTitles() {
  const pending=H.entries(data).filter(r=>!r.title);
  async function worker(){
    while(pending.length){
      const r=pending.shift();
      const title=(currentListing?.id===r.id ? currentListing.title : '') || await fetchTitle(r.url);
      if(!title)continue;
      try {
        const key=H.key(r.id);
        const latest=(await chrome.storage.local.get(key))[key];
        if(latest && !latest.title)await chrome.storage.local.set({[key]:{...latest,title}});
      }catch{/* A failed title lookup must not interrupt record management. */}
    }
  }
  await Promise.all([worker(),worker()]);
}

function backupMessage(text,error=false){
  $('backup-message').textContent=text;
  $('backup-message').className=error?'error':'';
}
let transferring=false;
function transferBusy(busy){
  transferring=busy;
  $('export-records').disabled=busy;
  $('import-records').disabled=busy;
  $('import-mode').disabled=busy;
}
$('export-records').onclick=async()=>{
  if(transferring)return;
  transferBusy(true);
  try{
    const backup=H.makeBackup(await chrome.storage.local.get(null));
    const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download='591-rent-helper-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    backupMessage('已開始下載 '+backup.records.length+' 筆紀錄的備份檔。');
  }catch{backupMessage('匯出失敗，請重新開啟擴充功能後再試。',true);}
  finally{transferBusy(false);}
};
$('import-records').onclick=()=>{if(!transferring)$('import-file').click();};
$('import-file').onchange=async()=>{
  const file=$('import-file').files[0];
  if(!file || transferring)return;
  const overwrite=$('import-mode').value==='overwrite';
  transferBusy(true);
  try{
    if(file.size>10*1024*1024)throw new Error('備份檔超過 10 MB，請選擇較小的檔案。');
    let records;
    try{records=H.parseBackup(await file.text());}
    catch(error){throw new Error(error instanceof SyntaxError?'檔案不是有效的 JSON，未匯入任何紀錄。':error.message);}
    const latest=await chrome.storage.local.get(null);
    const result=H.mergeBackup(records,latest,overwrite);
    if(Object.keys(result.updates).length)await chrome.storage.local.set(result.updates);
    data=await chrome.storage.local.get(null);render();
    backupMessage('匯入完成：新增 '+result.added+' 筆、覆蓋 '+result.replaced+' 筆、保留本機 '+result.skipped+' 筆。');
  }catch(error){backupMessage('匯入失敗：'+error.message,true);}
  finally{$('import-file').value='';transferBusy(false);}
};
