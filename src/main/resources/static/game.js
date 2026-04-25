'use strict';
/* ═══════════════════════════════════════════════════════════
   NEXUS PROTOCOL — FPS Game
   Engine: Babylon.js 6.x (WebGL)
   Features: Wave shooter, FPS camera, particle effects,
             enemy AI, glow/bloom, animated level
═══════════════════════════════════════════════════════════ */

// ── Config ───────────────────────────────────────────────
const CFG = {
  playerHealth: 100,
  playerHeight: 1.8,
  playerSpeed:  0.5,
  ammoPerMag:   30,
  reloadMs:     1800,
  shootCooldownMs: 120,

  enemyHealth:  2,
  enemyDamage:  12,
  enemyAttackMs: 1500,
  enemyDetect:  26,
  enemySpeedBase: 0.055,
  enemySpeedWave: 0.007,

  waveBase:  5,
  waveInc:   2,
  wavePause: 3500,
};

// ── State ────────────────────────────────────────────────
let S = {
  phase:     'menu',
  health:    CFG.playerHealth,
  ammo:      CFG.ammoPerMag,
  reloading: false,
  canShoot:  true,
  score:     0,
  wave:      1,
  kills:     0,
  enemies:   [],
  lights:    [],
  time:      0,
  totalTime: 0,
};

// ── Babylon.js globals ───────────────────────────────────
let engine, scene, camera, glowLayer, muzzleLight;
const canvas = document.getElementById('renderCanvas');

// ── DOM shortcuts ────────────────────────────────────────
const $  = id => document.getElementById(id);
const el = {
  menu:        $('menu-screen'),
  hud:         $('hud'),
  gameover:    $('gameover-screen'),
  lockOverlay: $('lock-overlay'),
  announce:    $('wave-announce'),
  announceText:$('announce-text'),
  dmgFlash:    $('damage-flash'),
  healthFill:  $('health-fill'),
  healthVal:   $('health-value'),
  ammoVal:     $('ammo-value'),
  scoreVal:    $('score-value'),
  waveVal:     $('wave-value'),
  enemiesVal:  $('enemies-value'),
  crosshair:   $('crosshair'),
  killFeed:    $('kill-feed'),
  reloadWrap:  $('reload-bar-wrap'),
  reloadFill:  $('reload-bar-fill'),
  goScore:     $('go-score'),
  goWave:      $('go-wave'),
  goKills:     $('go-kills'),
};

// ─────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  engine = new BABYLON.Engine(canvas, true, { antialias: true });
  window.addEventListener('resize', () => engine.resize());
  // Pre-create scene so the canvas is ready
});

function startGame() {
  el.menu.style.display     = 'none';
  el.gameover.style.display = 'none';
  el.hud.style.display      = 'block';
  el.lockOverlay.style.display = 'flex';

  // Reset state
  Object.assign(S, {
    phase: 'playing', health: CFG.playerHealth, ammo: CFG.ammoPerMag,
    reloading: false, canShoot: true, score: 0, wave: 1, kills: 0,
    enemies: [], lights: [], time: 0, totalTime: 0,
  });
  updateHUD();

  if (scene) scene.dispose();
  createScene();

  engine.runRenderLoop(() => {
    if (S.phase === 'playing') update(engine.getDeltaTime() / 1000);
    scene.render();
  });

  canvas.requestPointerLock();
}

// ─────────────────────────────────────────────────────────
// SCENE CREATION
// ─────────────────────────────────────────────────────────
function createScene() {
  scene = new BABYLON.Scene(engine);
  scene.gravity           = new BABYLON.Vector3(0, -25, 0);
  scene.collisionsEnabled = true;
  scene.fogMode           = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor          = new BABYLON.Color3(0, 0.01, 0.04);
  scene.fogDensity        = 0.022;
  scene.clearColor        = new BABYLON.Color4(0, 0.01, 0.04, 1);

  setupCamera();
  setupLighting();
  buildLevel();
  setupGlowLayer();
  setupInput();
  spawnWave(1);
}

