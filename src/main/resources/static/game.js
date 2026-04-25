'use strict';

const CFG = {
  playerHealth: 100,
  playerHeight: 1.8,
  playerSpeed: 0.28,
  sprintSpeed: 0.42,
  moveSmoothing: 0.14,
  lookSensitivity: 0.0022,
  arenaSize: 110,
  arenaPad: 7,

  ammoPerMag: 30,
  reloadMs: 1700,
  shootCooldownMs: 85,
  playerDamage: 4,

  enemyHealth: 3,
  enemyDamage: 9,
  enemyAttackMs: 1550,
  enemyDetect: 46,
  enemyBaseSpeed: 0.052,
  enemyWaveSpeed: 0.007,
  enemyComfortRadius: 4.5,
  enemyOrbitRadius: 8,

  waveBase: 4,
  waveInc: 2,
  wavePause: 3600,
};

const ARENAS = [
  {
    name: 'Aegis Hangar',
    sky: [0.03, 0.05, 0.11],
    fogDensity: 0.0046,
    lights: [
      { p: [0, 6, 0], c: [0.32, 0.58, 1], r: 72, i: 1.9 },
      { p: [30, 5, 24], c: [0.55, 0.34, 1], r: 36, i: 1.12 },
      { p: [-30, 5, 24], c: [0.18, 0.8, 0.56], r: 36, i: 1.04 },
      { p: [26, 5, -28], c: [1, 0.45, 0.18], r: 36, i: 1.06 },
      { p: [-26, 5, -28], c: [0.18, 0.62, 1], r: 36, i: 1.06 },
    ],
    bunkers: [[26, 18], [-26, 18], [26, -18], [-26, -18], [0, 34], [0, -34]],
    lanes: [
      { w: 18, h: 3, d: 1.6, x: 0, z: 20 },
      { w: 18, h: 3, d: 1.6, x: 0, z: -20 },
      { w: 1.6, h: 3, d: 16, x: 24, z: 0 },
      { w: 1.6, h: 3, d: 16, x: -24, z: 0 },
    ],
    pylons: [[30, 30], [30, -30], [-30, 30], [-30, -30]],
  },
  {
    name: 'Drift Yard',
    sky: [0.04, 0.03, 0.09],
    fogDensity: 0.0051,
    lights: [
      { p: [0, 6, 0], c: [0.22, 0.48, 1], r: 70, i: 1.82 },
      { p: [34, 4, 0], c: [1, 0.34, 0.2], r: 32, i: 1.04 },
      { p: [-34, 4, 0], c: [0.28, 0.86, 0.58], r: 32, i: 1.02 },
      { p: [0, 4, 34], c: [0.54, 0.34, 1], r: 32, i: 1.04 },
      { p: [0, 4, -34], c: [0.24, 0.7, 1], r: 32, i: 1.04 },
    ],
    bunkers: [[32, 12], [-32, 12], [32, -12], [-32, -12], [12, 32], [-12, 32], [12, -32], [-12, -32]],
    lanes: [
      { w: 28, h: 2.9, d: 1.4, x: 0, z: 26 },
      { w: 28, h: 2.9, d: 1.4, x: 0, z: -26 },
      { w: 1.4, h: 2.9, d: 22, x: 26, z: 0 },
      { w: 1.4, h: 2.9, d: 22, x: -26, z: 0 },
      { w: 12, h: 2.6, d: 1.4, x: 0, z: 0 },
    ],
    pylons: [[38, 0], [-38, 0], [0, 38], [0, -38]],
  },
  {
    name: 'Citadel Array',
    sky: [0.02, 0.04, 0.08],
    fogDensity: 0.0048,
    lights: [
      { p: [0, 6, 0], c: [0.24, 0.56, 1], r: 72, i: 1.85 },
      { p: [28, 5, 28], c: [0.52, 0.3, 1], r: 32, i: 1.08 },
      { p: [-28, 5, 28], c: [0.2, 0.74, 0.52], r: 32, i: 1.02 },
      { p: [28, 5, -28], c: [1, 0.46, 0.16], r: 32, i: 1.02 },
      { p: [-28, 5, -28], c: [0.22, 0.58, 1], r: 32, i: 1.02 },
    ],
    bunkers: [[22, 30], [-22, 30], [22, -30], [-22, -30], [36, 0], [-36, 0]],
    lanes: [
      { w: 22, h: 3.2, d: 1.5, x: 0, z: 20 },
      { w: 22, h: 3.2, d: 1.5, x: 0, z: -20 },
      { w: 1.5, h: 3.2, d: 18, x: 20, z: 0 },
      { w: 1.5, h: 3.2, d: 18, x: -20, z: 0 },
      { w: 10, h: 2.8, d: 1.4, x: 0, z: 38 },
      { w: 10, h: 2.8, d: 1.4, x: 0, z: -38 },
    ],
    pylons: [[24, 24], [24, -24], [-24, 24], [-24, -24], [0, 42]],
  },
];

let S = {};
let engine;
let scene;
let camera;
let glowLayer;
let muzzleLight;
let gunRoot;
let gunTipMesh;
let gunRecoil = 0;
let gunBob = 0;
let autoFireTimer = null;
let keyboardFireTimer = null;
let inputBound = false;
let audioCtx = null;
let weaponTargetPoint = null;
let aimAssistEnemy = null;
let selectedEnemy = null;
let lastTargetLabel = '';
let lastTargetHint = '';

const canvas = document.getElementById('renderCanvas');
const KEYS = new Set();
const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const mobileMove = { f: 0, b: 0, l: 0, r: 0 };

const $ = id => document.getElementById(id);
const el = {
  menu: $('menu-screen'),
  hud: $('hud'),
  gameover: $('gameover-screen'),
  lockOverlay: $('lock-overlay'),
  announce: $('wave-announce'),
  announceTxt: $('announce-text'),
  dmgFlash: $('damage-flash'),
  healthFill: $('health-fill'),
  healthVal: $('health-value'),
  ammoVal: $('ammo-value'),
  scoreVal: $('score-value'),
  waveVal: $('wave-value'),
  enemiesVal: $('enemies-value'),
  crosshair: $('crosshair'),
  killFeed: $('kill-feed'),
  reloadWrap: $('reload-bar-wrap'),
  reloadFill: $('reload-bar-fill'),
  goScore: $('go-score'),
  goWave: $('go-wave'),
  goKills: $('go-kills'),
  mobileCtrl: $('mobile-controls'),
};

function resetState() {
  aimAssistEnemy = null;
  selectedEnemy = null;
  weaponTargetPoint = null;
  lastTargetLabel = '';
  lastTargetHint = '';
  S = {
    phase: 'playing',
    health: CFG.playerHealth,
    ammo: CFG.ammoPerMag,
    reloading: false,
    canShoot: true,
    score: 0,
    wave: 1,
    kills: 0,
    enemies: [],
    lights: [],
    arena: ARENAS[(Math.random() * ARENAS.length) | 0],
    totalTime: 0,
    moveVelocity: new BABYLON.Vector3(0, 0, 0),
  };
}

