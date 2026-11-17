import {transform as T,multiply as M,identity} from './engine.js';
import {TREES,FERNS,MARKERS,gary,target} from './game.js';
const fur=['#795338','#66452f','#825d3d','#573e2d'];
// Articulated rigid parts, not a recovered skinned GLB. Attachment transforms are explicit.
export function drawArthur(r,look,root,time,walking=false,sneak=false,gesture='Idle'){
  const add=(kind,x,y,z,sx,sy,sz,c,parent=root,rx=0,ry=0,rz=0)=>r.add(kind,M(parent,T(x,y,z,sx,sy,sz,rx,ry,rz)),c);
  const bob=walking?Math.abs(Math.sin(time*8))*.04:Math.sin(time*1.7)*.015;
  const torso=M(root,T(0,sneak?-.32+bob:bob,0,1,1,1,sneak?.23:0));
  add('sphere',0,1.65,0,.69,.91,.43,fur[0],torso);
  add('sphere',0,2.17,0,.78,.43,.44,fur[1],torso);
  for(let i=0;i<64;i++){
    const a=i*2.39996,h=.95+(i%13)/12*1.32,w=Math.sqrt(Math.max(.15,1-((h-1.65)/1.2)**2));
    add('cone',Math.cos(a)*.65*w,h,Math.sin(a)*.43,.09,.22,.08,fur[i%4],torso,Math.PI+.12,0,.18*Math.sin(a));
  }
  for(const side of [-1,1]){
    const swing=walking?Math.sin(time*(sneak?5:8))*side*(sneak?.25:.52):0;
    const hip=M(root,T(side*.30,1.22,0,1,1,1,swing));
    add('sphere',0,-.45,0,.29,.56,.29,fur[1],hip);
    add('sphere',0,-1.03,.13,.32,.17,.47,fur[2],hip);
    for(let i=0;i<4;i++)add('sphere',-.21+i*.14,-1.04,.49,.085,.08,.12,'#a3815a',hip);
    let armAngle=-swing*.7;
    if(gesture==='Sip'&&side===1)armAngle=-.8;
    if(gesture==='Shy')armAngle=-.25;
    const arm=M(torso,T(side*.78,2.02,0,1,1,1,armAngle,0,side*.10));
    add('sphere',side*.03,-.48,0,.27,.65,.28,fur[0],arm);
    add('sphere',side*.02,-1.01,.04,.24,.29,.21,fur[2],arm);
    for(let i=0;i<4;i++)add('sphere',side*(-.14+i*.09),-1.20,.13,.055,.14,.07,'#90694a',arm);
    if(side===1){
      const cup=M(arm,T(.03,-.94,.33,1,1,1,gesture==='Sip'?-.25:0));
      const cold=['Boba','Iced coffee','Matcha'].includes(look.drink),drinkColors={'British tea':'#a57048','Earl Grey':'#744832',Matcha:'#94ad64',Chai:'#c29b71',Boba:'#c99e79','Iced coffee':'#503529'};
      add('sphere',0,0,0,.19,cold?.27:.18,.19,cold?drinkColors[look.drink]:'#eee0b8',cup);
      add('sphere',0,cold?.25:.15,0,.165,.018,.165,drinkColors[look.drink],cup);
      if(cold)add('box',.06,.38,0,.02,.22,.02,'#b4c9a2',cup,0,0,-.12);
      else for(let i=0;i<10;i++){const a=i/10*Math.PI*2;add('sphere',.18+Math.cos(a)*.11,Math.sin(a)*.13,0,.045,.045,.045,'#eee0b8',cup)}
      if(look.drink==='Boba')for(let i=0;i<12;i++)add('sphere',Math.cos(i*2.4)*.15,-.15+(i%3)*.035,Math.sin(i*2.4)*.15,.038,.038,.038,'#33241d',cup);
    }
  }
  const head=M(torso,T(0,2.72,.02,1,1,1,gesture==='Shy'?.20:Math.sin(time*.7)*.025));
  add('sphere',0,0,0,.53,.56,.44,fur[0],head);
  add('sphere',0,-.09,.35,.40,.32,.17,'#a2815d',head);
  add('sphere',0,-.04,.48,.15,.095,.09,'#60432e',head);
  add('box',0,-.24,.49,.20,.018,.018,'#57402c',head);
  for(const side of [-1,1]){
    add('sphere',side*.20,.10,.42,.11,.085,.045,'#e7d3a4',head);
    add('sphere',side*.20,.10,.46,.046,.060,.025,'#30241b',head);
    add('sphere',side*.19,.12,.48,.015,.018,.01,'#f2e8cb',head);
    add('sphere',side*.20,.21,.36,.22,.09,.10,fur[1],head,0,0,-side*.08);
    for(let i=0;i<7;i++)add('cone',side*(.36+i*.012),-.10-i*.045,.19,.08,.18,.1,fur[i%4],head,Math.PI,0,side*.2);
  }
  const hairCount=look.hair==='Tidy trim'?10:18;
  for(let i=0;i<hairCount;i++){
    const a=(i/(hairCount-1)-.5)*2.4,part=look.hair==='Side part'?.4:look.hair==='Windswept'?-.45:0;
    add('cone',Math.sin(a)*.43,.42+Math.cos(a)*.07,-.06,.13,look.hair==='Tidy trim'?.15:.24,.12,fur[i%4],head,.2,0,-a*.3+part);
  }
  if(look.hair==='Top knot')add('sphere',0,.68,-.10,.20,.19,.20,fur[1],head);
  if(look.glasses!=='None'){
    for(const side of [-1,1]){
      if(look.glasses==='Monocle'&&side<0)continue;
      if(look.glasses==='Rectangle'){
        for(const q of [-1,1]){add('box',side*.21,.10+q*.10,.51,.16,.015,.015,'#cbb77e',head);add('box',side*.21+q*.16,.10,.51,.015,.10,.015,'#cbb77e',head)}
      }else for(let i=0;i<18;i++){
        const a=i/18*Math.PI*2;if(look.glasses==='Half frame'&&Math.sin(a)<0)continue;
        add('box',side*.21+Math.cos(a)*.15,.1+Math.sin(a)*.13,.52,.03,.012,.013,'#ccb57c',head,0,0,a+Math.PI/2);
      }
    }
    if(look.glasses!=='Monocle')add('box',0,.12,.52,.07,.014,.014,'#ccb57c',head);
  }
  if(look.scarf!=='None'){
    const palette=look.scarf==='Tie-dye hemp'?['#db9467','#709a91','#9b83ab','#d4b570','#487f7b']:look.scarf==='Tartan'?['#3c4b46','#ad7955','#444d4b','#805348']:look.scarf==='Deep blue'?['#4a6782']:look.scarf==='Forest green'?['#627a54']:look.scarf==='Burgundy'?['#864957']:['#c8b78e'];
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2;add('sphere',Math.cos(a)*.51,2.29,Math.sin(a)*.39,.13,.13,.13,palette[i%palette.length],torso)}
    for(let i=0;i<13;i++)for(const side of [-1,1])add('box',side*.16,2.16-i*.072,.47,.105,.045,.045,palette[(i+(side===1?1:0))%palette.length],torso,0,0,side*.08);
  }
  if(look.accessory==='Satchel'||look.accessory==='Journal'){
    add('box',-.61,1.10,.38,look.accessory==='Journal'?.19:.28,.27,.10,'#62422d',torso);add('box',-.61,1.18,.49,.23,.08,.015,'#a47a4a',torso);
    add('box',-.22,1.85,.46,.035,.72,.025,'#987448',torso,0,0,-.52);
  }else if(look.accessory==='Backpack')add('box',0,1.70,-.50,.48,.55,.22,'#58644b',torso);
  else if(look.accessory==='Tool belt')for(let i=0;i<7;i++)add('box',-.50+i*.17,1.12,.43,.065,.12,.07,i%2?'#697573':'#a98452',torso);
}
export function drawWorld(r,s,mode,time){
  const add=(kind,x,y,z,sx,sy,sz,c,rx=0,ry=0,rz=0)=>r.add(kind,T(x,y,z,sx,sy,sz,rx,ry,rz),c);
  if(s.area==='lab'&&mode==='play'){
    add('box',0,-.30,0,13,.30,13,'#514d40');add('box',0,4,-12,13,4,.4,'#3e4743');
    for(let i=-10;i<=10;i+=4){add('box',i,3,-11.5,.06,2.7,.06,'#89988b');add('box',i,5.8,-10,.09,.04,2,'#c7deca')}
    add('box',0,1.1,-3,2.6,.14,.85,'#b09868');for(const x of [-2,2])add('box',x,.5,-3,.1,.5,.5,'#555f57');
    add('sphere',0,1.70,-3,.6,.6,.6,s.stage>=4?'#a5dbc8':'#71b8bf');
    add('sphere',6,2.3,-6,1.5,1.2,3.6,'#9ca9a0');add('cone',6,2.3,-9,1.3,2.0,1.3,'#c7cabb',Math.PI/2);
    add('box',6,2.0,-4,3.2,.1,.7,'#747f76',0,.1,0);add('sphere',6,2.3,-2.3,.9,.9,.18,s.stage>=4?'#9ddbc2':'#547d79');
    add('box',-6,.65,3,1.5,.12,.8,'#967648');for(const x of [-7,-5])add('box',x,.3,3,.09,.3,.7,'#6c5840');
    add('sphere',-6,1.2,3,.32,.38,.32,'#ddceab');add('cone',-6.4,1.23,3,.12,.26,.12,'#cfc19d',0,0,.8);
    add('box',-6,.02,6,3,.02,2,'#7f5251');
  }else{
    add('box',0,-.32,0,65,.30,65,'#526748');
    add('box',0,-.04,4,2.6,.04,23,'#7b8060');
    add('box',0,.015,7,38,.03,1.8,'#628e92');
    for(let i=0;i<5;i++)add('sphere',Math.sin(i)*.4,.04,5.5+i*.75,.80,.16,.55,'#a2a18a');
    for(const t of TREES){
      if(mode==='wardrobe'&&(t.z>-4||Math.hypot(t.x,t.z)<10))continue;
      if(mode==='play'&&Math.hypot(t.x-s.x,t.z-s.z)>40)continue;
      add('cone',t.x,t.h*.5,t.z,t.r,t.h*.5,t.r,'#635640');
      for(let i=0;i<3;i++){if(mode==='play'&&t.z>s.z-1&&t.z<s.z+12&&Math.abs(t.x-s.x)<3.6)continue;add('cone',t.x,t.h*.70+i*1.2,t.z,2.7-i*.5,2.6-i*.35,2.7-i*.5,['#3f6654','#4e785f','#63866a'][i]);}
      add('sphere',t.x,.03,t.z,t.r*1.7,.10,t.r*1.7,'#697a51');
    }
    for(const f of FERNS)for(let i=0;i<14;i++){
      const a=i*2.4,d=(i%4)/4*f.r;add('cone',f.x+Math.cos(a)*d,.45,f.z+Math.sin(a)*d,.24,.5,.20,'#8a9c60',.5, a,.35);
    }
    add('sphere',0,.18,-6,1.5,.45,1.2,'#657d77');add('sphere',0,.70,-6,.35,.35,.35,s.stage?'#828779':'#afe1cb');
    add('box',11,1,-15,.08,1,.08,'#66553c');add('box',11,1.70,-15,.24,.18,.18,'#424d3e');add('sphere',11,1.70,-14.8,.09,.09,.04,'#bcc9a4');
    add('sphere',0,1,23,3,1.8,1.3,'#74806c');add('box',0,1.15,21.8,.9,1.15,.09,'#2c3e34');
    if(mode==='play'){
      const g=gary(s.time);const root=T(g.x,0,g.z,.65,.65,.65,0,g.heading);
      r.add('sphere',M(root,T(0,1.2,0,.45,.65,.30)),'#b39b6a');r.add('sphere',M(root,T(0,2,0,.27,.30,.27)),'#c3a381');
      r.add('box',M(root,T(0,2.23,.06,.34,.07,.32)),'#d8b268');
      for(const x of [-.19,.19])r.add('box',M(root,T(x,.4,0,.13,.4,.15)),'#465a4d');
      for(let i=0;i<=24;i++){
        const angle=g.heading-.65+i/24*1.3;add('sphere',g.x+Math.sin(angle)*11,.04,g.z+Math.cos(angle)*11,.11,.03,.11,'#c8b77e');
      }
    }
  }
  if(mode==='play'&&s.stage<5){const p=target(s);add('sphere',p.x,2.6+Math.sin(time*2)*.18,p.z,.18,.18,.18,'#f1d48d');add('cone',p.x,2.1,p.z,.12,.20,.12,'#f1d48d',Math.PI)}
}
