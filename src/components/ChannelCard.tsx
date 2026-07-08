import React, { useState, useMemo, useEffect } from 'react';
import { Channel } from '../types';
import { Star, Trophy, Tv, Trash2, Edit2 } from 'lucide-react';
import { getChannelLogo } from '../utils/logoResolver';
import { cleanChannelName, cleanGroupName } from './VideoPlayer';

// Extract channel name initials for display on the fallback card
const getInitials = (name: string) => {
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, Math.min(name.length, 2)).toUpperCase();
};

// Generate a high-contrast premium color gradient based on the channel name
const getGradientClass = (name: string) => {
  const gradients = [
    'from-rose-600 to-amber-500',
    'from-violet-600 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-blue-600 to-cyan-500',
    'from-fuchsia-600 to-pink-600',
    'from-rose-500 to-indigo-500'
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
};

interface ChannelCardProps {
  key?: React.Key;
  channel: Channel;
  isPlaying: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite?: (channelId: string) => void;
  isAdmin?: boolean;
  onEdit?: (channel: Channel) => void;
  onDelete?: (channelId: string) => void;
}

export default function ChannelCard({
  channel,
  isPlaying,
  onSelect,
  onToggleFavorite,
  isAdmin = false,
  onEdit,
  onDelete,
}: ChannelCardProps) {
  const resolvedLogo = useMemo(() => {
    return getChannelLogo(channel.name, channel.logo);
  }, [channel.name, channel.logo]);

  const [imageError, setImageError] = useState(!resolvedLogo);

  useEffect(() => {
    setImageError(!resolvedLogo);
  }, [resolvedLogo, channel.id]);

  // Parse and wrap the logo URL in a secure CDN proxy to solve Mixed-Content & CORS issues
  const logoUrl = useMemo(() => {
    if (!resolvedLogo) return '';
    const cleanUrl = resolvedLogo.trim();
    if (!cleanUrl) return '';

    // If already local, inline data, unsplash, or wikimedia, keep intact
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('data:') || cleanUrl.includes('images.unsplash.com') || cleanUrl.includes('upload.wikimedia.org')) {
      return cleanUrl;
    }

    // Wrap the remote logo using weserv.nl to ensure HTTPS routing and bypass server CORS headers
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
  }, [resolvedLogo]);

  return (
    <div
      id={`channel-card-${channel.id}`}
      className={`relative group bg-neutral-900 border ${
        isPlaying ? 'border-rose-500 bg-neutral-900/60 shadow-lg shadow-rose-500/10' : 'border-neutral-800 hover:border-neutral-700'
      } rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between`}
      onClick={() => onSelect(channel)}
    >
      {/* Top action icons block */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        {/* FIFA Badge on top-left */}
        {channel.isFifa ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-neutral-950 font-sans text-[10px] font-black tracking-tight uppercase shadow pointer-events-auto">
            <Trophy size={10} className="fill-current" />
            <span>FIFA</span>
          </div>
        ) : (
          <div /> // Spacing placeholder
        )}

        {/* Favorite/Featured Star toggle on top-right */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(channel.id);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all active:scale-75 pointer-events-auto cursor-pointer ${
              channel.isFeatured
                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
                : 'bg-black/45 text-neutral-400 hover:text-white hover:bg-black/60 border border-neutral-700/50'
            }`}
            title={channel.isFeatured ? 'Remove Featured' : 'Mark as Featured'}
          >
            <Star size={13} fill={channel.isFeatured ? 'currentColor' : 'none'} className="transition-transform group-hover:scale-110" />
          </button>
        )}
      </div>

      {/* Main Image content */}
      <div className="w-full aspect-video bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden group-hover:bg-black transition-colors duration-300">
        {!imageError && logoUrl ? (
          <img
            src={logoUrl}
            alt={channel.name}
            className="max-h-16 max-w-[80%] object-contain select-none transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          /* Beautiful premium color gradient card if logo is broken or missing */
          <div className={`w-full h-full absolute inset-0 bg-gradient-to-br ${getGradientClass(channel.name)} flex flex-col items-center justify-center p-3 transition-transform duration-500 group-hover:scale-105`}>
            <div className="flex flex-col items-center justify-center text-center w-full h-full relative">
              <span className="font-sans font-black text-5xl text-black/10 absolute select-none tracking-tighter uppercase scale-[1.5] pointer-events-none">
                {getInitials(channel.name)}
              </span>
              <div className="w-9 h-9 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg mb-1.5 relative z-10">
                <Tv size={16} className="text-white" />
              </div>
              <span className="font-sans font-extrabold text-[11px] text-white tracking-tight drop-shadow-md relative z-10 line-clamp-1 max-w-[95%] uppercase">
                {cleanChannelName(channel.name)}
              </span>
            </div>
          </div>
        )}
        {/* Gradient black overlay for title readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80" />
      </div>

      {/* Info footer block */}
      <div className="p-3.5 bg-neutral-900 flex flex-col justify-between flex-grow">
        <div>
          <h4 className="font-sans font-bold text-xs text-neutral-200 line-clamp-1 group-hover:text-rose-400 transition-colors">
            {cleanChannelName(channel.name)}
          </h4>
          <p className="font-sans text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
            {cleanGroupName(channel.group || '')}
          </p>
        </div>

        {/* Bottom meta row */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60">
          {/* Status Dot */}
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${channel.isDead ? 'bg-rose-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="font-mono text-[9px] text-neutral-500">
              {channel.isDead ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>

          {/* Popularity or Admin Actions */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(channel);
                  }}
                  className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-all cursor-pointer"
                  title="Edit"
                >
                  <Edit2 size={12} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(channel.id);
                  }}
                  className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-950/40 rounded transition-all cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-400">
              <Star size={10} className="text-amber-500" />
              <span>{channel.score}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
