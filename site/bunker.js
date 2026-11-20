// Procedural, offline-safe silo art. All screens are fictional in-world visualisations.
import {transform as T} from './engine.js';
import {BUNKER} from './bunker-layout.js';
import {gary} from './game.js';
const TAU=Math.PI*2;
function painter(r){const add=(kind,x,y,z,sx,sy,sz,c,rx=0,ry=0,rz=0)=>r.add(kind,T(x,y,z,sx,sy,sz,rx,ry,rz),c);add.software=!!r.software;return add}
function ring(add,x,y,z,rx,rz,color,segments=40,vertical=false){
  for(let i=0;i<segments;i++){
    const a=i/segments*TAU;
    add('box',x+Math.cos(a)*rx,y+(vertical?Math.sin(a)*rz:0),z+(vertical?0:Math.sin(a)*rz),.09,.045,.045,color,0,vertical?0:-a,vertical?a+Math.PI/2:0);
  }
}
function screen(add,x,y,z,w,h,tint='#73d8e8'){
  for(const side of [-1,1]){add('box',x+side*(w+.08),y,z,.08,h+.16,.15,'#25393e');add('box',x,y+side*(h+.08),z,w,.08,.15,'#25393e')}
  if(add.software){const nx=Math.ceil(w*3),ny=Math.ceil(h*3);for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)add('box',x-w+(i+.5)*2*w/nx,y-h+(j+.5)*2*h/ny,z+.17,w/nx,h/ny,.04,'#071922')}
  else add('box',x,y,z+.17,w,h,.04,'#071922');
  add('box',x,y+h+.17,z+.18,w,.025,.025,tint);
  add('box',x-w+.22,y-h+.17,z+.24,.09,.035,.025,'#a7e8c8');
  for(let i=0;i<4;i++)add('box',x-w+.6+i*.2,y-h+.17,z+.24,.055,.025,.025,tint);
}
function planet(add,x,y,z,r,time,flat=false){
  const depth=flat?.35:1;
  add('sphere',x,y,z,r,r,r*depth,'#326fa6');
  // Stylised continental clusters rotating around the globe, intentionally not a scientific map.
  for(let i=0;i<70;i++){
    const latitude=Math.sin(i*2.31)*1.25,longitude=i*2.39996+time*.12;
    if(Math.sin(i*1.7)+Math.cos(i*.7)<-.25)continue;
    const c=Math.cos(latitude),a=Math.cos(longitude);
    add('sphere',x+Math.sin(longitude)*c*r*1.015,y+Math.sin(latitude)*r,z+a*c*r*depth*1.015,.19*r,.12*r,.09*r*depth,i%3?'#85bd9c':'#c6d2b4');
  }
  ring(add,x,y,z+r*depth+.04,r*1.13,r*1.13,'#81e2ed',40,true);
  add('sphere',x,y+r*.91,z,.38*r,.12*r,.35*r*depth,'#deeeea');
}
function galaxy(add,x,y,z,time){
  for(let i=0;i<110;i++){
    const arm=i%3,a=i*.26+arm*TAU/3+time*.025,d=.12+(i/110)*2.6;
    add('sphere',x+Math.cos(a)*d,y+Math.sin(a)*d*.60,z+.04*Math.sin(i),.028+(1-i/110)*.035,.028,.025,i%4?'#9aabd9':'#e7d9fd');
  }
  add('sphere',x,y,z+.06,.21,.15,.07,'#f0e7cc');
  for(let i=0;i<20;i++)add('box',x+Math.sin(i*9.7)*2.8,y+Math.cos(i*8.3)*1.9,z,.025,.025,.02,'#8195a6');
}
function orbits(add,x,y,z,time,r=2.2){
  add('sphere',x,y,z,.24,.24,.12,'#f3d491');
  for(let k=1;k<=3;k++){
    const rr=r*k/3;ring(add,x,y,z,rr,rr*.62,'#4b8497',28,true);
    const a=time*(.35/k)+k;add('sphere',x+Math.cos(a)*rr,y+Math.sin(a)*rr*.62,z+.08,.10,.10,.07,['#63ccd4','#a1cda9','#d4a47a'][k-1]);
  }
}
function consoleDesk(add,x,z,w,time){
  add('box',x,1.15,z,w,.18,.85,'#32454a');
  for(const dx of [-w+.25,w-.25])add('box',x+dx,.53,z,.17,.53,.64,'#27373b');
  for(let i=0;i<3;i++){
    const xx=x+(i-1)*w*.62;screen(add,xx,2,z-.25,w*.24,.46);
    for(let j=0;j<4;j++)add('box',xx-.25+j*.17,1.38,z+.32,.055,.025,.07,(i+j+Math.floor(time))%3?'#8ba7a5':'#d8b879');
    for(let j=0;j<4;j++)add('box',xx-.3+j*.2,1.95+.12*Math.sin(j+time),z-.04,.05,.11+.07*Math.sin(time+j),.02,'#6ac8cf');
  }
}
export function drawHatch(r,time){
  const add=painter(r);
  add('sphere',0,.20,22,3,.5,3,'#727b6d');
  add('sphere',0,.58,22,1.55,.10,1.55,'#283f38');
  ring(add,0,.70,22,1.6,1.6,'#a9a77d',32);
  add('box',0,.77,22,.47,.05,.07,'#b7b391');add('box',0,.77,22,.07,.05,.47,'#b7b391');
  for(let i=0;i<12;i++)add('sphere',Math.sin(i*2.4)*2.4,.41,22+Math.cos(i*2.4)*2.4,.63,.23,.45,'#73885e');
  add('box',2.2,.7,22,.12,.5,.12,'#48574a');add('sphere',2.2,1.23,22,.06,.06,.06,'#a1d3b0');
}
export function drawBunker(r,s,time){
  const add=painter(r),low=r.software;
  // A cutaway cylindrical shell keeps the chase camera outside solid foreground walls.
  if(!low)add('box',0,-.32,0,20,.30,18,'#303d41'); // CPU painter uses the small tiles, not an intersecting room-sized triangle.
  for(let x=-18;x<=18;x+=3)for(let z=-15;z<=15;z+=3){
    add('box',x,-.005,z,1.48,.015,1.48,((x+z)/3)%2?'#354348':'#38484c');
  }
  for(let i=0;i<=24;i++){
    const a=-Math.PI/2+i/24*Math.PI,x=Math.sin(a)*21,z=-Math.cos(a)*18;
    add('box',x,6,z,1.48,6,.45,i%2?'#465358':'#4c595c',0,-a);
    add('box',x,6,z+.12,.12,6.3,.40,'#657174',0,-a);
    add('box',x,9.5,z+.60,1.5,.18,.65,'#687473',0,-a);
    add('box',x,10.4,z+1.1,1.5,.04,.05,'#b5a16f',0,-a);
    if(i%3===0){add('box',x,6.8,z+.65,.07,2.1,.07,'#9bdfdc');add('box',x,10,z+1.1,.045,.42,.045,'#b5a16f')}
  }
  // Original service pipes and overhead steelwork, alongside neat modern cable runs.
  for(const x of [-18,18]){
    add('box',x,7,0,.17,.17,15,'#8b795d');
    add('box',x-.4,6.5,0,.06,.06,15,'#75aaa9');
    for(let z=-12;z<=12;z+=6){add('box',x,7,z,.32,.32,.09,'#a49a7a');add('box',x,3,z,.10,3,.10,'#647473')}
  }
  for(const z of [-12,-4,5]){add('box',0,11.6,z,19,.13,.18,'#536266');add('box',0,11.42,z,5,.04,.07,'#c2e4dd')}
  for(const x of [-3.7,3.7])add('box',x,.035,3,.025,.02,10,'#72c9c6');
  for(let i=0;i<12;i++)add('box',-1.1+i*.20,.04,12,.07,.025,.26,i%2?'#bda773':'#202f34',0,-.6);
  // Silo wall numeral 07 in old industrial paint.
  for(const x of [-.8,.1])add('box',x,10.9,-17.4,.07,.44,.02,'#baa77d');
  for(const y of [10.46,11.34])add('box',-.35,y,-17.4,.45,.07,.02,'#baa77d');
  add('box',1,11.34,-17.4,.4,.07,.02,'#baa77d');add('box',1.24,10.9,-17.4,.07,.45,.02,'#baa77d',0,0,-.25);
  // Three large, live scientific displays.
  screen(add,0,6.2,-16.5,4.4,3,'#91e6de');
  if(s.screen===1)orbits(add,0,6.4,-16.22,time,3.5);
  else if(s.screen===2)galaxy(add,0,6.5,-16.22,time);
  else planet(add,0,6.3,-15.8,2.15,time,true);
  screen(add,8.7,6.1,-15.6,3.4,2.45,'#aca2db');galaxy(add,8.7,6.2,-15.38,time);
  screen(add,-8.7,6.1,-15.6,3.4,2.45,'#9bcda8');
  for(let i=-2;i<=2;i++){
    add('box',-8.7+i,6.1,-15.35,.012,1.8,.02,'#355755');
    add('box',-8.7,6.1+i*.7,-15.35,2.8,.012,.02,'#355755');
  }
  for(let i=0;i<20;i++)add('cone',-8.7+Math.sin(i*7)*2.6,6.1+Math.cos(i*4.8)*1.6,-15.28,.10,.13,.03,'#72b49e');
  const g=gary(s.time);add('sphere',-8.7+g.x/12,6.1-g.z/12,-15.15,.10,.10,.04,'#e5b97c');
  ring(add,-8.7,6.1,-15.2,2.1,1.7,'#80beb2',32,true);
  for(const x of [-8,0,8])consoleDesk(add,x,-13,x===0?4:2.7,time);
  // Central projection table: globe, orbital plane and satellite marker.
  add('sphere',0,.45,1,2,.46,2,'#263c43');ring(add,0,.83,1,1.8,1.8,'#82ddda');
  add('sphere',0,1.1,1,.42,.25,.42,'#85d8de');planet(add,0,3.6,1,1.65,time,false);
  ring(add,0,3.4,1,2.6,1.6,'#98c8d6');
  const orbit=time*.45;add('box',Math.cos(orbit)*2.6,3.4,1+Math.sin(orbit)*1.6,.20,.08,.08,'#d9e5e2');
  // Research bench, containment coil, microscope and specimen tubes.
  add('box',-11,1.2,-4.5,2.85,.16,1,'#798988');
  for(const x of [-13.5,-8.5])add('box',x,.58,-4.5,.15,.58,.8,'#4c6165');
  add('sphere',-10.7,2.2,-4.5,.62,.72,.62,s.stage>=4?'#b7e7c1':'#63bbc9');
  ring(add,-10.7,2.2,-4.5,.9,.9,'#aacacb',28,true);
  for(let i=0;i<4;i++){add('box',-13+i*.4,1.83,-4.5,.10,.5,.10,'#639ca4');add('sphere',-13+i*.4,2.36,-4.5,.12,.07,.12,'#d5e0c9')}
  add('box',-8.8,1.53,-4.5,.3,.12,.3,'#bac5b9');add('box',-8.8,1.96,-4.65,.07,.5,.07,'#d4dbd1',0,0,-.25);
  add('box',-8.9,2.4,-4.65,.24,.11,.11,'#5d7f84');
  screen(add,-11,3.4,-5.35,2.4,.65);
  for(let i=0;i<28;i++)add('box',-13.1+i*.15,3.4+Math.sin(i*.5+time*1.5)*.3,-5.1,.045,.06,.02,'#9bddd2');
  // Server racks: status lights pulse slowly, never flash.
  for(let z=-12;z<=-8;z+=2){
    add('box',17,2.5,z,.8,2.5,.8,'#253940');
    for(let i=0;i<9;i++){add('box',17, .5+i*.5,z+.83,.62,.13,.03,'#405258');add('box',17.45,.5+i*.5,z+.89,.05,.035,.02,(i+Math.floor(time/2))%4?'#94cdb4':'#d9ba78')}
  }
  // Advanced prototype in a clean service cradle; a display, not a flyable ship.
  add('box',12,.14,-2,3,.14,2.5,'#566970');
  for(const x of [10,14])add('box',x,1,-2,.16,.85,1.2,'#a6b5ac');
  add('sphere',12,2.1,-2,1.35,.90,2.6,'#b5c6c6');
  add('cone',12,2.1,-4.4,1.12,1.5,1.12,'#d2dad2',Math.PI/2);
  add('box',12,2,-1.4,3.1,.09,.8,'#859fa6',0,.08);
  add('sphere',12,2.7,-2.9,.7,.35,.8,'#497e93');
  for(const x of [11.3,12.7]){add('sphere',x,2,.42,.43,.43,.16,'#72d4d7');ring(add,x,2,.60,.35,.35,'#b8e9de',20,true)}
  add('box',12,.04,1.2,3.3,.02,.04,'#b5a479');
  // Domestic corner: immaculate rug, armchair, books and tea. Civilization, underground.
  add('box',-11,.03,9,4.5,.025,3.4,'#635159');
  for(const x of [-15.3,-6.7])add('box',x,.065,9,.06,.02,3.2,'#ba9f76');
  add('box',-13,.65,10.5,.85,.55,.9,'#557677');add('box',-13,1.5,11.2,.85,.8,.17,'#557677');
  for(const x of [-14,-12])add('box',x,1,10.5,.17,.4,1,'#426363');
  add('box',-9.5,1,10.5,1.15,.12,.65,'#927450');
  for(const x of [-10.4,-8.6])add('box',x,.5,10.5,.07,.5,.55,'#6e614d');
  add('sphere',-9.7,1.5,10.5,.32,.38,.32,'#e7dbbd');add('cone',-10.05,1.55,10.5,.13,.27,.13,'#ded1b0',0,0,.8);
  add('sphere',-8.95,1.28,10.5,.16,.15,.16,'#e7dbbd');
  add('box',-17,2,8, .7,2,2,'#755e47');
  for(let i=0;i<15;i++)add('box',-16.22,.6+(i%3)*1.15,6.5+Math.floor(i/3)*.55,.08,.43,.18,['#718d84','#9a7572','#a99b71'][i%3]);
  add('box',-15,2.7,11.7,.04,2.7,.04,'#a29169');add('cone',-15,5.1,11.7,.65,.5,.65,'#e5d7a7');
  // Mirror and neatly aligned combs, because the fringe is a serious matter.
  add('box',-16,2.8,.3,.9,1.3,.12,'#b4a375');add('box',-16,2.8,.46,.76,1.14,.03,'#88a8b2');
  add('box',-16,1.1,1,1,.12,.7,'#8b7960');
  for(let i=0;i<3;i++)add('box',-16.5+i*.45,1.25,1,.12,.025,.32,'#e0cfaa');
  // Tall entrance shaft; camera-facing concrete is cut away so the ladder stays readable.
  const shaftVisible=s.landing||s.climb||Math.abs(s.x)>3||s.z<6;
  if(shaftVisible)for(const x of [-2.1,2.1])add('box',x,12,15,.24,6,.8,'#65716e');
  if(shaftVisible)for(const x of [-2.1,2.1])add('box',x,18.5,15,.24,.25,1.8,'#6d7770');
  for(const x of [-.85,.85])add('box',x,shaftVisible?9.3:.6,14.75,.055,shaftVisible?9.3:.6,.055,'#c3c1a3');
  for(let y=.35;y<(shaftVisible?18.5:1.2);y+=.50)add('box',0,y,14.75,.85,.045,.045,'#a9afa0');
  for(let y=3;shaftVisible&&y<=18;y+=3){
    add('box',-2, y,14.2,.06,.12,.10,'#ebca8d');add('box',2,y,14.2,.06,.12,.10,'#ebca8d');
  }
  // The upper landing sits behind the ladder, not between the camera and the room.
  if(s.landing)add('box',0,15.85,14,1.9,.15,1.8,'#62736e');
  if(shaftVisible)for(const x of [-1.9,1.9]){add('box',x,16.6,16.6,.04,.65,1,'#b9b598');add('box',x,17.25,16.6,.05,.05,1,'#b9b598')}
}
