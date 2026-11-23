// MAHJIQ — İpucu sistemi testleri (Aşama 3.1)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game, STATUS } from '../src/engine/game.js';
import { TURTLE } from '../src/engine/layouts/turtle.js';
import { generateDeal } from '../src/engine/generator.js';
import { availableMatches, isFree } from '../src/engine/board.js';
import { findHint, createHinter, solveFrom, stateKey, DEFAULT_BUDGET } from '../src/engine/hint.js';
import { mulberry32 } from '../src/engine/rng.js';
import { face, at } from './helpers.js';

const snapshot = (g) => JSON.stringify({ tiles: g.tiles, selected: g.selected, status: g.status, remaining: g.remaining });

/** Bir oyunu rastgele hamlelerle oyun ortasına getirir (farklı oyun durumları için). */
function midGame(seed, steps) {
  const g = new Game().newGame(seed);
  const rng = mulberry32(seed * 7 + steps);
  for (let k = 0; k < steps; k++) {
    const m = availableMatches(g.tiles, g.neighbors);
    if (!m.length) break;
    const [a, b] = m[Math.floor(rng() * m.length)];
    g.tap(a);
    g.tap(b);
  }
  return g;
}

test('İpucu 1: yeni oyunda ipucu bir çift döndürüyor (oyundaki gibi: dağıtımın çözüm yolu rehber)', () => {
  for (const seed of [11, 12, 13, 14, 15]) {
    const g = new Game().newGame(seed);
    const hinter = createHinter();
    hinter.reset(g.solution, g.tiles.length);
    const h = hinter.hint(g.tiles, g.neighbors);
    assert.ok(h && Array.isArray(h.pair) && h.pair.length === 2);
    assert.equal(h.guaranteed, true, 'yeni oyunda çözüm yolu bulunmalı');
    // Rehbersiz çağrı da (bütçe yetmese bile) her zaman geçerli bir çift verir
    const raw = findHint(g.tiles, g.neighbors);
    assert.equal(g.tiles[raw.pair[0]].face.matchKey, g.tiles[raw.pair[1]].face.matchKey);
  }
});

test('İpucu 2-4: yalnızca serbest taşlar, geçerli eşleşme; kapalı taş asla önerilmiyor (60 farklı durum)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    for (const steps of [0, 15, 40]) {
      const g = midGame(seed, steps);
      const h = findHint(g.tiles, g.neighbors);
      if (!h) {
        assert.equal(availableMatches(g.tiles, g.neighbors).length, 0);
        continue;
      }
      const [a, b] = h.pair;
      assert.notEqual(a, b);
      assert.ok(isFree(g.tiles, g.neighbors, a) && isFree(g.tiles, g.neighbors, b), `seed ${seed}/${steps}: taşlar serbest olmalı`);
      assert.equal(g.tiles[a].face.matchKey, g.tiles[b].face.matchKey, 'çift aynı türden olmalı');
      assert.ok(!g.tiles[a].removed && !g.tiles[b].removed);
    }
  }
});

test('İpucu 4: üstü kapalı ve iki yanı kapalı taşlar önerilmiyor (elle kurulmuş tahta)', () => {
  // Eş taşlar: A (üstü kapalı) — B (iki yanı kapalı) — C ve D serbest
  const g = new Game().loadTiles([
    at(0, 0, 0, face.dots(1)), at(0, 0, 1, face.dots(9)), // A, üstünde taş
    at(4, 0, 0, face.dots(5)), at(5, 0, 0, face.dots(1)), at(6, 0, 0, face.dots(5)), // B ortada, iki yanı dolu
    at(10, 0, 0, face.dots(1)), at(13, 0, 0, face.dots(1)), // C, D serbest
    at(16, 0, 0, face.dots(9)), at(19, 0, 0, face.dots(5)), at(22, 0, 0, face.dots(5)),
  ]);
  const h = findHint(g.tiles, g.neighbors);
  for (const id of h.pair) assert.ok(isFree(g.tiles, g.neighbors, id));
  assert.ok(!h.pair.includes(0) && !h.pair.includes(3), 'kapalı taşlar önerilmemeli');
});

test('İpucu 5-6: ipucu istemek taş sayısını ve oyun durumunu değiştirmiyor', () => {
  const g = midGame(5, 10);
  g.tap(availableMatches(g.tiles, g.neighbors)[0][0]); // bir taş seçili olsun
  const before = snapshot(g);
  const hinter = createHinter();
  hinter.reset(g.solution, g.tiles.length);
  for (let i = 0; i < 3; i++) {
    findHint(g.tiles, g.neighbors);
    hinter.hint(g.tiles, g.neighbors);
  }
  assert.equal(snapshot(g), before);
});

