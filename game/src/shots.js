// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Deterministic screenshot staging for Neon Bay: ?shot=cover|chase|mission|street
// skips the start screen and places the player, cars and police at fixed spots so
// every screenshot is reproducible. Also used by the local screenshot script.
// v2 staging is busier on purpose: more traffic and pedestrians pulled into frame,
// the chase runs at 4 stars so the police helicopter is overhead, and orbs are
// placed where the camera can see them.
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
    mode: 'car', wanted: 4, mission: 1,
    player: { x: 24, z: -72, heading: 0 },
    car: { x: 24, z: -72, heading: 0 },
    trafficNear: 6, policeNear: 3, pedsNear: 3, orbsNear: true,
    camYaw: 0, camPitch: 0.28, camDist: 12,
    note: 'The cover: car + helicopter + police + mission panel + radio + speedometer + minimap',
  },
  chase: {
    mode: 'car', wanted: 4, mission: 0,
    player: { x: -24, z: -72, heading: 0 },
    car: { x: -24, z: -72, heading: 0 },
    trafficNear: 4, policeNear: 3, pedsNear: 2, orbsNear: false,
    camYaw: 0, camPitch: 0.3, camDist: 14,
    note: 'Police chase at 4 stars: helicopter searchlight, wanted stars, sirens',
  },
  mission: {
    mode: 'foot', wanted: 0, mission: 2,
    player: { x: 162, z: -114, heading: Math.PI * 0.75 },
    car: null,
    trafficNear: 3, policeNear: 0, pedsNear: 2, orbsNear: true,
    // camera swung 0.4 rad to the side so the Volt GT shows BESIDE the player
    // instead of hidden behind them
    camYaw: Math.PI * 0.75 + 0.4, camPitch: 0.12, camDist: 6.5,
    note: 'Mission in progress: steal the Volt GT, objective marker, beacon',
  },
  street: {
    mode: 'foot', wanted: 0, mission: 0,
    player: { x: 72, z: -30, heading: Math.PI },
    car: null,
    trafficNear: 4, policeNear: 0, pedsNear: 5, orbsNear: true,
    camYaw: Math.PI, camPitch: 0.14, camDist: 6.5,
    note: 'On foot in a neon alley: pedestrians, umbrellas, signs, orbs',
  },
};
