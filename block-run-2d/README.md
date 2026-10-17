# BLOCK RUN

The main cart. Phone-first night street at the classic NES size, 256×224.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/?v=23&fresh=clear

v23: title hides the pad (like 2.5D). Faster RUN. D/R creep restored. No
clone traffic while parked. Contiguous street tiles (seamless classic wrap).
Animated U-turn. Softer pull-over. Mute/QUIT stacked above the pad, off the
HUD. GRN + WHT slots; REP label. Park sits on the curb facing down-street.

## What's in it

- Street art is the classic `map/street.png` tiled in order (slices 0→3). The only loop seam is the original art edge — no shuffled split buildings.
- The world is a 4-block grid. East-west: Sunset, Santa Monica, Melrose. North-south: Western, Normandie, Vermont.
- The car is the classic purple lowrider with spinning silver 5-spoke rims. P-R-N-D with real creep, gas, brake, pull over, U-turn arc.
- Hero walk is walk14 + chain24. Sidewalk belt only this pass.
- Buy a half at the plug, wait for a text, ACT to serve. PHONE shows cash, GRN, WHT, texts. CRIB saves and stashes cash.
- Cache is v=23. This cart does not change `block-run/` and does not import the 2.5D street.

## About older builds

`versions/` is a 2.5D time capsule only — there is no separate classic non-shoot archive hiding in a morph folder. This cart (`block-run-2d/`) is the live non-shoot line (v20→v23).
