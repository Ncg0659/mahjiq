// Testler için küçük, elle kurulan tahtalar.
const F = (kind, value, matchKey = `${kind}-${value}`) => ({ kind, value, matchKey, label: matchKey });

export const face = {
  dots: (v) => F('dots', v),
  bamboo: (v) => F('bamboo', v),
  chars: (v) => F('chars', v),
  flower: (v) => F('flower', v, 'flower'),
  season: (v) => F('season', v, 'season'),
};

/** x, y: taş birimi (yarım birime çevrilir). */
export const at = (x, y, z, f) => ({ col: x * 2, row: y * 2, z, face: f });
