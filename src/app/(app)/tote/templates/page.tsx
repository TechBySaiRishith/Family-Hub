"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2, BookmarkPlus, ChevronRight } from "lucide-react";
import { EVENT_TYPE_LABELS } from "@/lib/tote/constants";

interface Template {
  id: string;
  name: string;
  eventType: string;
  isBuiltIn: boolean;
  itemCount: number;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    return fetch("/api/tote/templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Template[]) => {
        setTemplates(data);
        setLoading(false);
      });
  }

  useEffect(() => { refresh(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    setBusyId(id);
    const res = await fetch(`/api/tote/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template deleted");
      await refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(typeof err.error === "string" ? err.error : "Couldn't delete");
    }
    setBusyId(null);
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
      </div>
    );
  }

  const builtIns = templates.filter((t) => t.isBuiltIn);
  const userTpls = templates.filter((t) => !t.isBuiltIn);

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

      <section className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-10 lg:pt-14 pb-8 fade-up">
        <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
          — Templates
        </p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95] sm:leading-[0.9] tracking-tight text-balance">
          Reusable <em className="text-accent">starters.</em>
        </h1>
        <p className="text-sm text-muted-foreground mt-4 max-w-xl">
          Built-in templates ship with the app. Save your own from any event&apos;s
          checklist (use the &quot;Save as template&quot; button on the event page).
        </p>
      </section>

      <Section title="Yours" empty="You haven't saved any templates yet.">
        {userTpls.map((t) => (
          <TemplateRow key={t.id} t={t} busy={busyId === t.id} onDelete={() => remove(t.id)} />
        ))}
      </Section>

      <Section title="Built-in" empty="Built-ins aren't loaded yet.">
        {builtIns.map((t) => (
          <TemplateRow key={t.id} t={t} builtIn />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title, empty, children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="px-4 sm:px-6 lg:px-12 xl:px-16 py-6 border-t border-foreground/10">
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4">
        — {title}
      </p>
      {hasChildren ? (
        <div className="divide-y divide-foreground/10 border-y border-foreground/10">
          {children}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">{empty}</p>
      )}
    </section>
  );
}

function TemplateRow({
  t, builtIn, busy, onDelete,
}: {
  t: Template;
  builtIn?: boolean;
  busy?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="py-2 flex items-center gap-2 group">
      <Link
        href={`/tote/templates/${t.id}`}
        className="flex-1 min-w-0 flex items-center gap-3 py-2 -my-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:opacity-80 transition-opacity"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="font-display text-xl group-hover:text-accent transition-colors">{t.name}</h3>
            <span className="text-[10px] tracking-[0.2em] uppercase text-accent">
              {EVENT_TYPE_LABELS[t.eventType]}
            </span>
            {builtIn && (
              <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground inline-flex items-center gap-1">
                <BookmarkPlus className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                Built-in
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.itemCount} {t.itemCount === 1 ? "item" : "items"} · tap to view
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" strokeWidth={1.5} aria-hidden />
      </Link>
      {!builtIn && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete template ${t.name}`}
          className="p-2 min-h-11 min-w-11 text-muted-foreground hover:text-destructive transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          )}
        </button>
      )}
    </div>
  );
}
