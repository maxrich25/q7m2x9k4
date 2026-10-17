# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=101&fresh=nuke&play=1](https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=101&fresh=nuke&play=1)

Cold open (root + home-screen) lands on this **drone title**. Quiet **Play / More / Back** sit low so the flyover stays visible. Back → root `?menu=1` (2D / 2.5D). Versions Back returns here. Pause only has **TITLE**.

Home-screen freshness: fetch `build.json` with `cache: "no-store"` and register network-first `sw.js`. That stops a cached shell from rewriting `?v=` back to an old build. Gold **v101** badge — if you still see v98/v99 after merge, force-close the home-screen app and reopen once (or delete/re-add the icon).

Sidewalk on both sides; bright near-camera grass/bushes under the see-through pad. Sidewalk peds stay sparse. Refs dump in [`../media/`](../media/).

Cobra-head street lamps both curbs (downward spots + ground pools + near-camera shadows). Night ambient stays low so pools read. Title hides the pad. v101 kills per-pole SpotLights/shadows that froze iPhone; poles+pools stay, 4 shared PointLights follow the camera.

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`. Also bump `build.json` `"v"` and `sw.js` `BUILD` with the same number.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
