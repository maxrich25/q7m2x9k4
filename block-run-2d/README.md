# BLOCK RUN

Main cart. Classic `block-run/` night street at the original NES 256×224 scale: `map/street.png` (purple sky, moon, skyline, brick, stucco shop, CALI wall, sidewalk, road) and `sprites/car.png` (purple lowrider, no logos), copied into this folder. The wrap-blit drawing is the same as classic. Building slices tile in varied order so the drivable strip is longer than one copy-paste.

The world is a data-driven list of named streets joined at intersections. CALI ST is the dressed first strip. HILLS ST is a second street whose backdrop (rolling hills, houses, same night palette) is drawn in-cart — no third-party art. A pixel street-sign pole marks each intersection; press up or down while stopped or slow to load the cross street.

Hero walk is `HERO_WALK_FRAMES` (`sprites/walk4-*.png`); standing uses classic idle. Peds, plug, and buyers are the classic `thug` / `runner` sheets at the same integer scale, feet on the sidewalk. On-foot depth never crosses the curb. Sound on by default (`SOUND: ON`). Does not modify `block-run/` or import the 2.5D street.

Buy a half at the plug, wait for a text, walk or drive to that spot, ACT to serve. Walk to the lowrider, CAR to enter, P-R-N-D + gas/brake, pull over to get out. Crib to save.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/
