"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Plus, Trash2, X, Check, Edit2, Copy, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  ITEM_CATEGORIES,
} from "@/lib/tote/constants";

interface TemplateItem {
  id: string;
  templateId: string;
  text: string;
  quantity: number | null;
  category: string;
  sortOrder: number;
}

interface Template {
  id: string;
  name: string;
  eventType: string;
  isBuiltIn: boolean;
  createdById: string | null;
  items: TemplateItem[];
}

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [tpl, setTpl] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editingMeta, setEditingMeta] = useState(false);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("other");

  function refresh() {
    return fetch(`/api/tote/templates/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Template | null) => {
        setTpl(data);
        if (data) {
          setName(data.name);
          setEventType(data.eventType);
        }
      });
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveMeta() {
    if (!tpl) return;
    setBusy(true);
    const res = await fetch(`/api/tote/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, eventType }),
    });
    if (res.ok) {
      toast.success("Template updated");
      await refresh();
      setEditingMeta(false);
    } else {
      toast.error("Couldn't save");
    }
    setBusy(false);
  }

  async function fork() {
    setBusy(true);
    const res = await fetch(`/api/tote/templates/${id}/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const { id: newId } = await res.json();
      toast.success("Saved a copy you can edit");
      router.push(`/tote/templates/${newId}`);
    } else {
      toast.error("Couldn't save a copy");
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    setBusy(true);
    const res = await fetch(`/api/tote/templates/${id}/items/${itemId}`, { method: "DELETE" });
    if (res.ok) await refresh();
    else toast.error("Couldn't remove item");
    setBusy(false);
  }

  async function deleteTemplate() {
    if (!confirm("Delete this template?")) return;
    setBusy(true);
    const res = await fetch(`/api/tote/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template deleted");
      router.push("/tote/templates");
    } else {
      toast.error("Couldn't delete");
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    if (!tpl) return [];
    const map = new Map<string, TemplateItem[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of tpl.items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [tpl]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
      </div>
    );
  }
  if (!tpl) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="font-display text-2xl text-muted-foreground">Not found.</p>
      </div>
    );
  }

  const editable = !tpl.isBuiltIn;

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

      <section className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-8 pb-6 fade-up">
        <div className="flex items-baseline gap-3 mb-3 flex-wrap">
          <p className="text-[10px] tracking-[0.25em] uppercase text-accent font-medium">
            Template · {EVENT_TYPE_LABELS[tpl.eventType]}
          </p>
          {tpl.isBuiltIn && (
            <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground inline-flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
              Built-in
            </span>
          )}
        </div>

        {editingMeta ? (
          <div className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-2xl font-display focus-visible:border-accent focus-visible:ring-0 shadow-none"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Event type</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setEventType(t.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm border transition-all",
                      eventType === t.value
                        ? "bg-foreground text-background border-foreground"
                        : "border-foreground/20 hover:border-foreground/40",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveMeta} disabled={busy || !name.trim()} variant="accent" size="sm">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : "Save"}
              </Button>
              <Button onClick={() => setEditingMeta(false)} variant="ghost" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[0.95] tracking-tight text-balance">
              {tpl.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-3">
              {tpl.items.length} {tpl.items.length === 1 ? "item" : "items"}
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {editable && !editingMeta && (
            <Button variant="outline" size="sm" onClick={() => setEditingMeta(true)}>
              <Edit2 className="h-3.5 w-3.5" aria-hidden /> Rename
            </Button>
          )}
          {!editable && (
            <Button variant="accent" size="sm" onClick={fork} disabled={busy}>
              <Copy className="h-3.5 w-3.5" aria-hidden /> Save a copy to edit
            </Button>
          )}
          {editable && (
            <Button variant="outline" size="sm" onClick={deleteTemplate} disabled={busy} aria-label="Delete template">
              <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden /> Delete
            </Button>
          )}
        </div>

        {!editable && (
          <p className="mt-4 text-xs text-muted-foreground italic max-w-xl">
            Built-in templates ship with FamilyHub and can&apos;t be edited directly. Save a copy
            to add or remove items.
          </p>
        )}
      </section>

      <section className="px-4 sm:px-6 lg:px-12 xl:px-16 py-6 border-t border-foreground/10">
        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-5">
          — Items
        </p>

        {tpl.items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic mb-4">
            This template has no items yet.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([cat, list]) => (
              <div key={cat}>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                  {CATEGORY_LABELS[cat]}
                </p>
                <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
                  {list.map((item) => (
                    <TemplateItemRow
                      key={item.id}
                      item={item}
                      editable={editable}
                      templateId={id}
                      onChange={refresh}
                      onDelete={() => removeItem(item.id)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {editable && <AddTemplateItemInline templateId={id} onAdded={refresh} />}
      </section>
    </div>
  );
}

function TemplateItemRow({
  item, editable, templateId, onChange, onDelete,
}: {
  item: TemplateItem;
  editable: boolean;
  templateId: string;
  onChange: () => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [quantity, setQuantity] = useState(item.quantity ? String(item.quantity) : "");
  const [category, setCategory] = useState(item.category);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/tote/templates/${templateId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.trim(),
        quantity: quantity ? parseInt(quantity) : null,
        category,
      }),
    });
    if (res.ok) {
      await onChange();
      setEditing(false);
    } else {
      toast.error("Couldn't save changes");
    }
    setBusy(false);
  }

  if (editing && editable) {
    return (
      <li className="py-3 space-y-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-10 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 focus-visible:border-accent focus-visible:ring-0 shadow-none"
          autoFocus
        />
        <div className="grid sm:grid-cols-[100px_1fr] gap-3">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            className="h-10 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 focus-visible:border-accent focus-visible:ring-0 shadow-none font-mono"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 border-0 border-b border-foreground/20 rounded-none bg-transparent text-sm focus-visible:border-accent focus-visible:ring-0 shadow-none"
          >
            {ITEM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy || !text.trim()} variant="accent" size="sm">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : "Save"}
          </Button>
          <Button onClick={() => setEditing(false)} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-base">
          {item.text}
          {item.quantity ? <span className="text-muted-foreground"> × {item.quantity}</span> : null}
        </p>
      </div>
      {editable && (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${item.text}`}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remove ${item.text}`}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          </button>
        </>
      )}
    </li>
  );
}

function AddTemplateItemInline({
  templateId, onAdded,
}: {
  templateId: string;
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("other");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/tote/templates/${templateId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.trim(),
        quantity: quantity ? parseInt(quantity) : null,
        category,
      }),
    });
    if (res.ok) {
      setText("");
      setQuantity("");
      setCategory("other");
      await onAdded();
      setOpen(false);
    } else {
      toast.error("Couldn't add item");
    }
    setBusy(false);
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
            placeholder="What should the template include?"
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
          <div className="flex gap-2">
            <Button type="submit" variant="accent" size="sm" disabled={!text.trim() || busy}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : "Add"}
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

// Keep unused-import lint happy if these get removed during edits later
void Check;
