// Soft fade and slide on every route change. CSS only, so it costs no JavaScript.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
