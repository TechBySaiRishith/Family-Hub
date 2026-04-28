"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Loader2, Copy, RefreshCw, Trash2, Check, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { ReminderServicesForm } from "@/components/settings/reminder-services-form";

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
  const isAdmin = session?.user.role === "admin";

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
    if (!isAdmin) {
      // Defer setState out of the effect commit
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([setts, usrs]) => {
      setSettings(setts);
      setUsers(usrs);
      setLoading(false);
    });
  }, [isAdmin]);

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
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/register?code=${settings.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const providers = [
    { value: "osm", label: "OpenStreetMap", desc: "Free · no key", tagline: "Community-driven, unlimited" },
    { value: "google", label: "Google Maps", desc: "API key required", tagline: "Best coverage, 28.5k free/mo" },
    { value: "mapbox", label: "Mapbox", desc: "Token required", tagline: "Customizable, 50k free/mo" },
  ];

  return (
    <div className="pb-12 w-full">
      <div className="px-6 lg:px-12 xl:px-16 pt-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-3 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      <section className="px-6 lg:px-12 xl:px-16 pt-10 lg:pt-14 pb-10 lg:pb-14 fade-up">
        <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
          — {isAdmin ? "Keeper's desk" : "Your settings"}
        </p>
        <h1 className="font-display text-5xl lg:text-7xl leading-[0.9] tracking-tight text-balance">
          Quiet <em className="text-accent">adjustments.</em>
        </h1>
      </section>

      {/* Notifications — visible to everyone */}
      <EditorialRow
        kicker="01"
        title="Reminders"
        description="Choose how the hub nudges you about expiring coupons. Push, email, or WhatsApp — pick what reaches you."
      >
        <NotificationPreferencesForm />
      </EditorialRow>

      {isAdmin && (
        <>
          <EditorialRow
            kicker="02"
            title="The map"
            description="Pick what powers your locations. You can switch any time — saved places move with you."
          >
            <div className="space-y-2">
              {providers.map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => setSettings((prev) => ({ ...prev, mapProvider: provider.value }))}
                  className={cn(
                    "w-full text-left p-5 border rounded-sm transition-all flex items-start justify-between gap-4",
                    settings.mapProvider === provider.value
                      ? "border-accent bg-accent/5"
                      : "border-foreground/15 hover:border-foreground/30"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h3 className="font-display text-xl">{provider.label}</h3>
                      <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                        {provider.desc}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{provider.tagline}</p>
                  </div>
                  {settings.mapProvider === provider.value && (
                    <Check className="h-5 w-5 text-accent shrink-0 mt-1" strokeWidth={2} />
                  )}
                </button>
              ))}
            </div>

            {settings.mapProvider === "google" && (
              <div className="space-y-2 mt-6">
                <Label htmlFor="googleKey" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  Google Maps API Key
                </Label>
                <Input
                  id="googleKey"
                  type="password"
                  value={settings.googleMapsApiKey}
                  onChange={(e) => setSettings((prev) => ({ ...prev, googleMapsApiKey: e.target.value }))}
                  placeholder="AIza…"
                  className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
                />
              </div>
            )}

            {settings.mapProvider === "mapbox" && (
              <div className="space-y-2 mt-6">
                <Label htmlFor="mapboxKey" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  Mapbox Access Token
                </Label>
                <Input
                  id="mapboxKey"
                  type="password"
                  value={settings.mapboxApiKey}
                  onChange={(e) => setSettings((prev) => ({ ...prev, mapboxApiKey: e.target.value }))}
                  placeholder="pk.ey…"
                  className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
                />
              </div>
            )}

            <div className="mt-6">
              <Button onClick={saveSettings} disabled={saving} variant="accent">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <><Check className="h-4 w-4" /> Saved</>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </EditorialRow>

          <EditorialRow
            kicker="03"
            title="Reminder services"
            description="The plumbing — SMTP for email, VAPID for push, Twilio for WhatsApp. Configure once, forget forever."
          >
            <ReminderServicesForm />
          </EditorialRow>

          <EditorialRow
            kicker="04"
            title="The invite"
            description="A private link for family. Each person creates their own account — no shared passwords."
          >
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 h-12 flex items-center px-4 bg-foreground/5 border border-foreground/10 rounded-sm font-mono text-sm tabular-nums">
                {settings.inviteCode}
              </code>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={copyInviteLink}
                aria-label="Copy invite link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-accent" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={regenerateInviteCode}
                aria-label="Regenerate invite code"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/70 italic font-mono break-all">
              {typeof window !== "undefined" ? window.location.origin : ""}/register?code={settings.inviteCode}
            </p>
          </EditorialRow>

          <EditorialRow
            kicker="05"
            title="The family"
            description={`${users.length} ${users.length === 1 ? "keeper" : "keepers"} with access to the hub.`}
          >
            <div className="divide-y divide-foreground/10">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-4 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-display text-sm">
                      {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-display text-lg leading-tight flex items-center gap-2">
                        {user.name}
                        {user.role === "admin" && (
                          <Crown className="h-3 w-3 text-accent fill-accent" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {user.id !== session?.user.id && (
                    <button
                      type="button"
                      onClick={() => deleteUser(user.id)}
                      aria-label={`Remove ${user.name}`}
                      className="p-2 min-h-11 min-w-11 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded-sm"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </EditorialRow>

          <EditorialRow
            kicker="06"
            title="The archive"
            description="Keep a copy of everything. Useful for backups, or for the day you move to new hardware."
            isLast
          >
            <div className="flex gap-2">
              <Button variant="outline" render={<a href="/api/export?format=json" download />}>
                Export JSON
              </Button>
              <Button variant="outline" render={<a href="/api/export?format=csv" download />}>
                Export CSV
              </Button>
            </div>
          </EditorialRow>
        </>
      )}
    </div>
  );
}

function EditorialRow({
  kicker,
  title,
  description,
  children,
  isLast = false,
}: {
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <section
      className={cn(
        "grid lg:grid-cols-[1fr_3fr] gap-8 lg:gap-20 px-6 lg:px-12 xl:px-16 py-10 lg:py-14 border-t border-foreground/10",
        !isLast && "",
      )}
    >
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-display italic text-muted-foreground/60 tabular-nums">{kicker}</span>
          <h2 className="font-display text-3xl lg:text-4xl tracking-tight">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
