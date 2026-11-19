// v6: Golden Hour Kings — shots re-staged: cover + chase at golden hour with
// roadblock + helicopter, mission = Job 9 at the marina, street = bright day
// market street, under recording 01a1f269.
// v5: Golden Hour — shots re-staged across the day-night cycle, under recording 01a1f255.
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Deterministic screenshot staging for Neon Bay: ?shot=cover|chase|mission|street
// skips the start screen and places the player, cars and police at fixed spots so
// every screenshot is reproducible. Also used by the local screenshot script.
// v2 staging is busier on purpose: more traffic and pedestrians pulled into frame,
// the chase runs at 4 stars so the police helicopter is overhead, and orbs are
// placed where the camera can see them.
// v6: the first impression is golden hour — the game itself now opens at 17:30 —
// so cover and chase both shoot in warm low sun, with the new roadblock in frame.
export const SHOT_NAMES = ['cover', 'chase', 'mission', 'street'];

export function readShotParam() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot && SHOT_NAMES.includes(shot)) return shot;
  return null;
}

// Fixed staging per shot: player position/heading, mode, wanted, mission, camera.
export const SHOT_STAGING = {
  cover: {
    mode: 'car', wanted: 4, mission: 1, tod: 17.5,
    player: { x: 24, z: -72, heading: 0 },
    car: { x: 24, z: -72, heading: 0 },
    trafficNear: 6, policeNear: 3, pedsNear: 3, orbsNear: true,
    camYaw: 0, camPitch: 0.28, camDist: 12,
    note: 'The cover: car + helicopter + police roadblock + mission panel + radio + speedometer + minimap, at golden hour',
  },
  chase: {
    mode: 'car', wanted: 5, mission: 0, tod: 17.5,
    player: { x: -24, z: -72, heading: 0 },
    car: { x: -24, z: -72, heading: 0 },
    trafficNear: 4, policeNear: 3, pedsNear: 2, orbsNear: false,
    camYaw: 0, camPitch: 0.3, camDist: 14,
    note: 'Five-star police chase at golden hour: helicopter searchlight, roadblock ahead, wanted stars, sirens',
  },
  mission: {
    mode: 'foot', wanted: 0, mission: 9, tod: 17.5,
    player: { x: 156, z: 156, heading: Math.PI * 0.75 },
    car: null,
    trafficNear: 3, policeNear: 0, pedsNear: 2, orbsNear: true,
    // camera swung 0.55 rad to the side so the marina beacon shows BESIDE the
    // player instead of hidden behind them; pulled back so the player doesn't
    // fill the frame
    camYaw: Math.PI * 0.75 + 0.55, camPitch: 0.12, camDist: 8,
    note: 'Mission in progress at golden hour: JOB 9 HIGH TIDE at the marina, objective marker, beacon',
  },
  street: {
    mode: 'foot', wanted: 0, mission: 0, tod: 12,
    player: { x: 72, z: -30, heading: Math.PI },
    car: null,
    trafficNear: 4, policeNear: 0, pedsNear: 5, orbsNear: true,
    // v6: pitched up a touch and pulled back so the noon sky reads in frame
    camYaw: Math.PI, camPitch: 0.2, camDist: 7.5,
    note: 'On foot in a bright day market street at noon: pedestrians, signs, orbs, blue sky',
  },
};
