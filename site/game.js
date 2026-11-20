// Pure gameplay and persistence rules, independent of graphics and DOM.
import {BUNKER,bunkerBlocked,stationAt} from './bunker-layout.js';
export {BUNKER,stationAt};
export const VERSION='0.5.0-silo';
export const OPTIONS={
  scarf:['Tartan','Deep blue','Forest green','Burgundy','Natural hemp','Tie-dye hemp','None'],
  hair:['Classic','Side part','Windswept','Top knot','Tidy trim'],
  glasses:['Round','Rectangle','Half frame','Monocle','None'],
  drink:['British tea','Earl Grey','Matcha','Chai','Boba','Iced coffee'],
  accessory:['Satchel','Backpack','Tool belt','Journal','None']
};
export const DEFAULT_LOOK={scarf:'Tartan',hair:'Classic',glasses:'Round',drink:'British tea',accessory:'Satchel'};
export const MARKERS={crash:{x:0,z:-6},camera:{x:11,z:-15},home:{x:0,z:22},bench:{x:-11,z:-2},tea:{x:-10,z:8}};
export const TASKS=[['A very inconvenient signal','Find the crashed field coil. Follow the gold beacon.'],['No publicity, please','Remove the memory card from Gary’s trail camera.'],['Home, discreetly','Return to the concealed silo hatch. Leave no photographs behind.'],['A matter of calibration','At the propulsion workbench, align the three channels to 2 • 4 • 1.'],['Tea. At last.','The propulsion test is complete. Visit the tea station.'],['A perfectly manageable Tuesday','Job complete. Explore your home or return to the forest. Your progress is saved.']];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function fresh(){return{schema:2,stage:0,area:'lab',x:0,z:14,landing:true,screen:0,heading:Math.PI,evidence:0,exposure:0,composure:1,cooldown:0,time:0,calibration:[0,0,0],look:{...DEFAULT_LOOK},climb:null}}
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function treeMap(){
  let seed=83;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const trees=[];
  for(let i=0;i<160;i++){
    const x=(random()-.5)*62,z=(random()-.5)*66,r=.5+random()*.55,h=6+random()*5;
    if(Math.abs(Math.hypot((x-11)/7,(z+13)/4)-1)<.38)continue;
    if(Math.abs(x)<3 || Object.values(MARKERS).some(p=>Math.hypot(p.x-x,p.z-z)<3.8))continue;
    trees.push({x,z,r,h});
  }return trees;
}
export const TREES=treeMap();
export const FERNS=[{x:6,z:-7,r:2.8},{x:8,z:-17,r:2.4},{x:-4,z:4,r:2.7}];
export function blocked(a,b,obstacles=TREES){
  const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
  return obstacles.some(t=>{const u=l?clamp(((t.x-a.x)*dx+(t.z-a.z)*dz)/l,0,1):0;return Math.hypot(t.x-a.x-u*dx,t.z-a.z-u*dz)<t.r});
}
export function gary(time){return{x:11+Math.sin(time*.20)*7,z:-13+Math.cos(time*.20)*4,heading:Math.atan2(Math.cos(time*.20)*7,-Math.sin(time*.20)*4)}}
export function target(s){
  if(s.area==='lab')return s.landing||s.stage<3||s.stage===5?BUNKER.ladder:s.stage===3?MARKERS.bench:MARKERS.tea;
  return s.stage===0?MARKERS.crash:s.stage===1||s.stage===2&&s.evidence>0?MARKERS.camera:MARKERS.home;
}
export function objective(s){
  if(s.climb)return ['The long way home',s.climb.direction==='down'?'Descending into Arthur’s private control centre…':'Climbing to the concealed forest hatch…'];
  if(s.landing)return ['Home, beneath the pines','An old missile silo. An unusually civilised resident. Press E / Interact to descend the ladder.'];
  if(s.area==='lab'&&s.stage<3)return ['A very private observatory','Explore the consoles, laboratory and tea corner. The ladder returns to the forest when you are ready.'];
  if(s.area==='forest'&&s.stage>=3)return ['Home is rather more comfortable','Return to the concealed silo hatch to continue your work.'];
  return s.stage===2&&s.evidence?['One last photograph','Return to Gary’s camera before going home.']:TASKS[s.stage];
}
export function sceneArea(s){return s.climb?'lab':s.area}
export function playerHeight(s){
  if(s.climb){const t=clamp(s.climb.elapsed/BUNKER.climbSeconds,0,1);return BUNKER.height*(s.climb.direction==='down'?1-t:t)}
  return s.landing?BUNKER.height:0;
}
export function interactionHint(s){
  if(s.climb)return s.climb.direction==='down'?'Descending ladder…':'Climbing to the forest…';
  if(s.landing)return 'E / Interact · Descend to your control centre';
  if(s.area==='lab'){
    if(distance(s,BUNKER.ladder)<2.7)return 'E / Interact · Climb to the forest';
    const p=stationAt(s);if(p)return 'E / Interact · '+p.name;
    return 'WASD / thumbstick · Explore your home · E / Interact';
  }
  if(distance(s,MARKERS.home)<2.7)return 'E / Interact · Open the concealed hatch';
  return distance(s,target(s))<2.7?'E / Interact · Investigate':'WASD / thumbstick · Shift / Sneak · E / Interact';
}
export function move(s,x,z,sneak,dt){
  if(s.climb||s.landing||!Number.isFinite(dt)||dt<=0)return;
  const magnitude=Math.hypot(x,z);if(!Number.isFinite(magnitude))return;
  if(magnitude>1){x/=magnitude;z/=magnitude}if(magnitude>.04)s.heading=Math.atan2(x,z);
  const speed=sneak?2.0:4.4,b=s.area==='lab'?BUNKER.bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30};
  const can=(nx,nz)=>s.area==='lab'?!bunkerBlocked(nx,nz):!TREES.some(t=>Math.hypot(nx-t.x,nz-t.z)<t.r+.48);
  // Substeps prevent tunnelling through benches and tree trunks on a long input frame.
  const steps=Math.min(1000,Math.max(1,Math.ceil(speed*dt/.2)));
  for(let i=0;i<steps;i++){
    const nx=clamp(s.x+x*speed*dt/steps,b.minX,b.maxX),nz=clamp(s.z+z*speed*dt/steps,b.minZ,b.maxZ);
    if(can(nx,s.z))s.x=nx;if(can(s.x,nz))s.z=nz;
  }
}
export function tick(s,input,dt){
  dt=Number.isFinite(dt)?clamp(dt,0,.05):0;s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);
  if(s.climb){
    s.climb.elapsed+=dt;s.exposure=clamp(s.exposure-.4*dt,0,1);
    if(s.climb.elapsed>=BUNKER.climbSeconds){
      const down=s.climb.direction==='down';s.climb=null;s.landing=false;s.area=down?'lab':'forest';s.x=0;s.z=down?11:20;s.heading=Math.PI;s.exposure=0;
      if(down&&s.stage===2&&s.evidence===0)s.stage=3;
      return down?'Home. Kindly wipe your feet. Mine included.':'A brief excursion. Do try not to become a cryptid sighting.';
    }return '';
  }
  move(s,input.x,input.z,input.sneak,dt);
  const g=gary(s.time),angle=Math.atan2(s.x-g.x,s.z-g.z),difference=Math.atan2(Math.sin(angle-g.heading),Math.cos(angle-g.heading));
  const cover=input.sneak&&FERNS.some(f=>distance(s,f)<f.r);
  const seen=s.area==='forest'&&distance(s,g)<(input.sneak?8:12)&&Math.abs(difference)<.65&&!cover&&!blocked(g,s);
  s.exposure=clamp(s.exposure+(seen?.45:-.40)*dt,0,1);s.composure=clamp(s.composure+(seen?-.09:.025)*dt,.1,1);
  if(s.exposure>=1&&s.cooldown===0){s.evidence++;s.cooldown=9;return 'Oh, good Lord. A photograph. I shall need that memory card.'}return '';
}
function climb(s,direction){s.climb={direction,elapsed:0};return direction==='down'?'Sixteen metres down. Entirely worth it for the privacy.':'Right. Into the wilderness. Mind the hair.'}
export function interact(s){
  if(s.climb)return 'One rung at a time. I am carrying tea.';
  if(s.landing)return climb(s,'down');
  if(s.area==='forest'&&distance(s,MARKERS.home)<2.7){
    if(s.stage===2&&s.evidence>0)return 'That memory card first. A secret address should remain secret.';
    return climb(s,'down');
  }
  if(s.area==='lab'){
    if(distance(s,BUNKER.ladder)<2.7)return climb(s,'up');
    const station=stationAt(s);
    if(!station)return 'A little closer to a console. Quietly, preferably.';
    if(station.id==='bench')return s.stage===3?'workbench':'The propulsion bench. A field coil is missing. Most inconvenient.';
    if(station.id==='tea'){
      s.composure=1;if(s.stage===4){s.stage=5;return 'Propulsion stabilised. Tea secured. A perfectly manageable Tuesday.'}
      return 'A universe of possibilities. Still no substitute for a properly brewed cup.';
    }
    if(station.id==='grooming'){s.composure=1;return 'Interstellar propulsion: impeccable. The fringe: a matter requiring immediate attention.'}
    return 'terminal:'+station.id;
  }
  if(s.stage>=3)return 'The laboratory is beneath the concealed hatch. Do make yourself scarce.';
  if(distance(s,target(s))>2.7)return 'A little closer. Quietly, preferably.';
  if(s.stage===0){s.stage=1;return 'Non-human fabrication. Marvellous. As though I had nothing else to do.'}
  if(s.stage===1||s.stage===2&&s.evidence>0){s.evidence=0;s.stage=2;s.exposure=0;s.cooldown=12;return 'Memory card removed. Camera unharmed. We are not savages.'}
  return 'Home is beneath the concealed hatch.';
}
export function calibrate(s){if(s.area!=='lab'||s.landing||s.climb||s.stage!==3||distance(s,MARKERS.bench)>2.7||s.calibration.join()!=='2,4,1')return false;s.stage=4;return true}
export function validateSave(value){
  if(!value||![1,2].includes(value.schema)||!Number.isInteger(value.stage)||value.stage<0||value.stage>5||!['forest','lab'].includes(value.area))throw Error('Not a compatible Arthur recovery save.');
  for(const key of ['x','z','heading','time','composure','exposure','evidence','cooldown'])if(!Number.isFinite(value[key]))throw Error('Save contains invalid numbers.');
  if(value.schema===1&&value.area!==(value.stage<3?'forest':'lab'))throw Error('Save area and mission do not agree.');
  if(value.evidence<0||!Number.isInteger(value.evidence)||value.evidence>9999)throw Error('Invalid evidence count.');
  if(!Array.isArray(value.calibration)||value.calibration.length!==3||value.calibration.some(x=>!Number.isInteger(x)||x<0||x>4))throw Error('Invalid calibration.');
  if(value.schema===2&&(typeof value.landing!=='boolean'||!Number.isInteger(value.screen)||value.screen<0||value.screen>2))throw Error('Invalid bunker state.');
  if(value.landing&&(value.area!=='lab'||value.stage!==0))throw Error('Invalid entry landing.');
  const result=fresh();for(const key of ['stage','area','x','z','heading','time','composure','exposure','evidence','cooldown'])result[key]=value[key];result.calibration=[...value.calibration];result.look={...DEFAULT_LOOK};
  for(const [k,v]of Object.entries(OPTIONS))if(v.includes(value.look?.[k]))result.look[k]=value.look[k];
  result.landing=value.schema===2?value.landing:false;result.screen=value.schema===2?value.screen:0;
  const b=result.area==='lab'?BUNKER.bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30};
  result.x=clamp(result.x,b.minX,b.maxX);result.z=clamp(result.z,b.minZ,b.maxZ);
  if(result.area==='lab'&&bunkerBlocked(result.x,result.z)){result.x=0;result.z=11}
  if(result.landing){result.x=0;result.z=14}
  result.time=clamp(result.time,0,1e8);result.cooldown=clamp(result.cooldown,0,12);result.composure=clamp(result.composure,.1,1);result.exposure=clamp(result.exposure,0,1);
  // Transitions are deliberately not restored. A reload resumes safely at the source landing/hatch.
  result.climb=null;return result;
}
export function saveState(store,key,state){
  const raw=JSON.stringify(validateSave(state));const previous=store.getItem(key);
  if(previous){let valid=false;try{validateSave(JSON.parse(previous));valid=true}catch{}if(valid)store.setItem(key+'.backup',previous)}
  store.setItem(key,raw);return true;
}
export function loadState(store,key){
  for(const k of [key,key+'.backup'])try{const raw=store.getItem(k);if(raw)return{state:validateSave(JSON.parse(raw)),backup:k.endsWith('.backup')}}catch{}
  return{state:fresh(),backup:false};
}
