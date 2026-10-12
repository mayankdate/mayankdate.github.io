// ---------------------------------------------------------------
// Elsewhere · Cat.js
// ---------------------------------------------------------------
// Wanders inside a tile rectangle, pausing between strolls.
// Click to read its bio. Feet-origin so it y-sorts with the
// player.
// ---------------------------------------------------------------

import * as Modal from '../systems/Modal.js';

export class Cat {
  constructor(scene, def, tilemap) {
    this.scene = scene;
    this.def = def;
    this.map = tilemap;
    this.T = tilemap.T;

    const fx = (def.spawn.x + 0.5) * this.T;
    const fy = (def.spawn.y + 1) * this.T;
    this.sprite = scene.add.sprite(fx, fy, def.sprite).setOrigin(0.5, 1);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => {
      if (scene.inputLocked) return;
      Modal.open({ title: cap(def.id), bio: def.bio });
    });
    this.sprite.on('pointerover', () => this.sprite.setTint(0xffe9a8));
    this.sprite.on('pointerout', () => this.sprite.clearTint());

    this.target = { x: fx, y: fy };
    this.pauseUntil = 0;
    this.pick();
  }

  pick() {
    const { x, y, w, h } = this.def.zone;
    for (let i = 0; i < 24; i++) {
      const tx = x + Math.floor(Math.random() * w);
      const ty = y + Math.floor(Math.random() * h);
      if (this.map.isWalkable(tx, ty)) {
        this.target.x = (tx + 0.5) * this.T;
        this.target.y = (ty + 1) * this.T;
        return;
      }
    }
  }

  update(now, dt) {
    this.sprite.setDepth(this.sprite.y);
    if (now < this.pauseUntil) return;
    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      this.pauseUntil = now + 1500 + Math.random() * 3500;
      this.pick();
      return;
    }
    const step = Math.min(dist, (this.def.speed * dt) / 1000);
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
    if (dx < -0.5) this.sprite.setFlipX(true);
    else if (dx > 0.5) this.sprite.setFlipX(false);
  }
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
