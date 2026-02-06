import type { SVGProps } from 'react';

/**
 * Search Empty Illustration
 * No search results state
 */
export function SearchEmpty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <circle
        cx="85"
        cy="85"
        r="30"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="3"
        opacity="0.5"
      />
      <line
        x1="108"
        y1="108"
        x2="130"
        y2="130"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="70"
        y1="85"
        x2="100"
        y2="85"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}
