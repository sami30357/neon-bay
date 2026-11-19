// Solmara Bay — the SKYHAWK helicopter.
// One clear job: the one aircraft in the game. It sits on the ground helipad
// by the marina; E climbs in, W/S and A/D fly it, and it lands on either
// helipad. The player cannot step out over deep water.
import * as THREE from 'three';

export class Heli {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.group = new THREE.Group();
    this.pos = new THREE.Vector3(150, 0.3, 150);
    this.yaw = 0;
    this.vy = 0;
    this.speed = 0;
    this.flying = false;
    this.occupied = false;
    this._buildMesh();
    scene.add(this.group);
    this.group.position.copy(this.pos);
  }

  _buildMesh() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.4, metalness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 5.0), bodyMat);
    body.position.y = 1.2;
    this.group.add(body);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.9, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x88ccee, roughness: 0.2, metalness: 0.4 }),
    );
    glass.position.set(0, 1.4, 1.9);
    this.group.add(glass);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 3.8), bodyMat);
    tail.position.set(0, 1.4, -4.0);
    this.group.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 1.0), bodyMat);
    fin.position.set(0, 2.2, -5.6);
    this.group.add(fin);
    // Main rotor and tail rotor.
    this.rotor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    this.rotor.position.y = 2.3;
    this.group.add(this.rotor);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.3), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    tailRotor.position.set(0.4, 2.2, -5.6);
    this.group.add(tailRotor);
    // Skids.
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.7 });
    for (const sx of [-1.1, 1.1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 4.4), skidMat);
      skid.position.set(sx, 0.15, 0);
      this.group.add(skid);
    }
    // Searchlight under the nose.
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff2cc }),
    );
    light.position.set(0, 0.6, 2.4);
    this.group.add(light);
    this.searchlight = light;
  }

  get isAirborne() { return this.flying && this.pos.y > 2; }
  // Deep water: the bay past the beach.
  overDeepWater() { return this.pos.z > 252; }

  enter() {
    this.occupied = true;
    this.flying = true;
  }

  exit() {
    if (this.overDeepWater()) return false;
    this.occupied = false;
    return true;
  }

  // Fly: W/S pitch forward and back, A/D yaw, Shift up, Ctrl down. The heli
  // settles onto a helipad when it descends low over one.
  update(dt, input) {
    this.rotor.rotation.y += dt * (this.occupied ? 26 : 4);
    if (!this.occupied) return;
    const axes = input.moveAxes();
    const up = input.down('ShiftLeft') || input.down('ShiftRight');
    const down = input.down('ControlLeft') || input.down('ControlRight');
    // Remember whether the pilot is climbing: tryLand must not snap the heli
    // back onto the pad while the pilot is holding climb, or it could never
    // lift off the pad it sits on.
    this.climbing = up;
    // Forward speed from pitch.
    const targetSpeed = axes.y * 26;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 1.6);
    this.yaw -= axes.x * dt * 1.4;
    this.pos.x += Math.sin(this.yaw) * this.speed * dt;
    this.pos.z += Math.cos(this.yaw) * this.speed * dt;
    // Vertical: climb, descend, hover. A brisk climb — at low frame rates
    // the loop's dt cap (0.05) makes the game run slower than real time, so
    // a gentle climb would barely lift off in a second of holding Shift.
    if (up) this.vy += 24 * dt;
    else if (down) this.vy -= 24 * dt;
    else this.vy += (0 - this.vy) * Math.min(1, dt * 1.2);
    this.vy = Math.max(-12, Math.min(14, this.vy));
    this.pos.y += this.vy * dt;
    // Never below the ground, never past the water wall, never out of the island.
    const minY = 0.3;
    if (this.pos.y < minY) { this.pos.y = minY; this.vy = 0; }
    if (this.pos.y > 90) { this.pos.y = 90; this.vy = 0; }
    this.pos.x = Math.max(-216, Math.min(216, this.pos.x));
    this.pos.z = Math.max(-216, Math.min(320, this.pos.z));
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = Math.max(-0.18, Math.min(0.18, -axes.y * 0.14));
    this.group.rotation.z = Math.max(-0.22, Math.min(0.22, axes.x * 0.18));
  }

  // --- Landing: snap onto a helipad when low and close. ---
  // Returns 'roof' | 'ground' | null.
  tryLand() {
    // No landing snap while the pilot is holding climb — the heli sits on a
    // pad at spawn, and snapping every frame would pin it to the ground.
    if (this.climbing) return null;
    const city = this.city;
    if (city.helipadRoof) {
      const r = city.helipadRoof;
      const d = Math.hypot(this.pos.x - r.x, this.pos.z - r.z);
      if (d < 5 && Math.abs(this.pos.y - r.y) < 3) {
        this.pos.set(r.x, r.y, r.z);
        this.vy = 0;
        this.speed = 0;
        this.flying = false;
        this.group.position.copy(this.pos);
        return 'roof';
      }
    }
    if (city.helipadGround) {
      const g = city.helipadGround;
      const d = Math.hypot(this.pos.x - g.x, this.pos.z - g.z);
      if (d < 5 && this.pos.y < 2.5) {
        this.pos.set(g.x, 0.3, g.z);
        this.vy = 0;
        this.speed = 0;
        this.flying = false;
        this.group.position.copy(this.pos);
        return 'ground';
      }
    }
    return null;
  }

  // Park back on the ground pad (used by the shot stager and the reset).
  parkGround() {
    const g = this.city.helipadGround || { x: 150, z: 150 };
    this.pos.set(g.x, 0.3, g.z);
    this.yaw = 0;
    this.vy = 0;
    this.speed = 0;
    this.flying = false;
    this.occupied = false;
    this.group.position.copy(this.pos);
    this.group.rotation.set(0, 0, 0);
  }
}
