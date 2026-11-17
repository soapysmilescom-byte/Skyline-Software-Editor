import { getRazorpayCredentials, sendJson, STUDIO_PRICE_INR } from './_razorpay';

export default async function handler(_req: any, res: any) {
  const { keyId, keySecret } = getRazorpayCredentials();
  return sendJson(res, 200, {
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasRazorpay: Boolean(keyId && keySecret),
    priceInr: STUDIO_PRICE_INR,
  });
}
