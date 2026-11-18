// Neon Bay's rain-slick night city: a street grid, towers with lit windows, neon
// signs, wet asphalt, streetlights and rain. The layout is seeded, so every run
// shows the same city. All textures are drawn on canvases at runtime — no files.
// v2: landmark towers with helipads and blinking beacons, rooftop AC boxes and
// water towers, twice the neon signs (some flicker), street props, a starry sky
// with moon and drifting clouds, rain as visible streaks with ground splashes,
// and puddle glints on the wet roads.
import * as THREE from 'three';
import { makeRng, CITY_SEED } from './random.js';

export const STREET_STEP = 48;
export const STREET_HALF = 6;
export const CITY_EXTENT = 216; // streets run from -216 to +216
export const ROAD_Y = 0.02;

const NEON_COLORS = ['#ff2d78', '#00e5ff', '#ffae00', '#b300ff', '#39ff88', '#ff5e3a'];
const SIGN_WORDS = [
  ['NEON BAY', '#ff2d78'], ['HOTEL LUMEN', '#00e5ff'], ['NOODLE BAR', '#ffae00'],
  ['CLUB VOLT', '#b300ff'], ['24H TACOS', '#39ff88'], ['CASINO NOVA', '#ff5e3a'],
  ['RAMEN 88', '#00e5ff'], ['MOTEL GLOW', '#ff2d78'], ['GARAGE 9', '#ffae00'],
  ['BAR ECLIPSE', '#b300ff'], ['PHO NIGHT', '#39ff88'], ['LIQUOR', '#ff5e3a'],
  ['PIER 7', '#00e5ff'], ['SUSHI NEON', '#ff2d78'], ['ARCADE', '#ffae00'],
  ['VAPOR', '#b300ff'], ['DANCE HALL', '#ff5e3a'], ['COFFEE 24', '#39ff88'],
  ['NEON GARDEN', '#39ff88'], ['SKY LOUNGE', '#00e5ff'], ['TURBO WASH', '#ffae00'],
  ['DRAGON INN', '#ff5e3a'], ['CHOP SHOP', '#b300ff'], ['LATE NIGHT', '#ff2d78'],
  ['SILK ROAD', '#ffae00'], ['VOLTAGE', '#00e5ff'], ['MOON BAR', '#b300ff'],
  ['RAMEN KING', '#ff5e3a'], ['PIER 9', '#39ff88'], ['NEON DENTAL', '#00e5ff'],
  ['24H DONUTS', '#ffae00'], ['HOTEL NOVA', '#ff2d78'],
];

function windowTexture(rng, hue) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0e1a'; g.fillRect(0, 0, 128, 256);
  const cols = 6, rows = 14;
  const litColors = ['#ffd9a0', '#9be8ff', '#ff9ad5', '#fff3c4', '#c4b5fd'];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (rng.chance(0.72)) {
        g.fillStyle = rng.pick(litColors);
        g.globalAlpha = rng.range(0.6, 1);
        g.fillRect(8 + x * 19, 10 + y * 17, 12, 9);
        g.globalAlpha = 1;
      } else {
        g.fillStyle = '#10152a';
        g.fillRect(8 + x * 19, 10 + y * 17, 12, 9);
      }
    }
  }
  if (hue) {
    g.fillStyle = hue; g.globalAlpha = 0.12; g.fillRect(0, 0, 128, 256); g.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture(word, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.font = '900 64px Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 36;
  g.fillStyle = color;
  g.fillText(word, 256, 64);
  g.shadowBlur = 10; g.fillStyle = '#ffffff';
  g.fillText(word, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function reflectionTexture(color) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, color); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 128);
  return new THREE.CanvasTexture(c);
}

function glowSpriteTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class City {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(CITY_SEED);
    this.colliders = []; // {minX, maxX, minZ, maxZ}
    this.buildings = [];
    this.rain = null;
    this.rainDrops = null; // {x, y, z, vel} per streak
    this.rainVelocity = null;
    this.streetPositions = [];
    this.beacons = []; // blinking rooftop lights {mesh, phase}
    this.flickerSigns = []; // {mat, phase}
    this.clouds = [];
    this.splashes = []; // {mesh, life}
    this.tallest = null;
    for (let i = 0; i <= 9; i++) this.streetPositions.push(-CITY_EXTENT + i * STREET_STEP);
    this._buildLights();
    this._buildGround();
    this._buildRoads();
    this._buildBuildings();
    this._buildSigns();
    this._buildBillboards();
    this._buildStreetlights();
    this._buildProps();
    this._buildRain();
    this._buildSplashes();
    this._buildPuddles();
    this._buildSky();
    this._buildSkyline();
    this._buildHelipad();
  }

  _buildLights() {
    const s = this.scene;
    s.background = new THREE.Color(0x04050d);
    s.fog = new THREE.FogExp2(0x070818, 0.0032);
    const hemi = new THREE.HemisphereLight(0x3a3a88, 0x14101e, 1.5);
    s.add(hemi);
    const amb = new THREE.AmbientLight(0x223055, 0.5);
    s.add(amb);
    const moon = new THREE.DirectionalLight(0x8fa8ff, 0.6);
    moon.position.set(-120, 180, 80);
    s.add(moon);
    const glow = new THREE.PointLight(0xff2d78, 1400, 300, 1.8);
    glow.position.set(0, 40, 0);
    s.add(glow);
    this.cityGlow = glow;
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(CITY_EXTENT * 2 + 120, CITY_EXTENT * 2 + 120);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a2032, roughness: 0.4, metalness: 0.45,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = false;
    this.scene.add(ground);
  }

  _buildRoads() {
    const rng = this.rng;
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xc9a227 });
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xd7dee8 });
    for (const p of this.streetPositions) {
      // center dashes along each street (both directions)
      for (let t = -CITY_EXTENT; t < CITY_EXTENT; t += 12) {
        if (rng.chance(0.12)) continue; // gap at intersections
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), yellowMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(p, ROAD_Y, t + 2.5);
        this.scene.add(dash);
        const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), yellowMat);
        dash2.rotation.x = -Math.PI / 2;
        dash2.position.set(t + 2.5, ROAD_Y, p);
        this.scene.add(dash2);
      }
      // crosswalk stripes at every intersection
      for (const q of this.streetPositions) {
        for (let k = -2; k <= 2; k++) {
          const s1 = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.5), crossMat);
          s1.rotation.x = -Math.PI / 2;
          s1.position.set(q + k * 2.2, ROAD_Y, p + STREET_HALF + 2.2);
          this.scene.add(s1);
          const s2 = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.4), crossMat);
          s2.rotation.x = -Math.PI / 2;
          s2.position.set(p + STREET_HALF + 2.2, ROAD_Y, q + k * 2.2);
          this.scene.add(s2);
        }
      }
    }
    // sidewalks: raised light strips along every street edge
    const walkMat = new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.6, metalness: 0.3 });
    for (const p of this.streetPositions) {
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.24, CITY_EXTENT * 2 + 24), walkMat);
      w1.position.set(p + STREET_HALF + 1.5, 0.12, 0);
      this.scene.add(w1);
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.24, CITY_EXTENT * 2 + 24), walkMat);
      w2.position.set(p - STREET_HALF - 1.5, 0.12, 0);
      this.scene.add(w2);
      const w3 = new THREE.Mesh(new THREE.BoxGeometry(CITY_EXTENT * 2 + 24, 0.24, 3), walkMat);
      w3.position.set(0, 0.12, p + STREET_HALF + 1.5);
      this.scene.add(w3);
      const w4 = new THREE.Mesh(new THREE.BoxGeometry(CITY_EXTENT * 2 + 24, 0.24, 3), walkMat);
      w4.position.set(0, 0.12, p - STREET_HALF - 1.5);
      this.scene.add(w4);
    }
  }

  _buildBuildings() {
    const rng = this.rng;
    const texA = windowTexture(rng, null);
    const texB = windowTexture(rng, '#ff2d78');
    const texC = windowTexture(rng, '#00e5ff');
    const texD = windowTexture(rng, '#ffae00');
    const texes = [texA, texB, texC, texD];
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x11142a, roughness: 0.9 });
    const acMat = new THREE.MeshStandardMaterial({ color: 0x2a3048, roughness: 0.8, metalness: 0.4 });
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.9 });
    const antennaMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    for (let bx = 0; bx < 9; bx++) {
      for (let bz = 0; bz < 9; bz++) {
        const blockMinX = -CITY_EXTENT + bx * STREET_STEP + STREET_HALF;
        const blockMinZ = -CITY_EXTENT + bz * STREET_STEP + STREET_HALF;
        const blockSize = STREET_STEP - STREET_HALF * 2; // 36
        const roll = rng.next();
        if (roll < 0.14) continue; // plaza / parking lot
        const plots = rng.pick([1, 1, 2, 2, 4]);
        const cols = plots === 4 ? 2 : (plots === 2 ? 2 : 1);
        const rows = plots === 4 ? 2 : 1;
        const pw = blockSize / cols, pd = blockSize / rows;
        for (let cx = 0; cx < cols; cx++) {
          for (let cz = 0; cz < rows; cz++) {
            if (plots > 1 && rng.chance(0.15)) continue;
            const w = pw * rng.range(0.72, 0.92);
            const d = pd * rng.range(0.72, 0.92);
            // a few landmark towers rise far above the rest
            const landmark = rng.chance(0.035);
            const h = landmark
              ? rng.range(82, 108)
              : rng.range(11, 62) * (rng.chance(0.12) ? 1.7 : 1);
            const x = blockMinX + cx * pw + pw / 2;
            const z = blockMinZ + cz * pd + pd / 2;
            const tex = rng.pick(texes).clone();
            tex.needsUpdate = true;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(h / 12)));
            const mat = new THREE.MeshStandardMaterial({
              map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: landmark ? 1.5 : 1.25,
              roughness: 0.85, metalness: 0.1,
            });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.set(x, h / 2, z);
            this.scene.add(mesh);
            const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.5, d * 0.96), roofMat);
            roof.position.set(x, h + 0.25, z);
            this.scene.add(roof);
            // rooftop clutter: AC boxes, water towers, antennas
            if (rng.chance(0.55)) {
              const ac = new THREE.Mesh(new THREE.BoxGeometry(rng.range(1.5, 3), rng.range(0.8, 1.4), rng.range(1.5, 3)), acMat);
              ac.position.set(x + rng.range(-w / 4, w / 4), h + 0.9, z + rng.range(-d / 4, d / 4));
              this.scene.add(ac);
            }
            if (rng.chance(0.28) && h > 18) {
              const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10), tankMat);
              tank.position.set(x + rng.range(-w / 4, w / 4), h + 1.6, z + rng.range(-d / 4, d / 4));
              this.scene.add(tank);
              const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1, 10), tankMat);
              cone.position.set(tank.position.x, h + 3.2, tank.position.z);
              this.scene.add(cone);
            }
            if (rng.chance(0.35)) {
              const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, rng.range(4, 9), 6), roofMat);
              ant.position.set(x + rng.range(-w / 4, w / 4), h + 4, z + rng.range(-d / 4, d / 4));
              this.scene.add(ant);
              const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), antennaMat);
              tip.position.set(ant.position.x, ant.position.y + 4.5, ant.position.z);
              this.scene.add(tip);
            }
            // blinking red beacon on tall roofs
            if (h > 42) {
              const beacon = new THREE.Mesh(
                new THREE.SphereGeometry(0.55, 8, 6),
                new THREE.MeshBasicMaterial({ color: 0xff2244 }),
              );
              beacon.position.set(x, h + 1.2, z);
              this.scene.add(beacon);
              this.beacons.push({ mesh: beacon, phase: rng.range(0, Math.PI * 2) });
            }
            this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
            const rec = { x, z, w, d, h };
            this.buildings.push(rec);
            if (!this.tallest || h > this.tallest.h) this.tallest = rec;
          }
        }
      }
    }
  }

  _buildHelipad() {
    // an H pad on the tallest tower, so the helicopter has a home in the skyline
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
  }

  _buildSigns() {
    const rng = this.rng;
    this.signs = [];
    let count = 0;
    for (const b of this.buildings) {
      if (count >= 72) break;
      if (!rng.chance(0.55)) continue;
      const [word, color] = rng.pick(SIGN_WORDS);
      const tex = signTexture(word, color);
      const wide = rng.chance(0.6);
      const w = wide ? rng.range(9, 15) : rng.range(3.5, 5);
      const h = wide ? 2.4 : rng.range(8, 13);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      const face = rng.int(0, 3);
      const y = rng.range(6, Math.min(20, b.h - 3));
      if (face === 0) { sign.position.set(b.x, y, b.z + b.d / 2 + 0.15); }
      else if (face === 1) { sign.position.set(b.x, y, b.z - b.d / 2 - 0.15); sign.rotation.y = Math.PI; }
      else if (face === 2) { sign.position.set(b.x + b.w / 2 + 0.15, y, b.z); sign.rotation.y = Math.PI / 2; }
      else { sign.position.set(b.x - b.w / 2 - 0.15, y, b.z); sign.rotation.y = -Math.PI / 2; }
      this.scene.add(sign);
      // a few signs flicker like faulty neon
      if (rng.chance(0.14)) this.flickerSigns.push({ mat, phase: rng.range(0, Math.PI * 2) });
      // fake wet-ground reflection streak under the sign
      const refl = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.9, 7),
        new THREE.MeshBasicMaterial({
          map: reflectionTexture(color), transparent: true, opacity: 0.5,
          depthWrite: false, side: THREE.DoubleSide,
        }),
      );
      refl.rotation.x = -Math.PI / 2;
      refl.rotation.z = face === 2 || face === 3 ? Math.PI / 2 : 0;
      refl.position.set(sign.position.x, ROAD_Y + 0.01, sign.position.z + (face === 0 ? 3.5 : face === 1 ? -3.5 : 0));
      if (face === 2) refl.position.set(sign.position.x + 3.5, ROAD_Y + 0.01, sign.position.z);
      if (face === 3) refl.position.set(sign.position.x - 3.5, ROAD_Y + 0.01, sign.position.z);
      this.scene.add(refl);
      this.signs.push(sign);
      count++;
    }
  }

  _buildBillboards() {
    // rooftop billboards facing down the avenues, readable from far down a street
    const billboards = [
      ['NEON BAY', '#ff2d78'], ['CLUB VOLT', '#b300ff'], ['CASINO NOVA', '#ffae00'],
      ['HOTEL LUMEN', '#00e5ff'], ['PIER 7', '#39ff88'], ['MERIDIAN', '#ff5e3a'],
      ['RAMEN KING', '#ff2d78'], ['SKY LOUNGE', '#00e5ff'],
    ];
    for (let i = 0; i < billboards.length; i++) {
      const b = this.buildings[(i * 7 + 3) % this.buildings.length];
      if (!b) continue;
      const [word, color] = billboards[i];
      const tex = signTexture(word, color);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), mat);
      sign.position.set(b.x, b.h + 3.5, b.z);
      sign.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
      this.scene.add(sign);
    }
  }

  _buildStreetlights() {
    const rng = this.rng;
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c2233, roughness: 0.6, metalness: 0.7 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
    const lampPositions = [];
    for (const px of this.streetPositions) {
      for (const pz of this.streetPositions) {
        if (!rng.chance(0.5)) continue;
        const x = px + STREET_HALF + 1.2, z = pz + STREET_HALF + 1.2;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 8), poleMat);
        pole.position.set(x, 3.5, z);
        this.scene.add(pole);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), poleMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(x - 1, 6.9, z);
        this.scene.add(arm);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), lampMat);
        lamp.position.set(x - 2.1, 6.8, z);
        this.scene.add(lamp);
        lampPositions.push({ x: x - 2.1, z });
      }
    }
    // more real point lights than v1, so the wet roads pool with warm light
    const lit = lampPositions.filter((_, i) => i % 4 === 0).slice(0, 18);
    for (const p of lit) {
      const light = new THREE.PointLight(0xffd9a0, 420, 60, 1.9);
      light.position.set(p.x, 6.4, p.z);
      this.scene.add(light);
    }
  }

  _buildProps() {
    // sidewalk clutter: hydrants, benches, planters, dumpsters, cones — the small
    // things that make a street feel lived-in instead of a flat grid
    const rng = this.rng;
    const hydMat = new THREE.MeshStandardMaterial({ color: 0xc01e28, roughness: 0.5, metalness: 0.3 });
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x2c3a2c, roughness: 0.9 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e7d46, roughness: 0.9 });
    const dumpMat = new THREE.MeshStandardMaterial({ color: 0x1d4a2e, roughness: 0.85, metalness: 0.2 });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.7 });
    let placed = 0;
    for (const px of this.streetPositions) {
      for (const pz of this.streetPositions) {
        if (placed >= 110 || !rng.chance(0.42)) continue;
        const side = rng.chance(0.5) ? 1 : -1;
        const along = rng.chance(0.5) ? 1 : -1;
        const x = px + side * (STREET_HALF + 2.2);
        const z = pz + along * rng.range(8, 18);
        const kind = rng.weighted([['hydrant', 2], ['bench', 2], ['planter', 3], ['dumpster', 1], ['cone', 2]]);
        if (kind === 'hydrant') {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 8), hydMat);
          body.position.y = 0.45; g.add(body);
          const top = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), hydMat);
          top.position.y = 0.95; g.add(top);
          g.position.set(x, 0, z);
          this.scene.add(g);
        } else if (kind === 'bench') {
          const g = new THREE.Group();
          const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.6), benchMat);
          seat.position.y = 0.55; g.add(seat);
          const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.12), benchMat);
          back.position.set(0, 0.95, -0.28); g.add(back);
          g.position.set(x, 0, z);
          g.rotation.y = rng.chance(0.5) ? 0 : Math.PI / 2;
          this.scene.add(g);
        } else if (kind === 'planter') {
          const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.4), plantMat);
          box.position.set(x, 0.35, z);
          this.scene.add(box);
          const bush = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), bushMat);
          bush.position.set(x, 1.1, z);
          bush.scale.y = 0.75;
          this.scene.add(bush);
        } else if (kind === 'dumpster') {
          const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 1.3), dumpMat);
          box.position.set(x, 0.65, z);
          this.scene.add(box);
          this.colliders.push({ minX: x - 1.2, maxX: x + 1.2, minZ: z - 0.65, maxZ: z + 0.65 });
        } else {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 10), coneMat);
          cone.position.set(x, 0.45, z);
          this.scene.add(cone);
        }
        placed++;
      }
    }
  }

  _buildRain() {
    // rain as falling streaks (line segments) instead of dots, so the weather
    // reads in screenshots instead of vanishing
    const count = 700;
    const pos = new Float32Array(count * 6); // two vertices per streak
    this.rainDrops = [];
    for (let i = 0; i < count; i++) {
      const d = {
        x: (Math.random() - 0.5) * 160,
        y: Math.random() * 60,
        z: (Math.random() - 0.5) * 160,
        vel: 42 + Math.random() * 24,
      };
      this.rainDrops.push(d);
      pos[i * 6] = d.x; pos[i * 6 + 1] = d.y; pos[i * 6 + 2] = d.z;
      pos[i * 6 + 3] = d.x; pos[i * 6 + 4] = d.y + 1.5; pos[i * 6 + 5] = d.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.5 });
    this.rain = new THREE.LineSegments(geo, mat);
    this.rain.frustumCulled = false;
    this.rainVelocity = this.rainDrops.map((d) => d.vel);
    this.scene.add(this.rain);
  }

  _buildSplashes() {
    // expanding rings on the wet ground where rain lands, recycled near the player
    const mat = new THREE.MeshBasicMaterial({
      color: 0x9db8ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 26; i++) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.3, 16), mat.clone());
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, ROAD_Y + 0.015, 0);
      mesh.visible = false;
      this.scene.add(mesh);
      this.splashes.push({ mesh, life: Math.random() });
    }
  }

  _buildPuddles() {
    // mirror-dark puddles on the roads that catch the neon
    const rng = this.rng;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a1c30, roughness: 0.05, metalness: 0.95, emissive: 0x0a2038, emissiveIntensity: 0.7,
    });
    for (let i = 0; i < 18; i++) {
      const street = rng.pick(this.streetPositions);
      const along = rng.range(-CITY_EXTENT, CITY_EXTENT);
      const r = rng.range(1.8, 3.6);
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat);
      puddle.rotation.x = -Math.PI / 2;
      if (rng.chance(0.5)) puddle.position.set(street + rng.range(-3, 3), ROAD_Y + 0.012, along);
      else puddle.position.set(along, ROAD_Y + 0.012, street + rng.range(-3, 3));
      puddle.scale.x = rng.range(1, 1.8);
      this.scene.add(puddle);
    }
  }

  _buildSky() {
    // stars, a moon disc with glow, and slow drifting cloud sheets
    const starCount = 500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 480 + Math.random() * 220;
      const y = 120 + Math.random() * 320;
      starPos[i * 3] = Math.cos(a) * r;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = Math.sin(a) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, fog: false,
      transparent: true, opacity: 0.85,
    }));
    this.scene.add(stars);
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(15, 32),
      new THREE.MeshBasicMaterial({ color: 0xf4f1de, fog: false }),
    );
    moon.position.set(-280, 260, -190);
    moon.lookAt(0, 0, 0);
    this.scene.add(moon);
    const glowTex = glowSpriteTexture();
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xcfd8ff, transparent: true, opacity: 0.55, fog: false, depthWrite: false,
    }));
    moonGlow.position.copy(moon.position);
    moonGlow.scale.set(90, 90, 1);
    this.scene.add(moonGlow);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x0d1024, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, fog: false,
    });
    for (let i = 0; i < 6; i++) {
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(140, 46), cloudMat);
      cloud.rotation.x = -Math.PI / 2;
      cloud.position.set((Math.random() - 0.5) * 560, 130 + Math.random() * 50, (Math.random() - 0.5) * 560);
      this.scene.add(cloud);
      this.clouds.push({ mesh: cloud, speed: 1 + Math.random() * 1.4 });
    }
  }

  // per-frame city animation: rain, splashes, beacons, flickering signs, clouds
  update(dt, time, center) {
    this._updateRain(dt, center);
    for (const b of this.beacons) {
      b.mesh.visible = (Math.sin(time * 1.6 + b.phase) > -0.2);
    }
    for (const f of this.flickerSigns) {
      const v = Math.sin(time * 7 + f.phase) + Math.sin(time * 13.7 + f.phase * 2);
      f.mat.opacity = v > -1.1 ? 1 : 0.25;
    }
    for (const c of this.clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 340) c.mesh.position.x = -340;
    }
    for (const s of this.splashes) {
      s.life += dt * 1.7;
      if (s.life >= 1) {
        s.life = 0;
        const street = this.streetPositions[Math.floor(Math.random() * this.streetPositions.length)];
        const along = center ? (Math.random() < 0.5 ? center.x : center.z) + (Math.random() - 0.5) * 90 : (Math.random() - 0.5) * 400;
        if (Math.random() < 0.5) s.mesh.position.set(street + (Math.random() - 0.5) * 8, ROAD_Y + 0.015, along);
        else s.mesh.position.set(along, ROAD_Y + 0.015, street + (Math.random() - 0.5) * 8);
        s.mesh.visible = true;
      }
      const sc = 0.3 + s.life * 1.6;
      s.mesh.scale.setScalar(sc);
      s.mesh.material.opacity = 0.5 * (1 - s.life);
    }
  }

  _updateRain(dt, center) {
    if (!this.rain) return;
    const pos = this.rain.geometry.attributes.position;
    for (let i = 0; i < this.rainDrops.length; i++) {
      const d = this.rainDrops[i];
      d.y -= d.vel * dt;
      if (d.y < 0) {
        d.y = 55 + Math.random() * 5;
        d.x = center.x + (Math.random() - 0.5) * 160;
        d.z = center.z + (Math.random() - 0.5) * 160;
      }
      pos.setXYZ(i * 2, d.x, d.y, d.z);
      pos.setXYZ(i * 2 + 1, d.x, d.y + 1.5, d.z);
    }
    pos.needsUpdate = true;
  }

  // kept for callers that only need the rain to move
  updateRain(dt, center) {
    this._updateRain(dt, center);
  }

  _buildSkyline() {
    // distant dark towers ringing the playable city, for depth in wide shots
    const rng = makeRng(99);
    const mat = new THREE.MeshBasicMaterial({ color: 0x0a0c1e, fog: true });
    for (let i = 0; i < 46; i++) {
      const angle = (i / 46) * Math.PI * 2 + rng.range(-0.05, 0.05);
      const r = 300 + rng.range(0, 120);
      const w = rng.range(18, 42), h = rng.range(40, 130), d = rng.range(18, 42);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(Math.cos(angle) * r, h / 2 - 2, Math.sin(angle) * r);
      this.scene.add(m);
    }
  }

  // push a circle (x, z, radius) out of every building collider; returns corrected x/z
  resolveCircle(x, z, radius) {
    for (const c of this.colliders) {
      const cx = Math.max(c.minX, Math.min(x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 < 0.0001) { x = c.maxX + radius; continue; }
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        z = cz + (dz / d) * radius;
      }
    }
    return { x, z };
  }

  isOnRoad(x, z) {
    for (const p of this.streetPositions) {
      if (Math.abs(x - p) < STREET_HALF + 0.4) return true;
      if (Math.abs(z - p) < STREET_HALF + 0.4) return true;
    }
    return false;
  }

  nearestStreetPoint(x, z) {
    let best = null, bestD = Infinity;
    for (const px of this.streetPositions) {
      for (const pz of this.streetPositions) {
        const d = (x - px) ** 2 + (z - pz) ** 2;
        if (d < bestD) { bestD = d; best = { x: px, z: pz }; }
      }
    }
    return best;
  }
}
