// ---------------------------------------------------------------
// AfterHours · Sprites.js
// ---------------------------------------------------------------
// Sprite-sheet loading + a tiny per-entity Animator. The engine
// does the blitting (the 'sprite' part kind / playerSprite); this
// just turns (state, time) into the right frame rectangle.
// ---------------------------------------------------------------

export function loadImage(src) {
  const im = new Image();
  im.src = src;
  return im;
}

export class Animator {
  constructor(def) { this.def = def; this.cur = null; this.start = 0; }

  play(name, now) {
    if (name !== this.cur) { this.cur = name; this.start = now; }
  }

  // [sx, sy, sw, sh] into the sheet for the current time.
  rect(now) {
    const a = this.def.anims && this.def.anims[this.cur];
    if (!a) return [0, 0, this.def.frameW, this.def.frameH];
    const n = a.to - a.from + 1;
    let i = Math.floor((now - this.start) / (1000 / a.fps));
    i = a.loop === false ? Math.min(i, n - 1) : ((i % n) + n) % n;
    return [(a.from + i) * this.def.frameW, a.row * this.def.frameH,
            this.def.frameW, this.def.frameH];
  }
}
