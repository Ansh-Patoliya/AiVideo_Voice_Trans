import React, { useState } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Subtitles,
  FileCode,
  Copy,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { Transcript } from '../../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: number;
  mediaTitle: string;
  transcript: Transcript;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  mediaId,
  mediaTitle,
  transcript,
}) => {
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (withTimestamps: boolean) => {
    let text = '';
    if (withTimestamps) {
      text = transcript.segments
        .map((s) => {
          const mins = Math.floor(s.start_time / 60);
          const secs = Math.floor(s.start_time % 60);
          const time = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          const speaker = s.speaker ? ` [${s.speaker}]` : '';
          return `${time}${speaker}\n${s.text}\n`;
        })
        .join('\n');
    } else {
      text = transcript.full_text || transcript.segments.map((s) => s.text).join(' ');
    }

    navigator.clipboard.writeText(text);
    setCopiedType(withTimestamps ? 'timestamps' : 'plain');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const exportFormats = [
    {
      format: 'txt' as const,
      label: 'Plain Text (.txt)',
      icon: FileText,
      description: 'Human-readable transcript with optional timestamps',
      color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300',
    },
    {
      format: 'csv' as const,
      label: 'Spreadsheet (.csv)',
      icon: FileSpreadsheet,
      description: 'Timestamp, Speaker, and Transcript columns',
      color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300',
    },
    {
      format: 'srt' as const,
      label: 'SubRip Subtitles (.srt)',
      icon: Subtitles,
      description: 'Standard video caption format for Premiere, Final Cut, YouTube',
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
    },
    {
      format: 'pdf' as const,
      label: 'PDF Document (.pdf)',
      icon: FileCode,
      description: 'Clean formatted document with summary and dialogue',
      color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-300',
    },
    {
      format: 'docx' as const,
      label: 'Word Document (.docx)',
      icon: FileText,
      description: 'Editable Microsoft Word document with styled typography',
      color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Export & Download Transcript</h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">{mediaTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Copy Section */}
        <div className="py-4 border-b border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Quick Copy to Clipboard</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleCopy(false)}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700/80 transition-colors"
            >
              {copiedType === 'plain' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400" />
              )}
              <span>{copiedType === 'plain' ? 'Copied Text!' : 'Copy Plain Text'}</span>
            </button>
            <button
              onClick={() => handleCopy(true)}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700/80 transition-colors"
            >
              {copiedType === 'timestamps' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400" />
              )}
              <span>{copiedType === 'timestamps' ? 'Copied with Timestamps!' : 'Copy with Timestamps'}</span>
            </button>
          </div>
        </div>

        {/* Download Formats Grid */}
        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Choose File Format</label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Include timestamps in TXT</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {exportFormats.map((item) => {
              const Icon = item.icon;
              const downloadUrl = api.exports.getDownloadUrl(mediaId, item.format, includeTimestamps);

              return (
                <a
                  key={item.format}
                  href={downloadUrl}
                  download
                  className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r ${item.color} border hover:scale-[1.02] transition-transform`}
                >
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">{item.label}</h4>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{item.description}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
