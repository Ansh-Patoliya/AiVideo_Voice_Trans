import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Link,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { FileUploadZone } from '../components/upload/FileUploadZone';
import { UrlInputBox } from '../components/upload/UrlInputBox';
import { StatusBadge } from '../components/layout/StatusBadge';
import { MediaItem, MediaStatus } from '../types';
import { api } from '../services/api';
import { getStatusConfig } from '../utils/formatters';

interface UploadPageProps {
  onOpenStudio: (mediaId: number) => void;
  onMediaCreated: () => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onOpenStudio, onMediaCreated }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [activeJob, setActiveJob] = useState<MediaItem | null>(null);

  // Poll status for active job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'COMPLETED' || activeJob.status === 'FAILED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const statusRes = await api.media.getStatus(activeJob.id);
        setActiveJob((prev) => (prev ? { ...prev, status: statusRes.status, error_message: statusRes.error_message } : null));

        if (statusRes.status === 'COMPLETED') {
          onMediaCreated();
        }
      } catch (e) {
        console.error('Status polling error', e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob, onMediaCreated]);

  const handleFileUpload = async (file: File, title?: string, language?: string) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const created = await api.media.upload(file, title, language, (pct) => setUploadProgress(pct));
      setActiveJob(created);
      onMediaCreated();
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = async (url: string, title?: string) => {
    setIsProcessingUrl(true);
    try {
      const created = await api.media.submitUrl(url, title);
      setActiveJob(created);
      onMediaCreated();
    } finally {
      setIsProcessingUrl(false);
    }
  };

  const statusConfig = activeJob ? getStatusConfig(activeJob.status) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Transcribe Media</h2>
        <p className="text-xs text-slate-400">
          Process local video/audio files or stream from YouTube, Shorts, Instagram Reels, and Facebook.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File</span>
        </button>

        <button
          onClick={() => setActiveTab('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'url'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link className="w-4 h-4" />
          <span>Paste Video URL</span>
        </button>
      </div>

      {/* Main Upload / URL Box */}
      {activeTab === 'upload' ? (
        <FileUploadZone
          onFileSelected={handleFileUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      ) : (
        <UrlInputBox
          onSubmitUrl={handleUrlSubmit}
          isProcessing={isProcessingUrl}
        />
      )}

      {/* Active Pipeline Status Card */}
      {activeJob && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Transcription Job
              </span>
              <h4 className="text-sm font-bold text-white">{activeJob.title}</h4>
            </div>
            <StatusBadge status={activeJob.status} size="md" />
          </div>

          {/* Progress Bar & Stage Description */}
          {statusConfig && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{statusConfig.description}</span>
                <span className="mono font-semibold text-blue-400">{statusConfig.progress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${statusConfig.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message if Failed */}
          {activeJob.status === 'FAILED' && activeJob.error_message && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Processing could not be completed</p>
                <p className="mt-0.5 text-rose-300/90">{activeJob.error_message}</p>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
            <span className="text-[11px] text-slate-500">
              {activeJob.status === 'COMPLETED'
                ? 'Ready for editing and analysis'
                : 'Processing runs in the background. You can safely navigate away.'}
            </span>

            {activeJob.status === 'COMPLETED' && (
              <button
                onClick={() => onOpenStudio(activeJob.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Open in Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
