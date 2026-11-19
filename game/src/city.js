// Solmara Bay — the city itself.
// One clear job: build every static piece of the island city (streets, towers,
// the waterfront, the pier, the boats) and answer the two questions the rest
// of the game asks all the time: what district is this, and can I stand here.
import * as THREE from 'three';
import { WORLD, DISTRICTS, COLORS } from './config.js';
import { facadeTexture, signTexture, roadTexture, sandTexture, waterTexture } from './textures.js';

const SIGN_WORDS = [
  ['NEON BAY', '#ff2d78'], ['CLUB VOLT', '#b300ff'], ['CASINO NOVA', '#ffae00'],
  ['HOTEL LUMEN', '#00e5ff'], ['PIER 7', '#39ff88'], ['MERIDIAN', '#ff5e3a'],
  ['RAMEN KING', '#ff2d78'], ['SKY LOUNGE', '#00e5ff'], ['SURF SHOP', '#39ff88'],
  ['TACOS', '#ffae00'], ['BAY FM', '#ff5e3a'], ['MARINA', '#00b4d8'],
];
const FACADE_COLORS = ['#c96f4a', '#b85c5c', '#7a6a8a', '#4a6a8a', '#8a6a4a', '#5c7a5c', '#9a8a6a', '#6a5c7a'];

