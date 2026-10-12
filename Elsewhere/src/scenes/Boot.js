// ---------------------------------------------------------------
// Elsewhere · Boot.js
// ---------------------------------------------------------------
// Loads every image asset and every YAML config, then hands off
// to Welcome.
// ---------------------------------------------------------------

import { loadAll } from '../systems/Config.js';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const t = 'assets/tiles';
    const s = 'assets/sprites';
    this.load.image('floor_wood_dark',  `${t}/floor_wood_dark.png`);
    this.load.image('floor_wood_light', `${t}/floor_wood_light.png`);
    this.load.image('floor_stone',      `${t}/floor_stone.png`);
    this.load.image('floor_rug',        `${t}/floor_rug.png`);
    this.load.image('floor_grass',      `${t}/floor_grass.png`);
    this.load.image('wall_h',           `${t}/wall_horizontal.png`);
    this.load.image('wall_v',           `${t}/wall_vertical.png`);
    this.load.image('wall_corner_tl',   `${t}/wall_corner_tl.png`);
    this.load.image('wall_doorway',     `${t}/wall_doorway.png`);
    this.load.image('cat_apollo',       `${s}/cat_apollo.png`);
    this.load.image('bookshelf',        `${s}/bookshelf.png`);
    this.load.image('mayank_npc',       `${s}/mayank_npc.png`);
    this.load.spritesheet('player',     `${s}/player.png`,
      { frameWidth: 24, frameHeight: 32 });
  }

  async create() {
    const data = await loadAll();
    this.registry.set('data', data);
    this.scene.start('Welcome');
  }
}
