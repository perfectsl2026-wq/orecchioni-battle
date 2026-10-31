// Shared vehicle envelope. The solid lower body (0.195-0.745 m) is a map wall of
// kind 2; these boxes add the greenhouse, the underbody and the four wheels. The
// greenhouse is the trapezoid of the windscreen and rear-window slopes, followed by
// six stacked boxes centred on those slopes (within 3 cm), and the rendered model in
// desertCar is built from the same numbers, so a shot at a car meets what is seen.
export const VEHICLE_STEPS=6;
export function vehicleGreenhouse(w,d){
 const zc=-.12,L=d*.45;
 return {zc,L,width:w*.85,base:.745,top:1.31,zf:zc-L/2-.2,zt:zc-L/2+.1,zr:zc+L/2-.05,zb:zc+L/2+.15};
}
export function vehicleSolids(x,z,w,d,y){
 const gh=vehicleGreenhouse(w,d),boxes=[],step=(gh.top-gh.base)/VEHICLE_STEPS;
 for(let i=0;i<VEHICLE_STEPS;i++){
  const y0=gh.base+i*step,t=(i+.5)/VEHICLE_STEPS,front=gh.zf+(gh.zt-gh.zf)*t,rear=gh.zb+(gh.zr-gh.zb)*t;
  boxes.push({x,y:y+y0+step/2,z:z+(front+rear)/2,w:gh.width,h:step,d:rear-front,render:false});
 }
 boxes.push({x,y:y+.24,z,w:w*.9,h:.2,d:d*.9,render:false});
 return {boxes,cylinders:[-1,1].flatMap(side=>[-d*.3,d*.3].map(dz=>({x:x+side*w*.46,y:y+.31,z:z+dz,radius:.3,length:.18})))};
}
