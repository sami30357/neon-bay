// Solmara Bay — street races.
// One clear job: three closed loops with checkpoints, a timer and a payout.
// A race runs while the player is in a car; the checkpoints are glowing
// rings on the road, and the minimap shows the next one.
import * as THREE from 'three';
import { RACES } from './config.js';
import { glowTexture } from './textures.js';

export class Races {
  constructor(scene) {
    this.scene = scene;
    this.active = null; // { race, cp, start, best }
    this.won = new Set();
    this.bestTimes = {};
    this.rings = [];
    this._buildRings();
  }

  _buildRings() {
    // One ring mesh per checkpoint, reused across races.
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.28, 10, 28),
        new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.9 }),
      );
      ring.visible = false;
      this.scene.add(ring);
      this.rings.push(ring);
    }
    // A glow sprite at the active checkpoint.
    this.marker = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), color: 0x39ff88, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    this.marker.scale.set(12, 12, 1);
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  start(raceId, now) {
    const race = RACES.find((r) => r.id === raceId);
    if (!race || this.active) return false;
    this.active = { race, cp: 0, start: now, laps: 0 };
    this._showCheckpoint();
    return true;
  }

  _showCheckpoint() {
    const a = this.active;
    if (!a) {
      for (const r of this.rings) r.visible = false;
      this.marker.visible = false;
      return;
    }
    const pts = a.race.checkpoints;
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (i < pts.length) {
        ring.position.set(pts[i][0], 1.6, pts[i][1]);
        ring.visible = i === a.cp;
      } else {
        ring.visible = false;
      }
    }
    const [x, z] = pts[a.cp];
    this.marker.position.set(x, 3, z);
    this.marker.visible = true;
  }

  // Per-frame: watch the checkpoint, advance, finish. Returns the payout
  // when a race is won, or 0.
  update(dt, t, ctx) {
    if (!this.active) return 0;
    const a = this.active;
    const [x, z] = a.race.checkpoints[a.cp];
    const d = Math.hypot(x - ctx.px, z - ctx.pz);
    // Pulse the active ring.
    const ring = this.rings[a.cp];
    if (ring) {
      ring.rotation.y += dt * 1.5;
      ring.material.opacity = 0.65 + Math.sin(t * 4) * 0.25;
    }
    if (d > 5) return 0;
    a.cp += 1;
    if (ctx.onCheckpoint) ctx.onCheckpoint(a.race, a.cp);
    if (a.cp >= a.race.checkpoints.length) {
      const elapsed = ctx.now - a.start;
      const prev = this.bestTimes[a.race.id];
      if (!prev || elapsed < prev) this.bestTimes[a.race.id] = elapsed;
      this.won.add(a.race.id);
      const pay = a.race.pay;
      this.active = null;
      this._showCheckpoint();
      if (ctx.onWin) ctx.onWin(a.race, elapsed, pay);
      return pay;
    }
    this._showCheckpoint();
    return 0;
  }

  // What the HUD shows: the active race, or the list of races with best times.
  hudState(now) {
    if (this.active) {
      const a = this.active;
      return {
        active: true,
        name: a.race.name,
        cp: a.cp,
        total: a.race.checkpoints.length,
        elapsed: now - a.start,
      };
    }
    return {
      active: false,
      list: RACES.map((r) => ({
        id: r.id,
        name: r.name,
        pay: r.pay,
        won: this.won.has(r.id),
        best: this.bestTimes[r.id] || null,
      })),
    };
  }

  cancel() {
    this.active = null;
    this._showCheckpoint();
  }
}
