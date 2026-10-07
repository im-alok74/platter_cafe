# Platter Cafe & Restro: Phase 0 Plan

## 1. What I found in the folder

| File | Contents |
|---|---|
| `menu.zip` (8 photos) | Spiral menu book: cover, Breakfast, Beverages, Food (4 pages), back cover. Roughly 330 items with prices. Text only: no descriptions, no veg/non-veg marks, no dish photos. |
| `platter photo.zip` (11 photos) | Interior only: marble tables, taupe sofas, blue chairs, black industrial ceiling, poster wall, carrom and foosball corner. No food photos. |
| Logo (in chat) | Red handwritten "Platter" script on white. Menu cover adds "A UNIT OF KEHWA". |
| `KEHWA FSSAI 2025.pdf` | FSSAI licence **12223026002434**, licensee KEHWA, restaurant, valid to **30-12-2026**. |
| Chat | GST-style number 08AARFK0670K1ZW, address, hours 11:00 to 22:30, no weekly off, Maps link, Instagram, 16 tables, one unique QR per table. |

Extracted copies are in `_src/` (safe to delete once the menu is seeded).

## 2. Problems in the source material

1. **Duplicates across menu pages.** Masala Chaach, Omelettes, French Toast, Boiled Eggs, Sunny Side Up, Veg Grilled Sandwich and Samosa each appear twice.
2. **Price conflicts.** Cappuccino is 160 on the breakfast page and 150 on the beverages page. Iced Cappuccino is 160 in both places. Green Tea is 60 in both. Please confirm the Cappuccino price.
3. **Breakfast vs opening time.** Hours start at 11:00 but there is a full Breakfast Menu. I need the breakfast window.
4. **Mixed-up items to check:** "Guacamole Toast 300", "Green Salad 70", "Kung Pao Chicken Bites 400", "Chilly Chicken 340". I will seed what is printed and flag these for you.
5. **No veg/non-veg info.** I will mark items from their names. The non-veg items are clearly named, such as Chicken, Fish, Mutton, Lal Maas, Bhuna Gosht and Eggs. You should check the markers before launch.
6. **Taxes "as applicable".** I need the GST rate to show in the cart and invoice (restaurants are usually 5%, and I must not guess).
7. **Address in two documents.** The FSSAI licence says Jhalana 302004, and your note says 302017 (the postcode on the RIC address). I will use your 302017 address on the site. Is that right?
8. **Two spellings on the menu:** "Chineese" and "Sesaonal Halwa". I will correct them silently.

## 3. Missing items (placeholders until supplied)

- Dish photos (none exist). The menu will work without them.
- Google rating and review count (I will not invent them). A Google Places key would let this load live.
- WhatsApp number for orders. The menu lists 98290 44442. Is that the public number?
- Public email. The menu lists mshamama@hotmail.com. Should it appear on the site?
- Domain name.
- Hindi translations (I will draft and you check).
- Blog topics, About text, offers, staff logins.
- Accounts and keys: Supabase project, Cloudinary, MSG91 (SMS OTP in India needs DLT registration, which can take days), Razorpay (needs business KYC), Upstash, Resend, Sentry, Vercel.

## 4. Design direction

**Mood:** warm, relaxed, a little industrial. It should feel like the room: marble, soft leather, plants, and one bold red signature.

| Token | Choice | Why |
|---|---|---|
| Brand red | `#B3202A` | Sampled from the logo. Used for primary buttons and accents only. |
| Background | Cream `#FBF6EF`, cards `#FFFFFF` | Echoes the marble and the menu paper. |
| Ink | `#231F1C` | Warm black, passes AA on cream. |
| Taupe | `#9C8A76` | The sofas. Used for borders and secondary text. |
| Chair blue | `#2F88B5` | The dining chairs. Used for "Ready" and info states, so red is not overloaded. |
| Dark mode | Warm charcoal `#1B1816`, red lifted to `#E0525C` | Keeps AA contrast. |
| Headings | Fraunces (soft serif) | Warm and appetizing next to the script logo. |
| Body | Inter, plus Noto Sans Devanagari for Hindi | Both are on `next/font` with subsets. |
| Logo | Script wordmark used only as the logo, never for text | Script is unreadable at small sizes. |
| Radius | 16px cards, 28px sheets, full pills for chips | Friendly, thumb-sized. |
| Shadow | One soft warm shadow, low opacity | No harsh drop shadows. |
| Photos | Warm 4:3 crops, rounded, blur placeholder | Food photos should lead once they exist. |

