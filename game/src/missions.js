// v8: Solmara Bay — re-authored in this session under recording 01a1f524 (2026-11-20).
// Job 11 (TIDE RUNNER) added, eleven jobs total. Job 11's four steps
// (boardwalk checkpoint → tide crate at Pier 7 → deliver to Vex at the
// marina in a car → lose the cops) verified end to end, 11/11 complete.
// v7: Sun-Kissed Bay — header touch under recording 01a1f27b (file content unchanged; street races are a separate system in races.js).
// v6: Golden Hour Kings — Jobs 9-10 added (HIGH TIDE, GOLDEN HOUR KINGS finale),
// ten jobs total, under recording 01a1f269.
// v5: Golden Hour — Job 8 added, under recording 01a1f255.
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Story missions for Neon Bay. Rook works for fixer Vex Marlowe across eleven jobs:
// drive, steal, fight, outrun the law, a tower finale, a night driving a cab, a
// five-star coronation run, a dawn getaway in the Sunrise GT, a marina run under
// four-star heat, a golden-hour jewel heist at Meridian Tower, and a tide-crate
// run down the boardwalk at Pier 7. Each job pays cash and unlocks the next.
// Objectives show as a 3D beacon, a minimap marker and HUD text.
import * as THREE from 'three';
import { makeRng } from './random.js';

