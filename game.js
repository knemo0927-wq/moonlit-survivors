(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const mobileControls = document.getElementById("mobileControls");
  const mobileJoystick = document.getElementById("mobileJoystick");
  const mobileJoystickKnob = document.getElementById("mobileJoystickKnob");
  const screens = {
    title: document.getElementById("titleScreen"),
    levelup: document.getElementById("levelScreen"),
    gameover: document.getElementById("gameoverScreen"),
    victory: document.getElementById("victoryScreen"),
  };
  const upgradeCards = document.getElementById("upgradeCards");
  const gameoverStats = document.getElementById("gameoverStats");
  const victoryStats = document.getElementById("victoryStats");

  const WORLD = { width: 2400, height: 1600 };
  const MAX_ENEMIES = 180;
  const TWO_PI = Math.PI * 2;
  const keys = new Set();
  const pointer = { x: 0, y: 0 };
  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
  const touchJoystick = {
    enabled: false,
    active: false,
    activePointerId: null,
    vector: { x: 0, y: 0 },
    radius: 0,
  };

  let state = "title";
  let lastTime = 0;
  let spawnTimer = 0;
  let bossSpawned = false;
  let activeChoices = [];
  let resizeScale = 1;

  const camera = { x: 0, y: 0 };
  const enemies = [];
  const gems = [];
  const bullets = [];
  const mines = [];
  const floaters = [];
  const hitSparks = [];
  const explosionEffects = [];
  const hitRings = [];
  const damageNumbers = [];
  const MAX_HIT_SPARKS = 24;
  const EXPLOSION_FPS = 12;

  const PLAYER_HIT_FEEDBACK = {
    vignetteDuration: 0.18,
    vignetteCooldown: 0.22,
    ringDuration: 0.24,
    hpShakeDuration: 0.12,
    hpTrailDuration: 0.5,
    damageNumberInterval: 0.4,
  };

  const playerFeedback = {
    vignetteTimer: 0,
    vignetteCooldown: 0,
    vignetteAlpha: 0,
    hpShakeTimer: 0,
    hpTrailTimer: 0,
    hpTrailStartRatio: 1,
    damageNumberTimer: 0,
    damageNumberAmount: 0,
  };

  const SPRITE_META = {
    player: {
      src: "assets/sprites/player_luna.png",
      height: 86,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#a9d8ff",
    },
    playerWalkLeft: {
      src: "assets/sprites/player_luna_walk_left.png",
      height: 86,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#a9d8ff",
    },
    playerWalkRight: {
      src: "assets/sprites/player_luna_walk_right.png",
      height: 86,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#a9d8ff",
    },
    worm: {
      src: "assets/sprites/enemy_shadow_worm.png",
      height: 56,
      anchorX: 0.5,
      anchorY: 0.58,
      glow: "#ff4a6a",
      rotateToPlayer: true,
    },
    wormMove1: {
      src: "assets/sprites/enemy_shadow_worm_move_1.png",
      height: 56,
      anchorX: 0.5,
      anchorY: 0.58,
      glow: "#ff4a6a",
      rotateToPlayer: true,
    },
    wormMove2: {
      src: "assets/sprites/enemy_shadow_worm_move_2.png",
      height: 56,
      anchorX: 0.5,
      anchorY: 0.58,
      glow: "#ff4a6a",
      rotateToPlayer: true,
    },
    chaser: {
      src: "assets/sprites/enemy_night_chaser.png",
      height: 78,
      anchorX: 0.5,
      anchorY: 0.62,
      glow: "#ff4a6a",
      rotateToPlayer: true,
    },
    chaserRun1: {
      src: "assets/sprites/enemy_night_chaser_run_1.png",
      height: 78,
      anchorX: 0.5,
      anchorY: 0.62,
      glow: "#ff4a6a",
      rotateToPlayer: true,
    },
    chaserRun2: {
      src: "assets/sprites/enemy_night_chaser_run_2.png",
      height: 78,
      anchorX: 0.5,
      anchorY: 0.62,
      glow: "#ff4a6a",
      rotateToPlayer: true,
    },
    sentinel: {
      src: "assets/sprites/enemy_petrified_sentinel.png",
      height: 94,
      anchorX: 0.5,
      anchorY: 0.7,
      glow: "#8fd7ff",
    },
    sentinelWalk1: {
      src: "assets/sprites/enemy_petrified_sentinel_walk_1.png",
      height: 94,
      anchorX: 0.5,
      anchorY: 0.7,
      glow: "#8fd7ff",
    },
    sentinelWalk2: {
      src: "assets/sprites/enemy_petrified_sentinel_walk_2.png",
      height: 94,
      anchorX: 0.5,
      anchorY: 0.7,
      glow: "#8fd7ff",
    },
    boss: {
      src: "assets/sprites/boss_eclipse_knight.png",
      height: 196,
      anchorX: 0.5,
      anchorY: 0.74,
      glow: "#a9d8ff",
    },
    moonlightBlade: {
      src: "assets/weapons/weapon_moonlight_blade.png",
      height: 46,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#d9f3ff",
    },
    silverBullet: {
      src: "assets/weapons/weapon_silver_bullet.png",
      height: 14,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#dff4ff",
    },
    starlightMineIdle: {
      src: "assets/weapons/weapon_starlight_mine_idle.png",
      height: 34,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#9bdfff",
    },
    starlightMineArmed: {
      src: "assets/weapons/weapon_starlight_mine_armed.png",
      height: 38,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#bfeeff",
    },
    starlightExplosion1: {
      src: "assets/effects/effect_starlight_explosion_1.png",
      height: 172,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#dff5ff",
    },
    starlightExplosion2: {
      src: "assets/effects/effect_starlight_explosion_2.png",
      height: 184,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#dff5ff",
    },
    starlightExplosion3: {
      src: "assets/effects/effect_starlight_explosion_3.png",
      height: 196,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#dff5ff",
    },
  };

  const SPRITES = Object.fromEntries(
    Object.entries(SPRITE_META).map(([key, meta]) => [key, loadSprite(meta.src)])
  );
  const BACKGROUND_TILE = loadSprite("assets/backgrounds/bg_moonlit_ruins_tile.png");

  const player = {
    x: WORLD.width / 2,
    y: WORLD.height / 2,
    radius: 13,
    hp: 100,
    maxHp: 100,
    speed: 180,
    pickupRadius: 45,
    level: 1,
    exp: 0,
    requiredExp: 9,
    kills: 0,
    time: 0,
    invulnFlash: 0,
    moving: false,
    weapons: {
      blade: { level: 1, angle: 0, cooldowns: new Map() },
      bullet: { level: 0, timer: 0 },
      mine: { level: 0, timer: 0 },
    },
    passives: {
      speed: 0,
      health: 0,
      magnet: 0,
    },
  };

  const ENEMY_TYPES = {
    worm: {
      name: "그림자 벌레",
      hp: 12,
      speed: 75,
      damage: 8,
      radius: 10,
      exp: 1,
      color: "#080b12",
      eye: "#ff3655",
    },
    chaser: {
      name: "밤의 추격자",
      hp: 18,
      speed: 125,
      damage: 10,
      radius: 13,
      exp: 2,
      color: "#07070c",
      eye: "#ff526d",
    },
    sentinel: {
      name: "석화된 파수꾼",
      hp: 45,
      speed: 55,
      damage: 16,
      radius: 18,
      exp: 4,
      color: "#101520",
      eye: "#82d7ff",
    },
    boss: {
      name: "월식의 기사",
      hp: 1200,
      speed: 65,
      damage: 24,
      radius: 34,
      exp: 35,
      color: "#05050b",
      eye: "#ff244b",
    },
  };

  const UPGRADES = [
    {
      id: "blade",
      title: "달빛 칼날 강화",
      desc: "회전하는 달빛 칼날이 더 빠르고 강하게 적을 베어냅니다.",
      available: () => player.weapons.blade.level < 6,
      apply: () => player.weapons.blade.level += 1,
    },
    {
      id: "bullet",
      title: "은빛 탄환",
      desc: "가장 가까운 적을 향해 자동으로 발사되는 탄환을 획득하거나 강화합니다.",
      available: () => player.weapons.bullet.level < 6,
      apply: () => player.weapons.bullet.level += 1,
    },
    {
      id: "mine",
      title: "별빛 지뢰",
      desc: "루나 주변에 별빛 지뢰를 설치하고 1초 뒤 폭발시킵니다.",
      available: () => player.weapons.mine.level < 6,
      apply: () => player.weapons.mine.level += 1,
    },
    {
      id: "speed",
      title: "신속한 발걸음",
      desc: "이동속도가 8% 증가합니다.",
      available: () => player.passives.speed < 5,
      apply: () => {
        player.passives.speed += 1;
        player.speed *= 1.08;
      },
    },
    {
      id: "health",
      title: "생명 부적",
      desc: "최대 체력이 20 증가하고 증가한 만큼 회복합니다.",
      available: () => player.passives.health < 5,
      apply: () => {
        player.passives.health += 1;
        player.maxHp += 20;
        player.hp = Math.min(player.maxHp, player.hp + 20);
      },
    },
    {
      id: "magnet",
      title: "자석 목걸이",
      desc: "경험치 보석 흡수 반경이 35 증가합니다.",
      available: () => player.passives.magnet < 5,
      apply: () => {
        player.passives.magnet += 1;
        player.pickupRadius += 35;
      },
    },
  ];

  const POTION = {
    id: "potion",
    title: "회복 물약",
    desc: "체력을 25 회복합니다.",
    available: () => true,
    apply: () => player.hp = Math.min(player.maxHp, player.hp + 25),
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resizeScale = dpr;
    updateMobileControls();
  }

  function resetGame() {
    enemies.length = 0;
    gems.length = 0;
    bullets.length = 0;
    mines.length = 0;
    floaters.length = 0;
    hitSparks.length = 0;
    explosionEffects.length = 0;
    hitRings.length = 0;
    damageNumbers.length = 0;
    resetPlayerFeedback();
    Object.assign(player, {
      x: WORLD.width / 2,
      y: WORLD.height / 2,
      radius: 13,
      hp: 100,
      maxHp: 100,
      speed: 180,
      pickupRadius: 45,
      level: 1,
      exp: 0,
      requiredExp: requiredExp(1),
      kills: 0,
      time: 0,
      invulnFlash: 0,
      moving: false,
      weapons: {
        blade: { level: 1, angle: 0, cooldowns: new Map() },
        bullet: { level: 0, timer: 0 },
        mine: { level: 0, timer: 0 },
      },
      passives: { speed: 0, health: 0, magnet: 0 },
    });
    spawnTimer = 0;
    bossSpawned = false;
    activeChoices = [];
    setState("playing");
  }

  function requiredExp(level) {
    return 5 + level * 4;
  }

  function setState(next) {
    state = next;
    for (const [name, screen] of Object.entries(screens)) {
      screen.classList.toggle("active", name === next);
    }
    overlay.style.display = next === "playing" ? "none" : "grid";
    updateMobileControls();
    if (next === "gameover") {
      gameoverStats.textContent = `${formatTime(player.time)} 생존 · 처치 ${player.kills} · 레벨 ${player.level}`;
    }
    if (next === "victory") {
      victoryStats.textContent = `${formatTime(player.time)} 만에 승리 · 처치 ${player.kills} · 레벨 ${player.level}`;
    }
  }

  function formatTime(seconds) {
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isMobileInputAvailable() {
    return coarsePointerQuery.matches || window.innerWidth <= 820;
  }

  function updateMobileControls() {
    touchJoystick.enabled = isMobileInputAvailable();
    mobileControls.classList.toggle("enabled", touchJoystick.enabled);
    mobileControls.classList.toggle("playing", state === "playing");
    if (!touchJoystick.enabled || state !== "playing") resetJoystick();
  }

  function resetJoystick() {
    const pointerId = touchJoystick.activePointerId;
    if (pointerId !== null && mobileJoystick.hasPointerCapture && mobileJoystick.hasPointerCapture(pointerId)) {
      mobileJoystick.releasePointerCapture(pointerId);
    }
    touchJoystick.active = false;
    touchJoystick.activePointerId = null;
    touchJoystick.vector.x = 0;
    touchJoystick.vector.y = 0;
    mobileJoystick.classList.remove("active");
    mobileJoystickKnob.style.transform = "translate(-50%, -50%)";
  }

  function updateJoystickFromPointer(event) {
    const rect = mobileJoystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.42;
    const deadzone = radius * 0.18;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const clampedDistance = Math.min(distance, radius);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;

    touchJoystick.radius = radius;
    mobileJoystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    if (distance <= deadzone) {
      touchJoystick.vector.x = 0;
      touchJoystick.vector.y = 0;
      return;
    }

    const normalized = (clampedDistance - deadzone) / (radius - deadzone);
    touchJoystick.vector.x = Math.cos(angle) * normalized;
    touchJoystick.vector.y = Math.sin(angle) * normalized;
  }

  function triggerJoystickRipple() {
    mobileJoystick.classList.remove("rippling");
    void mobileJoystick.offsetWidth;
    mobileJoystick.classList.add("rippling");
  }

  function resetActiveJoystick(event) {
    if (event && "pointerId" in event && event.pointerId !== touchJoystick.activePointerId) return;
    if (touchJoystick.activePointerId === null) return;
    resetJoystick();
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function resetPlayerFeedback() {
    playerFeedback.vignetteTimer = 0;
    playerFeedback.vignetteCooldown = 0;
    playerFeedback.vignetteAlpha = 0;
    playerFeedback.hpShakeTimer = 0;
    playerFeedback.hpTrailTimer = 0;
    playerFeedback.hpTrailStartRatio = 1;
    playerFeedback.damageNumberTimer = 0;
    playerFeedback.damageNumberAmount = 0;
  }

  function update(dt) {
    if (state !== "playing") return;
    player.time += dt;
    player.invulnFlash = Math.max(0, player.invulnFlash - dt);
    updatePlayerHitFeedback(dt);
    updatePlayer(dt);
    updateCamera();
    updateSpawning(dt);
    updateEnemies(dt);
    updateWeapons(dt);
    updateGems(dt);
    updateCombatEffects(dt);
    updateFloaters(dt);
    if (player.hp <= 0) setState("gameover");
  }

  function updatePlayer(dt) {
    let vx = 0;
    let vy = 0;
    if (touchJoystick.active) {
      vx = touchJoystick.vector.x;
      vy = touchJoystick.vector.y;
      const magnitude = Math.hypot(vx, vy);
      player.moving = magnitude > 0;
      player.x = clamp(player.x + vx * player.speed * dt, player.radius, WORLD.width - player.radius);
      player.y = clamp(player.y + vy * player.speed * dt, player.radius, WORLD.height - player.radius);
      return;
    } else {
      if (keys.has("KeyA") || keys.has("ArrowLeft")) vx -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) vx += 1;
      if (keys.has("KeyW") || keys.has("ArrowUp")) vy -= 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) vy += 1;
    }
    const magnitude = Math.hypot(vx, vy);
    const len = magnitude || 1;
    player.moving = magnitude > 0;
    player.x = clamp(player.x + (vx / len) * player.speed * dt, player.radius, WORLD.width - player.radius);
    player.y = clamp(player.y + (vy / len) * player.speed * dt, player.radius, WORLD.height - player.radius);
  }

  function updateCamera() {
    const viewW = canvas.width / resizeScale;
    const viewH = canvas.height / resizeScale;
    camera.x = clamp(player.x - viewW / 2, 0, WORLD.width - viewW);
    camera.y = clamp(player.y - viewH / 2, 0, WORLD.height - viewH);
  }

  function updateSpawning(dt) {
    if (player.time >= 300 && !bossSpawned) {
      trimEnemyCountForBoss();
      spawnEnemy("boss");
      bossSpawned = true;
    }
    if (enemies.length >= MAX_ENEMIES) return;
    spawnTimer -= dt;
    if (spawnTimer > 0) return;
    const table = spawnTable(player.time);
    spawnEnemy(weightedPick(table.types));
    spawnTimer = table.interval;
  }

  function spawnTable(time) {
    if (time < 60) return { interval: 1.0, types: [["worm", 1]] };
    if (time < 150) return { interval: 0.75, types: [["worm", 0.7], ["chaser", 0.3]] };
    if (time < 240) return { interval: 0.55, types: [["worm", 0.5], ["chaser", 0.3], ["sentinel", 0.2]] };
    if (time < 300) return { interval: 0.4, types: [["worm", 0.35], ["chaser", 0.35], ["sentinel", 0.3]] };
    return { interval: 0.6, types: [["chaser", 0.4], ["sentinel", 0.6]] };
  }

  function trimEnemyCountForBoss() {
    while (enemies.length >= MAX_ENEMIES) {
      enemies.shift();
    }
  }

  function weightedPick(entries) {
    let roll = Math.random();
    for (const [type, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return type;
    }
    return entries[entries.length - 1][0];
  }

  function spawnEnemy(type) {
    const spec = ENEMY_TYPES[type];
    const viewW = canvas.width / resizeScale;
    const viewH = canvas.height / resizeScale;
    const side = Math.floor(Math.random() * 4);
    const margin = 90;
    let x = player.x;
    let y = player.y;
    if (side === 0) {
      x = camera.x + Math.random() * viewW;
      y = camera.y - margin;
    } else if (side === 1) {
      x = camera.x + viewW + margin;
      y = camera.y + Math.random() * viewH;
    } else if (side === 2) {
      x = camera.x + Math.random() * viewW;
      y = camera.y + viewH + margin;
    } else {
      x = camera.x - margin;
      y = camera.y + Math.random() * viewH;
    }
    enemies.push({
      type,
      x: clamp(x, spec.radius, WORLD.width - spec.radius),
      y: clamp(y, spec.radius, WORLD.height - spec.radius),
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      damage: spec.damage,
      radius: spec.radius,
      exp: spec.exp,
      hitFlash: 0,
      animSeed: Math.random() * 100,
      nextSparkTime: 0,
      dashTimer: type === "boss" ? 4 : 0,
      dashTime: 0,
      dashVx: 0,
      dashVy: 0,
    });
  }

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      let speed = e.speed;
      let vx = dx / len;
      let vy = dy / len;

      if (e.type === "boss") {
        e.dashTimer -= dt;
        if (e.dashTimer <= 0 && e.dashTime <= 0) {
          e.dashTime = 0.55;
          e.dashTimer = 4;
          e.dashVx = vx;
          e.dashVy = vy;
        }
        if (e.dashTime > 0) {
          e.dashTime -= dt;
          speed = 265;
          vx = e.dashVx;
          vy = e.dashVy;
        }
      }

      e.x = clamp(e.x + vx * speed * dt, e.radius, WORLD.width - e.radius);
      e.y = clamp(e.y + vy * speed * dt, e.radius, WORLD.height - e.radius);

      const overlap = player.radius + e.radius - dist(player, e);
      if (overlap > 0) {
        damagePlayer(e.damage * dt, e.x, e.y);
        e.x -= vx * overlap * 0.35;
        e.y -= vy * overlap * 0.35;
      }

      if (e.hp <= 0) {
        killEnemy(i);
      }
    }
  }

  function killEnemy(index) {
    const e = enemies[index];
    enemies.splice(index, 1);
    player.weapons.blade.cooldowns.delete(e);
    player.kills += 1;
    createGem(e.x, e.y, e.exp, e.type === "boss");
    floaters.push({ x: e.x, y: e.y, text: "+", life: 0.6 });
    if (e.type === "boss") setState("victory");
  }

  function createGem(x, y, value, large = false) {
    gems.push({ x, y, value, radius: large ? 10 : 5, vx: 0, vy: 0 });
  }

  function updateWeapons(dt) {
    updateBlade(dt);
    updateBullets(dt);
    updateMines(dt);
  }

  function updateBlade(dt) {
    const blade = player.weapons.blade;
    blade.angle += dt * (2.1 + blade.level * 0.22);
    const blades = Math.min(4, 1 + Math.floor((blade.level - 1) / 2));
    const orbit = 54 + blade.level * 5;
    const damage = 10 + blade.level * 5;
    const hitRadius = 21;
    for (let b = 0; b < blades; b++) {
      const angle = blade.angle + b * TWO_PI / blades;
      const hit = {
        x: player.x + Math.cos(angle) * orbit,
        y: player.y + Math.sin(angle) * orbit,
      };
      for (const e of enemies) {
        const last = blade.cooldowns.get(e) || 0;
        if (player.time - last < 0.36) continue;
        if (Math.hypot(hit.x - e.x, hit.y - e.y) < hitRadius + e.radius) {
          damageEnemy(e, damage);
          blade.cooldowns.set(e, player.time);
        }
      }
    }
  }

  function updateBullets(dt) {
    const weapon = player.weapons.bullet;
    if (weapon.level > 0) {
      weapon.timer -= dt;
      const interval = Math.max(0.22, 0.85 - weapon.level * 0.08);
      if (weapon.timer <= 0) {
        const shots = weapon.level >= 4 ? 2 : 1;
        for (let i = 0; i < shots; i++) fireBullet(i * 0.16);
        weapon.timer = interval;
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let consumed = b.life <= 0;
      for (const e of enemies) {
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
          damageEnemy(e, b.damage);
          consumed = true;
          break;
        }
      }
      if (consumed) bullets.splice(i, 1);
    }
  }

  function fireBullet(angleOffset) {
    const target = nearestEnemy();
    if (!target) return;
    const angle = Math.atan2(target.y - player.y, target.x - player.x) + angleOffset;
    bullets.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * 440,
      vy: Math.sin(angle) * 440,
      radius: 5,
      damage: 15 + player.weapons.bullet.level * 7,
      life: 1.6,
    });
  }

  function nearestEnemy() {
    let best = null;
    let bestD = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  function updateMines(dt) {
    const weapon = player.weapons.mine;
    if (weapon.level > 0) {
      weapon.timer -= dt;
      if (weapon.timer <= 0) {
        const count = weapon.level >= 5 ? 2 : 1;
        for (let i = 0; i < count; i++) placeMine();
        weapon.timer = Math.max(1.2, 3.8 - weapon.level * 0.34);
      }
    }
    for (let i = mines.length - 1; i >= 0; i--) {
      const mine = mines[i];
      mine.timer -= dt;
      if (mine.timer <= 0) {
        explodeMine(mine);
        mines.splice(i, 1);
      }
    }
  }

  function placeMine() {
    const angle = Math.random() * TWO_PI;
    const range = 80 + Math.random() * 95;
    mines.push({
      x: clamp(player.x + Math.cos(angle) * range, 20, WORLD.width - 20),
      y: clamp(player.y + Math.sin(angle) * range, 20, WORLD.height - 20),
      timer: 1,
      radius: 76 + player.weapons.mine.level * 10,
      damage: 28 + player.weapons.mine.level * 12,
      pulse: Math.random() * TWO_PI,
    });
  }

  function explodeMine(mine) {
    for (const e of enemies) {
      if (Math.hypot(mine.x - e.x, mine.y - e.y) < mine.radius + e.radius) {
        damageEnemy(e, mine.damage);
      }
    }
    explosionEffects.push({
      x: mine.x,
      y: mine.y,
      life: 3 / EXPLOSION_FPS,
      duration: 3 / EXPLOSION_FPS,
      radius: mine.radius,
    });
    floaters.push({ x: mine.x, y: mine.y, text: "✦", life: 0.7, burst: mine.radius });
  }

  function damageEnemy(enemy, amount) {
    enemy.hp -= amount;
    enemy.hitFlash = enemy.type === "boss" ? 0.14 : 0.11;
    createHitSparks(enemy);
  }

  function createHitSparks(enemy) {
    const now = player.time;
    const isBoss = enemy.type === "boss";
    if (!isBoss && now < enemy.nextSparkTime && Math.random() > 0.28) return;

    enemy.nextSparkTime = now + 0.055;
    const colors = enemy.type === "sentinel"
      ? ["#FFD2DC", "#FF4A6A", "#B78CFF", "#8FD7FF"]
      : ["#FFD2DC", "#FF4A6A", "#B78CFF"];
    const count = isBoss ? 7 : 3 + Math.floor(Math.random() * 3);
    const towardPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);

    for (let i = 0; i < count; i++) {
      if (hitSparks.length >= MAX_HIT_SPARKS) hitSparks.shift();
      const angle = towardPlayer + Math.PI + (Math.random() - 0.5) * 1.5;
      const speed = (isBoss ? 96 : 70) + Math.random() * 80;
      hitSparks.push({
        x: enemy.x + (Math.random() - 0.5) * enemy.radius,
        y: enemy.y - enemy.radius * 0.25 + (Math.random() - 0.5) * enemy.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (isBoss ? 2.4 : 1.8) + Math.random() * 2.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.14,
        duration: 0.14,
      });
    }
  }

  function updateCombatEffects(dt) {
    for (let i = hitSparks.length - 1; i >= 0; i--) {
      const spark = hitSparks[i];
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= Math.pow(0.04, dt);
      spark.vy *= Math.pow(0.04, dt);
      if (spark.life <= 0) hitSparks.splice(i, 1);
    }

    for (let i = explosionEffects.length - 1; i >= 0; i--) {
      explosionEffects[i].life -= dt;
      if (explosionEffects[i].life <= 0) explosionEffects.splice(i, 1);
    }
  }

  function damagePlayer(amount, sourceX = player.x, sourceY = player.y) {
    if (amount <= 0 || player.hp <= 0) return;

    const previousHp = player.hp;
    player.hp = Math.max(0, player.hp - amount);
    const actualDamage = previousHp - player.hp;
    if (actualDamage <= 0) return;

    const wasTrailingHp = playerFeedback.hpTrailTimer > 0;
    player.invulnFlash = 0.08;
    playerFeedback.hpShakeTimer = PLAYER_HIT_FEEDBACK.hpShakeDuration;
    playerFeedback.hpTrailTimer = PLAYER_HIT_FEEDBACK.hpTrailDuration;
    playerFeedback.hpTrailStartRatio = wasTrailingHp
      ? Math.max(playerFeedback.hpTrailStartRatio, previousHp / player.maxHp)
      : previousHp / player.maxHp;
    playerFeedback.damageNumberAmount += actualDamage;
    if (playerFeedback.damageNumberTimer <= 0) {
      playerFeedback.damageNumberTimer = PLAYER_HIT_FEEDBACK.damageNumberInterval;
    }

    if (playerFeedback.vignetteCooldown <= 0) {
      const baseAlpha = actualDamage >= 14 ? 0.24 : 0.16;
      playerFeedback.vignetteAlpha = baseAlpha;
      playerFeedback.vignetteTimer = PLAYER_HIT_FEEDBACK.vignetteDuration;
      playerFeedback.vignetteCooldown = PLAYER_HIT_FEEDBACK.vignetteCooldown;
      createPlayerHitRing(sourceX, sourceY);
      playSound("playerHit");
    }
  }

  function createPlayerHitRing(sourceX, sourceY) {
    const angleFromSource = Math.atan2(player.y - sourceY, player.x - sourceX);
    const sparks = Array.from({ length: 6 }, (_, index) => {
      const angle = angleFromSource + (index - 2.5) * 0.34 + (Math.random() - 0.5) * 0.22;
      return {
        angle,
        distance: 12 + Math.random() * 8,
        speed: 72 + Math.random() * 42,
        size: 2 + Math.random() * 2,
      };
    });
    hitRings.push({
      x: player.x,
      y: player.y,
      life: PLAYER_HIT_FEEDBACK.ringDuration,
      duration: PLAYER_HIT_FEEDBACK.ringDuration,
      startRadius: player.radius + 8,
      endRadius: player.radius + 34,
      sparks,
    });
  }

  function updatePlayerHitFeedback(dt) {
    playerFeedback.vignetteTimer = Math.max(0, playerFeedback.vignetteTimer - dt);
    playerFeedback.vignetteCooldown = Math.max(0, playerFeedback.vignetteCooldown - dt);
    playerFeedback.hpShakeTimer = Math.max(0, playerFeedback.hpShakeTimer - dt);
    playerFeedback.hpTrailTimer = Math.max(0, playerFeedback.hpTrailTimer - dt);

    if (playerFeedback.damageNumberTimer > 0) {
      playerFeedback.damageNumberTimer -= dt;
      if (playerFeedback.damageNumberTimer <= 0 && playerFeedback.damageNumberAmount > 0) {
        createPlayerDamageNumber(playerFeedback.damageNumberAmount);
        playerFeedback.damageNumberAmount = 0;
      }
    }

    for (let i = hitRings.length - 1; i >= 0; i--) {
      hitRings[i].life -= dt;
      if (hitRings[i].life <= 0) hitRings.splice(i, 1);
    }

    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      const number = damageNumbers[i];
      number.life -= dt;
      number.y -= 48 * dt;
      number.x += number.vx * dt;
      if (number.life <= 0) damageNumbers.splice(i, 1);
    }
  }

  function createPlayerDamageNumber(amount) {
    const rounded = Math.max(1, Math.round(amount));
    const angle = Math.random() * TWO_PI;
    const offset = player.radius + 18;
    damageNumbers.push({
      x: player.x + Math.cos(angle) * offset,
      y: player.y - 18 + Math.sin(angle) * offset * 0.45,
      vx: (Math.random() - 0.5) * 18,
      text: `-${rounded}`,
      life: 0.55,
      duration: 0.55,
    });
  }

  function playSound(name) {
    void name;
  }

  function updateGems(dt) {
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      const dx = player.x - g.x;
      const dy = player.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < player.pickupRadius) {
        const speed = 260 + (player.pickupRadius - d) * 8;
        g.x += (dx / d) * speed * dt;
        g.y += (dy / d) * speed * dt;
      }
      if (d < player.radius + g.radius + 2) {
        gainExp(g.value);
        gems.splice(i, 1);
      }
    }
  }

  function gainExp(amount) {
    player.exp += amount;
    while (player.exp >= player.requiredExp) {
      player.exp -= player.requiredExp;
      player.level += 1;
      player.requiredExp = requiredExp(player.level);
      openLevelUp();
      break;
    }
  }

  function openLevelUp() {
    activeChoices = chooseUpgrades();
    renderUpgradeCards();
    setState("levelup");
  }

  function chooseUpgrades() {
    const pool = UPGRADES.filter((u) => u.available());
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    while (shuffled.length < 3) shuffled.push(POTION);
    return shuffled;
  }

  function renderUpgradeCards() {
    upgradeCards.innerHTML = "";
    activeChoices.forEach((upgrade, index) => {
      const button = document.createElement("button");
      button.className = "upgrade-card";
      button.innerHTML = `
        <span class="upgrade-key">${index + 1}</span>
        <h3>${upgrade.title}</h3>
        <p>${upgrade.desc}</p>
      `;
      button.addEventListener("click", () => selectUpgrade(index));
      upgradeCards.appendChild(button);
    });
  }

  function selectUpgrade(index) {
    const upgrade = activeChoices[index];
    if (!upgrade || state !== "levelup") return;
    upgrade.apply();
    activeChoices = [];
    if (player.exp >= player.requiredExp) {
      player.exp -= player.requiredExp;
      player.level += 1;
      player.requiredExp = requiredExp(player.level);
      openLevelUp();
      return;
    }
    setState("playing");
  }

  function updateFloaters(dt) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].life -= dt;
      floaters[i].y -= 18 * dt;
      if (floaters[i].life <= 0) floaters.splice(i, 1);
    }
  }

  function draw() {
    updateCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorld();
    drawGems();
    drawMines();
    drawEnemies();
    drawPlayer();
    drawPlayerHitRings();
    drawBullets();
    drawBlade();
    drawCombatEffects();
    drawFloaters();
    drawPlayerDamageNumbers();
    drawDamageVignette();
    drawHud();
  }

  function worldToScreen(x, y) {
    return { x: x - camera.x, y: y - camera.y };
  }

  function loadSprite(src) {
    const image = new Image();
    image.src = src;
    return image;
  }

  function drawEntityShadow(x, y, width, height, alpha = 0.42) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y + height * 0.08, width, height, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  function drawSprite(key, x, y, options = {}) {
    const image = SPRITES[key];
    if (!image || !image.complete || image.naturalWidth === 0) return false;

    const meta = SPRITE_META[key];
    const height = options.height || meta.height;
    const width = height * (image.naturalWidth / image.naturalHeight);
    const anchorX = options.anchorX ?? meta.anchorX;
    const anchorY = options.anchorY ?? meta.anchorY;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(options.rotation || 0);
    ctx.globalAlpha = options.alpha ?? 1;
    ctx.shadowBlur = options.shadowBlur ?? 0;
    ctx.shadowColor = options.glow || meta.glow || "transparent";
    if (options.hitFlash > 0) {
      ctx.filter = "brightness(2.15) saturate(0.35)";
    }
    ctx.drawImage(image, -width * anchorX, -height * anchorY, width, height);
    ctx.restore();
    return true;
  }

  function drawWorld() {
    const viewW = canvas.width / resizeScale;
    const viewH = canvas.height / resizeScale;
    const gradient = ctx.createRadialGradient(viewW / 2, viewH / 2, 80, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.7);
    gradient.addColorStop(0, "#10233f");
    gradient.addColorStop(0.55, "#071322");
    gradient.addColorStop(1, "#03070e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewW, viewH);

    if (BACKGROUND_TILE.complete && BACKGROUND_TILE.naturalWidth > 0) {
      drawBackgroundTile(viewW, viewH);
    } else {
      drawFallbackGrid();
    }

    ctx.fillStyle = "rgba(3, 7, 14, 0.34)";
    ctx.fillRect(0, 0, viewW, viewH);

    const vignette = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.18, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.68);
    vignette.addColorStop(0, "rgba(8, 20, 38, 0)");
    vignette.addColorStop(1, "rgba(0, 2, 8, 0.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  function drawBackgroundTile(viewW, viewH) {
    const pattern = ctx.createPattern(BACKGROUND_TILE, "repeat");
    if (!pattern) return;

    const tileW = BACKGROUND_TILE.naturalWidth;
    const tileH = BACKGROUND_TILE.naturalHeight;
    const offsetX = -((camera.x % tileW) + tileW) % tileW;
    const offsetY = -((camera.y % tileH) + tileH) % tileH;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = pattern;
    ctx.translate(offsetX, offsetY);
    ctx.fillRect(-tileW, -tileH, viewW + tileW * 2, viewH + tileH * 2);
    ctx.restore();
  }

  function drawFallbackGrid() {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.strokeStyle = "rgba(95, 132, 164, 0.16)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD.width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD.height; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();
    }
    drawRuins();
    ctx.restore();
  }

  function drawRuins() {
    ctx.fillStyle = "rgba(73, 91, 119, 0.25)";
    for (let i = 0; i < 18; i++) {
      const x = 120 + (i * 337) % (WORLD.width - 240);
      const y = 100 + (i * 211) % (WORLD.height - 200);
      ctx.fillRect(x, y, 24 + (i % 4) * 12, 90 + (i % 3) * 28);
      ctx.fillRect(x - 20, y + 86, 84, 18);
    }
    ctx.strokeStyle = "rgba(132, 209, 255, 0.13)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, WORLD.width, WORLD.height);
  }

  function drawPlayer() {
    const p = worldToScreen(player.x, player.y);
    const pulse = 0.5 + Math.sin(player.time * 5) * 0.12;

    ctx.save();
    ctx.shadowBlur = 26;
    ctx.shadowColor = "#bfe5ff";
    ctx.fillStyle = `rgba(174, 222, 255, ${0.12 + pulse * 0.05})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, player.pickupRadius, 0, TWO_PI);
    ctx.fill();

    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(169, 216, 255, 0.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18 + pulse * 4, 0.18 * Math.PI, 1.38 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12 + pulse * 3, 1.16 * Math.PI, 1.88 * Math.PI);
    ctx.stroke();
    ctx.restore();

    drawEntityShadow(p.x, p.y, 18, 6, 0.36);
    const spriteKey = getPlayerSpriteKey();
    if (drawSprite(spriteKey, p.x, p.y, {
      height: SPRITE_META[spriteKey].height + Math.sin(player.time * 8) * 1.5,
      hitFlash: player.invulnFlash,
      shadowBlur: 14,
    })) {
      return;
    }

    drawPlayerFallback(p);
  }

  function getPlayerSpriteKey() {
    if (!player.moving) return "player";
    return Math.floor(player.time * 8) % 2 === 0 ? "playerWalkLeft" : "playerWalkRight";
  }

  function drawPlayerFallback(p) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#1a1232";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 20);
    ctx.quadraticCurveTo(p.x - 22, p.y + 3, p.x - 13, p.y + 24);
    ctx.quadraticCurveTo(p.x, p.y + 17, p.x + 13, p.y + 24);
    ctx.quadraticCurveTo(p.x + 22, p.y + 3, p.x, p.y - 20);
    ctx.fill();

    ctx.shadowBlur = 8;
    ctx.fillStyle = player.invulnFlash > 0 ? "#ffffff" : "#edf7ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 13, 9, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = "#9edcff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4, player.radius, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemies() {
    for (const e of enemies) {
      const p = worldToScreen(e.x, e.y);
      const spriteKey = getEnemySpriteKey(e);
      const meta = SPRITE_META[spriteKey] || SPRITE_META[e.type];
      if (meta) {
        const angle = Math.atan2(player.y - e.y, player.x - e.x) - Math.PI / 2;
        const bob = e.type === "boss" ? Math.sin(player.time * 2) * 2 : Math.sin(player.time * 7 + e.x * 0.03) * 1.4;
        const height = meta.height + bob;
        drawEntityShadow(p.x, p.y, e.radius * (e.type === "boss" ? 1.35 : 1.15), e.radius * 0.4, e.type === "boss" ? 0.55 : 0.4);
        if (e.type === "boss" && e.dashTime > 0) {
          drawBossDashWarning(p);
        }
        const options = {
          height,
          rotation: meta.rotateToPlayer ? angle : 0,
          hitFlash: e.hitFlash,
          shadowBlur: e.type === "boss" ? 18 : 8,
        };
        if (drawSprite(spriteKey, p.x, p.y, options) || (spriteKey !== e.type && drawSprite(e.type, p.x, p.y, options))) {
          continue;
        }
      }

      drawEnemyFallback(e, p);
    }
  }

  function getEnemySpriteKey(enemy) {
    const frames = {
      worm: { fps: 6, keys: ["wormMove1", "wormMove2"] },
      chaser: { fps: 10, keys: ["chaserRun1", "chaserRun2"] },
      sentinel: { fps: 5, keys: ["sentinelWalk1", "sentinelWalk2"] },
    }[enemy.type];

    if (!frames) return enemy.type;
    const frame = Math.floor((player.time + (enemy.animSeed || 0)) * frames.fps) % frames.keys.length;
    return frames.keys[frame];
  }

  function drawEnemyFallback(e, p) {
      const spec = ENEMY_TYPES[e.type];
      ctx.save();
      ctx.shadowBlur = e.type === "boss" ? 26 : 10;
      ctx.shadowColor = e.type === "sentinel" ? "#66cfff" : "#ff3154";
      ctx.fillStyle = e.hitFlash > 0 ? "#eaf7ff" : spec.color;
      ctx.beginPath();
      if (e.type === "sentinel") {
        ctx.rect(p.x - e.radius, p.y - e.radius, e.radius * 2, e.radius * 2);
      } else {
        ctx.arc(p.x, p.y, e.radius, 0, TWO_PI);
      }
      ctx.fill();

      ctx.fillStyle = spec.eye;
      const eyeY = p.y - e.radius * 0.15;
      ctx.beginPath();
      ctx.arc(p.x - e.radius * 0.32, eyeY, Math.max(2, e.radius * 0.13), 0, TWO_PI);
      ctx.arc(p.x + e.radius * 0.32, eyeY, Math.max(2, e.radius * 0.13), 0, TWO_PI);
      ctx.fill();

      if (e.type === "sentinel" || e.type === "boss") {
        ctx.strokeStyle = "rgba(116, 219, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - e.radius * 0.45, p.y + e.radius * 0.2);
        ctx.lineTo(p.x + e.radius * 0.35, p.y - e.radius * 0.42);
        ctx.stroke();
      }
      ctx.restore();
  }

  function drawBossDashWarning(p) {
    const angle = Math.atan2(player.y - p.y - camera.y, player.x - p.x - camera.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(169, 216, 255, 0.12)";
    ctx.strokeStyle = "rgba(215, 242, 255, 0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 120, -0.22, 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBlade() {
    const blade = player.weapons.blade;
    const blades = Math.min(4, 1 + Math.floor((blade.level - 1) / 2));
    const orbit = 54 + blade.level * 5;
    for (let i = 0; i < blades; i++) {
      const angle = blade.angle + i * TWO_PI / blades;
      const p = worldToScreen(player.x + Math.cos(angle) * orbit, player.y + Math.sin(angle) * orbit);
      if (drawSprite("moonlightBlade", p.x, p.y, {
        rotation: angle + Math.PI / 2,
        shadowBlur: 20,
      })) {
        continue;
      }

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#d9f3ff";
      ctx.translate(p.x, p.y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = "#e9f8ff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 24, 0, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBullets() {
    for (const b of bullets) {
      const p = worldToScreen(b.x, b.y);
      const angle = Math.atan2(b.vy, b.vx);
      if (drawSprite("silverBullet", p.x, p.y, {
        rotation: angle,
        shadowBlur: 16,
      })) {
        continue;
      }

      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#dff4ff";
      ctx.fillStyle = "#eefbff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, b.radius, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMines() {
    for (const m of mines) {
      const p = worldToScreen(m.x, m.y);
      const pulse = 0.65 + Math.sin(performance.now() / 120 + m.pulse) * 0.25;
      const mineKey = getMineSpriteKey(m);
      if (drawSprite(mineKey, p.x, p.y, {
        height: SPRITE_META[mineKey].height + pulse * 4,
        rotation: Math.sin(player.time * 4 + m.pulse) * 0.08,
        shadowBlur: 18,
      })) {
        continue;
      }

      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#9bdfff";
      ctx.strokeStyle = `rgba(187, 235, 255, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14 + (1 - m.timer) * 12, 0, TWO_PI);
      ctx.stroke();
      ctx.fillStyle = "#dff5ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function getMineSpriteKey(mine) {
    if (mine.timer <= 0.38) return "starlightMineArmed";
    return Math.sin(player.time * 12 + mine.pulse) > 0.35 ? "starlightMineArmed" : "starlightMineIdle";
  }

  function drawCombatEffects() {
    drawExplosionEffects();
    drawHitSparks();
  }

  function drawExplosionEffects() {
    for (const effect of explosionEffects) {
      const p = worldToScreen(effect.x, effect.y);
      const elapsed = effect.duration - effect.life;
      const frame = clamp(Math.floor(elapsed * EXPLOSION_FPS), 0, 2);
      const key = ["starlightExplosion1", "starlightExplosion2", "starlightExplosion3"][frame];
      const t = clamp(elapsed / effect.duration, 0, 1);
      if (drawSprite(key, p.x, p.y, {
        height: effect.radius * (1.45 + t * 0.55),
        alpha: 1 - t * 0.2,
        shadowBlur: 22,
      })) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = "rgba(219, 246, 255, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, effect.radius * t, 0, TWO_PI);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHitSparks() {
    for (const spark of hitSparks) {
      const p = worldToScreen(spark.x, spark.y);
      const t = clamp(1 - spark.life / spark.duration, 0, 1);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.shadowBlur = 10;
      ctx.shadowColor = spark.color;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, spark.size * (1 - t * 0.35), 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGems() {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#73d1ff";
    for (const g of gems) {
      const p = worldToScreen(g.x, g.y);
      ctx.fillStyle = g.value > 4 ? "#e7c66a" : "#65caff";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - g.radius);
      ctx.lineTo(p.x + g.radius, p.y);
      ctx.lineTo(p.x, p.y + g.radius);
      ctx.lineTo(p.x - g.radius, p.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloaters() {
    for (const f of floaters) {
      const p = worldToScreen(f.x, f.y);
      ctx.save();
      ctx.globalAlpha = clamp(f.life / 0.7, 0, 1);
      if (f.burst) {
        ctx.strokeStyle = "rgba(219, 246, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, f.burst * (1 - f.life / 0.7), 0, TWO_PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#dff5ff";
        ctx.font = "700 18px sans-serif";
        ctx.fillText(f.text, p.x, p.y);
      }
      ctx.restore();
    }
  }

  function drawPlayerHitRings() {
    for (const ring of hitRings) {
      const elapsed = ring.duration - ring.life;
      const t = clamp(elapsed / ring.duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const radius = ring.startRadius + (ring.endRadius - ring.startRadius) * eased;
      const alpha = 0.75 * (1 - t);
      const p = worldToScreen(ring.x, ring.y);

      ctx.save();
      ctx.lineWidth = 3;
      ctx.shadowBlur = 16;
      ctx.shadowColor = "rgba(255, 78, 104, 0.75)";
      ctx.strokeStyle = `rgba(255, 63, 88, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TWO_PI);
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(255, 199, 210, 0.75)";
      ctx.strokeStyle = `rgba(255, 205, 218, ${alpha * 0.78})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.68, 0, TWO_PI);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 223, 229, ${alpha})`;
      for (const spark of ring.sparks) {
        const distance = spark.distance + spark.speed * t * ring.duration;
        const sx = p.x + Math.cos(spark.angle) * distance;
        const sy = p.y + Math.sin(spark.angle) * distance;
        ctx.beginPath();
        ctx.arc(sx, sy, spark.size * (1 - t), 0, TWO_PI);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawPlayerDamageNumbers() {
    for (const number of damageNumbers) {
      const p = worldToScreen(number.x, number.y);
      const t = clamp(1 - number.life / number.duration, 0, 1);
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.font = "900 20px sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(48, 0, 12, 0.82)";
      ctx.fillStyle = "#ffd4dc";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(255, 70, 98, 0.9)";
      ctx.strokeText(number.text, p.x, p.y);
      ctx.fillText(number.text, p.x, p.y);
      ctx.restore();
    }
  }

  function drawDamageVignette() {
    if (playerFeedback.vignetteTimer <= 0) return;

    const viewW = canvas.width / resizeScale;
    const viewH = canvas.height / resizeScale;
    const t = clamp(playerFeedback.vignetteTimer / PLAYER_HIT_FEEDBACK.vignetteDuration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 2);
    const dangerAlpha = player.hp / player.maxHp <= 0.3 ? 0.05 : 0;
    const alpha = Math.min(0.3, playerFeedback.vignetteAlpha + dangerAlpha) * eased;
    const gradient = ctx.createRadialGradient(
      viewW / 2,
      viewH / 2,
      Math.min(viewW, viewH) * 0.12,
      viewW / 2,
      viewH / 2,
      Math.max(viewW, viewH) * 0.72
    );

    gradient.addColorStop(0, "rgba(255, 35, 68, 0)");
    gradient.addColorStop(0.58, `rgba(255, 35, 68, ${alpha * 0.16})`);
    gradient.addColorStop(1, `rgba(255, 35, 68, ${alpha})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();
  }

  function drawHud() {
    const viewW = canvas.width / resizeScale;
    const viewH = canvas.height / resizeScale;
    const mobileHud = isMobileInputAvailable() || viewW <= 820;
    ctx.save();
    ctx.font = mobileHud ? "700 15px sans-serif" : "700 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f3f9ff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#7ed4ff";
    ctx.fillText(formatTime(player.time), viewW / 2, mobileHud ? 25 : 32);
    ctx.shadowBlur = 0;

    const hpX = mobileHud ? 12 : 22;
    const hpY = mobileHud ? 14 : 22;
    const hpW = mobileHud ? Math.min(150, viewW * 0.38) : 230;
    const hpH = mobileHud ? 14 : 18;
    drawHpBar(hpX, hpY, hpW, hpH);
    ctx.textAlign = "left";
    ctx.font = mobileHud ? "700 10px sans-serif" : "700 13px sans-serif";
    ctx.fillStyle = "#dceeff";
    ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, hpX + 8, hpY + hpH - 4);

    ctx.textAlign = "right";
    ctx.font = mobileHud ? "700 12px sans-serif" : "700 16px sans-serif";
    ctx.fillText(`처치 ${player.kills}  레벨 ${player.level}`, viewW - (mobileHud ? 12 : 24), mobileHud ? 26 : 34);

    if (mobileHud) {
      const joyClearance = Math.min(178, viewW * 0.45);
      const expW = Math.max(80, viewW - joyClearance - 28);
      drawBar(14, viewH - 20, expW, 10, player.exp / player.requiredExp, "#79c8ff", "#102239");
    } else {
      drawBar(18, viewH - 24, viewW - 36, 12, player.exp / player.requiredExp, "#79c8ff", "#102239");
    }
    drawIcons(viewW, viewH, mobileHud);
    drawBossBar(viewW, mobileHud);
    ctx.restore();
  }

  function drawBar(x, y, w, h, ratio, fill, bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
    ctx.strokeStyle = "rgba(220, 238, 255, 0.45)";
    ctx.strokeRect(x, y, w, h);
  }

  function drawHpBar(x, y, w, h) {
    const currentRatio = clamp(player.hp / player.maxHp, 0, 1);
    const danger = currentRatio <= 0.3;
    const shakeT = clamp(playerFeedback.hpShakeTimer / PLAYER_HIT_FEEDBACK.hpShakeDuration, 0, 1);
    const shakeX = Math.sin(player.time * 130) * 2 * shakeT;
    const shakeY = Math.cos(player.time * 117) * 1.2 * shakeT;
    const trailT = clamp(playerFeedback.hpTrailTimer / PLAYER_HIT_FEEDBACK.hpTrailDuration, 0, 1);
    const trailRatio = currentRatio + (playerFeedback.hpTrailStartRatio - currentRatio) * trailT;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    if (danger) {
      ctx.shadowBlur = 16;
      ctx.shadowColor = "rgba(255, 55, 84, 0.78)";
    }

    ctx.fillStyle = "#2b1420";
    ctx.fillRect(x, y, w, h);
    if (trailRatio > currentRatio) {
      ctx.fillStyle = "rgba(255, 174, 58, 0.88)";
      ctx.fillRect(x, y, w * clamp(trailRatio, 0, 1), h);
    }
    ctx.fillStyle = danger ? "#ff2f55" : "#ff4f6a";
    ctx.fillRect(x, y, w * currentRatio, h);
    ctx.strokeStyle = danger ? "rgba(255, 195, 205, 0.86)" : "rgba(220, 238, 255, 0.45)";
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function drawIcons(viewW, viewH, mobileHud = false) {
    const items = [
      ["☾", player.weapons.blade.level],
      ["•", player.weapons.bullet.level],
      ["✦", player.weapons.mine.level],
      ["SPD", player.passives.speed],
      ["HP", player.passives.health],
      ["MAG", player.passives.magnet],
    ].filter((item) => item[1] > 0);
    const size = mobileHud ? 28 : 34;
    const gap = mobileHud ? 6 : 8;
    const totalW = items.length * size + Math.max(0, items.length - 1) * gap;
    const joyClearance = Math.min(178, viewW * 0.45);
    const mobileSafeW = viewW - joyClearance - 28;
    const startX = mobileHud ? 14 : Math.max(22, viewW / 2 - totalW / 2);
    const mobileY = totalW <= mobileSafeW ? viewH - 56 : Math.max(48, viewH - 208);
    for (let i = 0; i < items.length; i++) {
      const x = startX + i * (size + gap);
      const y = mobileHud ? mobileY : viewH - 70;
      ctx.fillStyle = "rgba(9, 20, 38, 0.84)";
      ctx.strokeStyle = "rgba(161, 218, 255, 0.35)";
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = "#e9f8ff";
      ctx.textAlign = "center";
      ctx.font = items[i][0].length > 2 ? "700 9px sans-serif" : `${mobileHud ? "700 15px" : "700 18px"} sans-serif`;
      ctx.fillText(items[i][0], x + size / 2, y + (mobileHud ? 18 : 22));
      ctx.font = "700 9px sans-serif";
      ctx.fillStyle = "#e7c66a";
      ctx.fillText(items[i][1], x + size - 7, y + size - 4);
    }
  }

  function drawBossBar(viewW, mobileHud = false) {
    const boss = enemies.find((e) => e.type === "boss");
    if (!boss) return;
    const w = Math.min(mobileHud ? 340 : 560, viewW - (mobileHud ? 28 : 48));
    const x = (viewW - w) / 2;
    drawBar(x, mobileHud ? 48 : 54, w, mobileHud ? 11 : 14, boss.hp / boss.maxHp, "#c92745", "#25101a");
    ctx.textAlign = "center";
    ctx.font = mobileHud ? "800 11px sans-serif" : "800 13px sans-serif";
    ctx.fillStyle = "#f3f9ff";
    ctx.fillText("월식의 기사", viewW / 2, mobileHud ? 44 : 50);
  }

  function loop(time) {
    const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  if (coarsePointerQuery.addEventListener) {
    coarsePointerQuery.addEventListener("change", updateMobileControls);
  } else {
    coarsePointerQuery.addListener(updateMobileControls);
  }
  window.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (event.code === "Enter" && (state === "title" || state === "gameover" || state === "victory")) {
      resetGame();
    }
    if (state === "levelup" && ["Digit1", "Digit2", "Digit3", "Numpad1", "Numpad2", "Numpad3"].includes(event.code)) {
      const digit = Number(event.code.replace("Digit", "").replace("Numpad", ""));
      selectUpgrade(digit - 1);
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  canvas.addEventListener("mousemove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
  mobileJoystick.addEventListener("pointerdown", (event) => {
    if (!touchJoystick.enabled || state !== "playing" || touchJoystick.activePointerId !== null) return;
    event.preventDefault();
    touchJoystick.active = true;
    touchJoystick.activePointerId = event.pointerId;
    mobileJoystick.setPointerCapture(event.pointerId);
    mobileJoystick.classList.add("active");
    triggerJoystickRipple();
    updateJoystickFromPointer(event);
  });
  mobileJoystick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== touchJoystick.activePointerId) return;
    event.preventDefault();
    updateJoystickFromPointer(event);
  });
  mobileJoystick.addEventListener("pointerup", (event) => {
    if (event.pointerId !== touchJoystick.activePointerId) return;
    event.preventDefault();
    resetJoystick();
  });
  mobileJoystick.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== touchJoystick.activePointerId) return;
    event.preventDefault();
    resetJoystick();
  });
  document.addEventListener("pointerup", resetActiveJoystick);
  document.addEventListener("pointercancel", resetActiveJoystick);
  window.addEventListener("blur", resetActiveJoystick);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") resetActiveJoystick();
  });
  document.addEventListener("touchmove", (event) => {
    if (state === "playing") event.preventDefault();
  }, { passive: false });

  document.getElementById("startButton").addEventListener("click", resetGame);
  document.getElementById("restartButton").addEventListener("click", resetGame);
  document.getElementById("victoryRestartButton").addEventListener("click", resetGame);

  resize();
  setState("title");
  requestAnimationFrame(loop);
})();
