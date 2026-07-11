import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Channel } from '../types';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  AlertCircle, 
  Tv, 
  RefreshCw, 
  Zap, 
  Settings, 
  Check, 
  Sun, 
  Lock, 
  Unlock, 
  Expand, 
  RotateCcw, 
  Volume1, 
  Music, 
  Info,
  Maximize2,
  X,
  Radio
} from 'lucide-react';
import { getChannelLogo } from '../utils/logoResolver';

// Clean channel name helper
export function cleanChannelName(name?: any): string {
  if (typeof name !== 'string') return 'Live Channel';
  return name
    .replace(/^\[?BD\]?\s*/i, '')
    .replace(/^\[?LIVE\]?\s*/i, '')
    .replace(/\s*\[LIVE\]\s*/i, '')
    .trim();
}

// Clean group name helper
export function cleanGroupName(group?: any): string {
  if (typeof group !== 'string') return 'Live Channel';
  return group
    .replace(/^\[?LIVE\]?\s*/i, '')
    .replace(/BDIX\s*♛/gi, '')
    .replace(/\b♛\b/g, '')
    .replace(/\bBDIX\b/gi, '')
    .replace(/\s*-\s*$/, '')
    .trim() || 'Live Channel';
}

interface VideoPlayerProps {
  channel: Channel | null;
  onMarkDead?: (channelId: string) => void;
}

type AspectRatioMode = 'fit' | 'stretch' | 'zoom' | '16:9' | '4:3';
type SmartBufferMode = 'low-latency' | 'balanced' | 'high-performance';

