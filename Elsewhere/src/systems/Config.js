// ---------------------------------------------------------------
// Elsewhere · Config.js
// ---------------------------------------------------------------
// Loads every YAML config and parses it with js-yaml
// (window.jsyaml, from the CDN script in index.html).
// ---------------------------------------------------------------

export async function loadYaml(path) {
  const res = await fetch(path);
  const text = await res.text();
  return window.jsyaml.load(text);
}

export async function loadAll() {
  const names = [
    'world', 'interactables', 'cats',
    'books', 'music', 'games', 'art', 'intro',
  ];
  const loaded = await Promise.all(
    names.map(n => loadYaml(`config/${n}.yaml`))
  );
  const data = {};
  names.forEach((n, i) => { data[n] = loaded[i]; });

  data.content = {
    books: data.books,
    music: data.music,
    games: data.games,
    art: data.art,
  };
  return data;
}
