import React from 'react';
import { MediaStatus } from '../../types';

interface StatusBadgeProps {
  status: MediaStatus;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showProgress = false, size = 'sm' }) => {
  const getStatusDetails = () => {
    switch (status) {
      case 'COMPLETED':
        return {
          dotColor: 'bg-emerald-400',
          textColor: 'text-slate-300',
          label: 'Completed',
          pulse: false,
          progress: 100,
        };
      case 'FAILED':
        return {
          dotColor: 'bg-rose-400',
          textColor: 'text-rose-400',
          label: 'Failed',
          pulse: false,
          progress: 0,
        };
      case 'TRANSCRIBING':
        return {
          dotColor: 'bg-blue-400',
          textColor: 'text-blue-300',
          label: 'Transcribing...',
          pulse: true,
          progress: 70,
        };
      case 'EXTRACTING_AUDIO':
        return {
          dotColor: 'bg-blue-400',
          textColor: 'text-blue-300',
          label: 'Extracting audio...',
          pulse: true,
          progress: 40,
        };
      case 'PROCESSING':
      case 'UPLOADING':
        return {
          dotColor: 'bg-blue-400',
          textColor: 'text-blue-300',
          label: 'Processing...',
          pulse: true,
          progress: 25,
        };
      case 'SAVING':
        return {
          dotColor: 'bg-blue-400',
          textColor: 'text-blue-300',
          label: 'Saving...',
          pulse: true,
          progress: 90,
        };
      case 'QUEUED':
      default:
        return {
          dotColor: 'bg-slate-400',
          textColor: 'text-slate-400',
          label: 'Queued',
          pulse: false,
          progress: 10,
        };
    }
  };

  const details = getStatusDetails();

  const sizeClasses = {
    sm: 'text-[11px] gap-1.5 py-0.5 px-2',
    md: 'text-xs gap-1.5 py-1 px-2.5',
    lg: 'text-xs gap-2 py-1.5 px-3 font-medium',
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center rounded-full bg-slate-900 border border-slate-800 ${sizeClasses[size]} ${details.textColor} select-none`}
      >
        <span className="relative flex h-1.5 w-1.5">
          {details.pulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${details.dotColor}`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${details.dotColor}`} />
        </span>
        <span className="font-medium tracking-tight">{details.label}</span>
      </span>

      {showProgress && status !== 'COMPLETED' && status !== 'FAILED' && (
        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden mt-0.5">
          <div
            className="bg-blue-500 h-full transition-all duration-500"
            style={{ width: `${details.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
