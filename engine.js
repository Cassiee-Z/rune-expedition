export const ITEMS={
 ember:{icon:'sword',color:'#df9b6c',name:['赤焰长刃','Emberblade'],tag:['灼烧剑技','BURNING EDGE'],desc:['攻击 +5；剑击命中附加灼烧。','+5 attack. Sword hits ignite enemies.']},
 storm:{icon:'bolt',color:'#a6cee0',name:['疾风剑铭','Gale Etching'],tag:['迅捷连招','SWIFT COMBOS'],desc:['剑击速度 +20%；暴击率 +15%。','20% faster sword combos. +15% critical chance.']},
 iron:{icon:'shield',color:'#bdc797',name:['暮铁誓盾','Duskiron Oath'],tag:['稳固防守','STEADFAST GUARD'],desc:['生命上限 +60；格挡耐力消耗降低 30%。','+60 max HP. Blocking costs 30% less stamina.']},
 furnace:{icon:'flame',color:'#df9b6c',name:['余烬之心','Cinder Heart'],tag:['终结强化','FINISHER BUILD'],desc:['第三段刺击伤害 +45%；符文爆发伤害 +50%。','Third-hit thrust +45% damage. Rune Burst +50% damage.']},
 thunder:{icon:'bolt',color:'#a6cee0',name:['雷鸣符石','Thunder Sigil'],tag:['连招闪电','CHAIN LIGHTNING'],desc:['第三段剑击触发连锁闪电；暴击率 +10%。','Third combo hit chains lightning. +10% critical chance.']},
 aegis:{icon:'shield',color:'#bdc797',name:['不屈圣印','Unbroken Seal'],tag:['格挡反击','PARRY & RIPOSTE'],desc:['完美格挡窗口增加；格挡成功回复 12 生命。','Longer perfect-parry window. Perfect parries heal 12 HP.']}
};
export const STAGES=[
 {name:['旧城门','The Fallen Gate'],subtitle:['CHAPTER I','CHAPTER I'],waves:[['wraith','wraith'],['wraith','caster','wraith'],['brute','wraith','caster']]},
 {name:['灰烬回廊','The Ashen Hall'],subtitle:['CHAPTER II','CHAPTER II'],waves:[['wraith','caster','wraith'],['brute','caster','wraith'],['brute','caster','wraith','caster']]},
 {name:['王座之下','Beneath the Throne'],subtitle:['FINAL CHAPTER','FINAL CHAPTER'],waves:[['boss']]}
];
export const COMBO=[{duration:.54,impact:.23,power:1,range:83,arc:1.65},{duration:.58,impact:.26,power:1.15,range:86,arc:1.8},{duration:.76,impact:.33,power:1.9,range:112,arc:.65}];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function direction(a,b){const d=distance(a,b)||1;return {x:(b.x-a.x)/d,y:(b.y-a.y)/d};}
export class Expedition{
 constructor(random=Math.random){this.random=random;this.listeners=[];this.mode='home';this.visualTime=0;this.time=0;this.enemies=[];this.effects=[];this.texts=[];this.projectiles=[];this.stats=null;this.id=0;this.shake=0;this.flash=0;this.hitStop=0;this.bounds={left:48,right:392,top:270,bottom:480};this.hero=this.newHero();}
 newHero(){return {x:220,y:420,hp:260,maxHp:260,attack:23,crit:.12,speed:1,items:[],auto:false,aim:{x:1,y:0},facing:1,walk:false,hurt:0,action:null,combo:0,comboTime:0,queued:false,pendingAttack:false,targetId:null,moveTarget:null,holdPosition:false,input:{x:0,y:0},lastMove:{x:0,y:1},guarding:false,guardRequested:false,guardAge:0,guardParried:false,nextParry:0,guardLock:0,parryEnabled:false,stamina:100,staminaDelay:0,counter:0,dodge:null,dodgeCd:0,invulnerable:0,burstCd:0,bashCd:0};}
 on(fn){this.listeners.push(fn);}
 emit(type,data={}){for(const fn of this.listeners)fn({type,...data});}
 log(event,data={}){if(this.stats)this.stats.events.push({event,at:+this.time.toFixed(2),...data});}
 start(){this.hero=this.newHero();this.enemies=[];this.effects=[];this.texts=[];this.projectiles=[];this.time=0;this.stage=0;this.wave=0;this.id=0;this.nextWave=2;this.stageTime=0;this.hitStop=0;this.stats={version:2,startedAt:new Date().toISOString(),time:0,damage:0,received:0,blocked:0,kills:0,crits:0,burst:0,guard:0,perfectGuards:0,attacks:0,finishers:0,counters:0,bashes:0,dodges:0,evades:0,moves:0,modeChanges:0,coins:0,items:[],events:[],stages:[]};this.mode='battle';this.log('run_start');this.emit('stage',{stage:0});}
 resetInput(){const h=this.hero;h.guardRequested=false;h.guarding=false;h.queued=false;h.input={x:0,y:0};}
 pause(){if(this.mode==='battle'){this.resetInput();this.mode='paused';this.emit('pause');}}
 resume(){if(this.mode==='paused'){this.mode='battle';this.emit('resume');}}
 home(){this.resetInput();this.mode='home';this.enemies=[];this.effects=[];this.projectiles=[];this.texts=[];this.hero=this.newHero();this.emit('home');}
 setBounds(bottom){this.bounds.bottom=clamp(bottom,365,510);if(this.hero)this.confine(this.hero);}
 confine(actor){actor.x=clamp(actor.x,this.bounds.left,this.bounds.right);actor.y=clamp(actor.y,this.bounds.top,this.bounds.bottom);}
 nearest(){const living=this.enemies.filter(e=>!e.dying);return living.reduce((a,e)=>!a||distance(e,this.hero)<distance(a,this.hero)?e:a,null);}
 target(){return this.enemies.find(e=>e.id===this.hero.targetId&&!e.dying)||this.nearest();}
 face(target){if(!target)return;const h=this.hero;h.aim=direction(h,target);if(Math.abs(h.aim.x)>.08)h.facing=h.aim.x<0?-1:1;}
 setAuto(on){if(!['battle','paused'].includes(this.mode))return false;const h=this.hero;h.auto=!!on;h.queued=false;h.pendingAttack=false;this.stats.modeChanges++;this.log('mode_changed',{auto:h.auto});this.emit('controlMode',{auto:h.auto});return true;}
 moveTo(x,y){if(this.mode!=='battle')return false;const h=this.hero;h.moveTarget={x:clamp(x,this.bounds.left,this.bounds.right),y:clamp(y,this.bounds.top,this.bounds.bottom)};h.holdPosition=true;h.pendingAttack=false;h.queued=false;h.lastMove=direction(h,h.moveTarget);this.stats.moves++;this.log('move_command',{x:Math.round(h.moveTarget.x),y:Math.round(h.moveTarget.y)});this.emit('move');return true;}
 setMoveInput(x,y){if(this.mode!=='battle')return;const h=this.hero,n=Math.hypot(x,y);h.input=n?{x:x/n,y:y/n}:{x:0,y:0};if(n){h.moveTarget=null;h.holdPosition=true;h.pendingAttack=false;h.queued=false;h.lastMove={...h.input};}}
 selectTarget(id){if(this.mode!=='battle')return false;const e=this.enemies.find(e=>e.id===id&&!e.dying);if(!e)return false;const h=this.hero;h.targetId=id;h.moveTarget=null;h.holdPosition=false;if(!h.action)this.face(e);this.emit('target',{id});return true;}
 setGuard(on){const h=this.hero;if(!on){h.guardRequested=false;h.guarding=false;return true;}if(this.mode!=='battle'||h.guardLock>0||h.stamina<8||h.dodge)return false;h.guardRequested=true;h.queued=false;h.pendingAttack=false;if(h.action&&h.action.elapsed<h.action.impact*.7)h.action=null;if(!h.action)this.raiseGuard();return true;}
 raiseGuard(){const h=this.hero;if(h.guarding||h.guardLock>0||h.stamina<8)return;const threat=this.enemies.filter(e=>!e.dying&&e.telegraph&&e.telegraph.type!=='quake').sort((a,b)=>(a.telegraph.duration-a.telegraph.elapsed)-(b.telegraph.duration-b.telegraph.elapsed))[0];this.face(threat||this.target());h.guarding=true;h.guardAge=0;h.guardParried=false;h.parryEnabled=this.time>=h.nextParry;h.nextParry=this.time+.8;this.stats.guard++;this.emit('guard');}
 requestAttack(){if(this.mode!=='battle')return false;const h=this.hero;if(h.dodge||h.guardLock>0)return false;if(h.action){h.queued=true;return true;}if(h.guarding&&h.counter<=0)return this.beginAction('bash');h.guardRequested=false;h.guarding=false;h.moveTarget=null;h.holdPosition=false;const e=this.target();if(e&&distance(h,e)>78){h.pendingAttack=true;return true;}return this.beginAction(h.counter>0?'counter':'sword');}
 beginAction(kind='sword'){
  const h=this.hero;if(h.action||h.dodge||h.guardLock>0)return false;if(kind==='bash'&&(h.stamina<20||h.bashCd>0))return false;
  this.face(this.target());let index=h.comboTime>0?h.combo:0;if(kind==='counter')index=2;
  const cfg=kind==='bash'?{duration:.5,impact:.23,power:.7,range:77,arc:1.2}:COMBO[index];
  if(kind==='bash'){h.stamina-=20;h.bashCd=1.2;h.staminaDelay=.6;this.stats.bashes++;}if(kind==='counter'){h.counter=0;this.stats.counters++;}
  h.action={kind,index,elapsed:0,duration:cfg.duration/h.speed,impact:cfg.impact/h.speed,power:kind==='counter'?3.2:cfg.power,range:cfg.range,arc:cfg.arc,aim:{...h.aim},hit:false};
  h.pendingAttack=false;h.queued=false;h.guarding=false;h.walk=false;h.comboTime=0;this.stats.attacks++;if(kind==='sword'&&index===2)this.stats.finishers++;
  this.log('attack_started',{kind,combo:index+1});this.emit('swing',{kind,index});return true;
 }
 impact(action){
  const h=this.hero;let hit=false;
  for(const e of this.enemies.filter(e=>!e.dying)){
   const d=distance(h,e),dir=direction(h,e),dot=dir.x*action.aim.x+dir.y*action.aim.y;if(d>action.range+(e.kind==='boss'?14:0)||dot<Math.cos(action.arc))continue;
   const crit=this.random()<h.crit;if(crit)this.stats.crits++;let power=action.power;if(action.kind==='sword'&&action.index===2&&h.items.includes('furnace'))power*=1.45;
   this.damage(e,h.attack*power*(crit?1.7:1),action.kind,crit);hit=true;
   if(action.kind==='counter'||action.kind==='bash'||action.index===2){if(e.kind!=='boss'||action.kind==='counter'){e.phase=action.kind==='counter'?1.2:.6;e.telegraph=null;}if(e.kind!=='boss'){e.x+=action.aim.x*14;e.y+=action.aim.y*14;this.confine(e);}}
   if(action.index===2&&h.items.includes('thunder'))for(const t of this.enemies.filter(t=>!t.dying&&distance(t,e)<155).slice(0,3)){this.effects.push({kind:'lightning',x:h.x,y:h.y-35,toX:t.x,toY:t.y-35,t:0,duration:.3,r:20,color:'#b4e5ed'});this.damage(t,24,'lightning');}
  }
  if(hit){this.hitStop=action.kind==='counter'?.065:.035;this.shake=action.index===2?3:1;this.emit('attack',{heavy:action.index===2});}else this.emit('miss');
  if(action.kind==='bash')this.effects.push({kind:'shield',x:h.x+action.aim.x*35,y:h.y+action.aim.y*35,t:0,duration:.3,r:35,color:'#e1d6a6'});
 }
 skill(which){
  if(which==='guard')return this.setGuard(true);if(which==='attack')return this.requestAttack();if(this.mode!=='battle')return false;const h=this.hero;
  if(which==='dodge'){
   if(h.dodge||h.dodgeCd>0||h.stamina<22)return false;let dir;if(Math.hypot(h.input.x,h.input.y)>.1)dir=h.input;else if(h.moveTarget)dir=direction(h,h.moveTarget);else {const t=this.target();dir=t?direction(t,h):h.lastMove;}
   if(Math.hypot(dir.x,dir.y)<.1)dir={x:h.facing,y:0};h.dodge={x:dir.x,y:dir.y,time:.24,total:.24};h.dodgeCd=2.2;h.invulnerable=.29;h.stamina-=22;h.staminaDelay=.5;h.action=null;h.combo=0;h.comboTime=0;h.queued=false;h.pendingAttack=false;h.moveTarget=null;h.holdPosition=true;h.guarding=false;h.guardRequested=false;this.stats.dodges++;this.log('dodge');this.emit('dodge');return true;
  }
  if(which==='burst'){
   if(h.burstCd>0||h.stamina<30||h.action||h.dodge||h.guarding)return false;h.burstCd=8;h.stamina-=30;h.staminaDelay=.5;this.stats.burst++;this.shake=5;this.flash=.12;
   this.effects.push({kind:'nova',x:h.x,y:h.y,t:0,duration:.65,r:145,color:'#b3f5e7'});for(const e of this.enemies.filter(e=>!e.dying&&distance(e,h)<145)){this.damage(e,h.items.includes('furnace')?84:56,'burst');if(e.kind!=='boss'){e.phase=.5;e.telegraph=null;}}
   this.log('skill_used',{skill:'burst'});this.emit('skill',{skill:'burst'});return true;
  }return false;
 }
 heal(amount){const h=this.hero,actual=Math.min(amount,h.maxHp-h.hp);h.hp=Math.min(h.maxHp,h.hp+amount);if(actual>0)this.float(h.x,h.y-48,'+'+Math.ceil(actual),'#b6d698');}
 float(x,y,text,color='#ede8ce',big=false){this.texts.push({x:x+(this.random()-.5)*10,y,text,color,big,t:0,duration:big?1.1:.8});}
 damage(e,amount,source='sword',critical=false){if(e.dying||this.mode!=='battle')return;const actual=Math.min(e.hp,amount);e.hp=Math.max(0,e.hp-amount);e.hurt=.16;this.stats.damage+=actual;this.float(e.x,e.y-(e.kind==='boss'?124:58),Math.round(amount)+(critical?'!':''),source==='burn'?'#eba474':critical?'#f4d688':source==='counter'?'#d5f9e5':'#e3e9d9',critical||source==='counter');this.effects.push({kind:'hit',x:e.x,y:e.y-30,t:0,duration:.2,r:critical?25:15,color:source==='burn'?'#f9a865':'#d1e8da'});if(['sword','counter'].includes(source)&&this.hero.items.includes('ember'))e.burn=3;
  if(e.hp<=0){e.dying=.6;e.telegraph=null;this.stats.kills++;this.stats.coins+=e.kind==='boss'?100:e.kind==='brute'?20:8;this.hero.stamina=clamp(this.hero.stamina+7,0,100);this.effects.push({kind:'soul',x:e.x,y:e.y-20,t:0,duration:.85,r:5,color:'#b6dcd0',toX:this.hero.x,toY:this.hero.y-30});this.emit('kill',{kind:e.kind});}
 }
 hurtHero(amount,source=null,unblockable=false){
  if(this.mode!=='battle')return;const h=this.hero;if(h.invulnerable>0){this.stats.evades++;this.emit('evade');return;}
  const dir=source?direction(h,source):h.aim,front=dir.x*h.aim.x+dir.y*h.aim.y>.15;
  if(h.guarding&&front&&!unblockable){
   const perfect=h.parryEnabled&&!h.guardParried&&h.guardAge<=(h.items.includes('aegis')?.42:.29);
   if(perfect){h.guardParried=true;h.counter=2.2;h.stamina=clamp(h.stamina+12,0,100);this.stats.blocked+=amount;this.stats.perfectGuards++;if(source&&'phase'in source){source.phase=.9;source.telegraph=null;}if(h.items.includes('aegis'))this.heal(12);this.hitStop=.055;this.effects.push({kind:'shield',x:h.x+h.aim.x*26,y:h.y+h.aim.y*26,t:0,duration:.4,r:55,color:'#f5e4a6'});this.log('perfect_parry');this.emit('perfect');return;}
   const cost=amount*.75*(h.items.includes('iron')?.7:1),fraction=Math.min(1,h.stamina/cost),blocked=amount*.9*fraction;h.stamina=Math.max(0,h.stamina-cost);h.staminaDelay=.65;this.stats.blocked+=blocked;amount-=blocked;this.emit('block');if(h.stamina<=0){h.guarding=false;h.guardRequested=false;h.guardLock=.75;this.emit('guardBreak');}
  }
  const actual=Math.min(h.hp,amount);h.hp=Math.max(0,h.hp-amount);h.hurt=.2;this.stats.received+=actual;this.float(h.x,h.y-72,'−'+Math.ceil(actual),'#f0ab99');this.shake=unblockable?5:2;this.emit('hurt');if(h.hp<=0)this.finish(false);
 }
 spawn(kind,index=0,total=1){const boss=kind==='boss',m=1+this.stage*.18,hp=boss?2200:kind==='brute'?148*m:kind==='caster'?68*m:76*m;const e={id:++this.id,kind,x:boss?220:80+(index+.4)/Math.max(1,total)*270+(this.random()-.5)*24,y:boss?282:278+Math.sin((index+.5)/total*Math.PI)*32,hp,maxHp:hp,attack:boss?30:kind==='brute'?21:kind==='caster'?12:13,speed:kind==='brute'?29:kind==='caster'?27:40,radius:boss?37:kind==='brute'?26:19,timer:1+index*.35,anim:0,hurt:0,dying:0,phase:1,burn:0,burnTick:.7,telegraph:null,slamTimer:boss?5:0,summonTimer:boss?21:0,facing:1};this.enemies.push(e);this.effects.push({kind:'spawn',x:e.x,y:e.y,t:0,duration:1,color:boss?'#b06148':'#8cbdad',r:e.radius*1.8});return e;}
 spawnWave(){const list=STAGES[this.stage].waves[this.wave];if(!list)return;list.forEach((type,i)=>this.spawn(type,i,list.length));this.wave++;this.log('wave_start',{stage:this.stage+1,wave:this.wave});this.emit('wave',{wave:this.wave,total:STAGES[this.stage].waves.length});}
 beginEnemyAttack(e,type){const h=this.hero,duration=type==='quake'?1.45:type==='projectile'?1.05:e.kind==='brute'?1.1:e.kind==='boss'?.95:.78;e.telegraph={type,elapsed:0,duration,x:h.x,y:h.y,aim:direction(e,h),r:type==='quake'?82:e.kind==='boss'?106:83};this.emit('warning',{kind:type,enemy:e.kind});}
 resolveEnemyAttack(e,a){e.anim=.38;e.timer=e.kind==='boss'?1.3:e.kind==='brute'?2:1.8;if(a.type==='quake'){if(distance(this.hero,a)<a.r)this.hurtHero(88,e,true);this.effects.push({kind:'quake',x:a.x,y:a.y,t:0,duration:.55,r:a.r,color:'#dd8462'});this.emit('slam');}else if(a.type==='projectile'){const aim=direction(e,a);this.projectiles.push({x:e.x,y:e.y,vx:aim.x*178,vy:aim.y*178,damage:e.attack,life:3,color:'#d99b86',owner:e.id});}else {const dir=direction(e,this.hero);if(distance(e,this.hero)<a.r&&dir.x*a.aim.x+dir.y*a.aim.y>.35)this.hurtHero(e.attack,e);}}
 choose(id){if(this.mode!=='loot'||!this.choices.includes(id))return false;const h=this.hero;h.items.push(id);this.stats.items.push(id);if(id==='ember')h.attack+=5;if(id==='storm'){h.speed=1.2;h.crit+=.15;}if(id==='iron'){h.maxHp+=60;h.hp+=60;}if(id==='thunder')h.crit+=.1;this.heal(h.maxHp*.4);h.stamina=100;h.burstCd=0;h.dodgeCd=0;h.action=null;h.combo=0;h.comboTime=0;h.counter=0;h.moveTarget=null;h.holdPosition=false;h.x=220;h.y=Math.min(420,this.bounds.bottom);this.resetInput();this.log('equipment_selected',{item:id,stage:this.stage+1});this.stage++;this.wave=0;this.nextWave=2;this.stageTime=0;this.enemies=[];this.projectiles=[];this.effects=[];this.texts=[];this.mode='battle';this.emit('stage',{stage:this.stage});return true;}
 clearStage(){if(this.mode!=='battle')return;this.resetInput();this.hero.action=null;this.hero.pendingAttack=false;this.projectiles=[];this.stats.stages.push({stage:this.stage+1,seconds:+this.stageTime.toFixed(1),hp:Math.ceil(this.hero.hp)});this.log('stage_complete',{stage:this.stage+1});if(this.stage===2){this.finish(true);return;}this.mode='loot';this.choices=this.stage===0?['ember','storm','iron']:['furnace','thunder','aegis'];this.emit('loot',{choices:this.choices});}
 finish(won){if(this.mode==='result')return;this.resetInput();this.mode='result';this.stats.time=+this.time.toFixed(1);this.stats.won=won;this.stats.stage=this.stage+1;for(const key of ['damage','received','blocked'])this.stats[key]=Math.round(this.stats[key]);this.log('run_end',{won});this.emit('result',{won,stats:this.stats});}
 updateHero(dt){
  const h=this.hero;for(const key of ['burstCd','dodgeCd','bashCd','invulnerable','counter','guardLock','staminaDelay','comboTime','hurt'])h[key]=Math.max(0,h[key]-dt);
  if(h.dodge){h.dodge.time-=dt;h.x+=h.dodge.x*420*dt;h.y+=h.dodge.y*420*dt;h.walk=false;if(h.dodge.time<=0)h.dodge=null;this.confine(h);return;}
  if(h.guarding){h.guardAge+=dt;h.stamina=Math.max(0,h.stamina-5*dt);if(h.stamina<=0){h.guarding=false;h.guardRequested=false;h.guardLock=.75;this.emit('guardBreak');}}else if(h.staminaDelay===0)h.stamina=clamp(h.stamina+22*dt,0,100);
  if(h.action){const a=h.action;a.elapsed+=dt;if(!a.hit&&a.elapsed>=a.impact){a.hit=true;this.impact(a);}if(a.elapsed>=a.duration){h.action=null;h.combo=a.kind==='sword'?(a.index+1)%3:0;h.comboTime=1.05;if(h.guardRequested)this.raiseGuard();else if(h.queued){h.queued=false;this.requestAttack();}}h.walk=false;return;}
  if(h.guardRequested&&!h.guarding)this.raiseGuard();
  const input=Math.hypot(h.input.x,h.input.y)>.1;let dir=null;const target=this.target();if(input)dir=h.input;else if(h.moveTarget){if(distance(h,h.moveTarget)>4)dir=direction(h,h.moveTarget);else h.moveTarget=null;}else if(!h.holdPosition&&!h.guarding&&target&&distance(h,target)>65)dir=direction(h,target);
  if(dir){const speed=h.guarding?48:125;h.x+=dir.x*speed*dt;h.y+=dir.y*speed*dt;h.walk=true;if(!h.guarding){h.aim={...dir};if(Math.abs(dir.x)>.08)h.facing=dir.x<0?-1:1;}}else h.walk=false;
  this.confine(h);if(target&&!dir&&!h.guarding)this.face(target);if(!h.guarding&&h.guardLock===0&&(h.pendingAttack||h.auto)&&target&&distance(h,target)<=78&&!input&&!h.moveTarget)this.beginAction(h.counter>0?'counter':'sword');
 }
 update(dt){
  dt=clamp(dt,0,.04);this.visualTime+=dt;if(this.mode==='paused')return;for(const f of this.effects)f.t+=dt;this.effects=this.effects.filter(f=>f.t<f.duration);for(const n of this.texts)n.t+=dt;this.texts=this.texts.filter(n=>n.t<n.duration);this.shake=Math.max(0,this.shake-dt*25);this.flash=Math.max(0,this.flash-dt);
  if(this.mode!=='battle')return;if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return;}this.time+=dt;this.stageTime+=dt;this.updateHero(dt);const h=this.hero;
  for(const e of [...this.enemies]){
   if(this.mode!=='battle')return;if(e.dying){e.dying-=dt;if(e.dying<=0)e.remove=true;continue;}e.hurt=Math.max(0,e.hurt-dt);e.anim=Math.max(0,e.anim-dt);e.phase=Math.max(0,e.phase-dt);e.walk=false;
   if(e.burn>0){e.burn-=dt;e.burnTick-=dt;if(e.burnTick<=0){e.burnTick=.7;this.damage(e,8,'burn');if(e.dying)continue;}}if(e.phase>0)continue;
   if(e.telegraph){const a=e.telegraph;a.elapsed+=dt;if(a.elapsed>=a.duration){e.telegraph=null;this.resolveEnemyAttack(e,a);}continue;}e.timer-=dt;
   if(e.kind==='boss'){e.slamTimer-=dt;e.summonTimer-=dt;if(e.slamTimer<=0){e.slamTimer=e.hp<e.maxHp*.45?6:8;this.beginEnemyAttack(e,'quake');continue;}if(e.summonTimer<=0){e.summonTimer=24;this.spawn('wraith',0,2);this.spawn('wraith',1,2);this.emit('summon');}}
   const dist=distance(e,h),dir=direction(e,h),stop=e.kind==='caster'?140:e.kind==='boss'?74:53;if(Math.abs(dir.x)>.1)e.facing=dir.x<0?-1:1;if(dist>stop){e.x+=dir.x*e.speed*dt;e.y+=dir.y*e.speed*dt;e.walk=true;}else if(e.timer<=0)this.beginEnemyAttack(e,e.kind==='caster'?'projectile':'melee');this.confine(e);
  }
  if(this.mode!=='battle')return;this.enemies=this.enemies.filter(e=>!e.remove);const live=this.enemies.filter(e=>!e.dying);
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){const a=live[i],b=live[j],d=distance(a,b),min=(a.radius+b.radius)*.85;if(d<min&&d>.01){const q=(min-d)*.4,dir=direction(a,b);if(!a.telegraph){a.x-=dir.x*q;a.y-=dir.y*q;this.confine(a);}if(!b.telegraph){b.x+=dir.x*q;b.y+=dir.y*q;this.confine(b);}}}
  for(const p of this.projectiles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(distance(p,h)<18){p.done=true;this.hurtHero(p.damage,{x:p.x-p.vx*.1,y:p.y-p.vy*.1});if(this.mode!=='battle')return;}if(p.life<=0)p.done=true;}this.projectiles=this.projectiles.filter(p=>!p.done);
  if(!this.enemies.length){this.nextWave-=dt;if(this.nextWave<=0){if(this.wave<STAGES[this.stage].waves.length){this.spawnWave();this.nextWave=1.2;}else this.clearStage();}}
 }
}
