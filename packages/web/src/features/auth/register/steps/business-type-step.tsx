import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Utensils, Coffee, Beef, ShoppingCart, Shirt,
  Hammer, Smartphone, Scissors, Wrench, Warehouse, Settings,
} from 'lucide-react';
import type { BusinessTypePresetPublic } from '@/types/register.types';

const ICON_MAP: Record<string, React.ElementType> = {
  Utensils, Coffee, Beef, ShoppingCart, Shirt, Hammer, Smartphone,
  Scissors, Wrench, Warehouse, Settings,
};

const CATEGORY_LABELS: Record<string, string> = {
  fnb: 'Food & Beverage',
  retail: 'Retail',
  service: 'Layanan',
  wholesale: 'Grosir',
  custom: 'Custom',
};

interface BusinessTypeStepProps {
  grouped: Record<string, BusinessTypePresetPublic[]> | undefined;
  isLoading: boolean;
  defaultValue?: string;
  onNext: (businessType: string) => void;
  onBack: () => void;
}

export function BusinessTypeStep({
  grouped,
  isLoading,
  defaultValue,
  onNext,
  onBack,
}: BusinessTypeStepProps) {
  const [selected, setSelected] = useState<string>(defaultValue ?? '');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">Tipe Bisnis</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold">Pilih Tipe Bisnis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fitur akan disesuaikan dengan tipe bisnis Anda
        </p>
      </div>

      <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
        {grouped &&
          Object.entries(grouped).map(([category, categoryPresets]) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[category] ?? category}
              </h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {categoryPresets.map((preset) => {
                  const Icon = ICON_MAP[preset.icon] ?? Settings;
                  const isSelected = selected === preset.code;

                  return (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => setSelected(preset.code)}
                      className={cn(
                        'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-transparent bg-card hover:border-muted-foreground/20',
                      )}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-primary" />
                      )}
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{preset.label}</h4>
                        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                          {preset.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {preset.examples.slice(0, 2).map((ex) => (
                          <Badge key={ex} variant="secondary" className="text-[10px]">
                            {ex}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {preset.defaultFeatures.length} fitur aktif
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Kembali
        </Button>
        <Button
          type="button"
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="flex-1"
        >
          Lanjut
        </Button>
      </div>
    </motion.div>
  );
}
