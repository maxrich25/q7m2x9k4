# BLOCK RUN

The main cart. Phone-first night street at the classic NES size, 256×224.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/

## What's in it

- Street art is the classic `map/street.png` (purple sky, moon, skyline, brick, stucco shop, CALI wall, sidewalk, road). Building slices tile so the block is longer than one copy.
- The world is a 4-block grid. East-west: Sunset, Santa Monica, Melrose. North-south: Western, Normandie, Vermont. Corner signs name both streets. Left, right, or straight at an intersection while stopped or slow. The edge of the grid forces the turn. East shows downtown towers. North shows the Hollywood Hills.
- The car is the classic purple lowrider (`sprites/car.png`), no badges. Getting in blinks you into the seat with a tinted driver already drawn on the car. P-R-N-D, gas, brake, pull over to get out. The game starts parked.
- Hero walk is walk14: 12 frames at 12.5 fps, native 40px, in `sprites/walk14.js`. Standing uses the classic idle. A gold chain with a pendant is drawn on top of every walk frame (`sprites/chain24.js`).
- Peds, the plug, and buyers use the classic thug and runner sheets. Feet stay on the sidewalk. On foot you never cross the curb. Peds only cross when no car is coming. Cross traffic can turn onto your street.
- Buy a half at the plug, wait for a text, walk or drive to that spot, ACT to serve. PHONE shows cash, grams, and texts. CRIB saves and stashes cash. Sound starts on.
- Cache is v=18. This cart does not change `block-run/` and does not import the 2.5D street.

## Saved, not on the car yet

Rim options live in `art/rims/alternates/` (spoke sets in silver, dark, and gold, plus the reference sheets). They are backups to swap in later. The car on screen is still the plain classic lowrider.
