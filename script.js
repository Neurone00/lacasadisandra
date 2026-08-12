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

function updateProgress() {
  if (!video.duration || !video.buffered.length) return;
  const buffered = video.buffered.end(video.buffered.length - 1);
  fill.style.width = Math.min(100, (buffered / video.duration) * 100) + '%';
  // ponytail: a paused, never-played video isn't guaranteed to fully buffer —
  // `preload="auto"` is just a hint, and Chrome in particular can plateau
  // partway and stop firing `progress`, which left this stuck forever. A few
  // seconds of head start is enough; scrubbing into not-yet-buffered range
  // just triggers another (Range-supported) fetch, worst case a brief stall.
  if (buffered >= Math.min(4, video.duration)) onReady();
}
video.addEventListener('progress', updateProgress);
video.addEventListener('loadedmetadata', updateProgress);
video.addEventListener('canplaythrough', onReady, { once: true });
setTimeout(onReady, 6000); // hard backstop — never leave the user stuck

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
