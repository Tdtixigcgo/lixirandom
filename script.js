/* ═══════════════════════════════════════════
   LÌ XÌ TẾT 2026 — GAME LOGIC
   Device Lock + Rigged Engine + Audio + UI
   ═══════════════════════════════════════════ */

'use strict';

// ── CONSTANTS ──────────────────────────────
const USER_PRIZES  = [2000, 5000, 10000, 15000, 18000];
const BIG_PRIZE    = 100000;
const SMALL_OTHERS = [1000, 2000, 5000, 10000, 20000, 50000];
const TOTAL_CARDS  = 12;
const BIG_IN_OTHERS = 5;

// ── STATE ───────────────────────────────────
let prizes = [];
let userCardIndex = -1;
let hasPicked = false;
let audioCtx = null;

// ── DEVICE FINGERPRINT ──────────────────────
function generateDeviceId() {
  const parts = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency || '?',
  ].join('||');

  let hash = 2166136261;
  for (let i = 0; i < parts.length; i++) {
    hash ^= parts.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return `lixi2026_${hash.toString(36)}`;
}

function checkDevice() {
  const deviceId = generateDeviceId();
  if (localStorage.getItem(deviceId) === 'picked') {
    document.getElementById('blocker-overlay').classList.add('active');
  }
}

function markDevicePicked() {
  localStorage.setItem(generateDeviceId(), 'picked');
}

function saveLog(amount) {
  const name = prompt('Nhập tên của bạn để lưu kết quả 🧧') || 'Ẩn danh';
  const record = {
    name: name.trim() || 'Ẩn danh',
    amount,
    time: new Date().toISOString(),
    deviceId: generateDeviceId(),
  };
  const log = JSON.parse(localStorage.getItem('lixi_log') || '[]');
  log.push(record);
  localStorage.setItem('lixi_log', JSON.stringify(log));
  return name;
}

// ── PRIZE ENGINE ─────────────────────────────
function generatePrizes() {
  // User gets a prize that NEVER includes 100k
  const userPrize = USER_PRIZES[Math.floor(Math.random() * USER_PRIZES.length)];

  // Build 11 other envelopes: exactly 5 × 100k + 6 × small random
  const others = [];
  for (let i = 0; i < BIG_IN_OTHERS; i++) others.push(BIG_PRIZE);
  for (let i = 0; i < TOTAL_CARDS - 1 - BIG_IN_OTHERS; i++) {
    others.push(SMALL_OTHERS[Math.floor(Math.random() * SMALL_OTHERS.length)]);
  }

  // Shuffle the 11 others
  others.sort(() => Math.random() - 0.5);

  // Insert user's card at a random position
  const insertPos = Math.floor(Math.random() * TOTAL_CARDS);
  const full = [...others];
  full.splice(insertPos, 0, userPrize);

  userCardIndex = insertPos;
  prizes = full;
}

// ── AUDIO ────────────────────────────────────
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTing(pitch = 1.0) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1047 * pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1568 * pitch, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.9);
  } catch(e) { /* audio blocked, ignore */ }
}

function playFirework() {
  try {
    const ctx   = getAudioCtx();
    const now   = ctx.currentTime;
    const notes = [523, 659, 784, 1047, 880, 1175];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.18);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t); osc.stop(t + 0.6);
    });
  } catch(e) { /* audio blocked, ignore */ }
}

// ── CONFETTI ──────────────────────────────────
function launchConfetti() {
  if (typeof confetti === 'undefined') return;
  confetti({
    particleCount: 130, spread: 80, origin: { y: 0.55 },
    colors: ['#f1c40f','#e74c3c','#ff0000','#ffd700','#ffffff'],
  });
  setTimeout(() => {
    confetti({ angle: 60,  spread: 55, particleCount: 80, origin: { x: 0 },   colors: ['#f1c40f','#ff6b6b'] });
    confetti({ angle: 120, spread: 55, particleCount: 80, origin: { x: 1 },   colors: ['#f1c40f','#ff0000'] });
  }, 350);
  setTimeout(() => {
    confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 }, colors: ['#ffe566','#ff4444','#fff'] });
  }, 800);
}

