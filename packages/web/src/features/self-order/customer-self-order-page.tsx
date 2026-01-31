import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { selfOrderApi } from '@/api/endpoints/self-order.api';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MenuIcon,
  ShoppingBagIcon,
  PlusIcon,
  MinusIcon,
  XIcon,
  CheckIcon,
  UtensilsCrossedIcon,
  Loader2Icon,
} from 'lucide-react';
import clsx from 'clsx';
import type { SelfOrderMenuItem } from '@/types/self-order.types';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
}

interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
}

export function CustomerSelfOrderPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelfOrderMenuItem | null>(null);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const queryClient = useQueryClient();

  // Get session info
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['self-order-session', sessionCode],
    queryFn: () => selfOrderApi.getSession(sessionCode!),
    enabled: !!sessionCode,
  });

  // Get menu
  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ['self-order-menu', session?.outletId],
    queryFn: () => selfOrderApi.getMenu(session?.outletId || ''),
    enabled: !!session?.outletId,
  });

  // Submit order mutation
  const submitOrderMutation = useMutation({
    mutationFn: async (items: OrderItem[]) => {
      if (!sessionCode) throw new Error('No session code');

      // Add items to session
      for (const item of items) {
        await selfOrderApi.addItem(sessionCode, item);
      }

      // Submit session
      await selfOrderApi.submitSession(sessionCode);
    },
    onSuccess: () => {
      setOrderStatus('success');
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ['self-order-session', sessionCode] });
    },
    onError: () => {
      setOrderStatus('error');
    },
  });

  // Get unique categories
  const categories = menuItems
    ? ['all', ...Array.from(new Set(menuItems.map((item) => item.categoryName)))]
    : ['all'];

  // Filter menu items
  const filteredItems = menuItems?.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.categoryName === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isAvailable = item.isAvailable;
    return matchesCategory && matchesSearch && isAvailable;
  }) || [];

  // Cart calculations
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add to cart
  const addToCart = useCallback((product: SelfOrderMenuItem, quantity: number = 1, notes?: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        notes,
        imageUrl: product.imageUrl,
      }];
    });
    setSelectedProduct(null);
  }, []);

  // Update cart item quantity
  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  // Submit order
  const handleSubmitOrder = useCallback(() => {
    if (cart.length === 0) return;

    setOrderStatus('submitting');
    const orderItems: OrderItem[] = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      notes: item.notes,
    }));

    submitOrderMutation.mutate(orderItems);
  }, [cart, submitOrderMutation]);

  // Loading state
  if (sessionLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Session not found
  if (!session && !sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <UtensilsCrossedIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold">Sesi Tidak Ditemukan</h2>
          <p className="mt-2 text-gray-600">
            QR code yang Anda scan tidak valid atau telah kedaluwarsa. Silakan minta bantuan dari staff kami.
          </p>
        </Card>
      </div>
    );
  }

  // Order success state
  if (orderStatus === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckIcon className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Pesanan Berhasil!</h2>
          <p className="mt-2 text-gray-600">
            Terima kasih telah memesan. Pesanan Anda sedang diproses dan akan segera disiapkan.
          </p>
          <div className="mt-6 rounded-lg bg-gray-100 p-4">
            <p className="text-sm text-gray-600">Nomor Meja</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {session?.tableNumber || '-'}
            </p>
          </div>
          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={() => setOrderStatus('idle')}
          >
            Pesan Lagi
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {session?.outletName || 'Menu'}
              </h1>
              <p className="text-sm text-gray-600">
                Meja {session?.tableNumber || '-'}
              </p>
            </div>
            <Button
              onClick={() => setIsCartOpen(true)}
              className="relative gap-2"
              size="lg"
            >
              <ShoppingBagIcon className="h-5 w-5" />
              <span>Keranjang</span>
              {cartItemCount > 0 && (
                <Badge className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0 text-center">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <Input
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Categories */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={clsx(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {category === 'all' ? 'Semua' : category}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Grid */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <MenuIcon className="mx-auto h-16 w-16 text-gray-400" />
              <p className="mt-4 text-gray-600">Tidak ada menu yang ditemukan</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                onClick={() => setSelectedProduct(item)}
              >
                <div className="aspect-video w-full overflow-hidden bg-gray-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <MenuIcon className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">{item.categoryName}</p>
                    </div>
                  </div>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(item.price)}
                    </p>
                    <Button size="sm" onClick={(e) => {
                      e.stopPropagation();
                      addToCart(item);
                    }}>
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedProduct.imageUrl && (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full rounded-lg object-cover"
                  />
                )}
                {selectedProduct.description && (
                  <p className="text-gray-600">{selectedProduct.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => addToCart(selectedProduct)}
                  >
                    Tambah ke Keranjang
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Drawer */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Keranjang Belanja</span>
              <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
                <XIcon className="h-5 w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBagIcon className="mx-auto h-16 w-16 text-gray-400" />
              <p className="mt-4 text-gray-600">Keranjang Anda kosong</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cart Items */}
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex gap-3 rounded-lg border p-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(item.price)}</p>
                      {item.notes && (
                        <p className="mt-1 text-xs text-gray-500">Catatan: {item.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.productId, -1)}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.productId, 1)}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Submit */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmitOrder}
                disabled={orderStatus === 'submitting'}
              >
                {orderStatus === 'submitting' ? (
                  <>
                    <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckIcon className="mr-2 h-5 w-5" />
                    Kirim Pesanan
                  </>
                )}
              </Button>

              {orderStatus === 'error' && (
                <p className="text-center text-sm text-red-600">
                  Gagal mengirim pesanan. Silakan coba lagi.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
