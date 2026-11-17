import { PaymentDetails } from '../types';
import { getStoredItem, setStoredItem, removeStoredItem } from './storage';

export const STUDIO_PRICE_INR = 299;
export const RAZORPAY_PAYMENT_LINK = 'https://razorpay.com/payment-link/plink_TtDXwwASMRBR46';

const STORAGE_KEY_UNLOCKED = 'pixar_wedding_payment_unlocked';
const STORAGE_KEY_PAYMENT_DETAILS = 'pixar_wedding_payment_details';
const STORAGE_KEY_PAYMENT_SCREENSHOT = 'pixar_wedding_payment_screenshot';

// Event name for reactive cross-component synchronization
export const PAYMENT_UPDATE_EVENT = 'pixar_wedding_payment_updated';

export interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  priceInr: number;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerifyResponse {
  success: boolean;
  verified: boolean;
  orderId?: string;
  paymentId: string;
  amount: number;
  currency: string;
  receiptToken?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => {
      open: () => void;
      on: (event: string, handler: (response: any) => void) => void;
    };
  }
}

/**
 * Ensure Razorpay Standard Checkout script is loaded.
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(Boolean(window.Razorpay)), 1200);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

async function safeParseJsonResponse<T>(res: Response, fallbackError: string): Promise<T> {
  const rawText = await res.text();
  if (!rawText) {
    throw new Error(`${fallbackError} (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(
      `Payment server returned an unexpected response (HTTP ${res.status}). Check that API routes and Razorpay environment variables are configured.`
    );
  }
}

/**
 * Create a live ₹299 Razorpay Order on the backend.
 */
export async function createRazorpayOrder(
  itemName: string,
  coupleName?: string
): Promise<RazorpayOrderResponse> {
  const res = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemName, coupleName }),
  });

  const data = await safeParseJsonResponse<RazorpayOrderResponse & { error?: string }>(
    res,
    'Could not create Razorpay payment order.'
  );
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Could not create Razorpay payment order.');
  }
  return data;
}

/**
 * Verify a completed Razorpay Checkout payment via HMAC-SHA256 + Razorpay API on the backend.
 */
export async function verifyRazorpayPayment(
  payload: RazorpayVerifyPayload
): Promise<RazorpayVerifyResponse> {
  const res = await fetch('/api/razorpay/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await safeParseJsonResponse<RazorpayVerifyResponse & { error?: string }>(
    res,
    'Razorpay payment verification failed.'
  );
  if (!res.ok || !data.verified) {
    throw new Error(data.error || 'Razorpay payment verification failed.');
  }
  return data;
}

/**
 * Verify an existing Razorpay Payment ID (starts with pay_...) directly against Razorpay's API.
 */
export async function verifyRazorpayPaymentId(
  paymentId: string
): Promise<RazorpayVerifyResponse> {
  const res = await fetch('/api/razorpay/verify-payment-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId }),
  });

  const data = await safeParseJsonResponse<RazorpayVerifyResponse & { error?: string }>(
    res,
    'Could not verify this Razorpay Payment ID.'
  );
  if (!res.ok || !data.verified) {
    throw new Error(data.error || 'Could not verify this Razorpay Payment ID.');
  }
  return data;
}

/**
 * Open the fallback Razorpay payment link directly in a new tab.
 */
export function redirectToRazorpay(): void {
  if (typeof window === 'undefined') return;
  try {
    const anchor = document.createElement('a');
    anchor.href = RAZORPAY_PAYMENT_LINK;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } catch (err) {
    console.warn('[payment] Direct redirect fallback:', err);
    window.location.href = RAZORPAY_PAYMENT_LINK;
  }
}

/**
 * Synchronous check for UI rendering (reads from localStorage).
 * Requires a genuinely Razorpay-verified ₹299 gateway transaction.
 */
export function isPaymentUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY_UNLOCKED);
    if (val !== 'true') return false;

    const local = localStorage.getItem(STORAGE_KEY_PAYMENT_DETAILS);
    if (!local) return false;
    const details = JSON.parse(local) as PaymentDetails;
    return Boolean(
      details.isUnlocked &&
        details.verifiedGateway === true &&
        details.paymentId
    );
  } catch {
    return false;
  }
}

/**
 * Retrieve saved payment metadata.
 */
export function getPaymentDetails(): PaymentDetails {
  if (typeof window === 'undefined') {
    return { isUnlocked: false };
  }
  try {
    const local = localStorage.getItem(STORAGE_KEY_PAYMENT_DETAILS);
    if (local) {
      return JSON.parse(local) as PaymentDetails;
    }
  } catch (e) {
    console.warn('[payment] Failed to parse local payment details:', e);
  }
  return {
    isUnlocked: false,
  };
}

/**
 * Retrieve the full base64 screenshot from IndexedDB (or fallback to localStorage).
 */
