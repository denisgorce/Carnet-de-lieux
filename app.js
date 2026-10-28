const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>d?new Date(d+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'';
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const plural=(n,a,b)=>n+' '+(n>1?b:a);
const tap=()=>{try{navigator.vibrate&&navigator.vibrate(8)}catch{}};

const IC={
  route:'<path d="M3 11l18-8-8 18-2-8z"/>',
  share:'<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  pin:'<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  locate:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="3"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  down:'<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  filter:'<path d="M3 5h18M6 12h12M10 19h4"/>'
};
const I=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;

const CATS={restaurant:['Restaurant','🍽️','#e8590c'],nature:['Nature','🌿','#2f9e44'],culture:['Culture','🏛️','#7048e8'],plage:['Plage','🏖️','#1c7ed6'],ville:['Ville','🏙️','#495057'],hebergement:['Hébergement','🛏️','#d6336c'],autre:['Autre','📍','#0b7285']};
const cat=k=>CATS[k]||CATS.autre;
const TL={city:'Ville',town:'Ville',village:'Commune',municipality:'Commune',hamlet:'Hameau',suburb:'Quartier',county:'Département',state:'Région',region:'Région',country:'Pays',administrative:'Territoire',postcode:'Code postal',island:'Île'};

/* ---------- géométrie ---------- */
const km=(a,b)=>{const r=Math.PI/180,R=6371,dA=(b[0]-a[0])*r,dO=(b[1]-a[1])*r,x=Math.sin(dA/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dO/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const fmtD=d=>d<1?Math.round(d*1000)+' m':d<10?d.toFixed(1)+' km':Math.round(d)+' km';
const inRing=(pt,ring)=>{const [x,y]=pt;let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c};
const inPoly=(pt,g)=>{const ps=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];return ps.some(rs=>inRing(pt,rs[0])&&!rs.slice(1).some(h=>inRing(pt,h)))};
const v2km=v=>Math.round(10**(v/100)),km2v=k=>Math.round(Math.log10(k)*100);

/* ---------- Supabase ---------- */
const CFG=window.CONFIG||{};
const configured=!!CFG.url&&!CFG.url.includes('VOTRE');
const sb=configured?window.supabase.createClient(CFG.url,CFG.key):null;
const token=new URLSearchParams(location.search).get('c');
const ro=!!token;
const BASE=(CFG.shareBase&&!CFG.shareBase.includes('VOTRE')?CFG.shareBase:location.origin+location.pathname).replace(/\/?$/,'/');
const shareUrl=()=>BASE+'?c='+shareToken;
const pub=p=>sb.storage.from('photos').getPublicUrl(p).data.publicUrl;
const row=r=>({id:r.id,title:r.title,date:r.visited,desc:r.descr,lat:r.lat,lng:r.lng,photos:r.photos||[],cat:r.category||'autre',fav:!!r.favorite});

/* ---------- état ---------- */
let places=[],markers={},urls=[],draft=null,draftMarker=null,me=null,shareToken=null,userPos=null,userDot=null,pick=null,sort='recent',exMode='t',selId=null;
const rad={km:25};
const filter={q:'',cats:new Set(),fav:false,zone:null};

/* ---------- carte ---------- */
const map=L.map('map',{zoomControl:false}).setView([46.6,2.4],6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
const cluster=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:44}).addTo(map);
const PIN='M20 47C20 47 4 31 4 18a16 16 0 0 1 32 0c0 13-16 29-16 29z';
const pinIcon=(k,state='')=>{const [,e,c]=cat(k);return L.divIcon({className:'',html:`<span class="mk ${state}" style="--c:${state==='draft'?'#ffc233':c}"><svg viewBox="0 0 40 48" aria-hidden="true"><path d="${PIN}"/><circle cx="20" cy="18" r="11"/></svg><i>${e}</i></span>`,iconSize:[40,48],iconAnchor:[20,46]})};
const zoneStyle={color:'#1f8f66',weight:2.5,fillColor:'#1f8f66',fillOpacity:.1,dashArray:'6 6'};

function toast(t,ms=2600){const e=$('#toast');e.textContent=t;e.hidden=false;e.style.animation='none';void e.offsetWidth;e.style.animation='';clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,ms)}
const hideSplash=()=>{const s=$('#splash');if(s&&!s.classList.contains('off')){s.classList.add('off');setTimeout(()=>s.remove(),600)}};
const fit=()=>{const v=visible();if(v.length)map.fitBounds(L.latLngBounds(v.map(p=>[p.lat,p.lng])).pad(.3),{maxZoom:12})};
const refPoint=()=>filter.zone?.type==='circle'?filter.zone.center:userPos;
function highlight(id){
  const set=(i,s)=>{const q=places.find(x=>x.id===i),m=markers[i];if(q&&m){m.setIcon(pinIcon(q.cat,s));m.setZIndexOffset(s?1000:0)}};
  if(selId&&selId!==id)set(selId,'');
  selId=id;if(id)set(id,'sel');
}

