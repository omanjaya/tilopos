import type { SVGProps } from 'react';

/**
 * Chart Empty Illustration
 * No data/statistics state
 */
export function ChartEmpty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <line
        x1="60"
        y1="140"
        x2="140"
        y2="140"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="60"
        y1="60"
        x2="60"
        y2="140"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <rect
        x="75"
        y="120"
        width="12"
        height="20"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
      />
      <rect
        x="95"
        y="110"
        width="12"
        height="30"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
      />
      <rect
        x="115"
        y="125"
        width="12"
        height="15"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
      />
    </svg>
  );
}
