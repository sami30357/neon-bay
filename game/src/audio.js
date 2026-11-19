// v7: Sun-Kissed Bay — race start fanfare + checkpoint beep, under recording 01a1f27b.
// v6: Golden Hour Kings — header touch under recording 01a1f269 (file content unchanged).
// v5: Golden Hour — header touch under recording 01a1f255 (day-night cycle build; file content unchanged).
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Synthesized sound for Neon Bay: every sound is made with WebAudio oscillators and
// filtered noise, so the game needs no audio files and works fully offline.
// v2: a helicopter rotor thump when the PD chopper is up, a two-tone car horn,
// a rising orb chime, and a four-note fanfare when a job pays out.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
    this.rainGain = null;
    this.rotorOsc = null;
    this.rotorGain = null;
    this.rotorFilter = null;
    this.musicTimer = 0;
    this.musicStep = 0;
    // WAVE 88.1: a quiet synthwave bassline (A minor), one note per step
    this.musicPattern = [110, 0, 130.81, 0, 164.81, 0, 196, 164.81];
    this.started = false;
  }

  start() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this._buildEngine();
      this._buildRain();
      this._buildRotor();
      this.started = true;
    } catch (err) {
      this.started = false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _buildEngine() {
    const ctx = this.ctx;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineFilter.Q.value = 2;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 82;
    const g2 = ctx.createGain(); g2.gain.value = 0.4;
    this.engineOsc.connect(this.engineFilter);
    this.engineOsc2.connect(g2); g2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start(); this.engineOsc2.start();
  }

  setEngine(speedKmh, throttle) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    const rpm = 50 + Math.min(1, Math.abs(speedKmh) / 180) * 190 + (throttle ? 22 : 0);
    this.engineOsc.frequency.setTargetAtTime(rpm, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(rpm * 1.5, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(320 + Math.abs(speedKmh) * 6, t, 0.1);
    this.engineGain.gain.setTargetAtTime(throttle || Math.abs(speedKmh) > 2 ? 0.055 : 0.018, t, 0.1);
  }

  _buildRain() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 1400; filter.Q.value = 0.4;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0.028;
    src.connect(filter); filter.connect(this.rainGain); this.rainGain.connect(this.master);
    src.start();
  }

  _buildRotor() {
    // helicopter: a low thumping sawtooth through a slow wobble, silent until used
    const ctx = this.ctx;
    this.rotorOsc = ctx.createOscillator();
    this.rotorOsc.type = 'sawtooth';
    this.rotorOsc.frequency.value = 42;
    this.rotorFilter = ctx.createBiquadFilter();
    this.rotorFilter.type = 'lowpass';
    this.rotorFilter.frequency.value = 240;
    this.rotorGain = ctx.createGain();
    this.rotorGain.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain); lfoGain.connect(this.rotorGain.gain);
    this.rotorOsc.connect(this.rotorFilter);
    this.rotorFilter.connect(this.rotorGain);
    this.rotorGain.connect(this.master);
    this.rotorOsc.start(); lfo.start();
  }

  updateRotor(active) {
    if (!this.ctx || !this.rotorGain) return;
    this.rotorGain.gain.setTargetAtTime(active ? 0.05 : 0, this.ctx.currentTime, 0.3);
  }

  // radio music: a quiet looping bassline under the rain and engine
  updateMusic(dt) {
    if (!this.ctx) return;
    this.musicTimer += dt;
    if (this.musicTimer < 0.3) return;
    this.musicTimer = 0;
    const freq = this.musicPattern[this.musicStep % this.musicPattern.length];
    this.musicStep += 1;
    if (freq > 0) this._blip(freq, 0.28, 'triangle', 0.045);
  }

  _blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _noiseBurst(dur, vol, freq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = freq;
    const gain = this.ctx.createGain(); gain.gain.value = vol;
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start(t);
  }

  gunshot() { this._noiseBurst(0.16, 0.5, 900); this._blip(140, 0.1, 'square', 0.2); }
  punch() { this._noiseBurst(0.09, 0.35, 300); }
  cash() { this._blip(880, 0.09, 'sine', 0.22); this._blip(1320, 0.14, 'sine', 0.22, 0.09); }
  pickup() { this._blip(660, 0.08, 'triangle', 0.2); this._blip(990, 0.1, 'triangle', 0.2, 0.07); }
  orb() { this._blip(1046, 0.09, 'sine', 0.22); this._blip(1318, 0.09, 'sine', 0.22, 0.07); this._blip(1568, 0.16, 'sine', 0.22, 0.14); }
  fanfare() { this._blip(523, 0.12, 'triangle', 0.22); this._blip(659, 0.12, 'triangle', 0.22, 0.1); this._blip(784, 0.12, 'triangle', 0.22, 0.2); this._blip(1046, 0.22, 'triangle', 0.24, 0.3); }
  horn() { this._blip(370, 0.28, 'square', 0.16); this._blip(466, 0.28, 'square', 0.16); }
  // v7: street races — a three-note green-light fanfare at the flag, and a
  // bright two-note beep every time a checkpoint ring is hit
  raceStart() { this._blip(523, 0.12, 'square', 0.2); this._blip(784, 0.12, 'square', 0.2, 0.1); this._blip(1046, 0.2, 'square', 0.22, 0.2); }
  raceBeep() { this._blip(1318, 0.09, 'sine', 0.22); this._blip(1760, 0.14, 'sine', 0.22, 0.08); }
  denied() { this._blip(180, 0.16, 'square', 0.18); }
  click() { this._blip(1200, 0.05, 'sine', 0.15); }
  crash() { this._noiseBurst(0.3, 0.5, 500); }

  updateSiren(dt, policeNear) {
    if (!this.ctx) return;
    if (!policeNear) {
      if (this.sirenGain) this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      return;
    }
    if (!this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    }
    this.sirenTimer += dt;
    const hi = Math.floor(this.sirenTimer * 1.6) % 2 === 0;
    this.sirenOsc.frequency.setTargetAtTime(hi ? 950 : 700, this.ctx.currentTime, 0.05);
    this.sirenGain.gain.setTargetAtTime(0.045, this.ctx.currentTime, 0.2);
  }
}
