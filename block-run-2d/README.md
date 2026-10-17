# BLOCK RUN

The main cart. Phone-first night street at the classic NES size, 256×224.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/?v=24&fresh=clear

v24: home-screen cache bust lives in this cart (not only the root menu). Title
shows `v24` and keeps pad height so the view doesn't stretch. US right-hand
lanes. Soft pull-out / pull-over. Rims composited inside the car (no black
slab/smog). Full street.png tiles. Shorter pad. Compact HUD; QUIT/mute top-right.

## Cache / home-screen

Safari home-screen icons open `manifest.json` `start_url` straight into this
folder. Approving a PR does not instantly clear that icon's cache — this cart
bumps `br_build` and force-reloads once when it sees a stale build. Hard-close
the PWA and reopen, or use Safari with `?v=24&fresh=clear`, if it still sticks.

## What's in it

- Street art is classic `map/street.png` tiled whole (same wrap as the original).
- US right-hand traffic: eastbound near/bottom lane, westbound far/top lane. Park in the curb gutter.
- Purple lowrider + silver rims (composited). D/R creep, U-turn arc, soft curb in/out.
- Hero walk14 + chain. Sidewalk belt. Plug / deals / crib / phone.
- HUD: `$` GRN WHT v24 REP — quit + mute in the top-right chrome.

## Older builds

`versions/` is 2.5D only. There is no separate classic non-shoot archive elsewhere.
This folder is the live non-shoot line.
