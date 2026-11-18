// Deterministic screenshot staging for Neon Bay: ?shot=cover|chase|mission|street
// skips the start screen and places the player, cars and police at fixed spots so
// every screenshot is reproducible. Also used by the local screenshot script.
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
    mode: 'car', wanted: 0, mission: 0,
    player: { x: 24, z: -72, heading: 0 },
    car: { x: 24, z: -72, heading: 0 },
    trafficNear: 4, policeNear: 0,
    camYaw: 0, camPitch: 0.28, camDist: 12,
    note: 'Night street, neon, car, HUD and minimap',
  },
  chase: {
    mode: 'car', wanted: 3, mission: 0,
    player: { x: -24, z: -72, heading: 0 },
    car: { x: -24, z: -72, heading: 0 },
    trafficNear: 2, policeNear: 2,
    camYaw: 0, camPitch: 0.3, camDist: 14,
    note: 'Police chase with wanted stars and sirens',
  },
  mission: {
    mode: 'foot', wanted: 0, mission: 2,
    player: { x: 158, z: -110, heading: Math.PI * 0.75 },
    car: null,
    trafficNear: 1, policeNear: 0,
    camYaw: Math.PI * 0.75, camPitch: 0.3, camDist: 9,
    note: 'Mission in progress: steal the Volt GT, objective marker',
  },
  street: {
    mode: 'foot', wanted: 0, mission: 0,
    player: { x: 72, z: -30, heading: Math.PI },
    car: null,
    trafficNear: 0, policeNear: 0,
    camYaw: Math.PI, camPitch: 0.26, camDist: 8,
    note: 'On foot in a neon alley with pedestrians',
  },
};
