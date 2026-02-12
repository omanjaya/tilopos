import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import type { ReportSchedule, ReportType, ReportFrequency } from '@/types/settings.types';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast-utils';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CalendarClock,
  Mail,
  BarChart3,
  Package,
  DollarSign,
} from 'lucide-react';
import { AxiosError } from 'axios';

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: typeof BarChart3; color: string }> = {
  sales: { label: 'Penjualan', icon: BarChart3, color: 'bg-success/10 text-success' },
  financial: { label: 'Keuangan', icon: DollarSign, color: 'bg-info/10 text-info' },
  inventory: { label: 'Inventori', icon: Package, color: 'bg-warning/10 text-warning' },
};

const FREQUENCY_CONFIG: Record<ReportFrequency, string> = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ScheduleForm {
  reportType: ReportType;
  frequency: ReportFrequency;
  recipients: string;
  isActive: boolean;
}

const EMPTY_FORM: ScheduleForm = {
  reportType: 'sales',
  frequency: 'weekly',
  recipients: '',
  isActive: true,
};

export function ReportSchedulePage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<ReportSchedule | null>(null);

  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: settingsApi.getBusiness,
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['report-schedules'],
    queryFn: settingsApi.listReportSchedules,
  });

  const createMutation = useMutation({
    mutationFn: (data: { reportType: ReportType; frequency: ReportFrequency; recipients: string[]; isActive: boolean }) =>
      settingsApi.createReportSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success({ title: 'Jadwal ditambahkan' });
      closeForm();
    },
    onError: (err) => {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Gagal menambahkan jadwal';
      toast.error({ title: 'Gagal', description: String(msg) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reportType: ReportType; frequency: ReportFrequency; recipients: string[]; isActive: boolean } }) =>
      settingsApi.updateReportSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success({ title: 'Jadwal diperbarui' });
      closeForm();
    },
    onError: (err) => {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Gagal memperbarui jadwal';
      toast.error({ title: 'Gagal', description: String(msg) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteReportSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success({ title: 'Jadwal dihapus' });
      setDeleteConfirm(null);
    },
    onError: (err) => {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Gagal menghapus jadwal';
      toast.error({ title: 'Gagal', description: String(msg) });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      settingsApi.updateReportSchedule(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
    },
  });

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, recipients: business?.email ?? '' });
    setFormOpen(true);
  }

  function openEdit(schedule: ReportSchedule) {
    setEditingId(schedule.id);
    setForm({
      reportType: schedule.reportType,
      frequency: schedule.frequency,
      recipients: schedule.recipients.join(', '),
      isActive: schedule.isActive,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    const recipients = form.recipients
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    if (!recipients.length) {
      toast.error({ title: 'Masukkan minimal 1 email penerima' });
      return;
    }

    const invalidEmails = recipients.filter((e) => !EMAIL_REGEX.test(e));
    if (invalidEmails.length > 0) {
      toast.error({ title: 'Format email tidak valid', description: invalidEmails.join(', ') });
      return;
    }

    const payload = {
      reportType: form.reportType,
      frequency: form.frequency,
      recipients,
      isActive: form.isActive,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader title="Jadwal Laporan" description="Atur pengiriman laporan otomatis ke email">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Jadwal
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !schedules?.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">Belum ada jadwal laporan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Jadwalkan laporan otomatis untuk dikirim ke email Anda.
          </p>
          <Button onClick={openCreate} className="mt-4" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Tambah Jadwal
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => {
            const typeConfig = REPORT_TYPE_CONFIG[schedule.reportType];
            const Icon = typeConfig.icon;
            return (
              <div
                key={schedule.id}
                className={`rounded-lg border p-4 ${!schedule.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-md p-1.5 ${typeConfig.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-medium">Laporan {typeConfig.label}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {FREQUENCY_CONFIG[schedule.frequency]}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={schedule.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: schedule.id, isActive: checked })}
                    aria-label={`Toggle jadwal ${typeConfig.label}`}
                  />
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{schedule.recipients.join(', ')}</span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(schedule)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteConfirm(schedule)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Jadwal' : 'Tambah Jadwal Laporan'}</DialogTitle>
            <DialogDescription>
              Laporan akan dikirim otomatis ke email sesuai jadwal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe Laporan</Label>
              <Select
                value={form.reportType}
                onValueChange={(v) => setForm({ ...form, reportType: v as ReportType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frekuensi</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v as ReportFrequency })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_CONFIG).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Penerima Email</Label>
              <Input
                value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Pisahkan dengan koma untuk beberapa penerima.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Batal</Button>
            <Button onClick={handleSubmit} disabled={!form.recipients.trim() || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Jadwal</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus jadwal laporan{' '}
              {deleteConfirm && REPORT_TYPE_CONFIG[deleteConfirm.reportType].label}{' '}
              ({deleteConfirm && FREQUENCY_CONFIG[deleteConfirm.frequency]})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
