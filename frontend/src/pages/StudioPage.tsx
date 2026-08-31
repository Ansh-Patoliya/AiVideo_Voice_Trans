import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Pin,
  Star,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  Sparkles,
  Bookmark as BookmarkIcon,
  StickyNote,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MediaItem, Transcript, Bookmark, Note } from '../types';
import { VideoPlayer, VideoPlayerRef } from '../components/player/VideoPlayer';
import { TranscriptViewer } from '../components/transcript/TranscriptViewer';
import { AIInsightsPanel } from '../components/ai/AIInsightsPanel';
import { BookmarksPanel } from '../components/bookmarks/BookmarksPanel';
import { NotesPanel } from '../components/notes/NotesPanel';
import { StatusBadge } from '../components/layout/StatusBadge';
import { formatTime, formatDate, getSourceLabel } from '../utils/formatters';
import { api } from '../services/api';

interface StudioPageProps {
  mediaId: number;
  onBack: () => void;
  onMediaDeleted: () => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({
  mediaId,
  onBack,
  onMediaDeleted,
}) => {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<'ai' | 'bookmarks' | 'notes'>('ai');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<VideoPlayerRef>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Fetch all media data
  const loadStudioData = useCallback(async () => {
    try {
      setError(null);
      const mediaData = await api.media.get(mediaId);
      setMedia(mediaData);

      if (mediaData.status === 'COMPLETED') {
        try {
          const transData = await api.transcripts.get(mediaId);
          setTranscript(transData);
        } catch {
          // Transcript compiling
        }
      }

      const bmData = await api.bookmarks.list(mediaId);
      setBookmarks(bmData);

      const notesData = await api.notes.list(mediaId);
      setNotes(notesData);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load media.');
    } finally {
      setIsLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    loadStudioData();
  }, [loadStudioData]);

  // Polling if still processing
  useEffect(() => {
    if (!media || media.status === 'COMPLETED' || media.status === 'FAILED') return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await api.media.getStatus(mediaId);
        setMedia((prev) => (prev ? { ...prev, status: statusRes.status, error_message: statusRes.error_message } : null));

        if (statusRes.status === 'COMPLETED') {
          loadStudioData();
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [media, mediaId, loadStudioData]);

  const handleSeek = (timestamp: number) => {
    playerRef.current?.seekTo(timestamp);
  };

  const handleAddBookmarkAtCurrentTime = (time: number) => {
    setActiveSecondaryTab('bookmarks');
    api.bookmarks.create(mediaId, { timestamp: time, label: `Bookmark at ${formatTime(time)}` }).then(() => {
      loadStudioData();
    });
  };

  const handleAddBookmarkFromSegment = (time: number, defaultLabel: string) => {
    setActiveSecondaryTab('bookmarks');
    api.bookmarks.create(mediaId, { timestamp: time, label: defaultLabel || `Bookmark at ${formatTime(time)}` }).then(() => {
      loadStudioData();
    });
  };

  const handleTogglePin = async () => {
    if (!media) return;
    if (media.is_pinned) {
      await api.pins.remove(media.id);
      setMedia({ ...media, is_pinned: false });
    } else {
      await api.pins.add(media.id);
      setMedia({ ...media, is_pinned: true });
    }
  };

  const handleToggleFavourite = async () => {
    if (!media) return;
    if (media.is_favourite) {
      await api.favourites.remove(media.id);
      setMedia({ ...media, is_favourite: false });
    } else {
      await api.favourites.add(media.id);
      setMedia({ ...media, is_favourite: true });
    }
  };

  const handleReprocess = async () => {
    if (!media) return;
    setIsMoreMenuOpen(false);
    try {
      await api.media.reprocess(media.id);
      loadStudioData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!media) return;
    setIsMoreMenuOpen(false);
    if (window.confirm('Delete this media asset and transcript? This action cannot be undone.')) {
      try {
        await api.media.delete(media.id);
        onMediaDeleted();
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-xs">Loading studio...</p>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="p-8 max-w-lg mx-auto rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-sm font-semibold text-white">Unable to load media</h3>
        <p className="text-xs text-slate-400">{error || 'Media not found.'}</p>
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition-colors"
        >
          Back to Library
        </button>
      </div>
    );
  }

  const mediaSourceUrl = media.cloudinary_url || (media.local_media_path ? `/api/media/stream/${media.local_media_path.split('\\').pop()?.split('/').pop()}` : '');

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] space-y-3 pb-2 max-w-[1600px] mx-auto">
      {/* Streamlined Studio Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl shrink-0">
        {/* Left: Back & Title & Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
            title="Back to library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-100 truncate max-w-md sm:max-w-xl">
                {media.title}
              </h2>
              <StatusBadge status={media.status} size="sm" />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-medium text-slate-400">{getSourceLabel(media.source_type)}</span>
              <span>&bull;</span>
              <span className="mono">{formatTime(media.duration)}</span>
              <span>&bull;</span>
              <span>{media.language?.toUpperCase() || 'EN'}</span>
              <span>&bull;</span>
              <span>{formatDate(media.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Right: Secondary Actions (Pin, Favourite, More Menu) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Pin */}
          <button
            onClick={handleTogglePin}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              media.is_pinned
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200'
            }`}
            title={media.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {/* Favourite */}
          <button
            onClick={handleToggleFavourite}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              media.is_favourite
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200'
            }`}
            title={media.is_favourite ? 'Remove Favourite' : 'Favourite'}
          >
            <Star className={`w-3.5 h-3.5 ${media.is_favourite ? 'fill-current' : ''}`} />
          </button>

          {/* Theater Mode Toggle */}
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isTheaterMode
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
            title={isTheaterMode ? 'Exit Theater Mode' : 'Expand Video Player (Theater Mode)'}
          >
            {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isTheaterMode ? 'Standard View' : 'Theater Mode'}</span>
          </button>

          {/* More Actions Menu (...) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 overflow-hidden">
                <button
                  onClick={handleReprocess}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reprocess Audio</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={handleDelete}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Media</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Split Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Video Player & Secondary Tab Panels (7 cols default, 8 cols in theater mode) */}
        <div className={`${isTheaterMode ? 'lg:col-span-8' : 'lg:col-span-7'} flex flex-col gap-3 h-full overflow-y-auto pr-0.5 transition-all duration-300`}>
          {/* Video Player */}
          {mediaSourceUrl ? (
            <VideoPlayer
              ref={playerRef}
              src={mediaSourceUrl}
              mediaType={media.media_type}
              title={media.title}
              bookmarks={bookmarks}
              onTimeUpdate={(t) => setCurrentTime(t)}
              onAddBookmarkAtCurrentTime={handleAddBookmarkAtCurrentTime}
            />
          ) : (
            <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center">
              <AlertCircle className="w-6 h-6 text-slate-600 mb-2" />
              <p>Media stream is currently being prepared.</p>
            </div>
          )}

          {/* Secondary Tabbed Workspace (AI Insights / Bookmarks / Notes) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-3 shrink-0">
            {/* Clean Tab Switcher & Collapse Toggle */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setActiveSecondaryTab('ai');
                    setIsBottomPanelCollapsed(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeSecondaryTab === 'ai' && !isBottomPanelCollapsed
                      ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>AI Insights</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSecondaryTab('bookmarks');
                    setIsBottomPanelCollapsed(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeSecondaryTab === 'bookmarks' && !isBottomPanelCollapsed
                      ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookmarkIcon className="w-3 h-3 text-amber-400" />
                  <span>Bookmarks ({bookmarks.length})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSecondaryTab('notes');
                    setIsBottomPanelCollapsed(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeSecondaryTab === 'notes' && !isBottomPanelCollapsed
                      ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <StickyNote className="w-3 h-3 text-blue-400" />
                  <span>Notes ({notes.length})</span>
                </button>
              </div>

              {/* Collapse/Expand button for bottom panel */}
              <button
                onClick={() => setIsBottomPanelCollapsed(!isBottomPanelCollapsed)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                title={isBottomPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
              >
                <span>{isBottomPanelCollapsed ? 'Show Details' : 'Minimize'}</span>
                {isBottomPanelCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Tab Body (Collapsible) */}
            {!isBottomPanelCollapsed && (
              <div className="pt-1">
                {activeSecondaryTab === 'ai' && transcript && (
                  <AIInsightsPanel
                    mediaId={media.id}
                    transcript={transcript}
                    onSeek={handleSeek}
                    onRefreshTranscript={loadStudioData}
                  />
                )}

                {activeSecondaryTab === 'bookmarks' && (
                  <BookmarksPanel
                    mediaId={media.id}
                    bookmarks={bookmarks}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    onRefreshBookmarks={loadStudioData}
                  />
                )}

                {activeSecondaryTab === 'notes' && (
                  <NotesPanel
                    mediaId={media.id}
                    notes={notes}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    onRefreshNotes={loadStudioData}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Synchronized Interactive Transcript (5 cols default, 4 cols in theater) */}
        <div className={`${isTheaterMode ? 'lg:col-span-4' : 'lg:col-span-5'} h-full flex flex-col min-h-0 transition-all duration-300`}>
          {transcript ? (
            <TranscriptViewer
              transcript={transcript}
              mediaTitle={media.title}
              currentTime={currentTime}
              onSeek={handleSeek}
              onAddBookmark={handleAddBookmarkFromSegment}
              onTranscriptUpdated={loadStudioData}
            />
          ) : (
            <div className="h-full bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              {media.status === 'COMPLETED' ? (
                <>
                  <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
                  <h4 className="text-xs font-semibold text-slate-300">Transcript Ready</h4>
                  <p className="text-[11px] text-slate-500">Loading dialogue segments...</p>
                </>
              ) : media.status === 'FAILED' ? (
                <>
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                  <h4 className="text-xs font-semibold text-white">Transcription Failed</h4>
                  <p className="text-[11px] text-rose-300 max-w-sm">{media.error_message}</p>
                </>
              ) : (
                <>
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <h4 className="text-xs font-semibold text-white">Processing Speech Audio</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    {media.status === 'EXTRACTING_AUDIO' && 'Extracting audio stream...'}
                    {media.status === 'TRANSCRIBING' && 'AI speech-to-text generating timestamps...'}
                    {media.status === 'SAVING' && 'Saving transcript segments...'}
                    {media.status === 'QUEUED' && 'In queue...'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
