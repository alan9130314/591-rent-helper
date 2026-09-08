const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('../shared.js');
test('租屋網址正規化與去除追蹤參數',()=>{
 for(const input of ['https://rent.591.com.tw/21964749?from=list#x','http://rent.591.com.tw/21964749/','https://www.591.com.tw/rent-detail-21964749.html','https://rent.591.com.tw/rent-detail-21964749.html']) assert.deepEqual(H.parseURL(input),{id:'21964749',url:'https://rent.591.com.tw/21964749'});
});
test('拒絕搜尋頁、非租屋物件、偽造網域及不安全網址',()=>{
 for(const input of ['https://rent.591.com.tw/list?region=1','https://sale.591.com.tw/21964749','https://rent.591.com.tw.evil.com/21964749','javascript:alert(1)','https://evil.com/?url=https://rent.591.com.tw/123','https://user:pass@rent.591.com.tw/123','https://rent.591.com.tw/0','亂碼','https://591.com.tw/123']) assert.equal(H.parseURL(input),null,input);
});
test('全部與個別狀態篩選',()=>{
 for(const s of [undefined,...Object.keys(H.statuses)]){
  assert.equal(H.matches(s,'all'),true);
  assert.equal(H.matches(s,'fresh'),s===undefined);
  assert.equal(H.matches(s,'eligible'),s!=='rejected');
  for(const f of Object.keys(H.statuses))assert.equal(H.matches(s,f),s===f);
 }
});
test('只讀取有效、相符的物件紀錄',()=>{
 const valid={id:'123',url:'https://rent.591.com.tw/123',status:'seen'};
 assert.deepEqual(H.entries({'listing:123':valid,'listing:456':valid,'listing:789':{...valid,status:'bad'},filter:'all'}),[valid]);
});
test('物件 ID 與網址解析為同一筆物件',()=>{
 const expected={id:'21964749',url:'https://rent.591.com.tw/21964749'};
 for(const input of ['21964749',' 21964749 \n','https://rent.591.com.tw/21964749?from=list','https://www.591.com.tw/rent-detail-21964749.html']) {
  assert.deepEqual(H.parseInput(input),expected);
  assert.equal(H.key(H.parseInput(input).id),'listing:21964749');
 }
});
test('拒絕無效 ID 與非物件網址',()=>{
 for(const input of ['', '  ', '0','-123','1.5','1e3','12 34','00123','abc123',null,123,'https://rent.591.com.tw/list','https://sale.591.com.tw/123']) assert.equal(H.parseInput(input),null,String(input));
 // 網頁連結與儲存資料仍使用嚴格的網址解析。
 assert.equal(H.parseURL('21964749'),null);
});
