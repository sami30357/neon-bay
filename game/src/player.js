// Solmara Bay — the player on foot.
// One clear job: the person you walk around as. Movement, jumping, health and
// armour live here; driving lives in vehicles.js, and the game loop decides
// which one is in charge.
import * as THREE from 'three';
import { blobTexture } from './textures.js';

export class Player {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.pos = new THREE.Vector3(0, 0, 180);
    this.yaw = 0;
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.health = 100;
    this.armor = 0;
    this.walkSpeed = 6;
    this.runSpeed = 9.5;
    this.alive = true;
    this.moveAmount = 0;
    this.group = new THREE.Group();
    this._buildMesh();
    scene.add(this.group);
    // Soft shadow blob so the feet sit on the ground.
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    this.group.add(blob);
    this.blob = blob;
  }

  // A low-poly person: jacket, head, legs that swing when walking.
  _buildMesh() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 });
    const jacket = new THREE.MeshStandardMaterial({ color: 0x2e6b8a, roughness: 0.8 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.9 });
    const shoes = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), jacket);
    body.position.y = 1.08;
    this.group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
    head.position.y = 1.68;
    this.group.add(head);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.28, 0.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd75e, roughness: 0.7 }),
    );
    cap.position.y = 1.86;
    this.group.add(cap);
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pants);
    this.legL.position.set(-0.17, 0.36, 0);
    this.group.add(this.legL);
    this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pants);
    this.legR.position.set(0.17, 0.36, 0);
    this.group.add(this.legR);
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), jacket);
    this.armL.position.set(-0.42, 1.1, 0);
    this.group.add(this.armL);
    this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), jacket);
    this.armR.position.set(0.42, 1.1, 0);
    this.group.add(this.armR);
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.4), shoes);
    shoeL.position.set(-0.17, 0.06, 0.05);
    this.group.add(shoeL);
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.4), shoes);
    shoeR.position.set(0.17, 0.06, 0.05);
    this.group.add(shoeR);
  }

  spawn(x, z) {
    this.pos.set(x, 0, z);
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.health = 100;
    this.alive = true;
    this.group.position.copy(this.pos);
  }

  // Move on foot. cameraYaw is the direction the camera looks, so W always
  // walks away from the camera. Returns how far the player moved this frame.
  update(dt, input, cameraYaw) {
    if (!this.alive) return 0;
    const axes = input.moveAxes();
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = run ? this.runSpeed : this.walkSpeed;
    // Camera-relative movement.
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    let mx = (axes.x * cos - axes.y * sin);
    let mz = (axes.x * sin + axes.y * cos);
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      this.yaw = Math.atan2(mx, mz);
      this.moveAmount = 1;
    } else {
      this.moveAmount = 0;
    }
    this.pos.x += mx * speed * dt;
    this.pos.z += mz * speed * dt;
    // Gravity and jumping.
    if (input.hit('Space') && this.onGround) {
      this.vy = 7.5;
      this.onGround = false;
    }
    this.vy -= 22 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= 0) {
      this.pos.y = 0;
      this.vy = 0;
      this.onGround = true;
    }
    // Keep the player inside the island and out of the towers.
    const fixed = this.city.resolveCircle(this.pos.x, this.pos.z, 0.55);
    this.pos.x = fixed.x;
    this.pos.z = fixed.z;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    // Walk-cycle swing.
    const t = performance.now() * 0.012;
    const swing = this.moveAmount > 0 ? Math.sin(t) * 0.55 : 0;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.8;
    this.armR.rotation.x = swing * 0.8;
    this.blob.position.y = 0.02;
    return Math.hypot(mx * speed * dt, mz * speed * dt);
  }

  // --- Damage, death and respawn. ---
  damage(amount) {
    if (!this.alive) return;
    let left = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, left);
      this.armor -= absorbed;
      left -= absorbed;
    }
    this.health -= left;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  addArmor(amount) {
    this.armor = Math.min(100, this.armor + amount);
  }

  // Back on your feet at the safehouse, wanted cleared, some cash lost.
  respawn(safehouse) {
    this.spawn(safehouse.x, safehouse.z);
    this.armor = 0;
  }
}
