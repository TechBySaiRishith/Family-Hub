"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowRight, Lock, Sparkles, Camera, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUPON_CATEGORIES, SOURCE_APPS } from "@/lib/coupons";
import { parseCouponText } from "@/lib/parsers/coupon";

interface AddCouponFormProps {
  initialText?: string;
  initialImagePath?: string;
}

export function AddCouponForm({ initialText, initialImagePath }: AddCouponFormProps) {
  const router = useRouter();

  const [pasted, setPasted] = useState(initialText || "");
  const [parseHint, setParseHint] = useState("");

  const [sourceApp, setSourceApp] = useState<string>("other");
  const [sourceAppOther, setSourceAppOther] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [expiryDate, setExpiryDate] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [maxDiscountValue, setMaxDiscountValue] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(initialImagePath || null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialText) {
      runParse(initialText);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function runParse(text: string) {
    const parsed = parseCouponText(text);
    let filledCount = 0;
    if (parsed.code && !code) { setCode(parsed.code); filledCount++; }
    if (parsed.expiryDate && !expiryDate) { setExpiryDate(parsed.expiryDate); filledCount++; }
    if (parsed.minOrderValue !== undefined && !minOrderValue) { setMinOrderValue(String(parsed.minOrderValue)); filledCount++; }
    if (parsed.maxDiscountValue !== undefined && !maxDiscountValue) { setMaxDiscountValue(String(parsed.maxDiscountValue)); filledCount++; }
    if (parsed.sourceApp && sourceApp === "other") { setSourceApp(parsed.sourceApp); filledCount++; }
    if (parsed.description && !description) { setDescription(parsed.description); filledCount++; }

    if (filledCount === 0) {
      setParseHint("Couldn't find anything to auto-fill — please enter the details manually.");
    } else {
      setParseHint(`Auto-filled ${filledCount} ${filledCount === 1 ? "field" : "fields"} — review before saving.`);
    }
  }

  async function handleImageUpload(file: File) {
    if (!file) return;
    setUploadingImage(true);
    setParseHint("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/coupons/ocr", { method: "POST", body: formData });
      if (!res.ok) {
        setParseHint("Image upload failed. Please try again.");
        return;
      }
      const data: { imagePath: string; text: string } = await res.json();
      setImagePath(data.imagePath);
      if (data.text) {
        runParse(data.text);
      } else {
        setParseHint("Image saved. Couldn't extract text — please fill the form manually.");
      }
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description || !expiryDate) return;

    setSubmitting(true);
    try {
      const payload = {
        sourceApp,
        sourceAppOther: sourceApp === "other" ? sourceAppOther : "",
        code: code || null,
        description,
        category,
        expiryDate: new Date(expiryDate).toISOString(),
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : null,
        maxDiscountValue: maxDiscountValue ? parseFloat(maxDiscountValue) : null,
        url: url || "",
        notes: notes || "",
        isPrivate,
        imagePath,
      };
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { id } = await res.json();
        router.push(`/coupons/${id}`);
      } else {
        const err = await res.json();
        setParseHint(typeof err.error === "string" ? err.error : "Failed to save coupon.");
        setSubmitting(false);
      }
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Step 1: paste-and-parse + image upload */}
      <section className="fade-up">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="font-display italic text-muted-foreground/60">01</span>
          <h2 className="font-display text-2xl">Paste or upload</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6 max-w-lg">
          Forwarded a coupon SMS? Paste the whole thing — we&apos;ll pull out the code,
          expiry, and min order. Or upload a screenshot and we&apos;ll read it.
        </p>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
              Paste promo text
            </Label>
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text");
                if (t) setTimeout(() => runParse(t), 0);
              }}
              placeholder="Use code WELCOME50 for ₹100 off on orders above ₹299. Valid till 31 Dec 2026."
              rows={3}
              className="border border-foreground/20 rounded-sm bg-transparent text-base focus-visible:border-accent focus-visible:ring-0 shadow-none resize-none"
            />
            <div className="flex items-center justify-between mt-2 gap-3">
              <p className="text-[11px] text-muted-foreground/70 italic min-h-[1em]">
                {parseHint}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => runParse(pasted)}
                disabled={!pasted}
                className="text-xs"
              >
                <Sparkles className="h-3 w-3" /> Parse
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label
              className={cn(
                "flex items-center gap-2 px-4 py-2 border border-foreground/20 rounded-sm text-sm cursor-pointer hover:border-foreground/40 transition-colors",
                uploadingImage && "opacity-60"
              )}
            >
              {uploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" strokeWidth={1.5} />
              )}
              <span>{uploadingImage ? "Reading…" : "Upload screenshot"}</span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                disabled={uploadingImage}
              />
            </label>
            {imagePath && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="h-3 w-3" strokeWidth={1.5} />
                Image attached
                <button
                  type="button"
                  onClick={() => setImagePath(null)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Step 2: details */}
      <section>
        <div className="flex items-baseline gap-3 mb-6">
          <span className="font-display italic text-muted-foreground/60">02</span>
          <h2 className="font-display text-2xl">The details</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              From which app *
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_APPS.map((app) => (
                <button
                  key={app.value}
                  type="button"
                  onClick={() => setSourceApp(app.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-all",
                    sourceApp === app.value
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  )}
                >
                  {app.label}
                </button>
              ))}
            </div>
            {sourceApp === "other" && (
              <Input
                placeholder="Which app? e.g. ‘DineOut’"
                value={sourceAppOther}
                onChange={(e) => setSourceAppOther(e.target.value)}
                className="h-12 mt-2 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              What does it give *
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="50% off up to ₹100"
              className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-lg focus-visible:border-accent focus-visible:ring-0 shadow-none font-display"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Code <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WELCOME50"
                className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono uppercase tracking-wide"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Expires on *
              </Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
                className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Category
            </Label>
            <div className="flex flex-wrap gap-2">
              {COUPON_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm border transition-all",
                    category === c.value
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground/20 text-foreground hover:border-foreground/40"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="min" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Min order ₹ <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
              </Label>
              <Input
                id="min"
                type="number"
                inputMode="decimal"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                placeholder="299"
                className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Max discount ₹ <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
              </Label>
              <Input
                id="max"
                type="number"
                inputMode="decimal"
                value={maxDiscountValue}
                onChange={(e) => setMaxDiscountValue(e.target.value)}
                placeholder="100"
                className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Link <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
            </Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Notes <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else to remember about this coupon…"
              rows={3}
              className="border border-foreground/20 rounded-sm bg-transparent text-base focus-visible:border-accent focus-visible:ring-0 shadow-none resize-none"
            />
          </div>

          <div className="border-t border-foreground/10 pt-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium">Keep private</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only you will see this coupon. Family members won&apos;t.
                  </p>
                </div>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </label>
          </div>
        </div>
      </section>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={submitting || !description || !expiryDate}
        className="w-full group"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Save coupon
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>
    </form>
  );
}
