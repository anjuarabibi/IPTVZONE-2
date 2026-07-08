import React, { useState, useMemo } from 'react';
import { Channel } from '../types';
import ChannelCard from './ChannelCard';
import { Trophy, Star, Tv, Search, SlidersHorizontal, AlertCircle, Globe, Activity, Compass } from 'lucide-react';

interface ChannelListProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
  isCompact?: boolean;
}

// Global classifier for Channels
const getChannelCategory = (channel: Channel): 'fifa' | 'sports' | 'bangla' | 'india' | 'other' => {
  const nameLower = channel.name.toLowerCase();
  const groupLower = (channel.group || '').toLowerCase();

  // 1. FIFA World Cup Live Match
  const isFifa = channel.isFifa ||
                 nameLower.includes('fifa') || 
                 nameLower.includes('world cup') || 
                 nameLower.includes('worldcup') || 
                 nameLower.includes('wcup') || 
                 nameLower.includes('fifa live') ||
                 groupLower.includes('fifa') || 
                 groupLower.includes('world cup') || 
                 groupLower.includes('worldcup') ||
                 groupLower === 'fifa world cup';

  if (isFifa) return 'fifa';

  // 2. Sports channels
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
                   groupLower === 'sports tv channel';

  if (isSports) return 'sports';

  // 3. Bangladesh / Bangla channels
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
                   nameLower.includes(' bd') || 
                   nameLower.startsWith('bd ') ||
                   nameLower.includes(' bd ') ||
                   groupLower.includes('bangladesh') || 
                   groupLower.includes('bangla') || 
                   groupLower.includes('bd') ||
                   groupLower === 'bangla tv channel';

  if (isBangla) return 'bangla';

  // 4. India / Hindi channels
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
                  groupLower === 'india tv channel';

  if (isIndia) return 'india';

  return 'other';
};

