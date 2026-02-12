import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { customersApi } from '@/api/endpoints/customers.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormFieldError } from '@/components/shared/form-field-error';
import { toast } from '@/lib/toast-utils';
import { formatCurrency } from '@/lib/format';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { Loader2, ArrowLeft, Wallet, Footprints, Trophy } from 'lucide-react';
import type { CreateCustomerRequest, UpdateCustomerRequest } from '@/types/customer.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

// Zod schema for customer validation with Indonesian error messages
const customerSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama pelanggan wajib diisi')
    .min(2, 'Nama pelanggan minimal 2 karakter'),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      { message: 'Format email tidak valid' }
    ),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;
type CustomerFieldErrors = Partial<Record<keyof CustomerFormData, string>>;
type CustomerTouched = Partial<Record<keyof CustomerFormData, boolean>>;

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');

  // Validation states
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});
  const [touched, setTouched] = useState<CustomerTouched>({});

  const { data: customer } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setEmail(customer.email ?? '');
      setPhone(customer.phone ?? '');
      setAddress(customer.address ?? '');
      setDateOfBirth(customer.dateOfBirth ?? '');
      setNotes(customer.notes ?? '');
    }
  }, [customer]);

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerRequest) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success({ title: 'Pelanggan berhasil ditambahkan' });
      navigate('/app/customers');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({ title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCustomerRequest) => customersApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success({ title: 'Pelanggan berhasil diperbarui' });
      navigate('/app/customers');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({ title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Validate a single field
  const validateField = (fieldName: keyof CustomerFormData, value: string) => {
    try {
      customerSchema.shape[fieldName].parse(value);
      setFieldErrors((prev) => ({ ...prev, [fieldName]: undefined }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || 'Nilai tidak valid';
        setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
        return false;
      }
      return true;
    }
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const formData: CustomerFormData = {
      name,
      email,
      phone,
      dateOfBirth,
      address,
      notes,
    };

    const result = customerSchema.safeParse(formData);

    if (!result.success) {
      const errors: CustomerFieldErrors = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          errors[error.path[0] as keyof CustomerFormData] = error.message;
        }
      });
      setFieldErrors(errors);
      // Mark all fields as touched to show errors
      setTouched({
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        address: true,
        notes: true,
      });
      return false;
    }

    setFieldErrors({});
    return true;
  };

  // Handle field blur
  const handleFieldBlur = (fieldName: keyof CustomerFormData, value: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Run full validation before submit
    if (!validateForm()) {
      return;
    }

    const data: CreateCustomerRequest = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      dateOfBirth: dateOfBirth || undefined,
      notes: notes || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>
        <Button variant="outline" onClick={() => navigate('/app/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </PageHeader>

      {isEdit && customer && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Belanja</p>
                <p className="text-xl font-bold">{formatCurrency(customer.totalSpent)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Footprints className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kunjungan</p>
                <p className="text-xl font-bold">{customer.visitCount}</p>
              </div>
            </CardContent>
          </Card>
          <FeatureGate feature={FEATURES.CUSTOMER_LOYALTY}>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Poin Loyalti</p>
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-500">{customer.loyaltyPoints.toLocaleString('id-ID')}</p>
                </div>
              </CardContent>
            </Card>
          </FeatureGate>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pelanggan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Pelanggan</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleFieldBlur('name', name)}
                  aria-invalid={!!fieldErrors.name && touched.name}
                  aria-describedby={fieldErrors.name && touched.name ? 'name-error' : undefined}
                  required
                  autoFocus={!isEdit}
                />
                <FormFieldError error={fieldErrors.name} touched={touched.name ?? false} id="name-error" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleFieldBlur('email', email)}
                  aria-invalid={!!fieldErrors.email && touched.email}
                  aria-describedby={fieldErrors.email && touched.email ? 'email-error' : undefined}
                />
                <FormFieldError error={fieldErrors.email} touched={touched.email ?? false} id="email-error" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => handleFieldBlur('phone', phone)}
                  aria-invalid={!!fieldErrors.phone && touched.phone}
                  aria-describedby={fieldErrors.phone && touched.phone ? 'phone-error' : undefined}
                />
                <FormFieldError error={fieldErrors.phone} touched={touched.phone ?? false} id="phone-error" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Tanggal Lahir</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  onBlur={() => handleFieldBlur('dateOfBirth', dateOfBirth)}
                  aria-invalid={!!fieldErrors.dateOfBirth && touched.dateOfBirth}
                  aria-describedby={fieldErrors.dateOfBirth && touched.dateOfBirth ? 'dateOfBirth-error' : undefined}
                />
                <FormFieldError error={fieldErrors.dateOfBirth} touched={touched.dateOfBirth ?? false} id="dateOfBirth-error" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => handleFieldBlur('address', address)}
                rows={3}
                aria-invalid={!!fieldErrors.address && touched.address}
                aria-describedby={fieldErrors.address && touched.address ? 'address-error' : undefined}
              />
              <FormFieldError error={fieldErrors.address} touched={touched.address ?? false} id="address-error" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => handleFieldBlur('notes', notes)}
                rows={3}
                aria-invalid={!!fieldErrors.notes && touched.notes}
                aria-describedby={fieldErrors.notes && touched.notes ? 'notes-error' : undefined}
              />
              <FormFieldError error={fieldErrors.notes} touched={touched.notes ?? false} id="notes-error" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/app/customers')}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            aria-label={isPending ? (isEdit ? 'Menyimpan perubahan...' : 'Menambah pelanggan...') : undefined}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
