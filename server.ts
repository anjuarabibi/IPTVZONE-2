import 'dotenv/config';
import express from 'express';
import path from 'path';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { Channel, Playlist, SiteSettings } from './src/types';
import {
  getSettings,
  saveSettings,
  getPlaylists,
  addPlaylist,
  deletePlaylist,
  getChannels,
  addChannel,
  updateChannel,
  deleteChannel,
  batchAddChannels,
  deleteChannelsByPlaylistId,
  getSupabase
} from './src/lib/db';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Helper to categorize channel automatically into 5 standard groups requested by the user
function autoCategorize(name: string, originalGroup: string, fifaKeywords: string[]): { group: string; isFifa: boolean } {
  const nameLower = name.toLowerCase();
  const groupLower = (originalGroup || '').toLowerCase();

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

// Helper to parse M3U content
function parseM3U(m3uContent: string, playlistId: string, settings: SiteSettings): Channel[] {
  // Support both Windows (\r\n) and Unix (\n) line endings
  const lines = m3uContent.split(/\r?\n/);
  const channels: Channel[] = [];
  const fifaKeywords = (settings?.fifaKeywords || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);

  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // 1. Extract tvg-logo or any other variant logo tags
      let logo = '';
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || 
                        line.match(/logo="([^"]+)"/i) || 
                        line.match(/logo-url="([^"]+)"/i) || 
                        line.match(/icon="([^"]+)"/i) ||
                        line.match(/art="([^"]+)"/i) ||
                        line.match(/tvg-logo='([^']+)'/i) ||
                        line.match(/logo='([^']+)'/i);
      if (logoMatch) {
        logo = logoMatch[1];
      }

      // 2. Extract group-title
      let group = 'Uncategorized';
      const groupMatch = line.match(/group-title="([^"]+)"/i) ||
                         line.match(/group="([^"]+)"/i) ||
                         line.match(/group-title='([^']+)'/i);
      if (groupMatch) {
        group = groupMatch[1];
      }

      // 3. Extract name (everything after the last comma)
      let name = 'Unknown Channel';
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      }

      currentChannel = {
        name,
        logo,
        originalGroup: group,
        isFeatured: false,
        score: Math.floor(Math.random() * 50) + 1, // Random score for visual styling
        isDead: false,
        playlistId,
        createdAt: new Date().toISOString()
      };
    } else if (line.startsWith('#EXTGRP:')) {
      // Support EXTGRP group override if defined
      if (currentChannel.name) {
        const extgrp = line.substring(8).trim();
        if (extgrp) {
          currentChannel.originalGroup = extgrp;
        }
      }
    } else if (line.startsWith('http') || line.startsWith('https') || line.startsWith('rtmp') || line.startsWith('rtsp')) {
      if (currentChannel.name) {
        // Automatically categorize channel group and isFifa
        const classification = autoCategorize(currentChannel.name, currentChannel.originalGroup || '', fifaKeywords);
        
        let finalGroup = 'Other TV Channel';
        if (currentChannel.originalGroup && currentChannel.originalGroup !== 'Uncategorized' && currentChannel.originalGroup.trim() !== '') {
          finalGroup = currentChannel.originalGroup.trim();
        } else {
          finalGroup = classification.group;
        }
        
        currentChannel.group = finalGroup;
        currentChannel.isFifa = classification.isFifa;
        currentChannel.url = line;
        currentChannel.id = `ch-${playlistId}-${Math.random().toString(36).substring(2, 11)}`;
        
        channels.push(currentChannel as Channel);
        currentChannel = {};
      }
    }
  }

  return channels;
}

// -----------------------------------------------------------------------------
// API Endpoints
// -----------------------------------------------------------------------------

// Site settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = await saveSettings(req.body);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save settings' });
  }
});

// Playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const playlists = await getPlaylists();
    res.json(playlists);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get playlists' });
  }
});

