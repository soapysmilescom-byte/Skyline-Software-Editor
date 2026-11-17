import {
  createUnlockReceiptToken,
  getRazorpayCredentials,
  parseJsonBody,
  sendJson,
  verifyLiveRazorpayPaymentStatus,
} from '../_razorpay';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) {
      return sendJson(res, 503, {
        error:
          'Razorpay gateway credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured in server environment variables.',
      });
    }

    const body = await parseJsonBody(req);
    const cleanId = String(body.paymentId || '').trim();
    if (!/^pay_[A-Za-z0-9]{8,}$/.test(cleanId)) {
      return sendJson(res, 400, {
        verified: false,
        error: 'Please enter a valid Razorpay Payment ID (starts with pay_...).',
      });
    }

    const liveCheck = await verifyLiveRazorpayPaymentStatus(cleanId, keyId, keySecret);
    if (!liveCheck.ok) {
      return sendJson(res, liveCheck.status, {
        verified: false,
        error: liveCheck.error,
      });
    }

    const receiptToken = createUnlockReceiptToken(liveCheck.payment.id, keySecret);

    return sendJson(res, 200, {
      success: true,
      verified: true,
      orderId: liveCheck.payment.order_id || undefined,
      paymentId: liveCheck.payment.id,
      amount: Math.round(Number(liveCheck.payment.amount) / 100),
      currency: liveCheck.payment.currency || 'INR',
      receiptToken,
    });
  } catch (err: any) {
    console.error('Error in /api/razorpay/verify-payment-id:', err);
    return sendJson(res, 500, {
      error: err?.message || 'Could not verify Razorpay Payment ID.',
    });
  }
}
