import { card } from "@/components/admin/ui";
import { Pager } from "@/components/pager";
import { requireStaff } from "@/lib/admin/auth";
import { pageCount, pageOf } from "@/lib/paginate";
import { createClient } from "@/lib/supabase/server";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Audit log" };

const PAGE = 40;
const SKIP = new Set(["updated_at", "created_at", "search"]);
const noun: Record<string, string> = { items: "item", item_variants: "item option", categories: "category", benches: "table", media_assets: "photo", staff_roles: "staff role", staff_invites: "staff invite", settings: "setting", points_ledger: "points entry" };
const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

type Row = { id: number; actor_email: string | null; action: string; table_name: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string };

/** One line saying what changed: the name for new and removed rows, field changes for edits. */
function summary(r: Row) {
  const row = r.new_data ?? r.old_data ?? {};
  const label = String(row.name ?? row.title ?? row.label ?? row.key ?? row.email ?? "");
  if (r.action !== "UPDATE" || !r.old_data || !r.new_data) return label;
  const changes = Object.keys(r.new_data)
    .filter((k) => !SKIP.has(k) && JSON.stringify(r.old_data![k]) !== JSON.stringify(r.new_data![k]))
    .slice(0, 4)
    .map((k) => `${k}: ${JSON.stringify(r.old_data![k])} → ${JSON.stringify(r.new_data![k])}`);
  return `${label}${changes.length ? ` (${changes.join(", ")})` : ""}`;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff(["owner"]);
  const { page, from, to } = pageOf((await searchParams).page, PAGE);
  const { data, error, count } = await (await createClient())
    .from("audit_log")
    .select("id,actor_email,action,table_name,old_data,new_data,created_at", { count: "estimated" })
    .order("id", { ascending: false })
    .range(from, to);
  if (error) throw new Error("Could not load the audit log.");
  const rows = data as Row[];
  return (
    <>
      <h1 className="mb-1 display text-4xl">Audit log</h1>
      <p className="mb-4 text-sm text-muted">Every change to the menu, settings, tables and staff, with who and when.</p>
      {rows.length === 0 && <p className="py-12 text-center text-muted">Nothing here yet.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className={card}>
            <p className="text-sm"><strong>{r.action === "INSERT" ? "Added" : r.action === "DELETE" ? "Deleted" : "Changed"}</strong> {noun[r.table_name] ?? r.table_name.replace(/_/g, " ")}</p>
            <p className="break-words text-sm text-muted">{summary(r)}</p>
            <p className="mt-1 text-xs text-muted">{r.actor_email ?? "System"} · {when.format(new Date(r.created_at))}</p>
          </li>
        ))}
      </ul>
      <Pager page={page} pages={pageCount(count ?? rows.length, PAGE)} path="/admin/audit" />
    </>
  );
}
