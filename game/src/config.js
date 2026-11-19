// Solmara Bay — the tuning table.
// One clear job: every number and name the game runs on, in one place. The
// island, the clock, the ranks, the cars, the garage, the shop, the radio,
// the weapons, the jobs, the races, the crew, the districts and the police.
export const WORLD = {
  minX: -216,
  maxX: 216,
  minZ: -216,
  // The beach runs z 224–252, the water z 252–550, and nothing may pass z 250.
  beachStart: 224,
  waterStart: 252,
  waterWidth: 480,
  waterWallZ: 250,
  boardwalkZ: 216,
  pierX: 24,
  // The street grid: avenues and streets every 60 m.
  streets: [-180, -120, -60, 0, 60, 120, 180],
};

export const TIME = {
  openHour: 12,
  openMinute: 0,
};

export const RANKS = ['ROOKIE', 'HUSTLER', 'RUNNER', 'FIXER', 'SHOT CALLER'];
export const RANK_STEPS = [0, 150, 400, 800, 1500];

export const CARS = [
  { id: 'solano', name: 'SOLANO GT', kind: 'sports', top: 42, accel: 24, grip: 0.9, color: 0xff5e3a, hp: 100 },
  { id: 'aurel', name: 'AUREL S', kind: 'coupe', top: 38, accel: 22, grip: 0.88, color: 0x2f7bff, hp: 100 },
  { id: 'marlin', name: 'MARLIN', kind: 'sedan', top: 34, accel: 19, grip: 0.85, color: 0x39ff88, hp: 110 },
  { id: 'bayside', name: 'BAYSIDE', kind: 'van', top: 30, accel: 16, grip: 0.8, color: 0xffd75e, hp: 140 },
  { id: 'corsair', name: 'CORSAIR', kind: 'pickup', top: 36, accel: 20, grip: 0.82, color: 0xff8ac2, hp: 130 },
  { id: 'tide', name: 'TIDE RUNNER', kind: 'sports', top: 44, accel: 26, grip: 0.92, color: 0x00e5ff, hp: 100 },
];

export const GARAGE = {
  levels: 3,
  upgrades: [
    { id: 'engine', name: 'Engine', costs: [300, 600, 1200], topBonus: [0, 4, 9, 14] },
    { id: 'armor', name: 'Armor', costs: [250, 500, 1000], hpBonus: [0, 50, 120, 220] },
    { id: 'handling', name: 'Handling', costs: [200, 450, 900], gripBonus: [0, 0.08, 0.16, 0.26] },
  ],
};

export const SHOP = [
  { id: 'p9ammo', name: 'P9 Ammo · 84 rounds', price: 60 },
  { id: 'makoammo', name: 'MAKO SMG Ammo · 208 rounds', price: 120 },
  { id: 'gaugeammo', name: '12G Shells · 24', price: 90 },
  { id: 'armorvest', name: 'Armor Vest · +50', price: 150 },
  { id: 'snack', name: 'Snack · +25 HP', price: 25 },
];

export const RADIO = {
  station: 'BAY FM 88.1',
  tracks: [
    'Tide Line — The Breakers',
    'Golden Hour — Marina Lights',
    'Boardwalk Nights — Club Volt',
    'Salt Air — The Palms',
    'Neon Tide — Vex & The Row',
    'Sunset Run — Solano',
  ],
};

export const WEAPONS = [
  { slot: 0, id: 'fists', name: 'FISTS', damage: 10, range: 2.2, rate: 2, ammo: Infinity },
  { slot: 1, id: 'p9', name: 'P9', damage: 18, range: 42, rate: 3, ammo: 84 },
  { slot: 2, id: 'mako', name: 'MAKO SMG', damage: 12, range: 36, rate: 8, ammo: 208 },
  { slot: 3, id: 'gauge', name: '12G', damage: 46, range: 26, rate: 1, ammo: 24 },
];