// ── RENDER CARDS ──────────────────────────────
function formatVND(amount) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function renderCards() {
  const grid = document.getElementById('lixi-grid');
  grid.innerHTML = '';

  prizes.forEach((prize, i) => {
    const isUser = i === userCardIndex;
    const card = document.createElement('div');
    card.className = `lixi-card${isUser ? ' is-user-card' : ''}`;
    card.dataset.index = i;

    // Back face type
    let backClass = 'type-small';
    let backIcon = '🧧';
    let backTag = '';
    if (isUser) {
      backClass = 'type-user';
      backIcon = '🧧';
      backTag = '🎉 CỦA BẠN';
    } else if (prize === BIG_PRIZE) {
      backClass = 'type-big';
      backIcon = '💰';
      backTag = '🏆 100K';
    } else {
      backTag = `+${formatVND(prize)}`;
    }

    card.innerHTML = `
      ${isUser ? '<div class="user-label">👆 CHỌN ĐI</div>' : ''}
      <div class="card-inner">
        <div class="face front">
          <div class="front-seal">福</div>
          <div class="front-sub">春</div>
          <span class="corner-deco tl">✦</span>
          <span class="corner-deco tr">✦</span>
          <span class="corner-deco bl">✦</span>
          <span class="corner-deco br">✦</span>
        </div>
        <div class="face back ${backClass}">
          <div class="prize-icon">${backIcon}</div>
          <div class="prize-amount">${formatVND(prize)}</div>
          <div class="prize-tag">${backTag}</div>
        </div>
      </div>
    `;

    if (isUser) {
      card.addEventListener('click', () => handleFlip(i));
    }

    grid.appendChild(card);
  });
}

// ── HANDLE FLIP ───────────────────────────────
function handleFlip(index) {
  if (hasPicked) return;
  hasPicked = true;

  // Unlock audio context on user gesture
  getAudioCtx();

  // Save log (prompt for name)
  saveLog(prizes[index]);

  // Mark device
  markDevicePicked();

  // Flip user card
  playTing(1.0);
  const userCard = document.querySelector(`[data-index="${index}"]`);
  userCard.classList.add('is-flipped');

  // Reveal others after 900ms
  setTimeout(() => revealAll(index), 900);
}

// ── REVEAL ALL ────────────────────────────────
function revealAll(userIdx) {
  const allCards = document.querySelectorAll('.lixi-card');
  let delay = 0;

  allCards.forEach((card, i) => {
    if (i === userIdx) return; // already flipped
    setTimeout(() => {
      card.classList.add('is-flipped');
      const pitch = 0.7 + Math.random() * 0.8;
      playTing(pitch);
    }, delay);
    delay += 55;
  });

  // Show result after all flipped + 700ms
  setTimeout(() => showResult(userIdx), delay + 700);
}

// ── SHOW RESULT ───────────────────────────────
function showResult(userIdx) {
  const amount = prizes[userIdx];

  // Find 100k positions
  const bigPositions = prizes
    .map((p, i) => ({ p, i }))
    .filter(x => x.p === BIG_PRIZE && x.i !== userIdx)
    .map(x => x.i + 1); // 1-indexed for display

  // Audio
  playFirework();

  // Confetti
  launchConfetti();

  // Update DOM
  document.getElementById('result-amount').textContent = `🎊 ${formatVND(amount)}`;

  if (bigPositions.length > 0) {
    document.getElementById('result-miss').innerHTML =
      `😅 Tiếc quá! Bao 100K nằm ở vị trí:<br><strong>${bigPositions.join(', ')}</strong>`;
  }

  // Show banner
  const banner = document.getElementById('result-banner');
  banner.classList.add('show');
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkDevice();
  generatePrizes();
  renderCards();
});