// ─────────────────────────────────────────────────────────
// CAMERA (First Person)
// ─────────────────────────────────────────────────────────
function setupCamera() {
  camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, CFG.playerHeight, 0), scene);
  camera.setTarget(new BABYLON.Vector3(0, CFG.playerHeight, 1));
  camera.attachControl(canvas, true);
  camera.speed          = CFG.playerSpeed;
  camera.minZ           = 0.1;
  camera.fov            = 1.15;
  camera.checkCollisions = true;
  camera.applyGravity   = true;
  camera.ellipsoid      = new BABYLON.Vector3(0.45, 0.9, 0.45);
  camera.keysUp         = [87, 38];   // W / Up
  camera.keysDown       = [83, 40];   // S / Down
  camera.keysLeft       = [65, 37];   // A / Left
  camera.keysRight      = [68, 39];   // D / Right

  // Muzzle flash light — attached near camera
  muzzleLight = new BABYLON.PointLight('muzzle', new BABYLON.Vector3(0,0,0), scene);
  muzzleLight.diffuse   = new BABYLON.Color3(1, 0.85, 0.4);
  muzzleLight.intensity = 0;
  muzzleLight.range     = 10;
}

// ─────────────────────────────────────────────────────────
// LIGHTING
// ─────────────────────────────────────────────────────────
function setupLighting() {
  // Very dim ambient so the level is atmospheric
  const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0,1,0), scene);
  ambient.intensity    = 0.08;
  ambient.diffuse      = new BABYLON.Color3(0, 0.1, 0.2);
  ambient.groundColor  = new BABYLON.Color3(0, 0, 0.05);

  // Dynamic coloured lights at key points
  const lightDefs = [
    { pos: [ 0,  4,  0],  col: [0, 0.8, 1],    r: 22, i: 1.2 },  // centre cyan
    { pos: [18,  3,  18], col: [0.5, 0, 1],     r: 18, i: 0.9 },  // NE purple
    { pos: [-18, 3,  18], col: [0, 0.7, 0.4],   r: 18, i: 0.8 },  // NW green
    { pos: [18,  3, -18], col: [1,  0.3, 0],    r: 18, i: 0.8 },  // SE orange
    { pos: [-18, 3, -18], col: [0, 0.5, 1],     r: 18, i: 0.8 },  // SW blue
  ];

  lightDefs.forEach(d => {
    const light = new BABYLON.PointLight('pl', new BABYLON.Vector3(...d.pos), scene);
    light.diffuse   = new BABYLON.Color3(...d.col);
    light.intensity = d.i;
    light.range     = d.r;
    S.lights.push({ light, baseIntensity: d.i, phase: Math.random() * Math.PI * 2 });
  });
}

// ─────────────────────────────────────────────────────────
// GLOW LAYER (makes all emissive materials bloom)
// ─────────────────────────────────────────────────────────
function setupGlowLayer() {
  glowLayer = new BABYLON.GlowLayer('glow', scene);
  glowLayer.intensity = 1.8;
}

