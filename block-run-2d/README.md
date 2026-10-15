# BLOCK RUN

Main cart. Flat SNES-style belt-scroller (sidewalk + street lanes, parallax, hard pixels). Original sprites from `../block-run/sprites` and `../block-run/map/street.png`. Hero walk is `HERO_WALK_FRAMES` (`sprites/walk4-*.png`); standing uses classic idle. Feet plant on the sidewalk band; on-foot depth never crosses the curb. Integer 2× zoom on phones. Sound on by default (`SOUND: ON`). Does not import the 2.5D street.

Buy a half at the plug, wait for a text, walk or drive to that spot, ACT to serve. Walk to the rust sedan on the sidewalk, CAR to enter, P-R-N-D + gas/brake, pull over to get out. Crib to save.

Hero scale matches the 2.5D on-foot size on an iPhone SE (integer 2× sprite, ~80px). Front/back walk sheets (`walk-front-*.png`, `walk-back-*.png`) load if present.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/
