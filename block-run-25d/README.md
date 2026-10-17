# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=108&fresh=nuke&play=1](https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=108&fresh=nuke&play=1)

Cold open (root + home-screen) lands on this **drone title**. Quiet **Play / More / Back** sit low so the flyover stays visible. Back → root `?menu=1` (2D / 2.5D). Versions Back returns here. Pause only has **TITLE**.

Home-screen freshness: `build.json` + network-first `sw.js`. Gold **v108**. Force-close home-screen once after merge. iOS still needs a tap for audio; page bg matches the night clear color to cut the black flash.

Pad: bigger BRAKE/GAS/◀▶ + skinnier face foursome; driving layout is PULL | PHONE / EXIT | U-TN.

v108: Bliss-style close hill wall (no sphere sky holes), far-side street behind facades, smooth board/zoom cam on the whip (still 2.5D), tiny neon glows (no giant yellow blocks), traffic gaps, rounded bushes.

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`. Also bump `build.json` `"v"` and `sw.js` `BUILD` with the same number.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
