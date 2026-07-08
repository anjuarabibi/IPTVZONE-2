import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Channel, Playlist, SiteSettings } from './src/types';

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'data-db.json');

app.use(express.json({ limit: '50mb' }));

// Helper to initialize database with default data
function getInitialData() {
  const defaultSettings: SiteSettings = {
    siteTitle: 'IPTV Zone',
    bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
    bannerTitle: 'All live tv channel & Fifa world cup live stream 2026',
    bannerSubtitle: 'সব লাইভ টিভি চ্যানেল এক জায়গায়- খেলা, খবর, সিনেমা ও বিনোদন এখন ফ্রি স্ট্রিমিং',
    featuredGroup: 'News',
    fifaKeywords: 'fifa, world cup, cup, match, live',
    autoRemoveDead: true
  };

  // Add some sample live channels to make sure the app starts beautiful!
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

  return {
    playlists: [] as Playlist[],
    channels: defaultChannels,
    settings: defaultSettings
  };
}

// Read database
function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading database:', error);
  }
  return getInitialData();
}

// Write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing database:', error);
  }
}

// Initialize database file
if (!fs.existsSync(DB_PATH)) {
  writeDB(getInitialData());
}

// -----------------------------------------------------------------------------
// API Endpoints
// -----------------------------------------------------------------------------

// Site settings
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json(db.settings);
});

app.post('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json(db.settings);
});

// Playlists
app.get('/api/playlists', (req, res) => {
  const db = readDB();
  res.json(db.playlists || []);
});

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
  const lines = m3uContent.split('\n');
  const channels: Channel[] = [];
  const fifaKeywords = settings.fifaKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);

  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Extract tvg-logo or any other variant logo tags
      let logo = '';
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || 
                        line.match(/logo="([^"]+)"/i) || 
                        line.match(/logo-url="([^"]+)"/i) || 
                        line.match(/icon="([^"]+)"/i) ||
                        line.match(/art="([^"]+)"/i);
      if (logoMatch) {
        logo = logoMatch[1];
      }

      // Extract group-title
      let group = 'Uncategorized';
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch) {
        group = groupMatch[1];
      }

      // Extract name (last comma to end of line)
      let name = 'Unknown Channel';
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      }

      // Automatically categorize channel group and isFifa
      const classification = autoCategorize(name, group, fifaKeywords);

      currentChannel = {
        name,
        logo,
        group: classification.group,
        originalGroup: group,
        isFifa: classification.isFifa,
        isFeatured: false,
        score: Math.floor(Math.random() * 50) + 1, // Random score for visual styling
        isDead: false,
        playlistId,
        createdAt: new Date().toISOString()
      };
    } else if (line.startsWith('http') && currentChannel.name) {
      currentChannel.url = line;
      currentChannel.id = `ch-${playlistId}-${Math.random().toString(36).substring(2, 11)}`;
      channels.push(currentChannel as Channel);
      currentChannel = {};
    }
  }

  return channels;
}

// Add playlist (Fetch & Parse remote M3U)
app.post('/api/playlists', async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    // Fetch the playlist content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch M3U playlist. Status: ${response.status}`);
    }
    const m3uContent = await response.text();

    const db = readDB();
    const playlistId = `pl-${Math.random().toString(36).substring(2, 9)}`;

    // Parse the M3U
    const importedChannels = parseM3U(m3uContent, playlistId, db.settings);

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

    db.playlists = db.playlists || [];
    db.playlists.push(newPlaylist);

    // Merge new channels
    db.channels = db.channels || [];
    db.channels.push(...importedChannels);

    writeDB(db);
    res.json({ playlist: newPlaylist, importedCount: importedChannels.length });
  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message || 'Failed to import playlist' });
  }
});

// Delete playlist
app.delete('/api/playlists/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  db.playlists = (db.playlists || []).filter((p: Playlist) => p.id !== id);
  db.channels = (db.channels || []).filter((c: Channel) => c.playlistId !== id);

  writeDB(db);
  res.json({ success: true });
});

// Channels endpoints
app.get('/api/channels', (req, res) => {
  const db = readDB();
  res.json(db.channels || []);
});

// Add manual channel
app.post('/api/channels', (req, res) => {
  const { name, url, logo, group, isFeatured } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Channel Name and Stream URL are required' });
  }

  const db = readDB();
  const fifaKeywords = db.settings.fifaKeywords.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
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

  db.channels = db.channels || [];
  db.channels.push(newChannel);
  writeDB(db);

  res.json(newChannel);
});

