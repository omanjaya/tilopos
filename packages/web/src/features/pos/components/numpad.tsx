import { useState } from 'react';
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
    const handleDigit = (digit: string) => {
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
    };

    const handleBackspace = () => {
        onChange(value.slice(0, -1));
    };

    const handleClear = () => {
        onChange('');
    };

    const handleDecimal = () => {
        if (!value.includes('.')) {
            onChange(value + '.');
        }
    };

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

// Quick amount buttons
interface QuickAmountProps {
    amounts: number[];
    onSelect: (amount: number) => void;
    selected?: number;
    className?: string;
}

export function QuickAmountButtons({
    amounts,
    onSelect,
    selected,
    className,
}: QuickAmountProps) {
    return (
        <div className={cn('grid grid-cols-2 gap-2', className)}>
            {amounts.map((amount) => (
                <Button
                    key={amount}
                    variant={selected === amount ? 'default' : 'outline'}
                    className="h-12 font-medium"
                    onClick={() => onSelect(amount)}
                >
                    Rp {amount.toLocaleString('id-ID')}
                </Button>
            ))}
        </div>
    );
}

// Full numpad with display
interface FullNumPadProps {
    label?: string;
    value: number;
    onChange: (value: number) => void;
    onSubmit?: () => void;
    showQuickAmounts?: boolean;
    quickAmounts?: number[];
    className?: string;
}

export function FullNumPad({
    label = 'Jumlah',
    value,
    onChange,
    onSubmit,
    showQuickAmounts = true,
    quickAmounts = [10000, 20000, 50000, 100000],
    className,
}: FullNumPadProps) {
    const [inputValue, setInputValue] = useState(value > 0 ? value.toString() : '');

    const handleChange = (newValue: string) => {
        setInputValue(newValue);
        onChange(parseInt(newValue) || 0);
    };

    const handleQuickAmount = (amount: number) => {
        setInputValue(amount.toString());
        onChange(amount);
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Display */}
            <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">{label}</p>
                <p className="text-3xl font-bold tabular-nums">
                    Rp {(parseInt(inputValue) || 0).toLocaleString('id-ID')}
                </p>
            </div>

            {/* Quick Amounts */}
            {showQuickAmounts && (
                <QuickAmountButtons
                    amounts={quickAmounts}
                    onSelect={handleQuickAmount}
                    selected={parseInt(inputValue)}
                />
            )}

            {/* NumPad */}
            <NumPad
                value={inputValue}
                onChange={handleChange}
                onSubmit={onSubmit}
            />
        </div>
    );
}
