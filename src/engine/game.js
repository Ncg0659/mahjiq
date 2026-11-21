// MAHJIQ — Merkezi oyun durumu
//
// Arayüz bu sınıfı kullanır ama sınıf arayüzü bilmez (DOM yok).
// Tüm durum tek yerde: tiles, selected, status, seed.
// Arayüz, tap() sonucunda dönen olaya bakarak ne çizeceğine karar verir.

import { generateDeal } from './generator.js';
import { TURTLE } from './layouts/turtle.js';
import { isFree, canMatch, availableMatches, remainingCount, buildNeighbors } from './board.js';
import { randomSeed } from './rng.js';

export const STATUS = Object.freeze({ PLAYING: 'playing', WON: 'won', STUCK: 'stuck' });

export class Game {
  constructor({ layout = TURTLE } = {}) {
    this.layout = layout;
    this.listeners = new Set();
    this.tiles = [];
    this.neighbors = [];
    this.selected = null;
    this.status = STATUS.PLAYING;
    this.seed = null;
  }

  /** Yeni oyun başlatır. Önceki oyunun tüm durumu silinir. */
  newGame(seed = randomSeed()) {
    const deal = generateDeal(this.layout, seed);
    this.tiles = deal.tiles;
    this.neighbors = deal.neighbors;
    this.solution = deal.solution;
    this.seed = seed;
    this.selected = null;
    this.status = STATUS.PLAYING;
    this._refreshStatus();
    this._emit({ type: 'new' });
    return this;
  }

  /**
   * Test ve ileride kayıt/yükleme için: hazır taş listesiyle oyunu kurar.
   * tiles: [{ col, row, z, face }]
   */
  loadTiles(tiles) {
    this.tiles = tiles.map((t, id) => ({ id, col: t.col, row: t.row, z: t.z, face: t.face, removed: !!t.removed }));
    this.neighbors = buildNeighbors(this.tiles);
    this.solution = null;
    this.seed = null;
    this.selected = null;
    this.status = STATUS.PLAYING;
    this._refreshStatus();
    this._emit({ type: 'new' });
    return this;
  }

  isFree(id) {
    return isFree(this.tiles, this.neighbors, id);
  }

  get remaining() {
    return remainingCount(this.tiles);
  }

  get matchesAvailable() {
    return availableMatches(this.tiles, this.neighbors).length;
  }

  /**
   * Oyuncu bir taşa dokundu.
   * Dönen olay türleri:
   *   blocked  — taş kapalı, hiçbir şey değişmedi
   *   select   — taş seçildi
   *   deselect — seçili taşa tekrar dokunuldu, seçim kaldırıldı
   *   mismatch — iki taş eşleşmiyor; yeni dokunulan taş seçili hale geldi
   *   match    — eşleşme, iki taş kaldırıldı
   *   ignored  — oyun bitmiş ya da taş zaten kaldırılmış
   */
  tap(id) {
    const t = this.tiles[id];
    if (!t || t.removed || this.status !== STATUS.PLAYING) return this._emit({ type: 'ignored', id });
    if (!this.isFree(id)) return this._emit({ type: 'blocked', id });

    if (this.selected === null) {
      this.selected = id;
      return this._emit({ type: 'select', id });
    }
    if (this.selected === id) {
      this.selected = null;
      return this._emit({ type: 'deselect', id });
    }
    const first = this.selected;
    if (canMatch(this.tiles, this.neighbors, first, id)) {
      this.tiles[first].removed = true;
      this.tiles[id].removed = true;
      this.selected = null;
      this._refreshStatus();
      return this._emit({ type: 'match', ids: [first, id], status: this.status });
    }
    this.selected = id;
    return this._emit({ type: 'mismatch', ids: [first, id] });
  }

  _refreshStatus() {
    if (this.remaining === 0) this.status = STATUS.WON;
    else if (this.matchesAvailable === 0) this.status = STATUS.STUCK;
    else this.status = STATUS.PLAYING;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit(ev) {
    for (const fn of this.listeners) fn(ev, this);
    return ev;
  }
}
