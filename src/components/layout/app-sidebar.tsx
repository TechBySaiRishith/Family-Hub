"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, Settings, LogOut, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { listMiniApps, isMiniAppActive } from "@/lib/mini-apps/registry";
import { ThemeToggle } from "./theme-toggle";

interface SystemNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  adminOnly?: boolean;
}

const TOP_ITEMS: SystemNavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/",
  },
];

const BOTTOM_ITEMS: SystemNavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const isAdmin = session.user.role === "admin";
  const initials = session.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const miniApps = listMiniApps({ isAdmin });

  return (
    <aside className="flex h-full w-full flex-col bg-card/40 border-r border-foreground/10">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-foreground/10">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          <div className="h-10 w-10 rounded-full border border-foreground/30 flex items-center justify-center transition-colors group-hover:border-accent group-hover:bg-accent/5">
            <span className="font-display text-lg italic group-hover:text-accent transition-colors">
              F
            </span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-tight">FamilyHub</span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
              Home, organised
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto" aria-label="Primary">
        {TOP_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={item.match(pathname)}
            onNavigate={onNavigate}
          />
        ))}

        <p className="px-3 mt-6 mb-2 text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
          — Mini-apps
        </p>
        <ul className="space-y-1">
          {miniApps.map((app) => (
            <li key={app.id}>
              <NavLink
                item={{
                  href: app.href,
                  label: app.label,
                  icon: app.icon,
                  match: (p) => isMiniAppActive(app, p),
                }}
                active={isMiniAppActive(app, pathname)}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-1">
          {BOTTOM_ITEMS.filter((i) => !i.adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={item.match(pathname)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-foreground/10 px-3 py-4">
        <div className="flex items-center justify-between gap-2 px-2 mb-3">
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Theme
          </span>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3 px-2 mb-2 border-t border-foreground/10 pt-3">
          <div className="relative h-9 w-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-display text-sm shrink-0">
            <span aria-hidden>{initials}</span>
            <span className="sr-only">{session.user.name}</span>
            {isAdmin && (
              <Crown
                className="absolute -top-1 -right-1 h-3.5 w-3.5 text-accent fill-accent bg-background rounded-full p-0.5"
                aria-label="Admin"
              />
            )}
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-display text-sm truncate">{session.user.name}</span>
            <span className="text-[10px] text-muted-foreground truncate">
              {session.user.email}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full min-h-11 flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: SystemNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active
          ? "bg-accent/10 text-accent"
          : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
        )}
        strokeWidth={1.6}
        aria-hidden
      />
      <span className="text-sm">{item.label}</span>
      {active && <span className="ml-auto h-1 w-1 rounded-full bg-accent" aria-hidden />}
    </Link>
  );
}
