(function(root) {
  const statuses = {seen:'已看過', rejected:'不考慮', interested:'有興趣'};
  const filters = {all:'全部物件', fresh:'只看未標記', eligible:'隱藏不考慮', ...statuses};
  function parseURL(input) {
    try {
      const u = new URL(input.trim());
      if (!['http:','https:'].includes(u.protocol) || u.username || u.password) return null;
      let id;
      if (u.hostname === 'rent.591.com.tw') id = u.pathname.match(/^\/([1-9]\d*)\/?$/)?.[1] || u.pathname.match(/^\/rent-detail-([1-9]\d*)\.html$/)?.[1];
      else if (['www.591.com.tw','591.com.tw'].includes(u.hostname)) id = u.pathname.match(/^\/rent-detail-([1-9]\d*)\.html$/)?.[1];
      return id ? {id, url:'https://rent.591.com.tw/'+id} : null;
    } catch { return null; }
  }
  function parseInput(input) {
    if (typeof input !== 'string') return null;
    const value = input.trim();
    if (/^[1-9]\d*$/.test(value)) return {id:value, url:'https://rent.591.com.tw/'+value};
    return parseURL(value);
  }
  function cleanTitle(value) {
    if(typeof value !== 'string')return '';
    const title=value.replace(/\s*[-–—|｜]\s*591租屋網\s*$/u,'').trim();
    if(!title || /^(591租屋網|591租屋|找不到.*|物件不存在.*|物件已下架.*|系統忙碌.*|Access Denied.*|Just a moment.*|Error.*|驗證.*)$/i.test(title))return '';
    return title.slice(0,300);
  }
  function matches(status, filter) {
    if (filter === 'all') return true;
    if (filter === 'fresh') return !status;
    if (filter === 'eligible') return status !== 'rejected';
    return status === filter;
  }
  function entries(data) {
    return Object.entries(data).filter(([k,v]) => k.startsWith('listing:') && v && parseURL(v.url)?.id === k.slice(8) && v.id === k.slice(8) && Object.hasOwn(statuses,v.status)).map(([,v])=>v);
  }
  function parseBackup(text) {
    const backup=JSON.parse(text.replace(/^\uFEFF/,''));
    if(!backup || backup.format!=='591-rent-helper' || backup.version!==1 || !Array.isArray(backup.records))throw new Error('請選擇本擴充功能匯出的 JSON 備份檔（版本 1）。');
    const ids=new Set();
    return backup.records.map((r,i)=>{
      const listing=r && parseURL(r.url);
      if(!listing || listing.id!==r.id || !Object.hasOwn(statuses,r.status) || typeof r.note!=='string' || (r.title!==undefined && typeof r.title!=='string') || !Number.isSafeInteger(r.updatedAt) || r.updatedAt<0 || r.updatedAt>8640000000000000 || ids.has(r.id))throw new Error('第 '+(i+1)+' 筆紀錄格式錯誤或 ID 重複，未匯入任何紀錄。');
      ids.add(r.id);
      return {...listing,title:r.title||'',note:r.note,status:r.status,updatedAt:r.updatedAt};
    });
  }
  function makeBackup(data) {
    const backup={format:'591-rent-helper',version:1,exportedAt:new Date().toISOString(),records:entries(data)};
    backup.records=parseBackup(JSON.stringify(backup));
    return backup;
  }
  function mergeBackup(records,data,overwrite=false) {
    const updates={};let added=0,replaced=0,skipped=0;
    for(const r of records){
      const key='listing:'+r.id;
      if(Object.hasOwn(data,key)){
        if(!overwrite){skipped++;continue;}
        replaced++;
      }else added++;
      updates[key]=r;
    }
    return {updates,added,replaced,skipped};
  }
  root.RentHelper = {statuses,filters,parseURL,parseInput,cleanTitle,matches,entries,parseBackup,makeBackup,mergeBackup,key:id=>'listing:'+id};
  if(typeof module !== 'undefined') module.exports = root.RentHelper;
})(globalThis);
