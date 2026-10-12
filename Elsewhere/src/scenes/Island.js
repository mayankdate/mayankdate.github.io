// ---------------------------------------------------------------
// Elsewhere · Island.js
// ---------------------------------------------------------------
// The explorable room. Paints floor tiles, drops walls on top,
// spawns cats, places interactables, follows the mouse with a
// firefly.
// ---------------------------------------------------------------

import { Firefly } from '../entities/Firefly.js';
import { Cat } from '../entities/Cat.js';
import { Interactable } from '../entities/Interactable.js';
import { buildWalkable } from '../systems/Walkable.js';

const WALL_KEY = {
  h: 'wall_h',
  v: 'wall_v',
  corner_tl: 'wall_corner_tl',
  doorway: 'wall_doorway',
};

export class Island extends Phaser.Scene {
  constructor() { super('Island'); }

  create() {
    const data = this.registry.get('data');
    const { world, interactables, cats, content } = data;
    const tile = world.grid.tile;
    const W = world.grid.width * tile;
    const H = world.grid.height * tile;

    this.cameras.main.setBackgroundColor('#1a1f2e');
    this.cameras.main.setBounds(0, 0, W, H);

    // --- floor
    for (const room of world.rooms) {
      const { x, y, w, h } = room.bounds;
      for (let ty = y; ty < y + h; ty++) {
        for (let tx = x; tx < x + w; tx++) {
          this.add.image(
            (tx + 0.5) * tile,
            (ty + 0.5) * tile,
            room.floor,
          ).setDepth(0);
        }
      }
    }

    // --- walls. 32x48 sprites: bottom 32 occupies the tile,
    //      top 16 pokes above into the row before. Depth comes
    //      from the wall's row so lower walls draw over higher
    //      ones for a hint of parallax.
    for (const wall of world.walls) {
      const key = WALL_KEY[wall.type];
      const px = (wall.x + 0.5) * tile;
      const py = (wall.y + 0.5) * tile - 8;   // nudge up for capstone
      this.add.image(px, py, key).setDepth(100 + wall.y);
    }

    // --- walkable grid
    const walkable = buildWalkable(world);

    // --- cats
    this.cats = cats.map(c => new Cat(this, c, walkable, tile));

    // --- interactables
    const contentFor = (key) => content[key];
    for (const def of interactables) {
      new Interactable(this, def, tile, contentFor);
    }

    // --- firefly cursor
    const sx = (world.spawn.x + 0.5) * tile;
    const sy = (world.spawn.y + 0.5) * tile;
    this.firefly = new Firefly(this, sx, sy, walkable, tile);
    this.firefly.sprite.setDepth(1000);

    this.cameras.main.startFollow(this.firefly.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(computeZoom(this.scale, W, H));

    this.input.on('pointermove', (p) => {
      this.firefly.setTarget(p.worldX, p.worldY);
    });
    this.input.on('pointerdown', (p) => {
      this.firefly.setTarget(p.worldX, p.worldY);
    });

    this.scale.on('resize', () => {
      this.cameras.main.setZoom(computeZoom(this.scale, W, H));
    });

    this.add.text(16, 16,
      'Drag with your cursor. Click the cat, the shelves, or me.', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#F5EBD6',
      backgroundColor: '#0D2545',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(10000).setAlpha(0.75);
  }

  update(now, dt) {
    this.firefly.update(dt);
    for (const c of this.cats) c.update(now, dt);
  }
}

function computeZoom(scale, W, H) {
  const zx = scale.width / W;
  const zy = scale.height / H;
  return Math.max(1, Math.min(zx, zy) * 1.6);
}
