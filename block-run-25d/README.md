# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=98&fresh=nuke&play=1](https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=98&fresh=nuke&play=1)

Cold open (root + home-screen) lands on this **drone title**. Quiet **Play / More / Back** sit low so the flyover stays visible. Back → root `?menu=1` (2D / 2.5D). Versions Back returns here. Pause only has **TITLE**.

When the build number changes, the page nukes Cache Storage / service workers and reloads once. The HUD corner shows a gold **v98** badge — if you see an older number (or no badge), you’re on a stale home-screen / Safari cache. Use the live link above, or delete and re-add the home-screen icon.

Sidewalk on both sides; bright near-camera grass/bushes under the see-through pad. Sidewalk peds stay sparse. Refs dump in [`../media/`](../media/).

Hero stays on painted `sprites/hero-*.png` art. Walk/run soft-bob the side still; turnarounds hold side then plant the stride (less stutter). Title Play/More/Back are gold chips (not pad frosted). Pad ~5% larger with Start/Select flush to the edge. Car-enter camera eases. Across-street sidewalk thicker; grass/shrubs textured. Corner says v98. Cache is v=98.

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`, so iPhone Safari can keep an old copy for ten minutes after a deploy.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
