export default async function handler(_req: any, res: any) {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      configured: Boolean(keyId && keySecret),
      priceInr: 299,
      amountPaise: 29900,
      currency: 'INR',
    })
  );
}