test('İpucu 7: aynı durumda tekrar istendiğinde aynı çift', () => {
  for (const [seed, steps] of [[3, 0], [8, 20], [13, 45]]) {
    const g = midGame(seed, steps);
    const a = findHint(g.tiles, g.neighbors);
    const b = findHint(g.tiles, g.neighbors);
    assert.deepEqual(a && a.pair, b && b.pair, 'saf fonksiyon belirlenimli olmalı');
    const hinter = createHinter();
    hinter.reset(g.solution, g.tiles.length);
    const c = hinter.hint(g.tiles, g.neighbors);
    const d = hinter.hint(g.tiles, g.neighbors);
    assert.deepEqual(c && c.pair, d && d.pair, 'önbellekli yardımcı aynı çifti vermeli');
  }
});

test('İpucu 11: hiç hamle yokken hata yok, null dönüyor', () => {
  const g = new Game().loadTiles([at(0, 0, 0, face.dots(1)), at(0, 0, 1, face.dots(1))]);
  assert.equal(g.status, STATUS.STUCK);
  assert.doesNotThrow(() => findHint(g.tiles, g.neighbors));
  assert.equal(findHint(g.tiles, g.neighbors), null);
  const hinter = createHinter();
  assert.equal(hinter.hint(g.tiles, g.neighbors), null);
});

test('İpucu 12: oyun bitince ipucu yeni hamle üretmiyor', () => {
  const g = new Game().newGame(21);
  for (const [a, b] of g.solution) { g.tap(a); g.tap(b); }
  assert.equal(g.status, STATUS.WON);
  assert.equal(findHint(g.tiles, g.neighbors), null);
});

test('İpucu algoritması: yalnız ipuçlarını izleyen oyuncu her oyunu bitiriyor (100 oyun, hepsi kanıtlı)', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const d = generateDeal(TURTLE, seed);
    const hinter = createHinter();
    hinter.reset(d.solution, d.tiles.length);
    let h;
    while ((h = hinter.hint(d.tiles, d.neighbors))) {
      assert.equal(h.guaranteed, true, `seed ${seed}: ipucu kanıtlı olmalı`);
      d.tiles[h.pair[0]].removed = true;
      d.tiles[h.pair[1]].removed = true;
    }
    assert.ok(d.tiles.every((t) => t.removed), `seed ${seed}: oyun bitmeli`);
  }
});

test('İpucu algoritması: "kanıtlı" denen ipucundan sonra oyun gerçekten bitirilebilir (oyun ortası durumlar)', () => {
  let checked = 0;
  for (let seed = 30; seed < 70; seed++) {
    const g = midGame(seed, 12);
    const h = findHint(g.tiles, g.neighbors);
    if (!h || !h.guaranteed) continue;
    const work = g.tiles.map((t) => ({ ...t }));
    work[h.pair[0]].removed = true;
    work[h.pair[1]].removed = true;
    const r = solveFrom(work, g.neighbors, 200000);
    assert.ok(r.solution, `seed ${seed}: kanıtlı ipucundan sonra çözüm olmalı`);
    checked++;
  }
  assert.ok(checked >= 20, `yeterli sayıda durum denenmeli (${checked})`);
});

test('İpucu algoritması: çözümsüz durumda bile geçerli bir çift gösteriyor ama garanti iddia etmiyor', () => {
  // A1 A1 yan yana serbest, B1 B1 üst üste (alttaki asla açılmaz) → bu durumdan çözüm yok
  const g = new Game().loadTiles([
    at(0, 0, 0, face.dots(2)), at(0, 0, 1, face.dots(2)),
    at(4, 0, 0, face.bamboo(3)), at(7, 0, 0, face.bamboo(3)),
  ]);
  const h = findHint(g.tiles, g.neighbors);
  assert.deepEqual(h.pair, [2, 3]);
  assert.equal(h.guaranteed, false);
});

test('İpucu performansı: oyun ortası durumlarda adım bütçesi aşılmıyor ve hızlı', () => {
  let worst = 0;
  for (let seed = 100; seed < 160; seed++) {
    const g = midGame(seed, 25);
    const t0 = performance.now();
    const h = findHint(g.tiles, g.neighbors);
    worst = Math.max(worst, performance.now() - t0);
    if (h) assert.ok(h.nodes <= DEFAULT_BUDGET + 1);
  }
  assert.ok(worst < 500, `en kötü süre ${worst.toFixed(1)} ms`);
});

test('stateKey yalnızca kalkan taşlara bağlı', () => {
  const g = new Game().newGame(4);
  const k1 = stateKey(g.tiles);
  g.tap(availableMatches(g.tiles, g.neighbors)[0][0]); // seçim durumu anahtarı değiştirmez
  assert.equal(stateKey(g.tiles), k1);
});
