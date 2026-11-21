// MAHJIQ — Taş yüzü çizimleri (özgün SVG, dış görsel/font dosyası yok)
//
// Her yüz 60×80 birimlik bir SVG'dir. Okunabilirlik için:
//  - Semboller büyük ve kalın,
//  - Sol üst köşede küçük bir "dizin" (rakam veya Türkçe harf) var,
//    böylece annem taşın ne olduğunu sembolü incelemeden de anlayabilir.
// Çince karakterler sistem fontundan gelir (iOS: PingFang, Android: Noto CJK).

const C = {
  red: '#c8141e',
  green: '#137a3f',
  blue: '#1f4fa8',
  dark: '#1d2b24',
  gold: '#c99a1d',
};

const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const WIND_CN = { E: '東', S: '南', W: '西', N: '北' };
const WIND_TR = { E: 'D', S: 'G', W: 'B', N: 'K' }; // Doğu, Güney, Batı, Kuzey

function svg(inner, corner) {
  const idx = corner
    ? `<text x="6" y="15" font-size="13" font-weight="800" fill="${C.dark}" font-family="system-ui,-apple-system,sans-serif">${corner}</text>`
    : '';
  return `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${idx}${inner}</svg>`;
}

// ---- Daireler ----
const DOT_POS = {
  1: [[30, 44]],
  2: [[30, 26], [30, 60]],
  3: [[16, 24], [30, 43], [44, 62]],
  4: [[19, 28], [41, 28], [19, 58], [41, 58]],
  5: [[18, 26], [42, 26], [30, 43], [18, 60], [42, 60]],
  6: [[20, 22], [40, 22], [20, 43], [40, 43], [20, 64], [40, 64]],
  7: [[14, 18], [30, 24], [46, 30], [20, 48], [40, 48], [20, 66], [40, 66]],
  8: [[20, 17], [40, 17], [20, 34], [40, 34], [20, 51], [40, 51], [20, 68], [40, 68]],
  9: [[14, 22], [30, 22], [46, 22], [14, 43], [30, 43], [46, 43], [14, 64], [30, 64], [46, 64]],
};

function dot(x, y, r, color) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="#fff8e7"/><circle cx="${x}" cy="${y}" r="${r * 0.28}" fill="${color}"/>`;
}

function dotsFace(n) {
  const r = { 1: 17, 2: 11, 3: 9.5, 4: 10, 5: 9, 6: 8.5, 7: 7.5, 8: 7.5, 9: 7 }[n];
  const colors = [C.blue, C.green, C.red];
  const inner = DOT_POS[n]
    .map(([x, y], i) => dot(x, y, r, n === 1 ? C.red : colors[i % 3]))
    .join('');
  return svg(inner, n);
}

// ---- Bambu ----
function stick(x, y, h, color) {
  const w = 6;
  return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="3" fill="${color}"/>` +
    `<rect x="${x - w / 2 - 1}" y="${y + h / 2 - 1.5}" width="${w + 2}" height="3" rx="1.5" fill="${C.dark}" opacity=".55"/>`;
}

const BAMBOO_POS = {
  2: [[[30, 18]], [[30, 48]]],
  3: [[[30, 18]], [[20, 48], [40, 48]]],
  4: [[[20, 18], [40, 18]], [[20, 48], [40, 48]]],
  5: [[[16, 18], [44, 18]], [[30, 33]], [[16, 48], [44, 48]]],
  6: [[[16, 18], [30, 18], [44, 18]], [[16, 48], [30, 48], [44, 48]]],
  7: [[[30, 12]], [[16, 34], [30, 34], [44, 34]], [[16, 56], [30, 56], [44, 56]]],
  8: [[[14, 18], [25, 18], [35, 18], [46, 18]], [[14, 48], [25, 48], [35, 48], [46, 48]]],
  9: [[[16, 10], [30, 10], [44, 10]], [[16, 34], [30, 34], [44, 34]], [[16, 58], [30, 58], [44, 58]]],
};

function bambooFace(n) {
  if (n === 1) {
    // 1 Bambu: tek, büyük bambu filizi (yapraklı)
    const inner =
      `<rect x="25" y="16" width="10" height="56" rx="5" fill="${C.green}"/>` +
      `<rect x="23" y="34" width="14" height="4" rx="2" fill="${C.dark}" opacity=".5"/>` +
      `<rect x="23" y="52" width="14" height="4" rx="2" fill="${C.dark}" opacity=".5"/>` +
      `<path d="M35 30 Q50 20 54 26 Q46 34 35 33 Z" fill="${C.green}"/>` +
      `<path d="M25 46 Q10 36 6 42 Q14 50 25 49 Z" fill="${C.green}"/>` +
      `<circle cx="30" cy="14" r="5" fill="${C.red}"/>`;
    return svg(inner, 1);
  }
  const rows = BAMBOO_POS[n];
  const h = n >= 7 ? 20 : 26;
  let inner = '';
  rows.forEach((row, ri) => {
    for (const [x, y] of row) {
      const color = (n === 5 && ri === 1) || (n === 7 && ri === 0) || (n === 9 && x === 30) ? C.red : C.green;
      inner += stick(x, y, h, color);
    }
  });
  return svg(inner, n);
}

