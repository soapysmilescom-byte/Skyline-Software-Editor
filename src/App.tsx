import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Sparkles,
  Heart,
  Image as ImageIcon,
  Lock,
  Layers,
  Globe,
} from 'lucide-react';
import {
  CoupleData,
  SceneItem,
  AspectRatioType,
  CaricatureAIProfile,
  IndianStateId,
  SceneryOption,
  CustomAudioTrack,
  MusicTheme,
} from './types';
import {
  DEFAULT_SCENES,
  SAMPLE_BRIDE_PHOTO,
  SAMPLE_GROOM_PHOTO,
  INDIAN_STATE_THEMES,
} from './assets/scenes';
import { BrandLogo } from './components/BrandLogo';
import { IndianStateThemeSelector } from './components/IndianStateThemeSelector';
import { PhotoUploader } from './components/PhotoUploader';
import { DateAndDetailsForm } from './components/DateAndDetailsForm';
import { MusicTrackManager } from './components/MusicTrackManager';
import { SceneCustomizer } from './components/SceneCustomizer';
import { VideoPlayer } from './components/VideoPlayer';
import { DownloadModal } from './components/DownloadModal';
import { SavedAppPhotosGallery } from './components/SavedAppPhotosGallery';
import { PaymentModal } from './components/PaymentModal';
import {
  isPaymentUnlocked,
  subscribeToPaymentChanges,
  STUDIO_PRICE_INR,
} from './utils/payment';
import { romanticAudio } from './utils/audioEngine';
import {
  loadSavedAppPhotos,
  persistBridePhoto,
  persistGroomPhoto,
  persistCustomSceneries,
  persistSavedScenes,
  persistCoupleData,
} from './utils/storage';

type MobileSectionId = 'preview' | 'themes' | 'couple' | 'scenes';

