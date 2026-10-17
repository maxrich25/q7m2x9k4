# BLOCK RUN

The main cart. Phone-first night street at the classic NES size, 256×224.

Play: https://maxrich25.github.io/q7m2x9k4/block-run-2d/?v=25&fresh=clear

v25: letterboxed NES view (road stays visible). Frosted see-through pad.
Static sky + skyline; scrolling facade / palms only (CALI patched on repeats).
US curb gutter park + 2.5D-style pull-over creep then D→N→R→P climb. MENU
pause sheet holds quit + sound. Compact HUD without REP clutter.

## Cache / home-screen

Safari home-screen icons open `manifest.json` `start_url` straight into this
folder. Approving a PR does not instantly clear that icon's cache — this cart
bumps `br_build` and force-reloads once when it sees a stale build. Hard-close
the PWA and reopen, or use Safari with `?v=25&fresh=clear`, if it still sticks.

## What's in it

- Street art is classic `map/street.png` — sky/skyline static, near buildings scroll.
- US right-hand traffic: eastbound near/bottom lane, westbound far/top lane. Park in the curb gutter.
- Purple lowrider + silver rims (composited). D/R creep, U-turn arc, soft curb in/out + park climb.
- Hero walk14 + chain. Sidewalk belt. Plug / deals / crib / phone.
- HUD: `$` GRN WHT v25 — MENU (pause) for sound + quit.

## Older builds

`versions/` is 2.5D only. There is no separate classic non-shoot archive elsewhere.
This folder is the live non-shoot line.
