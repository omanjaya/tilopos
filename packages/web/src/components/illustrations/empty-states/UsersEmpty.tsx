import type { SVGProps } from 'react';

/**
 * Users Empty Illustration
 * No customers/employees state
 */
export function UsersEmpty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <circle
        cx="100"
        cy="80"
        r="20"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <path
        d="M70 140C70 125 83 115 100 115C117 115 130 125 130 140"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
    </svg>
  );
}
