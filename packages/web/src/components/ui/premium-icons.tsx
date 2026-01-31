import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Premium Icon Wrapper Component
// Provides consistent styling for all icons across the app

export interface PremiumIconProps {
    icon: LucideIcon;
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'default' | 'solid' | 'gradient' | 'outlined' | 'ghost';
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'white';
}

const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
};

const colorClasses = {
    primary: 'text-primary',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    info: 'text-blue-500',
    muted: 'text-muted-foreground',
    white: 'text-white',
};

export function PremiumIcon({
    icon: Icon,
    className,
    size = 'md',
    variant = 'default',
    color = 'primary',
}: PremiumIconProps) {
    if (variant === 'default') {
        return (
            <Icon className={cn(sizeClasses[size], colorClasses[color], className)} />
        );
    }

    return (
        <Icon className={cn(sizeClasses[size], colorClasses[color], className)} />
    );
}

// Icon Container - Wraps icon with background
export interface IconContainerProps {
    icon: LucideIcon;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'solid' | 'soft' | 'gradient' | 'outlined';
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'slate';
}

const containerSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
};

const iconSizeInContainer = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
};

const solidColors = {
    primary: 'bg-primary text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    slate: 'bg-slate-800 text-white',
};

const softColors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-red-500/10 text-red-600',
    info: 'bg-blue-500/10 text-blue-600',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const gradientColors = {
    primary: 'bg-gradient-to-br from-primary to-blue-400 text-white',
    success: 'bg-gradient-to-br from-emerald-500 to-green-400 text-white',
    warning: 'bg-gradient-to-br from-amber-500 to-yellow-400 text-white',
    danger: 'bg-gradient-to-br from-red-500 to-rose-400 text-white',
    info: 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white',
    slate: 'bg-gradient-to-br from-slate-700 to-slate-500 text-white',
};

const outlinedColors = {
    primary: 'border-2 border-primary text-primary',
    success: 'border-2 border-emerald-500 text-emerald-500',
    warning: 'border-2 border-amber-500 text-amber-500',
    danger: 'border-2 border-red-500 text-red-500',
    info: 'border-2 border-blue-500 text-blue-500',
    slate: 'border-2 border-slate-300 text-slate-600',
};

export function IconContainer({
    icon: Icon,
    className,
    size = 'md',
    variant = 'soft',
    color = 'primary',
}: IconContainerProps) {
    const getVariantClass = () => {
        switch (variant) {
            case 'solid':
                return solidColors[color];
            case 'soft':
                return softColors[color];
            case 'gradient':
                return gradientColors[color];
            case 'outlined':
                return outlinedColors[color];
            default:
                return softColors[color];
        }
    };

    return (
        <div
            className={cn(
                'flex items-center justify-center rounded-xl transition-transform hover:scale-105',
                containerSizeClasses[size],
                getVariantClass(),
                className
            )}
        >
            <Icon className={iconSizeInContainer[size]} />
        </div>
    );
}

// Nav Icon - Specific for navigation/sidebar
export interface NavIconProps {
    icon: LucideIcon;
    isActive?: boolean;
    className?: string;
}

export function NavIcon({ icon: Icon, isActive, className }: NavIconProps) {
    return (
        <div
            className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground',
                className
            )}
        >
            <Icon className="h-[18px] w-[18px]" />
        </div>
    );
}

// Feature Icon - For feature cards on landing/marketing
export interface FeatureIconProps {
    icon: LucideIcon;
    color?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan' | 'slate';
    className?: string;
}

const featureGradients = {
    blue: 'from-blue-500 to-cyan-400',
    purple: 'from-purple-500 to-pink-400',
    green: 'from-emerald-500 to-green-400',
    orange: 'from-orange-500 to-amber-400',
    red: 'from-red-500 to-rose-400',
    cyan: 'from-cyan-500 to-blue-400',
    slate: 'from-slate-600 to-slate-400',
};

