// ---------------------------------------------------------------
// Elsewhere · Walkable.js
// ---------------------------------------------------------------
// Where the firefly is allowed to be. A tile is walkable if it
// sits inside any room's bounds AND there is no wall sprite
// occupying that tile.
// ---------------------------------------------------------------

export function buildWalkable(world) {
  const { width, height } = world.grid;
  const grid = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );

  for (const room of world.rooms) {
    const { x, y, w, h } = room.bounds;
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        if (tx >= 0 && ty >= 0 && tx < width && ty < height) {
          grid[ty][tx] = true;
        }
      }
    }
  }

  for (const wall of world.walls) {
    if (wall.type === 'doorway') continue;        // doorways stay walkable
    if (wall.y >= 0 && wall.y < height && wall.x >= 0 && wall.x < width) {
      grid[wall.y][wall.x] = false;
    }
  }

  return grid;
}

export function isWalkable(grid, tx, ty) {
  const row = grid[ty];
  if (!row) return false;
  return !!row[tx];
}
