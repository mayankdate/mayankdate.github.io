// ---------------------------------------------------------------
// Elsewhere · Interactable.js
// ---------------------------------------------------------------
// A clickable piece of furniture. To make clickability obvious
// for non-gamers it carries a gently bobbing gold indicator and
// shows its label on hover. Click (mouse) → content modal.
// Its tile is blocked so you walk up to it rather than onto it.
// ---------------------------------------------------------------

import * as Modal from '../systems/Modal.js';

export class Interactable {
  constructor(scene, def, tilemap, contentFor) {
    this.scene = scene;
    this.def = def;
    const T = tilemap.T;

    const x = (def.tile.x + 0.5) * T;
    const footY = (def.tile.y + 1) * T;

    this.sprite = scene.add.image(x, footY, def.sprite).setOrigin(0.5, 1);
    this.sprite.setDepth((def.tile.y + 1) * T);
    this.sprite.setInteractive({ useHandCursor: true });

    tilemap.block(def.tile.x, def.tile.y);

    // Bobbing indicator floats above the object.
    const top = footY - this.sprite.height;
    this.indicator = scene.add.image(x, top - 6, 'indicator')
      .setDepth(9000);
    scene.tweens.add({
      targets: this.indicator,
      y: top - 12,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Hover label (Phaser text, world-space above the object).
    this.label = scene.add.text(x, top - 24, def.label, {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px', color: '#F5EBD6',
      backgroundColor: '#0D2545', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(9001).setAlpha(0);

    this.sprite.on('pointerover', () => {
      this.sprite.setTint(0xffe9a8);
      this.label.setAlpha(1);
    });
    this.sprite.on('pointerout', () => {
      this.sprite.clearTint();
      this.label.setAlpha(0);
    });
    this.sprite.on('pointerdown', () => {
      if (scene.inputLocked) return;
      Modal.open(contentFor(def.content));
    });
  }
}
