import fs from "node:fs";
import vm from "node:vm";

const ORIGIN = "https://ummahflow.com";

function runWorker(file) {
  const listeners = new Map();
  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    registration: { scope: `${ORIGIN}/`, navigationPreload: { enable() {}, disable() {} } },
    clients: { claim() {}, matchAll: async () => [], openWindow: async () => null },
    skipWaiting() {},
    importScripts() {},
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    caches: {
      open: async () => ({ match: async () => undefined, put: async () => {}, keys: async () => [] }),
      keys: async () => [],
      match: async () => undefined,
      delete: async () => false,
    },
    fetch: async () => new Response("{}", { status: 200 }),
    __SW_MANIFEST: undefined,
  };
  self.self = self;
  const sandbox = {
    self,
    location: self.location,
    registration: self.registration,
    clients: self.clients,
    caches: self.caches,
    fetch: self.fetch,
    URL,
    Request,
    Response,
    Headers,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    indexedDB: undefined,
    ServiceWorkerGlobalScope: function () {},
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return { listeners, self };
}

const URLS = [
  "https://api.iconify.design/lucide.json?icons=share-2",
  "https://api.unisvg.com/mdi.json?icons=instagram",
  "https://api.simplesvg.com/entypo.json?icons=old-phone",
];

async function intercepts(file, url) {
  const { listeners } = runWorker(file);
  const fetchListeners = listeners.get("fetch") ?? [];
  if (fetchListeners.length === 0) return { intercepted: false, note: "no fetch listener" };
  let responded = false;
  const event = {
    request: new Request(url, { method: "GET" }),
    respondWith(p) {
      responded = true;
      Promise.resolve(p).catch(() => {});
    },
    waitUntil(p) {
      Promise.resolve(p).catch(() => {});
    },
    preloadResponse: Promise.resolve(undefined),
  };
  for (const fn of fetchListeners) fn(event);
  return { intercepted: responded };
}

for (const file of ["public/sw.js", "public/sw-default.js", "public/sw-iconify.js"]) {
  console.log(`\n===== ${file} =====`);
  for (const url of URLS) {
    try {
      const r = await intercepts(file, url);
      console.log(`  ${url.split("/")[2].padEnd(22)} intercepted=${r.intercepted}${r.note ? ` (${r.note})` : ""}`);
    } catch (e) {
      console.log(`  ${url.split("/")[2].padEnd(22)} ERROR: ${e.message}`);
    }
  }
  // sanity: a same-origin precached doc should still be intercepted
  try {
    const r = await intercepts(file, `${ORIGIN}/offline.html`);
    console.log(`  (control) same-origin /offline.html intercepted=${r.intercepted}`);
  } catch (e) {
    console.log(`  (control) ERROR: ${e.message}`);
  }
}
