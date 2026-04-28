"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-[260px] shrink-0 sticky top-0 h-screen">
        <AppSidebar />
      </div>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar with safe-area padding for iOS notch */}
        <header
          className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 h-14 bg-background/85 backdrop-blur-md border-b border-foreground/10"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="min-h-11 min-w-11"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" strokeWidth={1.6} aria-hidden />
                </Button>
              }
            />
            <SheetContent side="left" className="p-0 w-[280px] max-w-[85vw] bg-background">
              <AppSidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link
            href="/"
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            aria-label="FamilyHub home"
          >
            <div className="h-7 w-7 rounded-full border border-foreground/30 flex items-center justify-center">
              <span className="font-display text-sm italic" aria-hidden>F</span>
            </div>
            <span className="font-display text-base">FamilyHub</span>
          </Link>
          <div className="w-11" aria-hidden />
        </header>

        <main
          id="main"
          className="flex-1 min-w-0"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