// ---- Karakter ----
function charsFace(n) {
  const inner =
    `<text x="30" y="40" text-anchor="middle" font-size="30" font-weight="700" fill="${C.dark}" font-family="'PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Noto Sans SC','Microsoft YaHei',sans-serif">${CN_NUM[n]}</text>` +
    `<text x="30" y="72" text-anchor="middle" font-size="27" font-weight="700" fill="${C.red}" font-family="'PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Noto Sans SC','Microsoft YaHei',sans-serif">萬</text>`;
  return svg(inner, n);
}

// ---- Rüzgâr ----
function windFace(v) {
  const inner = `<text x="30" y="58" text-anchor="middle" font-size="40" font-weight="700" fill="${C.dark}" font-family="'PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Noto Sans SC','Microsoft YaHei',sans-serif">${WIND_CN[v]}</text>`;
  return svg(inner, WIND_TR[v]);
}

// ---- Ejderha ----
function dragonFace(v) {
  if (v === 'white') {
    const inner =
      `<rect x="12" y="18" width="36" height="48" rx="4" fill="none" stroke="${C.blue}" stroke-width="4"/>` +
      `<rect x="19" y="25" width="22" height="34" rx="2" fill="none" stroke="${C.blue}" stroke-width="2"/>`;
    return svg(inner, '');
  }
  const ch = v === 'red' ? '中' : '發';
  const color = v === 'red' ? C.red : C.green;
  const inner = `<text x="30" y="58" text-anchor="middle" font-size="40" font-weight="700" fill="${color}" font-family="'PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Noto Sans SC','Microsoft YaHei',sans-serif">${ch}</text>`;
  return svg(inner, '');
}

// ---- Çiçek ----
const FLOWER_COLORS = { 1: '#e0455a', 2: '#9b4fd1', 3: '#e0a412', 4: '#e06b1f' };

function flowerFace(v) {
  const c = FLOWER_COLORS[v];
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * (Math.PI / 180);
    const x = 30 + Math.cos(a) * 11;
    const y = 40 + Math.sin(a) * 11;
    petals += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${c}"/>`;
  }
  const inner =
    `<path d="M30 52 Q28 64 22 72" stroke="${C.green}" stroke-width="3" fill="none"/>` +
    `<path d="M26 64 Q16 60 14 66 Q20 70 26 66 Z" fill="${C.green}"/>` +
    petals +
    `<circle cx="30" cy="40" r="6" fill="${C.gold}"/>`;
  return svg(inner, `<tspan fill="${c}">✿</tspan>${v}`);
}

// ---- Mevsim ----
function seasonFace(v) {
  let inner = '';
  if (v === 1) {
    // İlkbahar: filiz
    inner =
      `<path d="M30 70 V40" stroke="${C.green}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M30 46 Q14 44 12 28 Q28 28 30 46 Z" fill="#3aa35b"/>` +
      `<path d="M30 40 Q46 36 48 20 Q32 22 30 40 Z" fill="${C.green}"/>`;
  } else if (v === 2) {
    // Yaz: güneş
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * 45) * (Math.PI / 180);
      rays += `<line x1="${(30 + Math.cos(a) * 15).toFixed(1)}" y1="${(44 + Math.sin(a) * 15).toFixed(1)}" x2="${(30 + Math.cos(a) * 23).toFixed(1)}" y2="${(44 + Math.sin(a) * 23).toFixed(1)}" stroke="#e08a12" stroke-width="4" stroke-linecap="round"/>`;
    }
    inner = rays + `<circle cx="30" cy="44" r="11" fill="#f2b11b"/>`;
  } else if (v === 3) {
    // Sonbahar: yaprak
    inner =
      `<path d="M30 20 Q52 34 42 58 Q30 70 18 58 Q8 34 30 20 Z" fill="#d1601b"/>` +
      `<path d="M30 24 V70" stroke="#7a3410" stroke-width="2.5"/>` +
      `<path d="M30 40 L40 34 M30 50 L20 44 M30 56 L40 50" stroke="#7a3410" stroke-width="2"/>`;
  } else {
    // Kış: kar tanesi
    let arms = '';
    for (let i = 0; i < 6; i++) {
      const a = (i * 60) * (Math.PI / 180);
      const x2 = 30 + Math.cos(a) * 20;
      const y2 = 44 + Math.sin(a) * 20;
      arms += `<line x1="30" y1="44" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${C.blue}" stroke-width="4" stroke-linecap="round"/>`;
    }
    inner = arms + `<circle cx="30" cy="44" r="4" fill="${C.blue}"/>`;
  }
  return svg(inner, `<tspan fill="${C.blue}">❖</tspan>${v}`);
}

const cache = new Map();

/** Bir taş yüzü için SVG metnini döndürür (önbellekli). */
export function faceSVG(face) {
  const key = `${face.kind}-${face.value}`;
  if (cache.has(key)) return cache.get(key);
  let out;
  switch (face.kind) {
    case 'dots': out = dotsFace(face.value); break;
    case 'bamboo': out = bambooFace(face.value); break;
    case 'chars': out = charsFace(face.value); break;
    case 'wind': out = windFace(face.value); break;
    case 'dragon': out = dragonFace(face.value); break;
    case 'flower': out = flowerFace(face.value); break;
    case 'season': out = seasonFace(face.value); break;
    default: throw new Error(`Bilinmeyen taş türü: ${face.kind}`);
  }
  cache.set(key, out);
  return out;
}
