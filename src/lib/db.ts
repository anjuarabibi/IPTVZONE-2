import { db, auth } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { Channel, Playlist, SiteSettings } from '../types';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function checkAndHandleFirestoreError(error: any, operation: OperationType, path: string | null) {
  const isPermissionError = error && (
    (error.message && error.message.toLowerCase().includes('permission')) ||
    (error.code && error.code === 'permission-denied')
  );
  if (isPermissionError) {
    handleFirestoreError(error, operation, path);
  }
}

const DB_FILE_PATH = path.join(process.cwd(), 'data-db.json');

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
// Database schema-adaptation helpers for Supabase casing variations
// -----------------------------------------------------------------------------
const PLAYLIST_FIELDS = ['id', 'name', 'url', 'createdAt', 'channelCount'];
const CHANNEL_FIELDS = [
  'id', 'name', 'url', 'logo', 'group', 'originalGroup',
  'playlistId', 'isFeatured', 'isFifa', 'score', 'isDead',
  'starredAt', 'createdAt'
];
const SETTINGS_FIELDS = [
  'siteTitle', 'bannerUrl', 'bannerTitle', 'bannerSubtitle',
  'featuredGroup', 'fifaKeywords', 'autoRemoveDead'
];

const tableColumnsCache: Record<string, { casing: 'camel' | 'lower' | 'snake'; columns: string[]; hasId: boolean }> = {};

export async function getTableColumnsAndCasing(tableName: string, defaultFields: string[], supabase: any): Promise<{
  casing: 'camel' | 'lower' | 'snake';
  columns: string[];
  hasId: boolean;
}> {
  if (tableColumnsCache[tableName]) {
    return tableColumnsCache[tableName];
  }
  
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (!error && data) {
      const row = data[0];
      if (row) {
        const keys = Object.keys(row);
        const hasId = keys.some(k => k.toLowerCase() === 'id');
        
        let casing: 'camel' | 'lower' | 'snake' = 'camel';
        if (keys.includes('createdat') || keys.includes('sitetitle') || keys.includes('bannertitle')) {
          casing = 'lower';
        } else if (keys.includes('created_at') || keys.includes('site_title') || keys.includes('banner_title')) {
          casing = 'snake';
        }
        
        const result = { casing, columns: keys, hasId };
        tableColumnsCache[tableName] = result;
        return result;
      }
    }
  } catch (e) {
    console.warn(`Failed to inspect table ${tableName}:`, e);
  }

  // Fallback if table is empty or inspect query fails. unquoted PostgreSQL is lowercase
  const result = { casing: 'lower' as const, columns: defaultFields.map(f => f.toLowerCase()), hasId: true };
  tableColumnsCache[tableName] = result;
  return result;
}

