import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { SelfOrderMenuItem, SelfOrderMenuVariant } from '@/types/self-order.types';
import { ErrorState } from '@/components/shared/error-state';
import {
  CartDrawer,
  LoadingState,
  MenuGrid,
  MenuHeader,
  OfflineErrorAlert,
  OfflineIndicator,
  OrderConfirmation,
  ProductDetailModal,
  ProductLightbox,
  SessionNotFound,
  StickyCartFooter,
} from './components';
import {
  useCart,
  useMenu,
  useOnlineStatus,
  useOrder,
  useProductDetail,
  useSession,
} from './hooks';

/**
 * Customer-facing self-order page
 * Allows customers to browse menu, add items to cart, and submit orders
 *
 * Architecture:
 * - Hooks handle data fetching and business logic
 * - Components are pure presentational
 * - Main page orchestrates hooks and components
 */
export function CustomerSelfOrderPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const [showOfflineError, setShowOfflineError] = useState(false);

  // Custom hooks
  const {
    session,
    isLoading: sessionLoading,
    isError: sessionIsError,
    isNotFound,
    error: sessionError,
    refetch: refetchSession,
  } = useSession(sessionCode);
  const {
    filteredItems,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoading: menuLoading,
    isError: menuIsError,
    error: menuError,
    refetch: refetchMenu,
  } = useMenu(session?.outletId);
  const {
    cart,
    cartTotal,
    cartItemCount,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const isOnline = useOnlineStatus();
  const {
    selectedProduct,
    openProductDetail,
    closeProductDetail,
    lightboxOpen,
    setLightboxOpen,
    lightboxImages,
    lightboxIndex,
    openLightbox,
  } = useProductDetail();

  // The submitted order (number + server total) is kept in useOrder, so clearing the cart is safe.
  const { order, errorMessage, submitOrder, isSubmitting, isError } = useOrder(sessionCode, () => {
    clearCart();
    setIsCartOpen(false);
  });

  // Handle order submission
  const handleSubmitOrder = () => {
    const success = submitOrder(cart, isOnline);
    if (!success && !isOnline) {
      setShowOfflineError(true);
      setTimeout(() => setShowOfflineError(false), 5000);
    }
  };

  // Handle product detail modal add to cart
  const handleAddToCartFromDetail = (product: SelfOrderMenuItem, variant?: SelfOrderMenuVariant) => {
    if (addToCart(product, 1, undefined, variant)) closeProductDetail();
  };

  // Handle lightbox from product detail
  const handleProductImageClick = (imageUrl: string) => {
    openLightbox([imageUrl], 0);
  };

  // Order success state (checked first: after submit the session is no longer 'active')
  if (order) {
    return (
      <OrderConfirmation
        orderNumber={order.orderNumber}
        total={order.total}
        tableNumber={session?.tableNumber}
      />
    );
  }

  // Loading state
  if (sessionLoading || menuLoading) {
    return <LoadingState />;
  }

  // Session missing/expired vs. a transient failure
  if (isNotFound) {
    return <SessionNotFound />;
  }
  if (sessionIsError || !session) {
    return (
      <div className="mx-auto max-w-md p-4">
        <ErrorState error={sessionError} onRetry={() => refetchSession()} />
      </div>
    );
  }

  // Session already submitted/paid/expired: no more items can be added
  if (session.status !== 'active') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">Pesanan sudah dikirim</h2>
          <p className="mt-2 text-gray-600">
            Sesi pemesanan untuk meja ini sudah ditutup. Untuk menambah pesanan, silakan hubungi
            staf kami.
          </p>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Offline Indicator */}
      <OfflineIndicator isOnline={isOnline} />

      {/* Offline Error Alert */}
      <OfflineErrorAlert show={showOfflineError} />

      {/* Header */}
      <MenuHeader
        sessionCode={session.sessionCode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        cartItemCount={cartItemCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Menu Grid */}
        {menuIsError ? (
          <ErrorState
            title="Gagal memuat menu"
            error={menuError}
            onRetry={() => refetchMenu()}
          />
        ) : (
          <MenuGrid
            items={filteredItems}
            onProductClick={openProductDetail}
            onAddToCart={(product) => addToCart(product)}
          />
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
      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={closeProductDetail}
        onAddToCart={handleAddToCartFromDetail}
        onImageClick={handleProductImageClick}
      />

      {/* Cart Drawer */}
      <CartDrawer
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onSubmitOrder={handleSubmitOrder}
        isSubmitting={isSubmitting}
        isError={isError}
        errorMessage={errorMessage}
        isOnline={isOnline}
      />
    </div>
  );
}