// Edit channel
app.put('/api/channels/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const channelIndex = (db.channels || []).findIndex((c: Channel) => c.id === id);
  if (channelIndex === -1) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const { name, group } = req.body;
  let updatedFields = { ...req.body };

  if (name || group !== undefined) {
    const activeName = name || db.channels[channelIndex].name;
    const activeGroup = group !== undefined ? group : db.channels[channelIndex].group;
    const fifaKeywords = db.settings.fifaKeywords.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
    const classification = autoCategorize(activeName, activeGroup, fifaKeywords);
    
    updatedFields.group = classification.group;
    updatedFields.isFifa = classification.isFifa;
  }

  db.channels[channelIndex] = {
    ...db.channels[channelIndex],
    ...updatedFields
  };

  writeDB(db);
  res.json(db.channels[channelIndex]);
});

// Delete channel
app.delete('/api/channels/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  db.channels = (db.channels || []).filter((c: Channel) => c.id !== id);
  writeDB(db);

  res.json({ success: true });
});

// Deduplicate channels: keep working ones, delete dead/duplicate ones of the same name
app.post('/api/channels/deduplicate', (req, res) => {
  const db = readDB();
  const channels: Channel[] = db.channels || [];

  if (channels.length === 0) {
    return res.json({ removedCount: 0 });
  }

  // Group channels by name (trimmed, lowercase)
  const groups: { [key: string]: Channel[] } = {};
  for (const c of channels) {
    const key = c.name.trim().toLowerCase();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(c);
  }

  const finalChannels: Channel[] = [];
  let removedCount = 0;

  for (const key in groups) {
    const list = groups[key];
    if (list.length === 1) {
      finalChannels.push(list[0]);
    } else {
      // Find the best channel in this duplicate group
      // Prioritize: 1. NOT dead, 2. Has logo, 3. Starred, 4. Older/Newer
      const aliveChannels = list.filter(c => !c.isDead);
      
      let chosen: Channel;
      if (aliveChannels.length > 0) {
        // If there are working ones, pick the first working one (or starred one)
        const starredAlive = aliveChannels.find(c => c.isFeatured);
        chosen = starredAlive || aliveChannels[0];
      } else {
        // All are dead, just pick the first one (or starred)
        const starredDead = list.find(c => c.isFeatured);
        chosen = starredDead || list[0];
      }

      finalChannels.push(chosen);
      removedCount += (list.length - 1);
    }
  }

  db.channels = finalChannels;
  writeDB(db);

  res.json({ removedCount });
});

// Stream URL tester helper
async function checkStreamUrl(url: string): Promise<boolean> {
  if (url.startsWith('https://raw.githubusercontent.com') || url.includes('wikipedia')) {
    return true; // Ignore placeholder/samples from check
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s timeout for speed

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
    const db = readDB();
    const channels: Channel[] = db.channels || [];

    if (channels.length === 0) {
      return res.json({ scanned: 0, deadCount: 0, removedCount: 0 });
    }

    // Limit scanning to a subset of channels at once or first 50 to avoid high timeouts,
    // or let the client specify what to scan. If not specified, we scan all of them in batches of 10.
    const batchSize = 10;
    let deadCount = 0;
    const autoRemove = db.settings.autoRemoveDead;
    const updatedChannels: Channel[] = [];

    // Let's do the first 50 channels or specified list for efficiency
    const channelsToScan = channels.slice(0, 80); // scan up to 80 for speedy test
    const remainingChannels = channels.slice(80);

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
          if (!autoRemove) {
            result.channel.isDead = true;
            updatedChannels.push(result.channel);
          }
        } else {
          result.channel.isDead = false;
          updatedChannels.push(result.channel);
        }
      }
    }

    // Put remaining unscanned channels back
    const finalChannels = [...updatedChannels, ...remainingChannels];
    db.channels = finalChannels;
    writeDB(db);

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

// Proxy to fetch external URLs bypassing CORS in the browser
app.get('/api/proxy-m3u', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await fetch(url);
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

// Proxy to fetch external logos bypassing CORS and Mixed Content restrictions
app.get('/api/proxy-logo', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).send('URL is required');
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
      res.setHeader('Content-Type', 'image/png'); // fallback content type
    }

    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error) {
    res.status(500).send('Failed to fetch logo');
  }
});

// -----------------------------------------------------------------------------
// Vite Middleware & Static Serves
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