export function mapDbRowToCamel<T>(row: any): T {
  if (!row) return row;
  const mapped: any = {};
  
  const fieldMapping: Record<string, string> = {
    // Playlists
    createdat: 'createdAt',
    created_at: 'createdAt',
    channelcount: 'channelCount',
    channel_count: 'channelCount',
    
    // Channels
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
    
    // Settings
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

  // Extra fallback mappings for custom database schemas
  if (row.stream_url !== undefined && mapped.url === undefined) mapped.url = row.stream_url;
  if (row.group_title !== undefined && mapped.group === undefined) mapped.group = row.group_title;
  if (row.is_home !== undefined && mapped.isFeatured === undefined) mapped.isFeatured = !!row.is_home;
  if (row.is_working !== undefined && mapped.isDead === undefined) mapped.isDead = !row.is_working;

  return mapped as T;
}

export function mapCamelToDb(obj: any, casing: 'camel' | 'lower' | 'snake', tableColumns?: string[]): any {
  if (!obj) return obj;
  const mapped: any = {};
  
  const camelToSnake = (str: string) => str.replace(/([A-Z])/g, "_$1").toLowerCase();
  
  // Custom aliases mapping frontend keys to possible DB columns
  const fieldAliases: Record<string, string[]> = {
    url: ['stream_url', 'stream-url', 'streamurl', 'url'],
    group: ['group_title', 'group-title', 'grouptitle', 'group'],
    isFeatured: ['is_home', 'is-home', 'ishome', 'is_featured', 'isfeatured'],
    isDead: ['is_working', 'is-working', 'isworking', 'is_dead', 'isdead'],
  };

  for (const [key, val] of Object.entries(obj)) {
    let dbKey = key;
    if (casing === 'lower') {
      dbKey = key.toLowerCase();
    } else if (casing === 'snake') {
      dbKey = camelToSnake(key);
    }
    
    if (tableColumns && tableColumns.length > 0) {
      // Check if we have an alias list for this frontend key
      const aliases = fieldAliases[key];
      let matchedColumn: string | undefined;

      if (aliases) {
        // Try to find any of the aliases in the database columns
        for (const alias of aliases) {
          matchedColumn = tableColumns.find(col => col.toLowerCase() === alias.toLowerCase());
          if (matchedColumn) {
            break;
          }
        }
      }

      // Fallback to standard matching
      if (!matchedColumn) {
        const lowerDbKey = dbKey.toLowerCase();
        matchedColumn = tableColumns.find(col => col.toLowerCase() === lowerDbKey);
      }

      if (matchedColumn) {
        // Handle value conversion/inversion depending on target column
        if (key === 'isDead' && matchedColumn.toLowerCase().includes('working')) {
          mapped[matchedColumn] = !val;
        } else if (key === 'isFeatured' && matchedColumn.toLowerCase().includes('home')) {
          mapped[matchedColumn] = !!val;
        } else {
          mapped[matchedColumn] = val;
        }
      }
    } else {
      mapped[dbKey] = val;
    }
  }
  return mapped;
}

// -----------------------------------------------------------------------------
// Local JSON Database Fallback
// -----------------------------------------------------------------------------
interface LocalDbSchema {
  playlists?: Playlist[];
  channels?: Channel[];
  settings?: SiteSettings;
}

function readLocalDb(): LocalDbSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read local JSON database:', error);
  }
  return {};
}

function writeLocalDb(data: LocalDbSchema) {
  if (process.env.VERCEL) {
    // Skip disk writes in Vercel serverless environments (read-only FS)
    return;
  }
  try {
    const current = readLocalDb();
    const updated = {
      playlists: data.playlists !== undefined ? data.playlists : current.playlists,
      channels: data.channels !== undefined ? data.channels : current.channels,
      settings: data.settings !== undefined ? data.settings : current.settings
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(updated, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write local JSON database:', error);
  }
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
// Database Operations (Supabase -> Firebase/Local Fallback)
// -----------------------------------------------------------------------------

// 1. Settings
export async function getSettings(): Promise<SiteSettings> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { casing, columns, hasId } = await getTableColumnsAndCasing('settings', SETTINGS_FIELDS, supabase);
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        return { ...defaultSettings, ...mapDbRowToCamel<SiteSettings>(data[0]) };
      } else {
        const dbPayload = mapCamelToDb(defaultSettings, casing, columns);
        if (hasId) {
          const idKey = columns.find(c => c.toLowerCase() === 'id') || 'id';
          dbPayload[idKey] = 'settings';
        }
        await supabase.from('settings').insert(dbPayload);
        return defaultSettings;
      }
    } catch (err: any) {
      console.warn('Supabase getSettings failed:', err.message || err);
      if (err.code === '42P01') {
        console.warn('CRITICAL: The "settings" table does not exist in your Supabase database. Please create it using supabase_schema.sql.');
      }
    }
  }

  // Fallback to Firebase Firestore
  try {
    const settingsRef = doc(db, 'config', 'settings');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      return { ...defaultSettings, ...settingsSnap.data() } as SiteSettings;
    } else {
      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.GET, 'config/settings');
    console.warn('Firestore failed (getSettings), falling back to local JSON:', error);
    const local = readLocalDb();
    if (local.settings) return { ...defaultSettings, ...local.settings };
    return defaultSettings;
  }
}

