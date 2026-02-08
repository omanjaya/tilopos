import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuresApi, type BusinessFeatureDto } from '@/api/endpoints/features.api';
import { useFeatureStore } from '@/stores/feature.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  sales: 'Penjualan',
  inventory: 'Inventori',
  marketing: 'Pemasaran',
  service: 'Layanan',
  advanced: 'Lanjutan',
};

function FeatureToggleCard({
  feature,
  onToggle,
  isToggling,
}: {
  feature: BusinessFeatureDto;
  onToggle: (key: string, enabled: boolean) => void;
  isToggling: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{feature.label}</span>
          {feature.dependencies && feature.dependencies.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Butuh: {feature.dependencies.join(', ')}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{feature.description}</p>
      </div>
      <Switch
        checked={feature.isEnabled}
        onCheckedChange={(checked) => onToggle(feature.key, checked)}
        disabled={isToggling}
      />
    </div>
  );
}

export function FeaturesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const setEnabledFeatures = useFeatureStore((s) => s.setEnabledFeatures);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const { data: featuresByCategory, isLoading } = useQuery({
    queryKey: ['business-features-by-category'],
    queryFn: featuresApi.getFeaturesByCategory,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      featuresApi.toggleFeature(key, enabled),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['business-features-by-category'] });
      // Refresh enabled features for sidebar
      featuresApi.getEnabledFeatures().then(setEnabledFeatures);

      if (result.affectedFeatures && result.affectedFeatures.length > 0) {
        toast({
          title: 'Fitur diperbarui',
          description: `Fitur terkait juga dinonaktifkan: ${result.affectedFeatures.join(', ')}`,
        });
      } else {
        toast({ title: `Fitur ${result.isEnabled ? 'diaktifkan' : 'dinonaktifkan'}` });
      }
      setTogglingKey(null);
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Gagal memperbarui fitur' });
      setTogglingKey(null);
    },
  });

  const handleToggle = (key: string, enabled: boolean) => {
    setTogglingKey(key);
    toggleMutation.mutate({ key, enabled });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fitur" description="Kelola fitur yang aktif untuk bisnis Anda" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const categories = Object.entries(featuresByCategory ?? {}).filter(
    ([, features]) => features.length > 0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fitur"
        description="Aktifkan atau nonaktifkan fitur sesuai kebutuhan bisnis Anda"
      />

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Menonaktifkan fitur akan menyembunyikan menu terkait
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Beberapa fitur memiliki ketergantungan. Menonaktifkan fitur utama akan otomatis
              menonaktifkan fitur yang bergantung padanya.
            </p>
          </div>
        </CardContent>
      </Card>

      {categories.map(([category, features]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base">
              {CATEGORY_LABELS[category] ?? category}
            </CardTitle>
            <CardDescription>
              {features.filter((f) => f.isEnabled).length} dari {features.length} fitur aktif
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.map((feature) => (
              <FeatureToggleCard
                key={feature.key}
                feature={feature}
                onToggle={handleToggle}
                isToggling={togglingKey === feature.key}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
