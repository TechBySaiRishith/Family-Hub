# Adding a new mini-app to FamilyHub

The shell (sidebar, dashboard, share-target dispatcher) reads from a single
mini-app registry, so you do **not** need to edit nav arrays, dashboard
widgets, or share-target logic when adding a new mini-app.

## Three steps

### 1. Build your routes

Create `src/app/(app)/<your-id>/` with whatever pages you need. Common shape:

```
src/app/(app)/recipes/
├── page.tsx           # list
├── new/page.tsx       # add form
└── [id]/page.tsx      # detail
```

Add API routes under `src/app/api/<your-id>/` as usual. Each route handler
should call `auth()` from `@/lib/auth` and check `session.user.role` for
admin-only operations.

### 2. (Optional) Build a dashboard widget

If you want a card on the home dashboard, create a client component, e.g.
`src/components/<your-id>/dashboard-widget.tsx`. It is responsible for its
own data fetching and empty state.

### 3. Register the mini-app

Create `src/lib/mini-apps/<your-id>.ts`:

```ts
import { ChefHat } from "lucide-react";
import type { MiniApp } from "./types";
import { RecipesDashboardWidget } from "@/components/recipes/dashboard-widget";

export const recipesMiniApp: MiniApp = {
  id: "recipes",
  label: "Recipes",
  href: "/recipes",
  icon: ChefHat,
  order: 30,                                  // sidebar order
  quickAdd: { label: "Add a recipe", href: "/recipes/new" },
  dashboardWidget: RecipesDashboardWidget,
  shareTarget: {                              // optional — lets users share into your mini-app
    priority: 30,
    match: ({ url }) => /allrecipes\.com|food52\.com/.test(url || ""),
    buildRedirect: ({ url }) =>
      `/recipes/new?url=${encodeURIComponent(url || "")}`,
  },
};
```

Then add it to `src/lib/mini-apps/registry.ts`:

```ts
import { recipesMiniApp } from "./recipes";

const REGISTRY: MiniApp[] = [
  locationsMiniApp,
  couponsMiniApp,
  recipesMiniApp,   // <-- add here
];
```

That's it. The sidebar picks up the entry, the dashboard renders the widget,
and the share-target API routes URLs into your flow.

## What lives where

- **`MiniApp` interface** — `src/lib/mini-apps/types.ts`. JSDoc explains every field.
- **Registry** — `src/lib/mini-apps/registry.ts`. Single source of truth.
- **Sidebar consumer** — `src/components/layout/app-sidebar.tsx`. Don't edit; it reads `listMiniApps()`.
- **Dashboard consumer** — `src/app/(app)/page.tsx`. Don't edit; it iterates `dashboardWidget` and `quickAdd` from the registry.
- **Share-target consumer** — `src/app/api/share-target/route.ts`. Don't edit; it calls `dispatchShareTarget()`.

## Conventions

- Use `ulid()` for primary keys (already standard).
- Validate inputs with Zod schemas in `src/lib/validations.ts`.
- Server components by default; mark client only when you need state/effects.
- For uploads, save under `data/uploads/<your-id>/` and return paths relative to `data/uploads/` so they're served by `/api/uploads/[...path]`. Add a Zod regex constraint on the path field that matches your upload format (see `couponImagePath` in `validations.ts`).
- For per-user prefs that don't fit the existing tables, create a new table in `src/lib/db/schema.ts` and a route handler — don't lump unrelated config into `app_settings`.

## Admin-only mini-apps

Set `adminOnly: true` on the `MiniApp` definition. The sidebar will only show
the entry to admins. You still need to enforce the role check in your route
handlers — the registry filter is UI-only.
