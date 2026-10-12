// ---------------------------------------------------------------
// Elsewhere · Interactable.js
// ---------------------------------------------------------------
// A clickable sprite tied to a content key. Click → modal.
// ---------------------------------------------------------------

import * as Modal from '../systems/Modal.js';

export class Interactable {
  constructor(scene, def, tileSize, contentFor) {
    this.def = def;
    const x = (def.tile.x + 0.5) * tileSize;
    const y = (def.tile.y + 0.5) * tileSize;
    this.sprite = scene.add.image(x, y, def.sprite).setDepth(400);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerover', () => this.sprite.setTint(0xffe9a8));
    this.sprite.on('pointerout',  () => this.sprite.clearTint());
    this.sprite.on('pointerdown', () => Modal.open(contentFor(def.content)));
  }
}