// ─────────────────────────────────────────────────────────
// LEVEL BUILDING
// ─────────────────────────────────────────────────────────
function buildLevel() {
  const ARENA = 50, H = 5;

  // ── Materials ──
  const floorMat  = makeGridMat();
  const wallMat   = makeWallMat();
  const ceilMat   = makeMat(0.02, 0.02, 0.05, 0, 0, 0.04);
  const pillarMat = makeEmissiveMat(0, 0.4, 0.8, 0.4);
  const accentMat = makeEmissiveMat(0, 1, 1, 1.5);

  // ── Floor ──
  const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: ARENA, height: ARENA, subdivisions: 1 }, scene);
  floor.material       = floorMat;
  floor.checkCollisions = true;
  floor.receiveShadows  = true;

  // ── Ceiling ──
  const ceil = box('ceil', ARENA, 0.3, ARENA, 0, H, 0, scene);
  ceil.material        = ceilMat;
  ceil.checkCollisions = true;

  // ── Perimeter walls ──
  const hw = ARENA / 2;
  const wallDefs = [
    { w: ARENA,  d: 1, x: 0,   z:  hw },
    { w: ARENA,  d: 1, x: 0,   z: -hw },
    { w: 1,      d: ARENA, x:  hw, z: 0 },
    { w: 1,      d: ARENA, x: -hw, z: 0 },
  ];

  wallDefs.forEach((wd, i) => {
    const m = box(`pw${i}`, wd.w, H, wd.d, wd.x, H/2, wd.z, scene);
    m.material       = wallMat;
    m.checkCollisions = true;
    // Glowing accent strip on top
    const strip = box(`strip${i}`, wd.w, 0.15, wd.d + 0.1, wd.x, H - 0.1, wd.z, scene);
    strip.material = accentMat;
  });

  // ── Internal walls (cover) ──
  const internalWalls = [
    [  12, 0,   0.8,  8 ], [ -12, 0,   0.8,  8 ],   // long E/W dividers
    [   0, 0,  12,    0.8], [  0,  0, -12,    0.8],   // long N/S dividers
    [   7, 0,   0.8,  5 ], [ -7,  0,   0.8,  5 ],   // short inner
    [   0, 0,   7,    0.8], [  0,  0,  -7,    0.8],   // short inner
    [  18, 0,   0.8,  6 ], [-18,  0,   0.8,  6 ],   // outer flanks
    [   0, 0,  18,    0.8], [  0,  0, -18,    0.8],
  ];

  internalWalls.forEach(([x,, w, d], i) => {
    const z = internalWalls[i][2] === d ? internalWalls[i][1] || 0 : 0;
    // recalc: [cx, cz, width, depth]
    const [cx, cz, iw, id] = [internalWalls[i][0], internalWalls[i][1] || 0, internalWalls[i][2], internalWalls[i][3]];
    const m = box(`iw${i}`, iw, H, id, cx, H/2, cz, scene);
    m.material       = wallMat;
    m.checkCollisions = true;
  });

  // ── Glowing pillars ──
  const pillarPos = [[14,14],[14,-14],[-14,14],[-14,-14],[0,20],[0,-20],[20,0],[-20,0]];
  pillarPos.forEach(([px, pz], i) => {
    const p = BABYLON.MeshBuilder.CreateCylinder(`pillar${i}`,
      { height: H, diameter: 0.8, tessellation: 6 }, scene);
    p.position.set(px, H/2, pz);
    p.material       = pillarMat;
    p.checkCollisions = true;

    // Glowing top cap
    const cap = BABYLON.MeshBuilder.CreateCylinder(`cap${i}`,
      { height: 0.25, diameter: 1.1, tessellation: 6 }, scene);
    cap.position.set(px, H - 0.1, pz);
    cap.material = accentMat;

    // Point light at each pillar
    const pl = new BABYLON.PointLight(`ppl${i}`, new BABYLON.Vector3(px, H - 0.5, pz), scene);
    pl.diffuse    = new BABYLON.Color3(0, 0.7, 1);
    pl.intensity  = 0.7;
    pl.range      = 10;
    S.lights.push({ light: pl, baseIntensity: 0.7, phase: i * 0.8 });
  });

  // ── Crates / cover boxes ──
  const cratePositions = [
    [6,6],[6,-6],[-6,6],[-6,-6],
    [16,0],[-16,0],[0,16],[0,-16],
    [10,16],[-10,16],[10,-16],[-10,-16],
  ];
  cratePositions.forEach(([cx, cz], i) => {
    const crate = box(`crate${i}`, 1.5, 1.5, 1.5, cx, 0.75, cz, scene);
    crate.material       = makeMat(0.06, 0.08, 0.12, 0.02, 0.04, 0.08);
    crate.checkCollisions = true;
  });
}

