import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  QrCode,
  Smartphone,
  ShoppingCart,
  ChefHat,
  Eye,
  Loader2,
  UtensilsCrossed,
  ImageOff,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { selfOrderApi } from '@/api/endpoints/self-order.api';
import { formatCurrency } from '@/lib/format';
import type { SelfOrderMenuItem } from '@/types/self-order.types';

const WORKFLOW_STEPS = [
  {
    icon: QrCode,
    title: 'Pelanggan scan QR code di meja',
    description: 'Setiap meja memiliki QR code unik yang membuka halaman pemesanan.',
  },
  {
    icon: Smartphone,
    title: 'Buka menu dan pilih pesanan',
    description: 'Pelanggan melihat menu lengkap dengan gambar, harga, dan modifier.',
  },
  {
    icon: ShoppingCart,
    title: 'Pesanan masuk ke POS dan KDS otomatis',
    description: 'Pesanan langsung muncul di terminal POS kasir dan Kitchen Display System.',
  },
];

function MenuItemCard({ item }: { item: SelfOrderMenuItem }) {
  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full rounded-md object-cover"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.categoryName}</p>
          </div>
          <Badge
            variant={item.isAvailable ? 'default' : 'secondary'}
            className={item.isAvailable ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            {item.isAvailable ? 'Tersedia' : 'Habis'}
          </Badge>
        </div>
        {item.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        <p className="mt-1 text-sm font-semibold">{formatCurrency(item.price)}</p>
      </div>
    </div>
  );
}

function MenuLoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-lg border p-3">
          <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SelfOrderPage() {
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId || user?.outletId || '';

  const [previewOutletId, setPreviewOutletId] = useState(outletId);
  const [showMenu, setShowMenu] = useState(false);

  const {
    data: menuItems,
    isLoading: menuLoading,
    isError: menuError,
    refetch: refetchMenu,
  } = useQuery({
    queryKey: ['self-order-menu', previewOutletId],
    queryFn: () => selfOrderApi.getMenu(previewOutletId),
    enabled: !!previewOutletId && showMenu,
  });

  function handlePreviewMenu() {
    if (!previewOutletId) return;
    setShowMenu(true);
    refetchMenu();
  }

  return (
    <div>
      <PageHeader title="Self-Order" description="Konfigurasi self-order untuk pelanggan" />

      {/* How it works */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Cara Kerja Self-Order</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pelanggan memesan langsung dari meja tanpa perlu antri
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {WORKFLOW_STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-lg border p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Generator */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">QR Code Generator</CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate QR code untuk setiap meja
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="max-w-sm">
              <Select value={previewOutletId} onValueChange={setPreviewOutletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outletId && (
                    <SelectItem value={outletId}>
                      {user?.outletName || 'Outlet saat ini'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
              <div className="text-center">
                <QrCode className="mx-auto h-24 w-24 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">
                  QR code generator akan tersedia setelah fitur meja dikonfigurasi
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Setiap QR code mengarahkan pelanggan ke halaman pemesanan meja tersebut
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ChefHat className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Preview Menu</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Lihat tampilan menu yang akan dilihat pelanggan
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePreviewMenu}
              disabled={!previewOutletId || menuLoading}
            >
              {menuLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Preview Menu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!showMenu && (
            <div className="rounded-lg border border-dashed p-8">
              <EmptyState
                icon={UtensilsCrossed}
                title="Klik Preview Menu untuk melihat"
                description="Menu akan ditampilkan sesuai dengan outlet yang dipilih."
              />
            </div>
          )}

          {showMenu && menuLoading && <MenuLoadingSkeleton />}

          {showMenu && menuError && (
            <EmptyState
              icon={UtensilsCrossed}
              title="Gagal memuat menu"
              description="Terjadi kesalahan saat memuat menu. Silakan coba lagi."
              action={
                <Button variant="outline" size="sm" onClick={() => refetchMenu()}>
                  Coba Lagi
                </Button>
              }
            />
          )}

          {showMenu && !menuLoading && !menuError && menuItems && (menuItems ?? []).length === 0 && (
            <EmptyState
              icon={UtensilsCrossed}
              title="Menu kosong"
              description="Belum ada produk yang tersedia untuk outlet ini."
            />
          )}

          {showMenu && !menuLoading && !menuError && menuItems && (menuItems ?? []).length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {(menuItems ?? []).length} produk tersedia
                </p>
                <Badge variant="outline">
                  {(menuItems ?? []).filter((i) => i.isAvailable).length} tersedia
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(menuItems ?? []).map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
