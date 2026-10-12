// ---------------------------------------------------------------
// Elsewhere · Island.js
// ---------------------------------------------------------------
// Builds the world, places everything, runs the camera + zoom,
// and plays the "clone falls in" intro. Player control is locked
// until the intro dialog is dismissed (E / Space).
// ---------------------------------------------------------------

import { TileMap } from '../systems/TileMap.js';
import { Player } from '../entities/Player.js';
import { Cat } from '../entities/Cat.js';
import { Interactable } from '../entities/Interactable.js';
import * as Dialog from '../systems/Dialog.js';

const MIN_ZOOM = 1.6;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.3;

export class Island extends Phaser.Scene {
  constructor() { super('Island'); }

  create() {
    const data = this.registry.get('data');
    this.data = data;
    this.inputLocked = true;        // locked until intro dialog is dismissed

    // --- world
    this.map = new TileMap(this, data.world);
    this.map.build();
    const W = this.map.pixelWidth, H = this.map.pixelHeight;
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor('#13263f');

    // --- cats
    this.cats = data.cats.map(c => new Cat(this, c, this.map));

    // --- interactables
    const contentFor = (key) => data.content[key];
    for (const def of data.interactables) {
      new Interactable(this, def, this.map, contentFor);
    }

    // --- player (created at spawn, repositioned for the drop)
    const T = this.map.T;
    this.spawnX = (data.world.spawn.x + 0.5) * T;
    this.spawnY = (data.world.spawn.y + 1) * T;
    this.player = new Player(this, this.spawnX, this.spawnY, this.map);
    this.player.sprite.setVisible(false);

    // --- camera: centre on spawn for the intro
    this.zoom = Phaser.Math.Clamp(2.4, MIN_ZOOM, MAX_ZOOM);
    this.cameras.main.setZoom(this.zoom);
    this.cameras.main.centerOn(this.spawnX, this.spawnY - 40);

    this.setupZoom();

    // --- expose to the splash so it can trigger the reveal
    window.Elsewhere = window.Elsewhere || {};
    window.Elsewhere.playIntro = () => this.playIntro();
    if (window.Elsewhere._onReady) window.Elsewhere._onReady();
  }

  // Called by the splash once the "Load clone" progress finishes.
  playIntro() {
    const p = this.player.sprite;
    p.setVisible(true).setAlpha(1);
    p.y = this.spawnY - 340;
    p.setDepth(99999);

    // Shadow that grows as the clone nears the ground.
    const shadow = this.add.ellipse(this.spawnX, this.spawnY - 2, 6, 3, 0x000000, 0.35)
      .setDepth(this.spawnY - 1);

    this.tweens.add({
      targets: shadow, scaleX: 3, scaleY: 3,
      duration: 1000, ease: 'Quad.easeIn',
    });
    this.tweens.add({
      targets: p, y: this.spawnY,
      duration: 1000, ease: 'Bounce.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: p, scaleY: { from: 1, to: 0.78 },
          duration: 130, yoyo: true, ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: shadow, alpha: 0, duration: 250,
          onComplete: () => shadow.destroy(),
        });
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.time.delayedCall(350, () => this.runIntroDialog());
      },
    });
  }

  runIntroDialog() {
    const lines = this.data.intro.dialog;
    Dialog.run(lines, () => {
      this.inputLocked = false;
      document.getElementById('zoom-hud').classList.add('is-visible');
    });
  }

  setupZoom() {
    this.input.keyboard.on('keydown-PLUS',   () => this.setZoom(this.zoom + ZOOM_STEP));
    this.input.keyboard.on('keydown-EQUALS', () => this.setZoom(this.zoom + ZOOM_STEP));
    this.input.keyboard.on('keydown-MINUS',  () => this.setZoom(this.zoom - ZOOM_STEP));
    this.input.on('wheel', (_p, _o, _dx, dy) => {
      this.setZoom(this.zoom + (dy < 0 ? ZOOM_STEP : -ZOOM_STEP));
    });

    const hud = document.getElementById('zoom-hud');
    hud.querySelector('[data-zoom="in"]').onclick  = () => this.setZoom(this.zoom + ZOOM_STEP);
    hud.querySelector('[data-zoom="out"]').onclick = () => this.setZoom(this.zoom - ZOOM_STEP);
    this.events.once('shutdown', () => hud.classList.remove('is-visible'));
  }

  setZoom(z) {
    this.zoom = Phaser.Math.Clamp(z, MIN_ZOOM, MAX_ZOOM);
    this.cameras.main.setZoom(this.zoom);
  }

  update(_now, dt) {
    this.player.update(dt);
    const now = this.time.now;
    for (const c of this.cats) c.update(now, dt);
  }
}
