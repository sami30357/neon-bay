// Solmara Bay — keyboard and mouse input.
// One clear job: turn raw DOM events into a small state object the game reads
// every frame. Keys are tracked by their code (KeyW, Space, …), so layouts
// do not matter, and every press is also offered as a one-frame edge.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.anyKey = false;
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      this.anyKey = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => { this.keys.delete(e.code); };
    this._onMouseMove = (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; };
    this._onMouseDown = (e) => { this.mouseDown = true; this.mouseClicked = true; };
    this._onMouseUp = () => { this.mouseDown = false; };
    this._onBlur = () => { this.keys.clear(); this.mouseDown = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('blur', this._onBlur);
  }

  down(code) { return this.keys.has(code); }
  // True only on the frame the key went down.
  hit(code) { return this.pressed.has(code); }
  // WASD / arrows as a -1..1 pair, already normalised by the caller.
  moveAxes() {
    let x = 0; let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y -= 1;
    return { x, y };
  }
  // Call once per frame, after the game has read the edges.
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
    this.anyKey = false;
  }
}

// A second pass on input: mouse-look deltas and a helper the menus use to
// catch a single keypress without holding it down.
export function mouseDelta(input, last) {
  const dx = input.mouseX - last.x;
  const dy = input.mouseY - last.y;
  last.x = input.mouseX;
  last.y = input.mouseY;
  return { dx, dy };
}

// True when any of the given codes was hit this frame.
export function anyHit(input, codes) {
  for (const c of codes) if (input.hit(c)) return true;
  return false;
}
