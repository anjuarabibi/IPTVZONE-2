import { Channel, Playlist, SiteSettings } from '../types';
import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Supabase Client Lazy Initialization
// -----------------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: any = null;

export function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
  }
  return supabaseClient;
}

// -----------------------------------------------------------------------------
// UUID Utilities
// -----------------------------------------------------------------------------
export function ensureUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }
  return deriveUUID(id);
}

function deriveUUID(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const part2 = Math.abs(hash * 3).toString(16).padStart(4, '0').substring(0, 4);
  const part3 = '4' + Math.abs(hash * 7).toString(16).padStart(3, '0').substring(0, 3);
  const part4 = '8' + Math.abs(hash * 11).toString(16).padStart(3, '0').substring(0, 3);
  const part5 = Math.abs(hash * 13).toString(16).padStart(12, '0').substring(0, 12);
  
  return `${hex}-${part2}-${part3}-${part4}-${part5}`;
}

// -----------------------------------------------------------------------------
// Model Mappers (Aligns Frontend with actual Supabase DB tables & columns)
// -----------------------------------------------------------------------------
export function mapDbPlaylistToFrontend(row: any): Playlist {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name || '',
    url: row.url || '',
    createdAt: row.created_at || new Date().toISOString(),
    channelCount: row.channel_count || 0
  };
}

export function mapFrontendPlaylistToDb(p: Playlist): any {
  return {
    id: ensureUUID(p.id),
    name: p.name,
    url: p.url,
    created_at: p.createdAt || new Date().toISOString(),
    channel_count: p.channelCount || 0
  };
}

