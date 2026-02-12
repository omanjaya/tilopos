import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineHelpCard, HelpSidebar } from '@/components/shared/help-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FormFieldError } from '@/components/shared/form-field-error';
import { toast } from '@/lib/toast-utils';
import { Loader2, Save } from 'lucide-react';
import type { UpdateBusinessRequest } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

// Zod schema for business settings validation
const businessSettingsSchema = z.object({
  name: z.string().min(2, 'Nama bisnis minimal harus 2 karakter'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type BusinessSettingsFormData = z.infer<typeof businessSettingsSchema>;

export function BusinessSettingsPage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Form validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: business, isLoading } = useQuery({
    queryKey: ['business'],
    queryFn: settingsApi.getBusiness,
  });

  useEffect(() => {
    if (business) {
      setName(business.name ?? '');
      setEmail(business.email ?? '');
      setPhone(business.phone ?? '');
      setAddress(business.address ?? '');
    }
  }, [business]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBusinessRequest) => settingsApi.updateBusiness(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success({ title: 'Pengaturan bisnis berhasil disimpan' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menyimpan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  // Validate a single field
  const validateField = (fieldName: keyof BusinessSettingsFormData, value: string) => {
    try {
      // Create a partial schema for single field validation
      const fieldSchema = businessSettingsSchema.shape[fieldName];
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
  const handleFieldBlur = (fieldName: keyof BusinessSettingsFormData, value: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
  };

  // Validate all fields on submit
  const validateForm = (): boolean => {
    const formData: BusinessSettingsFormData = { name, email, phone, address };
    const result = businessSettingsSchema.safeParse(formData);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submit
    if (!validateForm()) {
      return;
    }

    updateMutation.mutate({ name, email, phone, address });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Pengaturan Bisnis" description="Kelola informasi bisnis Anda">
          <HelpSidebar page="settings" />
        </PageHeader>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Pengaturan Bisnis" description="Kelola informasi bisnis Anda">
        <HelpSidebar page="settings" />
      </PageHeader>

      <InlineHelpCard page="settings" className="mb-4" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Bisnis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Bisnis</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleFieldBlur('name', name)}
                placeholder="Masukkan nama bisnis"
                aria-invalid={!!fieldErrors.name && touched.name}
                aria-describedby={fieldErrors.name && touched.name ? 'name-error' : undefined}
              />
              <FormFieldError error={fieldErrors.name} touched={touched.name} id="name-error" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleFieldBlur('email', email)}
                placeholder="Masukkan email bisnis"
                aria-invalid={!!fieldErrors.email && touched.email}
                aria-describedby={fieldErrors.email && touched.email ? 'email-error' : undefined}
              />
              <FormFieldError error={fieldErrors.email} touched={touched.email} id="email-error" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => handleFieldBlur('phone', phone)}
                placeholder="Masukkan nomor telepon"
                aria-invalid={!!fieldErrors.phone && touched.phone}
                aria-describedby={fieldErrors.phone && touched.phone ? 'phone-error' : undefined}
              />
              <FormFieldError error={fieldErrors.phone} touched={touched.phone} id="phone-error" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => handleFieldBlur('address', address)}
                placeholder="Masukkan alamat bisnis"
                rows={3}
                aria-invalid={!!fieldErrors.address && touched.address}
                aria-describedby={fieldErrors.address && touched.address ? 'address-error' : undefined}
              />
              <FormFieldError error={fieldErrors.address} touched={touched.address} id="address-error" />
            </div>

            <div className="flex justify-end pt-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
