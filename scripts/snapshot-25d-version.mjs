#!/usr/bin/env node
/**
 * Snapshot block-run-25d/ from a merge commit into versions/pr-<N>/.
 *
 * Usage:
 *   node scripts/snapshot-25d-version.mjs --pr 48 --sha <mergeSha> --date 2026-10-14 --note "batch 11 notes"
 *   node scripts/snapshot-25d-version.mjs --from-pr 48
 *
 * On merge to main, the GitHub Action calls this automatically.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: root, encoding: "utf8", ...opts });
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      out[k] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    }
  }
  return out;
}

function ghPr(n) {
  const raw = sh("gh", ["pr", "view", String(n), "--json", "number,title,mergedAt,mergeCommit,state"]);
  return JSON.parse(raw);
}

function isolateKeys(configPath, pr) {
  if (!fs.existsSync(configPath)) return;
  let txt = fs.readFileSync(configPath, "utf8");
  const prefix = `br25d-pr${pr}-`;
  for (const key of ["SAVE_KEY", "ZOOM_KEY", "ZOOM_MED_KEY", "ZOOM_CONT_KEY", "HI_KEY"]) {
    const re = new RegExp(`export const ${key} = "([^"]+)"`);
    const m = txt.match(re);
    if (!m) continue;
    const old = m[1];
    if (old.startsWith("br25d-pr")) continue;
    txt = txt.replace(m[0], `export const ${key} = "${prefix}${old}"`);
  }
  fs.writeFileSync(configPath, txt);
}

function injectBackLink(indexPath) {
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, "utf8");
  if (html.includes("back-versions")) return;
  const back =
    '<a id="back-versions" href="../" style="position:fixed;top:calc(8px + env(safe-area-inset-top));right:calc(8px + env(safe-area-inset-right));z-index:99;font:7px/1 \'Press Start 2P\',monospace;color:#3de0ff;text-decoration:none;background:rgba(7,6,12,.72);padding:8px 10px;border:2px solid #3a3644;pointer-events:auto">◀ VERSIONS</a>\n';
  html = html.replace(/<body([^>]*)>/i, `<body$1>\n${back}`);
  fs.writeFileSync(indexPath, html);
}

function noteFromTitle(title) {
  let note = String(title || "");
  for (const prefix of [
    "2.5D playtest batch ",
    "2.5D playtest: ",
    "2.5D: ",
    "Playtest: ",
    "Playtest ",
  ]) {
    if (note.startsWith(prefix)) {
      note = note.slice(prefix.length);
      break;
    }
  }
  if (note.includes("(v=")) note = note.split("(v=")[0].trim();
  note = note.replace(/\.$/, "").trim();
  if (note.length > 72) note = note.slice(0, 69) + "...";
  return note || title;
}

function updateManifest(entry) {
  const manifestPath = path.join(root, "versions", "manifest.json");
  let data = { versions: [] };
  if (fs.existsSync(manifestPath)) {
    data = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  }
  data.versions = (data.versions || []).filter((v) => v.pr !== entry.pr);
  data.versions.push(entry);
  data.versions.sort((a, b) => b.pr - a.pr);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2) + "\n");
}

function snapshot({ pr, sha, date, note }) {
  const dest = path.join(root, "versions", `pr-${pr}`);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  const tar = sh("git", ["archive", sha, "block-run-25d"], { encoding: "buffer" });
  fs.writeFileSync("/tmp/br25d-snap.tar", tar);
  sh("tar", ["-xf", "/tmp/br25d-snap.tar", "-C", dest, "--strip-components=1"]);

  injectBackLink(path.join(dest, "index.html"));
  isolateKeys(path.join(dest, "js", "config.js"), pr);

  updateManifest({
    pr: Number(pr),
    date,
    note,
    path: `pr-${pr}/`,
    sha: String(sha).slice(0, 12),
  });
  console.log(`snapshotted versions/pr-${pr}/ (${note})`);
}

const args = parseArgs(process.argv);
let pr = args.pr || args["from-pr"];
let sha = args.sha;
let date = args.date;
let note = args.note;

if (!pr) {
  console.error("Usage: node scripts/snapshot-25d-version.mjs --pr <N> [--sha <sha>] [--date YYYY-MM-DD] [--note \"...\"]");
  process.exit(1);
}

if (args["from-pr"] || !sha || !date || !note) {
  const info = ghPr(pr);
  if (info.state !== "MERGED" && !sha) {
    console.error(`PR #${pr} is not merged yet`);
    process.exit(1);
  }
  sha = sha || info.mergeCommit?.oid;
  date = date || (info.mergedAt || new Date().toISOString()).slice(0, 10);
  note = note || noteFromTitle(info.title);
}

if (!sha) {
  console.error("Missing merge SHA");
  process.exit(1);
}

// Ensure the path existed at that commit
try {
  sh("git", ["cat-file", "-e", `${sha}:block-run-25d`]);
} catch {
  console.error(`Commit ${sha} has no block-run-25d/`);
  process.exit(1);
}

snapshot({ pr: Number(pr), sha, date, note });
