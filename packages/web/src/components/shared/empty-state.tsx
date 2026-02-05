import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'h-8 w-8 mb-2',
      title: 'text-sm',
      description: 'text-xs mt-1'
    },
    md: {
      container: 'py-10',
      icon: 'h-12 w-12 mb-4',
      title: 'text-base',
      description: 'text-sm mt-2'
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16 mb-6',
      title: 'text-lg',
      description: 'text-base mt-3'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center justify-center text-center animate-in fade-in duration-500', classes.container, className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl" />
        <Icon className={cn('relative text-muted-foreground/40', classes.icon)} />
      </div>
      <h3 className={cn('font-semibold text-foreground', classes.title)}>{title}</h3>
      {description && <p className={cn('text-muted-foreground max-w-sm', classes.description)}>{description}</p>}
      {action && <div className="mt-5 animate-in slide-in-from-bottom-4 duration-500 delay-150">{action}</div>}
    </div>
  );
}