export class City {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = [];
    this.buildings = [];
    this.beacons = [];
    this.boats = [];
    this.signMats = [];
    this.streetPositions = WORLD.streets;
    this.helipadRoof = null;
    this.helipadGround = null;
    this.tallest = null;
  }

  build() {
    this._buildGround();
    this._buildRoads();
    this._buildBlocks();
    this._buildWaterfront();
    this._buildGroundHelipad();
    this._buildRoofHelipad();
  }

  // The base slab the whole island sits on.
  _buildGround() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 800), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, 160);
    this.scene.add(ground);
  }

  // Asphalt strips on every street axis, plus the boardwalk road.
  _buildRoads() {
    const tex = roadTexture();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    const span = 432;
    for (const p of WORLD.streets) {
      // East-west street.
      const ew = new THREE.Mesh(new THREE.PlaneGeometry(span, 12), mat);
      ew.rotation.x = -Math.PI / 2;
      ew.position.set(0, 0, p);
      this.scene.add(ew);
      // North-south street.
      const ns = new THREE.Mesh(new THREE.PlaneGeometry(12, span), mat);
      ns.rotation.x = -Math.PI / 2;
      ns.position.set(p, 0, 0);
      this.scene.add(ns);
      // Pale sidewalks flanking the east-west street.
      const walkMat = new THREE.MeshStandardMaterial({ color: COLORS.sidewalk, roughness: 1 });
      for (const off of [-8, 8]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(span, 3), walkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(0, 0.02, p + off);
        this.scene.add(walk);
      }
    }
    // The boardwalk road along the bay.
    const board = new THREE.Mesh(new THREE.PlaneGeometry(span, 12), mat);
    board.rotation.x = -Math.PI / 2;
    board.position.set(0, 0, WORLD.boardwalkZ);
    this.scene.add(board);
    // Promenade paving between the last street and the beach.
    const prom = new THREE.Mesh(
      new THREE.PlaneGeometry(span, 34),
      new THREE.MeshStandardMaterial({ color: 0xb8a88a, roughness: 1 }),
    );
    prom.rotation.x = -Math.PI / 2;
    prom.position.set(0, 0.02, 205);
    this.scene.add(prom);
  }

  // Towers on every block, except the marina plaza (the ground helipad lives there).
  _buildBlocks() {
    const rng = this.rng;
    const centres = [];
    for (const bx of [-150, -90, -30, 30, 90, 150]) {
      for (const bz of [-150, -90, -30, 30, 90, 150]) centres.push([bx, bz]);
    }
    for (const [bx, bz] of centres) {
      // The marina plaza stays open for the ground helipad.
      if (bx === 150 && bz === 150) continue;
      const count = rng.int(1, 3);
      for (let i = 0; i < count; i++) {
        const w = rng.range(14, 26);
        const d = rng.range(14, 26);
        const h = rng.range(12, 58);
        const x = bx + rng.range(-12, 12);
        const z = bz + rng.range(-12, 12);
        this._buildTower(x, z, w, d, h);
      }
    }
    // Low kiosks on the promenade, so the boardwalk feels lived-in.
    for (const x of [-160, -100, -40, 80, 140]) {
      this._buildKiosk(x, 206);
    }
  }

  _buildTower(x, z, w, d, h) {
    const rng = this.rng;
    const tex = facadeTexture(rng, rng.pick(FACADE_COLORS));
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(h / 22)));
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.1 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h / 2, z);
    this.scene.add(mesh);
    // Flat roof cap.
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.98, 0.6, d * 0.98),
      new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 1 }),
    );
    roof.position.set(x, h + 0.3, z);
    this.scene.add(roof);
    // Rooftop clutter: AC boxes and antennas.
    if (rng.chance(0.6)) {
      const ac = new THREE.Mesh(
        new THREE.BoxGeometry(rng.range(1.5, 3), 1, rng.range(1.5, 3)),
        new THREE.MeshStandardMaterial({ color: 0x5c6068, roughness: 0.9 }),
      );
      ac.position.set(x + rng.range(-w / 4, w / 4), h + 1, z + rng.range(-d / 4, d / 4));
      this.scene.add(ac);
    }
    if (rng.chance(0.4)) {
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, rng.range(4, 8), 6),
        new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.8 }),
      );
      ant.position.set(x + rng.range(-w / 4, w / 4), h + 4, z + rng.range(-d / 4, d / 4));
      this.scene.add(ant);
    }
    // Blinking red beacon on tall roofs.
    if (h > 40) {
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff2244 }),
      );
      beacon.position.set(x, h + 1.4, z);
      this.scene.add(beacon);
      this.beacons.push({ mesh: beacon, phase: rng.range(0, Math.PI * 2) });
    }
    this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    const rec = { x, z, w, d, h };
    this.buildings.push(rec);
    if (!this.tallest || h > this.tallest.h) this.tallest = rec;
  }

  _buildKiosk(x, z) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd8b25e, roughness: 0.8 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4), mat);
    box.position.set(x, 1.5, z);
    this.scene.add(box);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 }),
    );
    roof.position.set(x, 3.8, z);
    roof.rotation.y = Math.PI / 4;
    this.scene.add(roof);
    this.colliders.push({ minX: x - 3, maxX: x + 3, minZ: z - 2, maxZ: z + 2 });
  }

  // --- The waterfront: water, beach, Pier 7, boats, islands, palms. ---
  _buildWaterfront() {
    this._buildWater();
    this._buildBeach();
    this._buildPier();
    this._buildBoats();
    this._buildIslands();
    this._buildSigns();
  }

  _buildWater() {
    const tex = waterTexture();
    this.waterTex = tex;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.15, metalness: 0.1 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.waterWidth, 300), mat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.08, WORLD.waterStart + 148);
    this.scene.add(water);
    this.water = water;
    // Foam line where the sea meets the sand, pulsing in update().
    const foam = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 2.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(0, 0.1, WORLD.waterStart - 1);
    this.scene.add(foam);
    this.foamMat = foam.material;
  }

  _buildBeach() {
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 28),
      new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1 }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.05, (WORLD.beachStart + WORLD.waterStart) / 2);
    this.scene.add(sand);
    // Umbrellas and towels along the sand.
    const umbrellaColors = [0xff5e3a, 0x00b4d8, 0xffd75e, 0xff2d78, 0x39ff88];
    const spots = [[-120, 234], [-60, 242], [-30, 230], [60, 240], [110, 233], [150, 244], [-190, 238], [190, 238]];
    spots.forEach(([x, z], i) => this._makeUmbrella(x, z, umbrellaColors[i % umbrellaColors.length]));
    const towelColors = [0xff2d78, 0x00e5ff, 0xffd75e, 0x39ff88, 0xb300ff];
    spots.forEach(([x, z], i) => {
      const towel = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.06, 0.9),
        new THREE.MeshStandardMaterial({ color: towelColors[i % towelColors.length], roughness: 0.95 }),
      );
      towel.position.set(x + 2.4, 0.09, z + 1.2);
      towel.rotation.y = this.rng.range(-0.4, 0.4);
      this.scene.add(towel);
    });
    // Beachgoers: a few still figures enjoying the sand.
    const skins = [0xe8b98a, 0xc98f6a, 0x8a5a3a, 0xf2c9a0];
    const shirts = [0xff5e3a, 0x00b4d8, 0xffd75e, 0x39ff88, 0xff2d78, 0xffffff];
    const goers = [[-118, 237], [-58, 245], [-28, 233], [62, 243], [112, 236], [152, 247]];
    goers.forEach(([x, z], i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.4, 1.15, 8),
        new THREE.MeshStandardMaterial({ color: shirts[i % shirts.length], roughness: 0.85 }),
      );
      body.position.y = 1.15;
      g.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 8),
        new THREE.MeshStandardMaterial({ color: skins[i % skins.length], roughness: 0.7 }),
      );
      head.position.y = 2.0;
      g.add(head);
      g.position.set(x, 0, z);
      g.rotation.y = this.rng.range(0, Math.PI * 2);
      this.scene.add(g);
    });
    // Palms along the boardwalk and the beach edge.
    for (let x = -204; x <= 204; x += 24) {
      if (Math.abs(x - WORLD.pierX) < 12) continue;
      this._makePalm(x, 207, 1, (x % 48 === 0 ? 0.08 : -0.06));
      if (x % 48 === 0) this._makePalm(x + 12, 228, 0.9, 0.05);
    }
    this._makePalm(-100, 242, 1.1, 0.1);
    this._makePalm(140, 246, 1, -0.08);
    this._makePalm(-150, 230, 0.95, 0.06);
  }

  _makePalm(x, z, scale = 1, lean = 0) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.3, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
    );
    trunk.position.y = 3;
    g.add(trunk);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.4, 4), frondMat);
      frond.scale.set(1, 1, 0.18);
      frond.position.set(Math.cos(a) * 1.2, 6.2, Math.sin(a) * 1.2);
      frond.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      g.add(frond);
    }
    g.position.set(x, 0, z);
    g.rotation.z = lean;
    g.scale.setScalar(scale);
    this.scene.add(g);
    return g;
  }

  _makeUmbrella(x, z, color) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.7 }),
    );
    pole.position.y = 1.2;
    g.add(pole);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.9, 0.9, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    canopy.position.y = 2.6;
    g.add(canopy);
    g.position.set(x, 0, z);
    g.rotation.z = 0.08;
    this.scene.add(g);
    return g;
  }

  // Pier 7: a wooden pier from the boardwalk into the bay, with posts, rails
  // and a shack at the end. The deck is scenery — the waterline stops the
  // player at the boardwalk, and the tide crate sits at the pier mouth.
  _buildPier() {
    const px = WORLD.pierX;
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 88), deckMat);
    deck.position.set(px, 0.15, 268);
    this.scene.add(deck);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x5c4630 });
    for (let z = 228; z <= 308; z += 8) {
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 0.25), seamMat);
      seam.rotation.x = -Math.PI / 2;
      seam.position.set(px, 0.41, z);
      this.scene.add(seam);
    }
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4630, roughness: 0.9 });
    for (let z = 230; z <= 308; z += 9.75) {
      for (const sx of [-3.6, 3.6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.4, 8), postMat);
        post.position.set(px + sx, -1.2, z);
        this.scene.add(post);
      }
    }
    for (const sx of [-3.8, 3.8]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 88), postMat);
      rail.position.set(px + sx, 1.15, 268);
      this.scene.add(rail);
    }
    // Shack at the end of the pier.
    const shack = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x2e6b8a, roughness: 0.8 }),
    );
    shack.position.set(px, 1.9, 304);
    this.scene.add(shack);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.6, 1.8, 4),
      new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 }),
    );
    roof.position.set(px, 4.2, 304);
    roof.rotation.y = Math.PI / 4;
    this.scene.add(roof);
    // PIER 7 sign on the shack, facing the city.
    const c = document.createElement('canvas');
    c.width = 256; c.height = 80;
    const g = c.getContext('2d');
    g.fillStyle = '#05060f'; g.fillRect(0, 0, 256, 80);
    g.strokeStyle = '#ffd75e'; g.lineWidth = 5; g.strokeRect(4, 4, 248, 72);
    g.fillStyle = '#ffd75e'; g.font = '900 44px Arial'; g.textAlign = 'center';
    g.fillText('PIER 7', 128, 56);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 1.6),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true }),
    );
    sign.position.set(px, 2.4, 301.8);
    sign.rotation.y = Math.PI;
    this.scene.add(sign);
  }

  _buildBoats() {
    this._makeBoat(32, 285, 0xff5e3a, 1);
    this._makeBoat(120, 340, 0x00b4d8, 1.1);
    this._makeBoat(-90, 380, 0xffd75e, 0.9);
    this._makeBoat(-170, 310, 0xff2d78, 1.2);
  }

  _makeBoat(x, z, color, scale = 1) {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.4 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 2.4), hullMat);
    hull.position.y = 0.5;
    g.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 4), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.scale.set(1, 1, 0.5);
    bow.position.set(0, 0.5, 3.4);
    g.add(bow);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.24, 0.3, 2.44), new THREE.MeshBasicMaterial({ color }));
    stripe.position.y = 0.75;
    g.add(stripe);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.9, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.3, metalness: 0.4 }),
    );
    cabin.position.set(-0.4, 1.4, 0);
    g.add(cabin);
    g.position.set(x, 0.1, z);
    g.rotation.y = this.rng.range(0, Math.PI * 2);
    g.scale.setScalar(scale);
    this.scene.add(g);
    this.boats.push({ group: g, phase: this.rng.range(0, Math.PI * 2), baseY: 0.1 });
    return g;
  }

  // Distant green islands on the horizon, so the bay is not an empty plane.
  _buildIslands() {
    const isles = [[300, 420, 34], [-280, 440, 40], [80, 480, 28], [-80, 470, 22]];
    for (const [x, z, r] of isles) {
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 10),
        new THREE.MeshStandardMaterial({ color: 0x2e7d46, roughness: 1 }),
      );
      mound.scale.y = 0.18;
      mound.position.set(x, 0, z);
      this.scene.add(mound);
      this._makePalm(x - r * 0.3, z - r * 0.2, 1.2, 0.1);
      this._makePalm(x + r * 0.4, z + r * 0.1, 1, -0.08);
    }
  }

  // Neon signs on the towers, readable from down the avenues.
  _buildSigns() {
    const rng = this.rng;
    let count = 0;
    for (const b of this.buildings) {
      if (count >= 60) break;
      if (!rng.chance(0.5)) continue;
      const [word, color] = rng.pick(SIGN_WORDS);
      const tex = signTexture(word, color);
      const wide = rng.chance(0.6);
      const w = wide ? rng.range(9, 15) : rng.range(3.5, 5);
      const h = wide ? 2.4 : rng.range(8, 13);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      this.signMats.push(mat);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      const face = rng.int(0, 3);
      const y = rng.range(6, Math.min(20, b.h - 3));
      if (face === 0) { sign.position.set(b.x, y, b.z + b.d / 2 + 0.15); }
      else if (face === 1) { sign.position.set(b.x, y, b.z - b.d / 2 - 0.15); sign.rotation.y = Math.PI; }
      else if (face === 2) { sign.position.set(b.x + b.w / 2 + 0.15, y, b.z); sign.rotation.y = Math.PI / 2; }
      else { sign.position.set(b.x - b.w / 2 - 0.15, y, b.z); sign.rotation.y = -Math.PI / 2; }
      this.scene.add(sign);
      count++;
    }
  }

  // --- Helipads: one on the tallest tower, one on the marina plaza. ---
  _buildRoofHelipad() {
    const t = this.tallest;
    if (!t) return;
    const padMat = new THREE.MeshStandardMaterial({ color: 0x0c1226, roughness: 0.7 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 0.3, 24), padMat);
    pad.position.set(t.x, t.h + 0.65, t.z);
    this.scene.add(pad);
    const markMat = new THREE.MeshBasicMaterial({ color: 0xffd75e });
    for (const sx of [-1.4, 1.4]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 5.4), markMat);
      bar.position.set(t.x + sx, t.h + 0.85, t.z);
      this.scene.add(bar);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.6), markMat);
    cross.position.set(t.x, t.h + 0.85, t.z);
    this.scene.add(cross);
    this.helipadRoof = { x: t.x, y: t.h + 0.8, z: t.z };
  }

  _buildGroundHelipad() {
    // The marina plaza block (150, 150) was left open for this pad.
    const spot = { x: 150, z: 150 };
    this.helipadGround = spot;
    const padMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.8 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.25, 28), padMat);
    pad.position.set(spot.x, 0.13, spot.z);
    this.scene.add(pad);
    const markMat = new THREE.MeshBasicMaterial({ color: 0xffd75e });
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.4, 28), markMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(spot.x, 0.28, spot.z);
    this.scene.add(ring);
    for (const sx of [-1.8, 1.8]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 7), markMat);
      bar.position.set(spot.x + sx, 0.28, spot.z);
      this.scene.add(bar);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 0.9), markMat);
    cross.position.set(spot.x, 0.28, spot.z);
    this.scene.add(cross);
  }

  // --- Per-frame life: water scroll, foam pulse, beacons, boat bob. ---
  update(dt, t) {
    if (this.waterTex) {
      this.waterTex.offset.x = (t * 0.008) % 1;
      this.waterTex.offset.y = (t * 0.005) % 1;
    }
    if (this.foamMat) this.foamMat.opacity = 0.45 + Math.sin(t * 1.4) * 0.18;
    for (const b of this.beacons) {
      b.mesh.material.color.setHex(Math.sin(t * 2 + b.phase) > 0 ? 0xff2244 : 0x551122);
    }
    for (const boat of this.boats) {
      boat.group.position.y = boat.baseY + Math.sin(t * 0.9 + boat.phase) * 0.12;
      boat.group.rotation.z = Math.sin(t * 0.7 + boat.phase) * 0.03;
    }
  }

  // Which district a point is standing in.
  districtAt(x, z) {
    for (const d of DISTRICTS) {
      if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
    }
    return DISTRICTS[0];
  }

  // Push a circle (player or car, radius r) out of every building collider,
  // clamp it inside the island, and stop it at the waterline. Returns the
  // corrected position. The caller keeps the y it had.
  resolveCircle(x, z, r) {
    // Island bounds.
    x = Math.max(WORLD.minX + r, Math.min(WORLD.maxX - r, x));
    z = Math.max(WORLD.minZ + r, Math.min(WORLD.waterWallZ - r, z));
    // Building colliders: push out along the smallest penetration axis.
    for (const c of this.colliders) {
      const nx = Math.max(c.minX - r, Math.min(c.maxX + r, x));
      const nz = Math.max(c.minZ - r, Math.min(c.maxZ + r, z));
      const dx = x - nx;
      const dz = z - nz;
      const inside = x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r;
      if (!inside) continue;
      const px = Math.min(x - (c.minX - r), (c.maxX + r) - x);
      const pz = Math.min(z - (c.minZ - r), (c.maxZ + r) - z);
      if (px < pz) x = (x - (c.minX - r) < (c.maxX + r) - x) ? c.minX - r : c.maxX + r;
      else z = (z - (c.minZ - r) < (c.maxZ + r) - z) ? c.minZ - r : c.maxZ + r;
      void dx; void dz;
    }
    return { x, z };
  }

  // True when a point is on a street (used by traffic to stay on the roads).
  onStreet(x, z) {
    const near = (v) => WORLD.streets.some((p) => Math.abs(v - p) < 8);
    return near(x) || near(z);
  }
}
