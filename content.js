(() => {
  const H=RentHelper;
  let data={}, timer, panel, select, summary, observer;
  // Verified against the desktop list on 2026-09-08. Never hide arbitrary ancestors.
  const selector='.item:has(.item-info), .recommend-ware';
  function listingFor(card) {
    for(const a of card.querySelectorAll('a[href]')) {
      const listing=H.parseURL(a.href);
      if(listing)return listing;
    }
    return null;
  }
  function makePanel() {
    panel=document.createElement('div');panel.id='rh591-panel';
    const shadow=panel.attachShadow({mode:'open'});
    const style=document.createElement('style');style.textContent=':host{all:initial;position:fixed;bottom:20px;left:20px;z-index:2147483646;font:13px -apple-system,BlinkMacSystemFont,sans-serif;color:#233b35}section{background:#f8faf7;border:1px solid #cbd8cd;border-radius:12px;padding:14px 16px;width:245px;box-shadow:0 4px 24px #153a2420}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}strong{font-size:15px}button{border:0;background:none;color:#486352;cursor:pointer;font:inherit}select{width:100%;padding:8px;border:1px solid #cbd8cd;border-radius:6px;background:white;color:#233b35;font:inherit}p{font-size:11px;line-height:1.6;margin:8px 0 0;color:#63746a}select:focus-visible,button:focus-visible{outline:2px solid #28634e}';
    const section=document.createElement('section');
    const header=document.createElement('header');
    const title=document.createElement('strong');title.textContent='591 租屋筆記';
    const toggle=document.createElement('button');toggle.textContent='收合';toggle.setAttribute('aria-expanded','true');
    const body=document.createElement('div');
    toggle.onclick=()=>{body.hidden=!body.hidden;toggle.textContent=body.hidden?'展開':'收合';toggle.setAttribute('aria-expanded',String(!body.hidden));};
    select=document.createElement('select');select.setAttribute('aria-label','591 物件狀態篩選');
    for(const [v,l] of Object.entries(H.filters))select.add(new Option(l,v));
    select.onchange=async()=>{
      select.disabled=true;
      try{await chrome.storage.local.set({filter:select.value});}
      catch{select.value=data.filter||'all';summary.textContent='篩選儲存失敗，請重新整理頁面。';}
      finally{select.disabled=false;}
    };
    summary=document.createElement('p');summary.setAttribute('role','status');
    const hint=document.createElement('p');hint.textContent='僅篩選本頁已載入物件；新增 ID 或網址請點擴充功能圖示。';
    header.append(title,toggle);body.append(select,summary,hint);section.append(header,body);shadow.append(style,section);
    document.body.append(panel);
  }
  function scan() {
    observer?.disconnect();
    const cards=[...document.querySelectorAll(selector)];
    const filter=Object.hasOwn(H.filters,data.filter)?data.filter:'all';
    const records=new Map(H.entries(data).map(r=>[r.id,r]));
    let total=0,hidden=0;
    for(const card of cards) {
      const listing=listingFor(card);
      let badge=card.querySelector(':scope > .rh591-badge');
      if(!listing){card.classList.remove('rh591-hidden','rh591-marked');badge?.remove();continue;}
      total++;
      const record=records.get(listing.id);
      const hide=!H.matches(record?.status,filter);
      card.classList.toggle('rh591-hidden',hide);card.classList.toggle('rh591-marked',!!record);
      if(hide)hidden++;
      if(record) {
        if(!badge){badge=document.createElement('span');badge.className='rh591-badge';card.append(badge);}
        badge.textContent=H.statuses[record.status];badge.dataset.status=record.status;badge.title=record.note||H.statuses[record.status];
      }else badge?.remove();
    }
    // Keep the toolbar available even when every card is hidden or results become empty.
    if(!panel?.isConnected && (total || location.pathname==='/list'))makePanel();
    if(panel){select.value=filter;summary.textContent=total?'本頁辨識 '+total+' 筆 · 顯示 '+(total-hidden)+' 筆 · 隱藏 '+hidden+' 筆':'尚未辨識到物件，載入後會自動套用。';}
    observer?.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href','class']});
  }
  function schedule(){if(timer)return;timer=setTimeout(()=>{timer=null;scan();},120);}
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    for(const [k,v] of Object.entries(changes)){if(v.newValue===undefined)delete data[k];else data[k]=v.newValue;}
    schedule();
  });
  (async()=>{
    try {
      data=await chrome.storage.local.get(null);
      observer=new MutationObserver(schedule);scan();
      window.addEventListener('popstate',schedule);
    }catch{console.warn('591 租屋筆記：無法讀取本機紀錄，請重新整理頁面。');}
  })();
})();
