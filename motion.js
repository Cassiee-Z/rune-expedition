const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
// Local sprite coordinates; the torso stays fixed. Blade angle is measured from up.
export function swordPose(action,aim={x:1,y:0},facing=1){
 const rest={x:27,y:-28,angle:.25};if(!action||action.kind==='bash')return rest;
 const theta=Math.atan2(aim.y,aim.x*facing),base=theta+Math.PI/2;
 const p=Math.min(1,Math.max(0,action.elapsed/action.duration)),impact=action.impact/action.duration;
 const thrust=action.kind==='counter'||action.index===2,reverse=action.index===1;
 const reach={x:17+Math.cos(theta)*25,y:-43+Math.sin(theta)*20,angle:base};
 const wind=thrust?{x:17,y:-42,angle:base}:{x:17+Math.cos(theta+(reverse?1.2:-1.2))*19,y:-43+Math.sin(theta+(reverse?1.2:-1.2))*20,angle:base+(reverse?1.65:-1.65)};
 const follow=thrust?{...reach,x:reach.x+Math.cos(theta)*4,y:reach.y+Math.sin(theta)*4}:{x:17+Math.cos(theta+(reverse?-1.25:1.25))*23,y:-43+Math.sin(theta+(reverse?-1.25:1.25))*20,angle:base+(reverse?-1.35:1.35)};
 const keys=[[0,rest],[impact*.60,wind],[impact,reach],[Math.min(.82,impact+.19),follow],[1,rest]];
 for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){const [t0,a]=keys[i-1],[t1,b]=keys[i],q=smooth((p-t0)/(t1-t0));return {x:mix(a.x,b.x,q),y:mix(a.y,b.y,q),angle:mix(a.angle,b.angle,q)};}
 return rest;
}
export function armElbow(hand){
 const shoulder={x:16,y:-48},upper=21,lower=21,dx=hand.x-shoulder.x,dy=hand.y-shoulder.y;
 const d=Math.min(upper+lower-.001,Math.max(.001,Math.hypot(dx,dy))),a=Math.atan2(dy,dx),bend=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d))));
 return {x:shoulder.x+Math.cos(a+bend)*upper,y:shoulder.y+Math.sin(a+bend)*upper};
}
