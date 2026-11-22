// MAHJIQ — İpucu sistemi (saf mantık; DOM yok, oyun durumunu DEĞİŞTİRMEZ)
//
// Motorun mevcut kurallarını yeniden kullanır: isFree, availableMatches (board.js).
// Oyunun kendi taş listesine asla yazmaz; aramayı bir kopya üzerinde yapar.
//
// Algoritma:
//   1) Şu anki serbest ve eşleşebilir çiftleri bul (availableMatches).
//   2) Hiç yoksa: ipucu yok.
//   3) Varsa, mevcut durumdan oyunun SONUNA kadar bir çözüm yolu ara
//      (derinlik öncelikli arama, sınırlı adım bütçesiyle):
//        - "Güvenli hamle" kuralı: bir taş türünün masada kalan bütün taşları
//          şu an serbestse (2 ya da 4 taş), o çifti kaldırmak hiçbir çözümü bozamaz;
//          böyle bir hamle varsa yalnızca o denenir (dallanma yok).
//        - Diğer durumlarda adaylar önce "rehber" sıraya göre denenir: bilinen son
//          çözüm yolunda (oyunun başında: dağıtımı üreten sistemin çözüm yolu)
//          daha erken kalkan taşlar önce. Rehber yoksa / eşitse, kaldırınca en çok
//          taşı serbest bırakan ve en üst katmandaki çiftler önce gelir.
//        - Çözümsüz olduğu kanıtlanan durumlar hatırlanır, tekrar denenmez.
//   4) Çözüm bulunursa ipucu = çözümün İLK hamlesi  → guaranteed: true
//      (bu çifti kaldırdıktan sonra oyun hâlâ bitirilebilir; algoritmik olarak kanıtlı).
//   5) Bütçe dolarsa ya da bu durumdan hiçbir çözüm yoksa (oyuncu daha önce
//      kendini kilitleyecek hamleler yapmışsa) → en iyi sıralı GEÇERLİ çift
//      gösterilir, guaranteed: false (çözüm garantisi iddia edilmez).
//
// Bütçe ADIM sayısıyla sınırlıdır (süreyle değil): böylece aynı durum her cihazda
// aynı ipucunu verir ve hesap hiçbir zaman arayüzü uzun süre kilitlemez.

import { availableMatches } from './board.js';

// 1000 adım: ölçümlerde 800–4000 arası başarıyı neredeyse değiştirmedi (247–248 / 253 çözülebilir durum),
// en kötü süreyi ise bilgisayarda ~234 ms → ~65 ms düşürdü (telefonda yaklaşık 4 katı).
export const DEFAULT_BUDGET = 1000;

/** Durumu kısa bir metne çevirir (hangi taşlar kalktı). Önbellek anahtarı olarak kullanılır. */
export function stateKey(tiles) {
  let s = '';
  for (const t of tiles) s += t.removed ? '1' : '0';
  return s;
}

/** Her taşın engellediği taşlar (ters komşuluk); sıralama puanı için bir kez hesaplanır. */
function buildBlocks(neighbors) {
  const blocks = neighbors.map(() => []);
  neighbors.forEach((nb, i) => {
    for (const j of nb.above) blocks[j].push(i);
    for (const j of nb.left) blocks[j].push(i);
    for (const j of nb.right) blocks[j].push(i);
  });
  return blocks;
}

/** Sıralanmış aday hamleler; "güvenli hamle" varsa yalnız onu döndürür. */
function orderedMoves(work, neighbors, blocks, guide) {
  const pairs = availableMatches(work, neighbors);
  if (pairs.length === 0) return pairs;

  // Güvenli hamle: bir türün masada kalan TÜM taşları serbest
  const remainingByKey = new Map();
  for (const t of work) if (!t.removed) remainingByKey.set(t.face.matchKey, (remainingByKey.get(t.face.matchKey) || 0) + 1);
  const freeByKey = new Map();
  for (const [a, b] of pairs) {
    const k = work[a].face.matchKey;
    if (!freeByKey.has(k)) freeByKey.set(k, new Set());
    freeByKey.get(k).add(a).add(b);
  }
  for (const [a, b] of pairs) {
    const k = work[a].face.matchKey;
    if (freeByKey.get(k).size === remainingByKey.get(k)) return [[a, b]];
  }

  const score = (i) => {
    let s = work[i].z * 3;
    for (const j of blocks[i]) if (!work[j].removed) s += 2;
    return s;
  };
  const rank = (p) => (guide ? Math.max(guide[p[0]] ?? Infinity, guide[p[1]] ?? Infinity) : Infinity);
  return pairs
    .map((p) => ({ p, r: rank(p), s: score(p[0]) + score(p[1]) }))
    .sort((x, y) => (x.r === y.r ? 0 : x.r < y.r ? -1 : 1) || y.s - x.s || x.p[0] - y.p[0] || x.p[1] - y.p[1])
    .map((x) => x.p);
}