const featureSoftBg = {
    blue: 'bg-blue-50 dark:bg-blue-950',
    purple: 'bg-purple-50 dark:bg-purple-950',
    green: 'bg-emerald-50 dark:bg-emerald-950',
    orange: 'bg-orange-50 dark:bg-orange-950',
    red: 'bg-red-50 dark:bg-red-950',
    cyan: 'bg-cyan-50 dark:bg-cyan-950',
    slate: 'bg-slate-100 dark:bg-slate-800',
};

export function FeatureIcon({ icon: Icon, color = 'blue', className }: FeatureIconProps) {
    return (
        <div
            className={cn(
                'relative flex h-14 w-14 items-center justify-center rounded-2xl',
                featureSoftBg[color],
                className
            )}
        >
            <div
                className={cn(
                    'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-10',
                    featureGradients[color]
                )}
            />
            <Icon
                className={cn(
                    'h-7 w-7 bg-gradient-to-br bg-clip-text',
                    featureGradients[color]
                )}
                style={{
                    color: `var(--tw-gradient-from)`,
                }}
            />
        </div>
    );
}

// Status Icon - For status indicators
export interface StatusIconProps {
    icon: LucideIcon;
    status: 'success' | 'warning' | 'error' | 'info' | 'pending';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const statusStyles = {
    success: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-600 dark:text-amber-400',
    },
    error: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
    },
    info: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
    },
    pending: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-500 dark:text-slate-400',
    },
};

const statusSizes = {
    sm: { container: 'h-6 w-6', icon: 'h-3.5 w-3.5' },
    md: { container: 'h-8 w-8', icon: 'h-4 w-4' },
    lg: { container: 'h-10 w-10', icon: 'h-5 w-5' },
};

export function StatusIcon({ icon: Icon, status, size = 'md', className }: StatusIconProps) {
    const style = statusStyles[status];
    const sizeStyle = statusSizes[size];

    return (
        <div
            className={cn(
                'flex items-center justify-center rounded-full',
                style.bg,
                sizeStyle.container,
                className
            )}
        >
            <Icon className={cn(style.text, sizeStyle.icon)} />
        </div>
    );
}

// Action Icon Button - For icon-only actions
export interface ActionIconProps {
    icon: LucideIcon;
    onClick?: () => void;
    variant?: 'ghost' | 'soft' | 'solid';
    color?: 'primary' | 'danger' | 'success' | 'muted';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
    title?: string;
}

const actionVariants = {
    ghost: {
        primary: 'hover:bg-primary/10 text-primary',
        danger: 'hover:bg-red-500/10 text-red-500',
        success: 'hover:bg-emerald-500/10 text-emerald-500',
        muted: 'hover:bg-muted text-muted-foreground hover:text-foreground',
    },
    soft: {
        primary: 'bg-primary/10 hover:bg-primary/20 text-primary',
        danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500',
        success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500',
        muted: 'bg-muted hover:bg-muted/80 text-muted-foreground',
    },
    solid: {
        primary: 'bg-primary hover:bg-primary/90 text-white',
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        muted: 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    },
};

const actionSizes = {
    sm: { container: 'h-7 w-7', icon: 'h-3.5 w-3.5' },
    md: { container: 'h-9 w-9', icon: 'h-4 w-4' },
    lg: { container: 'h-11 w-11', icon: 'h-5 w-5' },
};

export function ActionIcon({
    icon: Icon,
    onClick,
    variant = 'ghost',
    color = 'muted',
    size = 'md',
    disabled,
    className,
    title,
}: ActionIconProps) {
    const variantStyle = actionVariants[variant][color];
    const sizeStyle = actionSizes[size];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                'inline-flex items-center justify-center rounded-lg transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                variantStyle,
                sizeStyle.container,
                className
            )}
        >
            <Icon className={sizeStyle.icon} />
        </button>
    );
}

// Animated Icon - For loading/processing states
export interface AnimatedIconProps {
    icon: LucideIcon;
    animation?: 'spin' | 'pulse' | 'bounce' | 'ping';
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const animationClasses = {
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    ping: 'animate-ping',
};

export function AnimatedIcon({ icon: Icon, animation = 'spin', size = 'md', className }: AnimatedIconProps) {
    return (
        <Icon
            className={cn(
                sizeClasses[size],
                animationClasses[animation],
                'text-primary',
                className
            )}
        />
    );
}
