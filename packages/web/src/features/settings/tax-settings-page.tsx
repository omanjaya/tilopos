import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FormFieldError } from '@/components/shared/form-field-error';
import { toast } from '@/lib/toast-utils';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import type { UpdateTaxConfigRequest, TaxExemptionRule } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

// Zod schema for tax settings validation
const taxSettingsSchema = z.object({
  taxRate: z.number().min(0, 'Tarif pajak tidak boleh negatif').max(100, 'Tarif pajak maksimal 100%'),
  serviceChargeRate: z
    .number()
    .min(0, 'Tarif biaya layanan tidak boleh negatif')
    .max(100, 'Tarif biaya layanan maksimal 100%'),
});

type TaxSettingsFormData = z.infer<typeof taxSettingsSchema>;

export function TaxSettingsPage() {
  const queryClient = useQueryClient();

  const [taxRate, setTaxRate] = useState(11);
  const [serviceChargeRate, setServiceChargeRate] = useState(0);
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [exemptionRules, setExemptionRules] = useState<Omit<TaxExemptionRule, 'id'>[]>([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');

  // Form validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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

  // Validate a single field
  const validateField = (fieldName: keyof TaxSettingsFormData, value: number) => {
    try {
      // Create a partial schema for single field validation
      const fieldSchema = taxSettingsSchema.shape[fieldName];
      const result = fieldSchema.safeParse(value);

      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message || 'Nilai tidak valid';
        setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
      } else {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    } catch {
      // If validation fails, clear the error
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Handle field blur - mark as touched and validate
  const handleFieldBlur = (fieldName: keyof TaxSettingsFormData, value: number) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
  };

  // Validate all fields on submit
  const validateForm = (): boolean => {
    const formData: TaxSettingsFormData = { taxRate, serviceChargeRate };
    const result = taxSettingsSchema.safeParse(formData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          errors[error.path[0] as string] = error.message;
        }
      });
      setFieldErrors(errors);

      // Mark all fields with errors as touched
      const touchedFields: Record<string, boolean> = {};
      Object.keys(errors).forEach((key) => {
        touchedFields[key] = true;
      });
      setTouched((prev) => ({ ...prev, ...touchedFields }));

      return false;
    }

    setFieldErrors({});
    return true;
  };

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTaxConfigRequest) => settingsApi.updateTaxConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxConfig'] });
      toast.success({ title: 'Pengaturan pajak berhasil disimpan' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menyimpan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submit
    if (!validateForm()) {
      return;
    }

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
                  onBlur={() => handleFieldBlur('taxRate', taxRate)}
                  placeholder="Contoh: 11"
                  aria-invalid={!!fieldErrors.taxRate && touched.taxRate}
                  aria-describedby={fieldErrors.taxRate && touched.taxRate ? 'taxRate-error' : undefined}
                />
                <FormFieldError error={fieldErrors.taxRate} touched={touched.taxRate} id="taxRate-error" />
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
                  onBlur={() => handleFieldBlur('serviceChargeRate', serviceChargeRate)}
                  placeholder="Contoh: 5"
                  aria-invalid={!!fieldErrors.serviceChargeRate && touched.serviceChargeRate}
                  aria-describedby={
                    fieldErrors.serviceChargeRate && touched.serviceChargeRate
                      ? 'serviceChargeRate-error'
                      : undefined
                  }
                />
                <FormFieldError
                  error={fieldErrors.serviceChargeRate}
                  touched={touched.serviceChargeRate}
                  id="serviceChargeRate-error"
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
