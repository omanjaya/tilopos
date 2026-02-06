import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { SelfOrderMenuItem } from '@/types/self-order.types';
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
  ProductRecommendations,
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
  const { session, isLoading: sessionLoading } = useSession(sessionCode);
  const {
    filteredItems,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoading: menuLoading,
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

  const { orderStatus, orderNumber, submitOrder, resetOrder, isSubmitting, isError } = useOrder(
    sessionCode,
    () => {
      clearCart();
      setIsCartOpen(false);
    }
  );

  // Handle order submission
  const handleSubmitOrder = () => {
    const success = submitOrder(cart, isOnline);
    if (!success && !isOnline) {
      setShowOfflineError(true);
      setTimeout(() => setShowOfflineError(false), 5000);
    }
  };

  // Handle product detail modal add to cart
  const handleAddToCartFromDetail = (product: SelfOrderMenuItem) => {
    addToCart(product);
    closeProductDetail();
  };

  // Handle lightbox from product detail
  const handleProductImageClick = (imageUrl: string) => {
    openLightbox([imageUrl], 0);
  };

  // Loading state
  if (sessionLoading || menuLoading) {
    return <LoadingState />;
  }

  // Session not found
  if (!session && !sessionLoading) {
    return <SessionNotFound />;
  }

  // Order success state
  if (orderStatus === 'success' && orderNumber) {
    return (
      <OrderConfirmation
        orderNumber={orderNumber}
        total={cartTotal}
        estimatedTime={15}
        onViewStatus={() => resetOrder()}
        onNewOrder={() => resetOrder()}
      />
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
        sessionCode={session?.sessionCode}
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
        {/* Product Recommendations */}
        {selectedCategory === 'all' && !searchQuery && (
          <ProductRecommendations outletId={session?.outletId || ''} onAddToCart={addToCart} />
        )}

        {/* Menu Grid */}
        <MenuGrid
          items={filteredItems}
          onProductClick={openProductDetail}
          onAddToCart={addToCart}
        />
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
        isOnline={isOnline}
      />
    </div>
  );
}
