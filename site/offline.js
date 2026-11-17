// Registration is intentionally separate from gameplay. No automatic reload in a session.
export async function setupOffline({status,updateButton,save,version}){
  if(location.protocol==='file:'){status.textContent='Portable offline build';return}
  if(!('serviceWorker' in navigator)||!isSecureContext){status.textContent='Offline installation needs HTTPS or localhost';return}
  let requested=false;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    const check=()=>{
      if(registration.waiting){updateButton.hidden=false;status.textContent='An update is ready';return}
      const worker=navigator.serviceWorker.controller||registration.active;
      if(!worker){status.textContent='Preparing offline files…';return}
      const channel=new MessageChannel();const timeout=setTimeout(()=>{channel.port1.close();status.textContent='Offline readiness not confirmed'},4000);
      channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();status.textContent=event.data.ready&&event.data.version===version?'Offline ready':'Offline files incomplete — reconnect and reload'};
      worker.postMessage({type:'CHECK_CACHE'},[channel.port2]);
    };
    updateButton.onclick=()=>{if(!save()){status.textContent='Export your save before updating';return}if(registration.waiting){requested=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'})}};
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requested)location.reload();else check()});
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'||worker.state==='activated')check();if(worker.state==='redundant')status.textContent='Update download failed; previous version retained'})});
    await navigator.serviceWorker.ready;check();
    addEventListener('online',()=>{check();registration.update().catch(()=>{})});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
  }catch{status.textContent='Offline setup failed — reconnect and reload'}
}
