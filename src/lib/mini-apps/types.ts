import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * A mini-app is a user-data domain inside FamilyHub (e.g. Locations, Coupons).
 * To add a new mini-app:
 *   1. Build the routes under `src/app/(app)/<id>/`.
 *   2. Define the MiniApp here (or in `src/lib/mini-apps/<id>.ts`).
 *   3. Add the definition to `src/lib/mini-apps/registry.ts`.
 *
 * The shell (sidebar + dashboard + share-target dispatcher) automatically
 * picks up the new entry — no edits needed in nav arrays or page components.
 */
export interface MiniApp {
  /** Stable identifier — used in URLs and as a React key */
  id: string;

  /** Human-readable label shown in the sidebar */
  label: string;

  /** Top-level route, e.g. "/coupons" */
  href: string;

  /** Sidebar icon */
  icon: LucideIcon;

  /** Order in the sidebar (smaller = higher up). Defaults to 100. */
  order?: number;

  /**
   * Active-state predicate. Defaults to "pathname === href OR starts with href/".
   * Override if your routes don't follow the convention.
   */
  match?: (pathname: string) => boolean;

  /**
   * If true, only admins see this mini-app in the sidebar.
   * Note: route protection is enforced separately via `auth.config.ts`.
   */
  adminOnly?: boolean;

  /** Quick-add button on the dashboard */
  quickAdd?: {
    label: string;
    href: string;
  };

  /**
   * Dashboard widget — a client component that renders this mini-app's
   * summary card (recent items, alerts, etc.). It is responsible for its
   * own data fetching and empty state. Receives no props.
   */
  dashboardWidget?: ComponentType;

  /**
   * Share-target rules. The first mini-app whose matcher returns true wins.
   * `buildRedirect` returns the absolute path (e.g. "/coupons/new?text=...")
   * to redirect to.
   */
  shareTarget?: ShareTargetRule;
}

export interface ShareTargetInput {
  title: string;
  text: string;
  url: string;
  imagePath?: string;
  ocrText?: string;
}

export interface ShareTargetRule {
  /**
   * Decide whether this mini-app handles the share. Run in priority order
   * (lower `priority` runs first). Return false to skip and let the next
   * mini-app try.
   */
  match: (input: ShareTargetInput) => boolean;
  /** Build the redirect URL once `match` returns true. */
  buildRedirect: (input: ShareTargetInput) => string;
  /**
   * Rules with smaller numbers run first. Image-aware rules should run
   * before plain-text rules. Defaults to 100.
   */
  priority?: number;
}
