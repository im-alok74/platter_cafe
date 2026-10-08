"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { btn, card, input } from "@/components/admin/ui";
import { deleteAddon, saveAddon, type FormState } from "./actions";

export type AdminAddon = { id: string; name: string; price: number; hidden: boolean };

function Fields({ a }: { a?: AdminAddon }) {
  return (
    <div className="space-y-3">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <label className="block text-sm font-medium">Name<input name="name" required defaultValue={a?.name} placeholder="Extra cheese" className={`${input} mt-1`} /></label>
        <label className="block text-sm font-medium">Price (₹)<input name="price" type="number" inputMode="decimal" min={0} step="0.01" required defaultValue={a?.price} className={`${input} mt-1`} /></label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="hidden" defaultChecked={a?.hidden} className="h-5 w-5 accent-[var(--brand)]" />Hidden (not offered to customers)</label>
    </div>
  );
}

export function AddonManager({ initial }: { initial: AdminAddon[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<FormState>({});
  const [saving, start] = useTransition();
  const addForm = useRef<HTMLFormElement>(null);

  const submit = (form: HTMLFormElement) =>
    start(async () => {
      const res = await saveAddon(new FormData(form));
      setMsg(res);
      if (res.ok) {
        addForm.current?.reset();
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      <details className={card}>
        <summary className="min-h-11 cursor-pointer font-medium leading-[2.75rem]">Add an extra</summary>
        <form ref={addForm} className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
          <Fields />
          <button disabled={saving} className={btn.primary}>{saving ? "Saving…" : "Add extra"}</button>
        </form>
      </details>
      <p role="status" aria-live="polite" className={`min-h-5 text-sm ${msg.error ? "text-nonveg" : "text-veg"}`}>{msg.error ?? (msg.ok ? "Saved." : "")}</p>
      {initial.length === 0 && <p className="py-8 text-center text-muted">No extras yet. Add one, then attach it to items from the item editor.</p>}
      <ul className="space-y-2">
        {initial.map((a) => (
          <li key={a.id}>
            <details className={`${card} ${a.hidden ? "opacity-60" : ""}`}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2">
                <span className="font-medium">{a.name}</span>
                <span className="tabular-nums text-muted">+₹{a.price}</span>
              </summary>
              <form className="mt-3 space-y-3 border-t border-border pt-3" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
                <Fields a={a} />
                <div className="flex gap-3">
                  <button disabled={saving} className={`${btn.primary} flex-1`}>{saving ? "Saving…" : "Save"}</button>
                  <button
                    type="button"
                    disabled={saving}
                    className={btn.danger}
                    onClick={() => {
                      if (!confirm(`Delete "${a.name}"? It will be removed from every item.`)) return;
                      start(async () => {
                        const res = await deleteAddon(a.id);
                        setMsg(res);
                        if (res.ok) router.refresh();
                      });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
