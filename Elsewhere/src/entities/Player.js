// ---------------------------------------------------------------
// Elsewhere · Player.js
// ---------------------------------------------------------------
// WASD / arrow movement with a 4-direction walk cycle. The
// sprite's origin is at its feet so depth-sorting and collision
// both key off the same point. Movement is locked while the
// intro dialog is up (scene.inputLocked).
// ---------------------------------------------------------------

const SPEED = 125;   // px / sec

export class Player {
  constructor(scene, feetX, feetY, tilemap) {
    this.scene = scene;
    this.map = tilemap;
    this.T = tilemap.T;

    this.sprite = scene.add.sprite(feetX, feetY, 'player', 1)
      .setOrigin(0.5, 1);
    this.facing = 'down';
    this.makeAnims();
    this.sprite.anims.play('idle_down');

    this.keys = scene.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
    });
  }

  makeAnims() {
    const a = this.scene.anims;
    const rows = [['down', 0], ['left', 3], ['right', 6], ['up', 9]];
    for (const [dir, start] of rows) {
      if (!a.exists(`walk_${dir}`)) {
        a.create({
          key: `walk_${dir}`,
          frames: a.generateFrameNumbers('player', { start, end: start + 2 }),
          frameRate: 8, repeat: -1,
        });
      }
      if (!a.exists(`idle_${dir}`)) {
        a.create({
          key: `idle_${dir}`,
          frames: [{ key: 'player', frame: start + 1 }],
        });
      }
    }
  }

  update(dt) {
    this.sprite.setDepth(this.sprite.y);

    if (this.scene.inputLocked) {
      this.sprite.anims.play(`idle_${this.facing}`, true);
      return;
    }

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

    const mag = Math.hypot(dx, dy);
    dx /= mag; dy /= mag;

    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? 'left' : 'right';
    else                             this.facing = dy < 0 ? 'up' : 'down';
    this.sprite.anims.play(`walk_${this.facing}`, true);

    const step = (SPEED * dt) / 1000;
    this.moveAxis(dx * step, 0);
    this.moveAxis(0, dy * step);
  }

  // Move on one axis; reject the move if the foot tile isn't walkable.
  // Per-axis probing lets you slide along walls.
  moveAxis(mx, my) {
    const nx = this.sprite.x + mx;
    const ny = this.sprite.y + my;
    const tx = Math.floor(nx / this.T);
    const ty = Math.floor((ny - 2) / this.T);
    if (this.map.isWalkable(tx, ty)) {
      this.sprite.x = nx;
      this.sprite.y = ny;
    }
  }
}
