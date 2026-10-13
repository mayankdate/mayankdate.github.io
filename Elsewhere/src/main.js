// ---------------------------------------------------------------
// Elsewhere · main.js
// ---------------------------------------------------------------
// Runs the game on the CabinEngine + scene, and wires together the
// three modular systems: Sprites (animation), Interactions (effect
// runner), Ambience (synth audio + overlays). The engine draws the
// static world; this drives the player, cats, props, camera, and
// turns an E / Space press into a sequence of effects.
// ---------------------------------------------------------------

import { loadAll } from './systems/Config.js';
import * as Dialog from './systems/Dialog.js';
import * as Modal from './systems/Modal.js';
import * as Ambience from './systems/Ambience.js';
import * as Interactions from './systems/Interactions.js';
import { Animator, loadImage } from './systems/Sprites.js';

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
let walkEnabled = false, busy = false, nearby = null, last = 0;
let cloneShown = false;   // hidden until the intro drop starts

const modalOpen = () => modalRoot.classList.contains('is-open');
const byId = (id) => scene.objects.find(o => o.id === id);

// Nearest interactable within reach — but you can't reach a station
// from behind it. Cats are pettable from any side.
function findInteraction() {
  let best = null, bestD = Infinity;
  for (const o of scene.objects) {
    if (!o.interaction) continue;
    let r = o.collisionRect;
    if (!r && o.parent) { const par = byId(o.parent); r = par && par.collisionRect; }
    if (!r) r = o.visualBounds;
    if (!r) continue;
    const d = E.distanceRect(player.x, player.y, r);
    if (d >= 2) continue;
    if (o.category !== 'cat' && player.y < r[1] - 0.05) continue;   // no reaching through the back
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

// ================= sprites =================
const SPR = {};
let playerAnim = null, playerFacing = 'down';
function buildSprites(data) {
  for (const key in data.sprites) {
    const d = data.sprites[key];
    if (d && d.sheet) SPR[key] = { def: d, img: loadImage(d.sheet) };
  }
  const catDef = data.sprites.cat;
  for (const c of data.cats) if (c.sheet) SPR['cat_' + c.id] = { def: catDef, img: loadImage(c.sheet) };
  if (SPR.player) playerAnim = new Animator(data.sprites.player);
}

// ================= animated accents =================
// Looping sprites pinned on top of a station (flame, spinning record).
// Same draw path as a spawned prop, but persistent and some are toggled.
const accents = [];
function buildAccents(data) {
  for (const a of (data.accents || [])) {
    const reg = SPR[a.ref]; if (!reg) continue;
    const d = reg.def, [ax, ay] = a.at, w = d.draw.w, h = d.draw.h;
    const part = { kind: 'sprite', img: reg.img, flip: false, collision: false,
      rect: [ax - w / 2, ay - h, w, h], sx: 0, sy: 0, sw: d.frameW, sh: d.frameH };
    const obj = { id: a.id, category: 'accent', visualBounds: [ax - w / 2, ay - h, w, h],
      shapes: [], collisionRect: null, physicalHeight: 0, baseFloorLevel: 2,
      sortY: a.sortY ?? ay, parent: null, parts: [part] };
    const rec = { def: a, obj, part, anim: new Animator(d), visible: false };
    accents.push(rec);
    if (!a.visibleWhen) setAccent(a.id, true);   // always-on starts visible
  }
}
function setAccent(id, on) {
  const a = accents.find(x => x.def.id === id); if (!a || on === a.visible) return;
  a.visible = on;
  if (on) { a.anim.play(a.def.anim, performance.now()); scene.objects.push(a.obj); }
  else { const i = scene.objects.indexOf(a.obj); if (i >= 0) scene.objects.splice(i, 1); }
}

// ================= hand-drawn map layers =================
const MAP = { ground: null, images: {} };
function buildMap(data) {
  if (data.map && data.map.ground) MAP.ground = loadImage(data.map.ground);
  const objs = (data.map && data.map.objects) || {};
  for (const id in objs) MAP.images[id] = loadImage(objs[id]);
}

// ================= weather sky (one shared animated layer) =================
// The sky is a single layer: it fills the backdrop behind the island and
// the windows are transparent cutouts onto this same layer. The engine
// paints the backdrop; here we just animate the current weather's frames
// and hand the frame rect to the engine. Window frame+ledge PNGs are plain
// image swaps on the window objects.
let skyAnim = null;
function buildSky(data) {
  if (SPR.sky) skyAnim = new Animator(data.sprites.sky);
  for (const o of scene.objects)
    if (o.category === 'mounted' && /window/.test(o.id))
      MAP.images[o.id] = loadImage(`assets/sprites/${o.id}_frame.png`);
}
// the current sky frame rect (source), updated each frame by the loop
let skyRect = [0, 0, 256, 256];
function skyFrame(r, dpr) {
  if (!SPR.sky) return null;
  return { img: SPR.sky.img, sx: skyRect[0], sy: skyRect[1], sw: skyRect[2], sh: skyRect[3],
           dpr, screenW: r.width, screenH: r.height };
}

// ================= cats =================
let cats = [];
function onLevel(x, y, lvl) {
  const s = E.surfaceAt(scene, x, y);
  return !!s && !s.stairs && Math.abs(s.level - lvl) < 0.01;
}
class CatNPC {
  constructor(def, data) {
    this.def = def;
    this.x = def.spawn.x; this.y = def.spawn.y;
    this.level = def.level ?? 2;
    this.target = { x: this.x, y: this.y };
    this.pauseUntil = 0; this.restPose = 'idle'; this.flip = false;
    const reg = SPR['cat_' + def.id];
    const cd = data.sprites.cat;
    this.w = reg ? cd.draw.w : 1.4;
    this.h = reg ? cd.draw.h : 1.1;
    let part;
    if (reg) {
      this.anim = new Animator(cd);
      part = { kind: 'sprite', img: reg.img, sx: 0, sy: 0, sw: cd.frameW, sh: cd.frameH,
               flip: false, collision: false, rect: [this.x - this.w / 2, this.y - this.h, this.w, this.h] };
    } else {
      part = { kind: 'cat', rect: [this.x - 0.6, this.y - 1.0, 1.2, 1.0],
               color: def.color, dark: def.dark, flip: false, collision: false };
    }
    this.obj = {
      id: 'cat_' + def.id, label: def.name, category: 'cat',
      visualBounds: [this.x - this.w / 2, this.y - this.h, this.w, this.h],
      shapes: [], collisionRect: null, physicalHeight: 0, baseFloorLevel: this.level,
      sortY: this.y, parent: null, parts: [part], interaction: { label: def.name },
    };
    scene.objects.push(this.obj);
    this.pick();
  }
  pickRest() {
    const w = this.def.rest || { idle: 1 };
    const ents = Object.entries(w); let total = ents.reduce((s, [, v]) => s + v, 0) || 1;
    let r = Math.random() * total;
    for (const [k, v] of ents) if ((r -= v) <= 0) return k;
    return 'idle';
  }
  pick() {
    const z = this.def.zone, temp = this.def.temperament || 'neutral';
    const near = Math.hypot(player.x - this.x, player.y - this.y) < 6;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    for (let i = 0; i < 30; i++) {
      let tx, ty;
      if (temp === 'avoid' && near) {
        // flee to the zone corner farthest from the player
        const cs = [[z.x, z.y], [z.x + z.w, z.y], [z.x, z.y + z.h], [z.x + z.w, z.y + z.h]];
        cs.sort((a, b) => Math.hypot(b[0] - player.x, b[1] - player.y) - Math.hypot(a[0] - player.x, a[1] - player.y));
        tx = clamp(cs[0][0] + (Math.random() * 2 - 1), z.x, z.x + z.w);
        ty = clamp(cs[0][1] + (Math.random() * 2 - 1), z.y, z.y + z.h);
      } else if (temp === 'approach' && near && Math.random() < 0.7) {
        // drift toward the player (and rub against them)
        tx = clamp(player.x + (Math.random() * 3 - 1.5), z.x, z.x + z.w);
        ty = clamp(player.y + (Math.random() * 3 - 1.5), z.y, z.y + z.h);
      } else {
        tx = z.x + Math.random() * z.w; ty = z.y + Math.random() * z.h;
      }
      if (onLevel(tx, ty, this.level)) { this.target.x = tx; this.target.y = ty; return; }
    }
  }
  update(dt, now) {
    let moving = false;
    if (now >= this.pauseUntil) {
      const dxx = this.target.x - this.x, dyy = this.target.y - this.y, d = Math.hypot(dxx, dyy);
      if (d < 0.12) { this.pauseUntil = now + 1400 + Math.random() * 3600; this.restPose = this.pickRest(); this.pick(); }
      else {
        const step = Math.min(d, (this.def.speed ?? 1.2) * dt);
        const nx = this.x + dxx / d * step, ny = this.y + dyy / d * step;
        if (onLevel(nx, ny, this.level)) { this.flip = dxx < 0; this.x = nx; this.y = ny; moving = true; }
        else this.pick();
      }
    }
    const state = moving ? 'walk' : (this.restPose || 'idle');
    const p = this.obj.parts[0];
    this.obj.sortY = this.y;
    if (this.anim) {
      this.anim.play(state, now);
      const rr = this.anim.rect(now);
      p.sx = rr[0]; p.sy = rr[1]; p.sw = rr[2]; p.sh = rr[3]; p.flip = this.flip;
      p.rect = [this.x - this.w / 2, this.y - this.h, this.w, this.h];
      this.obj.visualBounds = p.rect;
    } else {
      p.rect = [this.x - 0.6, this.y - 1.0, 1.2, 1.0]; p.flip = this.flip;
      this.obj.visualBounds = [this.x - 0.6, this.y - 1.0, 1.2, 1.1];
    }
  }
}

// ================= props (spawn / despawn) =================
const spawned = {};
function spawn(def) {
  const reg = SPR[def.ref]; if (!reg) return;
  const d = reg.def, [ax, ay] = def.at, w = d.draw.w, h = d.draw.h;
  const part = { kind: 'sprite', img: reg.img, flip: false, collision: false,
    rect: [ax - w / 2, ay - h, w, h],
    sx: (def.frame || 0) * d.frameW, sy: 0, sw: d.frameW, sh: d.frameH };
  if (def.anim && d.anims && d.anims[def.anim]) { part._anim = new Animator(d); part._anim.play(def.anim, performance.now()); }
  const obj = { id: def.id, category: 'prop', visualBounds: [ax - w / 2, ay - h, w, h],
    shapes: [], collisionRect: null, physicalHeight: 0, baseFloorLevel: 2,
    sortY: def.sortY || ay, parent: null, parts: [part] };
  scene.objects.push(obj); spawned[def.id] = obj;
}
function despawn(id) {
  const o = spawned[id]; if (!o) return;
  const i = scene.objects.indexOf(o); if (i >= 0) scene.objects.splice(i, 1);
  delete spawned[id];
}

// ================= interaction environment =================
let data = null;
function makeEnv() {
  return {
    openModal: (key) => Modal.open(data.content[key]),
    dialog: (lines) => new Promise(res => Dialog.run(lines.map(t => typeof t === 'string' ? { text: t } : t), res)),
    ambience: Ambience,
    spawn, despawn,
    toggleFire: () => { const on = Ambience.toggleFire(); setAccent('fireplace_flame', on); },
    cycleWeather: (list) => Ambience.cycleWeather(list),
    serveSushi: async (envRef) => {
      const s = data.sushi[Math.floor(Math.random() * data.sushi.length)];
      spawn({ ref: 'sushi', id: '_sushi', at: [player.x + 0.1, player.y - 0.05], frame: s.frame, sortY: player.y + 0.6 });
      await env.dialog([`You grab the ${s.name}.`, s.line]);
      despawn('_sushi');
    },
  };
}
let env = null;

async function interact(obj) {
  if (busy) return;
  if (obj.category === 'cat') {
    const c = cats.find(c => c.obj.id === obj.id);
    if (c) Dialog.run([{ speaker: c.def.name, text: c.def.bio }], null);
    return;
  }
  const cfg = data.interactions[obj.id];
  busy = true;
  try {
    if (cfg && cfg.effects) await Interactions.run(cfg.effects, env);
    else await env.dialog([(obj.interaction && obj.interaction.text) || obj.label]);
  } finally { busy = false; }
}

// ================= boot =================
data = await loadAll();
buildSprites(data);
buildMap(data);
buildSky(data);
buildAccents(data);
env = makeEnv();

// attach / override interaction labels from the config (incl. the window)
for (const id in data.interactions) {
  const o = byId(id);
  if (o) { o.interaction = o.interaction || {}; o.interaction.label = data.interactions[id].label || o.interaction.label || id; }
}
cats = data.cats.map(d => new CatNPC(d, data));

const splash = document.getElementById('splash');
splash.querySelector('#splash-greeting').innerHTML = data.intro.splash.greeting.map(p => `<p>${p}</p>`).join('');
const btn = splash.querySelector('#load-clone');
btn.textContent = data.intro.splash.button;

requestAnimationFrame(loop);

btn.addEventListener('click', async () => {
  Ambience.resume();                       // audio needs a user gesture
  Ambience.setSounds(data.sounds || {});    // register any audio files from sounds.yaml
  Ambience.applyWeather();                  // start the default (cloudy) ambience
  btn.disabled = true; splash.classList.add('is-loading');
  const bar = splash.querySelector('#clone-bar-fill');
  bar.style.transition = 'width 1.8s cubic-bezier(.4,.1,.3,1)';
  requestAnimationFrame(() => { bar.style.width = '100%'; });
  await new Promise(r => setTimeout(r, 1900));
  splash.classList.add('is-gone');
  setTimeout(() => { splash.style.display = 'none'; dropClone(); }, 600);
});

function dropClone() {
  const fromY = scene.spawn.y - 7;
  player.x = scene.spawn.x; player.y = fromY;
  cloneShown = true;
  const t0 = performance.now(), dur = 950;
  (function step(now) {
    const k = Math.min(1, (now - t0) / dur);
    player.y = fromY + 7 * bounceOut(k);
    if (k < 1) requestAnimationFrame(step);
    else { player.y = scene.spawn.y; Dialog.run(data.intro.dialog, () => {
      walkEnabled = true;
      document.getElementById('zoom-hud').classList.add('is-visible');
      document.getElementById('hint').classList.add('is-visible');
      const tc = document.getElementById('touch-controls'); if (tc) tc.classList.add('is-live');
    }); }
  })(t0);
}
function bounceOut(x) {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}

// ================= input =================
const MOVE = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (MOVE.includes(k)) { keys.add(k); if (walkEnabled) e.preventDefault(); return; }
  if (k === 'e' || k === ' ') {
    if (Dialog.isOpen() || modalOpen() || !walkEnabled || busy) return;
    e.preventDefault();
    if (nearby) interact(nearby);
  }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

const hud = document.getElementById('zoom-hud');
hud.querySelector('[data-zoom="in"]').onclick = () => setZoom(zoom + ZOOM_STEP);
hud.querySelector('[data-zoom="out"]').onclick = () => setZoom(zoom - ZOOM_STEP);
canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)); }, { passive: false });
function setZoom(z) { zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)); }

