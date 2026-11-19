// Solmara Bay — pedestrians.
// One clear job: the people on the sidewalks and the beach. They walk their
// own routes, scatter when a car screams past, and come back when it is calm.
import * as THREE from 'three';

const SKINS = [0xe8b98a, 0xc98f6a, 0x8a5a3a, 0xf2c9a0];
const SHIRTS = [0xff5e3a, 0x00b4d8, 0xffd75e, 0x39ff88, 0xff2d78, 0xffffff, 0xb300ff, 0x2e6b8a];

export class Pedestrians {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.list = [];
  }

  spawnInitial(count = 26) {
    for (let i = 0; i < count; i++) {
      const street = this.rng.pick(this.city.streetPositions);
      const along = this.rng.chance(0.5);
      const x = along ? this.rng.range(-180, 180) : street + (this.rng.chance(0.5) ? 8 : -8);
      const z = along ? street + (this.rng.chance(0.5) ? 8 : -8) : this.rng.range(-180, 180);
      this._makePed(x, z);
    }
    // A few people already enjoying the beach.
    for (const [x, z] of [[-100, 238], [40, 244], [130, 236], [-170, 244]]) {
      this._makePed(x, z, true);
    }
  }

  _makePed(x, z, beach = false) {
    const rng = this.rng;
    const g = new THREE.Group();
    const shirt = rng.pick(SHIRTS);
    const skin = rng.pick(SKINS);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.38, 1.05, 8),
      new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 }),
    );
    body.position.y = 1.1;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 10, 8),
      new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 }),
    );
    head.position.y = 1.9;
    g.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), new THREE.MeshStandardMaterial({ color: 0x2a2e38 }));
    legL.position.set(-0.15, 0.35, 0);
    g.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.15;
    g.add(legR);
    g.position.set(x, 0, z);
    g.rotation.y = rng.range(0, Math.PI * 2);
    this.scene.add(g);
    const ped = {
      group: g, legL, legR,
      x, z, yaw: g.rotation.y,
      speed: rng.range(1.1, 1.9),
      target: null,
      flee: 0,
      beach,
      phase: rng.range(0, Math.PI * 2),
    };
    ped.target = this._nextTarget(ped);
    this.list.push(ped);
    return ped;
  }

  _nextTarget(ped) {
    const rng = this.rng;
    if (ped.beach) {
      return { x: rng.range(-190, 190), z: rng.range(228, 248) };
    }
    const street = rng.pick(this.city.streetPositions);
    const along = rng.chance(0.5);
    return along
      ? { x: rng.range(-180, 180), z: street + (rng.chance(0.5) ? 8 : -8) }
      : { x: street + (rng.chance(0.5) ? 8 : -8), z: rng.range(-180, 180) };
  }

  // A scare: run away from the point for a couple of seconds.
  scare(x, z, radius = 14) {
    for (const ped of this.list) {
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < radius) {
        ped.flee = 2.5;
        ped.target = {
          x: ped.x + (ped.x - x) / Math.max(1, d) * 30,
          z: ped.z + (ped.z - z) / Math.max(1, d) * 30,
        };
      }
    }
  }

  update(dt, t) {
    for (const ped of this.list) {
      const dx = ped.target.x - ped.x;
      const dz = ped.target.z - ped.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        ped.target = this._nextTarget(ped);
        continue;
      }
      const wantYaw = Math.atan2(dx, dz);
      let dyaw = wantYaw - ped.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      ped.yaw += Math.max(-3 * dt, Math.min(3 * dt, dyaw));
      const speed = ped.flee > 0 ? ped.speed * 2.6 : ped.speed;
      if (ped.flee > 0) ped.flee -= dt;
      ped.x += Math.sin(ped.yaw) * speed * dt;
      ped.z += Math.cos(ped.yaw) * speed * dt;
      // Stay on the island and out of the water.
      ped.x = Math.max(-210, Math.min(210, ped.x));
      ped.z = Math.max(-210, Math.min(249, ped.z));
      ped.group.position.set(ped.x, 0, ped.z);
      ped.group.rotation.y = ped.yaw;
      // Walk-cycle swing.
      const swing = Math.sin(t * 6 + ped.phase) * 0.5;
      ped.legL.rotation.x = swing;
      ped.legR.rotation.x = -swing;
    }
  }

  // How many people are within a radius of a point (used by the HUD and tests).
  countNear(x, z, radius) {
    let n = 0;
    for (const ped of this.list) {
      if (Math.hypot(ped.x - x, ped.z - z) < radius) n++;
    }
    return n;
  }
}
