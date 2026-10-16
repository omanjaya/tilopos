import * as React from 'react';
import { cn } from '@/lib/utils';

const RadioGroupContext = React.createContext<{
  value: string;
  name: string;
  onChange: (value: string) => void;
}>({ value: '', name: '', onChange: () => {} });

export interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  /** Shared native radio name; generated when omitted so arrow keys move within the group */
  name?: string;
  'aria-label'?: string;
}

export function RadioGroup({ value, onValueChange, children, className, name, 'aria-label': ariaLabel }: RadioGroupProps) {
  const generatedName = React.useId();
  return (
    <RadioGroupContext.Provider value={{ value, name: name ?? generatedName, onChange: onValueChange }}>
      <div role="radiogroup" aria-label={ariaLabel} className={cn('space-y-2', className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps {
  value: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroupItem({ value, id, disabled = false, className }: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext);

  return (
    <input
      type="radio"
      id={id}
      name={context.name}
      value={value}
      checked={context.value === value}
      onChange={() => context.onChange(value)}
      disabled={disabled}
      className={cn(
        'h-4 w-4 rounded-full border border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  );
}
