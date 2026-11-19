// Solmara Bay — the 11 jobs.
// One clear job: Vex's story work. A job is a chain of stages; each stage has
// a beacon in the world and a line in the mission panel. No auto-offer timer
// ever interrupts a running job: the next job waits for the player to press J.
import * as THREE from 'three';
import { JOBS } from './config.js';
import { glowTexture } from './textures.js';
import { Vehicle } from './vehicles.js';

export class Jobs {
  constructor(scene, city, vehicles, rng) {
    this.scene = scene;
    this.city = city;
    this.vehicles = vehicles;
    this.rng = rng;
    this.current = -1;
    this.stage = 0;
    this.active = false;
    this.completed = 0;
    this.targetCar = null;
    this._buildBeacon();
  }

  _buildBeacon() {
    const g = new THREE.Group();
    // A pillar of light the player can see across the city.
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 34, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    pillar.position.y = 17;
    g.add(pillar);
    // A glowing ring on the ground.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 3.1, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    g.add(ring);
    // A floating diamond marker.
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9),
      new THREE.MeshBasicMaterial({ color: 0xffd75e }),
    );
    gem.position.y = 4.5;
    g.add(gem);
    this.beaconGem = gem;
    // A glow sprite at the base.
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd75e, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    sprite.scale.set(10, 10, 1);
    sprite.position.y = 1;
    g.add(sprite);
    g.visible = false;
    this.scene.add(g);
    this.beacon = g;
  }

  // The next job in the list, or null when all 11 are done.
  nextJob() {
    return this.completed < JOBS.length ? JOBS[this.completed] : null;
  }

  // Start a job by index. Spawns a target car for steal stages.
  startJob(index) {
    if (this.active) return false;
    const job = JOBS[index];
    if (!job) return false;
    this.current = index;
    this.stage = 0;
    this.active = true;
    this._placeBeacon();
    const stage = job.stages[0];
    if (stage.kind === 'steal') this._spawnTargetCar(stage);
    return true;
  }

  _spawnTargetCar(stage) {
    const def = { id: 'target', name: 'TARGET', kind: 'sports', top: 40, accel: 22, grip: 0.85, color: 0xffd75e, hp: 100 };
    const car = new Vehicle(this.scene, def, stage.at[0], stage.at[1], 0);
    car.driver = 'none';
    this.vehicles.all.push(car);
    this.targetCar = car;
  }

  _placeBeacon() {
    const job = JOBS[this.current];
    if (!job || !this.active) { this.beacon.visible = false; return; }
    const stage = job.stages[this.stage];
    if (!stage) { this.beacon.visible = false; return; }
    this.beacon.position.set(stage.at[0], 0, stage.at[1]);
    this.beacon.visible = true;
  }

  // What the mission panel shows.
  // The stage the player is on now (0-based), for the HUD and the tests.
  get activeStage() { return this.stage; }

  // The job the player is on now (or null when none is active).
  get activeJob() { return this.active ? JOBS[this.current] : null; }

  currentInfo() {
    if (!this.active) {
      const next = this.nextJob();
      return next
        ? { job: next, stage: null, label: 'Press J to start', next: next.brief }
        : { job: null, stage: null, label: 'All jobs done', next: 'Solmara Bay is yours.' };
    }
    const job = JOBS[this.current];
    const stage = job.stages[this.stage];
    return {
      job,
      stage,
      label: stage.label,
      next: job.stages[this.stage + 1] ? job.stages[this.stage + 1].label : 'Finish the job',
    };
  }

  // --- Per-frame: watch the stage condition, advance, pay out. ---
  // ctx: { px, pz, inCar, playerCar, stars, onStage, onJob }
  // Returns 'stage' | 'job' | null when something completed this frame.
  update(dt, t, ctx) {
    // Pulse the beacon.
    if (this.beacon.visible) {
      this.beaconGem.rotation.y += dt * 2;
      this.beaconGem.position.y = 4.5 + Math.sin(t * 2) * 0.4;
    }
    if (!this.active) return null;
    const job = JOBS[this.current];
    const stage = job.stages[this.stage];
    if (!stage) return null;
    const d = Math.hypot(stage.at[0] - ctx.px, stage.at[1] - ctx.pz);
    let done = false;
    if (stage.kind === 'goto') {
      done = d < 4.5;
    } else if (stage.kind === 'deliver') {
      done = ctx.inCar && d < 5.5;
    } else if (stage.kind === 'steal') {
      done = ctx.inCar && this.targetCar && ctx.playerCar === this.targetCar;
    } else if (stage.kind === 'escape') {
      done = ctx.stars === 0 && d < 6;
    }
    if (!done) return null;
    this.stage += 1;
    if (ctx.onStage) ctx.onStage(job, this.stage);
    if (this.stage >= job.stages.length) {
      this.active = false;
      this.completed += 1;
      this.beacon.visible = false;
      if (ctx.onJob) ctx.onJob(job);
      return 'job';
    }
    this._placeBeacon();
    const next = job.stages[this.stage];
    if (next.kind === 'steal') this._spawnTargetCar(next);
    return 'stage';
  }

  // Money and respect for a finished job.
  payout(job) {
    return { cash: job.pay, respect: Math.round(job.pay / 12) };
  }
}
