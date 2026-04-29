# FamilyHub

A family-shared PWA for everything the household keeps track of — places worth remembering, coupons before they expire, packing lists for trips, and groceries that just ran out. One quiet hub, kept together.

Built as a multi-app shell on Next.js 16. Four mini-apps ship today:

- **Locations** — save Google Maps and Instagram links from WhatsApp, sort by distance, filter, review.
- **Coupons** — capture promo codes by paste, screenshot OCR, or share-target; get reminded across push, email, and WhatsApp before they expire.
- **Tote** — pre-event packing checklists for weddings, trips, and day-outs. Built-in templates, hybrid shared/private items, fork-to-edit personal templates.
- **Larder** — household restock list grouped by supermarket aisle, sent to WhatsApp in one tap (web link or Twilio direct-send).

The shell is built so you can add more mini-apps later without restructuring — see `docs/ADDING-A-MINI-APP.md`.

## Features

### Locations
- Paste Google Maps or Instagram URLs to auto-extract location data
- Share-target: forward a place from WhatsApp directly into the hub
- 3 map providers — OpenStreetMap (free), Google Maps, Mapbox — switchable from settings
- Distance sorting, category/cuisine/price filters, family reviews

### Coupons
- Paste promo SMS / email and we extract the code, expiry, min order
- Upload a screenshot — Tesseract.js OCR reads the text and pre-fills the form
- Web Share Target: long-press a coupon image in WhatsApp → Share → FamilyHub
- Default-shared with the family; per-coupon "private" toggle
- "Used by [name]" stamp prevents duplicate redemptions on one-time codes
- Multi-channel expiry reminders: dashboard badge, push, email digest, WhatsApp

### Tote
- Plan an event (wedding / trip / day-out / other) with a date and destination
- Hybrid sharing: a "shared" list everyone can edit + each user's private items
- Built-in templates auto-seed on first use; save any event as a personal template
- Fork built-in templates into editable copies
- Per-item category, quantity, and notes — checkable, with "packed by [name]" stamp

### Larder
- Add household items grouped by supermarket aisle (produce, dairy, pantry, …)
- Mark items bought (with a "Show bought" toggle) or clear the bought pile
- **Open in WhatsApp** — opens `wa.me` with a category-grouped message body, ready to send to anyone
- **Direct send (optional)** — admin configures a Twilio number + recipient and members can send the list straight to the family WhatsApp without leaving the app

### Shell
- Persistent left sidebar (desktop) / slide-out drawer (mobile)
- Dashboard home with widgets from every mini-app
- Light / dark / system theming via next-themes
- PWA-installable, Docker-deployable on Raspberry Pi behind Tailscale

## Tech Stack

- Next.js 16 (App Router) + React 19.2 + TypeScript (strict)
- Tailwind CSS 4 + shadcn/ui (built on `@base-ui/react` — uses `render` prop, not `asChild`)
- SQLite via better-sqlite3 + Drizzle ORM
- Auth.js v5 (credentials)
- Leaflet / Google Maps / Mapbox (pluggable map providers)
- Tesseract.js (OCR), nodemailer (email), web-push (push), Twilio REST (WhatsApp)
- Docker for Pi deployment

## Quick Start (Local)

```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste output as AUTH_SECRET in .env.local

# 3. DB
pnpm exec drizzle-kit push

# 4. Run
pnpm dev
```

Open `http://localhost:3000`. The first user to register becomes admin.

## First-time admin setup

After registering as admin, walk through `/settings` once:

1. **Invite code** — set a passphrase. Members need it to register.
2. **Map provider** — pick OSM (default, no key) or paste a Google Maps / Mapbox key.
3. **Reminder services** *(optional, all separate)*:
   - **Email (SMTP)** — host, port, user, password, from-address
   - **Push (VAPID)** — click *Generate keys*; copy the public key into the share with members
   - **WhatsApp (Twilio)** — Account SID, auth token, from-number (`whatsapp:+1415...`)
   - **Larder direct-send** — recipient number (E.164, e.g. `+919876543210`) + a label ("Mum's WhatsApp"). Only relevant once Twilio above is filled in.
   - **Cron token** — click *Generate*; needed by the daily reminder cron (see below)

Members register with the invite code, then visit their own `/settings` to opt in to push / email / WhatsApp expiry reminders.

## Deploy on Raspberry Pi

