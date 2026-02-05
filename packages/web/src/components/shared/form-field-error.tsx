import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldErrorProps {
  error?: string;
  touched?: boolean;
  className?: string;
}

/**
 * Form field error message component with icon
 * Only shows when field is touched and has error
 */
export function FormFieldError({ error, touched, className }: FormFieldErrorProps) {
  if (!error || !touched) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm text-destructive animate-in slide-in-from-top-1 duration-200',
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  );
}

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  touched?: boolean;
  label?: string;
}

/**
 * Enhanced input wrapper with error styling
 */
export function FormField({ error, touched, label, className, ...props }: FormFieldProps) {
  const hasError = error && touched;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <input
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        aria-invalid={hasError ? 'true' : 'false'}
        {...props}
      />
      <FormFieldError error={error} touched={touched} />
    </div>
  );
}
