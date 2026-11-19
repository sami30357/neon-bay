// v5: Golden Hour — header touch under recording 01a1f255 (day-night cycle build; file content unchanged).
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// The player on foot in Neon Bay: a third-person walker with sprint, punch and
// pistol combat, and car entry. The camera orbits with the mouse (pointer lock).
// v2: a visible pistol in the right hand that raises to aim when shooting, and a
// forward sprint lean so running reads at a glance.
import * as THREE from 'three';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0xff2d78, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.2, 10), jacket);
    body.position.y = 1.15;
    this.group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 }));
    head.position.y = 2.0;
    this.group.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x14101c, roughness: 0.9 }));
    hair.position.y = 2.05;
    this.group.add(hair);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x141828, roughness: 0.9 });
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.17), legMat);
    this.legL.position.set(-0.13, 0.31, 0);
    this.group.add(this.legL);
    this.legR = this.legL.clone();
    this.legR.position.x = 0.13;
    this.group.add(this.legR);
    this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), jacket);
    this.armR.position.set(0.48, 1.45, 0);
    this.group.add(this.armR);
    this.armL = this.armR.clone();
    this.armL.position.x = -0.48;
    this.group.add(this.armL);
    // pistol in the right hand: barrel + grip, raised to aim when firing
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: 0.35, metalness: 0.8 });
    this.gun = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.42), gunMat);
    barrel.position.set(0, 0, 0.18);
    this.gun.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.1), gunMat);
    grip.position.set(0, -0.12, -0.02);
    this.gun.add(grip);
    this.gun.position.set(0.48, 1.12, 0.1);
    this.group.add(this.gun);
    this.group.position.set(0, 0, 24);
    this.scene.add(this.group);

    this.yaw = Math.PI; // facing direction
    this.camYaw = Math.PI;
    this.camPitch = 0.32;
    this.camDist = 7.5;
    this.health = 100;
    this.walkSpeed = 6;
    this.runSpeed = 10.5;
    this.punchCooldown = 0;
    this.shootCooldown = 0;
    this.muzzle = null;
    this.stepPhase = 0;
    this.aimTimer = 0;
    this.sprinting = false;
  }

  get position() { return this.group.position; }

  update(dt, input, city) {
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.aimTimer = Math.max(0, this.aimTimer - dt);
    const mouse = input.consumeMouse();
    this.camYaw -= mouse.dx * 0.0032;
    this.camPitch = Math.max(-0.15, Math.min(0.85, this.camPitch + mouse.dy * 0.0024));
    const fwd = input.axis('KeyS', 'KeyW');
    const strafe = input.axis('KeyA', 'KeyD');
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = running ? this.runSpeed : this.walkSpeed;
    const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
    let mx = (sin * fwd + cos * strafe);
    let mz = (cos * fwd - sin * strafe);
    const len = Math.hypot(mx, mz);
    this.sprinting = running && len > 0.01;
    if (len > 0.01) {
      mx /= len; mz /= len;
      let nx = this.group.position.x + mx * speed * dt;
      let nz = this.group.position.z + mz * speed * dt;
      const fixed = city.resolveCircle(nx, nz, 0.55);
      this.group.position.x = Math.max(-240, Math.min(240, fixed.x));
      this.group.position.z = Math.max(-240, Math.min(240, fixed.z));
      this.yaw = Math.atan2(mx, mz);
      this.stepPhase += dt * speed * 1.6;
      const swing = Math.sin(this.stepPhase) * 0.6;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.7;
      this.armR.rotation.x = swing * 0.7;
    } else {
      this.legL.rotation.x *= 0.8;
      this.legR.rotation.x *= 0.8;
      this.armL.rotation.x *= 0.8;
      this.armR.rotation.x *= 0.8;
    }
    // sprint lean: the whole body tips forward while running
    const leanTarget = this.sprinting ? 0.14 : 0;
    this.group.rotation.x += (leanTarget - this.group.rotation.x) * Math.min(1, dt * 8);
    // aim pose: right arm + pistol lift forward briefly after each shot
    if (this.aimTimer > 0) {
      this.armR.rotation.x = -1.35;
      this.gun.rotation.x = -1.35;
      this.gun.position.set(0.48, 1.5, 0.3);
    } else {
      this.gun.rotation.x = 0;
      this.gun.position.set(0.48, 1.12, 0.1);
    }
    this.group.rotation.y = this.yaw;
  }

  // third-person camera behind the player
  cameraTransform(camera) {
    const px = this.group.position.x, pz = this.group.position.z;
    const cx = px - Math.sin(this.camYaw) * this.camDist * Math.cos(this.camPitch);
    const cz = pz - Math.cos(this.camYaw) * this.camDist * Math.cos(this.camPitch);
    const cy = 2.2 + Math.sin(this.camPitch) * this.camDist;
    camera.position.set(cx, cy, cz);
    camera.lookAt(px, 1.6, pz);
  }

  punch() {
    if (this.punchCooldown > 0) return false;
    this.punchCooldown = 0.45;
    this.armR.rotation.x = -1.6;
    return true;
  }

  shoot() {
    if (this.shootCooldown > 0) return null;
    this.shootCooldown = 0.32;
    this.aimTimer = 0.35;
    // ray from the camera through the crosshair
    return { origin: this.group.position.clone().add(new THREE.Vector3(0, 1.6, 0)), dir: new THREE.Vector3(Math.sin(this.yaw), -0.02, Math.cos(this.yaw)) };
  }

  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) { this.health = Math.min(100, this.health + amount); }

  reset(x, z) {
    this.group.position.set(x, 0, z);
    this.health = 100;
  }
}
