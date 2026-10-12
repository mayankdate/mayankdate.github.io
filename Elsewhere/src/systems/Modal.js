// ---------------------------------------------------------------
// Elsewhere · Modal.js
// ---------------------------------------------------------------
// A DOM overlay (outside the Phaser canvas) that shows the
// contents of whatever the firefly just clicked on.
//
// Markdown is parsed via window.marked (CDN).
// ---------------------------------------------------------------

const root = document.getElementById('modal-root');

export function open(data) {
  root.innerHTML = '';
  root.classList.add('is-open');

  const panel = document.createElement('div');
  panel.className = 'modal-panel';

  const close = document.createElement('button');
  close.className = 'modal-close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '×';
  close.addEventListener('click', hide);
  panel.appendChild(close);

  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = data.title;
  panel.appendChild(title);

  if (data.intro) {
    const intro = document.createElement('div');
    intro.className = 'modal-intro';
    intro.innerHTML = window.marked.parse(data.intro);
    panel.appendChild(intro);
  }

  if (data.shelf) renderList(panel, data.shelf);
  if (data.tracks) renderList(panel, data.tracks);
  if (data.pieces && data.pieces.length) renderGallery(panel, data.pieces);
  if (data.bio) {
    const bio = document.createElement('div');
    bio.className = 'modal-intro';
    bio.innerHTML = window.marked.parse(data.bio);
    panel.appendChild(bio);
  }

  root.appendChild(panel);
  root.addEventListener('click', backdropClose);
  window.addEventListener('keydown', escClose);
}

export function hide() {
  root.classList.remove('is-open');
  root.innerHTML = '';
  root.removeEventListener('click', backdropClose);
  window.removeEventListener('keydown', escClose);
}

function backdropClose(e) {
  if (e.target === root) hide();
}

function escClose(e) {
  if (e.key === 'Escape') hide();
}

function renderList(parent, items) {
  const ul = document.createElement('ul');
  ul.className = 'modal-list';
  for (const item of items) {
    const li = document.createElement('li');
    const h = document.createElement('div');
    h.className = 'modal-item-title';
    h.textContent =
      item.title + (item.author ? ' — ' + item.author
                   : item.artist ? ' — ' + item.artist : '');
    li.appendChild(h);
    if (item.note) {
      const n = document.createElement('div');
      n.className = 'modal-item-note';
      n.innerHTML = window.marked.parse(item.note);
      li.appendChild(n);
    }
    ul.appendChild(li);
  }
  parent.appendChild(ul);
}

function renderGallery(parent, pieces) {
  const grid = document.createElement('div');
  grid.className = 'modal-gallery';
  for (const p of pieces) {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.src = `assets/art/${p.image}`;
    img.alt = p.title;
    fig.appendChild(img);
    const cap = document.createElement('figcaption');
    cap.textContent = p.title;
    fig.appendChild(cap);
    grid.appendChild(fig);
  }
  parent.appendChild(grid);
}
