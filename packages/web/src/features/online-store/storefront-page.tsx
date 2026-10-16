import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Store } from 'lucide-react';

// Hooks
import { useStorefront, useCart, useProductSelection, useCheckout } from './hooks';

// Components
import {
  StorefrontHeader,
  ProductGrid,
  ProductDetailModal,
  CartPanel,
  CheckoutFlow,
  OrderSuccess,
} from './components';

export function StorefrontPage() {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const slug = routeSlug || searchParams.get('slug') || '';

  // State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom hooks
  const { storefront, products, categories, isLoading, isNotFound, error, refetch } = useStorefront(slug);
  const { cart, cartItemCount, getItemTotal, addItem, updateQuantity, removeItem, clearCart } = useCart();
  const {
    selectedProduct,
    selectedVariant,
    quantity,
    setQuantity,
    setSelectedVariant,
    calculateTotal,
    canAddToCart,
    toCartItem,
    resetSelection,
    selectProduct,
  } = useProductSelection();
  const {
    checkoutStep,
    setCheckoutStep,
    customerInfo,
    setCustomerInfo,
    deliveryMethod,
    setDeliveryMethod,
    orderStatus,
    order,
    errorMessage,
    submitOrder: submitCheckoutOrder,
    resetCheckout,
  } = useCheckout(slug);

  // Handlers
  const handleAddToCart = () => {
    if (selectedProduct && canAddToCart(selectedProduct)) {
      const cartItem = toCartItem(selectedProduct);
      addItem(cartItem);
      resetSelection();
    }
  };

  const handleSubmitOrder = async () => {
    await submitCheckoutOrder(cart, clearCart);
  };

  const handleShopAgain = () => {
    resetCheckout();
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

  // Transient failure: offer retry instead of claiming the store doesn't exist
  if (!storefront && !isNotFound) {
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorState title="Gagal memuat toko" error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  // Not found state
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
  if (orderStatus === 'success' && order) {
    return (
      <OrderSuccess order={order} deliveryMethod={deliveryMethod} onShopAgain={handleShopAgain} />
    );
  }

  // Main storefront UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <StorefrontHeader
        storefront={storefront}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartItemCount={cartItemCount}
        onCartOpen={() => setIsCartOpen(true)}
      />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <ProductGrid
          products={products}
          categories={categories}
          searchQuery={searchQuery}
          onProductSelect={selectProduct}
        />
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          quantity={quantity}
          setQuantity={setQuantity}
          selectedVariant={selectedVariant}
          setSelectedVariant={setSelectedVariant}
          calculateTotal={calculateTotal}
          canAddToCart={canAddToCart(selectedProduct)}
          onAddToCart={handleAddToCart}
          onClose={resetSelection}
        />
      )}

      {/* Cart Panel */}
      <CartPanel
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        getItemTotal={getItemTotal}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setCheckoutStep(1);
        }}
      />

      {/* Checkout Flow */}
      {(checkoutStep > 0 || orderStatus === 'submitting') && (
        <CheckoutFlow
          isDeliveryEnabled={storefront.isDeliveryEnabled}
          isPickupEnabled={storefront.isPickupEnabled}
          errorMessage={errorMessage}
          cart={cart}
          checkoutStep={checkoutStep}
          setCheckoutStep={setCheckoutStep}
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          deliveryMethod={deliveryMethod}
          setDeliveryMethod={setDeliveryMethod}
          orderStatus={orderStatus}
          submitOrder={handleSubmitOrder}
          onClose={() => {
            setCheckoutStep(0);
            setIsCartOpen(true);
          }}
        />
      )}
    </div>
  );
}
