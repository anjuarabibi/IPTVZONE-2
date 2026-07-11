import React, { useEffect, useState } from 'react';
import { Channel, Playlist, SiteSettings, ActiveTab, AdminSubTab, Category } from './types';
import Header from './components/Header';
import Hero from './components/Hero';
import VideoPlayer from './components/VideoPlayer';
import ChannelList from './components/ChannelList';
import AdminPlaylists from './components/AdminPlaylists';
import AdminChannels from './components/AdminChannels';
import AdminSettings from './components/AdminSettings';
import AdminCategories from './components/AdminCategories';
import { Tv, ListVideo, Settings, SlidersHorizontal, Trophy, Star, ShieldAlert, MonitorPlay, LogIn, LogOut, ArrowRight, Activity, Tag } from 'lucide-react';
import { getChannelLogo } from './utils/logoResolver';

const LOCAL_STORAGE_KEY_PREFIX = 'iptv_zone_';

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'IPTV Zone',
  bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
  bannerTitle: 'All live tv channel & Fifa world cup live stream 2026',
  bannerSubtitle: 'সব লাইভ টিভি চ্যানেল এক জায়গায়- খেলা, খবর, সিনেমা ও বিনোদন এখন ফ্রি স্ট্রিমিং',
  featuredGroup: 'News',
  fifaKeywords: 'fifa, world cup, cup, match, live',
  autoRemoveDead: true
};

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'sample-1',
    name: 'Bein Sports Direct',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/BeIN_Sports_logo.svg/320px-BeIN_Sports_logo.svg.png',
    group: 'FIFA World Cup 2026',
    isFeatured: true,
    isFifa: true,
    score: 66,
    isDead: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-2',
    name: 'TPV Sport',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Telefe_logo.svg/320px-Telefe_logo.svg.png',
    group: 'FIFA World Cup 2026',
    isFeatured: true,
    isFifa: true,
    score: 43,
    isDead: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-3',
    name: 'FIFA Live TV',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/FIFA_logo_sans_background.svg/320px-FIFA_logo_sans_background.svg.png',
    group: 'FIFA World Cup 2026',
    isFeatured: true,
    isFifa: true,
    score: 28,
    isDead: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-4',
    name: 'Bangla Vision',
    url: 'https://bd.topstory.live/bvision/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/2/23/Banglavision_Logo.png',
    group: 'Entertainment',
    isFeatured: true,
    isFifa: false,
    score: 19,
    isDead: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-5',
    name: 'ATN News',
    url: 'https://topstory.live/atnnews/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/e/e0/ATN_News_Logo.png',
    group: 'News',
    isFeatured: true,
    isFifa: false,
    score: 13,
    isDead: false,
    createdAt: new Date().toISOString()
  }
];

