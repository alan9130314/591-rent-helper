document.getElementById('add').onclick=()=>{
 const card=document.createElement('div');card.className='item';
 const info=document.createElement('div');info.className='item-info';
 const a=document.createElement('a');a.href='https://rent.591.com.tw/21964749';a.textContent='動態載入 · 同一間物件 A';
 info.append(a);card.append(info);document.getElementById('list').append(card);
};
document.getElementById('add-keyword').onclick=()=>{
 const card=document.createElement('div');card.className='item';
 const info=document.createElement('div');info.className='item-info';
 const title=document.createElement('div');title.className='item-info-title';
 const a=document.createElement('a');a.href='https://rent.591.com.tw/21964763';a.textContent='動態載入社宅';
 title.append(a);info.append(title);card.append(info);document.getElementById('list').append(card);
};
