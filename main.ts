// v7: Sun-Kissed Bay — flyable SKYHAWK helicopter, 3 street races, carjacking animation, sun-soaked day look, under recording 01a1f27b.
// v6: Golden Hour Kings — 10 jobs, garage upgrades, weapon wheel, roadblocks, shop + safehouse, golden-hour opening, under recording 01a1f269.
// v5: Golden Hour — day-night cycle + Job 8 (Sunrise GT dawn getaway), under recording 01a1f255.
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// A working gta6-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, three.js vendored under game/vendor/, no network request), and the program hands
// it in. It copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
// NEON BAY v7: a rain-slick neon metropolis — an original open-world crime
// game (city on foot and by car, traffic, pedestrians, car stealing, wanted level
// and police with a searchlight helicopter at 4+ stars and roadblocks across the
// road, ten story missions, garage upgrades, a weapon wheel, a shop and a
// safehouse, a neon-orb side activity, combat, HUD with live minimap, start
// screen, save, synthesized sound). v7 opens at golden hour, 17:30, and adds a
// flyable gold/white SKYHAWK helicopter (parked on a ground helipad by the
// marina — W/S thrust, A/D yaw, Space climb, Shift descend, rooftop
// collision), three street races at the pier flag (PIER SPRINT, NEON LOOP,
// BAY GRAND PRIX — checkpoint rings, par times, full or half payouts), a
// carjacking animation (the driver gets pulled out and flees), a sun-soaked
// day look (light tower facades with dark windows by day, lit windows by
// night, brighter noon sky and streets), and a less blocky Rook (cap, shades,
// shoes, belt, shirt panel, collar). v6 opens at golden hour, 17:30 — the first
// thing you see is warm low sun over the skyline — and adds Jobs 9-10 (HIGH TIDE,
// a marina run under four-star heat, and GOLDEN HOUR KINGS, stealing the Celeste
// Crown jewel from Meridian Tower under five stars). v5 adds a full day-night
// cycle — the city runs on a game clock (1 game-hour per 75 real seconds) through
// night, dawn, day, golden hour and dusk, with the sky, fog, lights, stars, sun
// and moon, rain and neon all shifting with the hour — plus Job 8 GOLDEN HOUR, a
// dawn getaway stealing the gold Sunrise GT from the marina. v2 makes the city richer: landmark towers with helipads and
// blinking beacons, twice the neon signs (some flicker), street props, a starry sky
// with moon and drifting clouds, rain streaks with ground splashes, puddles, taxi
// and van traffic, umbrellas in the rain, mission intro cards, crash smoke and
// screen shake. Build your own open-world crime game in its place (three.js or any
// library you vendor under game/), put your 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
