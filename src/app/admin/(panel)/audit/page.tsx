import { card } from "@/components/admin/ui";
import { Pager } from "@/components/pager";
import { requireStaff } from "@/lib/admin/auth";
import { pageCount, pageOf } from "@/lib/paginate";
import { createClient } from "@/lib/supabase/server";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Audit log" };

const PAGE = 40;
const SKIP = new Set(["updated_at", "created_at", "search", "cafe_id", "sort"]);
const noun: Record<string, string> = { items: "dish", item_variants: "dish option", categories: "menu section", benches: "table", media_assets: "photo", staff_roles: "staff role", staff_invites: "staff invite", settings: "setting", points_ledger: "points entry", addons: "extra" };
const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

type Row = { id: number; actor_email: string | null; action: string; table_name: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string };

/** A value a person can read: no quotes, no ids, long text shortened. */
function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "empty";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    // Settings are stored as {"name": "..."} or similar: show the plain value.
    const vals = Object.values(o);
    return vals.length === 1 && typeof vals[0] !== "object" ? String(vals[0]) : JSON.stringify(v).slice(0, 60);
  }
  const t = String(v);
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

const field = (k: string) => k.replace(/_/g, " ");

/** One plain sentence saying what changed. Ids are never shown: a changed image or section reads as "photo changed". */
function summary(r: Row) {
  const row = r.new_data ?? r.old_data ?? {};
  if (r.table_name === "media_assets") return `${show(row.kind)} photo`;
  if (r.table_name === "staff_roles") return `role: ${show(row.role)}`;
  const label = String(row.name ?? row.title ?? row.label ?? row.key ?? row.email ?? "");
  if (r.action !== "UPDATE" || !r.old_data || !r.new_data) return label;
  const changes = Object.keys(r.new_data)
    .filter((k) => !SKIP.has(k) && JSON.stringify(r.old_data![k]) !== JSON.stringify(r.new_data![k]))
    .slice(0, 4)
    .map((k) => {
      const was = r.old_data![k], now = r.new_data![k];
      if (k === "image_id") return was && !now ? "photo removed" : !was ? "photo added" : "photo changed";
      if (k.endsWith("_id")) return `${field(k.slice(0, -3))} changed`;
      return `${field(k)}: ${show(was)} → ${show(now)}`;
    });
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
            <p className="mt-1 text-xs text-muted">{r.actor_email ?? "System (not signed in)"} · {when.format(new Date(r.created_at))}</p>
          </li>
        ))}
      </ul>
      <Pager page={page} pages={pageCount(count ?? rows.length, PAGE)} path="/admin/audit" />
    </>
  );
}
