import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/api/endpoints/customers.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { Loader2, ArrowLeft, Wallet, Footprints, Trophy } from 'lucide-react';
import type { CreateCustomerRequest, UpdateCustomerRequest } from '@/types/customer.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');

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
      toast({ title: 'Pelanggan berhasil ditambahkan' });
      navigate('/app/customers');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({ variant: 'destructive', title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCustomerRequest) => customersApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Pelanggan berhasil diperbarui' });
      navigate('/app/customers');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({ variant: 'destructive', title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Tanggal Lahir</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
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
            aria-label={isPending ? (isEdit ? 'Saving changes...' : 'Adding customer...') : undefined}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
