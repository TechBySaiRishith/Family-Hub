"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Check, Sparkles, RefreshCw, Copy } from "lucide-react";

interface Settings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  twilioSid: string;
  twilioToken: string;
  twilioFrom: string;
  cronToken: string;
}

const DEFAULT: Settings = {
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
  vapidPublicKey: "",
  vapidPrivateKey: "",
  vapidSubject: "",
  twilioSid: "",
  twilioToken: "",
  twilioFrom: "",
  cronToken: "",
};

export function ReminderServicesForm() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generatingVapid, setGeneratingVapid] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState<"vapid" | "cron" | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({ ...DEFAULT, ...data });
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast.error("Couldn't save");
    }
  }

  async function generateVapid() {
    setGeneratingVapid(true);
    try {
      const res = await fetch("/api/settings/vapid", { method: "POST" });
      if (res.ok) {
        // Refetch
        const fresh = await fetch("/api/settings").then((r) => r.json());
        setSettings({ ...DEFAULT, ...fresh });
        toast.success("VAPID keys generated");
      } else {
        toast.error("Couldn't generate keys");
      }
    } finally {
      setGeneratingVapid(false);
    }
  }

  async function generateCronToken() {
    setGeneratingToken(true);
    try {
      const res = await fetch("/api/settings/cron-token", { method: "POST" });
      if (res.ok) {
        const { token } = await res.json();
        setSettings((s) => ({ ...s, cronToken: token }));
        toast.success("Cron token regenerated");
      }
    } finally {
      setGeneratingToken(false);
    }
  }

  function copy(value: string, label: "vapid" | "cron") {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-10">
      {/* SMTP */}
      <section>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Email (SMTP)
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Host</Label>
            <Input
              value={settings.smtpHost}
              onChange={(e) => setSettings((s) => ({ ...s, smtpHost: e.target.value }))}
              placeholder="smtp.gmail.com"
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Port</Label>
            <Input
              value={settings.smtpPort}
              onChange={(e) => setSettings((s) => ({ ...s, smtpPort: e.target.value }))}
              placeholder="587"
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">User</Label>
            <Input
              value={settings.smtpUser}
              onChange={(e) => setSettings((s) => ({ ...s, smtpUser: e.target.value }))}
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Password / App password</Label>
            <Input
              type="password"
              value={settings.smtpPass}
              onChange={(e) => setSettings((s) => ({ ...s, smtpPass: e.target.value }))}
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">From address</Label>
            <Input
              value={settings.smtpFrom}
              onChange={(e) => setSettings((s) => ({ ...s, smtpFrom: e.target.value }))}
              placeholder="FamilyHub <hub@yourdomain.com>"
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
          </div>
        </div>
      </section>

      {/* Push */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Push (VAPID)
          </p>
          <Button variant="ghost" size="sm" onClick={generateVapid} disabled={generatingVapid} className="text-xs">
            {generatingVapid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {settings.vapidPublicKey ? "Regenerate keys" : "Generate keys"}
          </Button>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Subject (optional)</Label>
            <Input
              value={settings.vapidSubject}
              onChange={(e) => setSettings((s) => ({ ...s, vapidSubject: e.target.value }))}
              placeholder="mailto:hub@yourdomain.com"
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
          </div>
          {settings.vapidPublicKey && (
            <div className="flex items-stretch gap-2">
              <code className="flex-1 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-sm font-mono text-xs break-all">
                {settings.vapidPublicKey}
              </code>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => copy(settings.vapidPublicKey, "vapid")}
                aria-label="Copy VAPID public key"
              >
                {copied === "vapid" ? (
                  <Check className="h-4 w-4 text-accent" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                )}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* WhatsApp */}
      <section>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          WhatsApp (Twilio)
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Account SID</Label>
            <Input
              value={settings.twilioSid}
              onChange={(e) => setSettings((s) => ({ ...s, twilioSid: e.target.value }))}
              placeholder="AC..."
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Auth token</Label>
            <Input
              type="password"
              value={settings.twilioToken}
              onChange={(e) => setSettings((s) => ({ ...s, twilioToken: e.target.value }))}
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">From (e.g. whatsapp:+14155238886)</Label>
            <Input
              value={settings.twilioFrom}
              onChange={(e) => setSettings((s) => ({ ...s, twilioFrom: e.target.value }))}
              placeholder="whatsapp:+14155238886"
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
          </div>
        </div>
      </section>

      {/* Cron token */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Cron token
          </p>
          <Button variant="ghost" size="sm" onClick={generateCronToken} disabled={generatingToken} className="text-xs">
            {generatingToken ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {settings.cronToken ? "Regenerate" : "Generate"}
          </Button>
        </div>
        {settings.cronToken ? (
          <div className="space-y-3">
            <div className="flex items-stretch gap-2">
              <code className="flex-1 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-sm font-mono text-xs break-all">
                {settings.cronToken}
              </code>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => copy(settings.cronToken, "cron")}
                aria-label="Copy cron token"
              >
                {copied === "cron" ? (
                  <Check className="h-4 w-4 text-accent" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Schedule with crontab on your Pi:
            </p>
            <code className="block px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-sm font-mono text-[11px] break-all">
              0 9 * * * curl -s -H &quot;Authorization: Bearer {settings.cronToken}&quot; http://localhost:3000/api/cron/reminders
            </code>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate a token to enable the daily reminder cron.
          </p>
        )}
      </section>

      <div className="pt-4 border-t border-foreground/10">
        <Button onClick={save} disabled={saving} variant="accent">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Saved</> : "Save services"}
        </Button>
      </div>
    </div>
  );
}
