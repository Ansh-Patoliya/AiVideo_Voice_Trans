import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Pin,
  Star,
  Play,
  Trash2,
  Video,
  Music,
  Plus,
} from 'lucide-react';
import { MediaItem, SourceType } from '../types';
import { StatusBadge } from '../components/layout/StatusBadge';
import { formatTime, formatDate, getSourceLabel } from '../utils/formatters';

interface TranscriptsPageProps {
  mediaItems: MediaItem[];
  onOpenStudio: (mediaId: number) => void;
  onNavigateUpload: () => void;
  onTogglePin: (mediaId: number, isPinned: boolean) => void;
  onToggleFavourite: (mediaId: number, isFav: boolean) => void;
  onDeleteMedia: (mediaId: number) => void;
}

export const TranscriptsPage: React.FC<TranscriptsPageProps> = ({
  mediaItems,
  onOpenStudio,
  onNavigateUpload,
  onTogglePin,
  onToggleFavourite,
  onDeleteMedia,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.language?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSource = selectedSource === 'all' || item.source_type === selectedSource;
      const matchStatus = selectedStatus === 'all' || item.status === selectedStatus;

      return matchSearch && matchSource && matchStatus;
    });
  }, [mediaItems, searchTerm, selectedSource, selectedStatus]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">My Transcripts</h2>
          <p className="text-xs text-slate-400">
            Manage, filter, and inspect your video and audio transcriptions ({mediaItems.length} items)
          </p>
        </div>

        <button
          onClick={onNavigateUpload}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Transcription</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter transcripts by title or language..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Source Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Sources</option>
            <option value="upload">File Upload</option>
            <option value="youtube">YouTube</option>
            <option value="youtube_shorts">YouTube Shorts</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="direct_url">Direct Stream</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="TRANSCRIBING">Transcribing</option>
            <option value="EXTRACTING_AUDIO">Extracting Audio</option>
            <option value="QUEUED">Queued</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Items Table / List */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {filteredItems && filteredItems.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors group"
              >
                {/* Left Info */}
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-colors">
                    {item.media_type === 'video' ? <Video className="w-5 h-5" /> : <Music className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h4
                      onClick={() => onOpenStudio(item.id)}
                      className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 cursor-pointer transition-colors truncate"
                    >
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        {getSourceLabel(item.source_type)}
                      </span>
                      <span>&bull;</span>
                      <span className="mono">{formatTime(item.duration)}</span>
                      <span>&bull;</span>
                      <span>{item.language?.toUpperCase() || 'EN'}</span>
                      <span>&bull;</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  <StatusBadge status={item.status} size="sm" />

                  <div className="flex items-center gap-1.5">
                    {/* Pin */}
                    <button
                      onClick={() => onTogglePin(item.id, Boolean(item.is_pinned))}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        item.is_pinned
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-200'
                      }`}
                      title={item.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Favourite */}
                    <button
                      onClick={() => onToggleFavourite(item.id, Boolean(item.is_favourite))}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        item.is_favourite
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-200'
                      }`}
                      title={item.is_favourite ? 'Remove Favourite' : 'Favourite'}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteMedia(item.id)}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-colors"
                      title="Delete transcription"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Open Studio */}
                    <button
                      onClick={() => onOpenStudio(item.id)}
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors ml-1"
                      title="Open in Studio"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p>No transcripts matching your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
