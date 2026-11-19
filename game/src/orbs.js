// v7: Sun-Kissed Bay — header touch under recording 01a1f27b (file content unchanged).
// v6: Golden Hour Kings — header touch under recording 01a1f269 (file content unchanged).
// v5: Golden Hour — header touch under recording 01a1f255 (day-night cycle build; file content unchanged).
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Collectible neon orbs for Neon Bay: a side activity on top of the story jobs.
// Twelve glowing orbs hide on sidewalks and plazas around the city; walk through
// one to collect it for $50. They spin and bob so they catch the eye at night,
// show on the minimap as cyan dots, and stay collected across saves.
import * as THREE from 'three';
import { makeRng } from './random.js';
import { STREET_HALF, CITY_EXTENT } from './city.js';

const ORB_COLORS = [0x00e5ff, 0xff2d78, 0xffae00, 0x39ff88, 0xb300ff];
const ORB_COUNT = 12;
const ORB_VALUE = 50;

export class OrbSystem {
  constructor(scene, city, rngSeed = 555) {
    this.scene = scene;
    this.city = city;
    this.rng = makeRng(rngSeed);
    this.orbs = [];
    this.collected = 0;
    this._spawnOrbs();
  }

  _spawnOrbs() {
    const spots = this.rng.pickN(this._candidateSpots(), ORB_COUNT);
    for (let i = 0; i < spots.length; i++) {
      const color = ORB_COLORS[i % ORB_COLORS.length];
      const group = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55),
        new THREE.MeshBasicMaterial({ color }),
      );
      core.position.y = 1.4;
      group.add(core);
      // glow halo around the core
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this._glowTexture(color), transparent: true, opacity: 0.75, depthWrite: false,
      }));
      halo.scale.set(3.2, 3.2, 1);
      halo.position.y = 1.4;
      group.add(halo);
      // ground ring so the orb reads from a distance
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.05, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      group.add(ring);
      group.position.set(spots[i].x, 0, spots[i].z);
      this.scene.add(group);
      this.orbs.push({ group, core, ring, x: spots[i].x, z: spots[i].z, taken: false, phase: this.rng.range(0, Math.PI * 2) });
    }
  }

  _candidateSpots() {
    // street corners and plaza edges, on sidewalks so they are easy to reach
    const spots = [];
    const streets = [];
    for (let i = 0; i <= 9; i++) streets.push(-CITY_EXTENT + i * 48);
    for (const px of streets) {
      for (const pz of streets) {
        if (this.rng.chance(0.5)) continue;
        spots.push({
          x: px + (this.rng.chance(0.5) ? 1 : -1) * (STREET_HALF + 2.4),
          z: pz + this.rng.range(-16, 16),
        });
      }
    }
    return spots;
  }

  _glowTexture(color) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    const css = `#${color.toString(16).padStart(6, '0')}`;
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.3, css);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  // spin and bob; returns the number of orbs collected this frame
  update(dt, time, playerPos) {
    let picked = 0;
    for (const o of this.orbs) {
      if (o.taken) continue;
      o.core.rotation.y += dt * 2.2;
      o.core.rotation.x += dt * 0.9;
      o.core.position.y = 1.4 + Math.sin(time * 2 + o.phase) * 0.25;
      o.ring.scale.setScalar(1 + Math.sin(time * 3 + o.phase) * 0.15);
      const d = Math.hypot(playerPos.x - o.x, playerPos.z - o.z);
      if (d < 2.4) {
        o.taken = true;
        o.group.visible = false;
        this.collected += 1;
        picked += 1;
      }
    }
    return picked;
  }

  // how many are left, for the minimap
  remaining() {
    return this.orbs.filter((o) => !o.taken);
  }

  // restore a saved collection count (hides the first N orbs)
  setCollected(n) {
    let left = n;
    for (const o of this.orbs) {
      if (left <= 0) break;
      o.taken = true;
      o.group.visible = false;
      left -= 1;
    }
    this.collected = Math.min(n, this.orbs.length);
  }

  // put every orb back (a fresh night)
  reset() {
    for (const o of this.orbs) {
      o.taken = false;
      o.group.visible = true;
    }
    this.collected = 0;
  }

  // move two orbs close to a spot (screenshot staging)
  placeNear(x, z) {
    let placed = 0;
    for (const o of this.orbs) {
      if (o.taken || placed >= 2) continue;
      o.x = x + (placed === 0 ? 6 : -7);
      o.z = z + (placed === 0 ? 9 : -8);
      o.group.position.set(o.x, 0, o.z);
      placed += 1;
    }
  }
}

export { ORB_VALUE, ORB_COUNT };
