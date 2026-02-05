import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/api/endpoints/customers.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { Plus, MoreHorizontal, Eye, Trash2, Loader2, X } from 'lucide-react';
import type { CustomerSegment, SegmentCriteria, Customer } from '@/types/customer.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

type CriteriaField = 'minSpend' | 'maxSpend' | 'minVisits' | 'maxVisits' | 'loyaltyTier' | 'daysSinceLastVisit' | 'maxDaysSinceLastVisit';

interface CriteriaRule {
  field: CriteriaField;
  value: string;
}

const SEGMENT_TYPE_LABELS: Record<string, string> = {
  new: 'Pelanggan Baru',
  regular: 'Reguler',
  vip: 'VIP',
  at_risk: 'Berisiko',
  churned: 'Churned',
  custom: 'Kustom',
};

function formatCriteriaDisplay(criteria: SegmentCriteria | null): string {
  if (!criteria) return '-';
  const parts: string[] = [];
  if (criteria.minSpend !== undefined) parts.push(`Belanja >= ${formatCurrency(criteria.minSpend)}`);
  if (criteria.maxSpend !== undefined) parts.push(`Belanja <= ${formatCurrency(criteria.maxSpend)}`);
  if (criteria.minVisits !== undefined) parts.push(`Kunjungan >= ${criteria.minVisits}`);
  if (criteria.maxVisits !== undefined) parts.push(`Kunjungan <= ${criteria.maxVisits}`);
  if (criteria.loyaltyTier) parts.push(`Tier: ${criteria.loyaltyTier}`);
  if (criteria.daysSinceLastVisit !== undefined) parts.push(`>= ${criteria.daysSinceLastVisit} hari`);
  if (criteria.maxDaysSinceLastVisit !== undefined) parts.push(`<= ${criteria.maxDaysSinceLastVisit} hari`);
  return parts.length > 0 ? parts.join(', ') : '-';
}

function rulesToCriteria(rules: CriteriaRule[]): SegmentCriteria {
  const criteria: SegmentCriteria = {};
  for (const rule of rules) {
    if (rule.field === 'loyaltyTier') {
      criteria.loyaltyTier = rule.value;
    } else {
      const num = parseFloat(rule.value);
      if (!isNaN(num)) {
        criteria[rule.field] = num;
      }
    }
  }
  return criteria;
}

