// Solmara Bay — the HUD.
// One clear job: everything the player reads while playing. The mission panel,
// the wanted stars, the money, the police list, the crew, the minimap, the
// dialogue and the speed — all DOM and one canvas, updated every frame from
// the game state the boot loop hands over.
import { RADIO } from './config.js';

export class Hud {
  constructor() {
    this.el = {};
    const ids = [
      'mission-title', 'mission-stage', 'mission-bar', 'mission-next',
      'money', 'stars', 'clock', 'day',
      'police-list', 'police-count', 'police-state',
      'crew-panel', 'district-name', 'district-street', 'district-stand',
      'rank-name', 'rank-bar',
      'health-bar', 'health-num', 'armor-bar', 'armor-num',
      'dialogue', 'dialogue-name', 'dialogue-text', 'dialogue-face',
      'speed-num', 'car-name', 'car-cond', 'car-cond-bar',
      'weapons', 'radio-line', 'center-card', 'center-title', 'center-sub',
      'start-screen', 'start-save', 'help-screen', 'toast',
    ];
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map ? this.map.getContext('2d') : null;
    this.dialogueUntil = 0;
    this.toastUntil = 0;
  }

  // --- Mission panel (top left). ---
  mission(info, jobsDone) {
    if (!info || !info.job) {
      this.el['mission-title'].textContent = 'SOLMARA BAY';
      this.el['mission-stage'].textContent = info ? info.label : '';
      this.el['mission-bar'].style.width = '0%';
      this.el['mission-next'].textContent = info ? info.next : '';
      return;
    }
    const job = info.job;
    this.el['mission-title'].textContent = `JOB ${job.id}/11 · ${job.name}`;
    const stage = info.stage;
    if (stage) {
      const total = job.stages.length;
      const idx = job.stages.indexOf(stage);
      this.el['mission-stage'].textContent = `STAGE ${idx + 1}/${total} · ${stage.label.toUpperCase()}`;
      this.el['mission-bar'].style.width = `${Math.round(((idx + 1) / total) * 100)}%`;
      this.el['mission-next'].textContent = `NEXT ${info.next.toUpperCase()}`;
    } else {
      this.el['mission-stage'].textContent = info.label.toUpperCase();
      this.el['mission-bar'].style.width = `${Math.round((jobsDone / 11) * 100)}%`;
      this.el['mission-next'].textContent = info.next.toUpperCase();
    }
  }

  // --- Top right: money, wanted stars, clock. ---
  status(money, stars, hour, minute, day) {
    this.el.money.textContent = `$${money.toLocaleString()}`;
    let starHtml = '';
    for (let i = 0; i < 5; i++) {
      starHtml += `<span class="star ${i < stars ? 'on' : ''}">★</span>`;
    }
    this.el.stars.innerHTML = starHtml;
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    this.el.clock.textContent = `${hh}:${mm}`;
    this.el.day.textContent = `DAY ${day}`;
  }

  // --- Police response list (right side). ---
  police(units, inSight, eyesOut) {
    this.el['police-count'].textContent = `${units.length} UNITS`;
    this.el['police-state'].textContent = eyesOut ? 'EYES OUT' : inSight ? 'IN SIGHT' : units.length ? 'SEARCHING' : 'CLEAR';
    let html = '';
    for (const u of units.slice(0, 6)) {
      html += `<div class="pd-row"><span class="pd-name">${u.callsign}</span><span class="pd-role">${u.role}</span><span class="pd-dist">${u.dist} m</span></div>`;
    }
    if (units.length > 6) html += `<div class="pd-more">+${units.length - 6} more</div>`;
    this.el['police-list'].innerHTML = html || '<div class="pd-none">No units on you.</div>';
  }

  // --- Crew panel (right side): portraits, keys, cooldowns. ---
  crew(members) {
    let html = '';
    for (const m of members) {
      const cd = m.ready ? '' : `<span class="cd">${m.cooldownLeft}s</span>`;
      html += `<div class="crew-row ${m.ready ? 'ready' : 'cooling'}" style="--cc:${m.color}">
        <img class="crew-face" src="${m.portrait}" alt="${m.name}">
        <div class="crew-info"><div class="crew-ability">${m.ability}</div>
        <div class="crew-sub">${m.name} · ${m.role}</div></div>
        <span class="crew-key">${m.key}</span>${cd}</div>`;
    }
    this.el['crew-panel'].innerHTML = html;
  }

  // --- District + respect (bottom left). ---
  district(d, rankName, respect, respectNext) {
    this.el['district-name'].textContent = d.name;
    this.el['district-street'].textContent = d.street;
    this.el['rank-name'].textContent = rankName;
    const pct = respectNext > 0 ? Math.min(100, Math.round((respect / respectNext) * 100)) : 100;
    this.el['rank-bar'].style.width = `${pct}%`;
    this.el['district-stand'].textContent = `${respect} / ${respectNext} RESPECT`;
  }

  // --- Health and armour bars. ---
  vitals(health, armor) {
    this.el['health-bar'].style.width = `${health}%`;
    this.el['health-num'].textContent = Math.round(health);
    this.el['armor-bar'].style.width = `${armor}%`;
    this.el['armor-num'].textContent = Math.round(armor);
  }

