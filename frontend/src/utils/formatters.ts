import { MediaStatus, SourceType } from '../types';

export function formatTime(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function getStatusConfig(status: MediaStatus) {
  switch (status) {
    case 'UPLOADING':
      return {
        label: 'Uploading',
        color: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        progress: 15,
        description: 'Uploading media to secure storage...',
      };
    case 'QUEUED':
      return {
        label: 'Queued',
        color: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        progress: 25,
        description: 'Waiting in processing queue...',
      };
    case 'PROCESSING':
      return {
        label: 'Processing Media',
        color: 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        progress: 40,
        description: 'Reading metadata and optimizing streams...',
      };
    case 'EXTRACTING_AUDIO':
      return {
        label: 'Extracting Audio',
        color: 'text-purple-400 bg-purple-400/10 border-purple-500/20',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        progress: 60,
        description: 'FFmpeg extracting speech audio at 16kHz mono...',
      };
    case 'TRANSCRIBING':
      return {
        label: 'Transcribing Speech',
        color: 'text-cyan-400 bg-cyan-400/10 border-cyan-500/20',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        progress: 80,
        description: 'AI generating accurate segment timestamps and dialogue...',
      };
    case 'SAVING':
      return {
        label: 'Saving Transcript',
        color: 'text-teal-400 bg-teal-400/10 border-teal-500/20',
        badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        progress: 95,
        description: 'Persisting segments and indexing for search...',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        progress: 100,
        description: 'Transcript ready with interactive synchronized player.',
      };
    case 'FAILED':
      return {
        label: 'Processing Failed',
        color: 'text-rose-400 bg-rose-400/10 border-rose-500/20',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        progress: 0,
        description: 'An error occurred during processing.',
      };
    default:
      return {
        label: status,
        color: 'text-slate-400 bg-slate-400/10 border-slate-500/20',
        badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        progress: 0,
        description: '',
      };
  }
}

export function getSourceLabel(source: SourceType): string {
  switch (source) {
    case 'youtube_shorts':
      return 'YouTube Shorts';
    case 'youtube':
      return 'YouTube';
    case 'instagram':
      return 'Instagram Reel';
    case 'facebook':
      return 'Facebook';
    case 'facebook_ad_library':
      return 'FB Ad Library';
    case 'direct_url':
      return 'Direct Stream';
    default:
      return 'File Upload';
  }
}