export async function saveSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { casing, columns, hasId } = await getTableColumnsAndCasing('settings', SETTINGS_FIELDS, supabase);
      const dbPayload = mapCamelToDb(updated, casing, columns);
      
      if (hasId) {
        const idKey = columns.find(c => c.toLowerCase() === 'id') || 'id';
        dbPayload[idKey] = 'settings';
        const { error } = await supabase
          .from('settings')
          .upsert(dbPayload, { onConflict: idKey });
        if (error) throw error;
      } else {
        // No id column, delete all first and insert
        const anyColumn = columns[0] || 'siteTitle';
        await supabase.from('settings').delete().neq(anyColumn, '___NON_EXISTENT___');
        const { error } = await supabase.from('settings').insert(dbPayload);
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Supabase saveSettings failed:', err.message || err);
    }
  }

  try {
    const settingsRef = doc(db, 'config', 'settings');
    await setDoc(settingsRef, updated);
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.WRITE, 'config/settings');
    console.warn('Firestore failed (saveSettings), falling back to local JSON:', error);
  }
  writeLocalDb({ settings: updated });
  return updated;
}

// 2. Playlists
export async function getPlaylists(): Promise<Playlist[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*');
      if (error) throw error;
      const playlists = (data || []).map(row => mapDbRowToCamel<Playlist>(row));
      // Sort in-memory by createdAt descending
      playlists.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return playlists;
    } catch (err: any) {
      console.warn('Supabase getPlaylists failed:', err.message || err);
    }
  }

  try {
    const playlistsCol = collection(db, 'playlists');
    const playlistSnapshot = await getDocs(playlistsCol);
    return playlistSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Playlist));
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.LIST, 'playlists');
    console.warn('Firestore failed (getPlaylists), falling back to local JSON:', error);
    const local = readLocalDb();
    return local.playlists || [];
  }
}

export async function addPlaylist(playlist: Playlist): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { casing, columns } = await getTableColumnsAndCasing('playlists', PLAYLIST_FIELDS, supabase);
      const dbPayload = mapCamelToDb(playlist, casing, columns);
      const { error } = await supabase
        .from('playlists')
        .upsert(dbPayload);
      if (error) throw error;
    } catch (err: any) {
      console.error('Supabase addPlaylist failed:', err.message || err);
      throw new Error(`Supabase failed to save playlist "${playlist.name}": ${err.message || err}`);
    }
  }

  try {
    const playlistRef = doc(db, 'playlists', playlist.id);
    await setDoc(playlistRef, playlist);
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.WRITE, `playlists/${playlist.id}`);
    console.warn('Firestore failed (addPlaylist), falling back to local JSON:', error);
  }
  const local = readLocalDb();
  const playlists = local.playlists || [];
  const idx = playlists.findIndex(p => p.id === playlist.id);
  if (idx !== -1) {
    playlists[idx] = playlist;
  } else {
    playlists.push(playlist);
  }
  writeLocalDb({ playlists });
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { columns } = await getTableColumnsAndCasing('playlists', PLAYLIST_FIELDS, supabase);
      const idKey = columns.find(c => c.toLowerCase() === 'id') || 'id';
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq(idKey, playlistId);
      if (error) throw error;
    } catch (err: any) {
      console.warn('Supabase deletePlaylist failed:', err.message || err);
    }
  }

  try {
    const playlistRef = doc(db, 'playlists', playlistId);
    await deleteDoc(playlistRef);
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.DELETE, `playlists/${playlistId}`);
    console.warn('Firestore failed (deletePlaylist), falling back to local JSON:', error);
  }
  const local = readLocalDb();
  const playlists = (local.playlists || []).filter(p => p.id !== playlistId);
  writeLocalDb({ playlists });
}

