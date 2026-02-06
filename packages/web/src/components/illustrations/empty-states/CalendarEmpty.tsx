import type { SVGProps } from 'react';

/**
 * Calendar Empty Illustration
 * No events/schedule state
 */
export function CalendarEmpty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <rect
        x="60"
        y="70"
        width="80"
        height="70"
        rx="4"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <line
        x1="60"
        y1="90"
        x2="140"
        y2="90"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        opacity="0.5"
      />
      <line
        x1="80"
        y1="60"
        x2="80"
        y2="75"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="120"
        y1="60"
        x2="120"
        y2="75"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
