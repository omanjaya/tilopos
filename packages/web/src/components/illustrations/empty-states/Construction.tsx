import type { SVGProps } from 'react';

/**
 * Construction Illustration
 * Coming soon/maintenance state
 */
export function Construction(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--primary))" opacity="0.1" />
      <path
        d="M70 140L100 60L130 140H70Z"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <line
        x1="100"
        y1="90"
        x2="100"
        y2="110"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle
        cx="100"
        cy="125"
        r="3"
        fill="hsl(var(--primary))"
        opacity="0.7"
      />
    </svg>
  );
}
