export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M20,10 L80,10 L80,25 L20,25 Z" />
      <path d="M20,30 L80,30 L80,45 L20,45 Z" />
      <path d="M20,50 L80,50 L80,65 L20,65 Z" />
      <path d="M20,70 L80,70 L80,85 L20,85 Z" />
      <rect x="10" y="5" width="5" height="90" />
      <rect x="85" y="5" width="5" height="90" />
      <circle cx="50" cy="90" r="8" />
    </svg>
  );
}
