import type { SVGProps } from 'react';

/**
 * Document Empty Illustration
 * No orders/transactions state
 */
export function DocumentEmpty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <path
        d="M70 50H110L130 70V150H70V50Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <path
        d="M110 50V70H130"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <line
        x1="85"
        y1="90"
        x2="115"
        y2="90"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="85"
        y1="105"
        x2="115"
        y2="105"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="85"
        y1="120"
        x2="100"
        y2="120"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}
