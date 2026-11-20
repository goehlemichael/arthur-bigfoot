// Shared geometry and interaction points. Coordinates are game metres, not a real facility.
export const BUNKER = Object.freeze({
  ladder: Object.freeze({x:0,z:14}), height:16, climbSeconds:4,
  bounds: Object.freeze({minX:-18,maxX:18,minZ:-15,maxZ:15}),
  stations: Object.freeze([
    {id:'command',name:'Planetary command',x:0,z:-10},
    {id:'universe',name:'Deep-space observatory',x:8,z:-10},
    {id:'security',name:'Forest surveillance',x:-8,z:-10},
    {id:'bench',name:'Propulsion laboratory',x:-11,z:-2},
    {id:'hangar',name:'Prototype hangar',x:10,z:2},
    {id:'tea',name:'Tea and quiet contemplation',x:-10,z:8},
    {id:'grooming',name:'Grooming station',x:-16,z:3}
  ]),
  // Physical furniture footprints, including Arthur's clearance. Interaction points sit in front.
  obstacles: Object.freeze([
    {x:0,z:-13,hx:4.3,hz:1.1}, {x:8,z:-13,hx:3,hz:1.1}, {x:-8,z:-13,hx:3,hz:1.1},
    {x:-11,z:-4.5,hx:3,hz:1.2}, {x:12,z:-2,hx:3,hz:2.5},
    {x:0,z:1,hx:2,hz:2}, {x:-11,z:10.7,hx:2.5,hz:1},
    {x:-16,z:1,hx:1.1,hz:1}, {x:17,z:-10,hx:1,hz:3}
  ])
});
export function bunkerBlocked(x,z){return BUNKER.obstacles.some(o=>Math.abs(x-o.x)<o.hx+.48&&Math.abs(z-o.z)<o.hz+.48)}
export function stationAt(s){
  if(s.area!=='lab'||s.landing||s.climb)return null;
  return BUNKER.stations.find(p=>Math.hypot(p.x-s.x,p.z-s.z)<2.7)||null;
}
