import assert from 'node:assert/strict';
import {Expedition} from '../engine.js';
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function simulate(build,seed=42,skills=true){
  const g=new Expedition(rng(seed));g.start();let ticks=0;
  while(g.mode!=='result'&&ticks++<60*600){
    if(g.mode==='loot')g.choose(build[g.stage]);
    if(skills&&g.mode==='battle'){
      const boss=g.enemies.find(e=>e.kind==='boss'&&!e.dying);
      if(g.enemies.some(e=>!e.dying))g.skill('burst');
      if(boss?boss.telegraph>0:g.enemies.some(e=>!e.dying&&Math.hypot(e.x-g.hero.x,e.y-g.hero.y)<120))g.skill('guard');
    }
    g.update(1/60);
  }
  assert.equal(g.mode,'result','Run must end within ten minutes');
  return g;
}
const results=[];
for(const first of ['ember','storm','iron'])for(const second of ['furnace','thunder','aegis']){
  const runs=[1,7,42,99,2026].map(seed=>simulate([first,second],seed));
  results.push({build:`${first}/${second}`,wins:runs.filter(g=>g.stats.won).length,seconds:Math.round(runs.reduce((n,g)=>n+g.time,0)/runs.length),hp:Math.round(runs.reduce((n,g)=>n+g.hero.hp,0)/runs.length)});
}
console.table(results);
assert.ok(results.every(r=>r.wins===5),'All nine builds should support a skilled win across five seeds');
// Pause must freeze combat and block input.
const paused=new Expedition(rng(1));paused.start();paused.update(.04);paused.pause();const frozen=JSON.stringify(paused.hero),time=paused.time;
assert.equal(paused.skill('burst'),false);for(let i=0;i<100;i++)paused.update(.04);assert.equal(paused.time,time);assert.equal(JSON.stringify(paused.hero),frozen);paused.resume();assert.equal(paused.mode,'battle');
// Damage and shield statistics must match actual absorption.
const shield=new Expedition(rng(1));shield.start();assert.equal(shield.skill('guard'),true);assert.equal(shield.skill('guard'),false);shield.hurtHero(70,true);assert.equal(shield.hero.hp,240);assert.equal(shield.stats.blocked,70);assert.equal(shield.stats.perfectGuards,1);
// Unavailable equipment cannot change stage or hero.
assert.equal(shield.choose('ember'),false);shield.mode='loot';shield.choices=['ember','storm','iron'];assert.equal(shield.choose('aegis'),false);assert.equal(shield.choose('iron'),true);assert.equal(shield.stage,1);assert.equal(shield.hero.maxHp,300);
// Finishing is idempotent, and later updates cannot mutate the result.
const death=new Expedition(rng(1));death.start();let finishes=0;death.on(e=>{if(e.type==='result')finishes++;});death.hero.hp=1;const foe=death.spawn('wraith');foe.x=220;foe.y=death.hero.y;foe.timer=0;const foe2=death.spawn('wraith');foe2.x=220;foe2.y=death.hero.y;foe2.timer=0;death.update(.04);assert.equal(death.mode,'result');assert.equal(finishes,1);const final=JSON.stringify(death.stats);death.update(.04);death.finish(false);assert.equal(JSON.stringify(death.stats),final);assert.equal(finishes,1);
// A win must clear all stages, contain both choices, and have chronological telemetry.
const winner=simulate(['ember','aegis']);assert.ok(winner.stats.won,'Skilled play should win');assert.equal(winner.stats.stages.length,3);assert.deepEqual(winner.stats.items,['ember','aegis']);assert.ok(winner.stats.events.every((e,i,a)=>i===0||e.at>=a[i-1].at));
console.log('All engine invariants passed.');
