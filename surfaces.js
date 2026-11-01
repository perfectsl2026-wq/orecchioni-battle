import {WALLS,ACTIVE_MAP,groundHeight} from './shared.js?v=39.0';
// Footstep surface under a body, from the same shared solids used for movement.
export function footSurface(x,z,y=groundHeight(x,z)){
 if(y-groundHeight(x,z)>.25){for(const w of WALLS)if(Math.abs(x-w[0])<=w[2]/2+.3&&Math.abs(z-w[1])<=w[3]/2+.3&&Math.abs(y-w[4])<.4)return ACTIVE_MAP==='sahra'?([1,3,6].includes(w[5])?'wood':[2,7].includes(w[5])?'metal':'stone'):[1,2].includes(w[5])?'metal':'stone';return 'stone';}
 if(ACTIVE_MAP==='sahra'){if((x<-28&&z>-28&&z<21)||(x>=-30&&x<-5&&z>=-12&&z<-6)||(z<-32&&x>27))return 'tile';if(x>29&&z>-33&&z<23)return 'stone';return 'sand';}
 return 'stone';
}
