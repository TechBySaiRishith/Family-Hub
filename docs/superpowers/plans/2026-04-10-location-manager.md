# Location Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a family-shared PWA for saving, organizing, and discovering restaurants/places — with pluggable map providers, link parsing from WhatsApp/Instagram, and distance-based sorting.

**Architecture:** Single Next.js 15 app with App Router, SQLite via Drizzle ORM, Auth.js v5 for credentials-based auth, three swappable map providers (OSM/Leaflet, Google Maps, Mapbox). Deployed as Docker container on Raspberry Pi behind Tailscale.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Drizzle ORM, better-sqlite3, Auth.js v5, react-leaflet, @vis.gl/react-google-maps, react-map-gl, Serwist, Zustand, Zod, cheerio, Docker.

---

## File Structure

```
location-manager/
├── CLAUDE.md
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .env.example
├── .gitignore
├── package.json
├── next.config.ts
├── drizzle.config.ts
├── tsconfig.json
├── components.json                  # shadcn/ui config
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout + providers + fonts
│   │   ├── page.tsx                 # Home — map + list toggle
│   │   ├── globals.css              # Tailwind imports + custom styles
│   │   ├── login/
│   │   │   └── page.tsx             # Login form
│   │   ├── register/
│   │   │   └── page.tsx             # Invite-based registration
│   │   ├── location/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx         # Location detail + reviews
│   │   │   └── new/
│   │   │       └── page.tsx         # Add location (share target + paste + manual)
│   │   ├── settings/
│   │   │   └── page.tsx             # Admin settings
│   │   ├── share-target/
│   │   │   └── page.tsx             # PWA share target handler
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts         # Auth.js route handler
│   │       ├── locations/
│   │       │   └── route.ts         # GET (list) + POST (create)
│   │       ├── locations/[id]/
│   │       │   └── route.ts         # GET + PUT + DELETE single location
│   │       ├── reviews/
│   │       │   └── route.ts         # POST review
│   │       ├── parse-link/
│   │       │   └── route.ts         # POST — parse URL → location data
│   │       ├── geocode/
│   │       │   └── route.ts         # GET — geocode/reverse-geocode
│   │       ├── settings/
│   │       │   └── route.ts         # GET + PUT app settings
│   │       ├── users/
│   │       │   └── route.ts         # GET users list, DELETE user
│   │       ├── tags/
│   │       │   └── route.ts         # GET + POST + DELETE tags
│   │       ├── images/
│   │       │   └── route.ts         # POST upload image
│   │       └── export/
│   │           └── route.ts         # GET export locations as JSON/CSV
│   ├── components/
│   │   ├── ui/                      # shadcn/ui (button, card, input, dialog, etc.)
│   │   ├── map/
│   │   │   ├── map-container.tsx    # Renders active provider's map
│   │   │   ├── location-marker.tsx  # Pin with category color
│   │   │   └── map-search.tsx       # Search box on map
│   │   ├── locations/
│   │   │   ├── location-card.tsx    # Card for list view
│   │   │   ├── location-list.tsx    # Scrollable list with distance sort
│   │   │   ├── location-filters.tsx # Filter chips + search bar
│   │   │   └── add-location-form.tsx# Multi-mode add form
│   │   ├── reviews/
│   │   │   ├── review-card.tsx      # Single review display
│   │   │   └── review-form.tsx      # Rating + notes form
│   │   └── layout/
│   │       ├── header.tsx           # App header with user menu
│   │       ├── bottom-nav.tsx       # Mobile bottom navigation
│   │       └── install-prompt.tsx   # PWA install banner
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts            # Drizzle client singleton
│   │   │   └── schema.ts           # All table definitions
│   │   ├── map-providers/
│   │   │   ├── types.ts            # MapProvider interface + shared types
│   │   │   ├── osm.tsx             # Leaflet + Nominatim implementation
│   │   │   ├── google.tsx          # Google Maps implementation
│   │   │   ├── mapbox.tsx          # Mapbox implementation
│   │   │   └── index.ts            # getMapProvider() resolver
│   │   ├── parsers/
│   │   │   ├── google-maps.ts      # Parse Google Maps URLs
│   │   │   ├── instagram.ts        # Parse Instagram URLs
│   │   │   └── index.ts            # detectUrlType + parseUrl dispatcher
│   │   ├── auth.ts                 # Auth.js v5 config
│   │   ├── geo.ts                  # Haversine distance, sorting
│   │   ├── utils.ts                # cn(), formatDistance(), etc.
│   │   └── validations.ts          # Zod schemas for all API inputs
│   ├── hooks/
│   │   ├── use-map-provider.ts     # React hook for active provider
│   │   ├── use-geolocation.ts      # Browser geolocation hook
│   │   └── use-filters.ts          # Filter state from URL params
│   └── stores/
│       └── app-store.ts            # Zustand: user location, view mode, UI state
├── data/
│   └── .gitkeep
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-10-location-manager-design.md
        └── plans/
            └── 2026-04-10-location-manager.md
```

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `drizzle.config.ts`, `.env.example`, `.gitignore`, `.dockerignore`, `components.json`, `src/app/globals.css`, `CLAUDE.md`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "D:/Projects/Location Manager"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --skip-install
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install drizzle-orm better-sqlite3 @auth/core @auth/drizzle-adapter next-auth@beta zustand zod ulid bcryptjs cheerio lucide-react clsx tailwind-merge class-variance-authority

npm install -D drizzle-kit @types/better-sqlite3 @types/bcryptjs
```

- [ ] **Step 3: Install map provider packages**

```bash
npm install leaflet react-leaflet @vis.gl/react-google-maps react-map-gl mapbox-gl

npm install -D @types/leaflet
```

- [ ] **Step 4: Install shadcn/ui**

```bash
npx shadcn@latest init -d
```

Then install needed components:

```bash
npx shadcn@latest add button card input label dialog select badge tabs avatar dropdown-menu separator sheet toast textarea popover command scroll-area toggle-group switch form
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:

```env
# Database
DATABASE_PATH=./data/location-manager.db

# Auth
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000

# Optional: Google Maps API Key (configure in app settings)
# GOOGLE_MAPS_API_KEY=

# Optional: Mapbox Access Token (configure in app settings)
# MAPBOX_ACCESS_TOKEN=
```

Copy to `.env.local`:

```bash
cp .env.example .env.local
```

Generate AUTH_SECRET:

```bash
npx auth secret
```

- [ ] **Step 6: Update next.config.ts**

Replace `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 7: Create drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH || "./data/location-manager.db",
  },
});
```

- [ ] **Step 8: Create .gitignore additions**

Append to `.gitignore`:

```
data/*.db
data/images/*
!data/.gitkeep
.env.local
```

- [ ] **Step 9: Create .dockerignore**

```
node_modules
.next
data
.env.local
.git
```

- [ ] **Step 10: Create data directory**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 11: Set up globals.css with Tailwind + Leaflet fix**

Replace `src/app/globals.css` with Tailwind v4 imports plus a Leaflet z-index fix:

```css
@import "tailwindcss";

@theme {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.145 0 0);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.145 0 0);
  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.145 0 0);
  --color-primary: oklch(0.205 0.064 285.885);
  --color-primary-foreground: oklch(0.985 0 0);
  --color-secondary: oklch(0.97 0 0);
  --color-secondary-foreground: oklch(0.205 0.064 285.885);
  --color-muted: oklch(0.97 0 0);
  --color-muted-foreground: oklch(0.556 0 0);
  --color-accent: oklch(0.97 0 0);
  --color-accent-foreground: oklch(0.205 0.064 285.885);
  --color-destructive: oklch(0.577 0.245 27.325);
  --color-destructive-foreground: oklch(0.985 0 0);
  --color-border: oklch(0.922 0 0);
  --color-input: oklch(0.922 0 0);
  --color-ring: oklch(0.708 0.165 254.624);
  --color-chart-1: oklch(0.646 0.222 41.116);
  --color-chart-2: oklch(0.6 0.118 184.704);
  --color-chart-3: oklch(0.398 0.07 227.392);
  --color-chart-4: oklch(0.828 0.189 84.429);
  --color-chart-5: oklch(0.769 0.188 70.08);
  --color-sidebar: oklch(0.985 0 0);
  --color-sidebar-foreground: oklch(0.145 0 0);
  --color-sidebar-primary: oklch(0.205 0.064 285.885);
  --color-sidebar-primary-foreground: oklch(0.985 0 0);
  --color-sidebar-accent: oklch(0.97 0 0);
  --color-sidebar-accent-foreground: oklch(0.205 0.064 285.885);
  --color-sidebar-border: oklch(0.922 0 0);
  --color-sidebar-ring: oklch(0.708 0.165 254.624);
  --radius: 0.625rem;
}

@layer base {
  body {
    @apply bg-background text-foreground;
  }
}

/* Leaflet z-index fix for shadcn dialogs */
.leaflet-container {
  z-index: 0;
}
```