**No food photos yet:** the menu uses a compact list row (name, veg dot, price, add button). A photo row appears only for items that have a photo. This keeps the menu looking good on day one.

## 5. Architecture

```
Next.js App Router (Vercel)
├── (public)   /, /menu, /offers, /blog, /gallery, /about, /contact    static + ISR, tagged
├── (order)    /t/[code] → menu with table context, /cart, /track/[id]   client-heavy, dynamic
├── (account)  /account, /orders, /favourites                            dynamic, per user
├── (kitchen)  /kitchen                                                  dynamic, realtime
├── (admin)    /admin/**                                                 dynamic, role-gated on server
└── api        /api/orders, /api/payments/webhook, /api/uploads/sign, /api/health
Supabase: Postgres (RLS on every table), Auth (phone OTP via MSG91 hook), Realtime
Cloudinary: signed uploads from an admin-only route
Upstash Redis: rate limits (OTP, orders, coupons, referral codes)
```

**Key decisions and why**

| Decision | Choice | Alternative | Reason |
|---|---|---|---|
| Table QR code | Random 8-char code per table (`/t/k7Qm2xPa`) | `/t/table-7` | Stops people ordering to a table they are not at. Admin can rotate a code if it leaks. |
| Prank-order protection | Rate limit per IP and table, plus kitchen "Accept" step for pay-at-counter orders from untrusted sessions | No check | A public QR with no login invites fake orders. |
| Pricing | Server recalculates every total from the database | Trust the cart | Required for security. |
| Orders | One Postgres function (transaction) with an idempotency key | Several API calls | A double tap cannot create two orders. |
| Paid state | Only the verified Razorpay webhook sets "paid" | Browser redirect | Redirects can be faked. |
| Loyalty | Append-only ledger, balance is a SQL view | Stored balance | Auditable, reversible. |
| Realtime | Supabase Realtime with a 5s polling fallback | Realtime only | Kitchen wifi drops. |
| Tenancy | `cafe_id` on every business table, single cafe now | No column | Cheap now, expensive later. |

## 6. Caching plan

| Data | Strategy | Invalidated by |
|---|---|---|
| Menu, categories, items, variants | `unstable_cache` with tag `menu`, ISR pages | `revalidateTag('menu')` on any admin edit |
| Today's Special, sold-out | Tag `menu`, short TTL (30s) plus tag | Admin toggle. Sold-out is re-checked on the server at order time. |
| Offers, popups, banners, blog | Tags `offers`, `popups`, `banners`, `blog` | Admin edit |
| Settings (hours, delivery) | Tag `settings` | Admin edit |
| Orders, tracking, account | Never cached, dynamic | n/a |
| Checkout prices | Never trusted from cache, recalculated | n/a |
| Images | Cloudinary CDN, `f_auto,q_auto`, `next/image` | Replace asset, delete old |
| Static assets | `immutable` for hashed files | Build |
| PWA | Service worker caches the menu shell and offline page | Version bump |

Time-based visibility (breakfast items) is computed at request time in the browser from cached data, so the cached page stays the same for everyone.

## 7. Scope risks and my recommendations

1. **This is a large build.** Referrals, popups, blog, Hindi and reports are all nice, but a 16-table cafe's first launch needs menu, ordering, kitchen, admin. Everything in your scope will be built, but I recommend launching after Phase 6 and switching the rest on behind feature flags.
2. **SMS OTP in India needs DLT registration.** Until MSG91 is approved, login is blocked. Guest ordering still works, so this does not block launch.
3. **Razorpay needs KYC.** Pay-at-counter works without it.
4. **"Bench" vs "Table".** You said tables. I will use "Table" in the customer UI and keep `bench` in code and database names, as in your spec.
5. **WhatsApp backup link** uses the cafe's WhatsApp number, so I need the real number.
6. **DPDP:** account deletion removes personal data but keeps anonymised order totals for accounting.

## 8. Decisions confirmed by the owner (2026-10-06)

- Breakfast items are visible all day but are excluded from delivery (per-item "available for delivery" flag; breakfast category defaults to off).
- GST 5%, no ITC, shown as a separate line. Rate stays editable in settings.
- Cappuccino is 160.
- 98290 44442 (call and WhatsApp) and mshamama@hotmail.com are public.

Everything else I will default and list in the Phase 1 report.
