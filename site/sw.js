// Bump VERSION whenever any shipped file changes. Never mix runtime files between releases.
const VERSION='0.4.1-rebuilt';
const PREFIX='arthur:'+new URL(self.registration.scope).pathname+':';
const CACHE=PREFIX+VERSION;
const ASSETS=['./','./index.html','./style.css','./main.js','./engine.js','./world.js','./game.js','./offline.js','./manifest.webmanifest','./icon.svg'];
const urls=ASSETS.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})));
  // Do not skipWaiting: a running game must opt in to an update.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const old=(await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE);
  // Keep one previous release for an older tab. Do not touch another site's caches.
  await Promise.all(old.slice(0,-1).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='CHECK_CACHE')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE),results=await Promise.all(urls.map(url=>cache.match(url)));
    event.ports[0]?.postMessage({ready:results.every(Boolean),version:VERSION});
  })());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(event.request);
    if(hit)return hit;
    if(event.request.mode==='navigate')return await cache.match(new URL('./index.html',self.registration.scope).href)||fetch(event.request);
    return fetch(event.request); // Do not silently cache an unversioned/mixed asset.
  })());
});
