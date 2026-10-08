// Renders the kitchen ticket exactly as the browser prints it (print media), to PNG and PDF.
//   KITCHEN_PW=... node demo/tools/kot-preview.mjs 786 784 785
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { browser, staffLogin } from "./shoot.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots", "03-kitchen");
mkdirSync(OUT, { recursive: true });
const names = { 786: "delivery", 784: "takeaway-quantity-and-notes", 785: "dine-in-extra-and-note", 783: "dine-in", 781: "takeaway" };
const orders = process.argv.slice(2);
const b = await browser(9800 + Math.floor(Math.random() * 100));
try {
  await staffLogin(b, "kitchen.demo@platter-cafe.test", process.env.KITCHEN_PW);
  await b.viewport(1366, 900);
  await b.go("/kitchen", { settle: 3500 });
  let n = 7;
  for (const no of orders) {
    await b.ev(`window.print = () => {}`); // preview only: do not open the print dialog
    const ok = await b.ev(`(()=>{const li=[...document.querySelectorAll('li')].find(l=>l.innerText.includes('#${no}')&&l.querySelector('button'));if(!li)return false;const btn=[...li.querySelectorAll('button')].find(x=>x.innerText.trim()==='Print KOT');if(!btn)return false;btn.click();return true})()`);
    if (!ok) { console.log("order", no, "not found on the board"); continue; }
    await b.sleep(600);
    await b.send("Emulation.setEmulatedMedia", { media: "print", features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }] });
    await b.ev(`document.head.insertAdjacentHTML('beforeend','<style id=pv>html,body{background:#fff!important}</style>')`);
    await b.sleep(400);
    const r = JSON.parse(await b.ev(`(()=>{const r=document.querySelector('.kot').getBoundingClientRect();return JSON.stringify({x:r.x,y:r.y+scrollY,w:r.width,h:r.height})})()`));
    const name = `${String(n).padStart(2, "0")}-kot-ticket-${names[no] ?? no}`;
    const pad = 12;
    const png = await b.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + pad * 2, height: r.h + pad * 2, scale: 3 } });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(png.data, "base64"));
    // The same ticket as a receipt-sized PDF (80 mm wide, as long as the ticket is).
    const pdf = await b.send("Page.printToPDF", { printBackground: true, paperWidth: 80 / 25.4, paperHeight: (r.h + 24) / 96, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    writeFileSync(join(OUT, `${name}.pdf`), Buffer.from(pdf.data, "base64"));
    console.log("saved", name, `ticket ${Math.round(r.w / 3.78)}mm x ${Math.round(r.h / 3.78)}mm`);
    n++;
    // back to the screen view for the next order
    await b.send("Emulation.setEmulatedMedia", { media: "", features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }] });
    await b.ev(`document.getElementById('pv')?.remove();window.dispatchEvent(new Event('afterprint'))`);
    await b.sleep(500);
  }
} finally {
  await b.close();
}
