// Small self-contained WebGL2 renderer. No external runtime or CDN dependencies.
export const identity = () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a,b) {
  const o=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];
  return o;
}
export function transform(x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
  const c=Math.cos,s=Math.sin;
  const X=new Float32Array([1,0,0,0,0,c(rx),s(rx),0,0,-s(rx),c(rx),0,0,0,0,1]);
  const Y=new Float32Array([c(ry),0,-s(ry),0,0,1,0,0,s(ry),0,c(ry),0,0,0,0,1]);
  const Z=new Float32Array([c(rz),s(rz),0,0,-s(rz),c(rz),0,0,0,0,1,0,0,0,0,1]);
  const t=multiply(multiply(Y,X),Z);
  for(let r=0;r<3;r++){t[r]*=sx;t[r+4]*=sy;t[r+8]*=sz;}t[12]=x;t[13]=y;t[14]=z;return t;
}
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const unit=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function view(eye,at){
  const z=unit(eye.map((v,i)=>v-at[i])),x=unit(cross([0,1,0],z)),y=cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
export function color(hex){const v=parseInt(hex.replace('#',''),16);return [(v>>16)/255,((v>>8)&255)/255,(v&255)/255]}
function geometry(kind,low=false){
  const out=[];const add=(p,n)=>out.push(...p,...n);const tri=(a,b,c,n)=>{if(n){add(a,n);add(b,n);add(c,n)}else{add(a,a);add(b,b);add(c,c)}};
  if(kind==='box'){
    for(const [n,u,v] of [[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]]){
      const p=(a,b)=>n.map((w,i)=>w+u[i]*a+v[i]*b);tri(p(-1,-1),p(1,-1),p(1,1),n);tri(p(-1,-1),p(1,1),p(-1,1),n);
    }
  }else if(kind==='cone'){
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5,b=(i+1)*Math.PI/5,p=[Math.cos(a),-1,Math.sin(a)],q=[Math.cos(b),-1,Math.sin(b)];
      tri(p,[0,1,0],q,unit([Math.cos((a+b)/2),.5,Math.sin((a+b)/2)]));tri([0,-1,0],p,q,[0,-1,0]);
    }
  }else{
    const point=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];
    const rings=low?4:8,sides=low?8:12;
    for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){
      const a=j*Math.PI/rings,b=(j+1)*Math.PI/rings,c=i*Math.PI*2/sides,d=(i+1)*Math.PI*2/sides;
      tri(point(a,c),point(b,c),point(b,d));tri(point(a,c),point(b,d),point(a,d));
    }
  }
  return new Float32Array(out);
}
const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 p; layout(location=1) in vec3 n;
layout(location=2) in mat4 model; layout(location=6) in vec3 tint;
uniform mat4 vp; uniform vec3 eye; out vec3 col; out float dist;
void main(){vec4 w=model*vec4(p,1.);vec3 normal=normalize(transpose(inverse(mat3(model)))*n);
float diffuse=max(dot(normal,normalize(vec3(-.45,.85,.55))),0.);
col=tint*(.43+.65*diffuse)+vec3(.04,.07,.05)*max(normal.y,0.);dist=length(w.xyz-eye);gl_Position=vp*w;}`;
const fragment=`#version 300 es
precision highp float; in vec3 col;in float dist;uniform vec3 fog;out vec4 result;
void main(){float f=1.-exp(-.0006*dist*dist);result=vec4(mix(col,fog,clamp(f,0.,.9)),1.);}`;
export class Renderer{
  constructor(canvas){
    this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:false,antialias:true});
    if(!gl)return new SoftwareRenderer(canvas);this.gl=gl;
    const compile=(type,source)=>{const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh};
    const pr=gl.createProgram();gl.attachShader(pr,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(pr,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));
    this.program=pr;this.loc={};for(const k of ['vp','eye','fog'])this.loc[k]=gl.getUniformLocation(pr,k);
    this.meshes={};this.groups={sphere:[],box:[],cone:[]};
    for(const kind of Object.keys(this.groups)){
      const vertices=geometry(kind),vao=gl.createVertexArray();gl.bindVertexArray(vao);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
      for(let i=0;i<2;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,24,i*12)}
      const instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,instances);
      for(let i=0;i<4;i++){gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,76,i*16);gl.vertexAttribDivisor(2+i,1)}
      gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,3,gl.FLOAT,false,76,64);gl.vertexAttribDivisor(6,1);
      this.meshes[kind]={vao,instances,count:vertices.length/6};
    }
    gl.enable(gl.DEPTH_TEST);
  }
  begin(eye,at,background='#243d36'){
    const gl=this.gl,c=this.canvas,dpr=Math.min(globalThis.devicePixelRatio||1,1.5),w=Math.round(c.clientWidth*dpr),h=Math.round(c.clientHeight*dpr);
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;}gl.viewport(0,0,w,h);
    const fog=color(background);gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
    const f=1/Math.tan(Math.PI/7),near=.1,far=160,projection=new Float32Array([f/(w/h),0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
    gl.uniformMatrix4fv(this.loc.vp,false,multiply(projection,view(eye,at)));gl.uniform3fv(this.loc.eye,eye);gl.uniform3fv(this.loc.fog,fog);
    for(const group of Object.values(this.groups))group.length=0;
  }
  add(kind,matrix,tint){this.groups[kind].push(...matrix,...(Array.isArray(tint)?tint:color(tint)))}
  draw(){const gl=this.gl;for(const [kind,items]of Object.entries(this.groups)){
    if(!items.length)continue;const mesh=this.meshes[kind];gl.bindVertexArray(mesh.vao);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instances);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(items),gl.DYNAMIC_DRAW);gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.count,items.length/19);
  }}
}

// Reduced-detail CPU fallback: useful on devices where WebGL is unavailable.
// Painter sorting has limitations for intersecting geometry; WebGL remains the primary renderer.
class SoftwareRenderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('This browser did not provide a drawing context.');this.software=true;this.meshes={};for(const kind of ['sphere','box','cone'])this.meshes[kind]=geometry(kind,true);this.items=[];}
  begin(eye,at,background='#243d36'){
    this.eye=eye;this.view=view(eye,at);this.fog=color(background);this.items.length=0;
    const c=this.canvas,scale=Math.min(1,900/c.clientWidth,650/c.clientHeight);c.width=Math.max(1,Math.round(c.clientWidth*scale));c.height=Math.max(1,Math.round(c.clientHeight*scale));this.ctx.fillStyle=background;this.ctx.fillRect(0,0,c.width,c.height);
  }
  add(kind,matrix,tint){this.items.push([kind,matrix,Array.isArray(tint)?tint:color(tint)])}
  draw(){
    const triangles=[],w=this.canvas.width,h=this.canvas.height,f=1/Math.tan(Math.PI/7),eye=this.eye;
    const point=(m,x,y,z)=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
    for(const [kind,model,tint]of this.items){
      const data=this.meshes[kind],mv=multiply(this.view,model);
      const normalScale=[model[0]**2+model[1]**2+model[2]**2,model[4]**2+model[5]**2+model[6]**2,model[8]**2+model[9]**2+model[10]**2];
      for(let k=0;k<data.length;k+=18){
        const pts=[],world=[],normal=[0,0,0];let valid=true,depth=0;
        for(let j=0;j<3;j++){
          const i=k+j*6,p=point(mv,data[i],data[i+1],data[i+2]);if(p[2]>=-.1){valid=false;break}
          depth-=p[2]/3;pts.push([w/2+p[0]*f/-p[2]*h/2,h/2-p[1]*f/-p[2]*h/2]);world.push(point(model,data[i],data[i+1],data[i+2]));
          const nx=data[i+3]/normalScale[0],ny=data[i+4]/normalScale[1],nz=data[i+5]/normalScale[2];normal[0]+=model[0]*nx+model[4]*ny+model[8]*nz;normal[1]+=model[1]*nx+model[5]*ny+model[9]*nz;normal[2]+=model[2]*nx+model[6]*ny+model[10]*nz;
        }
        if(!valid||pts.every(p=>p[0]<0)||pts.every(p=>p[0]>w)||pts.every(p=>p[1]<0)||pts.every(p=>p[1]>h))continue;
        const n=unit(normal),p=world[0];if(dot(n,eye.map((v,i)=>v-p[i]))<0)continue;
        const diffuse=Math.max(dot(n,[-.398,.752,.487]),0),fog=Math.min(.9,1-Math.exp(-.0006*depth*depth));
        const rgb=tint.map((v,i)=>Math.round(Math.min(1,(v*(.43+.65*diffuse)+[.04,.07,.05][i]*Math.max(n[1],0))*(1-fog)+this.fog[i]*fog)*255));
        triangles.push({pts,depth,fill:'rgb('+rgb.join(',')+')'});
      }
    }
    triangles.sort((a,b)=>b.depth-a.depth);const ctx=this.ctx;
    for(const t of triangles){ctx.fillStyle=t.fill;ctx.beginPath();ctx.moveTo(...t.pts[0]);ctx.lineTo(...t.pts[1]);ctx.lineTo(...t.pts[2]);ctx.closePath();ctx.fill();}
  }
}