```bash
git clone <repo> familyhub && cd familyhub
cp .env.example .env.local
# set AUTH_SECRET and AUTH_URL=http://<your-pi>:3000

docker compose up -d --build
```

Data lives in `./data/` (SQLite + uploads). Back it up by copying the folder.

## Reminders

The reminder system delivers expiry alerts via 4 channels:

1. **Dashboard badge** — always on, no setup. The home page shows what's expiring.
2. **Email digest** — admin sets SMTP creds in Settings; users opt in.
3. **Push notifications** — admin clicks "Generate VAPID keys"; users enable in their settings.
4. **WhatsApp** — admin sets Twilio SID/token/from; users enter their E.164 number.

A daily cron triggers reminders. From Settings, regenerate the cron token, then schedule on the Pi:

```bash
0 9 * * * curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/cron/reminders
```

Each user picks how many days before expiry they want to be notified (1–14).

## Larder → WhatsApp flow

Larder ships with two send paths and a clear hierarchy:

| Path | Setup | Audience |
|---|---|---|
| **Open in WhatsApp** | Nothing — works out of the box | Pick the chat after it opens |
| **Send to <label>** | Twilio + Larder recipient configured | Pre-set family number, one-tap |

Both paths use the same server-formatted message (so what you preview is what they get):

```
🛒 The Larder — 3 things needed

*Produce*
• Tomatoes — 1kg
• Onions

*Dairy & eggs*
• Milk — 2 litres
```

Long lists are capped at ~1500 chars (WhatsApp's per-message limit) with a "+ N more in the hub" footer.

## Map Providers

You can switch between map providers at any time from **Settings** (admin only).

| Provider | Cost | API Key | Notes |
|---|---|---|---|
| OpenStreetMap | Free | No | Default. Uses Nominatim |
| Google Maps | Free tier (28.5k loads/mo) | Yes | Best coverage |
| Mapbox | Free tier (50k loads/mo) | Yes | Customizable styles |

## Adding things to the hub

**Locations:**
- Share a Google Maps or Instagram link from WhatsApp → FamilyHub
- Paste a link in `/locations/new`
- Search by name

**Coupons:**
- Long-press a coupon image in WhatsApp → Share → FamilyHub (image + text both work)
- Paste promo text in `/coupons/new` and click Parse
- Upload a screenshot — OCR fills it in

**Tote:**
- `/tote/new` → pick a built-in template or start blank
- Add items to the shared list (everyone sees) or your private list
- Save any event back as a personal template via the kebab menu

**Larder:**
- `/larder` → type the item, quantity, and aisle, then Add
- Tick items as they're bought; **Open in WhatsApp** sends the remaining list

## Project Structure

```
src/
├── app/
│   ├── (app)/                  # Authenticated routes (wrapped in AppShell)
│   │   ├── page.tsx            # Dashboard
│   │   ├── locations/          # Locations mini-app
│   │   ├── coupons/            # Coupons mini-app
│   │   ├── tote/               # Tote (events + templates)
│   │   ├── larder/             # Larder (restock list)
│   │   └── settings/           # Per-user prefs + admin services
│   ├── api/                    # REST endpoints, mirroring (app)/
│   ├── login/, register/       # Auth pages
│   └── share-target/           # PWA share target fallback
├── components/
│   ├── layout/                 # AppShell, AppSidebar, install prompt
│   ├── locations/, coupons/, tote/, larder/  # Mini-app UI + dashboard widgets
│   ├── settings/               # Notification + reminder + Larder forms
│   ├── map/                    # Provider-aware map container
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── db/                     # Drizzle schema + client
│   ├── mini-apps/              # MiniApp registry — single source of truth for sidebar/dashboard/share-target
│   ├── map-providers/          # OSM, Google, Mapbox
│   ├── parsers/                # Google Maps, Instagram, coupon-text
│   ├── reminders/              # Scheduler + email/push/whatsapp channels
│   ├── tote/                   # Tote constants + built-in template seeds
│   ├── larder/                 # Larder constants + WhatsApp formatter
│   ├── coupons.ts              # Coupon constants + helpers
│   └── ocr.ts                  # Tesseract wrapper
├── hooks/                      # useGeolocation, useMapProvider
└── stores/                     # Zustand: app-store, coupon-store
```

See `docs/ADDING-A-MINI-APP.md` for the three-step recipe to add a fifth mini-app.

## License

Private — for personal/family use.
