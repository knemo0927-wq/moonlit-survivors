(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const pauseButton = document.getElementById("pauseButton");
  const mobileControls = document.getElementById("mobileControls");
  const mobileJoystick = document.getElementById("mobileJoystick");
  const mobileJoystickKnob = document.getElementById("mobileJoystickKnob");
  const screens = {
    title: document.getElementById("titleScreen"),
    levelup: document.getElementById("levelScreen"),
    paused: document.getElementById("pauseScreen"),
    gameover: document.getElementById("gameoverScreen"),
    stageclear: document.getElementById("stageClearScreen"),
    victory: document.getElementById("victoryScreen"),
  };
  const upgradeCards = document.getElementById("upgradeCards");
  const gameoverStats = document.getElementById("gameoverStats");
  const stageClearTitle = document.getElementById("stageClearTitle");
  const stageClearSummary = document.getElementById("stageClearSummary");
  const stageClearStats = document.getElementById("stageClearStats");
  const victoryTitle = document.getElementById("victoryTitle");
  const victoryStats = document.getElementById("victoryStats");
  const resumeButton = document.getElementById("resumeButton");
  const pauseRestartButton = document.getElementById("pauseRestartButton");
  const stage2Button = document.getElementById("stage2Button");
  const stageTitleButton = document.getElementById("stageTitleButton");

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
  const STAGES = {
    1: {
      name: "폐허",
      bossType: "boss",
      bossTime: 240,
      gradient: ["#10233f", "#071322", "#03070e"],
      overlay: "rgba(3, 7, 14, 0.34)",
      vignette: ["rgba(8, 20, 38, 0)", "rgba(0, 2, 8, 0.42)"],
    },
    2: {
      name: "월광 침식림",
      bossType: "whiteStagKing",
      bossTime: 180,
      gradient: ["#17233a", "#101a26", "#030908"],
      overlay: "rgba(13, 6, 24, 0.25)",
      vignette: ["rgba(24, 42, 31, 0)", "rgba(1, 7, 5, 0.48)"],
    },
    3: {
      name: "검은 달의 성소",
      bossType: "blackMoonHeart",
      bossTime: 210,
      gradient: ["#171024", "#090911", "#020204"],
      overlay: "rgba(2, 2, 8, 0.28)",
      vignette: ["rgba(24, 16, 36, 0)", "rgba(0, 0, 3, 0.58)"],
    },
  };

  const STAGE_CLEAR_COPY = {
    1: {
      title: "스테이지 클리어",
      body: "월식의 기사가 쓰러졌습니다.<br>폐허 너머, 달빛에 침식된 숲이 열립니다.",
      button: "스테이지2 진입",
    },
    2: {
      title: "백야의 사슴왕이 쓰러졌습니다",
      body: "숲을 덮던 백야가 갈라지고, 검은 달의 성소가 모습을 드러냅니다.",
      button: "스테이지3 진입",
    },
  };

  const PLAYER_BASE_STATS = {
    maxHp: 100,
    speed: 180,
    pickupRadius: 45,
    requiredExp: 9,
  };

  const STAGE_START_HP_FLOORS = {
    2: 75,
    3: 80,
  };

  const WEAPON_MAX_LEVELS = {
    blade: 4,
    bullet: 4,
    shardStage2: 3,
    shardStage3: 4,
    mine: 4,
    halo: 3,
  };

  const SPAWN_SCALES = {
    stage2IntroWolf: { hpScale: 0.82, damageScale: 0.72, speedScale: 0.86, expScale: 0.9 },
    stage2IntroFromStage1: { hpScale: 1, damageScale: 0.95, speedScale: 0.95, expScale: 1 },
    stage2EarlyWolf: { hpScale: 0.95, damageScale: 0.85, speedScale: 0.92, expScale: 1 },
    stage2EarlyFromStage1: { hpScale: 1.12, damageScale: 1, speedScale: 1, expScale: 1.05 },
    stage2FromStage1: { hpScale: 1.25, damageScale: 1.15, expScale: 1.15 },
    stage3IntroLancer: { hpScale: 0.72, damageScale: 0.6, speedScale: 0.78, expScale: 0.85 },
    stage3IntroFromStage1: { hpScale: 1.15, damageScale: 1, speedScale: 0.95, expScale: 1 },
    stage3IntroFromStage2: { hpScale: 0.9, damageScale: 0.75, speedScale: 0.82, expScale: 0.95 },
    stage3EarlyLancer: { hpScale: 0.88, damageScale: 0.75, speedScale: 0.86, expScale: 1 },
    stage3EarlyPriest: { hpScale: 0.9, damageScale: 0.75, speedScale: 0.9, expScale: 1 },
    stage3EarlyFromStage1: { hpScale: 1.35, damageScale: 1.1, speedScale: 1, expScale: 1.1 },
    stage3EarlyFromStage2: { hpScale: 1.05, damageScale: 0.9, speedScale: 0.94, expScale: 1.05 },
    stage3FromStage1: { hpScale: 1.6, damageScale: 1.35, expScale: 1.2 },
    stage3FromStage2: { hpScale: 1.25, damageScale: 1.15, expScale: 1.12 },
  };

  let state = "title";
  let currentStage = 1;
  let lastTime = 0;
  let spawnTimer = 0;
  let bossSpawned = false;
  let activeChoices = [];
  let resizeScale = 1;
  let pauseButtonPointerId = null;

  const camera = { x: 0, y: 0 };
  const enemies = [];
  const gems = [];
  const bullets = [];
  const enemyProjectiles = [];
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
    moonWolf: {
      src: "assets/sprites/enemy_moon_wolf.png",
      height: 70,
      anchorX: 0.5,
      anchorY: 0.62,
      glow: "#cbd9ff",
      rotateToPlayer: true,
    },
    moonWolfRun1: {
      src: "assets/sprites/enemy_moon_wolf_run_1.png",
      height: 70,
      anchorX: 0.5,
      anchorY: 0.62,
      glow: "#cbd9ff",
      rotateToPlayer: true,
    },
    moonWolfRun2: {
      src: "assets/sprites/enemy_moon_wolf_run_2.png",
      height: 70,
      anchorX: 0.5,
      anchorY: 0.62,
      glow: "#cbd9ff",
      rotateToPlayer: true,
    },
    moonWolfRun3: {
      src: "assets/sprites/enemy_moon_wolf_run_3.png",
      height: 70,
      anchorX: 0.5,
      anchorY: 0.62,
      glow: "#cbd9ff",
      rotateToPlayer: true,
    },
    riftMoth: {
      src: "assets/sprites/enemy_rift_moth.png",
      height: 74,
      anchorX: 0.5,
      anchorY: 0.58,
      glow: "#c18cff",
    },
    riftMothFlap1: {
      src: "assets/sprites/enemy_rift_moth_flap_1.png",
      height: 74,
      anchorX: 0.5,
      anchorY: 0.58,
      glow: "#c18cff",
    },
    riftMothFlap2: {
      src: "assets/sprites/enemy_rift_moth_flap_2.png",
      height: 74,
      anchorX: 0.5,
      anchorY: 0.58,
      glow: "#c18cff",
    },
    riftMothCast: {
      src: "assets/sprites/enemy_rift_moth_cast.png",
      height: 74,
      anchorX: 0.5,
      anchorY: 0.58,
      glow: "#d6b9ff",
    },
    blackMoonLancer: {
      src: "assets/sprites/enemy_black_moon_lancer.png",
      height: 76,
      anchorX: 0.5,
      anchorY: 0.66,
      glow: "#986dff",
      rotateToPlayer: true,
    },
    blackMoonLancerRun1: {
      src: "assets/sprites/enemy_black_moon_lancer_run_1.png",
      height: 76,
      anchorX: 0.5,
      anchorY: 0.66,
      glow: "#986dff",
      rotateToPlayer: true,
    },
    blackMoonLancerRun2: {
      src: "assets/sprites/enemy_black_moon_lancer_run_2.png",
      height: 76,
      anchorX: 0.5,
      anchorY: 0.66,
      glow: "#986dff",
      rotateToPlayer: true,
    },
    blackMoonLancerRun3: {
      src: "assets/sprites/enemy_black_moon_lancer_run_3.png",
      height: 76,
      anchorX: 0.5,
      anchorY: 0.66,
      glow: "#986dff",
      rotateToPlayer: true,
    },
    eclipsePriest: {
      src: "assets/sprites/enemy_eclipse_priest.png",
      height: 82,
      anchorX: 0.5,
      anchorY: 0.68,
      glow: "#b78cff",
    },
    eclipsePriestFloat1: {
      src: "assets/sprites/enemy_eclipse_priest_float_1.png",
      height: 82,
      anchorX: 0.5,
      anchorY: 0.68,
      glow: "#b78cff",
    },
    eclipsePriestFloat2: {
      src: "assets/sprites/enemy_eclipse_priest_float_2.png",
      height: 82,
      anchorX: 0.5,
      anchorY: 0.68,
      glow: "#b78cff",
    },
    eclipsePriestCast: {
      src: "assets/sprites/enemy_eclipse_priest_cast.png",
      height: 82,
      anchorX: 0.5,
      anchorY: 0.68,
      glow: "#d6b9ff",
    },
    obsidianWarden: {
      src: "assets/sprites/enemy_obsidian_warden.png",
      height: 134,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#6d4eff",
    },
    obsidianWardenWalk1: {
      src: "assets/sprites/enemy_obsidian_warden_walk_1.png",
      height: 134,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#6d4eff",
    },
    obsidianWardenWalk2: {
      src: "assets/sprites/enemy_obsidian_warden_walk_2.png",
      height: 134,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#6d4eff",
    },
    corruptedTreant: {
      src: "assets/sprites/enemy_corrupted_treant.png",
      height: 118,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#8dbf8f",
    },
    corruptedTreantWalk1: {
      src: "assets/sprites/enemy_corrupted_treant_walk_1.png",
      height: 118,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#8dbf8f",
    },
    corruptedTreantWalk2: {
      src: "assets/sprites/enemy_corrupted_treant_walk_2.png",
      height: 118,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#8dbf8f",
    },
    boss: {
      src: "assets/sprites/boss_eclipse_knight.png",
      height: 196,
      anchorX: 0.5,
      anchorY: 0.74,
      glow: "#a9d8ff",
    },
    whiteStagKing: {
      src: "assets/sprites/boss_white_stag_king.png",
      height: 226,
      anchorX: 0.5,
      anchorY: 0.76,
      glow: "#f2f4ff",
    },
    blackMoonHeart: {
      src: "assets/sprites/boss_black_moon_heart.png",
      height: 248,
      anchorX: 0.5,
      anchorY: 0.72,
      glow: "#9d6dff",
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
    moonShard: {
      src: "assets/weapons/weapon_moon_shard.png",
      height: 24,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#f0f6ff",
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
    riftBolt: {
      src: "assets/effects/effect_rift_bolt.png",
      height: 32,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#b66dff",
    },
    blackMoonBolt: {
      src: "assets/effects/effect_black_moon_bolt.png",
      height: 38,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#ad78ff",
    },
    eclipseHalo: {
      src: "assets/weapons/weapon_eclipse_halo.png",
      height: 94,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#d4c2ff",
    },
    eclipseWave: {
      src: "assets/effects/effect_eclipse_wave.png",
      height: 220,
      anchorX: 0.5,
      anchorY: 0.5,
      glow: "#d4c2ff",
    },
  };

  const SPRITES = Object.fromEntries(
    Object.entries(SPRITE_META).map(([key, meta]) => [key, loadSprite(meta.src)])
  );
  const BACKGROUND_TILES = {
    1: loadSprite("assets/backgrounds/bg_moonlit_ruins_tile.png"),
    2: loadSprite("assets/backgrounds/bg_moonlit_forest_tile.png"),
    3: loadSprite("assets/backgrounds/bg_black_moon_sanctum_tile.png"),
  };

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
    weapons: createStartingWeapons(),
    passives: createStartingPassives(),
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
    moonWolf: {
      name: "달그늘 늑대",
      hp: 26,
      speed: 150,
      damage: 11,
      radius: 13,
      exp: 3,
      color: "#101323",
      eye: "#d8e2ff",
    },
    riftMoth: {
      name: "균열 나방",
      hp: 34,
      speed: 95,
      damage: 8,
      radius: 15,
      exp: 4,
      color: "#160d22",
      eye: "#c985ff",
    },
    blackMoonLancer: {
      name: "검은 달 첨병",
      hp: 42,
      speed: 170,
      damage: 13,
      radius: 15,
      exp: 4,
      color: "#0c0815",
      eye: "#a981ff",
    },
    eclipsePriest: {
      name: "식월 사제",
      hp: 58,
      speed: 82,
      damage: 10,
      radius: 16,
      exp: 6,
      color: "#12091f",
      eye: "#d6b9ff",
    },
    obsidianWarden: {
      name: "흑요석 파수꾼",
      hp: 150,
      speed: 55,
      damage: 24,
      radius: 27,
      exp: 11,
      color: "#0a0810",
      eye: "#7c62ff",
    },
    corruptedTreant: {
      name: "침식된 나무정령",
      hp: 95,
      speed: 48,
      damage: 20,
      radius: 22,
      exp: 8,
      color: "#142014",
      eye: "#9bd48f",
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
    whiteStagKing: {
      name: "백야의 사슴왕",
      hp: 2050,
      speed: 75,
      damage: 28,
      radius: 41,
      exp: 60,
      color: "#171827",
      eye: "#f3f6ff",
    },
    blackMoonHeart: {
      name: "검은 달의 심장",
      hp: 3400,
      speed: 62,
      damage: 32,
      radius: 50,
      exp: 100,
      color: "#07050e",
      eye: "#b88cff",
    },
  };

  const UPGRADES = [
    {
      id: "blade",
      title: "달빛 칼날 강화",
      desc: "회전하는 달빛 칼날이 더 빠르고 강하게 적을 베어냅니다.",
      available: () => player.weapons.blade.level < WEAPON_MAX_LEVELS.blade,
      apply: () => player.weapons.blade.level += 1,
    },
    {
      id: "bullet",
      title: "은빛 탄환",
      desc: "가장 가까운 적을 향해 자동으로 발사되는 탄환을 획득하거나 강화합니다.",
      available: () => player.weapons.bullet.level < WEAPON_MAX_LEVELS.bullet,
      apply: () => player.weapons.bullet.level += 1,
    },
    {
      id: "shard",
      title: "월광 파편",
      desc: "가장 가까운 적을 추적하는 달빛 파편을 주기적으로 발사합니다.",
      available: () => player.weapons.shard.level < maxMoonShardLevel(),
      apply: () => player.weapons.shard.level += 1,
    },
    {
      id: "mine",
      title: "별빛 지뢰",
      desc: "루나 주변에 별빛 지뢰를 설치하고 1초 뒤 폭발시킵니다.",
      available: () => player.weapons.mine.level < WEAPON_MAX_LEVELS.mine,
      apply: () => player.weapons.mine.level += 1,
    },
    {
      id: "halo",
      title: "월식 광륜",
      desc: "루나를 중심으로 검은 달의 파동을 일으켜 주변 적을 휩쓸어냅니다.",
      available: () => currentStage >= 3 && player.weapons.halo.level < WEAPON_MAX_LEVELS.halo,
      apply: () => player.weapons.halo.level += 1,
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

  function createStartingWeapons() {
    return {
      blade: { level: 1, angle: 0, cooldowns: new Map() },
      bullet: { level: 0, timer: 0 },
      shard: { level: 0, timer: 0 },
      mine: { level: 0, timer: 0 },
      halo: { level: 0, timer: 0, angle: 0 },
    };
  }

  function createStartingPassives() {
    return { speed: 0, health: 0, magnet: 0 };
  }

  function resetGame() {
    currentStage = 1;
    enemies.length = 0;
    gems.length = 0;
    bullets.length = 0;
    enemyProjectiles.length = 0;
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
      hp: PLAYER_BASE_STATS.maxHp,
      maxHp: PLAYER_BASE_STATS.maxHp,
      speed: PLAYER_BASE_STATS.speed,
      pickupRadius: PLAYER_BASE_STATS.pickupRadius,
      level: 1,
      exp: 0,
      requiredExp: PLAYER_BASE_STATS.requiredExp,
      kills: 0,
      time: 0,
      invulnFlash: 0,
      moving: false,
      weapons: createStartingWeapons(),
      passives: createStartingPassives(),
    });
    spawnTimer = 0;
    bossSpawned = false;
    activeChoices = [];
    setState("playing");
  }

  function clearStageObjects() {
    enemies.length = 0;
    gems.length = 0;
    bullets.length = 0;
    enemyProjectiles.length = 0;
    mines.length = 0;
    floaters.length = 0;
    hitSparks.length = 0;
    explosionEffects.length = 0;
    hitRings.length = 0;
    damageNumbers.length = 0;
    player.weapons.blade.cooldowns.clear();
    resetPlayerFeedback();
  }

  function startNextStage() {
    if (state !== "stageclear") return;
    const nextStage = currentStage + 1;
    if (!STAGES[nextStage]) return;
    startStage(nextStage);
  }

  function startStage(nextStage) {
    const previousHpRatio = player.maxHp > 0 ? clamp(player.hp / player.maxHp, 0, 1) : 1;
    const minHp = STAGE_START_HP_FLOORS[nextStage] || 60;
    currentStage = nextStage;
    clearStageObjects();
    Object.assign(player, {
      x: WORLD.width / 2,
      y: WORLD.height / 2,
      hp: clamp(previousHpRatio * PLAYER_BASE_STATS.maxHp + 25, minHp, PLAYER_BASE_STATS.maxHp),
      maxHp: PLAYER_BASE_STATS.maxHp,
      speed: PLAYER_BASE_STATS.speed,
      pickupRadius: PLAYER_BASE_STATS.pickupRadius,
      level: 1,
      exp: 0,
      requiredExp: PLAYER_BASE_STATS.requiredExp,
      kills: 0,
      time: 0,
      invulnFlash: 0,
      moving: false,
      weapons: createStartingWeapons(),
      passives: createStartingPassives(),
    });
    spawnTimer = 0;
    bossSpawned = false;
    activeChoices = [];
    keys.clear();
    resetJoystick();
    lastTime = performance.now();
    setState("playing");
  }

  function returnToTitle() {
    keys.clear();
    resetJoystick();
    setState("title");
  }

  function requiredExp(level) {
    return 5 + level * 4;
  }

  function setState(next) {
    state = next;
    for (const [name, screen] of Object.entries(screens)) {
      screen.classList.toggle("active", name === next);
    }
    overlay.classList.toggle("paused", next === "paused");
    overlay.style.display = next === "playing" ? "none" : "grid";
    updateMobileControls();
    updatePauseButton();
    if (next === "gameover") {
      gameoverStats.textContent = `${formatTime(player.time)} 생존 · 처치 ${player.kills} · 레벨 ${player.level}`;
    }
    if (next === "stageclear") {
      const copy = STAGE_CLEAR_COPY[currentStage] || STAGE_CLEAR_COPY[1];
      const hasNextStage = Boolean(STAGES[currentStage + 1]);
      stageClearTitle.textContent = copy.title;
      stageClearSummary.innerHTML = copy.body;
      stageClearStats.innerHTML = renderStats([
        ["클리어 시간", formatTime(player.time)],
        ["현재 레벨", player.level],
        ["처치 수", player.kills],
        ["남은 체력", `${Math.ceil(player.hp)} / ${player.maxHp}`],
      ]);
      stage2Button.textContent = copy.button;
      stage2Button.disabled = !hasNextStage;
      stage2Button.focus({ preventScroll: true });
    }
    if (next === "victory") {
      victoryTitle.textContent = "검은 달의 심장이 잠잠해졌습니다";
      victoryStats.textContent = `${stageConfig().name} ${formatTime(player.time)} 클리어 · 처치 ${player.kills} · 레벨 ${player.level} · 남은 체력 ${Math.ceil(player.hp)} / ${player.maxHp}`;
    }
    if (next === "paused") {
      resumeButton.focus({ preventScroll: true });
    }
  }

  function renderStats(entries) {
    return entries.map(([label, value]) => `<span>${label} ${value}</span>`).join("");
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

  function stageConfig() {
    return STAGES[currentStage] || STAGES[1];
  }

  function isBossType(type) {
    return type === "boss" || type === "whiteStagKing" || type === "blackMoonHeart";
  }

  function maxMoonShardLevel() {
    if (currentStage >= 3) return WEAPON_MAX_LEVELS.shardStage3;
    if (currentStage >= 2) return WEAPON_MAX_LEVELS.shardStage2;
    return 0;
  }

  function angleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
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

  function updatePauseButton() {
    const playing = state === "playing";
    pauseButton.classList.toggle("playing", playing);
    pauseButton.disabled = !playing;
    pauseButton.setAttribute("aria-hidden", playing ? "false" : "true");
    if (!playing) resetPauseButtonPointer();
  }

  function pauseGame() {
    if (state !== "playing") return;
    resetJoystick();
    setState("paused");
  }

  function resumeGame() {
    if (state !== "paused") return;
    lastTime = performance.now();
    setState("playing");
  }

  function togglePause() {
    if (state === "playing") {
      pauseGame();
    } else if (state === "paused") {
      resumeGame();
    }
  }

  function resetPauseButtonPointer() {
    const pointerId = pauseButtonPointerId;
    if (pointerId !== null && pauseButton.hasPointerCapture && pauseButton.hasPointerCapture(pointerId)) {
      pauseButton.releasePointerCapture(pointerId);
    }
    pauseButtonPointerId = null;
    pauseButton.classList.remove("pressing");
  }

  function isPointerInsidePauseButton(event) {
    const rect = pauseButton.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
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
    if (state !== "playing") return;
    updateEnemies(dt);
    if (state !== "playing") return;
    updateEnemyProjectiles(dt);
    if (state !== "playing") return;
    updateWeapons(dt);
    if (state !== "playing") return;
    updateGems(dt);
    if (state !== "playing") return;
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
    const stage = stageConfig();
    if (player.time >= stage.bossTime && !bossSpawned) {
      trimEnemyCountForBoss();
      spawnEnemy(stage.bossType);
      bossSpawned = true;
    }
    if (enemies.length >= MAX_ENEMIES) return;
    spawnTimer -= dt;
    if (spawnTimer > 0) return;
    const table = spawnTable(currentStage, player.time);
    spawnWeightedEnemy(weightedPick(table.types));
    spawnTimer = table.interval;
  }

  function spawnTable(stage, time) {
    if (stage === 3) {
      if (time < 35) {
        return {
          interval: 1.15,
          types: [
            ["blackMoonLancer", 0.35, SPAWN_SCALES.stage3IntroLancer],
            ["moonWolf", 0.25, SPAWN_SCALES.stage3IntroFromStage2],
            ["worm", 0.25, SPAWN_SCALES.stage3IntroFromStage1],
            ["chaser", 0.15, SPAWN_SCALES.stage3IntroFromStage1],
          ],
        };
      }
      if (time < 90) {
        return {
          interval: 0.88,
          types: [
            ["blackMoonLancer", 0.35, SPAWN_SCALES.stage3EarlyLancer],
            ["moonWolf", 0.2, SPAWN_SCALES.stage3EarlyFromStage2],
            ["riftMoth", 0.15, SPAWN_SCALES.stage3EarlyFromStage2],
            ["chaser", 0.2, SPAWN_SCALES.stage3EarlyFromStage1],
            ["eclipsePriest", 0.1, SPAWN_SCALES.stage3EarlyPriest],
          ],
        };
      }
      if (time < 150) {
        return {
          interval: 0.62,
          types: [
            ["blackMoonLancer", 0.35],
            ["eclipsePriest", 0.2],
            ["moonWolf", 0.15, SPAWN_SCALES.stage3FromStage2],
            ["riftMoth", 0.15, SPAWN_SCALES.stage3FromStage2],
            ["sentinel", 0.1, SPAWN_SCALES.stage3FromStage1],
            ["worm", 0.05, SPAWN_SCALES.stage3FromStage1],
          ],
        };
      }
      return {
        interval: 0.42,
        types: [
          ["blackMoonLancer", 0.3],
          ["eclipsePriest", 0.25],
          ["obsidianWarden", 0.15],
          ["corruptedTreant", 0.1, SPAWN_SCALES.stage3FromStage2],
          ["riftMoth", 0.1, SPAWN_SCALES.stage3FromStage2],
          ["chaser", 0.05, SPAWN_SCALES.stage3FromStage1],
          ["sentinel", 0.05, SPAWN_SCALES.stage3FromStage1],
        ],
      };
    }
    if (stage === 2) {
      if (time < 30) {
        return {
          interval: 1.1,
          types: [
            ["moonWolf", 0.45, SPAWN_SCALES.stage2IntroWolf],
            ["worm", 0.45, SPAWN_SCALES.stage2IntroFromStage1],
            ["chaser", 0.1, SPAWN_SCALES.stage2IntroFromStage1],
          ],
        };
      }
      if (time < 75) {
        return {
          interval: 0.88,
          types: [
            ["moonWolf", 0.5, SPAWN_SCALES.stage2EarlyWolf],
            ["worm", 0.25, SPAWN_SCALES.stage2EarlyFromStage1],
            ["chaser", 0.15, SPAWN_SCALES.stage2EarlyFromStage1],
            ["riftMoth", 0.1],
          ],
        };
      }
      if (time < 130) {
        return {
          interval: 0.68,
          types: [
            ["moonWolf", 0.45],
            ["riftMoth", 0.2],
            ["chaser", 0.2, SPAWN_SCALES.stage2FromStage1],
            ["worm", 0.1, SPAWN_SCALES.stage2FromStage1],
            ["sentinel", 0.05, SPAWN_SCALES.stage2FromStage1],
          ],
        };
      }
      return {
        interval: 0.5,
        types: [
          ["moonWolf", 0.35],
          ["riftMoth", 0.25],
          ["corruptedTreant", 0.15],
          ["chaser", 0.15, SPAWN_SCALES.stage2FromStage1],
          ["sentinel", 0.1, SPAWN_SCALES.stage2FromStage1],
        ],
      };
    }
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
    for (const entry of entries) {
      const weight = entry[1];
      roll -= weight;
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
  }

  function spawnWeightedEnemy(entry) {
    const [type, , options] = entry;
    spawnEnemy(type, options);
  }

  function spawnEnemy(type, options = {}) {
    const spec = ENEMY_TYPES[type];
    const hpScale = options.hpScale ?? options.hp ?? 1;
    const damageScale = options.damageScale ?? options.damage ?? 1;
    const speedScale = options.speedScale ?? options.speed ?? 1;
    const expScale = options.expScale ?? options.exp ?? 1;
    const hp = Math.ceil(spec.hp * hpScale);
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
      hp,
      maxHp: hp,
      speed: spec.speed * speedScale,
      damage: spec.damage * damageScale,
      radius: spec.radius,
      exp: spec.exp * expScale,
      hitFlash: 0,
      animSeed: Math.random() * 100,
      nextSparkTime: 0,
      dashTimer: type === "boss" ? 4 : 0,
      dashTime: 0,
      dashVx: 0,
      dashVy: 0,
      shootTimer: type === "riftMoth" || type === "eclipsePriest" ? 1.1 + Math.random() * 1.2 : 0,
      boltTimer: type === "blackMoonHeart" ? 2.2 : 0,
      radialTimer: type === "blackMoonHeart" ? 6 : 0,
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

      if (e.type === "blackMoonHeart") {
        const enraged = e.hp <= e.maxHp * 0.5;
        if (enraged) speed *= 1.15;

        e.boltTimer -= dt;
        if (e.boltTimer <= 0 && len < 1100) {
          fireBlackMoonBolt(e, vx, vy, { speed: 245, damage: e.damage, radius: 10, life: 4.8 });
          e.boltTimer = 2.2;
        }

        e.radialTimer -= dt;
        if (e.radialTimer <= 0) {
          fireRadialBlackMoonBolts(e, enraged ? 12 : 8);
          e.radialTimer = 6;
        }
      }

      if (e.type === "riftMoth") {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && len < 680) {
          fireRiftBolt(e, dx / len, dy / len);
          e.shootTimer = 2.2 + Math.random() * 0.7;
        }
      }

      if (e.type === "eclipsePriest") {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && len < 760) {
          fireBlackMoonBolt(e, dx / len, dy / len, { speed: 195, damage: e.damage, radius: 8, life: 4.2 });
          e.shootTimer = 2.35 + Math.random() * 0.75;
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

  function fireRiftBolt(enemy, dirX, dirY) {
    fireEnemyProjectile(enemy, dirX, dirY, {
      speed: 170,
      radius: 8,
      damage: enemy.damage,
      life: 4,
      spriteKey: "riftBolt",
    });
  }

  function fireBlackMoonBolt(enemy, dirX, dirY, options = {}) {
    fireEnemyProjectile(enemy, dirX, dirY, {
      speed: options.speed || 210,
      radius: options.radius || 9,
      damage: options.damage ?? enemy.damage,
      life: options.life || 4.4,
      spriteKey: "blackMoonBolt",
    });
  }

  function fireRadialBlackMoonBolts(enemy, count) {
    for (let i = 0; i < count; i++) {
      const angle = i * TWO_PI / count + player.time * 0.18;
      fireBlackMoonBolt(enemy, Math.cos(angle), Math.sin(angle), {
        speed: 185,
        damage: enemy.damage,
        radius: 9,
        life: 4.8,
      });
    }
  }

  function fireEnemyProjectile(enemy, dirX, dirY, options = {}) {
    const len = Math.hypot(dirX, dirY) || 1;
    const speed = options.speed || 170;
    enemyProjectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: (dirX / len) * speed,
      vy: (dirY / len) * speed,
      radius: options.radius || 8,
      damage: options.damage ?? enemy.damage,
      life: options.life || 4,
      spriteKey: options.spriteKey || "riftBolt",
    });
  }

  function updateEnemyProjectiles(dt) {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = enemyProjectiles[i];
      projectile.life -= dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      const outsideWorld = projectile.x < -40 || projectile.x > WORLD.width + 40 || projectile.y < -40 || projectile.y > WORLD.height + 40;
      let consumed = projectile.life <= 0 || outsideWorld;
      if (!consumed && Math.hypot(projectile.x - player.x, projectile.y - player.y) < projectile.radius + player.radius) {
        damagePlayer(projectile.damage, projectile.x, projectile.y);
        consumed = true;
      }
      if (consumed) enemyProjectiles.splice(i, 1);
    }
  }

  function killEnemy(index) {
    const e = enemies[index];
    enemies.splice(index, 1);
    player.weapons.blade.cooldowns.delete(e);
    player.kills += 1;
    createGem(e.x, e.y, e.exp, isBossType(e.type));
    floaters.push({ x: e.x, y: e.y, text: "+", life: 0.6 });
    if (e.type === "boss" || e.type === "whiteStagKing") setState("stageclear");
    if (e.type === "blackMoonHeart") setState("victory");
  }

  function createGem(x, y, value, large = false) {
    gems.push({ x, y, value, radius: large ? 10 : 5, vx: 0, vy: 0 });
  }

  function updateWeapons(dt) {
    updateBlade(dt);
    updateMoonShard(dt);
    updateBullets(dt);
    updateEclipseHalo(dt);
    updateMines(dt);
  }

  function updateBlade(dt) {
    const blade = player.weapons.blade;
    blade.angle += dt * (2.1 + blade.level * 0.22);
    const blades = Math.min(4, 1 + Math.floor((blade.level - 1) / 2));
    const orbit = 54 + blade.level * 5;
    const damage = 8 + blade.level * 4;
    const hitRadius = 21;
    for (let b = 0; b < blades; b++) {
      const angle = blade.angle + b * TWO_PI / blades;
      const hit = {
        x: player.x + Math.cos(angle) * orbit,
        y: player.y + Math.sin(angle) * orbit,
      };
      for (const e of enemies) {
        const last = blade.cooldowns.get(e) || 0;
        if (player.time - last < 0.52) continue;
        if (Math.hypot(hit.x - e.x, hit.y - e.y) < hitRadius + e.radius) {
          damageEnemy(e, damage * (isBossType(e.type) ? 0.7 : 1));
          blade.cooldowns.set(e, player.time);
        }
      }
    }
  }

  function updateBullets(dt) {
    const weapon = player.weapons.bullet;
    if (weapon.level > 0) {
      weapon.timer -= dt;
      const interval = Math.max(0.65, 1.15 - weapon.level * 0.1);
      if (weapon.timer <= 0) {
        const shots = weapon.level >= 4 ? 2 : 1;
        const damageScale = shots === 2 ? 0.8 : 1;
        for (let i = 0; i < shots; i++) fireBullet((i - (shots - 1) / 2) * 0.16, damageScale);
        weapon.timer = interval;
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      updateBulletHoming(b, dt);
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

  function updateMoonShard(dt) {
    const weapon = player.weapons.shard;
    if (!weapon || weapon.level <= 0) return;
    weapon.timer -= dt;
    const interval = Math.max(1.1, 1.7 - weapon.level * 0.12);
    if (weapon.timer > 0) return;

    const shots = currentStage >= 3 && weapon.level >= 4 ? 2 : 1;
    for (let i = 0; i < shots; i++) fireMoonShard((i - (shots - 1) / 2) * 0.22);
    weapon.timer = interval;
  }

  function updateBulletHoming(bullet, dt) {
    if (!bullet.homing) return;

    let target = bullet.target && enemies.includes(bullet.target) ? bullet.target : null;
    if (!target && bullet.retarget !== false) {
      target = nearestEnemy();
      bullet.target = target;
    }
    if (!target) return;
    const currentAngle = Math.atan2(bullet.vy, bullet.vx);
    const targetAngle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
    const nextAngle = currentAngle + clamp(angleDelta(currentAngle, targetAngle), -bullet.turnRate * dt, bullet.turnRate * dt);
    bullet.vx = Math.cos(nextAngle) * bullet.speed;
    bullet.vy = Math.sin(nextAngle) * bullet.speed;
  }

  function fireBullet(angleOffset, damageScale = 1) {
    const target = nearestEnemy(700);
    if (!target) return;
    const angle = Math.atan2(target.y - player.y, target.x - player.x) + angleOffset;
    bullets.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * 440,
      vy: Math.sin(angle) * 440,
      radius: 5,
      damage: (12 + player.weapons.bullet.level * 5) * damageScale,
      life: 1.6,
      spriteKey: "silverBullet",
    });
  }

  function fireMoonShard(angleOffset) {
    const target = nearestEnemy();
    if (!target) return;
    const weapon = player.weapons.shard;
    const angle = Math.atan2(target.y - player.y, target.x - player.x) + angleOffset;
    const speed = 270 + weapon.level * 24;
    bullets.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 7,
      damage: 10 + weapon.level * 4,
      life: 2.2,
      spriteKey: "moonShard",
      homing: true,
      speed,
      turnRate: 2.8,
      target,
      retarget: false,
    });
  }

  function nearestEnemy(maxRange = Infinity) {
    let best = null;
    let bestD = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d <= maxRange && d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  function updateEclipseHalo(dt) {
    const weapon = player.weapons.halo;
    if (!weapon || weapon.level <= 0) return;

    weapon.angle += dt * (1.35 + weapon.level * 0.16);
    weapon.timer -= dt;
    if (weapon.timer > 0) return;

    triggerEclipseWave();
    weapon.timer = Math.max(5.2, 7.5 - weapon.level * 0.6);
  }

  function triggerEclipseWave() {
    const weapon = player.weapons.halo;
    const radius = 105 + weapon.level * 12;
    const damage = 18 + weapon.level * 7;

    for (const e of enemies) {
      if (Math.hypot(player.x - e.x, player.y - e.y) < radius + e.radius) {
        damageEnemy(e, damage * (isBossType(e.type) ? 0.5 : 1));
      }
    }

    explosionEffects.push({
      type: "eclipseWave",
      x: player.x,
      y: player.y,
      life: 0.48,
      duration: 0.48,
      radius,
      pulse: weapon.angle,
    });
    floaters.push({ x: player.x, y: player.y, text: "◐", life: 0.7, burst: radius });
  }

  function updateMines(dt) {
    const weapon = player.weapons.mine;
    if (weapon.level > 0) {
      weapon.timer -= dt;
      if (weapon.timer <= 0) {
        placeMine();
        weapon.timer = Math.max(3, 4.8 - weapon.level * 0.45);
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
      radius: 58 + player.weapons.mine.level * 8,
      damage: 22 + player.weapons.mine.level * 8,
      pulse: Math.random() * TWO_PI,
    });
  }

  function explodeMine(mine) {
    for (const e of enemies) {
      if (Math.hypot(mine.x - e.x, mine.y - e.y) < mine.radius + e.radius) {
        damageEnemy(e, mine.damage * (isBossType(e.type) ? 0.6 : 1));
      }
    }
    explosionEffects.push({
      type: "starlightExplosion",
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
    enemy.hitFlash = isBossType(enemy.type) ? 0.14 : 0.11;
    createHitSparks(enemy);
  }

  function createHitSparks(enemy) {
    const now = player.time;
    const isBoss = isBossType(enemy.type);
    if (!isBoss && now < enemy.nextSparkTime && Math.random() > 0.28) return;

    enemy.nextSparkTime = now + 0.055;
    const colors = hitSparkColors(enemy.type);
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

  function hitSparkColors(type) {
    if (type === "sentinel") return ["#FFD2DC", "#FF4A6A", "#B78CFF", "#8FD7FF"];
    if (type === "whiteStagKing") return ["#F4F6FF", "#BFD5FF", "#B78CFF", "#D9F9DD"];
    if (type === "blackMoonHeart") return ["#F8F0FF", "#B78CFF", "#6D4EFF", "#FF4A8A"];
    if (type === "blackMoonLancer" || type === "eclipsePriest" || type === "obsidianWarden") return ["#E8DDFF", "#B78CFF", "#6D4EFF"];
    if (type === "corruptedTreant") return ["#D9F9DD", "#8FD48B", "#B78CFF"];
    if (type === "riftMoth") return ["#F0D8FF", "#B78CFF", "#72D6FF"];
    if (type === "moonWolf") return ["#E6ECFF", "#AFC8FF", "#B78CFF"];
    return ["#FFD2DC", "#FF4A6A", "#B78CFF"];
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
    drawEnemyProjectiles();
    drawPlayer();
    drawEclipseHalo();
    drawPlayerHitRings();
    drawBullets();
    drawBlade();
    drawCombatEffects();
    drawFloaters();
    drawPlayerDamageNumbers();
    drawDamageVignette();
    if (shouldDrawHud()) drawHud();
  }

  function shouldDrawHud() {
    return state === "playing" || state === "paused" || state === "levelup";
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
    const stage = stageConfig();
    const gradient = ctx.createRadialGradient(viewW / 2, viewH / 2, 80, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.7);
    gradient.addColorStop(0, stage.gradient[0]);
    gradient.addColorStop(0.55, stage.gradient[1]);
    gradient.addColorStop(1, stage.gradient[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewW, viewH);

    const backgroundTile = BACKGROUND_TILES[currentStage] || BACKGROUND_TILES[1];
    if (backgroundTile.complete && backgroundTile.naturalWidth > 0) {
      drawBackgroundTile(viewW, viewH, backgroundTile);
    } else {
      drawFallbackGrid();
    }

    ctx.fillStyle = stage.overlay;
    ctx.fillRect(0, 0, viewW, viewH);

    const vignette = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.18, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.68);
    vignette.addColorStop(0, stage.vignette[0]);
    vignette.addColorStop(1, stage.vignette[1]);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  function drawBackgroundTile(viewW, viewH, backgroundTile) {
    const pattern = ctx.createPattern(backgroundTile, "repeat");
    if (!pattern) return;

    const tileW = backgroundTile.naturalWidth;
    const tileH = backgroundTile.naturalHeight;
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
        const isBoss = isBossType(e.type);
        const bob = isBoss ? Math.sin(player.time * 2) * 2 : Math.sin(player.time * 7 + e.x * 0.03) * 1.4;
        const height = meta.height + bob;
        drawEntityShadow(p.x, p.y, e.radius * (isBoss ? 1.35 : 1.15), e.radius * 0.4, isBoss ? 0.55 : 0.4);
        if (e.type === "boss" && e.dashTime > 0) {
          drawBossDashWarning(p);
        }
        const options = {
          height,
          rotation: meta.rotateToPlayer ? angle : 0,
          hitFlash: e.hitFlash,
          shadowBlur: isBoss ? 18 : 8,
        };
        if (drawSprite(spriteKey, p.x, p.y, options) || (spriteKey !== e.type && drawSprite(e.type, p.x, p.y, options))) {
          continue;
        }
      }

      drawEnemyFallback(e, p);
    }
  }

  function getEnemySpriteKey(enemy) {
    if (enemy.type === "riftMoth" && enemy.shootTimer > 0 && enemy.shootTimer <= 0.28) {
      return "riftMothCast";
    }
    if (enemy.type === "eclipsePriest" && enemy.shootTimer > 0 && enemy.shootTimer <= 0.34) {
      return "eclipsePriestCast";
    }

    const frames = {
      worm: { fps: 6, keys: ["wormMove1", "wormMove2"] },
      chaser: { fps: 10, keys: ["chaserRun1", "chaserRun2"] },
      sentinel: { fps: 5, keys: ["sentinelWalk1", "sentinelWalk2"] },
      moonWolf: { fps: 12, keys: ["moonWolfRun1", "moonWolfRun2", "moonWolfRun3", "moonWolfRun2"] },
      riftMoth: { fps: 8, keys: ["riftMothFlap1", "riftMothFlap2"] },
      corruptedTreant: { fps: 5, keys: ["corruptedTreantWalk1", "corruptedTreantWalk2"] },
      blackMoonLancer: {
        fps: 10,
        keys: ["blackMoonLancerRun1", "blackMoonLancerRun2", "blackMoonLancerRun3", "blackMoonLancerRun2"],
      },
      eclipsePriest: { fps: 4, keys: ["eclipsePriestFloat1", "eclipsePriestFloat2"] },
      obsidianWarden: { fps: 4, keys: ["obsidianWardenWalk1", "obsidianWardenWalk2"] },
    }[enemy.type];

    if (!frames) return enemy.type;
    const frame = Math.floor((player.time + (enemy.animSeed || 0)) * frames.fps) % frames.keys.length;
    return frames.keys[frame];
  }

  function drawEnemyFallback(e, p) {
      const spec = ENEMY_TYPES[e.type];
      const isBoss = isBossType(e.type);
      ctx.save();
      ctx.shadowBlur = isBoss ? 26 : 10;
      ctx.shadowColor = e.type === "sentinel" ? "#66cfff" : spec.eye;
      ctx.fillStyle = e.hitFlash > 0 ? "#eaf7ff" : spec.color;
      ctx.beginPath();
      if (e.type === "sentinel" || e.type === "corruptedTreant") {
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

      if (e.type === "sentinel" || isBoss) {
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

  function drawEclipseHalo() {
    const weapon = player.weapons.halo;
    if (!weapon || weapon.level <= 0) return;

    const p = worldToScreen(player.x, player.y);
    const pulse = 0.5 + Math.sin(player.time * 4.8) * 0.5;
    const height = 86 + weapon.level * 8 + pulse * 6;
    if (drawSprite("eclipseHalo", p.x, p.y, {
      height,
      rotation: weapon.angle,
      alpha: 0.72,
      shadowBlur: 24,
    })) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.64;
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#d4c2ff";
    ctx.strokeStyle = "rgba(212, 194, 255, 0.82)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, height * 0.42, weapon.angle, weapon.angle + Math.PI * 1.62);
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
      const spriteKey = b.spriteKey || "silverBullet";
      if (drawSprite(spriteKey, p.x, p.y, {
        rotation: angle,
        shadowBlur: b.homing ? 20 : 16,
      })) {
        continue;
      }

      ctx.save();
      ctx.shadowBlur = b.homing ? 20 : 16;
      ctx.shadowColor = b.homing ? "#f0f6ff" : "#dff4ff";
      ctx.fillStyle = b.homing ? "#eef0ff" : "#eefbff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, b.radius, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemyProjectiles() {
    for (const projectile of enemyProjectiles) {
      const p = worldToScreen(projectile.x, projectile.y);
      const angle = Math.atan2(projectile.vy, projectile.vx);
      const spriteKey = projectile.spriteKey || "riftBolt";
      const isBlackMoon = spriteKey === "blackMoonBolt";
      if (drawSprite(spriteKey, p.x, p.y, {
        rotation: angle,
        shadowBlur: isBlackMoon ? 22 : 18,
      })) {
        continue;
      }

      ctx.save();
      ctx.shadowBlur = isBlackMoon ? 22 : 18;
      ctx.shadowColor = isBlackMoon ? "#ad78ff" : "#b66dff";
      ctx.fillStyle = isBlackMoon ? "#d8c0ff" : "#d4a8ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, projectile.radius, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMines() {
    for (const m of mines) {
      const p = worldToScreen(m.x, m.y);
      const pulse = 0.65 + Math.sin(player.time * 8.3 + m.pulse) * 0.25;
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
      if (effect.type === "eclipseWave") {
        drawEclipseWaveEffect(effect);
        continue;
      }
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

  function drawEclipseWaveEffect(effect) {
    const p = worldToScreen(effect.x, effect.y);
    const elapsed = effect.duration - effect.life;
    const t = clamp(elapsed / effect.duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 2);
    const height = effect.radius * (1.35 + eased * 0.95);

    if (drawSprite("eclipseWave", p.x, p.y, {
      height,
      rotation: effect.pulse || 0,
      alpha: 0.88 * (1 - t * 0.72),
      shadowBlur: 30,
    })) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#d4c2ff";
    ctx.strokeStyle = "rgba(212, 194, 255, 0.78)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, effect.radius * eased, 0, TWO_PI);
    ctx.stroke();
    ctx.strokeStyle = "rgba(111, 78, 255, 0.52)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, effect.radius * (0.58 + eased * 0.42), 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
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
    ctx.font = mobileHud ? "800 10px sans-serif" : "800 12px sans-serif";
    ctx.fillStyle = "rgba(220, 238, 255, 0.72)";
    ctx.fillText(stageConfig().name, viewW / 2, mobileHud ? 40 : 50);
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

    ctx.font = mobileHud ? "700 12px sans-serif" : "700 16px sans-serif";
    const statsText = `처치 ${player.kills}  레벨 ${player.level}`;
    if (mobileHud) {
      const pauseButtonClearance = 80;
      const statsMaxW = Math.max(1, viewW - hpX - pauseButtonClearance);
      ctx.textAlign = "left";
      ctx.fillText(statsText, hpX, hpY + hpH + 18, statsMaxW);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(statsText, viewW - 86, 34);
    }

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
      ["◆", player.weapons.shard?.level || 0],
      ["✦", player.weapons.mine.level],
      ["◐", player.weapons.halo?.level || 0],
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
    const boss = enemies.find((e) => isBossType(e.type));
    if (!boss) return;
    const w = Math.min(mobileHud ? 340 : 560, viewW - (mobileHud ? 28 : 48));
    const x = (viewW - w) / 2;
    drawBar(x, mobileHud ? 64 : 72, w, mobileHud ? 11 : 14, boss.hp / boss.maxHp, "#c92745", "#25101a");
    ctx.textAlign = "center";
    ctx.font = mobileHud ? "800 11px sans-serif" : "800 13px sans-serif";
    ctx.fillStyle = "#f3f9ff";
    ctx.fillText(ENEMY_TYPES[boss.type].name, viewW / 2, mobileHud ? 60 : 68);
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
    if ((event.code === "Escape" || event.code === "KeyP") && (state === "playing" || state === "paused")) {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (state === "paused" && (event.code === "Enter" || event.code === "Space")) {
      event.preventDefault();
      if (!event.repeat) resumeGame();
      return;
    }
    if (event.code === "Enter" && state === "stageclear") {
      event.preventDefault();
      if (!event.repeat) startNextStage();
      return;
    }
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

  pauseButton.addEventListener("pointerdown", (event) => {
    if (state !== "playing" || pauseButtonPointerId !== null) return;
    event.preventDefault();
    pauseButtonPointerId = event.pointerId;
    pauseButton.classList.add("pressing");
    if (pauseButton.setPointerCapture) pauseButton.setPointerCapture(event.pointerId);
  });
  pauseButton.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pauseButtonPointerId) return;
    pauseButton.classList.toggle("pressing", isPointerInsidePauseButton(event));
  });
  pauseButton.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pauseButtonPointerId) return;
    event.preventDefault();
    const shouldPause = isPointerInsidePauseButton(event);
    resetPauseButtonPointer();
    if (shouldPause) pauseGame();
  });
  pauseButton.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== pauseButtonPointerId) return;
    event.preventDefault();
    resetPauseButtonPointer();
  });
  pauseButton.addEventListener("click", (event) => {
    event.preventDefault();
  });

  document.getElementById("startButton").addEventListener("click", resetGame);
  document.getElementById("restartButton").addEventListener("click", resetGame);
  resumeButton.addEventListener("click", resumeGame);
  pauseRestartButton.addEventListener("click", resetGame);
  stage2Button.addEventListener("click", startNextStage);
  stageTitleButton.addEventListener("click", returnToTitle);
  document.getElementById("victoryRestartButton").addEventListener("click", resetGame);

  resize();
  setState("title");
  requestAnimationFrame(loop);
})();
