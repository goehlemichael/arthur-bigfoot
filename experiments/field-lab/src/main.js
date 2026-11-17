import { SAVE_KEY, snapshot, applySnapshot, saveSnapshot, loadSnapshot } from './save.js';
import { PhysicsLab, PAD, LAB_VERSION, STEP, distanceXZ } from './physics.js';
import { THREE, palette, mesh, createArthur, createEnvironment, treeVisual, aircraftVisual } from './visuals.js';
const $=id=>document.getElementById(id), canvas=$('view');
const keys=new Set();let touch={x:0,z:0},paused=true,mode='arthur',yaw=.18,pitch=.36,last=0,renderTime=0,lab,renderer;
let savedBlocked=false,waitingWorker=null;const SAVE=SAVE_KEY;
const status=text=>$('status').textContent=text;
function say(text){$('line').textContent=text;$('dialogue').classList.remove('quiet');clearTimeout(say.timer);say.timer=setTimeout(()=>$('dialogue').classList.add('quiet'),6500);}
function resetInput(){keys.clear();touch={x:0,z:0};$('knob').style.transform='';}
function error(e){console.error(e);$('loading').classList.remove('hidden');$('loadTitle').textContent='A small technical interruption.';$('loadText').textContent=e.message||String(e);$('start').classList.add('hidden');}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let scene,camera,actor,environment,treeMeshes=[],crateMeshes=[],droneMesh=null,rocketMesh=null,dust=[],particles;
function input(){let x=touch.x+(keys.has('d')?1:0)-(keys.has('a')?1:0),z=touch.z+(keys.has('s')?1:0)-(keys.has('w')?1:0);const l=Math.hypot(x,z);if(l>1){x/=l;z/=l;}return{x:Math.cos(yaw)*x+Math.sin(yaw)*z,z:-Math.sin(yaw)*x+Math.cos(yaw)*z,sprint:keys.has('shift')||$('run').getAttribute('aria-pressed')==='true'};}
function action(name){if(paused)return;let result;
 if(mode==='drone'&&['push','carry','brace'].includes(name)){say('Return to Arthur before handling timber.');return;}
 if(name==='push')result=lab.shove();if(name==='carry')result=lab.toggleCarry();if(name==='brace')result=lab.brace();
 if(name==='drone'){result=lab.launchDrone();if(result.ok){mode='drone';$('pilot').textContent='Return to Arthur';}}
 if(name==='rocket')result=lab.launchRocket();
 if(name==='pilot'){if(lab.drone){mode=mode==='drone'?'arthur':'drone';$('pilot').textContent=mode==='drone'?'Return to Arthur':'Pilot drone';say(mode==='drone'?'Survey camera linked. A rather better view.':'Back to being conspicuous, then.');}else say('Launch the survey drone first.');}
 if(result)say(result.text);updateHUD();
}
for(const id of ['push','carry','brace','drone','rocket','pilot'])$(id).onclick=()=>action(id);
$('run').onclick=()=>{$('run').setAttribute('aria-pressed',String($('run').getAttribute('aria-pressed')!=='true'));};
function updateHUD(){if(!lab)return;const broken=lab.trees.filter(t=>t.broken).length;$('timber').textContent=`${broken} / 4`;$('supports').textContent=`${lab.braces.length} / 2`;$('noise').style.width=Math.round(lab.noise*100)+'%';$('pilot').disabled=!lab.drone;
 $('task').textContent=lab.braces.length===2?'Launch a survey drone or atmospheric probe.':lab.held?'Bring the timber to the launch cradle.':broken?'Lift a fallen trunk. Bring it to the marked pad.':'Snap a marked cedar with a shove or a running impact.';
 $('carry').textContent=lab.held?'Release timber':'Lift timber';$('brace').disabled=!lab.held||lab.braces.length>=2;$('drone').disabled=lab.braces.length<2||!!lab.drone;$('rocket').disabled=lab.braces.length<2||!!lab.rocket;
 $('altitude').textContent=lab.drone?`${lab.drone.body.translation().y.toFixed(1)} m`:'Grounded';$('probe').textContent=lab.rocket?`${lab.rocket.phase} · ${Math.max(0,lab.rocket.body.translation().y).toFixed(0)} m`:'Ready for testing';
 $('mode').textContent=mode==='drone'?'SURVEY DRONE':'ARTHUR · FIELD ENGINEER';$('altControls').classList.toggle('hidden',mode!=='drone');
}
function persist(){if(!lab||savedBlocked)return false;try{return saveSnapshot(localStorage,snapshot(lab,$('scarf').value));}catch(e){status(e.message||'Save unavailable — do not close this session.');return false;}}
function restore(){const loaded=loadSnapshot(localStorage);savedBlocked=!!loaded.blocked;if(loaded.data){const d=applySnapshot(lab,loaded.data);$('scarf').value=d.scarf;if(loaded.backup)status('Recovered previous clearing backup.');}else if(savedBlocked)status('Existing save preserved; automatic saving disabled.');}
function setup(){
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 scene=new THREE.Scene();scene.background=new THREE.Color('#9aafa4');scene.fog=new THREE.FogExp2('#9aafa4',.018);
 camera=new THREE.PerspectiveCamera(54,1,.1,130);camera.position.set(2,6,20);
 scene.add(new THREE.HemisphereLight('#dae8db','#6a6046',2.0));const sun=new THREE.DirectionalLight('#ffe9bf',3.0);sun.position.set(-15,26,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:80});sun.shadow.normalBias=.05;sun.shadow.bias=-.00015;scene.add(sun);
 environment=createEnvironment(scene,lab);actor=createArthur();scene.add(actor.root);actor.setScarf($('scarf').value);
 for(const t of lab.trees){const object=treeVisual(t);scene.add(object.root,object.stump,object.cap,object.splinters);treeMeshes.push(object);}
 for(const b of lab.crates){const m=mesh('box',palette.wood,[0,0,0],[.43,.43,.43]);scene.add(m);crateMeshes.push(m);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(180*3),3));particles=new THREE.Points(geo,new THREE.PointsMaterial({color:'#d8c093',size:.08,transparent:true,opacity:.75}));particles.frustumCulled=false;scene.add(particles);
 const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};addEventListener('resize',resize);resize();
 $('quality').onchange=()=>{const low=$('quality').value==='battery';renderer.setPixelRatio(low?1:Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=!low;resize();};
 $('scarf').onchange=()=>{actor.setScarf($('scarf').value);persist();};
}
function sync(root,body){root.position.copy(body.translation());root.quaternion.copy(body.rotation());}
function effects(dt){for(const event of lab.drainEvents()){
 if(event.type==='snap'){const t=lab.trees.find(t=>t.id===event.id);for(let i=0;i<30;i++)dust.push({x:t.x,y:1,z:t.z,vx:(Math.random()-.5)*3,vy:2+Math.random()*2,vz:(Math.random()-.5)*3,life:2});say('Oh, bother. I shall tidy that up.');}
 if(event.type==='launch')for(let i=0;i<60;i++)dust.push({x:PAD.x,y:.7,z:PAD.z,vx:(Math.random()-.5)*4,vy:Math.random(),vz:(Math.random()-.5)*4,life:2.5});
 }
 dust=dust.filter(p=>(p.life-=dt)>0).slice(-180);const arr=particles.geometry.attributes.position.array;arr.fill(0);for(let i=0;i<180;i++){if(i>=dust.length){arr[i*3+1]=-100;continue;}const p=dust[i];p.x+=p.vx*dt;p.y=Math.max(.05,p.y+p.vy*dt);p.z+=p.vz*dt;p.vy-=4*dt;arr.set([p.x,p.y,p.z],i*3);}particles.geometry.attributes.position.needsUpdate=true;
}
function frame(time){const dt=Math.min(.1,Math.max(0,(time-last)/1000||0));last=time;renderTime+=dt;
 if(!paused){const i=input();if(mode==='drone'&&lab.drone){const d=lab.drone.target;d.x=clamp(d.x+i.x*dt*6,-35,35);d.z=clamp(d.z+i.z*dt*6,-35,35);d.y=clamp(d.y+((keys.has(' ')||keys.has('r')?1:0)-(keys.has('control')||keys.has('f')?1:0))*dt*3,2,16);lab.advance(dt,{});}else lab.advance(dt,i);effects(dt);}
 const p=lab.player.translation(),vel=lab.player.linvel(),speed=Math.hypot(vel.x,vel.z);actor.root.position.set(p.x,p.y-1.23,p.z);actor.root.rotation.y=lab.heading;actor.animate(lab.time,speed,!!lab.held);
 lab.trees.forEach((t,i)=>{sync(treeMeshes[i].root,t.body);treeMeshes[i].band.visible=!t.broken;treeMeshes[i].crown.visible=!t.braced;treeMeshes[i].cap.visible=t.broken;treeMeshes[i].splinters.visible=t.broken;});lab.crates.forEach((b,i)=>sync(crateMeshes[i],b));environment.deck.visible=lab.braces.length===2;
 if(lab.drone){if(!droneMesh){droneMesh=aircraftVisual('drone');scene.add(droneMesh.root);}sync(droneMesh.root,lab.drone.body);droneMesh.rotors.forEach(r=>r.rotation.y=lab.time*65);}
 if(lab.rocket){if(!rocketMesh){rocketMesh=aircraftVisual('rocket');scene.add(rocketMesh.root);}sync(rocketMesh.root,lab.rocket.body);rocketMesh.root.userData.flame.visible=lab.rocket.phase==='boost';rocketMesh.root.userData.chute.visible=lab.rocket.phase==='recovery';}
 const target=mode==='drone'&&lab.drone?lab.drone.body.translation():p;const distance=mode==='drone'?9:9.8;
 const desired=new THREE.Vector3(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance+1.3,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);
 camera.position.lerp(desired,1-Math.exp(-dt*5));camera.lookAt(target.x,target.y+.25,target.z);renderer.render(scene,camera);updateHUD();requestAnimationFrame(frame);
}
addEventListener('keydown',e=>{if(e.target instanceof HTMLSelectElement)return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown'].includes(k))e.preventDefault();if(k==='escape'){togglePause();return;}keys.add(k);if(e.repeat)return;const actions={e:'push',g:'carry',b:'brace',v:'pilot','1':'drone','2':'rocket'};if(actions[k])action(actions[k]);});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
let joy=null;const joystick=$('joystick');function joyMove(e){const rect=joystick.getBoundingClientRect();let x=e.clientX-(rect.left+rect.width/2),z=e.clientY-(rect.top+rect.height/2),l=Math.hypot(x,z)||1,k=Math.min(1,34/l);x*=k;z*=k;touch={x:x/34,z:z/34};$('knob').style.transform=`translate(${x}px,${z}px)`;}
joystick.onpointerdown=e=>{joy=e.pointerId;joystick.setPointerCapture(joy);joyMove(e);};joystick.onpointermove=e=>{if(e.pointerId===joy)joyMove(e);};for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,e=>{if(e.pointerId===joy){joy=null;touch={x:0,z:0};$('knob').style.transform='';}});
let orbit=null;canvas.onpointerdown=e=>{orbit={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(orbit?.id!==e.pointerId)return;yaw-=(e.clientX-orbit.x)*.006;pitch=clamp(pitch+(e.clientY-orbit.y)*.004,.15,.85);orbit.x=e.clientX;orbit.y=e.clientY;};for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>orbit=null);
function togglePause(force){paused=force??!paused;resetInput();$('pause').textContent=paused?'Resume':'Pause';$('pauseNote').classList.toggle('hidden',!paused);if(paused)persist();}
$('pause').onclick=()=>togglePause();for(const [id,key] of [['up','r'],['down','f']]){const b=$(id);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add(key);};for(const t of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(t,()=>keys.delete(key));}
$('reset').onclick=()=>{if(confirm('Reset this test clearing? Tuesday’s story save is not affected.')){localStorage.removeItem(SAVE);location.reload();}};
addEventListener('blur',()=>{if(lab)togglePause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&lab)togglePause(true);else last=0;});addEventListener('pagehide',persist);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();togglePause(true);error(Error('Graphics context interrupted. Reload to resume the saved clearing.'));});
async function offline(){if(location.protocol==='file:'||window.ARTHUR_PORTABLE){status('Portable offline build');document.querySelector('#storyLink')?.classList.add('hidden');return;}if(!navigator.serviceWorker||!isSecureContext){status('HTTPS needed for offline installation');return;}
 try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});const offer=()=>{if(navigator.serviceWorker.controller&&reg.waiting){waitingWorker=reg.waiting;$('update').classList.remove('hidden');}};offer();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',offer));await navigator.serviceWorker.ready;const ready=await new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=e=>resolve(e.data.ready);reg.active.postMessage({type:'CHECK'},[channel.port2]);setTimeout(()=>resolve(false),6000);});status(ready?'Offline ready · test clearing':'Offline cache not confirmed');
 $('update').onclick=()=>{if(!persist()){say('The clearing could not be saved. Update cancelled.');return;}navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});waitingWorker?.postMessage({type:'ACTIVATE'});};
 }catch(e){status('Offline installation unavailable');console.warn(e);}}
(async()=>{try{lab=await PhysicsLab.create();restore();setup();$('start').disabled=false;$('loadTitle').textContent='A controlled experiment.';$('loadText').textContent='A small clearing. Several very large ideas. Please mind the trees.';$('start').onclick=()=>{$('loading').classList.add('hidden');paused=false;say('A survey drone, an atmospheric probe, and absolutely no fuss.');};$('version').textContent=LAB_VERSION;await offline();requestAnimationFrame(frame);setInterval(()=>{if(!paused)persist();},7000);
 if(new URLSearchParams(location.search).has('test')||window.ARTHUR_TEST)window.__LAB__={lab,get paused(){return paused;},get mode(){return mode;},action,save:persist,renderer,actor,getInput:()=>({keys:[...keys],touch:{...touch}}),pause:togglePause};
 }catch(e){error(e);}})();