export default function App() {
  const [activeMobileNav, setActiveMobileNav] = useState<MobileSectionId>('preview');

  // Section refs for smooth 1-tap mobile navigation while keeping ALL templates visible
  const previewSectionRef = useRef<HTMLDivElement | null>(null);
  const themesSectionRef = useRef<HTMLDivElement | null>(null);
  const coupleSectionRef = useRef<HTMLDivElement | null>(null);
  const scenesSectionRef = useRef<HTMLDivElement | null>(null);
  const musicSectionRef = useRef<HTMLDivElement | null>(null);

  // Active wedding theme
  const [selectedState, setSelectedState] = useState<IndianStateId>('bollywood');

  // Couple state
  const [couple, setCouple] = useState<CoupleData>({
    brideName: 'Priya',
    groomName: 'Amit',
    weddingDate: '2026-06-22',
    weddingTime: '5:00 PM onwards',
    venue: 'The Oberoi Palace & Lawns',
    city: 'Delhi',
    ceremonyType: 'Wedding Ceremony',
    parentsBride: 'Anshal Mehta & Reema Mehta',
    parentsGroom: 'Rajesh Gupta & Kiran Gupta',
    blessingHeader: '|| Shree Ganeshay Namah ||',
    coupleQuote: 'Two souls, one synchronized beat, entering into forever.',
  });

  // Photo uploads
  const [bridePhoto, setBridePhoto] = useState<string | null>(SAMPLE_BRIDE_PHOTO);
  const [groomPhoto, setGroomPhoto] = useState<string | null>(SAMPLE_GROOM_PHOTO);
  const [caricatureProfile, setCaricatureProfile] = useState<CaricatureAIProfile | null>({
    groom: {
      features:
        'Charming 3D Pixar animated groom in tailored ivory sherwani with subtle gold lapel motifs, styled dark hair, warm smiling eyes.',
      expression: 'Lovestruck and beaming with adoration during the proposal and first dance.',
    },
    bride: {
      features:
        'Radiant 3D Pixar animated bride in blush pink & gold lehenga, gentle wavy locks adorned with floral blossoms, expressive hazel eyes.',
      expression: 'Emotional and overjoyed, hand over heart.',
    },
    vibe: 'Romantic wisteria twilight garden with glowing lavender bokeh, starburst sparkles, and fairy lights.',
    romanticQuote: 'Every love story is beautiful, but ours is our favorite.',
  });

  // Shared custom user uploads
  const [customUploads, setCustomUploads] = useState<SceneryOption[]>([]);

  // Video studio scenes
  const [scenes, setScenes] = useState<SceneItem[]>(DEFAULT_SCENES);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');

  // Music state
  const [customAudioTrack, setCustomAudioTrack] = useState<CustomAudioTrack | null>(null);
  const [currentMusicTheme, setCurrentMusicTheme] = useState<MusicTheme>('romantic-waltz');

  // Modals & Payment
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'date' | 'video'>('date');
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(isPaymentUnlocked());
  const [isHeaderPaymentModalOpen, setIsHeaderPaymentModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsPaid(isPaymentUnlocked());
    const unsubscribe = subscribeToPaymentChanges((details) => {
      setIsPaid(details.isUnlocked);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadSavedAppPhotos()
      .then((stored) => {
        if (stored.bridePhoto) setBridePhoto(stored.bridePhoto);
        if (stored.groomPhoto) setGroomPhoto(stored.groomPhoto);
        if (stored.customSceneries && stored.customSceneries.length > 0) {
          setCustomUploads(stored.customSceneries);
        }
        if (stored.savedScenes && stored.savedScenes.length > 0) {
          setScenes(stored.savedScenes);
        }
        if (stored.savedCouple) {
          setCouple(stored.savedCouple);
        }
        if (stored.customAudioTrack) {
          setCustomAudioTrack(stored.customAudioTrack);
          romanticAudio
            .loadCustomAudio(stored.customAudioTrack.name, stored.customAudioTrack.dataUrl)
            .catch((err) => {
              console.warn('Could not restore saved custom audio:', err);
            });
        }
      })
      .catch((err) => {
        console.warn('Failed to load saved state from IndexedDB:', err);
      });
  }, []);

  const activeStateTheme = INDIAN_STATE_THEMES[selectedState];

  const handleSelectState = (stateId: IndianStateId) => {
    setSelectedState(stateId);
    const theme = INDIAN_STATE_THEMES[stateId];

    setScenes(theme.scenes);
    persistSavedScenes(theme.scenes);

    setCouple((prev) => {
      const next = {
        ...prev,
        blessingHeader: theme.blessingHeader,
        ceremonyType: theme.ceremonyType,
        venue:
          prev.venue === 'Hotel Ashriya International' ||
          prev.venue === 'The Oberoi Palace & Lawns' ||
          Object.values(INDIAN_STATE_THEMES).some((t) => t.defaultVenue === prev.venue)
            ? theme.defaultVenue
            : prev.venue,
        city:
          prev.city === 'Delhi' ||
          Object.values(INDIAN_STATE_THEMES).some((t) => t.defaultCity === prev.city)
            ? theme.defaultCity
            : prev.city,
      };
      persistCoupleData(next);
      return next;
    });

    setCurrentMusicTheme(theme.musicTheme);
    romanticAudio.setTheme(theme.musicTheme);
    romanticAudio.playSparkleChime();
  };

  const handleCoupleChange = (updated: Partial<CoupleData>) => {
    setCouple((prev) => {
      const next = { ...prev, ...updated };
      persistCoupleData(next);
      return next;
    });
  };

  const handlePhotosChange = (bride: string | null, groom: string | null) => {
    setBridePhoto(bride);
    setGroomPhoto(groom);
    persistBridePhoto(bride);
    persistGroomPhoto(groom);
  };

  const handleAddCustomUpload = (newUpload: SceneryOption) => {
    setCustomUploads((prev) => {
      const next = [newUpload, ...prev];
      persistCustomSceneries(next);
      return next;
    });
  };

  const handleDeleteCustomUpload = (id: string) => {
    setCustomUploads((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persistCustomSceneries(next);
      return next;
    });
  };

  const handleAddPhotoToGallery = (imageUrl: string, label: string) => {
    const newUpload: SceneryOption = {
      id: `gallery-photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label,
      category: 'upload',
      imageUrl,
      description: 'Saved wedding photo from your uploaded collection',
      themeName: 'Saved in App',
    };
    handleAddCustomUpload(newUpload);
  };

  const handleCaricatureGenerated = (profile: CaricatureAIProfile) => {
    setCaricatureProfile(profile);
    if (profile.romanticQuote) {
      setCouple((prev) => {
        const next = { ...prev, coupleQuote: profile.romanticQuote || prev.coupleQuote };
        persistCoupleData(next);
        return next;
      });
    }
  };

  const handleUpdateScene = (index: number, updated: Partial<SceneItem>) => {
    setScenes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      persistSavedScenes(next);
      return next;
    });
  };

  const openDownloadDateModal = () => {
    setModalDefaultTab('date');
    setIsDownloadModalOpen(true);
  };

  const openDownloadVideoModal = () => {
    setModalDefaultTab('video');
    setIsDownloadModalOpen(true);
  };

  const jumpToSection = (section: MobileSectionId) => {
    setActiveMobileNav(section);
    const map: Record<MobileSectionId, React.RefObject<HTMLDivElement | null>> = {
      preview: previewSectionRef,
      themes: themesSectionRef,
      couple: coupleSectionRef,
      scenes: scenesSectionRef,
    };
    map[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleScrollToMusic = () => {
    setActiveMobileNav('scenes');
    musicSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 text-slate-100 flex flex-col font-sans-custom overflow-x-hidden pb-20 lg:pb-0">
      {/* Compact Studio Top App Bar (<= 56px on mobile) */}
      <header className="sticky top-0 z-40 h-14 sm:h-16 bg-slate-950/92 backdrop-blur-lg border-b border-purple-900/40 px-3 sm:px-6 flex items-center pt-safe">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-3 sm:gap-8">
          {/* Zone 1: Handcrafted Skyline Software Logo */}
          <BrandLogo size="sm" showWordmark variant="dark" />

          {/* Zone 2: Desktop Quick Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-purple-200/80">
            <button
              type="button"
              onClick={() => jumpToSection('themes')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Theme Templates
            </button>
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Saved Gallery
            </button>
            <button
              type="button"
              onClick={openDownloadDateModal}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Save Date
            </button>
            <button
              type="button"
              onClick={openDownloadVideoModal}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Export HD
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            {!isPaid ? (
              <button
                type="button"
                onClick={() => setIsHeaderPaymentModalOpen(true)}
                className="min-h-[40px] sm:min-h-[42px] px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-400 hover:via-pink-400 hover:to-purple-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition whitespace-nowrap shrink-0"
              >
                <Lock className="w-3.5 h-3.5 text-slate-950" />
                <span>Unlock · ₹{STUDIO_PRICE_INR}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openDownloadVideoModal}
                className="min-h-[40px] sm:min-h-[42px] px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition whitespace-nowrap shrink-0"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Download HD</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Studio Workspace — All Theme Templates & Controls Visible on Mobile & Desktop */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Right Column on Desktop / First on Mobile: Live Video Canvas Studio */}
          <div
            ref={previewSectionRef}
            className="scroll-mt-16 order-1 lg:order-2 lg:col-span-5 lg:sticky lg:top-20"
          >
            <VideoPlayer
              scenes={scenes}
              couple={couple}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              onOpenDownloadModal={openDownloadDateModal}
              onOpenVideoExport={openDownloadVideoModal}
              customAudioTrack={customAudioTrack}
              onScrollToMusic={handleScrollToMusic}
              onOpenPaymentModal={() => setIsHeaderPaymentModalOpen(true)}
            />
          </div>

          {/* Left Column on Desktop / Flowing Below Preview on Mobile: All 21 Theme Templates & Studio Editors */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-5 lg:space-y-6">
            {/* Simple 4-Step Quick Guide Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-2xl bg-slate-900/90 border border-purple-900/50">
              <button
                type="button"
                onClick={() => jumpToSection('themes')}
                className="min-h-[42px] px-2.5 py-2 rounded-xl bg-slate-950/90 hover:bg-purple-950/70 border border-purple-900/50 text-left transition flex items-center gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="text-xs font-semibold text-white truncate">Pick Theme</span>
              </button>

              <button
                type="button"
                onClick={() => jumpToSection('couple')}
                className="min-h-[42px] px-2.5 py-2 rounded-xl bg-slate-950/90 hover:bg-purple-950/70 border border-purple-900/50 text-left transition flex items-center gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="text-xs font-semibold text-white truncate">Couple & Date</span>
              </button>

              <button
                type="button"
                onClick={() => jumpToSection('scenes')}
                className="min-h-[42px] px-2.5 py-2 rounded-xl bg-slate-950/90 hover:bg-purple-950/70 border border-purple-900/50 text-left transition flex items-center gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="text-xs font-semibold text-white truncate">Music & Scenes</span>
              </button>

              <button
                type="button"
                onClick={openDownloadVideoModal}
                className="min-h-[42px] px-2.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 hover:from-amber-500/30 hover:to-pink-500/30 border border-amber-500/50 text-left transition flex items-center gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  4
                </span>
                <span className="text-xs font-bold text-amber-300 truncate">
                  {isPaid ? 'Download HD' : `Pay ₹${STUDIO_PRICE_INR} & Save`}
                </span>
              </button>
            </div>

            {/* All 21 Wedding Religion & Cultural Theme Templates (Always Visible) */}
            <div ref={themesSectionRef} className="scroll-mt-16">
              <IndianStateThemeSelector
                selectedState={selectedState}
                onSelectState={handleSelectState}
              />
            </div>

            {/* Saved App Photos & Media Gallery Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-950 to-pink-950/70 border border-purple-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-amber-400 flex items-center justify-center flex-shrink-0 shadow-md">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">
                    Saved App Photos & Media Gallery
                  </div>
                  <p className="text-xs text-purple-200/80 mt-0.5">
                    Browse 45+ wedding themes, proposals, dances & mandap rituals.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 flex-shrink-0"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Open Gallery</span>
              </button>
            </div>

            {/* Couple Photos & Wedding Details */}
            <div ref={coupleSectionRef} className="scroll-mt-16 space-y-5 lg:space-y-6">
              <PhotoUploader
                bridePhoto={bridePhoto}
                groomPhoto={groomPhoto}
                brideName={couple.brideName}
                groomName={couple.groomName}
                onPhotosChange={handlePhotosChange}
                caricatureProfile={caricatureProfile}
                onCaricatureGenerated={handleCaricatureGenerated}
                stateTheme={activeStateTheme}
                onAddPhotoToGallery={handleAddPhotoToGallery}
              />

              <DateAndDetailsForm
                couple={couple}
                onChange={handleCoupleChange}
                onOpenDownloadModal={openDownloadDateModal}
              />
            </div>

            {/* Background Music & 4 Story Scenes */}
            <div ref={scenesSectionRef} className="scroll-mt-16 space-y-5 lg:space-y-6">
              <div ref={musicSectionRef} className="scroll-mt-16">
                <MusicTrackManager
                  customAudioTrack={customAudioTrack}
                  onCustomAudioChange={setCustomAudioTrack}
                  currentTheme={currentMusicTheme}
                  onThemeChange={(th) => {
                    setCurrentMusicTheme(th);
                    romanticAudio.setTheme(th);
                  }}
                />
              </div>

              <SceneCustomizer
                scenes={scenes}
                onUpdateScene={handleUpdateScene}
                activeStateTheme={activeStateTheme}
                onResetScenesToTheme={() => {
                  setScenes(activeStateTheme.scenes);
                  persistSavedScenes(activeStateTheme.scenes);
                }}
                customUploads={customUploads}
                onAddCustomUpload={handleAddCustomUpload}
                onDeleteCustomUpload={handleDeleteCustomUpload}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Desktop Footer */}
      <footer className="hidden lg:block border-t border-purple-900/30 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-purple-300 font-medium">
            <BrandLogo size="sm" showWordmark variant="dark" />
            <span className="text-slate-500">·</span>
            <span>Pixar Wedding Video Studio ({activeStateTheme.name})</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Authentic cultural attire, festive blessings & real-time Pixar canvas video composer.
          </p>
        </div>
      </footer>

      {/* Mobile Fixed Thumb-Zone Bottom Jump Bar (< lg only, 56px height) */}
      <nav
        aria-label="Mobile quick navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-purple-900/50 pb-safe"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          <button
            type="button"
            onClick={() => jumpToSection('preview')}
            className={`min-h-[44px] h-full flex flex-col items-center justify-center gap-0.5 transition ${
              activeMobileNav === 'preview' ? 'text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span className="text-[10px] font-medium tracking-tight">Preview</span>
          </button>

          <button
            type="button"
            onClick={() => jumpToSection('themes')}
            className={`min-h-[44px] h-full flex flex-col items-center justify-center gap-0.5 transition ${
              activeMobileNav === 'themes' ? 'text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="text-[10px] font-medium tracking-tight">Themes</span>
          </button>

          <button
            type="button"
            onClick={() => jumpToSection('couple')}
            className={`min-h-[44px] h-full flex flex-col items-center justify-center gap-0.5 transition ${
              activeMobileNav === 'couple' ? 'text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span className="text-[10px] font-medium tracking-tight">Couple</span>
          </button>

          <button
            type="button"
            onClick={() => jumpToSection('scenes')}
            className={`min-h-[44px] h-full flex flex-col items-center justify-center gap-0.5 transition ${
              activeMobileNav === 'scenes' ? 'text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px] font-medium tracking-tight">Scenes</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="min-h-[44px] h-full flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-white transition"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-[10px] font-medium tracking-tight">Gallery</span>
          </button>
        </div>
      </nav>

      {/* Download & Export Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        couple={couple}
        scenes={scenes}
        aspectRatio={aspectRatio}
        defaultTab={modalDefaultTab}
      />

      {/* Saved App Photos & Media Gallery Modal */}
      <SavedAppPhotosGallery
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        scenes={scenes}
        onUpdateScene={handleUpdateScene}
        customUploads={customUploads}
        bridePhoto={bridePhoto}
        groomPhoto={groomPhoto}
        aspectRatio={aspectRatio}
      />

      {/* Header Quick Access Razorpay ₹299 Modal */}
      <PaymentModal
        isOpen={isHeaderPaymentModalOpen}
        onClose={() => setIsHeaderPaymentModalOpen(false)}
        targetItemName="Full HD Wedding Video & Card"
        coupleName={`${couple.brideName} & ${couple.groomName}`}
        onPaymentSuccess={() => {
          setIsPaid(true);
          setIsHeaderPaymentModalOpen(false);
          openDownloadVideoModal();
        }}
      />
    </div>
  );
}
