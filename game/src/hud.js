// HUD for Neon Bay: cash, health, wanted stars, mission banner, message feed,
// dialogue box, and a live 2D minimap drawn on a canvas (streets, buildings,
// player, traffic, police and the mission marker).
import { CITY_EXTENT, STREET_STEP } from './city.js';

export class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    this.cashEl = document.getElementById('cash');
    this.jobEl = document.getElementById('jobLabel');
    this.healthEl = document.getElementById('healthBar');
    this.starsEl = document.getElementById('wantedBox');
    this.missionTitleEl = document.getElementById('missionTitle');
    this.missionTextEl = document.getElementById('missionText');
    this.speedEl = document.getElementById('speed');
    this.modeEl = document.getElementById('modeLabel');
    this.feedEl = document.getElementById('feed');
    this.dialogEl = document.getElementById('dialog');
    this.dialogWhoEl = document.getElementById('dialogWho');
    this.dialogTextEl = document.getElementById('dialogText');
    this.crosshairEl = document.getElementById('crosshair');
    this.mapCanvas = document.getElementById('minimap');
    this.mapCtx = this.mapCanvas.getContext('2d');
    this.feedLines = [];
  }

  show() { this.el.classList.add('on'); }
  hide() { this.el.classList.remove('on'); }

  setCash(cash) { this.cashEl.textContent = cash.toLocaleString('en-US'); }
  setJob(label) { this.jobEl.textContent = label; }
  setHealth(hp) { this.healthEl.style.width = `${Math.max(0, Math.min(100, hp))}%`; }
  setWanted(stars) {
    const spans = this.starsEl.querySelectorAll('[data-star]');
    spans.forEach((s) => {
      const n = Number(s.dataset.star);
      s.classList.toggle('lit', n <= stars);
    });
  }
  setMission(title, text) {
    this.missionTitleEl.textContent = title;
    this.missionTextEl.textContent = text;
  }
  setSpeed(kmh, mode) {
    this.speedEl.textContent = Math.round(Math.abs(kmh));
    this.modeEl.textContent = mode;
  }
  setCrosshair(on) { this.crosshairEl.style.display = on ? 'block' : 'none'; }

  feed(text) {
    this.feedLines.push(text);
    if (this.feedLines.length > 4) this.feedLines.shift();
    this.feedEl.innerHTML = this.feedLines.map((l) => `<div>${l}</div>`).join('');
    window.setTimeout(() => {
      const i = this.feedLines.indexOf(text);
      if (i >= 0) {
        this.feedLines.splice(i, 1);
        this.feedEl.innerHTML = this.feedLines.map((l) => `<div>${l}</div>`).join('');
      }
    }, 6000);
  }

  showDialog(who, text) {
    this.dialogWhoEl.textContent = who;
    this.dialogTextEl.textContent = text;
    this.dialogEl.style.display = 'block';
  }
  hideDialog() { this.dialogEl.style.display = 'none'; }

  // live minimap: north-up, city scaled to the canvas
  drawMinimap(view) {
    const ctx = this.mapCtx;
    const W = this.mapCanvas.width, H = this.mapCanvas.height;
    const scale = W / (CITY_EXTENT * 2 + 40);
    const toX = (x) => W / 2 + x * scale;
    const toY = (z) => H / 2 + z * scale;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#070b18';
    ctx.fillRect(0, 0, W, H);
    // buildings
    ctx.fillStyle = '#1b2340';
    for (const b of view.buildings) {
      ctx.fillRect(toX(b.x - b.w / 2), toY(b.z - b.d / 2), Math.max(1.5, b.w * scale), Math.max(1.5, b.d * scale));
    }
    // roads
    ctx.strokeStyle = '#3a4568';
    ctx.lineWidth = Math.max(2, 12 * scale);
    for (let p = -CITY_EXTENT; p <= CITY_EXTENT; p += STREET_STEP) {
      ctx.beginPath(); ctx.moveTo(toX(p), 0); ctx.lineTo(toX(p), H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, toY(p)); ctx.lineTo(W, toY(p)); ctx.stroke();
    }
    // mission marker
    if (view.missionTarget) {
      const mx = toX(view.missionTarget.x), my = toY(view.missionTarget.z);
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath();
      ctx.moveTo(mx, my - 7); ctx.lineTo(mx + 6, my); ctx.lineTo(mx, my + 7); ctx.lineTo(mx - 6, my);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,94,0.5)';
      ctx.beginPath(); ctx.arc(mx, my, 10 + Math.sin(performance.now() * 0.005) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    // traffic
    ctx.fillStyle = '#9fb8d8';
    for (const c of view.traffic) {
      ctx.fillRect(toX(c.x) - 1.5, toY(c.z) - 1.5, 3, 3);
    }
    // police (flashing)
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2244' : '#3366ff';
    for (const p of view.police) {
      ctx.beginPath(); ctx.arc(toX(p.x), toY(p.z), 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // player arrow
    const px = toX(view.player.x), py = toY(view.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(view.player.heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // north label
    ctx.fillStyle = '#5f7ba6';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('N', 6, 12);
  }
}
