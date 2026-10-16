import { useCallback } from 'react';
import { Delete, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NumPadProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    maxValue?: number;
    showDecimal?: boolean;
    className?: string;
}

export function NumPad({
    value,
    onChange,
    onSubmit,
    maxValue,
    showDecimal = false,
    className,
}: NumPadProps) {
    const handleDigit = useCallback((digit: string) => {
        let newValue = value + digit;

        // Remove leading zeros (except for decimal)
        if (!showDecimal && newValue.startsWith('0') && newValue.length > 1) {
            newValue = newValue.slice(1);
        }

        // Check max value
        if (maxValue !== undefined) {
            const numValue = parseFloat(newValue) || 0;
            if (numValue > maxValue) {
                return;
            }
        }

        onChange(newValue);
    }, [value, showDecimal, maxValue, onChange]);

    const handleBackspace = useCallback(() => {
        onChange(value.slice(0, -1));
    }, [onChange, value]);

    const handleClear = useCallback(() => {
        onChange('');
    }, [onChange]);

    const handleDecimal = useCallback(() => {
        if (!value.includes('.')) {
            onChange(value + '.');
        }
    }, [onChange, value]);

    const buttons = [
        { label: '1', action: () => handleDigit('1') },
        { label: '2', action: () => handleDigit('2') },
        { label: '3', action: () => handleDigit('3') },
        { label: '4', action: () => handleDigit('4') },
        { label: '5', action: () => handleDigit('5') },
        { label: '6', action: () => handleDigit('6') },
        { label: '7', action: () => handleDigit('7') },
        { label: '8', action: () => handleDigit('8') },
        { label: '9', action: () => handleDigit('9') },
        {
            label: showDecimal ? '.' : 'C',
            action: showDecimal ? handleDecimal : handleClear,
        },
        { label: '0', action: () => handleDigit('0') },
        {
            label: 'backspace',
            action: handleBackspace,
            icon: Delete,
        },
    ];

    return (
        <div className={cn('grid grid-cols-3 gap-2', className)}>
            {buttons.map((btn) => (
                <Button
                    key={btn.label}
                    variant="outline"
                    className={cn(
                        'h-14 text-xl font-medium',
                        'hover:bg-muted/80 active:scale-95 transition-all',
                    )}
                    onClick={btn.action}
                    aria-label={btn.icon ? 'Hapus digit' : undefined}
                >
                    {btn.icon ? <btn.icon className="h-5 w-5" /> : btn.label}
                </Button>
            ))}
            {onSubmit && (
                <Button
                    className="col-span-3 h-14 text-lg font-semibold"
                    onClick={onSubmit}
                >
                    <Check className="h-5 w-5 mr-2" />
                    Konfirmasi
                </Button>
            )}
        </div>
    );
}
