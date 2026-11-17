import {
  getRazorpayCredentials,
  parseJsonBody,
  sendJson,
  STUDIO_PRICE_INR,
  STUDIO_PRICE_PAISE,
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
    const { itemName = 'Pixar Wedding Video Studio Pass', coupleName = '' } = body;
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const receipt = `wedtale_${Date.now().toString(36)}`;

    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: STUDIO_PRICE_PAISE,
        currency: 'INR',
        receipt,
        partial_payment: false,
        notes: {
          product: String(itemName).slice(0, 120),
          couple: String(coupleName).slice(0, 80),
          plan: 'Unlimited HD/4K Studio Pass',
        },
      }),
    });

    const rzpData: any = await rzpResponse.json();
    if (!rzpResponse.ok || !rzpData?.id) {
      console.error('Razorpay order creation failed:', rzpData);
      return sendJson(res, rzpResponse.status || 502, {
        error:
          rzpData?.error?.description ||
          'Could not initialize Razorpay order. Please try again.',
      });
    }

    return sendJson(res, 200, {
      success: true,
      orderId: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      keyId,
      priceInr: STUDIO_PRICE_INR,
    });
  } catch (err: any) {
    console.error('Error in /api/razorpay/create-order:', err);
    return sendJson(res, 500, {
      error: err?.message || 'Failed to create Razorpay order',
    });
  }
}
