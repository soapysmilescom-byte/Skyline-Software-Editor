import React, { useRef, useState } from 'react';
import {
  Layers,
  Clock,
  Check,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  Heart,
  Search,
  Crown,
  Trash2,
  HardDrive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SceneItem, IndianStateTheme, SceneryOption } from '../types';
import {
  USER_UPLOADED_FOUR_HERO_SCENES,
  ALL_UPLOADED_AND_SACRED_SCENES,
  ALL_CURATED_SCENES,
} from '../assets/scenes';

interface SceneCustomizerProps {
  scenes: SceneItem[];
  onUpdateScene: (index: number, updated: Partial<SceneItem>) => void;
  activeStateTheme: IndianStateTheme;
  onResetScenesToTheme?: () => void;
  customUploads: SceneryOption[];
  onAddCustomUpload: (upload: SceneryOption) => void;
  onDeleteCustomUpload: (id: string) => void;
}

type FilterTab = 'hero' | 'custom' | 'uploaded' | 'theme' | 'all';

export const SceneCustomizer: React.FC<SceneCustomizerProps> = ({
  scenes,
  onUpdateScene,
  activeStateTheme,
  onResetScenesToTheme,
  customUploads,
  onAddCustomUpload,
  onDeleteCustomUpload,
}) => {
  const [sceneTab, setSceneTab] = useState<{ [sceneIdx: number]: FilterTab }>({
    0: 'hero',
    1: 'hero',
    2: 'hero',
    3: 'hero',
  });
  const [expandedBrowsers, setExpandedBrowsers] = useState<{ [sceneIdx: number]: boolean }>({});
  const [sceneSearch, setSceneSearch] = useState<{ [sceneIdx: number]: string }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sceneCardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const masterGalleryInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApplyFourUploadedToAllScenes = () => {
    USER_UPLOADED_FOUR_HERO_SCENES.forEach((hero, index) => {
      if (index < scenes.length) {
        onUpdateScene(index, {
          imageUrl: hero.imageUrl,
          title:
            index === 0
              ? 'Finally...'
              : index === 1
              ? 'The Wait is Over'
              : index === 2
              ? 'Making It Official'
              : 'We Are Getting Married!',
          subtitle: hero.label.replace(/^👑 \d+\.\s*/, ''),
        });
      }
    });

    showToast('Applied the 4 featured images across Scenes 1–4.');
  };

  const handleCustomImageUpload = (
    sceneIndex: number | null,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, fIdx) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const newUpload: SceneryOption = {
            id: `custom-upload-${Date.now()}-${fIdx}-${Math.random().toString(36).substring(2, 6)}`,
            label: `${file.name.replace(/\.[^/.]+$/, '').substring(0, 24) || 'Uploaded Photo'}`,
            category: 'upload',
            imageUrl: result,
            description: 'Saved user uploaded photo',
            themeName: 'My Upload',
          };

          onAddCustomUpload(newUpload);

          if (sceneIndex !== null && fIdx === 0) {
            onUpdateScene(sceneIndex, { imageUrl: result });
            setSceneTab((prev) => ({ ...prev, [sceneIndex]: 'custom' }));
          }
        }
      };
      reader.readAsDataURL(file);
    });

    showToast(`Saved ${files.length} photo${files.length > 1 ? 's' : ''} to your gallery!`);

    if (e.target) {
      e.target.value = '';
    }
  };

  const getCategoryBadgeColor = (category: SceneryOption['category']) => {
    switch (category) {
      case 'ritual':
        return 'bg-amber-900/85 text-amber-200 border-amber-600/60';
      case 'proposal':
        return 'bg-pink-900/80 text-pink-200 border-pink-700/60';
      case 'dance':
        return 'bg-purple-900/80 text-purple-200 border-purple-700/60';
      case 'attire':
        return 'bg-amber-900/80 text-amber-200 border-amber-700/60';
      case 'mandap':
        return 'bg-emerald-900/80 text-emerald-200 border-emerald-700/60';
      case 'upload':
        return 'bg-indigo-900/85 text-indigo-200 border-indigo-600/70';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getDisplayOptions = (sceneIndex: number): SceneryOption[] => {
    const currentTab = sceneTab[sceneIndex] || 'hero';
    const query = (sceneSearch[sceneIndex] || '').toLowerCase().trim();

    let baseList: SceneryOption[] = [];

    switch (currentTab) {
      case 'hero':
        baseList = USER_UPLOADED_FOUR_HERO_SCENES;
        break;
      case 'uploaded':
        baseList = [...customUploads, ...ALL_UPLOADED_AND_SACRED_SCENES];
        break;
      case 'theme':
        baseList = [...USER_UPLOADED_FOUR_HERO_SCENES, ...activeStateTheme.sceneryOptions];
        break;
      case 'all':
        baseList = [...customUploads, ...ALL_CURATED_SCENES];
        break;
      case 'custom':
        baseList = customUploads;
        break;
      default:
        baseList = USER_UPLOADED_FOUR_HERO_SCENES;
    }

    if (!query) return baseList;

    return baseList.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.description.toLowerCase().includes(query) ||
        opt.category.toLowerCase().includes(query) ||
        (opt.themeName && opt.themeName.toLowerCase().includes(query))
    );
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-purple-900/40 p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              4. Customize 4 Story Scenes
            </h2>
          </div>
          <p className="text-xs text-purple-300/80 mt-0.5">
            Edit headlines, duration, or swap images for each scene in your video.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="apply-4-uploaded-scenes-btn"
            type="button"
            onClick={handleApplyFourUploadedToAllScenes}
            className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-bold text-xs transition shadow-md active:scale-95"
          >
            <Crown className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span>Featured 4 Scenes</span>
          </button>

          {onResetScenesToTheme && (
            <button
              id="reset-scenes-to-theme-btn"
              type="button"
              onClick={onResetScenesToTheme}
              className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-200 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset to Theme</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Upload Custom Photos Bar */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Upload Your Own Scene Photos</span>
                {customUploads.length > 0 && (
                  <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                    {customUploads.length} saved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Saved automatically in your browser so you can tap S1–S4 to apply them anywhere.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <input
              ref={masterGalleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleCustomImageUpload(null, e)}
            />
            <button
              id="upload-master-gallery-btn"
              type="button"
              onClick={() => masterGalleryInputRef.current?.click()}
              className="min-h-[42px] w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photos</span>
            </button>
          </div>
        </div>

        {customUploads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[190px] overflow-y-auto pr-1 pt-1">
            {customUploads.map((item) => (
              <div
                key={`saved-gallery-${item.id}`}
                className="group relative rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-900 p-1 flex flex-col"
              >
                <div className="relative aspect-[9/12] w-full rounded-lg overflow-hidden bg-black mb-1">
                  <img
                    src={item.imageUrl}
                    alt={item.label}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteCustomUpload(item.id);
                      showToast(`Removed "${item.label}".`);
                    }}
                    className="absolute top-1 right-1 min-w-[30px] min-h-[30px] flex items-center justify-center rounded-full bg-red-950/90 hover:bg-red-600 text-red-200 hover:text-white transition shadow"
                    title="Delete photo"
                    aria-label={`Delete ${item.label}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[10px] font-semibold text-slate-200 truncate block px-0.5">
                  {item.label}
                </span>

                <div className="grid grid-cols-4 gap-1 mt-1 pt-1 border-t border-purple-900/40 text-[9px]">
                  {[0, 1, 2, 3].map((sIdx) => (
                    <button
                      key={`assign-${item.id}-scene-${sIdx + 1}`}
                      type="button"
                      onClick={() => {
                        onUpdateScene(sIdx, { imageUrl: item.imageUrl });
                        showToast(`Applied photo to Scene ${sIdx + 1}!`);
                      }}
                      className={`py-1 rounded font-bold transition text-center ${
                        scenes[sIdx]?.imageUrl === item.imageUrl
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-purple-950/80 hover:bg-purple-900 text-purple-200'
                      }`}
                    >
                      S{sIdx + 1}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Quick Scene Jump Strip */}
      <div className="md:hidden grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950 border border-purple-900/60">
        {scenes.map((s, sIdx) => (
          <button
            key={`mobile-tab-${s.id}`}
            type="button"
            onClick={() => {
              sceneCardRefs.current[sIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="min-h-[42px] px-2 py-1.5 rounded-lg text-xs font-bold transition truncate bg-slate-900/70 hover:bg-purple-700 text-purple-100"
          >
            Scene {s.id}
          </button>
        ))}
      </div>

      {/* 4 Story Scenes */}
      <div className="space-y-4">
        {scenes.map((scene, idx) => {
          const currentTab = sceneTab[idx] || 'hero';
          const displayOptions = getDisplayOptions(idx);
          const currentSearch = sceneSearch[idx] || '';
          const isBrowserExpanded = Boolean(expandedBrowsers[idx]);

          return (
            <div
              key={scene.id}
              ref={(el) => {
                sceneCardRefs.current[idx] = el;
              }}
              className="scroll-mt-16 p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-purple-900/50 hover:border-purple-700/60 transition space-y-3"
            >
              {/* Top Bar: Scene Badge, Preview Thumbnail & Duration */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-purple-900/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={scene.imageUrl}
                    alt={scene.title}
                    className="w-9 h-12 rounded-lg object-cover border border-amber-400/50 shrink-0 bg-black"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-950 text-amber-300 border border-purple-800/70 inline-block">
                      Scene {scene.id}
                    </span>
                    <div className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                      {scene.title || `Scene ${scene.id}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900 px-2.5 py-1 rounded-xl border border-purple-900/40">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[11px]">Sec:</span>
                    <input
                      id={`scene-${scene.id}-duration-input`}
                      type="number"
                      min="2"
                      max="15"
                      step="0.5"
                      value={scene.duration}
                      onChange={(e) =>
                        onUpdateScene(idx, { duration: parseFloat(e.target.value) || 5 })
                      }
                      className="w-12 min-h-[34px] px-1.5 py-0.5 rounded bg-slate-950 border border-purple-900/60 text-right text-purple-200 text-base sm:text-xs font-semibold outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>

              {/* Scene Headline & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase font-bold text-purple-300/80 block">
                    Scene Headline
                  </label>
                  <input
                    id={`scene-${scene.id}-title-input`}
                    type="text"
                    value={scene.title}
                    onChange={(e) => onUpdateScene(idx, { title: e.target.value })}
                    className="w-full min-h-[44px] mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-purple-900/60 text-white font-semibold text-base sm:text-xs outline-none focus:border-amber-400 transition"
                    placeholder="e.g. Finally..."
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-purple-300/80 block">
                    Subtitle / Caption
                  </label>
                  <input
                    id={`scene-${scene.id}-subtitle-input`}
                    type="text"
                    value={scene.subtitle}
                    onChange={(e) => onUpdateScene(idx, { subtitle: e.target.value })}
                    className="w-full min-h-[44px] mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-purple-900/60 text-purple-200 text-base sm:text-xs outline-none focus:border-amber-400 transition"
                    placeholder="e.g. Two Hearts Dancing as One"
                  />
                </div>
              </div>

              {/* Quick Scene Action Bar: Toggle Background Library or Upload Photo */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedBrowsers((prev) => ({ ...prev, [idx]: !prev[idx] }))
                  }
                  className="min-h-[42px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-950/70 border border-purple-800/60 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isBrowserExpanded ? 'Hide Scenery Picker' : 'Change Scene Background'}</span>
                  {isBrowserExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={(el) => {
                      fileInputRefs.current[idx] = el;
                    }}
                    onChange={(e) => handleCustomImageUpload(idx, e)}
                  />
                  <button
                    id={`scene-${scene.id}-upload-custom-btn`}
                    type="button"
                    onClick={() => fileInputRefs.current[idx]?.click()}
                    className="min-h-[42px] flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-950/80 border border-purple-700/60 text-purple-200 hover:text-white transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload Photo for Scene {scene.id}</span>
                  </button>
                </div>
              </div>

              {/* Expandable Scenery Library Picker */}
              {isBrowserExpanded && (
                <div className="pt-2 border-t border-purple-900/30 space-y-3">
                  {/* Filter Tabs & Search Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSceneTab((prev) => ({ ...prev, [idx]: 'hero' }))}
                        className={`min-h-[36px] text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                          currentTab === 'hero'
                            ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-purple-200 hover:bg-slate-800 border border-purple-900/50'
                        }`}
                      >
                        <Crown className="w-3 h-3" />
                        <span>Featured (4)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSceneTab((prev) => ({ ...prev, [idx]: 'theme' }))}
                        className={`min-h-[36px] text-[11px] px-2.5 py-1 rounded-lg font-semibold transition ${
                          currentTab === 'theme'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-purple-200 hover:bg-slate-800 border border-purple-900/50'
                        }`}
                      >
                        <span>{activeStateTheme.stateLabel}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSceneTab((prev) => ({ ...prev, [idx]: 'uploaded' }))}
                        className={`min-h-[36px] text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                          currentTab === 'uploaded'
                            ? 'bg-pink-600 text-white font-bold'
                            : 'bg-slate-900 text-purple-200 hover:bg-slate-800 border border-purple-900/50'
                        }`}
                      >
                        <Heart className="w-3 h-3" />
                        <span>Sacred ({ALL_UPLOADED_AND_SACRED_SCENES.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSceneTab((prev) => ({ ...prev, [idx]: 'custom' }))}
                        className={`min-h-[36px] text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                          currentTab === 'custom'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-900 text-purple-200 hover:bg-slate-800 border border-purple-900/50'
                        }`}
                      >
                        <HardDrive className="w-3 h-3" />
                        <span>My Uploads ({customUploads.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSceneTab((prev) => ({ ...prev, [idx]: 'all' }))}
                        className={`min-h-[36px] text-[11px] px-2.5 py-1 rounded-lg font-semibold transition ${
                          currentTab === 'all'
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-slate-900 text-purple-200 hover:bg-slate-800 border border-purple-900/50'
                        }`}
                      >
                        <span>All ({ALL_CURATED_SCENES.length})</span>
                      </button>
                    </div>

                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={currentSearch}
                        onChange={(e) =>
                          setSceneSearch((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        placeholder="Search scenery..."
                        className="w-full min-h-[38px] pl-8 pr-2 py-1 text-base sm:text-xs rounded-lg bg-slate-900 border border-purple-900/60 text-purple-100 placeholder-purple-400/50 outline-none focus:border-amber-400 transition"
                      />
                    </div>
                  </div>

                  {/* Options Grid */}
                  {displayOptions.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-purple-900/30 text-purple-300/70 text-xs">
                      No scenery found matching &ldquo;{currentSearch}&rdquo; in this tab.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1 max-h-[320px] overflow-y-auto pr-1">
                      {displayOptions.map((opt) => {
                        const isCurrent = scene.imageUrl === opt.imageUrl;

                        return (
                          <button
                            key={`${scene.id}-${opt.id}`}
                            id={`scene-${scene.id}-opt-${opt.id}`}
                            type="button"
                            onClick={() => onUpdateScene(idx, { imageUrl: opt.imageUrl })}
                            className={`group relative rounded-xl overflow-hidden border p-1 text-left flex flex-col transition shadow-md ${
                              isCurrent
                                ? 'border-amber-400 ring-2 ring-amber-400/50 bg-purple-950/90'
                                : 'border-purple-900/50 bg-slate-900/90 hover:border-purple-500/70 hover:bg-purple-950/40'
                            }`}
                          >
                            <div className="relative aspect-[9/14] w-full rounded-lg overflow-hidden bg-black mb-1.5">
                              <img
                                src={opt.imageUrl}
                                alt={opt.label}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />

                              {isCurrent && (
                                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center gap-0.5 shadow-md z-10">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>Active</span>
                                </div>
                              )}

                              <div
                                className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border backdrop-blur-sm ${getCategoryBadgeColor(
                                  opt.category
                                )}`}
                              >
                                {opt.category}
                              </div>

                              {opt.category === 'upload' ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteCustomUpload(opt.id);
                                    showToast(`Removed "${opt.label}".`);
                                  }}
                                  className="absolute top-1 left-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full bg-red-950/90 hover:bg-red-600 text-red-200 hover:text-white transition shadow z-10"
                                  title="Delete photo"
                                  aria-label={`Delete ${opt.label}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              ) : (
                                opt.themeName && (
                                  <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[8px] font-semibold text-purple-200 border border-white/10 max-w-[75%] truncate">
                                    {opt.themeName}
                                  </div>
                                )
                              )}
                            </div>

                            <div className="px-1 pb-1">
                              <div
                                className={`text-[11px] font-bold leading-tight line-clamp-1 ${
                                  isCurrent ? 'text-amber-300' : 'text-slate-200 group-hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
