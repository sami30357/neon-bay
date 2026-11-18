// Neon Bay — the game itself: boot, loop, driving and on-foot play, car stealing,
// combat, wanted heat, missions, saves, and deterministic screenshot staging.
import * as THREE from 'three';
import { City, CITY_EXTENT } from './city.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { HUD } from './hud.js';
import { Player } from './player.js';
import { TrafficSystem } from './traffic.js';
import { PoliceSystem } from './police.js';
import { Missions } from './missions.js';
import { createCarMesh, CarDriver, makeRngCar } from './cars.js';
import { makeRng } from './random.js';
import { readShotParam, SHOT_STAGING } from './shots.js';

const SAVE_KEY = 'neonbay-save-v1';
const VOLT_SPOT = { x: 168, z: -120 };
const PARKED_SPOTS = [
  { x: -24, z: 66 }, { x: 72, z: -168 }, { x: -120, z: -24 }, { x: 120, z: 168 },
  { x: -168, z: 72 }, { x: 24, z: -120 }, { x: 168, z: 24 }, { x: -72, z: -168 },
];

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(0, 30, 60);
    // camera fill light: a soft cool light that rides with the camera so the car
    // and the near street always read, even far from any streetlight
    this.fillLight = new THREE.PointLight(0x7fb4ff, 120, 30, 1.8);
    this.fillLight.position.set(0, 6, -6);
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
    this.rng = makeRng(31337);

    this.state = 'menu'; // menu | playing | dialog | paused | ended
    this.inCar = false;
    this.playerCar = null; // CarDriver
    this.playerCarMesh = null;
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
    this.lastShotCrime = -10;
    this.camPos = new THREE.Vector3(0, 30, 60);
    this.camLook = new THREE.Vector3(0, 1.5, 0);
    this.saveData = this._loadSave();

    this._buildParkedCars();
    this._buildVoltGT();
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
      mesh.rotation.y = this.rng.range(0, Math.PI * 2);
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

  _wireUI() {
    document.getElementById('startBtn').addEventListener('click', () => this._startGame(false));
    document.getElementById('continueBtn').addEventListener('click', () => this._startGame(true));
    document.getElementById('resumeBtn').addEventListener('click', () => this._resume());
    document.getElementById('saveBtn').addEventListener('click', () => { this._save(); this.hud.feed('Game saved.'); });
    document.getElementById('restartBtn').addEventListener('click', () => this._restartNight());
    document.getElementById('endBtn').addEventListener('click', () => this._respawn());
  }

  _updateStartButtons() {
    const btn = document.getElementById('continueBtn');
    btn.style.display = this.saveData ? 'inline-block' : 'none';
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
        pos: { x: this.player.position.x, z: this.player.position.z },
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
      this.player.reset(this.saveData.pos?.x ?? 0, this.saveData.pos?.z ?? 24);
      this.hud.feed('Save loaded. Welcome back to Neon Bay.');
    } else {
      this.cash = 0;
      this.player.reset(0, 24);
    }
    this.hud.setCash(this.cash);
    this.hud.setHealth(this.player.health);
    this._offerMission();
  }

  _restartNight() {
    this.cash = 0;
    this.missions.completed = 0;
    this.missions.active = null;
    this.player.reset(0, 24);
    this.police.clearWanted();
    this._exitCar(false);
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
    this.player.reset(station.x, station.z);
    this.police.clearWanted();
    this.state = 'playing';
    this.hud.show();
    this.hud.setHealth(this.player.health);
    this.hud.feed('You are back on the streets. Stay sharp.');
  }

  // ---------- missions ----------
  _offerMission() {
    if (this.missions.done) {
      this._say('VEX', 'You did it, Rook. Five jobs, one legend. Neon Bay is yours now — free roam, keep the cash coming.');
      return;
    }
    const def = this.missions.currentDef;
    if (!def) return;
    this._say('VEX', def.intro, () => {
      const started = this.missions.startNext();
      if (started) {
        this.hud.setMission(`JOB ${started.id}: ${started.title}`, this.missions.currentStep().text);
        this.hud.setJob(`JOB ${started.id}`);
        this.hud.feed(`New job: ${started.title} — $${started.reward}`);
        if (started.id === 4) this.police.addCrime(2);
        this._maybeSpawnFight();
        this._updateVoltRing();
      }
    });
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
      this.input.unlockPointer();
      return;
    }
    if (this.state === 'paused' && code === 'Escape') { this._resume(); return; }
    if (this.state !== 'playing') return;
    if (code === 'KeyE') this._toggleCar();
    if (code === 'KeyF') this._punch();
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
    const shot = this.player.shoot();
    if (!shot) return;
    this.audio.gunshot();
    this._fireBullet();
    if (this.time - this.lastShotCrime > 5) {
      this.lastShotCrime = this.time;
      this.police.addCrime(1);
      this.hud.feed('Shots fired — the PD heard that.');
    }
  }

  _fireBullet() {
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
      if (perp < t.r) { best = t; bestD = along; }
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
      best.ref.hp -= 1;
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
    }
    this._enterCar(best);
  }

  _enterCar(car) {
    this.inCar = true;
    this.playerCarMesh = car.mesh;
    this.playerCar = new CarDriver(car.mesh);
    this.playerCar.heading = car.mesh.rotation.y;
    this.player.group.visible = false;
    this.hud.setCrosshair(false);
    // headlight
    if (!this.headlight) {
      this.headlight = new THREE.SpotLight(0xfff2c0, 500, 70, 0.55, 0.5, 1.6);
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
      this.hud.feed(car.volt ? 'You stole the Volt GT!' : 'Car stolen! The PD is on you.');
      this.audio.cash();
      const ev = this.missions.onCarStolen(car.volt ? 'volt' : 'any');
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
  }

  // ---------- mission events ----------
  _handleMissionEvent(ev) {
    if (!ev) return;
    if (ev.type === 'stepComplete') {
      this.hud.setMission(`JOB ${this.missions.active.def.id}: ${this.missions.active.def.title}`, ev.step.text);
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
      this.audio.cash();
      this.player.heal(25);
      this.hud.setHealth(this.player.health);
      this._save();
      window.setTimeout(() => { if (this.state === 'playing') this._offerMission(); }, 3500);
    }
  }

  // ---------- screenshot staging ----------
  _stageShot(name) {
    const s = SHOT_STAGING[name];
    if (!s) return;
    this.shotMode = s.mode;
    document.getElementById('startScreen').style.display = 'none';
    this.hud.show();
    this.state = 'playing';
    this.cash = 1250;
    this.hud.setCash(this.cash);
    if (s.mission === 2) {
      this.missions.completed = 1;
      const def = this.missions.startNext();
      if (def) {
        this.hud.setMission(`JOB ${def.id}: ${def.title}`, this.missions.currentStep().text);
        this.hud.setJob(`JOB ${def.id}`);
      }
      this._updateVoltRing();
    } else if (s.mission === 0) {
      this.hud.setMission('FREE ROAM', 'Explore Neon Bay. Steal a car with E. Missions come from Vex.');
    }
    if (s.wanted > 0) {
      for (let i = 0; i < s.wanted; i++) this.police.addCrime(1);
      // pull police cars onto the same street AHEAD of the player, oncoming, so
      // the chase is visible in frame; they hold position (staged) for the shot
      const fwd = { x: Math.sin(s.player.heading), z: Math.cos(s.player.heading) };
      this.police.cars.forEach((car, i) => {
        const ahead = 26 + i * 12;
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
    } else {
      this.player.group.position.set(s.player.x, 0, s.player.z);
      this.player.yaw = s.player.heading;
      this.player.camYaw = s.camYaw;
      this.player.camPitch = s.camPitch;
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
    this.hud.setHealth(this.player.health);
    this.hud.setWanted(this.police.wanted);
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
      this.city.updateRain(dt, { x: 0, z: 0 });
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
      this.city.updateRain(dt, this.player.position);
    }
    // camera
    if (this.inCar && this.playerCarMesh) {
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
    const pp = this.inCar ? this.playerCarMesh.position : this.player.position;
    // player / car
    if (this.inCar && this.playerCar) {
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
      // police ram damage
      const impact = this.police.ramCheck(this.playerCarMesh.position, 1.6);
      if (impact > 16 && this.time - (this._lastRam || 0) > 1.5) {
        this._lastRam = this.time;
        this.audio.crash();
        if (this.player.damage(8)) this._wasted();
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
    const pol = this.police.update(dt, pp, this.inCar, this.inCar ? this.playerCar.speed : 0);
    if (pol.busted) { this._busted(); return; }
    this.audio.updateSiren(dt, this.police.nearby);
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
          if (this.player.damage(8)) { this._wasted(); return; }
          this.hud.setHealth(this.player.health);
        }
      }
    }
    // missions
    const ev = this.missions.update(dt, pp, this.inCar, this.police.wanted);
    if (ev) this._handleMissionEvent(ev);
    // rain follows the player
    this.city.updateRain(dt, pp);
    // HUD
    this.hud.setWanted(this.police.wanted);
    this.hud.setHealth(this.player.health);
    this.hud.drawMinimap({
      buildings: this.city.buildings,
      traffic: this.traffic.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
      police: [...this.police.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
               ...this.police.cops.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z }))],
      player: { x: pp.x, z: pp.z, heading: this.inCar ? this.playerCar.heading : this.player.yaw },
      missionTarget: this.missions.currentTarget(),
    });
    // mission step text refresh
    const step = this.missions.currentStep();
    if (step && this.missions.active) {
      this.hud.setMission(`JOB ${this.missions.active.def.id}: ${this.missions.active.def.title}`, step.text);
    }
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
