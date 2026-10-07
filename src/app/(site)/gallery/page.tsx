import { breadcrumbLd, JsonLd, pageMeta } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import Image from "next/image";
import { Suspense } from "react";
import { Reveal } from "@/components/motion";
import { getGallery } from "@/lib/data/site";

export const metadata = pageMeta({
  title: "Gallery: inside our Jaipur cafe",
  description: "Photos of Platter cafe at Rajasthan International Centre, Jaipur: marble tables, soft sofas, a poster wall and a carrom and foosball corner.",
  path: "/gallery",
});

async function Grid() {
  const images = await getGallery();
  if (!images.length) return <p className="py-16 text-center text-muted">Photos are coming soon.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {images.map((g, i) => (
        <li key={g.id}>
          <Reveal delay={(i % 3) * 0.05}>
            <Image src={g.url} alt={`Inside Platter cafe, photo ${i + 1}`} width={g.width} height={g.height} sizes="(min-width: 768px) 33vw, 50vw" placeholder="blur" blurDataURL={g.blur} className="aspect-[3/4] w-full rounded-[var(--radius-card)] object-cover" />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export default function GalleryPage() {
  return (
    <main>
      <JsonLd data={breadcrumbLd([["Gallery", "/gallery"]])} />
      <PageHeader eyebrow="Inside Platter" title="Gallery">A look around the cafe: marble tables, soft sofas, a wall of posters and a corner for carrom.</PageHeader>
      <div className="mx-auto max-w-5xl px-4 py-8">
      <Suspense fallback={<div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-[var(--radius-card)] bg-border" />)}</div>}>
        <Grid />
      </Suspense>
      </div>
    </main>
  );
}
