import type { SVGProps } from 'react';

/**
 * Success Illustration
 * Success/completed state
 */
export function Success(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--primary))" opacity="0.1" />
      <circle
        cx="100"
        cy="100"
        r="40"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        opacity="0.5"
      />
      <path
        d="M80 100L95 115L120 85"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}
