// ---------------------------------------------------------------
// Elsewhere · Cat.js
// ---------------------------------------------------------------
// Wanders inside a tile-rectangle. Picks a new destination every
// few seconds, strolls there, pauses, repeats. Clicking opens
// its bio.
// ---------------------------------------------------------------

import { isWalkable } from '../systems/Walkable.js';
import * as Modal from '../systems/Modal.js';

export class Cat {
  constructor(scene, def, walkable, tileSize) {
    this.scene = scene;
    this.def = def;
    this.walkable = walkable;
    this.tileSize = tileSize;

    const sx = (def.spawn.x + 0.5) * tileSize;
    const sy = (def.spawn.y + 0.5) * tileSize;
    this.sprite = scene.add.image(sx, sy, def.sprite).setDepth(500);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => Modal.open({
      title: def.id.charAt(0).toUpperCase() + def.id.slice(1),
      bio: def.bio,
    }));

    this.target = { x: sx, y: sy };
    this.pauseUntil = 0;
    this.pickNewTarget();
  }

  pickNewTarget() {
    const { x, y, w, h } = this.def.zone;
    for (let tries = 0; tries < 20; tries++) {
      const tx = x + Math.floor(Math.random() * w);
      const ty = y + Math.floor(Math.random() * h);
      if (isWalkable(this.walkable, tx, ty)) {
        this.target.x = (tx + 0.5) * this.tileSize;
        this.target.y = (ty + 0.5) * this.tileSize;
        return;
      }
    }
  }

  update(now, dt) {
    if (now < this.pauseUntil) return;
    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      this.pauseUntil = now + 1500 + Math.random() * 3000;
      this.pickNewTarget();
      return;
    }
    const step = Math.min(dist, (this.def.speed * dt) / 1000);
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
    if (dx < 0) this.sprite.setFlipX(true);
    else if (dx > 0) this.sprite.setFlipX(false);
  }
}
