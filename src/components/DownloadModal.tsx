import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Calendar,
  Film,
  CalendarCheck,
  Share2,
  Copy,
  Check,
  Sparkles,
  Loader2,
  FileImage,
  Smartphone,
  Laptop,
  RotateCcw,
  CheckCircle2,
  Info,
  Volume2,
  Lock,
  CreditCard,
} from 'lucide-react';
import { CoupleData, SceneItem, AspectRatioType, VideoQuality, ExportedVideoData } from '../types';
import { downloadCalendarEvent, getGoogleCalendarUrl, formatRomanticDate } from '../utils/calendarExport';
import { VideoRenderer, detectBestVideoMimeType } from '../utils/videoRenderer';
import { isPaymentUnlocked, subscribeToPaymentChanges, STUDIO_PRICE_INR } from '../utils/payment';
import { PaymentModal } from './PaymentModal';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  couple: CoupleData;
  scenes: SceneItem[];
  aspectRatio: AspectRatioType;
  defaultTab?: 'date' | 'video';
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  couple,
  scenes,
  aspectRatio,
  defaultTab = 'date',
}) => {
  const [activeTab, setActiveTab] = useState<'date' | 'video'>(defaultTab);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>('1080p');
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const [exportedVideo, setExportedVideo] = useState<ExportedVideoData | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSharingToPhone, setIsSharingToPhone] = useState<boolean>(false);
  const [cardQuality, setCardQuality] = useState<VideoQuality>('1080p');
  const [isExportingCard, setIsExportingCard] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(isPaymentUnlocked());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentTargetItem, setPaymentTargetItem] = useState<string>('Full HD Wedding Video');
  const [pendingAction, setPendingAction] = useState<'video' | 'card' | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setIsPaid(isPaymentUnlocked());
    const unsubscribe = subscribeToPaymentChanges((details) => {
      setIsPaid(Boolean(details.isUnlocked && details.verifiedGateway));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSaveSuccessMsg(null);
      setExportErrorMsg(null);
      setIsPaid(isPaymentUnlocked());
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const formattedDate = formatRomanticDate(couple.weddingDate);
  const mimeInfo = detectBestVideoMimeType();

  const getResolutionSpecs = (quality: VideoQuality) => {
    if (aspectRatio === '9:16') {
      if (quality === '4k')
        return {
          label: '2160 × 3840 (4K Cinema Vertical)',
          badge: '4K Ultra HD',
          desc: 'Maximum crispness for TV & Projectors',
        };
      if (quality === '1080p')
        return {
          label: '1080 × 1920 (Full HD Reel)',
          badge: '1080p Full HD',
          desc: 'Standard for iPhone/Android Gallery & Instagram Reels',
        };
      return {
        label: '720 × 1280 (Standard HD)',
        badge: '720p HD',
        desc: 'Smaller file size, fast render',
      };
    } else {
      if (quality === '4k')
        return {
          label: '3840 × 2160 (4K Cinema Widescreen)',
          badge: '4K Ultra HD',
          desc: 'Maximum crispness for Big Screen TV',
        };
      if (quality === '1080p')
        return {
          label: '1920 × 1080 (Full HD Cinema)',
          badge: '1080p Full HD',
          desc: 'Standard for Laptops, YouTube & TV Displays',
        };
      return {
        label: '1280 × 720 (Standard HD)',
        badge: '720p HD',
        desc: 'Smaller file size, fast render',
      };
    }
  };

  const runDateCardDownload = async () => {
    setIsExportingCard(true);
    setExportErrorMsg(null);
    try {
      const offscreenCanvas = document.createElement('canvas');
      const renderer = new VideoRenderer(offscreenCanvas);
      const scene4 = scenes.find((s) => s.tag === 'scene4') || scenes[scenes.length - 1];
      await renderer.preloadImages(scenes);

      const dataUrl = renderer.exportInvitationCardDataUrl(couple, aspectRatio, scene4, cardQuality);

      const cleanBride = couple.brideName.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Bride';
      const cleanGroom = couple.groomName.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Groom';
      const fileName = `${cleanBride}_and_${cleanGroom}_Save_The_Date_Card_HD.png`;

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${couple.brideName} & ${couple.groomName} Wedding Card`,
            text: `Save our date: ${formattedDate}`,
          });
          setSaveSuccessMsg('Card sent to device / Photos gallery!');
          setTimeout(() => setSaveSuccessMsg(null), 4000);
          setIsExportingCard(false);
          return;
        } catch {
          // User cancelled share or fallback to download
        }
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSaveSuccessMsg('High-Res Invitation Card downloaded to your device!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (e) {
      console.error('Failed to export date card image:', e);
      setExportErrorMsg('Could not generate the invitation card. Please try again.');
    } finally {
      setIsExportingCard(false);
    }
  };

  const handleDownloadDateCard = async () => {
    if (!isPaymentUnlocked()) {
      setPendingAction('card');
      setPaymentTargetItem('Save The Date Card (PNG)');
      setIsPaymentModalOpen(true);
      return;
    }
    await runDateCardDownload();
  };

  const runVideoExport = async () => {
    setIsExportingVideo(true);
    setExportProgress(0);
    setExportErrorMsg(null);
    setExportStatusText('Initializing 3D renderer & audio engine...');
    setSaveSuccessMsg(null);

    try {
      const offscreenCanvas = document.createElement('canvas');
      const renderer = new VideoRenderer(offscreenCanvas);

      const result = await renderer.exportVideo(
        scenes,
        couple,
        aspectRatio,
        selectedQuality,
        (pct, status) => {
          setExportProgress(pct);
          if (status) setExportStatusText(status);
        }
      );

      setExportedVideo(result);
      setSaveSuccessMsg('Your HD video is ready! Tap a download button below to save it.');
    } catch (e) {
      console.error('Failed to export video:', e);
      setExportErrorMsg('Video export encountered an issue. Please try again in Chrome or Safari.');
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
      setExportStatusText('');
    }
  };

  const handleExportVideo = async () => {
    if (!isPaymentUnlocked()) {
      setPendingAction('video');
      setPaymentTargetItem(`Full HD (${selectedQuality.toUpperCase()}) Wedding Video`);
      setIsPaymentModalOpen(true);
      return;
    }
    await runVideoExport();
  };

  const handleSaveToPhoneGallery = async () => {
    if (!isPaymentUnlocked()) {
      setPendingAction('video');
      setPaymentTargetItem('Full HD Video to Phone Photos');
      setIsPaymentModalOpen(true);
      return;
    }

    if (!exportedVideo) return;
    setIsSharingToPhone(true);

    try {
      const file = new File([exportedVideo.blob], exportedVideo.fileName, {
        type: exportedVideo.mimeType || 'video/mp4',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${couple.brideName} & ${couple.groomName} Pixar Wedding Story`,
          text: `Watch our Pixar 3D Wedding Story Video! Save our date: ${formattedDate}`,
        });
        setSaveSuccessMsg('Video sent to Share Sheet! Tap "Save Video" to save to your Photos.');
      } else {
        handleDownloadToLaptop();
        setSaveSuccessMsg(
          'Video downloading! Open your Downloads folder and tap "Save Video" to add it to Photos.'
        );
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error, falling back to direct download:', err);
        handleDownloadToLaptop();
      }
    } finally {
      setIsSharingToPhone(false);
    }
  };

  const handleDownloadToLaptop = () => {
    if (!isPaymentUnlocked()) {
      setPendingAction('video');
      setPaymentTargetItem('Full HD Video Download');
      setIsPaymentModalOpen(true);
      return;
    }

    if (!exportedVideo) return;
    const link = document.createElement('a');
    link.href = exportedVideo.url;
    link.download = exportedVideo.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSaveSuccessMsg(`Downloaded "${exportedVideo.fileName}" to your Downloads folder!`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  const handleCopyInviteText = () => {
    const text = `💍 WEDDING INVITATION 💍\n\n${couple.blessingHeader}\n\nYou are cordially invited to celebrate the marriage ceremony of\n${couple.brideName} & ${couple.groomName}\n\n🗓️ Date: ${formattedDate}\n⏰ Time: ${couple.weddingTime}\n📍 Venue: ${couple.venue}, ${couple.city}\n\n"From this day forward, you shall not walk alone."\n\nSave our date! ✨`;
    navigator.clipboard.writeText(text);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const getWhatsAppUrl = () => {
    const text = encodeURIComponent(
      `💍 WEDDING INVITATION 💍\n\n${couple.blessingHeader}\n\nWe are getting married! ${couple.brideName} & ${couple.groomName}\n🗓️ ${formattedDate} at ${couple.weddingTime}\n📍 ${couple.venue}, ${couple.city}\n\nSave our date! ✨`
    );
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const activeSpecs = getResolutionSpecs(selectedQuality);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-purple-700/60 shadow-2xl px-4 pt-3 pb-6 sm:p-7 text-white overflow-hidden max-h-[92dvh] flex flex-col pb-safe">
        <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" />
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-950/80 hover:bg-purple-950 text-slate-300 hover:text-white transition z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4 flex-shrink-0 pt-1">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 mb-2 shadow-lg shadow-purple-900/40">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white font-cinzel tracking-wide">
            Download HD Video & Card
          </h3>
          <p className="text-xs text-purple-200/80 mt-0.5">
            {isPaid
              ? 'Studio Pass verified — render & save directly to Phone Photos or Laptop'
              : `One-time ₹${STUDIO_PRICE_INR} Razorpay pass unlocks instant video & card download`}
          </p>
        </div>

        {/* Global Toast Messages */}
        {saveSuccessMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="flex-1">{saveSuccessMsg}</span>
          </div>
        )}
        {exportErrorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="flex-1">{exportErrorMsg}</span>
          </div>
        )}

        {/* Active Pass Strip when paid */}
        {isPaid && (
          <div className="mb-3.5 p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs flex-shrink-0">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-semibold">₹{STUDIO_PRICE_INR} Paid · Unlimited Downloads Unlocked</span>
            </div>
            <span className="text-xs text-emerald-300 font-bold">Verified</span>
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-purple-900/60 mb-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>HD Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('date')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'date'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Date & Card</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {/* ===================== TAB 1: DOWNLOAD HD VIDEO ===================== */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              {!exportedVideo && !isExportingVideo && (
                <>
                  {/* Quality Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-purple-200 flex items-center justify-between">
                      <span>1. Choose Video Quality:</span>
                      <span className="text-[10px] text-amber-300 font-mono">
                        {aspectRatio === '9:16' ? 'Vertical 9:16 Reel' : 'Cinema 16:9'}
                      </span>
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedQuality('1080p')}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          selectedQuality === '1080p'
                            ? 'bg-purple-950/80 border-purple-400 shadow-md shadow-purple-900/50'
                            : 'bg-slate-950/70 border-purple-950 hover:border-purple-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-white">1080p</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            Best
                          </span>
                        </div>
                        <div className="text-[10px] text-purple-300 font-medium mt-1">Full HD</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Reels & Gallery</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedQuality('720p')}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          selectedQuality === '720p'
                            ? 'bg-purple-950/80 border-purple-400 shadow-md shadow-purple-900/50'
                            : 'bg-slate-950/70 border-purple-950 hover:border-purple-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-bold text-white">720p</span>
                        <div className="text-[10px] text-purple-300 font-medium mt-1">Standard HD</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Faster Export</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedQuality('4k')}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          selectedQuality === '4k'
                            ? 'bg-purple-950/80 border-purple-400 shadow-md shadow-purple-900/50'
                            : 'bg-slate-950/70 border-purple-950 hover:border-purple-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-white">4K</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Ultra
                          </span>
                        </div>
                        <div className="text-[10px] text-purple-300 font-medium mt-1">Ultra HD</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Big Screen TV</div>
                      </button>
                    </div>
                  </div>

                  {/* Video Specs Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-900/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-purple-200">Dimensions:</span>
                      <span className="text-amber-300 font-mono text-[11px]">{activeSpecs.label}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 border-t border-purple-950 pt-2">
                      <span className="text-slate-400">Audio Track:</span>
                      <span className="text-pink-300 flex items-center gap-1 font-medium">
                        <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                        Synced Romantic Music
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 border-t border-purple-950 pt-2">
                      <span className="text-slate-400">Format:</span>
                      <span className="text-emerald-300 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {mimeInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Single Primary CTA */}
                  <button
                    type="button"
                    onClick={handleExportVideo}
                    className={`w-full min-h-[52px] py-3.5 px-4 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition active:scale-[0.98] ${
                      !isPaid
                        ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-400 hover:via-pink-400 hover:to-purple-500 text-slate-950 shadow-amber-950/40'
                        : 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 text-white shadow-purple-900/40'
                    }`}
                  >
                    {!isPaid ? (
                      <>
                        <CreditCard className="w-5 h-5 text-slate-950" />
                        <span>Pay ₹{STUDIO_PRICE_INR} with Razorpay & Download Video</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Render & Download {selectedQuality.toUpperCase()} Video</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* In-Progress Render Screen */}
              {isExportingVideo && (
                <div className="p-6 rounded-2xl bg-purple-950/70 border border-purple-700/60 space-y-3 text-center animate-in fade-in">
                  <div className="flex items-center justify-center gap-2 text-base font-bold text-amber-300">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                    Preparing {selectedQuality.toUpperCase()} Video • {exportProgress}%
                  </div>

                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-purple-900">
                    <div
                      className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 h-full transition-all duration-150"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>

                  <p className="text-xs text-purple-200 font-medium">
                    {exportStatusText || 'Compositing 4 scenes, couple details & synced audio...'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Keep this window open for a few seconds while your video renders.
                  </p>
                </div>
              )}

              {/* POST-RENDER STATE */}
              {exportedVideo && !isExportingVideo && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-purple-800/80 shadow-2xl flex items-center justify-center">
                    <video
                      ref={videoPreviewRef}
                      src={exportedVideo.url}
                      controls
                      playsInline
                      autoPlay
                      loop
                      className={`w-full max-h-64 object-contain bg-slate-950 ${
                        aspectRatio === '9:16' ? 'max-w-[200px] mx-auto py-2' : 'aspect-video'
                      }`}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-purple-500/40 text-[10px] font-bold text-amber-300">
                      {exportedVideo.quality.toUpperCase()} HD •{' '}
                      {(exportedVideo.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveToPhoneGallery}
                    disabled={isSharingToPhone}
                    className="w-full min-h-[52px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 text-white font-bold text-sm shadow-xl shadow-purple-900/40 flex items-center justify-between transition active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-white/20">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div>Save to Phone Photos / Gallery</div>
                        <div className="text-[10px] text-purple-100 font-normal">
                          Apple Photos or Android Gallery
                        </div>
                      </div>
                    </div>
                    {isSharingToPhone ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4 text-white" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadToLaptop}
                    className="w-full min-h-[52px] py-3 px-4 rounded-2xl bg-slate-950 hover:bg-purple-950 border border-purple-800/80 text-white font-bold text-xs sm:text-sm flex items-center justify-between transition active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-purple-900/40">
                        <Laptop className="w-4 h-4 text-amber-300" />
                      </div>
                      <div className="text-left">
                        <div>Download Video File to Device</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Saves directly to your Downloads folder
                        </div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-amber-300" />
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={getWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] py-2.5 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share to WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setExportedVideo(null)}
                      className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-purple-900/40 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Change Quality</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 2: DOWNLOAD DATE & INVITATIONS ===================== */}
          {activeTab === 'date' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-950 to-amber-950/60 border border-amber-500/40 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                  Auspicious Wedding Date
                </span>
                <div className="text-xl font-bold text-white font-cinzel tracking-wide">
                  {formattedDate}
                </div>
                <div className="text-xs text-purple-200">
                  {couple.weddingTime} • {couple.venue}, {couple.city}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-slate-950 border border-purple-900/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-200">Invitation Card Quality:</span>
                    <div className="flex items-center gap-1">
                      {(['1080p', '4k'] as VideoQuality[]).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setCardQuality(q)}
                          className={`min-h-[32px] px-2.5 py-0.5 rounded-lg text-xs font-bold transition ${
                            cardQuality === q
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {q.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadDateCard}
                    disabled={isExportingCard}
                    className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-amber-950/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      {!isPaid ? (
                        <Lock className="w-5 h-5 text-slate-950 flex-shrink-0" />
                      ) : (
                        <FileImage className="w-5 h-5 text-slate-950 flex-shrink-0" />
                      )}
                      <div className="text-left">
                        <div>
                          {!isPaid
                            ? `Pay ₹${STUDIO_PRICE_INR} & Download Card (PNG)`
                            : 'Download Save The Date Card (PNG)'}
                        </div>
                        <div className="text-[11px] text-slate-900 font-normal">
                          {!isPaid
                            ? 'One-time Razorpay pass for video & invitation card'
                            : 'High-resolution royal invitation card for Phone & Laptop'}
                        </div>
                      </div>
                    </div>
                    {isExportingCard ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : !isPaid ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-amber-300 font-bold">
                        ₹{STUDIO_PRICE_INR}
                      </span>
                    ) : (
                      <Download className="w-4 h-4 text-slate-950" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => downloadCalendarEvent(couple)}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-slate-950 hover:bg-purple-950/70 border border-purple-800/60 text-white font-semibold text-xs sm:text-sm flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarCheck className="w-5 h-5 text-purple-400" />
                    <div className="text-left">
                      <div>Download iCalendar Event (.ics)</div>
                      <div className="text-[11px] text-slate-400">
                        Syncs to iPhone Apple Calendar, Outlook, & Android
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-purple-300" />
                </button>

                <a
                  href={getGoogleCalendarUrl(couple)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-slate-950 hover:bg-purple-950/70 border border-purple-800/60 text-white font-semibold text-xs sm:text-sm flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Share2 className="w-5 h-5 text-amber-400" />
                    <div className="text-left">
                      <div>Add Directly to Google Calendar</div>
                      <div className="text-[11px] text-slate-400">
                        One-click event creation in browser
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-amber-300">Open ↗</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyInviteText}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-950/40 hover:bg-purple-950/80 border border-purple-900/50 text-purple-200 text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Invitation text copied to clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-purple-400" />
                      <span>Copy WhatsApp / Social Invite Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Razorpay Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPendingAction(null);
        }}
        targetItemName={paymentTargetItem}
        coupleName={`${couple.brideName} & ${couple.groomName}`}
        onPaymentSuccess={() => {
          setIsPaid(true);
          setIsPaymentModalOpen(false);
          const nextAction = pendingAction;
          setPendingAction(null);

          if (nextAction === 'video') {
            setActiveTab('video');
            runVideoExport();
          } else if (nextAction === 'card') {
            setActiveTab('date');
            runDateCardDownload();
          } else {
            setSaveSuccessMsg('Payment verified! Tap Download Video below.');
          }
        }}
      />
    </div>
  );
};
