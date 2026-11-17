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

async function verifyLiveStatus(paymentId: string, keyId: string, keySecret: string) {
  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const resp = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Basic ${authHeader}` },
    }
  );

  const payment: any = await resp.json();
  if (!resp.ok || !payment?.id) {
    return {
      ok: false as const,
      status: resp.status || 400,
      error: payment?.error?.description || 'Payment ID not found on Razorpay.',
    };
  }

  if (payment.currency !== 'INR' || Number(payment.amount) < STUDIO_PRICE_PAISE) {
    return {
      ok: false as const,
      status: 400,
      error: `Payment amount must be at least ₹${STUDIO_PRICE_INR} INR.`,
    };
  }

  if (payment.status === 'authorized') {
    const capResp = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`,
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
      return {
        ok: false as const,
        status: 400,
        error:
          capData?.error?.description || 'Payment was authorized but could not be captured.',
      };
    }
    return { ok: true as const, payment: capData };
  }

  if (payment.status !== 'captured') {
    return {
      ok: false as const,
      status: 400,
      error: `Payment is currently "${payment.status}". Only completed payments unlock downloads.`,
    };
  }

  return { ok: true as const, payment };
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendJson(res, 400, {
        error: 'Missing Razorpay payment verification parameters.',
      });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(String(razorpay_signature), 'utf8');

    const isSignatureValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isSignatureValid) {
      return sendJson(res, 400, {
        verified: false,
        error: 'Invalid Razorpay payment signature.',
      });
    }

    try {
      const liveCheck = await verifyLiveStatus(
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

    const receiptToken = crypto
      .createHmac('sha256', keySecret)
      .update(`unlock:${razorpay_payment_id}`)
      .digest('hex');

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