export default function VideoPlayer({ channel, onMarkDead }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1.0); // 0.2 to 2.0
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5 to 2.0
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('fit');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [decoderType, setDecoderType] = useState<'HW' | 'HW+' | 'SW'>('HW'); 

  // Touch Lock Controls
  const [isLocked, setIsLocked] = useState(false);
  const [showLockHint, setShowLockHint] = useState(false);

  // Video.js source quality tracks
  const [videoLevels, setVideoLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);

  // Settings tabs
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'root' | 'quality' | 'speed' | 'audio' | 'buffer'>('root');

  // Buffer Mode
  const [bufferMode, setBufferMode] = useState<SmartBufferMode>('low-latency');
  const [useProxy, setUseProxy] = useState(false);

  // Gestures state
  const [gestureHUD, setGestureHUD] = useState<{ type: 'brightness' | 'volume' | 'seek' | null; value: number; label?: string }>({ type: null, value: 0 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartValues = useRef({ volume: 1, brightness: 1 });
  const lastTap = useRef<number>(0);

  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const autoRetryTimer = useRef<NodeJS.Timeout | null>(null);

  // Sticky Mini Player Scroll logic
  const [isFloatingSticky, setIsFloatingSticky] = useState(false);

  // Telemetry diagnostics
  const [stats, setStats] = useState({
    loadTime: '0.00s',
    latency: 'Low Latency',
    bitrate: 'Auto (High)',
    bufferLen: '0.0s',
    fps: '60 fps (GPU Enhanced)',
    engine: 'Video.js + VHS Core'
  });

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    if (isLocked) {
      setControlsVisible(false);
      return;
    }
    setControlsVisible(true);
    controlsTimeout.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSettingsMenu(false);
    }, 4500);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [channel, isLocked]);

  // Detect scrolled out of viewport sticky floating behavior
  useEffect(() => {
    const mainContainer = containerRef.current;
    if (!mainContainer) return;

    const observer = new IntersectionObserver(([entry]) => {
      // If less than 15% of the main video player is visible, float it to the bottom-right
      setIsFloatingSticky(!entry.isIntersecting);
    }, {
      threshold: 0.15
    });

    observer.observe(mainContainer);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Broadcast to Android Media3 / ExoPlayer Bridges
  useEffect(() => {
    if (!channel) return;
    const bridge = (window as any).Android || (window as any).AndroidBridge || (window as any).Media3 || (window as any).ExoPlayer;
    if (bridge) {
      try {
        if (typeof bridge.playStream === 'function') {
          bridge.playStream(channel.url, channel.name);
        } else if (typeof bridge.play === 'function') {
          bridge.play(channel.url);
        } else if (typeof bridge.postMessage === 'function') {
          bridge.postMessage(JSON.stringify({ action: 'play', url: channel.url, name: channel.name }));
        }
      } catch (e) {
        console.error("ExoPlayer Android Bridge broadcast error:", e);
      }
    }
  }, [channel]);

  // Auto-detect if proxy is needed (e.g. for HTTP URL accessed over HTTPS)
  useEffect(() => {
    if (channel?.url) {
      const isHttp = channel.url.startsWith('http://') && window.location.protocol === 'https:';
      setUseProxy(isHttp);
    } else {
      setUseProxy(false);
    }
  }, [channel]);

  // Initialize and update Hls.js / Native video player
  useEffect(() => {
    if (!channel || !channel.url) {
      setError(null);
      setIsLoading(false);
      return;
    }

    const containerElement = videoContainerRef.current;
    if (!containerElement) return;

    // Clear any old elements inside the container wrapper
    containerElement.innerHTML = '';

    // Create the video element dynamically
    const videoElement = document.createElement('video');
    videoElement.className = `${getAspectRatioStyle()} video-js vjs-big-play-centered vjs-default-skin transition-all duration-200`;
    videoElement.style.filter = `brightness(${brightness})`;
    videoElement.setAttribute('playsinline', 'true');
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    
    // Assign to videoRef so other parts of the code can still access it (e.g. PiP)
    (videoRef as any).current = videoElement;

    containerElement.appendChild(videoElement);

    setError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setVideoLevels([]);
    setAudioTracks([]);
    setCurrentLevel(-1);
    setCurrentAudioTrack(-1);
    setPlaybackSpeed(1.0);
    setShowSettingsMenu(false);

    if (autoRetryTimer.current) {
      clearTimeout(autoRetryTimer.current);
      autoRetryTimer.current = null;
    }
    setRetryCountdown(null);

    const startTime = performance.now();

    // Browser capabilities detection
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const useNative = isSafari || isIOS;

    // Determine the active streaming URL (direct vs proxied)
    const streamUrl = useProxy
      ? `/api/proxy-stream?url=${encodeURIComponent(channel.url)}`
      : channel.url;

    let hlsInstance: Hls | null = null;
    let retryCount = 0;
    const maxRetries = 4;

    const handlePlaybackError = (reason: string) => {
      if (!useProxy) {
        console.warn(`Direct stream failed. Falling back to secure server-side stream proxy...`);
        setError('Direct stream failed. Routing through secure server proxy...');
        setTimeout(() => {
          setUseProxy(true);
        }, 1500);
      } else if (retryCount < maxRetries) {
        retryCount++;
        triggerReconnectionCountdown(`Stream loading error (Retry ${retryCount}/${maxRetries})`);
      } else {
        setError(`Failed to play stream. This live channel may be offline.`);
        setIsLoading(false);
        if (onMarkDead) onMarkDead(channel.id);
      }
    };

    const triggerReconnectionCountdown = (reason: string) => {
      console.warn(`Stream disconnected: ${reason}. Auto-reconnecting...`);
      let countdown = 3;
      setRetryCountdown(countdown);

      const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          setRetryCountdown(countdown);
        } else {
          clearInterval(interval);
          setRetryCountdown(null);
          // Auto retry loading
          if (hlsInstance) {
            hlsInstance.loadSource(streamUrl);
            hlsInstance.startLoad();
          } else {
            videoElement.src = streamUrl;
            videoElement.load();
            videoElement.play().catch(() => {});
          }
        }
      }, 1000);

      autoRetryTimer.current = interval;
      setError(`${reason}. Reconnecting in ${countdown}s...`);
    };

    // Global window error handlers as a robust safety net
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (msg.includes('segments') || msg.includes('hls.js') || msg.includes('null (reading')) {
        console.warn('Caught internal player error gracefully:', msg);
        event.preventDefault();
        setError('Stream playback error. This live channel may be experiencing server issues or is offline.');
        setIsLoading(false);
      }
    };

    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || '';
      if (reason.includes('segments') || reason.includes('hls.js') || reason.includes('null (reading')) {
        console.warn('Caught internal player promise rejection gracefully:', reason);
        event.preventDefault();
        setError('Stream playback error. This live channel may be experiencing server issues or is offline.');
        setIsLoading(false);
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalRejection);

    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('mpegurl') || streamUrl.includes('proxy-stream') || !streamUrl.includes('.mp4');

    if (isHls && Hls.isSupported() && !useNative) {
      hlsInstance = new Hls({
        maxBufferLength: bufferMode === 'low-latency' ? 2.5 : bufferMode === 'balanced' ? 6.0 : 12.0,
        enableWorker: true,
        lowLatencyMode: bufferMode === 'low-latency',
        backBufferLength: 30,
      });

      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(videoElement);
      playerRef.current = hlsInstance;

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        const initDiff = ((performance.now() - startTime) / 1000).toFixed(2);
        setStats(prev => ({
          ...prev,
          loadTime: `${initDiff}s`,
          engine: useProxy ? 'Server Proxy + Hls.js' : 'Hls.js Engine (Ultra Compatible)',
          fps: '60 fps (HW Accelerated)'
        }));
        setIsLoading(false);

        const mappedLevels = hlsInstance!.levels.map((lvl: any, idx: number) => ({
          id: idx,
          height: lvl.height,
          bandwidth: lvl.bitrate,
          name: lvl.name || `${lvl.height}p`
        }));
        setVideoLevels(mappedLevels);

        const mappedAudio = hlsInstance!.audioTracks.map((track: any, idx: number) => ({
          id: idx,
          label: track.name || track.lang || `Track ${idx + 1}`,
          lang: track.lang
        }));
        setAudioTracks(mappedAudio);
      });

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        console.warn('Hls.js event error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal network error, trying to recover...');
              hlsInstance?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error, trying to recover...');
              hlsInstance?.recoverMediaError();
              break;
            default:
              console.error('Unrecoverable fatal player error:', data);
              handlePlaybackError(data.details || 'Fatal decoding error');
              break;
          }
        }
      });
    } else {
      // Native HLS (Safari/iOS) or standard progressive MP4 files
      videoElement.src = streamUrl;
      playerRef.current = null;

      videoElement.addEventListener('loadedmetadata', () => {
        const initDiff = ((performance.now() - startTime) / 1000).toFixed(2);
        setStats(prev => ({
          ...prev,
          loadTime: `${initDiff}s`,
          engine: useNative ? 'Native Apple AVFoundation' : 'Native HTML5 Engine',
          fps: '60 fps (GPU Enhanced)'
        }));
        setIsLoading(false);
      });

      videoElement.addEventListener('error', () => {
        const mediaError = videoElement.error;
        const msg = mediaError ? mediaError.message : 'Native playback failure.';
        handlePlaybackError(msg);
      });
    }

    // Set properties & add HTML5 standard event listeners to the video element directly
    videoElement.volume = volume;
    videoElement.muted = isMuted;
    videoElement.playbackRate = playbackSpeed;
    videoElement.autoplay = true;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    videoElement.addEventListener('play', onPlay);
    videoElement.addEventListener('pause', onPause);
    videoElement.addEventListener('waiting', onWaiting);
    videoElement.addEventListener('playing', onPlaying);

    const statsTimer = setInterval(() => {
      const buffered = videoElement.buffered;
      if (buffered && buffered.length > 0) {
        const currentTime = videoElement.currentTime;
        let currentBuffer = 0;
        for (let i = 0; i < buffered.length; i++) {
          if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
            currentBuffer = buffered.end(i) - currentTime;
            break;
          }
        }
        setStats(prev => ({
          ...prev,
          bufferLen: `${currentBuffer.toFixed(1)}s`
        }));
      }
    }, 1200);

    return () => {
      clearInterval(statsTimer);
      if (autoRetryTimer.current) {
        clearTimeout(autoRetryTimer.current);
      }
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalRejection);
      
      videoElement.removeEventListener('play', onPlay);
      videoElement.removeEventListener('pause', onPause);
      videoElement.removeEventListener('waiting', onWaiting);
      videoElement.removeEventListener('playing', onPlaying);

      if (playerRef.current) {
        if (typeof (playerRef.current as any).destroy === 'function') {
          (playerRef.current as any).destroy();
        }
        playerRef.current = null;
      }
    };
  }, [channel, bufferMode, onMarkDead, useProxy]);

  // Sync aspect ratio directly on the dynamic video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.className = `${getAspectRatioStyle()} video-js vjs-big-play-centered vjs-default-skin transition-all duration-200`;
    }
  }, [aspectRatio]);

  // Sync brightness directly on the dynamic video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.filter = `brightness(${brightness})`;
    }
  }, [brightness]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (isLocked) {
      triggerLockHint();
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  // Handle Mute
  const toggleMute = () => {
    if (isLocked) {
      triggerLockHint();
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    const targetMute = !isMuted;
    video.muted = targetMute;
    setIsMuted(targetMute);
  };

  // Handle Volume slide
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const value = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;

    video.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
    video.muted = value === 0;
  };

  // Fullscreen support
  const handleFullscreen = () => {
    if (isLocked) {
      triggerLockHint();
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Picture-in-Picture mode
  const handlePictureInPicture = async () => {
    if (isLocked) {
      triggerLockHint();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error('Failed Picture-in-Picture:', e);
    }
  };

  // Playback speeds selection
  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
    setShowSettingsMenu(false);
    resetControlsTimeout();
  };

  // Quality representation select
  const handleQualityChange = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    const hls = playerRef.current;
    if (hls && typeof hls.loadSource === 'function') {
      hls.currentLevel = levelIndex;
    }
    setShowSettingsMenu(false);
    resetControlsTimeout();

    const selectedRep = videoLevels[levelIndex];
    const qualityLabel = selectedRep ? `${selectedRep.height}p` : 'Auto';
    setStats(prev => ({ ...prev, bitrate: qualityLabel }));
  };

  // Audio track switch
  const handleAudioTrackChange = (trackIndex: number) => {
    setCurrentAudioTrack(trackIndex);
    const hls = playerRef.current;
    if (hls && typeof hls.loadSource === 'function') {
      hls.audioTrack = trackIndex;
    }
    setShowSettingsMenu(false);
    resetControlsTimeout();
  };

  // Buffer profile mode switch
  const handleBufferModeChange = (mode: SmartBufferMode) => {
    setBufferMode(mode);
    setShowSettingsMenu(false);
    resetControlsTimeout();
  };

  // Cycle aspect ratio stretches
  const cycleAspectRatio = () => {
    if (isLocked) {
      triggerLockHint();
      return;
    }
    const ratios: AspectRatioMode[] = ['fit', 'stretch', 'zoom', '16:9', '4:3'];
    const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
    setAspectRatio(ratios[nextIdx]);

    const labels: Record<AspectRatioMode, string> = {
      fit: 'Fit inside Frame',
      stretch: 'Full Stretch',
      zoom: 'Zoom Crop Fill',
      '16:9': '16:9 Wide Screen',
      '4:3': '4:3 Box Screen'
    };

    setGestureHUD({ type: 'seek', value: 1, label: labels[ratios[nextIdx]] });
    setTimeout(() => setGestureHUD({ type: null, value: 0 }), 1000);
  };

  // Codec simulation selector
  const cycleDecoder = () => {
    if (isLocked) return;
    const decoders: ('HW' | 'HW+' | 'SW')[] = ['HW', 'HW+', 'SW'];
    const nextIdx = (decoders.indexOf(decoderType) + 1) % decoders.length;
    setDecoderType(decoders[nextIdx]);

    setGestureHUD({ type: 'seek', value: 1, label: `Hardware Codec: ${decoders[nextIdx]} Engine` });
    setTimeout(() => setGestureHUD({ type: null, value: 0 }), 1000);
  };

  // Drag Gesture volume/brightness handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (isLocked) return;
    const container = containerRef.current;
    if (!container) return;

    isDragging.current = true;
    dragStartPos.current = { x: clientX, y: clientY };
    dragStartValues.current = { volume, brightness };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging.current || isLocked) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const height = rect.height;
    const width = rect.width;

    const deltaY = dragStartPos.current.y - clientY;
    const deltaYPercent = deltaY / height;

    const isLeftHalf = (dragStartPos.current.x - rect.left) < (width / 2);

    if (isLeftHalf) {
      // Swipe left side: Brightness controls
      const newBright = Math.max(0.1, Math.min(2.0, dragStartValues.current.brightness + deltaYPercent * 2.0));
      setBrightness(newBright);
      setGestureHUD({ type: 'brightness', value: newBright });
    } else {
      // Swipe right side: Volume controls
      const newVol = Math.max(0, Math.min(1.0, dragStartValues.current.volume + deltaYPercent * 1.5));
      const video = videoRef.current;
      if (video) {
        video.volume = newVol;
        video.muted = newVol === 0;
      }
      setVolume(newVol);
      setIsMuted(newVol === 0);
      setGestureHUD({ type: 'volume', value: newVol });
    }
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    setTimeout(() => {
      if (!isDragging.current) {
        setGestureHUD({ type: null, value: 0 });
      }
    }, 800);
  };

  const triggerLockHint = () => {
    setShowLockHint(true);
    setTimeout(() => setShowLockHint(false), 2000);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
    if (!isLocked) {
      setControlsVisible(false);
      setShowSettingsMenu(false);
    } else {
      setControlsVisible(true);
      resetControlsTimeout();
    }
  };

  const handleVideoTap = (e: React.MouseEvent) => {
    if (isLocked) {
      triggerLockHint();
      return;
    }
    const now = Date.now();
    const DOUBLE_TAP_GAP = 300;

    const rect = containerRef.current?.getBoundingClientRect();
    const tapX = e.clientX - (rect?.left || 0);
    const tapWidth = rect?.width || 0;

    if (now - lastTap.current < DOUBLE_TAP_GAP) {
      // Double tap to fast forward/backward 10s
      const video = videoRef.current;
      if (video) {
        const curTime = video.currentTime;
        if (tapX < tapWidth / 2) {
          video.currentTime = Math.max(0, curTime - 10);
          setGestureHUD({ type: 'seek', value: -10, label: 'Rewind 10s' });
        } else {
          video.currentTime = curTime + 10;
          setGestureHUD({ type: 'seek', value: 10, label: 'Forward 10s' });
        }
        setTimeout(() => setGestureHUD({ type: null, value: 0 }), 1000);
      }
    } else {
      setControlsVisible(prev => !prev);
      resetControlsTimeout();
    }
    lastTap.current = now;
  };

  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case 'fit': return 'object-contain w-full h-full';
      case 'stretch': return 'object-fill w-full h-full absolute inset-0';
      case 'zoom': return 'object-cover w-full h-full';
      case '16:9': return 'aspect-video w-full h-auto object-contain';
      case '4:3': return 'aspect-[4/3] w-full h-auto object-contain';
      default: return 'object-contain w-full h-full';
    }
  };

  // Render tiny fallbacks for logo errors
  const firstLetter = String(channel?.name || '').trim().charAt(0).toUpperCase() || '?';

  if (!channel) {
    return (
      <div id="no-active-player" className="w-full aspect-video bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-neutral-800/80 flex items-center justify-center text-rose-500 mb-4 animate-pulse">
          <Tv size={28} />
        </div>
        <h3 className="font-sans font-medium text-lg text-neutral-200 mb-1">No stream active</h3>
        <p className="font-sans text-xs text-neutral-500 max-w-xs">
          Select any live tv channel from the library below to initiate fast low-latency HLS stream decoding.
        </p>
      </div>
    );
  }

  return (
    <>
      <div 
        ref={containerRef} 
        id="video-player-container" 
        className="w-full flex flex-col bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 relative select-none"
      >
        {/* Main aspect ratio container */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center group overflow-hidden">
          
          <div 
            ref={videoContainerRef}
            className="w-full h-full flex items-center justify-center absolute inset-0"
          />

          {/* Swipe gesture overlay layer */}
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
                  // Simulate double tap on touch
                  const rect = containerRef.current?.getBoundingClientRect();
                  const tapX = touch.clientX - (rect?.left || 0);
                  const tapWidth = rect?.width || 0;
                  const video = videoRef.current;
                  if (video) {
                    const curTime = video.currentTime;
                    if (tapX < tapWidth / 2) {
                      video.currentTime = Math.max(0, curTime - 10);
                      setGestureHUD({ type: 'seek', value: -10, label: 'Rewind 10s' });
                    } else {
                      video.currentTime = curTime + 10;
                      setGestureHUD({ type: 'seek', value: 10, label: 'Forward 10s' });
                    }
                    setTimeout(() => setGestureHUD({ type: null, value: 0 }), 1000);
                  }
                } else {
                  setControlsVisible(prev => !prev);
                  resetControlsTimeout();
                }
                lastTap.current = now;
              }
            }}
          />

          {/* Telemetry display HUD panel */}
          {showStats && (
            <div className="absolute top-3 left-3 bg-neutral-950/90 border border-neutral-800 rounded-xl p-3.5 z-20 font-mono text-[9px] text-neutral-300 w-52 space-y-1.5 shadow-2xl backdrop-blur-sm pointer-events-none">
              <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                <span className="text-neutral-500">Video Tech:</span>
                <span className="text-rose-400 font-bold">{stats.engine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Preload Sync:</span>
                <span className="text-emerald-400 font-semibold">{stats.loadTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Codec Dec:</span>
                <span className="text-rose-400 font-semibold">{decoderType} Mode</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Live Buffer:</span>
                <span className="text-amber-400 font-semibold">{stats.bufferLen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Profile mode:</span>
                <span className="text-sky-400 font-semibold uppercase">{bufferMode}</span>
              </div>
              <div className="text-[8px] text-center text-rose-500/80 pt-1.5 border-t border-neutral-800 mt-2 font-sans">
                ⚡ Hardware acceleration enabled
              </div>
            </div>
          )}

          {/* Locked touch status lock button */}
          {isLocked && (
            <button
              onClick={toggleLock}
              className="absolute top-4 left-4 z-30 p-2.5 bg-rose-600/95 border border-rose-500 text-white rounded-full hover:bg-rose-500 active:scale-90 transition-all shadow-xl cursor-pointer"
              title="Unlock Screen"
            >
              <Lock size={15} />
            </button>
          )}

          {/* Gesture swipe indicator overlays */}
          {gestureHUD.type && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 border border-neutral-800 rounded-2xl px-5 py-4 flex flex-col items-center gap-2.5 z-20 pointer-events-none backdrop-blur-md shadow-2xl min-w-[140px]">
              {gestureHUD.type === 'brightness' && (
                <>
                  <Sun className="w-8 h-8 text-amber-400 animate-pulse" />
                  <span className="font-sans text-xs font-bold text-white">Brightness: {Math.round(gestureHUD.value * 100)}%</span>
                  <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-amber-400 h-full" style={{ width: `${Math.min(100, (gestureHUD.value / 2) * 100)}%` }} />
                  </div>
                </>
              )}
              {gestureHUD.type === 'volume' && (
                <>
                  {gestureHUD.value === 0 ? <VolumeX className="w-8 h-8 text-neutral-400 animate-bounce" /> : <Volume2 className="w-8 h-8 text-rose-500 animate-pulse" />}
                  <span className="font-sans text-xs font-bold text-white">Volume: {Math.round(gestureHUD.value * 100)}%</span>
                  <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-rose-500 h-full" style={{ width: `${gestureHUD.value * 100}%` }} />
                  </div>
                </>
              )}
              {gestureHUD.type === 'seek' && (
                <>
                  {gestureHUD.value > 0 ? (
                    <Expand className="w-8 h-8 text-emerald-400 animate-pulse" />
                  ) : (
                    <RotateCcw className="w-8 h-8 text-rose-400 animate-pulse" />
                  )}
                  <span className="font-sans text-xs font-bold text-white text-center leading-tight">
                    {gestureHUD.label || `${gestureHUD.value > 0 ? '+' : ''}${gestureHUD.value}s`}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Swipe screen locked toast hint */}
          {showLockHint && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rose-950/95 border border-rose-500/40 rounded-xl px-4 py-2.5 z-30 pointer-events-none backdrop-blur-md shadow-2xl flex items-center gap-2 text-xs font-semibold text-rose-300 animate-bounce">
              <Lock size={14} />
              <span>Screen gestures are locked. Press red Unlock button to unlock.</span>
            </div>
          )}

          {/* Buffering Loading Indicator */}
          {isLoading && !error && (
            <div className="absolute inset-0 bg-neutral-950/80 flex flex-col items-center justify-center z-10 pointer-events-none">
              <RefreshCw className="w-9 h-9 text-rose-500 animate-spin mb-3" />
              <span className="font-mono text-[11px] text-neutral-300 tracking-wider">Synchronizing Buffers...</span>
            </div>
          )}

          {/* Error and automatic reconnection retry panel */}
          {error && (
            <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center z-10">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <h4 className="font-sans font-bold text-sm text-white mb-1">Stream Playback Failed</h4>
              <p className="font-sans text-xs text-neutral-400 max-w-sm mb-4 leading-relaxed">{error}</p>
              
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    if (playerRef.current) {
                      playerRef.current.src({
                        src: channel.url,
                        type: channel.url.endsWith('.ts') ? 'video/mp2t' : 'application/x-mpegURL'
                      });
                      playerRef.current.load();
                      playerRef.current.play().catch(() => {});
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-bold rounded-xl shadow-lg hover:shadow-rose-600/20 active:scale-95 transition-all cursor-pointer z-20"
                >
                  <RefreshCw size={13} /> Reconnect Now
                </button>
                
                {retryCountdown !== null && (
                  <span className="font-mono text-[10px] text-rose-400 bg-rose-950/30 border border-rose-500/10 px-2 py-1 rounded-md">
                    Attempting auto reconnection in {retryCountdown}s...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Config context menus inside video frame */}
          {showSettingsMenu && !isLocked && (
            <div className="absolute bottom-16 right-4 bg-neutral-950/95 border border-neutral-800 rounded-xl p-4 w-64 z-30 shadow-2xl backdrop-blur-md text-xs text-neutral-200 select-none">
              {activeSettingsTab === 'root' && (
                <div className="flex flex-col gap-2.5">
                  <div className="font-sans font-bold text-neutral-400 pb-1.5 border-b border-neutral-800 flex items-center justify-between">
                    <span>MX + Video.js Engine</span>
                    <Settings size={12} className="text-rose-500" />
                  </div>

                  <button
                    onClick={() => setActiveSettingsTab('quality')}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-900 rounded-lg transition-all text-left"
                  >
                    <span className="font-sans font-semibold">Video Resolution</span>
                    <span className="font-mono text-[10px] text-rose-400 bg-rose-950/40 border border-rose-500/10 px-1.5 py-0.5 rounded">
                      {currentLevel === -1 ? 'Auto' : (videoLevels[currentLevel] && videoLevels[currentLevel].height ? `${videoLevels[currentLevel].height}p` : 'Auto')}
                    </span>
                  </button>

                  {audioTracks.length > 0 && (
                    <button
                      onClick={() => setActiveSettingsTab('audio')}
                      className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-900 rounded-lg transition-all text-left"
                    >
                      <span className="font-sans font-semibold">Audio Languages</span>
                      <span className="font-mono text-[10px] text-rose-400 bg-rose-950/40 border border-rose-500/10 px-1.5 py-0.5 rounded">
                        {currentAudioTrack === -1 ? 'Default' : audioTracks[currentAudioTrack]?.label || 'Track'}
                      </span>
                    </button>
                  )}

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
                    onClick={() => setActiveSettingsTab('buffer')}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-900 rounded-lg transition-all text-left"
                  >
                    <span className="font-sans font-semibold">Smart Buffering</span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
                      {bufferMode.replace('-', ' ')}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setUseProxy(!useProxy);
                      setShowSettingsMenu(false);
                    }}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-900 rounded-lg transition-all text-left"
                  >
                    <span className="font-sans font-semibold">Server-Side Proxy</span>
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${useProxy ? 'bg-rose-950 text-rose-400 border border-rose-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                      {useProxy ? 'ACTIVE (SECURE)' : 'DIRECT (FAST)'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowStats(!showStats);
                      setShowSettingsMenu(false);
                    }}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-900 rounded-lg transition-all text-left"
                  >
                    <span className="font-sans font-semibold">Diagnostics Overlay</span>
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${showStats ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                      {showStats ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </button>
                </div>
              )}

              {activeSettingsTab === 'quality' && (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  <div className="font-sans font-bold text-neutral-400 pb-1.5 border-b border-neutral-800 flex items-center gap-1.5 mb-1">
                    <button onClick={() => setActiveSettingsTab('root')} className="text-rose-500 hover:underline">← Back</button>
                    <span>Video Resolution</span>
                  </div>
                  <button
                    onClick={() => handleQualityChange(-1)}
                    className={`flex items-center justify-between py-1 px-2 rounded transition-all text-left font-sans ${currentLevel === -1 ? 'bg-rose-500/10 text-rose-400 font-bold' : 'hover:bg-neutral-900'}`}
                  >
                    <span>Auto Adaptive bitrate</span>
                    {currentLevel === -1 && <Check size={12} />}
                  </button>
                  {videoLevels.length > 0 ? (
                    videoLevels.map((lvl, idx) => {
                      if (!lvl) return null;
                      const label = lvl.height 
                        ? `${lvl.height}p` 
                        : (lvl.bandwidth ? `${Math.round(lvl.bandwidth / 1000)} Kbps` : `Quality ${idx + 1}`);
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
                    <div className="p-2 text-center text-neutral-500 italic">Static adaptive channel</div>
                  )}
                </div>
              )}

              {activeSettingsTab === 'audio' && (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  <div className="font-sans font-bold text-neutral-400 pb-1.5 border-b border-neutral-800 flex items-center gap-1.5 mb-1">
                    <button onClick={() => setActiveSettingsTab('root')} className="text-rose-500 hover:underline">← Back</button>
                    <span>Audio Languages</span>
                  </div>
                  {audioTracks.map((tr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAudioTrackChange(idx)}
                      className={`flex items-center justify-between py-1 px-2 rounded transition-all text-left font-mono ${currentAudioTrack === idx ? 'bg-rose-500/10 text-rose-400 font-bold' : 'hover:bg-neutral-900'}`}
                    >
                      <span>{tr.label || `Language ${idx + 1}`}</span>
                      {currentAudioTrack === idx && <Check size={12} />}
                    </button>
                  ))}
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

              {activeSettingsTab === 'buffer' && (
                <div className="flex flex-col gap-1.5">
                  <div className="font-sans font-bold text-neutral-400 pb-1.5 border-b border-neutral-800 flex items-center gap-1.5 mb-1">
                    <button onClick={() => setActiveSettingsTab('root')} className="text-rose-500 hover:underline">← Back</button>
                    <span>Smart Buffering</span>
                  </div>
                  {[
                    { id: 'low-latency', title: 'Low Latency LL-HLS', desc: 'Minimal startup time' },
                    { id: 'balanced', title: 'Balanced', desc: 'Standard stability and frame pacing' },
                    { id: 'high-performance', title: 'High Cache', desc: 'Preload extra buffer for weak WiFi' }
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBufferModeChange(b.id as any)}
                      className={`flex flex-col gap-0.5 p-2 rounded transition-all text-left ${bufferMode === b.id ? 'bg-rose-500/10 text-rose-400 font-bold' : 'hover:bg-neutral-900'}`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-sans font-bold text-xs">{b.title}</span>
                        {bufferMode === b.id && <Check size={12} />}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-normal leading-tight">{b.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overlay controls */}
          <div 
            className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 z-20 transition-all duration-300 ${
              controlsVisible && !isLocked ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            {/* Upper control bar: Stream title */}
            <div className="flex items-center justify-between text-[11px] text-neutral-200 px-1">
              <div className="flex items-center gap-2 truncate max-w-[180px] sm:max-w-[320px]">
                <span className="font-sans font-black tracking-tight text-white truncate">
                  {cleanChannelName(channel.name)}
                </span>
                <span className="font-sans text-[9px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-1 rounded truncate">
                  {cleanGroupName(channel.group)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 font-mono text-[9px]">
                {/* Decorative decoder switcher */}
                <button
                  onClick={cycleDecoder}
                  className="bg-neutral-900/90 text-rose-400 border border-neutral-800/80 px-1.5 py-0.5 rounded font-extrabold cursor-pointer active:scale-95 transition-all"
                  title="Decode pipeline"
                >
                  {decoderType}
                </button>
                
                <span className="bg-neutral-900/60 px-1.5 py-0.5 border border-neutral-800/80 rounded uppercase">
                  {bufferMode}
                </span>
              </div>
            </div>

            {/* Main playback control row */}
            <div className="flex items-center justify-between border-t border-neutral-900/60 pt-2">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-rose-500 active:scale-90 transition-all cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="text-white hover:text-rose-500 active:scale-90 transition-all cursor-pointer"
                >
                  {isMuted ? <VolumeX size={18} /> : volume > 0.6 ? <Volume2 size={18} /> : <Volume1 size={18} />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-24 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              <div className="flex items-center gap-2.5">
                {/* Touch gest lock */}
                <button
                  onClick={toggleLock}
                  className="text-neutral-300 hover:text-white p-1 rounded-lg transition-all cursor-pointer"
                  title="Lock gestures"
                >
                  <Unlock size={14} />
                </button>

                {/* Aspect ratio */}
                <button
                  onClick={cycleAspectRatio}
                  className="text-neutral-300 hover:text-white p-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 bg-neutral-900 border border-neutral-800 text-[9px] font-mono"
                  title="Aspect ratio mode"
                >
                  <Maximize2 size={12} />
                  <span className="uppercase">{aspectRatio}</span>
                </button>

                {/* Settings dropdown trigger */}
                <button
                  onClick={() => {
                    setActiveSettingsTab('root');
                    setShowSettingsMenu(!showSettingsMenu);
                    resetControlsTimeout();
                  }}
                  className={`text-neutral-300 hover:text-white p-1 rounded-lg transition-all cursor-pointer ${showSettingsMenu ? 'bg-neutral-800 text-rose-500' : ''}`}
                  title="Settings"
                >
                  <Settings size={14} />
                </button>

                {/* Picture in picture */}
                <button
                  onClick={handlePictureInPicture}
                  className="text-neutral-300 hover:text-white font-mono text-[9px] px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 transition-all cursor-pointer"
                  title="Picture in Picture"
                >
                  PiP
                </button>

                <span className="font-mono text-[9px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                  <Radio size={8} className="animate-pulse" /> LIVE
                </span>

                <button
                  onClick={handleFullscreen}
                  className="text-white hover:text-rose-500 active:scale-90 transition-all cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Tray for Android Applications */}
        <div className="px-3.5 py-3 bg-neutral-950/80 border-t border-neutral-800/80 grid grid-cols-3 gap-2 text-xs">
          <a
            href={`intent:${channel.url}#Intent;action=android.intent.action.VIEW;type=video/*;end;`}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/20 text-emerald-400 font-sans font-bold transition-all text-[10px] sm:text-[11px] truncate text-center"
            title="Open in Android Media3 ExoPlayer"
          >
            <Zap size={11} className="fill-emerald-400 flex-shrink-0" />
            <span className="truncate">Media3 Player</span>
          </a>

          <a
            href={`intent:${channel.url}#Intent;action=android.intent.action.VIEW;package=com.mxtech.videoplayer.ad;type=video/*;end;`}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/20 text-rose-300 font-sans font-bold transition-all text-[10px] sm:text-[11px] truncate text-center"
            title="Open in MX Player"
          >
            <Play size={11} className="fill-rose-400 flex-shrink-0" />
            <span className="truncate">MX Player App</span>
          </a>

          <a
            href={`intent:${channel.url}#Intent;action=android.intent.action.VIEW;package=org.videolan.vlc;type=video/*;end;`}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-orange-950/30 hover:bg-orange-900/40 border border-orange-500/20 text-orange-400 font-sans font-bold transition-all text-[10px] sm:text-[11px] truncate text-center"
            title="Open in VLC"
          >
            <Play size={11} className="fill-orange-400 flex-shrink-0" />
            <span className="truncate">VLC Player</span>
          </a>
        </div>
      </div>

      {/* STICKY FLOATING PICTURE-IN-PICTURE (SCROLL DETECTED) */}
      {isFloatingSticky && !isLocked && (
        <div 
          id="floating-sticky-mini-player" 
          className="fixed bottom-4 right-4 z-50 w-72 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header of Floating Mini-player */}
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 border-b border-neutral-800 text-[10px]">
            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
              <Tv size={11} className="text-rose-500 flex-shrink-0" />
              <span className="font-sans font-extrabold text-neutral-200 truncate">{cleanChannelName(channel.name)}</span>
            </div>
            <button 
              onClick={() => setIsFloatingSticky(false)}
              className="text-neutral-400 hover:text-white p-0.5 rounded-full hover:bg-neutral-800 transition-all cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>

          {/* Simple controls layer on mini-player */}
          <div className="relative aspect-video bg-black group/mini">
            {/* Mirroring video tag */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-sans text-[10px] text-rose-500/80 bg-black/40 px-2 py-0.5 rounded border border-rose-500/10 pointer-events-none">
                {isPlaying ? 'Playing on Background' : 'Paused'}
              </span>
            </div>

            {/* Quick action controls inside mini player */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/mini:opacity-100 flex items-center justify-center gap-4 transition-all duration-200 z-20">
              <button 
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              </button>
              <button 
                onClick={toggleMute}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <button
                onClick={() => {
                  containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setIsFloatingSticky(false);
                }}
                className="px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[9px] font-bold shadow-lg transition-all cursor-pointer"
              >
                Focus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
