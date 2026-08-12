const video = document.getElementById('video');
const preloader = document.getElementById('preloader');
const fill = document.getElementById('preloader-fill');
const rooms = document.querySelectorAll('.room');

let ready = false;
let looping = false;
let ticking = false;

// per-room tracked point (see track.py) driving the caption position — filled in below
let anchors = {};
fetch('assets/anchors.json').then((r) => r.json()).then((data) => { anchors = data; onScroll(); });

function sampleAnchor(samples, t) {
  if (!samples || !samples.length) return null;
  if (t <= samples[0].t) return samples[0];
  const last = samples[samples.length - 1];
  if (t >= last.t) return last;
  for (let i = 1; i < samples.length; i++) {
    if (t <= samples[i].t) {
      const a = samples[i - 1], b = samples[i];
      const f = (t - a.t) / (b.t - a.t || 1);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  return last;
}

// maps a normalized point in the source video to on-screen px, matching the
// `object-fit: cover` crop the <video> itself uses
function videoPointToScreen(xNorm, yNorm) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = Math.max(window.innerWidth / vw, window.innerHeight / vh);
  const drawW = vw * scale, drawH = vh * scale;
  const offsetX = (window.innerWidth - drawW) / 2;
  const offsetY = (window.innerHeight - drawH) / 2;
  return [offsetX + xNorm * drawW, offsetY + yNorm * drawH];
}

const header = document.querySelector('.site-header');

function updateAnchoredText(t) {
  // ponytail: clamp against the caption's *worst-case* box size (from its CSS
  // max-width: 78vw, plus a fixed allowance for up to ~3 wrapped lines) rather
  // than its live offsetWidth/offsetHeight — reading real layout size raced
  // against the webfont swap (fallback serif measures narrower than Playfair
  // Display), leaving stale, too-tight clamps after the font loaded in.
  const halfW = 0.39 * window.innerWidth + 12;
  const halfH = 80;
  const topLimit = header.offsetHeight + 14;
  for (const roomId in anchors) {
    const el = document.querySelector('#' + roomId + ' .room-text');
    const s = el && sampleAnchor(anchors[roomId], t);
    if (!s) continue;
    let [x, y] = videoPointToScreen(s.x, s.y);
    x = Math.min(Math.max(x, halfW), window.innerWidth - halfW);
    y = Math.min(Math.max(y, topLimit + halfH), window.innerHeight - halfH);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }
}

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
  if (buffered >= video.duration - 0.15) onReady();
}
video.addEventListener('progress', updateProgress);
video.addEventListener('loadedmetadata', updateProgress);
video.addEventListener('canplaythrough', onReady, { once: true });

function onScroll() {
  if (!ready || !video.duration) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = Math.min(window.scrollY, max);
  const progress = max > 0 ? y / max : 0;
  video.currentTime = progress * video.duration;
  updateAnchoredText(video.currentTime);

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

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting));
}, { threshold: 0.55 });
rooms.forEach((r) => io.observe(r));

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
