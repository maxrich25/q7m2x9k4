# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=103&fresh=nuke&play=1](https://maxrich25.github.io/q7m2x9k4/block-run-25d/?v=103&fresh=nuke&play=1)

Cold open (root + home-screen) lands on this **drone title**. Quiet **Play / More / Back** sit low so the flyover stays visible. Back → root `?menu=1` (2D / 2.5D). Versions Back returns here. Pause only has **TITLE**.

Home-screen freshness: fetch `build.json` with `cache: "no-store"` and register network-first `sw.js`. That stops a cached shell from rewriting `?v=` back to an old build. Gold **v103** badge — force-close + reopen the home-screen app once after merge (no need to delete/re-add for the game shell). Icon URLs are versioned (`*-v103.png`) so many devices refresh the mark without re-adding; iOS sometimes still sticks on the old icon until a re-add.

Sidewalk on both sides; dark-green Lambert grass both curbs (not black). Palms sit on planting strips, not mid-sidewalk. Pad: on-foot arrows no longer sit under brake/gas while driving.

Cobra poles (~2×) with tight pools — no stadium floods. Crib is warm stucco set back from the curb with a wood door (lamp cleared off the stoop). Intersections get a visual cross-street + crosswalk (turns still later). More lists v102…v98 plus older PR batches.

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`. Also bump `build.json` `"v"` and `sw.js` `BUILD` with the same number.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
