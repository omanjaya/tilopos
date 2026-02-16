import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { templatesApi, type TemplateSummary } from '@/api/endpoints/templates.api';
import { Button } from '@/components/ui/button';
import { Loader2, UtensilsCrossed, Coffee, Flame, ShoppingBasket, Shirt, Hammer, Smartphone, Scissors, WashingMachine, Wrench, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  UtensilsCrossed,
  Coffee,
  Flame,
  ShoppingBasket,
  Shirt,
  Hammer,
  Smartphone,
  Scissors,
  WashingMachine,
  Wrench,
  Warehouse,
};

interface BusinessTypeStepProps {
  selectedType: string | null;
  onSelect: (typeCode: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function BusinessTypeStep({ selectedType, onSelect, onNext, onBack, onSkip }: BusinessTypeStepProps) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="py-4"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold">Pilih Tipe Bisnis</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pilih jenis bisnis Anda agar kami bisa menyiapkan template yang sesuai.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
          {templates?.map((t: TemplateSummary, idx: number) => {
            const Icon = iconMap[t.icon] || ShoppingBasket;
            const isSelected = selectedType === t.type;
            return (
              <motion.button
                key={t.type}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => onSelect(t.type)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all hover:border-primary/50 hover:shadow-sm',
                  isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{t.description}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Kembali
        </Button>
        <Button onClick={onNext} disabled={!selectedType} className="flex-1">
          Lanjut
        </Button>
      </div>
      <div className="mx-auto mt-2 max-w-md">
        <Button variant="ghost" onClick={onSkip} className="w-full">
          Lewati langkah ini
        </Button>
      </div>
    </motion.div>
  );
}
