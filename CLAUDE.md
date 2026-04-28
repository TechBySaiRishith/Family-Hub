@AGENTS.md

# FamilyHub

A family-shared PWA super-app. Mini-apps share a single shell with a left sidebar (drawer on mobile), dashboard home, and unified auth.

## Mini-apps
- **Locations** (`/locations/*`) — restaurants and places, with map providers + reviews
- **Coupons** (`/coupons/*`) — promo codes with paste-parse + OCR + multi-channel expiry reminders
- The shell is designed so mini-app #3 is a route namespace + a `MiniApp` definition in `src/lib/mini-apps/registry.ts` away. See `docs/ADDING-A-MINI-APP.md`.

## Tech Stack
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui (built on `@base-ui/react` — uses `render` prop, not `asChild`)
- SQLite via better-sqlite3 + Drizzle ORM
- Auth.js v5 (credentials)
- Pluggable maps: OSM/Leaflet, Google Maps, Mapbox
- Tesseract.js for OCR; nodemailer / web-push / Twilio REST for reminders
- Docker for Raspberry Pi behind Tailscale

## Commands
- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm exec drizzle-kit push` — Push schema to DB
- `pnpm exec drizzle-kit generate` — Generate migration
- `docker compose up -d --build` — Deploy

## Architecture
- Route group `src/app/(app)/` wraps authenticated pages with `AppShell`
- SQLite DB at `data/location-manager.db`; uploads at `data/uploads/`
- Map provider configurable at runtime via admin settings (`src/lib/map-providers/`)
- Coupon parser lives in `src/lib/parsers/coupon.ts`; OCR in `src/lib/ocr.ts`
- Reminder scheduler in `src/lib/reminders/scheduler.ts`; channels in `email.ts` / `push.ts` / `whatsapp.ts`
- Cron route `/api/cron/reminders` is bearer-token protected (token in `app_settings.reminder_cron_token`)

## Conventions
- Use `ulid()` for all primary keys
- Zod schemas in `src/lib/validations.ts` for all API inputs
- Server components by default, `"use client"` only when needed
- API routes call `auth()` from `src/lib/auth.ts` for session
- Settings page (`/settings`) is open to all logged-in users; admin-only sections render conditionally on `session.user.role === "admin"`
- Per-user notification prefs at `/api/notification-preferences`; admin services config (SMTP/VAPID/Twilio) at `/api/settings`
- Use pnpm as package manager