window.addEventListener('DOMContentLoaded', () => {
  engine = new BABYLON.Engine(canvas, true, { antialias: true });
  window.addEventListener('resize', () => engine.resize());
  if (isMobile && el.mobileCtrl) el.mobileCtrl.style.display = 'flex';
  bindGlobalInput();
});

function startGame() {
  el.menu.style.display = 'none';
  el.gameover.style.display = 'none';
  el.hud.style.display = 'block';
  el.lockOverlay.style.display = isMobile ? 'none' : 'flex';

  resetState();
  updateHUD();

  clearInterval(autoFireTimer);
  clearInterval(keyboardFireTimer);
  autoFireTimer = null;
  keyboardFireTimer = null;

  if (scene) {
    scene.dispose();
    scene = null;
  }

  createScene();

  engine.runRenderLoop(() => {
    if (!scene) return;
    if (S.phase === 'playing') gameLoop(engine.getDeltaTime() / 1000);
    scene.render();
  });

  if (!isMobile) canvas.requestPointerLock();
}

function createScene() {
  scene = new BABYLON.Scene(engine);
  scene.gravity = new BABYLON.Vector3(0, -22, 0);
  scene.collisionsEnabled = true;
  scene.clearColor = new BABYLON.Color4(...S.arena.sky, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor = new BABYLON.Color3(...S.arena.sky);
  scene.fogDensity = S.arena.fogDensity;

  setupCamera();
  setupLighting();
  buildArena();
  createWeapon();
  setupGlowLayer();
  bindSceneInput();
  spawnWave(1);
}

function setupCamera() {
  camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, CFG.playerHeight, 0), scene);
  camera.setTarget(new BABYLON.Vector3(0, CFG.playerHeight, 15));
  camera.attachControl(canvas, true);
  camera.speed = CFG.playerSpeed;
  camera.minZ = 0.05;
  camera.fov = 1.08;
  camera.angularSensibility = Math.round(1 / CFG.lookSensitivity);
  camera.checkCollisions = true;
  camera.applyGravity = true;
  camera.ellipsoid = new BABYLON.Vector3(0.4, 0.85, 0.4);
  camera.inputs.removeByType('FreeCameraKeyboardMoveInput');

  muzzleLight = new BABYLON.PointLight('muzzle', BABYLON.Vector3.Zero(), scene);
  muzzleLight.diffuse = new BABYLON.Color3(1, 0.9, 0.45);
  muzzleLight.intensity = 0;
  muzzleLight.range = 15;

  scene.onBeforeRenderObservable.add(() => {
    camera.rotation.x = clamp(camera.rotation.x, -0.72, 0.42);
  });
}

function setupLighting() {
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.22;
  hemi.diffuse = new BABYLON.Color3(0.1, 0.14, 0.28);
  hemi.groundColor = new BABYLON.Color3(0.03, 0.03, 0.06);

  for (const def of S.arena.lights) {
    const light = new BABYLON.PointLight('arenaLight', new BABYLON.Vector3(...def.p), scene);
    light.diffuse = new BABYLON.Color3(...def.c);
    light.intensity = def.i;
    light.range = def.r;
    S.lights.push({ light, base: def.i, phase: Math.random() * Math.PI * 2 });
  }
}

function setupGlowLayer() {
  glowLayer = new BABYLON.GlowLayer('glow', scene);
  glowLayer.intensity = 1.9;
}

function buildArena() {
  const size = CFG.arenaSize;
  const half = size / 2;
  const wallHeight = 5.6;

  const sky = BABYLON.MeshBuilder.CreateSphere('sky', { diameter: size * 2.8, segments: 16, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
  const skyMat = new BABYLON.StandardMaterial('skyMat', scene);
  skyMat.disableLighting = true;
  skyMat.emissiveColor = new BABYLON.Color3(0.03, 0.06, 0.12);
  skyMat.diffuseColor = new BABYLON.Color3(0.03, 0.06, 0.12);
  sky.material = skyMat;
  sky.isPickable = false;

  const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: size, height: size, subdivisions: 4 }, scene);
  floor.material = makeGridMaterial();
  floor.checkCollisions = true;

  const horizon = BABYLON.MeshBuilder.CreateTorus('horizon', { diameter: size * 0.9, thickness: 0.18, tessellation: 64 }, scene);
  horizon.position.y = 0.3;
  horizon.rotation.x = Math.PI / 2;
  horizon.material = makeEmissive(0.08, 0.45, 0.8, 0.85);
  horizon.isPickable = false;

  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const guide = createBox(`guide_${i}`, 0.22, 3.2, size * 0.75, i * 12, 1.6, 0, makeEmissive(0.04, 0.18, 0.35, 0.38));
    guide.isPickable = false;
  }

  const wallMat = makeMaterial(0.04, 0.05, 0.08, 0.01, 0.02, 0.05);
  const accent = makeEmissive(0, 1, 1, 1.5);
  [
    [size + 2, wallHeight, 1.5, 0, wallHeight / 2, half + 0.5],
    [size + 2, wallHeight, 1.5, 0, wallHeight / 2, -half - 0.5],
    [1.5, wallHeight, size + 2, half + 0.5, wallHeight / 2, 0],
    [1.5, wallHeight, size + 2, -half - 0.5, wallHeight / 2, 0],
  ].forEach(([w, h, d, x, y, z], i) => {
    const wall = createBox(`perimeter_${i}`, w, h, d, x, y, z, wallMat);
    wall.checkCollisions = true;
    createBox(`rim_${i}`, w, 0.14, d + 0.12, x, h - 0.07, z, accent);
  });

  for (const [cx, cz] of S.arena.bunkers) {
    const bMat = makeMaterial(0.05, 0.07, 0.12, 0.01, 0.02, 0.04);
    const core = createBox(`bunker_${cx}_${cz}`, 6.2, 2.7, 1.7, cx, 1.35, cz, bMat);
    core.checkCollisions = true;
    const offset = cx >= 0 ? 2.2 : -2.2;
    const wing = createBox(`wing_${cx}_${cz}`, 1.7, 2.7, 4.2, cx + offset, 1.35, cz + (offset > 0 ? 1.1 : -1.1), bMat);
    wing.checkCollisions = true;
    createBox(`accent_${cx}_${cz}`, 6.2, 0.12, 1.82, cx, 2.62, cz, makeEmissive(0, 0.5, 0.9, 1));
  }

  for (const lane of S.arena.lanes) {
    const cover = createBox(`lane_${lane.x}_${lane.z}`, lane.w, lane.h, lane.d, lane.x, lane.h / 2, lane.z, makeMaterial(0.05, 0.07, 0.12, 0.01, 0.02, 0.04));
    cover.checkCollisions = true;
  }

  for (const [x, z] of S.arena.pylons) {
    const pylon = BABYLON.MeshBuilder.CreateCylinder(`pylon_${x}_${z}`, { height: 6.6, diameter: 0.85, tessellation: 6 }, scene);
    pylon.position.set(x, 3.3, z);
    pylon.material = makeEmissive(0, 0.35, 0.9, 0.45);
    pylon.checkCollisions = true;

    const cap = BABYLON.MeshBuilder.CreateCylinder(`cap_${x}_${z}`, { height: 0.22, diameter: 1.16, tessellation: 6 }, scene);
    cap.position.set(x, 6.6, z);
    cap.material = makeEmissive(0, 1, 1, 1.9);

    const pLight = new BABYLON.PointLight(`pylonLight_${x}_${z}`, new BABYLON.Vector3(x, 6, z), scene);
    pLight.diffuse = new BABYLON.Color3(0, 0.62, 1);
    pLight.intensity = 0.9;
    pLight.range = 24;
    S.lights.push({ light: pLight, base: 0.9, phase: Math.random() * Math.PI * 2 });
  }
}

