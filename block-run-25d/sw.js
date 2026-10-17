/* BLOCK RUN — network-first so home-screen / GH Pages don't stick on an old shell. */
const BUILD = "111";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open("br-" + BUILD).then((c) => c.addAll([
    "./build.json",
  ]).catch(() => {})));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== "br-" + BUILD).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === "navigate"
    || url.pathname.endsWith(".html")
    || /\/block-run-25d\/?$/.test(url.pathname);
  const isBuild = url.pathname.endsWith("/build.json");
  const isBusted = url.searchParams.has("v") || isBuild;

  if (isDoc || isBuild || isBusted) {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => caches.match(req)),
    );
  }
});
