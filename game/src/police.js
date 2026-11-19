// Solmara Bay — the wanted level and Bay PD.
// One clear job: turn crimes into stars, stars into patrol cars, and patrol
// cars into a chase. Every unit has a callsign and a role, and the HUD reads
// the list straight from here.
import * as THREE from 'three';
import { CALLSIGNS, PD_ROLES, WANTED } from './config.js';
import { Vehicle } from './vehicles.js';

export const PD_DEF = { id: 'pd', name: 'BAY PD INTERCEPTOR', kind: 'sedan', top: 40, accel: 24, grip: 0.85, color: 0xffffff, hp: 120 };

export class Police {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.stars = 0;
    this.units = [];
    this.roadblocks = [];
    this.airUnit = null;
    this.inSight = false;
    this.sightTimer = 0;
    this.decayTimer = 0;
    this.usedCallsigns = new Set();
    this._buildAirUnit();
  }

  // The police helicopter: a simple airframe with a spinning rotor and a
  // searchlight cone. It appears when the wanted level reaches 3 stars.
  _buildAirUnit() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.4, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.4, metalness: 0.5 }),
    );
    body.position.y = 0;
    g.add(body);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.4 }),
    );
    tail.position.set(0, 0.2, -3.6);
    g.add(tail);
    this.rotor = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }),
    );
    this.rotor.position.y = 1.0;
    g.add(this.rotor);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x88ccee, roughness: 0.2, metalness: 0.4 }),
    );
    glass.position.set(0, 0.1, 1.8);
    g.add(glass);
    // Searchlight cone, pointing down.
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(7, 26, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2cc, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.position.y = -13;
    cone.rotation.x = Math.PI;
    g.add(cone);
    this.airCone = cone;
    g.visible = false;
    this.scene.add(g);
    this.airUnit = { group: g, x: 0, z: 0, y: 42 };
  }

  _nextCallsign() {
    const pool = CALLSIGNS.filter((c) => !this.usedCallsigns.has(c));
    const name = pool.length ? this.rng.pick(pool) : this.rng.pick(CALLSIGNS);
    const num = this.rng.int(2, 98);
    this.usedCallsigns.add(name);
    return `${name}-${num}`;
  }

  _nextRole() {
    return this.rng.pick(PD_ROLES);
  }

  // Raise the heat. Spawns units up to the level's count.
  addWanted(n) {
    this.stars = Math.min(WANTED.maxStars, this.stars + n);
    this.decayTimer = 0;
    this._syncUnits();
  }

  setWanted(n) {
    this.stars = Math.max(0, Math.min(WANTED.maxStars, n));
    this._syncUnits();
  }

  // Lose one star (crew ability, or escaping clean). Drops the farthest unit.
  dropStar() {
    if (this.stars <= 0) return false;
    this.stars -= 1;
    this._syncUnits();
    return true;
  }

  clearWanted() {
    this.stars = 0;
    this._syncUnits();
  }

  _syncUnits() {
    const want = WANTED.unitsPerStar[this.stars];
    while (this.units.length < want) this._spawnUnit();
    while (this.units.length > want) this._despawnUnit();
    if (this.stars >= WANTED.roadblockAt && this.roadblocks.length === 0) {
      this._spawnRoadblock();
    }
    if (this.stars < WANTED.roadblockAt) this._clearRoadblocks();
    if (this.airUnit) this.airUnit.group.visible = this.stars >= WANTED.airUnitAt;
  }

  _spawnUnit() {
    const rng = this.rng;
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(50, 90);
    const x = Math.max(-200, Math.min(200, rng.range(-60, 60) + Math.cos(angle) * dist));
    const z = Math.max(-200, Math.min(200, rng.range(-60, 60) + Math.sin(angle) * dist));
    const car = new Vehicle(this.scene, PD_DEF, x, z, rng.range(0, Math.PI * 2));
    car.driver = 'police';
    // Light bar on the roof.
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.18, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff2244 }),
    );
    bar.position.y = 1.35;
    car.group.add(bar);
    this.lightBars = this.lightBars || [];
    this.lightBars.push(bar);
    const unit = {
      callsign: this._nextCallsign(),
      role: this._nextRole(),
      car,
      bumpTimer: 0,
    };
    this.units.push(unit);
    return unit;
  }

  _despawnUnit() {
    // Drop the farthest unit from the player (the player position is set by update).
    let idx = 0;
    let worst = -1;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      const d = Math.hypot(u.car.pos.x - (this.px || 0), u.car.pos.z - (this.pz || 0));
      if (d > worst) { worst = d; idx = i; }
    }
    const [unit] = this.units.splice(idx, 1);
    if (unit) {
      unit.car.dispose();
      this.usedCallsigns.delete(unit.callsign.split('-')[0]);
    }
  }

  // --- Roadblocks: two interceptors parked across the road ahead. ---
  _spawnRoadblock() {
    const px = this.px || 0;
    const pz = this.pz || 0;
    const ahead = { x: px, z: Math.max(-180, pz - 60) };
    for (const off of [-4, 4]) {
      const car = new Vehicle(this.scene, PD_DEF, ahead.x + off, ahead.z, Math.PI / 2);
      car.driver = 'police';
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.18, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x2244ff }),
      );
      bar.position.y = 1.35;
      car.group.add(bar);
      this.roadblocks.push(car);
    }
  }

  _clearRoadblocks() {
    for (const car of this.roadblocks) car.dispose();
    this.roadblocks = [];
  }

  // --- Per-frame: chase, ram, watch, decay. ---
  // ctx: { px, pz, playerCar, player, dt, onBusted }
  update(dt, ctx) {
    this.px = ctx.px;
    this.pz = ctx.pz;
    // In sight: any unit close enough to see the player.
    let nearest = Infinity;
    for (const u of this.units) {
      const d = Math.hypot(u.car.pos.x - ctx.px, u.car.pos.z - ctx.pz);
      if (d < nearest) nearest = d;
    }
    const wasSight = this.inSight;
    this.inSight = this.stars > 0 && nearest < 45;
    if (this.inSight) {
      this.sightTimer += dt;
      this.decayTimer = 0;
    } else if (this.stars > 0) {
      this.decayTimer += dt;
      if (this.decayTimer > WANTED.decayDelaySec) {
        this.stars -= 1;
        this.decayTimer = 0;
        this._syncUnits();
      }
    }
    void wasSight;
    // Chase: each unit steers at the player, by role.
    for (const u of this.units) {
      const car = u.car;
      let tx = ctx.px;
      let tz = ctx.pz;
      if (u.role === 'FLANKING') { tx += 14; tz += 6; }
      if (u.role === 'ROADBLOCK') { tx = ctx.px + 20; tz = ctx.pz - 30; }
      const dx = tx - car.pos.x;
      const dz = tz - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const wantYaw = Math.atan2(dx, dz);
      let dyaw = wantYaw - car.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      car.yaw += Math.max(-2.4 * dt, Math.min(2.4 * dt, dyaw));
      const targetSpeed = u.role === 'SPOTLIGHT' ? 8 : (dist > 26 ? 34 : 26);
      car.speed += Math.max(-26 * dt, Math.min(20 * dt, targetSpeed - car.speed));
      car.pos.x += Math.sin(car.yaw) * car.speed * dt;
      car.pos.z += Math.cos(car.yaw) * car.speed * dt;
      const fixed = this.city.resolveCircle(car.pos.x, car.pos.z, 1.7);
      car.pos.x = fixed.x;
      car.pos.z = fixed.z;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.yaw;
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.36;
      // Ram: contact with the player's car damages it and slows both.
      if (ctx.playerCar && dist < 3.4) {
        u.bumpTimer -= dt;
        if (u.bumpTimer <= 0) {
          ctx.playerCar.damage(6);
          car.speed *= 0.5;
          u.bumpTimer = 1.2;
        }
      }
      // On foot, a unit that catches the player hurts them.
      if (!ctx.playerCar && dist < 2.2) {
        u.bumpTimer -= dt;
        if (u.bumpTimer <= 0) {
          ctx.player.damage(10);
          u.bumpTimer = 1.5;
        }
      }
    }
    // Light bars flash red/blue.
    const t = performance.now() * 0.01;
    if (this.lightBars) {
      for (const bar of this.lightBars) {
        bar.material.color.setHex(Math.sin(t) > 0 ? 0xff2244 : 0x2244ff);
      }
    }
    // Air unit: hover above the player, rotor spinning, cone sweeping.
    if (this.airUnit && this.airUnit.group.visible) {
      const a = this.airUnit;
      a.x += ((ctx.px + 8) - a.x) * Math.min(1, dt * 0.8);
      a.z += ((ctx.pz - 10) - a.z) * Math.min(1, dt * 0.8);
      a.group.position.set(a.x, a.y + Math.sin(t * 0.5) * 1.5, a.z);
      this.rotor.rotation.y += dt * 22;
      this.airCone.rotation.y = t * 0.3;
    }
  }

  // What the HUD shows: units sorted by distance, with roles.
  listForHud(px, pz) {
    return this.units
      .map((u) => ({
        callsign: u.callsign,
        role: u.role,
        dist: Math.round(Math.hypot(u.car.pos.x - px, u.car.pos.z - pz)),
      }))
      .sort((a, b) => a.dist - b.dist);
  }
}