export function mapDbChannelToFrontend(row: any): Channel {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name || '',
    url: row.stream_url || row.url || '',
    logo: row.logo || '',
    group: row.group_title || row.group || '',
    originalGroup: row.group_title || row.group || '',
    playlistId: row.playlist_id || undefined,
    isFeatured: !!row.is_home,
    isFifa: !!row.is_fifa,
    score: row.score || 0,
    isDead: row.is_working !== undefined ? !row.is_working : false,
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function mapFrontendChannelToDb(c: Channel): any {
  return {
    id: ensureUUID(c.id),
    name: c.name,
    stream_url: c.url,
    logo: c.logo || null,
    group_title: c.group || null,
    playlist_id: c.playlistId ? ensureUUID(c.playlistId) : null,
    is_home: !!c.isFeatured,
    is_fifa: !!c.isFifa,
    score: c.score || 0,
    is_working: !c.isDead,
    created_at: c.createdAt || new Date().toISOString()
  };
}

// Backward compatibility helper
export function mapDbRowToCamel<T>(row: any): T {
  if (!row) return row;
  // Fall back to general mapping if required, but prefer specific mappers above
  const mapped: any = {};
  const fieldMapping: Record<string, string> = {
    createdat: 'createdAt',
    created_at: 'createdAt',
    channelcount: 'channelCount',
    channel_count: 'channelCount',
    originalgroup: 'originalGroup',
    original_group: 'originalGroup',
    playlistid: 'playlistId',
    playlist_id: 'playlistId',
    isfeatured: 'isFeatured',
    is_featured: 'isFeatured',
    isfifa: 'isFifa',
    is_fifa: 'isFifa',
    isdead: 'isDead',
    is_dead: 'isDead',
    starredat: 'starredAt',
    starred_at: 'starredAt',
    sitetitle: 'siteTitle',
    site_title: 'siteTitle',
    bannerurl: 'bannerUrl',
    banner_url: 'bannerUrl',
    bannertitle: 'bannerTitle',
    banner_title: 'bannerTitle',
    bannersubtitle: 'bannerSubtitle',
    banner_subtitle: 'bannerSubtitle',
    featuredgroup: 'featuredGroup',
    featured_group: 'featuredGroup',
    fifakeywords: 'fifaKeywords',
    fifa_keywords: 'fifaKeywords',
    autoremovedead: 'autoRemoveDead',
    auto_remove_dead: 'autoRemoveDead',
  };

  for (const [key, val] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();
    const mappedKey = fieldMapping[lowerKey] || fieldMapping[key] || key;
    mapped[mappedKey] = val;
  }

  return mapped as T;
}

// -----------------------------------------------------------------------------
// Default Seeding Data
// -----------------------------------------------------------------------------
const defaultSettings: SiteSettings = {
  siteTitle: 'IPTV Zone',
  bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
  bannerTitle: 'All live tv channel & Fifa world cup live stream 2026',
  bannerSubtitle: 'সব লাইভ টিভি চ্যানেল এক জায়গায়- খেলা, খবর, সিনেমা ও বিনোদন এখন ফ্রি স্ট্রিমিং',
  featuredGroup: 'News',
  fifaKeywords: 'fifa, world cup, cup, match, live',
  autoRemoveDead: true
};

const defaultChannels: Channel[] = [
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

// -----------------------------------------------------------------------------
// Database Operations
// -----------------------------------------------------------------------------

// 1. Settings
export async function getSettings(): Promise<SiteSettings> {
  const supabase = getSupabase();
  if (!supabase) {
    return defaultSettings;
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*');

    if (error) throw error;

    if (data && data.length > 0) {
      const siteSettings = { ...defaultSettings };
      const fieldMapping: Record<string, keyof SiteSettings> = {
        site_title: 'siteTitle',
        banner_url: 'bannerUrl',
        banner_title: 'bannerTitle',
        banner_subtitle: 'bannerSubtitle',
        featured_group: 'featuredGroup',
        fifa_keywords: 'fifaKeywords',
        auto_remove_dead: 'autoRemoveDead'
      };

      for (const row of data) {
        const camelKey = fieldMapping[row.key];
        if (camelKey) {
          if (camelKey === 'fifaKeywords') {
            if (Array.isArray(row.value)) {
              siteSettings[camelKey] = row.value.join(', ');
            } else {
              siteSettings[camelKey] = String(row.value || '');
            }
          } else if (camelKey === 'autoRemoveDead') {
            siteSettings[camelKey] = !!row.value;
          } else {
            siteSettings[camelKey] = String(row.value || '');
          }
        }
      }
      return siteSettings;
    } else {
      await saveSettings(defaultSettings);
      return defaultSettings;
    }
  } catch (err: any) {
    console.warn('Supabase getSettings failed:', err.message || err);
    return defaultSettings;
  }
}

export async function saveSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const current = await getSettings();
  const updated = { ...current, ...settings };

  try {
    const rows = [
      { key: 'site_title', value: updated.siteTitle },
      { key: 'banner_url', value: updated.bannerUrl },
      { key: 'banner_title', value: updated.bannerTitle },
      { key: 'banner_subtitle', value: updated.bannerSubtitle },
      { key: 'featured_group', value: updated.featuredGroup },
      { 
        key: 'fifa_keywords', 
        value: updated.fifaKeywords.split(',').map(s => s.trim()).filter(Boolean) 
      },
      { key: 'auto_remove_dead', value: !!updated.autoRemoveDead }
    ];

    const { error } = await supabase
      .from('settings')
      .upsert(rows);
      
    if (error) throw error;
  } catch (err: any) {
    console.error('Supabase saveSettings failed:', err.message || err);
    throw err;
  }

  return updated;
}

// 2. Playlists
export async function getPlaylists(): Promise<Playlist[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*');
    if (error) throw error;
    
    const playlists = (data || []).map(row => mapDbPlaylistToFrontend(row));
    playlists.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return playlists;
  } catch (err: any) {
    console.warn('Supabase getPlaylists failed:', err.message || err);
    return [];
  }
}

export async function addPlaylist(playlist: Playlist): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  try {
    const dbPayload = mapFrontendPlaylistToDb(playlist);
    const { error } = await supabase
      .from('playlists')
      .upsert(dbPayload);
    if (error) throw error;
  } catch (err: any) {
    console.error('Supabase addPlaylist failed:', err.message || err);
    throw err;
  }
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  try {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', ensureUUID(playlistId));
    if (error) throw error;
  } catch (err: any) {
    console.error('Supabase deletePlaylist failed:', err.message || err);
    throw err;
  }
}