/* ---------- filtres ---------- */
function visible(){
  const q=norm(filter.q),z=filter.zone;
  return places.filter(p=>{
    if(filter.cats.size&&!filter.cats.has(p.cat))return false;
    if(filter.fav&&!p.fav)return false;
    if(q&&!norm(p.title+' '+p.desc).includes(q))return false;
    if(z){
      if(z.type==='circle'){if(km(z.center,[p.lat,p.lng])>z.km)return false}
      else if(z.geo&&/Polygon/.test(z.geo.type)){if(!inPoly([p.lng,p.lat],z.geo))return false}
      else if(!z.bounds.contains([p.lat,p.lng]))return false;
    }
    return true;
  });
}
function refreshAll(){
  const vis=visible();
  cluster.clearLayers();markers={};
  vis.forEach(p=>{const m=L.marker([p.lat,p.lng],{icon:pinIcon(p.cat,p.id===selId?'sel':''),title:p.title,zIndexOffset:p.id===selId?1000:0}).on('click',()=>{tap();showPlace(p.id)});markers[p.id]=m;cluster.addLayer(m)});
  renderList(vis);renderZone(vis.length);
  const bd=$('#bd');bd.textContent=vis.length;bd.hidden=!places.length;
  $('#hint').hidden=!(me&&!ro&&!places.length);
  const c=$('#cnt');
  if(c){c.innerHTML=filter.zone?`<span>${I('pin')} ${plural(vis.length,'lieu','lieux')} dans la zone</span><button id="clr">Effacer</button>`:'';on('#clr',()=>{clearZone();refreshAll()})}
}
function renderZone(n){
  const z=filter.zone,e=$('#zone');
  if(!z){e.hidden=true;return}
  e.hidden=false;e.setAttribute('aria-label','Effacer le filtre de zone');
  e.innerHTML=`${I('pin')}<span>${z.type==='circle'?'Rayon '+z.km+' km':esc(z.name)} · ${plural(n,'lieu','lieux')}</span>${I('x')}`;
}
function clearZone(){if(filter.zone?.layer)filter.zone.layer.remove();filter.zone=null}
function applyZone(z){
  clearZone();
  if(z.type==='circle')z.layer=L.circle(z.center,{...zoneStyle,radius:z.km*1000});
  else if(z.geo&&/Polygon/.test(z.geo.type))z.layer=L.geoJSON(z.geo,{style:zoneStyle});
  else z.layer=L.rectangle(z.bounds,zoneStyle);
  z.layer.addTo(map);filter.zone=z;
  map.fitBounds(z.layer.getBounds(),{padding:[30,30]});
  refreshAll();
}
function resetFilters(){
  filter.q='';filter.cats.clear();filter.fav=false;$('#q').value='';$('#qx').hidden=true;
  $$('#chips .chip').forEach(c=>c.classList.remove('on'));clearZone();refreshAll();
}
function buildChips(){
  $('#chips').innerHTML=`<button class="chip" data-f="fav">${I('star')} Favoris</button>`+Object.entries(CATS).map(([k,[n,e]])=>`<button class="chip" data-k="${k}">${e} ${n}</button>`).join('');
  $$('#chips .chip').forEach(b=>b.onclick=()=>{
    tap();
    if(b.dataset.f){filter.fav=!filter.fav;b.classList.toggle('on',filter.fav)}
    else{const k=b.dataset.k;filter.cats.has(k)?filter.cats.delete(k):filter.cats.add(k);b.classList.toggle('on',filter.cats.has(k))}
    refreshAll();
  });
}

