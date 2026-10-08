# Platter: owner demo pack

Everything here shows how Platter works for the owner, using **demo data** that is already in the live database.
62 screenshots in four folders, 3 kitchen-ticket PDFs and a sample CSV, plus the scripts that made them.

> **The demo data stays until you say "delete the demo data".** Nothing here deletes it automatically.
> To remove it, run `data/DELETE-DEMO-DATA.sql` (it only touches demo rows; see "Removing it" below).

## What is in the database (demo data)

| What | How much |
|---|---|
| Orders on the real menu, real prices | 788, numbered #1 to #788, over the last 60 days |
| Order lines | about 1,500, 1 to 4 dishes per order |
| Status history per order | received, preparing, ready, served (so "time to ready" works) |
| Live orders right now | 10: 3 New, 3 Cooking, 2 Ready, 2 Served but unpaid |
| Table requests | 2 waiting ("Table 3 needs a waiter", "Table 7 wants the bill"), 3 already handled |
| Demo customers | 2 (with order history, "Order again" and favourites). Nobody knows their passwords. |

The numbers the dashboard shows from it (7 days): ₹60,222 sales, 115 orders, ₹524 average order, 16% repeat customers, peak hour 8 PM.
Order mix is about 62% dine in, 29% takeaway, 10% delivery. Prices, tax (5% GST) and delivery charges (₹30 for 2 km, ₹10 per km after) follow the real rules.

**It is made-up data.** Names like "Rohan A" and phone numbers starting `+919000000` are fake. Sales figures are invented to look like a normal cafe.

## The screenshots

Taken at 1440×900 for the back office, phone size for the phone screens. Every back-office page is a full-page shot.
Folder names say who is looking.

### `screenshots/01-owner` (the owner sees everything)

| File | What it shows |
|---|---|
| 01 / 02 / 03 dashboard 7, 14, 30 days | The live pipeline (New / Cooking / Ready), 5 headline numbers with change arrows, sales and orders chart, busiest hours, how people order, top dishes, sales by menu section, recent orders, menu health |
| 04 orders today, 05 last 7 days | The order list: number, table, customer, time, items, total, status. 25 per page, Newer / Older |
| 06 one order opened | An order's dishes, payment, phone, delivery address and note |
| 07 delivery + served, 08 cancelled | Filters (period, status, order type) |
| 09 search by name, 10 page 3 | Search, and paging through many pages |
| `orders-export-sample.csv` | The file "Download CSV" gives the accountant (first 60 lines) |
| 11 menu and photos | All dishes with photos, search and filters |
| 12 edit dish | Name, description, "what is in it", "how it is made", price, category, badges, sizes, extras, times, and the photo editor |
| 13 categories, 14 add-ons | Menu sections and extras |
| 15 delivery rates | Delivery distance and price rules |
| 16 tables and QR, 17 print QR codes | A QR code per table, and the print sheet |
| 18 design | Choosing the website's look (Minimal or Expressive) |
| 19 staff, 20 audit log | Staff accounts and roles (owner only), and who changed what |
| 21 change password | Every staff member can do this |

### `screenshots/02-manager` (manager: everything except staff and audit log)

Dashboard, orders, menu and photos, edit dish, categories, delivery, tables, design, change password.
Shots **10** and **11** show what happens when a manager opens the Staff or Audit log page: they are sent back to the dashboard with "Your role does not have access to that page". The sidebar has no Staff or Audit log links.

### `screenshots/03-kitchen` (the kitchen sees only what it needs)

| File | What it shows |
|---|---|
| 01 role dashboard | The kitchen's own home: live counts and "to cook now". No money anywhere |
| 02 kitchen screen, 03 first view | The live board: New, Cooking, Ready, plus served-waiting-for-payment, table requests, "to cook now" totals, order type filters |
| 04 sold-out panel | Switching a dish off the moment it runs out; customers see it at once |
| 05 delivery filter | Only delivery orders, with the address and a map link |
| 06 no access to orders | The kitchen role cannot open the Orders page |
| 07, 08, 09 kitchen ticket (KOT), PNG and PDF | The printed ticket for a delivery order, a takeaway with quantity 2 and item notes, and a dine-in with an extra and a note. Black and white, made for an 80 mm receipt printer |