class BudgetExceeded extends Error {}

/**
 * Mevcut durumdan oyunun sonuna kadar bir çözüm arar.
 * @returns {{ solution: number[][]|null, exhausted: boolean, nodes: number }}
 *   solution: bulunan hamle listesi; null ise bulunamadı
 *   exhausted: true → arama tamamlandı (bu durumdan çözüm YOK);
 *              false → bütçe doldu (bilinmiyor)
 */
export function solveFrom(tiles, neighbors, budget = DEFAULT_BUDGET, { guide = null, failed = new Set() } = {}) {
  const work = tiles.map((t) => ({ ...t })); // kopya: oyunun kendi durumuna dokunulmaz
  const blocks = buildBlocks(neighbors);
  let nodes = 0;
  let remaining = work.reduce((n, t) => n + (t.removed ? 0 : 1), 0);

  const dfs = () => {
    if (remaining === 0) return [];
    const key = stateKey(work);
    if (failed.has(key)) return null;
    if (++nodes > budget) throw new BudgetExceeded();
    for (const [a, b] of orderedMoves(work, neighbors, blocks, guide)) {
      work[a].removed = true;
      work[b].removed = true;
      remaining -= 2;
      const rest = dfs();
      work[a].removed = false;
      work[b].removed = false;
      remaining += 2;
      if (rest) return [[a, b], ...rest];
    }
    failed.add(key);
    return null;
  };

  try {
    const solution = dfs();
    return { solution, exhausted: solution === null, nodes };
  } catch (e) {
    if (e instanceof BudgetExceeded) return { solution: null, exhausted: false, nodes };
    throw e;
  }
}

/**
 * İpucu üretir. Oyun durumunu değiştirmez.
 * @returns {{ pair: [number, number], guaranteed: boolean, nodes: number } | null}
 *   null → şu anda eşleştirilebilecek taş yok (ya da oyun bitti).
 */
export function findHint(tiles, neighbors, { budget = DEFAULT_BUDGET, guide = null, failed } = {}) {
  const pairs = availableMatches(tiles, neighbors);
  if (pairs.length === 0) return null;

  const { solution, nodes } = solveFrom(tiles, neighbors, budget, { guide, failed });
  if (solution && solution.length > 0) {
    return { pair: sortPair(solution[0]), guaranteed: true, nodes, solution };
  }
  // Çözüm bulunamadı (bütçe doldu ya da bu durumdan çözüm yok): geçerli en iyi çift
  const work = tiles.map((t) => ({ ...t }));
  const best = orderedMoves(work, neighbors, buildBlocks(neighbors), guide)[0];
  return { pair: sortPair(best), guaranteed: false, nodes, solution: null };
}

/** Bir çözüm yolunu "taş → kaçıncı hamlede kalkıyor" dizisine çevirir (rehber). */
export function guideFromSolution(solution, size) {
  const g = new Array(size).fill(Infinity);
  if (solution) solution.forEach(([a, b], k) => { g[a] = k; g[b] = k; });
  return g;
}

function sortPair([a, b]) {
  return a < b ? [a, b] : [b, a];
}

/**
 * Bir oyun boyunca kullanılan ipucu yardımcısı.
 *  - Aynı durumda tekrar istenirse aynı çifti döndürür.
 *  - Bulduğu son çözüm yolunu rehber olarak saklar (sonraki ipuçları hızlı ve tutarlı olur).
 *  - Çözümsüz olduğu kanıtlanan durumları oyun boyunca hatırlar.
 * reset(solution): yeni oyunda çağrılır; dağıtımın kendi çözüm yolu ilk rehber olur.
 */
export function createHinter({ budget = DEFAULT_BUDGET } = {}) {
  let lastKey = null;
  let last = null;
  let guide = null;
  let failed = new Set();
  return {
    hint(tiles, neighbors) {
      const key = stateKey(tiles);
      if (key !== lastKey) {
        last = findHint(tiles, neighbors, { budget, guide, failed });
        if (last && last.solution) guide = guideFromSolution(last.solution, tiles.length);
        lastKey = key;
      }
      return last && { pair: [...last.pair], guaranteed: last.guaranteed, nodes: last.nodes };
    },
    reset(solution = null, size = 0) {
      lastKey = null;
      last = null;
      failed = new Set();
      guide = solution ? guideFromSolution(solution, size) : null;
    },
  };
}
