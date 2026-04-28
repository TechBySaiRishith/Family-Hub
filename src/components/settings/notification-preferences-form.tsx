"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Check, Bell, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Prefs {
  pushEnabled: boolean;
  pushSubscription: string | null;
  emailEnabled: boolean;
  emailAddress: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  daysBeforeExpiry: number;
}

const DEFAULT_PREFS: Prefs = {
  pushEnabled: false,
  pushSubscription: null,
  emailEnabled: false,
  emailAddress: "",
  whatsappEnabled: false,
  whatsappNumber: "",
  daysBeforeExpiry: 3,
};

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const padded = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationPreferencesForm() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    fetch("/api/notification-preferences")
      .then((r) => r.json())
      .then((data) => {
        setPrefs({ ...DEFAULT_PREFS, ...data });
        setLoading(false);
      });
  }, []);

  async function save(next: Partial<Prefs>) {
    setSaving(true);
    const res = await fetch("/api/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Preferences saved");
    } else {
      toast.error("Couldn't save preferences");
    }
  }

  async function togglePush(enabled: boolean) {
    if (enabled) {
      setPushBusy(true);
      try {
        const keyRes = await fetch("/api/push/public-key");
        const { publicKey } = await keyRes.json();
        if (!publicKey) {
          toast.error("Push hasn't been configured yet. Ask your admin to set it up.");
          setPushBusy(false);
          return;
        }
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          toast.error("Push notifications aren't supported on this device.");
          setPushBusy(false);
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const subJson = JSON.stringify(subscription.toJSON());
        const next: Partial<Prefs> = {
          pushEnabled: true,
          pushSubscription: subJson,
        };
        setPrefs((p) => ({ ...p, ...next }));
        await save(next);
      } catch (e) {
        toast.error(`Couldn't enable push: ${(e as Error).message}`);
      } finally {
        setPushBusy(false);
      }
    } else {
      setPushBusy(true);
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        }
        const next: Partial<Prefs> = { pushEnabled: false, pushSubscription: null };
        setPrefs((p) => ({ ...p, ...next }));
        await save(next);
      } finally {
        setPushBusy(false);
      }
    }
  }

  async function toggleEmail(enabled: boolean) {
    const next: Partial<Prefs> = { emailEnabled: enabled };
    setPrefs((p) => ({ ...p, ...next }));
    await save(next);
  }

  async function saveEmailAddress() {
    await save({ emailAddress: prefs.emailAddress });
  }

  async function toggleWhatsApp(enabled: boolean) {
    const next: Partial<Prefs> = { whatsappEnabled: enabled };
    setPrefs((p) => ({ ...p, ...next }));
    await save(next);
  }

  async function saveWhatsAppNumber() {
    await save({ whatsappNumber: prefs.whatsappNumber });
  }

  async function saveDays() {
    await save({ daysBeforeExpiry: prefs.daysBeforeExpiry });
  }

  if (loading) {
    return (
      <div className="py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Push */}
      <div className="border border-foreground/10 rounded-sm p-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div className="flex items-start gap-3">
            <Bell className="h-4 w-4 mt-1 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="font-display text-lg leading-tight">Push notifications</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Get a notification on this device. Best on Android / desktop.
              </p>
            </div>
          </div>
          {pushBusy ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch checked={prefs.pushEnabled} onCheckedChange={togglePush} />
          )}
        </label>
      </div>

      {/* Email */}
      <div className="border border-foreground/10 rounded-sm p-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer mb-3">
          <div className="flex items-start gap-3">
            <Mail className="h-4 w-4 mt-1 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="font-display text-lg leading-tight">Email digest</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                A daily summary of expiring coupons. Reliable on every device.
              </p>
            </div>
          </div>
          <Switch checked={prefs.emailEnabled} onCheckedChange={toggleEmail} />
        </label>
        {prefs.emailEnabled && (
          <div className="mt-4 ml-7 space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Send to
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="you@email.com (defaults to your account email)"
                value={prefs.emailAddress}
                onChange={(e) => setPrefs((p) => ({ ...p, emailAddress: e.target.value }))}
                onBlur={saveEmailAddress}
                className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp */}
      <div className="border border-foreground/10 rounded-sm p-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer mb-3">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-4 w-4 mt-1 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="font-display text-lg leading-tight">WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                A digest message to your WhatsApp number via Twilio.
              </p>
            </div>
          </div>
          <Switch checked={prefs.whatsappEnabled} onCheckedChange={toggleWhatsApp} />
        </label>
        {prefs.whatsappEnabled && (
          <div className="mt-4 ml-7 space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Number (E.164)
            </Label>
            <Input
              placeholder="+919876543210"
              value={prefs.whatsappNumber}
              onChange={(e) => setPrefs((p) => ({ ...p, whatsappNumber: e.target.value }))}
              onBlur={saveWhatsAppNumber}
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
          </div>
        )}
      </div>

      {/* Days before expiry */}
      <div className="border border-foreground/10 rounded-sm p-5">
        <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3 block">
          Notify me this many days before expiry
        </Label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={14}
            value={prefs.daysBeforeExpiry}
            onChange={(e) => setPrefs((p) => ({ ...p, daysBeforeExpiry: parseInt(e.target.value) }))}
            onMouseUp={saveDays}
            onTouchEnd={saveDays}
            className="flex-1 accent-[var(--accent)]"
          />
          <span className="font-display text-2xl tabular-nums w-16 text-right">
            {prefs.daysBeforeExpiry} {prefs.daysBeforeExpiry === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      {saving && (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      )}
      {!saving && (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
          <Check className="h-3 w-3 text-accent" /> Up to date
        </p>
      )}
    </div>
  );
}
