import type { SVGProps } from 'react';

/**
 * No Permission Illustration
 * Lock/no permission state
 */
export function NoPermission(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <rect
        x="70"
        y="100"
        width="60"
        height="40"
        rx="4"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <path
        d="M80 100V80C80 69 89 60 100 60C111 60 120 69 120 80V100"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle
        cx="100"
        cy="120"
        r="5"
        fill="hsl(var(--muted-foreground))"
        opacity="0.5"
      />
    </svg>
  );
}
