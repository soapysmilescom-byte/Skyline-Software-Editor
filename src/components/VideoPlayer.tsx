import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Smartphone,
  Tv,
  Film,
  Download,
  Calendar,
  Lock,
} from 'lucide-react';
import { CoupleData, SceneItem, AspectRatioType, MusicTheme, CustomAudioTrack } from '../types';
import { VideoRenderer } from '../utils/videoRenderer';
import { romanticAudio } from '../utils/audioEngine';
import { isPaymentUnlocked, subscribeToPaymentChanges, STUDIO_PRICE_INR } from '../utils/payment';

interface VideoPlayerProps {
  scenes: SceneItem[];
  couple: CoupleData;
  aspectRatio: AspectRatioType;
  onAspectRatioChange: (ratio: AspectRatioType) => void;
  onOpenDownloadModal: () => void;
  onOpenVideoExport: () => void;
  customAudioTrack?: CustomAudioTrack | null;
  onScrollToMusic?: () => void;
  onOpenPaymentModal?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  scenes,
  couple,
  aspectRatio,
  onAspectRatioChange,
  onOpenDownloadModal,
  onOpenVideoExport,
  customAudioTrack,
  onScrollToMusic,
  onOpenPaymentModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<VideoRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [musicTheme, setMusicTheme] = useState<MusicTheme>(romanticAudio.getCurrentTheme());
  const [volume, setVolume] = useState<number>(romanticAudio.getVolume());
  const [customAudioInfo, setCustomAudioInfo] = useState(romanticAudio.getCustomAudioInfo());
  const [isPaid, setIsPaid] = useState<boolean>(isPaymentUnlocked());

  // Listen to payment updates
  useEffect(() => {
    setIsPaid(isPaymentUnlocked());
    const unsubscribe = subscribeToPaymentChanges((details) => {
      setIsPaid(details.isUnlocked);
    });
    return unsubscribe;
  }, []);

