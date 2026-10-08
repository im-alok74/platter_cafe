export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-border" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-border" />)}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-border" />
    </div>
  );
}