// Self-contained component to render small channel logos securely with CSS fallback
function MiniChannelLogo({ channel }: { channel: Channel }) {
  const resolvedLogo = React.useMemo(() => {
    return getChannelLogo(channel.name, channel.logo);
  }, [channel.name, channel.logo]);

  const [error, setError] = useState(!resolvedLogo);

  useEffect(() => {
    setError(!resolvedLogo);
  }, [resolvedLogo, channel.id]);
  
  const logoUrl = React.useMemo(() => {
    if (typeof resolvedLogo !== 'string' || !resolvedLogo.trim()) return '';
    const cleanUrl = resolvedLogo.trim();
    if (!cleanUrl) return '';
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('data:') || cleanUrl.includes('images.unsplash.com') || cleanUrl.includes('upload.wikimedia.org')) {
      return cleanUrl;
    }
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
  }, [resolvedLogo]);

  if (!error && logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="w-6 h-6 object-contain p-0.5 bg-neutral-900 rounded border border-neutral-800 flex-shrink-0"
        onError={() => setError(true)}
      />
    );
  }

  const firstLetter = String(channel.name || '').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="w-6 h-6 rounded flex items-center justify-center bg-rose-950/40 text-rose-400 font-sans text-[10px] font-extrabold border border-rose-500/20 flex-shrink-0 select-none uppercase">
      {firstLetter}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('playlists');

  // Core Data State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // Connection & Auth State
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Initial State Check (Production Supabase Only)
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      try {
        setIsBackendAvailable(true);
        const settingsRes = await fetch('/api/settings');
        if (!settingsRes.ok) {
          throw new Error('Failed to load settings');
        }
        const settingsData = await settingsRes.json();
        setSettings(settingsData);

        const [playlistsRes, channelsRes, categoriesRes] = await Promise.all([
          fetch('/api/playlists').then(r => {
            if (!r.ok) throw new Error('Failed to load playlists');
            return r.json();
          }),
          fetch('/api/channels').then(r => {
            if (!r.ok) throw new Error('Failed to load channels');
            return r.json();
          }),
          fetch('/api/categories').then(r => {
            if (!r.ok) throw new Error('Failed to load categories');
            return r.json();
          }).catch(() => [])
        ]);

        setPlaylists(playlistsRes);
        setChannels(channelsRes);
        setCategories(categoriesRes);

        if (channelsRes.length > 0) {
          setActiveChannel(channelsRes[0]);
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Update dynamic document title based on settings
  useEffect(() => {
    document.title = settings.siteTitle || 'IPTV Zone';
  }, [settings.siteTitle]);

  // Handle active channel selections
  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
  };

  // Sync Favorite status (Featured/Star toggle from user page)
  const handleToggleFavorite = async (channelId: string) => {
    const updatedChannels = channels.map((c) => {
      if (c.id === channelId) {
        const isFeatured = !c.isFeatured;
        const starredAt = isFeatured ? new Date().toISOString() : undefined;
        return { ...c, isFeatured, starredAt, score: c.score + (isFeatured ? 1 : -1) };
      }
      return c;
    });

    setChannels(updatedChannels);
    
    // Sync change with full-stack server backend
    const target = updatedChannels.find(c => c.id === channelId);
    if (target) {
      try {
        await fetch(`/api/channels/${channelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFeatured: target.isFeatured, starredAt: target.starredAt, score: target.score })
        });
      } catch (e) {
        console.error('Failed to sync favorite on backend:', e);
      }
    }

    // Keep active channel in sync if state changed
    if (activeChannel?.id === channelId) {
      setActiveChannel(prev => prev ? {
        ...prev,
        isFeatured: !prev.isFeatured,
        starredAt: !prev.isFeatured ? new Date().toISOString() : undefined,
        score: prev.score + (!prev.isFeatured ? 1 : -1)
      } : null);
    }
  };

  // Admin Actions: ADD PLAYLIST (M3U Parser calls this)
  const handleAddPlaylist = (newPlaylist: Playlist, importedChannels: Channel[]) => {
    // Full stack: Server did the heavy lifting, we simply fetch the fresh states!
    const reloadData = async () => {
      const [plRes, chRes, catRes] = await Promise.all([
        fetch('/api/playlists').then(r => r.json()),
        fetch('/api/channels').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()).catch(() => [])
      ]);
      setPlaylists(plRes);
      setChannels(chRes);
      setCategories(catRes);
    };
    reloadData();
  };

  // Admin Actions: DELETE PLAYLIST
  const handleDeletePlaylist = async (id: string) => {
    try {
      await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      const [plRes, chRes, catRes] = await Promise.all([
        fetch('/api/playlists').then(r => r.json()),
        fetch('/api/channels').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()).catch(() => [])
      ]);
      setPlaylists(plRes);
      setChannels(chRes);
      setCategories(catRes);
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Actions: ADD SINGLE CHANNEL
  const handleAddChannel = async (newChannel: Channel) => {
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel)
      });
      const saved = await res.json();
      setChannels(prev => [...prev, saved]);

      const catRes = await fetch('/api/categories').then(r => r.json()).catch(() => []);
      setCategories(catRes);
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Actions: EDIT CHANNEL
  const handleEditChannel = async (updatedChannel: Channel) => {
    try {
      const res = await fetch(`/api/channels/${updatedChannel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedChannel)
      });
      const saved = await res.json();
      setChannels(prev => prev.map(c => c.id === saved.id ? saved : c));

      const catRes = await fetch('/api/categories').then(r => r.json()).catch(() => []);
      setCategories(catRes);
    } catch (e) {
      console.error(e);
    }

    if (activeChannel?.id === updatedChannel.id) {
      setActiveChannel(updatedChannel);
    }
  };

  // Admin Actions: DELETE CHANNEL
  const handleDeleteChannel = async (id: string) => {
    try {
      await fetch(`/api/channels/${id}`, { method: 'DELETE' });
      setChannels(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }

    if (activeChannel?.id === id) {
      setActiveChannel(null);
    }
  };

  // Admin Actions: BULK VERIFICATION / CLEAN SCAN UPDATES
  const handleBulkUpdateChannels = (updatedList: Channel[]) => {
    setChannels(updatedList);
  };

  // Admin Actions: CATEGORIES
  const handleAddCategory = async (name: string, isStarred: boolean) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isStarred })
      });
      if (response.ok) {
        const newCat = await response.json();
        setCategories(prev => [...prev, newCat]);
      }
    } catch (e) {
      console.error('Failed to add category:', e);
    }
  };

  const handleUpdateCategory = async (id: string, name?: string, isStarred?: boolean) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isStarred })
      });
      if (response.ok) {
        const updatedCat = await response.json();
        setCategories(prev => prev.map(c => c.id === id ? updatedCat : c));
      }
    } catch (e) {
      console.error('Failed to update category:', e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete category:', e);
    }
  };

  // Admin Actions: SAVE SITE SETTINGS
  const handleSaveSettings = async (updatedSettings: SiteSettings) => {
    setSettings(updatedSettings);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Mark channel offline when player fails
  const handleMarkDead = async (channelId: string) => {
    // Check if there is another working duplicate with the same name
    const targetChannel = channels.find(c => c.id === channelId);
    if (targetChannel) {
      const targetNameNormalized = (targetChannel.name || '').trim().toLowerCase();
      const hasWorkingDuplicate = channels.some(c => 
        c.id !== channelId && 
        (c.name || '').trim().toLowerCase() === targetNameNormalized && 
        !c.isDead
      );

      if (hasWorkingDuplicate) {
        // Automatically delete the non-working duplicate stream!
        handleDeleteChannel(channelId);
        return;
      }
    }

    // Flag channel as offline locally
    const updated = channels.map(c => {
      if (c.id === channelId) return { ...c, isDead: true };
      return c;
    });
    setChannels(updated);

    if (settings.autoRemoveDead) {
      // Delete the dead stream directly if auto-delete is checked
      handleDeleteChannel(channelId);
    } else {
      // Mark as dead in database
      try {
        await fetch(`/api/channels/${channelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isDead: true })
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Admin Authentication Check
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Rohedulmyadmin' || passwordInput === 'admin' || passwordInput === 'iptvzone') {
      setIsAdminAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError('Incorrect Admin Password! Try standard values: "Rohedulmyadmin".');
    }
  };

  if (isLoading) {
    return (
      <div id="app-loading-screen" className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center text-center z-50">
        <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xl shadow-rose-600/30 animate-bounce mb-4">
          <MonitorPlay size={24} fill="currentColor" />
        </div>
        <h2 className="font-sans font-black tracking-tight text-white text-xl mb-1">IPTV<span className="text-rose-500">Zone</span></h2>
        <div className="flex items-center gap-1.5 mt-2 text-rose-500">
          <Activity size={12} className="animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest uppercase">Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 selection:bg-rose-500 selection:text-white flex flex-col">
      {/* Dynamic Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} title={settings.siteTitle} />

      {/* Main Content Stage container */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
        
        {/* VIEW 1: HOME PAGE */}
        {activeTab === 'home' && (
          <div className="flex flex-col">
            <Hero settings={settings} />

            {/* Split layout: Sticky Player + Channel Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Sticky Sidebar / Sticky Top Mobile Player */}
              <div className="lg:col-span-1 sticky top-[61px] lg:top-24 z-30 bg-neutral-950 pb-4 pt-2 lg:pt-0 lg:pb-0 lg:bg-transparent lg:z-20 flex flex-col gap-3">
                <VideoPlayer channel={activeChannel} onMarkDead={handleMarkDead} />
              </div>

              {/* Independent Scrollable Channel Listings */}
              <div className="lg:col-span-2">
                <ChannelList
                  channels={channels}
                  categories={categories}
                  activeChannel={activeChannel}
                  onSelectChannel={handleSelectChannel}
                  onToggleFavorite={handleToggleFavorite}
                  isCompact={true}
                />
              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: LIVE TV (Focus view on entire Channels Library list) */}
        {activeTab === 'live' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1 pb-3 border-b border-neutral-800">
              <h1 className="font-sans font-black text-2xl text-white tracking-tight">Live TV Channels</h1>
              <p className="font-sans text-xs text-neutral-500">
                Browse through all {channels.length} live television streams. FIFA priority channels are pinned above.
              </p>
            </div>

            {/* Sticky Player at the top of Live TV page on mobile, split on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Player block - Sticky on Mobile and Desktop */}
              <div className="lg:col-span-1 sticky top-[61px] lg:top-24 z-30 bg-neutral-950 pb-4 pt-2 lg:pt-0 lg:pb-0 lg:bg-transparent lg:z-20 flex flex-col gap-2">
                <VideoPlayer channel={activeChannel} onMarkDead={handleMarkDead} />
              </div>

              {/* Wide Channels Database list */}
              <div className="lg:col-span-2">
                <ChannelList
                  channels={channels}
                  categories={categories}
                  activeChannel={activeChannel}
                  onSelectChannel={handleSelectChannel}
                  onToggleFavorite={handleToggleFavorite}
                  isCompact={true}
                />
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: DEDICATED CINEMATIC VIDEO PAGE */}
        {activeTab === 'video' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="flex flex-col gap-1">
              <h1 className="font-sans font-black text-2xl text-white tracking-tight">Cinema Theater</h1>
              <p className="font-sans text-xs text-neutral-500">
                Immersive playback layout. Select another channel below to change stream.
              </p>
            </div>

            <VideoPlayer channel={activeChannel} onMarkDead={handleMarkDead} />

            {/* Flat search stream scroll listing under theater */}
            <div className="mt-4 pt-4 border-t border-neutral-800">
              <span className="font-sans font-bold text-xs text-neutral-400 block mb-3 uppercase tracking-wider">Fast Channel Selector</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {channels.slice(0, 16).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectChannel(c)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer hover:border-neutral-700 transition-all ${
                      activeChannel?.id === c.id
                        ? 'bg-rose-950/30 border-rose-500/50 text-rose-400'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <MiniChannelLogo channel={c} />
                    <span className="font-sans text-[11px] font-bold truncate">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: ADMIN PANEL */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto w-full">
            {!isAdminAuthenticated ? (
              // Login shield form
              <div className="max-w-md mx-auto mt-10 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 shadow-lg shadow-rose-600/5 animate-pulse">
                  <MonitorPlay size={24} fill="currentColor" />
                </div>
                <h2 className="font-sans font-black text-xl text-white tracking-tight mb-1">Admin Panel Login</h2>
                <p className="font-sans text-xs text-neutral-500 text-center mb-6 leading-relaxed">
                  Authentication is required to import playlists, modify listings, or change system settings.
                </p>

                <form onSubmit={handleAdminLogin} className="w-full flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-neutral-400">Admin Password</label>
                    <input
                      type="password"
                      placeholder="Enter admin password (e.g. Rohedulmyadmin)"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
                      required
                    />
                  </div>

                  {authError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-400 font-sans text-xs leading-snug">
                      <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-bold rounded-xl shadow-lg hover:shadow-rose-600/15 active:scale-95 transition-all cursor-pointer mt-2"
                  >
                    <span>Authenticate Account</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              </div>
            ) : (
              // Authenticated Dashboard
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
                  <div>
                    <h1 className="font-sans font-black text-2xl text-white tracking-tight">Admin Dashboard</h1>
                    <p className="font-sans text-xs text-neutral-500">
                      Welcome to the system controls. Mode:{' '}
                      <span className="font-mono font-bold text-rose-400 uppercase">
                        {isBackendAvailable ? 'Full-Stack Engine' : 'Local Sandbox Engine'}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsAdminAuthenticated(false);
                      setPasswordInput('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-lg font-sans text-xs font-bold transition-all cursor-pointer"
                  >
                    <LogOut size={13} /> Log out Admin
                  </button>
                </div>

                {/* Sub Tab Navigation Header */}
                <div className="flex items-center gap-2 border-b border-neutral-800 pb-1 flex-wrap">
                  {[
                    { id: 'playlists' as AdminSubTab, label: 'Playlists', icon: ListVideo },
                    { id: 'channels' as AdminSubTab, label: 'Channels', icon: Tv },
                    { id: 'categories' as AdminSubTab, label: 'Categories', icon: Tag },
                    { id: 'settings' as AdminSubTab, label: 'Settings', icon: Settings },
                  ].map((sub) => {
                    const SubIcon = sub.icon;
                    const isActiveSub = adminSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setAdminSubTab(sub.id)}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 font-sans text-xs font-bold transition-all cursor-pointer ${
                          isActiveSub
                            ? 'border-rose-500 text-rose-500 bg-rose-500/5'
                            : 'border-transparent text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <SubIcon size={13} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub Tab panels content */}
                {adminSubTab === 'playlists' && (
                  <AdminPlaylists
                    playlists={playlists}
                    settings={settings}
                    onAddPlaylist={handleAddPlaylist}
                    onDeletePlaylist={handleDeletePlaylist}
                    isBackendAvailable={isBackendAvailable}
                  />
                )}

                {adminSubTab === 'channels' && (
                  <AdminChannels
                    channels={channels}
                    onAddChannel={handleAddChannel}
                    onEditChannel={handleEditChannel}
                    onDeleteChannel={handleDeleteChannel}
                    onBulkUpdateChannels={handleBulkUpdateChannels}
                    isBackendAvailable={isBackendAvailable}
                  />
                )}

                {adminSubTab === 'categories' && (
                  <AdminCategories
                    categories={categories}
                    onAddCategory={handleAddCategory}
                    onUpdateCategory={handleUpdateCategory}
                    onDeleteCategory={handleDeleteCategory}
                  />
                )}

                {adminSubTab === 'settings' && (
                  <AdminSettings settings={settings} onSaveSettings={handleSaveSettings} />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Styled Footer */}
      <footer className="bg-neutral-950 border-t border-neutral-900 p-6 text-center mt-12">
        <p className="font-sans text-xs text-neutral-500">
          &copy; {new Date().getFullYear()} <span className="font-extrabold text-neutral-400">IPTV<span className="text-rose-500">Zone</span></span>. All rights reserved. Powered by low-latency HLS video core.
        </p>
      </footer>
    </div>
  );
}