export default function ChannelList({
  channels,
  activeChannel,
  onSelectChannel,
  onToggleFavorite,
  isCompact = false,
}: ChannelListProps) {
  // View mode state: 'all' (Unified All Groups/All Categories list) or 'sections' (separate categorized blocks)
  const [viewMode, setViewMode] = useState<'all' | 'sections'>('all');

  // Master Unified State (All 253 TV channels)
  const [allSearch, setAllSearch] = useState('');
  const [allCategory, setAllCategory] = useState('all');
  const [allGroup, setAllGroup] = useState('all');

  // Section 1: FIFA Channels State
  const [fifaSearch, setFifaSearch] = useState('');
  const [fifaGroup, setFifaGroup] = useState('all');

  // Section 2: Sports Channels State
  const [sportsSearch, setSportsSearch] = useState('');
  const [sportsGroup, setSportsGroup] = useState('all');

  // Section 3: Bangladesh Channels State
  const [banglaSearch, setBanglaSearch] = useState('');
  const [banglaGroup, setBanglaGroup] = useState('all');

  // Section 4: India Channels State
  const [indiaSearch, setIndiaSearch] = useState('');
  const [indiaGroup, setIndiaGroup] = useState('all');

  // Section 5: Other Channels State
  const [otherSearch, setOtherSearch] = useState('');
  const [otherGroup, setOtherGroup] = useState('all');

  // Sort channels so that:
  // 1. Starred/Featured channels come first.
  // 2. Starred channels are sorted chronologically by when they were starred (starredAt ASC).
  //    The 1st channel starred goes to position 1, 2nd to position 2, and so on.
  // 3. Fallback to name-based sorting.
  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => {
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

      return a.name.localeCompare(b.name);
    });
  }, [channels]);

  // Master List dropdown filters computation (based on preserved original M3U group or fallback category group)
  const allGroups = useMemo(() => {
    const groups = new Set(sortedChannels.map(c => c.originalGroup || c.group).filter(Boolean));
    return ['all', ...Array.from(groups)];
  }, [sortedChannels]);

  // Master List Filter
  const filteredAllChannels = useMemo(() => {
    return sortedChannels.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(allSearch.toLowerCase());
      
      const cat = getChannelCategory(c);
      const matchCategory = allCategory === 'all' || cat === allCategory;

      const userGroup = c.originalGroup || c.group;
      const matchGroup = allGroup === 'all' || userGroup === allGroup;

      return matchSearch && matchCategory && matchGroup;
    });
  }, [sortedChannels, allSearch, allCategory, allGroup]);

  // Segregate channels strictly by priority so there are no duplicates
  const fifaChannels = useMemo(() => sortedChannels.filter(c => getChannelCategory(c) === 'fifa'), [sortedChannels]);
  const sportsChannels = useMemo(() => sortedChannels.filter(c => getChannelCategory(c) === 'sports'), [sortedChannels]);
  const banglaChannels = useMemo(() => sortedChannels.filter(c => getChannelCategory(c) === 'bangla'), [sortedChannels]);
  const indiaChannels = useMemo(() => sortedChannels.filter(c => getChannelCategory(c) === 'india'), [sortedChannels]);
  const otherChannels = useMemo(() => sortedChannels.filter(c => getChannelCategory(c) === 'other'), [sortedChannels]);

  // Extract unique groups for each section for the dropdown menus
  const fifaGroups = useMemo(() => {
    const groups = new Set(fifaChannels.map(c => c.group));
    return ['all', ...Array.from(groups)];
  }, [fifaChannels]);

  const sportsGroups = useMemo(() => {
    const groups = new Set(sportsChannels.map(c => c.group));
    return ['all', ...Array.from(groups)];
  }, [sportsChannels]);

  const banglaGroups = useMemo(() => {
    const groups = new Set(banglaChannels.map(c => c.group));
    return ['all', ...Array.from(groups)];
  }, [banglaChannels]);

  const indiaGroups = useMemo(() => {
    const groups = new Set(indiaChannels.map(c => c.group));
    return ['all', ...Array.from(groups)];
  }, [indiaChannels]);

  const otherGroups = useMemo(() => {
    const groups = new Set(otherChannels.map(c => c.group));
    return ['all', ...Array.from(groups)];
  }, [otherChannels]);

  // Filter functions for each section
  const filteredFifa = useMemo(() => {
    return fifaChannels.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(fifaSearch.toLowerCase());
      const matchGroup = fifaGroup === 'all' || c.group === fifaGroup;
      return matchSearch && matchGroup;
    });
  }, [fifaChannels, fifaSearch, fifaGroup]);

  const filteredSports = useMemo(() => {
    return sportsChannels.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(sportsSearch.toLowerCase());
      const matchGroup = sportsGroup === 'all' || c.group === sportsGroup;
      return matchSearch && matchGroup;
    });
  }, [sportsChannels, sportsSearch, sportsGroup]);

  const filteredBangla = useMemo(() => {
    return banglaChannels.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(banglaSearch.toLowerCase());
      const matchGroup = banglaGroup === 'all' || c.group === banglaGroup;
      return matchSearch && matchGroup;
    });
  }, [banglaChannels, banglaSearch, banglaGroup]);

  const filteredIndia = useMemo(() => {
    return indiaChannels.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(indiaSearch.toLowerCase());
      const matchGroup = indiaGroup === 'all' || c.group === indiaGroup;
      return matchSearch && matchGroup;
    });
  }, [indiaChannels, indiaSearch, indiaGroup]);

  const filteredOther = useMemo(() => {
    return otherChannels.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(otherSearch.toLowerCase());
      const matchGroup = otherGroup === 'all' || c.group === otherGroup;
      return matchSearch && matchGroup;
    });
  }, [otherChannels, otherSearch, otherGroup]);

  return (
    <div id="channel-listings" className="w-full flex flex-col gap-8">
      {/* View Mode Tabs (Sleek modern tabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800/80 pb-4 gap-4">
        <div className="flex gap-2 bg-neutral-900/60 p-1.5 rounded-xl border border-neutral-800/80 w-fit">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg text-xs font-sans font-semibold transition-all flex items-center gap-2 ${
              viewMode === 'all'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/30'
            }`}
          >
            <Tv size={14} />
            <span>All Groups ({sortedChannels.length} Channels)</span>
            <span className="text-[10px] opacity-75 font-normal ml-0.5">সব চ্যানেল এক সাথে</span>
          </button>
          <button
            onClick={() => setViewMode('sections')}
            className={`px-4 py-2 rounded-lg text-xs font-sans font-semibold transition-all flex items-center gap-2 ${
              viewMode === 'sections'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/30'
            }`}
          >
            <Trophy size={14} />
            <span>By Categories</span>
            <span className="text-[10px] opacity-75 font-normal ml-0.5">ক্যাটাগরি অনুযায়ী</span>
          </button>
        </div>

        {/* Total stats */}
        <div className="font-sans text-xs text-neutral-400">
          Total Channels Loaded: <span className="text-white font-bold bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">{sortedChannels.length}</span>
        </div>
      </div>

      {/* RENDER VIEW MODE ALL */}
      {viewMode === 'all' ? (
        <div className="flex flex-col gap-6">
          {/* Controls Bar for Unified View */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-neutral-900/40 rounded-2xl border border-neutral-800/60">
            <div className="flex flex-col gap-1">
              <h3 className="font-sans font-bold text-sm text-white">All Channels Directory (সব গ্রুপ একসাথে)</h3>
              <p className="font-sans text-[11px] text-neutral-400">
                You can filter all {sortedChannels.length} channels from any categories and any custom groups here.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search channels..."
                  value={allSearch}
                  onChange={(e) => setAllSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <select
                  value={allCategory}
                  onChange={(e) => {
                    setAllCategory(e.target.value);
                    // Keep group as is or reset if needed
                  }}
                  className="appearance-none w-full pl-3 pr-8 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-sans cursor-pointer focus:border-rose-500 focus:outline-none"
                >
                  <option value="all">All Categories ({sortedChannels.length})</option>
                  <option value="fifa">⚽ FIFA World Cup ({fifaChannels.length})</option>
                  <option value="sports">🎾 Sports TV Channel ({sportsChannels.length})</option>
                  <option value="bangla">🇧🇩 Bangla TV Channel ({banglaChannels.length})</option>
                  <option value="india">🇮🇳 India TV Channel ({indiaChannels.length})</option>
                  <option value="other">📺 Other TV Channel ({otherChannels.length})</option>
                </select>
                <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>

              {/* Group Filter */}
              <div className="relative">
                <select
                  value={allGroup}
                  onChange={(e) => setAllGroup(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-sans cursor-pointer focus:border-rose-500 focus:outline-none"
                >
                  <option value="all">All Original Groups ({allGroups.length - 1})</option>
                  {allGroups.slice(1).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Grid display */}
          {filteredAllChannels.length > 0 ? (
            <div className={`grid grid-cols-2 ${isCompact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'} gap-4`}>
              {filteredAllChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isPlaying={activeChannel?.id === channel.id}
                  onSelect={onSelectChannel}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 bg-neutral-900/20 rounded-2xl border border-neutral-800/40 text-center flex flex-col items-center justify-center max-w-md mx-auto w-full my-6">
              <AlertCircle className="text-rose-500/80 mb-3 animate-pulse" size={32} />
              <h4 className="font-sans font-bold text-sm text-white mb-1">No Channels Found</h4>
              <p className="font-sans text-xs text-neutral-500 max-w-xs">
                No TV channels match your search or filter settings in this view. Try changing your filters.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* RENDER CATEGORY SECTIONS */
        <div className="flex flex-col gap-10">
          {/* SECTION 1: FIFA WORLD CUP LIVE (Pinned at the very top) */}
          {fifaChannels.length > 0 && (
            <div id="fifa-section" className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
                {/* Section Header */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <Trophy size={16} className="fill-amber-500/10" />
                  </div>
                  <h2 className="font-sans font-bold text-base text-white tracking-tight flex items-center gap-2">
                    FIFA World Cup Live <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold tracking-wider">PINNED</span>
                  </h2>
                </div>

                {/* Section filters */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative flex-grow sm:flex-grow-0">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Search channels..."
                      value={fifaSearch}
                      onChange={(e) => setFifaSearch(e.target.value)}
                      className="w-full sm:w-48 pl-9 pr-4 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
                    />
                  </div>
                  {/* Dropdown Category select */}
                  <div className="relative">
                    <select
                      value={fifaGroup}
                      onChange={(e) => setFifaGroup(e.target.value)}
                      className="appearance-none w-full sm:w-40 pl-3 pr-8 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-sans cursor-pointer focus:border-rose-500 focus:outline-none"
                    >
                      <option value="all">All groups ({fifaChannels.length})</option>
                      {fifaGroups.slice(1).map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Grid display */}
              {filteredFifa.length > 0 ? (
                <div className={`grid grid-cols-2 ${isCompact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'} gap-4`}>
                  {filteredFifa.map((channel) => (
                    <ChannelCard
                      key={channel.id}
                      channel={channel}
                      isPlaying={activeChannel?.id === channel.id}
                      onSelect={onSelectChannel}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-neutral-900/40 rounded-2xl border border-neutral-800/60 text-center flex flex-col items-center">
                  <AlertCircle className="text-neutral-500 mb-2" size={20} />
                  <p className="font-sans text-xs text-neutral-400">No FIFA World Cup channels match your query.</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: SPORTS TV CHANNELS (খেলাধুলা) */}
          <div id="sports-section" className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                  <Activity size={16} />
                </div>
                <h2 className="font-sans font-bold text-base text-white tracking-tight flex items-center gap-2">
                  Sports TV Channels <span className="text-xs text-rose-400 font-normal ml-1">খেলাধুলা</span>
                </h2>
              </div>

              {/* Section filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search sports..."
                    value={sportsSearch}
                    onChange={(e) => setSportsSearch(e.target.value)}
                    className="w-full sm:w-48 pl-9 pr-4 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
                  />
                </div>
                <div className="relative">
                  <select
                    value={sportsGroup}
                    onChange={(e) => setSportsGroup(e.target.value)}
                    className="appearance-none w-full sm:w-40 pl-3 pr-8 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-sans cursor-pointer focus:border-rose-500 focus:outline-none"
                  >
                    <option value="all">All groups ({sportsChannels.length})</option>
                    {sportsGroups.slice(1).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid display */}
            {filteredSports.length > 0 ? (
              <div className={`grid grid-cols-2 ${isCompact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'} gap-4`}>
                {filteredSports.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isPlaying={activeChannel?.id === channel.id}
                    onSelect={onSelectChannel}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 bg-neutral-900/40 rounded-2xl border border-neutral-800/60 text-center flex flex-col items-center">
                <AlertCircle className="text-neutral-500 mb-2" size={20} />
                <p className="font-sans text-xs text-neutral-400">No sports channels match your query.</p>
              </div>
            )}
          </div>

          {/* SECTION 3: BANGLA TV CHANNELS (বাংলাদেশ) */}
          <div id="bangla-section" className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <Globe size={16} />
                </div>
                <h2 className="font-sans font-bold text-base text-white tracking-tight flex items-center gap-2">
                  Bangla TV Channels <span className="text-xs text-emerald-400 font-normal ml-1">বাংলাদেশ</span>
                </h2>
              </div>

              {/* Section filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search Bangla..."
                    value={banglaSearch}
                    onChange={(e) => setBanglaSearch(e.target.value)}
                    className="w-full sm:w-48 pl-9 pr-4 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
                  />
                </div>
                <div className="relative">
                  <select
                    value={banglaGroup}
                    onChange={(e) => setBanglaGroup(e.target.value)}
                    className="appearance-none w-full sm:w-40 pl-3 pr-8 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-sans cursor-pointer focus:border-rose-500 focus:outline-none"
                  >
                    <option value="all">All groups ({banglaChannels.length})</option>
                    {banglaGroups.slice(1).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid display */}
            {filteredBangla.length > 0 ? (
              <div className={`grid grid-cols-2 ${isCompact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'} gap-4`}>
                {filteredBangla.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isPlaying={activeChannel?.id === channel.id}
                    onSelect={onSelectChannel}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 bg-neutral-900/40 rounded-2xl border border-neutral-800/60 text-center flex flex-col items-center">
                <AlertCircle className="text-neutral-500 mb-2" size={20} />
                <p className="font-sans text-xs text-neutral-400">No Bangla channels match your query.</p>
              </div>
            )}
          </div>

          {/* SECTION 4: INDIA TV CHANNELS (ভারত) */}
          <div id="india-section" className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Compass size={16} />
                </div>
                <h2 className="font-sans font-bold text-base text-white tracking-tight flex items-center gap-2">
                  India TV Channels <span className="text-xs text-indigo-400 font-normal ml-1">ভারত টিভি</span>
                </h2>
              </div>

              {/* Section filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search India..."
                    value={indiaSearch}
                    onChange={(e) => setIndiaSearch(e.target.value)}
                    className="w-full sm:w-48 pl-9 pr-4 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
                  />
                </div>
                <div className="relative">
                  <select
                    value={indiaGroup}
                    onChange={(e) => setIndiaGroup(e.target.value)}
                    className="appearance-none w-full sm:w-40 pl-3 pr-8 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-sans cursor-pointer focus:border-rose-500 focus:outline-none"
                  >
                    <option value="all">All groups ({indiaChannels.length})</option>
                    {indiaGroups.slice(1).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid display */}
            {filteredIndia.length > 0 ? (
              <div className={`grid grid-cols-2 ${isCompact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'} gap-4`}>
                {filteredIndia.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isPlaying={activeChannel?.id === channel.id}
                    onSelect={onSelectChannel}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 bg-neutral-900/40 rounded-2xl border border-neutral-800/60 text-center flex flex-col items-center">
                <AlertCircle className="text-neutral-500 mb-2" size={20} />
                <p className="font-sans text-xs text-neutral-400">No India channels match your query.</p>
              </div>
            )}
          </div>

          {/* SECTION 5: ALL OTHER CHANNELS */}
          <div id="all-channels-section" className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-rose-500 border border-neutral-700/50">
                  <Tv size={16} />
                </div>
                <h2 className="font-sans font-bold text-base text-white tracking-tight">
                  Other Live TV Channels
                </h2>
              </div>

              {/* Section filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search other..."
                    value={otherSearch}
                    onChange={(e) => setOtherSearch(e.target.value)}
                    className="w-full sm:w-48 pl-9 pr-4 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
                  />
                </div>
                <div className="relative">
                  <select
                    value={otherGroup}
                    onChange={(e) => setOtherGroup(e.target.value)}
                    className="appearance-none w-full sm:w-40 pl-3 pr-8 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-sans cursor-pointer focus:border-rose-500 focus:outline-none"
                  >
                    <option value="all">All groups ({otherChannels.length})</option>
                    {otherGroups.slice(1).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <SlidersHorizontal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid display */}
            {filteredOther.length > 0 ? (
              <div className={`grid grid-cols-2 ${isCompact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'} gap-4`}>
                {filteredOther.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isPlaying={activeChannel?.id === channel.id}
                    onSelect={onSelectChannel}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 bg-neutral-900/40 rounded-2xl border border-neutral-800/60 text-center flex flex-col items-center">
                <AlertCircle className="text-neutral-500 mb-2" size={24} />
                <p className="font-sans text-sm text-neutral-300 font-semibold mb-1">No other channels found</p>
                <p className="font-sans text-xs text-neutral-500 max-w-sm">
                  We couldn't find any channels matching your filter criteria. Try clearing search or select another group.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
