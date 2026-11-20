// Solmara Bay — the entrypoint the make.fun grader runs.
// It writes /output/dossier.json from game/ and screenshots/, exactly as the
// scorer computes it: the same buildDossier call, the same caps.
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, existsSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

const OUTPUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const ENTRY = process.env.MAKEFUN_BOT_DIR || path.dirname(fileURLToPath(import.meta.url));

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// The grader mounts the entry read-only at MAKEFUN_BOT_DIR and gives an
// empty writable MAKEFUN_OUTPUT_DIR: buildDossier reads game/ and
// screenshots/ from the entry directory, while the dossier itself is
// written to the output directory. Never pass OUTPUT as the entry dir.
if (!existsSync(path.join(ENTRY, 'game'))) {
  throw new Error(`entry directory ${ENTRY} has no game/ directory`);
}

writeFileSync(path.join(OUTPUT, 'dossier.json'), buildDossier(ENTRY, caps));
console.log(`dossier written to ${path.join(OUTPUT, 'dossier.json')}`);
