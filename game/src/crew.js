// Solmara Bay — the crew.
// One clear job: Lena, Omar and Sana, and the three abilities on Z, X and C.
// The crew rides with you: their portraits sit in the HUD with a key badge and
// a cooldown ring, and their lines show up in the dialogue box.
import { CREW } from './config.js';

export class Crew {
  constructor() {
    this.members = CREW.map((c) => ({
      ...c,
      cooldownLeft: 0,
      ready: true,
      portrait: Crew.portrait(c),
    }));
    this.eyesOutUntil = 0;
  }

  // Draw a small portrait on a canvas: a face with hair and a shirt, in the
  // member's colours. The HUD uses these as the crew's faces.
  static portrait(member, size = 64) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = member.color;
    g.fillRect(0, 0, size, size);
    // Shoulders.
    g.fillStyle = member.shirt;
    g.beginPath();
    g.ellipse(size / 2, size * 0.95, size * 0.42, size * 0.3, 0, Math.PI, 0);
    g.fill();
    // Head.
    g.fillStyle = member.skin;
    g.beginPath();
    g.arc(size / 2, size * 0.46, size * 0.26, 0, Math.PI * 2);
    g.fill();
    // Hair.
    g.fillStyle = member.hair;
    g.beginPath();
    g.arc(size / 2, size * 0.34, size * 0.26, Math.PI, 0);
    g.fill();
    g.fillRect(size * 0.24, size * 0.3, size * 0.52, size * 0.1);
    // Eyes.
    g.fillStyle = '#111111';
    g.beginPath(); g.arc(size * 0.42, size * 0.46, size * 0.035, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(size * 0.58, size * 0.46, size * 0.035, 0, Math.PI * 2); g.fill();
    // Smile.
    g.strokeStyle = '#7a3a2a';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(size / 2, size * 0.56, size * 0.09, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    return c.toDataURL('image/png');
  }

  update(dt) {
    for (const m of this.members) {
      if (m.cooldownLeft > 0) {
        m.cooldownLeft -= dt;
        if (m.cooldownLeft <= 0) {
          m.cooldownLeft = 0;
          m.ready = true;
        }
      }
    }
  }

  // Try to use an ability. Returns the member, or null while on cooldown.
  // game: { police, player, playerCar, now }
  use(id, game) {
    const m = this.members.find((x) => x.id === id);
    if (!m || !m.ready) return null;
    if (id === 'lena') {
      if (!game.police.dropStar()) return null;
    } else if (id === 'omar') {
      if (!game.playerCar) return null;
      game.playerCar.repair(50);
    } else if (id === 'sana') {
      this.eyesOutUntil = game.now + 10;
    }
    m.ready = false;
    m.cooldownLeft = m.cooldown;
    return m;
  }

  eyesOut(now) {
    return now < this.eyesOutUntil;
  }

  // What the HUD shows for each member: key, ability, cooldown state.
  hudState() {
    return this.members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      key: m.keyLabel,
      ability: m.ability,
      desc: m.desc,
      color: m.color,
      ready: m.ready,
      cooldownLeft: Math.ceil(m.cooldownLeft),
      cooldown: m.cooldown,
      portrait: m.portrait,
    }));
  }
}
