// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Wanted level and the Bay PD for Neon Bay: crimes raise stars, police cars and
// foot cops chase the player, and the heat dies down when the player stays clean
// and out of sight. Getting busted or wasted costs cash and clears the heat.
// v2: a police HELICOPTER with a searchlight joins the chase at 4+ stars, light
// bars are brighter, and every police car throws a red/blue pool of light on the
// wet road.
import * as THREE from 'three';
import { makeRng } from './random.js';
import { createCarMesh } from './cars.js';
import { CITY_EXTENT } from './city.js';

function poolTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class PoliceSystem {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.rng = makeRng(4242);
    this.wanted = 0;
    this.heatTimer = 0; // time since last crime
    this.cars = [];
    this.cops = [];
    this.heli = null; // {group, rotor, tailRotor, light, cone, beacon, hover}
    this.bustedTimer = 0;
    this.flashTimer = 0;
    this.nearby = false;
    this._poolTex = poolTexture();
  }

  get stars() { return this.wanted; }
  get heliActive() { return !!this.heli; }
  get heliPosition() {
    return this.heli ? { x: this.heli.group.position.x, z: this.heli.group.position.z } : null;
  }

  addCrime(level) {
    this.wanted = Math.min(5, this.wanted + level);
    this.heatTimer = 0;
    this._syncUnits();
  }

  clearWanted() {
    this.wanted = 0;
    this._syncUnits();
  }

  _desiredCars() {
    return [0, 1, 2, 3, 4, 5][this.wanted];
  }
  _desiredCops() {
    return [0, 1, 2, 3, 4, 8][this.wanted];
  }
  _desiredHeli() {
    return this.wanted >= 4 ? 1 : 0;
  }

  _syncUnits() {
    while (this.cars.length < this._desiredCars()) this._spawnCar();
    while (this.cops.length < this._desiredCops()) this._spawnCop();
    while (this.cars.length > this._desiredCars()) {
      const car = this.cars.pop();
      this.scene.remove(car.mesh);
      if (car.pool) this.scene.remove(car.pool);
    }
    while (this.cops.length > this._desiredCops()) {
      const cop = this.cops.pop();
      this.scene.remove(cop.mesh);
    }
    if (this._desiredHeli() === 1 && !this.heli) this._spawnHeli();
    if (this._desiredHeli() === 0 && this.heli) this._removeHeli();
  }

  _spawnCar() {
    const mesh = createCarMesh({ police: true });
    mesh.position.set(this.rng.range(-120, 120), 0, this.rng.range(-120, 120));
    this.scene.add(mesh);
    const light = new THREE.PointLight(0xff0022, 0, 40, 1.8);
    light.position.set(0, 2.2, 0);
    mesh.add(light);
    // red/blue pool of light on the road under the car
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 24),
      new THREE.MeshBasicMaterial({
        map: this._poolTex, color: 0xff0022, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(mesh.position.x, 0.06, mesh.position.z);
    this.scene.add(pool);
    this.cars.push({ mesh, speed: 0, heading: 0, light, lightTimer: this.rng.next(), pool });
  }

  _spawnCop() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x14204a, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.2, 8), bodyMat);
    body.position.y = 1.15;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9a986 }));
    head.position.y = 2.0;
    group.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x0a1230 }));
    cap.position.y = 2.2;
    group.add(cap);
    group.position.set(this.rng.range(-80, 80), 0, this.rng.range(-80, 80));
    this.scene.add(group);
    this.cops.push({ mesh: group, speed: this.rng.range(4.2, 5.6), grabTimer: 0 });
  }

  _spawnHeli() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdfe6f0, roughness: 0.4, metalness: 0.4, emissive: 0x8a96b8, emissiveIntensity: 0.55 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 5.2), bodyMat);
    body.position.y = 0;
    group.add(body);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.6), new THREE.MeshStandardMaterial({ color: 0x0e1626, roughness: 0.1, metalness: 0.9 }));
    glass.position.set(0, 0.35, 2.0);
    group.add(glass);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.35, 5.22), new THREE.MeshBasicMaterial({ color: 0xff2244 }));
    stripe.position.y = -0.1;
    group.add(stripe);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.6), bodyMat);
    boom.position.set(0, 0.3, -4.6);
    group.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.9), bodyMat);
    fin.position.set(0, 0.9, -6.8);
    group.add(fin);
    // skids
    for (const sx of [-1.1, 1.1]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx, -1.05, 0.4);
      group.add(skid);
    }
    // main rotor (spins) and tail rotor — light grey so the spinning disc reads at night
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x9aa2b5, emissive: 0x555e73, emissiveIntensity: 0.5 }));
    rotor.position.y = 1.05;
    group.add(rotor);
    const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 11), new THREE.MeshStandardMaterial({ color: 0x9aa2b5, emissive: 0x555e73, emissiveIntensity: 0.5 }));
    rotor2.position.y = 1.05;
    group.add(rotor2);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), bodyMat);
    mast.position.y = 0.85;
    group.add(mast);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x222633 }));
    tailRotor.position.set(0.35, 0.9, -6.8);
    group.add(tailRotor);
    // red beacon on the belly
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
    beacon.position.set(0, -0.85, 0);
    group.add(beacon);
    // searchlight: a real spotlight aimed at the street plus a visible cone
    const spot = new THREE.SpotLight(0xfff6d8, 900, 70, 0.32, 0.5, 1.4);
    spot.position.set(0, -0.8, 1.2);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, -28, 0);
    group.add(spotTarget);
    spot.target = spotTarget;
    group.add(spot);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(7, 28, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    cone.position.set(0, -14.8, 1.2);
    group.add(cone);
    group.position.set(0, 30, 0);
    this.scene.add(group);
    this.heli = { group, rotor, rotor2, tailRotor, spot, cone, beacon, hover: { x: 0, z: 0 }, phase: 0 };
  }

  _removeHeli() {
    if (!this.heli) return;
    this.scene.remove(this.heli.group);
    this.heli = null;
  }

  // place the helicopter exactly (screenshot staging); it holds position
  // like the staged police cars instead of drifting up out of frame
  placeHeli(x, y, z) {
    if (!this.heli) return;
    this.heli.group.position.set(x, y, z);
    this.heli.hover = { x, z };
    this.heli.staged = true;
  }

  // respawn far units near the player so the chase never goes stale
  _respawnFarUnits(playerPos) {
    for (const car of this.cars) {
      const d = Math.hypot(car.mesh.position.x - playerPos.x, car.mesh.position.z - playerPos.z);
      if (d > 190) {
        const a = this.rng.range(0, Math.PI * 2);
        car.mesh.position.set(playerPos.x + Math.cos(a) * 120, 0, playerPos.z + Math.sin(a) * 120);
      }
    }
    for (const cop of this.cops) {
      const d = Math.hypot(cop.mesh.position.x - playerPos.x, cop.mesh.position.z - playerPos.z);
      if (d > 150) {
        const a = this.rng.range(0, Math.PI * 2);
        cop.mesh.position.set(playerPos.x + Math.cos(a) * 70, 0, playerPos.z + Math.sin(a) * 70);
      }
    }
  }

  update(dt, playerPos, playerInCar, playerSpeed) {
    this.heatTimer += dt;
    this.flashTimer += dt;
    // heat dies down: 25s clean and no police within 45 units
    if (this.wanted > 0 && this.heatTimer > 25) {
      let nearest = Infinity;
      for (const car of this.cars) nearest = Math.min(nearest, Math.hypot(car.mesh.position.x - playerPos.x, car.mesh.position.z - playerPos.z));
      for (const cop of this.cops) nearest = Math.min(nearest, Math.hypot(cop.mesh.position.x - playerPos.x, cop.mesh.position.z - playerPos.z));
      if (nearest > 45) {
        this.wanted -= 1;
        this.heatTimer = 0;
        this._syncUnits();
      }
    }
    this._respawnFarUnits(playerPos);
    this.nearby = false;
    for (const car of this.cars) this._updateCar(car, dt, playerPos, playerInCar, playerSpeed);
    let busted = false;
    for (const cop of this.cops) {
      const d = Math.hypot(cop.mesh.position.x - playerPos.x, cop.mesh.position.z - playerPos.z);
      if (d < 60) this.nearby = true;
      if (!playerInCar && d < 1.8) {
        cop.grabTimer += dt;
        if (cop.grabTimer > 1.6) busted = true;
      } else {
        cop.grabTimer = 0;
      }
      this._updateCop(cop, dt, playerPos);
    }
    if (this.heli) this._updateHeli(dt, playerPos);
    return { busted };
  }

  _updateHeli(dt, playerPos) {
    const h = this.heli;
    h.phase += dt;
    // hover above the player's street, trailing slightly behind their motion
    // (staged screenshot helicopters hold the exact spot they were placed at)
    if (!h.staged) {
      const tx = playerPos.x, tz = playerPos.z;
      h.group.position.x += (tx - h.group.position.x) * Math.min(1, dt * 1.6);
      h.group.position.z += (tz - h.group.position.z) * Math.min(1, dt * 1.6);
      h.group.position.y += (30 - h.group.position.y) * Math.min(1, dt * 1.2);
    }
    h.group.rotation.y = Math.atan2(playerPos.x - h.group.position.x, playerPos.z - h.group.position.z) + Math.PI;
    h.rotor.rotation.y += dt * 28;
    h.rotor2.rotation.y += dt * 28;
    h.tailRotor.rotation.x += dt * 40;
    h.beacon.visible = (Math.sin(h.phase * 6) > 0);
    // the searchlight cone sways a little, scanning the street
    h.cone.rotation.z = Math.sin(h.phase * 0.7) * 0.08;
    this.nearby = true;
  }

  _updateCar(car, dt, playerPos, playerInCar, playerSpeed) {
    const dx = playerPos.x - car.mesh.position.x;
    const dz = playerPos.z - car.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 60) this.nearby = true;
    // staged cars (screenshot chase) hold their spot; only the light bar flashes
    if (!car.staged) {
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const want = this.wanted >= 3 ? 34 : this.wanted >= 2 ? 29 : 24;
    const targetSpeed = dist > 6 ? want : want * 0.5;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
    let nx = car.mesh.position.x + Math.sin(car.heading) * car.speed * dt;
    let nz = car.mesh.position.z + Math.cos(car.heading) * car.speed * dt;
    const fixed = this.city.resolveCircle(nx, nz, 1.5);
    car.mesh.position.x = fixed.x;
    car.mesh.position.z = fixed.z;
    car.mesh.rotation.y = car.heading;
    }
    // flashing light bar — brighter than v1, and the road pool flashes with it
    car.lightTimer += dt;
    const phase = Math.floor(car.lightTimer * 6) % 2 === 0;
    car.light.color.setHex(phase ? 0xff0022 : 0x2255ff);
    car.light.intensity = 170;
    const red = car.mesh.getObjectByName('lightRed');
    const blue = car.mesh.getObjectByName('lightBlue');
    if (red && blue) {
      red.material.color.setHex(phase ? 0xff0022 : 0x550000);
      blue.material.color.setHex(phase ? 0x000055 : 0x2255ff);
    }
    if (car.pool) {
      car.pool.position.set(car.mesh.position.x, 0.06, car.mesh.position.z);
      car.pool.material.color.setHex(phase ? 0xff0022 : 0x2255ff);
    }
  }

  _updateCop(cop, dt, playerPos) {
    const dx = playerPos.x - cop.mesh.position.x;
    const dz = playerPos.z - cop.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.5) {
      cop.mesh.position.x += (dx / dist) * cop.speed * dt;
      cop.mesh.position.z += (dz / dist) * cop.speed * dt;
      cop.mesh.rotation.y = Math.atan2(dx, dz);
    }
    const fixed = this.city.resolveCircle(cop.mesh.position.x, cop.mesh.position.z, 0.5);
    cop.mesh.position.x = fixed.x;
    cop.mesh.position.z = fixed.z;
  }

  // police ram the player car: returns impact speed for damage
  ramCheck(playerPos, radius) {
    let impact = 0;
    for (const car of this.cars) {
      const d = Math.hypot(car.mesh.position.x - playerPos.x, car.mesh.position.z - playerPos.z);
      if (d < radius + 1.7) impact = Math.max(impact, car.speed);
    }
    return impact;
  }
}
