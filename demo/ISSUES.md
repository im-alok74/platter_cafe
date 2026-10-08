# Issues found while building the demo: status

Found on 8 Oct 2026 while taking the demo screenshots. **Fixed the same day** unless it says otherwise.
`tsc`, `eslint` and the 31 tests pass. Checked by eye in a real browser: 1, 2, 3, 4, 7, 8, 11 and the kitchen ticket. Small text or size changes checked by the type checker only, not looked at on screen: 5 ("1 item"), 6 (search box width), 10 ("Details →" only when there are details) and 12 (photo framing).

| # | Issue | Status |
|---|---|---|
| 1 | Hydration warning on the home page and menu | **Fixed** |
| 2 | Cart bar and cart total disagreed | **Fixed** |
| 3 | "Order now" shown while closed | **Fixed** |
| 4 | Prices shown inconsistently | **Fixed** |
| 5 | "1 items" | **Fixed** |
| 6 | Orders search box cut off | **Fixed** |
| 7 | Audit log hard to read | **Fixed** |
| 8 | Dish photo box at the bottom of the editor | **Fixed** |
| 9 | Orders list lost its sales total | Left as is, on purpose (see below) |
| 10 | "Details →" on dishes with no details | **Fixed** |
| 11 | Busiest-hours chart started at 7 AM | **Fixed** |
| 12 | Portrait photos cropped badly | **Improved** |
| 13 | README said something untrue | **Fixed** |
| 14 | Unused variables in `.env.example` | **Fixed** (now labelled) |
| 15 | Migration numbering gap | **Not an issue** (my mistake) |
| 16 | Cloudinary secret pasted in chat | **Needs you** |
| 17 | Kitchen ticket (KOT) was plain and hard to read | **Redesigned** |

## What changed, one by one

1. **Hydration warning.** `Reveal` (`src/components/motion.tsx`) no longer picks its start position from the reduced-motion setting. The server and browser now render identical HTML. Checked on `/`, `/menu` and `/contact` with reduced motion on: no console errors.
2. **Cart bar vs total.** The floating bar now reads `₹430 + GST`, on both the website and the table menu.
3. **Closed hours.** While closed (checked by shifting the clock to 3 AM): the hero button says "See the menu" (the duplicate "View menu" button is hidden), and the cart says "Closed now — we take orders from 11:00 AM" with Place order switched off. The table menu already did this. They now share one `useOpen` hook (`src/lib/use-open.ts`).
   - Small remaining quirk: the page is built for everyone before it knows the time, so a guest who opens it while closed may see "Order now" for a split second before it changes.
4. **Prices.** Lists of bills (admin orders, dashboard recent orders, kitchen cards, customer order history) always show rupees and paise: `₹861.00`, `₹26.25`. The menu and headline numbers stay whole rupees.
5. **"1 item".** Fixed in the admin orders list.
6. **Search box.** Wider, with a shorter hint ("Order #, name, phone or table").
7. **Audit log.** Plain sentences, no ids: "Changed dish · Tomato Soup (photo added)", "Added staff role · role: manager", "template: minimal → expressive". Actions made with no signed-in person say "System (not signed in)".
8. **Dish editor.** The Photo box is now at the top, with a note that it saves as soon as you choose the photo. For a new dish, it says to add the dish first.
9. **Sales total on the orders list.** I did not put it back. Showing sales for a filtered list needs one more database call on every page load, which goes against the "fewest requests" work. The dashboard shows sales. Say so if you want it back.
10. **"Details →"** now appears only on dishes that have "What is in it" or "How it is made" text.
11. **Busiest hours.** The chart now runs from the cafe's opening hour to closing (taken from Settings). An hour outside those still appears if it had orders.
12. **Portrait photos.** Photos are now framed slightly above centre, which keeps the cup or plate in view more often. A perfect fix is the photo editor cropping to a wide shape when you upload.
13. **README.** Now says orders are created only by the `place_order` function (checked in the database: customers have no insert or update rights on `orders`).
14. **`.env.example`.** The unused variables are labelled as planned, not built, and the service-role key says to leave it empty.
15. **Migration 0010.** It exists (`0010_ordering.sql`). I misread a listing earlier.
16. **Cloudinary secret.** Still your action: generate a new key in Cloudinary (Settings → API Keys), then replace the key and secret in `.env.local` and in Vercel.

## The kitchen ticket (KOT), redesigned

**Before:** a plain monospace text block, small, with no hierarchy.

**Now** (`src/app/kitchen/kot.tsx` and `kot.css`), built for an 80 mm receipt printer and black and white only:
- The order number is huge (21 mm), so it can be called across the kitchen.
- A solid black band shows DINE IN, TAKEAWAY or DELIVERY, with the time.
- The table is large ("Table 6"). Delivery shows the address and distance in a box.
- Each dish has a quantity box. **A quantity of 2 or more is a solid black box**, so "3" is never read as "1".
- Sizes, extras (`+ Extra Raita`) and per-dish notes (boxed) sit under the dish. The order note is a separate heavy box.
- Total items, then a payment line: PAID, PAYS AT COUNTER, or for delivery **CASH ON DELIVERY ₹368.00** in big type.
- No prices on the ticket except the cash to collect, a dashed cut line, and the print time.
- Previews are in `screenshots/03-kitchen` (`07` to `09`, PNG and PDF).

Notes about printing:
- The ticket is 72 mm wide, for an 80 mm roll. A 58 mm printer would need a narrower version (not done; tell me your printer size).
- No page size is set in the CSS on purpose, so the printer's own paper setting decides the length and a long order is never cut into two pages.
- I could not test a physical printer. Previews are the browser's own print rendering, to PNG and PDF.

## Not issues, but good to know
- Ordering only works from 11:00 AM to 10:30 PM IST.
- The audit log screenshot (`01-owner/20`) includes leftover test activity from building the system.
