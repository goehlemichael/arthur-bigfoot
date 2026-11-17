// Pure gameplay and persistence rules, independent of graphics and DOM.
export const VERSION='0.4.1-rebuilt';
export const OPTIONS={
  scarf:['Tartan','Deep blue','Forest green','Burgundy','Natural hemp','Tie-dye hemp','None'],
  hair:['Classic','Side part','Windswept','Top knot','Tidy trim'],
  glasses:['Round','Rectangle','Half frame','Monocle','None'],
  drink:['British tea','Earl Grey','Matcha','Chai','Boba','Iced coffee'],
  accessory:['Satchel','Backpack','Tool belt','Journal','None']
};
export const DEFAULT_LOOK={scarf:'Tartan',hair:'Classic',glasses:'Round',drink:'British tea',accessory:'Satchel'};
export const MARKERS={crash:{x:0,z:-6},camera:{x:11,z:-15},home:{x:0,z:22},bench:{x:0,z:-3},tea:{x:-6,z:3}};
export const TASKS=[['A very inconvenient signal','Find the crashed field coil. Follow the gold beacon.'],['No publicity, please','Remove the memory card from Gary’s trail camera.'],['Home, discreetly','Return to the mossy entrance. Leave no photographs behind.'],['A matter of calibration','At the workbench, align the three channels to 2 • 4 • 1.'],['Tea. At last.','The propulsion test is complete. Visit the tea station.'],['A perfectly manageable Tuesday','Job complete. Your look and progress are saved on this device.']];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function fresh(){return{schema:1,stage:0,area:'forest',x:0,z:22,heading:Math.PI,evidence:0,exposure:0,composure:1,cooldown:0,time:0,calibration:[0,0,0],look:{...DEFAULT_LOOK}}}
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function treeMap(){
  let seed=83;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const trees=[];
  for(let i=0;i<160;i++){
    const x=(random()-.5)*62,z=(random()-.5)*66,r=.5+random()*.55,h=6+random()*5;
    if(Math.abs(Math.hypot((x-11)/7,(z+13)/4)-1)<.38)continue; // Keep Gary's patrol out of tree trunks.
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
export function target(s){return s.stage===0?MARKERS.crash:s.stage===1||s.stage===2&&s.evidence>0?MARKERS.camera:s.stage===2?MARKERS.home:s.stage===3?MARKERS.bench:MARKERS.tea}
export function move(s,x,z,sneak,dt){
  const magnitude=Math.hypot(x,z);if(magnitude>1){x/=magnitude;z/=magnitude}if(magnitude>.04)s.heading=Math.atan2(x,z);
  const speed=sneak?2.0:4.4,limit=s.area==='lab'?10:30;
  const can=(nx,nz)=>s.area==='lab'||!TREES.some(t=>Math.hypot(nx-t.x,nz-t.z)<t.r+.48);
  let nx=clamp(s.x+x*speed*dt,-limit,limit),nz=clamp(s.z+z*speed*dt,-limit,limit);
  if(can(nx,s.z))s.x=nx;if(can(s.x,nz))s.z=nz;
}
export function tick(s,input,dt){
  dt=clamp(dt,0,.05);s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);move(s,input.x,input.z,input.sneak,dt);
  const g=gary(s.time),angle=Math.atan2(s.x-g.x,s.z-g.z),difference=Math.atan2(Math.sin(angle-g.heading),Math.cos(angle-g.heading));
  const cover=input.sneak&&FERNS.some(f=>distance(s,f)<f.r);
  const seen=s.area==='forest'&&distance(s,g)<(input.sneak?8:12)&&Math.abs(difference)<.65&&!cover&&!blocked(g,s);
  s.exposure=clamp(s.exposure+(seen?.45:-.40)*dt,0,1);s.composure=clamp(s.composure+(seen?-.09:.025)*dt,.1,1);
  if(s.exposure>=1&&s.cooldown===0){s.evidence++;s.cooldown=9;return 'Oh, good Lord. A photograph. I shall need that memory card.'}return '';
}
export function interact(s){
  if(s.stage===5)return 'Tea, a functioning propulsion system, and no interviews. Bliss.';
  if(distance(s,target(s))>2.7)return 'A little closer. Quietly, preferably.';
  if(s.stage===0){s.stage=1;return 'Non-human fabrication. Marvellous. As though I had nothing else to do.'}
  if(s.stage===1||s.stage===2&&s.evidence>0){s.evidence=0;s.stage=2;s.exposure=0;s.cooldown=12;return 'Memory card removed. Camera unharmed. We are not savages.'}
  if(s.stage===2){s.area='lab';s.stage=3;s.x=0;s.z=8;s.exposure=0;return 'Home. Kindly wipe your feet. Mine included.'}
  if(s.stage===3)return 'workbench';
  s.stage=5;return 'Propulsion stabilised. Tea secured. A perfectly manageable Tuesday.';
}
export function calibrate(s){if(s.stage!==3||s.calibration.join()!=='2,4,1')return false;s.stage=4;return true}
export function validateSave(value){
  if(!value||value.schema!==1||!Number.isInteger(value.stage)||value.stage<0||value.stage>5||!['forest','lab'].includes(value.area))throw Error('Not a compatible Arthur recovery save.');
  for(const key of ['x','z','heading','time','composure','exposure','evidence','cooldown'])if(!Number.isFinite(value[key]))throw Error('Save contains invalid numbers.');
  if(value.area!==(value.stage<3?'forest':'lab'))throw Error('Save area and mission do not agree.');
  if(value.evidence<0||!Number.isInteger(value.evidence)||value.evidence>9999)throw Error('Invalid evidence count.');
  if(!Array.isArray(value.calibration)||value.calibration.length!==3||value.calibration.some(x=>!Number.isInteger(x)||x<0||x>4))throw Error('Invalid calibration.');
  const result=fresh();for(const key of ['stage','area','x','z','heading','time','composure','exposure','evidence','cooldown'])result[key]=value[key];result.calibration=[...value.calibration];result.look={...DEFAULT_LOOK};
  for(const [k,v]of Object.entries(OPTIONS))if(v.includes(value.look?.[k]))result.look[k]=value.look[k];
  const limit=result.area==='lab'?10:30;result.x=clamp(result.x,-limit,limit);result.z=clamp(result.z,-limit,limit);result.time=clamp(result.time,0,1e8);result.cooldown=clamp(result.cooldown,0,12);result.composure=clamp(result.composure,.1,1);result.exposure=clamp(result.exposure,0,1);return result;
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
