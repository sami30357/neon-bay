# Solmara Bay

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/sami30357/neon-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/sami30357/neon-bay/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game built for the [Make GTA 6 bounty on make.fun](https://make.fun/bounty/gta6-01).

## The game

Solmara Bay is a sun-soaked island city on a bright noon. You start on the
coast road with $500, a fixer named Vex, and a crew of three — Lena the driver,
Omar the mechanic, Sana the lookout. Eleven jobs take you from a first run
through the marina to a $3,500 tide run off Pier 7, with the Bay PD on your
tail the whole way.

- **Open world on foot and by car** — traffic, pedestrians, carjacking, a
  waterfront with a beach, a pier, bobbing boats and horizon islands.
- **Wanted level 0–5** — every patrol car has a callsign and a role, and the
  response list shows them live. Roadblocks at 4 stars, a helicopter at 3.
- **Crew abilities** — Z swaps plates, X quick-fixes the car, C spots every
  police unit.
- **Helicopter** — the SKYHAWK flies out over the bay and lands on a rooftop
  pad and a marina pad.
- **3 street races, garage upgrades, a shop, a weapon wheel, save** — progress
  persists in the browser.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080/game/ in a desktop browser. No build step,
no network: the game is static files under `game/`, Three.js vendored under
`game/vendor/`.

## Controls

WASD move / drive · Shift run · Space jump · E enter / exit car & helicopter ·
mouse shoot · 1–4 weapons · J next job · Z / X / C crew · G garage · B shop ·
F save · H help · M mute.

## Entry

- Game: `game/index.html`
- Entrypoint: `main.ts`
- License: MIT (`LICENSE`)
