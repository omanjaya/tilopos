import * as React from 'react';
import { Info, HelpCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { clsx } from 'clsx';

export interface HelpTooltipProps {
  content: string;
  title?: string;
  variant?: 'info' | 'warning' | 'tip' | 'help';
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const variantIcons = {
  info: Info,
  warning: AlertCircle,
  tip: Lightbulb,
  help: HelpCircle,
};

const variantColors = {
  info: 'text-blue-500 hover:text-blue-600',
  warning: 'text-amber-500 hover:text-amber-600',
  tip: 'text-purple-500 hover:text-purple-600',
  help: 'text-muted-foreground hover:text-foreground',
};

export function HelpTooltip({
  content,
  title,
  variant = 'help',
  side = 'top',
  align = 'center',
  className,
}: HelpTooltipProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      className={clsx(
        'group relative inline-flex',
        className
      )}
    >
      <button
        type="button"
        className={clsx(
          'inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          variantColors[variant]
        )}
        tabIndex={0}
      >
        <Icon className="h-4 w-4" />
        <span className="sr-only">Help</span>
      </button>
      {/* Tooltip */}
      <div
        className={clsx(
          'absolute z-50 w-64 rounded-md border bg-popover p-3 text-sm shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all',
          side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
          side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
          side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
          side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
          align === 'start' && side === 'top' && 'translate-x-0',
          align === 'end' && side === 'top' && '-translate-x-full',
          align === 'center' && side === 'top' && '-translate-x-1/2'
        )}
      >
        {title && (
          <div className="flex items-center gap-2 mb-1">
            <Icon className="h-3 w-3" />
            <span className="font-medium text-sm">{title}</span>
          </div>
        )}
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

/**
 * FieldHelp component - Wraps a form field with a help tooltip
 */
export interface FieldHelpProps {
  label: string;
  help: string;
  required?: boolean;
  children: React.ReactNode;
  helpTitle?: string;
  helpVariant?: HelpTooltipProps['variant'];
}

export function FieldHelp({
  label,
  help,
  required,
  children,
  helpTitle,
  helpVariant = 'help',
}: FieldHelpProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        <HelpTooltip content={help} title={helpTitle} variant={helpVariant} />
      </div>
      {children}
    </div>
  );
}

/**
 * HelpCard component - Displays a collapsible help section
 */
export interface HelpCardProps {
  title: string;
  content: string | string[];
  icon?: React.ReactNode;
  variant?: 'info' | 'warning' | 'tip' | 'help';
  defaultOpen?: boolean;
}

export function HelpCard({
  title,
  content,
  icon,
  variant = 'info',
  defaultOpen = false,
}: HelpCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const VariantIcon = variantIcons[variant];

  const variantStyles = {
    info: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
    tip: 'border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950',
    help: 'border-muted bg-muted/50',
  };

  const iconStyles = {
    info: 'text-blue-500',
    warning: 'text-amber-500',
    tip: 'text-purple-500',
    help: 'text-muted-foreground',
  };

  return (
    <div className={clsx('rounded-lg border p-4', variantStyles[variant])}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left"
      >
        {icon || (
          <VariantIcon className={clsx('h-4 w-4 flex-shrink-0', iconStyles[variant])} />
        )}
        <span className="font-medium text-sm">{title}</span>
        <span className="ml-auto">
          {isOpen ? (
            <span className="text-xs">−</span>
          ) : (
            <span className="text-xs">+</span>
          )}
        </span>
      </button>
      {isOpen && (
        <div className="mt-3 text-sm">
          {Array.isArray(content) ? (
            <ul className="space-y-1 list-disc list-inside">
              {content.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>{content}</p>
          )}
        </div>
      )}
    </div>
  );
}
