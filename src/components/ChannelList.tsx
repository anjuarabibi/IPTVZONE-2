import React, { useState, useMemo, useRef } from 'react';
import { Channel, Category } from '../types';
import ChannelCard from './ChannelCard';
import { Star, Tv, Search, SlidersHorizontal, AlertCircle, Tag, Grid, Sparkles, Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface ChannelListProps {
  channels: Channel[];
  categories: Category[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
  isCompact?: boolean;
}

export default function ChannelList({
  channels,
  categories,
  activeChannel,
  onSelectChannel,
  onToggleFavorite,
  isCompact = false,
}: ChannelListProps) {
  const [allSearch, setAllSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [allGroup, setAllGroup] = useState('all');
  const [isTopCategoriesDropdownOpen, setIsTopCategoriesDropdownOpen] = useState(false);
  const [isBottomCategoriesExpanded, setIsBottomCategoriesExpanded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Sort channels so featured ones are first, chronologically, then by name
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
          return aTime - bTime;
        }
      }

      return (a.name || '').localeCompare(b.name || '');
    });
  }, [channels]);

  // Extract all distinct M3U group titles
  const allGroups = useMemo(() => {
    const groups = new Set(sortedChannels.map(c => c.originalGroup || c.group).filter(Boolean));
    return ['all', ...Array.from(groups)];
  }, [sortedChannels]);

  // Sort categories: Pinned/Starred first, then alphabetical
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [categories]);

  // Calculate channel count dynamically for each category
  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    channels.forEach(c => {
      const g = (c.group || '').toLowerCase().trim();
      const og = (c.originalGroup || '').toLowerCase().trim();
      categories.forEach(cat => {
        const catName = (cat.name || '').toLowerCase().trim();
        if (g === catName || og === catName) {
          counts[cat.id] = (counts[cat.id] || 0) + 1;
        }
      });
    });
    return counts;
  }, [channels, categories]);

  // Filter channels based on Search, Group, and Selected Category
  const filteredAllChannels = useMemo(() => {
    return sortedChannels.filter(c => {
      const matchSearch = (c.name || '').toLowerCase().includes(allSearch.toLowerCase());
      
      let matchCategory = true;
      if (selectedCategoryId !== 'all') {
        const targetCat = categories.find(cat => cat.id === selectedCategoryId);
        if (targetCat) {
          const catName = (targetCat.name || '').toLowerCase().trim();
          const g = (c.group || '').toLowerCase().trim();
          const og = (c.originalGroup || '').toLowerCase().trim();
          matchCategory = g === catName || og === catName;
        }
      }

      const userGroup = c.originalGroup || c.group;
      const matchGroup = allGroup === 'all' || userGroup === allGroup;

      return matchSearch && matchCategory && matchGroup;
    });
  }, [sortedChannels, allSearch, selectedCategoryId, allGroup, categories]);

  const activeCategoryName = useMemo(() => {
    if (selectedCategoryId === 'all') return 'All Channels (সব চ্যানেল)';
    return categories.find(c => c.id === selectedCategoryId)?.name || 'Filtered channels';
  }, [selectedCategoryId, categories]);

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id);
    // Smooth scroll back to listings area when changing category
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div id="channel-listings" className="w-full flex flex-col gap-6" ref={topRef}>
      
      {/* 1. Header Filter Controls Bar */}
      <div className="relative z-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-neutral-900/60 to-neutral-950/60 backdrop-blur-xl rounded-2xl border border-neutral-800/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-1">
          <h3 className="font-sans font-black text-sm text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <Filter size={11} />
            </span>
            <span>{activeCategoryName}</span>
          </h3>
          <p className="font-sans text-[11px] text-neutral-400 leading-normal">
            Found <span className="text-rose-400 font-bold">{filteredAllChannels.length}</span> active TV channels matching your active filters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full lg:w-auto items-center relative">
          {/* Category Dropdown Button (সব ক্যাটাগরি বাটন) */}
          <div className="relative">
            <button
              onClick={() => setIsTopCategoriesDropdownOpen(!isTopCategoriesDropdownOpen)}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer text-left min-w-[170px] select-none active:scale-[0.98] ${
                isTopCategoriesDropdownOpen
                  ? 'border-rose-500/80 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)] bg-neutral-950'
                  : 'border-neutral-800 text-neutral-300 hover:border-rose-500/50 hover:text-white hover:shadow-[0_0_12px_rgba(244,63,94,0.12)]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`p-1 rounded-md transition-colors ${isTopCategoriesDropdownOpen ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-neutral-900 border border-neutral-800'}`}>
                  <Tag size={11} className={`${isTopCategoriesDropdownOpen ? 'text-rose-400' : 'text-rose-500'} flex-shrink-0`} />
                </span>
                <span className="truncate">
                  {selectedCategoryId === 'all' ? 'All Categories' : activeCategoryName}
                </span>
              </div>
              {isTopCategoriesDropdownOpen ? (
                <ChevronUp size={12} className="text-rose-400 flex-shrink-0 transition-transform duration-300" />
              ) : (
                <ChevronDown size={12} className="text-neutral-500 flex-shrink-0 hover:text-neutral-300 transition-transform duration-300" />
              )}
            </button>

            {isTopCategoriesDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[55]" 
                  onClick={() => setIsTopCategoriesDropdownOpen(false)}
                />
                <div className="absolute right-0 sm:left-0 top-full mt-2.5 w-72 max-h-80 bg-neutral-950/95 backdrop-blur-xl border border-neutral-850 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-2 z-[60] overflow-y-auto scrollbar-thin flex flex-col gap-1 animate-fadeIn">
                  <div className="px-2.5 py-2 text-[9px] font-extrabold text-neutral-500 border-b border-neutral-900/80 mb-1.5 flex items-center justify-between tracking-widest">
                    <span>SELECT CATEGORY (ক্যাটাগরি)</span>
                    <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-md font-bold">
                      {categories.length + 1}
                    </span>
                  </div>
                  
                  {/* Option: All Categories */}
                  <button
                    onClick={() => {
                      handleCategorySelect('all');
                      setIsTopCategoriesDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold border transition-all duration-200 ${
                      selectedCategoryId === 'all'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[inset_0_1px_10px_rgba(244,63,94,0.08)]'
                        : 'text-neutral-300 hover:bg-neutral-900 hover:text-white border-transparent hover:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tv size={12} className={selectedCategoryId === 'all' ? 'text-rose-400' : 'text-neutral-400'} />
                      <span>All Channels (সব ক্যাটাগরি)</span>
                    </div>
                    <span className="text-[9px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800/80 px-2 py-0.5 rounded-lg">
                      {channels.length}
                    </span>
                  </button>

                  {/* Options: Dynamic Categories */}
                  {sortedCategories.map((cat) => {
                    const isActive = selectedCategoryId === cat.id;
                    const count = categoryCounts[cat.id] || 0;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          handleCategorySelect(cat.id);
                          setIsTopCategoriesDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold border transition-all duration-200 ${
                          isActive
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[inset_0_1px_10px_rgba(244,63,94,0.08)]'
                            : 'text-neutral-300 hover:bg-neutral-900 hover:text-white border-transparent hover:border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {cat.isStarred ? (
                            <Star size={12} fill="currentColor" className="text-amber-400 flex-shrink-0" />
                          ) : (
                            <Tag size={12} className={`${isActive ? 'text-rose-400' : 'text-neutral-400'} flex-shrink-0`} />
                          )}
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <span className="text-[9px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800/80 px-2 py-0.5 rounded-lg flex-shrink-0">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Search Input */}
          <div className="relative group w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded-md transition-colors bg-neutral-900 border border-neutral-800 group-focus-within:border-rose-500/30 group-focus-within:bg-rose-500/10">
              <Search size={11} className="text-neutral-500 group-focus-within:text-rose-400 transition-colors" />
            </span>
            <input
              type="text"
              placeholder="Search channels..."
              value={allSearch}
              onChange={(e) => setAllSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 focus:border-rose-500/80 focus:outline-none focus:ring-1 focus:ring-rose-500/20 font-sans text-xs text-white placeholder-neutral-500 transition-all duration-300 focus:shadow-[0_0_15px_rgba(244,63,94,0.15)] group-hover:border-neutral-700/80"
            />
          </div>
        </div>
      </div>

      {/* 2. Channel Cards Grid */}
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
            No TV channels match your search or category filters in this view. Try changing your filters.
          </p>
        </div>
      )}
    </div>
  );
}
