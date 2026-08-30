import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { Transcript, TranscriptSegment } from '../../types';
import { TranscriptSegmentItem } from './TranscriptSegmentItem';
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
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener to focus transcript search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Determine active segment index
  const activeSegmentIndex = useMemo(() => {
    if (!transcript.segments || transcript.segments.length === 0) return -1;
    return transcript.segments.findIndex(
      (s) => currentTime >= s.start_time && currentTime <= (s.end_time || s.start_time + 2.0)
    );
  }, [transcript.segments, currentTime]);

  // Smooth auto-scroll active segment into view
  useEffect(() => {
    if (!autoScroll || activeSegmentIndex === -1) return;
    const activeElem = document.getElementById(`segment-${transcript.segments[activeSegmentIndex]?.id}`);
    if (activeElem && containerRef.current) {
      activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSegmentIndex, autoScroll, transcript.segments]);

  // In-transcript Search matching segments
  const matchedSegmentIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const indices: number[] = [];
    transcript.segments.forEach((seg, idx) => {
      if (seg.text.toLowerCase().includes(q)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [transcript.segments, searchQuery]);

  // Navigate next / prev search result
  const handleNextMatch = () => {
    if (matchedSegmentIndices.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchedSegmentIndices.length;
    setCurrentMatchIndex(nextIdx);
    const segIdx = matchedSegmentIndices[nextIdx];
    const targetSeg = transcript.segments[segIdx];
    if (targetSeg) {
      onSeek(targetSeg.start_time);
      document.getElementById(`segment-${targetSeg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handlePrevMatch = () => {
    if (matchedSegmentIndices.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchedSegmentIndices.length) % matchedSegmentIndices.length;
    setCurrentMatchIndex(prevIdx);
    const segIdx = matchedSegmentIndices[prevIdx];
    const targetSeg = transcript.segments[segIdx];
    if (targetSeg) {
      onSeek(targetSeg.start_time);
      document.getElementById(`segment-${targetSeg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handle inline segment edit
  const handleSaveSegmentEdit = async (
    segmentId: number,
    newText: string,
    newSpeaker?: string | null
  ) => {
    await api.transcripts.updateSegment(segmentId, { text: newText, speaker: newSpeaker });
    onTranscriptUpdated();
  };

  const handleCopyFullTranscript = () => {
    const text = transcript.segments
      .map((s) => s.text)
      .join(' ');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Streamlined Top Search & Action Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentMatchIndex(0);
            }}
            placeholder="Search transcript..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-20 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />

          {/* Search Result Navigator or ⌘K Hint */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-400 select-none">
            {searchQuery ? (
              matchedSegmentIndices.length > 0 ? (
                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  <span className="mono text-[10px] font-semibold text-amber-400">
                    {currentMatchIndex + 1}/{matchedSegmentIndices.length}
                  </span>
                  <button
                    onClick={handlePrevMatch}
                    className="hover:text-white p-0.5"
                    title="Previous match"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    className="hover:text-white p-0.5"
                    title="Next match"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
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
          {/* Auto-scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoScroll
                ? 'bg-slate-800/80 text-slate-200 border-slate-700/80'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
            }`}
            title="Auto-scroll transcript as video plays"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-blue-400 shadow-sm shadow-blue-400/50' : 'bg-slate-600'}`}
            />
            <span className="text-[11px]">Auto-scroll</span>
          </button>

          {/* Quick Copy All */}
          <button
            onClick={handleCopyFullTranscript}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-colors"
            title="Copy entire transcript text"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Export Dropdown (TXT, CSV, SRT, PDF, DOCX) */}
          <ExportDropdown
            mediaId={transcript.media_id}
            mediaTitle={mediaTitle}
            transcript={transcript}
          />
        </div>
      </div>

      {/* Segments Clean List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {transcript.segments && transcript.segments.length > 0 ? (
          transcript.segments.map((seg, idx) => {
            const isActive = idx === activeSegmentIndex;
            const isMatch = matchedSegmentIndices.includes(idx);
            const isCurrentMatch =
              matchedSegmentIndices.length > 0 && matchedSegmentIndices[currentMatchIndex] === idx;

            return (
              <TranscriptSegmentItem
                key={seg.id}
                segment={seg}
                isActive={isActive}
                searchQuery={searchQuery}
                isCurrentSearchResult={isCurrentMatch}
                onSeek={onSeek}
                onSaveEdit={handleSaveSegmentEdit}
                onBookmark={onAddBookmark}
              />
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-8 text-center">
            <Sparkles className="w-6 h-6 mb-2 text-slate-600 animate-pulse" />
            <p>No dialogue segments available.</p>
          </div>
        )}
      </div>
    </div>
  );
};
