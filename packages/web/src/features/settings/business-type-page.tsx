import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuresApi, type BusinessTypePreset } from '@/api/endpoints/features.api';
import { useFeatureStore } from '@/stores/feature.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, Loader2, Utensils, Coffee, Beef, ShoppingCart, Shirt,
  Hammer, Smartphone, Scissors, Wrench, Warehouse, Settings,
} from 'lucide-react';

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

function PresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: BusinessTypePreset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = ICON_MAP[preset.icon] ?? Settings;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-transparent bg-card hover:border-muted-foreground/20',
      )}
    >
      {isSelected && (
        <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />
      )}
      <div className={cn(
        'flex h-12 w-12 items-center justify-center rounded-xl',
        isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-semibold">{preset.label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {preset.examples.slice(0, 3).map((ex) => (
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
}

export function BusinessTypePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const setEnabledFeatures = useFeatureStore((s) => s.setEnabledFeatures);
  const setBusinessType = useFeatureStore((s) => s.setBusinessType);
  const currentType = useFeatureStore((s) => s.businessType);

  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: presetsData, isLoading: presetsLoading } = useQuery({
    queryKey: ['business-type-presets'],
    queryFn: featuresApi.getTypePresets,
  });

  const { data: typeInfo, isLoading: typeLoading } = useQuery({
    queryKey: ['business-type'],
    queryFn: featuresApi.getBusinessType,
  });

  const changeMutation = useMutation({
    mutationFn: (businessType: string) => featuresApi.changeBusinessType(businessType),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['business-type'] });
      queryClient.invalidateQueries({ queryKey: ['business-features-by-category'] });
      setBusinessType(result.newType);
      // Refresh enabled features for sidebar
      featuresApi.getEnabledFeatures().then(setEnabledFeatures);
      toast({
        title: 'Tipe bisnis berhasil diubah',
        description: `${result.featuresEnabled} fitur telah diaktifkan`,
      });
      setSelectedType(null);
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Gagal mengubah tipe bisnis' });
    },
  });

  const effectiveType = selectedType ?? currentType ?? typeInfo?.businessType?.code ?? null;

  if (presetsLoading || typeLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tipe Bisnis" description="Pilih tipe bisnis untuk mengatur fitur" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const grouped = presetsData?.grouped ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipe Bisnis"
        description="Pilih tipe bisnis untuk mengatur fitur yang tersedia secara otomatis"
      />

      {typeInfo?.businessType && (
        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium">Tipe bisnis saat ini</p>
              <p className="text-lg font-bold text-primary">{typeInfo.businessType.label}</p>
              <p className="text-xs text-muted-foreground">{typeInfo.businessType.description}</p>
            </div>
            {typeInfo.recommendation && typeInfo.recommendation !== typeInfo.businessType.code && (
              <Badge variant="outline">
                Rekomendasi: {presetsData?.presets.find((p) => p.code === typeInfo.recommendation)?.label}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([category, presets]) => (
        <div key={category}>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => (
              <PresetCard
                key={preset.code}
                preset={preset}
                isSelected={effectiveType === preset.code}
                onSelect={() => setSelectedType(preset.code)}
              />
            ))}
          </div>
        </div>
      ))}

      {selectedType && selectedType !== currentType && (
        <div className="sticky bottom-4 flex justify-end">
          <Card className="shadow-lg">
            <CardContent className="flex items-center gap-4 pt-4">
              <p className="text-sm">
                Ubah tipe bisnis ke{' '}
                <strong>{presetsData?.presets.find((p) => p.code === selectedType)?.label}</strong>?
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedType(null)}>
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={() => changeMutation.mutate(selectedType)}
                  disabled={changeMutation.isPending}
                >
                  {changeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Terapkan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
