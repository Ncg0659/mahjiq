// MAHJIQ — Klasik Kaplumbağa (Turtle) dizilimi, 144 pozisyon
//
// Koordinatlar "yarım taş" biriminde tamsayıdır:
//   col : yatay (1 taş genişliği = 2 birim)
//   row : dikey  (1 taş yüksekliği = 2 birim)
//   z   : katman (0 = en alt)
// Bir taş [col, col+2) × [row, row+2) alanını kaplar.
// Yarım birim sayesinde uçtaki taşlar ve tepedeki taş iki sıranın ortasına oturur.

function rowOf(z, y, xFrom, xTo) {
  const out = [];
  for (let x = xFrom; x <= xTo; x++) out.push({ col: x * 2, row: y * 2, z });
  return out;
}

function grid(z, xFrom, xTo, yFrom, yTo) {
  const out = [];
  for (let y = yFrom; y <= yTo; y++) out.push(...rowOf(z, y, xFrom, xTo));
  return out;
}

export function turtleLayout() {
  const p = [];
  // Katman 0 — 87 taş
  p.push(...rowOf(0, 0, 1, 12)); // 12
  p.push(...rowOf(0, 1, 3, 10)); // 8
  p.push(...rowOf(0, 2, 2, 11)); // 10
  p.push(...rowOf(0, 3, 1, 12)); // 12
  p.push(...rowOf(0, 4, 1, 12)); // 12
  p.push(...rowOf(0, 5, 2, 11)); // 10
  p.push(...rowOf(0, 6, 3, 10)); // 8
  p.push(...rowOf(0, 7, 1, 12)); // 12
  p.push({ col: 0, row: 7, z: 0 }); // sol uç (kafa) — iki sıranın ortası
  p.push({ col: 26, row: 7, z: 0 }); // sağ uç (kuyruk 1)
  p.push({ col: 28, row: 7, z: 0 }); // sağ uç (kuyruk 2)
  // Katman 1 — 6×6 = 36
  p.push(...grid(1, 4, 9, 1, 6));
  // Katman 2 — 4×4 = 16
  p.push(...grid(2, 5, 8, 2, 5));
  // Katman 3 — 2×2 = 4
  p.push(...grid(3, 6, 7, 3, 4));
  // Katman 4 — tepe taşı, 4 taşın ortasında
  p.push({ col: 13, row: 7, z: 4 });
  return p;
}

export const TURTLE = Object.freeze({
  id: 'turtle',
  name: 'Kaplumbağa',
  positions: Object.freeze(turtleLayout().map(Object.freeze)),
});
