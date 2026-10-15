# BLOCK RUN

Main cart. Flat SNES-style belt-scroller (sidewalk + street lanes, parallax, hard pixels). Original sprites from `../block-run/sprites` and `../block-run/map/street.png`. Hero walk is the `HERO_WALK_FRAMES` path list in `game.js` — classic `../block-run/sprites/walk-1..4.png`, unchanged. Integer 2× zoom on phones so the hero reads ~80–90px, not ants. Sound on by default (`SOUND: ON`). Does not import the 2.5D street.

Buy a half at the plug, wait for a text, walk or drive to that spot, ACT to serve. Walk off the curb to the rust sedan, CAR to enter, P-R-N-D + gas/brake, pull over to get out. Crib to save.

Hero scale matches the 2.5D on-foot size on an iPhone SE (integer 2× sprite, ~80px). Front/back walk sheets (`walk-front-*.png`, `walk-back-*.png`) load if present.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/
