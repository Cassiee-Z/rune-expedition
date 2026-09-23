import assert from 'node:assert/strict';
import {Expedition} from '../engine.js';
const rng=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function simulate(build,seed,defend){const g=new Expedition(rng(seed));g.start();g.setAuto(true);let ticks=0,lastDecision=-1;
 while(g.mode!=='result'&&ticks++<600*60){
  if(g.mode==='loot')g.choose(build[g.stage]);
  if(g.mode==='battle'&&defend&&g.time-lastDecision>.10){lastDecision=g.time;const h=g.hero,live=g.enemies.filter(e=>!e.dying);const quake=live.find(e=>e.telegraph?.type==='quake');
   if(quake){const a=quake.telegraph;if(!h.moveTarget&&Math.hypot(h.x-a.x,h.y-a.y)<a.r+8){const points=[{x:50,y:275},{x:390,y:275},{x:50,y:g.bounds.bottom},{x:390,y:g.bounds.bottom}].filter(p=>Math.hypot(p.x-a.x,p.y-a.y)>a.r+15).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y));if(points[0])g.moveTo(points[0].x,points[0].y);}if(a.duration-a.elapsed<.20&&Math.hypot(h.x-a.x,h.y-a.y)<a.r)g.skill('dodge');}
   else if(h.holdPosition&&!h.dodge)g.requestAttack();
   const threats=live.filter(e=>e.telegraph?.type==='melee'&&Math.hypot(e.x-h.x,e.y-h.y)<e.telegraph.r).sort((a,b)=>(a.telegraph.duration-a.telegraph.elapsed)-(b.telegraph.duration-b.telegraph.elapsed));
   const t=threats[0],remaining=t?t.telegraph.duration-t.telegraph.elapsed:99;
   if(remaining<.5){if(h.action&&h.action.elapsed>h.action.impact*.7&&remaining<.14)g.skill('dodge');else g.setGuard(true);}
   else if(h.counter>0){g.requestAttack();}else if(h.guarding||h.guardRequested){g.setGuard(false);}
   if(h.stamina>65&&live.some(e=>Math.hypot(e.x-h.x,e.y-h.y)<120))g.skill('burst');
  }
  g.update(1/60);
 }
 return {won:g.stats.won,stage:g.stage+1,seconds:Math.round(g.time),hp:Math.round(g.hero.hp),parries:g.stats.perfectGuards,counters:g.stats.counters,moves:g.stats.moves,damage:g.stats.damage};
}
const builds=[];
for(const a of ['ember','storm','iron'])for(const b of ['furnace','thunder','aegis']){
 const runs=[1,7,42,99,2026].map(seed=>simulate([a,b],seed,true));
 assert.ok(runs.every(r=>r.won),a+'/'+b+' must be winnable with active defense');
 builds.push({build:a+'/'+b,wins:runs.filter(r=>r.won).length,averageSeconds:Math.round(runs.reduce((n,r)=>n+r.seconds,0)/runs.length)});
}
const unattended=simulate(['ember','furnace'],42,false);assert.equal(unattended.won,false,'Unattended auto attacks should not trivialize the boss');
console.table(builds);console.log('45 defensive-play simulations passed; unattended auto lost at the boss.');
