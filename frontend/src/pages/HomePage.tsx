import React from 'react';
import {
  UploadCloud,
  Link,
  Sparkles,
  Clock,
  Pin,
  Star,
  FileText,
  Play,
  ArrowRight,
  Video,
  Music,
  CheckCircle2,
} from 'lucide-react';
import { MediaItem } from '../types';
import { StatusBadge } from '../components/layout/StatusBadge';
import { formatTime, formatDate, getSourceLabel } from '../utils/formatters';

interface HomePageProps {
  recentMedia: MediaItem[];
  pinnedMedia: MediaItem[];
  favouriteMedia: MediaItem[];
  onOpenStudio: (mediaId: number) => void;
  onNavigateTab: (tabId: string) => void;
  onTogglePin: (mediaId: number, isPinned: boolean) => void;
  onToggleFavourite: (mediaId: number, isFav: boolean) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  recentMedia,
  pinnedMedia,
  favouriteMedia,
  onOpenStudio,
  onNavigateTab,
  onTogglePin,
  onToggleFavourite,
}) => {
  const totalDurationSeconds = recentMedia.reduce((acc, m) => acc + (m.duration || 0), 0);
  const completedCount = recentMedia.filter((m) => m.status === 'COMPLETED').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Welcome / Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-indigo-950/60 border border-blue-500/20 p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verbatim Speech-to-Text & Video Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Transcribe, edit, and analyze video & audio content in seconds.
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Upload files or paste URLs from YouTube, Shorts, Instagram Reels, Facebook, and direct streams.
            Synchronized playback, inline editing, and AI intelligence built-in.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onNavigateTab('upload')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Video / Audio</span>
            </button>
            <button
              onClick={() => onNavigateTab('upload')}
              className="inline-flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all hover:scale-[1.02]"
            >
              <Link className="w-4 h-4 text-blue-400" />
              <span>Paste Media URL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Media</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-white mono">{recentMedia.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Completed Transcripts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-white mono">{completedCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Hours Processed</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-white mono">
            {(totalDurationSeconds / 3600).toFixed(1)}h
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pinned & Starred</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white mono">
            {pinnedMedia.length + favouriteMedia.length}
          </p>
        </div>
      </div>

      {/* Recent Transcripts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Transcriptions</h3>
            <p className="text-xs text-slate-400">Jump directly into video playback and synchronized transcripts</p>
          </div>
          <button
            onClick={() => onNavigateTab('transcripts')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
          >
            <span>View all ({recentMedia.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentMedia && recentMedia.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentMedia.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900 transition-all shadow-md hover:shadow-xl"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                      {getSourceLabel(item.source_type)}
                    </span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>

                  {/* Title & Type */}
                  <div className="space-y-1">
                    <h4
                      onClick={() => onOpenStudio(item.id)}
                      className="text-sm font-bold text-white group-hover:text-blue-400 cursor-pointer transition-colors line-clamp-2"
                    >
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        {item.media_type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                        <span className="mono">{formatTime(item.duration)}</span>
                      </span>
                      <span>&bull;</span>
                      <span>{item.language?.toUpperCase() || 'EN'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-slate-500">{formatDate(item.created_at)}</span>

                  <div className="flex items-center gap-2">
                    {/* Pin Toggle */}
                    <button
                      onClick={() => onTogglePin(item.id, Boolean(item.is_pinned))}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        item.is_pinned
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-slate-800/60 text-slate-500 border-transparent hover:text-slate-200'
                      }`}
                      title={item.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Favourite Toggle */}
                    <button
                      onClick={() => onToggleFavourite(item.id, Boolean(item.is_favourite))}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        item.is_favourite
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800/60 text-slate-500 border-transparent hover:text-slate-200'
                      }`}
                      title={item.is_favourite ? 'Remove Favourite' : 'Favourite'}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {/* Open Studio Button */}
                    <button
                      onClick={() => onOpenStudio(item.id)}
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
                      title="Open in Transcript Studio"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">No transcripts yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload a video or audio recording or paste a URL to start your first transcription pipeline.
            </p>
            <button
              onClick={() => onNavigateTab('upload')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Get Started</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
