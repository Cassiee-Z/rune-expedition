(() => {
  // engine.js?v=2
  var ITEMS = {
    ember: { icon: "sword", color: "#df9b6c", name: ["赤焰长刃", "Emberblade"], tag: ["灼烧流派", "BURN BUILD"], desc: ["攻击 +5；命中附加持续灼烧。", "+5 attack. Hits ignite enemies."] },
    storm: { icon: "bolt", color: "#a6cee0", name: ["疾风双刃", "Gale Blades"], tag: ["暴击流派", "CRITICAL BUILD"], desc: ["攻击速度 +25%；暴击率 +15%。", "25% faster attacks. +15% critical chance."] },
    iron: { icon: "shield", color: "#bdc797", name: ["暮铁誓盾", "Duskiron Oath"], tag: ["守护流派", "GUARDIAN BUILD"], desc: ["生命上限 +60；攻击 +3；击杀回复 6。", "+60 max HP, +3 attack. Kills restore 6 HP."] },
    furnace: { icon: "flame", color: "#df9b6c", name: ["余烬之心", "Cinder Heart"], tag: ["爆发强化", "BURST UPGRADE"], desc: ["符文爆发伤害 +60%；所有攻击附加灼烧。", "Rune Burst deals 60% more damage. All hits ignite."] },
    thunder: { icon: "bolt", color: "#a6cee0", name: ["雷鸣符石", "Thunder Sigil"], tag: ["连锁强化", "CHAIN UPGRADE"], desc: ["每 3 次攻击触发连锁闪电；暴击率 +10%。", "Every third attack chains lightning. +10% critical chance."] },
    aegis: { icon: "shield", color: "#bdc797", name: ["不屈圣印", "Unbroken Seal"], tag: ["护盾强化", "SHIELD UPGRADE"], desc: ["护盾吸收量 +40；开启护盾时回复 20 生命。", "Shield absorbs 40 more damage and restores 20 HP."] }
  };
  var STAGES = [
    { name: ["旧城门", "The Fallen Gate"], subtitle: ["CHAPTER I", "CHAPTER I"], waves: [["wraith", "wraith", "wraith"], ["wraith", "caster", "wraith"], ["brute", "wraith", "caster"]] },
    { name: ["灰烬回廊", "The Ashen Hall"], subtitle: ["CHAPTER II", "CHAPTER II"], waves: [["wraith", "caster", "wraith", "wraith"], ["brute", "caster", "wraith"], ["brute", "caster", "wraith", "caster"]] },
    { name: ["王座之下", "Beneath the Throne"], subtitle: ["FINAL CHAPTER", "FINAL CHAPTER"], waves: [["boss"]] }
  ];
  var Expedition = class {
    constructor(random = Math.random) {
      this.random = random;
      this.listeners = [];
      this.mode = "home";
      this.time = 0;
      this.visualTime = 0;
      this.enemies = [];
      this.effects = [];
      this.texts = [];
      this.projectiles = [];
      this.stats = null;
      this.id = 0;
      this.shake = 0;
      this.flash = 0;
      this.hero = this.newHero();
    }
    newHero() {
      return { x: 220, y: 420, hp: 240, maxHp: 240, attack: 14, interval: 0.92, crit: 0.12, shield: 0, shieldTime: 0, attackTimer: 0.3, anim: 0, hurt: 0, facing: 1, items: [], burstCd: 0, guardCd: 0, hitCount: 0, target: null };
    }
    on(fn) {
      this.listeners.push(fn);
    }
    emit(type, data = {}) {
      for (const fn of this.listeners) fn({ type, ...data });
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
      this.nextWave = 2.7;
      this.id = 0;
      this.stats = { startedAt: (/* @__PURE__ */ new Date()).toISOString(), time: 0, damage: 0, received: 0, blocked: 0, kills: 0, crits: 0, burst: 0, guard: 0, perfectGuards: 0, coins: 0, items: [], events: [], stages: [] };
      this.mode = "battle";
      this.stageTime = 0;
      this.log("run_start");
      this.emit("stage", { stage: 0 });
    }
    log(event, data = {}) {
      if (this.stats) this.stats.events.push({ event, at: +this.time.toFixed(2), ...data });
    }
    pause() {
      if (this.mode === "battle") {
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
      this.mode = "home";
      this.enemies = [];
      this.effects = [];
      this.projectiles = [];
      this.texts = [];
      this.hero = this.newHero();
      this.emit("home");
    }
    spawn(kind, index = 0, total = 1) {
      const a = (index + 0.5) / total * Math.PI, boss = kind === "boss";
      const m = 1 + this.stage * 0.22;
      const hp = boss ? 1220 : kind === "brute" ? 125 * m : kind === "caster" ? 49 * m : 53 * m;
      const enemy = { id: ++this.id, kind, x: boss ? 220 : 80 + this.random() * 280, y: boss ? 270 : 235 + Math.sin(a) * 50, hp, maxHp: hp, attack: boss ? 11 : kind === "brute" ? 12 : kind === "caster" ? 8 : 7, speed: kind === "brute" ? 20 : kind === "caster" ? 23 : 30 + this.random() * 5, radius: boss ? 38 : kind === "brute" ? 25 : 18, timer: 1.8 + this.random(), anim: 0, hurt: 0, dying: 0, phase: 0, burn: 0, burnTick: 0.8, telegraph: 0, slamTimer: boss ? 7 : 0, summonTimer: boss ? 19 : 0, facing: 1 };
      this.enemies.push(enemy);
      this.effects.push({ kind: "spawn", x: enemy.x, y: enemy.y, t: 0, duration: 1.2, color: boss ? "#b06148" : "#8cbdad", r: enemy.radius * 1.8 });
      return enemy;
    }
    spawnWave() {
      const list = STAGES[this.stage].waves[this.wave];
      if (!list) return;
      list.forEach((type, i) => this.spawn(type, i, list.length));
      this.wave++;
      this.emit("wave", { wave: this.wave, total: STAGES[this.stage].waves.length });
      this.log("wave_start", { stage: this.stage + 1, wave: this.wave });
    }
    skill(which) {
      if (this.mode !== "battle") return false;
      const h = this.hero;
      if (which === "burst") {
        if (h.burstCd > 0) return false;
        h.burstCd = 8;
        h.anim = 0.5;
        this.stats.burst++;
        this.shake = 7;
        this.flash = 0.2;
        this.effects.push({ kind: "nova", x: h.x, y: h.y, t: 0, duration: 0.8, r: 200, color: "#b3f5e7" });
        for (const e of this.enemies.filter((e2) => !e2.dying)) {
          this.damage(e, (h.items.includes("furnace") ? 74 : 46) * (e.kind === "boss" ? 1.45 : 1), "burst");
          if (!e.dying) e.phase = 0.7;
        }
        this.log("skill_used", { skill: "burst" });
        this.emit("skill", { skill: "burst" });
        return true;
      }
      if (which === "guard") {
        if (h.guardCd > 0) return false;
        h.guardCd = 11;
        h.shield = h.items.includes("aegis") ? 110 : 70;
        h.shieldTime = 4.4;
        if (h.items.includes("aegis")) this.heal(20);
        this.stats.guard++;
        this.effects.push({ kind: "shield", x: h.x, y: h.y, t: 0, duration: 0.55, r: 50, color: "#c7e5b6" });
        this.log("skill_used", { skill: "guard" });
        this.emit("skill", { skill: "guard" });
        return true;
      }
      return false;
    }
    heal(amount) {
      const h = this.hero, actual = Math.min(amount, h.maxHp - h.hp);
      h.hp = Math.min(h.maxHp, h.hp + amount);
      if (actual > 0) this.float(h.x, h.y - 48, "+" + Math.ceil(actual), "#b6d698", false);
    }
    float(x, y, text, color = "#ede8ce", big = false) {
      this.texts.push({ x: x + (this.random() - 0.5) * 16, y, text, color, big, t: 0, duration: big ? 1.1 : 0.8 });
    }
    damage(e, amount, source = "attack", critical = false) {
      if (e.dying) return;
      const actual = Math.min(e.hp, amount);
      e.hp = Math.max(0, e.hp - amount);
      e.hurt = 0.16;
      this.stats.damage += actual;
      this.float(e.x, e.y - (e.kind === "boss" ? 95 : 48), Math.round(amount) + (critical ? "!" : ""), source === "burn" ? "#eba474" : critical ? "#f4d688" : source === "burst" ? "#b9ece4" : "#e3e9d9", critical);
      this.effects.push({ kind: "hit", x: e.x, y: e.y - 25, t: 0, duration: 0.22, r: critical ? 25 : 15, color: source === "burn" ? "#f9a865" : "#d1e8da" });
      if (source === "attack" && (this.hero.items.includes("ember") || this.hero.items.includes("furnace"))) e.burn = 3.5;
      if (e.hp <= 0) {
        e.dying = 0.75;
        this.stats.kills++;
        const coins = e.kind === "boss" ? 100 : e.kind === "brute" ? 20 : 8;
        this.stats.coins += coins;
        if (this.hero.items.includes("iron")) this.heal(6);
        this.effects.push({ kind: "soul", x: e.x, y: e.y - 20, t: 0, duration: 0.85, r: 5, color: "#b6dcd0", toX: this.hero.x, toY: this.hero.y - 30 });
        this.emit("kill", { kind: e.kind });
      }
    }
    hurtHero(amount, slam = false) {
      const h = this.hero;
      let blocked = 0;
      if (h.shield > 0) {
        blocked = Math.min(amount, h.shield);
        h.shield -= blocked;
        amount -= blocked;
        this.stats.blocked += blocked;
        this.float(h.x, h.y - 72, "−" + Math.round(blocked), "#b8e8df");
      }
      if (slam && blocked > 0) {
        this.stats.perfectGuards++;
        this.emit("perfect");
        this.log("slam_guarded");
      }
      if (amount > 0) {
        const actual = Math.min(h.hp, amount);
        h.hp = Math.max(0, h.hp - amount);
        h.hurt = 0.22;
        this.stats.received += actual;
        this.float(h.x, h.y - 58, "−" + Math.round(amount), "#f0ab99");
        this.shake = slam ? 9 : 3;
        this.emit("hurt");
      }
      if (h.hp <= 0) this.finish(false);
    }
    attack(e) {
      const h = this.hero;
      h.anim = 0.4;
      h.facing = e.x < h.x ? -1 : 1;
      h.target = e;
      h.hitCount++;
      const crit = this.random() < h.crit;
      if (crit) this.stats.crits++;
      this.damage(e, h.attack * (crit ? 1.9 : 1), "attack", crit);
      this.effects.push({ kind: "slash", x: (h.x + e.x) / 2, y: (h.y + e.y) / 2 - 25, t: 0, duration: 0.3, r: 48, color: crit ? "#eacf92" : "#b6d9d2", flip: h.facing });
      if (h.items.includes("thunder") && h.hitCount % 3 === 0) {
        const targets = this.enemies.filter((t) => !t.dying).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)).slice(0, 3);
        let last2 = { x: h.x, y: h.y };
        for (const t of targets) {
          this.effects.push({ kind: "lightning", x: last2.x, y: last2.y - 35, toX: t.x, toY: t.y - 35, t: 0, duration: 0.35, r: 20, color: "#b4e5ed" });
          this.damage(t, 22, "lightning");
          last2 = t;
        }
      }
      this.emit("attack", { critical: crit });
    }
    choose(id) {
      if (this.mode !== "loot" || !this.choices.includes(id)) return false;
      const h = this.hero;
      h.items.push(id);
      this.stats.items.push(id);
      if (id === "ember") h.attack += 5;
      if (id === "storm") {
        h.interval /= 1.25;
        h.crit += 0.15;
      }
      if (id === "iron") {
        h.maxHp += 60;
        h.hp += 60;
        h.attack += 3;
      }
      if (id === "thunder") h.crit += 0.1;
      this.heal(h.maxHp * 0.38);
      h.burstCd = 0;
      h.guardCd = 0;
      h.shield = 0;
      h.x = 220;
      h.y = 420;
      this.log("equipment_selected", { item: id, stage: this.stage + 1 });
      this.stage++;
      this.wave = 0;
      this.nextWave = 3;
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
      this.mode = "result";
      this.stats.time = +this.time.toFixed(1);
      this.stats.won = won;
      this.stats.stage = this.stage + 1;
      this.stats.damage = Math.round(this.stats.damage);
      this.stats.received = Math.round(this.stats.received);
      this.stats.blocked = Math.round(this.stats.blocked);
      this.log("run_end", { won });
      this.emit("result", { won, stats: this.stats });
    }
    update(dt) {
      dt = Math.min(dt, 0.04);
      this.visualTime += dt;
      if (this.mode === "paused") return;
      for (const fx of this.effects) fx.t += dt;
      this.effects = this.effects.filter((f) => f.t < f.duration);
      for (const t of this.texts) t.t += dt;
      this.texts = this.texts.filter((t) => t.t < t.duration);
      this.shake = Math.max(0, this.shake - dt * 25);
      this.flash = Math.max(0, this.flash - dt);
      if (this.mode !== "battle") return;
      this.time += dt;
      this.stageTime += dt;
      const h = this.hero;
      h.burstCd = Math.max(0, h.burstCd - dt);
      h.guardCd = Math.max(0, h.guardCd - dt);
      h.shieldTime = Math.max(0, h.shieldTime - dt);
      if (h.shieldTime === 0) h.shield = 0;
      h.anim = Math.max(0, h.anim - dt);
      h.hurt = Math.max(0, h.hurt - dt);
      h.attackTimer -= dt;
      for (const e of this.enemies) {
        if (this.mode !== "battle") return;
        if (e.dying) {
          e.dying -= dt;
          if (e.dying <= 0) e.remove = true;
          continue;
        }
        e.anim = Math.max(0, e.anim - dt);
        e.hurt = Math.max(0, e.hurt - dt);
        e.phase = Math.max(0, e.phase - dt);
        if (e.burn > 0) {
          e.burn -= dt;
          e.burnTick -= dt;
          if (e.burnTick <= 0) {
            e.burnTick = 0.75;
            this.damage(e, 7, "burn");
            if (e.dying) continue;
          }
        }
        if (e.kind === "boss") {
          e.slamTimer -= dt;
          e.summonTimer -= dt;
          if (e.slamTimer <= 0 && e.telegraph <= 0) {
            e.telegraph = 2.1;
            e.slamTimer = e.hp < e.maxHp * 0.45 ? 8 : 11;
            this.emit("warning");
            this.log("boss_telegraph");
          }
          if (e.telegraph > 0) {
            e.telegraph -= dt;
            if (e.telegraph <= 0) {
              e.anim = 0.7;
              this.hurtHero(70, true);
              this.effects.push({ kind: "slam", x: h.x, y: h.y, t: 0, duration: 0.85, r: 130, color: "#dd8462" });
              this.emit("slam");
            }
            continue;
          }
          if (e.summonTimer <= 0) {
            e.summonTimer = 24;
            this.spawn("wraith", 0, 2);
            this.spawn("wraith", 1, 2);
            this.emit("summon");
          }
        }
        if (e.phase > 0) continue;
        const dx = h.x - e.x, dy = h.y - e.y, dist = Math.hypot(dx, dy);
        e.facing = dx < 0 ? -1 : 1;
        const stop = e.kind === "caster" ? 140 : e.kind === "boss" ? 63 : 42;
        if (dist > stop) {
          e.x += dx / dist * e.speed * dt;
          e.y += dy / dist * e.speed * dt;
          e.walk = true;
        } else e.walk = false;
        e.timer -= dt;
        if (dist <= stop + 8 && e.timer <= 0) {
          e.timer = e.kind === "boss" ? 2 : e.kind === "brute" ? 3.3 : e.kind === "caster" ? 3.3 : 2.7;
          e.anim = 0.4;
          if (e.kind === "caster") {
            this.projectiles.push({ x: e.x, y: e.y - 28, toX: h.x, toY: h.y - 25, damage: e.attack, speed: 170, color: "#d99b86" });
          } else this.hurtHero(e.attack);
        }
      }
      if (this.mode !== "battle") return;
      this.enemies = this.enemies.filter((e) => !e.remove);
      const alive = this.enemies.filter((e) => !e.dying);
      if (alive.length) {
        const target = alive.reduce((a, b) => Math.hypot(a.x - h.x, a.y - h.y) < Math.hypot(b.x - h.x, b.y - h.y) ? a : b);
        const dx = target.x - h.x, dy = target.y - h.y, dist = Math.hypot(dx, dy);
        if (dist > (target.kind === "boss" ? 70 : 51)) {
          h.x += dx / dist * 59 * dt;
          h.y += dy / dist * 59 * dt;
          h.walk = true;
          h.facing = dx < 0 ? -1 : 1;
        } else {
          h.walk = false;
          if (h.attackTimer <= 0) {
            h.attackTimer = h.interval;
            this.attack(target);
          }
        }
      } else {
        h.walk = false;
        if (!this.enemies.length) {
          this.nextWave -= dt;
          if (this.nextWave <= 0) {
            if (this.wave < STAGES[this.stage].waves.length) {
              this.spawnWave();
              this.nextWave = 1.5;
            } else this.clearStage();
          }
        }
      }
      h.x = Math.min(380, Math.max(60, h.x));
      h.y = Math.min(550, Math.max(295, h.y));
      for (const p of this.projectiles) {
        if (this.mode !== "battle") return;
        p.toX = h.x;
        p.toY = h.y - 25;
        const dx = p.toX - p.x, dy = p.toY - p.y, d = Math.hypot(dx, dy);
        if (d < 12) {
          p.done = true;
          this.hurtHero(p.damage);
        } else {
          p.x += dx / d * p.speed * dt;
          p.y += dy / d * p.speed * dt;
        }
      }
      this.projectiles = this.projectiles.filter((p) => !p.done);
    }
  };

  // art.js?v=2
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
      c.scale(s, s);
      const bob = h.walk ? Math.sin(t * 12) * 1.8 : Math.sin(t * 2) * 0.6;
      c.translate(0, bob);
      const attack = h.anim > 0 ? Math.sin(h.anim / 0.4 * Math.PI) : 0;
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
      c.save();
      c.translate(-23, -34);
      c.rotate(-0.15);
      poly(c, [[-12, -13], [1, -19], [15, -13], [12, 8], [1, 20], [-10, 9]], metal(c, -10, -12, 15, 13, ["#293c45", "#637e77", "#253d44"]), "#b8bda080", 1.5);
      poly(c, [[-6, -10], [1, -13], [8, -10], [7, 6], [1, 12], [-5, 5]], "#233b42", "#9cae8b99", 1);
      rune(c, 1, 0, 1.05, "#bedac0");
      c.restore();
      c.save();
      c.translate(20, -39);
      c.rotate(-0.18 - attack * 1.5);
      poly(c, [[-4, 0], [4, 0], [6, 15], [1, 19], [-4, 15]], "#425c60", "#95a58c77");
      poly(c, [[0, 14], [5, 14], [5, 22], [0, 22]], "#192d34");
      c.translate(3, 18);
      c.rotate(0.16);
      poly(c, [[-3, 6], [-3, -48], [0, -64], [4, -48], [3, 6]], metal(c, -3, 0, 4, 0, ["#6b9093", "#e4eacb", "#75bbc0"]), "#9ee7dc88", 0.7);
      line(c, [[0, -49], [0, 3]], "#b7f5e5", 1);
      poly(c, [[-12, 4], [-8, 0], [8, 0], [13, 4], [7, 7], [-7, 7]], "#a2a278", "#dae0b477");
      poly(c, [[-2, 6], [3, 6], [3, 18], [-2, 18]], "#33434a", "#a9ab8a");
      oval(c, 0.5, 20, 3, 3, "#a5b18e");
      for (let j = 0; j < 3; j++) rune(c, 0, -14 - j * 9, 0.35, "#28545c", j);
      c.restore();
      if (h.hurt > 0) {
        c.globalCompositeOperation = "screen";
        glow(c, 0, -40, 43, "#d7815444");
      }
      if (h.shield > 0) {
        const alpha = 0.45 + 0.15 * Math.sin(t * 6);
        c.globalAlpha = alpha;
        c.strokeStyle = "#b5e2c1";
        c.lineWidth = 1.4;
        c.beginPath();
        c.ellipse(0, -34, 35, 51, 0, 0, TAU);
        c.stroke();
        glow(c, 0, -34, 53, "#8acab927");
        for (let i = 0; i < 5; i++) {
          const a = t * 0.4 + i * TAU / 5;
          rune(c, Math.cos(a) * 33, -34 + Math.sin(a) * 49, 0.6, "#d2e8b3", i);
        }
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
      const at = e.anim > 0 ? Math.sin(e.anim / 0.4 * Math.PI) * 5 : 0;
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
      } else if (f.kind === "nova" || f.kind === "slam" || f.kind === "shield" || f.kind === "spawn") {
        const r = f.r * (0.15 + p);
        glow(c, f.x, f.y - 10, r, f.kind === "slam" ? "#dc815545" : "#9edacc30");
        c.strokeStyle = f.color;
        c.lineWidth = f.kind === "spawn" ? 1 : 3 * (1 - p);
        c.beginPath();
        c.ellipse(f.x, f.y, r, r * 0.55, 0, 0, TAU);
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
      c.translate(0, o + (isHome ? 0 : 160));
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
        const boss = g2.enemies.find((e) => e.kind === "boss" && !e.dying);
        if (boss?.telegraph > 0) {
          const k = 1 - boss.telegraph / 2.1;
          oval(c, g2.hero.x, g2.hero.y, 75 + 12 * k, 40 + 8 * k, `rgba(181,77,52,${0.1 + 0.12 * k})`);
          c.strokeStyle = `rgba(239,152,112,${0.5 + k * 0.5})`;
          c.lineWidth = 2;
          c.beginPath();
          c.ellipse(g2.hero.x, g2.hero.y, 78, 43, 0, 0, TAU);
          c.stroke();
          c.beginPath();
          c.ellipse(g2.hero.x, g2.hero.y, 78 * k, 43 * k, 0, 0, TAU);
          c.stroke();
          for (let i = 0; i < 5; i++) rune(c, g2.hero.x + Math.cos(i * TAU / 5) * 65, g2.hero.y + Math.sin(i * TAU / 5) * 36, 1, "#eaa87d", i);
        }
        const actors = [...g2.enemies, { ...g2.hero, isHero: true }].sort((a, b) => a.y - b.y);
        for (const actor of actors) {
          if (actor.isHero) this.drawKnight(c, actor.x, actor.y, 1.05, t, actor);
          else this.drawEnemy(c, actor, t);
        }
        for (const p of g2.projectiles) {
          glow(c, p.x, p.y, 15, "#de956b66");
          oval(c, p.x, p.y, 4, 4, p.color);
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

  // audio.js?v=2
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
    $("sessionNote").textContent = txt("自动战斗 · 装备构筑 · 约 3 分钟", "AUTO COMBAT · BUILD YOUR GEAR · ~3 MIN");
    $("howTo").textContent = txt("远征指南", "HOW TO PLAY");
    $("recordsButton").textContent = txt("远征记录", "RUN HISTORY");
    $("burstLabel").textContent = txt("符文爆发", "RUNE BURST");
    $("guardLabel").textContent = txt("誓约护盾", "OATH SHIELD");
    $("burstHint").textContent = txt("全场伤害 · 8秒冷却", "AREA DAMAGE · 8s");
    $("guardHint").textContent = txt("抵挡重击 · 11秒冷却", "BLOCK DAMAGE · 11s");
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
    if (g.mode === "battle") notice(txt("自动攻击中 · 点击下方技能掌控战局", "AUTO ATTACKING · TAP SKILLS TO TURN THE TIDE"), false, 2200);
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
    $("healthText").textContent = `${Math.ceil(h.hp)} / ${h.maxHp}` + (h.shield > 0 ? ` +${Math.ceil(h.shield)}` : "");
    $("healthFill").style.width = h.hp / h.maxHp * 100 + "%";
    $("shieldFill").style.width = Math.min(100, h.shield / h.maxHp * 100) + "%";
    $("attackStat").textContent = txt("攻击 ", "ATK ") + h.attack;
    $("critStat").textContent = txt("暴击 ", "CRIT ") + Math.round(h.crit * 100) + "%";
    $("goldStat").textContent = txt("灵魂碎片 ", "SOULS ") + (g.stats?.coins || 0);
    const boss = g.enemies.find((e) => e.kind === "boss" && !e.dying);
    $("bossHud").hidden = !boss;
    if (boss) {
      $("bossHealth").textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
      $("bossFill").style.width = boss.hp / boss.maxHp * 100 + "%";
    }
    for (const [name, cd, total] of [["burst", h.burstCd, 8], ["guard", h.guardCd, 11]]) {
      const b = $(name);
      b.classList.toggle("on-cooldown", cd > 0.03);
      b.style.setProperty("--cd", Math.min(1, cd / total));
      $(name + "Cd").textContent = Math.ceil(cd) + "s";
      b.disabled = cd > 0 || g.mode !== "battle";
    }
    $("guard").classList.toggle("ready-pulse", !!boss?.telegraph && h.guardCd <= 0);
    $("burst").classList.toggle("ready-pulse", g.time < 16 && h.burstCd === 0 && g.enemies.length > 0);
    const equipment = h.items.map((id) => `<span>${icon(ITEMS[id].icon)}${itemName(id)}</span>`).join("");
    if ($("equipped").innerHTML !== equipment) $("equipped").innerHTML = equipment;
    document.querySelectorAll(".chapter-progress i").forEach((el, i) => {
      el.className = i < g.stage ? "done" : i === g.stage ? "current" : "";
    });
    $("battleHint").textContent = txt("骑士自动追击 · 手动技能决定胜负", "AUTO ATTACK · YOUR SKILLS MAKE THE DIFFERENCE");
  }
  function renderLoot() {
    const chapter = g.stage;
    modal(`<div class="eyebrow">${txt("遗迹馈赠", "RELIC DISCOVERED")}</div><h2 id="overlayTitle">${txt("选择你的力量", "CHOOSE YOUR POWER")}</h2><p class="subcopy">${txt("每次选择，都会改变接下来的战斗。", "Every choice shapes the battles ahead.")}</p><div class="loot-list">${g.choices.map((id) => {
      const it = ITEMS[id];
      return `<button class="loot-card" data-item="${id}"><span class="item-art" style="color:${it.color}">${icon(it.icon)}</span><span><strong>${it.name[L()]}</strong><small>${it.desc[L()]}</small><span class="item-tag">${it.tag[L()]}</span></span><span class="select-arrow">›</span></button>`;
    }).join("")}</div><p class="recovery-note">${txt("选择后回复 38% 最大生命，并重置技能冷却。", "Restore 38% of max HP and reset skill cooldowns.")}</p><p class="small-note">${txt("下一站：", "NEXT: ")}${STAGES[chapter + 1].name[L()]}</p>`, "loot");
  }
  function renderPause() {
    modal(`<div class="eyebrow">${txt("暂歇于遗迹之间", "A MOMENT BETWEEN BATTLES")}</div><h2 id="overlayTitle">${txt("远征已暂停", "EXPEDITION PAUSED")}</h2><p class="subcopy">${txt("深呼吸。下一次挥剑，为你而起。", "Take a breath. The next strike is yours.")}</p><button class="primary-button" data-action="resume">${txt("继续远征", "RESUME")}</button><button class="secondary-button" data-action="howto">${txt("查看远征指南", "HOW TO PLAY")}</button><button class="text-button" data-action="home">${txt("结束本局，返回入口", "END RUN & RETURN")}</button>`, "pause");
  }
  function renderHowto() {
    modal(`<div class="eyebrow">FIELD GUIDE</div><h2 id="overlayTitle">${txt("远征指南", "YOUR FIELD GUIDE")}</h2><div class="howto-row"><span>01</span><div><strong>${txt("你来决策，骑士来战斗", "The knight fights. You decide.")}</strong><p>${txt("骑士会自动接近并攻击敌人，无需移动。点击「符文爆发」对场上敌人造成伤害。", "Your knight moves and attacks automatically. Tap Rune Burst to damage every enemy on the field.")}</p></div></div><div class="howto-row"><span>02</span><div><strong>${txt("在重击落下前，举起护盾", "Raise your shield before impact.")}</strong><p>${txt("Boss脚下出现红色预警时，点击「誓约护盾」。护盾持续约4秒，能够抵挡蓄力重击。", "When the boss marks a red warning circle, tap Oath Shield. Its four-second protection can absorb the heavy strike.")}</p></div></div><div class="howto-row"><span>03</span><div><strong>${txt("两次选择，构筑你的流派", "Two choices. Your own build.")}</strong><p>${txt("前两场战斗后，各选择一件装备。灼烧、暴击或守护，尝试不同组合，再挑战缄默之王。", "Choose a relic after each of the first two battles. Combine burn, critical hits, or protection to face the Hollow King.")}</p></div></div><p class="small-note">${txt("电脑快捷键：1 / 空格释放爆发，2 / Q开启护盾，Esc暂停。", "KEYBOARD: 1 / Space for Burst, 2 / Q for Shield, Esc to pause.")}</p><button class="secondary-button" data-action="close">${txt("明白了", "GOT IT")}</button>`, "howto");
  }
  function renderAbout() {
    modal(`<div class="eyebrow">AN ORIGINAL DEMO BY CASSIE</div><h2 id="overlayTitle">${txt("符文远征", "RUNE EXPEDITION")}</h2><p class="subcopy">${txt("一段关于抉择、成长与最后一击的暗黑奇幻远征。", "A dark-fantasy expedition about choices, growth, and the final strike.")}</p><div class="howto-row"><span>ᛟ</span><div><strong>${txt("小小旅程，完整冒险", "A small journey. A complete adventure.")}</strong><p>${txt("三场战斗、六件可选装备、一个最终Boss。支持中英文切换，手机与电脑均可试玩。", "Three battles, six selectable relics, and one final boss. Play in Chinese or English, on mobile or desktop.")}</p></div></div><p class="small-note">${txt("这是借助 AI 编程工具制作的个人原创试玩作品。美术由程序绘制，音乐与音效实时合成。战斗记录仅保存在当前浏览器，可在远征记录中清除。", "An original personal demo built with AI coding assistance. Artwork is drawn procedurally; music and sound are synthesized in real time. Run history stays in this browser and can be cleared.")}</p><button class="secondary-button" data-action="close">${txt("返回", "BACK")}</button>`, "about");
  }
  function renderResult() {
    if (!resultData) return;
    const { won, stats } = resultData;
    modal(`<div class="result-seal ${won ? "" : "defeat"}">${won ? "ᛟ" : "ᚾ"}</div><div class="eyebrow">${won ? "EXPEDITION COMPLETE" : "THE OATH REMAINS"}</div><h2 id="overlayTitle">${won ? txt("符文重燃", "THE RUNE AWAKENS") : txt("誓约未尽", "RISE AGAIN")}</h2><p class="subcopy">${won ? txt("长夜退去。你带回了遗迹最后的光。", "The long night recedes. You return with its final light.") : txt("这次远征暂告结束。换一种选择，再次出发。", "This expedition ends here. A new choice may change your fate.")}</p><div class="result-stats"><div><strong>${seconds(stats.time)}</strong><span>${txt("战斗用时", "BATTLE TIME")}</span></div><div><strong>${stats.kills}</strong><span>${txt("击败敌人", "ENEMIES SLAIN")}</span></div><div><strong>${stats.damage.toLocaleString()}</strong><span>${txt("累计伤害", "TOTAL DAMAGE")}</span></div></div><div class="result-build">${stats.items.map((id) => `<span>${itemName(id)}</span>`).join("")}</div><p class="result-tip">${won ? txt("下一次，试试不同的装备组合。", "Try a different relic combination on your next run.") : txt("在红色预警出现时开启护盾，可以抵挡Boss重击。", "Activate your shield during the red warning to block the boss’s heavy strike.")}</p><button class="primary-button" data-action="restart">${txt("再次远征", "ANOTHER EXPEDITION")}</button><button class="secondary-button" data-action="details">${txt("查看战斗回顾", "VIEW BATTLE RECAP")}</button><button class="text-button" data-action="home">${txt("返回入口", "RETURN TO THE GATE")}</button>`, "result");
  }
  function renderDetails() {
    const s = resultData?.stats;
    if (!s) return;
    const rows = [[txt("战斗用时", "Battle time"), seconds(s.time)], [txt("完成关卡", "Stages cleared"), `${s.stages.length} / 3`], [txt("累计伤害", "Damage dealt"), s.damage], [txt("承受伤害", "Damage received"), s.received], [txt("护盾抵挡", "Damage blocked"), s.blocked], [txt("暴击次数", "Critical hits"), s.crits], [txt("爆发使用", "Rune Bursts"), s.burst], [txt("护盾使用", "Shields used"), s.guard], [txt("成功抵挡重击", "Heavy strikes blocked"), s.perfectGuards], [txt("灵魂碎片", "Soul shards"), s.coins]];
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
      if (e.wave === 1 && g.stage === 0) notice(txt("自动攻击中 · 点击「符文爆发」清理敌人", "AUTO ATTACKING · TAP RUNE BURST TO STRIKE"), false, 6500);
      else if (g.stage < 2) notice(txt(`第 ${e.wave} 波敌人来袭`, `WAVE ${e.wave} APPROACHES`), false, 1800);
    }
    if (e.type === "loot") {
      audio.effect("choose");
      renderLoot();
    }
    if (e.type === "pause") renderPause();
    if (e.type === "warning") {
      audio.effect("warning");
      notice(txt("重击蓄力！现在开启护盾", "HEAVY STRIKE! RAISE YOUR SHIELD"), true, 2300);
    }
    if (e.type === "perfect") {
      audio.effect("perfect");
      notice(txt("重击已抵挡 · 誓约不破", "HEAVY STRIKE BLOCKED · OATH UNBROKEN"), false, 2e3);
    }
    if (e.type === "summon") notice(txt("暗影援军来袭 · 用爆发清场", "SHADOWS APPROACH · CLEAR THEM WITH BURST"), true, 3e3);
    if (e.type === "skill") audio.effect(e.skill);
    if (["attack", "hurt", "slam"].includes(e.type)) audio.effect(e.type);
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
  $("guard").onclick = () => g.skill("guard");
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
    if (g.mode === "battle" && !e.repeat) {
      if (["1", " "].includes(e.key)) {
        e.preventDefault();
        g.skill("burst");
      }
      if (["2", "q", "Q"].includes(e.key)) {
        e.preventDefault();
        g.skill("guard");
      }
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && g.mode === "battle") g.pause();
  });
  window.addEventListener("resize", () => art.resize());
  new ResizeObserver(() => art.resize()).observe($("game"));
  var last = performance.now();
  var uiTimer = 0;
  function frame(now) {
    const dt = Math.min(0.04, (now - last) / 1e3);
    last = now;
    g.update(dt);
    art.render(g);
    audio.tick(g.mode, g.stage);
    uiTimer += dt;
    if (uiTimer > 0.08) {
      updateUI();
      uiTimer = 0;
    }
    requestAnimationFrame(frame);
  }
  setLanguage();
  requestAnimationFrame(frame);
})();
