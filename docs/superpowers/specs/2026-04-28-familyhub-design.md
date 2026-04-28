# FamilyHub — Super-App Design Spec

**Date:** 2026-04-28
**Status:** Approved, ready for implementation planning
**Predecessor:** [2026-04-10-location-manager-design.md](./2026-04-10-location-manager-design.md)

## Summary

Convert the existing Location Manager app into a multi-app shell called **FamilyHub**. Locations becomes the first mini-app; a new **Coupons** mini-app is added alongside it. The shell is designed so additional mini-apps can be added later without restructuring.

## Goals

- Single PWA on Tailscale-hosted Pi serving multiple family utilities
- Locations mini-app preserves all current functionality (no regressions)
- Coupons mini-app eliminates the "expired coupon graveyard" problem by combining low-friction capture with multi-channel expiry reminders
- Shell is extensible — adding mini-app #3 later requires only a new route namespace and a sidebar entry

## Non-Goals

- No multi-family / multi-tenant support — still one family per deployment
- No public sharing of coupons or locations outside the family
- No native mobile apps — PWA only
- No iOS push notification guarantees (will work where Apple supports PWA push, otherwise fall back to email)

---

## 1. Information Architecture

### Shell

`src/components/layout/app-shell.tsx` wraps every authenticated route.

- **Desktop / tablet (≥ `lg` breakpoint):** persistent left sidebar, 240px wide
- **Mobile:** sidebar collapses to a slide-out drawer triggered by a hamburger button in the top-left, using the existing `Sheet` primitive
- Sidebar contents (top to bottom):
  - FamilyHub wordmark (Fraunces, links to `/`)
  - Nav items with Lucide icons + Fraunces labels: Dashboard, Locations, Coupons, Settings (admin only)
  - Spacer
  - User chip (avatar + name) with sign-out menu
- Main content area to the right; preserves current padding pattern (`px-6 lg:px-12 xl:px-16`) and has no max-width

### Routes

| Route | Purpose |
|---|---|
| `/` | Dashboard (recent locations + expiring coupons + quick-add buttons) |
| `/locations` | Location list + filters (current `/` content moves here) |
| `/locations/new` | Add location form (currently `/location/new`) |
| `/locations/[id]` | Location detail (currently `/location/[id]`) |
| `/coupons` | Coupon list + filters (app, category, expiry window, used) |
| `/coupons/new` | Add coupon — manual / paste / OCR all funnel here |
| `/coupons/[id]` | Coupon detail with claim button |
| `/share-target` | Inspects payload, dispatches to coupon or location flow |
| `/settings` | Existing admin settings + new Notifications panel |
| `/login`, `/register` | Unchanged |

Old `/location/...` routes redirect to `/locations/...` (Next.js `redirects` in `next.config.ts`) so any saved bookmarks keep working.

### Dashboard layout

Two-column on desktop, stacked on mobile. Top of page: greeting + quick-add buttons ("Add place", "Add coupon"). Below:

- **Left column:** "Coupons expiring soon" — cards for each coupon expiring within 7 days, sorted nearest-first. Empty state hidden if nothing's expiring.
- **Right column:** "Recent places" — last 5 saved locations.

If nothing is expiring, the dashboard is single-column with just locations + quick-add. As more mini-apps are added, the dashboard becomes a configurable grid (out of scope for this spec).

---

## 2. Database

All additions are Drizzle migrations under `src/lib/db/schema.ts`. Existing `users`, `locations`, `reviews`, `tags`, `locationTags`, `locationImages`, `appSettings` are unchanged.

### `coupons`

```ts
{
  id: text (pk, ulid),
  sourceApp: text not null,         // see source-app enum below
  code: text,                        // null when image-only
  description: text not null,
  category: text not null,           // 'food' | 'shopping' | 'travel' | 'cashback' | 'other'
  expiryDate: integer (timestamp_ms) not null,
  minOrderValue: real,
  maxDiscountValue: real,
  notes: text,
  url: text,
  imagePath: text,                   // relative to data/uploads/, e.g. 'coupons/{ulid}.jpg'
  isPrivate: integer (0/1) default 0,
  isUsed: integer (0/1) default 0,
  usedById: text references users.id,
  usedAt: integer (timestamp_ms),
  createdById: text references users.id not null,
  createdAt, updatedAt: integer (timestamp_ms)
}
```

**Source-app enum** (UI dropdown, stored as string for forward compatibility):
`zomato`, `swiggy`, `paytm`, `gpay`, `phonepe`, `amazon`, `flipkart`, `myntra`, `bookmyshow`, `uber`, `ola`, `ajio`, `nykaa`, `bigbasket`, `blinkit`, `zepto`, `other`. "Other" reveals a free-text "Other app name" input.

Indexes: `expiryDate` (for reminder queries), `createdById` (for private filter), `isUsed` (for default list).

