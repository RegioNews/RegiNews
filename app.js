let allItems = []; let currentRegion = null; let polygonSeries = null;

function escapeHtml(t){const d=document.createElement('div');d.textContent=t||'';return d.innerHTML}

async function fetchRss(url){
  for(const p of PROXIES){
    try{
      const r=await fetch(p.make(url));
      if(!r.ok) continue;
      if(p.type==='json'){
        const d=await r.json();
        return (d.items||[]).map(i=>({title:i.title||'',link:i.link||url,pubDate:i.pubDate||'',description:i.description||i.content||''}));
      }
      const txt=await r.text();
      const doc=new DOMParser().parseFromString(txt,'text/xml');
      return [...doc.querySelectorAll('item,entry')].map(i=>({
        title:i.querySelector('title')?.textContent||'',
        link:i.querySelector('link')?.textContent||i.querySelector('link')?.getAttribute('href')||url,
        pubDate:i.querySelector('pubDate,updated,published')?.textContent||'',
        description:i.querySelector('description,summary')?.textContent||''
      })).filter(x=>x.title);
    }catch(e){}
  }
  return [];
}

async function fetchHtmlHeadlines(url){
  try{
    const proxy=`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const r=await fetch(proxy);
    const html=await r.text();
    const doc=new DOMParser().parseFromString(html,'text/html');
    const links=[...doc.querySelectorAll('a')]
      .map(a=>({title:(a.textContent||'').trim(),link:a.href||''}))
      .filter(x=>x.title.length>25 && x.link && /^https?:/i.test(x.link))
      .slice(0,20);
    return links.map(x=>({title:x.title,link:x.link,pubDate:'',description:'Источник без RSS: заголовок извлечён со страницы сайта'}));
  }catch(e){return []}
}

function makeTelegramItem(url,name){
  return [{title:`Открыть канал ${name}`,link:url,pubDate:'',description:'Подтверждённый Telegram-канал. В дашборде отображается как внешний источник без автоматической RSS-ленты.'}]
}

async function loadAll(){
  allItems=[];
  for(const region of REGIONS){
    const sources=VERIFIED_SOURCES[region.key]||[];
    for(const src of sources){
      let items=[];
      if(src.mode==='rss') items=await fetchRss(src.url);
      if(src.mode==='html') items=await fetchHtmlHeadlines(src.url);
      if(src.mode==='telegram') items=makeTelegramItem(src.url, src.name);
      items=items.map(i=>({...i,region:region.key,regionName:region.name,source:src.name,sourceType:src.type}));
      allItems.push(...items);
    }
  }
  renderRegions();
  renderNews();
  updateMap();
}

function renderRegions(){
  const box=document.getElementById('regionList');
  box.innerHTML=REGIONS.map(r=>{
    const count=allItems.filter(x=>x.region===r.key).length;
    return `<button class="region-btn ${currentRegion===r.key?'active':''}" onclick="selectRegion('${r.key}')">${r.name} <span style="float:right;color:#7dd3fc">${count}</span></button>`;
  }).join('');
}

function renderNews(){
  const el=document.getElementById('newsList');
  const items=allItems.filter(i=>!currentRegion || i.region===currentRegion);
  const regionName=currentRegion ? (REGIONS.find(r=>r.key===currentRegion)?.name || '') : '';
  document.getElementById('feedTitle').textContent=currentRegion ? `Новости: ${regionName}` : 'Все новости';
  if(!items.length){el.innerHTML='<div class="empty">Нет данных</div>';return;}
  el.innerHTML=items.map(i=>`<article class="news-card"><div><span class="tag">${i.sourceType}</span><span class="tag">${escapeHtml(i.source)}</span></div><h3>${escapeHtml(i.title)}</h3><div class="news-meta">${escapeHtml(i.regionName)}</div><div>${escapeHtml(i.description).slice(0,220)}</div><div style="margin-top:10px"><a href="${i.link}" target="_blank" rel="noopener noreferrer">Открыть источник →</a></div></article>`).join('');
}

function selectRegion(key){currentRegion=currentRegion===key?null:key;renderRegions();renderNews();updateMap();}

function updateMap(){
  if(!polygonSeries) return;
  polygonSeries.mapPolygons.each(p=>{
    const name=(p.dataItem?.dataContext?.name||'').toLowerCase();
    const reg=REGIONS.find(r=>name.includes(r.name.toLowerCase()));
    if(reg){
      const c=allItems.filter(x=>x.region===reg.key).length;
      p.set('fill', c>0 ? am5.color(0x0ea5e9) : am5.color(0x22384a));
      p.set('stroke', currentRegion===reg.key ? am5.color(0xffffff) : am5.color(0x456077));
      p.set('strokeWidth', currentRegion===reg.key ? 2 : 0.6);
    }
  });
}

am5.ready(function(){
  const root=am5.Root.new('mapdiv');
  root.setThemes([am5themes_Animated.new(root)]);
  const chart=am5.MapChart.new(root,{panX:'translateX',panY:'translateY',projection:am5.geoMercator()});
  polygonSeries=am5.MapPolygonSeries.new(root,{geoJSON:am5geodata_russiaLow});
  polygonSeries.mapPolygons.template.setAll({tooltipText:'{name}',interactive:true,fill:am5.color(0x22384a),stroke:am5.color(0x456077)});
  polygonSeries.mapPolygons.template.states.create('hover',{fill:am5.color(0x1d4f6b)});
  polygonSeries.mapPolygons.template.events.on('click', ev=>{
    const name=ev.target.dataItem?.dataContext?.name||'';
    const reg=REGIONS.find(r=>name.includes(r.name));
    if(reg) selectRegion(reg.key);
  });
  chart.series.push(polygonSeries);
  loadAll();
});

document.getElementById('refreshBtn').addEventListener('click', loadAll);