/* ---------- liste ---------- */
function skeleton(){$('#list').innerHTML='<div class="lh"><span class="sk" style="width:110px;height:20px"></span></div>'+'<div class="card sk-card"><div class="th sk"></div><div class="tx"><i class="sk"></i><i class="sk s"></i></div></div>'.repeat(4)}
function renderList(vis){
  const ref=refPoint();
  const it=vis.map(p=>({p,d:ref?km(ref,[p.lat,p.lng]):null}));
  it.sort(sort==='old'?(a,b)=>(a.p.date||'').localeCompare(b.p.date||''):sort==='name'?(a,b)=>a.p.title.localeCompare(b.p.title,'fr'):sort==='dist'&&ref?(a,b)=>a.d-b.d:(a,b)=>(b.p.date||'').localeCompare(a.p.date||''));
  const cards=it.map(({p,d},i)=>{
    const [cn,ce,cc]=cat(p.cat),n=p.photos.length;
    const th=n?`<img src="${esc(pub(p.photos[0]))}" alt="" loading="lazy">${n>1?`<em>${I('img')}${n}</em>`:''}`:`<span style="background:color-mix(in srgb,${cc} 22%,var(--sf))">${ce}</span>`;
    return `<button class="card" style="--i:${Math.min(i,10)}" data-id="${p.id}"><div class="th">${th}</div><div class="tx"><b>${esc(p.title)}</b><small><i class="dot" style="--c:${cc}"></i>${cn}${p.date?' · '+fmt(p.date):''}</small>${d!=null?`<small>${I('pin')} à ${fmtD(d)}</small>`:''}</div>${p.fav?`<span class="fav">${I('star')}</span>`:''}</button>`;
  }).join('');
  let body=cards;
  if(!vis.length){
    body=!places.length
      ?`<div class="empty"><div class="big">${I('pin')}</div><h3>${ro?'Ce carnet est vide':'Votre carnet est vide'}</h3><p>${ro?'Aucun lieu n’a encore été ajouté.':'Placez sur la carte les lieux que vous avez visités, avec vos photos et vos souvenirs.'}</p>${ro?'':'<button class="b p" id="emAdd">Ajouter mon premier lieu</button>'}</div>`
      :`<div class="empty"><div class="big">${I('filter')}</div><h3>Aucun résultat</h3><p>Aucun lieu ne correspond à ces filtres.</p><button class="b p" id="emReset">Réinitialiser les filtres</button></div>`;
  }
  $('#list').innerHTML=`<div class="lh"><span>${plural(vis.length,'lieu','lieux')}${ro?' · lecture seule':''}</span>${vis.length>1?'<select id="sort" aria-label="Trier"><option value="recent">Plus récents</option><option value="old">Plus anciens</option><option value="name">Nom A–Z</option><option value="dist">Distance</option></select>':''}</div>${body}`;
  const s=$('#sort');if(s){s.value=sort;s.onchange=e=>{sort=e.target.value;renderList(visible())}}
  $$('#list .card').forEach(b=>b.onclick=()=>{tap();showPlace(b.dataset.id,true)});
  on('#emAdd',()=>{go('map');showAdd()});on('#emReset',resetFilters);
}

