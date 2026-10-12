// ---------------------------------------------------------------
// Elsewhere · Player.js
// ---------------------------------------------------------------
// WASD / arrow-key player. 24×32 sprite with a 4-direction walk
// cycle. Collides with the walkable grid tile-by-tile.
// ---------------------------------------------------------------

import { isWalkable } from '../systems/Walkable.js';

const SPEED = 120;   // px / sec

export class Player {
  constructor(scene, x, y, walkable, tileSize) {
    this.scene = scene;
    this.walkable = walkable;
    this.tileSize = tileSize;

    this.sprite = scene.physics
      ? scene.physics.add.sprite(x, y, 'player', 1)
      : scene.add.sprite(x, y, 'player', 1);
    this.sprite.setDepth(1000);

    this.facing = 'down';
    this.makeAnims();
    this.sprite.anims.play('idle_down');

    this.keys = scene.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
    });
  }

  makeAnims() {
    const anims = this.scene.anims;
    const defs = [
      ['down',  0],
      ['left',  3],
      ['right', 6],
      ['up',    9],
    ];
    for (const [dir, start] of defs) {
      if (!anims.exists(`walk_${dir}`)) {
        anims.create({
          key: `walk_${dir}`,
          frames: anims.generateFrameNumbers('player',
                    { start, end: start + 2 }),
          frameRate: 8,
          repeat: -1,
        });
      }
      if (!anims.exists(`idle_${dir}`)) {
        anims.create({
          key: `idle_${dir}`,
          frames: [{ key: 'player', frame: start + 1 }],
          frameRate: 1,
        });
      }
    }
  }

  update(dt) {
    const k = this.keys;
    let dx = 0, dy = 0;
    if (k.left.isDown  || k.left2.isDown)  dx -= 1;
    if (k.right.isDown || k.right2.isDown) dx += 1;
    if (k.up.isDown    || k.up2.isDown)    dy -= 1;
    if (k.down.isDown  || k.down2.isDown)  dy += 1;

    if (dx === 0 && dy === 0) {
      this.sprite.anims.play(`idle_${this.facing}`, true);
      return;
    }

    // Normalise so diagonal isn't faster
    const mag = Math.hypot(dx, dy);
    dx /= mag; dy /= mag;

    // Pick facing from dominant axis
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx < 0 ? 'left' : 'right';
    } else {
      this.facing = dy < 0 ? 'up' : 'down';
    }
    this.sprite.anims.play(`walk_${this.facing}`, true);

    const step = (SPEED * dt) / 1000;
    this.moveAxis(dx * step, 0);
    this.moveAxis(0, dy * step);
  }

  // Move along one axis; refuse the move if the target tile isn't walkable.
  // Treating axes independently gives you "slide along walls" behaviour.
  moveAxis(mx, my) {
    const newX = this.sprite.x + mx;
    const newY = this.sprite.y + my;
    // Probe the player's "feet" (lower-centre of the sprite)
    const probeX = newX;
    const probeY = newY + 10;
    const tx = Math.floor(probeX / this.tileSize);
    const ty = Math.floor(probeY / this.tileSize);
    if (isWalkable(this.walkable, tx, ty)) {
      this.sprite.x = newX;
      this.sprite.y = newY;
    }
  }
}