### `notification_preferences`

```ts
{
  userId: text (pk) references users.id,
  pushEnabled: integer (0/1) default 0,
  pushSubscription: text,            // JSON-stringified PushSubscription
  emailEnabled: integer (0/1) default 0,
  emailAddress: text,                // defaults to users.email
  whatsappEnabled: integer (0/1) default 0,
  whatsappNumber: text,
  daysBeforeExpiry: integer default 3
}
```

### `reminder_log`

Idempotency table — guarantees we don't re-send the same reminder within the same expiry window.

```ts
{
  id: text (pk, ulid),
  couponId: text references coupons.id not null,
  userId: text references users.id not null,
  channel: text not null,            // 'push' | 'email' | 'whatsapp'
  sentAt: integer (timestamp_ms) not null
}
```

Index: `(couponId, userId, channel)` for the dedupe query.

### `app_settings` additions

New keys (stored in existing table, no schema change):
- SMTP: `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`
- Push: `vapid_public_key`, `vapid_private_key`, `vapid_subject`
- WhatsApp: `twilio_sid`, `twilio_token`, `twilio_from`
- Cron: `reminder_cron_token` (random ULID, used as bearer for `/api/cron/reminders`)

---

## 3. Coupon capture — 4-stage stack

All paths funnel into the same `/coupons/new` form, just with different pre-fill sources. The form has all fields visible and editable regardless of how it was reached — auto-fill is convenience, never trust.

### Stage 1: Manual

Empty form. Required fields: `sourceApp`, `description`, `expiryDate`, `category`. Everything else optional.

### Stage 2: Paste-and-parse

A "Paste coupon text" textarea sits above the form. On paste (or click "Parse"), client-side `parseCouponText(text)` runs and pre-fills detected fields. Patterns:

- **Code:** `/(?:use\s+code|code|coupon|promo)[:\s]+([A-Z0-9]{4,20})/i`
- **Min order:** `/min(?:imum)?\s*order\s*[₹\$]?\s*(\d+)/i`, `/order\s*above\s*[₹\$]?\s*(\d+)/i`
- **Max discount:** `/up\s*to\s*[₹\$]?\s*(\d+)/i`, `/max(?:imum)?\s*[₹\$]?\s*(\d+)/i`
- **Expiry:** date formats `DD/MM/YYYY`, `DD-MM-YYYY`, `D Mon YYYY`, `Mon DD, YYYY`; preceded by `valid\s+(?:till|until|upto|through)`
- **Source app:** keyword match against the source-app enum (case-insensitive substring)
- **Description:** if no explicit description match, fallback to first non-empty line of pasted text (max 200 chars)

Parser lives at `src/lib/parsers/coupon.ts` with unit tests for each pattern. Returns a `Partial<CouponFormState>` so the form merges with current values rather than replacing.

### Stage 3: Photo OCR

File input (`accept="image/*"`, mobile shows camera option). On select:

1. Client uploads to `POST /api/coupons/ocr` (multipart/form-data, max 5MB)
2. Server validates session, saves image to `data/uploads/coupons/{ulid}.{ext}` (path stored later in coupon row)
3. Server runs `tesseract.js` Node binding (`createWorker('eng')`) on the saved file, returns `{ text, imagePath }`
4. Client runs the same `parseCouponText()` on returned text and pre-fills the form
5. `imagePath` is set on the form so it's saved with the coupon

Tesseract worker is initialized once per request and terminated on completion (avoid leaking worker pool). OCR can take 3-10 seconds — show a loading state. Tesseract language data is bundled in the Docker image (no runtime download).

### Stage 4: Share-target

Existing `/share-target` route is extended. Logic:

```
payload = { title?, text?, url?, files? }

if payload.files and any file is image/*:
  → POST file to /api/coupons/ocr, redirect to /coupons/new?prefill={ocrSessionId}
elif payload.url and isGoogleMapsUrl/isInstagramUrl:
  → existing location flow (unchanged)
elif payload.text or payload.url:
  → redirect to /coupons/new?text={base64-encoded-payload}
else:
  → /coupons/new (empty)
```

`prefill` and `text` query params are read on `/coupons/new` mount and used to pre-fill via the same parser.

The PWA manifest (`public/manifest.json`) is updated to declare `share_target` accepts `image/*` files in addition to text/url.

---

## 4. Reminders system

### Trigger

Pi `crontab` runs `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/cron/reminders` once daily at 09:00. Token stored in `app_settings.reminder_cron_token` and printed once at first-boot setup (admin can rotate from settings).

### Pipeline (`src/lib/reminders/scheduler.ts`)