- [ ] **Step 12: Create CLAUDE.md**

```markdown
# Location Manager

Family-shared PWA for saving and organizing restaurants/places.

## Tech Stack
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui
- SQLite via better-sqlite3 + Drizzle ORM
- Auth.js v5 (credentials provider)
- Pluggable maps: OSM/Leaflet, Google Maps, Mapbox
- PWA via Serwist
- Docker for deployment on Raspberry Pi

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npx drizzle-kit push` — Push schema to DB
- `npx drizzle-kit generate` — Generate migration
- `docker compose up -d --build` — Deploy

## Architecture
- Single Next.js app, API routes + Server Actions
- SQLite DB at `data/location-manager.db`
- Map provider is configurable at runtime (admin settings)
- All map components go through `src/lib/map-providers/` abstraction

## Conventions
- Use `ulid()` for all primary keys
- Zod schemas in `src/lib/validations.ts` for all API inputs
- Server components by default, `"use client"` only when needed
- All API routes validate session via `auth()` from `src/lib/auth.ts`
```

- [ ] **Step 13: Initialize git and commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js project with all dependencies"
```

---

### Task 2: Database Schema & Drizzle Setup

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/validations.ts`, `src/lib/utils.ts`

- [ ] **Step 1: Create utility functions**

Create `src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
```

- [ ] **Step 2: Create database schema**

Create `src/lib/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address").notNull(),
  category: text("category", {
    enum: ["restaurant", "cafe", "street_food", "bakery", "bar", "dessert", "other"],
  }).notNull().default("restaurant"),
  cuisine: text("cuisine").default("[]"), // JSON array
  priceRange: integer("price_range").default(2), // 1-4
  sourceUrl: text("source_url").default(""),
  sourceType: text("source_type", {
    enum: ["google_maps", "instagram", "manual"],
  }).notNull().default("manual"),
  addedBy: text("added_by").notNull().references(() => users.id),
  visited: integer("visited", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  notes: text("notes").default(""),
  visitedAt: integer("visited_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6366f1"),
});

export const locationTags = sqliteTable("location_tags", {
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.locationId, table.tagId] }),
]);

export const locationImages = sqliteTable("location_images", {
  id: text("id").primaryKey(),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
```

- [ ] **Step 3: Create database client**

Create `src/lib/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || "./data/location-manager.db";

// Ensure data directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
```

- [ ] **Step 4: Create Zod validation schemas**

Create `src/lib/validations.ts`:

```typescript
import { z } from "zod";

export const categoryEnum = z.enum([
  "restaurant", "cafe", "street_food", "bakery", "bar", "dessert", "other",
]);

export const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
  category: categoryEnum.default("restaurant"),
  cuisine: z.array(z.string()).default([]),
  priceRange: z.number().int().min(1).max(4).default(2),
  sourceUrl: z.string().url().or(z.literal("")).default(""),
  sourceType: z.enum(["google_maps", "instagram", "manual"]).default("manual"),
  tagIds: z.array(z.string()).default([]),
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  visited: z.boolean().optional(),
});

export const createReviewSchema = z.object({
  locationId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  notes: z.string().max(1000).default(""),
  visitedAt: z.string().datetime().optional(),
});

export const parseLinkSchema = z.object({
  url: z.string().url(),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  inviteCode: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

export const updateSettingsSchema = z.object({
  mapProvider: z.enum(["osm", "google", "mapbox"]).optional(),
  googleMapsApiKey: z.string().optional(),
  mapboxApiKey: z.string().optional(),
  inviteCode: z.string().min(4).optional(),
});
```

- [ ] **Step 5: Push schema to database**

```bash
npx drizzle-kit push
```

Expected: Tables created in `data/location-manager.db`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add database schema, Drizzle client, and Zod validations"
```

---

### Task 3: Authentication (Auth.js v5)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/register/page.tsx`

- [ ] **Step 1: Create Auth.js configuration**

Create `src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

- [ ] **Step 2: Create auth type augmentation**

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
```

- [ ] **Step 3: Create auth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Create registration API route**

Create `src/app/api/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, appSettings } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validations";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ulid } from "ulid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, inviteCode } = parsed.data;

  // Check invite code
  const setting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "invite_code"),
  });

  // If no invite code is set yet, this is the first user (setup mode)
  const userCount = await db.select({ value: count() }).from(users);
  const isFirstUser = userCount[0].value === 0;

  if (!isFirstUser) {
    if (!setting || setting.value !== inviteCode) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
    }
  }

  // Check if email already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = ulid();
  const role = isFirstUser ? "admin" : "member";

  await db.insert(users).values({
    id,
    name,
    email,
    passwordHash,
    role,
  });

  // If first user, set a default invite code
  if (isFirstUser) {
    await db.insert(appSettings).values({
      key: "invite_code",
      value: ulid().slice(0, 8).toLowerCase(),
    });
    // Set default map provider
    await db.insert(appSettings).values({
      key: "map_provider",
      value: "osm",
    });
  }

  return NextResponse.json({ id, name, email, role }, { status: 201 });
}
```

- [ ] **Step 5: Create middleware for route protection**

Create `src/middleware.ts`:

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ["/login", "/register", "/api/auth", "/api/register"];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublic) return NextResponse.next();

  // Allow static assets and manifest
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/settings") || pathname.startsWith("/api/settings") || pathname.startsWith("/api/users")) {
    if (req.auth.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Create login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Location Manager</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Create registration page**

Create `src/app/register/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      inviteCode: formData.get("inviteCode") as string,
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Registration failed");
      setLoading(false);
      return;
    }

    // Auto-login after registration
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Location Manager</CardTitle>
          <CardDescription>Create your account to start saving places</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                required
                defaultValue={searchParams.get("code") || ""}
                placeholder="Enter the invite code from your family"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 8: Create session provider wrapper**

Create `src/components/providers.tsx`:

```tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 9: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Location Manager",
  description: "Family-shared place saver and organizer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Location Manager",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e1b4b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Create PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "Location Manager",
  "short_name": "Locations",
  "description": "Family-shared place saver and organizer",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e1b4b",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "share_target": {
    "action": "/share-target",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

- [ ] **Step 11: Create placeholder PWA icons**

Generate simple placeholder icons (will be replaced with proper icons later):

```bash
mkdir -p public/icons
```

Create a simple SVG-based icon generation script — or for now, create placeholder files. The user can replace them.

- [ ] **Step 12: Verify auth flow works**

```bash
npm run dev
```

Visit `http://localhost:3000` → should redirect to `/login`.
Visit `/register` → fill form (first user, invite code can be anything) → should create admin user and redirect to `/`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add Auth.js v5 authentication with login/register pages"
```

---

### Task 4: Zustand Store & Geolocation Hook

**Files:**
- Create: `src/stores/app-store.ts`, `src/hooks/use-geolocation.ts`, `src/lib/geo.ts`

- [ ] **Step 1: Create Haversine distance utility**

Create `src/lib/geo.ts`:

```typescript
const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function sortByDistance<T extends { latitude: number; longitude: number }>(
  items: T[],
  userLat: number,
  userLng: number
): (T & { distance: number })[] {
  return items
    .map((item) => ({
      ...item,
      distance: haversineDistance(userLat, userLng, item.latitude, item.longitude),
    }))
    .sort((a, b) => a.distance - b.distance);
}
```

- [ ] **Step 2: Create geolocation hook**

Create `src/hooks/use-geolocation.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: "Geolocation not supported", loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          error: err.message,
          loading: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
```

- [ ] **Step 3: Create Zustand store**

Create `src/stores/app-store.ts`:

```typescript
import { create } from "zustand";

type ViewMode = "map" | "list";

interface AppState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Filter state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  selectedCuisines: string[];
  setSelectedCuisines: (cuisines: string[]) => void;
  priceFilter: number[];
  setPriceFilter: (prices: number[]) => void;
  visitedFilter: "all" | "visited" | "unvisited";
  setVisitedFilter: (filter: "all" | "visited" | "unvisited") => void;
  addedByFilter: string;
  setAddedByFilter: (userId: string) => void;

  // Reset all filters
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  viewMode: "list",
  setViewMode: (mode) => set({ viewMode: mode }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedCategories: [],
  setSelectedCategories: (categories) => set({ selectedCategories: categories }),
  selectedCuisines: [],
  setSelectedCuisines: (cuisines) => set({ selectedCuisines: cuisines }),
  priceFilter: [],
  setPriceFilter: (prices) => set({ priceFilter: prices }),
  visitedFilter: "all",
  setVisitedFilter: (filter) => set({ visitedFilter: filter }),
  addedByFilter: "",
  setAddedByFilter: (userId) => set({ addedByFilter: userId }),

  resetFilters: () =>
    set({
      searchQuery: "",
      selectedCategories: [],
      selectedCuisines: [],
      priceFilter: [],
      visitedFilter: "all",
      addedByFilter: "",
    }),
}));
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Zustand store, geolocation hook, and distance utilities"
```

---

### Task 5: Map Provider Abstraction Layer

**Files:**
- Create: `src/lib/map-providers/types.ts`, `src/lib/map-providers/osm.tsx`, `src/lib/map-providers/google.tsx`, `src/lib/map-providers/mapbox.tsx`, `src/lib/map-providers/index.ts`, `src/hooks/use-map-provider.ts`

- [ ] **Step 1: Define map provider types**

Create `src/lib/map-providers/types.ts`:

```typescript
import { ComponentType } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface PlaceResult {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: string;
}

