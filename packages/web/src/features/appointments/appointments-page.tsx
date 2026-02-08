import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/api/endpoints/appointments.api';
import { useUIStore } from '@/stores/ui.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus, User, Phone, X } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Dijadwalkan',
  confirmed: 'Dikonfirmasi',
  in_progress: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  no_show: 'Tidak Hadir',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-green-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-red-500',
  no_show: 'bg-red-300',
};

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

export function AppointmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const outletId = useUIStore((s) => s.selectedOutletId) ?? '';

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', outletId, selectedDate],
    queryFn: () => appointmentsApi.listByDate(outletId, selectedDate),
    enabled: !!outletId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      appointmentsApi.create({
        outletId,
        serviceName,
        servicePrice: parseFloat(servicePrice),
        startTime: new Date(`${selectedDate}T${startTime}`).toISOString(),
        durationMinutes: parseInt(durationMinutes, 10),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({ title: 'Appointment berhasil dibuat' });
      setShowForm(false);
      setServiceName('');
      setServicePrice('');
      setStartTime('');
      setDurationMinutes('60');
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
    },
    onError: () => toast({ variant: 'destructive', title: 'Gagal membuat appointment' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      status === 'cancelled' ? appointmentsApi.cancel(id) : appointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({ title: 'Status berhasil diperbarui' });
    },
  });

  if (!outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointments" />
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            Pilih outlet terlebih dahulu di pengaturan
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Kelola jadwal layanan dan booking pelanggan"
      >
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Buat Appointment
        </Button>
      </PageHeader>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-48"
        />
        <Badge variant="secondary">{appointments?.length ?? 0} appointment</Badge>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buat Appointment Baru</CardTitle>
            <CardDescription>Jadwalkan layanan untuk tanggal {selectedDate}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Layanan</Label>
                <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Potong Rambut" />
              </div>
              <div>
                <Label>Harga Layanan</Label>
                <Input type="number" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="50000" />
              </div>
              <div>
                <Label>Jam Mulai</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>Durasi (menit)</Label>
                <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="60" />
              </div>
              <div>
                <Label>Nama Pelanggan</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Opsional" />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08xxx" />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan..." />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!serviceName || !servicePrice || !startTime || createMutation.isPending}
              >
                <Plus className="mr-1 h-4 w-4" /> Simpan
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointments list */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : (appointments ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Tidak ada appointment untuk tanggal ini</p>
          ) : (
            <div className="space-y-3">
              {(appointments ?? []).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold">{formatTime(apt.startTime)}</p>
                      <p className="text-xs text-muted-foreground">{apt.durationMinutes}min</p>
                    </div>
                    <div className={`h-12 w-1 rounded-full ${STATUS_COLORS[apt.status] ?? 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium">{apt.serviceName}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(apt.servicePrice)}</p>
                      {(apt.customerName ?? apt.customer?.name) && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" /> {apt.customerName ?? apt.customer?.name}
                          {(apt.customerPhone ?? apt.customer?.phone) && (
                            <><Phone className="h-3 w-3 ml-1" /> {apt.customerPhone ?? apt.customer?.phone}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[apt.status]}>{STATUS_LABELS[apt.status]}</Badge>
                    {apt.status === 'scheduled' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: apt.id, status: 'confirmed' })}>
                        Konfirmasi
                      </Button>
                    )}
                    {apt.status === 'confirmed' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: apt.id, status: 'in_progress' })}>
                        <Clock className="mr-1 h-3 w-3" /> Mulai
                      </Button>
                    )}
                    {apt.status === 'in_progress' && (
                      <Button size="sm" onClick={() => statusMutation.mutate({ id: apt.id, status: 'completed' })}>
                        Selesai
                      </Button>
                    )}
                    {['scheduled', 'confirmed'].includes(apt.status) && (
                      <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: apt.id, status: 'cancelled' })}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
