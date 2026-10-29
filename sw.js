const V='carnet-v5';
const SHELL=['./','index.html','style.css','app.js','config.js','manifest.webmanifest','icon.svg','icon-192.png'];
const CACHEABLE=['unpkg.com','cdn.jsdelivr.net','tile.openstreetmap.org'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  // Les données (Supabase) ne sont jamais mises en cache : elles viennent toujours du réseau.
  if(e.request.method!=='GET'||!(u.origin===location.origin||CACHEABLE.includes(u.hostname)))return;
  e.respondWith(caches.match(e.request).then(hit=>{
    const net=fetch(e.request).then(r=>{if(r&&(r.ok||r.type==='opaque')){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r}).catch(()=>hit);
    return hit||net;
  }));
});