// 3. Channels
export async function getChannels(): Promise<Channel[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return defaultChannels;
  }

  try {
    const { data, error } = await supabase
      .from('channels')
      .select('*');
    if (error) throw error;

    if (data && data.length > 0) {
      const channels = data.map(row => mapDbChannelToFrontend(row));
      
      // Sort channels: Featured (Star) and FIFA World Cup pinned at the top
      channels.sort((a, b) => {
        const aFeatured = !!a.isFeatured;
        const bFeatured = !!b.isFeatured;
        const aFifa = !!a.isFifa;
        const bFifa = !!b.isFifa;

        const aPinned = aFifa || aFeatured;
        const bPinned = bFifa || bFeatured;

        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        if (aPinned && bPinned) {
          if (aFifa !== bFifa) return aFifa ? -1 : 1;
          if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
        }

        return (a.name || '').localeCompare(b.name || '');
      });

      return channels;
    } else {
      await batchAddChannels(defaultChannels);
      return defaultChannels;
    }
  } catch (err: any) {
    console.warn('Supabase getChannels failed:', err.message || err);
    return defaultChannels;
  }
}

export async function addChannel(channel: Channel): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  try {
    const dbPayload = mapFrontendChannelToDb(channel);
    const { error } = await supabase
      .from('channels')
      .upsert(dbPayload);
    if (error) throw error;
  } catch (err: any) {
    console.error('Supabase addChannel failed:', err.message || err);
    throw err;
  }
}

export async function updateChannel(channelId: string, fields: Partial<Channel>): Promise<Channel> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const dbPayload: any = {};
  if (fields.name !== undefined) dbPayload.name = fields.name;
  if (fields.url !== undefined) dbPayload.stream_url = fields.url;
  if (fields.logo !== undefined) dbPayload.logo = fields.logo || null;
  if (fields.group !== undefined) dbPayload.group_title = fields.group || null;
  if (fields.playlistId !== undefined) dbPayload.playlist_id = fields.playlistId ? ensureUUID(fields.playlistId) : null;
  if (fields.isFeatured !== undefined) dbPayload.is_home = !!fields.isFeatured;
  if (fields.isFifa !== undefined) dbPayload.is_fifa = !!fields.isFifa;
  if (fields.score !== undefined) dbPayload.score = fields.score || 0;
  if (fields.isDead !== undefined) dbPayload.is_working = !fields.isDead;
  if (fields.createdAt !== undefined) dbPayload.created_at = fields.createdAt;

  try {
    const { data, error } = await supabase
      .from('channels')
      .update(dbPayload)
      .eq('id', ensureUUID(channelId))
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(`Channel "${channelId}" not found in database.`);
    }
    return mapDbChannelToFrontend(data[0]);
  } catch (err: any) {
    console.error('Supabase updateChannel failed:', err.message || err);
    throw err;
  }
}

export async function deleteChannel(channelId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  try {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', ensureUUID(channelId));
    if (error) throw error;
  } catch (err: any) {
    console.error('Supabase deleteChannel failed:', err.message || err);
    throw err;
  }
}

export async function batchAddChannels(channelsToAdd: Channel[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  try {
    const chunkSize = 200;
    for (let i = 0; i < channelsToAdd.length; i += chunkSize) {
      const chunk = channelsToAdd.slice(i, i + chunkSize);
      const dbPayloads = chunk.map(c => mapFrontendChannelToDb(c));

      const { error } = await supabase
        .from('channels')
        .upsert(dbPayloads);
      if (error) throw error;
    }
  } catch (err: any) {
    console.error('Supabase batchAddChannels failed:', err.message || err);
    throw err;
  }
}

export async function deleteChannelsByPlaylistId(playlistId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  try {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('playlist_id', ensureUUID(playlistId));
    if (error) throw error;
  } catch (err: any) {
    console.error('Supabase deleteChannelsByPlaylistId failed:', err.message || err);
    throw err;
  }
}