// Add playlist (Fetch & Parse remote M3U)
app.post('/api/playlists', async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Playlist Name and Stream URL are required' });
    }

    let targetUrl = url;
    if (typeof targetUrl === 'string') {
      targetUrl = targetUrl.trim();
      try {
        const parsed = new URL(targetUrl);
        if (parsed.hostname === 'github.com' && parsed.pathname.includes('/blob/')) {
          targetUrl = targetUrl
            .replace('github.com', 'raw.githubusercontent.com')
            .replace('/blob/', '/');
          console.log(`Auto-converted GitHub page URL to Raw file URL: ${targetUrl}`);
        }
      } catch (err) {
        return res.status(400).json({ error: 'The provided Playlist URL format is invalid. Please ensure it is a valid HTTP or HTTPS URL.' });
      }
    } else {
      return res.status(400).json({ error: 'Playlist URL must be a valid string.' });
    }

    // Verify Supabase Database connection before fetching
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase connection check failed: Client is null. Environment keys missing.');
      return res.status(500).json({ 
        error: 'Database connection is not configured. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correctly defined in your Vercel or environment settings.' 
      });
    }

    // Fetch the playlist content using our robust redirect-following & SSL-bypassing client
    let m3uContent = '';
    try {
      console.log(`Fetching playlist from: ${targetUrl}`);
      const proxyRes = await robustRequest(targetUrl, { timeout: 15000 });
      if (proxyRes.statusCode >= 400) {
        return res.status(proxyRes.statusCode).json({ 
          error: `Failed to fetch M3U playlist. Server returned HTTP Status ${proxyRes.statusCode}.` 
        });
      }
      m3uContent = proxyRes.data.toString('utf8');
    } catch (fetchErr: any) {
      console.error('Fetch playlist error:', fetchErr);
      return res.status(500).json({ 
        error: `Network error: Failed to retrieve playlist from the server. Details: ${fetchErr.message || 'Unknown network error'}` 
      });
    }

    if (!m3uContent || !m3uContent.trim()) {
      return res.status(400).json({ error: 'The retrieved playlist content is empty. Please verify that the URL is active and contains content.' });
    }

    // Verify we didn't receive HTML (which happens on GitHub repository pages or expired proxies)
    const trimmedContent = m3uContent.trim();
    if (trimmedContent.startsWith('<!DOCTYPE') || trimmedContent.startsWith('<html') || trimmedContent.startsWith('<body')) {
      return res.status(400).json({ 
        error: 'The provided URL returned an HTML web page instead of a valid plain-text M3U IPTV playlist. If you linked to a file on GitHub, make sure to use the Raw URL.' 
      });
    }

    // Load settings for categorization
    let settings: SiteSettings;
    try {
      settings = await getSettings();
    } catch (dbErr: any) {
      console.warn('Failed to fetch settings from Supabase, using defaults:', dbErr.message || dbErr);
      settings = {
        siteTitle: 'IPTV Zone',
        bannerUrl: '',
        bannerTitle: '',
        bannerSubtitle: '',
        featuredGroup: '',
        fifaKeywords: 'fifa, world cup, cup, match, live',
        autoRemoveDead: true
      };
    }

    const playlistId = `pl-${Math.random().toString(36).substring(2, 9)}`;

    // Parse the M3U content
    let importedChannels: Channel[] = [];
    try {
      importedChannels = parseM3U(m3uContent, playlistId, settings);
    } catch (parseErr: any) {
      console.error('Failed to parse M3U playlist:', parseErr);
      return res.status(400).json({ 
        error: `M3U Playlist parsing failed: ${parseErr.message || 'Invalid or malformed M3U content'}` 
      });
    }

    if (importedChannels.length === 0) {
      return res.status(400).json({ 
        error: 'No valid channels were found in this M3U file. Please check that the file format is valid, starts with "#EXTM3U", and contains properly formatted stream URLs.' 
      });
    }

    const newPlaylist: Playlist = {
      id: playlistId,
      name,
      url: targetUrl,
      createdAt: new Date().toISOString(),
      channelCount: importedChannels.length
    };

    // Save Playlist to DB
    try {
      await addPlaylist(newPlaylist);
    } catch (dbErr: any) {
      console.error('Supabase save playlist failed:', dbErr);
      return res.status(500).json({ 
        error: `Database error: Failed to save the playlist record. Details: ${dbErr.message || dbErr}` 
      });
    }

    // Save Channels in batch chunks
    try {
      await batchAddChannels(importedChannels);
    } catch (dbErr: any) {
      console.error('Supabase batch add channels failed:', dbErr);
      // Attempt clean up of the created playlist record to prevent orphaned records
      try {
        await deletePlaylist(playlistId);
      } catch (_) {}
      return res.status(500).json({ 
        error: `Database error: Failed to save channels into the database. Details: ${dbErr.message || dbErr}` 
      });
    }

    // Auto-register any new categories found in the imported playlist
    try {
      registerCategoriesFromChannels(importedChannels);
    } catch (catErr: any) {
      console.error('Category auto-registration warning:', catErr);
    }

    res.json({ playlist: newPlaylist, importedCount: importedChannels.length });
  } catch (error: any) {
    console.error('Unexpected playlist import crash:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred during playlist import' });
  }
});

