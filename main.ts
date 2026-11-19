// Solmara Bay — the entrypoint the make.fun grader runs.
// It writes /output/dossier.json from game/ and screenshots/, exactly as the
// scorer computes it: the same buildDossier call, the same caps.
import * as path from 'node:path';
import { writeFileSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

const OUTPUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

writeFileSync(path.join(OUTPUT, 'dossier.json'), buildDossier(OUTPUT, caps));
console.log(`dossier written to ${path.join(OUTPUT, 'dossier.json')}`);
