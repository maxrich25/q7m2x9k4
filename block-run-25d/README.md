# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/](https://maxrich25.github.io/q7m2x9k4/block-run-25d/)

Cold open (root + home-screen) lands on this **drone title**. Quiet **Play / More / Back** sit low so the flyover stays visible. Back → root `?menu=1` (2D / 2.5D). Versions Back returns here. Pause only has **TITLE**.

Sidewalk on both sides; bright near-camera grass/bushes under the see-through pad. Sidewalk peds stay sparse. Refs dump in [`../media/`](../media/).

Hero stays on painted `sprites/hero-*.png` art. Walk/run soft-bob the side still (no left/right chop, no NES flicker). Getting in opens the driver door. Pull over only while rolling in drive. In the car, bottom-left is U-turn (on foot: RUN). Corner says v96. Cache is v=96.

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`, so iPhone Safari can keep an old copy for ten minutes after a deploy.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
