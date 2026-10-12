// ---------------------------------------------------------------
// Elsewhere · main.js
// ---------------------------------------------------------------
// Runs the game on Mayank's CabinEngine + scene (window.CabinEngine,
// window.CABIN_SCENE). No Phaser. Responsibilities:
//   · a follow-camera with zoom over the pre-projected cabin scene
//   · WASD / arrow movement via the engine's collision + levels
//   · proximity interaction: E / Space on the nearest station
//   · the splash → "Load clone" → clone-drop → bioprinter dialog flow
// Walls occlude by foot-depth (sortY) and ghost-fade when you're
// behind them — both already handled inside the engine's drawScene.
// ---------------------------------------------------------------

import { loadAll } from './systems/Config.js';
import * as Dialog from './systems/Dialog.js';
import * as Modal from './systems/Modal.js';

const E = window.CabinEngine;
const scene = window.CABIN_SCENE;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const modalRoot = document.getElementById('modal-root');
const promptEl = document.getElementById('walk-prompt');

const MIN_ZOOM = 20, MAX_ZOOM = 72, ZOOM_STEP = 4;
let zoom = 40;

const player = { x: scene.spawn.x, y: scene.spawn.y };
const cam = { x: player.x, y: player.y - 1.2 };
const keys = new Set();
let walkEnabled = false;
let nearby = null;
let last = 0;
let data = null;

const modalOpen = () => modalRoot.classList.contains('is-open');

// ---- load content + paint the splash -------------------------------
data = await loadAll();

const splash = document.getElementById('splash');
splash.querySelector('#splash-greeting').innerHTML =
  data.intro.splash.greeting.map(p => `<p>${p}</p>`).join('');
const btn = splash.querySelector('#load-clone');
btn.textContent = data.intro.splash.button;

requestAnimationFrame(loop);   // render behind the opaque splash

// ---- "Load clone" → progress → fade → clone-drop -------------------
btn.addEventListener('click', async () => {
  btn.disabled = true;
  splash.classList.add('is-loading');
  const bar = splash.querySelector('#clone-bar-fill');
  bar.style.transition = 'width 1.8s cubic-bezier(.4,.1,.3,1)';
  requestAnimationFrame(() => { bar.style.width = '100%'; });
  await new Promise(r => setTimeout(r, 1900));
  splash.classList.add('is-gone');
  setTimeout(() => { splash.style.display = 'none'; dropClone(); }, 600);
});

function dropClone() {
  const fromY = scene.spawn.y - 7;
  player.x = scene.spawn.x;
  player.y = fromY;
  const t0 = performance.now(), dur = 950;
  (function step(now) {
    const k = Math.min(1, (now - t0) / dur);
    player.y = fromY + 7 * bounceOut(k);
    if (k < 1) requestAnimationFrame(step);
    else { player.y = scene.spawn.y; runIntroDialog(); }
  })(t0);
}

function runIntroDialog() {
  Dialog.run(data.intro.dialog, () => {
    walkEnabled = true;
    document.getElementById('zoom-hud').classList.add('is-visible');
    document.getElementById('hint').classList.add('is-visible');
  });
}

function bounceOut(x) {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}

// ---- interaction ---------------------------------------------------
function interact(obj) {
  const map = data.interactions[obj.id];
  if (map && map.content) { Modal.open(data.content[map.content]); return; }
  if (map && map.dialog) { Dialog.run(map.dialog.map(t => ({ text: t })), null); return; }
  const text = (obj.interaction && obj.interaction.text) || obj.label;
  Dialog.run([{ text }], null);
}

function updatePrompt() {
  if (walkEnabled && nearby && !Dialog.isOpen() && !modalOpen()) {
    promptEl.innerHTML = `<kbd>E</kbd> ${escapeHtml(nearby.interaction.label)}`;
    promptEl.hidden = false;
  } else {
    promptEl.hidden = true;
  }
}
const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---- input ---------------------------------------------------------
const MOVE = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (MOVE.includes(k)) { keys.add(k); if (walkEnabled) e.preventDefault(); return; }
  if (k === 'e' || k === ' ') {
    if (Dialog.isOpen() || modalOpen() || !walkEnabled) return;  // dialog has its own handler
    e.preventDefault();
    if (nearby) interact(nearby);
  }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

// zoom
const hud = document.getElementById('zoom-hud');
hud.querySelector('[data-zoom="in"]').onclick = () => setZoom(zoom + ZOOM_STEP);
hud.querySelector('[data-zoom="out"]').onclick = () => setZoom(zoom - ZOOM_STEP);
canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)); }, { passive: false });
function setZoom(z) { zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)); }

// ---- loop ----------------------------------------------------------
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.05); last = t;

  let dx = 0, dy = 0;
  if (walkEnabled && !Dialog.isOpen() && !modalOpen()) {
    if (keys.has('w') || keys.has('arrowup')) dy--;
    if (keys.has('s') || keys.has('arrowdown')) dy++;
    if (keys.has('a') || keys.has('arrowleft')) dx--;
    if (keys.has('d') || keys.has('arrowright')) dx++;
    const len = Math.hypot(dx, dy);
    if (len) E.movePlayer(scene, player, dx / len * scene.spawn.speed * dt, dy / len * scene.spawn.speed * dt);
  }

  // camera eases toward the player
  const tx = player.x, ty = player.y - 1.2;
  cam.x += (tx - cam.x) * Math.min(1, dt * 8);
  cam.y += (ty - cam.y) * Math.min(1, dt * 8);

  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = scene.palette.void;
  ctx.fillRect(0, 0, r.width, r.height);

  ctx.save();
  ctx.translate(r.width / 2, r.height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cam.x, -cam.y);
  E.drawScene(ctx, scene, { time: t, player, walking: !!(dx || dy), cutaway: true, details: true });
  ctx.restore();

  nearby = walkEnabled ? E.nearestInteraction(scene, player) : null;
  updatePrompt();

  requestAnimationFrame(loop);
}
