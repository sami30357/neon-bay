// Solmara Bay — the paint shop.
// One clear job: every canvas texture the city wears — building faces, neon
// signs, roads, sand, water, glows and shadows — drawn fresh in code, so the
// island looks painted, not flat.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hexCss(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// A building face: a coloured wall with a grid of windows, some lit warm,
// some dark. The caller tiles it with repeat.
export function facadeTexture(rng, color) {
  const [c, g] = canvas(128, 256);
  g.fillStyle = hexCss(color);
  g.fillRect(0, 0, 128, 256);
  // A darker base band, so the ground floor reads heavier.
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 224, 128, 32);
  const cols = 4;
  const rows = 8;
  const ww = 128 / cols;
  const wh = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * ww + 5;
      const y = r * wh + 6;
      if (rng.chance(0.55)) {
        // Lit: warm glass.
        g.fillStyle = rng.chance(0.7) ? '#ffd75e' : '#9fd0f0';
        g.fillRect(x, y, ww - 10, wh - 12);
      } else {
        g.fillStyle = 'rgba(8,10,18,0.85)';
        g.fillRect(x, y, ww - 10, wh - 12);
      }
    }
  }
  return toTexture(c);
}

// A neon sign: glowing letters on a dark plate.
export function signTexture(word, color) {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#05060f';
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.strokeRect(4, 4, 504, 120);
  g.fillStyle = color;
  g.font = '900 64px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 28;
  g.fillText(word, 256, 66);
  g.shadowBlur = 0;
  g.fillText(word, 256, 66);
  return toTexture(c);
}

// Asphalt with a dashed centre line and worn edges, tileable both ways.
export function roadTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#23262e';
  g.fillRect(0, 0, 128, 128);
  // Speckle, so the asphalt is not a flat slab.
  for (let i = 0; i < 260; i++) {
    const v = 30 + Math.floor(Math.random() * 26);
    g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  // Centre dashes down the middle of the tile.
  g.fillStyle = '#e8e4d8';
  g.fillRect(62, 8, 4, 28);
  g.fillRect(62, 72, 4, 28);
  // Faded edge lines.
  g.fillStyle = 'rgba(232,228,216,0.5)';
  g.fillRect(4, 0, 3, 128);
  g.fillRect(121, 0, 3, 128);
  const tex = toTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Beach sand: warm grains with a few darker flecks.
export function sandTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#d8c08a';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    const warm = Math.random() < 0.5;
    g.fillStyle = warm ? 'rgba(190,160,105,0.7)' : 'rgba(240,220,170,0.7)';
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = toTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Open water: deep blue with pale wave streaks running across it.
export function waterTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#1a6fb0';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const y = Math.random() * 256;
    const x = Math.random() * 200;
    const len = 20 + Math.random() * 50;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y + (Math.random() * 4 - 2));
    g.stroke();
  }
  g.strokeStyle = 'rgba(10,40,70,0.35)';
  for (let i = 0; i < 18; i++) {
    const y = Math.random() * 256;
    const x = Math.random() * 200;
    const len = 30 + Math.random() * 60;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y);
    g.stroke();
  }
  const tex = toTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// A soft white glow, hot in the middle and fading to nothing at the edge.
// Sprites use it for beacons, muzzle flashes and race markers.
export function glowTexture() {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

// A soft dark blob, the cheap shadow under the player and the cars.
export function blobTexture() {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}
