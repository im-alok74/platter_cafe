import { breadcrumbLd, JsonLd, pageMeta } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { Suspense } from "react";
import { getSettings } from "@/lib/data/site";

export const metadata = pageMeta({
  title: "Privacy policy",
  description: "What Platter keeps about you, why, and how to delete it.",
  path: "/privacy",
});

// Draft written from what the system actually does. The owner should have it reviewed before launch.
async function Body() {
  const { legal, contact } = await getSettings();
  const h2 = "mt-8 font-display text-xl";
  return (
    <div className="space-y-3 leading-relaxed">
      <p className="text-sm text-muted">Platter is run by {legal.entity}. This explains what we keep when you use this website or order from your table.</p>

      <h2 className={h2}>What we keep</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Orders: what you ordered, the table, the time and the amount.</li>
        <li>If you give them: your name and mobile number (needed for takeaway, optional for dine in).</li>
        <li>If you sign in: your mobile number, name, favourites and order history.</li>
        <li>Basic technical data your browser sends, such as device type, used to keep the site working.</li>
      </ul>

      <h2 className={h2}>Why</h2>
      <p>To make and serve your order, let you track it, show your history and favourites, and keep the cafe&apos;s accounts. We send offers or news only if you tick the box to say yes, and you can turn that off in your account at any time.</p>

      <h2 className={h2}>Who helps us</h2>
      <p>We use Supabase (database and sign-in), Vercel (hosting), Cloudinary (photos) and MSG91 (to send your sign-in code by SMS). They handle data only to provide those services to us. We never sell your data and we never ask for card, bank or PAN details on this site.</p>

      <h2 className={h2}>Your choices</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Change your name or marketing choice any time in your account.</li>
        <li>Delete your account and personal data yourself from your account page. Past orders stay in the cafe&apos;s records for accounting, with your name and number removed.</li>
        <li>Ask us anything about your data: <a className="text-brand" href={`mailto:${contact.email}`}>{contact.email}</a>.</li>
      </ul>

      <h2 className={h2}>Keeping it safe</h2>
      <p>Orders are priced on our server, access to staff screens needs a sign-in, and your sign-in code expires quickly. If this policy changes, the new version will be posted here.</p>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <main>
      <JsonLd data={breadcrumbLd([["Privacy policy", "/privacy"]])} />
      <PageHeader narrow eyebrow="Your data" title="Privacy policy" />
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Suspense fallback={<div className="mt-4 h-64 animate-pulse rounded bg-border" />}>
        <Body />
      </Suspense>
      </div>
    </main>
  );
}
