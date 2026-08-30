import React from 'react';
import { Star, Play, Video, Music } from 'lucide-react';
import { MediaItem } from '../types';
import { StatusBadge } from '../components/layout/StatusBadge';
import { formatTime, formatDate, getSourceLabel } from '../utils/formatters';

interface FavouritesPageProps {
  favouriteMedia: MediaItem[];
  onOpenStudio: (mediaId: number) => void;
  onRemoveFavourite: (mediaId: number) => void;
}

export const FavouritesPage: React.FC<FavouritesPageProps> = ({
  favouriteMedia,
  onOpenStudio,
  onRemoveFavourite,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-amber-400">
          <Star className="w-4 h-4 fill-current" />
          <h2 className="text-xl font-bold text-white tracking-tight">Favourite Transcripts</h2>
        </div>
        <p className="text-xs text-slate-400">Your starred video and audio transcriptions ({favouriteMedia.length} starred)</p>
      </div>

      {favouriteMedia && favouriteMedia.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favouriteMedia.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/30 hover:border-amber-500/60 transition-all flex flex-col justify-between space-y-4 shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {getSourceLabel(item.source_type)}
                  </span>
                  <StatusBadge status={item.status} size="sm" />
                </div>

                <h4
                  onClick={() => onOpenStudio(item.id)}
                  className="text-sm font-bold text-white hover:text-amber-400 cursor-pointer transition-colors line-clamp-2"
                >
                  {item.title}
                </h4>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    {item.media_type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                    <span className="mono">{formatTime(item.duration)}</span>
                  </span>
                  <span>&bull;</span>
                  <span>{item.language?.toUpperCase() || 'EN'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onRemoveFavourite(item.id)}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Remove Star
                </button>

                <button
                  onClick={() => onOpenStudio(item.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Open Studio</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs space-y-2">
          <Star className="w-8 h-8 mx-auto text-slate-600" />
          <p className="font-semibold text-slate-400">No favourite transcripts</p>
          <p>Click the star icon on any transcript to bookmark it into your favourites collection.</p>
        </div>
      )}
    </div>
  );
};
