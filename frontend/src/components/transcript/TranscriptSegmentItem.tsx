import React, { useState } from 'react';
import { Play, Edit2, Check, X, Copy, BookmarkPlus, User } from 'lucide-react';
import { TranscriptSegment } from '../../types';
import { formatTime } from '../../utils/formatters';

interface TranscriptSegmentItemProps {
  segment: TranscriptSegment;
  isActive: boolean;
  searchQuery?: string;
  isCurrentSearchResult?: boolean;
  onSeek: (timestamp: number) => void;
  onSaveEdit: (segmentId: number, newText: string, newSpeaker?: string | null) => Promise<void>;
  onBookmark: (timestamp: number, defaultLabel: string) => void;
}

export const TranscriptSegmentItem: React.FC<TranscriptSegmentItemProps> = ({
  segment,
  isActive,
  searchQuery = '',
  isCurrentSearchResult = false,
  onSeek,
  onSaveEdit,
  onBookmark,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(segment.text);
  const [editSpeaker, setEditSpeaker] = useState(segment.speaker || '');
  const [isSaving, setIsSaving] = useState(false);
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

  return (
    <div
      id={`segment-${segment.id}`}
      className={`group relative px-3.5 py-2.5 rounded-lg border-l-2 transition-all duration-150 ${
        isActive
          ? 'border-blue-500 bg-blue-500/[0.06]'
          : isCurrentSearchResult
          ? 'border-amber-400 bg-amber-400/[0.06]'
          : 'border-transparent hover:bg-slate-900/60'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Left: Timestamp Seek Trigger */}
        <button
          onClick={() => onSeek(segment.start_time)}
          className={`shrink-0 mono text-[11px] font-medium transition-colors pt-0.5 select-none ${
            isActive
              ? 'text-blue-400 font-semibold'
              : 'text-slate-500 hover:text-slate-200'
          }`}
          title="Click to seek video"
        >
          {formatTime(segment.start_time)}
        </button>

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
            <button
              onClick={() => setIsEditing(true)}
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
    </div>
  );
};
