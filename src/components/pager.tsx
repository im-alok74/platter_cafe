import Link from "next/link";

const link = "inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-5 text-sm font-semibold transition active:scale-95";

/** Newer / Older links for a paginated list. Keeps the other filters in the address by passing them as `params`. */
export function Pager({ page, pages, path, params = {} }: { page: number; pages: number; path: string; params?: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3">
      {page > 1 ? <Link href={href(page - 1)} prefetch={false} className={link}>← Newer</Link> : <span />}
      <p className="text-sm text-muted">Page {page} of {pages}</p>
      {page < pages ? <Link href={href(page + 1)} prefetch={false} className={link}>Older →</Link> : <span />}
    </nav>
  );
}
