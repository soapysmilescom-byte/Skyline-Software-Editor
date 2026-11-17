import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Compass,
  Church,
  Moon,
  Flame,
  Sun,
  Heart,
  Globe,
  Star,
  Download,
  Lock,
  ExternalLink,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { IndianStateId, IndianStateTheme } from '../types';
import { INDIAN_STATE_THEMES } from '../assets/scenes';
import { isPaymentUnlocked, subscribeToPaymentChanges, STUDIO_PRICE_INR } from '../utils/payment';
import { PaymentModal } from './PaymentModal';

interface IndianStateThemeSelectorProps {
  selectedState: IndianStateId;
  onSelectState: (stateId: IndianStateId) => void;
  onDownloadTheme?: (theme: IndianStateTheme) => void;
}

type CategoryFilter = 'all' | 'faith' | 'regional';

export const IndianStateThemeSelector: React.FC<IndianStateThemeSelectorProps> = ({
  selectedState,
  onSelectState,
  onDownloadTheme,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [isPaid, setIsPaid] = useState<boolean>(isPaymentUnlocked());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentTarget, setPaymentTarget] = useState<string>('Wedding Theme');

  useEffect(() => {
    setIsPaid(isPaymentUnlocked());
    const unsubscribe = subscribeToPaymentChanges((details) => {
      setIsPaid(details.isUnlocked);
    });
    return unsubscribe;
  }, []);

  const allThemesList = Object.values(INDIAN_STATE_THEMES);
  const currentTheme = INDIAN_STATE_THEMES[selectedState] || allThemesList[0];

  const filteredThemes = allThemesList.filter((theme) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'faith') return theme.category === 'faith' || theme.region === 'World Religions';
    if (categoryFilter === 'regional') return theme.category === 'regional' || theme.region !== 'World Religions';
    return true;
  });

  const getThemeSymbol = (id: string) => {
    switch (id) {
      case 'christian':
        return '✝️';
      case 'islam':
        return '🌙';
      case 'hindu':
        return '🪔';
      case 'sikh':
        return 'ੴ';
      case 'jewish':
        return '✡️';
      case 'buddhist':
        return '☸️';
      case 'jain':
        return '✨';
      case 'parsi':
        return '🕊️';
      case 'interfaith':
        return '💫';
      default:
        return '👑';
    }
  };

  const handleDownloadThemeClick = (theme: IndianStateTheme) => {
    if (!isPaid) {
      setPaymentTarget(`${theme.name} Wedding Theme & 4-Scene Video`);
      setIsPaymentModalOpen(true);
      return;
    }

    if (onDownloadTheme) {
      onDownloadTheme(theme);
    } else {
      // Trigger download of official couple theme image as fallback
      const link = document.createElement('a');
      link.href = theme.officialCoupleImage;
      link.download = `${theme.name.replace(/\s+/g, '_')}_Wedding_Theme_HD.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-purple-900/40 p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400 shrink-0" />
            <span>1. Choose Wedding Theme Template</span>
          </h2>
          <p className="text-xs text-purple-300/80 mt-0.5">
            All 21 world religions & regional heritage templates — tap any card to update scenes & attire
          </p>
        </div>

        {/* Category Tabs: All, Religions / Faiths, Regional Traditions */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-purple-900/60">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap truncate ${
              categoryFilter === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({allThemesList.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('faith')}
            className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap truncate ${
              categoryFilter === 'faith'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Religions (9)
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('regional')}
            className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap truncate ${
              categoryFilter === 'regional'
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Regional (12)
          </button>
        </div>
      </div>

      {/* Grid of Theme Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
        {filteredThemes.map((theme) => {
          const isSelected = theme.id === selectedState;
          const symbol = getThemeSymbol(theme.id);
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectState(theme.id)}
              className={`relative rounded-xl overflow-hidden border p-2 text-left transition-all group flex flex-col justify-between ${
                isSelected
                  ? 'border-amber-400 bg-purple-950/80 ring-2 ring-amber-400/50 shadow-lg shadow-purple-900/50 scale-[1.02]'
                  : 'border-purple-900/40 bg-slate-950/60 hover:border-purple-600/70 hover:bg-slate-900/80'
              }`}
            >
              {/* Image thumbnail of 3D Pixar Couple */}
              <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden mb-2 bg-black">
                <img
                  src={theme.officialCoupleImage}
                  alt={theme.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {/* Religion / Tradition Tag */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-amber-300 border border-amber-400/30 truncate flex items-center gap-1">
                    <span>{symbol}</span>
                    <span className="truncate">{theme.region}</span>
                  </span>
                </div>
              </div>

              {/* State / Religion Details */}
              <div>
                <div className="font-bold text-xs text-white group-hover:text-amber-300 transition truncate flex items-center gap-1">
                  <span>{theme.stateLabel}</span>
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {theme.blessingHeader.replace(/\|/g, '').trim()}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Theme Highlight Banner & 4-Scene Auto-Sync Strip */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/90 via-slate-950 to-amber-950/70 border border-amber-500/40 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Active Culture Theme: {currentTheme.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadThemeClick(currentTheme)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
            >
              {!isPaid ? <Lock className="w-3.5 h-3.5 text-slate-950" /> : <Download className="w-3.5 h-3.5 text-slate-950" />}
              <span>{!isPaid ? `Unlock Theme · ₹${STUDIO_PRICE_INR}` : 'Download Theme Media'}</span>
            </button>
          </div>
        </div>

        {/* Direct Razorpay Quick Unlock Banner */}
        {!isPaid && (
          <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-blue-200">
            <div className="flex items-center gap-2 text-xs">
              <CreditCard className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                Unlock all 21 cultural themes, HD/4K videos & invitation cards for ₹{STUDIO_PRICE_INR}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPaymentTarget(`${currentTheme.name} Studio Pass`);
                setIsPaymentModalOpen(true);
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition whitespace-nowrap"
            >
              <span>Pay ₹{STUDIO_PRICE_INR} via Razorpay</span>
            </button>
          </div>
        )}

        {/* 4-Scene Preview Strip */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
            <span>Scenes automatically updated to {currentTheme.stateLabel} theme:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currentTheme.scenes.map((scene, idx) => (
              <div
                key={scene.id}
                className="relative rounded-lg overflow-hidden border border-purple-800/50 bg-slate-900/90 p-1.5 flex flex-col gap-1.5"
              >
                <div className="relative aspect-[9/16] rounded overflow-hidden bg-black">
                  <img
                    src={scene.imageUrl}
                    alt={scene.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-amber-300 border border-amber-400/30">
                    Scene {idx + 1}
                  </div>
                </div>
                <div className="px-0.5">
                  <div className="font-bold text-[11px] text-white truncate">{scene.title}</div>
                  <div className="text-[9px] text-purple-300/80 line-clamp-1">{scene.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-2 border-t border-purple-900/40">
          <div>
            <span className="font-semibold text-pink-300">👰 Bride's Regional Attire:</span>
            <p className="text-slate-300 mt-0.5">{currentTheme.brideAttire}</p>
          </div>
          <div>
            <span className="font-semibold text-indigo-300">🤵 Groom's Regional Attire:</span>
            <p className="text-slate-300 mt-0.5">{currentTheme.groomAttire}</p>
          </div>
        </div>

        <div className="text-[10px] text-amber-200/90 flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-purple-900/30">
          <span>✨ Cultural Blessing: {currentTheme.blessingHeader}</span>
          <span className="text-slate-400 font-mono">Ceremony: {currentTheme.ceremonyType}</span>
        </div>
      </div>

      {/* Embedded Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        targetItemName={paymentTarget}
        onPaymentSuccess={() => {
          setIsPaid(true);
          setIsPaymentModalOpen(false);
        }}
      />
    </div>
  );
};
