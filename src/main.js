// MAHJIQ — Uygulama girişi: motoru, masayı ve arayüz düğmelerini birbirine bağlar.

import { Game, STATUS } from './engine/game.js';
import { BoardView } from './ui/boardView.js';

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
};

function show(el) {
  el.hidden = false;
  const btn = el.querySelector('button');
  if (btn) btn.focus({ preventScroll: true });
}
function hide(el) {
  el.hidden = true;
}

function updateStats() {
  ui.remaining.textContent = String(game.remaining);
  ui.matches.textContent = String(game.matchesAvailable);
}

game.onChange((ev) => {
  if (ev.type === 'new' || ev.type === 'match') updateStats();
  if (ev.type === 'match' && ev.status === STATUS.WON) setTimeout(() => show(ui.win), 350);
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
