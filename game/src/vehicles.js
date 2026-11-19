// Solmara Bay — cars.
// One clear job: everything with four wheels. A car is a mesh, an arcade
// drive model and a health bar; the manager below spawns them, moves traffic
// and hands the player's car to the game loop.
import * as THREE from 'three';
import { CARS } from './config.js';
import { blobTexture } from './textures.js';

let CAR_ID = 0;

export class Vehicle {
  constructor(scene, def, x, z, yaw) {
    this.id = ++CAR_ID;
    this.def = def;
    this.scene = scene;
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = yaw;
    this.speed = 0;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.driver = 'none'; // 'none' | 'parked' | 'ped' | 'player' | 'police'
    this.wrecked = false;
    this.group = new THREE.Group();
    this._buildMesh(def);
    scene.add(this.group);
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 2.6),
      new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    this.group.add(blob);
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
  }

  // A low-poly car: body, cabin, wheels, lights. Sports cars sit lower and
  // longer; vans sit taller. The shape reads at a glance in a screenshot.
  _buildMesh(def) {
    const low = def.kind === 'sports' || def.kind === 'coupe';
    const tall = def.kind === 'van';
    const bodyH = tall ? 1.15 : low ? 0.62 : 0.8;
    const bodyY = tall ? 0.85 : low ? 0.5 : 0.62;
    const paint = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.35, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.15, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, bodyH, 4.4), paint);
    body.position.y = bodyY;
    this.group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 2.2), glass);
    cabin.position.set(0, bodyY + bodyH / 2 + 0.28, -0.2);
    this.group.add(cabin);
    // Headlights and taillights.
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc });
    for (const sx of [-0.65, 0.65]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
      head.position.set(sx, bodyY + 0.05, 2.22);
      this.group.add(head);
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.16, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xff2244 }),
      );
      tail.position.set(sx, bodyY + 0.05, -2.22);
      this.group.add(tail);
    }
    // Wheels that spin with speed.
    this.wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.36, wz);
      this.group.add(wheel);
      this.wheels.push(wheel);
    }
    // A roof rack on the pickup, a spoiler on the sports cars.
    if (def.kind === 'pickup') {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x2a2e38 }));
      rack.position.set(0, bodyY + bodyH / 2 + 0.1, -1.2);
      this.group.add(rack);
    }
    if (def.kind === 'sports') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      wing.position.set(0, bodyY + 0.55, -2.1);
      this.group.add(wing);
    }
  }

  get condition() { return Math.max(0, this.hp / this.maxHp); }

  // Arcade drive: W accelerates, S brakes or reverses, A/D steer harder the
  // slower you go. Returns the distance travelled this frame.
  drive(dt, throttle, steer, gripBonus) {
    if (this.wrecked) { this.speed *= Math.max(0, 1 - 3 * dt); return 0; }
    const grip = this.def.grip + (gripBonus || 0);
    const top = this.def.top + (this.topBonus || 0);
    if (throttle > 0) this.speed += this.def.accel * throttle * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= 34 * dt;
      else this.speed = Math.max(-12, this.speed - 12 * dt);
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 9 * dt);
    }
    this.speed = Math.max(-12, Math.min(top, this.speed));
    const steerAmount = steer * grip * (this.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(this.speed) / 8 + 0.25);
    this.yaw += steerAmount * dt * 1.9;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const dx = fx * this.speed * dt;
    const dz = fz * this.speed * dt;
    this.pos.x += dx;
    this.pos.z += dz;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    for (const w of this.wheels) w.rotation.x += (this.speed * dt) / 0.36;
    return Math.hypot(dx, dz);
  }

  damage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.wrecked = true;
    }
  }

  repair(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (this.hp > 0) this.wrecked = false;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}

