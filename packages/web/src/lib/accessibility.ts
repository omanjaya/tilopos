/**
 * Accessibility Utilities
 *
 * Helper functions and utilities for WCAG 2.1 AA compliance.
 *
 * Usage:
 * ```tsx
 * import { srOnly, announceToScreenReader } from '@/lib/accessibility';
 *
 * <span className={srOnly}>Screen reader only text</span>
 * announceToScreenReader('Item added to cart');
 * ```
 */

/**
 * Screen Reader Only CSS class
 *
 * Hides content visually but keeps it accessible to screen readers.
 * Follows WCAG best practices.
 */
export const srOnly =
  'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 clip-[rect(0,0,0,0)]';

/**
 * Announce message to screen readers
 *
 * Creates a temporary live region to announce dynamic content changes.
 * Useful for actions that don't have visual feedback.
 *
 * @param message - Message to announce
 * @param priority - 'polite' (default) or 'assertive'
 *
 * @example
 * ```tsx
 * // After adding item to cart
 * announceToScreenReader('Item added to cart');
 *
 * // For urgent messages
 * announceToScreenReader('Form submission failed', 'assertive');
 * ```
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = srOnly;
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement (screen readers need time to read it)
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get ARIA attributes for loading button
 *
 * Returns standardized ARIA attributes for buttons with loading states.
 *
 * @param isLoading - Whether button is in loading state
 * @param label - Optional label for loading state
 * @returns ARIA attributes object
 *
 * @example
 * ```tsx
 * <Button {...getLoadingButtonProps(isPending, 'Saving product')}>
 *   {isPending && <Loader2 />}
 *   Save
 * </Button>
 * ```
 */
export function getLoadingButtonProps(
  isLoading: boolean,
  label?: string
): {
  'aria-busy': boolean;
  'aria-label'?: string;
} {
  return {
    'aria-busy': isLoading,
    ...(isLoading && label ? { 'aria-label': label } : {}),
  };
}

/**
 * Get ARIA attributes for form field with error
 *
 * Returns standardized ARIA attributes for form fields with validation errors.
 *
 * @param error - Error message or undefined
 * @param fieldId - ID of the form field
 * @returns ARIA attributes object
 *
 * @example
 * ```tsx
 * const errorId = `${field.name}-error`;
 *
 * <input
 *   id={field.name}
 *   {...getFormFieldErrorProps(errors.name, errorId)}
 * />
 * {errors.name && (
 *   <span id={errorId} role="alert" className="text-sm text-destructive">
 *     {errors.name.message}
 *   </span>
 * )}
 * ```
 */
export function getFormFieldErrorProps(
  error: string | undefined,
  errorId: string
): {
  'aria-invalid': boolean;
  'aria-describedby'?: string;
} {
  return {
    'aria-invalid': !!error,
    ...(error ? { 'aria-describedby': errorId } : {}),
  };
}

/**
 * Get ARIA attributes for modal dialog
 *
 * Returns standardized ARIA attributes for modal dialogs.
 *
 * @param title - Modal title
 * @param description - Optional modal description
 * @returns ARIA attributes object
 *
 * @example
 * ```tsx
 * <Dialog {...getModalProps('Delete Product', 'Are you sure?')}>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Delete Product</DialogTitle>
 *       <DialogDescription>Are you sure?</DialogDescription>
 *     </DialogHeader>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export function getModalProps(
  title: string,
  description?: string
): {
  'aria-label': string;
  'aria-describedby'?: string;
} {
  return {
    'aria-label': title,
    ...(description ? { 'aria-describedby': 'modal-description' } : {}),
  };
}

/**
 * Keyboard shortcut helper
 *
 * Returns standardized string for keyboard shortcuts.
 *
 * @param keys - Array of keys (e.g., ['Control', 'S'])
 * @returns Formatted shortcut string
 *
 * @example
 * ```tsx
 * <Button aria-keyshortcuts={formatKeyboardShortcut(['Control', 'S'])}>
 *   Save
 * </Button>
 * // Result: aria-keyshortcuts="Control+S"
 * ```
 */
export function formatKeyboardShortcut(keys: string[]): string {
  return keys.join('+');
}

/**
 * Check if element is focusable
 *
 * Determines if an element can receive keyboard focus.
 *
 * @param element - DOM element to check
 * @returns True if focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return focusableSelectors.some((selector) => element.matches(selector));
}

/**
 * Get all focusable elements within container
 *
 * Returns array of all focusable elements for focus management.
 *
 * @param container - Container element
 * @returns Array of focusable elements
 *
 * @example
 * ```tsx
 * const modal = document.getElementById('modal');
 * const focusableElements = getFocusableElements(modal);
 * focusableElements[0]?.focus(); // Focus first element
 * ```
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * Trap focus within container
 *
 * Creates a focus trap for modal dialogs and overlays.
 * Returns cleanup function to remove trap.
 *
 * @param container - Container element
 * @returns Cleanup function
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const modal = modalRef.current;
 *   if (!modal || !isOpen) return;
 *
 *   const cleanup = trapFocus(modal);
 *   return cleanup;
 * }, [isOpen]);
 * ```
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Focus first element
  firstElement?.focus();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab: backward
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: forward
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to previous element
 *
 * Saves the currently focused element and returns a function to restore focus.
 * Useful for modals and temporary overlays.
 *
 * @returns Restore function
 *
 * @example
 * ```tsx
 * const restoreFocus = saveFocus();
 * // ... open modal ...
 * // ... close modal ...
 * restoreFocus();
 * ```
 */
export function saveFocus(): () => void {
  const previousElement = document.activeElement as HTMLElement;

  return () => {
    previousElement?.focus();
  };
}

/**
 * Get contrast ratio between two colors
 *
 * Calculates WCAG contrast ratio for accessibility compliance.
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text.
 *
 * @param color1 - First color (hex)
 * @param color2 - Second color (hex)
 * @returns Contrast ratio
 *
 * @example
 * ```tsx
 * const ratio = getContrastRatio('#000000', '#FFFFFF');
 * console.log(ratio); // 21 (maximum contrast)
 *
 * const meetsWCAG = ratio >= 4.5; // AA compliance
 * ```
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}
