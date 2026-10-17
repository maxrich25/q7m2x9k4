# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=106&fresh=nuke&play=1](https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=106&fresh=nuke&play=1)

Cold open (root + home-screen) lands on this **drone title**. Quiet **Play / More / Back** sit low so the flyover stays visible. Back → root `?menu=1` (2D / 2.5D). Versions Back returns here. Pause only has **TITLE**.

Home-screen freshness: `build.json` + network-first `sw.js`. Gold **v106**. Force-close home-screen once after merge. iOS still needs a tap for audio; page bg matches the night clear color to cut the black flash.

Pad: on-foot ◀▶ and drive BRAKE/GAS/shifter share one box; face + START/SELECT stay the same height in or out of the car. No double EXIT. v106 unfreezes Safari/home-screen: cheap ridge planes (no SphereGeometry hills), solid-color back street (no canvas brick spam), lighter stucco paint, lower iOS DPR. Warmer facades kept.


## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`. Also bump `build.json` `"v"` and `sw.js` `BUILD` with the same number.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
