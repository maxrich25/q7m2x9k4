import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const OUT = "/opt/cursor/artifacts/batch8h";
fs.mkdirSync(OUT, { recursive: true });
const CHROME = "/usr/bin/google-chrome-stable";
const URL = "http://127.0.0.1:8766/block-run-25d/?v=73";
const STRIDE_CYCLE = 6;
const RUN_STRIDE = 10;
const PED_COUNT = 10;

async function waitReady(page) {
  await page.waitForFunction(() => window.__br && window.__br.getState, { timeout: 20000 });
  await page.evaluate(async () => {
    try { localStorage.clear(); } catch {}
    document.fonts && (await document.fonts.ready);
    window.__br.start();
    window.__br.finishIntro();
    window.__br.setMuted?.(false);
  });
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    const st = window.__br.getState();
    if (st.mode === "intro") window.__br.finishIntro();
    const ov = document.getElementById("overlay");
    if (ov) { ov.classList.add("hidden"); ov.style.display = "none"; }
  });
  await page.waitForTimeout(200);
}

async function clearPeds(page) {
  await page.evaluate((n) => {
    for (let i = 0; i < n; i++) {
      // Park every ped far off-camera so walk/facing crops are the player only.
      window.__br.setPedX(i, 2200 + i * 40);
      window.__br.setPedLane?.(i, 0);
    }
  }, PED_COUNT);
}

async function settle(page, ms = 280) {
  await page.waitForTimeout(ms);
}

async function freeze(page) {
  await page.evaluate(() => {
    window.__br.setHold?.(true);
    const ov = document.getElementById("overlay");
    if (ov) { ov.classList.add("hidden"); ov.style.display = "none"; }
  });
  await page.waitForTimeout(40);
}

async function unfreeze(page) {
  await page.evaluate(() => {
    window.__br.setHold?.(false);
    const ov = document.getElementById("overlay");
    if (ov) ov.style.display = "";
  });
}

async function shot(page, name, clip) {
  const file = path.join(OUT, name);
  const opts = { path: file, type: "png" };
  if (clip) opts.clip = clip;
  await page.screenshot(opts);
  return file;
}

async function frozenShot(page, name, clip) {
  await freeze(page);
  await shot(page, name, clip);
  await unfreeze(page);
}

async function withContext(dpr, fn) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: dpr,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitReady(page);
  await fn(page);
  await browser.close();
}

