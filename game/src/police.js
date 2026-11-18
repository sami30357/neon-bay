// Wanted level and the Bay PD for Neon Bay: crimes raise stars, police cars and
// foot cops chase the player, and the heat dies down when the player stays clean
// and out of sight. Getting busted or wasted costs cash and clears the heat.
import * as THREE from 'three';
import { makeRng } from './random.js';
import { createCarMesh } from './cars.js';
import { CITY_EXTENT } from './city.js';

export class PoliceSystem {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.rng = makeRng(4242);
    this.wanted = 0;
    this.heatTimer = 0; // time since last crime
    this.cars = [];
    this.cops = [];
    this.bustedTimer = 0;
    this.flashTimer = 0;
    this.nearby = false;
  }

  get stars() { return this.wanted; }

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
    return [0, 1, 2, 3, 4, 6][this.wanted];
  }

  _syncUnits() {
    while (this.cars.length < this._desiredCars()) this._spawnCar();
    while (this.cops.length < this._desiredCops()) this._spawnCop();
    while (this.cars.length > this._desiredCars()) {
      const car = this.cars.pop();
      this.scene.remove(car.mesh);
    }
    while (this.cops.length > this._desiredCops()) {
      const cop = this.cops.pop();
      this.scene.remove(cop.mesh);
    }
  }

  _spawnCar() {
    const mesh = createCarMesh({ police: true });
    mesh.position.set(this.rng.range(-120, 120), 0, this.rng.range(-120, 120));
    this.scene.add(mesh);
    const light = new THREE.PointLight(0xff0022, 0, 40, 1.8);
    light.position.set(0, 2.2, 0);
    mesh.add(light);
    this.cars.push({ mesh, speed: 0, heading: 0, light, lightTimer: this.rng.next() });
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
    return { busted };
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
    // flashing light bar
    car.lightTimer += dt;
    const phase = Math.floor(car.lightTimer * 6) % 2 === 0;
    car.light.color.setHex(phase ? 0xff0022 : 0x2255ff);
    car.light.intensity = phase ? 90 : 90;
    const red = car.mesh.getObjectByName('lightRed');
    const blue = car.mesh.getObjectByName('lightBlue');
    if (red && blue) {
      red.material.color.setHex(phase ? 0xff0022 : 0x550000);
      blue.material.color.setHex(phase ? 0x000055 : 0x2255ff);
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
