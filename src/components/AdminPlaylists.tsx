import React, { useState } from 'react';
import { Playlist, Channel, SiteSettings } from '../types';
import { Plus, Trash2, ListVideo, AlertCircle, RefreshCw, FileCode } from 'lucide-react';

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

interface AdminPlaylistsProps {
  playlists: Playlist[];
  settings: SiteSettings;
  onAddPlaylist: (playlist: Playlist, channels: Channel[]) => void;
  onDeletePlaylist: (id: string) => void;
  isBackendAvailable: boolean;
}

export default function AdminPlaylists({
  playlists,
  settings,
  onAddPlaylist,
  onDeletePlaylist,
  isBackendAvailable,
}: AdminPlaylistsProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError('Please provide a playlist name and a valid M3U URL.');
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccess(null);
    setImportProgress('Downloading M3U playlist file...');

    try {
      // 1. Normalize and resolve URL
      let targetUrl = url.trim();
      if (targetUrl.includes('github.com') && targetUrl.includes('/blob/')) {
        targetUrl = targetUrl
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/');
      }

      // 2. Fetch the M3U content using double-shield proxy logic
      let m3uContent = '';
      let fetchSuccess = false;

      if (isBackendAvailable) {
        try {
          const response = await fetch(`/api/proxy-m3u?url=${encodeURIComponent(targetUrl)}`);
          if (response.ok) {
            m3uContent = await response.text();
            fetchSuccess = true;
          } else {
            console.warn('Backend proxy-m3u failed, trying client AllOrigins proxy...');
          }
        } catch (err) {
          console.warn('Backend proxy-m3u request failed, trying client AllOrigins proxy...', err);
        }
      }

      if (!fetchSuccess) {
        try {
          const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          const response = await fetch(corsProxyUrl);
          if (response.ok) {
            m3uContent = await response.text();
            fetchSuccess = true;
          }
        } catch (err) {
          console.error('AllOrigins fallback proxy also failed:', err);
        }
      }

      if (!fetchSuccess) {
        throw new Error('Failed to retrieve the M3U playlist. The server returned a network error or the remote host was unreachable. Please verify that the M3U URL is active.');
      }

      if (!m3uContent || !m3uContent.trim()) {
        throw new Error('The retrieved playlist content is empty. Please verify the M3U URL.');
      }

      const trimmedContent = m3uContent.trim();
      if (trimmedContent.startsWith('<!DOCTYPE') || trimmedContent.startsWith('<html') || trimmedContent.startsWith('<body')) {
        throw new Error('The URL returned an HTML page instead of a valid plain-text M3U IPTV playlist. If you linked to a file on GitHub, make sure to use the Raw URL.');
      }

      // 3. Parse the M3U content on the client side
      setImportProgress('Parsing channels...');
      const lines = m3uContent.split(/\r?\n/);
      const importedChannels: Channel[] = [];
      const playlistId = `pl-${Math.random().toString(36).substring(2, 9)}`;
      const fifaKeywords = (settings?.fifaKeywords || '').split(',').map(k => (k || '').trim().toLowerCase()).filter(Boolean);

      let currentChannel: Partial<Channel> = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
          const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || 
                            line.match(/logo="([^"]+)"/i) || 
                            line.match(/logo-url="([^"]+)"/i) || 
                            line.match(/icon="([^"]+)"/i) ||
                            line.match(/art="([^"]+)"/i) ||
                            line.match(/tvg-logo=\'([^\'\s]+)\'/i) ||
                            line.match(/logo=\'([^\'\s]+)\'/i);
          const logo = logoMatch ? logoMatch[1] : '';

          const groupMatch = line.match(/group-title="([^"]+)"/i) ||
                             line.match(/group="([^"]+)"/i) ||
                             line.match(/group-title=\'([^\'\s]+)\'/i);
          const group = groupMatch ? groupMatch[1] : 'Uncategorized';

          let chName = 'Unknown Channel';
          const commaIndex = line.lastIndexOf(',');
          if (commaIndex !== -1) {
            chName = line.substring(commaIndex + 1).trim();
          }

          const classification = autoCategorize(chName, group, fifaKeywords);

          let finalGroup = 'Other TV Channel';
          if (group && group !== 'Uncategorized' && group.trim() !== '') {
            finalGroup = group.trim();
          } else {
            finalGroup = classification.group;
          }

          currentChannel = {
            name: chName,
            logo,
            group: finalGroup,
            originalGroup: group,
            isFifa: classification.isFifa,
            isFeatured: false,
            score: Math.floor(Math.random() * 50) + 1,
            isDead: false,
            playlistId,
            createdAt: new Date().toISOString()
          };
        } else if ((line.startsWith('http') || line.startsWith('https') || line.startsWith('rtmp') || line.startsWith('rtsp')) && currentChannel.name) {
          currentChannel.url = line;
          currentChannel.id = `ch-${playlistId}-${Math.random().toString(36).substring(2, 11)}`;
          importedChannels.push(currentChannel as Channel);
          currentChannel = {};
        }
      }

      if (importedChannels.length === 0) {
        throw new Error('No valid channels found in this M3U file. Ensure the file contains properly formatted stream URLs and starts with "#EXTM3U".');
      }

      const newPlaylist: Playlist = {
        id: playlistId,
        name: name.trim(),
        url: targetUrl,
        createdAt: new Date().toISOString(),
        channelCount: importedChannels.length
      };

      // 4. Save to Database
      if (isBackendAvailable) {
        setImportProgress('Saving playlist metadata...');
        // Save Playlist Row
        const playlistResponse = await fetch('/api/playlists/lightweight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPlaylist)
        });

        if (!playlistResponse.ok) {
          const playlistErr = await playlistResponse.json().catch(() => ({}));
          throw new Error(playlistErr.error || 'Server failed to save playlist metadata.');
        }

        // Save channels in small chunks of 200 to prevent Vercel Serverless timeout
        const chunkSize = 200;
        const totalChannels = importedChannels.length;
        
        for (let i = 0; i < totalChannels; i += chunkSize) {
          const chunk = importedChannels.slice(i, i + chunkSize);
          const chunkIndex = Math.floor(i / chunkSize) + 1;
          const totalChunks = Math.ceil(totalChannels / chunkSize);
          
          setImportProgress(`Saving channels: ${i} / ${totalChannels} (Chunk ${chunkIndex} of ${totalChunks})...`);

          const chunkResponse = await fetch(`/api/playlists/${playlistId}/channels-chunk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channels: chunk })
          });

          if (!chunkResponse.ok) {
            const chunkErr = await chunkResponse.json().catch(() => ({}));
            throw new Error(chunkErr.error || `Server failed to save channel chunk ${chunkIndex}.`);
          }
        }

        onAddPlaylist(newPlaylist, []);
        setSuccess(`Successfully imported playlist "${name}" with ${totalChannels} channels to Database!`);
      } else {
        // Backend unavailable -> Save to Local Sandbox
        onAddPlaylist(newPlaylist, importedChannels);
        setSuccess(`Successfully imported playlist "${name}" (Local Client Mode) with ${importedChannels.length} channels!`);
      }

      setName('');
      setUrl('');
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'An unexpected error occurred while importing the playlist.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Import Form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
            <FileCode size={16} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-white">Add M3U Playlist</h3>
            <p className="font-sans text-[11px] text-neutral-400">
              Paste any public M3U/M3U8 playlist URL. Channels will be parsed and imported.
            </p>
          </div>
        </div>

        <form onSubmit={handleImport} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-neutral-300">Playlist Name</label>
            <input
              type="text"
              placeholder="e.g. Sports Pack or TV Channels"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-neutral-300">Playlist M3U URL</label>
            <input
              type="url"
              placeholder="https://example.com/playlist.m3u"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 font-sans text-xs">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-green-950/40 border border-green-500/30 text-green-400 font-sans text-xs">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isImporting}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 text-white font-sans text-xs font-bold rounded-xl shadow-lg hover:shadow-rose-600/10 active:scale-[0.98] transition-all cursor-pointer text-center"
          >
            {isImporting ? (
              <div className="flex flex-col items-center justify-center w-full py-0.5">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-rose-200" />
                  <span>Importing & Saving...</span>
                </div>
                {importProgress && (
                  <span className="text-[10px] text-rose-200/80 font-mono font-medium mt-0.5">{importProgress}</span>
                )}
              </div>
            ) : (
              <>
                <Plus size={14} /> Import Playlist
              </>
            )}
          </button>
        </form>
      </div>

      {/* Playlist Listings */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-neutral-800/60">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-rose-500">
            <ListVideo size={16} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-white">Imported Playlists</h3>
            <p className="font-sans text-[11px] text-neutral-400">
              List of active M3U file sources in database.
            </p>
          </div>
        </div>

        {playlists.length > 0 ? (
          <div className="flex flex-col gap-3">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/50 border border-neutral-800/80 hover:border-neutral-700/60 transition-colors"
              >
                <div className="flex flex-col gap-1 overflow-hidden pr-4">
                  <span className="font-sans font-bold text-xs text-white">{pl.name}</span>
                  <span className="font-mono text-[9px] text-neutral-500 truncate max-w-[250px] md:max-w-md">
                    {pl.url}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-neutral-400 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">
                    {pl.channelCount} ch
                  </span>
                  <button
                    onClick={() => onDeletePlaylist(pl.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-950/30 transition-all active:scale-90 cursor-pointer"
                    title="Delete Playlist & Channels"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-neutral-950/35 rounded-xl border border-neutral-800/40">
            <AlertCircle className="mx-auto text-neutral-500 mb-2" size={20} />
            <p className="font-sans text-xs text-neutral-400">No playlists loaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
