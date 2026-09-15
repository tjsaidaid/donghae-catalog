/* ===== (주)마스터 상품 카탈로그 - app.js ===== */

const CONFIG = {
  pageSize: 48,
  kakaoUrl: 'https://open.kakao.com/o/sdY9NIri',
  phone: '010-5925-7561',
  imageProxy: 'https://images.weserv.nl/?url=',
  imageWidth: 400,
  sheetId: '17MPa0n4aMNYBhBEaKPnGLQnxXM6STW-UB5yUif_FSBs',
  sheetGvizBase: 'https://docs.google.com/spreadsheets/d/17MPa0n4aMNYBhBEaKPnGLQnxXM6STW-UB5yUif_FSBs/gviz/tq?tqx=out:csv&sheet=',
};

const SHEET_TABS = [
  { name: '당일생물', gid: '322594718' },
  { name: '동해',     gid: '698072486' },
  { name: '경기',     gid: '1727608784' },
  { name: '인천',     gid: '448241740' },
  { name: '충무',     gid: '1348694541' },
  { name: '군산',     gid: '1105429635' },
  { name: '생고',     gid: '1605891700' },
  { name: '키트',     gid: '1258963443' },
  { name: '북구',     gid: '142458129' },
  { name: '김포',     gid: '1297549773' },
  { name: '떡',       gid: '121792941' },
  { name: '팡팡',     gid: '1834137489' },
  { name: '부산',     gid: '691416386' },
  { name: '단독',     gid: '1786413552' },
  { name: '단독(무료배송)', gid: '183236314' },
  { name: '단독(선물)',    gid: '1003860228' },
  { name: '찐한국',   gid: '1620505045' },
];

const CATEGORY_EMOJI = {
  '수산':'🐟','축산':'🥩','가공식품':'🍱',
  '김치·반찬':'🥬','생활용품':'🧴','농산물':'🌿',
  '과일':'🍑','기타':'📦',
};

let state = {
  allProducts:[],filtered:[],warehouses:[],categories:[],
  selectedWarehouse:'all',selectedCategory:'all',
  searchQuery:'',sortBy:'default',viewMode:'grid',page:1,
};

function parseCSV(text){
  const lines=text.split('\n'),result=[];
  for(const line of lines){
    if(!line.trim())continue;
    const row=[];let inQuote=false,cell='';
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){if(inQuote&&line[i+1]==='"'){cell+='"';i++;}else inQuote=!inQuote;}
      else if(ch===','&&!inQuote){row.push(cell.trim());cell='';}
      else cell+=ch;
    }
    row.push(cell.trim());result.push(row);
  }
  return result;
}

function parseSheetTab(csvText,tabName){
  const rows=parseCSV(csvText),products=[];
  let inSoldOut=false,headerFound=false;
  for(let i=0;i<rows.length;i++){
    const row=rows[i];if(!row||row.length<3)continue;
    const col0=(row[0]||'').trim(),col1=(row[1]||'').trim(),col2=(row[2]||'').trim();
    if(col2==='상품명'||col1==='창고명'){headerFound=true;inSoldOut=false;continue;}
    if(!headerFound)continue;
    if(col0.includes('품절')||col0.includes('일시 품절')){inSoldOut=true;continue;}
    if(!col2||!col1)continue;
    if(col1.includes('합배송')||col1.includes('창고별')||col2.includes('합배송'))continue;
    const noteAll=[row[8],row[9],row[10]].filter(Boolean).join(' ').trim();
    const isSoldOut=inSoldOut||noteAll.includes('품절')||noteAll.includes('파악중')||noteAll.includes('소진');
    const priceRaw=(row[3]||'').replace(/,/g,'').trim();
    let supplyPrice=0;
    if(priceRaw.includes('>')){const p=priceRaw.split('>');supplyPrice=parseInt(p[p.length-1].trim())||0;}
    else supplyPrice=parseInt(priceRaw)||0;
    const shipFeeRaw=(row[5]||'').replace(/,/g,'').replace(/\(.*\)/,'').trim();
    const shipFee=(shipFeeRaw==='무료배송'||shipFeeRaw==='0')?0:(parseInt(shipFeeRaw)||4000);
    const shelfLife=(col0!=='-'&&col0!==''&&!col0.includes('품절')&&!col0.includes('창고'))?col0:'';
    products.push({
      warehouse:tabName,sourceWarehouse:col1,category:guessCategory(col1,col2),
      name:col2,spec:[],supplyPrice,previousPrice:0,
      tax:(row[6]||'').trim(),courier:(row[4]||'').trim(),
      shipFee,orderCutoff:(row[7]||'').trim(),shelfLife,image:'',note:noteAll,
      _available:col0==='-'&&!isSoldOut,_soldOut:isSoldOut,
    });
  }
  return products;
}

