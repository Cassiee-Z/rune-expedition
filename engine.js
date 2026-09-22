export const ITEMS = {
  ember: {icon:'sword',color:'#df9b6c',name:['赤焰长刃','Emberblade'],tag:['灼烧流派','BURN BUILD'],desc:['攻击 +5；命中附加持续灼烧。','+5 attack. Hits ignite enemies.']},
  storm: {icon:'bolt',color:'#a6cee0',name:['疾风双刃','Gale Blades'],tag:['暴击流派','CRITICAL BUILD'],desc:['攻击速度 +25%；暴击率 +15%。','25% faster attacks. +15% critical chance.']},
  iron: {icon:'shield',color:'#bdc797',name:['暮铁誓盾','Duskiron Oath'],tag:['守护流派','GUARDIAN BUILD'],desc:['生命上限 +60；攻击 +3；击杀回复 6。','+60 max HP, +3 attack. Kills restore 6 HP.']},
  furnace: {icon:'flame',color:'#df9b6c',name:['余烬之心','Cinder Heart'],tag:['爆发强化','BURST UPGRADE'],desc:['符文爆发伤害 +60%；所有攻击附加灼烧。','Rune Burst deals 60% more damage. All hits ignite.']},
  thunder: {icon:'bolt',color:'#a6cee0',name:['雷鸣符石','Thunder Sigil'],tag:['连锁强化','CHAIN UPGRADE'],desc:['每 3 次攻击触发连锁闪电；暴击率 +10%。','Every third attack chains lightning. +10% critical chance.']},
  aegis: {icon:'shield',color:'#bdc797',name:['不屈圣印','Unbroken Seal'],tag:['护盾强化','SHIELD UPGRADE'],desc:['护盾吸收量 +40；开启护盾时回复 20 生命。','Shield absorbs 40 more damage and restores 20 HP.']}
};
export const STAGES = [
  {name:['旧城门','The Fallen Gate'],subtitle:['CHAPTER I','CHAPTER I'],waves:[['wraith','wraith','wraith'],['wraith','caster','wraith'],['brute','wraith','caster']]},
  {name:['灰烬回廊','The Ashen Hall'],subtitle:['CHAPTER II','CHAPTER II'],waves:[['wraith','caster','wraith','wraith'],['brute','caster','wraith'],['brute','caster','wraith','caster']]},
  {name:['王座之下','Beneath the Throne'],subtitle:['FINAL CHAPTER','FINAL CHAPTER'],waves:[['boss']]}
];
export class Expedition {
  constructor(random=Math.random){this.random=random;this.listeners=[];this.mode='home';this.time=0;this.visualTime=0;this.enemies=[];this.effects=[];this.texts=[];this.projectiles=[];this.stats=null;this.id=0;this.shake=0;this.flash=0;this.hero=this.newHero();}
  newHero(){return {x:220,y:420,hp:240,maxHp:240,attack:14,interval:.92,crit:.12,shield:0,shieldTime:0,attackTimer:.3,anim:0,hurt:0,facing:1,items:[],burstCd:0,guardCd:0,hitCount:0,target:null};}
  on(fn){this.listeners.push(fn);}
  emit(type,data={}){for(const fn of this.listeners)fn({type,...data});}
  start(){this.hero=this.newHero();this.enemies=[];this.effects=[];this.texts=[];this.projectiles=[];this.time=0;this.stage=0;this.wave=0;this.nextWave=2.7;this.id=0;this.stats={startedAt:new Date().toISOString(),time:0,damage:0,received:0,blocked:0,kills:0,crits:0,burst:0,guard:0,perfectGuards:0,coins:0,items:[],events:[],stages:[]};this.mode='battle';this.stageTime=0;this.log('run_start');this.emit('stage',{stage:0});}
  log(event,data={}){if(this.stats)this.stats.events.push({event,at:+this.time.toFixed(2),...data});}
  pause(){if(this.mode==='battle'){this.mode='paused';this.emit('pause');}}
  resume(){if(this.mode==='paused'){this.mode='battle';this.emit('resume');}}
  home(){this.mode='home';this.enemies=[];this.effects=[];this.projectiles=[];this.texts=[];this.hero=this.newHero();this.emit('home');}
  spawn(kind,index=0,total=1){
    const a=(index+.5)/total*Math.PI, boss=kind==='boss';
    const m=1+this.stage*.22;
    const hp=boss?1220:kind==='brute'?125*m:kind==='caster'?49*m:53*m;
    const enemy={id:++this.id,kind,x:boss?220:80+this.random()*280,y:boss?270:235+Math.sin(a)*50,hp,maxHp:hp,attack:boss?11:kind==='brute'?12:kind==='caster'?8:7,speed:kind==='brute'?20:kind==='caster'?23:30+this.random()*5,radius:boss?38:kind==='brute'?25:18,timer:1.8+this.random(),anim:0,hurt:0,dying:0,phase:0,burn:0,burnTick:.8,telegraph:0,slamTimer:boss?7:0,summonTimer:boss?19:0,facing:1};
    this.enemies.push(enemy);this.effects.push({kind:'spawn',x:enemy.x,y:enemy.y,t:0,duration:1.2,color:boss?'#b06148':'#8cbdad',r:enemy.radius*1.8});return enemy;
  }
  spawnWave(){const list=STAGES[this.stage].waves[this.wave];if(!list)return;list.forEach((type,i)=>this.spawn(type,i,list.length));this.wave++;this.emit('wave',{wave:this.wave,total:STAGES[this.stage].waves.length});this.log('wave_start',{stage:this.stage+1,wave:this.wave});}
  skill(which){
    if(this.mode!=='battle')return false;const h=this.hero;
    if(which==='burst'){
      if(h.burstCd>0)return false;
      h.burstCd=8;h.anim=.5;this.stats.burst++;this.shake=7;this.flash=.2;
      this.effects.push({kind:'nova',x:h.x,y:h.y,t:0,duration:.8,r:200,color:'#b3f5e7'});
      for(const e of this.enemies.filter(e=>!e.dying)){this.damage(e,(h.items.includes('furnace')?74:46)*(e.kind==='boss'?1.45:1),'burst');if(!e.dying)e.phase=.7;}
      this.log('skill_used',{skill:'burst'});this.emit('skill',{skill:'burst'});return true;
    }
    if(which==='guard'){
      if(h.guardCd>0)return false;
      h.guardCd=11;h.shield=h.items.includes('aegis')?110:70;h.shieldTime=4.4;
      if(h.items.includes('aegis'))this.heal(20);
      this.stats.guard++;this.effects.push({kind:'shield',x:h.x,y:h.y,t:0,duration:.55,r:50,color:'#c7e5b6'});this.log('skill_used',{skill:'guard'});this.emit('skill',{skill:'guard'});return true;
    }return false;
  }
  heal(amount){const h=this.hero,actual=Math.min(amount,h.maxHp-h.hp);h.hp=Math.min(h.maxHp,h.hp+amount);if(actual>0)this.float(h.x,h.y-48,'+'+Math.ceil(actual),'#b6d698',false);}
  float(x,y,text,color='#ede8ce',big=false){this.texts.push({x:x+(this.random()-.5)*16,y,text,color,big,t:0,duration:big?1.1:.8});}
  damage(e,amount,source='attack',critical=false){
    if(e.dying)return;
    const actual=Math.min(e.hp,amount);e.hp=Math.max(0,e.hp-amount);e.hurt=.16;this.stats.damage+=actual;
    this.float(e.x,e.y-(e.kind==='boss'?95:48),Math.round(amount)+(critical?'!':''),source==='burn'?'#eba474':critical?'#f4d688':source==='burst'?'#b9ece4':'#e3e9d9',critical);
    this.effects.push({kind:'hit',x:e.x,y:e.y-25,t:0,duration:.22,r:critical?25:15,color:source==='burn'?'#f9a865':'#d1e8da'});
    if(source==='attack'&&(this.hero.items.includes('ember')||this.hero.items.includes('furnace')))e.burn=3.5;
    if(e.hp<=0){e.dying=.75;this.stats.kills++;const coins=e.kind==='boss'?100:e.kind==='brute'?20:8;this.stats.coins+=coins;
      if(this.hero.items.includes('iron'))this.heal(6);
      this.effects.push({kind:'soul',x:e.x,y:e.y-20,t:0,duration:.85,r:5,color:'#b6dcd0',toX:this.hero.x,toY:this.hero.y-30});
      this.emit('kill',{kind:e.kind});
    }
  }
  hurtHero(amount,slam=false){
    const h=this.hero;let blocked=0;
    if(h.shield>0){blocked=Math.min(amount,h.shield);h.shield-=blocked;amount-=blocked;this.stats.blocked+=blocked;this.float(h.x,h.y-72,'−'+Math.round(blocked),'#b8e8df');}
    if(slam&&blocked>0){this.stats.perfectGuards++;this.emit('perfect');this.log('slam_guarded');}
    if(amount>0){const actual=Math.min(h.hp,amount);h.hp=Math.max(0,h.hp-amount);h.hurt=.22;this.stats.received+=actual;this.float(h.x,h.y-58,'−'+Math.round(amount),'#f0ab99');this.shake=slam?9:3;this.emit('hurt');}
    if(h.hp<=0)this.finish(false);
  }
  attack(e){
    const h=this.hero;h.anim=.4;h.facing=e.x<h.x?-1:1;h.target=e;h.hitCount++;
    const crit=this.random()<h.crit;if(crit)this.stats.crits++;
    this.damage(e,h.attack*(crit?1.9:1),'attack',crit);
    this.effects.push({kind:'slash',x:(h.x+e.x)/2,y:(h.y+e.y)/2-25,t:0,duration:.3,r:48,color:crit?'#eacf92':'#b6d9d2',flip:h.facing});
    if(h.items.includes('thunder')&&h.hitCount%3===0){const targets=this.enemies.filter(t=>!t.dying).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)).slice(0,3);let last={x:h.x,y:h.y};for(const t of targets){this.effects.push({kind:'lightning',x:last.x,y:last.y-35,toX:t.x,toY:t.y-35,t:0,duration:.35,r:20,color:'#b4e5ed'});this.damage(t,22,'lightning');last=t;}}
    this.emit('attack',{critical:crit});
  }
  choose(id){
    if(this.mode!=='loot'||!this.choices.includes(id))return false;
    const h=this.hero;h.items.push(id);this.stats.items.push(id);
    if(id==='ember')h.attack+=5;if(id==='storm'){h.interval/=1.25;h.crit+=.15;}if(id==='iron'){h.maxHp+=60;h.hp+=60;h.attack+=3;}if(id==='thunder')h.crit+=.1;
    this.heal(h.maxHp*.38);h.burstCd=0;h.guardCd=0;h.shield=0;h.x=220;h.y=420;
    this.log('equipment_selected',{item:id,stage:this.stage+1});this.stage++;this.wave=0;this.nextWave=3;this.stageTime=0;this.enemies=[];this.projectiles=[];this.effects=[];this.texts=[];this.mode='battle';this.emit('stage',{stage:this.stage});return true;
  }
  clearStage(){
    this.stats.stages.push({stage:this.stage+1,seconds:+this.stageTime.toFixed(1),hp:Math.ceil(this.hero.hp)});this.log('stage_complete',{stage:this.stage+1});
    if(this.stage===2){this.finish(true);return;}
    this.mode='loot';this.choices=this.stage===0?['ember','storm','iron']:['furnace','thunder','aegis'];this.emit('loot',{choices:this.choices});
  }
  finish(won){if(this.mode==='result')return;this.mode='result';this.stats.time=+this.time.toFixed(1);this.stats.won=won;this.stats.stage=this.stage+1;this.stats.damage=Math.round(this.stats.damage);this.stats.received=Math.round(this.stats.received);this.stats.blocked=Math.round(this.stats.blocked);this.log('run_end',{won});this.emit('result',{won,stats:this.stats});}
  update(dt){
    dt=Math.min(dt,.04);this.visualTime+=dt;
    if(this.mode==='paused')return;
    for(const fx of this.effects)fx.t+=dt;this.effects=this.effects.filter(f=>f.t<f.duration);
    for(const t of this.texts)t.t+=dt;this.texts=this.texts.filter(t=>t.t<t.duration);
    this.shake=Math.max(0,this.shake-dt*25);this.flash=Math.max(0,this.flash-dt);
    if(this.mode!=='battle')return;
    this.time+=dt;this.stageTime+=dt;const h=this.hero;
    h.burstCd=Math.max(0,h.burstCd-dt);h.guardCd=Math.max(0,h.guardCd-dt);h.shieldTime=Math.max(0,h.shieldTime-dt);if(h.shieldTime===0)h.shield=0;
    h.anim=Math.max(0,h.anim-dt);h.hurt=Math.max(0,h.hurt-dt);h.attackTimer-=dt;
    for(const e of this.enemies){if(this.mode!=='battle')return;if(e.dying){e.dying-=dt;if(e.dying<=0)e.remove=true;continue;}e.anim=Math.max(0,e.anim-dt);e.hurt=Math.max(0,e.hurt-dt);e.phase=Math.max(0,e.phase-dt);
      if(e.burn>0){e.burn-=dt;e.burnTick-=dt;if(e.burnTick<=0){e.burnTick=.75;this.damage(e,7,'burn');if(e.dying)continue;}}
      if(e.kind==='boss'){
        e.slamTimer-=dt;e.summonTimer-=dt;
        if(e.slamTimer<=0&&e.telegraph<=0){e.telegraph=2.1;e.slamTimer=e.hp<e.maxHp*.45?8:11;this.emit('warning');this.log('boss_telegraph');}
        if(e.telegraph>0){e.telegraph-=dt;if(e.telegraph<=0){e.anim=.7;this.hurtHero(70,true);this.effects.push({kind:'slam',x:h.x,y:h.y,t:0,duration:.85,r:130,color:'#dd8462'});this.emit('slam');}continue;}
        if(e.summonTimer<=0){e.summonTimer=24;this.spawn('wraith',0,2);this.spawn('wraith',1,2);this.emit('summon');}
      }
      if(e.phase>0)continue;
      const dx=h.x-e.x,dy=h.y-e.y,dist=Math.hypot(dx,dy);e.facing=dx<0?-1:1;
      const stop=e.kind==='caster'?140:e.kind==='boss'?63:42;
      if(dist>stop){e.x+=dx/dist*e.speed*dt;e.y+=dy/dist*e.speed*dt;e.walk=true;}else e.walk=false;
      e.timer-=dt;
      if(dist<=stop+8&&e.timer<=0){e.timer=e.kind==='boss'?2:e.kind==='brute'?3.3:e.kind==='caster'?3.3:2.7;e.anim=.4;
        if(e.kind==='caster'){this.projectiles.push({x:e.x,y:e.y-28,toX:h.x,toY:h.y-25,damage:e.attack,speed:170,color:'#d99b86'});}else this.hurtHero(e.attack);
      }
    }
    if(this.mode!=='battle')return;
    this.enemies=this.enemies.filter(e=>!e.remove);
    const alive=this.enemies.filter(e=>!e.dying);
    if(alive.length){
      const target=alive.reduce((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)<Math.hypot(b.x-h.x,b.y-h.y)?a:b);
      const dx=target.x-h.x,dy=target.y-h.y,dist=Math.hypot(dx,dy);
      if(dist>(target.kind==='boss'?70:51)){h.x+=dx/dist*59*dt;h.y+=dy/dist*59*dt;h.walk=true;h.facing=dx<0?-1:1;}else{h.walk=false;if(h.attackTimer<=0){h.attackTimer=h.interval;this.attack(target);}}
    }else{
      h.walk=false;
      if(!this.enemies.length){this.nextWave-=dt;if(this.nextWave<=0){if(this.wave<STAGES[this.stage].waves.length){this.spawnWave();this.nextWave=1.5;}else this.clearStage();}}
    }
    h.x=Math.min(380,Math.max(60,h.x));h.y=Math.min(550,Math.max(295,h.y));
    for(const p of this.projectiles){if(this.mode!=='battle')return;p.toX=h.x;p.toY=h.y-25;const dx=p.toX-p.x,dy=p.toY-p.y,d=Math.hypot(dx,dy);if(d<12){p.done=true;this.hurtHero(p.damage);}else{p.x+=dx/d*p.speed*dt;p.y+=dy/d*p.speed*dt;}}
    this.projectiles=this.projectiles.filter(p=>!p.done);
  }
}