// ================= touch controls (mobile) =================
// A floating joystick on the left half drives analog movement; the
// right-hand button taps an interaction. The button just synthesizes an
// E keypress, so every existing E path (interact, advance dialog) works.
const touch = { x: 0, y: 0 };
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) {
  document.body.classList.add('is-touch');
  const tc = document.getElementById('touch-controls');
  const joy = document.getElementById('joystick');
  const thumb = document.getElementById('joystick-thumb');
  const btnA = document.getElementById('btn-a');
  const R = 54, DEAD = 0.14;           // joystick radius (px) + dead-zone
  let joyId = null, cx = 0, cy = 0;

  const fromA = (t) => btnA.contains(document.elementFromPoint(t.clientX, t.clientY));

  canvas.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (joyId !== null || fromA(t)) continue;
      if (t.clientX > innerWidth * 0.62) continue;   // right side is for looking + the A button
      joyId = t.identifier; cx = t.clientX; cy = t.clientY;
      joy.style.left = cx + 'px'; joy.style.top = cy + 'px';
      thumb.style.transform = 'translate(0,0)';
      joy.classList.add('is-active');
    }
  }, { passive: true });

  const moveJoy = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      let ox = t.clientX - cx, oy = t.clientY - cy;
      const d = Math.hypot(ox, oy) || 1, cl = Math.min(d, R);
      ox = ox / d * cl; oy = oy / d * cl;
      thumb.style.transform = `translate(${ox}px,${oy}px)`;
      const mag = cl / R, nx = ox / R, ny = oy / R;
      touch.x = mag < DEAD ? 0 : nx; touch.y = mag < DEAD ? 0 : ny;
    }
  };
  window.addEventListener('touchmove', moveJoy, { passive: true });

  const endJoy = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      joyId = null; touch.x = 0; touch.y = 0;
      joy.classList.remove('is-active');
    }
  };
  window.addEventListener('touchend', endJoy, { passive: true });
  window.addEventListener('touchcancel', endJoy, { passive: true });

  // the interact button = a synthetic E press (reuses all existing E logic);
  // debounce so touchstart + the synthesized click don't fire twice.
  let lastA = 0;
  const tapA = (e) => {
    e.preventDefault();
    const now = performance.now(); if (now - lastA < 350) return; lastA = now;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
  };
  btnA.addEventListener('touchstart', tapA, { passive: false });
  btnA.addEventListener('click', tapA);

  // expose so the loop can reveal controls + pulse the button when near something
  window.__touchUI = { tc, btnA };
}

