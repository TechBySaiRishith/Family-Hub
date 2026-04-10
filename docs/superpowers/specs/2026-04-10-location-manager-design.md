# Location Manager — Design Spec

## Overview

A family-shared PWA for saving, organizing, and discovering restaurants and places. Family members share Google Maps links and Instagram posts in WhatsApp — this app captures those locations, organizes them with categories/tags/filters, and helps find nearby places to visit.

**Target users:** Single family (~5-10 members) via invite-only access.
**Hosting:** Raspberry Pi behind Tailscale, deployed via Docker.

---

## Architecture

Single Next.js 15 application (App Router) with embedded API routes and SQLite database.

```
┌─────────────────────────────────────┐
│       Docker Container (Pi)         │
│  ┌──────────────────────────────┐   │
│  │      Next.js 15 App          │   │
│  │  ┌────────┐  ┌────────────┐  │   │
│  │  │  PWA   │  │ API Routes │  │   │
│  │  │Frontend│◄►│+ Server    │  │   │
│  │  │(React) │  │  Actions   │  │   │
│  │  └────────┘  └─────┬──────┘  │   │
│  │                    │         │   │
│  │         ┌──────────▼───────┐ │   │
│  │         │ SQLite (Drizzle) │ │   │
│  │         └──────────────────┘ │   │
│  └──────────────────────────────┘   │
│                                     │
│  Volume: ./data → /app/data         │
│  (SQLite DB + uploaded images)      │
└─────────────────────────────────────┘
        ▲ Tailscale network
        │
  Family devices (PWA installed)
```

### Key architectural decisions

- **Single container**: No separate database server. SQLite is embedded, backed by a Docker volume.
- **Pluggable map provider**: Abstraction layer over OSM/Leaflet, Google Maps, and Mapbox. Switchable from admin settings at runtime.
- **PWA-first**: Installable, offline-capable, share target support for frictionless location capture from WhatsApp.
- **No external dependencies**: No Redis, no message queues. Just Next.js + SQLite.

---

## Data Model

### Users
| Field | Type | Notes |
|-------|------|-------|
| id | text (ULID) | Primary key |
| name | text | Display name |
| email | text | Unique, for login |
| password_hash | text | bcrypt hashed |
| role | text | `admin` or `member` |
| created_at | integer | Unix timestamp |

### Locations
| Field | Type | Notes |
|-------|------|-------|
| id | text (ULID) | Primary key |
| name | text | Place name |
| description | text | Optional notes |
| latitude | real | Coordinate |
| longitude | real | Coordinate |
| address | text | Human-readable address |
| category | text | `restaurant`, `cafe`, `street_food`, `bakery`, `bar`, `dessert`, `other` |
| cuisine | text | JSON array of cuisine tags |
| price_range | integer | 1-4 (maps to currency symbols) |
| source_url | text | Original shared link |
| source_type | text | `google_maps`, `instagram`, `manual` |
| added_by | text | FK → Users.id |
| visited | integer | 0 or 1 |
| created_at | integer | Unix timestamp |
| updated_at | integer | Unix timestamp |

### Reviews
| Field | Type | Notes |
|-------|------|-------|
| id | text (ULID) | Primary key |
| location_id | text | FK → Locations.id |
| user_id | text | FK → Users.id |
| rating | integer | 1-5 |
| notes | text | Free text review |
| visited_at | integer | Unix timestamp |
| created_at | integer | Unix timestamp |

### Tags
| Field | Type | Notes |
|-------|------|-------|
| id | text (ULID) | Primary key |
| name | text | Tag label |
| color | text | Hex color for UI |

### LocationTags (join table)
| Field | Type | Notes |
|-------|------|-------|
| location_id | text | FK → Locations.id |
| tag_id | text | FK → Tags.id |

### LocationImages
| Field | Type | Notes |
|-------|------|-------|
| id | text (ULID) | Primary key |
| location_id | text | FK → Locations.id |
| file_path | text | Path relative to /app/data/images |
| uploaded_by | text | FK → Users.id |
| created_at | integer | Unix timestamp |

### AppSettings
| Field | Type | Notes |
|-------|------|-------|
| key | text | Setting name (PK) |
| value | text | Setting value (encrypted for API keys) |

Settings keys: `map_provider` (osm|google|mapbox), `google_maps_api_key`, `mapbox_api_key`, `invite_code`.

