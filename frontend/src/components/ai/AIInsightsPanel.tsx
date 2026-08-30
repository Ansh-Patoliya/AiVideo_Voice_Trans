import React, { useState } from 'react';
import {
  Sparkles,
  ListChecks,
  Tag,
  Clock,
  Play,
  RotateCw,
  Loader2,
  FileText,
} from 'lucide-react';
import { Transcript } from '../../types';
import { formatTime } from '../../utils/formatters';
import { api } from '../../services/api';

interface AIInsightsPanelProps {
  mediaId: number;
  transcript: Transcript;
  onSeek: (seconds: number) => void;
  onRefreshTranscript: () => void;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  mediaId,
  transcript,
  onSeek,
  onRefreshTranscript,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'points' | 'keywords' | 'sections'>('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyInsights = Boolean(
    transcript.summary ||
    (transcript.key_points && transcript.key_points.length > 0) ||
    (transcript.keywords && transcript.keywords.length > 0) ||
    (transcript.important_sections && transcript.important_sections.length > 0)
  );

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await api.ai.getFullInsights(mediaId);
      onRefreshTranscript();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate AI insights.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Calm Action Header */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <h4 className="text-xs font-semibold text-slate-200">AI Intelligence</h4>
        </div>

        <button
          onClick={handleGenerateAll}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white border border-slate-700/80 text-[11px] font-medium transition-colors shadow-sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <RotateCw className="w-3 h-3 text-slate-400" />
              <span>{hasAnyInsights ? 'Regenerate' : 'Generate Analysis'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Clean Tabs */}
      <div className="flex border-b border-slate-800/80 gap-1">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-all ${
            activeTab === 'summary'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('points')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-all ${
            activeTab === 'points'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListChecks className="w-3 h-3" />
          <span>Key Points ({transcript.key_points?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('keywords')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-all ${
            activeTab === 'keywords'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-3 h-3" />
          <span>Keywords ({transcript.keywords?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('sections')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-all ${
            activeTab === 'sections'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Sections ({transcript.important_sections?.length || 0})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-1">
        {/* 1. Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-2">
            {transcript.summary ? (
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {transcript.summary}
              </p>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                <p>No summary generated yet.</p>
                <p className="text-[11px] text-slate-600">Click &ldquo;Generate Analysis&rdquo; to extract key insights.</p>
              </div>
            )}
          </div>
        )}

        {/* 2. Key Points */}
        {activeTab === 'points' && (
          <div className="space-y-1.5">
            {transcript.key_points && transcript.key_points.length > 0 ? (
              transcript.key_points.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 py-1 text-xs text-slate-300"
                >
                  <span className="text-blue-400 font-bold select-none">&bull;</span>
                  <span className="leading-relaxed">{point}</span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No key takeaways generated yet.
              </div>
            )}
          </div>
        )}

        {/* 3. Keywords */}
        {activeTab === 'keywords' && (
          <div className="space-y-2">
            {transcript.keywords && transcript.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {transcript.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-900 text-slate-300 border border-slate-800"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No keywords generated yet.
              </div>
            )}
          </div>
        )}

        {/* 4. Important Sections */}
        {activeTab === 'sections' && (
          <div className="space-y-1.5">
            {transcript.important_sections && transcript.important_sections.length > 0 ? (
              transcript.important_sections.map((sec, idx) => (
                <div
                  key={idx}
                  onClick={() => onSeek(sec.timestamp)}
                  className="group flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900 cursor-pointer transition-all"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h5 className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                      {sec.title}
                    </h5>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{sec.reason}</p>
                  </div>

                  <span className="mono text-[11px] font-medium text-blue-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0 flex items-center gap-1">
                    <Play className="w-2.5 h-2.5 fill-current" />
                    {sec.formatted_time || formatTime(sec.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No key sections identified yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
