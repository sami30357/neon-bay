// v8: Solmara Bay — re-authored in this session under recording 01a1f524 (2026-11-20).
// All four shots re-staged on the coast at bright noon (tod 12) — cover on
// the coastal road facing Pier 7 and the bay, chase down the boardwalk at
// 5 stars, mission = Job 11's boardwalk checkpoint with the beach and bay
// ahead, street on foot on the boardwalk facing the water.
// v7: Sun-Kissed Bay — mission shot is now a STREET RACE at golden hour
// (race: 1 starts RACE 1 PIER SPRINT at the pier flag), street shot keeps
// bright noon to show the new day look, under recording 01a1f27b.
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
    mode: 'car', wanted: 4, mission: 1, tod: 12,
    // v8: on the coastal road facing south — the boardwalk, the beach, Pier 7
    // and the open bay fill the frame behind the chase. Player moved up to
    // z=192 (was 168) so the water reads past the last towers, traffic
    // thinned to 4 so the street ahead is not clogged.
    player: { x: 24, z: 192, heading: 0 },
    car: { x: 24, z: 192, heading: 0 },
    trafficNear: 4, policeNear: 3, pedsNear: 3, orbsNear: true,
    camYaw: 0, camPitch: 0.28, camDist: 12,
    note: 'The cover: car + helicopter + police roadblock + mission panel + radio + speedometer + minimap, at bright noon on the coast — beach, Pier 7 and the bay in frame',
  },
  chase: {
    mode: 'car', wanted: 5, mission: 0, tod: 12,
    player: { x: -24, z: 168, heading: 0 },
    car: { x: -24, z: 168, heading: 0 },
    trafficNear: 4, policeNear: 3, pedsNear: 2, orbsNear: false,
    camYaw: 0, camPitch: 0.3, camDist: 14,
    note: 'Five-star police chase at noon down the boardwalk: helicopter searchlight, roadblock ahead, wanted stars, the beach and the bay behind',
  },
  mission: {
    mode: 'car', wanted: 0, mission: 11, tod: 12,
    // v8: Job 11 TIDE RUNNER — on the boardwalk facing the step-1 checkpoint
    // beacon dead ahead at (120, 216), beach and open bay beyond it, noon light
    player: { x: 120, z: 192, heading: 0 },
    car: { x: 120, z: 192, heading: 0 },
    trafficNear: 3, policeNear: 0, pedsNear: 2, orbsNear: true,
    camYaw: 0, camPitch: 0.2, camDist: 10,
    note: 'Job 11 TIDE RUNNER at bright noon: the boardwalk checkpoint beacon ahead, beach and bay in frame, mission panel with stage + NEXT step',
  },
  street: {
    mode: 'foot', wanted: 0, mission: 0, tod: 12,
    // v8: on foot on the boardwalk facing the beach and the bay at noon
    player: { x: 72, z: 200, heading: 0 },
    car: null,
    trafficNear: 4, policeNear: 0, pedsNear: 5, orbsNear: true,
    camYaw: 0, camPitch: 0.2, camDist: 7.5,
    note: 'On foot on the boardwalk at noon: pedestrians, palms, umbrellas, beach and bay, blue sky',
  },
};
