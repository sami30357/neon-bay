// Neon Bay's rain-slick night city: a street grid, towers with lit windows, neon
// signs, wet asphalt, streetlights and rain. The layout is seeded, so every run
// shows the same city. All textures are drawn on canvases at runtime — no files.
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
      if (rng.chance(0.55)) {
        g.fillStyle = rng.pick(litColors);
        g.globalAlpha = rng.range(0.55, 1);
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
  g.shadowColor = color; g.shadowBlur = 28;
  g.fillStyle = color;
  g.fillText(word, 256, 64);
  g.shadowBlur = 8; g.fillStyle = '#ffffff';
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

export class City {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(CITY_SEED);
    this.colliders = []; // {minX, maxX, minZ, maxZ}
    this.buildings = [];
    this.rain = null;
    this.rainVelocity = null;
    this.streetPositions = [];
    for (let i = 0; i <= 9; i++) this.streetPositions.push(-CITY_EXTENT + i * STREET_STEP);
    this._buildLights();
    this._buildGround();
    this._buildRoads();
    this._buildBuildings();
    this._buildSigns();
    this._buildBillboards();
    this._buildStreetlights();
    this._buildRain();
    this._buildSkyline();
  }

  _buildLights() {
    const s = this.scene;
    s.background = new THREE.Color(0x04050d);
    s.fog = new THREE.FogExp2(0x070818, 0.0038);
    const hemi = new THREE.HemisphereLight(0x3a3a88, 0x14101e, 1.25);
    s.add(hemi);
    const amb = new THREE.AmbientLight(0x223055, 0.5);
    s.add(amb);
    const moon = new THREE.DirectionalLight(0x8fa8ff, 0.6);
    moon.position.set(-120, 180, 80);
    s.add(moon);
    const glow = new THREE.PointLight(0xff2d78, 1000, 300, 1.8);
    glow.position.set(0, 40, 0);
    s.add(glow);
    this.cityGlow = glow;
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(CITY_EXTENT * 2 + 120, CITY_EXTENT * 2 + 120);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x11141f, roughness: 0.38, metalness: 0.5,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = false;
    this.scene.add(ground);
  }

  _buildRoads() {
    const rng = this.rng;
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x8f9bb0 });
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
            const h = rng.range(11, 62) * (rng.chance(0.12) ? 1.7 : 1);
            const x = blockMinX + cx * pw + pw / 2;
            const z = blockMinZ + cz * pd + pd / 2;
            const tex = rng.pick(texes).clone();
            tex.needsUpdate = true;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(h / 12)));
            const mat = new THREE.MeshStandardMaterial({
              map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9,
              roughness: 0.85, metalness: 0.1,
            });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.set(x, h / 2, z);
            this.scene.add(mesh);
            const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.5, d * 0.96), roofMat);
            roof.position.set(x, h + 0.25, z);
            this.scene.add(roof);
            if (rng.chance(0.35)) {
              const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, rng.range(4, 9), 6), roofMat);
              ant.position.set(x + rng.range(-w / 4, w / 4), h + 4, z + rng.range(-d / 4, d / 4));
              this.scene.add(ant);
              const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), antennaMat);
              tip.position.set(ant.position.x, ant.position.y + 4.5, ant.position.z);
              this.scene.add(tip);
            }
            this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
            this.buildings.push({ x, z, w, d, h });
          }
        }
      }
    }
  }

  _buildSigns() {
    const rng = this.rng;
    this.signs = [];
    let count = 0;
    for (const b of this.buildings) {
      if (count >= 46) break;
      if (!rng.chance(0.42)) continue;
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
      // fake wet-ground reflection streak under the sign
      const refl = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.9, 7),
        new THREE.MeshBasicMaterial({
          map: reflectionTexture(color), transparent: true, opacity: 0.35,
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
    // a handful of real point lights at key intersections for wet-road pools
    const lit = lampPositions.filter((_, i) => i % 6 === 0).slice(0, 12);
    for (const p of lit) {
      const light = new THREE.PointLight(0xffd9a0, 340, 60, 1.9);
      light.position.set(p.x, 6.4, p.z);
      this.scene.add(light);
    }
  }

  _buildRain() {
    const count = 1500;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 160;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 160;
      vel[i] = 38 + Math.random() * 22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x9db8ff, size: 0.14, transparent: true, opacity: 0.55, sizeAttenuation: true,
    });
    this.rain = new THREE.Points(geo, mat);
    this.rain.frustumCulled = false;
    this.rainVelocity = vel;
    this.scene.add(this.rain);
  }

  updateRain(dt, center) {
    if (!this.rain) return;
    const pos = this.rain.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - this.rainVelocity[i] * dt;
      if (y < 0) {
        y = 55 + Math.random() * 5;
        pos.setX(i, center.x + (Math.random() - 0.5) * 160);
        pos.setZ(i, center.z + (Math.random() - 0.5) * 160);
      }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.rain.position.x = 0;
    this.rain.position.z = 0;
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
