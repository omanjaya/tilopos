import type { CartItem, CustomerInfo, DeliveryMethod, OrderStatus, CheckoutStep } from '../types/storefront.types';
import { CustomerInfoForm } from './CustomerInfoForm';
import { DeliveryMethodSelect } from './DeliveryMethodSelect';
import { OrderSummary } from './OrderSummary';
import { clsx } from 'clsx';

interface CheckoutFlowProps {
  cart: CartItem[];
  checkoutStep: CheckoutStep;
  setCheckoutStep: (step: CheckoutStep) => void;
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  orderStatus: OrderStatus;
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
  orderStatus,
  submitOrder,
  onClose,
}: CheckoutFlowProps) {
  return (
    <div className={clsx('fixed inset-0 z-50', checkoutStep > 0 ? 'block' : 'hidden')}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl p-6 overflow-y-auto">
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
            onSubmit={submitOrder}
            onBack={() => setCheckoutStep(2)}
          />
        )}
      </div>
    </div>
  );
}
