// Takes the demo screenshots. Drives a real headless Chrome over the DevTools protocol and saves PNGs into demo/screenshots.
//   node demo/tools/shoot.mjs <role>        role = owner | manager | kitchen | customer
// Logins come from environment variables (SHOT_OWNER_PW, SHOT_MANAGER_PW, SHOT_KITCHEN_PW, SHOT_CUSTOMER_PW); nothing is stored here.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function browser(port = 9333, scheme = process.env.SCHEME || "light") {
  const dir = mkdtempSync(join(tmpdir(), "shoot-"));
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--hide-scrollbars", "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });
  let page;
  for (let i = 0; i < 60 && !page; i++) {
    await sleep(500);
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* still starting */ }
  }
  if (!page) throw new Error("Chrome did not start");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
    else if (d.method) waiters.forEach((w) => w(d));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  await send("Network.enable");
  // Hide Next's dev-only badge ("N", "1 Issue") so it never appears in a screenshot.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='nextjs-portal{display:none!important}';document.head.appendChild(s)})` });
  // Reduced motion shows every animation in its finished state, so screenshots are never caught mid-fade.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: scheme }] });

  const ev = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
    return r.result.value;
  };
  let cur = { width: 1440, height: 900, mobile: false, dpr: 1 };
  const viewport = (width, height, mobile = false, dpr = 1) => { cur = { width, height, mobile, dpr }; return send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile }); };

  async function go(path, { settle = 1500 } = {}) {
    const loaded = new Promise((r) => { const w = (d) => { if (d.method === "Page.loadEventFired") { waiters.splice(waiters.indexOf(w), 1); r(); } }; waiters.push(w); });
    await send("Page.navigate", { url: path.startsWith("http") ? path : BASE + path });
    await Promise.race([loaded, sleep(60000)]);
    // The dev server compiles each page the first time it is opened; wait until real content is on screen.
    for (let i = 0; i < 60; i++) {
      const ok = await ev(`document.body && document.body.innerText.trim().length > 40 && !document.body.innerText.includes('Compiling')`).catch(() => false);
      if (ok) break;
      await sleep(500);
    }
    await sleep(settle);
  }

  // Scroll the whole page once so scroll-reveal sections and lazy images load, then wait for images.
  async function warm() {
    await ev(`(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=Math.max(300,innerHeight*0.7)){scrollTo(0,y);await new Promise(r=>setTimeout(r,140))}scrollTo(0,0);await new Promise(r=>setTimeout(r,300))})()`);
    for (let i = 0; i < 40; i++) {
      if (await ev(`[...document.images].every(i=>i.complete)`)) break;
      await sleep(300);
    }
    await sleep(400);
  }

  async function shot(folder, name, { full = true, maxH = 7000, stretch = false } = {}) {
    mkdirSync(join(OUT, folder), { recursive: true });
    if (full) await warm();
    // Never photograph a half-loaded picture.
    for (let i = 0; i < 40; i++) { if (await ev(`[...document.images].every(i=>i.complete)`)) break; await sleep(300); }
    await sleep(500);
    let clip;
    if (full && stretch) {
      // Back-office pages: make the window as tall as the page so the sidebar runs the full height, then capture what is on screen.
      const m = await send("Page.getLayoutMetrics");
      const h = Math.min(maxH, Math.ceil(m.cssContentSize.height));
      await send("Emulation.setDeviceMetricsOverride", { width: cur.width, height: h, deviceScaleFactor: cur.dpr, mobile: cur.mobile });
      await sleep(700);
      const r = await send("Page.captureScreenshot", { format: "png" });
      await send("Emulation.setDeviceMetricsOverride", { width: cur.width, height: cur.height, deviceScaleFactor: cur.dpr, mobile: cur.mobile });
      writeFileSync(join(OUT, folder, `${name}.png`), Buffer.from(r.data, "base64"));
      console.log("saved", `${folder}/${name}.png`);
      return;
    }
    if (full) {
      const m = await send("Page.getLayoutMetrics");
      clip = { x: 0, y: 0, width: Math.ceil(m.cssContentSize.width), height: Math.min(maxH, Math.ceil(m.cssContentSize.height)), scale: 1 };
    }
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: full, ...(clip ? { clip } : {}) });
    writeFileSync(join(OUT, folder, `${name}.png`), Buffer.from(r.data, "base64"));
    console.log("saved", `${folder}/${name}.png`);
  }

  async function type(selector, text) {
    await ev(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await send("Input.insertText", { text });
  }
  async function enter() {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  }
  async function waitPath(test, ms = 30000) {
    const t = Date.now();
    while (Date.now() - t < ms) { if (await ev(`(${test})(location.pathname + location.search)`)) return true; await sleep(400); }
    return false;
  }
  const click = (selectorOrText) => ev(`(()=>{const q=${JSON.stringify(selectorOrText)};let el=document.querySelector(q);if(!el)el=[...document.querySelectorAll('button,a')].find(b=>b.innerText.trim().toLowerCase().includes(q.toLowerCase()));if(!el)return false;el.click();return true})()`);

  async function close() {
    try { ws.close(); } catch { /* already closed */ }
    proc.kill();
    await sleep(600);
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* profile still locked: harmless temp folder */ }
  }
  return { send, ev, go, shot, type, enter, click, waitPath, viewport, sleep, close, BASE };
}

export async function staffLogin(b, email, pw) {
  await b.go("/admin/login", { settle: 2500 });
  await b.type("input[type=email]", email);
  await b.type("input[type=password]", pw);
  await b.enter();
  if (!(await b.waitPath(`(p)=>!p.startsWith('/admin/login')`))) throw new Error("Staff sign-in did not complete for " + email);
}
