// ---------------------------------------------------------------
// Elsewhere · Boot.js
// ---------------------------------------------------------------
// Preloads every texture the world needs, derived from the
// already-loaded YAML (set on the registry in main.js). Then
// starts Island.
// ---------------------------------------------------------------

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const data = this.registry.get('data');
    const tile = (k) => this.load.image(k, `assets/tiles/${k}.png`);
    const spr  = (k) => this.load.image(k, `assets/sprites/${k}.png`);
    const seen = new Set();
    const once = (k, fn) => { if (!seen.has(k)) { seen.add(k); fn(k); } };

    // Floor tiles
    for (const def of Object.values(data.world.legend.floor)) {
      once(def.tile, tile);
    }
    // Object sprites (walls live in tiles/, everything else in sprites/)
    for (const def of Object.values(data.world.legend.objects)) {
      once(def.sprite, def.sprite.startsWith('wall_') ? tile : spr);
    }
    // Furniture
    for (const it of data.interactables) once(it.sprite, spr);
    // Cats
    for (const c of data.cats) once(c.sprite, spr);
    // Fixed sprites
    once('indicator', spr);

    // Player walk sheet
    this.load.spritesheet('player', 'assets/sprites/player.png',
      { frameWidth: 24, frameHeight: 32 });
  }

  create() {
    this.scene.start('Island');
  }
}
