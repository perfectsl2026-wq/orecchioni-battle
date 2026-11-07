// V45 player emblems: small original marks shown before the name in the kill feed and the scoreboard.
// Unlocked by career level (1000 XP a level). Cosmetic only; old clients ignore the field.
export const EMBLEMS=[
 {id:'punta',name:'PUNTA',level:1,path:'M8 1.5l5 12-5-3-5 3z'},
 {id:'scudo',name:'SCUDO',level:3,path:'M8 1.5l5.5 2v4.2c0 3.2-2.3 5.6-5.5 6.8-3.2-1.2-5.5-3.6-5.5-6.8V3.5zM8 5l-3 2.2V9L8 7l3 2V7.2z'},
 {id:'ala',name:'ALA',level:5,path:'M1.5 9.5c3-4.6 7.3-7 13-7.5-1.4 1.6-2.7 3-4 4.2 1.3.1 2.4.1 3.3 0-1.6 1.7-3.4 2.8-5.4 3.3 1 .4 1.9.6 2.7.6-2.6 2.2-5.8 2.7-9.6 1.4z'},
 {id:'faro',name:'FARO',level:8,path:'M8 1.5l1.6 4.9L14.5 8l-4.9 1.6L8 14.5 6.4 9.6 1.5 8l4.9-1.6z'},
 {id:'cresta',name:'CRESTA',level:12,path:'M2 13.5l2-9 4 4 4-4 2 9zM5.5 11.5h5v-1h-5z'},
 {id:'cometa',name:'COMETA',level:20,path:'M10.5 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM1.5 14.5l6-6.5 1.2 1.2zM1.5 10.5l5-4 .8 1zM5.5 14.5l3.8-5 .9.8z'}
];
export const emblemFor=id=>EMBLEMS.find(e=>e.id===id)||null;
export const cleanEmblem=v=>emblemFor(v)?v:'';
export const emblemUnlocked=(id,level)=>{const e=emblemFor(id);return !!e&&level>=e.level;};
export function emblemSVG(id,cls='emblem'){const e=emblemFor(id);return e?'<svg class="'+cls+'" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="'+e.path+'"/></svg>':'';}
