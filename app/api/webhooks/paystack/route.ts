import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateOrderToPaid } from '@/lib/actions/order.actions';

export const runtime = 'nodejs';

type PaystackChargeSuccessEvent = {
  event: 'charge.success';
  data: {
    status: string;
    reference: string;
    amount: number; // in Kobo
    customer?: { email?: string };
    metadata?: { orderId?: string };
  };
};

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY as string;

    if (!secret) {
      return NextResponse.json({ message: 'Missing PAYSTACK_SECRET_KEY' }, { status: 500 });
    }

    const rawBody = await req.text();
    const computed = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (!signature || computed !== signature) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as Partial<PaystackChargeSuccessEvent> | Record<string, unknown>;

    // Handle successful charge events
    if ((event as PaystackChargeSuccessEvent)?.event === 'charge.success' && (event as PaystackChargeSuccessEvent)?.data?.status === 'success') {
      const data = (event as PaystackChargeSuccessEvent).data;
      const orderId = data?.metadata?.orderId as string | undefined;
      if (!orderId) {
        return NextResponse.json({ message: 'Missing orderId in metadata' }, { status: 400 });
      }

      await updateOrderToPaid({
        orderId,
        paymentResult: {
          id: data.reference,
          status: (data.status || 'COMPLETED').toUpperCase(),
          email_address: data.customer?.email || '',
          pricePaid: String(Number(data.amount) / 100),
        },
      });

      return NextResponse.json({ message: 'Order updated to paid' });
    }

    return NextResponse.json({ message: 'Event ignored' });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
  }
}