/* ---------- navigation & panneau ---------- */
const sheet=$('#sheet');
const setTab=t=>$$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
function setSheet(html,hero='',cls=''){
  urls.forEach(URL.revokeObjectURL);urls=[];
  sheet.innerHTML=`<i class="grab"></i><button class="xc" id="xc" aria-label="Fermer">${I('x')}</button>${hero}<div class="in ${cls}">${html}</div>`;
  sheet.classList.toggle('hh',!!hero&&!/empty/.test(hero.slice(0,40))||/<img/.test(hero));
  sheet.scrollTop=0;sheet.classList.add('open');document.body.classList.add('so');on('#xc',closeSheet);
}
function closeSheet(){
  sheet.classList.remove('open');document.body.classList.remove('so');
  clearDraft();highlight(null);setTab($('#listview').hidden?'map':'list');
}
function clearDraft(){draft=null;if(draftMarker){draftMarker.remove();draftMarker=null}}
function go(t){
  pick=null;tap();
  if(t==='map'||t==='list'){const l=t==='list';$('#listview').hidden=!l;document.body.classList.toggle('lv',l);closeSheet();return}
  setTab(t);
  if(t==='explore')showExplore();
  if(t==='account')me?showAccount():showLogin();
}
$$('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.t));
const src=b=>{if(typeof b==='string')return pub(b);const u=URL.createObjectURL(b);urls.push(u);return u};
function lift(ll){map.setView(ll,Math.max(map.getZoom(),13),{animate:true});map.panBy([0,Math.round(innerHeight*.2)],{animate:false})}
function locate(cb){
  if(!navigator.geolocation)return toast('La localisation n’est pas disponible sur cet appareil');
  toast('Recherche de votre position…',8000);
  navigator.geolocation.getCurrentPosition(pos=>{
    $('#toast').hidden=true;userPos=[pos.coords.latitude,pos.coords.longitude];
    userDot?userDot.setLatLng(userPos):userDot=L.circleMarker(userPos,{radius:8,color:'#fff',weight:3,fillColor:'#1c7ed6',fillOpacity:1}).addTo(map);
    cb&&cb(userPos);
  },()=>toast('Position introuvable. Autorisez la localisation dans les réglages.',4000),{enableHighAccuracy:true,timeout:15000});
}
/* glisser vers le bas pour fermer le panneau */
(()=>{
  let y0=0,dy=0,drag=false;
  sheet.addEventListener('touchstart',e=>{
    if(sheet.scrollTop>0||e.target.closest('.hero,.strip,.chips,input,textarea,select'))return;
    y0=e.touches[0].clientY;dy=0;drag=true;
  },{passive:true});
  sheet.addEventListener('touchmove',e=>{
    if(!drag)return;dy=Math.max(0,e.touches[0].clientY-y0);
    if(dy>6){sheet.style.transition='none';sheet.style.transform=`translateY(${dy}px)`}
  },{passive:true});
  sheet.addEventListener('touchend',()=>{
    if(!drag)return;drag=false;sheet.style.transition='';sheet.style.transform='';
    if(dy>100)closeSheet();
  });
})();

/* ---------- visionneuse photos ---------- */
let lbList=[],lbI=0;
function lbShow(){$('#lb img').src=lbList[lbI];$('#lbc').textContent=lbList.length>1?(lbI+1)+' / '+lbList.length:'';$('#lbc').hidden=$('#lb .prev').hidden=$('#lb .next').hidden=lbList.length<2}
const lbMove=d=>{lbI=(lbI+d+lbList.length)%lbList.length;lbShow()};
function openLb(list,i){lbList=list;lbI=i;$('#lb').classList.add('on');lbShow()}
$('#lbx').onclick=()=>$('#lb').classList.remove('on');
$('#lb .prev').onclick=e=>{e.stopPropagation();lbMove(-1)};$('#lb .next').onclick=e=>{e.stopPropagation();lbMove(1)};
$('#lb').onclick=e=>{if(e.target.id==='lb')$('#lb').classList.remove('on')};
(()=>{let x0=0;const lb=$('#lb');lb.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});lb.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>60&&lbList.length>1)lbMove(d<0?1:-1)})})();

/* ---------- connexion ---------- */
function showLogin(){
  setSheet(`<h2>Connexion</h2><p class="meta">Entrez votre e-mail : vous recevrez un code de connexion, sans mot de passe.</p>
  <label for="em">Adresse e-mail</label><input type="email" id="em" autocomplete="email" inputmode="email" placeholder="vous@exemple.fr">
  <div class="fbar"><button class="b p" id="go">Recevoir le code</button></div>`,'','form');
  on('#go',async()=>{
    const email=$('#em').value.trim();if(!email)return toast('Saisissez votre adresse e-mail');
    const b=$('#go');b.disabled=true;b.textContent='Envoi…';
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:BASE}});
    if(error){b.disabled=false;b.textContent='Recevoir le code';return toast(error.message,5000)}
    showCode(email);
  });
}
function showCode(email){
  setSheet(`<h2>Saisissez le code reçu</h2><p class="meta">Un e-mail vient d’être envoyé à ${esc(email)}. Recopiez le code qu’il contient.</p>
  <label for="cd">Code de connexion</label><input type="text" id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Code">
  <div class="fbar"><button class="b" id="bk">Changer d’adresse</button><button class="b p" id="vf">Valider</button></div>`,'','form');
  on('#vf',async()=>{
    const t=$('#cd').value.trim();if(!t)return toast('Saisissez le code');
    const {error}=await sb.auth.verifyOtp({email,token:t,type:'email'});
    if(error)toast('Code invalide ou expiré',4000);
  });
  on('#bk',showLogin);
}