// ── Material helpers ──
function makeGridMat() {
  // Try GridMaterial (from materials library), fall back to Standard
  try {
    const m = new BABYLON.GridMaterial('grid', scene);
    m.mainColor   = new BABYLON.Color3(0.01, 0.02, 0.05);
    m.lineColor   = new BABYLON.Color3(0, 0.5, 0.9);
    m.gridRatio   = 2;
    m.majorUnitFrequency = 5;
    m.minorUnitVisibility = 0.3;
    m.opacity     = 1;
    return m;
  } catch {
    return makeMat(0.01, 0.02, 0.05, 0, 0.03, 0.06);
  }
}

function makeWallMat() {
  const m = new BABYLON.StandardMaterial('wall', scene);
  m.diffuseColor   = new BABYLON.Color3(0.04, 0.06, 0.1);
  m.emissiveColor  = new BABYLON.Color3(0, 0.02, 0.05);
  m.specularColor  = new BABYLON.Color3(0.1, 0.1, 0.2);
  m.specularPower  = 64;
  return m;
}

function makeMat(dr, dg, db, er, eg, eb) {
  const m = new BABYLON.StandardMaterial('mat_' + Math.random(), scene);
  m.diffuseColor  = new BABYLON.Color3(dr, dg, db);
  m.emissiveColor = new BABYLON.Color3(er, eg, eb);
  return m;
}

function makeEmissiveMat(er, eg, eb, intensity = 1) {
  const m = new BABYLON.StandardMaterial('em_' + Math.random(), scene);
  m.emissiveColor = new BABYLON.Color3(er * intensity, eg * intensity, eb * intensity);
  m.diffuseColor  = new BABYLON.Color3(0, 0, 0);
  return m;
}

function box(name, w, h, d, x, y, z, scene) {
  const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  m.position.set(x, y, z);
  return m;
}

// ─────────────────────────────────────────────────────────
// ENEMY SYSTEM
// ─────────────────────────────────────────────────────────
class Enemy {
  constructor(id, position) {
    this.id      = id;
    this.hp      = CFG.enemyHealth;
    this.alive   = true;
    this.state   = 'patrol';
    this.attackTimer = 0;
    this.patrolTarget = null;
    this.patrolTimer  = 0;
    this.speed   = CFG.enemySpeedBase + (S.wave - 1) * CFG.enemySpeedWave;
    this.bobPhase = Math.random() * Math.PI * 2;

    // Core mesh — glowing icosphere
    this.mesh = BABYLON.MeshBuilder.CreateIcoSphere(`enemy_${id}`,
      { radius: 0.7, subdivisions: 2 }, scene);
    this.mesh.position.copyFrom(position);
    this.mesh.position.y = 1.8;

    this.mat = new BABYLON.StandardMaterial(`emat_${id}`, scene);
    this.mat.emissiveColor = new BABYLON.Color3(1, 0.15, 0.05);
    this.mat.diffuseColor  = new BABYLON.Color3(0.3, 0, 0);
    this.mat.specularColor = new BABYLON.Color3(1, 0.3, 0.1);
    this.mesh.material = this.mat;

    // Inner glow core
    this.core = BABYLON.MeshBuilder.CreateSphere(`core_${id}`,
      { diameter: 0.5 }, scene);
    this.core.parent = this.mesh;
    const coreMat = new BABYLON.StandardMaterial(`cm_${id}`, scene);
    coreMat.emissiveColor = new BABYLON.Color3(1, 0.6, 0.2);
    this.core.material = coreMat;

    // Light attached to enemy
    this.light = new BABYLON.PointLight(`el_${id}`, this.mesh.position, scene);
    this.light.diffuse    = new BABYLON.Color3(1, 0.2, 0);
    this.light.intensity  = 0.8;
    this.light.range      = 8;

    // No physics collision for enemies — simple position-based
    this.mesh.isPickable = true;
  }

  update(dt) {
    if (!this.alive) return;

    S.time += dt;
    const playerPos = camera.position;
    const dist = BABYLON.Vector3.Distance(this.mesh.position, playerPos);

    // Bobbing animation
    this.bobPhase += dt * 2.5;
    this.mesh.position.y = 1.8 + Math.sin(this.bobPhase) * 0.2;
    this.mesh.rotation.y += dt * 1.2;
    this.core.rotation.x += dt * 2;

    // Pulse light
    this.light.intensity = 0.6 + Math.sin(this.bobPhase * 1.3) * 0.3;
    this.light.position.copyFrom(this.mesh.position);

    // AI state
    if (dist < CFG.enemyDetect) this.state = 'chase';

    if (this.state === 'patrol') {
      this.patrol(dt);
    } else {
      this.chase(playerPos, dist, dt);
    }
  }