async function main() {
  await withContext(1, async (page) => {
    // 1 character art — idle front, ped beside for shared style
    await clearPeds(page);
    await page.evaluate(() => {
      window.__br.setPlayerX(500);
      window.__br.setFacing(1);
      window.__br.setKeys([]);
      window.__br.setPedX(2, 514);
      window.__br.setPedLane(2, 0.1);
      window.__br.setZoom(0.9);
      window.__br.resetCam?.();
    });
    await settle(page, 500);
    await frozenShot(page, "01-art.png");
    await freeze(page);
    await shot(page, "01-art-close.png", { x: 40, y: 220, width: 310, height: 400 });
    await unfreeze(page);

    // 2 facing — walk profile (no nearby peds)
    await clearPeds(page);
    await page.evaluate(() => {
      window.__br.setPlayerX(420);
      window.__br.setFacing(1);
      window.__br.setKeys(["ArrowRight"]);
      window.__br.setStride(2);
      window.__br.setZoom(1);
      window.__br.resetCam?.();
    });
    await settle(page, 280);
    await frozenShot(page, "02-facing-walk.png");
    await freeze(page);
    await shot(page, "02-facing-walk-close.png", { x: 80, y: 260, width: 230, height: 340 });
    await unfreeze(page);
    await page.evaluate(() => {
      window.__br.setKeys([]);
      window.__br.setFacing(-1);
      window.__br.setKeys(["ArrowLeft"]);
      window.__br.setStride(3);
    });
    await settle(page, 200);
    await frozenShot(page, "02-facing-left.png");
    await page.evaluate(() => window.__br.setKeys([]));
    await settle(page, 220);
    await frozenShot(page, "02-facing-idle.png");

    // 3 walk + run
    await clearPeds(page);
    await page.evaluate(() => {
      window.__br.setPlayerX(450);
      window.__br.setFacing(1);
      window.__br.setKeys(["ArrowRight"]);
      window.__br.setZoom(1);
      window.__br.resetCam?.();
    });
    for (let i = 0; i < 8; i++) {
      await page.evaluate((s) => {
        window.__br.setStride(s);
        window.__br.setKeys(["ArrowRight"]);
      }, i * (STRIDE_CYCLE / 8));
      await settle(page, 70);
      await frozenShot(page, `03-walk-${i}.png`);
    }
    await page.evaluate(() => {
      window.__br.setKeys(["ArrowRight", "ShiftLeft"]);
      window.__br.setStride(0);
    });
    await settle(page, 140);
    for (let i = 0; i < 4; i++) {
      await page.evaluate((s) => {
        window.__br.setStride(s);
        window.__br.setKeys(["ArrowRight", "ShiftLeft"]);
      }, i * (RUN_STRIDE / 4));
      await settle(page, 80);
      await frozenShot(page, `03-run-${i}.png`);
    }
    await freeze(page);
    await shot(page, "03-walk-close.png", { x: 90, y: 260, width: 210, height: 340 });
    await unfreeze(page);
    await page.evaluate(() => window.__br.setKeys([]));

    // 4 palms
    await clearPeds(page);
    await page.evaluate(() => {
      window.__br.setPlayerX(210);
      window.__br.setFacing(1);
      window.__br.setZoom(0.82);
      window.__br.resetCam?.();
    });
    await settle(page, 520);
    await frozenShot(page, "04-palms.png");
    await freeze(page);
    await shot(page, "04-palms-close.png", { x: 100, y: 40, width: 250, height: 440 });
    await unfreeze(page);

    // 5 backdrop + moon behind buildings
    await clearPeds(page);
    await page.evaluate(() => {
      window.__br.setPlayerX(900);
      window.__br.setZoom(1.34);
      window.__br.resetCam?.();
    });
    await settle(page, 500);
    await frozenShot(page, "05-backdrop-far.png");
    await page.evaluate(() => window.__br.setZoom(0.76));
    await settle(page, 380);
    await frozenShot(page, "05-backdrop-close.png");
    await page.evaluate(() => window.__br.setZoom(1));
    await settle(page, 320);
    await frozenShot(page, "05-backdrop.png");
    await freeze(page);
    await shot(page, "05-backdrop-hills.png", { x: 0, y: 40, width: 390, height: 280 });
    await unfreeze(page);

    // 6 HUD
    await page.evaluate(() => {
      window.__br.giveCash(40);
      window.__br.setInv("GREEN", 14);
      window.__br.setInv("WHITE", 3.5);
      window.__br.setRep(4);
      window.__br.setPlayerX(288);
      window.__br.setZoom(1);
    });
    await settle(page, 220);
    await frozenShot(page, "06-hud.png");
    await freeze(page);
    await shot(page, "06-hud-close.png", { x: 0, y: 0, width: 390, height: 70 });
    await unfreeze(page);

    // 7 wheels — park in P; keep pad in layout (opacity 0) so camera aspect stays stable
    await page.evaluate(() => {
      window.__br.setHold?.(false);
      window.__br.setInCar(false);
      window.__br.setBoardT(0);
      window.__br.setInCar(true);
      window.__br.setBoardT(0);
      window.__br.setGear("P");
      window.__br.setCarVx?.(0);
      window.__br.setPlayerX(640);
      window.__br.setFacing(1);
      window.__br.setKeys([]);
      window.__br.setZoom(0.9);
      window.__br.resetCam?.();
      const pad = document.getElementById("pad");
      if (pad) { pad.style.opacity = "0"; pad.style.pointerEvents = "none"; }
      const gb = document.getElementById("gb-sys");
      if (gb) { gb.style.opacity = "0"; gb.style.pointerEvents = "none"; }
    });
    await settle(page, 900);
    const wheelInfo = await page.evaluate(() => {
      const st = window.__br.getState();
      return { inCar: st.inCar, gear: st.car?.gear, lat: st.car?.lat, x: st.car?.x };
    });
    console.log("wheels state", wheelInfo);
    // Don't freeze — hold can skip a world sync tick and drop the car from frame.
    await shot(page, "07-wheels.png");
    // Hub sits near the bottom-center of the parked beater (~y 760).
    await shot(page, "07-wheels-close.png", { x: 90, y: 620, width: 220, height: 200 });
    await page.evaluate(() => {
      const pad = document.getElementById("pad");
      if (pad) { pad.style.opacity = ""; pad.style.pointerEvents = ""; }
      const gb = document.getElementById("gb-sys");
      if (gb) { gb.style.opacity = ""; gb.style.pointerEvents = ""; }
    });

    // 8 crib
    await page.evaluate(() => {
      window.__br.setInCar(false);
      window.__br.setBoardT(0);
      window.__br.setInCrib?.(true);
      window.__br.setCribX?.(0);
      window.__br.setZoom(1);
    });
    await settle(page, 520);
    await frozenShot(page, "08-crib.png");
    await page.evaluate(() => window.__br.setCribX?.(-2.8));
    await settle(page, 360);
    await frozenShot(page, "08-crib-exit.png");
    await freeze(page);
    await shot(page, "08-crib-exit-close.png", { x: 20, y: 60, width: 280, height: 480 });
    await unfreeze(page);
    await page.evaluate(() => window.__br.setCribX?.(2.4));
    await settle(page, 300);
    await frozenShot(page, "08-crib-mirror.png");
    await freeze(page);
    await shot(page, "08-crib-mirror-close.png", { x: 140, y: 80, width: 240, height: 420 });
    await unfreeze(page);
    await page.evaluate(() => {
      window.__br.setZoom(1.3);
      window.__br.setCribX?.(0);
    });
    await settle(page, 340);
    await frozenShot(page, "08-crib-zoom.png");
    await page.evaluate(() => window.__br.setInCrib?.(false));
  });

  // DPR 2 + 3 HUD verification
  for (const dpr of [2, 3]) {
    await withContext(dpr, async (page) => {
      await page.evaluate(() => {
        window.__br.giveCash(40);
        window.__br.setInv("GREEN", 14);
        window.__br.setInv("WHITE", 3.5);
        window.__br.setRep(4);
        window.__br.setPlayerX(288);
        window.__br.setZoom(1);
      });
      await settle(page, 280);
      await frozenShot(page, `06-hud-dpr${dpr}.png`);
      await freeze(page);
      await shot(page, `06-hud-dpr${dpr}-close.png`, { x: 0, y: 0, width: 390, height: 70 });
      await unfreeze(page);
    });
  }

  console.log("wrote", fs.readdirSync(OUT).join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
