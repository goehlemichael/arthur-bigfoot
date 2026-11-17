import { TREE_SPECS, LAB_VERSION } from './physics.js';
export const SAVE_KEY='arthur:field-lab:save:1';
const xyz=(o,limit)=>{if(!o||!['x','y','z'].every(k=>Number.isFinite(o[k])&&Math.abs(o[k])<=limit))throw Error('Invalid pose in field-lab save.');return{x:o.x,y:o.y,z:o.z};};
export function validateSnapshot(d){
 if(!d||d.schema!==1)throw Error('Unsupported field-lab save version.');
 if(!Array.isArray(d.trees)||d.trees.length!==TREE_SPECS.length||new Set(d.trees.map(t=>t.id)).size!==TREE_SPECS.length)throw Error('Tree IDs must be complete and unique.');
 if(!Number.isFinite(d.heading))throw Error('Invalid heading.');
 const trees=d.trees.map(row=>{const spec=TREE_SPECS.find(t=>t.id===row.id);if(!spec||typeof row.broken!=='boolean'||typeof row.braced!=='boolean'||row.braced&&!row.broken)throw Error('Invalid tree state.');
  if(!Number.isFinite(row.damage)||row.damage<0||row.damage>spec.strength)throw Error('Invalid wood damage.');
  const p=xyz(row.p,250),v=xyz(row.v,1000),w=xyz(row.w,1000),q={...xyz(row.q,1.001),w:row.q.w};
  if(!Number.isFinite(q.w)||Math.abs(Math.hypot(q.x,q.y,q.z,q.w)-1)>.01)throw Error('Invalid rotation.');
  return{id:spec.id,broken:row.broken,braced:row.braced,damage:row.damage,p,q,v,w};
 });
 if(trees.filter(t=>t.braced).length>2)throw Error('Too many mounted supports.');
 return{schema:1,version:LAB_VERSION,heading:d.heading,player:xyz(d.player,60),scarf:['Tartan','Green','Blue','Hemp'].includes(d.scarf)?d.scarf:'Tartan',trees};
}
export function snapshot(lab,scarf='Tartan'){
 return validateSnapshot({schema:1,heading:lab.heading,player:lab.player.translation(),scarf,trees:lab.trees.map(t=>({id:t.id,broken:t.broken,braced:t.braced,damage:Math.min(t.strength,t.damage),p:t.body.translation(),q:t.body.rotation(),v:t.body.linvel(),w:t.body.angvel()}))});
}
export function applySnapshot(lab,data){
 const d=validateSnapshot(data);
 for(const row of d.trees){const t=lab.trees.find(t=>t.id===row.id);if(row.broken)lab.breakTree(t);if(row.braced){t.braced=true;t.body.setBodyType(1,true);lab.braces.push(t.id);}t.damage=row.damage;t.body.setTranslation(row.p,true);t.body.setRotation(row.q,true);t.body.setLinvel(row.v,true);t.body.setAngvel(row.w,true);}
 if(lab.braces.length===2)lab.addDeck();lab.player.setTranslation(d.player,true);lab.heading=d.heading;lab.drainEvents();lab.noise=0;
 return d;
}
export function saveSnapshot(store,data){
 const next=JSON.stringify(validateSnapshot(data));const old=store.getItem(SAVE_KEY);
 if(old){let parsed;try{parsed=JSON.parse(old)}catch{}if(parsed&&parsed.schema!==1)throw Error('Newer or unsupported save preserved.');try{validateSnapshot(parsed);store.setItem(SAVE_KEY+'.backup',old)}catch(e){if(parsed?.schema===1&&e.name==='QuotaExceededError')throw e;}}
 store.setItem(SAVE_KEY,next);return true;
}
export function loadSnapshot(store){
 let primary;try{primary=store.getItem(SAVE_KEY);if(!primary)return{data:null};const d=JSON.parse(primary);if(d.schema!==1)return{data:null,blocked:true};return{data:validateSnapshot(d)}}catch{}
 try{const backup=store.getItem(SAVE_KEY+'.backup');if(backup)return{data:validateSnapshot(JSON.parse(backup)),backup:true}}catch{}
 return{data:null,blocked:!!primary};
}
