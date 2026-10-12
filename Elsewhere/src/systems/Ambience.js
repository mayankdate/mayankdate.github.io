// ---------------------------------------------------------------
// Elsewhere · Ambience.js
// ---------------------------------------------------------------
// Synthesized ambience — no audio files needed. Each named layer
// (rain / fire / birds / thunder) is built from Web Audio, plus a
// screen-space visual overlay. Toggle layers on/off; they mix.
// Every layer is a swap-point: later you can replace its sound
// with a real file and keep the same on/off API.
//
// resume() must be called from a user gesture (the Load clone
// click) or the browser keeps audio suspended.
// ---------------------------------------------------------------

let actx = null, master = null;
const layers = {};          // name -> { gain, on, sources, timer }
let fireOn = false;
let rainParticles = [];
let flash = 0;
let weather = 'clear';
// Four skies the windows cycle through. Each names the audio layers it mixes.
const WEATHER = {
  clear:  ['birds'],            // sunny, birdsong
  rain:   ['rain'],             // overcast, raining
  storm:  ['rain', 'thunder'],  // dark, lightning + thunder
  cloudy: [],                   // calm overcast, quiet
};

function ac() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = 0.5;
    master.connect(actx.destination);
  }
  return actx;
}
export function resume() { try { ac(); if (actx.state === 'suspended') actx.resume(); } catch (_) {} }

function noise(a) {
  const len = a.sampleRate * 2;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function layer(name) {
  if (layers[name]) return layers[name];
  const a = ac();
  const g = a.createGain(); g.gain.value = 0; g.connect(master);
  const L = { gain: g, on: false, sources: [], timer: null };
  layers[name] = L;

  if (name === 'rain') {
    const s = a.createBufferSource(); s.buffer = noise(a); s.loop = true;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.5;
    s.connect(f); f.connect(g); s.start(); L.sources.push(s);
  } else if (name === 'fire') {
    const s = a.createBufferSource(); s.buffer = noise(a); s.loop = true;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    s.connect(f); f.connect(g); s.start(); L.sources.push(s);
    L.timer = setInterval(() => { if (L.on) crackle(g); }, 200);
  } else if (name === 'birds') {
    L.timer = setInterval(() => { if (L.on && Math.random() < 0.55) chirp(g); }, 850);
  } else if (name === 'thunder') {
    L.timer = setInterval(() => { if (L.on && Math.random() < 0.28) { rumble(g); flash = 1; } }, 3200);
  }
  return L;
}

function crackle(g) {
  const a = ac(), t = a.currentTime;
  const s = a.createBufferSource(); s.buffer = noise(a);
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1600;
  const cg = a.createGain(); cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  s.connect(f); f.connect(cg); cg.connect(g); s.start(t); s.stop(t + 0.1);
}
function chirp(g) {
  const a = ac(), t = a.currentTime;
  const o = a.createOscillator(); o.type = 'sine';
  const cg = a.createGain(); cg.gain.value = 0;
  const base = 2600 + Math.random() * 1300;
  o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base + 500, t + 0.07);
  cg.gain.linearRampToValueAtTime(0.16, t + 0.02); cg.gain.linearRampToValueAtTime(0, t + 0.13);
  o.connect(cg); cg.connect(g); o.start(t); o.stop(t + 0.15);
}
function rumble(g) {
  const a = ac(), t = a.currentTime;
  const s = a.createBufferSource(); s.buffer = noise(a);
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170;
  const cg = a.createGain(); cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime(0.7, t + 0.12);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  s.connect(f); f.connect(cg); cg.connect(g); s.start(t); s.stop(t + 1.8);
}

export function set(name, on, vol = 0.32) {
  const L = layer(name); L.on = on;
  const a = ac();
  L.gain.gain.cancelScheduledValues(a.currentTime);
  L.gain.gain.linearRampToValueAtTime(on ? vol : 0, a.currentTime + 0.4);
}

export function oneShot(name) {
  if (name !== 'whirr') return;
  const a = ac(), t = a.currentTime;
  const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 72;
  const nz = a.createBufferSource(); nz.buffer = noise(a); nz.loop = true;
  const nf = a.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 800;
  const g = a.createGain(); g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.1);
  g.gain.setValueAtTime(0.16, t + 1.3);
  g.gain.linearRampToValueAtTime(0, t + 1.55);
  o.connect(g); nz.connect(nf); nf.connect(g); g.connect(master);
  o.start(t); nz.start(t); o.stop(t + 1.6); nz.stop(t + 1.6);
}

export function cycleWeather(list) {
  const i = list.indexOf(weather);
  weather = list[(i + 1) % list.length];
  for (const n of ['rain', 'birds', 'thunder']) set(n, (WEATHER[weather] || []).includes(n));
  return weather;
}
export function currentWeather() { return weather; }
export function flashLevel() { return flash; }        // lightning, 1 → 0, for the windows to mirror
// start (or re-apply) the current weather's audio layers — called once audio is unlocked
export function applyWeather() { for (const n of ['rain', 'birds', 'thunder']) set(n, (WEATHER[weather] || []).includes(n)); }

export function toggleFire() { fireOn = !fireOn; set('fire', fireOn, 0.3); return fireOn; }
export function isFireOn() { return fireOn; }

// Screen-space visual overlay for the active layers.
export function drawOverlay(ctx, w, h, dt, now) {
  const rainOn = layers.rain && layers.rain.on;
  if (rainOn) {
    if (!rainParticles.length)
      for (let i = 0; i < 230; i++)
        rainParticles.push({ x: Math.random() * w, y: Math.random() * h, s: 320 + Math.random() * 320, l: 9 + Math.random() * 12 });
    ctx.strokeStyle = 'rgba(185,205,235,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const p of rainParticles) {
      p.y += p.s * dt; p.x += p.s * dt * 0.18;
      if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y + p.l);
    }
    ctx.stroke();
  } else if (rainParticles.length) rainParticles = [];

  if (layers.thunder && layers.thunder.on) { ctx.fillStyle = 'rgba(18,22,40,0.3)'; ctx.fillRect(0, 0, w, h); }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.5})`; ctx.fillRect(0, 0, w, h); flash = Math.max(0, flash - dt * 2.5); }

  if (fireOn) {
    const a = 0.1 + 0.05 * Math.sin(now / 90) + 0.03 * Math.random();
    const g = ctx.createRadialGradient(w / 2, h * 0.82, h * 0.08, w / 2, h * 0.6, h * 0.95);
    g.addColorStop(0, `rgba(255,140,55,${a})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
}
