// ---------------------------------------------------------------
// Elsewhere · main.js
// ---------------------------------------------------------------
// 1. Load all YAML up front.
// 2. Paint the DOM splash (greeting + "Load clone").
// 3. On click: run the clone-spin progress while Phaser boots
//    behind the curtain; when both are done, fade the splash and
//    drop the clone into the world.
// ---------------------------------------------------------------

import { loadAll } from './systems/Config.js';
import { Boot } from './scenes/Boot.js';
import { Island } from './scenes/Island.js';

window.Elsewhere = window.Elsewhere || {};
window.Elsewhere.ready = new Promise((resolve) => {
  window.Elsewhere._onReady = resolve;
});

const data = await loadAll();

// --- paint the splash from intro.yaml
const splash = document.getElementById('splash');
const intro = data.intro;
splash.querySelector('#splash-greeting').innerHTML =
  intro.splash.greeting.map(p => `<p>${p}</p>`).join('');
const btn = splash.querySelector('#load-clone');
btn.textContent = intro.splash.button;

// --- create the game (curtained behind the opaque splash)
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#13263f',
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [Boot, Island],
  callbacks: {
    preBoot: (game) => game.registry.set('data', data),
  },
});

// --- "Load clone" → progress, then reveal
btn.addEventListener('click', async () => {
  btn.disabled = true;
  splash.classList.add('is-loading');

  const progress = new Promise((resolve) => {
    const bar = splash.querySelector('#clone-bar-fill');
    bar.style.transition = 'width 1.8s cubic-bezier(.4,.1,.3,1)';
    requestAnimationFrame(() => { bar.style.width = '100%'; });
    setTimeout(resolve, 1900);
  });

  await Promise.all([progress, window.Elsewhere.ready]);

  splash.classList.add('is-gone');
  setTimeout(() => {
    splash.style.display = 'none';
    window.Elsewhere.playIntro();
  }, 600);
});
