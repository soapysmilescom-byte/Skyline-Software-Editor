import {
  createUnlockReceiptToken,
  getRazorpayCredentials,
  parseJsonBody,
  sendJson,
  STUDIO_PRICE_INR,
  verifyLiveRazorpayPaymentStatus,
  verifyRazorpaySignature,
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendJson(res, 400, {
        error: 'Missing Razorpay payment verification parameters.',
      });
    }

    const isSignatureValid = verifyRazorpaySignature(
      String(razorpay_order_id),
      String(razorpay_payment_id),
      String(razorpay_signature),
      keySecret
    );

    if (!isSignatureValid) {
      return sendJson(res, 400, {
        verified: false,
        error: 'Invalid Razorpay payment signature.',
      });
    }

    try {
      const liveCheck = await verifyLiveRazorpayPaymentStatus(
        String(razorpay_payment_id),
        keyId,
        keySecret
      );
      if (!liveCheck.ok) {
        return sendJson(res, liveCheck.status, {
          verified: false,
          error: liveCheck.error,
        });
      }
    } catch (fetchErr) {
      console.warn('Live Razorpay status check warning (signature valid):', fetchErr);
    }

    const receiptToken = createUnlockReceiptToken(String(razorpay_payment_id), keySecret);

    return sendJson(res, 200, {
      success: true,
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: STUDIO_PRICE_INR,
      currency: 'INR',
      receiptToken,
    });
  } catch (err: any) {
    console.error('Error in /api/razorpay/verify-payment:', err);
    return sendJson(res, 500, {
      error: err?.message || 'Payment verification failed',
    });
  }
}
