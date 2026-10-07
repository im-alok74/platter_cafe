"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btn, card, input } from "@/components/admin/ui";
import { addTable, renameTable, rotateTableCode, setTableActive } from "./actions";

export type AdminTable = { id: string; number: number; label: string; code: string; active: boolean; qr: string };

export function TableList({ tables, siteUrl }: { tables: AdminTable[]; siteUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [, start] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError("");
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That did not save.");
      }
    });

  return (
    <div className="space-y-4">
      <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); const l = newLabel; setNewLabel(""); run(() => addTable(l)); }}>
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={`Table ${tables.length + 1}`} aria-label="New table name" required className={input} />
        <button className={`${btn.primary} shrink-0`}>Add table</button>
      </form>
      <a href="/admin/print" target="_blank" rel="noopener" className={`${btn.ghost} w-full`}>Print all QR codes</a>
      <p role="alert" className="min-h-5 text-sm text-nonveg">{error}</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {tables.map((t) => (
          <li key={t.id} className={`${card} flex gap-4 ${t.active ? "" : "opacity-60"}`}>
            {/* QR is an inline SVG data URL generated on the server. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.qr} alt={`QR code for ${t.label}`} width={96} height={96} className="h-24 w-24 shrink-0 rounded-lg bg-white p-1" />
            <div className="min-w-0 flex-1">
              <input
                defaultValue={t.label}
                aria-label={`Name of ${t.label}`}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.label) run(() => renameTable(t.id, v)); }}
                className="min-h-11 w-full rounded-xl border border-transparent bg-transparent px-2 font-medium hover:border-border focus:border-brand"
              />
              <p className="truncate px-2 text-xs text-muted">{siteUrl}/t/{t.code}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button role="switch" aria-checked={t.active} onClick={() => run(() => setTableActive(t.id, !t.active))} className={btn.ghost}>{t.active ? "Active" : "Disabled"}</button>
                <button onClick={() => { if (confirm(`Make a new QR code for ${t.label}? The printed one will stop working.`)) run(() => rotateTableCode(t.id)); }} className={btn.ghost}>New QR</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