function createWeapon() {
  gunRoot = new BABYLON.TransformNode('gunRoot', scene);

  const metal = new BABYLON.StandardMaterial('weaponMetal', scene);
  metal.diffuseColor = new BABYLON.Color3(0.12, 0.13, 0.18);
  metal.emissiveColor = new BABYLON.Color3(0.02, 0.03, 0.06);
  metal.specularColor = new BABYLON.Color3(0.7, 0.7, 1);

  const glow = new BABYLON.StandardMaterial('weaponGlow', scene);
  glow.emissiveColor = new BABYLON.Color3(0, 0.9, 1);
  glow.diffuseColor = new BABYLON.Color3(0, 0.12, 0.22);

  const orange = new BABYLON.StandardMaterial('weaponAccent', scene);
  orange.emissiveColor = new BABYLON.Color3(1, 0.45, 0);

  const makePart = (name, opts, pos, mat) => {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, opts, scene);
    mesh.position.copyFrom(pos);
    mesh.parent = gunRoot;
    mesh.material = mat;
    mesh.renderingGroupId = 1;
    mesh.isPickable = false;
    return mesh;
  };

  makePart('weaponBody', { width: 0.1, height: 0.06, depth: 0.28 }, new BABYLON.Vector3(0, 0, 0), metal);
  makePart('weaponSight', { width: 0.014, height: 0.026, depth: 0.06 }, new BABYLON.Vector3(0, 0.047, 0.045), metal);
  makePart('weaponRail', { width: 0.104, height: 0.008, depth: 0.24 }, new BABYLON.Vector3(0, 0.035, 0), glow);
  makePart('weaponGrip', { width: 0.062, height: 0.11, depth: 0.076 }, new BABYLON.Vector3(0, -0.085, -0.055), metal);
  makePart('weaponCell', { width: 0.038, height: 0.03, depth: 0.094 }, new BABYLON.Vector3(0, -0.02, 0.05), orange);

  const barrel = BABYLON.MeshBuilder.CreateCylinder('weaponBarrel', { diameter: 0.02, height: 0.24, tessellation: 8 }, scene);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.004, 0.25);
  barrel.parent = gunRoot;
  barrel.material = metal;
  barrel.renderingGroupId = 1;
  barrel.isPickable = false;

  gunTipMesh = BABYLON.MeshBuilder.CreateSphere('weaponTip', { diameter: 0.034, segments: 4 }, scene);
  gunTipMesh.position.set(0, 0.004, 0.39);
  gunTipMesh.parent = gunRoot;
  gunTipMesh.material = glow;
  gunTipMesh.renderingGroupId = 1;
  gunTipMesh.isPickable = false;
}

function updateWeapon(dt) {
  if (!gunRoot || !camera) return;

  gunRecoil = Math.max(0, gunRecoil - dt * 12);
  const moveAmount = Math.min(1, S.moveVelocity.length() * 2.2);
  gunBob += dt * (3 + moveAmount * 5.6);

  const pos = camera.position.clone();
  const fwd = camera.getTarget().subtract(pos).normalize();
  const right = BABYLON.Vector3.Cross(fwd, BABYLON.Axis.Y).normalize();
  const up = BABYLON.Vector3.Cross(right, fwd).normalize();
  const bob = Math.sin(gunBob) * (0.003 + moveAmount * 0.006);
  const nearWallShift = weaponTargetPoint && BABYLON.Vector3.Distance(pos, weaponTargetPoint) < 5 ? 0.05 : 0;

  gunRoot.position = pos
    .add(fwd.scale(0.34 - gunRecoil * 0.05))
    .add(right.scale(0.18 + nearWallShift))
    .add(up.scale(-0.23 + bob));

  const lookTarget = weaponTargetPoint ? BABYLON.Vector3.Lerp(gunRoot.position.add(fwd.scale(10)), weaponTargetPoint, 0.75) : gunRoot.position.add(fwd.scale(10));
  gunRoot.lookAt(lookTarget, 0, 0, 0);
  gunRoot.rotation.z += Math.sin(gunBob * 0.5) * 0.018 + moveAmount * 0.025;
  muzzleLight.position = pos.add(fwd.scale(0.48));
}

function flashWeaponMuzzle() {
  if (!gunTipMesh) return;
  gunTipMesh.scaling = new BABYLON.Vector3(1.8, 1.8, 2.4);
  setTimeout(() => {
    if (gunTipMesh) gunTipMesh.scaling = BABYLON.Vector3.One();
  }, 45);
}

function spawnTracer(start, end, hit) {
  if (!start || !end) return;
  const tracer = BABYLON.MeshBuilder.CreateLines(`tracer_${Date.now()}`, { points: [start.clone(), end.clone()] }, scene);
  tracer.color = hit ? new BABYLON.Color3(1, 0.92, 0.5) : new BABYLON.Color3(0.45, 0.9, 1);
  tracer.alpha = 1;
  tracer.isPickable = false;
  setTimeout(() => tracer.dispose(), 60);
}

function spawnHitMarker(pos, hitEnemy) {
  if (!pos) return;
  const marker = BABYLON.MeshBuilder.CreatePlane(`hitMarker_${Date.now()}`, { size: hitEnemy ? 0.42 : 0.28 }, scene);
  marker.position.copyFrom(pos);
  marker.position.addInPlace(new BABYLON.Vector3(0, 0.12, 0));
  marker.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  marker.isPickable = false;
  const mat = new BABYLON.StandardMaterial(`hitMarkerMat_${Date.now()}`, scene);
  mat.emissiveColor = hitEnemy ? new BABYLON.Color3(1, 0.2, 0.08) : new BABYLON.Color3(0.2, 0.85, 1);
  mat.diffuseColor = BABYLON.Color3.Black();
  mat.alpha = 0.9;
  marker.material = mat;
  setTimeout(() => marker.dispose(), 120);
}

