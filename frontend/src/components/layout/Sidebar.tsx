import React from 'react';
import {
  Home,
  UploadCloud,
  FileText,
  Pin,
  Star,
  Search,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pinnedCount?: number;
  favouriteCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pinnedCount = 0,
  favouriteCount = 0,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'upload', label: 'Upload / Paste URL', icon: UploadCloud, highlight: true },
    { id: 'transcripts', label: 'My Transcripts', icon: FileText },
    { id: 'pinned', label: 'Pinned', icon: Pin, count: pinnedCount },
    { id: 'favourites', label: 'Favourites', icon: Star, count: favouriteCount },
    { id: 'search', label: 'Search Transcripts', icon: Search },
  ];

  return (
    <aside className="w-64 bg-slate-950/80 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            Transcriber <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-1.5 py-0.5 rounded">AI</span>
          </h1>
          <p className="text-[11px] text-slate-400">Internal Audio & Video Studio</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-3 py-4 flex-1 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm font-semibold'
                  : item.highlight
                  ? 'text-slate-200 hover:bg-slate-900 hover:text-white bg-slate-900/40 border border-slate-800/60'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Pipeline Active
          </span>
          <span className="mono text-[10px] text-slate-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
