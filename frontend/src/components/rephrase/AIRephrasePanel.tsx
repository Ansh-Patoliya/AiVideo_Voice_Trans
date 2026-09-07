import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
  Wand2,
  ArrowRight,
  ListChecks,
  SlidersHorizontal,
  FileText,
  X,
  Zap,
} from 'lucide-react';
import { Transcript, TranscriptSegment } from '../../types';
import { formatTime } from '../../utils/formatters';
import { api } from '../../services/api';

interface AIRephrasePanelProps {
  mediaId: number;
  transcript: Transcript;
  onSeek: (seconds: number) => void;
  onRefreshTranscript: () => Promise<void> | void;
}

type ToneType = 'professional' | 'casual' | 'simplified' | 'punchy';

interface ToneOption {
  id: ToneType;
  label: string;
  desc: string;
  icon: string;
}

const TONE_OPTIONS: ToneOption[] = [
  { id: 'professional', label: 'Professional', desc: 'Formal & articulate', icon: '👔' },
  { id: 'casual', label: 'Casual / Reels', desc: 'Punchy & engaging', icon: '⚡' },
  { id: 'simplified', label: 'Simple & Clear', desc: 'Easy & plain words', icon: '💡' },
  { id: 'punchy', label: 'Short & Concise', desc: 'No filler words', icon: '✂️' },
];

interface PreviewItem {
  segment_id: number;
  original_text: string;
  rephrased_text: string;
  included: boolean;
}

