# BLOCK RUN 2.5D — Version time capsule

Static snapshots of `block-run-25d/` from each merged playtest PR, newest first on [index.html](./index.html).

## Play an old build

Open `/versions/` (or tap **VERSIONS** on the main menu / pause screen), then pick a PR. Each archive is self-contained for GitHub Pages and uses a separate `localStorage` key prefix (`br25d-pr<N>-…`) so saves never collide with the live game.

## Add a snapshot (manual)

After a batch PR merges to `main`:

```bash
node scripts/snapshot-25d-version.mjs --from-pr <N>
git add versions/
git commit -m "chore: snapshot block-run-25d for PR #<N>"
```

Or with explicit fields:

```bash
node scripts/snapshot-25d-version.mjs \
  --pr 48 \
  --sha <mergeSha> \
  --date 2026-10-14 \
  --note "batch 11: HUD, camera, park, face grid"
```

## Automatic (GitHub Actions)

`.github/workflows/snapshot-25d-version.yml` runs on pushes to `main` that touch `block-run-25d/**`. It resolves the merged PR for that commit, runs the snapshot script, and commits `versions/pr-<N>/` plus `manifest.json`.
