import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/api/endpoints/customers.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  User,
  Mail,
  Phone,
  ShoppingBag,
  Edit,
  Trash2,
} from 'lucide-react';
import type { Customer } from '@/types/customer.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

/**
 * CustomersPage Mobile Version
 *
 * Mobile-optimized customers list with:
 * - Card-based layout
 * - Search at top
 * - Tap to view detail (bottom sheet)
 * - Quick actions in sheet
 */

export function CustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      customersApi.list({
        search: search || undefined,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => customersApi.update(id, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Pelanggan dinonaktifkan' });
      setDeleteTarget(null);
      setSelectedCustomer(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menonaktifkan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const customers = customersData || [];

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Pelanggan</h1>
              <p className="text-sm text-muted-foreground">
                {customers.length} pelanggan
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>
      </header>

      {/* Customers List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-6 mb-4">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Belum ada pelanggan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tambahkan pelanggan pertama Anda
            </p>
            <Button onClick={() => navigate('/app/customers/new')}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => setSelectedCustomer(customer)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {customers.length > 0 && (
        <Button
          size="lg"
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg"
          onClick={() => navigate('/app/customers/new')}
          aria-label="Tambah pelanggan"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile Nav Spacer */}
      <MobileNavSpacer />

      {/* Customer Detail Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCustomer.name}</SheetTitle>
                <SheetDescription>
                  Detail informasi pelanggan
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Customer Info */}
                <div className="space-y-3">
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-muted p-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{selectedCustomer.email}</p>
                      </div>
                    </div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-muted p-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Telepon</p>
                        <p className="text-sm font-medium">{selectedCustomer.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Total Belanja</p>
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(selectedCustomer.totalSpent)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Jumlah Kunjungan</p>
                      <p className="text-sm font-medium">{selectedCustomer.visitCount}x</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12"
                    onClick={() => {
                      navigate(`/app/customers/${selectedCustomer.id}/edit`);
                      setSelectedCustomer(null);
                    }}
                  >
                    <Edit className="mr-3 h-5 w-5" />
                    Edit Pelanggan
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start h-12',
                      'text-destructive hover:text-destructive hover:bg-destructive/10'
                    )}
                    onClick={() => {
                      setDeleteTarget(selectedCustomer);
                      setSelectedCustomer(null);
                    }}
                  >
                    <Trash2 className="mr-3 h-5 w-5" />
                    Nonaktifkan Pelanggan
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Deactivate Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deactivateMutation.mutate(deleteTarget.id)}
        title="Nonaktifkan Pelanggan"
        description={`Apakah Anda yakin ingin menonaktifkan "${deleteTarget?.name}"? Pelanggan masih dapat diaktifkan kembali nanti.`}
        confirmLabel="Nonaktifkan"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}

/**
 * CustomerCard Component
 * Individual customer card
 */
function CustomerCard({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  // Generate initials for avatar
  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="overflow-hidden cursor-pointer active:scale-[0.98] transition-transform" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {initials}
          </div>

          {/* Customer Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{customer.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {customer.phone && (
                <>
                  <Phone className="h-3 w-3" />
                  <span className="truncate">{customer.phone}</span>
                </>
              )}
              {!customer.phone && customer.email && (
                <>
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{customer.email}</span>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="text-right shrink-0">
            <p className="font-semibold text-sm text-primary">
              {formatCurrency(customer.totalSpent)}
            </p>
            <p className="text-xs text-muted-foreground">
              {customer.visitCount} kunjungan
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
