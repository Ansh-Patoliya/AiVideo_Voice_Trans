import React, { useState } from 'react';
import { Search, Plus, User, LogOut, Shield } from 'lucide-react';

interface HeaderProps {
  onSearchSubmit: (query: string) => void;
  onNewTranscription: () => void;
  currentUser?: { email: string; full_name?: string } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchSubmit,
  onNewTranscription,
  currentUser,
  onLogout,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearchSubmit(searchInput.trim());
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search transcripts, spoken text, bookmarks, notes..."
          className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </form>

      {/* Actions & User Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewTranscription}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm shadow-blue-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Transcription</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* User Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs">
          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-medium">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="text-slate-300 font-medium max-w-[140px] truncate">
            {currentUser?.full_name || currentUser?.email || 'Team User'}
          </span>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              className="text-slate-500 hover:text-rose-400 transition-colors ml-1 p-0.5"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