// Delete playlist
app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deletePlaylist(id);
    await deleteChannelsByPlaylistId(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete playlist' });
  }
});

// Channels endpoints
app.get('/api/channels', async (req, res) => {
  try {
    const channels = await getChannels();
    res.json(channels);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get channels' });
  }
});

// Add manual channel
app.post('/api/channels', async (req, res) => {
  try {
    const { name, url, logo, group, isFeatured } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Channel Name and Stream URL are required' });
    }

    const settings = await getSettings();
    const fifaKeywords = (settings?.fifaKeywords || '').split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
    const classification = autoCategorize(name, group || '', fifaKeywords);

    const finalGroup = group && group.trim() !== '' ? group.trim() : classification.group;

    const newChannel: Channel = {
      id: `ch-manual-${Math.random().toString(36).substring(2, 11)}`,
      name,
      url,
      logo: logo || 'https://images.unsplash.com/photo-1542204172-e7052809a1a1?w=150', // placeholder TV
      group: finalGroup,
      isFeatured: !!isFeatured,
      isFifa: classification.isFifa,
      score: Math.floor(Math.random() * 20) + 5,
      isDead: false,
      createdAt: new Date().toISOString()
    };

    await addChannel(newChannel);
    registerCategoriesFromChannels([newChannel]);
    res.json(newChannel);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add channel' });
  }
});

// Edit channel
app.put('/api/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const settings = await getSettings();
    const { name, group } = req.body;
    let updatedFields = { ...req.body };

    if (name || group !== undefined) {
      const activeName = name || '';
      const activeGroup = group !== undefined ? group : '';
      const fifaKeywords = (settings?.fifaKeywords || '').split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
      const classification = autoCategorize(activeName, activeGroup, fifaKeywords);
      
      updatedFields.group = activeGroup && activeGroup.trim() !== '' ? activeGroup.trim() : classification.group;
      updatedFields.isFifa = classification.isFifa;
    }

    const updated = await updateChannel(id, updatedFields);
    registerCategoriesFromChannels([updated]);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update channel' });
  }
});

// Delete channel
app.delete('/api/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteChannel(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete channel' });
  }
});

// Categories JSON persistence
const CATEGORIES_FILE = path.join(process.cwd(), 'data-categories.json');

function readCategories(): any[] {
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading categories file:', e);
  }
  return [];
}

function writeCategories(categories: any[]) {
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing categories file:', e);
  }
}

// Automatically register missing categories from a list of channels
function registerCategoriesFromChannels(channels: Channel[]) {
  try {
    const existingCategories = readCategories();
    let updated = false;

    for (const channel of channels) {
      if (channel.group && typeof channel.group === 'string' && channel.group.trim()) {
        const groupName = channel.group.trim();
        const exists = existingCategories.some(
          (c: any) => c.name.toLowerCase() === groupName.toLowerCase()
        );
        if (!exists) {
          const newCategory = {
            id: `cat-${Math.random().toString(36).substring(2, 11)}`,
            name: groupName,
            isStarred: false,
            createdAt: new Date().toISOString()
          };
          existingCategories.push(newCategory);
          updated = true;
        }
      }
    }

    if (updated) {
      writeCategories(existingCategories);
    }
  } catch (error) {
    console.error('Failed to auto-register categories:', error);
  }
}

