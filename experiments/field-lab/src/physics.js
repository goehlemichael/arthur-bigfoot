/** Real Rapier rigid-body playground. SI-like units; deliberately game-tuned wood,
 * not a forestry/engineering simulation. Fracture occurs at authored trunk seams. */
import * as RAPIER from '@dimforge/rapier3d-compat/rapier.es.js';
export const STEP = 1 / 60;
export const LAB_VERSION = '0.6.0-field-lab';
export const PAD = Object.freeze({ x: -7, z: -9 });
export const TREE_SPECS = Object.freeze([
  { id: 'cedar-a', x: -2, z: 2, h: 6.4, r: .28, strength: 720 },
  { id: 'cedar-b', x: 5, z: -2, h: 7.1, r: .32, strength: 1000 },
  { id: 'cedar-c', x: 8, z: 6, h: 5.8, r: .25, strength: 620 },
  { id: 'cedar-d', x: -10, z: 6, h: 7.6, r: .35, strength: 1300 }
]);
let ready;
export function initPhysics() { return ready ??= RAPIER.init(); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distanceXZ = (a, b) => Math.hypot(a.x-b.x, a.z-b.z);
export function seeded(seed=73) { return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
export function scenery() {
  const random=seeded(), result=[];
  for(let i=0;i<100;i++) { const a=random()*Math.PI*2,r=18+random()*32;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(z>14 && Math.abs(x)<6) continue;
    result.push({x,z,r:.25+random()*.45,h:10+random()*12,seed:i});
  } return result;
}
export class PhysicsLab {
  static async create() { await initPhysics(); return new PhysicsLab(); }
  constructor() {
    this.world = new RAPIER.World({x:0,y:-9.81,z:0}); this.world.timestep=STEP;
    this.world.numSolverIterations=8;
    this.queue=new RAPIER.EventQueue(true);this.time=0;this.accumulator=0;
    this.trees=[];this.events=[];this.braces=[];this.held=null;this.drone=null;this.rocket=null;
    this.noise=0;this.noisePeak=0;this.heading=Math.PI;this.sprinting=false;this.moves=0;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(60,.3,60).setTranslation(0,-.3,0).setFriction(.85));
    for(const t of scenery()) this.world.createCollider(RAPIER.ColliderDesc.cylinder(t.h/2,t.r).setTranslation(t.x,t.h/2,t.z));
    for(const t of TREE_SPECS) this.addTree(t);
    this.player=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,1.26,10).lockRotations().setCcdEnabled(true).setLinearDamping(.3));
    this.playerCollider=this.world.createCollider(RAPIER.ColliderDesc.capsule(.77,.46).setMass(270).setFriction(.1).setRestitution(0).setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(100),this.player);
    this.crates=[];
    for(const [x,z] of [[-12,-4],[-13,-4],[-12,-5.1]]) {
      const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,.47,z).setCanSleep(true));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(.43,.43,.43).setMass(20).setFriction(.7),body);this.crates.push(body);
    }
  }
  addTree(spec) {
    const base=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(spec.x,.35,spec.z));
    this.world.createCollider(RAPIER.ColliderDesc.cylinder(.35,spec.r*1.12),base);
    const length=spec.h-.7;
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(spec.x,.7+length/2,spec.z).setLinearDamping(.15).setAngularDamping(.65).setCanSleep(true).setCcdEnabled(true));
    const collider=this.world.createCollider(RAPIER.ColliderDesc.cylinder(length/2,spec.r).setDensity(300).setFriction(.8).setRestitution(.08).setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(100),body);
    const q={x:0,y:0,z:0,w:1};
    const joint=this.world.createImpulseJoint(RAPIER.JointData.fixed({x:0,y:.35,z:0},q,{x:0,y:-length/2,z:0},q),base,body,true);
    const tree={...spec,length,body,collider,base,joint,broken:false,braced:false,damage:0,brokenAt:null};
    this.trees.push(tree); return tree;
  }
  signal(type, data={}) { this.events.push({type,...data}); if(this.events.length>50) this.events.shift(); }
  drainEvents() { return this.events.splice(0); }
  breakTree(tree, dir={x:0,z:-1}) {
    if(!tree || tree.broken) return false;
    this.world.removeImpulseJoint(tree.joint,true); tree.joint=null;tree.broken=true;tree.brokenAt=this.time;tree.damage=tree.strength;
    const p=tree.body.translation();
    const n=Math.hypot(dir.x,dir.z)||1;
    tree.body.applyImpulseAtPoint({x:dir.x/n*280,y:0,z:dir.z/n*280},{x:p.x,y:p.y+1,z:p.z},true);
    this.noise=1;this.noisePeak=1;this.signal('snap',{id:tree.id}); return true;
  }
  shove() {
    const p=this.player.translation();
    const candidates=this.trees.filter(t=>!t.broken&&distanceXZ(p,t)<2.6).sort((a,b)=>distanceXZ(p,a)-distanceXZ(p,b));
    if(!candidates.length)return {ok:false,text:'A little closer to a marked cedar, please.'};
    const t=candidates[0];t.damage+=420;
    this.noise=Math.max(this.noise,.3);this.signal('creak',{id:t.id});
    if(t.damage>=t.strength) this.breakTree(t,{x:t.x-p.x,z:t.z-p.z});
    return {ok:true,text:t.broken?'Oh. That was rather more tree than intended.':'Steady. A controlled structural adjustment.'};
  }
  toggleCarry() {
    if(this.held) { this.signal('drop',{id:this.held.id});this.held=null;return {ok:true,text:'Gently. We are not making firewood.'}; }
    const p=this.player.translation();
    const t=this.trees.filter(t=>t.broken&&!t.braced&&distanceXZ(t.body.translation(),p)<4.5).sort((a,b)=>distanceXZ(a.body.translation(),p)-distanceXZ(b.body.translation(),p))[0];
    if(!t)return {ok:false,text:'Stand near a fallen trunk to engage the lifting harness.'};
    this.held=t;t.body.wakeUp();return {ok:true,text:'The lifting harness is helping. My back is not experimental.'};
  }
  brace() {
    if(!this.held)return {ok:false,text:'Bring a fallen trunk in the lifting harness first.'};
    if(distanceXZ(this.player.translation(),PAD)>6)return {ok:false,text:'Bring the timber to the marked launch cradle.'};
    if(this.braces.length>=2)return {ok:false,text:'Two supports are quite sufficient.'};
    const t=this.held,index=this.braces.length;this.held=null;t.braced=true;
    t.body.setTranslation({x:PAD.x+(index?1.15:-1.15),y:.35,z:PAD.z},true);
    t.body.setRotation({x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2},true);
    t.body.setLinvel({x:0,y:0,z:0},true);t.body.setAngvel({x:0,y:0,z:0},true);
    t.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
    this.braces.push(t.id);if(this.braces.length===2)this.addDeck();this.signal('brace',{id:t.id});
    return {ok:true,text:this.braces.length===2?'Level, braced, and almost discreet. The aircraft are ready.':'One support secured. One more, please.'};
  }
  addDeck() { if(!this.deckCollider)this.deckCollider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.48,.12,1.85).setTranslation(PAD.x,.72,PAD.z).setFriction(.8)); }
  preflight() {
    if(this.braces.length<2)return {ok:false,text:'Mount two timber supports before launch.'};
    if(distanceXZ(this.player.translation(),PAD)<3.5)return {ok:false,text:'Please stand outside the launch ring.'};
    const obstruction=this.trees.some(t=>!t.braced&&distanceXZ(t.body.translation(),PAD)<2.2);
    if(obstruction)return {ok:false,text:'The launch area is obstructed by timber.'};
    return {ok:true};
  }
  launchDrone() {
    const check=this.preflight();if(!check.ok)return check;
    if(this.drone)return {ok:false,text:'The survey drone is already in the air.'};
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(PAD.x,1.25,PAD.z).setLinearDamping(.12).setAngularDamping(3).setCcdEnabled(true));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(.55,.16,.55).setMass(4).setFriction(.8),body);
    this.drone={body,target:{x:PAD.x,y:5,z:PAD.z},age:0};this.noise=Math.max(.35,this.noise);this.signal('drone');
    return {ok:true,text:'Survey drone away. Please avoid photographing its owner.'};
  }
  launchRocket() {
    const check=this.preflight();if(!check.ok)return check;
    if(this.rocket)return {ok:false,text:'The atmospheric probe is still completing its flight.'};
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(PAD.x,2,PAD.z).setLinearDamping(.04).setAngularDamping(2).setCcdEnabled(true));
    this.world.createCollider(RAPIER.ColliderDesc.capsule(.7,.18).setMass(24).setRestitution(.03).setFriction(.9),body);
    this.rocket={body,age:0,phase:'boost',maxAltitude:2};this.noise=1;this.noisePeak=1;this.signal('launch');
    return {ok:true,text:'Atmospheric probe departing. Entirely non-explosive. Unlike Gary’s enthusiasm.'};
  }
  step(input={}) {
    this.time+=STEP;this.noise=Math.max(0,this.noise-STEP*.065);
    let x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0;
    const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
    const p=this.player.translation(),v=this.player.linvel();
    this.sprinting=!!input.sprint&&length>.1&&!this.held;
    const speed=this.held?2.8:this.sprinting?7.4:3.7;
    if(length>.02)this.heading=Math.atan2(x,z);
    const mass=this.player.mass(),gain=9,maxF=mass*(this.sprinting?17:12);
    this.player.resetForces(false);this.player.addForce({x:clamp((x*speed-v.x)*mass*gain,-maxF,maxF),y:0,z:clamp((z*speed-v.z)*mass*gain,-maxF,maxF)},true);
    if(this.held){
      const b=this.held.body,bp=b.translation(),bv=b.linvel(),m=b.mass();
      const target={x:p.x+Math.sin(this.heading)*2,y:3.3,z:p.z+Math.cos(this.heading)*2};
      b.resetForces(false); b.addForce({x:clamp((target.x-bp.x)*m*14-bv.x*m*6,-m*35,m*35),y:clamp((target.y-bp.y)*m*14-bv.y*m*6+m*9.81,-m*35,m*35),z:clamp((target.z-bp.z)*m*14-bv.z*m*6,-m*35,m*35)},true);
    }
    for(const t of this.trees) if(t!==this.held&&!t.braced)t.body.resetForces(false);
    if(this.drone){
      const d=this.drone,b=d.body,dp=b.translation(),dv=b.linvel(),m=b.mass();d.age+=STEP;
      const wind={x:Math.sin(this.time*.65)*1.6,z:Math.cos(this.time*.42)*1.1};
      b.resetForces(false);b.resetTorques(false);
      b.addForce({x:(d.target.x-dp.x)*m*3.4-dv.x*m*2.5+wind.x,y:clamp((d.target.y-dp.y)*m*5-dv.y*m*3.1+m*9.81,0,m*20),z:(d.target.z-dp.z)*m*3.4-dv.z*m*2.5+wind.z},true);
      const q=b.rotation(),av=b.angvel();b.addTorque({x:-q.x*8-av.x*4,y:-q.y*3-av.y*2,z:-q.z*8-av.z*4},true);
    }
    if(this.rocket){
      const r=this.rocket,b=r.body,rp=b.translation(),rv=b.linvel(),m=b.mass();r.age+=STEP;r.maxAltitude=Math.max(r.maxAltitude,rp.y);b.resetForces(false);b.resetTorques(false);
      if(r.age<4){b.addForce({x:0,y:m*17,z:0},true);const q=b.rotation(),a=b.angvel();b.addTorque({x:-q.x*100-a.x*12,y:-a.y*2,z:-q.z*100-a.z*12},true);}
      else if(rv.y<0){r.phase='recovery';b.addForce({x:-rv.x*m*.6,y:-rv.y*m*3.1,z:-rv.z*m*.6},true);}
      else r.phase='coast';
      if(r.age>8&&rp.y<1.15&&Math.abs(rv.y)<2){r.phase='landed';}
    }
    this.world.step(this.queue);
    this.queue.drainContactForceEvents(event=>{
      const a=event.collider1(),b=event.collider2();
      if(a!==this.playerCollider.handle&&b!==this.playerCollider.handle)return;
      const t=this.trees.find(t=>!t.broken&&(t.collider.handle===a||t.collider.handle===b));
      if(t&&this.sprinting&&event.totalForceMagnitude()*STEP>t.strength) this.breakTree(t,{x,z});
    });
    const pos=this.player.translation();
    if(Math.abs(pos.x)>53||Math.abs(pos.z)>53||pos.y<-.8||pos.y>12){this.player.setTranslation({x:0,y:1.26,z:10},true);this.player.setLinvel({x:0,y:0,z:0},true);this.held=null;}
  }
  advance(dt,input={}) {
    if(!Number.isFinite(dt)||dt<0)return 0;
    this.accumulator+=Math.min(dt,.1);let n=0;
    while(this.accumulator+1e-10>=STEP&&n<6){this.step(input);this.accumulator-=STEP;n++;}
    return n;
  }
  dispose(){this.queue.free();this.world.free();}
}
