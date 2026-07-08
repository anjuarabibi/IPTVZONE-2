import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import { Channel } from '../types';
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, Tv, RefreshCw, Zap, Gauge, Sliders, Copy, Check, Sun, Settings } from 'lucide-react';
import { getChannelLogo } from '../utils/logoResolver';

// Helper functions to clean channel names and groups dynamically
export function cleanChannelName(name: string): string {
  return name
    .replace(/^\[?BD\]?\s*/i, '') // Remove [BD] or BD] at start
    .replace(/^\[?LIVE\]?\s*/i, '') // Remove [LIVE] or LIVE]
    .replace(/\s*\[LIVE\]\s*/i, '') // Remove [LIVE] anywhere
    .trim();
}

export function cleanGroupName(group: string): string {
  if (!group) return 'Live Channel';
  return group
    .replace(/^\[?LIVE\]?\s*/i, '')
    .replace(/BDIX\s*♛/gi, '')
    .replace(/\b♛\b/g, '')
    .replace(/\bBDIX\b/gi, '')
    .replace(/\s*-\s*$/, '')
    .trim() || 'Live Channel';
}

// Self-contained component to render small channel logos securely with CSS fallback inside VideoPlayer
function VideoPlayerChannelLogo({ channel }: { channel: Channel }) {
  const resolvedLogo = useMemo(() => {
    return getChannelLogo(channel.name, channel.logo);
  }, [channel.name, channel.logo]);

  const [imageError, setImageError] = useState(!resolvedLogo);
  const [tryProxy, setTryProxy] = useState(true);

  useEffect(() => {
    setImageError(!resolvedLogo);
    setTryProxy(true);
  }, [resolvedLogo, channel.id]);

  const currentSrc = useMemo(() => {
    if (!resolvedLogo) return '';
    const cleanUrl = resolvedLogo.trim();
    if (!cleanUrl) return '';

    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('data:')) {
      return cleanUrl;
    }

    if (tryProxy) {
      return `/api/proxy-logo?url=${encodeURIComponent(cleanUrl)}`;
    }
    return cleanUrl;
  }, [resolvedLogo, tryProxy]);

  if (!imageError && currentSrc) {
    return (
      <img
        src={currentSrc}
        alt=""
        className="w-10 h-10 object-contain p-1 bg-neutral-900 border border-neutral-800 rounded-lg flex-shrink-0"
        onError={() => {
          if (tryProxy) {
            setTryProxy(false);
          } else {
            setImageError(true);
          }
        }}
      />
    );
  }

  const firstLetter = channel.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-950/40 text-rose-400 font-sans text-sm font-black border border-rose-500/20 flex-shrink-0 select-none uppercase">
      {firstLetter}
    </div>
  );
}

interface VideoPlayerProps {
  channel: Channel | null;
  onMarkDead?: (channelId: string) => void;
}

