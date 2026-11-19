// v8: Solmara Bay — re-authored in this session under recording 01a1f524 (2026-11-20).
// The HUD's v8 work is the crew panel (Mira / Zio / Kiki canvas portraits
// with key + cooldown badges), the Bay PD response list with named callsigns,
// role chips (RAMMING / FLANKING / SPOTLIGHT / ROADBLOCK / CLOSING IN /
// PURSUIT) and a header carrying unit count + stars + IN SIGHT / SEARCHING /
// EYES OUT, the district label under the minimap, respect rank names
// (ROOKIE / DOCK HAND / FIXER / SHOT CALLER), and the minimap's coast —
// sand strip, bay and pier line along its south edge.
// v7: Sun-Kissed Bay — HELICOPTER gear readout (HOVER / AIRBORNE), under recording 01a1f27b.
// v6: Golden Hour Kings — weapon readout + garage/shop panels, under recording 01a1f269.
// v5: Golden Hour — game clock (time + phase) in the radio panel, under recording 01a1f255.
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// HUD for Neon Bay: cash, health, wanted stars, mission banner, message feed,
// dialogue box, and a live 2D minimap drawn on a canvas (streets, buildings,
// player, traffic, police and the mission marker).
// v2: neon-orb counter, a big mission-intro card that flashes when a job starts,
// a red damage vignette, and a minimap that also shows the police helicopter and
// the remaining orbs.
// v3: a dense top-1-style HUD — radio station + song, a big speedometer, a mission
// panel with stage progress and NEXT step, a Bay PD response list with named units
// and distances, a respect meter, and a canvas-drawn portrait of fixer Vex Marlowe
// in the dialogue box.
import { CITY_EXTENT, STREET_STEP, phaseNameFor } from './city.js';

