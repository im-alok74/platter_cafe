"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="min-h-11 rounded-full bg-[#b3202a] px-5 text-sm font-semibold text-white">
      Print
    </button>
  );
}
