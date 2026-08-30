import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Subtitles,
  FileCode,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { Transcript } from '../../types';

interface ExportDropdownProps {
  mediaId: number;
  mediaTitle: string;
  transcript: Transcript;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  mediaId,
  mediaTitle,
  transcript,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAll = () => {
    const text = transcript.segments
      .map((s) => {
        const mins = Math.floor(s.start_time / 60);
        const secs = Math.floor(s.start_time % 60);
        const time = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        const speaker = s.speaker ? ` [${s.speaker}]` : '';
        return `${time}${speaker}  ${s.text}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportItems = [
    {
      format: 'txt',
      label: 'Plain Text (.txt)',
      icon: FileText,
      url: api.exports.getDownloadUrl(mediaId, 'txt', true),
    },
    {
      format: 'csv',
      label: 'Spreadsheet (.csv)',
      icon: FileSpreadsheet,
      url: api.exports.getDownloadUrl(mediaId, 'csv'),
    },
    {
      format: 'srt',
      label: 'Subtitles (.srt)',
      icon: Subtitles,
      url: api.exports.getDownloadUrl(mediaId, 'srt'),
    },
    {
      format: 'pdf',
      label: 'PDF Report (.pdf)',
      icon: FileCode,
      url: api.exports.getDownloadUrl(mediaId, 'pdf'),
    },
    {
      format: 'docx',
      label: 'Word Document (.docx)',
      icon: FileText,
      url: api.exports.getDownloadUrl(mediaId, 'docx'),
    },
  ];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
        title="Export transcript in various formats"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export</span>
        <ChevronDown className="w-3 h-3 text-blue-200" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden">
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Download Format
          </div>

          {exportItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.format}
                href={item.url}
                download
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span>{item.label}</span>
              </a>
            );
          })}

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              handleCopyAll();
              setIsOpen(false);
            }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied Transcript!' : 'Copy Full Transcript'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
