<!-- v6: Golden Hour Kings — 10 jobs, garage upgrades, weapon wheel, roadblocks, shop + safehouse, golden-hour opening, under recording 01a1f269. -->
# Neon Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sami30357/neon-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sami30357/neon-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Neon Bay is a rain-slick open-world crime game set in a neon metropolis — not another sunny island. Drive and walk a wet, glowing city, steal cars, outrun the Bay PD and its searchlight helicopter, and work ten story jobs for fixer Vex Marlowe. The city runs on a real clock — night, dawn, day, golden hour and dusk — and it opens at golden hour, 17:30, the whole skyline on fire. Built for make.fun's [Make GTA 6](https://make.fun/bounty/gta6-01) bounty.

## What is in the game

- **A golden-hour opening**: the game clock starts at 17:30 and runs 1 game-hour per 75 real seconds. Golden hour is the first thing you see — warm low sun, long shadows, neon waking up — then dusk goes purple, night brings the rain and the full neon, dawn breaks pale over the bay and noon turns the streets blue-grey. Sky, fog, lights, sun and moon, rain, window glow and streetlights all follow the hour, and the HUD shows the time and phase. `?tod=<hours>` pins the time for screenshots.
- **A night city**: a seeded street grid of towers with lit windows, landmark towers with helipads and blinking beacons, neon signs (some flicker), billboards, street props, a starry sky with moon and drifting clouds, wet reflective asphalt, rain streaks, ground splashes and puddles.
- **On foot and by car**: third-person walking with mouse-look, sprint lean and a visible pistol, and arcade driving with handbrake drift, horn and brake lights.
- **Traffic and pedestrians**: cars cruise the lanes — including yellow cabs and vans — pedestrians stroll the sidewalks with hats and umbrellas and flee when trouble starts.
- **Steal cars**: walk up to any parked car and press E. Stealing raises your wanted level.
- **Wanted level and police**: 5 stars of heat. Police cars chase and ram with bright flashing light bars and red/blue road pools; foot cops chase and grab you; at 4 stars a police helicopter joins with a searchlight and rotor thump — and the PD throws a roadblock across the road ahead of you, two stationary police cars, lights flashing. Ram one at speed and it hurts. Lose them to cool down; get busted or wasted and you pay for it.
- **Missions and story**: ten jobs from Vex — a delivery run, a car theft, a back-alley fight, a blackout run under police heat, a tower finale, a night driving a cab, a five-star coronation run, a dawn getaway stealing the gold Sunrise GT from the marina, a marina run under four-star heat, and a golden-hour finale stealing the Celeste Crown jewel from Meridian Tower under five stars. Each pays cash and unlocks the next.
- **Garage upgrades**: Garage 9 tunes your ride — Engine (top speed + accel), Armor (damage taken −15% per level) and Handling (sharper steering), 3 levels each, $400 / $800 / $1,400. Press G at the garage. Garage 9 is also your safehouse: press E there to save and heal to full.
- **Weapon wheel**: pistol (infinite ammo), SMG (fast fire) and shotgun (wide spread, heavy hits). Keys 1 / 2 / 3 or Q to switch; the HUD shows your weapon and ammo.
- **Shop**: AMMO-NATION on Volt Row sells medkits ($100, full heal), SMG ammo ($150 for 120 rounds) and shotgun shells ($150 for 24). Press E at the shop.
- **Neon orbs**: 12 glowing orbs hidden around the city — collect them for $50 each. They show on the minimap.
- **Combat**: punch up close, shoot with the mouse. Enemies fight back. Hard hits shake the screen, flash the edges and puff crash smoke.
- **HUD with a live minimap**: cash, health, wanted stars, weapon + ammo, speed, mission objective, orb count, and a top-down map with the player, traffic, police, helicopter, roadblocks and mission marker.
- **Start screen, pause menu and saves**: progress saves after every job; continue where you left off.
- **Synthesized sound**: engine hum, sirens, helicopter rotor, horn, gunshots, rain — all made with WebAudio, no audio files.

## Controls

- **W A S D** move / drive · **Mouse** look · **Shift** sprint · **E** enter / steal car / shop / safehouse · **F** punch · **Click** shoot · **1 2 3** pistol / SMG / shotgun · **Q** cycle weapon · **G** garage upgrades · **Space** handbrake · **R** reset car · **Enter** accept job · **M** mute · **Esc** pause

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
