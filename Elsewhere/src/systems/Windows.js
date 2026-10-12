// ---------------------------------------------------------------
// Elsewhere · Windows.js
// ---------------------------------------------------------------
// Each window is a live viewport on the sky. Every frame it repaints a
// small offscreen canvas in three layers:
//   1. the sky frame for the current weather (sky.png) — the view
//   2. rain streaks + the lightning flash — live weather
//   3. the frame + ledge — a hand-drawn PNG laid over the top
// and hands that canvas to the engine as the window's image, so the
// glass shows the weather in the wall's own sort order and the player
// still walks in front of it.
//
// Two layers are paintable: the sky sheet (shared with the backdrop)
// and each window's frame PNG (assets/sprites/<id>_frame.png — opaque
// wood, transparent panes). The sky + rain + flash are the viewport.
// ---------------------------------------------------------------

import { loadImage } from './Sprites.js';

const PX = 32;                     // tiles -> canvas pixels

export class Windows {
  // scene: CABIN_SCENE · ambience: Ambience module · sky: { img, def }
  constructor(scene, ambience, sky) {
    this.amb = ambience;
    this.sky = sky;
    this.items = [];
    for (const o of scene.objects) {
      if (o.category !== 'mounted' || !/window/.test(o.id)) continue;
      const vb = o.visualBounds;
      const glass = (o.shapes.find(s => s.role === 'glass') || o.shapes[0]).rect;
      const w = Math.round(vb[2] * PX), h = Math.round(vb[3] * PX);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      this.items.push({
        id: o.id, cv, ctx: cv.getContext('2d'), w, h, drops: [],
        frame: loadImage(`assets/sprites/${o.id}_frame.png`),
        glass: [Math.round((glass[0] - vb[0]) * PX), Math.round((glass[1] - vb[1]) * PX),
                Math.round(glass[2] * PX), Math.round(glass[3] * PX)],
      });
    }
  }

  // merge into the engine's images map, keyed by window id
  images() { const m = {}; for (const it of this.items) m[it.id] = it.cv; return m; }

  update(now, dt) {
    const weather = this.amb.currentWeather();
    const flash = this.amb.flashLevel ? this.amb.flashLevel() : 0;
    const raining = weather === 'rain' || weather === 'storm';
    const col = (this.sky.def.frames && this.sky.def.frames[weather]) ?? 0;
    for (const it of this.items) this.paint(it, weather, col, raining, flash, dt);
  }

  paint(it, weather, col, raining, flash, dt) {
    const c = it.ctx, [gx, gy, gw, gh] = it.glass;
    c.clearRect(0, 0, it.w, it.h);
    c.imageSmoothingEnabled = false;

    // ---- viewport: sky + rain + flash, clipped to the glass ----
    c.save(); c.beginPath(); c.rect(gx, gy, gw, gh); c.clip();
    const S = this.sky.def, img = this.sky.img;
    if (img && img.complete && img.naturalWidth)
      c.drawImage(img, col * S.frameW, 0, S.frameW, S.frameH, gx, gy, gw, gh);
    else { c.fillStyle = '#6da8d8'; c.fillRect(gx, gy, gw, gh); }

    if (raining) {
      if (!it.drops.length)
        for (let i = 0; i < 26; i++)
          it.drops.push({ x: Math.random() * gw, y: Math.random() * gh, s: 95 + Math.random() * 70, l: 5 + Math.random() * 5 });
      c.strokeStyle = weather === 'storm' ? 'rgba(205,218,242,0.6)' : 'rgba(205,220,245,0.5)';
      c.lineWidth = 1; c.beginPath();
      for (const p of it.drops) {
        p.y += p.s * dt; p.x += p.s * dt * 0.2;
        if (p.y > gh) { p.y = -4; p.x = Math.random() * gw; }
        c.moveTo(gx + p.x, gy + p.y); c.lineTo(gx + p.x - 1, gy + p.y + p.l);
      }
      c.stroke();
    } else if (it.drops.length) it.drops = [];

    if (flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(0.85, flash * 0.8)})`; c.fillRect(gx, gy, gw, gh); }
    c.restore();

    // ---- frame + ledge: the hand-drawn layer over the viewport ----
    if (it.frame.complete && it.frame.naturalWidth) c.drawImage(it.frame, 0, 0, it.w, it.h);
  }
}