interface TokenUsage {
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

export const AIRephrasePanel: React.FC<AIRephrasePanelProps> = ({
  mediaId,
  transcript,
  onSeek,
  onRefreshTranscript,
}) => {
  const [scope, setScope] = useState<'all' | 'particular'>('all');
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<number[]>([]);
  const [tone, setTone] = useState<ToneType>('professional');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[] | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const segments = transcript.segments || [];

  // Toggle single segment selection
  const handleToggleSegment = (id: number) => {
    setSelectedSegmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all segments
  const handleSelectAll = () => {
    setSelectedSegmentIds(segments.map((s) => s.id));
  };

  // Clear segment selection
  const handleClearSelection = () => {
    setSelectedSegmentIds([]);
  };

  // Generate preview from Gemini
  const handleGeneratePreview = async () => {
    setError(null);
    setSuccessMessage(null);

    if (scope === 'particular' && selectedSegmentIds.length === 0) {
      setError('Please select at least one dialogue line to rephrase.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.ai.rephrasePreview(mediaId, {
        scope,
        segment_ids: scope === 'particular' ? selectedSegmentIds : undefined,
        tone,
        custom_instruction: customInstruction.trim() || undefined,
      });

      if (!res.items || res.items.length === 0) {
        setError('No segments were returned by the AI. Please try again.');
        return;
      }

      setPreviewItems(
        res.items.map((item) => ({
          segment_id: item.segment_id,
          original_text: item.original_text,
          rephrased_text: item.rephrased_text,
          included: true,
        }))
      );
      if (res.token_usage) {
        setTokenUsage(res.token_usage);
      } else {
        setTokenUsage(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate rephrase. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit rephrased text in preview before saving
  const handleEditText = (segmentId: number, text: string) => {
    setPreviewItems((prev) =>
      prev
        ? prev.map((item) =>
            item.segment_id === segmentId ? { ...item, rephrased_text: text } : item
          )
        : null
    );
  };

  // Toggle including a specific line in the final apply
  const handleToggleInclude = (segmentId: number) => {
    setPreviewItems((prev) =>
      prev
        ? prev.map((item) =>
            item.segment_id === segmentId ? { ...item, included: !item.included } : item
          )
        : null
    );
  };

  // Apply changes to database
  const handleApplyChanges = async () => {
    if (!previewItems) return;
    const itemsToApply = previewItems.filter((i) => i.included && i.rephrased_text.trim().length > 0);

    if (itemsToApply.length === 0) {
      setError('Please select at least one line to apply.');
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      await api.ai.rephraseApply(mediaId, {
        items: itemsToApply.map((item) => ({
          segment_id: item.segment_id,
          original_text: item.original_text,
          rephrased_text: item.rephrased_text,
        })),
      });

      setSuccessMessage(`Successfully updated ${itemsToApply.length} dialogue line(s)!`);
      setPreviewItems(null);
      await onRefreshTranscript();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Description */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
        <div>
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Transcript Paraphrase & Polish</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Gemini AI improves words and tone while keeping the exact original meaning and timestamps 100% intact.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <div className="flex-1">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Configuration (Hidden when previewing to focus on changes, or collapsible) */}
      {!previewItems ? (
        <div className="space-y-3.5 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3">
          {/* 1. Scope Selector (All vs Particular) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3 text-blue-400" />
              <span>1. Target Scope</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                  scope === 'all'
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    scope === 'all' ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                  }`}
                >
                  {scope === 'all' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <div className="font-semibold text-slate-200">All Lines ({segments.length})</div>
                  <div className="text-[10px] text-slate-500">Rephrase entire video transcript</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('particular')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                  scope === 'particular'
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    scope === 'particular' ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                  }`}
                >
                  {scope === 'particular' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Particular Lines</div>
                  <div className="text-[10px] text-slate-500">
                    {selectedSegmentIds.length > 0
                      ? `${selectedSegmentIds.length} selected`
                      : 'Choose specific lines with checkboxes'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* If Particular: Show Checklist of segments */}
          {scope === 'particular' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-blue-400" />
                  <span>Select Lines to Rephrase ({selectedSegmentIds.length} of {segments.length})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-blue-400 hover:text-blue-300 text-[10px] font-medium transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-slate-400 hover:text-slate-200 text-[10px] font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Scrollable checklist */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-xl bg-slate-950/80 border border-slate-800/80 p-2">
                {segments.map((s) => {
                  const isChecked = selectedSegmentIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleSegment(s.id)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${
                        isChecked
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'border-transparent hover:bg-slate-900/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent div
                        className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(s.start_time);
                        }}
                        className="mono text-[10px] text-blue-400 hover:underline pt-0.5 shrink-0"
                        title="Seek video to this timestamp"
                      >
                        {formatTime(s.start_time)}
                      </button>
                      <div className="flex-1 min-w-0 text-xs text-slate-300 line-clamp-2">
                        {s.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Tone Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
              2. Select Writing Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTone(opt.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                    tone === opt.id
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm mb-0.5">{opt.icon}</span>
                  <span className="text-xs font-semibold text-slate-200">{opt.label}</span>
                  <span className="text-[10px] text-slate-500">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Custom Instruction / Prompt */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>3. Custom Prompt / Instructions (Optional)</span>
              <span className="text-[10px] font-normal text-slate-500">Specify desired style</span>
            </label>
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder='e.g., "Make sentences crisp", "Use simple words", "Friendly conversational style"'
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={isGenerating || (scope === 'particular' && selectedSegmentIds.length === 0)}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gemini AI is rephrasing...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate Rephrase Preview</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Preview & Confirmation Screen */
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Preview Rephrased Script ({previewItems.filter((i) => i.included).length} of {previewItems.length} lines active)
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                {tone.toUpperCase()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPreviewItems(null);
                setTokenUsage(null);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Modify Options</span>
            </button>
          </div>

          {/* Token Usage Stats Card */}
          {tokenUsage && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="font-semibold text-white">
                  {tokenUsage.total_tokens.toLocaleString()} Tokens Used
                </span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400">Prompt: {tokenUsage.prompt_tokens.toLocaleString()}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">Completion: {tokenUsage.candidates_tokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400 font-mono text-[10px]">
                <span>Est. Cost:</span>
                <span className="font-bold">${tokenUsage.estimated_cost_usd.toFixed(5)}</span>
                <span className="text-slate-400">(~₹{(tokenUsage.estimated_cost_usd * 86).toFixed(3)})</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-400 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              Review changes below. You can edit any rephrased text or uncheck lines you want to keep unchanged.
            </span>
          </div>

          {/* List of Original vs Rephrased */}
          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {previewItems.map((item, index) => {
              const seg = segments.find((s) => s.id === item.segment_id);
              const startTime = seg ? seg.start_time : 0;

              return (
                <div
                  key={item.segment_id}
                  className={`p-3 rounded-xl border transition-all ${
                    item.included
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={() => handleToggleInclude(item.segment_id)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900"
                        title="Include or skip this line"
                      />
                      <button
                        type="button"
                        onClick={() => onSeek(startTime)}
                        className="mono text-blue-400 hover:underline font-medium"
                        title="Click to seek"
                      >
                        Line #{index + 1} &bull; {formatTime(startTime)}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {item.included ? 'Will apply' : 'Skipped'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Original */}
                    <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800/60 text-xs">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                        Original Spoken Text:
                      </div>
                      <p className="text-slate-400 line-through decoration-slate-600/70">
                        {item.original_text}
                      </p>
                    </div>

                    {/* Rephrased (Editable) */}
                    <div className="bg-slate-950 rounded-lg p-2 border border-blue-500/30 text-xs">
                      <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Rephrased by AI (Editable):</span>
                      </div>
                      <textarea
                        value={item.rephrased_text}
                        onChange={(e) => handleEditText(item.segment_id, e.target.value)}
                        disabled={!item.included}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md p-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewItems(null)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyChanges}
              disabled={isApplying || previewItems.filter((i) => i.included).length === 0}
              className="px-5 py-2 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply {previewItems.filter((i) => i.included).length} Line(s) to Transcript</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
