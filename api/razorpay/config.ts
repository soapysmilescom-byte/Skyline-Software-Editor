import {
  getRazorpayCredentials,
  sendJson,
  STUDIO_PRICE_INR,
  STUDIO_PRICE_PAISE,
} from '../_razorpay';

export default async function handler(_req: any, res: any) {
  const { keyId, keySecret } = getRazorpayCredentials();
  return sendJson(res, 200, {
    configured: Boolean(keyId && keySecret),
    priceInr: STUDIO_PRICE_INR,
    amountPaise: STUDIO_PRICE_PAISE,
    currency: 'INR',
  });
}