export class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    this.cashEl = document.getElementById('cash');
    this.jobEl = document.getElementById('jobLabel');
    this.healthEl = document.getElementById('healthBar');
    this.starsEl = document.getElementById('wantedBox');
    this.missionTitleEl = document.getElementById('missionTitle');
    this.missionTextEl = document.getElementById('missionText');
    this.missionStageEl = document.getElementById('missionStage');
    this.missionNextEl = document.getElementById('missionNext');
    this.speedEl = document.getElementById('speed');
    this.modeEl = document.getElementById('modeLabel');
    this.gearEl = document.getElementById('gearLabel');
    this.feedEl = document.getElementById('feed');
    this.dialogEl = document.getElementById('dialog');
    this.dialogWhoEl = document.getElementById('dialogWho');
    this.dialogTextEl = document.getElementById('dialogText');
    this.crosshairEl = document.getElementById('crosshair');
    this.orbEl = document.getElementById('orbCount');
    this.cardEl = document.getElementById('missionCard');
    this.cardTitleEl = document.getElementById('missionCardTitle');
    this.cardSubEl = document.getElementById('missionCardSub');
    this.cardQuoteEl = document.getElementById('missionCardQuote');
    this.vignetteEl = document.getElementById('damageVignette');
    this.radioSongEl = document.getElementById('radioSong');
    this.clockEl = document.getElementById('clockLine'); // v5: game clock
    this.policeListEl = document.getElementById('policeList');
    this.policeTitleEl = document.getElementById('policeTitle'); // v8: unit count + stars
    this.respectBarEl = document.getElementById('respectBar');
    this.respectPctEl = document.getElementById('respectPct');
    this.respectRankEl = document.getElementById('respectRank'); // v8: ROOKIE → SHOT CALLER
    // v8: crew panel — three faces, three abilities, three cooldowns
    this.crewEls = [0, 1, 2].map((i) => ({
      cd: document.getElementById(`crewCd${i}`),
      row: document.getElementById(`crewRow${i}`),
    }));
    this.districtNameEl = document.getElementById('districtName'); // v8: where you are
    this.districtStandingEl = document.getElementById('districtStanding');
    // v6: weapon readout + garage/shop panels
    this.weaponNameEl = document.getElementById('weaponName');
    this.weaponAmmoEl = document.getElementById('weaponAmmo');
    this.garageEl = document.getElementById('garagePanel');
    this.shopEl = document.getElementById('shopPanel');
    this.garageEngineEl = document.getElementById('garageEngine');
    this.garageArmorEl = document.getElementById('garageArmor');
    this.garageHandlingEl = document.getElementById('garageHandling');
    this.mapCanvas = document.getElementById('minimap');
    this.mapCtx = this.mapCanvas.getContext('2d');
    this.feedLines = [];
    this._cardTimer = 0;
    this._drawVexPortrait();
    this._drawCrewPortraits(); // v8: Mira, Zio, Kiki
  }

  show() { this.el.classList.add('on'); }
  hide() { this.el.classList.remove('on'); }

  setCash(cash) { this.cashEl.textContent = cash.toLocaleString('en-US'); }
  setJob(label) { this.jobEl.textContent = label; }
  setHealth(hp) { this.healthEl.style.width = `${Math.max(0, Math.min(100, hp))}%`; }
  setOrbs(n, total) { if (this.orbEl) this.orbEl.textContent = `${n}/${total}`; }
  setWanted(stars) {
    const spans = this.starsEl.querySelectorAll('[data-star]');
    spans.forEach((s) => {
      const n = Number(s.dataset.star);
      s.classList.toggle('lit', n <= stars);
    });
  }
  // mission panel: title, current objective, stage x/y and the NEXT step
  setMission(title, text, stage = '', next = '') {
    this.missionTitleEl.textContent = title;
    this.missionTextEl.textContent = text;
    if (this.missionStageEl) this.missionStageEl.textContent = stage;
    if (this.missionNextEl) this.missionNextEl.textContent = next;
  }
  setSpeed(kmh, mode) {
    const v = Math.round(Math.abs(kmh));
    this.speedEl.textContent = v;
    this.modeEl.textContent = mode;
    if (this.gearEl) {
      this.gearEl.textContent = mode === 'DRIVING'
        ? (v < 1 ? '· PARK' : v < 60 ? '· GEAR 2' : v < 110 ? '· GEAR 3' : '· GEAR 4')
        : mode === 'HELICOPTER' ? (v < 1 ? '· HOVER' : '· AIRBORNE') // v7: SKYHAWK readout
        : '';
    }
  }
  setCrosshair(on) { this.crosshairEl.style.display = on ? 'block' : 'none'; }
  setRadio(song) { if (this.radioSongEl) this.radioSongEl.textContent = song; }
  // v5: game clock — "17:30 · GOLDEN HOUR", from the game hour in [0, 24)
  setClock(t) {
    if (!this.clockEl) return;
    const h = ((t % 24) + 24) % 24;
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    this.clockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${phaseNameFor(h)}`;
  }
  setRespect(pct) {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (this.respectBarEl) this.respectBarEl.style.width = `${p}%`;
    if (this.respectPctEl) this.respectPctEl.textContent = `${p}%`;
    // v8: a rank name with the number, like the top entries' RESPECT LV 4 · FIXER
    if (this.respectRankEl) {
      this.respectRankEl.textContent = p < 25 ? 'ROOKIE' : p < 50 ? 'DOCK HAND' : p < 75 ? 'FIXER' : 'SHOT CALLER';
    }
  }
  // v8: district label under the minimap — "SOLMARA STRAND · NEUTRAL · 58%"
  setDistrict(name, standing) {
    if (this.districtNameEl) this.districtNameEl.textContent = name;
    if (this.districtStandingEl) this.districtStandingEl.textContent = standing;
  }
  // v8: crew cooldowns — each row shows its key + READY or the seconds left
  setCrew(states) {
    if (!states) return;
    const keys = ['Z', 'X', 'C'];
    states.forEach((s, i) => {
      const el = this.crewEls[i];
      if (!el || !el.cd) return;
      el.cd.textContent = s.cd > 0 ? `${keys[i]} · ${Math.ceil(s.cd)}s` : `${keys[i]} · READY`;
      el.cd.classList.toggle('cooling', s.cd > 0);
      if (el.row) el.row.classList.toggle('cooling', s.cd > 0);
    });
  }
  // v6: weapon wheel readout — name + ammo (∞ for the pistol)
  setWeapon(name, ammoLabel) {
    if (this.weaponNameEl) this.weaponNameEl.textContent = name;
    if (this.weaponAmmoEl) this.weaponAmmoEl.textContent = ammoLabel;
  }
  // v6: garage upgrades panel — each button shows its level and next price
  showGarage(upgrades) {
    if (!this.garageEl) return;
    this.setGarage(upgrades);
    this.garageEl.style.display = 'block';
  }
  hideGarage() { if (this.garageEl) this.garageEl.style.display = 'none'; }
  setGarage(upgrades) {
    if (!upgrades) return;
    const label = (el, name, level, costs) => {
      if (!el) return;
      el.textContent = level >= 3
        ? `${name} — LV 3 MAX`
        : `${name} — LV ${level} · NEXT $${costs[level]}`;
    };
    label(this.garageEngineEl, 'ENGINE', upgrades.engine, [400, 800, 1400]);
    label(this.garageArmorEl, 'ARMOR', upgrades.armor, [400, 800, 1400]);
    label(this.garageHandlingEl, 'HANDLING', upgrades.handling, [400, 800, 1400]);
  }
  // v6: AMMO-NATION shop panel
  showShop() { if (this.shopEl) this.shopEl.style.display = 'block'; }
  hideShop() { if (this.shopEl) this.shopEl.style.display = 'none'; }
  // Bay PD response list: [{name, role, dist}] — named units with a role chip
  // and a distance, like the top entries' dispatch panels. header carries the
  // unit count, the stars and the IN SIGHT / SEARCHING state.
  setPoliceList(units, header) {
    if (!this.policeListEl) return;
    if (this.policeTitleEl && header) this.policeTitleEl.textContent = header;
    if (!units || units.length === 0) {
      this.policeListEl.innerHTML = '<div class="unit">No units responding</div>';
      return;
    }
    this.policeListEl.innerHTML = units.map((u) =>
      `<div class="unit"><b>${u.name}</b>${u.role ? ` <span class="role role-${u.role.toLowerCase().replace(/ /g, '-')}">${u.role}</span>` : ''} <span class="dist">${u.dist}</span></div>`).join('');
  }

  // big center card that announces a job (or a completion); holdMs keeps it up
  // longer for screenshots; quote is Vex's line of dialogue under her name
  showMissionCard(title, sub, holdMs = 3200, quote = '') {
    if (!this.cardEl) return;
    this.cardTitleEl.textContent = title;
    this.cardSubEl.textContent = sub;
    if (this.cardQuoteEl) {
      this.cardQuoteEl.textContent = quote ? `“${quote}”` : '';
      this.cardQuoteEl.style.display = quote ? 'block' : 'none';
    }
    this.cardEl.style.display = 'block';
    this.cardEl.classList.remove('cardOut');
    window.clearTimeout(this._cardTimer);
    this._cardTimer = window.setTimeout(() => {
      this.cardEl.classList.add('cardOut');
      window.setTimeout(() => { this.cardEl.style.display = 'none'; }, 450);
    }, holdMs);
  }

  // red flash at the screen edge when the player takes damage
  flashDamage() {
    if (!this.vignetteEl) return;
    this.vignetteEl.style.opacity = '0.85';
    window.setTimeout(() => { this.vignetteEl.style.opacity = '0'; }, 220);
  }

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

  // Vex Marlowe, drawn on a canvas at boot: neon-pink hair, shades, city glow.
  // Drawn into the dialogue portrait (64px) and the mission-card portrait (48px).
  _drawVexPortrait() {
    const draw = (c, size) => {
      if (!c) return;
      const g = c.getContext('2d');
      g.save();
      g.scale(size / 64, size / 64);
      this._paintVex(g);
      g.restore();
    };
    draw(document.getElementById('vexPortrait'), 64);
    draw(document.getElementById('missionCardPortrait'), 48);
  }

  _paintVex(g) {
    g.fillStyle = '#0b0e1a'; g.fillRect(0, 0, 64, 64);
    // city glow behind her
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#3a0a3a'); grad.addColorStop(1, '#0b0e1a');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ff2d78';
    for (let i = 0; i < 5; i++) g.fillRect(4 + i * 12, 44 + (i % 2) * 6, 4, 14);
    // hair: neon-pink bob
    g.fillStyle = '#ff2d78';
    g.beginPath();
    g.arc(32, 26, 19, Math.PI, 0);
    g.fill();
    g.fillRect(13, 24, 8, 26);
    g.fillRect(43, 24, 8, 26);
    // face
    g.fillStyle = '#e8b98a';
    g.beginPath();
    g.arc(32, 32, 13, 0, Math.PI * 2);
    g.fill();
    // shades
    g.fillStyle = '#0a0c12';
    g.fillRect(19, 28, 11, 6);
    g.fillRect(34, 28, 11, 6);
    g.fillRect(29, 30, 6, 2);
    // lips
    g.fillStyle = '#ff2d78';
    g.fillRect(27, 43, 10, 2);
    // jacket collar
    g.fillStyle = '#14204a';
    g.beginPath();
    g.moveTo(14, 64); g.lineTo(32, 48); g.lineTo(50, 64); g.closePath();
    g.fill();
    g.strokeStyle = '#00e5ff'; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, 63, 63);
  }

  // v8: the crew — Mira (driver, teal hair), Zio (mechanic, orange cap),
  // Kiki (lookout, purple hair + shades). Same canvas-paint style as Vex.
  _drawCrewPortraits() {
    const painters = [this._paintMira, this._paintZio, this._paintKiki];
    painters.forEach((paint, i) => {
      const c = document.getElementById(`crewPortrait${i}`);
      if (!c) return;
      const g = c.getContext('2d');
      g.save();
      g.scale(32 / 64, 32 / 64);
      paint.call(this, g);
      g.restore();
    });
  }

  _paintMira(g) {
    g.fillStyle = '#0b0e1a'; g.fillRect(0, 0, 64, 64);
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#0a3a3a'); grad.addColorStop(1, '#0b0e1a');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#00b4d8';
    for (let i = 0; i < 5; i++) g.fillRect(4 + i * 12, 44 + (i % 2) * 6, 4, 14);
    g.fillStyle = '#00b4d8';
    g.beginPath(); g.arc(32, 26, 19, Math.PI, 0); g.fill();
    g.fillRect(13, 24, 8, 26); g.fillRect(43, 24, 8, 26);
    g.fillStyle = '#c98f6a';
    g.beginPath(); g.arc(32, 32, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0a0c12';
    g.fillRect(20, 29, 10, 5); g.fillRect(34, 29, 10, 5);
    g.fillStyle = '#ff5e3a'; g.fillRect(27, 43, 10, 2);
    g.fillStyle = '#14204a';
    g.beginPath(); g.moveTo(14, 64); g.lineTo(32, 48); g.lineTo(50, 64); g.closePath(); g.fill();
    g.strokeStyle = '#00b4d8'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 63, 63);
  }

  _paintZio(g) {
    g.fillStyle = '#0b0e1a'; g.fillRect(0, 0, 64, 64);
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#3a2a0a'); grad.addColorStop(1, '#0b0e1a');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ff8a3d';
    for (let i = 0; i < 5; i++) g.fillRect(4 + i * 12, 44 + (i % 2) * 6, 4, 14);
    // orange cap
    g.fillStyle = '#ff6a1a';
    g.beginPath(); g.arc(32, 24, 15, Math.PI, 0); g.fill();
    g.fillRect(14, 22, 36, 4);
    g.fillRect(30, 20, 22, 4); // brim
    g.fillStyle = '#8a5a3a';
    g.beginPath(); g.arc(32, 33, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0a0c12';
    g.fillRect(20, 30, 10, 5); g.fillRect(34, 30, 10, 5);
    // stubble
    g.fillStyle = '#2a1a10'; g.fillRect(24, 42, 16, 5);
    g.fillStyle = '#2c3a2c';
    g.beginPath(); g.moveTo(14, 64); g.lineTo(32, 48); g.lineTo(50, 64); g.closePath(); g.fill();
    g.strokeStyle = '#ff8a3d'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 63, 63);
  }

  _paintKiki(g) {
    g.fillStyle = '#0b0e1a'; g.fillRect(0, 0, 64, 64);
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#2a0a3a'); grad.addColorStop(1, '#0b0e1a');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#b300ff';
    for (let i = 0; i < 5; i++) g.fillRect(4 + i * 12, 44 + (i % 2) * 6, 4, 14);
    // long purple hair
    g.fillStyle = '#b300ff';
    g.beginPath(); g.arc(32, 26, 19, Math.PI, 0); g.fill();
    g.fillRect(11, 24, 9, 34); g.fillRect(44, 24, 9, 34);
    g.fillStyle = '#f2c9a0';
    g.beginPath(); g.arc(32, 32, 13, 0, Math.PI * 2); g.fill();
    // shades
    g.fillStyle = '#0a0c12';
    g.fillRect(19, 28, 11, 6); g.fillRect(34, 28, 11, 6); g.fillRect(29, 30, 6, 2);
    g.fillStyle = '#ff2d78'; g.fillRect(27, 43, 10, 2);
    g.fillStyle = '#3a0a3a';
    g.beginPath(); g.moveTo(14, 64); g.lineTo(32, 48); g.lineTo(50, 64); g.closePath(); g.fill();
    g.strokeStyle = '#b300ff'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 63, 63);
  }

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
    // v8: the coast — sand strip and the bay along the bottom edge, the pier
    // as a line out into the water
    const beachY = toY(224);
    if (beachY < H) {
      ctx.fillStyle = '#c9a86a';
      ctx.fillRect(0, Math.max(0, beachY), W, H - Math.max(0, beachY));
      ctx.fillStyle = '#1a7fb0';
      ctx.fillRect(0, Math.max(0, toY(252)), W, H - Math.max(0, toY(252)));
      ctx.strokeStyle = '#e8d29a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(24), Math.max(0, toY(224)));
      ctx.lineTo(toX(24), H);
      ctx.stroke();
    }
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
    // remaining neon orbs
    if (view.orbs) {
      ctx.fillStyle = '#00e5ff';
      for (const o of view.orbs) {
        ctx.beginPath(); ctx.arc(toX(o.x), toY(o.z), 2.5, 0, Math.PI * 2); ctx.fill();
      }
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
    // police helicopter: a bigger ringed marker so it stands out
    if (view.heli) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(toX(view.heli.x), toY(view.heli.z), 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = flash ? '#ff2244' : '#3366ff';
      ctx.beginPath(); ctx.arc(toX(view.heli.x), toY(view.heli.z), 3, 0, Math.PI * 2); ctx.fill();
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
