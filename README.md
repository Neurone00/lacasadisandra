# lacasadisandra

Mobile-first scroll-driven video tour. Scroll scrubs a vertical walkthrough video room by room (ingresso → cucina → bagno → camera da letto → cabina armadio → studio → soggiorno), each room gets an animated caption once you're actually in it, and reaching the end loops seamlessly back to the entrance. Scrolling is free/continuous — no scroll-snap.

No build step, no framework: plain HTML/CSS/JS.

- The "video" is actually a sequence of 443 still WebP frames (`assets/frames/`, extracted at 12fps from the original footage — plenty for scroll-driven scrubbing) drawn to a `<canvas>` on scroll. This replaced an actual `<video>` element: seeking a `<video>` is a real decode every time, and that per-frame cost — not network, that was fixed separately — turned out to be the remaining source of mobile jank. A canvas paint of an already-decoded image has none. Same technique Apple's product pages use for scroll-scrubbed sequences
- All 443 frames preload before the site is usable (progress bar = frames loaded / 443), so every scroll position is already in memory — no per-seek network or decode cost, on any device
- Section heights are weighted by each room's real duration in the source video (re-measured by eye at 2fps per room, not guessed), so captions stay in sync with what's on screen
- Each `.room` carries `data-start`/`data-end` (seconds); a caption only reveals once `currentTime` is a bit past its room's start and a bit before its end — checked directly against time, not viewport/scroll geometry, because several sections are shorter than one viewport height and a geometry-based check flips to the neighboring room too early
- Caption reveal is a z-axis pop (`perspective` + `translateZ` + `scale`, applied inline on the element's own transform — putting `perspective` on an ancestor instead would make it the containing block for these `position: fixed` captions and break "fixed to viewport") + fade, at a different screen position per room

## Run locally

```
cd site && python3 -m http.server 8000
```

Open http://localhost:8000 — any static server works, no Range-request support needed (frames are plain image `GET`s).

## Deploy

Static files, served as-is via GitHub Pages (root of `main`).

## Regenerating the frame sequence

```
ffmpeg -i original.mp4 -vf fps=12 -c:v libwebp -quality 70 site/assets/frames/f%04d.webp
```
