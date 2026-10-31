// Arena identity belongs to navigation and the studio. Team colours remain
// stable in combat, so changing map never changes the meaning of an operator.
export const MAP_THEMES={
 sahra:{accent:"#e4c38d",panelHigh:"#30382f",panelLow:"#19282b",studio:["#2d3632","#596357","#283d3d"],exposure:1.02},
 caldera:{accent:'#efaa81',panelHigh:'#202d31',panelLow:'#101c23',studio:['#202c32','#354b4c','#182b31'],exposure:1.02},
 forge:{accent:'#dfba83',panelHigh:'#2a2e2d',panelLow:'#131e25',studio:['#262f32','#45514d','#1c2d31'],exposure:1.0}
};
export function applyMapTheme(root,key){
 const theme=MAP_THEMES[key]||MAP_THEMES.caldera;
 for(const [name,value]of [['--accent',theme.accent],['--panel-high',theme.panelHigh],['--panel-low',theme.panelLow]])root.style.setProperty(name,value);
 return theme;
}