// Categories endpoints
app.get('/api/categories', (req, res) => {
  try {
    const categories = readCategories();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get categories' });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, isStarred } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Category Name is required' });
    }
    const categories = readCategories();
    const newCategory = {
      id: `cat-${Math.random().toString(36).substring(2, 11)}`,
      name: name.trim(),
      isStarred: !!isStarred,
      createdAt: new Date().toISOString()
    };
    categories.push(newCategory);
    writeCategories(categories);
    res.json(newCategory);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create category' });
  }
});

app.put('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, isStarred } = req.body;
    const categories = readCategories();
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (name !== undefined && typeof name === 'string' && name.trim()) {
      categories[idx].name = name.trim();
    }
    if (isStarred !== undefined) {
      categories[idx].isStarred = !!isStarred;
    }
    writeCategories(categories);
    res.json(categories[idx]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const categories = readCategories();
    const filtered = categories.filter(c => c.id !== id);
    writeCategories(filtered);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete category' });
  }
});

// Deduplicate channels
app.post('/api/channels/deduplicate', async (req, res) => {
  try {
    const channels = await getChannels();
    if (channels.length === 0) {
      return res.json({ removedCount: 0 });
    }

    const groups: { [key: string]: Channel[] } = {};
    for (const c of channels) {
      const key = (c.name || '').trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(c);
    }

    const deleteIds: string[] = [];
    let removedCount = 0;

    for (const key in groups) {
      const list = groups[key];
      if (list.length > 1) {
        const aliveChannels = list.filter(c => !c.isDead);
        let chosen: Channel = aliveChannels.find(c => c.isFeatured) || aliveChannels[0] || list.find(c => c.isFeatured) || list[0];

        for (const duplicate of list) {
          if (duplicate.id !== chosen.id) {
            deleteIds.push(duplicate.id);
          }
        }
        removedCount += (list.length - 1);
      }
    }

    for (const id of deleteIds) {
      await deleteChannel(id);
    }

    res.json({ removedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to deduplicate' });
  }
});

// Stream URL tester helper
async function checkStreamUrl(url: string): Promise<boolean> {
  if (url.startsWith('https://raw.githubusercontent.com') || url.includes('wikipedia')) {
    return true;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Scan channels for dead links
app.post('/api/channels/scan', async (req, res) => {
  try {
    const settings = await getSettings();
    const channels = await getChannels();

    if (channels.length === 0) {
      return res.json({ scanned: 0, deadCount: 0, removedCount: 0 });
    }

    const batchSize = 10;
    let deadCount = 0;
    const autoRemove = settings.autoRemoveDead;
    const channelsToScan = channels.slice(0, 40);

    for (let i = 0; i < channelsToScan.length; i += batchSize) {
      const batch = channelsToScan.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (c) => {
          const isAlive = await checkStreamUrl(c.url);
          return { channel: c, isAlive };
        })
      );

      for (const result of results) {
        if (!result.isAlive) {
          deadCount++;
          if (autoRemove) {
            await deleteChannel(result.channel.id);
          } else {
            await updateChannel(result.channel.id, { isDead: true });
          }
        } else {
          await updateChannel(result.channel.id, { isDead: false });
        }
      }
    }

    res.json({
      scanned: channelsToScan.length,
      deadCount,
      removedCount: autoRemove ? deadCount : 0,
      autoRemoved: autoRemove
    });
  } catch (error: any) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message || 'Failed to scan streams' });
  }
});

