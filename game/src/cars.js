// Cars for Neon Bay: a stylized box-built car factory (body, cabin, wheels, neon
// underglow, headlights and taillights) and arcade driving physics for the player.
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
const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1a2e });

export function createCarMesh({ color = 0xff2d78, underglow = 0x00e5ff, police = false, sport = false } = {}) {
  const group = new THREE.Group();
  const bodyMat = police
    ? new THREE.MeshStandardMaterial({ color: 0x10131f, roughness: 0.3, metalness: 0.7 })
    : paintMaterial(color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), glassMat);
  cabin.position.set(0, 1.18, -0.25);
  group.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.1), bodyMat);
  hood.position.set(0, 0.98, 1.5);
  group.add(hood);
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
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const positions = [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]];
  for (const [wx, wz] of positions) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10), hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, 0.38, wz);
    group.add(hub);
  }
  // headlights + taillights
  for (const sx of [-0.62, 0.62]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
    h.position.set(sx, 0.72, 2.22);
    group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), tailMat);
    t.position.set(sx, 0.78, -2.22);
    group.add(t);
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
  }

  get position() { return this.mesh.position; }

  update(dt, input, city) {
    const throttle = input.axis('KeyS', 'KeyW');
    const steerInput = input.axis('KeyA', 'KeyD');
    const handbrake = input.down('Space');
    const accel = 26;
    if (throttle > 0) this.speed += accel * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= 34 * dt; // brake
      else this.speed -= 12 * dt; // reverse
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 9 * dt);
    }
    if (handbrake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 26 * dt);
    this.speed = Math.max(-this.maxReverse, Math.min(this.maxSpeed, this.speed));
    const steerTarget = steerInput * (handbrake ? 0.85 : 0.6);
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
  return createCarMesh({ color, underglow, police: opts.police, sport: opts.sport });
}