export const JOBS = [
  {
    id: 1, name: 'NEON RUN', pay: 250,
    stages: [
      { kind: 'goto', label: 'Pick up the package', at: [0, -170] },
      { kind: 'goto', label: 'Drop it at Meridian', at: [-60, 60] },
      { kind: 'escape', label: 'Lose the cops', at: [0, 0] },
    ],
  },
  {
    id: 2, name: 'BOARDWALK HUSTLE', pay: 300,
    stages: [
      { kind: 'goto', label: 'Meet the buyer on the boardwalk', at: [120, 216] },
      { kind: 'deliver', label: 'Deliver to the marina', at: [-120, 120] },
    ],
  },
  {
    id: 3, name: 'HOT WHEELS', pay: 400,
    stages: [
      { kind: 'steal', label: 'Steal the Solano', at: [0, 180] },
      { kind: 'deliver', label: 'Park it at Volt Row', at: [-180, 0] },
    ],
  },
  {
    id: 4, name: 'PIER DEAL', pay: 450,
    stages: [
      { kind: 'goto', label: 'Meet at Pier 7', at: [24, 216] },
      { kind: 'escape', label: 'Walk away clean', at: [0, 120] },
    ],
  },
  {
    id: 5, name: 'MARINA LIGHTS', pay: 500,
    stages: [
      { kind: 'goto', label: 'Pick up at the marina', at: [-150, 150] },
      { kind: 'deliver', label: 'Drop at Neon Row', at: [150, -60] },
    ],
  },
  {
    id: 6, name: 'THE LONG WAY', pay: 550,
    stages: [
      { kind: 'goto', label: 'Collect from Volt Row', at: [-180, -120] },
      { kind: 'goto', label: 'Cross town', at: [180, 120] },
      { kind: 'deliver', label: 'Hand over on the Strand', at: [0, 180] },
    ],
  },
];

JOBS.push(
  {
    id: 7, name: 'FAMILY BUSINESS', pay: 650,
    stages: [
      { kind: 'steal', label: 'Take the Corsair', at: [120, -120] },
      { kind: 'deliver', label: 'Bring it to Vex', at: [-60, 180] },
    ],
  },
  {
    id: 8, name: 'NIGHT SHIFT', pay: 700,
    stages: [
      { kind: 'goto', label: 'Meet the fence', at: [60, -180] },
      { kind: 'deliver', label: 'Drop the goods', at: [-120, -60] },
    ],
  },
  {
    id: 9, name: 'GOLDEN HOUR', pay: 800,
    stages: [
      { kind: 'goto', label: 'Photo op on the Strand', at: [180, 180] },
      { kind: 'goto', label: 'Second spot by the pier', at: [-180, 180] },
      { kind: 'escape', label: 'Shake the tail', at: [0, 60] },
    ],
  },
  {
    id: 10, name: 'THE BIG ONE', pay: 1200,
    stages: [
      { kind: 'steal', label: 'Steal the Tide Runner', at: [-60, -120] },
      { kind: 'deliver', label: 'Deliver to the buyer', at: [120, 60] },
    ],
  },
  {
    id: 11, name: 'TIDE RUNNER', pay: 3500,
    stages: [
      { kind: 'goto', label: 'Boardwalk checkpoint', at: [120, 216] },
      { kind: 'goto', label: 'Tide crate at Pier 7', at: [24, 216] },
      { kind: 'deliver', label: 'Deliver to Vex at the marina', at: [-120, 168] },
      { kind: 'escape', label: 'Lose the cops', at: [0, 120] },
    ],
  },
);

export const RACES = [
  {
    id: 1, name: 'STRAND SPRINT', pay: 400,
    checkpoints: [[-180, 180], [180, 180], [180, -180], [-180, -180]],
  },
  {
    id: 2, name: 'PIER LOOP', pay: 350,
    checkpoints: [[-120, 216], [120, 216], [120, 60], [-120, 60]],
  },
  {
    id: 3, name: 'NEON CIRCUIT', pay: 600,
    checkpoints: [[-180, -180], [180, -180], [180, 0], [-180, 0]],
  },
];