function guessCategory(w,n){
  if(w==='생고')return'축산';if(w==='떡')return'가공식품';if(w==='찐한국')return'생활용품';
  if(/전복|꽃게|오징어|문어|새우|낙지|주꾸미|쭈꾸미|바지락|홍합|굴비|갈치|고등어|삼치|참돔|광어|연어|장어|참치|명태|골뱅이|소라|해삼|멍게|꼬막|홍어|피데기|코다리|아귀|대구|열기|도루묵|가자미|양미리|한치|호래기|민어|조기|멸치|전어|병어|밴댕이|방어|홍게|대게|킹크랩|랍스터|성게|미더덕|매생이|키조개|바위굴|개불|하모|꼼장어/.test(n))return'수산';
  if(/갈비|삼겹|목살|등심|꽃등심|채끝|살치|부채살|우삼겹|닭|오리|소고기|돼지|한우|육회|수육|족발|곱창|대창|막창|계란|오겹|뭉티기|육사시미|항정살|갈매기살|안창살|토시살|치마살|꽃갈비|LA갈비|등갈비|뼈|사골|우족|도가니/.test(n))return'축산';
  if(/김치|게장|젓갈|반찬|무침|동치미|명란젓|낙지젓|오징어젓|창난젓/.test(n))return'김치·반찬';
  if(/어묵|순대|만두|족발|보쌈|냉면|국밥|찌개|탕|전골|밀키트|까스|볶음|튀김|떡볶이|소떡|부대|염소탕|추어탕|재첩국|바람떡|인절미|찹쌀떡|쑥개떡|쑥떡|호박고지/.test(n))return'가공식품';
  if(/버섯|감자|고구마|케일|옥수수/.test(n))return'농산물';
  if(/복숭아|바나나|과일|오디/.test(n))return'과일';
  if(/세제|치약|핸드워시|가글|장갑/.test(n))return'생활용품';
  return'기타';
}

function normCategory(cat){return(!cat||cat.trim()==='')?'기타':cat.trim();}
function categoryClass(cat){const c=normCategory(cat);return c==='김치·반찬'?'badge-김치반찬':`badge-${c}`;}

