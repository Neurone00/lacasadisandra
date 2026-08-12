# lacasadisandra

Mobile-first scroll-driven video tour. Scroll scrubs a vertical walkthrough video room by room (ingresso → cucina → bagno → camera da letto → cabina armadio → studio → soggiorno), each stop gets an animated caption, and reaching the end loops seamlessly back to the entrance.

No build step, no framework: plain HTML/CSS/JS.

- CSS `scroll-snap` gives the per-room "stop"
- `IntersectionObserver` fades captions in/out
- JS maps scroll position → `video.currentTime` (the one thing CSS can't do)
- Section heights are weighted by each room's real duration in the source video, so captions stay in sync with what's on screen

## Run locally

```
cd site && python3 -m http.server 8000
```

Open http://localhost:8000

## Deploy

Static files, served as-is via GitHub Pages (root of `main`).
