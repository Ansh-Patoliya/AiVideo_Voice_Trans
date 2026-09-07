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
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pinnedCount?: number;
  favouriteCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pinnedCount = 0,
  favouriteCount = 0,
  isCollapsed = false,
  onToggleCollapse,
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
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-slate-950/90 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen transition-all duration-200 select-none`}
    >
      {/* Brand Header & Toggle */}
      <div className={`p-4 border-b border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                Transcriber <span className="text-[9px] bg-blue-500/20 text-blue-400 font-semibold px-1 py-0.5 rounded">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 truncate">Audio & Video Studio</p>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="px-2 py-4 flex-1 space-y-1">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Workspace
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
              } rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm font-semibold'
                  : item.highlight
                  ? 'text-slate-200 hover:bg-slate-900 hover:text-white bg-slate-900/40 border border-slate-800/60'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </div>

              {!isCollapsed && item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}

              {isCollapsed && item.count !== undefined && item.count > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute top-2 right-2" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className={`p-3 border-t border-slate-800/80 text-xs text-slate-500 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center justify-between text-[11px] w-full">
          <span className="flex items-center gap-1.5" title="Pipeline Active">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            {!isCollapsed && <span>Pipeline Active</span>}
          </span>
          {!isCollapsed && <span className="mono text-[10px] text-slate-500">v1.0.0</span>}
        </div>
      </div>
    </aside>
  );
};
