// v8: Solmara Bay — re-authored in this session under recording 01a1f524 (2026-11-20).
// v7: Sun-Kissed Bay — header touch under recording 01a1f27b (file content unchanged; the helicopter reuses W/S/A/D/Space/Shift through this same input).
// v6: Golden Hour Kings — header touch under recording 01a1f269 (file content unchanged).
// v5: Golden Hour — header touch under recording 01a1f255 (day-night cycle build; file content unchanged).
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Keyboard and mouse input for Neon Bay. Keys are tracked by code so the layout
// never depends on the player's keyboard language. Mouse look uses pointer lock.
// v2: arrow keys alias WASD (so driving works with either hand), and a key
// press is also reported with its repeat state for held actions.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.pointerLocked = false;
    this.canvas = canvas;
    this.onKey = null; // (code) => void, for one-shot actions
    this.onMouseDown = null; // () => void, for shooting

    // arrow keys drive the same actions as WASD
    this._aliases = {
      ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD',
    };

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      const alias = this._aliases[event.code];
      if (alias) this.keys.add(alias);
      if (this.onKey) this.onKey(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      const alias = this._aliases[event.code];
      if (alias) this.keys.delete(alias);
    });
    window.addEventListener('blur', () => { this.keys.clear(); });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (event) => {
      if (!this.pointerLocked) return;
      this.mouseDX += event.movementX || 0;
      this.mouseDY += event.movementY || 0;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      this.mouseDown = true;
      if (!this.pointerLocked) canvas.requestPointerLock();
      if (this.onMouseDown) this.onMouseDown();
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
  }

  down(code) { return this.keys.has(code); }
  axis(negative, positive) {
    return (this.keys.has(positive) ? 1 : 0) - (this.keys.has(negative) ? 1 : 0);
  }
  consumeMouse() {
    const dx = this.mouseDX, dy = this.mouseDY;
    this.mouseDX = 0; this.mouseDY = 0;
    return { dx, dy };
  }
  lockPointer() { if (!this.pointerLocked) this.canvas.requestPointerLock(); }
  unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
}
