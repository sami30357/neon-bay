// v6: Golden Hour Kings — garage upgrades hook into CarDriver (top speed,
// acceleration, steering), under recording 01a1f269.
// v5: Golden Hour — header touch under recording 01a1f255 (day-night cycle build; file content unchanged).
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Cars for Neon Bay: a stylized box-built car factory (body, cabin, wheels, neon
// underglow, headlights and taillights) and arcade driving physics for the player.
// v2: richer models — grille, bumpers, mirrors, roof panel, exhaust, headlight
// light-cones — plus taxi and van variants, and per-car brake lights that flare
// when a traffic car stops.
import * as THREE from 'three';
import { makeRng } from './random.js';

export const CAR_COLORS = [
  0xff2d78, 0x00e5ff, 0xffae00, 0x39ff88, 0xb300ff, 0xff5e3a,
  0xe8e8f0, 0x222633, 0x7a1f2b, 0x1f4d6b, 0xd8d8d8, 0xffd75e,
];

function paintMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.75 });
}
const glassMat = new THREE.MeshStandardMaterial({ color: 0x0e1626, roughness: 0.08, metalness: 0.9 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8c4d8, roughness: 0.3, metalness: 0.9 });
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
const grilleMat = new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.4, metalness: 0.6 });
const bumperMat = new THREE.MeshStandardMaterial({ color: 0x181c28, roughness: 0.4, metalness: 0.6 });
const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x666e7a, roughness: 0.3, metalness: 0.9 });

export function createCarMesh({ color = 0xff2d78, underglow = 0x00e5ff, police = false, sport = false, taxi = false, van = false } = {}) {
  const group = new THREE.Group();
  const bodyMat = police
    ? new THREE.MeshStandardMaterial({ color: 0x10131f, roughness: 0.3, metalness: 0.7 })
    : taxi
      ? new THREE.MeshStandardMaterial({ color: 0xffc400, roughness: 0.28, metalness: 0.7 })
      : paintMaterial(color);
  const isVan = !!van;
  // body: vans are tall boxes, cars are low and long
  const body = new THREE.Mesh(
    isVan ? new THREE.BoxGeometry(2.1, 1.5, 4.4) : new THREE.BoxGeometry(2.0, 0.62, 4.4),
    bodyMat,
  );
  body.position.y = isVan ? 1.05 : 0.62;
  group.add(body);
  if (!isVan) {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), glassMat);
    cabin.position.set(0, 1.18, -0.25);
    group.add(cabin);
    // roof panel over the cabin
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 2.0), bodyMat);
    roof.position.set(0, 1.5, -0.25);
    group.add(roof);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.1), bodyMat);
    hood.position.set(0, 0.98, 1.5);
    group.add(hood);
  } else {
    // van windshield + side windows
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.1), glassMat);
    shield.position.set(0, 1.35, 2.22);
    group.add(shield);
    for (const sx of [-1.06, 1.06]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 2.6), glassMat);
      win.position.set(sx, 1.3, -0.3);
      group.add(win);
    }
  }
  // grille + bumpers + mirrors + exhaust
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.08), grilleMat);
  grille.position.set(0, isVan ? 0.75 : 0.62, 2.22);
  group.add(grille);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 0.18), bumperMat);
  bumperF.position.set(0, 0.34, 2.24);
  group.add(bumperF);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 0.18), bumperMat);
  bumperR.position.set(0, 0.34, -2.24);
  group.add(bumperR);
  for (const sx of [-1.06, 1.06]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.24), bumperMat);
    mirror.position.set(sx, isVan ? 1.35 : 1.05, 0.85);
    group.add(mirror);
  }
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8), exhaustMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0.7, 0.3, -2.3);
  group.add(exhaust);
  if (taxi) {
    // roof TAXI sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
    sign.position.set(0, 1.68, -0.25);
    group.add(sign);
    const checker = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    checker.position.set(0, 0.98, 0.4);
    group.add(checker);
  }
  if (police) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }));
    stripe.position.y = 0.78;
    group.add(stripe);
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    barBase.position.set(0, 1.52, -0.25);
    group.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.38), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
    red.position.set(-0.28, 1.56, -0.25);
    red.name = 'lightRed';
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.38), new THREE.MeshBasicMaterial({ color: 0x2255ff }));
    blue.position.set(0.28, 1.56, -0.25);
    blue.name = 'lightBlue';
    group.add(blue);
  }
  if (sport) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.5), bodyMat);
    spoiler.position.set(0, 1.28, -2.05);
    group.add(spoiler);
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.5), bodyMat);
    finL.position.set(-0.85, 1.05, -2.05);
    group.add(finL);
    const finR = finL.clone();
    finR.position.x = 0.85;
    group.add(finR);
  }
  // wheels (bigger on vans)
  const wheelR = isVan ? 0.44 : 0.38;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const positions = [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]];
  for (const [wx, wz] of positions) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(wx, wheelR, wz);
    group.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10), hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, wheelR, wz);
    group.add(hub);
  }
  // headlights + taillights (each car gets its own tail material so brake
  // lights can flare independently)
  const tailMat = new THREE.MeshBasicMaterial({ color: 0x7a0a14 });
  group.userData.tailMat = tailMat;
  group.userData.setBraking = (on) => {
    tailMat.color.setHex(on ? 0xff1a2e : 0x7a0a14);
  };
  for (const sx of [-0.62, 0.62]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
    h.position.set(sx, 0.72, 2.22);
    group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), tailMat);
    t.position.set(sx, 0.78, -2.22);
    group.add(t);
    // faint headlight cone on the road ahead
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 5, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.rotation.x = Math.PI / 2 + 0.12;
    cone.position.set(sx, 0.55, 4.6);
    group.add(cone);
  }
  // neon underglow
  if (underglow) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 5.0),
      new THREE.MeshBasicMaterial({ color: underglow, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.06;
    glow.name = 'underglow';
    group.add(glow);
  }
  group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return group;
}

