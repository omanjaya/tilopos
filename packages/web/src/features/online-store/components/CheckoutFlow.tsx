import type { CartItem, CustomerInfo, DeliveryMethod, OrderStatus, CheckoutStep } from '../types/storefront.types';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { CustomerInfoForm } from './CustomerInfoForm';
import { DeliveryMethodSelect } from './DeliveryMethodSelect';
import { OrderSummary } from './OrderSummary';

interface CheckoutFlowProps {
  cart: CartItem[];
  checkoutStep: CheckoutStep;
  setCheckoutStep: (step: CheckoutStep) => void;
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
  orderStatus: OrderStatus;
  errorMessage: string | null;
  submitOrder: () => void;
  onClose: () => void;
}

export function CheckoutFlow({
  cart,
  checkoutStep,
  setCheckoutStep,
  customerInfo,
  setCustomerInfo,
  deliveryMethod,
  setDeliveryMethod,
  isDeliveryEnabled,
  isPickupEnabled,
  orderStatus,
  errorMessage,
  submitOrder,
  onClose,
}: CheckoutFlowProps) {
  return (
    <Sheet
      open={checkoutStep > 0}
      onOpenChange={(isOpen) => !isOpen && orderStatus !== 'submitting' && onClose()}
    >
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto p-6 sm:max-w-2xl">
        <SheetTitle className="sr-only">Checkout</SheetTitle>
        <SheetDescription className="sr-only">Lengkapi data untuk membuat pesanan</SheetDescription>
        {checkoutStep === 1 && (
          <CustomerInfoForm
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
            onNext={() => setCheckoutStep(2)}
            onCancel={onClose}
          />
        )}

        {checkoutStep === 2 && (
          <DeliveryMethodSelect
            deliveryMethod={deliveryMethod}
            setDeliveryMethod={setDeliveryMethod}
            isDeliveryEnabled={isDeliveryEnabled}
            isPickupEnabled={isPickupEnabled}
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
            onNext={() => setCheckoutStep(3)}
            onBack={() => setCheckoutStep(1)}
          />
        )}

        {checkoutStep === 3 && (
          <OrderSummary
            cart={cart}
            deliveryMethod={deliveryMethod}
            orderStatus={orderStatus}
            errorMessage={errorMessage}
            onSubmit={submitOrder}
            onBack={() => setCheckoutStep(2)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
