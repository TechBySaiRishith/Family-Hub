---
project: FamilyHub (Location Manager)
reviewed: 2026-04-28
depth: deep
status: issues_found
findings:
  critical: 5
  high: 9
  medium: 11
  low: 7
  total: 32
---

# FamilyHub — Adversarial Code Review

Scope: `src/app/api/**`, `src/lib/{auth,db,reminders,parsers,ocr,validations}`, `src/middleware.ts`, `src/components/**`, `src/app/(app)/**`, `public/sw.js`, `public/manifest.json`, `next.config.ts`, `Dockerfile`, `docker-compose.yml`, `.gitignore`, `drizzle.config.ts`.

The app has a few real correctness bugs (FK cascade gaps, admin-gated `/api/users` breaking non-admin pages, share-target image flow) and some auth/validation issues that matter even on Tailscale (anyone with login can create/delete tags, see who claimed any coupon, etc.). Nothing here is a five-alarm Internet-facing CVE — but several items will produce broken UX or silent data corruption.

---

## CRITICAL

### CR-01 — Foreign keys with no `onDelete` block user deletion and risk corruption
**File:** `src/lib/db/schema.ts:28, 37, 61, 89, 91, 110, 110`

`PRAGMA foreign_keys = ON` is enabled (`src/lib/db/index.ts:16`), which is correct, but the following FKs have no `onDelete` clause and therefore default to `NO ACTION` / `RESTRICT`:

- `locations.addedBy` → `users.id` (line 28)
- `reviews.userId` → `users.id` (line 37) — note: `reviews.locationId` does cascade
- `locationImages.uploadedBy` → `users.id` (line 61)
- `coupons.usedById` → `users.id` (line 89)
- `coupons.createdById` → `users.id` (line 91)
- `reminderLog.userId` → `users.id` (line 110) — schema sets cascade, OK
- `reminderLog.couponId` → `coupons.id` — also OK

Effect: `DELETE /api/users?id=…` (`src/app/api/users/route.ts:31`) will throw a FK constraint error for any user who has ever added a location, posted a review, uploaded a location image, or created/claimed a coupon. The route is wrapped in nothing — it will return a 500 to the client, while the settings UI assumes success and silently does nothing because it only acts on `res.ok` (`src/app/(app)/settings/page.tsx:88-89`).

Worse, `locations.addedBy` has no cascade either way, but deleting a *location* cascades to `reviews/locationTags/locationImages` (correctly), so the asymmetry is dangerous: half-thought-through.

**Fix:**
```ts
// schema.ts
addedBy: text("added_by").notNull().references(() => users.id, { onDelete: "restrict" }),
// or, more usefully, soft-delete users (set deleted=true) and never hard-delete them.
// At minimum make the failure mode explicit:
```
And in `users/route.ts` DELETE, wrap in try/catch and return 409 when FK blocks deletion, telling the admin which records are blocking. Or implement soft-delete (`users.deleted: boolean`) and filter it from queries — preferred for an audit-trail app.

---

### CR-02 — `/api/users` is admin-only, but four user-facing pages call it on every load
**File:** `src/lib/auth.config.ts:44-46` together with:
- `src/app/(app)/page.tsx` (dashboard implicitly via /api/coupons only — OK)
- `src/app/(app)/locations/page.tsx:65`
- `src/app/(app)/locations/[id]/page.tsx:63`
- `src/app/(app)/coupons/page.tsx:59`
- `src/app/(app)/coupons/[id]/page.tsx:60`

The middleware blocks any non-admin from `GET /api/users`, but these pages call `fetch("/api/users")` to build `Record<id, name>` for "added by …" / "claimed by …" labels. For non-admin users the response will be a 401/redirect, the `r.ok ? r.json() : []` fallback fires, and you end up with `users[id]` returning `undefined` everywhere — so non-admin family members **always** see "added by a keeper" or "claimed by someone" instead of the actual name. A core feature of a *family* app is broken for non-admins.

**Fix:** Add a public-to-logged-in-users variant — a thin endpoint returning only `{ id, name }` for all users. Either:
- Add `GET /api/users/list` that any session can call (returns names only, no email/role/createdAt).
- Or relax the middleware: allow `GET /api/users` for any logged-in user but strip `email`/`createdAt`/`role` from the response unless the caller is admin. The current `users/route.ts` GET already projects only safe-ish columns (`id, name, email, role, createdAt`) — just drop `email`/`createdAt` for non-admins or split routes.

The DELETE handler should remain admin-only.

---