// Arcade car physics: heading, speed, steering that tightens at low speed,
// handbrake drift, and simple building/traffic collision handled by the caller.
export class CarDriver {
  constructor(mesh) {
    this.mesh = mesh;
    this.heading = 0;
    this.speed = 0; // units per second, forward positive
    this.steer = 0;
    this.maxSpeed = 42;
    this.maxReverse = 12;
    // v6: garage upgrades — engine raises top speed + accel, handling sharpens
    // steering. applyUpgrades(engineLevel, handlingLevel) sets them.
    this.accelMul = 1;
    this.steerMul = 1;
  }

  applyUpgrades(engineLevel, handlingLevel) {
    this.maxSpeed = 42 + engineLevel * 5; // +5 u/s (~18 km/h) per engine level
    this.accelMul = 1 + 0.12 * engineLevel;
    this.steerMul = 1 + 0.12 * handlingLevel;
  }

  get position() { return this.mesh.position; }

  update(dt, input, city) {
    const throttle = input.axis('KeyS', 'KeyW');
    const steerInput = input.axis('KeyA', 'KeyD');
    const handbrake = input.down('Space');
    const accel = 26 * this.accelMul; // v6: engine upgrades raise acceleration
    if (throttle > 0) this.speed += accel * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= 34 * dt; // brake
      else this.speed -= 12 * dt; // reverse
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 9 * dt);
    }
    if (handbrake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 26 * dt);
    this.speed = Math.max(-this.maxReverse, Math.min(this.maxSpeed, this.speed));
    const steerTarget = steerInput * (handbrake ? 0.85 : 0.6) * this.steerMul; // v6: handling upgrades sharpen steering
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const speedFactor = Math.min(1, Math.abs(this.speed) / 14);
    this.heading -= this.steer * speedFactor * (this.speed >= 0 ? 1 : -1) * dt * 1.9;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let nx = this.mesh.position.x + fx * this.speed * dt;
    let nz = this.mesh.position.z + fz * this.speed * dt;
    const fixed = city.resolveCircle(nx, nz, 1.5);
    nx = fixed.x; nz = fixed.z;
    // stay inside the city
    nx = Math.max(-240, Math.min(240, nx));
    nz = Math.max(-240, Math.min(240, nz));
    this.mesh.position.x = nx;
    this.mesh.position.z = nz;
    this.mesh.rotation.y = this.heading;
    // body roll and pitch for feel
    this.mesh.rotation.z = -this.steer * 0.05 * speedFactor;
    this.mesh.rotation.x = throttle > 0 ? -0.02 : throttle < 0 ? 0.03 : 0;
    return { throttle, handbrake, crashed: false };
  }

  stop() { this.speed = 0; }
}

export function randomCarColor(rng) {
  return rng.pick(CAR_COLORS);
}

export function makeRngCar(rng, opts = {}) {
  const color = opts.color ?? randomCarColor(rng);
  const underglow = opts.police ? null : rng.pick([0x00e5ff, 0xff2d78, 0xffae00, 0x39ff88, null]);
  // traffic variety: yellow cabs, boxy vans and the odd sports car
  const variant = opts.variant ?? rng.weighted([['normal', 62], ['taxi', 14], ['van', 14], ['sport', 10]]);
  return createCarMesh({
    color, underglow, police: opts.police,
    sport: variant === 'sport' || opts.sport,
    taxi: variant === 'taxi',
    van: variant === 'van',
  });
}