/* ---------- compte ---------- */
function showAccount(){
  const np=places.reduce((n,p)=>n+p.photos.length,0),nf=places.filter(p=>p.fav).length,em=me.email||'';
  setSheet(`<div class="who"><span class="av">${esc((em[0]||'?').toUpperCase())}</span><div><b>${esc(em)}</b><small>Connecté</small></div></div>
  <div class="stats"><div><b>${places.length}</b><small>lieux</small></div><div><b>${np}</b><small>photos</small></div><div><b>${nf}</b><small>favoris</small></div></div>
  <h3>Partager en lecture seule</h3><p class="meta">Vos amis voient le carnet sans pouvoir le modifier. Toute personne qui a ce lien peut le consulter.</p>
  <div class="link">${esc(shareUrl())}</div>
  <div class="stack"><button class="b p" id="sh">${I('share')} Envoyer le lien</button><button class="b" id="rg">Créer un nouveau lien</button></div>
  <h3>Mes données</h3><div class="stack"><button class="b" id="ex">${I('down')} Exporter en GeoJSON</button><button class="b d" id="out">${I('out')} Se déconnecter</button></div>`);
  on('#sh',()=>shareLink(shareUrl(),'Mon carnet de lieux'));
  on('#ex',exportGeo);on('#out',()=>sb.auth.signOut());
  on('#rg',async()=>{
    if(!confirm('Créer un nouveau lien ? L’ancien ne fonctionnera plus.'))return;
    const t=crypto.randomUUID().replaceAll('-','');
    const {error}=await sb.from('carnets').update({share_token:t}).eq('owner',me.id);
    if(error)return toast(error.message,4000);shareToken=t;showAccount();toast('Nouveau lien créé');
  });
}
async function shareLink(u,title,text){
  if(navigator.share){try{await navigator.share({title,text,url:u})}catch{}return}
  try{await navigator.clipboard.writeText(u);toast('Lien copié')}catch{toast(u,6000)}
}
async function exportGeo(){
  const fc={type:'FeatureCollection',features:places.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{titre:p.title,date:p.date,description:p.desc,categorie:cat(p.cat)[0],favori:p.fav,photos:p.photos.map(pub)}}))};
  const f=new File([JSON.stringify(fc,null,1)],'carnet-de-lieux-'+today()+'.geojson',{type:'application/json'});
  if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:'Carnet de lieux'});return}catch{}}
  const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}

