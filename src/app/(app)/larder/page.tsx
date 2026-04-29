"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Check, ShoppingBasket, Send, ExternalLink,
  Pencil, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LARDER_CATEGORIES,
  LARDER_CATEGORY_LABELS,
  LARDER_CATEGORY_ORDER,
} from "@/lib/larder/constants";

// Server-side schema caps — mirrored on the inputs as defence-in-depth so
// the user can't even type past the limit (server still validates).
const MAX_NAME = 120;
const MAX_QTY = 60;
const MAX_NOTES = 300;

interface LarderItem {
  id: string;
  name: string;
  quantity: string | null;
  itemNotes: string | null;
  category: string;
  isBought: boolean;
  boughtById: string | null;
  boughtAt: string | null;
  addedById: string;
  addedAt: string;
}

interface PreviewData {
  text: string;
  waUrl: string;
  itemCount: number;
  recipientLabel: string | null;
  directSendReady: boolean;
}

const EMPTY_WA_URL = "https://wa.me/?text=";

export default function LarderPage() {
  const { status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<LarderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBought, setShowBought] = useState(false);
  const [directSendReady, setDirectSendReady] = useState(false);
  const [recipientLabel, setRecipientLabel] = useState<string | null>(null);
  // Pre-resolved share URL — kept in sync with items so the "Open in
  // WhatsApp" anchor is always live and not popup-blocked on iOS Safari.
  const [waUrl, setWaUrl] = useState<string>(EMPTY_WA_URL);

  // Add form
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCategory, setNewCategory] = useState<string>("other");
  const [adding, setAdding] = useState(false);

  // Send + clear
  const [sending, setSending] = useState(false);
  const [clearingBought, setClearingBought] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchItems = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(
      `/api/larder/items?showBought=${showBought ? "true" : "false"}`,
      { signal },
    );
    if (!res.ok) return [] as LarderItem[];
    return (await res.json()) as LarderItem[];
  }, [showBought]);

  // Refresh items whenever the filter or auth state changes. AbortController
  // prevents stale fetches from clobbering newer state on rapid toggles.
  useEffect(() => {
    if (status !== "authenticated") return;
    const ctrl = new AbortController();
    fetchItems(ctrl.signal)
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === "AbortError") return;
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [status, fetchItems]);

  // Refresh share-link + send-config whenever the items list changes so the
  // "Open in WhatsApp" anchor is always current.
  useEffect(() => {
    if (status !== "authenticated") return;
    const ctrl = new AbortController();
    fetch("/api/larder/preview", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PreviewData | null) => {
        if (!data) return;
        setDirectSendReady(data.directSendReady);
        setRecipientLabel(data.recipientLabel);
        setWaUrl(data.waUrl);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === "AbortError") return;
      });
    return () => ctrl.abort();
  }, [status, items]);

  const refresh = useCallback(async () => {
    const data = await fetchItems();
    setItems(data);
  }, [fetchItems]);

  const grouped = useMemo(() => {
    const map = new Map<string, LarderItem[]>();
    for (const cat of LARDER_CATEGORY_ORDER) map.set(cat, []);
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return map;
  }, [items]);

  const unboughtCount = useMemo(
    () => items.filter((i) => !i.isBought).length,
    [items],
  );
  const boughtCount = useMemo(
    () => items.filter((i) => i.isBought).length,
    [items],
  );

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/larder/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        quantity: newQty.trim(),
        itemNotes: "",
        category: newCategory,
      }),
    });
    setAdding(false);
    if (res.ok) {
      setNewName("");
      setNewQty("");
      // keep category sticky — most adds happen in the same aisle
      await refresh();
    } else {
      toast.error("Couldn't add — check the name");
    }
  }

  async function toggleBought(item: LarderItem) {
    const next = !item.isBought;
    // Optimistic — update the row in place (and drop it locally if the
    // user has 'Show bought' off and just bought it).
    setItems((prev) => {
      const updated = prev.map((i) => (i.id === item.id ? { ...i, isBought: next } : i));
      return next && !showBought ? updated.filter((i) => i.id !== item.id) : updated;
    });
    const res = await fetch(`/api/larder/items/${item.id}/bought`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bought: next }),
    });
    if (!res.ok) {
      toast.error("Couldn't update — refreshing");
      await refresh();
    }
  }

  async function removeItem(item: LarderItem) {
    if (!confirm(`Remove "${item.name}"?`)) return;
    const res = await fetch(`/api/larder/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      await refresh();
    } else {
      toast.error("Couldn't remove");
    }
  }

  function startEdit(item: LarderItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQty(item.quantity ?? "");
    setEditNotes(item.itemNotes ?? "");
    setEditCategory(item.category);
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    const res = await fetch(`/api/larder/items/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        quantity: editQty.trim(),
        itemNotes: editNotes.trim(),
        category: editCategory,
      }),
    });
    setSavingEdit(false);
    if (res.ok) {
      setEditingId(null);
      await refresh();
    } else {
      toast.error("Couldn't save");
    }
  }

  async function sendViaTwilio() {
    setSending(true);
    const res = await fetch("/api/larder/send-whatsapp", { method: "POST" });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`Sent ${data.itemCount} ${data.itemCount === 1 ? "item" : "items"} to WhatsApp`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(typeof err.error === "string" ? err.error : "Couldn't send");
    }
  }

  async function clearBought() {
    if (!confirm("Permanently remove all bought items?")) return;
    setClearingBought(true);
    const res = await fetch("/api/larder/clear-bought", { method: "POST" });
    setClearingBought(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`Cleared ${data.deleted} bought ${data.deleted === 1 ? "item" : "items"}`);
      await refresh();
    } else {
      toast.error("Couldn't clear");
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="pb-24 sm:pb-12">
      <section className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-8 sm:pt-10 lg:pt-14 pb-8">
        <div className="mb-8 fade-up">
          <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
            — Larder
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] leading-[0.95] sm:leading-[0.9] tracking-tight text-balance">
            {unboughtCount === 0 ? (
              <>Cupboards <em className="text-accent">full.</em></>
            ) : (
              <>
                {unboughtCount} {unboughtCount === 1 ? "thing" : "things"}{" "}
                <em className="text-accent">to buy.</em>
              </>
            )}
          </h1>
          {boughtCount > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {boughtCount} already bought.
            </p>
          )}
        </div>

        {/* Add form */}
        <form onSubmit={addItem} className="space-y-3 sm:space-y-0 sm:flex sm:items-end sm:gap-3 mb-6">
          <div className="flex-1 space-y-1">
            <Label htmlFor="larder-name" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Item
            </Label>
            <Input
              id="larder-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tomatoes"
              autoComplete="off"
              maxLength={MAX_NAME}
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
          </div>
          <div className="sm:w-32 space-y-1">
            <Label htmlFor="larder-qty" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Quantity
            </Label>
            <Input
              id="larder-qty"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="1kg"
              autoComplete="off"
              maxLength={MAX_QTY}
              className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
          </div>
          <div className="sm:w-44 space-y-1">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Aisle
            </Label>
            <Select value={newCategory} onValueChange={(v) => setNewCategory(v ?? "other")}>
              <SelectTrigger className="h-11 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LARDER_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={adding || !newName.trim()}
            className="sm:shrink-0 group"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" aria-hidden />
            )}
            Add
          </Button>
        </form>

        {/* Send + filter bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/*
            A real anchor (not window.open) so iOS Safari and PWA shells don't
            popup-block. The href is prefetched into state from /preview and
            kept in sync with the items list.
          */}
          <Button
            render={
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={unboughtCount === 0}
                onClick={(e) => {
                  if (unboughtCount === 0) e.preventDefault();
                }}
              />
            }
            variant="outline"
            size="sm"
            disabled={unboughtCount === 0}
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Open in WhatsApp
          </Button>
          {directSendReady && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={sendViaTwilio}
              disabled={sending || unboughtCount === 0}
              className="text-accent hover:text-accent"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              )}
              Send to {recipientLabel || "WhatsApp"}
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Switch
              id="show-bought"
              checked={showBought}
              onCheckedChange={setShowBought}
            />
            <Label htmlFor="show-bought" className="text-xs tracking-[0.15em] uppercase text-muted-foreground cursor-pointer">
              Show bought
            </Label>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="px-4 sm:px-6 lg:px-12 xl:px-16">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="border-t border-foreground/10">
            {LARDER_CATEGORY_ORDER.map((cat) => {
              const list = grouped.get(cat);
              if (!list || list.length === 0) return null;
              return (
                <div key={cat} className="py-6 border-b border-foreground/10">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                    — {LARDER_CATEGORY_LABELS[cat]}
                  </p>
                  <ul className="divide-y divide-foreground/5">
                    {list.map((item) => (
                      <li key={item.id}>
                        {editingId === item.id ? (
                          <EditRow
                            name={editName}
                            qty={editQty}
                            notes={editNotes}
                            category={editCategory}
                            saving={savingEdit}
                            onName={setEditName}
                            onQty={setEditQty}
                            onNotes={setEditNotes}
                            onCategory={setEditCategory}
                            onCancel={() => setEditingId(null)}
                            onSave={saveEdit}
                          />
                        ) : (
                          <ItemRow
                            item={item}
                            onToggle={() => toggleBought(item)}
                            onEdit={() => startEdit(item)}
                            onDelete={() => removeItem(item)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {boughtCount > 0 && showBought && (
          <div className="mt-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearBought}
              disabled={clearingBought}
              className="text-muted-foreground hover:text-destructive"
            >
              {clearingBought ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              )}
              Clear bought items
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function ItemRow({
  item, onToggle, onEdit, onDelete,
}: {
  item: LarderItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="py-3 flex items-center gap-3 group">
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.isBought ? `Mark "${item.name}" as needed` : `Mark "${item.name}" as bought`}
        className={cn(
          "shrink-0 h-7 w-7 rounded-full border flex items-center justify-center transition-colors min-h-11 min-w-11 sm:min-h-7 sm:min-w-7",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          item.isBought
            ? "bg-accent border-accent text-accent-foreground"
            : "border-foreground/30 hover:border-accent",
        )}
      >
        {item.isBought && <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
      </button>

      <div className="flex-1 min-w-0">
        <div className={cn("flex items-baseline gap-2 flex-wrap", item.isBought && "line-through opacity-50")}>
          <span className="font-display text-lg leading-tight">{item.name}</span>
          {item.quantity && (
            <span className="text-xs text-muted-foreground tabular-nums">
              — {item.quantity}
            </span>
          )}
        </div>
        {item.itemNotes && (
          <p className={cn("text-xs italic text-muted-foreground mt-0.5", item.isBought && "opacity-50")}>
            {item.itemNotes}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${item.name}`}
        className="p-2 min-h-11 min-w-11 text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent opacity-60 group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${item.name}`}
        className="p-2 min-h-11 min-w-11 text-muted-foreground hover:text-destructive transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive opacity-60 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}

function EditRow({
  name, qty, notes, category, saving,
  onName, onQty, onNotes, onCategory,
  onCancel, onSave,
}: {
  name: string;
  qty: string;
  notes: string;
  category: string;
  saving: boolean;
  onName: (v: string) => void;
  onQty: (v: string) => void;
  onNotes: (v: string) => void;
  onCategory: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="py-3 space-y-3 bg-foreground/[0.02] -mx-2 px-2 rounded-sm">
      <div className="grid sm:grid-cols-[1fr_120px_160px] gap-2">
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Item"
          autoFocus
          maxLength={MAX_NAME}
          className="h-10 text-base"
        />
        <Input
          value={qty}
          onChange={(e) => onQty(e.target.value)}
          placeholder="Qty"
          maxLength={MAX_QTY}
          className="h-10 text-base"
        />
        <Select value={category} onValueChange={(v) => onCategory(v ?? "other")}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LARDER_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
        placeholder="Notes (e.g. ripe, the green ones)"
        maxLength={MAX_NOTES}
        className="h-10 text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          Cancel
        </Button>
        <Button type="button" variant="accent" size="sm" onClick={onSave} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />}
          Save
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-t border-foreground/10 pt-16 pb-8">
      <div className="max-w-md mx-auto text-center fade-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full border border-foreground/15 mb-6">
          <ShoppingBasket className="h-6 w-6 text-accent" strokeWidth={1.5} aria-hidden />
        </div>
        <h2 className="font-display text-3xl mb-3">
          Nothing on the <em>list yet.</em>
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed text-balance">
          Add anything that&apos;s run out — milk, onions, dish soap. When
          someone&apos;s heading out, send the lot to WhatsApp in one tap.
        </p>
      </div>
    </div>
  );
}