export interface MapComponentProps {
  center: LatLng;
  zoom: number;
  markers: MarkerData[];
  onMarkerClick?: (id: string) => void;
  onMapClick?: (latlng: LatLng) => void;
  className?: string;
  userLocation?: LatLng | null;
}

export interface MapProviderConfig {
  name: string;
  label: string;
  MapComponent: ComponentType<MapComponentProps>;
  geocode: (address: string, apiKey?: string) => Promise<GeoResult[]>;
  reverseGeocode: (lat: number, lng: number, apiKey?: string) => Promise<string>;
  searchPlaces: (query: string, apiKey?: string) => Promise<PlaceResult[]>;
}

export const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#ef4444",
  cafe: "#f59e0b",
  street_food: "#f97316",
  bakery: "#ec4899",
  bar: "#8b5cf6",
  dessert: "#d946ef",
  other: "#6b7280",
};
```

- [ ] **Step 2: Create OSM/Leaflet provider**

Create `src/lib/map-providers/osm.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import type { MapComponentProps, MapProviderConfig, GeoResult, PlaceResult } from "./types";
import { CATEGORY_COLORS } from "./types";
import "leaflet/dist/leaflet.css";

function createCategoryIcon(category: string) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function MapClickHandler({ onMapClick }: { onMapClick?: (latlng: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

function OsmMap({ center, zoom, markers, onMarkerClick, onMapClick, className, userLocation }: MapComponentProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className={className || "h-full w-full"}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSize />
      <MapClickHandler onMapClick={onMapClick} />
      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={8}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.8, weight: 2 }}
        />
      )}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={createCategoryIcon(marker.category)}
          eventHandlers={{ click: () => onMarkerClick?.(marker.id) }}
        >
          <Popup>{marker.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

async function geocode(address: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({ q: address, format: "json", limit: "5" });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "LocationManager/1.0" },
  });
  const data = await res.json();
  return data.map((item: { lat: string; lon: string; display_name: string }) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
  }));
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "json" });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "User-Agent": "LocationManager/1.0" },
  });
  const data = await res.json();
  return data.display_name || "";
}

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const results = await geocode(query);
  return results.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    name: r.displayName.split(",")[0],
    address: r.displayName,
  }));
}

export const osmProvider: MapProviderConfig = {
  name: "osm",
  label: "OpenStreetMap",
  MapComponent: OsmMap,
  geocode,
  reverseGeocode,
  searchPlaces,
};
```

- [ ] **Step 3: Create Google Maps provider**

Create `src/lib/map-providers/google.tsx`:

```tsx
"use client";

import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import type { MapComponentProps, MapProviderConfig, GeoResult, PlaceResult } from "./types";
import { CATEGORY_COLORS } from "./types";
import { useCallback } from "react";

function GoogleMapInner({ center, zoom, markers, onMarkerClick, onMapClick, userLocation }: MapComponentProps) {
  const map = useMap();

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    },
    [onMapClick]
  );

  return (
    <Map
      defaultCenter={{ lat: center.lat, lng: center.lng }}
      defaultZoom={zoom}
      onClick={handleClick}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapId="location-manager"
    >
      {userLocation && (
        <AdvancedMarker position={{ lat: userLocation.lat, lng: userLocation.lng }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#3b82f6",
              border: "3px solid white",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          />
        </AdvancedMarker>
      )}
      {markers.map((marker) => (
        <AdvancedMarker
          key={marker.id}
          position={{ lat: marker.lat, lng: marker.lng }}
          onClick={() => onMarkerClick?.(marker.id)}
        >
          <Pin
            background={CATEGORY_COLORS[marker.category] || CATEGORY_COLORS.other}
            borderColor="white"
            glyphColor="white"
          />
        </AdvancedMarker>
      ))}
    </Map>
  );
}

function GoogleMap(props: MapComponentProps) {
  // API key is fetched from settings and passed via context
  const apiKey = (typeof window !== "undefined" && (window as unknown as { __GOOGLE_MAPS_KEY?: string }).__GOOGLE_MAPS_KEY) || "";

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-muted-foreground">Google Maps API key not configured. Go to Settings.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className={props.className || "h-full w-full"}>
        <GoogleMapInner {...props} />
      </div>
    </APIProvider>
  );
}

async function geocode(address: string, apiKey?: string): Promise<GeoResult[]> {
  if (!apiKey) return [];
  const params = new URLSearchParams({ address, key: apiKey });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK") return [];
  return data.results.map((item: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }) => ({
    lat: item.geometry.location.lat,
    lng: item.geometry.location.lng,
    displayName: item.formatted_address,
  }));
}

async function reverseGeocode(lat: number, lng: number, apiKey?: string): Promise<string> {
  if (!apiKey) return "";
  const params = new URLSearchParams({ latlng: `${lat},${lng}`, key: apiKey });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await res.json();
  return data.results?.[0]?.formatted_address || "";
}

async function searchPlaces(query: string, apiKey?: string): Promise<PlaceResult[]> {
  const results = await geocode(query, apiKey);
  return results.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    name: r.displayName.split(",")[0],
    address: r.displayName,
  }));
}

export const googleProvider: MapProviderConfig = {
  name: "google",
  label: "Google Maps",
  MapComponent: GoogleMap,
  geocode,
  reverseGeocode,
  searchPlaces,
};
```

- [ ] **Step 4: Create Mapbox provider**

Create `src/lib/map-providers/mapbox.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import ReactMapGL, { Marker, NavigationControl, GeolocateControl } from "react-map-gl";
import type { MapComponentProps, MapProviderConfig, GeoResult, PlaceResult } from "./types";
import { CATEGORY_COLORS } from "./types";
import "mapbox-gl/dist/mapbox-gl.css";

function MapboxMap({ center, zoom, markers, onMarkerClick, onMapClick, className, userLocation }: MapComponentProps) {
  const accessToken = (typeof window !== "undefined" && (window as unknown as { __MAPBOX_KEY?: string }).__MAPBOX_KEY) || "";

  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom,
  });

  const handleClick = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    [onMapClick]
  );

  if (!accessToken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-muted-foreground">Mapbox access token not configured. Go to Settings.</p>
      </div>
    );
  }

  return (
    <div className={className || "h-full w-full"}>
      <ReactMapGL
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onClick={handleClick}
        mapboxAccessToken={accessToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        {userLocation && (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#3b82f6",
                border: "3px solid white",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}
            />
          </Marker>
        )}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            latitude={marker.lat}
            longitude={marker.lng}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onMarkerClick?.(marker.id);
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: CATEGORY_COLORS[marker.category] || CATEGORY_COLORS.other,
                border: "3px solid white",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
            />
          </Marker>
        ))}
      </ReactMapGL>
    </div>
  );
}

async function geocode(address: string, apiKey?: string): Promise<GeoResult[]> {
  if (!apiKey) return [];
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=5`
  );
  const data = await res.json();
  return (data.features || []).map((f: { center: [number, number]; place_name: string }) => ({
    lat: f.center[1],
    lng: f.center[0],
    displayName: f.place_name,
  }));
}

async function reverseGeocode(lat: number, lng: number, apiKey?: string): Promise<string> {
  if (!apiKey) return "";
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${apiKey}`
  );
  const data = await res.json();
  return data.features?.[0]?.place_name || "";
}

async function searchPlaces(query: string, apiKey?: string): Promise<PlaceResult[]> {
  const results = await geocode(query, apiKey);
  return results.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    name: r.displayName.split(",")[0],
    address: r.displayName,
  }));
}

export const mapboxProvider: MapProviderConfig = {
  name: "mapbox",
  label: "Mapbox",
  MapComponent: MapboxMap,
  geocode,
  reverseGeocode,
  searchPlaces,
};
```

- [ ] **Step 5: Create provider resolver**

Create `src/lib/map-providers/index.ts`:

```typescript
import type { MapProviderConfig } from "./types";

