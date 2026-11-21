// MAHJIQ — Çözülebilir dağıtım üretici
//
// Yöntem ("ileri simülasyonla yerleştirme"):
//   1) Dizilimin bütün pozisyonları dolu kabul edilir (yüzler henüz yok).
//   2) O anda serbest olan pozisyonlardan rastgele iki tanesi seçilip "kaldırılır".
//      Bu, gerçek oyundaki bir hamleyle birebir aynıdır.
//   3) Tahta boşalana kadar tekrarlanır; çıkan sıra bir ÇÖZÜM YOLUDUR.
//   4) Her kaldırılan pozisyon çiftine, karıştırılmış taş çiftlerinden biri atanır.
//   5) Sonra çözüm yolu, gerçek oyun kurallarıyla (isFree + canMatch) baştan
//      oynatılarak doğrulanır. Doğrulama geçmezse dağıtım reddedilir.
// Böylece her dağıtımın en az bir çözümü olduğu algoritmik olarak garanti edilir.
// (Oyuncunun yanlış sırayla oynayıp kendini kilitlemesi yine mümkündür — bu,
//  Mahjong Solitaire'in doğasıdır.)

import { buildPairs, shuffle } from './tiles.js';
import { buildNeighbors, isFree, canMatch, remainingCount } from './board.js';
import { mulberry32 } from './rng.js';

const MAX_ATTEMPTS = 200;

function emptyTiles(positions) {
  return positions.map((p, id) => ({ id, col: p.col, row: p.row, z: p.z, face: null, removed: false }));
}

/** Boş tahtada rastgele serbest çiftler kaldırarak bir çözüm sırası bulur. */
function findRemovalOrder(positions, neighbors, rng) {
  const tiles = emptyTiles(positions);
  const order = [];
  while (order.length * 2 < tiles.length) {
    const free = [];
    for (let i = 0; i < tiles.length; i++) if (isFree(tiles, neighbors, i)) free.push(i);
    if (free.length < 2) return null; // tıkandı → yeniden dene
    const a = free[Math.floor(rng() * free.length)];
    let b = a;
    while (b === a) b = free[Math.floor(rng() * free.length)];
    tiles[a].removed = true;
    tiles[b].removed = true;
    order.push([a, b]);
  }
  return order;
}

/** Bir çözüm yolunu gerçek oyun kurallarıyla oynatarak doğrular. */
export function verifySolution(tiles, neighbors, order) {
  const work = tiles.map((t) => ({ ...t, removed: false }));
  for (const [a, b] of order) {
    if (!canMatch(work, neighbors, a, b)) return false;
    work[a].removed = true;
    work[b].removed = true;
  }
  return remainingCount(work) === 0;
}

/**
 * Yeni, çözülebilir bir dağıtım üretir.
 * @returns {{ tiles, neighbors, solution, seed }}
 */
export function generateDeal(layout, seed) {
  const rng = mulberry32(seed);
  const positions = layout.positions;
  if (positions.length % 2 !== 0) throw new Error('Dizilimde çift sayıda pozisyon olmalı');
  const neighbors = buildNeighbors(emptyTiles(positions));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const order = findRemovalOrder(positions, neighbors, rng);
    if (!order) continue;
    const pairs = shuffle(buildPairs(rng), rng);
    if (pairs.length !== order.length) throw new Error('Taş sayısı dizilimle uyuşmuyor');
    const tiles = emptyTiles(positions);
    order.forEach(([a, b], k) => {
      const [fa, fb] = rng() < 0.5 ? pairs[k] : [pairs[k][1], pairs[k][0]];
      tiles[a].face = fa;
      tiles[b].face = fb;
    });
    if (verifySolution(tiles, neighbors, order)) {
      return { tiles, neighbors, solution: order, seed };
    }
  }
  throw new Error('Çözülebilir dağıtım üretilemedi');
}
