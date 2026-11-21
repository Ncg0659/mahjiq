import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game, STATUS } from '../src/engine/game.js';
import { TURTLE } from '../src/engine/layouts/turtle.js';
import { generateDeal, verifySolution } from '../src/engine/generator.js';
import { buildFullSet } from '../src/engine/tiles.js';
import { availableMatches } from '../src/engine/board.js';
import { face, at } from './helpers.js';

// Örnek tahta (tek katmanlı sıra + üstte bir taş):
//   z=0:  A B C        (A sol uçta, C sağ uçta, B ortada → kapalı)
//   z=1:      D (B'nin üstünde)
// Uzakta duran serbest bir eş çift: tahtada her zaman en az bir hamle olsun,
// yoksa oyun haklı olarak hemen "hamle kalmadı" durumuna geçer.
const FILLER = () => [at(10, 0, 0, face.chars(9)), at(12, 0, 0, face.chars(9))];

function smallBoard(faces) {
  const [a, b, c, d] = faces;
  return new Game().loadTiles([at(0, 0, 0, a), at(1, 0, 0, b), at(2, 0, 0, c), at(1, 0, 1, d), ...FILLER()]);
}

test('1. Serbest taş seçilebiliyor', () => {
  const g = smallBoard([face.dots(1), face.dots(2), face.dots(3), face.dots(4)]);
  assert.equal(g.isFree(0), true);
  assert.equal(g.tap(0).type, 'select');
  assert.equal(g.selected, 0);
});

test('2. Kapalı taş (iki yanı dolu) seçilemiyor', () => {
  // Üstünde taş olmayan ama iki yanı kapalı orta taş
  const g = new Game().loadTiles([at(0, 0, 0, face.dots(1)), at(1, 0, 0, face.dots(2)), at(2, 0, 0, face.dots(3)), ...FILLER()]);
  assert.equal(g.isFree(1), false);
  assert.equal(g.tap(1).type, 'blocked');
  assert.equal(g.selected, null);
});

test('3. Üzerinde taş bulunan taş seçilemiyor (yanları açık olsa bile)', () => {
  const g = new Game().loadTiles([at(0, 0, 0, face.dots(1)), at(0, 0, 1, face.dots(2)), ...FILLER()]);
  assert.equal(g.isFree(0), false);
  assert.equal(g.tap(0).type, 'blocked');
  // Yarım kaydırılmış üst taş da örter
  const g2 = new Game().loadTiles([at(0, 0, 0, face.dots(1)), { col: 1, row: 1, z: 1, face: face.dots(2) }, ...FILLER()]);
  assert.equal(g2.isFree(0), false);
});

test('4. Aynı tür iki taş eşleşiyor', () => {
  const g = smallBoard([face.bamboo(5), face.dots(1), face.bamboo(5), face.dots(9)]);
  g.tap(0);
  const ev = g.tap(2);
  assert.equal(ev.type, 'match');
  assert.equal(g.tiles[0].removed, true);
  assert.equal(g.tiles[2].removed, true);
});

test('5. Farklı taşlar eşleşmiyor', () => {
  const g = smallBoard([face.bamboo(5), face.dots(1), face.bamboo(6), face.dots(9)]);
  g.tap(0);
  const ev = g.tap(2);
  assert.equal(ev.type, 'mismatch');
  assert.equal(g.tiles[0].removed, false);
  assert.equal(g.tiles[2].removed, false);
  assert.equal(g.selected, 2, 'yanlış eşleşmede yeni dokunulan taş seçili olur');
  // Aynı rakam farklı takım da eşleşmez
  const g2 = smallBoard([face.bamboo(5), face.dots(1), face.dots(5), face.dots(9)]);
  g2.tap(0);
  assert.equal(g2.tap(2).type, 'mismatch');
});

test('6. Çiçek taşları kendi aralarında eşleşiyor, mevsimle eşleşmiyor', () => {
  const g = smallBoard([face.flower(1), face.dots(1), face.flower(3), face.dots(9)]);
  g.tap(0);
  assert.equal(g.tap(2).type, 'match');
  const g2 = smallBoard([face.flower(1), face.dots(1), face.season(1), face.dots(9)]);
  g2.tap(0);
  assert.equal(g2.tap(2).type, 'mismatch');
});

test('7. Mevsim taşları kendi aralarında eşleşiyor', () => {
  const g = smallBoard([face.season(2), face.dots(1), face.season(4), face.dots(9)]);
  g.tap(0);
  assert.equal(g.tap(2).type, 'match');
});

test('8. Eşleşme sonrası diğer taşların serbestliği güncelleniyor', () => {
  // D (üstteki) ile A eşleşir → B'nin üstü açılır ve sol yanı açılır
  const g = smallBoard([face.chars(3), face.dots(1), face.dots(7), face.chars(3)]);
  assert.equal(g.isFree(1), false);
  g.tap(3);
  assert.equal(g.tap(0).type, 'match');
  assert.equal(g.isFree(1), true, 'B artık serbest');
});

test('9. Taş sayısı doğru azalıyor', () => {
  const g = new Game().newGame(123);
  assert.equal(g.remaining, 144);
  const [a, b] = availableMatches(g.tiles, g.neighbors)[0];
  g.tap(a);
  g.tap(b);
  assert.equal(g.remaining, 142);
});

