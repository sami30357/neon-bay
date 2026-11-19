// v8: Solmara Bay — real waterfront, crew abilities, Job 11, bright-noon
// opening, named PD units with roles, district labels, re-authored in this
// session under recording 01a1f524 (2026-11-20).
// v8: including the auto-offer guard fix: the 3.5s post-job timer only offers
// the next job when no job is running, and _offerMission itself bails while
// one is active — otherwise the timer re-offered Job 11 mid-mission and
// dropped the player into the offer dialog for a job already accepted.
// v7: Sun-Kissed Bay — flyable SKYHAWK helicopter, street races, carjacking
// animation, brighter day look, longer Vex quotes, under recording 01a1f27b.
// v6: Golden Hour Kings — game opens at golden hour (17:30), garage upgrades,
// weapon wheel (pistol/SMG/shotgun), AMMO-NATION shop + Garage 9 safehouse,
// Jobs 9-10, roadblock staging in shots, under recording 01a1f269.
// v5: Golden Hour — game clock (1 game-hour per 75 real seconds, ?tod= override),
// Sunrise GT + Job 8 car, 8 jobs, under recording 01a1f255.
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Neon Bay — the game itself: boot, loop, driving and on-foot play, car stealing,
// combat, wanted heat, missions, saves, and deterministic screenshot staging.
// v2: neon-orb side activity, police helicopter with rotor audio, screen shake and
// crash smoke, a car horn, mission intro cards, seven story jobs, and busier
// screenshot staging (more traffic, pedestrians and orbs in frame).
import * as THREE from 'three';
import { City, CITY_EXTENT, WATER_START } from './city.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { HUD } from './hud.js';
import { Player } from './player.js';
import { TrafficSystem } from './traffic.js';
import { PoliceSystem } from './police.js';
import { Missions } from './missions.js';
import { OrbSystem, ORB_VALUE, ORB_COUNT } from './orbs.js';
import { createCarMesh, CarDriver, makeRngCar } from './cars.js';
import { createPlayerHeliMesh, HeliDriver } from './heli.js';
import { RaceSystem, RACES, RACE_FLAG, fmtRaceTime } from './races.js';
import { makeRng } from './random.js';
import { readShotParam, SHOT_STAGING } from './shots.js';

