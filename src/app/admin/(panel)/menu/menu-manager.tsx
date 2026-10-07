"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Sortable } from "@/components/admin/sortable";
import { btn, card, input } from "@/components/admin/ui";
import { bulkSet, removeItemImage, reorderItems, setItemImage, setPrice, toggleItem } from "./actions";

export type AdminItem = { id: string; category_id: string; name: string; price: number; is_veg: boolean; sold_out: boolean; hidden: boolean; is_special: boolean; image: { url: string; blur: string | null } | null };
type Flag = "sold_out" | "hidden" | "is_special";

const flagLabel: Record<Flag, string> = { sold_out: "Sold out", hidden: "Hidden", is_special: "Today's special" };

export function MenuManager({ categories, initial, filter, uploadsReady }: { categories: { id: string; name: string }[]; initial: AdminItem[]; filter?: string; uploadsReady: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [noPhoto, setNoPhoto] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const shown = useMemo(
    () =>
      items.filter(
        (i) => (cat === "all" || i.category_id === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())) && (!noPhoto || !i.image) && (!filter || (filter === "sold_out" ? i.sold_out : filter === "hidden" ? i.hidden : true)),
      ),
    [items, cat, q, filter, noPhoto],
  );
  const withoutPhoto = items.filter((i) => !i.image).length;
  const canReorder = cat !== "all" && !q && !filter && !noPhoto;

  /** Optimistic update: change the screen now, undo and explain if the server refuses. */
  function run(patch: (list: AdminItem[]) => AdminItem[], action: () => Promise<unknown>) {
    const before = items;
    setItems(patch);
    setError("");
    start(async () => {
      try {
        await action();
      } catch (e) {
        setItems(before);
        setError(e instanceof Error ? e.message : "That did not save. Try again.");
      }
    });
  }

  const flip = (id: string, f: Flag, v: boolean) => run((l) => l.map((i) => (i.id === id ? { ...i, [f]: v } : i)), () => toggleItem(id, f, v));
  const bulk = (f: Flag, v: boolean) => {
    const ids = [...picked];
    run((l) => l.map((i) => (picked.has(i.id) ? { ...i, [f]: v } : i)), () => bulkSet(ids, f, v));
    setPicked(new Set());
  };
  const reorder = (next: AdminItem[]) => {
    const ids = new Set(next.map((i) => i.id));
    run((l) => [...next, ...l.filter((i) => !ids.has(i.id))], () => reorderItems(next.map((i) => i.id)));
  };

  return (
    <div>
      <div className="flex gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" className={input} />
        <Link href="/admin/menu/new" className={`${btn.primary} shrink-0`}>Add item</Link>
      </div>
      {!uploadsReady && (
        <p role="alert" className="mt-3 rounded-2xl bg-gold/20 p-3 text-sm">
          Photo uploads are not switched on yet. The owner needs to add the Cloudinary <strong>API key</strong> and <strong>API secret</strong> to the site settings (<code>.env.local</code>: <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code>) and restart the site. Until then the Photo buttons will show an error.
        </p>
      )}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
        <button onClick={() => setNoPhoto((v) => !v)} aria-pressed={noPhoto} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm ${noPhoto ? "border-espresso bg-espresso text-[#fbf6ef]" : "border-border bg-surface"}`}>
          No photo <span className="text-xs opacity-75">{withoutPhoto}</span>
        </button>
        {[{ id: "all", name: "All" }, ...categories].map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id} className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm ${cat === c.id ? "border-brand bg-brand text-brand-foreground" : "border-border bg-surface"}`}>
            {c.name}
          </button>
        ))}
      </div>

      {filter && <p className="mb-2 text-sm text-muted">Showing {filter === "sold_out" ? "sold out" : "hidden"} items. <Link className="text-brand" href="/admin/menu">Show all</Link></p>}
      {canReorder && <p className="mb-2 text-sm text-muted">Drag the handle to reorder this category.</p>}
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-nonveg">{error}</p>

      {picked.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 shadow-card">
          <span className="text-sm font-medium">{picked.size} selected</span>
          <button className={btn.ghost} onClick={() => bulk("hidden", true)}>Hide</button>
          <button className={btn.ghost} onClick={() => bulk("hidden", false)}>Show</button>
          <button className={btn.ghost} onClick={() => bulk("sold_out", true)}>Sold out</button>
          <button className={btn.ghost} onClick={() => bulk("sold_out", false)}>Back in stock</button>
          <button className="ml-auto text-sm text-muted underline" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-12 text-center text-muted">No items here.</p>
      ) : (
        <Sortable items={shown} onReorder={canReorder ? reorder : () => {}} className="space-y-2">
          {(item, handle) => (
            <div className={`${card} ${item.hidden ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-1">
                {canReorder && handle}
                <input type="checkbox" aria-label={`Select ${item.name}`} checked={picked.has(item.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(item.id); else n.delete(item.id); return n; })} className="mr-2 h-5 w-5 shrink-0 accent-[var(--brand)]" />
                <button type="button" onClick={() => setEditing(editing === item.id ? null : item.id)} aria-expanded={editing === item.id} aria-label={item.image ? `Edit photo of ${item.name}` : `Add photo for ${item.name}`} className="relative mr-2 h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-border text-[10px] font-medium text-muted">
                  {item.image ? <Image src={item.image.url} alt="" fill sizes="48px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-center leading-tight">Add<br />photo</span>}
                </button>
                <span aria-label={item.is_veg ? "Vegetarian" : "Non-vegetarian"} className={`h-3 w-3 shrink-0 rounded-full ${item.is_veg ? "bg-veg" : "bg-nonveg"}`} />
                <Link href={`/admin/menu/${item.id}`} className="ml-2 min-w-0 flex-1 truncate font-medium">{item.name}</Link>
                <label className="flex items-center gap-1 text-sm text-muted">
                  ₹
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    defaultValue={item.price}
                    aria-label={`Price of ${item.name}`}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v !== item.price) run((l) => l.map((i) => (i.id === item.id ? { ...i, price: v } : i)), () => setPrice(item.id, v));
                    }}
                    className="min-h-11 w-20 rounded-xl border border-border bg-background px-2 text-right text-base text-foreground tabular-nums"
                  />
                </label>
              </div>
              {editing === item.id && (
                <div className="mt-3 rounded-2xl border border-border bg-background p-3">
                  <ImageUploader
                    kind="menu"
                    aspect={4 / 3}
                    current={item.image}
                    onUploaded={async (u) => {
                      const res = await setItemImage(item.id, u);
                      if (res.ok && res.image) {
                        const image = res.image;
                        setItems((l) => l.map((i) => (i.id === item.id ? { ...i, image } : i)));
                        router.refresh();
                      }
                      return res;
                    }}
                    onRemove={async () => {
                      await removeItemImage(item.id);
                      setItems((l) => l.map((i) => (i.id === item.id ? { ...i, image: null } : i)));
                      router.refresh();
                    }}
                  />
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(flagLabel) as Flag[]).map((f) => (
                  <button key={f} role="switch" aria-checked={item[f]} onClick={() => flip(item.id, f, !item[f])} className={`min-h-11 rounded-full border px-3 text-sm transition active:scale-95 ${item[f] ? "border-brand bg-brand/10 font-medium text-brand" : "border-border text-muted"}`}>
                    {flagLabel[f]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Sortable>
      )}
      {pending && <p className="sr-only">Saving</p>}
    </div>
  );
}
