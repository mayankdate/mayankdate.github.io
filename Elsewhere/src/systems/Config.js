// ---------------------------------------------------------------
// Elsewhere · Config.js
// ---------------------------------------------------------------
// Fetches YAML files and parses them with js-yaml (loaded via
// CDN in index.html, exposed as window.jsyaml).
// ---------------------------------------------------------------

export async function loadYaml(path) {
  const res = await fetch(path);
  const text = await res.text();
  return window.jsyaml.load(text);
}

export async function loadAll() {
  const [world, interactables, cats, books, music, games, art, mayank] =
    await Promise.all([
      loadYaml('config/world.yaml'),
      loadYaml('config/interactables.yaml'),
      loadYaml('config/cats.yaml'),
      loadYaml('config/books.yaml'),
      loadYaml('config/music.yaml'),
      loadYaml('config/games.yaml'),
      loadYaml('config/art.yaml'),
      loadYaml('config/mayank.yaml'),
    ]);
  return {
    world,
    interactables,
    cats,
    content: { books, music, games, art, mayank },
  };
}
