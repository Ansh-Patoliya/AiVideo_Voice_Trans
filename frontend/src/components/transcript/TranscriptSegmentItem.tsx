import React, { useState } from 'react';
import {
  Play,
  Edit2,
  Check,
  Copy,
  BookmarkPlus,
  User,
  RotateCcw,
  Mic,
  Sparkles,
  ArrowDown,
} from 'lucide-react';
import { TranscriptSegment } from '../../types';

interface TranscriptSegmentItemProps {
  segment: TranscriptSegment;
  isActive: boolean;
  searchQuery?: string;
  isCurrentSearchResult?: boolean;
  showDiffMode?: boolean;
  onSeek: (timestamp: number) => void;
  onSaveEdit: (segmentId: number, newText: string, newSpeaker?: string | null) => Promise<void>;
  onRevert?: (segmentId: number) => Promise<void>;
  onBookmark: (timestamp: number, defaultLabel: string) => void;
}

export const TranscriptSegmentItem: React.FC<TranscriptSegmentItemProps> = ({
  segment,
  isActive,
  searchQuery = '',
  isCurrentSearchResult = false,
  showDiffMode = false,
  onSeek,
  onSaveEdit,
  onRevert,
  onBookmark,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(segment.text);
  const [editSpeaker, setEditSpeaker] = useState(segment.speaker || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!editText.trim()) return;
    setIsSaving(true);
    try {
      await onSaveEdit(segment.id, editText.trim(), editSpeaker.trim() || null);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditText(segment.text);
    setEditSpeaker(segment.speaker || '');
    setIsEditing(false);
  };

  const handleRevert = async () => {
    if (!onRevert) return;
    setIsReverting(true);
    try {
      await onRevert(segment.id);
      setEditText(segment.original_text || segment.text);
    } finally {
      setIsReverting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(segment.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Highlight search term in text
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className={`rounded px-0.5 ${
                isCurrentSearchResult ? 'bg-amber-400 text-slate-950 font-semibold' : 'bg-amber-400/25 text-amber-200'
              }`}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // If in Diff Comparison Mode and this segment was edited
  const isDiffComparisonActive = showDiffMode && segment.is_edited && segment.original_text;

  return (
    <div
      id={`segment-${segment.id}`}
      className={`group relative rounded-xl transition-all duration-200 ${
        isDiffComparisonActive
          ? 'p-3 bg-slate-900/40 border border-slate-800/90 shadow-lg shadow-black/20 my-2'
          : `px-3.5 py-2.5 border-l-2 ${
              isActive
                ? 'border-blue-500 bg-blue-500/[0.07]'
                : isCurrentSearchResult
                ? 'border-amber-400 bg-amber-400/[0.07]'
                : 'border-transparent hover:bg-slate-900/60'
            }`
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. DIFF COMPARISON CARD MODE (When Changes toggle is ON for this edited line) */}
      {/* ========================================================================= */}
      {isDiffComparisonActive ? (
        <div className="space-y-2.5">
          {/* Top Bar: Timestamp pill, status, and action buttons */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSeek(segment.start_time)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-blue-600/20 text-blue-400 border border-slate-700/60 hover:border-blue-500/40 font-mono text-xs font-medium transition-all select-none"
                title="Click to jump to this video moment"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>

              {segment.speaker && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/40">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>{segment.speaker}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Modified Script</span>
              </span>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-1.5">
              {onRevert && (
                <button
                  type="button"
                  onClick={handleRevert}
                  disabled={isReverting}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-amber-300 bg-slate-800/90 hover:bg-amber-500/15 border border-slate-700/80 hover:border-amber-500/30 transition-all disabled:opacity-50 shadow-sm"
                  title="Undo changes and revert back to original spoken text"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isReverting ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                  <span>Revert to original</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditText(segment.text);
                  setEditSpeaker(segment.speaker || '');
                  setIsEditing(true);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                title="Edit script"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                title="Copy current text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => onBookmark(segment.start_time, segment.text.slice(0, 40))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 border border-slate-800 transition-colors"
                title="Bookmark timestamp"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inline Edit Form if triggered */}
          {isEditing ? (
            <div className="space-y-2 mt-2 p-3 rounded-xl bg-slate-950 border border-blue-500/40">
              <input
                type="text"
                placeholder="Speaker name (optional)"
                value={editSpeaker}
                onChange={(e) => setEditSpeaker(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs sm:text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3.5 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Box 1: Original Spoken Audio Text */}
              <div className="rounded-xl p-3 bg-slate-950/80 border border-slate-800/90 text-xs sm:text-[13.5px]">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                  <Mic className="w-3.5 h-3.5 text-slate-500" />
                  <span>Original Spoken Text</span>
                  <span className="text-[9.5px] font-medium font-mono text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                    Spoken
                  </span>
                </div>
                <p className="text-slate-300/90 select-text leading-relaxed pl-5 font-normal">
                  {segment.original_text}
                </p>
              </div>

              {/* Transition Indicator */}
              <div className="flex items-center justify-center my-0.5">
                <div className="h-px bg-slate-800/80 flex-1" />
                <div className="px-2.5 py-0.5 rounded-full bg-slate-800/70 border border-slate-700/60 flex items-center gap-1 text-[10px] font-semibold text-slate-400 select-none">
                  <ArrowDown className="w-3 h-3 text-blue-400" />
                  <span>Modified</span>
                </div>
                <div className="h-px bg-slate-800/80 flex-1" />
              </div>

              {/* Box 2: New Edited / Rephrased Text */}
              <div className="rounded-xl p-3 bg-blue-950/20 border border-blue-500/35 shadow-sm shadow-blue-500/5 text-xs sm:text-[13.5px]">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-blue-400 tracking-wider uppercase mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edited Script</span>
                  <span className="text-[9.5px] font-medium text-blue-300 bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-500/30">
                    Active
                  </span>
                </div>
                <p className="text-slate-100 select-text leading-relaxed pl-5 font-normal">
                  {renderHighlightedText(segment.text, searchQuery)}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. REGULAR TRANSCRIPT LINE VIEW (Clean & Minimalistic)                    */
        /* ========================================================================= */
        <div className="flex items-start gap-3">
          {/* Left: Timestamp Seek Trigger & Optional Mini Edited Badge */}
          <div className="flex flex-col items-start gap-1 shrink-0 pt-0.5">
            <button
              onClick={() => onSeek(segment.start_time)}
              className={`transition-colors select-none ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
              title="Click to seek video"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>

            {segment.is_edited && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 select-none"
                title="This segment was edited"
              >
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                Edited
              </span>
            )}
          </div>

          {/* Center: Dialogue & Speaker */}
          <div className="flex-1 min-w-0">
            {segment.speaker && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-0.5">
                <User className="w-3 h-3 text-slate-500" />
                <span>{segment.speaker}</span>
              </div>
            )}

            {isEditing ? (
              <div className="space-y-2 mt-1">
                <input
                  type="text"
                  placeholder="Speaker name (optional)"
                  value={editSpeaker}
                  onChange={(e) => setEditSpeaker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs sm:text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => onSeek(segment.start_time)}
                className={`text-xs sm:text-[13.5px] leading-relaxed cursor-pointer select-text transition-colors ${
                  isActive ? 'text-slate-100 font-normal' : 'text-slate-300/90'
                }`}
              >
                {renderHighlightedText(segment.text, searchQuery)}
              </p>
            )}
          </div>

          {/* Right: Minimal Hover Action Icons */}
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
              {segment.is_edited && onRevert && (
                <button
                  onClick={handleRevert}
                  disabled={isReverting}
                  className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                  title="Revert to original text"
                >
                  <RotateCcw className={`w-3 h-3 ${isReverting ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              )}
              <button
                onClick={() => {
                  setEditText(segment.text);
                  setEditSpeaker(segment.speaker || '');
                  setIsEditing(true);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Edit segment"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Copy text"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                onClick={() => onBookmark(segment.start_time, segment.text.slice(0, 40))}
                className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                title="Bookmark moment"
              >
                <BookmarkPlus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