```
1. Authenticate cron token (else 403)
2. Fetch coupons where expiryDate <= now() + 7 days AND isUsed = 0
3. For each user with at least one notification channel enabled:
   a. Filter coupons visible to that user (own private + all shared)
   b. Filter to those expiring within user's daysBeforeExpiry window
   c. Skip coupons already in reminder_log for (coupon, user, channel) within last expiry window
   d. For each enabled channel, dispatch:
      - push: web-push with VAPID, payload = { title, body, url: /coupons/[id] }
      - email: nodemailer, single digest email per user listing all expiring coupons
      - whatsapp: Twilio messages.create, single message with up-to-5 coupons (templated)
   e. Insert reminder_log row per (coupon, user, channel)
4. Return JSON summary { sent: { push: N, email: M, whatsapp: K }, errors: [...] }
```

Channel implementations are isolated in `src/lib/reminders/{push,email,whatsapp}.ts` so each can be developed and tested independently.

### Dashboard badge (no scheduler)

The "Coupons expiring soon" dashboard card runs the same query client-side via a `/api/coupons?expiring=true` endpoint. Always available, no notification config needed.

### Settings panel

New section in `/settings`:

- **Personal preferences** (per-user, all logged-in users see this):
  - Push toggle (button to subscribe via service worker)
  - Email toggle + override email address
  - WhatsApp toggle + phone number (E.164)
  - Days-before-expiry slider (1–14)
- **Service config** (admin only):
  - SMTP fields
  - VAPID keypair (generate button if not set)
  - Twilio fields
  - Cron token (regenerate button, shows once)

---

## 5. Sharing & claim mechanic

### Visibility rules

- `isPrivate = 0`: visible in all family members' lists
- `isPrivate = 1`: visible only to `createdById`

Server-side query in `/api/coupons` always filters: `WHERE isPrivate = 0 OR createdById = session.user.id`.

### Claim

Coupon detail page shows a primary "Mark as used" button when `isUsed = 0`. Clicking:
- `PATCH /api/coupons/[id]/use` — sets `isUsed = 1`, `usedById = session.user.id`, `usedAt = now()`
- Button replaced by stamp: "Used by [name] on [date]"
- In list views, used coupons render with reduced opacity and strike-through; toggle filter "Hide used" defaults to **on**

### Unclaim

Small "Mark unused" link visible only to the user whose `usedById` matches the session. Reverts the three fields to defaults. Prevents random family members from undoing each other's actions.

### Race condition

PATCH endpoint uses `WHERE id = ? AND isUsed = 0` so the second click of two simultaneous clicks does nothing and returns 409. UI shows "Already claimed by [name]" toast on 409.

---

## 6. Rollout plan

Each phase is independently shippable and committed.

| Phase | Scope | What you can do after |
|---|---|---|
| **1. Shell + branding** | Extract `app-shell`, build sidebar, rename to FamilyHub, move locations under `/locations/*` with redirects, build `/` dashboard with location cards only | Existing app works exactly as before, new shell visible |
| **2. Coupon CRUD (manual)** | Schema migration, `/coupons` list + filters, `/coupons/new` manual form, `/coupons/[id]` detail with claim, private flag, dashboard "expiring soon" card | Add and use coupons manually |
| **3. Paste + OCR** | `parseCouponText` library + tests, paste-and-parse UI, `/api/coupons/ocr` endpoint + Tesseract setup, photo upload field | Paste WhatsApp coupon text or upload screenshots |
| **4. Share-target** | Extend `/share-target` dispatch, update PWA manifest for `image/*` files | Long-press coupon image in WhatsApp → Share → FamilyHub |
| **5. Reminders** | `/api/cron/reminders` route, scheduler + log table, settings panel additions, channel implementations (email → push → whatsapp in that order) | Get reminded across all configured channels |

Phase 1 must merge before any others start. Phase 2 unlocks the rest. Phases 3-5 can run in parallel if multiple developers, but in this single-developer project we'll go in order.

---

## Risks & open questions

- **Tesseract.js bundle size**: Adds ~10MB to Docker image. Acceptable for a Pi deployment, but worth measuring. If this becomes a problem, swap to a cloud OCR service (Google Vision, ~free tier).
- **iOS PWA push reliability**: Apple's PWA push only works when the app is added to the home screen and on iOS 16.4+. Email is the fallback for iOS family members.
- **Twilio WhatsApp sandbox vs production**: Sandbox is instant for testing but requires recipients to opt in by sending a code. Production needs Meta business verification (a few days, free). Document both in the README.
- **Dashboard scaling**: With 3+ mini-apps, the two-column layout breaks. Plan for a configurable grid in a future spec, not now.
- **Mini-app #3 candidates** (not in scope, just noting): recipes, gift ideas, subscriptions tracker, shared shopping list, family calendar. The shell is designed to accommodate any of these.

## Out of scope for this spec

- Mini-app #3
- Configurable dashboard grid
- Coupon export (CSV) or import from email
- Family-member analytics ("who saves the most coupons")
- Coupon stacking suggestions ("you have a Zomato Gold + Paytm cashback that combine")
