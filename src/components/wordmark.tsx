export function Wordmark({ className = "" }: { className?: string }) {
  // ponytail: text wordmark until the logo file is supplied
  return <span className={`font-script text-brand ${className}`}>Platter</span>;
}
