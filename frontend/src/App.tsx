import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { HomePage } from './pages/HomePage';
import { UploadPage } from './pages/UploadPage';
import { TranscriptsPage } from './pages/TranscriptsPage';
import { StudioPage } from './pages/StudioPage';
import { PinnedPage } from './pages/PinnedPage';
import { FavouritesPage } from './pages/FavouritesPage';
import { SearchPage } from './pages/SearchPage';
import { LoginPage } from './pages/LoginPage';
import { MediaItem, User } from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeStudioMediaId, setActiveStudioMediaId] = useState<number | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [pinnedList, setPinnedList] = useState<MediaItem[]>([]);
  const [favouriteList, setFavouriteList] = useState<MediaItem[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Fetch initial user session
  const checkAuth = useCallback(async () => {
    try {
      const user = await api.auth.getMe();
      setCurrentUser(user);
    } catch {
      // Default fallback internal session
      try {
        const res = await api.auth.login('team@internal.app', 'internal123');
        localStorage.setItem('token', res.access_token);
        setCurrentUser(res.user);
      } catch {
        // If register needed
        try {
          const res = await api.auth.register('team@internal.app', 'internal123', 'Team Member');
          localStorage.setItem('token', res.access_token);
          setCurrentUser(res.user);
        } catch {
          setCurrentUser(null);
        }
      }
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  const refreshAllMedia = useCallback(async () => {
    if (!currentUser) return;
    try {
      const all = await api.media.list();
      setMediaList(all);

      const pins = await api.pins.list();
      setPinnedList(pins);

      const favs = await api.favourites.list();
      setFavouriteList(favs);
    } catch (e) {
      console.error('Failed to load media list', e);
    }
  }, [currentUser]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (currentUser) {
      refreshAllMedia();
    }
  }, [currentUser, refreshAllMedia]);

  const handleOpenStudio = (mediaId: number, seekTime?: number) => {
    setActiveStudioMediaId(mediaId);
  };

  const handleBackFromStudio = () => {
    setActiveStudioMediaId(null);
    refreshAllMedia();
  };

  const handleGlobalSearch = (q: string) => {
    setGlobalSearchQuery(q);
    setActiveStudioMediaId(null);
    setActiveTab('search');
  };

  const handleTogglePin = async (mediaId: number, isPinned: boolean) => {
    try {
      if (isPinned) {
        await api.pins.remove(mediaId);
      } else {
        await api.pins.add(mediaId);
      }
      refreshAllMedia();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavourite = async (mediaId: number, isFav: boolean) => {
    try {
      if (isFav) {
        await api.favourites.remove(mediaId);
      } else {
        await api.favourites.add(mediaId);
      }
      refreshAllMedia();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMedia = async (mediaId: number) => {
    if (window.confirm('Delete this transcript and media?')) {
      try {
        await api.media.delete(mediaId);
        refreshAllMedia();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Initializing workspace...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeStudioMediaId ? 'studio' : activeTab}
        setActiveTab={(tab) => {
          setActiveStudioMediaId(null);
          setActiveTab(tab);
        }}
        pinnedCount={pinnedList.length}
        favouriteCount={favouriteList.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <Header
          onSearchSubmit={handleGlobalSearch}
          onNewTranscription={() => {
            setActiveStudioMediaId(null);
            setActiveTab('upload');
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeStudioMediaId ? (
            <StudioPage
              mediaId={activeStudioMediaId}
              onBack={handleBackFromStudio}
              onMediaDeleted={() => {
                setActiveStudioMediaId(null);
                refreshAllMedia();
              }}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomePage
                  recentMedia={mediaList}
                  pinnedMedia={pinnedList}
                  favouriteMedia={favouriteList}
                  onOpenStudio={handleOpenStudio}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onTogglePin={handleTogglePin}
                  onToggleFavourite={handleToggleFavourite}
                />
              )}

              {activeTab === 'upload' && (
                <UploadPage
                  onOpenStudio={handleOpenStudio}
                  onMediaCreated={refreshAllMedia}
                />
              )}

              {activeTab === 'transcripts' && (
                <TranscriptsPage
                  mediaItems={mediaList}
                  onOpenStudio={handleOpenStudio}
                  onNavigateUpload={() => setActiveTab('upload')}
                  onTogglePin={handleTogglePin}
                  onToggleFavourite={handleToggleFavourite}
                  onDeleteMedia={handleDeleteMedia}
                />
              )}

              {activeTab === 'pinned' && (
                <PinnedPage
                  pinnedMedia={pinnedList}
                  onOpenStudio={handleOpenStudio}
                  onUnpin={(id) => handleTogglePin(id, true)}
                />
              )}

              {activeTab === 'favourites' && (
                <FavouritesPage
                  favouriteMedia={favouriteList}
                  onOpenStudio={handleOpenStudio}
                  onRemoveFavourite={(id) => handleToggleFavourite(id, true)}
                />
              )}

              {activeTab === 'search' && (
                <SearchPage
                  initialQuery={globalSearchQuery}
                  onOpenStudio={handleOpenStudio}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