const SAVE_KEY = 'neonbay-save-v1';
const VOLT_SPOT = { x: 168, z: -120 };
const SUNRISE_SPOT = { x: 168, z: 168 }; // v5: the marina, home of the Sunrise GT
// v6: Garage 9 doubles as the safehouse (save + heal); AMMO-NATION on Volt Row
// sells health and ammo. Both are real spots with signs in the city.
const GARAGE_SPOT = { x: -72, z: 168 };
const SHOP_SPOT = { x: 120, z: 72 };
// v6: garage upgrades — 3 levels each, cash cost per level. Engine raises top
// speed + accel, armor cuts damage taken, handling sharpens steering.
const UPGRADE_DEFS = [
  { key: 'engine', name: 'ENGINE', costs: [400, 800, 1400] },
  { key: 'armor', name: 'ARMOR', costs: [400, 800, 1400] },
  { key: 'handling', name: 'HANDLING', costs: [400, 800, 1400] },
];
// v6: weapon wheel — pistol is infinite, SMG and shotgun eat bought ammo
const WEAPONS = {
  pistol: { name: 'PISTOL', cooldown: 0.32, damage: 1, spread: 1.1, ammo: null },
  smg: { name: 'SMG', cooldown: 0.09, damage: 1, spread: 1.1, ammo: 'smg' },
  shotgun: { name: 'SHOTGUN', cooldown: 0.7, damage: 3, spread: 2.4, ammo: 'shells' },
};
// WAVE 88.1 — Neon Bay's own radio: fictional stations and songs, rotated in-game
const RADIO_SONGS = [
  'Neon Drive — Midnight Mirage',
  'Velvet Static — Chrome Hearts',
  'Lumen Park — Rain City',
  'Cassette Sun — Afterglow',
  'The Glass Owls — Ultraviolet',
];
const PARKED_SPOTS = [
  { x: -24, z: 66 }, { x: 72, z: -168 }, { x: -120, z: -24 }, { x: 120, z: 168 },
  { x: -168, z: 72 }, { x: 24, z: -120 }, { x: 168, z: 24 }, { x: -72, z: -168 },
  { x: 120, z: -72 }, { x: -24, z: 120 }, { x: 72, z: 120 }, { x: -120, z: 120 },
];

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(0, 30, 60);
    // camera fill light: a soft cool light that rides with the camera so the car
    // and the near street always read, even far from any streetlight — strong
    // enough to lift the dark road in the on-foot shots too
    this.fillLight = new THREE.PointLight(0x7fb4ff, 320, 30, 1.8);
    this.fillLight.position.set(0, 7, -3);
    this.camera.add(this.fillLight);
    this.scene.add(this.camera);
    this.clock = new THREE.Clock();
    this.input = new Input(this.canvas);
    this.audio = new AudioEngine();
    this.hud = new HUD();
    this.city = new City(this.scene);
    this.traffic = new TrafficSystem(this.scene, this.city);
    this.police = new PoliceSystem(this.scene, this.city);
    this.player = new Player(this.scene);
    this.missions = new Missions(this.scene);
    this.orbs = new OrbSystem(this.scene, this.city);
    this.rng = makeRng(31337);

    this.state = 'menu'; // menu | playing | dialog | paused | ended
    this.inCar = false;
    this.playerCar = null; // CarDriver
    this.playerCarMesh = null;
    // v7: the SKYHAWK helicopter — parked on the ground helipad by the marina,
    // always there on load (no save needed for it)
    this.inHeli = false;
    this.playerHeli = null; // HeliDriver
    this.playerHeliMesh = null;
    // v7: street races at the pier flag
    this.races = new RaceSystem(this.scene);
    this.parkedCars = []; // {mesh, owned, volt}
    this.enemies = [];
    this.cash = 0;
    this.dialogQueue = [];
    this.dialogTimer = 0;
    this.headlight = null;
    this.tracer = null;
    this.tracerTimer = 0;
    this.muzzleLight = null;
    this.shot = readShotParam();
    this.shotMode = null;
    this.time = 0;
    // v8: the game opens at BRIGHT NOON, 12:00 — sun-soaked first impression,
    // and runs 1 game-hour per 75 real seconds. ?tod=<hours> pins the time
    // (and freezes it) so screenshots are deterministic.
    this.timeOfDay = 12;
    this.clockFrozen = false;
    const todParam = new URLSearchParams(window.location.search).get('tod');
    if (todParam !== null) {
      const t = Number(todParam);
      if (Number.isFinite(t) && t >= 0 && t < 24) { this.timeOfDay = t; this.clockFrozen = true; }
    }
    this.city.setTimeOfDay(this.timeOfDay);
    this.hud.setClock(this.timeOfDay);
    this.lastShotCrime = -10;
    this.camPos = new THREE.Vector3(0, 30, 60);
    this.camLook = new THREE.Vector3(0, 1.5, 0);
    this.saveData = this._loadSave();
    this.shake = 0;
    this.smoke = [];
    this._smokeTex = this._smokeTexture();
    this.radioIndex = 0;
    this.radioTimer = 0;
    this.policeListTimer = 0;
    // v6: garage upgrades, weapon wheel + ammo, proximity hints
    this.upgrades = { engine: 0, armor: 0, handling: 0 };
    this.weapon = 'pistol';
    this.ammo = { smg: 0, shells: 0 };
    this._hintedGarage = false;
    this._hintedShop = false;
    // v7: carjacking — a 0.7s pull-the-driver-out beat before the car is yours
    this.jackTimer = 0;
    this.jackPendingCar = null;
    this.jackPed = null; // {mesh, timer, dirX, dirZ}
    // v8: crew cooldowns (seconds left) — Mira's plates, Zio's fix, Kiki's eyes
    this.crewCd = { plates: 0, fix: 0, eyes: 0 };
    this.eyesOutUntil = 0; // v8: while the clock is past this, the PD list shows all units

    this._buildParkedCars();
    this._buildVoltGT();
    this._buildSunriseGT(); // v5: Job 8's car, parked at the marina
    this._buildGarageAndShop(); // v6: Garage 9 + AMMO-NATION signs and rings
    this._buildPlayerHeli(); // v7: the SKYHAWK on its ground helipad
    this._buildRaceFlag(); // v7: STREET RACES sign at the pier flag
    this._buildTracer();
    this._wireUI();
    this.input.onKey = (code) => this._onKey(code);
    this.input.onMouseDown = () => this._onShoot();
    window.addEventListener('resize', () => this._onResize());
    window.__neonbay = { game: this, ready: false, state: () => this.state };

    if (this.shot) this._stageShot(this.shot);
    this._updateStartButtons();
    this.renderer.setAnimationLoop(() => this._frame());
  }

  // ---------- setup ----------
  _buildParkedCars() {
    for (const spot of PARKED_SPOTS) {
      const mesh = makeRngCar(this.rng);
      mesh.position.set(spot.x, 0, spot.z);
      // parked cars face along the street grid, never diagonally into a wall,
      // so a stolen car can always drive away from the curb
      mesh.rotation.y = this.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      this.scene.add(mesh);
      this.parkedCars.push({ mesh, owned: false, volt: false });
    }
  }

  _buildVoltGT() {
    const mesh = createCarMesh({ color: 0xff2d78, underglow: 0xff2d78, sport: true });
    mesh.position.set(VOLT_SPOT.x, 0, VOLT_SPOT.z);
    mesh.rotation.y = Math.PI * 0.4;
    this.scene.add(mesh);
    this.voltGT = { mesh, owned: false, volt: true };
    this.parkedCars.push(this.voltGT);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3, 3.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(VOLT_SPOT.x, 0.06, VOLT_SPOT.z);
    ring.visible = false;
    this.scene.add(ring);
    this.voltRing = ring;
  }

  // v5: the Sunrise GT — gold on gold, parked at the marina for Job 8
  _buildSunriseGT() {
    const mesh = createCarMesh({ color: 0xffd75e, underglow: 0xffae00, sport: true });
    mesh.position.set(SUNRISE_SPOT.x, 0, SUNRISE_SPOT.z);
    mesh.rotation.y = -Math.PI * 0.4;
    this.scene.add(mesh);
    this.sunriseGT = { mesh, owned: false, volt: false, sunrise: true };
    this.parkedCars.push(this.sunriseGT);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3, 3.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(SUNRISE_SPOT.x, 0.06, SUNRISE_SPOT.z);
    ring.visible = false;
    this.scene.add(ring);
    this.sunriseRing = ring;
  }

  // v6: Garage 9 (upgrades + safehouse) and AMMO-NATION (shop) — a glowing
  // ground ring plus a lit sign board so both spots read from the street
  _buildGarageAndShop() {
    const ring = (x, z, color) => {
      const r = new THREE.Mesh(
        new THREE.RingGeometry(3, 3.8, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
      );
      r.rotation.x = -Math.PI / 2;
      r.position.set(x, 0.06, z);
      this.scene.add(r);
      return r;
    };
    ring(GARAGE_SPOT.x, GARAGE_SPOT.z, 0xffd75e);
    ring(SHOP_SPOT.x, SHOP_SPOT.z, 0x00e5ff);
    this._makeSign('GARAGE 9', 'SAFEHOUSE · G UPGRADES', 0xffd75e, GARAGE_SPOT.x, GARAGE_SPOT.z);
    this._makeSign('AMMO-NATION', 'HEALTH · AMMO — PRESS E', 0x00e5ff, SHOP_SPOT.x, SHOP_SPOT.z);
  }

  // v7: the SKYHAWK — gold/white player helicopter, parked on the ground
  // helipad the city built near the marina. Always parked there on load.
  _buildPlayerHeli() {
    this.playerHeliMesh = createPlayerHeliMesh();
    this.scene.add(this.playerHeliMesh);
    this.playerHeli = new HeliDriver(this.playerHeliMesh, this.city.helipad);
  }

  // v7: the STREET RACES board at the checkered flag on the pier
  _buildRaceFlag() {
    this._makeSign('STREET RACES', 'PRESS E — 3 RACES', 0x39ff88, RACE_FLAG.x, RACE_FLAG.z);
  }

  _enterHeli() {
    this.inHeli = true;
    this.player.group.visible = false;
    this.hud.setCrosshair(false);
    this.audio.updateRotor(true);
    this.hud.feed('SKYHAWK in the air — W/S thrust, A/D yaw, SPACE climb, SHIFT descend.');
  }

  _exitHeli() {
    if (!this.inHeli) return;
    const p = this.playerHeliMesh.position;
    this.player.group.position.set(p.x + 3, 0, p.z + 3);
    this.player.group.visible = true;
    this.player.yaw = this.playerHeli.heading;
    this.player.camYaw = this.playerHeli.heading;
    this.playerHeli.speed = 0;
    this.playerHeli.vy = 0;
    this.inHeli = false;
    this.audio.updateRotor(this.police.heliActive);
    this.hud.feed('On foot. The SKYHAWK waits where you left it.');
  }

  // a lit sign board on two posts: canvas texture, double-sided
  _makeSign(line1, line2, color, x, z) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#05060f'; g.fillRect(0, 0, 512, 160);
    g.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    g.lineWidth = 6; g.strokeRect(6, 6, 500, 148);
    g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    g.font = '900 56px Arial'; g.textAlign = 'center';
    g.fillText(line1, 256, 72);
    g.fillStyle = '#eaf6ff';
    g.font = '700 30px Arial';
    g.fillText(line2, 256, 122);
    const tex = new THREE.CanvasTexture(c);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.8),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true }),
    );
    board.position.set(x, 4.6, z);
    this.scene.add(board);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x222633, roughness: 0.8 });
    for (const dx of [-3.6, 3.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.6, 0.35), postMat);
      post.position.set(x + dx, 2.3, z);
      this.scene.add(post);
    }
  }

  _buildTracer() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 }));
    this.tracer.visible = false;
    this.tracer.frustumCulled = false;
    this.scene.add(this.tracer);
    this.muzzleLight = new THREE.PointLight(0xffe9a0, 0, 18, 2);
    this.scene.add(this.muzzleLight);
  }

  _smokeTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(160,160,170,0.8)');
    grad.addColorStop(1, 'rgba(160,160,170,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  _spawnSmoke(pos, count = 6) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({ map: this._smokeTex, transparent: true, opacity: 0.45, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(pos.x + this.rng.range(-1, 1), 1 + this.rng.range(0, 1), pos.z + this.rng.range(-1, 1));
      sprite.scale.setScalar(2 + this.rng.next() * 2);
      this.scene.add(sprite);
      this.smoke.push({
        sprite,
        vel: new THREE.Vector3(this.rng.range(-0.8, 0.8), this.rng.range(1.2, 2.4), this.rng.range(-0.8, 0.8)),
        life: 1.1, maxLife: 1.1,
      });
    }
  }

  _updateSmoke(dt) {
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.sprite);
        s.sprite.material.dispose();
        this.smoke.splice(i, 1);
        continue;
      }
      s.sprite.position.addScaledVector(s.vel, dt);
      s.sprite.scale.addScalar(dt * 3);
      s.sprite.material.opacity = 0.45 * (s.life / s.maxLife);
    }
  }

  _wireUI() {
    document.getElementById('startBtn').addEventListener('click', () => this._startGame(false));
    document.getElementById('continueBtn').addEventListener('click', () => this._startGame(true));
    document.getElementById('resumeBtn').addEventListener('click', () => this._resume());
    document.getElementById('saveBtn').addEventListener('click', () => { this._save(); this.hud.feed('Game saved.'); });
    document.getElementById('restartBtn').addEventListener('click', () => this._restartNight());
    document.getElementById('endBtn').addEventListener('click', () => this._respawn());
    // v6: garage + shop panels
    document.getElementById('garageEngine').addEventListener('click', () => this.buyUpgrade('engine'));
    document.getElementById('garageArmor').addEventListener('click', () => this.buyUpgrade('armor'));
    document.getElementById('garageHandling').addEventListener('click', () => this.buyUpgrade('handling'));
    document.getElementById('garageClose').addEventListener('click', () => this.hud.hideGarage());
    document.getElementById('shopHealth').addEventListener('click', () => this.buyShop('health'));
    document.getElementById('shopSmg').addEventListener('click', () => this.buyShop('smg'));
    document.getElementById('shopShells').addEventListener('click', () => this.buyShop('shells'));
    document.getElementById('shopClose').addEventListener('click', () => this.hud.hideShop());
  }

  _updateStartButtons() {
    const btn = document.getElementById('continueBtn');
    btn.style.display = this.saveData ? 'inline-block' : 'none';
  }

  _updateJobProgress() {
    const el = document.getElementById('jobProgress');
    if (el) el.textContent = `Jobs done: ${this.missions.completed} / 11`;
  }

  // respect: 70% from jobs done, 30% from orbs collected
  _respect() {
    return Math.round((this.missions.completed / 11) * 70 + (this.orbs.collected / ORB_COUNT) * 30);
  }

  _updateRespect() {
    this.hud.setRespect(this._respect());
  }

  // mission panel text: stage x/y and the NEXT step (or the payout)
  _missionPanel() {
    const active = this.missions.active;
    if (!active) return { stage: '', next: '' };
    const def = active.def;
    const step = this.missions.currentStep();
    const stage = `STAGE ${active.stepIndex + 1}/${def.steps.length} · $${def.reward}`;
    let next = '';
    if (active.stepIndex + 1 < def.steps.length) {
      next = `NEXT: ${def.steps[active.stepIndex + 1].text}`;
    } else {
      next = `NEXT: Finish the job — $${def.reward} payout`;
    }
    return { stage, next };
  }

  // Vex's intro line, shortened for the mission card (her "Vex: " prefix is
  // already on the card as VEX MARLOWE) — v7: cap raised to 200 chars so her
  // longer lines wrap instead of cutting off mid-sentence
  _vexQuote(intro) {
    const q = (intro || '').replace(/^Vex: /, '');
    return q.length > 200 ? `${q.slice(0, 200).trimEnd()}…` : q;
  }

  _refreshMissionPanel() {
    // v7: a live race owns the mission panel while it runs — the race clock
    // and next checkpoint are what the player needs to see
    if (this.races.active) {
      const a = this.races.active;
      this.hud.setMission(
        `RACE ${a.index + 1}/3 — ${a.def.name}`,
        `CHECKPOINT ${a.checkpointIndex + 1}/${a.def.checkpoints.length} · TIME ${fmtRaceTime(a.timer)} / PAR ${fmtRaceTime(a.def.par)}`,
        `RACES WON: ${this.races.racesDone.length}/3`,
        a.checkpointIndex + 1 < a.def.checkpoints.length ? 'NEXT: drive through the green ring' : 'NEXT: finish the race!',
      );
      return;
    }
    if (!this.missions.active) return;
    const step = this.missions.currentStep();
    const { stage, next } = this._missionPanel();
    this.hud.setMission(`JOB ${this.missions.active.def.id}: ${this.missions.active.def.title}`, step ? step.text : '', stage, next);
  }

  // Bay PD response list: helicopter first, then the roadblock (the two
  // things the player most needs to see), then the nearest units — each with
  // a callsign, a role chip and a distance, like the top entries' panels.
  // While Kiki's EYES OUT is live, every unit shows, not just the nearest five.
  _refreshPoliceList() {
    const pp = this.inHeli ? this.playerHeliMesh.position : this.inCar ? this.playerCarMesh.position : this.player.position;
    const units = [];
    this.police.cars.forEach((car) => {
      const d = Math.round(Math.hypot(car.mesh.position.x - pp.x, car.mesh.position.z - pp.z));
      units.push({ name: car.callsign || 'NBPD UNIT', dist: `${d}m`, d });
    });
    units.sort((a, b) => a.d - b.d);
    // roles: the nearest car rams, the next flanks, the rest pursue or close in
    units.forEach((u, i) => {
      if (i === 0) u.role = this.police.wanted >= 3 ? 'RAMMING' : 'PURSUIT';
      else if (i === 1) u.role = 'FLANKING';
      else u.role = u.d < 30 ? 'CLOSING IN' : 'PURSUIT';
    });
    const head = [];
    if (this.police.heli) head.push({ name: 'AIR-1', role: 'SPOTLIGHT', dist: 'overhead', d: 0 });
    // v6: a roadblock up ahead reads as its own response unit
    if (this.police.roadblock.length > 0) {
      const rb = this.police.roadblock[0].mesh.position;
      const d = Math.round(Math.hypot(rb.x - pp.x, rb.z - pp.z));
      head.push({ name: 'ROADBLOCK', role: 'ROADBLOCK', dist: `${d}m ahead`, d });
    }
    const total = units.length + (this.police.heli ? 1 : 0) + (this.police.roadblock.length > 0 ? 1 : 0);
    const stars = '★'.repeat(this.police.wanted) + '☆'.repeat(5 - this.police.wanted);
    const near = units.length > 0 && units[0].d < 60;
    const header = `BAY PD RESPONSE · ${total} UNITS · ${stars}${this.time < this.eyesOutUntil ? ' · EYES OUT' : near ? ' · IN SIGHT' : ' · SEARCHING'}`;
    const shown = this.time < this.eyesOutUntil ? [...head, ...units] : [...head, ...units].slice(0, 5);
    this.hud.setPoliceList(shown, header);
  }

  // v8: district names for the minimap label — where you are in the city
  _districtFor(x, z) {
    if (z >= 224) return 'SOLMARA STRAND';
    if (z >= 150) return x < -100 ? 'PIER 7' : 'MARINA';
    if (x >= 100) return 'VOLT ROW';
    if (x <= -100) return 'NEON ROW';
    return 'MERIDIAN CROSSING';
  }

  _districtStanding() {
    const r = this._respect();
    const rank = r < 25 ? 'NEUTRAL' : r < 50 ? 'KNOWN' : r < 75 ? 'RESPECTED' : 'SHOT CALLER';
    return `${rank} · ${r}%`;
  }

  // v8: crew abilities — Z Mira swaps the plates (lose a star), X Zio patches
  // you up (+50 HP), C Kiki spots every unit for 10 seconds. 60/60/45s cooldowns.
  _useCrew(kind) {
    if (this.state !== 'playing') return;
    if (kind === 'plates') {
      if (this.crewCd.plates > 0) { this.hud.feed(`Mira: plates cooling down — ${Math.ceil(this.crewCd.plates)}s.`); return; }
      if (this.police.wanted <= 0) { this.hud.feed('Mira: no heat to lose right now.'); return; }
      if (this.police.dropStar()) {
        this.crewCd.plates = 60;
        this.hud.setWanted(this.police.wanted);
        this._refreshPoliceList();
        this.hud.feed('Mira swapped the plates — heat down a star.');
      }
      return;
    }
    if (kind === 'fix') {
      if (this.crewCd.fix > 0) { this.hud.feed(`Zio: wrench cooling down — ${Math.ceil(this.crewCd.fix)}s.`); return; }
      if (this.player.health >= 100) { this.hud.feed('Zio: you are already patched up.'); return; }
      this.player.heal(50);
      this.crewCd.fix = 60;
      this.hud.setHealth(this.player.health);
      this.hud.feed('Zio patched you up (+50 HP).');
      return;
    }
    if (kind === 'eyes') {
      if (this.crewCd.eyes > 0) { this.hud.feed(`Kiki: still scanning — ${Math.ceil(this.crewCd.eyes)}s.`); return; }
      this.crewCd.eyes = 45;
      this.eyesOutUntil = this.time + 10;
      this._refreshPoliceList();
      const pp = this.inHeli ? this.playerHeliMesh.position : this.inCar ? this.playerCarMesh.position : this.player.position;
      let nearest = null, nd = Infinity;
      for (const car of this.police.cars) {
        const d = Math.hypot(car.mesh.position.x - pp.x, car.mesh.position.z - pp.z);
        if (d < nd) { nd = d; nearest = car; }
      }
      this.hud.feed(nearest
        ? `Kiki: nearest unit ${nearest.callsign || 'NBPD'}, ${Math.round(nd)}m — ${this.police.cars.length} cars on you.`
        : 'Kiki: all clear — no units on you right now.');
    }
  }

  // ---------- save / load ----------
  _loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  _save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: this.cash,
        completed: this.missions.completed,
        health: this.player.health,
        orbs: this.orbs.collected,
        pos: { x: this.player.position.x, z: this.player.position.z },
        // v6: garage upgrades, weapon + ammo persist with the save
        upgrades: this.upgrades,
        weapon: this.weapon,
        ammo: this.ammo,
        // v7: street-race progress persists with the save
        races: this.races.serialize(),
      }));
    } catch { /* storage unavailable */ }
  }

  _startGame(continueSave) {
    this.audio.start();
    this.audio.click();
    document.getElementById('startScreen').style.display = 'none';
    this.hud.show();
    this.state = 'playing';
    this.input.lockPointer();
    if (continueSave && this.saveData) {
      this.cash = this.saveData.cash || 0;
      this.missions.completed = this.saveData.completed || 0;
      this.player.health = this.saveData.health || 100;
      this.orbs.setCollected(this.saveData.orbs || 0);
      // v6: restore upgrades, weapon and ammo from the save
      if (this.saveData.upgrades) this.upgrades = { ...this.upgrades, ...this.saveData.upgrades };
      if (this.saveData.weapon && WEAPONS[this.saveData.weapon]) this.weapon = this.saveData.weapon;
      if (this.saveData.ammo) this.ammo = { ...this.ammo, ...this.saveData.ammo };
      // v7: restore street-race progress from the save
      if (this.saveData.races) this.races.restore(this.saveData.races);
      this._refreshWeaponHud();
      this.player.reset(this.saveData.pos?.x ?? 0, this.saveData.pos?.z ?? 24);
      this.hud.feed('Save loaded. Welcome back to Neon Bay.');
    } else {
      this.cash = 0;
      this.player.reset(0, 24);
    }
    this.hud.setCash(this.cash);
    this.hud.setHealth(this.player.health);
    this.hud.setOrbs(this.orbs.collected, ORB_COUNT);
    this.hud.setRadio(RADIO_SONGS[this.radioIndex]);
    this.hud.setClock(this.timeOfDay);
    this._updateRespect();
    this._updateJobProgress();
    this._offerMission();
  }

  _restartNight() {
    this.cash = 0;
    this.missions.completed = 0;
    this.missions.active = null;
    this.orbs.reset();
    // v6: a fresh night resets upgrades, weapon and ammo too
    this.upgrades = { engine: 0, armor: 0, handling: 0 };
    this.weapon = 'pistol';
    this.ammo = { smg: 0, shells: 0 };
    // v7: a fresh night resets the street races too
    this.races.reset();
    this.playerHeli.park();
    this._refreshWeaponHud();
    this.player.reset(0, 24);
    this.police.clearWanted();
    this._exitCar(false);
    if (this.inHeli) this._exitHeli(); // v7: step out of the SKYHAWK too
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    this.state = 'menu';
    this.hud.hide();
    this._updateStartButtons();
  }

  _respawn() {
    document.getElementById('endScreen').style.display = 'none';
    const station = this.state === 'ended-busted' ? { x: -168, z: 168 } : { x: 168, z: 168 };
    this._exitCar(false);
    if (this.inHeli) this._exitHeli(); // v7: step out of the SKYHAWK too
    this.player.reset(station.x, station.z);
    this.police.clearWanted();
    this.state = 'playing';
    this.hud.show();
    this.hud.setHealth(this.player.health);
    this.hud.feed('You are back on the streets. Stay sharp.');
  }

  // ---------- missions ----------
  _offerMission() {
    // v8: never offer while a job is already running — the auto-offer timer
    // and a manual Enter can otherwise stack two offers for the same job
    if (this.missions.active) return;
    if (this.missions.done) {
      this._say('VEX', 'You did it, Rook. Eleven jobs, one legend. Neon Bay is yours now — free roam, keep the cash coming.');
      return;
    }
    const def = this.missions.currentDef;
    if (!def) return;
    this._say('VEX', def.intro, () => {
      const started = this.missions.startNext();
      if (started) {
        this._refreshMissionPanel();
        this.hud.setJob(`JOB ${started.id}`);
        this.hud.feed(`New job: ${started.title} — $${started.reward}`);
        this.hud.showMissionCard(`JOB ${started.id}`, `${started.title} — $${started.reward}`, 3200, this._vexQuote(started.intro));
        if (started.id === 4) this.police.addCrime(2);
        if (started.id === 7) this.police.addCrime(4); // five-star heat from the start
        if (started.id === 9) this.police.addCrime(4); // v6: HIGH TIDE runs under 4 stars
        if (started.id === 10) this.police.addCrime(5); // v6: the finale runs under 5 stars
        this._maybeSpawnFight();
        this._updateVoltRing();
      }
    });
  }

  // ---------- v6: garage upgrades, shop, safehouse, weapon wheel ----------
  // armor cuts every hit: 15% less damage per armor level (min 1 damage)
  _damagePlayer(amount) {
    const scaled = Math.max(1, Math.round(amount * (1 - 0.15 * this.upgrades.armor)));
    return this.player.damage(scaled);
  }

  buyUpgrade(key) {
    const def = UPGRADE_DEFS.find((d) => d.key === key);
    if (!def) return;
    const level = this.upgrades[key];
    if (level >= 3) { this.hud.feed(`${def.name} is already maxed out (LV 3).`); return; }
    const cost = def.costs[level];
    if (this.cash < cost) {
      this.hud.feed(`Not enough cash for ${def.name} LV ${level + 1} — need $${cost}, you have $${this.cash}.`);
      return;
    }
    this.cash -= cost;
    this.upgrades[key] = level + 1;
    this.hud.setCash(this.cash);
    this._applyUpgradesToCar();
    this.hud.setGarage(this.upgrades);
    this.audio.cash();
    this.hud.feed(`${def.name} upgraded to LV ${level + 1} for $${cost}.`);
    this._save();
  }

  _applyUpgradesToCar() {
    if (this.playerCar) this.playerCar.applyUpgrades(this.upgrades.engine, this.upgrades.handling);
  }

  buyShop(item) {
    if (item === 'health') {
      if (this.cash < 100) { this.hud.feed('Not enough cash for a medkit — need $100.'); return; }
      if (this.player.health >= 100) { this.hud.feed('Health is already full.'); return; }
      this.cash -= 100;
      this.player.heal(100);
      this.hud.setHealth(this.player.health);
      this.hud.feed('Medkit used — health restored to full.');
    } else if (item === 'smg') {
      if (this.cash < 150) { this.hud.feed('Not enough cash for SMG ammo — need $150.'); return; }
      this.cash -= 150;
      this.ammo.smg += 120;
      this.hud.feed('Bought 120 SMG rounds.');
    } else if (item === 'shells') {
      if (this.cash < 150) { this.hud.feed('Not enough cash for shells — need $150.'); return; }
      this.cash -= 150;
      this.ammo.shells += 24;
      this.hud.feed('Bought 24 shotgun shells.');
    }
    this.hud.setCash(this.cash);
    this._refreshWeaponHud();
    this.audio.cash();
    this._save();
  }

  // E on foot: shop first, then safehouse, then race flag, then helicopter,
  // then car. (In a car, E exits; in the helicopter, E lands-and-exits.)
  _interact() {
    // v7: in the SKYHAWK, E steps out — only once it is low enough to land
    if (this.inHeli) {
      // v8: never step out over the bay — the water is not a landing pad
      if (this.playerHeli.z > WATER_START) {
        this.hud.feed('Too deep to land here — fly back to shore first.');
        return;
      }
      if (this.playerHeli.y <= 6) this._exitHeli();
      else this.hud.feed('Land first — descend with Shift to exit.');
      return;
    }
    if (this.inCar) { this._exitCar(true); return; }
    if (this.jackTimer > 0) return; // v7: mid-carjack, hands busy
    const px = this.player.position.x, pz = this.player.position.z;
    if (Math.hypot(px - SHOP_SPOT.x, pz - SHOP_SPOT.z) < 7) {
      this.hud.showShop();
      this.audio.click();
      return;
    }
    if (Math.hypot(px - GARAGE_SPOT.x, pz - GARAGE_SPOT.z) < 7) {
      // safehouse: save + full heal
      this.player.heal(100);
      this.hud.setHealth(this.player.health);
      this._save();
      this.audio.fanfare();
      this.hud.feed('Safehouse: game saved, health restored to full.');
      return;
    }
    // v7: the checkered flag on the pier starts the next street race — but
    // only with no job running and no race already on
    if (Math.hypot(px - RACE_FLAG.x, pz - RACE_FLAG.z) < 7 && !this.missions.active && !this.races.active) {
      const idx = this.races.nextRaceIndex();
      const def = this.races.startRace(idx);
      this.audio.raceStart();
      this._refreshMissionPanel();
      this.hud.showMissionCard(`RACE ${def.id}`, `${def.name} — $${def.reward} · PAR ${fmtRaceTime(def.par)}`, 30000, this._vexQuote(def.intro));
      this.hud.feed(`Race started: ${def.name} — ${def.checkpoints.length} checkpoints, par ${fmtRaceTime(def.par)}. Follow the green rings!`);
      return;
    }
    // v7: step up to the parked SKYHAWK and climb in
    if (Math.hypot(px - this.playerHeli.x, pz - this.playerHeli.z) < 5) {
      this._enterHeli();
      return;
    }
    this._toggleCar();
  }

  _selectWeapon(key) {
    this.weapon = key;
    this._refreshWeaponHud();
    this.audio.click();
    this.hud.feed(`Weapon: ${WEAPONS[key].name}${WEAPONS[key].ammo ? ` — ${this.ammo[WEAPONS[key].ammo]} rounds left` : ' — infinite ammo'}.`);
  }

  _cycleWeapon() {
    const order = ['pistol', 'smg', 'shotgun'];
    this._selectWeapon(order[(order.indexOf(this.weapon) + 1) % order.length]);
  }

  _refreshWeaponHud() {
    const w = WEAPONS[this.weapon];
    this.hud.setWeapon(w.name, w.ammo ? String(this.ammo[w.ammo]) : '∞');
  }

  _maybeSpawnFight() {
    const step = this.missions.currentStep();
    if (!step || step.kind !== 'fight') return;
    this.missions.beginFight(step.count);
    const t = step.target;
    for (let i = 0; i < step.count; i++) {
      this._spawnEnemy(t.x + this.rng.range(-6, 6), t.z + this.rng.range(-6, 6), step.count >= 4 ? 'guard' : 'thug');
    }
    this.hud.feed(`${step.count} hostiles incoming — fight!`);
  }

  _spawnEnemy(x, z, kind) {
    const group = new THREE.Group();
    const color = kind === 'guard' ? 0x1a1a2e : 0x5c1a1a;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 1.25, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    body.position.y = 1.2;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc98f6a }));
    head.position.y = 2.05;
    group.add(head);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.enemies.push({ mesh: group, hp: 3, speed: 3.6, attackCooldown: 0, kind, down: false });
  }

  _say(who, text, onDone) {
    this.dialogQueue.push({ who, text, onDone });
    if (this.state === 'playing') this._nextDialog();
  }

  _nextDialog() {
    const d = this.dialogQueue.shift();
    if (!d) { this.hud.hideDialog(); this.state = 'playing'; return; }
    this.state = 'dialog';
    this.hud.showDialog(d.who, d.text);
    this._pendingDialogDone = d.onDone;
  }

  // ---------- input actions ----------
  _onKey(code) {
    if (code === 'KeyM') {
      const muted = this.audio.toggleMute();
      this.hud.feed(muted ? 'Sound muted.' : 'Sound on.');
      return;
    }
    if (this.state === 'dialog') {
      if (code === 'Enter' || code === 'Space') {
        this.audio.click();
        if (this._pendingDialogDone) { const f = this._pendingDialogDone; this._pendingDialogDone = null; f(); }
        this._nextDialog();
      }
      return;
    }
    if (this.state === 'playing' && code === 'Escape') {
      this.state = 'paused';
      document.getElementById('pauseScreen').style.display = 'flex';
      this._updateJobProgress();
      this.input.unlockPointer();
      return;
    }
    if (this.state === 'paused' && code === 'Escape') { this._resume(); return; }
    if (this.state !== 'playing') return;
    if (code === 'KeyE') this._interact();
    if (code === 'KeyF') this._punch();
    // v8: crew abilities — Z Mira (swap plates), X Zio (quick fix), C Kiki (eyes out)
    if (code === 'KeyZ') { this._useCrew('plates'); return; }
    if (code === 'KeyX') { this._useCrew('fix'); return; }
    if (code === 'KeyC') { this._useCrew('eyes'); return; }
    // v6: G opens the garage upgrades at Garage 9 (engine / armor / handling)
    if (code === 'KeyG') {
      const pp = this.inCar ? this.playerCarMesh.position : this.player.position;
      if (Math.hypot(pp.x - GARAGE_SPOT.x, pp.z - GARAGE_SPOT.z) < 9) {
        this.hud.showGarage(this.upgrades);
        this.audio.click();
      } else {
        this.hud.feed('Garage upgrades are at Garage 9, on the south-west pier road.');
      }
      return;
    }
    // v6: weapon wheel — 1/2/3 pick, Q cycles pistol → SMG → shotgun
    if (code === 'Digit1') { this._selectWeapon('pistol'); return; }
    if (code === 'Digit2') { this._selectWeapon('smg'); return; }
    if (code === 'Digit3') { this._selectWeapon('shotgun'); return; }
    if (code === 'KeyQ') { this._cycleWeapon(); return; }
    if (code === 'KeyH') {
      // car horn: honk, and nearby pedestrians scatter
      this.audio.horn();
      const pp = this.inCar ? this.playerCarMesh.position : this.player.position;
      this.traffic.honkFlee(pp.x, pp.z);
    }
    if (code === 'KeyR' && this.inCar) {
      const p = this.playerCarMesh.position;
      const spot = this.city.nearestStreetPoint(p.x, p.z);
      this.playerCarMesh.position.set(spot.x, 0, spot.z);
      this.playerCar.stop();
      this.hud.feed('Car reset to the nearest street.');
    }
    if (code === 'Enter' && !this.missions.active && !this.missions.done) this._offerMission();
  }

  _resume() {
    document.getElementById('pauseScreen').style.display = 'none';
    this.state = 'playing';
    this.input.lockPointer();
  }

  _onShoot() {
    if (this.state !== 'playing' || this.inCar) return;
    // v6: weapon wheel — SMG/shotgun eat bought ammo; pistol is infinite
    const w = WEAPONS[this.weapon];
    if (w.ammo) {
      if (this.ammo[w.ammo] <= 0) {
        this.hud.feed(`Out of ${w.name} ammo — buy more at AMMO-NATION on Volt Row.`);
        return;
      }
      this.ammo[w.ammo] -= 1;
      this._refreshWeaponHud();
    }
    const shot = this.player.shoot(w.cooldown);
    if (!shot) return;
    this.audio.gunshot();
    this._fireBullet(w.damage, w.spread);
    if (this.time - this.lastShotCrime > 5) {
      this.lastShotCrime = this.time;
      this.police.addCrime(1);
      this.hud.feed('Shots fired — the PD heard that.');
    }
  }

  // v6: damage and spread come from the current weapon (shotgun hits harder
  // and wider, SMG and pistol hit one target)
  _fireBullet(damage = 1, spread = 1.1) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.player.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    let best = null, bestD = 70;
    const targets = [];
    for (const ped of this.traffic.peds) {
      if (ped.alive && !ped.fallen) targets.push({ pos: ped.mesh.position, r: 1.1, kind: 'ped', ref: ped });
    }
    for (const cop of this.police.cops) {
      targets.push({ pos: cop.mesh.position, r: 1.1, kind: 'cop', ref: cop });
    }
    for (const e of this.enemies) {
      if (!e.down) targets.push({ pos: e.mesh.position, r: 1.2, kind: 'enemy', ref: e });
    }
    for (const t of targets) {
      const to = new THREE.Vector3().subVectors(t.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), origin);
      const along = to.dot(dir);
      if (along < 0 || along > bestD) continue;
      const perp = to.clone().addScaledVector(dir, -along).length();
      if (perp < Math.max(t.r, spread)) { best = t; bestD = along; }
    }
    // buildings block the shot
    const end = origin.clone().addScaledVector(dir, bestD);
    this._showTracer(origin, end);
    if (!best) return;
    if (best.kind === 'ped') {
      this.traffic.knockDownPed(best.ref);
      this.police.addCrime(1);
      this.hud.feed('Pedestrian down! Wanted up.');
    } else if (best.kind === 'cop') {
      this._damageCop(best.ref);
    } else if (best.kind === 'enemy') {
      best.ref.hp -= damage;
      if (best.ref.hp <= 0) this._downEnemy(best.ref);
    }
  }

  _damageCop(cop) {
    // a shot cop falls and stays down for a while, then gets up
    const idx = this.police.cops.indexOf(cop);
    if (idx < 0) return;
    cop.mesh.rotation.x = Math.PI / 2;
    cop.mesh.position.y = 0.3;
    this.police.addCrime(1);
    this.hud.feed('Officer down! Wanted up.');
    window.setTimeout(() => {
      if (this.police.cops.includes(cop)) {
        cop.mesh.rotation.x = 0;
        cop.mesh.position.y = 0;
      }
    }, 8000);
  }

  _downEnemy(e) {
    e.down = true;
    e.mesh.rotation.x = Math.PI / 2;
    e.mesh.position.y = 0.3;
    this.missions.onEnemyDown();
    this.audio.cash();
    window.setTimeout(() => { this.scene.remove(e.mesh); }, 4000);
  }

  _punch() {
    if (this.inCar || !this.player.punch()) return;
    this.audio.punch();
    const px = this.player.position.x, pz = this.player.position.z;
    const fx = Math.sin(this.player.yaw), fz = Math.cos(this.player.yaw);
    const hit = (tx, tz, range) => {
      const dx = tx - px, dz = tz - pz;
      return Math.hypot(dx, dz) < range && (dx * fx + dz * fz) > 0;
    };
    const ped = this.traffic.nearestPed(px, pz, 2.4);
    if (ped && hit(ped.mesh.position.x, ped.mesh.position.z, 2.4)) {
      this.traffic.knockDownPed(ped);
      this.police.addCrime(1);
      this.hud.feed('You knocked a pedestrian down. Wanted up.');
      return;
    }
    for (const e of this.enemies) {
      if (!e.down && hit(e.mesh.position.x, e.mesh.position.z, 2.4)) {
        e.hp -= 1;
        if (e.hp <= 0) this._downEnemy(e);
        return;
      }
    }
    for (const cop of this.police.cops) {
      if (hit(cop.mesh.position.x, cop.mesh.position.z, 2.4)) {
        this._damageCop(cop);
        return;
      }
    }
  }

  // ---------- cars ----------
  _toggleCar() {
    if (this.inCar) { this._exitCar(true); return; }
    const px = this.player.position.x, pz = this.player.position.z;
    let best = null, bestD = 4.5, bestKind = null;
    for (const pc of this.parkedCars) {
      const d = Math.hypot(pc.mesh.position.x - px, pc.mesh.position.z - pz);
      if (d < bestD) { bestD = d; best = pc; bestKind = 'parked'; }
    }
    if (!best) {
      const tc = this.traffic.nearestCar(px, pz, 4.5);
      if (tc) { best = tc; bestKind = 'traffic'; }
    }
    if (!best) { this.hud.feed('No car in reach. Walk up to a parked car and press E.'); return; }
    if (bestKind === 'traffic') {
      const idx = this.traffic.cars.indexOf(best);
      if (idx >= 0) this.traffic.cars.splice(idx, 1);
      best = { mesh: best.mesh, owned: false, volt: false };
      this.parkedCars.push(best);
      // v7: stealing a TRAFFIC car is a carjacking — the driver gets pulled
      // out and flees, and the car is yours a beat later. Parked cars
      // (Volt GT, Sunrise GT, curbside cars) stay instant, so the mission
      // steal steps never break.
      this._startJack(best);
      return;
    }
    this._enterCar(best);
  }

  // v7: carjacking — yank the driver out of the driver's seat, he runs, the
  // camera shakes, and the car is yours 0.7s later
  _startJack(car) {
    const mesh = car.mesh;
    const h = mesh.rotation.y;
    // driver side of the car (same side the player steps out of)
    const sx = Math.cos(h), sz = -Math.sin(h);
    const px = this.player.position.x, pz = this.player.position.z;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff8a5c, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.15, 8), bodyMat);
    body.position.y = 1.15;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 }));
    head.position.y = 1.95;
    group.add(head);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1e2e, roughness: 0.9 });
    for (const lx of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), legMat);
      leg.position.set(lx, 0.3, 0);
      group.add(leg);
    }
    group.position.set(mesh.position.x + sx * 1.6, 0, mesh.position.z + sz * 1.6);
    this.scene.add(group);
    // flee direction: away from the player
    let dx = group.position.x - px, dz = group.position.z - pz;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    this.jackPed = { mesh: group, timer: 4, dirX: dx, dirZ: dz };
    this.audio.punch();
    this.shake = 0.5;
    this.hud.feed('CARJACKED! Driver pulled out.');
    // (the wanted star + "Car stolen!" feed come from _enterCar 0.7s later)
    this.jackPendingCar = car;
    this.jackTimer = 0.7;
  }

  _enterCar(car) {
    this.inCar = true;
    this.playerCarMesh = car.mesh;
    this.playerCar = new CarDriver(car.mesh);
    this.playerCar.heading = car.mesh.rotation.y;
    this._applyUpgradesToCar(); // v6: garage upgrades ride with every car you drive
    this.player.group.visible = false;
    this.hud.setCrosshair(false);
    // headlight
    if (!this.headlight) {
      this.headlight = new THREE.SpotLight(0xfff2c0, 700, 70, 0.55, 0.5, 1.6);
      this.headlight.position.set(0, 1.2, 2);
      const target = new THREE.Object3D();
      target.position.set(0, 0, 30);
      car.mesh.add(target);
      this.headlight.target = target;
    }
    car.mesh.add(this.headlight);
    if (!car.owned) {
      car.owned = true;
      this.police.addCrime(1);
      this.hud.feed(car.volt ? 'You stole the Volt GT!' : car.sunrise ? 'You stole the Sunrise GT!' : 'Car stolen! The PD is on you.');
      this.audio.cash();
      const ev = this.missions.onCarStolen(car.volt ? 'volt' : car.sunrise ? 'sunrise' : 'any');
      if (ev) this._handleMissionEvent(ev);
    } else {
      this.hud.feed('Back in your car.');
    }
    this._updateVoltRing();
  }

  _exitCar(announce) {
    if (!this.inCar) return;
    const p = this.playerCarMesh.position;
    const side = new THREE.Vector3(Math.cos(this.playerCar.heading), 0, -Math.sin(this.playerCar.heading));
    this.player.group.position.set(p.x + side.x * 2.4, 0, p.z + side.z * 2.4);
    this.player.group.visible = true;
    this.player.yaw = this.playerCar.heading;
    this.player.camYaw = this.playerCar.heading;
    if (this.headlight) this.playerCarMesh.remove(this.headlight);
    this.inCar = false;
    this.playerCar = null;
    this.playerCarMesh = null;
    if (announce) this.hud.feed('On foot. Press E near a car to drive.');
  }

  _updateVoltRing() {
    const step = this.missions.currentStep();
    this.voltRing.visible = !!(step && step.kind === 'steal' && step.car === 'volt');
    // v5: the gold ring marks the Sunrise GT while Job 8's steal step is live
    this.sunriseRing.visible = !!(step && step.kind === 'steal' && step.car === 'sunrise');
  }

  // ---------- mission events ----------
  // v7: street-race events — checkpoint beeps, finish payouts (full under
  // par, half over), best-time tracking in the save
  _handleRaceEvent(ev) {
    if (!ev) return;
    if (ev.type === 'checkpoint') {
      this.audio.raceBeep();
      this.hud.feed(`Checkpoint ${ev.checkpoint + 1}/${ev.total}!`);
      this._refreshMissionPanel();
    } else if (ev.type === 'raceComplete') {
      this.cash += ev.reward;
      this.hud.setCash(this.cash);
      this.hud.setMission('FREE ROAM', 'Race done. The pier crowd is already talking about the next one.');
      this.hud.setJob('FREE ROAM');
      this.hud.feed(ev.underPar
        ? `RACE WON — ${ev.race.name} in ${fmtRaceTime(ev.time)} (par ${fmtRaceTime(ev.race.par)})! +$${ev.reward}`
        : `Race finished in ${fmtRaceTime(ev.time)} — over par, half payout +$${ev.reward}`);
      this.hud.showMissionCard('RACE COMPLETE', `+$${ev.reward} — ${ev.race.name} · ${fmtRaceTime(ev.time)}${ev.underPar ? ' · UNDER PAR' : ''}`);
      if (ev.underPar) this.audio.fanfare(); else this.audio.cash();
      this._updateRespect();
      this._save();
    }
  }

  _handleMissionEvent(ev) {
    if (!ev) return;
    if (ev.type === 'stepComplete') {
      this._refreshMissionPanel();
      this.hud.feed('Objective updated.');
      this.audio.pickup();
      this._maybeSpawnFight();
      this._updateVoltRing();
    } else if (ev.type === 'missionComplete') {
      this.cash += ev.reward;
      this.hud.setCash(this.cash);
      this.hud.setMission('FREE ROAM', 'Job done. Vex will call with the next one.');
      this.hud.setJob('FREE ROAM');
      this.hud.feed(`Job complete! +$${ev.reward}`);
      this.hud.showMissionCard('JOB COMPLETE', `+$${ev.reward} — Vex will call with the next one.`);
      this.audio.fanfare();
      this.player.heal(25);
      this.hud.setHealth(this.player.health);
      this._updateJobProgress();
      this._updateRespect();
      this._save();
      // v8: only auto-offer the next job if the player is NOT already on one —
      // without this guard the timer re-offers the job the player just accepted
      // and drops them back into the offer dialog mid-mission
      window.setTimeout(() => { if (this.state === 'playing' && !this.missions.active) this._offerMission(); }, 3500);
    }
  }

  // ---------- screenshot staging ----------
  _stageShot(name) {
    const s = SHOT_STAGING[name];
    if (!s) return;
    this.shotMode = s.mode;
    // v6: staged shots pin the time of day (golden-hour cover and chase with
    // the roadblock, golden-hour Job 9 mission at the marina, bright noon
    // street) and freeze the clock so the light is exact
    if (s.tod !== undefined && s.tod !== null) {
      this.timeOfDay = s.tod;
      this.clockFrozen = true;
      this.city.setTimeOfDay(s.tod);
      this.hud.setClock(s.tod);
    }
    document.getElementById('startScreen').style.display = 'none';
    this.hud.show();
    this.state = 'playing';
    this.cash = 1250;
    this.hud.setCash(this.cash);
    this.hud.setOrbs(this.orbs.collected, ORB_COUNT);
    this.hud.setRadio(RADIO_SONGS[0]);
    this._updateRespect();
    if (s.mission > 0) {
      // v6: any job can be staged — complete the earlier ones, start this one,
      // so the mission panel shows its stage + NEXT step
      this.missions.completed = s.mission - 1;
      const def = this.missions.startNext();
      if (def) {
        this._refreshMissionPanel();
        this.hud.setJob(`JOB ${def.id}`);
        // v8: the center announcement card is NOT shown in staged shots — it
        // sat in the middle of the frame for 30s, its white quote unreadable
        // over the noon sky, hiding the heli, the beacon and the bay. The top
        // mission panel already carries the job, stage and NEXT step.
      }
      this._updateVoltRing();
    } else if (s.mission === 0) {
      this.hud.setMission('FREE ROAM', 'Explore Neon Bay. Steal a car with E. Missions come from Vex.');
    }
    if (s.wanted > 0) {
      for (let i = 0; i < s.wanted; i++) this.police.addCrime(1);
      // pull police cars onto the same street AHEAD of the player, oncoming, so
      // the chase is visible in frame; they hold position (staged) for the shot.
      // v6: staged closer (12/20/28) so the roadblock at 48 stands alone in
      // the clear gap ahead of the chase pack instead of hiding inside it
      const fwd = { x: Math.sin(s.player.heading), z: Math.cos(s.player.heading) };
      this.police.cars.forEach((car, i) => {
        const ahead = 12 + i * 8;
        const lane = i % 2 === 0 ? -2.8 : 2.8;
        car.mesh.position.set(
          s.player.x + fwd.x * ahead + fwd.z * lane,
          0,
          s.player.z + fwd.z * ahead - fwd.x * lane,
        );
        car.heading = s.player.heading + Math.PI;
        car.mesh.rotation.y = car.heading;
        car.staged = true;
      });
      // at 4 stars the helicopter is up: park it OVER THE PLAYER'S OWN STREET,
      // 48 units ahead and low (y=13), and hold it there. Off-street spots hide
      // it behind the block's buildings, and dead-center high hides it behind
      // the mission panel — this spot lands in the clear gap between the mission
      // panel and the mission card, white body + red stripe + searchlight
      // reading against the dark street. The road is clear to any height.
      if (s.wanted >= 4 && this.police.heli) {
        this.police.placeHeli(
          s.player.x + fwd.x * 48, 13,
          s.player.z + fwd.z * 48,
        );
      }
      // v6: at 4-5 stars the PD roadblock sits across the road ahead — staged
      // beyond the last chase car (48 ahead) so it reads in frame, not inside
      // the chase pack
      if (s.wanted >= 4) {
        this.police.spawnRoadblock(s.player.x, s.player.z, s.player.heading, 48);
      }
    }
    if (s.mode === 'car') {
      const mesh = createCarMesh({ color: 0xff2d78, underglow: 0x00e5ff, sport: true });
      mesh.position.set(s.car.x, 0, s.car.z);
      mesh.rotation.y = s.car.heading;
      this.scene.add(mesh);
      const car = { mesh, owned: true, volt: false };
      this.parkedCars.push(car);
      this.player.group.position.set(s.player.x, 0, s.player.z);
      this._enterCar(car);
      this.playerCar.heading = s.car.heading;
      // cruise at ~54 km/h so the big speedometer reads in the shot
      this.playerCar.speed = 15;
    } else {
      this.player.group.position.set(s.player.x, 0, s.player.z);
      this.player.yaw = s.player.heading;
      this.player.camYaw = s.camYaw;
      this.player.camPitch = s.camPitch;
    }
    // v7: race staging — start race N, then park the staged car 16u before
    // the first checkpoint facing it, so the green beacon reads in frame.
    // The car sits still (speed 0): it is at the start line, the race clock
    // has just begun, and the panel shows CHECKPOINT 1/N.
    if (s.race) {
      const def = this.races.startRace(s.race - 1);
      if (def) {
        const cp = this.races.currentTarget();
        const dx = cp.x - RACE_FLAG.x, dz = cp.z - RACE_FLAG.z;
        const len = Math.hypot(dx, dz) || 1;
        const px = cp.x - (dx / len) * 16, pz = cp.z - (dz / len) * 16;
        const heading = Math.atan2(dx, dz);
        if (this.inCar && this.playerCarMesh) {
          this.playerCarMesh.position.set(px, 0, pz);
          this.playerCar.heading = heading;
          this.playerCarMesh.rotation.y = heading;
          this.playerCar.speed = 0;
        } else {
          this.player.group.position.set(px, 0, pz);
          this.player.yaw = heading;
          this.player.camYaw = heading;
        }
        this._refreshMissionPanel();
        // v8: no center announcement card in staged shots (same reason as the
        // job branch above — it hides the middle of the frame for 30s).
      }
    }
    // pull a few traffic cars into frame, placed on the same street ahead/behind
    const near = this.traffic.cars.slice(0, s.trafficNear);
    const streetX = s.player.x;
    const forward = { x: Math.sin(s.player.heading), z: Math.cos(s.player.heading) };
    near.forEach((car, i) => {
      const along = (i % 2 === 0 ? 1 : -1) * (16 + Math.floor(i / 2) * 14);
      const lane = (i % 2 === 0 ? 2.8 : -2.8);
      const cx = streetX + forward.z * lane + forward.x * along;
      const cz = s.player.z + forward.z * along - forward.x * lane;
      car.mesh.position.set(cx, 0, cz);
      car.heading = s.player.heading;
      car.horizontal = Math.abs(forward.x) > 0.5;
      car.street = car.horizontal ? Math.round(cz) : Math.round(cx);
      car.lane = lane;
    });
    // pull pedestrians onto the sidewalk in frame
    const peds = this.traffic.peds.slice(0, s.pedsNear || 0);
    peds.forEach((ped, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const along = (i - (s.pedsNear || 0) / 2) * 7;
      ped.mesh.position.set(
        s.player.x + forward.z * side * 7.6 + forward.x * along,
        0,
        s.player.z + forward.z * along - forward.x * side * 7.6,
      );
    });
    // put a couple of neon orbs where the camera can see them
    if (s.orbsNear) this.orbs.placeNear(s.player.x, s.player.z);
    this.hud.setHealth(this.player.health);
    this.hud.setWanted(this.police.wanted);
    // populate the Bay PD response list NOW (it normally refreshes on a
    // 0.5s game-time timer — at screenshot frame rates that would still read
    // "No units responding" when the shutter fires)
    this._refreshPoliceList();
    // snap the chase cam to its target now: at SwiftShader frame rates the
    // per-frame lerp would still be settling when the screenshot is taken
    if (this.inCar && this.playerCarMesh) {
      const p = this.playerCarMesh.position;
      const h = this.playerCar.heading;
      this.camPos.set(p.x - Math.sin(h) * 11.5, 4.6, p.z - Math.cos(h) * 11.5);
      this.camLook.set(p.x + Math.sin(h) * 8, 1.4, p.z + Math.cos(h) * 8);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    }
    document.title = 'NEON BAY READY';
  }

  // ---------- frame ----------
  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _showTracer(from, to) {
    const pos = this.tracer.geometry.attributes.position;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x, to.y, to.z);
    pos.needsUpdate = true;
    this.tracer.visible = true;
    this.tracerTimer = 0.07;
    this.muzzleLight.position.copy(from);
    this.muzzleLight.intensity = 60;
  }

  _frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    if (this.state === 'menu') {
      // slow orbit over the city behind the start screen
      const t = this.time * 0.05;
      this.camera.position.set(Math.cos(t) * 120, 55, Math.sin(t) * 120);
      this.camera.lookAt(0, 8, 0);
      this.city.update(dt, this.time, { x: 0, z: 0 });
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (this.state === 'paused' || this.state === 'ended-busted' || this.state === 'ended-wasted') {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const playing = this.state === 'playing';
    const pausedWorld = this.state === 'dialog';
    if (playing) {
      this._updateWorld(dt);
    } else if (pausedWorld) {
      this.city.update(dt, this.time, this.player.position);
    }
    // camera
    // v7: helicopter chase cam — behind and above the SKYHAWK
    if (this.inHeli && this.playerHeliMesh) {
      const p = this.playerHeliMesh.position;
      const h = this.playerHeli.heading;
      const tx = p.x - Math.sin(h) * 14, tz = p.z - Math.cos(h) * 14;
      this.camPos.x += (tx - this.camPos.x) * Math.min(1, dt * 5);
      this.camPos.y += ((p.y + 7) - this.camPos.y) * Math.min(1, dt * 5);
      this.camPos.z += (tz - this.camPos.z) * Math.min(1, dt * 5);
      this.camLook.lerp(new THREE.Vector3(p.x + Math.sin(h) * 6, p.y + 1, p.z + Math.cos(h) * 6), Math.min(1, dt * 8));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    } else if (this.inCar && this.playerCarMesh) {
      const p = this.playerCarMesh.position;
      const h = this.playerCar.heading;
      const back = 11.5, up = 4.6;
      const tx = p.x - Math.sin(h) * back, tz = p.z - Math.cos(h) * back;
      this.camPos.x += (tx - this.camPos.x) * Math.min(1, dt * 5);
      this.camPos.y += (up - this.camPos.y) * Math.min(1, dt * 5);
      this.camPos.z += (tz - this.camPos.z) * Math.min(1, dt * 5);
      this.camLook.lerp(new THREE.Vector3(p.x + Math.sin(h) * 8, 1.4, p.z + Math.cos(h) * 8), Math.min(1, dt * 8));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    } else {
      this.player.cameraTransform(this.camera);
      this.camPos.copy(this.camera.position);
      this.camLook.set(this.player.position.x, 1.6, this.player.position.z);
    }
    // screen shake on hard hits, decaying fast
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.6;
      this.shake *= Math.max(0, 1 - dt * 4);
    }
    this._updateSmoke(dt);
    // tracer fade
    if (this.tracerTimer > 0) {
      this.tracerTimer -= dt;
      if (this.tracerTimer <= 0) { this.tracer.visible = false; this.muzzleLight.intensity = 0; }
    }
    this.renderer.render(this.scene, this.camera);
    if (!window.__neonbay.ready) {
      window.__neonbay.ready = true;
      document.title = 'NEON BAY READY';
    }
  }

  _updateWorld(dt) {
    const pp = this.inHeli ? this.playerHeliMesh.position : this.inCar ? this.playerCarMesh.position : this.player.position;
    // v6: the game clock runs 1 game-hour per 75 real seconds; the city and
    // the HUD clock follow it, and the exposure lifts a touch by day
    if (!this.clockFrozen) this.timeOfDay = (this.timeOfDay + dt / 75) % 24;
    this.city.setTimeOfDay(this.timeOfDay);
    this.hud.setClock(this.timeOfDay);
    // v6: exposure lifts a touch by day so noon reads bright, not dusk
    this.renderer.toneMappingExposure = 1.25 + 0.1 * this.city.dayFactor;
    // v7: the carjack beat — 0.7s after the pull, the car is yours
    if (this.jackTimer > 0) {
      this.jackTimer -= dt;
      if (this.jackTimer <= 0) {
        this.jackTimer = 0; // clamp: a fired beat reads 0, never negative
        if (this.jackPendingCar) {
          const c = this.jackPendingCar;
          this.jackPendingCar = null;
          this._enterCar(c);
        }
      }
    }
    // v7: the pulled driver sprints away from the player, then disappears
    if (this.jackPed) {
      this.jackPed.timer -= dt;
      const jp = this.jackPed;
      jp.mesh.position.x += jp.dirX * 5.5 * dt;
      jp.mesh.position.z += jp.dirZ * 5.5 * dt;
      jp.mesh.rotation.y = Math.atan2(jp.dirX, jp.dirZ);
      const fixed = this.city.resolveCircle(jp.mesh.position.x, jp.mesh.position.z, 0.5);
      jp.mesh.position.x = fixed.x;
      jp.mesh.position.z = fixed.z;
      if (jp.timer <= 0) {
        this.scene.remove(jp.mesh);
        this.jackPed = null;
      }
    }
    // player / car
    if (this.inHeli && this.playerHeli) {
      // v7: helicopter flight — car and on-foot updates are skipped, the
      // world (traffic, police, missions) keeps running below
      this.playerHeli.update(dt, this.input, this.city);
      this.audio.setEngine(0, false);
      this.hud.setSpeed(this.playerHeli.speed * 3.6, 'HELICOPTER');
      this.hud.setCrosshair(false);
    } else if (this.inCar && this.playerCar) {
      const res = this.playerCar.update(dt, this.input, this.city);
      this.traffic.collidePlayerCar(this.playerCarMesh.position.x, this.playerCarMesh.position.z, 1.6);
      // hit pedestrians while driving
      const ped = this.traffic.nearestPed(this.playerCarMesh.position.x, this.playerCarMesh.position.z, 2.2);
      if (ped && Math.abs(this.playerCar.speed) > 4) {
        this.traffic.knockDownPed(ped);
        this.police.addCrime(1);
        this.hud.feed('You hit a pedestrian! Wanted up.');
        this.audio.crash();
        this.playerCar.speed *= 0.7;
      }
      // police ram damage: shake, smoke, flash, health loss
      const impact = this.police.ramCheck(this.playerCarMesh.position, 1.6);
      if (impact > 16 && this.time - (this._lastRam || 0) > 1.5) {
        this._lastRam = this.time;
        this.audio.crash();
        this.shake = 0.7;
        this._spawnSmoke(this.playerCarMesh.position, 6);
        this.hud.flashDamage();
        if (this._damagePlayer(8)) this._wasted(); // v6: armor scales the hit
      }
      // v6: ramming the roadblock at speed hurts just as much — and slows you
      if (this.police.roadblockHit(this.playerCarMesh.position, 2.2)
        && Math.abs(this.playerCar.speed) > 10
        && this.time - (this._lastRam || 0) > 1.5) {
        this._lastRam = this.time;
        this.audio.crash();
        this.shake = 0.8;
        this._spawnSmoke(this.playerCarMesh.position, 8);
        this.hud.flashDamage();
        this.playerCar.speed *= 0.35;
        this.hud.feed('You smashed through the roadblock!');
        if (this._damagePlayer(10)) this._wasted();
      }
      this.audio.setEngine(this.playerCar.speed * 3.6, res.throttle > 0);
      this.hud.setSpeed(this.playerCar.speed * 3.6, 'DRIVING');
      this.hud.setCrosshair(false);
    } else {
      this.player.update(dt, this.input, this.city);
      this.audio.setEngine(0, false);
      this.hud.setSpeed(0, 'ON FOOT');
      this.hud.setCrosshair(true);
    }
    // world systems
    this.traffic.update(dt, pp, this.inCar ? this.playerCar.speed : 0, this.time);
    // v6: the PD gets the player's heading so the roadblock lands on their road
    // v7: flying counts as "in a vehicle" — foot cops cannot grab you out of the sky
    const pol = this.police.update(dt, pp, this.inCar || this.inHeli, this.inCar ? this.playerCar.speed : 0, this.inCar ? this.playerCar.heading : this.player.yaw);
    if (pol.busted) { this._busted(); return; }
    this.audio.updateSiren(dt, this.police.nearby);
    this.audio.updateRotor(this.police.heliActive || this.inHeli); // v7: the SKYHAWK's rotor too
    this.audio.updateMusic(dt);
    // radio rotates to the next song every 45 seconds of game time
    this.radioTimer += dt;
    if (this.radioTimer > 45) {
      this.radioTimer = 0;
      this.radioIndex = (this.radioIndex + 1) % RADIO_SONGS.length;
      this.hud.setRadio(RADIO_SONGS[this.radioIndex]);
    }
    // Bay PD response list, refreshed twice a second (not every frame)
    this.policeListTimer += dt;
    if (this.policeListTimer > 0.5) {
      this.policeListTimer = 0;
      this._refreshPoliceList();
      // v8: district label + crew cooldowns ride the same half-second tick
      this.hud.setDistrict(this._districtFor(pp.x, pp.z), this._districtStanding());
      this.hud.setCrew([
        { cd: this.crewCd.plates },
        { cd: this.crewCd.fix },
        { cd: this.crewCd.eyes },
      ]);
    }
    // v8: crew cooldowns tick down in real game time
    this.crewCd.plates = Math.max(0, this.crewCd.plates - dt);
    this.crewCd.fix = Math.max(0, this.crewCd.fix - dt);
    this.crewCd.eyes = Math.max(0, this.crewCd.eyes - dt);
    // neon orbs: walk through one, get $50
    const picked = this.orbs.update(dt, this.time, pp);
    if (picked > 0) {
      this.cash += picked * ORB_VALUE;
      this.hud.setCash(this.cash);
      this.hud.setOrbs(this.orbs.collected, ORB_COUNT);
      this._updateRespect();
      this.audio.orb();
      this.hud.feed(`Neon orb collected! +$${picked * ORB_VALUE}`);
    }
    // enemies
    for (const e of this.enemies) {
      if (e.down) continue;
      const dx = pp.x - e.mesh.position.x, dz = pp.z - e.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.6 && d < 60) {
        e.mesh.position.x += (dx / d) * e.speed * dt;
        e.mesh.position.z += (dz / d) * e.speed * dt;
        e.mesh.rotation.y = Math.atan2(dx, dz);
        const fixed = this.city.resolveCircle(e.mesh.position.x, e.mesh.position.z, 0.5);
        e.mesh.position.x = fixed.x;
        e.mesh.position.z = fixed.z;
      }
      if (d < 1.7) {
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0) {
          e.attackCooldown = 1.1;
          this.audio.punch();
          this.hud.flashDamage();
          this.shake = 0.4;
          if (this._damagePlayer(8)) { this._wasted(); return; } // v6: armor scales the hit
          this.hud.setHealth(this.player.health);
        }
      }
    }
    // v6: one-time hints when the player first reaches the garage / shop
    const dGarage = Math.hypot(pp.x - GARAGE_SPOT.x, pp.z - GARAGE_SPOT.z);
    const dShop = Math.hypot(pp.x - SHOP_SPOT.x, pp.z - SHOP_SPOT.z);
    if (dGarage < 12 && !this._hintedGarage) {
      this._hintedGarage = true;
      this.hud.feed('Garage 9: press G for upgrades, E to save + heal (safehouse).');
    } else if (dGarage > 24) this._hintedGarage = false;
    if (dShop < 12 && !this._hintedShop) {
      this._hintedShop = true;
      this.hud.feed('AMMO-NATION: press E to buy health and ammo.');
    } else if (dShop > 24) this._hintedShop = false;
    // missions
    const ev = this.missions.update(dt, pp, this.inCar, this.police.wanted);
    if (ev) this._handleMissionEvent(ev);
    // v7: street races — checkpoints and payouts, driven by the player position
    const raceEv = this.races.update(dt, pp);
    if (raceEv) this._handleRaceEvent(raceEv);
    // rain, beacons, flicker, clouds and splashes follow the player
    this.city.update(dt, this.time, pp);
    // HUD
    this.hud.setWanted(this.police.wanted);
    this.hud.setHealth(this.player.health);
    this.hud.drawMinimap({
      buildings: this.city.buildings,
      traffic: this.traffic.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
      // v6: roadblock cars show on the minimap as police
      police: [...this.police.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
               ...this.police.cops.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
               ...this.police.roadblock.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z }))],
      heli: this.police.heliPosition,
      orbs: this.orbs.remaining().map((o) => ({ x: o.x, z: o.z })),
      player: { x: pp.x, z: pp.z, heading: this.inHeli ? this.playerHeli.heading : this.inCar ? this.playerCar.heading : this.player.yaw },
      // v7: the race checkpoint shows on the minimap when no mission target is live
      missionTarget: this.missions.currentTarget() || this.races.currentTarget(),
    });
    // mission step text refresh
    const step = this.missions.currentStep();
    if (step && this.missions.active) {
      this._refreshMissionPanel();
    }
    // v7: the race clock ticks every frame while a race runs
    if (this.races.active) this._refreshMissionPanel();
  }

  _busted() {
    this.state = 'ended-busted';
    const loss = Math.min(this.cash, Math.max(100, Math.floor(this.cash * 0.2)));
    this.cash -= loss;
    this.hud.setCash(this.cash);
    document.getElementById('endTitle').textContent = 'BUSTED';
    document.getElementById('endText').textContent = `The Bay PD caught up with you. You lost $${loss} in fines.`;
    document.getElementById('endScreen').style.display = 'flex';
    this.hud.hide();
    this.input.unlockPointer();
    this._save();
  }

  _wasted() {
    this.state = 'ended-wasted';
    const loss = Math.min(this.cash, Math.max(100, Math.floor(this.cash * 0.2)));
    this.cash -= loss;
    this.hud.setCash(this.cash);
    document.getElementById('endTitle').textContent = 'WASTED';
    document.getElementById('endText').textContent = `You flatlined in the rain. The medics patched you up — minus $${loss} in bills.`;
    document.getElementById('endScreen').style.display = 'flex';
    this.hud.hide();
    this.input.unlockPointer();
    this._save();
  }
}

new Game();