function updatePrompt() {
  const ready = walkEnabled && nearby && !busy && !Dialog.isOpen() && !modalOpen();
  if (ready) {
    promptEl.innerHTML = `<kbd>E</kbd> ${escapeHtml(nearby.interaction.label)}`;
    promptEl.hidden = false;
  } else promptEl.hidden = true;
  if (window.__touchUI) window.__touchUI.btnA.classList.toggle('is-ready', !!ready);
}
const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ================= loop =================
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.05); last = t;

  let dx = 0, dy = 0;
  if (walkEnabled && !Dialog.isOpen() && !modalOpen()) {
    if (keys.has('w') || keys.has('arrowup')) dy--;
    if (keys.has('s') || keys.has('arrowdown')) dy++;
    if (keys.has('a') || keys.has('arrowleft')) dx--;
    if (keys.has('d') || keys.has('arrowright')) dx++;
    const len = Math.hypot(dx, dy);
    if (len) { dx /= len; dy /= len; }                 // keyboard → unit direction
    if (touch.x || touch.y) { dx = touch.x; dy = touch.y; }   // joystick → analog (overrides)
    if (dx || dy) E.movePlayer(scene, player, dx * scene.spawn.speed * dt, dy * scene.spawn.speed * dt);
  }

  // player animation
  if (dx || dy) { if (Math.abs(dx) > Math.abs(dy)) playerFacing = dx < 0 ? 'left' : 'right'; else playerFacing = dy < 0 ? 'up' : 'down'; }
  if (playerAnim) playerAnim.play((dx || dy ? 'walk_' : 'idle_') + playerFacing, t);

  for (const c of cats) c.update(dt, t);
  for (const id in spawned) { const p = spawned[id].parts[0]; if (p._anim) { const rr = p._anim.rect(t); p.sx = rr[0]; p.sy = rr[1]; p.sw = rr[2]; p.sh = rr[3]; } }
  for (const a of accents) if (a.visible) { const rr = a.anim.rect(t); a.part.sx = rr[0]; a.part.sy = rr[1]; a.part.sw = rr[2]; a.part.sh = rr[3]; }
  if (skyAnim) { skyAnim.play(Ambience.currentWeather(), t); skyRect = skyAnim.rect(t); }

  // hold the camera on the landing spot until the clone has landed
  const tx = walkEnabled ? player.x : scene.spawn.x, ty = (walkEnabled ? player.y : scene.spawn.y) - 1.2;
  cam.x += (tx - cam.x) * Math.min(1, dt * 8);
  cam.y += (ty - cam.y) * Math.min(1, dt * 8);

  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Screen-space weather backdrop — the one sky layer. The windows cut
  // onto this exact layer (engine, screen-space) so there's only one sky.
  const sky = skyFrame(r, dpr);
  if (sky && (sky.img.complete && sky.img.naturalWidth)) ctx.drawImage(sky.img, sky.sx, sky.sy, sky.sw, sky.sh, 0, 0, r.width, r.height);
  else { ctx.fillStyle = scene.palette.void; ctx.fillRect(0, 0, r.width, r.height); }

  let playerSprite = null;
  if (SPR.player && playerAnim) {
    const pd = data.sprites.player, rr = playerAnim.rect(t);
    playerSprite = { img: SPR.player.img, sx: rr[0], sy: rr[1], sw: rr[2], sh: rr[3], flip: false, w: pd.draw.w, h: pd.draw.h };
  }

  ctx.save();
  ctx.translate(r.width / 2, r.height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cam.x, -cam.y);
  E.drawScene(ctx, scene, { time: t, player, walking: !!(dx || dy), cutaway: true, details: true, playerSprite, hidePlayer: !cloneShown, ground: MAP.ground, images: MAP.images, sky });
  ctx.restore();

  Ambience.drawOverlay(ctx, r.width, r.height, dt, t);

  nearby = walkEnabled ? findInteraction() : null;
  updatePrompt();

  requestAnimationFrame(loop);
}
