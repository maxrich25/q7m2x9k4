import { chromium } from "playwright-core";
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = "/workspace";
const PORT = 8788;
const CHROME = "/usr/bin/google-chrome-stable";
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
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
  page.on("pageerror", (e) => errors.push(String(e.message || e)));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const bootUrl = page.url();
  const bootOk = /block-run-25d/.test(bootUrl) && /v=111/.test(bootUrl);

  await page.goto(
    `http://127.0.0.1:${PORT}/block-run-25d/?v=111&fresh=nuke&play=1&stay=1`,
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => window.__br && typeof window.__br.getState === "function", {
    timeout: 60000,
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    window.__br.setMuted?.(true);
    window.__br.start?.();
    window.__br.finishIntro?.();
  });
  await page.waitForTimeout(900);

  const walk = await page.evaluate(async () => {
    const br = window.__br;
    br.setInCar?.(false);
    br.setPlayerX?.(300);
    const x0 = br.getState().player.x;
    br.setKeys?.(["KeyD", "ShiftLeft"]);
    await new Promise((r) => setTimeout(r, 1000));
    br.setKeys?.(null);
    const st = br.getState();
    const dist = Math.abs(st.player.x - x0);
    return {
      mode: st.mode,
      inCar: st.inCar,
      dist,
      /* MOVE_SPEED 28 * RUN_MULT 1.28 ≈ 35.8 u/s */
      slowEnough: dist > 10 && dist < 55,
    };
  });

  const uturn = await page.evaluate(() => {
    const br = window.__br;
    br.setInCar?.(true);
    br.setGear?.("D");
    br.setCarVx?.(20);
    br.placeCars?.([]);
    const before = br.getState().car;
    const ok = br.doUTurn?.();
    return {
      called: typeof br.doUTurn === "function",
      ok: !!ok,
      facing: br.getState().car?.facing,
      beforeFacing: before?.facing,
    };
  });

  const ok = !errors.length && bootOk && walk.mode === "play" && walk.slowEnough && uturn.called;
  console.log(JSON.stringify({ ok, errors, bootUrl, bootOk, walk, uturn }, null, 2));
  await browser.close();
  server.close();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
