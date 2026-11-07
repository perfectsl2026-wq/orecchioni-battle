// V42 smoke throw on keyboard and mouse. Z takes the canister out and pulls the pin (PIN_MS);
// the canister leaves the hand on the release of a mouse button: left = full overhand throw,
// right = short underhand lob, both held = medium. A release during the pin pull waits for it.
// A jump pressed while a button is held throws on the jump's own frame, so a jump throw is the
// same every time. Z again puts the canister away. Touch keeps its one-tap full throw.
export const PIN_MS=420,THROW_MS=330,POWER={full:1,mid:.72,lob:.42};
const bit=button=>button===2?2:1,powerOf=held=>held===3?POWER.mid:held&2?POWER.lob:POWER.full;
export class SmokeThrow{
 constructor(){this.reset();}
 reset(){this.phase='idle';this.at=0;this.held=0;this.queued=0;this.power=1;this.lob=false;}
 active(){return this.phase!=='idle';}
 arm(now){if(this.phase==='pin'||this.phase==='ready'){this.reset();return false;}if(this.phase!=='idle')return false;this.phase='pin';this.at=now;return true;}
 // Mouse buttons belong to the canister while it is out.
 press(button){if(this.phase!=='pin'&&this.phase!=='ready')return false;if(button===0||button===2)this.held|=bit(button);return true;}
 release(button,now){if(this.phase!=='pin'&&this.phase!=='ready')return 0;const was=this.held,b=bit(button);if(!(was&b))return 0;this.held&=~b;
  if(this.phase==='pin'){this.queued=powerOf(was);return 0;}return this.fire(powerOf(was),now);}
 fire(power,now){this.phase='throw';this.at=now;this.power=power;this.lob=power<.5;this.held=0;this.queued=0;return power;}
 // Once a frame: a power when the canister leaves the hand now (a queued release or a jump throw), else 0.
 update(now,jumped){
  if(this.phase==='pin'&&now-this.at>=PIN_MS){this.phase='ready';this.at=now;if(this.queued)return this.fire(this.queued,now);}
  if(this.phase==='ready'&&jumped&&this.held)return this.fire(powerOf(this.held),now);
  if(this.phase==='throw'&&now-this.at>=THROW_MS)this.reset();return 0;
 }
 // Viewmodel channels, written into `out`: pin 0–1, throw 0–1, lob, cook (a button held).
 pose(now,out){out.pin=this.phase==='pin'?Math.min(1,(now-this.at)/PIN_MS):1;out.throw=this.phase==='throw'?Math.min(1,(now-this.at)/THROW_MS):0;out.lob=this.lob;out.cook=this.held?1:0;return out;}
}