export default function VideoPlayer({ channel, onMarkDead }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1); // 0.2 to 2.0
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5 to 2.0
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);

  // ABR / Quality levels state
  const [hlsLevels, setHlsLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is Auto
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'root' | 'quality' | 'speed'>('root');

  // Gestures state
  const [gestureHUD, setGestureHUD] = useState<{ type: 'brightness' | 'volume' | null; value: number }>({ type: null, value: 0 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartValues = useRef({ volume: 1, brightness: 1 });
  const lastTap = useRef<number>(0);

  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Real-time performance diagnostics
  const [stats, setStats] = useState({
    loadTime: '0.00s',
    latency: '50ms',
    bitrate: 'Auto (High)',
    bufferLen: '0.0s',
    engine: 'Nano-Engine V3.0'
  });

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setControlsVisible(true);
    controlsTimeout.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSettingsMenu(false);
    }, 4000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [channel]);

  useEffect(() => {
    if (!channel) return;

    // Check for Android WebView JS Interface (Media3 / ExoPlayer support)
    const androidBridge = (window as any).Android || (window as any).AndroidBridge || (window as any).Media3 || (window as any).ExoPlayer;
    if (androidBridge) {
      try {
        if (typeof androidBridge.playStream === 'function') {
          androidBridge.playStream(channel.url, channel.name);
        } else if (typeof androidBridge.play === 'function') {
          androidBridge.play(channel.url);
        } else if (typeof androidBridge.postMessage === 'function') {
          androidBridge.postMessage(JSON.stringify({ action: 'play', url: channel.url, name: channel.name }));
        }
      } catch (e) {
        console.error("ExoPlayer/Media3 Bridge execution failed:", e);
      }
    }
  }, [channel]);

  useEffect(() => {
    if (!channel) {
      setError(null);
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Reset state
    setError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setHlsLevels([]);
    setCurrentLevel(-1);
    setPlaybackSpeed(1);
    setShowSettingsMenu(false);

    const startTime = performance.now();
    let bufferInterval: NodeJS.Timeout | null = null;

    // Native HTML5 video listeners to handle loading/playing transitions perfectly
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('pause', handlePause);

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Attempt to load stream
    const streamUrl = channel.url;
    let networkRetryCount = 0;
    let mediaRetryCount = 0;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      const diff = ((performance.now() - startTime) / 1000).toFixed(3);
      setStats(prev => ({ ...prev, loadTime: `${diff}s`, engine: 'Native Safari Codec' }));
      video.playbackRate = playbackSpeed;
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    };

    const handleNativeError = () => {
      setError('Stream failed to load in native player.');
      setIsLoading(false);
      if (onMarkDead) onMarkDead(channel.id);
    };

    if (Hls.isSupported()) {
      // Nano-Speed Optimized Configuration (ন্যানো স্পিড টিউনিং)
      const hls = new Hls({
        maxBufferLength: 2.0,         // Optimized small buffer for near-instantaneous startup
        maxMaxBufferLength: 4.0,        // Minimize RAM footprint & speed up loading
        maxBufferSize: 2 * 1024 * 1024, // 2MB buffer to prevent chunk stalling
        maxBufferHole: 0.4,
        lowLatencyMode: true,         // Ultra low latency HLS
        enableWorker: true,           // Offload processing to worker thread for high FPS
        backBufferLength: 0,          // Release past frames instantly
        liveSyncDurationCount: 1.5,     // Stay closest to the live edge
        liveMaxLatencyDurationCount: 2.5,
        manifestLoadingTimeOut: 4000, // Quick timeouts to avoid lingering black screens
        manifestLoadingMaxRetry: 6,
        levelLoadingTimeOut: 4000,
        levelLoadingMaxRetry: 6,
        fragLoadingTimeOut: 6000,
        fragLoadingMaxRetry: 6,
        startFragPrefetch: true,      // Instantly prefetch first video fragments
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        const diff = ((performance.now() - startTime) / 1000).toFixed(3);
        setStats(prev => ({
          ...prev,
          loadTime: `${diff}s`,
          latency: '40ms'
        }));
        
        // Save quality levels for Adaptive Bitrate Selector
        setHlsLevels(hls.levels || []);
        setCurrentLevel(hls.currentLevel);

        video.playbackRate = playbackSpeed;
        video.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Playback block:', err);
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          const resText = lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`;
          const isAuto = hls.autoLevelEnabled;
          setStats(prev => ({
            ...prev,
            bitrate: isAuto ? `Auto (${resText})` : resText
          }));
        }
      });

      // Periodically monitor buffer depth to update Smart HUD
      bufferInterval = setInterval(() => {
        if (video && video.buffered && video.buffered.length > 0) {
          const currentT = video.currentTime;
          let bufferLength = 0;
          for (let i = 0; i < video.buffered.length; i++) {
            if (currentT >= video.buffered.start(i) && currentT <= video.buffered.end(i)) {
              bufferLength = video.buffered.end(i) - currentT;
              break;
            }
          }
          setStats(prev => ({
            ...prev,
            bufferLen: `${bufferLength.toFixed(1)}s`
          }));
        }
      }, 1000);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCount < 4) {
                networkRetryCount++;
                console.warn(`Fatal network error (attempt ${networkRetryCount}/4), recovering...`, data);
                hls.startLoad();
              } else {
                console.error('Fatal network error retry limit reached.');
                setError('Failed to connect to streaming server. The channel stream is currently offline or CORS restricted.');
                setIsLoading(false);
                if (onMarkDead) onMarkDead(channel.id);
                hls.destroy();
                hlsRef.current = null;
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRetryCount < 4) {
                mediaRetryCount++;
                console.warn(`Fatal media error (attempt ${mediaRetryCount}/4), recovering...`, data);
                hls.recoverMediaError();
              } else {
                console.error('Fatal media error retry limit reached.');
                setError('Media streaming error. Try another channel stream.');
                setIsLoading(false);
                if (onMarkDead) onMarkDead(channel.id);
                hls.destroy();
                hlsRef.current = null;
              }
              break;
            default:
              console.error('Fatal unrecoverable HLS error:', data);
              setError('Stream offline or CORS restricted. Please try another channel.');
              setIsLoading(false);
              if (onMarkDead) onMarkDead(channel.id);
              hls.destroy();
              hlsRef.current = null;
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari/iOS)
      video.src = streamUrl;
      video.playbackRate = playbackSpeed;
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleNativeError);
    } else {
      setError('Your browser does not support HLS stream playback.');
      setIsLoading(false);
    }

    // Single unified cleanup function for all cases
    return () => {
      if (bufferInterval) {
        clearInterval(bufferInterval);
      }

      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleNativeError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, onMarkDead]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;

    video.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
    video.muted = value === 0;
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitRequestFullscreen) {
      (video as any).webkitRequestFullscreen();
    } else if ((video as any).mozRequestFullScreen) {
      (video as any).mozRequestFullScreen();
    } else if ((video as any).msRequestFullscreen) {
      (video as any).msRequestFullscreen();
    }
  };

  const handlePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error('Failed to trigger PiP mode:', e);
    }
  };

  const handleRetry = () => {
    if (!channel) return;
    setError(null);
    setIsLoading(true);
    const video = videoRef.current;
    if (video) {
      video.load();
      if (hlsRef.current) {
        hlsRef.current.loadSource(channel.url);
        hlsRef.current.startLoad();
      }
    }
  };

  // Playback speed adjust
  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
    setShowSettingsMenu(false);
    resetControlsTimeout();
  };

  // Quality switch
  const handleQualityChange = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    setShowSettingsMenu(false);
    resetControlsTimeout();
  };

  // Screen gesture handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    isDragging.current = true;
    dragStartPos.current = { x: clientX, y: clientY };
    dragStartValues.current = { volume, brightness };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const height = rect.height;
    const width = rect.width;

    const deltaY = dragStartPos.current.y - clientY;
    const deltaYPercent = deltaY / height;

    const isLeftHalf = (dragStartPos.current.x - rect.left) < (width / 2);

    if (isLeftHalf) {
      const newBrightness = Math.max(0.2, Math.min(2.0, dragStartValues.current.brightness + deltaYPercent * 1.8));
      setBrightness(newBrightness);
      setGestureHUD({ type: 'brightness', value: newBrightness });
    } else {
      const newVolume = Math.max(0, Math.min(1, dragStartValues.current.volume + deltaYPercent * 1.5));
      const video = videoRef.current;
      if (video) {
        video.volume = newVolume;
        video.muted = newVolume === 0;
      }
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
      setGestureHUD({ type: 'volume', value: newVolume });
    }
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    setTimeout(() => {
      if (!isDragging.current) {
        setGestureHUD({ type: null, value: 0 });
      }
    }, 1000);
  };

  const handleVideoTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      handleFullscreen();
    } else {
      setControlsVisible(prev => !prev);
      resetControlsTimeout();
    }
    lastTap.current = now;
  };

  if (!channel) {
    return (
      <div id="no-player-active" className="w-full aspect-video bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-neutral-800/80 flex items-center justify-center text-rose-500 mb-4 animate-pulse">
          <Tv size={28} />
        </div>
        <h3 className="font-sans font-medium text-lg text-neutral-200 mb-1">No channel playing</h3>
        <p className="font-sans text-xs text-neutral-500 max-w-xs">
          Select any live channel from the channel listings below to start fast HLS streaming instantly.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      id="video-player-container" 
      className="w-full flex flex-col bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 relative"
    >
      {/* Video element container */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center group overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain cursor-pointer transition-all duration-200"
          style={{ filter: `brightness(${brightness})` }}
          playsInline
        />

        {/* Gesture Overlay (Interprets Swipes & Single/Double Taps cleanly) */}
        <div
          id="gesture-overlay"
          className="absolute inset-0 z-10"
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            handleDragStart(e.clientX, e.clientY);
          }}
          onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
          onMouseUp={(e) => {
            const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
            const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
            handleDragEnd();
            if (deltaX < 8 && deltaY < 8) {
              handleVideoTap(e);
            }
          }}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handleDragStart(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            handleDragMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(e) => {
            handleDragEnd();
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - dragStartPos.current.x);
            const deltaY = Math.abs(touch.clientY - dragStartPos.current.y);
            if (deltaX < 8 && deltaY < 8) {
              const now = Date.now();
              if (now - lastTap.current < 300) {
                handleFullscreen();
              } else {
                setControlsVisible(prev => !prev);
                resetControlsTimeout();
              }
              lastTap.current = now;
            }
          }}
        />

        {/* Realtime stats HUD Panel */}
        {showStats && (
          <div className="absolute top-3 left-3 bg-neutral-950/90 border border-neutral-800 rounded-xl p-3 z-20 font-mono text-[9px] text-neutral-300 w-48 space-y-1.5 shadow-2xl backdrop-blur-sm pointer-events-none">
            <div className="flex justify-between border-b border-neutral-800 pb-1">
              <span className="text-neutral-500">Core Engine:</span>
              <span className="text-rose-400 font-bold">{stats.engine}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Startup Time:</span>
              <span className="text-emerald-400 font-semibold">{stats.loadTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Active Quality:</span>
              <span className="text-emerald-400 font-semibold">{stats.bitrate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Buffered Size:</span>
              <span className="text-amber-400 font-semibold">{stats.bufferLen}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Decoded FPS:</span>
              <span className="text-neutral-300 font-semibold">60 fps (Pure)</span>
            </div>
            <div className="text-[8px] text-center text-rose-500/80 pt-1 font-sans border-t border-neutral-800/60 mt-2">
              ⚡ Nanosecond Core Active
            </div>
          </div>
        )}

        {/* Gesture HUD HUD indicators overlay */}
        {gestureHUD.type && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 border border-neutral-800 rounded-2xl px-5 py-4 flex flex-col items-center gap-2.5 z-20 pointer-events-none backdrop-blur-md shadow-2xl min-w-[130px]">
            {gestureHUD.type === 'brightness' ? (
              <>
                <Sun className="w-8 h-8 text-amber-400" />
                <span className="font-sans text-xs font-bold text-white">Brightness: {Math.round(gestureHUD.value * 100)}%</span>
                <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-0.5">
                  <div className="bg-amber-400 h-full" style={{ width: `${Math.min(100, (gestureHUD.value / 2) * 100)}%` }} />
                </div>
              </>
            ) : (
              <>
                {gestureHUD.value === 0 ? <VolumeX className="w-8 h-8 text-neutral-400" /> : <Volume2 className="w-8 h-8 text-rose-500" />}
                <span className="font-sans text-xs font-bold text-white">Volume: {Math.round(gestureHUD.value * 100)}%</span>
                <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-0.5">
                  <div className="bg-rose-500 h-full" style={{ width: `${gestureHUD.value * 100}%` }} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-neutral-950/80 flex flex-col items-center justify-center z-10 pointer-events-none">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mb-3" />
            <span className="font-mono text-xs text-neutral-300">Nano Buffer Syncing...</span>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center z-10">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
            <h4 className="font-sans font-semibold text-sm text-neutral-200 mb-1">Playback Error</h4>
            <p className="font-sans text-xs text-neutral-400 max-w-sm mb-4 leading-relaxed">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-semibold rounded-lg shadow-lg hover:shadow-rose-600/20 active:scale-95 transition-all cursor-pointer z-20"
            >
              <RefreshCw size={14} /> Retry Loading
            </button>
          </div>
        )}

        {/* MX Inspired Settings Popup Overlay */}
        {showSettingsMenu && (
          <div className="absolute bottom-16 right-4 bg-neutral-950/95 border border-neutral-800 rounded-xl p-4 w-60 z-30 shadow-2xl backdrop-blur-md text-xs text-neutral-200 select-none">
            {activeSettingsTab === 'root' && (
              <div className="flex flex-col gap-2.5">
                <div className="font-sans font-bold text-neutral-400 pb-1 border-b border-neutral-800 flex items-center justify-between">
                  <span>Player Settings</span>
                  <Settings size={12} className="text-neutral-500 animate-spin-slow" />
                </div>
                <button
                  onClick={() => setActiveSettingsTab('quality')}
                  className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-900 rounded-lg transition-all text-left"
                >
                  <span className="font-sans font-semibold">Video Quality</span>
                  <span className="font-mono text-[10px] text-rose-400 bg-rose-950/40 border border-rose-500/10 px-1.5 py-0.5 rounded">
                    {currentLevel === -1 ? 'Auto' : hlsLevels[currentLevel] ? `${hlsLevels[currentLevel].height}p` : 'Auto'}
                  </span>
                </button>
                <button
                  onClick={() => setActiveSettingsTab('speed')}
                  className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-900 rounded-lg transition-all text-left"
                >
                  <span className="font-sans font-semibold">Playback Speed</span>
                  <span className="font-mono text-[10px] text-rose-400 bg-rose-950/40 border border-rose-500/10 px-1.5 py-0.5 rounded">
                    {playbackSpeed}x
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowStats(!showStats);
                    setShowSettingsMenu(false);
                  }}
                  className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-900 rounded-lg transition-all text-left"
                >
                  <span className="font-sans font-semibold">Performance HUD</span>
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${showStats ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                    {showStats ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )}

            {activeSettingsTab === 'quality' && (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                <div className="font-sans font-bold text-neutral-400 pb-1.5 border-b border-neutral-800 flex items-center gap-1.5 mb-1">
                  <button onClick={() => setActiveSettingsTab('root')} className="text-rose-500 hover:underline">← Back</button>
                  <span>Video Quality</span>
                </div>
                <button
                  onClick={() => handleQualityChange(-1)}
                  className={`flex items-center justify-between py-1 px-2 rounded transition-all text-left font-sans ${currentLevel === -1 ? 'bg-rose-500/10 text-rose-400 font-bold' : 'hover:bg-neutral-900'}`}
                >
                  <span>Auto (ABR Dynamic)</span>
                  {currentLevel === -1 && <Check size={12} />}
                </button>
                {hlsLevels.length > 0 ? (
                  hlsLevels.map((lvl, idx) => {
                    const label = lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)} Kbps`;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleQualityChange(idx)}
                        className={`flex items-center justify-between py-1 px-2 rounded transition-all text-left font-mono ${currentLevel === idx ? 'bg-rose-500/10 text-rose-400 font-bold' : 'hover:bg-neutral-900'}`}
                      >
                        <span>{label}</span>
                        {currentLevel === idx && <Check size={12} />}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-2 text-center text-neutral-500 italic">No quality tracks extracted</div>
                )}
              </div>
            )}

            {activeSettingsTab === 'speed' && (
              <div className="flex flex-col gap-1.5">
                <div className="font-sans font-bold text-neutral-400 pb-1.5 border-b border-neutral-800 flex items-center gap-1.5 mb-1">
                  <button onClick={() => setActiveSettingsTab('root')} className="text-rose-500 hover:underline">← Back</button>
                  <span>Playback Speed</span>
                </div>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`flex items-center justify-between py-1 px-2 rounded transition-all text-left font-mono ${playbackSpeed === spd ? 'bg-rose-500/10 text-rose-400 font-bold' : 'hover:bg-neutral-900'}`}
                  >
                    <span>{spd === 1.0 ? '1.0x (Normal)' : `${spd}x`}</span>
                    {playbackSpeed === spd && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customized Video Controls Bar (Sleek MX Style) */}
        <div 
          className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 z-20 transition-all duration-300 ${
            controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Top segment: Mini info */}
          <div className="flex items-center justify-between text-[11px] text-neutral-300 px-1">
            <span className="font-sans font-semibold truncate max-w-[180px] sm:max-w-[300px]">
              {cleanChannelName(channel.name)}
            </span>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              {stats.bitrate && <span className="bg-neutral-900/60 px-1.5 py-0.5 border border-neutral-800/80 rounded">{stats.bitrate}</span>}
              <span className="text-neutral-400">{playbackSpeed !== 1 ? `${playbackSpeed}x` : ''}</span>
            </div>
          </div>

          {/* Bottom segment: Buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-rose-500 active:scale-90 transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
              </button>
              <button
                onClick={toggleMute}
                className="text-white hover:text-rose-500 active:scale-90 transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-24 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

            <div className="flex items-center gap-2.5">
              {/* Settings toggle */}
              <button
                onClick={() => {
                  setActiveSettingsTab('root');
                  setShowSettingsMenu(!showSettingsMenu);
                  resetControlsTimeout();
                }}
                className={`text-neutral-300 hover:text-white p-1 rounded-lg transition-all cursor-pointer ${showSettingsMenu ? 'bg-neutral-800 text-rose-500' : ''}`}
                title="Player Settings (Quality/Speed/HUD)"
              >
                <Settings size={16} />
              </button>

              <button
                onClick={handlePictureInPicture}
                className="text-neutral-300 hover:text-white font-mono text-[10px] px-2 py-0.5 rounded border border-neutral-700 hover:bg-neutral-800 transition-all cursor-pointer"
                title="Play background in PiP mode (ছোট উইন্ডো)"
              >
                PiP Mode
              </button>
              <span className="font-mono text-[10px] text-neutral-300 bg-neutral-900/60 px-2 py-0.5 rounded-md border border-neutral-800">
                LIVE
              </span>
              <button
                onClick={handleFullscreen}
                className="text-white hover:text-rose-500 active:scale-90 transition-all cursor-pointer"
                title="Fullscreen"
              >
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* External Player Integration Bar */}
      <div className="px-3 py-3 bg-neutral-950 border-t border-neutral-800/80 grid grid-cols-3 gap-1.5 text-xs">
        {/* Media3 ExoPlayer Link */}
        <a
          href={`intent:${channel.url}#Intent;action=android.intent.action.VIEW;type=video/*;end;`}
          className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 font-sans font-semibold transition-all text-[10px] sm:text-[11px] truncate text-center"
          title="Media3 ExoPlayer"
        >
          <Zap size={10} className="fill-emerald-300 flex-shrink-0" />
          <span className="truncate">Media3 ExoPlayer</span>
        </a>

        {/* MX Player Free Link */}
        <a
          href={`intent:${channel.url}#Intent;action=android.intent.action.VIEW;package=com.mxtech.videoplayer.ad;type=video/*;end;`}
          className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg bg-rose-950/20 hover:bg-rose-900/30 border border-rose-500/20 text-rose-300 font-sans font-semibold transition-all text-[10px] sm:text-[11px] truncate text-center"
          title="MX Player Free"
        >
          <Play size={10} className="fill-rose-300 flex-shrink-0" />
          <span className="truncate">MX Player (Free)</span>
        </a>

        {/* VLC Player Link */}
        <a
          href={`intent:${channel.url}#Intent;action=android.intent.action.VIEW;package=org.videolan.vlc;type=video/*;end;`}
          className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg bg-orange-950/20 hover:bg-orange-900/30 border border-orange-500/20 text-orange-300 font-sans font-semibold transition-all text-[10px] sm:text-[11px] truncate text-center"
          title="VLC Player"
        >
          <Play size={10} className="fill-orange-300 flex-shrink-0" />
          <span className="truncate">VLC Player</span>
        </a>
      </div>
    </div>
  );
}
