import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Download,
  AlertCircle,
  CreditCard,
  Check,
  RefreshCw,
  ArrowRight,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Loader2,
  KeyRound,
} from 'lucide-react';
import {
  STUDIO_PRICE_INR,
  isPaymentUnlocked,
  setPaymentUnlocked,
  subscribeToPaymentChanges,
  getPaymentDetails,
  resetPaymentStatus,
  loadRazorpayCheckoutScript,
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyRazorpayPaymentId,
} from '../utils/payment';
import { romanticAudio } from '../utils/audioEngine';
import { BrandLogo } from './BrandLogo';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
  targetItemName?: string;
  coupleName?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  targetItemName = 'Full HD Video & Invitation Card',
  coupleName = '',
}) => {
  const [unlocked, setUnlocked] = useState<boolean>(isPaymentUnlocked());
  const [isLaunchingGateway, setIsLaunchingGateway] = useState<boolean>(false);
  const [isVerifyingGateway, setIsVerifyingGateway] = useState<boolean>(false);
  const [showVerifyExisting, setShowVerifyExisting] = useState<boolean>(false);

  const [paymentIdInput, setPaymentIdInput] = useState<string>('');
  const [isVerifyingExisting, setIsVerifyingExisting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setUnlocked(isPaymentUnlocked());
    const details = getPaymentDetails();
    if (details.paymentId && details.verifiedGateway) {
      setPaymentIdInput(details.paymentId);
    } else {
      setPaymentIdInput('');
    }

    loadRazorpayCheckoutScript();

    const unsubscribe = subscribeToPaymentChanges((updatedDetails) => {
      setUnlocked(Boolean(updatedDetails.isUnlocked && updatedDetails.verifiedGateway));
    });

    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePayWithRazorpay = async () => {
    setErrorMsg(null);
    setIsLaunchingGateway(true);

    try {
      const scriptLoaded = await loadRazorpayCheckoutScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          'Could not load Razorpay Checkout. Please check your internet connection and try again.'
        );
      }

      const order = await createRazorpayOrder(targetItemName, coupleName);

      const options: Record<string, any> = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Pixar Wedding Video Studio',
        description: `Studio Pass ₹${STUDIO_PRICE_INR} — ${targetItemName}`,
        order_id: order.orderId,
        retry: {
          enabled: true,
        },
        notes: {
          item: targetItemName,
          couple: coupleName || 'Wedding Couple',
        },
        theme: {
          color: '#9333EA',
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsLaunchingGateway(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setIsLaunchingGateway(false);
          setIsVerifyingGateway(true);
          setErrorMsg(null);

          try {
            const verified = await verifyRazorpayPayment(response);
            await setPaymentUnlocked({
              paymentId: verified.paymentId,
              orderId: verified.orderId,
              verifiedGateway: true,
              receiptToken: verified.receiptToken,
              orderAmount: String(verified.amount || STUDIO_PRICE_INR),
              screenshotName: 'Razorpay Instant Gateway Verified',
              screenshotSize: `₹${STUDIO_PRICE_INR} Paid`,
            });
            setUnlocked(true);
            romanticAudio.playSparkleChime();

            setTimeout(() => {
              if (onPaymentSuccess) onPaymentSuccess();
            }, 600);
          } catch (verifyErr: any) {
            setErrorMsg(
              verifyErr?.message ||
                'Payment completed, but verification could not finish. Enter your Razorpay Payment ID below to verify.'
            );
            setShowVerifyExisting(true);
          } finally {
            setIsVerifyingGateway(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failureResp: any) => {
        setIsLaunchingGateway(false);
        const reason =
          failureResp?.error?.description ||
          failureResp?.error?.reason ||
          'Payment could not be completed. Please try another UPI app, card, or wallet.';
        setErrorMsg(reason);
      });

      rzp.open();
      setIsLaunchingGateway(false);
    } catch (err: any) {
      console.error('Razorpay Checkout error:', err);
      setIsLaunchingGateway(false);
      setErrorMsg(err?.message || 'Unable to launch Razorpay Checkout. Please try again.');
    }
  };

  const handleVerifyExistingPaymentId = async () => {
    const trimmed = paymentIdInput.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your Razorpay Payment ID (starts with pay_...).');
      return;
    }

    setIsVerifyingExisting(true);
    setErrorMsg(null);

    try {
      const verified = await verifyRazorpayPaymentId(trimmed);
      await setPaymentUnlocked({
        paymentId: verified.paymentId,
        orderId: verified.orderId,
        verifiedGateway: true,
        receiptToken: verified.receiptToken,
        orderAmount: String(verified.amount || STUDIO_PRICE_INR),
        screenshotName: 'Razorpay Live Payment Verified',
        screenshotSize: `₹${verified.amount || STUDIO_PRICE_INR} Paid`,
      });
      setUnlocked(true);
      romanticAudio.playSparkleChime();

      setTimeout(() => {
        if (onPaymentSuccess) onPaymentSuccess();
      }, 600);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Could not verify this Payment ID on Razorpay. Ensure it is a completed ₹299 payment.'
      );
    } finally {
      setIsVerifyingExisting(false);
    }
  };

  const paymentDetails = getPaymentDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-amber-500/45 shadow-2xl px-4 pt-3 pb-6 sm:p-7 text-white overflow-hidden max-h-[92dvh] flex flex-col pb-safe">
        {/* Mobile Bottom Sheet Handle */}
        <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" />

        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-gradient-to-b from-amber-500/15 via-purple-500/10 to-transparent blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-950/80 hover:bg-purple-950 text-slate-300 hover:text-white transition z-10"
          aria-label="Close payment modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4 flex-shrink-0 relative pt-1">
          <div className="flex justify-center mb-2.5">
            <BrandLogo size="lg" showWordmark />
          </div>

          <div className="text-xs font-semibold text-amber-300 mb-1">
            {unlocked ? 'Studio Pass Verified' : `One-Time Payment · ₹${STUDIO_PRICE_INR}`}
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-white font-cinzel tracking-wide">
            {unlocked ? 'Ready to Download HD Video' : 'Pay ₹299 to Download Video'}
          </h3>
          <p className="text-xs text-purple-200/80 mt-1 max-w-sm mx-auto">
            {unlocked
              ? 'Your ₹299 Razorpay payment is confirmed. Enjoy unlimited 1080p/4K video and card downloads.'
              : `Complete a one-time ₹${STUDIO_PRICE_INR} Razorpay payment to unlock ${targetItemName} immediately.`}
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto pr-0.5 space-y-4 flex-1">
          {unlocked ? (
            /* VERIFIED PAID STATE */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-950 border border-emerald-500/60 text-emerald-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-base">Razorpay Payment Verified</h4>
                    <p className="text-xs text-emerald-200/80 truncate">
                      Payment ID:{' '}
                      <span className="font-mono tabular-nums text-amber-300 font-semibold">
                        {paymentDetails.paymentId}
                      </span>
                    </p>
                    {paymentDetails.orderId && (
                      <p className="text-[11px] text-emerald-300/70 font-mono truncate">
                        Order: {paymentDetails.orderId} · ₹{paymentDetails.orderAmount || STUDIO_PRICE_INR}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 border-t border-emerald-900/60 pt-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Unlimited 4K/1080p Video & Cards Unlocked</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onPaymentSuccess) onPaymentSuccess();
                }}
                className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400 hover:from-emerald-400 hover:via-teal-400 hover:to-amber-300 text-slate-950 font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <Download className="w-5 h-5 text-slate-950" />
                <span>Download Video Now</span>
              </button>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-purple-950">
                <button
                  type="button"
                  onClick={() => setUnlocked(false)}
                  className="min-h-[40px] text-purple-300 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Pay with Another Account</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await resetPaymentStatus();
                    setUnlocked(false);
                    setPaymentIdInput('');
                  }}
                  className="min-h-[40px] text-pink-400 hover:underline"
                >
                  Reset Status
                </button>
              </div>
            </div>
          ) : (
            /* UNPAID STATE: Live Razorpay Checkout ₹299 */
            <div className="space-y-4">
              {/* Studio Pass Price & Benefits Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3">
                <div className="flex items-baseline justify-between gap-2 pb-2.5 border-b border-purple-900/40">
                  <div>
                    <div className="text-sm font-bold text-white">All-Access Studio Pass</div>
                    <div className="text-xs text-slate-400">One-time ₹299 · Unlocks instant download</div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-amber-300 font-cinzel tabular-nums">
                      ₹{STUDIO_PRICE_INR}
                    </span>
                    <span className="text-xs text-slate-400 block">INR</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Render & download Full HD 1080p / 4K video with synced music</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Save directly to iPhone Photos, Android Gallery, or Laptop</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Includes Save-The-Date PNG card & all 21 cultural themes</span>
                  </li>
                </ul>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Primary CTA: Launch Razorpay Checkout */}
              <button
                type="button"
                onClick={handlePayWithRazorpay}
                disabled={isLaunchingGateway || isVerifyingGateway}
                className="w-full min-h-[54px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-400 hover:via-pink-400 hover:to-purple-500 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-purple-950/50 flex items-center justify-between transition active:scale-[0.98] disabled:opacity-70"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-xl bg-slate-950/20">
                    {isLaunchingGateway || isVerifyingGateway ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-slate-950" />
                    )}
                  </div>
                  <div>
                    <div>
                      {isVerifyingGateway
                        ? 'Verifying ₹299 Payment...'
                        : isLaunchingGateway
                        ? 'Opening Razorpay...'
                        : `Pay ₹${STUDIO_PRICE_INR} with Razorpay`}
                    </div>
                    <div className="text-[11px] font-medium text-slate-900">
                      UPI (GPay, PhonePe, Paytm), Cards & NetBanking
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-950 flex-shrink-0" />
              </button>

              {/* Trust Strip */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-300">
                <div className="p-2 rounded-xl bg-slate-950/70 border border-purple-900/30">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
                  <span>Razorpay Live</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-purple-900/30">
                  <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-0.5" />
                  <span>Auto-Download</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-purple-900/30">
                  <Smartphone className="w-4 h-4 text-pink-400 mx-auto mb-0.5" />
                  <span>UPI Ready</span>
                </div>
              </div>

              {/* Verify Existing Razorpay Payment ID directly via Razorpay API */}
              <div className="border-t border-purple-900/40 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVerifyExisting((v) => !v)}
                  className="w-full min-h-[40px] flex items-center justify-between text-xs text-purple-300 hover:text-white transition px-1"
                >
                  <span>Already paid ₹299? Verify Razorpay Payment ID</span>
                  {showVerifyExisting ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showVerifyExisting && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-purple-800/60 space-y-3">
                    <p className="text-[11px] text-slate-400">
                      Paste your captured Razorpay Payment ID (starts with <code className="text-amber-300">pay_</code>) to verify with Razorpay and unlock downloads.
                    </p>
                    <input
                      type="text"
                      value={paymentIdInput}
                      onChange={(e) => setPaymentIdInput(e.target.value)}
                      placeholder="e.g. pay_Q1abcXYZ123456"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/70 focus:border-amber-400 text-base sm:text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyExistingPaymentId}
                      disabled={isVerifyingExisting}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
                    >
                      {isVerifyingExisting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      <span>
                        {isVerifyingExisting ? 'Checking with Razorpay...' : 'Verify Payment ID & Unlock'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
