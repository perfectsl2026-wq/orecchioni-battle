export const SIMULATION_HZ=60,STEP=1/SIMULATION_HZ;
export class SimulationClock{
 constructor(time=Date.now()){this.reset(time);}
 reset(time=Date.now()){this.time=time;this.accumulator=0;}
 advance(elapsed,step){
  this.accumulator+=Math.max(0,Math.min(elapsed,.12));let count=0;
  while(this.accumulator>=STEP-1e-9&&count<8){this.time+=STEP*1000;step(STEP,this.time);this.accumulator-=STEP;count++;}
  return count;
 }
 pause(){this.accumulator=0;}
 // Guest: keeps this label on host time without touching the fixed steps.
 slew(target){const lead=target-this.time;this.time+=Math.abs(lead)>1500?lead:lead*.1;}
}
