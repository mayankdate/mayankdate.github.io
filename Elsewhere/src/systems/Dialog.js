// ---------------------------------------------------------------
// Elsewhere · Dialog.js
// ---------------------------------------------------------------
// A DOM dialog box at the bottom of the screen. Lines are typed
// out; E or Space advances (and completes a still-typing line
// first). A visible "[E / Space ▸]" prompt makes the control
// obvious. World interactions stay on the mouse — this only
// listens while a dialog is open.
// ---------------------------------------------------------------

const root = document.getElementById('dialog-root');

let state = null;   // { lines, i, onDone, typing, timer }

export function isOpen() {
  return state !== null;
}

export function run(lines, onDone) {
  state = { lines, i: 0, onDone, full: '', shown: 0, timer: null };
  root.classList.add('is-open');
  root.innerHTML = `
    <div class="dialog-box">
      <div class="dialog-speaker"></div>
      <div class="dialog-text"></div>
      <div class="dialog-prompt"><kbd>E</kbd> / <kbd>Space</kbd> ▸</div>
    </div>`;
  root.querySelector('.dialog-box').addEventListener('pointerdown', advance);
  // Capture phase so we run before Phaser's own window keydown listener,
  // which otherwise swallows the event before it reaches us.
  window.addEventListener('keydown', onKey, true);
  showLine();
}

function showLine() {
  const line = state.lines[state.i];
  const box = root.querySelector('.dialog-box');
  const speaker = root.querySelector('.dialog-speaker');
  const text = root.querySelector('.dialog-text');

  speaker.textContent = line.speaker || '';
  speaker.style.display = line.speaker ? 'block' : 'none';
  box.classList.toggle('is-narrator', !line.speaker);

  state.full = line.text;
  state.shown = 0;
  text.textContent = '';
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.shown++;
    text.textContent = state.full.slice(0, state.shown);
    if (state.shown >= state.full.length) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }, 24);
}

function advance() {
  if (!state) return;
  // If still typing, complete the line first.
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
    state.shown = state.full.length;
    root.querySelector('.dialog-text').textContent = state.full;
    return;
  }
  state.i++;
  if (state.i < state.lines.length) {
    showLine();
  } else {
    close();
  }
}

function onKey(e) {
  if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    e.stopPropagation();   // keep these keys away from the game underneath
    advance();
  }
}

function close() {
  const done = state.onDone;
  clearInterval(state.timer);
  window.removeEventListener('keydown', onKey, true);
  root.classList.remove('is-open');
  root.innerHTML = '';
  state = null;
  if (done) done();
}
