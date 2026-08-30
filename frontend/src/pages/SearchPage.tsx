import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  Bookmark,
  StickyNote,
  Video,
  Play,
  Loader2,
  Clock,
} from 'lucide-react';
import { SearchResultItem } from '../types';
import { formatTime, formatDate } from '../utils/formatters';
import { api } from '../services/api';

interface SearchPageProps {
  initialQuery?: string;
  onOpenStudio: (mediaId: number, seekTime?: number) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ initialQuery = '', onOpenStudio }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await api.search.query(searchTerm.trim());
      setResults(res.results || []);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const getMatchBadge = (type: string) => {
    switch (type) {
      case 'transcript':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
            <FileText className="w-3 h-3" />
            Spoken Dialogue
          </span>
        );
      case 'bookmark':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
            <Bookmark className="w-3 h-3" />
            Bookmark
          </span>
        );
      case 'note':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
            <StickyNote className="w-3 h-3" />
            Note
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
            <Video className="w-3 h-3" />
            Title
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Global Search</h2>
        <p className="text-xs text-slate-400">
          Find matching dialogue timestamps, bookmark moments, and research notes across all media.
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type any word, topic, speaker quote, or note keyword..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-28 py-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all shadow-xl"
          autoFocus
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Search Results List */}
      <div className="space-y-3">
        {isSearching ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs">Searching transcript indices...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-400">Found {results.length} matching occurrences</p>
            {results.map((res, idx) => (
              <div
                key={idx}
                onClick={() => onOpenStudio(res.media_id, res.timestamp)}
                className="group p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 cursor-pointer transition-all flex items-start justify-between gap-4 shadow-sm"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getMatchBadge(res.match_type)}
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate max-w-md">
                      {res.media_title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pl-1 line-clamp-2">
                    &ldquo;{res.matched_text}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {res.timestamp !== undefined && res.timestamp !== null && (
                    <span className="mono text-xs font-bold px-2 py-1 rounded bg-slate-950 text-blue-400 border border-slate-800 flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      {formatTime(res.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
            <p>No results found for &ldquo;{query}&rdquo;.</p>
            <p className="mt-1 text-slate-600">Try searching for other words or phrase keywords.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
