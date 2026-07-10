import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
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
  deleteChannelsByPlaylistId
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
        currentChannel.group = classification.group;
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
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    // Fetch the playlist content (CORS free server side fetch with browser UA)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch M3U playlist. Status: ${response.status}`);
    }
    const m3uContent = await response.text();

    const settings = await getSettings();
    const playlistId = `pl-${Math.random().toString(36).substring(2, 9)}`;

    // Parse the M3U
    const importedChannels = parseM3U(m3uContent, playlistId, settings);

    if (importedChannels.length === 0) {
      return res.status(400).json({ error: 'No valid channels found in this M3U file.' });
    }

    const newPlaylist: Playlist = {
      id: playlistId,
      name,
      url,
      createdAt: new Date().toISOString(),
      channelCount: importedChannels.length
    };

    await addPlaylist(newPlaylist);
    await batchAddChannels(importedChannels);

    res.json({ playlist: newPlaylist, importedCount: importedChannels.length });
  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message || 'Failed to import playlist' });
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

    const newChannel: Channel = {
      id: `ch-manual-${Math.random().toString(36).substring(2, 11)}`,
      name,
      url,
      logo: logo || 'https://images.unsplash.com/photo-1542204172-e7052809a1a1?w=150', // placeholder TV
      group: classification.group,
      isFeatured: !!isFeatured,
      isFifa: classification.isFifa,
      score: Math.floor(Math.random() * 20) + 5,
      isDead: false,
      createdAt: new Date().toISOString()
    };

    await addChannel(newChannel);
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
      
      updatedFields.group = classification.group;
      updatedFields.isFifa = classification.isFifa;
    }

    const updated = await updateChannel(id, updatedFields);
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

// Proxy to fetch external URLs bypassing CORS
app.get('/api/proxy-m3u', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch M3U' });
    }
    const text = await response.text();
    res.setHeader('Content-Type', 'text/plain');
    res.send(text);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to proxy' });
  }
});

// Proxy to fetch external logos bypassing CORS
app.get('/api/proxy-logo', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).send('URL is required');
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
      return res.status(404).send('Image not found');
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
  } catch (error) {
    res.status(500).send('Failed to fetch logo');
  }
});

// -----------------------------------------------------------------------------
// Vite Middleware & Static Serves / Run Server
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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

  // Only start listening if we are running standalone and NOT as a Vercel serverless function
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
