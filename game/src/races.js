// v8: Solmara Bay — re-authored in this session under recording 01a1f524 (2026-11-20).
// The races still run at the pier flag, and Job 11's boardwalk run is a
// mission, not a race.
// v7: Sun-Kissed Bay — street races, a new gameplay system, under recording
// 01a1f27b. Three checkpoint races start at the checkered flag on the pier
// (x:-168, z:120): drive the rings in order, beat the par for the full payout,
// over par pays half. Green beacons mark the next checkpoint (gold is the
// missions' colour); the flag, the race panel and the minimap marker all
// follow the active race.
import * as THREE from 'three';

export const RACE_FLAG = { x: -168, z: 120 };

export const RACES = [
  {
    id: 1, name: 'PIER SPRINT',
    intro: 'Vex: Street races, Rook — the pier crowd runs them at night. Four checkpoints, seventy-five seconds on the clock. Win it and the crowd pays $400.',
    checkpoints: [
      { x: -168, z: -24 }, { x: -24, z: -24 }, { x: -24, z: 120 }, { x: 120, z: 120 },
    ],
    par: 75, reward: 400,
  },
  {
    id: 2, name: 'NEON LOOP',
    intro: 'Vex: Second race, bigger loop — six checkpoints right around the bay, two minutes on the clock. $700 to the winner, and the crowd is watching.',
    checkpoints: [
      { x: -168, z: -168 }, { x: 24, z: -168 }, { x: 24, z: 24 },
      { x: 168, z: 24 }, { x: 168, z: 168 }, { x: -24, z: 168 },
    ],
    par: 120, reward: 700,
  },
  {
    id: 3, name: 'BAY GRAND PRIX',
    intro: 'Vex: The big one, Rook — eight checkpoints, the whole city, three minutes. A grand on the line. Win this and nobody in Neon Bay doubts you.',
    checkpoints: [
      { x: -168, z: -168 }, { x: 120, z: -168 }, { x: 120, z: 24 },
      { x: -72, z: 24 }, { x: -72, z: 168 }, { x: 168, z: 168 },
      { x: 168, z: -72 }, { x: -24, z: -72 },
    ],
    par: 180, reward: 1000,
  },
];

export function fmtRaceTime(t) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class RaceSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = null; // {def, index, checkpointIndex, timer}
    this.racesDone = []; // race ids finished at least once
    this.bestTimes = {}; // race id -> best seconds
    this._buildBeacon();
    this._buildFlagRing();
  }

  _buildBeacon() {
    // green, so it never reads as a mission beacon (gold)
    const geo = new THREE.CylinderGeometry(2.2, 2.2, 60, 20, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x39ff88, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
    });
    this.beacon = new THREE.Mesh(geo, mat);
    this.beacon.visible = false;
    this.scene.add(this.beacon);
    const ringGeo = new THREE.RingGeometry(3.4, 4.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.marker = new THREE.Mesh(ringGeo, ringMat);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  _buildFlagRing() {
    // checkered-flag spot on the pier: a white ring on the road where races start
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3, 3.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(RACE_FLAG.x, 0.06, RACE_FLAG.z);
    this.scene.add(ring);
    this.flagRing = ring;
  }

  // first race not yet finished, or race 1 again once all three are done
  nextRaceIndex() {
    for (let i = 0; i < RACES.length; i++) {
      if (!this.racesDone.includes(RACES[i].id)) return i;
    }
    return 0;
  }

  startRace(index) {
    const def = RACES[index];
    if (!def) return null;
    this.active = { def, index, checkpointIndex: 0, timer: 0 };
    this._placeBeacon();
    return def;
  }

  currentTarget() {
    if (!this.active) return null;
    return this.active.def.checkpoints[this.active.checkpointIndex] ?? null;
  }

  _placeBeacon() {
    const t = this.currentTarget();
    if (!t) { this.beacon.visible = false; this.marker.visible = false; return; }
    this.beacon.position.set(t.x, 30, t.z);
    this.marker.position.set(t.x, 0.06, t.z);
    this.beacon.visible = true;
    this.marker.visible = true;
  }

  // called every frame while playing; returns an event or null
  update(dt, playerPos) {
    if (!this.active) return null;
    const a = this.active;
    a.timer += dt;
    if (this.beacon.visible) {
      this.beacon.rotation.y += dt * 0.8;
      this.marker.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.12);
    }
    const target = this.currentTarget();
    if (!target) return null;
    const d = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
    if (d >= 8) return null;
    a.checkpointIndex += 1;
    if (a.checkpointIndex >= a.def.checkpoints.length) {
      const time = a.timer;
      const underPar = time <= a.def.par;
      const reward = underPar ? a.def.reward : Math.floor(a.def.reward / 2);
      if (!this.racesDone.includes(a.def.id)) this.racesDone.push(a.def.id);
      const best = this.bestTimes[a.def.id];
      if (best === undefined || time < best) this.bestTimes[a.def.id] = Math.round(time * 10) / 10;
      const def = a.def;
      this.active = null;
      this.beacon.visible = false;
      this.marker.visible = false;
      return { type: 'raceComplete', race: def, time, underPar, reward };
    }
    this._placeBeacon();
    return { type: 'checkpoint', race: a.def, checkpoint: a.checkpointIndex, total: a.def.checkpoints.length };
  }

  serialize() {
    return { done: this.racesDone.slice(), best: { ...this.bestTimes } };
  }

  restore(data) {
    if (!data) return;
    if (Array.isArray(data.done)) this.racesDone = data.done.slice();
    if (data.best) this.bestTimes = { ...data.best };
  }

  reset() {
    this.active = null;
    this.racesDone = [];
    this.bestTimes = {};
    this.beacon.visible = false;
    this.marker.visible = false;
  }
}