### CR-03 — `/api/settings` (admin-only) is fetched by every user on locations pages
**File:** `src/app/(app)/locations/page.tsx:64`, `src/app/(app)/locations/[id]/page.tsx:64`

Same pattern as CR-02. Non-admin members hit the locations pages, the request to `/api/settings` returns 401, and the fallback `{ mapProvider: "osm" }` kicks in. Result: even when the admin has configured Google Maps or Mapbox, **every non-admin sees OSM tiles** with no provider key — so they get an unstyled fallback if the admin chose Google.

Also note the cost: `/api/settings` GET returns *every secret* — SMTP password, Twilio token, VAPID private key — so the current "easy fix" of making it public is not safe.

**Fix:** Add a narrow public endpoint, e.g. `GET /api/settings/public` (or extend `/api/push/public-key`) returning only `{ mapProvider, googleMapsApiKey, mapboxApiKey }`. The "API keys" for client-side maps are publicly exposed in the bundle anyway by definition (browsers see them), so leaking them to logged-in family members is fine — what is **not** fine is the current behavior of dropping back to OSM.

---

### CR-04 — VAPID private key, SMTP password, Twilio auth token returned in plaintext on every settings GET
**File:** `src/app/api/settings/route.ts:22-46`

`GET /api/settings` returns `smtpPass`, `twilioToken`, `vapidPrivateKey`, `cronToken`, `googleMapsApiKey`, `mapboxApiKey` in plain text. Even though it is admin-only, **the admin's browser receives the full token over the network on every settings page load**, and the React form binds them as `<Input type="password">` inside state (`src/components/settings/reminder-services-form.tsx:153`). Anyone able to read the admin's open tab DevTools (or a malicious browser extension) walks away with all third-party credentials.

It also makes the cron token a write-then-read affair — the admin sees it again whenever they revisit settings, which is fine for a cron token but very wrong for the Twilio auth token (which is the entire account credential).

