# Platter Cafe & Restro

Website, QR table ordering, kitchen screen and admin panel for Platter, Jaipur. Next.js 16 (App Router, Cache Components), Supabase, Cloudinary.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (also run in CI).

## Environment variables

| Variable | Needed from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Phase 1 | `http://localhost:3000` locally |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Phase 1 | Supabase project settings, API |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 4 | Server only. Never expose to the browser. Orders and payments use it. The admin panel does not need it. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Phase 3 | Photo uploads in the admin. Key and secret: Cloudinary dashboard, Settings, API Keys. |
| `RAZORPAY_*` | Phase 6 | Payments and webhook |
| `UPSTASH_REDIS_REST_*` | Phase 4 | Rate limiting |
| `RESEND_API_KEY`, `SENTRY_DSN` | Phase 9 | Email, errors |

Values are validated at server start in `src/env.ts`.

## Database

SQL lives in `supabase/migrations` (applied in order) and `supabase/seed.sql` (menu, 16 tables, settings). Every table has row level security. Orders, payments and points are written only by the server with the service role.

Each table's QR code is the random `code` column on `benches`, used as `/t/<code>`.

Backups: enable daily backups in Supabase (Pro plan), and restore from Dashboard, Database, Backups. A restore note will be expanded in the Phase 9 runbook.

## Architecture: fewest database requests

The rule is that a page makes as few database calls as it can, and never more as traffic grows.

**Three layers of cache**

| Layer | What | Lifetime | Cleared by |
|---|---|---|---|
| Server cache (`use cache`) | menu, site settings, gallery, hero, offers, blog, table lookup (`/t/<code>`) | 1 minute to 1 hour | `updateTag` from the admin action that changed it (`menu`, `settings`, `benches`). Gallery, hero, offers and blog have no admin editor yet, so they refresh when their time is up (1 hour, 1 hour, 1 minute, 1 minute) |
| Pre-rendered pages | every public page except the signed-in ones | until its data tags change | same tags |
| Browser | cart (localStorage), theme, order tracker state | the device | the customer |

Public visitors therefore cost **zero** database requests: a thousand people opening the home page or the menu read the same cached copy. Orders, checkout prices and anything signed-in are never cached.

**One call per screen, aggregated in SQL**

- The owner/manager dashboard is `public.dashboard_summary` (migrations `0020`, `0021`): sales, deltas, daily and hourly charts, top dishes, sections, repeat customers, time to ready, the live pipeline, menu counts, table requests and recent orders come back as one JSON document. It used to be about ten requests, one of them pulling up to 3,000 orders into Node. It runs as the signed-in staff member and checks the role inside the function, so there is no service-role secret in the app for this. The inner `_dashboard_summary` is not callable by anyone but the database owner.
- `orders(cafe_id, placed_at desc)` is indexed for the range scans behind the dashboard, the orders list and the CSV export.

**Pagination, always server-side**

Lists never load everything and filter in the browser. `src/lib/paginate.ts` turns `?page=` into a safe range (capped, tested) and `src/components/pager.tsx` draws Newer / Older. A page and its total count come back in the same request (`count: "exact"`).

- Admin orders: 25 per page, with period, status, type and search all applied in the query. Search input is stripped of filter syntax first.
- Audit log: 40 per page. Customer order history: 10 per page, and only the dishes those orders used are sent to the browser, not the whole menu.
- The CSV export is the one deliberate exception: it is capped at 5,000 rows.

**Fewer auth round trips**

The proxy and the server pages verify the session with `getClaims()` (checks the signed token locally, no call to the Auth server on a normal request) instead of `getUser()`. A staff member's role is still read fresh from `staff_roles` on each request, so removing someone takes effect at once. Password changes and sign-in still use `getUser()` / password checks, since they are rare and must be authoritative.

**Live screens poll less**

