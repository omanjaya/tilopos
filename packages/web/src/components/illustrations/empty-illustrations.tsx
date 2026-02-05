/**
 * Empty State Illustrations
 *
 * Collection of simple SVG illustrations for empty states.
 * All illustrations are inline SVG components that support theming.
 *
 * Usage:
 * import { EmptyBoxIllustration } from '@/components/illustrations/empty-illustrations';
 * <EmptyBoxIllustration className="w-48 h-48" />
 */

import type { SVGProps } from 'react';

/**
 * Empty Box - Generic empty state
 */
export function EmptyBoxIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Search - No search results
 */
export function SearchEmptyIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Shopping Cart - No products/items
 */
export function CartEmptyIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Users - No customers/employees
 */
export function UsersEmptyIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Document - No orders/transactions
 */
export function DocumentEmptyIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Error - Error state
 */
export function ErrorIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Construction - Coming soon/maintenance
 */
export function ConstructionIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Wifi Off - No connection
 */
export function NoConnectionIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Lock - No permission
 */
export function NoPermissionIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Check Circle - Success/completed
 */
export function SuccessIllustration(props: SVGProps<SVGSVGElement>) {
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

/**
 * Inbox - No messages/notifications
 */
export function InboxEmptyIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <path
        d="M60 80H140V120H120L110 130L100 120H60V80Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <line
        x1="75"
        y1="95"
        x2="125"
        y2="95"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}

/**
 * Folder - No files/data
 */
export function FolderEmptyIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <path
        d="M60 80H90L100 90H140V130H60V80Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
    </svg>
  );
}

/**
 * Calendar - No events/schedule
 */
export function CalendarEmptyIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <rect
        x="60"
        y="70"
        width="80"
        height="70"
        rx="4"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        fill="hsl(var(--background))"
        opacity="0.5"
      />
      <line
        x1="60"
        y1="90"
        x2="140"
        y2="90"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        opacity="0.5"
      />
      <line
        x1="80"
        y1="60"
        x2="80"
        y2="75"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="120"
        y1="60"
        x2="120"
        y2="75"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/**
 * Chart - No data/statistics
 */
export function ChartEmptyIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" opacity="0.2" />
      <line
        x1="60"
        y1="140"
        x2="140"
        y2="140"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="60"
        y1="60"
        x2="60"
        y2="140"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <rect
        x="75"
        y="120"
        width="12"
        height="20"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
      />
      <rect
        x="95"
        y="110"
        width="12"
        height="30"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
      />
      <rect
        x="115"
        y="125"
        width="12"
        height="15"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
      />
    </svg>
  );
}
