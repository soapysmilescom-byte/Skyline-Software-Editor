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
          'Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are missing in Vercel Environment Variables. Add them in Vercel Project Settings -> Environment Variables and redeploy.',
      });
    }

    const body = await readBody(req);
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

    const rawText = await rzpResponse.text();
    let rzpData: any = {};
    try {
      rzpData = rawText ? JSON.parse(rawText) : {};
    } catch {
      rzpData = { error: { description: rawText || 'Invalid response from Razorpay API' } };
    }

    if (!rzpResponse.ok || !rzpData?.id) {
      return sendJson(res, rzpResponse.status || 502, {
        error:
          rzpData?.error?.description ||
          'Could not initialize Razorpay order. Please check your Razorpay keys.',
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
