import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/api/endpoints/employees.api';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ROLE_OPTIONS } from '@/lib/constants';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { CreateEmployeeRequest } from '@/types/employee.types';
import type { EmployeeRole } from '@/types/auth.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<EmployeeRole>('cashier');
  const [outletId, setOutletId] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isActive, setIsActive] = useState(true);

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
      toast({ title: 'Karyawan berhasil ditambahkan' });
      navigate('/app/employees');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({ variant: 'destructive', title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateEmployeeRequest> & { isActive?: boolean }) =>
      employeesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Karyawan berhasil diperbarui' });
      navigate('/app/employees');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({ variant: 'destructive', title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN {isEdit && '(kosongkan jika tidak diubah)'}</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                  required={!isEdit}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as EmployeeRole)}>
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="outlet">Outlet</Label>
                <Select value={outletId} onValueChange={setOutletId}>
                  <SelectTrigger>
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
                className="max-w-xs"
              />
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