### `screenshots/04-customer` (what the cafe's guests see)

Home (desktop and phone), the menu (desktop and phone), a dish sheet, the cart, a table menu after scanning a QR code, the **order tracker in each stage** (received, preparing, ready, served, delivery), sign in, the customer's account (profile, orders with "Order again", favourites), offers and contact.

## How to run a 10-minute demo for the owner

1. **Customer side first.** Open the home page, the menu, tap a dish (shots 02 to 05 in `04-customer`), add two dishes and open the cart.
2. **Place a real test order at a table** (`/t/AQ4Px9x2`, "Table 1"). Open the order tracker link it gives you (shots 07 to 10 show each stage).
3. **Kitchen.** Open `/kitchen` on a tablet. The new order appears under New (with a double beep if you tapped "Turn sound on"). Press Start preparing, Mark ready, Mark served.
4. **Watch the customer's tracker change** on the phone without refreshing.
5. **Dashboard** (owner login). Show the five numbers, the charts, top dishes, and that today's order is in "Recent orders".
6. **Orders page.** Open an order, filter to Delivery, search a name, download the CSV.
7. **Menu and photos.** Edit a dish, replace its photo, save, then refresh the public menu.
8. **Roles.** Sign in as the manager (no Staff page), then as the kitchen (no money pages).

Things to know before you demo:
- **Ordering only works between 11:00 AM and 10:30 PM IST** (the "enforce opening hours" setting). Outside those hours the site says Closed and refuses orders. These screenshots were taken before 11 AM, so they show "Closed".
- Keep step 2 to **one or two test orders**. They are real rows in the same database and will show in the dashboard. If you want them gone later, say so and they can be removed.
- The kitchen's live orders get older as time passes (an order made at 10:00 looks hours late at 2 PM). **Run `data/refresh-live-orders.sql` right before showing the kitchen** to reset them to 2 to 41 minutes old. (Ask me and I will run it.)

## Things in the screenshots that are not "clean"

- **Audit log (01-owner/20)** also lists test activity from building the system, including some "TEST" dummy text and old QA accounts. Audit history is not edited. It will be clean in a fresh production database. (The log now reads in plain sentences.)
- **QR addresses (01-owner/16)** use `https://platter-cafe.vercel.app/t/...`, the address set in `NEXT_PUBLIC_SITE_URL`. Reprint QR codes only after the final website address is live.
- **Dish details are empty.** "What is in it" and "How it is made" show on a dish only when someone writes them in Admin, so no dish has them yet.
- **Only 8 dishes have photos** (the ones on the home page). The other 159 show "Photo coming soon".

## Removing it

When you say so, run `data/DELETE-DEMO-DATA.sql`. It removes:
- the 788 demo orders (key starts with `demo-`), their lines and status history,
- the 5 demo table requests (by id),
- the 2 demo customers and their favourites.

It does not touch real orders, dishes, photos, staff or settings. Real orders placed after the demo was created are kept. Order numbers then continue from the highest remaining number.
Check afterwards with the two counts at the bottom of that file.

## Files

| Path | Purpose |
|---|---|
| `data/seed-demo-data.sql` | The script that created the demo data (kept so it can be read or re-run on an empty database) |
| `data/DELETE-DEMO-DATA.sql` | Removes it. **Do not run until you decide.** |
| `data/refresh-live-orders.sql` | Makes the 10 live orders look fresh again before a kitchen demo |
| `tools/shoot.mjs`, `tools/run.mjs`, `tools/kot-preview.mjs` | Take the screenshots, and the ticket previews, again (needs the dev server and a temporary login per role; these were removed after use) |
| `ISSUES.md` | Problems found while doing this, what was fixed, and the new ticket design |