export type { MapProviderConfig, MapComponentProps, MarkerData, LatLng, GeoResult, PlaceResult } from "./types";
export { CATEGORY_COLORS } from "./types";

let osmModule: typeof import("./osm") | null = null;
let googleModule: typeof import("./google") | null = null;
let mapboxModule: typeof import("./mapbox") | null = null;

export async function getMapProvider(name: string): Promise<MapProviderConfig> {
  switch (name) {
    case "google": {
      if (!googleModule) googleModule = await import("./google");
      return googleModule.googleProvider;
    }
    case "mapbox": {
      if (!mapboxModule) mapboxModule = await import("./mapbox");
      return mapboxModule.mapboxProvider;
    }
    case "osm":
    default: {
      if (!osmModule) osmModule = await import("./osm");
      return osmModule.osmProvider;
    }
  }
}
```

- [ ] **Step 6: Create map provider hook**

Create `src/hooks/use-map-provider.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { getMapProvider, type MapProviderConfig } from "@/lib/map-providers";

export function useMapProvider(providerName: string, apiKey?: string) {
  const [provider, setProvider] = useState<MapProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMapProvider(providerName).then((p) => {
      setProvider(p);
      setLoading(false);
    });
  }, [providerName]);

  // Set API keys on window for map components to read
  useEffect(() => {
    if (typeof window !== "undefined" && apiKey) {
      if (providerName === "google") {
        (window as unknown as { __GOOGLE_MAPS_KEY: string }).__GOOGLE_MAPS_KEY = apiKey;
      } else if (providerName === "mapbox") {
        (window as unknown as { __MAPBOX_KEY: string }).__MAPBOX_KEY = apiKey;
      }
    }
  }, [providerName, apiKey]);

  return { provider, loading };
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add pluggable map provider abstraction (OSM, Google Maps, Mapbox)"
```

---

### Task 6: Link Parsers (Google Maps & Instagram)

**Files:**
- Create: `src/lib/parsers/google-maps.ts`, `src/lib/parsers/instagram.ts`, `src/lib/parsers/index.ts`, `src/app/api/parse-link/route.ts`

- [ ] **Step 1: Create Google Maps URL parser**

Create `src/lib/parsers/google-maps.ts`:

```typescript
export interface ParsedLocation {
  name?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  sourceType: "google_maps" | "instagram" | "manual";
}

export async function parseGoogleMapsUrl(url: string): Promise<ParsedLocation> {
  let resolvedUrl = url;

  // Follow redirects for short URLs
  if (url.includes("goo.gl/maps") || url.includes("maps.app.goo.gl")) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      resolvedUrl = res.url;
    } catch {
      // If redirect fails, try to parse original URL
    }
  }

  const result: ParsedLocation = { sourceType: "google_maps" };

  // Try to extract coordinates from @lat,lng pattern
  const atMatch = resolvedUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    result.latitude = parseFloat(atMatch[1]);
    result.longitude = parseFloat(atMatch[2]);
  }

  // Try to extract from ?q=lat,lng or &ll=lat,lng
  if (!result.latitude) {
    const urlObj = new URL(resolvedUrl);
    const q = urlObj.searchParams.get("q");
    if (q) {
      const coordMatch = q.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
      if (coordMatch) {
        result.latitude = parseFloat(coordMatch[1]);
        result.longitude = parseFloat(coordMatch[2]);
      }
    }
  }

  // Try to extract place name from /place/Name/ pattern
  const placeMatch = resolvedUrl.match(/\/place\/([^/]+)/);
  if (placeMatch) {
    result.name = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
  }

  // Try data= parameter for coordinates
  if (!result.latitude) {
    const dataMatch = resolvedUrl.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dataMatch) {
      result.latitude = parseFloat(dataMatch[1]);
      result.longitude = parseFloat(dataMatch[2]);
    }
  }

  return result;
}

export function isGoogleMapsUrl(url: string): boolean {
  return (
    url.includes("google.com/maps") ||
    url.includes("goo.gl/maps") ||
    url.includes("maps.app.goo.gl") ||
    url.includes("maps.google.com")
  );
}
```

- [ ] **Step 2: Create Instagram URL parser**

Create `src/lib/parsers/instagram.ts`:

```typescript
import * as cheerio from "cheerio";
import type { ParsedLocation } from "./google-maps";

export async function parseInstagramUrl(url: string): Promise<ParsedLocation> {
  const result: ParsedLocation = { sourceType: "instagram" };

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
    });

    if (!res.ok) return result;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Try to extract location from OG meta tags
    const title = $('meta[property="og:title"]').attr("content") || "";
    const description = $('meta[property="og:description"]').attr("content") || "";

    // Instagram sometimes includes location in the title
    if (title) {
      result.name = title.split("|")[0]?.trim() || title.split("on Instagram")[0]?.trim();
    }

    // Try to find location data in JSON-LD or embedded scripts
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (data.contentLocation) {
          result.name = result.name || data.contentLocation.name;
          if (data.contentLocation.geo) {
            result.latitude = data.contentLocation.geo.latitude;
            result.longitude = data.contentLocation.geo.longitude;
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    });

    if (description && !result.address) {
      result.address = description;
    }
  } catch {
    // Instagram may block the request — return what we have
  }

  return result;
}

export function isInstagramUrl(url: string): boolean {
  return url.includes("instagram.com/p/") || url.includes("instagram.com/reel/");
}
```

- [ ] **Step 3: Create URL parser dispatcher**

Create `src/lib/parsers/index.ts`:

```typescript
import { parseGoogleMapsUrl, isGoogleMapsUrl, type ParsedLocation } from "./google-maps";
import { parseInstagramUrl, isInstagramUrl } from "./instagram";

export type { ParsedLocation };

export type UrlType = "google_maps" | "instagram" | "unknown";

export function detectUrlType(url: string): UrlType {
  if (isGoogleMapsUrl(url)) return "google_maps";
  if (isInstagramUrl(url)) return "instagram";
  return "unknown";
}