// 3. Channels
export async function getChannels(): Promise<Channel[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*');
      if (error) throw error;
      
      if (data && data.length > 0) {
        const channels = data.map(row => mapDbRowToCamel<Channel>(row));
        // Sort in memory by name ascending
        channels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return channels;
      } else {
        await batchAddChannels(defaultChannels);
        return defaultChannels;
      }
    } catch (err: any) {
      console.warn('Supabase getChannels failed, falling back:', err.message || err);
    }
  }

  try {
    const channelsCol = collection(db, 'channels');
    const channelsSnapshot = await getDocs(channelsCol);
    const channelsList = channelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
    if (channelsList.length === 0) {
      await batchAddChannels(defaultChannels);
      return defaultChannels;
    }
    return channelsList;
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.LIST, 'channels');
    console.warn('Firestore failed (getChannels), falling back to local JSON:', error);
    const local = readLocalDb();
    if (local.channels && local.channels.length > 0) {
      return local.channels;
    }
    return defaultChannels;
  }
}

export async function addChannel(channel: Channel): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { casing, columns } = await getTableColumnsAndCasing('channels', CHANNEL_FIELDS, supabase);
      const dbPayload = mapCamelToDb(channel, casing, columns);
      const { error } = await supabase
        .from('channels')
        .upsert(dbPayload);
      if (error) throw error;
    } catch (err: any) {
      console.error('Supabase addChannel failed:', err.message || err);
      throw new Error(`Supabase failed to save channel "${channel.name}": ${err.message || err}`);
    }
  }

  try {
    const channelRef = doc(db, 'channels', channel.id);
    await setDoc(channelRef, channel);
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.WRITE, `channels/${channel.id}`);
    console.warn('Firestore failed (addChannel), falling back to local JSON:', error);
  }
  const local = readLocalDb();
  const channels = local.channels || [];
  const idx = channels.findIndex(c => c.id === channel.id);
  if (idx !== -1) {
    channels[idx] = channel;
  } else {
    channels.push(channel);
  }
  writeLocalDb({ channels });
}

export async function updateChannel(channelId: string, fields: Partial<Channel>): Promise<Channel> {
  let updatedChannel: Channel | null = null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { casing, columns } = await getTableColumnsAndCasing('channels', CHANNEL_FIELDS, supabase);
      const dbPayload = mapCamelToDb(fields, casing, columns);
      const idKey = columns.find(c => c.toLowerCase() === 'id') || 'id';
      
      const { data, error } = await supabase
        .from('channels')
        .update(dbPayload)
        .eq(idKey, channelId)
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        updatedChannel = mapDbRowToCamel<Channel>(data[0]);
      }
    } catch (err: any) {
      console.warn('Supabase updateChannel failed:', err.message || err);
    }
  }

  try {
    const channelRef = doc(db, 'channels', channelId);
    await updateDoc(channelRef, fields);
    if (!updatedChannel) {
      const snap = await getDoc(channelRef);
      updatedChannel = { id: snap.id, ...snap.data() } as Channel;
    }
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.WRITE, `channels/${channelId}`);
    console.warn('Firestore failed (updateChannel), falling back to local JSON:', error);
  }
  
  const local = readLocalDb();
  const channels = local.channels || [];
  const idx = channels.findIndex(c => c.id === channelId);
  if (idx !== -1) {
    const merged = { ...channels[idx], ...fields } as Channel;
    channels[idx] = merged;
    if (!updatedChannel) updatedChannel = merged;
  } else {
    const fallback = { id: channelId, ...fields } as Channel;
    channels.push(fallback);
    if (!updatedChannel) updatedChannel = fallback;
  }
  writeLocalDb({ channels });
  return updatedChannel as Channel;
}

