// ---------------------------------------------------------------
// Elsewhere · main.js
// ---------------------------------------------------------------
// Phaser bootstrap. Three scenes in order: Boot → Welcome →
// Island.
// ---------------------------------------------------------------

import { Boot } from './scenes/Boot.js';
import { Welcome } from './scenes/Welcome.js';
import { Island } from './scenes/Island.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#0D2545',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  scene: [Boot, Welcome, Island],
});
