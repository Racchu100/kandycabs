'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface PaymentButtonProps {
  bookingId: string;
  amount: number; // in INR
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  onSuccess: (paymentId: string, orderId: string) => void;
  onFailure: (errorReason: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  bookingId,
  amount,
  customerName = 'Valued Rider',
  customerPhone = '+919845012345',
  customerEmail = 'customer@kandycabs.in',
  onSuccess,
  onFailure,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * On-Demand Lazy Loader for Razorpay Checkout SDK Script
   * Script is ONLY injected into DOM when customer initiates payment!
   */
  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleInitiatePayment = async () => {
    setIsLoading(true);

    try {
      // 1. Create Backend Payment Order
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, amount }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create payment order.');
      }

      const { order, keyId, isDemoMode } = orderData;

      // 2. Test / Demo Mode Fallback Handler
      if (isDemoMode) {
        setTimeout(async () => {
          const mockPaymentId = `pay_mock_${Date.now()}`;
          const mockSignature = `demo_sig_${Date.now()}`;

          // Authoritative backend verification call
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpayOrderId: order.id,
              razorpayPaymentId: mockPaymentId,
              razorpaySignature: mockSignature,
              bookingId,
            }),
          });

          const verifyData = await verifyRes.json();
          setIsLoading(false);

          if (verifyData.verified) {
            onSuccess(mockPaymentId, order.id);
          } else {
            onFailure(verifyData.error || 'Test payment verification failed.');
          }
        }, 1200);
        return;
      }

      // 3. Live Razorpay SDK Lazy Load & Open Checkout Modal
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        throw new Error('Failed to load Razorpay payment gateway script.');
      }

      const options = {
        key: keyId,
        amount: order.amountInPaise,
        currency: 'INR',
        name: 'Kandy Cabs Mangaluru',
        description: `Advance Payment for Booking #${bookingId}`,
        image: '/images/kandy-cabs-logo.svg',
        order_id: order.id,
        handler: async function (response: any) {
          try {
            // Authoritative server verification
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                bookingId,
              }),
            });

            const verifyData = await verifyRes.json();
            setIsLoading(false);

            if (verifyData.verified) {
              onSuccess(response.razorpay_payment_id, response.razorpay_order_id);
            } else {
              onFailure(verifyData.error || 'Payment signature verification failed.');
            }
          } catch {
            setIsLoading(false);
            onFailure('Error connecting to backend verification service.');
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#E02B1D',
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
            onFailure('Payment window was closed by user.');
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (resp: any) {
        setIsLoading(false);
        onFailure(resp.error?.description || 'Payment transaction failed.');
      });

      paymentObject.open();
    } catch (err: any) {
      setIsLoading(false);
      onFailure(err.message || 'Payment initialization error.');
    }
  };

  return (
    <Button
      type="button"
      variant="accent"
      fullWidth
      onClick={handleInitiatePayment}
      disabled={isLoading}
    >
      {isLoading ? 'Securing Gateway Connection...' : `Pay ₹${amount.toLocaleString()} Advance Now 🔒`}
    </Button>
  );
};
