import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Download,
  Image as ImageIcon,
  Check,
  Search,
  ZoomIn,
  Film,
  Heart,
  HardDrive,
  Share2,
  Calendar,
  Smartphone,
  Laptop,
  CheckCircle2,
  Layers,
  Filter,
  Lock,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { SceneItem, SceneryOption, AspectRatioType, SavedGalleryItem } from '../types';
import {
  ALL_UPLOADED_AND_SACRED_SCENES,
  INDIAN_STATE_THEMES,
} from '../assets/scenes';
import { isPaymentUnlocked, subscribeToPaymentChanges, STUDIO_PRICE_INR } from '../utils/payment';
import { PaymentModal } from './PaymentModal';

interface SavedAppPhotosGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: SceneItem[];
  onUpdateScene: (index: number, updated: Partial<SceneItem>) => void;
  customUploads: SceneryOption[];
  bridePhoto: string | null;
  groomPhoto: string | null;
  aspectRatio: AspectRatioType;
}

type GalleryCategory =
  | 'all'
  | 'religions'
  | 'proposals'
  | 'dances'
  | 'attire'
  | 'rituals'
  | 'user_uploads';

export const SavedAppPhotosGallery: React.FC<SavedAppPhotosGalleryProps> = ({
  isOpen,
  onClose,
  scenes,
  onUpdateScene,
  customUploads,
  bridePhoto,
  groomPhoto,
  aspectRatio,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectItem, setInspectItem] = useState<SavedGalleryItem | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(isPaymentUnlocked());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentTargetItem, setPaymentTargetItem] = useState<string>('Wedding Photo');

  React.useEffect(() => {
    setIsPaid(isPaymentUnlocked());
    const unsubscribe = subscribeToPaymentChanges((details) => {
      setIsPaid(details.isUnlocked);
    });
    return unsubscribe;
  }, [isOpen]);

  // Build the complete saved photos collection
  const allSavedItems: SavedGalleryItem[] = useMemo(() => {
    const list: SavedGalleryItem[] = [];
    const addedUrls = new Set<string>();

    // 1. User uploaded custom sceneries & bride/groom photos
    if (bridePhoto && !addedUrls.has(bridePhoto)) {
      addedUrls.add(bridePhoto);
      list.push({
        id: 'user-bride-photo',
        title: '👰 Bride’s Uploaded Portrait',
        subtitle: 'Uploaded & saved photo',
        category: 'upload',
        mediaType: 'image',
        url: bridePhoto,
        themeName: 'User Upload',
        description: 'Original uploaded bride photo saved securely in app storage',
      });
    }

    if (groomPhoto && !addedUrls.has(groomPhoto)) {
      addedUrls.add(groomPhoto);
      list.push({
        id: 'user-groom-photo',
        title: '🤵 Groom’s Uploaded Portrait',
        subtitle: 'Uploaded & saved photo',
        category: 'upload',
        mediaType: 'image',
        url: groomPhoto,
        themeName: 'User Upload',
        description: 'Original uploaded groom photo saved securely in app storage',
      });
    }

    customUploads.forEach((item) => {
      if (!addedUrls.has(item.imageUrl)) {
        addedUrls.add(item.imageUrl);
        list.push({
          id: item.id,
          title: item.label,
          subtitle: item.themeName || 'Custom Saved Photo',
          category: 'upload',
          mediaType: 'image',
          url: item.imageUrl,
          themeName: item.themeName || 'My Uploads',
          description: item.description,
        });
      }
    });

    // 2. All sacred rituals & hero scenes
    ALL_UPLOADED_AND_SACRED_SCENES.forEach((item) => {
      if (!addedUrls.has(item.imageUrl)) {
        addedUrls.add(item.imageUrl);
        let cat: SavedGalleryItem['category'] = 'ritual';
        if (item.category === 'proposal') cat = 'proposal';
        else if (item.category === 'dance') cat = 'dance';
        else if (item.category === 'attire') cat = 'attire';
        else if (item.category === 'mandap') cat = 'mandap';

        list.push({
          id: item.id,
          title: item.label,
          subtitle: item.themeName || 'Sacred Tradition',
          category: cat,
          mediaType: 'image',
          url: item.imageUrl,
          themeName: item.themeName,
          description: item.description,
        });
      }
    });

    // 3. All themes options (Religions & Regional)
    Object.values(INDIAN_STATE_THEMES).forEach((theme) => {
      if (!addedUrls.has(theme.officialCoupleImage)) {
        addedUrls.add(theme.officialCoupleImage);
        list.push({
          id: `theme-official-${theme.id}`,
          title: `${theme.name} • Official Couple`,
          subtitle: theme.stateLabel,
          category: 'attire',
          mediaType: 'image',
          url: theme.officialCoupleImage,
          themeName: theme.stateLabel,
          description: `${theme.culturalVibe} | Bride: ${theme.brideAttire}`,
        });
      }

      theme.scenes.forEach((s) => {
        if (!addedUrls.has(s.imageUrl)) {
          addedUrls.add(s.imageUrl);
          let cat: SavedGalleryItem['category'] = 'attire';
          if (s.tag === 'scene1') cat = 'proposal';
          else if (s.tag === 'scene2') cat = 'dance';
          else if (s.tag === 'scene4') cat = 'mandap';

          list.push({
            id: `theme-${theme.id}-${s.tag}`,
            title: `${s.title} (${theme.stateLabel})`,
            subtitle: s.subtitle,
            category: cat,
            mediaType: 'image',
            url: s.imageUrl,
            themeName: theme.stateLabel,
            description: s.actionText,
          });
        }
      });

      theme.sceneryOptions.forEach((sc) => {
        if (!addedUrls.has(sc.imageUrl)) {
          addedUrls.add(sc.imageUrl);
          list.push({
            id: sc.id,
            title: sc.label,
            subtitle: theme.stateLabel,
            category: sc.category as any,
            mediaType: 'image',
            url: sc.imageUrl,
            themeName: theme.stateLabel,
            description: sc.description,
          });
        }
      });
    });

    return list;
  }, [bridePhoto, groomPhoto, customUploads]);

  // Filter based on search & category
  const filteredList = useMemo(() => {
    return allSavedItems.filter((item) => {
      if (selectedCategory === 'proposals' && item.category !== 'proposal') return false;
      if (selectedCategory === 'dances' && item.category !== 'dance') return false;
      if (selectedCategory === 'attire' && item.category !== 'attire') return false;
      if (selectedCategory === 'rituals' && item.category !== 'ritual' && item.category !== 'mandap')
        return false;
      if (selectedCategory === 'user_uploads' && item.category !== 'upload') return false;
      if (
        selectedCategory === 'religions' &&
        !(
          item.themeName?.includes('Christian') ||
          item.themeName?.includes('Muslim') ||
          item.themeName?.includes('Nikah') ||
          item.themeName?.includes('Hindu') ||
          item.themeName?.includes('Vedic') ||
          item.themeName?.includes('Sikh') ||
          item.themeName?.includes('Jewish') ||
          item.themeName?.includes('Chuppah') ||
          item.themeName?.includes('Buddhist') ||
          item.themeName?.includes('Jain') ||
          item.themeName?.includes('Parsi') ||
          item.themeName?.includes('Interfaith')
        )
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesSubtitle = item.subtitle?.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        const matchesTheme = item.themeName?.toLowerCase().includes(query);
        return matchesTitle || matchesSubtitle || matchesDesc || matchesTheme;
      }

      return true;
    });
  }, [allSavedItems, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Apply to specific scene (0, 1, 2, or 3)
  const handleApplyToScene = (item: SavedGalleryItem, sceneIndex: number) => {
    onUpdateScene(sceneIndex, {
      imageUrl: item.url,
      subtitle: item.title.replace(/^[^\w\s]+\s*/, ''),
    });
    showToast(
      `✓ Successfully applied "${item.title}" to Scene ${sceneIndex + 1} (${
        sceneIndex === 0
          ? 'Finally...'
          : sceneIndex === 1
          ? 'Wait is Over'
          : sceneIndex === 2
          ? 'Making It Official'
          : 'Getting Married'
      })!`
    );
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Download item to Phone Gallery / Laptop
  const handleDownloadItem = async (item: SavedGalleryItem) => {
    if (!isPaid) {
      setPaymentTargetItem(item.title);
      setIsPaymentModalOpen(true);
      return;
    }

    try {
      const cleanTitle = item.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const fileName = `${cleanTitle}_Wedding_Photo_HD.jpg`;

      // Try Web Share on mobile for instant saving to Photos
      if (navigator.canShare && item.url.startsWith('data:')) {
        const blob = await (await fetch(item.url)).blob();
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: item.title,
            text: `Wedding photo: ${item.title}`,
          });
          showToast('Photo sent to Share Sheet! Tap "Save Image" to add to Phone Photos.');
          return;
        }
      }

      // Direct download link
      const link = document.createElement('a');
      link.href = item.url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`✅ Downloaded "${fileName}" to your device!`);
    } catch (e) {
      console.warn('Download error:', e);
      // Fallback
      const link = document.createElement('a');
      link.href = item.url;
      link.download = `Wedding_Photo.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Photo downloaded!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-5xl rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-purple-700/60 shadow-2xl px-4 pt-3 pb-5 sm:p-7 text-white overflow-hidden max-h-[92dvh] flex flex-col pb-safe">
        <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-950/80 hover:bg-purple-950 text-slate-300 hover:text-white transition z-10"
          aria-label="Close gallery"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 flex-shrink-0 pr-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 flex items-center justify-center shadow-lg shadow-purple-900/40 shrink-0">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-bold text-white font-cinzel tracking-wide truncate">
                Saved Photos Gallery
              </h3>
              <p className="text-xs text-purple-200/80 mt-0.5 truncate">
                {allSavedItems.length} photos · Tap S1–S4 to assign to scenes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPaid ? (
              <button
                type="button"
                onClick={() => {
                  setPaymentTargetItem('All Gallery Photos & Video');
                  setIsPaymentModalOpen(true);
                }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-[0.98]"
              >
                <Lock className="w-3.5 h-3.5 text-slate-950" />
                <span>Unlock All · ₹{STUDIO_PRICE_INR}</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Studio Pass Active</span>
              </span>
            )}
          </div>
        </div>

        {/* Success Toast Banner */}
        {successToast && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 text-xs flex items-center gap-2 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="flex-1 font-medium">{successToast}</span>
          </div>
        )}

        {/* Controls Bar: Search & Category Tabs */}
        <div className="space-y-3 mb-4 flex-shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faith, theme or style..."
              className="w-full min-h-[44px] pl-10 pr-16 py-2.5 rounded-xl bg-slate-950/90 border border-purple-900/60 text-base sm:text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[36px] px-2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'all', label: `🌟 All Saved Photos (${allSavedItems.length})` },
              { id: 'religions', label: '🕌 All Religions & Faiths' },
              { id: 'proposals', label: '💍 Proposals (Scene 1)' },
              { id: 'dances', label: '💃 Dances & Waltz (Scene 2)' },
              { id: 'attire', label: '👑 Couple Attire (Scene 3)' },
              { id: 'rituals', label: '🪔 Sacred Mandaps & Rituals' },
              { id: 'user_uploads', label: `📤 My Uploads (${customUploads.length + (bridePhoto ? 1 : 0) + (groomPhoto ? 1 : 0)})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as GalleryCategory)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex-shrink-0 ${
                  selectedCategory === tab.id
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-md'
                    : 'bg-slate-950/70 border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="overflow-y-auto pr-1 flex-1">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <ImageIcon className="w-10 h-10 mx-auto text-purple-400/60" />
              <p className="text-sm font-semibold text-slate-300">No photos found matching your search</p>
              <p className="text-xs text-slate-500">Try searching for "church", "nikah", "sindoor" or clear your filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredList.map((item) => {
                const isUsedInScene = scenes.findIndex((s) => s.imageUrl === item.url);
                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl overflow-hidden border border-purple-900/50 bg-slate-950 flex flex-col justify-between hover:border-amber-400/80 transition-all shadow-md hover:shadow-xl hover:shadow-purple-900/30"
                  >
                    {/* Image View */}
                    <div className="relative aspect-[9/16] bg-black overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition" />

                      {/* Theme / Tradition badge */}
                      {item.themeName && (
                        <div className="absolute top-1.5 left-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-amber-300 border border-amber-400/30 truncate max-w-[120px] inline-block">
                            {item.themeName}
                          </span>
                        </div>
                      )}

                      {/* If Currently Active in a Scene */}
                      {isUsedInScene !== -1 && (
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-extrabold flex items-center gap-0.5 shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Scene {isUsedInScene + 1}</span>
                        </div>
                      )}

                      {/* Quick Hover Inspect / Zoom Button */}
                      <button
                        type="button"
                        onClick={() => setInspectItem(item)}
                        className="absolute bottom-2 right-2 p-1.5 rounded-xl bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white transition backdrop-blur-sm shadow opacity-80 group-hover:opacity-100"
                        title="Zoom & Inspect full-size"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick Download Button */}
                      <button
                        type="button"
                        onClick={() => handleDownloadItem(item)}
                        className={`absolute bottom-2 left-2 p-1.5 rounded-xl transition backdrop-blur-sm shadow opacity-80 group-hover:opacity-100 ${
                          !isPaid
                            ? 'bg-amber-950/80 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40'
                            : 'bg-black/70 hover:bg-purple-600 text-white'
                        }`}
                        title={!isPaid ? 'Pay via Razorpay to download HD photo' : 'Download HD photo'}
                      >
                        {!isPaid ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Meta info & 1-Click Scene Assigners */}
                    <div className="p-2 space-y-1.5 bg-slate-950 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-white line-clamp-1 group-hover:text-amber-300 transition">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[9px] text-purple-300/80 line-clamp-1">
                            {item.subtitle}
                          </div>
                        )}
                      </div>

                      {/* 1-Click Assign to Scene 1, 2, 3, or 4 */}
                      <div className="pt-1 border-t border-purple-900/40">
                        <div className="text-[8px] font-semibold text-slate-400 mb-1">
                          Use in Scene:
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((sceneNum) => {
                            const isThisScene = isUsedInScene === sceneNum - 1;
                            return (
                              <button
                                key={sceneNum}
                                type="button"
                                onClick={() => handleApplyToScene(item, sceneNum - 1)}
                                className={`py-1 rounded text-[9px] font-bold transition flex items-center justify-center ${
                                  isThisScene
                                    ? 'bg-emerald-500 text-slate-950 shadow'
                                    : 'bg-purple-950/70 hover:bg-amber-500 hover:text-slate-950 text-purple-200'
                                }`}
                                title={`Set as Scene ${sceneNum}`}
                              >
                                {isThisScene ? '✓ S' + sceneNum : 'S' + sceneNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info strip */}
        <div className="pt-3 border-t border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-purple-200/80 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>All {allSavedItems.length} photos completely saved and cached in your browser.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-white text-xs font-semibold border border-purple-800 transition"
          >
            Back to Studio
          </button>
        </div>
      </div>

      {/* Lightbox Modal for Zoom & Details */}
      {inspectItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-purple-700/60 rounded-3xl p-5 overflow-hidden flex flex-col md:flex-row gap-5 max-h-[90vh]">
            <button
              type="button"
              onClick={() => setInspectItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 hover:bg-purple-900 text-white transition z-10"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Big Image Preview */}
            <div className="relative md:w-1/2 aspect-[9/16] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={inspectItem.url}
                alt={inspectItem.title}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Details & Actions */}
            <div className="md:w-1/2 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {inspectItem.themeName || 'Wedding Photo'}
                </span>
                <h4 className="text-xl font-bold text-white font-cinzel mt-2">
                  {inspectItem.title}
                </h4>
                {inspectItem.subtitle && (
                  <p className="text-xs text-purple-200 mt-1">{inspectItem.subtitle}</p>
                )}
                {inspectItem.description && (
                  <p className="text-xs text-slate-300 mt-2 bg-purple-950/40 p-3 rounded-xl border border-purple-900/50">
                    {inspectItem.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-purple-200">
                  Apply directly to story scene:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyToScene(inspectItem, 0);
                      setInspectItem(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-purple-950 hover:bg-purple-800 border border-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    Scene 1 (Proposal)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyToScene(inspectItem, 1);
                      setInspectItem(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-purple-950 hover:bg-purple-800 border border-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    Scene 2 (Dance)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyToScene(inspectItem, 2);
                      setInspectItem(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-purple-950 hover:bg-purple-800 border border-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    Scene 3 (Attire)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyToScene(inspectItem, 3);
                      setInspectItem(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-purple-950 hover:bg-purple-800 border border-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    Scene 4 (Mandap)
                  </button>
                </div>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadItem(inspectItem)}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
                >
                  {!isPaid ? (
                    <>
                      <Lock className="w-4 h-4 text-slate-950" />
                      <span>Pay ₹{STUDIO_PRICE_INR} via Razorpay & Download</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Download Photo (Phone Photos / Laptop)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Razorpay Payment Modal for Gallery */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        targetItemName={paymentTargetItem}
        onPaymentSuccess={() => {
          setIsPaid(true);
          setIsPaymentModalOpen(false);
          showToast('✨ Payment verified! You can now download photos & videos.');
        }}
      />
    </div>
  );
};
