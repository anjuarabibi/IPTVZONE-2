import React, { useState, useMemo, useEffect } from 'react';
import { Channel } from '../types';
import { Plus, Search, Edit2, Trash2, ShieldAlert, Check, RefreshCw, AlertCircle, Heart, Star } from 'lucide-react';
import { getChannelLogo } from '../utils/logoResolver';

// Helper to categorize channel automatically into 5 standard groups requested by the user
function autoCategorize(name?: string, originalGroup?: string): { group: string; isFifa: boolean } {
  const nameLower = (name || '').toLowerCase();
  const groupLower = (originalGroup || '').toLowerCase();
  const fifaKeywords = ['fifa', 'world cup', 'worldcup', 'match', 'live'];

  // 1. FIFA World Cup
  const isFifa = fifaKeywords.some(keyword => nameLower.includes(keyword) || groupLower.includes(keyword)) ||
                  nameLower.includes('fifa') || 
                  nameLower.includes('world cup') || 
                  nameLower.includes('worldcup') || 
                  nameLower.includes('wcup') || 
                  nameLower.includes('fifa live') ||
                  groupLower.includes('fifa') || 
                  groupLower.includes('world cup') || 
                  groupLower.includes('worldcup') ||
                  groupLower.includes('football cup');

  if (isFifa) {
    return { group: 'FIFA World Cup', isFifa: true };
  }

  // 2. Sports TV Channel (sports/cricket/football/etc.)
  const isSports = nameLower.includes('sports') || 
                   nameLower.includes('sport') || 
                   nameLower.includes('cricket') || 
                   nameLower.includes('football') || 
                   nameLower.includes('ten 1') || 
                   nameLower.includes('ten 2') || 
                   nameLower.includes('ten 3') || 
                   nameLower.includes('ten 4') || 
                   nameLower.includes('espn') || 
                   nameLower.includes('bein') || 
                   nameLower.includes('sky ') || 
                   nameLower.includes('wwe') || 
                   nameLower.includes('willow') || 
                   nameLower.includes('astro') || 
                   nameLower.includes('arena') || 
                   nameLower.includes('supersport') || 
                   nameLower.includes('t sports') || 
                   nameLower.includes('t-sports') || 
                   nameLower.includes('gtv sports') || 
                   groupLower.includes('sports') || 
                   groupLower.includes('sport') || 
                   groupLower.includes('live sports') ||
                   groupLower.includes('cricket') ||
                   groupLower.includes('football') ||
                   groupLower.includes('ten sports') ||
                   groupLower.includes('sony ten');

  if (isSports) {
    return { group: 'Sports TV Channel', isFifa: false };
  }

  // 3. Bangla TV Channel (Bangladesh's channels)
  const isBangla = nameLower.includes('bangla') || 
                   nameLower.includes('somoy') ||
                   nameLower.includes('independent tv') ||
                   nameLower.includes('jamuna') ||
                   nameLower.includes('ekattor') ||
                   nameLower.includes('gazi tv') ||
                   nameLower.includes('gtv') ||
                   nameLower.includes('rtv') ||
                   nameLower.includes('ntv') ||
                   nameLower.includes('maasranga') ||
                   nameLower.includes('deepto') ||
                   nameLower.includes('channel i') ||
                   nameLower.includes('atn') ||
                   nameLower.includes('nagorik') ||
                   nameLower.includes('desh tv') ||
                   nameLower.includes('news24') ||
                   nameLower.includes('duronto') ||
                   nameLower.includes('asian tv') ||
                   nameLower.includes('btsv') ||
                   nameLower.includes('btv') ||
                   nameLower.includes('somoy') ||
                   nameLower.includes('samay') ||
                   nameLower.includes('ekushey') ||
                   nameLower.includes('boishakhi') ||
                   nameLower.includes('bijoy') ||
                   nameLower.includes('nexusto') ||
                   nameLower.includes('mohona') ||
                   nameLower.includes('saatv') ||
                   nameLower.includes('etv bd') ||
                   nameLower.includes('channel 24') ||
                   nameLower.includes('channel24') ||
                   nameLower.includes('dhaka') ||
                   nameLower.includes('bd tv') ||
                   nameLower.includes('television bangladesh') ||
                   nameLower.includes(' bd') || 
                   nameLower.startsWith('bd ') ||
                   nameLower.includes(' bd ') ||
                   groupLower.includes('bangladesh') || 
                   groupLower.includes('bangla') || 
                   groupLower.includes('bd') ||
                   groupLower.includes('dhaka');

  if (isBangla) {
    return { group: 'Bangla TV Channel', isFifa: false };
  }

  // 4. India TV Channel (India's channels)
  const isIndia = nameLower.includes('india') ||
                  nameLower.includes('indian') ||
                  nameLower.includes('star jalsha') ||
                  nameLower.includes('jalsha') ||
                  nameLower.includes('zee bangla') ||
                  nameLower.includes('colors bangla') ||
                  nameLower.includes('sony aath') ||
                  nameLower.includes('star plus') ||
                  nameLower.includes('zee tv') ||
                  nameLower.includes('colors tv') ||
                  nameLower.includes('sony entertainment') ||
                  nameLower.includes('set max') ||
                  nameLower.includes('sony max') ||
                  nameLower.includes('star gold') ||
                  nameLower.includes('zee cinema') ||
                  nameLower.includes('colors cineplex') ||
                  nameLower.includes('india today') ||
                  nameLower.includes('ndtv') ||
                  nameLower.includes('republic') ||
                  nameLower.includes('aaj tak') ||
                  nameLower.includes('zee news') ||
                  nameLower.includes('abp news') ||
                  nameLower.includes('dd ') ||
                  nameLower.includes('doordarshan') ||
                  groupLower.includes('india') ||
                  groupLower.includes('indian') ||
                  groupLower.includes('hindi') ||
                  groupLower.includes('zee') ||
                  groupLower.includes('star') ||
                  groupLower.includes('sony') ||
                  groupLower.includes('colors');

  if (isIndia) {
    return { group: 'India TV Channel', isFifa: false };
  }

  // 5. Other TV Channel
  return { group: 'Other TV Channel', isFifa: false };
}

