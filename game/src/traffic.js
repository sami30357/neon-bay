// Traffic and pedestrians for Neon Bay: cars cruise the street grid on lanes and
// pedestrians stroll the sidewalks, fleeing when the player causes trouble.
// v2: busier streets (20 cars, 36 pedestrians), pedestrian variety — heights,
// skin tones, hats, and umbrellas in the rain — working brake lights, and a horn
// that scatters nearby pedestrians.
import * as THREE from 'three';
import { makeRng } from './random.js';
import { makeRngCar } from './cars.js';
import { STREET_STEP, STREET_HALF, CITY_EXTENT } from './city.js';

export class TrafficSystem {
  constructor(scene, city, rngSeed = 777) {
    this.scene = scene;
    this.city = city;
    this.rng = makeRng(rngSeed);
    this.cars = [];
    this.peds = [];
    this._spawnCars(20);
    this._spawnPeds(36);
  }

  _randomStreet() {
    return -CITY_EXTENT + this.rng.int(0, 9) * STREET_STEP;
  }

  _spawnCars(count) {
    for (let i = 0; i < count; i++) {
      const mesh = makeRngCar(this.rng);
      const horizontal = this.rng.chance(0.5);
      const street = this._randomStreet();
      const lane = (this.rng.chance(0.5) ? 1 : -1) * 2.8;
      const t = this.rng.range(-CITY_EXTENT, CITY_EXTENT);
      const heading = horizontal ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI);
      mesh.position.set(horizontal ? t : street + lane, 0, horizontal ? street + lane : t);
      mesh.rotation.y = heading;
      this.scene.add(mesh);
      this.cars.push({
        mesh, horizontal, street, lane,
        speed: this.rng.range(7, 12),
        heading,
        stopTimer: 0,
      });
    }
  }

  _spawnPeds(count) {
    const pedColors = [0xffd75e, 0x7df9ff, 0xff9ad5, 0xb8ffce, 0xe8e8f0, 0xff8a5c, 0xff5e3a, 0x9d7bff];
    const skinTones = [0xd9a986, 0x8a5a3b, 0xf0c8a0, 0x6b4423, 0xe8b98a];
    const umbrellaColors = [0xff2d78, 0x00e5ff, 0xffae00, 0x39ff88, 0xb300ff];
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const height = this.rng.range(0.88, 1.14);
      const bodyMat = new THREE.MeshStandardMaterial({ color: this.rng.pick(pedColors), roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.15, 8), bodyMat);
      body.position.y = 1.15;
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshStandardMaterial({ color: this.rng.pick(skinTones), roughness: 0.7 }));
      head.position.y = 1.95;
      group.add(head);
      // a hat on some, an umbrella over some — it is raining, after all
      if (this.rng.chance(0.22)) {
        const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.14, 10), new THREE.MeshStandardMaterial({ color: this.rng.pick([0x222633, 0x7a1f2b, 0x1f4d6b]), roughness: 0.85 }));
        hat.position.y = 2.14;
        group.add(hat);
      }
      let umbrella = null;
      if (this.rng.chance(0.3)) {
        umbrella = new THREE.Mesh(
          new THREE.ConeGeometry(0.85, 0.45, 12, 1, true),
          new THREE.MeshStandardMaterial({ color: this.rng.pick(umbrellaColors), roughness: 0.5, side: THREE.DoubleSide }),
        );
        umbrella.position.y = 2.55;
        group.add(umbrella);
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        stick.position.y = 2.2;
        group.add(stick);
      }
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1e2e, roughness: 0.9 });
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), legMat);
      legL.position.set(-0.12, 0.3, 0);
      group.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.12;
      group.add(legR);
      group.scale.setScalar(height);
      const x = this._randomStreet() + (this.rng.chance(0.5) ? 1 : -1) * (STREET_HALF + 1.6);
      const z = this.rng.range(-CITY_EXTENT, CITY_EXTENT);
      group.position.set(x, 0, z);
      this.scene.add(group);
      this.peds.push({
        mesh: group, speed: this.rng.range(1.2, 2.4),
        dirX: 0, dirZ: this.rng.chance(0.5) ? 1 : -1,
        alongStreet: this.rng.chance(0.5),
        target: null, fleeing: false, fleeTimer: 0,
        fallen: false, fallTimer: 0, alive: true,
        phase: this.rng.range(0, Math.PI * 2),
        umbrella, legL, legR,
      });
    }
  }

  update(dt, playerPos, playerSpeed, time) {
    this._updateCars(dt, playerPos);
    this._updatePeds(dt, playerPos, time);
  }

  _updateCars(dt, playerPos) {
    for (const car of this.cars) {
      if (car.stopTimer > 0) {
        car.stopTimer -= dt;
        if (car.mesh.userData.setBraking) car.mesh.userData.setBraking(true);
        continue;
      }
      // slow down for the car ahead on the same lane
      let blocked = false;
      for (const other of this.cars) {
        if (other === car || other.horizontal !== car.horizontal || other.street !== car.street || other.lane !== car.lane) continue;
        const along = car.horizontal ? (other.mesh.position.x - car.mesh.position.x) : (other.mesh.position.z - car.mesh.position.z);
        const forward = car.horizontal ? Math.sin(car.heading) : Math.cos(car.heading);
        if (along * forward > 0 && along * forward < 9) { blocked = true; break; }
      }
      if (car.mesh.userData.setBraking) car.mesh.userData.setBraking(blocked);
      const speed = blocked ? 0 : car.speed;
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      let nx = car.mesh.position.x + fx * speed * dt;
      let nz = car.mesh.position.z + fz * speed * dt;
      // wrap around the city edge and sometimes turn at an intersection
      if (nx > CITY_EXTENT + 12 || nx < -CITY_EXTENT - 12 || nz > CITY_EXTENT + 12 || nz < -CITY_EXTENT - 12) {
        const horizontal = this.rng.chance(0.5);
        const street = this._randomStreet();
        const lane = (this.rng.chance(0.5) ? 1 : -1) * 2.8;
        const t = -CITY_EXTENT - 6;
        car.horizontal = horizontal; car.street = street; car.lane = lane;
        car.heading = horizontal ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI);
        nx = horizontal ? t : street + lane;
        nz = horizontal ? street + lane : t;
      }
      // random pauses at intersections
      const nearIntersection = Math.abs(((car.horizontal ? nz : nx) % STREET_STEP + STREET_STEP) % STREET_STEP) < 2;
      if (nearIntersection && this.rng.chance(0.002)) car.stopTimer = this.rng.range(1, 3);
      car.mesh.position.x = nx;
      car.mesh.position.z = nz;
      car.mesh.rotation.y = car.heading;
    }
  }

  _updatePeds(dt, playerPos, time) {
    for (const ped of this.peds) {
      if (!ped.alive) continue;
      if (ped.fallen) {
        ped.fallTimer -= dt;
        if (ped.fallTimer <= 0) {
          // get up and walk away
          ped.fallen = false;
          ped.mesh.rotation.x = 0;
          ped.mesh.position.y = 0;
        }
        continue;
      }
      const dx = ped.mesh.position.x - playerPos.x;
      const dz = ped.mesh.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 14 && !ped.fleeing) { ped.fleeing = true; ped.fleeTimer = 4; }
      if (ped.fleeing) {
        ped.fleeTimer -= dt;
        const len = Math.max(0.01, dist);
        ped.mesh.position.x += (dx / len) * 5.5 * dt;
        ped.mesh.position.z += (dz / len) * 5.5 * dt;
        ped.mesh.rotation.y = Math.atan2(dx, dz);
        if (ped.fleeTimer <= 0) ped.fleeing = false;
      } else {
        const speed = ped.speed;
        if (ped.alongStreet) {
          ped.mesh.position.z += ped.dirZ * speed * dt;
          if (Math.abs(ped.mesh.position.z) > CITY_EXTENT + 8) ped.dirZ *= -1;
        } else {
          ped.mesh.position.x += ped.dirZ * speed * dt;
          if (Math.abs(ped.mesh.position.x) > CITY_EXTENT + 8) ped.dirZ *= -1;
        }
        ped.mesh.rotation.y = ped.alongStreet ? (ped.dirZ > 0 ? 0 : Math.PI) : (ped.dirZ > 0 ? Math.PI / 2 : -Math.PI / 2);
        // leg swing (legs are stored on the record: hats/umbrellas shift children)
        const swing = Math.sin(time * 7 + ped.phase) * 0.5;
        if (ped.legL) ped.legL.rotation.x = swing;
        if (ped.legR) ped.legR.rotation.x = -swing;
      }
      const fixed = this.city.resolveCircle(ped.mesh.position.x, ped.mesh.position.z, 0.5);
      ped.mesh.position.x = fixed.x;
      ped.mesh.position.z = fixed.z;
    }
  }

  // horn: nearby pedestrians scatter, nearby drivers pause for a beat
  honkFlee(x, z) {
    for (const ped of this.peds) {
      if (!ped.alive || ped.fallen) continue;
      const d = Math.hypot(ped.mesh.position.x - x, ped.mesh.position.z - z);
      if (d < 12) { ped.fleeing = true; ped.fleeTimer = 3; }
    }
    for (const car of this.cars) {
      const d = Math.hypot(car.mesh.position.x - x, car.mesh.position.z - z);
      if (d < 10 && car.stopTimer <= 0) car.stopTimer = 1.2;
    }
  }

  // a pedestrian is hit by a car or a punch: they fall over
  knockDownPed(ped) {
    if (!ped || ped.fallen || !ped.alive) return false;
    ped.fallen = true;
    ped.fallTimer = 3;
    ped.mesh.rotation.x = Math.PI / 2;
    ped.mesh.position.y = 0.3;
    return true;
  }

  nearestPed(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const ped of this.peds) {
      if (!ped.alive || ped.fallen) continue;
      const d = Math.hypot(ped.mesh.position.x - x, ped.mesh.position.z - z);
      if (d < bestD) { bestD = d; best = ped; }
    }
    return best;
  }

  nearestCar(x, z, maxDist, excludeMesh = null) {
    let best = null, bestD = maxDist;
    for (const car of this.cars) {
      if (car.mesh === excludeMesh) continue;
      const d = Math.hypot(car.mesh.position.x - x, car.mesh.position.z - z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  // simple car-vs-car push so traffic does not overlap the player car
  collidePlayerCar(px, pz, radius) {
    for (const car of this.cars) {
      const dx = px - car.mesh.position.x, dz = pz - car.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < radius + 1.6 && d > 0.01) {
        const push = (radius + 1.6 - d) * 0.5;
        car.mesh.position.x -= (dx / d) * push;
        car.mesh.position.z -= (dz / d) * push;
      }
    }
  }
}