export const MISSIONS = [
  {
    id: 1, title: 'NEON RUN',
    intro: 'Vex: Rook. First job. A package waits at Pier 7 — drive there, grab it, bring it to the noodle bar on Volt Row. No cops, no noise. $300 in it for you.',
    reward: 300,
    steps: [
      { text: 'Drive to the pickup at Pier 7', target: { x: -168, z: -168 }, radius: 6, kind: 'drive' },
      { text: 'Package collected! Deliver it to the noodle bar on Volt Row', target: { x: 120, z: 72 }, radius: 6, kind: 'drive' },
    ],
  },
  {
    id: 2, title: 'HOT WHEELS',
    intro: 'Vex: A Volt GT — candy-pink, one of one — sits in the lot by the casino. Steal it, Rook. Walk up, press E, and bring it to Garage 9. Cops will notice. $500.',
    reward: 500,
    steps: [
      { text: 'Steal the Volt GT from the casino lot', target: { x: 168, z: -120 }, radius: 5, kind: 'steal', car: 'volt' },
      { text: 'Deliver the Volt GT to Garage 9', target: { x: -72, z: 168 }, radius: 6, kind: 'deliver' },
    ],
  },
  {
    id: 3, title: 'RAIN CHECK',
    intro: 'Vex: The Hollow Boys took my stash in the alley behind Club Volt. Go on foot. Three of them, and they swing first. Get my stash back. $600.',
    reward: 600,
    steps: [
      { text: 'Go to the alley behind Club Volt', target: { x: 72, z: -24 }, radius: 5, kind: 'goto' },
      { text: 'Fight off the Hollow Boys (3)', target: { x: 72, z: -24 }, radius: 12, kind: 'fight', count: 3 },
      { text: 'Collect the stash', target: { x: 72, z: -24 }, radius: 4, kind: 'collect' },
    ],
  },
  {
    id: 4, title: 'BLACKOUT',
    intro: 'Vex: The grid job. Hit three checkpoints across the bay while the heat is on you — I will make sure the PD is looking. Then lose them. $800, and my respect.',
    reward: 800,
    steps: [
      { text: 'Hit checkpoint 1 — Meridian Crossing', target: { x: -120, z: 24 }, radius: 6, kind: 'drive' },
      { text: 'Hit checkpoint 2 — the old pier road', target: { x: 24, z: -168 }, radius: 6, kind: 'drive' },
      { text: 'Hit checkpoint 3 — Neon Row', target: { x: 168, z: 120 }, radius: 6, kind: 'drive' },
      { text: 'Lose the cops — get your wanted level to zero', target: null, radius: 0, kind: 'escape' },
    ],
  },
  {
    id: 5, title: 'THE LAST LIGHT',
    intro: 'Vex: Last job, Rook. The Meridian Tower ledger — the thing that owns this city. Drive there, go in on foot, take it from the guards, and get out clean. $1,500. Then we are legends.',
    reward: 1500,
    steps: [
      { text: 'Drive to Meridian Tower', target: { x: -24, z: -72 }, radius: 7, kind: 'drive' },
      { text: 'Fight through the tower guards (4)', target: { x: -24, z: -72 }, radius: 14, kind: 'fight', count: 4 },
      { text: 'Grab the ledger', target: { x: -24, z: -72 }, radius: 4, kind: 'collect' },
      { text: 'Escape to Vex at the pier — wanted or not', target: { x: -168, z: 168 }, radius: 6, kind: 'drive' },
    ],
  },
  {
    id: 6, title: 'CAB CALL',
    intro: 'Vex: The cab company lost every driver tonight — the rain, the cops, the usual. Take the yellow cab, Rook, and run three fares across the bay. Keep the meter running and the passengers smiling. $700.',
    reward: 700,
    steps: [
      { text: 'Pick up fare 1 outside Club Volt', target: { x: 72, z: 72 }, radius: 6, kind: 'drive' },
      { text: 'Drop fare 1 at Hotel Lumen', target: { x: -120, z: -120 }, radius: 6, kind: 'drive' },
      { text: 'Pick up fare 2 at the casino', target: { x: 168, z: -72 }, radius: 6, kind: 'drive' },
      { text: 'Drop fare 2 at Pier 9', target: { x: -168, z: 120 }, radius: 6, kind: 'drive' },
      { text: 'Pick up fare 3 on Neon Row', target: { x: 120, z: 168 }, radius: 6, kind: 'drive' },
      { text: 'Drop fare 3 at Meridian Tower', target: { x: -24, z: -72 }, radius: 6, kind: 'drive' },
    ],
  },
  {
    id: 7, title: 'KING OF THE BAY',
    intro: 'Vex: One last run, Rook — the whole PD will be on you, helicopter and all. Three checkpoints, five stars of heat, and then lose them all. Do this and the city is yours. $2,500.',
    reward: 2500,
    steps: [
      { text: 'Hit checkpoint 1 — the old pier road (5 stars!)', target: { x: 24, z: -168 }, radius: 6, kind: 'drive' },
      { text: 'Hit checkpoint 2 — Meridian Crossing', target: { x: -120, z: 24 }, radius: 6, kind: 'drive' },
      { text: 'Hit checkpoint 3 — Neon Row', target: { x: 168, z: 120 }, radius: 6, kind: 'drive' },
      { text: 'Lose the cops AND the helicopter — wanted level to zero', target: null, radius: 0, kind: 'escape' },
    ],
  },
  {
    id: 8, title: 'GOLDEN HOUR',
    intro: 'Vex: Dawn job, Rook. A Sunrise GT — gold on gold — sits at the marina, and the whole city will be watching the sky. Steal it before the sun is up and bring it to me at the pier. $1,500, and the sunrise is yours.',
    reward: 1500,
    steps: [
      { text: 'Steal the Sunrise GT from the marina', target: { x: 168, z: 168 }, radius: 5, kind: 'steal', car: 'sunrise' },
      { text: 'Deliver the Sunrise GT to Vex at the pier', target: { x: -168, z: 168 }, radius: 6, kind: 'deliver' },
    ],
  },
  {
    id: 9, title: 'HIGH TIDE',
    intro: 'Vex: The tide crate is coming in at the marina, Rook — and the PD knows it too. Run the marina checkpoints under four stars of heat, grab the crate, then lose them all. $2,000.',
    reward: 2000,
    steps: [
      { text: 'Hit checkpoint 1 — Marina Gate (4 stars!)', target: { x: 168, z: 120 }, radius: 6, kind: 'drive' },
      { text: 'Hit checkpoint 2 — the boardwalk', target: { x: 120, z: 168 }, radius: 6, kind: 'drive' },
      { text: 'Grab the tide crate at the marina', target: { x: 168, z: 168 }, radius: 4, kind: 'collect' },
      { text: 'Lose the cops — get your wanted level to zero', target: null, radius: 0, kind: 'escape' },
    ],
  },
  {
    id: 10, title: 'GOLDEN HOUR KINGS',
    intro: 'Vex: Last one, Rook — the Celeste Crown, the jewel that owns this city, sits in Meridian Tower under guard. Take it at golden hour, fight your way out, and bring it to me at the pier with the whole PD on you. $3,000. Kings of the golden hour.',
    reward: 3000,
    steps: [
      { text: 'Reach Meridian Tower at golden hour', target: { x: -24, z: -72 }, radius: 7, kind: 'drive' },
      { text: 'Fight through the tower guards (5)', target: { x: -24, z: -72 }, radius: 14, kind: 'fight', count: 5 },
      { text: 'Steal the Celeste Crown jewel', target: { x: -24, z: -72 }, radius: 4, kind: 'collect' },
      { text: 'Escape 5-star heat to Vex at the pier', target: { x: -168, z: 168 }, radius: 6, kind: 'drive' },
    ],
  },
  {
    id: 11, title: 'TIDE RUNNER',
    intro: 'Vex: One more, Rook — the tide crate lands on Pier 7 tonight, and every crew in the bay wants it. Run the boardwalk, grab the crate at the pier, bring it to me at the marina with the whole PD on you. $3,500. Make it legendary.',
    reward: 3500,
    steps: [
      { text: 'Hit checkpoint 1 — the boardwalk', target: { x: 120, z: 216 }, radius: 6, kind: 'drive' },
      { text: 'Grab the tide crate at Pier 7', target: { x: 24, z: 216 }, radius: 5, kind: 'collect' },
      { text: 'Deliver the crate to Vex at the marina', target: { x: 168, z: 168 }, radius: 6, kind: 'deliver' },
      { text: 'Lose the cops — get your wanted level to zero', target: null, radius: 0, kind: 'escape' },
    ],
  },
];

