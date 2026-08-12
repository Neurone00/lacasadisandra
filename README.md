# lacasadisandra

Mobile-first scroll-driven video tour. Scroll scrubs a vertical walkthrough video room by room (ingresso → cucina → bagno → camera da letto → cabina armadio → studio → soggiorno), each room gets an animated caption once you're actually in it, and reaching the end loops seamlessly back to the entrance. Scrolling is free/continuous — no scroll-snap.

No build step, no framework: plain HTML/CSS/JS.

- JS maps scroll position → `video.currentTime` (the one thing CSS can't do)
- Section heights are weighted by each room's real duration in the source video (re-measured by eye at 2fps per room, not guessed), so captions stay in sync with what's on screen
- Each `.room` carries `data-start`/`data-end` (seconds); a caption only reveals once `currentTime` is a bit past its room's start and a bit before its end — this is checked directly against time, not viewport/scroll geometry, because several sections are shorter than one viewport height and a geometry-based check flips to the neighboring room too early
- Caption reveal is a z-axis pop (`perspective` + `translateZ` + `scale`, applied inline on the element's own transform — putting `perspective` on an ancestor instead would make it the containing block for these `position: fixed` captions and break "fixed to viewport") + fade, at a different screen position per room

## Run locally

```
cd site && python3 -m http.server 8000
```

Open http://localhost:8000. Note: Python's `http.server` doesn't support HTTP Range requests, which Chrome needs to seek the video — scrubbing will silently stay stuck at frame 0. Use any Range-capable static server (GitHub Pages, `npx serve`, etc.) to test scrubbing locally.

## Deploy

Static files, served as-is via GitHub Pages (root of `main`).
