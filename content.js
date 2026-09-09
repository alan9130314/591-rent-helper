(() => {
  const H=RentHelper;
  let data={}, timer, panel, select, summary, observer, keywordToggle;
  // Verified against the desktop list on 2026-09-08. Never hide arbitrary ancestors.
  const selector='.item:has(.item-info), .recommend-ware';
  const controls=new WeakMap();
  const pending=new Set();
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
    const style=document.createElement('style');style.textContent=':host{all:initial;position:fixed;bottom:20px;left:20px;z-index:2147483646;font:13px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft JhengHei",sans-serif;color:#233b35}section{background:#f8faf7;border:1px solid #cbd8cd;border-radius:12px;padding:14px 16px;width:245px;box-shadow:0 4px 24px #153a2420}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}strong{font-size:15px}button{border:0;background:none;color:#486352;cursor:pointer;font:inherit}select{width:100%;padding:8px;border:1px solid #cbd8cd;border-radius:6px;background:white;color:#233b35;font:inherit}p{font-size:11px;line-height:1.6;margin:8px 0 0;color:#63746a}select:focus-visible,button:focus-visible{outline:2px solid #28634e}';
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
    const hint=document.createElement('p');hint.textContent='可直接在物件卡片標記狀態；備註可到擴充功能編輯。僅篩選本頁已載入物件。';
    const keywordLabel=document.createElement('label');
    keywordLabel.style.cssText='display:flex;align-items:center;gap:6px;margin-top:10px';
    keywordToggle=document.createElement('input');keywordToggle.type='checkbox';
    keywordLabel.append(keywordToggle,'隱藏標題關鍵字');
    keywordToggle.onchange=async()=>{
      const enabled=keywordToggle.checked;keywordToggle.disabled=true;
      try{
        const latest=await chrome.storage.local.get('titleKeywordFilter');
        await chrome.storage.local.set({titleKeywordFilter:{...H.keywordSettings(latest),enabled}});
      }catch{keywordToggle.checked=H.keywordSettings(data).enabled;summary.textContent='關鍵字設定儲存失敗，請重試。';}
      finally{keywordToggle.disabled=false;}
    };
    hint.textContent+=' 關鍵字可到擴充功能編輯；關閉上方勾選可暫停關鍵字隱藏。';
    header.append(title,toggle);body.append(select,keywordLabel,summary,hint);section.append(header,body);shadow.append(style,section);
    document.body.append(panel);
  }
  function titleFor(card,listing) {
    const heading=card.querySelector('.item-info-title');
    if(heading)return heading.getAttribute('title')||heading.textContent||'';
    const links=[...card.querySelectorAll('a[href]')].filter(a=>H.parseURL(a.href)?.id===listing.id);
    return links.map(a=>a.getAttribute('title')||a.textContent.trim()).find(Boolean)||'';
  }
  function makeControls(card) {
    const host=document.createElement('div');host.className='rh591-actions';
    const shadow=host.attachShadow({mode:'open'});
    const style=document.createElement('style');
    style.textContent=':host{font:12px system-ui,"Microsoft JhengHei",sans-serif;color:#233b35}select{box-sizing:border-box;width:104px;height:30px;margin:0;padding:4px 6px;font:inherit;font-weight:600;color:#285e4b;background:#fff;border:1px solid #bdcfc1;border-radius:6px;box-shadow:0 1px 4px #0001;cursor:pointer}select[data-status="seen"]{background:#edf2ed;color:#365443}select[data-status="interested"]{background:#28634e;color:white}select[data-status="rejected"]{background:#f0efed;color:#675f58}select:focus-visible{outline:2px solid #28634e;outline-offset:2px}select:disabled{opacity:.65;cursor:wait}p{position:absolute;left:0;top:34px;width:180px;box-sizing:border-box;margin:0;padding:8px;background:#fff;color:#ad372c;border:1px solid #d5d0c9;border-radius:6px;box-shadow:0 2px 8px #0002;font-size:12px;line-height:1.5}p:empty{display:none}';
    const picker=document.createElement('select');
    picker.add(new Option('未標記',''));
    for(const [value,label] of Object.entries(H.statuses))picker.add(new Option(label,value));
    const feedback=document.createElement('p');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
    const state={host,picker,listing:null};
    picker.onchange=async()=>{
      const status=picker.value;
      const listing=listingFor(card);
      if(!listing || listing.id!==state.listing?.id || pending.has(listing.id))return;
      pending.add(listing.id);feedback.textContent='';scan();
      try{
        const key=H.key(listing.id);
        if(status){
          const stored=await chrome.storage.local.get(key);
          const previous=H.entries(stored).find(r=>r.id===listing.id);
          const links=[...card.querySelectorAll('.item-info-title a[href], a[href]')];
          const title=links.filter(a=>H.parseURL(a.href)?.id===listing.id).map(a=>H.cleanTitle(a.textContent)||H.cleanTitle(a.getAttribute('title'))).find(Boolean)||'';
          const record={...listing,title:previous?.title||title,note:previous?.note||'',status,updatedAt:Date.now()};
          await chrome.storage.local.set({[key]:record});data[key]=record;
        }else{await chrome.storage.local.remove(key);delete data[key];}
      }catch{feedback.textContent='儲存失敗，請重試或重新整理頁面。';}
      finally{pending.delete(listing.id);scan();}
    };
    // Isolate controls from card navigation without suppressing native select behavior.
    for(const type of ['click','dblclick','pointerdown','mousedown','keydown','keyup','change'])host.addEventListener(type,event=>event.stopPropagation());
    shadow.append(style,picker,feedback);card.append(host);controls.set(card,state);
    return state;
  }
  function scan() {
    observer?.disconnect();
    const cards=[...document.querySelectorAll(selector)];
    const filter=Object.hasOwn(H.filters,data.filter)?data.filter:'all';
    const records=new Map(H.entries(data).map(r=>[r.id,r]));
    const keywords=H.keywordSettings(data);
    let total=0,hidden=0,keywordHidden=0;
    for(const card of cards) {
      const listing=listingFor(card);
      // Remove legacy display-only badges: the picker is now the status indicator.
      card.querySelectorAll(':scope > .rh591-badge').forEach(badge=>badge.remove());
      card.classList.remove('rh591-marked');
      if(!listing){card.classList.remove('rh591-hidden','rh591-has-actions');controls.get(card)?.host.remove();controls.delete(card);continue;}
      total++;
      const record=records.get(listing.id);
      let actions=controls.get(card);
      if(!actions?.host.isConnected)actions=makeControls(card);
      if(actions.listing?.id!==listing.id)actions.host.shadowRoot.querySelector('p').textContent='';
      actions.listing=listing;
      actions.picker.value=record?.status||'';
      actions.picker.dataset.status=record?.status||'';
      actions.picker.disabled=pending.has(listing.id);
      actions.picker.setAttribute('aria-label','物件 '+listing.id+' 的狀態');
      actions.picker.title='租屋筆記：'+(H.statuses[record?.status]||'未標記')+'；點選可變更狀態'+(record?.note?'\n備註：'+record.note:'');
      actions.picker.options[0].textContent=record?'取消標記':'未標記';
      card.classList.add('rh591-has-actions');
      const keywordHit=H.titleKeywordMatch(titleFor(card,listing),keywords);
      if(keywordHit)keywordHidden++;
      const hide=!H.matches(record?.status,filter)||keywordHit;
      card.classList.toggle('rh591-hidden',hide);
      if(hide)hidden++;
    }
    // Keep the toolbar available even when every card is hidden or results become empty.
    if(!panel?.isConnected && (total || location.pathname==='/list'))makePanel();
    if(panel){select.value=filter;keywordToggle.checked=keywords.enabled;summary.textContent=total?'本頁辨識 '+total+' 筆 · 顯示 '+(total-hidden)+' 筆 · 隱藏 '+hidden+' 筆（關鍵字命中 '+keywordHidden+' 筆）':'尚未辨識到物件，載入後會自動套用。';}
    observer?.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','class','title']});
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
