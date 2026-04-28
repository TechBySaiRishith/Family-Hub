"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Plus, Trash2, MapPin, Save, MoreHorizontal, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  ITEM_CATEGORIES,
  formatEventCountdown,
} from "@/lib/tote/constants";

interface ChecklistItem {
  id: string;
  scope: "shared" | "user";
  userId: string | null;
  text: string;
  quantity: number | null;
  itemNotes: string | null;
  category: string;
  isChecked: boolean;
  checkedById: string | null;
  checkedAt: string | null;
  sortOrder: number;
}

interface EventDetail {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  destination: string;
  notes: string;
  createdById: string;
  items: ChecklistItem[];
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function refresh() {
    return fetch(`/api/tote/events/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setEvent);
  }

  useEffect(() => {
    Promise.all([
      refresh(),
      fetch("/api/users/list").then((r) => (r.ok ? r.json() : [])),
    ]).then(([, usrs]: [unknown, { id: string; name: string }[]]) => {
      const map: Record<string, string> = {};
      for (const u of usrs) map[u.id] = u.name;
      setUsers(map);
      setLoading(false);
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sharedItems = useMemo(
    () => (event ? event.items.filter((i) => i.scope === "shared") : []),
    [event],
  );
  const myItems = useMemo(
    () => (event ? event.items.filter((i) => i.scope === "user") : []),
    [event],
  );

  async function handleDelete() {
    if (!confirm("Delete this event and all its items?")) return;
    setSaving(true);
    const res = await fetch(`/api/tote/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Event deleted");
      router.push("/tote");
    } else {
      setSaving(false);
    }
  }

