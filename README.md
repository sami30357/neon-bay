# Neon Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sami30357/neon-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sami30357/neon-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Neon Bay is a rain-slick open-world crime game set in a neon metropolis at night — not another sunny island. Drive and walk a wet, glowing city, steal cars, outrun the Bay PD, and work five story jobs for fixer Vex Marlowe. Built for make.fun's [Make GTA 6](https://make.fun/bounty/gta6-01) bounty.

## What is in the game

- **A night city**: a seeded street grid of towers with lit windows, neon signs, streetlights, wet reflective asphalt and falling rain.
- **On foot and by car**: third-person walking with mouse-look, and arcade driving with handbrake drift.
- **Traffic and pedestrians**: cars cruise the lanes, pedestrians stroll the sidewalks and flee when trouble starts.
- **Steal cars**: walk up to any parked car and press E. Stealing raises your wanted level.
- **Wanted level and police**: 5 stars of heat. Police cars chase and ram; foot cops chase and grab you. Lose them to cool down; get busted or wasted and you pay for it.
- **Missions and story**: five jobs from Vex — a delivery run, a car theft, a back-alley fight, a blackout run under police heat, and a tower finale. Each pays cash and unlocks the next.
- **Combat**: punch up close, shoot with the mouse. Enemies fight back.
- **HUD with a live minimap**: cash, health, wanted stars, speed, mission objective, and a top-down map with the player, traffic, police and mission marker.
- **Start screen, pause menu and saves**: progress saves after every job; continue where you left off.
- **Synthesized sound**: engine hum, sirens, gunshots, rain — all made with WebAudio, no audio files.

## Controls

- **W A S D** move / drive · **Mouse** look · **Shift** sprint · **E** enter / steal car · **F** punch · **Click** shoot · **Space** handbrake · **R** reset car · **Enter** accept job · **M** mute · **Esc** pause

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The game is plain static files under `game/` and plays offline — every script, texture and sound is generated in the browser or vendored under `game/`.

## Tech

- Three.js (vendored minified build under `game/vendor/`) renders the 3D night city.
- `main.ts` copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=sami-patoary&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
