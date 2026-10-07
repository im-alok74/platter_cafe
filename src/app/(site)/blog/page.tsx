import { breadcrumbLd, JsonLd, pageMeta } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { Suspense } from "react";
import { getPosts } from "@/lib/data/site";

export const metadata = pageMeta({
  title: "Blog: stories and recipes",
  description: "News, stories and recipes from Platter cafe, Jhalana, Jaipur.",
  path: "/blog",
});

// Post pages (/blog/[slug]) arrive with the editor in Phase 8; the list stays empty until then.
async function List() {
  const posts = await getPosts();
  if (!posts.length)
    return (
      <div className="py-16 text-center">
        <p className="font-display text-xl">No posts yet</p>
        <p className="mt-1 text-muted">We&apos;re writing our first stories. Check back soon.</p>
      </div>
    );
  return (
    <ul className="grid gap-4">
      {posts.map((p) => (
        <li key={p.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card">
          <p className="display text-2xl">{p.title}</p>
          {p.excerpt && <p className="mt-1 text-sm text-muted">{p.excerpt}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function BlogPage() {
  return (
    <main>
      <JsonLd data={breadcrumbLd([["Blog", "/blog"]])} />
      <PageHeader narrow eyebrow="Stories" title="Blog" />
      <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mt-4">
        <Suspense fallback={<div className="h-32 animate-pulse rounded bg-border" />}>
          <List />
        </Suspense>
      </div>
      </div>
    </main>
  );
}