test('10. Bütün taşlar kalkınca oyun kazanılıyor (çözüm yolu ile tam oyun)', () => {
  const g = new Game().newGame(2026);
  let last;
  for (const [a, b] of g.solution) {
    g.tap(a);
    last = g.tap(b);
    assert.equal(last.type, 'match');
  }
  assert.equal(g.remaining, 0);
  assert.equal(g.status, STATUS.WON);
  assert.equal(last.status, STATUS.WON);
  assert.equal(g.tap(0).type, 'ignored', 'oyun bitince dokunuş yok sayılır');
});

test('11. Hamle kalmadığında oyun bunu algılıyor', () => {
  // Kalan iki eş taş üst üste: alttaki asla serbest olmaz
  const g = new Game().loadTiles([
    at(0, 0, 0, face.dots(1)),
    at(0, 0, 1, face.dots(1)),
    at(3, 0, 0, face.dots(2)),
    at(5, 0, 0, face.dots(2)),
  ]);
  assert.equal(g.status, STATUS.PLAYING);
  g.tap(2);
  const ev = g.tap(3);
  assert.equal(ev.type, 'match');
  assert.equal(ev.status, STATUS.STUCK);
  assert.equal(g.matchesAvailable, 0);
  assert.equal(g.remaining, 2);
});

test('12. Yeni oyun önceki oyunu sıfırlıyor', () => {
  const g = new Game().newGame(5);
  const [a, b] = availableMatches(g.tiles, g.neighbors)[0];
  g.tap(a);
  g.tap(b);
  const [c] = availableMatches(g.tiles, g.neighbors)[0];
  g.tap(c);
  assert.equal(g.remaining, 142);
  assert.notEqual(g.selected, null);
  g.newGame(6);
  assert.equal(g.remaining, 144);
  assert.equal(g.selected, null);
  assert.equal(g.status, STATUS.PLAYING);
  assert.ok(g.tiles.every((t) => !t.removed));
});

// ---- Dizilim ve üretici doğruluğu ----

test('Kaplumbağa dizilimi: 144 taş, katmanlar 87/36/16/4/1, çakışma yok', () => {
  const p = TURTLE.positions;
  assert.equal(p.length, 144);
  assert.deepEqual([0, 1, 2, 3, 4].map((z) => p.filter((t) => t.z === z).length), [87, 36, 16, 4, 1]);
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const overlap = p[i].z === p[j].z && Math.abs(p[i].col - p[j].col) < 2 && Math.abs(p[i].row - p[j].row) < 2;
      assert.equal(overlap, false, `çakışma: ${i} ve ${j}`);
    }
  }
  // Her üst katman taşı, altında tamamen desteklenir
  for (const t of p.filter((q) => q.z > 0)) {
    const below = p.filter((q) => q.z === t.z - 1 && Math.abs(q.col - t.col) < 2 && Math.abs(q.row - t.row) < 2);
    assert.ok(below.length > 0, 'havada taş olmamalı');
  }
});

test('Taş seti: 144 taş, 36 eşleşme grubu, her grupta 4 taş, standart dağılım', () => {
  const set = buildFullSet();
  assert.equal(set.length, 144);
  const byKind = {};
  const byKey = {};
  for (const f of set) {
    byKind[f.kind] = (byKind[f.kind] || 0) + 1;
    byKey[f.matchKey] = (byKey[f.matchKey] || 0) + 1;
  }
  assert.deepEqual(byKind, { dots: 36, bamboo: 36, chars: 36, wind: 16, dragon: 12, flower: 4, season: 4 });
  assert.equal(Object.keys(byKey).length, 36);
  assert.ok(Object.values(byKey).every((n) => n === 4));
  // Çiçek ve mevsim taşlarının her biri benzersiz
  assert.equal(new Set(set.filter((f) => f.kind === 'flower').map((f) => f.value)).size, 4);
  assert.equal(new Set(set.filter((f) => f.kind === 'season').map((f) => f.value)).size, 4);
});

test('Çözülebilirlik: 300 farklı dağıtımın her biri algoritmik olarak doğrulanıyor', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const d = generateDeal(TURTLE, seed);
    assert.equal(d.solution.length, 72);
    assert.ok(verifySolution(d.tiles, d.neighbors, d.solution), `seed ${seed}`);
  }
});

test('Aynı seed aynı dağıtımı, farklı seed farklı dağıtımı veriyor', () => {
  const k = (d) => d.tiles.map((t) => t.face.matchKey).join(',');
  assert.equal(k(generateDeal(TURTLE, 77)), k(generateDeal(TURTLE, 77)));
  assert.notEqual(k(generateDeal(TURTLE, 77)), k(generateDeal(TURTLE, 78)));
});

test('Seçili taşa tekrar dokunmak seçimi kaldırıyor', () => {
  const g = smallBoard([face.dots(1), face.dots(2), face.dots(3), face.dots(4)]);
  g.tap(0);
  assert.equal(g.tap(0).type, 'deselect');
  assert.equal(g.selected, null);
});