/* ---------- explorer : territoire & rayon ---------- */
function showExplore(m){
  if(m)exMode=m;
  setSheet(`<h2>Explorer</h2><p class="meta">Filtrez vos lieux par zone géographique.</p>
  <div class="seg" data-m="${exMode}"><i></i><button data-m="t" class="${exMode==='t'?'on':''}">Territoire</button><button data-m="r" class="${exMode==='r'?'on':''}">Rayon</button></div>
  <div id="pane"></div><div class="res" id="cnt"></div>
  <div class="fbar"><button class="b" id="seeM">Voir la carte</button><button class="b p" id="seeL">Voir la liste</button></div>`,'','form');
  $$('.seg button').forEach(b=>b.onclick=()=>{tap();exMode=b.dataset.m;$('.seg').dataset.m=exMode;$$('.seg button').forEach(x=>x.classList.toggle('on',x===b));drawPane()});
  on('#seeL',()=>go('list'));on('#seeM',()=>go('map'));
  drawPane();refreshAll();
}
const drawPane=()=>exMode==='t'?paneTerritory():paneRadius();
function paneTerritory(){
  $('#pane').innerHTML=`<form class="inl" id="tf"><input type="search" class="f" id="tq" placeholder="Ville, département, région, pays…" autocomplete="off" aria-label="Territoire"><button class="b p">Chercher</button></form><div id="tr"></div>`;
  $('#tf').onsubmit=async e=>{
    e.preventDefault();const q=$('#tq').value.trim();if(!q)return;
    $('#tr').innerHTML='<div class="item sk" style="height:60px"></div><div class="item sk" style="height:60px"></div>';
    try{
      const r=await fetch('https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q,format:'jsonv2',polygon_geojson:1,polygon_threshold:.005,limit:6,'accept-language':'fr'}));
      const res=await r.json();
      if(!res.length){$('#tr').innerHTML='<p class="meta">Aucun territoire trouvé. Essayez un autre nom.</p>';return}
      $('#tr').innerHTML=res.map((x,i)=>`<button class="item" data-i="${i}">${I('pin')}<div><b>${esc(x.name||x.display_name.split(',')[0])}</b><small>${esc(x.display_name)}</small></div><em>${esc(TL[x.addresstype||x.type]||'Lieu')}</em></button>`).join('');
      $$('#tr .item').forEach(b=>b.onclick=()=>{
        tap();const x=res[+b.dataset.i],bb=x.boundingbox.map(Number);
        applyZone({type:'poly',name:x.name||x.display_name.split(',')[0],geo:x.geojson,bounds:L.latLngBounds([[bb[0],bb[2]],[bb[1],bb[3]]])});
      });
    }catch{$('#tr').innerHTML='<p class="meta">Recherche impossible : vérifiez votre connexion.</p>'}
  };
}
function paneRadius(){
  const has=filter.zone?.type==='circle';
  $('#pane').innerHTML=`<label>Centre de la recherche</label>
  <div class="chips"><button class="chip" id="cLoc">${I('locate')} Ma position</button><button class="chip" id="cMap">${I('pin')} Centre de la carte</button><button class="chip" id="cTap">${I('plus')} Toucher la carte</button></div>
  <label for="rg">Rayon</label><div class="km"><b id="kmv">${rad.km}</b><span>km</span></div>
  <input type="range" id="rg" min="0" max="300" value="${km2v(rad.km)}" aria-label="Rayon en kilomètres">
  <div class="chips">${[1,5,10,25,50,100,250,500].map(k=>`<button class="chip" data-k="${k}">${k} km</button>`).join('')}</div>${has?'':'<p class="meta" style="margin-top:12px">Choisissez d’abord un centre pour afficher le cercle.</p>'}`;
  const prog=()=>$('#rg').style.setProperty('--p',(+$('#rg').value/3)+'%');prog();
  const center=c=>{tap();applyZone({type:'circle',name:'Rayon',center:c,km:rad.km});paneRadius()};
  on('#cLoc',()=>locate(center));
  on('#cMap',()=>{const c=map.getCenter();center([c.lat,c.lng])});
  on('#cTap',()=>{closeSheet();pick='radius';toast('Touchez la carte pour choisir le centre',4000)});
  const setKm=(k,done)=>{
    rad.km=k;$('#kmv').textContent=k;$('#rg').value=km2v(k);prog();
    const z=filter.zone;if(z?.type==='circle'){z.km=k;z.layer.setRadius(k*1000);refreshAll();if(done)map.fitBounds(z.layer.getBounds(),{padding:[30,30]})}
  };
  $('#rg').oninput=e=>setKm(v2km(+e.target.value));
  $('#rg').onchange=e=>setKm(v2km(+e.target.value),true);
  $$('#pane .chip[data-k]').forEach(b=>b.onclick=()=>{tap();setKm(+b.dataset.k,true)});
}

/* ---------- lieu : fiche ---------- */
function showPlace(id,fly){
  const p=places.find(x=>x.id===id);if(!p)return;
  clearDraft();pick=null;highlight(id);
  fly?lift([p.lat,p.lng]):map.panTo([p.lat,p.lng]);
  const [cn,ce,cc]=cat(p.cat),ref=refPoint(),n=p.photos.length;
  const hero=n
    ?`<div class="hero" id="hero">${p.photos.map((b,i)=>`<img src="${esc(src(b))}" alt="Photo ${i+1} sur ${n} de ${esc(p.title)}">`).join('')}</div>${n>1?`<span class="pc" id="hc">1 / ${n}</span>`:''}`
    :`<div class="hero empty" style="--c:${cc}"><span>${ce}</span></div>`;
  setSheet(`<div class="tags"><span class="tag" style="--c:${cc}">${ce} ${cn}</span>${ref?`<span class="tag">${I('pin')} à ${fmtD(km(ref,[p.lat,p.lng]))}</span>`:''}</div>
  <div class="hd"><h2>${esc(p.title)}</h2>${ro?(p.fav?`<span class="star on">${I('star')}</span>`:''):`<button class="star${p.fav?' on':''}" id="fv" aria-pressed="${p.fav}" aria-label="${p.fav?'Retirer des favoris':'Ajouter aux favoris'}">${I('star')}</button>`}</div>
  ${p.date?`<p class="when">${I('cal')} ${fmt(p.date)}</p>`:''}${p.desc?`<p class="desc">${esc(p.desc)}</p>`:''}
  <div class="acts"><a class="act p" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">${I('route')}<span>Itinéraire</span></a><button class="act" id="shp">${I('share')}<span>Partager</span></button>${ro?'':`<button class="act" id="ed">${I('edit')}<span>Modifier</span></button><button class="act d" id="rm">${I('trash')}<span>Supprimer</span></button>`}</div>`,hero);
  const h=$('#hero');
  if(h){
    const list=p.photos.map(pub);
    $$('#hero img').forEach((im,i)=>im.onclick=()=>openLb(list,i));
    if(n>1)h.onscroll=()=>{$('#hc').textContent=(Math.round(h.scrollLeft/h.clientWidth)+1)+' / '+n};
  }
  on('#shp',()=>shareLink(`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`,p.title,p.title+(p.date?' — '+fmt(p.date):'')));
  on('#ed',()=>showForm(structuredClone(p)));
  on('#fv',async()=>{
    tap();const f=!p.fav;const {error}=await sb.from('places').update({favorite:f}).eq('id',p.id);
    if(error)return toast(error.message,4000);p.fav=f;refreshAll();showPlace(p.id);
  });
  on('#rm',async()=>{
    if(!confirm('Supprimer « '+p.title+' » et ses photos ?'))return;
    if(p.photos.length)await sb.storage.from('photos').remove(p.photos);
    const {error}=await sb.from('places').delete().eq('id',p.id);
    if(error)return toast(error.message,4000);
    selId=null;await load();closeSheet();toast('Lieu supprimé');
  });
}

/* ---------- lieu : formulaire ---------- */
const newPlace=ll=>({id:crypto.randomUUID(),lat:ll.lat,lng:ll.lng,title:'',date:today(),desc:'',photos:[],cat:'autre',fav:false});
function showAdd(){
  setSheet(`<h2>Ajouter un lieu</h2><p class="meta">Où se trouve ce lieu ?</p>
  <div class="stack"><button class="b p" id="aMap">${I('pin')} Choisir sur la carte</button><button class="b" id="aLoc">${I('locate')} Ma position actuelle</button></div>`);
  on('#aMap',()=>{closeSheet();pick='add';toast('Touchez la carte pour placer le lieu',4000)});
  on('#aLoc',()=>locate(ll=>showForm(newPlace({lat:ll[0],lng:ll[1]}))));
}
function showForm(p){
  draft=p;highlight(null);
  if(!draftMarker){
    draftMarker=L.marker([p.lat,p.lng],{icon:pinIcon(p.cat,'draft'),draggable:true,zIndexOffset:2000}).addTo(map);
    draftMarker.on('dragend',()=>{const l=draftMarker.getLatLng();draft.lat=l.lat;draft.lng=l.lng});
  }
  const isNew=!places.some(x=>x.id===p.id);
  const draw=()=>{
    const thumbs=draft.photos.map((b,i)=>`<div class="ph"><img src="${esc(src(b))}" alt="Photo ${i+1}"><button type="button" class="x" data-i="${i}" aria-label="Retirer la photo ${i+1}">${I('x')}</button></div>`).join('');
    setSheet(`<h2>${isNew?'Nouveau lieu':'Modifier le lieu'}</h2><p class="meta">Glissez le repère jaune sur la carte pour ajuster la position.</p>
    <label for="t">Titre</label><input type="text" id="t" value="${esc(draft.title)}" placeholder="Ex. Calanque de Sormiou" autocomplete="off" enterkeyhint="next">
    <label>Catégorie</label><div class="chips scroll" id="cc">${Object.entries(CATS).map(([k,[n,e]])=>`<button type="button" class="chip${draft.cat===k?' on':''}" data-k="${k}">${e} ${n}</button>`).join('')}</div>
    <div class="two"><div><label for="d">Date de la visite</label><input type="date" id="d" value="${esc(draft.date)}"></div><button type="button" class="favtg${draft.fav?' on':''}" id="fv" aria-pressed="${draft.fav}">${I('star')}<span>Favori</span></button></div>
    <label for="s">Descriptif</label><textarea id="s" placeholder="Souvenirs, conseils, ambiance…">${esc(draft.desc)}</textarea>
    <label>Photos</label><div class="strip"><label class="addph" for="f">${I('plus')}<span>Photos</span></label>${thumbs}</div>
    <input type="file" id="f" accept="image/*" multiple hidden>
    <button type="button" class="b link" id="here">${I('locate')} Utiliser ma position</button>
    <div class="fbar"><button class="b" id="no">Annuler</button><button class="b p" id="ok">Enregistrer</button></div>`,'','form');
    $('#t').oninput=e=>draft.title=e.target.value;$('#d').oninput=e=>draft.date=e.target.value;$('#s').oninput=e=>draft.desc=e.target.value;
    $('#fv').onclick=e=>{tap();draft.fav=!draft.fav;e.currentTarget.classList.toggle('on',draft.fav);e.currentTarget.setAttribute('aria-pressed',draft.fav)};
    $$('#cc .chip').forEach(b=>b.onclick=()=>{tap();draft.cat=b.dataset.k;$$('#cc .chip').forEach(c=>c.classList.toggle('on',c===b));draftMarker.setIcon(pinIcon(draft.cat,'draft'))});
    $$('.strip .x').forEach(b=>b.onclick=()=>{draft.photos.splice(+b.dataset.i,1);draw()});
    $('#f').onchange=async e=>{
      const fs=[...e.target.files];if(!fs.length)return;toast('Préparation des photos…',8000);
      for(const f of fs){try{draft.photos.push(await shrink(f))}catch{toast('Photo illisible : '+f.name)}}
      draw();$('#toast').hidden=true;
    };
    $('#ok').onclick=save;
    $('#no').onclick=()=>isNew?closeSheet():showPlace(draft.id);
    $('#here').onclick=()=>locate(ll=>{draft.lat=ll[0];draft.lng=ll[1];draftMarker.setLatLng(ll);map.setView(ll,16)});
  };
  draw();lift([p.lat,p.lng]);

  async function save(){
    draft.title=draft.title.trim();
    if(!draft.title){toast('Ajoutez un titre pour ce lieu');$('#t').focus();return}
    const btn=$('#ok');btn.disabled=true;btn.textContent='Enregistrement…';
    const q=draft,old=places.find(x=>x.id===q.id)?.photos||[],paths=[];
    try{
      for(const ph of q.photos){
        if(typeof ph==='string'){paths.push(ph);continue}
        const path=`${me.id}/${q.id}/${crypto.randomUUID()}.jpg`;
        const {error}=await sb.storage.from('photos').upload(path,ph,{contentType:'image/jpeg'});
        if(error)throw error;paths.push(path);
      }
      const {error}=await sb.from('places').upsert({id:q.id,title:q.title,visited:q.date||null,descr:q.desc,lat:q.lat,lng:q.lng,photos:paths,category:q.cat,favorite:q.fav});
      if(error)throw error;
      const gone=old.filter(x=>!paths.includes(x));if(gone.length)await sb.storage.from('photos').remove(gone);
    }catch(e){toast('Échec de l’enregistrement : '+(e.message||e),5000);btn.disabled=false;btn.textContent='Enregistrer';return}
    tap();clearDraft();await load();showPlace(q.id);toast('Lieu enregistré');
  }
}
async function shrink(file){
  const bmp=await createImageBitmap(file);
  const k=Math.min(1,1280/Math.max(bmp.width,bmp.height));
  const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
  c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close?.();
  return new Promise((ok,ko)=>c.toBlob(b=>b?ok(b):ko(),'image/jpeg',.8));
}

/* ---------- données ---------- */
async function load(){
  if(!places.length)skeleton();
  const r=ro?await sb.rpc('get_shared',{token}):await sb.from('places').select('*').order('visited',{ascending:false});
  if(r.error)toast('Chargement impossible : '+r.error.message,5000);
  places=(r.data||[]).map(row);refreshAll();
}

/* ---------- interactions ---------- */
map.on('click',e=>{
  if(pick==='radius'){pick=null;applyZone({type:'circle',name:'Rayon',center:[e.latlng.lat,e.latlng.lng],km:rad.km});setTab('explore');showExplore('r');return}
  if(ro||!me)return;
  if(draft&&draftMarker&&sheet.classList.contains('open')){draftMarker.setLatLng(e.latlng);draft.lat=e.latlng.lat;draft.lng=e.latlng.lng;return}
  if(pick==='add'){pick=null;$('#toast').hidden=true;showForm(newPlace(e.latlng))}
});
$('#q').oninput=e=>{filter.q=e.target.value;$('#qx').hidden=!filter.q;refreshAll()};
$('#qx').onclick=()=>{filter.q='';$('#q').value='';$('#qx').hidden=true;$('#q').focus();refreshAll()};
$('#zone').onclick=()=>{tap();clearZone();refreshAll()};
$('#bLoc').onclick=()=>locate(p=>{map.setView(p,Math.max(map.getZoom(),14));refreshAll()});
$('#bAdd').onclick=()=>{if(me){tap();showAdd()}};
$('#hintAdd').onclick=()=>{if(me){tap();showAdd()}};

/* ---------- démarrage ---------- */
async function start(){
  await sb.from('carnets').upsert({owner:me.id},{onConflict:'owner',ignoreDuplicates:true});
  const {data}=await sb.from('carnets').select('share_token').single();shareToken=data?.share_token;
  await load();closeSheet();fit();hideSplash();
}
(async()=>{
  buildChips();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(!configured){hideSplash();setSheet('<h2>Configuration manquante</h2><p class="meta">Renseignez config.js avec l’URL et la clé de votre projet Supabase (voir README).</p>');return}
  if(ro){
    $('#bAdd').remove();$('[data-t=account]').remove();
    await load();fit();hideSplash();return;
  }
  sb.auth.onAuthStateChange((_e,s)=>{
    if(s?.user){if(me?.id!==s.user.id){me=s.user;setTimeout(start,0)}}
    else{me=null;places=[];refreshAll();hideSplash();setTab('account');showLogin()}
  });
})();
