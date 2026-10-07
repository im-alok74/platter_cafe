"use client";
import { useActionState, useState, useTransition } from "react";
import { btn, card, input } from "@/components/admin/ui";
import { addStaff, changeRole, removeStaff, resetPassword, type FormState } from "./actions";

const roles = [
  ["owner", "Owner: everything, including staff and audit log"],
  ["manager", "Manager: menu, tables, delivery, orders"],
  ["kitchen", "Kitchen: orders only"],
] as const;

export function StaffManager({ members, me }: { members: { email: string; role: string }[]; me: string }) {
  const [state, action, saving] = useActionState<FormState, FormData>(addStaff, {});
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function run(job: () => Promise<void>, done = "") {
    setError("");
    setNote("");
    start(async () => {
      try {
        await job();
        setNote(done);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <form action={action} className={`${card} space-y-3`}>
        <h2 className="display text-xl">Add a staff account</h2>
        <input name="email" type="email" required placeholder="name@example.com" aria-label="Email" autoComplete="off" className={input} />
        <input name="password" type="text" required minLength={8} maxLength={72} placeholder="First password (at least 8 characters)" aria-label="First password" autoComplete="off" className={input} />
        <select name="role" aria-label="Role" defaultValue="manager" className={input}>
          {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {state.error && <p role="alert" className="text-sm text-nonveg">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm text-veg">Account created. Give them the email and password.</p>}
        <button disabled={saving} className={btn.primary}>{saving ? "Creating…" : "Create account"}</button>
      </form>
      <p role="alert" className="min-h-5 text-sm text-nonveg">{error}</p>
      {note && <p role="status" className="text-sm text-veg">{note}</p>}
      <ul className="space-y-2">
        {members.map((m) => {
          const mine = m.email === me;
          return (
            <li key={m.email} className={`${card} flex flex-wrap items-center gap-3`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.email}{mine && " (you)"}</p>
                {mine ? (
                  <p className="text-sm capitalize text-muted">{m.role}</p>
                ) : (
                  <select value={m.role} disabled={pending} aria-label={`Role of ${m.email}`} onChange={(e) => run(() => changeRole(m.email, e.target.value), "Role changed.")} className="mt-1 min-h-9 rounded-lg border border-border bg-surface px-2 text-sm capitalize">
                    {roles.map(([v]) => <option key={v} value={v}>{v}</option>)}
                  </select>
                )}
              </div>
              {!mine && (
                <>
                  <button
                    className={btn.ghost}
                    disabled={pending}
                    onClick={() => {
                      const pw = prompt(`New password for ${m.email} (at least 8 characters)`);
                      if (pw) run(() => resetPassword(m.email, pw), `Password changed for ${m.email}.`);
                    }}
                  >
                    Reset password
                  </button>
                  <button
                    className={btn.danger}
                    disabled={pending}
                    onClick={() => confirm(`Remove ${m.email}? Their account is deleted and they lose access straight away.`) && run(() => removeStaff(m.email))}
                  >
                    Remove
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