**Fix:**
- For sensitive secrets (SMTP pass, Twilio token, VAPID private key), return only a boolean `configured: true|false` and a masked preview (`••••1234`) on GET. Allow PUT to overwrite, and treat empty string in PUT as "leave unchanged" (current behaviour — `if (v !== undefined) writes.push(setSetting(k, v))` — accidentally honours empty strings, which will *erase* a saved password if the user just hits Save without re-typing it; see WR-04).
- For map API keys / cron token / VAPID public key, returning them is fine (they're either client-public or single-purpose).

---

### CR-05 — `data/uploads/` (coupon screenshots) is NOT gitignored
**File:** `.gitignore:43-46`

```
# data
data/*.db
data/images/*
!data/.gitkeep
```

This excludes only the SQLite DB and the (older?) `data/images/` path. The actual coupon upload root is `data/uploads/coupons/{ulid}.{ext}` (see `src/app/api/coupons/ocr/route.ts:7` and `src/app/api/share-target/route.ts:7`). Any developer who runs the app locally and then `git add .`'s will commit family members' coupon screenshots — including possible PII / personal financial info — into the repo. Same risk for `data/uploads/` generally.

`.dockerignore` does exclude `data` from the build context, but that's not the leak vector here.

**Fix:**
```
# .gitignore
data/*.db
data/*.db-shm
data/*.db-wal
data/images/
data/uploads/
!data/.gitkeep
```

---

## HIGH

### HI-01 — Tag mutations are open to every member; non-admin can delete any tag
**File:** `src/app/api/tags/route.ts:16-35`

Both `POST /api/tags` and `DELETE /api/tags?id=…` only check `if (!session)`. Any authenticated user can:
- Create a tag with arbitrary `name` (subject only to `max(50)` and a hex-color regex — fine).
- Delete *any* tag, including ones created by another family member, and (because `locationTags.tagId` cascades on delete) wipe that tag off every location that referenced it.

Treat tag mutations as admin-only, or at minimum require the deleter to be the creator (which means adding a `createdBy` column to `tags`). For a small family this is a low blast radius but it is silent destructive collaboration — exactly the thing the rest of the codebase is careful about (see coupon `usedById` enforcement).

**Fix:**
```ts
if (!session || session.user.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```
…or move tag DELETE behind `addedBy` ownership.

---

### HI-02 — Private coupons leak via `expiringOnly` listing for any user
**File:** `src/app/api/coupons/route.ts:17-30`

The visibility clause `or(eq(isPrivate, false), eq(createdById, session.user.id))` is correct. **However**, when `expiringOnly=true` is set the AND chain becomes `(visibility) AND isUsed=false AND expiry<=horizon` — that's still correct.

The actual leak is in **the dashboard `/`** (`src/app/(app)/page.tsx:71`) which calls `/api/coupons?expiring=true` and renders `coupon.description` and `coupon.sourceApp`. Within the API, the visibility clause IS applied, so private coupons of *other* users are filtered out — OK. False alarm on first read; this is fine. **Skip — not actually a bug.**

(Keeping the line item to flag it was investigated. Leaving severity LOW would be misleading; removing.)

— withdrawn —

### HI-02 — Coupon `usedById` exposed to non-claimer for private coupons
**File:** `src/app/api/coupons/[id]/use/route.ts:23-29`

When two users race to claim a coupon, the loser gets a 409 with `usedById` and `usedAt` of the winner. That's fine for shared coupons. But for *private* coupons (which can only be claimed by the creator, since visibility filters them away from others), this code path is unreachable for non-creators — actually fine. **However**, the loser-client also sees `users[data.usedById] || "someone"` (`src/app/(app)/coupons/[id]/page.tsx:74`) which means it tries to resolve a name. That's not a leak per se, only a UX wart on private coupons.

— withdrawn —

### HI-02 — `/api/parse-link` is an SSRF surface
**File:** `src/app/api/parse-link/route.ts:6-19` → `src/lib/parsers/google-maps.ts:14-19`, `src/lib/parsers/instagram.ts:60-72`

Authenticated members can hand the server arbitrary HTTPS URLs and the server will `fetch()` them. For Google Maps it follows redirects via `redirect: "follow"`. For Instagram it sends a Googlebot user-agent and reads HTML. There is no allow-list on protocol or host.

Risk in this Tailscale-only deployment is low (you said skip CSRF/rate-limit), but consider: a family member can probe internal Tailscale services from the server's perspective by submitting URLs like `http://100.x.y.z:8080/`, `http://192.168.1.1/`, `http://[::1]:9090/metrics`, etc. The parsers don't return raw HTML, but they return matched substrings (`og:title`, JSON-LD content) which can leak internal page titles.

`parseLinkSchema` only enforces `z.string().url()` — that allows *any* scheme that URL.parse accepts, including `file:`, though `fetch` will reject non-http(s).

**Fix:** Restrict the parser to URLs whose host matches the supported domains (Google Maps + Instagram). Reject anything else early. This is what `detectUrlType` already does — just gate `parseUrl` behind `if (urlType === "unknown") return 400`.

```ts
const urlType = detectUrlType(url);
if (urlType === "unknown") {
  return NextResponse.json({ error: "Unsupported URL" }, { status: 400 });
}
const result = await parseUrl(url);
```
Also add a 5–10s timeout on `fetch` (currently unbounded) so a slow Instagram doesn't tie up a server slot.

---

### HI-03 — `register` route has a TOCTOU race that can mint multiple admins
**File:** `src/app/api/register/route.ts:23-46`

`isFirstUser` is computed by `SELECT COUNT(*)`, and only after that does the route insert. Between the count and insert there is no transaction. Two simultaneous `POST /api/register` requests can both observe `userCount === 0`, both treat themselves as "first user", and both be inserted as admin. The second one will then also insert the (duplicate) `app_settings` rows — which is a unique-key violation on `key` and will throw 500 on the *second* request (good!), but the second user is already in `users` because the inserts happen before the settings-insert. That leaves the family with two admins and a thrown 500 to the second registrant.

Risk in practice (single-family deployment, Tailscale, two people happen to register at exactly the same moment) is essentially zero. But it's trivial to fix.

**Fix:** Wrap the whole block in a transaction. better-sqlite3 has synchronous transactions; with drizzle:
```ts
await db.transaction(async (tx) => {
  const userCount = await tx.select({ value: count() }).from(users);
  // …
});
```
Also: insert into `app_settings` only if it doesn't already exist (use `INSERT OR IGNORE` or check first), so a stale "first-user" race doesn't half-corrupt the settings table.

---

### HI-04 — Cron route always reveals "configured?" without auth
**File:** `src/app/api/cron/reminders/route.ts:5-19`

```ts
const config = await getReminderConfig();
if (!config.cronToken) {
  return NextResponse.json({ error: "Cron token not configured" }, { status: 503 });
}
const auth = req.headers.get("authorization") || "";
const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
if (token !== config.cronToken) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

This is a public route (matched via `authConfig.authorized` only — but middleware will allow it through because `pathname.startsWith("/api/cron/...")` doesn't match any admin-gate and `isLoggedIn` falls through). Wait — let me re-check. Looking at `auth.config.ts:22-48`, `authorized` returns `false` for unauthenticated users on any non-public route, which redirects to `/login`. But Auth.js for API routes returns 401 instead of redirect. So `/api/cron/reminders` requires login — meaning **a cron daemon hitting this endpoint with only a Bearer token will be redirected to /login** because it has no session cookie.

Either:
- The middleware short-circuits before `authorized` runs for API routes that are not in `publicRoutes`, in which case the cron would silently break.
- Or `authorized: false` on an API path translates to 401, in which case the cron token check is unreachable.

**Either way the route as written cannot work.** Add `/api/cron` to the `publicRoutes` array (or a similar bypass) and rely on the Bearer-token check for auth:

```ts
// auth.config.ts
const publicRoutes = ["/login", "/register", "/api/auth", "/api/register",
                       "/api/setup-status", "/api/cron"];
```

Verify with: `curl -H "Authorization: Bearer $TOKEN" http://host:3000/api/cron/reminders` from outside a logged-in browser — that should return 200 today; my read says it currently returns a redirect/401.

Also: `token !== config.cronToken` is a non-constant-time comparison. For a Tailscale-only deployment with a long ULID token this is irrelevant, but worth noting.

---

### HI-05 — Reminder scheduler iterates with N+1 dedupe queries inside a per-user loop
**File:** `src/lib/reminders/scheduler.ts:50-136, 158-167`

For each `prefs` (each family member) and each enabled channel, `dedupeChannel` issues one `findFirst` to `reminder_log` *per coupon*. With 5 family members × 3 channels × 20 coupons that's already 300 queries every cron run. SQLite is fast on Pi but this is unnecessary.

You said "performance is out of scope" — but this borders on a correctness issue because:
- The scheduler holds the better-sqlite3 connection synchronously inside a tight loop. If a digest sender (SMTP) takes 30s to time out, every other family member waits.
- `void recipients;` on line 98 is dead code — `recipients` is computed via `alreadyReminded` (which always returns `false`, line 141-144) and then never used. Confusing for the next reader and signals incomplete refactor.

**Fix:** Replace per-coupon `findFirst` with a single `select` constrained by `inArray(reminderLog.couponId, summary.map(c => c.id))`, then build a Set. Also delete the unused `alreadyReminded`/`recipients` block.

---

### HI-06 — Push subscription failures don't auto-clean stale subscriptions
**File:** `src/lib/reminders/scheduler.ts:102-117`, `src/lib/reminders/push.ts:37`

When a user uninstalls the PWA or revokes notifications, `webpush.sendNotification` will throw with status 404/410. The current code catches this into `result.errors` but **leaves the dead subscription stored in `notificationPreferences.pushSubscription`**, so every cron run will keep failing forever.

**Fix:**
```ts
try {
  await sendPushDigest(...);
} catch (e: any) {
  if (e?.statusCode === 404 || e?.statusCode === 410) {
    await db.update(notificationPreferences)
      .set({ pushEnabled: false, pushSubscription: null })
      .where(eq(notificationPreferences.userId, prefs.userId));
  }
  result.errors.push(...);
}
```

---

### HI-07 — `/api/share-target` saves files before any size or type guard
**File:** `src/app/api/share-target/route.ts:96-117`

```ts
const files = form.getAll("files");
for (const f of files) {
  if (f instanceof File && f.type.startsWith("image/")) {
    ensureDir(UPLOAD_DIR);
    const ext = f.type === "image/png" ? ".png" : ...
    const filename = `${ulid()}${ext}`;
    const fullPath = path.join(UPLOAD_DIR, filename);
    const buf = Buffer.from(await f.arrayBuffer());
    fs.writeFileSync(fullPath, buf);
```

There is **no size check** here (cf. `coupons/ocr/route.ts:22` which does enforce 8 MB). A logged-in family member can fill the disk by sharing a single 4 GB file via the share-target. `f.type` is a client-supplied MIME — `image/svg+xml` would slip past `startsWith("image/")` and still be saved with a `.jpg` extension; not directly exploitable but confused.

**Fix:** Mirror the OCR endpoint's `ALLOWED_TYPES` allowlist and `MAX_BYTES` check before `arrayBuffer()`. Also: prefer the streaming `fs.promises.writeFile` over sync `writeFileSync` to avoid blocking the event loop on large uploads.

---

### HI-08 — `images` upload route writes attacker-supplied extension
**File:** `src/app/api/images/route.ts:30-32`

```ts
const ext = file.name.split(".").pop() || "jpg";
const fileName = `${id}.${ext}`;
```

`file.name` is fully client-controlled. An attacker can set the filename to `pwn.htaccess` and the server will save `${id}.htaccess`. Or `pwn.jpg/../../etc/whatever` (path-separator handling will strip directory components on most platforms, but `..` survives). Even ignoring exotic extensions, mismatch between the ext and the validated MIME (`file.type`) means a `.gif` file gets saved as `.png` if the client lies about the name.

**Fix:** Derive the extension from the **validated** MIME type (as the coupon OCR route does on lines 29-35), not from the user-provided filename:

```ts
const extByMime: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ext = extByMime[file.type];
if (!ext) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
const fileName = `${id}.${ext}`;
```

There is no `[id]/locations/[id]/page.tsx` view that uses `/api/images/[filename]` server-side validation — the served file route uses `path.basename` so directory escape is contained, but the *stored* filename can still be weird. Storing extensions you don't trust is a footgun; fix at write time.

---

### HI-09 — `parse-link` Instagram fetch can hang the server indefinitely
**File:** `src/lib/parsers/instagram.ts:64-68`

`fetch()` with no `AbortSignal.timeout()` and no timeout option. Instagram is well-known to send slowloris-style responses to non-browser UAs, plus the goo.gl follow-redirect chain in `google-maps.ts:14-19` is unbounded. A single malicious URL can pin a Node worker.

**Fix:**
```ts
const res = await fetch(url, {
  signal: AbortSignal.timeout(8000),
  headers: { ... },
});
```
Apply same in `google-maps.ts`.

---

## MEDIUM

### MD-01 — `updateLocationSchema.partial()` silently drops `addedBy`/owner; no `name` length re-enforcement
**File:** `src/lib/validations.ts:21-23`, `src/app/api/locations/[id]/route.ts:44-50`

`updateLocationSchema = createLocationSchema.partial().extend({ visited })`. The server merges `data` (user-supplied) directly into `set({...data})` — so a user with edit rights on their own location can submit `{ addedBy: "<some-other-user-id>" }` and it would be ignored only because Drizzle treats unknown fields silently. Wait — Drizzle does pass unknown keys through to the SQL builder, depending on version. With Drizzle 0.45, `update().set()` strips unknown columns, so this is currently safe; but it relies on library behaviour you shouldn't trust. Same with `id` and timestamps.

**Fix:** Use `pick`/`omit` to make the shape explicit:
```ts
export const updateLocationSchema = createLocationSchema
  .omit({})
  .partial()
  .extend({ visited: z.boolean().optional() });
// And in the handler:
const allowed = ["name","description","latitude","longitude","address",
                 "category","cuisine","priceRange","sourceUrl","sourceType",
                 "visited"] as const;
const update = Object.fromEntries(
  Object.entries(parsed.data).filter(([k]) => allowed.includes(k as any)));
```
Also: `createCouponSchema.url` allows `z.string().url().or(z.literal(""))` but the empty string still passes through to the DB — fine — *however* the locations form posts `description`, `sourceUrl`, etc. on every edit. Think hard about which fields are meant to be patchable.

---

### MD-02 — `coupons/[id]/use` PATCH is open to any logged-in user, including for *private* coupons
**File:** `src/app/api/coupons/[id]/use/route.ts:8-21`

The PATCH handler loads no row before the conditional update, so a user can call PATCH on a *private* coupon ID belonging to another user. The SQL `UPDATE … WHERE id=? AND isUsed=false` with a private coupon would return `result.changes === 0` if isUsed=true, but if isUsed=false the *attacker* successfully marks it used and `usedById` becomes the attacker. The owner then sees their own coupon as "used by [attacker]". Because private coupons aren't listed for non-owners, the attacker would have to know the ULID — but ULIDs are not secret (they appear in `/coupons/{id}` URLs which can leak in logs/share targets).

**Fix:** Load the row first; reject if `isPrivate && createdById !== session.user.id`. Or change the WHERE clause to: `WHERE id=? AND isUsed=false AND (isPrivate=false OR createdById=?)`.

---

### MD-03 — Coupon detail GET strips no fields; OK, but PUT does not re-validate ownership of `imagePath`
**File:** `src/app/api/coupons/[id]/route.ts:34-44`

A user editing their own coupon can `PUT { imagePath: "../some-other-file.png" }` to point the rendered image at any path under `data/uploads/`. The image route (`/api/uploads/[...path]/route.ts:14-20`) does validate path-traversal at *read* time (`if (!normalized.startsWith(UPLOAD_ROOT)) 403`), so the attacker cannot escape `data/uploads/` — but they can rebind their coupon to any *other* user's coupon screenshot inside that root, leaking it inline on their own coupon page, even though the original was on a private coupon.

`imagePath` is `z.string().nullable().optional()` with no shape constraint.

**Fix:** Validate `imagePath` matches the format the upload route writes — `^coupons/[0-9A-HJKMNP-TV-Z]{26}\.(jpg|png|webp|gif)$` — and on PUT, refuse to change `imagePath` to anything you didn't return from your own OCR endpoint. Or simply disallow editing `imagePath` after creation.

---

### MD-04 — `PUT /api/settings` with empty string overwrites stored secret
**File:** `src/app/api/settings/route.ts:79-83`

```ts
for (const [k, v] of Object.entries(map)) {
  if (v !== undefined) writes.push(setSetting(k, v));
}
```

Combined with the form binding all secret fields as controlled `<Input value={settings.smtpPass} />`, if the GET handler (CR-04) returns the secret as a real string, the form will round-trip fine. But the moment we adopt the CR-04 fix and start returning a masked or empty value, the next save will write the empty/masked string back, **wiping the password**. Even today: an admin who clears the SMTP password field in the UI to "remove" it but then hits Save will set `smtpPass = ""` (string), which `getReminderConfig().smtp.configured` happily treats as falsy — so the reminder silently stops working. No error, no warning.

**Fix:**
- Treat empty string as "no change" *for sensitive fields only* (or for all string fields if you want symmetry):
  ```ts
  if (v !== undefined && v !== "") writes.push(setSetting(k, v));
  ```
- Provide an explicit "clear" affordance in the UI (X button) that sends `null`, and accept `null` in the schema.

---

### MD-05 — `setSetting` not transactional; concurrent writes can produce duplicate rows
**File:** `src/lib/reminders/settings.ts:10-17`, `src/app/api/settings/route.ts:13-20`

Two parallel calls to `setSetting("smtp_host", ...)` will both see `existing === null` (if it didn't exist), both run the INSERT, and the second one will throw because `key` is `PRIMARY KEY`. In single-admin practice this is unreachable, but it's the same TOCTOU pattern that infects `/register`. SQLite has `INSERT … ON CONFLICT (key) DO UPDATE SET value=excluded.value` — use it.

**Fix:**
```ts
await db.insert(appSettings)
  .values({ key, value })
  .onConflictDoUpdate({ target: appSettings.key, set: { value } });
```

---

### MD-06 — `sourceUrl` field accepts arbitrary URLs; rendered as `<a target="_blank" rel="noopener noreferrer">` — OK, but no protocol clamp
**File:** `src/lib/validations.ts:16` and `src/app/(app)/locations/[id]/page.tsx:221`

`z.string().url()` accepts `javascript:`, `data:`, and `vbscript:` schemes — `URL.parse` is happy with those. React will render `<a href="javascript:alert(1)">` and Chromium will execute it on click. Same for the coupon `url` field (line 93). For a family-only Tailscale app the threat actor pool is "your siblings", but the cost of fixing is one line.

**Fix:**
```ts
sourceUrl: z.string().url().refine(
  (s) => /^https?:\/\//i.test(s),
  "Only http(s) URLs allowed"
).or(z.literal("")).default(""),
```

---

### MD-07 — `/api/coupons/[id]` GET hands `usedById` and `usedAt` to anyone who can see the coupon
**File:** `src/app/api/coupons/[id]/route.ts:8-21`

For a *shared* coupon, anyone in the family can fetch it and see who claimed it — this is by design and rendered explicitly in the UI ("Used by Mum"). Fine.

But for a *private* coupon the route correctly 404s for non-owners. So no leak. **Skip.**

— withdrawn —

### MD-07 — Coupon list GET returns the same shape regardless of ownership; private coupons leak `usedById` to creator only — fine
**File:** `src/app/api/coupons/route.ts:32-37`

Same conclusion. Withdrawn.

— withdrawn —

### MD-07 — `webpush.setVapidDetails` is global state, called on every push send
**File:** `src/lib/reminders/push.ts:16`

`webpush.setVapidDetails(...)` mutates a module-level singleton. It's called inside `sendPushDigest` for every recipient. With one set of VAPID keys this is harmless, but it forces `webpush` to re-validate the keypair on every call (small cost) and means there is no isolation if you ever wanted per-user keys.

Move it to module init from settings (in a memoized initializer triggered by the scheduler), or accept the overhead.

— minor; could be downgraded to LOW —

### MD-08 — `runOcr` worker is created lazily but never terminated
**File:** `src/lib/ocr.ts:4-14`

The Tesseract worker is a long-lived child process. The module caches it in a top-level `workerPromise` but never calls `worker.terminate()`. In a Next.js standalone deploy the process restart on container redeploy will reap it; under `next dev` HMR the worker piles up. Memory creeps but doesn't leak in production.

**Fix:** Add `process.on("beforeExit", () => worker?.terminate())` once. Optional — flagging because OCR resource handling is a common production gotcha.

---

### MD-09 — `extractVenueFromCaption` regex `\b(?:visited|loved|...)\s+([A-Z]...)` can reach into URLs
**File:** `src/lib/parsers/instagram.ts:43-47`

If the caption contains "loved https://example.com/foo" the regex would grab `loved h` — actually it requires `[A-Z]` so capital first letter. Won't match URLs starting with lowercase. OK, but the `(?:visited|loved|tried|ate at)\s+([A-Z][...]{2,60}?)` pattern with case-insensitive flag means "Visited" with capital V starts a match and then the captured group must start with capital — fine. Edge cases:
- "Loved how the sun set" → captures `How the sun set` as the venue name. Garbage in.
- The fallback kicks in only when JSON-LD is absent and the pin emoji isn't found; family members will get a coupon with a name like "How The Sun Set" suggested. Annoying, not dangerous.

**Fix:** Drop the verb-based heuristic — too noisy. Or require longer match (≥ 2 words) and a capitalized second word.

---

### MD-10 — `parseDate` accepts ambiguous DD/MM/YYYY without indication; "01/02/2026" silently becomes 1 Feb
**File:** `src/lib/parsers/coupon.ts:46-53`

The first regex assumes Indian/UK ordering (DD/MM/YYYY). For an Indian family this is correct, but if any source app sends US format (MM/DD/YYYY) the parsed expiry will be off by months. The OCR endpoint never tells the user "I parsed this as 1 Feb — confirm?". The form does pre-fill the value, so the user gets a chance to notice — flag is that the parse-hint just says "Auto-filled 4 fields — review before saving" without showing the parsed date in human-friendly form. That's an existing UX item.

Also: date `< now()-24h` is rejected as fallback (line 145-149) — but the *primary* expiry pattern doesn't apply that sanity check. So `Valid till 31/01/2024` would fill in a 2-year-old expiry.

**Fix:** Apply the same "must be in the future or within last day" check to all expiry-pattern matches, not only the fallback.

---

### MD-11 — `sendPushDigest` parses `subscriptionJson` with no try/catch
**File:** `src/lib/reminders/push.ts:18`

`JSON.parse(subscriptionJson)` throws on malformed data, propagates up, gets caught by scheduler.ts:113 — fine. But the error will be `SyntaxError` with no context (no userId, no length). In the cron log it's just `push/{userId}: Unexpected token < in JSON at position 0`. Add `try/catch` to convert to a useful error.

Also: if a user's stored subscription is corrupt, every cron run will keep throwing for them; you don't disable the channel. See HI-06 — same fix applies.

---

## LOW

### LO-01 — `console.error("OCR failed:", err)` survives in production
**File:** `src/lib/ocr.ts:22`

You said "log spam" is in scope. This will fire on *every* unrecognisable image. Not noisy in normal use but worth replacing with a debug-level log or removing entirely (the function returns "" on failure, so the caller already handles it).

`src/components/providers.tsx:12` similarly: `console.warn("SW register failed:", err)` — fine to keep, it only fires in odd browsers.

---

### LO-02 — `Math.random()` for invite-code regeneration in client
**File:** `src/app/(app)/settings/page.tsx:77`

```ts
const code = Math.random().toString(36).substring(2, 10);
```

8 chars of `Math.random` is ~40 bits of entropy — fine for an invite code, but `crypto.getRandomValues()` is better practice and one line. The server-side initial code uses `ulid()` (line 47 of register), so the regen is the only place using `Math.random`.

**Fix:**
```ts
const buf = new Uint8Array(6);
crypto.getRandomValues(buf);
const code = Array.from(buf).map(b => b.toString(36)).join("").slice(0, 8);
```

---

### LO-03 — `coupons.expiryDate` stored as `timestamp_ms` but the form sends only YYYY-MM-DD
**File:** `src/components/coupons/add-coupon-form.tsx:101` ↔ `src/app/api/coupons/route.ts:56`

Client does `new Date(expiryDate).toISOString()` where `expiryDate` is `"2026-12-31"`. This is parsed as UTC midnight. The server then `new Date(expiryDate)` → stored as ms. When `formatExpiryLabel` does `daysUntilDate(c.expiryDate)`, it's compared to `Date.now()` in the user's local time. For a user in IST, "expires 31 Dec 2026" actually means "expires 31 Dec 2026 05:30 IST" — which is fine for "days until" (Math.ceil rounds up) but means a coupon expiring Dec 31 IST midnight can show "expired" to users in earlier-than-UTC zones. Single family in one timezone — moot. Worth a comment or `+ 23:59:59` on input to push it to end-of-day.

---

### LO-04 — `daysUntilDate` returns negative numbers; UI clamps with `<= 0` not `< 0`
**File:** `src/app/(app)/page.tsx:175-179`

```ts
{days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days left`}
```

`days <= 0` includes "expired 5 days ago" and labels them "Today". The dashboard fetches `expiring=true` which the API filters to `expiryDate >= horizon`(?) — looking at `route.ts:23-29`, there is no lower-bound filter. `lte(coupons.expiryDate, new Date(horizon))` (horizon = now + 7d) — so the dashboard query returns expired coupons that haven't been used. Combined with the UI bug, the dashboard shows expired coupons as "Today" — actively misleading.

**Fix:** Add `gte(coupons.expiryDate, new Date())` to the where clause when `expiringOnly`, or clamp the UI:
```ts
{days < 0 ? `Expired ${-days}d ago` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days left`}
```

---

### LO-05 — Unused imports / dead exports
**File:** `src/lib/reminders/scheduler.ts:7, 8, 190-192`

```ts
import { ulid } from "ulid";
import { ..., or } from "drizzle-orm";    // 'or' unused outside the void at bottom
import { ..., users } from "@/lib/db/schema"; // 'users' only referenced via void
// ...
void or; void users; // suppress lint
```

The `void` trick to silence lint is a code smell. `users` and `or` aren't used — remove them. Same in `email.ts`/`whatsapp.ts` — fine.

---

### LO-06 — `viewport.maximumScale = 1` blocks pinch-to-zoom (a11y)
**File:** `src/app/layout.tsx:38-43`

Setting `maximumScale: 1` (and the absence of `userScalable`) prevents users from zooming in. WCAG 1.4.4 forbids this. For an installed PWA on a family phone, the parents may want to zoom in on text. Drop `maximumScale` (and don't set `userScalable: false`).

---

### LO-07 — `<p>` and `<span>` text in service-worker `notificationclick` does substring match
**File:** `public/sw.js:39`

```js
if (client.url.includes(targetUrl) && "focus" in client) { return client.focus(); }
```

`includes` is a substring match. If `targetUrl = "/coupons/01J"` and the user has `https://hub/coupons/01J9XYZ` already open, the SW will focus that tab even though it's a *different* coupon. Use exact pathname match:

```js
const target = new URL(targetUrl, self.location.origin);
if (new URL(client.url).pathname === target.pathname) {...}
```

Also: SW has no `fetch` handler, so PWA offline behaviour is *no* offline behaviour — `navigator.serviceWorker.register("/sw.js")` succeeds but the app will fail to load the shell when offline. If offline-shell isn't a goal, that's fine; if it is, the SW needs at minimum a navigation-fallback caching strategy.

---

## Notes / Investigated but not flagged

- **Path traversal in `/api/uploads/[...path]`** (`src/app/api/uploads/[...path]/route.ts:17-20`): the `normalized.startsWith(UPLOAD_ROOT)` check is correct (Windows path separators handled by Node's `path.normalize`). Good.
- **Path traversal in `/api/images/[filename]`** (`src/app/api/images/[filename]/route.ts:11`): `path.basename(filename)` is sufficient, can't escape.
- **`/api/share-target` redirect URL injection**: redirects go to `new URL(path, origin)` — origin is from the request, internal only. OK.
- **bcrypt cost factor of 12** (`src/app/api/register/route.ts:40`): appropriate for 2026.
- **`auth.config.authorized` for static `/icons` and `/manifest.json`**: matches before login, OK.
- **`AUTH_SECRET=${AUTH_SECRET:-change-me-to-a-random-secret}` in `docker-compose.yml:10`**: this is a default-only fallback, and the user's deployment env will override. Worth a comment in the docker-compose telling the user not to leave the default — but you mentioned single-dev/Tailscale, so flagging at LO would be noise.
- **`viewport.themeColor` and PWA manifest icons**: SVG icons used at sizes 192×192 / 512×512. iOS Safari historically does not accept SVG icons for `apple-touch-icon`; a PNG fallback would help install UX on iPad. Not a bug, a polish item.

---

_Reviewed: 2026-04-28 by Claude (gsd-code-reviewer, Opus 4.7 — adversarial)_