function fireFeedback() {
  gunRecoil = 1.15;
  muzzleLight.intensity = 34;
  flashWeaponMuzzle();
  setTimeout(() => { muzzleLight.intensity = 0; }, 60);
  el.crosshair.classList.add('shoot');
  setTimeout(() => el.crosshair.classList.remove('shoot'), 80);
}

function playShotSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.05);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
}

function getEnemyAimPoint(enemy) {
  return enemy.root.position.add(new BABYLON.Vector3(0, 1.34, 0));
}

function refreshTargetHUD() {
  if (!el.targetName || !el.targetHint || !el.targetPanel) return;

  const active = selectedEnemy && selectedEnemy.alive ? selectedEnemy : null;
  const name = active ? `LOCKED TARGET - ${active.hp} HIT${active.hp === 1 ? '' : 'S'} LEFT` : 'SWEEP TO LOCK';
  const hint = active
    ? 'Press Space or click to fire. Press C or RESET VIEW to level the camera.'
    : 'Aim at a hostile, then press Space or click to fire.';

  if (name !== lastTargetLabel) {
    el.targetName.textContent = name;
    lastTargetLabel = name;
  }
  if (hint !== lastTargetHint) {
    el.targetHint.textContent = hint;
    lastTargetHint = hint;
  }

  el.targetPanel.classList.toggle('locked', !!active);
  el.crosshair.classList.toggle('locked', !!active);
}

function updateAimAssist() {
  if (!scene || !camera) return;

  aimAssistEnemy = null;
  let bestScore = Infinity;
  const centerX = engine.getRenderWidth() * 0.5;
  const centerY = engine.getRenderHeight() * 0.5;

  for (const enemy of S.enemies) {
    if (!enemy.alive) continue;
    const pos = BABYLON.Vector3.Project(
      getEnemyAimPoint(enemy),
      BABYLON.Matrix.Identity(),
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    );
    if (pos.z < 0 || pos.z > 1) {
      enemy.setHighlighted(false);
      continue;
    }

    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const score = Math.sqrt(dx * dx + dy * dy);
    if (score < 230 && score < bestScore) {
      bestScore = score;
      aimAssistEnemy = enemy;
    }
  }

  selectedEnemy = aimAssistEnemy && aimAssistEnemy.alive ? aimAssistEnemy : null;

  for (const enemy of S.enemies) {
    enemy.setHighlighted(enemy === selectedEnemy);
  }

  el.crosshair.classList.toggle('target', !!selectedEnemy);
  refreshTargetHUD();
}

class Enemy {
  constructor(id, pos) {
    this.id = id;
    this.hp = CFG.enemyHealth;
    this.alive = true;
    this.state = 'patrol';
    this.speed = CFG.enemyBaseSpeed + (S.wave - 1) * CFG.enemyWaveSpeed;
    this.atkTimer = 0.9 + Math.random() * 1.6;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.patrolTimer = 0;
    this.patrolTarget = null;

    this.root = new BABYLON.TransformNode(`enemy_${id}`, scene);
    this.root.position.copyFrom(pos);
    this.root.position.y = 0;

    this.build();
  }

