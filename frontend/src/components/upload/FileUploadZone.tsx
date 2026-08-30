import React, { useState, useRef } from 'react';
import { UploadCloud, FileVideo, Music, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';

interface FileUploadZoneProps {
  onFileSelected: (file: File, title?: string, language?: string) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
}

const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.mp3', '.wav', '.m4a', '.aac'];
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelected,
  isUploading,
  uploadProgress,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type '${ext}'. Please upload MP4, MOV, WEBM, MKV, MP3, WAV, or M4A.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds 500MB limit (${formatFileSize(file.size)}).`);
      return;
    }

    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;
    try {
      await onFileSelected(selectedFile, title.trim() || undefined, language);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed. Please try again.');
    }
  };

  const isAudio = selectedFile && ['.mp3', '.wav', '.m4a', '.aac'].some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
              : selectedFile
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                {isAudio ? <Music className="w-6 h-6" /> : <FileVideo className="w-6 h-6" />}
              </div>
              <p className="text-sm font-semibold text-slate-200">{selectedFile.name}</p>
              <p className="text-xs text-slate-400 mono">{formatFileSize(selectedFile.size)}</p>
              <span className="text-[11px] text-blue-400 mt-1 hover:underline">Click to choose another file</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-1">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">
                Drag and drop your video or audio file here
              </h4>
              <p className="text-xs text-slate-400">
                Supports MP4, MOV, WEBM, MKV, MP3, WAV, M4A up to 500MB
              </p>
              <button
                type="button"
                className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition-colors"
              >
                Browse local files
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* File Details Form */}
        {selectedFile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-300">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Media title"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Spoken Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="en">English (Auto / AU / US / UK)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading to secure storage...
              </span>
              <span className="mono font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        {selectedFile && !isUploading && (
          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Start Processing & Transcription</span>
          </button>
        )}
      </form>
    </div>
  );
};
