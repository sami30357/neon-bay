// Solmara Bay — the boot and the game loop.
// One clear job: own the renderer, the world and the frame. Everything else
// is a system this file wires together: city, player, cars, police, crew,
// jobs, races, the helicopter, combat, the HUD, the audio and the save.
import * as THREE from 'three';
import { WORLD, TIME, RANKS, RANK_STEPS, CARS, GARAGE, SHOP } from './config.js';
import { makeRng } from './rng.js';
import { City } from './city.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { Pedestrians } from './peds.js';
import { Police } from './police.js';
import { Crew } from './crew.js';
import { Jobs } from './jobs.js';
import { Races } from './races.js';
import { Heli } from './heli.js';
import { Combat } from './combat.js';
import { Hud } from './hud.js';
import { AudioEngine } from './audio.js';
import { loadSave, writeSave, blankSave, clearSave, saveSummary } from './save.js';
import { parseShotQuery, stageShot, shotCamera } from './shots.js';

export class Game {
  constructor() {
    this.now = 0;
    this.started = false;
    this.paused = false;
    this.cameraMode = 'follow';
    this.cameraYaw = Math.PI;
    this.money = 500;
    this.respect = 0;
    this.day = 1;
    this.hour = TIME.openHour;
    this.minute = TIME.openMinute;
    this.garage = { engine: 0, armor: 0, handling: 0 };
    this.shot = parseShotQuery();
    this.save = loadSave();
    if (this.save) {
      this.money = this.save.money;
      this.respect = this.save.respect;
      this.day = this.save.day;
      this.garage = this.save.garage;
    }
    this._setupRenderer();
    this._setupWorld();
    this._setupSystems();
    this._setupPanels();
    this._bindKeys();
    if (this.shot) {
      // Staged screenshots skip the start screen and go straight to the scene.
      stageShot(this, this.shot.name);
    } else {
      this.hud.showStart(saveSummary(this.save));
    }
    this._loop = this._loop.bind(this);
    this._last = performance.now();
    requestAnimationFrame(this._loop);
  }

