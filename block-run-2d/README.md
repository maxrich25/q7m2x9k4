# BLOCK RUN

The main cart. Phone-first night street at the classic NES size, 256×224.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/?v=22&fresh=clear

v22: D follows the nose (car art faces left — draw flip fixed). No creep.
Shifter knob slides while you drag. Soft park depth (no curb snap). Parked
whip is not a wall. Rims cleaned. Traffic is plain (no tint aura), spawns
behind, one car. Street strip ~4× longer with wrap blit + camScroll so the
moon doesn't jump. HUD: QUIT left, mute mid, $ / GRN / v22. Pad mirrors 2.5D.

## What's in it

- Street art is the classic `map/street.png` (purple sky, moon, skyline, brick, stucco shop, CALI wall, sidewalk, road). Building slices tile so the block is longer than one copy.
- The world is a 4-block grid. East-west: Sunset, Santa Monica, Melrose. North-south: Western, Normandie, Vermont. Corner signs name both streets. Left, right, or straight at an intersection while stopped or slow. The edge of the grid forces the turn. East shows downtown towers. North shows the Hollywood Hills.
- The car is the classic purple lowrider (`sprites/car.png`) with spinning silver 5-spoke rims. Getting in blinks you into the seat with a tinted driver already drawn on the car. P-R-N-D, gas, brake, pull over to get out. The game starts parked.
- Hero walk is walk14: 12 frames at 12.5 fps, native 40px, in `sprites/walk14.js`. Standing uses the classic idle. A gold chain with a pendant is drawn on top of every walk frame (`sprites/chain24.js`).
- Peds, the plug, and buyers use the classic thug and runner sheets. Feet stay on the sidewalk. On foot you never cross the curb. Peds walk past the parked whip; only moving cars make them wait.
- Buy a half at the plug, wait for a text, walk or drive to that spot, ACT to serve. PHONE shows cash, grams, and texts. CRIB saves and stashes cash. Sound starts on.
- Cache is v=22. This cart does not change `block-run/` and does not import the 2.5D street.

## Saved, not on the car yet

Rim options live in `art/rims/alternates/` (spoke sets in silver, dark, and gold, plus the reference sheets). Active set is `5spoke-option1-MAIN/silver`.
