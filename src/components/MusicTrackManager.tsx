import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Trash2,
  Sparkles,
  CheckCircle2,
  Disc3,
  FileAudio,
  Radio,
  Sliders,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MusicTheme, CustomAudioTrack } from '../types';
import { romanticAudio } from '../utils/audioEngine';
import { persistCustomAudioTrack } from '../utils/storage';

interface MusicTrackManagerProps {
  customAudioTrack: CustomAudioTrack | null;
  onCustomAudioChange: (track: CustomAudioTrack | null) => void;
  currentTheme: MusicTheme;
  onThemeChange: (theme: MusicTheme) => void;
}

export const MusicTrackManager: React.FC<MusicTrackManagerProps> = ({
  customAudioTrack,
  onCustomAudioChange,
  currentTheme,
  onThemeChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(romanticAudio.getIsPlaying());
  const [volume, setVolume] = useState<number>(romanticAudio.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'custom' | 'preset'>(
    customAudioTrack ? 'custom' : 'preset'
  );

  // Subscribe to audio engine changes
  useEffect(() => {
    const unsubscribe = romanticAudio.subscribe(() => {
      setIsPlaying(romanticAudio.getIsPlaying());
      setVolume(romanticAudio.getVolume());
    });
    return unsubscribe;
  }, []);

  // Sync mode with props
  useEffect(() => {
    if (customAudioTrack) {
      setActiveMode('custom');
    }
  }, [customAudioTrack]);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate audio file
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|aac|m4a|ogg|flac)$/i.test(file.name)) {
      setUploadError('Please choose a valid audio file (MP3, WAV, AAC, M4A, OGG).');
      return;
    }

    // Limit size to ~50MB
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Audio file is too large (maximum 50MB). Please select a shorter song.');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Read as Data URL for IndexedDB persistence
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(file);
      });

      // Load into audio engine & decode buffer
      const duration = await romanticAudio.loadCustomAudio(file.name, dataUrl);

      const trackData: CustomAudioTrack = {
        id: `audio-${Date.now()}`,
        name: file.name,
        dataUrl,
        duration,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type || 'audio/mpeg',
      };

      // Persist in IndexedDB
      await persistCustomAudioTrack(trackData);
      onCustomAudioChange(trackData);
      setActiveMode('custom');
      setUploadSuccess(`"${file.name}" loaded successfully! Ready for video export.`);

      // Reset file input value so user can re-upload same file if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      console.error('Audio upload error:', err);
      setUploadError(err.message || 'Could not decode audio. Try standard MP3 or WAV format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveCustomAudio = async () => {
    romanticAudio.clearCustomAudio();
    await persistCustomAudioTrack(null);
    onCustomAudioChange(null);
    setActiveMode('preset');
    setUploadSuccess('Reverted to built-in romantic wedding background music.');
    setTimeout(() => setUploadSuccess(null), 3500);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      romanticAudio.stop();
    } else {
      romanticAudio.start();
    }
    setIsPlaying(romanticAudio.getIsPlaying());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    romanticAudio.setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      romanticAudio.setVolume(volume || 0.6);
      setIsMuted(false);
    } else {
      romanticAudio.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSwitchMode = (mode: 'custom' | 'preset') => {
    setActiveMode(mode);
    if (mode === 'custom' && customAudioTrack) {
      romanticAudio.setCustomAudioMode(true);
    } else {
      romanticAudio.setCustomAudioMode(false);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-purple-900/40 p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Background Music & Audio Track</span>
          </h2>
          <p className="text-xs text-purple-300/80 mt-0.5">
            Upload your favorite song (MP3 / WAV) or choose a built-in wedding preset
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-purple-900/60">
          <button
            type="button"
            onClick={() => handleSwitchMode('custom')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeMode === 'custom'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Custom Song {customAudioTrack ? '✓' : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('preset')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeMode === 'preset'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Presets</span>
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center gap-2 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Custom Music Upload Section */}
      {activeMode === 'custom' && (
        <div className="space-y-3">
          {customAudioTrack ? (
            /* Uploaded Track Active Card */
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-slate-950 to-pink-950/70 border border-purple-600/50 space-y-3 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-900/40">
                    <FileAudio className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase tracking-wider text-[10px]">
                        Active Custom Track
                      </span>
                      {customAudioTrack.fileSize && (
                        <span className="text-[11px] text-slate-400">
                          {customAudioTrack.fileSize}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm truncate mt-0.5">
                      {customAudioTrack.name}
                    </h3>
                    <p className="text-xs text-purple-300/80">
                      Duration: {formatDuration(customAudioTrack.duration)} • Looped seamlessly in video
                    </p>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={handleRemoveCustomAudio}
                  className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 hover:text-white text-xs transition flex-shrink-0"
                  title="Remove custom track & revert to built-in presets"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Action buttons for uploaded track */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-900/40">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlayback}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlaying ? 'Pause Song' : 'Play Song'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-950 border border-purple-800/60 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Replace Song</span>
                  </button>
                </div>

                <div className="text-[11px] text-amber-300/90 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Captured directly in HD Video export</span>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-800/60 hover:border-amber-400/80 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-950/60 hover:bg-purple-950/30 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600/30 to-pink-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:text-amber-300 group-hover:scale-110 transition duration-300 mb-3 shadow-lg">
                {isProcessing ? (
                  <Disc3 className="w-7 h-7 animate-spin text-amber-400" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                {isProcessing ? 'Processing & Decoding Audio Track...' : 'Click or Drag & Drop Audio File Here'}
              </h3>
              <p className="text-xs text-purple-300/80 mt-1 max-w-sm mx-auto">
                Supports MP3, WAV, AAC, M4A, OGG from your phone or laptop.
                Your custom music plays seamlessly in live preview and is embedded into the downloaded video.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                  MP3
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                  WAV
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                  M4A / AAC
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                  OGG
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input for replacement */}
      {customAudioTrack && (
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg"
          onChange={handleFileUpload}
          className="hidden"
        />
      )}

      {/* Built-in Presets Section */}
      {activeMode === 'preset' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              {
                id: 'romantic-waltz',
                title: '🎻 Romantic Waltz',
                key: 'Eb Major Waltz',
                desc: 'Warm grand piano & orchestral cello waltz',
              },
              {
                id: 'fairytale-ballad',
                title: '✨ Fairytale Ballad',
                key: 'F Major Ballad',
                desc: 'Emotional Disney/Pixar magical romantic chord progression',
              },
              {
                id: 'celestial-piano',
                title: '🎹 Celestial Piano',
                key: 'Db Major Harmony',
                desc: 'Peaceful zen chimes, meditative arpeggios & temple tones',
              },
              {
                id: 'festive-sangeet',
                title: '🎉 Festive Sangeet',
                key: 'D Major Vivaha',
                desc: 'Celebratory shehnai harmony with energetic wedding sparkle',
              },
            ].map((preset) => {
              const isSelected = currentTheme === preset.id && !romanticAudio.getCustomAudioInfo().isCustomMode;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onThemeChange(preset.id as MusicTheme);
                    romanticAudio.setCustomAudioMode(false);
                    romanticAudio.setTheme(preset.id as MusicTheme);
                    romanticAudio.playSparkleChime();
                  }}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-950/80 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                      : 'bg-slate-950/60 border-purple-900/40 hover:border-purple-600/70 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      {preset.title}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-purple-300/80 mt-1">{preset.desc}</p>
                  <span className="text-[10px] font-mono text-amber-300/70 mt-1.5">{preset.key}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Volume & Audio Test Controls */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-purple-900/30 text-xs">
        {/* Playback & Sparkle Test */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow transition ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause Audio' : 'Preview Audio'}</span>
          </button>

          <button
            type="button"
            onClick={() => romanticAudio.playSparkleChime()}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-purple-950 text-amber-300 border border-amber-500/40 flex items-center gap-1 transition"
            title="Play proposal ring chime"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Twinkle Chime</span>
          </button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-purple-900/40">
          <button
            type="button"
            onClick={toggleMute}
            className="text-purple-300 hover:text-white transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 accent-amber-400 h-1.5 rounded-lg bg-purple-950 cursor-pointer"
            title="Master Studio Volume"
          />
          <span className="text-[10px] font-mono text-purple-300 w-8 text-right">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