export const CREW = [
  {
    id: 'lena', name: 'Lena', role: 'Driver', key: 'KeyZ', keyLabel: 'Z',
    ability: 'SWAP PLATES', desc: 'Swap plates — lose a wanted star', cooldown: 60,
    color: '#ff5e3a', hair: '#2a1a12', shirt: '#1f6fb2', skin: '#e8b98a',
  },
  {
    id: 'omar', name: 'Omar', role: 'Mechanic', key: 'KeyX', keyLabel: 'X',
    ability: 'QUICK FIX', desc: 'Quick fix — restore 50 HP', cooldown: 60,
    color: '#39ff88', hair: '#111111', shirt: '#c9a227', skin: '#c98f6a',
  },
  {
    id: 'sana', name: 'Sana', role: 'Lookout', key: 'KeyC', keyLabel: 'C',
    ability: 'EYES OUT', desc: 'Eyes out — list every police unit', cooldown: 45,
    color: '#b300ff', hair: '#3a2a1a', shirt: '#e8e8e8', skin: '#8a5a3a',
  },
];

export const DISTRICTS = [
  // Checked in order: the pier and the marina win over the strand.
  { name: 'PIER 7', x0: 0, x1: 48, z0: 200, z1: 252 },
  { name: 'MARINA', x0: -216, x1: -120, z0: 120, z1: 216 },
  { name: 'SOLMARA STRAND', x0: -216, x1: 216, z0: 180, z1: 252 },
  { name: 'VOLT ROW', x0: -216, x1: 0, z0: -216, z1: 0 },
  { name: 'NEON ROW', x0: 0, x1: 216, z0: -216, z1: 0 },
  { name: 'MERIDIAN CROSSING', x0: -216, x1: 216, z0: 0, z1: 180 },
];

export const COLORS = {
  sidewalk: 0x9aa0ac,
  road: 0x23262e,
  water: 0x1a6fb0,
  sand: 0xd8c08a,
  sky: 0x9fd0f0,
  grass: 0x2e7d46,
};

export const WANTED = {
  maxStars: 5,
  // Units on the street at each wanted level, stars 0..5. Indexed by stars,
  // so unitsPerStar[3] is the unit count at 3 stars.
  unitsPerStar: [0, 2, 3, 4, 6, 8],
  decayDelaySec: 20,
  roadblockAt: 4,
  airUnitAt: 3,
};

export const CALLSIGNS = [
  'TARPON 38', 'HERON 12', 'MARLIN 07', 'PELICAN 21', 'STINGRAY 09',
  'DOLPHIN 44', 'BARRACUDA 17', 'CORAL 52', 'TIDE 63', 'REEF 28',
  'ANCHOR 05', 'BUOY 31', 'CURRENT 19', 'LAGOON 72', 'SURF 08',
  'HARBOUR 26', 'JETTY 47', 'SAILFISH 14', 'MANGROVE 33', 'BREAKER 58',
  'COBALT 22', 'MERIDIAN 61',
];

export const PD_ROLES = ['RAMMING', 'FLANKING', 'SPOTLIGHT', 'ROADBLOCK', 'CLOSING IN', 'PURSUIT'];

// One-line teaser for each job, shown in the mission panel before it starts.
JOBS[0].brief = 'Vex has a package that needs legs.';
JOBS[1].brief = 'A buyer waits on the boardwalk.';
JOBS[2].brief = 'Vex wants a Solano, no questions asked.';
JOBS[3].brief = 'Quiet money at the end of Pier 7.';
JOBS[4].brief = 'A pickup at the marina, after dark.';
JOBS[5].brief = 'Across town, no shortcuts.';
JOBS[6].brief = 'A Corsair for the family.';
JOBS[7].brief = 'The fence works nights.';
JOBS[8].brief = 'Two spots, one sunset, no tail.';
JOBS[9].brief = 'The Tide Runner. Big money.';
JOBS[10].brief = 'The tide crate. The marina. $3,500.';
