import crypto from 'crypto';

const STUDIO_PRICE_INR = 299;
const STUDIO_PRICE_PAISE = STUDIO_PRICE_INR * 100;

function sendJson(res: any, statusCode: number, payload: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

async function readBody(req: any): Promise<Record<string, any>> {
  if (req?.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req?.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req?.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    if (!req || typeof req.on !== 'function' || req.readableEnded) {
      resolve({});
      return;
    }
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';

    if (!keyId || !keySecret) {
      return sendJson(res, 503, {
        error:
          'Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are missing in Vercel Environment Variables.',
      });
    }

    const body = await readBody(req);
    const cleanId = String(body.paymentId || '').trim();
    if (!/^pay_[A-Za-z0-9]{8,}$/.test(cleanId)) {
      return sendJson(res, 400, {
        verified: false,
        error: 'Please enter a valid Razorpay Payment ID (starts with pay_...).',
      });
    }

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const resp = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(cleanId)}`,
      {
        method: 'GET',
        headers: { Authorization: `Basic ${authHeader}` },
      }
    );

    let payment: any = await resp.json();
    if (!resp.ok || !payment?.id) {
      return sendJson(res, resp.status || 400, {
        verified: false,
        error: payment?.error?.description || 'Payment ID not found on Razorpay.',
      });
    }

    if (payment.currency !== 'INR' || Number(payment.amount) < STUDIO_PRICE_PAISE) {
      return sendJson(res, 400, {
        verified: false,
        error: `Payment amount must be at least ₹${STUDIO_PRICE_INR} INR.`,
      });
    }

    if (payment.status === 'authorized') {
      const capResp = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(cleanId)}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: payment.amount,
            currency: payment.currency,
          }),
        }
      );
      const capData: any = await capResp.json();
      if (!capResp.ok || capData?.status !== 'captured') {
        return sendJson(res, 400, {
          verified: false,
          error:
            capData?.error?.description || 'Payment was authorized but could not be captured.',
        });
      }
      payment = capData;
    }

    if (payment.status !== 'captured') {
      return sendJson(res, 400, {
        verified: false,
        error: `Payment is currently "${payment.status}". Only completed payments can unlock video downloads.`,
      });
    }

    const receiptToken = crypto
      .createHmac('sha256', keySecret)
      .update(`unlock:${payment.id}`)
      .digest('hex');

    return sendJson(res, 200, {
      success: true,
      verified: true,
      orderId: payment.order_id || undefined,
      paymentId: payment.id,
      amount: Math.round(Number(payment.amount) / 100),
      currency: payment.currency || 'INR',
      receiptToken,
    });
  } catch (err: any) {
    console.error('Error in /api/razorpay/verify-payment-id:', err);
    return sendJson(res, 500, {
      error: err?.message || 'Could not verify Razorpay Payment ID.',
    });
  }
}
