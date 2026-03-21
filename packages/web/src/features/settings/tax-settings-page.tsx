import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import type { UpdateTaxConfigRequest, TaxExemptionRule } from '@/types/settings.types';

// Zod schema for tax settings validation
const taxSettingsSchema = z.object({
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

  const [exemptionRules, setExemptionRules] = useState<Omit<TaxExemptionRule, 'id'>[]>([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');

  const form = useForm<TaxSettingsFormData>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: {
      taxRate: 11,
      serviceChargeRate: 0,
      isTaxInclusive: true,
    },
  });

  const { data: taxConfig, isLoading } = useQuery({
    queryKey: ['taxConfig'],
    queryFn: settingsApi.getTaxConfig,
  });

  useEffect(() => {
    if (taxConfig) {
      form.reset({
        taxRate: taxConfig.taxRate ?? 11,
        serviceChargeRate: taxConfig.serviceChargeRate ?? 0,
        isTaxInclusive: taxConfig.isTaxInclusive ?? true,
      });
      setExemptionRules(
        (taxConfig.taxExemptionRules ?? []).map((r) => ({
          name: r.name,
          description: r.description,
          isActive: r.isActive ?? true,
        })),
      );
      // Sync tax settings to UI store for POS usage
      useUIStore.getState().setTaxRate((taxConfig.taxRate ?? 11) / 100);
      useUIStore.getState().setServiceChargeRate((taxConfig.serviceChargeRate ?? 0) / 100);
      useUIStore.getState().setTaxInclusive(taxConfig.isTaxInclusive ?? true);
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
      taxRate: data.taxRate,
      serviceChargeRate: data.serviceChargeRate,
      isTaxInclusive: data.isTaxInclusive,
      taxExemptionRules: exemptionRules,
    });
  };

  const handleAddRule = () => {
    if (!newRuleName.trim()) return;
    setExemptionRules([
      ...exemptionRules,
      { name: newRuleName.trim(), description: newRuleDescription.trim() || null, isActive: true },
    ]);
    setNewRuleName('');
    setNewRuleDescription('');
  };

  const handleRemoveRule = (index: number) => {
    setExemptionRules(exemptionRules.filter((_, i) => i !== index));
  };

  const handleToggleRule = (index: number) => {
    setExemptionRules(
      exemptionRules.map((rule, i) =>
        i === index ? { ...rule, isActive: !rule.isActive } : rule,
      ),
    );
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aturan Pembebasan Pajak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exemptionRules.length > 0 && (
                <div className="space-y-2">
                  {exemptionRules.map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleRule(index)}
                        />
                        <div>
                          <span className="text-sm font-medium">{rule.name}</span>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.isActive ? 'default' : 'outline'}>
                          {rule.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveRule(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Tambah Aturan Baru</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="Nama aturan"
                  />
                  <Input
                    value={newRuleDescription}
                    onChange={(e) => setNewRuleDescription(e.target.value)}
                    placeholder="Deskripsi (opsional)"
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddRule}>
                  <Plus className="mr-2 h-4 w-4" /> Tambah Aturan
                </Button>
              </div>
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
