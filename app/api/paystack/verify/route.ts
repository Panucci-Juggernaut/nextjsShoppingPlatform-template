import { NextRequest, NextResponse } from 'next/server';
import { updateOrderToPaid } from '@/lib/actions/order.actions';

export const runtime = 'nodejs';

type PaystackVerifyResponse = {
  status: boolean;
  message?: string;
  data?: {
    status?: string; // 'success' when payment is successful
    reference?: string;
    amount?: number; // kobo
    customer?: { email?: string } | null;
  } | null;
};

export async function POST(req: NextRequest) {
  try {
    const { reference, orderId } = (await req.json()) as { reference?: string; orderId?: string };
    if (!reference || !orderId) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY as string | undefined;
    if (!secret) {
      return NextResponse.json({ message: 'Missing PAYSTACK_SECRET_KEY' }, { status: 500 });
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = (await verifyRes.json()) as PaystackVerifyResponse;
    if (!verifyRes.ok || data.status !== true || data.data?.status !== 'success') {
      return NextResponse.json({ message: 'Verification failed' }, { status: 400 });
    }

    await updateOrderToPaid({
      orderId,
      paymentResult: {
        id: data.data?.reference ?? reference,
        status: (data.data?.status ?? 'COMPLETED').toUpperCase(),
        email_address: data.data?.customer?.email ?? '',
        pricePaid: String(Number(data.data?.amount ?? 0) / 100),
      },
    });

    return NextResponse.json({ message: 'Order paid' });
  } catch (error) {
    console.error('Paystack verify error:', error);
    return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
  }
}
