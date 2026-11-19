// Solmara Bay — staged screenshots.
// One clear job: put the game into a photogenic state for each of the four
// screenshots. ?shot=cover|chase|mission|street&seed=1&tod=12 drives the
// camera, the player, the wanted level and the mission, hides the centre
// announcement card, and sets window.__shotReady when the frame is settled.
export function parseShotQuery() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  return {
    name: shot,
    seed: Number(q.get('seed') || 1),
    tod: Number(q.get('tod') || 12),
  };
}

// Stage one of the four shots. game is the boot object: it carries the
// player, vehicles, police, jobs, heli, camera and HUD.
export function stageShot(game, name) {
  const g = game;
  g.hud.hideAnnounce();
  g.started = true;
  g.hud.hideStart();
  const setWanted = (n) => g.police.setWanted(n);
  if (name === 'cover') {
    // On the coast road at noon: the bay and Pier 7 ahead, the heli overhead,
    // a roadblock across the road, the crew on the HUD.
    g.player.spawn(24, 192);
    g.player.yaw = Math.PI;
    const car = g.vehicles.all.find((c) => c.def.id === 'solano' && !c.wrecked);
    if (car) {
      car.pos.set(24, 0, 196);
      car.yaw = Math.PI;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.yaw;
      g.vehicles.playerCar = car;
      car.driver = 'player';
    }
    setWanted(3);
    g.police.airUnit.group.visible = true;
    g.police.airUnit.x = 30;
    g.police.airUnit.z = 180;
    g.jobs.startJob(0);
    g.cameraMode = 'cover';
    g.hud.say('Vex', 'Fixer', 'The bay is yours today. Keep the money moving.', null, g.now, 30);
  } else if (name === 'chase') {
    // A 5-star pursuit down the boardwalk: police all around, the roadblock
    // ahead, the heli's cone on the car.
    g.player.spawn(-60, 210);
    const car = g.vehicles.all.find((c) => c.def.id === 'aurel' && !c.wrecked);
    if (car) {
      car.pos.set(-60, 0, 210);
      car.yaw = Math.PI / 2;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.yaw;
      g.vehicles.playerCar = car;
      car.driver = 'player';
    }
    setWanted(5);
    g.police.airUnit.group.visible = true;
    g.police.airUnit.x = -50;
    g.police.airUnit.z = 200;
    g.cameraMode = 'chase';
    g.hud.say('Dispatch', 'Bay PD', 'All units, suspect southbound on the boardwalk.', null, g.now, 30);
  } else if (name === 'mission') {
    // Job 11, the tide run: on the boardwalk facing the checkpoint beacon,
    // the bay and an island ahead.
    g.player.spawn(120, 210);
    g.player.yaw = Math.PI;
    g.jobs.completed = 10;
    g.jobs.startJob(10);
    setWanted(2);
    g.cameraMode = 'mission';
    g.hud.say('Vex', 'Fixer', 'One last run. Crate off Pier 7, then the marina.', null, g.now, 30);
  } else if (name === 'street') {
    // On foot on the boardwalk at noon: palms, umbrellas, the bay, the pier
    // shack, a glowing orb and the radio on the HUD.
    g.player.spawn(-40, 214);
    g.player.yaw = Math.PI * 0.9;
    setWanted(0);
    g.cameraMode = 'street';
    g.hud.say('Sana', 'Lookout', 'Quiet morning. The beach is yours.', null, g.now, 30);
  }
  // Let the renderer settle two frames, then signal the shot script.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
      window.__shotName = name;
    });
  });
}

// Where the staged camera sits for each shot. The boot loop reads this
// every frame while a shot is staged, so the framing is exact and stable.
export function shotCamera(name, game, out) {
    const p = game.player.pos;
    if (name === 'cover') {
      // Behind and above the car, looking south down the coast road: the bay,
      // the pier and the island fill the frame. (The camera sits NORTH of the
      // player and looks SOUTH — the earlier version had the signs flipped and
      // stared north into the city instead of out over the water.)
      out.pos.set(p.x - 6, 5.2, p.z - 13);
      out.look.set(p.x + 2, 1.5, p.z + 40);
    } else if (name === 'chase') {
      out.pos.set(p.x - 10, 6, p.z - 12);
      out.look.set(p.x + 8, 1.5, p.z + 30);
    } else if (name === 'mission') {
      out.pos.set(p.x - 7, 4.5, p.z - 11);
      out.look.set(p.x, 2.5, p.z + 35);
    } else {
      // Street: low, close, on foot — palms, beach and the pier shack.
      out.pos.set(p.x - 4, 2.6, p.z - 7);
      out.look.set(p.x + 3, 1.6, p.z + 25);
    }
    return out;
  }
