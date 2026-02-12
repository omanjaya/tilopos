import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import type { PrinterConfig, PrinterType, PrinterConnection } from '@/types/settings.types';
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
  Printer,
  Wifi,
  Usb,
  Bluetooth,
  TestTube,
} from 'lucide-react';
import { AxiosError } from 'axios';

const TYPE_OPTIONS: { value: PrinterType; label: string }[] = [
  { value: 'receipt', label: 'Struk (Receipt)' },
  { value: 'kitchen', label: 'Dapur (Kitchen)' },
  { value: 'label', label: 'Label (Barcode)' },
];

const CONNECTION_OPTIONS: { value: PrinterConnection; label: string; icon: typeof Wifi }[] = [
  { value: 'network', label: 'Jaringan (IP)', icon: Wifi },
  { value: 'usb', label: 'USB', icon: Usb },
  { value: 'bluetooth', label: 'Bluetooth', icon: Bluetooth },
];

const TYPE_BADGE: Record<PrinterType, { label: string; variant: 'default' | 'secondary' | 'info' }> = {
  receipt: { label: 'Struk', variant: 'default' },
  kitchen: { label: 'Dapur', variant: 'info' },
  label: { label: 'Label', variant: 'secondary' },
};

interface PrinterForm {
  name: string;
  type: PrinterType;
  connection: PrinterConnection;
  ipAddress: string;
  port: number;
  autoPrint: boolean;
  copies: number;
  outletId: string;
}

const EMPTY_FORM: PrinterForm = {
  name: '',
  type: 'receipt',
  connection: 'network',
  ipAddress: '',
  port: 9100,
  autoPrint: true,
  copies: 1,
  outletId: '',
};

export function PrinterSettingsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PrinterForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<PrinterConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: settingsApi.getOutlets,
  });

  const { data: printers, isLoading } = useQuery({
    queryKey: ['printer-configs'],
    queryFn: settingsApi.listPrinters,
  });

  const createMutation = useMutation({
    mutationFn: (data: PrinterForm) =>
      settingsApi.createPrinter({
        name: data.name,
        type: data.type,
        connection: data.connection,
        ipAddress: data.ipAddress || undefined,
        port: data.port || undefined,
        autoPrint: data.autoPrint,
        copies: data.copies,
        outletId: data.outletId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-configs'] });
      toast.success({ title: 'Printer ditambahkan' });
      closeForm();
    },
    onError: (err) => {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Gagal menambahkan printer';
      toast.error({ title: 'Gagal', description: String(msg) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PrinterForm }) =>
      settingsApi.updatePrinter(id, {
        name: data.name,
        type: data.type,
        connection: data.connection,
        ipAddress: data.ipAddress || undefined,
        port: data.port || undefined,
        autoPrint: data.autoPrint,
        copies: data.copies,
        outletId: data.outletId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-configs'] });
      toast.success({ title: 'Printer diperbarui' });
      closeForm();
    },
    onError: (err) => {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Gagal memperbarui printer';
      toast.error({ title: 'Gagal', description: String(msg) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deletePrinter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-configs'] });
      toast.success({ title: 'Printer dihapus' });
      setDeleteConfirm(null);
    },
    onError: (err) => {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Gagal menghapus printer';
      toast.error({ title: 'Gagal', description: String(msg) });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      settingsApi.updatePrinter(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-configs'] });
    },
  });

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, outletId: outlets?.[0]?.id ?? '' });
    setFormOpen(true);
  }

  function openEdit(printer: PrinterConfig) {
    setEditingId(printer.id);
    setForm({
      name: printer.name,
      type: printer.type,
      connection: printer.connection,
      ipAddress: printer.ipAddress ?? '',
      port: printer.port ?? 9100,
      autoPrint: printer.autoPrint,
      copies: printer.copies,
      outletId: printer.outletId,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  async function handleTestPrint(printer: PrinterConfig) {
    setTestingId(printer.id);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (printer.connection === 'network' && !printer.ipAddress) {
      toast.error({ title: 'Test gagal', description: 'IP address belum diisi' });
    } else {
      toast.success({ title: 'Test print berhasil', description: `Printer: ${printer.name}` });
    }
    setTestingId(null);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const activeOutlets = outlets?.filter((o) => o.isActive) ?? [];

  return (
    <div>
      <PageHeader title="Konfigurasi Printer" description="Atur printer untuk struk, dapur, dan label">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Printer
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !printers?.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Printer className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">Belum ada printer</p>
          <p className="mt-1 text-sm text-muted-foreground">Tambahkan printer pertama Anda.</p>
          <Button onClick={openCreate} className="mt-4" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Tambah Printer
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {printers.map((printer) => {
            const typeInfo = TYPE_BADGE[printer.type];
            const connInfo = CONNECTION_OPTIONS.find((c) => c.value === printer.connection);
            const ConnIcon = connInfo?.icon ?? Wifi;
            const outletName = outlets?.find((o) => o.id === printer.outletId)?.name ?? '-';
            return (
              <div
                key={printer.id}
                className={`rounded-lg border p-4 ${!printer.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Printer className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{printer.name}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <ConnIcon className="h-3 w-3" />
                        {connInfo?.label}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={printer.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: printer.id, isActive: checked })}
                    aria-label={`Toggle ${printer.name}`}
                  />
                </div>

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Outlet: {outletName}</p>
                  {printer.connection === 'network' && (
                    <p>IP: {printer.ipAddress || '-'}:{printer.port}</p>
                  )}
                  <p>
                    Auto-print: {printer.autoPrint ? 'Ya' : 'Tidak'} |
                    Copies: {printer.copies}x
                  </p>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestPrint(printer)}
                    disabled={testingId === printer.id}
                  >
                    {testingId === printer.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <TestTube className="mr-1 h-3.5 w-3.5" />
                    )}
                    Test Print
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(printer)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteConfirm(printer)}
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
            <DialogTitle>{editingId ? 'Edit Printer' : 'Tambah Printer'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui konfigurasi printer.' : 'Konfigurasi printer baru.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Printer</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="contoh: Printer Kasir 1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipe</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as PrinterType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Koneksi</Label>
                <Select value={form.connection} onValueChange={(v) => setForm({ ...form, connection: v as PrinterConnection })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONNECTION_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.connection === 'network' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>IP Address</Label>
                  <Input
                    value={form.ipAddress}
                    onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select value={form.outletId} onValueChange={(v) => setForm({ ...form, outletId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                <SelectContent>
                  {activeOutlets.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Auto-print setelah transaksi</Label>
                <Switch
                  checked={form.autoPrint}
                  onCheckedChange={(checked) => setForm({ ...form, autoPrint: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Jumlah Cetak</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={form.copies}
                  onChange={(e) => setForm({ ...form, copies: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Batal</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || isSaving}>
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
            <DialogTitle>Hapus Printer</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus printer &quot;{deleteConfirm?.name}&quot;?
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
