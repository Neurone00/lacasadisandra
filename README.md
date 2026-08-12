# lacasadisandra

Mobile-first scroll-driven video tour. Scroll scrubs a vertical walkthrough video room by room (ingresso → cucina → bagno → camera da letto → cabina armadio → studio → soggiorno), each stop gets an animated caption, and reaching the end loops seamlessly back to the entrance.

No build step, no framework: plain HTML/CSS/JS.

- CSS `scroll-snap` gives the per-room "stop"
- `IntersectionObserver` fades captions in/out
- JS maps scroll position → `video.currentTime` (the one thing CSS can't do)
- Section heights are weighted by each room's real duration in the source video, so captions stay in sync with what's on screen
- Each caption is pinned to a hand-picked landmark (a lamp, a clock, a doorframe...) tracked frame-by-frame with optical flow (`tools_track_anchors.py`, one-off script, needs `opencv-python-headless`) → `assets/anchors.json`. The caption fades/scales in centered on that point and follows it as the camera pans. Tracking is lost near a few segment edges (fast whip-pans); those frames just hold the last known position rather than guessing.

## Run locally

```
cd site && python3 -m http.server 8000
```

Open http://localhost:8000. Note: Python's `http.server` doesn't support HTTP Range requests, which Chrome needs to seek the video — scrubbing will silently stay stuck at frame 0. Use any Range-capable static server (GitHub Pages, `npx serve`, etc.) to test scrubbing locally.

## Deploy

Static files, served as-is via GitHub Pages (root of `main`).