- Kitchen board: Realtime pushes changes; a burst of events is merged into one reload (300 ms), the fallback poll runs every 30 s while connected (5 s if the socket drops) and pauses while the screen is hidden.
- Order tracker (a customer's phone): polls every 4 s for the first minute after the status changes, then every 12 s, and every 30 s in a background tab. It stops once the order is served or cancelled.

**Known ceilings, and what to do when you reach them**

- The dashboard is computed on each load, not cached, because it runs as the staff member. At one cafe's volume it is a single indexed aggregate. If it ever gets heavy, move the result into a small `daily_stats` table written by a trigger, or a materialized view refreshed every minute.
- Offset pagination is fine into the tens of thousands of orders. Past that, switch to keyset pagination on `(placed_at, id)`.
- Order search matches name, phone, order number and table hint, not the table's printed label. Add a trigram index if you need fuzzy search on large data.

Motion tokens are in `src/lib/motion/tokens.ts`; colour, radius and shadow tokens are in `src/app/globals.css`.

## Admin panel (`/admin`)

Staff sign in with an email and a password. The owner creates, re-roles, resets and removes staff accounts on the Staff page (owner only); everyone changes their own password by clicking their email in the top bar. The role (owner, manager, kitchen) comes from the `staff_roles` table, checked on the server for every page and action. The first owner and a manager are created with the SQL in migration `0017` (`public._make_user`); there is no public staff sign-up.

| Page | Who | What |
|---|---|---|
| Menu | owner, manager | Edit prices inline, sold out, hidden, today's special, bulk actions, drag to reorder, add and edit items, sizes/options, badges, time windows, photos with crop |
| Categories | owner, manager | Add, edit, hide, delivery on/off, time window, drag to reorder |
| Tables | owner, manager | One QR per table, rename, disable, make a new QR, print all |
| Staff | owner | Invite by email, change role, remove |
| Audit log | owner | Every create, edit and delete with who and when |

Every admin save refreshes the public site (`updateTag("menu")`). Set `NEXT_PUBLIC_SITE_URL` to the real address before printing QR codes; the Tables page warns while it still says localhost.


### Dish photos

Owner and manager can add or change a dish photo from the Menu list (tap the small photo square on a row, or open the item). The editor crops (square, 4:3 or 3:4), zooms, rotates and adjusts brightness, contrast and colour, and can re-edit a photo already saved. The result is saved at up to 2000 px (JPEG 92%) straight to Cloudinary from the browser with a server-signed request, and Cloudinary hands each phone a smaller copy automatically. This needs `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env.local` (Cloudinary dashboard, Settings, API Keys); until then the Menu page says uploads are not switched on. The Menu list can be filtered to dishes with no photo.

### Dashboards by role (`/admin`, `/kitchen`)

The sidebar and the dashboard change with the role, and every page and action is still checked on the server.

- **Owner and manager** see the live queue, sales, orders, average order, repeat customers and average time to ready, each against the previous period (switch 7, 14 or 30 days), plus graphs for sales and orders per day, busiest hours, order types, top dishes and sales by menu section. They also get menu health (sold out, hidden, no photo) and quick actions. The owner alone also gets Staff and Audit log.
- **Orders** can be searched and filtered by status and type, opened to see the dishes, and downloaded as CSV (owner and manager).
- **Kitchen** sees a live queue and a "to cook now" list with no money figures. The kitchen screen (`/kitchen`) is always dark, colours tickets by stage, turns the age bar amber then red, filters by order type, and lets the kitchen mark a dish sold out (or back) without any other menu access (`set_item_sold_out`, migration `0018`).

## Ordering (`/t/<code>`, `/order/<id>`, `/kitchen`)

**Guests** scan the QR on their table, which opens `/t/<code>` with "You're at Table N" always shown. They add items (options, extras, a note), review the order, choose dine in or takeaway, and pay at the counter. No login. The order page `/order/<id>` shows live progress and has Call a waiter and Request the bill.

**How an order is made safely:** the browser sends only item ids, options and quantities. The database function `place_order` prices everything itself in one transaction (menu prices, options, extras, GST from settings), refuses sold-out, hidden or out-of-hours items, limits orders per table and per cafe, and returns the same order if the same request key arrives twice (double tap). Direct writes to orders are blocked for everyone, including staff.

**Staff** open `/kitchen` (owner, manager, kitchen roles): new orders appear live with a sound, status buttons move an order one step, "Mark paid" records counter payment, "Print KOT" prints a ticket, and table requests (waiter, bill) show at the top. Realtime does the updates; if the socket drops it falls back to polling every 5 seconds and shows a banner when offline.

Guests' tracking page checks every 4 seconds (it holds the unguessable order id, so no login is needed).

Tuning lives in the `ops` setting: `prep_base_minutes`, `per_order_minutes` (estimated wait), `max_orders_per_bench_10min`, `max_orders_cafe_10min`, and `enforce_hours` (refuse orders when the cafe is closed).

Not yet: online payment (Phase 6), offers and loyalty (Phases 6 and 7), delivery (off by default).

## Customer accounts (`/login`, `/account`)

Guests can always order. An account is optional and gives order history, one-tap "Order again", favourites (heart on a dish while ordering), and an account page where the customer edits their name, changes their password, turns marketing messages on or off, and can delete their account and personal data.

**Sign-in is a password.** A customer registers with a mobile number or an email plus a password (at least 8 characters), then signs in the same way. No SMS provider, email delivery or setup is needed. Accounts are made by the `register_customer` function (migration `0017`); a mobile number is kept behind a private address like `919876543210@phone.platter.invalid` so one password login serves both, and that address is never shown.

Because nothing is sent to the number or email, it is not verified: someone could register with a number that is not theirs. For that reason past guest orders are **not** merged into an account by phone number (that would expose someone else's orders), and a password cannot be recovered by the customer. Staff can reset a customer password from the Supabase dashboard (Authentication, Users). If you later want verified numbers or "forgot password", add an SMS or email provider in Supabase and switch registration to it.

Privacy: `/privacy` is a draft written from what the system does; have it reviewed before launch.

## Local development notes

`npm run dev` runs on http://localhost:3000. In Next 16.3 `next dev` throws a false cookie error when a page re-renders after a server action; `src/lib/supabase/server.ts` reads the Cookie header directly to avoid it. Pages that read the session are not prefetched (`prefetch={false}`), which avoids dev-only "uncached data" warnings.

## SEO

Built in: unique title and description per page, canonical links, Open Graph and Twitter cards (branded share image at `/opengraph-image`), `sitemap.xml`, `robots.txt` (staff, ordering and account pages are blocked), web manifest and icons, and schema.org data (Restaurant with address, hours, coordinates and order action; WebSite; Menu with every dish and price; BreadcrumbList on inner pages).

Before launch, do these (they need your accounts, so they are not in the code):
1. Set `NEXT_PUBLIC_SITE_URL` to the real address, with `https://` and no trailing slash. Canonical links, the sitemap, share cards and table QR codes all use it. Also pick one of `www` or the bare domain and redirect the other in Vercel.
2. Google Search Console: add the site, copy the verification token into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, then submit `/sitemap.xml`.
3. Google Business Profile: claim "Platter Cafe & Restro", use the exact same name, address and phone as the website, set hours, add the website and menu links, and upload photos. For a cafe, this drives more local traffic than anything on the site.
4. Ask happy customers for Google reviews (a table card with a review link works well) and keep the name, address and phone identical on Instagram, Zomato, Swiggy and other listings.
5. Upload dish photos and write their descriptions in admin. Pages with real photos and text rank and convert better.