  async function saveAsTemplate(scope: "shared" | "user") {
    const defaultName = `${event?.title ?? ""} ${scope === "shared" ? "(family)" : "(mine)"}`;
    const name = prompt("Save as template — name it:", defaultName);
    if (!name) return;
    const res = await fetch(`/api/tote/events/${id}/save-as-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scope }),
    });
    if (res.ok) toast.success("Template saved");
    else {
      const err = await res.json().catch(() => ({}));
      toast.error(typeof err.error === "string" ? err.error : "Couldn't save template");
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="font-display text-2xl text-muted-foreground">Not found.</p>
      </div>
    );
  }

  const countdown = formatEventCountdown(event.eventDate);
  const date = new Date(event.eventDate);
  const canEdit = session?.user.id === event.createdById || session?.user.role === "admin";

  const sharedTotal = sharedItems.length;
  const sharedDone = sharedItems.filter((i) => i.isChecked).length;
  const myTotal = myItems.length;
  const myDone = myItems.filter((i) => i.isChecked).length;

  return (
    <div className="pb-12">
      <div className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-6">
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

      <section className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-8 pb-8 fade-up">
        <div className="flex items-baseline gap-3 mb-3 flex-wrap">
          <p className="text-[10px] tracking-[0.25em] uppercase text-accent font-medium">
            {EVENT_TYPE_LABELS[event.eventType]}
          </p>
          <p
            className={cn(
              "text-[10px] tracking-[0.25em] uppercase",
              countdown.tone === "today" && "text-destructive",
              countdown.tone === "soon" && "text-accent",
              (countdown.tone === "future" || countdown.tone === "past") && "text-muted-foreground",
            )}
          >
            {countdown.text}
          </p>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-6xl leading-[0.95] tracking-tight text-balance mb-4">
          {event.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          {event.destination && (
            <>
              {" "}·{" "}
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-accent" strokeWidth={1.5} aria-hidden />
                {event.destination}
              </span>
            </>
          )}
        </p>
        {event.notes && (
          <p className="mt-3 font-display italic text-base text-muted-foreground border-l-2 border-accent pl-4 max-w-xl">
            {event.notes}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={saving} aria-label="Delete event">
              <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden /> Delete
            </Button>
          )}
        </div>
      </section>

      <ChecklistSection
        title="Shared family list"
        emptyHint="Nothing shared yet — add items the whole family needs."
        items={sharedItems}
        scope="shared"
        eventId={event.id}
        users={users}
        total={sharedTotal}
        done={sharedDone}
        onChange={refresh}
        onSaveAsTemplate={() => saveAsTemplate("shared")}
      />

      <ChecklistSection
        title="My list — private"
        emptyHint="Add items only you can see — your toiletries, glasses case, etc."
        items={myItems}
        scope="user"
        eventId={event.id}
        users={users}
        total={myTotal}
        done={myDone}
        onChange={refresh}
        onSaveAsTemplate={() => saveAsTemplate("user")}
      />
    </div>
  );
}

function ChecklistSection({
  title, emptyHint, items, scope, eventId, users, total, done, onChange, onSaveAsTemplate,
}: {
  title: string;
  emptyHint: string;
  items: ChecklistItem[];
  scope: "shared" | "user";
  eventId: string;
  users: Record<string, string>;
  total: number;
  done: number;
  onChange: () => Promise<void>;
  onSaveAsTemplate: () => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [items]);

  return (
    <section className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 border-t border-foreground/10">
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
            {scope === "shared" ? "— Family" : "— Mine"}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground tabular-nums">
            {done}/{total} packed
          </span>
          {total > 0 && (
            <button
              type="button"
              onClick={onSaveAsTemplate}
              className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-accent transition-colors inline-flex items-center gap-1"
            >
              <Save className="h-3 w-3" strokeWidth={1.5} aria-hidden />
              Save as template
            </button>
          )}
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground italic mb-4">{emptyHint}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                {CATEGORY_LABELS[cat]}
              </p>
              <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
                {list.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    users={users}
                    onChange={onChange}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AddItemInline eventId={eventId} scope={scope} onAdded={onChange} />
    </section>
  );
}

function ItemRow({
  item, users, onChange,
}: {
  item: ChecklistItem;
  users: Record<string, string>;
  onChange: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/tote/items/${item.id}/check`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.isChecked }),
    });
    await onChange();
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/tote/items/${item.id}`, { method: "DELETE" });
    await onChange();
    setBusy(false);
  }

  const checkedBy = item.checkedById ? users[item.checkedById] : null;

  return (
    <li className="py-3 flex items-start gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={item.isChecked ? `Mark ${item.text} as not packed` : `Mark ${item.text} as packed`}
        className={cn(
          "mt-0.5 h-5 w-5 rounded-sm border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          item.isChecked
            ? "bg-accent border-accent text-accent-foreground"
            : "border-foreground/30 hover:border-foreground/60",
        )}
      >
        {item.isChecked && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p
            className={cn(
              "text-base",
              item.isChecked && "line-through decoration-1 decoration-muted-foreground/40 text-muted-foreground",
            )}
          >
            {item.text}
            {item.quantity ? <span className="text-muted-foreground"> × {item.quantity}</span> : null}
          </p>
          {item.isChecked && checkedBy && (
            <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
              by {checkedBy}
            </span>
          )}
        </div>
        {item.itemNotes && (
          <p className="text-xs text-muted-foreground italic mt-0.5">{item.itemNotes}</p>
        )}
      </div>

      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={`Remove ${item.text}`}
        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        )}
      </button>
    </li>
  );
}

function AddItemInline({
  eventId, scope, onAdded,
}: {
  eventId: string;
  scope: "shared" | "user";
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("other");
  const [itemNotes, setItemNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/tote/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        scope,
        text: text.trim(),
        quantity: quantity ? parseInt(quantity) : null,
        itemNotes: itemNotes.trim(),
        category,
      }),
    });
    if (res.ok) {
      setText("");
      setQuantity("");
      setItemNotes("");
      setCategory("other");
      await onAdded();
      setOpen(false);
    }
    setSubmitting(false);
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Add an item
        </button>
      ) : (
        <form onSubmit={add} className="border border-foreground/15 rounded-sm p-4 space-y-3">
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you need?"
            className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 focus-visible:border-accent focus-visible:ring-0 shadow-none text-base"
          />

          <div className="grid sm:grid-cols-[100px_1fr] gap-3">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qty"
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            >
              {ITEM_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <Input
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 focus-visible:border-accent focus-visible:ring-0 shadow-none text-sm"
          />

          <div className="flex gap-2">
            <Button type="submit" variant="accent" size="sm" disabled={!text.trim() || submitting}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : "Add"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// Suppress unused-import lint noise
void Sheet; void SheetContent; void SheetHeader; void SheetTitle; void SheetTrigger;
void Label; void Textarea; void MoreHorizontal;
