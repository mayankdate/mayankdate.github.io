// ---------------------------------------------------------------
// Elsewhere · Config.js
// ---------------------------------------------------------------
// Loads the content + intro + interaction-map YAML.
// The world geometry itself comes from scene.js (window.CABIN_SCENE),
// not from here.
// ---------------------------------------------------------------

export async function loadYaml(path) {
  const res = await fetch(path);
  const text = await res.text();
  return window.jsyaml.load(text);
}

export async function loadAll() {
  const names = ['intro', 'interactions', 'cats', 'sprites', 'accents', 'sushi', 'sounds', 'map', 'books', 'music', 'games', 'art'];
  const loaded = await Promise.all(names.map(n => loadYaml(`config/${n}.yaml`)));
  const d = {};
  names.forEach((n, i) => { d[n] = loaded[i]; });
  d.content = { books: d.books, music: d.music, games: d.games, art: d.art };
  return d;
}
