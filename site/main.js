import {Renderer,transform} from './engine.js';
import {drawArthur,drawWorld} from './world.js';
import {VERSION,OPTIONS,DEFAULT_LOOK,fresh,TASKS,target,distance,tick,interact,calibrate,saveState,loadState,validateSave} from './game.js';
import {setupOffline} from './offline.js';
const $=id=>document.getElementById(id),canvas=$('scene');
const SAVE_KEY='arthur-rebuilt:'+new URL('.',location.href).pathname;
let storage=null;try{storage=localStorage}catch{}
const restored=storage?loadState(storage,SAVE_KEY):{state:fresh(),backup:false};
export let state=restored.state;
let mode='wardrobe',category='scarf',last=0,clock=0,saveClock=0,yaw=.18,zoom=false,renderer=null,subtitleUntil=0,joystickId=null,drag=null;
const keys=new Set(),touch={x:0,z:0},input={x:0,z:0,sneak:false};let sneakToggle=false;
$('version').textContent=VERSION;
function say(text,seconds=5){$('subtitle').textContent=text;$('subtitle').hidden=false;subtitleUntil=clock+seconds}
function persist(){try{if(!storage)throw Error('Storage unavailable');saveState(storage,SAVE_KEY,state);$('saveStatus').textContent='Progress saved';return true}catch{$('saveStatus').textContent='Save unavailable — export a backup';return false}}
function resetInput(){keys.clear();touch.x=touch.z=0;input.x=input.z=0;joystickId=null;drag=null;sneakToggle=false;input.sneak=false;$('stick').style.transform='';$('sneakBtn').setAttribute('aria-pressed','false')}
function modalOpen(){return $('help').open||$('workbench').open}
function showHelp(){resetInput();persist();$('help').showModal()}
$('helpBtn').onclick=showHelp;$('pauseBtn').onclick=showHelp;
$('closeHelp').onclick=()=>$('help').close();$('closeBench').onclick=()=>$('workbench').close();
function appearance(){
  $('categories').replaceChildren();$('options').replaceChildren();
  for(const k of Object.keys(OPTIONS)){const b=document.createElement('button');b.textContent=k[0].toUpperCase()+k.slice(1);b.setAttribute('role','tab');b.setAttribute('aria-selected',String(category===k));b.onclick=()=>{category=k;appearance()};$('categories').append(b)}
  const colors={'Tartan':'repeating-linear-gradient(45deg,#445b4d 0 8px,#a36b50 8px 13px,#34483c 13px 18px)','Deep blue':'#4d6f8d','Forest green':'#687c52',Burgundy:'#885361','Natural hemp':'#c5b18a','Tie-dye hemp':'conic-gradient(#b37494,#7caaa6,#d5bb7e,#c47e62,#b37494)',Matcha:'#97b977',Boba:'#c1a282','Iced coffee':'#79604e'};
  const symbols={hair:'≋',glasses:'○—○',scarf:'',drink:'☕',accessory:'◇'};
  for(const name of OPTIONS[category]){const b=document.createElement('button');b.setAttribute('aria-pressed',String(state.look[category]===name));const swatch=document.createElement('span');swatch.className='swatch';swatch.style.background=colors[name]||'#50654b';swatch.textContent=name==='None'?'—':name==='Boba'?'◌':symbols[category];const text=document.createElement('strong');text.textContent=name;b.append(swatch,text);b.onclick=()=>{state.look[category]=name;persist();appearance()};$('options').append(b)}
}
function switchMode(next){resetInput();mode=next;document.body.dataset.mode=next;$('wardrobe').hidden=next==='play';$('hud').hidden=next!=='play';$('touch').hidden=next!=='play';$('wardrobeBtn').hidden=next!=='play';$('pauseBtn').hidden=next!=='play';$('subtitle').hidden=true;persist();if(next==='play')say('Right. A field coil, no photographs, and home for tea. Perfectly manageable.',6)}
$('playBtn').onclick=()=>switchMode('play');$('wardrobeBtn').onclick=()=>switchMode('wardrobe');
$('turnLeft').onclick=()=>yaw-=.45;$('turnRight').onclick=()=>yaw+=.45;
$('zoomBtn').onclick=()=>{zoom=!zoom;$('zoomBtn').textContent=zoom?'Full-body view':'Face view'};
canvas.addEventListener('pointerdown',e=>{if(mode==='wardrobe'){canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX}}});
canvas.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId){yaw+=(e.clientX-drag.x)*.012;drag.x=e.clientX}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>drag=null);
function dials(){
  $('dials').replaceChildren();state.calibration.forEach((value,i)=>{const b=document.createElement('button');b.textContent=value;b.setAttribute('aria-label',`Channel ${i+1}: ${value}. Tap to advance.`);b.onclick=()=>{state.calibration[i]=(value+1)%5;persist();dials()};$('dials').append(b)});
}
function action(){if(mode!=='play'||modalOpen())return;const line=interact(state);if(line==='workbench'){resetInput();dials();$('benchResult').textContent='';$('workbench').showModal()}else say(line);persist()}
$('actionBtn').onclick=action;
$('testBtn').onclick=()=>{if(calibrate(state)){$('workbench').close();say('Containment stable. Finally, a cup of tea.');persist()}else $('benchResult').textContent='Not quite. The service label specifies 2 · 4 · 1.'};
$('sneakBtn').onclick=()=>{sneakToggle=!sneakToggle;$('sneakBtn').setAttribute('aria-pressed',String(sneakToggle))};
function joyMove(e){const rect=$('joystick').getBoundingClientRect();let x=e.clientX-rect.left-rect.width/2,z=e.clientY-rect.top-rect.height/2;const d=Math.hypot(x,z),scale=Math.min(1,36/(d||1));x*=scale;z*=scale;touch.x=x/36;touch.z=z/36;$('stick').style.transform=`translate(${x}px,${z}px)`}
$('joystick').addEventListener('pointerdown',e=>{if(joystickId!==null)return;joystickId=e.pointerId;$('joystick').setPointerCapture(e.pointerId);joyMove(e)});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===joystickId)joyMove(e)});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(type,e=>{if(e.pointerId===joystickId){joystickId=null;touch.x=touch.z=0;$('stick').style.transform=''}});
addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='escape'&&!modalOpen()){e.preventDefault();showHelp();return}if(mode!=='play'||modalOpen())return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','e'].includes(k)){e.preventDefault();keys.add(k);if(k==='e'&&!e.repeat)action()}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',resetInput);addEventListener('resize',resetInput);
document.addEventListener('visibilitychange',()=>{resetInput();if(document.hidden)persist()});addEventListener('pagehide',persist);
$('exportBtn').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(validateSave(state),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='arthur-recovery-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('importFile').onchange=async e=>{const file=e.target.files?.[0];try{if(!file)return;if(file.size>100000)throw Error('Save file is too large.');const next=validateSave(JSON.parse(await file.text()));state=next;persist();appearance();$('help').close();say('Schedule recovered. Splendid.')}catch(error){alert('Save not imported: '+error.message)}finally{e.target.value=''}};
$('newBtn').onclick=()=>{if(confirm('Start a new Tuesday? Export your current save first to keep it.')){const look={...state.look};state=fresh();state.look=look;persist();$('help').close();switchMode('wardrobe');appearance()}};
function hud(){
  const task=state.stage===2&&state.evidence?['One last photograph','Return to Gary’s camera before going home.']:TASKS[state.stage];$('taskTitle').textContent=task[0];$('taskCopy').textContent=task[1];
  $('exposure').value=state.exposure;$('cover').textContent=input.sneak?'SNEAKING':'';$('evidence').textContent=state.evidence;$('composure').textContent=state.composure>.72?'Impeccable':state.composure>.4?'Strained':'Mortified';
  const p=target(state),d=distance(state,p),angle=Math.atan2(p.x-state.x,-(p.z-state.z));const arrow=['↑','↗','→','↘','↓','↙','←','↖'][(Math.round(angle/(Math.PI/4))+8)%8];
  $('distance').textContent=state.stage===5?'TUESDAY COMPLETE':`${arrow} ${Math.round(d)} m · FOLLOW THE GOLD BEACON`;
  $('objectiveHint').textContent=state.stage===5?'A very proper conclusion.':d<2.7?'E / Interact · '+(state.stage===3?'Open workbench':'Investigate'):'WASD / thumbstick · Shift / Sneak · E / Interact';
  $('playBtn').firstChild.textContent=state.stage===0?'Into the forest ':'Resume Tuesday ';
}
function frame(ms){const dt=Math.min(.05,(ms-last)/1000||0);last=ms;clock+=dt;
  const paused=document.hidden||modalOpen();document.body.dataset.paused=String(modalOpen());
  input.x=touch.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);input.z=touch.z+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);input.sneak=sneakToggle||keys.has('shift');
  const moving=Math.hypot(input.x,input.z)>.04;
  if(mode==='play'&&!paused){const line=tick(state,input,dt);if(line)say(line);saveClock+=dt;if(saveClock>8){persist();saveClock=0}}
  if(clock>subtitleUntil)$('subtitle').hidden=true;hud();
  if(renderer&&!document.hidden){
    if(mode==='wardrobe'){
      const eye=zoom?[.45,2.9,2.7]:[3.5,2.7,6.5],at=zoom?[0,2.67,0]:[-.3,1.70,0];renderer.begin(eye,at);drawWorld(renderer,state,'wardrobe',clock);
      const pose=$('pose').value;drawArthur(renderer,state.look,transform(0,0,0,1,1,1,0,yaw),clock,pose==='Walk'||pose==='Sneak',pose==='Sneak',pose);
    }else{
      renderer.begin([state.x,6.1,state.z+9.8],[state.x,1.2,state.z-1.5],state.area==='lab'?'#283a35':'#435e4e');drawWorld(renderer,state,'play',clock);drawArthur(renderer,state.look,transform(state.x,0,state.z,1,1,1,0,state.heading),clock,moving&&!paused,input.sneak,'Idle');
    }renderer.draw();
  }requestAnimationFrame(frame);
}
try{renderer=new Renderer(canvas)}catch(error){$('fatal').hidden=false;$('fatal').textContent=error.message}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer=null;persist();$('fatal').hidden=false;$('fatal').textContent='Graphics paused by the browser. Reload the page to continue from your saved progress.'});
appearance();hud();if(restored.backup)$('saveStatus').textContent='Recovered previous save';else if(!storage)$('saveStatus').textContent='Saving unavailable';
setupOffline({status:$('offline'),updateButton:$('updateBtn'),save:persist,version:VERSION});requestAnimationFrame(frame);