// Upload endpoint for channel logos and homepage banners
app.post('/api/upload', async (req, res) => {
  try {
    const { fileData, fileName, mimeType } = req.body;
    if (!fileData || !fileName) {
      return res.status(400).json({ error: 'fileData and fileName are required' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured on the server' });
    }

    // Convert base64 data to buffer
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const cleanMimeType = mimeType || 'image/png';

    // 1. Ensure the bucket "iptv-media" exists
    try {
      await supabase.storage.createBucket('iptv-media', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
      });
    } catch (bucketErr) {
      // Bucket might already exist, ignore error
    }

    // 2. Upload to Supabase Storage
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = `uploads/${Date.now()}_${cleanFileName}`;
    const { data, error: uploadError } = await supabase.storage
      .from('iptv-media')
      .upload(filePath, buffer, {
        contentType: cleanMimeType,
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // 3. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('iptv-media')
      .getPublicUrl(filePath);

    res.json({ url: publicUrlData.publicUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file to Supabase Storage' });
  }
});

// Helper to perform robust HTTP/HTTPS requests with redirect following, SSL bypass, and timeout
interface ProxyResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  data: Buffer;
}

function robustRequest(targetUrl: string, options: { maxRedirects?: number; timeout?: number } = {}): Promise<ProxyResponse> {
  const { maxRedirects = 5, timeout = 12000 } = options;
  
  return new Promise((resolve, reject) => {
    let redirectCount = 0;
    
    function makeRequest(currentUrl: string) {
      try {
        const parsedUrl = new URL(currentUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const reqOptions: http.RequestOptions = {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive',
          },
          timeout: timeout,
        };
        
        if (isHttps) {
          reqOptions.agent = new https.Agent({ rejectUnauthorized: false });
        }
        
        const req = lib.request(currentUrl, reqOptions, (res) => {
          // Handle redirects
          if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
            if (redirectCount >= maxRedirects) {
              reject(new Error(`Too many redirects (max: ${maxRedirects})`));
              return;
            }
            redirectCount++;
            let redirectUrl = res.headers.location;
            try {
              redirectUrl = new URL(redirectUrl, currentUrl).href;
            } catch (e) {
              // Ignore invalid url resolution
            }
            makeRequest(redirectUrl);
            return;
          }
          
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode || 200,
              headers: res.headers,
              data: Buffer.concat(chunks),
            });
          });
        });
        
        req.on('error', (err) => {
          reject(err);
        });
        
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Connection timed out after ${timeout}ms`));
        });
        
        req.end();
      } catch (err) {
        reject(err);
      }
    }
    
    makeRequest(targetUrl);
  });
}

// Proxy to fetch external URLs bypassing CORS
app.get('/api/proxy-m3u', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const proxyRes = await robustRequest(url);
    if (proxyRes.statusCode >= 400) {
      return res.status(proxyRes.statusCode).json({ error: `Upstream error: ${proxyRes.statusCode}` });
    }
    res.setHeader('Content-Type', 'text/plain');
    res.send(proxyRes.data.toString('utf8'));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to proxy M3U' });
  }
});

// Proxy live stream chunks and playlists (CORS and mixed content bypass)
app.get('/api/proxy-stream', (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).send('URL is required');
  }

  let redirectCount = 0;
  const maxRedirects = 5;
  const timeout = 15000;

  function makeRequest(currentUrl: string) {
    try {
      const parsedUrl = new URL(currentUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;

      const reqOptions: http.RequestOptions = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Connection': 'keep-alive',
        },
        timeout: timeout,
      };

      if (isHttps) {
        reqOptions.agent = new https.Agent({ rejectUnauthorized: false });
      }

      const upstreamReq = lib.request(currentUrl, reqOptions, (upstreamRes) => {
        // Handle redirects
        if ([301, 302, 303, 307, 308].includes(upstreamRes.statusCode || 0) && upstreamRes.headers.location) {
          if (redirectCount >= maxRedirects) {
            return res.status(500).send('Too many redirects');
          }
          redirectCount++;
          let redirectUrl = upstreamRes.headers.location;
          try {
            redirectUrl = new URL(redirectUrl, currentUrl).href;
          } catch (e) {
            // Ignore invalid url resolution
          }
          makeRequest(redirectUrl);
          return;
        }

        const statusCode = upstreamRes.statusCode || 200;
        if (statusCode >= 400) {
          return res.status(statusCode).send(`Failed to fetch from upstream: Code ${statusCode}`);
        }

        const contentType = (upstreamRes.headers['content-type'] || '').toLowerCase();
        
        // Check if it's an M3U8/M3U playlist
        const isPlaylist = 
          contentType.includes('mpegurl') || 
          contentType.includes('application/x-mpegurl') ||
          contentType.includes('application/vnd.apple.mpegurl') ||
          currentUrl.includes('.m3u8') || 
          currentUrl.includes('.m3u');

        if (isPlaylist) {
          const chunks: Buffer[] = [];
          upstreamRes.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          
          upstreamRes.on('end', () => {
            try {
              const text = Buffer.concat(chunks).toString('utf8');
              const lines = text.split('\n');
              
              const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;
                
                // Rewrite URI attributes in tags (e.g., #EXT-X-KEY, #EXT-X-MEDIA)
                if (trimmed.startsWith('#')) {
                  return trimmed.replace(/(URI\s*=\s*["'])([^"']*)(["'])/gi, (match, p1, p2, p3) => {
                    try {
                      const absoluteUrl = new URL(p2, currentUrl).href;
                      return `${p1}/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}${p3}`;
                    } catch (e) {
                      return match;
                    }
                  });
                }
                
                // Rewrite stream segments or playlists URLs
                try {
                  const absoluteUrl = new URL(trimmed, currentUrl).href;
                  return `/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}`;
                } catch (e) {
                  return line;
                }
              });
              
              res.setHeader('Content-Type', 'application/x-mpegURL');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.send(rewrittenLines.join('\n'));
            } catch (err: any) {
              console.error('Error rewriting playlist:', err);
              if (!res.headersSent) {
                res.status(500).send(`Error processing playlist: ${err.message}`);
              }
            }
          });

          upstreamRes.on('error', (err) => {
            console.error('Upstream playlist stream error:', err);
            if (!res.headersSent) {
              res.status(500).send(`Playlist fetch error: ${err.message}`);
            }
          });
        } else {
          // It's a video segment, audio file, or direct infinite live stream. Pipe it directly!
          res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'video/mp2t');
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (upstreamRes.headers['content-length']) {
            res.setHeader('Content-Length', upstreamRes.headers['content-length']);
          }
          
          if (currentUrl.includes('.ts') || contentType.includes('video/')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
          } else {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }

          res.status(statusCode);
          upstreamRes.pipe(res);

          // Handle client disconnect gracefully to abort upstream request and avoid memory/socket leak
          req.on('close', () => {
            upstreamReq.destroy();
          });
        }
      });

      upstreamReq.on('error', (err) => {
        console.error('Proxy stream request error:', err);
        if (!res.headersSent) {
          res.status(500).send(`Stream proxy error: ${err.message}`);
        }
      });

      upstreamReq.on('timeout', () => {
        upstreamReq.destroy();
        if (!res.headersSent) {
          res.status(504).send(`Proxy stream timeout: Gateway Timeout`);
        }
      });

      upstreamReq.end();
    } catch (err: any) {
      console.error('Proxy stream handler error:', err);
      if (!res.headersSent) {
        res.status(500).send(`Stream proxy error: ${err.message}`);
      }
    }
  }

  makeRequest(url);
});

// Proxy to fetch external logos bypassing CORS
app.get('/api/proxy-logo', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required and must be a valid string' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(404).json({ error: 'Image not found on remote server' });
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.startsWith('image/')) {
      res.setHeader('Content-Type', contentType);
    } else {
      res.setHeader('Content-Type', 'image/png');
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error: any) {
    console.error('Proxy-logo error:', error);
    res.status(500).json({ error: 'Failed to proxy channel logo: ' + (error.message || 'Unknown network error') });
  }
});

// -----------------------------------------------------------------------------
// Global Exception Error Handler Middleware
// -----------------------------------------------------------------------------
// Catches any uncaught exceptions thrown during request execution and returns structured JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('CRITICAL UNCAUGHT SERVER ERROR:', err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected server-side error occurred',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// -----------------------------------------------------------------------------
// Vite Middleware & Static Serves / Run Server
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
