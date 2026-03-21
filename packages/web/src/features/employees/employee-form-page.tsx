import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { employeesApi } from '@/api/endpoints/employees.api';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { ROLE_OPTIONS } from '@/lib/constants';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { CreateEmployeeRequest, AssignableRole } from '@/types/employee.types';

// Zod schema for employee validation
const getEmployeeSchema = (isEdit: boolean) =>
  z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Format email tidak valid'),
    phone: z.string().optional(),
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
    isActive: z.boolean().optional(),
  });

type EmployeeFormData = z.infer<ReturnType<typeof getEmployeeSchema>>;

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(getEmployeeSchema(isEdit)),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      pin: '',
      role: 'cashier',
      outletId: '',
      hourlyRate: '',
      isActive: true,
    },
  });

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
      form.reset({
        name: employee.name,
        email: employee.email,
        phone: employee.phone ?? '',
        pin: '',
        role: employee.role as AssignableRole,
        outletId: employee.outletId,
        hourlyRate: employee.hourlyRate ? String(employee.hourlyRate) : '',
        isActive: employee.isActive,
      });
    }
  }, [employee, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success({ title: 'Karyawan berhasil ditambahkan' });
      navigate('/app/employees');
    },
    onError: (error) => handleMutationError(error, 'Gagal'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateEmployeeRequest> & { isActive?: boolean }) =>
      employeesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success({ title: 'Karyawan berhasil diperbarui' });
      navigate('/app/employees');
    },
    onError: (error) => handleMutationError(error, 'Gagal'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: EmployeeFormData) => {
    if (isEdit) {
      updateMutation.mutate({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        pin: data.pin || undefined,
        role: data.role,
        outletId: data.outletId,
        hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : undefined,
        isActive: data.isActive,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        pin: data.pin!,
        role: data.role,
        outletId: data.outletId,
        hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : undefined,
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Karyawan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          required
                          autoFocus={!isEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telepon</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        PIN {isEdit && '(kosongkan jika tidak diubah)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          maxLength={6}
                          inputMode="numeric"
                          required={!isEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="outletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outlet</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih outlet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {outlets?.map((outlet) => (
                            <SelectItem key={outlet.id} value={outlet.id}>
                              {outlet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarif per Jam (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        className="max-w-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEdit && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <Switch
                        id="isActive"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <FormLabel htmlFor="isActive" className="!mt-0">Karyawan Aktif</FormLabel>
                    </div>
                  )}
                />
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
      </Form>
    </div>
  );
}
