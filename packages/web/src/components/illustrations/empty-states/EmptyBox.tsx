import type { SVGProps } from 'react';

/**
 * Empty Box Illustration
 * Generic empty state illustration
 */
export function EmptyBox(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <path
        d="M100 50L130 70V130L100 150L70 130V70L100 50Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <path
        d="M100 50V90M100 90L70 70M100 90L130 70"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
