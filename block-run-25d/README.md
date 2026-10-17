# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=111&fresh=nuke&play=1](https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=111&fresh=nuke&play=1)

Active playtest cart is **2.5D** — cold open / home-screen land on this drone title. Classic 2D stays on the root picker (`?menu=1`). Pause only has **TITLE**.

Home-screen freshness: `build.json` + network-first `sw.js`. Gold **v111**. Force-close home-screen once after merge. iOS still needs a tap for audio; page bg matches the night clear color to cut the black flash.

Pad: bigger BRAKE/GAS/◀▶ + skinnier face foursome; driving layout is EXIT/PULL | PHONE / blank | U-TN.

v111: boot/PWA back on 2.5D. Slower on-foot / run so deals push you into the whip. Meet spots spread around the loop. U-turn WAIT only when the far lane pocket is actually busy.

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`. Also bump `build.json` `"v"` and `sw.js` `BUILD` with the same number.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
