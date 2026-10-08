"use client";

// Replaces the root layout, so no global CSS here: plain inline styles that read in light and dark.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 16, colorScheme: "light dark" }}>
        <title>Something went wrong | Platter</title>
        <main>
          <h1 style={{ fontSize: 28, margin: 0 }}>Something went wrong</h1>
          <p style={{ opacity: 0.7 }}>Please try again in a moment.</p>
          {error.digest && <p style={{ fontSize: 12, opacity: 0.6 }}>Reference: {error.digest}</p>}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button onClick={retry} style={{ minHeight: 44, padding: "0 24px", borderRadius: 999, border: 0, background: "#b3202a", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
            {/* A full page load: the app shell is what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ minHeight: 44, padding: "0 24px", borderRadius: 999, border: "1px solid currentColor", display: "inline-flex", alignItems: "center", color: "inherit", textDecoration: "none", fontWeight: 600 }}>Home</a>
          </div>
        </main>
      </body>
    </html>
  );
}
