import type { SVGProps } from 'react';

/**
 * Cart Empty Illustration
 * No products/items in cart state
 */
export function CartEmpty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <path
        d="M60 70H140L130 130H70L60 70Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <path
        d="M60 70L50 50H40"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle
        cx="80"
        cy="145"
        r="5"
        fill="hsl(var(--muted-foreground))"
        opacity="0.5"
      />
      <circle
        cx="120"
        cy="145"
        r="5"
        fill="hsl(var(--muted-foreground))"
        opacity="0.5"
      />
    </svg>
  );
}
