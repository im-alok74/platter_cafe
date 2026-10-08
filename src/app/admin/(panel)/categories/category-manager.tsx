"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Sortable } from "@/components/admin/sortable";
import { btn, card, input } from "@/components/admin/ui";
import { deleteCategory, reorderCategories, saveCategory, type FormState } from "./actions";

export type AdminCategory = { id: string; name: string; hidden: boolean; delivery_available: boolean; available_from: string; available_to: string; items: number };

function Fields({ c }: { c?: AdminCategory }) {
  return (
    <div className="space-y-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <label className="block text-sm font-medium">Name<input name="name" required defaultValue={c?.name} className={`${input} mt-1`} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">Show from<input type="time" name="available_from" defaultValue={c?.available_from} className={`${input} mt-1`} /></label>
        <label className="block text-sm font-medium">Show until<input type="time" name="available_to" defaultValue={c?.available_to} className={`${input} mt-1`} /></label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="delivery_available" defaultChecked={c?.delivery_available ?? true} className="h-5 w-5 accent-[var(--brand)]" />Available for delivery</label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="hidden" defaultChecked={c?.hidden} className="h-5 w-5 accent-[var(--brand)]" />Hidden from the menu</label>
    </div>
  );
}

export function CategoryManager({ initial }: { initial: AdminCategory[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [msg, setMsg] = useState<FormState>({});
  const [saving, start] = useTransition();
  const addForm = useRef<HTMLFormElement>(null);

  const submit = (form: HTMLFormElement) =>
    start(async () => {
      const res = await saveCategory(new FormData(form));
      setMsg(res);
      if (res.ok) {
        addForm.current?.reset();
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      <details className={card}>
        <summary className="min-h-11 cursor-pointer font-medium leading-[2.75rem]">Add a category</summary>
        <form ref={addForm} className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
          <Fields />
          <button disabled={saving} className={btn.primary}>{saving ? "Saving…" : "Add category"}</button>
        </form>
      </details>
      <p role="status" aria-live="polite" className={`min-h-5 text-sm ${msg.error ? "text-nonveg" : "text-veg"}`}>{msg.error ?? (msg.ok ? "Saved." : "")}</p>
      <p className="text-sm text-muted">Drag the handle to change the order on the menu.</p>
      <Sortable
        items={list}
        className="space-y-2"
        onReorder={(next) => {
          const before = list;
          setList(next);
          start(async () => {
            try {
              await reorderCategories(next.map((c) => c.id));
            } catch {
              setList(before);
              setMsg({ error: "Could not save the new order." });
            }
          });
        }}
      >
        {(c, handle) => (
          <div className={`${card} flex items-start gap-1 ${c.hidden ? "opacity-60" : ""}`}>
            {handle}
            <details className="min-w-0 flex-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
              <span className="text-sm text-muted">{c.items} items</span>
            </summary>
            <form className="mt-3 space-y-3 border-t border-border pt-3" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
              <Fields c={c} />
              <div className="flex gap-3">
                <button disabled={saving} className={`${btn.primary} flex-1`}>{saving ? "Saving…" : "Save"}</button>
                <button
                  type="button"
                  disabled={saving}
                  className={btn.danger}
                  onClick={() => {
                    if (!confirm(`Delete the category "${c.name}"?`)) return;
                    start(async () => {
                      const res = await deleteCategory(c.id);
                      setMsg(res);
                      if (res.ok) setList((l) => l.filter((x) => x.id !== c.id));
                    });
                  }}
                >
                  Delete
                </button>
              </div>
            </form>
            </details>
          </div>
        )}
      </Sortable>
    </div>
  );
}