export class Missions {
  constructor(scene) {
    this.scene = scene;
    this.completed = 0; // index of next mission (0..11)
    this.active = null; // {def, stepIndex, fightLeft, ...}
    this.beacon = null;
    this.marker = null;
    this.rng = makeRng(2024);
    this._buildBeacon();
  }

  _buildBeacon() {
    const geo = new THREE.CylinderGeometry(2.2, 2.2, 60, 20, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd75e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
    });
    this.beacon = new THREE.Mesh(geo, mat);
    this.beacon.visible = false;
    this.scene.add(this.beacon);
    const ringGeo = new THREE.RingGeometry(3.4, 4.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.marker = new THREE.Mesh(ringGeo, ringMat);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  get currentDef() { return MISSIONS[this.completed] ?? null; }
  get done() { return this.completed >= MISSIONS.length; }

  startNext() {
    const def = this.currentDef;
    if (!def) return null;
    this.active = { def, stepIndex: 0, fightLeft: 0, spawned: false };
    this._placeBeacon();
    return def;
  }

  currentStep() {
    if (!this.active) return null;
    return this.active.def.steps[this.active.stepIndex] ?? null;
  }

  currentTarget() {
    const step = this.currentStep();
    return step ? step.target : null;
  }

  _placeBeacon() {
    const step = this.currentStep();
    if (!step || !step.target) { this.beacon.visible = false; this.marker.visible = false; return; }
    this.beacon.position.set(step.target.x, 30, step.target.z);
    this.marker.position.set(step.target.x, 0.06, step.target.z);
    this.beacon.visible = true;
    this.marker.visible = true;
  }

  // called every frame; returns an event string or null
  update(dt, playerPos, playerInCar, wanted) {
    if (!this.active) return null;
    const step = this.currentStep();
    if (!step) return null;
    if (this.beacon.visible) {
      this.beacon.rotation.y += dt * 0.8;
      this.marker.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.12);
    }
    if (step.kind === 'escape') {
      if (wanted === 0) return this._advance();
      return null;
    }
    if (step.kind === 'fight') {
      if (this.active.fightLeft <= 0 && this.active.spawned) return this._advance();
      return null;
    }
    if (!step.target) return null;
    const d = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
    if (step.kind === 'steal') return null; // completed by stealing the car
    if (step.kind === 'deliver' && !playerInCar) return null;
    if (d < step.radius) return this._advance();
    return null;
  }

  _advance() {
    this.active.stepIndex += 1;
    if (this.active.stepIndex >= this.active.def.steps.length) {
      const reward = this.active.def.reward;
      this.completed += 1;
      this.active = null;
      this.beacon.visible = false;
      this.marker.visible = false;
      return { type: 'missionComplete', reward };
    }
    this._placeBeacon();
    return { type: 'stepComplete', step: this.currentStep() };
  }

  // external triggers
  onCarStolen(kind) {
    if (!this.active) return null;
    const step = this.currentStep();
    if (step && step.kind === 'steal' && step.car === kind) return this._advance();
    return null;
  }

  onEnemyDown() {
    if (!this.active) return;
    const step = this.currentStep();
    if (step && step.kind === 'fight' && this.active.fightLeft > 0) {
      this.active.fightLeft -= 1;
    }
  }

  beginFight(count) {
    if (this.active) {
      this.active.fightLeft = count;
      this.active.spawned = true;
    }
  }
}
