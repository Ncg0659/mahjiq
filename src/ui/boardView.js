// MAHJIQ — Oyun masası görünümü (DOM)
// Motoru yalnızca okur; değişiklikleri game.tap() üzerinden yapar.

import { faceSVG } from './faces.js';

const COLS = 15; // Kaplumbağa: 30 yarım birim = 15 taş genişliği
const ROWS = 8; //  16 yarım birim = 8 taş yüksekliği
const MAX_Z = 4;
const ASPECT = 1.3; // taş yüksekliği / genişliği
const LAYER = 0.12; // katman kayması (taş genişliğine oran) — üst katmanlar belirgin olsun
const SIDE = 0.085; // taş kalınlığı (3B kenar)

export class BoardView {
  constructor(stage, game) {
    this.stage = stage;
    this.game = game;
    this.board = document.createElement('div');
    this.board.className = 'board';
    this.board.setAttribute('role', 'grid');
    this.board.setAttribute('aria-label', 'Mahjong masası');
    stage.appendChild(this.board);
    this.els = [];
    this.tileW = 0;
    this.hintRings = [];
    this.hintTimer = null;
    this.hintPair = null;

    // Dokunmatik ve fare için tek olay: pointerdown → gecikmesiz tepki.
    this.board.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.tile');
      if (!el || el.classList.contains('gone')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      this.game.tap(Number(el.dataset.id));
    });
    // Klavye erişimi (Enter/Boşluk)
    this.board.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('.tile');
      if (!el) return;
      e.preventDefault();
      this.game.tap(Number(el.dataset.id));
    });

    game.onChange((ev) => this.onEvent(ev));
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(stage);
  }

  build() {
    this.board.textContent = '';
    this.els = this.game.tiles.map((t) => {
      const el = document.createElement('div');
      el.className = 'tile';
      el.dataset.id = String(t.id);
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', t.face.label);
      // Arkadakiler önce: üst katman üstte; aynı katmanda soldan sağa, yukarıdan aşağı.
      el.style.zIndex = String(t.z * 1000 + t.row * 32 + t.col + 1);
      el.innerHTML = `<div class="face">${faceSVG(t.face)}</div>`;
      if (t.removed) el.classList.add('gone');
      this.board.appendChild(el);
      return el;
    });
    this.layout();
  }

  layout() {
    this.clearHint(); // ekran boyutu değişirse vurgu yeniden konumlanmak yerine kaldırılır
    const W = this.stage.clientWidth;
    const H = this.stage.clientHeight;
    if (!W || !H) return;
    const unitsW = COLS + MAX_Z * LAYER + SIDE;
    const unitsH = ROWS * ASPECT + MAX_Z * LAYER + SIDE;
    const w = Math.floor(Math.min(W / unitsW, H / unitsH) * 10) / 10;
    const h = w * ASPECT;
    const d = w * LAYER;
    const s = w * SIDE;
    this.tileW = w;
    const boardW = COLS * w + MAX_Z * d + s;
    const boardH = ROWS * h + MAX_Z * d + s;
    this.board.style.width = `${boardW}px`;
    this.board.style.height = `${boardH}px`;
    this.board.style.left = `${(W - boardW) / 2}px`;
    this.board.style.top = `${(H - boardH) / 2}px`;
    this.board.style.setProperty('--w', `${w}px`);
    this.board.style.setProperty('--h', `${h}px`);
    this.board.style.setProperty('--s', `${s}px`);
    this.game.tiles.forEach((t, i) => {
      const el = this.els[i];
      if (!el) return;
      el.style.left = `${(t.col * w) / 2 + (MAX_Z - t.z) * d}px`;
      el.style.top = `${(t.row * h) / 2 + (MAX_Z - t.z) * d}px`;
    });
    this.stage.dispatchEvent(new CustomEvent('board-layout', { detail: { tileWidth: w } }));
  }

  onEvent(ev) {
    // Oyuncu herhangi bir taşa dokunursa (ya da yeni oyun başlarsa) ipucu vurgusu temizlenir
    if (ev.type !== 'ignored') this.clearHint();
    switch (ev.type) {
      case 'new':
        this.build();
        break;
      case 'select':
        this.els[ev.id].classList.add('selected');
        break;
      case 'deselect':
        this.els[ev.id].classList.remove('selected');
        break;
      case 'mismatch':
        this.els[ev.ids[0]].classList.remove('selected');
        this.flash(this.els[ev.ids[0]], 'wrong');
        this.els[ev.ids[1]].classList.add('selected');
        break;
      case 'blocked':
        this.flash(this.els[ev.id], 'shake');
        break;
      case 'match':
        for (const id of ev.ids) {
          const el = this.els[id];
          this.spark(el);
          el.classList.remove('selected');
          el.classList.add('gone');
        }
        break;
      default:
        break;
    }
  }

  /**
   * İpucu: iki taşın üstüne ~2 sn altın çerçeve. Taşları taşımaz/büyütmez; oyunu değiştirmez.
   * Hareketi Azalt açıksa çerçeve yanıp sönmez, sabit durur (yine ~2 sn sonra kalkar).
   */
  showHint(pair, duration = 2000) {
    this.clearHint();
    this.hintPair = [...pair];
    for (const id of pair) {
      const el = this.els[id];
      if (!el) continue;
      el.classList.add('hinted');
      const ring = document.createElement('div');
      ring.className = 'hint-ring';
      ring.dataset.for = String(id);
      ring.style.left = el.style.left;
      ring.style.top = el.style.top;
      this.board.appendChild(ring);
      this.hintRings.push(ring);
    }
    this.hintTimer = setTimeout(() => this.clearHint(), duration);
  }

  clearHint() {
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
    for (const r of this.hintRings) r.remove();
    this.hintRings = [];
    if (this.hintPair) for (const id of this.hintPair) this.els[id]?.classList.remove('hinted');
    this.hintPair = null;
  }

  /** Eşleşen taşın yerinde kısa bir altın halka (yalnızca görsel; dokunmayı engellemez). */
  spark(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = el.style.left;
    s.style.top = el.style.top;
    this.board.appendChild(s);
    setTimeout(() => s.remove(), 500);
  }

  flash(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // animasyonu yeniden başlat
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 400);
  }
}
