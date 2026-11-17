import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seeded } from './physics.js';
/** Shared branch clusters, not collision geometry. No external art requests. */
export function cedarCanopy() {
  const random=seeded(491), pieces=[];
  for(let layer=0;layer<7;layer++) {
    const y=layer*.12, reach=(1-layer/8)*.92;
    for(let branch=0;branch<7;branch++) {
      const angle=branch*Math.PI*2/7+layer*.71;
      for(let k=1;k<=3;k++) {
        const radial=reach*k/3;
        const g=new THREE.ConeGeometry(1,2,5,1);
        g.scale(reach*(.17+random()*.045),.055+reach*.085,reach*.3);
        g.rotateX(.22+random()*.17);g.rotateY(angle);
        g.translate(Math.sin(angle)*radial,y-.11*k/3+random()*.04,Math.cos(angle)*radial);
        const c=new THREE.Color().setHSL(.29+random()*.035,.18+random()*.18,.16+layer*.008+random()*.05,THREE.SRGBColorSpace);
        const rgb=new Float32Array(g.attributes.position.count*3);
        for(let n=0;n<g.attributes.position.count;n++)rgb.set([c.r,c.g,c.b],n*3);
        g.setAttribute('color',new THREE.BufferAttribute(rgb,3));pieces.push(g);
      }
    }
  }
  const merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());return merged;
}
export function fernGeometry() {
  const shape=new THREE.Shape();
  // Paired tapered leaflets give the frond a serrated, readable silhouette.
  shape.moveTo(0,0);shape.lineTo(.012,.8);shape.lineTo(0,.94);shape.lineTo(-.012,.8);shape.closePath();
  for(let i=0;i<9;i++)for(const sign of [-1,1]){
    const y=.08+i*.085,w=.19*(1-i/10),tip=y+.1;
    shape.moveTo(0,y);shape.quadraticCurveTo(sign*w*.4,y-.02,sign*w,y+.035);
    shape.quadraticCurveTo(sign*w*.72,tip,0,y+.055);shape.closePath();
  }
  const g=new THREE.ShapeGeometry(shape,3);g.rotateX(-.55);return g;
}
