import type { MiniApp, ShareTargetInput, ShareTargetRule } from "./types";
import { locationsMiniApp } from "./locations";
import { couponsMiniApp, couponsTextFallback } from "./coupons";

/**
 * The single source of truth for all mini-apps in FamilyHub.
 *
 * To add a new mini-app:
 *   1. Define it in `src/lib/mini-apps/<id>.ts` exporting a `MiniApp`
 *   2. Import and append it here
 *   3. Build the routes under `src/app/(app)/<id>/`
 *
 * The sidebar, dashboard, and share-target dispatcher will pick it up.
 */
const REGISTRY: MiniApp[] = [locationsMiniApp, couponsMiniApp];

/**
 * Extra share-target rules that aren't tied to a single mini-app
 * (e.g. fallback rules that run after every mini-app's own rules).
 */
const EXTRA_SHARE_TARGET_RULES: ShareTargetRule[] = [];
if (couponsTextFallback) EXTRA_SHARE_TARGET_RULES.push(couponsTextFallback);

/** All mini-apps, sorted by `order` (default 100), filtered by admin role. */
export function listMiniApps(opts: { isAdmin: boolean }): MiniApp[] {
  return REGISTRY.filter((m) => !m.adminOnly || opts.isAdmin).sort(
    (a, b) => (a.order ?? 100) - (b.order ?? 100)
  );
}

/** Whether `pathname` is inside the given mini-app's route namespace. */
export function isMiniAppActive(app: MiniApp, pathname: string): boolean {
  if (app.match) return app.match(pathname);
  return pathname === app.href || pathname.startsWith(app.href + "/");
}

/**
 * Run the share-target dispatch chain. Returns the redirect path to follow,
 * or `null` if no rule matched (caller should fall back to dashboard).
 */
export function dispatchShareTarget(input: ShareTargetInput): string | null {
  const rules: ShareTargetRule[] = [
    ...REGISTRY.flatMap((m) => (m.shareTarget ? [m.shareTarget] : [])),
    ...EXTRA_SHARE_TARGET_RULES,
  ].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

  for (const rule of rules) {
    if (rule.match(input)) return rule.buildRedirect(input);
  }
  return null;
}
