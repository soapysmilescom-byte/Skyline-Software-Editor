import crypto from 'crypto';

export const STUDIO_PRICE_INR = 299;
export const STUDIO_PRICE_PAISE = STUDIO_PRICE_INR * 100;

export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  return { keyId, keySecret };
}

export function sendJson(res: any, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

export async function parseJsonBody(req: any): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export async function verifyLiveRazorpayPaymentStatus(
  paymentId: string,
  keyId: string,
  keySecret: string
) {
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
          capData?.error?.description ||
          'Payment was authorized but could not be captured.',
      };
    }
    return { ok: true as const, payment: capData };
  }

  if (payment.status !== 'captured') {
    return {
      ok: false as const,
      status: 400,
      error: `Payment is currently "${payment.status}". Only completed payments can unlock video downloads.`,
    };
  }

  return { ok: true as const, payment };
}

export function createUnlockReceiptToken(paymentId: string, keySecret: string): string {
  return crypto.createHmac('sha256', keySecret).update(`unlock:${paymentId}`).digest('hex');
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const receivedBuf = Buffer.from(String(signature), 'utf8');

  return (
    expectedBuf.length === receivedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, receivedBuf)
  );
}