---

## Features

### 1. Home Screen — Map + List Toggle

**Map view:**
- All saved locations shown as color-coded pins (by category)
- Tap pin → preview card with name, category, rating, distance
- Tap card → full detail page
- Cluster nearby pins when zoomed out

**List view (default):**
- Sorted by distance from current GPS position
- Each card: name, category, cuisine tags, distance, rating, visited badge
- Infinite scroll or pagination

**Shared controls:**
- Search bar with instant text filtering (name, address, tags)
- Filter chips: category, cuisine, price range, visited/unvisited, added by
- Filters persist in URL params (shareable/bookmarkable)
- Floating "+" FAB to add location

### 2. Adding Locations

**Three input methods:**

**a) Share Target (mobile):**
- PWA registers as a share target in the web manifest
- User shares a link from WhatsApp/Instagram/Google Maps
- App opens a quick-save sheet with pre-filled data
- User confirms/edits category, tags, notes → save

**b) Paste & Parse (all platforms):**
- Paste a URL into the add form
- Parser detects URL type and extracts location data:
  - **Google Maps URLs**: Extract coordinates and place name from URL parameters
  - **Instagram URLs**: Fetch page metadata, extract tagged location if available
  - **Plain addresses**: Geocode via active map provider's geocoder
- Pre-fill the form with extracted data

**c) Manual Entry:**
- Search for a place using the map provider's search/geocoding
- Or drop a pin on the map
- Fill in all details manually

**Link parsing details:**
- Google Maps short links (goo.gl/maps, maps.app.goo.gl): Follow redirect, parse full URL
- Google Maps full URLs: Extract `@lat,lng` or `place/` or `q=` parameters
- Instagram post URLs: Fetch OG metadata, extract location tag if present
- Fallback: If parsing fails, keep the URL as source_url and let user enter details manually

### 3. Location Detail Page

- Map showing the pin location
- "Navigate" button → opens native maps app (Google Maps / Apple Maps) for turn-by-turn directions
- Full details: name, address, category, cuisine, price range, tags
- Image gallery (uploaded photos)
- Source link (original WhatsApp/Instagram URL)
- Family reviews section: each member's rating + notes
- "Mark as visited" toggle
- "Leave a review" form (rating 1-5 + notes + visited date)
- Edit/delete (for the person who added it, or admin)

### 4. Settings Page (admin only)

- **Map provider**: Radio select between OSM, Google Maps, Mapbox
  - Google Maps: API key input field
  - Mapbox: Access token input field
  - OSM: No config needed
  - Switching provider takes effect immediately for all users
- **Geocoding provider**: Auto-matched to map provider (Nominatim for OSM, respective APIs for Google/Mapbox)
- **Invite management**: View current invite code, regenerate it
- **Family members**: List all users, ability to remove members
- **Data export**: Export all locations as JSON/CSV for backup

### 5. Authentication & Authorization

- **Registration**: Via invite link containing the invite code. User provides name, email, password.
- **Login**: Email + password (credentials provider via Auth.js v5)
- **Roles**:
  - `admin`: Full access including settings, user management, delete any location
  - `member`: Add/edit own locations, review any location, view all locations
- **First user**: Automatically becomes admin during initial setup
- **Session**: JWT-based, stored in httpOnly cookie

### 6. PWA Capabilities

- **Web app manifest**: App name, icons, theme color, display: standalone
- **Service worker** (via Serwist/next-pwa):
  - Cache app shell for offline access
  - Cache previously viewed locations for offline browsing
  - Queue location additions when offline, sync when back online
- **Share target**: Registered in manifest for receiving shared links
- **Geolocation**: Request permission for distance-based sorting and "near me" features
- **Install prompt**: Show install banner on first visit

---

## Map Provider Abstraction

A provider interface that all three implementations conform to:

```typescript
interface MapProvider {
  // Display
  MapComponent: React.FC<MapProps>        // Renders the map
  MarkerComponent: React.FC<MarkerProps>  // Renders a pin
  
  // Geocoding
  geocode(address: string): Promise<GeoResult[]>
  reverseGeocode(lat: number, lng: number): Promise<string>
  
  // Search
  searchPlaces(query: string): Promise<PlaceResult[]>
}
```

