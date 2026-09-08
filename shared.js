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
  function matches(status, filter) {
    if (filter === 'all') return true;
    if (filter === 'fresh') return !status;
    if (filter === 'eligible') return status !== 'rejected';
    return status === filter;
  }
  function entries(data) {
    return Object.entries(data).filter(([k,v]) => k.startsWith('listing:') && v && parseURL(v.url)?.id === k.slice(8) && v.id === k.slice(8) && Object.hasOwn(statuses,v.status)).map(([,v])=>v);
  }
  root.RentHelper = {statuses,filters,parseURL,parseInput,matches,entries,key:id=>'listing:'+id};
  if(typeof module !== 'undefined') module.exports = root.RentHelper;
})(globalThis);
