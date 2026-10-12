// ---------------------------------------------------------------
// Elsewhere · Island.js
// ---------------------------------------------------------------
// Paints floor tiles, drops walls, spawns cats and clickable
// shelves, places the player, hooks up camera and zoom.
// ---------------------------------------------------------------

import { Player } from '../entities/Player.js';
import { Cat } from '../entities/Cat.js';
import { Interactable } from '../entities/Interactable.js';
import { buildWalkable } from '../systems/Walkable.js';

const WALL_KEY = {
  h: 'wall_h',
  v: 'wall_v',
  corner_tl: 'wall_corner_tl',
  doorway: 'wall_doorway',
};

const MIN_ZOOM = 1.5;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;

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

    // --- walls
    for (const wall of world.walls) {
      const key = WALL_KEY[wall.type];
      const px = (wall.x + 0.5) * tile;
      const py = (wall.y + 0.5) * tile - 8;   // capstone nudge
      this.add.image(px, py, key).setDepth(100 + wall.y);
    }

    const walkable = buildWalkable(world);

    // --- cats
    this.cats = cats.map(c => new Cat(this, c, walkable, tile));

    // --- interactables
    const contentFor = (key) => content[key];
    for (const def of interactables) {
      new Interactable(this, def, tile, contentFor);
    }

    // --- player
    const sx = (world.spawn.x + 0.5) * tile;
    const sy = (world.spawn.y + 0.5) * tile;
    this.player = new Player(this, sx, sy, walkable, tile);

    // --- camera
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.zoom = clamp(computeFitZoom(this.scale, W, H), MIN_ZOOM, MAX_ZOOM);
    this.cameras.main.setZoom(this.zoom);

    // Keyboard zoom (`=`/`+`/`-`)
    this.input.keyboard.on('keydown-PLUS',   () => this.setZoom(this.zoom + ZOOM_STEP));
    this.input.keyboard.on('keydown-EQUALS', () => this.setZoom(this.zoom + ZOOM_STEP));
    this.input.keyboard.on('keydown-MINUS',  () => this.setZoom(this.zoom - ZOOM_STEP));

    // Mouse-wheel zoom
    this.input.on('wheel', (_p, _o, _dx, dy) => {
      this.setZoom(this.zoom + (dy < 0 ? ZOOM_STEP : -ZOOM_STEP));
    });

    // DOM zoom HUD (declared in index.html)
    const hud = document.getElementById('zoom-hud');
    hud.classList.add('is-visible');
    hud.querySelector('[data-zoom="in"]').onclick  = () => this.setZoom(this.zoom + ZOOM_STEP);
    hud.querySelector('[data-zoom="out"]').onclick = () => this.setZoom(this.zoom - ZOOM_STEP);

    this.scale.on('resize', () => {
      // Keep zoom in bounds on viewport change but don't yank the user
      this.setZoom(this.zoom);
    });

    this.events.once('shutdown', () => hud.classList.remove('is-visible'));
  }

  setZoom(z) {
    this.zoom = clamp(z, MIN_ZOOM, MAX_ZOOM);
    this.cameras.main.setZoom(this.zoom);
  }

  update(_now, dt) {
    this.player.update(dt);
    const now = this.time.now;
    for (const c of this.cats) c.update(now, dt);
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function computeFitZoom(scale, W, H) {
  const zx = scale.width / W;
  const zy = scale.height / H;
  return Math.max(1, Math.min(zx, zy) * 1.8);
}
