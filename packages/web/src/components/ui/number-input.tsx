import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { preventInvalidNumberInput } from '@/lib/validation-utils';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  maxDecimals?: number;
}

/**
 * Number Input Component
 *
 * Enhanced number input with built-in validation and edge case handling.
 *
 * Features:
 * - Prevents invalid keyboard input (e, +, -, optional)
 * - Allows only valid numeric characters
 * - Optional decimal support with precision control
 * - Optional negative number support
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * <NumberInput
 *   value={price}
 *   onChange={setPrice}
 *   min={0}
 *   max={999999}
 *   placeholder="0"
 * />
 *
 * <NumberInput
 *   value={quantity}
 *   onChange={setQuantity}
 *   allowDecimal={false}
 *   min={1}
 *   max={999}
 * />
 *
 * <NumberInput
 *   value={change}
 *   onChange={setChange}
 *   allowNegative={true}
 * />
 * ```
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      allowNegative = false,
      allowDecimal = true,
      maxDecimals = 2,
      min = 0,
      max,
      className,
      onKeyDown,
      onBlur,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent invalid input at keyboard level
      preventInvalidNumberInput(e, allowNegative, allowDecimal);

      // Call parent onKeyDown if provided
      onKeyDown?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;

      // Allow empty value
      if (newValue === '') {
        onChange('');
        return;
      }

      // Allow single minus sign
      if (allowNegative && newValue === '-') {
        onChange('-');
        return;
      }

      // Remove invalid characters
      const pattern = allowDecimal ? /[^\d.-]/g : /[^\d-]/g;
      newValue = newValue.replace(pattern, '');

      // Ensure only one decimal point
      if (allowDecimal) {
        const parts = newValue.split('.');
        if (parts.length > 2) {
          newValue = parts[0] + '.' + parts.slice(1).join('');
        }

        // Limit decimal places
        if (parts.length === 2 && parts[1] && parts[1].length > maxDecimals) {
          newValue = parts[0] + '.' + parts[1].slice(0, maxDecimals);
        }
      }

      // Ensure only one minus sign at the start
      if (allowNegative) {
        const firstChar = newValue[0] === '-' ? '-' : '';
        const rest = newValue.replace(/-/g, '');
        newValue = firstChar + rest;
      } else {
        newValue = newValue.replace(/-/g, '');
      }

      onChange(newValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Clean up edge cases on blur
      let cleanValue = e.target.value;

      // Remove trailing decimal point
      if (cleanValue.endsWith('.')) {
        cleanValue = cleanValue.slice(0, -1);
      }

      // Remove minus sign if no number
      if (cleanValue === '-') {
        cleanValue = '';
      }

      // Validate against min/max
      if (cleanValue !== '' && !isNaN(Number(cleanValue))) {
        let numValue = Number(cleanValue);
        const numMin = typeof min === 'number' ? min : Number(min);
        const numMax = typeof max === 'number' ? max : Number(max);

        if (min !== undefined && !isNaN(numMin) && numValue < numMin) {
          numValue = numMin;
          cleanValue = String(numMin);
        }

        if (max !== undefined && !isNaN(numMax) && numValue > numMax) {
          numValue = numMax;
          cleanValue = String(numMax);
        }
      }

      // Update value if changed
      if (cleanValue !== e.target.value) {
        onChange(cleanValue);
      }

      // Call parent onBlur if provided
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        min={min}
        max={max}
        className={cn(className)}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