  build() {
    this.uniform = new BABYLON.StandardMaterial(`uniform_${this.id}`, scene);
    this.uniform.diffuseColor = new BABYLON.Color3(0.1, 0.11, 0.16);
    this.uniform.emissiveColor = new BABYLON.Color3(0.015, 0.02, 0.04);
    this.uniform.specularColor = new BABYLON.Color3(0.34, 0.34, 0.44);

    const visorMat = new BABYLON.StandardMaterial(`visor_${this.id}`, scene);
    visorMat.emissiveColor = new BABYLON.Color3(1, 0.08, 0.04);
    visorMat.diffuseColor = BABYLON.Color3.Black();

    const accentMat = new BABYLON.StandardMaterial(`accent_${this.id}`, scene);
    accentMat.emissiveColor = new BABYLON.Color3(1, 0.4, 0);
    accentMat.diffuseColor = new BABYLON.Color3(0.2, 0.08, 0);

    const gunMat = new BABYLON.StandardMaterial(`gun_${this.id}`, scene);
    gunMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.11);
    gunMat.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.02);

    const part = (name, kind, opts, pos, mat, parent = this.root) => {
      const builder = kind === 'sphere'
        ? BABYLON.MeshBuilder.CreateSphere
        : kind === 'cylinder'
          ? BABYLON.MeshBuilder.CreateCylinder
          : BABYLON.MeshBuilder.CreateBox;
      const mesh = builder(name, opts, scene);
      mesh.position.copyFrom(pos);
      mesh.parent = parent;
      mesh.material = mat;
      return mesh;
    };

    this.head = part(`head_${this.id}`, 'sphere', { diameterX: 0.28, diameterY: 0.33, diameterZ: 0.27, segments: 10 }, new BABYLON.Vector3(0, 1.75, 0), this.uniform);
    this.helmet = part(`helmet_${this.id}`, 'sphere', { diameterX: 0.34, diameterY: 0.22, diameterZ: 0.33, segments: 8 }, new BABYLON.Vector3(0, 1.88, 0), this.uniform);
    this.visor = part(`visor_${this.id}`, 'box', { width: 0.24, height: 0.07, depth: 0.29 }, new BABYLON.Vector3(0, 1.69, 0.01), visorMat);
    this.neck = part(`neck_${this.id}`, 'cylinder', { diameter: 0.12, height: 0.12, tessellation: 10 }, new BABYLON.Vector3(0, 1.52, 0), this.uniform);
    this.torso = part(`torso_${this.id}`, 'box', { width: 0.46, height: 0.56, depth: 0.24 }, new BABYLON.Vector3(0, 1.1, 0), this.uniform);
    this.chest = part(`chest_${this.id}`, 'box', { width: 0.24, height: 0.08, depth: 0.26 }, new BABYLON.Vector3(0, 1.2, 0.01), accentMat);
    this.belt = part(`belt_${this.id}`, 'box', { width: 0.48, height: 0.07, depth: 0.24 }, new BABYLON.Vector3(0, 0.81, 0), accentMat);

    this.leftShoulder = new BABYLON.TransformNode(`ls_${this.id}`, scene);
    this.leftShoulder.position.set(-0.34, 1.36, 0);
    this.leftShoulder.parent = this.root;
    this.leftArm = part(`la_${this.id}`, 'cylinder', { diameterTop: 0.13, diameterBottom: 0.11, height: 0.54, tessellation: 10 }, new BABYLON.Vector3(0, -0.27, 0), this.uniform, this.leftShoulder);
    this.leftShoulder.rotation.x = -0.24;

    this.rightShoulder = new BABYLON.TransformNode(`rs_${this.id}`, scene);
    this.rightShoulder.position.set(0.34, 1.36, 0);
    this.rightShoulder.parent = this.root;
    this.rightArm = part(`ra_${this.id}`, 'cylinder', { diameterTop: 0.13, diameterBottom: 0.11, height: 0.54, tessellation: 10 }, new BABYLON.Vector3(0, -0.27, 0), this.uniform, this.rightShoulder);
    this.rightShoulder.rotation.x = -0.46;
    this.gunBody = part(`gunBody_${this.id}`, 'box', { width: 0.08, height: 0.07, depth: 0.42 }, new BABYLON.Vector3(0.06, -0.46, 0.24), gunMat, this.rightShoulder);
    this.gunTip = BABYLON.MeshBuilder.CreateSphere(`gunTip_${this.id}`, { diameter: 0.035, segments: 6 }, scene);
    this.gunTip.position.set(0.06, -0.46, 0.56);
    this.gunTip.parent = this.rightShoulder;
    this.gunTip.material = accentMat;

    this.leftHip = new BABYLON.TransformNode(`lh_${this.id}`, scene);
    this.leftHip.position.set(-0.14, 0.82, 0);
    this.leftHip.parent = this.root;
    this.leftLeg = part(`ll_${this.id}`, 'cylinder', { diameterTop: 0.14, diameterBottom: 0.12, height: 0.62, tessellation: 10 }, new BABYLON.Vector3(0, -0.31, 0), this.uniform, this.leftHip);

    this.rightHip = new BABYLON.TransformNode(`rh_${this.id}`, scene);
    this.rightHip.position.set(0.14, 0.82, 0);
    this.rightHip.parent = this.root;
    this.rightLeg = part(`rl_${this.id}`, 'cylinder', { diameterTop: 0.14, diameterBottom: 0.12, height: 0.62, tessellation: 10 }, new BABYLON.Vector3(0, -0.31, 0), this.uniform, this.rightHip);

    this.leftBoot = part(`lb_${this.id}`, 'box', { width: 0.24, height: 0.1, depth: 0.3 }, new BABYLON.Vector3(-0.14, 0.2, 0.07), accentMat);
    this.rightBoot = part(`rb_${this.id}`, 'box', { width: 0.24, height: 0.1, depth: 0.3 }, new BABYLON.Vector3(0.14, 0.2, 0.07), accentMat);

    this.meshes = [
      this.head,
      this.helmet,
      this.torso,
      this.leftArm,
      this.rightArm,
      this.leftLeg,
      this.rightLeg,
      this.gunBody,
    ];
    this.meshes.forEach(mesh => mesh.isPickable = true);

    this.light = new BABYLON.PointLight(`enemyLight_${this.id}`, new BABYLON.Vector3(0, 1.5, 0), scene);
    this.light.parent = this.root;
    this.light.diffuse = new BABYLON.Color3(1, 0.24, 0.06);
    this.light.intensity = 0.55;
    this.light.range = 6.5;
    this.baseLightIntensity = 0.55;

    this.healthTrack = BABYLON.MeshBuilder.CreatePlane(`track_${this.id}`, { width: 1.2, height: 0.12 }, scene);
    this.healthTrack.position.y = 2.34;
    this.healthTrack.parent = this.root;
    this.healthTrack.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    this.healthTrack.material = makeEmissive(0.36, 0, 0, 1.2);

    this.healthFill = BABYLON.MeshBuilder.CreatePlane(`fill_${this.id}`, { width: 1.2, height: 0.12 }, scene);
    this.healthFill.position.set(0, 2.34, -0.01);
    this.healthFill.parent = this.root;
    this.healthFill.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    this.healthFill.material = makeEmissive(1, 0.16, 0.02, 1.35);
  }

  setHighlighted(active) {
    if (!this.alive) return;
    this.light.intensity = active ? this.baseLightIntensity * 2.6 : this.baseLightIntensity;
    this.visor.scaling = active ? new BABYLON.Vector3(1.08, 1.08, 1.08) : BABYLON.Vector3.One();
  }

  update(dt) {
    if (!this.alive) return;

    this.atkTimer -= dt;
    this.walkPhase += dt * 4.8;

    const toPlayer = camera.position.subtract(this.root.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist < CFG.enemyDetect) this.state = 'chase';

    const moving = this.state === 'chase';
    const swing = moving ? 0.56 : 0.08;
    this.leftHip.rotation.x = Math.sin(this.walkPhase * 6) * swing;
    this.rightHip.rotation.x = -Math.sin(this.walkPhase * 6) * swing;
    this.leftShoulder.rotation.x = -Math.sin(this.walkPhase * 6) * (moving ? 0.32 : 0.05) - 0.24;
    this.rightShoulder.rotation.x = -0.46 + Math.sin(this.walkPhase * 3) * 0.04;

    if (toPlayer.lengthSquared() > 0.001) {
      const face = toPlayer.normalize();
      this.root.rotation.y = Math.atan2(face.x, face.z);
    }

    this.root.position.y = moving ? Math.abs(Math.sin(this.walkPhase * 6)) * 0.03 : 0;

    if (this.state === 'patrol') this.doPatrol(dt);
    else this.doChase(dist);
  }

  doPatrol(dt) {
    this.patrolTimer -= dt;
    if (!this.patrolTarget || this.patrolTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 7 + Math.random() * 15;
      const limit = CFG.arenaSize / 2 - 10;
      this.patrolTarget = new BABYLON.Vector3(
        clamp(this.root.position.x + Math.cos(angle) * radius, -limit, limit),
        0,
        clamp(this.root.position.z + Math.sin(angle) * radius, -limit, limit)
      );
      this.patrolTimer = 2 + Math.random() * 3;
    }

    const delta = this.patrolTarget.subtract(this.root.position);
    delta.y = 0;
    if (delta.length() > 0.6) {
      delta.normalize();
      this.root.position.addInPlace(delta.scale(this.speed * 0.45));
    }
  }

  doChase(dist) {
    const toPlayer = camera.position.subtract(this.root.position);
    toPlayer.y = 0;
    if (toPlayer.lengthSquared() < 0.001) return;

    const dir = toPlayer.normalize();
    const playerForward = camera.getTarget().subtract(camera.position);
    playerForward.y = 0;
    if (playerForward.lengthSquared() > 0.001) playerForward.normalize();

    const enemyFromPlayer = this.root.position.subtract(camera.position);
    enemyFromPlayer.y = 0;
    if (enemyFromPlayer.lengthSquared() > 0.001) enemyFromPlayer.normalize();

    const flankSign = this.id % 2 === 0 ? 1 : -1;
    const orbit = new BABYLON.Vector3(-dir.z * flankSign, 0, dir.x * flankSign);
    const behindPlayer = BABYLON.Vector3.Dot(enemyFromPlayer, playerForward) < -0.18;

    let desired = dir.clone();
    if (dist < CFG.enemyComfortRadius) {
      desired = orbit.scale(0.9).add(dir.scale(-0.42));
    } else if (behindPlayer && dist < CFG.enemyOrbitRadius) {
      desired = orbit.scale(0.8).add(dir.scale(0.26));
    }

    desired.normalize();
    this.root.position.addInPlace(desired.scale(this.speed));
    this.clampToArena();

    if (dist < 5.1 && this.atkTimer <= 0) {
      this.atkTimer = CFG.enemyAttackMs / 1000;
      dealPlayerDamage(CFG.enemyDamage);
      this.muzzleFlash();
    }
  }

  clampToArena() {
    const limit = CFG.arenaSize / 2 - 6;
    this.root.position.x = clamp(this.root.position.x, -limit, limit);
    this.root.position.z = clamp(this.root.position.z, -limit, limit);
  }

  muzzleFlash() {
    const flash = new BABYLON.PointLight(`enemyFlash_${Date.now()}`, this.root.position.add(new BABYLON.Vector3(0, 1.3, 0.6)), scene);
    flash.diffuse = new BABYLON.Color3(1, 0.82, 0.34);
    flash.intensity = 10;
    flash.range = 8;
    setTimeout(() => flash.dispose(), 80);
  }

  hit(amount = CFG.playerDamage) {
    this.hp -= amount;
    this.uniform.emissiveColor.set(0.95, 0.45, 0.06);
    this.light.intensity = this.baseLightIntensity * 4.2;
    this.visor.scaling = new BABYLON.Vector3(1.18, 1.18, 1.18);
    this.torso.scaling = new BABYLON.Vector3(1.08, 1.04, 1.08);
    this.chest.scaling = new BABYLON.Vector3(1.1, 1.12, 1.1);
    setTimeout(() => {
      if (this.alive) {
        this.uniform.emissiveColor.set(0.015, 0.02, 0.04);
        this.light.intensity = this.baseLightIntensity;
        this.visor.scaling = BABYLON.Vector3.One();
        this.torso.scaling = BABYLON.Vector3.One();
        this.chest.scaling = BABYLON.Vector3.One();
      }
    }, 120);
    this.healthFill.scaling.x = Math.max(0, this.hp / CFG.enemyHealth);
    refreshTargetHUD();
    if (this.hp <= 0) this.die();
  }

  die() {
    this.alive = false;
    S.score += 100 + S.wave * 10;
    S.kills += 1;

    const pos = this.root.position.clone();
    pos.y += 1;
    spawnExplosion(pos);
    addKill();

    [
      this.head,
      this.helmet,
      this.visor,
      this.neck,
      this.torso,
      this.chest,
      this.belt,
      this.leftArm,
      this.rightArm,
      this.gunBody,
      this.gunTip,
      this.leftLeg,
      this.rightLeg,
      this.leftBoot,
      this.rightBoot,
      this.healthTrack,
      this.healthFill,
      this.leftShoulder,
      this.rightShoulder,
      this.leftHip,
      this.rightHip,
      this.light,
      this.root,
    ].forEach(item => item && item.dispose && item.dispose());

    S.enemies = S.enemies.filter(enemy => enemy !== this);
    if (selectedEnemy === this) selectedEnemy = null;
    if (aimAssistEnemy === this) aimAssistEnemy = null;
    refreshTargetHUD();
    updateHUD();
    checkWaveEnd();
  }
}