  patrol(dt) {
    this.patrolTimer -= dt;
    if (!this.patrolTarget || this.patrolTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * 12;
      this.patrolTarget = new BABYLON.Vector3(
        this.mesh.position.x + Math.cos(angle) * r,
        1.8,
        this.mesh.position.z + Math.sin(angle) * r
      );
      // Clamp to arena
      this.patrolTarget.x = Math.max(-22, Math.min(22, this.patrolTarget.x));
      this.patrolTarget.z = Math.max(-22, Math.min(22, this.patrolTarget.z));
      this.patrolTimer = 3 + Math.random() * 3;
    }
    const dir = this.patrolTarget.subtract(this.mesh.position);
    dir.y = 0;
    if (dir.length() > 0.5) {
      dir.normalize();
      this.mesh.position.addInPlace(dir.scale(this.speed * 0.6));
    }
  }

  chase(playerPos, dist, dt) {
    const dir = playerPos.subtract(this.mesh.position);
    dir.y = 0;
    dir.normalize();
    this.mesh.position.addInPlace(dir.scale(this.speed));

    // Attack
    this.attackTimer -= dt;
    if (dist < 6 && this.attackTimer <= 0) {
      this.attackTimer = CFG.enemyAttackMs / 1000;
      dealDamageToPlayer(CFG.enemyDamage);
    }
  }

  takeDamage() {
    this.hp--;
    // Flash white on hit
    this.mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    setTimeout(() => {
      if (this.alive && this.mat) {
        this.mat.emissiveColor = new BABYLON.Color3(1, 0.15, 0.05);
      }
    }, 80);

    if (this.hp <= 0) this.die();
  }

  die() {
    this.alive = false;
    S.score  += 100 + S.wave * 10;
    S.kills++;
    spawnExplosion(this.mesh.position.clone());
    addKillEntry();

    this.light.dispose();
    this.mesh.dispose();
    S.enemies = S.enemies.filter(e => e !== this);
    updateHUD();
    checkWaveComplete();
  }
}

function spawnWave(waveNum) {
  S.wave = waveNum;
  const count = CFG.waveBase + (waveNum - 1) * CFG.waveInc;
  showAnnounce(`WAVE ${waveNum}`, `${count} HOSTILES INCOMING`);

  setTimeout(() => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const radius = 18 + Math.random() * 5;
        const pos = new BABYLON.Vector3(
          Math.cos(angle) * radius,
          1.8,
          Math.sin(angle) * radius
        );
        const enemy = new Enemy(Date.now() + i, pos);
        S.enemies.push(enemy);
      }, i * 300);
    }
  }, 2000);

  updateHUD();
}

function checkWaveComplete() {
  if (S.enemies.length === 0 && S.phase === 'playing') {
    S.score += 500 + S.wave * 100;
    showAnnounce(`WAVE ${S.wave} CLEARED`, `+${500 + S.wave * 100} BONUS`);
    setTimeout(() => spawnWave(S.wave + 1), CFG.wavePause);
  }
  updateHUD();
}

