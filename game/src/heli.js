// v8: Solmara Bay — re-authored in this session under recording 01a1f524 (2026-11-20).
// The SKYHAWK now flies out over the bay (south bound z 240 → 320) and the
// exit guard refuses to step out over deep water (z > 252), so the heli owns
// the sky over Solmara Bay but never strands Rook in the sea.
// v7: Sun-Kissed Bay — the flyable player helicopter ("SKYHAWK", gold/white),
// under recording 01a1f27b. Built on the police helicopter's shape (body,
// glass, boom, fin, skids, main + tail rotors, beacon) with its own livery:
// gold body, white stripe, gold beacon. HeliDriver is arcade flight — W/S
// thrust, A/D yaw, Space climb, Shift descend — with rooftop collision
// (slides over towers) and a pad-level floor so it can actually land.
import * as THREE from 'three';

// gold/white SKYHAWK livery — distinct from the police white/red heli
export function createPlayerHeliMesh() {
  const group = new THREE.Group();
  // group origin is at skid level: parked, group.y is the pad height and the
  // skids rest on the ground. All parts sit +1.05 above the police layout.
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffd75e, roughness: 0.35, metalness: 0.55, emissive: 0x6a5518, emissiveIntensity: 0.25 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.35, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 5.2), bodyMat);
  body.position.y = 1.05;
  group.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.6), new THREE.MeshStandardMaterial({ color: 0x0e1626, roughness: 0.1, metalness: 0.9 }));
  glass.position.set(0, 1.4, 2.0);
  group.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.35, 5.22), new THREE.MeshBasicMaterial({ color: 0xf2f4f8 }));
  stripe.position.y = 0.95;
  group.add(stripe);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.6), bodyMat);
  boom.position.set(0, 1.35, -4.6);
  group.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.9), whiteMat);
  fin.position.set(0, 1.95, -6.8);
  group.add(fin);
  // skids
  for (const sx of [-1.1, 1.1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, 0, 0.4);
    group.add(skid);
  }
  // main rotor (spins) and tail rotor
  const rotorMat = new THREE.MeshStandardMaterial({ color: 0x9aa2b5, emissive: 0x555e73, emissiveIntensity: 0.5 });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), rotorMat);
  rotor.position.y = 2.1;
  group.add(rotor);
  const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 11), rotorMat);
  rotor2.position.y = 2.1;
  group.add(rotor2);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), bodyMat);
  mast.position.y = 1.9;
  group.add(mast);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x222633 }));
  tailRotor.position.set(0.35, 1.95, -6.8);
  group.add(tailRotor);
  // gold beacon on the belly
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd75e }));
  beacon.position.set(0, 0.2, 0);
  group.add(beacon);
  // SKYHAWK titles on both flanks
  const labelTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 64);
    g.font = '900 40px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#1a2030';
    g.fillText('SKYHAWK', 128, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  for (const sx of [-1, 1]) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.85),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, side: THREE.DoubleSide }),
    );
    label.position.set(sx * 1.32, 1.05, 0.4);
    label.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(label);
  }
  group.userData = { rotor, rotor2, tailRotor, beacon };
  return group;
}

export class HeliDriver {
  constructor(mesh, pad) {
    this.mesh = mesh;
    this.pad = pad; // {x, z} ground helipad — the only place it can land
    this.x = pad.x;
    this.z = pad.z;
    this.y = 0.26; // skid height above ground; parked on the pad (top ~0.26)
    this.heading = 0;
    this.speed = 0; // forward speed, units per second
    this.vy = 0; // vertical speed
    this.phase = 0;
    this._syncMesh();
  }

  get position() { return this.mesh.position; }

  get landed() {
    // on the pad (or near the ground) and slow — safe to step out
    return this.y <= 0.6 && Math.abs(this.speed) < 2;
  }

  update(dt, input, city) {
    const thrust = input.axis('KeyS', 'KeyW'); // W forward, S brake/back
    const yaw = input.axis('KeyA', 'KeyD'); // A left, D right
    const climb = input.down('Space') ? 1 : 0;
    const descend = (input.down('ShiftLeft') || input.down('ShiftRight')) ? 1 : 0;
    // yaw: D turns right, like the cars
    this.heading -= yaw * 1.5 * dt;
    if (thrust > 0) this.speed += 18 * dt;
    else if (thrust < 0) this.speed -= 24 * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 3 * dt);
    this.speed = Math.max(-6, Math.min(30, this.speed)); // ~108 km/h flat out
    // vertical: climb ~8 u/s, descend ~8 u/s, otherwise hover
    const targetVy = (climb - descend) * 8;
    this.vy += (targetVy - this.vy) * Math.min(1, dt * 4);
    this.y += this.vy * dt;
    // move along the heading
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;
    // rooftop collision: slide over a tower instead of clipping through it
    for (const b of city.buildings) {
      if (Math.abs(this.x - b.x) < b.w / 2 + 1.5 && Math.abs(this.z - b.z) < b.d / 2 + 1.5) {
        if (this.y < b.h + 2) { this.y = b.h + 2; if (this.vy < 0) this.vy = 0; }
      }
    }
    // stay inside the city; the floor is pad level over the helipad (so it
    // can land) and 2.5 everywhere else, ceiling 120
    const nearPad = Math.hypot(this.x - this.pad.x, this.z - this.pad.z) < 9;
    const minY = nearPad ? 0.26 : 2.5;
    if (this.y < minY) { this.y = minY; if (this.vy < 0) this.vy = 0; }
    if (this.y > 120) { this.y = 120; if (this.vy > 0) this.vy = 0; }
    this.x = Math.max(-240, Math.min(240, this.x));
    // v8: the heli can fly out over the bay (z to 320) — the waterline stops
    // everyone else, but the SKYHAWK owns the sky over Solmara Bay
    this.z = Math.max(-240, Math.min(320, this.z));
    this._syncMesh();
    // rotors spin, beacon blinks, nose dips a touch with speed
    this.phase += dt;
    const u = this.mesh.userData;
    if (u.rotor) { u.rotor.rotation.y += dt * 30; u.rotor2.rotation.y += dt * 30; }
    if (u.tailRotor) u.tailRotor.rotation.x += dt * 40;
    if (u.beacon) u.beacon.visible = (Math.sin(this.phase * 6) > 0);
    const speedFactor = Math.min(1, Math.abs(this.speed) / 30);
    this.mesh.rotation.x = 0.1 * speedFactor * (this.speed >= 0 ? 1 : -1);
    this.mesh.rotation.z = -yaw * 0.06;
  }

  // park it back on its pad (load / respawn): no save needed, it always
  // starts the night at home
  park() {
    this.x = this.pad.x;
    this.z = this.pad.z;
    this.y = 0.26;
    this.heading = 0;
    this.speed = 0;
    this.vy = 0;
    this._syncMesh();
  }

  _syncMesh() {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.heading;
  }
}
