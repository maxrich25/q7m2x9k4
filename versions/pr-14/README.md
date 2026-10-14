# BLOCK RUN 2.5D

Night-street prototype at [`/block-run-25d/`](https://maxrich25.github.io/pixel-sandbox/block-run-25d/). Arcade rules stay in this folder; the original cart is [`block-run/`](../block-run/).

## Cache bust

GitHub Pages sends `Cache-Control: max-age=600`, so iPhone Safari can keep an old copy for ten minutes after a deploy.

On each change, bump the version query `?v=` (keep every copy identical) in:

- `index.html` — `style.css?v=` and `js/main.js?v=`
- `js/main.js` — every `from "./….js?v="`
- `js/game.js`, `js/world.js`, `js/hud.js`, `js/input.js` — the same relative imports

Leave the Three.js CDN import (`from "three"`) alone. Search the folder for `?v=` so none are missed.
