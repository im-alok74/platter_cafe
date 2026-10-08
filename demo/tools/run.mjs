// node demo/tools/run.mjs <owner|manager|kitchen|customer>   (needs the dev server on http://localhost:3000)
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { browser, staffLogin } from "./shoot.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots");
const POHA = "e63b66ff-490c-4701-894e-801c1c4c346a"; // a dish with a photo, for the dish editor
const TABLE = "AQ4Px9x2";
// Demo orders in each stage (see demo/README.md): used for the customer tracker screens.
const TRACK = { received: "bf71f5bc-1479-4e42-835e-16a43124aeb9", delivery: "8ba92ebd-6d98-4cce-9180-fd7222ef3983", preparing: "0c19429b-77e1-4695-92f0-f99e35b1e429", ready: "c99365e3-7202-4379-ae19-f77e6714cc96", served: "8ae98c79-4727-4420-9e68-67bf13ca82fd" };
const pw = (k) => process.env[k] || (() => { throw new Error(`${k} is not set`); })();

/** Pages every back-office role can open, shot the same way. */
async function adminPages(b, F, list) {
  for (const [path, name, opts] of list) {
    await b.go(path, { settle: 2200 });
    await b.shot(F, name, { stretch: true, ...opts });
  }
}

const roles = {
  async owner(b) {
    await staffLogin(b, "owner.demo@platter-cafe.test", pw("SHOT_OWNER_PW"));
    await b.viewport(1440, 900);
    const F = "01-owner";
    await adminPages(b, F, [
      ["/admin?days=7", "01-dashboard-7-days"],
      ["/admin?days=14", "02-dashboard-14-days"],
      ["/admin?days=30", "03-dashboard-30-days"],
      ["/admin/orders", "04-orders-today"],
      ["/admin/orders?range=week", "05-orders-last-7-days"],
    ]);
    // An order row opened to show its dishes, payment, phone and note.
    await b.go("/admin/orders?range=week", { settle: 2500 });
    await b.click("button[aria-expanded]");
    await b.sleep(700);
    await b.shot(F, "06-orders-one-order-opened", { stretch: true });
    await adminPages(b, F, [
      ["/admin/orders?range=month&type=delivery&status=served", "07-orders-filter-delivery-served"],
      ["/admin/orders?range=month&status=cancelled", "08-orders-filter-cancelled"],
      ["/admin/orders?range=month&q=Aarav", "09-orders-search-by-name"],
      ["/admin/orders?range=month&page=3", "10-orders-page-3-of-many"],
      ["/admin/menu", "11-menu-and-photos"],
      [`/admin/menu/${POHA}`, "12-edit-dish-photo-and-details"],
      ["/admin/categories", "13-categories"],
      ["/admin/addons", "14-addons"],
      ["/admin/delivery", "15-delivery-rates"],
      ["/admin/tables", "16-tables-and-qr"],
      ["/admin/print", "17-print-qr-codes"],
      ["/admin/design", "18-design-choose-look"],
      ["/admin/staff", "19-staff-accounts"],
      ["/admin/audit", "20-audit-log"],
      ["/admin/password", "21-change-password"],
    ]);
    // The CSV the accountant would open, as a real file (first 60 lines).
    await b.go("/admin/orders", { settle: 1000 });
    const csv = await b.ev(`fetch('/admin/orders/export?range=month').then(r=>r.text())`);
    mkdirSync(join(OUT, F), { recursive: true });
    writeFileSync(join(OUT, F, "orders-export-sample.csv"), csv.split("\r\n").slice(0, 60).join("\r\n"));
    console.log("saved orders-export-sample.csv");
  },

  async manager(b) {
    await staffLogin(b, "manager.demo@platter-cafe.test", pw("SHOT_MANAGER_PW"));
    await b.viewport(1440, 900);
    const F = "02-manager";
    await adminPages(b, F, [
      ["/admin?days=7", "01-dashboard"],
      ["/admin/orders?range=week", "02-orders"],
      ["/admin/menu", "03-menu-and-photos"],
      [`/admin/menu/${POHA}`, "04-edit-dish"],
      ["/admin/categories", "05-categories"],
      ["/admin/delivery", "06-delivery-rates"],
      ["/admin/tables", "07-tables-and-qr"],
      ["/admin/design", "08-design"],
      ["/admin/password", "09-change-password"],
      // Owner-only pages: the manager is sent back to the dashboard with a notice.
      ["/admin/staff", "10-no-access-to-staff-page"],
      ["/admin/audit", "11-no-access-to-audit-log"],
    ]);
  },

  async kitchen(b) {
    await staffLogin(b, "kitchen.demo@platter-cafe.test", pw("SHOT_KITCHEN_PW"));
    await b.viewport(1440, 900);
    const F = "03-kitchen";
    await adminPages(b, F, [["/admin", "01-kitchen-role-dashboard"]]);
    await b.viewport(1366, 768);
    await b.go("/kitchen", { settle: 3500 });
    await b.shot(F, "02-kitchen-screen-all-orders", { full: true, maxH: 2600, stretch: true });
    await b.shot(F, "03-kitchen-screen-first-view", { full: false });
    await b.click("Sold out");
    await b.sleep(800);
    await b.shot(F, "04-kitchen-sold-out-panel", { full: false });
    await b.ev(`[...document.querySelectorAll('[role=dialog] button')].find(x=>x.innerText.trim()==='Done').click()`);
    await b.sleep(500);
    await b.click("Delivery");
    await b.sleep(800);
    await b.shot(F, "05-kitchen-filter-delivery", { full: true, maxH: 2000, stretch: true });
    await b.viewport(1440, 900);
    // The kitchen role has no access to money pages.
    await adminPages(b, F, [["/admin/orders", "06-no-access-to-orders"]]);
  },

  async customer(b) {
    const F = "04-customer";
    await b.viewport(1440, 900);
    await b.go("/", { settle: 2500 });
    await b.shot(F, "01-home-desktop", { maxH: 6500 });
    await b.go("/menu", { settle: 2500 });
    await b.shot(F, "02-menu-desktop-top", { full: false });
    await b.shot(F, "03-menu-desktop-full", { maxH: 5200 });
    // A dish opens in a sheet: big photo, price, options, note, add to order.
    await b.ev(`scrollTo(0,0)`);
    await b.click("#breakfast li button");
    await b.sleep(1200);
    await b.shot(F, "04-dish-sheet-desktop", { full: false });
    await b.ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
    await b.sleep(600);
    // Add three dishes and open the cart.
    await b.ev(`(async()=>{const bs=[...document.querySelectorAll('#breakfast li button')].filter(x=>x.innerText.trim()==='ADD').slice(0,3);for(const x of bs){x.click();await new Promise(r=>setTimeout(r,350))}})()`);
    await b.sleep(800);
    await b.click("View order");
    await b.sleep(1200);
    await b.shot(F, "05-cart-drawer-desktop", { full: false });
    await b.go(`/t/${TABLE}`, { settle: 3000 });
    await b.shot(F, "06-table-menu-after-qr-scan", { full: false });
    for (const [k, name] of [["received", "07-tracker-received"], ["preparing", "08-tracker-preparing"], ["ready", "09-tracker-ready"], ["served", "10-tracker-served"], ["delivery", "11-tracker-delivery-order"]]) {
      await b.viewport(430, 932, true, 2);
      await b.go(`/order/${TRACK[k]}`, { settle: 2500 });
      await b.shot(F, name, { maxH: 2400 });
    }
    // Phone views.
    await b.viewport(390, 844, true, 2);
    await b.go("/", { settle: 2500 });
    await b.shot(F, "12-home-phone-first-screen", { full: false });
    await b.viewport(390, 844, true, 1);
    await b.shot(F, "13-home-phone-full", { maxH: 9000 });
    await b.viewport(390, 844, true, 2);
    await b.go("/menu", { settle: 2500 });
    await b.shot(F, "14-menu-phone-first-screen", { full: false });
    await b.ev(`document.querySelector('#breakfast')?.scrollIntoView()`);
    await b.sleep(900);
    await b.shot(F, "15-menu-phone-dishes", { full: false });
    // Signed-in customer: history, order again, favourites.
    await b.viewport(1440, 900);
    await b.go("/login", { settle: 2500 });
    await b.shot(F, "16-sign-in-page", { full: false });
    await b.type("input[name=identifier]", "9000000001");
    await b.type("input[name=password]", pw("SHOT_CUSTOMER_PW"));
    await b.enter();
    await b.waitPath(`(p)=>p.startsWith('/account')`);
    await b.sleep(1500);
    await b.shot(F, "17-account-home");
    await b.go("/account/orders", { settle: 2500 });
    await b.shot(F, "18-account-order-history-and-order-again");
    await b.go("/account/favourites", { settle: 2500 });
    await b.shot(F, "19-account-favourites");
    await b.go("/offers", { settle: 2000 });
    await b.shot(F, "20-offers-page");
    await b.go("/contact", { settle: 2000 });
    await b.shot(F, "21-contact-page");
  },
};

const role = process.argv[2];
if (!roles[role]) { console.error("usage: node run.mjs owner|manager|kitchen|customer"); process.exit(1); }
const b = await browser(9333 + Math.floor(Math.random() * 200));
try { await roles[role](b); } finally { await b.close(); }
console.log("done:", role);
