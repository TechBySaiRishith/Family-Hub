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
    const previouslyDismissed = localStorage.getItem("install-prompt-dismissed");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    if (previouslyDismissed) {
      // Defer setState out of effect commit
      Promise.resolve().then(() => setDismissed(true));
    } else {
      window.addEventListener("beforeinstallprompt", handler);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setDismissed(true);
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("install-prompt-dismissed", "true");
  }

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-[88px] sm:bottom-6 left-4 right-4 z-50 mx-auto max-w-md fade-up">
      <div className="flex items-center gap-3 rounded-sm border border-foreground/15 bg-card/95 backdrop-blur p-4 shadow-xl shadow-foreground/5">
        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <Download className="h-4 w-4 text-accent" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base leading-tight">Install FamilyHub</p>
          <p className="text-xs text-muted-foreground mt-0.5">Keep it on your home screen</p>
        </div>
        <Button size="sm" variant="accent" onClick={handleInstall}>
          Install
        </Button>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
