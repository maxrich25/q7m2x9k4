# BLOCK RUN 2.5D

Night-street prototype at [`./block-run-25d/`](./). Gameplay modules here are shared with classic [`../block-run/`](../block-run/) (2D renderer only).

Live: [https://maxrich25.github.io/q7m2x9k4/block-run-25d/](https://maxrich25.github.io/q7m2x9k4/block-run-25d/)

Home-screen / standalone opens go to the **root menu** (not this drone title). Menu → Play adds `play=1` so the cart stays here. Cold opens without that flag bounce to `../`.

Sidewalk stays sparse (no densify / ghost mob). Refs and mockups dump in [`../media/`](../media/).

Idle uses the painted views in `sprites/hero-*.png` (side / front / back / ¾). While walking or running, the classic `walk-1…4` sheet plays stride-synced so he doesn’t skate. Getting in opens the driver door, the left side, not the camera-side passenger door. Pull over only works while you are rolling in drive: the nose arcs toward the curb, then the stick scrolls D→N→R→P under brake. Hold brake to pick Drive, then release brake before it leaves the curb. Red lights stop the bumper on the line. In the car, B is U-turn (not Run). The two lanes are the same width, with a curb on each side. The corner of the screen says v92 when this build is the one running. Cache is v=92.

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`, so iPhone Safari can keep an old copy for ten minutes after a deploy.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js`, `js/sprites.js` — the same relative imports (including `paint.js`)

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
