# lacasadisandra

Mobile-first scroll-driven video tour. Scroll scrubs a vertical walkthrough video room by room (ingresso → cucina → bagno → camera da letto → cabina armadio → studio → soggiorno), each room gets an animated caption once you're actually in it, and reaching the end loops seamlessly back to the entrance. Scrolling is free/continuous — no scroll-snap.

No build step, no framework: plain HTML/CSS/JS.

- JS maps scroll position → `video.currentTime` (the one thing CSS can't do), skipping seeks smaller than one video frame — rAF can fire faster than the source's ~30fps, and a seek is a real decode, not free
- The video has no `src`/`<source>` in HTML — script.js `fetch()`s the whole file and hands the `<video>` a `Blob` URL once complete. A declarative `preload="auto"` looked sufficient but isn't: measured in Chrome, a paused/never-played video's buffering plateaus around ~57% and goes network-idle for good, so scrubbing past that point stalled on a real network fetch — the dominant source of the mobile jank. A blob has no such ceiling; every seek is served from memory
- Section heights are weighted by each room's real duration in the source video (re-measured by eye at 2fps per room, not guessed), so captions stay in sync with what's on screen
- Each `.room` carries `data-start`/`data-end` (seconds); a caption only reveals once `currentTime` is a bit past its room's start and a bit before its end — checked directly against time, not viewport/scroll geometry, because several sections are shorter than one viewport height and a geometry-based check flips to the neighboring room too early
- Caption reveal is a z-axis pop (`perspective` + `translateZ` + `scale`, applied inline on the element's own transform — putting `perspective` on an ancestor instead would make it the containing block for these `position: fixed` captions and break "fixed to viewport") + fade, at a different screen position per room

## Run locally

```
cd site && python3 -m http.server 8000
```

Open http://localhost:8000 (any static server works now — the video loads via a plain `fetch()`, not a Range-seeked `<video src>`, so it no longer needs Range support to test locally).

## Deploy

Static files, served as-is via GitHub Pages (root of `main`).
