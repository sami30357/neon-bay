// Solmara Bay — combat.
// One clear job: the four weapon slots, shooting, and damage. Fists up close,
// a pistol, an SMG and a 12-gauge; a shot is a ray from the camera, and the
// world answers with a flash, a sound and a number.
import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { glowTexture } from './textures.js';

export class Combat {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.slot = 0;
    this.ammo = WEAPONS.map((w) => w.ammo);
    this.lastShot = 0;
    this.flash = null;
    this._buildFlash();
    this.raycaster = new THREE.Raycaster();
  }

  _buildFlash() {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe9a8, transparent: true, opacity: 0, depthWrite: false }),
    );
    sprite.scale.set(2.4, 2.4, 1);
    this.scene.add(sprite);
    this.flash = sprite;
    this.flashUntil = 0;
  }

  get weapon() { return WEAPONS[this.slot]; }

  selectSlot(i) {
    if (i >= 0 && i < WEAPONS.length) this.slot = i;
  }

  addAmmo(slot, amount) {
    if (WEAPONS[slot].ammo === Infinity) return;
    this.ammo[slot] += amount;
  }

  // Fire one shot from the camera. targets: [{ mesh, hit(damage, point) }]
  // Returns the hit target or null. Shooting at the police raises the heat;
  // the caller decides that from the target's kind.
  shoot(now, targets, origin, dir) {
    const w = this.weapon;
    if (now - this.lastShot < w.rate) return null;
    if (this.ammo[this.slot] !== Infinity && this.ammo[this.slot] <= 0) return 'empty';
    this.lastShot = now;
    if (this.ammo[this.slot] !== Infinity) this.ammo[this.slot] -= 1;
    // Muzzle flash at the camera.
    this.flash.position.copy(origin).addScaledVector(dir, 1.4);
    this.flash.material.opacity = 0.95;
    this.flashUntil = now + 0.06;
    if (w.id === 'fists') {
      // A swing: only something right in front of the player feels it.
      let best = null;
      let bestD = w.range;
      for (const t of targets) {
        const d = t.pos.distanceTo(origin);
        if (d < bestD) { bestD = d; best = t; }
      }
      if (best) best.hit(w.damage, origin);
      return best;
    }
    this.raycaster.set(origin, dir);
    this.raycaster.far = w.range;
    const meshes = targets.map((t) => t.mesh).filter(Boolean);
    const hits = this.raycaster.intersectObjects(meshes, true);
    if (!hits.length) return null;
    const hit = hits[0];
    // Walk up to the target that owns this mesh.
    let obj = hit.object;
    while (obj && !obj.userData.targetRef) obj = obj.parent;
    const target = obj ? obj.userData.targetRef : null;
    if (target) target.hit(w.damage, hit.point);
    return target;
  }

  update(now) {
    if (this.flash && now > this.flashUntil) {
      this.flash.material.opacity = 0;
    }
  }

  hudState() {
    return WEAPONS.map((w, i) => ({
      slot: w.slot,
      name: w.name,
      ammo: this.ammo[i] === Infinity ? '∞' : this.ammo[i],
      active: i === this.slot,
    }));
  }

  // A tracer line from the muzzle to the hit point, for one frame. The game
  // loop draws it with a THREE.Line that lives for 60ms.
  makeTracer(scene, from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    scene.add(line);
    return line;
  }

  // Drop a tracer after its short life.
  dropTracer(scene, line) {
    if (!line) return;
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  }
}