export async function getFullPaymentScreenshot(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const idbScreenshot = await getStoredItem<string>(STORAGE_KEY_PAYMENT_SCREENSHOT);
    if (idbScreenshot) return idbScreenshot;
  } catch (e) {
    console.warn('[payment] Error reading screenshot from IndexedDB:', e);
  }

  const details = getPaymentDetails();
  return details.screenshotUrl || null;
}

/**
 * Persist unlocked payment state (from verified Razorpay gateway transaction).
 */
export async function setPaymentUnlocked(
  paymentIdOrData?:
    | string
    | {
        paymentId?: string;
        orderId?: string;
        verifiedGateway?: boolean;
        receiptToken?: string;
        orderAmount?: string;
        screenshotUrl?: string;
        screenshotName?: string;
        screenshotSize?: string;
      },
  optionalScreenshotUrl?: string
): Promise<void> {
  let paymentId: string | undefined;
  let orderId: string | undefined;
  let verifiedGateway = false;
  let receiptToken: string | undefined;
  let orderAmount = String(STUDIO_PRICE_INR);
  let screenshotUrl: string | undefined;
  let screenshotName: string | undefined;
  let screenshotSize: string | undefined;

  if (typeof paymentIdOrData === 'object' && paymentIdOrData !== null) {
    paymentId = paymentIdOrData.paymentId;
    orderId = paymentIdOrData.orderId;
    verifiedGateway = Boolean(paymentIdOrData.verifiedGateway);
    receiptToken = paymentIdOrData.receiptToken;
    orderAmount = paymentIdOrData.orderAmount || String(STUDIO_PRICE_INR);
    screenshotUrl = paymentIdOrData.screenshotUrl;
    screenshotName = paymentIdOrData.screenshotName;
    screenshotSize = paymentIdOrData.screenshotSize;
  } else {
    paymentId = paymentIdOrData;
    screenshotUrl = optionalScreenshotUrl;
  }

  const generatedId = paymentId?.trim() || `RZP_${Date.now().toString(36).toUpperCase()}`;

  const details: PaymentDetails = {
    isUnlocked: true,
    paymentId: generatedId,
    orderId,
    verifiedGateway,
    receiptToken,
    unlockedAt: new Date().toISOString(),
    orderAmount,
    currency: 'INR',
    screenshotUrl: screenshotUrl || '',
    screenshotName: screenshotName || 'Razorpay Gateway Verified',
    screenshotSize: screenshotSize || `₹${STUDIO_PRICE_INR} Paid`,
  };

  try {
    localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
    let detailsToStore = details;
    if (screenshotUrl && screenshotUrl.length > 1500000) {
      detailsToStore = {
        ...details,
        screenshotUrl: screenshotUrl.substring(0, 1000) + '...[full stored in IndexedDB]',
      };
    }
    localStorage.setItem(STORAGE_KEY_PAYMENT_DETAILS, JSON.stringify(detailsToStore));
  } catch (e) {
    console.warn('[payment] LocalStorage write error, attempting fallback:', e);
    try {
      const minimalDetails: PaymentDetails = {
        isUnlocked: true,
        paymentId: generatedId,
        orderId,
        verifiedGateway,
        receiptToken,
        unlockedAt: details.unlockedAt,
        orderAmount,
        currency: 'INR',
        screenshotName: details.screenshotName,
        screenshotSize: details.screenshotSize,
      };
      localStorage.setItem(STORAGE_KEY_PAYMENT_DETAILS, JSON.stringify(minimalDetails));
    } catch {
      // ignore
    }
  }

  try {
    await setStoredItem(STORAGE_KEY_UNLOCKED, true);
    await setStoredItem(STORAGE_KEY_PAYMENT_DETAILS, details);
    if (screenshotUrl) {
      await setStoredItem(STORAGE_KEY_PAYMENT_SCREENSHOT, screenshotUrl);
    }
  } catch (err) {
    console.warn('[payment] IndexedDB write error:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PAYMENT_UPDATE_EVENT, {
        detail: details,
      })
    );
  }
}

/**
 * Reset payment status.
 */
export async function resetPaymentStatus(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY_UNLOCKED);
    localStorage.removeItem(STORAGE_KEY_PAYMENT_DETAILS);
  } catch {
    // ignore
  }

  try {
    await removeStoredItem(STORAGE_KEY_UNLOCKED);
    await removeStoredItem(STORAGE_KEY_PAYMENT_DETAILS);
    await removeStoredItem(STORAGE_KEY_PAYMENT_SCREENSHOT);
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PAYMENT_UPDATE_EVENT, {
        detail: { isUnlocked: false },
      })
    );
  }
}

/**
 * Subscribe to payment state changes.
 */
export function subscribeToPaymentChanges(callback: (details: PaymentDetails) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const custom = e as CustomEvent<PaymentDetails>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getPaymentDetails());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_UNLOCKED || e.key === STORAGE_KEY_PAYMENT_DETAILS) {
      callback(getPaymentDetails());
    }
  };

  window.addEventListener(PAYMENT_UPDATE_EVENT, handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(PAYMENT_UPDATE_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
