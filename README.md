<!-- v3: re-applied under recording 01a1ee33 - v2 content unchanged. -->
# Neon Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sami30357/neon-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sami30357/neon-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Neon Bay is a rain-slick open-world crime game set in a neon metropolis at night — not another sunny island. Drive and walk a wet, glowing city, steal cars, outrun the Bay PD and its searchlight helicopter, and work seven story jobs for fixer Vex Marlowe. Built for make.fun's [Make GTA 6](https://make.fun/bounty/gta6-01) bounty.

## What is in the game

- **A night city**: a seeded street grid of towers with lit windows, landmark towers with helipads and blinking beacons, neon signs (some flicker), billboards, street props, a starry sky with moon and drifting clouds, wet reflective asphalt, rain streaks, ground splashes and puddles.
- **On foot and by car**: third-person walking with mouse-look, sprint lean and a visible pistol, and arcade driving with handbrake drift, horn and brake lights.
- **Traffic and pedestrians**: cars cruise the lanes — including yellow cabs and vans — pedestrians stroll the sidewalks with hats and umbrellas and flee when trouble starts.
- **Steal cars**: walk up to any parked car and press E. Stealing raises your wanted level.
- **Wanted level and police**: 5 stars of heat. Police cars chase and ram with bright flashing light bars and red/blue road pools; foot cops chase and grab you; at 4 stars a police helicopter joins with a searchlight and rotor thump. Lose them to cool down; get busted or wasted and you pay for it.
- **Missions and story**: seven jobs from Vex — a delivery run, a car theft, a back-alley fight, a blackout run under police heat, a tower finale, a night driving a cab, and a five-star coronation run. Each pays cash and unlocks the next.
- **Neon orbs**: 12 glowing orbs hidden around the city — collect them for $50 each. They show on the minimap.
- **Combat**: punch up close, shoot with the mouse. Enemies fight back. Hard hits shake the screen, flash the edges and puff crash smoke.
- **HUD with a live minimap**: cash, health, wanted stars, speed, mission objective, orb count, and a top-down map with the player, traffic, police, helicopter and mission marker.
- **Start screen, pause menu and saves**: progress saves after every job; continue where you left off.
- **Synthesized sound**: engine hum, sirens, helicopter rotor, horn, gunshots, rain — all made with WebAudio, no audio files.

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
