// Solmara Bay — sound.
// One clear job: every sound in the game, synthesised live with WebAudio.
// No audio files, no network: an engine hum, a siren, gunshots, radio music
// and UI blips, all built from oscillators and noise.
import { RADIO } from './config.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.radioOn = true;
    this.trackIndex = 0;
    this.musicTimer = null;
    this.muted = false;
  }

  // Start on the first user gesture (browsers block audio before that).
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this._startEngine();
  }

  _startEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  // Engine pitch follows speed: 0..1.
  setEngine(amount) {
    if (!this.ctx || !this.engineOsc) return;
    this.engineOsc.frequency.setTargetAtTime(48 + amount * 130, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(0.02 + amount * 0.06, this.ctx.currentTime, 0.1);
  }

  _blip(freq, dur, type = 'sine', vol = 0.18) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }

  click() { this._blip(660, 0.07, 'sine', 0.12); }
  cash() { this._blip(880, 0.09, 'sine', 0.16); setTimeout(() => this._blip(1320, 0.12, 'sine', 0.14), 70); }
  stage() { this._blip(520, 0.1, 'triangle', 0.16); setTimeout(() => this._blip(780, 0.14, 'triangle', 0.14), 90); }

  gunshot() {
    if (!this.ctx || this.muted) return;
    const dur = 0.12;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = 0.3;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
  }

  // A two-tone siren that wails while the wanted level is up.
  siren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.035;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this._sirenSweep();
    } else if (!on && this.sirenOsc) {
      try { this.sirenOsc.stop(); } catch { /* already stopped */ }
      this.sirenOsc = null;
      if (this._sirenTimer) clearTimeout(this._sirenTimer);
    }
  }

  _sirenSweep() {
    if (!this.sirenOsc) return;
    const now = this.ctx.currentTime;
    const f = this.sirenOsc.frequency;
    const high = f.value > 800;
    f.linearRampToValueAtTime(high ? 660 : 980, now + 0.55);
    this._sirenTimer = setTimeout(() => this._sirenSweep(), 560);
  }

  // Radio: a gentle island groove from a tiny step sequencer. The track name
  // comes from the config; the notes are a I–vi–IV–V walk in C major.
  startRadio() {
    if (!this.ctx || this.musicTimer) return;
    const notes = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 293.7, 329.6];
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.radioOn || !this.ctx) return;
      const f = notes[step % notes.length];
      this._blip(f, 0.5, 'triangle', 0.05);
      if (step % 4 === 0) this._blip(f / 2, 0.6, 'sine', 0.06);
      step += 1;
    }, 320);
  }

  nextTrack() {
    this.trackIndex = (this.trackIndex + 1) % RADIO.tracks.length;
    return RADIO.tracks[this.trackIndex];
  }

  currentTrack() {
    return RADIO.tracks[this.trackIndex];
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
}
