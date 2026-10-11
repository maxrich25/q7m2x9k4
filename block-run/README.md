# BLOCK RUN (classic 2D)

Flat pixel side-view at [`./block-run/`](./). Same dealing loop as [`../block-run-25d/`](../block-run-25d/) — it imports shared game/config/audio/input/hud from that folder and only draws in 2D.

Live: [https://maxrich25.github.io/q7m2x9k4/block-run/](https://maxrich25.github.io/q7m2x9k4/block-run/)

The original minified cart is kept unused in [`legacy/`](legacy/).

## Cache bust

Bump `?v=` together (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js`, `js/art.js`, `js/draw.js` — relative imports
- And the shared `block-run-25d/js/*` imports (same version)
