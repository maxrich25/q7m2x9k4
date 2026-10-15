# BLOCK RUN

Main cart. Classic `block-run/` night street at the original NES 256×224 scale: `map/street.png` (purple sky, moon, skyline, brick, stucco shop, CALI wall, sidewalk, road) and `sprites/car.png` (purple lowrider, no logos), copied into this folder. The wrap-blit drawing is the same as classic. Building slices tile in varied order so the drivable strip is longer than one copy-paste.

The world is a 4-block grid of original night streets: east-west Sunset, Santa Monica and Melrose; north-south Western, Normandie and Vermont. Corner signs name both streets. At each intersection you can go left, right or straight while stopped or slow; at the grid edge the turn is forced. Heading changes the skyline — downtown towers east, Hollywood Hills north. Cross traffic sometimes turns onto your street. Pedestrians only cross when no car is coming. All street, skyline and sign art is drawn in-cart in the classic palette.

Hero walk is `HERO_WALK_FRAMES` (`sprites/walk4-*.png`); standing uses classic idle. Peds, plug, and buyers are the classic `thug` / `runner` sheets at the same integer scale, feet on the sidewalk. On-foot depth never crosses the curb. Sound on by default (`SOUND: ON`). Does not modify `block-run/` or import the 2.5D street.

Buy a half at the plug, wait for a text, walk or drive to that spot, ACT to serve. Walk to the lowrider, CAR to enter, P-R-N-D + gas/brake, pull over to get out. Crib to save.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/
