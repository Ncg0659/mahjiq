// MAHJIQ — Uygulama girişi: motoru, masayı ve arayüz düğmelerini birbirine bağlar.

import { Game, STATUS } from './engine/game.js';
import { BoardView } from './ui/boardView.js';
import { faceSVG } from './ui/faces.js';

const $ = (sel) => document.querySelector(sel);

const game = new Game();
const view = new BoardView($('#stage'), game);

const ui = {
  remaining: $('#stat-remaining'),
  matches: $('#stat-matches'),
  splash: $('#splash'),
  confirm: $('#confirm-new'),
  win: $('#win'),
  stuck: $('#stuck'),
  stuckLeft: $('#stuck-left'),
  rotateHint: $('#rotate-hint'),
  info: $('#info'),
};

/** Süs taşı: oyunun kendi taş çizimiyle (dokunulmaz, ekran okuyucu görmez). */
function decoTile(kind, value, cls = '') {
  return `<div class="deco-tile ${cls}"><div class="face">${faceSVG({ kind, value })}</div></div>`;
}

// Kazanma panelinin üstündeki üç taş
document.querySelector('.win-tiles').innerHTML =
  decoTile('dots', 5, 'w1') + decoTile('dragon', 'green', 'w2') + decoTile('bamboo', 2, 'w3');

function show(el) {
  el.hidden = false;
  const btn = el.querySelector('button');
  if (btn) btn.focus({ preventScroll: true });
}
function hide(el) {
  el.hidden = true;
}

function setStat(el, value, animate) {
  const text = String(value);
  if (el.textContent === text) return;
  el.textContent = text;
  if (animate) {
    el.classList.remove('bump');
    void el.offsetWidth; // animasyonu yeniden başlat
    el.classList.add('bump');
  }
}

function updateStats(animate = false) {
  setStat(ui.remaining, game.remaining, animate);
  setStat(ui.matches, game.matchesAvailable, animate);
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Kazanınca sade konfeti kutlaması (yalnızca transform/opacity; hareket azaltmada yok). */
function celebrate() {
  if (reduceMotion.matches) return;
  // Yalnızca hafif altın tonları (brief: sade altın konfeti)
  const colors = ['#d4af37', '#f2d57a', '#b8892a', '#fbe7a8'];
  const box = document.createElement('div');
  box.className = 'confetti';
  box.setAttribute('aria-hidden', 'true');
  let html = '';
  for (let i = 0; i < 30; i++) {
    const left = Math.random() * 100;
    const dx = (Math.random() - 0.5) * 160;
    const rot = 360 + Math.random() * 540;
    const dur = 1.9 + Math.random() * 1.2;
    const delay = Math.random() * 0.6;
    const c = colors[i % colors.length];
    html += `<i style="left:${left.toFixed(1)}%;background:${c};--dx:${dx.toFixed(0)}px;--rot:${rot.toFixed(0)}deg;--dur:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s"></i>`;
  }
  box.innerHTML = html;
  // Pencerenin içine, panelin ARKASINA eklenir: yazı ve düğme hep okunur kalır.
  ui.win.prepend(box);
  setTimeout(() => box.remove(), 3600);
}

game.onChange((ev) => {
  if (ev.type === 'new') updateStats(false);
  if (ev.type === 'match') updateStats(true);
  if (ev.type === 'match' && ev.status === STATUS.WON) {
    setTimeout(() => {
      show(ui.win);
      celebrate();
    }, 350);
  }
  if (ev.type === 'match' && ev.status === STATUS.STUCK) {
    ui.stuckLeft.textContent = String(game.remaining);
    setTimeout(() => show(ui.stuck), 350);
  }
});

function startNewGame() {
  [ui.confirm, ui.win, ui.stuck].forEach(hide);
  game.newGame();
}

// Düğmeler
$('#btn-play').addEventListener('click', () => hide(ui.splash));
$('#btn-new').addEventListener('click', () => {
  // Oyun ortasında yanlışlıkla basılırsa oyun kaybolmasın diye sor.
  const fresh = game.remaining === 144;
  if (fresh || game.status !== STATUS.PLAYING) startNewGame();
  else show(ui.confirm);
});
$('#confirm-yes').addEventListener('click', startNewGame);
$('#confirm-no').addEventListener('click', () => hide(ui.confirm));
$('#win-new').addEventListener('click', startNewGame);
$('#stuck-new').addEventListener('click', startNewGame);
$('#stuck-look').addEventListener('click', () => hide(ui.stuck));
$('#btn-info').addEventListener('click', () => show(ui.info));
$('#info-close').addEventListener('click', () => {
  hide(ui.info);
  $('#btn-info').focus({ preventScroll: true });
});

// Küçük dikey ekranda "yan çevir" önerisi
$('#stage').addEventListener('board-layout', (e) => {
  const portrait = window.innerHeight > window.innerWidth;
  ui.rotateHint.hidden = !(portrait && e.detail.tileWidth < 34);
});

game.newGame();

// Test ve hata ayıklama için (oyuncu görmez)
window.__mahjiq = { game, view };

// Çevrimdışı çalışma: service worker
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
