import type { SVGProps } from 'react';

/**
 * Inbox Empty Illustration
 * No messages/notifications state
 */
export function InboxEmpty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <path
        d="M60 80H140V120H120L110 130L100 120H60V80Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <line
        x1="75"
        y1="95"
        x2="125"
        y2="95"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}
