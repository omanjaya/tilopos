import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { settingsApi } from '@/api/endpoints/settings.api';
import { useUIStore } from '@/stores/ui.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { Loader2, Save } from 'lucide-react';
import type { UpdateTaxConfigRequest } from '@/types/settings.types';

// Zod schema for tax settings validation
const taxSettingsSchema = z.object({
  taxEnabled: z.boolean(),
  serviceChargeEnabled: z.boolean(),
  taxRate: z.number().min(0, 'Tarif pajak tidak boleh negatif').max(100, 'Tarif pajak maksimal 100%'),
  serviceChargeRate: z
    .number()
    .min(0, 'Tarif biaya layanan tidak boleh negatif')
    .max(100, 'Tarif biaya layanan maksimal 100%'),
  isTaxInclusive: z.boolean(),
});

type TaxSettingsFormData = z.infer<typeof taxSettingsSchema>;

export function TaxSettingsPage() {
  const queryClient = useQueryClient();

  const form = useForm<TaxSettingsFormData>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: {
      taxEnabled: true,
      serviceChargeEnabled: false,
      taxRate: 0,
      serviceChargeRate: 0,
      isTaxInclusive: false,
    },
  });

  const { data: taxConfig, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['taxConfig'],
    queryFn: settingsApi.getTaxConfig,
  });

  useEffect(() => {
    if (taxConfig) {
      form.reset({
        taxEnabled: taxConfig.taxEnabled,
        serviceChargeEnabled: taxConfig.serviceChargeEnabled,
        taxRate: taxConfig.taxRate,
        serviceChargeRate: taxConfig.serviceChargeRate,
        isTaxInclusive: taxConfig.isTaxInclusive,
      });
      // Sync tax settings to this device's UI store for POS usage
      const ui = useUIStore.getState();
      ui.setTaxRate(taxConfig.taxEnabled ? taxConfig.taxRate / 100 : 0);
      ui.setServiceChargeRate(
        taxConfig.serviceChargeEnabled ? taxConfig.serviceChargeRate / 100 : 0,
      );
      ui.setTaxInclusive(taxConfig.isTaxInclusive);
    }
  }, [taxConfig, form]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTaxConfigRequest) => settingsApi.updateTaxConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxConfig'] });
      toast.success({ title: 'Pengaturan pajak berhasil disimpan' });
    },
    onError: (error) => handleMutationError(error, 'Gagal menyimpan'),
  });

  const onSubmit = (data: TaxSettingsFormData) => {
    updateMutation.mutate({
      taxEnabled: data.taxEnabled,
      taxRate: data.taxRate,
      serviceChargeEnabled: data.serviceChargeEnabled,
      serviceChargeRate: data.serviceChargeRate,
      isTaxInclusive: data.isTaxInclusive,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Pengaturan Pajak" description="Kelola konfigurasi pajak dan biaya layanan" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Pengaturan Pajak" description="Kelola konfigurasi pajak dan biaya layanan" />
        <ErrorState
          title="Gagal memuat pengaturan pajak"
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Pengaturan Pajak" description="Kelola konfigurasi pajak dan biaya layanan" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tarif Pajak & Biaya Layanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="taxEnabled"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <label htmlFor="taxEnabled" className="text-sm font-medium">
                        Aktifkan Pajak
                      </label>
                      <Switch id="taxEnabled" checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceChargeEnabled"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <label htmlFor="serviceChargeEnabled" className="text-sm font-medium">
                        Aktifkan Biaya Layanan
                      </label>
                      <Switch
                        id="serviceChargeEnabled"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarif PPN (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          placeholder="Contoh: 11"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceChargeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biaya Layanan (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          placeholder="Contoh: 5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isTaxInclusive"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <label htmlFor="taxInclusive" className="text-sm font-medium">
                        Harga Termasuk Pajak
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Jika aktif, harga produk sudah termasuk pajak (tax-inclusive)
                      </p>
                    </div>
                    <Switch
                      id="taxInclusive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              aria-busy={updateMutation.isPending}
              aria-label={updateMutation.isPending ? 'Menyimpan...' : undefined}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
