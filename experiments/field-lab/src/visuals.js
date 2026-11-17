import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAD, scenery, seeded } from './physics.js';
import { cedarCanopy, fernGeometry } from './foliage.js';
export { THREE };
const v = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.85,...extra});}
export const palette={bark:mat('#65503a'),wood:mat('#c6a779'),moss:mat('#536843'),metal:mat('#91a39a',{metalness:.65,roughness:.35}),dark:mat('#273d39',{metalness:.35}),gold:mat('#bd9d61',{metalness:.6,roughness:.35}),light:mat('#bce2c5',{emissive:'#80bda7',emissiveIntensity:.7})};
const shapes={sphere:new THREE.SphereGeometry(1,12,8),box:new THREE.BoxGeometry(2,2,2),cone:new THREE.ConeGeometry(1,2,7),cylinder:new THREE.CylinderGeometry(1,1,2,10)};
export function mesh(type,material,pos=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){
 const m=new THREE.Mesh(shapes[type],material);m.position.set(...pos);m.scale.set(...scale);m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;return m;
}
export function between(a,b,r,material){const delta=b.clone().sub(a);const m=mesh('cylinder',material,a.clone().add(b).multiplyScalar(.5).toArray(),[r,delta.length()/2,r]);m.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return m;}
function texture(kind,size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),r=seeded(kind==='bark'?4:8);
 ctx.fillStyle=kind==='bark'?'#797161':'#64694e';ctx.fillRect(0,0,size,size);
 for(let i=0;i<2800;i++) {const grey=Math.floor(30+r()*95);ctx.fillStyle=`rgba(${grey},${grey},${grey*.8},${.08+r()*.18})`;if(kind==='bark')ctx.fillRect(r()*size,r()*size,1+r()*3,12+r()*100);else ctx.fillRect(r()*size,r()*size,1+r()*8,1+r()*5);}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(kind==='bark'?2:18,kind==='bark'?2:18);return t;
}
function mergedFur(parent,parts,seed=4) {
 const r=seeded(seed),geometries=[];
 for(const part of parts){const {pos,scale,count}=part;
   const g=shapes.sphere.clone();g.scale(...scale);g.translate(...pos);geometries.push(g);
   for(let i=0;i<count;i++) {const a=r()*Math.PI*2,h=r()*1.8-.9,k=Math.sqrt(1-h*h);const p=v(Math.cos(a)*scale[0]*k,h*scale[1],Math.sin(a)*scale[2]*k).add(v(...pos));
    const tuft=shapes.cone.clone();tuft.scale(.03+r()*.025,.035+r()*.035,.034);tuft.rotateZ((r()-.5)*.45);tuft.rotateX(Math.PI);tuft.translate(...p.toArray());geometries.push(tuft);}
 }
 for(const g of geometries){const count=g.attributes.position.count;const arr=new Float32Array(count*3);const col=new THREE.Color().setHSL(.075,.34,.27+r()*.09,THREE.SRGBColorSpace);for(let i=0;i<count;i++)arr.set([col.r,col.g,col.b],i*3);g.setAttribute('color',new THREE.BufferAttribute(arr,3));}
 const g=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96}));m.castShadow=true;m.receiveShadow=true;parent.add(m);
}
export function createArthur(){
 const root=new THREE.Group(),torso=new THREE.Group(),head=new THREE.Group(),arms=[],legs=[];root.add(torso);torso.position.y=1.25;
 mergedFur(torso,[{pos:[0,0,0],scale:[.5,.65,.32],count:130},{pos:[0,.32,0],scale:[.61,.3,.34],count:60}],9);
 head.position.set(0,2.08,0);root.add(head);mergedFur(head,[{pos:[0,0,0],scale:[.38,.43,.32],count:100}],13);
 const skin=mat('#a27b55');head.add(mesh('sphere',skin,[0,-.12,.27],[.26,.18,.15]),mesh('sphere',palette.dark,[0,-.055,.42],[.09,.047,.035]));
 for(const s of [-1,1]){head.add(mesh('sphere',mat('#dccca3'),[s*.13,.08,.3],[.066,.045,.035]),mesh('sphere',mat('#24241c'),[s*.13,.074,.334],[.026,.03,.014]),mesh('sphere',mat('#533e2a'),[s*.145,.15,.31],[.13,.04,.05],[0,0,s*.18]));const ring=new THREE.Mesh(new THREE.TorusGeometry(.105,.009,5,24),palette.gold);ring.position.set(s*.14,.05,.355);head.add(ring);}
 head.add(mesh('box',palette.gold,[0,.055,.36],[.04,.008,.008]),mesh('box',mat('#644b34'),[0,-.235,.39],[.12,.009,.006]));
 for(const s of [-1,1]) {
   const arm=new THREE.Group();arm.position.set(s*.55,1.62,0);root.add(arm);arms.push(arm);
   mergedFur(arm,[{pos:[s*.04,-.3,0],scale:[.18,.45,.18],count:55}],22+s);
   arm.add(mesh('sphere',skin,[s*.06,-.69,.045],[.145,.17,.11]));for(let i=0;i<4;i++)arm.add(mesh('sphere',skin,[s*.06+(i-1.5)*.051,-.8,.07],[.03,.09,.04]));
   const leg=new THREE.Group();leg.position.set(s*.25,.65,0);root.add(leg);legs.push(leg);mergedFur(leg,[{pos:[0,-.1,0],scale:[.22,.42,.23],count:50}],45+s);leg.add(mesh('sphere',skin,[0,-.52,.12],[.23,.13,.33]));for(let i=0;i<5;i++)leg.add(mesh('sphere',skin,[(i-2)*.078,-.53,.39],[.044,.055,.075]));
 }
 const scarf=new THREE.Group();root.add(scarf);const sm=mat('#7b5041');const ring=new THREE.Mesh(new THREE.TorusGeometry(.36,.065,7,32),sm);ring.rotation.x=Math.PI/2;ring.position.y=1.84;scarf.add(ring);
 for(const s of [-1,1]){const tail=mesh('box',sm,[s*.11,1.5,.4],[.08,.3,.03],[0,0,s*.1]);scarf.add(tail);for(let i=0;i<5;i++){scarf.add(mesh('box',palette.gold,[s*.11,1.27+i*.1,.434],[.081,.006,.005]));}}
 root.add(mesh('box',mat('#5a3e29'),[-.5,.85,.15],[.22,.2,.12]),mesh('box',palette.gold,[-.5,.85,.278],[.035,.04,.01]),mesh('box',mat('#634c32'),[0,1.42,.345],[.037,.64,.02],[0,0,-.55]));
 return {root,arms,legs,head,scarf,setScarf(name){sm.color.set(({Tartan:'#7b5041',Green:'#435c45',Blue:'#455e75',Hemp:'#b7a276'})[name]||'#7b5041');},animate(t,speed,carry=false){let gait=t*(speed>5?10:7.2);legs[0].rotation.x=Math.sin(gait)*Math.min(speed/4,1)*.48;legs[1].rotation.x=-legs[0].rotation.x;arms.forEach((a,i)=>{a.rotation.x=carry?-.9:Math.sin(gait+i*Math.PI)*Math.min(speed/5,1)*.3;a.rotation.z=i?-.05:.05;});head.rotation.y=speed<.2?Math.sin(t*.6)*.12:0;torso.rotation.x=speed>5?.08:0;}};
}
function fernGroup(positions){
 const geo=fernGeometry();const m=mat('#65864b',{side:THREE.DoubleSide});
 const inst=new THREE.InstancedMesh(geo,m,positions.length*7);let i=0;const d=new THREE.Object3D();for(const p of positions)for(let j=0;j<7;j++){d.position.set(p.x,.04,p.z);d.rotation.set(.4,j*Math.PI*2/7,Math.sin(j)*.4);d.scale.setScalar(p.s);d.updateMatrix();inst.setMatrixAt(i++,d.matrix);}inst.receiveShadow=true;return inst;
}
export function createEnvironment(scene,lab){
 const groundMaterial=mat('#7b815c',{map:texture('earth'),roughness:1});const ground=mesh('box',groundMaterial,[0,-.32,0],[60,.3,60]);scene.add(ground);
 const barkMap=texture('bark');palette.bark.map=barkMap;palette.bark.needsUpdate=true;
 const trunkGeo=new THREE.CylinderGeometry(1,1.25,1,9),trunks=new THREE.InstancedMesh(trunkGeo,palette.bark,scenery().length);const crowns=new THREE.InstancedMesh(cedarCanopy(),mat('#ffffff',{vertexColors:true,side:THREE.DoubleSide}),scenery().length);let i=0,j=0;const d=new THREE.Object3D();
 for(const t of scenery()){d.position.set(t.x,t.h/2,t.z);d.scale.set(t.r,t.h,t.r);d.rotation.set(0,t.seed,0);d.updateMatrix();trunks.setMatrixAt(i++,d.matrix);
   d.position.set(t.x,t.h*.36,t.z);d.scale.set(3.7,t.h*.68,3.7);d.updateMatrix();crowns.setMatrixAt(j++,d.matrix);}
 trunks.castShadow=trunks.receiveShadow=true;crowns.castShadow=crowns.receiveShadow=true;scene.add(trunks,crowns);
 const r=seeded(79),ferns=[];for(let i=0;i<420;i++){let x=(r()-.5)*75,z=(r()-.5)*75;if(Math.abs(x)<2&&z>-12&&z<13)continue;if(Math.hypot(x-PAD.x,z-PAD.z)<4)continue;ferns.push({x,z,s:.5+r()*1.4});}scene.add(fernGroup(ferns));
 for(let i=0;i<16;i++){const x=16+Math.sin(i*.28)*2,z=-28+i*4;const water=mesh('sphere',mat('#587b77',{metalness:.25,roughness:.2}),[x,-.09,z],[2.2,.14,3.1]);water.castShadow=false;scene.add(water);}
 for(let i=0;i<45;i++){const a=r()*Math.PI*2,rad=16+r()*22;scene.add(mesh('sphere',mat(i%2?'#738174':'#68766a'),[Math.cos(a)*rad,.2,Math.sin(a)*rad],[.3+r()*.8,.3+r()*.8,.4+r()*.5]));}
 const apron=mesh('cylinder',mat('#627260'),[PAD.x,.025,PAD.z],[3.8,.025,3.8]);scene.add(apron);
 const ring=new THREE.Mesh(new THREE.RingGeometry(3.5,3.56,80),new THREE.MeshBasicMaterial({color:'#dbc384',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(PAD.x,.055,PAD.z);scene.add(ring);
 const deck=mesh('box',palette.metal,[PAD.x,.72,PAD.z],[1.48,.12,1.85]);deck.visible=false;scene.add(deck);
 for(const s of [-1,1])scene.add(mesh('cylinder',palette.dark,[PAD.x+s*3,.55,PAD.z],[.06,.55,.06]),mesh('sphere',palette.light,[PAD.x+s*3,1.12,PAD.z],[.08,.08,.08]));
 const workbench=mesh('box',mat('#857254'),[-12,.95,-4],[1.6,.09,.75]);scene.add(workbench);for(const x of [-13.3,-10.7])for(const z of [-4.5,-3.5])scene.add(mesh('box',palette.dark,[x,.45,z],[.07,.45,.07]));
 scene.add(mesh('box',palette.dark,[-12,1.4,-4.5],[.45,.3,.035]),mesh('box',palette.light,[-12,1.4,-4.455],[.4,.24,.008]));
 return {deck};
}
export function treeVisual(t){
 const root=new THREE.Group();root.add(mesh('cylinder',palette.bark,[0,0,0],[t.r,t.length/2,t.r]));
 for(const s of [-1,1])root.add(mesh('cylinder',palette.wood,[0,s*(t.length/2+.002),0],[t.r*.92,.009,t.r*.92]));
 const crown=new THREE.Mesh(cedarCanopy(),mat('#ffffff',{vertexColors:true,side:THREE.DoubleSide}));crown.position.y=-t.length*.16;crown.scale.set(2.2,t.length*.76,2.2);crown.castShadow=true;root.add(crown);
 const band=mesh('cylinder',palette.gold,[0,-t.length/2+.45,0],[t.r*1.04,.05,t.r*1.04]);root.add(band);
 const stump=mesh('cylinder',palette.bark,[t.x,.35,t.z],[t.r*1.12,.35,t.r*1.12]);const cap=mesh('cylinder',palette.wood,[t.x,.706,t.z],[t.r*1.02,.012,t.r*1.02]);
 const splinters=new THREE.Group();for(let i=0;i<9;i++){const a=i*Math.PI*2/9;splinters.add(mesh('cone',palette.wood,[t.x+Math.cos(a)*t.r*.7,.78+(i%3)*.03,t.z+Math.sin(a)*t.r*.7],[.035,.08+(i%3)*.025,.045],[0,a,0]));}return {root,stump,cap,crown,band,splinters};
}
export function aircraftVisual(kind){
 const root=new THREE.Group(),rotors=[];
 if(kind==='drone'){
  root.add(mesh('sphere',palette.metal,[0,0,0],[.3,.17,.42]),mesh('sphere',palette.light,[0,-.1,.37],[.08,.07,.08]));
  for(const x of [-1,1])for(const z of [-1,1]){root.add(between(v(x*.1,0,z*.1),v(x*.55,.03,z*.55),.035,palette.dark));const rotor=new THREE.Group();rotor.position.set(x*.55,.09,z*.55);rotor.add(mesh('box',palette.dark,[0,0,0],[.3,.012,.035]));root.add(rotor);rotors.push(rotor);}
 }else {root.add(mesh('cylinder',palette.metal,[0,0,0],[.18,.7,.18]),mesh('cone',palette.gold,[0,.92,0],[.18,.28,.18]),mesh('cylinder',palette.dark,[0,-.73,0],[.14,.06,.14]));for(let i=0;i<4;i++){const fin=mesh('box',palette.dark,[0,-.5,0],[.34,.2,.025]);fin.rotation.y=i*Math.PI/2;root.add(fin);}const glow=mesh('cone',new THREE.MeshBasicMaterial({color:'#ffe2a5'}),[0,-1.12,0],[.12,.32,.12],[Math.PI,0,0]);root.add(glow);root.userData.flame=glow;
  const canopy=mesh('sphere',mat('#d5b87f',{side:THREE.DoubleSide}),[0,2.4,0],[1.4,.5,1.4]);canopy.visible=false;root.add(canopy);root.userData.chute=canopy;
 }
 return {root,rotors};
}
