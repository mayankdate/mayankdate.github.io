// ---------------------------------------------------------------
// AfterHours · Modal.js
// ---------------------------------------------------------------
// The content overlay. One renderer per content shape:
//   · shelf   → list (books)
//   · embeds  → Spotify iframes (music)
//   · games   → grid of cover art
//   · pieces  → framed artwork gallery (art)
//   · bio     → plain markdown (cats)
// Markdown via window.marked.
// ---------------------------------------------------------------

const root = document.getElementById('modal-root');

export function open(data) {
  if (!data) return;
  root.innerHTML = '';
  root.classList.add('is-open');

  const panel = el('div', 'modal-panel');

  const close = el('button', 'modal-close');
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '×';
  close.addEventListener('click', hide);
  panel.appendChild(close);

  if (data.title) panel.appendChild(el('h2', 'modal-title', data.title));
  if (data.intro) {
    const intro = el('div', 'modal-intro');
    intro.innerHTML = window.marked.parse(data.intro);
    panel.appendChild(intro);
  }

  if (data.embeds) renderEmbeds(panel, data.embeds);
  if (data.shelf) renderList(panel, data.shelf);
  if (data.games) renderGames(panel, data.games);
  if (data.pieces) renderGallery(panel, data.pieces);
  if (data.bio) {
    const bio = el('div', 'modal-intro');
    bio.innerHTML = window.marked.parse(data.bio);
    panel.appendChild(bio);
  }

  root.appendChild(panel);
  root.addEventListener('click', backdrop);
  window.addEventListener('keydown', esc);
}

export function hide() {
  root.classList.remove('is-open');
  root.innerHTML = '';
  root.removeEventListener('click', backdrop);
  window.removeEventListener('keydown', esc);
}

function backdrop(e) { if (e.target === root) hide(); }
function esc(e) { if (e.key === 'Escape') hide(); }

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function renderEmbeds(parent, embeds) {
  for (const em of embeds) {
    if (em.label) parent.appendChild(el('div', 'modal-sublabel', em.label));
    const frame = document.createElement('iframe');
    frame.className = 'modal-spotify';
    frame.src = em.url;
    frame.loading = 'lazy';
    frame.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture';
    frame.setAttribute('frameborder', '0');
    parent.appendChild(frame);
  }
}

function renderList(parent, items) {
  const ul = el('ul', 'modal-list');
  for (const item of items) {
    const li = document.createElement('li');
    const by = item.author || item.artist;
    li.appendChild(el('div', 'modal-item-title',
      item.title + (by ? ' — ' + by : '')));
    if (item.note) {
      const n = el('div', 'modal-item-note');
      n.innerHTML = window.marked.parse(item.note);
      li.appendChild(n);
    }
    ul.appendChild(li);
  }
  parent.appendChild(ul);
}

function renderGames(parent, games) {
  const grid = el('div', 'modal-covers');
  for (const g of games) {
    const card = el('div', 'cover-card');
    if (g.cover) {
      const img = document.createElement('img');
      img.src = `assets/covers/${g.cover}`;
      img.alt = g.title;
      card.appendChild(img);
    }
    card.appendChild(el('div', 'cover-title', g.title));
    if (g.note) {
      const n = el('div', 'cover-note');
      n.innerHTML = window.marked.parse(g.note);
      card.appendChild(n);
    }
    grid.appendChild(card);
  }
  parent.appendChild(grid);
}

function renderGallery(parent, pieces) {
  if (!pieces.length) {
    parent.appendChild(el('p', 'modal-empty',
      'Nothing framed yet — paintings go here.'));
    return;
  }
  const grid = el('div', 'modal-gallery');
  for (const p of pieces) {
    const fig = document.createElement('figure');
    if (p.image) {
      const img = document.createElement('img');
      img.src = `assets/art/${p.image}`;
      img.alt = p.title;
      fig.appendChild(img);
    }
    const cap = document.createElement('figcaption');
    cap.textContent = p.title + (p.note ? ' — ' + p.note : '');
    fig.appendChild(cap);
    grid.appendChild(fig);
  }
  parent.appendChild(grid);
}
