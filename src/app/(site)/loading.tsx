export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto max-w-5xl space-y-4 px-4 py-10">
      <div className="h-10 w-56 animate-pulse rounded-lg bg-border" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-border" />
      <div className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-border" />)}
      </div>
    </div>
  );
}