function spawnWave(waveNum) {
  S.wave = waveNum;
  const count = CFG.waveBase + (waveNum - 1) * CFG.waveInc;
  showAnnounce(`WAVE ${waveNum}`, `${count} HOSTILES IN ${S.arena.name.toUpperCase()}`);
  updateHUD();

  setTimeout(() => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        S.enemies.push(new Enemy(Date.now() + i, calcSpawnPos(i, count, waveNum)));
        updateHUD();
      }, i * 520);
    }
  }, 1800);
}

function calcSpawnPos(index, total, waveNum) {
  if (waveNum === 1 && index < 3) {
    const spread = [-34, 0, 34];
    const camForward = camera.getTarget().subtract(camera.position).normalize();
    const angle = Math.atan2(camForward.x, camForward.z) + spread[index] * (Math.PI / 180);
    const dist = 16 + index * 5;
    return new BABYLON.Vector3(
      camera.position.x + Math.sin(angle) * dist,
      0,
      camera.position.z + Math.cos(angle) * dist
    );
  }

  const forward = camera.getTarget().subtract(camera.position).normalize();
  const viewAngle = Math.atan2(forward.x, forward.z);
  const blindZone = Math.PI / 2.8;
  let angle = 0;

  for (let tries = 0; tries < 8; tries++) {
    angle = (index / total) * Math.PI * 2 + Math.random() * 0.9;
    const delta = Math.atan2(Math.sin(angle - viewAngle), Math.cos(angle - viewAngle));
    if (Math.abs(delta) < blindZone || Math.random() > 0.55) break;
  }

  const radius = 34 + Math.random() * 14;
  return new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

function checkWaveEnd() {
  if (S.enemies.length !== 0 || S.phase !== 'playing') {
    updateHUD();
    return;
  }

  S.score += 500 + S.wave * 100;
  showAnnounce(`WAVE ${S.wave} CLEAR`, `+${500 + S.wave * 100} BONUS`);
  setTimeout(() => spawnWave(S.wave + 1), CFG.wavePause);
  updateHUD();
}

function shoot() {
  if (!scene || !camera || !S.canShoot || S.reloading || S.ammo <= 0 || S.phase !== 'playing') return;

  S.ammo -= 1;
  S.canShoot = false;
  setTimeout(() => { S.canShoot = true; }, CFG.shootCooldownMs);
  updateHUD();

  fireFeedback();
  playShotSound();

  const pick = scene.pick(
    engine.getRenderWidth() * 0.5,
    engine.getRenderHeight() * 0.5,
    undefined,
    false,
    camera
  );
  const forward = camera.getTarget().subtract(camera.position).normalize();
  const tracerStart = gunTipMesh ? gunTipMesh.getAbsolutePosition().clone() : camera.position.add(forward.scale(0.5));
  const aimPoint = aimAssistEnemy
    ? aimAssistEnemy.root.position.add(new BABYLON.Vector3(0, 1.35, 0))
    : pick && pick.hit && pick.pickedPoint
    ? pick.pickedPoint.clone()
    : camera.position.add(forward.scale(90));
  weaponTargetPoint = aimPoint.clone();
  const shotDir = aimPoint.subtract(camera.position).normalize();
  if (aimAssistEnemy && aimAssistEnemy.alive) {
    aimAssistEnemy.hit();
    spawnTracer(tracerStart, aimPoint, true);
    spawnHitMarker(aimPoint, true);
    spawnImpact(aimPoint, true);
    showConfirmedHit();
    if (S.ammo === 0) reload();
    return;
  }

  const ray = new BABYLON.Ray(camera.position.clone(), shotDir, 90);
  const enemyMeshes = S.enemies.flatMap(enemy => enemy.meshes);
  const hit = scene.pickWithRay(ray, mesh => enemyMeshes.includes(mesh));

  if (hit.hit && hit.pickedMesh) {
    const enemy = S.enemies.find(item => item.meshes.includes(hit.pickedMesh));
    if (enemy) {
      enemy.hit();
      spawnTracer(tracerStart, hit.pickedPoint, true);
      spawnHitMarker(hit.pickedPoint, true);
      spawnImpact(hit.pickedPoint, true);
      showConfirmedHit();
    }
  } else {
    const worldHit = scene.pickWithRay(ray);
    if (worldHit.hit && worldHit.pickedPoint) {
      spawnTracer(tracerStart, worldHit.pickedPoint, false);
      spawnHitMarker(worldHit.pickedPoint, false);
      spawnImpact(worldHit.pickedPoint);
    } else {
      spawnTracer(tracerStart, tracerStart.add(forward.scale(36)), false);
    }
  }

  if (S.ammo === 0) reload();
}

function showConfirmedHit() {
  el.crosshair.classList.add('hit', 'confirmed');
  setTimeout(() => el.crosshair.classList.remove('hit', 'confirmed'), 130);
}

function reload() {
  if (S.reloading || S.ammo === CFG.ammoPerMag || S.phase !== 'playing') return;

  S.reloading = true;
  el.ammoVal.classList.add('reload');
  el.reloadWrap.style.display = 'block';
  const start = Date.now();
  const interval = setInterval(() => {
    el.reloadFill.style.width = `${Math.min(100, ((Date.now() - start) / CFG.reloadMs) * 100)}%`;
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

function dealPlayerDamage(amount) {
  if (S.phase !== 'playing') return;
  S.health = Math.max(0, S.health - amount);
  updateHUD();
  el.dmgFlash.style.background = 'rgba(255,0,0,0.38)';
  canvas.style.transform = 'translate(3px,-2px)';
  setTimeout(() => {
    el.dmgFlash.style.background = 'rgba(255,0,0,0)';
    canvas.style.transform = '';
  }, 170);
  if (S.health === 0) gameOver();
}

function spawnExplosion(pos) {
  const ps = new BABYLON.ParticleSystem(`explode_${Date.now()}`, 80, scene);
  ps.emitter = pos.clone();
  ps.particleTexture = new BABYLON.Texture('https://cdn.babylonjs.com/textures/flare.png', scene);
  ps.color1 = new BABYLON.Color4(1, 0.5, 0.1, 1);
  ps.color2 = new BABYLON.Color4(1, 0.9, 0.3, 1);
  ps.colorDead = new BABYLON.Color4(0.15, 0, 0, 0);
  ps.minSize = 0.16;
  ps.maxSize = 0.56;
  ps.minLifeTime = 0.3;
  ps.maxLifeTime = 0.82;
  ps.emitRate = 0;
  ps.manualEmitCount = 80;
  ps.minEmitPower = 6;
  ps.maxEmitPower = 14;
  ps.gravity = new BABYLON.Vector3(0, -8, 0);
  ps.start();

  const light = new BABYLON.PointLight(`explodeLight_${Date.now()}`, pos, scene);
  light.diffuse = new BABYLON.Color3(1, 0.5, 0);
  light.intensity = 30;
  light.range = 12;
  setTimeout(() => {
    light.dispose();
    ps.dispose();
  }, 1500);
}

function spawnImpact(pos, hitEnemy = false) {
  if (!pos) return;
  const ps = new BABYLON.ParticleSystem(`impact_${Date.now()}`, hitEnemy ? 24 : 16, scene);
  ps.emitter = pos.clone();
  ps.particleTexture = new BABYLON.Texture('https://cdn.babylonjs.com/textures/flare.png', scene);
  ps.color1 = hitEnemy ? new BABYLON.Color4(1, 0.35, 0.1, 1) : new BABYLON.Color4(0.3, 0.9, 1, 1);
  ps.color2 = hitEnemy ? new BABYLON.Color4(1, 0.9, 0.2, 1) : new BABYLON.Color4(1, 1, 1, 1);
  ps.colorDead = hitEnemy ? new BABYLON.Color4(0.25, 0.02, 0.02, 0) : new BABYLON.Color4(0, 0, 0.2, 0);
  ps.minSize = hitEnemy ? 0.08 : 0.04;
  ps.maxSize = hitEnemy ? 0.2 : 0.14;
  ps.minLifeTime = 0.08;
  ps.maxLifeTime = hitEnemy ? 0.34 : 0.25;
  ps.emitRate = 0;
  ps.manualEmitCount = hitEnemy ? 24 : 16;
  ps.minEmitPower = hitEnemy ? 4 : 3;
  ps.maxEmitPower = hitEnemy ? 8 : 6;
  ps.start();
  const flash = new BABYLON.PointLight(`impactLight_${Date.now()}`, pos.clone(), scene);
  flash.diffuse = hitEnemy ? new BABYLON.Color3(1, 0.45, 0.15) : new BABYLON.Color3(0.5, 0.9, 1);
  flash.intensity = hitEnemy ? 10 : 7;
  flash.range = hitEnemy ? 6 : 4;
  setTimeout(() => ps.dispose(), 600);
  setTimeout(() => flash.dispose(), 120);
}

function recenterView() {
  if (!camera) return;
  camera.rotation.x *= 0.15;
  weaponTargetPoint = null;
  el.crosshair.classList.remove('hit');
  if (!isMobile && scene && S.phase === 'playing' && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
  if (el.targetHint) {
    el.targetHint.textContent = selectedEnemy ? 'View reset. Press Space or click to finish the locked target.' : 'View reset. Sweep to lock the next hostile.';
    lastTargetHint = el.targetHint.textContent;
  }
}
window.recenterView = recenterView;

function bindGlobalInput() {
  if (inputBound) return;
  inputBound = true;

  window.addEventListener('keydown', event => {
    KEYS.add(event.code);
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();

    if (event.code === 'KeyR' && S.phase === 'playing') reload();
    if (event.code === 'Space' && S.phase === 'playing' && !keyboardFireTimer) {
      shoot();
      keyboardFireTimer = setInterval(shoot, 140);
    }
  }, { passive: false });

  window.addEventListener('keyup', event => {
    KEYS.delete(event.code);
    if (event.code === 'Space' && keyboardFireTimer) {
      clearInterval(keyboardFireTimer);
      keyboardFireTimer = null;
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (!scene || isMobile) return;
    el.lockOverlay.style.display = document.pointerLockElement === canvas ? 'none' : (S.phase === 'playing' ? 'flex' : 'none');
  });
}

function bindSceneInput() {
  scene.onPointerObservable.add(pointerInfo => {
    if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;
    if (pointerInfo.event.button !== 0) return;

    if (!isMobile && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    else shoot();
  });
}

function mobileKey(dir, down) {
  mobileMove[dir] = down ? 1 : 0;
}

function mobileFireStart() {
  shoot();
  autoFireTimer = setInterval(shoot, 160);
}

function mobileFireStop() {
  clearInterval(autoFireTimer);
  autoFireTimer = null;
}

function applyKeyMovement(dt) {
  const forwardPressed = KEYS.has('KeyW') || KEYS.has('ArrowUp');
  const backPressed = KEYS.has('KeyS') || KEYS.has('ArrowDown');
  const leftPressed = KEYS.has('KeyA') || KEYS.has('ArrowRight');
  const rightPressed = KEYS.has('KeyD') || KEYS.has('ArrowLeft');

  const forward = camera.getTarget().subtract(camera.position);
  forward.y = 0;
  if (forward.lengthSquared() > 0.001) forward.normalize();
  const right = BABYLON.Vector3.Cross(forward, BABYLON.Axis.Y).normalize();

  let target = BABYLON.Vector3.Zero();
  if (forwardPressed) target.addInPlace(forward);
  if (backPressed) target.addInPlace(forward.scale(-1));
  if (leftPressed) target.addInPlace(right.scale(-1));
  if (rightPressed) target.addInPlace(right);

  const moveSpeed = KEYS.has('ShiftLeft') || KEYS.has('ShiftRight') ? CFG.sprintSpeed : CFG.playerSpeed;
  if (target.lengthSquared() > 0.001) {
    target.normalize();
    target.scaleInPlace(moveSpeed);
  }

  const alpha = 1 - Math.pow(1 - CFG.moveSmoothing, Math.max(1, dt * 60));
  S.moveVelocity = BABYLON.Vector3.Lerp(S.moveVelocity, target, alpha);
  camera.position.addInPlace(S.moveVelocity);

  const limit = CFG.arenaSize / 2 - CFG.arenaPad;
  camera.position.x = clamp(camera.position.x, -limit, limit);
  camera.position.z = clamp(camera.position.z, -limit, limit);
}

function updateHUD() {
  el.healthFill.style.width = `${S.health}%`;
  el.healthFill.classList.toggle('low', S.health < 30);
  el.healthVal.textContent = `${S.health} HP`;
  el.ammoVal.textContent = S.reloading ? 'RELOAD' : S.ammo;
  el.scoreVal.textContent = S.score.toLocaleString();
  el.waveVal.textContent = `WAVE ${S.wave}`;
  el.enemiesVal.textContent = `${S.enemies.length} ENEMIES`;
}

function addKill() {
  const lines = ['SOLDIER DOWN', 'TARGET ELIMINATED', 'HOSTILE NEUTRALISED', 'KILL CONFIRMED', 'OPERATIVE OFFLINE'];
  const div = document.createElement('div');
  div.className = 'kill-entry';
  div.textContent = lines[(Math.random() * lines.length) | 0];
  el.killFeed.prepend(div);
  setTimeout(() => div.classList.add('fading'), 1800);
  setTimeout(() => div.remove(), 2800);
  while (el.killFeed.children.length > 4) el.killFeed.lastChild.remove();
}

function showAnnounce(title, sub) {
  el.announceTxt.innerHTML =
    `<div class="announce-text">${title}</div>` +
    `<div style="font-size:.82rem;letter-spacing:.24em;color:rgba(0,255,255,.5);margin-top:8px">${sub}</div>`;
  el.announce.classList.add('show');
  setTimeout(() => el.announce.classList.remove('show'), 2600);
}

function gameOver() {
  S.phase = 'dead';
  if (!isMobile) document.exitPointerLock();
  clearInterval(autoFireTimer);
  clearInterval(keyboardFireTimer);
  autoFireTimer = null;
  keyboardFireTimer = null;
  el.goScore.textContent = S.score.toLocaleString();
  el.goWave.textContent = S.wave;
  el.goKills.textContent = S.kills;
  el.gameover.style.display = 'flex';
  el.hud.style.display = 'none';
  el.lockOverlay.style.display = 'none';
}

function gameLoop(dt) {
  S.totalTime += dt;
  applyKeyMovement(dt);
  updateAimAssist();

  if (isMobile && (mobileMove.f || mobileMove.b || mobileMove.l || mobileMove.r)) {
    const forward = camera.getTarget().subtract(camera.position);
    forward.y = 0;
    if (forward.lengthSquared() > 0.001) forward.normalize();
    const right = BABYLON.Vector3.Cross(forward, BABYLON.Axis.Y).normalize();
    const speed = CFG.playerSpeed * 0.85;
    if (mobileMove.f) camera.position.addInPlace(forward.scale(speed));
    if (mobileMove.b) camera.position.addInPlace(forward.scale(-speed));
    if (mobileMove.l) camera.position.addInPlace(right.scale(-speed));
    if (mobileMove.r) camera.position.addInPlace(right.scale(speed));
  }

  updateWeapon(dt);
  S.enemies.forEach(enemy => enemy.update(dt));
  S.lights.forEach(({ light, base, phase }) => {
    light.intensity = base * (0.86 + 0.14 * Math.sin(S.totalTime * 1.45 + phase));
  });
}

function createBox(name, width, height, depth, x, y, z, material) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  if (material) mesh.material = material;
  return mesh;
}

function makeGridMaterial() {
  try {
    const mat = new BABYLON.GridMaterial('grid', scene);
    mat.mainColor = new BABYLON.Color3(0.008, 0.012, 0.03);
    mat.lineColor = new BABYLON.Color3(0, 0.38, 0.78);
    mat.gridRatio = 2.2;
    mat.majorUnitFrequency = 5;
    mat.minorUnitVisibility = 0.25;
    return mat;
  } catch {
    return makeMaterial(0.01, 0.015, 0.035, 0, 0.02, 0.04);
  }
}

function makeMaterial(dr, dg, db, er, eg, eb) {
  const mat = new BABYLON.StandardMaterial(`mat_${Math.random()}`, scene);
  mat.diffuseColor = new BABYLON.Color3(dr, dg, db);
  mat.emissiveColor = new BABYLON.Color3(er, eg, eb);
  return mat;
}

function makeEmissive(er, eg, eb, scale = 1) {
  const mat = new BABYLON.StandardMaterial(`emissive_${Math.random()}`, scene);
  mat.emissiveColor = new BABYLON.Color3(er * scale, eg * scale, eb * scale);
  mat.diffuseColor = BABYLON.Color3.Black();
  mat.backFaceCulling = false;
  return mat;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


