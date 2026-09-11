import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { Transcript } from '../../types';
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

interface TokenUsage {
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

export const AIRephrasePanel: React.FC<AIRephrasePanelProps> = ({
  mediaId,
  transcript,
  onRefreshTranscript,
}) => {
  const [tone, setTone] = useState<ToneType>('professional');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [rephrasedText, setRephrasedText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGeneratePreview = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsGenerating(true);

    try {
      const res = await api.ai.rephrasePreview(mediaId, {
        tone,
        custom_instruction: customInstruction.trim() || undefined,
      });

      if (!res.rephrased_text) {
        setError('No rephrased text was returned by the AI. Please try again.');
        return;
      }

      setOriginalText(res.original_text);
      setRephrasedText(res.rephrased_text);
      setShowPreview(true);
      setTokenUsage(res.token_usage || null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate rephrase. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!rephrasedText.trim()) {
      setError('Rephrased text cannot be empty.');
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      await api.ai.rephraseApply(mediaId, {
        rephrased_text: rephrasedText.trim(),
      });

      setSuccessMessage('Transcript rephrased successfully!');
      setShowPreview(false);
      setRephrasedText('');
      setOriginalText('');
      setTokenUsage(null);
      await onRefreshTranscript();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleReset = () => {
    setShowPreview(false);
    setRephrasedText('');
    setOriginalText('');
    setTokenUsage(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
        <div>
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Transcript Rephrase</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Gemini AI rewrites the entire transcript as one natural, flowing paragraph while keeping the original meaning intact.
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

      {!showPreview ? (
        /* Configuration */
        <div className="space-y-3.5 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3">
          {/* Tone Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
              1. Select Writing Tone
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

          {/* Custom Instruction */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>2. Custom Instructions (Optional)</span>
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
            disabled={isGenerating || !transcript.full_text}
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
        /* Preview */
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">Preview Rephrased Paragraph</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                {tone.toUpperCase()}
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Modify Options</span>
            </button>
          </div>

          {/* Token Usage */}
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
            <span>Review the rewritten paragraph below. You can freely edit it before applying.</span>
          </div>

          {/* Original vs Rephrased */}
          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/60 text-xs">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Original Spoken Text
              </div>
              <p className="text-slate-400 leading-relaxed line-through decoration-slate-600/70">
                {originalText}
              </p>
            </div>

            <div className="bg-slate-950 rounded-lg p-3 border border-blue-500/30 text-xs">
              <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
                Rephrased by AI (Editable)
              </div>
              <textarea
                value={rephrasedText}
                onChange={(e) => setRephrasedText(e.target.value)}
                rows={8}
                className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyChanges}
              disabled={isApplying || !rephrasedText.trim()}
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
                  <span>Apply Rephrased Paragraph</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
