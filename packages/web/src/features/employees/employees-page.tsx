import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, ROLE_OPTIONS, STATUS_OPTIONS } from '@/lib/constants';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Employee } from '@/types/employee.types';
import type { EmployeeRole } from '@/types/auth.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function EmployeesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', search, roleFilter, statusFilter],
    queryFn: () =>
      employeesApi.list({
        search: search || undefined,
        role: roleFilter !== 'all' ? (roleFilter as EmployeeRole) : undefined,
        isActive: statusFilter !== 'all' ? statusFilter === 'true' : undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Karyawan dihapus' });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
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
      cell: (row) => (
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
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/app/employees/new');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

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
        data={employeesData ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari karyawan..."
        onSearch={setSearch}
        emptyTitle="Belum ada karyawan"
        emptyDescription="Tambahkan karyawan pertama Anda."
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Karyawan"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
