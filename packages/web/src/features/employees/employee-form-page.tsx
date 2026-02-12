import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { employeesApi } from '@/api/endpoints/employees.api';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormFieldError } from '@/components/shared/form-field-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast-utils';
import { ROLE_OPTIONS } from '@/lib/constants';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { CreateEmployeeRequest } from '@/types/employee.types';
import type { EmployeeRole } from '@/types/auth.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

// Zod schema for employee validation
const getEmployeeSchema = (isEdit: boolean) =>
  z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Format email tidak valid'),
    pin: isEdit
      ? z.string().optional()
      : z
          .string()
          .min(1, 'PIN wajib diisi')
          .regex(/^\d{6}$/, 'PIN harus 6 digit angka'),
    role: z.enum(['owner', 'manager', 'supervisor', 'cashier', 'kitchen', 'inventory'] as const, {
      errorMap: () => ({ message: 'Role wajib dipilih' }),
    }),
    outletId: z.string().min(1, 'Outlet wajib dipilih'),
    hourlyRate: z
      .union([z.string(), z.number()])
      .optional()
      .refine((val) => {
        if (val === undefined || val === '') return true;
        const numVal = typeof val === 'string' ? Number(val) : val;
        return numVal >= 0;
      }, {
        message: 'Tarif per jam tidak boleh negatif',
      })
      .optional(),
  });

type EmployeeFormData = z.infer<ReturnType<typeof getEmployeeSchema>>;

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<EmployeeRole>('cashier');
  const [outletId, setOutletId] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: settingsApi.getOutlets,
  });

  const { data: employee } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email);
      setPhone(employee.phone ?? '');
      setRole(employee.role);
      setOutletId(employee.outletId);
      setHourlyRate(employee.hourlyRate ? String(employee.hourlyRate) : '');
      setIsActive(employee.isActive);
    }
  }, [employee]);

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success({ title: 'Karyawan berhasil ditambahkan' });
      navigate('/app/employees');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({ title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateEmployeeRequest> & { isActive?: boolean }) =>
      employeesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success({ title: 'Karyawan berhasil diperbarui' });
      navigate('/app/employees');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({ title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Validate a single field
  const validateField = (fieldName: keyof EmployeeFormData, value: unknown) => {
    const schema = getEmployeeSchema(isEdit);
    try {
      schema.shape[fieldName].parse(value);
      setFieldErrors((prev) => ({ ...prev, [fieldName]: '' }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || 'Input tidak valid';
        setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
        return false;
      }
      return true;
    }
  };

  // Handle blur event for field validation
  const handleBlur = (fieldName: keyof EmployeeFormData, value: unknown) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
  };

  // Validate all fields
  const validateAll = (): boolean => {
    const schema = getEmployeeSchema(isEdit);
    const formData = {
      name,
      email,
      pin: isEdit ? (pin || undefined) : pin,
      role,
      outletId,
      hourlyRate: hourlyRate || undefined,
    };

    try {
      schema.parse(formData);
      setFieldErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFieldErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      pin: true,
      role: true,
      outletId: true,
      hourlyRate: true,
    });

    // Validate all fields
    if (!validateAll()) {
      return;
    }

    if (isEdit) {
      updateMutation.mutate({
        name,
        email,
        phone: phone || undefined,
        pin: pin || undefined,
        role,
        outletId,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        isActive,
      });
    } else {
      createMutation.mutate({
        name,
        email,
        phone: phone || undefined,
        pin,
        role,
        outletId,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      });
    }
  };

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}>
        <Button variant="outline" onClick={() => navigate('/app/employees')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Karyawan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name', name)}
                  aria-invalid={!!fieldErrors.name && touched.name ? 'true' : 'false'}
                  aria-describedby={fieldErrors.name && touched.name ? 'name-error' : undefined}
                  required
                  autoFocus={!isEdit}
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
                  onBlur={() => handleBlur('email', email)}
                  aria-invalid={!!fieldErrors.email && touched.email ? 'true' : 'false'}
                  aria-describedby={fieldErrors.email && touched.email ? 'email-error' : undefined}
                  required
                />
                <FormFieldError error={fieldErrors.email} touched={touched.email} id="email-error" />
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">
                  PIN {isEdit && '(kosongkan jika tidak diubah)'}
                </Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onBlur={() => handleBlur('pin', isEdit ? (pin || undefined) : pin)}
                  maxLength={6}
                  inputMode="numeric"
                  required={!isEdit}
                  aria-invalid={!!fieldErrors.pin && touched.pin ? 'true' : 'false'}
                  aria-describedby={fieldErrors.pin && touched.pin ? 'pin-error' : undefined}
                />
                <FormFieldError error={fieldErrors.pin} touched={touched.pin} id="pin-error" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    setRole(v as EmployeeRole);
                    handleBlur('role', v);
                  }}
                >
                  <SelectTrigger
                    aria-invalid={!!fieldErrors.role && touched.role ? 'true' : 'false'}
                    aria-describedby={fieldErrors.role && touched.role ? 'role-error' : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormFieldError error={fieldErrors.role} touched={touched.role} id="role-error" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outlet">Outlet</Label>
                <Select
                  value={outletId}
                  onValueChange={(v) => {
                    setOutletId(v);
                    handleBlur('outletId', v);
                  }}
                >
                  <SelectTrigger
                    aria-invalid={!!fieldErrors.outletId && touched.outletId ? 'true' : 'false'}
                    aria-describedby={fieldErrors.outletId && touched.outletId ? 'outletId-error' : undefined}
                  >
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets?.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormFieldError error={fieldErrors.outletId} touched={touched.outletId} id="outletId-error" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Tarif per Jam (Rp)</Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                onBlur={() => handleBlur('hourlyRate', hourlyRate)}
                className="max-w-xs"
                aria-invalid={!!fieldErrors.hourlyRate && touched.hourlyRate ? 'true' : 'false'}
                aria-describedby={fieldErrors.hourlyRate && touched.hourlyRate ? 'hourlyRate-error' : undefined}
              />
              <FormFieldError error={fieldErrors.hourlyRate} touched={touched.hourlyRate} id="hourlyRate-error" />
            </div>

            {isEdit && (
              <div className="flex items-center gap-3">
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="isActive">Karyawan Aktif</Label>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/app/employees')}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            aria-label={isPending ? (isEdit ? 'Saving changes...' : 'Adding employee...') : undefined}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Karyawan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
