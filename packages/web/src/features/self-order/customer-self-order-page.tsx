import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { selfOrderApi } from '@/api/endpoints/self-order.api';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, X, Check, UtensilsCrossed, Loader2, ShoppingCart, Menu, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import type { SelfOrderMenuItem } from '@/types/self-order.types';
import { ProductLightbox } from './components/product-lightbox';
import { ProductRecommendations } from './components/product-recommendations';
import { StickyCartFooter } from './components/sticky-cart-footer';
import { OrderConfirmation } from './components/order-confirmation';
import { OfflineIndicator } from './components/offline-indicator';

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [orderNumber, setOrderNumber] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineError, setShowOfflineError] = useState(false);

  const queryClient = useQueryClient();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      const result = await selfOrderApi.submitSession(sessionCode);
      return result;
    },
    onSuccess: (data) => {
      setOrderNumber(data.orderNumber || `ORD-${Date.now()}`);
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
    if (!isOnline) {
      setShowOfflineError(true);
      setTimeout(() => setShowOfflineError(false), 5000);
      return;
    }

    if (cart.length === 0) return;

    setOrderStatus('submitting');
    const orderItems: OrderItem[] = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      notes: item.notes,
    }));

    submitOrderMutation.mutate(orderItems);
  }, [cart, isOnline, submitOrderMutation]);

  // Open product detail with lightbox support
  const openProductDetail = useCallback((product: SelfOrderMenuItem) => {
    setSelectedProduct(product);
  }, []);

  // Open lightbox
  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  // Loading state
  if (sessionLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Header skeleton */}
          <Skeleton className="h-24 w-full" />

          {/* Search skeleton */}
          <Skeleton className="h-12 w-full" />

          {/* Categories skeleton */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20" />
            ))}
          </div>

          {/* Menu grid skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
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
          <UtensilsCrossed className="mx-auto h-16 w-16 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold">Sesi Tidak Ditemukan</h2>
          <p className="mt-2 text-gray-600">
            QR code yang Anda scan tidak valid atau telah kedaluwarsa. Silakan minta bantuan dari staff kami.
          </p>
        </Card>
      </div>
    );
  }

  // Order success state
  if (orderStatus === 'success' && orderNumber) {
    return (
      <OrderConfirmation
        orderNumber={orderNumber}
        total={cartTotal}
        estimatedTime={15}
        onViewStatus={() => setOrderStatus('idle')}
        onNewOrder={() => {
          setOrderStatus('idle');
          setOrderNumber('');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Offline Indicator */}
      <OfflineIndicator isOnline={isOnline} />

      {/* Offline Error Alert */}
      <AnimatePresence>
        {showOfflineError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-auto max-w-4xl px-4 pt-4"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tidak dapat terhubung ke server. Periksa koneksi internet Anda.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Menu
              </h1>
              <p className="text-sm text-gray-600">
                Sesi: {session?.sessionCode || '-'}
              </p>
            </div>
            <Button
              onClick={() => setIsCartOpen(true)}
              className="relative gap-2"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5" />
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

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Product Recommendations */}
        {selectedCategory === 'all' && !searchQuery && (
          <ProductRecommendations
            outletId={session?.outletId || ''}
            onAddToCart={addToCart}
          />
        )}

        {/* Menu Grid */}
        {filteredItems.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Menu className="mx-auto h-16 w-16 text-gray-400" />
              <p className="mt-4 text-gray-600">Tidak ada menu yang ditemukan</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                onClick={() => openProductDetail(item)}
              >
                <div className="aspect-video w-full overflow-hidden bg-gray-100 relative group">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Menu className="h-16 w-16 text-gray-300" />
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
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Sticky Cart Footer */}
      <StickyCartFooter
        itemCount={cartItemCount}
        total={cartTotal}
        onViewCart={() => setIsCartOpen(true)}
      />

      {/* Product Lightbox */}
      <ProductLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedProduct.imageUrl && (
                  <div
                    className="relative cursor-pointer rounded-lg overflow-hidden"
                    onClick={() => openLightbox([selectedProduct.imageUrl!], 0)}
                  >
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-medium">Klik untuk perbesar</p>
                    </div>
                  </div>
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
              <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} aria-label="Tutup keranjang">
                <X className="h-5 w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="mx-auto h-16 w-16 text-gray-400" />
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
                        className="h-8 w-8"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 min-h-[44px]"
                          onClick={() => updateQuantity(item.productId, -1)}
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </Button>
                        <span className="w-9 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 min-h-[44px]"
                          onClick={() => updateQuantity(item.productId, 1)}
                        >
                          <Plus className="h-4 w-4" />
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
                disabled={orderStatus === 'submitting' || !isOnline}
              >
                {orderStatus === 'submitting' ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : !isOnline ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Menunggu Koneksi...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Kirim Pesanan
                  </>
                )}
              </Button>

              {orderStatus === 'error' && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Gagal mengirim pesanan. Silakan coba lagi.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
