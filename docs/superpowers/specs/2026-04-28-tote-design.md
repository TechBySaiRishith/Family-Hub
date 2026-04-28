# Tote — Pre-event Checklists Mini-App

**Date:** 2026-04-28
**Status:** Approved, in progress
**Predecessors:** [2026-04-28-familyhub-design.md](./2026-04-28-familyhub-design.md)

## Summary

Add a third mini-app, **Tote**, to FamilyHub. Tote tracks per-event packing
checklists for trips, weddings, and days out. Each event has one shared
family checklist plus a private checklist for each member.

## Goals

- Eliminate "we forgot the X" by giving every family event a checklist
  before it happens
- Built-in templates so the user starts with 80% of items pre-filled
- Personal-vs-shared distinction so private packing stays private but
  the family-coordination items (gift, card, snacks for car) are shared
- Slot cleanly into the existing FamilyHub mini-app shell — no shell edits

## Non-Goals

- Push reminders before an event (out of scope for this phase; the
  Reminders pipeline can be wired later, see "Future" below)
- Sharing a checklist outside the family (no WhatsApp export, no public
  links)
- Photos of items
- Multi-currency / cost tracking
- Calendar sync (iCal, Google Calendar)

---

## 1. Information Architecture

| Route | Purpose |
|---|---|
| `/tote` | List of upcoming + past events, with progress bars |
| `/tote/new` | Create event — pick template, set title/date/destination |
| `/tote/[id]` | Event detail with shared + per-user checklists |
| `/tote/[id]/edit` | Edit event meta (title/date/destination/notes) |
| `/tote/templates` | List user-saved templates |
| `/tote/templates/[id]` | Edit a saved template |

