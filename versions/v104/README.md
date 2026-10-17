# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=104&fresh=nuke&play=1](https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=104&fresh=nuke&play=1)

Cold open (root + home-screen) lands on this **drone title**. Quiet **Play / More / Back** sit low so the flyover stays visible. Back → root `?menu=1` (2D / 2.5D). Versions Back returns here. Pause only has **TITLE**.

Home-screen freshness: fetch `build.json` with `cache: "no-store"` and register network-first `sw.js`. Gold **v104** badge — force-close + reopen home-screen once after merge. Standalone iPhone caps DPR at 1.25 to avoid freeze. Music scheduler starts on open (iOS still needs a tap to unmute).

Drive pad: bigger brake/gas/shifter, face squares ~3/4. Braked in D → U-TN + PULL on separate squares. Brake freezes mid pull-out; release continues. PULL auto-drives to the curb then parks. Far-side yards stay dark green; crib stucco no spiral lattice.


## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`. Also bump `build.json` `"v"` and `sw.js` `BUILD` with the same number.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