// ─────────────────────────────────────────────────────────
// WEAPON SYSTEM
// ─────────────────────────────────────────────────────────
function shoot() {
  if (!S.canShoot || S.reloading || S.ammo <= 0 || S.phase !== 'playing') return;

  S.ammo--;
  S.canShoot = false;
  setTimeout(() => { S.canShoot = true; }, CFG.shootCooldownMs);
  updateHUD();

  // Muzzle flash
  muzzleLight.position.copyFrom(camera.position);
  muzzleLight.intensity = 25;
  setTimeout(() => { muzzleLight.intensity = 0; }, 60);

  // Crosshair flash
  el.crosshair.classList.add('hit');
  setTimeout(() => el.crosshair.classList.remove('hit'), 100);

  // Raycast from camera center
  const forward = camera.getTarget().subtract(camera.position).normalize();
  const ray = new BABYLON.Ray(camera.position.clone(), forward, 60);

  const enemyMeshes = S.enemies.map(e => e.mesh);
  const hit = scene.pickWithRay(ray, m => enemyMeshes.includes(m));

  if (hit.hit && hit.pickedMesh) {
    const enemy = S.enemies.find(e => e.mesh === hit.pickedMesh);
    if (enemy) {
      enemy.takeDamage();
      spawnImpact(hit.pickedPoint);
    }
  } else {
    // Wall impact
    const wallHit = scene.pickWithRay(ray);
    if (wallHit.hit && wallHit.pickedPoint) {
      spawnImpact(wallHit.pickedPoint);
    }
  }

  if (S.ammo === 0) reload();
}

function reload() {
  if (S.reloading || S.ammo === CFG.ammoPerMag) return;
  S.reloading = true;
  el.ammoVal.classList.add('reload');
  el.reloadWrap.style.display = 'block';

  const start = Date.now();
  const interval = setInterval(() => {
    const pct = Math.min(100, ((Date.now() - start) / CFG.reloadMs) * 100);
    el.reloadFill.style.width = pct + '%';
  }, 50);

  setTimeout(() => {
    clearInterval(interval);
    S.ammo = CFG.ammoPerMag;
    S.reloading = false;
    el.ammoVal.classList.remove('reload');
    el.reloadWrap.style.display = 'none';
    el.reloadFill.style.width = '0%';
    updateHUD();
  }, CFG.reloadMs);
}

// ─────────────────────────────────────────────────────────
// DAMAGE TO PLAYER
// ─────────────────────────────────────────────────────────
function dealDamageToPlayer(amount) {
  if (S.phase !== 'playing') return;
  S.health = Math.max(0, S.health - amount);
  updateHUD();
  flashDamage();
  if (S.health === 0) gameOver();
}

function flashDamage() {
  el.dmgFlash.style.background = 'rgba(255,0,0,0.35)';
  // Screen shake
  canvas.style.transform = 'translate(2px, -2px)';
  setTimeout(() => {
    el.dmgFlash.style.background = 'rgba(255,0,0,0)';
    canvas.style.transform = 'translate(0,0)';
  }, 140);
}

// ─────────────────────────────────────────────────────────
// PARTICLE EFFECTS
// ─────────────────────────────────────────────────────────
function spawnExplosion(position) {
  const ps = new BABYLON.ParticleSystem('exp_' + Date.now(), 80, scene);

  ps.emitter = position.clone();
  ps.particleTexture = new BABYLON.Texture(
    'https://cdn.babylonjs.com/textures/flare.png', scene);

  ps.color1 = new BABYLON.Color4(1, 0.4, 0, 1);
  ps.color2 = new BABYLON.Color4(1, 0.8, 0.2, 1);
  ps.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);

  ps.minSize = 0.15;
  ps.maxSize = 0.55;
  ps.minLifeTime = 0.3;
  ps.maxLifeTime = 0.7;
  ps.emitRate    = 0;

  ps.minEmitPower = 6;
  ps.maxEmitPower = 14;
  ps.updateSpeed  = 0.02;
  ps.minEmitBox   = new BABYLON.Vector3(-0.3, -0.3, -0.3);
  ps.maxEmitBox   = new BABYLON.Vector3( 0.3,  0.3,  0.3);
  ps.gravity      = new BABYLON.Vector3(0, -8, 0);

  ps.manualEmitCount = 80;
  ps.start();

  // Flash light
  const fl = new BABYLON.PointLight('flash', position, scene);
  fl.diffuse    = new BABYLON.Color3(1, 0.5, 0);
  fl.intensity  = 30;
  fl.range      = 12;
  setTimeout(() => fl.dispose(), 250);

  setTimeout(() => ps.dispose(), 1200);
}

