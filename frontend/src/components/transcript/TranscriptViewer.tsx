import React, { useState, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Copy,
  Check,
  Sparkles,
  Edit2,
  RotateCcw,
  Mic,
  ArrowDown,
} from 'lucide-react';
import { Transcript } from '../../types';
import { ExportDropdown } from './ExportDropdown';
import { api } from '../../services/api';

interface TranscriptViewerProps {
  transcript: Transcript;
  mediaTitle: string;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onAddBookmark: (timestamp: number, defaultLabel: string) => void;
  onTranscriptUpdated: () => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  mediaTitle,
  currentTime,
  onSeek,
  onAddBookmark,
  onTranscriptUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [showDiffMode, setShowDiffMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const segment = transcript.segments?.[0];
  const displayText = transcript.full_text || segment?.text || '';
  const isEdited = segment?.is_edited || false;
  const originalText = segment?.original_text || '';

  const handleCopyFullTranscript = () => {
    navigator.clipboard.writeText(displayText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const handleStartEdit = () => {
    setEditText(displayText);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditText('');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !segment) return;
    setIsSaving(true);
    try {
      await api.transcripts.updateSegment(segment.id, { text: editText.trim() });
      setIsEditing(false);
      onTranscriptUpdated();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async () => {
    if (!segment) return;
    setIsReverting(true);
    try {
      await api.transcripts.revertSegment(segment.id);
      onTranscriptUpdated();
    } finally {
      setIsReverting(false);
    }
  };

  const highlightSearch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="rounded px-0.5 bg-amber-400 text-slate-950 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (displayText.match(regex) || []).length;
  }, [displayText, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-20 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-400 select-none">
            {searchQuery ? (
              searchMatchCount > 0 ? (
                <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 mono text-[10px] font-semibold text-amber-400">
                  {searchMatchCount} found
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">0 results</span>
              )
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded">
                ⌘K
              </kbd>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="hover:text-white p-0.5 text-slate-500"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Changes Toggle */}
          {isEdited && (
            <button
              type="button"
              onClick={() => setShowDiffMode(!showDiffMode)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                showDiffMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Original vs Edited comparison view"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${showDiffMode ? 'bg-amber-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-medium">Changes</span>
            </button>
          )}

          {/* Edit */}
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-colors"
              title="Edit transcript"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Revert */}
          {isEdited && !isEditing && (
            <button
              onClick={handleRevert}
              disabled={isReverting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-colors disabled:opacity-50"
              title="Revert to original"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isReverting ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}

          {/* Copy */}
          <button
            onClick={handleCopyFullTranscript}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-colors"
            title="Copy entire transcript"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Export */}
          <ExportDropdown
            mediaId={transcript.media_id}
            mediaTitle={mediaTitle}
            transcript={transcript}
          />
        </div>
      </div>

      {/* Transcript Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {displayText ? (
          isEditing ? (
            /* Edit Mode */
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={12}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs sm:text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-y"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : showDiffMode && isEdited && originalText ? (
            /* Diff Mode */
            <div className="space-y-3">
              <div className="rounded-xl p-4 bg-slate-950/80 border border-slate-800/90">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                  <Mic className="w-3.5 h-3.5 text-slate-500" />
                  <span>Original Spoken Text</span>
                  <span className="text-[9.5px] font-medium font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    Spoken
                  </span>
                </div>
                <p className="text-slate-300/90 select-text leading-relaxed text-xs sm:text-[13.5px]">
                  {originalText}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <div className="h-px bg-slate-800/80 flex-1" />
                <div className="px-2.5 py-0.5 rounded-full bg-slate-800/70 border border-slate-700/60 flex items-center gap-1 text-[10px] font-semibold text-slate-400 select-none">
                  <ArrowDown className="w-3 h-3 text-blue-400" />
                  <span>Modified</span>
                </div>
                <div className="h-px bg-slate-800/80 flex-1" />
              </div>

              <div className="rounded-xl p-4 bg-blue-950/20 border border-blue-500/35 shadow-sm shadow-blue-500/5">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-blue-400 tracking-wider uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edited Script</span>
                  <span className="text-[9.5px] font-medium text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                    Active
                  </span>
                </div>
                <p className="text-slate-100 select-text leading-relaxed text-xs sm:text-[13.5px]">
                  {highlightSearch(displayText, searchQuery)}
                </p>
              </div>
            </div>
          ) : (
            /* Normal View */
            <div className="relative group">
              {isEdited && (
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 select-none">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    Edited
                  </span>
                </div>
              )}
              <p className="text-xs sm:text-[13.5px] leading-relaxed text-slate-300/90 select-text">
                {highlightSearch(displayText, searchQuery)}
              </p>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-8 text-center">
            <Sparkles className="w-6 h-6 mb-2 text-slate-600 animate-pulse" />
            <p>No transcript available.</p>
          </div>
        )}
      </div>
    </div>
  );
};