async function init(){
  updateLoadingProgress(0);
  const allProducts=[];let loadedCount=0;
  const fetchPromises=SHEET_TABS.map(async(tab)=>{
    try{
      const url=CONFIG.sheetGvizBase+encodeURIComponent(tab.name)+'&t='+Date.now();
      const res=await fetch(url,{cache:'no-cache'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const products=parseSheetTab(await res.text(),tab.name);
      loadedCount++;updateLoadingProgress(Math.round(loadedCount/SHEET_TABS.length*100));
      return products;
    }catch(e){
      console.warn(`[${tab.name}] 로드 실패:`,e.message);
      loadedCount++;updateLoadingProgress(Math.round(loadedCount/SHEET_TABS.length*100));
      return[];
    }
  });
  const results=await Promise.all(fetchPromises);
  results.forEach(ps=>allProducts.push(...ps));
  if(allProducts.length===0){
    document.getElementById('product-grid').innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><p>상품 데이터를 불러오지 못했습니다.</p><small>페이지를 새로고침해주세요.</small></div>`;
    hideLoadingProgress();return;
  }
  state.allProducts=allProducts;
  const syncEl=document.getElementById('sync-time');
  if(syncEl){const now=new Date(),pad=n=>String(n).padStart(2,'0');syncEl.textContent=`마지막 동기화: ${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;}
  buildFilters();renderWarehouseFilters();renderCategoryPills();updateStats();hideLoadingProgress();applyFilters();
}

function updateLoadingProgress(pct){
  const bar=document.getElementById('loading-bar'),text=document.getElementById('loading-text-el');
  if(bar)bar.style.width=pct+'%';
  if(text)text.textContent=`구글 시트에서 상품 데이터 불러오는 중... ${pct}%`;
}
function hideLoadingProgress(){const wrap=document.getElementById('loading-progress-wrap');if(wrap)wrap.style.display='none';}

function buildFilters(){
  const wm={},cm={};
  state.allProducts.forEach(p=>{const w=p.warehouse||'기타';wm[w]=(wm[w]||0)+1;const c=normCategory(p.category);cm[c]=(cm[c]||0)+1;});
  state.warehouses=SHEET_TABS.filter(t=>wm[t.name]).map(t=>[t.name,wm[t.name]]);
  state.categories=Object.entries(cm).sort((a,b)=>b[1]-a[1]);
}

function renderWarehouseFilters(){
  const el=document.getElementById('warehouse-filters');if(!el)return;
  let html=`<button class="filter-btn active" data-warehouse="all" onclick="setWarehouse('all',this)"><span>🏪 전체 창고</span><span class="count">${state.allProducts.length}</span></button><hr class="divider">`;
  state.warehouses.forEach(([n,c])=>{html+=`<button class="filter-btn" data-warehouse="${n}" onclick="setWarehouse('${n}',this)"><span>${getWarehouseIcon(n)} ${n}</span><span class="count">${c}</span></button>`;});
  el.innerHTML=html;
}

function getWarehouseIcon(n){
  const m={'당일생물':'🌊','생고':'🥩','떡':'🍡','팡팡':'🔥','찐한국':'🏷️','단독(선물)':'🎁','단독(무료배송)':'📦','단독':'✨'};
  return m[n]||'🏬';
}

function renderCategoryPills(){
  const el=document.getElementById('category-pills');if(!el)return;
  let html=`<button class="pill active" data-cat="all" onclick="setCategory('all',this)">전체 <span style="opacity:.7">${state.allProducts.length}</span></button>`;
  state.categories.forEach(([cat,cnt])=>{const emoji=CATEGORY_EMOJI[cat]||'📦';html+=`<button class="pill" data-cat="${cat}" onclick="setCategory('${cat}',this)"><span class="dot"></span>${emoji} ${cat} <span style="opacity:.6">${cnt}</span></button>`;});
  el.innerHTML=html;
}

function updateStats(){
  const e=document.getElementById('total-count');if(e)e.textContent=state.allProducts.length.toLocaleString();
  const w=document.getElementById('warehouse-count');if(w)w.textContent=state.warehouses.length;
  const c=document.getElementById('category-count');if(c)c.textContent=state.categories.length;
}

function applyFilters(){
  let r=[...state.allProducts];
  if(state.selectedWarehouse!=='all')r=r.filter(p=>p.warehouse===state.selectedWarehouse);
  if(state.selectedCategory!=='all')r=r.filter(p=>normCategory(p.category)===state.selectedCategory);
  if(state.searchQuery.trim()){const q=state.searchQuery.trim().toLowerCase();r=r.filter(p=>(p.name||'').toLowerCase().includes(q)||(p.warehouse||'').toLowerCase().includes(q)||(p.sourceWarehouse||'').toLowerCase().includes(q)||(p.category||'').toLowerCase().includes(q));}
  if(state.sortBy==='name-asc')r.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));
  else if(state.sortBy==='name-desc')r.sort((a,b)=>(b.name||'').localeCompare(a.name||'','ko'));
  else if(state.sortBy==='price-asc')r.sort((a,b)=>(a.supplyPrice||0)-(b.supplyPrice||0));
  else if(state.sortBy==='price-desc')r.sort((a,b)=>(b.supplyPrice||0)-(a.supplyPrice||0));
  r.sort((a,b)=>(a._soldOut?1:0)-(b._soldOut?1:0));
  state.filtered=r;state.page=1;renderProducts();updateResultInfo();
}

function updateResultInfo(){
  const el=document.getElementById('result-info');if(!el)return;
  const total=state.filtered.length,showing=Math.min(state.page*CONFIG.pageSize,total);
  el.innerHTML=`<strong>${total.toLocaleString()}</strong>개 상품 중 <strong>${showing.toLocaleString()}</strong>개 표시`;
}

function renderProducts(append=false){
  const grid=document.getElementById('product-grid');if(!grid)return;
  const end=state.page*CONFIG.pageSize;
  if(!append){
    if(state.filtered.length===0){grid.innerHTML=`<div class="empty-state"><div class="icon">🔍</div><p>검색 결과가 없습니다.</p><small>다른 검색어나 필터를 사용해보세요.</small></div>`;document.getElementById('load-more-wrap').style.display='none';return;}
    grid.innerHTML=state.filtered.slice(0,end).map(p=>renderCard(p)).join('');
  }else{const start=(state.page-1)*CONFIG.pageSize;grid.insertAdjacentHTML('beforeend',state.filtered.slice(start,end).map(p=>renderCard(p)).join(''));}
  const lw=document.getElementById('load-more-wrap');
  if(lw){if(end<state.filtered.length){lw.style.display='block';document.getElementById('load-more-btn').textContent=`더 보기 (${(state.filtered.length-end).toLocaleString()}개 남음)`;}else lw.style.display='none';}
  updateResultInfo();
}

function renderCard(p){
  const cat=normCategory(p.category),emoji=CATEGORY_EMOJI[cat]||'📦',catClass=categoryClass(p.category);
  const isFree=p.shipFee===0,isSoldOut=p._soldOut,isAvail=p._available;
  const imgHtml=p.image?`<img src="${CONFIG.imageProxy}${encodeURIComponent(p.image)}&w=${CONFIG.imageWidth}&output=webp" alt="${escHtml(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'img-placeholder\\'>${emoji}</div>'">`:`<div class="img-placeholder">${emoji}</div>`;
  const wLabel=p.sourceWarehouse&&p.sourceWarehouse!==p.warehouse?`${escHtml(p.warehouse)} · ${escHtml(p.sourceWarehouse)}`:escHtml(p.warehouse);
  return `<div class="product-card${isSoldOut?' soldout':''}" ${isSoldOut?'':'onclick="openModal('+escAttr(JSON.stringify(p))+')"'}><div class="card-img">${imgHtml}${isSoldOut?'<div class="soldout-overlay"><span>일시 품절</span></div>':''}<div class="card-badges"><span class="badge-category ${catClass}">${cat}</span>${isFree?'<span class="badge-free">무료배송</span>':''}</div></div><div class="card-body"><div class="card-warehouse">${isAvail?'<span class="avail-dot">●</span>':''}<span class="dot"></span>${wLabel}</div><div class="card-name">${escHtml(p.name)}</div><div class="card-meta"><span class="card-price-inquiry">${isSoldOut?'일시품절':'단가 문의'}</span><span class="card-shipping">${isFree?'<span class="free">무료배송</span>':`배송비 ${(p.shipFee||0).toLocaleString()}원`}</span></div></div></div>`;
}

function escHtml(s){return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');}
function escAttr(s){return`'${String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}' `;}

function openModal(product){
  const overlay=document.getElementById('modal-overlay');
  const cat=normCategory(product.category),catClass=categoryClass(product.category),isFree=product.shipFee===0;
  const imgUrl=product.image?`${CONFIG.imageProxy}${encodeURIComponent(product.image)}&w=800&output=webp`:'';
  const specHtml=Array.isArray(product.spec)&&product.spec.length?product.spec.filter(s=>s.trim()).map(s=>`<li>${escHtml(s)}</li>`).join(''):'';
  const noteHtml=product.note?`<div style="margin-top:12px;padding:10px 12px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:8px;font-size:12px;color:#D97706;">📝 ${escHtml(product.note)}</div>`:'';
  const wLabel=product.sourceWarehouse&&product.sourceWarehouse!==product.warehouse?`${escHtml(product.warehouse)} · ${escHtml(product.sourceWarehouse)}`:escHtml(product.warehouse);
  overlay.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><div class="modal-header"><div><div class="modal-title">${escHtml(product.name)}</div><span class="modal-warehouse-tag">🏬 ${wLabel}</span><span class="badge-category ${catClass}" style="margin-left:6px;display:inline-block;">${cat}</span></div><button class="modal-close" onclick="closeModal()" aria-label="닫기">✕</button></div>${imgUrl?`<img class="modal-img" src="${imgUrl}" alt="${escHtml(product.name)}" loading="lazy">`:''}<div class="modal-body"><div class="modal-content"><div class="modal-info-grid"><div class="info-item"><div class="info-label">공급단가</div><div class="info-value inquiry">별도 문의</div></div><div class="info-item"><div class="info-label">배송비</div><div class="info-value ${isFree?'price':''}">${isFree?'무료배송 🎉':`${(product.shipFee||0).toLocaleString()}원`}</div></div><div class="info-item"><div class="info-label">택배사</div><div class="info-value">${escHtml(product.courier||'-')}</div></div><div class="info-item"><div class="info-label">주문마감</div><div class="info-value">${escHtml(product.orderCutoff||'-')}</div></div><div class="info-item"><div class="info-label">세금</div><div class="info-value">${escHtml(product.tax||'-')}</div></div>${product.shelfLife&&product.shelfLife!=='-'?`<div class="info-item"><div class="info-label">유통기한</div><div class="info-value">${escHtml(product.shelfLife)}</div></div>`:''}</div>${specHtml?`<div class="spec-section"><div class="spec-title">상품 상세 정보</div><ul class="spec-list">${specHtml}</ul></div>`:''}${noteHtml}</div></div><div class="modal-footer"><a href="${CONFIG.kakaoUrl}" target="_blank" rel="noopener" class="btn-modal-kakao">💬 카카오톡으로 문의하기</a><a href="tel:${CONFIG.phone.replace(/-/g,'')}" class="btn-modal-call">📞 전화 문의</a></div></div>`;
  overlay.classList.add('active');document.body.style.overflow='hidden';
}

function closeModal(){document.getElementById('modal-overlay').classList.remove('active');document.body.style.overflow='';}
function setWarehouse(n,btn){state.selectedWarehouse=n;document.querySelectorAll('[data-warehouse]').forEach(el=>el.classList.remove('active'));if(btn)btn.classList.add('active');applyFilters();}
function setCategory(c,btn){state.selectedCategory=c;document.querySelectorAll('[data-cat]').forEach(el=>el.classList.remove('active'));if(btn)btn.classList.add('active');applyFilters();}
function setSort(v){state.sortBy=v;applyFilters();}
function setView(mode){state.viewMode=mode;const g=document.getElementById('product-grid');if(g)g.classList.toggle('list-view',mode==='list');document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));}
function loadMore(){state.page++;renderProducts(true);}
let searchTimer;
function onSearch(e){clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.searchQuery=e.target.value;applyFilters();},250);}

document.addEventListener('DOMContentLoaded',()=>{
  const overlay=document.getElementById('modal-overlay');
  if(overlay)overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  const hs=document.getElementById('header-search');if(hs)hs.addEventListener('input',onSearch);
  const ss=document.getElementById('sort-select');if(ss)ss.addEventListener('change',()=>setSort(ss.value));
  init();
});