Built-in templates are read-only and viewable in the picker but not in
`/tote/templates` (which lists only the current user's saved templates).

---

## 2. Data model

All additions go in `src/lib/db/schema.ts`. No changes to existing tables.

### `events`

```ts
{
  id: text (pk, ulid),
  title: text not null,
  eventType: text not null  -- 'wedding' | 'trip' | 'day_out' | 'other'
  eventDate: integer (timestamp_ms) not null,
  destination: text default '',   -- free text e.g. "Mumbai, Bandra"
  notes: text default '',
  createdById: text not null references users.id (onDelete restrict),
  createdAt: integer (timestamp_ms),
  updatedAt: integer (timestamp_ms),
}
```

### `checklist_items`

```ts
{
  id: text (pk, ulid),
  eventId: text not null references events.id (onDelete cascade),
  scope: text not null,          -- 'shared' | 'user'
  userId: text references users.id (onDelete cascade),
                                   -- required when scope='user', null when 'shared'
  text: text not null,
  quantity: integer,             -- nullable, e.g. 3 for "shirts × 3"
  itemNotes: text default '',    -- free text per item
  category: text not null,       -- enum: outfits | documents | toiletries |
                                 --       electronics | family_kit | snacks |
                                 --       medicines | other
  isChecked: integer (boolean) default 0,
  checkedById: text references users.id (onDelete set null),
  checkedAt: integer (timestamp_ms),
  sortOrder: integer default 0,
  createdAt: integer (timestamp_ms),
}
```

Indexes: `(eventId, scope, userId)` for the per-event load query.

### `checklist_templates`

```ts
{
  id: text (pk, ulid),
  name: text not null,
  eventType: text not null,      -- same enum as events.eventType
  isBuiltIn: integer (boolean) default 0,
  createdById: text references users.id (onDelete cascade),
                                 -- null for built-ins, user id for saved
  createdAt: integer (timestamp_ms),
}
```

### `checklist_template_items`

```ts
{
  id: text (pk, ulid),
  templateId: text not null references checklist_templates.id (onDelete cascade),
  text: text not null,
  quantity: integer,
  category: text not null,
  sortOrder: integer default 0,
}
```

### Categories enum

```ts
"outfits" | "documents" | "toiletries" | "electronics" |
"family_kit" | "snacks" | "medicines" | "other"
```

### Event types enum

```ts
"wedding" | "trip" | "day_out" | "other"
```

---

## 3. Built-in templates

Seeded once on first server boot. Idempotent: query for any
`checklist_templates WHERE isBuiltIn = 1`; if zero rows, insert all six.
Non-destructive — never overwrites an existing built-in.

The seed is in code (`src/lib/tote/built-in-templates.ts`), not a SQL
migration, so adding new built-ins later is a code edit + redeploy.

| Template | eventType | Item count | Categories |
|---|---|---|---|
| Wedding | wedding | ~12 | Outfits, Family kit, Toiletries, Documents, Other |
| Trip — overnight | trip | ~14 | Outfits, Toiletries, Electronics, Documents, Medicines, Snacks |
| Trip — multi-day | trip | ~20 | Trip-overnight + extras |
| Day out | day_out | ~8 | Snacks, Toiletries, Electronics, Other |
| Beach day | day_out | ~12 | Day-out + Outfits (swim) + Other (towel, plastic bag) |
| Hill station | trip | ~22 | Trip-overnight + Outfits (warm) + Toiletries (lip balm) + Medicines (motion sickness) |

Exact item lists live in `src/lib/tote/built-in-templates.ts`.

---

## 4. Sharing & permissions

| Operation | Who can do it |
|---|---|
| Create event | Any logged-in user |
| Edit event meta | Creator OR admin |
| Delete event | Creator OR admin |
| List events | Any user (all events visible across the family) |
| Add shared item | Any user |
| Edit / delete shared item | Any user |
| Check / uncheck shared item | Any user |
| Add private item | Owner only |
| Edit / delete private item | Owner only |
| Check / uncheck private item | Owner only |
| Create user template | Any user (template owned by creator) |
| Delete user template | Creator only |
| Use built-in template | Any user (read-only) |
| Use another user's saved template | Not supported — saved templates are private to creator |

Server filter on the items query:
```sql
WHERE eventId = ? AND (scope = 'shared' OR (scope = 'user' AND userId = ?))
```

---

## 5. UI — event detail page

```
[Back]

WEDDING · 12 DEC 2026 · 14 DAYS AWAY
Cousin Riya's wedding
Mumbai, Bandra · "Don't forget the gift!"
                                        [Edit · Delete · Save as template]

──────────────────────────────────────────────
SHARED FAMILY LIST                  12 / 24 packed
──────────────────────────────────────────────
  OUTFITS
    ☐ Suit / lehenga
    ☑ Dance shoes — Mum · 2 days ago
    ...
  FAMILY KIT
    ☐ Gift
    ☐ Marriage card
    ...
  + Add item

──────────────────────────────────────────────
MY LIST                              3 / 8 packed
──────────────────────────────────────────────
  TOILETRIES
    ☐ Toothbrush
    ☐ Glasses case
  + Add item
```

Behaviours:
- "Save as template" prompts for a name, defaults to event type + date.
- Past events (eventDate < today) get a faded badge and don't appear in
  the dashboard widget.
- Long-press / context menu on item: edit, delete, change category,
  change quantity.
- Empty private list shows: "Your private list is empty. Add items only
  you can see."

---

## 6. Dashboard widget

`ToteDashboardWidget`:

- Header: "— Tote" / "Coming up"
- Up to 2 events with `eventDate >= today`, soonest first
- Each row: event-type kicker, event title, "X days away", progress
  ("12/24 packed", over total of shared + own private items)
- Empty state CTA: "Plan an event"

Mounts on the dashboard alongside the existing Locations + Coupons
widgets, picked up automatically by the registry.

---

## 7. Mini-app registry entry

```ts
// src/lib/mini-apps/tote.ts
{
  id: "tote",
  label: "Tote",
  href: "/tote",
  icon: Briefcase,                  // lucide-react
  order: 30,                        // after Locations (10), Coupons (20)
  quickAdd: { label: "Plan an event", href: "/tote/new" },
  dashboardWidget: ToteDashboardWidget,
  // No shareTarget — Tote is first-party only.
}
```

Append to `REGISTRY` in `src/lib/mini-apps/registry.ts`.

---

## 8. API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/tote/events` | GET | session | List all events (everyone sees) |
| `/api/tote/events` | POST | session | Create event, optionally seed from template |
| `/api/tote/events/[id]` | GET | session | Event + items (filtered by visibility) |
| `/api/tote/events/[id]` | PUT | creator/admin | Edit event meta |
| `/api/tote/events/[id]` | DELETE | creator/admin | Delete event (cascades items) |
| `/api/tote/events/[id]/save-as-template` | POST | session | Spawn a user template from this event's items |
| `/api/tote/items` | POST | session | Add item to an event (scope + userId checked) |
| `/api/tote/items/[id]` | PATCH | scope-aware | Edit text/quantity/notes/category/sortOrder |
| `/api/tote/items/[id]` | DELETE | scope-aware | Remove item |
| `/api/tote/items/[id]/check` | PATCH | scope-aware | Toggle isChecked + stamp checkedBy/At |
| `/api/tote/templates` | GET | session | List built-ins + caller's saved templates |
| `/api/tote/templates/[id]` | GET | session | Get template + items |
| `/api/tote/templates/[id]` | DELETE | creator | Delete a user template (built-ins immutable) |

Validation lives in Zod schemas in `src/lib/validations.ts`.

---

## 9. Rollout

Single phase, sequenced:

1. Schema + Drizzle push
2. Built-in template seed module + boot-time invocation
3. Validations
4. API routes (events first, then items, then templates)
5. Components: `TemplatePicker`, `EventCard`, `ChecklistGroup`, `ItemRow`, `AddItemInline`, `ToteDashboardWidget`
6. Pages: `/tote`, `/tote/new`, `/tote/[id]`, `/tote/templates`
7. Mini-app registry entry
8. Build / lint / typecheck

---

## 10. Risks

- **Seed idempotency**: must run only when no built-ins exist. Uses a
  count check inside a transaction.
- **Race on `isChecked`**: two family members tick a shared item
  simultaneously. We don't enforce single-checker semantics — the second
  PATCH overwrites `checkedById` and `checkedAt`. Acceptable for a family
  app.
- **Past-event clutter**: `/tote` list shows past events; if it grows
  too long, fold them into a collapsed "Past events" section after the
  list reaches a threshold (out of scope for V1; revisit if it bites).

---

## 11. Future (separate specs)

- Tote-specific reminders ("Wedding tomorrow — 3 unpacked items") wired
  into the existing Reminders pipeline by adding a new channel-aware
  scheduler entry.
- Promote a checked item from a private list to the shared list.
- Smart suggestions ("you usually pack X for weddings — add it?").
