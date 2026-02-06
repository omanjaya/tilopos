import type { SVGProps } from 'react';

/**
 * Error Illustration
 * Error state illustration
 */
export function Error(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--destructive))" opacity="0.1" />
      <circle
        cx="100"
        cy="100"
        r="40"
        stroke="hsl(var(--destructive))"
        strokeWidth="2"
        opacity="0.5"
      />
      <line
        x1="85"
        y1="85"
        x2="115"
        y2="115"
        stroke="hsl(var(--destructive))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="115"
        y1="85"
        x2="85"
        y2="115"
        stroke="hsl(var(--destructive))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
