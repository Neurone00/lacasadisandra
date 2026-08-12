// ponytail: a <video>'s seek is a real decode, not free — that per-frame cost
// (not network, we already fixed that with a full-blob preload) was the
// remaining source of mobile jank. A <canvas> paint of an already-decoded
// image has none: draw is O(pixels), not O(decode). This is the same
// technique Apple's product pages use for scroll-scrubbed sequences.
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const preloader = document.getElementById('preloader');
const fill = document.getElementById('preloader-fill');
const rooms = [...document.querySelectorAll('.room')].map((el) => ({
  el,
  start: +el.dataset.start,
  end: +el.dataset.end,
}));

const FRAME_COUNT = 443;
const FPS = 12; // source is 30fps; 12 is plenty for scroll-driven scrubbing and cuts frame count ~2.5x
const DURATION = (FRAME_COUNT - 1) / FPS;
const frames = Array.from({ length: FRAME_COUNT }, (_, i) => {
  const img = new Image();
  img.src = `assets/frames/f${String(i + 1).padStart(4, '0')}.webp`;
  return img;
});

let ready = false;
let looping = false;
let ticking = false;
let loadedCount = 0;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR — not visibly softer on a photo, halves memory/paint cost on 3x phones
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}
resizeCanvas();

function drawFrame(img) {
  if (!img.naturalWidth) return;
  const cw = canvas.width, ch = canvas.height;
  const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

function onFrameSettled() {
  loadedCount++;
  fill.style.width = Math.min(100, (loadedCount / FRAME_COUNT) * 100) + '%';
  if (loadedCount >= FRAME_COUNT) onReady();
}
frames.forEach((img) => {
  img.addEventListener('load', onFrameSettled, { once: true });
  img.addEventListener('error', onFrameSettled, { once: true }); // one bad frame shouldn't hang the whole preload
});
setTimeout(onReady, 20000); // hard backstop — never leave the user stuck

function onReady() {
  if (ready) return;
  ready = true;
  document.body.classList.remove('is-loading');
  preloader.classList.add('is-hidden');
  setTimeout(() => preloader.remove(), 700);
  onScroll();
}

let lastFrameIndex = -1;

function onScroll() {
  if (!ready) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = Math.min(window.scrollY, max);
  const progress = max > 0 ? y / max : 0;
  const index = Math.round(progress * (FRAME_COUNT - 1));
  if (index !== lastFrameIndex) {
    drawFrame(frames[index]);
    lastFrameIndex = index;
  }
  updateCaptions(progress * DURATION);

  if (progress >= 0.999) {
    if (!looping) { looping = true; window.scrollTo(0, 0); }
  } else {
    looping = false;
  }
}
function onScrollThrottled() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { onScroll(); ticking = false; });
}
window.addEventListener('scroll', onScrollThrottled, { passive: true });
window.addEventListener('resize', () => {
  resizeCanvas();
  lastFrameIndex = -1; // canvas size changed — force a redraw even if the frame index didn't
  onScrollThrottled();
});

// ponytail: reveal is keyed off scroll-derived time against each room's own
// [start, end] (not scroll/viewport geometry) — several sections are shorter
// than one viewport height, so an IntersectionObserver-based "is this section
// centered on screen" check flips to the neighboring room too early.
function updateCaptions(t) {
  for (const r of rooms) {
    const margin = Math.max(0.4, (r.end - r.start) * 0.2);
    const inRoom = t >= r.start + margin && t <= r.end - margin;
    r.el.classList.toggle('in-view', inRoom);
  }
}

// ---- hamburger drawer ----
const hamburger = document.getElementById('hamburger');
const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');

function closeDrawer() {
  drawer.classList.remove('open');
  scrim.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}
function openDrawer() {
  drawer.classList.add('open');
  scrim.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
}
hamburger.addEventListener('click', () =>
  drawer.classList.contains('open') ? closeDrawer() : openDrawer()
);
scrim.addEventListener('click', closeDrawer);

drawer.querySelectorAll('a').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
    document.querySelector(a.getAttribute('href'))
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