export function CustomerSegmentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<CustomerSegment | null>(null);
  const [viewTarget, setViewTarget] = useState<CustomerSegment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create form state
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [rules, setRules] = useState<CriteriaRule[]>([{ field: 'minSpend', value: '' }]);

  const { data: segments, isLoading } = useQuery({
    queryKey: ['customerSegments'],
    queryFn: () => customersApi.listSegments(),
  });

  const { data: segmentCustomers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['segmentCustomers', viewTarget?.id],
    queryFn: () => (viewTarget ? customersApi.getSegmentCustomers(viewTarget.id) : Promise.resolve([])),
    enabled: !!viewTarget,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      customersApi.createSegment({
        name: segmentName,
        description: segmentDescription,
        criteria: rulesToCriteria(rules),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerSegments'] });
      toast({ title: 'Segmen berhasil dibuat' });
      resetCreateForm();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal membuat segmen',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.deleteSegment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerSegments'] });
      toast({ title: 'Segmen berhasil dihapus' });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus segmen',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const resetCreateForm = () => {
    setIsCreateOpen(false);
    setSegmentName('');
    setSegmentDescription('');
    setRules([{ field: 'minSpend', value: '' }]);
  };

  const handleAddRule = () => {
    setRules([...rules, { field: 'minSpend', value: '' }]);
  };

  const handleRemoveRule = (index: number) => {
    if (rules.length <= 1) return;
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, field: keyof CriteriaRule, value: string) => {
    setRules(rules.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule)));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segmentName.trim()) {
      toast({ variant: 'destructive', title: 'Nama segmen wajib diisi' });
      return;
    }
    const validRules = rules.filter((r) => r.value.trim() !== '');
    if (validRules.length === 0) {
      toast({ variant: 'destructive', title: 'Minimal satu kriteria harus diisi' });
      return;
    }
    createMutation.mutate();
  };

  const columns: Column<CustomerSegment>[] = [
    {
      key: 'name',
      header: 'Nama Segmen',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'type',
      header: 'Tipe',
      cell: (row) => (
        <Badge variant="secondary">
          {SEGMENT_TYPE_LABELS[row.type] || row.type}
        </Badge>
      ),
    },
    {
      key: 'criteria',
      header: 'Kriteria',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatCriteriaDisplay(row.criteria)}
        </span>
      ),
    },
    {
      key: 'customerCount',
      header: 'Jumlah Pelanggan',
      cell: (row) => row.customerCount.toLocaleString('id-ID'),
    },
    {
      key: 'createdAt',
      header: 'Dibuat',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi segmen">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewTarget(row)}>
              <Eye className="mr-2 h-4 w-4" /> Lihat Pelanggan
            </DropdownMenuItem>
            {row.type === 'custom' && (
              <DropdownMenuItem
                onClick={() => setDeleteTarget(row)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const customerColumns: Column<Customer>[] = [
    { key: 'name', header: 'Nama', cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'email', header: 'Email', cell: (row) => <span className="text-muted-foreground">{row.email ?? '-'}</span> },
    { key: 'phone', header: 'Telepon', cell: (row) => <span className="text-muted-foreground">{row.phone ?? '-'}</span> },
    { key: 'totalSpent', header: 'Total Belanja', cell: (row) => formatCurrency(row.totalSpent) },
    { key: 'visitCount', header: 'Kunjungan', cell: (row) => row.visitCount },
  ];

  return (
    <div>
      <PageHeader title="Segmen Pelanggan" description="Kelola segmentasi pelanggan Anda">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Buat Segmen
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={segments ?? []}
        isLoading={isLoading}
        emptyTitle="Belum ada segmen"
        emptyDescription="Buat segmen pertama Anda untuk mengelompokkan pelanggan."
      />

      {/* Create Segment Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Segmen Baru</DialogTitle>
            <DialogDescription>
              Tentukan kriteria untuk mengelompokkan pelanggan secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="segmentName">Nama Segmen</Label>
              <Input
                id="segmentName"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                placeholder="Contoh: Pelanggan VIP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segmentDescription">Deskripsi</Label>
              <Input
                id="segmentDescription"
                value={segmentDescription}
                onChange={(e) => setSegmentDescription(e.target.value)}
                placeholder="Deskripsi singkat segmen"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Kriteria</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddRule}>
                  <Plus className="mr-1 h-3 w-3" /> Tambah
                </Button>
              </div>

              {rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={rule.field}
                    onValueChange={(v) => handleRuleChange(index, 'field', v)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minSpend">Min. Belanja (Rp)</SelectItem>
                      <SelectItem value="maxSpend">Maks. Belanja (Rp)</SelectItem>
                      <SelectItem value="minVisits">Min. Kunjungan</SelectItem>
                      <SelectItem value="maxVisits">Maks. Kunjungan</SelectItem>
                      <SelectItem value="loyaltyTier">Tier Loyalty</SelectItem>
                      <SelectItem value="daysSinceLastVisit">Min Hari Sejak Kunjungan</SelectItem>
                      <SelectItem value="maxDaysSinceLastVisit">Max Hari Sejak Kunjungan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type={rule.field === 'loyaltyTier' ? 'text' : 'number'}
                    value={rule.value}
                    onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
                    placeholder={rule.field === 'loyaltyTier' ? 'gold, silver...' : '0'}
                    className="flex-1"
                  />
                  {rules.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => handleRemoveRule(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetCreateForm}>
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat Segmen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Segment Customers Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => { if (!open) setViewTarget(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pelanggan di Segmen "{viewTarget?.name}"</DialogTitle>
            <DialogDescription>
              {viewTarget && (
                <>
                  {viewTarget.description && `${viewTarget.description} - `}
                  {viewTarget.customerCount} pelanggan
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingCustomers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : segmentCustomers && segmentCustomers.length > 0 ? (
            <div className="max-h-[400px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {customerColumns.map((col) => (
                      <TableHead key={col.key}>{col.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segmentCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      {customerColumns.map((col) => (
                        <TableCell key={col.key}>{col.cell(customer)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada pelanggan yang memenuhi kriteria segmen ini.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Segmen"
        description={`Apakah Anda yakin ingin menghapus segmen "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
