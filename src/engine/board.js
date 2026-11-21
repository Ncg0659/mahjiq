// MAHJIQ — Tahta kuralları (saf fonksiyonlar, arayüzden bağımsız)
//
// Taş: { id, col, row, z, face, removed }
// Serbest taş kuralı:
//   1) Üstünde (z+1) onunla çakışan hiçbir taş yok.
//   2) Sol VEYA sağ kenarından en az biri açık
//      (aynı katmanda, tam bitişikte ve dikeyde çakışan taş yok).

import { facesMatch } from './tiles.js';

const W = 2; // taş genişliği (yarım birim)
const H = 2; // taş yüksekliği (yarım birim)

function overlapsVert(a, b) {
  return Math.abs(a.row - b.row) < H;
}

/** b, a'nın üstünde ve onu (kısmen de olsa) örtüyor mu? */
export function covers(b, a) {
  return b.z === a.z + 1 && Math.abs(a.col - b.col) < W && overlapsVert(a, b);
}

export function isLeftNeighbor(b, a) {
  return b.z === a.z && b.col === a.col - W && overlapsVert(a, b);
}

export function isRightNeighbor(b, a) {
  return b.z === a.z && b.col === a.col + W && overlapsVert(a, b);
}

/**
 * Komşuluk tablosunu bir kez hesaplar (dizilim değişmez, yalnızca "removed" değişir).
 * Böylece serbestlik hesabı her hamlede hızlıdır.
 */
export function buildNeighbors(tiles) {
  const n = tiles.map(() => ({ above: [], left: [], right: [] }));
  for (let i = 0; i < tiles.length; i++) {
    for (let j = 0; j < tiles.length; j++) {
      if (i === j) continue;
      const a = tiles[i];
      const b = tiles[j];
      if (covers(b, a)) n[i].above.push(j);
      else if (isLeftNeighbor(b, a)) n[i].left.push(j);
      else if (isRightNeighbor(b, a)) n[i].right.push(j);
    }
  }
  return n;
}

function anyPresent(idxs, tiles) {
  for (const k of idxs) if (!tiles[k].removed) return true;
  return false;
}

/** i numaralı taş serbest (seçilebilir) mi? */
export function isFree(tiles, neighbors, i) {
  const t = tiles[i];
  if (t.removed) return false;
  const nb = neighbors[i];
  if (anyPresent(nb.above, tiles)) return false;
  const leftBlocked = anyPresent(nb.left, tiles);
  const rightBlocked = anyPresent(nb.right, tiles);
  return !(leftBlocked && rightBlocked);
}

/** Tüm serbest taşların indeksleri. */
export function freeIndices(tiles, neighbors) {
  const out = [];
  for (let i = 0; i < tiles.length; i++) if (isFree(tiles, neighbors, i)) out.push(i);
  return out;
}

/** İki taş eşleştirilip kaldırılabilir mi? */
export function canMatch(tiles, neighbors, i, j) {
  if (i === j) return false;
  if (!isFree(tiles, neighbors, i) || !isFree(tiles, neighbors, j)) return false;
  return facesMatch(tiles[i].face, tiles[j].face);
}

/** Şu anda yapılabilecek tüm eşleşmeler: [[i, j], ...] */
export function availableMatches(tiles, neighbors) {
  const free = freeIndices(tiles, neighbors);
  const byKey = new Map();
  for (const i of free) {
    const k = tiles[i].face.matchKey;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(i);
  }
  const pairs = [];
  for (const group of byKey.values()) {
    for (let a = 0; a < group.length; a++) {
      for (let b = a + 1; b < group.length; b++) pairs.push([group[a], group[b]]);
    }
  }
  return pairs;
}

export function remainingCount(tiles) {
  let c = 0;
  for (const t of tiles) if (!t.removed) c++;
  return c;
}
