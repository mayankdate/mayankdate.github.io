// ---------------------------------------------------------------
// Elsewhere · Config.js
// ---------------------------------------------------------------
// Loads the content + intro + interaction-map YAML.
// The world geometry itself comes from scene.js (window.CABIN_SCENE),
// not from here.
// ---------------------------------------------------------------

export async function loadYaml(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
  const text = await res.text();
  try {
    return window.jsyaml.load(text);
  } catch (e) {
    // Name the file: these YAML files are hand-edited, and js-yaml's own
    // message only carries the line, not which file it came from.
    throw new Error(`${path}: ${e.message}`);
  }
}

// Core files must parse for the world to run. Content files only fill the
// modals you open at a station, so a typo in one degrades to an empty
// panel instead of a blank cabin.
const CORE = ['intro', 'interactions', 'cats', 'sprites', 'accents', 'sushi', 'sounds', 'map'];
const CONTENT = ['books', 'music', 'games', 'art'];

export async function loadAll() {
  const d = {};
  await Promise.all(CORE.map(async n => { d[n] = await loadYaml(`config/${n}.yaml`); }));
  await Promise.all(CONTENT.map(async n => {
    try { d[n] = await loadYaml(`config/${n}.yaml`); }
    catch (e) { console.error(`[Config] ${e.message} — that panel will be empty`); d[n] = null; }
  }));
  d.content = { books: d.books, music: d.music, games: d.games, art: d.art };
  return d;
}
