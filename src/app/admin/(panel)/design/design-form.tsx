"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { btn } from "@/components/admin/ui";
import type { TemplateName } from "@/lib/data/site";
import { saveTemplate, type FormState } from "./actions";

const options: { name: TemplateName; title: string; blurb: string; points: string[] }[] = [
  { name: "minimal", title: "Minimal", blurb: "Calm and clean. Lots of space, soft fades, easy to read.", points: ["Quiet scroll animations", "Photo-first sections", "Fast on every phone"] },
  { name: "expressive", title: "Expressive", blurb: "Loud, playful cafe energy. Built to be remembered and shared.", points: ["Giant kinetic headlines", "Steam, floating beans, spinning badge", "Marquees, stacking cards, count-ups"] },
];

/** Tiny stand-ins for each look, drawn with plain boxes so the choice is visual. */
function Preview({ name }: { name: TemplateName }) {
  if (name === "minimal")
    return (
      <div aria-hidden className="space-y-2 rounded-2xl bg-[#fbf6ef] p-4">
        <div className="h-2 w-16 rounded bg-[#c9a25b]" />
        <div className="h-5 w-4/5 rounded bg-[#231f1c]/80" />
        <div className="h-5 w-3/5 rounded bg-[#231f1c]/80" />
        <div className="flex gap-2 pt-2"><div className="h-7 w-20 rounded-full bg-[#b3202a]" /><div className="h-7 w-16 rounded-full border border-[#231f1c]/25" /></div>
      </div>
    );
  return (
    <div aria-hidden className="relative overflow-hidden rounded-2xl bg-[#2a1d17] p-4">
      <div className="h-8 w-11/12 rounded bg-[#fbf6ef]" />
      <div className="mt-1.5 h-8 w-3/5 rounded border-2 border-[#fbf6ef]" />
      <div className="mt-1.5 h-8 w-4/5 rounded bg-[#c9a25b]" />
      <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-[#c9a25b] text-[10px] text-[#c9a25b]">●</div>
      <div className="-mx-4 mt-3 h-5 -rotate-2 bg-[#b3202a]" />
    </div>
  );
}

export function DesignForm({ current }: { current: TemplateName }) {
  const [state, action, saving] = useActionState<FormState, FormData>(saveTemplate, {});
  const [pick, setPick] = useState<TemplateName>(current);
  return (
    <form action={action} className="space-y-5">
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="sr-only">Website look</legend>
        {options.map((o) => (
          <label key={o.name} className={`cursor-pointer rounded-3xl border-2 bg-surface p-4 shadow-card transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${pick === o.name ? "border-brand" : "border-border"}`}>
            <input type="radio" name="name" value={o.name} checked={pick === o.name} onChange={() => setPick(o.name)} className="sr-only" />
            <Preview name={o.name} />
            <span className="mt-4 flex items-center justify-between">
              <span className="display text-2xl">{o.title}</span>
              {current === o.name && <span className="rounded-full bg-veg/10 px-2.5 py-1 text-xs font-semibold text-veg">Live now</span>}
            </span>
            <span className="mt-1 block text-sm text-muted">{o.blurb}</span>
            <ul className="mt-3 space-y-1 text-sm">
              {o.points.map((p) => <li key={p} className="flex gap-2"><span aria-hidden className="text-brand">✓</span>{p}</li>)}
            </ul>
          </label>
        ))}
      </fieldset>
      {state.error && <p role="alert" className="text-sm text-nonveg">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-veg">Saved. <Link href="/" target="_blank" className="underline">Open the website</Link> to see it.</p>}
      <button disabled={saving || pick === current} className={btn.primary}>{saving ? "Saving…" : pick === current ? "This look is live" : `Switch to ${pick}`}</button>
    </form>
  );
}