export async function deleteChannel(channelId: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { columns } = await getTableColumnsAndCasing('channels', CHANNEL_FIELDS, supabase);
      const idKey = columns.find(c => c.toLowerCase() === 'id') || 'id';
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq(idKey, channelId);
      if (error) throw error;
    } catch (err: any) {
      console.warn('Supabase deleteChannel failed:', err.message || err);
    }
  }

  try {
    const channelRef = doc(db, 'channels', channelId);
    await deleteDoc(channelRef);
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.DELETE, `channels/${channelId}`);
    console.warn('Firestore failed (deleteChannel), falling back to local JSON:', error);
  }
  const local = readLocalDb();
  const channels = (local.channels || []).filter(c => c.id !== channelId);
  writeLocalDb({ channels });
}

export async function batchAddChannels(channelsToAdd: Channel[]): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { casing, columns } = await getTableColumnsAndCasing('channels', CHANNEL_FIELDS, supabase);
      const idKey = columns.find(c => c.toLowerCase() === 'id') || 'id';
      
      // Chunk insertions (size of 200) to optimize speed and stay within request payload limits
      const chunkSize = 200;
      for (let i = 0; i < channelsToAdd.length; i += chunkSize) {
        const chunk = channelsToAdd.slice(i, i + chunkSize);
        const dbPayloads = chunk.map(c => mapCamelToDb(c, casing, columns));
        
        const { error } = await supabase
          .from('channels')
          .upsert(dbPayloads, { onConflict: idKey });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Supabase batchAddChannels failed:', err.message || err);
      if (err.code === '42P01') {
        throw new Error(`Relation "channels" does not exist in your Supabase database. Please create the tables using the SQL provided in supabase_schema.sql.`);
      }
      throw new Error(`Supabase batch save failed. Please verify that your RLS policies allow inserts or ensure SUPABASE_SERVICE_ROLE_KEY is set correctly. Detail: ${err.message || err}`);
    }
  }

  try {
    const chunkSize = 400;
    for (let i = 0; i < channelsToAdd.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = channelsToAdd.slice(i, i + chunkSize);
      for (const c of chunk) {
        const channelRef = doc(db, 'channels', c.id);
        batch.set(channelRef, c);
      }
      await batch.commit();
    }
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.WRITE, 'channels-batch');
    console.warn('Firestore failed (batchAddChannels), falling back to local JSON:', error);
  }
  
  const local = readLocalDb();
  const currentChannels = local.channels || [];
  const channelsMap = new Map(currentChannels.map(c => [c.id, c]));
  for (const c of channelsToAdd) {
    channelsMap.set(c.id, c);
  }
  writeLocalDb({ channels: Array.from(channelsMap.values()) });
}

export async function deleteChannelsByPlaylistId(playlistId: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { columns } = await getTableColumnsAndCasing('channels', CHANNEL_FIELDS, supabase);
      const playlistIdKey = columns.find(c => c.toLowerCase() === 'playlistid') || 
                            columns.find(c => c.toLowerCase() === 'playlist_id') || 
                            'playlistId';
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq(playlistIdKey, playlistId);
      if (error) throw error;
    } catch (err: any) {
      console.warn('Supabase deleteChannelsByPlaylistId failed:', err.message || err);
    }
  }

  try {
    const channelsCol = collection(db, 'channels');
    const q = query(channelsCol, where('playlistId', '==', playlistId));
    const snap = await getDocs(q);
    
    const batchSize = 400;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + batchSize);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  } catch (error) {
    checkAndHandleFirestoreError(error, OperationType.DELETE, `channels-query-playlistId-${playlistId}`);
    console.warn('Firestore failed (deleteChannelsByPlaylistId), falling back to local JSON:', error);
  }
  
  const local = readLocalDb();
  const channels = (local.channels || []).filter(c => c.playlistId !== playlistId);
  writeLocalDb({ channels });
}
