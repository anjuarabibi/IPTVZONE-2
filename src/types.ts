export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  originalGroup?: string;
  playlistId?: string; // Empty for manually added channels
  isFeatured: boolean;
  isFifa: boolean;
  score: number; // Favorite count / popularity
  isDead: boolean;
  starredAt?: string; // ISO date string of starring sequence
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  channelCount: number;
}

export interface SiteSettings {
  siteTitle: string;
  bannerUrl: string;
  bannerTitle: string;
  bannerSubtitle: string;
  featuredGroup: string;
  fifaKeywords: string;
  autoRemoveDead: boolean;
}

export type ActiveTab = 'home' | 'live' | 'video' | 'admin';
export type AdminSubTab = 'playlists' | 'channels' | 'settings' | 'categories';

export interface Category {
  id: string;
  name: string;
  isStarred: boolean;
  createdAt: string;
}

