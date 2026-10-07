"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { ImageUploader } from "@/components/admin/image-uploader";
import { btn, card, input } from "@/components/admin/ui";
import { BADGES } from "@/lib/menu-constants";
import { deleteItem, removeItemImage, saveItem, setItemImage, type FormState } from "../actions";

export type ItemData = {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  price: number | "";
  is_veg: boolean;
  delivery_available: boolean;
  badges: string[];
  available_from: string;
  available_to: string;
  variants: { name: string; price: number }[];
  addons: string[];
  image: { url: string; blur: string | null } | null;
};

export function ItemForm({ item, categories, addons }: { item: ItemData; categories: { id: string; name: string }[]; addons: { id: string; name: string; price: number }[] }) {
  const router = useRouter();
  const [state, action, saving] = useActionState<FormState, FormData>(saveItem, {});
  const [variants, setVariants] = useState(item.variants);
  const label = "block text-sm font-medium";

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        {item.id && <input type="hidden" name="id" value={item.id} />}
        <input type="hidden" name="variants" value={JSON.stringify(variants)} />

        <section className={`${card} space-y-4`}>
          <label className={label}>Name<input name="name" required defaultValue={item.name} className={`${input} mt-1`} /></label>
          <label className={label}>Description (optional)<textarea name="description" rows={2} maxLength={500} defaultValue={item.description} className={`${input} mt-1 py-2`} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Price (₹)<input name="price" type="number" inputMode="decimal" min={0} step="0.01" required defaultValue={item.price} className={`${input} mt-1`} /></label>
            <label className={label}>Category
              <select name="category_id" required defaultValue={item.category_id} className={`${input} mt-1`}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" name="is_veg" defaultChecked={item.is_veg} className="h-5 w-5 accent-[var(--veg)]" />Vegetarian</label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" name="delivery_available" defaultChecked={item.delivery_available} className="h-5 w-5 accent-[var(--brand)]" />Available for delivery</label>
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className="font-medium">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <label key={b} className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm">
                <input type="checkbox" name="badges" value={b} defaultChecked={item.badges.includes(b)} className="accent-[var(--brand)]" />{b}
              </label>
            ))}
          </div>
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className="font-medium">Sizes or options</h2>
          <p className="text-sm text-muted">For example Half and Full, each with its own price. Leave empty for a single price.</p>
          {variants.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <input aria-label="Option name" placeholder="Half" value={v.name} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={input} />
              <input aria-label="Option price" type="number" inputMode="decimal" min={0} placeholder="₹" value={v.price} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))} className={`${input} w-28`} />
              <button type="button" aria-label="Remove option" className={btn.ghost} onClick={() => setVariants(variants.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className={btn.ghost} onClick={() => setVariants([...variants, { name: "", price: Number(item.price) || 0 }])}>Add option</button>
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className="font-medium">Extras customers can add</h2>
          {addons.length === 0 ? (
            <p className="text-sm text-muted">No extras yet. <Link className="text-brand" href="/admin/addons">Create some</Link>.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {addons.map((a) => (
                <label key={a.id} className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm">
                  <input type="checkbox" name="addons" value={a.id} defaultChecked={item.addons.includes(a.id)} className="accent-[var(--brand)]" />{a.name} (+₹{Number(a.price)})
                </label>
              ))}
            </div>
          )}
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className="font-medium">Only show at certain times (optional)</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>From<input type="time" name="available_from" defaultValue={item.available_from} className={`${input} mt-1`} /></label>
            <label className={label}>Until<input type="time" name="available_to" defaultValue={item.available_to} className={`${input} mt-1`} /></label>
          </div>
        </section>

        {state.error && <p role="alert" className="text-sm text-nonveg">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm text-veg">Saved. The live menu is updated.</p>}
        <div className="flex gap-3">
          <button disabled={saving} className={`${btn.primary} flex-1`}>{saving ? "Saving…" : item.id ? "Save changes" : "Add item"}</button>
          <Link href="/admin/menu" className={btn.ghost}>Back</Link>
        </div>
      </form>

      {item.id ? (
        <>
          <section className={`${card} space-y-3`}>
            <h2 className="font-medium">Photo</h2>
            <ImageUploader
              kind="menu"
              aspect={4 / 3}
              current={item.image}
              onUploaded={async (u) => {
                const res = await setItemImage(item.id!, u);
                if (res.ok) router.refresh();
                return res;
              }}
              onRemove={async () => {
                await removeItemImage(item.id!);
                router.refresh();
              }}
            />
          </section>
          <button
            type="button"
            className={`${btn.danger} w-full`}
            onClick={async () => {
              if (!confirm(`Delete "${item.name}" for good? To just hide it, use Hidden on the menu list.`)) return;
              await deleteItem(item.id!);
              router.push("/admin/menu");
            }}
          >
            Delete item
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">Save the item first, then you can add a photo.</p>
      )}
    </div>
  );
}
