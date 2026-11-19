// Solmara Bay — saving.
// One clear job: persist the player's progress in localStorage and bring it
// back. Money, jobs, respect, garage levels, races won and the best times.
const SAVE_KEY = 'solmara-bay-save-v9';

export function blankSave() {
  return {
    money: 500,
    jobsDone: 0,
    respect: 0,
    garage: { engine: 0, armor: 0, handling: 0 },
    racesWon: [],
    bestTimes: {},
    playerPos: { x: 0, z: 180 },
    day: 1,
    savedAt: Date.now(),
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    const blank = blankSave();
    return { ...blank, ...data, garage: { ...blank.garage, ...(data.garage || {}) } };
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const data = {
      money: state.money,
      jobsDone: state.jobsDone,
      respect: state.respect,
      garage: state.garage,
      racesWon: state.racesWon,
      bestTimes: state.bestTimes,
      playerPos: state.playerPos,
      day: state.day,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Clear the save (the "New game" choice on the start screen).
export function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch {
      return false;
    }
  }

// A short human line for the start screen: when the save is from.
export function saveSummary(save) {
  if (!save) return 'No save yet — a fresh start on the bay.';
  const date = new Date(save.savedAt);
  const day = date.toLocaleDateString();
  return `Day ${save.day} · $${save.money} · ${save.jobsDone}/11 jobs · saved ${day}`;
}
