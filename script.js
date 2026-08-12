const video = document.getElementById('video');
const preloader = document.getElementById('preloader');
const fill = document.getElementById('preloader-fill');
const rooms = [...document.querySelectorAll('.room')].map((el) => ({
  el,
  start: +el.dataset.start,
  end: +el.dataset.end,
}));

let ready = false;
let looping = false;
let ticking = false;

// video is never played — currentTime is driven entirely by scroll position.
video.pause();

function onReady() {
  if (ready) return;
  ready = true;
  document.body.classList.remove('is-loading');
  preloader.classList.add('is-hidden');
  setTimeout(() => preloader.remove(), 700);
  onScroll();
}

// ponytail: a declarative <video preload="auto"> is only a hint — measured in
// Chrome, a paused/never-played video's buffering plateaus around ~57% and
// goes network-idle for good, and `canplaythrough` fires well before that,
// so neither gives a real "fully buffered" signal. Scrubbing past the
// plateau then stalls on a genuine network fetch, which is the dominant
// source of jank on mobile. Fetching the file ourselves and handing the
// browser one complete blob sidesteps the heuristic: every seek afterward is
// served from memory, guaranteed. Progress bar is real bytes, not a guess.
const SRC = video.canPlayType('video/webm; codecs="vp9"') ? 'assets/video/casa.webm' : 'assets/video/casa.mp4';
fetch(SRC).then(async (res) => {
  const total = +res.headers.get('content-length') || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) fill.style.width = Math.min(100, (received / total) * 100) + '%';
  }
  video.src = URL.createObjectURL(new Blob(chunks, { type: res.headers.get('content-type') || 'video/mp4' }));
  video.addEventListener('loadedmetadata', onReady, { once: true });
}).catch(() => {
  // fetch itself failed (offline, etc.) — fall back to normal streaming
  video.src = SRC;
  video.addEventListener('loadedmetadata', onReady, { once: true });
});
setTimeout(onReady, 20000); // hard backstop — never leave the user stuck

const FRAME_TIME = 1 / 30; // source video is ~30fps
let lastSeekedTime = -1;

function onScroll() {
  if (!ready || !video.duration) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = Math.min(window.scrollY, max);
  const progress = max > 0 ? y / max : 0;
  const t = progress * video.duration;
  // ponytail: seeking is a real decode, not free — rAF can fire ~60/s but the
  // video only has ~30 distinct frames/s, so half those seeks retargeted the
  // same frame and were pure jank. Skip ones smaller than one video frame.
  if (Math.abs(t - lastSeekedTime) >= FRAME_TIME) {
    video.currentTime = t;
    lastSeekedTime = t;
  }
  updateCaptions(t);

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
window.addEventListener('resize', onScrollThrottled);

// ponytail: reveal is keyed off video.currentTime against each room's own
// [start, end] (not scroll/viewport geometry) — several sections are shorter
// than one viewport height, so an IntersectionObserver-based "is this section
// centered on screen" check flips to the neighboring room before the video's
// actual time has entered it. Time is the source of truth we already have.
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
