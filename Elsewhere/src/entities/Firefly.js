// ---------------------------------------------------------------
// Elsewhere · Firefly.js
// ---------------------------------------------------------------
// The player cursor. Floats toward the mouse pointer but refuses
// to enter non-walkable tiles. Pulses softly.
// ---------------------------------------------------------------

import { isWalkable } from '../systems/Walkable.js';

export class Firefly {
  constructor(scene, x, y, walkable, tileSize) {
    this.scene = scene;
    this.sprite = scene.add.image(x, y, 'firefly').setDepth(1000);
    this.target = { x, y };
    this.speed = 180;
    this.walkable = walkable;
    this.tileSize = tileSize;

    scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.95, to: 1.1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setTarget(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    if (isWalkable(this.walkable, tx, ty)) {
      this.target.x = x;
      this.target.y = y;
    }
  }

  update(dt) {
    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const step = Math.min(dist, (this.speed * dt) / 1000);
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
  }
}
