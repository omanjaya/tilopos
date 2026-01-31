import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { onlineStoreApi } from '@/api/endpoints/online-store.api';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Search, Instagram, Facebook, MessageCircle, Minus, Plus, Trash2, Store } from 'lucide-react';
import { clsx } from 'clsx';

interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variant?: { id: string; name: string; priceAdjustment: number };
  modifiers?: { id: string; name: string; price: number }[];
}

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  isAvailable: boolean;
  isOnSale?: boolean;
  discountPercent?: number;
  categoryName: string;
  variants?: { id: string; name: string; priceAdjustment: number }[];
  modifierGroups?: { id: string; name: string; modifiers: { id: string; name: string; price: number }[] }[];
}

export function StorefrontPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('slug') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [orderNumber, setOrderNumber] = useState('');

  // Get storefront data
  const { data: storefront, isLoading } = useQuery({
    queryKey: ['online-store-storefront', slug],
    queryFn: () => onlineStoreApi.getStorefront(slug),
    enabled: !!slug,
  });

  const products = storefront?.products || [];

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(products.map((p) => p.categoryName)))];

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.categoryName === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart calculations
  const cartTotal = cart.reduce((sum, item) => {
    const itemPrice = item.price + (item.variant?.priceAdjustment || 0);
    const modifiersPrice = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
    return sum + (itemPrice + modifiersPrice) * item.quantity;
  }, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add to cart
  const addToCart = (product: StoreProduct) => {
    const variant = product.variants?.find((v) => v.id === selectedVariant);
    const modifiers = selectedModifiers
      .map((id) =>
        product.modifierGroups
          ?.flatMap((g) => g.modifiers)
          .find((m) => m.id === id)
      )
      .filter(Boolean);

    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.productId === product.id &&
          item.variantId === (variant?.id || '') &&
          JSON.stringify(item.modifiers?.map((m) => m?.id) || []) === JSON.stringify(modifiers?.map((m) => m?.id) || [])
      );

      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.variantId === (variant?.id || '') && JSON.stringify(item.modifiers?.map((m) => m?.id) || []) === JSON.stringify(modifiers?.map((m) => m?.id) || [])
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, {
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        price: product.price,
        quantity,
        imageUrl: product.imageUrl,
        variant,
        modifiers,
      } as CartItem];
    });

    // Reset selection
    setSelectedProduct(null);
    setSelectedVariant('');
    setSelectedModifiers([]);
    setQuantity(1);
  };

  // Update quantity
  const updateQuantity = (productId: string, variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string, variantId: string) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.variantId === variantId)));
  };

  // Calculate item total
  const getItemTotal = (item: CartItem) => {
    const variantPrice = item.variant?.priceAdjustment || 0;
    const modifiersPrice = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
    return (item.price + variantPrice + modifiersPrice) * item.quantity;
  };

  // Submit order
  const submitOrder = async () => {
    if (cart.length === 0) return;

    setOrderStatus('submitting');
    try {
      const result = await onlineStoreApi.createOrder(slug, {
        customerInfo,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          modifierIds: item.modifiers?.map((m) => m.id) || [],
        })),
        deliveryMethod,
      });

      setOrderNumber(result.orderNumber);
      setOrderStatus('success');
      setCart([]);
      setCheckoutStep(0);
    } catch (error) {
      setOrderStatus('error');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="h-48 w-full mb-6" />
          <div className="grid grid-cols-4 gap-6">
            <Skeleton className="col-span-1 h-96" />
            <div className="col-span-3 space-y-4">
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!storefront) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <Store className="mx-auto h-16 w-16 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold">Toko Tidak Ditemukan</h2>
          <p className="mt-2 text-muted-foreground">Toko online tidak ditemukan atau link tidak valid.</p>
        </div>
      </div>
    );
  }

  // Order success state
  if (orderStatus === 'success' && orderNumber) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <span className="text-5xl">✓</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Pesanan Berhasil!</h1>
          <p className="text-muted-foreground mb-8">Terima kasih atas pesanan Anda.</p>

          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <p className="text-sm text-muted-foreground mb-2">Nomor Pesanan</p>
            <p className="text-4xl font-bold">{orderNumber}</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(cartTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Estimasi</p>
                <p className="text-2xl font-bold">
                  {deliveryMethod === 'delivery' ? '45-60 menit' : '20 menit'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setOrderStatus('idle')}>
              Belanja Lagi
            </Button>
            <Button onClick={() => navigate(`/store/${slug}`)}>
              Kembali ke Toko
            </Button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              📱 Notifikasi status pesanan akan dikirim via WhatsApp ke <strong>{customerInfo.phone}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Banner */}
          {storefront.bannerUrl && (
            <img
              src={storefront.bannerUrl}
              alt={storefront.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}

          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="relative">
              <img
                src={storefront.logoUrl || '/placeholder-store.png'}
                alt={storefront.name}
                className="h-20 w-20 rounded-full border-2"
                onError={(e) => { (e.currentTarget.src = '/placeholder-store.png'); }}
              />
            </div>

            {/* Store Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{storefront.name}</h1>
              <p className="text-muted-foreground">{storefront.tagline}</p>

              {/* Social Links */}
              <div className="flex gap-3 mt-2">
                {storefront.instagramUrl && (
                  <a
                    href={storefront.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {storefront.facebookUrl && (
                  <a
                    href={storefront.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {storefront.whatsappNumber && (
                  <a
                    href={`https://wa.me/${storefront.whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Search & Cart */}
            <div className="flex items-center gap-4">
              <div className="w-64">
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsCartOpen(true)}
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="ml-2">Keranjang</span>
                {cartItemCount > 0 && (
                  <Badge className="ml-2">{cartItemCount}</Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-6">
        {/* Category Sidebar */}
        <aside className="col-span-3 hidden md:block">
          <div className="bg-white rounded-lg shadow p-4 sticky top-24">
            <h3 className="font-semibold mb-3">Kategori</h3>
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-md transition-colors',
                  selectedCategory === 'all'
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100'
                )}
              >
                Semua Produk ({products.length})
              </button>
              {categories.slice(1).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-md transition-colors',
                    selectedCategory === cat
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  )}
                >
                  {cat}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="col-span-12 md:col-span-9">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => {
                  setSelectedProduct(product);
                  setQuantity(1);
                }}
              />
            ))}
          </div>
        </main>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          quantity={quantity}
          setQuantity={setQuantity}
          selectedVariant={selectedVariant}
          setSelectedVariant={setSelectedVariant}
          selectedModifiers={selectedModifiers}
          setSelectedModifiers={setSelectedModifiers}
          onAddToCart={() => addToCart(selectedProduct)}
          onClose={() => {
            setSelectedProduct(null);
            setSelectedVariant('');
            setSelectedModifiers([]);
            setQuantity(1);
          }}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        cartItemCount={cartItemCount}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          setCheckoutStep(1);
        }}
      />

      {/* Checkout Flow */}
      {(checkoutStep > 0 || orderStatus === 'submitting') && (
        <CheckoutFlow
          storeSlug={slug}
          cart={cart}
          cartTotal={cartTotal}
          checkoutStep={checkoutStep}
          setCheckoutStep={setCheckoutStep}
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          deliveryMethod={deliveryMethod}
          setDeliveryMethod={setDeliveryMethod}
          orderStatus={orderStatus}
          submitOrder={submitOrder}
          onClose={() => {
            setCheckoutStep(0);
            setIsCartOpen(true);
          }}
        />
      )}
    </div>
  );
}

// Product Card Component
interface ProductCardProps {
  product: StoreProduct;
  onAddToCart: () => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer">
      <div className="relative aspect-square">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-300">
            🍽️
          </div>
        )}

        {/* Badges */}
        {!product.isAvailable && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            Stok Habis
          </Badge>
        )}
        {product.isOnSale && product.discountPercent && (
          <Badge className="absolute top-2 left-2" variant="destructive">
            Sale {product.discountPercent}%
          </Badge>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div>
            {product.isOnSale && product.originalPrice ? (
              <>
                <span className="text-lg font-bold text-destructive">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-sm text-muted-foreground line-through ml-2">
                  {formatCurrency(product.originalPrice)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold">{formatCurrency(product.price)}</span>
            )}
          </div>

          <Button
            size="sm"
            disabled={!product.isAvailable}
            onClick={onAddToCart}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Product Detail Modal Component
interface ProductDetailModalProps {
  product: StoreProduct;
  quantity: number;
  setQuantity: (value: number) => void;
  selectedVariant: string;
  setSelectedVariant: (value: string) => void;
  selectedModifiers: string[];
  setSelectedModifiers: (value: string[]) => void;
  onAddToCart: () => void;
  onClose: () => void;
}

function ProductDetailModal({
  product,
  quantity,
  setQuantity,
  selectedVariant,
  setSelectedVariant,
  selectedModifiers,
  setSelectedModifiers,
  onAddToCart,
  onClose,
}: ProductDetailModalProps) {
  const variants = product.variants || [];
  const modifierGroups = product.modifierGroups || [];

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold">{product.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full rounded-lg object-cover max-h-64 mb-4"
          />
        )}

        {product.description && (
          <p className="text-gray-600 mb-4">{product.description}</p>
        )}

        <div className="mb-4">
          <span className="text-2xl font-bold">
            {formatCurrency(product.price)}
          </span>
        </div>

        {/* Variants */}
        {variants.length > 0 && (
          <div className="mb-4">
            <label className="block mb-2 font-medium">Pilih Varian</label>
            <div className="space-y-2">
              {variants.map((v) => (
                <label
                  key={v.id}
                  className={clsx(
                    'flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50',
                    selectedVariant === v.id ? 'border-primary bg-primary/10' : ''
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    checked={selectedVariant === v.id}
                    onChange={() => setSelectedVariant(v.id)}
                    className="sr-only"
                  />
                  <span>{v.name}</span>
                  {v.priceAdjustment !== 0 && (
                    <span className="text-sm text-muted-foreground">
                      (+{formatCurrency(v.priceAdjustment)})
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Modifiers */}
        {modifierGroups.map((group) => (
          <div key={group.id} className="mb-4">
            <label className="block mb-2 font-medium">{group.name}</label>
            <div className="space-y-2">
              {group.modifiers.map((modifier) => {
                const isSelected = selectedModifiers.includes(modifier.id);
                return (
                  <div
                    key={modifier.id}
                    className={clsx(
                      'flex items-center space-x-2 p-2 border rounded hover:bg-gray-50',
                      isSelected ? 'border-primary bg-primary/10' : ''
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleModifier(modifier.id)}
                      className="sr-only"
                    />
                    <span>{modifier.name}</span>
                    {modifier.price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        (+{formatCurrency(modifier.price)})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quantity */}
        <div className="mb-6">
          <label className="block mb-2 font-medium">Jumlah</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </Button>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || '1')}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={onAddToCart} disabled={!product.isAvailable} className="flex-1">
            {product.isAvailable ? (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Tambah ke Keranjang - {formatCurrency(calculateTotal())}
              </>
            ) : (
              'Stok Habis'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function calculateTotal() {
  // TODO: Calculate based on selected variant, modifiers, and quantity
  return 0;
}

// Cart Drawer Component
interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartTotal: number;
  cartItemCount: number;
  updateQuantity: (productId: string, variantId: string, delta: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  onCheckout: () => void;
}

function CartDrawer({
  open,
  onClose,
  cart,
  cartTotal,
  cartItemCount,
  updateQuantity,
  removeFromCart,
  onCheckout,
}: CartDrawerProps) {
  const subtotal = cartTotal;
  const tax = Math.round(subtotal * 0.11); // 11% tax
  const shippingFee = deliveryMethod === 'delivery' ? 15000 : 0;
  const total = subtotal + tax + shippingFee;

  return (
    <div className={clsx('fixed inset-0 z-50', open ? 'block' : 'hidden')}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Keranjang Belanja</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <ShoppingCart className="h-16 w-16 text-gray-400" />
            <p className="mt-4 text-gray-600">Keranjang kosong</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || ''}`}
                  className="flex gap-3 pb-4 border-b"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    {item.variant && <p className="text-sm text-muted-foreground">{item.variant.name}</p>}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        + {item.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.productId, item.variantId || '', -1)}
                    >
                      −
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.productId, item.variantId || '', 1)}
                    >
                      +
                    </Button>
                  </div>
                  <p className="font-semibold">{formatCurrency(getItemTotal(item))}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromCart(item.productId, item.variantId || '')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak (11%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ongkir</span>
                <span>{formatCurrency(shippingFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button onClick={onCheckout} className="w-full" size="lg">
              Checkout
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Checkout Flow Component
interface CheckoutFlowProps {
  storeSlug: string;
  cart: CartItem[];
  cartTotal: number;
  checkoutStep: number;
  setCheckoutStep: (step: number) => void;
  customerInfo: { name: string; phone: string; address: string; notes: string };
  setCustomerInfo: (info: any) => void;
  deliveryMethod: 'delivery' | 'pickup';
  setDeliveryMethod: (method: 'delivery' | 'pickup') => void;
  orderStatus: 'idle' | 'submitting' | 'success' | 'error';
  submitOrder: () => void;
  onClose: () => void;
}

function CheckoutFlow({
  storeSlug,
  cart,
  cartTotal,
  checkoutStep,
  setCheckoutStep,
  customerInfo,
  setCustomerInfo,
  deliveryMethod,
  setDeliveryMethod,
  orderStatus,
  submitOrder,
  onClose,
}: CheckoutFlowProps) {
  const subtotal = cartTotal;
  const tax = Math.round(subtotal * 0.11);
  const shippingFee = deliveryMethod === 'delivery' ? 15000 : 0;
  const total = subtotal + tax + shippingFee;

  return (
    <div className={clsx('fixed inset-0 z-50', checkoutStep > 0 ? 'block' : 'hidden')}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl p-6 overflow-y-auto">
        {checkoutStep === 1 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Informasi Pelanggan</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Nama Lengkap *</label>
                <Input
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Nomor HP *</label>
                <Input
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="08xx-xxxx-xxxx"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Email</label>
                <Input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Batal
              </Button>
              <Button onClick={() => setCheckoutStep(2)} className="flex-1">
                Lanjut
              </Button>
            </div>
          </>
        )}

        {checkoutStep === 2 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Pengiriman</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">Metode Pengiriman *</label>
                <div className="space-y-3">
                  <label
                    className={clsx(
                      'flex items-center space-x-2 border p-3 rounded cursor-pointer hover:bg-gray-50',
                      deliveryMethod === 'delivery' ? 'border-primary bg-primary/5' : ''
                    )}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === 'delivery'}
                      onChange={() => setDeliveryMethod('delivery')}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        Diantar ke alamat Anda
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(15000)}</p>
                  </label>
                  <label
                    className={clsx(
                      'flex items-center space-x-2 border p-3 rounded cursor-pointer hover:bg-gray-50',
                      deliveryMethod === 'pickup' ? 'border-primary bg-primary/5' : ''
                    )}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === 'pickup'}
                      onChange={() => setDeliveryMethod('pickup')}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Pickup</p>
                      <p className="text-sm text-muted-foreground">
                        Ambil sendiri di toko
                      </p>
                    </div>
                    <p className="font-semibold text-green-600">Gratis</p>
                  </label>
                </div>
              </div>

              {deliveryMethod === 'delivery' && (
                <div>
                  <label className="block mb-1 font-medium">Alamat Pengiriman *</label>
                  <textarea
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan, Kota"
                    rows={3}
                    className="w-full"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block mb-1 font-medium">Catatan Pesanan (opsional)</label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  placeholder="Contoh: Jangan gunakan cabai"
                  rows={2}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setCheckoutStep(1)} className="flex-1">
                Kembali
              </Button>
              <Button onClick={() => setCheckoutStep(3)} className="flex-1">
                Lanjut
              </Button>
            </div>
          </>
        )}

        {checkoutStep === 3 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Konfirmasi Pesanan</h2>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item</span>
                <span className="text-muted-foreground">Jumlah</span>
              </div>
              {cart.map((item) => (
                <div key={`${item.productId}-${item.variantId || ''}`} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span>x{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartItemCount} item)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak (11%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ongkir</span>
                <span>{formatCurrency(shippingFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setCheckoutStep(2)} className="flex-1">
                Kembali
              </Button>
              <Button onClick={submitOrder} disabled={orderStatus === 'submitting'} className="flex-1">
                {orderStatus === 'submitting' ? (
                  'Memproses...'
                ) : (
                  `Buat Pesanan - ${formatCurrency(total)}`
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
