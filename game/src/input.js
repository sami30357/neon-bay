// Keyboard and mouse input for Neon Bay. Keys are tracked by code so the layout
// never depends on the player's keyboard language. Mouse look uses pointer lock.
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

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      if (this.onKey) this.onKey(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => { this.keys.delete(event.code); });
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
