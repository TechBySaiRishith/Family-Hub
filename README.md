# FamilyHub

A family-shared PWA for everything the household keeps track of — places worth remembering and coupons before they expire. One quiet hub, kept together.

Built as a multi-app shell on Next.js 15. Two mini-apps ship today:

- **Locations** — save Google Maps and Instagram links from WhatsApp, sort by distance, filter, review.
- **Coupons** — capture promo codes by paste, screenshot OCR, or share-target; get reminded across push, email, and WhatsApp before they expire.

The shell is built so you can add more mini-apps later without restructuring.

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

### Shell
- Persistent left sidebar (desktop) / slide-out drawer (mobile)
- Dashboard home with recent saves + expiring coupons
- PWA-installable, Docker-deployable on Raspberry Pi behind Tailscale

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (built on `@base-ui/react`)
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

## Project Structure

```
src/
├── app/
│   ├── (app)/                # Authenticated routes (wrapped in AppShell)
│   │   ├── page.tsx          # Dashboard
│   │   ├── locations/        # Locations mini-app
│   │   ├── coupons/          # Coupons mini-app
│   │   └── settings/         # Per-user prefs + admin services
│   ├── api/                  # REST endpoints
│   ├── login/, register/     # Auth pages
│   └── share-target/         # PWA share target fallback
├── components/
│   ├── layout/               # AppShell, AppSidebar, install prompt
│   ├── locations/, coupons/  # Mini-app UI
│   ├── settings/             # Notification + reminder forms
│   ├── map/                  # Provider-aware map container
│   └── ui/                   # shadcn/ui primitives
├── lib/
│   ├── db/                   # Drizzle schema + client
│   ├── map-providers/        # OSM, Google, Mapbox
│   ├── parsers/              # Google Maps, Instagram, coupon-text
│   ├── reminders/            # Scheduler + email/push/whatsapp channels
│   ├── coupons.ts            # Coupon constants + helpers
│   └── ocr.ts                # Tesseract wrapper
├── hooks/                    # useGeolocation, useMapProvider
└── stores/                   # Zustand: app-store, coupon-store
```

## License

Private — for personal/family use.
