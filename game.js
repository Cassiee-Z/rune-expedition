(() => {
  // engine.js
  var ITEMS = {
    ember: { icon: "sword", color: "#df9b6c", name: ["赤焰长刃", "Emberblade"], tag: ["灼烧剑技", "BURNING EDGE"], desc: ["攻击 +5；剑击命中附加灼烧。", "+5 attack. Sword hits ignite enemies."] },
    storm: { icon: "bolt", color: "#a6cee0", name: ["疾风剑铭", "Gale Etching"], tag: ["迅捷连招", "SWIFT COMBOS"], desc: ["剑击速度 +20%；暴击率 +15%。", "20% faster sword combos. +15% critical chance."] },
    iron: { icon: "shield", color: "#bdc797", name: ["暮铁誓盾", "Duskiron Oath"], tag: ["稳固防守", "STEADFAST GUARD"], desc: ["生命上限 +60；格挡耐力消耗降低 30%。", "+60 max HP. Blocking costs 30% less stamina."] },
    furnace: { icon: "flame", color: "#df9b6c", name: ["余烬之心", "Cinder Heart"], tag: ["终结强化", "FINISHER BUILD"], desc: ["第三段刺击伤害 +45%；符文爆发伤害 +50%。", "Third-hit thrust +45% damage. Rune Burst +50% damage."] },
    thunder: { icon: "bolt", color: "#a6cee0", name: ["雷鸣符石", "Thunder Sigil"], tag: ["连招闪电", "CHAIN LIGHTNING"], desc: ["第三段剑击触发连锁闪电；暴击率 +10%。", "Third combo hit chains lightning. +10% critical chance."] },
    aegis: { icon: "shield", color: "#bdc797", name: ["不屈圣印", "Unbroken Seal"], tag: ["格挡反击", "PARRY & RIPOSTE"], desc: ["完美格挡窗口增加；格挡成功回复 12 生命。", "Longer perfect-parry window. Perfect parries heal 12 HP."] }
  };
  var STAGES = [
    { name: ["旧城门", "The Fallen Gate"], subtitle: ["CHAPTER I", "CHAPTER I"], waves: [["wraith", "wraith"], ["wraith", "caster", "wraith"], ["brute", "wraith", "caster"]] },
    { name: ["灰烬回廊", "The Ashen Hall"], subtitle: ["CHAPTER II", "CHAPTER II"], waves: [["wraith", "caster", "wraith"], ["brute", "caster", "wraith"], ["brute", "caster", "wraith", "caster"]] },
    { name: ["王座之下", "Beneath the Throne"], subtitle: ["FINAL CHAPTER", "FINAL CHAPTER"], waves: [["boss"]] }
  ];
  var COMBO = [{ duration: 0.54, impact: 0.23, power: 1, range: 83, arc: 1.65 }, { duration: 0.58, impact: 0.26, power: 1.15, range: 86, arc: 1.8 }, { duration: 0.76, impact: 0.33, power: 1.9, range: 112, arc: 0.65 }];
  var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function direction(a, b) {
    const d = distance(a, b) || 1;
    return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
  }
  var Expedition = class {
    constructor(random = Math.random) {
      this.random = random;
      this.listeners = [];
      this.mode = "home";
      this.visualTime = 0;
      this.time = 0;
      this.enemies = [];
      this.effects = [];
      this.texts = [];
      this.projectiles = [];
      this.stats = null;
      this.id = 0;
      this.shake = 0;
      this.flash = 0;
      this.hitStop = 0;
      this.bounds = { left: 48, right: 392, top: 270, bottom: 480 };
      this.hero = this.newHero();
    }
    newHero() {
      return { x: 220, y: 420, hp: 260, maxHp: 260, attack: 23, crit: 0.12, speed: 1, items: [], auto: false, aim: { x: 1, y: 0 }, facing: 1, walk: false, hurt: 0, action: null, combo: 0, comboTime: 0, queued: false, pendingAttack: false, targetId: null, moveTarget: null, holdPosition: false, input: { x: 0, y: 0 }, lastMove: { x: 0, y: 1 }, guarding: false, guardRequested: false, guardAge: 0, guardParried: false, nextParry: 0, guardLock: 0, parryEnabled: false, stamina: 100, staminaDelay: 0, counter: 0, dodge: null, dodgeCd: 0, invulnerable: 0, burstCd: 0, bashCd: 0 };
    }
    on(fn) {
      this.listeners.push(fn);
    }
    emit(type, data = {}) {
      for (const fn of this.listeners) fn({ type, ...data });
    }
    log(event, data = {}) {
      if (this.stats) this.stats.events.push({ event, at: +this.time.toFixed(2), ...data });
    }
    start() {
      this.hero = this.newHero();
      this.enemies = [];
      this.effects = [];
      this.texts = [];
      this.projectiles = [];
      this.time = 0;
      this.stage = 0;
      this.wave = 0;
      this.id = 0;
      this.nextWave = 2;
      this.stageTime = 0;
      this.hitStop = 0;
      this.stats = { version: 2, startedAt: (/* @__PURE__ */ new Date()).toISOString(), time: 0, damage: 0, received: 0, blocked: 0, kills: 0, crits: 0, burst: 0, guard: 0, perfectGuards: 0, attacks: 0, finishers: 0, counters: 0, bashes: 0, dodges: 0, evades: 0, moves: 0, modeChanges: 0, coins: 0, items: [], events: [], stages: [] };
      this.mode = "battle";
      this.log("run_start");
      this.emit("stage", { stage: 0 });
    }
    resetInput() {
      const h = this.hero;
      h.guardRequested = false;
      h.guarding = false;
      h.queued = false;
      h.input = { x: 0, y: 0 };
    }
    pause() {
      if (this.mode === "battle") {
        this.resetInput();
        this.mode = "paused";
        this.emit("pause");
      }
    }
    resume() {
      if (this.mode === "paused") {
        this.mode = "battle";
        this.emit("resume");
      }
    }
    home() {
      this.resetInput();
      this.mode = "home";
      this.enemies = [];
      this.effects = [];
      this.projectiles = [];
      this.texts = [];
      this.hero = this.newHero();
      this.emit("home");
    }
    setBounds(bottom) {
      this.bounds.bottom = clamp(bottom, 365, 510);
      if (this.hero) this.confine(this.hero);
    }
    confine(actor) {
      actor.x = clamp(actor.x, this.bounds.left, this.bounds.right);
      actor.y = clamp(actor.y, this.bounds.top, this.bounds.bottom);
    }
    nearest() {
      const living = this.enemies.filter((e) => !e.dying);
      return living.reduce((a, e) => !a || distance(e, this.hero) < distance(a, this.hero) ? e : a, null);
    }
    target() {
      return this.enemies.find((e) => e.id === this.hero.targetId && !e.dying) || this.nearest();
    }
    face(target) {
      if (!target) return;
      const h = this.hero;
      h.aim = direction(h, target);
      if (Math.abs(h.aim.x) > 0.08) h.facing = h.aim.x < 0 ? -1 : 1;
    }
    setAuto(on) {
      if (!["battle", "paused"].includes(this.mode)) return false;
      const h = this.hero;
      h.auto = !!on;
      h.queued = false;
      h.pendingAttack = false;
      this.stats.modeChanges++;
      this.log("mode_changed", { auto: h.auto });
      this.emit("controlMode", { auto: h.auto });
      return true;
    }
    moveTo(x, y) {
      if (this.mode !== "battle") return false;
      const h = this.hero;
      h.moveTarget = { x: clamp(x, this.bounds.left, this.bounds.right), y: clamp(y, this.bounds.top, this.bounds.bottom) };
      h.holdPosition = true;
      h.pendingAttack = false;
      h.queued = false;
      h.lastMove = direction(h, h.moveTarget);
      this.stats.moves++;
      this.log("move_command", { x: Math.round(h.moveTarget.x), y: Math.round(h.moveTarget.y) });
      this.emit("move");
      return true;
    }
    setMoveInput(x, y) {
      if (this.mode !== "battle") return;
      const h = this.hero, n = Math.hypot(x, y);
      h.input = n ? { x: x / n, y: y / n } : { x: 0, y: 0 };
      if (n) {
        h.moveTarget = null;
        h.holdPosition = true;
        h.pendingAttack = false;
        h.queued = false;
        h.lastMove = { ...h.input };
      }
    }
    selectTarget(id) {
      if (this.mode !== "battle") return false;
      const e = this.enemies.find((e2) => e2.id === id && !e2.dying);
      if (!e) return false;
      const h = this.hero;
      h.targetId = id;
      h.moveTarget = null;
      h.holdPosition = false;
      if (!h.action) this.face(e);
      this.emit("target", { id });
      return true;
    }
    setGuard(on) {
      const h = this.hero;
      if (!on) {
        h.guardRequested = false;
        h.guarding = false;
        return true;
      }
      if (this.mode !== "battle" || h.guardLock > 0 || h.stamina < 8 || h.dodge) return false;
      h.guardRequested = true;
      h.queued = false;
      h.pendingAttack = false;
      if (h.action && h.action.elapsed < h.action.impact * 0.7) h.action = null;
      if (!h.action) this.raiseGuard();
      return true;
    }
    raiseGuard() {
      const h = this.hero;
      if (h.guarding || h.guardLock > 0 || h.stamina < 8) return;
      const threat = this.enemies.filter((e) => !e.dying && e.telegraph && e.telegraph.type !== "quake").sort((a, b) => a.telegraph.duration - a.telegraph.elapsed - (b.telegraph.duration - b.telegraph.elapsed))[0];
      this.face(threat || this.target());
      h.guarding = true;
      h.guardAge = 0;
      h.guardParried = false;
      h.parryEnabled = this.time >= h.nextParry;
      h.nextParry = this.time + 0.8;
      this.stats.guard++;
      this.emit("guard");
    }
    requestAttack() {
      if (this.mode !== "battle") return false;
      const h = this.hero;
      if (h.dodge || h.guardLock > 0) return false;
      if (h.action) {
        h.queued = true;
        return true;
      }
      if (h.guarding && h.counter <= 0) return this.beginAction("bash");
      h.guardRequested = false;
      h.guarding = false;
      h.moveTarget = null;
      h.holdPosition = false;
      const e = this.target();
      if (e && distance(h, e) > 78) {
        h.pendingAttack = true;
        return true;
      }
      return this.beginAction(h.counter > 0 ? "counter" : "sword");
    }
    beginAction(kind = "sword") {
      const h = this.hero;
      if (h.action || h.dodge || h.guardLock > 0) return false;
      if (kind === "bash" && (h.stamina < 20 || h.bashCd > 0)) return false;
      this.face(this.target());
      let index = h.comboTime > 0 ? h.combo : 0;
      if (kind === "counter") index = 2;
      const cfg = kind === "bash" ? { duration: 0.5, impact: 0.23, power: 0.7, range: 77, arc: 1.2 } : COMBO[index];
      if (kind === "bash") {
        h.stamina -= 20;
        h.bashCd = 1.2;
        h.staminaDelay = 0.6;
        this.stats.bashes++;
      }
      if (kind === "counter") {
        h.counter = 0;
        this.stats.counters++;
      }
      h.action = { kind, index, elapsed: 0, duration: cfg.duration / h.speed, impact: cfg.impact / h.speed, power: kind === "counter" ? 3.2 : cfg.power, range: cfg.range, arc: cfg.arc, aim: { ...h.aim }, hit: false };
      h.pendingAttack = false;
      h.queued = false;
      h.guarding = false;
      h.walk = false;
      h.comboTime = 0;
      this.stats.attacks++;
      if (kind === "sword" && index === 2) this.stats.finishers++;
      this.log("attack_started", { kind, combo: index + 1 });
      this.emit("swing", { kind, index });
      return true;
    }
    impact(action) {
      const h = this.hero;
      let hit = false;
      for (const e of this.enemies.filter((e2) => !e2.dying)) {
        const d = distance(h, e), dir = direction(h, e), dot = dir.x * action.aim.x + dir.y * action.aim.y;
        if (d > action.range + (e.kind === "boss" ? 14 : 0) || dot < Math.cos(action.arc)) continue;
        const crit = this.random() < h.crit;
        if (crit) this.stats.crits++;
        let power = action.power;
        if (action.kind === "sword" && action.index === 2 && h.items.includes("furnace")) power *= 1.45;
        this.damage(e, h.attack * power * (crit ? 1.7 : 1), action.kind, crit);
        hit = true;
        if (action.kind === "counter" || action.kind === "bash" || action.index === 2) {
          if (e.kind !== "boss" || action.kind === "counter") {
            e.phase = action.kind === "counter" ? 1.2 : 0.6;
            e.telegraph = null;
          }
          if (e.kind !== "boss") {
            e.x += action.aim.x * 14;
            e.y += action.aim.y * 14;
            this.confine(e);
          }
        }
        if (action.index === 2 && h.items.includes("thunder")) for (const t of this.enemies.filter((t2) => !t2.dying && distance(t2, e) < 155).slice(0, 3)) {
          this.effects.push({ kind: "lightning", x: h.x, y: h.y - 35, toX: t.x, toY: t.y - 35, t: 0, duration: 0.3, r: 20, color: "#b4e5ed" });
          this.damage(t, 24, "lightning");
        }
      }
      if (hit) {
        this.hitStop = action.kind === "counter" ? 0.065 : 0.035;
        this.shake = action.index === 2 ? 3 : 1;
        this.emit("attack", { heavy: action.index === 2 });
      } else this.emit("miss");
      if (action.kind === "bash") this.effects.push({ kind: "shield", x: h.x + action.aim.x * 35, y: h.y + action.aim.y * 35, t: 0, duration: 0.3, r: 35, color: "#e1d6a6" });
    }
    skill(which) {
      if (which === "guard") return this.setGuard(true);
      if (which === "attack") return this.requestAttack();
      if (this.mode !== "battle") return false;
      const h = this.hero;
      if (which === "dodge") {
        if (h.dodge || h.dodgeCd > 0 || h.stamina < 22) return false;
        let dir;
        if (Math.hypot(h.input.x, h.input.y) > 0.1) dir = h.input;
        else if (h.moveTarget) dir = direction(h, h.moveTarget);
        else {
          const t = this.target();
          dir = t ? direction(t, h) : h.lastMove;
        }
        if (Math.hypot(dir.x, dir.y) < 0.1) dir = { x: h.facing, y: 0 };
        h.dodge = { x: dir.x, y: dir.y, time: 0.24, total: 0.24 };
        h.dodgeCd = 2.2;
        h.invulnerable = 0.29;
        h.stamina -= 22;
        h.staminaDelay = 0.5;
        h.action = null;
        h.combo = 0;
        h.comboTime = 0;
        h.queued = false;
        h.pendingAttack = false;
        h.moveTarget = null;
        h.holdPosition = true;
        h.guarding = false;
        h.guardRequested = false;
        this.stats.dodges++;
        this.log("dodge");
        this.emit("dodge");
        return true;
      }
      if (which === "burst") {
        if (h.burstCd > 0 || h.stamina < 30 || h.action || h.dodge || h.guarding) return false;
        h.burstCd = 8;
        h.stamina -= 30;
        h.staminaDelay = 0.5;
        this.stats.burst++;
        this.shake = 5;
        this.flash = 0.12;
        this.effects.push({ kind: "nova", x: h.x, y: h.y, t: 0, duration: 0.65, r: 145, color: "#b3f5e7" });
        for (const e of this.enemies.filter((e2) => !e2.dying && distance(e2, h) < 145)) {
          this.damage(e, h.items.includes("furnace") ? 84 : 56, "burst");
          if (e.kind !== "boss") {
            e.phase = 0.5;
            e.telegraph = null;
          }
        }
        this.log("skill_used", { skill: "burst" });
        this.emit("skill", { skill: "burst" });
        return true;
      }
      return false;
    }
    heal(amount) {
      const h = this.hero, actual = Math.min(amount, h.maxHp - h.hp);
      h.hp = Math.min(h.maxHp, h.hp + amount);
      if (actual > 0) this.float(h.x, h.y - 48, "+" + Math.ceil(actual), "#b6d698");
    }
    float(x, y, text, color = "#ede8ce", big = false) {
      this.texts.push({ x: x + (this.random() - 0.5) * 10, y, text, color, big, t: 0, duration: big ? 1.1 : 0.8 });
    }
    damage(e, amount, source = "sword", critical = false) {
      if (e.dying || this.mode !== "battle") return;
      const actual = Math.min(e.hp, amount);
      e.hp = Math.max(0, e.hp - amount);
      e.hurt = 0.16;
      this.stats.damage += actual;
      this.float(e.x, e.y - (e.kind === "boss" ? 124 : 58), Math.round(amount) + (critical ? "!" : ""), source === "burn" ? "#eba474" : critical ? "#f4d688" : source === "counter" ? "#d5f9e5" : "#e3e9d9", critical || source === "counter");
      this.effects.push({ kind: "hit", x: e.x, y: e.y - 30, t: 0, duration: 0.2, r: critical ? 25 : 15, color: source === "burn" ? "#f9a865" : "#d1e8da" });
      if (["sword", "counter"].includes(source) && this.hero.items.includes("ember")) e.burn = 3;
      if (e.hp <= 0) {
        e.dying = 0.6;
        e.telegraph = null;
        this.stats.kills++;
        this.stats.coins += e.kind === "boss" ? 100 : e.kind === "brute" ? 20 : 8;
        this.hero.stamina = clamp(this.hero.stamina + 7, 0, 100);
        this.effects.push({ kind: "soul", x: e.x, y: e.y - 20, t: 0, duration: 0.85, r: 5, color: "#b6dcd0", toX: this.hero.x, toY: this.hero.y - 30 });
        this.emit("kill", { kind: e.kind });
      }
    }
    hurtHero(amount, source = null, unblockable = false) {
      if (this.mode !== "battle") return;
      const h = this.hero;
      if (h.invulnerable > 0) {
        this.stats.evades++;
        this.emit("evade");
        return;
      }
      const dir = source ? direction(h, source) : h.aim, front = dir.x * h.aim.x + dir.y * h.aim.y > 0.15;
      if (h.guarding && front && !unblockable) {
        const perfect = h.parryEnabled && !h.guardParried && h.guardAge <= (h.items.includes("aegis") ? 0.42 : 0.29);
        if (perfect) {
          h.guardParried = true;
          h.counter = 2.2;
          h.stamina = clamp(h.stamina + 12, 0, 100);
          this.stats.blocked += amount;
          this.stats.perfectGuards++;
          if (source && "phase" in source) {
            source.phase = 0.9;
            source.telegraph = null;
          }
          if (h.items.includes("aegis")) this.heal(12);
          this.hitStop = 0.055;
          this.effects.push({ kind: "shield", x: h.x + h.aim.x * 26, y: h.y + h.aim.y * 26, t: 0, duration: 0.4, r: 55, color: "#f5e4a6" });
          this.log("perfect_parry");
          this.emit("perfect");
          return;
        }
        const cost = amount * 0.75 * (h.items.includes("iron") ? 0.7 : 1), fraction = Math.min(1, h.stamina / cost), blocked = amount * 0.9 * fraction;
        h.stamina = Math.max(0, h.stamina - cost);
        h.staminaDelay = 0.65;
        this.stats.blocked += blocked;
        amount -= blocked;
        this.emit("block");
        if (h.stamina <= 0) {
          h.guarding = false;
          h.guardRequested = false;
          h.guardLock = 0.75;
          this.emit("guardBreak");
        }
      }
      const actual = Math.min(h.hp, amount);
      h.hp = Math.max(0, h.hp - amount);
      h.hurt = 0.2;
      this.stats.received += actual;
      this.float(h.x, h.y - 72, "−" + Math.ceil(actual), "#f0ab99");
      this.shake = unblockable ? 5 : 2;
      this.emit("hurt");
      if (h.hp <= 0) this.finish(false);
    }
    spawn(kind, index = 0, total = 1) {
      const boss = kind === "boss", m = 1 + this.stage * 0.18, hp = boss ? 2200 : kind === "brute" ? 148 * m : kind === "caster" ? 68 * m : 76 * m;
      const e = { id: ++this.id, kind, x: boss ? 220 : 80 + (index + 0.4) / Math.max(1, total) * 270 + (this.random() - 0.5) * 24, y: boss ? 282 : 278 + Math.sin((index + 0.5) / total * Math.PI) * 32, hp, maxHp: hp, attack: boss ? 30 : kind === "brute" ? 21 : kind === "caster" ? 12 : 13, speed: kind === "brute" ? 29 : kind === "caster" ? 27 : 40, radius: boss ? 37 : kind === "brute" ? 26 : 19, timer: 1 + index * 0.35, anim: 0, hurt: 0, dying: 0, phase: 1, burn: 0, burnTick: 0.7, telegraph: null, slamTimer: boss ? 5 : 0, summonTimer: boss ? 21 : 0, facing: 1 };
      this.enemies.push(e);
      this.effects.push({ kind: "spawn", x: e.x, y: e.y, t: 0, duration: 1, color: boss ? "#b06148" : "#8cbdad", r: e.radius * 1.8 });
      return e;
    }
    spawnWave() {
      const list = STAGES[this.stage].waves[this.wave];
      if (!list) return;
      list.forEach((type, i) => this.spawn(type, i, list.length));
      this.wave++;
      this.log("wave_start", { stage: this.stage + 1, wave: this.wave });
      this.emit("wave", { wave: this.wave, total: STAGES[this.stage].waves.length });
    }
    beginEnemyAttack(e, type) {
      const h = this.hero, duration = type === "quake" ? 1.45 : type === "projectile" ? 1.05 : e.kind === "brute" ? 1.1 : e.kind === "boss" ? 0.95 : 0.78;
      e.telegraph = { type, elapsed: 0, duration, x: h.x, y: h.y, aim: direction(e, h), r: type === "quake" ? 82 : e.kind === "boss" ? 106 : 83 };
      this.emit("warning", { kind: type, enemy: e.kind });
    }
    resolveEnemyAttack(e, a) {
      e.anim = 0.38;
      e.timer = e.kind === "boss" ? 1.3 : e.kind === "brute" ? 2 : 1.8;
      if (a.type === "quake") {
        if (distance(this.hero, a) < a.r) this.hurtHero(88, e, true);
        this.effects.push({ kind: "quake", x: a.x, y: a.y, t: 0, duration: 0.55, r: a.r, color: "#dd8462" });
        this.emit("slam");
      } else if (a.type === "projectile") {
        const aim = direction(e, a);
        this.projectiles.push({ x: e.x, y: e.y, vx: aim.x * 178, vy: aim.y * 178, damage: e.attack, life: 3, color: "#d99b86", owner: e.id });
      } else {
        const dir = direction(e, this.hero);
        if (distance(e, this.hero) < a.r && dir.x * a.aim.x + dir.y * a.aim.y > 0.35) this.hurtHero(e.attack, e);
      }
    }
    choose(id) {
      if (this.mode !== "loot" || !this.choices.includes(id)) return false;
      const h = this.hero;
      h.items.push(id);
      this.stats.items.push(id);
      if (id === "ember") h.attack += 5;
      if (id === "storm") {
        h.speed = 1.2;
        h.crit += 0.15;
      }
      if (id === "iron") {
        h.maxHp += 60;
        h.hp += 60;
      }
      if (id === "thunder") h.crit += 0.1;
      this.heal(h.maxHp * 0.4);
      h.stamina = 100;
      h.burstCd = 0;
      h.dodgeCd = 0;
      h.action = null;
      h.combo = 0;
      h.comboTime = 0;
      h.counter = 0;
      h.moveTarget = null;
      h.holdPosition = false;
      h.x = 220;
      h.y = Math.min(420, this.bounds.bottom);
      this.resetInput();
      this.log("equipment_selected", { item: id, stage: this.stage + 1 });
      this.stage++;
      this.wave = 0;
      this.nextWave = 2;
      this.stageTime = 0;
      this.enemies = [];
      this.projectiles = [];
      this.effects = [];
      this.texts = [];
      this.mode = "battle";
      this.emit("stage", { stage: this.stage });
      return true;
    }
    clearStage() {
      if (this.mode !== "battle") return;
      this.resetInput();
      this.hero.action = null;
      this.hero.pendingAttack = false;
      this.projectiles = [];
      this.stats.stages.push({ stage: this.stage + 1, seconds: +this.stageTime.toFixed(1), hp: Math.ceil(this.hero.hp) });
      this.log("stage_complete", { stage: this.stage + 1 });
      if (this.stage === 2) {
        this.finish(true);
        return;
      }
      this.mode = "loot";
      this.choices = this.stage === 0 ? ["ember", "storm", "iron"] : ["furnace", "thunder", "aegis"];
      this.emit("loot", { choices: this.choices });
    }
    finish(won) {
      if (this.mode === "result") return;
      this.resetInput();
      this.mode = "result";
      this.stats.time = +this.time.toFixed(1);
      this.stats.won = won;
      this.stats.stage = this.stage + 1;
      for (const key of ["damage", "received", "blocked"]) this.stats[key] = Math.round(this.stats[key]);
      this.log("run_end", { won });
      this.emit("result", { won, stats: this.stats });
    }
    updateHero(dt) {
      const h = this.hero;
      for (const key of ["burstCd", "dodgeCd", "bashCd", "invulnerable", "counter", "guardLock", "staminaDelay", "comboTime", "hurt"]) h[key] = Math.max(0, h[key] - dt);
      if (h.dodge) {
        h.dodge.time -= dt;
        h.x += h.dodge.x * 420 * dt;
        h.y += h.dodge.y * 420 * dt;
        h.walk = false;
        if (h.dodge.time <= 0) h.dodge = null;
        this.confine(h);
        return;
      }
      if (h.guarding) {
        h.guardAge += dt;
        h.stamina = Math.max(0, h.stamina - 5 * dt);
        if (h.stamina <= 0) {
          h.guarding = false;
          h.guardRequested = false;
          h.guardLock = 0.75;
          this.emit("guardBreak");
        }
      } else if (h.staminaDelay === 0) h.stamina = clamp(h.stamina + 22 * dt, 0, 100);
      if (h.action) {
        const a = h.action;
        a.elapsed += dt;
        if (!a.hit && a.elapsed >= a.impact) {
          a.hit = true;
          this.impact(a);
        }
        if (a.elapsed >= a.duration) {
          h.action = null;
          h.combo = a.kind === "sword" ? (a.index + 1) % 3 : 0;
          h.comboTime = 1.05;
          if (h.guardRequested) this.raiseGuard();
          else if (h.queued) {
            h.queued = false;
            this.requestAttack();
          }
        }
        h.walk = false;
        return;
      }
      if (h.guardRequested && !h.guarding) this.raiseGuard();
      const input = Math.hypot(h.input.x, h.input.y) > 0.1;
      let dir = null;
      const target = this.target();
      if (input) dir = h.input;
      else if (h.moveTarget) {
        if (distance(h, h.moveTarget) > 4) dir = direction(h, h.moveTarget);
        else h.moveTarget = null;
      } else if (!h.holdPosition && !h.guarding && target && distance(h, target) > 65) dir = direction(h, target);
      if (dir) {
        const speed = h.guarding ? 48 : 125;
        h.x += dir.x * speed * dt;
        h.y += dir.y * speed * dt;
        h.walk = true;
        if (!h.guarding) {
          h.aim = { ...dir };
          if (Math.abs(dir.x) > 0.08) h.facing = dir.x < 0 ? -1 : 1;
        }
      } else h.walk = false;
      this.confine(h);
      if (target && !dir && !h.guarding) this.face(target);
      if (!h.guarding && h.guardLock === 0 && (h.pendingAttack || h.auto) && target && distance(h, target) <= 78 && !input && !h.moveTarget) this.beginAction(h.counter > 0 ? "counter" : "sword");
    }
    update(dt) {
      dt = clamp(dt, 0, 0.04);
      this.visualTime += dt;
      if (this.mode === "paused") return;
      for (const f of this.effects) f.t += dt;
      this.effects = this.effects.filter((f) => f.t < f.duration);
      for (const n of this.texts) n.t += dt;
      this.texts = this.texts.filter((n) => n.t < n.duration);
      this.shake = Math.max(0, this.shake - dt * 25);
      this.flash = Math.max(0, this.flash - dt);
      if (this.mode !== "battle") return;
      if (this.hitStop > 0) {
        this.hitStop = Math.max(0, this.hitStop - dt);
        return;
      }
      this.time += dt;
      this.stageTime += dt;
      this.updateHero(dt);
      const h = this.hero;
      for (const e of [...this.enemies]) {
        if (this.mode !== "battle") return;
        if (e.dying) {
          e.dying -= dt;
          if (e.dying <= 0) e.remove = true;
          continue;
        }
        e.hurt = Math.max(0, e.hurt - dt);
        e.anim = Math.max(0, e.anim - dt);
        e.phase = Math.max(0, e.phase - dt);
        e.walk = false;
        if (e.burn > 0) {
          e.burn -= dt;
          e.burnTick -= dt;
          if (e.burnTick <= 0) {
            e.burnTick = 0.7;
            this.damage(e, 8, "burn");
            if (e.dying) continue;
          }
        }
        if (e.phase > 0) continue;
        if (e.telegraph) {
          const a = e.telegraph;
          a.elapsed += dt;
          if (a.elapsed >= a.duration) {
            e.telegraph = null;
            this.resolveEnemyAttack(e, a);
          }
          continue;
        }
        e.timer -= dt;
        if (e.kind === "boss") {
          e.slamTimer -= dt;
          e.summonTimer -= dt;
          if (e.slamTimer <= 0) {
            e.slamTimer = e.hp < e.maxHp * 0.45 ? 6 : 8;
            this.beginEnemyAttack(e, "quake");
            continue;
          }
          if (e.summonTimer <= 0) {
            e.summonTimer = 24;
            this.spawn("wraith", 0, 2);
            this.spawn("wraith", 1, 2);
            this.emit("summon");
          }
        }
        const dist = distance(e, h), dir = direction(e, h), stop = e.kind === "caster" ? 140 : e.kind === "boss" ? 74 : 53;
        if (Math.abs(dir.x) > 0.1) e.facing = dir.x < 0 ? -1 : 1;
        if (dist > stop) {
          e.x += dir.x * e.speed * dt;
          e.y += dir.y * e.speed * dt;
          e.walk = true;
        } else if (e.timer <= 0) this.beginEnemyAttack(e, e.kind === "caster" ? "projectile" : "melee");
        this.confine(e);
      }
      if (this.mode !== "battle") return;
      this.enemies = this.enemies.filter((e) => !e.remove);
      const live = this.enemies.filter((e) => !e.dying);
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j], d = distance(a, b), min = (a.radius + b.radius) * 0.85;
        if (d < min && d > 0.01) {
          const q = (min - d) * 0.4, dir = direction(a, b);
          if (!a.telegraph) {
            a.x -= dir.x * q;
            a.y -= dir.y * q;
            this.confine(a);
          }
          if (!b.telegraph) {
            b.x += dir.x * q;
            b.y += dir.y * q;
            this.confine(b);
          }
        }
      }
      for (const p of this.projectiles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (distance(p, h) < 18) {
          p.done = true;
          this.hurtHero(p.damage, { x: p.x - p.vx * 0.1, y: p.y - p.vy * 0.1 });
          if (this.mode !== "battle") return;
        }
        if (p.life <= 0) p.done = true;
      }
      this.projectiles = this.projectiles.filter((p) => !p.done);
      if (!this.enemies.length) {
        this.nextWave -= dt;
        if (this.nextWave <= 0) {
          if (this.wave < STAGES[this.stage].waves.length) {
            this.spawnWave();
            this.nextWave = 1.2;
          } else this.clearStage();
        }
      }
    }
  };

  // motion.js
  var mix = (a, b, t) => a + (b - a) * t;
  var smooth = (t) => t * t * (3 - 2 * t);
  function swordPose(action, aim = { x: 1, y: 0 }, facing = 1) {
    const rest = { x: 27, y: -28, angle: 0.25 };
    if (!action || action.kind === "bash") return rest;
    const theta = Math.atan2(aim.y, aim.x * facing), base = theta + Math.PI / 2;
    const p = Math.min(1, Math.max(0, action.elapsed / action.duration)), impact = action.impact / action.duration;
    const thrust = action.kind === "counter" || action.index === 2, reverse = action.index === 1;
    const reach = { x: 17 + Math.cos(theta) * 25, y: -43 + Math.sin(theta) * 20, angle: base };
    const wind = thrust ? { x: 17, y: -42, angle: base } : { x: 17 + Math.cos(theta + (reverse ? 1.2 : -1.2)) * 19, y: -43 + Math.sin(theta + (reverse ? 1.2 : -1.2)) * 20, angle: base + (reverse ? 1.65 : -1.65) };
    const follow = thrust ? { ...reach, x: reach.x + Math.cos(theta) * 4, y: reach.y + Math.sin(theta) * 4 } : { x: 17 + Math.cos(theta + (reverse ? -1.25 : 1.25)) * 23, y: -43 + Math.sin(theta + (reverse ? -1.25 : 1.25)) * 20, angle: base + (reverse ? -1.35 : 1.35) };
    const keys = [[0, rest], [impact * 0.6, wind], [impact, reach], [Math.min(0.82, impact + 0.19), follow], [1, rest]];
    for (let i = 1; i < keys.length; i++) if (p <= keys[i][0]) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i], q = smooth((p - t0) / (t1 - t0));
      return { x: mix(a.x, b.x, q), y: mix(a.y, b.y, q), angle: mix(a.angle, b.angle, q) };
    }
    return rest;
  }
  function armElbow(hand) {
    const shoulder = { x: 16, y: -48 }, upper = 21, lower = 21, dx = hand.x - shoulder.x, dy = hand.y - shoulder.y;
    const d = Math.min(upper + lower - 1e-3, Math.max(1e-3, Math.hypot(dx, dy))), a = Math.atan2(dy, dx), bend = Math.acos(Math.max(-1, Math.min(1, (upper * upper + d * d - lower * lower) / (2 * upper * d))));
    return { x: shoulder.x + Math.cos(a + bend) * upper, y: shoulder.y + Math.sin(a + bend) * upper };
  }

  // art.js
  var TAU = Math.PI * 2;
  function rng(seed) {
    return () => {
      seed = seed * 1664525 + 1013904223 >>> 0;
      return seed / 4294967296;
    };
  }
  function poly(c, p, fill, stroke, width = 1) {
    c.beginPath();
    p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.stroke();
    }
  }
  function line(c, p, color, width = 1) {
    c.beginPath();
    p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  }
  function oval(c, x, y, rx, ry, color) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    c.fillStyle = color;
    c.fill();
  }
  function glow(c, x, y, r, color) {
    const g2 = c.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, color);
    g2.addColorStop(1, "transparent");
    c.fillStyle = g2;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function metal(c, x1, y1, x2, y2, colors = ["#253640", "#758986", "#34454d"]) {
    const g2 = c.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((color, i) => g2.addColorStop(i / (colors.length - 1), color));
    return g2;
  }
  function rune(c, x, y, size, color, kind = 0) {
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    c.lineWidth = 1.2;
    c.strokeStyle = color;
    c.beginPath();
    if (kind % 4 === 0) {
      c.moveTo(0, -5);
      c.lineTo(0, 5);
      c.moveTo(-4, -2);
      c.lineTo(0, -5);
      c.lineTo(4, -2);
      c.moveTo(-4, 2);
      c.lineTo(0, 5);
      c.lineTo(4, 2);
    } else if (kind % 4 === 1) {
      c.moveTo(-3, 5);
      c.lineTo(-3, -5);
      c.lineTo(3, -1);
      c.lineTo(-3, 1);
      c.moveTo(-3, 0);
      c.lineTo(4, 5);
    } else if (kind % 4 === 2) {
      c.moveTo(-4, 3);
      c.lineTo(0, -5);
      c.lineTo(4, 3);
      c.lineTo(-4, 3);
      c.moveTo(0, 3);
      c.lineTo(0, 6);
    } else {
      c.moveTo(-3, -4);
      c.lineTo(3, -4);
      c.lineTo(-3, 4);
      c.lineTo(3, 4);
      c.moveTo(0, -6);
      c.lineTo(0, 6);
    }
    c.stroke();
    c.restore();
  }
  var WorldArt = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.c = canvas.getContext("2d", { alpha: false });
      this.width = 440;
      this.height = 820;
      this.offset = 0;
      this.cache = null;
      this.battleOffset = 160;
      this.motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.resize();
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this.width = r.width;
      this.height = r.height;
      this.dpr = dpr;
      this.scale = r.width / 440;
      this.logicalH = r.height / this.scale;
      this.offset = (this.logicalH - 820) * 0.45;
      this.cache = document.createElement("canvas");
      this.cache.width = 880;
      this.cache.height = Math.ceil(this.logicalH * 2);
      const c = this.cache.getContext("2d");
      c.scale(2, 2);
      this.background(c);
    }
    screenToWorld(x, y) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (x - r.left) / this.scale, y: (y - r.top) / this.scale - this.battleOffset };
    }
    background(c) {
      const o = this.offset, H = this.logicalH, random = rng(47291);
      const sky = c.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#101c26");
      sky.addColorStop(0.35, "#233940");
      sky.addColorStop(0.64, "#18252a");
      sky.addColorStop(1, "#080f15");
      c.fillStyle = sky;
      c.fillRect(0, 0, 440, H);
      glow(c, 322, 140 + o * 0.3, 160, "#69868733");
      oval(c, 322, 138 + o * 0.3, 38, 38, "#98aaa451");
      oval(c, 309, 128 + o * 0.3, 37, 37, "#17262e");
      for (let i = 0; i < 75; i++) {
        c.globalAlpha = 0.12 + random() * 0.2;
        c.fillStyle = "#a2c3c3";
        c.fillRect(random() * 440, 70 + random() * 210, 1, 1);
      }
      c.globalAlpha = 1;
      poly(c, [[0, 190], [33, 158], [49, 171], [78, 128], [102, 176], [139, 157], [174, 218], [245, 171], [276, 155], [329, 182], [368, 153], [397, 192], [440, 169], [440, 400], [0, 400]], "#111e28");
      for (const [x, y, w] of [[5, 174, 37], [71, 121, 23], [350, 160, 36], [414, 136, 30]]) {
        c.fillStyle = "#0c1822";
        c.fillRect(x, y + o * 0.2, w, 210);
        poly(c, [[x - 3, y + o * 0.2], [x + w / 2, y - 30 + o * 0.2], [x + w + 3, y + o * 0.2]], "#111c25");
        for (let j = 0; j < 3; j++) {
          c.fillStyle = "#28413e";
          c.fillRect(x + w * 0.4, y + 32 + j * 36 + o * 0.2, 4, 12);
        }
      }
      const floor = c.createLinearGradient(0, 300 + o, 0, H);
      floor.addColorStop(0, "#1b292e");
      floor.addColorStop(0.5, "#233037");
      floor.addColorStop(1, "#101b21");
      poly(c, [[0, 365 + o], [135, 278 + o], [303, 278 + o], [440, 365 + o], [440, H], [0, H]], floor);
      for (let row = 0; row < 17; row++) {
        const yy = 327 + o + row * 32;
        for (let col = -7; col < 8; col++) {
          const xx = 220 + col * 57 + row % 2 * 28;
          const p = [[xx, yy - 15], [xx + 27, yy], [xx, yy + 15], [xx - 27, yy]];
          const k = Math.floor(random() * 13);
          poly(c, p, `rgb(${28 + k},${41 + k},${46 + k})`, "#0e1b2299", 1.3);
          if (random() > 0.4) line(c, [[xx - 23, yy], [xx, yy - 12], [xx + 23, yy]], "#8aada51a", 0.8);
          if (random() > 0.6) line(c, [[xx + 5, yy - 6], [xx - 4, yy], [xx + 2, yy + 6]], "#0a141977", 0.9);
        }
      }
      const archY = 185 + o * 0.6;
      for (const [x, w] of [[-5, 140], [306, 150]]) {
        poly(c, [[x, archY - 20], [x + w, archY + 4], [x + w, archY + 200], [x, archY + 245]], "#18262e", "#31454a");
        for (let row = 0; row < 7; row++) for (let col = 0; col < 4; col++) {
          const xx = x + col * 38 - row % 2 * 19, yy = archY + row * 29;
          poly(c, [[xx, yy], [xx + 36, yy + 2], [xx + 36, yy + 27], [xx, yy + 25]], metal(c, xx, yy, xx, yy + 26, ["#304249", "#1c2b33"]), "#101d25", 1.2);
        }
      }
      c.beginPath();
      c.moveTo(134, 385 + o * 0.6);
      c.lineTo(134, archY + 66);
      c.quadraticCurveTo(134, archY - 18, 220, archY - 64);
      c.quadraticCurveTo(306, archY - 18, 306, archY + 66);
      c.lineTo(306, 385 + o * 0.6);
      c.closePath();
      c.fillStyle = "#0a141d";
      c.fill();
      c.strokeStyle = "#3a4c50";
      c.lineWidth = 21;
      c.stroke();
      c.strokeStyle = "#7e928355";
      c.lineWidth = 2;
      c.stroke();
      for (let i = 0; i < 13; i++) {
        const a = Math.PI + i / 12 * Math.PI, xx = 220 + 87 * Math.cos(a), yy = archY + 52 + 114 * Math.sin(a);
        line(c, [[xx, yy], [xx + 10 * Math.cos(a), yy + 13 * Math.sin(a)]], "#08151f", 3);
      }
      const gateGlow = c.createRadialGradient(220, archY + 100, 0, 220, archY + 100, 118);
      gateGlow.addColorStop(0, "#60948935");
      gateGlow.addColorStop(1, "transparent");
      c.fillStyle = gateGlow;
      c.fillRect(138, archY - 25, 165, 223);
      for (let x = 154; x < 300; x += 15) line(c, [[x, archY + 15 + Math.abs(x - 220) * 0.7], [x, archY + 195]], "#455b5740", 2);
      rune(c, 220, archY + 58, 5, "#a7cfb27a");
      glow(c, 220, archY + 58, 34, "#a7ceb127");
      for (let s = 0; s < 4; s++) {
        const y = 379 + o * 0.6 + s * 10;
        poly(c, [[135 - s * 10, y], [304 + s * 10, y], [315 + s * 10, y + 9], [125 - s * 10, y + 9]], "#304047", "#5b71683a");
      }
      c.save();
      c.translate(220, 495 + o);
      c.scale(1, 0.53);
      for (const [r, col] of [[153, "#678b6a39"], [147, "#78977732"], [119, "#7d9f7a26"], [116, "#93b18d20"]]) {
        c.strokeStyle = col;
        c.lineWidth = 1.3;
        c.beginPath();
        c.arc(0, 0, r, 0, TAU);
        c.stroke();
      }
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU;
        c.save();
        c.translate(Math.cos(a) * 133, Math.sin(a) * 133);
        c.rotate(a + Math.PI / 2);
        rune(c, 0, 0, 1.4, "#8aab852f", i);
        c.restore();
      }
      poly(c, [[0, -108], [94, 54], [-94, 54]], null, "#90ad8220", 1.2);
      poly(c, [[0, 108], [94, -54], [-94, -54]], null, "#90ad8220", 1.2);
      c.restore();
      for (const x of [28, 410]) {
        const y = 371 + o;
        oval(c, x, y + 89, 31, 14, "#050d1455");
        poly(c, [[x - 22, y - 89], [x + 12, y - 94], [x + 22, y + 76], [x - 25, y + 84]], metal(c, x - 25, y, x + 22, y, ["#15232a", "#455953", "#22343b"]), "#0e1b24", 2);
        poly(c, [[x + 12, y - 94], [x + 25, y - 78], [x + 33, y + 78], [x + 22, y + 76]], "#101d24");
        for (let z = 0; z < 5; z++) line(c, [[x - 22, y - 66 + z * 30], [x + 19, y - 72 + z * 30]], "#0b1720", 2);
        poly(c, [[x - 30, y - 101], [x + 17, y - 107], [x + 29, y - 91], [x - 25, y - 85]], "#465b58", "#60796a44");
        poly(c, [[x - 32, y + 76], [x + 28, y + 69], [x + 36, y + 87], [x - 36, y + 94]], "#33473f", "#71837133");
      }
      for (let i = 0; i < 70; i++) {
        const x = random() * 440, y = 360 + o + random() * (H - 360 - o), r = 1 + random() * 4;
        poly(c, [[x - r, y], [x, y - r * 0.6], [x + r * 1.4, y - 1], [x + r, y + r * 0.4]], "#52625755");
      }
      for (let i = 0; i < 52; i++) {
        const side = i % 2, x = side ? 420 + random() * 30 : random() * 22, y = 480 + random() * (H - 480);
        line(c, [[x, y], [x + (random() - 0.5) * 18, y - 12 - random() * 23]], "#334538", 1);
      }
      const fade = c.createLinearGradient(0, H - 170, 0, H);
      fade.addColorStop(0, "transparent");
      fade.addColorStop(1, "#050b11");
      c.fillStyle = fade;
      c.fillRect(0, H - 170, 440, 170);
    }
    drawKnight(c, x, y, s, t, h = {}) {
      c.save();
      c.translate(x, y);
      c.scale(s * (h.facing || 1), s);
      const bob = h.action ? 0 : h.walk ? Math.sin(t * 12) * 1.2 : Math.sin(t * 2) * 0.35;
      c.translate(0, bob);
      oval(c, 0, 1, 25, 8, "#02090e99");
      const wind = Math.sin(t * 2.3) * 3;
      poly(c, [[-15, -54], [13, -53], [26 + wind, -5], [13, 2], [7, -3], [0, 6], [-8, 1], [-21, 5], [-31 + wind, -5]], "#17333e", "#41626a", 0.7);
      poly(c, [[-12, -51], [-5, -42], [-12, 0], [-21, 5], [-22, -5]], "#29505a");
      poly(c, [[5, -51], [11, -35], [18, -2], [8, -4], [1, 2]], "#0c222d");
      line(c, [[-9, -49], [-14, -25], [-14, -4]], "#54767555", 0.8);
      const step = h.walk ? Math.sin(t * 12) * 3 : 0;
      for (const [lx, st] of [[-9, step], [9, -step]]) {
        poly(c, [[lx - 5, -28], [lx + 5, -29], [lx + 5, -12 + st], [lx + 1, -3 + st], [lx - 7, -4 + st]], metal(c, lx - 5, 0, lx + 5, 0), "#12262c", 0.8);
        poly(c, [[lx - 6, -10 + st], [lx + 3, -10 + st], [lx + 7, -1 + st], [lx + 5, 3 + st], [lx - 8, 3 + st]], "#23333b", "#81908366", 0.7);
        line(c, [[lx, -23], [lx + 1, -12 + st]], "#b7c0a780", 0.8);
      }
      poly(c, [[-15, -54], [0, -59], [15, -54], [12, -33], [5, -25], [-9, -28], [-14, -36]], metal(c, -13, -55, 14, -29, ["#31464d", "#afbaad", "#3b5459", "#19323c"]), "#152831", 1);
      poly(c, [[0, -56], [2, -36], [-8, -30], [-11, -42]], "#536e6b");
      line(c, [[-10, -48], [0, -43], [10, -48]], "#d4d6b677", 1);
      line(c, [[1, -55], [3, -36], [10, -31]], "#bac7aa88", 0.8);
      poly(c, [[-14, -34], [13, -34], [14, -28], [-12, -28]], "#192b32", "#a2a78977", 0.8);
      poly(c, [[-2, -34], [4, -34], [4, -27], [-2, -27]], "#bcab78");
      poly(c, [[-15, -57], [-25, -50], [-21, -39], [-10, -43], [-9, -52]], metal(c, -24, -52, -9, -40, ["#3c5356", "#a8b9ab", "#345057"]), "#112c35");
      poly(c, [[13, -57], [23, -50], [23, -40], [11, -43], [9, -52]], metal(c, 10, -52, 23, -41, ["#506b68", "#a6b7a5", "#2a414a"]), "#172c32");
      line(c, [[-24, -49], [-18, -44], [-11, -46]], "#d0ceaa77", 0.7);
      line(c, [[13, -51], [21, -47], [22, -42]], "#d0ceaa77", 0.7);
      poly(c, [[-10, -71], [0, -77], [10, -71], [12, -59], [5, -52], [-6, -52], [-12, -59]], metal(c, -12, -72, 10, -54, ["#2b4049", "#bcc4b0", "#536e70", "#233d46"]), "#0b202c", 1);
      poly(c, [[-9, -65], [0, -63], [9, -65], [8, -60], [0, -58], [-8, -60]], "#07131e");
      line(c, [[-7, -62], [-2, -61]], "#b8f9ed", 1.4);
      line(c, [[2, -61], [7, -62]], "#b8f9ed", 1.4);
      line(c, [[0, -75], [0, -64], [2, -56]], "#ccd4bdaa", 1);
      poly(c, [[-3, -78], [0, -87], [3, -78], [2, -70], [-1, -71]], "#9ca58b");
      const guard = h.guarding || h.action?.kind === "bash", bash = h.action?.kind === "bash" ? Math.sin(Math.min(1, h.action.elapsed / h.action.duration) * Math.PI) * 13 : 0;
      c.save();
      c.translate(guard ? 10 + bash : -23, guard ? -44 : -34);
      c.rotate(guard ? 0.12 : -0.15);
      if (guard) {
        glow(c, 0, 0, 35, h.counter > 0 ? "#edcf8644" : "#c1ecd32a");
        line(c, [[-20, 0], [-8, 6], [0, 0]], "#7a9086", 7);
      }
      poly(c, [[-12, -13], [1, -19], [15, -13], [12, 8], [1, 20], [-10, 9]], metal(c, -10, -12, 15, 13, ["#293c45", "#637e77", "#253d44"]), guard ? "#e3dbac" : "#b8bda080", guard ? 2 : 1.5);
      poly(c, [[-6, -10], [1, -13], [8, -10], [7, 6], [1, 12], [-5, 5]], "#233b42", "#9cae8b99", 1);
      rune(c, 1, 0, 1.05, "#bedac0");
      c.restore();
      const pose = swordPose(h.action, h.action?.aim || h.aim, h.facing || 1), elbow = armElbow(pose);
      if (h.action && h.action.kind !== "bash" && h.action.elapsed > h.action.impact * 0.62 && h.action.elapsed < h.action.impact + 0.17) {
        const trail = [];
        for (let i = 5; i >= 0; i--) {
          const q = swordPose({ ...h.action, elapsed: Math.max(0, h.action.elapsed - i * 0.013) }, h.action.aim, h.facing || 1);
          trail.push([q.x + Math.sin(q.angle) * 58, q.y - Math.cos(q.angle) * 58]);
        }
        line(c, trail, h.action.kind === "counter" ? "#f1daa9aa" : "#bcf1df88", 4);
        line(c, trail, "#e7ffeecc", 1);
      }
      line(c, [[16, -48], [elbow.x, elbow.y], [pose.x, pose.y]], "#182e36", 10);
      line(c, [[16, -48], [elbow.x, elbow.y]], "#8caaa1", 7);
      line(c, [[elbow.x, elbow.y], [pose.x, pose.y]], "#536f72", 7);
      oval(c, elbow.x, elbow.y, 4.5, 4.5, "#a0b5a7");
      c.save();
      c.translate(pose.x, pose.y);
      c.rotate(pose.angle);
      poly(c, [[-3, -8], [-3, -47], [0, -63], [4, -47], [3, -8]], metal(c, -3, 0, 4, 0, ["#6b9093", "#eef4d7", "#75bbc0"]), "#9ee7dc88", 0.7);
      line(c, [[0, -49], [0, -8]], "#b7f5e5", 1);
      poly(c, [[-11, -7], [-8, -11], [8, -11], [12, -7], [7, -5], [-7, -5]], "#a2a278", "#dae0b477");
      poly(c, [[-2, -4], [3, -4], [3, 8], [-2, 8]], "#33434a", "#a9ab8a");
      oval(c, 0.5, 10, 3, 3, "#a5b18e");
      for (let j = 0; j < 3; j++) rune(c, 0, -18 - j * 9, 0.35, "#28545c", j);
      oval(c, 0, 0, 4.5, 4, "#688d87");
      c.restore();
      if (h.counter > 0) {
        glow(c, pose.x, pose.y, 29, "#ffe7a53a");
        rune(c, 0, -100, 1.1, "#f6dfaa");
      }
      if (h.hurt > 0) {
        c.globalCompositeOperation = "screen";
        glow(c, 0, -40, 43, "#d7815444");
      }
      c.restore();
    }
    drawEnemy(c, e, t) {
      const boss = e.kind === "boss", brute = e.kind === "brute", caster = e.kind === "caster";
      const s = boss ? 1.9 : brute ? 1.25 : 1;
      c.save();
      c.translate(e.x, e.y);
      c.scale(s, s);
      if (e.dying) c.globalAlpha = Math.min(1, e.dying / 0.6);
      const bob = e.walk ? Math.sin(t * 10 + e.id) * 1.8 : Math.sin(t * 2 + e.id);
      c.translate(0, bob);
      oval(c, 0, 0, boss ? 29 : 23, 8, "#03091099");
      const at = e.telegraph ? Math.sin(e.telegraph.elapsed / e.telegraph.duration * Math.PI / 2) * 13 : e.anim > 0 ? -Math.sin(e.anim / 0.4 * Math.PI) * 9 : 0;
      if (!brute && !boss) {
        const hue = caster ? ["#352b38", "#71616a", "#271f2d"] : ["#26383c", "#4c6a66", "#132a33"];
        poly(c, [[-12, -49], [10, -48], [22, -1], [11, 2], [4, -3], [-3, 5], [-9, 0], [-23, 2]], metal(c, -20, -40, 20, 0, hue), "#11212c", 1);
        poly(c, [[-8, -44], [-2, -29], [-7, 1], [-13, -1]], caster ? "#5e4352" : "#426058");
        line(c, [[4, -42], [8, -16], [12, -1]], "#8ca38b44", 1);
        poly(c, [[-11, -52], [-6, -67], [3, -70], [13, -53], [9, -43], [-8, -44]], metal(c, -10, -60, 10, -40, hue));
        poly(c, [[-7, -55], [0, -62], [7, -55], [5, -47], [-5, -48]], "#07151e");
        line(c, [[-5, -53], [-1, -52]], caster ? "#efb58d" : "#c1bd9b", 1.4);
        line(c, [[2, -52], [6, -53]], caster ? "#efb58d" : "#c1bd9b", 1.4);
        poly(c, [[-10, -47], [-22, -36], [-20, -22 - at], [-15, -24 - at], [-13, -35]], hue[1]);
        poly(c, [[10, -47], [20, -34], [21, -20 - at], [15, -18 - at], [13, -36]], hue[0]);
        if (caster) {
          line(c, [[20, -7], [23, -65]], "#867963", 3);
          poly(c, [[17, -63], [23, -74], [28, -62], [23, -56]], "#b88174", "#dcc5a188", 1);
          glow(c, 23, -65, 17, "#efac7555");
          rune(c, 23, -64, 0.7, "#f5d9a3");
        } else {
          line(c, [[20, -17 - at], [29, -45 - at]], "#a1b1a3", 3);
          poly(c, [[26, -42 - at], [28, -54 - at], [32, -43 - at]], "#d0cbb1");
        }
      } else {
        const dark = boss ? "#2e282b" : "#344342", light = boss ? "#8b7870" : "#819486", mid = boss ? "#584640" : "#4d635d";
        poly(c, [[-17, -60], [16, -60], [33, 0], [18, -4], [8, 5], [-3, 0], [-15, 4], [-35, -1]], boss ? "#3b262a" : "#243630");
        for (const x of [-10, 10]) {
          poly(c, [[x - 6, -27], [x + 6, -28], [x + 5, -7], [x + 8, 0], [x - 7, 1], [x - 8, -5]], metal(c, x - 7, 0, x + 6, 0, [dark, light, mid]), "#111e24", 1);
          line(c, [[x, -23], [x, -9]], "#b5af9677", 1);
        }
        poly(c, [[-19, -61], [0, -69], [20, -60], [17, -35], [8, -25], [-11, -27], [-20, -39]], metal(c, -20, -60, 17, -28, [dark, light, mid, dark]), "#111922", 1.3);
        for (let i = 0; i < 3; i++) poly(c, [[-15, -45 + i * 7], [0, -40 + i * 7], [16, -45 + i * 7], [14, -39 + i * 7], [0, -35 + i * 7], [-14, -39 + i * 7]], null, "#b09c7977", 0.8);
        poly(c, [[-18, -65], [-31, -56], [-29, -41], [-15, -45], [-9, -55]], metal(c, -31, -59, -15, -40, [dark, light, mid]), "#15232a", 1);
        poly(c, [[16, -65], [32, -56], [29, -40], [13, -44], [10, -55]], metal(c, 11, -59, 32, -43, [mid, light, dark]), "#15232a", 1);
        if (boss) {
          for (const x of [-24, 23]) poly(c, [[x - 4, -60], [x - 7, -75], [x + 5, -65], [x + 7, -53]], "#8b8270", "#bdac8577");
        }
        poly(c, [[-12, -79], [0, -88], [13, -79], [13, -66], [5, -57], [-5, -58], [-13, -67]], metal(c, -12, -80, 12, -60, [dark, light, mid]), "#11212a", 1);
        poly(c, [[-9, -73], [0, -70], [9, -73], [8, -66], [0, -64], [-8, -67]], "#131317");
        line(c, [[-7, -70], [-2, -69]], "#f0a081", 1.8);
        line(c, [[2, -69], [7, -70]], "#f0a081", 1.8);
        line(c, [[0, -84], [0, -72], [0, -59]], "#d2af8277", 1);
        if (boss) {
          poly(c, [[-11, -82], [-22, -98], [-19, -74], [-11, -68]], "#665b52", "#a1967a88");
          poly(c, [[11, -82], [22, -98], [19, -74], [11, -68]], "#665b52", "#a1967a88");
          glow(c, 0, -48, 25, "#de734525");
          rune(c, 0, -48, 1.6, "#eea16d");
        }
        line(c, [[26, -43], [35 + at, -12]], mid, 9);
        line(c, [[35 + at, -7], [34 - at, -69]], "#6f7564", 4);
        poly(c, [[33 - at, -72], [49 - at, -68], [53 - at, -54], [36 - at, -58], [22 - at, -52], [19 - at, -64]], metal(c, 20, -69, 49, -52, [dark, light, mid]), "#bba48277", 1);
      }
      if (e.burn > 0) {
        glow(c, 0, -25, 37, "#da762733");
        for (let i = 0; i < 3; i++) {
          const yy = -10 - (t * 35 + i * 13) % 45, xx = Math.sin(t * 5 + i) * 13;
          poly(c, [[xx - 3, yy + 5], [xx, yy - 8], [xx + 4, yy + 3]], "#ebac6c77");
        }
      }
      if (e.hurt > 0) {
        c.globalCompositeOperation = "screen";
        glow(c, 0, -35, 45, "#d3e9cf55");
      }
      c.restore();
      if (!boss && !e.dying && e.hp < e.maxHp) {
        c.fillStyle = "#08121adc";
        c.fillRect(e.x - 18, e.y - (brute ? 103 : 78), 36, 3);
        c.fillStyle = "#b78571";
        c.fillRect(e.x - 18, e.y - (brute ? 103 : 78), 36 * e.hp / e.maxHp, 3);
      }
    }
    drawEffect(c, f, t) {
      const p = f.t / f.duration, a = 1 - p;
      c.save();
      c.globalAlpha = a;
      if (f.kind === "slash") {
        c.translate(f.x, f.y);
        c.scale(f.flip || 1, 0.6);
        c.rotate(-0.6 + p * 1.2);
        c.strokeStyle = f.color;
        c.lineWidth = 4 * (1 - p) + 0.5;
        c.beginPath();
        c.arc(0, 0, f.r * (0.7 + p * 0.3), -0.6, 1.9);
        c.stroke();
        c.lineWidth = 1;
        c.beginPath();
        c.arc(0, 0, f.r + 5, -0.8, 1.3);
        c.stroke();
      } else if (f.kind === "nova" || f.kind === "slam" || f.kind === "quake" || f.kind === "shield" || f.kind === "spawn") {
        const r = f.r * (0.15 + p);
        glow(c, f.x, f.y - 10, r, f.kind === "slam" ? "#dc815545" : "#9edacc30");
        c.strokeStyle = f.color;
        c.lineWidth = f.kind === "spawn" ? 1 : 3 * (1 - p);
        c.beginPath();
        c.ellipse(f.x, f.y, r, r * (f.kind === "quake" ? 1 : 0.55), 0, 0, TAU);
        c.stroke();
        if (f.kind !== "shield") for (let i = 0; i < 12; i++) {
          const angle = i / 12 * TAU;
          rune(c, f.x + Math.cos(angle) * r, f.y + Math.sin(angle) * r * 0.55, (1 - p) * 1.7, f.color, i);
        }
      } else if (f.kind === "hit") {
        for (let i = 0; i < 5; i++) {
          const angle = i / 5 * TAU;
          line(c, [[f.x + Math.cos(angle) * f.r * p, f.y + Math.sin(angle) * f.r * p], [f.x + Math.cos(angle) * (f.r * p + 5), f.y + Math.sin(angle) * (f.r * p + 5)]], f.color, 1.5);
        }
      } else if (f.kind === "lightning") {
        const dx = f.toX - f.x, dy = f.toY - f.y, pts = [[f.x, f.y]];
        for (let i = 1; i < 6; i++) pts.push([f.x + dx * i / 6 + Math.sin(i * 14) * 13, f.y + dy * i / 6 + Math.cos(i * 8) * 10]);
        pts.push([f.toX, f.toY]);
        line(c, pts, f.color, 2);
        glow(c, f.toX, f.toY, 20, "#a0dce550");
      } else if (f.kind === "soul") {
        const x = f.x + (f.toX - f.x) * p, y = f.y + (f.toY - f.y) * p - Math.sin(p * Math.PI) * 40;
        glow(c, x, y, 12, "#b4e8c388");
        oval(c, x, y, 2.5, 2.5, "#d7f4d4");
      }
      c.restore();
    }
    render(g2) {
      const c = this.c, s = this.dpr * this.scale, t = g2.visualTime;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#08121a";
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(s, 0, 0, s, 0, 0);
      c.drawImage(this.cache, 0, 0, 440, this.logicalH);
      const o = this.offset;
      const isHome = g2.mode === "home";
      for (const x of [105, 335]) {
        const y = 341 + o * 0.65;
        glow(c, x, y, 48, "#cf85441c");
        poly(c, [[x - 5, y + 8], [x + 5, y + 8], [x + 3, y + 26], [x - 3, y + 26]], "#38403a");
        poly(c, [[x - 9, y + 3], [x + 9, y + 3], [x + 6, y + 10], [x - 6, y + 10]], "#8a7854");
        for (let i = 0; i < 3; i++) {
          const q = t * (this.motion ? 6 : 0) + i;
          poly(c, [[x - 5 + i * 2, y + 5], [x - 3 + Math.sin(q) * 3, y - 11 - i * 3], [x + 5 - i, y + 4]], i === 2 ? "#e8c28a99" : "#c1834966");
        }
      }
      if (this.motion) for (let i = 0; i < 19; i++) {
        const x = (i * 173.7 + Math.sin(t * 0.25 + i) * 40) % 440, y = (i * 67 + t * (i % 3 + 1) * 2) % (this.logicalH - 160) + 120;
        c.globalAlpha = 0.07 + Math.sin(t + i) * 0.04;
        oval(c, x, y, 90 + i % 4 * 15, 13 + i % 4 * 4, "#bad5c9");
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 24; i++) {
        const x = (i * 133.41 + Math.sin(t * 0.3 + i) * 18) % 440, y = (i * 43.13 - t * (2 + i % 3) + this.logicalH * 20) % this.logicalH;
        c.globalAlpha = 0.16 + 0.2 * Math.max(0, Math.sin(t * 0.6 + i));
        oval(c, x, y, 0.6 + i % 3 * 0.3, 0.6 + i % 3 * 0.3, "#c8d2a9");
      }
      c.globalAlpha = 1;
      c.save();
      c.translate(0, isHome ? o : this.battleOffset);
      if (g2.shake > 0 && this.motion) c.translate(Math.sin(t * 67) * g2.shake * 0.35, Math.cos(t * 71) * g2.shake * 0.2);
      if (isHome) {
        glow(c, 220, 514, 128, "#80b6b42d");
        oval(c, 221, 635, 95, 22, "#02091277");
        this.drawKnight(c, 222, 626, 2.55, t, {});
        c.save();
        c.globalAlpha = 0.23;
        rune(c, 220, 681, 3.1, "#c2d8ab");
        c.restore();
      } else {
        for (const e of g2.enemies) {
          const a = e.telegraph;
          if (!a || e.dying) continue;
          const k = Math.min(1, a.elapsed / a.duration);
          c.save();
          c.lineWidth = 1.6;
          if (a.type === "quake") {
            oval(c, a.x, a.y, a.r, a.r, `rgba(168,52,37,${0.13 + k * 0.12})`);
            c.strokeStyle = "#e6a082";
            c.beginPath();
            c.arc(a.x, a.y, a.r, 0, TAU);
            c.stroke();
            c.lineWidth = 3;
            c.strokeStyle = "#ffdfbd";
            c.beginPath();
            c.arc(a.x, a.y, a.r, -Math.PI / 2, -Math.PI / 2 + TAU * k);
            c.stroke();
            rune(c, a.x, a.y, 2, "#edb28c");
          } else {
            const angle = Math.atan2(a.aim.y, a.aim.x), spread = a.type === "projectile" ? 0.12 : Math.acos(0.35), range = a.type === "projectile" ? 145 : a.r;
            c.translate(e.x, e.y);
            c.rotate(angle);
            c.fillStyle = `rgba(222,167,77,${0.09 + k * 0.15})`;
            c.strokeStyle = `rgba(240,195,115,${0.35 + k * 0.6})`;
            c.beginPath();
            c.moveTo(0, 0);
            c.arc(0, 0, range, -spread, spread);
            c.closePath();
            c.fill();
            c.stroke();
            c.lineWidth = 3;
            c.beginPath();
            c.arc(0, 0, range * k, -spread, spread);
            c.stroke();
          }
          c.restore();
        }
        const target = g2.target();
        if (target) {
          c.strokeStyle = "#d4c99599";
          c.lineWidth = 1;
          c.beginPath();
          c.ellipse(target.x, target.y, target.radius + 7, (target.radius + 7) * 0.45, 0, 0, TAU);
          c.stroke();
        }
        const dest = g2.hero.moveTarget;
        if (dest) {
          c.strokeStyle = "#a4e4ca99";
          c.lineWidth = 1.4;
          c.beginPath();
          c.ellipse(dest.x, dest.y, 11, 6, 0, 0, TAU);
          c.stroke();
          line(c, [[dest.x - 4, dest.y], [dest.x + 4, dest.y]], "#d0efd3", 1);
        }
        const actors = [...g2.enemies, { ...g2.hero, isHero: true }].sort((a, b) => a.y - b.y);
        for (const actor of actors) {
          if (actor.isHero) {
            if (actor.dodge) {
              c.save();
              c.globalAlpha = 0.18;
              this.drawKnight(c, actor.x - actor.dodge.x * 25, actor.y - actor.dodge.y * 25, 1.05, t, actor);
              c.restore();
            }
            this.drawKnight(c, actor.x, actor.y, 1.05, t, actor);
          } else this.drawEnemy(c, actor, t);
        }
        for (const p of g2.projectiles) {
          oval(c, p.x, p.y, 7, 3, "#1a0c0c55");
          glow(c, p.x, p.y - 32, 15, "#de956b66");
          oval(c, p.x, p.y - 32, 4, 4, p.color);
        }
        for (const f of g2.effects) this.drawEffect(c, f, t);
        for (const n of g2.texts) {
          c.save();
          c.globalAlpha = Math.min(1, (1 - n.t / n.duration) * 2);
          c.font = `${n.big ? "bold " : ""}${n.big ? 21 : 14}px Georgia`;
          c.textAlign = "center";
          c.shadowColor = "#000";
          c.shadowBlur = 5;
          c.fillStyle = n.color;
          c.fillText(n.text, n.x, n.y - n.t * 27);
          c.restore();
        }
      }
      c.restore();
      if (g2.flash > 0) {
        c.fillStyle = `rgba(193,229,214,${g2.flash * 0.3})`;
        c.fillRect(0, 0, 440, this.logicalH);
      }
    }
  };
  var ICONS = {
    sword: '<path d="m6 22 5-5m-4-4 8 8m-4-5 10-13 4-1-1 4-12 12M5 23l-2 2"/>',
    dodge: '<path d="m8 8 7-4 7 4-7 5zM4 14l7 5m8-7 7 5-11 8-7-4M2 22h4"/>',
    bolt: '<path d="m16 2-11 15h8l-2 12 13-17h-9z"/>',
    shield: '<path d="m15 3 10 4-1 12-9 8-9-8L5 7zM15 8v13m-5-9 5-4 5 4"/>',
    flame: '<path d="M16 2c3 8-5 9-2 14 2-1 4-4 4-7 10 9 7 18-3 18C4 27 1 19 10 10c-1 5 0 7 2 8-3-7 3-9 4-16Z"/>',
    burst: '<path d="m15 2 3 9 10 4-10 3-3 10-3-10-10-3 10-4zM5 5l3 3m14 14 3 3M5 25l3-3M22 8l3-3"/>',
    sound: '<path d="M4 11h5l6-5v18l-6-5H4zM20 10c3 3 3 7 0 10m4-15c6 6 6 14 0 20"/>',
    mute: '<path d="M4 11h5l6-5v18l-6-5H4zM21 11l7 8m0-8-7 8"/>',
    pause: '<path d="M10 6v18M20 6v18" stroke-width="3"/>'
  };
  function icon(name) {
    return `<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.burst}</svg>`;
  }

  // audio.js
  var RuneAudio = class {
    constructor() {
      this.enabled = true;
      this.ctx = null;
      this.nextBeat = 0;
      this.beat = 0;
      this.mode = "home";
      this.lastHit = 0;
    }
    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {
        });
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.24 : 0;
        this.master.connect(this.ctx.destination);
        this.wet = this.ctx.createGain();
        this.wet.gain.value = 0.16;
        this.reverb = this.ctx.createConvolver();
        const n = this.ctx.sampleRate * 1.5, buf = this.ctx.createBuffer(2, n, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const b = buf.getChannelData(ch);
          for (let i = 0; i < n; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.7);
        }
        this.reverb.buffer = buf;
        this.reverb.connect(this.wet);
        this.wet.connect(this.master);
        this.nextBeat = this.ctx.currentTime + 0.1;
      } catch {
        this.ctx = null;
      }
    }
    setEnabled(value) {
      this.enabled = value;
      if (this.ctx) this.master.gain.setTargetAtTime(value ? 0.24 : 0, this.ctx.currentTime, 0.1);
    }
    tone(freq, time, duration = 0.3, volume = 0.2, type = "sine", endFreq = 0) {
      if (!this.ctx || !this.enabled) return;
      const o = this.ctx.createOscillator(), g2 = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, time);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), time + duration);
      g2.gain.setValueAtTime(0, time);
      g2.gain.linearRampToValueAtTime(volume, time + 8e-3);
      g2.gain.exponentialRampToValueAtTime(1e-3, time + duration);
      o.connect(g2);
      g2.connect(this.master);
      if (type === "sine" || type === "triangle") g2.connect(this.reverb);
      o.start(time);
      o.stop(time + duration + 0.02);
      o.onended = () => {
        o.disconnect();
        g2.disconnect();
      };
    }
    noise(duration = 0.12, volume = 0.14, freq = 1200) {
      if (!this.ctx || !this.enabled) return;
      const now = this.ctx.currentTime, n = Math.ceil(this.ctx.sampleRate * duration), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), data = b.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), g2 = this.ctx.createGain();
      source.buffer = b;
      filter.type = "lowpass";
      filter.frequency.value = freq;
      g2.gain.value = volume;
      source.connect(filter);
      filter.connect(g2);
      g2.connect(this.master);
      source.start(now);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        g2.disconnect();
      };
    }
    effect(name) {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime;
      if (name === "attack") {
        if (t - this.lastHit < 0.18) return;
        this.lastHit = t;
        this.noise(0.09, 0.17, 2500);
        this.tone(380, t, 0.08, 0.06, "triangle", 160);
      }
      if (name === "swing") this.noise(0.13, 0.085, 1400);
      if (name === "dodge") this.noise(0.22, 0.12, 1e3);
      if (name === "block") {
        this.noise(0.07, 0.12, 4200);
        this.tone(720, t, 0.17, 0.12, "triangle", 480);
      }
      if (name === "hurt") {
        this.noise(0.1, 0.15, 350);
        this.tone(90, t, 0.12, 0.18, "sine", 45);
      }
      if (name === "burst") {
        this.noise(0.55, 0.35, 2500);
        [146.83, 220, 293.66, 440].forEach((f, i) => this.tone(f, t + i * 0.04, 0.75, 0.2, "triangle", f * 0.5));
      }
      if (name === "guard" || name === "perfect") {
        [293.66, 440, 587.33].forEach((f, i) => this.tone(f, t + i * 0.06, 0.7, 0.18, "sine"));
      }
      if (name === "warning") {
        this.tone(110, t, 0.4, 0.28, "triangle");
        this.tone(103.83, t + 0.12, 0.6, 0.2, "triangle");
      }
      if (name === "slam") {
        this.noise(0.55, 0.5, 500);
        this.tone(80, t, 0.6, 0.4, "sine", 24);
      }
      if (name === "choose" || name === "stage") {
        [220, 293.66, 440].forEach((f, i) => this.tone(f, t + i * 0.1, 0.65, 0.17, "sine"));
      }
      if (name === "win") {
        [146.83, 220, 293.66, 349.23, 440, 587.33].forEach((f, i) => this.tone(f, t + i * 0.15, 1.5, 0.2, "triangle"));
      }
      if (name === "lose") {
        [146.83, 130.81, 110, 73.42].forEach((f, i) => this.tone(f, t + i * 0.2, 1, 0.2, "sine"));
      }
    }
    tick(mode, stage = 0) {
      if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      if (mode !== "battle") {
        this.nextBeat = now + 0.2;
        return;
      }
      if (this.nextBeat < now - 0.5) this.nextBeat = now + 0.05;
      const beats = [146.83, 220, 293.66, 220, 130.81, 196, 261.63, 196, 116.54, 174.61, 233.08, 174.61, 130.81, 196, 220, 196];
      while (this.nextBeat < now + 0.15) {
        const b = this.beat % 16, t = this.nextBeat;
        this.tone(beats[b], t, 0.65, 0.08, "triangle");
        if (b % 4 === 0) {
          this.tone(beats[b] / 2, t, 1.4, 0.18, "sine");
          this.tone(65, t, 0.25, 0.2, "sine", 28);
        }
        if (stage > 0 && b % 2 === 1) this.tone(beats[b] * 2, t, 0.25, 0.035, "sine");
        if (stage === 2 && b % 2 === 0) this.tone(82, t, 0.15, 0.1, "triangle", 40);
        this.nextBeat += stage === 2 ? 0.32 : 0.41;
        this.beat++;
      }
    }
  };

  // app.js
  var $ = (id) => document.getElementById(id);
  var STORE = "rune-expedition-v1";
  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}") || {};
    } catch {
      return {};
    }
  }
  var saved = readStore();
  var lang = saved.lang === "en" ? "en" : "zh";
  var modalType = "";
  var lastFocus = null;
  var resultData = null;
  var bannerTimer;
  var noticeTimer;
  var toastTimer;
  var L = () => lang === "zh" ? 0 : 1;
  var txt = (zh, en) => lang === "zh" ? zh : en;
  var g = new Expedition();
  var art = new WorldArt($("scene"));
  var audio = new RuneAudio();
  audio.enabled = saved.sound !== false;
  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify(saved));
    } catch {
    }
  }
  function seconds(t) {
    return Math.floor(t / 60).toString().padStart(2, "0") + ":" + Math.floor(t % 60).toString().padStart(2, "0");
  }
  function itemName(id) {
    return ITEMS[id].name[L()];
  }
  function modal(html, type) {
    lastFocus = document.activeElement;
    $("overlayContent").innerHTML = html;
    $("overlay").hidden = false;
    modalType = type;
    requestAnimationFrame(() => {
      $("overlayContent").querySelector("button")?.focus({ preventScroll: true });
    });
  }
  function closeModal() {
    const old = modalType;
    modalType = "";
    $("overlay").hidden = true;
    if (g.mode === "paused") g.resume();
    else if (g.mode === "loot") renderLoot();
    else if (g.mode === "result" && old !== "result") renderResult();
    else if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  }
  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2300);
  }
  function notice(message, danger = false, duration = 2800) {
    $("combatNotice").textContent = message;
    $("combatNotice").classList.toggle("danger", danger);
    $("combatNotice").style.opacity = 1;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => $("combatNotice").style.opacity = 0, duration);
  }
  function setLanguage() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    $("language").textContent = lang === "zh" ? "EN" : "中";
    $("language").setAttribute("aria-label", txt("Switch to English", "切换为中文"));
    $("gameTitle").innerHTML = txt("符文远征", "RUNE<br>EXPEDITION");
    $("gameTitle").classList.toggle("english", lang === "en");
    document.querySelector(".english-title").textContent = txt("RUNE EXPEDITION", "A DARK FANTASY ADVENTURE");
    $("homeEyebrow").textContent = txt("第一章 · 灰烬之门", "CHAPTER I · THE ASHEN GATE");
    $("tagline").textContent = txt("碑文已碎，守门者仍在。\n带回那枚熄灭的符文。", "The inscription is broken. The guardian remains.\nBring the forgotten rune back to life.");
    $("heroTag").textContent = txt("最后的守誓者", "THE LAST OATHKEEPER");
    $("heroClass").textContent = txt("符文骑士", "RUNE KNIGHT");
    $("startLabel").textContent = txt("踏入遗迹", "ENTER THE RUINS");
    $("sessionNote").textContent = txt("剑盾连招 · 手动 / 自动 · 三章试炼", "SWORD & SHIELD · MANUAL / AUTO · 3 CHAPTERS");
    $("howTo").textContent = txt("远征指南", "HOW TO PLAY");
    $("recordsButton").textContent = txt("远征记录", "RUN HISTORY");
    $("attackIcon").innerHTML = icon("sword");
    $("dodgeIcon").innerHTML = icon("dodge");
    $("staminaLabel").textContent = txt("耐力", "STAMINA");
    $("dodgeLabel").textContent = txt("闪避", "DODGE");
    $("dodgeHint").textContent = txt("22耐力 · 空格", "22 STA · SPACE");
    $("burstLabel").textContent = txt("符文爆发", "RUNE BURST");
    $("guardLabel").textContent = txt("按住举盾", "HOLD TO GUARD");
    $("burstHint").textContent = txt("30耐力 · E", "30 STA · E");
    $("guardHint").textContent = txt("临击格挡 · Q / K", "TIMED PARRY · Q / K");
    $("heroName").textContent = txt("守誓者", "OATHKEEPER");
    $("bossName").textContent = txt("缄默之王", "THE HOLLOW KING");
    $("pause").setAttribute("aria-label", txt("暂停游戏", "Pause game"));
    $("scene").setAttribute("aria-label", txt("符文远征战场", "Rune Expedition battlefield"));
    $("homeMark").setAttribute("aria-label", txt("作品说明", "About this demo"));
    updateSound();
    updateUI();
    if (modalType === "loot") renderLoot();
    if (modalType === "pause") renderPause();
    if (modalType === "howto") renderHowto();
    if (modalType === "about") renderAbout();
    if (modalType === "history") renderHistory();
    if (modalType === "result") renderResult();
    if (modalType === "details") renderDetails();
    if (!$("stageBanner").hidden && g.mode !== "home") $("stageBanner").innerHTML = `<small>${STAGES[g.stage].subtitle[L()]}</small><strong>${STAGES[g.stage].name[L()]}</strong>`;
    if (g.mode === "battle") notice(txt("点击挥剑 · 按住举盾 · 点地走位", "TAP TO ATTACK · HOLD GUARD · TAP GROUND TO MOVE"), false, 2200);
  }
  function updateSound() {
    $("sound").innerHTML = icon(audio.enabled ? "sound" : "mute");
    $("sound").setAttribute("aria-label", audio.enabled ? txt("关闭声音", "Mute sound") : txt("开启声音", "Enable sound"));
    $("sound").setAttribute("aria-pressed", String(audio.enabled));
  }
  function updateUI() {
    const h = g.hero, active = g.mode !== "home";
    $("home").hidden = active;
    $("hud").hidden = !active;
    $("controls").hidden = !active;
    $("pause").hidden = !["battle", "paused"].includes(g.mode);
    if (!active) return;
    $("chapterLabel").textContent = `0${g.stage + 1} / ${STAGES[g.stage].name[L()]}`;
    $("waveLabel").textContent = g.stage === 2 ? txt("最终试炼", "FINAL TRIAL") : txt(`第 ${Math.max(1, g.wave)} / 3 波`, `WAVE ${Math.max(1, g.wave)} / 3`);
    $("healthText").textContent = `${Math.ceil(h.hp)} / ${h.maxHp}`;
    $("healthFill").style.width = h.hp / h.maxHp * 100 + "%";
    $("staminaFill").style.width = h.stamina + "%";
    $("staminaText").textContent = Math.floor(h.stamina);
    $("attackStat").textContent = txt("攻击 ", "ATK ") + h.attack;
    $("critStat").textContent = txt("暴击 ", "CRIT ") + Math.round(h.crit * 100) + "%";
    $("goldStat").textContent = txt("灵魂碎片 ", "SOULS ") + (g.stats?.coins || 0);
    const boss = g.enemies.find((e) => e.kind === "boss" && !e.dying);
    $("bossHud").hidden = !boss;
    if (boss) {
      $("bossHealth").textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
      $("bossFill").style.width = boss.hp / boss.maxHp * 100 + "%";
    }
    for (const [name, cd, total, cost] of [["burst", h.burstCd, 8, 30], ["dodge", h.dodgeCd, 2.2, 22]]) {
      const b = $(name);
      b.classList.toggle("on-cooldown", cd > 0.03);
      b.style.setProperty("--cd", Math.min(1, cd / total));
      $(name + "Cd").textContent = cd < 1 ? cd.toFixed(1) + "s" : Math.ceil(cd) + "s";
      b.disabled = cd > 0 || h.stamina < cost || g.mode !== "battle" || name === "burst" && !!(h.action || h.dodge || h.guarding);
    }
    $("guard").disabled = g.mode !== "battle" || h.guardLock > 0 || !h.guarding && h.stamina < 8;
    $("guard").classList.toggle("held", h.guarding);
    $("guard").setAttribute("aria-pressed", String(h.guarding));
    $("attack").disabled = g.mode !== "battle" || !!h.dodge || h.guardLock > 0;
    $("attack").classList.toggle("counter-ready", h.counter > 0);
    $("attackLabel").textContent = h.counter > 0 ? txt("破绽反击", "RIPOSTE") : h.guarding ? txt("盾击", "SHIELD BASH") : txt("挥剑", "SWORD ATTACK");
    $("attackHint").textContent = h.counter > 0 ? txt("立即点按 · 强力刺击", "TAP NOW · HEAVY THRUST") : h.guarding ? txt("20耐力 · 打断敌人", "20 STA · INTERRUPT") : txt("连续点按三连击 · J", "TAP FOR 3-HIT COMBO · J");
    $("autoMode").textContent = h.auto ? txt("自动攻击 · 点击改手动", "AUTO · SWITCH TO MANUAL") : txt("手动攻击 · 点击改自动", "MANUAL · SWITCH TO AUTO");
    $("autoMode").setAttribute("aria-pressed", String(h.auto));
    $("autoMode").disabled = g.mode !== "battle";
    const combo = h.action?.kind === "sword" ? h.action.index + 1 : h.comboTime > 0 ? h.combo : 0;
    $("comboState").textContent = h.counter > 0 ? txt(`反击窗口 ${h.counter.toFixed(1)}s`, `RIPOSTE ${h.counter.toFixed(1)}s`) : txt(`连招 ${combo} / 3`, `COMBO ${combo} / 3`);
    $("comboState").classList.toggle("counter-ready", h.counter > 0);
    $("battleHint").textContent = h.guardLock > 0 ? txt("架势破碎 · 暂时无法举盾", "GUARD BROKEN · RECOVERING") : h.counter > 0 ? txt("完美格挡！点击挥剑发动反击", "PERFECT PARRY! TAP ATTACK TO RIPOSTE") : h.guarding ? txt("保持举盾减伤 · 配合挥剑可盾击", "HOLD TO BLOCK · TAP ATTACK TO BASH") : h.pendingAttack ? txt("正在接近目标，随后挥剑", "APPROACHING YOUR TARGET") : txt("点地走位 · 橙色攻击可挡 · 红圈请躲开", "TAP GROUND TO MOVE · GUARD GOLD · DODGE RED");
    const equipment = h.items.map((id) => `<span>${icon(ITEMS[id].icon)}${itemName(id)}</span>`).join("");
    if ($("equipped").innerHTML !== equipment) $("equipped").innerHTML = equipment;
    document.querySelectorAll(".chapter-progress i").forEach((el, i) => el.className = i < g.stage ? "done" : i === g.stage ? "current" : "");
    fitArena();
  }
  function fitArena() {
    if ($("controls").hidden) return;
    const r = $("game").getBoundingClientRect(), floorBottom = ($("controls").getBoundingClientRect().top - r.top) / art.scale - 18;
    art.battleOffset = Math.min(art.offset + 160, floorBottom - 410);
    g.setBounds(floorBottom - art.battleOffset);
  }
  function renderLoot() {
    const chapter = g.stage;
    modal(`<div class="eyebrow">${txt("遗迹馈赠", "RELIC DISCOVERED")}</div><h2 id="overlayTitle">${txt("选择你的力量", "CHOOSE YOUR POWER")}</h2><p class="subcopy">${txt("每次选择，都会改变接下来的战斗。", "Every choice shapes the battles ahead.")}</p><div class="loot-list">${g.choices.map((id) => {
      const it = ITEMS[id];
      return `<button class="loot-card" data-item="${id}"><span class="item-art" style="color:${it.color}">${icon(it.icon)}</span><span><strong>${it.name[L()]}</strong><small>${it.desc[L()]}</small><span class="item-tag">${it.tag[L()]}</span></span><span class="select-arrow">›</span></button>`;
    }).join("")}</div><p class="recovery-note">${txt("选择后回复 40% 最大生命，并重置技能冷却。", "Restore 40% of max HP and reset skill cooldowns.")}</p><p class="small-note">${txt("下一站：", "NEXT: ")}${STAGES[chapter + 1].name[L()]}</p>`, "loot");
  }
  function renderPause() {
    modal(`<div class="eyebrow">${txt("暂歇于遗迹之间", "A MOMENT BETWEEN BATTLES")}</div><h2 id="overlayTitle">${txt("远征已暂停", "EXPEDITION PAUSED")}</h2><p class="subcopy">${txt("深呼吸。下一次挥剑，为你而起。", "Take a breath. The next strike is yours.")}</p><button class="primary-button" data-action="resume">${txt("继续远征", "RESUME")}</button><button class="secondary-button" data-action="howto">${txt("查看远征指南", "HOW TO PLAY")}</button><button class="text-button" data-action="home">${txt("结束本局，返回入口", "END RUN & RETURN")}</button>`, "pause");
  }
  function renderHowto() {
    const rows = [
      [txt("剑由你挥，连击由你衔接", "Your sword. Your timing."), txt("默认手动，骑士自动接近目标。点按挥剑，连续点按衔接斜劈、反斩、刺击；最多预存下一剑。可随时切换自动攻击。", "Manual by default: the knight approaches a target, but you swing. Tap for slash, reverse slash, then thrust; only one next hit is queued. Toggle Auto at any time.")],
      [txt("举盾，抓住反击机会", "Guard, then riposte."), txt("按住举盾抵挡正面攻击。命中前约0.3秒举盾可完美格挡，随后2.2秒内挥剑可反击。平时按住盾再点挥剑可盾击打断小怪。注意耐力和背后的敌人。", "Hold Guard to block frontal hits. Raise it about 0.3s before impact for a perfect parry, then attack within 2.2s to riposte. Hold Guard and tap Attack to shield-bash smaller foes. Watch stamina and your back.")],
      [txt("站位比硬扛更重要", "Move before the impact."), txt("点击地面移动，点击敌人切换目标。橙色扇形可格挡；红色圆圈是无法格挡的震击，走出范围或用闪避穿过命中瞬间。符文爆发只伤害近处敌人。", "Tap the ground to move or a foe to target it. Guard gold attacks; red circles cannot be blocked. Leave the circle or dodge through the impact. Rune Burst hits nearby enemies.")]
    ];
    modal(`<div class="eyebrow">FIELD GUIDE</div><h2 id="overlayTitle">${txt("剑盾战斗指南", "SWORD & SHIELD")}</h2>${rows.map(([title, copy], i) => `<div class="howto-row"><span>0${i + 1}</span><div><strong>${title}</strong><p>${copy}</p></div></div>`).join("")}<p class="small-note">${txt("电脑：WASD / 方向键移动；J / 1挥剑；Q / K / 2按住盾；空格 / L闪避；E符文爆发；M切换模式；Esc暂停。", "KEYBOARD: WASD / arrows move; J / 1 attack; hold Q / K / 2 to guard; Space / L dodge; E burst; M toggle Auto; Esc pause.")}</p><button class="secondary-button" data-action="close">${txt("明白了", "GOT IT")}</button>`, "howto");
  }
  function renderAbout() {
    modal(`<div class="eyebrow">AN ORIGINAL DEMO BY CASSIE</div><h2 id="overlayTitle">${txt("符文远征", "RUNE EXPEDITION")}</h2><p class="subcopy">${txt("一段关于抉择、成长与最后一击的暗黑奇幻远征。", "A dark-fantasy expedition about choices, growth, and the final strike.")}</p><div class="howto-row"><span>ᛟ</span><div><strong>${txt("小小旅程，完整冒险", "A small journey. A complete adventure.")}</strong><p>${txt("三场战斗、六件可选装备、一个最终Boss。支持中英文切换，手机与电脑均可试玩。", "Three battles, six selectable relics, and one final boss. Play in Chinese or English, on mobile or desktop.")}</p></div></div><p class="small-note">${txt("这是借助 AI 编程工具制作的个人原创试玩作品。美术由程序绘制，音乐与音效实时合成。战斗记录仅保存在当前浏览器，可在远征记录中清除。", "An original personal demo built with AI coding assistance. Artwork is drawn procedurally; music and sound are synthesized in real time. Run history stays in this browser and can be cleared.")}</p><button class="secondary-button" data-action="close">${txt("返回", "BACK")}</button>`, "about");
  }
  function renderResult() {
    if (!resultData) return;
    const { won, stats } = resultData;
    modal(`<div class="result-seal ${won ? "" : "defeat"}">${won ? "ᛟ" : "ᚾ"}</div><div class="eyebrow">${won ? "EXPEDITION COMPLETE" : "THE OATH REMAINS"}</div><h2 id="overlayTitle">${won ? txt("符文重燃", "THE RUNE AWAKENS") : txt("誓约未尽", "RISE AGAIN")}</h2><p class="subcopy">${won ? txt("长夜退去。你带回了遗迹最后的光。", "The long night recedes. You return with its final light.") : txt("这次远征暂告结束。换一种选择，再次出发。", "This expedition ends here. A new choice may change your fate.")}</p><div class="result-stats"><div><strong>${seconds(stats.time)}</strong><span>${txt("战斗用时", "BATTLE TIME")}</span></div><div><strong>${stats.kills}</strong><span>${txt("击败敌人", "ENEMIES SLAIN")}</span></div><div><strong>${stats.damage.toLocaleString()}</strong><span>${txt("累计伤害", "TOTAL DAMAGE")}</span></div></div><div class="result-build">${stats.items.map((id) => `<span>${itemName(id)}</span>`).join("")}</div><p class="result-tip">${won ? txt("下一次，试试不同的装备组合。", "Try a different relic combination on your next run.") : txt("橙色攻击抓准时机格挡反击，红圈震击需要走位或闪避。", "Parry gold attacks and riposte. Move or dodge out of red ground attacks.")}</p><button class="primary-button" data-action="restart">${txt("再次远征", "ANOTHER EXPEDITION")}</button><button class="secondary-button" data-action="details">${txt("查看战斗回顾", "VIEW BATTLE RECAP")}</button><button class="text-button" data-action="home">${txt("返回入口", "RETURN TO THE GATE")}</button>`, "result");
  }
  function renderDetails() {
    const s = resultData?.stats;
    if (!s) return;
    const rows = [[txt("战斗用时", "Battle time"), seconds(s.time)], [txt("完成关卡", "Stages cleared"), `${s.stages.length} / 3`], [txt("累计伤害", "Damage dealt"), s.damage], [txt("承受伤害", "Damage received"), s.received], [txt("护盾抵挡", "Damage blocked"), s.blocked], [txt("暴击次数", "Critical hits"), s.crits], [txt("爆发使用", "Rune Bursts"), s.burst], [txt("举盾次数", "Guards raised"), s.guard], [txt("完美格挡", "Perfect parries"), s.perfectGuards], [txt("反击次数", "Ripostes"), s.counters || 0], [txt("三段终结", "Combo finishers"), s.finishers || 0], [txt("盾击次数", "Shield bashes"), s.bashes || 0], [txt("闪避次数", "Dodges"), s.dodges || 0], [txt("灵魂碎片", "Soul shards"), s.coins]];
    modal(`<div class="eyebrow">BATTLE RECAP</div><h2 id="overlayTitle">${txt("每次选择都有回响", "EVERY CHOICE ECHOES")}</h2><table class="data-table">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table><p class="small-note">${txt("以上为本局实际记录。仅保存在当前浏览器，不上传个人信息。", "Actual results from this run. Stored in this browser only.")}</p><button class="secondary-button" data-action="export">${txt("保存本局记录", "SAVE RUN DATA")}</button><button class="text-button" data-action="result">${txt("返回结算", "BACK TO RESULTS")}</button>`, "details");
  }
  function renderHistory() {
    const runs = saved.runs || [];
    modal(`<div class="eyebrow">YOUR EXPEDITIONS</div><h2 id="overlayTitle">${txt("远征记录", "RUN HISTORY")}</h2><p class="subcopy">${runs.length ? txt("保存在此浏览器的最近 5 次远征。", "Your last five expeditions on this browser.") : txt("遗迹正等待你的第一步。", "The ruins await your first step.")}</p>${runs.map((r, i) => `<button class="loot-card" data-history="${i}"><span class="item-art">${r.won ? "ᛟ" : "ᚾ"}</span><span><strong>${r.won ? txt("符文重燃", "RUNE AWAKENED") : txt("誓约未尽", "OATH UNFINISHED")}</strong><small>${seconds(r.time)} · ${r.kills} ${txt("击败", "slain")} · ${r.items.map(itemName).join(" / ") || txt("初始装备", "Starting gear")}</small></span><span class="select-arrow">›</span></button>`).join("")}<button class="secondary-button" data-action="close">${txt("返回", "BACK")}</button>${runs.length ? `<button class="text-button" data-action="clear-history">${txt("清除本机记录", "CLEAR LOCAL HISTORY")}</button>` : ""}`, "history");
  }
  function start() {
    audio.init();
    audio.effect("stage");
    $("overlay").hidden = true;
    modalType = "";
    resultData = null;
    g.start();
  }
  function stageBanner(stage) {
    clearTimeout(bannerTimer);
    const el = $("stageBanner");
    el.innerHTML = `<small>${STAGES[stage].subtitle[L()]}</small><strong>${STAGES[stage].name[L()]}</strong>`;
    el.hidden = false;
    bannerTimer = setTimeout(() => el.hidden = true, 2300);
  }
  g.on((e) => {
    if (e.type === "stage") {
      modalType = "";
      $("overlay").hidden = true;
      stageBanner(e.stage);
      audio.effect("stage");
      notice(e.stage === 2 ? txt("缄默之王正在苏醒", "THE HOLLOW KING AWAKENS") : txt("守住誓约，穿越遗迹", "HOLD YOUR OATH. CROSS THE RUINS."), false, 2500);
      updateUI();
    }
    if (e.type === "wave") {
      if (e.wave === 1 && g.stage === 0) notice(txt("点击挥剑 · 按住举盾 · 点击地面移动", "TAP ATTACK · HOLD GUARD · TAP GROUND TO MOVE"), false, 6500);
      else if (g.stage < 2) notice(txt(`第 ${e.wave} 波敌人来袭`, `WAVE ${e.wave} APPROACHES`), false, 1800);
    }
    if (e.type === "loot") {
      audio.effect("choose");
      renderLoot();
    }
    if (e.type === "pause") renderPause();
    if (e.type === "warning" && e.kind === "quake") {
      audio.effect("warning");
      notice(txt("地面震击！离开红圈或闪避", "GROUND QUAKE! LEAVE RED OR DODGE"), true, 1700);
    }
    if (e.type === "perfect") {
      audio.effect("perfect");
      notice(txt("完美格挡！点击挥剑反击", "PERFECT PARRY! TAP ATTACK TO RIPOSTE"), false, 2e3);
    }
    if (e.type === "summon") notice(txt("暗影援军来袭 · 用爆发清场", "SHADOWS APPROACH · CLEAR THEM WITH BURST"), true, 3e3);
    if (e.type === "skill") audio.effect(e.skill);
    if (["swing", "attack", "hurt", "slam", "block", "dodge"].includes(e.type)) audio.effect(e.type);
    if (e.type === "controlMode") toast(e.auto ? txt("自动攻击已开启，仍可手动防守和闪避", "Auto attacks on. Guard and dodge remain manual.") : txt("已切换手动，点击挥剑发动攻击", "Manual mode. Tap Attack to swing."));
    if (e.type === "guardBreak") notice(txt("耐力耗尽，架势破碎！", "STAMINA EMPTY — GUARD BROKEN"), true, 1500);
    if (e.type === "home") {
      clearTimeout(bannerTimer);
      $("stageBanner").hidden = true;
      $("combatNotice").style.opacity = 0;
      $("overlay").hidden = true;
      modalType = "";
      updateUI();
    }
    if (e.type === "result") {
      resultData = { won: e.won, stats: structuredClone(e.stats) };
      saved.runs = [resultData.stats, ...saved.runs || []].slice(0, 5);
      persist();
      audio.effect(e.won ? "win" : "lose");
      setTimeout(() => {
        if (g.mode === "result") renderResult();
      }, 700);
    }
  });
  function openInfo(which) {
    if (g.mode === "battle") g.pause();
    if (which === "howto") renderHowto();
    else if (which === "about") renderAbout();
    else renderHistory();
  }
  $("language").onclick = () => {
    lang = lang === "zh" ? "en" : "zh";
    saved.lang = lang;
    persist();
    setLanguage();
  };
  $("sound").onclick = () => {
    audio.init();
    audio.setEnabled(!audio.enabled);
    saved.sound = audio.enabled;
    persist();
    updateSound();
    if (audio.enabled) audio.effect("choose");
  };
  $("start").onclick = start;
  $("pause").onclick = () => g.pause();
  $("burst").onclick = () => g.skill("burst");
  $("attack").onclick = () => g.requestAttack();
  $("dodge").onclick = () => g.skill("dodge");
  $("autoMode").onclick = () => {
    g.setAuto(!g.hero.auto);
    updateUI();
  };
  $("howTo").onclick = () => openInfo("howto");
  $("homeMark").onclick = () => openInfo("about");
  $("recordsButton").onclick = () => openInfo("history");
  $("burstIcon").innerHTML = icon("burst");
  $("guardIcon").innerHTML = icon("shield");
  $("pause").innerHTML = icon("pause");
  $("overlay").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    if (button.dataset.item) {
      audio.effect("choose");
      g.choose(button.dataset.item);
      return;
    }
    if (button.dataset.history !== void 0) {
      const stats = saved.runs[Number(button.dataset.history)];
      resultData = { won: stats.won, stats };
      renderDetails();
      return;
    }
    switch (button.dataset.action) {
      case "resume":
        closeModal();
        break;
      case "restart":
        start();
        break;
      case "home":
        g.home();
        break;
      case "howto":
        renderHowto();
        break;
      case "close":
        closeModal();
        break;
      case "details":
        renderDetails();
        break;
      case "result":
        if (g.mode === "result") renderResult();
        else renderHistory();
        break;
      case "clear-history":
        saved.runs = [];
        persist();
        renderHistory();
        toast(txt("本机记录已清除", "Local history cleared"));
        break;
      case "export": {
        const blob = new Blob([JSON.stringify(resultData.stats, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url;
        a.download = "rune-expedition-run.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1e3);
        toast(txt("本局记录已保存", "Run data saved"));
        break;
      }
    }
  });
  var heldKeys = /* @__PURE__ */ new Set();
  var guardPointer = null;
  function keyboardMove() {
    g.setMoveInput((heldKeys.has("d") || heldKeys.has("arrowright") ? 1 : 0) - (heldKeys.has("a") || heldKeys.has("arrowleft") ? 1 : 0), (heldKeys.has("s") || heldKeys.has("arrowdown") ? 1 : 0) - (heldKeys.has("w") || heldKeys.has("arrowup") ? 1 : 0));
  }
  var guardKeys = ["q", "k", "2"];
  $("guard").addEventListener("pointerdown", (e) => {
    if (guardPointer !== null) return;
    e.preventDefault();
    audio.init();
    guardPointer = e.pointerId;
    $("guard").setPointerCapture(e.pointerId);
    g.setGuard(true);
    updateUI();
  });
  function releaseGuard(e) {
    if (e && e.pointerId !== guardPointer) return;
    guardPointer = null;
    if (!guardKeys.some((k) => heldKeys.has(k))) g.setGuard(false);
  }
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) $("guard").addEventListener(event, releaseGuard);
  $("guard").addEventListener("contextmenu", (e) => e.preventDefault());
  $("scene").addEventListener("pointerdown", (e) => {
    if (g.mode !== "battle") return;
    e.preventDefault();
    const p = art.screenToWorld(e.clientX, e.clientY);
    const target = g.enemies.filter((v) => !v.dying && Math.abs(v.x - p.x) < v.radius + 12 && p.y < v.y + 15 && p.y > v.y - (v.kind === "boss" ? 180 : 90)).sort((a, b) => b.y - a.y)[0];
    if (target) g.selectTarget(target.id);
    else g.moveTo(p.x, p.y);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !$("overlay").hidden) {
      const buttons = [...$("overlayContent").querySelectorAll("button")];
      if (!buttons.length) return;
      const first = buttons[0], last2 = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last2.focus();
      } else if (!e.shiftKey && document.activeElement === last2) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (g.mode === "battle") g.pause();
      else if (g.mode === "paused") closeModal();
      else if (["howto", "about", "history"].includes(modalType)) closeModal();
      return;
    }
    if (g.mode !== "battle") return;
    const key = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      e.preventDefault();
      heldKeys.add(key);
      keyboardMove();
      return;
    }
    if (guardKeys.includes(key)) {
      e.preventDefault();
      if (!e.repeat) {
        heldKeys.add(key);
        g.setGuard(true);
      }
      return;
    }
    if (["j", "1", " ", "l", "3", "e", "4", "m"].includes(key)) {
      e.preventDefault();
      if (e.repeat) return;
      if (["j", "1"].includes(key)) g.requestAttack();
      else if ([" ", "l", "3"].includes(key)) g.skill("dodge");
      else if (["e", "4"].includes(key)) g.skill("burst");
      else g.setAuto(!g.hero.auto);
    }
  });
  document.addEventListener("keyup", (e) => {
    heldKeys.delete(e.key.toLowerCase());
    keyboardMove();
    if (guardKeys.includes(e.key.toLowerCase()) && guardPointer === null && !guardKeys.some((k) => heldKeys.has(k))) g.setGuard(false);
  });
  function clearInputs() {
    heldKeys.clear();
    guardPointer = null;
    g.resetInput();
  }
  g.on((e) => {
    if (["pause", "home", "loot", "result", "stage"].includes(e.type)) clearInputs();
  });
  window.addEventListener("blur", () => {
    clearInputs();
    if (g.mode === "battle") g.pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInputs();
      if (g.mode === "battle") g.pause();
    }
  });
  function resize() {
    art.resize();
    fitArena();
  }
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe($("game"));
  var last = performance.now();
  var uiTimer = 0;
  function frame(now) {
    const dt = Math.min(0.04, (now - last) / 1e3);
    last = now;
    g.update(dt);
    art.render(g);
    audio.tick(g.mode, g.stage);
    uiTimer += dt;
    if (uiTimer > 0.06) {
      updateUI();
      uiTimer = 0;
    }
    requestAnimationFrame(frame);
  }
  setLanguage();
  requestAnimationFrame(frame);
})();
