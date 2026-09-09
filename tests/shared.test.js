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
test('清理物件標題並排除通用錯誤頁',()=>{
 assert.equal(H.cleanTitle('  近捷運明亮套房 - 591租屋網  '),'近捷運明亮套房');
 assert.equal(H.cleanTitle('套房｜含陽台'),'套房｜含陽台');
 for(const value of ['',null,'591租屋網','Just a moment...','物件不存在'])assert.equal(H.cleanTitle(value),'');
});

const sample={id:'123',url:'https://rent.591.com.tw/123',title:'陽台套房',note:'週末看屋 <script>',status:'interested',updatedAt:1700000000000};
const backupText=records=>JSON.stringify({format:'591-rent-helper',version:1,records});
test('備份往返保留完整紀錄，不包含篩選設定',()=>{
 const backup=H.makeBackup({'listing:123':sample,filter:'fresh'});
 assert.deepEqual(H.parseBackup('\uFEFF'+JSON.stringify(backup)),[sample]);
 assert.equal(backup.filter,undefined);
 assert.deepEqual(H.parseBackup(backupText([])),[]);
});
test('拒絕錯誤版本、無效 JSON、重複 ID 與任一損壞紀錄',()=>{
 for(const text of ['{','null',JSON.stringify({format:'591-rent-helper',version:2,records:[]}),backupText([sample,sample])])assert.throws(()=>H.parseBackup(text));
 for(const patch of [{id:'999'},{url:'https://evil.com/123'},{status:'bad'},{note:null},{title:5},{updatedAt:-1},{updatedAt:1e30}])assert.throws(()=>H.parseBackup(backupText([sample,{...sample,id:'456',url:'https://rent.591.com.tw/456',...patch}])));
});
test('匯入只採用已知欄位並正規化網址',()=>{
 const [record]=H.parseBackup(backupText([{...sample,url:sample.url+'?tracking=1',unexpected:'ignored'}]));
 assert.deepEqual(record,sample);
});
test('合併預設保留本機，可選擇覆蓋且不刪除其他紀錄',()=>{
 const existing={...sample,note:'本機備註'};
 const extra={...sample,id:'456',url:'https://rent.591.com.tw/456'};
 const data={'listing:123':existing,'listing:789':{...sample,id:'789'},filter:'fresh'};
 const kept=H.mergeBackup([sample,extra],data);
 assert.deepEqual(kept,{updates:{'listing:456':extra},added:1,replaced:0,skipped:1});
 const replaced=H.mergeBackup([sample,extra],data,true);
 assert.equal(replaced.replaced,1);
 assert.equal(replaced.added,1);
 assert.deepEqual(replaced.updates['listing:123'],sample);
 assert.equal(data['listing:123'].note,'本機備註');
 assert.equal(Object.hasOwn(replaced.updates,'filter'),false);
 assert.equal(Object.hasOwn(replaced.updates,'listing:789'),false);
});

test('關鍵字預設開啟，空清單與停用設定不恢復預設',()=>{
 assert.deepEqual(H.keywordSettings({}),{enabled:true,words:['限女','社宅','社會住宅']});
 assert.deepEqual(H.keywordSettings({titleKeywordFilter:{enabled:false,words:[]}}),{enabled:false,words:[]});
 assert.equal(H.titleKeywordMatch('限女套房',H.keywordSettings({titleKeywordFilter:{enabled:false}})),false);
 assert.equal(H.titleKeywordMatch('限女套房',{enabled:true,words:[]}),false);
});
test('關鍵字去空白去重，支援中英文分隔與全形英文',()=>{
 assert.deepEqual(H.normalizeKeywords(' 限女\n社宅，社會住宅、限女; ＡＢＣ；abc,, '),['限女','社宅','社會住宅','abc']);
});
test('標題任一關鍵字命中才隱藏，採字面比對而非正規表示式',()=>{
 const settings=H.keywordSettings({});
 for(const title of ['近捷運限女套房','優質社宅','社會住宅出租'])assert.equal(H.titleKeywordMatch(title,settings),true);
 for(const title of ['',null,'近捷運套房'])assert.equal(H.titleKeywordMatch(title,settings),false);
 assert.equal(H.titleKeywordMatch('AbC套房',{enabled:true,words:['abc']}),true);
 assert.equal(H.titleKeywordMatch('一般套房',{enabled:true,words:['.*']}),false);
});
