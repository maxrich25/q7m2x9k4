# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=110&fresh=nuke&play=1](https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=110&fresh=nuke&play=1)

Active playtest cart is currently **2D** — cold open / home-screen land on the 2D title. Opening **2.5D** from the menu (`?stay=1`) still hits this **drone title**. Quiet **Play / More / Back** sit low so the flyover stays visible. Back → root picker. Standalone icons that still open this page bounce to 2D unless `stay=1`. Pause only has **TITLE**.

Home-screen freshness: `build.json` + network-first `sw.js`. Gold **v110**. Force-close home-screen once after merge. iOS still needs a tap for audio; page bg matches the night clear color to cut the black flash.

Pad: bigger BRAKE/GAS/◀▶ + skinnier face foursome; driving layout is EXIT/PULL | PHONE / blank | U-TN.

v110: solid hill wall (no hollow fog / palm eat), tighter drive cam on the whip, wider strip so curb-parked cars don't force a full left-lane pass, lights face drivers, ped crosswalk strips + camera spur, progressive brake into the line, no pull-out into red, soft nose bumps, EXIT stays top-left in the whip.

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`. Also bump `build.json` `"v"` and `sw.js` `BUILD` with the same number.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
