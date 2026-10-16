import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuresApi, type BusinessFeatureDto } from '@/api/endpoints/features.api';
import { useFeatureStore } from '@/stores/feature.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
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
        aria-label={feature.label}
      />
    </div>
  );
}

export function FeaturesPage() {
  const queryClient = useQueryClient();
  const setEnabledFeatures = useFeatureStore((s) => s.setEnabledFeatures);
  // The app menu and POS read outlet-level features (app-layout / pos-page),
  // so toggle at the same level when an outlet is selected.
  const outletId = useFeatureStore((s) => s.currentOutletId);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const queryKey = ['features-settings', outletId ?? 'business'];

  const { data: featuresByCategory, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<Record<string, BusinessFeatureDto[]>> => {
      if (!outletId) return featuresApi.getFeaturesByCategory();
      const list = await featuresApi.getOutletFeatures(outletId);
      return list.reduce<Record<string, BusinessFeatureDto[]>>((acc, f) => {
        (acc[f.category] ??= []).push(f);
        return acc;
      }, {});
    },
  });

  const refreshEnabledFeatures = async () => {
    const keys = outletId
      ? await featuresApi.getOutletEnabledFeatures(outletId)
      : await featuresApi.getEnabledFeatures();
    setEnabledFeatures(keys);
  };

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      outletId
        ? featuresApi.toggleOutletFeature(outletId, key, enabled)
        : featuresApi.toggleFeature(key, enabled),
    onSuccess: (result) => {
      setTogglingKey(null);
      if (!result.success) {
        toast.error({
          title: 'Gagal memperbarui fitur',
          description: result.message ?? 'Fitur tidak dapat diubah.',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['features-settings'] });
      queryClient.invalidateQueries({ queryKey: ['business-features-by-category'] });
      // Refresh enabled features for the sidebar from the same source the layout uses
      refreshEnabledFeatures().catch((err: unknown) =>
        handleMutationError(err, 'Gagal memuat ulang daftar fitur'),
      );

      if (result.affectedFeatures && result.affectedFeatures.length > 0) {
        toast.success({
          title: 'Fitur diperbarui',
          description: `Fitur terkait juga dinonaktifkan: ${result.affectedFeatures.join(', ')}`,
        });
      } else {
        toast.success({ title: `Fitur ${result.isEnabled ? 'diaktifkan' : 'dinonaktifkan'}` });
      }
    },
    onError: (err) => {
      handleMutationError(err, 'Gagal memperbarui fitur');
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

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fitur" description="Kelola fitur yang aktif untuk bisnis Anda" />
        <ErrorState title="Gagal memuat daftar fitur" error={error} onRetry={() => void refetch()} />
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
        description={
          outletId
            ? 'Aktifkan atau nonaktifkan fitur untuk outlet yang sedang dipilih'
            : 'Aktifkan atau nonaktifkan fitur sesuai kebutuhan bisnis Anda'
        }
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
