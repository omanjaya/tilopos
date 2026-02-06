import type { SVGProps } from 'react';

/**
 * No Connection Illustration
 * Wifi off/no connection state
 */
export function NoConnection(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <path
        d="M60 90C70 80 85 75 100 75C115 75 130 80 140 90"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M70 105C78 97 89 92 100 92C111 92 122 97 130 105"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle
        cx="100"
        cy="125"
        r="5"
        fill="hsl(var(--muted-foreground))"
        opacity="0.5"
      />
      <line
        x1="70"
        y1="70"
        x2="130"
        y2="130"
        stroke="hsl(var(--destructive))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
