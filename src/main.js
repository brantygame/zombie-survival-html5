import { Game } from './game.js';
import { Input } from './input.js';
import { MobileControls } from './mobile-controls.js';
import { AudioSystem } from './audio.js';
import { UI } from './ui.js';

const root = document.documentElement;
const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = /Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);

root.classList.toggle('touch-device', hasTouch);
root.classList.toggle('ios-device', isIOS);
root.classList.toggle('ios-safari', isIOS && isSafari);

const canvas = document.getElementById('gameCanvas');
const input = new Input(canvas);
const audio = new AudioSystem();
const ui = new UI();
const mobile = new MobileControls(input);
const game = new Game(canvas, input, audio, ui, mobile);
const $ = id => document.getElementById(id);

async function startGameFromGesture() {
  // iOS Safari requires AudioContext creation/resume inside a real user gesture.
  await audio.unlock();
  game.startNewGame();
}

$('startButton').addEventListener('click', startGameFromGesture);
$('playAgainButton').addEventListener('click', startGameFromGesture);
$('winPlayAgainButton').addEventListener('click', startGameFromGesture);

$('pauseButton').addEventListener('click', () => game.pause());
$('resumeButton').addEventListener('click', async () => {
  await audio.unlock();
  game.resume();
});
$('nextLevelButton').addEventListener('click', async () => {
  await audio.unlock();
  game.continueNextLevel();
});

$('pauseMenuButton').addEventListener('click', () => game.toMenu());
$('gameOverMenuButton').addEventListener('click', () => game.toMenu());
$('winMenuButton').addEventListener('click', () => game.toMenu());

$('musicToggle').addEventListener('click', async () => {
  await audio.unlock();
  audio.setMusicEnabled(!audio.musicEnabled);
  $('musicToggle').textContent = `Music: ${audio.musicEnabled ? 'On' : 'Off'}`;
});

$('sfxToggle').addEventListener('click', async () => {
  await audio.unlock();
  audio.setSfxEnabled(!audio.sfxEnabled);
  $('sfxToggle').textContent = `SFX: ${audio.sfxEnabled ? 'On' : 'Off'}`;
});

// Safari can freeze/thaw pages through both visibilitychange and pagehide/pageshow.
document.addEventListener('visibilitychange', () => {
  game.handleVisibility(document.hidden);
});
window.addEventListener('pagehide', () => game.handleVisibility(true));
window.addEventListener('pageshow', () => game.handleVisibility(document.hidden));

// Prevent page panning/rubber-band scrolling while still allowing modal panels to scroll.
document.addEventListener('touchmove', event => {
  if (!event.target.closest('.panel')) event.preventDefault();
}, { passive: false });

// Disable Safari pinch/double-tap zoom gestures during play.
for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(name, event => event.preventDefault(), { passive: false });
}

let lastTouchEnd = 0;
document.addEventListener('touchend', event => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) event.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// Prevent text selection, image dragging and long-press context menus during gameplay.
document.addEventListener('selectstart', event => event.preventDefault());
document.addEventListener('dragstart', event => event.preventDefault());
window.addEventListener('contextmenu', event => event.preventDefault());

// Keep Safari's dynamic toolbar/orientation changes from leaving stale viewport geometry.
function settleIOSViewport() {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resize'));
  });
}
window.addEventListener('orientationchange', () => setTimeout(settleIOSViewport, 160), { passive: true });
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', settleIOSViewport, { passive: true });
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

game.init();