  // --- Dialogue box (bottom centre). ---
  say(name, role, text, face, now, seconds = 6) {
    this.el['dialogue-name'].textContent = `${name} · ${role}`;
    this.el['dialogue-text'].textContent = text;
    if (face) this.el['dialogue-face'].src = face;
    this.el.dialogue.classList.add('show');
    this.dialogueUntil = now + seconds;
  }

  // --- Speed, car, weapons, radio (bottom right). ---
  drive(speedKmh, carName, condition, weapons, track) {
    this.el['speed-num'].textContent = Math.round(speedKmh);
    this.el['car-name'].textContent = carName || 'ON FOOT';
    this.el['car-cond'].textContent = carName ? `${Math.round(condition * 100)}%` : '—';
    this.el['car-cond-bar'].style.width = `${Math.round(condition * 100)}%`;
    let html = '';
    for (const w of weapons) {
      html += `<div class="wp ${w.active ? 'active' : ''}"><span class="wp-slot">${w.slot}</span><span class="wp-name">${w.name}</span><span class="wp-ammo">${w.ammo}</span></div>`;
    }
    this.el.weapons.innerHTML = html;
    this.el['radio-line'].textContent = `♪ ${RADIO.station} — ${track}`;
  }

  // --- Centre announcement card (hidden while staging screenshots). ---
  announce(title, sub, now, seconds = 3) {
    this.el['center-title'].textContent = title;
    this.el['center-sub'].textContent = sub;
    this.el['center-card'].classList.add('show');
    this.announceUntil = now + seconds;
  }

  hideAnnounce() {
    this.el['center-card'].classList.remove('show');
  }

  toast(text, now, seconds = 3) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    this.toastUntil = now + seconds;
  }

  // Per-frame housekeeping: hide expired dialogue, announcements, toasts.
  update(now) {
    if (this.dialogueUntil && now > this.dialogueUntil) {
      this.el.dialogue.classList.remove('show');
      this.dialogueUntil = 0;
    }
    if (this.announceUntil && now > this.announceUntil) {
      this.el['center-card'].classList.remove('show');
      this.announceUntil = 0;
    }
    if (this.toastUntil && now > this.toastUntil) {
      this.el.toast.classList.remove('show');
      this.toastUntil = 0;
    }
  }

  // --- Minimap: a round chart of the island. North is up; the bay is the
  // blue band at the bottom, the pier a line into it, the player a white
  // arrow, police red dots, the mission beacon a gold diamond. ---
  minimap(state) {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const S = this.map.width;
    const cx = S / 2;
    const cy = S / 2;
    const R = S / 2 - 4;
    ctx.clearRect(0, 0, S, S);
    // Clip to the round face.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    // Land.
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(0, 0, S, S);
    // The bay: everything south of the beach line.
    const toY = (z) => cy + ((z - 0) / 280) * R;
    const toX = (x) => cx + (x / 280) * R;
    ctx.fillStyle = '#1a7f9e';
    ctx.fillRect(0, toY(224), S, S - toY(224));
    // Sand strip.
    ctx.fillStyle = '#e8d29a';
    ctx.fillRect(0, toY(224), S, toY(252) - toY(224));
    // Streets.
    ctx.strokeStyle = '#2a2e38';
    ctx.lineWidth = 4;
    for (const p of [-180, -120, -60, 0, 60, 120, 180]) {
      ctx.beginPath(); ctx.moveTo(toX(p), toY(-216)); ctx.lineTo(toX(p), toY(216)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(toX(-216), toY(p)); ctx.lineTo(toX(216), toY(p)); ctx.stroke();
    }
    // Boardwalk.
    ctx.beginPath(); ctx.moveTo(toX(-216), toY(216)); ctx.lineTo(toX(216), toY(216)); ctx.stroke();
    // Pier.
    ctx.strokeStyle = '#8a6a42';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(toX(24), toY(224)); ctx.lineTo(toX(24), toY(312)); ctx.stroke();
    // Blocks.
    ctx.fillStyle = '#5c6068';
    for (const bx of [-150, -90, -30, 30, 90, 150]) {
      for (const bz of [-150, -90, -30, 30, 90, 150]) {
        ctx.fillRect(toX(bx - 20), toY(bz - 20), 40 * (R / 140), 40 * (R / 140));
      }
    }
    // Mission beacon.
    if (state.beacon) {
      ctx.fillStyle = '#ffd75e';
      const bx = toX(state.beacon.x);
      const by = toY(state.beacon.z);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
    // Race checkpoint.
    if (state.raceCp) {
      ctx.fillStyle = '#39ff88';
      ctx.beginPath();
      ctx.arc(toX(state.raceCp.x), toY(state.raceCp.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Police dots.
    ctx.fillStyle = '#ff2244';
    for (const u of state.police || []) {
      ctx.beginPath();
      ctx.arc(toX(u.x), toY(u.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Helicopter.
    if (state.heli) {
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(toX(state.heli.x), toY(state.heli.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player: a white arrow pointing where they face.
    ctx.save();
    ctx.translate(toX(state.px), toY(state.pz));
    ctx.rotate(state.yaw || 0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // Rim and north marker.
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 16);
  }

  // --- Start screen and help. ---
  showStart(saveSummary) {
    this.el['start-save'].textContent = saveSummary;
    this.el['start-screen'].classList.remove('hidden');
  }

  hideStart() {
    this.el['start-screen'].classList.add('hidden');
  }

  toggleHelp(show) {
    this.el['help-screen'].classList.toggle('hidden', !show);
  }
}
