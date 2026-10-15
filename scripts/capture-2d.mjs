import { chromium } from "playwright-core";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const OUT = "/opt/cursor/artifacts";
fs.mkdirSync(OUT, { recursive: true });
const CHROME = "/usr/bin/google-chrome-stable";
const PORT = process.env.PORT || "8767";
const ROOT = `http://127.0.0.1:${PORT}/`;
const GAME = `http://127.0.0.1:${PORT}/block-run-2d/?v=14&fresh=clear`;

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, type: "png" });
  return file;
}

async function waitFonts(page) {
  await page.evaluate(async () => {
    try { await document.fonts.ready; } catch {}
  });
  await page.waitForTimeout(300);
}

async function ground(page) {
  return page.evaluate(() => {
    const st = window.__br.getState();
    const g = window.__br.ground();
    const view = document.getElementById("view").getBoundingClientRect();
    const pad = document.getElementById("pad").getBoundingClientRect();
    const canvas = document.getElementById("game").getBoundingClientRect();
    const overlap = !(pad.top >= canvas.bottom - 1 || canvas.top >= pad.bottom - 1);
    return {
      mode: st.mode,
      inCar: st.inCar,
      heroPx: st.heroPx,
      nesW: st.nesW,
      nesH: st.nesH,
      cssScale: st.cssScale,
      spriteScale: st.spriteScale,
      world: st.world,
      streetId: st.streetId,
      streetName: st.streetName,
      heading: st.heading,
      intersectX: st.intersectX,
      exits: st.exits,
      canTurn: st.canTurn,
      hasStreet: st.hasStreet,
      hasCar: st.hasCar,
      player: st.player,
      car: st.car,
      mute: document.getElementById("btn-mute").textContent,
      overlap,
      ground: g,
      onSidewalk: g.footY >= g.walkY && g.footY <= g.curbY,
      belowCurb: g.footY > g.curbY,
      canvas: { top: Math.round(canvas.top), h: Math.round(canvas.height), w: Math.round(canvas.width) },
    };
  });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 1,
    isMobile: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  page.on("pageerror", (err) => console.log("PAGEERROR", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE", msg.text());
  });

  await page.goto(ROOT, { waitUntil: "networkidle" });
  await waitFonts(page);
  const startHref = await page.evaluate(() => document.querySelector("a.start")?.getAttribute("href"));
  console.log("START_HREF", startHref);

  await page.goto(GAME, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__br && window.__br.ready, { timeout: 20000 });
  await waitFonts(page);
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    window.__br.setMuted(false);
  });
  await page.evaluate(() => window.__br.start());
  await page.waitForTimeout(1100);

  await page.evaluate(() => {
    window.__br.setStreet("sunset", 200, "E");
    window.__br.setDepth(0.28);
  });
  await page.waitForTimeout(250);
  const standing = await ground(page);
  console.log("STANDING", JSON.stringify(standing, null, 2));
  await shot(page, "classic_fix_onfoot.png");
  await shot(page, "classic_world_onfoot.png");

  await page.evaluate(() => {
    window.__br.setHold("down", false);
    window.__br.setHold("up", true);
  });
  await page.waitForTimeout(700);
  const walkingUp = await ground(page);
  console.log("WALK_UP", JSON.stringify(walkingUp, null, 2));
  await page.evaluate(() => window.__br.setHold("up", false));
  await page.waitForTimeout(80);

  await page.evaluate(() => window.__br.setHold("down", true));
  await page.waitForTimeout(900);
  const walkingDown = await ground(page);
  console.log("WALK_DOWN", JSON.stringify(walkingDown, null, 2));
  await page.evaluate(() => window.__br.setHold("down", false));

  await page.evaluate(() => {
    window.__br.setStreet("sunset", 250, "E");
    window.__br.setCarX(250);
    window.__br.setPlayerX(250);
    window.__br.setInCar(true);
    window.__br.setBrake(true);
    window.__br.tryShift("D", true);
    window.__br.setBrake(false);
    window.__br.setGas(true);
  });
  await page.waitForTimeout(500);
  const driving = await ground(page);
  console.log("DRIVING", JSON.stringify(driving, null, 2));
  await shot(page, "classic_fix_driving.png");
  await shot(page, "classic_world_driving.png");
  await page.evaluate(() => {
    window.__br.setGas(false);
    window.__br.setBrake(true);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.__br.tryShift("P", true);
    window.__br.setBrake(false);
    window.__br.setInCar(false);
    window.__br.setDepth(0.28);
  });

  await page.evaluate(() => {
    window.__br.setGrams(20);
    window.__br.giveCash(200);
    window.__br.spawnOrder();
    window.__br.acceptOrder();
    const st = window.__br.getState();
    window.__br.setPlayerX(st.orderX - 22);
    window.__br.setDepth(0.30);
  });
  await page.waitForTimeout(300);
  const dealing = await ground(page);
  console.log("DEALING", JSON.stringify(dealing, null, 2));
  await shot(page, "classic_world_dealing.png");

  await page.evaluate(() => {
    const btn = document.querySelector("[data-role='phone']");
    if (btn) btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  await page.waitForTimeout(250);
  await shot(page, "classic_world_phone.png");

  await page.evaluate(() => {
    const btn = document.querySelector("[data-role='phone-close']");
    if (btn) btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    window.__br.setStreet("sunset", 360, "E");
    window.__br.setIntersect("sunset-normandie");
    window.__br.setDepth(0.28);
  });
  await page.waitForTimeout(250);
  const atSign = await ground(page);
  console.log("INTERSECT", JSON.stringify(atSign, null, 2));
  await shot(page, "classic_fix_intersect.png");
  await shot(page, "classic_world_intersect.png");
  await shot(page, "streets_intersect.png");
  await shot(page, "hills_sign_intersect.png");

  await page.evaluate(() => {
    window.__br.setHeading("E");
    window.__br.setStreet("sunset", 400, "E");
  });
  await page.waitForTimeout(250);
  await shot(page, "streets_east_downtown.png");

  await page.evaluate(() => {
    window.__br.setStreet("normandie", 360, "N");
    window.__br.setIntersect("santa_monica-normandie");
  });
  await page.waitForTimeout(250);
  const hills = await ground(page);
  console.log("NORTH", JSON.stringify(hills, null, 2));
  await shot(page, "classic_fix_hills.png");
  await shot(page, "classic_world_hills.png");
  await shot(page, "streets_hills.png");
  await shot(page, "streets_north_hills.png");
  await shot(page, "hills_sign_hills.png");

  await page.evaluate(() => {
    window.__br.setStreet("sunset", 130, "W");
    window.__br.setIntersect("sunset-western");
  });
  await page.waitForTimeout(250);
  const edge = await ground(page);
  console.log("EDGE", JSON.stringify(edge, null, 2));
  await shot(page, "streets_edge.png");

  await page.evaluate(() => window.__br.tryTurn("left"));
  await page.waitForTimeout(400);
  const afterForce = await ground(page);
  console.log("FORCED", JSON.stringify({ streetId: afterForce.streetId, heading: afterForce.heading, exits: afterForce.exits }, null, 2));

  const scaleOk = standing.nesW === 256 && standing.nesH >= 224 && standing.spriteScale === 1
    && standing.hasStreet && standing.hasCar && standing.mute === "SOUND: ON";
  const driveOk = driving.inCar && driving.car && driving.car.gear === "D";
  const dealOk = dealing.mode === "play" && !dealing.inCar;
  const feetFail = [standing, walkingUp, walkingDown, dealing].some((s) => !s.onSidewalk || s.belowCurb || s.overlap);
  if (!scaleOk) {
    console.error("SCALE_FAIL classic 256x224 / street / car / sound checks did not pass");
    process.exit(1);
  }
  if (!driveOk) {
    console.error("DRIVE_FAIL not in gear D");
    process.exit(1);
  }
  if (!dealOk || feetFail) {
    console.error("FEET_FAIL sidewalk checks did not pass");
    process.exit(1);
  }
  if (atSign.streetId !== "sunset" || !atSign.canTurn) {
    console.error("TURN_FAIL not at Sunset & Normandie");
    process.exit(1);
  }
  if (hills.streetId !== "normandie" || hills.heading !== "N" || !hills.onSidewalk) {
    console.error("HILLS_FAIL north heading on Normandie failed");
    process.exit(1);
  }
  if (edge.streetId !== "sunset" || edge.heading !== "W" || !edge.canTurn) {
    console.error("EDGE_FAIL not at Sunset & Western heading west");
    process.exit(1);
  }
  if (afterForce.streetId !== "western" || afterForce.heading !== "S") {
    console.error("FORCE_FAIL west-edge turn did not go south on Western");
    process.exit(1);
  }
  if (standing.canvas.top > 8) {
    console.error("FRAME_FAIL empty band above play view", standing.canvas);
    process.exit(1);
  }
  const pair = spawnSync("python3", ["-"], {
    input: `
from PIL import Image
classic = Image.open("/home/ubuntu/.cursor/projects/workspace/uploads/classic-target_d68c.png").convert("RGB")
ours = Image.open("${path.join(OUT, "classic_fix_onfoot.png")}").convert("RGB")
classic = classic.resize((375, 667), Image.NEAREST)
out = Image.new("RGB", (756, 667), (7, 6, 12))
out.paste(classic, (0, 0))
out.paste(ours, (381, 0))
out.save("${path.join(OUT, "side_by_side_classic.png")}")
print("SIDE_BY_SIDE", out.size)
`,
    encoding: "utf8",
  });
  if (pair.status !== 0) {
    console.error(pair.stderr || pair.stdout);
    console.error("SIDE_FAIL");
    process.exit(1);
  }
  console.log(pair.stdout.trim());
  console.log("CLASSIC_WORLD_OK");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