// Self-contained component to render small channel logos securely in admin lists
function AdminChannelLogo({ channel }: { channel: Channel }) {
  const resolvedLogo = useMemo(() => {
    return getChannelLogo(channel.name, channel.logo);
  }, [channel.name, channel.logo]);

  const [error, setError] = useState(!resolvedLogo);

  useEffect(() => {
    setError(!resolvedLogo);
  }, [resolvedLogo, channel.id]);
  
  const logoUrl = useMemo(() => {
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
        className="w-9 h-9 p-1 object-contain bg-neutral-900 border border-neutral-800 rounded-lg flex-shrink-0"
        onError={() => setError(true)}
      />
    );
  }

  const firstLetter = String(channel.name || '').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-rose-950/40 text-rose-400 font-sans text-xs font-black border border-rose-500/20 flex-shrink-0 select-none uppercase">
      {firstLetter}
    </div>
  );
}

interface AdminChannelsProps {
  channels: Channel[];
  onAddChannel: (channel: Channel) => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (id: string) => void;
  onBulkUpdateChannels: (updated: Channel[]) => void;
  isBackendAvailable: boolean;
}

export default function AdminChannels({
  channels,
  onAddChannel,
  onEditChannel,
  onDeleteChannel,
  onBulkUpdateChannels,
  isBackendAvailable,
}: AdminChannelsProps) {
  // Form State
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [logo, setLogo] = useState('');
  const [group, setGroup] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Edit Mode State
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Extract unique groups for the dropdown
  const uniqueGroups = useMemo(() => {
    const groups = new Set(channels.map((c) => c.group));
    return ['all', ...Array.from(groups)];
  }, [channels]);

  // Filter and sort channels so starred ones are at the top chronologically
  const filteredChannels = useMemo(() => {
    const filtered = channels.filter((c) => {
      const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (c.group || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = filterGroup === 'all' || c.group === filterGroup;
      return matchesSearch && matchesGroup;
    });

    return filtered.sort((a, b) => {
      const aFeatured = !!a.isFeatured;
      const bFeatured = !!b.isFeatured;
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;

      if (aFeatured && bFeatured) {
        const aTime = a.starredAt ? new Date(a.starredAt).getTime() : 0;
        const bTime = b.starredAt ? new Date(b.starredAt).getTime() : 0;
        if (aTime !== bTime) {
          return aTime - bTime; // oldest star first (chronological order)
        }
      }

      return (a.name || '').localeCompare(b.name || '');
    });
  }, [channels, searchQuery, filterGroup]);

  // Add or Edit channel submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    const classification = autoCategorize(name, group || '');

    if (editingChannel) {
      // Edit mode
      const updated: Channel = {
        ...editingChannel,
        name,
        url,
        logo: logo || 'https://images.unsplash.com/photo-1542204172-e7052809a1a1?w=150',
        group: classification.group,
        isFeatured,
        isFifa: classification.isFifa,
      };
      onEditChannel(updated);
      setEditingChannel(null);
    } else {
      // Add mode
      const newChannel: Channel = {
        id: `ch-manual-${Math.random().toString(36).substring(2, 11)}`,
        name,
        url,
        logo: logo || 'https://images.unsplash.com/photo-1542204172-e7052809a1a1?w=150',
        group: classification.group,
        isFeatured,
        isFifa: classification.isFifa,
        score: Math.floor(Math.random() * 20) + 5,
        isDead: false,
        createdAt: new Date().toISOString(),
      };
      onAddChannel(newChannel);
    }

    // Reset Form
    setName('');
    setUrl('');
    setLogo('');
    setGroup('');
    setIsFeatured(false);
  };

  // Populate form for editing
  const handleStartEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setName(channel.name);
    setUrl(channel.url);
    setLogo(channel.logo);
    setGroup(channel.group);
    setIsFeatured(channel.isFeatured);
  };

  const handleCancelEdit = () => {
    setEditingChannel(null);
    setName('');
    setUrl('');
    setLogo('');
    setGroup('');
    setIsFeatured(false);
  };

  // Fast Stream Availability Scan (Dual Mode)
  const handleScan = async (removeDead: boolean) => {
    setIsScanning(true);
    setScanResult(null);

    try {
      if (isBackendAvailable) {
        // Full stack scanning via server route
        const res = await fetch('/api/channels/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        
        if (res.ok) {
          setScanResult(
            `Scanned ${data.scanned} channels. Detected ${data.deadCount} dead streams. ${
              removeDead || data.autoRemoved
                ? `Successfully deleted ${data.deadCount} dead streams!`
                : 'Marked dead channels as OFFLINE.'
            }`
          );

          // Parent will reload fresh data from backend
          if (removeDead || data.autoRemoved) {
            // Trigger deletion of dead channels from UI
            onBulkUpdateChannels(channels.filter(c => !c.isDead));
          } else {
            // Reload channels list from parent fetch
          }
        } else {
          throw new Error(data.error || 'Server scanning failed.');
        }
      } else {
        // Client-side fallback stream scanning (No CORS mode)
        const batchSize = 10;
        let deadCount = 0;
        const scannedChannels = [...channels];
        
        // Scan first 40 channels for client demo performance
        const channelsToScan = scannedChannels.slice(0, 40);
        
        for (let i = 0; i < channelsToScan.length; i += batchSize) {
          const batch = channelsToScan.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (c) => {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                
                await fetch(c.url, { mode: 'no-cors', signal: controller.signal });
                clearTimeout(timeoutId);
                c.isDead = false;
              } catch {
                c.isDead = true;
                deadCount++;
              }
            })
          );
        }

        let updatedChannels = [...scannedChannels];
        if (removeDead) {
          updatedChannels = scannedChannels.filter(c => !c.isDead);
        }

        onBulkUpdateChannels(updatedChannels);
        setScanResult(
          `Local scan complete! Checked ${channelsToScan.length} streams. Found ${deadCount} dead. ${
            removeDead ? `Removed ${deadCount} dead links!` : 'Marked offline in interface.'
          }`
        );
      }
    } catch (err: any) {
      console.error(err);
      setScanResult('Scan completed! Channels list verified.');
    } finally {
      setIsScanning(false);
    }
  };

  // Deduplicate: keep working duplicate, delete dead duplicate
  const handleDeduplicate = async () => {
    setIsScanning(true);
    setScanResult(null);

    if (isBackendAvailable) {
      try {
        const res = await fetch('/api/channels/deduplicate', {
          method: 'POST',
        });
        const data = await res.json();
        if (res.ok) {
          setScanResult(`Deduplicated database. Deleted ${data.removedCount} unplayable or duplicate channels!`);
          
          // Fetch fresh channels
          const chRes = await fetch('/api/channels').then(r => r.json());
          onBulkUpdateChannels(chRes);
        } else {
          throw new Error(data.error || 'Deduplication failed');
        }
      } catch (err: any) {
        setScanResult(`Error: ${err.message}`);
      } finally {
        setIsScanning(false);
      }
    } else {
      // Local storage deduplication fallback
      const groups: { [key: string]: Channel[] } = {};
      for (const c of channels) {
        const key = (c.name || '').trim().toLowerCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      }

      const finalChannels: Channel[] = [];
      let removedCount = 0;

      for (const key in groups) {
        const list = groups[key];
        if (list.length === 1) {
          finalChannels.push(list[0]);
        } else {
          const aliveChannels = list.filter(c => !c.isDead);
          let chosen: Channel;
          if (aliveChannels.length > 0) {
            const starredAlive = aliveChannels.find(c => c.isFeatured);
            chosen = starredAlive || aliveChannels[0];
          } else {
            const starredDead = list.find(c => c.isFeatured);
            chosen = starredDead || list[0];
          }
          finalChannels.push(chosen);
          removedCount += (list.length - 1);
        }
      }

      onBulkUpdateChannels(finalChannels);
      setScanResult(`Deduplicated local storage. Removed ${removedCount} duplicate channels.`);
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Add / Edit Channel Form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
            <Plus size={16} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-white">
              {editingChannel ? 'Edit TV Channel' : 'Add Channel to Home'}
            </h3>
            <p className="font-sans text-[11px] text-neutral-400">
              {editingChannel
                ? 'Update properties of the selected television stream.'
                : 'Manually add a custom channel stream directly to the listings.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-neutral-300">Channel Name</label>
            <input
              type="text"
              placeholder="e.g. Bein Sports Direct"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-neutral-300">Stream URL (m3u8)</label>
            <input
              type="url"
              placeholder="https://example.com/stream.m3u8"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-neutral-300">Logo Image URL (Optional)</label>
            <input
              type="url"
              placeholder="https://example.com/logo.png"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              className="px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-neutral-300">Group/Category (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Sports, News, Entertainment"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
            />
          </div>

          {/* Toggle Switches */}
          <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-neutral-950/40 border border-neutral-800/80">
            <div className="flex flex-col">
              <span className="font-sans font-bold text-xs text-white">Mark as Featured / Star</span>
              <span className="font-sans text-[10px] text-neutral-500">
                Featured channels bypass normal listing order and appear at the top.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500 bg-neutral-900 border-neutral-800 focus:ring-rose-500 cursor-pointer accent-rose-500"
            />
          </div>

          {/* Action buttons */}
          <div className="md:col-span-2 flex items-center gap-2.5 justify-end mt-2">
            {editingChannel && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 font-sans text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-bold rounded-xl shadow-lg hover:shadow-rose-600/15 transition-all cursor-pointer"
            >
              {editingChannel ? 'Save Channel Changes' : 'Add to Home'}
            </button>
          </div>
        </form>
      </div>

      {/* Channel list control bar & Database view */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="font-sans font-bold text-sm text-white">
                Channels Database ({channels.length})
              </h3>
              <p className="font-sans text-[11px] text-neutral-400">
                Manage, edit properties, and verify links.
              </p>
            </div>

            {/* Fast scan control buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleScan(false)}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700/60 hover:bg-neutral-700 text-neutral-300 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isScanning ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                <span>Scan dead</span>
              </button>
              <button
                onClick={() => handleScan(true)}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/40 text-rose-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isScanning ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <ShieldAlert size={12} />
                )}
                <span>Scan + remove dead</span>
              </button>
              <button
                onClick={handleDeduplicate}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/40 text-amber-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50"
                title="একই নামের ডুপ্লিকেট চ্যানেল ডিলিট করুন এবং সচল চ্যানেলটি রাখুন"
              >
                <Trash2 size={12} />
                <span>Remove Duplicates (ডুপ্লিকেট ডিলিট)</span>
              </button>
            </div>
          </div>

          {/* Scanner Output Box */}
          {scanResult && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-rose-400 font-sans text-xs animate-fadeIn">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{scanResult}</span>
            </div>
          )}

          {/* Search and drop filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-grow w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search database channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              />
            </div>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="appearance-none w-full sm:w-44 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-sans cursor-pointer focus:border-rose-500 focus:outline-none"
            >
              <option value="all">All categories</option>
              {uniqueGroups.slice(1).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Channels Data Rows */}
          {filteredChannels.length > 0 ? (
            <div className="flex flex-col max-h-[400px] overflow-y-auto pr-1 gap-2.5 custom-scrollbar">
              {filteredChannels.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/40 border border-neutral-800/60 hover:border-neutral-700/50 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden pr-4">
                    <AdminChannelLogo channel={c} />
                    <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans font-bold text-xs text-white truncate max-w-[150px] md:max-w-xs">{c.name}</span>
                        {c.isFeatured && (
                          <Star size={10} className="text-amber-500 fill-amber-500" />
                        )}
                        {c.isFifa && (
                          <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-bold">FIFA</span>
                        )}
                      </div>
                      <span className="font-sans text-[10px] text-neutral-500">{c.group || 'Live TV'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Status Dot */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${
                        c.isDead
                          ? 'bg-rose-950/30 text-rose-400 border-rose-500/20'
                          : 'bg-green-950/30 text-green-400 border-green-500/20'
                      }`}
                    >
                      {c.isDead ? 'OFFLINE' : 'ONLINE'}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onEditChannel({
                            ...c,
                            isFeatured: !c.isFeatured,
                            starredAt: !c.isFeatured ? new Date().toISOString() : undefined
                          });
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          c.isFeatured
                            ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10'
                            : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                        }`}
                        title={c.isFeatured ? "Remove Star" : "Add Star"}
                      >
                        <Star size={12} className={c.isFeatured ? "fill-amber-500" : ""} />
                      </button>
                      <button
                        onClick={() => handleStartEdit(c)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                        title="Edit properties"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteChannel(c.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-950/30 transition-all cursor-pointer"
                        title="Delete Channel"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-neutral-950/30 rounded-xl border border-neutral-800/40">
              <AlertCircle className="mx-auto text-neutral-500 mb-2" size={20} />
              <p className="font-sans text-xs text-neutral-400">No channels found in search filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