function spawnImpact(position) {
  if (!position) return;
  const ps = new BABYLON.ParticleSystem('imp_' + Date.now(), 20, scene);
  ps.emitter = position.clone();
  ps.particleTexture = new BABYLON.Texture(
    'https://cdn.babylonjs.com/textures/flare.png', scene);

  ps.color1 = new BABYLON.Color4(0.2, 0.8, 1, 1);
  ps.color2 = new BABYLON.Color4(1, 1, 1, 1);
  ps.colorDead = new BABYLON.Color4(0, 0, 0.2, 0);
  ps.minSize = 0.05; ps.maxSize = 0.15;
  ps.minLifeTime = 0.1; ps.maxLifeTime = 0.3;
  ps.emitRate = 0;
  ps.minEmitPower = 3; ps.maxEmitPower = 6;
  ps.manualEmitCount = 20;
  ps.start();
  setTimeout(() => ps.dispose(), 500);
}

// ─────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────
function setupInput() {
  // Shoot on left click
  scene.onPointerObservable.add(info => {
    if (info.type === BABYLON.PointerEventTypes.POINTERDOWN &&
        info.event.button === 0) {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      } else {
        shoot();
      }
    }
  });

  // Reload on R
  window.addEventListener('keydown', e => {
    if (S.phase !== 'playing') return;
    if (e.code === 'KeyR') reload();
  });

  // Pointer lock change
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      el.lockOverlay.style.display = 'none';
    } else if (S.phase === 'playing') {
      el.lockOverlay.style.display = 'flex';
    }
  });
}

// ─────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────
function updateHUD() {
  const hp = S.health;
  el.healthFill.style.width = hp + '%';
  el.healthFill.classList.toggle('low', hp < 30);
  el.healthVal.textContent  = hp + ' HP';
  el.ammoVal.textContent    = S.reloading ? 'RELOADING' : S.ammo;
  el.scoreVal.textContent   = S.score.toLocaleString();
  el.waveVal.textContent    = `WAVE ${S.wave}`;
  el.enemiesVal.textContent = S.enemies.length + ' LEFT';
}

function addKillEntry() {
  const msgs = ['DRONE DOWN','TARGET ELIMINATED','HOSTILE NEUTRALISED',
                'KILL CONFIRMED','SYSTEM OFFLINE','UNIT DESTROYED'];
  const div = document.createElement('div');
  div.className = 'kill-entry';
  div.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  el.killFeed.prepend(div);
  setTimeout(() => div.classList.add('fading'), 2000);
  setTimeout(() => div.remove(), 3000);
  if (el.killFeed.children.length > 5) el.killFeed.lastChild.remove();
}

function showAnnounce(title, sub) {
  el.announceText.innerHTML =
    `<div class="announce-text">${title}</div>` +
    `<div style="font-size:.9rem;letter-spacing:.3em;color:rgba(0,255,255,.5);margin-top:6px">${sub}</div>`;
  el.announce.classList.add('show');
  setTimeout(() => el.announce.classList.remove('show'), 2800);
}

// ─────────────────────────────────────────────────────────
// GAME OVER
// ─────────────────────────────────────────────────────────
function gameOver() {
  S.phase = 'dead';
  canvas.exitPointerLock?.() || document.exitPointerLock();
  el.lockOverlay.style.display = 'none';

  el.goScore.textContent = S.score.toLocaleString();
  el.goWave.textContent  = S.wave;
  el.goKills.textContent = S.kills;
  el.gameover.style.display = 'flex';
  el.hud.style.display = 'none';
}

// ─────────────────────────────────────────────────────────
// MAIN GAME LOOP
// ─────────────────────────────────────────────────────────
function update(dt) {
  S.totalTime += dt;

  // Update enemies
  S.enemies.forEach(e => e.update(dt));

  // Animate scene lights (gentle pulse)
  S.lights.forEach(({ light, baseIntensity, phase }) => {
    light.intensity = baseIntensity *
      (0.85 + 0.15 * Math.sin(S.totalTime * 1.5 + phase));
  });

  updateHUD();
}
