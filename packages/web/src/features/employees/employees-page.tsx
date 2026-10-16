import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/api/endpoints/employees.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { InlineHelpCard, HelpSidebar } from '@/components/shared/help-sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS, ROLE_OPTIONS } from '@/lib/constants';
import { canManageRole } from '@/config/permissions';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { Plus, MoreHorizontal, Pencil, Trash2, RotateCcw } from 'lucide-react';
import type { Employee } from '@/types/employee.types';
import type { EmployeeRole } from '@/types/auth.types';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';

export function EmployeesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Role and status are filtered server-side (GET /employees ?role= &status=); the free-text
  // search stays client-side on the (≤500) loaded rows so typing does not refetch.
  const { data: employeesData, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', outletId, roleFilter, statusFilter],
    queryFn: () =>
      employeesApi.list({
        outletId: outletId || undefined,
        role: roleFilter === 'all' ? undefined : (roleFilter as EmployeeRole),
        status: statusFilter,
      }),
  });

  const term = search.trim().toLowerCase();
  const filteredEmployees = (employeesData ?? []).filter(
    (e) =>
      !term ||
      e.name.toLowerCase().includes(term) ||
      (e.email ?? '').toLowerCase().includes(term) ||
      (e.phone ?? '').toLowerCase().includes(term),
  );

  const reactivateMutation = useMutation({
    mutationFn: (employee: Employee) => employeesApi.update(employee.id, { isActive: true }),
    onSuccess: (_data, employee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success({
        title: 'Karyawan diaktifkan kembali',
        description: `"${employee.name}" dapat masuk lagi`,
      });
    },
    onError: (error) => handleMutationError(error, 'Gagal mengaktifkan karyawan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success({
        title: 'Karyawan berhasil dinonaktifkan',
        description: `"${deleteTarget?.name}" tidak lagi dapat masuk`,
      });
      setDeleteTarget(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal menghapus karyawan'),
  });

  const columns: Column<Employee>[] = [
    { key: 'name', header: 'Nama', cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'email', header: 'Email', cell: (row) => <span className="text-muted-foreground">{row.email}</span> },
    { key: 'phone', header: 'Telepon', cell: (row) => <span className="text-muted-foreground">{row.phone ?? '-'}</span> },
    {
      key: 'role',
      header: 'Role',
      cell: (row) => <Badge variant="secondary">{ROLE_LABELS[row.role]}</Badge>,
    },
    { key: 'outlet', header: 'Outlet', cell: (row) => row.outletName },
    {
      key: 'status',
      header: 'Status',
      cell: (row) =>
        row.isActive ? (
          <Badge variant="default">Aktif</Badge>
        ) : (
          <Badge variant="outline">Nonaktif</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      // Backend canManageRole: only roles strictly below the caller can be edited/removed
      cell: (row) =>
        !canManageRole(user?.role, row.role) ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi karyawan">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/employees/${row.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {row.isActive ? (
              <DropdownMenuItem
                onClick={() => setDeleteTarget(row)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Nonaktifkan
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => reactivateMutation.mutate(row)}
                disabled={reactivateMutation.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Aktifkan Kembali
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Karyawan" description="Kelola daftar karyawan Anda">
        <HelpSidebar page="employees" />
        <Button onClick={() => navigate('/app/employees/new')} aria-keyshortcuts="N">
          <Plus className="mr-2 h-4 w-4" /> Tambah Karyawan
        </Button>
      </PageHeader>

      <InlineHelpCard page="employees" className="mb-4" />

      <DataTable
        columns={columns}
        data={filteredEmployees}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        searchPlaceholder="Cari karyawan..."
        onSearch={setSearch}
        emptyTitle="Belum ada karyawan"
        emptyDescription="Mulai dengan menambahkan karyawan untuk mengelola akses dan operasional bisnis Anda."
        emptyAction={
          <Button onClick={() => navigate('/app/employees/new')}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Karyawan Pertama
          </Button>
        }
        filters={
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'active' | 'inactive' | 'all')}
            >
              <SelectTrigger className="w-[150px]" aria-label="Filter status karyawan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
                <SelectItem value="all">Semua Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Nonaktifkan Karyawan"
        description={`"${deleteTarget?.name}" akan dinonaktifkan dan tidak dapat lagi masuk. Lanjutkan?`}
        confirmLabel="Nonaktifkan"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