export async function parseUrl(url: string): Promise<ParsedLocation> {
  const type = detectUrlType(url);

  switch (type) {
    case "google_maps":
      return parseGoogleMapsUrl(url);
    case "instagram":
      return parseInstagramUrl(url);
    default:
      return { sourceType: "manual" };
  }
}
```

- [ ] **Step 4: Create parse-link API route**

Create `src/app/api/parse-link/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseLinkSchema } from "@/lib/validations";
import { parseUrl, detectUrlType } from "@/lib/parsers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = parseLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { url } = parsed.data;
  const urlType = detectUrlType(url);
  const result = await parseUrl(url);

  return NextResponse.json({
    ...result,
    urlType,
    sourceUrl: url,
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add URL parsers for Google Maps and Instagram links"
```

---

### Task 7: Location API Routes

**Files:**
- Create: `src/app/api/locations/route.ts`, `src/app/api/locations/[id]/route.ts`, `src/app/api/reviews/route.ts`, `src/app/api/tags/route.ts`, `src/app/api/geocode/route.ts`, `src/app/api/settings/route.ts`, `src/app/api/users/route.ts`, `src/app/api/images/route.ts`, `src/app/api/export/route.ts`

- [ ] **Step 1: Create locations list + create route**

Create `src/app/api/locations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locations, locationTags } from "@/lib/db/schema";
import { createLocationSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allLocations = await db.query.locations.findMany({
    orderBy: [desc(locations.createdAt)],
  });

  // Parse cuisine JSON strings
  const result = allLocations.map((loc) => ({
    ...loc,
    cuisine: JSON.parse(loc.cuisine || "[]"),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createLocationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tagIds, ...data } = parsed.data;
  const id = ulid();

  await db.insert(locations).values({
    id,
    ...data,
    cuisine: JSON.stringify(data.cuisine),
    addedBy: session.user.id,
  });

  // Insert tag associations
  if (tagIds.length > 0) {
    await db.insert(locationTags).values(
      tagIds.map((tagId) => ({ locationId: id, tagId }))
    );
  }

  return NextResponse.json({ id }, { status: 201 });
}
```

- [ ] **Step 2: Create single location route**

Create `src/app/api/locations/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locations, locationTags, reviews, locationImages } from "@/lib/db/schema";
import { updateLocationSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const location = await db.query.locations.findFirst({
    where: eq(locations.id, id),
  });

  if (!location) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const locationReviews = await db.query.reviews.findMany({
    where: eq(reviews.locationId, id),
  });

  const tags = await db.query.locationTags.findMany({
    where: eq(locationTags.locationId, id),
  });

  const images = await db.query.locationImages.findMany({
    where: eq(locationImages.locationId, id),
  });

  return NextResponse.json({
    ...location,
    cuisine: JSON.parse(location.cuisine || "[]"),
    reviews: locationReviews,
    tagIds: tags.map((t) => t.tagId),
    images,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const location = await db.query.locations.findFirst({
    where: eq(locations.id, id),
  });

  if (!location) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only the creator or admin can edit
  if (location.addedBy !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateLocationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tagIds, cuisine, ...data } = parsed.data;

  await db
    .update(locations)
    .set({
      ...data,
      ...(cuisine ? { cuisine: JSON.stringify(cuisine) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(locations.id, id));

  // Update tags if provided
  if (tagIds) {
    await db.delete(locationTags).where(eq(locationTags.locationId, id));
    if (tagIds.length > 0) {
      await db.insert(locationTags).values(
        tagIds.map((tagId) => ({ locationId: id, tagId }))
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const location = await db.query.locations.findFirst({
    where: eq(locations.id, id),
  });

  if (!location) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (location.addedBy !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(locations).where(eq(locations.id, id));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create reviews route**

Create `src/app/api/reviews/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews, locations } from "@/lib/db/schema";
import { createReviewSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { locationId, rating, notes, visitedAt } = parsed.data;

  // Verify location exists
  const location = await db.query.locations.findFirst({
    where: eq(locations.id, locationId),
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const id = ulid();

  await db.insert(reviews).values({
    id,
    locationId,
    userId: session.user.id,
    rating,
    notes,
    visitedAt: visitedAt ? new Date(visitedAt) : new Date(),
  });

  // Mark location as visited
  await db.update(locations).set({ visited: true, updatedAt: new Date() }).where(eq(locations.id, locationId));

  return NextResponse.json({ id }, { status: 201 });
}
```

- [ ] **Step 4: Create tags route**

Create `src/app/api/tags/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { createTagSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allTags = await db.query.tags.findMany();
  return NextResponse.json(allTags);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createTagSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const id = ulid();
  await db.insert(tags).values({ id, ...parsed.data });

  return NextResponse.json({ id, ...parsed.data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
  }

  await db.delete(tags).where(eq(tags.id, id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Create geocode route**

Create `src/app/api/geocode/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMapProvider } from "@/lib/map-providers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  // Get current map provider and API key
  const providerSetting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "map_provider"),
  });

  const providerName = providerSetting?.value || "osm";
  const provider = await getMapProvider(providerName);

  let apiKey: string | undefined;
  if (providerName === "google") {
    const keySetting = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, "google_maps_api_key"),
    });
    apiKey = keySetting?.value;
  } else if (providerName === "mapbox") {
    const keySetting = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, "mapbox_api_key"),
    });
    apiKey = keySetting?.value;
  }

  if (address) {
    const results = await provider.geocode(address, apiKey);
    return NextResponse.json(results);
  }

  if (lat && lng) {
    const result = await provider.reverseGeocode(parseFloat(lat), parseFloat(lng), apiKey);
    return NextResponse.json({ address: result });
  }

  return NextResponse.json({ error: "Provide address or lat/lng" }, { status: 400 });
}
```

- [ ] **Step 6: Create settings route**

Create `src/app/api/settings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { updateSettingsSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, key),
  });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  const existing = await getSetting(key);
  if (existing !== null) {
    await db.update(appSettings).set({ value }).where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({ key, value });
  }
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mapProvider = await getSetting("map_provider") || "osm";
  const googleMapsApiKey = await getSetting("google_maps_api_key") || "";
  const mapboxApiKey = await getSetting("mapbox_api_key") || "";
  const inviteCode = await getSetting("invite_code") || "";

  return NextResponse.json({
    mapProvider,
    googleMapsApiKey,
    mapboxApiKey,
    inviteCode,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mapProvider, googleMapsApiKey, mapboxApiKey, inviteCode } = parsed.data;

  if (mapProvider) await setSetting("map_provider", mapProvider);
  if (googleMapsApiKey !== undefined) await setSetting("google_maps_api_key", googleMapsApiKey);
  if (mapboxApiKey !== undefined) await setSetting("mapbox_api_key", mapboxApiKey);
  if (inviteCode) await setSetting("invite_code", inviteCode);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Create users route**

Create `src/app/api/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db.query.users.findMany({
    columns: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(allUsers);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 8: Create image upload route**

Create `src/app/api/images/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locationImages } from "@/lib/db/schema";
import { ulid } from "ulid";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = process.env.DATABASE_PATH
  ? path.join(path.dirname(process.env.DATABASE_PATH), "images")
  : "./data/images";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const locationId = formData.get("locationId") as string | null;

  if (!file || !locationId) {
    return NextResponse.json({ error: "File and locationId required" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const id = ulid();
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${id}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  await db.insert(locationImages).values({
    id,
    locationId,
    filePath: fileName,
    uploadedBy: session.user.id,
  });

  return NextResponse.json({ id, filePath: fileName }, { status: 201 });
}
```

- [ ] **Step 9: Create export route**

Create `src/app/api/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { desc } from "drizzle-orm";
import { locations } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const allLocations = await db.query.locations.findMany({
    orderBy: [desc(locations.createdAt)],
  });

  const data = allLocations.map((loc) => ({
    ...loc,
    cuisine: JSON.parse(loc.cuisine || "[]"),
  }));

  if (format === "csv") {
    const headers = ["name", "address", "latitude", "longitude", "category", "cuisine", "priceRange", "visited", "sourceUrl"];
    const rows = data.map((loc) =>
      headers.map((h) => {
        const val = loc[h as keyof typeof loc];
        if (Array.isArray(val)) return `"${val.join(", ")}"`;
        if (typeof val === "string" && val.includes(",")) return `"${val}"`;
        return String(val ?? "");
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=locations.csv",
      },
    });
  }

  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": "attachment; filename=locations.json",
    },
  });
}
```

- [ ] **Step 10: Create static image serving route**

Create `src/app/api/images/[filename]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = process.env.DATABASE_PATH
  ? path.join(path.dirname(process.env.DATABASE_PATH), "images")
  : "./data/images";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  // Prevent path traversal
  const safeName = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeName);

  try {
    const file = await fs.readFile(filePath);
    const ext = safeName.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      ext === "gif" ? "image/gif" :
      "image/jpeg";

    return new NextResponse(file, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add all API routes (locations, reviews, tags, settings, images, export)"
```

---

### Task 8: Layout Components (Header, Bottom Nav)

**Files:**
- Create: `src/components/layout/header.tsx`, `src/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Create header component**

Create `src/components/layout/header.tsx`:

```tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { MapPin, Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { data: session } = useSession();

  if (!session) return null;

  const initials = session.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Location Manager</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
            <DropdownMenuSeparator />
            {session.user.role === "admin" && (
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create bottom navigation**

Create `src/components/layout/bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, List, Plus, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { viewMode, setViewMode } = useAppStore();

  if (!session) return null;

  const isHome = pathname === "/";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        <button
          onClick={() => { setViewMode("list"); }}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1 text-xs",
            isHome && viewMode === "list" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <List className="h-5 w-5" />
          List
        </button>

        <button
          onClick={() => { setViewMode("map"); }}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1 text-xs",
            isHome && viewMode === "map" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Map className="h-5 w-5" />
          Map
        </button>

        <Link
          href="/location/new"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg -mt-4"
        >
          <Plus className="h-6 w-6" />
        </Link>

        {session.user.role === "admin" && (
          <Link
            href="/settings"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-xs",
              pathname === "/settings" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add header and bottom navigation layout components"
```

---

### Task 9: Map Container & Location Cards

**Files:**
- Create: `src/components/map/map-container.tsx`, `src/components/locations/location-card.tsx`, `src/components/locations/location-filters.tsx`, `src/components/locations/location-list.tsx`

- [ ] **Step 1: Create map container**

Create `src/components/map/map-container.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useMapProvider } from "@/hooks/use-map-provider";
import type { MapComponentProps } from "@/lib/map-providers/types";
import { Loader2 } from "lucide-react";

interface MapContainerProps extends Omit<MapComponentProps, "center" | "zoom"> {
  providerName: string;
  apiKey?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export function MapContainer({
  providerName,
  apiKey,
  center = { lat: 20.5937, lng: 78.9629 }, // India center default
  zoom = 5,
  ...mapProps
}: MapContainerProps) {
  const { provider, loading } = useMapProvider(providerName, apiKey);

  if (loading || !provider) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const MapComp = provider.MapComponent;
  return <MapComp center={center} zoom={zoom} {...mapProps} />;
}

// Dynamic import wrapper to avoid SSR issues with map libraries
export const DynamicMapContainer = dynamic(
  () => Promise.resolve(MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);
```

- [ ] **Step 2: Create location card**

Create `src/components/locations/location-card.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Navigation, Eye, EyeOff } from "lucide-react";
import { formatDistance } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/map-providers/types";

interface LocationCardProps {
  id: string;
  name: string;
  address: string;
  category: string;
  cuisine: string[];
  priceRange: number;
  visited: boolean;
  distance?: number;
  averageRating?: number;
  addedByName?: string;
}

const PRICE_LABELS = ["", "\u20B9", "\u20B9\u20B9", "\u20B9\u20B9\u20B9", "\u20B9\u20B9\u20B9\u20B9"];

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  street_food: "Street Food",
  bakery: "Bakery",
  bar: "Bar",
  dessert: "Dessert",
  other: "Other",
};

export function LocationCard({
  id,
  name,
  address,
  category,
  cuisine,
  priceRange,
  visited,
  distance,
  averageRating,
  addedByName,
}: LocationCardProps) {
  return (
    <Link href={`/location/${id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{name}</h3>
                {visited ? (
                  <Eye className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>

              <p className="text-sm text-muted-foreground truncate mt-0.5">
                <MapPin className="inline h-3 w-3 mr-1" />
                {address}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge
                  variant="secondary"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}20`,
                    color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
                    borderColor: `${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}40`,
                  }}
                  className="border text-xs"
                >
                  {CATEGORY_LABELS[category] || category}
                </Badge>

                {priceRange > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {PRICE_LABELS[priceRange]}
                  </Badge>
                )}

                {cuisine.slice(0, 2).map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">
                    {c}
                  </Badge>
                ))}
                {cuisine.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{cuisine.length - 2}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {averageRating !== undefined && averageRating > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{averageRating.toFixed(1)}</span>
                </div>
              )}
              {distance !== undefined && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Navigation className="h-3 w-3" />
                  {formatDistance(distance)}
                </div>
              )}
            </div>
          </div>

          {addedByName && (
            <p className="text-xs text-muted-foreground mt-2">
              Added by {addedByName}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Create location filters**

Create `src/components/locations/location-filters.tsx`:

```tsx
"use client";

import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "street_food", label: "Street Food" },
  { value: "bakery", label: "Bakery" },
  { value: "bar", label: "Bar" },
  { value: "dessert", label: "Dessert" },
  { value: "other", label: "Other" },
];

const VISITED_OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "visited" as const, label: "Visited" },
  { value: "unvisited" as const, label: "To Visit" },
];

interface LocationFiltersProps {
  users?: { id: string; name: string }[];
}

export function LocationFilters({ users = [] }: LocationFiltersProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,
    visitedFilter,
    setVisitedFilter,
    addedByFilter,
    setAddedByFilter,
    resetFilters,
  } = useAppStore();

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    visitedFilter !== "all" ||
    addedByFilter !== "";

  function toggleCategory(cat: string) {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                Filters
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Clear all
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Category</h4>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={selectedCategories.includes(cat.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <div className="flex gap-2">
                  {VISITED_OPTIONS.map((opt) => (
                    <Badge
                      key={opt.value}
                      variant={visitedFilter === opt.value ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setVisitedFilter(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {users.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Added by</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={addedByFilter === "" ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setAddedByFilter("")}
                    >
                      Everyone
                    </Badge>
                    {users.map((user) => (
                      <Badge
                        key={user.id}
                        variant={addedByFilter === user.id ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setAddedByFilter(user.id)}
                      >
                        {user.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCategories.map((cat) => (
            <Badge
              key={cat}
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => toggleCategory(cat)}
            >
              {CATEGORIES.find((c) => c.value === cat)?.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {visitedFilter !== "all" && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => setVisitedFilter("all")}
            >
              {visitedFilter === "visited" ? "Visited" : "To Visit"}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create location list**

Create `src/components/locations/location-list.tsx`:

```tsx
"use client";

import { LocationCard } from "./location-card";
import { MapPin } from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string;
  category: string;
  cuisine: string[];
  priceRange: number;
  visited: boolean;
  distance?: number;
  averageRating?: number;
  addedByName?: string;
}

interface LocationListProps {
  locations: Location[];
}

export function LocationList({ locations }: LocationListProps) {
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No places found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or add a new place
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {locations.map((location) => (
        <LocationCard key={location.id} {...location} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add map container, location cards, filters, and list components"
```

---

### Task 10: Home Page (Map + List View)

**Files:**
- Create: `src/app/page.tsx` (replace)

- [ ] **Step 1: Build the home page**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DynamicMapContainer } from "@/components/map/map-container";
import { LocationList } from "@/components/locations/location-list";
import { LocationFilters } from "@/components/locations/location-filters";
import { useAppStore } from "@/stores/app-store";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineDistance } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Map, List, Loader2 } from "lucide-react";
import type { MarkerData } from "@/lib/map-providers/types";

interface Location {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  cuisine: string[];
  priceRange: number;
  visited: boolean;
  addedBy: string;
  sourceUrl: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const geo = useGeolocation();
  const { viewMode, setViewMode, searchQuery, selectedCategories, visitedFilter, addedByFilter } = useAppStore();

  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [settings, setSettings] = useState<{ mapProvider: string; googleMapsApiKey: string; mapboxApiKey: string }>({
    mapProvider: "osm",
    googleMapsApiKey: "",
    mapboxApiKey: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.ok ? r.json() : { mapProvider: "osm", googleMapsApiKey: "", mapboxApiKey: "" }),
      fetch("/api/users").then((r) => r.ok ? r.json() : []),
    ]).then(([locs, setts, usrs]) => {
      setLocations(locs);
      setSettings(setts);
      setUsers(usrs);
      setLoading(false);
    });
  }, [status]);

  // Filter locations
  const filtered = useMemo(() => {
    let result = locations;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          l.cuisine.some((c) => c.toLowerCase().includes(q))
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((l) => selectedCategories.includes(l.category));
    }

    if (visitedFilter === "visited") {
      result = result.filter((l) => l.visited);
    } else if (visitedFilter === "unvisited") {
      result = result.filter((l) => !l.visited);
    }

    if (addedByFilter) {
      result = result.filter((l) => l.addedBy === addedByFilter);
    }

    return result;
  }, [locations, searchQuery, selectedCategories, visitedFilter, addedByFilter]);

  // Sort by distance and add distance field
  const withDistance = useMemo(() => {
    if (geo.latitude === null || geo.longitude === null) {
      return filtered.map((l) => ({ ...l, distance: undefined, addedByName: users.find((u) => u.id === l.addedBy)?.name }));
    }

    return filtered
      .map((l) => ({
        ...l,
        distance: haversineDistance(geo.latitude!, geo.longitude!, l.latitude, l.longitude),
        addedByName: users.find((u) => u.id === l.addedBy)?.name,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [filtered, geo.latitude, geo.longitude, users]);

  // Map markers
  const markers: MarkerData[] = useMemo(
    () =>
      filtered.map((l) => ({
        id: l.id,
        lat: l.latitude,
        lng: l.longitude,
        name: l.name,
        category: l.category,
      })),
    [filtered]
  );

  const apiKey = settings.mapProvider === "google" ? settings.googleMapsApiKey : settings.mapProvider === "mapbox" ? settings.mapboxApiKey : undefined;

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-20 sm:pb-4">
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">
              {filtered.length} place{filtered.length !== 1 ? "s" : ""}
            </h1>

            <div className="flex items-center gap-2">
              {/* Desktop view toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "map" | "list")} className="hidden sm:block">
                <TabsList>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4 mr-1" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <Map className="h-4 w-4 mr-1" />
                    Map
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Desktop add button */}
              <Button asChild size="sm" className="hidden sm:flex">
                <Link href="/location/new">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Place
                </Link>
              </Button>
            </div>
          </div>

          <LocationFilters users={users} />
        </div>

        <div className="mt-4 px-4">
          {viewMode === "list" ? (
            <LocationList locations={withDistance} />
          ) : (
            <div className="h-[calc(100vh-280px)] min-h-[400px] rounded-lg overflow-hidden border">
              <DynamicMapContainer
                providerName={settings.mapProvider}
                apiKey={apiKey}
                markers={markers}
                center={
                  geo.latitude && geo.longitude
                    ? { lat: geo.latitude, lng: geo.longitude }
                    : undefined
                }
                zoom={geo.latitude ? 12 : 5}
                userLocation={
                  geo.latitude && geo.longitude
                    ? { lat: geo.latitude, lng: geo.longitude }
                    : null
                }
                onMarkerClick={(id) => router.push(`/location/${id}`)}
              />
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add home page with map/list toggle, filters, and distance sorting"
```

---

### Task 11: Add Location Page

**Files:**
- Create: `src/components/locations/add-location-form.tsx`, `src/app/location/new/page.tsx`, `src/app/share-target/page.tsx`

- [ ] **Step 1: Create add location form**

Create `src/components/locations/add-location-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Link as LinkIcon, Search, MapPin, X } from "lucide-react";

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "street_food", label: "Street Food" },
  { value: "bakery", label: "Bakery" },
  { value: "bar", label: "Bar" },
  { value: "dessert", label: "Dessert" },
  { value: "other", label: "Other" },
];

const COMMON_CUISINES = [
  "Indian", "Chinese", "Italian", "Japanese", "Mexican", "Thai",
  "Korean", "American", "Mediterranean", "French", "South Indian",
  "North Indian", "Mughlai", "Continental", "Biryani", "Pizza",
  "Burger", "Sushi", "Seafood", "Vegetarian", "Vegan",
];

interface AddLocationFormProps {
  initialUrl?: string;
  initialText?: string;
}

export function AddLocationForm({ initialUrl, initialText }: AddLocationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [linkUrl, setLinkUrl] = useState(initialUrl || "");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [category, setCategory] = useState("restaurant");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState(2);
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<"google_maps" | "instagram" | "manual">("manual");

  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<{ lat: number; lng: number; displayName: string }[]>([]);
  const [searchingGeo, setSearchingGeo] = useState(false);

  // Auto-parse when initialUrl is provided
  useState(() => {
    if (initialUrl) {
      handleParseLink(initialUrl);
    }
  });

  async function handleParseLink(url?: string) {
    const parseUrl = url || linkUrl;
    if (!parseUrl) return;

    setParsing(true);
    try {
      const res = await fetch("/api/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parseUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.name) setName(data.name);
        if (data.latitude) setLatitude(data.latitude);
        if (data.longitude) setLongitude(data.longitude);
        if (data.address) setAddress(data.address);
        setSourceUrl(parseUrl);
        setSourceType(data.sourceType || "manual");

        // Reverse geocode if we have coords but no address
        if (data.latitude && data.longitude && !data.address) {
          const geoRes = await fetch(`/api/geocode?lat=${data.latitude}&lng=${data.longitude}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.address) setAddress(geoData.address);
          }
        }
      }
    } finally {
      setParsing(false);
    }
  }

  async function handleGeocode() {
    if (!geocodeQuery) return;
    setSearchingGeo(true);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(geocodeQuery)}`);
      if (res.ok) {
        const results = await res.json();
        setGeocodeResults(results);
      }
    } finally {
      setSearchingGeo(false);
    }
  }

  function selectGeoResult(result: { lat: number; lng: number; displayName: string }) {
    setLatitude(result.lat);
    setLongitude(result.lng);
    setAddress(result.displayName);
    if (!name) setName(result.displayName.split(",")[0]);
    setGeocodeResults([]);
    setGeocodeQuery("");
  }

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!latitude || !longitude) {
      alert("Please set a location by parsing a link or searching for an address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          latitude,
          longitude,
          address,
          category,
          cuisine: selectedCuisines,
          priceRange,
          sourceUrl,
          sourceType,
        }),
      });

      if (res.ok) {
        const { id } = await res.json();
        router.push(`/location/${id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Link Parser */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Paste a Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Paste Google Maps or Instagram URL..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => handleParseLink()}
              disabled={!linkUrl || parsing}
              variant="secondary"
            >
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parse"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search for a place or address..."
              value={geocodeQuery}
              onChange={(e) => setGeocodeQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleGeocode())}
            />
            <Button type="button" onClick={handleGeocode} disabled={searchingGeo} variant="secondary">
              {searchingGeo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          {geocodeResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {geocodeResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectGeoResult(r)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <MapPin className="inline h-3 w-3 mr-1 text-muted-foreground" />
                  {r.displayName}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location status */}
      {latitude && longitude && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-700 dark:text-green-400">
          <MapPin className="inline h-4 w-4 mr-1" />
          Location set: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Restaurant name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cuisine</Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CUISINES.map((c) => (
                <Badge
                  key={c}
                  variant={selectedCuisines.includes(c) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCuisine(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Price Range</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={priceRange === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriceRange(p)}
                >
                  {"\u20B9".repeat(p)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any notes about this place..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={loading || !name || !latitude}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          "Save Place"
        )}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create add location page**

Create `src/app/location/new/page.tsx`:

```tsx
"use client";

import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AddLocationForm } from "@/components/locations/add-location-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewLocationPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-20 sm:pb-4">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <h1 className="text-2xl font-bold mb-6">Add New Place</h1>
          <AddLocationForm />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Create share target page**

Create `src/app/share-target/page.tsx`:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AddLocationForm } from "@/components/locations/add-location-form";
import { Suspense } from "react";

function ShareTargetContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const text = searchParams.get("text") || "";
  const title = searchParams.get("title") || "";

  // Try to extract URL from text (WhatsApp often sends URLs in the text field)
  const extractedUrl = url || extractUrlFromText(text) || "";

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <h1 className="text-2xl font-bold mb-6">Save Shared Place</h1>
      <AddLocationForm initialUrl={extractedUrl} initialText={title || text} />
    </div>
  );
}

function extractUrlFromText(text: string): string | null {
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}

export default function ShareTargetPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 sm:pb-4">
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <ShareTargetContent />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add location creation page with link parsing and share target"
```

---

### Task 12: Location Detail Page

**Files:**
- Create: `src/app/location/[id]/page.tsx`, `src/components/reviews/review-card.tsx`, `src/components/reviews/review-form.tsx`

- [ ] **Step 1: Create review card**

Create `src/components/reviews/review-card.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface ReviewCardProps {
  userName: string;
  rating: number;
  notes: string;
  visitedAt?: string;
  createdAt: string;
}

export function ReviewCard({ userName, rating, notes, visitedAt, createdAt }: ReviewCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">{userName}</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
        {notes && <p className="text-sm text-muted-foreground">{notes}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          {visitedAt
            ? `Visited ${new Date(visitedAt).toLocaleDateString()}`
            : `Reviewed ${new Date(createdAt).toLocaleDateString()}`}
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create review form**

Create `src/components/reviews/review-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";

interface ReviewFormProps {
  locationId: string;
  onSubmitted: () => void;
}

export function ReviewForm({ locationId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          rating,
          notes,
        }),
      });

      if (res.ok) {
        setRating(0);
        setNotes("");
        onSubmitted();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-sm font-medium mb-1 block">Your Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  i <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <Textarea
        placeholder="Share your thoughts about this place..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />

      <Button type="submit" size="sm" disabled={rating === 0 || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Submit Review
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create location detail page**

Create `src/app/location/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DynamicMapContainer } from "@/components/map/map-container";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Star,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/map-providers/types";

interface LocationDetail {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  cuisine: string[];
  priceRange: number;
  visited: boolean;
  sourceUrl: string;
  sourceType: string;
  addedBy: string;
  createdAt: string;
  reviews: { id: string; userId: string; rating: number; notes: string; visitedAt: string; createdAt: string }[];
  images: { id: string; filePath: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  street_food: "Street Food",
  bakery: "Bakery",
  bar: "Bar",
  dessert: "Dessert",
  other: "Other",
};

const PRICE_LABELS = ["", "\u20B9", "\u20B9\u20B9", "\u20B9\u20B9\u20B9", "\u20B9\u20B9\u20B9\u20B9"];

export default function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState({ mapProvider: "osm", googleMapsApiKey: "", mapboxApiKey: "" });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  function fetchLocation() {
    fetch(`/api/locations/${id}`)
      .then((r) => r.json())
      .then(setLocation);
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/locations/${id}`).then((r) => r.json()),
      fetch("/api/users").then((r) => r.ok ? r.json() : []),
      fetch("/api/settings").then((r) => r.ok ? r.json() : { mapProvider: "osm" }),
    ]).then(([loc, usrs, setts]) => {
      setLocation(loc);
      const userMap: Record<string, string> = {};
      for (const u of usrs) userMap[u.id] = u.name;
      setUsers(userMap);
      setSettings(setts);
      setLoading(false);
    });
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this place? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    }
    setDeleting(false);
  }

  async function toggleVisited() {
    if (!location) return;
    await fetch(`/api/locations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: !location.visited }),
    });
    fetchLocation();
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Location not found</p>
      </div>
    );
  }

  const avgRating =
    location.reviews.length > 0
      ? location.reviews.reduce((sum, r) => sum + r.rating, 0) / location.reviews.length
      : 0;

  const canEdit = session?.user.id === location.addedBy || session?.user.role === "admin";
  const apiKey = settings.mapProvider === "google" ? settings.googleMapsApiKey : settings.mapProvider === "mapbox" ? settings.mapboxApiKey : undefined;

  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-20 sm:pb-4">
        <div className="max-w-2xl mx-auto">
          {/* Map */}
          <div className="h-48 sm:h-64">
            <DynamicMapContainer
              providerName={settings.mapProvider}
              apiKey={apiKey}
              center={{ lat: location.latitude, lng: location.longitude }}
              zoom={15}
              markers={[
                {
                  id: location.id,
                  lat: location.latitude,
                  lng: location.longitude,
                  name: location.name,
                  category: location.category,
                },
              ]}
            />
          </div>

          <div className="px-4 py-4 space-y-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {/* Header info */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl font-bold">{location.name}</h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleVisited}
                  className="shrink-0"
                >
                  {location.visited ? (
                    <>
                      <Eye className="h-4 w-4 mr-1 text-green-500" />
                      Visited
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Not Visited
                    </>
                  )}
                </Button>
              </div>

              <p className="text-muted-foreground mt-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                {location.address}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[location.category]}20`,
                    color: CATEGORY_COLORS[location.category],
                  }}
                >
                  {CATEGORY_LABELS[location.category] || location.category}
                </Badge>

                {location.priceRange > 0 && (
                  <Badge variant="outline">{PRICE_LABELS[location.priceRange]}</Badge>
                )}

                {location.cuisine.map((c) => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}

                {avgRating > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({location.reviews.length})</span>
                  </div>
                )}
              </div>
            </div>

            {location.description && (
              <p className="text-sm">{location.description}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <a href={navigateUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate
                </a>
              </Button>

              {location.sourceUrl && (
                <Button variant="outline" asChild>
                  <a href={location.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}

              {canEdit && (
                <Button variant="outline" size="icon" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Added by {users[location.addedBy] || "Unknown"} on{" "}
              {new Date(location.createdAt).toLocaleDateString()}
            </p>

            <Separator />

            {/* Reviews */}
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Reviews ({location.reviews.length})
              </h2>

              <div className="space-y-2 mb-4">
                {location.reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    userName={users[review.userId] || "Unknown"}
                    rating={review.rating}
                    notes={review.notes}
                    visitedAt={review.visitedAt}
                    createdAt={review.createdAt}
                  />
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leave a Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReviewForm locationId={location.id} onSubmitted={fetchLocation} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add location detail page with reviews, navigation, and map"
```

---

### Task 13: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Create settings page**

Create `src/app/settings/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Map,
  Users,
  Key,
  Download,
  Loader2,
  Copy,
  RefreshCw,
  Trash2,
  Check,
} from "lucide-react";

interface Settings {
  mapProvider: string;
  googleMapsApiKey: string;
  mapboxApiKey: string;
  inviteCode: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    mapProvider: "osm",
    googleMapsApiKey: "",
    mapboxApiKey: "",
    inviteCode: "",
  });
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([setts, usrs]) => {
      setSettings(setts);
      setUsers(usrs);
      setLoading(false);
    });
  }, []);

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function regenerateInviteCode() {
    const code = Math.random().toString(36).substring(2, 10);
    setSettings((prev) => ({ ...prev, inviteCode: code }));
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: code }),
    });
  }

  async function deleteUser(userId: string) {
    if (!confirm("Remove this family member?")) return;
    const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/register?code=${settings.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-20 sm:pb-4">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <h1 className="text-2xl font-bold">Settings</h1>

          {/* Map Provider */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Map Provider
              </CardTitle>
              <CardDescription>
                Choose which map service to use for displaying locations and geocoding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "osm", label: "OpenStreetMap", desc: "Free, no key needed" },
                  { value: "google", label: "Google Maps", desc: "Requires API key" },
                  { value: "mapbox", label: "Mapbox", desc: "Requires access token" },
                ].map((provider) => (
                  <button
                    key={provider.value}
                    onClick={() => setSettings((prev) => ({ ...prev, mapProvider: provider.value }))}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      settings.mapProvider === provider.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-sm">{provider.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{provider.desc}</p>
                  </button>
                ))}
              </div>

              {settings.mapProvider === "google" && (
                <div className="space-y-2">
                  <Label htmlFor="googleKey">Google Maps API Key</Label>
                  <Input
                    id="googleKey"
                    type="password"
                    value={settings.googleMapsApiKey}
                    onChange={(e) => setSettings((prev) => ({ ...prev, googleMapsApiKey: e.target.value }))}
                    placeholder="AIza..."
                  />
                </div>
              )}

              {settings.mapProvider === "mapbox" && (
                <div className="space-y-2">
                  <Label htmlFor="mapboxKey">Mapbox Access Token</Label>
                  <Input
                    id="mapboxKey"
                    type="password"
                    value={settings.mapboxApiKey}
                    onChange={(e) => setSettings((prev) => ({ ...prev, mapboxApiKey: e.target.value }))}
                    placeholder="pk.ey..."
                  />
                </div>
              )}

              <Button onClick={saveSettings} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : saved ? (
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                ) : null}
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Invite Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Invite Code
              </CardTitle>
              <CardDescription>
                Share this link with family members to let them join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                  {settings.inviteCode}
                </code>
                <Button variant="outline" size="icon" onClick={copyInviteLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={regenerateInviteCode}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Invite link: {typeof window !== "undefined" ? window.location.origin : ""}/register?code={settings.inviteCode}
              </p>
            </CardContent>
          </Card>

          {/* Family Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Members ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                      {user.id !== session?.user.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Data
              </CardTitle>
              <CardDescription>Download all your locations for backup</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" asChild>
                <a href="/api/export?format=json" download>
                  Export JSON
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/export?format=csv" download>
                  Export CSV
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add admin settings page with map provider config, invite codes, and user management"
```

---

### Task 14: Docker Setup

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/data/location-manager.db

RUN mkdir -p /app/data && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/data/location-manager.db

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
services:
  location-manager:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_PATH=/app/data/location-manager.db
      - AUTH_SECRET=${AUTH_SECRET:-change-me-to-a-random-secret}
      - AUTH_URL=${AUTH_URL:-http://localhost:3000}
    restart: unless-stopped
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Dockerfile and docker-compose for Raspberry Pi deployment"
```

---

### Task 15: PWA Icons & Final Polish

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (generated via script)

- [ ] **Step 1: Generate PWA icons**

Create a simple icon generation script. We'll use a canvas approach via a build script, or for simplicity, generate SVG icons that work as PWA icons:

Create `scripts/generate-icons.js`:

```javascript
const fs = require("fs");
const path = require("path");

// Simple SVG icon - map pin on colored background
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#1e1b4b"/>
  <g transform="translate(${size * 0.25}, ${size * 0.15}) scale(${size * 0.005})">
    <path d="M50 10C30.67 10 15 25.67 15 45C15 72.5 50 95 50 95C50 95 85 72.5 85 45C85 25.67 69.33 10 50 10ZM50 57.5C43.1 57.5 37.5 51.9 37.5 45C37.5 38.1 43.1 32.5 50 32.5C56.9 32.5 62.5 38.1 62.5 45C62.5 51.9 56.9 57.5 50 57.5Z" fill="white"/>
  </g>
</svg>`;

const iconsDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

// Write SVG icons (modern browsers and PWAs support SVG icons)
fs.writeFileSync(path.join(iconsDir, "icon-192.svg"), svg(192));
fs.writeFileSync(path.join(iconsDir, "icon-512.svg"), svg(512));

console.log("Icons generated in public/icons/");
```

```bash
node scripts/generate-icons.js
```

Update `public/manifest.json` to reference SVG icons:

Replace icon entries:

```json
{
  "icons": [
    {
      "src": "/icons/icon-192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml"
    },
    {
      "src": "/icons/icon-512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 2: Create install prompt component**

Create `src/components/layout/install-prompt.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem("install-prompt-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setDismissed(true);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("install-prompt-dismissed", "true");
  }

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg">
        <Download className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Install Location Manager</p>
          <p className="text-xs text-muted-foreground">Add to your home screen for quick access</p>
        </div>
        <Button size="sm" onClick={handleInstall}>
          Install
        </Button>
        <button onClick={handleDismiss} className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add InstallPrompt to root layout**

Update `src/app/layout.tsx` — add the InstallPrompt inside Providers:

```tsx
import { InstallPrompt } from "@/components/layout/install-prompt";
```

Add `<InstallPrompt />` after `<Toaster />` inside the Providers wrapper.

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PWA icons, install prompt, and verify production build"
```

---

### Task 16: Final Integration Test

- [ ] **Step 1: Start dev server and test full flow**

```bash
npm run dev
```

Test manually:
1. Visit `http://localhost:3000` → redirected to `/login`
2. Go to `/register` → create first user (any invite code works for first user)
3. Should redirect to home → empty state, map/list toggle working
4. Click "+" → add location page
5. Paste a Google Maps URL → should parse and fill in coordinates
6. Fill details and save → redirected to detail page
7. Leave a review on the detail page
8. Go back to home → location appears in list, sorted by distance
9. Open Settings → change map provider, view invite code
10. Filter and search working

- [ ] **Step 2: Create final commit**

```bash
git add -A
git commit -m "feat: Location Manager v1.0 — complete PWA with map providers, link parsing, and family sharing"
```
