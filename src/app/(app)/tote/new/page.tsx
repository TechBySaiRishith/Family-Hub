"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Loader2, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_TYPES, EVENT_TYPE_LABELS } from "@/lib/tote/constants";

interface Template {
  id: string;
  name: string;
  eventType: string;
  isBuiltIn: boolean;
  itemCount: number;
}

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<string>("trip");
  const [eventDate, setEventDate] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/tote/templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Template[]) => {
        setTemplates(data);
        setLoading(false);
      });
  }, []);

  // Filter templates to those matching the chosen event type, plus "any" (other)
  const visibleTemplates = templates.filter(
    (t) => t.eventType === eventType || eventType === "other",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !eventDate) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tote/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          eventType,
          eventDate: new Date(eventDate).toISOString(),
          destination,
          notes,
          templateId,
        }),
      });
      if (res.ok) {
        const { id } = await res.json();
        router.push(`/tote/${id}`);
      } else {
        setSubmitting(false);
      }
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-12">
      <div className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-3 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>

      <section className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-10 lg:pt-14 pb-10 lg:pb-14 fade-up">
        <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
          — New event
        </p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl leading-[0.95] sm:leading-[0.9] tracking-tight text-balance">
          What&apos;s on the
          <br />
          <em className="text-accent">horizon?</em>
        </h1>
      </section>

      <form
        onSubmit={handleSubmit}
        className="grid lg:grid-cols-[1fr_3fr] gap-8 lg:gap-20 px-4 sm:px-6 lg:px-12 xl:px-16 py-10 lg:py-14 border-t border-foreground/10"
      >
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
            How this works
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
            Pick what kind of event it is, set the date, choose a template
            (or start blank), and you&apos;re ready to pack.
          </p>
          <div className="hidden lg:block text-xs text-muted-foreground/60 font-display italic">
            &ldquo;Tomorrow&apos;s wedding starts with today&apos;s list.&rdquo;
          </div>
        </div>

        <div className="space-y-12">
          {/* Step 1 */}
          <section>
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display italic text-muted-foreground/60">01</span>
              <h2 className="font-display text-2xl">The event</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  Type
                </Label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setEventType(t.value);
                        setTemplateId(null);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        eventType === t.value
                          ? "bg-foreground text-background border-foreground"
                          : "border-foreground/20 text-foreground hover:border-foreground/40",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Cousin's wedding"
                  className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-lg focus-visible:border-accent focus-visible:ring-0 shadow-none font-display"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    When *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dest" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    Where <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
                  </Label>
                  <Input
                    id="dest"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Mumbai, Bandra"
                    className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  Notes <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Wear formal · gift hamper from Mum · don't forget the marriage card"
                  className="border border-foreground/20 rounded-sm bg-transparent text-base focus-visible:border-accent focus-visible:ring-0 shadow-none resize-none"
                />
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display italic text-muted-foreground/60">02</span>
              <h2 className="font-display text-2xl">Start from</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-6 max-w-lg">
              Pick a template to pre-fill the family list with sensible items,
              or start blank and add everything yourself.
            </p>

            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <TemplateOption
                  selected={templateId === null}
                  onClick={() => setTemplateId(null)}
                  title="Blank"
                  meta="Start from scratch"
                />
                {visibleTemplates.map((t) => (
                  <TemplateOption
                    key={t.id}
                    selected={templateId === t.id}
                    onClick={() => setTemplateId(t.id)}
                    title={t.name}
                    meta={`${t.itemCount} items · ${t.isBuiltIn ? "Built-in" : "Saved"}`}
                  />
                ))}
              </div>
            )}
          </section>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={submitting || !title || !eventDate}
            className="w-full group"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <>
                Plan {EVENT_TYPE_LABELS[eventType] || "event"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function TemplateOption({
  selected,
  onClick,
  title,
  meta,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  meta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left p-4 border rounded-sm transition-all flex items-start justify-between gap-3 min-h-16",
        selected
          ? "border-accent bg-accent/5"
          : "border-foreground/15 hover:border-foreground/30",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="font-display text-lg leading-tight flex items-center gap-2">
          {title === "Blank" && <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{meta}</p>
      </div>
      {selected && <Check className="h-5 w-5 text-accent shrink-0 mt-1" strokeWidth={2} aria-hidden />}
    </button>
  );
}