  // Listen to romanticAudio engine updates
  useEffect(() => {
    const unsubscribe = romanticAudio.subscribe(() => {
      setMusicTheme(romanticAudio.getCurrentTheme());
      setVolume(romanticAudio.getVolume());
      setCustomAudioInfo(romanticAudio.getCustomAudioInfo());
    });
    return unsubscribe;
  }, []);

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);

  // Determine active scene index based on currentTime
  let activeSceneIndex = 0;
  let accumulated = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (currentTime >= accumulated && currentTime < accumulated + scenes[i].duration) {
      activeSceneIndex = i;
      break;
    }
    accumulated += scenes[i].duration;
  }
  const currentScene = scenes[activeSceneIndex] || scenes[0];

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new VideoRenderer(canvasRef.current);
    renderer.resize(aspectRatio, false);
    renderer.preloadImages(scenes);
    rendererRef.current = renderer;

    // Start background audio if not muted
    if (!isAudioMuted) {
      romanticAudio.start();
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [aspectRatio]);

  // Keep images preloaded when scenes change
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.preloadImages(scenes);
    }
  }, [scenes]);

  // Animation Loop
  const tick = useCallback(
    (timestamp: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setCurrentTime((prev) => {
        let next = prev;
        if (isPlaying) {
          next = prev + delta;
          if (next >= totalDuration) {
            next = 0; // Loop seamlessly
          }
        }
        if (rendererRef.current) {
          rendererRef.current.renderFrame(next, scenes, couple);
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [isPlaying, scenes, couple, totalDuration]
  );

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tick]);

  const togglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next && !isAudioMuted) {
        romanticAudio.start();
      } else {
        romanticAudio.stop();
      }
      return next;
    });
  };

  const restartVideo = () => {
    setCurrentTime(0);
    lastTimestampRef.current = performance.now();
    setIsPlaying(true);
    if (!isAudioMuted) {
      romanticAudio.start();
      romanticAudio.playSparkleChime();
    }
  };

  const jumpToScene = (sceneIndex: number) => {
    let t = 0;
    for (let i = 0; i < sceneIndex; i++) {
      t += scenes[i].duration;
    }
    setCurrentTime(t);
    lastTimestampRef.current = performance.now();
    if (sceneIndex === 0) {
      romanticAudio.playSparkleChime();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    lastTimestampRef.current = performance.now();
    if (rendererRef.current) {
      rendererRef.current.renderFrame(newTime, scenes, couple);
    }
  };

  const toggleMute = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      if (next) {
        romanticAudio.stop();
      } else if (isPlaying) {
        romanticAudio.start();
      }
      return next;
    });
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const th = e.target.value as MusicTheme;
    setMusicTheme(th);
    romanticAudio.setTheme(th);
  };

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-purple-900/40 p-3.5 sm:p-5 shadow-2xl flex flex-col items-center w-full">
      {/* Top Header Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-purple-900/30">
        <div className="flex items-center gap-2 min-w-0">
          <Film className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold tracking-wide text-purple-100 truncate">
            Live Studio Preview
          </span>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-purple-800/40 shrink-0">
          <button
            type="button"
            onClick={() => onAspectRatioChange('9:16')}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              aspectRatio === '9:16'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="9:16 Mobile Reel / Story format"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16 Reel</span>
          </button>
          <button
            type="button"
            onClick={() => onAspectRatioChange('16:9')}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              aspectRatio === '16:9'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="16:9 Cinematic Landscape"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>16:9 Cinema</span>
          </button>
        </div>
      </div>

      {/* Video Canvas Container */}
      <div
        className={`relative overflow-hidden rounded-2xl shadow-2xl border border-purple-500/30 bg-black flex items-center justify-center transition-all duration-300 ${
          aspectRatio === '9:16'
            ? 'w-full max-w-[300px] sm:max-w-[340px] md:max-w-[370px] aspect-[9/16]'
            : 'w-full max-w-[640px] aspect-[16/9]'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Floating Active Scene Badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/40 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 shadow-lg pointer-events-none">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Scene {currentScene.id}: {currentScene.title}</span>
        </div>

        {/* Play Overlay Hint when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-purple-600/80 hover:bg-purple-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transition hover:scale-110 active:scale-95"
            aria-label="Play Video"
          >
            <Play className="w-8 h-8 fill-current ml-1" />
          </button>
        )}
      </div>

      {/* Scrubber Timeline & Scene Markers */}
      <div className="w-full max-w-xl mt-3.5 space-y-2.5">
        {/* Scene Jump Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
          {scenes.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jumpToScene(idx)}
              className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[11px] font-bold truncate transition border ${
                activeSceneIndex === idx
                  ? 'bg-purple-600/90 text-white border-amber-400 shadow-md shadow-purple-900/40'
                  : 'bg-slate-950/70 hover:bg-purple-950/60 text-slate-300 border-purple-900/40'
              }`}
              title={`Jump to Scene ${s.id}: ${s.title}`}
            >
              S{s.id}: {s.title.replace('...', '')}
            </button>
          ))}
        </div>

        {/* Scrubber Slider */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-mono tabular-nums text-purple-300 w-10 text-right">
            {formatTimecode(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-amber-400 cursor-pointer h-2 rounded-lg bg-purple-950/80"
          />
          <span className="text-[11px] font-mono tabular-nums text-slate-400 w-10">
            {formatTimecode(totalDuration)}
          </span>
        </div>
      </div>

      {/* Control Bar & Audio Synthesizer Controls */}
      <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-2.5 pt-3 mt-2.5 border-t border-purple-900/30">
        {/* Play / Pause / Restart */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md active:scale-95 transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            type="button"
            onClick={restartVideo}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-950 hover:bg-purple-950 text-slate-300 hover:text-white border border-purple-900/40 transition"
            title="Replay from start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => romanticAudio.playSparkleChime()}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-purple-950 text-amber-300 text-xs font-semibold border border-amber-500/40 flex items-center gap-1.5 transition whitespace-nowrap"
            title="Ring sparkle chime"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Twinkle</span>
          </button>
        </div>

        {/* Music Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={toggleMute}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition ${
              isAudioMuted
                ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                : 'bg-purple-950/60 border-purple-800/60 text-purple-300'
            }`}
            title={isAudioMuted ? 'Unmute music' : 'Mute music'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <select
            value={customAudioInfo.isCustomMode ? 'custom-uploaded' : musicTheme}
            onChange={(e) => {
              if (e.target.value === 'custom-uploaded') {
                romanticAudio.setCustomAudioMode(true);
              } else if (e.target.value === 'upload-new') {
                if (onScrollToMusic) onScrollToMusic();
              } else {
                handleThemeChange(e);
                romanticAudio.setCustomAudioMode(false);
              }
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-purple-800/50 text-purple-200 text-base sm:text-xs outline-none max-w-[155px] truncate"
            title="Background Audio Track"
          >
            {customAudioInfo.hasCustom && (
              <option value="custom-uploaded">
                {customAudioInfo.name.substring(0, 16)}
              </option>
            )}
            <option value="romantic-waltz">Romantic Waltz</option>
            <option value="fairytale-ballad">Fairytale Ballad</option>
            <option value="celestial-piano">Celestial Piano</option>
            <option value="festive-sangeet">Festive Sangeet</option>
            <option value="upload-new">Upload New Song...</option>
          </select>
        </div>
      </div>

      {/* Primary Export Actions (Download Video + Download Date) */}
      <div className="w-full max-w-xl space-y-2.5 mt-4 pt-3 border-t border-purple-900/30">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onOpenVideoExport}
            className={`min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition ${
              !isPaid
                ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-400 hover:via-pink-400 hover:to-purple-500 text-slate-950 shadow-amber-950/30'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 text-white shadow-purple-900/40'
            }`}
          >
            {!isPaid ? <Lock className="w-4 h-4 text-slate-950 shrink-0" /> : <Download className="w-4 h-4 shrink-0" />}
            <span className="truncate">
              {!isPaid ? `Pay ₹${STUDIO_PRICE_INR} & Download Video` : 'Download HD Video'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenDownloadModal}
            className="min-h-[48px] py-3 px-4 rounded-xl bg-slate-950 hover:bg-purple-950 border border-purple-700/60 text-amber-300 font-bold text-sm shadow flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              {!isPaid ? `Save Date Card · ₹${STUDIO_PRICE_INR}` : 'Date & Invitation Card'}
            </span>
          </button>
        </div>

        {/* Payment Gateway Status */}
        {!isPaid ? (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-amber-300/90 pt-0.5">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>One-time ₹{STUDIO_PRICE_INR} Razorpay pass unlocks all HD/4K downloads</span>
            </span>
            {onOpenPaymentModal && (
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="text-amber-300 hover:text-white underline font-semibold"
              >
                Pay Now
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-xs text-emerald-400 flex items-center justify-center gap-1.5 pt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Studio Pass Active · Unlimited 4K/HD Downloads Unlocked</span>
          </div>
        )}
      </div>
    </div>
  );
};
