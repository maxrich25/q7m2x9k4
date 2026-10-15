import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const OUT = "/opt/cursor/artifacts";
fs.mkdirSync(OUT, { recursive: true });
const CHROME = "/usr/bin/google-chrome-stable";
const PORT = process.env.PORT || "8767";
const ROOT = `http://127.0.0.1:${PORT}/`;
const GAME = `http://127.0.0.1:${PORT}/block-run-2d/?v=5`;

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
  await shot(page, "title_root_start.png");
  await page.click("#btn-more");
  await page.waitForTimeout(200);
  await shot(page, "title_root_more.png");

  await page.goto(GAME, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__br && window.__br.ready, { timeout: 20000 });
  await waitFonts(page);
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    window.__br.setMuted(true);
  });
  await page.waitForTimeout(200);
  await shot(page, "title_game.png");

  await page.evaluate(() => window.__br.start());
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__br.setHold("right", true));
  await page.waitForTimeout(320);
  const onFoot = await page.evaluate(() => {
    const st = window.__br.getState();
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
      car: st.car,
      player: st.player,
      view: { w: Math.round(view.width), h: Math.round(view.height) },
      pad: { top: Math.round(pad.top), h: Math.round(pad.height) },
      canvas: { w: Math.round(canvas.width), h: Math.round(canvas.height), bottom: Math.round(canvas.bottom) },
      overlap,
    };
  });
  console.log("ONFOOT", JSON.stringify(onFoot, null, 2));
  await shot(page, "ingame_on_foot.png");

  await page.evaluate(() => {
    const st = window.__br.getState();
    window.__br.setPlayerX(st.car.x);
    window.__br.setDepth(0.7);
    window.__br.setInCar(true);
    window.__br.setBrake(true);
    window.__br.tryShift("D", true);
    window.__br.setBrake(false);
    window.__br.setGas(true);
  });
  await page.waitForTimeout(700);
  const driving = await page.evaluate(() => {
    const st = window.__br.getState();
    const padCar = document.getElementById("pad-car");
    const padFoot = document.getElementById("pad-foot");
    return {
      mode: st.mode,
      inCar: st.inCar,
      gear: st.car.gear,
      vx: st.car.vx,
      parked: st.car.parked,
      car: st.car,
      padCarHidden: padCar.classList.contains("hidden"),
      padFootHidden: padFoot.classList.contains("hidden"),
    };
  });
  console.log("DRIVING", JSON.stringify(driving, null, 2));
  await shot(page, "ingame_driving.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
