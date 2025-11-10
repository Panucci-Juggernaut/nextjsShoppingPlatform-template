'use client';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

type PaystackPaymentProps = {
  amountInKobo: number;
  orderId: string;
  email: string;
  publicKey: string;
};

const PaystackPayment = ({ amountInKobo, orderId, email, publicKey }: PaystackPaymentProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const reference = useMemo(() => `${orderId}-${Date.now()}`, [orderId]);

  const startPayment = async () => {
    setErrorMessage('');
    if (!publicKey) {
      setErrorMessage('Paystack public key is not configured.');
      return;
    }
    setIsLoading(true);
    try {
      // Dynamically import to avoid SSR issues
      const PaystackPop = (await import('@paystack/inline-js')).default as typeof import('@paystack/inline-js').default;
      const paystack = new PaystackPop();

      paystack.newTransaction({
        key: publicKey,
        email,
        amount: amountInKobo, // Kobo
        reference,
        currency: 'NGN',
        metadata: { orderId },
        onSuccess: async () => {
          try {
            await fetch('/api/paystack/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference, orderId }),
            });
          } catch {
            // Swallow; page will revalidate via server action
          }
        },
        onCancel: () => {
          // do nothing
        },
      });
    } catch {
      setErrorMessage('Unable to initialize Paystack.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-2'>
      <div className='text-xl'>Paystack Checkout</div>
      {errorMessage && <div className='text-destructive'>{errorMessage}</div>}
      <Button className='w-full' size='lg' disabled={isLoading} onClick={startPayment}>
        {isLoading ? 'Processing...' : `Pay ${formatCurrency(amountInKobo / 100)}`}
      </Button>
    </div>
  );
};

export default PaystackPayment;