Three implementations:
- `providers/osm.ts` — Leaflet + Nominatim
- `providers/google.ts` — @vis.gl/react-google-maps + Google Geocoding API
- `providers/mapbox.ts` — react-map-gl + Mapbox Geocoding API

Active provider is resolved from AppSettings at runtime. Components use a `useMapProvider()` hook that returns the active implementation.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| React | React 19 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (credentials provider) |
| Maps — OSM | react-leaflet + Leaflet |
| Maps — Google | @vis.gl/react-google-maps |
| Maps — Mapbox | react-map-gl + mapbox-gl |
| PWA | Serwist (next-pwa successor) |
| Link parsing | Custom parsers + cheerio |
| Geocoding | Nominatim / Google / Mapbox (provider-matched) |
| Icons | Lucide React |
| Client state | Zustand |
| Validation | Zod |
| Container | Docker + docker-compose |

---

## Docker Setup

```yaml
# docker-compose.yml
services:
  location-manager:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/location-manager.db
      - AUTH_SECRET=<generated-secret>
    restart: unless-stopped
```

```dockerfile
# Dockerfile (multi-stage, ARM64 compatible for Pi)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Volume `./data` persists:
- `location-manager.db` (SQLite database)
- `images/` (uploaded photos)

Backup = copy the `data/` directory.

---

## Project Structure

```
location-manager/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── next.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   ├── manifest.json
│   ├── icons/                    # PWA icons
│   └── sw.js                    # Service worker (generated)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout + providers
│   │   ├── page.tsx             # Home (map + list view)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── location/
│   │   │   ├── [id]/page.tsx    # Location detail
│   │   │   └── new/page.tsx     # Add location
│   │   ├── settings/page.tsx    # Admin settings
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── locations/route.ts
│   │       ├── locations/[id]/route.ts
│   │       ├── reviews/route.ts
│   │       ├── parse-link/route.ts
│   │       └── geocode/route.ts
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── map/
│   │   │   ├── map-container.tsx    # Provider-aware map wrapper
│   │   │   ├── location-marker.tsx
│   │   │   └── map-controls.tsx
│   │   ├── locations/
│   │   │   ├── location-card.tsx
│   │   │   ├── location-list.tsx
│   │   │   ├── location-filters.tsx
│   │   │   └── add-location-form.tsx
│   │   ├── reviews/
│   │   │   ├── review-card.tsx
│   │   │   └── review-form.tsx
│   │   └── layout/
│   │       ├── header.tsx
│   │       ├── bottom-nav.tsx
│   │       └── install-prompt.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts         # Drizzle client
│   │   │   ├── schema.ts        # All table definitions
│   │   │   └── migrations/
│   │   ├── map-providers/
│   │   │   ├── types.ts         # MapProvider interface
│   │   │   ├── osm.ts
│   │   │   ├── google.ts
│   │   │   ├── mapbox.ts
│   │   │   └── index.ts         # Provider resolver
│   │   ├── parsers/
│   │   │   ├── google-maps.ts
│   │   │   ├── instagram.ts
│   │   │   └── index.ts         # URL type detection + dispatch
│   │   ├── auth.ts              # Auth.js config
│   │   ├── geo.ts               # Distance calculation (Haversine)
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-map-provider.ts
│   │   ├── use-geolocation.ts
│   │   └── use-filters.ts
│   └── stores/
│       └── app-store.ts         # Zustand store
├── data/                        # Docker volume mount point
│   └── .gitkeep
└── docs/
    └── superpowers/
        └── specs/
```

---

## Non-Goals (Out of Scope)

- Real-time collaboration / live cursors
- Push notifications (can be added later)
- Social features beyond family sharing
- Restaurant menu/booking integration
- Automated WhatsApp bot that listens to the group
- Multi-family / multi-tenant support

---

## Known Risks & Limitations

- **Instagram link parsing**: Instagram aggressively blocks scraping. The parser will attempt to extract OG metadata, but may fail for private accounts or rate-limited requests. Fallback: user manually enters location details, source URL is preserved.
- **Google Maps short link resolution**: Short links (maps.app.goo.gl) require following redirects server-side. This is reliable but adds latency to the parse step.
- **Pi resource constraints**: SQLite + Next.js standalone is lightweight, but large image uploads could fill SD card storage. Consider pointing the Docker volume to an external USB drive if storage becomes an issue.