// --- The manager: traffic, parked cars, entering, carjacking. ---
export class VehicleManager {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.all = [];
    this.playerCar = null;
    this.carjack = null; // { car, timer } while a carjack is in progress
  }

  spawnInitial() {
    // Parked cars along the streets, ready to steal.
    const spots = [
      [-30, 200, 0], [150, 190, 1], [-150, -60, 2], [30, -120, 3],
      [60, 60, 4], [-90, 30, 5], [120, -150, 0], [-180, 120, 2],
      [90, 210, 1], [-60, -180, 3], [180, 30, 4], [0, 150, 5],
    ];
    for (const [x, z, ci] of spots) {
      const def = CARS[ci % CARS.length];
      const car = new Vehicle(this.scene, def, x, z, this.rng.range(0, Math.PI * 2));
      car.driver = 'parked';
      this.all.push(car);
    }
    // Moving traffic: cars that loop the street grid.
    for (let i = 0; i < 14; i++) this._spawnTrafficCar();
  }

  _spawnTrafficCar() {
    const rng = this.rng;
    const street = rng.pick(this.city.streetPositions);
    const along = rng.chance(0.5);
    const x = along ? rng.range(-180, 180) : street;
    const z = along ? street : rng.range(-180, 180);
    const yaw = along ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const car = new Vehicle(this.scene, rng.pick(CARS), x, z, yaw);
    car.driver = 'ped';
    car.cruise = rng.range(9, 14);
    car.target = this._nextTarget(car);
    this.all.push(car);
    return car;
  }

  _nextTarget(car) {
    const rng = this.rng;
    const street = rng.pick(this.city.streetPositions);
    const along = rng.chance(0.5);
    return along
      ? { x: rng.range(-180, 180), z: street }
      : { x: street, z: rng.range(-180, 180) };
  }

  nearestCar(pos, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of this.all) {
      if (car.wrecked) continue;
      const d = Math.hypot(car.pos.x - pos.x, car.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  // The player takes a car. A parked car opens at once; a moving car with a
  // driver takes a short beat while the driver flees.
  tryEnter(car, onCarjack) {
    if (!car || this.playerCar) return false;
    if (car.driver === 'ped') {
      this.carjack = { car, timer: 0.7 };
      if (onCarjack) onCarjack(car);
      return true;
    }
    this.playerCar = car;
    car.driver = 'player';
    car.speed = 0;
    return true;
  }

  exitCar() {
    const car = this.playerCar;
    if (!car) return null;
    this.playerCar = null;
    car.driver = 'none';
    car.speed = 0;
    // Step out to the driver's side.
    const sx = car.pos.x + Math.cos(car.yaw) * 1.6;
    const sz = car.pos.z - Math.sin(car.yaw) * 1.6;
    return { x: sx, z: sz };
  }

  update(dt, input, cameraYaw, city) {
    // Finish a carjack in progress.
    if (this.carjack) {
      this.carjack.timer -= dt;
      this.carjack.car.speed *= Math.max(0, 1 - 4 * dt);
      if (this.carjack.timer <= 0) {
        const car = this.carjack.car;
        car.driver = 'player';
        this.playerCar = car;
        car.speed = 0;
        this.carjack = null;
      }
    }
    // Drive the player's car.
    if (this.playerCar) {
      const axes = input.moveAxes();
      const throttle = axes.y;
      const steer = -axes.x;
      this.playerCar.drive(dt, throttle, steer, 0);
      const fixed = city.resolveCircle(this.playerCar.pos.x, this.playerCar.pos.z, 1.7);
      const hitWall = fixed.x !== this.playerCar.pos.x || fixed.z !== this.playerCar.pos.z;
      if (hitWall) {
        if (Math.abs(this.playerCar.speed) > 8) this.playerCar.damage(Math.abs(this.playerCar.speed) * 0.6);
        this.playerCar.speed *= -0.25;
      }
      this.playerCar.pos.x = fixed.x;
      this.playerCar.pos.z = fixed.z;
      this.playerCar.group.position.copy(this.playerCar.pos);
    }
    // Traffic: cruise toward the target, turn at intersections, keep distance.
    for (const car of this.all) {
      if (car.driver !== 'ped' || car === this.playerCar) continue;
      const t = car.target;
      const dx = t.x - car.pos.x;
      const dz = t.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 6) { car.target = this._nextTarget(car); continue; }
      const wantYaw = Math.atan2(dx, dz);
      let dyaw = wantYaw - car.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      car.yaw += Math.max(-1.6 * dt, Math.min(1.6 * dt, dyaw));
      // Slow down if another car is right ahead.
      let ahead = false;
      for (const other of this.all) {
        if (other === car) continue;
        const ox = other.pos.x - car.pos.x;
        const oz = other.pos.z - car.pos.z;
        const along = ox * Math.sin(car.yaw) + oz * Math.cos(car.yaw);
        const side = Math.abs(ox * Math.cos(car.yaw) - oz * Math.sin(car.yaw));
        if (along > 0 && along < 9 && side < 2.4) { ahead = true; break; }
      }
      const targetSpeed = ahead ? 0 : car.cruise;
      car.speed += Math.max(-20 * dt, Math.min(12 * dt, targetSpeed - car.speed));
      car.pos.x += Math.sin(car.yaw) * car.speed * dt;
      car.pos.z += Math.cos(car.yaw) * car.speed * dt;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.yaw;
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.36;
    }
    void cameraYaw;
  }
}
