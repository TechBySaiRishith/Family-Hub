"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { listMiniApps } from "@/lib/mini-apps/registry";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || !mounted) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
      </div>
    );
  }

  if (!session) return null;

  const isAdmin = session.user.role === "admin";
  const firstName = session.user.name.split(" ")[0];
  const greeting = getGreeting();
  const miniApps = listMiniApps({ isAdmin });
  const widgets = miniApps.filter((m) => m.dashboardWidget);
  const quickAdds = miniApps.filter((m) => m.quickAdd);

  return (
    <div className="pb-20 sm:pb-12">
      <section className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-8 sm:pt-10 lg:pt-14 pb-6 sm:pb-8 fade-up">
        <p className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-muted-foreground mb-3 sm:mb-4">
          — {greeting}, {firstName}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] leading-[0.95] sm:leading-[0.9] tracking-tight text-balance max-w-3xl">
          The home,{" "}
          <em className="text-accent">organised.</em>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-4 sm:mt-5 max-w-xl leading-relaxed">
          Places worth remembering. Coupons before they expire. A small amount of order, kept together.
        </p>

        {quickAdds.length > 0 && (
          <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-3">
            {quickAdds.map((app, i) => (
              <Button
                key={app.id}
                render={<Link href={app.quickAdd!.href} />}
                variant={i === 0 ? "accent" : "outline"}
                className="min-h-11"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {app.quickAdd!.label}
              </Button>
            ))}
          </div>
        )}
      </section>

      {widgets.length > 0 && (
        <section
          className={`grid gap-px bg-foreground/10 border-y border-foreground/10 ${
            widgets.length === 1 ? "" : "lg:grid-cols-2"
          }`}
        >
          {widgets.map((app) => {
            const Widget = app.dashboardWidget!;
            return <Widget key={app.id} />;
          })}
        </section>
      )}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
