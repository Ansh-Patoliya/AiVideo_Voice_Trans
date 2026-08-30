import React, { useState, useMemo } from 'react';
import {
  Link as LinkIcon,
  Youtube,
  Instagram,
  Facebook,
  Globe,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { SourceType } from '../../types';

interface UrlInputBoxProps {
  onSubmitUrl: (url: string, title?: string) => Promise<void>;
  isProcessing: boolean;
}

export const UrlInputBox: React.FC<UrlInputBoxProps> = ({ onSubmitUrl, isProcessing }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Real-time platform detection
  const detectedPlatform = useMemo(() => {
    if (!url.trim()) return null;
    const clean = url.trim().toLowerCase();

    if (clean.includes('youtube.com/shorts/') || clean.includes('youtu.be/shorts/')) {
      return {
        type: 'youtube_shorts' as SourceType,
        label: 'YouTube Shorts',
        icon: Youtube,
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
        supported: true,
      };
    }
    if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
      return {
        type: 'youtube' as SourceType,
        label: 'YouTube Video',
        icon: Youtube,
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
        supported: true,
      };
    }
    if (clean.includes('instagram.com/reel') || clean.includes('instagram.com/p/')) {
      return {
        type: 'instagram' as SourceType,
        label: 'Instagram Reel',
        icon: Instagram,
        color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
        supported: true,
      };
    }
    if (clean.includes('facebook.com/ads/library') || clean.includes('fb.com/ads/library')) {
      return {
        type: 'facebook_ad_library' as SourceType,
        label: 'Facebook Ad Library',
        icon: Facebook,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        supported: false,
        warning:
          "Direct processing isn't available for this URL. Please download the video and upload the file instead.",
      };
    }
    if (clean.includes('facebook.com') || clean.includes('fb.watch')) {
      return {
        type: 'facebook' as SourceType,
        label: 'Facebook Video / Reel',
        icon: Facebook,
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        supported: true,
      };
    }
    if (['.mp4', '.mp3', '.wav', '.m4a', '.webm', '.mov'].some((ext) => clean.includes(ext))) {
      return {
        type: 'direct_url' as SourceType,
        label: 'Direct Media Link',
        icon: Globe,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        supported: true,
      };
    }

    return {
      type: 'direct_url' as SourceType,
      label: 'Web Video Stream',
      icon: Globe,
      color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
      supported: true,
    };
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please paste a video or audio URL.');
      return;
    }

    if (detectedPlatform && !detectedPlatform.supported) {
      setError(
        detectedPlatform.warning ||
          "Direct processing isn't available for this URL. Please download the video and upload the file instead."
      );
      return;
    }

    try {
      await onSubmitUrl(url.trim(), title.trim() || undefined);
      setUrl('');
      setTitle('');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Direct processing isn't available for this URL. Please download the video and upload the file instead."
      );
    }
  };

  const PlatformIcon = detectedPlatform?.icon || LinkIcon;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main URL Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Paste Media URL</label>
            {detectedPlatform && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${detectedPlatform.color}`}
              >
                <PlatformIcon className="w-3.5 h-3.5" />
                <span>{detectedPlatform.label}</span>
              </span>
            )}
          </div>

          <div className="relative">
            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube, Shorts, Instagram Reel, Facebook, or direct video URL..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Warning Alert for restricted platform */}
        {detectedPlatform && !detectedPlatform.supported && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{detectedPlatform.warning}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Optional Title */}
        {url.trim() && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Custom Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional title"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || !url.trim()}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fetching & Queuing Media...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Transcribe from URL</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