  _setupRenderer() {
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    // Bright noon sky: pale blue overhead, warm haze at the horizon.
    this.scene.background = new THREE.Color(0x9fd0f0);
    this.scene.fog = new THREE.Fog(0x9fd0f0, 220, 620);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    // High sun, warm key light, soft sky fill.
    const sun = new THREE.DirectionalLight(0xfff2cc, 2.4);
    sun.position.set(60, 120, -40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -240;
    sun.shadow.camera.right = 240;
    sun.shadow.camera.top = 240;
    sun.shadow.camera.bottom = -240;
    this.scene.add(sun);
    this.sun = sun;
    const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 1.1);
    this.scene.add(hemi);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _setupWorld() {
    this.rng = makeRng(this.shot ? this.shot.seed : 20261120);
    this.city = new City(this.scene, this.rng);
    this.city.build();
    this.input = new Input();
  }

  _setupSystems() {
    this.player = new Player(this.scene, this.city);
    const startPos = this.save ? this.save.playerPos : { x: 0, z: 180 };
    this.player.spawn(startPos.x, startPos.z);
    this.vehicles = new VehicleManager(this.scene, this.city, this.rng);
    this.vehicles.spawnInitial();
    this.peds = new Pedestrians(this.scene, this.city, this.rng);
    this.peds.spawnInitial();
    this.police = new Police(this.scene, this.city, this.rng);
    this.crew = new Crew();
    this.jobs = new Jobs(this.scene, this.city, this.vehicles, this.rng);
    this.races = new Races(this.scene);
    this.heli = new Heli(this.scene, this.city);
    this.combat = new Combat(this.scene, this.camera);
    this.hud = new Hud();
    this.audio = new AudioEngine();
    // Expose the game for the test harness and the shot script.
    window.__game = this;
    window.__ready = true;
  }

  // --- Garage and shop panels: buttons the player clicks, or keys 1-3. ---
  _setupPanels() {
    const garageEl = document.getElementById('garage-rows');
    const shopEl = document.getElementById('shop-rows');
    const fill = (el, rows, onBuy) => {
      el.innerHTML = rows.map((r, i) => `<button class="panel-row" data-i="${i}">
        <span class="panel-name">${r.name}</span><span class="panel-info">${r.info}</span>
        <span class="panel-price">${r.price}</span></button>`).join('');
      el.querySelectorAll('.panel-row').forEach((btn) => {
        btn.addEventListener('click', () => onBuy(Number(btn.dataset.i)));
      });
    };
    this._fillGarage = () => {
      const rows = GARAGE.upgrades.map((u) => {
        const lvl = this.garage[u.id];
        const maxed = lvl >= GARAGE.levels;
        return {
          name: `${u.name} · LV ${lvl}`,
          info: maxed ? 'MAXED' : `Next: +${u.id === 'engine' ? 'top speed' : u.id === 'armor' ? 'HP' : 'grip'}`,
          price: maxed ? '—' : `$${u.costs[lvl]}`,
        };
      });
      fill(garageEl, rows, (i) => this._buyUpgrade(i));
    };
    this._fillShop = () => {
      const rows = SHOP.map((s) => ({ name: s.name, info: '', price: `$${s.price}` }));
      fill(shopEl, rows, (i) => this._buyShop(i));
    };
    this._fillGarage();
    this._fillShop();
  }

  _buyUpgrade(i) {
    const u = GARAGE.upgrades[i];
    const lvl = this.garage[u.id];
    if (lvl >= GARAGE.levels) return;
    const cost = u.costs[lvl];
    if (this.money < cost) { this.hud.toast('Not enough cash.', this.now); return; }
    this.money -= cost;
    this.garage[u.id] += 1;
    this.audio.cash();
    this.hud.toast(`${u.name} upgraded to LV ${this.garage[u.id]}.`, this.now);
    this._fillGarage();
    this._save();
  }

  _buyShop(i) {
    const s = SHOP[i];
    if (this.money < s.price) { this.hud.toast('Not enough cash.', this.now); return; }
    this.money -= s.price;
    if (s.id === 'p9ammo') this.combat.addAmmo(1, 84);
    else if (s.id === 'makoammo') this.combat.addAmmo(2, 208);
    else if (s.id === 'gaugeammo') this.combat.addAmmo(3, 24);
    else if (s.id === 'armorvest') this.player.addArmor(50);
    else if (s.id === 'snack') this.player.heal(25);
    this.audio.cash();
    this.hud.toast(`Bought ${s.name}.`, this.now);
    this._save();
  }

  _bindKeys() {
    // One-frame actions live in the loop; this binding only starts audio on
    // the first gesture, because browsers block sound before one.
    window.addEventListener('keydown', () => this.audio.ensure(), { once: true });
    window.addEventListener('mousedown', () => this.audio.ensure(), { once: true });
  }

  // --- One-frame actions: enter/exit, jobs, crew, weapons, panels. ---
  _actions(dt) {
    const input = this.input;
    const inCar = !!this.vehicles.playerCar;
    const inHeli = this.heli.occupied;
    // Enter or exit a car (E), or the helicopter.
    if (input.hit('KeyE')) {
      if (inHeli) {
        if (this.heli.exit()) {
          this.player.spawn(this.heli.pos.x + 3, this.heli.pos.z + 3);
          this.hud.toast('Out of the SKYHAWK.', this.now);
        } else {
          this.hud.toast('Too deep to step out here.', this.now);
        }
      } else if (inCar) {
        const out = this.vehicles.exitCar();
        if (out) this.player.spawn(out.x, out.z);
      } else {
        const heliD = Math.hypot(this.heli.pos.x - this.player.pos.x, this.heli.pos.z - this.player.pos.z);
        if (heliD < 4 && !this.heli.flying) {
          this.heli.enter();
          this.hud.toast('SKYHAWK — Shift climbs, Ctrl descends.', this.now);
        } else {
          const car = this.vehicles.nearestCar(this.player.pos, 4);
          if (car) {
            const wasPed = car.driver === 'ped';
            this.vehicles.tryEnter(car, () => {
              this.police.addWanted(1);
              this.peds.scare(car.pos.x, car.pos.z, 12);
              this.hud.toast('Carjacked — the driver ran.', this.now);
            });
            if (!wasPed) this.audio.click();
          }
        }
      }
    }
    // Start the next job (J).
    if (input.hit('KeyJ') && !this.jobs.active) {
      const next = this.jobs.nextJob();
      if (next) {
        this.jobs.startJob(this.jobs.completed);
        this.audio.stage();
        this.hud.say('Vex', 'Fixer', `${next.name}. ${next.brief}`, null, this.now, 7);
      } else {
        this.hud.toast('All 11 jobs done. The bay is yours.', this.now);
      }
    }
    // Crew abilities (Z/X/C).
    if (input.hit('KeyZ')) this._useCrew('lena');
    if (input.hit('KeyX')) this._useCrew('omar');
    if (input.hit('KeyC')) this._useCrew('sana');
    // Weapons (1-4).
    for (let i = 0; i < 4; i++) {
      if (input.hit(`Digit${i + 1}`)) this.combat.selectSlot(i);
    }
    // Garage (G), shop (B), help (H), mute (M), save (F).
    if (input.hit('KeyG')) this._togglePanel('garage-panel');
    if (input.hit('KeyB')) this._togglePanel('shop-panel');
    if (input.hit('KeyH')) {
      const help = document.getElementById('help-screen');
      this.hud.toggleHelp(help.classList.contains('hidden'));
    }
    if (input.hit('KeyM')) {
      const muted = this.audio.toggleMute();
      this.hud.toast(muted ? 'Muted.' : 'Sound on.', this.now);
    }
    if (input.hit('KeyF')) {
      this._save();
      this.hud.toast('Saved.', this.now);
    }
    // Start the game from the start screen (Enter), or restart after death.
    // (Handled in _loop now: _actions only runs once started, so this could
    // never fire here. Kept out of the way on purpose.)
    // New game (N on the start screen) — also handled in _loop.
  }

  _useCrew(id) {
    const m = this.crew.use(id, {
      police: this.police,
      playerCar: this.vehicles.playerCar,
      now: this.now,
    });
    if (!m) return;
    const lines = {
      lena: 'Lena: Plates are fresh. Go.',
      omar: 'Omar: She is patched. Do not scratch her again.',
      sana: 'Sana: I have eyes on every unit. Move.',
    };
    this.hud.say(m.name, m.role, lines[id] || m.ability, m.portrait, this.now, 4);
    this.audio.click();
  }

  _togglePanel(id) {
    const el = document.getElementById(id);
    const other = document.getElementById(id === 'garage-panel' ? 'shop-panel' : 'garage-panel');
    other.classList.add('hidden');
    el.classList.toggle('hidden');
    if (!el.classList.contains('hidden')) {
      if (id === 'garage-panel') this._fillGarage();
      else this._fillShop();
    }
  }

  // --- The frame. ---
  _loop() {
    requestAnimationFrame(this._loop);
    const now = performance.now();
    // Clamp the step so a hitch cannot teleport physics — but keep it wide
    // enough (0.1s) that a slow machine still simulates near real time: at
    // 5 fps a 0.05 cap would run the game at a quarter speed, and the
    // helicopter would barely lift off in a second of holding Shift.
    let dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    this.now += dt;
    const t = this.now;
    // Clock: one game hour every 8 real minutes; the sun stays high at noon.
    this.minute += dt * (60 / 480);
    if (this.minute >= 60) { this.minute -= 60; this.hour += 1; }
    if (this.hour >= 24) { this.hour -= 24; this.day += 1; }
    const input = this.input;
    // Start screen keys: Enter starts, N starts fresh. These must be read
    // here, before the started-gate — _actions only runs once started, so
    // checking them there could never start the game.
    if (!this.started) {
      if (input.hit('Enter')) {
        this.started = true;
        this.hud.hideStart();
        this.audio.ensure();
        this.audio.startRadio();
        this.hud.announce('SOLMARA BAY', 'Press J for work. Press H for controls.', this.now, 4);
      }
      if (input.hit('KeyN')) {
        clearSave();
        this.save = null;
        this.money = 500;
        this.respect = 0;
        this.day = 1;
        this.garage = { engine: 0, armor: 0, handling: 0 };
        this.jobs.completed = 0;
        this.hud.showStart('Fresh start — no save.');
      }
    }
    if (this.started && !this.paused) {
      this._actions(dt);
      this._update(dt, t);
    }
    this._renderHud(t);
    this.renderer.render(this.scene, this.camera);
    input.endFrame();
  }

  _update(dt, t) {
    const inCar = !!this.vehicles.playerCar;
    const inHeli = this.heli.occupied;
    // Move the player, the car or the helicopter — only one is in charge.
    if (inHeli) {
      this.heli.update(dt, this.input);
      const landed = this.heli.tryLand();
      if (landed) this.hud.toast(landed === 'roof' ? 'Landed on the rooftop pad.' : 'Landed at the marina pad.', this.now);
      this.player.pos.copy(this.heli.pos);
      this.player.group.position.copy(this.heli.pos);
    } else if (inCar) {
      const car = this.vehicles.playerCar;
      // Garage upgrades shape the car.
      car.topBonus = GARAGE.upgrades[0].topBonus[this.garage.engine];
      car.maxHp = car.def.hp + GARAGE.upgrades[1].hpBonus[this.garage.armor];
      this.player.pos.copy(car.pos);
      this.player.group.position.copy(car.pos);
      this.player.group.visible = false;
    } else {
      this.player.group.visible = true;
      this.player.update(dt, this.input, this.cameraYaw);
    }
    this.vehicles.update(dt, this.input, this.cameraYaw, this.city);
    this.peds.update(dt, t);
    this.city.update(dt, t);
    this.crew.update(dt);
    this.combat.update(this.now);
    // Shooting: mouse click fires from the camera.
    if (this.input.mouseClicked && this.started) {
      this._shoot();
    }
    // Police chase the player (on foot or in the car).
    this.police.update(dt, {
      px: this.player.pos.x,
      pz: this.player.pos.z,
      playerCar: this.vehicles.playerCar,
      player: this.player,
    });
    // Jobs and races.
    const jobResult = this.jobs.update(dt, t, {
      px: this.player.pos.x,
      pz: this.player.pos.z,
      inCar,
      playerCar: this.vehicles.playerCar,
      stars: this.police.stars,
      onStage: (job, stage) => {
        this.audio.stage();
        this.hud.toast(`Stage ${stage}/${job.stages.length} — ${job.stages[stage - 1].label}`, this.now);
      },
      onJob: (job) => this._jobDone(job),
    });
    void jobResult;
    const racePay = this.races.update(dt, t, {
      px: this.player.pos.x,
      pz: this.player.pos.z,
      now: this.now,
      onCheckpoint: (race, cp) => this.hud.toast(`${race.name}: checkpoint ${cp}/${race.checkpoints.length}`, this.now),
      onWin: (race, elapsed, pay) => {
        this.money += pay;
        this.audio.cash();
        this.hud.announce(`${race.name} WON`, `+$${pay} · ${elapsed.toFixed(1)}s`, this.now, 4);
        this._save();
      },
    });
    void racePay;
    // Death: back to the safehouse, lighter in the pocket.
    if (!this.player.alive) {
      this.money = Math.max(0, this.money - 100);
      this.police.clearWanted();
      this.player.respawn({ x: -180, z: 120 });
      this.hud.announce('BUSTED OUT', 'You woke up at the safehouse. -$100.', this.now, 4);
      this._save();
    }
    // Engine hum follows the car's speed; the siren wails with the stars.
    const carSpeed = inCar ? Math.abs(this.vehicles.playerCar.speed) / 46 : 0;
    this.audio.setEngine(inCar ? carSpeed : 0);
    this.audio.siren(this.police.stars > 0);
    this._updateCamera(dt);
  }

  _jobDone(job) {
    const { cash, respect } = this.jobs.payout(job);
    this.money += cash;
    this.respect += respect;
    this.audio.cash();
    this.hud.say('Vex', 'Fixer', `Clean work. $${cash} in your pocket.`, null, this.now, 6);
    this.hud.announce(`${job.name} DONE`, `+$${cash} · ${this.jobs.completed}/11 jobs`, this.now, 4);
    this._save();
  }

  _shoot() {
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    // Targets: police cars and traffic cars (their meshes carry target refs).
    const targets = [];
    for (const u of this.police.units) {
      targets.push({ mesh: u.car.group, pos: u.car.pos, hit: (dmg) => { u.car.damage(dmg); } });
    }
    for (const car of this.vehicles.all) {
      if (car.driver === 'police' || car === this.vehicles.playerCar) continue;
      targets.push({ mesh: car.group, pos: car.pos, hit: (dmg) => { car.damage(dmg); } });
    }
    // Tag meshes so the combat ray can find its target.
    for (const tg of targets) tg.mesh.userData.targetRef = tg;
    const hit = this.combat.shoot(this.now, targets, origin, dir);
    if (hit === 'empty') {
      this.hud.toast('Out of ammo — press B for the shop.', this.now);
    } else if (hit) {
      this.audio.gunshot();
      this.police.addWanted(1);
      this.peds.scare(this.player.pos.x, this.player.pos.z, 16);
    } else if (this.combat.weapon.id !== 'fists') {
      this.audio.gunshot();
    }
  }

  // --- Camera: a chase cam that follows the player, the car or the heli. ---
  _updateCamera(dt) {
    const cam = this.camera;
    if (this.cameraMode !== 'follow') {
      const out = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
      shotCamera(this.cameraMode, this, out);
      cam.position.lerp(out.pos, Math.min(1, dt * 3));
      cam.lookAt(out.look);
      return;
    }
    // Follow the player's facing: on foot the player turns, in a car the car does.
    const target = this.heli.occupied ? this.heli : (this.vehicles.playerCar || this.player);
    const moving = this.heli.occupied
      ? Math.abs(this.heli.speed) > 1
      : this.vehicles.playerCar
        ? Math.abs(this.vehicles.playerCar.speed) > 1
        : this.player.moveAmount > 0;
    if (moving) {
      let want = target.yaw;
      let diff = want - this.cameraYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.cameraYaw += diff * Math.min(1, dt * 2.2);
    }
    const dist = this.heli.occupied ? 15 : this.vehicles.playerCar ? 10.5 : 7.5;
    const height = this.heli.occupied ? 6 : this.vehicles.playerCar ? 4.2 : 3.4;
    const px = target.pos.x - Math.sin(this.cameraYaw) * dist;
    const pz = target.pos.z - Math.cos(this.cameraYaw) * dist;
    const py = target.pos.y + height;
    cam.position.x += (px - cam.position.x) * Math.min(1, dt * 5);
    cam.position.y += (py - cam.position.y) * Math.min(1, dt * 5);
    cam.position.z += (pz - cam.position.z) * Math.min(1, dt * 5);
    cam.lookAt(target.pos.x, target.pos.y + 1.4, target.pos.z);
  }

  // --- HUD sync, once a frame. ---
  _renderHud(t) {
    const hud = this.hud;
    const info = this.jobs.currentInfo();
    hud.mission(info, this.jobs.completed);
    hud.status(this.money, this.police.stars, Math.floor(this.hour), Math.floor(this.minute), this.day);
    const units = this.police.listForHud(this.player.pos.x, this.player.pos.z);
    hud.police(units, this.police.inSight, this.crew.eyesOut(this.now));
    hud.crew(this.crew.hudState());
    const d = this.city.districtAt(this.player.pos.x, this.player.pos.z);
    const rankIdx = this._rankIndex();
    const rankNext = RANK_STEPS[rankIdx + 1] || this.respect + 1;
    hud.district(d, RANKS[rankIdx], this.respect, rankNext);
    hud.vitals(this.player.health, this.player.armor);
    const car = this.vehicles.playerCar;
    const speedKmh = this.heli.occupied
      ? Math.abs(this.heli.speed) * 3.6
      : car ? Math.abs(car.speed) * 3.6 : Math.abs(this.player.moveAmount) * 18;
    hud.drive(speedKmh, this.heli.occupied ? 'SKYHAWK' : car ? car.def.name : null,
      this.heli.occupied ? 1 : car ? car.condition : 0,
      this.combat.hudState(), this.audio.currentTrack());
    // Minimap state.
    const beacon = this.jobs.active && this.jobs.beacon.visible
      ? { x: this.jobs.beacon.position.x, z: this.jobs.beacon.position.z } : null;
    const raceCp = this.races.active
      ? { x: this.races.active.race.checkpoints[this.races.active.cp][0], z: this.races.active.race.checkpoints[this.races.active.cp][1] }
      : null;
    hud.minimap({
      px: this.player.pos.x,
      pz: this.player.pos.z,
      yaw: this.cameraYaw,
      beacon,
      raceCp,
      police: this.police.units.map((u) => ({ x: u.car.pos.x, z: u.car.pos.z })),
      heli: this.police.airUnit && this.police.airUnit.group.visible
        ? { x: this.police.airUnit.x, z: this.police.airUnit.z } : null,
    });
    hud.update(this.now);
  }

  _rankIndex() {
    let idx = 0;
    for (let i = 0; i < RANK_STEPS.length; i++) {
      if (this.respect >= RANK_STEPS[i]) idx = i;
    }
    return idx;
  }

  _save() {
    writeSave({
      money: this.money,
      jobsDone: this.jobs.completed,
      respect: this.respect,
      garage: this.garage,
      racesWon: [...this.races.won],
      bestTimes: this.races.bestTimes,
      playerPos: { x: this.player.pos.x, z: this.player.pos.z },
      day: this.day,
    });
  }
}

// Start the game once the page is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { new Game(); });
} else {
  new Game();
}
