import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Maximize,
  Bookmark as BookmarkIcon,
  ChevronDown,
  Music,
} from 'lucide-react';
import { formatTime } from '../../utils/formatters';
import { Bookmark } from '../../types';

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}

interface VideoPlayerProps {
  src: string;
  mediaType?: 'video' | 'audio';
  title?: string;
  bookmarks?: Bookmark[];
  onTimeUpdate?: (currentTime: number) => void;
  onAddBookmarkAtCurrentTime?: (time: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ src, mediaType = 'video', title, bookmarks = [], onTimeUpdate, onAddBookmarkAtCurrentTime }, ref) => {
    const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (mediaRef.current) {
          mediaRef.current.currentTime = Math.max(0, Math.min(seconds, duration || seconds));
          setCurrentTime(mediaRef.current.currentTime);
          if (onTimeUpdate) onTimeUpdate(mediaRef.current.currentTime);
        }
      },
      play: () => {
        mediaRef.current?.play();
      },
      pause: () => {
        mediaRef.current?.pause();
      },
      getCurrentTime: () => mediaRef.current?.currentTime || 0,
    }));

    const togglePlay = () => {
      if (!mediaRef.current) return;
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
    };

    const handleTimeUpdate = () => {
      if (mediaRef.current) {
        const curr = mediaRef.current.currentTime;
        setCurrentTime(curr);
        if (onTimeUpdate) onTimeUpdate(curr);
      }
    };

    const handleLoadedMetadata = () => {
      if (mediaRef.current) {
        setDuration(mediaRef.current.duration || 0);
      }
    };

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetTime = parseFloat(e.target.value);
      if (mediaRef.current) {
        mediaRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        if (onTimeUpdate) onTimeUpdate(targetTime);
      }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
      if (mediaRef.current) {
        mediaRef.current.volume = val;
        mediaRef.current.muted = val === 0;
        setIsMuted(val === 0);
      }
    };

    const toggleMute = () => {
      if (!mediaRef.current) return;
      const nextMuted = !isMuted;
      mediaRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    };

    const handleRateChange = (rate: number) => {
      setPlaybackRate(rate);
      setIsSpeedMenuOpen(false);
      if (mediaRef.current) {
        mediaRef.current.playbackRate = rate;
      }
    };

    const skipSeconds = (secs: number) => {
      if (mediaRef.current) {
        mediaRef.current.currentTime = Math.max(0, Math.min(mediaRef.current.currentTime + secs, duration));
      }
    };

    const toggleFullscreen = () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          togglePlay();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          skipSeconds(-5);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          skipSeconds(5);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, duration]);

    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

    return (
      <div
        ref={containerRef}
        className="flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative"
      >
        {/* Media Player Frame */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none">
          {mediaType === 'video' ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={src}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              playsInline
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-8">
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={src}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                <Music className={`w-8 h-8 ${isPlaying ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`} />
              </div>
              <p className="text-xs font-semibold text-slate-200 truncate max-w-xs">{title || 'Audio Stream'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Audio Playback</p>
            </div>
          )}

          {/* Clean Center Play Indicator */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-slate-900/80 backdrop-blur border border-white/10 text-white flex items-center justify-center hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
              title="Play (Space)"
            >
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            </button>
          )}
        </div>

        {/* Streamlined Controls Bar */}
        <div className="px-3.5 py-2.5 bg-slate-900/90 border-t border-slate-800/80 flex flex-col gap-2">
          {/* Progress Scrubber */}
          <div className="relative flex items-center group/scrubber">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleScrub}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 group-hover/scrubber:h-1.5 transition-all"
            />

            {/* Bookmark tick markers */}
            {duration > 0 &&
              bookmarks.map((bm) => {
                const leftPercent = Math.min(100, Math.max(0, (bm.timestamp / duration) * 100));
                return (
                  <div
                    key={bm.id}
                    title={`${formatTime(bm.timestamp)}: ${bm.label}`}
                    style={{ left: `${leftPercent}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-2 bg-amber-400 rounded-full pointer-events-none shadow-sm"
                  />
                );
              })}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between text-xs text-slate-300">
            {/* Left Actions: Play, Skip, Volume, Timecode */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                onClick={() => skipSeconds(-5)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Rewind 5s (Left Arrow)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => skipSeconds(5)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Forward 5s (Right Arrow)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-1.5 ml-1 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Mute / Unmute"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-12 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Timecode */}
              <div className="mono text-[11px] text-slate-400 ml-1 select-none">
                <span className="text-slate-200 font-medium">{formatTime(currentTime)}</span>
                <span className="mx-1 text-slate-600">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Actions: Bookmark, Speed Dropdown, Fullscreen */}
            <div className="flex items-center gap-2">
              {onAddBookmarkAtCurrentTime && (
                <button
                  onClick={() => onAddBookmarkAtCurrentTime(currentTime)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors"
                  title="Bookmark current timestamp"
                >
                  <BookmarkIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Bookmark</span>
                </button>
              )}

              {/* Compact Speed Dropdown (1x ▾) */}
              <div className="relative">
                <button
                  onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-800 transition-colors"
                  title="Playback speed"
                >
                  <span className="mono">{playbackRate}x</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isSpeedMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSpeedMenuOpen(false)}
                    />
                    <div className="absolute right-0 bottom-full mb-1.5 w-24 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 overflow-hidden">
                      {speedOptions.map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleRateChange(rate)}
                          className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            playbackRate === rate ? 'text-blue-400 font-semibold bg-blue-500/10' : 'text-slate-300'
                          }`}
                        >
                          <span className="mono">{rate}x</span>
                          {playbackRate === rate && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Fullscreen */}
              {mediaType === 'video' && (
                <button
                  onClick={toggleFullscreen}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Toggle Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
