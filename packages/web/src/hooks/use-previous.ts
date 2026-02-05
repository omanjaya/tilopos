import { useEffect, useRef } from 'react';

/**
 * Hook to get previous value
 *
 * Stores the previous value of a state variable.
 * Useful for comparison in useEffect or for animations.
 *
 * Note: The returned value will be undefined on first render since there's no previous value yet.
 *
 * @param value - Current value
 * @returns Previous value (undefined on first render)
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount] = useState(0);
 *   const prevCount = usePrevious(count);
 *
 *   useEffect(() => {
 *     if (prevCount !== undefined) {
 *       console.log(`Changed from ${prevCount} to ${count}`);
 *     }
 *   }, [count, prevCount]);
 *
 *   return (
 *     <div>
 *       <p>Current: {count}</p>
 *       <p>Previous: {prevCount ?? 'N/A'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  // eslint-disable-next-line react-hooks/refs
  const prevValue = ref.current;

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return prevValue;
}
