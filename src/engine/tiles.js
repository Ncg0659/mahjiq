// MAHJIQ — Taş seti (144 taş, standart dağılım)
//
// Her taşın bir "face" (yüz) bilgisi var:
//   { kind, value, matchKey, label }
//   kind     : 'dots' | 'bamboo' | 'chars' | 'wind' | 'dragon' | 'flower' | 'season'
//   value    : türün içindeki değer (1-9, 'E', 'red', 1-4 ...)
//   matchKey : eşleşme anahtarı. İki taş, matchKey'leri aynıysa eşleşir.
//              Çiçekler kendi aralarında ('flower'), mevsimler kendi aralarında ('season') eşleşir.
//   label    : Türkçe okunabilir ad (erişilebilirlik ve testler için)

export const SUITS = [
  { kind: 'dots', name: 'Daire' },
  { kind: 'bamboo', name: 'Bambu' },
  { kind: 'chars', name: 'Karakter' },
];

export const WINDS = [
  { value: 'E', name: 'Doğu' },
  { value: 'S', name: 'Güney' },
  { value: 'W', name: 'Batı' },
  { value: 'N', name: 'Kuzey' },
];

export const DRAGONS = [
  { value: 'red', name: 'Kırmızı Ejderha' },
  { value: 'green', name: 'Yeşil Ejderha' },
  { value: 'white', name: 'Beyaz Ejderha' },
];

export const FLOWERS = [
  { value: 1, name: 'Erik Çiçeği' },
  { value: 2, name: 'Orkide' },
  { value: 3, name: 'Krizantem' },
  { value: 4, name: 'Bambu Çiçeği' },
];

export const SEASONS = [
  { value: 1, name: 'İlkbahar' },
  { value: 2, name: 'Yaz' },
  { value: 3, name: 'Sonbahar' },
  { value: 4, name: 'Kış' },
];

function face(kind, value, matchKey, label) {
  return Object.freeze({ kind, value, matchKey, label });
}

/**
 * Standart 144 taşlık seti, eşleşebilir ÇİFTLER olarak döndürür (72 çift).
 * Aynı türden 4 taş → 2 çift. 4 çiçek → 2 çift, 4 mevsim → 2 çift.
 * Çiçek/mevsim çiftlerinin kendi içinde nasıl gruplanacağını rng belirler.
 */
export function buildPairs(rng = Math.random) {
  const pairs = [];
  for (const suit of SUITS) {
    for (let v = 1; v <= 9; v++) {
      const f = face(suit.kind, v, `${suit.kind}-${v}`, `${v} ${suit.name}`);
      pairs.push([f, f], [f, f]);
    }
  }
  for (const w of WINDS) {
    const f = face('wind', w.value, `wind-${w.value}`, `${w.name} Rüzgârı`);
    pairs.push([f, f], [f, f]);
  }
  for (const d of DRAGONS) {
    const f = face('dragon', d.value, `dragon-${d.value}`, d.name);
    pairs.push([f, f], [f, f]);
  }
  const flowers = shuffle(
    FLOWERS.map((x) => face('flower', x.value, 'flower', `Çiçek: ${x.name}`)),
    rng,
  );
  pairs.push([flowers[0], flowers[1]], [flowers[2], flowers[3]]);
  const seasons = shuffle(
    SEASONS.map((x) => face('season', x.value, 'season', `Mevsim: ${x.name}`)),
    rng,
  );
  pairs.push([seasons[0], seasons[1]], [seasons[2], seasons[3]]);
  return pairs;
}

/** Tüm 144 taş yüzünü düz liste olarak döndürür. */
export function buildFullSet(rng = Math.random) {
  return buildPairs(rng).flat();
}

/** İki yüz eşleşir mi? */
export function facesMatch(a, b) {
  return a.matchKey === b.matchKey;
}

/** Fisher–Yates karıştırma (yeni dizi döndürür). */
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
