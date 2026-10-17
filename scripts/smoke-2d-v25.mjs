import { chromium } from "playwright-core";
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = "/workspace";
const PORT = 8775;
const CHROME = "/usr/bin/google-chrome-stable";
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
      let p = join(ROOT, decodeURIComponent(url.pathname));
      if (p.endsWith("/")) p = join(p, "index.html");
      if (!existsSync(p) || statSync(p).isDirectory()) {
        res.writeHead(404); res.end("missing"); return;
      }
      res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
      res.end(readFileSync(p));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  const server = await serve();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`http://127.0.0.1:${PORT}/block-run-2d/?v=25&fresh=clear`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() => window.__br && window.__br.ready, { timeout: 20000 });
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    window.__br.setMuted(true);
    window.__br.start();
  });
  await page.waitForTimeout(400);

  const base = await page.evaluate(() => {
    const st = window.__br.getState();
    const view = document.getElementById("view").getBoundingClientRect();
    const pad = document.getElementById("pad").getBoundingClientRect();
    const canvas = document.getElementById("game").getBoundingClientRect();
    const menu = document.getElementById("btn-menu");
    const pause = document.getElementById("pause");
    return {
      mode: st.mode,
      nesW: st.nesW,
      nesH: st.nesH,
      hasStreet: st.hasStreet,
      canvasH: Math.round(canvas.height),
      viewH: Math.round(view.height),
      padH: Math.round(pad.height),
      padTranslucent: getComputedStyle(document.getElementById("pad")).backgroundColor.includes("rgba"),
      menuPresent: !!menu && !menu.classList.contains("hidden"),
      pauseHidden: pause?.classList.contains("hidden"),
      carParkY: st.car.z,
      carGear: st.car.gear,
    };
  });

  /* Drive, pull over, wait for park climb. */
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
  await page.waitForTimeout(1200);
  const driving = await page.evaluate(() => {
    const st = window.__br.getState();
    return {
      gear: st.car.gear,
      parked: st.car.parked,
      z: st.car.z,
      vx: st.car.vx,
      pullOutT: st.car.pullOutT,
      laneNear: 0.88,
    };
  });

  await page.evaluate(() => {
    window.__br.setGas(false);
    window.__br.setBrake(false);
    return window.__br.startPullOver();
  });
  await page.waitForTimeout(250);
  const midPull = await page.evaluate(() => {
    const c = window.__br.getState().car;
    return { pullOverT: c.pullOverT, shiftT: c.shiftT, gear: c.gear, z: c.z, vx: c.vx };
  });
  await page.waitForTimeout(2200);
  const parked = await page.evaluate(() => {
    const c = window.__br.getState().car;
    return { gear: c.gear, parked: c.parked, pullOverT: c.pullOverT, shiftT: c.shiftT, z: c.z };
  });

  await page.evaluate(() => window.__br.pause());
  await page.waitForTimeout(80);
  const paused = await page.evaluate(() => {
    const st = window.__br.getState();
    const pause = document.getElementById("pause");
    const sound = document.getElementById("btn-sound");
    return {
      mode: st.mode,
      pauseVisible: pause && !pause.classList.contains("hidden"),
      soundLabel: sound?.textContent || "",
      quit: !!pause?.querySelector('a[href*="menu"]'),
    };
  });
  await page.evaluate(() => window.__br.resume());
  await page.waitForTimeout(80);
  const resumed = await page.evaluate(() => window.__br.getState().mode);

  const roadVisible = base.canvasH > 180 && base.padH >= 160 && base.padH <= 220;
  const notSidewalk = parked.z >= 0.64 && parked.z <= 0.84;
  const ok = !errors.length
    && base.nesW === 256 && base.nesH === 224
    && base.hasStreet
    && roadVisible
    && base.menuPresent
    && driving.gear === "D" && !driving.parked
    && midPull.pullOverT > 0
    && parked.gear === "P" && parked.parked && parked.shiftT <= 0
    && notSidewalk
    && paused.mode === "paused" && paused.pauseVisible && paused.quit
    && resumed === "play";

  console.log(JSON.stringify({
    ok, errors, base, driving, midPull, parked, paused, resumed, roadVisible, notSidewalk,
  }, null, 2));

  await browser.close();
  server.close();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
