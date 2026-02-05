import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import type { UpdateTaxConfigRequest, TaxExemptionRule } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function TaxSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [taxRate, setTaxRate] = useState(11);
  const [serviceChargeRate, setServiceChargeRate] = useState(0);
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [exemptionRules, setExemptionRules] = useState<Omit<TaxExemptionRule, 'id'>[]>([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');

  const { data: taxConfig, isLoading } = useQuery({
    queryKey: ['taxConfig'],
    queryFn: settingsApi.getTaxConfig,
  });

  useEffect(() => {
    if (taxConfig) {
      setTaxRate(taxConfig.taxRate ?? 11);
      setServiceChargeRate(taxConfig.serviceChargeRate ?? 0);
      setIsTaxInclusive(taxConfig.isTaxInclusive ?? true);
      setExemptionRules(
        (taxConfig.taxExemptionRules ?? []).map((r) => ({
          name: r.name,
          description: r.description,
          isActive: r.isActive ?? true,
        })),
      );
    }
  }, [taxConfig]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTaxConfigRequest) => settingsApi.updateTaxConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxConfig'] });
      toast({ title: 'Pengaturan pajak berhasil disimpan' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      taxRate,
      serviceChargeRate,
      isTaxInclusive,
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tarif Pajak & Biaya Layanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tarif PPN (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="Contoh: 11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceCharge">Biaya Layanan (%)</Label>
                <Input
                  id="serviceCharge"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={serviceChargeRate}
                  onChange={(e) => setServiceChargeRate(parseFloat(e.target.value) || 0)}
                  placeholder="Contoh: 5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="taxInclusive" className="text-sm font-medium">
                  Harga Termasuk Pajak
                </Label>
                <p className="text-sm text-muted-foreground">
                  Jika aktif, harga produk sudah termasuk pajak (tax-inclusive)
                </p>
              </div>
              <Switch
                id="taxInclusive"
                checked={isTaxInclusive}
                onCheckedChange={setIsTaxInclusive}
              />
            </div>
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
    </div>
  );
}
